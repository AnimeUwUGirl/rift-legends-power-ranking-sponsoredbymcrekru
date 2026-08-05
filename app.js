const data = window.RL_DATA;
const rankingList = document.querySelector('#rankingList');
const teamGrid = document.querySelector('#teamGrid');
const weightCard = document.querySelector('#weightCard');
const modal = document.querySelector('#teamModal');
const modalContent = document.querySelector('#modalContent');
const modalClose = document.querySelector('#modalClose');
const broadcastBar = document.querySelector('#broadcastBar');
const syncStatus = document.querySelector('#syncStatus');
const resultsList = document.querySelector('#resultsList');
const resultsLabel = document.querySelector('#resultsLabel');
const resultsSource = document.querySelector('#resultsSource');
const scheduleTabs = document.querySelector('#scheduleTabs');
const schedulePanel = document.querySelector('#schedulePanel');
const rankingLiveStatus = document.querySelector('#rankingLiveStatus');
const heroUpdatedAt = document.querySelector('#heroUpdatedAt');
const heroEdition = document.querySelector('#heroEdition');

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function formatTeamDate(value, long = false) {
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('pl-PL', long
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }
  ).format(new Date(year, month - 1, day, 12));
}

const scheduleRounds = [
  {
    id: 1,
    label: 'R1',
    dates: '4 i 5.08',
    title: 'Runda 1',
    patch: '26.15',
    end: '2026-08-05T23:59:59+02:00',
    days: [
      { date: 'Wtorek 4 sierpnia', short: 'DZIEŃ 1', matches: [
        ['LODIS', '17:00', 'Barcząca Esports', '2026-08-04T17:00:00+02:00'],
        ['DOCISK', '19:00', 'Anonymo Esports', '2026-08-04T19:00:00+02:00']
      ]},
      { date: 'Środa 5 sierpnia', short: 'DZIEŃ 2', matches: [
        ['UP2UMEDIA Cebulaki', '17:00', 'Forsaken', '2026-08-05T17:00:00+02:00'],
        ['BOMBA Team', '19:00', 'devils.one', '2026-08-05T19:00:00+02:00']
      ]}
    ]
  },
  {
    id: 2,
    label: 'R2',
    dates: '11 i 12.08',
    title: 'Runda 2',
    patch: 'TBD',
    end: '2026-08-12T23:59:59+02:00',
    days: [
      { date: 'Wtorek 11 sierpnia', short: 'DZIEŃ 1', matches: [
        ['Barcząca Esports', '17:00', 'devils.one', '2026-08-11T17:00:00+02:00'],
        ['LODIS', '19:00', 'Forsaken', '2026-08-11T19:00:00+02:00']
      ]},
      { date: 'Środa 12 sierpnia', short: 'DZIEŃ 2', matches: [
        ['BOMBA Team', '17:00', 'Anonymo Esports', '2026-08-12T17:00:00+02:00'],
        ['UP2UMEDIA Cebulaki', '19:00', 'DOCISK', '2026-08-12T19:00:00+02:00']
      ]}
    ]
  },
  {
    id: 3,
    label: 'R3',
    dates: '18 i 19.08',
    title: 'Runda 3',
    patch: 'TBD',
    end: '2026-08-19T23:59:59+02:00',
    days: [
      { date: 'Wtorek 18 sierpnia', short: 'DZIEŃ 1', matches: [
        ['Anonymo Esports', '17:00', 'Forsaken', '2026-08-18T17:00:00+02:00'],
        ['BOMBA Team', '19:00', 'LODIS', '2026-08-18T19:00:00+02:00']
      ]},
      { date: 'Środa 19 sierpnia', short: 'DZIEŃ 2', matches: [
        ['UP2UMEDIA Cebulaki', '17:00', 'devils.one', '2026-08-19T17:00:00+02:00'],
        ['DOCISK', '19:00', 'Barcząca Esports', '2026-08-19T19:00:00+02:00']
      ]}
    ]
  },
  {
    id: 4,
    label: 'R4',
    dates: '20 i 25.08',
    title: 'Runda 4',
    patch: 'TBD',
    end: '2026-08-25T23:59:59+02:00',
    days: [
      { date: 'Czwartek 20 sierpnia', short: 'DZIEŃ 1', matches: [
        ['UP2UMEDIA Cebulaki', '17:00', 'BOMBA Team', '2026-08-20T17:00:00+02:00'],
        ['Anonymo Esports', '19:00', 'Barcząca Esports', '2026-08-20T19:00:00+02:00']
      ]},
      { date: 'Wtorek 25 sierpnia', short: 'DZIEŃ 2', matches: [
        ['LODIS', '17:00', 'devils.one', '2026-08-25T17:00:00+02:00'],
        ['DOCISK', '19:00', 'Forsaken', '2026-08-25T19:00:00+02:00']
      ]}
    ]
  },
  {
    id: 5,
    label: 'R5',
    dates: '26 i 27.08',
    title: 'Runda 5',
    patch: 'TBD',
    end: '2026-08-27T23:59:59+02:00',
    days: [
      { date: 'Środa 26 sierpnia', short: 'DZIEŃ 1', matches: [
        ['Forsaken', '17:00', 'Barcząca Esports', '2026-08-26T17:00:00+02:00'],
        ['BOMBA Team', '19:00', 'DOCISK', '2026-08-26T19:00:00+02:00']
      ]},
      { date: 'Czwartek 27 sierpnia', short: 'DZIEŃ 2', matches: [
        ['Anonymo Esports', '17:00', 'devils.one', '2026-08-27T17:00:00+02:00'],
        ['UP2UMEDIA Cebulaki', '19:00', 'LODIS', '2026-08-27T19:00:00+02:00']
      ]}
    ]
  }
];

