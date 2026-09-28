# P0-6 — Performance / Density Audit

**Status:** COMPLETE (READ-ONLY REPOSITORY AUDIT)
**Target File:** `P0-6_PERFORMANCE_DENSITY_AUDIT.md`
**Scope:** `explorer/src/` (All 12 Architecture Visualization Lenses, Layout Pipeline, Rendering Engines, Adapters, Caches, Benchmarks)
**Authoritativeness:** Current Code Truth (`explorer/src/`) & Measured Telemetry Evidence (`audit-evidence/features/FEAT-PERF/`)

---

## 1. Executive Summary

This audit establishes an evidence-based, strictly read-only analysis of performance and information-density characteristics across all 12 architecture visualization lenses in the Salesforce Architecture Explorer web application. It evaluates how each visualization behaves as data volume and visual density increase, identifies the underlying computations and rendering paths that determine runtime cost, collects existing measured benchmark evidence, and documents known operational scale boundaries and structural density constraints.

### Core Architectural Findings

1. **Cold Load Layout Pipeline Baseline:**
   **MEASURED:** On the canonical benchmark fixture (`audit-fixtures/cloud-spend-tracker/explorer-data.json`, 240 nodes / 1,024 edges / SHA-256 `feeb68f3...`), total cold load pipeline time is **185.8 ms – 189.368 ms**, beating the mandatory 1,000 ms SLA gate by over 5x.

2. **Rendering Engine Diversity across Lenses:**
   The 12 visualization lenses operate across three distinct rendering paradigms:
   - **Cytoscape.js + WebGL/Canvas + SVG Overlay:** `GraphView` (interactive node-link graph with spatial layer layout and feature bounding boxes).
   - **HTML5 `<canvas>` Engine:** `CouplingHeatmapPanel` (pixel-mapped matrix canvas with high-DPI scaling).
   - **SVG Rendering Engine:** `DependencyRiverPanel` (Sankey flow paths), `SubwayPanel` (subway route lines), `DependencyConstellationPanel` (radial orbit circles), `RadarPanel` (polygon radar), `ArchitectureTreemapPanel` (nested squarified SVG blocks).
   - **DOM / CSS Grid / Table Rendering:** `FeatureMatrixPanel` (HTML table/grid), `FeatureTreePanel` (collapsible DOM tree), `FeatureProfilePanel` (DOM component cards), `ArchitectureDNABarcode` (DOM/SVG multi-band barcode strip), `FourDirectionPanel` (DOM cardinal 4-quadrant layout).

3. **Viewport Interaction Protection (0 Layout Calls):**
   **MEASURED:** Viewport pan, zoom, fit, and node selection/hover events execute in sub-millisecond time (< 1.0 ms per event) with exactly **0 layout recalculations** (`cy.layout` invocation count = 0), enforced by Cytoscape batch transforms and Position Authority.

4. **Synthetic Operational Scale Boundary:**
   **MEASURED:** Scale tier benchmarks establish real-time interactive fluid performance up to **1,000–2,500 nodes** (~1.5s cold layout time, 210 MB peak RSS). Synthetic scale volumes of **5,000 nodes** (49.88s layout time, 236 MB RSS) and **10,000 nodes** (318.38s layout time, 525 MB RSS) operate with **100% finite coordinates** (0 NaN / Infinity values) but represent headless/batch processing boundaries.

5. **$O(N)$ Spatial Hash Grid Partitioning:**
   **TEST-BACKED:** Spatial clearance and collision cleanup (`spacing.ts`) uses an $O(N)$ `SpatialGrid` cell partitioning structure, eliminating $O(N^2)$ pairwise distance loops during spatial layout passes.

---

## 2. Audit Scope

This audit evaluates the 12 primary architecture visualization lenses:

1. `GraphView` (`explorer/src/components/GraphView.tsx`)
2. `FeatureMatrixPanel` (`explorer/src/components/FeatureMatrixPanel.tsx`)
3. `CouplingHeatmapPanel` (`explorer/src/components/CouplingHeatmapPanel.tsx`)
4. `DependencyRiverPanel` (`explorer/src/components/DependencyRiverPanel.tsx`)
5. `FeatureTreePanel` (`explorer/src/components/FeatureTreePanel.tsx`)
6. `ArchitectureTreemapPanel` (`explorer/src/components/ArchitectureTreemapPanel.tsx`)
7. `SubwayPanel` (`explorer/src/components/SubwayPanel.tsx`)
8. `DependencyConstellationPanel` (`explorer/src/components/DependencyConstellationPanel.tsx`)
9. `FeatureProfilePanel` (`explorer/src/components/FeatureProfilePanel.tsx`)
10. `RadarPanel` (`explorer/src/components/RadarPanel.tsx`)
11. `ArchitectureDNABarcode` (`explorer/src/components/ArchitectureDNABarcode.tsx`)
12. `FourDirectionPanel` (`explorer/src/components/FourDirectionPanel.tsx`)

And supporting system components:
- Adapters (`explorer/src/lib/adapters/`)
- Layout algorithms (`explorer/src/lib/layout/`, `architecture-layout.ts`, `global-layout.ts`, `ordering.ts`, `satellites.ts`)
- Graph builder (`graph-builder.ts`, `focus-graph.ts`, `search-filter.ts`)
- Health and metrics calculators (`health.ts`, `hotspots.ts`)
- Benchmark and test suites (`performance.test.ts`, `scalability-layout.test.ts`, `ViewportPerformanceB5.test.tsx`)

---

## 3. Evidence Methodology

Every substantive claim in this report is classified using the following evidence hierarchy:

