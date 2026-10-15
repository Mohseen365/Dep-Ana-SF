# Agent D — Test Coverage, Reproduction, and Evidence Quality Audit

## 1. Repository Identity and Environment
- **Branch**: `jules-1064306065697223208-2f90417e`
- **HEAD Commit**: `8fcbcdefa22fffd2e178aac7a025c29bf9fcd147` ("Merge pull request #695 from Mohseen365/jules-8820614745827711075-3ea1fc00")
- **Working Tree Status**: Clean (0 uncommitted or untracked files).
- **Node.js Environment**: Node.js `v22.22.1`, npm `11.11.0`.
- **Installed Dependency Status**:
  - Root `node_modules`: Missing (`/app/node_modules` does not exist).
  - App `explorer/node_modules`: Missing (`/app/explorer/node_modules` does not exist).
- **Tooling Constraints**:
  - `npm run test:cli` (Node CLI scripts): **RUNNABLE & PASSING**.
  - `npm run test:worker-geometry`: **RUNNABLE & PASSING**.
  - `cd explorer && npm test` (Vitest unit/component suite): **BLOCKED** (`vitest: not found`).
  - `cd explorer && npm run build` (TypeScript compiler / Vite): **BLOCKED** (`tsc: not found`).
  - `npx playwright test` / Playwright scripts: **BLOCKED** (`Cannot find module 'playwright'`).

---

## 2. Relevant Test Suites and Commands

### A. CLI & Integration Test Suite (Node.js Direct Scripts)
- **Primary Command**: `npm run test:cli`
- **Scope**: Runs 31 Node.js CLI scripts validating exporter invariants, worker geometry, deterministic change gates, investigation eligibility, context minimizers, decision contexts, and LLM usage accounting.
- **Key Export Script**: `node scripts/test-export-explorer.cjs` (Adapter validation, path containment, public project artifact synchronization).

### B. Explorer Web Application Component & Unit Suite (Vitest / React Testing Library)
- **Primary Command**: `cd explorer && npm test`
- **Location**: `explorer/src/**/*.test.ts`, `explorer/src/**/*.test.tsx` (over 100 test files).
- **Key Project & Hook Tests**:
  - `explorer/src/context/ProjectContext.test.tsx`: Initial selection, multi-project manifest loading, project switching, URL sync, storage persistence.
  - `explorer/src/hooks/useExplorerData.test.ts`: Data URL resolution (`/explorer-data.json`, `/projects/<id>/explorer-data.json`), HTTP 404/403 handling, HTML SPA fallback rejection, project switching reset.
  - `explorer/src/App.test.tsx`: Loading screen, fetch errors, deep linking (`/?node=...&focus.enabled=true`), drawer slots.
  - `explorer/src/components/GraphControls.test.tsx`: Controls UI, layout mode buttons, architecture mode toggles.
  - `explorer/src/components/GraphView.test.tsx`: Cytoscape initialization, layout mode application, node rendering.
  - `explorer/src/test/def01-position-isolation.test.ts`: Position authority isolation across layout modes.
  - `explorer/src/test/component-constellation-integration.test.ts`: Multi-Sun Constellation adapter and layout integration.

### C. Real-Browser E2E / Performance Validation
- **Primary Scripts**: `scripts/verify-phase2eu-real-browser.cjs`, `scripts/verify-phase2e-performance.cjs`, `scripts/test-quick-browser.cjs`.
- **Prerequisite**: Requires Vite dev server running on port 3000 (`http://localhost:3000`) and installed `playwright`.

---

## 3. Actual Tests Executed and Results

| Command | Status / Exit Code | Pass / Fail Count | Summary of Important Output |
| :--- | :--- | :--- | :--- |
| `npm run test:cli` | **PASS** (Exit Code 0) | 31 / 31 scripts passed | Executed all 31 CLI sub-tests (deterministic change gates, worker geometry, adapter validation, investigation eligibility, context minimizer, decision contexts). 100% pass rate. |
| `node scripts/test-export-explorer.cjs` | **PASS** (Exit Code 0) | 12 / 12 invariants passed | Checked node uniqueness, edge referential integrity, risk/metrics validation, source path normalization, and `isPathContained` export safety. |
| `node scripts/test-worker-geometry-contract.cjs` | **PASS** (Exit Code 0) | 4 / 4 test categories passed | Verified `FeatureRegion` geometry calculations, worker vs sync parity, benchmark event correlation edge cases, and strict correlation tokens. |
| `cd explorer && npm test` | **BLOCKED** (Exit Code 127) | 0 / 0 executed | `sh: 1: vitest: not found`. Uninstalled dependencies in `explorer/node_modules`. |
| `node scripts/test-quick-browser.cjs` | **BLOCKED** (Exit Code 1) | 0 / 0 executed | `Error: Cannot find module 'playwright'`. Uninstalled dependencies in root `node_modules`. |

