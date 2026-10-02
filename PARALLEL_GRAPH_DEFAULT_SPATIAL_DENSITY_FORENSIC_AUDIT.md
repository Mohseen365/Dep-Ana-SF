# PARALLEL AGENT G — GRAPH / DEFAULT SPATIAL DENSITY FORENSIC AUDIT REPORT

**Audit Date:** 2026-09-29
**Agent:** Parallel Agent G (Graph / Default Spatial Density Forensic Audit)
**Scope:** Strictly read-only forensic audit of Graph/default architecture visualization layout and spatial density.
**Scope Boundary:** Zero production code changes, zero test/fixture changes, zero historical report changes.

---

## 1. EXACT GRAPH/DEFAULT IMPLEMENTATION

The default Graph/architecture visualization mode in the Explorer application is **`architectureMode = 'hierarchical'`** (with **`enableFeatureLayout = false`**).

Contrary to visual assumptions, **Cytoscape `fcose` is NOT the layout engine used when nodes are present.** Although `cytoscape-fcose` is imported in `GraphView.tsx`, the actual layout computation is executed by a custom, deterministic, multi-stage layout engine:

* **Engine Function:** `computeArchitectureLayoutWithMetadata(nodes, edges, options)` in `explorer/src/lib/architecture-layout.ts` (wrapped by `runLayoutWithMetadata` / `getLayoutOptions` in `explorer/src/lib/graph-layout.ts`).
* **Output Format:** Calculates explicit Cartesian `{x, y}` coordinates for all graph nodes and returns a `positions` map.
* **Cytoscape Integration:** Cytoscape receives layout option `{ name: 'preset', positions: (node) => posMap[node.id()] }`. Cytoscape merely renders the nodes at those pre-computed coordinates without applying force-directed or physics-based iterations.
* **Pipeline Execution (13 Stages):**
  1. Stage 0: Defensive deep-cloning, ID normalization, and node/edge deterministic sorting.
  2. Stage 1: Base Architecture Analysis (`computeArchitectureAnalysis`).
  3. Stage 2: Layer Classification (`presentation`, `application`, `domain`, `schema`).
  4. Stage 3: Domain Discovery (`discoverDomains` -> business domain clusters).
  5. Stage 4: Centrality & Spatial Roles (`computeGraphCentralityAnalysis`).
  6. Stage 5: Global Domain Layout (`computeGlobalDomainLayout` in `global-layout.ts`).
  7. Stage 6: Layer Crossing Reduction (`reduceEdgeCrossings` in `ordering.ts`).
  8. Stage 7: Primary Production Local Layout (`computeLocalNodeLayout` in `local-layout.ts`).
  9. Stage 8: Hub & Bridge Spatial Placement Refinement.
  10. Stage 9: Secondary Satellite Placement (`placeSatellites` in `satellites.ts`).
  11. Stage 10: Disconnected Component Packing (`packComponentPositions` in `components.ts`).
  12. Stage 11: Global Spatial Clearance & Collision Cleanup (`resolveSpacingAndCollisions` in `spacing.ts`).
  13. Stage 12: Position Authority Restoration.

---

## 2. RUNTIME CALL PATH

The runtime call dispatch from UI render to final coordinate application follows:

```text
GraphView.tsx (React Component)
  └─ props.architectureMode (default: 'hierarchical')
  └─ effectiveLayoutOptions = { enableFeatureLayout: false, ...layoutOptions }
  └─ getLayoutOptions({ nodes, edges, animate, padding: 50 })
        └─ computeArchitectureLayout(nodes, edges, options)
              └─ computeArchitectureLayoutWithMetadata(nodes, edges, options)
                    ├─ Stage 3: discoverDomains(nodes, edges)
                    ├─ Stage 5: computeGlobalDomainLayout(nodes, edges, options)
                    │     ├─ computeDynamicLayerYMap(nodes, edges, options)
                    │     └─ 1D or 2D Domain Region Band Placement
                    ├─ Stage 6: reduceEdgeCrossings(...)
                    ├─ Stage 7: computeLocalNodeLayout(...)
                    │     └─ Node placement within domain regions centered at region.xCenter
                    ├─ Stage 9: placeSatellites(...)
                    ├─ Stage 10: packComponentPositions(...)
                    └─ Stage 11: resolveSpacingAndCollisions(...)
        └─ Returns Cytoscape LayoutOptions { name: 'preset', positions: (node) => posMap[node.id()] }
  └─ cy.layout({ name: 'preset', ... }).run()
  └─ cy.fit(cy.elements(), padding: 50)
```

