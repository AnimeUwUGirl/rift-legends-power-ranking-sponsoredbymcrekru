#!/usr/bin/env python3
"""Pobiera nowe posty ligi i drużyn Rift Legends oraz odczytuje grafiki MVP."""

from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen


API_BASE = "https://api.x.com/2"
OFFICIAL_ACCOUNT = "RiftLegendsPL"
ACCOUNTS = (
    {"username": OFFICIAL_ACCOUNT, "name": "Rift Legends", "type": "league"},
    {"username": "Lodis_LDS", "name": "LODIS", "type": "team"},
    {"username": "BombaTeamGG", "name": "BOMBA Team", "type": "team"},
    {"username": "_ForsakenGG_", "name": "Forsaken", "type": "team"},
    {"username": "devils1gg", "name": "devils.one", "type": "team"},
    {"username": "AnonymoEsports", "name": "Anonymo Esports", "type": "team"},
    {"username": "DOCISK_", "name": "DOCISK", "type": "team"},
    {"username": "barczacaesports", "name": "Barcząca Esports", "type": "team"},
    {"username": "UP2UMEDIApl", "name": "UP2UMEDIA", "type": "team"},
)
OUTPUT_PATH = Path(os.environ.get("X_FEED_PATH", "x-feed.json"))
MAX_STORED_POSTS = 120
INITIAL_POSTS_PER_ACCOUNT = 5
NEW_POSTS_PER_ACCOUNT = 5
OCR_VERSION = 4
USER_AGENT = "RiftPower/1.0 (+https://riftpower.pl)"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load_state() -> dict[str, Any]:
    if not OUTPUT_PATH.exists():
        return {
            "accounts": {},
            "updatedAt": None,
            "posts": [],
        }

    with OUTPUT_PATH.open("r", encoding="utf-8") as handle:
        state = json.load(handle)

    accounts = state.setdefault("accounts", {})
    legacy_account = str(state.get("account", "")).lstrip("@")
    if legacy_account and legacy_account not in accounts:
        accounts[legacy_account] = {
            "userId": str(state.get("userId", "")),
            "lastSeenId": str(state.get("lastSeenId", "")),
            "initialized": bool(state.get("backfillComplete")),
        }
    state.setdefault("updatedAt", None)
    state.setdefault("posts", [])
    for key in ("account", "userId", "lastSeenId", "backfillComplete"):
        state.pop(key, None)
    return state


def write_state(state: dict[str, Any]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = OUTPUT_PATH.with_suffix(OUTPUT_PATH.suffix + ".tmp")
    with temporary_path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(state, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    temporary_path.replace(OUTPUT_PATH)


def api_get(token: str, path: str, params: dict[str, str] | None = None) -> dict[str, Any]:
    url = f"{API_BASE}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"

    request = Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        },
    )

    try:
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")[:1200]
        raise RuntimeError(f"X API zwróciło HTTP {error.code}: {details}") from error
    except URLError as error:
        raise RuntimeError(f"Nie udało się połączyć z X API: {error.reason}") from error


def get_user_profile(token: str, account: dict[str, str]) -> dict[str, str]:
    username = account["username"]
    payload = api_get(
        token,
        f"/users/by/username/{quote(username)}",
        {"user.fields": "id,username,name,profile_image_url"},
    )
    user = payload.get("data", {})
    user_id = str(user.get("id", ""))
    if not user_id:
        raise RuntimeError(f"X API nie zwróciło identyfikatora konta @{username}.")
    return {
        "userId": user_id,
        "username": str(user.get("username") or username),
        "name": str(user.get("name") or account["name"]),
        "profileImageUrl": str(user.get("profile_image_url") or ""),
    }


def get_posts(
    token: str,
    user_id: str,
    *,
    since_id: str = "",
    until_id: str = "",
    max_results: int = 5,
) -> dict[str, Any]:
    params = {
        "max_results": str(max_results),
        "exclude": "retweets,replies",
        "tweet.fields": "created_at,attachments",
        "expansions": "attachments.media_keys",
        "media.fields": "media_key,type,url,preview_image_url,alt_text,width,height",
    }
    if since_id:
        params["since_id"] = since_id
    if until_id:
        params["until_id"] = until_id
    return api_get(token, f"/users/{quote(user_id)}/tweets", params)


