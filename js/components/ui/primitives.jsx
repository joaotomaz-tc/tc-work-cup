import { OWNER_COLOR, OWNER_OF } from '../../data/owners.js';

export function Crest({ owner, size = 28 }) {
  return (
    <span
      className="crest"
      style={{ width:size, height:size, flex:`0 0 ${size}px`, fontSize:Math.round(size*.4), background:OWNER_COLOR[owner] }}
    >
      {owner[0]}
    </span>
  );
}

export function FlagDot({ team }) {
  return <span className="flagdot" style={{ background: OWNER_COLOR[OWNER_OF[team]] || "var(--muted)" }}/>;
}

export function Shell({ children }) {
  return (
    <div className="wc-shell">
      <div className="wc-ambient" aria-hidden="true"/>
      <div className="wc-wrap">{children}</div>
    </div>
  );
}

export function ProvisionalBanner() {
  return <p className="wc-provisional-note">Live — standings update every second and show where things stand right now.</p>;
}
