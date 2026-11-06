# Waves 5–9 Phase A3 Shared Technical Contract Inputs

## 1. Overview & Purpose
Phase A2 establishes the workstream operational boundaries, ownership structures, and execution sequence. In accordance with architectural governance, **shared technical contracts are not redesigned or modified during Phase A2**.

This catalog identifies the critical shared technical contracts that **Phase A3 must formalize, validate, and freeze** prior to any feature dispatch. Each contract specifies its source documents, affected tasks and workstreams, current status classification, and pending decisions assigned to Phase A3.

---

## 2. Status Classification Taxonomy
- `DOCUMENTED_AND_REFERENCED`: Fully defined in prior wave specifications or existing code and ready for ratification.
- `DOCUMENTED_REQUIRING_CONFIRMATION`: Defined in specifications or baseline code but requires parameter/schema reconciliation.
- `INCOMPLETE_ASSIGNED_TO_PHASE_A3`: High-level specification exists, but detailed field schemas or event signatures must be formalized by Phase A3.
- `UNRESOLVED_SOURCE_UNAVAILABLE`: Contract referenced but lacking foundational baseline implementation or metadata.

---

## 3. Shared Technical Contract Inventory

### Contract Area 1: Canonical Graph Payload & Node/Edge Schema
- **Status Classification**: `DOCUMENTED_AND_REFERENCED`
- **Source Documents**:
  - `docs/audits/salesforce-parallel-migration/phase-0/PARALLEL_MIGRATION_CONTRACTS.md`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
  - `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs`
- **Affected Workstreams / Tasks**: All Workstreams (A, B, C, D, E) & Tasks (`W5-1..6`, `W6-1..4`, `W7-1..2`, `W8-1..3`, `W9-1..3`, `INT-1`)
- **Contract Boundary**: The `@api activeGraphPayload` passed from `daAppShell` into child analytical views contains `{ nodes: Array<Node>, edges: Array<Edge>, metadata: Object }`.
- **Decisions Still Needed in Phase A3**:
  1. Confirm exact standard properties on `Node.data` (e.g. `id`, `label`, `type`, `layer`, `namespace`, `coverageDensity`, `cyclomaticComplexity`, `metrics`).
  2. Ratify whether immutable graph freeze (`Object.freeze`) is enforced at the `daAppShell` boundary to prevent child components from mutating parent state.

---

### Contract Area 2: Layout Identifiers & Layout Engine Configuration
- **Status Classification**: `DOCUMENTED_AND_REFERENCED`
- **Source Documents**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
- **Affected Workstreams / Tasks**: Workstream A (`W5-1`, `W5-2`, `W5-3`)
- **Contract Boundary**: Cytoscape and algorithmic layout dispatchers: `grid`, `circle`, `breadthfirst`, `dagre`, `orbit`, `constellation`, `sankey`.
- **Decisions Still Needed in Phase A3**:
  1. Confirm configuration parameter dictionaries passed into `computeOrbitLayout` (radii, center node calculation) and `computeConstellationLayout`.
  2. Finalize fallback layout behavior when graph payload contains disconnected subgraphs or singleton nodes.

---

### Contract Area 3: Radar 9-Dimension Architecture Adapter
- **Status Classification**: `DOCUMENTED_REQUIRING_CONFIRMATION`
- **Source Documents**:
  - `explorer/src/lib/adapters/radar-adapter.ts`
  - `explorer/src/components/RadarPanel.tsx`
  - `docs/audits/salesforce-migration-gap-audit/`
- **Affected Workstreams / Tasks**: Workstream B (`W6-1`)
- **Contract Boundary**: The Radar chart computes architectural scores across 9 canonical dimensions rather than the historical 5-metric assumption.
- **Decisions Still Needed in Phase A3**:
  1. Formally ratify the 9 dimensions: Coupling, Instability, Abstraction, Distance from Main Sequence, Cycle Participation, Unassigned Ratio, Test Coverage Density, Complexity, and Component Density.
  2. Confirm normalization algorithm: 0.0 to 1.0 bounding scale across all 9 axes.
  3. Reconcile differences between React explorer implementation and LWC SVG renderer.

---

### Contract Area 4: Historical Analysis Run Identity & DTO (Contract A Zero-Schema)
- **Status Classification**: `DOCUMENTED_AND_REFERENCED`
- **Source Documents**:
  - `docs/audits/salesforce-parallel-migration/phase-0/PARALLEL_MIGRATION_CONTRACTS.md` (Contract A)
  - `scratch/salesforce-poc/force-app/main/default/objects/DA_Analysis_Run__c/`
- **Affected Workstreams / Tasks**: Workstream C (`W7-P1`, `W7-3`), Workstream D (`W8-3`)
- **Contract Boundary**: Apex controller `DAAnalysisHistoryController.getAnalysisRuns(Id projectId, Integer queryLimit)` returning `List<AnalysisRunDTO>`.
- **Decisions Still Needed in Phase A3**:
  1. Confirm exact fields on `AnalysisRunDTO`: `runId`, `runName`, `createdDate`, `createdByName`, `projectId`.
  2. Confirm handling of zero-schema limitation: `DA_Analysis_Run__c` on disk only contains `DA_Project__c` lookup; verify that fields `Status__c`, `Metrics_JSON__c`, and `Analysis_Timestamp__c` are simulated or derived without custom field metadata deployments.
  3. Confirm default `queryLimit` (e.g. 20, max 100).

---

