# Phase 0 — Architecture Visualization Discovery

## 1. Executive Synthesis

This report delivers the final **Phase 0 Discovery Synthesis** for the Salesforce Architecture Visualization Unification project. It transforms seven independent read-only audit reports (`P0-1_LAYOUT_CAPABILITY_AUDIT.md` through `P0-7_REGRESSION_CONTRACT_AUDIT.md`) and direct current source code evidence (`explorer/src/`) into a single, unified current-state architecture model.

The primary objective of this synthesis is to establish the factual, evidence-backed foundation from which Phase 1 can define the future visualization and workspace architecture without altering application source code, refactoring state, or breaking existing regression contracts.

### Key Current-State Discoveries:

1. **Inventory & Role Differentiation**: The system contains **12 primary visualization lenses** (`GraphView`, `FeatureMatrixPanel`, `CouplingHeatmapPanel`, `DependencyRiverPanel`, `FeatureTreePanel`, `ArchitectureTreemapPanel`, `SubwayPanel`, `DependencyConstellationPanel`, `FeatureProfilePanel`, `RadarPanel`, `ArchitectureDNABarcode`, `FourDirectionPanel`) alongside **6 supporting analytical views** (`ProjectDashboard`, `FindingsPanel`, `HotspotPanel`, `DiagnosticsPanel`, `ComparePanel`, `AnalysisHistoryPanel`). Supporting views provide context, triage, and comparison tools, whereas the 12 primary lenses represent visual projections of architectural topology, flow, hierarchy, metrics, and relationships [P0-1 §2, P0-5 §2].
2. **Canonical Data Architecture**: All 12 visualization lenses derive their data from a single canonical root contract (`ExplorerDataSchema`) defined in `explorer-contract.ts` and `explorer/src/types/explorer.ts`. Data ingestion (`useExplorerData.ts`) normalizes raw payloads via `parseExplorerData` (`schema.ts`). Pure visualization adapters in `explorer/src/lib/adapters/` project `ExplorerDataSchema` into strongly-typed view models without mutating input graph arrays or invoking Position Authority [P0-3 §1, P0-3 §3, P0-7 §14].
3. **State System Ownership & Fragmentation**: UI state is partitioned across **three distinct state systems**:
   - `useViewState` (URL search parameters & React local state): owns `viewMode`, `filterState`, `focusState`, `impactState`, `connectionState`, `selectedFindingId`, and `isInvestigating` [P0-2 §1, P0-2 §3].
   - `ProjectStateContext` / `projectState.ts` (LocalStorage store per project): owns `selectedComponent`, `filters`, `graphLayout` (`nodePositions`, `mode`, `architectureMode`), `zoom`, `sidebarState`, `inspectorState`, and `analysisView` [P0-2 §1, P0-2 §3].
   - `SelectionContext` / `useGraphSelection` (React Context): owns `selectedNodeId`, `selectedEdgeId`, and a 20-item selection `history` [P0-2 §1, P0-2 §3].
4. **Selection vs. Navigation Coupling**: Node selection in **8 out of 12 analytical lenses** (`Matrix`, `Heatmap`, `River`, `Tree`, `Treemap`, `Profile`, `Radar`, `DNA`) executes a hard-coded navigation side effect in `App.tsx`, forcing an immediate workspace mode transition to `'graph'` and opening `InvestigationDrawer.tsx`. In contrast, 3 lenses (`Subway`, `Constellation`, `FourDirection`) support in-place node selection or explicit "Return to Graph" action buttons [P0-2 §1, P0-4 §1, P0-4 §8].
5. **Non-Negotiable Contracts**: The repository enforces strong executable contracts, including a 5-level Position Authority hierarchy (`position-policy.ts`), static-mode coordinate invariance ($0.00000\text{ px}$ drift under automatic UI triggers), project storage isolation (`explorer.projectState.<projectId>`), and URL deep-link restoration (`?node=`, `?project=`, `?focusNode=`) [P0-7 §1, P0-7 §5].
6. **Measured Cold Load Performance**: On the canonical benchmark fixture (`cloud-spend-tracker`, 240 nodes / 1,024 edges / SHA-256 `feeb68f3...`), total cold load pipeline time is **185.8 ms – 189.368 ms** (passing the 1,000 ms SLA gate by over 5x). Viewport pan/zoom/hover operations execute with exactly **0 layout recalculations** [P0-6 §1, P0-6 §7].

---

## 2. Phase 0 Scope

The scope of this discovery synthesis is strictly read-only and analytical. It integrates findings across all 12 primary visualization panels, 6 supporting views, shared hooks, state contexts, data adapters, layout engines, and regression test suites in `explorer/src/`.

### Scope Directives:
- **Zero Source Code Changes**: No application source code in `explorer/src/` has been modified [P0-1 §15, P0-7 §1].
- **Zero Test Modifications**: No existing tests, snapshots, or verification scripts have been altered [P0-7 §1].
- **Zero Premature Merges or Removals**: No visualization lenses or supporting views have been deleted, merged, or renamed [P0-1 §15].
- **Evidence-Grounded Findings Only**: Every finding is backed by explicit citations to source files, tests, benchmarks, or Phase 0 audit reports.

---

## 3. Source Audit Inventory

This synthesis reconciles seven independent Phase 0 audit reports produced during the discovery phase:

1. **P0-1 — Layout Capability Audit** (`P0-1_LAYOUT_CAPABILITY_AUDIT.md`): Establishes visual representations, user questions, interaction capabilities, scale matrix, and visual roles for all 12 primary lenses and 6 supporting views [P0-1 §1–§16].
2. **P0-2 — Shared State & Orchestration Audit** (`P0-2_SHARED_STATE_ORCHESTRATION_AUDIT.md`): Maps state variables, ownership, persistence, project isolation, URL synchronization, and App.tsx orchestration [P0-2 §1–§26].
3. **P0-3 — Data / Adapter / Dependency Audit** (`P0-3_DATA_ADAPTER_DEPENDENCY_AUDIT.md`): Documents data provenance, `ExplorerDataSchema`, 10 pure visualization adapters, shared analytical primitives, and normalization [P0-3 §1–§26].
4. **P0-4 — Cross-Layout Interaction Audit** (`P0-4_CROSS_LAYOUT_INTERACTION_AUDIT.md`): Traces pointer gestures, handlers, selection propagation, navigation side effects, and hover/highlight semantics [P0-4 §1–§32].
5. **P0-5 — User Task / UX Audit** (`P0-5_USER_TASK_UX_AUDIT.md`): Documents 15 core user tasks, entry points, user journeys, context preservation/loss, and friction points [P0-5 §1–§36].
6. **P0-6 — Performance / Density Audit** (`P0-6_PERFORMANCE_DENSITY_AUDIT.md`): Evaluates rendering engines (Canvas, SVG, DOM), DOM element density, cold-load pipeline SLAs, scale tiers (100 to 10,000 nodes), and spatial grid hash partitioning [P0-6 §1–§38].
7. **P0-7 — Regression / Contract Audit** (`P0-7_REGRESSION_CONTRACT_AUDIT.md`): Identifies 79 test files, 5-level position authority, static mode invariance, historical defect chains, and non-negotiable regression contracts [P0-7 §1–§36].

---

## 4. Evidence Model

To maintain scientific rigor and prevent subjective claims, all statements in this synthesis are classified using the following evidence strength hierarchy:

| Evidence Tier | Definition | Example Citation |
| :--- | :--- | :--- |
| **CONFIRMED** | Verified by direct source code inspection, active Vitest unit tests, or measured telemetry. | `[explorer/src/lib/position-policy.ts]`, `[P0-7 §5]` |
| **STRONGLY SUPPORTED** | Backed by multiple independent audit reports and consistent code patterns. | `[P0-1 §4, P0-3 §6]` |
| **SUPPORTED** | Documented in a single Phase 0 audit report with clear source file mapping. | `[P0-5 §4]` |
| **INFERRED** | Logical architectural deduction synthesized from multiple structural code points. | `[P0-2 §15]` |
| **HISTORICAL** | Documented in historical defect logs or prior audit reports; superseded or verified. | `[P0-7 §21]` |
| **UNKNOWN** | Insufficient runtime or code evidence available in the repository. | `[P0-1 §14, P0-6 §34]` |

---

## 5. Current Visualization Inventory

The repository contains 12 primary visualization lenses registered in `WorkspaceViewMode` (`explorer/src/lib/projectState.ts:32`) and rendered inside `App.tsx`:

1. **`GraphView`** (`explorer/src/components/GraphView.tsx`): Interactive node-link dependency graph rendered via Cytoscape.js canvas with 2D SVG feature region enclosure overlays (`FeatureOverlayCanvas`), minimap navigator, and 13-stage geometry layout [P0-1 §3.1, P0-3 §7].
2. **`FeatureMatrixPanel`** (`explorer/src/components/FeatureMatrixPanel.tsx`): Tabular 2D matrix grid rendering feature-to-feature coupling weights sorted by 2D feature layer band order [P0-1 §3.2, P0-3 §7].
3. **`CouplingHeatmapPanel`** (`explorer/src/components/CouplingHeatmapPanel.tsx`): Interactive HTML5 Canvas color-intensity heatmap rendering coupling weights across 4 metric modes (`combined`, `direct`, `flow`, `shared`) [P0-1 §3.3, P0-3 §7].
4. **`DependencyRiverPanel`** (`explorer/src/components/DependencyRiverPanel.tsx`): SVG Sankey macro flow diagram depicting dependency streams across 4 layer stages (`Presentation`, `Application`, `Domain`, `Schema`) with 100% component edge provenance tracking [P0-1 §3.4, P0-3 §7].
5. **`FeatureTreePanel`** (`explorer/src/components/FeatureTreePanel.tsx`): Collapsible 5-level hierarchical tree view (`Root` ➔ `Domain` ➔ `Feature` ➔ `Role` ➔ `Component`) with real-time search auto-expansion [P0-1 §3.5, P0-3 §7].
6. **`ArchitectureTreemapPanel`** (`explorer/src/components/ArchitectureTreemapPanel.tsx`): Nested squarified treemap bounding rectangles sized proportionally by metric mode (`count`, `fanIn`, `fanOut`, `coupling`, `score`) [P0-1 §3.6, P0-3 §7].
7. **`SubwayPanel`** (`explorer/src/components/SubwayPanel.tsx`): Transit-style route schematic map rendering feature transit lines and shared transfer station hub components [P0-1 §3.7, P0-3 §7].
8. **`DependencyConstellationPanel`** (`explorer/src/components/DependencyConstellationPanel.tsx`): Radial polar constellation diagram arranging $N$-hop dependency neighbors on concentric distance rings around a focal component [P0-1 §3.8, P0-3 §7].
9. **`FeatureProfilePanel`** (`explorer/src/components/FeatureProfilePanel.tsx`): Detailed single-component architecture scorecard unifying fan-in/fan-out gauges, risk classifications, and centrality topology flags [P0-1 §3.9, P0-3 §7].
10. **`RadarPanel`** (`explorer/src/components/RadarPanel.tsx`): Multi-dimensional polar radar chart evaluating project-wide health across 6 polar axes with explicit unbacked primitive reporting [P0-1 §3.10, P0-3 §7].
11. **`ArchitectureDNABarcode`** (`explorer/src/components/ArchitectureDNABarcode.tsx`): Multi-band barcode visualization rendering 7 normalized signal bands (`Layer`, `Fan-In`, `Fan-Out`, `Risk`, `Centrality`, `Hotspot`, `Hygiene`) for every component [P0-1 §3.11, P0-3 §7].
12. **`FourDirectionPanel`** (`explorer/src/components/FourDirectionPanel.tsx`): 3x3 cardinal direction quadrant grid categorizing immediate neighbors into Upstream, Downstream, Same-Feature Peers, and Cross-Feature Boundaries [P0-1 §3.12, P0-3 §7].

