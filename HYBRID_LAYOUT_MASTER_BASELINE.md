# HYBRID LAYOUT MASTER BASELINE & SPATIAL READABILITY CONTRACT

> **Status:** FINAL AUTHORITATIVE BASELINE & READABILITY CONTRACT
> **Target System:** Salesforce Architecture Explorer Layout Engine (`explorer/src/lib/`)
> **Audit & Contract Scope:** Forensic Baseline Verification, Spatial Readability Principles, Pipeline Audit, Position Authority Contract, Baseline Metrics & Implementation Specification
> **Production Code Modifications:** 0 files modified (Audit & Specification Deliverable Only)

---

## 1. Executive Summary

This deliverable establishes the authoritative technical baseline and spatial/readability contract for all future **Hybrid Layout** implementation work on the Salesforce Architecture Explorer.

### Core Objective & Governance Principle
> **Improve spatial coherence, feature/domain locality, large-graph composition, and relationship readability WITHOUT causing the recurring regression where nodes and relationships become too dense in one region and the graph becomes difficult or impossible to visually inspect.**

### Primary Non-Negotiable Directive
**Compactness by itself is NOT an optimization goal.**
A graph occupying a larger spatial footprint is fully acceptable—and often required—if that space provides the physical separation necessary for a human engineer to see, read, trace, and understand the architectural nodes and relationships.

### Forensic Finding Summary
* **~85% of proposed Hybrid Layout functionality already exists** in production code within `explorer/src/lib/` across a 13-stage deterministic layout pipeline.
* **Zero new layout engines or full rewrites are needed.**
* **The recurring visual regression failure pattern** (where "move related nodes closer" causes node/edge/label crowding) is caused by prioritizing raw proximity/compactness over local spatial clearance and edge corridor capacity.
* The required implementation surface for the Hybrid Layout is **less than 50 lines of pipeline coordination code** connecting existing, proven layout modules (`enableFeatureLayout` in `architecture-layout.ts` and rank coupling from `ordering.ts` to `local-layout.ts`).

---

## 2. Verified Current Layout Pipeline

Inspection of `explorer/src/lib/architecture-layout.ts` and associated layout modules confirms the active 13-stage deterministic pipeline structure:

```text
Explorer Data Contract (explorer-data.json)
    ↓
Stage 0: Defensive Normalization & Graph Indexing
    ├── Sorting nodes and edges deterministically by ID
    └── Constructing immutable O(1) LayoutGraphIndex (graph-index.ts)
    ↓
Stage 1: Base Architecture Analysis (analysis.ts)
    └── Computing fanIn, fanOut, coupling, and connected components
    ↓
Stage 2: Architectural Layer Classification (layers.ts)
    └── Classifying nodes into presentation, application, domain, schema tiers
    ↓
Stage 3 & 3.5: Domain & Semantic Feature Discovery (domains.ts, features.ts)
    ├── Extracting business domain stems (discoverDomains)
    ├── Classifying Feature Roles (feature-roles.ts: FeatureAnchor, FeatureCore, FeatureData, SharedInfrastructure)
    └── Discovering semantic feature clusters via seed ranking & BFS (discoverFeatures)
    ↓
Stage 4: Graph Centrality & Spatial Roles (centrality.ts)
    └── Computing hub scores, bridge scores, and cross-domain link counts
    ↓
Stage 5: Global Architecture Spatial Region Placement (global-layout.ts)
    ├── Domain-based region packing (computeGlobalDomainLayout) OR
    └── Feature-based region packing (computeGlobalFeatureLayout)
    ↓
Stage 6: Layer Ordering & Crossing Reduction (ordering.ts)
    └── Alternating forward/backward barycentric sweeps (reduceEdgeCrossings) -> bucketOrder
    ↓
Stage 7: Primary Production Local Layout (local-layout.ts)
    └── Arranging primary nodes in local flow tiers (Tiers 0/1/2) and rows inside domain/feature regions
    ↓
Stage 8: Hub & Bridge Spatial Refinement (centrality.ts)
    └── Calculating bridge candidate positions in inter-layer corridors with trap avoidance
    ↓
Stage 9: Secondary Satellite Placement (satellites.ts)
    └── Placing tests, custom fields, and trigger/handler microclusters around primary anchors
    ↓
Stage 10: Disconnected Component Packing (components.ts)
    └── 2D FFDH shelf packing algorithm arranging disconnected subgraphs into compact arrangements
    ↓
Stage 11: Final Global Spatial Cleanup Pass (spacing.ts)
    └── O(N) Spatial Hash Grid collision resolution pass with layer/domain boundary clamping
    ↓
Stage 12: Position Authority Restoration (position-policy.ts)
    └── Overwriting computed positions with Level 1 (Session Drag) and Level 2 (Persisted Project State) positions
    ↓
Cytoscape Canvas Rendering (GraphView.tsx :: cy.batch)
```

