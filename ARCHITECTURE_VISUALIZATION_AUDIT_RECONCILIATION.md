# Architecture Visualization Audit Reconciliation

## 1. Why Reconciliation Was Required

The previous visualization audits (`ARCHITECTURE_VISUALIZATION_STRUCTURE_FLOW_AUDIT.md`, `ARCHITECTURE_VISUALIZATION_RELATIONSHIP_ANALYTICS_AUDIT.md`, `ARCHITECTURE_VISUALIZATION_STORY_EVOLUTION_3D_AUDIT.md`) were executed in parallel before the ground-truth baseline in `ARCHITECTURE_VISUALIZATION_FOUNDATION_AUDIT.md` was established and verified.

This parallel execution introduced the following contamination patterns across the audit reports:
1. **Feasibility Overclaims**: Concepts were misclassified as "already supported", "READY", or "fully available" merely because raw underlying graph data existed, ignoring the complete absence of required UI components, layout algorithms, or rendering infrastructure.
2. **Unsupported Performance Claims**: Performance statements such as "handles 10,000+ nodes", "in < 5ms", "scales to 5,000 building blocks", or "60 FPS" were presented as established facts without distinguishing theoretical complexity from measured benchmark performance on current project code.
3. **Subjective UX Claims**: Visualizations were described as "intuitive", "clearer", "instantly understandable", or "superior" without empirical user research or task performance evidence.
4. **Category & Taxonomy Confusion**: Heuristic classifications (e.g. `classifyNodeLayer()`, `discoverFeatures()`, `classifyFeatureRole()`) were silently conflated with authoritative human architecture or raw source metadata.
5. **Static vs. Dynamic Execution Confusion**: Static DAG topological dependency depth was occasionally conflated with dynamic runtime execution timing, thread sequencing, or CPU duration.
6. **3D Scope Overgeneralization**: Historical 3D experiment findings were cited as proving "3D is impossible" or generalized to distinct 3D semantic models (Models A, B, C, D and 3D City) that had never been empirically tested.

This reconciliation pass establishes a unified, evidence-based current-state truth across all four domain reports without altering a single line of production code.

---

## 2. Foundation Verification

`ARCHITECTURE_VISUALIZATION_FOUNDATION_AUDIT.md` was independently verified against the active source code (`explorer/src/` and root `.cjs` scripts).

### Ground-Truth Verification Summary

| Capability / Subsystem | Verification Status | Source File Evidence | Verified Properties |
| :--- | :--- | :--- | :--- |
| **Node Types** | `VERIFIED` | `explorer/src/types/explorer.ts` | 10 canonical types: `ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External` |
| **Edge Relationships** | `VERIFIED` | `explorer/src/types/explorer.ts` | 21 canonical types: `method-call`, `instantiation`, `type-reference`, `SOQL`, `DML`, `lwc-apex`, `trigger-handler`, etc. |
| **Feature Discovery** | `VERIFIED` | `explorer/src/lib/layout/features.ts` | Discovers 13 semantic feature regions on Cloud Spend Tracker via `discoverFeatures()` |
| **Architectural Layers** | `VERIFIED` | `explorer/src/lib/layout/layers.ts` | Classifies components into `presentation`, `application`, `domain`, `schema` via `classifyNodeLayer()` |
| **Feature Roles** | `VERIFIED` | `explorer/src/lib/layout/feature-roles.ts` | Classifies 6 roles: `FeatureAnchor`, `FeatureCore`, `FeatureData`, `FeatureBridge`, `FeatureTest`, `SharedInfrastructure` |
| **Shared Infrastructure** | `VERIFIED` | `explorer/src/lib/layout/feature-roles.ts` | Flags shared utility nodes via `isSharedInfrastructure()` (35 nodes on Cloud Spend Tracker) |
| **Centrality Analysis** | `VERIFIED` | `explorer/src/lib/layout/centrality.ts` | Computes hubs, bridges, spatial roles via `computeGraphCentralityAnalysis()` |
| **Dependency Traversal** | `VERIFIED` | `focus-graph.ts`, `impact-analysis.ts` | BFS/DFS traversal engines for focus depth $1..5$ and impact blast radius |
| **Layout Engine** | `VERIFIED` | `architecture-layout.ts` | 13-stage pipeline supporting `hierarchical` ($189.37\text{ ms}$) and `hybrid` ($231.14\text{ ms}$) modes |
| **Position Authority** | `VERIFIED` | `position-policy.ts` | Strict 5-tier hierarchy preserving manual drags ($0.00000\text{ px}$ determinism drift) |
| **Rendering Pipeline** | `VERIFIED` | `GraphView.tsx`, `FeatureOverlayCanvas.tsx` | Cytoscape.js canvas + SVG overlay canvas (`FeatureOverlayCanvas`) + HTML Hover Cards |
| **Interaction System** | `VERIFIED` | `graph-interactions.ts`, `FocusControls.tsx` | Selection, pan/zoom, depth slider, search, type filtering, deep-linking |
| **Metrics Engine** | `VERIFIED` | `metrics.ts` | Geometric crossings breakdown ($C_{pp}, C_{ps}, C_{ss}$), clearance gap ($\ge 40.0\text{px}$), cohesion |
| **Snapshot / Diff Engine** | `VERIFIED` | `architecture-diff.cjs`, `diff-adapter.ts` | Snapshot diffing engine and overlay builder (`diffSnapshots`, `buildDiffOverlayGraph`) |

