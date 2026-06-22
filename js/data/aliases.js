import { ALL_TEAMS } from './tournament.js';

export const ALIAS = {
  "türkiye":"Turkey","turkiye":"Turkey","turkey":"Turkey",
  "czech republic":"Czechia","czechia":"Czechia",
  "korea republic":"South Korea","south korea":"South Korea",
  "republic of korea":"South Korea","korea, republic of":"South Korea",
  "usa":"United States","united states":"United States",
  "united states of america":"United States",
  "côte d'ivoire":"Ivory Coast","cote d'ivoire":"Ivory Coast","ivory coast":"Ivory Coast",
  "curacao":"Curaçao","curaçao":"Curaçao",
  "cabo verde":"Cape Verde","cape verde":"Cape Verde","cape verde islands":"Cape Verde",
  "dr congo":"DR Congo","congo dr":"DR Congo",
  "democratic republic of the congo":"DR Congo","congo democratic republic":"DR Congo",
  "bosnia":"Bosnia & Herzegovina","bosnia and herzegovina":"Bosnia & Herzegovina",
  "bosnia & herzegovina":"Bosnia & Herzegovina","bosnia-herzegovina":"Bosnia & Herzegovina",
  "ir iran":"Iran","iran":"Iran","saudi arabia":"Saudi Arabia",
};

export function normTeam(n) {
  if (!n) return null;
  const k = String(n).trim().toLowerCase();
  if (ALIAS[k]) return ALIAS[k];
  const hit = ALL_TEAMS.find(t => t.toLowerCase() === k);
  return hit || n;
}
