import { useState, useEffect } from 'react';
import { OWNERS, OWNER_OF, OWNER_COLOR } from '../../data/owners.js';
import { GROUP_OF } from '../../data/tournament.js';
import { KO_ORDER } from '../../data/bracket.js';
import { Crest, FlagDot } from '../ui/primitives.jsx';
import { LiveBar, NextMatchBar } from '../ui/LiveBar.jsx';
import { ClashSide } from '../ui/BoardHead.jsx';

export function MyTeamsView({ A, state, me, setMe, liveTeams, liveMatchMap }) {
  const [viewAs, setViewAs] = useState(me || "");
  useEffect(() => { if (me && !viewAs) setViewAs(me); }, [me]);

  const pickPermanently = (o) => { setMe(o); setViewAs(o); };
  const currentPlayer = viewAs || me;

  if (!currentPlayer) {
    return (
      <div className="wc-myteams-pick">
        <p className="section-note">Who are you in this sweepstake? Pick your name to see your teams, schedule and personal stats.</p>
        <div className="wc-player-grid">
          {OWNERS.map(o => (
            <button key={o} className="wc-player-pick-btn wc-card" onClick={() => pickPermanently(o)} style={{ "--pc":OWNER_COLOR[o] }}>
              <Crest owner={o} size={32}/>
              <span style={{ font:"600 14px 'DM Sans',sans-serif", color:"var(--text)" }}>{o}</span>
              <span className="wc-muted-sm" style={{ fontSize:11 }}>{A.owner[o].teamsLeft}/{A.owner[o].teams.length} alive</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const O = A.owner[currentPlayer];
  const h2hData = A.h2hRanked.find(x => x.owner === currentPlayer) || { pts:0, w:0, d:0, l:0 };
  const oddsRank = A.ownerRanked.findIndex(x => x.owner === currentPlayer) + 1;
  const h2hRank = A.h2hRanked.findIndex(x => x.owner === currentPlayer) + 1;
  const myTeams = O.teams;
  const liveNow = (state.liveMatches || []).filter(m => myTeams.includes(m.a) || myTeams.includes(m.b));
  const nextMyTeam = state.nextScheduled && (myTeams.includes(state.nextScheduled.a) || myTeams.includes(state.nextScheduled.b)) ? state.nextScheduled : null;
  const myClashes = A.clashes.filter(c => myTeams.includes(c.a) || myTeams.includes(c.b)).slice(0, 8);

  return (
    <div className="wc-stack">
      <div className="wc-card wc-pad">
        <div className="wc-myteams-who">
          <Crest owner={currentPlayer} size={48}/>
          <div style={{ flex:1 }}>
            <div style={{ font:"700 22px 'DM Sans',sans-serif", color:"var(--text)", lineHeight:1.2 }}>{currentPlayer}</div>
            <div className="wc-muted-sm" style={{ marginTop:4 }}>Rank #{oddsRank} · {O.teamsLeft}/{O.teams.length} teams alive</div>
          </div>
          <button className="btn-soft" onClick={() => setViewAs("")}>Change</button>
        </div>
        <div className="wc-myteams-stats">
          <div className="wc-myteams-stat"><span className="wc-widget-val">{O.odds.toFixed(1)}%</span><span className="wc-widget-lbl">Trophy odds</span></div>
          <div className="wc-myteams-stat"><span className="wc-widget-val">#{oddsRank}</span><span className="wc-widget-lbl">Odds rank</span></div>
          <div className="wc-myteams-stat"><span className="wc-widget-val">{h2hData.pts}</span><span className="wc-widget-lbl">H2H pts</span></div>
          <div className="wc-myteams-stat"><span className="wc-widget-val">#{h2hRank}</span><span className="wc-widget-lbl">H2H rank</span></div>
        </div>
      </div>

      <h2 className="section-title">Your teams</h2>
      <div className="wc-stack">
        {myTeams.map(t => {
          const L = GROUP_OF[t]; const st = A.standings[L].find(s => s.name === t);
          const out = A.teamOut[t]; const isLive = liveTeams?.has(t);
          const liveScore = (state.liveMatches || []).find(m => m.a === t || m.b === t);
          return (
            <div key={t} className={"wc-card wc-pad"+(out?" is-out":"")} style={{ opacity:out?.55:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <FlagDot team={t}/>
                <div style={{ flex:1 }}>
                  <div style={{ font:"700 16px 'DM Sans',sans-serif", color:out?"var(--muted)":"var(--text)" }}>{t}</div>
                  <div className="wc-muted-sm">Group {L} · Rank {st?.rank||"?"} · {st?.pts||0} pts · {st?.gf||0} goals</div>
                </div>
                {isLive && liveScore && <span className="wc-live-score" style={{ fontSize:13, flex:"none" }}><strong style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, color:"var(--gold)" }}>{liveScore.ga}–{liveScore.gb}</strong></span>}
                {isLive && <span className="wc-live-badge">Live</span>}
                {!isLive && out && <span className="wc-pill wc-pill--out">Out</span>}
                {!isLive && !out && <span className="wc-pill wc-pill--in">In</span>}
              </div>
            </div>
          );
        })}
      </div>

      {liveNow.length > 0 && <><h2 className="section-title">Playing now</h2><LiveBar matches={liveNow}/></>}
      {nextMyTeam && <><h2 className="section-title">Next up today</h2><NextMatchBar match={nextMyTeam}/></>}

      {myClashes.length > 0 && <>
        <h2 className="section-title">Recent results</h2>
        <div className="wc-stack">
          {myClashes.map((c, i) => {
            const winTeam = !c.live ? (c.ga>c.gb?c.a:c.ga<c.gb?c.b:(c.pens?(c.pens[0]>c.pens[1]?c.a:c.b):null)) : null;
            return (
              <div key={i} className={"wc-card wc-match"+(c.live?" is-live":"")}>
                <div className="wc-match-stage">{c.live && <span className="wc-live-badge" style={{ marginRight:6 }}>Live</span>}{c.stage}</div>
                <ClashSide team={c.a} owner={c.oa} score={c.ga} pen={c.pens?c.pens[0]:null} lose={winTeam&&winTeam!==c.a} lead={c.live&&c.ga>c.gb}/>
                <div style={{ height:1, background:"var(--line)", margin:"2px 0" }}/>
                <ClashSide team={c.b} owner={c.ob} score={c.gb} pen={c.pens?c.pens[1]:null} lose={winTeam&&winTeam!==c.b} lead={c.live&&c.gb>c.ga}/>
              </div>
            );
          })}
        </div>
      </>}

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:4 }}>
        <span className="wc-muted-sm">Viewing as {currentPlayer}</span>
        {currentPlayer !== me && <button className="wc-link-btn" onClick={() => setViewAs(me || "")}>Back to {me || "my teams"}</button>}
        <button className="wc-link-btn" onClick={() => setViewAs("")}>View another player</button>
      </div>

      <h2 className="section-title" style={{ marginTop:8 }}>Peek at another player</h2>
      <div className="wc-player-grid wc-player-grid--compact">
        {OWNERS.filter(o => o !== currentPlayer).map(o => (
          <button key={o} className="wc-player-pick-btn wc-card" onClick={() => setViewAs(o)} style={{ "--pc":OWNER_COLOR[o] }}>
            <Crest owner={o} size={24}/>
            <span style={{ font:"600 13px 'DM Sans',sans-serif", color:"var(--text)" }}>{o}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
