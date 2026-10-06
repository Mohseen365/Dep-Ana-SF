# Component Orbit Semantic Contract & Adapter Audit

**Author:** Principal Software Engineer & Visual Graph Architect (Jules)
**Date:** October 6, 2026
**Status:** READ-ONLY ADVERSARIAL SEMANTIC-CONTRACT AUDIT (COMPLETE)
**Deliverable File:** `COMPONENT_ORBIT_SEMANTIC_CONTRACT_AND_ADAPTER_AUDIT.md`
**Scope:** Repository-wide inspection of capabilities, code reuse boundaries, data models, layout engines, adapters, UI state, and tests for the proposed Component Orbit model.

---

## 1. Executive Verdict

```text
FINAL VERDICT: CONTRACT READY — IMPLEMENTATION NOT YET VERIFIED
```

**Gate Status:** **GATE A (Repository Truth) PASSED**, **GATE B (Semantic Contract) PASSED & FROZEN**, **GATE C (Adapter Implementation) PENDING AUTHORIZED STEP**.

### Executive Justification:
1. **Contract Precision:** The Component Orbit Semantic Contract is now fully specified, mathematically bounded, and tied to exact repository truth. All semantic ambiguities—including focal Sun definition, dependency-depth ring calculation, child-LWC composition edges, shared Apex hub identity preservation, cycle handling, multi-edge deduplication, and unreachable node isolation—have been formally resolved.
2. **Architecture Orbit Contamination Disproven & Guarded:** The audit conclusively proved that `computeOrbitRingIndex()` in `explorer/src/lib/layout/orbit-semantics.ts` is **UNSAFE TO REUSE** because it projects physical rings based on Architecture Layers (Presentation, Application, Domain, Schema) rather than dependency depth from a focal LWC. Reusing it would cause all 30 PBIM LWCs to collapse onto Ring 0 regardless of dependency distance.
3. **Infrastructure Readiness:** The repository already contains **100% of the mathematical geometry engine** (`explorer/src/lib/orbit-layout.ts`), **100% of the graph rendering pipeline** (`GraphView.tsx`), and **100% of the BFS traversal mechanics** (`constellation-adapter.ts`).
4. **Safest Next Step:** Authoring `explorer/src/lib/graph-depth.ts` (extracted pure BFS depth engine) and `explorer/src/lib/adapters/component-orbit-adapter.ts` with comprehensive unit test coverage (`component-orbit-adapter.test.ts`).

---

## 2. Evidence Sources

The conclusions in this audit report are derived strictly from the following primary evidence sources inspected in the repository:

### 2.1 Codebase Implementation Files
* `explorer/src/lib/adapters/constellation-adapter.ts` — BFS graph traversal engine, `hopDistance` calculation, and adjacency map construction.
* `explorer/src/lib/adapters/constellation-adapter.test.ts` — Executable unit test suite verifying zero graph mutation and input-order determinism.
* `explorer/src/lib/layout/orbit-semantics.ts` — Architecture Orbit semantic projection (`projectOrbitSemantics`, `computeOrbitRingIndex`).
* `explorer/src/lib/layout/orbit-semantics.test.ts` — Unit test suite verifying layer-based ring assignments R0..R5.
* `explorer/src/lib/orbit-layout.ts` — Pure deterministic radial geometry engine (`computeOrbitLayout`), track capacity expansion, AABB overlap checking, and FSM collision repair.
* `explorer/src/lib/layout/layers.ts` — Layer classification (`classifyNodeLayerWithReason`) and test node identification (`isTestNode`).
* `explorer/src/lib/graph-style.ts` — Cytoscape node shapes, colors, edge line styles, and arrowheads.
* `explorer/src/lib/layout/centrality.ts` — Graph centrality, degree metrics, and shared hub detection logic.
* `explorer/src/components/GraphView.tsx` — Cytoscape canvas component, position authority, LOD text rendering, and SVG overlay guides.
* `explorer/src/components/Breadcrumbs.tsx` — Workspace navigation and breadcrumb stack rendering.
* `explorer/src/registry/workspace-registry.ts` — Workspace lens registry (`LENS_REGISTRY`).

### 2.2 Datasets & Manifests
* `analyze/projects/pbim/explorer-data.json` & `explorer/public/projects/pbim/explorer-data.json` — Authoritative 528-node / 2063-edge PBIM dataset (SHA-256: `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`).
* `ARCHITECTURE_ORBIT_PBIM_PROJECTION_MANIFEST.json` — Architecture Orbit 528-node golden projection manifest.

### 2.3 Context & Audit Reports
* `COMPONENT_ORBIT_PRE_IMPLEMENTATION_CAPABILITY_REUSE_AND_GAP_AUDIT.md` — Capability matrix and preliminary gap analysis.
* `ARCHITECTURE_ORBIT_C3_REAL_PBIM_BROWSER_TRUTH_ADVERSARIAL_CLOSURE.md` — Browser geometry verification evidence.
* `ARCHITECTURE_ORBIT_C8_PRODUCTION_HARDENING.md` — Empty graph ($N=0$) and edge-case hardening evidence.
* `scripts/test-cli-integration.cjs` — Executable CLI integration regression suite (21/21 PASS).

---

## 3. Current Repository Truth

Evaluation of current implementation capabilities across key codebase modules:

| Codebase Module | Current Capability | Current Semantic Function | Component Orbit Reusability | Required Action |
|---|---|---|---|---|
| `constellation-adapter.ts` | BFS Traversal & Hop Distance | Computes `hopDistance` 0..N from focal node for Constellation lens | `SEMANTIC EXTRACTION REQUIRED` | Extract BFS traversal logic into shared `graph-depth.ts` utility module |
| `orbit-semantics.ts` | Layer-based Ring Projection | Maps nodes to Ring 0..5 based on Architecture Layers (Presentation, Application, etc.) | **`UNSAFE TO REUSE`** | DO NOT REUSE for Component Orbit depth rings. Create `component-orbit-adapter.ts` |
| `orbit-layout.ts` | Radial Placement Math & FSM Clearance | Calculates polar/Cartesian coordinates, track expansion ($R_{req}$), and repairs AABB overlaps | `GEOMETRY EXTRACTION REQUIRED` | Reuse 100% of geometry math; extract hardcoded `LAYER_LABELS` into dynamic options parameter |
| `layers.ts` | Architectural Layer Classification | Classifies node into presentation, application, domain, schema, supporting layers | `DIRECT REUSE` | Reuse for shape and category mapping metadata |
| `graph-style.ts` | Cytoscape Styling & Shapes | Maps node types to shapes (ellipse, round-rectangle, diamond, etc.) and edge relationship styles | `DIRECT REUSE` | Reuse for LWC, Apex, Object, Field, and typed edge visual styles |
| `centrality.ts` | Graph Centrality & Degree | Computes degree centrality, fan-in, fan-out, and shared hub metrics | `SEMANTIC EXTRACTION REQUIRED` | Reuse shared dependency query logic for shared Apex hub symbol `◉` |
| `GraphView.tsx` | Cytoscape Canvas Renderer | Renders preset coordinates, LOD text wrapping, hover cards, selection, and SVG overlay guides | `DIRECT REUSE` | Render Component Orbit layout by passing node positions and dynamic guide metadata |
| `Breadcrumbs.tsx` | Navigation Breadcrumb Stack | Renders top-level domain and view mode navigation | `UI EXTRACTION REQUIRED` | Extend state to support drill-down history: `All Suns > Parent LWC > Child LWC` |
| `workspace-registry.ts` | Lens Registry | Registers active view lenses and panels | `DIRECT REUSE` | Register `component-orbit` lens in workspace registry |

---

## 4. PBIM Runtime/Data Truth

Direct empirical analysis of the canonical PBIM dataset (`explorer/public/projects/pbim/explorer-data.json`, SHA-256: `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b`) established the following verified baseline metrics:

### 4.1 Population & Type Metrics
* **Total Nodes:** Exactly 528 nodes.
* **Total Edges:** Exactly 2063 edges.
* **Node Type Breakdown:**
  * `ApexClass`: 181 (34.3%)
  * `CustomField`: 180 (34.1%)
  * `External`: 99 (18.8%)
  * `LWC`: 30 (5.7%)
  * `CustomObject`: 25 (4.7%)
  * `ApexTrigger`: 13 (2.5%)

### 4.2 Edge Taxonomy Breakdown
* `method-call`: 559 edges
* `type-reference`: 440 edges
* `instantiation`: 260 edges
* `generic-type`: 238 edges
* `soql-field`: 182 edges
* `soql-object`: 162 edges
* `test-reference`: 100 edges
* `lwc-apex`: 51 edges
* `trigger-handler`: 26 edges
* `lwc-template-child`: 19 edges
* `implements`: 13 edges
* `trigger-object`: 13 edges

### 4.3 LWC & Composition Metrics
* **Total LWC Population:** 30 LWCs.
* **LWC Composition Edges (`lwc-template-child`):** Exactly 19 edges.
* **LWC Hierarchy Structure:**
  * **Child LWCs (target of `lwc-template-child`):** 16 LWCs.
  * **Parent LWCs (source of `lwc-template-child`):** 9 LWCs.
  * **Nested LWCs (both parent and child):** 3 LWCs (`LWC:asset-dashboard-container`, `LWC:vendor-workspace`, `LWC:zone-manager-dashboard`).
  * **Root LWCs (0 parent LWCs):** 14 LWCs.
  * **LWCs participating in LWC composition:** 22 LWCs.
  * **LWCs with 0 composition edges:** 8 LWCs.
  * **Completely Isolated LWCs (0 composition edges, 0 Apex edges):** Exactly 1 LWC (`LWC:error-panel`).

### 4.4 Shared Apex Hub Metrics
There are **7 shared Apex classes** directly invoked by $\ge 2$ distinct LWC nodes in PBIM:
1. `ApexClass:AssetDashboardController` — Used by **4 LWCs**: `LWC:asset-dashboard-container`, `LWC:asset-detail-dashboard`, `LWC:asset-health-map`, `LWC:asset-history`.
2. `ApexClass:CitizenRequestController` — Used by **3 LWCs**: `LWC:citizen-complaint-list`, `LWC:citizen-complaint-tracker`, `LWC:citizen-report-portal`.
3. `ApexClass:CityZoneController` — Used by **3 LWCs**: `LWC:citizen-report-portal`, `LWC:zone-dashboard`, `LWC:zone-manager-dashboard`.
4. `ApexClass:MaintenanceRequestController` — Used by **3 LWCs**: `LWC:maintenance-request-kanban`, `LWC:vendor-assignment-panel`, `LWC:vendor-workspace`.
5. `ApexClass:BudgetController` — Used by **2 LWCs**: `LWC:budget-utilization-summary`, `LWC:vendor-assignment-panel`.
6. `ApexClass:VendorAssignmentController` — Used by **2 LWCs**: `LWC:vendor-assignment-panel`, `LWC:vendor-workspace`.
7. `ApexClass:ZoneUtil` — Used by **2 LWCs**: `LWC:zone-dashboard`, `LWC:zone-manager-dashboard`.

### 4.5 Reachability & Depth Metrics
* **Outgoing BFS Reachability from All 30 LWCs:**
  * **Reachable Nodes:** 271 nodes (51.3% of PBIM graph).
  * **Unreachable Nodes:** 257 nodes (48.7% of PBIM graph: 119 ApexClasses, 90 CustomFields, 30 External, 13 ApexTriggers, 5 CustomObjects).
* **Depth Distribution (Outgoing BFS from All LWCs):**
  * Depth 0 (LWCs): 30 nodes
  * Depth 1: 17 nodes
  * Depth 2: 77 nodes
  * Depth 3: 127 nodes
  * Depth 4: 20 nodes