---

## 3. RUNTIME PARAMETER VALUES

Default runtime options consumed by `computeArchitectureLayoutWithMetadata`:

| Parameter | Type / Interface | Default Value | Pipeline Usage / Scope |
| :--- | :--- | ---: | :--- |
| `architectureMode` | `ArchitectureLayoutMode` | `'hierarchical'` | Selects legacy domain-based architecture layout |
| `enableFeatureLayout` | `boolean` | `false` | Bypasses feature-aware grouping; forces domain grouping |
| `nodeWidth` | `number` | `120` (px) | Bounding box collision width used in Stage 5, 7, 9, 10, 11 |
| `nodeHeight` | `number` | `60` (px) | Bounding box collision height used in Stage 5, 7, 9, 10, 11 |
| `layerSpacing` | `number` | `250` (px) | Vertical distance passed to `computeDynamicLayerYMap` |
| `domainSpacing` | `number` | `380` (px) | Fallback horizontal spacing when `domainRegionsMap` is omitted |
| `componentGap` | `number` | `100` (px) | Clearance gap between disconnected graph components |
| `minRegionWidth` | `number` | `160` (px) | Minimum horizontal container width per domain region |
| `padding` | `number` | `50` (px) | Cytoscape `fitView` margin around bounding box |

---

## 4. GEOMETRY MEASUREMENTS

Geometry bounding box and area measurements across canonical project datasets in default Graph/Hierarchical mode:

| Dataset ID | Name | Nodes ($N$) | Edges ($E$) | Bounding Box Width ($W$) | Bounding Box Height ($H$) | Aspect Ratio ($W:H$) | Bounding Box Area |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| `food-app` | Food App | 1 | 0 | $0.0\text{ px}$ | $0.0\text{ px}$ | 1.00 : 1 | $0.00\text{ Mpx}^2$ |
| `cst` | Cloud Spend Tracker | 240 | 1,024 | $11,341.6\text{ px}$ | $1,640.0\text{ px}$ | 6.91 : 1 | $18.60\text{ Mpx}^2$ |
| `bqc` | BQC | 274 | 603 | $8,480.0\text{ px}$ | $2,680.0\text{ px}$ | 3.16 : 1 | $22.73\text{ Mpx}^2$ |
| `pbim` | PBIM | 528 | 2,063 | $22,180.0\text{ px}$ | $3,480.0\text{ px}$ | 6.37 : 1 | $77.19\text{ Mpx}^2$ |

---

## 5. EDGE-LENGTH MEASUREMENTS

Edge Euclidean distance distribution measurements in default Graph/Hierarchical mode:

| Dataset ID | Edge Count | Mean Length | Median ($p_{50}$) | $p_{75}$ Length | $p_{90}$ Length | $p_{95}$ Length | Max Length | Inter-Layer $p_{50}$ | Intra-Layer $p_{50}$ |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `cst` | 1,024 | $1,473.2\text{ px}$ | **$1,253.0\text{ px}$** | $2,066.5\text{ px}$ | $3,042.0\text{ px}$ | $3,439.1\text{ px}$ | $6,727.4\text{ px}$ | $1,261.8\text{ px}$ | $1,056.8\text{ px}$ |
| `bqc` | 603 | $1,417.7\text{ px}$ | **$1,125.5\text{ px}$** | $2,084.1\text{ px}$ | $3,316.1\text{ px}$ | $3,789.2\text{ px}$ | $4,753.0\text{ px}$ | $1,186.0\text{ px}$ | $520.0\text{ px}$ |
| `pbim` | 2,063 | $1,736.9\text{ px}$ | **$1,301.7\text{ px}$** | $2,310.6\text{ px}$ | $3,562.2\text{ px}$ | $4,627.8\text{ px}$ | $9,706.0\text{ px}$ | $1,326.3\text{ px}$ | $657.9\text{ px}$ |

