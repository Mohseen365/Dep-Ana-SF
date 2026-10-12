# Architecture Explorer — Safe Vite‑Only Browser Verification Report

**Repository:** `C:\Users\User\Downloads\dependency-analyzer`

## Phase 1 – Repository & Runtime Truth
- **Git root:** `C:\Users\User\Downloads\dependency-analyzer`
- **Current branch:** `main`
- **HEAD SHA:** `16c9419f73c88273a2cbec6ffa02085fd0568cdc`
- **Initial `git status --short`** (recorded in prior logs) shows user‑owned modifications to manifests and `movie`/`movie‑app` assets, and no other changes.
- **Node / npm:** Available (used previously for tests).
- **Vite binary:** `explorer\node_modules\.bin\vite` exists (v5.4.1 as declared in `explorer/package.json`).
- **Playwright:** Installed (`devDependencies` include `playwright`). Browser binaries are present.

## Phase 2 – Startup Call‑Graph Inspection (No Execution)
| File | Insight |
|------|---------|
| `explorer/package.json` – script `dev` → `vite` | Directly invokes Vite dev server.
| `package.json` (root) – script `dev` → `vite` (same binary) |
| `explorer/vite.config.ts` | Defines an **`analyzeProjectsPlugin`** with two hooks:
| | • `configureServer` – adds a middleware that **reads** files from `../analyze/projects` (read‑only). No writes.
| | • `closeBundle` – **copies** the entire `../analyze/projects` directory into `dist/projects` (the built output) using `cpSync`. This **writes** to `explorer/dist/projects` inside the repository.
| `scripts/run-explorer.cjs` | Not needed for pure Vite dev, but its `--build` flag triggers a full build that also writes to `explorer/public/`.

### Does `vite --host … --port …` bypass analysis/adapter calls?
- The Vite dev command does **not** invoke `scripts/run-explorer.cjs`, so the heavy analysis/adapter steps are avoided.
- However, the Vite config itself contains `closeBundle` which runs after the initial in‑memory bundle is generated (even in dev mode). This hook performs a **filesystem copy** (`cpSync`) creating/modifying files under `explorer/dist/`.

### Filesystem writes at startup?
- Yes. `closeBundle` writes to `explorer/dist/projects` (and creates the `dist` directory if absent).
- This is a mutation of tracked repository paths (the `dist` folder is part of the repo tree). The safety policy forbids any write that mutates repository state.

### Client code expectations?
- The UI reads project data via the middleware (`/projects` route) which serves the original `../analyze/projects` files. Those files already exist; the copy to `dist/projects` is **not required** for the dev server to function.
- No other plugins or server‑side code perform writes.

## Verdict
**BLOCKED** – Starting the Vite dev server directly is **not safe** because the `analyzeProjectsPlugin`'s `closeBundle` hook will write to `explorer/dist/projects`, mutating repository files. This violates the critical safety rule prohibiting any filesystem writes within the repository.

### Recommendation
- To obtain a read‑only UI, a custom Vite command would need to disable the `analyzeProjectsPlugin` or its `closeBundle` hook. Since modifying the config or scripts is prohibited for this verification task, we cannot proceed.
- The only safe alternative would be to launch a pre‑built static version (if already generated) or to run a bespoke server that serves the existing `../analyze/projects` without invoking the plugin, which would require code changes beyond the allowed scope.

**Result:** Verification cannot be performed with the current setup.