def download_image(url: str) -> Path:
    suffix = Path(urlparse(url).path).suffix or ".jpg"
    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=30) as response:
            image_bytes = response.read()
    except (HTTPError, URLError) as error:
        raise RuntimeError(f"Nie udało się pobrać grafiki: {error}") from error

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
        handle.write(image_bytes)
        return Path(handle.name)


def run_ocr(image_url: str) -> str:
    image_path = download_image(image_url)
    try:
        outputs: list[str] = []
        for page_mode in (11, 6):
            result = subprocess.run(
                ["tesseract", str(image_path), "stdout", "-l", "eng", "--psm", str(page_mode)],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=60,
                check=False,
            )
            if result.returncode != 0:
                message = result.stderr.strip()[:500] or "nieznany błąd Tesseract"
                raise RuntimeError(message)
            text = result.stdout.strip()
            if text and text not in outputs:
                outputs.append(text)
        return "\n\n".join(outputs)
    finally:
        image_path.unlink(missing_ok=True)


def number_from_match(match: re.Match[str] | None) -> int | None:
    if not match:
        return None
    return int(re.sub(r"\D", "", match.group(1)))


def ocr_number(value: str) -> int | None:
    translated = value.translate(
        str.maketrans(
            {
                "O": "0",
                "o": "0",
                "I": "1",
                "l": "1",
                "G": "6",
                "S": "5",
                "B": "8",
            }
        )
    )
    digits = re.sub(r"\D", "", translated)
    return int(digits) if digits else None


def player_from_text(post_text: str, ocr_text: str, account_username: str) -> tuple[str | None, str | None]:
    handles = re.findall(r"@([A-Za-z0-9_]{1,15})", post_text)
    handles = [handle for handle in handles if handle.casefold() != account_username.casefold()]
    if handles:
        handle = handles[0]
        player = re.sub(r"(?:_?LoL)$", "", handle, flags=re.IGNORECASE).strip("_") or handle
        return player, handle

    lines = [re.sub(r"\s+", " ", line).strip(" |:;.,") for line in ocr_text.splitlines()]
    kda_index = next((index for index, line in enumerate(lines) if "KDA" in line.upper()), len(lines))
    banned = {
        "MVP",
        "KDA",
        "KP",
        "GOLD",
        "RIFT",
        "RIFT LEGENDS",
        "MASTERS",
        "POLSKA",
    }
    for line in reversed(lines[:kda_index]):
        if line.upper() in banned:
            continue
        if re.fullmatch(r"[A-Za-zÀ-ž0-9_.-]{2,24}", line) and not re.search(r"\d{2,}", line):
            return line, None
    return None, None


def extract_stats(post_text: str, ocr_text: str, account_username: str = OFFICIAL_ACCOUNT) -> dict[str, Any]:
    combined = f"{post_text}\n{ocr_text}"
    kda_match = re.search(
        r"\bKDA\b\s*[:=-]?\s*(\d{1,2})\s*[/|]\s*(\d{1,2})\s*[/|]\s*(\d{1,2})",
        combined,
        flags=re.IGNORECASE,
    )
    kp_match = re.search(
        r"\bKP\b\s*[:=-]?\s*(\d{1,3}(?:[.,]\d+)?)\s*%",
        combined,
        flags=re.IGNORECASE,
    )
    gold_match = re.search(
        r"\bGOLD\b\s*[:=-]?\s*([0-9][0-9 .,]{2,})",
        combined,
        flags=re.IGNORECASE,
    )
    player, player_handle = player_from_text(post_text, ocr_text, account_username)

    kda = None
    if kda_match:
        kda = f"{kda_match.group(1)}/{kda_match.group(2)}/{kda_match.group(3)}"
    else:
        fallback_kda = re.search(
            r"(?<![A-Za-z0-9])([0-9OoIlGSB]{1,2})\s*/\s*([0-9OoIlGSB]{1,2})\s*/\s*([0-9OoIlGSB]{1,2})(?![A-Za-z0-9])",
            ocr_text,
        )
        if fallback_kda:
            values = [ocr_number(fallback_kda.group(index)) for index in (1, 2, 3)]
            if all(value is not None for value in values):
                kills, deaths, assists = values
                if kills <= 50 and deaths <= 30 and assists <= 80:
                    kda = f"{kills}/{deaths}/{assists}"

    kp = None
    if kp_match:
        kp = float(kp_match.group(1).replace(",", "."))
    else:
        fallback_kp = re.search(r"\b(\d{1,3}(?:[.,]\d+)?)\s*%", ocr_text)
        if fallback_kp:
            candidate_kp = float(fallback_kp.group(1).replace(",", "."))
            if 0 <= candidate_kp <= 100:
                kp = candidate_kp

    gold = number_from_match(gold_match)
    if gold is None:
        for line in ocr_text.splitlines():
            if not re.fullmatch(r"\s*[0-9OoIlGSB][0-9OoIlGSB .,_]{3,6}\s*", line):
                continue
            candidate_gold = ocr_number(line)
            if candidate_gold is not None and 1000 <= candidate_gold <= 99999:
                gold = candidate_gold
                break

    return {
        "player": player,
        "playerHandle": player_handle,
        "kda": kda,
        "kp": kp,
        "gold": gold,
    }


