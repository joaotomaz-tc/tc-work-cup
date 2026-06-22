import { STATE_KEY } from '../../data/config.js';
import { DEFAULT_STATE } from '../../data/seed.js';

const hasStore = typeof window !== "undefined" && window.storage;

export async function loadPersistedState() {
  if (!hasStore) return null;
  let r;
  try { r = await window.storage.get(STATE_KEY, true); } catch (e) { return null; }
  const raw = r && r.value;
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return { ...DEFAULT_STATE, ...parsed };
}

export async function writePersistedState(next) {
  if (!hasStore) return;
  try { await window.storage.set(STATE_KEY, JSON.stringify(next), true); } catch (e) {}
}
