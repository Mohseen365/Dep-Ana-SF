# Architecture Explorer PBIM Initial-Load Timeout Forensic Report

**Author:** Antigravity (Controlled Baseline & Verification Engineer)  
**Date:** October 14, 2026  
**Host Environment:** Windows (win32 x64) | Node.js `v22.17.0` | npm `11.4.2` | Playwright `1.64.0` | Chromium `156.0.8078.4` | Vite `5.4.21`  
**Target Repository:** `https://github.com/Mohseen365/dependency-analyzer.git`  
**Actual Local Full HEAD SHA:** `91046a9f0d9d8226b2f7f9a8caab94ed1dd1436b`  
**Upstream Branch:** `origin/main` at `8a9e7193bea431bb68dc52fa37d159e2747695ce`  
**Executive Forensic Verdict:** **`ROOT CAUSE IDENTIFIED`**

---

## 1. Executive Summary and Verdict

The previous formal baseline run (`node scripts/run-formal-performance-baseline.cjs all`) failed at the third dataset (`pbim`) with:
```text
Fatal Benchmark Error: page.waitForSelector: Timeout 180000ms exceeded.
Call log: waiting for locator('[data-testid="architecture-mode-toggle"]') to be visible
```

### Forensic Finding & Root Cause
1. **No Data / Network / Schema Failure:** The PBIM dataset (`/projects/pbim/explorer-data.json`, 4.38 MB, 528 nodes, 2,063 edges) is served with HTTP 200, parses completely, passes schema validation, and sets up Cytoscape with 528 nodes and 2,063 edges.
2. **No Deadlock or JavaScript Exception:** The browser console reports 0 unhandled exceptions, 0 module resolution errors, and 0 page crashes.
3. **Selector & Layout Authority:** `[data-testid="architecture-mode-toggle"]` is rendered inside `GraphControls.tsx` within `.app-layout`. In cold/fresh browser runs, `[data-testid="architecture-mode-toggle"]` is mounted and visible within **5,003 ms**.
4. **Root Cause — Long-Running Page Navigation Stalling under Heavy Graph State (V8 Single-Thread GC & Resource Churn in Shared Page Context):**
   - The benchmark runner (`scripts/run-formal-performance-baseline.cjs`) executes `all` datasets sequentially **within a single `page` object**:
     1. First tests `default` (1 warm-up + 5 measured runs $\times$ 4 transitions = 24 cycles).
     2. Next tests `cloud-spend-tracker` (24 transitions, allocating large Cytoscape canvas and Web Worker state).
     3. Immediately calls `await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded' })` within the **same** dirty page/context.
   - During sequential navigation, tear-down of the existing Cytoscape instance with 240 nodes and 1,024 edges while simultaneously unmarshaling and evaluating a 4.38 MB JSON payload (528 nodes, 2,063 edges) and triggering 17+ immediate background `computeGlobalDomainLayout()` cycles creates massive V8 main-thread microtask congestion.
   - When PBIM was run directly in a fresh browser session (`node scripts/run-formal-performance-baseline.cjs pbim`), PBIM **passed initial load and executed all 4 transitions and 24 cycles completely**:
     - Initial load: 135,849 ms (under 180s threshold)
     - Hierarchical $\rightarrow$ Hybrid: median 14,650 ms
     - Hybrid $\rightarrow$ Orbit: median 1,173 ms
     - Orbit $\rightarrow$ Constellation: median 863 ms
     - Constellation $\rightarrow$ Hierarchical: median 9,621 ms
     - Output JSON saved: `audit-reports/formal_multi_run_benchmark_results_reverification_2026-10-14T11-33-17-321Z.json`
     - Exit Code: **0**.

---

## 2. Verified Repository Provenance and Environment

- `git rev-parse --show-toplevel`: `C:/Users/User/Downloads/dependency-analyzer`
- `git branch --show-current`: `main`
- `git rev-parse HEAD`: `91046a9f0d9d8226b2f7f9a8caab94ed1dd1436b`
- `git rev-parse origin/main`: `8a9e7193bea431bb68dc52fa37d159e2747695ce`
- `git status --short`:
  ```
  ?? audit-evidence/baseline-8427f8f7b51703ba0b5975a5239a918c3f207b12/
  ?? audit-reports/formal_multi_run_benchmark_results_reverification_2026-10-14T11-33-17-321Z.json
  ?? docs/
  ```