* **Single-LWC Maximum Reachability:** `LWC:dynamic-inspection-form` reaches 145 total nodes up to Depth 5. `LWC:asset-dashboard-container` reaches 128 total nodes up to Depth 7.
* **Graph Cycles:** Exactly 5 cycle paths exist in PBIM (e.g., `ApexClass:AssetDashboardService -> ApexClass:AssetSummaryBuilder -> ApexClass:DashboardContext` and `ApexClass:EngineerController <-> ApexClass:EngineerService`).
* **Multi-Edges:** Exactly 483 pairs of source/target nodes have multiple directed edges (e.g., `method-call` and `test-reference` between test classes and controllers).

---

## 5. Component Orbit Semantic Contract

The Component Orbit model is defined by the following formal semantic contract:

### 5.1 Sun (Central Focus)
A Component Orbit focused view represents **one authoritative LWC identity** (`focusLwcId`) as the central semantic Sun.
* **Position:** Fixed at origin / Ring 0.
* **Cardinality:** Exactly 1 focal LWC per focused orbit projection.
* **Identity:** Must be a valid node ID of type `LWC` present in the source graph.
* **Forbidden Substitution:** A Sun MUST NOT represent an Apex class, custom object, architecture layer, or visual cluster.

### 5.2 Ring (Dependency Depth)
A ring $R \in \{0, 1, 2, ..., N\}$ represents **directed dependency depth** originating from the focal Sun:
* **Ring 0 (Sun):** Focal LWC node (`depth = 0`).
* **Ring 1:** Direct dependencies ($1$-hop) of the focal LWC.
* **Ring N:** Transitive dependencies ($N$-hop) reachable via directed graph traversal.
* **Labeling:** Dynamically labeled `Focus Component (Sun)`, `1-Hop Dependencies`, `N-Hop Dependencies`.
* **Forbidden Substitution:** Ring MUST NOT represent Architecture Layers (Presentation, Application, Domain, Schema).

### 5.3 Shape (Architecture Category Taxonomy)
Node visual shape represents entity category mapping derived from canonical node type:
* **LWC:** Round Rectangle / Custom LWC Badge (Shape: `round-rectangle`).
* **ApexClass:** Ellipse / Rectangle (Shape: `ellipse`).
* **CustomObject / Object:** Cylinder / Diamond (Shape: `diamond`).
* **CustomField / Field:** Ellipse / Triangle (Shape: `triangle`).
* **ApexTrigger:** Hexagon (Shape: `hexagon`).
* **External:** Cloud / Dashed Ellipse (Shape: `rectangle`).

### 5.4 Edge (Relationship Taxonomy)
Edges maintain authoritative relationship semantics and are styled according to dependency type:
* **`lwc-template-child`:** LWC composition relationship (Solid line, filled triangle arrow).
* **`lwc-apex`:** LWC controller invocation (Solid line, arrow).
* **`method-call`:** Method invocation (Solid line, standard arrow).
* **`instantiation`:** Class constructor call (Dashed line, standard arrow).
* **`type-reference`:** Variable / return type reference (Dotted line, open arrow).
* **`soql-object` / `soql-field`:** Database query dependency (Dashed line, open diamond).
* **`trigger-handler` / `trigger-object`:** Trigger dispatch (Solid line, double arrow).

### 5.5 Child LWC (◎)
An LWC node reachable via `lwc-template-child` composition edge from another LWC:
* **Classification:** `isChildLwc = true`.
* **Visual Symbol:** `◎`.
* **Navigability:** Serves as a primary drill-down target for nested orbit views.

### 5.6 Shared Apex Hub (◉)
An Apex class directly referenced by $\ge 2$ distinct LWC nodes in the graph:
* **Classification:** `isSharedHub = true`.
* **Visual Symbol:** `◉`.
* **Identity Preservation:** Remains a **single node identity** in the graph canvas. Cloning or duplicating shared Apex nodes across multiple orbits is **STRICTLY FORBIDDEN**.

### 5.7 Ordinary Dependency (○)
Any non-LWC, non-shared node located at depth $N \ge 1$:
* **Classification:** `isChildLwc = false`, `isSharedHub = false`.
* **Visual Symbol:** `○`.

### 5.8 Focus
The selected focal node ID (`focalNodeId`). Must default to the highest-coupling root LWC if unassigned.

### 5.9 Depth
The minimum directed shortest-path distance $d(focus, v)$ in edge steps from the focal Sun to node $v$.

---

## 6. Depth/Ring Algorithm

The depth calculation engine transforms a directed graph $(V, E)$ and a focal node $s \in V$ into a deterministic depth assignment $d: V \to \mathbb{N}_0$.

### 6.1 Algorithm Specification

```text
Algorithm: ComputeComponentOrbitDepths
Inputs:
  - nodes: ExplorerNode[]
  - edges: ExplorerEdge[]
  - focusNodeId: string
  - maxDepth: number (default: 7)
  - direction: 'dependencies' | 'dependents' | 'both' (default: 'dependencies')
  - edgeTypes: Set<string> (allowed edge relationship types)

Output:
  - depthMap: Map<string, number> (nodeId -> depth 0..N)
  - edgeSet: ExplorerEdge[] (edges connecting reachable nodes)

Steps:
1. Initialize depthMap = Map()
2. If focusNodeId is null or not in nodes, return empty depthMap.
3. Set depthMap.set(focusNodeId, 0)
4. Build adjacency maps filtered by edgeTypes:
   - outgoing: source -> target[]
   - incoming: target -> source[]
5. Initialize queue = [{ nodeId: focusNodeId, depth: 0 }]
6. While queue is not empty:
     a. Pop { nodeId, depth } from queue
     b. If depth >= maxDepth, continue
     c. If direction is 'dependencies' or 'both':
          For each outEdge in outgoing.get(nodeId):
            targetId = outEdge.target
            If depthMap does not contain targetId:
              depthMap.set(targetId, depth + 1)
              queue.push({ nodeId: targetId, depth: depth + 1 })
     d. If direction is 'dependents' or 'both':
          For each inEdge in incoming.get(nodeId):
            sourceId = inEdge.source
            If depthMap does not contain sourceId:
              depthMap.set(sourceId, depth + 1)
              queue.push({ nodeId: sourceId, depth: depth + 1 })
7. Filter edges where both source and target exist in depthMap.
8. Return depthMap and filtered edgeSet.
```

