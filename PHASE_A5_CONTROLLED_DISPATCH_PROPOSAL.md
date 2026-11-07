# Phase A5: Controlled Dispatch Proposal

**Document Identifier**: `PHASE_A5_CONTROLLED_DISPATCH_PROPOSAL.md`
**Governance Scope**: Non-Authorizing Proposal for Phased, Controlled Implementation Dispatch Under DEC-04 Gate 1 Governance
**Implementation Dispatch Status**: **PROPOSAL ONLY — STRICTLY NOT AUTHORIZED (0 Tasks Authorized)**
**Repository State**: Git Commit `247c578d6cb81c8d203202eea2e71b5e093333e7` on branch `jules-13793377750730077456-5437bebd`
**Baseline Preservation**: Preserves all 21 canonical tasks in `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv` and all 175 ownership manifest paths in `WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv` unmodified.

---

## 1. Executive Summary & Non-Authorization Premise

This document defines the proposed, controlled implementation dispatch schedule for the Dependency Analyzer Salesforce migration.

### 1.1 Non-Authorization Declaration
- **This is a proposal only.** No task is authorized by this document.
- Blanket implementation dispatch across waves or workstreams is **strictly prohibited**.
- Implementation dispatch cannot occur until:
  1. The Project Owner formally ratifies DEC-04 (adopting the two-phase sequential dispatch governance model or another alternative).
  2. The Lead Architect and Integration Coordinator jointly sign Gate 1A Technical Certification for the specific candidate tasks.
  3. The Product Owner and Project Owner jointly execute Gate 1B Business & Executive Ratification using the 16-point Implementation Authorization Template (`PHASE_A4_IMPLEMENTATION_AUTHORIZATION_TEMPLATE.md`).
- A task cannot proceed merely because its technical recommendation appears sound. Predecessor verification and dual acceptance rules remain fail-closed.

---

## 2. Dispatch Sequencing Strategy

### 2.1 The Two Phased Entry Options
Depending on whether the Project Owner ratifies Decisions DEC-01 through DEC-03 simultaneously with DEC-04 or defers them, two dispatch sequence options exist:

- **Scenario 1: Baseline Frozen Dispatch (DEC-01..DEC-03 Pending)**:
  - Only the 8 currently ready tasks are eligible for review: `W5-1`, `W6-1`, `W6-2`, `W6-3`, `W6-4`, `W7-1`, `W7-2`, `W8-1`.
  - `W7-P1`, `W8-2`, and `W9-1` remain blocked on contract/specification approval.
- **Scenario 2: Fully Unblocked Dispatch (DEC-01..DEC-03 Ratified via Option A)**:
  - 11 tasks become eligible for implementation review: `W5-1`, `W6-1`, `W6-2`, `W6-3`, `W6-4`, `W7-P1`, `W7-1`, `W7-2`, `W8-1`, `W8-2`, `W9-1`.
  - Enables early parallel dispatch of backend Contract A history (`W7-P1`), diff engine math (`W8-2`), and refactoring math (`W9-1`).

### 2.2 Controlled Dispatch Wave Groups

```
+----------------------------------------------------------------------------------------------------+
|                                    GATE 1A TECHNICAL CERTIFICATION                                 |
|                               (Lead Architect + Integration Coordinator)                            |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                               GATE 1B EXECUTIVE RATIFICATION & DISPATCH                            |
|                                  (Product Owner + Project Owner)                                    |
+----------------------------------------------------------------------------------------------------+
                                                  │
                 ┌────────────────────────────────┴────────────────────────────────┐
                 ▼                                                                 ▼
+─────────────────────────────────+                             +──────────────────────────────────+
|  BATCH 1A: PRIMARY SERIAL ANCHOR|                             |   BATCH 1B: ISOLATED NEW VIEWS   |
|  Task: W5-1 (Shell Layout Switch)                             |   Tasks: W6-1, W7-1, W8-1        |
|  Owner: Workstream A Lead       |                             |   Owners: WS-B, WS-C, WS-D Leads |
|  Touches: daGraphViewer (shared)|                             |   Touches: 100% Isolated New LWC |
+─────────────────────────────────+                             +──────────────────────────────────+
                 │                                                                 │
                 ▼                                                                 ▼
[Requires W5-1 Verification & Dual Accept]                     [Independent Verification & Dual Accept]
                 │                                                                 │
                 ▼                                                                 │
+─────────────────────────────────+                                                │
|  BATCH 2: SERIAL WAVE 5 CONTINUATION                                             │
|  Task: W5-2 (Orbit Layout)      |                                                │
|  (Followed serially by W5-3..6) │                                                │
+─────────────────────────────────+                                                │
                 │                                                                 │
                 └────────────────────────────────┬────────────────────────────────┘
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                              INT-1 COORDINATOR APP SHELL MOUNT & RUNNER                            |
|                                  (Integration Coordinator Exclusive)                              |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. First Candidate Tasks for Implementation Dispatch Review

The following tasks represent the first logical candidates that could reasonably be presented for Gate 1A/Gate 1B review:

### Candidate 1: Task W5-1 (Shell Layout Switcher) — Primary Serial Anchor
- **Why Eligible for Review**: W5-1 is the root task of Wave 5. It has zero predecessor tasks and relies only on frozen contracts CONTRACT-01 and CONTRACT-02. Because Wave 5 is strictly serialized (`W5-1 -> W5-2 -> W5-3 -> W5-4 -> W5-5 -> W5-6`), dispatching W5-1 first is necessary to begin unlocking the core layout engine and graph viewer capabilities without causing concurrent write collisions on `daGraphViewer`.
- **Exact Accountable Owner**: Workstream A Lead.
- **Permitted File Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html`
  - `scratch/salesforce-poc/tests/run-w5-1-tests.cjs`
