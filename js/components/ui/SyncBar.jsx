import { timeAgo } from '../../lib/format.js';

export function ThemeToggle({ pref, onChange }) {
  const opts = [["light","☀"],["dark","☾"],["system","◐"]];
  return (
    <div className="theme-switch" role="group" aria-label="Color theme">
      {opts.map(([k, glyph]) => (
        <button key={k} type="button" className={"theme-opt"+(pref===k?" on":"")}
          onClick={() => onChange(k)} aria-label={k} aria-pressed={pref===k}>{glyph}</button>
      ))}
    </div>
  );
}

export function SyncBar({ state, syncing, onSync, compact }) {
  const last = state.lastSync ? timeAgo(state.lastSync) : "never";
  const live = (state.liveCount || 0) > 0;
  const dot = syncing ? "var(--accent)" : live ? "var(--live)" : (state.syncError ? "var(--live)" : "var(--qualify)");
  const short = syncing ? "Syncing…" : state.syncError ? "Failed" : live ? `Live · ${state.liveCount}` : `${last}`;
  const full = syncing ? "Syncing latest results…" : state.syncError
    ? `Sync failed — ${state.syncError}`
    : live ? `Live · ${state.liveCount} match${state.liveCount===1?"":"es"} · ${last}` : `Updated ${last}`;
  if (compact) return (
    <div className="sync-chip" title={full}>
      <span className={"pulse-dot"+(live&&!syncing?" live":"")} style={{ background:dot }}/>
      <span className="sync-chip-txt">{short}</span>
      <button type="button" className="sync-btn" onClick={onSync} disabled={syncing} aria-label="Sync now">↻</button>
    </div>
  );
  return (
    <div className="sync-wide">
      <span className={"pulse-dot"+(live&&!syncing?" live":"")} style={{ background:dot }}/>
      <span className="sync-wide-txt">{full}</span>
      <button type="button" className="btn-soft" onClick={onSync} disabled={syncing}>Sync</button>
    </div>
  );
}