---

## 6. Supporting Analytical Views

In addition to the 12 primary lenses, the application implements 6 supporting analytical views that provide summary, governance, diagnostic, and comparison capabilities [P0-1 §2, P0-2 §5]:

1. **`ProjectDashboard`** (`explorer/src/components/ProjectDashboard.tsx`): High-level portfolio overview displaying architecture health scores, risk exposure summaries, component counts, and navigation CTAs [P0-1 §2, P0-5 §4].
2. **`FindingsPanel`** (`explorer/src/components/findings/FindingsPanel.tsx`): Issue-oriented rule violation triage surface rendering severity chips, code evidence snippets, line numbers, and resolution workflows [P0-1 §2, P0-5 §4].
3. **`HotspotPanel`** (`explorer/src/components/HotspotPanel.tsx`): Ranked architectural hotspot list classifying components by risk, fan-in, coupling, circular dependency, and refactoring readiness [P0-1 §2, P0-5 §4].
4. **`DiagnosticsPanel`** (`explorer/src/components/DiagnosticsPanel.tsx`): Structural quality diagnostic surface displaying circular dependency cycle loops and unresolved symbol references [P0-1 §2, P0-5 §4].
5. **`ComparePanel`** (`explorer/src/components/ComparePanel.tsx`): Architecture snapshot diff engine displaying executive change summary cards and property-level change lists [P0-1 §2, P0-5 §4].
6. **`AnalysisHistoryPanel`** (`explorer/src/components/AnalysisHistoryPanel.tsx`): Historical analysis timeline listing past project snapshots and supporting pairwise compare launches [P0-1 §2, P0-5 §4].

---

## 7. Evidence Reconciliation

The seven Phase 0 audit reports were produced independently. The following matrix reconciles all meaningful differences, terminology variations, and scope distinctions discovered across reports [P0-1–P0-7]:

| Topic | Discrepancy / Variation | P0 Sources | Code Truth Verification | Reconciled Resolution | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **View Mode Count** | P0-2 references 18 modes, while P0-1 emphasizes 12 primary lenses + 6 views. | P0-1 §2 vs P0-2 §1 | `projectState.ts:32` defines `WorkspaceViewMode` with exactly 18 string union values. | `WorkspaceViewMode` contains 18 total modes: 12 primary visual lenses + 6 supporting analytical views. | TERMINOLOGY DIFFERENCE |
| **URL View State Scope** | P0-2 states URL search param `?view.mode=` supports only `'graph'` and `'findings'`. | P0-2 §1 vs P0-7 §9 | `useViewState.ts:45` parses `?view.mode=` or `?view=` restricted to `'graph' \| 'findings'`. | URL query params currently encode only `'graph'` and `'findings'`. Switching to other 16 modes updates local React state without URL update. | CONFIRMED DIFFERENCE |
| **Selection-Driven Navigation Count** | P0-2 identifies 12 modes with selection navigation, P0-4 isolates 8 explicit automatic switch lenses. | P0-2 §1 vs P0-4 §1 | `App.tsx:598-755` shows `setWorkspaceViewMode('graph')` wired in parent callbacks for 8 primary lenses + 4 supporting panels. | 8 primary lenses (`Matrix`, `Heatmap`, `River`, `Tree`, `Treemap`, `Profile`, `Radar`, `DNA`) + 4 views (`Findings`, `Hotspots`, `Diagnostics`, `Dashboard`) trigger auto-navigation to Graph on selection. | SCOPE DIFFERENCE |
| **Subway Interaction Semantics** | P0-1 notes subway station click navigates to Graph, while P0-4 classifies subway station click as in-place. | P0-1 §3.7 vs P0-4 §4 | `SubwayPanel.tsx:75` updates station selection in-place; clicking explicit `"Explore in Graph"` button invokes navigation. | Subway station marker click updates selection in-place; button click forces navigation. Both reports accurately described distinct interaction surfaces within the panel. | CONFIRMED DIFFERENCE |
| **Position Authority Level 2 Restoration** | P0-7 describes Level 2 position restoration, while P0-2 highlights cold layout calculation. | P0-2 §1 vs P0-7 §17 | `position-policy.ts:78` checks `hasAuthoritativePositions`. If saved positions exist, Level 2 restores them; otherwise Level 4 executes cold layout. | Level 2 restores saved coordinates when present; Level 4 computes layout on initial project intake. | CONFIRMED DIFFERENCE |
| **Adapter Count** | P0-1 lists 12 lenses, P0-3 identifies 10 pure adapter files in `lib/adapters/`. | P0-1 §1 vs P0-3 §1 | `explorer/src/lib/adapters/` contains exactly 10 `.ts` adapter files. `GraphView` uses `graph-builder.ts`, `Heatmap` reuses `matrix-adapter.ts`. | 10 dedicated adapter modules serve 11 lenses (`matrix-adapter` is shared by Matrix and Heatmap); `GraphView` is orchestrated by `graph-builder.ts` + `architecture-layout.ts`. | CONFIRMED DIFFERENCE |

---

## 8. Current Architecture Model

The current application architecture operates as a layered, single-directional data and state pipeline:

```text
               ┌────────────────────────────────────────┐
               │    Browser URL & LocalStorage State    │
               └───────────────────┬────────────────────┘
                                   │
                                   ▼
               ┌────────────────────────────────────────┐
               │            ProjectContext              │
               │   (Active Project ID, Data Manifest)   │
               └───────────────────┬────────────────────┘
                                   │
                                   ▼
               ┌────────────────────────────────────────┐
               │          ProjectStateContext           │
               │  (Persisted UI State, Node Positions)  │
               └───────────────────┬────────────────────┘
                                   │
                                   ▼
               ┌────────────────────────────────────────┐
               │          useExplorerData Hook          │
               │   (HTTP Fetch / Schema Normalization)  │
               └───────────────────┬────────────────────┘
                                   │
                                   ▼
               ┌────────────────────────────────────────┐
               │          ExplorerDataSchema            │
               │      (Canonical Root JSON Model)       │
               └───────────────────┬────────────────────┘
                                   │
                                   ▼
               ┌────────────────────────────────────────┐
               │       Shared Analytical Primitives      │
               │(features, layers, centrality, hotspots)│
               └───────────────────┬────────────────────┘
                                   │
                                   ▼
               ┌────────────────────────────────────────┐
               │         Visualization Adapters         │
               │     (10 Pure Transformation Modules)   │
               └───────────────────┬────────────────────┘
                                   │
                                   ▼
               ┌────────────────────────────────────────┐
               │        Selection & View Context        │
               │(selectedNodeId, filters, focus, impact)│
               └───────────────────┬────────────────────┘
                                   │
                                   ▼
               ┌────────────────────────────────────────┐
               │          App.tsx Orchestrator          │
               │   (18 Workspace View Modes Switcher)   │
               └───────────────────┬────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Canvas Renderers │      │  SVG Renderers   │      │  DOM Renderers   │
│ (Graph, Heatmap) │      │(River, Constell) │      │  (Matrix, Tree)  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 9. Canonical Data Architecture

All application data flows from the canonical root JSON contract (`ExplorerDataSchema`) defined in `explorer-contract.ts` and `explorer/src/types/explorer.ts:47` [P0-3 §1, P0-3 §4]:

```text
ExplorerDataSchema
  ├── summary: ExplorerSummary (totalNodes, totalEdges, totalRiskScore, healthScore)
  ├── nodes: ExplorerNode[] (id, displayName, type, file, metrics, risk, behavior)
  ├── edges: ExplorerEdge[] (id, source, target, relationshipType, evidence, canonical)
  ├── cycles: ExplorerCycleGroup[] (id, size, nodes)
  ├── unresolvedReferences: ExplorerUnresolvedReference[] (id, file, line, symbol)
  └── impactSummaries: Record<string, ExplorerComponentImpactSummary>