- **Protected File Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.css` (Frozen baseline styling)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/*` (Reserved for W5-2/W5-3)
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*` (Coordinator exclusive)
  - All 9 baseline offline test runners.
- **Predecessor Evidence Status**: N/A (Root task; no upstream tasks).
- **Required Tests & Verification**:
  1. Authoring and successful execution of `node scratch/salesforce-poc/tests/run-w5-1-tests.cjs`.
  2. Successful execution of all 9 immutable baseline test suites (187 tests) with 0 regressions.
  3. Verification that `SELECTION != NAVIGATION` invariant is preserved.
  4. Non-mutating preflight and patch-gate compliance.
- **Integration Dependencies**: Must preserve the component API contract (`graphData`, `filterCriteria`, `selectedNodeId`).
- **Required Review & Acceptance**: Workstream A Lead completion certification + Integration Coordinator verification signoff.
- **Unresolved Decision Blockers**: Awaits formal adoption of DEC-04 (Gate 1B authorization).
- **Current Authorization Status**: **PROPOSED ONLY — NOT AUTHORIZED**.

---

### Candidate 2: Task W6-1 (Radar View Component) — Isolated Multi-Dimensional View
- **Why Eligible for Review**: Completely isolated new component bundle with zero shared-file collisions (`scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/`). Relies on frozen CONTRACT-01 and source-confirmed CONTRACT-03. Zero predecessors.
- **Exact Accountable Owner**: Workstream B Lead.
- **Permitted File Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w6-1-tests.cjs`
- **Protected File Paths**: `daAppShell/*`, all other component directories, baseline test runners.
- **Predecessor Evidence Status**: N/A (Root component).
- **Required Tests & Verification**: `run-w6-1-tests.cjs` + 9 baseline test runners (187 tests).
- **Integration Dependencies**: Inbound `@api` props (`graphData`, `filterCriteria`), outbound selection event (`node-select`). Does not mount to shell directly; shell integration is reserved for INT-1.
- **Required Review & Acceptance**: Workstream B Lead + Integration Coordinator joint signoff.
- **Unresolved Decision Blockers**: Awaits DEC-04 Gate 1B authorization.
- **Current Authorization Status**: **PROPOSED ONLY — NOT AUTHORIZED**.

---

### Candidate 3: Task W7-1 (Diagnostics Scorecard Component) — Isolated Metric Scorecard
- **Why Eligible for Review**: Completely isolated new component bundle (`scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/`). Zero file collisions. Relies on CONTRACT-01 and CONTRACT-09. Zero predecessors.
- **Exact Accountable Owner**: Workstream C Lead.
- **Permitted File Paths**: All `daDiagnosticsView/*` files + `scratch/salesforce-poc/tests/run-w7-1-tests.cjs`.
- **Protected File Paths**: `daAppShell/*`, `DAGraphController.*`, baseline test runners.
- **Predecessor Evidence Status**: N/A.
- **Required Tests & Verification**: `run-w7-1-tests.cjs` + 9 baseline test runners (187 tests).
- **Integration Dependencies**: Pure read-only scorecard rendering from `graphData`.
- **Required Review & Acceptance**: Workstream C Lead + Integration Coordinator joint signoff.
- **Unresolved Decision Blockers**: Awaits DEC-04 Gate 1B authorization.
- **Current Authorization Status**: **PROPOSED ONLY — NOT AUTHORIZED**.

---