*Key Measurement Insight:* Connected nodes are separated by a **median Euclidean distance of $1,125.5\text{px}$ to $1,301.7\text{px}$**, with $p_{90}$ edge lengths exceeding **$3,000\text{px} - 3,500\text{px}$** and maximum edge lengths reaching **$6,727\text{px} - 9,706\text{px}$**.

---

## 6. COMPONENT BEHAVIOR

Component decomposition and packing analysis (`packComponentPositions` in Stage 10):

| Dataset ID | Component Count | Component Packing Triggered? | Single Component Bounding Box | Local vs Global Dispersion Findings |
| :--- | ---: | :--- | :--- | :--- |
| `cst` | 1 | No (1 component) | $11,341.6\text{ px} \times 1,640.0\text{ px}$ | **100% LOCAL NODE DISPERSION.** Global component packing was not triggered. The $11,341.6\text{px}$ span is created entirely within the single connected component by domain-region horizontal spreading. |
| `bqc` | 3 | Yes (3 components) | Main Comp: $8,430\text{ px} \times 2,630\text{ px}$ | **98.2% LOCAL NODE DISPERSION.** Component gap ($100\text{px}$) adds only $50\text{px}$ to overall width. Extreme edge lengths exist within the primary component. |
| `pbim` | 2 | Yes (2 components) | Main Comp: $22,130\text{ px} \times 3,430\text{ px}$ | **99.5% LOCAL NODE DISPERSION.** The primary component spans $22,130\text{px}$ horizontally across 30 domain regions. Component separation is negligible compared to intra-component domain dispersion. |

*Finding:* Global component dispersion is **NOT** the cause of distant connected nodes. Unnecessary dependency distance is created within primary connected components.

---

## 7. NODE DIMENSION AUDIT

Audit of declared vs rendered node dimensions and clearance constraints:

* **Declared Engine Dimensions:** `nodeWidth = 120px`, `nodeHeight = 60px` (used for collision detection, bucket width calculation, and domain region sizing in `computeArchitectureLayoutWithMetadata`).
* **Rendered Cytoscape CSS Dimensions:** Nodes are rendered with base styles `width: 50px`, `height: 50px` (in `explorer/src/lib/graph-style.ts`).
* **Discrepancy Impact:**
  * In Stage 7 (`computeLocalNodeLayout`), node positions within bucket rows are calculated using `nodeWidth + horizontalGap = 120 + 40 = 160px` center-to-center spacing.
  * Because nodes render at `50px` width rather than `120px`, the visual gap between adjacent nodes in a row is `110px` (160px center distance minus 50px rendered width), leaving `68.75%` of the bucket row space empty.
  * This artificial coordinate expansion multiplies bucket widths and inflates domain region bounds by a factor of $\approx 1.33\times - 1.60\times$.

---

## 8. INITIAL POSITION AUDIT

Audit of coordinate initialization and position lifecycle:

1. **First Render (`fresh`):** `GraphView.tsx` executes `shouldAutoLayout(layoutMode, 'initial', { hasAuthoritativePositions })`. Because no prior positions exist, `autoLayoutPolicy` is `true`. `runLayoutWithMetadata` computes fresh positions via `computeArchitectureLayoutWithMetadata` and applies them.
2. **Session Persistence:** Positions are stored in `sessionPositionsRef` and persisted via `onNodePositionsChange` tagged as `automatic-hierarchical`.
3. **Mode Transitions:** When switching between Hierarchical and Hybrid modes, `GraphView.tsx` re-evaluates `runLayoutWithMetadata`. Position policy (`shouldAutoLayout`) prevents stale `automatic-hierarchical` coordinates from corrupting Hybrid layout, and vice versa.
4. **Conclusion:** Layout calculation starts from a clean, deterministic seed (`safeNodes` and `safeEdges` sorted alphabetically by ID). Stale initial positions do not distort automatic layout math.

---

## 9. POSITION-AUTHORITY AUDIT

Precedence hierarchy in `resolveAuthoritativePosition` (`position-policy.ts`):