const fallbackResults = [
  { team1: 'Forsaken', score1: 3, score2: 1, team2: 'BOMBA Team', meta: 'Finał' },
  { team1: 'Barcząca Esports', score1: 0, score2: 3, team2: 'BOMBA Team', meta: 'Półfinał' },
  { team1: 'Barcząca Esports', score1: 2, score2: 3, team2: 'Forsaken', meta: 'Pierwsza runda' },
  { team1: 'BOMBA Team', score1: 3, score2: 0, team2: 'Anonymo Esports', meta: 'Pierwsza runda' }
];

const confirmedSummerResults = [{
  id: '117009042046526506',
  team1: 'LODIS',
  team2: 'Barcząca Esports',
  score1: 2,
  score2: 0,
  winner: 1,
  date: '2026-08-04T15:00:00Z',
  timestamp: Date.parse('2026-08-04T15:00:00Z'),
  round: 'Runda 1',
  bestOf: 3,
  source: 'lolesports-confirmed'
}];
const resultsCacheKey = 'rift-legends-summer-results-v2';
const lolEsportsScheduleUrl = 'https://esports-api.lolesports.com/persisted/gw/getSchedule';
const lolEsportsPublicKey = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const riftLegendsLeagueId = '113673877956508505';
const summerStartTimestamp = Date.parse('2026-08-04T00:00:00Z');
const summerEndTimestamp = Date.parse('2026-09-20T23:59:59Z');
let automaticMatches = [...confirmedSummerResults];
let automaticResultsSource = 'lolesports-confirmed';
let selectedScheduleRound = 1;
const powerWeights = { roster: .30, results: .20, opposition: .15, synergy: .15, form: .10, series: .10 };
const rankingBaseLabel = data.meta.label;
const rankingBaseline = new Map(data.teams.map(team => [team.name, {
  rank: team.rank,
  score: team.score,
  trend: team.trend,
  trendLabel: team.trendLabel,
  tier: team.tier,
  state: team.state,
  updated: team.updated,
  metrics: { ...team.metrics }
}]));

function teamNameKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function teamMatchKey(value) {
  const key = teamNameKey(value);
  const aliases = {
    ano: 'anonymoesports',
    anonymo: 'anonymoesports',
    barczaca: 'barczacaesports',
    bce: 'barczacaesports',
    bomba: 'bombateam',
    boom: 'bombateam',
    dv1: 'devilsone',
    devilsoneinstreamly: 'devilsone',
    doc: 'docisk',
    fsk: 'forsaken',
    lodispolishteam: 'lodis',
    up2u: 'up2umediacebulaki'
  };
  return aliases[key] || key;
}

function canonicalTeamName(value) {
  const names = {
    anonymoesports: 'Anonymo Esports',
    barczacaesports: 'Barcząca Esports',
    bombateam: 'BOMBA Team',
    devilsone: 'devils.one inStreamly',
    devilsoneinstreamly: 'devils.one inStreamly',
    docisk: 'DOCISK',
    forsaken: 'Forsaken',
    lodis: 'LODIS',
    up2umediacebulaki: 'UP2UMEDIA Cebulaki'
  };
  return names[teamMatchKey(value)] || String(value || '');
}

function matchPairKey(team1, team2) {
  return [teamMatchKey(team1), teamMatchKey(team2)].sort().join('|');
}