### Candidate 4: Task W8-1 (Investigation Drawer Component) — Isolated Metadata Drawer
- **Why Eligible for Review**: Isolated new component bundle (`scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/`). Zero file collisions. Relies on frozen CONTRACT-01 and CONTRACT-06. Zero predecessors.
- **Exact Accountable Owner**: Workstream D Lead.
- **Permitted File Paths**: All `daInvestigationDrawer/*` files + `scratch/salesforce-poc/tests/run-w8-1-tests.cjs`.
- **Protected File Paths**: `daAppShell/*`, baseline test runners.
- **Predecessor Evidence Status**: N/A.
- **Required Tests & Verification**: `run-w8-1-tests.cjs` + 9 baseline test runners (187 tests).
- **Integration Dependencies**: Inbound `@api selectedNodeId` and `@api graphData`. Outbound close event.
- **Required Review & Acceptance**: Workstream D Lead + Integration Coordinator joint signoff.
- **Unresolved Decision Blockers**: Awaits DEC-04 Gate 1B authorization.
- **Current Authorization Status**: **PROPOSED ONLY — NOT AUTHORIZED**.

---

### Conditional Candidate 5: Task W7-P1 (Minimal History API) — Post DEC-01 Ratification
- **Why Eligible for Review**: Sole Apex backend modification in the migration. Zero-schema Contract A implementation. If DEC-01 (Option A) is formally ratified by the Project Owner, specification blockers are cleared.
- **Exact Accountable Owner**: Workstream C Lead.
- **Permitted File Paths**:
  - `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`
  - `scratch/salesforce-poc/force-app/main/default/classes/dto/DAAnalysisRunSummaryDTO.cls`
  - `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls`
  - `scratch/salesforce-poc/tests/run-w7-p1-tests.cjs`
- **Protected File Paths**: All other Apex classes, custom object definitions, metadata XMLs, `daAppShell/*`.
- **Predecessor Evidence Status**: N/A.
- **Required Tests & Verification**: `run-w7-p1-tests.cjs` (offline syntax, schema, and AST parsing checks) + 9 baseline test runners (187 tests).
- **Integration Dependencies**: Establishes backend DTO for `W7-3` and `W8-3`.
- **Required Review & Acceptance**: Workstream C Lead + Integration Coordinator joint signoff.
- **Unresolved Decision Blockers**: Blocked on formal ratification of `DEC-01` (Option A) and `DEC-04`.
- **Current Authorization Status**: **BLOCKED ON DEC-01 SPECIFICATION — NOT AUTHORIZED**.

---

## 4. Controlled Implementation Workflow Under Proposed Gate 1 Model

Under the proposed DEC-04 Alternative 3 model, the execution workflow for any dispatched task proceeds through rigorous, non-overlapping gates:

```
Step 1: Formal Gate 1A Technical Certification
        - Lead Architect & Integration Coordinator confirm zero file collisions and contract freeze.
        - Verify clean git working tree and 187/187 passing baseline tests.

Step 2: Formal Gate 1B Executive Ratification
        - Product Owner & Project Owner sign 16-point Implementation Authorization Order.
        - Specify exact task allowlist (e.g., Task W5-1 only).

Step 3: Isolated Task Implementation
        - Feature Agent creates feature branch and works strictly within permitted paths.
        - Feature Agent authors task-specific test runner (e.g., run-w5-1-tests.cjs).
        - Feature Agent executes task runner and all 9 baseline runners (187 tests).

Step 4: Task Completion & Verification Evidence Submission
        - Feature Agent submits git patch, changed files list, and fresh test logs.
        - Workstream Lead signs task completion certificate.

Step 5: Predecessor Formal Acceptance Review
        - Workstream Lead AND Integration Coordinator jointly verify evidence.
        - If disagreement arises, escalate to Lead Architect (with Project Owner final arbitration).
        - Formal dual acceptance recorded in repository.

Step 6: Unlock Successor Task (e.g., W5-2)
        - Only upon formal acceptance of W5-1 does W5-2 unlock for Gate 1A/Gate 1B review.
```

---

## 5. Mandatory Prohibitions During Pre-Dispatch

1. **No Application Source Modifications**: Do not create or edit files in `force-app/` or `explorer/`.
2. **No Salesforce Org Operations**: Do not configure orgs, deploy code, or execute live Apex.
3. **No Blanket Dispatches**: Tasks must be reviewed and authorized on an individual, task-scoped basis.
4. **No Wave 5 Parallelization**: Wave 5 tasks must not be dispatched in parallel under any circumstance.
5. **No Coordinator Path Mutations**: `daAppShell.*` and protected integration runners remain strictly reserved for `INT-1`.
