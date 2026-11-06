# Contract 09: Shared State, Immutability & Frozen Invariants

## 1. Document Control & Identification
- **Contract ID**: `CONTRACT-09`
- **Contract Name**: Shared State, Immutability & Frozen Invariants
- **Version**: `1.0.0`
- **Status**: `FROZEN`
- **Purpose**: Establishes immutable architectural invariants, state isolation rules, memory limits, and automated verification requirements across all Waves 5–9 tasks and the Integration Coordinator.
- **Affected Tasks**: All tasks (`W5-1..6`, `W6-1..4`, `W7-P1`, `W7-1..3`, `W8-1..3`, `W9-1..3`, `INT-1`)
- **Affected Workstreams**: Workstreams A, B, C, D, E, and Integration Coordinator

---

## 2. Invariant Catalog & Testable Obligations

### Invariant 1: `SELECTION != NAVIGATION`
- **Rule**: Selecting an architectural node or edge in any interactive view, drawer, or matrix:
  - MUST NOT navigate away from the current workspace tab.
  - MUST NOT switch or reload the active project.
  - MUST NOT mutate or reset active filter criteria or presets.
  - MUST NOT trigger Apex DML operations.
- **Responsible Components**: All interactive views (`daGraphViewer`, `daMatrixView`, `daRadarView`, `daTreemapView`, `daSubwayView`, `daHotspotsView`, `daInvestigationDrawer`).
- **Verification Method**: Unit tests assert that dispatching `nodeselect` changes only `selectedNodeId` without modifying `activeViewMode`, `activeProjectId`, or `activeFilter`.

### Invariant 2: Shared Graph Payload Immutability
- **Rule**: Child views are read-only consumers of `activeGraphPayload`. Views MUST NOT mutate `payload.nodes`, `payload.edges`, or child node properties in place.
- **Responsible Components**: All analytical views.
- **Prohibited Code**:
  ```javascript
  // VIOLATION:
  this.payload.nodes[0].selected = true;
  this.payload.nodes[0].position = { x: 10, y: 20 };
  ```
- **Approved Pattern**: Store component-specific flags in local Maps/Sets or clone objects when layout decoration is required.

### Invariant 3: Project-Scoped State & Isolation
- **Rule**: All user preferences, annotations, analysis runs, and cached payloads are strictly isolated by `Project__c` or `DA_Project__c`.
- **Enforcement**: Apex queries strictly filter by `WHERE DA_Project__c = :projectId` under `WITH USER_MODE`.

### Invariant 4: Single Cytoscape Canvas Instance Limit
- **Rule**: Concurrently mounting two active Cytoscape canvas instances within the browser DOM is strictly prohibited to prevent WebGL/Canvas memory exhaustion.
- **Responsible Components**: `daCompareView` (`W8-3`) must render structural diffs in a single unified Cytoscape canvas using color-coded delta styling.

### Invariant 5: Stale Asynchronous Response Suppression
- **Rule**: All asynchronous data-fetching operations (Aura wire callbacks, imperative Apex promises, chunk loaders) MUST maintain a monotonic request counter and verify that `requestId === this.activeRequestId` before updating component state.
- **Purpose**: Prevents race conditions and out-of-order state overwrites when users rapidly switch projects or snapshots.

### Invariant 6: Pure Client-Side Simulation Isolation
- **Rule**: Refactoring simulation operations (`W9-1`) execute 100% in-memory with zero persistent database side effects.
- **Prohibited Behavior**: Any Apex DML or persistent metadata writes during refactoring simulation.

### Invariant 7: UTF-8 & Chunk Boundary Safety
- **Rule**: Chunk assembly routines must not split multi-byte UTF-8 sequences or JSON string literals across chunk boundaries without proper string concatenation before `JSON.parse`.
- **Responsible Components**: `DAGraphChunkService.cls` and `daGraphPayloadLoader.js`.

---

## 3. Invariant Verification Matrix

| Invariant | Responsible Task(s) | Baseline Test Runner Reference | Task Runner Obligation |
| :--- | :--- | :--- | :--- |
| `SELECTION != NAVIGATION` | `W5-1`, `W5-4`, `W8-1` | `run-lane-d-graph-filter-tests.cjs` | Mandatory test case in `run-w5-1-tests.cjs`, `run-w8-1-tests.cjs` |
| Payload Immutability | `W6-1..4`, `W7-1..3` | `run-lane-e-matrix-tests.cjs` | Assert `payload` unmodified after render/filter |
| Project Data Isolation | `W7-P1`, `W7-3`, `W8-3` | `DAGraphSecurityTest.cls` | SOQL `WITH USER_MODE` and Project ID filtering |
| Single Canvas Cap | `W8-3` | N/A (New in Wave 8) | Mandatory assertion in `run-w8-3-tests.cjs` |
| Stale Response Suppression| `W7-3`, `W8-3` | N/A (New in Wave 7/8) | Out-of-order promise resolution assertion |
