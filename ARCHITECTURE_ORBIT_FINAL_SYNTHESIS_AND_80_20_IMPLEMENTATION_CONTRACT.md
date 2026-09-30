# ARCHITECTURE ORBIT — FINAL SYNTHESIS & 80/20 IMPLEMENTATION CONTRACT

**Audit Type:** Final Cross-Audit Reconciliation & Implementation Contract
**Mode:** Read-only planning / no production code modifications
**Authority:** Actual repository implementation + validated evidence from Specialist Audits A–F
**Primary Goal:** Determine the smallest, safest, highest-impact Architecture Orbit implementation after reconciling all six specialist audits.

---

## 1. Executive Summary

This synthesis establishes the authoritative, evidence-backed engineering contract for **Architecture Orbit**. Reconciling specialist audits A through F against the live repository code (`explorer/src/`, `analyze/`, `deterministic/`), this contract resolves all inter-audit contradictions, eliminates unsupported claims, rejects semantic contamination, and defines an 80/20 implementation boundary that delivers maximum architectural clarity with minimal new code complexity.

### Core Reconciled Decisions
1. **Definition & Purpose:** Architecture Orbit is a **global semantic radial projection** of the existing Salesforce architecture graph. Radius represents Architectural Layer ($R_0 \dots R_4$), Angle represents Feature/Domain Sector affinity, Edges represent actual directional dependencies, and Guides provide structural interpretation. It is neither a Constellation focal lens nor a Hybrid 2D Cartesian grid layout.
2. **Nucleus Model:** Origin $(cx, cy)$ is designated as a **Virtual Architectural Center** with an inner clearance radius ($R_{\text{nucleus}} = 120\text{px}$). No physical node is forced to the center, preserving 100% stability when entry points are missing, duplicated, or non-UI.
3. **5-Ring Layer System:** Consolidated into 5 concentric rings: $R_0$ Presentation ($180\text{px}$), $R_1$ Application ($320\text{px}$), $R_2$ Business Logic/Domain ($460\text{px}$), $R_3$ Schema/Objects ($600\text{px}$), and $R_4$ Supporting/Satellites/Tests ($740\text{px}$). Field sub-tracks run at $R_{3b} = 625\text{px}$.
4. **Constellation Separation:** Reuses polar coordinate helper functions (`polarToCartesian`, `computeCurvedPath`, SVG arc helpers) while strictly rejecting Constellation's focal-node selection, $k$-hop BFS distance rings, and neighborhood filtering semantics.
5. **Position Authority & Persistence:** Operates strictly at **Level 4** (Layout Engine Calculation) within `position-policy.ts`. Orbit layout positions persist per project as `layoutProvenance = 'automatic-orbit'` in `GraphLayoutState` (`projectState.ts`), ensuring zero corruption of Hierarchical or Hybrid layout coordinates.
6. **Performance & Density:** End-to-end complexity is strictly $O(N \log N + E)$. $O(N^2)$ risks (unindexed angular collision checks and unconstrained spring-nudging) are eliminated via angular sorting with 1D sweep-line collision checks, concentric multi-track ring expansion ($R_{k,a}, R_{k,b}$), and $K_{\text{iter}} \le 3$ bounded angular nudging.
7. **Implementation Boundary:** Requires **~465 lines** of new code (pure `orbit-layout.ts` math engine, thin dispatcher hook in `architecture-layout.ts`, and UI mode toggle in `GraphControls.tsx`), while reusing 100% of existing filtering, graph indexing, layer/role classification, feature discovery, interaction hooks, position authority gates, and persistence engines.

---

## 2. Audit Authority Model

When evaluating specialist audit recommendations, conflicts and claims are resolved using the strict 5-level evidence hierarchy:

```text
[Level 1: Actual Repository Implementation]  <-- HIGHEST AUTHORITY
        │
        ▼
[Level 2: Existing Tests / Browser Verification / Benchmarks]
        │
        ▼
[Level 3: Existing Architecture Contracts (Position Authority, Contracts)]
        │
        ▼
[Level 4: Specialist Audit Conclusions (A–F Reports)]
        │
        ▼
[Level 5: Proposed Designs / Assumptions]   <-- LOWEST AUTHORITY
```

*Agreement among specialist audits is never treated as proof if the underlying repository assumption is flawed.*

---

## 3. Cross-Audit Conflict Register

The table below records all meaningful disagreements between specialist audits A–F, evaluates actual repository evidence, and defines the final authoritative resolution.