```

### Ingestion & Normalization Boundary:
1. **Network Fetch**: `useExplorerData.ts` fetches `/projects/<id>/explorer-data.json` based on the active `project` URL parameter [P0-3 §3].
2. **Schema Validation**: `parseExplorerData` (`schema.ts:12`) validates required root keys and injects safe empty defaults if fields are missing [P0-3 §5].
3. **Endpoint Normalization**: Edge processing creates synthetic `External` node definitions if edges reference non-existent component endpoints [P0-3 §5].
4. **Deterministic Sorting**: Adapters clone and sort node/edge arrays alphabetically by `.id` (`nodes.sort((a,b) => a.id.localeCompare(b.id))`), guaranteeing 100% input-order determinism [P0-3 §5, P0-7 §14].

---

## 10. Shared Analytical Primitives

Rather than reimplementing domain heuristics inside individual views, adapters share a centralized foundation of pure domain functions in `explorer/src/lib/layout/` and `explorer/src/lib/` [P0-3 §1, P0-3 §9]:

1. **`discoverFeatures()`** (`explorer/src/lib/layout/features.ts`): Performs data-driven feature discovery and clustering. Consumed by Matrix, Tree, Treemap, River, Subway, Profile, DNA, and Graph layout [P0-3 §9, P0-3 §10].
2. **`classifyNodeLayer()`** (`explorer/src/lib/layout/layers.ts`): Classifies components into architectural layer bands (`presentation`, `application`, `domain`, `schema`). Consumed by all feature adapters [P0-3 §9, P0-3 §10].
3. **`computeGraphCentralityAnalysis()`** (`explorer/src/lib/layout/centrality.ts`): Computes hub types, bridge status, and spatial centrality roles. Consumed by Profile, DNA, and Graph View [P0-3 §9, P0-3 §10].
4. **`getArchitecturalHotspots()`** (`explorer/src/lib/hotspots.ts`): Categorizes components into ranked hotspot risk categories. Consumed by Profile, Radar, DNA, and HotspotPanel [P0-3 §9, P0-3 §10].
5. **`calculateComponentImpact()`** (`explorer/src/lib/impact-analysis.ts`): Computes direct and transitive blast-radius closure. Consumed by FourDirection and Graph View [P0-3 §9, P0-3 §10].

---

## 11. Adapter Architecture

10 dedicated visualization adapters exist in `explorer/src/lib/adapters/`. Every adapter is a pure, read-only transformer function (`adaptX(data, options)`) [P0-3 §1, P0-3 §6]:

| Adapter Module | Primary Function | Output View Model Interface | Consumer Panel(s) |
| :--- | :--- | :--- | :--- |
| `matrix-adapter.ts` | `adaptFeatureMatrix` | `FeatureMatrixData` | `FeatureMatrixPanel`, `CouplingHeatmapPanel` |
| `sankey-adapter.ts` | `adaptSankeyRiver` | `SankeyAdapterData` | `DependencyRiverPanel` |
| `tree-adapter.ts` | `adaptFeatureTree` | `FeatureTreeData` | `FeatureTreePanel` |
| `treemap-adapter.ts` | `adaptTreemap` | `TreemapData` | `ArchitectureTreemapPanel` |
| `subway-adapter.ts` | `adaptSubwayMap` | `SubwayMapData` | `SubwayPanel` |
| `constellation-adapter.ts` | `adaptConstellation` | `ConstellationData` | `DependencyConstellationPanel` |
| `profile-adapter.ts` | `adaptComponentProfile` | `ComponentProfileData` | `FeatureProfilePanel` |
| `radar-adapter.ts` | `adaptRadarDimensions` | `RadarData` | `RadarPanel` |
| `dna-adapter.ts` | `adaptArchitectureDna` | `ArchitectureDnaData` | `ArchitectureDNABarcode` |
| `four-direction-adapter.ts` | `adaptFourDirectionView` | `FourDirectionData` | `FourDirectionPanel` |

### Adapter Guarantees:
- **100% Immutability**: Inputs are never mutated (`Object.freeze` / defensive cloning) [P0-3 §1, P0-7 §14].
- **Zero Position Authority Calls**: Adapters never write to `nodePositions` or call `position-policy.ts` [P0-3 §1, P0-7 §14].
- **Zero Canonical Graph Mutations**: Adapters never alter `ExplorerDataSchema` properties [P0-3 §1, P0-7 §14].

---

## 12. Visualization Capability Model

Each of the 12 primary visualization lenses addresses specific architectural questions and operates at distinct structural scales [P0-1 §3, P0-1 §5]:

- **`GraphView`**: Addresses global component topology, spatial feature region containment, and impact highlights at the component/node scale [P0-1 §3.1].
- **`FeatureMatrixPanel`**: Addresses feature-to-feature coupling weights and layer alignment in a structured 2D tabular matrix [P0-1 §3.2].
- **`CouplingHeatmapPanel`**: Addresses visual coupling intensity across multi-metric modes (`combined`, `direct`, `flow`, `shared`) via HTML5 Canvas [P0-1 §3.3].
- **`DependencyRiverPanel`**: Addresses macro dependency flow volume moving left-to-right across architectural layer stages with exact component edge provenance [P0-1 §3.4].
- **`FeatureTreePanel`**: Addresses 5-level hierarchical taxonomy (`Root` ➔ `Domain` ➔ `Feature` ➔ `Role` ➔ `Component`) with expand/collapse search auto-expansion [P0-1 §3.5].
- **`ArchitectureTreemapPanel`**: Addresses relative architectural metric density using nested squarified spatial bounding rectangles [P0-1 §3.6].
- **`SubwayPanel`**: Addresses transit-style feature routes and shared transfer station hubs bridging multiple features [P0-1 §3.7].
- **`DependencyConstellationPanel`**: Addresses focal-centric radial $N$-hop dependency influence across concentric orbital distance rings [P0-1 §3.8].
- **`FeatureProfilePanel`**: Addresses single-component metric scorecards, fan-in/fan-out gauges, centrality topology, and risk flags [P0-1 §3.9].
- **`RadarPanel`**: Addresses project-wide multi-dimensional architecture health across 6 polar axes with explicit unbacked primitive reporting [P0-1 §3.10].
- **`ArchitectureDNABarcode`**: Addresses multi-signal architectural barcode fingerprinting (7 bands) for rapid component comparison [P0-1 §3.11].
- **`FourDirectionPanel`**: Addresses cardinal neighborhood classification (Upstream, Downstream, Peers, Cross-Feature) relative to an active subject component [P0-1 §3.12].

---

## 13. Capability Matrix

The following matrix maps the 12 primary visualization lenses against 12 core analytical capabilities [P0-1 §4]:

| Capability | Graph | Matrix | Heatmap | River | Tree | Treemap | Subway | Constellation | Profile | Radar | DNA | FourDirection |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Global Topology** | PRIMARY | NOT PRESENT | NOT PRESENT | SUPPORTING | NOT PRESENT | NOT PRESENT | SUPPORTING | SECONDARY | NOT PRESENT | NOT PRESENT | NOT PRESENT | SUPPORTING |
| **Feature Coupling** | SECONDARY | PRIMARY | PRIMARY | SECONDARY | SUPPORTING | SUPPORTING | SECONDARY | SUPPORTING | SUPPORTING | SECONDARY | SUPPORTING | SECONDARY |
| **Hierarchy** | SECONDARY | SECONDARY | SECONDARY | SECONDARY | PRIMARY | PRIMARY | SECONDARY | NOT PRESENT | SUPPORTING | NOT PRESENT | SUPPORTING | SUPPORTING |
| **Macro Flow** | SUPPORTING | SUPPORTING | SUPPORTING | PRIMARY | NOT PRESENT | NOT PRESENT | SECONDARY | NOT PRESENT | NOT PRESENT | NOT PRESENT | NOT PRESENT | NOT PRESENT |
| **Local Neighborhood** | SECONDARY | NOT PRESENT | NOT PRESENT | NOT PRESENT | NOT PRESENT | NOT PRESENT | SECONDARY | PRIMARY | SUPPORTING | NOT PRESENT | NOT PRESENT | PRIMARY |
| **Component Metrics** | SUPPORTING | NOT PRESENT | NOT PRESENT | SUPPORTING | SUPPORTING | SECONDARY | SUPPORTING | SUPPORTING | PRIMARY | NOT PRESENT | SECONDARY | SUPPORTING |
| **Health Metrics** | SUPPORTING | SUPPORTING | SUPPORTING | SUPPORTING | SUPPORTING | SUPPORTING | SUPPORTING | NOT PRESENT | SECONDARY | PRIMARY | SECONDARY | NOT PRESENT |
| **Risk** | SECONDARY | SUPPORTING | SUPPORTING | SUPPORTING | SUPPORTING | SECONDARY | SUPPORTING | SUPPORTING | SECONDARY | SECONDARY | PRIMARY | SUPPORTING |
| **Directionality** | PRIMARY | SECONDARY | SECONDARY | PRIMARY | NOT PRESENT | NOT PRESENT | SECONDARY | PRIMARY | SECONDARY | NOT PRESENT | NOT PRESENT | PRIMARY |
| **Spatial Structure** | PRIMARY | SECONDARY | SECONDARY | SECONDARY | NOT PRESENT | PRIMARY | SECONDARY | SECONDARY | NOT PRESENT | SECONDARY | NOT PRESENT | SECONDARY |
| **Provenances** | SUPPORTING | NOT PRESENT | NOT PRESENT | PRIMARY | NOT PRESENT | NOT PRESENT | SUPPORTING | NOT PRESENT | SUPPORTING | NOT PRESENT | NOT PRESENT | NOT PRESENT |
| **Comparison** | SUPPORTING | SECONDARY | SECONDARY | SUPPORTING | SUPPORTING | SECONDARY | SUPPORTING | SUPPORTING | SECONDARY | SECONDARY | PRIMARY | SUPPORTING |

---

## 14. Lens Relationship Model

Based on observed implementation data flows and interaction behaviors, relationships between lenses fall into six explicit categories [P0-1 §7, P0-1 §9]:

1. **Alternative Representation (Identical Data Model)**:
   - `FeatureMatrixPanel` $\leftrightarrow$ `CouplingHeatmapPanel`: Both consume `adaptFeatureMatrix()`. Matrix uses an HTML table with numeric weights; Heatmap uses HTML5 Canvas color gradients [P0-1 §7].
   - `FeatureTreePanel` $\leftrightarrow$ `ArchitectureTreemapPanel`: Both consume the 5-level hierarchy from `discoverFeatures()`. Tree uses a collapsible list; Treemap uses squarified bounding boxes [P0-1 §7].
2. **Complementary Scale (Macro ➔ Micro)**:
   - `RadarPanel` (Org macro health) $\rightarrow$ `FeatureMatrixPanel` (Feature coupling) $\rightarrow$ `GraphView` (Global Cartesian topology) $\rightarrow$ `DependencyConstellationPanel` / `FourDirectionPanel` (Local N-hop neighborhood) $\rightarrow$ `FeatureProfilePanel` / `ArchitectureDNABarcode` (Single component fingerprint) [P0-1 §8].
3. **Sequential Investigation Chain**:
   - `FindingsPanel` (Rule violation) $\rightarrow$ `FeatureProfilePanel` (Component scorecard) $\rightarrow$ `GraphView` (Centered canvas with connected edge highlights) [P0-1 §9].
   - `DependencyRiverPanel` (Macro flow stream) $\rightarrow$ `SubwayPanel` (Shared transfer hub) $\rightarrow$ `RefactoringSimulationPanel` (Simulated proposal overlay) [P0-1 §9].
4. **Context Provider $\rightarrow$ Detail Provider**:
   - `SubwayPanel` (Transit routes) provides shared station hubs $\rightarrow$ `FourDirectionPanel` details cardinal upstream/downstream boundaries [P0-1 §7].
5. **Overlapping Topology**:
   - `GraphView` (Global Cartesian layout) overlaps with `DependencyConstellationPanel` (Local polar layout) and `FourDirectionPanel` (3x3 cardinal grid) [P0-1 §7].

---

## 15. User Task Model

Synthesizing user task findings, the application supports 15 concrete user analysis tasks grouped into 6 broader analytical phases [P0-5 §4]:

```text
  ORIENT          LOCATE         UNDERSTAND       DIAGNOSE        INVESTIGATE      SIMULATE / HANDOFF
┌──────────┐    ┌──────────┐    ┌───────────┐   ┌───────────┐    ┌─────────────┐  ┌──────────────────┐
│Task 1:   │    │Task 2:   │    │Task 3:    │   │Task 8:    │    │Task 4:      │  │Task 14:          │
│Org Health│───►│Find Comp │───►│Metrics    │──►│Rule Triage│───►│Dependencies │─►│Refactor Simulate │
│(Radar)   │    │(Search)  │    │(Profile)  │   │(Findings) │    │(Drawer)     │  │(Simulation)      │
└──────────┘    └──────────┘    └───────────┘   └───────────┘    └─────────────┘  └──────────────────┘
                      │               │               │                 │                  │
                      ▼               ▼               ▼                 ▼                  ▼
                ┌──────────┐    ┌───────────┐   ┌───────────┐    ┌─────────────┐  ┌──────────────────┐
                │Task 12:  │    │Task 5/6:  │   │Task 7/9:  │    │Task 10/11:  │  │Task 15:          │
                │Subway Hub│    │Flow/Matrix│   │Hotspots/  │    │Constel/4Dir │  │Refactor Handoff  │
                │(Subway)  │    │(River)    │   │Cycles     │    │(Radial)     │  │(Handoff Modal)   │
                └──────────┘    └───────────┘   └───────────┘    └─────────────┘  └──────────────────┘
