# Architecture Explorer — Parallel Real-Runtime Validation Readiness Audit Report

## 1. Executive Summary

- **Final Readiness Verdict:** `READY WITH BLOCKERS`
- **Audit Scope:** Strictly read-only reconnaissance and test-planning audit for validating the exported project data paths and real running Architecture Explorer browser UI.
- **Key Findings:**
  1. **Project Location & Export Path:** `dependency-analyzer.cjs` resides at the repository root (`./dependency-analyzer.cjs`), not in a subfolder named `dependency-analyzer`. The export CLI is `./scripts/export-explorer.cjs`. Argument inspection reveals that `parseArgs` parses `--input`, `--output`, `--output-dir`, `--project`/`--project-id`, and `--source`, but does **not** parse `--projectName` (passing `--projectName` is ignored by option parsing).
  2. **Project Discovery & Manifest Governance:** Valid registered project IDs include `default`, `bqc`, `cloud-spend-tracker` (`cst`), `food-app`, `movie` (`movie-app`), `pbim`, `project-b`, `pub-infra-mang`, `test-canonical-project`, and `test-norm-proj`. Projects are registered in `explorer/public/project-manifest.json` and loaded via `ProjectContext.tsx`. Unmanifested projects passed via URL (`?project=<id>`) dynamically fallback to `/projects/<id>/explorer-data.json` or `/pbim/explorer-data.json`.
  3. **DOM Anchors & Layout Controls:** `.domain-lenses-bar` is rendered by `WorkspaceHeader.tsx` (line 222) with `role="tablist"` and `aria-label={`${currentDomainDef.label} Lenses`}`. The graph view tab button inside `.domain-lenses-bar` carries `aria-label="Graph view: Interactive Dependency Graph Canvas"`. The graph container toolbar is `.graph-controls-floating` in `GraphControls.tsx` (line 102). Layout mode switching is controlled by a `.graph-control-btn` button (`data-testid="architecture-mode-toggle"`), which receives the `.active` class (`.graph-control-btn.active`) whenever `architectureMode !== 'hierarchical'`. Supported modes are **Hierarchical** (Layered Flow), **Hybrid** (Clustered Feature Regions), **Orbit** (Radial Concentric Bands), and **Constellation** (Multi-Sun Macro View).
  4. **Layout Completion Observable:** CSS class changes alone do not guarantee layout positioning completion. The canonical observable for layout calculation completion is the Cytoscape `layoutstop` event on `cyRef.current` (`window.__CY__`), accompanied by the DOM indicator text update in `.graph-mode-badge` (`GraphView.tsx` line 1275).
  5. **Environment Blockers:** The repository possesses Playwright browser audit scripts in `scripts/` (e.g. `audit-component-orbit-browser.cjs`, `verify-c3-browser-truth.cjs`, `test-quick-browser.cjs`), but `node_modules` is not currently installed in the workspace root or `explorer/` directory. Running real-browser validation requires executing `npm ci` at root and in `explorer/`, followed by launching the Vite development server (`npm run dev --prefix explorer`).

---

## 2. Starting Repository State

- **Starting Git Commit:** `7d000e8` (`Merge pull request #658 from Mohseen365/audit-large-graph-performance-reliability-12279698962697804158`)
- **Working Tree Status:** Clean (`git status` reported `nothing to commit, working tree clean`).
- **Isolation Compliance:** Zero tracked or untracked repository source, test, configuration, or manifest files were modified during this audit.

---

## 3. Project Initialization and Export Workflow

### 3.1 Repository Structure & Analyzer Path
- **Owner Operational Context Check:** The operational notes suggested running export commands from inside a `dependency-analyzer` directory.
- **Repository Truth:** There is **no** directory named `dependency-analyzer`. The analyzer core is located at `./dependency-analyzer.cjs` in the repository root directory.
- **Export Script Path:** `./scripts/export-explorer.cjs`.

### 3.2 CLI Argument Analysis (`scripts/export-explorer.cjs`)
Source inspection of `parseArgs` in `scripts/export-explorer.cjs` (lines 27–120):
- **Parsed Options:**
  - `--input` / `-input` / `--input=<path>` (default: `"analyze"`)
  - `--output` / `-output` / `--output=<path>`
  - `--output-dir` / `-output-dir` / `--output-dir=<path>`
  - `--project` / `-project` / `--project-id` / `-project-id` / `--project=<id>`
  - `--source` / `-source` / `--source=<path>`
