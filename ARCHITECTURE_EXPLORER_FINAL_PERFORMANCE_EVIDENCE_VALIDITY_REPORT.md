# ARCHITECTURE EXPLORER — FINAL PERFORMANCE EVIDENCE VALIDITY REPORT

## 1. Executive Summary & Verdict

### Verdict: `FAIL`

**Rationale:**
1. **Invalid Benchmark Completion Boundary:** Audit of `scripts/test-phase6-performance.cjs` and `GraphView.tsx` proves that the benchmark measurement end boundary is **invalid and incompletely defined**. The test clicks `[data-testid="architecture-mode-toggle"]`, waits a hardcoded `page.waitForTimeout(2000)`, and queries `[data-testid="graph-mode-indicator"]`.
2. **Mode Indicator is Acknowledgement Only:** Source inspection of `GraphView.tsx` (L1272–1276) confirms that `[data-testid="graph-mode-indicator"]` displays React state (`architectureMode`) and updates its DOM text synchronously within **<10 ms** of the button click, long BEFORE asynchronous layout worker computation, Cytoscape position application, or visual canvas rendering begin or complete.
3. **Arbitrary Delay & CDP Message Queue Conflation:** For small graphs (Default 4N), the benchmark adds a mandatory 2,000 ms sleep to a <2 ms layout, recording ~2,024 ms. For large graphs (PBIM 528N), layout calculation in worker/sync thread takes ~33–35s, and the Playwright `page.evaluate()` call blocks on Chrome's CDP message queue while the main thread processes worker IPC responses and Cytoscape batch updates. Thus, the recorded numbers represent a composite of an arbitrary 2,000 ms sleep plus main-thread CDP queue delays, rather than an application layout completion event.
4. **Provisional Budgets Cannot Be Ratified:** Because the underlying timing metrics are derived from an arbitrary-delay/CDP queue composite rather than a verified layout completion boundary, all previously proposed provisional budgets are **unratified and invalid for production acceptance**.
5. **Clean Code & Test Baseline Maintained:** All 4 targeted Vitest unit suites (20/20 passed) and the master CLI integration suite (`npm run test:cli`, 31/31 passed) pass cleanly with exit code `0`. Zero production code files were altered.

---

## 2. Repository Provenance & Working-Tree Status

- **Repository Root:** `/app`
- **Git Branch:** `jules-16869647566004902717-1a221bd0`
- **Current Commit SHA (`HEAD`):** `6de2a47ea7465cda3fbff2f4e350596ed203178b`
- **Historical Reference Commit SHA:** `a1a2f5b2ce228e693732c274036c244d9dc32b46`
- **Working Tree State:**
  - `A  ARCHITECTURE_EXPLORER_PERFORMANCE_BASELINE_AND_EVIDENCE_CLOSURE_REPORT.md` (Created in previous step)
  - `0` uncommitted changes in `explorer/src/` or `scripts/`.
- **Runtime Environment:**
  - **Node.js:** `v22.22.1`
  - **npm:** `11.11.0`
  - **Playwright Runner:** Chromium `153.0.8010.12` (Headless Shell Linux64)
  - **Active Explorer Server:** Vite Dev Server running on `http://localhost:3000` (`Vary: Origin`, HTTP 200 OK)

---

## 3. Benchmark Instrumentation Audit & Measurement Lifecycle

### Lifecycle Step-by-Step Source Trace

| Step | Action / Event | Source Location | Execution Character & Timing |
| :--- | :--- | :--- | :--- |
| **1** | User clicks toggle button | `scripts/test-phase6-performance.cjs` (L48–51) | Triggers `[data-testid="architecture-mode-toggle"]` click. |
| **2** | State handler updates React state | `explorer/src/components/GraphView.tsx` (L889–899) | Calls `onArchitectureModeChange`, updating `architectureMode` state in `App.tsx`. |
| **3** | Mode indicator DOM text updates | `explorer/src/components/GraphView.tsx` (L1272–1276) | React re-renders `graph-mode-indicator` synchronously (**<10 ms**). **This is Mode Selection Acknowledgement only.** |
| **4** | Layout `useEffect` fires | `explorer/src/components/GraphView.tsx` (L325–385) | Post-render effect fires asynchronously, incrementing `layoutRequestRef`. |
| **5** | Async layout worker invoked | `explorer/src/components/GraphView.tsx` (L342) | Calls `runLayoutWithMetadataAsync(cy, ...)` delegating to `globalWorkerClient`. |
| **6** | Layout computation executes | `explorer/src/lib/workers/layout.worker.ts` (L14–50) | Web Worker or sync fallback computes node position geometry ($O(E \cdot N)$ for Hybrid). |
| **7** | Positions applied to Cytoscape | `explorer/src/lib/graph-layout.ts` (L335–370) | `cy.batch()` applies calculated positions to Cytoscape elements. |
| **8** | State & Overlay canvas updated | `explorer/src/components/GraphView.tsx` (L350–355) | Calls `setFeatureRegions`, `setOrbitGuides`, and `captureAndPersistPositions`. |
| **9** | Benchmark records end timestamp | `scripts/test-phase6-performance.cjs` (L53–58) | Script wakes from `waitForTimeout(2000)` and queries DOM via `page.evaluate()`. |

