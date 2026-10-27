# Wave 2 Readiness Decision: READY FOR USER AUTHORIZATION

**Target Implementation Tranche:** Wave 2
**Branch:** `jules-1088166752097762498-9c238bc7`
**HEAD SHA:** `f5985ac74aa54b20ad9da86897f86e71ec2828d1`
**Date:** October 2026
**Readiness Status:** `READY FOR USER AUTHORIZATION`

---

## 1. Decision Summary

Following the full migration plan technical reconciliation against the current repository state, the Wave 2 implementation tranche is declared **`READY FOR USER AUTHORIZATION`**.

All architectural prerequisites, custom object schemas, Apex controller endpoints, and offline test harnesses required for Wave 2 are fully verified and present in the repository.

Wave 1 implementation code remains frozen and untouched. No Wave 2 implementation code has been written during this reconciliation task.

---

## 2. Scope of Proposed Wave 2 Tranche

The proposed Wave 2 implementation tranche consists of four core capabilities:

1. **`FEAT-SHELL-01` — App Tab Navigation & LWC Routing Context (`daAppShell`)**
   - *Description:* Top-level SLDS tab navigation container providing view switching between Graph Canvas, Feature Matrix, DNA Barcode, and other analytical panels.
   - *Workstream Owner:* Workstream A

2. **`FEAT-SHELL-03` — Dynamic Project Selector (`daProjectSelector`)**
   - *Description:* LWC dropdown component querying `DAGraphController.getProjects()` to switch active projects dynamically and dispatching project-change events to reload graph payloads without memory leaks.
   - *Workstream Owner:* Workstream A

3. **`FEAT-STATE-02` — User ViewState & Position Persistence (`DA_User_Preference__c`)**
   - *Description:* Apex service and LWC hook to load and persist custom node coordinates, zoom level, and selected layout mode per user and per project.
   - *Workstream Owner:* Workstream C

4. **`FEAT-DATA-02` — Architectural Annotations Service (`DA_Annotation__c`)**
   - *Description:* Apex CRUD controller (`DAAnnotationController.cls`) and LWC note panel allowing users to create, edit, view, and delete entity-level text notes and tags.
   - *Workstream Owner:* Workstream C

---

## 3. Verified Prerequisites & Asset Status

| Prerequisite Item | Location / Asset Path | Status | Verification Evidence |
|---|---|---|---|
| `DA_Project__c` Custom Object Schema | `scratch/salesforce-poc/force-app/main/default/objects/DA_Project__c/` | Verified | Field definitions present; validated in `run-poc-tests.cjs`. |
| `DA_Analysis_Run__c` Custom Object Schema | `scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/` | Verified | Field definitions present; validated in Category 5 tests. |
| `DA_User_Preference__c` Custom Object Schema | `scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/` | Verified | Field definitions present (`User__c`, `Project__c`, `Coordinates__c`). |
| `DA_Annotation__c` Custom Object Schema | `scratch/salesforce-poc/force-app/main/default/objects/DA_Annotation__c/` | Verified | Field definitions present (`Project__c`, `Node_Id__c`, `Note__c`, `Author__c`). |
| `DAGraphController.cls` Apex Controller | `scratch/salesforce-poc/force-app/main/default/classes/DAGraphController.cls` | Verified | `getProjects()` and `getLatestRun()` implemented and passing offline tests. |
| LWC Graph Loader Shell | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/` | Verified | Reassembly, chunk sequence, and schema validation tests pass 100%. |
| Offline Test Harness | `scratch/salesforce-poc/tests/run-poc-tests.cjs` | Verified | 30/30 tests passed. |

---

## 4. Behavioral Acceptance Criteria for Wave 2 Capabilities

### `FEAT-SHELL-01` (App Tab Navigation)
- Renders standard SLDS tab bar with tabs for "Graph Viewer", "Feature Matrix", "Hotspot Panel", and "Findings".
- Maintains active project context across tab changes.
- Updating active tab updates internal view state WITHOUT re-triggering Apex server data fetches.

### `FEAT-SHELL-03` (Dynamic Project Selector)
- Renders SLDS combobox populated with accessible `DA_Project__c` records.
- Selecting a project fires a custom event `projectchange` containing `projectId` and `projectKey`.
- `daGraphViewer` receives the event, resets graph canvas state, and fetches the project payload.
- Empty or failed project responses render an SLDS empty-state alert without crashing the app.

### `FEAT-STATE-02` (ViewState & Position Persistence)
- Node drag events fire debounced coordinate updates to `DA_User_Preference__c`.
- Coordinates are stored as JSON map `{ [nodeId]: { x, y } }` scoped to user ID and project ID.
- Loading a project retrieves saved preferences and applies override positions to Cytoscape nodes.

### `FEAT-DATA-02` (Architectural Annotations)
- Selecting a node enables "Add Annotation" action in the inspection drawer.
- Creating an annotation writes a record to `DA_Annotation__c` with `Node_Id__c` and `Project__c`.
- Deleting an annotation removes the record and updates the LWC view reactively.
- Enforces user read/write access via Apex `WITH USER_MODE`.

---

## 5. Workstream Boundaries & Shared-File Risk Matrix

| Capability | Workstream Owner | Primary File Locations | Conflict Risk | Mitigation Strategy |
|---|---|---|---|---|
| `FEAT-SHELL-01` | Workstream A | `scratch/salesforce-poc/.../lwc/daAppShell/` | Low | Isolated in new LWC wrapper directory. |
| `FEAT-SHELL-03` | Workstream A | `scratch/salesforce-poc/.../lwc/daProjectSelector/` | Low | Isolated LWC component. |
| `FEAT-STATE-02` | Workstream C | `scratch/salesforce-poc/.../classes/DAUserPreferenceController.cls` | Medium | New Apex controller; does not modify `DAGraphController.cls`. |
| `FEAT-DATA-02` | Workstream C | `scratch/salesforce-poc/.../classes/DAAnnotationController.cls` | Medium | New Apex controller; communicates via standard LWC events. |

---

## 6. Approval Required Before Dispatch

Before starting Wave 2 implementation code, the following explicit user approval is required:

- **Dispatch Approval:** User must authorize dispatching Workstream A and Workstream C tasks for Wave 2 implementation.
- **Branch Target:** Implementation will proceed on branch `jules-1088166752097762498-9c238bc7`.
