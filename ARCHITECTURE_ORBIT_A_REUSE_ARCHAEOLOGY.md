# ARCHITECTURE ORBIT — PARALLEL AUDIT A
## Existing Infrastructure, Reuse Paths, and Codebase Archaeology

**Author:** Principal Frontend Architect & Codebase Archaeologist
**Status:** Canonical Archaeology Map (Read-Only Audit)
**Target Subsystem:** Visual Layout & Architecture Infrastructure (`explorer/src/`)

---

## 1. Executive Summary

This archaeology report provides an exhaustive, evidence-backed inventory of existing graph, layout, worker, interaction, semantic, visibility, geometry, and persistence infrastructure within the repository. The objective is to establish an explicit **Reuse Map** for Architecture Orbit, identifying what can be directly consumed, what requires a thin adapter, what can be reused as a concept, and what must **not** be touched or duplicated.

### Key Discoveries
1. **Authoritative State & Visibility Pipeline:** Visual graph inputs are fully centralized in `selectFilteredGraph` (`explorer/src/lib/selectors/index.ts`), which applies `applyFilters` (`explorer/src/lib/search-filter.ts`) to produce `FilteredGraphData` (`nodes`, `edges`, `matchingNodeIds`). Architecture Orbit can directly consume this output.
2. **Deterministic Semantic Classification:** Semantic role and layer classification are already fully realized in `classifyFeatureRole` (`explorer/src/lib/layout/feature-roles.ts`), `classifyNodeLayer` (`explorer/src/lib/layout/layers.ts`), and `discoverFeatures` (`explorer/src/lib/layout/features.ts`). Duplicating classification in Orbit would introduce semantic drift and break cross-view state consistency.
3. **Multi-Tier Position Authority Policy:** Node positioning is governed by the 5-tier Position Authority system in `explorer/src/lib/position-policy.ts` (`resolveAuthoritativePosition`, `shouldAutoLayout`). Orbit position outputs must register through this policy with explicit provenance (`LayoutProvenance`) rather than bypassing state persistence or directly mutating Cytoscape instances.
4. **Asynchronous Web Worker Layout Offloading:** The Web Worker bridge (`LayoutWorkerClient` in `explorer/src/lib/workers/layout-worker-client.ts` and `layout.worker.ts`) provides full async offloading, generation-ID cancellation, stale-result rejection, and synchronous main-thread fallbacks. Orbit layout calculation can be adapted directly into this message pipeline without creating new Web Worker threads or custom messaging protocols.
5. **Spatial Geometry & Collision Utilities:** Spatial indexing (`LayoutGraphIndex` in `explorer/src/lib/layout/graph-index.ts`) and 2D spatial grid collision detection (`SpatialGrid` & `resolveSpacingAndCollisions` in `explorer/src/lib/layout/spacing.ts`) are completely established and tested.

---

## 2. Actual Layout Execution Path

Tracing the live execution path across the workspace reveals the end-to-end flow from UI triggers to Cytoscape canvas rendering and state persistence:

```text
[User Viewport / View Mode Switch / Controls]
       │
       ▼
[GraphView Component] (explorer/src/components/GraphView.tsx)
       │
       ├─► Layout Mode Selection (layoutMode: 'interactive' | 'static', architectureMode: 'hierarchical' | 'hybrid')
       │
       ├─► Visibility Filtering (selectFilteredGraph in explorer/src/lib/selectors/index.ts -> applyFilters)
       │
       ├─► Semantic Classification & Feature Discovery (discoverFeatures in explorer/src/lib/layout/features.ts)
       │
       ├─► Graph Preparation (buildGraphElements in explorer/src/lib/graph-builder.ts -> ElementDefinition[])
       │
       ├─► Position Policy Gate (shouldAutoLayout & resolveAuthoritativePosition in explorer/src/lib/position-policy.ts)
       │
       ├─► Layout Orchestration (runLayoutWithMetadata / runLayoutWithMetadataAsync in explorer/src/lib/graph-layout.ts)
       │         │
       │         ├─► [Main Thread Synchronous Path] (computeArchitectureLayoutWithMetadata in architecture-layout.ts)
       │         │
       │         └─► [Worker Thread Async Path] (LayoutWorkerClient -> postMessage -> layout.worker.ts)
       │
       ├─► Layout Engine Execution (13-Stage Pipeline: global-layout.ts, local-layout.ts, satellites.ts, spacing.ts, etc.)
       │
       ├─► Position Output (PositionMap: Record<string, {x: number, y: number}> + FeatureRegion Map)
       │
       ├─► Position Authority Enforcement (applyPositionAuthority in layout-worker-client.ts)
       │
       ├─► Persistence (captureAndPersistPositions -> saveProjectState in explorer/src/lib/projectState.ts)
       │
       └─► Cytoscape / Rendering (cy.batch() position assignment, Canvas LOD, FeatureOverlayCanvas.tsx)
```

