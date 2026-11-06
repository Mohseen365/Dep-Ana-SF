# Contract 01: Canonical Graph Payload & Node/Edge Schema

## 1. Document Control & Identification
- **Contract ID**: `CONTRACT-01`
- **Contract Name**: Canonical Graph Payload & Node/Edge Schema
- **Version**: `1.0.0`
- **Status**: `FROZEN`
- **Purpose**: Defines the authoritative, immutable client-side graph payload data structure shared across all analytical views, graph viewers, diff utilities, and refactoring engines.
- **Affected Tasks**: `W5-1..6`, `W6-1..4`, `W7-1..2`, `W8-1..3`, `W9-1..3`, `INT-1`
- **Affected Workstreams**: Workstream A, Workstream B, Workstream C, Workstream D, Workstream E, and Integration Coordinator

---

## 2. Source-of-Truth References
1. `docs/audits/salesforce-parallel-migration/phase-0/WAVE_0_SHARED_ARCHITECTURAL_CONTRACTS.md` (Section 2, Contract W0-C1 Canonical Graph Data Model).
2. `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` (Lines 77–88: `@api activeProjectId`, `@api activeProjectKey`, and `activeGraphPayload` handling).
3. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js` (Payload reassembly, chunk ordering, validation).
4. `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` (Graph filtering assertions, node/edge structure).
5. `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js` (Canonical node attribute predicates: `matchesNodeFilter`).

---

## 3. Top-Level Payload Schema

The graph payload provided by `daAppShell` via `@api payload` or `@api activeGraphPayload` has the following top-level TypeScript definition:

```typescript
export interface CanonicalGraphPayload {
  /**
   * Complete collection of vertices/nodes within the analyzed architecture graph.
   * Guaranteed deterministic ordering: sorted lexicographically by node.id ASC.
   */
  nodes: CanonicalGraphNode[];

  /**
   * Complete collection of directed dependency edges connecting vertices.
   * Guaranteed deterministic ordering: sorted lexicographically by edge.id ASC.
   */
  edges: CanonicalGraphEdge[];

  /**
   * Optional project-level summary metrics, metadata, and cycle catalogs.
   */
  metadata?: CanonicalGraphMetadata;

  /**
   * Optional cycle groups detected during architectural analysis.
   */
  cycles?: CanonicalGraphCycle[];

  /**
   * Optional summary statistics block.
   */
  summary?: CanonicalGraphSummary;
}
```

---

## 4. Node Object Schema

Each node in `nodes` represents a distinct architectural entity (Apex class, trigger, LWC, custom object, flow, etc.):

```typescript
export interface CanonicalGraphNode {
  /**
   * Unique, immutable identifier of the node (Mandatory primary key).
   * Format standard: `<Type>.<NamespaceOptional><Name>`
   * Example: 'Class.AccountService', 'Object.Account', 'LWC.daGraphViewer'
   */
  id: string;

  /**
   * Human-readable label for rendering in graph nodes, cards, and tables.
   * If omitted, consumers fall back to id.
   */
  label?: string;

  /**
   * Technical name of the component without type prefix.
   */
  name?: string;

  /**
   * Architectural artifact type.
   * Allowed canonical types: 'ApexClass' | 'ApexTrigger' | 'CustomObject' | 'LightningComponentBundle' | 'Flow' | 'External'
   */
  type: string;

  /**
   * Architectural layer assignment.
   * Allowed canonical layers: 'UI' | 'Service' | 'Domain' | 'Selector' | 'Data' | 'Integration' | 'Utility' | 'Unassigned'
   */
  layer: string;

  /**
   * Package or Salesforce namespace. Empty string or 'c' indicates default namespace.
   */
  namespace?: string;

  /**
   * Canonical test coverage evidence state.
   * MUST be one of: 'COVERED' | 'UNTESTED' | 'AMBIGUOUS' | 'UNKNOWN'
   * Note: 'ALL' and 'NO_TESTS' are presentation filters, not canonical evidence states.
   */
  coverageStatus?: 'COVERED' | 'UNTESTED' | 'AMBIGUOUS' | 'UNKNOWN';

  /**
   * Numeric test coverage percentage (0.0 to 1.0 or 0 to 100), when available.
   * Null or undefined if untested/unknown.
   */
  coverageDensity?: number;

  /**
   * Architectural risk classification.
   * Allowed canonical values: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
   */
  risk?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

  /**
   * Architectural coupling score (sum of fanIn + fanOut or incoming/outgoing references).
   * Non-negative integer.
   */
  coupling?: number;

  /**
   * Inbound dependency count (number of other components depending on this node).
   */
  fanIn?: number;

  /**
   * Outbound dependency count (number of components this node depends on).
   */
  fanOut?: number;

