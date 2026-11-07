# Phase A5: Canonical Task Eligibility and Blocker Assessment

**Document Identifier**: `PHASE_A5_TASK_ELIGIBILITY_AND_BLOCKER_ASSESSMENT.md`
**Governance Scope**: Evidence-Based Readiness and Blocker Assessment of All 21 Canonical Tasks Across Waves 5–9 and Integration
**Implementation Dispatch Status**: **STRICTLY NOT AUTHORIZED (0 of 21 Tasks Authorized)**
**Repository State**: Git Commit `247c578d6cb81c8d203202eea2e71b5e093333e7` on branch `jules-13793377750730077456-5437bebd`
**Baseline Preservation**: Preserves all 21 canonical tasks in `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv` and all 175 ownership manifest paths in `WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv` unmodified.

---

## 1. Executive Summary & Assessment Framework

This document provides a comprehensive, evidence-grounded assessment of all 21 canonical migration tasks declared in `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv`.

### 1.1 Core Assessment Rules
1. **Critical Predecessor Rule**: A predecessor dependency is satisfied **only** when the repository contains sufficient completion, verification, and formal acceptance evidence in accordance with project rules:
   - A completion report alone is **insufficient**.
   - Missing, failed, skipped, or unverified tests prevent predecessor satisfaction fail-closed.
   - Dual signoff (Workstream Lead AND Integration Coordinator) is required for predecessor acceptance.
2. **Strict Wave 5 Serialization Rule**: Wave 5 tasks (`W5-1` through `W5-6`) modify shared LWC components (`daGraphViewer` and `daLayoutEngine`). They are bound to a strict, non-parallel serial sequence:
   $$\text{W5-1} \longrightarrow \text{W5-2} \longrightarrow \text{W5-3} \longrightarrow \text{W5-4} \longrightarrow \text{W5-5} \longrightarrow \text{W5-6}$$
   Parallel dispatch of any Wave 5 tasks is strictly prohibited.
3. **Classification Standards**:
   - `READY_FOR_IMPLEMENTATION_REVIEW`: Task has no unsatisfied predecessors and its technical contracts are completely frozen/ratified. Ready for human review under DEC-04 Gate 1A/Gate 1B.
   - `BLOCKED_ON_PREDECESSORS`: Task has one or more upstream predecessor tasks that have not achieved formal acceptance with empirical verification evidence.
   - `BLOCKED_ON_CONTRACT_APPROVAL`: Task relies on a contract currently awaiting human ratification (DEC-02 for W8-2, DEC-03 for W9-1).
   - `BLOCKED_ON_UNRESOLVED_SPECIFICATION`: Task relies on unresolved product/technical specifications (DEC-01 for W7-P1).
   - `COORDINATOR_EXCLUSIVE`: Task is reserved exclusively for the Integration Coordinator (`INT-1`).
4. **Current Implementation Authorization Status**: Exactly **0 of 21 tasks** are authorized for implementation. Classification as `READY_FOR_IMPLEMENTATION_REVIEW` signifies technical prerequisite readiness only; implementation dispatch requires formal execution of the 16-point Implementation Authorization Order post Gate 1B executive ratification.

---

## 2. 21-Task Authoritative Status & Readiness Matrix