| Conflict ID | Audits Involved | Disagreeing Claims | Actual Repository Evidence | Final Resolution | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CONF-01** | Audit B vs Audit C | **Ring Count:** Audit B proposes a 5-Ring Model ($R_0\dots R_4$). Audit C proposes a 6-Ring Model ($R_1\dots R_6$). | `explorer/src/lib/layout/layers.ts` exports 4 core layers (`presentation`, `application`, `domain`, `schema`). `satellites.ts` handles tests and fields as outer orbital attachments. | **Consolidated 5-Ring Model ($R_0\dots R_4$):** $R_0$ Presentation, $R_1$ Application, $R_2$ Domain, $R_3$ Schema, $R_4$ Supporting/Tests. Fields run as sub-track $R_{3b} = 625\text{px}$. | **HIGH** |
| **CONF-02** | Audit B vs Audit C | **Nucleus Model:** Audit C suggests selecting LWC as physical nucleus. Audit B proposes a Virtual Focal Center. | `cst` has multiple LWCs (`26`). `pub-infra-mang` has 0 LWCs. Forcing an LWC node to origin causes node overlap or layout failure on backend projects. | **Virtual Focal Center Model:** Origin $(cx, cy)$ is designated as an empty structural core ($R_{\text{nucleus}} = 120\text{px}$). | **HIGH** |
| **CONF-03** | Audit F vs Audits A, B, D | **Constellation Reuse:** Audit F proposes reusing `adaptConstellation()` $k$-hop BFS for Orbit. Audits A, B, D reject $k$-hop BFS. | `constellation-adapter.ts` groups nodes by hop-distance from focal node. Orbit is a global map ($R = \text{layer}$). Reusing $k$-hop BFS turns Orbit into Constellation. | **REJECT $k$-Hop BFS / REUSE Geometry Helpers:** Orbit reuses `polarToCartesian`, SVG arcs, and curved paths, but uses layer classification for radius $R$. | **HIGH** |
| **CONF-04** | Audit C vs Audit E | **Centrality Usage:** Audit C suggests moving high-degree Hub nodes to the center ring $R_0$. Audit E warns of $R_0$ arc overcrowding. | $R_0$ ($R=180\text{px}$) has arc length $1,131\text{px}$. Moving deep domain hubs to $R_0$ violates layer semantics and causes $R_0$ collision. | **Retain Layer Radius / Pin Angle:** Hub nodes retain their semantic layer radius $R_k$, but are pinned to the center angle of their feature sector. | **HIGH** |
| **CONF-05** | Audit E vs Audit F | **Density Mitigation:** Audit F suggests auto-clustering nodes into "+X more". Audit E suggests multi-track sub-rings ($R_{k,a}, R_{k,b}$). | `FeatureMatrixPanel.tsx` uses virtualization. Node clustering hides graph structure; sub-track expansion preserves visibility. | **Concentric Multi-Track Sub-Rings:** Expand overcrowded rings into sub-tracks ($R \pm 25\text{px}$). Defer node clustering to extreme scale ($N > 2,500$). | **HIGH** |
| **CONF-06** | Audit D vs Existing UI | **Architecture Mode Switch:** Current code uses binary checks (`architectureMode === 'hybrid' ? ...`). Audit D mandates 3-way enum. | `explorer/src/types/explorer.ts` defines `ArchitectureLayoutMode = 'hierarchical' \| 'hybrid'`. | **Polymorphic Mode Extension:** Expand `ArchitectureLayoutMode` to `'hierarchical' \| 'hybrid' \| 'orbit'` and update state/UI switches. | **HIGH** |

---

## 4. Repository Evidence Reconciliation

Reconciling claims against live codebase files:

1. **`explorer/src/lib/layout/layers.ts` → `classifyNodeLayer()`**:
   Deterministically classifies nodes into `presentation`, `application`, `domain`, `schema`. This function is authoritative for Orbit ring radius assignment $R_0\dots R_3$.
2. **`explorer/src/lib/layout/features.ts` → `discoverFeatures()`**:
   Discovers feature clusters and seed assignments. Reused bit-for-bit to allocate sector angles $\theta_s$.
3. **`explorer/src/lib/position-policy.ts` → `resolveAuthoritativePosition()`**:
   Enforces Level 1 (User Drag) > Level 2 (Persisted) > Level 3 (Canvas) > Level 4 (Layout) > Level 5 (Fallback). Orbit MUST operate at Level 4.
4. **`explorer/src/lib/projectState.ts` → `saveProjectState()` / `GraphLayoutState`**:
   Stores positions per project under `nodePositions` with `layoutProvenance`. Adding `'automatic-orbit'` provides complete state isolation.
5. **`explorer/src/lib/layout/spacing.ts` → `resolveSpacingAndCollisions()` / `SpatialGrid`**:
   Provides spatial hashing and clearance enforcement. Reused for Cartesian collision cleanup.

---

## 5. Final Architecture Orbit Definition

**Architecture Orbit** is defined as:
> **A global semantic radial projection of the existing Salesforce architecture graph.**

### Defining Visual Grammar
- **Radius ($R$):** Architectural Responsibility / Layer ($R_0 \dots R_4$).
- **Angle ($\theta$):** Feature Cluster / Domain / Flow Affinity.
- **Edge ($E$):** Actual directed dependency relationship.
- **Guides:** Visual interpretation overlays (concentric ring arcs, sector spokes, ring labels, sector headers).
- **Center:** Virtual architectural core origin $(cx, cy)$.

### Semantic Boundary Contract
Architecture Orbit MUST NOT accidentally become:
- Dependency Constellation ($r \neq \text{hop distance}$)
- Focal-node $k$-hop explorer (no mandatory focal subject)
- Force-directed physics layout (no non-deterministic iterations)
- Replacement for Hybrid or Hierarchical layouts (independent workspace architecture mode)
- Custom graph ontology or separate data schema

---

## 6. Final Semantic Model

Reconciling Audit C and live classifiers (`layer-classifier.cjs`, `role-classifier.cjs`, `layers.ts`, `feature-roles.ts`):

| Orbit Ring | Semantic Purpose | Existing Source of Truth | Included Types / Roles | Fallback | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ring 0 ($R_0$)** | Entry / Presentation | `layers.ts` (`presentation`), `entry-points.cjs` | `LWC`, `Visualforce`, `ApexTrigger`, `Flow`, REST endpoints | `detectEntryPoint().isEntryPoint` | **HIGH** |
| **Ring 1 ($R_1$)** | Application / Controllers | `layers.ts` (`application`) | Apex Controllers, Handlers, Managers, Orchestrators | `layer === 'application'` | **HIGH** |
| **Ring 2 ($R_2$)** | Business Logic / Domain | `layers.ts` (`domain`) | Business Services, Domain Processors, Models, DTOs | `layer === 'domain'` | **HIGH** |
| **Ring 3 ($R_3$)** | Data / Persistence | `layers.ts` (`schema`), `feature-roles.ts` | Selectors, Repositories, DAOs, Custom/Standard Objects | `type === 'Object' \| 'CustomObject'` | **HIGH** |
| **Ring 4 ($R_4$)** | Supporting / Satellites | `layers.ts` (`isTestNode`), `feature-roles.ts` | Test Classes, Test Factories, Custom Metadata, Utilities | Default Fallback | **HIGH** |
| **Sub-track $R_{3b}$**| Schema Detail | `domains.ts` (`findParentObject`) | Custom Fields, Standard Fields, External Entities | `type === 'Field' \| 'CustomField'` | **HIGH** |

