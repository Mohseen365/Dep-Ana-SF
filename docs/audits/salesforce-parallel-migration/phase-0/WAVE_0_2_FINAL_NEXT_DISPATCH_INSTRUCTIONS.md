# Wave 0.2: Authoritative Next Dispatch Instructions

## 1. Absolute Stop Condition & Prerequisite Authorization

**IMPORTANT NOTICE:**
This document provides the authoritative, turn-key dispatch instructions for the Salesforce Parallel Migration.

**DO NOT EXECUTE IMPLEMENTATION DISPATCH UNTIL EXPLICIT HUMAN AUTHORIZATION IS GRANTED.**

Wave 0.2 is strictly a planning, dependency correction, and dispatch gate audit. No feature code, metadata modifications, or feature branches are authorized until the user explicitly responds with authorization to proceed.

---

## 2. Post-Authorization Recommended Dispatch Sequence

Upon receipt of explicit user authorization, the Integration Coordinator will execute the parallel implementation dispatch in three disciplined, phased waves to maximize throughput while preventing merge friction:

### Phase 1: Parallel Foundation Dispatch (14 Concurrent Tasks)
Dispatch 14 independent feature tasks across five isolated Jules workstreams:

- **Workstream A (Visualization & Layout - Wave 5):**
  - Dispatch `W5-1`: Shell Layout Switcher (`scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/`)
  - Dispatch `W5-4`: Directional Traversal Focus
  - Dispatch `W5-5`: Blast Radius & Impact
  - Dispatch `W5-6`: Hover Cards & Inspect Anchors
  - *Contract Boundary:* `W0-C1`, `W0-C2`, `W0-C4`, `W0-C9`.
  - *Assigned Test Runner:* `run-lane-d-graph-filter-tests.cjs` (extend for Wave 5 layout tests).

- **Workstream B (Alternative Analytical Views - Wave 6):**
  - Dispatch `W6-1`: Radar View Component (`daRadarView/`)
  - Dispatch `W6-2`: Treemap View Component (`daTreemapView/`)
  - Dispatch `W6-3`: Subway View Component (`daSubwayView/`)
  - Dispatch `W6-4`: Hotspots View Component (`daHotspotsView/`)
  - *Contract Boundary:* `W0-C1`, `W0-C3`, `W0-C4`, `W0-C9`.
  - *Assigned Test Runner:* `scratch/salesforce-poc/tests/run-wave6-tests.cjs` (new).

- **Workstream C (History & Health - Wave 7):**
  - Dispatch `W7-P1`: Apex `getAnalysisRuns` Minimal Listing (`DAGraphController.cls`, `DAGraphControllerTest.cls`)
  - Dispatch `W7-1`: Diagnostics Scorecard (`daDiagnosticsView/`)
  - Dispatch `W7-2`: Architecture DNA Barcode (`daArchitectureDnaBarcode/`)
  - *Contract Boundary:* `W0-C1`, `W0-C4`, `W0-C5` (Contract A), `W0-C9`.
  - *Assigned Test Runner:* `run-workstream-c-tests.cjs` & `run-wave7-tests.cjs` (new).

- **Workstream D (Investigation & Diff - Wave 8):**
  - Dispatch `W8-1`: Investigation Drawer (`daInvestigationDrawer/`)
  - Dispatch `W8-2`: Diff Engine Module (`daDiffEngine/`)
  - *Contract Boundary:* `W0-C2`, `W0-C4`, `W0-C6`, `W0-C7`, `W0-C9`.
  - *Assigned Test Runner:* `scratch/salesforce-poc/tests/run-wave8-tests.cjs` (new).

- **Workstream E (Refactoring Simulation - Wave 9):**
  - Dispatch `W9-1`: Refactoring Engine Pure Simulation Math (`daRefactoringEngine/`)
  - *Contract Boundary:* `W0-C1`, `W0-C8`, `W0-C9`.
  - *Assigned Test Runner:* `scratch/salesforce-poc/tests/run-wave9-tests.cjs` (new).

---

### Phase 2: Implementation-Dependent Secondary Dispatch (6 Tasks)
As initial tasks complete and pass coordinator integration, dispatch dependent components:
1. **Workstream A:** Dispatch `W5-2` (Orbit) and `W5-3` (Constellation/Sankey) following `W5-1` integration.
2. **Workstream C:** Dispatch `W7-3` (Analysis History View) following `W7-P1` integration.
3. **Workstream D:** Dispatch `W8-3` (Compare View & Dual Snapshot) following `W8-2` and `W7-P1` integration.
4. **Workstream E:** Dispatch `W9-2` (Simulation View) and `W9-3` (Handoff Export Modal) following `W9-1` integration.

---

### Phase 3: Final Coordinator Shell Integration (`INT-1`)
Once all five workstreams have completed and individual regression gates have passed:
1. Integration Coordinator updates `daAppShell.html` to register all new views (`radar`, `treemap`, `subway`, `hotspots`, `diagnostics`, `history`, `compare`, `refactor`).
2. Updates `daAppShell.js` view switching and navigation dispatchers.
3. Wires `c-da-investigation-drawer` into shell global layout.
4. Executes full 9-suite regression harness (187 test cases) plus all new wave test suites.
5. Verifies 100% pass rate and produces Wave 10 release documentation.

---

## 3. Strict Operating Rules for Dispatched Agents

Every agent dispatched to a workstream must adhere to the following non-negotiable rules:
1. **Never touch `daAppShell.*`:** Only the Coordinator may modify the application shell.
2. **Never touch `objects/`:** Custom object and field metadata is frozen.
3. **Work exclusively within assigned files:** Any patch modifying files outside the assigned scope in `WAVE_0_2_EXHAUSTIVE_OWNERSHIP_AND_COLLISION_AUDIT.md` will be rejected immediately.
4. **Deliver via unified patch:** Produce `task-<TASK_ID>.patch` and changed-file manifests conforming to `WAVE_0_2_JULES_AGENT_HANDOFF_AND_INTEGRATION_RUNBOOK.md`.
5. **No destructive git commands:** No force pushes, hard resets, or rebases.