function numericScore(value) {
  if (value === '' || value == null) return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function utcTimestamp(value) {
  if (!value) return 0;
  const raw = String(value).trim().replace(' ', 'T');
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`;
  return Date.parse(withZone) || 0;
}

function parseCargoMatch(item) {
  const row = item?.title || item || {};
  return {
    team1: canonicalTeamName(row.Team1),
    team2: canonicalTeamName(row.Team2),
    score1: numericScore(row.Team1Score),
    score2: numericScore(row.Team2Score),
    winner: numericScore(row.Winner),
    date: row.DateTimeUTC || '',
    timestamp: utcTimestamp(row.DateTimeUTC),
    round: row.Round || 'Summer 2026',
    bestOf: numericScore(row.BestOf),
    source: 'leaguepedia'
  };
}

function parseLolEsportsEvent(event) {
  const match = event?.match || {};
  const teams = event?.matchTeams || match?.teams || [];
  if (event?.type !== 'match' || teams.length < 2) return null;
  const state = String(event?.state || match?.state || '').toLowerCase();
  const score1 = numericScore(teams[0]?.result?.gameWins);
  const score2 = numericScore(teams[1]?.result?.gameWins);
  const timestamp = utcTimestamp(event?.startTime);
  const winner = teams[0]?.result?.outcome === 'win' ? 1 : teams[1]?.result?.outcome === 'win' ? 2 : null;
  return {
    id: String(event?.id || match?.id || ''),
    team1: canonicalTeamName(teams[0]?.name || teams[0]?.code),
    team2: canonicalTeamName(teams[1]?.name || teams[1]?.code),
    score1: state === 'completed' ? score1 : null,
    score2: state === 'completed' ? score2 : null,
    winner,
    date: event?.startTime || '',
    timestamp,
    round: event?.blockName || event?.tournament?.name || 'Summer 2026',
    bestOf: numericScore(match?.strategy?.count),
    state,
    source: 'lolesports'
  };
}

function matchIdentity(match) {
  const day = match.timestamp ? new Date(match.timestamp).toISOString().slice(0, 10) : String(match.date || 'bez-daty').slice(0, 10);
  return `${matchPairKey(match.team1, match.team2)}|${day}`;
}

function mergeMatchLists(...lists) {
  const merged = new Map();
  lists.flat().filter(Boolean).forEach(match => {
    if (match.team1 && match.team2) merged.set(matchIdentity(match), match);
  });
  return [...merged.values()].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

function isCompletedMatch(match) {
  return match.score1 != null && match.score2 != null && match.score1 + match.score2 > 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundOne(value) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function signedPower(value) {
  const rounded = roundOne(value);
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
}

function calculatedPower(metrics) {
  return Object.entries(powerWeights).reduce((sum, [key, weight]) => sum + (Number(metrics[key]) || 0) * weight, 0);
}

function tierForScore(score) {
  if (score >= 90) return 'S';
  if (score >= 84) return 'A+';
  if (score >= 76) return 'A';
  if (score >= 68) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

function stateForScore(score) {
  if (score >= 84) return 'hot';
  if (score >= 68) return 'stable';
  return 'unknown';
}

function rankingTeam(value) {
  const key = teamMatchKey(value);
  return data.teams.find(team => teamMatchKey(team.name) === key || teamMatchKey(team.short) === key);
}

function changeMetric(team, key, amount) {
  team.metrics[key] = roundOne(clamp(team.metrics[key] + amount, 0, 100));
}

function uniqueCompletedMatches() {
  const seen = new Set();
  return automaticMatches
    .filter(isCompletedMatch)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    .filter(match => {
      const key = `${matchPairKey(match.team1, match.team2)}|${match.timestamp || match.date || ''}|${match.score1}:${match.score2}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function applyAutomaticRanking() {
  data.teams.forEach(team => {
    const base = rankingBaseline.get(team.name);
    team.rank = base.rank;
    team.score = base.score;
    team.trend = base.trend;
    team.trendLabel = base.trendLabel;
    team.tier = base.tier;
    team.state = base.state;
    team.updated = base.updated;
    team.metrics = { ...base.metrics };
    team.autoMatches = 0;
    team.autoDelta = 0;
    team.autoLast = null;
    team.exactPower = calculatedPower(team.metrics);
  });

  const matches = uniqueCompletedMatches();
  matches.forEach(match => {
    if (match.score1 === match.score2) return;
    const team1 = rankingTeam(match.team1);
    const team2 = rankingTeam(match.team2);
    if (!team1 || !team2) return;

    const team1Won = match.score1 > match.score2;
    const winner = team1Won ? team1 : team2;
    const loser = team1Won ? team2 : team1;
    const winnerGames = team1Won ? match.score1 : match.score2;
    const loserGames = team1Won ? match.score2 : match.score1;
    const winnerBefore = calculatedPower(winner.metrics);
    const loserBefore = calculatedPower(loser.metrics);
    const sweep = loserGames === 0;
    const seriesShift = sweep ? 4 : 2;
    const winnerOppositionShift = clamp(1 + (loserBefore - 70) / 7, 1, 4);
    const loserOppositionShift = clamp(1 + (80 - winnerBefore) / 6, 1, 4);

    changeMetric(winner, 'results', 4);
    changeMetric(winner, 'opposition', winnerOppositionShift);
    changeMetric(winner, 'form', 3);
    changeMetric(winner, 'series', seriesShift);
    changeMetric(loser, 'results', -3);
    changeMetric(loser, 'opposition', -loserOppositionShift);
    changeMetric(loser, 'form', -3);
    changeMetric(loser, 'series', -seriesShift);

    const matchDate = match.timestamp ? new Date(match.timestamp).toISOString().slice(0, 10) : null;
    const winnerAfter = calculatedPower(winner.metrics);
    const loserAfter = calculatedPower(loser.metrics);
    winner.autoMatches += 1;
    loser.autoMatches += 1;
    winner.autoLast = { opponent: loser.short, score: `${winnerGames}:${loserGames}`, impact: roundOne(winnerAfter - winnerBefore), date: matchDate };
    loser.autoLast = { opponent: winner.short, score: `${loserGames}:${winnerGames}`, impact: roundOne(loserAfter - loserBefore), date: matchDate };
    if (matchDate) {
      winner.updated = matchDate;
      loser.updated = matchDate;
    }
  });

  data.teams.forEach(team => {
    const base = rankingBaseline.get(team.name);
    team.exactPower = roundOne(calculatedPower(team.metrics));
    team.score = Math.round(team.exactPower);
    team.autoDelta = roundOne(team.exactPower - calculatedPower(base.metrics));
    if (team.autoMatches) {
      if (team.autoDelta > 0.05) {
        team.trend = '↑';
        team.trendLabel = 'W GÓRĘ';
      } else if (team.autoDelta < -0.05) {
        team.trend = '↓';
        team.trendLabel = 'W DÓŁ';
      } else {
        team.trend = '0';
        team.trendLabel = 'BEZ ZMIAN';
      }
      team.tier = tierForScore(team.exactPower);
      team.state = stateForScore(team.exactPower);
    }
  });

  [...data.teams]
    .sort((a, b) => b.exactPower - a.exactPower || rankingBaseline.get(a.name).rank - rankingBaseline.get(b.name).rank)
    .forEach((team, index) => {
      team.rank = index + 1;
      team.rankDelta = rankingBaseline.get(team.name).rank - team.rank;
    });

  data.meta.label = matches.length ? 'Aktualny ranking' : rankingBaseLabel;
  if (rankingLiveStatus) {
    const matchWord = matches.length === 1 ? 'MECZU' : 'MECZACH';
    rankingLiveStatus.textContent = matches.length ? `RANKING PO ${matches.length} ${matchWord}` : 'RANKING STARTOWY';
    rankingLiveStatus.className = `ranking-live-status ${matches.length ? 'live' : ''}`;
    rankingLiveStatus.title = matches.length
      ? 'Ranking uwzględnia zakończone mecze Summer'
      : 'Ranking przed pierwszym wynikiem Summer';
  }
  if (heroEdition) heroEdition.textContent = matches.length ? 'Summer trwa' : 'Przed sezonem';
  if (heroUpdatedAt && matches.length) {
    const lastTimestamp = Math.max(...matches.map(match => match.timestamp || 0));
    if (lastTimestamp) heroUpdatedAt.textContent = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(lastTimestamp));
  }
}

function fixtureResult(leftTeam, rightTeam) {
  const match = automaticMatches.find(item => matchPairKey(item.team1, item.team2) === matchPairKey(leftTeam, rightTeam) && isCompletedMatch(item));
  if (!match) return null;
  const sameOrder = teamMatchKey(match.team1) === teamMatchKey(leftTeam);
  return sameOrder
    ? { left: match.score1, right: match.score2 }
    : { left: match.score2, right: match.score1 };
}

function fixtureCenter(match) {
  const result = fixtureResult(match[0], match[2]);
  if (result) return `<span class="fixture-score"><b>${result.left}:${result.right}</b><small>KONIEC</small></span>`;
  return `<time class="fixture-time" datetime="${esc(match[3])}">${esc(match[1])}</time>`;
}

function resultMeta(match) {
  if (!match.timestamp) return match.round || 'Summer 2026';
  const date = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' }).format(new Date(match.timestamp));
  return `${match.round || 'Summer 2026'} · ${date}`;
}

function renderResults() {
  if (!resultsList || !resultsLabel || !resultsSource) return;
  const summerResults = automaticMatches
    .filter(isCompletedMatch)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 4);
  const rows = summerResults.length ? summerResults.map(match => ({ ...match, meta: resultMeta(match) })) : fallbackResults;

  const officialResults = summerResults.some(match => String(match.source).startsWith('lolesports'));
  resultsLabel.textContent = summerResults.length ? 'WYNIKI SUMMER 2026' : 'SPRING PLAYOFFS';
  resultsSource.href = summerResults.length
    ? officialResults
      ? 'https://lolesports.com/pl-PL/leagues/first_stand%2Cmsi%2Crift_legends%2Cworlds'
      : 'https://lol.fandom.com/wiki/Rift_Legends/2026_Season/Summer_Split'
    : 'https://lol.fandom.com/wiki/Rift_Legends/2026_Season/Spring_Playoffs';
  resultsSource.textContent = summerResults.length
    ? officialResults ? 'LoL Esports ↗' : 'Leaguepedia ↗'
    : 'Leaguepedia ↗';

  resultsList.innerHTML = rows.map(row => `
    <div class="result-row">
      <span class="result-team">${esc(row.team1)}</span><strong class="result-score">${row.score1}:${row.score2}</strong><span class="result-team right">${esc(row.team2)}</span>
      <span class="result-meta">${esc(row.meta)}</span>
    </div>
  `).join('');
}

