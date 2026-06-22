const { useState, useEffect, useMemo, useRef } = React;

/* ============================================================
   TC WORK CUP 2026 — OFFICE SWEEPSTAKE TRACKER
   • Live sync via ESPN calendar + scoreboard (1s when in play)
   • Trophy odds from real bookmaker prices, re-normalised live
   • True player-vs-player head-to-head
   • Golden Boot (scorers) + Golden Glove (clean sheets, derived)
   • Prizes / My Teams / Drama / Stats tabs
   • Shared storage => one URL for the whole team
   ============================================================ */

const OWNERS = ["Megan","Vicki","Matt","Miles","Graeme","Joao","Natalia","Rebecca","Mike","Alastair","Parvathi","Alejandro","Kamela","Kat"];
const OWNER_COLOR = {
  Megan:"#F5AFC8", Vicki:"#7EC8E3", Matt:"#88D4B4", Miles:"#FF9E85", Graeme:"#A89AE8",
  Joao:"#FFC978", Natalia:"#F08BAE", Rebecca:"#7AAEE8", Mike:"#C498DC", Alastair:"#8FC9A0",
  Parvathi:"#E094D8", Alejandro:"#5ECADB", Kamela:"#AAD68A", Kat:"#8494E8",
};
const OWNER_OF = {
  "Uzbekistan":"Megan","Turkey":"Megan","Colombia":"Megan",
  "South Africa":"Vicki","Jordan":"Vicki","Egypt":"Vicki",
  "Sweden":"Matt","Scotland":"Matt","Switzerland":"Matt",
  "United States":"Miles","Germany":"Miles","France":"Miles",
  "Morocco":"Graeme","Belgium":"Graeme","Japan":"Graeme",
  "Croatia":"Joao","Saudi Arabia":"Joao","Argentina":"Joao",
  "DR Congo":"Natalia","Uruguay":"Natalia","Brazil":"Natalia",
  "England":"Rebecca","Portugal":"Rebecca","Iran":"Rebecca",
  "Curaçao":"Mike","Haiti":"Mike","Bosnia & Herzegovina":"Mike",
  "Spain":"Alastair","Panama":"Alastair","Senegal":"Alastair",
  "Austria":"Parvathi","Netherlands":"Parvathi","New Zealand":"Parvathi",
  "Cape Verde":"Alejandro","Ivory Coast":"Alejandro","Mexico":"Alejandro",
  "Canada":"Kamela","South Korea":"Kamela","Australia":"Kamela",
  "Paraguay":"Kat","Algeria":"Kat","Tunisia":"Kat",
};
const GROUPS = {
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
const GROUP_LETTERS = Object.keys(GROUPS);
const GROUP_OF = {}; GROUP_LETTERS.forEach(L=>GROUPS[L].forEach(t=>GROUP_OF[t]=L));
const ALL_TEAMS = [...new Set(GROUP_LETTERS.flatMap(L => GROUPS[L]))].sort();

const BASE_ODDS = {
  "Spain":6,"France":6,"England":7,"Argentina":9,"Portugal":10,"Brazil":13,"Germany":15,
  "Netherlands":21,"Norway":26,"Belgium":34,"Croatia":41,"Uruguay":41,"Morocco":41,"United States":41,
  "Colombia":51,"Mexico":51,"Senegal":51,"Switzerland":67,"Japan":67,"Sweden":67,
  "Ecuador":81,"Austria":81,"Turkey":81,"Canada":81,"Ivory Coast":101,"Egypt":126,
  "South Korea":151,"Australia":151,"Czechia":151,"Scotland":201,"Algeria":201,"Ghana":201,
  "Qatar":251,"Tunisia":251,"Iran":251,"Paraguay":251,"Bosnia & Herzegovina":251,"DR Congo":251,
  "Saudi Arabia":501,"Uzbekistan":501,"South Africa":501,"Jordan":751,"Iraq":751,"Panama":751,
  "Cape Verde":751,"New Zealand":1001,"Haiti":1001,"Curaçao":1001,
};
const strength = t => 1/(BASE_ODDS[t] ?? 1500);

const KO_ORDER = ["Round of 32","Round of 16","Quarter-final","Semi-final","Third place","Final"];
const KO_CODE = { r32:"Round of 32", r16:"Round of 16", qf:"Quarter-final", sf:"Semi-final", "3p":"Third place", final:"Final" };

const ALIAS = {
  "türkiye":"Turkey","turkiye":"Turkey","turkey":"Turkey","czech republic":"Czechia","czechia":"Czechia",
  "korea republic":"South Korea","south korea":"South Korea","republic of korea":"South Korea","korea, republic of":"South Korea",
  "usa":"United States","united states":"United States","united states of america":"United States",
  "côte d'ivoire":"Ivory Coast","cote d'ivoire":"Ivory Coast","ivory coast":"Ivory Coast",
  "curacao":"Curaçao","curaçao":"Curaçao","cabo verde":"Cape Verde","cape verde":"Cape Verde","cape verde islands":"Cape Verde",
  "dr congo":"DR Congo","congo dr":"DR Congo","democratic republic of the congo":"DR Congo","congo democratic republic":"DR Congo",
  "bosnia":"Bosnia & Herzegovina","bosnia and herzegovina":"Bosnia & Herzegovina","bosnia & herzegovina":"Bosnia & Herzegovina","bosnia-herzegovina":"Bosnia & Herzegovina",
  "ir iran":"Iran","iran":"Iran","saudi arabia":"Saudi Arabia",
};
function normTeam(n){ if(!n) return null; const k=String(n).trim().toLowerCase();
  if(ALIAS[k]) return ALIAS[k]; const hit=ALL_TEAMS.find(t=>t.toLowerCase()===k); return hit||n; }

function groupFixtures(L){ const t=GROUPS[L]; const pr=[[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]]; const md=[1,1,2,2,3,3];
  return pr.map((p,k)=>({id:`${L}-${p[0]}${p[1]}`,md:md[k],a:t[p[0]],b:t[p[1]]})); }
const FIXTURES={}; GROUP_LETTERS.forEach(L=>FIXTURES[L]=groupFixtures(L));
const FIXTURE_INDEX={}; GROUP_LETTERS.forEach(L=>FIXTURES[L].forEach(fx=>FIXTURE_INDEX[[fx.a,fx.b].sort().join("|")]={L,fx}));

function computeStandings(L,results){
  const teams=GROUPS[L]; const idx=Object.fromEntries(teams.map((t,k)=>[t,k]));
  const st=teams.map(name=>({name,p:0,w:0,d:0,l:0,gf:0,ga:0}));
  FIXTURES[L].forEach(fx=>{const r=results[fx.id]; if(!r||r.hs==null||r.as==null)return;
    const A=st[idx[fx.a]],B=st[idx[fx.b]]; A.p++;B.p++;A.gf+=r.hs;A.ga+=r.as;B.gf+=r.as;B.ga+=r.hs;
    if(r.hs>r.as){A.w++;B.l++;}else if(r.hs<r.as){B.w++;A.l++;}else{A.d++;B.d++;}});
  st.forEach(x=>{x.pts=x.w*3+x.d;x.gd=x.gf-x.ga;});
  st.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||strength(b.name)-strength(a.name)||a.name.localeCompare(b.name));
  st.forEach((x,k)=>x.rank=k+1); return st;
}
const groupDone=(L,r)=>FIXTURES[L].every(fx=>r[fx.id]&&r[fx.id].hs!=null);
const groupDoneConfirmed=(L,r)=>FIXTURES[L].every(fx=>r[fx.id]&&r[fx.id].hs!=null&&r[fx.id].src!=="live");
function confirmedState(s){
  const gr={}; Object.entries(s.groupResults||{}).forEach(([k,v])=>{ if(v.src!=="live") gr[k]=v; });
  const ko=(s.ko||[]).filter(m=>m.src!=="live");
  return {...s,groupResults:gr,ko};
}
function koWL(m){ if(m.hs==null||m.as==null)return null; if(m.hs>m.as)return{w:m.a,l:m.b}; if(m.hs<m.as)return{w:m.b,l:m.a};
  if(m.pa!=null&&m.pb!=null&&m.pa!==m.pb)return m.pa>m.pb?{w:m.a,l:m.b}:{w:m.b,l:m.a}; return null; }

/* storage */
const STATE_KEY="tc-work-cup:state:v1", CONFIG_KEY="tc-work-cup:config:v1";
const THEME_KEY="tc-work-cup:theme:v1";
const ME_KEY="tc-work-cup:me:v1";
function readThemePref(){ try{const v=localStorage.getItem(THEME_KEY); return v==="light"||v==="dark"||v==="system"?v:"system";}catch(e){return "system";} }
function resolveTheme(pref){ if(pref==="light")return "light"; if(pref==="dark")return "dark"; return window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"; }
function applyTheme(pref){
  const resolved=resolveTheme(pref);
  document.documentElement.setAttribute("data-theme",resolved);
  document.documentElement.setAttribute("data-theme-pref",pref);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content=resolved==="dark"?"#121214":"#F5F5F7";
}
function readMe(){ try{const v=localStorage.getItem(ME_KEY); return OWNERS.includes(v)?v:"";}catch(e){return "";} }

const SEED_RESULTS={ "A-02":{hs:2,as:0,src:"auto"},"A-13":{hs:2,as:1,src:"auto"},
  "B-03":{hs:1,as:1,src:"auto"},"B-12":{hs:1,as:1,src:"auto"},"E-03":{hs:7,as:1,src:"auto"},"F-01":{hs:2,as:2,src:"auto"} };
const DEFAULT_STATE={ groupResults:SEED_RESULTS, ko:[], awards:{champion:null},
  scorers:[], keepers:[], autoScorers:[], odds:{}, liveMatches:[], liveCount:0, nextScheduled:null,
  lastSync:null, syncError:null, history:[], matchDates:{} };
const hasStore = typeof window!=="undefined" && window.storage;

async function loadPersistedState(){
  if(!hasStore) return null;
  let r;
  try{ r=await window.storage.get(STATE_KEY,true); }catch(e){ return null; }
  const raw=r&&r.value;
  if(!raw) return null;
  return {...DEFAULT_STATE,...JSON.parse(raw)};
}

async function writePersistedState(next){
  if(!hasStore) return;
  try{ await window.storage.set(STATE_KEY,JSON.stringify(next),true); }catch(e){}
}

const TABS=[
  ["leaderboard","Leaderboard"],["myteams","My Teams"],["groups","Groups"],
  ["knockouts","Knockouts"],["h2h","Head-to-head"],["prizes","Prizes"],
  ["drama","Drama"],["stats","Stats"],
];
const TAB_KEYS=new Set(TABS.map(([k])=>k));
const DEFAULT_TAB="leaderboard";
function tabFromHash(){
  const id=location.hash.replace(/^#/,"").trim();
  if(!id) return DEFAULT_TAB;
  return TAB_KEYS.has(id)?id:DEFAULT_TAB;
}
function selectTab(tab,setTab){
  setTab(tab);
  const next="#"+tab;
  if(location.hash!==next) location.hash=tab;
}

function useMutable(initial){
  const ref=useRef(initial);
  return {
    get:()=>ref.current,
    set:(next)=>{ref.current=next;},
  };
}

function useLatestValue(value){
  const cell=useMutable(value);
  useEffect(()=>{ cell.set(value); },[value]);
  return cell;
}

/* ============================================================ */
function App(){
  const [state,setState]=useState(DEFAULT_STATE);
  const [loaded,setLoaded]=useState(false);
  const [tab,setTab]=useState(tabFromHash);
  const [syncing,setSyncing]=useState(false);
  const [themePref,setThemePref]=useState(readThemePref);
  const [me,setMe]=useState(readMe);
  const stateRef=useLatestValue(state);

  useEffect(()=>{ applyTheme(themePref); try{localStorage.setItem(THEME_KEY,themePref);}catch(e){} },[themePref]);
  useEffect(()=>{ try{localStorage.setItem(ME_KEY,me);}catch(e){} },[me]);
  useEffect(()=>{
    const onHash=()=>setTab(tabFromHash());
    window.addEventListener("hashchange",onHash);
    return ()=>window.removeEventListener("hashchange",onHash);
  },[]);
  useEffect(()=>{
    if(themePref!=="system") return;
    const mq=window.matchMedia("(prefers-color-scheme:dark)");
    const onChange=()=>applyTheme("system");
    mq.addEventListener("change",onChange);
    return ()=>mq.removeEventListener("change",onChange);
  },[themePref]);

  useEffect(()=>{(async()=>{
    const persisted=await loadPersistedState();
    if(persisted) setState(persisted);
    setLoaded(true);
  })();},[]);

  const persistNow=async(next)=>{ setState(next); await writePersistedState(next); };

  const liveRef=useMutable(false);
  const pollRef=useMutable(null);
  const syncBusy=useMutable(false);
  const lastFullRef=useMutable(0);
  const didSync=useMutable(false);

  async function runSync({manual=false,scope="full"}={}){
    if(syncBusy.get()&&!manual) return;
    syncBusy.set(true);
    if(manual) setSyncing(true);
    const payload=await fetchLive({scope}).catch(e=>({__error:e}));
    if(payload.__error){
      if(manual) setState({...stateRef.get(),syncError:String(payload.__error.message||payload.__error)});
      syncBusy.set(false);
      if(manual) setSyncing(false);
      return;
    }
    let base=stateRef.get();
    if(manual){
      const persisted=await loadPersistedState();
      if(persisted) base=persisted;
    }
    liveRef.set((payload.liveCount||0)>0);
    if(scope==="full") lastFullRef.set(Date.now());
    await persistNow(mergeLive(base,payload));
    syncBusy.set(false);
    if(manual) setSyncing(false);
  }

  const doSync=()=>runSync({manual:true,scope:"full"});

  useEffect(()=>{
    if(!loaded) return;
    let cancelled=false;
    const pollDelay=()=>{
      if(document.hidden) return liveRef.get()?30000:120000;
      return liveRef.get()?1000:60000;
    };
    const schedule=()=>{ if(cancelled) return; const t=pollRef.get(); if(t) clearTimeout(t); pollRef.set(setTimeout(tick,pollDelay())); };
    const tick=async()=>{
      if(cancelled) return;
      const needFull=!lastFullRef.get()||Date.now()-lastFullRef.get()>3600000;
      const scope=liveRef.get()?"live":(needFull?"full":"live");
      await runSync({scope});
      if(!cancelled) schedule();
    };
    const onVis=()=>schedule();
    (async()=>{ if(!didSync.get()){ didSync.set(true); await runSync({manual:true,scope:"full"}); } if(!cancelled) schedule(); })();
    document.addEventListener("visibilitychange",onVis);
    return ()=>{ cancelled=true; clearTimeout(pollRef.get()); document.removeEventListener("visibilitychange",onVis); };
  },[loaded,runSync]);

  const {A,Aconf,liveActive,liveTeams}=useMemo(()=>{
    const liveActive=(state.liveCount||0)>0;
    const liveTeams=new Set((state.liveMatches||[]).flatMap(m=>[m.a,m.b]));
    return {A:analyse(state),Aconf:analyse(confirmedState(state)),liveActive,liveTeams};
  },[state]);
  if(!loaded) return <Shell><Style/><div className="loading-msg">Loading the sweepstake…</div></Shell>;

  const standing=OWNERS.filter(o=>!A.owner[o].out).length;
  const teamsLeft=ALL_TEAMS.filter(t=>OWNER_OF[t]&&!A.teamOut[t]).length;
  const leader=A.ownerRanked[0];
  const goalsLeader=A.goalsLeader;
  const liveMatchMap={}; (state.liveMatches||[]).forEach(m=>{const k=[m.a,m.b].sort().join("|");liveMatchMap[k]=m;});

  return (
    <Shell>
      <Style/>
      <header className="wc-hero">
        <div className="wc-hero-grid">
          <div className="wc-hero-copy">
            <div className="tc-stripe" aria-hidden="true"><span className="tc-ca"/><span className="tc-mx"/><span className="tc-us"/></div>
            <p className="wc-eyebrow">FIFA World Cup · 2026</p>
            <h1 className="wc-title">TC Work Cup<span className="wc-title-sub">Sweepstake</span></h1>
            <p className="wc-lead">{OWNERS.length} players · 3 nations each · 11 Jun – 19 Jul</p>
          </div>
          <div className="wc-hero-tools">
            <ThemeToggle pref={themePref} onChange={setThemePref}/>
            <SyncBar state={state} syncing={syncing} onSync={doSync} compact/>
            <div className="me-chip">
              <span className="me-icon">👤</span>
              <select className="me-select" value={me} onChange={e=>setMe(e.target.value)} aria-label="Who am I">
                <option value="">Who am I?</option>
                {OWNERS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      {(state.liveCount||0)>0 && <LiveBar matches={state.liveMatches||[]}/>}

      <WcWidgets standing={standing} teamsLeft={teamsLeft} leader={leader} goalsLeader={goalsLeader} firstOut={A.firstOut} ownerRanked={A.ownerRanked}/>

      {!(state.liveCount||0) && state.nextScheduled && <NextMatchBar match={state.nextScheduled}/>}

      <nav className="wc-tabs" aria-label="Sections">
        {TABS.map(([k,l])=>(
          <button key={k} type="button" className={"wc-tab"+(tab===k?" is-on":"")} onClick={()=>selectTab(k,setTab)}>{l}</button>
        ))}
      </nav>

      <main className="wc-main">
        {tab==="leaderboard" && <Leaderboard A={A} Aconf={Aconf} liveActive={liveActive} liveTeams={liveTeams}/>}
        {tab==="myteams" && <MyTeamsView A={A} state={state} me={me} setMe={setMe} liveTeams={liveTeams} liveMatchMap={liveMatchMap}/>}
        {tab==="groups" && <GroupsView A={A} Aconf={Aconf} state={state} liveTeams={liveTeams} liveMatchMap={liveMatchMap}/>}
        {tab==="knockouts" && <KnockoutsView state={state} A={A} liveMatchMap={liveMatchMap}/>}
        {tab==="h2h" && <HeadToHead A={A} Aconf={Aconf} liveActive={liveActive}/>}
        {tab==="prizes" && <PrizesView A={A} state={state}/>}
        {tab==="drama" && <DramaView A={A} state={state}/>}
        {tab==="stats" && <StatsView A={A} state={state}/>}
      </main>

      <footer className="wc-foot">
        One link for the squad — everyone sees the same live standings.
        <span className="wc-foot-note">Scores from ESPN · live matches update every second</span>
      </footer>
    </Shell>
  );
}

/* ============================================================
   LIVE SYNC
   ============================================================ */
const TODAY_STR = new Date().toDateString();
async function aiSearchJSON(prompt){
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:prompt}],tools:[{type:"web_search_20250305",name:"web_search"}]})});
  if(!res.ok) throw new Error("HTTP "+res.status);
  const data=await res.json();
  const text=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  const s=text.indexOf("["), e=text.lastIndexOf("]");
  if(s<0||e<0) return [];
  try{ const arr=JSON.parse(text.slice(s,e+1)); return Array.isArray(arr)?arr:[]; }catch(_){ return []; }
}
function groupPrompt(letters){
  const lines=letters.map(L=>`Group ${L} (${GROUPS[L].join(", ")})`).join(" and ");
  return `Use web search to find FINISHED match results so far at the 2026 FIFA World Cup for ${lines}. Today is ${TODAY_STR}. Return ONLY a JSON array, no prose or markdown: [{"a":"Team","b":"Team","ga":0,"gb":0}]. Include only matches already completed (full time). Use exactly these team names. If none have finished, return [].`;
}
const KO_PROMPT=`Use web search to find FINISHED knockout-stage results at the 2026 FIFA World Cup (Round of 32 onward). Today is ${TODAY_STR}. Return ONLY a JSON array, no prose: [{"round":"Round of 32|Round of 16|Quarter-final|Semi-final|Third place|Final","a":"Team","b":"Team","ga":0,"gb":0,"pa":null,"pb":null}]. Only completed matches; pa/pb are penalty-shootout scores or null. Use exact country names. If none yet, return [].`;
const SCORERS_PROMPT=`Use web search to find the current TOP GOALSCORERS at the 2026 FIFA World Cup. Today is ${TODAY_STR}. Return ONLY a JSON array, top 10 highest first, no prose: [{"p":"Player full name","t":"Team","g":0}]. Use exact country names. If unclear this early, return [].`;