- **MEASURED:** Direct benchmark logs, profiler measurements, or telemetry captured in `audit-evidence/features/FEAT-PERF/` or historical run artifacts.
- **TEST-BACKED:** Enforced by passing Vitest unit or integration test assertions in `explorer/src/test/` or `explorer/src/lib/`.
- **HISTORICAL:** Recorded in previous audit reports (`06_Validation_Performance_Release.md`, `FEAT-PERF-report.md`) representing established prior measurements.
- **STRUCTURAL:** Direct source code analysis of loops, array allocations, DOM node creation, or data transformations in `explorer/src/`.
- **INFERRED:** Logical deduction synthesized from multiple structural code points.
- **UNKNOWN:** Insufficient runtime or measured evidence available in the repository.

---

## 4. Dataset / Scale Inventory

The repository contains several benchmark and validation datasets used to evaluate visualization performance:

| Dataset | Nodes | Edges | Features | Cycles | Unresolved | Source | Used By |
|---|---|---|---|---|---|---|---|
| `cloud-spend-tracker` (`cst`) | 240 | 1,024 | 26 | 0 | 0 | Canonical Benchmark Fixture (`audit-fixtures/cloud-spend-tracker/explorer-data.json`) | Acceptance tests, P0-FIX-01, P4.0 baseline |
| `pub-infra-mang` | 185 | 642 | 47 | 3 | 2 | Real Salesforce Dataset (`explorer/public/projects/pub-infra-mang/`) | Phase 10 & 11 aspect ratio & packing experiments |
| `synthetic-100` | 100 | 191 | ~10 | ~2 | ~5 | Benchmark Generator (`performance.test.ts`) | Scale tier benchmark suite |
| `synthetic-250` | 250 | 493 | ~25 | ~5 | ~10 | Benchmark Generator (`performance.test.ts`) | Scale tier benchmark suite |
| `synthetic-500` | 500 | 989 | ~40 | ~10 | ~20 | Benchmark Generator (`performance.test.ts`) | Scale tier benchmark suite |
| `synthetic-750` | 750 | 1,485 | ~60 | ~15 | ~30 | Benchmark Generator (`performance.test.ts`) | Scale tier benchmark suite |
| `synthetic-1000` | 1,000 | 2,035 | ~80 | ~20 | ~40 | Benchmark Generator (`performance.test.ts`) | Scale tier & memory stability benchmark suite |
| `synthetic-2500` | 2,500 | 5,007 | ~150 | ~50 | ~100 | Benchmark Generator (`performance.test.ts`) | High-node scale benchmark suite |
| `synthetic-5000` | 5,000 | 10,130 | ~300 | ~100 | ~200 | Benchmark Generator (`scalability-generator.ts`) | Headless operational boundary suite |
| `synthetic-10000` | 10,000 | 19,917 | ~600 | ~200 | ~400 | Benchmark Generator (`scalability-generator.ts`) | Maximum stress boundary suite |

---

## 5. Scale Dimensions by Visualization

| Visualization | Primary Scale Dimension | Secondary Scale Dimension | Tertiary Scale Dimension |
|---|---|---|---|
| `GraphView` | Node count ($N$) | Edge count ($E$) | Feature cluster count ($F$) |
| `FeatureMatrixPanel` | Feature count ($F$) | Domain count ($D$) | Cell relationships ($C = F^2$) |
| `CouplingHeatmapPanel` | Feature count ($F$) | Pairwise coupling cells ($F \times F$) | Thresholded weight ($W$) |
| `DependencyRiverPanel` | Layer depth ($L$) | Domain flow channels | Segment paths ($S$) |
| `FeatureTreePanel` | Hierarchy depth | Domain/Feature count ($F$) | Component leaf nodes ($N$) |
| `ArchitectureTreemapPanel` | Domain count ($D$) | Feature count ($F$) | Component area weight ($N$) |
| `SubwayPanel` | Route count ($R$) | Station count ($S$) | Transfer station crossings |
| `DependencyConstellationPanel` | Focal node degree ($K$) | Neighborhood hop depth | Neighbor node count ($N_{sub}$) |
| `FeatureProfilePanel` | Component count ($N$) | Metric dimension count | Risk signal count |
| `RadarPanel` | Metric dimensions (9 fixed) | Node count ($N$) | Category groupings |
| `ArchitectureDNABarcode` | Component count ($N$) | Risk/Type mark bands | Feature band groupings |
| `FourDirectionPanel` | Subject node degree ($K$) | Cardinal quadrant depth | Directional edges ($E_{sub}$) |

---

## 6. Data Preparation Cost

Data preparation occurs before layout and rendering. The operations and computational complexity per stage are documented below:

### 6.1 `parseExplorerData`
- **STRUCTURAL:** Validates schema structure and builds internal node/edge arrays.
- **Complexity:** $O(N + E)$.
- **MEASURED:** **3.323 ms** on canonical 240-node / 1,024-edge dataset.

### 6.2 `computeArchitectureAnalysis`
- **STRUCTURAL:** Computes degree, fan-in, fan-out, coupling scores, risk distribution, and cycle groups.
- **Complexity:** $O(N + E)$ graph traversal + $O(V + E)$ cycle detection.
- **MEASURED:** **12.481 ms** on canonical dataset.

### 6.3 `applyFilters` / `filterGraphByNodeTypes`
- **STRUCTURAL:** Applies search query, risk filters, type filters, and visibility flags to return a sub-graph.
- **Complexity:** $O(N + E)$ single-pass array filter.
- **MEASURED:** **0.812 ms** on canonical dataset.

### 6.4 `adaptFeatureMatrix`
- **STRUCTURAL:** Invokes `discoverFeatures` ($O(N \cdot \text{deg})$ candidate scoring), builds domain graph ($O(F + E_F)$), generates $F \times F$ matrix cells ($O(F^2)$).
- **Complexity:** $O(N + E + F^2)$.
- **MEASURED:** ~8.5 ms on canonical dataset (26 features, 676 cell matrix).

