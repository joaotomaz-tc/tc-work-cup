import { GROUP_LETTERS } from '../data/tournament.js';
import { GROUP_OF } from '../data/tournament.js';
import { R32_SLOTS, BRACKET_TREE, ALL_BRACKET } from '../data/bracket.js';
import { ANNEX_C_WINNERS, ANNEX_C_ROWS } from '../data/annex_c.js';
import { strength } from '../data/odds.js';

// Precompute group-winner-letter → R32 slot id (for Annex C lookup)
const WINNER_SLOT = {};
R32_SLOTS.forEach(s => { if (s.a.type === "W") WINNER_SLOT[s.a.g] = s.id; });

export function koWL(m) {
  if (m.hs == null || m.as == null) return null;
  if (m.hs > m.as) return { w: m.a, l: m.b };
  if (m.hs < m.as) return { w: m.b, l: m.a };
  if (m.pa != null && m.pb != null && m.pa !== m.pb)
    return m.pa > m.pb ? { w: m.a, l: m.b } : { w: m.b, l: m.a };
  return null;
}

// Assign best 8 third-place teams to R32 slots using the official FIFA
// Annex C lookup table. Falls back to the greedy heuristic when fewer
// than 8 third-place teams are known (i.e. group stage still in progress).
export function assign3rdSlots(standings) {
  const thirds = GROUP_LETTERS
    .map(L => standings[L] && standings[L][2])
    .filter(Boolean)
    .sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf ||
      strength(b.name) - strength(a.name)
    )
    .slice(0, 8);

  // Once all 8 qualifying 3rd-place teams are known, use the official Annex C table.
  if (thirds.length === 8) {
    const combo = thirds.map(t => GROUP_OF[t.name]).sort().join("");
    const row = ANNEX_C_ROWS.find(r => [...r].sort().join("") === combo);
    if (row) {
      const result = {};
      ANNEX_C_WINNERS.forEach((winnerGroup, i) => {
        const thirdGroup = row[i];
        const third = thirds.find(t => GROUP_OF[t.name] === thirdGroup);
        const slotId = WINNER_SLOT[winnerGroup];
        if (third && slotId) result[slotId] = third.name;
      });
      return result;
    }
  }

  // Fallback: greedy assignment used during an incomplete group stage.
  const used = new Set();
  const result = {};
  for (const slot of R32_SLOTS.filter(s => s.b.type === "3rd")) {
    const cands = slot.b.from.split("/");
    const match = thirds.find(t => !used.has(t.name) && cands.includes(GROUP_OF[t.name]));
    if (match) { result[slot.id] = match.name; used.add(match.name); }
  }
  return result;
}

export function resolveGroupSlot({ type, g }, standings) {
  if (!standings[g]) return null;
  if (type === "W")  return standings[g][0]?.name || null;
  if (type === "RU") return standings[g][1]?.name || null;
  return null;
}

export function buildBracketTeams(standings, ko) {
  const third3rd = assign3rdSlots(standings);
  const teams = {};
  R32_SLOTS.forEach(slot => {
    teams[slot.id] = {
      a: resolveGroupSlot(slot.a, standings),
      b: slot.b.type === "3rd"
        ? (third3rd[slot.id] || null)
        : resolveGroupSlot(slot.b, standings),
    };
  });
  const koWinnerOf = {};
  ko.forEach(m => {
    if (m.hs == null || m.as == null) return;
    const wl = koWL(m); if (!wl) return;
    ALL_BRACKET.forEach(slot => {
      if (!slot.a || !slot.b) return;
      const ta = teams[slot.id]?.a, tb = teams[slot.id]?.b;
      if (!ta || !tb) return;
      const key = [m.a, m.b].sort().join("|");
      if ([ta, tb].sort().join("|") === key) koWinnerOf[slot.id] = wl.w;
    });
  });
  [...BRACKET_TREE.r16, ...BRACKET_TREE.qf, ...BRACKET_TREE.sf, ...BRACKET_TREE.final].forEach(node => {
    teams[node.id] = {
      a: koWinnerOf[node.a] || null,
      b: koWinnerOf[node.b] || null,
    };
    const wl = findKoResult(node.id, node, teams, ko);
    if (wl) koWinnerOf[node.id] = wl.w;
  });
  const sf1Loser = findKoLoser("m101", teams, ko);
  const sf2Loser = findKoLoser("m102", teams, ko);
  teams["m103"] = { a: sf1Loser || null, b: sf2Loser || null };
  return teams;
}

export function findKoResult(id, node, teams, ko) {
  const ta = teams[id]?.a, tb = teams[id]?.b;
  if (!ta || !tb) return null;
  const key = [ta, tb].sort().join("|");
  const m = ko.find(m => m.hs != null && [m.a, m.b].sort().join("|") === key);
  return m ? koWL(m) : null;
}

export function findKoLoser(sfId, teams, ko) {
  const ta = teams[sfId]?.a, tb = teams[sfId]?.b;
  if (!ta || !tb) return null;
  const m = ko.find(m => m.hs != null && [m.a, m.b].sort().join("|") === [ta, tb].sort().join("|"));
  if (!m) return null;
  const wl = koWL(m); return wl ? wl.l : null;
}

export function getKoResult(ta, tb, ko) {
  if (!ta || !tb) return null;
  const key = [ta, tb].sort().join("|");
  return ko.find(m => m.hs != null && [m.a, m.b].sort().join("|") === key) || null;
}

export function slotLabel({ type, g }) {
  if (type === "W")   return `W ${g}`;
  if (type === "RU")  return `2nd ${g}`;
  if (type === "3rd") return "Best 3rd";
  return "?";
}