async function fetchSearch(){
  const groupBatches=[["A","B","C"],["D","E","F"],["G","H","I"],["J","K","L"]];
  const jobs=[ ...groupBatches.map(g=>({type:"group",prompt:groupPrompt(g)})),
    {type:"ko",prompt:KO_PROMPT}, {type:"sc",prompt:SCORERS_PROMPT} ];
  const settled=await Promise.allSettled(jobs.map(j=>aiSearchJSON(j.prompt)));
  if(!settled.some(s=>s.status==="fulfilled")) throw new Error("search unavailable");
  const results=[], scorers=[];
  settled.forEach((s,i)=>{
    if(s.status!=="fulfilled") return; const arr=Array.isArray(s.value)?s.value:[]; const type=jobs[i].type;
    if(type==="group") arr.forEach(m=>{ const a=normTeam(m.a),b=normTeam(m.b);
      if(OWNER_OF[a]&&OWNER_OF[b]&&FIXTURE_INDEX[[a,b].sort().join("|")]&&m.ga!=null&&m.gb!=null&&Number.isFinite(+m.ga)&&Number.isFinite(+m.gb))
        results.push({stage:"group",a,b,ga:+m.ga,gb:+m.gb,pa:null,pb:null}); });
    else if(type==="ko") arr.forEach(m=>{ const a=normTeam(m.a),b=normTeam(m.b); const round=KO_ORDER.includes(m.round)?m.round:null;
      if(round&&OWNER_OF[a]&&OWNER_OF[b]&&m.ga!=null&&m.gb!=null&&Number.isFinite(+m.ga)&&Number.isFinite(+m.gb))
        results.push({stage:round,a,b,ga:+m.ga,gb:+m.gb,pa:m.pa==null?null:+m.pa,pb:m.pb==null?null:+m.pb}); });
    else arr.forEach(x=>{ const t=normTeam(x.t); if(OWNER_OF[t]&&x.p&&x.g!=null&&Number.isFinite(+x.g)) scorers.push({p:String(x.p),t,g:+x.g}); });
  });
  return { results, scorers: scorers.sort((a,b)=>b.g-a.g).slice(0,15), nextScheduled:null };
}

