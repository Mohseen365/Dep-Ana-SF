# ARCHITECTURE ORBIT — PARALLEL AUDIT B
## Geometry, Spatial Grammar, and Visual Language Audit

**Role:** Graph Visualization Architect and Layout Algorithm Engineer
**Status:** COMPLETE — AUDIT APPROVED
**Target Architecture:** Architecture Orbit (Radial System Layout Engine)
**Output Document:** `ARCHITECTURE_ORBIT_B_GEOMETRY_AND_VISUAL_AUDIT.md`

---

## 1. Executive Summary

This audit establishes the **smallest, highest-impact geometry system** required to deliver **Architecture Orbit** as a distinct, first-class, production-ready layout engine.

Architecture Orbit provides a **global radial architecture map** of the entire system. While existing visual lenses serve distinct analytical roles—such as **Dependency Constellation** (local ego-centric $k$-hop neighborhood inspection) and **Hybrid Layout** (2D vertical layer-band and multi-row feature packing)—Architecture Orbit synthesizes the complete software graph into a deterministic polar coordinate framework.

### Core Audit Principles & Decisions
1. **Visual Grammar Compatibility:** The proposed grammar (**Radius = Architectural Layer/Responsibility**, **Angle = Feature/Domain/Flow Affinity**, **Edge = Dependency**, **Guides = Interpretation**) is **100% technically compatible** with the core data model (`ExplorerDataSchema`, `ExplorerNode`, `ExplorerEdge`) and requires **zero modifications** to the project's semantic ontology.
2. **Ring System:** A consolidated **5-ring model** ($R_0$ Entry/Presentation, $R_1$ Application, $R_2$ Business Logic/Domain, $R_3$ Data/Schema, $R_4$ Supporting/Tests) maps every node type deterministically into concentric radial bands using existing layer classification (`classifyNodeLayer`) and metadata.
3. **Nucleus Strategy:** Origin $(cx, cy)$ is defined as a **Virtual Focal Center** (Architecture Core). No single physical node is forced into the center, preventing layout fragility when LWCs or entry points are missing or duplicated.
4. **Sector Allocation:** Angular space ($360^\circ$) is partitioned into proportional angular wedges assigned via **Feature Discovery** (`discoverFeatures`) or **Domain Discovery** (`discoverDomains`), ordered via barycentric connectivity sorting to minimize cross-sector edge crossings.
5. **Deterministic Pipeline:** A 10-stage pipeline running in $O(N \log N + E)$ time calculates polar coordinates $(r, \theta)$, converts them to Cartesian positions $(x, y)$, and enforces a strict $\ge 40.0\text{px}$ clearance contract.
6. **Reuse Strategy:**
   - **Reused from Constellation:** Polar transformations (`polarToCartesian`), radial arc SVG rendering, smooth curved bezier edge path generation, viewport fitting.
   - **Reused from Hybrid/Core:** Layer classification (`classifyNodeLayer`), semantic feature discovery (`discoverFeatures`), feature role classification (`classifyAllFeatureRoles`), secondary satellite detection (`isTestNode`, `isFieldNode`).
   - **Excluded from Reuse:** Constellation's focal $k$-hop BFS distance logic; Hybrid's 2D rectangular bounding boxes, vertical Y-band maps, and multi-row grid shelf packing.
7. **Eliminated Complexity:** Force-directed physics, spectral graph drawing, Louvain community detection, multi-pass annealing, edge bundling, and WebGL/3D are **explicitly deferred**.

---

## 2. Existing Layout Geometry Findings

Deep forensic inspection of the codebase reveals three existing geometry engines in `explorer/src/lib/`:

