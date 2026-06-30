/** Aggregate per-match scorer rows into tournament totals. */
export function aggregateScorerEvents(scorerEvents) {
  const map = new Map();
  Object.values(scorerEvents || {}).forEach(list => {
    (list || []).forEach(({ p, t, g }) => {
      if (!p || !t) return;
      const k = `${p}|${t}`;
      const cur = map.get(k);
      map.set(k, { p, t, g: (cur?.g || 0) + g });
    });
  });
  return [...map.values()].sort((a, b) => b.g - a.g);
}

/** Merge incoming per-event scorer maps; each event id is replaced idempotently. */
export function mergeScorerEvents(prev, incoming) {
  const next = { ...(prev || {}) };
  Object.entries(incoming || {}).forEach(([eventId, list]) => {
    if (!eventId || !list?.length) return;
    next[eventId] = list;
  });
  return next;
}
