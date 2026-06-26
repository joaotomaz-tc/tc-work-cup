# tc-work-cup

A client-side React + Vite single-page app: a 2026 FIFA World Cup office sweepstake tracker. All state lives in the browser (`localStorage`); there is no backend or database.

## Cursor Cloud specific instructions

- Package manager is **pnpm** (lockfile: `pnpm-lock.yaml`). Node 20+ works (CI uses Node 20).
- Standard scripts live in `package.json`: `pnpm run dev` (Vite dev server), `pnpm run build`, `pnpm run preview`. There are no lint or test scripts in this repo.
- The dev server serves the app under the base path **`/tc-work-cup/`** (set via `base` in `vite.config.js`), so the local URL is `http://localhost:5173/tc-work-cup/` — the bare `http://localhost:5173/` will not render the app.
- Live match scores are fetched at runtime from the public ESPN API (no key needed); if the network is unavailable the app falls back to bundled seed data in `js/data/` and still works fully. An optional secondary Anthropic API fallback exists but is not required and runs without a key.
