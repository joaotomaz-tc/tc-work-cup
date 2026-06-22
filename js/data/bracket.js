export const KO_ORDER = ["Round of 32","Round of 16","Quarter-final","Semi-final","Third place","Final"];
export const KO_CODE = {
  r32:"Round of 32", r16:"Round of 16", qf:"Quarter-final",
  sf:"Semi-final", "3p":"Third place", final:"Final",
};

// 2026 FIFA World Cup bracket structure (fixed by regulations)
// Slot types: W=group winner, RU=runner-up, 3rd=best third
// `from` = candidate groups per FIFA Annex C
export const R32_SLOTS = [
  // top half
  {id:"m74", a:{type:"W",g:"E"},  b:{type:"3rd",from:"A/B/C/D/F"}},
  {id:"m77", a:{type:"W",g:"I"},  b:{type:"3rd",from:"C/D/F/G/H"}},
  {id:"m73", a:{type:"RU",g:"A"}, b:{type:"RU",g:"B"}},
  {id:"m75", a:{type:"W",g:"F"},  b:{type:"RU",g:"C"}},
  {id:"m76", a:{type:"W",g:"C"},  b:{type:"RU",g:"F"}},
  {id:"m78", a:{type:"RU",g:"E"}, b:{type:"RU",g:"I"}},
  {id:"m79", a:{type:"W",g:"A"},  b:{type:"3rd",from:"C/E/F/H/I"}},
  {id:"m80", a:{type:"W",g:"L"},  b:{type:"3rd",from:"E/H/I/J/K"}},
  // bottom half
  {id:"m83", a:{type:"RU",g:"K"}, b:{type:"RU",g:"L"}},
  {id:"m84", a:{type:"W",g:"H"},  b:{type:"RU",g:"J"}},
  {id:"m81", a:{type:"W",g:"D"},  b:{type:"3rd",from:"B/E/F/I/J"}},
  {id:"m82", a:{type:"W",g:"G"},  b:{type:"3rd",from:"A/E/H/I/J"}},
  {id:"m86", a:{type:"W",g:"J"},  b:{type:"RU",g:"H"}},
  {id:"m88", a:{type:"RU",g:"D"}, b:{type:"RU",g:"G"}},
  {id:"m85", a:{type:"W",g:"B"},  b:{type:"3rd",from:"E/F/G/I/J"}},
  {id:"m87", a:{type:"W",g:"K"},  b:{type:"3rd",from:"D/E/I/J/L"}},
];

export const R32_BY_ID = Object.fromEntries(R32_SLOTS.map(s => [s.id, s]));

export const BRACKET_TREE = {
  r16: [
    {id:"m89",a:"m74",b:"m77"}, {id:"m90",a:"m73",b:"m75"},
    {id:"m91",a:"m76",b:"m78"}, {id:"m92",a:"m79",b:"m80"},
    {id:"m93",a:"m83",b:"m84"}, {id:"m94",a:"m81",b:"m82"},
    {id:"m95",a:"m86",b:"m88"}, {id:"m96",a:"m85",b:"m87"},
  ],
  qf: [
    {id:"m97", a:"m89",b:"m90"}, {id:"m98", a:"m93",b:"m94"},
    {id:"m99", a:"m91",b:"m92"}, {id:"m100",a:"m95",b:"m96"},
  ],
  sf:    [{id:"m101",a:"m97",b:"m98"}, {id:"m102",a:"m99",b:"m100"}],
  final: [{id:"m104",a:"m101",b:"m102"}],
  third: [{id:"m103",a:"m101",b:"m102",losers:true}],
};

export const ALL_BRACKET = [
  ...R32_SLOTS.map(s => ({...s, round:"Round of 32"})),
  ...BRACKET_TREE.r16.map(s => ({...s, round:"Round of 16"})),
  ...BRACKET_TREE.qf.map(s => ({...s, round:"Quarter-final"})),
  ...BRACKET_TREE.sf.map(s => ({...s, round:"Semi-final"})),
  ...BRACKET_TREE.final.map(s => ({...s, round:"Final"})),
  ...BRACKET_TREE.third.map(s => ({...s, round:"Third place"})),
];

// Colors for 1st (gold), 2nd (blue), 3rd (orange)
export const FEED_COLORS = ["#eab308", "#38bdf8", "#f97316"];