  /**
   * Cyclomatic or architectural complexity score.
   */
  cyclomaticComplexity?: number;

  /**
   * Physical or logical lines of code.
   */
  loc?: number;

  /**
   * Flag indicating whether this node is involved in one or more circular dependency cycles.
   */
  hasCycle?: boolean;

  /**
   * Optional layout coordinates for persistence/rendering.
   */
  position?: {
    x: number;
    y: number;
  };

  /**
   * Extensible dictionary for specialized task-specific attributes.
   * Prohibited: mutating this object in place during view execution.
   */
  metadata?: Record<string, any>;
}
```

---

## 5. Edge Object Schema

Each edge in `edges` represents a directed dependency relationship from a `source` node to a `target` node:

```typescript
export interface CanonicalGraphEdge {
  /**
   * Unique, immutable identifier of the edge (Mandatory).
   * Recommended canonical format: `${source}->${target}` or `${source}->${target}:${type}`
   * Example: 'Class.AccountService->Class.AccountSelector'
   */
  id: string;

  /**
   * Identifier of the source node (the dependent / caller).
   */
  source: string;

  /**
   * Identifier of the target node (the dependency / callee).
   */
  target: string;

  /**
   * Dependency invocation or relationship type.
   * Canonical values: 'calls' | 'references' | 'extends' | 'implements' | 'instantiates' | 'contains'
   */
  type?: string;

  /**
   * Edge weight representing invocation frequency or coupling strength.
   * Default: 1.0.
   */
  weight?: number;

  /**
   * True if target node is missing from payload nodes[] (unresolved reference).
   */
  isUnresolved?: boolean;

  /**
   * Inferred target type if target is unresolved (e.g. System, External).
   */
  targetType?: string;
}
```

---

## 6. Metadata and Summary Schema

```typescript
export interface CanonicalGraphMetadata {
  schemaVersion: string; // e.g. "2.0.0"
  projectId: string;
  projectKey: string;
  runId?: string;
  timestamp?: string;
  totalChunks?: number;
  [key: string]: any;
}

export interface CanonicalGraphSummary {
  nodeCount: number;
  edgeCount: number;
  cycleCount: number;
  unresolvedCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount?: number;
  architectureHealthScore?: number;
}

export interface CanonicalGraphCycle {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  length: number;
}
```

---

## 7. Immutability, Freezing, and Boundary Rules

1. **Consumer Immutability Contract**:
   - Child analytical views (`daGraphViewer`, `daMatrixView`, `daFindingsView`, `daRadarView`, `daTreemapView`, `daSubwayView`, `daHotspotsView`, `daDiagnosticsView`, `daCompareView`, `daRefactoringView`) are **strictly read-only consumers** of `activeGraphPayload`.
   - Child components **MUST NOT** mutate `payload.nodes`, `payload.edges`, or any nested node/edge objects in place (e.g. assigning `node.selected = true` or `node.position.x = 100` on the passed object).
2. **Defensive Copies vs Object.freeze**:
   - `daAppShell` passes the payload to children. Because shallow `Object.freeze()` only freezes the array pointers (`nodes`, `edges`) and not the individual object properties, and recursive deep freezing introduces non-trivial runtime overhead on large graphs (e.g., 5,000+ nodes), the architectural contract enforces:
     - The shell may apply shallow `Object.freeze()` to `payload.nodes` and `payload.edges` in test harnesses.
     - View components requiring local modifications (e.g., decorating nodes with Cytoscape visual states, pinning flags, or layout positions) **MUST create shallow copies or store local state in separate Maps/Sets** (e.g., `selectedNodeIds = new Set()`).
3. **SELECTION != NAVIGATION Invariant**:
   - Selecting a node within any view MUST NOT mutate `payload`, MUST NOT clear active filters, MUST NOT change active projects, and MUST NOT switch active tabs.

---

## 8. Missing, Null, and Edge-Case Handling

1. **Empty Payload**:
   - An empty graph is represented as `{ nodes: [], edges: [], metadata: { schemaVersion: "2.0.0" } }`.
   - All consumer views must render their designated empty-state UI without throwing unhandled exceptions.
2. **Null/Undefined Input**:
   - If `@api payload` is `null` or `undefined`, views must render a loading spinner or empty illustration and cleanly guard against property access (`payload?.nodes || []`).
3. **Unresolved Edges**:
   - If an edge references a `target` that does not exist in `nodes`, the edge must have `isUnresolved: true`. Analytical views must account for unresolved targets without crashing.
4. **Missing Numerical Values**:
   - `coverageDensity`, `cyclomaticComplexity`, `coupling`, `loc`: If missing or undefined, defaults to `0` or `null` as specified by each view's metric parser, but must never be treated as NaN.
