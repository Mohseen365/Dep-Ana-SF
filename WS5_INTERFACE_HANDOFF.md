# Workstream 5 (WS-5) Interface Handoff Document

**Target Audience:** Integration Coordinator, Workstream A Lead (App Shell), Workstream D Lead (Diff/Compare)
**Author:** Jules Agent 5 (Workstream 5 Lead)
**Date:** 2026-11-09

---

## 1. Exposed Apex Endpoints

### 1.1 `DAGraphController`
- `getProjects()`: Returns active `DA_Project__c` records ordered by Name ASC.
- `resolveProject(String projectIdOrKey)`: Two-step resolution helper returning `DA_Project__c` or null.
- `getLatestGraphMetadataForProject(String projectId)`: Returns `DAGraphDTO` for the most recent valid run. Validates `Status__c == 'AVAILABLE' AND COUNT(chunks) == Total_Chunks__c`.
- `getGraphChunks(String runId, Integer startIndex, Integer maxChunks[, String projectId])`: Bounded chunk fetching (max 10 chunks) enforcing project scoping and user mode security.

### 1.2 `DAAnalysisHistoryController`
- `getAnalysisRuns(String projectId, Integer queryLimit, Integer queryOffset)`: Returns `List<DAAnalysisRunDTO>` ordered deterministically by `Run_Timestamp__c DESC, Id DESC`. Accepts either Salesforce Record ID or unique `Project_Key__c`.

---

## 2. LWC Component Contracts & Event Dispatches

### 2.1 `daProjectSelector`
- **Inbound `@api` Properties**:
  - `label`: Label string.
  - `selectedProjectId`: Currently selected project ID.
  - `disabled`: Boolean flag.
- **Outbound Events**:
  - `projectchange`: Dispatched when selection changes.
    - `detail: { projectId, projectKey }`
    - `bubbles: true, composed: true`

### 2.2 `daAnalysisHistory`
- **Inbound `@api` Properties**:
  - `projectId`: Salesforce ID or Project Key.
  - `activeRunId`: Currently viewed run ID.
- **Public Methods**:
  - `refresh()`: Reloads history runs.
- **Outbound Events**:
  - `runselect`: Dispatched on run row click.
    - `detail: { runId, commitHash }`
    - `bubbles: true, composed: true`
  - `comparelaunch`: Dispatched when two runs are selected and "Compare" is clicked.
    - `detail: { baseRunId, targetRunId }`
    - `bubbles: true, composed: true`

### 2.3 `daProjectDashboard`
- **Inbound `@api` Properties**:
  - `projectId`: Salesforce ID or Project Key.
  - `projectKey`: Optional project key string.
- **Outbound Events**:
  - `viewgraph`: Dispatched when user clicks "Explore Dependency Graph".
    - `detail: { projectId, projectKey, runId }`
    - `bubbles: true, composed: true`
  - `runselect`: Dispatched when clicking "View" on a historical run.
    - `detail: { runId, commitHash, projectId }`
    - `bubbles: true, composed: true`

---

## 3. Integration Coordinator Guidance
1. **Shell Wiring (`daAppShell`)**:
   `daProjectDashboard` can be embedded into `daAppShell` by listening to `viewgraph` and switching `activeView` to `'graph'`.
2. **Snapshot Comparison Modal**:
   When path authorization is granted for `daSnapshotComparisonModal`, it will consume `comparelaunch` events from `daAnalysisHistory` and invoke `DAGraphController.getGraphChunks` for both base and target runs to feed CONTRACT-05 diff calculation.
