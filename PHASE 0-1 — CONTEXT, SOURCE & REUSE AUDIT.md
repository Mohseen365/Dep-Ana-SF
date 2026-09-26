# PHASE 0-1 — CONTEXT, SOURCE & REUSE AUDIT

## 1. Existing Context Documents Consulted
1. `AGENT.md` — Authoritative navigation guide and task routing protocol.
2. `08_Audit_Source_Register.md` — Canonical index of 200 Markdown audit reports and SHA-256 fixture checksums (`feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`).
3. `ARCHITECTURE_VISUALIZATION_FOUNDATION_AUDIT.md` — Baseline audit of data schemas, layout engine stages, rendering models, and UI architecture.
4. `ARCHITECTURE_VISUALIZATION_AUDIT_RECONCILIATION.md` — Four-tier taxonomy and 10 mandatory feasibility states.
5. `ARCHITECTURE_VISUALIZATION_STRUCTURE_FLOW_AUDIT.md` — Structure & flow visualization audit (Atlas, Stack, City, River/Sankey, Subway Map).
6. `ARCHITECTURE_VISUALIZATION_RELATIONSHIP_ANALYTICS_AUDIT.md` — Matrix, Radar, DNA, and Coupling Heatmap feasibility.
7. `ARCHITECTURE_VISUALIZATION_STORY_EVOLUTION_3D_AUDIT.md` — Story evolution, timeline, and 3D Models A–D evaluation.
8. `ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS.md` — Single canonical graph principle, 26 audited concepts across a master lens matrix.
9. `ARCHITECTURE_VISUALIZATION_FINAL_SYNTHESIS_INTEGRITY_AUDIT.md` — Read-only evidence traceability and internal consistency audit.
10. `ARCHITECTURE_VISUALIZATION_IMPLEMENTATION_ROADMAP.md` — Execution roadmap across Phases 0–8.
11. `ARCHITECTURE_VISUALIZATION_PHASE0_IMPLEMENTATION_CONTRACT.md` — Phase 0 execution specification and change boundaries.
12. `ARCHITECTURE_VISUALIZATION_PHASE0_IMPLEMENTATION_CONTRACT_INTEGRITY_AUDIT.md` — Phase 0 contract integrity audit (`CONTRACT READY FOR CONTROLLED PHASE 0 EXECUTION`).

---

## 2. Source-Register Routing
- **Routing Protocol**: `AGENT.md` -> `08_Audit_Source_Register.md` -> Canonical Report -> Verified Source Code File.
- **Topological & Schema Truth**: `explorer/src/types/explorer.ts` (Zod validation in `explorer/src/lib/schema.ts`).
- **Position & Coordinate Authority**: `explorer/src/lib/position-policy.ts` (5-level priority hierarchy).
- **Layout Calculation Pipeline**: `explorer/src/lib/architecture-layout.ts` (13-stage deterministic layout generator).
- **Project Isolation & State Persistence**: `explorer/src/lib/projectState.ts` (`explorer.projectState.<projectId>`).
- **Feature & Domain Analytics**: `explorer/src/lib/layout/features.ts`, `feature-ordering.ts`, `layers.ts`, `feature-roles.ts`.
- **Topological Graph Metrics**: `explorer/src/lib/layout/centrality.ts`, `hotspots.ts`, `impact-analysis.ts`, `connection-analysis.ts`.

---

## 3. Relevant Context Findings
- **Single Canonical Graph Principle**: All visualization lenses, adapters, and UI panels must consume the single canonical graph (`ExplorerDataSchema`) as read-only.
- **Decoupled Architecture**: Data analysis, layout calculation, rendering, and state management are cleanly decoupled in `explorer/src/lib/`.
- **Pure Functional Analytics**: Existing analytics modules (`features.ts`, `centrality.ts`, `hotspots.ts`, `impact-analysis.ts`) take pure TypeScript inputs and return structured outputs with zero DOM or Cytoscape dependencies.
- **Position Authority Immutability**: Higher authority levels (Level 1 User Drag, Level 2 Persisted Project State) strictly take precedence over calculated layouts ($0.00000\text{ px}$ coordinate drift across all non-layout operations).