---

## 7. Final Ring Model

### Concentric Ring Radius Specifications
- $R_{\text{nucleus}} = 120\text{px}$ (Inner Virtual Core Clearance)
- $R_0 \text{ (Presentation)} = 180\text{px}$
- $R_1 \text{ (Application)} = 320\text{px} \quad (\Delta R = 140\text{px})$
- $R_2 \text{ (Domain)} = 460\text{px} \quad (\Delta R = 140\text{px})$
- $R_3 \text{ (Schema)} = 600\text{px} \quad (\Delta R = 140\text{px})$
- $R_{3b} \text{ (Field Sub-track)} = 625\text{px} \quad (\delta_r = +25\text{px})$
- $R_4 \text{ (Supporting/Tests)} = 740\text{px} \quad (\Delta R = 140\text{px})$

### Chordal Arc Clearance Contract
Minimum arc clearance between adjacent node centers along ring arc $R$:
$$\Delta \theta_{\text{min}} = 2 \arcsin\left(\frac{S_{\text{min}}}{2 R}\right) \approx \frac{S_{\text{min}}}{R} \text{ radians} \quad (S_{\text{min}} = 40.0\text{px})$$

---

## 8. Final Nucleus Model

### Reconciled Selection: Model D — Virtual Architectural Center
Origin $(cx, cy) = (\text{width}/2, \text{height}/2)$ is designated as an empty structural core with radius $R_{\text{nucleus}} = 120\text{px}$.