function setSyncStatus(mode, text, explanation) {
  if (!syncStatus) return;
  syncStatus.className = `sync-status ${mode}`;
  syncStatus.textContent = `20 SPOTKAŃ · ${text}`;
  syncStatus.title = explanation;
}

function readResultsCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(resultsCacheKey));
    return Array.isArray(cached?.matches) ? cached : null;
  } catch {
    return null;
  }
}

function saveResultsCache(matches, source) {
  try {
    localStorage.setItem(resultsCacheKey, JSON.stringify({ savedAt: Date.now(), matches, source }));
  } catch {}
}

async function fetchLolEsportsResults() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const matches = [];
  let pageToken = '';
  let pageCount = 0;
  try {
    do {
      const params = new URLSearchParams({ hl: 'pl-PL', leagueId: riftLegendsLeagueId });
      if (pageToken) params.set('pageToken', pageToken);
      const response = await fetch(`${lolEsportsScheduleUrl}?${params}`, {
        cache: 'no-store',
        credentials: 'omit',
        headers: { 'x-api-key': lolEsportsPublicKey },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`LoL Esports HTTP ${response.status}`);
      const payload = await response.json();
      const schedule = payload?.data?.schedule;
      if (!Array.isArray(schedule?.events)) throw new Error('Brak danych LoL Esports');
      const pageMatches = schedule.events.map(parseLolEsportsEvent).filter(Boolean);
      matches.push(...pageMatches.filter(match => match.timestamp >= summerStartTimestamp && match.timestamp <= summerEndTimestamp));
      const timestamps = pageMatches.map(match => match.timestamp).filter(Boolean);
      const oldestTimestamp = timestamps.length ? Math.min(...timestamps) : 0;
      pageToken = oldestTimestamp && oldestTimestamp > summerStartTimestamp ? schedule?.pages?.older || '' : '';
      pageCount += 1;
    } while (pageToken && pageCount < 8);
    if (!matches.length) throw new Error('Pusta lista LoL Esports');
    return mergeMatchLists(matches);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLeaguepediaResults() {
  const params = new URLSearchParams({
    action: 'cargoquery',
    format: 'json',
    formatversion: '2',
    origin: '*',
    tables: 'MatchSchedule=MS',
    fields: 'MS.Team1=Team1,MS.Team2=Team2,MS.Team1Score=Team1Score,MS.Team2Score=Team2Score,MS.Winner=Winner,MS.DateTime_UTC=DateTimeUTC,MS.Round=Round,MS.BestOf=BestOf',
    where: 'MS.OverviewPage="Rift Legends/2026 Season/Summer Split"',
    order_by: 'MS.DateTime_UTC ASC',
    limit: '100'
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://lol.fandom.com/api.php?${params}`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.cargoquery)) throw new Error('Brak danych Cargo');
    const matches = payload.cargoquery.map(parseCargoMatch).filter(match => match.team1 && match.team2);
    if (!matches.length) throw new Error('Pusta lista meczów');
    return matches;
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshMatchResults() {
  setSyncStatus('local', 'AKTUALIZACJA', 'Sprawdzam najnowsze wyniki');
  try {
    const officialMatches = await fetchLolEsportsResults();
    automaticMatches = mergeMatchLists(confirmedSummerResults, officialMatches);
    automaticResultsSource = 'lolesports';
    saveResultsCache(automaticMatches, automaticResultsSource);
    setSyncStatus('synced', 'AKTUALNE', 'Ranking uwzględnia najnowsze wyniki');
  } catch {
    try {
      const leaguepediaMatches = await fetchLeaguepediaResults();
      automaticMatches = mergeMatchLists(leaguepediaMatches, confirmedSummerResults);
      automaticResultsSource = 'leaguepedia';
      saveResultsCache(automaticMatches, automaticResultsSource);
      setSyncStatus('synced', 'AKTUALNE', 'Ranking uwzględnia najnowsze wyniki');
    } catch {
      const cached = readResultsCache();
      if (cached) {
        automaticMatches = mergeMatchLists(cached.matches, confirmedSummerResults);
        automaticResultsSource = cached.source || 'cache';
        setSyncStatus('cached', 'OSTATNIE DANE', 'Wyświetlam ostatnie zapisane wyniki');
      } else {
        automaticMatches = [...confirmedSummerResults];
        automaticResultsSource = 'lolesports-confirmed';
        setSyncStatus('local', 'AKTUALNE', 'Ranking uwzględnia potwierdzone wyniki');
      }
    }
  }
  applyAutomaticRanking();
  renderRanking();
  renderTeams();
  renderSchedule(selectedScheduleRound);
  renderResults();
  renderBroadcast();
  renderTickerContent();
}

function scoreMarkup(team, compact = false) {
  if (team.score == null) return `<div class="score ${compact ? 'compact' : ''}"><strong>NR</strong><span>BEZ OCENY</span></div>`;
  return `<div class="score ${compact ? 'compact' : ''}"><strong>${team.score}</strong><span>OCENA</span></div>`;
}

function teamLogo(team, size = '') {
  const content = team.logo
    ? `<img class="${team.logoInvert ? 'logo-invert' : ''}" src="${esc(team.logo)}" alt="" decoding="async">`
    : `<span>${esc(team.mark)}</span>`;
  return `<div class="team-logo ${size}" style="--accent:${team.accent}">${content}</div>`;
}

function rosterStatus(team) {
  return `<span class="verify-badge ${esc(team.rosterStatusType || 'partial')}"><i></i>${esc(team.rosterStatus || 'Weryfikacja')}</span>`;
}

function sameRosterName(first, second) {
  return String(first || '').localeCompare(String(second || ''), 'pl', { sensitivity: 'base' }) === 0;
}

function rosterChangeCount(team) {
  return team.roles.reduce((total, role, index) => total + (sameRosterName(team.previousRoster?.[index], team.roster[index]) ? 0 : 1), 0);
}

function rosterChangeText(team) {
  const count = rosterChangeCount(team);
  if (!count) return 'SKŁAD BEZ ZMIAN';
  if (count === 1) return '1 ZMIANA W SKŁADZIE';
  if (count < 5) return `${count} ZMIANY W SKŁADZIE`;
  return `${count} ZMIAN W SKŁADZIE`;
}

function rosterComparisonRows(team) {
  return team.roles.map((role, index) => {
    const before = team.previousRoster?.[index] || 'brak';
    const after = team.roster[index] || 'brak';
    const changed = !sameRosterName(before, after);
    return `<div class="roster-change-row ${changed ? 'changed' : 'same'}"><small>${esc(role)}</small><span class="before">${esc(before)}</span><b>→</b><span class="after">${esc(after)}</span></div>`;
  }).join('');
}

function peopleText(people) {
  return people?.length ? people.map(esc).join(', ') : 'brak';
}

function teamStaffRow(team) {
  if (!team.previousStaff?.length && !team.staff?.length) return '';
  return `<div class="team-card-staff"><small>TRENERZY</small><span>${peopleText(team.previousStaff)}</span><b>→</b><span>${peopleText(team.staff)}</span></div>`;
}

function peopleComparison(label, before, after) {
  if (!before?.length && !after?.length) return '';
  return `<div class="people-comparison"><small>${esc(label)}</small><span>${peopleText(before)}</span><b>→</b><span>${peopleText(after)}</span></div>`;
}

function rankedTeams() {
  return [...data.teams].sort((a, b) => a.rank - b.rank);
}

function renderBroadcast() {
  if (!broadcastBar || !data.broadcasts) return;
  const broadcast = data.broadcasts;
  const now = Date.now();
  const scheduledEvents = scheduleRounds
    .flatMap(round => round.days.flatMap(day => day.matches))
    .map(match => ({
      title: `${match[0]} vs ${match[2]}`,
      startTime: new Date(match[3]).getTime(),
      finished: Boolean(fixtureResult(match[0], match[2]))
    }))
    .sort((a, b) => a.startTime - b.startTime);
  const liveMatch = automaticMatches
    .filter(match => !isCompletedMatch(match) && /in.?progress|live/.test(String(match.state || '').toLowerCase()))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))[0];
  const live = liveMatch ? { title: `${liveMatch.team1} vs ${liveMatch.team2}` } : null;
  const next = scheduledEvents.find(event => !event.finished && event.startTime > now);
  const status = live ? 'NA ŻYWO' : next ? 'NASTĘPNY MECZ' : 'BRAK TRANSMISJI';
  const nextDate = next
    ? new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(next.startTime))
    : '';
  const title = live?.title || (next ? `${next.title} · ${nextDate}` : 'Aktualnie nic nie jest transmitowane');
  const youtubeUrl = live ? broadcast.youtubeLive : broadcast.youtubeChannel;

  broadcastBar.innerHTML = `
    <div class="broadcast-copy">
      <span class="broadcast-status ${live ? 'live' : ''}"><i></i>${esc(status)}</span>
      <strong>${esc(title)}</strong>
    </div>
    <div class="broadcast-actions">
      <a class="broadcast-link primary" href="${esc(youtubeUrl)}" target="_blank" rel="noreferrer noopener">${live ? 'YouTube na żywo' : 'Kanał YouTube'}</a>
      <a class="broadcast-link" href="${esc(broadcast.twitch)}" target="_blank" rel="noreferrer noopener">Twitch</a>
      ${live ? `<a class="broadcast-link" href="${esc(broadcast.youtubeChannel)}" target="_blank" rel="noreferrer noopener">Kanał YouTube</a>` : ''}
    </div>
  `;
}

function renderSchedule(roundId = 1) {
  if (!scheduleTabs || !schedulePanel) return;
  const round = scheduleRounds.find(item => item.id === Number(roundId)) || scheduleRounds[0];
  selectedScheduleRound = round.id;

  scheduleTabs.innerHTML = scheduleRounds.map(item => `
    <button class="schedule-tab ${item.id === round.id ? 'active' : ''}" type="button" role="tab" aria-selected="${item.id === round.id}" aria-controls="schedulePanel" data-schedule-round="${item.id}">
      ${esc(item.label)}
      <small>${esc(item.dates)}</small>
    </button>
  `).join('');

  schedulePanel.innerHTML = `
    <div class="round-heading">
      <div><h4>${esc(round.title)}</h4><p>Round Robin, BO3 · 4 mecze</p></div>
      <span class="patch-badge">PATCH ${esc(round.patch)}</span>
    </div>
    <div class="match-days">
      ${round.days.map(day => `
        <section class="match-day-card" aria-label="${esc(day.date)}">
          <div class="match-date">${esc(day.date)}<span>${esc(day.short)}</span></div>
          ${day.matches.map(match => `
            <div class="fixture">
              <span class="fixture-team">${esc(match[0])}</span>
              ${fixtureCenter(match)}
              <span class="fixture-team right">${esc(match[2])}</span>
            </div>
          `).join('')}
        </section>
      `).join('')}
    </div>
  `;
}

function activeScheduleRound() {
  const now = Date.now();
  return scheduleRounds.find(round => now <= new Date(round.end).getTime())?.id || scheduleRounds.at(-1).id;
}

function renderRanking() {
  rankingList.innerHTML = rankedTeams().map(team => `
    <article class="ranking-row ${team.state} ${team.autoMatches ? (team.autoDelta >= 0 ? 'auto-gain' : 'auto-loss') : ''}" style="--accent:${team.accent}" data-team="${team.rank}" tabindex="0" role="button" aria-label="Otwórz porównanie składu ${esc(team.name)}">
      <div class="rank-number">${String(team.rank).padStart(2,'0')}</div>
      ${teamLogo(team)}
      <div class="team-main">
        <div class="team-title-line"><h3>${esc(team.name)}</h3><time class="team-updated" datetime="${esc(team.updated)}">akt. ${esc(formatTeamDate(team.updated))}</time></div>
        <div class="ranking-change-summary">${esc(rosterChangeText(team))} · ${esc(team.previousLabel)} → SUMMER</div>
        ${team.autoLast ? `<div class="auto-note"><span>OSTATNI MECZ</span>${esc(team.autoLast.score)} z ${esc(team.autoLast.opponent)}</div>` : ''}
      </div>
      <div class="trend-pill"><b>${esc(team.trend)}</b><span>${esc(team.trendLabel)}</span></div>
      ${scoreMarkup(team, true)}
      <div class="row-arrow">→</div>
    </article>
  `).join('');
}

function renderTeams() {
  teamGrid.innerHTML = rankedTeams().map(team => `
    <button class="team-card" style="--accent:${team.accent}" data-team="${team.rank}">
      <div class="team-card-top"><span>#${team.rank}</span><span>${team.score ?? 'NR'}</span></div>
      <div class="team-card-verify">${rosterStatus(team)}<time class="card-updated" datetime="${esc(team.updated)}">akt. ${esc(formatTeamDate(team.updated))}</time></div>
      ${teamLogo(team, 'medium')}
      <h3>${esc(team.short)}</h3>
      <p>${esc(team.spring)}</p>
      <div class="team-change-badge">${esc(rosterChangeText(team))}</div>
      <div class="team-card-compare-head"><span>${esc(team.previousLabel)}</span><span>SUMMER</span></div>
      <div class="team-card-roster">${rosterComparisonRows(team)}</div>
      ${teamStaffRow(team)}
      <div class="team-card-cta">Porównaj skład <span>↗</span></div>
    </button>
  `).join('');
}

function renderWeights() {
  weightCard.innerHTML = `
    <div class="weight-title"><span>PUNKTACJA</span><b>100</b></div>
    ${data.weights.map(w => `
      <div class="weight-row">
        <div class="weight-label"><b>${esc(w.label)}</b><span>${esc(w.note)}</span></div>
        <div class="weight-value">${w.value}%</div>
        <div class="weight-bar"><i style="width:${w.value * 3.15}%"></i></div>
      </div>
    `).join('')}
  `;
}

function openTeam(rank) {
  const team = data.teams.find(t => t.rank === Number(rank));
  if (!team) return;
  modal.style.setProperty('--accent', team.accent);
  const metrics = [
    ['Skład', team.metrics.roster],
    ['Ostatnie wyniki', team.metrics.results],
    ['Siła przeciwników', team.metrics.opposition],
    ['Synergia', team.metrics.synergy],
    ['Forma', team.metrics.form],
    ['BO3 / BO5', team.metrics.series]
  ];
  modalContent.innerHTML = `
    <div class="modal-hero">
      <div class="modal-rank">#${String(team.rank).padStart(2,'0')}</div>
      <div class="modal-title-wrap">${teamLogo(team, 'large')}<div><div class="eyebrow">${esc(data.meta.edition)} · ${esc(data.meta.label)}</div><h2>${esc(team.name)}</h2><p>${esc(team.spring)}</p><div class="modal-verify">${rosterStatus(team)}<time class="modal-updated" datetime="${esc(team.updated)}">Aktualizacja: ${esc(formatTeamDate(team.updated, true))}</time></div></div></div>
      ${scoreMarkup(team)}
    </div>
    ${team.autoLast ? `
      <div class="modal-auto-summary">
        <span>OSTATNI MECZ</span>
        <p>${esc(team.autoLast.score)} z ${esc(team.autoLast.opponent)}. Zmiana oceny: ${esc(signedPower(team.autoLast.impact))}.</p>
      </div>
    ` : ''}
    <div class="modal-grid">
      <div class="roster-comparison">
        <div class="roster-heading-row"><h3>Zmiany w składzie</h3><a class="roster-source" href="${esc(team.rosterSourceUrl)}" target="_blank" rel="noopener">${esc(team.rosterSource)}</a></div>
        <div class="modal-compare-head"><span>${esc(team.previousLabel)}</span><span>SUMMER</span></div>
        <div class="modal-compare-list">${rosterComparisonRows(team)}</div>
        ${peopleComparison('TRENERZY', team.previousStaff, team.staff)}
        ${peopleComparison('INNI ZAWODNICY', team.previousExtras, team.extraPlayers)}
      </div>
      <div class="metric-panel">
        <h3>Składniki oceny</h3>
        ${metrics.map(([label,value]) => `
          <div class="metric-row"><div><b>${label}</b><span>${value ? value : 'brak'}</span></div><div class="metric-track"><i style="width:${value}%"></i></div></div>
        `).join('')}
      </div>
    </div>
  `;
  modal.showModal();
  history.replaceState(null, '', `#team-${team.rank}`);
}

function closeModal() {
  modal.close();
  if (location.hash.startsWith('#team-')) history.replaceState(null, '', '#ranking');
}

document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-team]');
  if (trigger) openTeam(trigger.dataset.team);
});