### Stage Analysis for Architecture Orbit:

1. **GraphView (`explorer/src/components/GraphView.tsx`):**
   * *What exists:* Primary React component managing Cytoscape instance, controls overlay, hover cards, and mode switching.
   * *Orbit impact:* Needs a thin adapter or prop extension to register Orbit as an allowed architecture mode alongside `'hierarchical'` and `'hybrid'`.

2. **Layout Mode Selection (`explorer/src/types/explorer.ts`, `explorer/src/lib/projectState.ts`):**
   * *What exists:* `ArchitectureLayoutMode` type (`'hierarchical'` | `'hybrid'`), stored as `architectureMode` in `GraphLayoutState`.
   * *Orbit impact:* Extend `ArchitectureLayoutMode` type definition to `'hierarchical' | 'hybrid' | 'orbit'` or register Orbit within layout options.

3. **Layout Orchestration (`explorer/src/lib/graph-layout.ts`):**
   * *What exists:* `runLayoutWithMetadata` and `runLayoutWithMetadataAsync` which extract Cytoscape graph data and invoke `computeArchitectureLayoutWithMetadata`.
   * *Orbit impact:* Direct reuse. Orbit can be dispatched as a layout mode branch inside `computeArchitectureLayoutWithMetadata`.

4. **Graph Preparation (`explorer/src/lib/graph-builder.ts`):**
   * *What exists:* `buildGraphElements(nodes, edges, findings, featureMap)` transforms raw domain objects into Cytoscape `ElementDefinition[]`.
   * *Orbit impact:* Direct reuse.

5. **Visibility Filtering (`explorer/src/lib/search-filter.ts`, `explorer/src/lib/selectors/index.ts`):**
   * *What exists:* Pure, memoized selectors filtering `nodes` and `edges` based on search query, node types, risk, and behavioral signals.
   * *Orbit impact:* Direct reuse. Orbit consumes the visible graph output (`nodes` and `edges`) produced by `selectFilteredGraph`.

6. **Semantic Classification (`explorer/src/lib/layout/feature-roles.ts`, `explorer/src/lib/layout/layers.ts`, `explorer/src/lib/layout/features.ts`):**
   * *What exists:* `classifyFeatureRole`, `classifyNodeLayer`, and `discoverFeatures`.
   * *Orbit impact:* Direct reuse. Orbit consumes pre-classified roles and feature clusters.

7. **Worker/Client Boundary (`explorer/src/lib/workers/layout-worker-client.ts`, `layout.worker.ts`):**
   * *What exists:* Fully implemented Web Worker client with request generation IDs, cancellation, cross-project protection, and error fallback.
   * *Orbit impact:* Direct reuse. Orbit options pass through the existing payload structure without modifying worker messaging protocol.

8. **Position Authority & Policy (`explorer/src/lib/position-policy.ts`):**
   * *What exists:* `resolveAuthoritativePosition` enforcing Level 1 (user drag) > Level 2 (persisted state) > Level 3 (canvas position) > Level 4 (calculated layout) > Level 5 (deterministic fallback).
   * *Orbit impact:* Direct reuse. Orbit must obey position authority rules.

9. **Persistence (`explorer/src/lib/projectState.ts`):**
   * *What exists:* Project-scoped `localStorage` state management with `saveProjectState` and `loadProjectState`.
   * *Orbit impact:* Direct reuse. Stores Orbit coordinates under `GraphLayoutState.nodePositions` with `layoutProvenance = 'automatic-orbit'`.

10. **Cytoscape / Rendering (`explorer/src/components/GraphView.tsx`, `FeatureOverlayCanvas.tsx`):**
    * *What exists:* Cytoscape batch position updates, minimap navigator, LOD zoom handlers, and SVG/Canvas overlay layers.
    * *Orbit impact:* Direct reuse.

---

## 3. Existing Graph Infrastructure

