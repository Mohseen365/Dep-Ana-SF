# ARCHITECTURE VISUALIZATION, STORY, EVOLUTION & 3D FEASIBILITY AUDIT

## 1. Executive Summary & Context

This document provides a comprehensive, **READ-ONLY feasibility audit** of high-level architectural visualization concepts for the **Salesforce Architecture Explorer & Dependency Analyzer**. It evaluates candidate capabilities requiring guided explanation, architectural pattern recognition, comparison, historical information/diffing, and 3D/spatial representations.

### Context Baseline & Codebase State
* **Canonical Benchmark Dataset**: `audit-fixtures/cloud-spend-tracker/explorer-data.json` (SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`), containing **240 nodes** and **1,024 edges** across 4 architectural layers (`presentation`: 26, `application`: 50, `domain`: 32, `schema`: 132) and **13 discovered feature regions**.
* **Active 2D Layout Pipeline**: 13-stage deterministic layout engine (`explorer/src/lib/architecture-layout.ts`) providing **Default Hierarchical** ($C_{total} = 102,780$ crossings) and **Authoritative Hybrid** ($C_{total} = 85,367$ crossings) layouts with strict physical node clearance ($\ge 40.0\text{px}$) and $0.00000\text{px}$ coordinate stability.
* **Position Authority Contract**: Enforced by `explorer/src/lib/position-policy.ts` across a 5-level hierarchy (Level 1 Session Drag > Level 2 Persisted > Level 3 Canvas > Level 4 Layout Calculation > Level 5 System Fallback).
* **Previous 3D Investigation Baseline**: Formally closed under `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md`. Previous 3D investigations evaluated perspective projections of 2D $(X,Y)$ coordinates with $Z$ mapped to layer or role elevation, demonstrating that camera projections increase visible screen-space crossings by +4.1% to +40.6% over the 2D baseline.

---

## 2. Audit Story Visualizations

### A. Architecture Story Mode
Architecture Story Mode is a guided step-by-step traversal mechanism that leads a user along a logical architectural stack or dependency flow:

```text
Feature
 → LWC (Presentation)
 → Controller / ApexClass (Application)
 → Service / ApexClass (Domain)
 → Shared Service (Shared Infrastructure)
 → Selector / ApexClass (Domain Data Access)
 → Object / CustomObject (Schema)
 → Field / CustomField (Schema)
 → Cross-feature dependencies
```

#### Capability Audit of Current Subsystems

1. **Selection & Focus (`explorer/src/lib/focus-graph.ts`, `explorer/src/components/FocusControls.tsx`)**:
   * **Current State**: `computeFocusGraph()` supports depth-based neighborhood isolation (depth 1 to 5), direction filtering (`upstream`, `downstream`, `both`), and focal node tracking (`focalNodeId`).
   * **Story Support**: Fully capable of driving step-by-step focal node transitions. Stepping from an LWC node down to its Controller and Service uses existing 1-hop downstream focus routines.

2. **Filtering & Node Type Visibility (`explorer/src/lib/search-filter.ts`)**:
   * **Current State**: Filter state supports filtering by node types (`ApexClass`, `CustomField`, `CustomObject`, `LWC`, `ApexTrigger`, `External`), layers (`presentation`, `application`, `domain`, `schema`), and feature membership.
   * **Story Support**: High. Story Mode can activate pre-set filter masks at each step (e.g., masking out `CustomField` until reaching the Field stage of the story).

3. **Navigation & Breadcrumbs (`explorer/src/components/Breadcrumbs.tsx`)**:
   * **Current State**: Breadcrumb history tracks navigation steps and project paths.
   * **Story Support**: Capable of recording the active story traversal sequence as a structured linear path.

4. **Panels & Detail Views (`explorer/src/components/Sidebar.tsx`, `InvestigationDrawer.tsx`)**:
   * **Current State**: Sidebar displays complete node metadata, incoming/outgoing edges, metrics, and risk scores.
   * **Story Support**: Readily supports story text overlays, step explanations, and architectural callouts.

5. **Graph State & Traversal (`explorer/src/lib/projectState.ts`)**:
   * **Current State**: Manages state transitions synchronously.
   * **Gap**: Lacks an automated "Story Orchestrator" state machine (e.g., step index, automated camera pan/zoom animations, step narrative text).

#### Verdict: **FEASIBLE WITH EXISTING DATA & UI (REQUIRES STORY ORCHESTRATOR)**
All graph data, traversal algorithms, focus mechanics, and metadata needed for Story Mode exist today. Creating Story Mode requires building a UI state driver and narrative overlay, without changing graph algorithms or backend schemas.

---

### B. Architecture Pattern / Grammar View

Evaluating pattern recognition against graph semantics to detect canonical patterns such as:
* **Standard Tier Pattern**: `Feature → LWC → Service → Selector → CustomObject`
* **Shared Service Fan-In Pattern**: `Feature A / B / C → Shared Service`

#### Pattern Detection Classification Matrix

| Pattern / Grammar Structure | Graph Signals & Metadata Required | Feasibility Classification |
| :--- | :--- | :--- |
| **LWC → Controller (1:1 / 1:N)** | Edge `type: 'CALLS'` / `'DEPENDS_ON'`, source `LWC`, target `ApexClass` | **Exactly Detectable** |
| **Controller → Service** | Layer progression `presentation → application/domain`, class naming / metrics | **Derivable** |
| **Service → Selector** | Edge `CALLS`, target handling query patterns or `Selector` naming / domain layer | **Derivable** |
| **Selector → CustomObject** | Edge `READS_FROM` / `WRITES_TO` / `REFERENCES` from `ApexClass` to `CustomObject` | **Exactly Detectable** |
| **Shared Service Fan-In (`SharedInfra`)** | Node `featureRole === 'SharedInfrastructure'`, fan-in $\ge$ threshold, multi-feature incoming edges | **Exactly Detectable** |
| **Full Canonical Pipeline (`Feature → LWC → Service → Selector → Object`)** | Multi-hop directed acyclic path traversal across 4 layers within feature bounds | **Derivable** |
| **Circular Architectural Anti-Patterns** | Graph cycle detection (`cycles` array in `ExplorerDataSchema` / `diff-adapter.ts`) | **Exactly Detectable** |
| **Implicit / Dynamic Runtime Invocation** | Unresolved references or dynamic string Apex instantiation (`Type.forName`) | **Heuristic** |
| **Intentional Design Patterns (e.g., Unit of Work, Factory)** | High-level architectural intent without naming or structural signatures | **Not Currently Possible** |

#### Classification Definitions & Audit Findings
* **Exactly Detectable**: Nodes and edges explicitly carry typed labels (`LWC`, `ApexClass`, `CustomObject`, `READS_FROM`, `CALLS`, `featureRole: SharedInfrastructure`).
* **Derivable**: Structural paths across layers (`presentation → application → domain → schema`) can be extracted deterministically using path-finding functions in `explorer/src/lib/path-analyzer.cjs` and `graph-builder.ts`.
* **Heuristic**: Inferred through naming conventions (`*Selector`, `*Controller`, `*Service`) or fan-in score heuristics.
* **Requires New Algorithm**: Pattern matching engine that scans the DAG for topological motif templates (e.g., matching subgraph isomorphism against pre-defined grammar rules).
* **Not Currently Possible**: High-level developer intent that leaves no static reflection or structural footprint in Salesforce metadata.

---

## 3. Audit Comparison

### Feature Comparison Capability
Comparing two features (e.g., `Feature A` vs `Feature B`) requires side-by-side metric and structural aggregation.

#### Data Dimension Audit for Feature Comparison

| Comparison Dimension | Current Data Availability | Extraction Method / Source |
| :--- | :--- | :--- |
| **Component Count** | Fully Available | Count nodes where `node.featureId === feature.id` |
| **Services / Controllers** | Fully Available | Filter feature nodes by `layer === 'application'` or `'domain'` |
| **Selectors** | Fully Available | Filter feature nodes by `type === 'ApexClass'` with query metrics/naming |
| **Custom Objects** | Fully Available | Filter feature nodes by `type === 'CustomObject'` or schema boundary |
| **Custom Fields** | Fully Available | Filter feature nodes by `type === 'CustomField'` |
| **Internal Dependencies** | Fully Available | Count edges where both `source` and `target` belong to feature |
| **External Dependencies** | Fully Available | Count edges where `source` or `target` is outside feature |
| **Shared Components Used** | Fully Available | Target nodes connected to feature with `featureRole === 'SharedInfrastructure'` |
| **Cross-Feature Connections** | Fully Available | Inter-feature edges identified in Stage 3.5 feature analysis |

#### UI State & Layout Support
* **Current UI Capability**: The codebase already features a `ComparePanel.tsx` (`explorer/src/components/ComparePanel.tsx`) and `FINAL_PROJECT_ISOLATION_COMPARE_AUDIT.md` for cross-project comparison.
* **Feature Comparison Support**: Current UI state (`projectState.ts`) supports single-project active focus. Side-by-side feature comparison requires mounting two parallel feature summaries in a split panel or overlay view.
* **Verdict**: **IMMEDIATELY FEASIBLE WITH EXISTING DATA (NEW UI DETAIL VIEW)**. Zero backend changes needed; requires dedicated side-by-side feature comparison component.

---

## 4. Audit Architecture Diff

### Scope & Repository Capabilities
Architecture diffing evaluates changes between two graph states (Snapshot Before vs Snapshot After):
* Added / Removed Nodes
* Added / Removed Edges
* Changed Categories / Node Types
* Changed Feature Membership / Roles

#### Existing Infrastructure Verification
* **Backend Engine**: `architecture-diff.cjs` exists in the repository root and exports `diffSnapshots(before, after, options)`.
* **Frontend Adapter**: `explorer/src/lib/diff-adapter.ts` exports `diffSnapshots()` and `buildDiffOverlayGraph(before, after, diffResult)`.
* **Data Types**: `DiffResult`, `DiffOverlayNode`, `DiffOverlayEdge`, `DiffOverlayGraph` are fully defined in `diff-adapter.ts`.
* **Diff States Handled**:
  - `added` (Nodes/Edges present in `after` but not `before`)
  - `removed` (Nodes/Edges present in `before` but not `after`)
  - `changed` (Property/Metric changes on matching node IDs)
  - `unchanged` (Identical nodes/edges)

#### Snapshot Requirements
* Architecture diffing **requires two distinct snapshot payloads** (`beforeSnapshot` and `afterSnapshot`).
* The current repository does **NOT** automatically store historical snapshot series for a project.
* When provided with two snapshots (e.g., via file upload, project comparison, or refactoring simulation before/after states), the existing `diff-adapter.ts` builds a complete merged overlay graph.

#### Verdict: **FEASIBLE WITH EXISTING ENGINE (REQUIRES SNAPSHOT STORAGE / INPUT)**
The diff analysis engine and visual diff overlay models are fully implemented in `diff-adapter.ts`. The missing link is persistence/ingestion of multiple historical project snapshots.

---

## 5. Audit Time Machine

The "Time Machine" concept assumes scrubbing through a temporal slider (e.g., Commit $T_1 \rightarrow T_2 \rightarrow T_3$) to view architectural evolution over time.

### Audit Checklist

| Requirement | Current Codebase Status | Findings |
| :--- | :--- | :--- |
| **Historical Graph Snapshots** | **MISSING** | `projectState.ts` stores only the active `ExplorerDataSchema` payload. |
| **Versioned Metadata** | **MISSING** | Analysis outputs carry `analyzerVersion` (13.0.0), but no git/temporal commit history. |
| **Timestamps** | **PARTIAL** | `exportedAt` ISO timestamp exists on exported projects; no series data. |
| **Stable Node IDs** | **PRESENT** | Node IDs are deterministic (`Type:Name` or `CustomField:Object.Field`). |
| **Previous Architecture States** | **MISSING** | Codebase contains no temporal database or git commit snapshot parser. |

### Verdict: **BLOCKED BY CURRENT DATA**
The Time Machine capability cannot function without a time-series store or multi-snapshot repository versioning pipeline. The current architecture supports single-snapshot state.

---

## 6. Audit 3D Visualizations

Four candidate 3D spatial models are evaluated individually against the 12 required audit dimensions.

---

### 3D Model A: Feature × Flow × Sharedness

```text
X = Feature Region
Y = Dependency Flow / Layer Tier
Z = Sharedness / Reuse Score
```

#### Detailed Dimension Analysis
1. **Data Required**: Node `featureId`, Node `layer` (`presentation`..`schema`), Node `metrics.fanIn` / `featureRole`.
2. **Existing Support**: All three dimensions are calculated in Stage 1–3.5 of `architecture-layout.ts`.
3. **Derivable Support**: Node $X, Y$ positions from 2D Stage 11; $Z = \text{fanIn} \times \text{weight}$ or $Z = \text{roleElevation}$.
4. **Missing Support**: 3D rendering pipeline (WebGL / Three.js / R3F canvas).
5. **Rendering**: Requires WebGL instanced mesh rendering and 3D fatline edge shaders. Cytoscape 2D cannot render Model A.
6. **Layout**: Reuses 2D $(X,Y)$ coordinates; $Z$ is computed via deterministic semantic mapping.
7. **Interaction**: Requires 3D orbit, pitch, yaw, zoom, and 3D raycasting hit detection.
8. **Performance**: 240 nodes / 1,024 edges render at 60 FPS in WebGL.
9. **Position Authority**: Compatible if $(X,Y)$ is locked to Level 1–5 authority in `position-policy.ts` and $Z$ is strictly derived.
10. **Accessibility**: Screen readers cannot parse 3D WebGL canvases without an accessible 2D HTML tabular fallback.
11. **Previous 3D Evidence**: Previous testing (`PHASE_3D_EVIDENCE_SCREEN_SPACE_SEMANTIC_VALIDATION.md`) demonstrated that elevating high-reuse nodes into $Z$ creates a "pin-cushion" effect where incoming edges from all $X,Y$ features pierce intermediate space, increasing visible screen crossings.
12. **New Evidence Required**: Empirical testing of camera tilt angles to verify if perspective foreshortening outweighs crossing separation.

---

### 3D Model B: Feature × Category × Depth

```text
X = Feature Region
Y = Architecture Category / Layer
Z = Dependency Depth (Topological Rank / Distance from Entry Point)
```

#### Detailed Dimension Analysis
1. **Data Required**: Node `featureId`, Node `type`/`layer`, Node topological depth / shortest path from entry points (`entry-points.cjs`).
2. **Existing Support**: Layer classifications and entry point detection exist in `entry-points.cjs` and `architecture-layout.ts`.
3. **Derivable Support**: $Z = \text{topologicalRank}(node)$ derived via BFS DAG traversal.
4. **Missing Support**: WebGL renderer and 3D camera controls.
5. **Rendering**: WebGL canvas overlay required.
6. **Layout**: Reuses 2D $(X,Y)$ for feature/category layout; $Z$ represents clean DAG topological depth.
7. **Interaction**: 3D orbit and layer slicing / Z-plane clamping controls.
8. **Performance**: Excellent performance in WebGL due to stratified Z-planes.
9. **Position Authority**: Preserves 2D $(X,Y)$ authority; $Z$ is derived deterministically from DAG depth.
10. **Accessibility**: Depth information must be exposed in a hierarchical tree view in the panel UI.
11. **Previous 3D Evidence**: Evaluated as Model A in `3D_ARCHITECTURE_GRAPH_FEASIBILITY_INVESTIGATION.md`. Z-depth layer stacking separates layers into parallel planes, but cross-layer vertical edges pierce intermediate Z-space, increasing camera-projected crossings by +4.1% to +40.6%.
12. **New Evidence Required**: Testing orthographic side-profile projection ($Y, Z$ view) to determine if it functions effectively as a static detail view.

---

### 3D Model C: Feature × Category × Cross-Feature Connectivity

```text
X = Feature Region
Y = Architecture Category / Layer
Z = Cross-feature Connectivity (Inter-feature Edge Count)
```

#### Detailed Dimension Analysis
1. **Data Required**: Node `featureId`, Node `layer`, Count of edges where `edge.target.featureId !== node.featureId`.
2. **Existing Support**: Inter-feature edge counts calculated in Stage 3.5 & Stage 4 (`centralityMap`).
3. **Derivable Support**: $Z = \text{interFeatureEdgeCount}(node) \times \Delta Z$.
4. **Missing Support**: WebGL runtime engine and 3D raycasting.
5. **Rendering**: Requires WebGL renderer.
6. **Layout**: 2D $(X,Y)$ coordinates preserved; highly connected nodes protrude upwards towards the camera in $Z$.
7. **Interaction**: 3D orbit and hover spotlighting.
8. **Performance**: Fast WebGL execution.
9. **Position Authority**: Read-only $Z$ projection keeps Level 1–5 2D position authority uncorrupted.
10. **Accessibility**: High-connectivity nodes must be listed in the Hotspot / Diagnostics panel.
11. **Previous 3D Evidence**: Similar to Centrality Stacking (Model C in `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md`). Protruding central nodes draw long cross-cutting edges across the scene.
12. **New Evidence Required**: Verification whether visual height protrusion aids rapid hotspot identification better than 2D node coloring or heatmaps.

---

### 3D Architecture City

```text
Feature = Neighborhood / District
Component = Building (Height = Complexity / Lines of Code, Footprint = Metrics)
Shared Infrastructure = Tower / Landmark
Dependency = Road / Power Line
```

#### Detailed Dimension Analysis
1. **Data Required**: Feature regions (neighborhoods), Node type/size metrics (buildings), Shared utilities (towers), Directed relationships (roads/links).
2. **Existing Support**: Feature discovery (`discoverFeatures`), node metrics (`fanIn`, `fanOut`, `score`, `linesOfCode`), edge relationships.
3. **Derivable Support**: Spatial placement of district bounding boxes and 3D block geometry (`width`, `length`, `height`).
4. **Missing Support**: Procedural 3D city layout engine (Treemap / 2D spatial bin packing for 3D extrusion), 3D building/road shaders, WebGL engine.
5. **Rendering**: Complex WebGL / Three.js 3D mesh rendering with building textures, lighting, and ground plane roads.
6. **Layout**: **CANNOT** reuse 2D Cytoscape graph layout. Requires dedicated 3D spatial layout engine (e.g. 2D N-body treemap layout extruded into 3D height blocks).
7. **Interaction**: 3D ground-level / drone fly-through camera navigation, building click selection, district isolation.
8. **Performance**: Heavy GPU geometry overhead (thousands of polygons for building extrusion and road networks).
9. **Position Authority**: **INCOMPATIBLE WITH CURRENT 2D POSITION AUTHORITY**. City layout uses spatial area packing rather than DAG node-edge coordinates.
10. **Accessibility**: Low. Requires complete tabular summary of all districts and buildings.
11. **Previous 3D Evidence**: Not previously tested in Phase 3D. Represents a completely distinct metaphor (metaphorical spatial city vs topological graph DAG).
12. **New Evidence Required**: Full prototype testing to evaluate user engagement vs cognitive navigation friction.

---

## 7. 3D Audit Requirements Breakdown

Summary of technical dimensions across all 3D concepts:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       3D TECHNICAL DIMENSION MATRIX                     │
├──────────────────┬──────────────────────┬───────────────────────────────┤
│ Dimension        │ Models A, B, C       │ 3D Architecture City          │
├──────────────────┼──────────────────────┼───────────────────────────────┤
│ Layout Baseline  │ Reuses 2D (X, Y)     │ Dedicated 3D Treemap Engine   │
│ Z Computation    │ Deterministic Mapping│ Extruded Metric Height        │
│ Position Policy  │ Preserves Level 1-5  │ Incompatible with 2D Policy   │
│ Rendering Tech   │ WebGL / Three.js     │ WebGL / Shaders / Textures    │
│ Crossing Impact  │ +4.1% to +40.6%      │ Replaces edges with roads     │
│ Primary Purpose  │ Topological Overview │ Metaphorical Overview         │
└──────────────────┴──────────────────────┴───────────────────────────────┘
```

---

## 8. Important 3D Rule Analysis

Per Section 8 of the audit specification, we explicitly distinguish between:

1. **Previously Tested Projections**:
   * *Phase 3D Testing Scope*: In `PHASE_3D_EVIDENCE_SCREEN_SPACE_SEMANTIC_VALIDATION.md` and `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md`, offline mathematical projection tests evaluated 2D $(X,Y)$ coordinates with deterministic $Z$ derived from layer or role elevation.
   * *Finding*: When projected through a camera matrix onto a 2D viewport, visible line segment crossings increased from **85,367** (2D baseline) up to **91,087–123,078** (+4.1% to +40.6%).
   * *Conclusion*: 3D camera projection of a 2D DAG does **NOT** solve line crossing density in overview modes.

2. **New Semantic Models**:
   * **Model A (Sharedness in Z)**, **Model C (Cross-Feature in Z)**, and **3D Architecture City** represent *materially different* semantic or visual concepts.
   * While Model A/C still project 3D lines onto a 2D screen, their goal is *spatial dimension encoding* (e.g., visual height = reuse) rather than *planar edge crossing reduction*.
   * **3D Architecture City** abandons line-edge graph topology entirely, replacing lines with ground-plane roads and nodes with 3D buildings.

3. **Current Infrastructure Capabilities**:
   * Current codebase carries zero WebGL / Three.js dependencies.
   * Rendering engine is 2D Canvas (Cytoscape.js) + SVG Overlay (`FeatureOverlayCanvas.tsx`).

4. **New Evidence Required**:
   * Any future 3D prototype must evaluate *cognitive task speed* and *spatial memory recall* rather than edge crossing reduction.

---

## 9. Master Matrix

| Visualization | Data Support | Existing UI | Existing Rendering | Historical Data | New Analysis | 3D Infrastructure | Feasibility |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Story Mode** | Fully Supported | Partially Supported | Fully Supported | Not Required | Not Required | Not Required | **Immediately Feasible** |
| **Pattern View** | Fully Supported | Partially Supported | Fully Supported | Not Required | Derivable Patterns | Not Required | **Feasible with existing data but new UI** |
| **Feature Comparison** | Fully Supported | Partially Supported | Fully Supported | Not Required | Aggregation Analysis | Not Required | **Feasible with existing data but new UI** |
| **Architecture Diff** | Fully Supported | Fully Supported (`diff-adapter.ts`) | Fully Supported | Required (2 Snapshots) | Snapshot Engine Exists | Not Required | **Feasible with existing data (Requires multi-snapshot input)** |
| **Time Machine** | Missing Data | Missing UI | Fully Supported | Required (Time Series) | History Tracking | Not Required | **Blocked by Current Data** |
| **3D Feature × Flow × Sharedness** | Fully Supported | Missing UI | Missing Rendering | Not Required | Derived Z Metric | Required (WebGL) | **Experimental** |
| **3D Feature × Category × Depth** | Fully Supported | Missing UI | Missing Rendering | Not Required | Derived Depth | Required (WebGL) | **Experimental** |
| **3D Feature × Category × Cross-Feature** | Fully Supported | Missing UI | Missing Rendering | Not Required | Derived Connectivity | Required (WebGL) | **Experimental** |
| **3D Architecture City** | Fully Supported | Missing UI | Missing Rendering | Not Required | Treemap Area Layout | Required (WebGL + Shaders) | **Experimental** |

---

## 10. Final Assessment & Classification

### Category Breakdown

#### 1. Immediately Feasible
* **Architecture Story Mode**: Data, graph focus, depth filtering, selection, and panels fully exist today. Can be built immediately as a UI driver/orchestrator component on top of current graph state.

#### 2. Feasible with Existing Data but New UI / Rendering
* **Architecture Pattern / Grammar View**: Node types, edge types, layers, and feature roles support exact and derivable pattern extraction (`Feature → LWC → Service → Selector → CustomObject`). Requires building dedicated pattern view cards / highlights in the UI.
* **Feature Comparison**: All metrics, component counts, dependency counts, and shared infrastructure usage exist per feature. Requires building a side-by-side comparison UI component.
* **Architecture Diff**: Diff engine (`architecture-diff.cjs`) and frontend adapter (`diff-adapter.ts`) are fully built. Ingesting two snapshots produces a complete diff overlay graph.

#### 3. Requires New Analysis
* **Automated Grammar Motif Matching**: Advanced graph pattern matching that scans large DAGs for custom design pattern implementations beyond standard layer paths.

#### 4. Requires Historical Data
* **Time Machine**: Blocked by absence of time-series graph snapshot persistence or git commit metadata tracking.

#### 5. Experimental
* **3D Model A (Sharedness)**, **Model B (Depth)**, **Model C (Cross-Feature)**: Mechanically derivable from current 2D layout and metadata, but require introducing WebGL/Three.js rendering infrastructure. Must remain strictly experimental.
* **3D Architecture City**: Requires a procedural spatial area treemap layout engine and WebGL shaders. Materially different metaphor that abandons topological DAG edges for city blocks and roads.

#### 6. Blocked
* **Time Machine Navigation**: **BLOCKED BY CURRENT DATA** until snapshot history storage is introduced.

---

### Architectural Placement & Guidance

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       RECOMMENDED SYSTEM ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────────┤
│ Primary Graph Canvas (2D Cytoscape + SVG Overlays)                      │
│   ├── Production Default: 2D Hierarchical / Hybrid Layout              │
│   ├── Overview Views: Feature Region Overlays, Heatmaps, MiniMap       │
│   └── Detail Views: Neighborhood Focus, Impact Analysis, Diff Overlay  │
├─────────────────────────────────────────────────────────────────────────┤
│ Guided & Analytic Sidecars (New UI Components)                         │
│   ├── Story Mode Orchestrator (Guided Step-by-Step Traversal)           │
│   ├── Feature Comparison Panel (Side-by-Side Metrics)                   │
│   └── Pattern / Grammar View (Structural Path Highlights)               │
├─────────────────────────────────────────────────────────────────────────┤
│ Isolated Experimental Viewports (Non-Production / Optional)            │
│   └── WebGL 3D Prototype (Model A/B/C / City metaphor detail view)      │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **Complement, Do Not Replace 2D**:
   * The 2D Cytoscape + SVG overlay canvas is the authoritative, production-proven layout foundation (0.00000 px drift, strict 40.0 px clearance, Level 1–5 position authority).
   * **None** of the 3D concepts should be treated as replacements for the primary 2D graph.

2. **Overview vs. Detail Views**:
   * **Overview Views**: 2D Multi-row Hybrid Layout, Feature Overlays, and Pattern View highlights.
   * **Detail Views**: Story Mode, Feature Comparison Panel, Focus/Neighborhood Graph, and Architecture Diff overlay.
   * **Experimental Exploration**: 3D Models (A, B, C, City) should exist exclusively as isolated, feature-flagged detail inspection modes or prototype sandboxes.

---

## 11. Final Summary Statement

```text
NO PRODUCTION CODE CHANGED
NO LAYOUT ALGORITHM CHANGED
NO POSITION AUTHORITY CHANGED
NO PROJECT STATE CHANGED
NO FIXTURE CHANGED
NO WEBGL DEPENDENCY ADDED
ONE AUDIT REPORT CREATED: ARCHITECTURE_VISUALIZATION_STORY_EVOLUTION_3D_AUDIT.md
```