document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.ranking-row')) {
    e.preventDefault();
    openTeam(e.target.dataset.team);
  }
});

scheduleTabs?.addEventListener('click', e => {
  const trigger = e.target.closest('[data-schedule-round]');
  if (trigger) renderSchedule(trigger.dataset.scheduleRound);
});

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => {
  const rect = modal.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) closeModal();
});

const menuToggle = document.querySelector('#menuToggle');
const siteNav = document.querySelector('#siteNav');
menuToggle.addEventListener('click', () => {
  const open = siteNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
siteNav.addEventListener('click', () => {
  siteNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
});

const tickerWindow = document.querySelector('#tickerWindow');
const tickerTrack = document.querySelector('.ticker-track');
let tickerDragging = false;
let tickerStartX = 0;
let tickerStartOffset = 0;
let tickerOffset = 0;
let tickerGroupWidth = 0;
let tickerLastFrame = 0;
let tickerResumeAt = 0;
let tickerMoved = false;
let tickerMarkup = document.querySelector('.ticker-group')?.innerHTML || '';
let tickerContentSignature = '';
let manualTickerPosts = [];

function normalizeTickerOffset(value) {
  if (!tickerGroupWidth) return 0;
  return ((value % tickerGroupWidth) + tickerGroupWidth) % tickerGroupWidth;
}

function drawTicker() {
  tickerTrack.style.transform = `translate3d(${-tickerOffset}px, 0, 0)`;
}

function rebuildTickerGroups(markup = tickerMarkup) {
  if (!tickerWindow || !tickerTrack || !markup) return;
  tickerMarkup = markup;
  tickerTrack.replaceChildren();

  const firstGroup = document.createElement('div');
  firstGroup.className = 'ticker-group';
  firstGroup.innerHTML = tickerMarkup;
  tickerTrack.append(firstGroup);
  tickerGroupWidth = firstGroup.scrollWidth;
  if (!tickerGroupWidth) return;

  const groupCount = Math.max(4, Math.ceil(tickerWindow.clientWidth / tickerGroupWidth) + 2);
  for (let index = 1; index < groupCount; index += 1) {
    const clone = firstGroup.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('a, button').forEach(element => { element.tabIndex = -1; });
    tickerTrack.append(clone);
  }
  tickerTrack.querySelectorAll('a').forEach(link => link.setAttribute('draggable', 'false'));

  tickerOffset = normalizeTickerOffset(tickerOffset);
  drawTicker();
}

function automaticTickerPosts() {
  return uniqueCompletedMatches()
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 4)
    .map(match => ({
      id: `result-${matchIdentity(match)}`,
      team: 'WYNIK',
      text: `${match.team1} ${match.score1}:${match.score2} ${match.team2}`,
      url: String(match.source || '').startsWith('leaguepedia')
        ? 'https://lol.fandom.com/wiki/Rift_Legends/2026_Season/Summer_Split'
        : 'https://lolesports.com/pl-PL/leagues/first_stand%2Cmsi%2Crift_legends%2Cworlds'
    }));
}

function tickerMatchTime(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const time = new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
  const isToday = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
  if (isToday) return `dzisiaj, ${time}`;
  const day = new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'short'
  }).format(date);
  return `${day}, ${time}`;
}