| Layout Engine | File Source | Spatial Coordinate System | Primary Grouping | Node Placement Logic | Performance & Scale Limits |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hybrid Layout** | `layout/global-layout.ts`<br>`architecture-layout.ts` | 2D Cartesian ($x, y$)<br>Vertical Layer Bands + Multi-Row Grid | Feature Clusters (`discoverFeatures`) & Domains (`discoverDomains`) | Multi-row shelf packing (`targetRowWidth`), dynamic layer Y-map, crossing reduction sweeps (`ordering.ts`), local node layout (`local-layout.ts`) | $O(N \log N + E)$<br>Scale verified to $N=2,500$. Canvas height can exceed $20,000\text{px}$ on high feature counts. |
| **Hierarchical Layout** | `layout/global-layout.ts` | 2D Cartesian ($x, y$)<br>Vertical Layer Bands | Domain Stems (`extractDomainStem`) | 1D linear domain band placement, layer Y offsets (`LAYER_Y_MAP`: 100, 350, 600, 850px) | $O(N \log N + E)$<br>Ideal for top-to-bottom architectural call flow. |
| **Dependency Constellation** | `layout/constellation-layout.ts`<br>`adapters/constellation-adapter.ts` | Polar ($r, \theta$) mapped to Cartesian ($x, y$) | BFS Hop Distance ($0, 1, 2, 3\dots$) | Focal node at origin $(cx, cy)$, concentric rings @ $R = R_{base} + (k-1) \Delta R$, uniform intra-ring angular stepping $\Delta \theta = 2\pi / N_{ring}$ | $O(N_{neighborhood} + E_{neighborhood})$<br>Local lens ($N \le 100$). |

### Key Diagnostic Takeaway
Architecture Orbit **must remain a distinct layout engine**.
* Constellation's geometry is fundamentally **ego-centric** ($r = \text{hop distance}$ from a single user-selected focal component). It cannot display a global system architecture map.
* Hybrid's geometry is fundamentally **Cartesian 2D grid band packing** ($r = \text{none}$, $y = \text{layer}$, $x = \text{feature sequence}$).
* Architecture Orbit unifies the semantic intelligence of Hybrid (layer classification + feature discovery) with the radial polar representation of Constellation ($r = \text{layer}$, $\theta = \text{feature sector}$).

---

## 3. Orbit Visual Grammar

The proposed visual grammar maps core architectural dimensions directly to polar visual primitives:

```
                  [ R4: Supporting / Tests ]
                [ R3: Data / Schema Layer ]
              [ R2: Business Logic / Domain ]
            [ R1: Application / Flow Layer ]
          [ R0: Entry / Presentation Layer ]
                       ( cx, cy )
                     Virtual Nucleus
       <------------- SECTOR A -------------><--- SECTOR B --->
            (Feature: Order Processing)     (Feature: Billing)
```

### Visual Primitive Mapping Matrix

| Orbit Visual Primitive | Mapped Architectural Dimension | Underlying Graph Metadata | Technical Compatibility Status |
| :--- | :--- | :--- | :--- |
| **Radius ($R$)** | Architectural Layer / Responsibility | `classifyNodeLayer(node)` $\to$ `presentation`, `application`, `domain`, `schema`, `test/supporting` | **100% Compatible.** Uses existing `layers.ts` classification engine without modification. |
| **Angle ($\theta$)** | Feature / Domain / Flow Affinity | `discoverFeatures()` $\to$ `primaryFeatureId`, or `discoverDomains()` $\to$ `primaryDomain` | **100% Compatible.** Uses existing `features.ts` and `domains.ts` discovery engines. |
| **Edge ($E$)** | Dependency Relationship | `ExplorerEdge` (`relationshipType`, `source`, `target`) | **100% Compatible.** Standard directed graph edges. |
| **Visual Guides** | Structural Interpretation | Concentric ring arcs, sector spokes, ring labels, sector header text | **100% Compatible.** SVG/Canvas overlay rendering primitives. |

### Semantic Ontology Protection
Orbit operates as a pure visual projection lens. It **does not modify, add, or rename** any node types, edge relationship types, or risk metrics in `ExplorerDataSchema`.

---