- **Gap Analysis on `--projectName`:** `parseArgs` initializes `let projectName = ""` (line 38) and uses `options.projectName` when constructing project metadata, but **never parses `--projectName`** in the command-line argument loop. If `--projectName <Name>` is passed on the CLI, option parsing ignores it. To pass a project identifier, `--project <id>` or a positional argument must be used.

### 3.3 Valid Real Projects
Discovered project directories and manifest entries:
- **Canonical Analyzer Projects (`analyze/projects/`):**
  - `pbim` (528 components, 2,063 relationships)
  - `cloud-spend-tracker` (240 components, 1,024 relationships)
- **Manifest-Registered Projects (`explorer/public/project-manifest.json`):**
  - `default` (4 components / 3 relationships)
  - `bqc` (274 components / 603 relationships)
  - `cloud-spend-tracker` / `cst` (240 components / 1,024 relationships)
  - `food-app` (1 component / 0 relationships)
  - `movie` / `movie-app` (9 components / 16 relationships)
  - `pbim` (528 components / 2,063 relationships)
  - `project-b` (14 components / 16 relationships)
  - `pub-infra-mang` (528 components / 2,063 relationships)
  - `test-canonical-project` (2 components / 1 relationship)
  - `test-norm-proj` (1 component / 0 relationships)

### 3.4 Initial Default Load vs Export Availability
`ProjectContext.tsx` (`explorer/src/context/ProjectContext.tsx`, lines 105–170) fetches `/project-manifest.json` on initialization:
- When the UI loads without query parameters, `activeProjectId` defaults to `"default"` (or the value saved in `localStorage.getItem("explorer.activeProjectId")`).
- Non-default projects appear in the project selection dropdown if registered in `explorer/public/project-manifest.json`.
- If an exported project is not yet in `project-manifest.json`, passing `?project=<id>` in the URL causes `ProjectContext` to instantiate a custom project entry pointing to `/projects/<id>/explorer-data.json` (or `/pbim/explorer-data.json`). If the exported file has not been copied to `explorer/public/`, the HTTP request returns 404 and graph loading fails.

### 3.5 Export Side Effects & Safety
- `scripts/export-explorer.cjs` has **no dry-run flag**.
- Running `node scripts/export-explorer.cjs --project <id>` performs filesystem writes:
  1. Writes `analyze/projects/<id>/explorer-data.json` and `project-metadata.json`.
  2. Updates `analyze/project-manifest.json`.
  3. Copies files into `explorer/public/projects/<id>/explorer-data.json` and `explorer/public/project-manifest.json` via `publishProjectToExplorerAssets` (lines 744–812).
- **Read-Only Workstream Action:** The export command was **not executed** in this workstream.
- **Controlled Setup Command for Primary Workstream:**
  ```bash
  node scripts/export-explorer.cjs --input analyze/projects/pbim --project pbim
  ```

---

## 4. Confirmed Runtime Entry Points and Commands

### 4.1 Development and Build Commands
- **Root `package.json` Scripts:**
  - `npm run dev`: Launches Vite dev server (`vite`).
  - `npm run explorer`: Launches `node scripts/run-explorer.cjs` (starts Vite dev server on port 3000).
  - `npm run build`: Executes `node scripts/run-explorer.cjs --build`.
  - `npm run adapter`: Executes `node scripts/export-explorer.cjs`.
  - `npm run test:cli`: Executes 30 CLI test suites in Node.js.
- **`explorer/package.json` Scripts:**
  - `npm run dev --prefix explorer`: Launches Vite in `explorer/`.
  - `npm run build --prefix explorer`: Runs TypeScript compiler `tsc && vite build`.
  - `npm run test --prefix explorer`: Runs Vitest test runner (`vitest run`).

### 4.2 Application Entry Point & Explorer Route
- **Entry File:** `explorer/src/main.tsx` mounting `App` into `#root`.
- **Main View / Route:** Rendered at root URL (`/` or `/?project=<id>`) in `explorer/src/App.tsx`. `App.tsx` wraps the UI in `ProjectProvider`, `WorkspaceRouterProvider`, and `InvestigationProvider`.

