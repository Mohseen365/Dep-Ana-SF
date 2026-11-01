# Wave 0.4: Canonical Payload and Component API Closure (Workstream E)

## 1. Problem Formulation & Defect Analysis

Wave 0.3 presented two contract ambiguities:
1. **Canonical `edges` Property Ambiguity:**
   In some sections, `edges` was marked required; in others, optional. In `daGraphPayloadLoader.js`, line 88 checks `(parsed.edges === undefined || Array.isArray(parsed.edges))`, indicating that payloads lacking an `edges` key are parseable envelopes.
2. **Generic Analytical Component API Assumption:**
   Wave 0.3 suggested a uniform component interface (`projectId`, `graphPayload`, `filterCriteria`, `selectedNodeId`, `readOnly`) across all views. However, utility modules (like `daDiffEngine`, `daRefactoringEngine`), standalone timeline components (like `daAnalysisHistoryView`), and modal dialogs (like `daRefactorHandoffModal`) have unique, specialized API signatures. Imposing generic attributes creates phantom properties and unused bindings.

---

## 2. Authoritative Resolution of Canonical `edges` Behavior

### Evaluation of Options:
- **Option A (Chosen & Enforced): Canonical Normalization to Array (`edges: []`)**
  When payloads are produced or parsed by `daGraphPayloadLoader.js` / `daAppShell`, missing or undefined `edges` must be normalized to an empty array `[]` before the payload is published to downstream components.
  - **Technical Justification:** Analytical components (`daRadarView`, `daMatrixView`, `daSubwayView`, `daTreemapView`, `daRefactoringEngine`) perform operations like `payload.edges.forEach(...)` or `.filter(...)`. Normalizing `edges` to `[]` guarantees that views will never throw `TypeError: Cannot read properties of undefined (reading 'forEach')`.
- **Option B (Rejected):** Leaving `edges` undefined and requiring every individual view to perform defensive guards (`payload.edges || []`) increases code duplication and failure surface area.

### Authoritative Canonical Graph Payload Schema (`CanonicalGraphPayload`):
- `nodes: CanonicalGraphNode[]` (Required, non-empty array of objects with string `id`)
- `edges: CanonicalGraphEdge[]` (Required normalized array, may be `[]`, elements have string `source` and `target`)
- `projectId?: string`
- `projectKey?: string`
- `projectName?: string`
- `runId?: string`
- `timestamp?: string` (ISO 8601 string)
- `metadata?: Record<string, any>`
- `cycles?: string[][]` (Array of node ID cycles)
- `hotspots?: any[]` (Precomputed hotspot metrics)
- `unresolvedReferences?: any[]`
- `stages?: any[]` (Sankey layout stages)
- `rings?: any[]` (Orbit/Constellation layout rings)

**Surrogate Safety & Payload Immutability:**
- Payload chunks must be split along UTF-16 code unit boundaries using `chunkPayload()` in `daGraphPayloadLoader.js` to ensure surrogate pairs (D800–DBFF) are never bisected.
- The payload passed to child views is strictly read-only. Views must never mutate `nodes` or `edges` in place. Any view-level calculations (e.g. simulation in `daRefactoringView`) must operate on shallow copies or cloned structures.

---

## 3. Component-Specific Public API Contracts

We define the exact, exhaustive `@api` properties, parent template attribute names, and events for all planned components:

### 3.1 Wave 6 Analytical Views (Workstream B)

#### `daRadarView` (Task W6-1)
- **Purpose:** Multi-axial radar chart showing architectural metrics (e.g. cyclomatic complexity, coupling, cohesion, test coverage).
- **Public Properties (`@api`):**
  - `@api graphPayload` (Object, default `null`, required for rendering)
  - `@api selectedNodeId` (String, default `null`, optional)
  - `@api readOnly` (Boolean, default `true`)
- **Parent Template Attributes:** `graph-payload={activeGraphPayload}`, `selected-node-id={selectedNodeId}`, `read-only`
- **Events Dispatched:**
  - `nodeselect`: Detail `{ nodeId: String }`. **Invariant:** Modifies selection state in parent; does NOT trigger view navigation (`SELECTION != NAVIGATION`).

#### `daTreemapView` (Task W6-2)
- **Purpose:** Nested treemap visualizer displaying component hierarchy, file sizes, and layer boundaries.
- **Public Properties (`@api`):**
  - `@api graphPayload` (Object, default `null`, required)
  - `@api selectedNodeId` (String, default `null`, optional)
- **Parent Template Attributes:** `graph-payload={activeGraphPayload}`, `selected-node-id={selectedNodeId}`
- **Events Dispatched:**
  - `nodeselect`: Detail `{ nodeId: String }`. Preserves selection invariant.

#### `daSubwayView` (Task W6-3)
- **Purpose:** Metro-style transit map showing dependency routes and execution flows between layers.
- **Public Properties (`@api`):**
  - `@api graphPayload` (Object, default `null`, required)
  - `@api selectedNodeId` (String, default `null`, optional)
- **Parent Template Attributes:** `graph-payload={activeGraphPayload}`, `selected-node-id={selectedNodeId}`
- **Events Dispatched:**
  - `nodeselect`: Detail `{ nodeId: String }`. Preserves selection invariant.