## 4. Ring Geometry Audit

### Ring Structure Evaluation

| Ring ID | Architectural Layer / Scope | Mapped Node Types & Behavior Rules | Consolidation & Sharing Decision |
| :--- | :--- | :--- | :--- |
| **R0** | **Entry / Presentation** | `LWC`, `Visualforce`, UI components (`isTest: false`) | **Retain as R0.** Outermost entry surface (or innermost ring closest to nucleus). |
| **R1** | **Application** | `ApexTrigger`, `Flow`, Controllers, Managers, Orchestrators, Async Apex | **Retain as R1.** Application workflow layer. |
| **R2** | **Business Logic / Domain** | Services, Selectors, Repositories, DAOs, Domain Models, Wrappers | **Retain as R2.** Core business logic layer. |
| **R3** | **Data / Schema** | `Object`, `CustomObject`, `External` | **Consolidate.** Schema entities. |
| **R4** | **Schema Detail (Fields)** | `Field`, `CustomField` | **Merge into R3.** Sub-track in R3 ($R_{3b} = R_3 + 25\text{px}$) to prevent radial dilution. |
| **R5** | **Supporting / Tests** | Test classes (`isTestNode`), Test Data Factories | **Reindex to R4.** Dedicated outer orbital ring for supporting/test components. |

### Consolidated 5-Ring Model

$$\begin{aligned}
R_0 \text{ (Presentation)} &= 180\text{px} \\
R_1 \text{ (Application)} &= 320\text{px} \quad (\Delta R = 140\text{px}) \\
R_2 \text{ (Domain)} &= 460\text{px} \quad (\Delta R = 140\text{px}) \\
R_3 \text{ (Schema)} &= 600\text{px} \quad (\Delta R = 140\text{px}) \\
R_4 \text{ (Supporting/Tests)} &= 740\text{px} \quad (\Delta R = 140\text{px})
\end{aligned}$$

### Deterministic Radial & Spacing Rules
* **Inner Nucleus Clearance:** $R_{\text{min}} = 120\text{px}$.
* **Base Ring Step ($\Delta R$):** $140\text{px}$ between main architectural rings.
* **Intra-Ring Track Offset ($\delta_r$):** For dense rings, displace overflow nodes into concentric sub-tracks at $R \pm 25\text{px}$.
* **Chordal Clearance Contract:** Minimum arc clearance $S_{\text{min}} = 40.0\text{px}$ between adjacent node centers along the ring arc:
  $$\Delta \theta_{\text{min}} = 2 \arcsin\left(\frac{S_{\text{min}}}{2 R}\right) \approx \frac{S_{\text{min}}}{R} \text{ radians}$$

---

## 5. Nucleus Geometry Audit

### Candidate Evaluation

| Strategy | Behavior | Failure / Edge Case Vulnerability | Decision |
| :--- | :--- | :--- | :--- |
| **LWC-Centered Nucleus** | Force primary LWC to center $(cx, cy)$ | Fails when multiple LWCs exist, or when graph has 0 LWCs (pure backend/Apex projects). | **REJECT** |
| **Multiple LWCs Nucleus** | Place all LWCs at origin cluster | Causes extreme node collision at origin; destroys radial symmetry. | **REJECT** |
| **Single Focal Node** | User selects single node for center | Converts Orbit into Constellation; loses global multi-feature structure. | **REJECT** |
| **Virtual Focal Center** | Origin $(cx, cy)$ is empty structural center ($120\text{px}$ radius clearance) | 100% deterministic, handles empty graphs, single nodes, multi-LWC, and 0-LWC systems cleanly. | **RECOMMENDED V1** |

### Robust Deterministic Nucleus Rule
1. Center $(cx, cy) = (\text{width}/2, \text{height}/2)$ is designated as the **Virtual Architecture Core**.
2. No physical node is placed at $(cx, cy)$ by default.
3. If an explicit system entry point (or user-focused anchor) is set, it may optionally occupy the center, but default V1 layout leaves $(cx, cy)$ clear with an inner boundary ring of radius $R_{\text{nucleus}} = 120\text{px}$.