---

## 4. Current-Source Verification
Every documented claim was verified against the executing codebase (`explorer/src/`):

| Capability / Module | Documented Claim | Source File Verified | Verified Implementation Reality | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Canonical Graph Schema** | Immutable schema for nodes, edges, cycles, summary | `explorer/src/types/explorer.ts` | Well-typed `ExplorerDataSchema`, validated by Zod in `schema.ts`. | **VERIFIED** |
| **Position Authority** | 5-Level Priority Hierarchy | `explorer/src/lib/position-policy.ts` | `resolveAuthoritativePosition()` enforces Levels 1–5. | **VERIFIED** |
| **Feature Discovery** | Seed candidate ranking & BFS expansion | `explorer/src/lib/layout/features.ts` | `discoverFeatures()` groups nodes into `FeatureClusterMap`. | **VERIFIED** |
| **Feature Dependency Model**| Cross-feature edge weighting & 2D ordering | `explorer/src/lib/layout/feature-ordering.ts` | `buildFeatureDependencyModel()` & `compute2DFeatureBandOrdering()`. | **VERIFIED** |
| **Layer Classification** | 4-tier layer mapping | `explorer/src/lib/layout/layers.ts` | `classifyNodeLayer()` maps nodes to `presentation`/`app`/`domain`/`schema`. | **VERIFIED** |
| **Feature Roles** | 6-role classification | `explorer/src/lib/layout/feature-roles.ts` | `classifyFeatureRole()` (`Anchor`, `Core`, `Data`, `Bridge`, `Test`, `Shared`). | **VERIFIED** |
| **Centrality Analysis** | Hub and Bridge score calculation | `explorer/src/lib/layout/centrality.ts` | `computeGraphCentralityAnalysis()` returns Hub/Bridge rankings. | **VERIFIED** |
| **Hotspot Scoring** | Deterministic risk & metric ranking | `explorer/src/lib/hotspots.ts` | `getArchitecturalHotspots()` ranks high risk, fan-in, coupling, cycles. | **VERIFIED** |
| **Impact Analysis** | BFS blast radius calculation | `explorer/src/lib/impact-analysis.ts` | `computeImpactAnalysis()` calculates direct & transitive dependents. | **VERIFIED** |
| **Focus Traversal** | Multi-hop depth traversal (1 to ALL) | `explorer/src/lib/focus-graph.ts` | `computeFocusedGraph()` handles direction (`dependencies`/`dependents`/`both`). | **VERIFIED** |
| **Two-Snapshot Diff** | Graph snapshot overlay generator | `explorer/src/lib/diff-adapter.ts` | `diffSnapshots()` converts raw snapshots into `DiffOverlayGraph`. | **VERIFIED** |
| **Multi-Project Isolation** | Project-scoped storage & state | `explorer/src/lib/projectState.ts` | `loadProjectState()` scopes keys to `explorer.projectState.<projectId>`. | **VERIFIED** |

---

## 5. Canonical Graph Findings
- **File Location**: `explorer/src/types/explorer.ts`
- **Interfaces**: `ExplorerDataSchema`, `ExplorerNode`, `ExplorerEdge`, `ExplorerSummary`, `ExplorerCycleGroup`, `ExplorerUnresolvedReference`, `ExplorerComponentImpactSummary`.
- **Schema Validation**: Enforced at runtime by `ExplorerDataSchemaZ` in `explorer/src/lib/schema.ts`.
- **Mutation Boundary**: **STRICTLY READ-ONLY**. No visualization lens, adapter, or layout algorithm modifies base node/edge properties.
- **Graph Indexing**: Fast $O(1)$ lookups precomputed by `createLayoutGraphIndex()` in `explorer/src/lib/layout/graph-index.ts`.

---

