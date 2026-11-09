# Final Migration Verification Framework & Acceptance Criteria

This document defines the formal verification strategy, acceptance criteria, test harness mappings, and exit criteria required for workstream signoff and final production migration certification.

---

## 1. Acceptance Criteria by Workstream (Verified Baseline)

### Workstream 1: Application Shell and Navigation
- [x] `daAppShell` successfully loads, validates, and stores the canonical graph payload via `daGraphPayloadLoader`.
- [x] `daSidebar` provides responsive navigation between all 11 registered view modes (`graph`, `matrix`, `findings`, `dashboard`, `history`, `diagnostics`, `hotspots`, `radar`, `treemap`, `subway`, `dna`).
- [x] Invariant `SELECTION ≠ NAVIGATION` is strictly preserved: Selecting a node, finding, or cell updates detail panels and emits `nodeselect`, but never mutates `activeViewMode`.
- [x] View switching preserves active project context, active analysis run, and current filter presets without unexpected component re-mounts.
- [x] Error boundaries catch unhandled child errors, log diagnostic info, and display user-friendly fallback screens.
- [x] Responsive design functions seamlessly across desktop (1920x1080), laptop (1440x900), and tablet/compact viewports (1024x768).

### Workstream 2: Graph Engine and Cytoscape
- [x] `daGraphViewer` mounts Cytoscape.js cleanly inside an LWC container without violating Lightning Web Security (LWS).
- [x] Deterministic layout execution: Layout algorithms in `daLayoutEngine` (Hierarchical, Orbit, Constellation, Sankey) produce identical, finite coordinates for benchmark fixtures (`pbim`, `cst`, `bqc`).
- [x] Single Cytoscape Canvas Invariant: Rapid project switching cleanly destroys prior instances and initializes a single active canvas without leaking WebGL contexts or event listeners.
- [x] Chunk reassembly safely handles UTF-16 surrogate pairs, enforces contiguous chunk sequencing, and enforces the 10 MB total payload cap.
- [x] Node and edge selection dispatches standardized `nodeselect` CustomEvent with `{ bubbles: true, composed: true, cancelable: false }`.

### Workstream 3: Core Analytical Views
- [x] `daFindingsView` correctly displays rule violations with Blocker, Critical, Major, and Minor severity classification.
- [x] `daDiagnosticsView` displays architectural health indicators, cyclic SCC counts, and rule breakdowns with zero division-by-zero errors on empty datasets.
- [x] `daHotspotsView` correctly ranks components using the composite hotspot formula and enables clicking a hotspot to emit `nodeselect`.
- [x] `daMatrixView` accurately calculates directional cell counts between layers and preserves unclassified edges.
- [x] `daPresetManager` successfully persists and retrieves user-defined filter presets scoped strictly to the active project.

### Workstream 4: Advanced Visualization Views
- [x] `daArchitectureDnaBarcode` renders dense SVG barcode strips accurately reflecting component layers and types.
- [x] `daSubwayView` routes dependency lines and station nodes using SVG paths, with functional hover tooltips and selection events.
- [x] `daTreemapView` executes squarified treemap layout algorithms, accurately sizing bounding boxes by LOC/complexity.
- [x] `daRadarView` renders 9D architectural radar chart adhering strictly to CONTRACT-03.
- [x] Pure SVG / standard DOM rendering: Zero unsafe external visualization dependencies (such as unapproved D3 scripts or unsafe eval).

### Workstream 5: Portfolio and Project Workflows
- [x] `daProjectSelector` lists available projects using Apex `DAGraphController.getProjects()` with `WITH USER_MODE`.
- [x] Two-step project resolution: Validates 15/18-character Salesforce ID first, falling back to unique `Project_Key__c` query only if ID query returns zero rows.
- [x] `daAnalysisHistory` displays past runs ordered deterministically by `Run_Timestamp__c DESC, Id DESC`.
- [x] User preferences (`DA_User_Preference__c`) persist active view mode, filter JSON, and layout configurations per-user and per-project.
- [x] `daProjectDashboard` renders summary tiles, KPIs, and run history summaries.
- [x] Cascading deletion and cleanup constraints: No orphaned chunks when an analysis run or project is deleted.

### Workstream 6: Investigation and Collaboration
- [x] `daInvestigationDrawer` displays selected node attributes, metrics, fan-in/fan-out lists, and incident edges.
- [x] `daAnnotationPanel` enables creating, viewing, and resolving annotations on specific nodes or findings with Apex CRUD backing.
- [x] Refactoring simulation engine calculates delta metrics: `cyclicSccCountDelta = newCyclicSccCount - baseCyclicSccCount` and sever count accurately.
- [x] Refactoring handoff export generates clean Markdown and JSON summaries of proposed architectural refactoring actions.

---

## 2. Test Harness Mappings

| Acceptance Area | Offline Test Runner | Apex Test Class |
| :--- | :--- | :--- |
| **Ingestion & Capping** | `tests/run-poc-tests.cjs` (Categories 1–5) | `DAGraphSecurityTest.cls`, `DAGraphControllerTest.cls` |
| **Platform Security & FLS** | `tests/run-p0-verification-tests.cjs` | `DASchemaAndSecurityTest.cls` |
| **Layout & Cytoscape Lifecycle** | `tests/run-poc-tests.cjs` (Categories 6–7), `run-w5-1-tests.cjs` | N/A (Client-side LWC) |
| **Shell & Central Integration** | `tests/run-coordinator-integration-suite.cjs`, `run-wave4-integration-suite.cjs` | N/A (Client-side LWC) |
| **Sidebar & Header** | `tests/run-p1-sidebar-tests.cjs`, `run-p1-header-tests.cjs` | N/A (Client-side LWC) |
| **Analytical Views** | `run-lane-e-matrix-tests.cjs`, `run-lane-f-findings-tests.cjs`, `run-w6-4-tests.cjs`, `run-w7-1-tests.cjs` | N/A (Client-side LWC) |
| **Advanced Visualizations** | `run-w6-1-tests.cjs`, `run-w6-2-tests.cjs`, `run-w6-3-tests.cjs`, `run-w7-2-tests.cjs` | N/A (Client-side LWC) |
| **Portfolio & History** | `run-analysis-history-tests.cjs`, `run-ws5-tests.cjs` | `DAAnalysisHistoryControllerTest.cls` |
| **Presets & Preferences** | `run-lane-c-preset-manager-tests.cjs` | `DAUserPreferenceControllerTest.cls` |
| **Investigation & Refactoring**| `run-w8-1-tests.cjs`, `run-workstream-c-tests.cjs` | `DAAnnotationControllerTest.cls` |

---

## 3. Production Release & Exit Criteria

Before final production signoff and deployment:
1. **100% Test Pass Rate**: All 24 offline test runners in `scratch/salesforce-poc/tests/` pass with 0 failures and 0 skipped assertions.
2. **Governor Limit Audit**:
   - Apex SOQL queries per transaction <= 100 (target: <= 5).
   - Apex heap size <= 6 MB sync / 12 MB async.
   - Apex CPU time <= 10,000 ms (target: <= 500 ms).
3. **Lightning Web Security & CSP Compliance**:
   - Zero `eval()`, zero `innerHTML` injection of un-sanitized user strings.
   - All third-party libraries bundled as managed Static Resources.
4. **Dual Signoff Certification**: Formal signoff executed by both the Lead Architect and Central Integration Coordinator.
