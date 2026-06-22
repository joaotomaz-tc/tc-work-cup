import { GROUPS } from '../data/tournament.js';
import { FIXTURES } from '../data/fixtures.js';
import { strength } from '../data/odds.js';

export function computeStandings(L, results) {
  const teams = GROUPS[L];
  const idx = Object.fromEntries(teams.map((t, k) => [t, k]));
  const st = teams.map(name => ({ name, p:0, w:0, d:0, l:0, gf:0, ga:0 }));
  FIXTURES[L].forEach(fx => {
    const r = results[fx.id];
    if (!r || r.hs == null || r.as == null) return;
    const A = st[idx[fx.a]], B = st[idx[fx.b]];
    A.p++; B.p++; A.gf += r.hs; A.ga += r.as; B.gf += r.as; B.ga += r.hs;
    if (r.hs > r.as) { A.w++; B.l++; }
    else if (r.hs < r.as) { B.w++; A.l++; }
    else { A.d++; B.d++; }
  });
  st.forEach(x => { x.pts = x.w * 3 + x.d; x.gd = x.gf - x.ga; });
  st.sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf ||
    strength(b.name) - strength(a.name) || a.name.localeCompare(b.name)
  );
  st.forEach((x, k) => { x.rank = k + 1; });
  return st;
}

export const groupDone = (L, r) =>
  FIXTURES[L].every(fx => r[fx.id] && r[fx.id].hs != null);

export const groupDoneConfirmed = (L, r) =>
  FIXTURES[L].every(fx => r[fx.id] && r[fx.id].hs != null && r[fx.id].src !== "live");