| Infrastructure Unit | Source File | Key Types / Functions | Output / Data Produced | Orbit Reuse Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Node / Edge Schemas** | `explorer/src/types/explorer.ts` | `ExplorerNode`, `ExplorerEdge` | Canonical node/edge domain models | **Direct reuse** |
| **Graph Extraction** | `explorer/src/lib/graph-layout.ts` | `extractNodesAndEdgesFromCy` | `{ nodes: ExplorerNode[]; edges: ExplorerEdge[] }` | **Direct reuse** |
| **Graph Builder** | `explorer/src/lib/graph-builder.ts` | `buildGraphElements`, `createNodeMap` | Cytoscape `ElementDefinition[]`, `Map<string, ExplorerNode>` | **Direct reuse** |
| **Graph Adjacency & Indexing** | `explorer/src/lib/layout/graph-index.ts` | `createLayoutGraphIndex` | `LayoutGraphIndex` (`incidentNeighborsByNode`, `edgesByNode`, `adjacencyMatrix`, `components`, `parentProductionNodeId`, `parentObjectId`) | **Direct reuse** |
| **Graph Metadata** | `explorer/src/types/explorer.ts` | `ExplorerSummary` | Summary counts (`nodeCount`, `edgeCount`, `highRiskCount`, inventory) | **Direct reuse** |
| **Node / Edge ID Mapping** | `explorer/src/types/explorer.ts` | `node.id`, `edge.id` | Unique string keys (`ApexClass:OrderController`) | **Direct reuse** |

---

## 4. Existing Semantic Infrastructure

| Capability | Source File | Function / Type | Produced Metadata | Orbit Reuse Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Node Type Classification** | `explorer/src/types/explorer.ts` | `ExplorerNodeType` | `'ApexClass'`, `'ApexTrigger'`, `'LWC'`, `'Visualforce'`, `'Flow'`, `'Object'`, `'CustomObject'`, `'Field'`, `'CustomField'`, `'External'` | **Direct reuse** |
| **Architectural Layer Classification** | `explorer/src/lib/layout/layers.ts` | `classifyNodeLayer` | `ArchitectureLayer` (`'LWC_VF'`, `'CONTROLLER'`, `'SERVICE'`, `'DOMAIN_DATA'`, `'UTIL_SHARED'`) | **Direct reuse** |
| **Feature Role Classification** | `explorer/src/lib/layout/feature-roles.ts` | `classifyFeatureRole` | `FeatureRole` (`'FeatureAnchor'`, `'FeatureCore'`, `'FeatureData'`, `'FeatureBridge'`, `'FeatureTest'`, `'SharedInfrastructure'`) | **Direct reuse** |
| **Feature Discovery & Grouping** | `explorer/src/lib/layout/features.ts` | `discoverFeatures` | `FeatureDiscoveryResult` (`features: Map<string, FeatureCluster>`, `assignments: Map<string, FeatureAssignment>`) | **Direct reuse** |
| **Domain Discovery** | `explorer/src/lib/layout/domains.ts` | `discoverDomains` | `DomainDiscoveryResult` (`domains: Map<string, DomainCluster>`, `assignments`) | **Direct reuse** |
| **File & Path Metadata** | `explorer/src/types/explorer.ts` | `node.file` | Source file path string | **Direct reuse** |
| **Domain Stem Extraction** | `explorer/src/lib/architecture-layout.ts` | `extractDomainStem` | String stem derived from file path or class name | **Direct reuse** |
| **Dependency Relationship Metadata** | `explorer/src/types/explorer.ts` | `edge.relationshipType`, `edge.canonical` | `ExplorerRelationshipType` (`'method-call'`, `'soql-object'`, etc.) | **Direct reuse** |

---

## 5. Existing Visibility Infrastructure

### Authoritative Visibility Mechanism
Visibility filtering is governed by `selectFilteredGraph` in `explorer/src/lib/selectors/index.ts`, which wraps `applyFilters` in `explorer/src/lib/search-filter.ts`.

```typescript
// explorer/src/lib/search-filter.ts
export interface SearchFilterState {
  searchQuery: string;
  typeFilter: ExplorerNodeType | "";
  riskFilter: ExplorerRiskLevel | "";
  hasCallouts?: boolean;
  withoutSharing?: boolean;
  hideTests?: boolean;
  hasAsyncPatterns?: boolean;
  visibleNodeTypes?: ExplorerNodeType[];
}

export interface FilteredGraphData {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  matchingNodeIds: Set<string>;
}
```

### Representation of Visible Graph
Visible nodes and edges are returned as a pure `FilteredGraphData` object containing:
1. `nodes`: Array of visible `ExplorerNode` items.
2. `edges`: Array of `ExplorerEdge` items connecting visible nodes.
3. `matchingNodeIds`: `Set<string>` of active node IDs.