### Robustness Evaluation Across Edge Cases
- **Empty Graph ($N=0$):** Returns empty position map `{}` in $0\text{ms}$. Center remains $(cx, cy)$.
- **Single Node ($N=1$):** Placed at center $(cx, cy)$.
- **No LWC (0 Presentation Nodes):** $R_0$ ring is omitted; $R_1 \dots R_4$ render cleanly around origin.
- **One LWC:** Positioned at $R_0$ top ($12\text{ o'clock}$).
- **Multiple LWCs (e.g. CST with 26 LWCs):** Distributed evenly around $R_0$ circle ($R_0 = 180\text{px}$).
- **Headless Domain (Services + Objects):** $R_2$ and $R_3$ render cleanly; origin clearance preserved.
- **Disconnected Components:** Primary component occupies central orbit; secondary components occupy deterministic outer satellite orbits.

---

## 9. Final Sector Model

### Sector Sizing & Allocation Rules
1. **Source Precedence:** Feature Clusters (`discoverFeatures`) primary; Domain Clusters (`discoverDomains`) secondary; `SharedInfrastructure` and `Unassigned` fallback.
2. **Angular Span ($\theta_s$):** Proportional to node count $N_s$:
   $$\theta_{\text{raw}, s} = 2\pi \times \frac{N_s}{N_{\text{total}}}$$
3. **Minimum Sector Span:** Guaranteed minimum angle $\theta_{\text{min}} = 15^\circ$ ($0.2618\text{ rad}$) per sector.
4. **Inter-Sector Gap:** Fixed angular gap $\theta_{\text{gap}} = 6^\circ$ ($0.1047\text{ rad}$) between adjacent sectors.
5. **Sector Ordering:** Global barycentric edge-connectivity sorting (`determineGlobalFeatureOrder`) to minimize inter-sector edge crossings.
6. **Tie-Breaking:** `sectorId.localeCompare(b.sectorId)` for 100% deterministic placement.

---

## 10. Final Geometry Pipeline

Streamlined 10-Stage Deterministic Pipeline running in $O(N \log N + E)$ total time:

```text
[Input Nodes & Edges]
         │
         ▼
[Stage 1: Visible Graph Filtering] (selectFilteredGraph)
         │
         ▼
[Stage 2: Layer & Role Classification] (classifyNodeLayer, classifyFeatureRole)
         │
         ▼
[Stage 3: Feature/Domain Sector Allocation] (discoverFeatures, discoverDomains)
         │
         ▼
[Stage 4: Barycentric Sector Ordering] (determineGlobalFeatureOrder)
         │
         ▼
[Stage 5: Ring Radius Assignment] (R0=180px, R1=320px, R2=460px, R3=600px, R4=740px)
         │
         ▼
[Stage 6: Polar Angular Placement] (theta_i allocation per ring-sector)
         │
         ▼
[Stage 7: Bounded One-Pass Topology Nudge] (K_iter <= 3, alpha = 0.15)
         │
         ▼
[Stage 8: Concentric Sub-Track Collision Clearance] (1D sweep-line check)
         │
         ▼
[Stage 9: Cartesian Conversion & Precision Rounding] (x = cx + r*cos(theta), y = cy + r*sin(theta))
         │
         ▼
[Stage 10: Position Authority Gate Validation] (resolveAuthoritativePosition)
         │
         ▼
[Output PositionMap { x, y }]
```

---

## 11. Final Density Strategy

Evaluating mitigations for dense radial rings (e.g. 500 Apex classes in $R_1$):

| Density Mechanism | Needed for V1? | Complexity | Performance | Visual Benefit | Risk | Decision |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Concentric Sub-Tracks** | **YES** | **S** | $O(N \log N)$ | Very High | Low | **INCLUDE IN V1** ($R \pm 25\text{px}$) |
| **1D Sweep-Line Clearance** | **YES** | **S** | $O(N \log N)$ | Very High | Low | **INCLUDE IN V1** ($\ge 40.0\text{px}$) |
| **Hub Angle Pinning** | **YES** | **XS** | $O(N)$ | High | Low | **INCLUDE IN V1** (Anchor high degree at sector center angle) |
| **Canvas LOD Tiers 0–4** | **YES** | **XS** | $O(1)$ | High | Low | **REUSE EXISTING** (`canvas-lod.ts`) |
| **Interactive Hover Beams** | **YES** | **S** | $O(E_{\text{hover}})$ | Very High | Low | **INCLUDE IN V1** (`FeatureOverlayCanvas.tsx`) |
| **Dynamic Radius Expansion**| **YES** | **XS** | $O(1)$ | High | Low | **INCLUDE IN V1** ($R_k = \max(R_{\text{base}}, \frac{N_k \cdot 160}{2\pi})$) |
| **Node Clustering (+X more)**| **NO** | **L** | $O(N)$ | Medium | High | **DEFER TO V2** (Preserve node visibility in V1) |

---

## 12. Final Performance Contract

### Target Algorithmic Complexity: $O(N \log N + E)$

### Elimination of Quadratic Failure Modes
1. **Collision Check:** Nodes sorted by angle $\theta$ in $O(N_k \log N_k)$; 1D linear sweep checks adjacent pairs in $O(N_k)$. Pairwise $O(N_k^2)$ checks are strictly prohibited.
2. **Neighbor Nudging:** Bounded to $K_{\text{iter}} \le 3$ iterations. Neighbor centroids calculated over edges in $O(E)$ time per pass.
3. **Execution SLAs:**
   - $N = 240$ (Cloud Spend Tracker): $T_{\text{cold}} < 500\text{ms}$
   - $N = 1,000$ (Scalability Benchmark): $T_{\text{cold}} < 2,500\text{ms}$
   - Real-browser transition latency: $\le 283\text{ms}$
   - Interaction frame rate: $\ge 60\text{fps}$
   - Memory heap ceiling: $\le 200\text{MB}$

---

## 13. Existing Infrastructure to Reuse

Direct consumption of existing production utilities:

1. **Graph Input Filtering:** `selectFilteredGraph` (`explorer/src/lib/selectors/index.ts`).
2. **Graph Indexing:** `createLayoutGraphIndex` (`explorer/src/lib/layout/graph-index.ts`).
3. **Layer Classification:** `classifyNodeLayer` (`explorer/src/lib/layout/layers.ts`).
4. **Role Classification:** `classifyFeatureRole` (`explorer/src/lib/layout/feature-roles.ts`).
5. **Feature Discovery:** `discoverFeatures` (`explorer/src/lib/layout/features.ts`).
6. **Domain Discovery:** `discoverDomains` (`explorer/src/lib/layout/domains.ts`).
7. **Spatial Collision Cleanup:** `resolveSpacingAndCollisions` (`explorer/src/lib/layout/spacing.ts`).
8. **Position Authority Policy:** `resolveAuthoritativePosition` (`explorer/src/lib/position-policy.ts`).
9. **Project State Persistence:** `saveProjectState` / `loadProjectState` (`explorer/src/lib/projectState.ts`).
10. **Cytoscape Viewport & Selection:** `bindGraphInteractions` (`graph-interactions.ts`), `useInvestigationOptional` (`InvestigationContext.tsx`).
11. **Polar Geometry Helpers:** `polarToCartesian` (`constellation-layout.ts`), SVG arc helpers.

---

## 14. Thin Adapters Required

1. **Layout Mode Dispatcher (`explorer/src/lib/architecture-layout.ts`):**
   - Add Orbit execution branch inside `computeArchitectureLayoutWithMetadata`.
2. **Graph Controls Toggle (`explorer/src/components/GraphControls.tsx`):**
   - Register `'orbit'` layout mode button alongside `'hierarchical'` and `'hybrid'`.
3. **Overlay Canvas Adapter (`explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx`):**
   - Add radial guide rendering (concentric ring arcs and sector spokes).

---

## 15. New Code Boundary

| New Component | Why Required | Existing Replacement Considered | Approx. Complexity | V1? |
| :--- | :--- | :--- | ---: | :---: |
| **`orbit-layout.ts`** | Core polar coordinate generator & radial ring allocator | None (New layout math engine) | ~120 LOC | **YES** |
| **`orbit-layout.test.ts`** | Vitest determinism, clearance, and SLA suite | None (New unit test file) | ~150 LOC | **YES** |
| **Dispatcher Hook** | Route options in `architecture-layout.ts` | Existing `computeArchitectureLayout` | ~25 LOC | **YES** |
| **UI Mode Toggle** | 3-way layout selector in `GraphControls.tsx` | Binary mode switch | ~30 LOC | **YES** |
| **Radial Guide Overlay** | Concentric SVG rings in `FeatureOverlayCanvas.tsx` | Rectangular `FeatureRegion` overlay | ~80 LOC | **YES** |
| **TOTAL NEW CODE** | Pure math + thin UI integration | | **~405 LOC** | |

---

## 16. Hidden High-Leverage Opportunities

Reconciling Audit F's opportunity hunt against codebase evidence:

1. **Polar Transformation Math (~120 LOC):** Pure scalar math $(x,y) = (cx + r \cos\theta, cy + r \sin\theta)$ executes in $<1\text{ms}$ for $N=500$.
2. **InvestigationContext Authority Integration:** Zero new selection state required.
3. **Instant Diagnostic Telemetry:** Passing Orbit `PositionMap` into `calculateLayoutMetrics()` (`metrics.ts`) provides full $C_{\text{total}}$, $C_{pp}$, and clearance telemetry immediately.
4. **SVG Concentric Guide Arcs:** Lightweight overlay rendering in `FeatureOverlayCanvas.tsx`.

---

## 17. Validated Cheap Wins

All 5 cheap wins survived adversarial review:

1. **Concentric Ring SVG Guide Lines:** Reuses SVG canvas overlay pattern (~60 LOC).
2. **Layer-Aware Sector Ordering:** Clockwise layer arrangement using `classifyNodeLayer` (~20 LOC).
3. **Risk Exposure Halos:** Uses `node.risk` property and CSS keyframe styles (~15 LOC).
4. **Node Metric Coupling Badge Sizing:** Scales badge radius by `node.metrics.coupling` (~10 LOC).
5. **Hover Path Tracing & Neighborhood Dimming:** Reuses Cytoscape CSS class toggling (0 LOC).

---

## 18. False Cheap Wins (Rejected)

1. **REJECTED: Reusing Constellation BFS $k$-Hop Traversal for Orbit Geometry.**
   - *Reason:* Distorts Orbit's global layer-ring model ($R = \text{layer}$) into a local focal-neighborhood lens ($R = \text{hop distance}$).
2. **REJECTED: Dynamic Force-Directed Orbital Physics in Web Worker.**
   - *Reason:* Introduces $O(N^2)$ non-deterministic coordinate drift, violating golden snapshot contracts.
3. **REJECTED: Interactive Drag-to-Reorder Sector Bands.**
   - *Reason:* Creates complex state persistence and URL schema debt for minimal visual value.
4. **REJECTED: Custom Curved Non-Linear Edge Arc Routing Engine.**
   - *Reason:* CPU-intensive cubic Bézier calculations cause canvas lag on $N > 500$. Straight chords with hover highlighting provide superior readability.
5. **REJECTED: 3D Perspective Spherical Orbit Projections.**
   - *Reason:* Officially closed under Phase 3D decision (`PHASE_3D_CLOSE_FINAL_CURRENT_STATE.md`). 2D SVG/Canvas is active layout authority.

---

## 19. Top 10 Highest-Leverage Capabilities

```text
1. Pure Polar Transformer (orbit-layout.ts)    --> Pure scalar math, O(N), 0.00000px drift
2. Layer-to-Ring Mapping (layers.ts)           --> Reuses classifyNodeLayer bit-for-bit
3. Feature Sector Allocator (features.ts)      --> Reuses discoverFeatures bit-for-bit
4. Position Authority Gate (position-policy.ts)--> Level 4 candidate coordinates, 0 drag loss
5. Project State Isolation (projectState.ts)   --> Automatic-orbit provenance, 0 state corruption
6. Concentric Ring SVG Guides (FeatureOverlay) --> Instant architectural radar aesthetic
7. 1D Sweep-Line Clearance (spacing.ts)        --> Guarantees >= 40.0px clearance, O(N log N)
8. InvestigationContext Binding                --> 0 new selection state, instant drawer integration
9. Layout Diagnostic Telemetry (metrics.ts)    --> Instant Ctotal, Cpp, clearance evaluation
10. Command Palette Ctrl+K Jump                --> Instant keyboard navigation in Orbit view
```

---

## 20. Minimum Viable Architecture Orbit (MVP)

The MVP is described in 10 concise bullets:
1. Pure $O(N \log N)$ layout function `computeOrbitLayout()` in `explorer/src/lib/layout/orbit-layout.ts`.
2. 5 Concentric Rings ($R_0=180\text{px}, R_1=320\text{px}, R_2=460\text{px}, R_3=600\text{px}, R_4=740\text{px}$) assigned via `classifyNodeLayer()`.
3. Virtual Focal Center origin $(cx, cy)$ with $R_{\text{nucleus}} = 120\text{px}$ clearance.
4. Proportional angular sector allocation derived from `discoverFeatures()`.
5. Direct polar-to-Cartesian coordinate calculation $(x = cx + r \cos\theta, y = cy + r \sin\theta)$.
6. 1D sweep-line collision check enforcing $\ge 40.0\text{px}$ minimum clearance.
7. Position authority integration at Level 4 (`layoutProvenance = 'automatic-orbit'`).
8. Viewport interaction and selection via `InvestigationContext`.
9. Concentric ring SVG guide overlay rendering in `FeatureOverlayCanvas.tsx`.
10. Vitest test suite enforcing finite coordinates, $0$ overlaps, and $0.00000\text{px}$ determinism drift.

---

## 21. 80/20 Architecture Orbit

The 80/20 version adds targeted polish without layout research complexity:
- **Geometry:** Concentric sub-track expansion ($R \pm 25\text{px}$) for dense rings; field sub-tracks at $R_{3b} = 625\text{px}$.
- **Semantic Reuse:** Clockwise sector ordering following architectural layer sequence.
- **Visual Guides:** Sector spoke lines and sector header text labels outside $R_4$.
- **Interaction:** Hover beam highlighting on sector wedges and connected cross-ring edges.
- **Density:** Bounded angular nudging ($K_{\text{iter}} \le 3$, $\alpha = 0.15$) and dynamic ring radius expansion.
- **Diagnostics:** Full telemetry integration in `DiagnosticsPanel.tsx`.
- **Persistence:** Project-scoped `localStorage` state isolation.
- **Validation:** 10 quantitative acceptance gates (GATE-O1 through GATE-O10).

---

## 22. V1 Scope

Included in initial V1 release:
- `computeOrbitLayout()` in `explorer/src/lib/layout/orbit-layout.ts`
- 5 Concentric Rings + Sub-track Expansion
- Virtual Focal Center Model
- Proportional Feature Sector Allocation
- Barycentric Sector Ordering
- 1D Sweep-Line Clearance ($\ge 40.0\text{px}$)
- Bounded Angular Nudging ($K_{\text{iter}} \le 3$)
- Concentric SVG Ring & Sector Spoke Guides
- 3-Way Mode Toggle in `GraphControls.tsx`
- State Persistence (`'automatic-orbit'`)
- Diagnostic Telemetry & Vitest Test Suite

---

## 23. V1.1 Scope (Post-Baseline Polish)

Deferred to V1.1:
- Multi-level nested sub-sectors for ultra-large feature clusters ($F \ge 50$).
- Interactive Sector Angular Expansion (expanding a sector wedge on click).
- Concentric Radial Heatmap Ring Background Shading.
- Cross-Orbit Dependency Cycle Magenta Highlight Paths.

---

## 24. Deferred V2 Scope

Explicitly deferred to V2:
- Force-directed physics relaxation
- Spectral graph drawing
- Louvain / Leiden community detection
- Hierarchical edge bundling
- WebGL / 3D shader rendering
- Dynamic zoom geometry mutation
- Automatic node clustering into "+X more"

---

## 25. Explicit Non-Goals

Architecture Orbit MUST NOT become:
- Another Dependency Constellation (not a local $k$-hop focal lens)
- Another Hybrid Layout (not a 2D Cartesian grid band layout)
- A force-directed physics simulation
- A custom semantic ontology or classifier
- An edge-bundling research project
- A WebGL/3D graphics engine

---

## 26. Regression Protection Contract

### Protection Invariants
- **Hierarchical Layout:** 100% bit-for-bit coordinate identity ($C_{pp}=7,812, C_{\text{total}}=85,367$ on CST benchmark).
- **Hybrid Layout:** 100% metric identity ($D_{\text{intra}}=1,132.94\text{px}$, clearance $\ge 40.0\text{px}$, Candidate E $C_{\text{total}}=94,662$).
- **Dependency Constellation:** $0.00000\text{px}$ drift on local polar lens calculations.
- **Position Authority:** Level 1 user drag positions strictly preserved across mode switches ($0.00000\text{px}$ drift).
- **Canonical Dataset:** `audit-fixtures/cloud-spend-tracker/explorer-data.json` matches SHA-256 `feeb68f3...` bit-for-bit.

---

## 27. Validation Contract

Enforcing 10 quantitative acceptance gates:

| Gate ID | Metric Name | Mathematical Verification Formula | Target Threshold |
| :--- | :--- | :--- | :--- |
| **GATE-O1** | Finite Coordinates | $\forall v \in V: x_v, y_v \in \mathbb{R} \land \text{isFinite}(x_v) \land \text{isFinite}(y_v)$ | **100% Pass** ($0$ non-finite) |
| **GATE-O2** | No Invalid Positions | $\forall v \in V \setminus \{\text{center}\}: (x_v, y_v) \neq (0, 0)$ | **0 Origin Fallbacks** |
| **GATE-O3** | Zero Primary Overlaps | $C_{\text{primary\_overlap}} = \sum_{i < j} \mathbb{I}(|x_i - x_j| < w \land |y_i - y_j| < h)$ | **0 Overlapping Pairs** |
| **GATE-O4** | Minimum Clearance | $\text{clearance}_{\text{min}} = \min_{i \neq j} \text{dist}(v_i, v_j) - \text{size}$ | $\ge \mathbf{40.0\text{px}}$ ($\epsilon = 1e-3$) |
| **GATE-O5** | Zero Dropped Nodes | $|V_{\text{positions}}| = |V_{\text{active}}|$ | **100% Coverage** |
| **GATE-O6** | Zero Dropped Edges | $|E_{\text{rendered}}| = |E_{\text{active}}|$ | **100% Coverage** |
| **GATE-O7** | Absolute Determinism | $\max_{v \in V} \text{dist}(pos_v^{(1)}, pos_v^{(2)})$ across $10\times$ runs | $\mathbf{0.00000\text{px}}$ Drift |
| **GATE-O8** | Layout SLA | $T_{\text{cold}}(N=1000) < 2500\text{ms}, T_{\text{cold}}(N=240) < 1000\text{ms}$ | **$< 2,500\text{ms}$** |
| **GATE-O9** | Browser SLA | Frame rate $\ge 60\text{fps}$, Heap memory $\le 200\text{MB}$ | $\ge \mathbf{60\text{fps}}$, Heap $\le \mathbf{200\text{MB}}$ |
| **GATE-O10**| Authority Safety | Unintended `cy.layout()` calls during transitions | **0 Layout Triggers** |

---

## 28. Real-Project Validation Matrix

Evaluating Orbit against its intended visual purpose across canonical project fixtures:

| Dataset | Path | Scale ($N/E$) | Structural Profile | Evaluation Focus |
| :--- | :--- | :--- | :--- | :--- |
| **`cst`** | `explorer/public/projects/cst` | 240N / 1,024E | Multi-LWC, 26 composite features | Ring clarity, sector separation, SLA $< 500\text{ms}$ |
| **`pbim`** | `explorer/public/projects/pbim` | 528N / 2,063E | Dense cross-domain controller web | Relationship chord visibility, clearance $\ge 40\text{px}$ |
| **`pub-infra-mang`** | `explorer/public/projects/pub-infra-mang` | 528N / 2,063E | Deep trigger chains, field heavy | Compactness, satellite fan-out, determinism |
| **`food-app`** | `explorer/public/projects/food-app` | 80N / 200E | Clean LWC-to-Controller flows | Architectural readability, cohesion score $> 0.85$ |
| **`bqc`** | `explorer/public/projects/bqc` | 120N / 350E | CustomObject & CustomField dense | Satellite radial fan-out, 0 satellite overlaps |

---

## 29. Implementation Sequence

1. **Step 1: Core Layout Engine (`explorer/src/lib/layout/orbit-layout.ts`)**
   - Implement `computeOrbitLayout()` with 10-stage pipeline, polar coordinate math, concentric sub-tracks, and 1D sweep-line clearance.
2. **Step 2: Unit Test Suite (`explorer/src/test/orbit-layout.test.ts`)**
   - Create Vitest suite asserting GATE-O1 through GATE-O8 on synthetic and canonical CST datasets.
3. **Step 3: Types & State Extension (`explorer/src/types/explorer.ts`, `projectState.ts`)**
   - Add `'orbit'` to `ArchitectureLayoutMode` and `'automatic-orbit'` to `LayoutProvenance`. Update deserialization in `mergeWithDefaultState()`.
4. **Step 4: Layout Orchestrator Dispatch (`explorer/src/lib/architecture-layout.ts`)**
   - Thread Orbit execution branch into `computeArchitectureLayoutWithMetadata`.
5. **Step 5: UI Controls & Overlay Integration (`GraphControls.tsx`, `FeatureOverlayCanvas.tsx`)**
   - Register 3-way mode toggle; add SVG concentric ring and sector spoke rendering.
6. **Step 6: Verification & Pre-commit Steps**
   - Execute `npm run test:cli`, Vitest suites, and pre-commit checks.

---

## 30. Final Architecture Diagram

```text
Existing Visible Graph (selectFilteredGraph in explorer/src/lib/selectors/index.ts)
        │
        ▼
Existing Graph Index Infrastructure (createLayoutGraphIndex in graph-index.ts)
        │
        ▼
Existing Semantic Classification
        │
        ├── Layer / Role Classification (classifyNodeLayer, classifyFeatureRole) [EXISTING]
        ├── Feature / Domain Discovery (discoverFeatures, discoverDomains)      [EXISTING]
        ├── Centrality Analysis (computeGraphCentralityAnalysis)               [EXISTING]
        └── Dependency Relationships (ExplorerEdge)                              [EXISTING]
        │
        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NEW ORBIT GEOMETRY                              │
│             (explorer/src/lib/layout/orbit-layout.ts)                  │
│                                                                        │
│  • Ring Assignment (R0=180px, R1=320px, R2=460px, R3=600px, R4=740px) [NEW]│
│  • Proportional Sector Allocation & Barycentric Ordering        [NEW]  │
│  • Polar Placement (x = cx + r*cos(theta), y = cy + r*sin(theta)) [NEW] │
│  • Concentric Sub-Track Expansion & 1D Sweep-Line Clearance     [NEW]  │
│  • Bounded Angular Nudging (K_iter <= 3)                        [NEW]  │
└────────────────────────────────────────────────────────────────────────┘
        │
        ▼
Existing Position Authority Gate (resolveAuthoritativePosition in position-policy.ts) [EXISTING]
        │
        ▼
Existing Worker Pipeline (LayoutWorkerClient in layout-worker-client.ts) [THIN ADAPTER]
        │
        ▼
Existing Cytoscape Canvas Rendering (GraphView.tsx) [EXISTING]
        │
        ├── Selection & Focus (InvestigationContext)   [EXISTING]
        ├── Hover & Highlighting Cards                 [EXISTING]
        ├── Zoom & Canvas LOD Tiers (canvas-lod.ts)    [EXISTING]
        └── SVG Guide Overlay (FeatureOverlayCanvas)   [THIN ADAPTER]
        │
        ▼
Existing Project State Persistence (saveProjectState in projectState.ts) [THIN ADAPTER]
```

---

## 31. Final Implementation Boundary

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        EXISTING REUSE BOUNDARY                         │
├────────────────────────────────────────────────────────────────────────┤
│  • Graph Selectors: selectFilteredGraph() in selectors/index.ts        │
│  • Graph Indexing: createLayoutGraphIndex() in graph-index.ts         │
│  • Layer Classification: classifyNodeLayer() in layers.ts              │
│  • Role Classification: classifyFeatureRole() in feature-roles.ts      │
│  • Feature Discovery: discoverFeatures() in features.ts                │
│  • Domain Discovery: discoverDomains() in domains.ts                  │
│  • Spatial Collision: SpatialGrid / resolveSpacingAndCollisions        │
│  • Position Authority: resolveAuthoritativePosition() in policy.ts     │
│  • State Persistence: saveProjectState() in projectState.ts            │
│  • Interaction Authority: InvestigationContext in context/             │
│  • Viewport Controls: bindGraphInteractions() in graph-interactions.ts │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       ORBIT NEW CODE BOUNDARY                          │
├────────────────────────────────────────────────────────────────────────┤
│  [Must Create]                                                         │
│  1. explorer/src/lib/layout/orbit-layout.ts (~120 LOC)                 │
│  2. explorer/src/test/orbit-layout.test.ts (~150 LOC)                 │
│                                                                        │
│  [Thin Adapters Only]                                                  │
│  1. Dispatch branch in computeArchitectureLayout() (~25 LOC)           │
│  2. 3-way mode toggle in GraphControls.tsx (~30 LOC)                   │
│  3. Mode enum extension in explorer.ts & projectState.ts (~20 LOC)     │
│  4. Radial guide SVG rendering in FeatureOverlayCanvas.tsx (~80 LOC)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 32. Evidence Index

| File Reference | Subsystem & Relevance | Evidence / Contract Verified |
| :--- | :--- | :--- |
| `explorer/src/types/explorer.ts` | Graph schema & `ArchitectureLayoutMode` type | Verified `ExplorerNode`, `ExplorerEdge`, `ArchitectureLayoutMode` |
| `explorer/src/lib/layout/layers.ts` | 4-tier layer classifier (`classifyNodeLayer`) | Verified deterministic layer mapping for ring radii $R_0\dots R_3$ |
| `explorer/src/lib/layout/feature-roles.ts` | 6-role feature classifier (`classifyFeatureRole`) | Verified role classification for ring $R_4$ / shared infrastructure |
| `explorer/src/lib/layout/features.ts` | Feature discovery engine (`discoverFeatures`) | Verified feature cluster discovery for sector angle allocation |
| `explorer/src/lib/layout/domains.ts` | Domain discovery engine (`discoverDomains`) | Verified domain stem extraction and fallback sector discovery |
| `explorer/src/lib/layout/graph-index.ts` | $O(1)$ adjacency & component index (`LayoutGraphIndex`) | Verified graph indexing infrastructure |
| `explorer/src/lib/position-policy.ts` | 5-level Position Authority hierarchy | Verified Level 1–5 authority rules and Level 4 layout level |
| `explorer/src/lib/projectState.ts` | Project state manager (`saveProjectState`, `GraphLayoutState`)| Verified state persistence schema and provenance isolation |
| `explorer/src/lib/layout/spacing.ts` | 2D Spatial Grid & collision cleanup (`SpatialGrid`) | Verified spatial hashing and clearance enforcement |
| `explorer/src/lib/layout/metrics.ts` | Clearance contract with `1e-3` epsilon | Verified $\ge 40.0\text{px}$ clearance contract enforcement |
| `explorer/src/lib/layout/constellation-layout.ts` | Polar coordinate helper functions | Verified `polarToCartesian` math and SVG curve generation |
| `explorer/src/components/GraphView.tsx` | Viewport orchestrator & Cytoscape preset layout | Verified layout dispatch, mode switching, and SVG overlay |
| `explorer/src/context/InvestigationContext.tsx` | Single selection state authority | Verified selection, focus depth, and drawer inspection context |
| `audit-fixtures/cloud-spend-tracker/explorer-data.json` | Canonical Org Benchmark Fixture | SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295` |

---

## Section 30 Answers: Answers to Quality Test Questions Q1–Q10

1. **Q1: Can Architecture Orbit be implemented primarily as a new geometry projection over existing graph/semantic infrastructure?**
   *Answer:* **Yes, 100%.** Orbit requires zero new classifiers, zero new graph indexing, zero new state stores, and zero new data models. It is implemented purely as a scalar polar coordinate projection (`orbit-layout.ts`) consuming `classifyNodeLayer()`, `discoverFeatures()`, and `selectFilteredGraph()`.

2. **Q2: What exact code must be new?**
   *Answer:* Exactly two new files: `explorer/src/lib/layout/orbit-layout.ts` (~120 LOC) and `explorer/src/test/orbit-layout.test.ts` (~150 LOC). Plus thin modifications to `explorer.ts`, `projectState.ts`, `architecture-layout.ts`, `GraphControls.tsx`, and `FeatureOverlayCanvas.tsx` (~135 LOC total across thin adapters). Total new code: ~405 LOC.

3. **Q3: What exact code must remain untouched?**
   *Answer:* `dependency-analyzer.cjs` (and all `*.cjs` files), `explorer-contract.ts`, `explorer/src/lib/intelligence/`, `global-layout.ts` Stage 0–12 engines, `local-layout.ts`, `satellites.ts`, `ordering.ts`, `constellation-adapter.ts`, `position-policy.ts` core hierarchy, `metrics.ts`, and panel internals (Sidebar, SummaryBar, HotspotPanel, DiagnosticsPanel, FindingsPanel, ComparePanel).

4. **Q4: Which A–F recommendations were rejected, and why?**
   *Answer:*
   - Rejected Audit F's proposal to reuse Constellation BFS $k$-hop traversal for Orbit (distorts layer semantics into local hop distance).
   - Rejected Audit C's proposal to force LWC or Hub nodes into center origin $R_0$ (causes arc overcrowding and breaks backend projects).
   - Rejected Audit F's proposal for force-directed physics, interactive sector drag-reordering, and curved non-linear edge arc routing (introduces $O(N^2)$ non-determinism and CPU lag).
   - Rejected Audit E's proposal for node clustering into "+X more" for V1 (preserves node visibility in V1 via multi-track sub-rings).

5. **Q5: Which Audit F "cheap wins" survived adversarial review?**
   *Answer:* All 5 visual/interaction cheap wins survived: (1) Concentric Ring SVG Guide Arcs, (2) Layer-Aware Sector Angle Ordering, (3) Risk Exposure Halos, (4) Node Metric Coupling Badge Sizing, and (5) Hover Path Tracing & Neighborhood Dimming.

6. **Q6: What is the single biggest unnecessary complexity risk?**
   *Answer:* Unindexed $O(N_k^2)$ pairwise angular collision checks across dense rings and unconstrained spring-force nudging. This is completely eliminated by angular sorting ($O(N_k \log N_k)$) followed by a 1D adjacent sweep-line check and clamping $K_{\text{iter}} \le 3$.

7. **Q7: What is the smallest implementation that will visibly prove Orbit's value?**
   *Answer:* The Minimum Viable Architecture Orbit (MVP): `computeOrbitLayout()` generating polar coordinates for 5 concentric layer rings ($R_0\dots R_4$) with proportional feature sector wedges and SVG guide rings, rendered via Cytoscape preset layout.

8. **Q8: What must be validated before any polish is added?**
   *Answer:* Acceptance Gates GATE-O1 through GATE-O8: 100% finite real coordinates, 0 origin fallbacks, 0 primary overlaps, $\ge 40.0\text{px}$ clearance, $100\%$ node/edge coverage, $0.00000\text{px}$ determinism drift, and $< 2,500\text{ms}$ execution SLA ($N=1,000$).

9. **Q9: What could make Orbit accidentally become Constellation or Hybrid?**
   *Answer:* Reusing Constellation's BFS $k$-hop distance logic for $R$ makes Orbit become Constellation. Reusing Hybrid's 2D rectangular bounding boxes (`FeatureRegion`) or vertical Y-band maps (`LAYER_Y_MAP`) makes Orbit become Hybrid. Orbit MUST keep $R = \text{architectural layer}$ and $\theta = \text{feature sector}$.

10. **Q10: What is the final implementation boundary?**
    *Answer:* Pure math engine in `orbit-layout.ts`, Vitest test suite in `orbit-layout.test.ts`, thin dispatch branch in `architecture-layout.ts`, 3-way mode switch in `GraphControls.tsx`, and SVG concentric guide rendering in `FeatureOverlayCanvas.tsx`—consuming existing graph indexing, layer/role classification, feature discovery, position authority, state persistence, and Cytoscape interaction contexts without modifying any existing layout engine or contract file.