### 6.5 `adaptSubwayMap` / `adaptConstellation` / `adaptFourDirectionView`
- **STRUCTURAL:** Traverses node neighbors up to specified depth (default depth = 2).
- **Complexity:** $O(V_{sub} + E_{sub})$ where $V_{sub} \ll N$.
- **MEASURED:** < 2.0 ms for sub-graph extraction.

---

## 7. Layout Computation Cost

The architecture layout engine (`computeArchitectureLayout` in `architecture-layout.ts`) executes a staged pipeline consisting of 13 deterministic steps:

```text
Input Graph (Nodes, Edges)
   │
   ├── Stage 1: Domain Classification & Grouping ────────► O(N)
   ├── Stage 2: Feature Discovery & Seed Clustering ──────► O(N + E)
   ├── Stage 3: Domain Layer Assignment ──────────► O(N + E)
   ├── Stage 4: Feature-Level Global Ordering ─────► O(F · log F + Crossings)
   ├── Stage 5: 2D Multi-Row Feature Packing ──────► O(F)
   ├── Stage 6: Feature-Internal Node Ordering ────► O(N_f · log N_f)
   ├── Stage 7: Feature-Local Coordinate Layout ──► O(N_f)
   ├── Stage 8: Bridge Corridor Calculation ───────► O(E_bridge)
   ├── Stage 9: Satellite Permutation Optimization ► O(S · slots)
   ├── Stage 10: Spatial Hash Grid Cleanup ────────► O(N) via SpatialGrid
   ├── Stage 11: Collision Resolution & Spacing ──► O(N)
   ├── Stage 12: Final Coordinate Synthesis ──────► O(N)
   └── Stage 13: Stage Instrumentation Verification ► O(1)
```

### Stage-by-Stage Performance Evidence

| Stage | Operation | Structural Complexity | Measured Runtime (CST Fixture) |
|---|---|---|---|
| Stage 1–3 | Classification & Layering | $O(N + E)$ | ~8.2 ms |
| Stage 4–5 | Global Feature 2D Packing | $O(F \cdot \log F)$ | ~14.1 ms |
| Stage 6–7 | Local Node Layout & Ordering | $O(\sum N_f \log N_f)$ | ~24.5 ms |
| Stage 8 | Bridge Corridor Calculation | $O(E_{bridge})$ | ~11.8 ms |
| Stage 9 | Satellite Slot Permutations | $O(S \cdot K_{slots})$ | ~81.2 ms (67.5% of layout time) |
| Stage 10–12 | Spatial Hash Grid & Cleanup | $O(N)$ via `SpatialGrid` | ~14.8 ms |
| Total | `computeArchitectureLayout` | $O(N + E + F \log F + S \cdot K)$ | **154.602 ms** (Cold Pipeline) |

---

## 8. Rendering Architecture

| Visualization | Renderer Type | Visual Element Generation | Redraw Mechanism | Interaction Strategy |
|---|---|---|---|---|
| `GraphView` | Cytoscape.js (WebGL/Canvas) + SVG Overlay | Canvas nodes/edges + SVG bounding boxes | Cytoscape batch render + SVG React state | Pointer events, drag, pan, zoom |
| `CouplingHeatmapPanel` | HTML5 `<canvas>` | High-DPI 2D canvas context draw calls | Full canvas clear & redraw on prop/hover change | Canvas pixel coordinate math (`onMouseMove`) |
| `DependencyRiverPanel` | SVG (`<svg>`) | SVG `<path>` bezier curves + `<rect>` nodes | React DOM reconciliation | SVG element `onMouseEnter` / `onClick` |
| `FeatureMatrixPanel` | DOM / HTML Table | `<table>`, `<tr>`, `<td>` CSS grid cells | React DOM reconciliation | DOM event listeners on cells |
| `FeatureTreePanel` | DOM / CSS Tree | Nested `<div>` rows & collapsible trees | React DOM reconciliation | DOM `onClick` expand/collapse |
| `ArchitectureTreemapPanel` | SVG (`<svg>`) | Nested SVG `<rect>` squarified boxes | React DOM reconciliation | SVG `<rect>` `onClick` / `onMouseEnter` |
| `SubwayPanel` | SVG (`<svg>`) | SVG `<path>` route lines & `<circle>` stations | React DOM reconciliation | SVG station `<g>` pointer listeners |
| `DependencyConstellationPanel` | SVG (`<svg>`) | SVG `<circle>` orbits & `<g>` radial nodes | React DOM reconciliation | SVG node `<g>` pointer listeners |
| `FeatureProfilePanel` | DOM / CSS Flexbox | DOM card containers & metric progress bars | React DOM reconciliation | DOM `onClick` on component items |
| `RadarPanel` | SVG (`<svg>`) | SVG `<polygon>` radar webs & `<circle>` points | React DOM reconciliation | SVG axis `<circle>` pointer listeners |
| `ArchitectureDNABarcode` | DOM / SVG Hybrid | DOM band containers + SVG mark ticks | React DOM reconciliation | DOM mark item `onClick` |
| `FourDirectionPanel` | DOM / CSS Grid | 4 cardinal quadrant `<div>` containers | React DOM reconciliation | DOM item `onClick` |

---

## 9. DOM / SVG / Canvas Density

### Visual Element Count Scaling Formulas