| Task ID | Wave | Task Description | Owning Workstream | Accountable Owner | Existing Classification | Proposed Classification (Current State) | Conditional Status (If DEC-01..03 Ratified) | Predecessor Tasks | Predecessor Status | Contract Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **W5-1** | Wave 5 | Shell Layout Switcher | Workstream A | Workstream A Lead | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | None | N/A (Root task) | CONTRACT-01, CONTRACT-02 |
| **W5-2** | Wave 5 | Orbit Layout Activation | Workstream A | Workstream A Lead | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | W5-1 | Blocked (W5-1 not implemented) | CONTRACT-01, CONTRACT-02 |
| **W5-3** | Wave 5 | Constellation & Sankey | Workstream A | Workstream A Lead | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | W5-1, W5-2 | Blocked (W5-1, W5-2 not implemented) | CONTRACT-01, CONTRACT-02 |
| **W5-4** | Wave 5 | Directional Traversal Focus | Workstream A | Workstream A Lead | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | W5-3 | Blocked (W5-3 not implemented) | CONTRACT-01, CONTRACT-06 |
| **W5-5** | Wave 5 | Blast Radius & Impact Highlight| Workstream A | Workstream A Lead | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | W5-4 | Blocked (W5-4 not implemented) | CONTRACT-01, CONTRACT-06 |
| **W5-6** | Wave 5 | Hover Cards & Node Previews | Workstream A | Workstream A Lead | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | W5-5 | Blocked (W5-5 not implemented) | CONTRACT-01, CONTRACT-06 |
| **W6-1** | Wave 6 | Radar View Component | Workstream B | Workstream B Lead | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | None | N/A (Independent view) | CONTRACT-01, CONTRACT-03 |
| **W6-2** | Wave 6 | Treemap View Component | Workstream B | Workstream B Lead | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | None | N/A (Independent view) | CONTRACT-01, CONTRACT-09 |
| **W6-3** | Wave 6 | Subway View Component | Workstream B | Workstream B Lead | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | None | N/A (Independent view) | CONTRACT-01, CONTRACT-09 |
| **W6-4** | Wave 6 | Hotspots View Component | Workstream B | Workstream B Lead | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | None | N/A (Independent view) | CONTRACT-01, CONTRACT-09 |
| **W7-P1**| Wave 7 | Minimal History API (Apex/DTO)| Workstream C | Workstream C Lead | `BLOCKED_ON_UNRESOLVED_SPECIFICATION` | `BLOCKED_ON_UNRESOLVED_SPECIFICATION` | `READY_FOR_IMPLEMENTATION_REVIEW` | None | N/A (Root backend task) | CONTRACT-04 (DEC-01) |
| **W7-1** | Wave 7 | Diagnostics Scorecard | Workstream C | Workstream C Lead | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | None | N/A (Independent view) | CONTRACT-01, CONTRACT-09 |
| **W7-2** | Wave 7 | Architecture DNA Barcode | Workstream C | Workstream C Lead | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | None | N/A (Independent view) | CONTRACT-01, CONTRACT-09 |
| **W7-3** | Wave 7 | Analysis History View | Workstream C | Workstream C Lead | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | W7-P1 | Blocked (W7-P1 not implemented) | CONTRACT-01, CONTRACT-04 |
| **W8-1** | Wave 8 | Investigation Drawer | Workstream D | Workstream D Lead | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | `READY_FOR_IMPLEMENTATION_REVIEW` | None | N/A (Independent component) | CONTRACT-01, CONTRACT-06 |
| **W8-2** | Wave 8 | Diff Engine Utility Module | Workstream D | Workstream D Lead | `BLOCKED_ON_CONTRACT_APPROVAL` | `BLOCKED_ON_CONTRACT_APPROVAL` | `READY_FOR_IMPLEMENTATION_REVIEW` | None | N/A (Pure JS module) | CONTRACT-05 (DEC-02) |
| **W8-3** | Wave 8 | Compare View Component | Workstream D | Workstream D Lead | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | W8-2, W7-P1 | Blocked (W8-2, W7-P1 not implemented) | CONTRACT-01, CONTRACT-05 |
| **W9-1** | Wave 9 | Refactoring Engine (Pure Math)| Workstream E | Workstream E Lead | `BLOCKED_ON_CONTRACT_APPROVAL` | `BLOCKED_ON_CONTRACT_APPROVAL` | `READY_FOR_IMPLEMENTATION_REVIEW` | None | N/A (Pure JS module) | CONTRACT-07 (DEC-03) |
| **W9-2** | Wave 9 | Simulation View Component | Workstream E | Workstream E Lead | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | W9-1 | Blocked (W9-1 not implemented) | CONTRACT-01, CONTRACT-07 |
| **W9-3** | Wave 9 | Handoff Export Modal | Workstream E | Workstream E Lead | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | `BLOCKED_ON_PREDECESSORS` | W9-1 | Blocked (W9-1 not implemented) | CONTRACT-01, CONTRACT-07 |
| **INT-1** | Integration| Shell Integration & Mount | Coordinator | Integration Coordinator | `COORDINATOR_EXCLUSIVE` | `COORDINATOR_EXCLUSIVE` | `COORDINATOR_EXCLUSIVE` | Waves 5, 6, 7, 8, 9 | Blocked (All waves must complete) | CONTRACT-08, CONTRACT-09 |

---

## 3. Summary Breakdown of Task Readiness