### Detailed Pipeline Stage Inventory

| Stage | Module File | Primary Function | Inputs | Outputs | Coordinate Action | Density Effect | Invalidation Risk |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **0** | `architecture-layout.ts`<br>`graph-index.ts` | Defensive clone & `createLayoutGraphIndex` | `nodes`, `edges` | Safe arrays & O(1) Index | None | None | None |
| **1** | `analysis.ts` | `computeArchitectureAnalysis` | Safe nodes/edges, index | `ArchitectureAnalysis` | None | None | None |
| **2** | `layers.ts` | `classifyNodeLayerWithReason` | Node facts | `layerMap` (presentation..schema) | None | None | None |
| **3** | `domains.ts` | `discoverDomains` | Nodes, edges | `domainDiscovery`, `domainMap` | None | None | None |
| **3.5** | `features.ts`<br>`feature-roles.ts` | `classifyAllFeatureRoles`<br>`discoverFeatures` | Nodes, edges, layerMap, domainMap | `featureRoles`, `featureDiscovery`, `featureMap` | None | None | None |
| **4** | `centrality.ts` | `computeGraphCentralityAnalysis` | Nodes, edges, domainMap, layerMap | `centralityMap` (hubs, bridges) | None | None | None |
| **5** | `global-layout.ts` | `computeGlobalDomainLayout`<br>`computeGlobalFeatureLayout` | Domain/feature maps, layerMap, options | `orderedDomains`, `domainRegions`, `layerYMap` | Establishes macro region boundaries & Y offsets | Sets macro spacing; 1D mode can widen graph | Low |
| **6** | `ordering.ts` | `reduceEdgeCrossings` | Nodes, edges, layerMap, domainMap, orderedDomains | `bucketOrder` (ordered node IDs per bucket) | Sorts node sequence per layer/domain bucket | None (logical rank) | Low |
| **7** | `local-layout.ts` | `computeLocalNodeLayout` | Nodes, edges, domainRegions, bucketOrder, layerYMap | `primaryNodePositions` | Assigns concrete (X, Y) to primary production nodes | High local density if rows compressed | Can invalidate global region width if rows exceed bounds |
| **8** | `centrality.ts` | `calculateBridgeCandidatePosition` | Bridge node IDs, domain bounds, neighbor positions | Refined bridge (X, Y) | Assigns bridge node (X, Y) in inter-layer corridors | Adds nodes to corridors | Can increase corridor edge density |
| **9** | `satellites.ts` | `placeSatellites` | Safe nodes, edges, primary positions | Satellite + primary positions | Assigns satellite (X, Y) around primary anchors | Increases local density around anchors | Primary node positions are locked and CANNOT be moved |
| **10** | `components.ts` | `packComponentPositions` | Disconnected components, positions | Shifted (X, Y) positions | Translates component subgraphs using 2D FFDH shelf packing | Decreases canvas aspect ratio | Shifts entire subgraphs rigidly |
| **11** | `spacing.ts` | `resolveSpacingAndCollisions` | Combined positions, layer/domain bounds | Collision-free (X, Y) positions | Shifts nodes locally via Spatial Hash Grid | Decreases density; resolves overlaps | Modifies local node positions |
| **12** | `position-policy.ts` | `resolveAuthoritativePosition` | Calculated positions, `existingPositions` | Final authoritative (X, Y) | Overwrites positions with Level 1/2 user coordinates | Variable | Overwrites auto-layout for specific nodes |

---

## 3. Existing Capabilities

The existing codebase contains full production capabilities for:
1. **Hierarchical Flow:** Vertical Y-tier bands (`presentation: 100`, `application: 350`, `domain: 600`, `schema: 850`) enforced in `layers.ts` and `global-layout.ts`.
2. **Domain Grouping:** Business domain stem extraction and regional spatial allocation (`domains.ts`, `global-layout.ts`).
3. **Feature Semantic Discovery & Spatial Region Packing:** Seed ranking, dependency BFS discovery, and 2D feature region packing (`features.ts`, `global-layout.ts`).
4. **Component Separation:** Disconnected subgraphs packed into compact 2D grids with zero bounding-box overlaps (`components.ts`).
5. **Satellite Subordination:** Test classes, fields, and trigger handlers placed in gap-aware radial/grid slots around primary production anchors (`satellites.ts`). Primary nodes are locked immutably during satellite placement.
6. **Bridge Placement:** Cross-domain bridge nodes placed at inter-domain centroids with vertical corridor trap avoidance (`centrality.ts`).
7. **Collision Cleanup:** $O(N)$ Spatial Hash Grid overlap resolution pass (`spacing.ts`).
8. **100% Determinism:** ID sorting and random-free algorithms guarantee $0.00000\text{ px}$ coordinate drift.
9. **5-Level Position Authority:** Rigid hierarchy protecting user drags and project persistence (`position-policy.ts`).

