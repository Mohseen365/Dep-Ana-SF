# ARCHITECTURE EXPLORER — FINAL PERFORMANCE EVIDENCE VALIDITY REPORT

## 1. Executive Summary & Verdict

### Final Verdict: `FAIL`

**Rationale:**
1. **Invalid Benchmark Completion Boundary:** The performance benchmark implemented in `scripts/test-phase6-performance.cjs` measures an invalid end boundary that does **not** correspond to layout computation completion, Web Worker IPC resolution, Cytoscape element positioning, or visual rendering settlement.
2. **Synchronous Mode-Indicator Decoupling:** When a user clicks `[data-testid="architecture-mode-toggle"]`, the DOM badge `[data-testid="graph-mode-indicator"]` updates **synchronously** during the React re-render (<10 ms after click)—long before the asynchronous layout pipeline (`runLayoutWithMetadataAsync`) completes. Querying this badge text via `page.evaluate()` provides zero proof that layout execution has finished.
3. **Artificial Floor via Fixed Sleep:** The benchmark script inserts `await page.waitForTimeout(2000)` between the click and the indicator query. For small graphs (e.g. Default dataset, $N=4$), layout computation takes $<5\text{ ms}$, but the benchmark script reports a false baseline of $\sim 2,024\text{ ms}$ due entirely to this arbitrary 2-second sleep floor.
4. **Queue Blocking Conflation on Large Graphs:** On large datasets (e.g. PBIM, $N=528$, $E=2,063$), the script records durations between $18,000\text{ ms}$ and $36,415\text{ ms}$. This occurs because `page.evaluate()` blocks on the V8 main-thread event loop while CPU-intensive layout calculations or main-thread IPC serializations execute. The resulting number measures V8 event-loop queue blocking time rather than an intentional, awaited layout-completion event.
5. **Prior Metrics Reclassified as Invalid:** Because the measurement contract is invalid, all previously reported mode-switch timings are reclassified as **`INVALID OR INCOMPLETELY DEFINED`**. Per operating directives, repeatable timings from a flawed completion boundary cannot be preserved as `PASS`.
6. **Provisional Budgets Unratified:** Performance budgets proposed in previous reports cannot be evaluated or ratified against invalid timing measurements and remain **`UNRATIFIED / PENDING MEASUREMENT CONTRACT REPAIR`**.

---

## 2. Repository Provenance & Environment Context