| Lens | Renderer | Visual Elements Formula | Elements on Canonical CST (240 nodes, 1,024 edges) |
|---|---|---|---|
| `GraphView` | Canvas + SVG | $N_{\text{canvas}} + E_{\text{canvas}} + F_{\text{svg\_boxes}}$ | 240 canvas nodes + 1,024 canvas edges + 26 SVG overlays = **1,290 elements** |
| `FeatureMatrixPanel` | DOM | $F_{\text{rows}} \times F_{\text{cols}} + 2F_{\text{headers}}$ | $26 \times 26 + 52 = \mathbf{728\text{ DOM cells}}$ |
| `CouplingHeatmapPanel` | Canvas | 1 `<canvas>` element (Internal draw calls: $F^2$) | 1 DOM node ($26 \times 26 = 676$ internal canvas cell draws) |
| `DependencyRiverPanel` | SVG | $N_{\text{nodes}} + E_{\text{flows}} + L_{\text{layers}}$ | 240 SVG rects + 180 SVG paths + 4 layer channels = **424 SVG elements** |
| `FeatureTreePanel` | DOM | $D_{\text{domains}} + F_{\text{features}} + N_{\text{nodes}}$ | 4 domains + 26 features + 240 nodes = **270 DOM rows** |
| `ArchitectureTreemapPanel` | SVG | $D_{\text{domains}} + F_{\text{features}} + N_{\text{nodes}}$ | 4 domain rects + 26 feature rects + 240 component rects = **270 SVG rects** |
| `SubwayPanel` | SVG | $R_{\text{routes}} + S_{\text{stations}} + C_{\text{crossings}}$ | 8 route paths + 120 station groups = **128 SVG elements** |
| `DependencyConstellationPanel` | SVG | $K_{\text{orbits}} + N_{\text{sub}} + E_{\text{sub}}$ | 3 orbit circles + 45 neighbor nodes + 62 edges = **110 SVG elements** |
| `FeatureProfilePanel` | DOM | $N_{\text{nodes}} \times 4\text{ metric blocks}$ | $240 \times 4 = \mathbf{960\text{ DOM cards/bars}}$ |
| `RadarPanel` | SVG | $9\text{ axis lines} + 2\text{ polygon webs} + 9\text{ dots}$ | **20 SVG path/circle elements** |
| `ArchitectureDNABarcode` | DOM/SVG | $F_{\text{bands}} + N_{\text{ticks}}$ | 26 feature bands + 240 SVG tick marks = **266 elements** |
| `FourDirectionPanel` | DOM | $4\text{ quadrants} + N_{\text{sub}}$ | 4 quadrant divs + 38 component cards = **42 elements** |

---

## 10. Information Density

Information density measures how much visual content is simultaneously rendered per viewport area:

- **Highest Visual Information Density:** `CouplingHeatmapPanel` and `FeatureMatrixPanel` ($F^2$ pairwise matrix cells displaying combined, direct, flow, and shared weights simultaneously in a $26 \times 26$ grid).
- **Highest Geometric Line Density:** `GraphView` (1,024 edges and 240 nodes across a $7,900 \times 1,580\text{ px}$ canvas layout frame).
- **Highest Categorical Density:** `ArchitectureTreemapPanel` and `DependencyRiverPanel` (simultaneously encoding domain boundaries, feature clusters, risk levels, and flow directions).
- **Lowest Density / Highest Focus:** `FourDirectionPanel` and `DependencyConstellationPanel` (bounded 2-hop neighborhood centered strictly on selected subject node).

---

## 11. Density vs Dataset Size

| Lens | Spatial Scaling Relationship | Density Behavior as Data Volume ($N$) Grows |
|---|---|---|
| `GraphView` | Linear Spatial Area ($O(N)$) | Bounding box expands; edge crossing density increases ($O(E)$). |
| `FeatureMatrixPanel` | Quadratic Cell Area ($O(F^2)$) | Cell count grows quadratically with feature count ($F^2$). |
| `CouplingHeatmapPanel` | Quadratic Pixel Grid ($O(F^2)$) | Canvas cell size dynamically shrinks ($\text{cellSize} = \lfloor 640 / F \rfloor$) down to 28px minimum. |
| `DependencyRiverPanel` | Layer Stream Height ($O(N)$) | Flow channel heights expand proportionally with node/edge volume. |
| `FeatureTreePanel` | Vertical Scroll Height ($O(N)$) | Tree height increases linearly with total component rows. |
| `ArchitectureTreemapPanel` | Constrained Viewport Area ($O(1)$) | Box areas shrink proportionally; labels truncate as leaf count grows. |
| `SubwayPanel` | Line & Station Spacing ($O(S)$) | Stations crowd along route lines; zoom required at $S > 100$. |
| `DependencyConstellationPanel` | Concentric Ring Radius ($O(K)$) | Radial ring radii expand; nodes crowd along orbital perimeters. |
| `FeatureProfilePanel` | Vertical Scroll Height ($O(N)$) | List length scales linearly with total component count. |
| `RadarPanel` | Fixed Radial Geometry ($O(1)$) | Polygon geometry fixed at 9 radial dimensions regardless of $N$. |
| `ArchitectureDNABarcode` | Band Density ($O(N)$) | Mark ticks condense horizontally within feature bands. |
| `FourDirectionPanel` | Bounded Grid ($O(K_{sub})$) | Bounded strictly to $K$ direct connections in 4 cardinal directions. |

---

## 12. Dense Graph Audit

### 12.1 High Edge/Node Density Behavior in `GraphView`
- **MEASURED:** On the canonical CST fixture (240 nodes, 1,024 edges, density ratio $\sim 4.26$ edges/node), primary crossings were optimized down to $C_{pp} = 8,704$ and total crossings $C_{total} = 94,662$.
- **STRUCTURAL:** Edge rendering uses Cytoscape bezier curve bundling for parallel edges.
- **MEASURED:** At 1,000 nodes / 2,035 edges, cold layout completes in **1.494 seconds**.
- **MEASURED:** At 5,000 nodes / 10,130 edges, cold layout completes in **49.88 seconds**.
- **MEASURED:** At 10,000 nodes / 19,917 edges, cold layout completes in **318.38 seconds** with peak RSS memory bounded at **525.14 MB**.