#### `daHotspotsView` (Task W6-4)
- **Purpose:** Risk matrix and hotspot visualizer highlighting high-churn, high-dependency components.
- **Public Properties (`@api`):**
  - `@api graphPayload` (Object, default `null`, required)
  - `@api selectedNodeId` (String, default `null`, optional)
- **Parent Template Attributes:** `graph-payload={activeGraphPayload}`, `selected-node-id={selectedNodeId}`
- **Events Dispatched:**
  - `nodeselect`: Detail `{ nodeId: String }`. Preserves selection invariant.

---

### 3.2 Wave 7 Scorecards, Barcode & History Views (Workstream C)

#### `daDiagnosticsView` (Task W7-1)
- **Purpose:** System health scorecard displaying cycle counts, orphan components, and coverage metrics.
- **Public Properties (`@api`):**
  - `@api graphPayload` (Object, default `null`, required)
  - `@api projectId` (String, default `null`, optional)
- **Parent Template Attributes:** `graph-payload={activeGraphPayload}`, `project-id={activeProjectId}`
- **Events Dispatched:** None (Pure informational display).

#### `daArchitectureDnaBarcode` (Task W7-2)
- **Purpose:** Visual barcode strip encoding system risk, layer composition, and test coverage density.
- **Public Properties (`@api`):**
  - `@api graphPayload` (Object, default `null`, required)
- **Parent Template Attributes:** `graph-payload={activeGraphPayload}`
- **Events Dispatched:**
  - `bandselect`: Detail `{ bandType: String, nodeIds: String[] }`. Preserves selection invariant.

#### `daAnalysisHistoryView` (Task W7-3)
- **Purpose:** Chronological timeline of historical analysis runs for the active project.
- **Public Properties (`@api`):**
  - `@api projectId` (String, default `null`, required)
- **Parent Template Attributes:** `project-id={activeProjectId}`
- **Events Dispatched:**
  - `runselect`: Detail `{ runId: String, runName: String, createdDate: String }`. Dispatched when user selects a historical run.

---

### 3.3 Wave 8 Investigation Drawer & Compare Views (Workstream D)

#### `daInvestigationDrawer` (Task W8-1)
- **Purpose:** Slide-out inspection drawer displaying in-depth metadata, inbound/outbound dependencies, and annotations for the selected node.
- **Public Properties (`@api`):**
  - `@api isOpen` (Boolean, default `false`)
  - `@api selectedNodeId` (String, default `null`)
  - `@api graphPayload` (Object, default `null`)
  - `@api projectId` (String, default `null`)
- **Parent Template Attributes:** `is-open={isDrawerOpen}`, `selected-node-id={selectedNodeId}`, `graph-payload={activeGraphPayload}`, `project-id={activeProjectId}`
- **Events Dispatched:**
  - `close`: Detail `{}` (Closes drawer).
  - `annotationchange`: Detail `{ nodeId: String, annotation: Object }`.

#### `daDiffEngine` (Task W8-2)
- **Purpose:** Pure JavaScript computation utility module comparing Run A and Run B payloads.
- **Exported Functions:**
  - `computeGraphDiff(payloadA, payloadB)`: Returns `{ addedNodes: [], removedNodes: [], modifiedNodes: [], addedEdges: [], removedEdges: [], summary: {} }`.
- **Properties / Events:** Utility module (no template or LWC `@api` DOM properties).

#### `daCompareView` (Task W8-3)
- **Purpose:** Dual-snapshot comparison visualizer comparing historical runs.
- **Public Properties (`@api`):**
  - `@api projectId` (String, default `null`, required)
- **Parent Template Attributes:** `project-id={activeProjectId}`
- **Events Dispatched:**
  - `diffselect`: Detail `{ diffType: String, elementId: String }`. Preserves selection invariant.

---

### 3.4 Wave 9 Refactoring Engine & Views (Workstream E)

#### `daRefactoringEngine` (Task W9-1)
- **Purpose:** Pure in-memory topological math engine simulating refactoring operations (extract class, move method, break cycles). Zero Dagre dependency.
- **Exported Functions:**
  - `simulateExtractClass(payload, sourceNodeId, newClassName, movedMethods)`
  - `simulateMoveDependency(payload, sourceEdgeId, newTargetId)`
  - `simulateBreakCycle(payload, cycleNodeIds)`
- **Properties / Events:** Pure JS module (no DOM `@api`).

#### `daRefactoringView` (Task W9-2)
- **Purpose:** Interactive refactoring sandbox with step-by-step hypothetical rollback and delta metrics.
- **Public Properties (`@api`):**
  - `@api graphPayload` (Object, default `null`, required)
- **Parent Template Attributes:** `graph-payload={activeGraphPayload}`
- **Events Dispatched:**
  - `openhandoff`: Detail `{ planSteps: Array, deltaMetrics: Object }`. Opens modal.

#### `daRefactorHandoffModal` (Task W9-3)
- **Purpose:** Modal dialog exporting planned refactoring actions as Markdown / JSON.
- **Public Properties (`@api`):**
  - `@api isOpen` (Boolean, default `false`)
  - `@api refactorPlan` (Array, default `[]`)
- **Parent Template Attributes:** `is-open={isModalOpen}`, `refactor-plan={activeRefactorPlan}`
- **Events Dispatched:**
  - `close`: Detail `{}`.