def public_media(media: dict[str, Any]) -> dict[str, Any]:
    return {
        "mediaKey": media.get("media_key"),
        "type": media.get("type"),
        "url": media.get("url") or media.get("preview_image_url"),
        "altText": media.get("alt_text"),
        "width": media.get("width"),
        "height": media.get("height"),
    }


def is_mvp_graphic(username: str, ocr_text: str, extracted: dict[str, Any]) -> bool:
    if username.casefold() != OFFICIAL_ACCOUNT.casefold():
        return False

    required_labels = ("MVP", "KDA", "KP")
    has_official_layout = all(
        re.search(rf"\b{label}\b", ocr_text, flags=re.IGNORECASE)
        for label in required_labels
    )
    has_complete_data = bool(
        extracted.get("player")
        and extracted.get("kda")
        and extracted.get("kp") is not None
    )
    return has_official_layout and has_complete_data


def process_post(
    post: dict[str, Any],
    media_by_key: dict[str, dict[str, Any]],
    account: dict[str, str],
    profile: dict[str, str],
) -> dict[str, Any]:
    post_id = str(post["id"])
    text = str(post.get("text", ""))
    username = profile.get("username") or account["username"]
    media_keys = post.get("attachments", {}).get("media_keys", [])
    media_items = [media_by_key[key] for key in media_keys if key in media_by_key]
    should_read_image = username.casefold() == OFFICIAL_ACCOUNT.casefold()

    ocr_parts: list[str] = []
    ocr_errors: list[str] = []
    for media in media_items:
        if not should_read_image or media.get("type") != "photo" or not media.get("url"):
            continue
        try:
            ocr_text = run_ocr(str(media["url"]))
            if ocr_text:
                ocr_parts.append(ocr_text)
        except RuntimeError as error:
            ocr_errors.append(str(error)[:500])

    full_ocr_text = "\n\n".join(ocr_parts)
    extracted = extract_stats(text, full_ocr_text, username)
    looks_like_mvp = is_mvp_graphic(username, full_ocr_text, extracted)

    result: dict[str, Any] = {
        "id": post_id,
        "url": f"https://x.com/{username}/status/{post_id}",
        "createdAt": post.get("created_at"),
        "text": text,
        "kind": "mvp" if looks_like_mvp else "post",
        "author": {
            "username": username,
            "name": profile.get("name") or account["name"],
            "profileImageUrl": profile.get("profileImageUrl", ""),
            "type": account["type"],
        },
        "media": [public_media(media) for media in media_items],
        "extracted": extracted,
        "ocrText": full_ocr_text[:4000],
        "ocrVersion": OCR_VERSION,
    }
    if ocr_errors:
        result["ocrErrors"] = ocr_errors
    return result