```

### Analytical Phase Grouping:
- **ORIENT**: Task 1 (Understand Overall Architecture Health & Risk Exposure) [P0-5 §4].
- **LOCATE**: Task 2 (Locate Architectural Component via Search/Inventory/Palette) [P0-5 §4].
- **UNDERSTAND**: Task 3 (Inspect Component Scorecard/DNA), Task 5 (Trace Macro Flow Volume), Task 6 (Analyze Inter-Feature Coupling), Task 12 (Identify Shared Transfer Hubs) [P0-5 §4].
- **DIAGNOSE**: Task 7 (Identify Architectural Hotspots), Task 8 (Triage Rule Findings), Task 9 (Inspect Circular Cycles & Unresolved Symbols), Task 13 (Compare Snapshot Diffs) [P0-5 §4].
- **INVESTIGATE**: Task 4 (Investigate Direct/Transitive Dependencies), Task 10 (Explore Radial N-Hop Neighborhood), Task 11 (Inspect Cardinal Direction Neighborhood) [P0-5 §4].
- **SIMULATE / HANDOFF**: Task 14 (Simulate Refactoring Operations), Task 15 (Hand Off Refactoring Context) [P0-5 §4].

---

## 16. Current Investigation Journey

The observed current-state user journey moves through distinct analytical levels:

```text
Project Select (Header)
        ↓
Overview / Health Orientation (Dashboard / Radar)
        ↓
Locate Entity (Search / Command Palette / Inventory / Matrix)
        ↓
Select Component (selectedNodeId updated)
        ↓
Lens Perspective (Tree / Treemap / River / Subway / Constellation / FourDirection / DNA / Profile)
        ↓
Detailed Inspection (InvestigationDrawer opens on right)
        ↓
Topological Focus (Switch to GraphView, node centered, edges lit)
        ↓
Sub-Graph Focus / Blast Radius (Focus Controls / Impact Analysis)
        ↓
Simulate / Export (Refactoring Simulation / Handoff Modal)
```

### Context Preservation & Transformation in Journey:
- **Preserved**: `selectedNodeId`, active `project`, search filters, and visible node types survive across all lens changes [P0-2 §12, P0-5 §9].
- **Transformed**: Component $(x,y)$ spatial coordinates transform between Cartesian space (`GraphView`), polar radial space (`Constellation`), 3x3 cardinal grid (`FourDirection`), schematic transit lines (`Subway`), tabular bands (`Matrix`), and vertical trees (`Tree`) [P0-5 §1].
- **Lost**: Active refactoring simulation proposals and transient drawer drill paths are lost upon project switching [P0-5 §10].

---

## 17. Context Continuity Model

The following matrix documents what investigation context currently survives across lens changes, project switches, URL deep links, and localStorage persistence [P0-2 §3, P0-2 §11, P0-5 §9, P0-7 §9]:

| Context Variable | Survives Lens Change | Survives Project Change | URL Parameter | Persisted in LocalStorage | Test Protected |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`activeProjectId`** | Yes | N/A (Is Target) | `?project=<id>` | `explorer.activeProjectId` | Yes (`ProjectContext.test.tsx`) |
| **`selectedNodeId`** | Yes | Cleared (`null`) | `?node=<id>` | `projectState.selectedComponent` | Yes (`CrossLayout.test.tsx`) |
| **`selectedEdgeId`** | Yes | Cleared (`null`) | `?edge=<id>` | In-Memory | Yes (`useGraphSelection.test.ts`) |
| **`selectedFindingId`**| Yes | Cleared (`null`) | `?finding=<id>` | In-Memory | Yes (`App.deepLink.test.tsx`) |
| **`filterState`** | Yes | Reset to Default | `?filter.q=...` | `projectState.filters` | Yes (`search-filter.test.ts`) |
| **`visibleNodeTypes`**| Yes | Restored for Project| In-Memory | `projectState.filters.visibleNodeTypes`| Yes (`search-filter.test.ts`) |
| **`focusState`** | Yes | Reset to Empty | `?focusNode=...` | In-Memory | Yes (`focus-graph.test.ts`) |
| **`impactState`** | Yes | Reset to Empty | `?impactNode=...` | In-Memory | Yes (`impact-analysis.test.ts`) |
| **`nodePositions`** | Yes | Restored for Project| None | `projectState.graphLayout.nodePositions`| Yes (`positionAuthority.test.tsx`) |
| **`workspaceViewMode`**| N/A | Preserved | `?view.mode=` | `projectState.analysisView.viewMode` | Yes (`ViewModeSwitcher.test.tsx`) |
| **`isInvestigating`** | Yes | Set `false` | `?investigate=true`| In-Memory | Yes (`App.investigationWorkflow.test.tsx`)|
| **`compareState`** | Exited | Cleared | None | In-Memory | Yes (`ComparePanel.test.tsx`) |
| **`simulation`** | Preserved | Cleared | None | In-Memory | Yes (`RefactoringSimulation.test.tsx`) |

---

## 18. Current State Architecture

State ownership is currently split across five distinct layers [P0-2 §2]:

```text
Layer 1: Browser Storage & URL
  ├── URL Query String (?project=, ?node=, ?edge=, ?view=, ?investigate=)
  └── LocalStorage (explorer.activeProjectId, explorer.projectState.<projectId>)

Layer 2: React Context Stores
  ├── ProjectContext (activeProjectId, project manifest, data URL resolution)
  ├── ProjectStateContext (projectState.ts store reader/writer)
  └── SelectionContext (selectedNodeId, selectedEdgeId, selection history)

Layer 3: Top-Level Custom Hooks
  ├── useViewState (URL sync, filterState, focusState, impactState, selectedFindingId)
  ├── useExplorerData (HTTP fetch, schema parsing, data state)
  ├── useCompareState (snapshot diff buffers)
  └── useCommandPalette (palette open state)

Layer 4: App.tsx Local React State
  ├── workspaceViewMode (18 modes React useState)
  ├── activeSimulationProposal & simulationStepIndex
  ├── committedMutatedGraph
  ├── isSidebarCollapsed
  ├── drillPath & recentNodeIds
  └── constellationOptions

Layer 5: Lens-Local Component State
  ├── FeatureMatrixPanel: hoveredCell, minWeight
  ├── CouplingHeatmapPanel: metricMode, hoveredCellInfo
  ├── DependencyRiverPanel: selectedFlowId, hoveredFlowId
  ├── FeatureTreePanel: expandedNodeIds
  ├── ArchitectureTreemapPanel: metricMode, colorScheme, activeSubtreeId
  ├── SubwayPanel: selectedStation, showCrossLineTracks
  ├── DependencyConstellationPanel: maxDepth, direction
  ├── FeatureProfilePanel: activeProfileId, searchFilter
  ├── RadarPanel: hoveredDimId, selectedDimId
  ├── ArchitectureDNABarcode: activeComponentId, searchFilter
  └── FourDirectionPanel: subjectNodeId, quadrantSearch
```

---

## 19. State Domain Model

Current state variables are grouped into six semantic state domains [P0-2 §3, P0-2 §7, P0-2 §8]:

1. **Entity Investigation State**: `selectedNodeId`, `selectedEdgeId`, `selectedFindingId`, `selectedCycleId`, `selection.history`, `drillPath`, `recentNodeIds`, `isInvestigating`, `isPinned`, `isDetached`.
2. **Navigation State**: `workspaceViewMode` (18 modes), `viewMode` (`'graph' | 'findings'`), `analysisView.viewMode`, `activeProjectId`, URL query view parameters.
3. **Graph Exploration State**: `focusState` (`focusNodeId`, `depth`, `direction`), `impactState` (`originNodeId`, `depth`), `connectionState` (`sourceNodeId`, `targetNodeId`, `direction`, `depth`), `constellationOptions`.
4. **Visibility / Filtering State**: `filterState.searchQuery`, `filterState.typeFilter`, `filterState.riskFilter`, `visibleNodeTypes`, `hasCallouts`, `withoutSharing`, `hideTests`, `hasAsyncPatterns`.
5. **Layout State**: `nodePositions` (Record<string, {x,y}>), `layoutMode` (`'interactive' | 'static'`), `architectureMode` (`'hierarchical' | 'hybrid'`), `layoutProvenance`, Cytoscape viewport zoom/pan.
6. **Project State**: `activeProjectId`, `projects` manifest, project UI state slices (`explorer.projectState.<id>`), `compareState`, `activeSimulationProposal`, `committedMutatedGraph`.

---

## 20. Selection / Navigation Reconciliation

The following table documents the exact current behavior across all 12 primary lenses and 6 supporting views when an entity is selected or clicked [P0-2 §13, P0-4 §4, P0-4 §7]:

| Lens / Surface | Click Selects? | Selection Persists In Lens? | Click Forces Navigation to Graph? | Explicit Graph Navigation Button Available? | Opens Investigation Drawer? | Code Location / Evidence |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **GraphView** | Yes | Yes | N/A (Is Graph) | N/A (Is Graph) | Yes | `GraphView.tsx:158` |
| **FeatureMatrixPanel** | Yes | Yes | Yes (Auto-switch) | No | Yes | `App.tsx:744` |
| **CouplingHeatmapPanel**| Yes | Yes | Yes (Auto-switch) | No | Yes | `App.tsx:861` |
| **DependencyRiverPanel**| Yes | Yes | Yes (Auto-switch) | Yes (`"← Return to Graph"`) | Yes | `App.tsx:881` |
| **FeatureTreePanel** | Yes | Yes | Yes (Auto-switch) | Yes (`"Explore in Graph Canvas →"`) | Yes | `App.tsx:941` |
| **ArchitectureTreemapPanel**| Yes | Yes | Optional (On button click) | Yes (`"Explore in Graph Canvas"`) | Yes | `App.tsx:796` |
| **SubwayPanel** | Yes | Yes | Optional (On button click) | Yes (`"Explore in Graph"`) | Yes | `App.tsx:818` |
| **DependencyConstellationPanel**| Yes | Yes | Optional (On button click) | Yes (`"← Return to Graph"`) | Yes | `App.tsx:830` |
| **FeatureProfilePanel** | Yes | Yes | Yes (Auto-switch) | Yes (`"Explore in Graph Canvas →"`) | Yes | `App.tsx:901` |
| **RadarPanel** | No (Axis click) | N/A | No | No | No | `RadarPanel.tsx:60` |
| **ArchitectureDNABarcode**| Yes | Yes | Yes (Auto-switch) | Yes (`"Explore in Graph Canvas →"`) | Yes | `App.tsx:841` |
| **FourDirectionPanel** | Yes | Yes | Optional (On button click) | Yes (`"← Return to Graph"`) | No | `App.tsx:850` |
| **FindingsPanel** | Yes (Finding) | Yes | Yes (On Investigate click) | Yes (`"🔍 Investigate <Node>"`) | Yes | `App.tsx:962` |
| **HotspotPanel** | Yes (Hotspot) | Yes | Yes (On Select click) | Yes (`"🔍 Select Component"`) | Yes | `App.tsx:980` |
| **DiagnosticsPanel** | Yes (Cycle) | Yes | Yes (On Highlight click) | Yes (`"Highlight Cycle on Graph"`) | Yes | `App.tsx:995` |
| **ProjectDashboard** | Yes (CTA) | Yes | Yes (On CTA click) | Yes (`"Explore Dependency Graph"`) | Yes | `App.tsx:760` |
| **ComparePanel** | Yes (Diff item) | Yes | Yes (On Focus click) | Yes (`"🔍 Focus"`) | Yes | `ComparePanel.tsx:120` |
| **AnalysisHistoryPanel**| No | N/A | No (Launches Compare) | No | No | `AnalysisHistoryPanel.tsx:80` |

---

## 21. Visibility / Filtering Model

Visibility and filtering interactions update presentation views without mutating canonical graph data or position authority [P0-4 §14, P0-7 §7]:

```text
User Toggles Node Type Filter (Sidebar / SearchFilterPanel)
                        │
                        ▼
           filterState.visibleNodeTypes Updated
                        │
                        ▼
   App.tsx Re-computes visibleActiveData via filterGraphByNodeTypes()
                        │
                        ▼
   All 12 Visual Lenses & Supporting Views Receive Filtered Node Set
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
   GraphView Redraws          Analytical Lenses Redraw
 (Hidden types removed)      (Rows/cells for type hidden)