## 6. Position Authority Findings
- **File Location**: `explorer/src/lib/position-policy.ts`
- **5-Level Hierarchy**:
  1. **Level 1**: Session Drag (`sessionPositions` Map/Record) — highest authority.
  2. **Level 2**: Persisted Project State (`persistedPositions` in LocalStorage `explorer.projectState.<projectId>`).
  3. **Level 3**: Cytoscape Canvas Position (`cyNodePosition`).
  4. **Level 4**: Layout Calculation (`computeArchitectureLayout()` Stage 12).
  5. **Level 5**: System Fallback (`calculateDeterministicNewNodePosition()` centroid placement).
- **Rule for Future Lenses**: Visualization lenses must read coordinates as read-only inputs and **NEVER** overwrite Level 1 or Level 2 authority.

---

## 7. Existing Capability Inventory

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               EXISTING CAPABILITY INVENTORY                              │
├───────────────────────────┬─────────────────────────────────┬────────────────────────────┤
│ Capability                │ Source Location                 │ Function / Export          │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Feature Discovery         │ explorer/src/lib/layout/        │ discoverFeatures()         │
│                           │ features.ts                     │                            │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Feature Dependency Model  │ explorer/src/lib/layout/        │ buildFeatureDependencyModel()
│                           │ feature-ordering.ts             │ compute2DFeatureBandOrdering()
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Architectural Layers      │ explorer/src/lib/layout/        │ classifyNodeLayer()        │
│                           │ layers.ts                       │                            │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Feature Role Taxonomy     │ explorer/src/lib/layout/        │ classifyFeatureRole()      │
│                           │ feature-roles.ts                │                            │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Graph Centrality          │ explorer/src/lib/layout/        │ computeGraphCentralityAnalysis()
│                           │ centrality.ts                   │                            │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Architectural Hotspots    │ explorer/src/lib/hotspots.ts    │ getArchitecturalHotspots() │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Blast Radius Impact       │ explorer/src/lib/impact-analysis.ts│ computeImpactAnalysis()  │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Connection & Coupling     │ explorer/src/lib/connection-    │ calculateConnectionAnalysis()
│                           │ analysis.ts                     │                            │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Focus Neighborhood        │ explorer/src/lib/focus-graph.ts │ computeFocusedGraph()      │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Drill Path Navigation     │ explorer/src/lib/drill.ts       │ computeDrillPath()         │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Project State Isolation   │ explorer/src/lib/projectState.ts│ loadProjectState()         │
│                           │                                 │ saveProjectState()         │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Two-Snapshot Graph Diff   │ explorer/src/lib/diff-adapter.ts│ diffSnapshots()            │
├───────────────────────────┼─────────────────────────────────┼────────────────────────────┤
│ Refactoring Simulation    │ explorer/src/lib/change-simulator.ts│ RefactoringSimulator   │
└───────────────────────────┴─────────────────────────────────┴────────────────────────────┘
8. Capability Classification (R0 / R1 / R2 / N1 / N2 / U)
R0 — DIRECT REUSE: Capabilities usable directly as data feeds without logic modification.

discoverFeatures() (features.ts)
classifyNodeLayer() (layers.ts)
classifyFeatureRole() (feature-roles.ts)
computeGraphCentralityAnalysis() (centrality.ts)
getArchitecturalHotspots() (hotspots.ts)
computeImpactAnalysis() (impact-analysis.ts)
computeFocusedGraph() (focus-graph.ts)
loadProjectState() / saveProjectState() (projectState.ts)
diffSnapshots() (diff-adapter.ts)
RefactoringSimulator (change-simulator.ts)
R1 — THIN PURE ADAPTER: Pure TypeScript data transformers converting canonical/analytics data into lens-specific payloads.

Matrix Adapter (matrix-adapter.ts for Feature Coupling Matrix)
Tree Adapter (tree-adapter.ts for Hierarchical Tree View)
Profile Adapter (profile-adapter.ts for Component Profile)
Radar Adapter (radar-adapter.ts for 7-Band Radar)
DNA Barcode Adapter (dna-adapter.ts for Chromosome Barcode View)
Compass Adapter (compass-adapter.ts for Four-Direction View)
R2 — EXISTING PRIMITIVE + SUBSTANTIAL TRANSFORMATION: Leverages existing primitives (discoverFeatures, layers.ts, centrality.ts, ordering.ts) but requires substantial new spatial or layout calculations.