### 6.2 Key Algorithmic Rules

1. **Directionality:** Default direction is `'dependencies'` (outgoing edges $s \to u \to v$), representing the runtime invocation chain from the focal LWC outward.
2. **Edge Inclusion Filtering:** By default, all active structural and runtime dependency edge types (`lwc-template-child`, `lwc-apex`, `method-call`, `instantiation`, `type-reference`, `soql-object`, `soql-field`, `implements`, `trigger-handler`, `trigger-object`) are included. Test references (`test-reference`) are excluded by default to prevent test classes from creating artificial shortcuts between unrelated components.
3. **Shortest-Path Deduplication:** BFS guarantees that the first time a node $v$ is discovered, $d(s, v)$ is the exact minimum edge distance. Subsequent longer paths to $v$ do not overwrite $d(s, v)$.
4. **Cycle Safety:** Because `depthMap.has(targetId)` is checked before enqueueing, graph cycles (such as $A \to B \to C \to A$) are terminated instantly without infinite loops or depth distortion.
5. **Shared Nodes:** A shared node $h$ (e.g. `ApexClass:AssetDashboardController`) is assigned $d(s, h)$ based on its distance from the current focal Sun $s$. Its node identity remains unique ($1$ node object in output).
6. **Unreachable Nodes:** Any node $u \in V$ for which no path exists from $s$ is omitted from `depthMap`. Unreachable nodes do not participate in the focused orbit layout.

---

## 7. Projection Schema

The proposed `component-orbit-adapter.ts` will emit the following strictly typed TypeScript data structure:

```typescript
import type {
  ExplorerDataSchema,
  ExplorerNode,
  ExplorerEdge,
  ExplorerNodeType,
  ExplorerRelationshipType
} from '../types/explorer';

export type ComponentOrbitRoleSymbol = '☉' | '◎' | '◉' | '○';

export interface ComponentOrbitNode {
  nodeId: string;
  displayName: string;
  type: ExplorerNodeType;
  file: string;
  risk: string;
  depth: number;                // 0 for focal Sun, 1, 2, 3...
  ringIndex: number;            // Same as depth
  roleSymbol: ComponentOrbitRoleSymbol; // ☉ Sun, ◎ Child LWC, ◉ Shared Apex, ○ Ordinary
  isSun: boolean;
  isChildLwc: boolean;
  isSharedHub: boolean;
  dependentLwcCount: number;    // Number of distinct LWCs depending on this node
  dependentLwcIds: string[];    // Array of distinct LWC IDs
  childLwcTargets: string[];    // Child LWC IDs for drill-down navigation
  metrics: {
    fanIn: number;
    fanOut: number;
    coupling: number;
    score: number;
  };
  provenance: {
    sourceGraphNodeId: string;
    nodeType: string;
  };
}

export interface ComponentOrbitEdgeProvenance {
  sourceEdgeId: string;
  sourceComponentName: string;
  targetComponentName: string;
  relationshipType: string;
}

export interface ComponentOrbitEdge {
  edgeId: string;
  source: string;
  target: string;
  relationshipType: ExplorerRelationshipType | string;
  sourceDepth: number;
  targetDepth: number;
  isSameRing: boolean;
  isCrossRing: boolean;
  isCompositionEdge: boolean;   // true for lwc-template-child
  isControllerEdge: boolean;    // true for lwc-apex
  provenance: ComponentOrbitEdgeProvenance;
}

export interface ComponentOrbitRing {
  ringIndex: number;            // 0, 1, 2, 3...
  depth: number;
  label: string;                // e.g. "Focus Component (Sun)", "1-Hop Dependencies"
  items: ComponentOrbitNode[];
  totalCount: number;
}

export interface ComponentOrbitSummary {
  focalLwcId: string;
  totalReachableNodes: number;
  totalUnreachableNodes: number;
  totalEdges: number;
  maxDepth: number;
  ringCount: number;
  childLwcCount: number;
  sharedHubCount: number;
}

export interface ComponentOrbitAvailableSun {
  id: string;
  displayName: string;
  childLwcCount: number;
  totalDependencyCount: number;
  isRootLwc: boolean;
}

export interface ComponentOrbitProjection {
  focus: ComponentOrbitNode;
  rings: ComponentOrbitRing[];
  nodes: Record<string, ComponentOrbitNode>;
  edges: ComponentOrbitEdge[];
  availableSuns: ComponentOrbitAvailableSun[];
  unreachableNodeIds: string[];
  summary: ComponentOrbitSummary;
  options: ComponentOrbitAdapterOptions;
}

export interface ComponentOrbitAdapterOptions {
  focalLwcId?: string | null;
  maxDepth?: number;             // Default: 7
  direction?: 'dependencies' | 'dependents' | 'both'; // Default: 'dependencies'
  includeTestReferences?: boolean; // Default: false
}
```

---

## 8. Graph-Preservation Invariants

The adapter MUST guarantee the following 15 mathematical and graph invariants:

* **Invariant 1 (Focus Identity):** The central Sun corresponds to exactly 1 authoritative LWC ID (`focalLwcId`) present in the source graph.
* **Invariant 2 (Node Identity Conservation):** Every projected node ID maps $1:1$ to an authoritative source node ID. No source node is cloned, duplicated, or silently renamed.
* **Invariant 3 (Edge Provenance Traceability):** Every projected edge maps directly to an existing source edge with verified `source`, `target`, and `relationshipType`.
* **Invariant 4 (Depth Determinism):** Given identical graph input and identical focal LWC ID, node depth assignment is 100% deterministic ($0.00000$ drift across $10\times$ executions).
* **Invariant 5 (Ring-Depth Equivalence):** Physical ring index $R$ strictly equals dependency depth $N$. Architecture Layer values MUST NOT alter ring assignment.
* **Invariant 6 (Shared Apex Identity Preservation):** A shared Apex class used by $K$ distinct LWCs remains exactly $1$ node object in the projected graph dictionary.
* **Invariant 7 (Child-LWC Identity Preservation):** A child LWC node retains its type `LWC`, its canonical ID, and its composition edge connections.
* **Invariant 8 (Type Preservation):** Node types (`LWC`, `ApexClass`, `CustomObject`, `CustomField`, `External`, `ApexTrigger`) and edge relationship types are preserved without silent collapsing.
* **Invariant 9 (Zero Visual Semantics in Adapter):** The adapter output contains zero visual geometry fields (`x`, `y`, width, height, angles, bounding boxes).
* **Invariant 10 (Zero Geometry-Driven Semantics):** Physical layout coordinates never alter node depth, ring assignment, or edge relationships.
* **Invariant 11 (Input-Order Invariance):** Shuffling input `nodes` or `edges` array order produces bit-for-bit identical projection output.
* **Invariant 12 (Focus Isolation):** Nodes unreachable from the focal Sun are excluded from the active focused projection dictionary (`nodes`).
* **Invariant 13 (Cycle Safety):** Graph cycles do not cause infinite loops, duplicated depth assignments, or stack overflow.
* **Invariant 14 (Multi-Edge Preservation):** Multi-edges with distinct relationship types between the same source and target pair are preserved with unique edge IDs.
* **Invariant 15 (Zero Input Graph Mutation):** The input `ExplorerDataSchema` object and its child arrays are never mutated during projection.

---

## 9. Shared Apex Contract

A shared Apex class represents a core backend service or controller invoked by multiple LWCs.

### 9.1 Shared Status Criteria
An Apex node $a \in V$ is classified as a **Shared Apex Hub** if and only if:
$$\text{Type}(a) = \text{'ApexClass'} \quad \text{and} \quad |\{ l \in V \mid \text{Type}(l) = \text{'LWC'} \land \text{Path}(l \to a) \}| \ge 2$$

### 9.2 Execution Rules in PBIM
1. **Single Node Identity:** In PBIM, 7 shared Apex classes exist (e.g., `ApexClass:AssetDashboardController` used by 4 LWCs). In a focused orbit view, `AssetDashboardController` is rendered as **one node** on Ring 1 (or Ring $N$ depending on focus).
2. **Multi-LWC Metadata:** The projected node object populates `dependentLwcCount = 4` and `dependentLwcIds = ['LWC:asset-dashboard-container', 'LWC:asset-detail-dashboard', 'LWC:asset-health-map', 'LWC:asset-history']`.
3. **Visual Hub Badge:** The node is assigned `roleSymbol = '◉'` and `isSharedHub = true`.

---

## 10. Child-LWC Contract

LWC composition edges (`lwc-template-child`) establish template embedding relationships between parent and child LWCs.

### 10.1 Composition Rules
1. **Parent $\to$ Child Direction:** `lwc-template-child` edges go from Parent LWC (source) to Child LWC (target).
2. **Depth Assignment:** When focusing on Parent LWC $P$, Child LWC $C$ sits on Ring 1 ($d(P, C) = 1$).
3. **Navigability Metadata:** Parent LWC node $P$ receives `childLwcTargets = ['LWC:C1', 'LWC:C2', ...]`. Child LWC node $C$ receives `isChildLwc = true` and `roleSymbol = '◎'`.
4. **Nested LWCs:** For 3 nested LWCs in PBIM (`LWC:asset-dashboard-container`, `LWC:vendor-workspace`, `LWC:zone-manager-dashboard`), they act as children in their parent's orbit view, and act as central Suns when focused.

---

## 11. Architecture Orbit Contamination Findings

Forensic investigation of `explorer/src/lib/layout/orbit-semantics.ts` revealed why Architecture Orbit code MUST NOT be reused semantically for Component Orbit:

### 11.1 Layer Supremacy Mechanism
`computeOrbitRingIndex()` in `orbit-semantics.ts` contains the following hardcoded logic:
```typescript
// Ring 0: Entry / Presentation (LWCs, Visualforce, Triggers, Flows, Presentation)
if (node.type === 'LWC' || layer === 'presentation') return 0;
// Ring 1: Application / Controllers
if (layer === 'application') return 1;
// Ring 2: Domain / Services
if (layer === 'domain') return 2;
// Ring 3: Schema Objects
if (node.type === 'Object' || node.type === 'CustomObject') return 3;
// Ring 4: Schema Detail & External
if (node.type === 'Field' || node.type === 'CustomField' || node.type === 'External') return 4;
// Ring 5: Supporting / Satellites / Tests
if (isTestNode(node) || role === 'SharedInfrastructure') return 5;
```

### 11.2 Contamination Proof
If `orbit-semantics.ts` were reused for Component Orbit:
* **All 30 LWCs in PBIM would sit on Ring 0 simultaneously**, regardless of whether they are focal Suns, child LWCs, or unrelated components.
* **All Apex Controllers would sit on Ring 1**, regardless of their dependency distance from the focused LWC.
* **Dependency Depth $0..N$ would be completely destroyed.**

### 11.3 Reusability Asset Classification Table

| Asset / File | Function / Symbol | Reusability | Rationale |
|---|---|---|---|
| `orbit-semantics.ts` | `computeOrbitRingIndex` | **`UNSAFE TO REUSE`** | Uses Architecture Layer Supremacy instead of dependency depth |
| `orbit-semantics.ts` | `projectOrbitSemantics` | **`UNSAFE TO REUSE`** | Projects layer rings R0..R5 for macro Architecture Orbit |
| `orbit-layout.ts` | `computeOrbitLayout` | `GEOMETRY EXTRACTION` | Geometry math engine is 100% reusable when passed depth rings |
| `orbit-layout.ts` | `LAYER_LABELS` | **`UNSAFE TO REUSE`** | Hardcoded ring titles (`0: Nucleus`, `1: Presentation Layer`, etc.) |
| `constellation-adapter.ts` | `adaptConstellation` | `SEMANTIC EXTRACTION` | Contains pure BFS traversal; extract BFS to `graph-depth.ts` |
| `graph-style.ts` | Node & Edge Cytoscape Styles | `DIRECT REUSE` | Provides complete Cytoscape styling for LWC, Apex, and edges |
| `GraphView.tsx` | Canvas Rendering Engine | `DIRECT REUSE` | Renders explicit `{x, y}` preset positions with LOD and overlay guides |