### 3.1 Current Status Breakdown (DEC-01 through DEC-04 Pending Ratification)
- **Ready for Implementation Review**: **8 tasks** (`W5-1`, `W6-1`, `W6-2`, `W6-3`, `W6-4`, `W7-1`, `W7-2`, `W8-1`).
- **Blocked on Predecessors**: **9 tasks** (`W5-2`, `W5-3`, `W5-4`, `W5-5`, `W5-6`, `W7-3`, `W8-3`, `W9-2`, `W9-3`).
- **Blocked on Contract Approval**: **2 tasks** (`W8-2` blocked on DEC-02, `W9-1` blocked on DEC-03).
- **Blocked on Unresolved Specification**: **1 task** (`W7-P1` blocked on DEC-01).
- **Coordinator Exclusive**: **1 task** (`INT-1`).
- **Authorized for Implementation Dispatch**: **0 tasks**.

### 3.2 Conditional Status Breakdown (Upon Formal Ratification of DEC-01, DEC-02, DEC-03)
- **Ready for Implementation Review**: **11 tasks** (`W5-1`, `W6-1`, `W6-2`, `W6-3`, `W6-4`, `W7-P1`, `W7-1`, `W7-2`, `W8-1`, `W8-2`, `W9-1`).
- **Blocked on Predecessors**: **9 tasks** (`W5-2`, `W5-3`, `W5-4`, `W5-5`, `W5-6`, `W7-3`, `W8-3`, `W9-2`, `W9-3`).
- **Blocked on Contract Approval / Specification**: **0 tasks**.
- **Coordinator Exclusive**: **1 task** (`INT-1`).
- **Authorized for Implementation Dispatch**: **0 tasks** (Awaits Gate 1B executive order execution).

---

## 4. Comprehensive Task-by-Task Dossiers

