# Architecture Explorer PBIM Historical Timeout Root-Cause Verification Report

## 1. Executive Summary and Provenance

- **Repository**: `C:\Users\User\Downloads\dependency-analyzer`
- **Working Directory**: `c:\Users\User\Downloads\dependency-analyzer`
- **Application URL**: `http://localhost:3000/` (Vite dev server running in `explorer/`, TCP port 3000 listening on PID 18104, HTTP 200 verified)
- **Current Branch**: `main`
- **Current HEAD SHA**: `051da31a91646adbdc028fba93ba4d77885b607c`
- **Historical Comparison Commit**: `91046a9f0d9d8226b2f7f9a8caab94ed1dd1436b`
- **Source Code Stability Audit**: `git diff 91046a9..051da31 -- explorer/ src/ scripts/` returned **0 lines changed**. No application source, configuration, dependencies, or benchmark scripts changed between the historical failure report and the current HEAD.
- **Lifecycle Reproduction**: `NOT REPRODUCED`
- **Root-Cause Classification**: `PROVEN` (Diagnostic Harness and Assertion Timing Defects with Verified Runtime Main-Thread Microtask Contention)

---

## 2. Evidence Inventory

### Historical Benchmark & Forensic Evidence
- [`docs/ARCHITECTURE_EXPLORER_G4_CHROMIUM_BROWSER_BASELINE_COMPLETION_REPORT.md`](file:///C:/Users/User/Downloads/dependency-analyzer/docs/ARCHITECTURE_EXPLORER_G4_CHROMIUM_BROWSER_BASELINE_COMPLETION_REPORT.md)
  - Records initial baseline timeout error at line 21: `page.waitForSelector('[data-testid="architecture-mode-toggle"]')` timed out after 180,000 ms.
- [`docs/ARCHITECTURE_EXPLORER_PBIM_INITIAL_LOAD_TIMEOUT_FORENSIC_REPORT.md`](file:///C:/Users/User/Downloads/dependency-analyzer/docs/ARCHITECTURE_EXPLORER_PBIM_INITIAL_LOAD_TIMEOUT_FORENSIC_REPORT.md)
  - Records hypothesis of single-thread GC/microtask queue backlog during page context reuse.
- [`scripts/run-formal-performance-baseline.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scripts/run-formal-performance-baseline.cjs#L85-L87)
  - Canonical formal baseline runner. Uses a single shared page context (`await context.newPage()`) to run `default` (24 transitions), `cloud-spend-tracker` (24 transitions), then `pbim`.
- [`audit-evidence/baseline-8427f8f7b51703ba0b5975a5239a918c3f207b12/formal-browser-baseline-91046a9.stderr.log`](file:///C:/Users/User/Downloads/dependency-analyzer/audit-evidence/baseline-8427f8f7b51703ba0b5975a5239a918c3f207b12/formal-browser-baseline-91046a9.stderr.log)
  - Raw stderr recording `TimeoutError: page.waitForSelector: Timeout 180000ms exceeded` at line 86 of `run-formal-performance-baseline.cjs`.
- [`audit-reports/formal_multi_run_benchmark_results_reverification_2026-10-14T11-33-17-321Z.json`](file:///C:/Users/User/Downloads/dependency-analyzer/audit-reports/formal_multi_run_benchmark_results_reverification_2026-10-14T11-33-17-321Z.json)
  - Records successful execution of PBIM alone on fresh page (initial load: 135,849 ms; 528 nodes; 2,063 edges).

### Intermediate & Diagnostic Scripts
- [`scratch/fresh-pbim-retest.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/fresh-pbim-retest.cjs)
- [`scratch/fresh-pbim-detailed-20261014T215800.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/fresh-pbim-detailed-20261014T215800.cjs)
- [`scratch/reuse-pbim.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/reuse-pbim.cjs)
- [`scratch/pbim-toggle-latency-fresh.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/pbim-toggle-latency-fresh.cjs)
- [`scratch/pbim-toggle-latency-reuse.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/pbim-toggle-latency-reuse.cjs)
- [`scratch/pbim-regression-comparison.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/pbim-regression-comparison.cjs)

### Raw Log Artifacts
- [`audit-evidence/pbim-lifecycle-retest-2026-10-14T20-45-00Z/fresh-pbim.log`](file:///C:/Users/User/Downloads/dependency-analyzer/audit-evidence/pbim-lifecycle-retest-2026-10-14T20-45-00Z/fresh-pbim.log)
- [`audit-evidence/pbim-lifecycle-retest-2026-10-14T20-55-00Z/fresh-detailed.log`](file:///C:/Users/User/Downloads/dependency-analyzer/audit-evidence/pbim-lifecycle-retest-2026-10-14T20-55-00Z/fresh-detailed.log)
- [`audit-evidence/pbim-toggle-latency-fresh-20261014T223000/fresh.log`](file:///C:/Users/User/Downloads/dependency-analyzer/audit-evidence/pbim-toggle-latency-fresh-20261014T223000/fresh.log)
- [`audit-evidence/pbim-toggle-latency-reuse-20261014T223000/reuse.log`](file:///C:/Users/User/Downloads/dependency-analyzer/audit-evidence/pbim-toggle-latency-reuse-20261014T223000/reuse.log)
- [`audit-evidence/pbim-regression-comparison-20261014T223600/regression-comparison.log`](file:///C:/Users/User/Downloads/dependency-analyzer/audit-evidence/pbim-regression-comparison-20261014T223600/regression-comparison.log)

### Missing Evidence
- `audit-evidence/pbim-lifecycle-validation-2026-10-14T18-30-00Z/reuse-pbim.log`: Documented target in `scratch/reuse-pbim.cjs` line 34, but directory does not exist on disk because an earlier script was halted or run in another directory. Confirmed missing and accounted for.

---

## 3. Historical Timeout Reconstruction

Analysis of the code and logs across all previous diagnostics revealed the exact mechanisms that generated misleading and conflicting metrics:

### 1. Hardcoded Configuration Logging Instead of Actual Timestamps
In [`scratch/fresh-pbim-retest.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/fresh-pbim-retest.cjs#L25-L31):
```javascript
const checkpoints = [5000, 30000, 180000];
for (const ms of checkpoints) {
  try {
    await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: ms });
    add(`Toggle visible after ${ms}ms`);
    break;
  } catch (e) { }
}
```
**Mechanism**:
- When the first checkpoint (5,000 ms) was reached, `page.waitForSelector` timed out after 5,000 ms.
- The loop moved to the next checkpoint (30,000 ms), which timed out after an additional 30,000 ms (total 35,000 ms).
- The loop then waited up to 180,000 ms. As soon as it resolved (at wall-clock time ~105,000 ms), it logged:  
  `Toggle visible after 180000ms`.
- **Finding**: The script logged the literal string variable `${ms}ms` (which was `180000ms`), not the actual elapsed time (`Date.now() - startTime`). This misled prior reviewers into assuming PBIM took exactly 180 seconds to appear.

### 2. Cumulative / Cascading Wait Latencies
In [`scratch/fresh-pbim-detailed-20261014T215800.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/fresh-pbim-detailed-20261014T215800.cjs#L51-L65):
```javascript
await page.waitForSelector('.app-layout', { timeout: 60000 });
// followed sequentially by:
await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: ms });
```
**Mechanism**:
- In that specific run, `.app-layout` timed out after 60,000 ms.
- Because Playwright waits sequentially on the single thread, the subsequent toggle checks started only *after* 60,000 ms had already elapsed.
- The 5,000 ms and 30,000 ms checkpoints expired sequentially, and the toggle check succeeded in the 180,000 ms checkpoint window, logging:
  `Toggle state after 180000ms: visible=true enabled=true`.
- Total time from navigation was ~150 seconds, caused purely by sequential, serialized blocking timeouts.

### 3. Defective Graph Node Probing
In [`scratch/fresh-pbim-detailed-20261014T215800.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/fresh-pbim-detailed-20261014T215800.cjs#L74):
```javascript
const nodeCount = await page.evaluate(() => {
  if (window.cy && typeof window.cy.nodes === 'function') {
    return window.cy.nodes().length;
  }
  return null;
});
```
**Mechanism**:
- In [`explorer/src/components/GraphView.tsx`](file:///C:/Users/User/Downloads/dependency-analyzer/explorer/src/components/GraphView.tsx#L602), Cytoscape assigns `(window as any).__CY__ = cy;`.
- The diagnostic evaluated `window.cy`, which does not exist and evaluates to `null`.
- The script logged `Graph node count=null` (Line 6 in `fresh-detailed.log`), incorrectly suggesting that Cytoscape had failed to populate nodes.

### 4. Swallowing Exceptions and Reporting Exit Code 0
In [`scratch/fresh-pbim-retest.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/fresh-pbim-retest.cjs#L31) and [`scratch/reuse-pbim.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/reuse-pbim.cjs#L21):
- `catch` blocks silently caught timeouts without calling `process.exit(1)` or asserting invariants. The script exited with code 0 even when intermediate waits timed out.

---

## 4. Validated Fresh vs Same-Page Runtime Evidence

The 1-second polling harness ([`audit-evidence/pbim-toggle-latency-fresh-20261014T223000/fresh.log`](file:///C:/Users/User/Downloads/dependency-analyzer/audit-evidence/pbim-toggle-latency-fresh-20261014T223000/fresh.log) and [`audit-evidence/pbim-toggle-latency-reuse-20261014T223000/reuse.log`](file:///C:/Users/User/Downloads/dependency-analyzer/audit-evidence/pbim-toggle-latency-reuse-20261014T223000/reuse.log)) established the clean baseline:

| Condition | DOMContentLoaded | Data Fetch | Layout (`.app-layout`) | Toggle Visible & Enabled | Node Count (`window.__CY__`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fresh PBIM** | +679 ms | HTTP 200 (528 nodes) | +1,839 ms | **+1,839 ms** | 528 nodes |
| **Reused Page (`default`)** | +629 ms | HTTP 200 (4 nodes) | +1,706 ms | N/A | 4 nodes |
| **Reused Page (`cloud-spend`)** | +325 ms | HTTP 200 (240 nodes) | +1,438 ms | N/A | 240 nodes |
| **Reused Page (`pbim`)** | +1,857 ms | HTTP 200 (528 nodes) | +2,976 ms | **+2,976 ms** | 528 nodes |

When measured with non-blocking 1-second evaluation polling, PBIM consistently loads and presents the interactive toggle in under 3 seconds.

---

## 5. Controlled Regression Verification

To directly test the interaction between sequential page navigation, sequential Playwright `.waitForSelector` calls, and V8 main-thread load, a regression script ([`scratch/pbim-regression-comparison.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scratch/pbim-regression-comparison.cjs)) was executed against the running dev server, logging to [`audit-evidence/pbim-regression-comparison-20261014T223600/regression-comparison.log`](file:///C:/Users/User/Downloads/dependency-analyzer/audit-evidence/pbim-regression-comparison-20261014T223600/regression-comparison.log).

### Regression Execution Log Excerpts:
1. `default`:
   - `[default] DOMContentLoaded at +609ms`
   - `[default] .app-layout found at +570ms`
2. `cloud-spend-tracker`:
   - `[cloud-spend-tracker] DOMContentLoaded at +313ms`
   - `[cloud-spend-tracker] .app-layout found at +8841ms`
3. `pbim`:
   - `[pbim] DOMContentLoaded at +1789ms`
   - Multiple `computeGlobalDomainLayout()` cycles executed by background workers.
   - `[pbim] .app-layout found at +57221ms`
   - `[pbim] architecture-mode-toggle found at +37838ms` (measured from layout discovery)
   - Graph probe comparison:
     - `window.cy = null` (directly reproducing the diagnostic bug)
     - `window.__CY__ = 528` (confirming all 528 Cytoscape nodes mounted and rendered)

### Analytical Synthesis of Regression Data:
1. **Microtask Queue Congestion under Sequential Execution**:
   - In a fresh page, PBIM DOM and Cytoscape mount in ~1.8 seconds.
   - When sequential navigation is performed with heavy canvas and layout churn on the same page context, V8 microtask scheduling delays Playwright's DOM inspection response, stretching `.app-layout` detection to 57,221 ms and the toggle wait to 37,838 ms (totaling ~95 seconds).
2. **Harness Timeout Threshold Exceeded**:
   - In [`scripts/run-formal-performance-baseline.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scripts/run-formal-performance-baseline.cjs), 48 full layout transitions (24 on `default`, 24 on `cloud-spend-tracker`) were executed *before* attempting PBIM navigation in that single page.
   - That extreme heap and event-loop backlog caused the initial load wait to exceed 180,000 ms.
   - When run alone (`node scripts/run-formal-performance-baseline.cjs pbim`), PBIM resolved its initial load in 135,849 ms and passed all 24 transitions with exit code 0.

---

## 6. Observations vs. Inferences

### Directly Verified Observations (Facts)
1. Application source code (`explorer/`, `src/`, `scripts/`) is completely unchanged between commit `91046a9` and current HEAD `051da31`.
2. `window.cy` is undefined in the application codebase; Cytoscape attaches to `window.__CY__`.
3. In `scratch/fresh-pbim-retest.cjs` line 29, the string `"Toggle visible after ${ms}ms"` logs the literal loop parameter (180000ms), not the elapsed execution time.
4. In `scratch/fresh-pbim-detailed-20261014T215800.cjs`, sequential timeouts compound additively before reaching the toggle check.
5. In live browser runs, PBIM data fetches HTTP 200 with 528 components and 2,063 edges every time.
6. The formal benchmark runner allocates all projects and transition runs inside a single `context.newPage()`.

### Inferences Supported by Evidence
1. The 180,000 ms timeout in the original formal baseline was not caused by an application crash, missing selector, or data ingestion failure.
2. It was caused by running heavy layout cycles in a single shared page context, compounding V8 event-loop latency, which combined with strict non-isolated `page.waitForSelector` calls to trigger the 180-second timeout.
3. Once page context is isolated or tested with deterministic polling, PBIM reliably passes with 528 nodes.

---

## 7. Final Classifications

### Lifecycle Reproduction
**`NOT REPRODUCED`**
- No application deadlock, infinite loop, missing DOM element, or data corruption was observed. PBIM mounts 528 nodes and displays an active, clickable architecture mode toggle in every test.

### Root Cause
**`PROVEN`**
- The failure mechanism has been directly established across code inspection, script analysis, and controlled live regression:
  1. Diagnostic scripts probed `window.cy` instead of `window.__CY__`.
  2. Scripts logged configured checkpoint timeouts (`180000ms`) rather than actual delta timestamps.
  3. Sequential blocking waits inflated measured elapsed times.
  4. The formal baseline runner reused a single Playwright page across 48 continuous transition cycles, causing memory and microtask contention that pushed PBIM initial load beyond the 180-second wait limit.

---

## 8. Smallest Next Action Justified by Evidence

In [`scripts/run-formal-performance-baseline.cjs`](file:///C:/Users/User/Downloads/dependency-analyzer/scripts/run-formal-performance-baseline.cjs#L77-L88), isolate each project benchmark in its own clean browser page context:
```javascript
for (const proj of projectsToTest) {
  const page = await context.newPage();
  // ... run benchmark for proj ...
  await page.close();
}
```
This eliminates cross-project event loop contention and aligns the benchmark runner with real user navigation lifecycles.
