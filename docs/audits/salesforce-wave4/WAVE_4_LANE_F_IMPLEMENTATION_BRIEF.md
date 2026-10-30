# Wave 4 Implementation Brief — Lane F: Findings View

| Brief Attribute | Specification |
|---|---|
| **Lane ID** | `LANE-F` |
| **Objective** | Implement functional Lightning Datatable LWC (`daFindingsViewer`) consuming existing graph findings/analytics data and canonical filter criteria. |
| **Status** | **NOT AUTHORIZED FOR IMPLEMENTATION** (Draft Readiness Specification) |
| **Target Directory** | `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/` |

---

## 1. Exact Scope & File Ownership

### Owned Files (New Directory)
- `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.html`
- `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.js`
- `scratch/salesforce-poc/force-app/main/default/lwc/daFindingsViewer/daFindingsViewer.css`

### Prohibited Modifications
- MUST NOT modify Graph Viewer (`daGraphViewer.js`).
- MUST NOT modify App Shell (`daAppShell.js`).
- MUST NOT modify Apex files or Salesforce metadata.

---

## 2. Interface Contracts & Key Tasks

1. Create LWC component `@api` properties: `@api graphData`, `@api filterCriteria`.
2. Extract findings/architecture diagnostics array from `graphData.findings` or `graphData.analytics`.
3. Apply canonical filter criteria (`searchTerm`, `nodeTypes`, `testCoverageStatus`, `findingsSeverity`, `findingsStatus`).
4. Render Lightning Datatable displaying Finding Title, Target Component, Severity, Resolution Status, and Coverage Badge.
5. Implement 4-state coverage badges (`COVERED`, `UNTESTED`, `AMBIGUOUS`, `UNKNOWN`).
6. Provide empty, loading, and error states.

---

## 3. Acceptance Criteria

- Functional Lightning Datatable displays architectural findings and static analysis alerts.
- Filter criteria (`findingsSeverity`, `findingsStatus`, `searchTerm`) correctly filter findings rows.
- Missing coverage items (`UNKNOWN`) render neutral grey "Coverage N/A" badges.
- Row selection fires `findingselect` event maintaining `SELECTION ≠ NAVIGATION`.