### Four-Tier Category Taxonomy Established
1. `SOURCE METADATA`: Extracted directly from Salesforce metadata (`node.type`, `file`, `line`, `relationshipType`).
2. `DERIVED CLASSIFICATION`: Graph-computed structural facts (`fanIn`, `fanOut`, `coupling`, `score`, `impactSummaries`, `cycles`).
3. `HEURISTIC CLASSIFICATION`: Rules/scoring inference (`classifyNodeLayer`, `discoverFeatures`, `classifyFeatureRole`).
4. `HUMAN-CURATED ARCHITECTURE`: Manual human architecture annotations (**NOT** present in schema).

---

## 3. Structure/Flow Audit Corrections

The following table summarizes all reconciliation corrections applied to `ARCHITECTURE_VISUALIZATION_STRUCTURE_FLOW_AUDIT.md`:

| Report | Finding | Problem | Evidence | Correction Required |
| :--- | :--- | :--- | :--- | :--- |
| `STRUCTURE_FLOW` | Architecture Atlas | Overclaimed as "READY" | UI drilldown handlers do not exist in code | Classify as `VERIFIED` (Base Layout & Rendering) / `NEW UI REQUIRED` (Drilldown) |
| `STRUCTURE_FLOW` | Semantic Zoom | Overclaimed 5 zoom tiers as existing | `graph-style.ts` only defines 3 CSS thresholds (`.zoom-far`, `.zoom-mid`, `.zoom-near`) | Classify as `PARTIALLY SUPPORTED` / `NEW RENDERING REQUIRED` |
| `STRUCTURE_FLOW` | Architecture Stack | Claimed sub-layer shelf grouping existed | Sub-layer shelf positioning is not implemented in `layers.ts` | Classify as `VERIFIED` (Base Stack) / `NEW UI REQUIRED` (Sub-layer Shelves) |
| `STRUCTURE_FLOW` | Architecture City | Claimed 3D building blocks scale to 5,000 building blocks at 60 FPS | Code contains 0 WebGL/Three.js dependencies; no 3D renderer exists | Classify as `EXPERIMENTAL` / `NEW RENDERING REQUIRED` / `NEW LAYOUT REQUIRED`; mark FPS as `UNMEASURED TARGET / ESTIMATE` |
| `STRUCTURE_FLOW` | Dependency River | Claimed flow streams were "MEDIUM" feasibility without layout engine | No Sankey flow placement or cycle-breaking algorithms exist | Classify as `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED` |
| `STRUCTURE_FLOW` | Subway Map | Claimed octilinear line routing was partially implemented | No octilinear ($0^\circ, 45^\circ, 90^\circ$) line router exists in layout pipeline | Classify as `PARTIALLY SUPPORTED` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED` |
| `STRUCTURE_FLOW` | Dependency Timeline | Conflated static DAG topological rank with dynamic execution timing | Static analysis cannot capture CPU execution duration or dynamic dispatch | Explicitly declare `DERIVABLE` (Static DAG only) and `NEW DATA REQUIRED` for dynamic execution |
| `STRUCTURE_FLOW` | Architecture Traffic | Claimed traffic scores were fully supported | No traffic score weighting function or UI threshold slider exists | Classify as `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED` |

---

## 4. Relationship/Analytics Audit Corrections

The following table summarizes all reconciliation corrections applied to `ARCHITECTURE_VISUALIZATION_RELATIONSHIP_ANALYTICS_AUDIT.md`:

| Report | Finding | Problem | Evidence | Correction Required |
| :--- | :--- | :--- | :--- | :--- |
| `ANALYTICS` | Feature Dependency Matrix | Claimed "HIGH (FEASIBLE)" without UI component | `feature-ordering.ts` calculates matrix, but no React DOM table UI exists | Classify as `DERIVABLE` / `NEW UI REQUIRED` |
| `ANALYTICS` | Feature Coupling Heatmap | Claimed "< 5ms for 30 features" | Benchmark was not measured on 30 features | Mark performance as `UNMEASURED TARGET / ESTIMATE` |
| `ANALYTICS` | Feature Chord Diagram | Claimed "MEDIUM-HIGH" feasibility without polar layout | No polar arc positioning or Bézier chord generator exists | Classify as `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED` |
| `ANALYTICS` | Dependency Tree | Claimed "NEARLY DIRECTLY SUPPORTED" | Dedicated tree view mode does not exist in `GraphView.tsx` | Classify as `VERIFIED` (Traversal) / `NEW UI REQUIRED` |
| `ANALYTICS` | Dependency Radar | Claimed "FULLY SUPPORTED DATA" | Radar UI component (`DependencyRadarChart.tsx`) does not exist | Classify as `DERIVABLE` / `NEW UI REQUIRED` |
| `ANALYTICS` | Dependency Constellation | Claimed "HIGH (FEASIBLE)" | No polar orbit coordinate generator exists in `satellites.ts` | Classify as `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` |
| `ANALYTICS` | Four-Direction View | Claimed "100% RELIABLY DERIVABLE" as fully built | 4-quadrant partition classifier and cardinal layout do not exist | Classify as `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED` |
| `ANALYTICS` | Architecture Treemap | Claimed "< 10ms for 2,000 components" | Squarified treemap algorithm is not implemented | Classify as `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED`; mark performance as `UNMEASURED TARGET / ESTIMATE` |
| `ANALYTICS` | Architecture Landscape | Claimed 2D KDE rasterizer existed | `FeatureOverlayCanvas.tsx` renders region boxes, not KDE density heatmaps | Classify as `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `PARTIALLY SUPPORTED` (Canvas) / `NEW UI REQUIRED` |
| `ANALYTICS` | Architecture DNA | Claimed "< 0.1ms render time" as fact | DNA barcode widget does not exist in UI | Classify as `DERIVABLE` / `NEW UI REQUIRED`; mark timing as `UNMEASURED TARGET / ESTIMATE` |
| `ANALYTICS` | Hotspot View | Claimed "ALREADY MOSTLY BUILT" | `HotspotPanel.tsx` exists, but Cytoscape canvas node halo styling is missing | Classify as `VERIFIED` (Backend & Panel) / `NEW UI REQUIRED` (Halo Styling) |

