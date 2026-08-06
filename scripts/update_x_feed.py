#!/usr/bin/env python3
"""Pobiera nowe posty Rift Legends z X i odczytuje statystyki z grafik MVP."""

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
ACCOUNT = os.environ.get("X_ACCOUNT", "RiftLegendsPL").lstrip("@")
OUTPUT_PATH = Path(os.environ.get("X_FEED_PATH", "x-feed.json"))
MAX_STORED_POSTS = 75
OCR_VERSION = 2
USER_AGENT = "RiftPower/1.0 (+https://riftpower.pl)"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load_state() -> dict[str, Any]:
    if not OUTPUT_PATH.exists():
        return {
            "account": ACCOUNT,
            "userId": "",
            "lastSeenId": "",
            "updatedAt": None,
            "backfillComplete": False,
            "posts": [],
        }

    with OUTPUT_PATH.open("r", encoding="utf-8") as handle:
        state = json.load(handle)

    state.setdefault("account", ACCOUNT)
    state.setdefault("userId", "")
    state.setdefault("lastSeenId", "")
    state.setdefault("updatedAt", None)
    state.setdefault("backfillComplete", False)
    state.setdefault("posts", [])
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


def get_user_id(token: str) -> str:
    payload = api_get(
        token,
        f"/users/by/username/{quote(ACCOUNT)}",
        {"user.fields": "id,username,name"},
    )
    user_id = str(payload.get("data", {}).get("id", ""))
    if not user_id:
        raise RuntimeError(f"X API nie zwróciło identyfikatora konta @{ACCOUNT}.")
    return user_id


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


def player_from_text(post_text: str, ocr_text: str) -> tuple[str | None, str | None]:
    handles = re.findall(r"@([A-Za-z0-9_]{1,15})", post_text)
    handles = [handle for handle in handles if handle.casefold() != ACCOUNT.casefold()]
    if handles:
        handle = handles[0]
        player = re.sub(r"(?:_?LoL)$", "", handle, flags=re.IGNORECASE) or handle
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


def extract_stats(post_text: str, ocr_text: str) -> dict[str, Any]:
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
    player, player_handle = player_from_text(post_text, ocr_text)

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


def process_post(post: dict[str, Any], media_by_key: dict[str, dict[str, Any]]) -> dict[str, Any]:
    post_id = str(post["id"])
    text = str(post.get("text", ""))
    media_keys = post.get("attachments", {}).get("media_keys", [])
    media_items = [media_by_key[key] for key in media_keys if key in media_by_key]
    should_read_image = bool(re.search(r"\bMVP\b|🏆", text, flags=re.IGNORECASE))

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
    extracted = extract_stats(text, full_ocr_text)
    looks_like_mvp = bool(
        re.search(r"\bMVP\b", f"{text}\n{full_ocr_text}", flags=re.IGNORECASE)
        or extracted["kda"]
        or extracted["kp"] is not None
    )

    result: dict[str, Any] = {
        "id": post_id,
        "url": f"https://x.com/{ACCOUNT}/status/{post_id}",
        "createdAt": post.get("created_at"),
        "text": text,
        "kind": "mvp" if looks_like_mvp else "post",
        "media": [public_media(media) for media in media_items],
        "extracted": extracted,
        "ocrText": full_ocr_text[:4000],
        "ocrVersion": OCR_VERSION,
    }
    if ocr_errors:
        result["ocrErrors"] = ocr_errors
    return result


def reprocess_saved_mvp(post: dict[str, Any]) -> bool:
    if post.get("kind") != "mvp" or int(post.get("ocrVersion", 0)) >= OCR_VERSION:
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
    post["extracted"] = extract_stats(str(post.get("text", "")), full_ocr_text)
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

    if not state["userId"]:
        state["userId"] = get_user_id(token)
        changed = True

    payload = get_posts(token, str(state["userId"]), since_id=str(state["lastSeenId"]))
    fetched_posts = list(payload.get("data") or [])
    fetched_media = list(payload.get("includes", {}).get("media", []))

    if not state.get("backfillComplete"):
        known_ids = [str(post.get("id", "")) for post in state["posts"]]
        known_ids.extend(str(post.get("id", "")) for post in fetched_posts)
        numeric_ids = [post_id for post_id in known_ids if post_id.isdigit()]
        if numeric_ids:
            until_id = str(min(map(int, numeric_ids)) - 1)
            older_payload = get_posts(
                token,
                str(state["userId"]),
                until_id=until_id,
                max_results=50,
            )
            fetched_posts.extend(older_payload.get("data") or [])
            fetched_media.extend(older_payload.get("includes", {}).get("media", []))
        state["backfillComplete"] = True
        changed = True

    media_by_key = {
        str(media["media_key"]): media
        for media in fetched_media
        if media.get("media_key")
    }

    existing_posts = {str(post["id"]): post for post in state["posts"] if post.get("id")}
    for post in fetched_posts:
        post_id = str(post.get("id", ""))
        if not post_id or post_id in existing_posts:
            continue
        existing_posts[post_id] = process_post(post, media_by_key)
        changed = True

    for saved_post in existing_posts.values():
        if reprocess_saved_mvp(saved_post):
            changed = True

    if fetched_posts:
        latest_fetched_id = newest_id([str(post.get("id", "")) for post in fetched_posts])
        latest_id = newest_id([str(state["lastSeenId"]), latest_fetched_id])
        if latest_id and latest_id != state["lastSeenId"]:
            state["lastSeenId"] = latest_id
            changed = True

    state["posts"] = sorted(
        existing_posts.values(),
        key=lambda post: int(post["id"]) if str(post["id"]).isdigit() else 0,
        reverse=True,
    )[:MAX_STORED_POSTS]

    if changed:
        state["account"] = ACCOUNT
        state["updatedAt"] = utc_now()
        write_state(state)
        print(f"Zapisano {len(fetched_posts)} nowych postów w {OUTPUT_PATH}.")
    else:
        print("Brak nowych postów. Plik pozostaje bez zmian.")


if __name__ == "__main__":
    main()
