# Architecture Explorer G4 Chromium Browser Baseline Completion Report

**Author:** Antigravity (Controlled Baseline & Verification Engineer)  
**Date:** October 14, 2026  
**Host Environment:** Windows (win32 x64) | Node.js `v22.17.0` | npm `11.4.2` | Playwright `1.64.0` | Chromium `156.0.8078.4` | Vite `5.4.21`  
**Target Repository:** `https://github.com/Mohseen365/dependency-analyzer.git`  
**Actual Local Full HEAD SHA:** `91046a9f0d9d8226b2f7f9a8caab94ed1dd1436b`  
**Upstream Branch:** `origin/main` at `8a9e7193bea431bb68dc52fa37d159e2747695ce`  
**Executive Baseline Verdict:** **`BASELINE FAIL`**

---

## 1. Executive Summary and Verdict Rationale

This report establishes the live browser performance baseline for Architecture Explorer on commit `91046a9f0d9d8226b2f7f9a8caab94ed1dd1436b`.

### Executive Verdict: `BASELINE FAIL`
- **Server Startup & Readiness:** **PASS**. The canonical Vite application server was launched in `explorer/`, bound to port 3000, and verified ready with HTTP 200 on `http://localhost:3000/?project=default`.
- **Dataset 1 — `Default (Small)` ($N=4, E=3$):** **PASS**. Initial load completed in 1,717 ms. All 4 mode transitions (Hierarchical $\rightarrow$ Hybrid $\rightarrow$ Orbit $\rightarrow$ Constellation $\rightarrow$ Hierarchical) completed successfully across 1 warm-up and 5 measured runs each (24 total layout cycles).
- **Dataset 2 — `Cloud Spend Tracker (Medium)` ($N=240, E=1024$):** **PASS**. Initial load completed in 14,253 ms. All 4 mode transitions completed successfully across 1 warm-up and 5 measured runs each (24 total layout cycles).
- **Dataset 3 — `PBIM (Large)` ($N=528, E=2063$):** **FAIL (TIMEOUT)**. The Playwright browser navigated to `http://localhost:3000/?project=pbim`, but `page.waitForSelector('[data-testid="architecture-mode-toggle"]')` timed out after the full 180,000 ms (3 minutes) timeout window.
- **Suite Exit Code:** `1` (Fatal Benchmark Error: `TimeoutError: page.waitForSelector: Timeout 180000ms exceeded`).

Because PBIM failed to complete initial load and render the UI within the 180-second timeout threshold, the formal baseline cannot be certified as passing.

---

## 2. Actual Git Provenance and Status

### Git Environment Audit
- `git rev-parse --show-toplevel`: `C:/Users/User/Downloads/dependency-analyzer`
- `git branch --show-current`: `main`
- `git rev-parse HEAD`: `91046a9f0d9d8226b2f7f9a8caab94ed1dd1436b`
- `git remote -v`:
  - `origin https://github.com/Mohseen365/dependency-analyzer.git (fetch)`
  - `origin https://github.com/Mohseen365/dependency-analyzer.git (push)`
- `git log -5 --oneline --decorate`:
  - `91046a9 (HEAD -> main) Merge pull request #689 from Mohseen365/jules-9314064933776358154-b7dbc7df`
  - `da41d97 (origin/jules-9314064933776358154-b7dbc7df) doc(architecture-explorer): evidence-gated remediation and final readiness assessment`
  - `08e83bb Merge pull request #688 from Mohseen365/jules-8184527292476676089-68f34f6c`
  - `48c58eb (origin/jules-8184527292476676089-68f34f6c) docs: add PBIM CLI test discrepancy investigation report`
  - `47ef572 docs: finalize master remediation verification and report`
- `git rev-parse origin/main`: `8a9e7193bea431bb68dc52fa37d159e2747695ce`

### Tracked File Diff & Status
- `git status --short`:
  ```
  ?? audit-evidence/baseline-8427f8f7b51703ba0b5975a5239a918c3f207b12/
  ?? docs/
  ```
- Tracked files modified: **0**.
- Zero source files, tests, package manifests, lockfiles, Vite configs, or CI workflows were modified, committed, or pushed.

---

## 3. Identification of the Canonical Server Command