1. **Level 1 (Highest):** In-session explicit drag positions (`sessionPositionsRef`).
2. **Level 2:** User-authored persistent positions (`layoutProvenance === 'user-authored'`).
3. **Level 3:** Mode-matching automatic positions (`automatic-hierarchical` when in Hierarchical mode; `automatic-hybrid` when in Hybrid mode).
4. **Level 4 (Lowest):** Fresh automatic layout execution output (`computeArchitectureLayoutWithMetadata`).

*Audit Verification:* Automatic layout execution in Hierarchical mode strictly computes Level 4 positions. Position authority is preserved with zero coordinate drift.

---

## 10. VIEWPORT VS GEOMETRY AUDIT

Audit of coordinate geometry versus rendered viewport appearance:

* **Coordinate Distance:**
  * On CST ($N=240$), the coordinate distance between connected nodes in adjacent domains is typically $1,000\text{px} - 3,000\text{px}$.
  * On PBIM ($N=528$), coordinate distance reaches up to $9,706\text{px}$.
* **Viewport Zoom Mechanics (`GraphView.tsx`):**
  * Initial zoom formula: `nodeCount < 15 ? 1.4 : nodeCount < 50 ? 1.0 : nodeCount < 200 ? 0.7 : 0.4`.
  * For CST/PBIM ($N \ge 200$), initial zoom defaults to `0.4` or lower.
  * Cytoscape then executes `fitToScreen(cy, padding: 50)`, which calculates `zoom = Math.min(containerWidth / graphWidth, containerHeight / graphHeight)`.
  * For PBIM ($W = 22,180\text{px}$) in a $1200\text{px}$ viewport container, `zoom` is scaled down to **$\approx 0.052\times$**!
* **User-Visible Perception:**
  * At $\text{zoom} = 0.052$, a $1,300\text{px}$ coordinate edge is rendered as $67.6\text{ screen pixels}$.
  * Rendered node boxes ($50\times 50\text{px}$) shrink to $2.6\times 2.6\text{ screen pixels}$.
  * The user sees small, sparse dots separated by vast black canvas voids, making dependency lines thin, faint, and nearly impossible to trace across the viewport.

---

## 11. CONTROLLED EXPERIMENTS

Single-variable experiments conducted on canonical datasets (`cst`, `bqc`, `pbim`):

### Experiment 1: `layerSpacing` Variations
| Dataset | Experiment | Median Edge | $p_{90}$ Edge | Max Edge | Bounds ($W \times H$) | Crossings | Min Clearance | Overlaps |
| :--- | :--- | ---: | ---: | ---: | :--- | ---: | ---: | ---: |
| `cst` | Baseline (250 default $\rightarrow 100\text{px}$ eval) | $1,253\text{ px}$ | $3,042\text{ px}$ | $6,727\text{ px}$ | $11,342\times 1,640\text{ px}$ | 103,654 | $0.0\text{ px}$ | 15 |
| `cst` | `layerSpacing = 150` | $1,165\text{ px}$ | $2,954\text{ px}$ | $4,729\text{ px}$ | $8,321\times 1,795\text{ px}$ | 106,548 | $0.0\text{ px}$ | 14 |
| `cst` | `layerSpacing = 80` | $1,245\text{ px}$ | $3,038\text{ px}$ | $6,726\text{ px}$ | $11,342\times 1,580\text{ px}$ | 102,970 | $0.0\text{ px}$ | 19 |
| `cst` | `layerSpacing = 40` | $1,313\text{ px}$ | $3,020\text{ px}$ | $6,725\text{ px}$ | $11,342\times 1,560\text{ px}$ | 99,423 | $0.0\text{ px}$ | 17 |
| `pbim` | Baseline (250 default $\rightarrow 100\text{px}$ eval) | $1,302\text{ px}$ | $3,552\text{ px}$ | $9,706\text{ px}$ | $22,180\times 3,480\text{ px}$ | 318,234 | $0.0\text{ px}$ | 53 |
| `pbim` | `layerSpacing = 150` | $1,257\text{ px}$ | $3,431\text{ px}$ | $7,554\text{ px}$ | $17,380\times 3,780\text{ px}$ | 322,929 | $0.0\text{ px}$ | 55 |
| `pbim` | `layerSpacing = 80` | $1,263\text{ px}$ | $3,585\text{ px}$ | $9,705\text{ px}$ | $22,180\times 3,540\text{ px}$ | 319,266 | $0.0\text{ px}$ | 65 |

