export const STATE_KEY  = "tc-work-cup:state:v3";
export const CONFIG_KEY = "tc-work-cup:config:v1";
export const THEME_KEY  = "tc-work-cup:theme:v1";
export const ME_KEY     = "tc-work-cup:me:v1";

/** Top-level nav. Sections with `children` show a sub-tab row when active. */
export const TAB_NAV = [
  { key: "leaderboard", label: "Leaderboard" },
  { key: "myteams", label: "My Teams" },
  {
    key: "knockout-section",
    label: "Knockout",
    children: [
      ["knockouts", "Bracket"],
      ["circle", "Circle"],
    ],
  },
  {
    key: "groups-section",
    label: "Groups",
    children: [
      ["groups", "Groups"],
      ["thirds", "Best 3"],
    ],
  },
  {
    key: "extras-section",
    label: "Extras",
    children: [
      ["h2h", "Head-to-Head"],
      ["prizes", "Prizes"],
      ["drama", "Drama"],
      ["stats", "Stats"],
    ],
  },
];

export const TAB_KEYS = new Set(
  TAB_NAV.flatMap(s => s.children ? s.children.map(([k]) => k) : [s.key]),
);
export const DEFAULT_TAB = "leaderboard";

export const ESPN_URL      = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
export const ESPN_SUMMARY  = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";
export const ESPN_CALENDAR = "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/types/3/calendar/ondays";