Inspection of repository manifests and scripts established:
1. **Target URL and Port:** `scripts/run-formal-performance-baseline.cjs` specifies URLs `http://localhost:3000/?project=default`, `http://localhost:3000/?project=cloud-spend-tracker`, and `http://localhost:3000/?project=pbim`.
2. **Explicit Port Configuration:** `explorer/vite.config.ts` explicitly defines:
   ```typescript
   server: {
     port: 3000
   }
   ```
3. **Application Location & Script:** `explorer/package.json` defines `"dev": "vite"`. Root `package.json` delegates via `"explorer": "node scripts/run-explorer.cjs"`, which spawns `npm run dev` in directory `explorer/`.
4. **Canonical Execution Directory:** Running `npm run dev` directly within `c:\Users\User\Downloads\dependency-analyzer\explorer` starts the Vite dev server with middleware plugin `analyzeProjectsPlugin()` providing endpoints for `/projects/*` and serving static files from `explorer/public`.

---

## 4. Server Startup, Readiness, and Lifecycle Evidence

### Startup Execution
- **Command:** `npm run dev`
- **Working Directory:** `c:\Users\User\Downloads\dependency-analyzer\explorer`
- **Process ID (PID):** `13784`
- **Port:** `3000` (verified bound to `::1:3000` via `Get-NetTCPConnection`)
- **Startup Output:**
  ```text
  > salesforce-architecture-explorer@1.0.0 dev
  > vite

    VITE v5.4.21  ready in 2170 ms

    ➜  Local:   http://localhost:3000/
    ➜  Network: use --host to expose
  ```

### Readiness Verification
- **Readiness URL:** `http://localhost:3000/?project=default`
- **HTTP Response:** `200 OK` (Content length 588 bytes, verified Vite HTML index page served with React injection scripts).
- **Readiness Log:** `audit-evidence/baseline-8427f8f7b51703ba0b5975a5239a918c3f207b12/server-readiness-91046a9.log`

### Server Shutdown
- Upon completion of the benchmark run, server task PID `13784` was cleanly terminated.
- `Get-NetTCPConnection -LocalPort 3000` confirmed port 3000 was completely released.

---

## 5. Exact Formal Baseline Command, Timestamps, and Outcome

### Execution Details
- **Command:** `node scripts/run-formal-performance-baseline.cjs all`
- **Working Directory:** `C:\Users\User\Downloads\dependency-analyzer`
- **Start Timestamp:** `2026-10-14T16:33:01.2064457+05:30`
- **End Timestamp:** `2026-10-14T16:44:15.8609158+05:30` (Duration: 11 minutes 14 seconds)
- **Exit Code:** `1`
- **Raw Log Paths:**
  - `audit-evidence/baseline-8427f8f7b51703ba0b5975a5239a918c3f207b12/formal-browser-baseline-91046a9.stdout.log`
  - `audit-evidence/baseline-8427f8f7b51703ba0b5975a5239a918c3f207b12/formal-browser-baseline-91046a9.stderr.log`
  - `audit-evidence/baseline-8427f8f7b51703ba0b5975a5239a918c3f207b12/formal-browser-baseline-91046a9.timing.log`

---

## 6. Dataset Metrics and Measurements Reported

### 6.1 Dataset 1: `Default (Small)`
- **Nodes / Edges:** 4 source nodes / 3 source edges (1 LWC)
- **Initial Load Latency:** 1,717 ms
- **Initial Visible Elements:** 4 visible nodes / 3 visible edges
- **Transitions Executed:** 4 transitions $\times$ (1 warmup + 5 measured runs) = 24 cycles
- **Layout Latency Summary:**
  - `Hierarchical -> Hybrid`: min=3ms, max=5ms, median=**4ms**, mean=3.8ms, range=2ms
  - `Hybrid -> Orbit`: min=1ms, max=2ms, median=**1ms**, mean=1.2ms, range=1ms
  - `Orbit -> Constellation`: min=1ms, max=2ms, median=**2ms**, mean=1.6ms, range=1ms
  - `Constellation -> Hierarchical`: min=2ms, max=3ms, median=**2ms**, mean=2.4ms, range=1ms