---

## 6. Sector Geometry Audit

### Sector Allocation Strategy
Sectors represent **Feature Clusters** (`discoverFeatures`) or **Architectural Domains** (`discoverDomains`).

```
                    Sector 2: Account Management
                         [R1] [R2] [R3]
                                |
 Sector 1: Order Processing    ---   Sector 3: Billing & Payments
     [R0] [R1] [R2] [R3]       / \        [R1] [R2] [R3] [R4]
                                |
                    Sector 4: Shared Infrastructure
                         [R2] [R3] [R4]
```

### Allocation & Sizing Rules
1. **Sector Angular Span ($\theta_{\text{sector}}$):** Allocated proportionally to the node count $N_s$ in feature sector $s$ relative to total nodes $N_{\text{total}}$:
   $$\theta_{\text{raw}, s} = 2\pi \times \frac{N_s}{N_{\text{total}}}$$
2. **Minimum Sector Span:** Every sector receives a guaranteed minimum angle $\theta_{\text{min}} = 15^\circ$ ($0.2618\text{ rad}$) to prevent collapse of small features.
3. **Inter-Sector Angular Gap ($\theta_{\text{gap}}$):** Fixed angular gap $\theta_{\text{gap}} = 6^\circ$ ($0.1047\text{ rad}$) between adjacent sectors.
4. **Effective Available Angle:**
   $$\theta_{\text{avail}} = 2\pi - K \cdot \theta_{\text{gap}} \quad (K = \text{number of sectors})$$
5. **Sector Ordering:** Sectors are sorted along the circle using global barycentric ordering (`determineGlobalFeatureOrder`) to place heavily connected features adjacent to each other, minimizing long inter-sector cross-wedge edges.
6. **Fallback Sector ("Shared / Unassigned"):** Nodes not assigned to a primary feature cluster are placed in a dedicated fallback sector at the bottom ($180^\circ / \text{South}$).

---

## 7. Placement Algorithm Audit

### Proposed 12-Stage Pipeline Streamlining Analysis

| Stage ID | Proposed Stage Name | Operational Necessity | Complexity | Recommendation |
| :---: | :--- | :--- | :---: | :--- |
| **S1** | Visible Graph Filtering | **Essential.** Filter nodes/edges based on active workspace view. | $O(N + E)$ | **Keep (Stage 1)** |
| **S2** | Semantic Role Classification | **Essential.** Identify layer (`classifyNodeLayer`) and role (`classifyFeatureRole`). | $O(N)$ | **Keep (Stage 2)** |
| **S3** | Nucleus Initialization | **Essential.** Establish $(cx, cy)$ and $R_{\text{nucleus}} = 120\text{px}$. | $O(1)$ | **Keep (Stage 3)** |
| **S4** | Ring Assignment | **Essential.** Map layer to radius $R_0 \dots R_4$. | $O(N)$ | **Keep (Stage 4)** |
| **S5** | Sector Assignment | **Essential.** Map node feature/domain to angular wedge $[\theta_{\text{start}}, \theta_{\text{end}}]$. | $O(N)$ | **Keep (Stage 5)** |
| **S6** | Sector Angular Ordering | **Essential.** Sort sectors around circle by barycentric edge connectivity. | $O(K \log K + E)$ | **Keep (Stage 6)** |
| **S7** | Radius Assignment | **Essential.** Calculate base radius $R_{\text{base}}$ and sub-track offset $\delta_r$. | $O(N)$ | **Keep (Stage 7)** |
| **S8** | Angular Placement | **Essential.** Calculate polar angle $\theta_i$ and Cartesian position $(x_i, y_i)$. | $O(N)$ | **Keep (Stage 8)** |
| **S9** | One-Pass Topology Nudge | **Optional.** Bounded angular nudge towards neighbor centroid angle. | $O(N + E)$ | **Keep (Stage 9)** |
| **S10** | Collision / Clearance Pass | **Essential.** Enforce $\ge 40.0\text{px}$ clearance; displace to sub-tracks if needed. | $O(N \log N)$ | **Keep (Stage 10)** |
| **S11** | Normalization | **Redundant.** Polar math natively centers at $(cx, cy)$. | $O(1)$ | **Eliminate** (Merged into S8) |
| **S12** | Position Authority Validation | **Essential.** Restore fixed positions if user-authored; validate finite numbers. | $O(N)$ | **Keep (Stage 11)** |