### Task W5-1: Shell Layout Switcher (Grid / Circle / Breadthfirst)
- **Wave / Workstream**: Wave 5 / Workstream A.
- **Accountable Owner**: Workstream A Lead.
- **Permitted Files**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (Existing)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html` (Existing)
  - `scratch/salesforce-poc/tests/run-w5-1-tests.cjs` (New)
- **Protected Files**: `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.css`, `daLayoutEngine/*`, `daAppShell/*`.
- **Predecessor Tasks**: None (Root layout foundation task).
- **Predecessor Acceptance Evidence**: N/A.
- **Contract Dependencies**: CONTRACT-01 (Canonical Graph Payload), CONTRACT-02 (Layout Identifiers).
- **Outstanding Technical Blockers**: None. CONTRACT-01 and CONTRACT-02 are frozen.
- **Required Verification**:
  1. `node scratch/salesforce-poc/tests/run-w5-1-tests.cjs` (Must pass all scenarios).
  2. All 9 immutable baseline test runners (187 test units) must pass with 0 failures.
  3. Cytoscape canvas initialization and layout switching verification.
  4. Invariant verification: `SELECTION != NAVIGATION` strictly maintained.
- **Recommended Next Action**: Primary candidate for first implementation dispatch review once DEC-04 Gate 1A/Gate 1B approval is granted.
- **Evidence References**: `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv` row 2; `run-poc-tests.cjs` Category 6 & 7.

---

### Task W5-2: Orbit Layout Activation & Concentric Engine
- **Wave / Workstream**: Wave 5 / Workstream A.
- **Accountable Owner**: Workstream A Lead.
- **Permitted Files**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js` (Existing)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js` (Existing)
  - `scratch/salesforce-poc/tests/run-w5-2-tests.cjs` (New)
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: `W5-1`.
- **Predecessor Acceptance Evidence**: Currently unsatisfied. Task `W5-1` has not been implemented or accepted.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-02.
- **Outstanding Technical Blockers**: Strictly blocked on serialized completion and acceptance of `W5-1`.
- **Required Verification**: `run-w5-2-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Maintain classification as `BLOCKED_ON_PREDECESSORS`. Do not dispatch until `W5-1` is accepted.

---

### Task W5-3: Constellation & Sankey Layout Extensions
- **Wave / Workstream**: Wave 5 / Workstream A.
- **Accountable Owner**: Workstream A Lead.
- **Permitted Files**: `daLayoutEngine.js`, `daGraphViewer.js`, `run-w5-3-tests.cjs`.
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: `W5-1`, `W5-2`.
- **Predecessor Acceptance Evidence**: Unsatisfied.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-02.
- **Outstanding Technical Blockers**: Blocked on `W5-1` and `W5-2` serial acceptance.
- **Required Verification**: `run-w5-3-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Maintain classification as `BLOCKED_ON_PREDECESSORS`.

---

### Task W5-4: Directional Traversal Focus (Upstream / Downstream / Both)
- **Wave / Workstream**: Wave 5 / Workstream A.
- **Accountable Owner**: Workstream A Lead.
- **Permitted Files**: `daGraphViewer.js`, `daGraphViewer.html`, `run-w5-4-tests.cjs`.
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: `W5-3`.
- **Predecessor Acceptance Evidence**: Unsatisfied.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-06.
- **Outstanding Technical Blockers**: Blocked on `W5-3` serial acceptance.
- **Required Verification**: `run-w5-4-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Maintain classification as `BLOCKED_ON_PREDECESSORS`.

---

### Task W5-5: Blast Radius & Impact Analysis Highlight
- **Wave / Workstream**: Wave 5 / Workstream A.
- **Accountable Owner**: Workstream A Lead.
- **Permitted Files**: `daGraphViewer.js`, `daGraphViewer.html`, `run-w5-5-tests.cjs`.
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: `W5-4`.
- **Predecessor Acceptance Evidence**: Unsatisfied.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-06.
- **Outstanding Technical Blockers**: Blocked on `W5-4` serial acceptance.
- **Required Verification**: `run-w5-5-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Maintain classification as `BLOCKED_ON_PREDECESSORS`.

---

### Task W5-6: Hover Cards & Node Previews
- **Wave / Workstream**: Wave 5 / Workstream A.
- **Accountable Owner**: Workstream A Lead.
- **Permitted Files**: `daGraphViewer.js`, `daGraphViewer.html`, `daGraphViewer.css`, `run-w5-6-tests.cjs`.
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: `W5-5`.
- **Predecessor Acceptance Evidence**: Unsatisfied.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-06.
- **Outstanding Technical Blockers**: Blocked on `W5-5` serial acceptance.
- **Required Verification**: `run-w5-6-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Maintain classification as `BLOCKED_ON_PREDECESSORS`.

---

### Task W6-1: Radar View Component
- **Wave / Workstream**: Wave 6 / Workstream B.
- **Accountable Owner**: Workstream B Lead.
- **Permitted Files**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js` (New)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.html` (New)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.css` (New)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js-meta.xml` (New)
  - `scratch/salesforce-poc/tests/run-w6-1-tests.cjs` (New)
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: None (Completely independent new component bundle).
- **Predecessor Acceptance Evidence**: N/A.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-03 (Radar 9-Dimension Adapter).
- **Outstanding Technical Blockers**: None. CONTRACT-01 is frozen; CONTRACT-03 is source-confirmed.
- **Required Verification**: `run-w6-1-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Eligible for implementation review under DEC-04 Gate 1A/Gate 1B.

---

### Task W6-2: Treemap View Component
- **Wave / Workstream**: Wave 6 / Workstream B.
- **Accountable Owner**: Workstream B Lead.
- **Permitted Files**: All `daTreemapView/*` files (New), `run-w6-2-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: None (Independent new component bundle).
- **Predecessor Acceptance Evidence**: N/A.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-09.
- **Outstanding Technical Blockers**: None.
- **Required Verification**: `run-w6-2-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Eligible for implementation review under DEC-04 Gate 1A/Gate 1B.

---

### Task W6-3: Subway View Component
- **Wave / Workstream**: Wave 6 / Workstream B.
- **Accountable Owner**: Workstream B Lead.
- **Permitted Files**: All `daSubwayView/*` files (New), `run-w6-3-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: None (Independent new component bundle).
- **Predecessor Acceptance Evidence**: N/A.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-09.
- **Outstanding Technical Blockers**: None.
- **Required Verification**: `run-w6-3-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Eligible for implementation review under DEC-04 Gate 1A/Gate 1B.

---

### Task W6-4: Hotspots View Component
- **Wave / Workstream**: Wave 6 / Workstream B.
- **Accountable Owner**: Workstream B Lead.
- **Permitted Files**: All `daHotspotsView/*` files (New), `run-w6-4-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: None (Independent new component bundle).
- **Predecessor Acceptance Evidence**: N/A.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-09.
- **Outstanding Technical Blockers**: None.
- **Required Verification**: `run-w6-4-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Eligible for implementation review under DEC-04 Gate 1A/Gate 1B.

---

### Task W7-P1: Minimal History API (Contract A Apex & DTO)
- **Wave / Workstream**: Wave 7 / Workstream C.
- **Accountable Owner**: Workstream C Lead.
- **Permitted Files**:
  - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls` (Existing)
  - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls-meta.xml` (Existing)
  - `scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunSummaryDTO.cls` (New)
  - `scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunSummaryDTO.cls-meta.xml` (New)
  - `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls` (Existing)
  - `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls-meta.xml` (Existing)
  - `scratch/salesforce-poc/tests/run-w7-p1-tests.cjs` (New)
- **Protected Files**: All other Apex controllers, DTOs, schemas, and metadata.
- **Predecessor Tasks**: None (Sole backend Apex modifier in migration).
- **Predecessor Acceptance Evidence**: N/A.
- **Contract Dependencies**: CONTRACT-04 (Analysis Run History API).
- **Outstanding Technical Blockers**: Blocked on formal human ratification of `DEC-01` (Option A).
- **Required Verification**: `run-w7-p1-tests.cjs` (syntactic/contract parsing) + 9 baseline runners (187 tests).
- **Recommended Next Action**: Ratify DEC-01 (Option A) to transition task to `READY_FOR_IMPLEMENTATION_REVIEW`.

---

### Task W7-1: Diagnostics Scorecard Component
- **Wave / Workstream**: Wave 7 / Workstream C.
- **Accountable Owner**: Workstream C Lead.
- **Permitted Files**: All `daDiagnosticsView/*` files (New), `run-w7-1-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: None (Independent new component bundle).
- **Predecessor Acceptance Evidence**: N/A.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-09.
- **Outstanding Technical Blockers**: None.
- **Required Verification**: `run-w7-1-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Eligible for implementation review under DEC-04 Gate 1A/Gate 1B.

---

### Task W7-2: Architecture DNA Barcode Component
- **Wave / Workstream**: Wave 7 / Workstream C.
- **Accountable Owner**: Workstream C Lead.
- **Permitted Files**: All `daArchitectureDnaBarcode/*` files (New), `run-w7-2-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: None (Independent new component bundle).
- **Predecessor Acceptance Evidence**: N/A.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-09.
- **Outstanding Technical Blockers**: None.
- **Required Verification**: `run-w7-2-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Eligible for implementation review under DEC-04 Gate 1A/Gate 1B.

---

### Task W7-3: Analysis History View Component
- **Wave / Workstream**: Wave 7 / Workstream C.
- **Accountable Owner**: Workstream C Lead.
- **Permitted Files**: All `daAnalysisHistoryView/*` files (New), `run-w7-3-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: `W7-P1`.
- **Predecessor Acceptance Evidence**: Unsatisfied. Task `W7-P1` has not been implemented or accepted.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-04.
- **Outstanding Technical Blockers**: Blocked on `W7-P1` implementation and acceptance.
- **Required Verification**: `run-w7-3-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Maintain classification as `BLOCKED_ON_PREDECESSORS`.

---

### Task W8-1: Investigation Drawer Component
- **Wave / Workstream**: Wave 8 / Workstream D.
- **Accountable Owner**: Workstream D Lead.
- **Permitted Files**: All `daInvestigationDrawer/*` files (New), `run-w8-1-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: None (Independent new component bundle).
- **Predecessor Acceptance Evidence**: N/A.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-06 (Node Selection Event DTO).
- **Outstanding Technical Blockers**: None. CONTRACT-01 and CONTRACT-06 are frozen.
- **Required Verification**: `run-w8-1-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Eligible for implementation review under DEC-04 Gate 1A/Gate 1B.

---

### Task W8-2: Diff Engine Utility Module
- **Wave / Workstream**: Wave 8 / Workstream D.
- **Accountable Owner**: Workstream D Lead.
- **Permitted Files**: All `daDiffEngine/*` files (New), `run-w8-2-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: None (Pure client-side JavaScript utility).
- **Predecessor Acceptance Evidence**: N/A.
- **Contract Dependencies**: CONTRACT-05 (Dual Snapshot & Diff Engine).
- **Outstanding Technical Blockers**: Blocked on formal human ratification of `DEC-02` (Option A).
- **Required Verification**: `run-w8-2-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Ratify DEC-02 (Option A) to transition task to `READY_FOR_IMPLEMENTATION_REVIEW`.

---

### Task W8-3: Compare View Component (Dual-Snapshot Visualizer)
- **Wave / Workstream**: Wave 8 / Workstream D.
- **Accountable Owner**: Workstream D Lead.
- **Permitted Files**: All `daCompareView/*` files (New), `run-w8-3-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: `W8-2`, `W7-P1`.
- **Predecessor Acceptance Evidence**: Unsatisfied. Neither `W8-2` nor `W7-P1` has been implemented or accepted.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-05.
- **Outstanding Technical Blockers**: Blocked on upstream completion and acceptance of `W8-2` and `W7-P1`.
- **Required Verification**: `run-w8-3-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Maintain classification as `BLOCKED_ON_PREDECESSORS`.

---

### Task W9-1: Refactoring Engine (Pure Math / In-Memory Topology)
- **Wave / Workstream**: Wave 9 / Workstream E.
- **Accountable Owner**: Workstream E Lead.
- **Permitted Files**: All `daRefactoringEngine/*` files (New), `run-w9-1-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: None (Pure in-memory math module).
- **Predecessor Acceptance Evidence**: N/A.
- **Contract Dependencies**: CONTRACT-07 (Refactoring Action DTOs).
- **Outstanding Technical Blockers**: Blocked on formal human ratification of `DEC-03` (Option A).
- **Required Verification**: `run-w9-1-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Ratify DEC-03 (Option A) to transition task to `READY_FOR_IMPLEMENTATION_REVIEW`.

---

### Task W9-2: Simulation View Component
- **Wave / Workstream**: Wave 9 / Workstream E.
- **Accountable Owner**: Workstream E Lead.
- **Permitted Files**: All `daRefactoringView/*` files (New), `run-w9-2-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: `W9-1`.
- **Predecessor Acceptance Evidence**: Unsatisfied. Task `W9-1` has not been implemented or accepted.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-07.
- **Outstanding Technical Blockers**: Blocked on `W9-1` implementation and acceptance.
- **Required Verification**: `run-w9-2-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Maintain classification as `BLOCKED_ON_PREDECESSORS`.

---

### Task W9-3: Handoff Export Modal Component
- **Wave / Workstream**: Wave 9 / Workstream E.
- **Accountable Owner**: Workstream E Lead.
- **Permitted Files**: All `daRefactorHandoffModal/*` files (New), `run-w9-3-tests.cjs` (New).
- **Protected Files**: `daAppShell/*`, baseline runners.
- **Predecessor Tasks**: `W9-1`.
- **Predecessor Acceptance Evidence**: Unsatisfied. Task `W9-1` has not been implemented or accepted.
- **Contract Dependencies**: CONTRACT-01, CONTRACT-07.
- **Outstanding Technical Blockers**: Blocked on `W9-1` implementation and acceptance.
- **Required Verification**: `run-w9-3-tests.cjs` + 9 baseline runners (187 tests).
- **Recommended Next Action**: Maintain classification as `BLOCKED_ON_PREDECESSORS`.

---

### Task INT-1: Unified Application Shell Integration & Navigation Mount
- **Wave / Workstream**: Integration / Integration Coordinator.
- **Accountable Owner**: Integration Coordinator.
- **Permitted Files**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` (Existing)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html` (Existing)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.css` (Existing)
  - `scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs` (New)
- **Protected Files**: Feature component directories (`daRadarView`, `daTreemapView`, etc.), immutable baseline runners.
- **Predecessor Tasks**: Waves 5, 6, 7, 8, 9 (All 20 feature tasks).
- **Predecessor Acceptance Evidence**: Unsatisfied. Waves 5 through 9 have not completed.
- **Contract Dependencies**: CONTRACT-08 (Workspace Mount), CONTRACT-09 (Shared State & Invariants).
- **Outstanding Technical Blockers**: Strictly reserved for the Integration Coordinator after all feature waves achieve verified acceptance. Feature workstreams are strictly prohibited from touching `daAppShell.*`.
- **Required Verification**: `run-coordinator-integration-suite.cjs` + all wave test runners + 9 baseline runners (187 tests).
- **Recommended Next Action**: Retain as `COORDINATOR_EXCLUSIVE`. Do not dispatch until all feature tasks are accepted.