### 4.3 Graph Rendering Implementation
- **Cytoscape.js Engine:** `explorer/src/components/GraphView.tsx` utilizing `cytoscape`, `cytoscape-fcose`, and `cytoscape-navigator`.
- **Layout Module:** `explorer/src/lib/graph-layout.ts` and `explorer/src/lib/architecture-layout.ts` supporting synchronous and asynchronous worker-backed layout generation.

### 4.4 Project Selection Control
- **Header Selector:** Rendered in `explorer/src/components/Header.tsx` (lines 503–520) via a dropdown `select` bound to `ProjectContext.selectProject(id)`.

---

## 5. Project Selection and Data Provenance

```
[ URL ?project=pbim ] OR [ Header Dropdown Select ]
       │
       ▼
[ ProjectContext.selectProject("pbim") ]
       │
       ├── Set localStorage "explorer.activeProjectId" = "pbim"
       ├── Set activeProjectId = "pbim"
       ├── Dispatch window event "explorer:project-changed"
       └── Clear single-component selection params ("node", "finding")
       │
       ▼
[ Fetch /pbim/explorer-data.json ]
       │
       ▼
[ App.tsx / ActiveWorkspaceRenderer.tsx ]
       │
       ▼
[ GraphView.tsx ]
       │
       ├── Clear sessionPositionsRef
       ├── Reset Cytoscape container elements
       └── Execute initial mode layout (Hierarchical DAG / Preset)
```

---

## 6. DOM Selector Inventory and Layout-Control Mapping

| DOM Anchor / Selector | Component Symbol | Source File | Line(s) | Description / Role |
| :--- | :--- | :--- | :--- | :--- |
| `.domain-lenses-bar` | `WorkspaceHeader` | `explorer/src/components/workspace/WorkspaceHeader.tsx` | 222 | Top lens switcher bar with `role="tablist"` and `aria-label={`${currentDomainDef.label} Lenses`}`. |
| Button inside `.domain-lenses-bar` | `WorkspaceHeader` | `explorer/src/components/workspace/WorkspaceHeader.tsx` | 247 | Individual lens tab button. For topological graph view: `aria-label="Graph view: Interactive Dependency Graph Canvas"`. |
| `.graph-controls-floating` | `GraphControls` | `explorer/src/components/GraphControls.tsx` | 102 | Floating graph controls container with `role="toolbar"` and `aria-label="Graph controls"`. |
| `.graph-control-btn` | `GraphControls` | `explorer/src/components/GraphControls.tsx` | 123–238 | Action buttons within floating graph toolbar (zoom, fit, center, layout toggle, static toggle, navigator, fullscreen). |
| `data-testid="architecture-mode-toggle"` | `GraphControls` | `explorer/src/components/GraphControls.tsx` | 168 | Architecture layout mode toggle button. Receives class `.graph-control-btn.active` whenever `architectureMode !== 'hierarchical'`. |
| `data-testid="layout-mode-toggle"` | `GraphControls` | `explorer/src/components/GraphControls.tsx` | 197 | Static/Interactive mode toggle button. Receives class `.graph-control-btn.active` when `layoutMode === 'static'`. |
| `.graph-mode-badge` | `GraphView` | `explorer/src/components/GraphView.tsx` | 1275 | On-canvas layout mode badge displaying current layout mode string (e.g. `🔀 Interactive Mode (Hierarchical)`). |

### 6.1 Simultaneous DOM Existence
`.domain-lenses-bar` (header) and `.graph-controls-floating` (on-canvas toolbar) exist simultaneously in the DOM when the topological workspace view is active.

### 6.2 Layout Mode Mapping

| Product Terminology | Code `architectureMode` | Toolbar Button Icon | Active Class Condition |
| :--- | :--- | :--- | :--- |
| **Hierarchical Layout** (Layered Flow) | `'hierarchical'` | 🏢 | Inactive (default) |
| **Hybrid Layout** (Clustered Regions) | `'hybrid'` | 🧩 | Active (`.graph-control-btn.active`) |
| **Architecture Orbit** (Radial Bands) | `'orbit'` | 🪐 | Active (`.graph-control-btn.active`) |
| **Component Constellation** (Multi-Sun) | `'constellation'` | 🌌 | Active (`.graph-control-btn.active`) |