def reprocess_saved_official_post(post: dict[str, Any]) -> bool:
    username = str(post.get("author", {}).get("username") or OFFICIAL_ACCOUNT)
    if (username.casefold() != OFFICIAL_ACCOUNT.casefold()
            or int(post.get("ocrVersion", 0)) >= OCR_VERSION):
        return False

    ocr_parts: list[str] = []
    ocr_errors: list[str] = []
    for media in post.get("media", []):
        if media.get("type") != "photo" or not media.get("url"):
            continue
        try:
            text = run_ocr(str(media["url"]))
            if text:
                ocr_parts.append(text)
        except RuntimeError as error:
            ocr_errors.append(str(error)[:500])

    full_ocr_text = "\n\n".join(ocr_parts)
    post["ocrText"] = full_ocr_text[:4000]
    post["extracted"] = extract_stats(str(post.get("text", "")), full_ocr_text, username)
    post["kind"] = "mvp" if is_mvp_graphic(username, full_ocr_text, post["extracted"]) else "post"
    post["ocrVersion"] = OCR_VERSION
    if ocr_errors:
        post["ocrErrors"] = ocr_errors
    else:
        post.pop("ocrErrors", None)
    return True


def newest_id(ids: list[str]) -> str:
    numeric_ids = [item for item in ids if item.isdigit()]
    return max(numeric_ids, key=int) if numeric_ids else ""


def main() -> None:
    token = os.environ.get("X_BEARER_TOKEN", "").strip()
    if not token:
        raise SystemExit("Brakuje sekretu X_BEARER_TOKEN.")

    state = load_state()
    changed = False
    existing_posts = {str(post["id"]): post for post in state["posts"] if post.get("id")}
    for post in existing_posts.values():
        if post.get("author"):
            continue
        post["author"] = {
            "username": OFFICIAL_ACCOUNT,
            "name": "Rift Legends",
            "profileImageUrl": "",
            "type": "league",
        }
        changed = True

    fetched_count = 0
    account_states = state.setdefault("accounts", {})
    for account in ACCOUNTS:
        username = account["username"]
        account_state = account_states.setdefault(
            username,
            {"userId": "", "lastSeenId": "", "initialized": False},
        )
        account_state.setdefault("userId", "")
        account_state.setdefault("lastSeenId", "")
        account_state.setdefault("initialized", False)

        try:
            if not account_state["userId"]:
                profile = get_user_profile(token, account)
                account_state.update(profile)
                changed = True
            else:
                profile = {
                    "userId": str(account_state["userId"]),
                    "username": str(account_state.get("username") or username),
                    "name": str(account_state.get("name") or account["name"]),
                    "profileImageUrl": str(account_state.get("profileImageUrl") or ""),
                }

            is_initialized = bool(account_state["initialized"])
            payload = get_posts(
                token,
                profile["userId"],
                since_id=str(account_state["lastSeenId"]) if is_initialized else "",
                max_results=NEW_POSTS_PER_ACCOUNT if is_initialized else INITIAL_POSTS_PER_ACCOUNT,
            )
            fetched_posts = list(payload.get("data") or [])
            fetched_media = list(payload.get("includes", {}).get("media", []))
            media_by_key = {
                str(media["media_key"]): media
                for media in fetched_media
                if media.get("media_key")
            }

            for post in fetched_posts:
                post_id = str(post.get("id", ""))
                if not post_id or post_id in existing_posts:
                    continue
                existing_posts[post_id] = process_post(post, media_by_key, account, profile)
                fetched_count += 1
                changed = True

            latest_fetched_id = newest_id([str(post.get("id", "")) for post in fetched_posts])
            latest_id = newest_id([str(account_state["lastSeenId"]), latest_fetched_id])
            if latest_id and latest_id != account_state["lastSeenId"]:
                account_state["lastSeenId"] = latest_id
                changed = True
            if not account_state["initialized"]:
                account_state["initialized"] = True
                changed = True
            if account_state.pop("error", None) is not None:
                changed = True
        except RuntimeError as error:
            message = str(error)[:800]
            if account_state.get("error") != message:
                account_state["error"] = message
                changed = True
            print(f"Uwaga: pominięto @{username}: {message}")

    for saved_post in existing_posts.values():
        if reprocess_saved_official_post(saved_post):
            changed = True

    state["posts"] = sorted(
        existing_posts.values(),
        key=lambda post: int(post["id"]) if str(post["id"]).isdigit() else 0,
        reverse=True,
    )[:MAX_STORED_POSTS]

    if changed:
        state["updatedAt"] = utc_now()
        write_state(state)
        print(f"Zapisano {fetched_count} nowych postów w {OUTPUT_PATH}.")
    else:
        print("Brak nowych postów. Plik pozostaje bez zmian.")


if __name__ == "__main__":
    main()