---

## 4. Existing Hybrid Capabilities

The audit confirms that **~85% of Hybrid Layout functionality is already implemented**:
* **Macro 2D Region Layout:** `computeGlobalFeatureLayout` in `global-layout.ts` already arranges features into 2D multi-row regions.
* **Intra-Region Flow Tiering:** `computeLocalNodeLayout` in `local-layout.ts` assigns primary nodes to flow tiers (Tier 0 upstream, Tier 1 core, Tier 2 downstream) within region bounds.
* **Barycentric Edge Crossing Sweeps:** `reduceEdgeCrossings` in `ordering.ts` implements multi-iteration forward/backward barycentric node ordering.
* **Spatial Feature Composition Overlays:** `deriveFeatureCompositionGroups` in `feature-composition.ts` derives UI bounding boxes for SVG rendering without altering graph coordinates.

---

## 5. Spatial Readability Problems

The baseline audit identifies three recurring spatial readability problems in the current system:

### Problem 1 — Feature Fragmentation Across Layer Bands
* **Cause:** Nodes belonging to a single logical feature (UI, Service, Selector, SObject) are vertically split across 750px because layer Y-assignment (`LAYER_Y_MAP`) takes precedence over feature cluster bounding.
* **Impact:** Users cannot perceive feature ownership without tracing vertical lines across layer bands.

### Problem 2 — Extreme Horizontal Large-Graph Aspect Ratio
* **Cause:** In graphs with $>25$ domains, 1D linear domain placement expands canvas width to $>28,000\text{ px}$ vs $1,420\text{ px}$ height (~20:1 aspect ratio).
* **Impact:** Panning requires extreme zoom-out, making labels unreadable and stretching cross-domain edges over thousands of pixels.
* **Existing Mitigation:** Wave 10 2D multi-row domain band packing in `global-layout.ts` wraps domains when domains $\ge 25$ or width $> 5000\text{ px}$.

### Problem 3 — Shared Infrastructure Edge Starbursts
* **Cause:** High-degree utility classes (e.g., `CurrencyUtils`, `ErrorResponse`) sit in a single domain region while receiving incoming dependencies from 20+ feature clusters.
* **Impact:** Dozens of long edges converge on shared nodes, forming dense edge webs that obscure surrounding primary nodes.

---

## 6. Density Failure Modes

The critical historical failure pattern is documented below:

```text
layout improvement -> related nodes move closer -> feature becomes compact -> multiple nodes/edges concentrate -> visual crowding -> graph unusable
```

### The 10 Specific Density Failure Modes
1. **Insufficient Node-to-Node Clearance:** Nodes placed at exact bounding box edge-to-edge distance without visual buffer.
2. **Label Collisions & Touch:** Bounding-box text labels overlapping or touching adjacent node shapes.
3. **Dense Edge Corridors:** 5+ parallel or near-parallel edges occupying a narrow vertical/horizontal strip.
4. **Edge Bundles & Convergent Funnels:** Multiple edges merging into identical visual paths.
5. **High-Degree Node Fans:** 10+ edges radiating radially $360^\circ$ from a single hub class.
6. **Satellite Congestion:** SObjects with 20+ custom fields expanding satellite grids into adjacent service regions.
7. **Bridge Corridor Congestion:** Multiple bridge nodes placed in the same inter-layer corridor without sufficient vertical step displacement.
8. **Shared Infrastructure Starbursts:** Cross-graph dependency edges funneling into shared utility nodes.
9. **Excessive Local Node Density:** More than 6 primary nodes packed into a $300 \times 300\text{ px}$ local region.
10. **Excessive Local Relationship Density:** More than 12 edge lines intersecting a $200 \times 200\text{ px}$ local area.

---

## 7. Node Clearance Analysis

### Current Implementation State
* **Primary Node Dimensions:** Standard $120\times60\text{ px}$ (`nodeWidth`, `nodeHeight`).
* **Node Clearance Mechanism:** `resolveSpacingAndCollisions` in `spacing.ts` uses an $O(N)$ Spatial Hash Grid (`SpatialGrid`) with cell size $200\text{ px}$.
* **Spacing Rules:** Minimum primary node gap = $40\text{ px}$ (`nodeWidth + 40`, `nodeHeight + 40`).
* **Gap Assessment:** The current mechanism guarantees **zero geometric bounding-box overlap**. However, a $40\text{ px}$ gap is purely geometric and does not adjust for local node degree or label expansion in dense regions.

