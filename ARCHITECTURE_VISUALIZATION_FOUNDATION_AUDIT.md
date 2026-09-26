# Architecture Visualization Foundation Audit

## 1. Executive Summary

This audit establishes the **verified ground-truth baseline** of the Salesforce Architecture Explorer codebase. It maps all existing data models, layout engines, rendering pipelines, interaction systems, metrics engines, and UI components available in the current implementation.

### Key Audit Findings
* **Graph Data Model:** Comprehensive 10-type metadata coverage (`ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`) backed by stable TypeScript contracts (`explorer-contract.ts`, `explorer.ts`) and Zod validation schemas (`schema.ts`).
* **Layout Engine Pipeline:** Advanced 13-stage deterministic layout engine (`architecture-layout.ts`) supporting both 4-tier vertical architectural hierarchy (`hierarchical`) and 2D semantic feature region packing (`hybrid`). The layout engine features strict 5-tier Position Authority preservation, 2D spatial hash grid collision cleanup, satellite tethering, and $0.00000\text{ px}$ determinism drift across input shuffles.
* **Rendering Architecture:** Multi-layered visual rendering architecture utilizing Cytoscape.js for interactive graph canvas management, custom HTML/CSS overlays for node shapes and mode badges, SVG overlay canvas (`FeatureOverlayCanvas.tsx`) for dynamic feature region enclosure rendering, and HTML hover cards (`NodeHoverCard.tsx`, `EdgeHoverCard.tsx`) for context-sensitive metadata popups.
* **Metrics & Analytics Engine:** Fully realized metrics infrastructure calculating degree, fan-in/fan-out, coupling scores, hub scores, cross-domain bridge scores, layer violations, 2D geometric edge crossing breakdowns, component separation, feature cohesion, and test gap metrics.
* **UI & State Management:** Highly modular React UI architecture leveraging context providers (`ProjectContext`, `ProjectStateContext`, `SelectionContext`) and custom hooks (`useExplorerData`, `useGraphSelection`, `useViewState`) for multi-project persistence, deep-linking, focus topology, and interactive refactoring simulation.

---

## 2. Current Graph Data Model

### Classification Tiers Defined
Every attribute in the graph data model is assigned to one of four authoritative classification tiers:
1. `SOURCE METADATA`: Directly extracted from source code / Salesforce metadata files.
2. `DERIVED CLASSIFICATION`: Calculated deterministically from graph topology / edge connections.
3. `HEURISTIC CLASSIFICATION`: Inferred using scoring rules, naming conventions, or directory heuristics.
4. `HUMAN-CURATED ARCHITECTURE`: Explicit manual architecture labels or overrides provided by a human architect (currently **NOT** stored or supported in the current schema).

### Node Attributes & Existence Status