### 6.3 Layout Completion Observable Signal
1. **Cytoscape Event:** `cy.on('layoutstop', callback)` or `cy.one('layoutstop', callback)` on `cyRef.current` (`window.__CY__`).
2. **DOM Text Signal:** `.graph-mode-badge` text updates to state string.
3. **Position Stability Signal:** `window.__CY__.nodes()[0].position()` remains unchanged across consecutive animation frames.

---

## 7. Initial-Load State vs. Post-Layout-Selection State

### State A — Initial Project Load
1. Open URL `http://localhost:3000/?project=pbim`.
2. Observe project selection header displays `PBIM` (528 components / 2,063 relationships).
3. `architectureMode` defaults to `'hierarchical'`.
4. Layout mode toggle button (`data-testid="architecture-mode-toggle"`) is present in `.graph-controls-floating` without `.active` class.
5. Canvas displays initial DAG layout or preset positions. `.graph-mode-badge` reads `🔀 Interactive Mode (Hierarchical)`.
6. Console log captures zero uncaught errors.

### State B — Layout Selected
1. Click `data-testid="architecture-mode-toggle"` button in `.graph-controls-floating`.
2. Button state transitions to `hybrid` (icon 🧩) and receives class `.graph-control-btn.active`.
3. `.graph-mode-badge` updates to `🔀 Interactive Mode (Hybrid)`. Cytoscape emits `layoutstop`.
4. Click toggle again: transitions to `orbit` (icon 🪐), `.active` remains true, badge reads `🔀 Interactive Mode (Orbit)`.
5. Click toggle again: transitions to `constellation` (icon 🌌), `.active` remains true, badge reads `🔀 Interactive Mode (Constellation)`.
6. Click toggle again: returns to `hierarchical` (icon 🏢), `.active` class is removed, badge reads `🔀 Interactive Mode (Hierarchical)`.
7. Verify repeated mode switching causes zero position leakage across modes (mode-scoped positions in `GraphLayoutState`).

---

## 8. Supported Layouts and Data/Fixture Strategy

| Size Tier | Target Dataset / Project | Node Count | Edge Count | Supported Layouts | Primary Verification Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Small** | `default` / `movie-app` / `project-b` | 4–14 | 3–16 | Hierarchical, Hybrid, Orbit, Constellation | Initial render baseline, button toggles, fast interaction sanity |
| **Medium** | `cloud-spend-tracker` (`cst`) / `bqc` | 240–274 | 603–1,024 | Hierarchical, Hybrid, Orbit, Constellation | Region packing, 2D geometry clearance, multi-lane bridge allocation |
| **Large** | `pbim` / `pub-infra-mang` | 528 | 2,063 | Hierarchical, Hybrid, Orbit, Constellation | 14-Sun constellation, 7 shared Apex hubs, performance & memory |
| **Stress** | Synthetic Matrix (via `generate-phase26-corpus.cjs`) | 750–1,000 | 3,000–5,000 | Hierarchical, Hybrid, Orbit, Constellation | Web worker async layout fallback, canvas LOD degradation bounds |

---

## 9. Existing Browser/E2E and Performance Tooling

### 9.1 Browser Test Scripts (`scripts/`)
- `scripts/audit-component-orbit-browser.cjs`: Playwright script testing single-focal Component Orbit rendering and bounding box clearance.
- `scripts/audit-component-orbit-constellation-browser.cjs`: Playwright script evaluating multi-sun constellation viewports.
- `scripts/verify-c3-browser-truth.cjs`: Playwright script evaluating interactive node selection and drawer sync.
- `scripts/test-quick-browser.cjs`: Playwright navigation smoke test on `http://localhost:3000/?project=pbim`.

### 9.2 Execution Status
- **Current Blocker:** `node_modules` is not installed in the current sandbox environment.
- **Resolution Path:** `npm ci` must be executed at repository root and in `explorer/` prior to running browser verification scripts.

---

## 10. Runtime Test Matrix