const ESPN_URL="https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ESPN_CALENDAR="https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/types/3/calendar/ondays";
const calendarCache={dates:null,at:0};
function isoToYmd(iso){ const d=new Date(iso); return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,"0")}${String(d.getUTCDate()).padStart(2,"0")}`; }
function todayYmd(){ return isoToYmd(new Date()); }
function yesterdayYmd(){ return isoToYmd(new Date(Date.now()-86400000)); }
function allTournamentDates(){ const out=[],start=Date.UTC(2026,5,11),end=Date.UTC(2026,6,19);
  for(let t=start;t<=end;t+=86400000){const d=new Date(t);out.push(`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,"0")}${String(d.getUTCDate()).padStart(2,"0")}`);} return out; }
async function fetchCalendarDates(){
  const now=Date.now();
  if(calendarCache.dates&&now-calendarCache.at<3600000) return calendarCache.dates;
  try{
    const r=await fetch(ESPN_CALENDAR);
    if(!r.ok) throw new Error("calendar HTTP "+r.status);
    const d=await r.json();
    const dates=(d.eventDate?.dates||[]).map(isoToYmd);
    if(dates.length){ calendarCache.dates=dates; calendarCache.at=now; return dates; }
  }catch(e){}
  return allTournamentDates();
}
function numOrNull(v){const n=parseInt(v,10);return Number.isFinite(n)?n:null;}
function isToday(iso){ const d=new Date(iso),n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate(); }
function fmtKickoff(iso){ return new Date(iso).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}); }
function pickNextScheduled(upcoming){
  const now=Date.now();
  const pool=upcoming.filter(m=>OWNER_OF[m.a]||OWNER_OF[m.b]);
  const list=(pool.length?pool:upcoming).filter(m=>Date.parse(m.start)>=now-60000).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
  return list[0]||null;
}
function resolveTeam(team){ if(!team) return null;
  for(const f of [team.displayName,team.shortDisplayName,team.name,team.location,team.abbreviation]){ const r=normTeam(f); if(r&&ALL_TEAMS.includes(r)) return r; }
  const c=String(team.displayName||team.name||"").toLowerCase();
  return ALL_TEAMS.find(t=>{const tl=t.toLowerCase();return c&&(c.includes(tl)||tl.includes(c));})||null; }
function espnStage(ev,comp,a,b){ if(FIXTURE_INDEX[[a,b].sort().join("|")]) return "group";
  const txt=((comp?.notes?.[0]?.headline)||ev.name||ev.shortName||"").toLowerCase();
  if(/round of 32|r32/.test(txt))return"Round of 32"; if(/round of 16|r16/.test(txt))return"Round of 16";
  if(/quarter/.test(txt))return"Quarter-final"; if(/semi/.test(txt))return"Semi-final"; if(/third|3rd|play-?off/.test(txt))return"Third place"; if(/final/.test(txt))return"Final";
  const d=new Date(ev.date),md=(d.getUTCMonth()+1)*100+d.getUTCDate();
  if(md>=628&&md<=703)return"Round of 32"; if(md>=704&&md<=708)return"Round of 16"; if(md>=709&&md<=712)return"Quarter-final"; if(md>=713&&md<=716)return"Semi-final"; if(md===718)return"Third place"; if(md>=717)return"Final"; return"Round of 32"; }
async function fetchScoreboardJson(url){ const r=await fetch(url); if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); }
async function collectEspnEvents(dates,includeTodayBoard){
  const urls=[...dates.map(d=>`${ESPN_URL}?dates=${d}&limit=100`)];
  if(includeTodayBoard) urls.unshift(`${ESPN_URL}?limit=100`);
  const settled=await Promise.allSettled(urls.map(fetchScoreboardJson));
  const ok=settled.filter(s=>s.status==="fulfilled");
  if(!ok.length) throw new Error("ESPN unreachable");
  const events=[], seen=new Set();
  ok.forEach(s=>(s.value.events||[]).forEach(ev=>{ if(ev.id&&!seen.has(ev.id)){ seen.add(ev.id); events.push(ev); } }));
  return events;
}
function parseEspnEvents(events){
  const results=[], scorerMap={}, liveMatches=[], upcoming=[]; let liveCount=0;
  events.forEach(ev=>{ const comp=ev.competitions?.[0]; if(!comp) return;
    const status=comp.status?.type||{}; const state=status.state;
    const completed=status.completed??state==="post"; const live=state==="in";
    const cs=comp.competitors||[]; const home=cs.find(c=>c.homeAway==="home")||cs[0]; const away=cs.find(c=>c.homeAway==="away")||cs[1]; if(!home||!away) return;
    const a=resolveTeam(home.team), b=resolveTeam(away.team); if(!a||!b) return;
    if(!completed&&!live){
      if(ev.date&&isToday(ev.date)) upcoming.push({stage:espnStage(ev,comp,a,b),a,b,start:ev.date,kickoff:fmtKickoff(ev.date),detail:status.shortDetail||status.detail||""});
      return;
    }
    const ga=parseInt(home.score,10), gb=parseInt(away.score,10); if(!Number.isFinite(ga)||!Number.isFinite(gb)) return;
    const stage=espnStage(ev,comp,a,b); const clock=status.shortDetail||status.detail||"";
    results.push({stage,a,b,ga,gb,pa:numOrNull(home.shootoutScore),pb:numOrNull(away.shootoutScore),live,clock,date:ev.date||null});
    if(live){ liveCount++; liveMatches.push({stage,a,b,ga,gb,clock}); }
    if(completed) (comp.details||[]).forEach(d=>{ const tx=(d?.type?.text||"").toLowerCase();
      if(d.scoringPlay && !/own goal/.test(tx)){ const nm=d.athletesInvolved?.[0]?.displayName; if(!nm) return;
        const tm=d.team?.id===home.team?.id?a:b; const k=nm+"|"+tm; (scorerMap[k]=scorerMap[k]||{p:nm,t:tm,g:0}).g++; } });
  });
  const scorers=Object.values(scorerMap).filter(s=>OWNER_OF[s.t]).sort((x,y)=>y.g-x.g).slice(0,15);
  return { results, scorers, liveCount, liveMatches, nextScheduled:pickNextScheduled(upcoming) };
}
async function fetchESPN({scope="full"}={}){
  const liveScope=scope==="live";
  const dates=liveScope?[yesterdayYmd(),todayYmd()]:await fetchCalendarDates();
  const events=await collectEspnEvents(dates,liveScope);
  if(!events.length&&!liveScope) throw new Error("ESPN returned nothing");
  return parseEspnEvents(events);
}
async function fetchLive(opts){
  try{ return await fetchESPN(opts); }
  catch(eE){ try{ return await fetchSearch(); }
    catch(eS){ throw new Error(`sync failed — ${eE.message}`); } }
}

function mergeLive(prev,p){
  const next={...prev}; const gr={...prev.groupResults}; const ko=[...prev.ko];
  (p.results||[]).forEach(m=>{
    const src=m.live?"live":"auto";
    if(m.stage==="group"){
      const hit=FIXTURE_INDEX[[m.a,m.b].sort().join("|")]; if(!hit) return;
      const cur=gr[hit.fx.id]; if(cur&&cur.src==="manual") return;
      const fwd=hit.fx.a===m.a; gr[hit.fx.id]={hs:fwd?m.ga:m.gb,as:fwd?m.gb:m.ga,src};
    } else {
      const round=m.stage; const key=[m.a,m.b].sort().join("|");
      const i=ko.findIndex(x=>x.round===round && [x.a,x.b].sort().join("|")===key);
      if(i>=0 && ko[i].src==="manual") return;
      const A=i<0?m.a:ko[i].a; const fwd=A===m.a;
      const rec={id:i<0?`ko-${round}-${key}`:ko[i].id,round,a:A,b:i<0?m.b:ko[i].b,
        hs:fwd?m.ga:m.gb,as:fwd?m.gb:m.ga,pa:m.pa==null?null:(fwd?m.pa:m.pb),pb:m.pb==null?null:(fwd?m.pb:m.pa),src};
      if(i<0) ko.push(rec); else ko[i]=rec;
    }
  });

  // Store latest result date per team (for history event timestamps)
  const matchDates={...(prev.matchDates||{})};
  (p.results||[]).forEach(m=>{
    if(m.date&&!m.live){
      if(!matchDates[m.a]||m.date>matchDates[m.a]) matchDates[m.a]=m.date;
      if(!matchDates[m.b]||m.date>matchDates[m.b]) matchDates[m.b]=m.date;
    }
  });

  // Diff prev vs next analysis to build history of eliminations / champion
  const prevA=analyse(prev);
  const nextTemp={...prev,groupResults:gr,ko,matchDates};
  const nextA=analyse(nextTemp);
  const history=[...(prev.history||[])];
  const histKeys=new Set(history.map(h=>h.key));
  const now=Date.now(); const nowIso=new Date(now).toISOString();

  ALL_TEAMS.forEach(t=>{
    if(!OWNER_OF[t]) return;
    if(nextA.teamOut[t]&&!prevA.teamOut[t]){
      const key=`team_out:${t}`;
      if(!histKeys.has(key)){
        const at=matchDates[t]||nowIso;
        history.push({key,ts:now,at,type:"team_out",team:t,owner:OWNER_OF[t]});
        histKeys.add(key);
      }
    }
  });
  OWNERS.forEach(o=>{
    if(nextA.owner[o].out&&!prevA.owner[o].out){
      const key=`player_out:${o}`;
      if(!histKeys.has(key)){
        const teamDates=nextA.owner[o].teams.map(t=>matchDates[t]).filter(Boolean);
        const at=teamDates.length?teamDates.sort().reverse()[0]:nowIso;
        history.push({key,ts:now,at,type:"player_out",owner:o});
        histKeys.add(key);
      }
    }
  });
  if(nextA.champion&&!prevA.champion){
    const key=`champion:${nextA.champion}`;
    if(!histKeys.has(key)){
      const at=matchDates[nextA.champion]||nowIso;
      history.push({key,ts:now,at,type:"champion",team:nextA.champion,owner:OWNER_OF[nextA.champion]});
      histKeys.add(key);
    }
  }

  next.groupResults=gr; next.ko=ko; next.matchDates=matchDates; next.history=history;
  next.autoScorers=(p.scorers||[]).filter(s=>OWNER_OF[s.t]).slice(0,20);
  next.liveMatches=p.liveMatches||[]; next.liveCount=p.liveCount||0;
  next.nextScheduled=p.nextScheduled??null;
  next.lastSync=new Date().toISOString(); next.syncError=null;
  return next;
}

/* ============================================================ ANALYSIS ============================================================ */
function analyse(state){
  const results=state.groupResults||{}, ko=state.ko||[], odds=state.odds||{};
  const standings={},complete={},rankOf={};
  GROUP_LETTERS.forEach(L=>{ standings[L]=computeStandings(L,results); complete[L]=groupDone(L,results); standings[L].forEach(s=>rankOf[s.name]=s.rank); });
  const allComplete=GROUP_LETTERS.every(L=>complete[L]);
  let thirdAdv=new Set();
  if(allComplete){ const th=GROUP_LETTERS.map(L=>standings[L][2]); th.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||strength(b.name)-strength(a.name)); th.slice(0,8).forEach(t=>thirdAdv.add(t.name)); }

  const koLosers=new Set(); const koStats={}; ALL_TEAMS.forEach(t=>koStats[t]={p:0,w:0,d:0,l:0,gf:0,ga:0});
  const clashes=[];
  const add=(stage,a,b,ga,gb,pens,live=false)=>clashes.push({stage,a,b,ga,gb,pens,oa:OWNER_OF[a],ob:OWNER_OF[b],live});
  GROUP_LETTERS.forEach(L=>FIXTURES[L].forEach(fx=>{const r=results[fx.id]; if(r&&r.hs!=null) add("Group "+L,fx.a,fx.b,r.hs,r.as,null,r.src==="live");}));
  ko.forEach(m=>{ if(m.hs==null||m.as==null) return; const SA=koStats[m.a],SB=koStats[m.b];
    if(SA&&SB){SA.p++;SB.p++;SA.gf+=m.hs;SA.ga+=m.as;SB.gf+=m.as;SB.ga+=m.hs; if(m.hs>m.as){SA.w++;SB.l++;}else if(m.hs<m.as){SB.w++;SA.l++;}else{SA.d++;SB.d++;}}
    const wl=koWL(m); if(wl) koLosers.add(wl.l); add(m.round,m.a,m.b,m.hs,m.as,(m.pa!=null&&m.pb!=null)?[m.pa,m.pb]:null,m.src==="live"); });

  const teamOut={};
  ALL_TEAMS.forEach(t=>{ if(koLosers.has(t)){teamOut[t]=true;return;} const L=GROUP_OF[t];
    if(complete[L]){const r=rankOf[t]; if(r===4){teamOut[t]=true;return;} if(r===3){teamOut[t]=allComplete?!thirdAdv.has(t):false;return;}} teamOut[t]=false; });

  const groupStats={}; GROUP_LETTERS.forEach(L=>standings[L].forEach(s=>groupStats[s.name]=s));
  const owner={}; OWNERS.forEach(o=>owner[o]={owner:o,p:0,w:0,d:0,l:0,gf:0,ga:0,teams:[],teamsLeft:0});
  ALL_TEAMS.forEach(t=>{const o=OWNER_OF[t]; if(!o) return; const g=groupStats[t],k=koStats[t],O=owner[o];
    O.p+=g.p+k.p;O.w+=g.w+k.w;O.d+=g.d+k.d;O.l+=g.l+k.l;O.gf+=g.gf+k.gf;O.ga+=g.ga+k.ga;O.teams.push(t); if(!teamOut[t])O.teamsLeft++;});
  OWNERS.forEach(o=>{const O=owner[o];O.gd=O.gf-O.ga;O.pts=O.w*3+O.d;O.out=O.teamsLeft===0;});

  const finalMatch=ko.find(m=>m.round==="Final"&&m.hs!=null&&m.as!=null);
  const champion = finalMatch ? ((koWL(finalMatch)||{}).w || null) : null;

  const teamForm=t=>{ const g=groupStats[t]||{}, k=koStats[t]||{};
    const gp=(g.p||0)+(k.p||0); if(!gp) return 1;
    const pts=(g.pts||0)+((k.w||0)*3+(k.d||0));
    const gd=(g.gd||0)+((k.gf||0)-(k.ga||0));
    return Math.max(0.3, Math.min(2.5, 0.5 + (pts/gp)/3 + 0.08*(gd/gp))); };
  const w=t=>(1/((odds[t]??BASE_ODDS[t])??1500))*teamForm(t);
  const inTotal=ALL_TEAMS.filter(t=>!teamOut[t]).reduce((s,t)=>s+w(t),0)||1;
  OWNERS.forEach(o=>{ owner[o].odds=champion?(OWNER_OF[champion]===o?100:0):owner[o].teams.filter(t=>!teamOut[t]).reduce((s,t)=>s+w(t),0)/inTotal*100; });
  const ownerRanked=[...OWNERS].map(o=>owner[o]).sort((a,b)=>(a.out?1:0)-(b.out?1:0)||b.odds-a.odds||b.pts-a.pts||b.gd-a.gd);

  const h2h={}; OWNERS.forEach(o=>h2h[o]={owner:o,p:0,w:0,d:0,l:0,gf:0,ga:0});
  clashes.forEach(c=>{const A=h2h[c.oa],B=h2h[c.ob]; if(!A||!B) return; A.p++;B.p++;A.gf+=c.ga;A.ga+=c.gb;B.gf+=c.gb;B.ga+=c.ga;
    let r; if(c.ga>c.gb)r="a"; else if(c.ga<c.gb)r="b"; else if(c.pens)r=c.pens[0]>c.pens[1]?"a":"b"; else r="d";
    if(r==="a"){A.w++;B.l++;}else if(r==="b"){B.w++;A.l++;}else{A.d++;B.d++;}});
  OWNERS.forEach(o=>{const H=h2h[o];H.gd=H.gf-H.ga;H.pts=H.w*3+H.d;});
  const h2hRanked=[...OWNERS].map(o=>h2h[o]).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||b.w-a.w);

  const scMap=new Map();
  (state.autoScorers||[]).forEach(s=>{if(OWNER_OF[s.t])scMap.set(s.p+"|"+s.t,{p:s.p,t:s.t,g:s.g,src:"auto"});});
  (state.scorers||[]).forEach(s=>{if(OWNER_OF[s.t])scMap.set(s.p+"|"+s.t,{p:s.p,t:s.t,g:s.g,src:"manual"});});
  const scorers=[...scMap.values()].sort((a,b)=>b.g-a.g).slice(0,15);

  const cs={}; ALL_TEAMS.forEach(t=>cs[t]=0);
  GROUP_LETTERS.forEach(L=>FIXTURES[L].forEach(fx=>{const r=results[fx.id]; if(r&&r.hs!=null){ if(r.as===0)cs[fx.a]++; if(r.hs===0)cs[fx.b]++; }}));
  ko.forEach(m=>{ if(m.hs!=null&&m.as!=null){ if(m.as===0)cs[m.a]++; if(m.hs===0)cs[m.b]++; }});
  const keeperName={}; (state.keepers||[]).forEach(k=>{if(OWNER_OF[k.t])keeperName[k.t]=k.p;});
  const cleanSheets=ALL_TEAMS.map(t=>({t,owner:OWNER_OF[t],cs:cs[t],keeper:keeperName[t]||null})).filter(x=>x.cs>0).sort((a,b)=>b.cs-a.cs||strength(b.t)-strength(a.t)).slice(0,15);

  let goalsLeader=null, topGoals=-1;
  ALL_TEAMS.forEach(t=>{ if(!OWNER_OF[t]) return; const g=(groupStats[t]?.gf||0)+(koStats[t]?.gf||0);
    if(g>topGoals){ topGoals=g; goalsLeader={team:t,goals:g,owner:OWNER_OF[t]}; }
    else if(g===topGoals&&g>0&&goalsLeader&&(strength(t)>strength(goalsLeader.team)||(strength(t)===strength(goalsLeader.team)&&t<goalsLeader.team))){ goalsLeader={team:t,goals:g,owner:OWNER_OF[t]}; } });

  // --- Extensions ---

  // goalsBoard: all pooled teams ranked by total goals
  const goalsBoard=ALL_TEAMS
    .filter(t=>OWNER_OF[t])
    .map(t=>({t,owner:OWNER_OF[t],goals:(groupStats[t]?.gf||0)+(koStats[t]?.gf||0)}))
    .filter(x=>x.goals>0)
    .sort((a,b)=>b.goals-a.goals||strength(b.t)-strength(a.t));

  // firstOut: earliest player_out event from history
  const firstOut=(state.history||[]).filter(h=>h.type==="player_out").sort((a,b)=>a.ts-b.ts)[0]||null;

  // upsets: confirmed clashes where the winner had higher (worse) BASE_ODDS
  const upsets=clashes
    .filter(c=>!c.live)
    .map(c=>{
      const winTeam=c.ga>c.gb?c.a:c.ga<c.gb?c.b:(c.pens?(c.pens[0]>c.pens[1]?c.a:c.b):null);
      if(!winTeam) return null;
      const loseTeam=winTeam===c.a?c.b:c.a;
      const winOdds=BASE_ODDS[winTeam]||1500, loseOdds=BASE_ODDS[loseTeam]||1500;
      if(loseOdds>=winOdds*1.5) return null; // winner was not a meaningful underdog
      return {stage:c.stage,winner:winTeam,loser:loseTeam,winOwner:OWNER_OF[winTeam]||null,loseOwner:OWNER_OF[loseTeam]||null,
        ga:c.ga,gb:c.gb,pens:c.pens,winOdds,loseOdds,ratio:winOdds/loseOdds};
    })
    .filter(Boolean)
    .sort((a,b)=>b.ratio-a.ratio);

  // drawLuck: per-owner portfolio strength from opening odds
  const drawLuck=OWNERS.map(o=>{
    const teams=owner[o].teams;
    const ownerStr=teams.reduce((s,t)=>s+strength(t),0);
    return {owner:o,strength:ownerStr,teams};
  }).sort((a,b)=>b.strength-a.strength);

  // groupAwards: top group performers from completed groups
  const groupWinners=GROUP_LETTERS
    .filter(L=>complete[L])
    .map(L=>{ const s=standings[L][0]; return s&&OWNER_OF[s.name]?{team:s.name,owner:OWNER_OF[s.name],L,pts:s.pts,gf:s.gf,gd:s.gd}:null; })
    .filter(Boolean)
    .sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);
  const groupAwards={groupWinners};

  // penaltyBoard: KO clashes decided on pens, by owner
  const penMap={}; OWNERS.forEach(o=>penMap[o]={owner:o,pw:0,pl:0});
  clashes.forEach(c=>{
    if(!c.pens||c.live) return;
    const [pa,pb]=c.pens; if(pa===pb) return;
    const penWin=pa>pb?c.oa:c.ob, penLose=pa>pb?c.ob:c.oa;
    if(penMap[penWin]) penMap[penWin].pw++;
    if(penMap[penLose]) penMap[penLose].pl++;
  });
  const penaltyBoard=OWNERS.map(o=>penMap[o]).filter(o=>o.pw+o.pl>0).sort((a,b)=>b.pw-a.pw||a.pl-b.pl);

  return { standings,complete,allComplete,teamOut,owner,ownerRanked,champion,h2hRanked,
    clashes:clashes.slice().reverse(), scorers, cleanSheets, bootLeader:scorers[0]||null, gloveLeader:cleanSheets[0]||null,
    goalsLeader:topGoals>0?goalsLeader:null, goalsBoard, firstOut, upsets, drawLuck, groupAwards, penaltyBoard };
}

/* ============================================================ VIEWS ============================================================ */
function ThemeToggle({pref,onChange}){
  const opts=[["light","☀"],["dark","☾"],["system","◐"]];
  return (
    <div className="theme-switch" role="group" aria-label="Color theme">
      {opts.map(([k,glyph])=>(
        <button key={k} type="button" className={"theme-opt"+(pref===k?" on":"")} onClick={()=>onChange(k)} aria-label={k} aria-pressed={pref===k}>{glyph}</button>
      ))}
    </div>
  );
}
function SyncBar({state,syncing,onSync,compact}){
  const last=state.lastSync?timeAgo(state.lastSync):"never";
  const live=(state.liveCount||0)>0;
  const dot=syncing?"var(--accent)":live?"var(--live)":(state.syncError?"var(--live)":"var(--qualify)");
  const short=syncing?"Syncing…":state.syncError?"Failed":live?`Live · ${state.liveCount}`:`${last}`;
  const full=syncing?"Syncing latest results…":state.syncError?`Sync failed — ${state.syncError}`:
    live?`Live · ${state.liveCount} match${state.liveCount===1?"":"es"} · ${last}`:`Updated ${last}`;
  if(compact) return (
    <div className="sync-chip" title={full}>
      <span className={"pulse-dot"+(live&&!syncing?" live":"")} style={{background:dot}}/>
      <span className="sync-chip-txt">{short}</span>
      <button type="button" className="sync-btn" onClick={onSync} disabled={syncing} aria-label="Sync now">↻</button>
    </div>
  );
  return (
    <div className="sync-wide">
      <span className={"pulse-dot"+(live&&!syncing?" live":"")} style={{background:dot}}/>
      <span className="sync-wide-txt">{full}</span>
      <button type="button" className="btn-soft" onClick={onSync} disabled={syncing}>Sync</button>
    </div>
  );
}

function WcWidgets({standing,teamsLeft,leader,goalsLeader,firstOut,ownerRanked}){
  const atRisk=ownerRanked.filter(o=>!o.out).sort((a,b)=>a.teamsLeft-b.teamsLeft||a.odds-b.odds)[0];
  return (
    <div className="wc-widgets">
      <div className="wc-widget wc-card">
        <span className="wc-widget-icon">👥</span>
        <span className="wc-widget-val">{standing}</span>
        <span className="wc-widget-lbl">Players still in</span>
      </div>
      <div className="wc-widget wc-card">
        <span className="wc-widget-icon">⚽</span>
        <span className="wc-widget-val">{teamsLeft}</span>
        <span className="wc-widget-lbl">Teams in the cup</span>
      </div>
      <div className="wc-widget wc-card">
        <span className="wc-widget-icon">🏆</span>
        <span className="wc-widget-lbl">Current leader</span>
        <span className="wc-widget-row"><Crest owner={leader.owner} size={24}/><b style={{color:OWNER_COLOR[leader.owner]}}>{leader.owner}</b></span>
      </div>
      <div className="wc-widget wc-card">
        <span className="wc-widget-icon">🥅</span>
        <span className="wc-widget-lbl">Most goals</span>
        {goalsLeader ? (
          <span className="wc-widget-row"><FlagDot team={goalsLeader.team}/><b>{goalsLeader.team}</b><span className="wc-widget-muted">{goalsLeader.goals} · {goalsLeader.owner}</span></span>
        ) : <span className="wc-widget-muted">No goals yet</span>}
      </div>
      <div className="wc-widget wc-widget--wide wc-card">
        <span className="wc-widget-icon">🍻</span>
        <span className="wc-widget-lbl">Booze bet — first eliminated wins a drink from the cup winner</span>
        <span className="wc-widget-row wc-widget-muted">
          {firstOut
            ? <><Crest owner={firstOut.owner} size={18}/><span style={{color:OWNER_COLOR[firstOut.owner]}}>{firstOut.owner}</span><span className="wc-widget-muted">wins it — all teams out!</span></>
            : atRisk
              ? <><span className="wc-widget-muted">Nobody out yet ·</span><span style={{color:OWNER_COLOR[atRisk.owner]}}>{atRisk.owner}</span><span className="wc-widget-muted">most at risk ({atRisk.teamsLeft} team{atRisk.teamsLeft!==1?"s":""} left)</span></>
              : <span>Nobody eliminated yet</span>
          }
        </span>
      </div>
    </div>
  );
}
function LiveBar({matches}){
  if(!matches.length) return null;
  return (
    <section className="wc-live wc-card" aria-label="Live matches">
      {matches.map((m,i)=>(
        <div key={m.a+"|"+m.b+"|"+i} className="wc-live-row">
          <span className="wc-live-badge">Live</span>
          <span className="wc-live-stage">{m.stage}</span>
          <span className="wc-live-score"><FlagDot team={m.a}/>{m.a} <strong>{m.ga}–{m.gb}</strong> <FlagDot team={m.b}/>{m.b}</span>
          {m.clock&&<span className="wc-live-clock">{m.clock}</span>}
        </div>
      ))}
    </section>
  );
}
function NextMatchBar({match}){
  if(!match) return null;
  return (
    <section className="wc-next wc-card" aria-label="Next match today">
      <div className="wc-live-row">
        <span className="wc-next-badge">Next up</span>
        <span className="wc-live-stage">{match.stage}</span>
        <span className="wc-live-score wc-live-score--next">
          <span className="wc-match-side"><FlagDot team={match.a}/>{match.a}</span>
          <span className="wc-match-vs">vs</span>
          <span className="wc-match-side"><FlagDot team={match.b}/>{match.b}</span>
        </span>
        <span className="wc-next-time">{match.kickoff}{match.detail&&match.detail!==match.kickoff?` · ${match.detail}`:""}</span>
      </div>
    </section>
  );
}

function Leaderboard({A,Aconf,liveActive,liveTeams}){
  const confRank={},confOdds={};
  (Aconf||A).ownerRanked.forEach((O,i)=>{ confRank[O.owner]=i+1; confOdds[O.owner]=O.odds; });
  return (
    <div className="wc-players">
      {liveActive&&<ProvisionalBanner/>}
      {A.ownerRanked.map((O,i)=>{ const lead=i===0&&!O.out;
        const cr=confRank[O.owner], co=confOdds[O.owner];
        const rankDelta=liveActive&&cr!=null&&cr!==(i+1)?cr-(i+1):0;
        const oddsDelta=liveActive&&co!=null&&Math.abs(co-O.odds)>=0.05;
        return (
          <article key={O.owner} className={"wc-player wc-card"+(lead?" wc-player--lead":"")+(O.out?" is-out":"")}>
            <div className="wc-player-top">
              <div className="wc-player-rank-col">
                <span className="wc-player-rank">{i+1}</span>
                {rankDelta!==0&&<span className={"wc-rank-delta "+(rankDelta>0?"wc-rank-delta--up":"wc-rank-delta--down")}>{rankDelta>0?"↑":"↓"}{Math.abs(rankDelta)}</span>}
              </div>
              <Crest owner={O.owner} size={40}/>
              <div className="wc-player-info">
                <div className="wc-player-name-row">
                  <h3 className="wc-player-name">{O.owner}</h3>
                  {lead&&<span className="wc-pill wc-pill--gold">Leader</span>}
                  <span className={"wc-pill "+(O.out?"wc-pill--out":"wc-pill--in")}>{O.out?"Out":"In"}</span>
                </div>
                <p className="wc-player-meta">{O.teamsLeft} of {O.teams.length} teams still in the tournament</p>
              </div>
              <div className="wc-player-odds">
                <span className="wc-odds-val">{O.odds.toFixed(1)}%</span>
                {oddsDelta&&<span className="wc-prev">was {co.toFixed(1)}%</span>}
                <span className="wc-odds-lbl">Trophy odds</span>
              </div>
            </div>
            <div className="wc-bar"><div className="wc-bar-fill" style={{width:`${Math.min(100,O.odds)}%`}}/></div>
            <div className="wc-team-tags">{O.teams.map(t=>{
              const isLive=liveActive&&liveTeams.has(t);
              return (<span key={t} className={"wc-team-tag"+(A.teamOut[t]?" is-out":"")+(isLive?" is-live":"")}>
                <FlagDot team={t}/>{t}{isLive&&<span className="wc-live-dot">Live</span>}
              </span>);
            })}</div>
          </article>
        );})}
    </div>
  );
}

function HeadToHead({A,Aconf,liveActive}){
  const confH2H={};
  (Aconf||A).h2hRanked.forEach(O=>{ confH2H[O.owner]=O; });
  return (
    <div>
      <p className="section-note">Every match where two pooled teams meet. Same-player clashes count both ways; penalty knockouts count as a draw.</p>
      {liveActive&&<ProvisionalBanner/>}
      <div className="wc-table-wrap" style={{marginBottom:20}}>
        <table className="lt"><thead><tr><th style={{textAlign:"left",paddingLeft:14}}>Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th className="sorted">Pts</th></tr></thead>
          <tbody>{A.h2hRanked.map(O=>{
            const prev=confH2H[O.owner];
            const ptsDiff=liveActive&&prev&&prev.pts!==O.pts;
            return (<tr key={O.owner}><td style={{textAlign:"left",paddingLeft:14}}><span style={{display:"inline-flex",alignItems:"center",gap:8}}><Crest owner={O.owner} size={22}/><b style={{color:"var(--text)"}}>{O.owner}</b></span></td>
              <td>{O.p}</td><td>{O.w}</td><td>{O.d}</td><td>{O.l}</td><td>{O.gf}</td><td>{O.ga}</td><td>{O.gd>=0?"+":""}{O.gd}</td>
              <td className="sorted"><b style={{color:"var(--text)"}}>{O.pts}</b>{ptsDiff&&<span className="wc-prev"> ({prev.pts})</span>}</td></tr>);})}</tbody>
        </table>
      </div>
      <h2 className="section-title">The clashes</h2>
      {A.clashes.length===0 && <div className="wc-card wc-empty">No two pooled teams have met yet.</div>}
      <div className="wc-stack">{A.clashes.map((c,i)=>{
        const same=c.oa===c.ob;
        const winTeam=!c.live?(c.ga>c.gb?c.a:c.ga<c.gb?c.b:(c.pens?(c.pens[0]>c.pens[1]?c.a:c.b):null)):null;
        const winOwner=winTeam?OWNER_OF[winTeam]:null;
        const leadTeam=c.live?(c.ga>c.gb?c.a:c.ga<c.gb?c.b:null):null;
        return (
          <div key={i} className={"wc-card wc-match"+(c.live?" is-live":"")}>
            <div className="wc-match-stage">
              {c.live&&<span className="wc-live-badge" style={{marginRight:6}}>Live</span>}
              {c.stage}{same?" · same player":""}
            </div>
            <ClashSide team={c.a} owner={c.oa} score={c.ga} pen={c.pens?c.pens[0]:null} lose={winTeam&&winTeam!==c.a} lead={leadTeam===c.a}/>
            <div style={{height:1,background:"var(--line)",margin:"2px 0"}}/>
            <ClashSide team={c.b} owner={c.ob} score={c.gb} pen={c.pens?c.pens[1]:null} lose={winTeam&&winTeam!==c.b} lead={leadTeam===c.b}/>
            <div className="wc-match-foot" style={{color:same?"var(--accent)":(winOwner?OWNER_COLOR[winOwner]:undefined)}}>
              {c.live?"In progress":(same?`Both results count for ${c.oa}`:(winOwner?`${winOwner} wins the bragging rights`:"Honours even"))}
            </div>
          </div>);})}</div>
    </div>
  );
}
function ClashSide({team,owner,score,pen,lose,lead}){
  return (<div className="wc-clash-side" style={{opacity:lose?.55:1}}>
    <FlagDot team={team}/><span className={"wc-clash-team"+(lead?" is-lead":"")}>{team}</span>
    {owner&&<span className="owntag" style={{color:OWNER_COLOR[owner]}}>{owner}</span>}
    <span className="wc-clash-score">{score}{pen!=null?<sup className="wc-pen"> ({pen})</sup>:null}</span></div>);
}

function GroupFixtures({L,groupResults,liveMatchMap}){
  return (
    <div className="wc-fixture-strip">
      {FIXTURES[L].map(fx=>{
        const r=groupResults[fx.id];
        const isLive=r?.src==="live";
        const played=r&&r.hs!=null;
        const lm=played&&isLive?liveMatchMap[[fx.a,fx.b].sort().join("|")]:null;
        return (
          <div key={fx.id} className={"wc-fixture-row"+(isLive?" is-live":"")}>
            <span className="wc-fixture-home"><FlagDot team={fx.a}/>{fx.a}</span>
            <span className="wc-fixture-score">{played?`${r.hs} – ${r.as}`:"vs"}</span>
            <span className="wc-fixture-away">{fx.b}<FlagDot team={fx.b}/></span>
            <span className="wc-fixture-meta">
              {isLive&&<><span className="wc-live-badge">Live</span>{lm?.clock&&<span className="wc-fixture-clock">{lm.clock}</span>}</>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
function GroupsView({A,Aconf,state,liveTeams,liveMatchMap}){
  const confSt=(Aconf||A).standings;
  const liveActive=liveTeams&&liveTeams.size>0;
  return (
    <div className="wc-groups">
      {liveActive&&<ProvisionalBanner/>}
      {GROUP_LETTERS.map(L=>{const st=A.standings[L];
        const confStL=confSt[L]||[];
        const confRankMap={};confStL.forEach(s=>{ confRankMap[s.name]=s.rank; });
        const hasLiveInGroup=liveActive&&GROUPS[L].some(t=>liveTeams.has(t));
        const groupComplete=(Aconf||A).complete[L];
        return (
          <div key={L} className="wc-card wc-group">
            <div className="wc-group-head">
              <span className="wc-group-badge">{L}</span>
              <span className="wc-group-title">Group {L}</span>
              <span className="wc-group-status">{groupComplete?"Complete":hasLiveInGroup?"Live":"In progress"}</span>
            </div>
            <div className="wc-table-wrap">
            <table className="grp"><thead><tr><th></th><th style={{textAlign:"left"}}>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
              <tbody>{st.map(s=>{const out=A.teamOut[s.name];
                const confRank=confRankMap[s.name];
                const rankChanged=liveActive&&confRank!=null&&confRank!==s.rank;
                return (<tr key={s.name} className={rankChanged?"is-changed":""} style={{opacity:out?.45:1}}>
                  <td>
                    <span className="rankdot" style={{background:s.rank<=2?"var(--qualify)":s.rank===3?(out?"var(--live)":"var(--gold)"):"var(--live)"}}>{s.rank}</span>
                    {rankChanged&&<span className={"wc-rank-delta "+(s.rank<confRank?"wc-rank-delta--up":"wc-rank-delta--down")} style={{marginLeft:3}}>{s.rank<confRank?"↑":"↓"}</span>}
                  </td>
                  <td style={{textAlign:"left"}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><FlagDot team={s.name}/><span style={{color:"var(--text)"}}>{s.name}</span>{OWNER_OF[s.name]&&<span className="owntag" style={{color:OWNER_COLOR[OWNER_OF[s.name]]}}>{OWNER_OF[s.name]}</span>}</span></td>
                  <td>{s.p}</td><td>{s.w}</td><td>{s.d}</td><td>{s.l}</td><td>{s.gf}</td><td>{s.ga}</td><td>{s.gd>=0?"+":""}{s.gd}</td><td><b style={{color:"var(--text)"}}>{s.pts}</b></td></tr>);})}</tbody>
            </table>
            </div>
            <GroupFixtures L={L} groupResults={state.groupResults||{}} liveMatchMap={liveMatchMap}/>
          </div>);})}
      <p className="wc-legend">
        <i className="rankdot" style={{background:"var(--qualify)"}}/> Top 2 qualify
        <i className="rankdot" style={{background:"var(--gold)"}}/> 3rd — best 8
        <i className="rankdot" style={{background:"var(--live)"}}/> Eliminated
      </p>
    </div>
  );
}

function KnockoutsView({state,A,liveMatchMap}){
  const ko=state.ko||[]; const rounds=KO_ORDER.map(r=>[r,ko.filter(m=>m.round===r)]).filter(([,m])=>m.length);
  return (
    <div>
      {ko.length===0 && <div className="wc-card wc-empty">Knockouts start 28 June — results sync automatically from ESPN.</div>}
      {rounds.map(([round,matches])=>(
        <div key={round} className="wc-ko-round">
          <h2 className="wc-round-title">{round}</h2>
          <div className="wc-stack">{matches.map(m=><KoCard key={m.id} m={m} liveMatchMap={liveMatchMap}/>)}</div>
        </div>))}
    </div>
  );
}
function KoCard({m,liveMatchMap}){ const wl=koWL(m); const isLive=m.src==="live";
  const lm=isLive&&liveMatchMap?liveMatchMap[[m.a,m.b].sort().join("|")]:null;
  const row=(team,score,pen)=>{ const owner=OWNER_OF[team];
    const losing=!isLive&&wl&&wl.l===team;
    const leading=isLive&&score!=null&&(team===m.a?m.hs>m.as:m.as>m.hs);
    return (<div className="wc-ko-row" style={{opacity:losing?.5:1}}>
      <FlagDot team={team}/><span className={"wc-ko-team"+(leading?" is-lead":"")}>{team}</span>
      {owner&&<span className="owntag" style={{color:OWNER_COLOR[owner]}}>{owner}</span>}
      {!isLive&&wl&&wl.w===team&&<span className="wc-ko-won">Won</span>}
      <span className="wc-ko-score">{score==null?"–":score}{pen!=null?<sup className="wc-pen"> ({pen})</sup>:null}</span>
    </div>); };
  return (<div className={"wc-card wc-ko"+(isLive?" is-live":"")}>
    {isLive&&<div className="wc-ko-live"><span className="wc-live-badge">Live</span>{lm?.clock&&<span className="wc-fixture-clock" style={{marginLeft:8}}>{lm.clock}</span>}</div>}
    {row(m.a,m.hs,m.pa)}<div className="wc-ko-divider"/>{row(m.b,m.as,m.pb)}
  </div>);
}

/* ============================================================ PRIZES TAB ============================================================ */
function PrizesView({A,state}){
  const champ=A.champion, champO=champ?OWNER_OF[champ]:null;
  return (
    <div className="wc-stack">
      <div className="wc-prize-board">
        <PrizeSlot icon="🏆" label="Cup Winner" prize="Bragging rights — wins the sweepstake"
          holder={champO} team={champ} empty="Decided in the Final"/>
        <PrizeSlot icon="🥈" label="Most Goals" prize="Second place — team with most goals in the tournament"
          holder={A.goalsLeader?.owner} team={A.goalsLeader?.team} extra={A.goalsLeader?`${A.goalsLeader.goals} goals so far`:null} empty="No goals yet"/>
        <PrizeSlot icon="🍻" label="First Eliminated" prize="Wins a drink from the cup winner"
          holder={A.firstOut?.owner} team={null}
          extra={A.firstOut?"All 3 teams eliminated":null}
          empty={(() => { const r=A.ownerRanked.filter(o=>!o.out).sort((a,b)=>a.teamsLeft-b.teamsLeft)[0]; return r?`${r.owner} most at risk (${r.teamsLeft} teams)`:"Everyone still alive"; })()}/>
      </div>

      <GoalsBoard A={A}/>
      <EliminationTimeline state={state} A={A}/>

      <div className="wc-card wc-pad">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🏆</span>
          <div><div className="display wc-card-title">Champions</div><div className="wc-muted-sm">Winners of the World Cup</div></div>
          {champO&&<div style={{marginLeft:"auto",textAlign:"right"}}><div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}><Crest owner={champO} size={22}/><b className="display" style={{fontSize:18,color:"var(--text)"}}>{champO}</b></div><div className="wc-muted-sm">{champ}</div></div>}
        </div>
        {!champO && <p className="wc-muted-sm" style={{marginTop:8}}>Crowned automatically once the Final is played.</p>}
      </div>

      <div className="wc-card wc-pad">
        <div className="display wc-card-title" style={{marginBottom:4}}>Trophy Odds</div>
        <p className="wc-muted-sm" style={{marginBottom:10}}>Chance the winner comes from each player's surviving teams — bookmaker prices, adjusted live.</p>
        {A.ownerRanked.map(O=>(<div key={O.owner} className="wc-odds-row" style={{opacity:O.out?.5:1}}>
          <Crest owner={O.owner} size={20}/><span className="wc-odds-name">{O.owner}</span>
          <div className="wc-bar"><div className="wc-bar-fill" style={{width:`${Math.min(100,O.odds)}%`}}/></div>
          <span className="wc-odds-pct">{O.odds.toFixed(1)}%</span></div>))}
      </div>
    </div>
  );
}

function PrizeSlot({icon,label,prize,holder,team,extra,empty}){
  return (
    <div className={"wc-prize-slot wc-card"+(holder?" is-won":"")}>
      <div className="wc-prize-top">
        <span className="wc-prize-icon">{icon}</span>
        <div className="wc-prize-text">
          <div className="wc-prize-label display">{label}</div>
          <div className="wc-muted-sm">{prize}</div>
        </div>
      </div>
      <div className="wc-prize-holder">
        {holder ? (
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Crest owner={holder} size={36}/>
            <div>
              <div style={{font:"700 17px 'DM Sans',sans-serif",color:"var(--text)"}}>{holder}</div>
              {team&&<div className="wc-muted-sm"><FlagDot team={team}/> {team}</div>}
              {extra&&<div className="wc-muted-sm">{extra}</div>}
            </div>
          </div>
        ) : (
          <span className="wc-muted-sm" style={{fontStyle:"italic"}}>{empty}</span>
        )}
      </div>
    </div>
  );
}

function GoalsBoard({A}){
  return (
    <div className="wc-card wc-pad">
      <BoardHead emoji="🥈" title="2nd Place Race" sub="Team with most goals wins second place"/>
      {A.goalsBoard.length===0 && <p className="wc-muted-sm">No goals recorded yet.</p>}
      <div className="wc-list">{A.goalsBoard.slice(0,12).map((x,i)=>(
        <div key={x.t} className="wc-list-row">
          <span className="wc-list-rank">{i+1}</span>
          <span className="wc-list-team"><FlagDot team={x.t}/><b>{x.t}</b></span>
          <span className="owntag" style={{color:OWNER_COLOR[x.owner]}}>{x.owner}</span>
          <span className="wc-list-val">{x.goals}</span>
        </div>
      ))}</div>
    </div>
  );
}

function EliminationTimeline({state,A}){
  const history=(state.history||[]).slice().sort((a,b)=>b.ts-a.ts);
  return (
    <div className="wc-card wc-pad">
      <BoardHead emoji="⏱" title="Timeline" sub="Eliminations and milestones — logged as they happen"/>
      {history.length===0 && (
        <>
          <p className="wc-muted-sm" style={{marginBottom:12}}>History accrues from this point forward. Most at risk right now:</p>
          {A.ownerRanked.filter(o=>!o.out).sort((a,b)=>a.teamsLeft-b.teamsLeft).slice(0,3).map(o=>(
            <div key={o.owner} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:"1px solid var(--line)"}}>
              <Crest owner={o.owner} size={22}/>
              <span style={{font:"600 14px 'DM Sans',sans-serif",color:"var(--text)"}}>{o.owner}</span>
              <span className="wc-muted-sm">{o.teamsLeft} team{o.teamsLeft!==1?"s":""} left</span>
            </div>
          ))}
        </>
      )}
      <div className="wc-timeline">
        {history.map(h=>(
          <div key={h.key} className={"wc-timeline-row wc-timeline-row--"+h.type}>
            <div className="wc-timeline-dot"/>
            <div className="wc-timeline-body">
              <div className="wc-timeline-text">
                {h.type==="team_out"&&<><FlagDot team={h.team}/> <b>{h.team}</b> eliminated · <span className="owntag" style={{color:OWNER_COLOR[h.owner]}}>{h.owner}</span></>}
                {h.type==="player_out"&&<><Crest owner={h.owner} size={18}/> <b>{h.owner}</b> — all teams out · wins the booze bet!</>}
                {h.type==="champion"&&<><FlagDot team={h.team}/> <b>{h.team}</b> are World Champions! <span className="owntag" style={{color:OWNER_COLOR[h.owner]}}>{h.owner}</span> wins the sweepstake!</>}
              </div>
              {h.at&&<div className="wc-muted-sm">{fmtHistDate(h.at)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ MY TEAMS TAB ============================================================ */
function MyTeamsView({A,state,me,setMe,liveTeams,liveMatchMap}){
  const [viewAs,setViewAs]=useState(me||"");
  useEffect(()=>{ if(me&&!viewAs) setViewAs(me); },[me]);

  const pickPermanently=(o)=>{ setMe(o); setViewAs(o); };
  const currentPlayer=viewAs||me;

  if(!currentPlayer){
    return (
      <div className="wc-myteams-pick">
        <p className="section-note">Who are you in this sweepstake? Pick your name to see your teams, schedule and personal stats.</p>
        <div className="wc-player-grid">
          {OWNERS.map(o=>(
            <button key={o} className="wc-player-pick-btn wc-card" onClick={()=>pickPermanently(o)}
              style={{"--pc":OWNER_COLOR[o]}}>
              <Crest owner={o} size={32}/>
              <span style={{font:"600 14px 'DM Sans',sans-serif",color:"var(--text)"}}>{o}</span>
              <span className="wc-muted-sm" style={{fontSize:11}}>{A.owner[o].teamsLeft}/{A.owner[o].teams.length} alive</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const O=A.owner[currentPlayer];
  const h2hData=A.h2hRanked.find(x=>x.owner===currentPlayer)||{pts:0,w:0,d:0,l:0};
  const oddsRank=A.ownerRanked.findIndex(x=>x.owner===currentPlayer)+1;
  const h2hRank=A.h2hRanked.findIndex(x=>x.owner===currentPlayer)+1;
  const myTeams=O.teams;
  const liveNow=(state.liveMatches||[]).filter(m=>myTeams.includes(m.a)||myTeams.includes(m.b));
  const nextMyTeam=state.nextScheduled&&(myTeams.includes(state.nextScheduled.a)||myTeams.includes(state.nextScheduled.b))?state.nextScheduled:null;
  const myClashes=A.clashes.filter(c=>myTeams.includes(c.a)||myTeams.includes(c.b)).slice(0,8);

  return (
    <div className="wc-stack">
      <div className="wc-card wc-pad">
        <div className="wc-myteams-who">
          <Crest owner={currentPlayer} size={48}/>
          <div style={{flex:1}}>
            <div style={{font:"700 22px 'DM Sans',sans-serif",color:"var(--text)",lineHeight:1.2}}>{currentPlayer}</div>
            <div className="wc-muted-sm" style={{marginTop:4}}>Rank #{oddsRank} · {O.teamsLeft}/{O.teams.length} teams alive</div>
          </div>
          <button className="btn-soft" onClick={()=>setViewAs("")}>Change</button>
        </div>
        <div className="wc-myteams-stats">
          <div className="wc-myteams-stat">
            <span className="wc-widget-val">{O.odds.toFixed(1)}%</span>
            <span className="wc-widget-lbl">Trophy odds</span>
          </div>
          <div className="wc-myteams-stat">
            <span className="wc-widget-val">#{oddsRank}</span>
            <span className="wc-widget-lbl">Odds rank</span>
          </div>
          <div className="wc-myteams-stat">
            <span className="wc-widget-val">{h2hData.pts}</span>
            <span className="wc-widget-lbl">H2H pts</span>
          </div>
          <div className="wc-myteams-stat">
            <span className="wc-widget-val">#{h2hRank}</span>
            <span className="wc-widget-lbl">H2H rank</span>
          </div>
        </div>
      </div>

      <h2 className="section-title">Your teams</h2>
      <div className="wc-stack">
        {myTeams.map(t=>{
          const L=GROUP_OF[t]; const st=A.standings[L].find(s=>s.name===t);
          const out=A.teamOut[t]; const isLive=liveTeams?.has(t);
          const liveScore=(state.liveMatches||[]).find(m=>m.a===t||m.b===t);
          return (
            <div key={t} className={"wc-card wc-pad"+(out?" is-out":"")} style={{opacity:out?.55:1}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <FlagDot team={t}/>
                <div style={{flex:1}}>
                  <div style={{font:"700 16px 'DM Sans',sans-serif",color:out?"var(--muted)":"var(--text)"}}>{t}</div>
                  <div className="wc-muted-sm">Group {L} · Rank {st?.rank||"?"} · {st?.pts||0} pts · {st?.gf||0} goals</div>
                </div>
                {isLive&&liveScore&&<span className="wc-live-score" style={{fontSize:13,flex:"none"}}><strong style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,color:"var(--gold)"}}>{liveScore.ga}–{liveScore.gb}</strong></span>}
                {isLive&&<span className="wc-live-badge">Live</span>}
                {!isLive&&out&&<span className="wc-pill wc-pill--out">Out</span>}
                {!isLive&&!out&&<span className="wc-pill wc-pill--in">In</span>}
              </div>
            </div>
          );
        })}
      </div>

      {liveNow.length>0&&<><h2 className="section-title">Playing now</h2><LiveBar matches={liveNow}/></>}
      {nextMyTeam&&<><h2 className="section-title">Next up today</h2><NextMatchBar match={nextMyTeam}/></>}

      {myClashes.length>0&&<>
        <h2 className="section-title">Recent results</h2>
        <div className="wc-stack">{myClashes.map((c,i)=>{
          const winTeam=!c.live?(c.ga>c.gb?c.a:c.ga<c.gb?c.b:(c.pens?(c.pens[0]>c.pens[1]?c.a:c.b):null)):null;
          return (
            <div key={i} className={"wc-card wc-match"+(c.live?" is-live":"")}>
              <div className="wc-match-stage">{c.live&&<span className="wc-live-badge" style={{marginRight:6}}>Live</span>}{c.stage}</div>
              <ClashSide team={c.a} owner={c.oa} score={c.ga} pen={c.pens?c.pens[0]:null} lose={winTeam&&winTeam!==c.a} lead={c.live&&c.ga>c.gb}/>
              <div style={{height:1,background:"var(--line)",margin:"2px 0"}}/>
              <ClashSide team={c.b} owner={c.ob} score={c.gb} pen={c.pens?c.pens[1]:null} lose={winTeam&&winTeam!==c.b} lead={c.live&&c.gb>c.ga}/>
            </div>
          );
        })}</div>
      </>}

      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:4}}>
        <span className="wc-muted-sm">Viewing as {currentPlayer}</span>
        {currentPlayer!==me&&<button className="wc-link-btn" onClick={()=>setViewAs(me||"")}>Back to {me||"my teams"}</button>}
        <button className="wc-link-btn" onClick={()=>setViewAs("")}>View another player</button>
      </div>

      <h2 className="section-title" style={{marginTop:8}}>Peek at another player</h2>
      <div className="wc-player-grid wc-player-grid--compact">
        {OWNERS.filter(o=>o!==currentPlayer).map(o=>(
          <button key={o} className="wc-player-pick-btn wc-card" onClick={()=>setViewAs(o)}
            style={{"--pc":OWNER_COLOR[o]}}>
            <Crest owner={o} size={24}/>
            <span style={{font:"600 13px 'DM Sans',sans-serif",color:"var(--text)"}}>{o}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ DRAMA TAB ============================================================ */
function DramaView({A,state}){
  const [copied,setCopied]=useState(false);
  const shareText=(o)=>{
    const rank=A.ownerRanked.findIndex(x=>x.owner===o)+1;
    const od=A.owner[o];
    const h2h=A.h2hRanked.find(x=>x.owner===o);
    return `${o} · #${rank} · ${od.odds.toFixed(1)}% trophy odds · ${od.teamsLeft}/${od.teams.length} teams alive · H2H: ${h2h?.w||0}W ${h2h?.d||0}D ${h2h?.l||0}L | TC Work Cup 2026`;
  };
  return (
    <div className="wc-stack">
      <div className="wc-card wc-pad">
        <BoardHead emoji="⚡" title="Upset Log" sub="Underdogs beating the favourites"/>
        {A.upsets.length===0&&<p className="wc-muted-sm">No upsets yet — the favourites are all winning so far.</p>}
        <div className="wc-stack" style={{marginTop:A.upsets.length?12:0}}>
          {A.upsets.map((u,i)=>(
            <div key={i} className="wc-upset-card wc-card">
              <div className="wc-upset-header">
                <span className="wc-muted-sm">{u.stage}</span>
                <span className="wc-pill wc-pill--upset">Upset ×{(u.winOdds/u.loseOdds).toFixed(0)}</span>
              </div>
              <div className="wc-upset-teams">
                <div className="wc-upset-side">
                  <FlagDot team={u.winner}/><b style={{color:"var(--text)"}}>{u.winner}</b>
                  {u.winOwner&&<span className="owntag" style={{color:OWNER_COLOR[u.winOwner]}}>{u.winOwner}</span>}
                  <span className="wc-muted-sm" style={{marginLeft:"auto",fontSize:11}}>({BASE_ODDS[u.winner]||"?"})</span>
                </div>
                <div className="wc-upset-score">{u.ga}–{u.gb}{u.pens?<span className="wc-muted-sm" style={{fontSize:11}}> ({u.pens[0]}–{u.pens[1]} pens)</span>:""}</div>
                <div className="wc-upset-side wc-upset-side--lose">
                  <FlagDot team={u.loser}/><span style={{color:"var(--muted)"}}>{u.loser}</span>
                  {u.loseOwner&&<span className="owntag" style={{color:OWNER_COLOR[u.loseOwner],opacity:.7}}>{u.loseOwner}</span>}
                  <span className="wc-muted-sm" style={{marginLeft:"auto",fontSize:11}}>({BASE_ODDS[u.loser]||"?"})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wc-card wc-pad">
        <BoardHead emoji="🎲" title="Draw Luck" sub="Who drew the strongest portfolio at the start?"/>
        <p className="wc-muted-sm" style={{marginBottom:14}}>Based on opening bookmaker prices. Top = strongest draw. Bottom = biggest longshots.</p>
        <div className="wc-luck-list">
          {A.drawLuck.map((d,i)=>(
            <div key={d.owner} className="wc-luck-row">
              <span className="wc-list-rank">{i+1}</span>
              <Crest owner={d.owner} size={22}/>
              <span style={{font:"600 14px 'DM Sans',sans-serif",color:"var(--text)",flex:1,minWidth:60}}>{d.owner}</span>
              <div className="wc-luck-bar-wrap">
                <div className="wc-luck-bar"><div className="wc-luck-fill" style={{width:`${(d.strength/A.drawLuck[0].strength)*100}%`}}/></div>
              </div>
              <span style={{font:"600 11px 'DM Sans',sans-serif",color:"var(--muted)",width:40,textAlign:"right",flexShrink:0}}>
                {d.teams.map(t=>`${(1/strength(t)).toFixed(0)}`).join("/")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="wc-card wc-pad">
        <BoardHead emoji="👑" title="Bragging Rights" sub="Best moments involving pooled teams"/>
        <BraggingRights A={A}/>
      </div>

      <div className="wc-card wc-pad">
        <BoardHead emoji="📤" title="Share Your Stats" sub="Copy to paste in the team chat"/>
        <div className="wc-share-grid">
          {A.ownerRanked.map(O=>(
            <button key={O.owner} className="wc-share-btn wc-card" onClick={()=>{
              try{ navigator.clipboard.writeText(shareText(O.owner)).then(()=>{setCopied(O.owner);setTimeout(()=>setCopied(c=>c===O.owner?false:c),2000);}); }catch(e){}
            }}>
              <Crest owner={O.owner} size={26}/>
              <span style={{flex:1,font:"600 13px 'DM Sans',sans-serif",color:"var(--text)",textAlign:"left"}}>{O.owner}</span>
              <span className={"wc-share-copy"+(copied===O.owner?" is-copied":"")}>{copied===O.owner?"Copied!":"Copy"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BraggingRights({A}){
  const confirmed=A.clashes.filter(c=>!c.live);
  const bigWin=confirmed.reduce((best,c)=>{
    const m=Math.abs(c.ga-c.gb); if(m===0) return best;
    if(!best||m>best.margin){ const winTeam=c.ga>c.gb?c.a:c.b;
      return {winTeam,loseTeam:winTeam===c.a?c.b:c.a,margin:m,ga:c.ga,gb:c.gb,stage:c.stage,winOwner:OWNER_OF[winTeam]||null}; }
    return best;
  },null);
  const goalFest=confirmed.reduce((best,c)=>{
    const t=c.ga+c.gb; return(!best||t>best.t)?{a:c.a,b:c.b,ga:c.ga,gb:c.gb,t,stage:c.stage,oa:c.oa,ob:c.ob}:best;
  },null);
  if(!bigWin&&!goalFest) return <p className="wc-muted-sm">Check back once matches between pooled teams have been played.</p>;
  return (
    <div className="wc-brag-list">
      {bigWin&&<div className="wc-brag-item">
        <span className="wc-brag-icon">🎯</span>
        <div>
          <div style={{font:"600 14px 'DM Sans',sans-serif",color:"var(--text)"}}>Biggest win</div>
          <div className="wc-muted-sm">
            {bigWin.winOwner&&<span style={{color:OWNER_COLOR[bigWin.winOwner]}}>{bigWin.winOwner}</span>}
            {bigWin.winOwner&&"'s "}<b>{bigWin.winTeam}</b> beat <b>{bigWin.loseTeam}</b> {Math.max(bigWin.ga,bigWin.gb)}–{Math.min(bigWin.ga,bigWin.gb)} · {bigWin.stage}
          </div>
        </div>
      </div>}
      {goalFest&&<div className="wc-brag-item">
        <span className="wc-brag-icon">🔥</span>
        <div>
          <div style={{font:"600 14px 'DM Sans',sans-serif",color:"var(--text)"}}>Goal fest</div>
          <div className="wc-muted-sm">
            <FlagDot team={goalFest.a}/><b>{goalFest.a}</b> {goalFest.ga}–{goalFest.gb} <b>{goalFest.b}</b>
            <FlagDot team={goalFest.b}/> ({goalFest.t} goals) · {goalFest.stage}
          </div>
        </div>
      </div>}
    </div>
  );
}

/* ============================================================ STATS TAB ============================================================ */
function StatsView({A,state}){
  return (
    <div className="wc-stack">
      <ScorerBoard A={A}/>
      <GloveBoard A={A}/>

      <div className="wc-card wc-pad">
        <BoardHead emoji="📊" title="Player Stats" sub="Combined record across all group and knockout matches"/>
        <div className="wc-table-wrap" style={{marginTop:14}}>
          <table className="lt">
            <thead><tr>
              <th style={{textAlign:"left",paddingLeft:14}}>Player</th>
              <th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th className="sorted">Pts</th>
            </tr></thead>
            <tbody>{A.ownerRanked.map(O=>(
              <tr key={O.owner} style={{opacity:O.out?.5:1}}>
                <td style={{textAlign:"left",paddingLeft:14}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                    <Crest owner={O.owner} size={22}/><b style={{color:"var(--text)"}}>{O.owner}</b>
                    {O.out&&<span className="wc-pill wc-pill--out" style={{marginLeft:4}}>Out</span>}
                  </span>
                </td>
                <td>{O.p}</td><td>{O.w}</td><td>{O.d}</td><td>{O.l}</td>
                <td>{O.gf}</td><td>{O.ga}</td><td>{O.gd>=0?"+":""}{O.gd}</td>
                <td className="sorted"><b style={{color:"var(--text)"}}>{O.pts}</b></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="wc-card wc-pad">
        <BoardHead emoji="🛤" title="Path to Glory" sub="Surviving teams and their current stage"/>
        <PathToGlory A={A} state={state}/>
      </div>

      <div className="wc-card wc-pad">
        <BoardHead emoji="🏅" title="Group Stage Awards" sub="Best performers in the group phase"/>
        <GroupAwards A={A}/>
      </div>

      {A.penaltyBoard.length>0&&<div className="wc-card wc-pad">
        <BoardHead emoji="🥅" title="Penalty Corner" sub="Shootout record for pooled clashes"/>
        <div className="wc-list">{A.penaltyBoard.map((o,i)=>(
          <div key={o.owner} className="wc-list-row">
            <span className="wc-list-rank">{i+1}</span>
            <Crest owner={o.owner} size={22}/>
            <span style={{font:"600 14px 'DM Sans',sans-serif",color:"var(--text)",flex:1}}>{o.owner}</span>
            <span className="wc-muted-sm">{o.pw}W · {o.pl}L</span>
          </div>
        ))}</div>
      </div>}
    </div>
  );
}

function PathToGlory({A,state}){
  const alive=A.ownerRanked.filter(O=>!O.out);
  if(!alive.length) return <p className="wc-muted-sm">Tournament complete.</p>;
  return (
    <div className="wc-path-list">
      {alive.map(O=>(
        <div key={O.owner} className="wc-path-row">
          <Crest owner={O.owner} size={28}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{font:"600 14px 'DM Sans',sans-serif",color:"var(--text)",marginBottom:6}}>{O.owner}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {O.teams.filter(t=>!A.teamOut[t]).map(t=>{
                const koNext=(state.ko||[]).filter(m=>(m.a===t||m.b===t)&&m.hs==null)
                  .sort((a,b)=>KO_ORDER.indexOf(a.round)-KO_ORDER.indexOf(b.round))[0];
                const grp=GROUP_OF[t];
                const stage=koNext?koNext.round:(A.complete[grp]?"Groups done":`Group ${grp}`);
                return (
                  <span key={t} className="wc-team-tag">
                    <FlagDot team={t}/>{t}
                    <span className="wc-muted-sm" style={{fontSize:10,marginLeft:2}}>· {stage}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupAwards({A}){
  const gw=A.groupAwards.groupWinners;
  if(!gw.length) return <p className="wc-muted-sm">Group stage awards will appear as groups complete.</p>;
  const medals=["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","#️⃣","#️⃣"];
  return (
    <div className="wc-brag-list" style={{marginTop:12}}>
      {gw.map((g,i)=>(
        <div key={g.team} className="wc-brag-item">
          <span className="wc-brag-icon">{medals[i]||"·"}</span>
          <div>
            <div style={{font:"500 13px 'DM Sans',sans-serif",color:"var(--text)"}}>
              <FlagDot team={g.team}/><b>{g.team}</b> topped Group {g.L} ({g.pts} pts, {g.gf} goals)
              {g.owner&&<span> · <span className="owntag" style={{color:OWNER_COLOR[g.owner]}}>{g.owner}</span></span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScorerBoard({A}){
  const list=A.scorers, leader=A.bootLeader;
  return (
    <div className="wc-card wc-pad">
      <BoardHead emoji="⚽" title="Golden Boot" sub="Top scorers" holder={leader?OWNER_OF[leader.t]:null}/>
      {list.length===0 && <p className="wc-muted-sm">No goals recorded yet.</p>}
      <div className="wc-list">{list.map((s,i)=>(
        <div key={s.p+s.t} className="wc-list-row">
          <span className="wc-list-rank">{i+1}</span>
          <span className="wc-list-name">{s.p}</span>
          <span className="wc-list-team"><FlagDot team={s.t}/>{s.t}</span>
          <span className="owntag" style={{color:OWNER_COLOR[OWNER_OF[s.t]]}}>{OWNER_OF[s.t]}</span>
          <span className="wc-list-val">{s.g}</span>
        </div>))}</div>
    </div>
  );
}
function GloveBoard({A}){
  const list=A.cleanSheets, leader=A.gloveLeader;
  return (
    <div className="wc-card wc-pad">
      <BoardHead emoji="🧤" title="Golden Glove" sub="Most clean sheets" holder={leader?leader.owner:null}/>
      {list.length===0 && <p className="wc-muted-sm">No clean sheets yet.</p>}
      <div className="wc-list">{list.map((s,i)=>(
        <div key={s.t} className="wc-list-row">
          <span className="wc-list-rank">{i+1}</span>
          <span className="wc-list-team"><FlagDot team={s.t}/><b>{s.t}</b></span>
          <span className="owntag" style={{color:OWNER_COLOR[s.owner]}}>{s.owner}</span>
          <span className="wc-list-val">{s.cs}</span>
        </div>))}</div>
    </div>
  );
}
function BoardHead({emoji,title,sub,holder}){
  return (<div className="wc-board-head">
    <span className="wc-board-icon">{emoji}</span>
    <div><div className="display wc-card-title">{title}</div><div className="wc-muted-sm">{sub}</div></div>
    {holder&&<div className="wc-board-holder"><Crest owner={holder} size={20}/><b>{holder}</b><span className="wc-muted-sm">holds it</span></div>}
  </div>);
}

/* ============================================================ PIECES ============================================================ */
function ProvisionalBanner(){ return <p className="wc-provisional-note">Live — standings update every second and show where things stand right now.</p>; }
function Crest({owner,size=28}){ return <span className="crest" style={{width:size,height:size,flex:`0 0 ${size}px`,fontSize:Math.round(size*.4),background:OWNER_COLOR[owner]}}>{owner[0]}</span>; }
function FlagDot({team}){ return <span className="flagdot" style={{background:OWNER_COLOR[OWNER_OF[team]]||"var(--muted)"}}/>; }
function Shell({children}){ return <div className="wc-shell"><div className="wc-ambient" aria-hidden="true"/><div className="wc-wrap">{children}</div></div>; }
function timeAgo(iso){ const s=(Date.now()-Date.parse(iso))/1000; if(s<60)return "just now"; if(s<3600)return Math.floor(s/60)+"m ago"; if(s<86400)return Math.floor(s/3600)+"h ago"; return Math.floor(s/86400)+"d ago"; }
function fmtHistDate(iso){ if(!iso) return ""; const d=new Date(iso); const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`; }

function Style(){ return <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

  [data-theme="light"]{
    --bg:#F6F6F9;--surface:#FFFFFF;--surface-2:#F0F0F5;
    --line:#E0E0EA;--line-2:#C8C8D3;
    --text:#0C0C18;--muted:#6A6A7E;
    --navy:#001F5B;--red:#C8102E;--green:#006847;
    --gold:#B8920A;--gold-soft:#FFF5D0;
    --accent:var(--navy);--accent-soft:rgba(0,31,91,.07);
    --live:var(--red);--qualify:var(--green);
    --host-ca:var(--red);--host-mx:var(--green);--host-us:var(--navy);
    --shadow:0 1px 2px rgba(12,12,24,.04),0 3px 12px rgba(12,12,24,.06);
    --shadow-hover:0 2px 5px rgba(12,12,24,.05),0 8px 24px rgba(12,12,24,.09);
    --crest-fg:#fff;--crest-ring:#FFFFFF;
    --chip:#EAEAF0;--thead:#F2F2F7;
  }
  [data-theme="dark"]{
    --bg:#0C0C10;--surface:#16161D;--surface-2:#1D1D26;
    --line:#27273A;--line-2:#34344A;
    --text:#EDEDF5;--muted:#80808F;
    --navy:#4D7FD4;--red:#E54B63;--green:#2CB37A;
    --gold:#E0B83A;--gold-soft:rgba(224,184,58,.12);
    --accent:var(--navy);--accent-soft:rgba(77,127,212,.13);
    --live:var(--red);--qualify:var(--green);
    --host-ca:var(--red);--host-mx:var(--green);--host-us:var(--navy);
    --shadow:0 1px 3px rgba(0,0,0,.28),0 4px 18px rgba(0,0,0,.32);
    --shadow-hover:0 2px 6px rgba(0,0,0,.32),0 10px 32px rgba(0,0,0,.40);
    --crest-fg:#0C0C10;--crest-ring:#27273A;
    --chip:#1D1D26;--thead:#16161D;
  }

  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0}

  .wc-shell{position:relative;min-height:100vh;min-height:100dvh;background:var(--bg);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;font-size:15px;line-height:1.55}
  .wc-ambient{position:fixed;inset:0;pointer-events:none;z-index:0;background:
    radial-gradient(ellipse 55% 38% at 10% 0%,color-mix(in srgb,var(--red) 6%,transparent),transparent 60%),
    radial-gradient(ellipse 50% 32% at 88% 4%,color-mix(in srgb,var(--navy) 8%,transparent),transparent 55%)}
  .wc-wrap{position:relative;z-index:1;max-width:900px;margin:0 auto;padding:0 clamp(16px,4vw,28px) clamp(32px,6vw,56px)}
  .display{font-family:'Barlow Condensed','DM Sans',sans-serif;font-weight:700;letter-spacing:.01em;text-transform:uppercase}
  .loading-msg{padding:80px 20px;text-align:center;color:var(--muted)}

  /* ── SIGNATURE ───────────────────────────────────────────────────────────── */
  .tc-stripe{display:flex;height:4px;width:44px;gap:3px;margin-bottom:14px}
  .tc-ca,.tc-mx,.tc-us{flex:1;border-radius:99px}
  .tc-ca{background:var(--red)}
  .tc-mx{background:var(--green)}
  .tc-us{background:var(--navy)}

  /* ── HERO ───────────────────────────────────────────────────────────────── */
  .wc-hero{padding:clamp(28px,5vw,48px) 0 clamp(22px,3.5vw,32px);margin-bottom:24px;border-bottom:1px solid var(--line)}
  .wc-hero-grid{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}
  .wc-hero-copy{min-width:0;flex:1}
  .wc-hero-tools{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;padding-top:4px}
  .wc-eyebrow{display:block;font:600 11px 'DM Sans',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
  .wc-title{margin:0 0 8px;font-family:'Barlow Condensed',sans-serif;font-size:clamp(48px,10vw,72px);font-weight:900;line-height:.96;color:var(--text);letter-spacing:-.01em;text-transform:uppercase}
  .wc-title-sub{color:var(--red);display:block}
  .wc-lead{margin:0;font:400 14px/1.6 'DM Sans',sans-serif;color:var(--muted)}

  /* ── ME PICKER ──────────────────────────────────────────────────────────── */
  .me-chip{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:10px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow)}
  .me-icon{font-size:13px;line-height:1}
  .me-select{border:none;background:transparent;color:var(--text);font:600 12px 'DM Sans',sans-serif;cursor:pointer;padding:0;outline:none;max-width:110px}
  .me-select:focus{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

  /* ── THEME TOGGLE ───────────────────────────────────────────────────────── */
  .theme-switch{display:flex;gap:3px;padding:3px;border-radius:10px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow)}
  .theme-opt{width:30px;height:30px;border:none;border-radius:7px;background:transparent;color:var(--muted);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}
  .theme-opt:hover{color:var(--text);background:var(--chip)}
  .theme-opt:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .theme-opt.on{background:var(--navy);color:#fff}

  /* ── SYNC ───────────────────────────────────────────────────────────────── */
  .sync-chip{display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:10px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow);min-width:148px;max-width:220px}
  .pulse-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .pulse-dot.live{animation:wcBlink 1.1s ease-in-out infinite}
  @keyframes wcBlink{0%,100%{opacity:1}50%{opacity:.3}}
  .sync-chip-txt{font:500 12px 'DM Sans',sans-serif;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
  .sync-btn{width:28px;height:28px;border:1px solid var(--line);border-radius:7px;background:var(--surface-2);color:var(--muted);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s}
  .sync-btn:hover{color:var(--navy);border-color:var(--line-2)}
  .sync-btn:disabled{opacity:.4;cursor:default}
  .btn-soft{border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);font:600 12px 'DM Sans',sans-serif;padding:7px 14px;cursor:pointer;transition:.15s;white-space:nowrap}
  .btn-soft:hover{color:var(--text);border-color:var(--line-2)}
  .wc-link-btn{background:none;border:none;padding:0;font:600 12px 'DM Sans',sans-serif;color:var(--accent);cursor:pointer;text-decoration:underline}

  /* ── LIVE BAR ───────────────────────────────────────────────────────────── */
  .wc-live{margin:0 0 16px;padding:10px 16px;border-radius:12px;border:1px solid color-mix(in srgb,var(--live) 22%,var(--line));background:var(--surface)}
  .wc-live-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0}
  .wc-live-row+.wc-live-row{border-top:1px solid var(--line)}
  .wc-live-badge,.wc-live-dot{font:700 9px 'DM Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:var(--live);padding:3px 7px;border-radius:4px}
  .wc-live-stage{font:600 11px 'DM Sans',sans-serif;color:var(--muted)}
  .wc-live-score{display:inline-flex;align-items:center;gap:6px;font:600 14px 'DM Sans',sans-serif;color:var(--text);flex:1 1 160px}
  .wc-live-score strong{font-family:'Barlow Condensed',sans-serif;font-weight:800;color:var(--gold);font-size:22px;line-height:1}
  .wc-live-score--next{align-items:center;height:22px;gap:8px}
  .wc-match-side{display:inline-flex;align-items:center;gap:6px;height:22px;font:600 14px/22px 'DM Sans',sans-serif}
  .wc-match-vs{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:22px;line-height:22px;height:22px;display:inline-flex;align-items:center;color:var(--muted);flex-shrink:0;padding-bottom:5px}
  .wc-live-clock{margin-left:auto;font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:700;color:var(--live)}

  /* ── NEXT UP ────────────────────────────────────────────────────────────── */
  .wc-next{margin:0 0 16px;padding:10px 16px;border-radius:12px;border:1px solid color-mix(in srgb,var(--navy) 18%,var(--line));background:var(--surface)}
  .wc-next-badge{font:700 9px 'DM Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:var(--navy);padding:3px 7px;border-radius:4px}
  .wc-next-time{margin-left:auto;font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:700;color:var(--navy);white-space:nowrap}

  /* ── WIDGETS ────────────────────────────────────────────────────────────── */
  .wc-widgets{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px}
  .wc-widget{padding:16px 18px;display:flex;flex-direction:column;gap:5px;min-height:84px;border-radius:12px;border:1px solid var(--line);background:var(--surface);box-shadow:var(--shadow);transition:box-shadow .2s}
  .wc-widget:hover{box-shadow:var(--shadow-hover)}
  .wc-widget--wide{grid-column:1/-1}
  .wc-widget-icon{font-size:15px;line-height:1;opacity:.7}
  .wc-widget-val{font-family:'Barlow Condensed',sans-serif;font-size:36px;font-weight:900;color:var(--accent);line-height:1;letter-spacing:-.01em}
  .wc-widget-lbl{font:600 10px 'DM Sans',sans-serif;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
  .wc-widget-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font:600 14px 'DM Sans',sans-serif;color:var(--text)}
  .wc-widget-muted{font:500 13px 'DM Sans',sans-serif;color:var(--muted)}

  /* ── TABS ───────────────────────────────────────────────────────────────── */
  .wc-tabs{display:flex;gap:5px;margin-bottom:22px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px;-webkit-overflow-scrolling:touch}
  .wc-tabs::-webkit-scrollbar{display:none}
  .wc-tab{flex:0 0 auto;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--muted);font:600 13px 'DM Sans',sans-serif;padding:9px 16px;cursor:pointer;white-space:nowrap;box-shadow:var(--shadow);transition:all .15s}
  .wc-tab:hover{color:var(--text);border-color:var(--line-2);background:var(--surface-2)}
  .wc-tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .wc-tab.is-on{background:var(--navy);border-color:var(--navy);color:#fff;box-shadow:var(--shadow-hover)}

  /* ── SHARED CARD ────────────────────────────────────────────────────────── */
  .wc-card{background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}
  .wc-pad{padding:18px 20px}
  .wc-card-title{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;color:var(--text);margin:0}
  .wc-muted-sm{font:500 12px 'DM Sans',sans-serif;color:var(--muted);margin:0}
  .wc-empty{padding:24px 20px;text-align:center;color:var(--muted);font:500 14px 'DM Sans',sans-serif}
  .wc-stack{display:grid;gap:10px}
  .wc-arrow{color:var(--muted);padding:0 4px}

  /* ── FOOTER ─────────────────────────────────────────────────────────────── */
  .wc-main{padding-bottom:8px}
  .wc-foot{padding-top:24px;border-top:1px solid var(--line);font:400 13px/1.7 'DM Sans',sans-serif;color:var(--muted)}
  .wc-foot-note{display:block;margin-top:4px;font-size:12px;opacity:.8}

  /* ── LEADERBOARD ────────────────────────────────────────────────────────── */
  .wc-players{display:grid;gap:10px}
  .wc-player{padding:18px 20px;transition:box-shadow .2s,border-color .2s}
  .wc-player:hover{box-shadow:var(--shadow-hover)}
  .wc-player--lead{border-color:color-mix(in srgb,var(--gold) 35%,var(--line));background:linear-gradient(170deg,color-mix(in srgb,var(--gold-soft) 55%,var(--surface)) 0%,var(--surface) 100%)}
  .wc-player.is-out{opacity:.48}
  .wc-player-top{display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap}
  .wc-player-rank{font-family:'Barlow Condensed',sans-serif;font-size:38px;font-weight:900;color:var(--line-2);width:34px;text-align:center;line-height:1;padding-top:4px;flex-shrink:0;letter-spacing:-.02em}
  .wc-player--lead .wc-player-rank{color:var(--gold)}
  .wc-player-info{flex:1;min-width:140px}
  .wc-player-name-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .wc-player-name{margin:0;font:700 19px/1.2 'DM Sans',sans-serif;color:var(--text)}
  .wc-player-meta{margin:4px 0 0;font:500 13px 'DM Sans',sans-serif;color:var(--muted)}
  .wc-player-odds{text-align:right;flex-shrink:0}
  .wc-odds-val{display:block;font-family:'Barlow Condensed',sans-serif;font-size:30px;font-weight:900;color:var(--accent);line-height:1;letter-spacing:-.01em}
  .wc-odds-lbl{font:600 10px 'DM Sans',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:2px}
  .wc-bar{height:5px;border-radius:99px;background:var(--chip);overflow:hidden;margin-top:12px}
  .wc-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--red),var(--navy))}
  .wc-team-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:12px}
  .wc-team-tag{display:inline-flex;align-items:center;gap:5px;font:500 12px 'DM Sans',sans-serif;color:var(--text);background:var(--chip);padding:4px 10px;border-radius:6px;border:1px solid var(--line)}
  .wc-team-tag.is-out{opacity:.38;text-decoration:line-through}

  /* ── PILLS ──────────────────────────────────────────────────────────────── */
  .wc-pill{font:700 9px 'DM Sans',sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:3px 7px;border-radius:4px}
  .wc-pill--gold{color:var(--gold);background:var(--gold-soft)}
  .wc-pill--in{color:var(--qualify);background:color-mix(in srgb,var(--qualify) 12%,transparent)}
  .wc-pill--out{color:var(--live);background:color-mix(in srgb,var(--live) 10%,transparent)}
  .wc-pill--upset{color:var(--gold);background:var(--gold-soft);font-size:9px}

  /* ── SECTION LABELS ─────────────────────────────────────────────────────── */
  .section-note{font:500 13px/1.65 'DM Sans',sans-serif;color:var(--muted);margin:0 0 16px}
  .section-title{font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text);margin:0 0 12px}

  /* ── GROUPS ─────────────────────────────────────────────────────────────── */
  .wc-groups{display:grid;gap:10px}
  .wc-group{padding:16px 18px 12px}
  .wc-group-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
  .wc-group-badge{width:30px;height:30px;border-radius:6px;background:linear-gradient(135deg,var(--red),var(--navy));color:#fff;font:900 13px 'Barlow Condensed',sans-serif;display:flex;align-items:center;justify-content:center;flex-shrink:0;letter-spacing:.02em}
  .wc-group-title{font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text)}
  .wc-group-status{margin-left:auto;font:500 12px 'DM Sans',sans-serif;color:var(--muted)}
  .wc-legend{display:flex;flex-wrap:wrap;gap:14px;font:500 12px 'DM Sans',sans-serif;color:var(--muted);margin-top:8px}
  .wc-legend .rankdot{margin-right:5px}

  /* ── KNOCKOUTS ──────────────────────────────────────────────────────────── */
  .wc-ko-round{margin-bottom:20px}
  .wc-round-title{font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text);margin:0 0 10px}
  .wc-ko{padding:12px 18px}
  .wc-ko.is-live{border-color:color-mix(in srgb,var(--live) 30%,var(--line))}
  .wc-ko-live{padding-bottom:4px}
  .wc-ko-row{display:flex;align-items:center;gap:8px;padding:8px 0}
  .wc-ko-team{font:600 14px 'DM Sans',sans-serif;color:var(--text)}
  .wc-ko-won{margin-left:auto;font:700 10px 'DM Sans',sans-serif;letter-spacing:.05em;text-transform:uppercase;color:var(--qualify)}
  .wc-ko-score{margin-left:auto;font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:var(--text)}
  .wc-ko-divider{height:1px;background:var(--line);margin:2px 0}
  .wc-clash-side{display:flex;align-items:center;gap:8px;padding:6px 0}
  .wc-clash-team{font:600 14px 'DM Sans',sans-serif;color:var(--text)}
  .wc-clash-score{margin-left:auto;font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:var(--text)}
  .wc-pen{font-size:10px;color:var(--gold)}

  /* ── MATCHES ────────────────────────────────────────────────────────────── */
  .wc-match{padding:14px 18px}
  .wc-match-stage{font:600 10px 'DM Sans',sans-serif;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
  .wc-match-foot{font:600 12px 'DM Sans',sans-serif;color:var(--muted);margin-top:8px;text-align:right}

  /* ── AWARDS/BOARDS ──────────────────────────────────────────────────────── */
  .wc-board-head{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
  .wc-board-icon{font-size:20px;line-height:1}
  .wc-board-holder{margin-left:auto;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
  .wc-list{display:grid;gap:0}
  .wc-list-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}
  .wc-list-row:first-child{border-top:none;padding-top:0}
  .wc-list-rank{width:20px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;color:var(--muted);text-align:center}
  .wc-list-name{font:600 14px 'DM Sans',sans-serif;color:var(--text)}
  .wc-list-team{display:inline-flex;align-items:center;gap:6px;font:500 13px 'DM Sans',sans-serif;color:var(--muted)}
  .wc-list-val{margin-left:auto;font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:var(--text)}
  .wc-odds-row{display:flex;align-items:center;gap:10px;padding:8px 0}
  .wc-odds-row+.wc-odds-row{border-top:1px solid var(--line)}
  .wc-odds-name{width:72px;font:600 13px 'DM Sans',sans-serif;color:var(--text);flex-shrink:0}
  .wc-odds-row .wc-bar{flex:1;margin:0}
  .wc-odds-pct{width:44px;text-align:right;font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:800;color:var(--accent)}

  /* ── CRESTS & DOTS ──────────────────────────────────────────────────────── */
  .crest{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:700;color:var(--crest-fg);border:2px solid var(--crest-ring);box-shadow:0 2px 6px rgba(0,0,0,.08)}
  .flagdot{width:8px;height:8px;border-radius:50%;flex:0 0 8px}
  .owntag{font:600 11px 'DM Sans',sans-serif}

  /* ── TABLES ─────────────────────────────────────────────────────────────── */
  .wc-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--line);border-radius:10px;background:var(--surface-2)}
  table.lt,table.grp{width:100%;min-width:520px;border-collapse:collapse;font:500 13px 'DM Sans',sans-serif;color:var(--muted)}
  table.lt th,table.grp th{font:700 10px 'DM Sans',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:10px 8px;text-align:center;white-space:nowrap;border-bottom:1px solid var(--line);background:var(--thead)}
  table.lt td,table.grp td{padding:10px 8px;text-align:center;border-bottom:1px solid var(--line)}
  table.lt tr:last-child td,table.grp tr:last-child td{border-bottom:none}
  th.sorted,td.sorted{color:var(--accent);font-weight:600}
  .rankdot{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 5px;border-radius:5px;font:700 11px 'DM Sans',sans-serif;color:#fff}
  i.rankdot{min-width:8px;width:8px;height:8px;padding:0;border-radius:50%}

  /* ── PROVISIONAL / LIVE STATES ─────────────────────────────────────────── */
  .wc-provisional-note{font:500 12px 'DM Sans',sans-serif;color:var(--live);background:color-mix(in srgb,var(--live) 8%,transparent);border:1px solid color-mix(in srgb,var(--live) 18%,transparent);border-radius:8px;padding:8px 12px;margin:0 0 14px;display:flex;align-items:center;gap:6px}
  .wc-provisional-note::before{content:"●";font-size:7px;animation:wcBlink 1.1s ease-in-out infinite;flex-shrink:0}
  .wc-prev{font:500 11px 'DM Sans',sans-serif;color:var(--muted);margin-left:4px}
  .wc-rank-delta{font:700 10px 'DM Sans',sans-serif;line-height:1;padding:2px 4px;border-radius:3px}
  .wc-rank-delta--up{color:var(--qualify);background:color-mix(in srgb,var(--qualify) 10%,transparent)}
  .wc-rank-delta--down{color:var(--live);background:color-mix(in srgb,var(--live) 10%,transparent)}
  .wc-player-rank-col{display:flex;flex-direction:column;align-items:center;gap:3px;width:34px;flex-shrink:0}
  .wc-team-tag.is-live{border-color:color-mix(in srgb,var(--live) 30%,var(--line));color:var(--live)}
  .wc-team-tag.is-live .wc-live-dot{font:700 8px 'DM Sans',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:var(--live);padding:2px 5px;border-radius:3px;margin-left:4px;flex-shrink:0}
  table.grp tr.is-changed>td:first-child{border-left:2px solid var(--live)}
  .wc-clash-team.is-lead{color:var(--accent);font-weight:700}
  .wc-ko-team.is-lead{color:var(--accent);font-weight:700}
  .wc-match.is-live{border-color:color-mix(in srgb,var(--live) 28%,var(--line))}

  /* ── FIXTURE STRIP ───────────────────────────────────────────────────────── */
  .wc-fixture-strip{border-top:1px solid var(--line);margin-top:10px;padding-top:8px;display:grid;gap:4px}
  .wc-fixture-row{display:grid;grid-template-columns:1fr auto 1fr 72px;align-items:center;gap:6px;font:500 12px 'DM Sans',sans-serif;color:var(--muted);padding:3px 0}
  .wc-fixture-row.is-live{color:var(--text)}
  .wc-fixture-home{display:flex;align-items:center;gap:5px;justify-content:flex-end;text-align:right}
  .wc-fixture-away{display:flex;align-items:center;gap:5px;text-align:left}
  .wc-fixture-score{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;color:var(--text);min-width:44px;text-align:center;white-space:nowrap}
  .wc-fixture-row.is-live .wc-fixture-score{color:var(--gold)}
  .wc-fixture-meta{display:flex;align-items:center;gap:4px;justify-content:flex-end;white-space:nowrap}
  .wc-fixture-clock{font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:var(--live)}

  /* ── PRIZES ─────────────────────────────────────────────────────────────── */
  .wc-prize-board{display:grid;gap:10px}
  .wc-prize-slot{padding:18px 20px;transition:box-shadow .2s}
  .wc-prize-slot.is-won{border-color:color-mix(in srgb,var(--gold) 30%,var(--line));background:linear-gradient(160deg,color-mix(in srgb,var(--gold-soft) 40%,var(--surface)) 0%,var(--surface) 100%)}
  .wc-prize-top{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
  .wc-prize-icon{font-size:26px;line-height:1;flex-shrink:0;margin-top:2px}
  .wc-prize-text{flex:1}
  .wc-prize-label{font-size:16px;margin-bottom:2px}
  .wc-prize-holder{display:flex;align-items:center}

  /* ── TIMELINE ───────────────────────────────────────────────────────────── */
  .wc-timeline{display:grid;gap:0;margin-top:12px}
  .wc-timeline-row{display:flex;gap:12px;padding:10px 0;border-top:1px solid var(--line)}
  .wc-timeline-row:first-child{border-top:none;padding-top:0}
  .wc-timeline-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;background:var(--muted)}
  .wc-timeline-row--player_out .wc-timeline-dot{background:var(--gold)}
  .wc-timeline-row--champion .wc-timeline-dot{background:var(--qualify);width:10px;height:10px;margin-top:4px}
  .wc-timeline-row--team_out .wc-timeline-dot{background:var(--live)}
  .wc-timeline-body{flex:1;min-width:0}
  .wc-timeline-text{font:500 13px 'DM Sans',sans-serif;color:var(--text);display:flex;align-items:center;gap:5px;flex-wrap:wrap;line-height:1.5}

  /* ── MY TEAMS ───────────────────────────────────────────────────────────── */
  .wc-myteams-pick{padding:8px 0}
  .wc-player-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:12px}
  .wc-player-grid--compact{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}
  .wc-player-pick-btn{padding:14px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;border-radius:12px;border:2px solid var(--pc,var(--line));background:var(--surface);transition:all .15s;text-align:center}
  .wc-player-pick-btn:hover{box-shadow:var(--shadow-hover);border-color:var(--pc,var(--line-2));transform:translateY(-1px)}
  .wc-player-pick-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .wc-myteams-who{display:flex;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap}
  .wc-myteams-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding-top:14px;border-top:1px solid var(--line)}
  .wc-myteams-stat{display:flex;flex-direction:column;gap:4px;text-align:center}

  /* ── DRAMA ──────────────────────────────────────────────────────────────── */
  .wc-upset-card{padding:14px 18px}
  .wc-upset-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .wc-upset-teams{display:grid;gap:4px}
  .wc-upset-side{display:flex;align-items:center;gap:8px;font:500 13px 'DM Sans',sans-serif;color:var(--text)}
  .wc-upset-side--lose{opacity:.55}
  .wc-upset-score{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:var(--gold);padding:4px 0;text-align:center}
  .wc-luck-list{display:grid;gap:6px}
  .wc-luck-row{display:flex;align-items:center;gap:10px}
  .wc-luck-bar-wrap{flex:1;min-width:60px}
  .wc-luck-bar{height:6px;background:var(--chip);border-radius:99px;overflow:hidden}
  .wc-luck-fill{height:100%;background:linear-gradient(90deg,var(--navy),var(--red));border-radius:99px;transition:width .4s ease}
  .wc-brag-list{display:grid;gap:12px;margin-top:4px}
  .wc-brag-item{display:flex;gap:12px;align-items:flex-start}
  .wc-brag-icon{font-size:20px;flex-shrink:0;line-height:1.3}
  .wc-share-grid{display:grid;gap:6px;margin-top:12px}
  .wc-share-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);transition:.15s;text-align:left;width:100%}
  .wc-share-btn:hover{box-shadow:var(--shadow-hover);border-color:var(--line-2)}
  .wc-share-copy{font:600 11px 'DM Sans',sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-left:auto;transition:.15s}
  .wc-share-copy.is-copied{color:var(--qualify)}

  /* ── STATS ──────────────────────────────────────────────────────────────── */
  .wc-path-list{display:grid;gap:14px;margin-top:4px}
  .wc-path-row{display:flex;gap:14px;align-items:flex-start}

  /* ── RESPONSIVE ─────────────────────────────────────────────────────────── */
  @media (min-width:700px){
    .wc-widgets{grid-template-columns:repeat(4,1fr)}
    .wc-widget--wide{grid-column:span 4}
    .wc-prize-board{grid-template-columns:repeat(3,1fr)}
    .wc-myteams-stats{grid-template-columns:repeat(4,1fr)}
  }
  @media (max-width:640px){
    .wc-hero-grid{flex-direction:column}
    .wc-hero-tools{align-items:stretch;width:100%}
    .theme-switch{justify-content:center}
    .sync-chip{max-width:none}
    .me-chip{justify-content:center}
    .wc-player-top{gap:10px}
    .wc-player-odds{width:100%;text-align:left;display:flex;align-items:baseline;gap:10px;padding-top:10px;border-top:1px solid var(--line)}
    .wc-odds-lbl{margin-left:auto}
    .wc-myteams-stats{grid-template-columns:repeat(2,1fr)}
  }
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`}</style>; }


ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