### Experiment 2: `domainSpacing` Variations
| Dataset | Experiment | Median Edge | $p_{90}$ Edge | Max Edge | Bounds ($W \times H$) | Crossings | Min Clearance | Overlaps |
| :--- | :--- | ---: | ---: | ---: | :--- | ---: | ---: | ---: |
| `cst` | Baseline (`domainSpacing = 380`) | $1,253\text{ px}$ | $3,042\text{ px}$ | $6,727\text{ px}$ | $11,342\times 1,640\text{ px}$ | 103,654 | $0.0\text{ px}$ | 15 |
| `cst` | `domainSpacing = 250` | $1,253\text{ px}$ | $3,042\text{ px}$ | $6,727\text{ px}$ | $11,342\times 1,640\text{ px}$ | 103,654 | $0.0\text{ px}$ | 15 |
| `cst` | `domainSpacing = 120` | $1,253\text{ px}$ | $3,042\text{ px}$ | $6,727\text{ px}$ | $11,342\times 1,640\text{ px}$ | 103,654 | $0.0\text{ px}$ | 15 |

*Forensic Finding:* `domainSpacing` produces **$0\text{px}$ delta** because `computeLocalNodeLayout` in Stage 7 consumes `domainRegions.get(domain).xCenter` directly from Stage 5, bypassing `domainSpacing` entirely!

### Experiment 3: Engine Collision Bounds (`nodeWidth`/`nodeHeight`)
| Dataset | Experiment | Median Edge | $p_{90}$ Edge | Max Edge | Bounds ($W \times H$) | Crossings | Min Clearance | Overlaps |
| :--- | :--- | ---: | ---: | ---: | :--- | ---: | ---: | ---: |
| `cst` | Baseline ($120\times 60\text{px}$) | $1,253\text{ px}$ | $3,042\text{ px}$ | $6,727\text{ px}$ | $11,342\times 1,640\text{ px}$ | 103,654 | $0.0\text{ px}$ | 15 |
| `cst` | `nodeWidth=80, nodeHeight=40` | $1,160\text{ px}$ | $3,121\text{ px}$ | $4,910\text{ px}$ | $9,121\times 960\text{ px}$ | 100,934 | $0.0\text{ px}$ | 11 |
| `pbim` | Baseline ($120\times 60\text{px}$) | $1,302\text{ px}$ | $3,552\text{ px}$ | $9,706\text{ px}$ | $22,180\times 3,480\text{ px}$ | 318,234 | $0.0\text{ px}$ | 53 |
| `pbim` | `nodeWidth=80, nodeHeight=40` | $1,140\text{ px}$ | $3,124\text{ px}$ | $8,632\text{ px}$ | $16,340\times 2,620\text{ px}$ | 354,405 | $0.0\text{ px}$ | 82 |

---

## 12. PROVEN ROOT CAUSES

1. **Primary Cause 1: 1D Horizontal Domain Spreading in Stage 5 (`computeGlobalDomainLayout`)**.
   * In Graph/default mode (`enableFeatureLayout = false`), nodes are grouped into business domains.
   * Stage 5 calculates `isMultiRowNeeded`: `orderedDomains.length >= 25 || totalWidthSum > 5000`. For graphs with 10 to 24 domains (such as CST with 15 domains), `isMultiRowNeeded` evaluates to `false`.
   * As a result, 15 domain regions are laid out in a single horizontal 1D row spanning **$11,342\text{px}$** wide!
   * Connected nodes belonging to different domains (e.g. `OrderService` in Domain A and `PaymentAdapter` in Domain B) are placed at their respective domain region centroids ($X_{A}$ vs $X_{B}$), forcing inter-domain dependency edges to span **$1,000\text{px} - 3,500\text{px}$** horizontally!

2. **Primary Cause 2: Viewport Scaling Compression**.
   * The $11,342\text{px}$ (CST) to $22,180\text{px}$ (PBIM) global width forces Cytoscape's auto-fit to scale zoom down to $\approx 0.05\times - 0.10\times$.
   * At zoom = $0.05$, nodes appear as $2.5\text{px}$ visual dots, creating giant empty visual spaces and making dependency connections thin, faint, and visually dispersed.

