import { useState, useEffect, useRef, useMemo } from 'react';
import { OWNERS, OWNER_OF } from './data/owners.js';
import { ALL_TEAMS } from './data/tournament.js';
import { TABS, THEME_KEY, ME_KEY } from './data/config.js';
import { analyse, confirmedState } from './lib/scoring.js';
import { tabFromHash, selectTab } from './lib/tabs.js';
import { loadPersistedState, writePersistedState } from './lib/sync/storage.js';
import { readThemePref, applyTheme } from './lib/sync/theme.js';
import { mergeLive } from './lib/sync/mergeLive.js';
import { fetchLive } from './lib/sync/fetchLive.js';
import { useMutable } from './hooks/useMutable.js';
import { useLatestValue } from './hooks/useLatestValue.js';
import { DEFAULT_STATE } from './data/seed.js';
import { Shell } from './components/ui/primitives.jsx';
import { ThemeToggle, SyncBar } from './components/ui/SyncBar.jsx';
import { LiveBar, NextMatchBar } from './components/ui/LiveBar.jsx';
import { WcWidgets } from './components/ui/WcWidgets.jsx';
import { Leaderboard } from './components/views/Leaderboard.jsx';
import { HeadToHead } from './components/views/HeadToHead.jsx';
import { GroupsView } from './components/views/GroupsView.jsx';
import { BracketView } from './components/views/BracketView.jsx';
import { PrizesView } from './components/views/PrizesView.jsx';
import { MyTeamsView } from './components/views/MyTeamsView.jsx';
import { DramaView } from './components/views/DramaView.jsx';
import { StatsView } from './components/views/StatsView.jsx';
import { BestThirdsView } from './components/views/BestThirdsView.jsx';
import { CircleView } from './components/views/CircleView.jsx';
import { GoalCelebration } from './components/ui/GoalCelebration.jsx';

function readMe() {
  try { const v = localStorage.getItem(ME_KEY); return OWNERS.includes(v) ? v : ""; } catch (e) { return ""; }
}

