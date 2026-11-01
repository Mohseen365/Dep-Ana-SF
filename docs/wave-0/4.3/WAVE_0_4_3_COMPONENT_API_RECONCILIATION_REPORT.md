# WAVE 0.4.3 COMPONENT API RECONCILIATION REPORT

## 1. Overview & Provenance Boundary

In Wave 0.4.2, a comprehensive component API table was presented detailing `@api` properties, events, and method signatures across 14 components. However, that audit did not distinguish implemented source code from planned/proposed designs. A reader inspecting the report might incorrectly infer that all 14 components were already implemented in `scratch/salesforce-poc/`.

Wave 0.4.3 inspects the physical repository state and classifies each component explicitly as:
1. **IMPLEMENTED**: Component source files exist in the current working tree. Line numbers, `@api` properties, and event dispatches are verified directly against source code.
2. **PROPOSED**: Component is planned as part of the parallel migration (Waves 6 through 9). The API specification represents a ratified contract design, but the source file has not yet been authored.
3. **NOT FOUND**: Files or declarations referenced in contracts that do not exist and are not planned.

---

## 2. Component Implementation Status Summary

| Component Name | Task ID | Implementation Status | Source JS Path | Source SHA-256 |
|:---|:---:|:---:|:---|:---:|
| `daRadarView` | W6-1 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js` | N/A (Planned New) |
| `daTreemapView` | W6-2 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.js` | N/A (Planned New) |
| `daSubwayView` | W6-3 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daSubwayView/daSubwayView.js` | N/A (Planned New) |
| `daHotspotsView` | W6-4 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daHotspotsView/daHotspotsView.js` | N/A (Planned New) |
| `daDiagnosticsView` | W7-1 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daDiagnosticsView/daDiagnosticsView.js` | N/A (Planned New) |
| `daArchitectureDnaBarcode` | W7-2 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daArchitectureDnaBarcode/daArchitectureDnaBarcode.js` | N/A (Planned New) |
| `daAnalysisHistoryView` | W7-3 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistoryView/daAnalysisHistoryView.js` | N/A (Planned New) |
| `daInvestigationDrawer` | W8-1 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daInvestigationDrawer/daInvestigationDrawer.js` | N/A (Planned New) |
| `daDiffEngine` | W8-2 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daDiffEngine/daDiffEngine.js` | N/A (Planned New) |
| `daCompareView` | W8-3 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daCompareView/daCompareView.js` | N/A (Planned New) |
| `daRefactoringEngine` | W9-1 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js` | N/A (Planned New) |
| `daRefactoringView` | W9-2 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringView/daRefactoringView.js` | N/A (Planned New) |
| `daRefactorHandoffModal` | W9-3 | **PROPOSED** | `scratch/salesforce-poc/force-app/main/default/lwc/daRefactorHandoffModal/daRefactorHandoffModal.js` | N/A (Planned New) |
| `daAppShell` | INT-1 | **IMPLEMENTED** | `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | `b908430756f9efdf273e4574b8d2b77b7efc367687ec238348b459b5de03c80c` |

---

## 3. Implemented Component Source Provenance (`daAppShell`)

`daAppShell` is the parent orchestrator component owned by the Integration Coordinator.
- **Physical File**: `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
- **Lines 77–78**:
  ```javascript
  @api activeProjectId = null;
  @api activeProjectKey = null;
  ```
- **Child Component Mutation Invariant**: In accordance with LWC architecture invariants, child components (such as `daCompareView`) receive `activeProjectId` and `activeProjectKey` as inbound one-way bindings and must never mutate them directly.

---

## 4. Headless JavaScript Modules vs. LWC Visualizer APIs

Two proposed components are headless computation engines rather than UI components:
1. `daDiffEngine` (Task W8-2): Pure computation engine exporting function signatures (`computeSnapshotDiff(graphA, graphB, options)`). It does not declare `@api` properties or HTML templates.
2. `daRefactoringEngine` (Task W9-1): Pure in-memory topological graph math module exporting Tarjan cycle breaking, class extraction, and method moves. It does not declare `@api` properties or HTML templates.