| Test ID | Project ID | Size Tier | Target Layout Mode | Interaction Sequence | Target Observable / Threshold |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TM-01** | `default` | Small (4) | Hierarchical -> Hybrid | First load, switch layout | `.active` toggles, `layoutstop` fires < 100ms |
| **TM-02** | `cloud-spend-tracker` | Medium (240) | Hierarchical -> Orbit -> Hybrid | Switch modes, drag node, switch back | Node position preserved per mode scope |
| **TM-03** | `pbim` | Large (528) | Hierarchical -> Constellation | Select project `pbim`, switch to Constellation | 14 Suns rendered, 0 AABB node collisions |
| **TM-04** | `pbim` | Large (528) | All Modes Cycle | Rapid 10x mode cycle | Zero uncaught worker exceptions or canvas drift |

---

## 11. Step-by-Step Browser Validation Protocol

### Step 1: Environment Preparation & Server Startup
```bash
npm ci
npm ci --prefix explorer
npm run dev --prefix explorer > dev_server.log 2>&1 &
```

### Step 2: Project Selection & Initial Load
1. Open Chrome/Chromium to `http://localhost:3000/?project=pbim`.
2. Inspect DOM: Verify `.workspace-header-panel` and `.domain-lenses-bar` rendered.
3. Verify project title in `Header.tsx` reads `PBIM` and node count reads `528`.

### Step 3: Layout Mode Transitions
1. Locate `.graph-controls-floating` toolbar.
2. Click `data-testid="architecture-mode-toggle"`.
3. Verify `.graph-control-btn` receives `.active` class.
4. Await Cytoscape `layoutstop` event on `window.__CY__`.
5. Verify `.graph-mode-badge` text reflects new layout.

### Step 4: Mode-Scoped Position Isolation
1. Drag node `ApexClass:MaintenanceRequestController` to `(x: 500, y: 500)`.
2. Switch architecture mode to `Orbit`.
3. Switch architecture mode back to `Hybrid`.
4. Verify dragged position `(500, 500)` is preserved in `Hybrid` mode and does not leak into `Orbit` mode.

---

## 12. Metrics and Evidence-Capture Protocol

For each test execution:
- **Console Log Capture:** Save `console.error` and `console.warn` outputs.
- **DOM Screenshots:** Capture full-viewport screenshots after each layout transition.
- **Position Snapshots:** Export `window.__CY__.nodes().map(n => ({ id: n.id(), pos: n.position() }))`.
- **Timing Metrics:** Capture `performance.now()` deltas between layout button click and `layoutstop` event.

---

## 13. Blockers and Smallest Follow-Up Tasks

| Blocker ID | Description | Impact | Smallest Follow-Up Task |
| :--- | :--- | :--- | :--- |
| **BLK-01** | `node_modules` not installed | Prevents launching Vite dev server or Playwright browser runner | Run `npm ci` at repository root and in `explorer/`. |
| **BLK-02** | CLI `--projectName` argument not parsed in `scripts/export-explorer.cjs` | Operational note command `node scripts/export-explorer.cjs --projectName <Name>` will ignore name | Use `node scripts/export-explorer.cjs --project <id>` instead. |
| **BLK-03** | No dry-run option in `export-explorer.cjs` | Running export writes directly to public assets and manifest | Run export in a dedicated setup step before E2E testing. |

---

## 14. What This Audit Did Not Prove

1. **Unexecuted DOM Render Truth:** Because browser runners were not executed in this read-only workstream, DOM layout positions were confirmed via static code analysis and contract specifications, not real-browser pixel captures.
2. **Live Dev Server Responsiveness:** Vite server execution was not started in this workstream to maintain zero process/environment mutation.
3. **Visual Aesthetics / CSS Render Quality:** Visual non-overlap of Cytoscape labels under custom fonts/zooms requires real browser execution.

---

## 15. Read-Only Compliance Statement

- **Files Changed:** `0` (Zero tracked or untracked files modified, except creating this report `ARCHITECTURE_EXPLORER_REAL_RUNTIME_VALIDATION_READINESS_REPORT.md`).
- **Commands Executed:** `git status`, `git log`, `find`, `grep`, `read_file`, `lsof`. Zero destructive Git, package installation, or code generation commands were executed.
- **Verification:** `git status` verified clean working tree state prior to report creation.

---

## 16. Required Conclusion

# `READY WITH BLOCKERS`

The Architecture Explorer project and real-runtime entry points, DOM contracts, data loading paths, and layout mode mappings are fully mapped and verified against repository source truth. Real-browser validation can proceed immediately once the missing package dependencies (`node_modules`) are installed via `npm ci`.
