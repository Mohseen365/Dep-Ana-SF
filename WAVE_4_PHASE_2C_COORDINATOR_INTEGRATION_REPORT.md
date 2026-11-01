# Wave 4 Phase 2C Coordinator Integration Report

| Governance Attribute | Value |
|---|---|
| **Document Type** | Phase 2C Coordinator Integration & Architecture Implementation Report |
| **Phase Target** | Wave 4 — Phase 2C: Coordinator Integration |
| **Repository Root** | `/app` |
| **Working Branch** | `jules-18338120577467426713-f5b5fd52` |
| **HEAD Commit SHA** | `89c02b45a432c3e80b33fb191d928bbe26d57188` |
| **Author** | Jules (Integration Coordinator Subagent) |
| **Date** | November 1, 2026 |
| **Phase 2C Verdict** | **QUALIFIED — PHASE 2C OFFLINE INTEGRATION COMPLETE** |

---

## 1. Executive Summary

Wave 4 Phase 2C executes the integration charter authorized by the Wave 4 Phase 2B Independent Architecture Review (`QUALIFIED — PHASE 2C AUTHORIZED WITH EXPLICIT CONDITIONS`).

In Phase 2C, the Coordinator:
1. Elevated shared graph payload retrieval and lifecycle management into `daAppShell`, supplying `activeGraphPayload` to `c-da-matrix-view` and `c-da-findings-view`, while preserving standalone loading and filter-buffering in `c-da-graph-viewer`.
2. Disambiguated Preset Manager events by separating `filterchange` (broadcast canonical criteria across views without persisting) from `containerchange` (validate, strictly scope, and persist container to `Filters_JSON__c`).
3. Resolved the DEC-W4-03 strict project-scoped preset discrepancy via a shell-boundary adapter (`enforceStrictProjectScoping`) that excludes unscoped presets (`!p.projectId`) and cross-project presets without mutating persisted records during load.
4. Mounted `c-da-preset-manager`, `c-da-matrix-view`, and `c-da-findings-view`, while wiring `c-da-graph-viewer` with canonical criteria in `daAppShell.html`.
5. Preserved all 12 frozen architectural invariants, including `SELECTION ≠ NAVIGATION`, user/project preference isolation, position/zoom preservation, and stale asynchronous response guards.

---

## 2. Architecture Before vs. After

### Before Phase 2C:
- **Graph Retrieval:** Graph chunks were fetched exclusively inside `c-da-graph-viewer`. `daAppShell` had zero knowledge or state for graph data.
- **Child Views:** `c-da-matrix-view` and `c-da-findings-view` were implemented in Phase 2A with `@api graphPayload` inputs, but were unmounted in `daAppShell.html`. Placeholder static boxes existed in the tab containers.
- **Preset Management:** `c-da-preset-manager` was implemented in Phase 2A, but not mounted in the shell. The shell's `handleFilterChange` conflated active criteria updates and container persistence.
- **Project Isolation:** `daFilterSchema.js` retained unscoped presets (`!p.projectId`) and assigned them the active project ID during validation, violating DEC-W4-03.

### After Phase 2C:
```
                                +-----------------------------+
                                |      DAGraphController      |
                                +--------------+--------------+
                                               |
                                (getLatestGraphMetadataForProject,
                                         getGraphChunks)
                                               |
                                               v
                                +-----------------------------+
                                |      daAppShell (State)     |
                                |  - activeProjectId          |
                                |  - activeGraphPayload       |
                                |  - activeFilterCriteria     |
                                |  - scopedFilterContainer    |
                                +-------+------+------+-------+
                                        |      |      |
             +--------------------------+      |      +--------------------------+
             |                                 |                                 |
             v                                 v                                 v
+------------------------+        +------------------------+        +------------------------+
|    c-da-graph-viewer   |        |    c-da-matrix-view    |        |   c-da-findings-view   |
| - recordId             |        | - projectId            |        | - projectId            |
| - filterCriteria       |        | - graphPayload         |        | - graphPayload         |
|                        |        | - filterCriteria       |        | - filterCriteria       |
+------------------------+        +------------------------+        +------------------------+
             ^
             |
+------------+-----------+
|  c-da-preset-manager   |
| - projectId            |
| - filterContainer      |
| - activeFilter         |
| Events:                |
|  - filterchange (bcast)|
|  - containerchange     |
|    (persist V2)        |
+------------------------+
```

---

## 3. Detailed Component Integrations