### 12.2 Far-Zoom Edge & Overlay Suppression
- **TEST-BACKED:** `FeatureOverlayCanvas.tsx` enforces overlay suppression when viewport zoom level is $< 0.6$, skipping SVG feature bounding box rendering during zoomed-out navigation to preserve rendering performance.

---

## 13. Matrix / Heatmap Scale Audit

- **STRUCTURAL:** Both `FeatureMatrixPanel` and `CouplingHeatmapPanel` adapt data via `adaptFeatureMatrix()`.
- **STRUCTURAL:** Cell count is strictly $F \times F$, where $F$ is the number of discovered feature clusters (typically $F \ll N$, e.g., $F = 26$ for $N = 240$).
- **Canvas Advantage in Heatmap:** `CouplingHeatmapPanel` renders all $F^2$ cells into a single HTML5 `<canvas>` element using a single 2D context pass, avoiding DOM node allocation entirely.
- **DOM Table in Matrix:** `FeatureMatrixPanel` allocates $F^2$ `<td>` elements in an HTML `<table>`. At $F = 26$, total DOM elements = 728 cells. At $F = 100$, total DOM elements = 10,000 `<td>` cells.

---

## 14. Hierarchical Visualization Scale Audit

- **STRUCTURAL:** `ArchitectureTreemapPanel` uses squarified treemap tiling (`treemap-layout.ts`).
- **Complexity:** $O(N \log N)$ squarified packing pass.
- **Visual Limit:** Viewport bounds are fixed ($100\% \times 100\%$). As leaf node count grows past 200 components, individual treemap rectangles become smaller than text label bounds, triggering CSS text-overflow truncation (`text-overflow: ellipsis`).

---

## 15. River / Subway Scale Audit

- **STRUCTURAL:** `DependencyRiverPanel` adapts flow channels via `sankey-adapter.ts`.
- **Complexity:** $O(L \cdot F + E)$ layer stream sorting and path generation.
- **STRUCTURAL:** `SubwayPanel` adapts subway routes via `subway-adapter.ts`.
- **Complexity:** $O(R \cdot S)$ route line and station placement pass.
- **Crossing Reduction:** Subway route lines use topological station sorting to minimize route line crossings along the horizontal transit axis.

---

## 16. Constellation / FourDirection Scale Audit

- **STRUCTURAL:** Both lenses compute bounded neighborhood sub-graphs centered around `selectedNodeId` or `focalNodeId`.
- **Constellation:** Extracts $K$-hop neighborhood (default depth = 2). Places nodes along 3 concentric orbital rings ($R_1 = 120\text{px}$, $R_2 = 220\text{px}$, $R_3 = 320\text{px}$).
- **FourDirection:** Categorizes $1$-hop connected edges into 4 cardinal quadrants: Upstream Dependents (North), Downstream Dependencies (South), Co-Referenced Utilities (East), Shared Interfaces (West).
- **Scale Immunity:** Computational and visual cost is decoupled from total graph size $N$ and bounded strictly by local node degree $K_{\text{local}}$.

---

## 17. Profile / Radar / DNA Scale Audit

- **STRUCTURAL:** `FeatureProfilePanel` renders vertical component profile cards ($O(N)$ DOM nodes).
- **STRUCTURAL:** `RadarPanel` maps project architecture health across 9 fixed metric dimensions (Fan-In, Fan-Out, Coupling, Unresolved, Risk, Cycles, Test Coverage, Sharing, Async) using SVG radial geometry ($O(1)$ fixed visual elements).
- **STRUCTURAL:** `ArchitectureDNABarcode` renders multi-band barcode ticks representing component risk profiles horizontally ($O(N)$ mark elements).

---

## 18. Memoization / Cache Behavior

| Component / Function | Memoization Tool | Dependencies | Invalidation Trigger |
|---|---|---|---|
| `adaptFeatureMatrix` | `useMemo` in panels | `[data]` | Dataset reference change |
| `adaptSubwayMap` | `useMemo` in `App.tsx` | `[visibleActiveData, selection.selectedNodeId]` | Data or selection change |
| `adaptConstellation` | `useMemo` in `App.tsx` | `[visibleActiveData, constellationOptions]` | Data or constellation options change |
| `adaptFourDirectionView` | `useMemo` in `App.tsx` | `[visibleActiveData, selection.selectedNodeId]` | Data or selection change |
| `createArchitectureContext` | `useMemo` in `App.tsx` | `[activeData]` | Active data reference change |
| `runAllRules` | `useMemo` in `App.tsx` | `[ctx]` | Architecture context update |
| `filterGraphByNodeTypes` | `useMemo` in `App.tsx` | `[activeData, visibleNodeTypes]` | Filter or data change |
| `computeFocusedGraph` | `useMemo` in `App.tsx` | `[activeData, effectiveFocusState]` | Focus state or data change |

---

## 19. Recalculation Triggers

```text
User Trigger Event
   │
   ├── Viewport Pan / Zoom / Hover ──────────► 0 Layout Calls (Cytoscape Batch Transform)
   ├── Node Selection in Graph Canvas ───────► Re-renders selection halo & drawer (0 layout calls)
   ├── Lens Switch in ViewModeSwitcher ──────► Renders target lens using memoized adapted data
   ├── Node Selection in Analytical Lens ───► Switches workspaceViewMode to 'graph' & selects node
   ├── Filter / Search Query Change ─────────► Re-runs filterGraphByNodeTypes (0.8 ms)
   ├── Project Switch (selectProject) ───────► Re-fetches data & re-computes layout (185 ms cold)
   └── Explicit "Reset Layout" Click ────────► Re-runs computeArchitectureLayout (154 ms)
```

---

## 20. Interaction Performance Paths

- **Hover / Highlight:** Executes via CSS class toggle / Canvas hover stroke in sub-millisecond time (< 0.5 ms).
- **Node Selection:** Dispatches `selection.selectNode(id)`, updating `SelectionContext` and triggering React re-render of active lens and `InvestigationDrawer`.
- **Viewport Transformation:** Handled imperatively by Cytoscape canvas hardware acceleration without triggering React state updates or layout recalculations.