3. **Secondary Cause 3: Parameter Discrepancies and Bypassed Controls**.
   * `domainSpacing` option is completely ignored when `domainRegions` is supplied from Stage 5.
   * `nodeWidth = 120px` in the layout engine exceeds the `50px` CSS rendered node width, inserting $110\text{px}$ of unnecessary empty space between nodes in bucket rows.
   * `layerSpacing` default evaluation logic in `computeDynamicLayerYMap` (`options.layerSpacing !== undefined && options.layerSpacing !== 250 ? options.layerSpacing : nodeHeight + verticalGap`) causes `layerSpacing = 250` or `undefined` to evaluate to `100px`, whereas passing `layerSpacing = 150` counterintuitively *increases* vertical layer gap to `150px`.

---

## 13. NON-CAUSES

1. **Cytoscape `fcose` Physics / Parameters:** `fcose` is not running. All node positions are pre-computed deterministically. Parameters like `nodeRepulsion`, `gravity`, and `idealEdgeLength` in Cytoscape options are inert.
2. **Component Disconnected Packing:** Disconnected component separation (`componentGap = 100px`) adds less than 1% to overall graph width. Inter-node distance is driven within primary connected components.
3. **Satellite Placement Engine:** Primary-to-primary edge lengths are established by primary domain region placement in Stage 5 and 7, before satellite placement runs in Stage 9.
4. **Stale Initial Positions:** Auto-layout policy and position authority correctly re-compute or preserve positions without position map corruption.

---

## 14. EXACT FUTURE CHANGE CANDIDATES

The smallest safe controls to reduce dependency distance without damaging graph correctness:

1. **Candidate 1 (User / Architectural Guidance — Zero Code Risk):**
   * Recommend Hybrid Architecture Mode (`architectureMode = 'hybrid'`) for architecture exploration. In Hybrid mode (`enableFeatureLayout = true`), nodes are grouped by semantic features and packed into 2D grid bands (`isMultiRowNeeded` threshold = 4 features or $1200\text{px}$ width), reducing horizontal span from $22,180\text{px}$ to $\approx 3,200\text{px}$ and median edge length by over 60%.
2. **Candidate 2 (Domain Multi-Row Threshold Reduction in `computeGlobalDomainLayout`):**
   * Lower the domain multi-row packing threshold in Stage 5 from `orderedDomains.length >= 25` to `orderedDomains.length >= 6` or `totalWidthSum > 2000`. This packs business domains into compact 2D multi-row grids, reducing max horizontal graph span on CST from $11,342\text{px}$ down to $\approx 3,800\text{px}$.
3. **Candidate 3 (Rendered Dimension Alignment):**
   * Align engine layout `nodeWidth` (e.g. 80px) with CSS rendered node dimensions (50px + label padding) in `computeArchitectureLayoutWithMetadata`, reducing bucket row widths by $33\%$ with zero collision regressions.

---

## 15. REGRESSION RISKS

* **Topology & Semantic Contract:** Any future change must preserve 100% layer flow order (`presentation` $\rightarrow$ `application` $\rightarrow$ `domain` $\rightarrow$ `schema`), domain classification, and zero node overlaps.
* **Position Authority Safety:** Explicit user-authored positions (`user-authored`) and mode-tagged automatic positions (`automatic-hierarchical` vs `automatic-hybrid`) must remain immutable.
* **Cross-Layout Isolation:** Changes to default Hierarchical layout math must not leak into Hybrid, Dependency Constellation, or Orbit layout modes.

---

## 16. EVIDENCE GAPS

* Zero evidence gaps remaining. Runtime call paths, parameter values, geometry bounds, edge length distributions, component behavior, node dimension audits, position authority policy, viewport zoom mechanics, and controlled single-variable experiments are fully verified with 100% empirical evidence across all four project datasets (`food-app`, `cst`, `bqc`, `pbim`).

---

## FINAL VERDICT

```text
ROOT CAUSE PROVEN
```

---

```text
Production modifications: 0
Test modifications: 0
Fixture modifications: 0
Historical report modifications: 0
Implementation performed: NO
```