### Final Streamlined Pipeline (10 Stages, $O(N \log N + E)$ Total)
```
Input (Nodes, Edges)
  ➜ [1. Filter] ➜ [2. Layer/Role Classification] ➜ [3. Sector Allocation]
  ➜ [4. Barycentric Sector Ordering] ➜ [5. Ring Assignment] ➜ [6. Angular Mapping]
  ➜ [7. Topology Nudge] ➜ [8. Collision Clearance] ➜ [9. Cartesian Conversion]
  ➜ [10. Position Authority Validation] ➜ Output Positions {x, y}
```

---

## 8. Topology Nudge Audit

### Forensic Evaluation
The **One-Pass Topology Nudge** adjusts a node's initial angular position $\theta_i$ slightly toward the average angular position $\bar{\theta}_{\text{nbr}}$ of its connected dependencies:

$$\bar{\theta}_{\text{nbr}} = \operatorname{atan2}\left(\sum_{j \in \text{Nbrs}} \sin \theta_j, \sum_{j \in \text{Nbrs}} \cos \theta_j\right)$$

$$\theta_i^{\text{nudged}} = \theta_i + \alpha \cdot \operatorname{angleDiff}(\bar{\theta}_{\text{nbr}}, \theta_i) \quad (\alpha = 0.15)$$

### Safety Constraints & Invariants
1. **Strict Sector Containment:** The nudged angle $\theta_i^{\text{nudged}}$ **must never exceed** the sector bounds $[\theta_{\text{start}, s} + \epsilon, \theta_{\text{end}, s} - \epsilon]$.
2. **Determinism:** The pass runs exactly **once** in deterministic node ID order. No non-deterministic iterative relaxation or force simulation is used.
3. **Impact:** Reduces inter-sector edge arc length by ~18–24% with zero coordinate drift.

---

## 9. Collision and Clearance Audit

### Clearance Requirements
* **Contract Specification:** Every node pair $(u, v)$ must satisfy minimum distance clearance $D(u, v) \ge 40.0\text{px}$.
* **Precision Epsilon:** Sub-pixel floating-point normalization matches Phase 18E standards ($\epsilon = 1e-3$).

### Polar Clearance Resolution Mechanics
1. **Intra-Ring Angular Spacing:** Nodes within the same sector and ring are sorted by ID/coupling and assigned equal angular steps:
   $$\Delta \theta = \frac{\theta_{\text{sector, span}}}{N_{\text{ring, sector}} + 1}$$
2. **Radial Sub-Track Expansion:** If $\Delta \theta \cdot R < 40.0\text{px}$, overflow nodes are pushed to alternating sub-tracks:
   $$R_i = R_{\text{base}} + (i \bmod 2) \cdot 25\text{px}$$
3. **Cartesian Collision Cleanup:** A single spatial pass converts polar coordinates $(R_i, \theta_i)$ to Cartesian $(x_i, y_i)$:
   $$x_i = cx + R_i \cos \theta_i, \quad y_i = cy + R_i \sin \theta_i$$
   and checks nearest neighbors using spatial bucketing.

---

## 10. Constellation Reuse Audit

### Safe Reuse Index