function contextTickerPosts() {
  const now = Date.now();
  const posts = [];
  const liveMatch = automaticMatches
    .filter(match => !isCompletedMatch(match) && /in.?progress|live/.test(String(match.state || '').toLowerCase()))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))[0];

  if (liveMatch) {
    posts.push({
      id: `live-${matchIdentity(liveMatch)}`,
      team: 'LIVE',
      text: `${liveMatch.team1} vs ${liveMatch.team2}`,
      url: data.broadcasts?.youtubeLive || data.broadcasts?.youtubeChannel || '#matches'
    });
  }

  const upcoming = scheduleRounds
    .flatMap(round => round.days.flatMap(day => day.matches))
    .map(match => ({ team1: match[0], team2: match[2], timestamp: new Date(match[3]).getTime() }))
    .filter(match => match.timestamp > now && !fixtureResult(match.team1, match.team2))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 1);

  upcoming.forEach(match => posts.push({
    id: `upcoming-${match.team1}-${match.team2}-${match.timestamp}`,
    team: 'NASTĘPNY MECZ',
    text: `${match.team1} vs ${match.team2} · ${tickerMatchTime(match.timestamp)}`,
    url: '#matches'
  }));

  if (!liveMatch && data.broadcasts) {
    posts.push({
      id: 'broadcast-nervarien',
      team: 'TRANSMISJA',
      text: 'Nervarien · YouTube i Twitch',
      url: data.broadcasts.youtubeChannel
    });
  }

  return posts;
}