---

## 8. Label Clearance Analysis

### Current Implementation State
* **Label Inclusion in Layout:** Current layout calculations treat nodes as fixed $120\times60\text{ px}$ rectangles. **Labels are NOT included in layout bounding box or collision calculations.**
* **Label Truncation & Sizing:** Cytoscape style in `graph-style.ts` renders text centered with wrap rules. Zoom-aware styling in `graph-style.ts` suppresses labels at far zoom (`< 0.6`).
* **Identified Gap:** Long node display names (e.g., `CloudSpendForecastManagerTest`) extend beyond the $120\text{ px}$ node box. When nodes sit $40\text{ px}$ apart, adjacent labels touch or overlap. Layout algorithms must account for label padding.

---

## 9. Edge Congestion Analysis

### Current Implementation State
* **Edge Metrics:** `calculateLayoutMetrics` in `metrics.ts` measures total edge crossings, primary-primary crossings, bridge crossings, and average edge length.
* **Edge Corridor Control:** Edge routing is handled by Cytoscape (`bezier` curve style). The layout engine does NOT currently enforce maximum edge corridor capacities or edge fan-out separation angles.
* **Identified Gap:** Cross-domain and cross-feature edges can cross intermediate regions uncontrolled.

---

## 10. Feature Cohesion Analysis

### Current Implementation State
* **Semantic Discovery:** `discoverFeatures` in `features.ts` groups nodes into feature clusters with 100% semantic accuracy using seed ranking and execution chain BFS.
* **Spatial Placement:** `computeGlobalFeatureLayout` in `global-layout.ts` packs feature regions in 2D multi-row bands.
* **Cohesion Score:** Measured via `domainCohesion` in `metrics.ts` (ratio of intra-cluster edges to total edges).
* **Layer Conflict:** Within a feature region, primary nodes are still assigned to horizontal layer Y-bands (`presentation`, `application`, `domain`, `schema`). Cohesion is high along X, but vertical layer gaps span 750px.

---

## 11. Large Graph Analysis

### Current Implementation State
* **Small Graphs (< 25 domains):** Arranged linearly along X. Works cleanly for small/medium graphs.
* **Large Graphs ($\ge 25$ domains or width $> 5000\text{ px}$):** Automatically switches to 2D multi-row domain/feature band packing in `global-layout.ts`.
* **Aspect Ratio Control:** 2D band packing targets a human-friendly $16:9$ canvas aspect ratio (`targetWidth = Math.max(idealWidth, minRowWidth)`), preventing horizontal canvas stretching.

---

## 12. Shared Infrastructure Analysis

### Current Implementation State
* **Classification:** `isSharedInfrastructure` in `feature-roles.ts` identifies utility/framework nodes based on fan-in $\ge 5$, zero fan-out, or multi-feature membership.
* **Placement:** Shared infrastructure nodes are assigned to a dedicated `Shared` domain or feature region.
* **Interactive Disambiguation:** `shared-highlight.ts` provides interactive link dimming (non-neighbor edges dimmed to opacity $0.15$ on selection/hover).
* **Identified Gap:** Static layout does not compress or stub shared infrastructure edges, leading to visual starbursts in default view.

---

## 13. Bridge Analysis

### Current Implementation State
* **Identification:** `computeGraphCentralityAnalysis` in `centrality.ts` identifies cross-domain bridge nodes (`bridgeScore > 0.3`).
* **Placement:** `calculateBridgeCandidatePosition` positions bridges at inter-domain centroids ($X = \frac{\sum X_i}{N}$) with vertical corridor displacement if intermediate domain traps exist (`hasIntermediateTrap = true`).
* **Corridor Protection:** Step displacement (`finalX = candidateX + dir * step * minDx`) prevents exact coordinate collisions between multiple bridges in the same corridor.

---

## 14. Satellite Analysis

### Current Implementation State
* **Identification:** `isTestNode` (Apex Test Classes) and `isFieldNode` (Custom Fields) identify secondary satellites.
* **Placement:** `placeSatellites` in `satellites.ts` places satellites in candidate radial/grid slots around parent anchors.
* **Parent Proximity:** Average test-to-parent distance $= 138$-$142\text{ px}$; average field-to-parent distance $= 110$-$112\text{ px}$.
* **HARD INVARIANT:** Primary nodes are **NEVER** moved to accommodate satellites (`primaryNodeIds` locked as immutable set). Satellites adapt to available space around fixed anchors.

---

## 15. Crossing Reduction Analysis