### Orbit Consumption Plan
Orbit does **not** need to implement filtering logic or maintain a parallel visibility state. Orbit takes the already-filtered `nodes` and `edges` provided by `GraphView` / `selectFilteredGraph` and computes orbital geometry strictly over the visible set.

---

## 6. Existing Interaction Infrastructure

| Interaction State | Source File | Implementation Mechanism | Orbit Reuse Verdict |
| :--- | :--- | :--- | :--- |
| **Node Selection** | `explorer/src/hooks/useGraphSelection.ts`, `explorer/src/context/SelectionContext.tsx` | `useGraphSelection()` hook tracking `selectedNodeId` & `selectedEdgeId` | **Direct reuse** |
| **Graph Tap / Double Tap** | `explorer/src/lib/graph-interactions.ts` | `bindGraphInteractions(cy, callbacks)` binding Cytoscape `tap` and `dbltap` | **Direct reuse** |
| **Node & Edge Hover Cards** | `explorer/src/components/GraphView.tsx` | `setHoverCard({ type, node/edge, x, y })`, rendered via `NodeHoverCard` & `EdgeHoverCard` | **Direct reuse** |
| **Focus & Progressive Drilling** | `explorer/src/lib/graph-interactions.ts` | `focusOnNode(cy, nodeId)` centering viewport and dimming non-neighborhood elements | **Direct reuse** |
| **Highlighting & Dimming** | `explorer/src/lib/graph-interactions.ts` | `highlightNodeConnections`, `clearHighlights`, toggling `.highlighted` and `.dimmed` CSS classes | **Direct reuse** |
| **Cycle Highlighting** | `explorer/src/lib/graph-interactions.ts` | `highlightCycle(cy, cycleNodeIds)` | **Direct reuse** |
| **Simulation Overlay States** | `explorer/src/components/GraphView.tsx` | CSS classes `.simulated-added`, `.simulated-removed`, `.simulated-affected` applied via `cy.batch()` | **Direct reuse** |

Orbit can consume all existing interaction contexts and event callbacks without modification.

---

## 7. Existing Geometry Utilities

| Utility | Source File | Function / Class | Output / Behavior | Orbit Reuse Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Node Dimensions** | `explorer/src/lib/layout/spacing.ts` | Constants `nodeWidth = 120`, `nodeHeight = 60` | Fixed standard bounding box dimensions | **Direct reuse** |
| **Standard Spacing Gaps** | `explorer/src/lib/layout/spacing.ts` | Constants `horizontalGap = 40`, `verticalGap = 40` | Minimum clearance parameters | **Direct reuse** |
| **2D Spatial Hash Grid** | `explorer/src/lib/layout/spacing.ts` | `SpatialGrid` class | $O(N)$ bucket grid for $O(1)$ candidate collision neighbor lookup | **Direct reuse** |
| **Collision Resolution Engine** | `explorer/src/lib/layout/spacing.ts` | `resolveSpacingAndCollisions(CleanupInput)` | `SpacingResult` with non-overlapping positions and displacement stats | **Direct reuse** |
| **Clearance Verification** | `explorer/src/lib/layout/metrics.ts` | `calculateLayoutMetrics` / `minimumNodeClearance` | Floating-point clearance validation with `1e-3` epsilon tolerance | **Direct reuse** |
| **Viewport Fitting & Centering**| `explorer/src/lib/graph-interactions.ts` | `fitToScreen`, `centerGraph`, `zoomToFit`, `panToNode` | Viewport animation and fitting | **Direct reuse** |
| **Bounding Box Regions** | `explorer/src/lib/architecture-layout.ts`, `explorer/src/lib/layout/types.ts` | `FeatureRegion` (`{ xMin, xMax, yMin, yMax, xCenter, yCenter }`) | Bounding box rects for features/domains | **Thin adapter** (Adapt for radial ring bounds if needed) |
| **Cohesion & Dispersion** | `explorer/src/lib/layout/features.ts` | `calculateSemanticFeatureCohesion` | Dispersion score and intra-feature distance | **Direct reuse** |

---

## 8. Worker Infrastructure

### Existing Worker Architecture
Web Worker offloading is handled by a worker client-server pair:
* **Client:** `LayoutWorkerClient` in `explorer/src/lib/workers/layout-worker-client.ts`.
* **Worker:** `layout.worker.ts` in `explorer/src/lib/workers/layout.worker.ts`.

### Message Contract
Communication is strictly typed via contracts defined in `explorer/src/lib/workers/layout-worker-types.ts`:

```typescript
// Request
export interface LayoutWorkerRequest {
  type: 'CALCULATE_LAYOUT';
  projectId: string;
  requestGeneration: number;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  options?: ArchitectureLayoutOptions;
}

// Response
export interface LayoutWorkerResponse {
  type: 'LAYOUT_SUCCESS' | 'LAYOUT_ERROR';
  projectId: string;
  requestGeneration: number;
  positions: Record<string, { x: number; y: number }>;
  featureRegionsSummary?: FeatureRegionSummary[];
  computeDurationMs: number;
  error?: string;
}
```

### Infrastructure Capabilities
1. **Cancellation:** `cancelPendingRequest(reason)` terminates active worker instances immediately upon project switch or new layout dispatch.
2. **Stale-Result Rejection:** Incoming responses are rejected if `response.requestGeneration !== latestRequestGeneration` or `response.projectId !== currentProjectId`.
3. **Automatic Fallback:** If Worker creation fails, `postMessage` throws, or worker computation errors, `LayoutWorkerClient` automatically executes `computeArchitectureLayoutWithMetadata` synchronously on the main thread.

### Orbit Worker Plan
Orbit can pass layout parameters (e.g. `layoutMode: 'orbit'`, concentric ring radius multipliers) inside `options` of `LayoutWorkerRequest`. The worker thread will execute Orbit layout logic and post back standard `positions`. **Zero changes to worker messaging protocols, cancellation logic, or IPC interfaces are required.**

---

## 9. Persistence Infrastructure

### Persistence Architecture
State persistence is managed by `explorer/src/lib/projectState.ts` with project isolation:
* **Storage Key:** `explorer.projectState.<projectId>` in `localStorage` (with in-memory fallback).
* **Load/Save Operations:** `loadProjectState(projectId)`, `saveProjectState(projectId, state)`, `updateProjectState(projectId, update)`.

### State Schema
Positions and layout modes are persisted inside `GraphLayoutState`:

```typescript
export interface GraphLayoutState {
  layoutName?: string;
  mode: GraphInteractionMode; // 'interactive' | 'static'
  architectureMode?: ArchitectureLayoutMode; // 'hierarchical' | 'hybrid'
  layoutProvenance?: LayoutProvenance; // 'automatic-hierarchical' | 'automatic-hybrid' | 'user-authored'
  nodePositions: Record<string, { x: number; y: number }>;
  layoutVersion?: string | number;
}
```

### Position Authority Policy (`explorer/src/lib/position-policy.ts`)
When graph elements load or update, positions are resolved using `resolveAuthoritativePosition`:
* **Level 1:** Explicit in-session user drag (`sessionPositionsRef`).
* **Level 2:** Persisted project state positions (`nodePositions`).
* **Level 3:** Existing Cytoscape canvas positions.
* **Level 4:** Calculated layout engine positions.
* **Level 5:** Deterministic fallback placement (`calculateDeterministicNewNodePosition`).

### Orbit Persistence Plan
Orbit layout positions must be captured via `captureAndPersistPositions('automatic-orbit')` and stored under `nodePositions` in `GraphLayoutState`. This ensures Orbit positions are persisted per project and restored correctly without interfering with hierarchical or hybrid layouts.

---

## 10. Reuse Matrix