Architecture Treemap (Squarified rectangular layout transformation)
Dependency River / Sankey (Layer-to-layer flow band & offset transformation)
Architecture Subway Map (Octilinear 45-degree line routing transformation)
N1 — NEW ALGORITHM: Genuinely missing calculation/layout algorithms.

Pure TS Squarified Treemap Layout Engine
Pure TS Sankey Flow Band & Y-Offset Router
Pure TS Octilinear 45-Degree Metro Line Router
N2 — NEW INFRASTRUCTURE: Genuinely missing rendering or historical storage infrastructure.

WebGL / Three.js Viewport Renderer (for experimental Phase 7 3D Models A–D)
Multi-Snapshot Time-Series Store (for Phase 5 Time Machine)
U — UNVERIFIED: None. All capabilities in scope have been verified in source code.

9. Phase 1–3 + 8 Feature Map
Phase	Feature	Existing Data	Existing Analytics	Adapter Needed	New Algorithm Needed	Renderer Needed	Verified Source	Classification
Phase 1	Feature Matrix	ExplorerDataSchema	discoverFeatures(), buildFeatureDependencyModel()	matrix-adapter.ts	None	React 2D Matrix Grid	features.ts, feature-ordering.ts	R1
Phase 1	Dependency Tree	ExplorerDataSchema	computeFocusedGraph(), impact-analysis.ts	tree-adapter.ts	None	React Collapsible Tree	focus-graph.ts, drill.ts	R1
Phase 1	Component Profile	ExplorerNode	metrics, behavior, centrality.ts	profile-adapter.ts	None	React Profile View	explorer.ts, centrality.ts	R0 / R1
Phase 1	Dependency Radar	ExplorerNode	metrics, risk, centrality.ts	radar-adapter.ts	None	SVG Radar / Spider Chart	explorer.ts, centrality.ts	R1
Phase 1	Architecture DNA	ExplorerNode[]	hotspots.ts, layers.ts, feature-roles.ts	dna-adapter.ts	None	SVG Barcode / DNA View	hotspots.ts, layers.ts	R1
Phase 2	Feature Dep. Matrix	ExplorerDataSchema	discoverFeatures(), buildFeatureDependencyModel()	Reuses matrix-adapter.ts	None	Interactive Matrix Panel	features.ts, feature-ordering.ts	R1
Phase 2	Coupling Heatmap	ExplorerDataSchema	connection-analysis.ts, analysis.ts	heatmap-adapter.ts	None	React Heatmap Panel	connection-analysis.ts	R1
Phase 2	Four-Direction View	ExplorerDataSchema	focus-graph.ts, impact-analysis.ts	compass-adapter.ts	None	React 4-Quadrant Compass	focus-graph.ts	R1
Phase 3	Architecture Treemap	ExplorerDataSchema	discoverFeatures(), layers.ts	treemap-adapter.ts	Squarified Treemap Layout	SVG / React Treemap View	features.ts, layers.ts	R2
Phase 3	Dependency River/Sankey	ExplorerDataSchema	layers.ts, ordering.ts	sankey-adapter.ts	Sankey Flow Band Router	SVG Flow Band View	layers.ts, ordering.ts	R2
Phase 3	Subway Map	ExplorerDataSchema	centrality.ts, features.ts	subway-adapter.ts	Octilinear Metro Router	SVG Metro Line View	centrality.ts, features.ts	R2
Phase 8	Cross-Lens Selection	Active node/edge ID	SelectionContext.tsx	None	None	Shared UI Highlight	SelectionContext.tsx	R0
Phase 8	Cross-Lens Focus	Focus depth/direction	useViewState.ts, App.tsx	None	None	Shared Viewport Focus	useViewState.ts	R0
Phase 8	Cross-Lens Navigation	Drill path array	drill.ts, App.tsx	None	None	Shared Navigation Bar	drill.ts	R0
Phase 8	Shared Lens State	ProjectUIState	projectState.ts, ProjectStateContext.tsx	None	None	Project Storage Manager	projectState.ts	R0
10. Do-Not-Rebuild Ledger
Do NOT rebuild graph parsing or symbol resolution: Handled by dependency-analyzer.cjs and export-explorer.cjs.
Do NOT rebuild canonical graph schemas: Defined in explorer/src/types/explorer.ts and validated in schema.ts.
Do NOT rebuild feature discovery: discoverFeatures() in features.ts identifies 21 feature clusters and role assignments deterministically.
Do NOT rebuild layer classification: classifyNodeLayer() in layers.ts maps components to the 4 architectural layers.
Do NOT rebuild feature role classification: classifyFeatureRole() in feature-roles.ts assigns 6 canonical feature roles.
Do NOT rebuild centrality scoring: computeGraphCentralityAnalysis() in centrality.ts computes hub and bridge scores.
Do NOT rebuild hotspot detection: getArchitecturalHotspots() in hotspots.ts ranks risk, fan-in, coupling, and cycle issues.
Do NOT rebuild blast radius impact analysis: computeImpactAnalysis() in impact-analysis.ts computes direct/transitive dependents.
Do NOT rebuild 5-level position authority: position-policy.ts strictly protects user-dragged and persisted coordinates.
Do NOT rebuild multi-project isolation: projectState.ts and ProjectStateContext.tsx isolate UI state per projectId.
Do NOT rebuild two-snapshot graph diffs: diff-adapter.ts and architecture-diff.cjs handle two-snapshot comparison.
Do NOT rebuild benchmark infrastructure: benchmark-wave7b.ts and Phase4DAcceptancePerformance.test.ts provide complete timing, memory, and crossing metrics.
11. Missing-Primitives Ledger
Squarified Treemap Layout Engine (N1): Pure TS algorithm calculating squarified rectangular tile dimensions $(x, y, w, h)$ for nested feature/layer containers (Phase 3).
Sankey Flow Band & Y-Offset Router (N1): Pure TS algorithm computing layer-to-layer flow band quantities and vertical offsets (Phase 3).
Octilinear 45-Degree Metro Line Router (N1): Pure TS algorithm routing feature lines and transfer stations on 45-degree angles (Phase 3).
WebGL / Three.js Viewport Renderer (N2): WebGL rendering engine for experimental Phase 7 3D Models A–D.
Multi-Snapshot Time-Series Store (N2): Time-series snapshot registry for Phase 5 Time Machine.
12. Context/Source Discrepancies
Benchmark Harness Reclassification: Historical roadmap docs suggested creating a new benchmark harness (UNIT-002-BENCHMARK-HARNESS). Source code inspection proved benchmark-wave7b.ts and Phase4DAcceptancePerformance.test.ts already exist. Reclassified as EXISTING — EXTEND.
Adapter Registry Framework Rejection: Historical roadmap docs suggested a complex dynamic adapter-registry.ts. Source code inspection confirmed all lenses are statically compiled React components; pure adapter functions (matrix-adapter.ts, tree-adapter.ts) are used directly without over-engineered registry framework.
Feature Discovery Seed Expansion: Historical audit notes mentioned unassigned node collapse when restrictive feature roles context was passed into discoverFeatures(). Current production features.ts seed candidate ranking operates cleanly without restrictive context overrides, discovering 21 semantic feature clusters.
13. Remaining Questions Requiring Execution Evidence
Treemap & Sankey Scale Latency: What is the exact cold performance latency of pure TS Squarified Treemap and Sankey Flow adapters on 5,000+ node scale graphs? (Requires empirical benchmark execution during Phase 3).
Octilinear Subway Line Crossing Counts: How many line crossings does the Octilinear 45-degree router produce on dense real-world org graphs compared to standard 2D layout? (Requires empirical benchmark execution during Phase 3).
Time Machine Memory Footprint: What is the memory footprint when loading 50+ historical project snapshots into memory? (Requires empirical benchmark execution during Phase 5).
G