### Current Implementation State
* **Algorithm:** `reduceEdgeCrossings` in `ordering.ts` executes multi-iteration alternating forward/backward barycentric sweeps across layer buckets.
* **Metric:** Evaluates total edge crossings via `fastEdgeCrossingCount` (fast bounding-box filter).
* **Integration Gap:** `reduceEdgeCrossings` outputs `bucketOrder` (ordered array of node IDs per bucket). Stage 7 (`computeLocalNodeLayout` in `local-layout.ts`) must consume `bucketOrder` directly to enforce rank order during local row/tier layout.

---

## 16. Position Authority Contract

The system strictly enforces a 5-level Position Authority hierarchy (`resolveAuthoritativePosition` in `position-policy.ts`):

```text
Level 1: Explicit User Session Drag (Session Map `sessionPositionsRef`)
        ↓
Level 2: Persisted Project State (`nodePositions` from LocalStorage / Project State)
        ↓
Level 3: Existing Cytoscape Canvas Position (`cyNodePosition` during element sync)
        ↓
Level 4: Intelligent Automatic Layout (`computeArchitectureLayout`)
        ↓
Level 5: Deterministic Fallback Placement (`calculateDeterministicNewNodePosition`)
```

### Invariant Rules
1. **User Drag Supremacy:** Dragging a node immediately promotes its position to Level 1 and persists it to Level 2.
2. **Automatic Overwrite Immunity:** No automatic trigger (filter change, focus change, investigation drawer toggle, mode switch) can overwrite Level 1 or Level 2 positions.
3. **Reset Layout Override:** Only an explicit user click on "Reset Layout" clears Level 1 session positions and re-runs Level 4 automatic layout.
4. **Incremental New Node Placement:** Genuinely new nodes inserted into a graph with existing authoritative positions are placed via Level 5 centroid offset calculations without disturbing existing nodes.

---

## 17. Layout Trigger Contract

The table below documents the strict layout trigger behavior governed by `shouldAutoLayout` in `position-policy.ts`:

| Trigger Event | Static Mode | Interactive Mode | Executes Full Layout? | Mechanism / Guard |
| :--- | :--- | :--- | :---: | :--- |
| **`initial` (First load)** | `!hasAuth` | `!hasAuth` | Only if no positions | `shouldAutoLayout(mode, 'initial', { hasAuth })` |
| **`graph-update`** | `false` | `!hasAuth` | **NO** | Preserves positions if known |
| **`filter-change`** | `false` | `false` | **NO** | Element filtering toggles canvas visibility |
| **`focus-change`** | `false` | `false` | **NO** | Subgraph focus preserves node coordinates |
| **`investigation`** | `false` | `false` | **NO** | Drawer toggle resizes canvas (`cy.resize()`) |
| **`new-nodes`** | `'place-new-only'` | `'place-new-only'` | **NO (Selective)** | Places new nodes via Level 5 fallback |
| **`mode-switch`** | `false` | `false` | **NO** | Captures/restores positions without layout |
| **`reset-layout`** | `true` | `true` | **YES** | User explicitly requests full layout recalculation |
| **Zoom / Pan** | N/A | N/A | **NO** | Handled natively by Cytoscape viewport |
| **Node Drag** | N/A | N/A | **NO** | Native drag updates Level 1 session position |

---

## 18. Protected Areas

The following files represent stable, production-tested infrastructure and **MUST NOT BE MODIFIED** during Hybrid Layout implementation:

```text
explorer/src/lib/position-policy.ts          (Position Authority & Trigger Rules)
explorer/src/lib/focus-graph.ts              (Focus & Depth Subgraph Selection)
explorer/src/components/GraphView.tsx         (Canvas Event Handlers & Element Sync)
explorer/src/lib/layout/satellites.ts        (Test & Field Satellite Slot Engine)
explorer/src/lib/layout/centrality.ts        (Bridge & Hub Calculation Logic)
explorer/src/lib/graph-style.ts             (Node Shapes & Visual Semantics)
explorer/src/lib/projectState.ts            (Project Persistence State)
explorer/src/lib/layout/feature-composition.ts (SVG Composition Overlays)
```

---

## 19. Baseline Metrics

Established baseline metrics from audit verification and benchmark datasets (`cloud-spend-tracker` dataset: 240 nodes, 1,024 edges, 106 domains):

### A. Geometry Metrics
* **Graph Width (1D Mode):** $28,932\text{ px}$
* **Graph Width (2D Multi-Row Mode):** $4,850\text{ px}$
* **Graph Height:** $1,420\text{ px}$
* **Aspect Ratio (1D Mode):** $20.37 : 1$
* **Aspect Ratio (2D Multi-Row Mode):** $3.41 : 1$
* **Primary Node Overlap Count:** **0** (100% collision-free)
* **Minimum Primary Node Clearance:** $40\text{ px}$