| Capability | Existing Implementation | File / Function | Orbit Reuse | Adapter Needed | Risk | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Node/Edge Schema** | Canonical graph models | `explorer/src/types/explorer.ts` | **Direct reuse** | None | Low | `ExplorerNode`, `ExplorerEdge` interfaces |
| **Filtered Graph Selection** | Memoized search & filter selector | `explorer/src/lib/selectors/index.ts` (`selectFilteredGraph`) | **Direct reuse** | None | Low | Tested in `selectors.test.ts` |
| **Graph Building** | Cytoscape element builder | `explorer/src/lib/graph-builder.ts` (`buildGraphElements`) | **Direct reuse** | None | Low | Tested in `graph-builder.test.ts` |
| **Graph Indexing** | $O(1)$ adjacency & component index | `explorer/src/lib/layout/graph-index.ts` (`createLayoutGraphIndex`) | **Direct reuse** | None | Low | Tested in `graph-index.test.ts` |
| **Node Layer Classification** | Architectural layer classifier | `explorer/src/lib/layout/layers.ts` (`classifyNodeLayer`) | **Direct reuse** | None | Low | Tested in `layers.test.ts` |
| **Feature Role Classification** | 6-Role classification rules | `explorer/src/lib/layout/feature-roles.ts` (`classifyFeatureRole`) | **Direct reuse** | None | Low | Tested in `feature-roles.test.ts` |
| **Feature Cluster Discovery** | Deterministic seed & BFS expansion | `explorer/src/lib/layout/features.ts` (`discoverFeatures`) | **Direct reuse** | None | Low | Tested in `features.test.ts` |
| **Domain Discovery** | Domain stem & cluster discovery | `explorer/src/lib/layout/domains.ts` (`discoverDomains`) | **Direct reuse** | None | Low | Tested in `domains.test.ts` |
| **Centrality Analysis** | Degree, hub, bridge, centrality metrics | `explorer/src/lib/layout/centrality.ts` (`computeGraphCentralityAnalysis`) | **Direct reuse** | None | Low | Tested in `centrality.test.ts` |
| **Selection & Interactions** | Selection hook & Cytoscape bindings | `explorer/src/hooks/useGraphSelection.ts`, `graph-interactions.ts` | **Direct reuse** | None | Low | Tested in `graph-interactions.test.ts` |
| **Hover Cards & Highlights** | Hover card state & Cytoscape CSS classes | `explorer/src/components/GraphView.tsx` | **Direct reuse** | None | Low | Real-browser verified in Phase 15C |
| **Spatial Collision Cleanup** | 2D Spatial hash grid & overlap repair | `explorer/src/lib/layout/spacing.ts` (`resolveSpacingAndCollisions`) | **Direct reuse** | None | Low | Tested in `spacing.test.ts` |
| **Layout Offloading (Worker)** | Worker client with generation-ID rejection | `explorer/src/lib/workers/layout-worker-client.ts` | **Direct reuse** | Thin option flag | Low | Tested in `Phase3D-1` worker verification |
| **Position Authority Policy** | 5-level position authority engine | `explorer/src/lib/position-policy.ts` (`resolveAuthoritativePosition`) | **Direct reuse** | None | Low | Tested in `position-policy.test.ts` |
| **State Persistence** | Project-scoped `localStorage` state manager | `explorer/src/lib/projectState.ts` (`saveProjectState`) | **Direct reuse** | None | Low | Tested in `projectState.test.ts` |
| **Overlay Rendering** | Feature Region Canvas Overlay | `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` | **Thin adapter** | Radial bounding box adapter | Medium | Verified in FEAT-OVERLAY audit |
| **Layout Orchestrator Dispatch** | Pipeline orchestrator | `explorer/src/lib/architecture-layout.ts` (`computeArchitectureLayout`) | **Thin adapter** | Dispatch branch for Orbit | Medium | Tested in `architecture-layout.test.ts` |

---

## 11. Duplication Risks

If Architecture Orbit were implemented without leveraging existing infrastructure, the following duplication risks would occur:

1. **Duplicate Role / Layer Classification:** Re-implementing layer or role classification within Orbit would create diverging semantic rules (e.g., classifying a Service as a Controller in Orbit while it is classified as a Service in Matrix/Tree/Constellation).
   * *Existing Source of Truth:* `classifyFeatureRole` (`explorer/src/lib/layout/feature-roles.ts`) and `classifyNodeLayer` (`explorer/src/lib/layout/layers.ts`).
2. **Duplicate Feature Clustering:** Re-implementing feature grouping would cause Orbit cluster boundaries to disagree with Feature Matrix and Feature Overlay Canvas.
   * *Existing Source of Truth:* `discoverFeatures` (`explorer/src/lib/layout/features.ts`).
3. **Duplicate Graph Indexing:** Building a custom adjacency list or connected-component finder inside Orbit would duplicate memory and execution time.
   * *Existing Source of Truth:* `createLayoutGraphIndex` (`explorer/src/lib/layout/graph-index.ts`).
4. **Duplicate Visibility / Filtering Logic:** Creating Orbit-specific filter routines would cause nodes filtered out in GraphView to remain visible in Orbit.
   * *Existing Source of Truth:* `selectFilteredGraph` (`explorer/src/lib/selectors/index.ts`) and `applyFilters` (`explorer/src/lib/search-filter.ts`).
5. **Duplicate Collision Detection:** Re-inventing spatial collision detection or overlap removal would re-introduce known sub-pixel floating point precision issues resolved in Phase 18E.
   * *Existing Source of Truth:* `resolveSpacingAndCollisions` and `SpatialGrid` (`explorer/src/lib/layout/spacing.ts`).
6. **Duplicate Web Worker Communication:** Instantiating a second `Worker` instance or parallel message protocol would double IPC overhead and break stale-request cancellation.
   * *Existing Source of Truth:* `LayoutWorkerClient` (`explorer/src/lib/workers/layout-worker-client.ts`).