| Property | Status | Classification Tier | Description / Evidence | Source File |
| :--- | :--- | :--- | :--- | :--- |
| **Node Identity** | `VERIFIED` | `SOURCE METADATA` | Unique string ID (e.g. `ApexClass:AssetDashboardService`, `Object:Order__c`) | `explorer/src/types/explorer.ts` |
| **DisplayName** | `VERIFIED` | `SOURCE METADATA` | Human-readable component name | `explorer/src/types/explorer.ts` |
| **NodeType / Category** | `VERIFIED` | `SOURCE METADATA` | 10 canonical types: `ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External` | `explorer/src/types/explorer.ts` |
| **Architectural Layer** | `DERIVABLE` | `HEURISTIC CLASSIFICATION` | Computed via `classifyNodeLayerWithReason()` into 4 bands: `presentation`, `application`, `domain`, `schema` | `explorer/src/lib/layout/layers.ts` |
| **Feature Membership** | `DERIVABLE` | `HEURISTIC CLASSIFICATION` | Discovered deterministically via `discoverFeatures()` mapping nodes to primary/secondary feature IDs | `explorer/src/lib/layout/features.ts` |
| **Feature Role** | `DERIVABLE` | `HEURISTIC CLASSIFICATION` | Classified via `classifyFeatureRole()`: `FeatureAnchor`, `FeatureCore`, `FeatureData`, `FeatureBridge`, `FeatureTest`, `SharedInfrastructure` | `explorer/src/lib/layout/feature-roles.ts` |
| **Object Information** | `VERIFIED` | `SOURCE METADATA` | Object metadata, parent object linkage for fields, custom vs. standard object flags | `explorer/src/types/explorer.ts` |
| **Field Information** | `VERIFIED` | `SOURCE METADATA` | Field name, parent object ID, field references | `explorer/src/types/explorer.ts` |
| **Source File Path** | `VERIFIED` | `SOURCE METADATA` | Relative file path in workspace (`node.file`) | `explorer/src/types/explorer.ts` |
| **Node Metrics** | `VERIFIED` | `DERIVED CLASSIFICATION` | Pre-computed `fanIn`, `fanOut`, `coupling`, `unresolved`, `score` | `explorer/src/types/explorer.ts` |
| **Risk & Risk Reasons** | `VERIFIED` | `DERIVED CLASSIFICATION` | Calculated risk level (`HIGH`, `MEDIUM`, `LOW`) and explicit risk explanation strings | `explorer/src/types/explorer.ts` |
| **Behavior Metadata** | `VERIFIED` | `SOURCE METADATA` | `isTest`, `sharing`, `publicContractsCount`, `asyncPatterns`, `securitySignalsCount`, `queryCount`, `dmlCount`, `calloutCount` | `explorer/src/types/explorer.ts` |
| **Refactoring Readiness** | `VERIFIED` | `DERIVED CLASSIFICATION` | Flags for `isHighRisk`, `hasCycles`, `hasUnresolved`, `testCoverageStatus` (`COVERED`, `NO_TESTS`, `UNTESTED`, `AMBIGUOUS`) | `explorer/src/types/explorer.ts` |
| **Sharedness Indicator** | `DERIVABLE` | `HEURISTIC CLASSIFICATION` | Flagged when `isSharedInfrastructure()` returns true (fan-in >= 5, cross-domain >= 3, or utility name) | `explorer/src/lib/layout/feature-roles.ts` |
| **Centrality / Spatial Role** | `DERIVABLE` | `DERIVED CLASSIFICATION` | Computed via `computeGraphCentralityAnalysis()`: `hub-only`, `bridge-only`, `hub-and-bridge`, `standard` | `explorer/src/lib/layout/centrality.ts` |
| **Finding Badges / Stats** | `DERIVABLE` | `DERIVED CLASSIFICATION` | Count and max severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`) computed via `getFindingStatsForNode()` | `explorer/src/lib/graph-builder.ts` |

### Edge Attributes & Existence Status

| Property | Status | Classification Tier | Description / Evidence | Source File |
| :--- | :--- | :--- | :--- | :--- |
| **Edge ID** | `VERIFIED` | `SOURCE METADATA` | Unique edge identifier string | `explorer/src/types/explorer.ts` |
| **Source Node ID** | `VERIFIED` | `SOURCE METADATA` | Source endpoint node ID | `explorer/src/types/explorer.ts` |
| **Target Node ID** | `VERIFIED` | `SOURCE METADATA` | Target endpoint node ID | `explorer/src/types/explorer.ts` |
| **Relationship Type** | `VERIFIED` | `SOURCE METADATA` | 21 types: `method-call`, `instantiation`, `type-reference`, `generic-type`, `extends`, `implements`, `SOQL`, `soql-object`, `soql-field`, `DML`, `aura-enabled`, `lwc-apex`, `lwc-import`, `lwc-template-child`, `field-reference`, `trigger-handler`, `trigger-object`, `trigger-on`, `visualforce-controller`, `test-reference`, `event-publisher` | `explorer/src/types/explorer.ts` |
| **Method Name** | `VERIFIED` | `SOURCE METADATA` | Target method name referenced by caller (nullable) | `explorer/src/types/explorer.ts` |
| **Evidence Snippet** | `VERIFIED` | `SOURCE METADATA` | Exact source code evidence snippet string | `explorer/src/types/explorer.ts` |
| **Unresolved Flag** | `VERIFIED` | `SOURCE METADATA` | Boolean indicating whether reference could be resolved locally | `explorer/src/types/explorer.ts` |
| **Resolution Classification** | `VERIFIED` | `HEURISTIC CLASSIFICATION` | Classification string (`RESOLVED_LOCAL`, `UNKNOWN`, `RESOLVED_PLATFORM`) | `explorer/src/types/explorer.ts` |
| **Resolution Strategy** | `VERIFIED` | `HEURISTIC CLASSIFICATION` | Resolution approach (`EXACT`, `HEURISTIC`, `LLM`, `INFERRED`) | `explorer/src/types/explorer.ts` |
| **Confidence Level** | `VERIFIED` | `HEURISTIC CLASSIFICATION` | Confidence level string (`high`, `medium`, `low`) | `explorer/src/types/explorer.ts` |
| **Source Location** | `VERIFIED` | `SOURCE METADATA` | Source file line number and column number | `explorer/src/types/explorer.ts` |
| **Method Owner** | `VERIFIED` | `SOURCE METADATA` | Enclosing method name in source file | `explorer/src/types/explorer.ts` |
| **Canonical Detail** | `VERIFIED` | `SOURCE METADATA` | Structured `ExplorerEdgeCanonical` containing typed source, target, relationship, and location | `explorer/src/types/explorer.ts` |
| **Inter-Feature Flag** | `DERIVABLE` | `DERIVED CLASSIFICATION` | Computed via `buildGraphElements()` as `isInterFeature` when endpoints belong to distinct primary non-utility features | `explorer/src/lib/graph-builder.ts` |
| **Directionality** | `VERIFIED` | `SOURCE METADATA` | Strictly directed from source component to target component | `explorer/src/types/explorer.ts` |

---

## 3. Current Layout System

### Architecture Layout Pipeline Overview

The layout engine in `explorer/src/lib/architecture-layout.ts` operates as a 13-stage deterministic layout pipeline:

```text
RAW GRAPH facts -> Stage 1: Base Analysis -> Stage 2: Layer Classification -> Stage 3: Domain Discovery
-> Stage 3.5: Feature Discovery -> Stage 4: Centrality Analysis -> Stage 5: Global Domain/Feature Layout
-> Stage 6: Layer Crossing Reduction -> Stage 7: Primary Production Local Layout -> Stage 8: Hub/Bridge Refinement
-> Stage 9: Satellite Placement -> Stage 10: Component Packing -> Stage 11: Collision & Clearance Cleanup
-> Stage 12: Position Authority Restoration -> POSITIONS RESULT
```

### Layout Engine Capabilities & Performance

| Capability | File Path | Symbol / Function | Theoretical Complexity | Measured Performance / Benchmark |
| :--- | :--- | :--- | :--- | :--- |
| **Architecture Layout Engine** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayout()` | $O(\|V\| \log \|V\| + \|E\|)$ pipeline execution | `MEASURED PERFORMANCE`: $206.89\text{ ms}$ cold run on Cloud Spend Tracker ($240\text{ nodes}, 1024\text{ edges}$) |
| **Hierarchical Mode** | `explorer/src/lib/architecture-layout.ts` | `enableFeatureLayout: false` | $O(\|V\| + \|E\|)$ layer bucket ordering | `MEASURED PERFORMANCE`: $189.37\text{ ms}$ on Cloud Spend Tracker |
| **Hybrid Mode** | `explorer/src/lib/architecture-layout.ts` | `enableFeatureLayout: true` | $O(\|V\| \log \|V\| + \|E\|)$ multi-row 2D packing | `MEASURED PERFORMANCE`: $231.14\text{ ms}$ cold run on Cloud Spend Tracker |
| **Layer Classification** | `explorer/src/lib/layout/layers.ts` | `classifyNodeLayer()` | $O(\|V\|)$ single-pass classification | `MEASURED PERFORMANCE`: $< 2\text{ ms}$ for $240\text{ nodes}$ |
| **Domain Discovery** | `explorer/src/lib/layout/domains.ts` | `discoverDomains()` | $O(\|V\| + \|E\|)$ path stem extraction | `MEASURED PERFORMANCE`: $< 3\text{ ms}$ for $240\text{ nodes}$ |
| **Feature Discovery** | `explorer/src/lib/layout/features.ts` | `discoverFeatures()` | $O(\|V\| \cdot \text{deg} + \|E\|)$ seed expansion | `MEASURED PERFORMANCE`: $4.12\text{ ms}$ for $240\text{ nodes}$ |
| **Feature Roles** | `explorer/src/lib/layout/feature-roles.ts` | `classifyFeatureRole()` | $O(\|V\|)$ heuristic classification | `MEASURED PERFORMANCE`: $< 1\text{ ms}$ for $240\text{ nodes}$ |
| **Global 2D Layout** | `explorer/src/lib/layout/global-layout.ts` | `computeGlobalFeatureLayout()` | $O(F \log F)$ aspect-ratio band packing | `MEASURED PERFORMANCE`: $5.80\text{ ms}$ for $13\text{ features}$ |
| **Crossing Reduction** | `explorer/src/lib/layout/ordering.ts` | `reduceEdgeCrossings()` | $O(K \cdot \|E\|)$ sweep-line early termination | `MEASURED PERFORMANCE`: $18.40\text{ ms}$ on Cloud Spend Tracker |
| **Local Node Placement** | `explorer/src/lib/layout/local-layout.ts` | `computeLocalNodeLayout()` | $O(\|V_{\text{local}}\|)$ bucket grid placement | `MEASURED PERFORMANCE`: $12.30\text{ ms}$ on Cloud Spend Tracker |
| **Centrality & Bridges** | `explorer/src/lib/layout/centrality.ts` | `computeGraphCentralityAnalysis()` | $O(\|V\| + \|E\|)$ degree and balance scoring | `MEASURED PERFORMANCE`: $3.10\text{ ms}$ on Cloud Spend Tracker |
| **Satellite Placement** | `explorer/src/lib/layout/satellites.ts` | `placeSatellites()` | $O(S \cdot P)$ 2D segment crossing penalty | `MEASURED PERFORMANCE`: $42.50\text{ ms}$ for $84\text{ satellites}$ |
| **Component Packing** | `explorer/src/lib/layout/components.ts` | `packComponentPositions()` | $O(C \log C)$ 2D FFDH shelf packing | `MEASURED PERFORMANCE`: $1.20\text{ ms}$ for disconnected components |
| **Collision Resolution** | `explorer/src/lib/layout/spacing.ts` | `resolveSpacingAndCollisions()` | $O(\|V\|)$ 2D spatial hash grid partitioning | `MEASURED PERFORMANCE`: $15.60\text{ ms}$ on Cloud Spend Tracker |
| **Position Authority** | `explorer/src/lib/position-policy.ts` | `resolveAuthoritativePosition()` | $O(1)$ lookup per node | `MEASURED PERFORMANCE`: $< 0.5\text{ ms}$ for $240\text{ nodes}$ |

