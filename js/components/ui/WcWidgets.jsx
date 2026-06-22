import { OWNER_COLOR } from '../../data/owners.js';
import { Crest, FlagDot } from './primitives.jsx';

export function WcWidgets({ standing, teamsLeft, leader, goalsLeader, firstOut, ownerRanked }) {
  const atRisk = ownerRanked.filter(o => !o.out).sort((a, b) => a.teamsLeft - b.teamsLeft || a.odds - b.odds)[0];
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
        <span className="wc-widget-row">
          <Crest owner={leader.owner} size={24}/>
          <b style={{ color:OWNER_COLOR[leader.owner] }}>{leader.owner}</b>
        </span>
      </div>
      <div className="wc-widget wc-card">
        <span className="wc-widget-icon">🥅</span>
        <span className="wc-widget-lbl">Most goals</span>
        {goalsLeader ? (
          <span className="wc-widget-row">
            <FlagDot team={goalsLeader.team}/>
            <b>{goalsLeader.team}</b>
            <span className="wc-widget-muted">{goalsLeader.goals} · {goalsLeader.owner}</span>
          </span>
        ) : <span className="wc-widget-muted">No goals yet</span>}
      </div>
      <div className="wc-widget wc-widget--wide wc-card">
        <span className="wc-widget-icon">🍻</span>
        <span className="wc-widget-lbl">Booze bet — first eliminated wins a drink from the cup winner</span>
        <span className="wc-widget-row wc-widget-muted">
          {firstOut
            ? <><Crest owner={firstOut.owner} size={18}/><span style={{ color:OWNER_COLOR[firstOut.owner] }}>{firstOut.owner}</span><span className="wc-widget-muted">wins it — all teams out!</span></>
            : atRisk
              ? <><span className="wc-widget-muted">Nobody out yet ·</span><span style={{ color:OWNER_COLOR[atRisk.owner] }}>{atRisk.owner}</span><span className="wc-widget-muted">most at risk ({atRisk.teamsLeft} team{atRisk.teamsLeft!==1?"s":""} left)</span></>
              : <span>Nobody eliminated yet</span>
          }
        </span>
      </div>
    </div>
  );
}