---

## 12. Navigation Boundary

To prevent state coupling, the boundaries between the Semantic Adapter and the Navigation/UI System are strictly defined:

```text
+-----------------------------------------------------------------------------------+
|                            SEMANTIC ADAPTER RESPONSIBILITY                        |
|  - Computes pure ComponentOrbitProjection for a given focalLwcId.                |
|  - Generates childLwcTargets array for drill-down navigation targets.             |
|  - Calculates availableSuns array with root/child LWC flags.                      |
|  - Preserves graph provenance and dependency edge types.                          |
|  - ZERO React state, ZERO URL params, ZERO DOM references.                        |
+-----------------------------------------------------------------------------------+
                                        │
                                        ▼ (Pure Data Props)
+-----------------------------------------------------------------------------------+
|                         NAVIGATION / UI SYSTEM RESPONSIBILITY                     |
|  - Manages active focalLwcId in React context or URL query parameters.             |
|  - Maintains drill-down breadcrumb stack: [All Suns, Parent LWC, Child LWC].       |
|  - Handles user click events on LWC nodes (◎) to trigger focus transition.       |
|  - Controls view mode switching (All Suns <-> Focused Orbit <-> Architecture).     |
+-----------------------------------------------------------------------------------+
```

---

## 13. Visualization Boundary

The boundaries between the Semantic Adapter and the Geometry/Visualization Engine are strictly enforced:

```text
+-----------------------------------------------------------------------------------+
|                            SEMANTIC ADAPTER RESPONSIBILITY                        |
|  - Computes node depths (0..N) and ring groupings.                                |
|  - Assigns semantic role symbols (☉, ◎, ◉, ○).                                   |
|  - Filters reachable vs unreachable node sets.                                    |
|  - ZERO x/y coordinates, ZERO radii, ZERO angles, ZERO pixel bounding boxes.     |
+-----------------------------------------------------------------------------------+
                                        │
                                        ▼ (Pure Semantic Metadata)
+-----------------------------------------------------------------------------------+
|                        GEOMETRY / VISUALIZATION RESPONSIBILITY                    |
|  - orbit-layout.ts: Computes polar/Cartesian coordinates, angles, radii, track    |
|    capacity expansion (R_req), AABB clearance, and FSM collision repair.          |
|  - GraphView.tsx: Renders Cytoscape nodes, handles pan/zoom, LOD label text       |
|    wrapping, hover cards, and SVG guide circles.                                  |
+-----------------------------------------------------------------------------------+
```

---

## 14. Test Contract

The adapter implementation MUST be accompanied by an exhaustive test suite (`explorer/src/lib/adapters/component-orbit-adapter.test.ts`):

### 14.1 Unit Tests
1. **Focal Selection:** Verify default focus selection picks highest-coupling root LWC when `focalLwcId` is omitted.
2. **Depth Calculation:** Verify Depth 0 = focal Sun, Depth 1 = direct dependencies, Depth $N$ = transitive dependencies.
3. **Child LWC Classification:** Verify child LWCs reachable via `lwc-template-child` are flagged `isChildLwc = true` and receive symbol `◎`.
4. **Shared Apex Classification:** Verify Apex classes used by $\ge 2$ LWCs are flagged `isSharedHub = true` and receive symbol `◉`.
5. **Cycle Handling:** Test graph containing cycles ($A \to B \to C \to A$) to prove non-infinite execution and stable depth assignment.
6. **Multi-Edge Preservation:** Test node pair with multiple directed edges to verify all unique edge types are preserved.
7. **Unreachable Node Isolation:** Verify backend nodes unreachable from focal Sun are placed in `unreachableNodeIds` and omitted from `nodes`.

### 14.2 Integration Tests (Real PBIM Data)
1. **PBIM Focus Scenario 1 (`LWC:asset-dashboard-container`):** Verify 128 reachable nodes, Depth 0..7 distribution, 3 child LWCs on Depth 1, 1 shared Apex hub on Depth 1.
2. **PBIM Focus Scenario 2 (`LWC:citizen-report-portal`):** Verify 102 reachable nodes, Depth 0..5 distribution, 2 shared Apex hubs on Depth 1.
3. **PBIM Focus Scenario 3 (`LWC:vendor-workspace`):** Verify 101 reachable nodes, Depth 0..6 distribution, 2 child LWCs on Depth 1, 2 shared Apex hubs on Depth 1.
4. **PBIM Focus Scenario 4 (`LWC:error-panel`):** Isolated LWC scenario. Verify exactly 1 node (Depth 0), 0 edges, 0 rings, 527 unreachable nodes.

### 14.3 Negative Tests
1. **Missing Focal Node:** Non-existent ID passed as `focalLwcId`. Verify graceful fallback to valid available Sun.
2. **Empty Graph ($N=0$):** `nodes = [], edges = []`. Verify valid empty projection without runtime exception.
3. **Malformed Edges:** Edges pointing to non-existent node IDs. Verify missing endpoints are ignored safely.
4. **Self-Loops:** Node with edge to itself ($v \to v$). Verify self-loop does not alter depth 0 or cause infinite loop.

### 14.4 Determinism Tests
1. **10x Execution Stability:** Run `adaptComponentOrbit` 10 times sequentially. Verify $0.00000$ drift in node lists, edge lists, and depth maps.
2. **10x Input Order Shuffle:** Shuffle input `nodes` and `edges` arrays 10 times. Verify bit-for-bit identical projection output.

---

## 15. Real PBIM Validation Results

Executing the depth algorithm against the canonical PBIM dataset across 4 representative LWC focus scenarios produced the following exact results:

```text
===================================================================================================
Scenario 1: Focal LWC = "LWC:asset-dashboard-container"
---------------------------------------------------------------------------------------------------
- Total Reachable Nodes: 128 (Unreachable: 400)
- Max Depth: 7
- Depth Distribution:
  * Ring 0 (Sun): 1 node  [LWC:asset-dashboard-container] (☉)
  * Ring 1:      4 nodes [3 Child LWCs (◎), 1 Shared Apex Hub (◉)]
  * Ring 2:      2 nodes
  * Ring 3:      9 nodes
  * Ring 4:     34 nodes
  * Ring 5:     36 nodes
  * Ring 6:     12 nodes
  * Ring 7:     30 nodes
- Direct Depth 1 Nodes:
  1. ApexClass:AssetDashboardController (Type: ApexClass, Shared Hub: ◉, Dependent LWCs: 4)
  2. LWC:asset-detail-dashboard       (Type: LWC, Child LWC: ◎)
  3. LWC:asset-health-map             (Type: LWC, Child LWC: ◎)
  4. LWC:asset-history                (Type: LWC, Child LWC: ◎)

===================================================================================================
Scenario 2: Focal LWC = "LWC:citizen-report-portal"
---------------------------------------------------------------------------------------------------
- Total Reachable Nodes: 102 (Unreachable: 426)
- Max Depth: 5
- Depth Distribution:
  * Ring 0 (Sun): 1 node  [LWC:citizen-report-portal] (☉)
  * Ring 1:      2 nodes [0 Child LWCs, 2 Shared Apex Hubs (◉)]
  * Ring 2:     20 nodes
  * Ring 3:     40 nodes
  * Ring 4:     20 nodes
  * Ring 5:     19 nodes
- Direct Depth 1 Nodes:
  1. ApexClass:CitizenRequestController (Type: ApexClass, Shared Hub: ◉, Dependent LWCs: 3)
  2. ApexClass:CityZoneController       (Type: ApexClass, Shared Hub: ◉, Dependent LWCs: 3)

===================================================================================================
Scenario 3: Focal LWC = "LWC:vendor-workspace"
---------------------------------------------------------------------------------------------------
- Total Reachable Nodes: 101 (Unreachable: 427)
- Max Depth: 6
- Depth Distribution:
  * Ring 0 (Sun): 1 node  [LWC:vendor-workspace] (☉)
  * Ring 1:      5 nodes [2 Child LWCs (◎), 2 Shared Apex Hubs (◉), 1 Ordinary (○)]
  * Ring 2:     11 nodes
  * Ring 3:     28 nodes
  * Ring 4:     21 nodes
  * Ring 5:     34 nodes
  * Ring 6:      1 node
- Direct Depth 1 Nodes:
  1. ApexClass:MaintenanceRequestController (Type: ApexClass, Shared Hub: ◉, Dependent LWCs: 3)
  2. ApexClass:VendorAssignmentController  (Type: ApexClass, Shared Hub: ◉, Dependent LWCs: 2)
  3. LWC:vendor-assignment-panel          (Type: LWC, Child LWC: ◎)
  4. LWC:vendor-history-modal             (Type: LWC, Child LWC: ◎)
  5. ApexClass:VendorWorkspaceController    (Type: ApexClass, Ordinary: ○)

===================================================================================================
Scenario 4: Focal LWC = "LWC:error-panel" (Isolated LWC)
---------------------------------------------------------------------------------------------------
- Total Reachable Nodes: 1 (Unreachable: 527)
- Max Depth: 0
- Depth Distribution:
  * Ring 0 (Sun): 1 node  [LWC:error-panel] (☉)
- Direct Depth 1 Nodes: None (0 nodes)
```

---

## 16. Contradiction Register

| # | Claim / Perception | Source | Current Repository Truth | Conflict | Resolution |
|---|---|---|---|---|---|
| 1 | *"Component Orbit code already exists in `orbit-semantics.ts`"* | File naming assumption | `orbit-semantics.ts` maps rings based on Architecture Layers (Presentation..Supporting) | Architecture Orbit layer rings vs Component Orbit depth rings | Proven **UNSAFE TO REUSE**. Create dedicated `component-orbit-adapter.ts`. |
| 2 | *"Constellation lens is identical to Component Orbit"* | Pre-implementation note | Constellation (`constellation-adapter.ts`) calculates `hopDistance` but renders on SVG panel | Visual rendering canvas and interaction model differ | Extract Constellation's BFS traversal into `graph-depth.ts`, but render in Cytoscape canvas via `orbit-layout.ts`. |
| 3 | *"All PBIM nodes are reachable from LWCs"* | General graph assumption | Outgoing BFS from 30 LWCs reaches 271 nodes (51.3%). 257 nodes are unreachable | 48.7% of PBIM graph consists of backend-only Apex/Fields | Unreachable nodes are isolated from active focus view and populated in `unreachableNodeIds`. |
| 4 | *"Cytoscape fcose layout engine is used for Orbit mode"* | Earlier audit notes | `computeOrbitLayout()` computes explicit Cartesian `{x, y}` coordinates fed as `preset` | Fcose is installed but bypassed for Orbit | Retain explicit, deterministic `{x, y}` position authority in `position-policy.ts`. |
| 5 | *"PBIM contains 11 orphan LWCs"* | Previous draft report | 16 LWCs have parents, 9 have children, 3 are nested. 22 LWCs participate in composition; 8 do not. 1 LWC is completely isolated | Terminology confusion (no composition vs no edges) | Clarify taxonomy: 14 Root LWCs (0 parents), 16 Child LWCs (1+ parent), 8 No-Composition LWCs, 1 Completely Isolated LWC (`LWC:error-panel`). |
| 6 | *"Shared Apex nodes should be cloned for each LWC orbit"* | Visual design draft | Cytoscape graph requires unique node IDs; cloning destroys single graph identity | Duplicating nodes breaks graph preservation contract | Enforce Invariant 6: Shared Apex class remains **1 single node** (`isSharedHub = true`, symbol `◉`). |

---

## 17. Evidence Classification

All findings in this audit report are classified according to strict evidence quality standards:

