import { OWNER_OF, OWNER_COLOR } from '../../data/owners.js';
import { fmtHistDate } from '../../lib/format.js';
import { Crest, FlagDot } from '../ui/primitives.jsx';
import { BoardHead } from '../ui/BoardHead.jsx';

function PrizeSlot({ icon, label, prize, holder, team, extra, empty }) {
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
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Crest owner={holder} size={36}/>
            <div>
              <div style={{ font:"700 17px 'DM Sans',sans-serif", color:"var(--text)" }}>{holder}</div>
              {team && <div className="wc-muted-sm"><FlagDot team={team}/> {team}</div>}
              {extra && <div className="wc-muted-sm">{extra}</div>}
            </div>
          </div>
        ) : (
          <span className="wc-muted-sm" style={{ fontStyle:"italic" }}>{empty}</span>
        )}
      </div>
    </div>
  );
}

function GoalsBoard({ A }) {
  return (
    <div className="wc-card wc-pad">
      <BoardHead emoji="🥈" title="2nd Place Race" sub="Team with most goals wins second place"/>
      {A.goalsBoard.length === 0 && <p className="wc-muted-sm">No goals recorded yet.</p>}
      <div className="wc-list">
        {A.goalsBoard.slice(0, 12).map((x, i) => (
          <div key={x.t} className="wc-list-row">
            <span className="wc-list-rank">{i+1}</span>
            <span className="wc-list-team"><FlagDot team={x.t}/><b>{x.t}</b></span>
            <span className="owntag" style={{ color:OWNER_COLOR[x.owner] }}>{x.owner}</span>
            <span className="wc-list-val">{x.goals}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EliminationTimeline({ state, A }) {
  const history = (state.history || []).slice().sort((a, b) => b.ts - a.ts);
  return (
    <div className="wc-card wc-pad">
      <BoardHead emoji="⏱" title="Timeline" sub="Eliminations and milestones — logged as they happen"/>
      {history.length === 0 && (
        <>
          <p className="wc-muted-sm" style={{ marginBottom:12 }}>History accrues from this point forward. Most at risk right now:</p>
          {A.ownerRanked.filter(o => !o.out).sort((a, b) => a.teamsLeft - b.teamsLeft).slice(0, 3).map(o => (
            <div key={o.owner} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderTop:"1px solid var(--line)" }}>
              <Crest owner={o.owner} size={22}/>
              <span style={{ font:"600 14px 'DM Sans',sans-serif", color:"var(--text)" }}>{o.owner}</span>
              <span className="wc-muted-sm">{o.teamsLeft} team{o.teamsLeft!==1?"s":""} left</span>
            </div>
          ))}
        </>
      )}
      <div className="wc-timeline">
        {history.map(h => (
          <div key={h.key} className={"wc-timeline-row wc-timeline-row--"+h.type}>
            <div className="wc-timeline-dot"/>
            <div className="wc-timeline-body">
              <div className="wc-timeline-text">
                {h.type==="team_out" && <><FlagDot team={h.team}/> <b>{h.team}</b> eliminated · <span className="owntag" style={{ color:OWNER_COLOR[h.owner] }}>{h.owner}</span></>}
                {h.type==="player_out" && <><Crest owner={h.owner} size={18}/> <b>{h.owner}</b> — all teams out · wins the booze bet!</>}
                {h.type==="champion" && <><FlagDot team={h.team}/> <b>{h.team}</b> are World Champions! <span className="owntag" style={{ color:OWNER_COLOR[h.owner] }}>{h.owner}</span> wins the sweepstake!</>}
              </div>
              {h.at && <div className="wc-muted-sm">{fmtHistDate(h.at)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrizesView({ A, state }) {
  const champ = A.champion, champO = champ ? OWNER_OF[champ] : null;
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
          empty={(() => { const r = A.ownerRanked.filter(o => !o.out).sort((a, b) => a.teamsLeft - b.teamsLeft)[0]; return r ? `${r.owner} most at risk (${r.teamsLeft} teams)` : "Everyone still alive"; })()}/>
      </div>

      <GoalsBoard A={A}/>
      <EliminationTimeline state={state} A={A}/>

      <div className="wc-card wc-pad">
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>🏆</span>
          <div>
            <div className="display wc-card-title">Champions</div>
            <div className="wc-muted-sm">Winners of the World Cup</div>
          </div>
          {champO && <div style={{ marginLeft:"auto", textAlign:"right" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end" }}>
              <Crest owner={champO} size={22}/>
              <b className="display" style={{ fontSize:18, color:"var(--text)" }}>{champO}</b>
            </div>
            <div className="wc-muted-sm">{champ}</div>
          </div>}
        </div>
        {!champO && <p className="wc-muted-sm" style={{ marginTop:8 }}>Crowned automatically once the Final is played.</p>}
      </div>

      <div className="wc-card wc-pad">
        <div className="display wc-card-title" style={{ marginBottom:4 }}>Trophy Odds</div>
        <p className="wc-muted-sm" style={{ marginBottom:10 }}>Chance the winner comes from each player's surviving teams — bookmaker prices, adjusted live.</p>
        {A.ownerRanked.map(O => (
          <div key={O.owner} className="wc-odds-row" style={{ opacity:O.out?.5:1 }}>
            <Crest owner={O.owner} size={20}/>
            <span className="wc-odds-name">{O.owner}</span>
            <div className="wc-bar"><div className="wc-bar-fill" style={{ width:`${Math.min(100,O.odds)}%` }}/></div>
            <span className="wc-odds-pct">{O.odds.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
