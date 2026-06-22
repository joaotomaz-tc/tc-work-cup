import { Crest, FlagDot } from './primitives.jsx';

export function BoardHead({ emoji, title, sub, holder, team }) {
  return (
    <div className="wc-board-head">
      <span className="wc-board-icon">{emoji}</span>
      <div>
        <div className="display wc-card-title">{title}</div>
        {sub && <div className="wc-muted-sm">{sub}</div>}
      </div>
      {holder && (
        <div className="wc-board-holder">
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Crest owner={holder} size={20}/>
            <b style={{ font:"700 13px 'DM Sans',sans-serif" }}>{holder}</b>
          </div>
          {team && <div className="wc-muted-sm"><FlagDot team={team}/> {team}</div>}
        </div>
      )}
    </div>
  );
}

export function ClashSide({ team, owner, score, pen, lose, lead }) {
  return (
    <div className="wc-clash-side" style={{ opacity:lose?.55:1 }}>
      <FlagDot team={team}/>
      <span className={"wc-clash-team"+(lead?" is-lead":"")}>{team}</span>
      {owner && <span className="owntag" style={{ color:"var(--muted)" }}>{owner}</span>}
      <span className="wc-clash-score">{score}{pen!=null?<sup className="wc-pen"> ({pen})</sup>:null}</span>
    </div>
  );
}
