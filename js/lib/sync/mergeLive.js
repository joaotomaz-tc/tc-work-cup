import { OWNERS, OWNER_OF } from '../../data/owners.js';
import { ALL_TEAMS } from '../../data/tournament.js';
import { FIXTURE_INDEX } from '../../data/fixtures.js';
import { analyse } from '../scoring.js';
import { aggregateScorerEvents, mergeScorerEvents } from './scorers.js';

export function mergeLive(prev, p) {
  const next = { ...prev };
  const gr = { ...prev.groupResults };
  const ko = [...prev.ko];

  (p.results || []).forEach(m => {
    const src = m.live ? "live" : "auto";
    if (m.stage === "group") {
      const hit = FIXTURE_INDEX[[m.a, m.b].sort().join("|")]; if (!hit) return;
      const cur = gr[hit.fx.id]; if (cur && cur.src === "manual") return;
      const fwd = hit.fx.a === m.a;
      gr[hit.fx.id] = { hs: fwd ? m.ga : m.gb, as: fwd ? m.gb : m.ga, src };
    } else {
      const round = m.stage; const key = [m.a, m.b].sort().join("|");
      const i = ko.findIndex(x => x.round === round && [x.a, x.b].sort().join("|") === key);
      if (i >= 0 && ko[i].src === "manual") return;
      const A = i < 0 ? m.a : ko[i].a; const fwd = A === m.a;
      const rec = {
        id: i < 0 ? `ko-${round}-${key}` : ko[i].id, round,
        a: A, b: i < 0 ? m.b : ko[i].b,
        hs: fwd ? m.ga : m.gb, as: fwd ? m.gb : m.ga,
        pa: m.pa == null ? null : (fwd ? m.pa : m.pb),
        pb: m.pb == null ? null : (fwd ? m.pb : m.pa),
        src,
      };
      if (i < 0) ko.push(rec); else ko[i] = rec;
    }
  });

  const matchDates = { ...(prev.matchDates || {}) };
  (p.results || []).forEach(m => {
    if (m.date && !m.live) {
      if (!matchDates[m.a] || m.date > matchDates[m.a]) matchDates[m.a] = m.date;
      if (!matchDates[m.b] || m.date > matchDates[m.b]) matchDates[m.b] = m.date;
    }
  });

  const prevA = analyse(prev);
  const nextTemp = { ...prev, groupResults: gr, ko, matchDates };
  const nextA = analyse(nextTemp);
  const history = [...(prev.history || [])];
  const histKeys = new Set(history.map(h => h.key));
  const now = Date.now(); const nowIso = new Date(now).toISOString();

  ALL_TEAMS.forEach(t => {
    if (!OWNER_OF[t]) return;
    if (nextA.teamOut[t] && !prevA.teamOut[t]) {
      const key = `team_out:${t}`;
      if (!histKeys.has(key)) {
        history.push({ key, ts: now, at: matchDates[t] || nowIso, type: "team_out", team: t, owner: OWNER_OF[t] });
        histKeys.add(key);
      }
    }
  });
  OWNERS.forEach(o => {
    if (nextA.owner[o].out && !prevA.owner[o].out) {
      const key = `player_out:${o}`;
      if (!histKeys.has(key)) {
        const teamDates = nextA.owner[o].teams.map(t => matchDates[t]).filter(Boolean);
        const at = teamDates.length ? teamDates.sort().reverse()[0] : nowIso;
        history.push({ key, ts: now, at, type: "player_out", owner: o });
        histKeys.add(key);
      }
    }
  });
  if (nextA.champion && !prevA.champion) {
    const key = `champion:${nextA.champion}`;
    if (!histKeys.has(key)) {
      history.push({ key, ts: now, at: matchDates[nextA.champion] || nowIso, type: "champion", team: nextA.champion, owner: OWNER_OF[nextA.champion] });
      histKeys.add(key);
    }
  }

  const fixtureSchedules = { ...(prev.fixtureSchedules || {}) };
  (p.fixtureSchedules || []).forEach(({ id, start }) => { fixtureSchedules[id] = start; });

  const filteredByEvent = {};
  Object.entries(p.scorersByEvent || {}).forEach(([eventId, list]) => {
    filteredByEvent[eventId] = (list || []).filter(s => OWNER_OF[s.t]);
  });
  next.scorerEvents = mergeScorerEvents(prev.scorerEvents, filteredByEvent);
  const autoScorers = aggregateScorerEvents(next.scorerEvents)
    .filter(s => OWNER_OF[s.t])
    .slice(0, 20);
  // Legacy persisted state may lack scorerEvents until the next full sync rebuilds them.
  next.autoScorers = Object.keys(next.scorerEvents).length || !prev.autoScorers?.length
    ? autoScorers
    : prev.autoScorers;

  next.groupResults = gr; next.ko = ko; next.matchDates = matchDates;
  next.history = history; next.fixtureSchedules = fixtureSchedules;
  next.liveMatches = p.liveMatches || []; next.liveCount = p.liveCount || 0;
  next.nextScheduled = p.nextScheduled ?? null;
  next.lastSync = new Date().toISOString(); next.syncError = null;
  return next;
}