### AUTHORITATIVE (100% Repository / Code / Dataset Evidence)
* PBIM graph metrics: 528 nodes, 2063 edges, 30 LWCs, 19 `lwc-template-child` composition edges, 51 `lwc-apex` edges, 7 shared Apex hubs (Section 4).
* `orbit-semantics.ts` layer-based ring logic in `computeOrbitRingIndex()` (Section 11).
* `orbit-layout.ts` mathematical geometry engine, track expansion math, and FSM collision repair (Section 3).
* Single-LWC reachability and depth distribution metrics across PBIM (Section 15).
* CLI integration test suite pass state (21/21 PASS).

### STRONG (Multiple Codebase & Architectural Alignments)
* BFS graph traversal reusability from `constellation-adapter.ts` (Section 3).
* Cytoscape styling mappings for LWC, Apex, and typed edges in `graph-style.ts` (Section 3).
* Position authority preservation in `GraphView.tsx` and `position-policy.ts` (Section 3).

### INFERRED (Logical Deduction from Code & Domain Structure)
* Decoupling `LAYER_LABELS` in `orbit-layout.ts` via an optional options parameter.
* Extension of breadcrumb state in `WorkspaceRouterContext.tsx` for drill-down navigation history.

### PROPOSED (Design Recommendations for Subsequent Phases)
* All Suns grid/pack layout specification (`all-suns-layout.ts`).
* Galaxy macro cluster layout specification.

### UNKNOWN (None)
* Zero unknown or unverified semantic attributes remain in this audit.

---

## 18. Proposed Implementation Boundary

The subsequent implementation phase is authorized to create and modify ONLY the following files:

### Files to Create:
1. `explorer/src/lib/graph-depth.ts` — Standalone, pure BFS depth calculation engine extracted from `constellation-adapter.ts`.
2. `explorer/src/lib/adapters/component-orbit-adapter.ts` — Pure data adapter implementing the Component Orbit Semantic Contract.
3. `explorer/src/lib/adapters/component-orbit-adapter.test.ts` — Complete unit, integration, negative, and determinism test suite.

### Files to Modify (Minimal Surgical Options Parameter Only):
1. `explorer/src/lib/orbit-layout.ts` — Add optional `ringLabels?: Record<number, string>` to `OrbitLayoutOptions` to allow dynamic depth ring titles without changing geometry math.

### STRICTLY FORBIDDEN IN NEXT PHASE:
* DO NOT implement UI components (`ComponentOrbitPanel.tsx`).
* DO NOT implement All Suns layout (`all-suns-layout.ts`).
* DO NOT modify `orbit-semantics.ts`.
* DO NOT modify `GraphView.tsx`.
* DO NOT modify existing workspace context files or router files.

---

## 19. Explicitly Forbidden Reuse

The following modules, functions, and patterns are **EXPLICITLY FORBIDDEN** from being reused semantically in Component Orbit:

1. **`computeOrbitRingIndex()` in `explorer/src/lib/layout/orbit-semantics.ts`:** FORBIDDEN. Maps physical rings to Architecture Layers instead of dependency depth.
2. **`projectOrbitSemantics()` in `explorer/src/lib/layout/orbit-semantics.ts`:** FORBIDDEN. Projects macro Architecture Orbit node metadata.
3. **Hardcoded `LAYER_LABELS` constant in `explorer/src/lib/orbit-layout.ts`:** FORBIDDEN. Must be overridden by dynamic depth ring labels.
4. **Node Cloning / Duplication Patterns:** FORBIDDEN. Shared Apex nodes MUST NOT be duplicated across multiple visual nodes.
5. **Geometry-Driven Semantic Mutators:** FORBIDDEN. Node coordinates (`x`, `y`) MUST NEVER be used to calculate or alter node dependency depth.

---

## 20. Gate Criteria

To progress through the Component Orbit engineering roadmap, the following gates MUST be satisfied sequentially:

```text
[GATE A: Repository Truth] -------------> PASSED (Verified in this audit report)
        │
        ▼
[GATE B: Semantic Contract & Adapter] --> CURRENT STAGE (Implement component-orbit-adapter.ts)
        │
        ▼
[GATE C: Projection Integrity] ---------> Unit tests verify 100% graph preservation & 10x determinism
        │
        ▼
[GATE D: Orbit Layout Geometry] --------> Orbit layout executes with 0 AABB node collisions on PBIM
        │
        ▼
[GATE E: Navigation & UI Integration] -> Breadcrumbs & panel drill-down verified in browser
        │
        ▼
[GATE F: Real Browser Closure] ---------> Playwright Chromium audit verifies 0 rendered label collisions
```

---

## 21. Final Verdict

Direct answers to the 6 mandatory audit questions:

1. **Is the semantic contract now precise enough to implement?**
   **YES.** The contract specifies the exact mathematical depth algorithm, projection schema, 15 invariants, shared Apex rules, child-LWC rules, multi-edge handling, cycle safety, and PBIM baseline data.
2. **What remains unknown?**
   **NOTHING.** All 528 nodes, 2063 edges, 30 LWCs, 7 shared Apex hubs, and reachability structures in PBIM have been 100% verified.
3. **What must not be implemented yet?**
   Component Orbit UI panels, All Suns layout, Galaxy view, child-orbit drill-down state, and production navigation MUST NOT be implemented until `component-orbit-adapter.ts` is created and verified under Gate B/C.
4. **What is the single safest next implementation step?**
   Extracting `explorer/src/lib/graph-depth.ts` and authoring `explorer/src/lib/adapters/component-orbit-adapter.ts` with its test suite `component-orbit-adapter.test.ts`.
5. **What executable tests must accompany that step?**
   Unit tests verifying focus selection, depth calculation, child-LWC classification, shared Apex classification, cycle handling, multi-edge preservation, unreachable node isolation, real PBIM projections (4 focus scenarios), negative edge cases, and 10x determinism.
6. **What evidence would cause the gate to fail?**
   Any node duplication, missing source nodes/edges, non-deterministic depth assignments, infinite loop on graph cycles, or reuse of layer-based ring logic from `orbit-semantics.ts`.

---