### Contract Area 5: Dual-Snapshot Retrieval & Diff Engine Contract
- **Status Classification**: `DOCUMENTED_REQUIRING_CONFIRMATION`
- **Source Documents**:
  - `docs/audits/salesforce-parallel-migration/phase-0/PARALLEL_MIGRATION_CONTRACTS.md`
  - `WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv` (Row W8-2, W8-3)
- **Affected Workstreams / Tasks**: Workstream D (`W8-2`, `W8-3`)
- **Contract Boundary**: The diff utility `daDiffEngine.computeDiff(snapshotA, snapshotB)` returning:
  ```json
  {
    "nodes": { "added": [], "removed": [], "modified": [], "unchanged": [] },
    "edges": { "added": [], "removed": [], "modified": [], "unchanged": [] },
    "summary": { "addedNodesCount": 0, "removedNodesCount": 0, "deltaCycles": 0 }
  }
  ```
- **Decisions Still Needed in Phase A3**:
  1. Ratify property-level change detection keys on nodes (e.g. layer shift, metric shifts).
  2. Determine maximum payload chunk size (10MB/20MB) and streaming/chunking API contract for dual snapshot retrieval in pure client memory.

---

### Contract Area 6: Investigation Drawer Selection Event DTO
- **Status Classification**: `DOCUMENTED_AND_REFERENCED`
- **Source Documents**:
  - `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
- **Affected Workstreams / Tasks**: Workstream D (`W8-1`), Workstream A (`daGraphViewer`), Workstream B (`daTreemapView`, `daHotspotsView`)
- **Contract Boundary**: Custom event `nodeselect` or `selectionchange` carrying `{ detail: { nodeId: string, selected: boolean, meta: Object } }`.
- **Decisions Still Needed in Phase A3**:
  1. Ratify standard event payload structure dispatched by visual components when a node is clicked.
  2. Clarify interaction model: does `daInvestigationDrawer` receive node selection through `daAppShell` parent coordination, or as an embedded child of specific view containers?

---

### Contract Area 7: Refactoring Action DTOs & Simulation Operations
- **Status Classification**: `INCOMPLETE_ASSIGNED_TO_PHASE_A3`
- **Source Documents**:
  - `WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv` (Row W9-1, W9-2, W9-3)
- **Affected Workstreams / Tasks**: Workstream E (`W9-1`, `W9-2`, `W9-3`)
- **Contract Boundary**: The pure-math refactoring simulation engine supporting:
  - `extractClass(sourceNodeId, newClassName, movedMethodList)`
  - `moveMethod(methodId, sourceNodeId, targetNodeId)`
  - `breakCycle(edgeIdToSever, substitutionStrategy)`
- **Decisions Still Needed in Phase A3**:
  1. Define the formal TypeScript/JSDoc interface for each refactoring operation action object.
  2. Define the output format of the refactoring delta summary (`cyclesEliminated`, `couplingDelta`, `layerViolationsResolved`).
  3. Define the JSON schema for the Handoff Export modal (`W9-3`).

---

### Contract Area 8: Workspace Component Registration & Navigation Mount
- **Status Classification**: `DOCUMENTED_AND_REFERENCED`
- **Source Documents**:
  - `explorer/src/registry/workspace-registry.ts`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.html`
  - `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js`
- **Affected Workstreams / Tasks**: Coordinator (`INT-1`), All Workstreams (A, B, C, D, E)
- **Contract Boundary**: Tab navigation structure inside `daAppShell`. Existing approved tabs: `graph`, `matrix`, `findings`.
- **Decisions Still Needed in Phase A3**:
  1. Finalize tab bar layout and naming for Wave 6–9 components (`radar`, `treemap`, `subway`, `hotspots`, `diagnostics`, `history`, `compare`, `simulation`).
  2. Confirm lazy-loading / conditional DOM mounting strategy (`if:true={isRadarActive}`) to prevent heavy offscreen canvas rendering.

---

### Contract Area 9: Shared State & Immutable Graph Invariants (`SELECTION != NAVIGATION`)
- **Status Classification**: `DOCUMENTED_AND_REFERENCED`
- **Source Documents**:
  - `docs/audits/salesforce-parallel-migration/phase-0/PARALLEL_MIGRATION_CONTRACTS.md`
  - Baseline test suites (`scratch/salesforce-poc/tests/`)
- **Affected Workstreams / Tasks**: All Workstreams (A, B, C, D, E) & Coordinator (`INT-1`)
- **Contract Boundary**:
  - **Invariant 1**: `SELECTION != NAVIGATION`. Selecting a node for inspection (e.g. In drawer or graph) MUST NOT trigger project navigation, view switching, or filter clearing.
  - **Invariant 2**: View components are read-only consumers of `activeGraphPayload`. Components MUST NOT mutate graph node objects in-place.
- **Decisions Still Needed in Phase A3**:
  1. Formalize unit test assertion utilities in task test runners to verify immutability and invariant adherence.

---

## 4. Phase A3 Action Items & Routing
1. **Contract A History API Schema**: Workstream C & Coordinator must sign off on `AnalysisRunDTO` zero-schema structure.
2. **Refactoring Engine Schemas**: Workstream E Lead must draft operation signatures for `W9-1`.
3. **9-Dimension Radar Formulae**: Workstream B Lead must document mathematical equations for the 9 radar metrics.
4. **Frozen Payload Fixture**: Integration Coordinator must supply a standardized `sample-graph-payload.json` test fixture for all workstream runners.