### Flaws in Benchmark Completion Boundary
- **DOM Indicator Prematurity:** The indicator `[data-testid="graph-mode-indicator"]` updates at **Step 3**, BEFORE layout computation (Step 6) or position application (Step 7) occur.
- **Arbitrary Delay:** `page.waitForTimeout(2000)` forces a 2,000 ms sleep regardless of dataset scale or actual layout duration.
- **CDP Queue Conflation:** On large graphs (PBIM 528N), `page.evaluate()` CDP execution blocks behind main-thread message processing while the worker posts back positions and React updates state. The measured timestamp reflects CDP queue backlog rather than a verified layout completion signal.

---

## 4. Assessment of Prior Performance Claims

### Validity Classification of Previously Reported Timings

| Dataset Tier | Layout Mode | Prior Reported Median | Validity Classification | Validity Assessment & Reason |
| :--- | :--- | :--- | :--- | :--- |
| **Default (Small)** | Hybrid | 2,024 ms | **INVALID / INCOMPLETELY DEFINED** | Includes 2,000 ms arbitrary sleep for a <2 ms layout computation. |
| **Default (Small)** | Orbit | 2,012 ms | **INVALID / INCOMPLETELY DEFINED** | Includes 2,000 ms arbitrary sleep for a <2 ms layout computation. |
| **Cloud Spend Tracker (Medium)** | Hybrid | 5,251 ms | **INVALID / INCOMPLETELY DEFINED** | `waitForTimeout(2000)` expires before layout completes (~3.2s); timestamp reflects CDP queue timing. |
| **Cloud Spend Tracker (Medium)** | Orbit | 3,965 ms | **INVALID / INCOMPLETELY DEFINED** | CDP queue timing following 2,000 ms arbitrary sleep. |
| **Cloud Spend Tracker (Medium)** | Constellation | 2,509 ms | **INVALID / INCOMPLETELY DEFINED** | CDP queue timing following 2,000 ms arbitrary sleep. |
| **Cloud Spend Tracker (Medium)** | Hierarchical | 3,732 ms | **INVALID / INCOMPLETELY DEFINED** | CDP queue timing following 2,000 ms arbitrary sleep. |
| **PBIM (Large)** | Hybrid | 35,006 ms | **INVALID / INCOMPLETELY DEFINED** | CDP queue blocked during 33s worker execution + 2s sleep; not a direct layout completion event. |
| **PBIM (Large)** | Orbit | 25,210 ms | **INVALID / INCOMPLETELY DEFINED** | CDP queue blocked during 23s worker execution + 2s sleep; not a direct layout completion event. |
| **PBIM (Large)** | Constellation | 3,083 ms | **INVALID / INCOMPLETELY DEFINED** | Macro projection finishes in ~1s; total reflects 2s sleep + queue delay. |
| **PBIM (Large)** | Hierarchical | 13,852 ms | **INVALID / INCOMPLETELY DEFINED** | CDP queue blocked during ~11s layout execution + 2s sleep; not a direct layout completion event. |

---

## 5. Re-Measurement & Dataset Verification

### Verified Dataset Metrics
- `default`: **4** nodes / **3** edges (1 LWC)
- `cloud-spend-tracker`: **240** nodes / **1,024** edges (26 LWCs)
- `pbim`: **528** nodes / **2,063** edges (30 LWCs)

### PBIM Initial Load Isolation
- **PBIM Initial Load Time:** **78,090 ms**
- **Analysis:** This duration represents network data fetching (`/pbim/explorer-data.json`), JSON parsing, Cytoscape graph element construction (`buildGraphElements`), initial position resolution, and first canvas mount. It must be strictly isolated from subsequent layout mode-switching latency.

---

## 6. Review of Performance Budgets, Algorithmic Complexity, and Memory Claims

### Status of Proposed Performance Budgets
- **Status:** **UNRATIFIED & INVALID FOR ACCEPTANCE**
- **Rationale:** Operating rules mandate that performance budgets cannot be ratified against invalid or arbitrary-delay measurement contracts. Budgets must remain unratified engineering targets until a verified completion signal is implemented.

