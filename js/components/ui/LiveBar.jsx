import { FlagDot } from './primitives.jsx';

export function LiveBar({ matches }) {
  if (!matches.length) return null;
  return (
    <section className="wc-live wc-card" aria-label="Live matches">
      {matches.map((m, i) => (
        <div key={m.a+"|"+m.b+"|"+i} className="wc-live-row">
          <span className="wc-live-badge">Live</span>
          <span className="wc-live-stage">{m.stage}</span>
          <span className="wc-live-score">
            <FlagDot team={m.a}/>{m.a}{" "}
            <strong>{m.ga}–{m.gb}</strong>
            {m.pa != null && m.pb != null && (
              <span className="wc-live-pens"> ({m.pa}–{m.pb} pens)</span>
            )}
            {" "}<FlagDot team={m.b}/>{m.b}
          </span>
          {m.clock && <span className="wc-live-clock">{m.clock}</span>}
        </div>
      ))}
    </section>
  );
}

export function NextMatchBar({ match }) {
  if (!match) return null;
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
        <span className="wc-next-time">
          {match.kickoff}{match.detail && match.detail !== match.kickoff ? ` · ${match.detail}` : ""}
        </span>
      </div>
    </section>
  );
}
