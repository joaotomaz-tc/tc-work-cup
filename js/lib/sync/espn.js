import { ESPN_URL, ESPN_CALENDAR } from '../../data/config.js';
import { OWNER_OF } from '../../data/owners.js';
import { ALL_TEAMS } from '../../data/tournament.js';
import { FIXTURE_INDEX } from '../../data/fixtures.js';
import { normTeam } from '../../data/aliases.js';
import { fmtKickoff } from '../format.js';

const calendarCache = { dates: null, at: 0 };

function isoToYmd(iso) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,"0")}${String(d.getUTCDate()).padStart(2,"0")}`;
}
function todayYmd()     { return isoToYmd(new Date()); }
function yesterdayYmd() { return isoToYmd(new Date(Date.now() - 86400000)); }

function allTournamentDates() {
  const out = [], start = Date.UTC(2026,5,11), end = Date.UTC(2026,6,19);
  for (let t = start; t <= end; t += 86400000) {
    const d = new Date(t);
    out.push(`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,"0")}${String(d.getUTCDate()).padStart(2,"0")}`);
  }
  return out;
}

async function fetchCalendarDates() {
  const now = Date.now();
  if (calendarCache.dates && now - calendarCache.at < 3600000) return calendarCache.dates;
  try {
    const r = await fetch(ESPN_CALENDAR);
    if (!r.ok) throw new Error("calendar HTTP " + r.status);
    const d = await r.json();
    const dates = (d.eventDate?.dates || []).map(isoToYmd);
    if (dates.length) { calendarCache.dates = dates; calendarCache.at = now; return dates; }
  } catch (e) {}
  return allTournamentDates();
}

function numOrNull(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; }

function isToday(iso) {
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function pickNextScheduled(upcoming) {
  const now = Date.now();
  const pool = upcoming.filter(m => OWNER_OF[m.a] || OWNER_OF[m.b]);
  const list = (pool.length ? pool : upcoming)
    .filter(m => Date.parse(m.start) >= now - 60000)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return list[0] || null;
}

function resolveTeam(team) {
  if (!team) return null;
  for (const f of [team.displayName, team.shortDisplayName, team.name, team.location, team.abbreviation]) {
    const r = normTeam(f); if (r && ALL_TEAMS.includes(r)) return r;
  }
  const c = String(team.displayName || team.name || "").toLowerCase();
  return ALL_TEAMS.find(t => { const tl = t.toLowerCase(); return c && (c.includes(tl) || tl.includes(c)); }) || null;
}

function espnStage(ev, comp, a, b) {
  if (FIXTURE_INDEX[[a, b].sort().join("|")]) return "group";
  const txt = ((comp?.notes?.[0]?.headline) || ev.name || ev.shortName || "").toLowerCase();
  if (/round of 32|r32/.test(txt)) return "Round of 32";
  if (/round of 16|r16/.test(txt)) return "Round of 16";
  if (/quarter/.test(txt)) return "Quarter-final";
  if (/semi/.test(txt)) return "Semi-final";
  if (/third|3rd|play-?off/.test(txt)) return "Third place";
  if (/final/.test(txt)) return "Final";
  const d = new Date(ev.date), md = (d.getUTCMonth()+1)*100 + d.getUTCDate();
  if (md >= 628 && md <= 703) return "Round of 32";
  if (md >= 704 && md <= 708) return "Round of 16";
  if (md >= 709 && md <= 712) return "Quarter-final";
  if (md >= 713 && md <= 716) return "Semi-final";
  if (md === 718) return "Third place";
  if (md >= 717) return "Final";
  return "Round of 32";
}

async function fetchScoreboardJson(url) {
  const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); return r.json();
}

async function collectEspnEvents(dates, includeTodayBoard) {
  const urls = [...dates.map(d => `${ESPN_URL}?dates=${d}&limit=100`)];
  if (includeTodayBoard) urls.unshift(`${ESPN_URL}?limit=100`);
  const settled = await Promise.allSettled(urls.map(fetchScoreboardJson));
  const ok = settled.filter(s => s.status === "fulfilled");
  if (!ok.length) throw new Error("ESPN unreachable");
  const events = [], seen = new Set();
  ok.forEach(s => (s.value.events || []).forEach(ev => {
    if (ev.id && !seen.has(ev.id)) { seen.add(ev.id); events.push(ev); }
  }));
  return events;
}

export function parseEspnEvents(events) {
  const results = [], scorerMap = {}, liveMatches = [], upcoming = [], fixtureSchedules = [];
  let liveCount = 0;
  events.forEach(ev => {
    const comp = ev.competitions?.[0]; if (!comp) return;
    const status = comp.status?.type || {}; const state = status.state;
    const completed = status.completed ?? state === "post"; const live = state === "in";
    const cs = comp.competitors || [];
    const home = cs.find(c => c.homeAway === "home") || cs[0];
    const away = cs.find(c => c.homeAway === "away") || cs[1];
    if (!home || !away) return;
    const a = resolveTeam(home.team), b = resolveTeam(away.team); if (!a || !b) return;
    if (!completed && !live) {
      if (ev.date && isToday(ev.date))
        upcoming.push({ stage: espnStage(ev,comp,a,b), a, b, start: ev.date, kickoff: fmtKickoff(ev.date), detail: status.shortDetail || status.detail || "" });
      if (ev.date) {
        const hit = FIXTURE_INDEX[[a, b].sort().join("|")];
        if (hit) fixtureSchedules.push({ id: hit.fx.id, start: ev.date });
      }
      return;
    }
    const ga = parseInt(home.score, 10), gb = parseInt(away.score, 10);
    if (!Number.isFinite(ga) || !Number.isFinite(gb)) return;
    const stage = espnStage(ev, comp, a, b); const clock = status.shortDetail || status.detail || "";
    results.push({ stage, a, b, ga, gb, pa: numOrNull(home.shootoutScore), pb: numOrNull(away.shootoutScore), live, clock, date: ev.date || null });
    if (live) { liveCount++; liveMatches.push({ stage, a, b, ga, gb, clock }); }
    if (completed) (comp.details || []).forEach(d => {
      const tx = (d?.type?.text || "").toLowerCase();
      if (d.scoringPlay && !/own goal/.test(tx)) {
        const nm = d.athletesInvolved?.[0]?.displayName; if (!nm) return;
        const tm = d.team?.id === home.team?.id ? a : b;
        const k = nm + "|" + tm; (scorerMap[k] = scorerMap[k] || { p:nm, t:tm, g:0 }).g++;
      }
    });
  });
  const scorers = Object.values(scorerMap).filter(s => OWNER_OF[s.t]).sort((x, y) => y.g - x.g).slice(0, 15);
  return { results, scorers, liveCount, liveMatches, nextScheduled: pickNextScheduled(upcoming), fixtureSchedules };
}

export async function fetchESPN({ scope = "full" } = {}) {
  const liveScope = scope === "live";
  const dates = liveScope ? [yesterdayYmd(), todayYmd()] : await fetchCalendarDates();
  const events = await collectEspnEvents(dates, liveScope);
  if (!events.length && !liveScope) throw new Error("ESPN returned nothing");
  return parseEspnEvents(events);
}