### Algorithmic Complexity Verification
- **Source Inspection:** `discoverFeatures` in `explorer/src/lib/layout/features.ts` and cluster packing in `explorer/src/lib/architecture-layout.ts`.
- **Findings:**
  - **Hybrid Layout:** Performs pairwise edge and cluster boundary calculations ($O(E \cdot N)$ to $O(N^2)$), explaining why PBIM (528N / 2063E) requires ~33s CPU time compared to CST (240N / 1024E) taking ~3.2s.
  - **Constellation Layout:** Projects a bounded macro subset (14 LWC suns + 7 shared Apex hubs = 42 nodes) via `adaptComponentConstellation`, maintaining $O(M)$ complexity (~1s CPU time) regardless of total graph edge count $E$.

### JS Heap Memory Claims Review
- **API Availability:** Measured via `window.performance.memory` in Chromium.
- **Observed Snapshots:** 54.17 MB (Default), 124.93 MB (CST), 87.45 MB (PBIM).
- **Critical Assessment:** Single-point heap snapshots taken after layout transitions indicate that heap usage remains below 150 MB. However, these snapshots do NOT constitute proof of "long-session memory stability" or zero memory leaks over multi-hour panning/zooming sessions.

---

## 7. Reconciled Test Suite & Deferred Script Evidence

### Unit & Integration Test Suites

```bash
cd explorer && npx vitest run src/test/static-constellation-projection.test.ts src/test/component-orbit-integration.test.ts src/test/PhaseIntegrationVerification.test.tsx src/components/GraphView.layoutModeToggle.test.tsx
```
- **Vitest Execution:** `4` test files passed, `20` individual tests passed, `0` failed (Exit code `0`).
- **`n.nodeId` Fix Inspection:** Inspected `explorer/src/test/static-constellation-projection.test.ts` L118. Confirmed `(n) => n.nodeId` correctly maps `ComponentConstellationNode.nodeId` property and asserts the 7 canonical shared Apex hub classes (`ApexClass:BudgetController`, `ApexClass:CitizenRequestController`, `ApexClass:CityZoneController`, `ApexClass:MaintenanceRequestController`, `ApexClass:VendorAssignmentController`, `LWC:vendor-card`, `LWC:vendor-history-modal`).

```bash
npm run test:cli
```
- **Master CLI Test Suite:** `31` passed test scripts out of `31` (100% pass rate, exit code `0`).

### Deferred Non-CI Browser Scripts Analysis

1. `scripts/audit-component-orbit-browser.cjs`:
   - **Failure Mode:** `MODULE_NOT_FOUND` for `../explorer/src/lib/adapters/component-orbit-adapter`.
   - **Cause:** CJS `require` attempting to load TypeScript module `component-orbit-adapter.ts` without transpiler loader.
   - **Action:** Keep deferred. Non-CI script.

2. `scripts/audit-component-orbit-constellation-browser.cjs`:
   - **Failure Mode:** `FATAL: Error: VALIDATION BLOCKED — WRONG DATASET`.
   - **Cause:** SHA-256 hash mismatch on PBIM fixture (`395c23bd...` vs hardcoded legacy hash `d6dee0d0...`).
   - **Action:** Keep deferred. Frozen dataset hashes must not be altered without explicit baseline contract authorization.

3. `scripts/verify-c3-browser-truth.cjs`:
   - **Failure Mode:** `net::ERR_CONNECTION_REFUSED at http://localhost:5173/`.
   - **Cause:** Hardcodes Vite default port `5173` instead of active server port `3000`.
   - **Action:** Keep deferred. Non-CI script.

---

## 8. Exact File Diff and Classification of Changes

- **Modified / Created Files:**
  - `ARCHITECTURE_EXPLORER_PERFORMANCE_BASELINE_AND_EVIDENCE_CLOSURE_REPORT.md` — Created in previous report task (`REPORT_ONLY`).
  - `ARCHITECTURE_EXPLORER_FINAL_PERFORMANCE_EVIDENCE_VALIDITY_REPORT.md` — Created in current validity audit (`REPORT_ONLY`).
- **Production Source Code Changes:** `0` lines mutated (`explorer/src/` diff = `0`).
- **Test Code Changes:** `0` lines mutated (`explorer/src/test/` diff = `0`).
- **Script Changes:** `0` lines mutated (`scripts/` diff = `0`).

---

## 9. Recommended Next Action

The single next recommended action is to **implement a test-only layout completion signal** (e.g. exposing a promise `window.__LAYOUT_COMPLETED__` or dispatching a custom `app:layoutstop` DOM event when `runLayoutWithMetadataAsync` resolves and Cytoscape positions are applied) in `GraphView.tsx`, update `scripts/test-phase6-performance.cjs` to await this signal, and re-benchmark true layout latency before ratifying performance budgets.
