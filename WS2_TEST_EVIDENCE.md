# Workstream 2 (WS-2) Test Evidence Report

## 1. Test Execution Commands & Results

### Primary Test Suites Owned by WS-2

#### Suite 1: `scratch/salesforce-poc/tests/run-poc-tests.cjs`
- **Command:** `node scratch/salesforce-poc/tests/run-poc-tests.cjs`
- **Scenarios:** 47 passed, 0 failed
- **Categories Covered:**
  - Category 1: LWC Module Unit Tests (Chunk reassembly, payload integrity, chunk sequence verification)
  - Category 2: Bounded Pagination & Boundary Inputs (Page size limits, default maxChunks, index safety)
  - Category 3: Benchmark Fixture Paginated Verification (PBIM: 528 nodes / 2063 edges / 43 chunks; BQC: 274 nodes / 603 edges / 14 chunks; CST: 240 nodes / 1024 edges / 19 chunks)
  - Category 4: Advanced Edge Cases, UTF-8 Multibyte, Race Conditions & Lifecycle (Surrogate pair protection, 10 MB payload cap, rapid project switch cancellation, Cytoscape mounting & teardown)
  - Category 5: Adversarial Security, Fault Injection & Ingestion Verification (Oversized chunk rejection, batch limits, idempotency simulation)
  - Category 6: Reusable LWC Layout Engine Parity Tests (P0 Architecture layout, P1 Orbit layout, P1 Constellation layout, P2 Sankey layout, SELECTION != NAVIGATION invariant)
  - Category 7: Production DaGraphViewer LWC Class Direct Unit Tests (TC-01 initial load, TC-02 project switch, TC-03 rapid switch, TC-04 delayed response, TC-05 load failure, TC-06 empty payload, TC-07 selection reset, TC-08 destroy/reinit, TC-09 disconnect during in-flight request, TC-10 rerender without ID change, TC-11 SELECTION != NAVIGATION invariant, TC-12 ViewState load/restore, TC-13 ViewState debounced saving)
  - Category 8: Hardened Cytoscape Lifecycle, LOD, Viewport & Layout Parity (TC-14 viewport controls & zoom in/out/fit/reset, TC-15 extended layout execution for orbit & constellation, TC-16 payload immutability across layout execution, TC-17 edge selection & selection clear event conformance)
- **Exit Code:** 0

#### Suite 2: `scratch/salesforce-poc/tests/run-w5-1-tests.cjs`
- **Command:** `node scratch/salesforce-poc/tests/run-w5-1-tests.cjs`
- **Scenarios:** 18 passed, 0 failed
- **Verifications Covered:**
  1. Supported layout modes (grid, circle, breadthfirst) defined in `CYTOSCAPE_LAYOUT_DEFAULTS`
  2. Exact configuration property values verified per CONTRACT-02 §4.1
  3. Case-insensitivity and whitespace trimming verified (including orbit, constellation)
  4. Dagre maps gracefully to breadthfirst fallback per CONTRACT-02 §6.4
  5. Unsupported, null, undefined, and empty layout values fall back safely
  6. Layout switching via `setLayout()` and `layoutMode` setter operates correctly
  7. `layoutchange` custom event verified with detail, bubbling, and composed flags
  8. No navigation side effects or recordId modification on layout switch
  9. Selected node and project identity preserved across layout switch
  10. Existing filter criteria preserved with zero mutation
  11. Production `scheduleSaveState()` persists canonical payload via real scheduled callback
  12. Production debounce persists only latest layout and suppresses stale/project-changed requests
  13. Apex save rejection handled cleanly by production callback without state corruption
  14. Layout execution failure sets user-visible error state
  15. Architecture layout computes and positions nodes deterministically
  16. Operations safe when Cytoscape instance or DOM container unavailable
  17. Layout cancellation lifecycle verified: `run(L1) -> stop(L1) -> run(L2)` with active instance replacement
  18. Viewport interaction methods (`zoomIn`, `zoomOut`, `fitView`, `resetView`) verified
- **Exit Code:** 0

#### Suite 3: `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`
- **Command:** `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`
- **Scenarios:** 33 passed, 0 failed
- **Verifications Covered:** Application shell initial render, view navigation, project selector, preference loading/restoration, and `SELECTION != NAVIGATION` invariants.
- **Exit Code:** 0

---

## 2. Full Regression Matrix Sweep (All 20 Runners)

| Runner | Focus | Result | Status |
| :--- | :--- | :--- | :--- |
| `run-analysis-history-tests.cjs` | Analysis Run History | ALL 4 SUITES PASSED | PASSED |
| `run-lane-a-schema-tests.cjs` | Schema & DTO Alignment | 9 PASSED, 0 FAILED | PASSED |
| `run-lane-c-preset-manager-tests.cjs` | Preset Manager | 10 PASSED, 0 FAILED | PASSED |
| `run-lane-d-graph-filter-tests.cjs` | Graph Filters & ViewState | 15 PASSED, 0 FAILED | PASSED |
| `run-lane-e-matrix-tests.cjs` | Dependency Matrix | 11 PASSED, 0 FAILED | PASSED |
| `run-lane-f-findings-tests.cjs` | Findings Table | 12 PASSED, 0 FAILED | PASSED |
| `run-lwc-jest-tests.cjs` | LWC Jest Suite | ALL 2 SUITES PASSED | PASSED |
| `run-p0-verification-tests.cjs` | Platform Security & Ingestion | ALL 3 SUITES PASSED | PASSED |
| `run-p1-header-tests.cjs` | Application Header | ALL 4 SUITES PASSED | PASSED |
| `run-p1-sidebar-tests.cjs` | Application Sidebar | ALL 4 SUITES PASSED | PASSED |
| `run-poc-tests.cjs` | Core Graph Engine | 47 PASSED, 0 FAILED | PASSED |
| `run-w5-1-tests.cjs` | Cytoscape Layout Switcher | 18 PASSED, 0 FAILED | PASSED |
| `run-w6-2-tests.cjs` | Treemap View | ALL 7 TESTS PASSED | PASSED |
| `run-w6-3-tests.cjs` | Subway View | ALL 7 TESTS PASSED | PASSED |
| `run-w6-4-tests.cjs` | Hotspots View | ALL 7 TESTS PASSED | PASSED |
| `run-w7-1-tests.cjs` | Diagnostics View | ALL 6 TESTS PASSED | PASSED |
| `run-w7-2-tests.cjs` | Architecture DNA Barcode | ALL 7 TESTS PASSED | PASSED |
| `run-wave4-integration-suite.cjs` | Wave 4 Integration Suite | 32 PASSED, 0 FAILED | PASSED |
| `run-workstream-a-tests.cjs` | Workstream A Aggregate | 33 PASSED, 0 FAILED | PASSED |
| `run-workstream-c-tests.cjs` | Workstream C Aggregate | 22 PASSED, 0 FAILED | PASSED |

**Total Suite Outcome:** 20/20 suites passed, 0 failures across the entire codebase.