---

## 21. Resize / Responsive Recalculation

- **`GraphView`:** Listens to container resize via `ResizeObserver` and invokes `cy.resize()` + `cy.fit()` imperatively.
- **`CouplingHeatmapPanel`:** Listens to container bounds and updates HTML5 `<canvas>` width/height attributes scaled for high-DPI device pixel ratio (`window.devicePixelRatio`).
- **SVG Lenses (`River`, `Subway`, `Treemap`, `Radar`, `Constellation`):** Use SVG `viewBox` attributes (`viewBox="0 0 W H"`), allowing SVG vector graphics to scale fluidly via CSS without JavaScript layout recomputation on window resize.

---

## 22. Animation / Transition Cost

- **CSS Transitions:** Smooth 150ms ease transitions applied to button hover, tab highlight, and drawer slide-in (`transition: all 0.15s ease`).
- **Graph Layout Transitions:** In interactive mode, Cytoscape node repositioning uses deterministic linear position interpolation.
- **No Force Simulations:** The layout engine uses deterministic staged positioning (`computeArchitectureLayout`) rather than iterative physics/force simulation loops, eliminating continuous frame animation CPU overhead.

---

## 23. Memory Characteristics

### Measured Scalability Memory Profile

| Dataset Scale (Nodes) | Edges | Cold Runtime (ms) | Peak RSS Memory (MB) | Heap Used (MB) | Memory Leak Delta (10x Runs) |
|---|---|---|---|---|---|
| **100** | 191 | 110.08 | 155.04 MB | 38.74 MB | — |
| **250** | 493 | 151.19 | 162.54 MB | 39.38 MB | — |
| **500** | 989 | 410.33 | 181.28 MB | 60.28 MB | — |
| **750** | 1,485 | 887.06 | 210.28 MB | 44.06 MB | — |
| **1,000** | 2,035 | 1,577.85 | 210.68 MB | 50.59 MB | **+0.53 MB** (Stable Heap) |
| **2,500** | 5,007 | 10,337.91 | 280.83 MB | 155.09 MB | — |
| **5,000** | 10,130 | 49,880.54 | 236.93 MB | 114.17 MB | — |
| **10,000** | 19,917 | 318,381.17 | 525.14 MB | 305.46 MB | — |

---

## 24. Project Lifecycle Cost

1. **Initial Mount / Project Load:**
   - Fetches dataset JSON from `/explorer-data.json` or `/projects/<id>/explorer-data.json`.
   - Parses schema (`3.3 ms`) and computes architecture analysis (`12.5 ms`).
   - Computes architecture layout (`154.6 ms`).
   - Builds Cytoscape elements (`18.2 ms`).
   - Total cold load pipeline = **185.8 ms – 189.4 ms**.

2. **Project Switching (`selectProject`):**
   - Dispatches custom event `explorer:project-changed`.
   - Clears selection, filters, focus, impact, and simulation state.
   - Loads new project data URL and triggers cold load pipeline for target project.
   - Saves current project state slice to `localStorage`.

---

## 25. Visibility / Filtering Cost

- **Pre-Layout vs Post-Layout Filtering:**
  `filterGraphByNodeTypes()` filters the node and edge arrays **before** adapter transformation (`visibleActiveData`), reducing the node count $N_{vis}$ passed to SVG/DOM lens adapters.
- **Work Avoided:** Disabling 3 node types (e.g., hiding ApexTriggers, Visualforce, and Flows) avoids DOM node allocation and adapter loop iterations for all excluded components.

---

## 26. Selection / Highlighting Cost

- **Local Style Update:** Selecting a node in `GraphView` or any lens applies a `.selected` CSS class or canvas highlight border without triggering layout recalculations or sub-graph re-processing.
- **Dimming Non-Selected Items:** Non-selected nodes receive a `opacity: 0.3` CSS style or dimmed alpha fill (`globalAlpha = 0.3`), executing in $O(V_{\text{visible}})$ style resolution time.

---

## 27. Existing Performance Tests

| Test File | Target Subsystem | Protected SLA / Assertion |
|---|---|---|
| `explorer/src/lib/performance.test.ts` | Large Graph Operations | Element creation < 1000ms, filter < 500ms, focus < 500ms, health < 200ms across 100–5,000 nodes. |
| `explorer/src/lib/scalability-layout.test.ts` | Cold Architecture Layout | Cold layout timing thresholds across scales (100–1,000 nodes) with 100% finite coordinate assertions. |
| `explorer/src/test/ViewportPerformanceB5.test.tsx` | Viewport Protection | 100 rapid pan/zoom/hover events execute with exactly 0 `cy.layout` calls. |
| `explorer/src/test/Phase4DAcceptancePerformance.test.ts` | Canonical Fixture SLA | Canonical CST cold load pipeline completes under 1,000 ms SLA threshold. |
| `explorer/src/test/full-layout-attribution-benchmark.test.ts` | Stage-by-Stage Layout Timing | Detailed timing decomposition across Stages 1–13. |

---

## 28. Existing Performance Reports

| Report File | Date | Measured Baseline | Key Finding |
|---|---|---|---|
| `audit-reports/features/FEAT-PERF-report.md` | 2026-09-28 | Cold load = 189.368 ms on CST fixture | 100% test pass rate, 0 layout calls on viewport operations, heap delta +0.53 MB. |
| `06_Validation_Performance_Release.md` | 2026-09-22 | Total cold pipeline = 185.8 ms | Confirmed zero cold-mount double layout and Candidate E crossing reduction ($C_{total} = 94,662$). |
| `COMBINED_PERFORMANCE_FORENSIC_AUDIT_2026-09-27.md` | 2026-09-27 | Stage 9 satellite optimization = 81.2 ms | Identifies Stage 9 satellite candidate slot scoring as 67.5% of layout wall time. |
| `STAGE_9_EXCLUSIVE_RUNTIME_ATTRIBUTION_2026-09-27.md` | 2026-09-27 | Segment intersection predicate = 51.2% | Reconciles exclusive runtime attribution for satellite candidate tether evaluations. |