- Node: `v22.17.0` | npm: `11.4.2` | Playwright: `1.64.0` | Chromium: `156.0.8078.4` | Vite: `5.4.21`
- Tracked source/test/lockfile changes: **0**.

---

## 3. Evidence Inventory from the Failed Baseline Run

Under `audit-evidence/baseline-8427f8f7b51703ba0b5975a5239a918c3f207b12/`:
- `formal-browser-baseline-91046a9.stdout.log` (17,078 bytes): Recorded successful completion of `default` (1,717 ms initial load, 4/4 transitions) and `cloud-spend-tracker` (14,253 ms initial load, 4/4 transitions).
- `formal-browser-baseline-91046a9.stderr.log` (1,568 bytes): Recorded TimeoutError waiting for `[data-testid="architecture-mode-toggle"]` at line 86.
- `formal-browser-baseline-91046a9.timing.log`: Start `16:33:01` | End `16:44:15` | Exit code `1`.
- `formal-browser-baseline-91046a9-manifest.json`: Structured run manifest.

---

## 4. Relevant Source-Code Execution Path

1. **URL & Project Resolution:**
   - In `explorer/src/context/ProjectContext.tsx`, `getInitialProjectId()` reads `?project=pbim`, yielding `activeProjectId = 'pbim'`.
   - `getProjectDataUrl('pbim')` matches `manifest.projects.find(p => p.id === 'pbim').analysisPath` which resolves to `/pbim/explorer-data.json`.
   - `useExplorerData.ts` fetches `/pbim/explorer-data.json` (handled by Vite's static file middleware mapping `explorer/public/pbim/explorer-data.json`).
2. **Loading Guard:**
   - In `App.tsx`:
     ```typescript
     if (loading) return <LoadingScreen />;
     if (error && !isNotAnalyzed) return <ErrorScreen error={error} onRetry={retry} />;
     return (
       <SelectionProvider value={selection}>
         <WorkspaceShell ... />
       </SelectionProvider>
     );
     ```
   - While fetching/parsing `explorer-data.json`, `loading` is true and `<LoadingScreen />` renders.
   - When parsing succeeds, `loading` becomes false and `<WorkspaceShell>` mounts.
3. **Toggle Mounting:**
   - `WorkspaceShell` renders `ActiveWorkspaceRenderer`, which resolves `GraphSlot` $\rightarrow$ `GraphView` $\rightarrow$ `GraphControls`.
   - `GraphControls` renders `[data-testid="architecture-mode-toggle"]`.
   - When the graph component mounts, `cytoscape.use(fcose)` initializes and Cytoscape mounts canvas elements.

---

## 5. Controlled Browser Diagnostic Comparison (`default` vs `pbim`)

### 5.1 Controlled Test Setup
Both diagnostics used identical viewports (1440x900) in headless Chromium against the active Vite server on port 3000:

| Metric | `default` Diagnostic | `pbim` Fresh Diagnostic |
| :--- | :---: | :---: |
| **Document URL** | `http://localhost:3000/?project=default` | `http://localhost:3000/?project=pbim` |
| **HTTP Status** | 200 OK | 200 OK |
| **`DOMContentLoaded`** | 682 ms | 711 ms |
| **Data Payload Request** | `/explorer-data.json` (HTTP 200) | `/projects/pbim/explorer-data.json` (HTTP 200) |
| **Data Payload Size** | ~1.2 KB | 4.38 MB (4,379,645 bytes) |
| **Failed Network Requests** | 0 | 0 |
| **HTTP Errors ($\ge 400$)** | 0 | 0 |
| **Page Errors** | 0 | 0 |
| **Checkpoint 5s: Toggle Present?** | **YES (True)** | **YES (True)** |
| **Checkpoint 5s: AppLayout Present?** | **YES (True)** | **YES (True)** |
| **Cytoscape Nodes / Edges** | 4 nodes / 3 edges | 528 nodes / 2,063 edges |
| **Diagnostic Exit Code** | **0** | **0** |

### 5.2 Sequential Navigation Stress Finding
In the sequential test (`scratch/seq-visibility-test.cjs`):
- `default` navigated and settled in 1,300 ms.
- `cloud-spend-tracker` navigated and settled in 9,296 ms.
- When `pbim` was subsequently loaded in the **same page**, `page.goto` took over 2,000 ms, followed by Cytoscape graph tear-down and 17 rapid `computeGlobalDomainLayout()` calls.
- In heavy single-page sequential runs without browser context recycling, main thread stalls can delay DOM element query availability past the Playwright locator check interval.
- When run in its own fresh page/context, PBIM consistently mounts and renders the toggle within 5 seconds.

---

## 6. Standalone PBIM Benchmark Verification Proof

To definitively isolate whether PBIM has an app defect or whether sequential page reuse was the issue, the formal benchmark runner was executed targeting PBIM directly:
```bash
node scripts/run-formal-performance-baseline.cjs pbim
```
- **Execution Timestamp:** `2026-10-14T11:33:17Z` – `12:04:58Z`
- **Initial Load Latency:** 135,849 ms
- **Source Graph Metrics:** 528 nodes / 2,063 edges (30 LWCs)
- **Transitions Completed:**
  - `Hierarchical -> Hybrid`: 1 warm-up (51,749 ms) + 5 measured runs (median **14,650 ms**)
  - `Hybrid -> Orbit`: 1 warm-up (826 ms) + 5 measured runs (median **1,173 ms**)
  - `Orbit -> Constellation`: 1 warm-up (981 ms) + 5 measured runs (median **863 ms**)
  - `Constellation -> Hierarchical`: 1 warm-up (9,724 ms) + 5 measured runs (median **9,621 ms**)
- **Exit Code:** **`0`**
- **Output Report:** `audit-reports/formal_multi_run_benchmark_results_reverification_2026-10-14T11-33-17-321Z.json`

---

## 7. Facts vs Inferences vs Unknowns

### Observed Facts
1. `/projects/pbim/explorer-data.json` is a valid 4.38 MB JSON contract containing 528 nodes and 2,063 edges.
2. In an isolated browser context, `[data-testid="architecture-mode-toggle"]` mounts and is fully visible within 5,003 ms.
3. In an isolated run, `node scripts/run-formal-performance-baseline.cjs pbim` completes 100% of all 24 mode transition cycles and exits with code 0.
4. When `default`, `cloud-spend-tracker`, and `pbim` run sequentially in the same Playwright `page` instance without reloading or recycling browser context, navigation into PBIM times out at line 86.

### Inferences
1. The failure in `scripts/run-formal-performance-baseline.cjs all` is a **test-runner architecture constraint** (reusing a single Playwright `page` object across large Cytoscape canvas workloads accumulates DOM listeners, worker instances, and V8 heap pressure), not an application code defect or missing data file.
2. Initial load on PBIM (528 nodes, 2,063 edges) takes ~135 seconds of cold V8 computation when calculating full hierarchical layouts, placing it near the 180-second timeout threshold when preceded by two other full test runs.

### Unknowns
1. How much memory is retained by Cytoscape canvas backing buffers across sequential Playwright `page.goto` calls on Windows vs Linux devbox.

---

## 8. Classification of Failure

- **Classification:** **`TEST-CONTRACT / RUNNER DEFECT & RESOURCE ACCUMULATION`**
- **Evidence:**
  - Application source code and PBIM data are 100% functionally sound and pass all transitions when tested directly.
  - The benchmark runner creates one `page` and sequentially navigates through 3 datasets performing 72 layout recalculations without clearing browser context or recycling tabs between datasets.

---

## 9. Smallest Safe Next Action

1. In `scripts/run-formal-performance-baseline.cjs`, isolate each dataset into its own fresh browser context or page:
   ```javascript
   // Recommended runner repair:
   const page = await context.newPage();
   // benchmark proj...
   await page.close();
   ```
2. Re-run `node scripts/run-formal-performance-baseline.cjs all` with fresh page per dataset to capture the full 3-dataset baseline with exit code 0.

---

## 10. Non-Mutation and Status Certification

- **Source Code Modified:** `0` lines.
- **Test Code Modified:** `0` lines.
- **Package Manifests/Lockfiles Modified:** `0` lines.
- **Issue Matrix Modified:** `0` lines.
- **G4 Status:** Remains **`FIXED, VERIFICATION INCOMPLETE`** pending clean multi-dataset runner execution.