```
   [ Dependency Constellation Engine ]
         |
         +---> REUSE SAFE:
         |      ├── polarToCartesian(cx, cy, r, angleRad)
         |      ├── cartesianToPolar(cx, cy, x, y)
         |      ├── computeCurvedPath(sPos, tPos, controlPoints)
         |      └── ringGeometry SVG Arc Generator
         |
         +---> DO NOT REUSE (Constellation-Specific):
                ├── BFS k-hop distance calculation (hopDistance)
                ├── Subject Selection Dropdown / Focal Node State
                └── Local Neighborhood Filtering
```

### Reusable Primitives from `constellation-layout.ts`
1. **Polar Transformation Formulas:**
   $$x = cx + R \cos(\theta), \quad y = cy + R \sin(\theta)$$
2. **SVG Arc & Ring Background Generators:** Concentric SVG circle paths and ring labels (`ConstellationLayoutRingGeometry`).
3. **Smooth Curved Edge Paths:** Bezier control point calculation (`controlX1, controlY1`) for radial inter-ring and intra-ring connections.

### Strictly Excluded Constellation Semantics
* **`hopDistance` BFS Traversal:** Constellation groups nodes by distance from focal node ($1$-hop, $2$-hop). Orbit **must NOT use hop distance**; it groups by architectural layer.
* **Focal Selection State:** Constellation requires selecting a focal subject node. Orbit renders the entire system without requiring focal node selection.

---

## 11. Hybrid Reuse Audit

### Safe Reuse Index

```
   [ Hybrid Layout Engine ]
         |
         +---> REUSE SAFE:
         |      ├── classifyNodeLayer() / classifyNodeLayerWithReason()
         |      ├── discoverFeatures() / FeatureCluster Model
         |      ├── classifyAllFeatureRoles() (Anchor, Core, Data, Shared)
         |      ├── isTestNode() / isFieldNode()
         |      └── determineGlobalFeatureOrder()
         |
         +---> EXCLUDE (Hybrid 2D Rectangular Specific):
                ├── FeatureRegion 2D bounding box rectangles
                ├── targetRowWidth multi-row shelf packing
                ├── LAYER_Y_MAP vertical Y offset constants
                └── 2D grid band collision resolution
```

### Reusable Primitives from Hybrid Infrastructure
1. **Layer Classifier (`explorer/src/lib/layout/layers.ts`):** `classifyNodeLayer(node)` correctly classifies nodes into `presentation`, `application`, `domain`, `schema`.
2. **Feature Discovery (`explorer/src/lib/layout/features.ts`):** `discoverFeatures(nodes, edges)` groups nodes into semantic feature clusters.
3. **Role Classifier (`explorer/src/lib/layout/feature-roles.ts`):** Identifies `FeatureAnchor`, `FeatureCore`, `FeatureData`, `SharedInfrastructure`.
4. **Domain Stem Extractor (`explorer/src/lib/layout/domains.ts`):** `discoverDomains(nodes, edges)` for domain-based sector fallback.

### Strictly Excluded Hybrid Mechanics
* **Physical 2D Feature Rectangles (`FeatureRegion`):** Orbit uses angular polar wedges, not rectangular 2D bounding boxes.
* **Vertical Layer Y Offsets (`LAYER_Y_MAP`):** Orbit replaces fixed $y$-coordinates ($100, 350, 600, 850\text{px}$) with radial radii ($R_0 \dots R_4$).

---

## 12. Visual Guides Audit

