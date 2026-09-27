# PHASE 3 — ARCHITECTURE VISUALIZATION ANALYSIS
## TREEMAP + DEPENDENCY RIVER/SANKEY + ARCHITECTURE SUBWAY
### ANALYSIS ONLY — DO NOT IMPLEMENT

---

## 1. SCOPE

This document delivers the authoritative **Phase 3 Architectural Visualization Analysis** for the Salesforce Architecture Explorer & Dependency Analyzer, covering three advanced visual lenses:

1. **Architecture Treemap**
2. **Dependency River / Sankey**
3. **Architecture Subway Map**

### Governance Directive & Boundaries

* **AUTHORIZATION**: This report constitutes **ANALYSIS ONLY**.
* **NO IMPLEMENTATION PERFORMED**: Zero production source files, adapters, renderers, tests, layout algorithms, schemas, project state modules, Position Authority policies, benchmark files, or visualization frameworks have been created, modified, or deleted.
* **OBJECTIVE**: To establish the reusable capability surface, classify required engineering capabilities, analyze hierarchy and flow semantics, identify genuinely new spatial algorithms, evaluate scaling and Position Authority boundaries, and define a dependency-aware implementation roadmap for future authorization.

---

## 2. CONTEXT SOURCES CONSULTED

In accordance with the Context-First Requirement, context retrieval followed the authoritative repository source hierarchy. Current production source code and executed runtime evidence were treated as ground truth over historical planning narratives.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               CONTEXT SOURCE HIERARCHY                                   │
├──────┬─────────────────────────────────────────┬─────────────────────────────────────────┤
│ Rank │ Source File                             │ Domain & Role                           │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 1    | Current Production Source Code          | Absolute Ground Truth                   │
│      | (`explorer/src/`, `dependency-analyzer`) | (`types/explorer.ts`, `position-policy`)|
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 2    │ `AGENT.md`                              │ Primary Task Router                     │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 3    │ `08_Audit_Source_Register.md`           │ Master Index of 200 Audit Artifacts     │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 4    │ `ARCHITECTURE_VISUALIZATION_FINAL_      │ Authoritative Strategy Baseline         │
│      │ SYNTHESIS.md`                           │                                         │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 5    │ `ARCHITECTURE_VISUALIZATION_FINAL_      │ Verification & Integrity Audit          │
│      │ SYNTHESIS_INTEGRITY_AUDIT.md`           │                                         │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 6    │ `ARCHITECTURE_VISUALIZATION_            │ Dependency-Aware Execution Roadmap      │
│      │ IMPLEMENTATION_ROADMAP.md`              │                                         │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 7    │ `ARCHITECTURE_VISUALIZATION_PHASE0_     │ Baseline Contracts Specification        │
│      │ IMPLEMENTATION_CONTRACT.md`             │                                         │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 8    │ Phase 1 Adapter Synthesis Reports       │ `PHASE 1 — MATRIX`, `PROFILE`, `RADAR`,  │
│      │                                         │ `TREE`, `PHASE_1_ADAPTER_STATE...`      │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 9    │ Phase 2 Matrix Implementation &         │ `PHASE_2_MATRIX_RENDERER_...`           │
│      │ Browser Verification Reports            │                                         │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 10   │ Phase 2 Tree Implementation &           │ `PHASE_2_TREE_RENDERER_...`             │
│      │ Browser Verification Reports            │                                         │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 11   │ Phase 2 Profile Implementation &        │ `PHASE_2_PROFILE_RENDERER_...`          │
│      │ Browser Verification Reports            │                                         │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 12   │ Phase 2 Radar Implementation &          │ `PHASE_2_RADAR_RENDERER_...`, `RADAR_   │
│      │ Safety Verification Reports             │ DATA_SEMANTIC_VERIFICATION.md`          │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 13   │ Phase 2 Architecture DNA Implementation │ `PHASE_2_ARCHITECTURE_DNA_...`          │
│      │ & Audit Reports                         │                                         │
├──────┼─────────────────────────────────────────┼─────────────────────────────────────────┤
│ 14   │ Phase 2 Authorization & Discovery       │ `PHASE_2_NEXT_LENS_AUTHORIZATION_       │
│      │ Reports                                 │ DISCOVERY.md`                           │
└──────┴─────────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 3. CURRENT ARCHITECTURE BASELINE

Before evaluating the three Phase 3 lenses, the actual reusable foundation was established by inspecting active production source code in `explorer/src/`:

### 3.1 Data Contracts & Schema Validation
* **Canonical Graph Schema** (`explorer/src/types/explorer.ts`): Defines `ExplorerNode`, `ExplorerEdge`, `ExplorerSummary`, `ExplorerNodeMetrics`, `ExplorerNodeBehavior`, `ExplorerEdgeCanonical`, and `ExplorerComponentImpactSummary`. Fully typed for 10 Salesforce metadata entity types (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`) and 21 relationship types (`method-call`, `instantiation`, `type-reference`, `SOQL`, `DML`, `lwc-apex`, `trigger-handler`, `visualforce-controller`, etc.).
* **Runtime Zod Contract** (`explorer/src/lib/schema.ts`): Enforces `ExplorerDataSchemaZ` Zod validation in $< 5\text{ ms}$ over canonical datasets, ensuring schema integrity.

### 3.2 Position Authority & Layout Policy
* **5-Level Position Authority Policy** (`explorer/src/lib/position-policy.ts`): Enforces strictly non-destructive coordinate precedence: Level 1 (Session Drag) > Level 2 (Persisted Project State) > Level 3 (Existing Cytoscape Canvas Position) > Level 4 (Intelligent Layout Calculation) > Level 5 (Deterministic Fallback Grid Placement).
* **Layout Orchestrator** (`explorer/src/lib/architecture-layout.ts`): 13-stage deterministic layout generator computing Stage 12 coordinates for Hierarchical ($189.37\text{ ms}$ cold run) and Hybrid ($231.14\text{ ms}$ cold run) modes with $0.00000\text{ px}$ coordinate drift across 10x repeat sweeps and input shuffles.

### 3.3 Analytics & Intelligence Foundation
* **Layout Graph Index** (`explorer/src/lib/layout/graph-index.ts`): $O(1)$ pre-indexed graph lookups providing `nodeById`, `outgoingEdges`, `incomingEdges`, `incidentNeighborsByNode`, `parentProductionNodeId`, and `parentObjectId`.
* **Semantic Feature Discovery** (`explorer/src/lib/layout/features.ts`): `discoverFeatures()` clusters primary production components into cohesive semantic feature clusters (`FeatureCluster`), assigning each component a primary feature ID (`assignments`).
* **Feature Role Classifier** (`explorer/src/lib/layout/feature-roles.ts`): `classifyFeatureRole()` categorizes components into 6 canonical feature roles (`FeatureAnchor`, `FeatureCore`, `FeatureData`, `FeatureBridge`, `FeatureTest`, `SharedInfrastructure`).
* **Feature Dependency Matrix & 2D Ordering** (`explorer/src/lib/layout/feature-ordering.ts`): `buildFeatureDependencyMatrix()` computes direct edge weights, shared infrastructure weights, directional flow, and cross-feature combined weights. `compute2DFeatureBandOrdering()` partitions features into 4 layer bands (`presentation`, `application`, `domain`, `schema`) and computes 2D spatial band positions.
* **Architectural Layer Classifier** (`explorer/src/lib/layout/layers.ts`): `classifyNodeLayer()` assigns components to vertical layer bands.
* **Domain Discovery** (`explorer/src/lib/layout/domains.ts`): `discoverDomains()` extracts domain stems and assigns components to functional domains.
* **Centrality Engine** (`explorer/src/lib/centrality.ts`): `computeGraphCentralityAnalysis()` computes hub scores, bridge scores, and connected domain sets.
* **Hotspot Detector** (`explorer/src/lib/hotspots.ts`): `getArchitecturalHotspots()` ranks components by coupling, risk level, circular cycles, and unresolved references.
* **Impact Analysis Engine** (`explorer/src/lib/impact-analysis.ts`): `calculateImpactAnalysis()` computes direct and transitive blast radius closures.
* **Neighborhood Isolation** (`explorer/src/lib/focus-graph.ts`): `computeFocusedGraph()` extracts $k$-hop neighborhoods across `dependencies`, `dependents`, or `both` directions.

### 3.4 Established Phase 1 & 2 Adapter Surface
* **Matrix Adapter** (`explorer/src/lib/adapters/matrix-adapter.ts`): Transforms canonical schema into $N \times N$ feature coupling matrix (`FeatureMatrixData`).
* **Tree Adapter** (`explorer/src/lib/adapters/tree-adapter.ts`): Transforms $k$-hop paths into hierarchical DAG tree structures (`DependencyTreeData`).
* **Profile Adapter** (`explorer/src/lib/adapters/profile-adapter.ts`): Extracts 360-degree component profile records (`ComponentProfileData`).
* **Radar Adapter** (`explorer/src/lib/adapters/radar-adapter.ts`): Converts component metrics into 9-dimension normalized radial polygon points (`RadarPanel.tsx`).
* **DNA Adapter** (`explorer/src/lib/adapters/dna-adapter.ts`): Converts component metrics into 7-band normalized structural barcode vectors (`ArchitectureDNABarcode.tsx`).

### 3.5 State & Persistence Foundation
* **Project State Manager** (`explorer/src/lib/projectState.ts`): Manages project-isolated state in `localStorage` (`explorer.projectState.<projectId>`) across 9 state dimensions.

---

## 4. CAPABILITY CLASSIFICATION

Every capability required across the three Phase 3 lenses is classified according to the mandatory 8-tier taxonomy:

* **A. Already implemented**: Existing production capability directly provides it.
* **B. Already calculated**: Exists in canonical graph data or analytics but requires transformation.
* **C. Reusable**: Existing infrastructure can be consumed without altering its semantics.
* **D. Adapter-only**: Only a thin pure transformation is required to expose existing information.
* **E. Renderer-only**: Data exists; only visualization/presentation logic is new.
* **F. New algorithm**: A genuinely new analytical or spatial algorithm is required.
* **G. New infrastructure**: New rendering/runtime infrastructure is required.
* **H. Unknown / requires prototype**: Insufficient evidence exists.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                            CAPABILITY CLASSIFICATION MATRIX                              │
├──────────────────────────┬─────────────────────────┬──────────────────┬──────────────────┤
│ Required Capability      │ Architecture Treemap    │ River / Sankey   │ Architecture     │
│                          │                         │                  │ Subway Map       │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ Component Metadata       │ A (Already implemented) │ A                │ A                │
│ Feature Discovery        │ A (Already implemented) │ A                │ A                │
│ Feature Roles            │ A (Already implemented) │ A                │ A                │
│ Layer Classification     │ A (Already implemented) │ A                │ A                │
│ Centrality Hubs/Bridges  │ A (Already implemented) │ A                │ A                │
│ Node Metric Extraction   │ B (Already calculated)  │ B                │ B                │
│ Feature Edge Matrix      │ B (Already calculated)  │ B                │ B                │
│ Hierarchy Aggregation    │ D (Adapter-only)        │ D                │ D                │
│ Lens Data Contract       │ D (Adapter-only)        │ D                │ D                │
│ Tile / Region Bounds     │ F (New algorithm)       │ N/A              │ N/A              │
│ Flow Y-Offset Allocation │ N/A                     │ F (New algorithm)│ N/A              │
│ Bézier Ribbon Geometry   │ N/A                     │ F (New algorithm)│ N/A              │
│ Octilinear Line Router   │ N/A                     │ N/A              │ F (New algorithm)│
│ Station Track Offset     │ N/A                     │ N/A              │ F (New algorithm)│
│ Lens UI Component        │ E (Renderer-only)       │ E (Renderer-only)│ E (Renderer-only)│
└──────────────────────────┴─────────────────────────┴──────────────────┴──────────────────┘
```

---

## 5. ARCHITECTURE TREEMAP ANALYSIS

### 5.1 Hierarchy
An Architecture Treemap visualizes the proportion of codebase footprint occupied by architectural groupings.

#### Evaluated Hierarchy Candidates
1. **Domain $\rightarrow$ Feature $\rightarrow$ Component**: 3-level nesting. Supported by `discoverDomains()` and `discoverFeatures()`.
2. **Feature $\rightarrow$ Component**: 2-level nesting. Supported directly by `discoverFeatures()` in `features.ts`.
3. **Layer $\rightarrow$ Feature $\rightarrow$ Component**: 3-level nesting. Supported by `classifyNodeLayer()` and `discoverFeatures()`.
4. **Role $\rightarrow$ Component**: 2-level nesting based on `classifyFeatureRole()`.

#### Authoritative Selection & Justification
The authoritative hierarchy appropriate for an Architecture Treemap is **`FeatureCluster` $\rightarrow$ `ExplorerNode`** (or optionally **`ArchitectureLayer` $\rightarrow$ `FeatureCluster` $\rightarrow$ `ExplorerNode`**).

**Justification**: `discoverFeatures()` in `features.ts` deterministically partitions components into 21 semantic business clusters (`FeatureCluster`), while `classifyNodeLayer()` in `layers.ts` assigns components to 4 vertical architectural layers (`presentation`, `application`, `domain`, `schema`). Grouping components by semantic feature clusters matches how architects evaluate functional module weight, whereas grouping by architectural layer highlights structural layer distribution. No new hierarchy needs to be created because `FeatureCluster.primaryNodeIds` and `FeatureCluster.secondaryNodeIds` already specify exact membership.

### 5.2 Size Metric
The size metric controls the area ($Width \times Height$) of each treemap rectangle tile.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                            TREEMAP SIZE METRIC CANDIDATES                                │
├─────────────────────┬──────────────────────┬─────────────┬──────────────┬────────────────┤
│ Size Metric         │ Source Location      │ Native Unit │ Exists Now?  │ Aggregation    │
├─────────────────────┼──────────────────────┼─────────────┼──────────────┼────────────────┤
│ Component Count     │ Node existence       │ Integer     │ YES (A)      │ Available O(N) │
│ Total Coupling      │ node.metrics.coupling│ Edges       │ YES (B)      │ Available O(N) │
│ Fan-In (Caller Mass)│ node.metrics.fanIn   │ Edges       │ YES (B)      │ Available O(N) │
│ Fan-Out (Callee Mass│ node.metrics.fanOut  │ Edges       │ YES (B)      │ Available O(N) │
│ Risk Score          │ node.metrics.score   │ Score points│ YES (B)      │ Available O(N) │
│ DML / Query Count   │ node.behavior.*Count │ DB ops      │ YES (B)      │ Available O(N) │
└─────────────────────┴──────────────────────┴─────────────┴──────────────┴────────────────┘
```

**Evaluation**:
* All six size metrics already exist in `ExplorerNode.metrics` or `ExplorerNode.behavior`.
* Aggregation is simple summation over member nodes: $Weight(\text{Feature}) = \sum_{v \in \text{Feature}} Weight(v)$.
* **NO NEW CALCULATION REQUIRED**; only summation in a thin adapter.
* **NO COMPOSITE SIZE SCORE** will be invented.

### 5.3 Color / Secondary Encoding
Color provides a secondary visual dimension across rectangle tiles.

* **Authoritative Metric**: `node.risk` (`'HIGH'` | `'MEDIUM'` | `'LOW'`) mapped directly to design system risk colors (`var(--color-risk-high)`, `var(--color-risk-medium)`, `var(--color-risk-low)`).
* **Derived Aggregation**: Feature-level risk density calculated as the percentage of `HIGH` risk components within the feature cluster:
  $$\text{RiskDensity}(F) = \frac{|\{ v \in F \mid v.\text{risk} == \text{'HIGH'} \}|}{|F|}$$
* **Presentation-Only Normalization**: Mapping scalar node coupling (`node.metrics.coupling`) or risk score (`node.metrics.score`) linearly into a $[0.0, 1.0]$ color opacity or hue ramp.

### 5.4 Spatial Algorithm
* **Required Treemap Algorithm**: **Squarified Treemap Layout Algorithm** (Bruls, Huizing, van Wijk).
* **Codebase Verification**: Zero treemap or squarified layout code exists in `explorer/src/`.
* **Input**: Hierarchical node tree with rectangular bounding container $(X_0, Y_0, W, H)$ and node weights $w_i$.
* **Output**: Tile coordinate map `Record<string, { x: number, y: number, width: number, height: number }>` for container regions and leaf rectangles.
* **Stability & Determinism**: Leaf nodes and feature clusters must be sorted deterministically by weight descending with lexicographical ID tie-breaking (`sort((a,b) => b.weight - a.weight || a.id.localeCompare(b.id))`).
* **Complexity**: $O(N \log N)$ where $N$ is total leaf node count.
* **Scaling Considerations**: At $N = 240$ (Cloud Spend scale), sub-pixel rendering is avoided. At $N > 1,000$, leaf rectangles become small ($< 15\text{px}$ width), requiring text label suppression and semantic zoom LOD truncation.
* **Position Authority Interaction**: **100% Renderer-Local**. The treemap layout operates purely in SVG/DOM view space. It does NOT invoke `position-policy.ts`, does NOT write coordinates to Cytoscape, and does NOT alter 2D graph layout state.

### 5.5 Position Authority Impact
The Architecture Treemap remains strictly renderer-local. It reads node metrics as read-only inputs and renders HTML5 SVG/DOM rectangle elements. It does NOT register as a Cytoscape position authority.

---

## 6. DEPENDENCY RIVER / SANKEY ANALYSIS

### 6.1 Flow Semantics
Dependency River / Sankey visualizes the structural flow volume of static dependencies moving between architectural stages or feature boundaries.

#### Flow Candidates
1. **Layer-to-Layer Dependency Flows**: Static calls crossing vertical architectural layers ($\text{Presentation} \rightarrow \text{Application} \rightarrow \text{Domain} \rightarrow \text{Schema}$).
2. **Feature-to-Feature Dependency Flows**: Directed call volumes between semantic business features ($F_1 \rightarrow F_2$).
3. **Domain-to-Domain Dependency Flows**: Inter-subsystem dependency streams.

#### Authoritative Source
`ExplorerEdge[]` aggregated via `buildFeatureDependencyMatrix()` in `explorer/src/lib/layout/feature-ordering.ts`, which pre-computes `directWeights` ($E_{f1 \rightarrow f2}$), `directionalFlow`, and `sharedNodeWeights`.

### 6.2 Nodes / Stages
* **Stages (Columns)**:
  * Option A: Architectural Layers (4 stages: Presentation, Application, Domain, Schema).
  * Option B: Feature Columns (ordered horizontally via `compute2DFeatureBandOrdering()`).
* **Nodes Within Stages**: Feature clusters or layer-bucketed component groups placed vertically within their stage column.
* **Flows**: Directed ribbons connecting stage nodes, with ribbon height proportional to edge count.

### 6.3 Flow Weight
* **Reused Value**: Direct edge count ($E_{\text{count}}$) connecting source and target stage nodes.
* **Source**: `buildFeatureDependencyMatrix().directWeights.get(f1).get(f2)`.
* **Native Unit**: Integer count of static directional edges.
* **NO NEW FLOW SCORES** will be invented.

### 6.4 Spatial Algorithm

#### Existing Reusable Logic
* Architectural layer classification (`classifyNodeLayer()` in `layers.ts`).
* Feature discovery (`discoverFeatures()` in `features.ts`).
* Cross-feature edge weighting (`buildFeatureDependencyMatrix()` in `feature-ordering.ts`).
* Stage node ordering (barycentric sweeps in `ordering.ts`).

#### Genuinely New Spatial Algorithms Required
1. **Sankey Band & Y-Offset Allocation Algorithm**: Allocates vertical Y coordinates and heights for stage nodes such that node height equals total incoming/outgoing flow volume:
   $$\text{Height}(v) = \max\left(\sum w_{\text{in}}, \sum w_{\text{out}}\right) \cdot \text{scaleFactor}$$
2. **Flow Crossing Minimization & Bézier Ribbon Routing Algorithm**: Computes source/target port Y-offsets within each node and generates cubic Bézier ribbon SVG paths (`M x0 y0 C x1 y1, x2 y2, x3 y3 L x3 y4 C x2 y5, x1 y6, x0 y7 Z`).

### 6.5 Scaling
* **Cloud Spend Scale ($N=240, E=1,024$)**:
  * Layer-to-Layer: 4 stages, 3 layer transition corridors, ~12 flow streams. Low density, 60 FPS SVG rendering.
  * Feature-to-Feature: 21 features, ~150 active directed feature-to-feature flows. Higher ribbon density requiring interactive hover highlighting to isolate specific streams.
* **Computational Complexity**: $O(S \cdot N \log N + E^2)$ where $S$ is stage count, $N$ is stage node count, $E$ is flow ribbon count.
* **Rendering Complexity**: ~150 SVG `<path>` elements with gradient fills. Sub-millisecond SVG transform scaling.

---

## 7. ARCHITECTURE SUBWAY MAP ANALYSIS

### 7.1 Semantic Model
An Architecture Subway Map projects dependency relationships into subway line tracks and stations.

* **A "Line" Represents**: A functional feature cluster (`FeatureCluster`), or an execution flow path (LWC $\rightarrow$ Controller $\rightarrow$ Service $\rightarrow$ Selector).
* **Authoritative Source**: `discoverFeatures()` in `features.ts` (discovers 21 feature clusters).

### 7.2 Stations
* **Regular Stations**: Individual production components (`ExplorerNode`) belonging exclusively to a feature line.
* **Interchange Stations**: `SharedInfrastructure` components (high fan-in utilities connected to $\ge 2$ features) or `FeatureBridge` components connecting multiple lines.
* **Authoritative Source**: `classifyFeatureRole()` in `feature-roles.ts` and `computeGraphCentralityAnalysis()` in `centrality.ts` (`isBridge`, `isHub`, `connectedDomains`).

### 7.3 Connections
* **Line Tracks**: Directed static dependency edges (`ExplorerEdge`) connecting sequential stations along a feature path.
* **Graph Relationships Preserved**: `method-call`, `instantiation`, `soql-object`, `lwc-apex`, `trigger-handler`.
* **NO FAKE RELATIONSHIPS** will be created.

### 7.4 Spatial Algorithm

#### Existing Reusable Logic
* Feature discovery (`discoverFeatures()` in `features.ts`).
* Interchange node classification (`feature-roles.ts` and `centrality.ts`).
* 2D Feature band ordering (`compute2DFeatureBandOrdering()` in `feature-ordering.ts`).
* Adjacency graph indexing (`createLayoutGraphIndex()` in `graph-index.ts`).

#### Genuinely New Spatial Algorithms Required
1. **Subway Station & Line Sequence Ordering Algorithm**: Sequences stations along each feature line in topological execution order (Anchor $\rightarrow$ Core $\rightarrow$ Data).
2. **Octilinear Polyline Routing & Crossing Minimization Algorithm**: Routes multi-line subway tracks along strictly $0^\circ, 45^\circ, 90^\circ$ octilinear vector segments while allocating parallel track offsets to prevent line overlap.
3. **Subway Station Label & Offset Placement Algorithm**: Positions station labels and interchange markers cleanly without label collisions.

### 7.5 Crossing Behavior
* **Crossing Count Infrastructure**: `fastEdgeCrossingCount` / `calculateDetailedEdgeCrossings` in `metrics.ts` measures 2D segment crossings.
* **Subway Crossing Minimization**: The octilinear line routing algorithm must minimize track crossings and enforce $90^\circ$ perpendicular line intersections at interchange stations.

---

## 8. CROSS-LENS COMPARISON MATRIX

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                CROSS-LENS CAPABILITY MATRIX                              │
├──────────────────────────┬─────────────────────────┬──────────────────┬──────────────────┤
│ Capability / Risk        │ Architecture Treemap    │ River / Sankey   │ Architecture     │
│                          │                         │                  │ Subway Map       │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ Existing Data            │ ExplorerNode, Metrics,  │ ExplorerEdge,    │ ExplorerNode,    │
│                          │ Risk, Behavior          │ RelationshipType │ ExplorerEdge     │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ Existing Analytics       │ discoverFeatures(),     │ classifyNodeLayer│ discoverFeatures │
│                          │ classifyNodeLayer()     │ feature-matrix   │ feature-roles    │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ Existing Adapter Reusable│ profile-adapter.ts      │ matrix-adapter.ts│ profile-adapter  │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ Adapter-Only Work        │ TreemapData adapter     │ SankeyData adapt │ SubwayData adapt │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ Renderer-Only Work       │ SVG/DOM Tile Renderer   │ SVG Ribbon Canvas│ SVG Track Canvas │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ New Spatial Algorithm    │ Squarified Treemap      │ Sankey Y-Offset  │ Octilinear Line  │
│                          │ Layout                  │ & Bézier Routing │ Routing Engine   │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ New Infrastructure       │ Treemap Layout Module   │ Flow Ribbon Canvas│ Octilinear Router │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ Position Authority Risk  │ ZERO (Renderer Local)   │ ZERO (Renderer)  │ ZERO (Renderer)  │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ Scaling Risk             │ Sub-pixel label clip    │ Flow density at  │ Track clutter at │
│                          │ at N > 1,000            │ E > 2,000        │ N > 500          │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ Determinism Risk         │ ZERO (Weight + ID sort) │ ZERO (Sorted)    │ ZERO (Sorted)    │
├──────────────────────────┼─────────────────────────┼──────────────────┼──────────────────┤
│ Algorithmic Complexity   │ O(N log N)              │ O(S N log N + E²)│ O(L S²)          │
└──────────────────────────┴─────────────────────────┴──────────────────┴──────────────────┘
```

---

## 9. EXPLICIT NEW-SPATIAL-ALGORITHM REGISTER

The forensic analysis confirms that exactly **four genuinely new spatial algorithms** are required across the three Phase 3 lenses.

### 9.1 Algorithm 1 — Squarified Treemap Layout Engine
1. **Algorithm Name**: `computeSquarifiedTreemapLayout`
2. **Affected Lens**: Architecture Treemap
3. **Purpose**: Partitions a 2D rectangular container $(X_0, Y_0, W, H)$ into golden-ratio aspect ratio tile rectangles representing feature and component weight.
4. **Inputs**: Hierarchical node tree (`FeatureCluster[]` + member `ExplorerNode[]`), container dimensions $(W, H)$, size metric selection (`componentCount` | `coupling` | `fanIn` | `riskScore`).
5. **Outputs**: Rectangle bounds map `Map<string, { x: number, y: number, width: number, height: number }>`.
6. **Existing Reusable Primitives**: `discoverFeatures()` in `features.ts`, `ExplorerNode.metrics`.
7. **Why Existing Layout Cannot Be Reused**: `architecture-layout.ts` calculates node-link network graph positions $(X,Y)$, whereas treemap layout calculates non-overlapping contiguous space-filling tessellation rectangles.
8. **Deterministic Requirements**: Inputs sorted by weight descending with lexicographical ID tie-breaking (`sort((a,b) => b.weight - a.weight || a.id.localeCompare(b.id))`). $0.00000\text{ px}$ coordinate drift across runs.
9. **Complexity Considerations**: $O(N \log N)$ time, $O(N)$ space.
10. **Expected Failure Modes**: Degenerate zero-weight nodes (handled by $\epsilon = 1.0$ weight floor); sub-pixel tile bounds at $N > 1,000$ (handled by label suppression threshold).
11. **Position Authority Implications**: 100% renderer-local. Zero Cytoscape position authority mutation.
12. **Infrastructure Type**: Renderer-local layout utility (`explorer/src/lib/layout/treemap-layout.ts`).
13. **Prototype Requirement**: No prototype required; algorithm is well-specified.

### 9.2 Algorithm 2 — Sankey Band & Y-Offset Allocation Engine
1. **Algorithm Name**: `computeSankeyBandYOffsets`
2. **Affected Lens**: Dependency River / Sankey
3. **Purpose**: Computes vertical node heights and Y-port offsets for flow ribbon sources and targets within architectural stage columns.
4. **Inputs**: Stage node columns, feature flow weights matrix (`directWeights`), column dimensions.
5. **Outputs**: Node vertical bounds `{ yMin, yMax, height }` and flow port offsets `{ sourceY, targetY, ribbonHeight }`.
6. **Existing Reusable Primitives**: `classifyNodeLayer()` in `layers.ts`, `buildFeatureDependencyMatrix()` in `feature-ordering.ts`.
7. **Why Existing Layout Cannot Be Reused**: Existing Stage 7 local layout calculates fixed-size $120 \times 60$ node grid boxes, whereas Sankey nodes require variable height proportional to total incident flow mass.
8. **Deterministic Requirements**: Deterministic stage node sorting by layer rank and cross-stage flow barycenter.
9. **Complexity Considerations**: $O(S \cdot N \log N)$ where $S$ is stage count and $N$ is stage node count.
10. **Expected Failure Modes**: Tall single-node stages inflating canvas height (handled by maximum stage height capping).
11. **Position Authority Implications**: 100% renderer-local view space.
12. **Infrastructure Type**: Renderer-local layout utility (`explorer/src/lib/layout/sankey-layout.ts`).
13. **Prototype Requirement**: No prototype required.

### 9.3 Algorithm 3 — Flow Crossing Minimization & Bézier Ribbon Router
1. **Algorithm Name**: `generateSankeyBézierRibbons`
2. **Affected Lens**: Dependency River / Sankey
3. **Purpose**: Generates smooth 2D cubic Bézier ribbon SVG paths connecting stage port Y-offsets while minimizing ribbon crossings.
4. **Inputs**: Source/target port Y-offsets, stage X coordinates, flow weights.
5. **Outputs**: Array of SVG path definitions (`d="M x0 y0 C x1 y1, x2 y2, x3 y3 L ... Z"`), opacity levels, and color gradients.
6. **Existing Reusable Primitives**: `buildFeatureDependencyMatrix()` flow weights.
7. **Why Existing Layout Cannot Be Reused**: Cytoscape renders straight/curved single-pixel edges, whereas Sankey requires filled variable-width 2D ribbon polygons.
8. **Deterministic Requirements**: Sorted flow ribbon rendering order.
9. **Complexity Considerations**: $O(E^2)$ crossing minimization pass where $E$ is flow ribbon count.
10. **Expected Failure Modes**: Heavy ribbon overlap on dense graphs (handled by interactive hover isolation).
11. **Position Authority Implications**: 100% renderer-local.
12. **Infrastructure Type**: Renderer-local SVG path generator.
13. **Prototype Requirement**: No prototype required.

### 9.4 Algorithm 4 — Octilinear Polyline Routing & Subway Track Engine
1. **Algorithm Name**: `computeOctilinearSubwayRoutes`
2. **Affected Lens**: Architecture Subway Map
3. **Purpose**: Routes feature line tracks along $0^\circ, 45^\circ, 90^\circ$ octilinear grid vectors with parallel track offsets and station interchange alignments.
4. **Inputs**: Line clusters (`FeatureCluster[]`), station components (`ExplorerNode[]`), interchange classification maps, grid spacing parameters.
5. **Outputs**: Station grid coordinates $(x,y)$, octilinear line track polyline paths, interchange marker coordinates, label offsets.
6. **Existing Reusable Primitives**: `discoverFeatures()` in `features.ts`, `classifyFeatureRole()` in `feature-roles.ts`, `computeGraphCentralityAnalysis()` in `centrality.ts`.
7. **Why Existing Layout Cannot Be Reused**: Network layout engines (`architecture-layout.ts`) place nodes freely in 2D Euclidean space, whereas subway routing requires strict octilinear grid snapping and parallel track bundle offset calculations.
8. **Deterministic Requirements**: Deterministic grid snapping and track sorting. $0.00000\text{ px}$ drift.
9. **Complexity Considerations**: $O(L \cdot S^2)$ where $L$ is line count and $S$ is station count per line.
10. **Expected Failure Modes**: High line crossing density on dense cross-feature graphs (handled by perpendicular $90^\circ$ track crossing constraints).
11. **Position Authority Implications**: 100% renderer-local view.
12. **Infrastructure Type**: Renderer-local layout utility (`explorer/src/lib/layout/octilinear-router.ts`).
13. **Prototype Requirement**: No prototype required.

---

## 10. REUSE-FIRST IMPLEMENTATION MAP

```text
Canonical Graph (`ExplorerDataSchema`) [EXISTING]
      ↓
Existing Analytics / Index (`graph-index`, `features`, `layers`, `centrality`) [EXISTING]
      ↓
Thin Lens Adapter (`treemap-adapter`, `sankey-adapter`, `subway-adapter`) [NEW ADAPTER-ONLY]
      ↓
Typed Lens Data (`TreemapData`, `SankeyData`, `SubwayData`) [NEW CONTRACT]
      ↓
New Spatial Algorithm (`treemap-layout`, `sankey-layout`, `octilinear-router`) [NEW ALGORITHM]
      ↓
Renderer Component (`TreemapView`, `DependencyRiverView`, `SubwayMapView`) [NEW RENDERER-ONLY]
```

### Identified Existing Boxes
1. **Canonical Graph**: `ExplorerDataSchema` (`explorer/src/types/explorer.ts`).
2. **Existing Analytics**: `createLayoutGraphIndex` (`graph-index.ts`), `discoverFeatures()` (`features.ts`), `classifyNodeLayer()` (`layers.ts`), `classifyFeatureRole()` (`feature-roles.ts`), `computeGraphCentralityAnalysis()` (`centrality.ts`), `buildFeatureDependencyMatrix()` (`feature-ordering.ts`).
3. **Existing Position Authority**: `resolveAuthoritativePosition()` (`position-policy.ts`).
4. **Existing State Manager**: `projectState.ts`.

---

## 11. POSITION AUTHORITY ANALYSIS

All three Phase 3 lenses were audited against `explorer/src/lib/position-policy.ts`:

1. **Renderer-Local Isolation**: All three lenses operate strictly as read-only view projections. They receive `ExplorerDataSchema` and optional Level 1–5 coordinates as read-only inputs.
2. **Zero Position Authority Mutation**: None of the three lenses write node coordinates back into `localStorage.explorer.projectState.<projectId>.graphLayout.nodePositions`, nor do they call Cytoscape position setters.
3. **Static Mode & Interaction Safety**: Switching to Treemap, River/Sankey, or Subway view does NOT trigger `shouldAutoLayout()` or alter the 2D layout engine state. When the user returns to the main 2D dependency graph view, Level 1 (Session Drag) and Level 2 (Persisted Project State) positions remain 100% intact with $0.00000\text{ px}$ coordinate drift.
4. **Prevention Rules for Future Implementation**:
   * Lens adapters must return standalone immutable view models.
   * Lens renderers must render inside dedicated SVG/DOM containers decoupled from Cytoscape canvas elements.
   * Lens state updates must NOT invoke `updateGraphLayout()` in `projectState.ts`.

---

## 12. PERFORMANCE / SCALING ANALYSIS

### Measured Baseline Evidence
* **Cloud Spend Tracker Benchmark Dataset**: 240 nodes, 1,024 edges, SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`.
* **Cold Layout Pipeline Execution**: $189.37\text{ ms}$ (Hierarchical) / $231.14\text{ ms}$ (Hybrid).
* **Analytics Pass Latencies**:
  * Feature Discovery (`discoverFeatures`): $16.16\text{ ms}$.
  * Layer Classification (`classifyNodeLayer`): $< 2.00\text{ ms}$.
  * Centrality Analysis (`computeGraphCentrality`): $< 3.00\text{ ms}$.
  * Feature Matrix Aggregation (`buildFeatureDependencyMatrix`): $< 10.00\text{ ms}$.

### Lens-Specific Scaling Analysis

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                            PERFORMANCE & SCALING ANALYSIS                                │
├─────────────────────┬──────────────────────────┬──────────────────────┬──────────────────┤
│ Visualization Lens  │ Computational Hotspot    │ Rendering Hotspot    │ Scaling Limits   │
├─────────────────────┼──────────────────────────┼──────────────────────┼──────────────────┤
│ Architecture Treemap│ Squarified aspect ratio  │ SVG DOM tile count   │ N > 1,000 leaves │
│                     │ recursion O(N log N)     │ (N rect elements)    │ (sub-pixel text) │
├─────────────────────┼──────────────────────────┼──────────────────────┼──────────────────┤
│ Dependency River /  │ Flow crossing            │ SVG Bézier ribbon    │ E > 2,000 flows  │
│ Sankey              │ minimization O(E²)       │ path fills           │ (ribbon clutter) │
├─────────────────────┼──────────────────────────┼──────────────────────┼──────────────────┤
│ Architecture Subway │ Octilinear grid routing  │ Multi-track SVG      │ N > 500 stations │
│ Map                 │ O(L S²)                  │ polyline paths       │ (track crossings)│
└─────────────────────┴──────────────────────────┴──────────────────────┴──────────────────┘
```

#### Engineering Expectations & Hypotheses (Unmeasured)
* **Treemap Execution Expectation**: Calculating squarified bounds for 240 nodes will execute in $< 5\text{ ms}$.
* **Sankey Execution Expectation**: Y-offset allocation and Bézier path generation for 150 feature flows will execute in $< 12\text{ ms}$.
* **Subway Execution Expectation**: Octilinear routing for 21 feature lines will execute in $< 25\text{ ms}$.

---

## 13. FUTURE IMPLEMENTATION BOUNDARIES

To provide clear specifications for future implementation prompts, exact boundaries are defined for each lens:

### 13.1 Architecture Treemap

#### Required Later
* `explorer/src/lib/adapters/treemap-adapter.ts` (transforms canonical schema into `TreemapData`).
* `explorer/src/lib/layout/treemap-layout.ts` (squarified treemap layout engine).
* `explorer/src/components/views/TreemapView.tsx` (React DOM/SVG treemap component).

#### Reusable Now
* `discoverFeatures()` in `features.ts`.
* `classifyNodeLayer()` in `layers.ts`.
* `ExplorerNode.metrics` (`coupling`, `fanIn`, `fanOut`, `score`).
* `ExplorerNode.risk` (`HIGH`, `MEDIUM`, `LOW`).

#### Optional / Presentation-Only
* Interactive size metric toggle (`Component Count` vs `Coupling` vs `Risk Score`).
* Color scheme toggle (`Risk Level` vs `Layer Tiers` vs `Feature Roles`).

#### Genuinely New
* Squarified treemap layout calculation engine.

#### Must NOT Be Changed
* `ExplorerDataSchema` in `types/explorer.ts`.
* `position-policy.ts`.
* `architecture-layout.ts`.

---

### 13.2 Dependency River / Sankey

#### Required Later
* `explorer/src/lib/adapters/sankey-adapter.ts` (transforms graph into `SankeyData`).
* `explorer/src/lib/layout/sankey-layout.ts` (Sankey Y-offset allocation and Bézier ribbon router).
* `explorer/src/components/views/DependencyRiverView.tsx` (React SVG river flow component).

#### Reusable Now
* `classifyNodeLayer()` in `layers.ts`.
* `buildFeatureDependencyMatrix()` in `feature-ordering.ts`.
* `ordering.ts` barycentric sweep logic.

#### Optional / Presentation-Only
* Flow ribbon gradient fills and opacity controls.
* Interactive flow stream isolation on hover.

#### Genuinely New
* Variable-height stage node Y-offset allocation.
* Cubic Bézier ribbon SVG geometry generator.

#### Must NOT Be Changed
* Canonical edge relationships (`ExplorerEdge[]`).
* Position Authority policy (`position-policy.ts`).

---

### 13.3 Architecture Subway Map

#### Required Later
* `explorer/src/lib/adapters/subway-adapter.ts` (transforms features into `SubwayData`).
* `explorer/src/lib/layout/octilinear-router.ts` (octilinear polyline router engine).
* `explorer/src/components/views/SubwayMapView.tsx` (React SVG subway map view).

#### Reusable Now
* `discoverFeatures()` in `features.ts`.
* `classifyFeatureRole()` in `feature-roles.ts`.
* `computeGraphCentralityAnalysis()` in `centrality.ts`.
* `createLayoutGraphIndex()` in `graph-index.ts`.

#### Optional / Presentation-Only
* Line track toggle checkboxes in sidebar.
* Station tooltip hover cards.

#### Genuinely New
* Octilinear grid routing engine.
* Multi-line parallel track offset allocator.

#### Must NOT Be Changed
* Core layout orchestrator (`architecture-layout.ts`).
* Canonical node/edge contracts.

---

## 14. RISKS AND UNKNOWNS

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                   RISKS AND UNKNOWNS                                     │
├──────────────────────┬──────────────────────────────────┬────────────────────────────────┤
│ Area / Risk          │ Description                      │ Mitigation Strategy            │
├──────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ Treemap Label Clip   │ Small tiles at N > 1,000 cause   │ Semantic zoom LOD text         │
│                      │ text overflow & label overlap.   │ truncation below 20px width.   │
├──────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ Sankey Flow Clutter  │ High edge density (E > 1,024)    │ Interactive flow stream        │
│                      │ creates ribbon hairballs.        │ isolation on hover/click.      │
├──────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ Subway Track Crossing│ Multi-feature line intersections │ Enforce 90-degree perpendicular│
│                      │ generate line crossing clutter.  │ track crossings at interchanges.│
├──────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ Renderer Memory      │ Complex SVG paths on large orgs  │ Clean DOM unmounting and       │
│                      │ consuming memory.                │ React memoization.             │
└──────────────────────┴──────────────────────────────────┴────────────────────────────────┘
```

---

## 15. RECOMMENDED IMPLEMENTATION SEQUENCING

The recommended future implementation sequence is ordered strictly by prerequisite dependencies, technical reuse, and algorithmic complexity:

```text
1. Architecture Treemap (Lowest Complexity)
   ├── Prerequisite: Existing discoverFeatures() + profile-adapter
   ├── New Work: Thin TreemapAdapter + Squarified Layout Engine + SVG Treemap Component
   └── Justification: Pure space-filling layout with zero edge routing complexity.

2. Dependency River / Sankey (Moderate Complexity)
   ├── Prerequisite: Existing buildFeatureDependencyMatrix() + matrix-adapter
   ├── New Work: Thin SankeyAdapter + Y-Offset Allocator + Bézier Ribbon Router + SVG River Component
   └── Justification: Reuses layer bands and feature matrices; introduces 2D ribbon routing.

3. Architecture Subway Map (Highest Complexity)
   ├── Prerequisite: Existing discoverFeatures() + feature-roles + centrality
   ├── New Work: Thin SubwayAdapter + Octilinear Polyline Router + SVG Subway Component
   └── Justification: Requires sophisticated octilinear vector routing and multi-track offset allocation.
```

---

## 16. EXPLICIT STATEMENT OF NO IMPLEMENTATION

It is explicitly confirmed that:

* **ZERO PRODUCTION CODE WAS CREATED, MODIFIED, OR DELETED.**
* **ZERO ADAPTERS WERE CREATED, MODIFIED, OR DELETED.**
* **ZERO RENDERERS WERE CREATED, MODIFIED, OR DELETED.**
* **ZERO TESTS WERE CREATED, MODIFIED, OR DELETED.**
* **ZERO LAYOUT ALGORITHMS WERE CREATED, MODIFIED, OR DELETED.**
* **ZERO SCHEMAS WERE CREATED, MODIFIED, OR DELETED.**
* **ZERO PROJECT STATE MODULES WERE CREATED, MODIFIED, OR DELETED.**
* **ZERO POSITION AUTHORITY POLICIES WERE CREATED, MODIFIED, OR DELETED.**
* **ZERO BENCHMARK FILES WERE CREATED, MODIFIED, OR DELETED.**
* **THIS TASK WAS EXCLUSIVELY ANALYSIS AND REPORT GENERATION.**

---

## 17. FINAL DECISION

```text
PHASE 3 ANALYSIS COMPLETE — IMPLEMENTATION NOT AUTHORIZED
```
