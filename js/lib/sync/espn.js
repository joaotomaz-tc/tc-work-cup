import { ESPN_URL, ESPN_SUMMARY, ESPN_CALENDAR } from '../../data/config.js';
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

// True in the 2 hours around UTC midnight — yesterday's date URL is needed to catch
// matches that kicked off just before midnight and are still in progress.
function isNearMidnight() {
  const h = new Date().getUTCHours();
  return h < 2 || h >= 22;
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
  const fallback = ALL_TEAMS.find(t => { const tl = t.toLowerCase(); return c && (c.includes(tl) || tl.includes(c)); }) || null;
  if (!fallback && (team.displayName || team.name)) {
    // Only warn in development and only for names that look like real country names,
    // not ESPN's TBD/placeholder bracket slots ("Winner Group A", "Qualifier 3", etc.)
    const raw = team.displayName || team.name || "";
    if (import.meta.env.DEV && raw.length > 3 && !/winner|loser|place|round\s|runner|qualifier|finalist|tbd|\b\dnd\b|\b\dst\b|\b\drd\b/i.test(raw)) {
      console.warn(`[ESPN] Unresolved team name: "${raw}" — add an entry to aliases.js`);
    }
  }
  return fallback;
}

// Match statuses that must NOT be stored as completed results.
// Postponed/abandoned/suspended matches can have partial scores that would corrupt standings.
const SKIP_STATUS = new Set([
  "STATUS_POSTPONED", "STATUS_ABANDONED", "STATUS_CANCELED", "STATUS_CANCELLED",
  "STATUS_DELAYED", "STATUS_SUSPENDED",
]);

function espnStage(ev, comp, a, b) {
  // 1. Direct fixture-index lookup — definitive for all 48 group matches.
  if (FIXTURE_INDEX[[a, b].sort().join("|")]) return "group";

  // 2. altGameNote — machine-readable, present on every competition object.
  //    Group matches: "FIFA World Cup, Group L"
  //    KO matches:    "FIFA World Cup, Round of 32" etc.
  const note = (comp?.altGameNote || "").toLowerCase();
  if (/\bgroup\b/.test(note))             return "group";
  if (/round of 32|r32/.test(note))      return "Round of 32";
  if (/round of 16|r16/.test(note))      return "Round of 16";
  if (/quarter/.test(note))              return "Quarter-final";
  if (/semi/.test(note))                 return "Semi-final";
  if (/third|3rd|3rd.place|play.?off/.test(note)) return "Third place";
  if (/final/.test(note))               return "Final";

  // 3. Season slug on the event — reliable for the group phase.
  const slug = (ev.season?.slug || "").toLowerCase();
  if (slug === "group-stage") return "group";

  // 4. Headline text in notes or event name.
  const txt = ((comp?.notes?.[0]?.headline) || ev.name || ev.shortName || "").toLowerCase();
  if (/round of 32|r32/.test(txt))  return "Round of 32";
  if (/round of 16|r16/.test(txt))  return "Round of 16";
  if (/quarter/.test(txt))          return "Quarter-final";
  if (/semi/.test(txt))             return "Semi-final";
  if (/third|3rd|play-?off/.test(txt)) return "Third place";
  if (/final/.test(txt))            return "Final";

  // 5. Date-based fallback using the 2026 schedule.
  const d = new Date(ev.date), md = (d.getUTCMonth()+1)*100 + d.getUTCDate();
  if (md >= 628 && md <= 703) return "Round of 32";
  if (md >= 704 && md <= 708) return "Round of 16";
  if (md >= 709 && md <= 712) return "Quarter-final";
  if (md >= 713 && md <= 716) return "Semi-final";
  if (md === 718)             return "Third place";
  if (md >= 717)              return "Final";
  return "group";
}

async function fetchScoreboardJson(url) {
  const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); return r.json();
}

// Fetch URLs in batches to avoid a burst of 34 simultaneous requests during a full sync.
async function batchFetch(urls, batchSize = 6) {
  const results = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(fetchScoreboardJson));
    results.push(...settled);
    if (i + batchSize < urls.length) await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

async function collectEspnEvents(dates, liveScope) {
  let urls;
  if (liveScope) {
    // The bare scoreboard URL (no ?dates=) always returns the current day's
    // live and recently-finished events — one request covers everything.
    // Only add yesterday's URL during the 2-hour window around midnight when
    // a match could have kicked off just before midnight UTC.
    urls = [`${ESPN_URL}?limit=100`];
    if (isNearMidnight()) urls.push(`${ESPN_URL}?dates=${yesterdayYmd()}&limit=100`);
  } else {
    // Full scope: one request per match day, batched to stay polite.
    urls = dates.map(d => `${ESPN_URL}?dates=${d}&limit=100`);
  }

  const settled = await batchFetch(urls, liveScope ? urls.length : 6);
  const ok = settled.filter(s => s.status === "fulfilled");
  if (!ok.length) throw new Error("ESPN unreachable");
  const events = [], seen = new Set();
  ok.forEach(s => (s.value.events || []).forEach(ev => {
    if (ev.id && !seen.has(ev.id)) { seen.add(ev.id); events.push(ev); }
  }));
  return events;
}

