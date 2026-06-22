import { TAB_KEYS, DEFAULT_TAB } from '../data/config.js';

export function tabFromHash() {
  const id = location.hash.replace(/^#/, "").trim();
  if (!id) return DEFAULT_TAB;
  return TAB_KEYS.has(id) ? id : DEFAULT_TAB;
}

export function selectTab(tab, setTab) {
  setTab(tab);
  const next = "#" + tab;
  if (location.hash !== next) location.hash = tab;
}