export default function App() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState(tabFromHash);
  const [goalFlash, setGoalFlash] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [themePref, setThemePref] = useState(readThemePref);
  const [me, setMe] = useState(readMe);
  const stateRef = useLatestValue(state);

  useEffect(() => { applyTheme(themePref); try { localStorage.setItem(THEME_KEY, themePref); } catch (e) {} }, [themePref]);
  useEffect(() => { try { localStorage.setItem(ME_KEY, me); } catch (e) {} }, [me]);
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (themePref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme:dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themePref]);
  useEffect(() => {
    (async () => {
      const persisted = await loadPersistedState();
      if (persisted) setState(persisted);
      setLoaded(true);
    })();
  }, []);

  const persistNow = async (next) => { setState(next); await writePersistedState(next); };

  // Goal detection: track previous live match scores to fire celebration on increase
  const prevLiveScoresRef = useRef(null);
  useEffect(() => {
    const liveMatches = state.liveMatches || [];
    const prev = prevLiveScoresRef.current;
    if (prev !== null) {
      let scored = false;
      liveMatches.forEach(m => {
        const key = [m.a, m.b].sort().join('|');
        const p = prev[key];
        if (p && (m.ga > p.ga || m.gb > p.gb)) scored = true;
      });
      if (scored) setGoalFlash(n => n + 1);
    }
    const next = {};
    liveMatches.forEach(m => { next[[m.a, m.b].sort().join('|')] = { ga: m.ga, gb: m.gb }; });
    prevLiveScoresRef.current = next;
  }, [state.liveMatches]);

  const liveRef = useMutable(false);
  const pollRef = useMutable(null);
  const syncBusy = useMutable(false);
  const lastFullRef = useMutable(0);
  const didSync = useMutable(false);

  async function runSync({ manual = false, scope = "full" } = {}) {
    if (syncBusy.get()) {
      if (!manual) return;
      // Manual sync: wait up to 2 s for the in-flight auto-poll to finish
      // before proceeding, so they never merge against the same base state.
      let waited = 0;
      while (syncBusy.get() && waited < 2000) {
        await new Promise(r => setTimeout(r, 50));
        waited += 50;
      }
      if (syncBusy.get()) return;
    }
    syncBusy.set(true);
    if (manual) setSyncing(true);
    const payload = await fetchLive({ scope }).catch(e => ({ __error: e }));
    if (payload.__error) {
      // Always surface sync errors — not just for manual clicks — so the UI
      // reflects a degraded state instead of showing stale data silently.
      const msg = String(payload.__error.message || payload.__error);
      setState(prev => ({ ...prev, syncError: msg }));
      syncBusy.set(false);
      if (manual) setSyncing(false);
      return;
    }
    let base = stateRef.get();
    if (manual) { const persisted = await loadPersistedState(); if (persisted) base = persisted; }
    liveRef.set((payload.liveCount || 0) > 0);
    if (scope === "full") lastFullRef.set(Date.now());
    await persistNow(mergeLive(base, payload));
    syncBusy.set(false);
    if (manual) setSyncing(false);
  }

  const doSync = () => runSync({ manual: true, scope: "full" });

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    const pollDelay = () => {
      if (document.hidden) return liveRef.get() ? 30000 : 120000;
      // 10 s during live matches — fast enough to catch goals within one polling
      // cycle while being ~6× more polite to ESPN's unofficial API than 1 s.
      return liveRef.get() ? 10000 : 60000;
    };
    const schedule = () => {
      if (cancelled) return;
      const t = pollRef.get(); if (t) clearTimeout(t);
      pollRef.set(setTimeout(tick, pollDelay()));
    };
    const tick = async () => {
      if (cancelled) return;
      const needFull = !lastFullRef.get() || Date.now() - lastFullRef.get() > 3600000;
      const scope = liveRef.get() ? "live" : (needFull ? "full" : "live");
      await runSync({ scope });
      if (!cancelled) schedule();
    };
    const onVis = () => schedule();
    (async () => {
      if (!didSync.get()) { didSync.set(true); await runSync({ manual: true, scope: "full" }); }
      if (!cancelled) schedule();
    })();
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; clearTimeout(pollRef.get()); document.removeEventListener("visibilitychange", onVis); };
  }, [loaded]);

  const { A, Aconf, liveActive, liveTeams } = useMemo(() => {
    const liveActive = (state.liveCount || 0) > 0;
    const liveTeams = new Set((state.liveMatches || []).flatMap(m => [m.a, m.b]));
    return { A: analyse(state), Aconf: analyse(confirmedState(state)), liveActive, liveTeams };
  }, [state]);

  if (!loaded) return <Shell><div className="loading-msg">Loading the sweepstake…</div></Shell>;

  const standing = OWNERS.filter(o => !A.owner[o].out).length;
  const teamsLeft = ALL_TEAMS.filter(t => OWNER_OF[t] && !A.teamOut[t]).length;
  const leader = A.ownerRanked[0];
  const goalsLeader = A.goalsLeader;
  const liveMatchMap = {};
  (state.liveMatches || []).forEach(m => { const k = [m.a, m.b].sort().join("|"); liveMatchMap[k] = m; });

  return (
    <Shell>
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
              <select className="me-select" value={me} onChange={e => setMe(e.target.value)} aria-label="Who am I">
                <option value="">Who am I?</option>
                {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      {(state.liveCount || 0) > 0 && <LiveBar matches={state.liveMatches || []}/>}

      <WcWidgets standing={standing} teamsLeft={teamsLeft} leader={leader} goalsLeader={goalsLeader} firstOut={A.firstOut} ownerRanked={A.ownerRanked}/>

      {!(state.liveCount || 0) && state.nextScheduled && <NextMatchBar match={state.nextScheduled}/>}

      <nav className="wc-tabs" aria-label="Sections">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" className={"wc-tab"+(tab===k?" is-on":"")} onClick={() => selectTab(k, setTab)}>{l}</button>
        ))}
      </nav>

      <main className="wc-main">
        {tab === "leaderboard" && <Leaderboard A={A} Aconf={Aconf} liveActive={liveActive} liveTeams={liveTeams}/>}
        {tab === "myteams"     && <MyTeamsView A={A} state={state} me={me} setMe={setMe} liveTeams={liveTeams} liveMatchMap={liveMatchMap}/>}
        {tab === "groups"      && <GroupsView A={A} Aconf={Aconf} state={state} liveTeams={liveTeams} liveMatchMap={liveMatchMap}/>}
        {tab === "thirds"      && <BestThirdsView A={A} Aconf={Aconf} liveActive={liveActive}/>}
        {tab === "knockouts"   && <BracketView A={A} state={state} liveMatchMap={liveMatchMap}/>}
        {tab === "circle"      && <CircleView A={A} state={state}/>}
        {tab === "h2h"         && <HeadToHead A={A} Aconf={Aconf} liveActive={liveActive}/>}
        {tab === "prizes"      && <PrizesView A={A} state={state}/>}
        {tab === "drama"       && <DramaView A={A} state={state}/>}
        {tab === "stats"       && <StatsView A={A} state={state}/>}
      </main>

      <footer className="wc-foot">
        One link for the squad — everyone sees the same live standings.
        <span className="wc-foot-note">Scores from ESPN · live matches update every 10 seconds</span>
      </footer>

      {goalFlash > 0 && <GoalCelebration key={goalFlash} onDone={() => setGoalFlash(0)}/>}
    </Shell>
  );
}