---

## 4. What Available Tests Genuinely Prove

### Symptom 1: Initial Project Selection & Default Startup
- **What Code Inspection & Vitest Specifications Prove**:
  - `ProjectContext.tsx` defines `DEFAULT_PROJECT` (`id: "default"`, `analysisPath: "/explorer-data.json"`).
  - On mount, `getInitialProjectId()` reads `?project=<id>` from URL search params. If absent, it reads `localStorage.getItem("explorer.activeProjectId")`. If both are absent or fail slugification, it defaults to `"default"`.
  - `refreshProjects()` fetches `/project-manifest.json`. If fetch succeeds, it merges manifest projects into `projects` array. If active project ID is in manifest or local storage, it updates `activeProjectId`.
  - `useExplorerData.ts` handles fetching:
    - `"default"` -> fetches `/explorer-data.json`.
    - Custom project -> fetches `/projects/<id>/explorer-data.json` (or `/pbim/explorer-data.json` for PBIM).
    - HTML SPA fallback (when project file is missing and web server returns `index.html`) is detected via content-type / syntax checking and safely rejected as `NOT_ANALYZED` rather than attempting JSON parsing.
- **Limitations of Evidence**:
  - In the current environment, Vitest cannot execute due to missing `node_modules`. Thus, these behaviors are proven by static source contract analysis and Vitest code assertions, but cannot be re-verified at runtime without running `npm ci`.

### Symptom 2: Graph Topology and Layout Transitions
- **What Runnable CLI Tests Prove (`test-worker-geometry-contract.cjs`)**:
  - Direct off-thread Web Worker geometry deserialization calculates exact `width` (`xMax - xMin`) and `height` (`yMax - yMin`) for `FeatureRegion` boxes.
  - Synchronous `computeArchitectureLayoutWithMetadata` and Worker-deserialized layout summaries achieve 100% executable parity.
  - Event correlation edge cases (out-of-order layouts, stale request IDs) are strictly filtered.
- **What Static Code Analysis of `GraphView.tsx` and Layout Engines Proves**:
  - **Hierarchical**: Uses `computeArchitectureLayoutWithMetadata` with `architectureMode: "hierarchical"`. Generates a multi-stage top-to-bottom DAG with domain and layer grouping.
  - **Hybrid**: Uses `architectureMode: "hybrid"`, clustering nodes into bounding-box `FeatureRegion` overlays.
  - **Architecture Orbit**: Uses `adaptComponentOrbit` and `computeComponentOrbitLayout`, placing nodes in concentric radial bands around focal LWC hubs ($R_{\text{inner}}=900\text{px}, R_{\text{outer}}=1760\text{px}$).
  - **Component Constellation**: Uses `adaptComponentConstellation` and `computeComponentConstellationLayout`, building multi-Sun radial clusters centered around contracted LWC Suns.
- **Control State vs Coordinate Assertion Realities**:
  - Component unit tests in `GraphView.test.tsx` and `GraphControls.test.tsx` assert button active classes (`className="active"`), React context state updates (`architectureMode`), and DOM slot rendering (`[data-slot="graph"]`).
  - True spatial coordinate application is handled inside `applyLayoutAndRender()` in `GraphView.tsx` via Cytoscape batch operations (`cy.batch(...)`). Unit tests mock Cytoscape or run in JSDOM where canvas rendering does not occur.

---

## 5. Missing Assertions and Coverage Gaps

1. **Cytoscape DOM Coordinate Placement Gap**:
   - Unit tests verify layout engine functions return position maps `{ [nodeId]: { x, y } }`. However, no automated unit test checks that Cytoscape actually renders those positions on the screen HTML element or that bounding box collision checks hold in the rendered canvas.
2. **Web Worker Threading Transition Gap in Vitest**:
   - Web Worker execution is mocked or bypassed in Vitest JSDOM environment, so asynchronous Worker IPC payload transfer is tested via standalone Node CLI scripts (`test-worker-geometry-contract.cjs`), but not inside React component lifecycle tests.