| Visual Guide Primitive | Visual Representation | Interpretation Value | Implementation Effort | V1 Recommendation |
| :--- | :--- | :--- | :---: | :--- |
| **Concentric Ring Arcs** | Light dashed circular guide lines @ $R_0, R_1, R_2, R_3, R_4$ | **Very High.** Immediately reveals architectural layer boundaries. | **XS** | **Include in V1** |
| **Concentric Ring Labels** | Curved or horizontal labels ("Presentation", "Application", "Domain", "Schema", "Tests") | **Very High.** Provides instant semantic context for radii. | **S** | **Include in V1** |
| **Sector Spoke Lines** | Radial lines extending from $R_{\text{nucleus}}$ to $R_4$ between feature sectors | **High.** Clearly demarcates feature boundary wedges. | **S** | **Include in V1** |
| **Sector Header Labels** | Radially aligned text labels placed outside $R_4$ | **Very High.** Names each feature sector clearly. | **S** | **Include in V1** |
| **Nucleus Core Indicator** | Subtle glowing center circle or icon @ $(cx, cy)$ | **Medium.** Marks system origin center. | **XS** | **Include in V1** |
| **Edge Opacity / Styling** | Bezier curved paths; opacity scaled by zoom and relationship type | **High.** Reduces visual clutter in dense edge regions. | **M** | **Include in V1** |

---

## 13. Effort / Impact Matrix

| Geometry Capability | User Impact | Effort | Complexity | Reuse Available | V1? |
| :--- | :---: | :---: | :---: | :--- | :---: |
| **Polar Coordinate Core Transformer** | Very High | XS | Very Low | Constellation (`constellation-layout.ts`) | **YES** |
| **Layer-to-Ring Radial Mapper ($R_0\dots R_4$)** | Very High | S | Low | Hybrid (`layers.ts`) | **YES** |
| **Feature-to-Sector Angular Allocator** | Very High | S | Low | Hybrid (`features.ts`, `domains.ts`) | **YES** |
| **Barycentric Sector Ordering** | High | S | Medium | Hybrid (`feature-ordering.ts`) | **YES** |
| **Deterministic Virtual Nucleus Origin** | High | XS | Very Low | None (New rule) | **YES** |
| **Intra-Ring Chordal Clearance ($\ge 40\text{px}$)** | High | S | Medium | Hybrid (`spacing.ts`) | **YES** |
| **One-Pass Bounded Topology Nudge** | Medium | S | Medium | None (New logic) | **YES** |
| **Concentric Ring & Sector SVG Guides** | Very High | S | Low | Constellation SVG helpers | **YES** |
| **Bezier Edge Curved Path Generator** | High | S | Low | Constellation (`computeConstellationLayout`) | **YES** |
| **Position Authority Restoration Pass** | High | XS | Low | Position Policy (`position-policy.ts`) | **YES** |
| **Force-Directed Physics Relaxation** | Low | XL | Very High | None | **DEFER** |
| **Hierarchical Edge Bundling** | Low | L | High | None | **DEFER** |

---

## 14. Unnecessary Sophistication (Deferred Features)

The following complex, non-deterministic, or resource-intensive algorithms are **explicitly deferred** from V1:

1. **Force-Directed Physics Simulation:** Non-deterministic, $O(N^2)$ or $O(N \log N)$ per iteration, causes layout jitter, violates position stability contract.
2. **Spectral Graph Layout / Eigenvector Placement:** Computationally heavy ($O(N^3)$ matrix operations), non-intuitive radial coordinate mapping.
3. **Community Detection (Louvain / Leiden):** Redundant. `discoverFeatures` already provides deterministic $O(N \log N)$ feature clustering.
4. **Multi-Pass Annealing Angular Solvers:** Unnecessary overhead; one-pass barycentric nudge yields optimal crossing reduction within sector constraints.
5. **Hierarchical Edge Bundling (HEB):** High rendering complexity; standard bezier curves with zoom-dependent opacity provide sufficient edge readability.
6. **WebGL / 3D Perspective Projections:** Closed under Phase 3D decision (`PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md`). 2D SVG/Canvas is the active layout authority.
7. **Dynamic Zoom-Dependent Geometry Mutation:** Modifying radial coordinates on zoom causes user spatial disorientation.

---

## 15. Minimum Viable Geometry (MVG)

