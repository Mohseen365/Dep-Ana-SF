# Workstream E Charter: Wave 9 — Topological Refactoring Simulation

## 1. Executive Summary & Purpose
Workstream E governs the hypothetical refactoring simulation and architectural remediation engine for Dependency Analyzer Wave 9. It provides the pure-math in-memory topology engine, the interactive simulation workspace view, and the handoff export modal for generating remediation action manifests.

## 2. Owning Role & Accountability
- **Accountable Role**: Workstream E Lead (`W9 Owner`)
- **Integration Authority**: Integration Coordinator / Integration Owner
- **Execution Mandate**: Phased sequential launch (`W9-1` initial; `W9-2` and `W9-3` dependent on `W9-1`).

## 3. Dependency Structure & Architectural Boundaries
- `W9-1` (Refactoring Engine) is a standalone pure-computation module eligible for immediate launch.
- `W9-2` (Simulation View) and `W9-3` (Handoff Export Modal) directly consume `W9-1` refactoring operation primitives and are dependent on its completion.
- **Shared Path Collisions**: ZERO (`NONE`) among all Workstream E tasks.
- **Pure Math Boundary**: `W9-1` must remain strictly independent of layout engines (such as Dagre or Cytoscape UI). All topological mutations (cycle breaking, edge redirection, class extraction) are calculated in pure memory using Tarjan cycle detection and graph adjacency lists.

### Execution Flow
```
[W9-1: Refactoring Engine (Pure Math)] (READY_TO_LAUNCH)
       ├──► [W9-2: Simulation View Component] (IMPLEMENTATION_DEPENDENT on W9-1)
       └──► [W9-3: Handoff Export Modal]      (IMPLEMENTATION_DEPENDENT on W9-1)
```

---

## 4. Task Catalog & Scope

### Task W9-1: Refactoring Engine (Pure Math / In-Memory Topology)
- **Register Status**: `READY_TO_LAUNCH`
- **Initial Eligibility**: `ELIGIBLE_FOR_INITIAL_LAUNCH` (Single initial task in Wave 9)
- **Predecessor Dependencies**: None
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w9-1-tests.cjs`
- **Scope & Deliverables**: Pure topological refactoring simulation engine; implements `extractClass`, `moveMethod`, and `breakCycle` operations; computes delta metrics (cyclomatic complexity, cycle count, layer violations); in-memory Tarjan strongly connected components; zero Dagre layout dependency.

### Task W9-2: Simulation View Component
- **Register Status**: `IMPLEMENTATION_DEPENDENT`
- **Initial Eligibility**: `BLOCKED_ON_PREDECESSOR` (Requires W9-1)
- **Predecessor Dependencies**: `W9-1`
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringView/daRefactoringView.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringView/daRefactoringView.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringView/daRefactoringView.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringView/daRefactoringView.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w9-2-tests.cjs`
- **Scope & Deliverables**: Interactive visual simulation sandbox; staged refactoring steps with undo/redo/rollback capabilities; live delta metrics scorecard comparing pre-refactoring and post-refactoring state; zero mutation of persistent project data.

### Task W9-3: Handoff Export Modal Component
- **Register Status**: `IMPLEMENTATION_DEPENDENT`
- **Initial Eligibility**: `BLOCKED_ON_PREDECESSOR` (Requires W9-1)
- **Predecessor Dependencies**: `W9-1`
- **Permitted Paths**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.css`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js-meta.xml`
  - `scratch/salesforce-poc/tests/run-w9-3-tests.cjs`
- **Scope & Deliverables**: Export modal formatting refactoring plans as structured JSON and Markdown execution guides; copy-to-clipboard functionality; step-by-step developer remediation task list.

---

## 5. Coordinator Protected Boundaries
Workstream E is strictly prohibited from touching:
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/*` (Integration Coordinator Exclusive)
- `scratch/salesforce-poc/force-app/main/default/lwc/daFilterSchema.js`
- `scratch/salesforce-poc/tests/run-wave9-tests.cjs` (Aggregate Wave 9 Runner, owned by Coordinator)
- Any component belonging to Workstreams A, B, C, or D.

## 6. Handoff & Acceptance Criteria
- Every task delivers: `task-<TASK_ID>.patch`, changed file manifest, and test execution logs demonstrating 100% pass on `run-w9-<n>-tests.cjs` and 100% pass across all 9 immutable baseline test suites.
- Engine must maintain referential transparency: original graph objects must never be mutated in place; all refactoring operations return new immutable graph instances.
- View mounting in `daAppShell` is deferred to `INT-1`.