7. **Duplicate Position Persistence:** Creating a custom `localStorage` key for Orbit positions would violate project isolation and break static/interactive mode transitions.
   * *Existing Source of Truth:* `saveProjectState` and `loadProjectState` (`explorer/src/lib/projectState.ts`).
8. **Duplicate Position Authority Gate:** Bypassing `resolveAuthoritativePosition` would cause user drag positions to be overwritten on every filter toggle or window resize.
   * *Existing Source of Truth:* `resolveAuthoritativePosition` (`explorer/src/lib/position-policy.ts`).

---

## 12. Minimum New Infrastructure

To deliver Architecture Orbit safely and cleanly, the required new code is strictly bounded:

### Must Create (Genuinely New Infrastructure)
1. **Orbit Ring & Angle Geometry Module (`explorer/src/lib/layout/orbit-layout.ts`):**
   * Mathematical ring radius calculation, orbital node angle assignment, and concentric ring distribution based on architectural layers/roles.
2. **Orbit Layout Unit Tests (`explorer/src/test/orbit-layout.test.ts`):**
   * Determinism, non-overlapping coordinate generation, and metric contract tests.

### Can Adapt (Thin Adapters)
1. **Layout Mode Dispatcher (`explorer/src/lib/architecture-layout.ts`):**
   * Add dispatch branch: `if (options.layoutMode === 'orbit') return computeOrbitLayout(...)`.
2. **GraphView Mode Selector (`explorer/src/components/GraphView.tsx`, `GraphControls.tsx`):**
   * Register `'orbit'` in `ArchitectureLayoutMode` dropdown/toggle button.
3. **Feature Overlay Canvas Adapter (`explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`):**
   * Adapt overlay bounding box calculation for concentric/radial bounds if feature overlays are enabled in Orbit mode.

### Should Reuse (Direct Consumption)
1. **Graph Input Filtering:** `selectFilteredGraph` (`explorer/src/lib/selectors/index.ts`).
2. **Graph Indexing:** `createLayoutGraphIndex` (`explorer/src/lib/layout/graph-index.ts`).
3. **Semantic Classification:** `classifyFeatureRole` (`feature-roles.ts`), `classifyNodeLayer` (`layers.ts`), `discoverFeatures` (`features.ts`).
4. **Collision Cleanup:** `resolveSpacingAndCollisions` (`explorer/src/lib/layout/spacing.ts`).
5. **Worker Offloading:** `LayoutWorkerClient` (`explorer/src/lib/workers/layout-worker-client.ts`).
6. **Position Authority & Policy:** `resolveAuthoritativePosition` (`explorer/src/lib/position-policy.ts`).
7. **State Persistence:** `saveProjectState` / `loadProjectState` (`explorer/src/lib/projectState.ts`).
8. **Interactions & Cytoscape Rendering:** `bindGraphInteractions` (`explorer/src/lib/graph-interactions.ts`) and Cytoscape core instance in `GraphView.tsx`.

### Should Not Touch
1. **`dependency-analyzer.cjs` / CLI Scripts:** Core backend analyzer contracts and CJS scripts.
2. **`explorer-contract.ts` / Data Schemas:** Core contract definitions and schema specifications.
3. **`explorer/src/lib/intelligence/`:** Intelligence rules and finding generators.
4. **`explorer/src/lib/position-policy.ts` Core Invariants:** Position authority hierarchy levels and rules.
5. **Panel Internals:** Sidebar, SummaryBar, HotspotPanel, DiagnosticsPanel, FindingsPanel, ComparePanel (except mounting Orbit mode toggle).

---

## 13. Recommended Reuse Boundaries

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               EXISTING REUSE BOUNDARY                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [Graph Data & Selectors]   │  [Semantic Classification]  │  [Visibility & Filtering]  │
│  • ExplorerNode/Edge       │  • classifyFeatureRole()    │  • selectFilteredGraph()   │
│  • buildGraphElements()    │  • classifyNodeLayer()      │  • applyFilters()          │
│  • createLayoutGraphIndex()│  • discoverFeatures()        │  • FilteredGraphData       │
├────────────────────────────┼─────────────────────────────┼────────────────────────────┤
│  [Position Authority]      │  [Worker Offloading]        │  [Persistence & State]     │
│  • resolveAuthoritativePos │  • LayoutWorkerClient       │  • GraphLayoutState        │
│  • shouldAutoLayout()      │  • LayoutWorkerRequest      │  • saveProjectState()      │
│  • level 1-5 precedence    │  • layout.worker.ts         │  • loadProjectState()      │
├────────────────────────────┼─────────────────────────────┼────────────────────────────┤
│  [Interactions & Viewport] │  [Spatial Collision Engine] │  [Cytoscape Rendering]     │
│  • bindGraphInteractions() │  • SpatialGrid              │  • cy.batch() position set │
│  • useGraphSelection()     │  • resolveSpacingCollisions │  • Canvas LOD              │
└────────────────────────────┴─────────────────────────────┴────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           ORBIT MINIMUM NEW BOUNDARY                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [Must Create]                                                                         │
│  1. explorer/src/lib/layout/orbit-layout.ts (Orbital Ring Math & Coordinate Generator) │
│  2. explorer/src/test/orbit-layout.test.ts (Determinism & Metric Verification Suite) │
│                                                                                        │
│  [Thin Adapters Only]                                                                  │
│  1. Dispatcher hook in computeArchitectureLayout()                                     │
│  2. 'orbit' mode toggle in ArchitectureLayoutMode / GraphControls.tsx                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Evidence Index