function renderTickerContent() {
  if (!tickerTrack) return false;
  const posts = [
    ...automaticTickerPosts(),
    ...manualTickerPosts.filter(post => String(post.team).toUpperCase() !== 'WYNIK'),
    ...contextTickerPosts()
  ];
  const uniquePosts = [...new Map(posts.map(post => [`${post.team}|${post.text}`, post])).values()];
  if (!uniquePosts.length) return false;

  const signature = uniquePosts.map(post => `${post.team}|${post.text}|${post.url}`).join('||');
  if (signature === tickerContentSignature) return true;
  tickerContentSignature = signature;

  const markup = uniquePosts.map(post => {
    const external = /^https?:\/\//i.test(post.url);
    return `
    <a class="ticker-item" href="${esc(post.url)}" ${external ? 'target="_blank" rel="noreferrer noopener"' : ''}>
      <b>${esc(post.team)}</b><span>${esc(post.text)}</span>
    </a>
  `;
  }).join('');

  tickerOffset = 0;
  rebuildTickerGroups(markup);
  return true;
}

function finishTickerDrag() {
  if (!tickerDragging) return;
  tickerDragging = false;
  tickerResumeAt = performance.now() + 1600;
  tickerWindow.classList.remove('dragging');
}

if (tickerWindow && tickerTrack) {
  rebuildTickerGroups();

  tickerWindow.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    tickerDragging = true;
    tickerMoved = false;
    tickerStartX = event.clientX;
    tickerStartOffset = tickerOffset;
    tickerWindow.classList.add('dragging');
    tickerWindow.setPointerCapture?.(event.pointerId);
  });

  tickerWindow.addEventListener('pointermove', event => {
    if (!tickerDragging) return;
    const distance = event.clientX - tickerStartX;
    if (Math.abs(distance) > 4) tickerMoved = true;
    tickerOffset = normalizeTickerOffset(tickerStartOffset - distance);
    drawTicker();
    if (tickerMoved) event.preventDefault();
  });

  tickerWindow.addEventListener('pointerup', finishTickerDrag);
  tickerWindow.addEventListener('pointercancel', finishTickerDrag);
  tickerWindow.addEventListener('dragstart', event => event.preventDefault());
  tickerWindow.addEventListener('click', event => {
    if (!tickerMoved) return;
    event.preventDefault();
    event.stopPropagation();
    tickerMoved = false;
  }, true);

  if (window.ResizeObserver) {
    new ResizeObserver(() => rebuildTickerGroups()).observe(tickerWindow);
  } else {
    window.addEventListener('resize', () => rebuildTickerGroups());
  }
  document.fonts?.ready.then(() => rebuildTickerGroups());

  if (window.requestAnimationFrame) {
    const moveTicker = now => {
      if (!tickerLastFrame) tickerLastFrame = now;
      const elapsed = Math.min(Math.max(now - tickerLastFrame, 0), 1000);
      tickerLastFrame = now;
      if (!tickerDragging && now >= tickerResumeAt) {
        tickerOffset = normalizeTickerOffset(tickerOffset + elapsed * .045);
        drawTicker();
      }
      window.requestAnimationFrame(moveTicker);
    };
    window.requestAnimationFrame(moveTicker);
  }
}