---

## 5. Story/Evolution/3D Audit Corrections

The following table summarizes all reconciliation corrections applied to `ARCHITECTURE_VISUALIZATION_STORY_EVOLUTION_3D_AUDIT.md`:

| Report | Finding | Problem | Evidence | Correction Required |
| :--- | :--- | :--- | :--- | :--- |
| `STORY_3D` | Architecture Story Mode | Claimed "Immediately Feasible" | Story Orchestrator state machine and narrative overlay do not exist | Classify as `PARTIALLY SUPPORTED` / `NEW UI REQUIRED` / `NEW ANALYSIS REQUIRED` |
| `STORY_3D` | Pattern / Grammar View | Claimed design patterns (Unit of Work, Factory) were detectable | Schema carries no intent labels; pattern matching engine does not exist | Explicitly separate `VERIFIED` structural types from `NEW ANALYSIS REQUIRED` motif matching and `HUMAN-CURATED ARCHITECTURE` |
| `STORY_3D` | Feature Comparison | Claimed "IMMEDIATELY FEASIBLE" | `projectState.ts` only tracks single active project; no side-by-side UI exists | Classify as `DERIVABLE` / `NEW UI REQUIRED` |
| `STORY_3D` | Architecture Diff | Claimed diffing was fully available | Diff engine (`diff-adapter.ts`) exists, but multi-snapshot persistence does not | Classify as `VERIFIED` (Engine) / `HISTORICAL DATA REQUIRED` / `NEW UI REQUIRED` |
| `STORY_3D` | Time Machine | Correctly identified missing data | `projectState.ts` stores only active single-snapshot schema | Retain as `HISTORICAL DATA REQUIRED` / `NEW DATA REQUIRED` |
| `STORY_3D` | Proposed 3D Category Model | Was not previously audited against current schema | Proposed Categories 1–5 checked against `explorer.ts` | Confirm Category Model is `DERIVABLE` from `SOURCE METADATA` + `HEURISTIC CLASSIFICATION` |
| `STORY_3D` | 3D Models A, B, C, D | Conflated previous camera projection tests with new Z models | Previous tests evaluated layer elevation in $Z$; Models A, C, D evaluate sharedness, connectivity, centrality in $Z$ | Explicitly scope previous evidence, declare Models A, C, D as `EXPERIMENTAL` / `NEW RENDERING REQUIRED` |
| `STORY_3D` | 3D Architecture City | Claimed 3D city reused 2D graph layout | City layout uses spatial area packing, which is incompatible with 2D Position Authority | Classify as `EXPERIMENTAL` / `NEW LAYOUT REQUIRED` / `NEW RENDERING REQUIRED` |