| File Reference | Scope & Relevance | Verification Evidence |
| :--- | :--- | :--- |
| `explorer/src/components/GraphView.tsx` | Layout execution path, Cytoscape mounting, mode switching, position persistence | Verified live execution path in Section 2 |
| `explorer/src/lib/graph-layout.ts` | Layout orchestration (`runLayoutWithMetadata`, `runLayoutWithMetadataAsync`) | Verified synchronous and worker layout execution |
| `explorer/src/lib/architecture-layout.ts` | 13-Stage layout engine entry point | Verified dispatch orchestrator |
| `explorer/src/lib/graph-builder.ts` | Conversion of raw nodes/edges to Cytoscape element definitions | Verified node/edge element mapping |
| `explorer/src/lib/position-policy.ts` | 5-level Position Authority policy (`resolveAuthoritativePosition`, `shouldAutoLayout`) | Verified Level 1-5 precedence rules |
| `explorer/src/lib/projectState.ts` | Project-isolated `localStorage` persistence manager (`GraphLayoutState`, `saveProjectState`) | Verified state persistence schema |
| `explorer/src/lib/selectors/index.ts` | Memoized selectors (`selectFilteredGraph`, `selectDiscoveredFeatures`, `selectNodeLayers`) | Verified single source of truth for graph filtering |
| `explorer/src/lib/search-filter.ts` | Filter engine (`applyFilters`, `FilteredGraphData`, `SearchFilterState`) | Verified visibility filtering mechanisms |
| `explorer/src/lib/layout/graph-index.ts` | $O(1)$ Adjacency and connected component index (`LayoutGraphIndex`) | Verified graph indexing infrastructure |
| `explorer/src/lib/layout/layers.ts` | Architectural layer classifier (`classifyNodeLayer`) | Verified 5-tier layer classification |
| `explorer/src/lib/layout/feature-roles.ts` | Architectural feature role classifier (`classifyFeatureRole`) | Verified 6-tier role classification |
| `explorer/src/lib/layout/features.ts` | Deterministic seed ranking and BFS feature cluster discovery (`discoverFeatures`) | Verified feature discovery and assignment maps |
| `explorer/src/lib/layout/domains.ts` | Domain cluster discovery (`discoverDomains`) | Verified domain clustering engine |
| `explorer/src/lib/layout/centrality.ts` | Graph centrality analysis (`computeGraphCentralityAnalysis`) | Verified degree/hub/bridge centrality calculations |
| `explorer/src/lib/layout/spacing.ts` | 2D Spatial Grid collision resolution (`resolveSpacingAndCollisions`, `SpatialGrid`) | Verified spatial collision cleanup engine |
| `explorer/src/lib/layout/metrics.ts` | Spacing clearance calculation (`minimumNodeClearance`) with `1e-3` epsilon | Verified 40px clearance contract enforcement |
| `explorer/src/lib/workers/layout-worker-client.ts` | Async worker manager (`LayoutWorkerClient`, request generation rejection, fallback) | Verified Web Worker offloading client |
| `explorer/src/lib/workers/layout.worker.ts` | Web Worker thread entry point | Verified background thread execution |
| `explorer/src/lib/workers/layout-worker-types.ts` | Typed worker message contracts (`LayoutWorkerRequest`, `LayoutWorkerResponse`) | Verified worker IPC type safety |
| `explorer/src/hooks/useGraphSelection.ts` | Interactive node/edge selection state hook | Verified selection state context |
| `explorer/src/lib/graph-interactions.ts` | Viewport controls (`fitToScreen`, `focusOnNode`, `highlightNodeConnections`, `highlightCycle`) | Verified graph interactions and CSS highlighting |