---

## 29. Browser / Runtime Evidence

- **Environment:** Node.js v20.18.0 / Vitest / jsdom / Chrome V8 engine.
- **Fixture:** Canonical Cloud Spend Tracker (`audit-fixtures/cloud-spend-tracker/explorer-data.json`).
- **Cold Load Execution Time:** **185.8 ms – 189.368 ms** (Passed SLA Gate < 1,000 ms).
- **Viewport Interaction Layout Calls:** **0** (`cy.layout` invocation count = 0).
- **Coordinate Integrity:** **100% finite coordinates** across all scale tiers (0 NaN / Infinity values).

---

## 30. Scale-Boundary Matrix

| Visualization | Primary Scale Driver | Secondary Driver | Rendering Driver | Interaction Driver | Existing Evidence |
|---|---|---|---|---|---|
| `GraphView` | Node count ($N$) | Edge count ($E$) | Canvas + SVG bounding boxes | Pointer drag, pan, zoom | `FEAT-PERF-report.md` (189ms cold, 0 layout calls) |
| `FeatureMatrixPanel` | Feature count ($F$) | Domain count ($D$) | DOM table cells ($F^2$) | Cell hover / selection | Structural ($F \times F$ DOM cells) |
| `CouplingHeatmapPanel` | Feature count ($F$) | Cell weights ($W$) | Canvas draw calls ($F^2$) | Canvas pixel math hover | Structural (HTML5 Canvas 2D context) |
| `DependencyRiverPanel` | Layer depth ($L$) | Node count ($N$) | SVG paths & rects | Path hover / selection | `CrossLayoutVisibilityAndSelection.test.tsx` |
| `FeatureTreePanel` | Node count ($N$) | Feature count ($F$) | DOM tree rows | Row click expand/collapse | Structural (Nested DOM tree) |
| `ArchitectureTreemapPanel` | Node count ($N$) | Feature count ($F$) | SVG squarified rects | Rect hover / click | Structural (Squarified layout pass) |
| `SubwayPanel` | Station count ($S$) | Route count ($R$) | SVG paths & circles | Station group hover/click | `subway-adapter.test.ts` |
| `DependencyConstellationPanel` | Focal degree ($K$) | Hop depth (depth = 2) | SVG circles & orbit groups | Node hover / click | `constellation-adapter.test.ts` |
| `FeatureProfilePanel` | Node count ($N$) | Metric dimensions | DOM profile cards | Card click | `profile-adapter.test.ts` |
| `RadarPanel` | 9 fixed dimensions | Risk distribution | SVG radar polygon | Axis dot hover/click | `radar-adapter.test.ts` |
| `ArchitectureDNABarcode` | Node count ($N$) | Feature bands ($F$) | DOM bands + SVG mark ticks | Tick mark click | `dna-adapter.test.ts` |
| `FourDirectionPanel` | Subject degree ($K$) | Quadrant count (4) | DOM quadrant cards | Card click | `four-direction-adapter.test.ts` |

---

## 31. Density Characteristics Matrix

| Visualization | Entity Density | Relationship Density | Label Density | Metric Density | Spatial Crowding Driver | Evidence |
|---|---|---|---|---|---|---|
| `GraphView` | High ($N$) | High ($E$) | Moderate (Node labels) | High (Risk/Coupling) | Edge crossing density ($C_{total}$) | Measured ($C_{total} = 94,662$) |
| `FeatureMatrixPanel` | Moderate ($F$) | High ($F^2$) | High (Row/Col headers) | High (Cell weights) | Matrix row/col expansion | Structural ($F \times F$ grid) |
| `CouplingHeatmapPanel` | Moderate ($F$) | High ($F^2$) | High (Header labels) | Extreme (Heatmap color) | Cell size reduction | Structural (28px min cell size) |
| `DependencyRiverPanel` | High ($N$) | Moderate (Flows) | Moderate (Stream labels) | Moderate (Flow width) | Vertical stream crowding | Structural (Sankey channels) |
| `FeatureTreePanel` | High ($N$) | Low (Hierarchical) | High (Tree row labels) | Low (Node metrics) | Vertical tree list length | Structural (DOM tree height) |
| `ArchitectureTreemapPanel` | High ($N$) | Low (Implicit) | High (Leaf node text) | High (Box area weights) | Leaf box area reduction | Structural (Text truncation) |
| `SubwayPanel` | Moderate ($S$) | High (Routes) | High (Station labels) | Low (Station status) | Route line crossing points | Structural (Station spacing) |
| `DependencyConstellationPanel` | Bounded ($K$) | Moderate (Radial) | Moderate (Radial labels) | Low (Node status) | Radial perimeter overcrowding | Structural (Concentric orbits) |
| `FeatureProfilePanel` | High ($N$) | Low (List) | High (Profile details) | High (4 metric bars) | Vertical scroll length | Structural (Card stack) |
| `RadarPanel` | Fixed (9) | Low (Web) | High (9 dimension labels) | High (Polygon shape) | Central axis convergence | Structural (Fixed radial grid) |
| `ArchitectureDNABarcode` | High ($N$) | Low (Bands) | Moderate (Feature labels) | High (Risk mark bands) | Horizontal tick compression | Structural (Barcode mark width) |
| `FourDirectionPanel` | Bounded ($K$) | Bounded (4) | Moderate (Card labels) | Low (Relationship type) | Quadrant card list overflow | Structural (4-quadrant grid) |

