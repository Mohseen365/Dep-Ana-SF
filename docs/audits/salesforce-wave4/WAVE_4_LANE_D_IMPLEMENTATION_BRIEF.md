# Wave 4 Implementation Brief — Lane D: Graph Filter Adapter

| Brief Attribute | Specification |
|---|---|
| **Lane ID** | `LANE-D` |
| **Objective** | Adapt `daGraphViewer` to consume canonical filter criteria from `daAppShell`, filter visible graph nodes/edges, preserve selection anchors, and enforce `SELECTION ≠ NAVIGATION`. |
| **Status** | **NOT AUTHORIZED FOR IMPLEMENTATION** (Draft Readiness Specification) |
| **Target Directory** | `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/` |

---

## 1. Exact Scope & File Ownership

### Owned Files
- `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
- `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html`

### Prohibited Modifications
- MUST NOT edit App Shell files (`daAppShell.js`).
- MUST NOT edit Apex controllers (`DAUserPreferenceController.cls`).
- MUST NOT break Cytoscape mounting/teardown lifecycle or position persistence (`Positions_JSON__c`, `Zoom_Pan_JSON__c`).

---

## 2. Interface Contracts & Key Tasks

1. Receive canonical filter object via `@api` setter or `filterchange` event listener.
2. Apply node visibility filtering in Cytoscape based on:
   - `searchTerm` (node label/id)
   - `riskLevels` (`HIGH`, `MEDIUM`, `LOW`, `UNKNOWN`)
   - `nodeTypes` (ApexClass, Trigger, Flow, etc.)
   - `layers`
   - `testCoverageStatus` (`COVERED`, `UNTESTED`, `AMBIGUOUS`, `UNKNOWN`)
3. Preserve node selection (`selectedNodeId`) during filter updates unless the selected node is explicitly hidden by active criteria.
4. Maintain `SELECTION ≠ NAVIGATION`: Selecting a node updates detail panels without triggering project or view navigation.
5. Preserve graph zoom, pan, and manual node layout coordinates.

---

## 3. Acceptance Criteria

- Graph nodes dynamically hide/show based on canonical filter criteria.
- Missing/null coverage nodes (`UNKNOWN`) remain visible unless explicitly excluded by `UNKNOWN` coverage filter.
- `SELECTION ≠ NAVIGATION` invariant is verified and preserved.
- Cytoscape instances clean up listeners and timers on unmount.