3. **Multi-Project Visual State Reset Gap**:
   - When switching projects via `selectProject(id)`, `GraphView.tsx` listens for `explorer:project-changed` and clears transient positions. However, there is no E2E test verifying that Cytoscape canvas zoom/pan viewport transform resets to fit bounds on project switch.

---

## 6. Browser Reproduction Feasibility and Blockers

- **Feasibility Assessment**: **REPRODUCTION IS BLOCKED IN CURRENT ENVIRONMENT**.
- **Concrete Blockers**:
  1. Missing dependencies in root `node_modules` (`playwright` not installed).
  2. Missing dependencies in `explorer/node_modules` (`vite`, `vitest`, `react`, `cytoscape` not installed).
  3. Dev server on `http://localhost:3000` is offline.
- **Rule Adherence**: Per evidence rules, no dependencies were installed, no configurations altered, and no browser claims are made.

---

## 7. Minimal Proposed Regression-Test Matrix

*(Proposed only — no test files created or modified)*

| Test ID | Area / Focus | Target Failure Mechanism | Description / Assertion Objective |
| :--- | :--- | :--- | :--- |
| **REG-01** | Initial Selection | Unintended fallback to `default` | Load app with `?project=pbim` on clean `localStorage`. Assert `activeProjectId === 'pbim'` and fetch URL resolves to `/pbim/explorer-data.json`. |
| **REG-02** | Initial Selection | SPA HTML Fallback parsing crash | Attempt to load a non-existent project `?project=nonexistent`. Assert app enters clean `NOT_ANALYZED` empty state and does not throw `SyntaxError`. |
| **REG-03** | Layout Switch | Stale position leak across mode switch | Apply Hierarchical layout, drag a node, switch to Component Constellation mode. Assert node position switches to Constellation radial coordinates and discards Hierarchical drag override. |
| **REG-04** | Layout Topology | Constellation multi-Sun rendering | Render PBIM dataset in Component Constellation mode. Assert all 14 contracted Sun centers receive distinct non-overlapping origin coordinates. |
| **REG-05** | Project Switching | Cross-project node ID contamination | Load `pbim` (528 nodes), select node `LWC:01`, switch project to `default` (4 nodes). Assert selected node state clears and Cytoscape renders exactly 4 nodes. |

---

## 8. Evidence-Quality Risks

1. **Uninstalled Dependencies Masking Test Failures**:
   - Because `explorer/node_modules` is absent, Vitest test suites cannot run in this checkout. Passing CLI test status (`npm run test:cli`) must not be conflated with 100% frontend React component test pass status.
2. **Mocked Cytoscape Instance in React Unit Tests**:
   - `GraphView.test.tsx` mocks Cytoscape layout calls. Tests passing in JSDOM only confirm React props and handlers fire—they do not guarantee Cytoscape successfully rendered nodes on screen.
3. **Synchronous Harness vs Asynchronous Worker Realities**:
   - Unit tests for layout algorithms call engine functions synchronously. In the browser, layout calculation runs in `layout.worker.ts` off the main thread. Message serialization overhead or Worker initialization delay cannot be detected by synchronous unit tests.

---

## 9. Commands, Exit Codes, and Confidence Assessment

### Command Execution Log
```bash
$ git status
On branch jules-1064306065697223208-2f90417e
nothing to commit, working tree clean

$ git log -1 --oneline
8fcbcde Merge pull request #695 from Mohseen365/jules-8820614745827711075-3ea1fc00

$ npm run test:cli
Exit Code: 0 (31/31 scripts passed)

$ node scripts/test-export-explorer.cjs
Exit Code: 0 (12/12 invariants passed)

$ node scripts/test-worker-geometry-contract.cjs
Exit Code: 0 (4/4 test categories passed)

$ cd explorer && npm test
Exit Code: 127 (vitest: not found)

$ node scripts/test-quick-browser.cjs
Exit Code: 1 (Cannot find module 'playwright')
```

### Confidence Assessment
- **Evidence Confidence for CLI Integration & Exporter Safety**: **HIGH** (Direct execution evidence verified, exit code 0, 100% pass rate).
- **Evidence Confidence for Source Code Routing & Project Context**: **HIGH** (Thorough static contract and specification analysis of `ProjectContext.tsx`, `useExplorerData.ts`, and test files).
- **Evidence Confidence for Live Browser Reproduction & DOM Rendering**: **LOW / BLOCKED** (Environment lacks installed `node_modules` for Vite, Vitest, and Playwright).