---

## 6. Claims Removed or Downgraded

### Feasibility Claims Downgraded
* **Architecture Atlas**: Downgraded from "READY" to `VERIFIED` (Base Layout) / `NEW UI REQUIRED` (Drilldown).
* **Semantic Zoom**: Downgraded from "HIGH" to `PARTIALLY SUPPORTED` / `NEW RENDERING REQUIRED`.
* **Architecture City**: Downgraded from "EXPERIMENTAL" (with implicit layout reuse) to `EXPERIMENTAL` / `NEW LAYOUT REQUIRED` / `NEW RENDERING REQUIRED` (incompatible with 2D Position Authority).
* **Dependency River / Sankey**: Downgraded from "MEDIUM" to `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`.
* **Architecture Subway Map**: Downgraded from "MEDIUM" to `PARTIALLY SUPPORTED` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`.
* **Dependency Timeline**: Downgraded from "LOW" to `DERIVABLE` (Static DAG) / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED` (Dynamic execution is `NEW DATA REQUIRED`).
* **Feature Dependency Matrix**: Downgraded from "HIGH (FEASIBLE)" to `DERIVABLE` / `NEW UI REQUIRED`.
* **Feature Coupling Heatmap**: Downgraded from "HIGH (FEASIBLE)" to `DERIVABLE` / `NEW UI REQUIRED` / `NEW RENDERING REQUIRED`.
* **Feature Chord Diagram**: Downgraded from "MEDIUM-HIGH" to `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`.
* **Dependency Radar**: Downgraded from "HIGH (FULLY SUPPORTED DATA)" to `DERIVABLE` / `NEW UI REQUIRED`.
* **Dependency Constellation**: Downgraded from "HIGH (FEASIBLE)" to `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED`.
* **Four-Direction View**: Downgraded from "100% RELIABLY DERIVABLE" to `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW UI REQUIRED`.
* **Architecture Treemap**: Downgraded from "HIGH (FEASIBLE)" to `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `NEW RENDERING REQUIRED` / `NEW UI REQUIRED`.
* **Architecture Landscape**: Downgraded from "HIGH (FEASIBLE)" to `DERIVABLE` / `NEW ANALYSIS REQUIRED` / `PARTIALLY SUPPORTED` / `NEW UI REQUIRED`.
* **Architecture DNA**: Downgraded from "HIGH (100% AVAILABLE DATA)" to `DERIVABLE` / `NEW UI REQUIRED`.
* **Story Mode**: Downgraded from "Immediately Feasible" to `PARTIALLY SUPPORTED` / `NEW UI REQUIRED` / `NEW ANALYSIS REQUIRED`.
* **Feature Comparison**: Downgraded from "IMMEDIATELY FEASIBLE" to `DERIVABLE` / `NEW UI REQUIRED`.

### Unsupported Performance Claims Removed / Relabeled
* Removed "handles up to 5,000+ nodes smoothly" $\to$ Relabeled as `UNMEASURED TARGET / ESTIMATE`.
* Removed "in < 5ms for 1,000 nodes" $\to$ Relabeled as `UNMEASURED TARGET / ESTIMATE`.
* Removed "60 FPS rendering performance" $\to$ Relabeled as `UNMEASURED TARGET / ESTIMATE`.
* Removed "< 5ms for 30 features" $\to$ Relabeled as `UNMEASURED TARGET / ESTIMATE`.
* Removed "< 10ms for 2,000 components" $\to$ Relabeled as `UNMEASURED TARGET / ESTIMATE`.
* Removed "< 0.1ms render time" $\to$ Relabeled as `UNMEASURED TARGET / ESTIMATE`.

### Subjective UX Claims Removed / Replaced
* Replaced "intuitive top-to-bottom vertical flow" $\to$ `INTENDED BENEFIT`.
* Replaced "compelling spatial metaphor" $\to$ `HYPOTHESIZED BENEFIT`.
* Replaced "highly readable, familiar mental model" $\to$ `HYPOTHESIZED BENEFIT`.
* Replaced "extremely clear, deterministic tabular view" $\to$ `INTENDED BENEFIT`.
* Replaced "highly aesthetic and intuitive representation" $\to$ `HYPOTHESIZED BENEFIT`.
* Replaced "completely removes spatial confusion" $\to$ `INTENDED BENEFIT`.
* Replaced "translates abstract graph metrics into a powerful visual metaphor" $\to$ `HYPOTHESIZED BENEFIT`.

---

## 7. Current Verified Data Capabilities

The following data capabilities are **VERIFIED** as directly extracted or calculated in the active codebase (`explorer/src/types/explorer.ts`):

1. **10 Canonical Node Types**: `ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`.
2. **21 Canonical Edge Relationship Types**: `method-call`, `instantiation`, `type-reference`, `generic-type`, `extends`, `implements`, `SOQL`, `soql-object`, `soql-field`, `DML`, `aura-enabled`, `lwc-apex`, `lwc-import`, `lwc-template-child`, `field-reference`, `trigger-handler`, `trigger-object`, `trigger-on`, `visualforce-controller`, `test-reference`, `event-publisher`.
3. **Node Attributes**: `id`, `displayName`, `file`, `risk` (`HIGH`/`MEDIUM`/`LOW`), `riskReasons`, `metrics` (`fanIn`, `fanOut`, `coupling`, `unresolved`, `score`), `behavior` (`isTest`, `sharing`, `publicContractsCount`, `asyncPatterns`, `securitySignalsCount`, `queryCount`, `dmlCount`, `calloutCount`), `refactoringReadiness`.
4. **Edge Attributes**: `id`, `source`, `target`, `relationshipType`, `method`, `evidence`, `unresolved`, `resolutionClassification`, `resolutionStrategy`, `confidence`, `line`, `column`, `methodOwner`, `file`, `canonical`.
5. **Graph Summary & Precomputed Summaries**: `summary` (node/edge counts, risk breakdown, inventory), `cycles` (cycle groups), `unresolvedReferences`, `impactSummaries` (direct/transitive dependencies and dependents, impacted tests, total impact count).

---

## 8. Current Derivable Capabilities

The following analytical capabilities are **DERIVABLE** via existing functions in `explorer/src/lib/`:

1. **Architectural Layer Classification**: Computed via `classifyNodeLayer()` into 4 bands (`presentation`, `application`, `domain`, `schema`).
2. **Semantic Feature Discovery**: Discovered via `discoverFeatures()` mapping nodes to primary/secondary feature clusters (13 features on Cloud Spend Tracker).
3. **Feature Role Classification**: Classified via `classifyFeatureRole()` into 6 roles (`FeatureAnchor`, `FeatureCore`, `FeatureData`, `FeatureBridge`, `FeatureTest`, `SharedInfrastructure`).
4. **Centrality & Hub/Bridge Analysis**: Computed via `computeGraphCentralityAnalysis()`, `computeNodeHubMetrics()`, `computeNodeBridgeAnalysis()`.
5. **Feature Adjacency & Coupling Matrix**: Computed via `buildFeatureDependencyMatrix()` in `feature-ordering.ts`.
6. **Feature Cohesion & Locality**: Calculated via `calculateSemanticFeatureCohesion()`.
7. **Focus Graph Neighborhood Isolation**: Computed via `computeFocusGraph()` for depth $1..5$ in `upstream`, `downstream`, or `both` directions.
8. **Impact Blast Radius**: Computed via `calculateImpactAnalysis()` and `getAffectedNodesIn()`.
9. **Architectural Hotspots**: Computed via `getArchitecturalHotspots()` in `hotspots.ts`.
10. **Geometric Edge Crossings & Clearance**: Decomposed via `calculateDetailedEdgeCrossings()` and `minimumNodeClearance()`.
11. **Snapshot Diff Overlay**: Calculated via `architecture-diff.cjs` and `buildDiffOverlayGraph()` in `diff-adapter.ts`.

---

## 9. Missing Capabilities

The following capabilities are **MISSING** from the current codebase:

1. **3D Graphics & WebGL Rendering**: No WebGL, Three.js, or 3D Cytoscape rendering drivers exist.
2. **Dynamic Runtime Execution Data**: No dynamic execution timing, call duration, dynamic Apex dispatch (`Type.forName`), or CPU profiling logs exist.
3. **Multi-Snapshot Time Series Persistence**: No git commit snapshot parser or multi-version time-series store exists in `projectState.ts`.
4. **Human-Curated Architecture Annotations**: Schema does not store manual layer/role overrides or human architectural intent tags.
5. **Octilinear Line Routing Engine**: No $0^\circ, 45^\circ, 90^\circ$ schematic subway line router exists.
6. **Sankey Flow Placement Engine**: No multi-stage Sankey flow placement or cycle-breaking ribbon generator exists.
7. **Squarified Treemap Layout Engine**: No 2D squarification algorithm converting hierarchy trees into rectangle bounds exists.
8. **2D Kernel Density Estimation (KDE) Rasterizer**: No KDE density surface matrix calculator exists in `FeatureOverlayCanvas.tsx`.
9. **Interactive Story Orchestrator**: No step-by-step narrative state machine or automated camera tour driver exists in UI.

---

## 10. 3D Model Reconciliation

### User's Proposed Category Hierarchy Audit
The user's proposed 5-category architectural hierarchy:
* **Category 1 = Features**: `DERIVABLE` (`HEURISTIC CLASSIFICATION` via `discoverFeatures()`)
* **Category 2 = LWC + Controllers**: `DERIVABLE` (`SOURCE METADATA` for `LWC` + `HEURISTIC CLASSIFICATION` for `Controllers`)
* **Category 3 = Services**: `DERIVABLE` (`HEURISTIC CLASSIFICATION` via `classifyNodeLayer()`)
* **Category 4 = Selectors**: `DERIVABLE` (`HEURISTIC CLASSIFICATION` via `classifyNodeLayer()`)
* **Category 5 = Objects + Fields**: `VERIFIED` (`SOURCE METADATA`: `Object`, `CustomObject`, `Field`, `CustomField`)

### Reconciled Evaluation of 3D Models A, B, C, D and 3D City

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 3D MODEL RECONCILIATION MATRIX                              │
├─────────────────┬─────────────────────┬───────────────────┬───────────────────┬─────────────┤
│ Model           │ Dimension Mapping   │ Data Availability │ Position Policy   │ Feasibility │
├─────────────────┼─────────────────────┼───────────────────┼───────────────────┼─────────────┤
│ Model A         │ X = Feature         │ DERIVABLE         │ Preserves 2D      │ EXPERIMENTAL│
│                 │ Y = Layer Flow      │ DERIVABLE         │ (Read-only Z)     │             │
│                 │ Z = Sharedness      │ DERIVABLE         │                   │             │
├─────────────────┼─────────────────────┼───────────────────┼───────────────────┼─────────────┤
│ Model B         │ X = Feature         │ DERIVABLE         │ Preserves 2D      │ EXPERIMENTAL│
│                 │ Y = Layer Category  │ DERIVABLE         │ (Read-only Z)     │             │
│                 │ Z = DAG Depth       │ DERIVABLE (Static)│                   │             │
├─────────────────┼─────────────────────┼───────────────────┼───────────────────┼─────────────┤
│ Model C         │ X = Feature         │ DERIVABLE         │ Preserves 2D      │ EXPERIMENTAL│
│                 │ Y = Layer Category  │ DERIVABLE         │ (Read-only Z)     │             │
│                 │ Z = Cross-Feature   │ DERIVABLE         │                   │             │
├─────────────────┼─────────────────────┼───────────────────┼───────────────────┼─────────────┤
│ Model D         │ X = Feature         │ DERIVABLE         │ Preserves 2D      │ EXPERIMENTAL│
│                 │ Y = Layer Category  │ DERIVABLE         │ (Read-only Z)     │             │
│                 │ Z = Centrality      │ DERIVABLE         │                   │             │
├─────────────────┼─────────────────────┼───────────────────┼───────────────────┼─────────────┤
│ 3D City         │ Dist. = Feature     │ DERIVABLE         │ Incompatible      │ EXPERIMENTAL│
│                 │ Bldg. = Component   │ DERIVABLE         │ (Uses spatial area│             │
│                 │ Road = Dependency   │ DERIVABLE         │  packing)         │             │
└─────────────────┴─────────────────────┴───────────────────┴───────────────────┴─────────────┘
```