function renderTeamPosts(payload) {
  const posts = Array.isArray(payload?.posts) ? payload.posts.filter(post => post?.text && post?.url && post?.team) : [];
  manualTickerPosts = posts;
  renderTickerContent();
  if (payload.updatedAt) {
    const updated = new Date(payload.updatedAt);
    if (!Number.isNaN(updated.getTime())) {
      tickerWindow.title = `Wyniki i MVP. Ostatnia aktualizacja: ${new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short' }).format(updated)}`;
    }
  }
  return Boolean(posts.length);
}

async function loadTeamPosts() {
  try {
    const response = await fetch(`social-posts.json?v=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) renderTeamPosts(await response.json());
  } catch {}
}


function renderSources() {
  const target = document.querySelector('#sourceGrid');
  if (!target || !data.sources) return;
  target.innerHTML = data.sources.map(source => `
    <a class="source-card" href="${esc(source.url)}" target="_blank" rel="noreferrer noopener">
      <h3>${esc(source.label)}</h3><p>${esc(source.note)}</p>
      <span class="source-arrow">↗</span>
    </a>
  `).join('');
}

applyAutomaticRanking();
renderRanking();
renderTeams();
renderWeights();
renderSources();
renderSchedule(activeScheduleRound());
renderResults();
renderBroadcast();
setInterval(renderBroadcast, 60000);
refreshMatchResults();
setInterval(refreshMatchResults, 60000);
loadTeamPosts();
setInterval(loadTeamPosts, 300000);

if (location.hash.startsWith('#team-')) {
  const rank = Number(location.hash.split('-')[1]);
  if (rank) setTimeout(() => openTeam(rank), 50);
}
