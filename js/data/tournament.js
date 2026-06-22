export const GROUPS = {
  A:["Mexico","South Korea","South Africa","Czechia"],
  B:["Canada","Switzerland","Qatar","Bosnia & Herzegovina"],
  C:["Brazil","Morocco","Scotland","Haiti"],
  D:["United States","Australia","Paraguay","Turkey"],
  E:["Germany","Ecuador","Ivory Coast","Curaçao"],
  F:["Netherlands","Japan","Tunisia","Sweden"],
  G:["Belgium","Iran","Egypt","New Zealand"],
  H:["Spain","Uruguay","Saudi Arabia","Cape Verde"],
  I:["France","Senegal","Norway","Iraq"],
  J:["Argentina","Austria","Algeria","Jordan"],
  K:["Portugal","Colombia","Uzbekistan","DR Congo"],
  L:["England","Croatia","Panama","Ghana"],
};

export const GROUP_LETTERS = Object.keys(GROUPS);

export const GROUP_OF = {};
GROUP_LETTERS.forEach(L => GROUPS[L].forEach(t => { GROUP_OF[t] = L; }));

export const ALL_TEAMS = [...new Set(GROUP_LETTERS.flatMap(L => GROUPS[L]))].sort();