### Reconciliation with Historical 3D Evidence
* **Previously Tested**: Perspective camera projections of flat 2D DAG layout coordinates $(X,Y)$ with $Z$ elevation mapped to architectural layer tiers or feature roles (`PHASE_3D_EVIDENCE_SCREEN_SPACE_SEMANTIC_VALIDATION.md`).
* **Previously Established**: Projecting 2D DAG node coordinates through a 3D perspective camera matrix increased visible screen-space line segment crossings from **85,367** (2D baseline) up to **91,087–123,078** (+4.1% to +40.6%), due to camera tilt and perspective foreshortening overlapping previously separated edge lines.
* **Not Tested**: Models A, C, D, and 3D Architecture City.
* **Still Applicable**: 3D perspective camera projections of line-edge graphs do **NOT** solve planar 2D edge crossing density. 2D Position Authority remains the primary production ground truth.
* **Requires New Experiment**: Models A, C, D and 3D Architecture City represent distinct multi-dimensional spatial encoding candidates subject to WebGL implementation and empirical user task performance testing (`EXPERIMENTAL`).
* **Narrow Language Governance**: Avoid concluding "3D is impossible" or "3D is better". Conclude: 3D perspective projection does not reduce line crossings, but offers multi-dimensional spatial encoding candidates subject to WebGL implementation and empirical validation (`EXPERIMENTAL`).

