export const STATE_KEY  = "tc-work-cup:state:v3";
export const CONFIG_KEY = "tc-work-cup:config:v1";
export const THEME_KEY  = "tc-work-cup:theme:v1";
export const ME_KEY     = "tc-work-cup:me:v1";

export const TABS = [
  ["leaderboard","Leaderboard"],
  ["myteams","My Teams"],
  ["groups","Groups"],
  ["thirds","Best 3rds"],
  ["knockouts","Bracket"],
  ["circle","Circle"],
  ["h2h","Head-to-head"],
  ["prizes","Prizes"],
  ["drama","Drama"],
  ["stats","Stats"],
];

export const TAB_KEYS = new Set(TABS.map(([k]) => k));
export const DEFAULT_TAB = "leaderboard";

export const ESPN_URL      = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
export const ESPN_SUMMARY  = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";
export const ESPN_CALENDAR = "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/types/3/calendar/ondays";