```

### Invariants:
- **Canonical Non-Interference**: `filterGraphByNodeTypes` in `search-filter.ts:88` returns a new filtered array; input `ExplorerDataSchema` arrays are never mutated [P0-4 §14, P0-7 §7].
- **Position Authority Invariance**: Hiding a node type in Static mode hides the nodes visually, but saved coordinates (`nodePositions`) in `localStorage` remain unchanged [P0-7 §7].
- **Interactive Fade vs Removal**: In `GraphView` interactive mode, selecting a node applies a `.dimmed` class (`opacity: 0.15`) to non-connected components rather than removing them from Cytoscape [P0-4 §4, P0-7 §7].

---

## 22. Data / State / View Separation

Analyzing the current codebase reveals a strong emerging separation into five clean architectural layers [P0-3 §3, P0-3 §20]:

```text
1. DOMAIN DATA LAYER
   └── ExplorerDataSchema (nodes, edges, cycles, unresolved, summaries) in types/explorer.ts

2. ANALYTICAL DERIVATION LAYER
   └── Shared Primitives in lib/layout/ (discoverFeatures, classifyNodeLayer, centrality, hotspots)

3. INVESTIGATION STATE LAYER
   └── SelectionContext, useViewState, ProjectStateContext, URL query serializers

4. LENS VIEW MODEL LAYER
   └── Pure Adapters in lib/adapters/ (matrix-adapter, tree-adapter, profile-adapter, etc.)

5. RENDERER LAYER
   └── React Components in components/ (Cytoscape Canvas, HTML5 Canvas, SVG, DOM Table/Grid)
```

### Evidence of Separation:
- **Adapters never import React components or CSS** [P0-3 §20].
- **UI panels never import other UI panels** [P0-3 §20].
- **Domain primitives never depend on UI context or Position Authority** [P0-3 §4, P0-7 §14].

---

## 23. Performance Architecture

### Cold Load Baseline:
- **MEASURED**: On the canonical benchmark fixture (`cloud-spend-tracker`, 240 nodes / 1,024 edges), cold load pipeline timing is **185.8 ms – 189.368 ms** (passing the 1,000 ms SLA gate by over 5x) [P0-6 §1, P0-6 §24].
  - Schema parsing (`parseExplorerData`): 3.3 ms [P0-6 §6.1].
  - Analysis computation (`computeArchitectureAnalysis`): 12.5 ms [P0-6 §6.2].
  - Filter application (`filterGraphByNodeTypes`): 0.8 ms [P0-6 §6.3].
  - Architecture layout (`computeArchitectureLayout`): 154.6 ms [P0-6 §7].
  - Cytoscape element building (`buildGraphElements`): 18.2 ms [P0-6 §24].

### Scale Tier Telemetry:

| Scale Tier | Nodes | Edges | Features | Cold Pipeline Runtime | Peak RSS Memory | Heap Status | Classification |
|---|---|---|---|---|---|---|---|
| **Tier 1 (T1)** | 100 | 191 | ~10 | 110.08 ms | 155.04 MB | 38.74 MB | Real-time Interactive |
| **Tier 2 (T2)** | 250 | 493 | ~25 | 151.19 ms | 162.54 MB | 39.38 MB | Real-time Interactive |
| **Tier 3 (T3)** | 1,000 | 2,035 | ~80 | 1,577.85 ms | 210.68 MB | 50.59 MB | Real-time Interactive |
| **Tier 4 (T4)** | 2,500 | 5,007 | ~150 | 10,337.91 ms | 280.83 MB | 155.09 MB | Near Interactive |
| **Tier 5 (T5)** | 5,000 | 10,130 | ~300 | 49,880.54 ms | 236.93 MB | 114.17 MB | Headless / Batch Boundary |
| **Tier 6 (T6)** | 10,000 | 19,917 | ~600 | 318,381.17 ms | 525.14 MB | 305.46 MB | Headless / Batch Boundary |

*Evidence: `performance.test.ts`, `scalability-layout.test.ts`, `FEAT-PERF-report.md` [P0-6 §23].*

---

## 24. Density / Scale Model

Each visualization lens exhibits distinct scaling behaviors and dominant scale dimensions [P0-6 §5, P0-6 §11]:

| Lens | Dominant Scale Dimension | Renderer | Elements Formula (CST Fixture) | Density Constraint / Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Graph** | Nodes ($N$) & Edges ($E$) | Canvas + SVG | $N + E + F = \mathbf{1,290\text{ elements}}$ | Far-zoom edge & overlay suppression ($z < 0.6$). |
| **Matrix** | Feature count ($F$) | DOM Table | $F \times F + 2F = \mathbf{728\text{ cells}}$ | Scrollable table container; threshold input. |
| **Heatmap** | Feature pairs ($F \times F$) | HTML5 Canvas | $1\text{ canvas node } (676\text{ cell draws})$ | Dynamic cell sizing ($\text{cellSize} = \lfloor 640/F \rfloor$, min 28px). |
| **River** | Layer depth ($L$) & Flows | SVG | $N + E_{\text{flow}} + L = \mathbf{424\text{ SVG elements}}$ | Proportional flow stroke-width scaling. |
| **Tree** | Hierarchy depth ($D$) | DOM List | $D + F + N = \mathbf{270\text{ DOM rows}}$ | Real-time search auto-expansion; virtual scroll. |
| **Treemap** | Leaf components ($N$) | SVG | $D + F + N = \mathbf{270\text{ SVG rects}}$ | Squarified box packing; text overflow truncation. |
| **Subway** | Stations ($S$) & Routes ($R$) | SVG | $R + S = \mathbf{128\text{ SVG elements}}$ | Topological station sorting to minimize crossings. |
| **Constellation** | Focal degree ($K$) | SVG | $K_{\text{rings}} + N_{\text{sub}} + E_{\text{sub}} = \mathbf{110\text{ elements}}$ | Bounded strictly to $N$-hop orbital neighborhood. |
| **Profile** | Components ($N$) | DOM Cards | $N \times 4 = \mathbf{960\text{ DOM cards/bars}}$ | Filterable component list; scrollable split-pane. |
| **Radar** | Fixed dimensions (9) | SVG | $9\text{ axes} + 2\text{ webs} = \mathbf{20\text{ SVG elements}}$ | Bounded $O(1)$ fixed radial geometry. |
| **DNA** | Component count ($N$) | DOM/SVG | $F_{\text{bands}} + N_{\text{ticks}} = \mathbf{266\text{ elements}}$ | Normalized $[0, 1]$ signal bands; horizontal ticks. |
| **FourDirection**| Subject degree ($K$) | DOM Grid | $4\text{ quadrants} + N_{\text{sub}} = \mathbf{42\text{ elements}}$ | Bounded 3x3 cardinal grid with scrollable cards. |

---

## 25. Regression Contract Baseline

The following core behavioral contracts are backed by executable tests and must be preserved during Phase 1+ refactoring [P0-7 §5, P0-7 §17]:

1. **5-Level Position Authority Hierarchy**: Governed by `position-policy.ts`. Level 1 (user drag) > Level 2 (persisted project state) > Level 3 (canvas position) > Level 4 (intelligent layout) > Level 5 (deterministic fallback). Verified by `GraphView.positionAuthority.test.tsx` [P0-7 §17].
2. **Static Mode Coordinate Invariance**: In static mode (`layoutMode === 'static'`), automatic UI triggers (filtering, search, node selection, panel toggling) modify node coordinates by **exactly 0.00000 px**. Coordinates change strictly upon user drag or explicit "Reset Layout". Verified by `AdversarialWave5.test.tsx` [P0-7 §17].
3. **Project Storage Isolation**: Storage keys are strictly namespaced under `explorer.projectState.<projectId>`. Switching projects dispatches `explorer:project-changed`, executing synchronous state flushes and URL cleanup (`node`, `finding`). Verified by `ProjectStatePersistenceAndIsolation.test.tsx` [P0-7 §11].
4. **Deep-Link Restoration**: URL query parameters (`?project=`, `?node=`, `?investigate=`, `?depth=`, `?direction=`, `?view=`) faithfully restore active project, selection, focus depth, and workspace lens. Verified by `App.deepLink.test.tsx` [P0-7 §9].
5. **Cross-Layout Selection Synchronization**: Selecting node ID `X` in any lens highlights `X` across all active panels. Verified by `CrossLayoutVisibilityAndSelection.test.tsx` [P0-7 §12].
6. **Pure Adapter Immutability**: All 10 adapters in `explorer/src/lib/adapters/` are side-effect-free functions that do not mutate input arrays or call Position Authority. Verified by adapter unit test suites [P0-7 §14].

---

## 26. Regression Dependency Graph

The following dependency chains expose high blast-radius interaction and state sequences in the repository [P0-2 §16, P0-7 §19]:

```text
Project Change Event (ProjectContext.tsx)
   ↓
explorer:project-changed Custom Window Event
   ↓
useViewState Listener ──► Clears selectedNodeId, selectedFindingId, URL node params
   ↓
ProjectStateContext Listener ──► Flushes active state & hydrates target project state
   ↓
useExplorerData Listener ──► Resets data buffer & fetches /projects/<new-id>/explorer-data.json
   ↓
Level 2 Position Authority Restoration (position-policy.ts)
   ↓
GraphView & Analytical Lens Re-render
```

```text
User Drags Node in Canvas (GraphView.tsx)
   ↓
Cytoscape dragfree Event
   ↓
sessionPositionsRef Updated (Level 1 In-Session Authority)
   ↓
