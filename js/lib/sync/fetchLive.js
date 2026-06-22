import { OWNER_OF } from '../../data/owners.js';
import { GROUPS } from '../../data/tournament.js';
import { KO_ORDER } from '../../data/bracket.js';
import { FIXTURE_INDEX } from '../../data/fixtures.js';
import { normTeam } from '../../data/aliases.js';
import { fetchESPN } from './espn.js';

const TODAY_STR = new Date().toDateString();

async function aiSearchJSON(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const s = text.indexOf("["), e = text.lastIndexOf("]");
  if (s < 0 || e < 0) return [];
  try { const arr = JSON.parse(text.slice(s, e + 1)); return Array.isArray(arr) ? arr : []; } catch (_) { return []; }
}

function groupPrompt(letters) {
  const lines = letters.map(L => `Group ${L} (${GROUPS[L].join(", ")})`).join(" and ");
  return `Use web search to find FINISHED match results so far at the 2026 FIFA World Cup for ${lines}. Today is ${TODAY_STR}. Return ONLY a JSON array, no prose or markdown: [{"a":"Team","b":"Team","ga":0,"gb":0}]. Include only matches already completed (full time). Use exactly these team names. If none have finished, return [].`;
}

const KO_PROMPT = `Use web search to find FINISHED knockout-stage results at the 2026 FIFA World Cup (Round of 32 onward). Today is ${TODAY_STR}. Return ONLY a JSON array, no prose: [{"round":"Round of 32|Round of 16|Quarter-final|Semi-final|Third place|Final","a":"Team","b":"Team","ga":0,"gb":0,"pa":null,"pb":null}]. Only completed matches; pa/pb are penalty-shootout scores or null. Use exact country names. If none yet, return [].`;
const SCORERS_PROMPT = `Use web search to find the current TOP GOALSCORERS at the 2026 FIFA World Cup. Today is ${TODAY_STR}. Return ONLY a JSON array, top 10 highest first, no prose: [{"p":"Player full name","t":"Team","g":0}]. Use exact country names. If unclear this early, return [].`;

async function fetchSearch() {
  const groupBatches = [["A","B","C"],["D","E","F"],["G","H","I"],["J","K","L"]];
  const jobs = [
    ...groupBatches.map(g => ({ type:"group", prompt:groupPrompt(g) })),
    { type:"ko", prompt:KO_PROMPT },
    { type:"sc", prompt:SCORERS_PROMPT },
  ];
  const settled = await Promise.allSettled(jobs.map(j => aiSearchJSON(j.prompt)));
  if (!settled.some(s => s.status === "fulfilled")) throw new Error("search unavailable");
  const results = [], scorers = [];
  settled.forEach((s, i) => {
    if (s.status !== "fulfilled") return;
    const arr = Array.isArray(s.value) ? s.value : []; const type = jobs[i].type;
    if (type === "group") arr.forEach(m => {
      const a = normTeam(m.a), b = normTeam(m.b);
      if (OWNER_OF[a] && OWNER_OF[b] && FIXTURE_INDEX[[a,b].sort().join("|")] && m.ga != null && m.gb != null && Number.isFinite(+m.ga) && Number.isFinite(+m.gb))
        results.push({ stage:"group", a, b, ga:+m.ga, gb:+m.gb, pa:null, pb:null });
    });
    else if (type === "ko") arr.forEach(m => {
      const a = normTeam(m.a), b = normTeam(m.b);
      const round = KO_ORDER.includes(m.round) ? m.round : null;
      if (round && OWNER_OF[a] && OWNER_OF[b] && m.ga != null && m.gb != null && Number.isFinite(+m.ga) && Number.isFinite(+m.gb))
        results.push({ stage:round, a, b, ga:+m.ga, gb:+m.gb, pa:m.pa==null?null:+m.pa, pb:m.pb==null?null:+m.pb });
    });
    else arr.forEach(x => {
      const t = normTeam(x.t);
      if (OWNER_OF[t] && x.p && x.g != null && Number.isFinite(+x.g))
        scorers.push({ p: String(x.p), t, g: +x.g });
    });
  });
  return { results, scorers: scorers.sort((a, b) => b.g - a.g).slice(0, 15), nextScheduled: null, fixtureSchedules: [] };
}

export async function fetchLive(opts) {
  try { return await fetchESPN(opts); }
  catch (eE) {
    try { return await fetchSearch(); }
    catch (eS) { throw new Error(`sync failed — ${eE.message}`); }
  }
}