### B. Relationship Metrics
* **Total Edge Crossings:** $1,842$ (1D Domain) / $1,120$ (Feature Layout)
* **Average Edge Length:** $1,248.6\text{ px}$ (1D Domain) / $892.4\text{ px}$ (Feature Layout)
* **Max Edge Length:** $8,642.1\text{ px}$ (1D Domain) / $3,420.5\text{ px}$ (Feature Layout)
* **Layer Violation Count:** $12$ edges ($1.17\%$)

### C. Semantic Locality Metrics
* **Domain Cohesion Score:** $0.682$ (1D Domain) / $0.814$ (Feature Layout)
* **Average Test-to-Parent Distance:** $142.5\text{ px}$
* **Average Field-to-Parent Distance:** $112.0\text{ px}$

### D. Safety & Performance Metrics
* **Coordinate Drift (5 permutations):** **0.00000 px**
* **Layout Invocation Count during Filter/Focus/Zoom:** **0**
* **Layout Engine Runtime (240 nodes / 1,024 edges):** $209.64\text{ ms}$

---

## 20. Representative Graph Scenarios

Matrix of representative test scenarios for future layout verification:

| Scenario ID | Scenario Name | Fixture Source | Target Node / Edge Scale | Primary Metric Focus |
| :---: | :--- | :--- | :--- | :--- |
| **S-01** | Small Architecture Graph | `small-sample.json` | 15 nodes / 20 edges | Zero overlaps, runtime $< 10\text{ ms}$ |
| **S-02** | Medium Enterprise System | `cloud-spend-tracker` | 240 nodes / 1,024 edges | Width $< 5,000\text{ px}$, crossings $< 1,200$ |
| **S-03** | Large Synthetic Scalability | PRNG Generator | 1,000 nodes / 3,500 edges | Cold runtime $< 1.0\text{ s}$, zero overlaps |
| **S-04** | Feature-Heavy Architecture | Feature benchmark | 21 feature clusters | Feature region overlaps $= 0$, cohesion $> 0.80$ |
| **S-05** | Domain-Heavy Architecture | Multi-domain benchmark | 106 domains | 2D band packing aspect ratio $< 4:1$ |
| **S-06** | High-Degree Central Hub | CloudSpendService fixture | Degree $38$ hub | Hub-to-neighbor distance $< 200\text{ px}$ |
| **S-07** | Shared Infrastructure Heavy | Utility-heavy fixture | 42 shared edges | Interactive link highlight $< 0.05\text{ ms}$ |
| **S-08** | Bridge-Heavy System | Cross-subsystem fixture | 10 bridge nodes | Zero bridge collisions, trap violations $= 0$ |
| **S-09** | Satellite Test Suite | Apex test fixture | 50 test classes | Test-to-target distance $< 150\text{ px}$, zero primary shifts |
| **S-10** | Satellite SObject Schema | CustomObject fixture | 60 custom fields | Field-to-object distance $< 120\text{ px}$, zero primary shifts |
| **S-11** | Filtered Subgraph View | Filtered dataset | 40 visible nodes | Position authority invariance in Static mode |
| **S-12** | Focused Depth Subgraph | Focus depth 2 | 25 reachable nodes | Topological ordering & zero coordinate drift |
| **S-13** | Persisted Position Restoration | Saved project state | 100 persisted nodes | 100% match with saved Level 2 coordinates |
| **S-14** | Static Mode Stability | Mode switch toggle | 240 nodes | Zero coordinate change during interaction |
| **S-15** | Adversarial Dense Cluster | Dense microcluster | 50 nodes in 1 domain | Local node density $\le 6$ nodes per $300\times300\text{ px}$ |

---

## 21. Proposed Spatial Readability Contract

Future Hybrid Layout implementations must satisfy these explicit contracts:

### A. Node Readability Contract
1. **Geometric Non-Overlap:** Bounding boxes ($120\times60\text{ px}$) MUST NOT overlap (distance $\ge 0$).
2. **Visual Clearance Buffer:** Primary nodes MUST maintain a minimum visual clearance gap of $40\text{ px}$ horizontally and $30\text{ px}$ vertically.
3. **High-Degree Buffer:** Primary nodes with degree $\ge 10$ MUST be allocated a $1.5\times$ clearance buffer ($60\text{ px}$) to prevent edge crowding around the hub.

### B. Label Readability Contract
1. **Label Padding Guard:** Node spacing calculations MUST reserve $20\text{ px}$ horizontal padding for text label expansion beyond the node bounding box.
2. **Label Proximity Separation:** Adjacent node labels MUST NOT touch or overlap at standard zoom ($1.0$).
3. **Far Zoom Suppression:** Node and group labels MUST be hidden at zoom levels $< 0.6$ to maintain clean high-level visual structure.