saveProjectState Invoked (Level 2 LocalStorage Persistence)
   ↓
onNodePositionsChange Callback Dispatched (provenance: 'user-authored')
```

---

## 27. Architectural Coupling Map

The current implementation contains direct couplings across state, navigation, rendering, and persistence layers [P0-2 §19, P0-4 §8]:

```text
[ App.tsx Orchestrator ]
  ├── Hard State Coupling ──► 15 local useState hooks, 8 useRefs, direct simulation state
  ├── Navigation Coupling ──► Direct setWorkspaceViewMode('graph') in 12 panel callbacks
  ├── Selection Coupling ───► Manual synchronization between SelectionContext and useViewState
  └── Project Coupling ────► Dual contexts (ProjectContext vs ProjectStateContext) via DOM event

[ Visualization Panels ]
  ├── Data Coupling ────────► Direct prop dependency on visibleActiveData
  └── Action Coupling ──────► Hard-coded "Explore in Graph Canvas" callbacks invoking setWorkspaceViewMode
```

---

## 28. Shared Foundation Candidates

The discovery audit identifies several capabilities that are currently duplicated or split across components and are strong candidates for shared foundation abstractions in Phase 1 [P0-2 §20, P0-3 §10]:

1. **Unified Investigation Context**: A single authoritative context managing entity selection (`selectedNodeId`, `selectedEdgeId`), focus depth, and active investigation state [P0-2 §20].
2. **Centralized Selector / Memoization Layer**: A shared memoized selector layer wrapping `discoverFeatures`, `classifyNodeLayer`, `computeGraphCentralityAnalysis`, and `getArchitecturalHotspots` to prevent redundant re-computation when multiple panels are mounted [P0-3 §10].
3. **Canonical Workspace View Switcher & URL Router**: A unified router synchronizing all 18 workspace view modes with URL query parameters [P0-2 §15].
4. **Standardized Lens Adapter Protocol**: A common TypeScript interface for all analytical adapters defining consistent view-model signatures, empty states, and selection metadata [P0-3 §18].

---

## 29. Lens-Specific Responsibilities

To avoid over-consolidation, the audit confirms that the following responsibilities must remain strictly lens-specific [P0-1 §15, P0-3 §7, P0-6 §8]:

- **Graph Geometry & Spatial Layout**: 13-stage hybrid band packing (`architecture-layout.ts`) and Cytoscape canvas rendering [P0-3 §7].
- **HTML5 Canvas Color Intensity Rendering**: Multi-metric pixel matrix drawing in `CouplingHeatmapPanel` [P0-3 §7, P0-6 §8].
- **Sankey Bézier Path Calculation**: Stage column assignment and cubic Bézier path generation in `sankey-layout.ts` [P0-3 §7].
- **Squarified Treemap Tiling**: 2D recursive box packing algorithm in `treemap-layout.ts` [P0-3 §7].
- **Polar Radial Coordinate Assignment**: Concentric ring radius and angular sector calculation in `constellation-layout.ts` [P0-3 §7].
- **Subway Route Track Schematic**: Feature transit line Y-assignment and transfer hub detection in `subway-adapter.ts` [P0-3 §7].

---

## 30. Architectural Boundaries

The repository demonstrates eight explicit architectural boundaries [P0-3 §19, P0-3 §20]:

1. **Network / Schema Boundary**: `useExplorerData.ts` and `parseExplorerData` (`schema.ts`).
2. **Domain Analytics Boundary**: Pure functions in `explorer/src/lib/layout/` (`features.ts`, `layers.ts`, `centrality.ts`).
3. **Adapter Boundary**: Pure transformation modules in `explorer/src/lib/adapters/`.
4. **Position Authority Boundary**: `position-policy.ts` (Level 1–5 hierarchy).
5. **State Context Boundary**: `ProjectContext.tsx`, `ProjectStateContext.tsx`, `SelectionContext.tsx`.
6. **Workspace Routing Boundary**: `ViewModeSwitcher.tsx` and `App.tsx` switch statement.
7. **Renderer Boundary**: Cytoscape Canvas, HTML5 Canvas, SVG, DOM Table/Grid.
8. **Test Contract Boundary**: Vitest test suites in `explorer/src/test/` and CLI change gate scripts.

---

## 31. Candidate Semantic Workspace Domains

Evaluating user questions and data models indicates that the 18 workspace view modes naturally cluster into five candidate semantic workspace domains [P0-1 §6, P0-5 §7]:

| Candidate Workspace Domain | Included Views / Lenses | Shared User Question | Shared Primary Data | Shared Primary Interaction | Evidence Strength |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Portfolio & Health** | `ProjectDashboard`, `RadarPanel`, `AnalysisHistoryPanel` | "What is the overall health, risk exposure, and history of this architecture?" | `summary`, health dimensions, snapshot history | Metric hover, timeline compare launch | **STRONGLY EVIDENCE-BACKED** |
| **2. Topological Structure**| `GraphView`, `FeatureTreePanel`, `ArchitectureTreemapPanel` | "How is the system organized topologically and hierarchically?" | Component nodes, 5-level hierarchy, 2D feature bounds | Node drag, tree expansion, treemap drill | **STRONGLY EVIDENCE-BACKED** |
| **3. Feature Relationships** | `FeatureMatrixPanel`, `CouplingHeatmapPanel`, `DependencyRiverPanel`, `SubwayPanel` | "How do feature clusters depend on each other and where does flow concentrate?" | Feature coupling matrix, layer flow streams, subway transit tracks | Cell hover, metric mode switch, flow stream click | **STRONGLY EVIDENCE-BACKED** |
| **4. Local Neighborhood** | `DependencyConstellationPanel`, `FourDirectionPanel`, `FeatureProfilePanel`, `ArchitectureDNABarcode` | "What is the immediate N-hop neighborhood and metric profile of component X?" | Focal $N$-hop neighborhood, cardinal quadrants, DNA bands | Re-centering focal node, cardinal list filter, profile tabs | **STRONGLY EVIDENCE-BACKED** |
| **5. Governance & Quality** | `FindingsPanel`, `HotspotPanel`, `DiagnosticsPanel`, `ComparePanel` | "Where are rule violations, hotspots, cycles, and snapshot diffs?" | Architecture findings, cycle groups, unresolved symbols, diffs | Triage status buttons, cycle highlights, diff entity focus | **STRONGLY EVIDENCE-BACKED** |

---

## 32. Visualization-as-Lens Analysis

The discovery audit evaluated the core architectural hypothesis:
> *"A visualization is a lens, not a destination."*

### Evidence Supporting the Hypothesis:
- **Shared Data Model**: All 12 lenses project the exact same underlying `ExplorerDataSchema` graph dataset [P0-3 §1].
- **Shared Selection**: Selecting component `X` in any lens updates `selectedNodeId` centrally, highlighting `X` across all active panels [P0-2 §12, P0-4 §6].
- **Shared Filtering**: Toggling `visibleNodeTypes` in the sidebar filters nodes simultaneously across all 12 lenses [P0-4 §14].
- **Complementary Analytical Value**: Viewing component `X` in `GraphView` exposes its 2D Cartesian layout; viewing `X` in `FourDirectionPanel` exposes its cardinal upstream/downstream boundaries; viewing `X` in `ArchitectureDNABarcode` exposes its 7-band fingerprint [P0-1 §7, P0-5 §7].

### Where the Model Currently Leak / Breaks:
- In 8 out of 12 lenses, selecting a component forces an immediate navigation command back to `GraphView`, treating `GraphView` as the exclusive destination rather than allowing the active lens to remain the active workspace context [P0-2 §1, P0-4 §8].

---

## 33. Lens vs Destination Leakage

The following table documents explicit leakage points where interacting inside an analytical lens triggers implicit navigation to `GraphView` [P0-2 §13, P0-4 §8]:

| Interaction Location | Action Executed | Primary Intended Semantics | Combined Execution in Current Code | Classification |
| :--- | :--- | :--- | :--- | :--- |
| `FeatureMatrixPanel` cell | Click cell | Select feature anchor component | `selection.selectNode(anchorId)` + `setWorkspaceViewMode('graph')` | COMBINED SELECTION + NAVIGATION |
| `CouplingHeatmapPanel` cell | Click cell | Select feature anchor component | `selection.selectNode(anchorId)` + `setWorkspaceViewMode('graph')` | COMBINED SELECTION + NAVIGATION |
| `DependencyRiverPanel` stream | Click node | Select component node | `selection.selectNode(nodeId)` + `setWorkspaceViewMode('graph')` | COMBINED SELECTION + NAVIGATION |
| `FeatureTreePanel` row | Click row | Select component node | `selection.selectNode(nodeId)` + `setWorkspaceViewMode('graph')` | COMBINED SELECTION + NAVIGATION |
| `FeatureProfilePanel` item | Click item | Select component profile | `selection.selectNode(nodeId)` + `setWorkspaceViewMode('graph')` | COMBINED SELECTION + NAVIGATION |
| `ArchitectureDNABarcode` row | Click row | Select component barcode | `selection.selectNode(nodeId)` + `setWorkspaceViewMode('graph')` | COMBINED SELECTION + NAVIGATION |
| `FindingsPanel` card | Click "Investigate" | Investigate finding component | `selection.selectNode(nodeId)` + `setWorkspaceViewMode('graph')` | COMBINED SELECTION + NAVIGATION |
| `HotspotPanel` row | Click "Select" | Select hotspot component | `selection.selectNode(nodeId)` + `setWorkspaceViewMode('graph')` | COMBINED SELECTION + NAVIGATION |

---

## 34. Architectural Opportunity Map

The discovery audit identifies four categories of architectural opportunities for Phase 1+ [P0-2 §20, P0-3 §28]:

### Category A: Strongly Evidenced Shared Foundation
- Unifying state orchestration into a single authoritative Investigation Context (combining selection, focus, impact, and drawer state) [P0-2 §20].
- Wrapping shared domain primitives (`discoverFeatures`, `classifyNodeLayer`, `centrality`) in a centralized memoized selector layer [P0-3 §10].
- Standardizing the 10 pure visualization adapters under a common TypeScript interface protocol [P0-3 §18].

### Category B: Strongly Evidenced Lens-Specific Responsibility
- Preserving independent rendering implementations for Cytoscape Canvas, HTML5 Canvas Heatmap, SVG River, SVG Constellation, and DOM Trees [P0-6 §8].
- Maintaining lens-specific layout geometry algorithms in dedicated layout modules (`sankey-layout.ts`, `treemap-layout.ts`, `constellation-layout.ts`) [P0-3 §7].

### Category C: Existing Coupling to Address in Phase 1
- Decoupling node selection from workspace view mode navigation across analytical lenses [P0-2 §1, P0-4 §8].
- De-concentrating top-heavy local state and orchestration in `App.tsx` [P0-2 §15].
- Serializing all 18 workspace view modes into URL search parameters (`?view.mode=`) [P0-2 §15].

### Category D: Unknown / Requires Phase 1 Validation
- Evaluating Web Worker offloading for synthetic scale graph layout calculations ($> 2,500$ nodes) [P0-6 §36].

---

## 35. Migration Risk Map

Risk categories for codebase areas based on contract density, test coverage, and dependent systems [P0-7 §31]:

| Code Area / System | Contract Density | Test Coverage | Dependent Systems | Migration Risk Classification |
| :--- | :---: | :---: | :---: | :--- |
| `position-policy.ts` & `GraphView.tsx` | EXTREME | 49 tests | Layout, Dragging, Persistence | **HIGH CONTRACT DENSITY** |
| `projectState.ts` & `ProjectStateContext.tsx` | EXTREME | 25 tests | LocalStorage, Project Switching | **HIGH CONTRACT DENSITY** |
| `useViewState.ts` & `lib/url/` | HIGH | 22 tests | Deep Links, History, Filters | **HIGH CONTRACT DENSITY** |
| `SelectionContext.tsx` & `useGraphSelection` | HIGH | 15 tests | All 12 Lenses, Drawer, Header | **HIGH CONTRACT DENSITY** |
| `App.tsx` Orchestration | HIGH | 18 tests | All Lenses, Modals, Drawers | **HIGH CONTRACT DENSITY** |
| `lib/adapters/` (10 Adapters) | MEDIUM | 65 tests | Panel Views | **MEDIUM CONTRACT DENSITY** |
| `ViewModeSwitcher.tsx` | MEDIUM | 8 tests | Top Navigation Bar | **MEDIUM CONTRACT DENSITY** |
| Individual Panel View Renders | LOW | 30 tests | View Output Only | **LOW CONTRACT DENSITY** |

---

## 36. Shared-File Change Surface

The following core files touch multiple sub-systems and represent shared-file change surfaces for future parallel workstreams [P0-2 §20, P0-7 §31]:

1. **`explorer/src/App.tsx`**: Owns workspace routing, 15 local `useState` hooks, simulation state, and drawer slots. Touch point for all views [P0-2 §15].
2. **`explorer/src/hooks/useViewState.ts`**: Owns URL synchronization, filterState, focusState, impactState, and project change listeners [P0-2 §3].
3. **`explorer/src/lib/projectState.ts`**: Owns `WorkspaceViewMode` string union, default UI state factories, and `localStorage` JSON serialization [P0-2 §3].
4. **`explorer/src/context/ProjectStateContext.tsx`**: Owns project state hydration, state flushing, and `explorer:project-changed` event handling [P0-2 §3].
5. **`explorer/src/context/SelectionContext.tsx`**: Owns global selection provider wrapping `useGraphSelection` [P0-2 §3].
6. **`explorer/src/components/ViewModeSwitcher.tsx`**: Owns navigation tab rendering for all 18 workspace view modes [P0-2 §3].

---

## 37. Parallelization Boundaries

Future Phase 1+ engineering workstreams can proceed independently along five semantic boundaries [P0-2 §20]:

```text
Boundary 1: Foundation & State Architecture
  └── Scope: SelectionContext, useViewState, ProjectStateContext, URL managers.
  └── Classification: SHARED-CONTRACT DEPENDENCY (Single-threaded foundation workstream).

