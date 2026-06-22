import { THEME_KEY, ME_KEY } from '../../data/config.js';
import { OWNERS } from '../../data/owners.js';

export function readThemePref() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch (e) { return "system"; }
}

export function resolveTheme(pref) {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  return window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
}

export function applyTheme(pref) {
  const resolved = resolveTheme(pref);
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-pref", pref);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = resolved === "dark" ? "#121214" : "#F5F5F7";
}

export function readMe() {
  try {
    const v = localStorage.getItem(ME_KEY);
    return OWNERS.includes(v) ? v : "";
  } catch (e) { return ""; }
}