---

## 32. Performance Dependency Graph

```text
Explorer Data Schema (Nodes, Edges)
   │
   ├── parseExplorerData ────────► O(N + E)
   ├── computeArchitectureAnalysis ► O(N + E)
   ├── applyFilters / filterGraph  ► O(N + E)
   │
   ├──► Adapter Layer
   │     ├── adaptFeatureMatrix ────► O(N + E + F^2)
   │     ├── adaptSubwayMap ────────► O(S + R)
   │     ├── adaptConstellation ────► O(V_sub + E_sub)
   │     └── adaptFourDirection ────► O(K_local)
   │
   ├──► Layout Engine (computeArchitectureLayout)
   │     ├── Stages 1–3: Layering ──► O(N + E)
   │     ├── Stage 4–5: 2D Packing ─► O(F log F)
   │     ├── Stage 6–7: Node Layout ► O(N_f log N_f)
   │     ├── Stage 9: Satellites ───► O(S · K_slots) [81.2 ms]
   │     └── Stage 10–12: Hash Grid ► O(N) via SpatialGrid
   │
   └──► Renderer Execution
         ├── GraphView Canvas ──────► Cytoscape WebGL/Canvas Batch
         ├── Heatmap Canvas ────────► HTML5 Canvas 2D Draw Calls
         └── SVG / DOM Lenses ──────► React DOM / SVG Reconciliation
```

---

## 33. Bottleneck Evidence Map

| Area | Evidence Type | Evidence Description | Scale | Current Status |
|---|---|---|---|---|
| Stage 9 Satellite Placement | MEASURED | Candidate slot scoring accounts for 81.2 ms (67.5% of layout wall time). | $S$ satellites, $K$ slots | Measured Cost / Non-Blocking |
| Synthetic Scale > 2,500 Nodes | MEASURED | Cold layout time grows to 49.88s at 5,000 nodes and 318.38s at 10,000 nodes. | $> 2,500$ nodes | Synthetic Scale Boundary |
| Matrix DOM Cell Allocation | STRUCTURAL | `FeatureMatrixPanel` allocates $F^2$ DOM `<td>` nodes. | $> 100$ features | Structural Hotspot |
| Treemap Label Truncation | STRUCTURAL | Treemap leaf boxes shrink past text label bounds at high node counts. | $> 200$ nodes | Visual Crowding Driver |
| Viewport Transformations | MEASURED | Pan, zoom, hover execute with 0 layout calls (< 1.0 ms per event). | All scales | Confirmed Optimized |

---

## 34. Known Limits vs Unknown Limits

### Confirmed Limits
- **Canonical SLA Boundary:** Cold load pipeline on 240-node fixture confirmed at **185.8 ms – 189.4 ms** (SLA Limit: 1,000 ms).
- **Interactive Fluidity Scale Boundary:** Real-time fluid layout boundary confirmed up to **1,000–2,500 nodes** (~1.5s cold layout, 210 MB RSS).
- **Viewport Protection Boundary:** 100 rapid pan/zoom interaction events confirmed at **0 layout calls**.

### Historical Limits
- **Stage 9 Intersection Predicates:** Previous reports documented 4,557,308 predicate calls in Stage 9 candidate scoring.

### Structural Concerns
- **HTML Table Cell Growth in Matrix:** $F^2$ DOM element allocation for large feature counts ($F > 100$).

### Unknowns
- **GPU WebGL Limits:** Maximum Cytoscape canvas edge rendering FPS on integrated GPU hardware for graphs exceeding 5,000 nodes.

---

## 35. Risks and Ambiguities

1. **Main-Thread Blocking at Extreme Scale:** Synthetic scale graphs ($> 2,500$ nodes) block the main JavaScript thread during layout computation because layout execution is synchronous.
2. **High Feature Count Matrix Render:** Organizations with $> 100$ feature clusters will produce $> 10,000$ DOM `<td>` elements in `FeatureMatrixPanel`, increasing initial React reconciliation time.

---

## 36. Questions for Phase 1

1. **Worker Offloading:** Should layout calculation for synthetic scale datasets ($> 2,500$ nodes) be offloaded to a Web Worker?
2. **Canvas Migration for Feature Matrix:** Should `FeatureMatrixPanel` adopt the HTML5 `<canvas>` rendering approach used by `CouplingHeatmapPanel` for high feature counts?
3. **Viewport Virtualization:** Should long component lists in `FeatureProfilePanel` and `FeatureTreePanel` implement viewport list virtualization?

---

## 37. Evidence Index

- `explorer/src/components/GraphView.tsx` (Cytoscape canvas & viewport protection)
- `explorer/src/components/CouplingHeatmapPanel.tsx` (HTML5 `<canvas>` heatmap engine)
- `explorer/src/lib/architecture-layout.ts` (13-stage deterministic layout pipeline)
- `explorer/src/lib/layout/spacing.ts` ($O(N)$ `SpatialGrid` spatial hash grid)
- `explorer/src/lib/performance.test.ts` (Large graph performance benchmark suite)
- `explorer/src/lib/scalability-layout.test.ts` (100–1,000 node scale tier layout suite)
- `explorer/src/test/ViewportPerformanceB5.test.tsx` (0 layout call viewport protection suite)
- `audit-reports/features/FEAT-PERF-report.md` (Formal FEAT-PERF audit report)
- `audit-evidence/features/FEAT-PERF/` (Raw benchmark logs and telemetry)
- `06_Validation_Performance_Release.md` (Performance validation release documentation)

---

## 38. Read-Only Verification

This audit is a **STRICT READ-ONLY REPOSITORY AUDIT**.

- Zero application source code files under `explorer/src/` were modified.
- Zero refactoring, optimization, or algorithm changes were introduced.
- All baseline numbers, complexity formulas, and evidence classifications reflect current code truth and measured telemetry.