### A. Shared Graph Payload Lifecycle (Requirement A)
- **Methodology:** `daAppShell.js` imports `getLatestGraphMetadataForProject` and `getGraphChunks` from `@salesforce/apex/DAGraphController`, and `reassembleChunks`, `validatePayloadIntegrity`, `verifyChunkSequence` from `c/daGraphPayloadLoader`.
- **Async & Stale Protection:** Managed via `currentGraphRequestId`. Each project change or load increments this token. Asynchronous chunk batch retrieval checks `requestId === this.currentGraphRequestId && this.activeProjectId === projectId` after every chunk page fetch and before parsing.
- **Project Switch:** When project changes (`handleProjectChange`), `activeGraphPayload` is synchronously set to `null`, `selectedNodeId` is cleared, and `loadGraphPayload(newProjectId)` is triggered.
- **Teardown:** `disconnectedCallback` increments both `currentPrefRequestId` and `currentGraphRequestId`, invalidating any in-flight requests.
- **Loading / Error / Empty States:** Distinct states in `daAppShell.html`:
  - `isLoadingGraph` displays SLDS spinners.
  - `graphError` renders standard SLDS scoped alert banners.
  - Missing project displays empty-state illustrations.

### B. Preset Manager Event Disambiguation (Requirement B)
- `handleFilterChange(event)`:
  - Consumes `{ activeFilter, activePresetId }`.
  - Normalizes criteria via `normalizeFilterCriteria`.
  - Updates `activeFilterCriteriaState` and in-memory `filterConfig`.
  - Broadcasts to child views (`c-da-graph-viewer`, `c-da-matrix-view`, `c-da-findings-view`).
  - **Zero Apex persistence** is invoked.
- `handleContainerChange(event)`:
  - Consumes `{ container }`.
  - Normalizes and validates container schema via `validateAndNormalizeContainer`.
  - Enforces strict project scoping via `enforceStrictProjectScoping`.
  - Serializes via `serializeFilterContainer` (enforcing the 131,072 character limit).
  - Updates shell container state and calls `savePreferenceChange({ filtersJson: serialized })`.

### C. Strict Project-Scoped Presets (Requirement C)
- **Discrepancy:** `daFilterSchema.js` lines 194–202 retained presets where `!p.projectId` and assigned them `currentProjectId`.
- **Resolution:** A Coordinator-owned adapter function `enforceStrictProjectScoping(container, currentProjectId)` was implemented in `daAppShell.js`:
  - If `!currentProjectId`, returns 0 presets and `activePresetId = null`.
  - Presets are strictly filtered by `p.projectId === currentProjectId`. Presets without `projectId` or with foreign `projectId` are excluded.
  - If `activePresetId` referenced an excluded preset, it is reset to `null`.
  - Non-mutating: loading preferences never writes back to Apex merely because unscoped presets were filtered out.

### D. Component Mounting (Requirement D)
- `daAppShell.html`:
  - `<c-da-preset-manager>` mounted in the header controls toolbar with `project-id={activeProjectId}`, `filter-container={scopedFilterContainer}`, `active-filter={activeFilterCriteria}`, `onfilterchange={handleFilterChange}`, and `oncontainerchange={handleContainerChange}`.
  - `<c-da-graph-viewer>` wired with `filter-criteria={activeFilterCriteria}` and `record-id={activeProjectId}`.
  - `<c-da-matrix-view>` mounted in the Dependency Matrix tab with `project-id={activeProjectId}`, `graph-payload={activeGraphPayload}`, and `filter-criteria={activeFilterCriteria}`.
  - `<c-da-findings-view>` mounted in the Findings & Alerts tab with `project-id={activeProjectId}`, `graph-payload={activeGraphPayload}`, and `filter-criteria={activeFilterCriteria}`.

---

## 4. File Ownership & Changes Inventory

| File Path | Owner | Description of Changes |
|---|---|---|
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` | Coordinator | Added shared graph payload loader (`loadGraphPayload`), `enforceStrictProjectScoping`, separated `handleFilterChange` and `handleContainerChange`. |
| `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html` | Coordinator | Mounted `c-da-preset-manager`, `c-da-matrix-view`, `c-da-findings-view`, and wired `c-da-graph-viewer` filter criteria. |
| `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | Coordinator | Extended integration test suite from 17 to 32 tests covering all 32 Phase 2C integration requirements and frozen invariants. |
| `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | Integration Test | Authorized harness regex update to mock newly added static ES imports (`getLatestGraphMetadataForProject`, `getGraphChunks`, `c/daGraphPayloadLoader`). |

**Zero unauthorized modifications were made to protected feature lane files (`daFilterSchema.js`, `daPresetManager/*`, `daGraphViewer/*`, `daMatrixView/*`, `daFindingsView/*`) or Apex classes.**
