import { fetchESPN } from './espn.js';

// Single entry point for all live-data fetches.
// Previously this file contained an Anthropic/web-search fallback that was
// non-functional (no API key, invalid model slug).  It has been removed:
// error handling and retry logic live in AppRoot.jsx's poll loop, and
// localStorage persists the last good state so stale data is always shown
// while a sync is failing.
export async function fetchLive(opts) {
  return fetchESPN(opts);
}
