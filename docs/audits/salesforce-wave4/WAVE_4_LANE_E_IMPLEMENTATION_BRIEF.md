# Wave 4 Implementation Brief — Lane E: Matrix View

| Brief Attribute | Specification |
|---|---|
| **Lane ID** | `LANE-E` |
| **Objective** | Implement functional SLDS interaction-summary grid LWC (`daMatrixViewer`) consuming existing graph analytics data and canonical filter criteria. |
| **Status** | **NOT AUTHORIZED FOR IMPLEMENTATION** (Draft Readiness Specification) |
| **Target Directory** | `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/` |

---

## 1. Exact Scope & File Ownership

### Owned Files (New Directory)
- `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.html`
- `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.js`
- `scratch/salesforce-poc/force-app/main/default/lwc/daMatrixViewer/daMatrixViewer.css`

### Prohibited Modifications
- MUST NOT modify Graph Viewer (`daGraphViewer.js`).
- MUST NOT modify App Shell (`daAppShell.js`).
- MUST NOT modify Apex files or Salesforce metadata.

---

## 2. Interface Contracts & Key Tasks

1. Create LWC component `@api` properties: `@api graphData`, `@api filterCriteria`.
2. Compute matrix adjacency/interaction grid from `graphData.nodes` and `graphData.edges`.
3. Apply canonical filter criteria (`searchTerm`, `riskLevels`, `nodeTypes`, `layers`, `testCoverageStatus`) to matrix row/column entities.
4. Render SLDS data table/grid showing component-to-component coupling and relationship counts.
5. Provide empty, loading, and error states.
6. Support row/cell click selection maintaining `SELECTION ≠ NAVIGATION`.

---

## 3. Acceptance Criteria

- Functional SLDS interaction grid renders component relationships without placeholder stubs.
- Matrix dynamically updates when `filterCriteria` changes.
- Cells with missing coverage (`UNKNOWN`) display neutral indicator with tooltip.
- Component selection fires `nodeselect` event to App Shell.