- **Working Directory:** `/app`
- **Git Branch:** `jules-9926293733828335925-7f235896`
- **Current Commit SHA (`HEAD`):** `92a63b53bb7c4c95d550774c41d2927683048613`
- **Parent Merge Commit:** `92a63b5` (merging PR #665 incorporating PR #664, commit `6de2a47ea7465cda3fbff2f4e350596ed203178b`)
- **Git Working Tree Status:** Clean (`git status --short` output empty; 0 modified, 0 untracked files)
- **Git Diff Summary:** `0` lines changed (`git diff --stat` output empty)
- **Node.js Version:** `v22.22.1`
- **npm Version:** `11.11.0`
- **Playwright Runner:** Chromium `153.0.8010.12` (Headless Shell Linux64, build `v1243`)
- **Active Explorer Server:** Vite Dev Server running on `http://localhost:3000` (`Vary: Origin`, HTTP 200 OK)

### Dataset Count Verification
All dataset tiers were verified directly from project JSON contracts before benchmarking:
- **`default` (Small):** 4 nodes / 3 edges / 1 LWC (`explorer/public/explorer-data.json`)
- **`cloud-spend-tracker` (Medium):** 240 nodes / 1,024 edges / 26 LWCs (`audit-fixtures/cloud-spend-tracker/explorer-data.json`)
- **`pbim` (Large):** 528 nodes / 2,063 edges / 30 LWCs (`explorer/public/projects/pbim/explorer-data.json`)

---

## 3. Benchmark Instrumentation & Timing Lifecycle Trace

Inspection of `scripts/test-phase6-performance.cjs`, `explorer/src/components/GraphView.tsx`, `explorer/src/lib/graph-layout.ts`, `explorer/src/lib/workers/layout-worker-client.ts`, and `explorer/src/lib/workers/layout.worker.ts` establishes the complete execution lifecycle.

```
[1. User Click] ──► [2. React State Update] ──► [3. DOM Badge Renders (<10ms)]
                           │
                           ▼
             [4. useEffect Async Dispatch]
                           │
                           ▼
          [5. Worker IPC / Sync Layout Compute]
                           │
                           ▼
             [6. Promise Resolution (.then)]
                           │
                           ▼
             [7. Cytoscape Position Update]
                           │
                           ▼
           [8. Layout Settlement / Rendering]
```

### Complete Code Trace by Stage

1. **User Action Initiation ($T_0$):**
   - **Source:** `scripts/test-phase6-performance.cjs` lines 47–50
   - **Code:** `await page.evaluate(() => { const btn = document.querySelector('[data-testid="architecture-mode-toggle"]'); if (btn) btn.click(); });`
   - **Target:** Button with `data-testid="architecture-mode-toggle"` in `explorer/src/components/GraphControls.tsx` line 189.

2. **React State Update & Mode Indicator Badge Re-Render:**
   - **Source:** `explorer/src/components/GraphView.tsx` lines 1229–1241 (`handleToggleArchitectureModeInternal`).
   - **Action:** Triggers `onArchitectureModeChange(nextMode)`, updating React state in parent container (`App.tsx`).
   - **Render:** `GraphView.tsx` re-renders. Line 1275 updates text in `[data-testid="graph-mode-indicator"]`:
     ```tsx
     {layoutMode === 'static' ? '📌 Static Mode — Node positions preserved' : `🔀 Interactive Mode (${architectureMode === 'constellation' ? 'Constellation' : architectureMode === 'orbit' ? 'Orbit' : architectureMode === 'hybrid' ? 'Hybrid' : 'Hierarchical'})`}
     ```
   - **Boundary Proof:** The badge text updates **synchronously** during the React render cycle (<10 ms after click).

3. **Asynchronous Layout Dispatch:**
   - **Source:** `explorer/src/components/GraphView.tsx` lines 316–387 (`useEffect([architectureMode, ...])`).
   - **Condition:** For datasets with $N \ge 20$, `runLayoutWithMetadataAsync(cy, ...)` is called.
   - **Delegation:** `runLayoutWithMetadataAsync` in `explorer/src/lib/graph-layout.ts` lines 311–340 calls `globalWorkerClient.calculateLayoutAsync(...)` in `explorer/src/lib/workers/layout-worker-client.ts` lines 130–310.

4. **Layout Computation Execution:**
   - **Worker Offload:** `calculateLayoutAsync` posts `CALCULATE_LAYOUT` message to Web Worker (`layout.worker.ts`).
   - **Computation:** Worker executes `computeArchitectureLayoutWithMetadata(nodes, edges, workerOptions)`.
   - **Fallback:** If Web Worker initialization fails or throws an error, execution falls back synchronously on the main thread.

5. **Promise Resolution & Cytoscape Position Application:**
   - **Worker Response:** Message handler receives `LayoutWorkerResponse` with calculated position map `posMap`.
   - **Cytoscape DOM Mutate:** `runLayoutWithMetadataAsync` applies positions via `cy.batch()` (`graph-layout.ts` lines 353–357) and filters element visibility.
   - **State Persistence:** `.then()` callback in `GraphView.tsx` lines 351–355 updates `featureRegions`, `orbitGuides`, and calls `captureAndPersistPositions(targetProvenance)`.

6. **Benchmark End Boundary Capture:**
   - **Source:** `scripts/test-phase6-performance.cjs` lines 52–59:
     ```javascript
     await page.waitForTimeout(2000);

     const currentModeText = await page.evaluate(() => {
       return document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim();
     });

     const elapsed = Date.now() - t0;
     ```

### Critical Flaws in Benchmark Instrumentation

1. **No Awaited Promise or Completion Event:** `scripts/test-phase6-performance.cjs` does not attach a promise listener, does not listen to a Cytoscape `layoutstop` event, does not observe node coordinate changes, and does not monitor worker message events.
2. **Premature Completion Indicator:** The query target `[data-testid="graph-mode-indicator"]` reaches its target value in Stage 2 (<10 ms after click), BEFORE Stage 3, 4, 5, or 6 occur.
3. **Arbitrary 2,000 ms Sleep Floor:** `page.waitForTimeout(2000)` enforces a mandatory 2-second minimum wait. For Small datasets where computation takes $<5\text{ ms}$, the script incorrectly reports $\sim 2,024\text{ ms}$.
4. **V8 Queue Blocking Conflation:** For Large datasets (PBIM), `page.evaluate()` takes 18–36 seconds because CPU-intensive layout calculations saturate the V8 main-thread event loop queue. The recorded duration is an artifact of event-loop queue blocking rather than an explicit layout completion signal.

---

## 4. Reconciliation & Reassessment of Prior Performance Claims

### Reconciliation Table: Prior Claims vs. Re-Measured Script Output

| Dataset Tier | Layout Mode | Previously Reported Median | Re-Measured Script Output (This Run) | Evidence-Backed Status | Technical Reason for Invalidity / Artifact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Default (Small)** | Hybrid | 2,024 ms | 2,039 ms | `INVALID OR INCOMPLETELY DEFINED` | Pure compute takes <5 ms; ~2,000 ms is forced sleep by `waitForTimeout(2000)`. |
| **Default (Small)** | Orbit | 2,012 ms | 2,023 ms | `INVALID OR INCOMPLETELY DEFINED` | Pure compute takes <5 ms; ~2,000 ms is forced sleep by `waitForTimeout(2000)`. |
| **Cloud Spend Tracker (Medium)** | Hybrid | 5,251 ms | 5,987 ms | `INVALID OR INCOMPLETELY DEFINED` | Composite artifact of 2,000 ms sleep + main-thread V8 queue lag. |
| **Cloud Spend Tracker (Medium)** | Orbit | 3,965 ms | 3,844 ms | `INVALID OR INCOMPLETELY DEFINED` | Composite artifact of 2,000 ms sleep + main-thread V8 queue lag. |
| **Cloud Spend Tracker (Medium)** | Constellation | 2,509 ms | 2,748 ms | `INVALID OR INCOMPLETELY DEFINED` | Composite artifact of 2,000 ms sleep + ~750 ms main-thread delay. |
| **Cloud Spend Tracker (Medium)** | Hierarchical | 3,732 ms | 4,829 ms | `INVALID OR INCOMPLETELY DEFINED` | Composite artifact of 2,000 ms sleep + main-thread V8 queue lag. |
| **PBIM (Large)** | Hybrid | 35,006 ms | 36,415 ms | `INVALID OR INCOMPLETELY DEFINED` | Artifact measuring main-thread V8 queue blocking during $O(N^2/E\cdot N)$ packing. |
| **PBIM (Large)** | Orbit | 25,210 ms | 19,964 ms | `INVALID OR INCOMPLETELY DEFINED` | Artifact measuring main-thread V8 queue blocking during radial BFS projection. |
| **PBIM (Large)** | Constellation | 3,083 ms | 3,861 ms | `INVALID OR INCOMPLETELY DEFINED` | Composite artifact of 2,000 ms sleep + ~1,860 ms projection execution. |
| **PBIM (Large)** | Hierarchical | 13,852 ms | 18,147 ms | `INVALID OR INCOMPLETELY DEFINED` | Artifact measuring main-thread V8 queue blocking during layered flow layout. |

### Separation of Initial Data Load Latency
The previous report recorded an initial page load time for PBIM of **78,090 ms**.
- **Audit Verification:** This figure represents initial HTTP navigation, JSON dataset fetch/parse, Cytoscape graph construction, and initial DOM element binding.
- **Contract Boundary:** Initial page load MUST be kept strictly separate from mode-switch layout latency. It is an initial page initialization metric, not a mode-switch layout calculation metric.

---

## 5. Unratified Performance Budgets Assessment

The previous report proposed the following provisional maximum allowable latencies:
- **Small ($N \le 20$):** Hybrid / Orbit / Constellation $\le 3,000\text{ ms}$
- **Medium ($N \le 300, E \le 1200$):** Constellation $\le 4,000\text{ ms}$; Hybrid / Orbit / Hierarchical $\le 8,000\text{ ms}$
- **Large ($N \le 600, E \le 2500$):** Constellation $\le 6,000\text{ ms}$; Hierarchical $\le 25,000\text{ ms}$; Orbit $\le 35,000\text{ ms}$; Hybrid $\le 45,000\text{ ms}$

### Budget Status: `UNRATIFIED / PENDING MEASUREMENT CONTRACT REPAIR`

1. **Incomparable Metrics:** Performance budgets cannot be meaningfully evaluated or ratified against measurements produced by an invalid completion boundary (which includes arbitrary 2-second sleep floors and V8 queue artifacts).
2. **Category Distinction:**
   - **Category 1 — Observed Baseline:** Script outputs from `scripts/test-phase6-performance.cjs` (2s floor + main-thread queue lag).
   - **Category 2 — Provisional Engineering Targets:** Unverified targets proposed in prior reports.
   - **Category 3 — Formally Approved Product Budgets:** `UNAPPROVED / PENDING` product decision record.
3. **Mandatory Sequence:** Budget ratification MUST take place ONLY AFTER the benchmark measurement contract is repaired with a verified, deterministic completion signal (e.g. awaited layout promise or custom `app:layoutcomplete` event).

---

## 6. Algorithmic Complexity & Memory Telemetry Review

### 1. Algorithmic Complexity Verification

Source code inspection of `explorer/src/lib/layout/features.ts` (`discoverFeatures`), `explorer/src/lib/layout/global-layout.ts` (`computeGlobalFeatureLayout`), and `explorer/src/lib/layout/spacing.ts` (`resolveSpacingAndCollisions`) confirms the prior complexity claims:

- **Seed Ranking:** $O(V \cdot (\text{fanIn} + \text{fanOut})) = O(V + E)$ scan across all nodes and edges.
- **Cluster Candidate Expansion (`discoverFeatures` lines 270–380):**
  For each seed, an expansion loop scores candidate nodes against all current cluster primary members $M$. For candidate $c$ with degree $d(c)$, calculating dependency edges and execution-chain alignment takes $O(|M|)$ operations. Summed across all feature clusters, total candidate expansion time scales as $O(\sum |V_c|^2) \le O(V^2)$.
- **Global Region Packing & Collision Resolution (`resolveSpacingAndCollisions`):**
  Iterative AABB overlap detection and translation across feature regions performs pairwise bounding-box checks $O(R^2)$ where $R$ is cluster count, expanding to $O(V \cdot E)$ under dense edge coupling.
- **Verdict:** The prior report's claim that Hybrid layout exhibits $O(N^2)$ to $O(E \cdot N)$ behavior is **PROVEN ACCURATE** by source code structure.

### 2. V8 JS Heap Memory Telemetry (`window.performance.memory`)

In headless Chromium, `window.performance.memory` returns V8 heap statistics:
- **Default Dataset (Small):** Used JS Heap: **54.17 MB** / Total: **110.63 MB**
- **Cloud Spend Tracker (Medium):** Used JS Heap: **124.93 MB** / Total: **242.23 MB**
- **PBIM Dataset (Large):** Used JS Heap: **202.18 MB** / Total: **272.75 MB**

### Memory & Stability Scope Limitations
1. **Single Point-in-Time Snapshots:** These figures represent single V8 heap snapshots taken at the end of sequential project navigations.
2. **Heap Headroom Verified:** They confirm that memory usage stays within V8 default heap allocation limits (<300 MB).
3. **Long-Session Retention Unverified:** Point-in-time snapshots do **not** prove long-session stability, absence of memory leaks during infinite mode-switch cycles, or garbage-collection retention over multi-hour usage.
4. **GPU Framing Rate Unverified:** 60 FPS GPU canvas rendering and frame-rate stability during continuous drag/zoom remain **explicitly unverified** due to headless Playwright Linux container constraints without display hardware acceleration.

---

## 7. Automated Test Results & Script Verification

All required automated test suites were executed against the active codebase and verified:

### 1. Targeted Vitest Component & Integration Suites
Command:
```bash
cd explorer && npx vitest run src/test/static-constellation-projection.test.ts src/test/component-orbit-integration.test.ts src/test/PhaseIntegrationVerification.test.tsx src/components/GraphView.layoutModeToggle.test.tsx
```
- **Result:** `4` passed test files out of `4`, `20` passed individual tests out of `20` (0 failed, duration 8.83s).
- **`static-constellation-projection.test.ts` Inspection:** Line 118 correctly maps `(n) => n.nodeId` on `ComponentConstellationNode` interface, verifying exact string set matching for shared Apex hub classes.

### 2. Master CLI Integration Test Suite
Command:
```bash
npm run test:cli
```
- **Result:** `31` passed test scripts out of `31` (100% pass rate, exit code `0`).

### 3. Playwright Performance Script Execution
Command:
```bash
node scripts/test-phase6-performance.cjs
```
- **Execution Summary:** Executed matrix across Default, Cloud Spend Tracker, and PBIM datasets.
- **Page Errors:** `0` uncaught JavaScript exceptions.
- **Console Errors / Warnings:** `3` non-fatal warnings (Vite HMR notices & Cytoscape custom wheel sensitivity warnings).

### 4. Diagnosis of Non-CI Deferred Browser Scripts
- **`scripts/audit-component-orbit-browser.cjs`:** Fails with CJS `require` error when importing TypeScript module `component-orbit-adapter.ts`. Keep deferred.
- **`scripts/audit-component-orbit-constellation-browser.cjs`:** Fails dataset SHA hash check (legacy hash `d6dee0d0...` vs active PBIM hash `395c23bd...`). Keep deferred.
- **`scripts/verify-c3-browser-truth.cjs`:** Fails with `ERR_CONNECTION_REFUSED` at port `5173` (dev server runs on port `3000`). Keep deferred.

---

## 8. File Diff & Production Code Modification Status

- **Files Created:**
  - `ARCHITECTURE_EXPLORER_FINAL_PERFORMANCE_EVIDENCE_VALIDITY_REPORT.md` (Audit report)
- **Production Code Changes:** `0` lines mutated (`explorer/src/` diff = `0`).
- **Test Code Changes:** `0` lines mutated (`explorer/src/test/` diff = `0`).
- **Script Changes:** `0` lines mutated (`scripts/` diff = `0`).
- **Git Working Tree Status:** Clean.

---

## 9. Recommended Next Actions

To establish a valid performance baseline and ratify product performance budgets, the following sequential steps are recommended:

1. **Instrument Test-Only Layout Completion Event Signal:**
   - In `explorer/src/components/GraphView.tsx`, dispatch a custom DOM event `app:layoutcomplete` (or populate a window property `window.__LAST_LAYOUT_COMPLETED__`) inside the `.then()` resolution callback of `runLayoutWithMetadataAsync` and `runLayoutWithMetadata`.
   - Ensure the detail payload includes `architectureMode`, `requestId`, `timestamp`, and `computeDurationMs`.

2. **Update Performance Benchmark Measurement Contract:**
   - In `scripts/test-phase6-performance.cjs`, replace `page.waitForTimeout(2000)` and the indicator text query with an explicit Playwright event listener:
     ```javascript
     await page.evaluate(() => new Promise((resolve) => {
       window.addEventListener('app:layoutcomplete', (e) => resolve(e.detail), { once: true });
       document.querySelector('[data-testid="architecture-mode-toggle"]')?.click();
     }));
     ```
   - Measure $T_{\text{complete}} - T_{\text{click}}$ directly from the event payload.

3. **Re-Benchmark Supported Datasets & Ratify Budgets:**
   - Execute the updated benchmark script with 1 warm-up run and 5 measured repetitions per dataset/mode combination.
   - Record exact min, max, median, mean, and range statistics.
   - Submit re-measured baselines to Product Management for formal performance budget ratification.