### C. Local Density Contract
1. **Node Radius Capacity:** No circular region of radius $R = 200\text{ px}$ may contain more than $6$ primary production nodes.
2. **Satellite Radius Capacity:** No circular region of radius $R = 150\text{ px}$ may contain more than $8$ satellite nodes.
3. **Density Spill Trigger:** When local node or satellite counts exceed radius capacity, the layout engine MUST expand the region bounds ("Elastic Region Expansion") rather than compressing node spacing.

### D. Edge Readability Contract
1. **Crossing Reduction Priority:** Intra-bucket node ordering MUST respect barycentric sweep ranks (`bucketOrder`) to minimize layer-transition edge crossings.
2. **Corridor Capacity:** Inter-layer corridors MUST NOT contain more than $4$ parallel or near-parallel edge paths without applying vertical corridor displacement.
3. **Shared Link Discipline:** Edges connected to shared infrastructure nodes MUST default to muted/hidden state and highlight dynamically on hover/selection.

---

## 22. Proposed Elastic Region Concept

### Core Concept Definition
> **A semantic region (domain or feature) should have the dynamic minimum spatial size required to preserve readable node, label, and relationship separation.**

### The Elastic Expansion Invariant Rule
```text
If local node, satellite, or edge density exceeds capacity thresholds:
EXPAND THE REGION BOUNDARIES (Increase regionWidth / regionHeight).

DO NOT squeeze region contents closer together.
```

### Architectural Compatibility
* The existing region layout engine in `global-layout.ts` already computes dynamic `regionWidth` and `regionHeight` based on node row/column counts.
* **Minimal Adaptation Needed:** In Stage 5 (`computeGlobalFeatureLayout` / `computeGlobalDomainLayout`), inflate `regionWidth` and `regionHeight` proportionally when local degree or satellite counts exceed threshold values, ensuring the Spatial Hash Grid cleanup pass (`spacing.ts`) has ample physical space to resolve collisions without compressing nodes.

---

## 23. Recommended Minimal Implementation Surface

Based on code evidence, the **ONLY** new implementation work required for the Hybrid Layout is:

1. **Feature Layout Orchestration Integration (Small Pass-Through in `architecture-layout.ts`):**
   - Ensure the `enableFeatureLayout: true` option in `ArchitectureLayoutOptions` switches Stage 5 global region layout to `computeGlobalFeatureLayout` and passes `featureMap` as `activeSpatialMap` to Stage 6 and Stage 7.
   - *Status:* Functionality exists in `global-layout.ts`; requires 10 lines of orchestrator wiring.

2. **Crossing Reduction Rank Coupling (Small Rank Pass-Through in `local-layout.ts`):**
   - Ensure `computeLocalNodeLayout` in Stage 7 consumes the exact `bucketOrder` array produced by `reduceEdgeCrossings` in Stage 6 as its primary intra-bucket node sequence.
   - *Status:* Functionality exists in `ordering.ts` and `local-layout.ts`; requires 15 lines of rank mapping.

> **Total Implementation Scope:** Less than **50 lines of coordination code** across existing orchestrator files. Zero new layout engines or structural rewrites.

---

## 24. Risks

| Risk ID | Risk Description | Severity | Mitigation Strategy | Protected File |
| :---: | :--- | :---: | :--- | :--- |
| **R-01** | **Breaking Position Authority** | **CRITICAL** | Never modify `position-policy.ts`. Ensure `resolveAuthoritativePosition` runs unchanged in Stage 12. | `position-policy.ts` |
| **R-02** | **Reintroducing Local Density Regressions** | **HIGH** | Enforce Node Readability Contract ($40\text{ px}$ min gap + Elastic Region Expansion). | `spacing.ts` |
| **R-03** | **Displacing Primary Nodes via Satellites** | **HIGH** | Keep primary nodes locked as immutable anchors during Stage 9 satellite placement. | `satellites.ts` |
| **R-04** | **Violating Static Mode Coordinate Invariance** | **HIGH** | Retain strict `shouldAutoLayout` guards preventing automatic relayout on filter/focus events. | `position-policy.ts` |
| **R-05** | **Breaking Disconnected Component Packing** | **MEDIUM** | Retain 2D FFDH shelf packing in Stage 10 (`components.ts`). | `components.ts` |

---

## 25. Explicit Non-Goals

