import { OWNERS, OWNER_OF } from '../data/owners.js';
import { GROUP_LETTERS, GROUP_OF, ALL_TEAMS } from '../data/tournament.js';
import { BASE_ODDS, strength } from '../data/odds.js';
import { FIXTURES } from '../data/fixtures.js';
import { computeStandings, groupDone } from './standings.js';
import { koWL } from './knockout.js';

export function confirmedState(s) {
  const gr = {};
  Object.entries(s.groupResults || {}).forEach(([k, v]) => {
    if (v.src !== "live") gr[k] = v;
  });
  const ko = (s.ko || []).filter(m => m.src !== "live");
  return { ...s, groupResults: gr, ko };
}

export function analyse(state) {
  const results = state.groupResults || {}, ko = state.ko || [], odds = state.odds || {};
  const standings = {}, complete = {}, rankOf = {};
  GROUP_LETTERS.forEach(L => {
    standings[L] = computeStandings(L, results);
    complete[L] = groupDone(L, results);
    standings[L].forEach(s => { rankOf[s.name] = s.rank; });
  });
  const allComplete = GROUP_LETTERS.every(L => complete[L]);

  // FIFA 2026: best 8 of 12 third-place teams advance to R32.
  // Tiebreakers: points → goal diff → goals scored → wins → strength (proxy for FIFA rank)
  const thirdsRanked = GROUP_LETTERS.map(L => ({ ...standings[L][2], group: L }));
  thirdsRanked.sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf ||
    b.w - a.w || strength(b.name) - strength(a.name)
  );
  let thirdAdv = new Set();
  if (allComplete) {
    thirdsRanked.slice(0, 8).forEach(t => thirdAdv.add(t.name));
  }

  const koLosers = new Set();
  const koStats = {};
  ALL_TEAMS.forEach(t => { koStats[t] = { p:0, w:0, d:0, l:0, gf:0, ga:0 }; });
  const clashes = [];
  const add = (stage, a, b, ga, gb, pens, live = false) =>
    clashes.push({ stage, a, b, ga, gb, pens, oa: OWNER_OF[a], ob: OWNER_OF[b], live });

  GROUP_LETTERS.forEach(L => FIXTURES[L].forEach(fx => {
    const r = results[fx.id];
    if (r && r.hs != null) add("Group " + L, fx.a, fx.b, r.hs, r.as, null, r.src === "live");
  }));
  ko.forEach(m => {
    if (m.hs == null || m.as == null) return;
    const SA = koStats[m.a], SB = koStats[m.b];
    if (SA && SB) {
      SA.p++; SB.p++; SA.gf += m.hs; SA.ga += m.as; SB.gf += m.as; SB.ga += m.hs;
      if (m.hs > m.as) { SA.w++; SB.l++; }
      else if (m.hs < m.as) { SB.w++; SA.l++; }
      else { SA.d++; SB.d++; }
    }
    const wl = koWL(m); if (wl) koLosers.add(wl.l);
    add(m.round, m.a, m.b, m.hs, m.as, (m.pa != null && m.pb != null) ? [m.pa, m.pb] : null, m.src === "live");
  });

  const teamOut = {};
  ALL_TEAMS.forEach(t => {
    if (koLosers.has(t)) { teamOut[t] = true; return; }
    const L = GROUP_OF[t];
    if (complete[L]) {
      const r = rankOf[t];
      if (r === 4) { teamOut[t] = true; return; }
      if (r === 3) { teamOut[t] = allComplete ? !thirdAdv.has(t) : false; return; }
    }
    teamOut[t] = false;
  });

  const groupStats = {};
  GROUP_LETTERS.forEach(L => standings[L].forEach(s => { groupStats[s.name] = s; }));
  const owner = {};
  OWNERS.forEach(o => { owner[o] = { owner:o, p:0, w:0, d:0, l:0, gf:0, ga:0, teams:[], teamsLeft:0 }; });
  ALL_TEAMS.forEach(t => {
    const o = OWNER_OF[t]; if (!o) return;
    const g = groupStats[t], k = koStats[t], O = owner[o];
    O.p += g.p + k.p; O.w += g.w + k.w; O.d += g.d + k.d; O.l += g.l + k.l;
    O.gf += g.gf + k.gf; O.ga += g.ga + k.ga;
    O.teams.push(t); if (!teamOut[t]) O.teamsLeft++;
  });
  OWNERS.forEach(o => {
    const O = owner[o]; O.gd = O.gf - O.ga; O.pts = O.w * 3 + O.d; O.out = O.teamsLeft === 0;
  });

  const finalMatch = ko.find(m => m.round === "Final" && m.hs != null && m.as != null);
  const champion = finalMatch ? ((koWL(finalMatch) || {}).w || null) : null;

  const teamForm = t => {
    const g = groupStats[t] || {}, k = koStats[t] || {};
    const gp = (g.p || 0) + (k.p || 0); if (!gp) return 1;
    const pts = (g.pts || 0) + ((k.w || 0) * 3 + (k.d || 0));
    const gd = (g.gd || 0) + ((k.gf || 0) - (k.ga || 0));
    return Math.max(0.3, Math.min(2.5, 0.5 + (pts / gp) / 3 + 0.08 * (gd / gp)));
  };
  const w = t => (1 / ((odds[t] ?? BASE_ODDS[t]) ?? 1500)) * teamForm(t);
  const inTotal = ALL_TEAMS.filter(t => !teamOut[t]).reduce((s, t) => s + w(t), 0) || 1;
  OWNERS.forEach(o => {
    owner[o].odds = champion
      ? (OWNER_OF[champion] === o ? 100 : 0)
      : owner[o].teams.filter(t => !teamOut[t]).reduce((s, t) => s + w(t), 0) / inTotal * 100;
  });
  const ownerRanked = [...OWNERS].map(o => owner[o])
    .sort((a, b) => (a.out ? 1 : 0) - (b.out ? 1 : 0) || b.odds - a.odds || b.pts - a.pts || b.gd - a.gd);

  const h2h = {};
  OWNERS.forEach(o => { h2h[o] = { owner:o, p:0, w:0, d:0, l:0, gf:0, ga:0 }; });
  clashes.forEach(c => {
    const A = h2h[c.oa], B = h2h[c.ob]; if (!A || !B) return;
    A.p++; B.p++; A.gf += c.ga; A.ga += c.gb; B.gf += c.gb; B.ga += c.ga;
    let r;
    if (c.ga > c.gb) r = "a"; else if (c.ga < c.gb) r = "b";
    else if (c.pens) r = c.pens[0] > c.pens[1] ? "a" : "b"; else r = "d";
    if (r === "a") { A.w++; B.l++; } else if (r === "b") { B.w++; A.l++; } else { A.d++; B.d++; }
  });
  OWNERS.forEach(o => { const H = h2h[o]; H.gd = H.gf - H.ga; H.pts = H.w * 3 + H.d; });
  const h2hRanked = [...OWNERS].map(o => h2h[o])
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.w - a.w);

  const scMap = new Map();
  (state.autoScorers || []).forEach(s => {
    if (OWNER_OF[s.t]) scMap.set(s.p + "|" + s.t, { p:s.p, t:s.t, g:s.g, src:"auto" });
  });
  (state.scorers || []).forEach(s => {
    if (OWNER_OF[s.t]) scMap.set(s.p + "|" + s.t, { p:s.p, t:s.t, g:s.g, src:"manual" });
  });
  const scorers = [...scMap.values()].sort((a, b) => b.g - a.g).slice(0, 15);

  const cs = {}; ALL_TEAMS.forEach(t => { cs[t] = 0; });
  GROUP_LETTERS.forEach(L => FIXTURES[L].forEach(fx => {
    const r = results[fx.id];
    if (r && r.hs != null) { if (r.as === 0) cs[fx.a]++; if (r.hs === 0) cs[fx.b]++; }
  }));
  ko.forEach(m => {
    if (m.hs != null && m.as != null) { if (m.as === 0) cs[m.a]++; if (m.hs === 0) cs[m.b]++; }
  });
  const keeperName = {};
  (state.keepers || []).forEach(k => { if (OWNER_OF[k.t]) keeperName[k.t] = k.p; });
  const cleanSheets = ALL_TEAMS
    .map(t => ({ t, owner: OWNER_OF[t], cs: cs[t], keeper: keeperName[t] || null }))
    .filter(x => x.cs > 0)
    .sort((a, b) => b.cs - a.cs || strength(b.t) - strength(a.t))
    .slice(0, 15);

  let goalsLeader = null, topGoals = -1;
  ALL_TEAMS.forEach(t => {
    if (!OWNER_OF[t]) return;
    const g = (groupStats[t]?.gf || 0) + (koStats[t]?.gf || 0);
    if (g > topGoals) { topGoals = g; goalsLeader = { team:t, goals:g, owner:OWNER_OF[t] }; }
    else if (g === topGoals && g > 0 && goalsLeader &&
      (strength(t) > strength(goalsLeader.team) ||
       (strength(t) === strength(goalsLeader.team) && t < goalsLeader.team))) {
      goalsLeader = { team:t, goals:g, owner:OWNER_OF[t] };
    }
  });

  const goalsBoard = ALL_TEAMS
    .filter(t => OWNER_OF[t])
    .map(t => ({ t, owner: OWNER_OF[t], goals: (groupStats[t]?.gf || 0) + (koStats[t]?.gf || 0) }))
    .filter(x => x.goals > 0)
    .sort((a, b) => b.goals - a.goals || strength(b.t) - strength(a.t));

  const firstOut = (state.history || []).filter(h => h.type === "player_out").sort((a, b) => a.ts - b.ts)[0] || null;

  const upsets = clashes
    .filter(c => !c.live)
    .map(c => {
      const winTeam = c.ga > c.gb ? c.a : c.ga < c.gb ? c.b : (c.pens ? (c.pens[0] > c.pens[1] ? c.a : c.b) : null);
      if (!winTeam) return null;
      const loseTeam = winTeam === c.a ? c.b : c.a;
      const winOdds = BASE_ODDS[winTeam] || 1500, loseOdds = BASE_ODDS[loseTeam] || 1500;
      if (loseOdds >= winOdds * 1.5) return null;
      return {
        stage: c.stage, winner: winTeam, loser: loseTeam,
        winOwner: OWNER_OF[winTeam] || null, loseOwner: OWNER_OF[loseTeam] || null,
        ga: c.ga, gb: c.gb, pens: c.pens, winOdds, loseOdds, ratio: winOdds / loseOdds,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.ratio - a.ratio);

  const drawLuck = OWNERS.map(o => {
    const teams = owner[o].teams;
    const ownerStr = teams.reduce((s, t) => s + strength(t), 0);
    return { owner: o, strength: ownerStr, teams };
  }).sort((a, b) => b.strength - a.strength);

  const groupWinners = GROUP_LETTERS
    .filter(L => complete[L])
    .map(L => {
      const s = standings[L][0];
      return s && OWNER_OF[s.name]
        ? { team: s.name, owner: OWNER_OF[s.name], L, pts: s.pts, gf: s.gf, gd: s.gd }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const groupAwards = { groupWinners };

  const penMap = {};
  OWNERS.forEach(o => { penMap[o] = { owner:o, pw:0, pl:0 }; });
  clashes.forEach(c => {
    if (!c.pens || c.live) return;
    const [pa, pb] = c.pens; if (pa === pb) return;
    const penWin = pa > pb ? c.oa : c.ob, penLose = pa > pb ? c.ob : c.oa;
    if (penMap[penWin]) penMap[penWin].pw++;
    if (penMap[penLose]) penMap[penLose].pl++;
  });
  const penaltyBoard = OWNERS.map(o => penMap[o]).filter(o => o.pw + o.pl > 0).sort((a, b) => b.pw - a.pw || a.pl - b.pl);

  return {
    standings, complete, allComplete, teamOut, thirdsRanked, thirdAdv, owner, ownerRanked, champion, h2hRanked,
    clashes: clashes.slice().reverse(), scorers, cleanSheets,
    bootLeader: scorers[0] || null, gloveLeader: cleanSheets[0] || null,
    goalsLeader: topGoals > 0 ? goalsLeader : null, goalsBoard,
    firstOut, upsets, drawLuck, groupAwards, penaltyBoard,
  };
}
