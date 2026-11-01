# Wave 0.4.1: Component API and Traceability Reconciliation

## 1. Executive Summary & Defect Remediation

In Wave 0.4, a contract contradiction existed between Contract `W0-C4` and the component-specific APIs:
- **Defect Identified:** Contract `W0-C4` was historically titled *"Shared View Registration & Public API Contract (@api projectId, graphPayload, filterCriteria, selectedNodeId, readOnly)"*. This implied that every component across Waves 5 through 9 must implement this identical, universal list of `@api` properties. However, as established in `WAVE_0_4_CANONICAL_PAYLOAD_AND_COMPONENT_API_CLOSURE.md`, components are functionally heterogeneous: utility modules (`daDiffEngine`, `daRefactoringEngine`), modal handoffs (`daRefactorHandoffModal`), history views (`daAnalysisHistoryView`), and diagnostics scorecards (`daDiagnosticsView`) each have distinct, specialized public APIs.
- **Remediation Enacted in Wave 0.4.1:**
  1. Contract `W0-C4` is formally redefined as **"Component API Registration & Contract Governance (daAppShell Integration Protocol)"**.
  2. Rather than prescribing a rigid universal property list, `W0-C4` establishes the architectural contract for how `daAppShell` mounts, binds, and orchestrates child components.
  3. Each component's individual, component-specific `@api` contract is authoritatively preserved as defined in the Component API closure document.

---

## 2. Definitive Component API Matrix

| Component Bundle | Owning Task | Primary Role | Exact Public `@api` Properties | Parent Template Attributes | Events Dispatched |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `daRadarView` | `W6-1` | Radar Chart View | `graphPayload`, `selectedNodeId`, `readOnly` | `graph-payload`, `selected-node-id`, `read-only` | `nodeselect` (`{ nodeId }`) |
| `daTreemapView` | `W6-2` | Treemap Visualizer | `graphPayload`, `selectedNodeId` | `graph-payload`, `selected-node-id` | `nodeselect` (`{ nodeId }`) |
| `daSubwayView` | `W6-3` | Metro Transit View | `graphPayload`, `selectedNodeId` | `graph-payload`, `selected-node-id` | `nodeselect` (`{ nodeId }`) |
| `daHotspotsView` | `W6-4` | Risk Matrix View | `graphPayload`, `selectedNodeId` | `graph-payload`, `selected-node-id` | `nodeselect` (`{ nodeId }`) |
| `daDiagnosticsView` | `W7-1` | System Scorecard | `graphPayload`, `projectId` | `graph-payload`, `project-id` | None |
| `daArchitectureDnaBarcode` | `W7-2` | DNA Barcode View | `graphPayload`, `selectedNodeId` | `graph-payload`, `selected-node-id` | `nodeselect` (`{ nodeId }`) |
| `daAnalysisHistoryView` | `W7-3` | Analysis Runs View | `projectId`, `activeRunId` | `project-id`, `active-run-id` | `runselect` (`{ runId }`) |
| `daInvestigationDrawer` | `W8-1` | Node Detail Overlay | `nodeData`, `isOpen` | `node-data`, `is-open` | `drawerclose` (`{}`) |
| `daDiffEngine` | `W8-2` | Diff Computation | `computeDiff(runA, runB)` (method) | Headless utility module | N/A |
| `daCompareView` | `W8-3` | Dual Snapshot View | `projectId`, `baseRunId`, `targetRunId` | `project-id`, `base-run-id`, `target-run-id` | `diffcomplete` (`{ summary }`) |
| `daRefactoringEngine` | `W9-1` | Topology Math | `simulateStep(...)` (method) | Headless utility module | N/A |
| `daRefactoringView` | `W9-2` | Refactoring View | `graphPayload` | `graph-payload` | `mutationapply` (`{ recipe }`) |
| `daRefactorHandoffModal` | `W9-3` | Export Dialog | `isOpen`, `mutationPlan` | `is-open`, `mutation-plan` | `modalclose` (`{}`), `planexport` (`{ plan }`) |

---

## 3. Governance Rules for `daAppShell` Integration (Task INT-1)

1. **Strict Kebab-Case Attribute Binding:** LWC requires camelCase JavaScript properties to be bound in HTML templates using kebab-case (`graphPayload` -> `graph-payload`).
2. **SELECTION ≠ NAVIGATION Invariant:** Components emitting `nodeselect` update the active node selection in `daAppShell`, but must **never** trigger route or view navigation.
3. **Payload Immutability:** Inbound `graphPayload` objects passed to child views are treated as strictly read-only.