// Fetch penalty-shootout scores from the summary endpoint for completed KO draws
// where the scoreboard did not include shootoutScore.
async function fetchShootoutScores(eventIds) {
  if (!eventIds.length) return [];
  const settled = await Promise.allSettled(
    eventIds.map(id =>
      fetch(`${ESPN_SUMMARY}?event=${id}`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
    )
  );
  const results = [];
  settled.forEach((s, i) => {
    if (s.status !== "fulfilled") return;
    const comps = s.value?.header?.competitions?.[0]?.competitors || [];
    const home = comps.find(c => c.homeAway === "home") || comps[0];
    const away = comps.find(c => c.homeAway === "away") || comps[1];
    if (!home || !away) return;
    // ESPN uses shootoutScore; some older endpoints use penaltyScore
    const pa = numOrNull(home.shootoutScore ?? home.penaltyScore);
    const pb = numOrNull(away.shootoutScore ?? away.penaltyScore);
    if (pa != null && pb != null) results.push({ id: eventIds[i], pa, pb });
  });
  return results;
}

export function parseEspnEvents(events) {
  const results = [], scorerMap = {}, scorersByEvent = {}, liveMatches = [], upcoming = [], fixtureSchedules = [];
  let liveCount = 0;
  events.forEach(ev => {
    const comp = ev.competitions?.[0]; if (!comp) return;
    const statusType = comp.status?.type || {};
    const statusName = statusType.name || "";

    // Skip postponed, abandoned, suspended matches entirely so partial scores
    // never corrupt standings or knockout results.
    if (SKIP_STATUS.has(statusName)) return;

    const state = statusType.state;
    const completed = statusType.completed ?? state === "post";
    const live = state === "in";

    const cs = comp.competitors || [];
    const home = cs.find(c => c.homeAway === "home") || cs[0];
    const away = cs.find(c => c.homeAway === "away") || cs[1];
    if (!home || !away) return;
    const a = resolveTeam(home.team), b = resolveTeam(away.team); if (!a || !b) return;

    if (!completed && !live) {
      if (ev.date && isToday(ev.date))
        upcoming.push({ stage: espnStage(ev,comp,a,b), a, b, start: ev.date, kickoff: fmtKickoff(ev.date), detail: statusType.shortDetail || statusType.detail || "" });
      if (ev.date) {
        const hit = FIXTURE_INDEX[[a, b].sort().join("|")];
        if (hit) fixtureSchedules.push({ id: hit.fx.id, start: ev.date });
      }
      return;
    }

    const ga = parseInt(home.score, 10), gb = parseInt(away.score, 10);
    if (!Number.isFinite(ga) || !Number.isFinite(gb)) return;
    const stage = espnStage(ev, comp, a, b);
    const clock = statusType.shortDetail || statusType.detail || "";

    // Read penalty-shootout scores from the scoreboard.
    // These are populated by ESPN during an active shootout and after it completes.
    // If absent here, fetchESPN() will follow up with the summary endpoint for
    // completed KO draws (where ga === gb).
    const pa = numOrNull(home.shootoutScore);
    const pb = numOrNull(away.shootoutScore);

    results.push({
      eventId: ev.id,   // retained so fetchESPN can do a summary follow-up if needed
      stage, a, b, ga, gb, pa, pb, live, clock, date: ev.date || null,
    });

    if (live) {
      liveCount++;
      liveMatches.push({ stage, a, b, ga, gb, pa, pb, clock });
    }

    if (completed) {
      const matchMap = {};
      (comp.details || []).forEach(d => {
        const tx = (d?.type?.text || "").toLowerCase();
        if (d.scoringPlay && !/own goal/.test(tx)) {
          const nm = d.athletesInvolved?.[0]?.displayName; if (!nm) return;
          const tm = d.team?.id === home.team?.id ? a : b;
          const k = nm + "|" + tm;
          matchMap[k] = (matchMap[k] || 0) + 1;
          (scorerMap[k] = scorerMap[k] || { p:nm, t:tm, g:0 }).g++;
        }
      });
      if (ev.id && Object.keys(matchMap).length) {
        scorersByEvent[ev.id] = Object.entries(matchMap).map(([k, g]) => {
          const [p, t] = k.split("|");
          return { p, t, g };
        });
      }
    }
  });

  const scorers = Object.values(scorerMap).filter(s => OWNER_OF[s.t]).sort((x, y) => y.g - x.g).slice(0, 15);
  return { results, scorers, scorersByEvent, liveCount, liveMatches, nextScheduled: pickNextScheduled(upcoming), fixtureSchedules };
}

export async function fetchESPN({ scope = "full" } = {}) {
  const liveScope = scope === "live";
  const dates = liveScope ? [] : await fetchCalendarDates();
  const events = await collectEspnEvents(dates, liveScope);
  if (!events.length && !liveScope) throw new Error("ESPN returned nothing");
  const parsed = parseEspnEvents(events);

  // For completed knockout matches that finished level on regular time and where
  // the scoreboard didn't include shootoutScore, fetch the summary endpoint to
  // retrieve the penalty scores.  This prevents drawn KO matches from being
  // stored without a winner.
  const needsSummary = parsed.results.filter(
    r => r.stage !== "group" && !r.live && r.ga === r.gb && r.pa == null && r.eventId
  );
  if (needsSummary.length > 0) {
    const shootouts = await fetchShootoutScores(needsSummary.map(r => r.eventId));
    shootouts.forEach(({ id, pa, pb }) => {
      const r = parsed.results.find(x => x.eventId === id);
      if (r) { r.pa = pa; r.pb = pb; }
    });
  }

  return parsed;
}