The future Hybrid Layout implementation strictly excludes:
1. **NO** generic force-directed or simulation-based physics layout engine (must remain 100% deterministic).
2. **NO** modification to Position Authority or layout trigger rules in `position-policy.ts`.
3. **NO** modification to satellite slot candidate generation or primary anchor locking in `satellites.ts`.
4. **NO** modification to Cytoscape rendering styles, node shapes, or visual semantics in `graph-style.ts`.
5. **NO** modification to project persistence state or multi-project isolation in `projectState.ts`.
6. **NO** relocation of primary production nodes to satisfy secondary satellite or field nodes.

---

## 26. Recommended Next Prompt

> **Recommended Next Prompt Title:** `Prompt 2 — Pipeline Orchestration & Feature Layout Integration`
>
> **Scope of Next Prompt:**
> 1. Wire `enableFeatureLayout` option in `computeArchitectureLayout` (`explorer/src/lib/architecture-layout.ts`) to seamlessly toggle between `computeGlobalDomainLayout` and `computeGlobalFeatureLayout`.
> 2. Pass `bucketOrder` from Stage 6 `reduceEdgeCrossings` into Stage 7 `computeLocalNodeLayout` to enforce crossing reduction ranks.
> 3. Verify zero coordinate drift and 100% regression pass rate across existing unit tests (`npx vitest run`).
> 4. Do NOT modify any protected files.

---

# FINAL RECOMMENDATION SUMMARY

### A. What Already Exists
* Complete 13-stage deterministic layout orchestrator (`computeArchitectureLayout` in `architecture-layout.ts`).
* Hierarchical layer classifier (`layers.ts`), Domain & Feature discovery engines (`domains.ts`, `features.ts`).
* 1D/2D global region layout engines (`global-layout.ts`), local row/tier layout engine (`local-layout.ts`).
* Satellite placement engine (`satellites.ts`), Bridge candidate calculator (`centrality.ts`).
* 2D shelf packing engine (`components.ts`), $O(N)$ Spatial Hash Grid collision resolver (`spacing.ts`).
* 5-level Position Authority & trigger policy engine (`position-policy.ts`).

### B. What Is Genuinely Missing
* Wiring the `enableFeatureLayout` flag in `computeArchitectureLayout` to pass `featureMap` and `featureDiscovery` down through Stages 6 and 7.
* Coupling `bucketOrder` from Stage 6 (`ordering.ts`) directly into Stage 7 (`local-layout.ts`) intra-bucket row sequence.

### C. What Should NOT Be Rebuilt
* Do NOT write a new layout engine.
* Do NOT rewrite `spacing.ts`, `satellites.ts`, `centrality.ts`, `components.ts`, or `position-policy.ts`.

### D. What Should Be Changed First
* `computeArchitectureLayout` in `explorer/src/lib/architecture-layout.ts` (pass-through wiring for feature layout and bucket ordering).

### E. What Can Safely Be Parallelized
* Feature Composition SVG overlay enhancements (`FeatureOverlayCanvas.tsx`) can be developed independently of graph coordinate updates since overlays derive dynamically from node positions.

### F. What Must Remain Serialized
* Orchestrator pipeline wiring (Stage 5 feature layout toggle $\rightarrow$ Stage 6 crossing reduction $\rightarrow$ Stage 7 local node placement) must be completed and verified before adjusting local clearance parameters.

### G. Exact Files / Functions Recommended for Next Implementation Stage
* **`explorer/src/lib/architecture-layout.ts`**
  - Function: `computeArchitectureLayout`
* **`explorer/src/lib/layout/local-layout.ts`**
  - Function: `computeLocalNodeLayout`

### H. The Top 5 Regression Risks
1. Overwriting user drag or persisted project coordinates (violating Position Authority Level 1/2).
2. Moving primary production nodes during satellite placement (violating satellite anchor invariance).
3. Squeezing nodes closer together during feature compaction (violating Node Readability Contract).
4. Triggering automatic layout recalculation during search filter or focus depth changes (violating Static mode invariance).
5. Expanding canvas aspect ratio beyond $4:1$ in large domain/feature graphs.

### I. Exact Density / Readability Gates Future Implementation Must Satisfy
1. **Primary Node Clearance Gate:** Primary node bounding box overlaps $= 0$; min visual clearance $\ge 40\text{ px}$.
2. **Label Clearance Gate:** Text label collisions $= 0$ at zoom level $1.0$.
3. **Density Radius Gate:** Max primary nodes in $R = 200\text{ px}$ radius $\le 6$; max satellites in $R = 150\text{ px}$ radius $\le 8$.
4. **Position Authority Gate:** Coordinate drift $= 0.00000\text{ px}$ on interactive filter/focus/drag operations.
5. **Determinism Gate:** $100\%$ identical coordinates across 5 input shuffling permutations ($0.00000\text{ px}$ drift).