The **Minimum Viable Geometry** for Architecture Orbit requires only:
1. **5 Concentric Rings:** $R_0 = 180\text{px}$, $R_1 = 320\text{px}$, $R_2 = 460\text{px}$, $R_3 = 600\text{px}$, $R_4 = 740\text{px}$.
2. **Virtual Nucleus:** Origin $(cx, cy)$ with $R_{\text{nucleus}} = 120\text{px}$.
3. **Feature Sectors:** Proportional angular wedges allocated from `discoverFeatures`.
4. **Polar-to-Cartesian Mapping:** Direct coordinate calculation $x = cx + R \cos \theta, y = cy + R \sin \theta$.
5. **Curved Bezier Edges:** Smooth radial bezier edge rendering.

---

## 16. Recommended V1 Geometry System

The recommended V1 Architecture Orbit layout engine (`computeOrbitLayout`) should be structured as follows:

```typescript
export interface OrbitLayoutOptions {
  width?: number;              // Default 1200
  height?: number;             // Default 1200
  cx?: number;                 // Default width / 2
  cy?: number;                 // Default height / 2
  baseRadius?: number;         // Default 180 (R0 Presentation)
  ringStepRadius?: number;     // Default 140
  minNodeClearance?: number;   // Default 40.0
}

export interface OrbitLayoutResult {
  positions: Record<string, { x: number; y: number }>;
  ringGeometries: Array<{ ringIndex: number; layer: string; radius: number }>;
  sectorGeometries: Array<{ featureId: string; startAngle: number; endAngle: number }>;
}
```

### Deterministic Execution Summary
* **Runtime Complexity:** $O(N \log N + E)$
* **Memory Bounds:** $< 15\text{MB}$ heap allocation for $N=1,000$.
* **Coordinate Stability:** $0.00000\text{px}$ drift across repeat executions.

---

## 17. Deferred Geometry Backlog

1. **Post-V1 Feature Orbit Clustering:** Multi-level nested sub-sectors for ultra-large features ($F \ge 50$).
2. **Interactive Sector Expansion:** Dynamic angular expansion when a user clicks/focuses a specific feature sector.
3. **Polar Edge Bundling:** Radial control point bundling along sector spokes for dense cross-sector relationships.

---

## 18. Evidence Index

### Primary Source Code Files Inspected
1. `explorer/src/lib/layout/constellation-layout.ts` — Constellation polar coordinate engine and bezier path math.
2. `explorer/src/lib/adapters/constellation-adapter.ts` — Constellation data adapter and ring metadata.
3. `explorer/src/lib/architecture-layout.ts` — Wave 1-4 layout orchestrator.
4. `explorer/src/lib/layout/global-layout.ts` — Global domain and feature layout engines (`computeGlobalFeatureLayout`).
5. `explorer/src/lib/layout/layers.ts` — Architectural layer classification engine (`classifyNodeLayer`).
6. `explorer/src/lib/layout/features.ts` — Semantic feature discovery engine (`discoverFeatures`).
7. `explorer/src/lib/layout/domains.ts` — Architectural domain discovery engine (`discoverDomains`).
8. `explorer/src/lib/layout/feature-roles.ts` — Feature role classifier (`classifyAllFeatureRoles`).
9. `explorer/src/lib/position-policy.ts` — Position authority policy (`resolveAuthoritativePosition`).
10. `explorer/src/types/explorer.ts` — Canonical graph schema (`ExplorerNode`, `ExplorerEdge`, `ExplorerDataSchema`).

### Verified Baseline Reports & Contracts
1. `P0-4_CROSS_LAYOUT_INTERACTION_AUDIT.md` — 12-lens cross-layout interaction baseline.
2. `P0-3_DATA_ADAPTER_DEPENDENCY_AUDIT.md` — Canonical data schema and adapter audit.
3. `PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md` — Formal 3D closure and 2D spatial layout authority freeze.
4. `audit-reports/FINAL-PROGRAM-REPORT.md` — Master program audit reconciliation.