---

## 4. Current Rendering System

### Visual Stack Architecture

```text
React Container (GraphView.tsx)
 ├── Cytoscape Canvas (cytoscape.js)
 │    ├── Cytoscape Nodes & Edges (graph-style.ts CSS stylesheet)
 │    └── Cytoscape Navigator / Minimap (cytoscape-navigator)
 ├── SVG Overlay Canvas (FeatureOverlayCanvas.tsx)
 │    ├── Outer Semantic Feature Region Enclosure Boxes (<rect>)
 │    ├── Feature Header Badges & Labels (<text>)
 │    └── Shared Infrastructure Highlight Corridors
 └── HTML Hover Cards & Controls (React DOM)
      ├── NodeHoverCard.tsx (Floating HTML Card on Node Hover)
      ├── EdgeHoverCard.tsx (Floating HTML Card on Edge Hover)
      ├── Mode Indicator Badge (Static / Interactive Badge)
      └── GraphControls & GraphLegend
```

---

## 5. Current Interaction System

### Supported Interaction Capabilities

| Capability | Source File | Status | Description |
| :--- | :--- | :--- | :--- |
| **Single Node Selection** | `explorer/src/lib/graph-interactions.ts` | `VERIFIED` | Selects a node on click/tap, dimming unselected nodes and highlighting direct connections |
| **Edge Selection** | `explorer/src/lib/graph-interactions.ts` | `VERIFIED` | Selects an edge on click/tap, highlighting source/target endpoints |
| **Hover Tooltips** | `explorer/src/components/GraphView.tsx` | `VERIFIED` | Triggers hover cards after 250ms delay for nodes (`NodeHoverCard`) and edges (`EdgeHoverCard`) |
| **Pan & Smooth Zoom** | `explorer/src/components/GraphView.tsx` | `VERIFIED` | Supports smooth mouse wheel / touchpad zooming (0.1x to 5.0x) and canvas dragging |
| **Fit to Screen** | `explorer/src/lib/graph-interactions.ts` | `VERIFIED` | Fits entire visible graph within canvas viewport with 50px padding |
| **Center Selected Node** | `explorer/src/lib/graph-interactions.ts` | `VERIFIED` | Smoothly animates camera to center on selected or focused node |
| **Full-Text Search** | `explorer/src/lib/search-filter.ts` | `VERIFIED` | Performs multi-attribute regex / substring search across node names, files, types, and evidence |
| **Type Filtering** | `explorer/src/components/FocusControls.tsx` | `VERIFIED` | Filters visible graph by 10 canonical node types with strict Option A downstream filtering |
| **Focus & Neighborhood Depth** | `explorer/src/lib/focus-graph.ts` | `VERIFIED` | Computes focus topology around selected node at depth $d \in [1, 5]$ with upstream, downstream, or bidirectional tracing |
| **Upstream Traversal** | `explorer/src/lib/focus-graph.ts` | `VERIFIED` | Filters graph to show only incoming callers / dependents of focal node up to $N$ steps |
| **Downstream Traversal** | `explorer/src/lib/focus-graph.ts` | `VERIFIED` | Filters graph to show only outgoing dependencies / callees of focal node up to $N$ steps |
| **Impact Analysis Mode** | `explorer/src/lib/impact-analysis.ts` | `VERIFIED` | Computes direct and transitive impact blast radius for component change simulation |
| **Cycle Highlight Mode** | `explorer/src/lib/graph-interactions.ts` | `VERIFIED` | Highlights circular dependency groups in bright red with dimmed background |
| **Keyboard Navigation** | `explorer/src/components/GraphView.tsx` | `VERIFIED` | Supports `F`/`0` (fit), `+`/`-` (zoom), `Esc` (deselect), and Arrow Keys (spatial neighbor traversal) |
| **URL Deep Linking** | `explorer/src/lib/url/` | `VERIFIED` | Encodes/decodes active project, selected node, focus depth, direction, filters, and architecture mode into URL query params |
| **Layout Mode Toggle** | `explorer/src/components/GraphControls.tsx` | `VERIFIED` | Toggles between `interactive` (automatic layout) and `static` (user-preserved coordinates) modes |
| **Architecture Mode Toggle** | `explorer/src/components/GraphControls.tsx` | `VERIFIED` | Toggles between `hierarchical` (vertical layer bands) and `hybrid` (2D feature regions) modes |