---

## 11. Remaining Evidence Gaps

The following empirical evidence gaps remain open and require future benchmark testing if implemented:
1. **WebGL 2.0 / Three.js Overhead**: Memory footprint and FPS performance of rendering 1,000+ instanced 3D node meshes and 3D line arcs in browser viewports.
2. **KDE Canvas Rasterization Latency**: Measured execution time of rendering a $128 \times 128$ Gaussian kernel density surface on `FeatureOverlayCanvas.tsx` for 1,000+ nodes.
3. **Squarified Treemap Layout Performance**: Measured computation time of converting a 2,000-node hierarchy into 2D rectangle bounds.
4. **User Task Performance in 3D**: Empirical user testing measuring comprehension speed and error rates when performing architecture triage in 3D views vs 2D plan views.

---

## 12. Final Audit Integrity Assessment

```text
[x] No production code changed
[x] No tests changed
[x] No configuration changed
[x] Foundation claims verified against current source
[x] Structure audit reconciled with 10 mandatory states
[x] Analytics audit reconciled with 5 metric categories
[x] Story/3D audit reconciled with narrow language
[x] Unsupported performance claims removed or relabeled
[x] Subjective UX claims replaced with intended/hypothesized benefits
[x] Static DAG topology separated from dynamic runtime execution
[x] Heuristic classifications separated from source metadata
[x] Previous 3D evidence accurately scoped
[x] User's proposed 3D category model fully evaluated
[x] Only Markdown audit files created or modified
```

### Final Conclusion
The reconciliation pass is **100% COMPLETE**. All four domain reports (`FOUNDATION`, `STRUCTURE_FLOW`, `RELATIONSHIP_ANALYTICS`, `STORY_EVOLUTION_3D`) and this master reconciliation document (`ARCHITECTURE_VISUALIZATION_AUDIT_RECONCILIATION.md`) present a unified, evidence-grounded, and non-overclaimed assessment of the Salesforce Architecture Explorer codebase.
