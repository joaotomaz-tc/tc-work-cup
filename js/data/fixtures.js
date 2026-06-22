import { GROUPS, GROUP_LETTERS } from './tournament.js';

function groupFixtures(L) {
  const t = GROUPS[L];
  const pairs = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
  const matchdays = [1,1,2,2,3,3];
  return pairs.map((p, k) => ({
    id: `${L}-${p[0]}${p[1]}`,
    md: matchdays[k],
    a: t[p[0]],
    b: t[p[1]],
  }));
}

export const FIXTURES = {};
GROUP_LETTERS.forEach(L => { FIXTURES[L] = groupFixtures(L); });

export const FIXTURE_INDEX = {};
GROUP_LETTERS.forEach(L => {
  FIXTURES[L].forEach(fx => {
    FIXTURE_INDEX[[fx.a, fx.b].sort().join("|")] = { L, fx };
  });
});