Boundary 2: Structural & Hierarchy Lenses
  └── Scope: FeatureMatrixPanel, CouplingHeatmapPanel, FeatureTreePanel, ArchitectureTreemapPanel.
  └── Classification: SAFE TO PARALLELIZE (Independent panel & adapter files).

Boundary 3: Flow & Route Lenses
  └── Scope: DependencyRiverPanel, SubwayPanel.
  └── Classification: SAFE TO PARALLELIZE (Independent panel & adapter files).

Boundary 4: Local Neighborhood Lenses
  └── Scope: DependencyConstellationPanel, FourDirectionPanel, FeatureProfilePanel, ArchitectureDNABarcode.
  └── Classification: SAFE TO PARALLELIZE (Independent panel & adapter files).

Boundary 5: Governance & Diagnostic Views
  └── Scope: FindingsPanel, HotspotPanel, DiagnosticsPanel, ComparePanel, AnalysisHistoryPanel.
  └── Classification: SAFE TO PARALLELIZE (Independent panel & view files).
```

---

## 38. Phase 1 Must Preserve

The following evidence-backed contracts must be preserved strictly during Phase 1+ implementation [P0-7 §5, P0-7 §17]:

1. **5-Level Position Authority Hierarchy (`position-policy.ts`)**: In-session drag (Level 1) > Persisted project state (Level 2) > Canvas position (Level 3) > Architecture Layout (Level 4) > Fallback (Level 5) [P0-7 §17].
2. **Static Mode Coordinate Invariance**: Node coordinates change strictly upon user drag or "Reset Layout" command; $0.00000\text{ px}$ drift under automatic UI triggers [P0-7 §17].
3. **Project Storage Isolation**: State saved under `explorer.projectState.<projectId>`; project switching flushes transient state and deletes node URL params [P0-7 §11].
4. **Deep-Link Restoration**: URL query parameters (`?project=`, `?node=`, `?investigate=`, `?depth=`, `?direction=`, `?view=`) faithfully restore workspace state [P0-7 §9].
5. **Cross-Layout Selection Synchronization**: Selecting node ID `X` in any lens highlights `X` across all active panels [P0-7 §12].
6. **Pure Adapter Immutability**: Visualization adapters remain pure, deterministic, side-effect-free functions [P0-3 §1, P0-7 §14].

---

## 39. Phase 1 Must Understand

Important current behavior with insufficient abstraction that Phase 1 must comprehend [P0-2 §1, P0-2 §15, P0-4 §8]:

1. **Top-Heavy App.tsx Orchestration**: `App.tsx` currently coordinates 18 view modes, 15 local states, drawers, modals, and simulation proposals directly [P0-2 §15].
2. **Selection vs. Navigation Conflation**: Clicking a node in 8 analytical lenses currently forces an immediate workspace view transition to `'graph'` in parent callbacks [P0-2 §1, P0-4 §8].
3. **URL Parameter View Mode Limitation**: Only `'graph'` and `'findings'` modes are currently serialized into `?view.mode=` URL parameters [P0-2 §1, P0-2 §15].
4. **Dual Project Context System**: `ProjectContext.tsx` handles project manifests, while `ProjectStateContext.tsx` handles UI state storage, coordinated via a custom window DOM event (`explorer:project-changed`) [P0-2 §15].

---

## 40. Phase 1 Must Decide

Concrete architectural questions that Phase 1 must resolve before writing implementation code [P0-2 §23, P0-4 §31, P0-6 §36]:

1. **Workspace vs. Lens Decoupling**: Should workspace layout (drawers, toolbars, sidebars) be decoupled from visualization lenses?
2. **Selection vs. Navigation Decoupling**: Should component selection in analytical lenses update `selectedNodeId` in-place without forcing navigation back to `GraphView`?
3. **Canonical Workspace Domain Grouping**: Should the 18 view modes be grouped into 5 semantic workspace domains (`Portfolio`, `Structure`, `Relationships`, `Neighborhood`, `Governance`)?
4. **URL Workspace Serialization**: Should all 18 workspace view modes be represented in the URL search query parameters?
5. **Shared Selector Layer**: Should shared domain primitives (`discoverFeatures`, `centrality`, `hotspots`) be wrapped in a centralized memoized selector store?

---

## 41. Phase 1 Must Validate

Claims where current discovery evidence is incomplete and requires Phase 1 validation [P0-1 §14, P0-6 §36]:

1. **Web Worker Feasibility for Extreme Scale**: Validating whether 13-stage architecture layout calculation for $> 2,500$ nodes can be executed in a Web Worker without state race conditions [P0-6 §36].
2. **HTML5 Canvas Migration for High-Feature Matrices**: Validating whether `FeatureMatrixPanel` should adopt HTML5 Canvas rendering (like `CouplingHeatmapPanel`) when feature counts exceed $F > 100$ [P0-6 §36].
3. **Viewport List Virtualization**: Validating whether long component lists in `FeatureProfilePanel` and `FeatureTreePanel` require virtualized DOM scrolling for $> 1,000$ components [P0-6 §36].

---

## 42. Architectural Decision Evidence Matrix

| Decision Area | Evidence For Option A | Evidence Against Option A | Existing Contract | Unknown | Phase 1 Decision Needed |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Shared Investigation Context** | Unifies `selectedNodeId`, focus, impact, and drawer state across all lenses [P0-2 §20]. | Requires refactoring local `useState` in `App.tsx` [P0-2 §15]. | `SelectionContext` exists [P0-2 §1]. | None | Yes |
| **Selection / Navigation Separation** | Allows multi-step in-place inspection in Matrix, Tree, River, DNA [P0-4 §8]. | Changes historical implicit auto-navigation behavior [P0-2 §1]. | `Subway` & `FourDir` use in-place [P0-4 §4]. | None | Yes |
| **Semantic Workspace Grouping** | Reduces 18-button switcher bar clutter on compact viewports [P0-5 §15]. | Requires tab sub-navigation UI design [P0-5 §15]. | `WorkspaceViewMode` defined [P0-2 §3]. | None | Yes |
| **Centralized Selector Layer** | Prevents redundant re-computation of `discoverFeatures` across panels [P0-3 §10]. | Small memory overhead for cached selectors [P0-3 §15]. | Adapters use pure functions [P0-3 §1]. | None | Yes |
| **Full URL View Serialization** | Enables deep-linking directly into Matrix, River, Subway, Constellation [P0-2 §15]. | Slightly longer URL query parameter strings [P0-2 §9]. | `?view.mode=` exists for 2 modes [P0-2 §3]. | None | Yes |

---

## 43. Contradiction Register

| ID | Claim A | Claim B | Source Reports | Current-Code Verification Check | Reconciled Resolution | Phase 1 Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CR-01** | Workspace contains 18 view modes. | Workspace contains 12 primary visual lenses. | P0-2 §1 vs P0-1 §1 | Verified `projectState.ts:32` defines 18 `WorkspaceViewMode` string values. | 18 total workspace modes = 12 primary visual lenses + 6 supporting analytical views. | Preserves distinction between lenses and supporting views. |
| **CR-02** | Clicking node in lens navigates to Graph. | Clicking station in Subway updates selection in-place. | P0-1 §3.7 vs P0-4 §4 | Verified `SubwayPanel.tsx:75` handles in-place click; button invokes navigation. | Both behaviors exist: 8 lenses auto-navigate, 3 lenses support in-place selection. | Informs selection/navigation decoupling decision. |
| **CR-03** | URL query params support view modes. | URL query params only support `'graph'` and `'findings'`. | P0-2 §1 vs P0-7 §9 | Verified `useViewState.ts:45` parses restricted viewMode union (`'graph' \| 'findings'`). | URL serializer supports only 2 view modes currently. | High priority for Phase 1 URL serialization. |
| **CR-04** | Position authority uses Level 4 layout. | Saved positions restore via Level 2 authority. | P0-2 §1 vs P0-7 §17 | Verified `position-policy.ts:78` resolves Level 2 when `hasAuthoritativePositions` is true. | Cold load calculates Level 4; reload/switch restores Level 2 positions. | Position policy precedence verified intact. |

---

## 44. Unknowns Register

| Unknown | Why Unknown | Relevant Reports | Evidence Needed | Phase 1 Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Web Worker Offloading Latency** | Web Worker thread serialization overhead for $> 2,500$ node graphs has not been benchmarked. | P0-6 §36 | Benchmark Web Worker `postMessage` transfer time for `ExplorerDataSchema`. | Determines worker offloading architecture. |
| **GPU Canvas Bounds on Low-End Hardware** | Maximum Cytoscape canvas edge rendering FPS on integrated GPU hardware for $> 5,000$ nodes. | P0-1 §14, P0-6 §34 | Real-device WebGL/Canvas frame rate profiling. | Informs fallback rendering density limits. |

---

## 45. Current-State Architecture Diagram

```text
                        ┌─────────────────────────────────────┐
                        │      Browser URL & LocalStorage     │
                        └──────────────────┬──────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────┐
                        │          ProjectContext             │
                        │ (Active Project ID, Manifest Fetch) │
                        └──────────────────┬──────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────┐
                        │       ProjectStateContext           │
                        │(explorer.projectState.<projectId>)  │
                        └──────────────────┬──────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────┐
                        │        useExplorerData Hook         │
                        │(HTTP Fetch / parseExplorerData)     │
                        └──────────────────┬──────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────┐
                        │         ExplorerDataSchema          │
                        │    (Canonical Root JSON Contract)   │
                        └──────────────────┬──────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────┐
                        │     Shared Analytical Primitives    │
                        │(features, layers, centrality, hotspots)│
                        └──────────────────┬──────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────┐
                        │       Visualization Adapters        │
                        │ (10 Pure Transformation Modules)    │
                        └──────────────────┬──────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────┐
                        │       SelectionContext & ViewState  │
                        │(selectedNodeId, filters, focus, impact)│
                        └──────────────────┬──────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────┐
                        │        App.tsx Orchestrator         │
                        │  (18 Workspace View Modes Switcher) │
                        └──────────────────┬──────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐              ┌──────────────────┐