### 6.2 Dataset 2: `Cloud Spend Tracker (Medium)`
- **Nodes / Edges:** 240 source nodes / 1024 source edges (26 LWCs)
- **Initial Load Latency:** 14,253 ms
- **Initial Visible Elements:** 240 visible nodes / 1024 visible edges
- **Transitions Executed:** 4 transitions $\times$ (1 warmup + 5 measured runs) = 24 cycles
- **Layout Latency Summary:**
  - `Hierarchical -> Hybrid`: min=1,893ms, max=3,832ms, median=**3,421ms**, mean=2,968.8ms, range=1,939ms
  - `Hybrid -> Orbit`: min=384ms, max=676ms, median=**424ms**, mean=474.4ms, range=292ms
  - `Orbit -> Constellation`: min=334ms, max=393ms, median=**357ms**, mean=361.8ms, range=59ms
  - `Constellation -> Hierarchical`: min=1,705ms, max=3,160ms, median=**3,125ms**, mean=2,852.2ms, range=1,455ms

### 6.3 Dataset 3: `PBIM (Large)`
- **Nodes / Edges:** 528 nodes / 2063 edges (30 LWCs)
- **Outcome:** **TIMEOUT**
- **Failure Mode:** `page.waitForSelector('[data-testid="architecture-mode-toggle"]')` timed out after 180,000 ms.
- **Correlated Completion Events:** 0 (initial page mount never completed).

---

## 7. Raw Evidence Inventory

All raw logs and structured manifests are preserved without overwriting prior baseline artifacts:

| File Path | Description |
| :--- | :--- |
| `audit-evidence/.../manifest.json` | Original prior baseline manifest (preserved intact) |
| `audit-evidence/.../chromium-install.stdout.log` | Chromium installation stdout |
| `audit-evidence/.../chromium-install.stderr.log` | Chromium installation stderr & timestamps |
| `audit-evidence/.../formal-browser-baseline-manifest.json` | First follow-up attempt manifest |
| `audit-evidence/.../server-startup-91046a9.stdout.log` | Vite dev server startup stdout |
| `audit-evidence/.../server-startup-91046a9.stderr.log` | Vite dev server process metadata & PID |
| `audit-evidence/.../server-readiness-91046a9.log` | HTTP readiness test log (HTTP 200) |
| `audit-evidence/.../formal-browser-baseline-91046a9.stdout.log` | Full stdout from live formal benchmark run |
| `audit-evidence/.../formal-browser-baseline-91046a9.stderr.log` | Stderr containing exact TimeoutError stack trace |
| `audit-evidence/.../formal-browser-baseline-91046a9.timing.log` | Exact start, end, and exit code records |
| `audit-evidence/.../formal-browser-baseline-91046a9-manifest.json` | Final structured execution manifest |

---

## 8. What This Run Proves and Does Not Prove

### What Is Proven
1. **End-to-End Browser Automation Pipeline:** Headless Chromium, Playwright event dispatching, and Vite dev server integration function reliably in this environment.
2. **Small and Medium Dataset Performance:** `default` (4 nodes) and `cloud-spend-tracker` (240 nodes) execute stably and repeatedly across 48 automated mode transitions with tight latency bounds (Hybrid steady-state median 3,421 ms; Orbit median 424 ms; Constellation median 357 ms; Hierarchical median 3,125 ms).
3. **Clean Teardown:** The server process was cleanly stopped without leaving orphan node processes or lingering port 3000 listeners.

### What Is NOT Proven
1. **PBIM Large-Graph Browser Performance:** PBIM initial render fails to settle within 180 seconds under headless Chromium, leaving large-graph browser baseline unverified.
2. **B9 Synthetic Scaling (>2,000 Nodes):** The current benchmark runner does not exercise graphs above 2,000 nodes and cannot close B9.
3. **Issue G4 Verification Closure:** Because the formal benchmark suite exited with code 1 and did not complete PBIM, G4 cannot be closed.

---

## 9. Status Recommendation & Next Smallest Action

### G4 Status Recommendation
Maintain **`FIXED, VERIFICATION INCOMPLETE`**.
- Do not mark G4 `FIXED AND VERIFIED` until PBIM initial page load timeout is investigated and the full 3-dataset benchmark exits with code 0.

### Next Smallest Action
Diagnose why PBIM initial page load exceeds 180 seconds in Vite dev mode:
1. Inspect PBIM JSON payload loading in `explorer/src/components/GraphView.tsx` or `WorkspaceShell.tsx`.
2. Determine if PBIM initial graph layout blocks the React main thread during initial DAG computation or if an unhandled promise rejection prevents `[data-testid="architecture-mode-toggle"]` from mounting.