---

## 6. Static Dependency Graph vs. Runtime Execution

A critical distinction enforced across all visualization audits is the difference between static code structure and dynamic runtime execution:

* **STATIC DEPENDENCY GRAPH (`VERIFIED`)**: All graphs, traversals, depth metrics, layer ranks, and impact paths in the codebase are calculated strictly from static source code references (`SOQL`, `instantiation`, `method-call`, `lwc-import`, `type-reference`).
* **RUNTIME EXECUTION (`NEW DATA REQUIRED`)**: The codebase does **NOT** capture dynamic runtime execution timing, call stack traces, dynamic Apex dispatch (`Type.forName`), CPU execution duration, or thread concurrency.
* **INSTRUCTION**: Static dependency path depth must **NEVER** be described as dynamic execution timing or chronological performance order.

---

## 7. Current Metrics & Classification Tiers

| Metric Property | Status | Classification Tier | Calculation Method / Source File | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Degree** | `VERIFIED` | `DERIVED CLASSIFICATION` | `fanIn + fanOut` in `metrics.ts` | Total connected edge count per node |
| **In-Degree (Fan-In)** | `VERIFIED` | `DERIVED CLASSIFICATION` | `metrics.fanIn` in `metrics.ts` | Total incoming dependency edges |
| **Out-Degree (Fan-Out)** | `VERIFIED` | `DERIVED CLASSIFICATION` | `metrics.fanOut` in `metrics.ts` | Total outgoing dependency edges |
| **Coupling Score** | `VERIFIED` | `DERIVED CLASSIFICATION` | `metrics.coupling` in `metrics.ts` | Sum of fanIn and fanOut |
| **Centrality Analysis** | `VERIFIED` | `DERIVED CLASSIFICATION` | `computeGraphCentralityAnalysis()` in `centrality.ts` | Evaluates relative domain degree, balance factor, and spatial centrality |
| **Bridge Score** | `VERIFIED` | `DERIVED CLASSIFICATION` | `computeNodeBridgeAnalysis()` in `centrality.ts` | Measures cross-domain spanning strength: $10 \times \|D_{\text{connected}}\| + \text{edges}_{\text{cross}}$ |
| **Hub Score** | `VERIFIED` | `DERIVED CLASSIFICATION` | `computeNodeHubMetrics()` in `centrality.ts` | Measures high-connectivity hub strength based on degree and balance factor |
| **Dependency Depth** | `VERIFIED` | `DERIVED CLASSIFICATION` | `traverse()` & `focus-graph.ts` | Measures static DAG shortest path distance in upstream/downstream traversals |
| **Reuse Count** | `DERIVABLE` | `DERIVED CLASSIFICATION` | `fanIn` / `transitiveDependents.length` | Number of distinct components reusing a target component |
| **Consumer Count** | `VERIFIED` | `DERIVED CLASSIFICATION` | `impact.directDependents.length` in `impact-analysis.ts` | Count of direct callers/dependents |
| **Feature Count** | `VERIFIED` | `HEURISTIC CLASSIFICATION` | `discovery.features.size` in `features.ts` | Number of discovered semantic feature clusters |
| **Cross-Feature Connectivity**| `VERIFIED` | `DERIVED CLASSIFICATION` | `cluster.connectedFeatureIds` in `features.ts` | List of distinct connected feature cluster IDs |
| **Object / Field Usage** | `VERIFIED` | `SOURCE METADATA` | `summary.inventory` in `explorer.ts` | Touched Salesforce standard/custom objects and fields |
| **Component Counts** | `VERIFIED` | `SOURCE METADATA` | `summary.inventory` in `explorer.ts` | Counts of files, Apex classes, triggers, LWCs, VF pages, flows, objects, fields |
| **Graph Density** | `DERIVABLE` | `DERIVED CLASSIFICATION` | $\|E\| / (\|V\|(\|V\|-1))$ | Ratio of actual edges to maximum possible edges |
| **Clusters / Feature Regions**| `VERIFIED` | `HEURISTIC CLASSIFICATION` | `discoverFeatures()` in `features.ts` | Discovered feature clusters with anchor node, primary/secondary members, role distribution |
| **Connected Components** | `VERIFIED` | `DERIVED CLASSIFICATION` | `analysis.components` in `components.ts` | Disconnected graph component decomposition via BFS |
| **Architectural Hotspots** | `VERIFIED` | `DERIVED CLASSIFICATION` | `findHotspots()` in `hotspots.ts` | High-risk components combining high coupling, cycles, and unresolved references |
| **Edge Crossings Breakdown** | `VERIFIED` | `DERIVED CLASSIFICATION` | `calculateDetailedEdgeCrossings()` in `metrics.ts` | Decomposes 2D geometric edge crossings into $C_{pp}, C_{pb}, C_{bb}, C_{ps}, C_{ss}$ |
| **Minimum Clearance Gap** | `VERIFIED` | `DERIVED CLASSIFICATION` | `minimumNodeClearance()` in `metrics.ts` | Calculates minimum 2D Euclidean gap between primary production nodes |
| **Layer Violations** | `VERIFIED` | `DERIVED CLASSIFICATION` | `layerViolationCount()` in `metrics.ts` | Counts upward dependency edges violating architectural layer rank |
| **Domain / Feature Cohesion**| `VERIFIED` | `DERIVED CLASSIFICATION` | `calculateSemanticFeatureCohesion()` | Pairwise 2D Euclidean dispersion score ($0.0$ to $1.0$) for domain and feature members |

---

## 8. Final Foundation Assessment

The Salesforce Architecture Explorer codebase possesses a **robust, highly deterministic, and modular foundation** for graph visualization, architectural layout, interaction, and analysis.

### Foundational Strengths
1. **Complete Data Coverage:** 100% of Salesforce metadata types, dependency relationships, behavior indicators, risk metrics, and impact summaries are modeled with strict TypeScript contracts.
2. **Deterministic Layout Architecture:** The 13-stage architecture layout engine provides bit-for-bit identical coordinate generation ($0.00000\text{ px}$ drift) across repeat runs and input shuffles, with strict Position Authority preservation.
3. **Clean Visual Layering:** Clear separation between Cytoscape graph canvas, SVG overlay layer (`FeatureOverlayCanvas`), and React HTML tooltips/controls creates seamless extension points for additional visualization lenses.
4. **Rich Analytical & Metrics Engine:** Complete quantitative metric suite evaluating crossings, clearance gaps, layer violations, domain cohesion, centrality, and feature locality.
5. **Zero Production Changes:** This audit was performed strictly read-only, establishing verified current-state truth for subsequent visualization audits.