│ Canvas Renderers │              │   SVG Renderers  │              │   DOM Renderers  │
│  - GraphView     │              │  - River         │              │  - Matrix        │
│  - Heatmap       │              │  - Subway        │              │  - Tree          │
│                  │              │  - Constellation │              │  - Profile       │
│                  │              │  - Treemap       │              │  - DNA           │
│                  │              │  - Radar         │              │  - FourDirection │
└──────────────────┘              └──────────────────┘              └──────────────────┘
```

---

## 46. What We Know

High-confidence, evidence-backed facts supported by current source code and passing test suites [P0-1–P0-7]:

1. **12 Lenses + 6 Views**: The workspace contains 12 primary visual lenses and 6 supporting analytical views registered in `projectState.ts:32` [P0-1 §2, P0-2 §3].
2. **Canonical Schema**: All data originates from `ExplorerDataSchema` normalized by `parseExplorerData` (`schema.ts:12`) [P0-3 §1].
3. **10 Pure Adapters**: All 10 adapters in `explorer/src/lib/adapters/` are 100% pure, read-only, deterministic functions [P0-3 §6, P0-7 §14].
4. **Position Authority**: 5-level position authority hierarchy (`position-policy.ts`) strictly protects user drag positions and static mode coordinate invariance [P0-7 §17].
5. **Project Isolation**: Project state persistence is strictly namespaced under `explorer.projectState.<projectId>` and reset via `explorer:project-changed` events [P0-2 §10, P0-7 §11].
6. **Cold Load Pipeline Performance**: Total cold load layout pipeline completes in **185.8 ms – 189.4 ms** on canonical CST fixture (SLA < 1,000 ms) [P0-6 §1].
7. **Viewport Protection**: Pan, zoom, and hover interactions execute with **0 layout calls** [P0-6 §1].

---

## 47. What We Suspect

Strong architectural interpretations based on current codebase evidence [P0-2 §15, P0-3 §20, P0-4 §8]:

1. **Unified Investigation Context**: Combining selection, focus, impact, and drawer state into a single authoritative context will eliminate state duplication between `SelectionContext` and `useViewState` [P0-2 §20].
2. **Selection / Navigation Decoupling**: Allowing component selection inside analytical lenses without forcing an immediate auto-switch to `GraphView` will improve multi-lens investigation workflows [P0-4 §8].
3. **Centralized Selector Memoization**: Wrapping shared domain primitives (`discoverFeatures`, `centrality`, `hotspots`) in a memoized selector store will prevent redundant re-computation across mounted panels [P0-3 §10].

---

## 48. What We Do Not Know

Important unanswered questions requiring runtime or Phase 1 validation [P0-1 §14, P0-6 §36]:

1. **Web Worker Overhead**: Main-thread blocking duration and worker serialization overhead for $> 2,500$ node synthetic graphs [P0-6 §36].
2. **Canvas Matrix Scale Boundary**: Performance threshold where `FeatureMatrixPanel` HTML table rendering should transition to HTML5 Canvas rendering for $F > 100$ features [P0-6 §36].

---

## 49. Phase 1 Decision Questions

Concrete architectural questions that Phase 1 must resolve prior to writing implementation code [P0-2 §23, P0-4 §31, P0-6 §36]:

1. **State Architecture**: How should Phase 1 structure the canonical Investigation Context to unify `selectedNodeId`, focus depth, impact analysis, and drawer state?
2. **Navigation Semantics**: Should selecting an entity in an analytical lens update selection in-place, while providing explicit "Explore in Graph" action buttons for canvas navigation?
3. **Workspace Sub-Grouping**: Should top-level workspace navigation group the 18 view modes into 5 semantic domains (`Portfolio`, `Structure`, `Relationships`, `Neighborhood`, `Governance`)?
4. **URL Serialization**: Should all 18 workspace view modes be represented in the URL search query parameters?
5. **Adapter Protocol**: Should all 10 visualization adapters adopt a common TypeScript selector/view-model interface?

---

## 50. Evidence Index

This discovery synthesis report is grounded in the following authoritative source code files, test suites, benchmarks, and Phase 0 audit deliverables:

### Source Code Files:
- `explorer-contract.ts` — Canonical schema contracts.
- `explorer/src/types/explorer.ts` — TypeScript types for nodes, edges, cycles, and summaries.
- `explorer/src/App.tsx` — Master workspace router, 18 view modes, simulation, drawer, event listeners.
- `explorer/src/components/GraphView.tsx` — Cytoscape graph canvas, position policy, mode indicator.
- `explorer/src/components/FeatureMatrixPanel.tsx` — 2D feature matrix table.
- `explorer/src/components/CouplingHeatmapPanel.tsx` — HTML5 Canvas heatmap engine.
- `explorer/src/components/DependencyRiverPanel.tsx` — SVG Sankey macro flow streams.
- `explorer/src/components/FeatureTreePanel.tsx` — 5-level hierarchical tree list.
- `explorer/src/components/ArchitectureTreemapPanel.tsx` — Squarified treemap bounding boxes.
- `explorer/src/components/SubwayPanel.tsx` — Transit route schematic map.
- `explorer/src/components/DependencyConstellationPanel.tsx` — Polar radial constellation.
- `explorer/src/components/FeatureProfilePanel.tsx` — Component profile scorecard.
- `explorer/src/components/RadarPanel.tsx` — 6-axis polar health radar.
- `explorer/src/components/ArchitectureDNABarcode.tsx` — 7-band DNA barcode visual.
- `explorer/src/components/FourDirectionPanel.tsx` — 3x3 cardinal direction grid.
- `explorer/src/components/ProjectDashboard.tsx` — Portfolio overview dashboard.
- `explorer/src/components/findings/FindingsPanel.tsx` — Architecture rule findings triage.
- `explorer/src/components/HotspotPanel.tsx` — Hotspot ranking & readiness.
- `explorer/src/components/DiagnosticsPanel.tsx` — Circular dependency cycles & unresolved references.
- `explorer/src/components/ComparePanel.tsx` — Snapshot diff comparison.
- `explorer/src/components/AnalysisHistoryPanel.tsx` — Historical analysis timeline.
- `explorer/src/components/InvestigationDrawer.tsx` — 5-tab investigation drawer.
- `explorer/src/components/ViewModeSwitcher.tsx` — 18-button view mode switcher toolbar.
- `explorer/src/hooks/useViewState.ts` — View state & URL query synchronization.
- `explorer/src/hooks/useExplorerData.ts` — Asynchronous data fetching.
- `explorer/src/context/ProjectContext.tsx` — Active project selection & event dispatch.
- `explorer/src/context/ProjectStateContext.tsx` — Project UI state persistence.
- `explorer/src/context/SelectionContext.tsx` — Central selection provider.
- `explorer/src/lib/projectState.ts` — `WorkspaceViewMode` definition & default state factories.
- `explorer/src/lib/position-policy.ts` — 5-level Position Authority precedence hierarchy.
- `explorer/src/lib/schema.ts` — Schema parsing & validation boundary.
- `explorer/src/lib/adapters/` — 10 pure visualization adapter modules.
- `explorer/src/lib/layout/` — Shared analytical domain primitives (`features.ts`, `layers.ts`, `centrality.ts`, `domains.ts`).

### Test Suite References:
- `explorer/src/test/CrossLayoutVisibilityAndSelection.test.tsx`
- `explorer/src/test/ProjectStatePersistenceAndIsolation.test.tsx`
- `explorer/src/test/Phase13RealExecutionForensicAudit.test.ts`
- `explorer/src/test/AdversarialWave5.test.tsx`
- `explorer/src/test/RegressionAcceptance.test.tsx`
- `explorer/src/components/GraphView.positionAuthority.test.tsx`
- `explorer/src/App.deepLink.test.tsx`
- `explorer/src/App.investigationWorkflow.test.tsx`
- `explorer/src/lib/performance.test.ts`
- `explorer/src/lib/scalability-layout.test.ts`
- `explorer/src/test/ViewportPerformanceB5.test.tsx`
- `explorer/src/lib/adapters/*.test.ts`

### Audit Deliverables:
- `P0-1_LAYOUT_CAPABILITY_AUDIT.md`
- `P0-2_SHARED_STATE_ORCHESTRATION_AUDIT.md`
- `P0-3_DATA_ADAPTER_DEPENDENCY_AUDIT.md`
- `P0-4_CROSS_LAYOUT_INTERACTION_AUDIT.md`
- `P0-5_USER_TASK_UX_AUDIT.md`
- `P0-6_PERFORMANCE_DENSITY_AUDIT.md`
- `P0-7_REGRESSION_CONTRACT_AUDIT.md`
- `audit-reports/FINAL-PROGRAM-REPORT.md`
- `audit-reports/features/FEAT-CONTRACT-report-v2.md`
- `audit-reports/features/FEAT-POSAUTH-report-v2.md`
- `audit-reports/features/FEAT-STATE-report-v2.md`
- `audit-reports/features/FEAT-PERF-report.md`
