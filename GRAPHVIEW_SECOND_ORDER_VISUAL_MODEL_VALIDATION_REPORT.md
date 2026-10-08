# GRAPHVIEW — SECOND-ORDER VISUAL MODEL VALIDATION
# ARCHITECTURE ORBIT + COMPONENT CONSTELLATION
## ADVERSARIAL DESIGN-CONTRACT AUDIT — READ ONLY — NO CODE CHANGES

---

## 1. Executive Verdict

**FINAL DESIGN GATE: B — PROPOSED MODEL PARTIALLY VALID**

The previous audit correctly identified implementation-level defects, dead code paths, overloaded terminology, and position authority leaks in `GraphView`. Specifically, it proved that global `Architecture Orbit` layout execution is 100% bypassed in `architecture-layout.ts` when nodes are present, that two disconnected `Constellation` systems exist without orchestration, and that position coordinates from one layout mode corrupt another.

However, the replacement model proposed by the previous audit (`Architecture Orbit = global radial architectural layers`, `Component Constellation = focal dependency neighborhood`) is **itself conceptually flawed** in key visual and semantic dimensions:

1. **Architecture is Not Inherently Radial:** Forcing a multi-tier enterprise architecture (`Presentation` $\rightarrow$ `Application` $\rightarrow$ `Domain` $\rightarrow$ `Schema`) onto concentric polar rings creates severe inner-ring capacity choking ($R_0, R_1$), forces dynamic radius expansion that degrades responsive canvas scaling, and falsely implies that Presentation components are "semantically central" while Schema components are "peripheral."
2. **Angle Has No Categorical Spatial Semantic:** Assigning feature clusters to angular sectors ($\theta_1 \dots \theta_k$) falsely implies that adjacent angular sectors are semantically "closer" or more related than opposite sectors. Angular distance is purely geometric partitioning, not domain truth.
3. **Single-Focal vs Multi-Sun Are Two Fundamentally Different Questions:** Single-focal $k$-hop dependency neighborhood analysis ("What does component X depend on?") and Multi-Sun shared infrastructure topology analysis ("Which controllers and sObjects are shared across multiple LWC entry points?") represent two distinct analytical questions. Merging them under the overloaded name "Constellation" perpetuates visual ambiguity.
4. **Selections, Focus, and Position Authority Must Be Strictly Uncoupled:** Selection ("I am inspecting this node") must be a presentation-only state. Focus ("Recompute the local graph projection around this node") is an analytical state. User drag overrides must be stored in isolated, view-specific presentation override maps `(layoutMode, nodeId) \rightarrow (\Delta x, \Delta y)` rather than mutating canonical layout truth.

Therefore, the conceptual direction is **Partially Valid**: the uncoupled multi-tier architecture pipeline (`Domain Graph \rightarrow Analytical Projection \rightarrow Visual Layout Projection \rightarrow Rendering \rightarrow Interaction`) is validated and adopted, but the radial visual metaphor for global architecture and the overloaded "Constellation" name must be redesigned and reframed before implementation resumes.

---

## 2. Repository/Product Evidence

Direct inspection of the repository codebase reveals concrete evidence for all core findings:

### Finding 2.1: Phantom / Bypassed Global Architecture Orbit
- **File:** `explorer/src/lib/architecture-layout.ts` (lines 120–135 vs 183–228)
- **Observed Behavior:** When `architectureMode === 'orbit'`, line 120 checks `if (safeNodes.length === 0)` to invoke `computeOrbitLayout` from `orbit-layout.ts`. When `safeNodes.length > 0`, lines 183–228 invoke `adaptComponentOrbit` and `computeComponentOrbitLayout` (a single-focal LWC component view).
- **Code Reference:**
  ```typescript
  // explorer/src/lib/architecture-layout.ts:120-125
  if (safeNodes.length === 0) {
    if (architectureMode === 'orbit') {
      const orbitOutput = computeOrbitLayout({ nodes: [], options: { nodeWidth, nodeHeight } });
      return { positions: { ...existingPositions }, orbitGuides: orbitOutput.guides };
    }
  }
  // explorer/src/lib/architecture-layout.ts:183-186
  const isOrbit = architectureMode === 'orbit';
  if (isOrbit) {
    const projection = adaptComponentOrbit(schemaInput, { focalLwcId: options.focalLwcId });
    const orbitOutput = computeComponentOrbitLayout(projection, { nodeWidth, nodeHeight });
    ...
  }
  ```
- **Semantic Implication:** The entire global architectural-layer radial engine (`orbit-semantics.ts` and `orbit-layout.ts`) is **100% dead code** in the primary `GraphView` layout execution path.

### Finding 2.2: Dual Disconnected Constellation Systems
- **System A (GraphView Multi-Sun Constellation):** `explorer/src/lib/architecture-layout.ts` (lines 137–181) calls `adaptComponentConstellation` and `computeComponentConstellationLayout`. Positions 14 LWC entry points across inner ($R=900\text{px}$) and outer ($R=1760\text{px}$) macro rings on Cytoscape HTML5 canvas.
- **System B (Standalone Lens Constellation):** `explorer/src/components/DependencyConstellationPanel.tsx` imports `adaptConstellation` and `computeConstellationLayout` from `explorer/src/lib/adapters/constellation-adapter.ts` and `explorer/src/lib/layout/constellation-layout.ts`. Renders a single focal node at center $(0,0)$ with $k$-hop concentric circles ($k=1,2,3$) on a custom SVG canvas.
- **Semantic Implication:** Systems A and B share no adapter, no contract, no layout geometry, and no interaction state.

### Finding 2.3: Hardcoded Dataset Identifiers Inside Generic Layout Engine
- **File:** `explorer/src/lib/layout/component-constellation-layout.ts` (lines 233–255)
- **Code Reference:**
  ```typescript
  // explorer/src/lib/layout/component-constellation-layout.ts:233-252
  if (sNode.nodeId === 'ApexClass:MaintenanceRequestController' || sNode.nodeId.includes('MaintenanceRequestController')) {
    const targetSunPos = sunCoords['LWC:vendor-workspace'] || sunCoords['vendor-workspace'];
    if (targetSunPos) {
      const targetDist = 245.62;
      ...
    }
  }
  const isCoLocatedGroup = Math.abs(rawX - (-675.0)) < 1.0 && Math.abs(rawY - (-389.7114)) < 2.0;
  ```
- **Semantic Implication:** Generic layout engine code directly checks string identifiers (`MaintenanceRequestController`, `vendor-workspace`) and raw floating-point coordinates (`-675.0`, `-389.7114`) to fix layout collisions on a single dataset (`pbim`).

### Finding 2.4: Position Authority Leakage Across Layout Mode Switches
- **File:** `explorer/src/components/GraphView.tsx` (lines 497–510) and `explorer/src/lib/architecture-layout.ts` (lines 173–178, 220–225)
- **Observed Behavior:** When switching layout modes (`hierarchical` $\leftrightarrow$ `hybrid` $\leftrightarrow$ `orbit` $\leftrightarrow$ `constellation`), `GraphView.tsx` resolves `nodePositionsRef.current` (positions computed by the *previous* layout mode) via `resolveAuthoritativePosition` and passes them as `existingPositions` into `computeArchitectureLayoutWithMetadata`. In `architecture-layout.ts`, `existingPositions` are preserved for any node not re-placed by the new mode.
- **Semantic Implication:** Stale Cartesian coordinates from one layout mode leak into and corrupt the layout calculations of another layout mode.

---

## 3. What GraphView Is Actually Trying to Communicate

By inspecting `explorer/src/registry/workspace-registry.ts`, `ViewModeSwitcher.tsx`, `GraphControls.tsx`, `InvestigationDrawer.tsx`, and `explorer-data.json` domain schemas, we derive the primary user questions GraphView is designed to answer:

| User Question | Information Required | Graph/Data Property Required | Current Visualization | Does Current Viz Actually Answer It? |
|---|---|---|---|---|
| **Q1: How is the overall system structured into layers?** | Architectural tier membership (`Presentation`, `App`, `Domain`, `Schema`) | `node.layer` / `node.type` | Hierarchical / Orbit / Hybrid | **Partially.** Hierarchical answers it cleanly; Orbit distorts layer order into radial rings. |
| **Q2: Which components belong to which functional business features?** | Feature cluster grouping and domain assignment | `discoverFeatures()` / `discoverDomains()` | Hybrid / Subway / Matrix | **Yes.** Hybrid and Matrix communicate feature boundaries well. |
| **Q3: What are the direct dependencies and dependents of component X?** | 1-hop upstream fan-in and downstream fan-out | Directed edge list connected to node X | Investigation Drawer / Four-Direction / Orbit | **Yes.** Four-Direction and Investigation Drawer provide direct 1-hop clarity. |
| **Q4: What is the full transitive impact neighborhood ($k$-hop) if component X changes?** | $k$-hop transitive BFS reachability sub-graph ($k=1,2,3$) | BFS traversal depth from root X | Dependency Constellation Panel / Component Orbit | **Yes.** Single-focal $k$-hop radial lens answers this truthfully. |
| **Q5: Which controllers, services, and sObjects are shared across multiple LWC entry points?** | Multi-root shared infrastructure and cross-LWC coupling | Shared node set referenced by $N \ge 2$ LWC roots | GraphView Constellation (Multi-Sun) | **Partially.** Hardcoded placement rules obscure generic shared infrastructure analysis. |
| **Q6: Where are the architectural risk hotspots and circular dependency loops?** | Cycle detection, high fan-in hubs, un-tested components | `cycles`, `metrics.coupling`, `intelligence.rules` | Hotspots / Findings / Diagnostics | **Yes.** Dedicated surface panels answer this clearly. |

---

## 4. Validation of the Previous Audit's Proposed Model

The previous audit proposed the following architectural pipeline:

$$\text{DOMAIN / GRAPH TRUTH} \longrightarrow \text{SEMANTIC PROJECTION} \longrightarrow \text{LAYOUT-SPECIFIC GEOMETRY} \longrightarrow \text{RENDERING} \longrightarrow \text{INTERACTION}$$

and proposed the broad visual mappings:
- **Architecture Orbit** = global architectural-layer visualization across concentric radial rings and feature sectors.
- **Component Constellation** = focal component dependency-neighborhood visualization.

### Evaluation of the Proposed Pipeline Architecture
- **VALIDATION: PASSED.** The 5-stage pipeline cleanly enforces separation of concerns. Pure graph data is never mutated by layout routines, and rendering consumes computed geometry without re-calculating graph topology.

### Evaluation of "Architecture Orbit = Global Architectural Radial Rings"
- **VALIDATION: REJECTED.** Forcing global enterprise architecture onto concentric radial circles creates severe structural and semantic misrepresentations (detailed in Sections 5, 6, and 7). Radial distance falsely implies quantitative depth, and angular sectors falsely imply angular proximity between unrelated features.

### Evaluation of "Component Constellation = Focal Dependency Neighborhood"
- **VALIDATION: REJECTED AS NAMING / REFRAMED AS CONCEPT.** The single-focal $k$-hop radial projection is semantically sound for local neighborhood analysis. However, calling it "Constellation" creates collision and confusion with Multi-Sun cross-entry-point shared infrastructure mapping. Single-focal $k$-hop radial layout should be named **Focal Dependency Neighborhood Lens**, while Multi-Sun shared mapping should be named **Shared Infrastructure Topology Lens**.

---

## 5. Architecture Orbit — First-Principles Verdict

### Is Architecture Actually Radial?
**NO.** Software architecture across enterprise web applications (e.g., Salesforce Apex/LWC codebases) is fundamentally a Directed Acyclic Graph (DAG) with explicit top-to-bottom or left-to-right dependency flow:

$$\text{Presentation (LWC)} \longrightarrow \text{Application (Controller)} \longrightarrow \text{Domain (Service/Logic)} \longrightarrow \text{Schema (SObject / DB)}$$

Mapping a directed multi-tier hierarchy onto concentric radial circles introduces three critical geometric distortions:

1. **Inner-Ring Capacity Overcrowding:** Inner rings ($R_0, R_1$) have small physical circumferences ($C = 2\pi R$). When the Presentation or Application layer contains high node counts ($N > 30$), inner rings choke, requiring dynamic radius expansion or multi-track radial spacing that expands canvas width beyond 2,000px and degrades responsive viewport zoom down to $0.45\times$.
2. **Inverted Semantic Center:** In radial polar space, the origin $(0,0)$ is physically dominant and perceived as the "core." Placing Presentation at $R_0$ implies user interfaces are the core foundation of an enterprise system, while Database Schema is peripheral. Conversely, placing Schema at $R_0$ inverts the natural top-down dependency flow directions.
3. **Alternative Representation Comparison:**

| Representation | Communicates Flow? | Scalability | Capacity Bottleneck | Semantic Truthfulness |
|---|---|---|---|---|
| **Concentric Radial Rings (Orbit)** | Poor (directed edges curve/wrap) | Low ($O(N)$ capacity per ring) | Severe choke at inner rings | Low (implies radial distance/center) |
| **Layered Directed Graph (Hierarchical)** | Excellent (top-down or left-right) | High (linear horizontal band expansion) | None (unbounded band width) | High (direct representation of DAG) |
| **Orthogonal Feature-Layer Matrix (Hybrid)** | Excellent (explicit 2D grid) | High (structured grid cells) | None (2D spatial grid) | High (uncouples layer Y from feature X) |
| **Macro Dependency River (Sankey Flow)** | Excellent (weighted volume flows) | Very High (aggregated bundle bands) | None (proportional flow width) | Very High (shows structural coupling weight) |

---

## 6. Architecture Orbit — Metaphor Honesty Test

If an engineer views Architecture Orbit without reading documentation, what do they naturally infer from the geometry versus actual domain semantics?

| Visual Cue | Natural User Inference | Actual Domain Semantics | Metaphor Honesty |
|---|---|---|---|
| **Node placed at Center $(0,0)$** | "This component is the central, most critical core of the system." | Node happens to belong to $R_0$ Presentation layer or was chosen as focal LWC. | **MISLEADING** |
| **Nodes placed in Inner Ring vs Outer Ring** | "Inner nodes are core logic; outer nodes are peripheral add-ons." | Inner nodes are presentation/UI; outer nodes are database schema and supporting utilities. | **MISLEADING** |
| **Two nodes placed at similar angles $(\theta_1 \approx \theta_2)$** | "These components are closely related or belong to the same domain." | Nodes were placed in adjacent angular sectors during sector partitioning. | **MISLEADING** |
| **Two nodes placed at opposite angles $(\theta_1 \approx \theta_2 + 180^\circ)$** | "These components are opposite or completely unrelated." | Sector ordering placed feature A at $0^\circ$ and feature B at $180^\circ$; they may share common sObjects. | **MISLEADING** |
| **Concentric circle guide lines** | "Represents distance, radius, or threshold boundary." | Arbitrary geometric track boundaries ($R_k = R_0 + k \cdot \Delta R$). | **DECORATIVE / MISLEADING** |

---

## 7. Architecture Orbit — Ring and Angle Validity

### 7.1 Ring Semantics: Ordered Distance vs Categorical Layers
Does architectural layer have an intrinsic ordered distance?
**NO.** The transition from `Presentation` to `Application` is a categorical layer boundary, not a uniform numeric distance metric. Setting radial distances to $R_0 = 900\text{px}$, $R_1 = 1150\text{px}$, $R_2 = 1400\text{px}$ ($\Delta R = 250\text{px}$) falsely implies a quantitative metric space where Euclidean distance between rings carries scalar weight.

### 7.2 Angle Semantics: Spatial Position vs Categorical Feature Membership
Is feature membership categorical or spatial?
**Categorical.** Feature membership is a set classification (`Feature_A`, `Feature_B`). Mapping categorical features to polar angles ($\theta_k \in [0, 2\pi)$) forces an artificial linear angular ordering ($\theta_1 < \theta_2 < \dots < \theta_k$).
- **Angular Adjacency Fallacy:** Sector at $355^\circ$ is physically adjacent to sector at $5^\circ$ due to $2\pi$ wrap-around, falsely implying high domain similarity between two arbitrarily ordered feature clusters.
- **Angle must be treated purely as a geometric layout arrangement variable, NEVER as a persistent semantic truth.**

---

## 8. Feature Cluster Validity

An audit of `discoverFeatures()` in `explorer/src/lib/layout/features.ts` evaluates feature clustering across 8 mandatory criteria:

1. **Evidence for Feature Determination:** Seed component identification (`LWC`, `Trigger`, `Controller`) combined with BFS reachability traversal and role classification (`classifyFeatureRole`).
2. **Determinism:** 100% deterministic when input nodes and edges are sorted lexicographically by ID.
3. **Stability Across Datasets:** Low stability. Naming convention changes or edge additions cause feature seeds to shift or merge across datasets.
4. **Explainability to Users:** Low to Moderate. Users see auto-generated names like `feature_MaintenanceRequestController` without explicit business domain metadata.
5. **Domain Truth vs Heuristic Inference:** **Heuristic Inference.** Salesforce metadata schemas do not natively contain a "Feature" object; feature clusters are entirely derived by graph analysis heuristics.
6. **Accidental Grouping of Unrelated Components:** High risk. A shared utility class (e.g., `LoggerUtil` or `DatabaseAdapter`) causes BFS reachability to bridge and merge two completely unrelated business features into a single massive cluster.
7. **Feature Spanning Across Layers:** A single feature cluster naturally spans Presentation (LWC), Application (Controller), Domain (Service), and Schema (sObject).
8. **Multi-Feature Belonging:** A component can be referenced by multiple features (primary vs secondary assignment). Spatial layout algorithms require 1 primary cluster placement per node, forcing artificial tie-breaking.

**Conclusion:** Feature clustering is an analytical heuristic projection, **NOT an absolute domain truth**. It must NEVER be enforced as a rigid spatial constraint in global layout engines.

---

## 9. Component Constellation — First-Principles Verdict

### Why Represent Dependency Neighborhoods as a Constellation?
"Constellation" is an aesthetic metaphor. In reality, a local dependency neighborhood is a **Radial $k$-Hop Transitive Neighborhood Graph** centered on a subject component ($k=0$) with concentric rings representing transitive graph hop distances ($k=1, 2, 3$).

When restricted to a single focal component, radial distance $r_k = k \cdot \Delta R$ is **semantically honest**: $r_k$ directly measures shortest-path transitive graph hop distance from the focal node.

### Single-Focal vs Multi-Sun: Are They Different Questions?
**YES. They answer two completely different analytical questions:**

```text
SINGLE-FOCAL NEIGHBORHOOD LENS
"What does component X depend on, and what depends on component X up to k hops?"
  - Primary axis: Transitive graph hop distance (k = 0, 1, 2, 3)
  - Topology: Single-rooted radial tree/DAG
  - Focal Center: Exactly 1 selected component

MULTI-SUN SHARED INFRASTRUCTURE LENS
"Which shared controllers, services, and sObjects are referenced across multiple LWC entry points?"
  - Primary axis: Cross-entry-point coupling and shared node fan-in
  - Topology: Multi-rooted bipartite/hypergraph mapping
  - Focal Center: N >= 2 LWC entry point hubs ("Suns")
```

Merging these two distinct analytical questions under the single overloaded name "Constellation" is the primary source of conceptual confusion in GraphView. They must be formally separated into two distinct analytical lenses.

---

## 10. Selection vs Focus

GraphView must explicitly separate **Selection** from **Focus** as distinct runtime concepts:

```text
SELECTION ("I am inspecting this node")
  - Scope: Presentation & Inspector state
  - Action: Highlights direct 1-hop edges, populates Investigation Drawer
  - Layout Impact: ZERO layout reallocation (node positions remain fixed)
  - Authority: SelectionContext / useGraphSelection

FOCUS ("Recompute the visualization around this node")
  - Scope: Analytical projection state
  - Action: Sets node as focal root, filters graph to k-hop neighborhood, recomputes radial layout
  - Layout Impact: Recomputes local neighborhood geometry
  - Authority: InvestigationContext / focalNodeId
```

---

## 11. Visibility vs Analytical Scope

GraphView must explicitly distinguish **Presentation Filtering** from **Analytical Scope Filtering**:

```text
PRESENTATION FILTERING ("Hide/dim matching nodes")
  - Purpose: Visual search and pattern matching (e.g. filter by name "Order")
  - Behavior: Decreases opacity or hides non-matching nodes visually
  - Layout Impact: ZERO position recalculation; preserves global spatial context

ANALYTICAL SCOPE FILTERING ("Recompute sub-graph layout")
  - Purpose: Domain isolation (e.g. analyze ONLY the "Billing" domain sub-graph)
  - Behavior: Filters canonical graph nodes/edges prior to layout engine execution
  - Layout Impact: Re-executes layout engine on the reduced sub-graph
```

---

## 12. Position Authority — Deeper Validation

Should position ever be persistent semantic state at all?

### Model Evaluation:
- **Model A (Pure Functional):** $\text{Graph Data} \rightarrow \text{Layout} \rightarrow \text{Position}$. (Clean, but prevents user custom arrangement).
- **Model B (State Leakage):** $\text{Graph Data} \rightarrow \text{Layout} \rightarrow \text{User Drag} \rightarrow \text{Persisted Position}$. (Current state: causes stale positions from Hierarchical mode to corrupt Orbit/Constellation modes).
- **Model C (Canonical Layout + Presentation Overrides):**
  $$\text{Semantic Projection} \longrightarrow \text{Canonical Layout Position} \oplus \text{User Presentation Override Map}$$

**Model C is the ONLY semantically correct model.**
- Canonical layout positions $(x_{\text{canon}}, y_{\text{canon}})$ are computed purely deterministically per layout mode and are NEVER mutated by user interactions or persisted as graph metadata.
- User drag interactions create an optional presentation override offset map:
  $$\text{UserDragMap}: (\text{layoutMode}, \text{nodeId}) \longrightarrow (\Delta x, \Delta y)$$
- User drag offsets apply ONLY to the active layout mode and are completely cleared or isolated when switching layout modes.

---

## 13. Camera vs Graph Position State Taxonomy

GraphView state must be strictly categorized into four independent layers:

```text
1. DOMAIN GRAPH STATE (Immutable)
   - nodes: ExplorerNode[]
   - edges: ExplorerEdge[]

2. ANALYTICAL PROJECTION STATE (Domain / Focus / Filter)
   - activeLensMode: WorkspaceViewMode ('graph', 'subway', 'constellation', 'matrix', etc.)
   - focalNodeId: string | null
   - analysisScopeFilter: GraphFilterOptions

3. CANONICAL LAYOUT GEOMETRY STATE (Computed, Non-Persisted)
   - canonicalPositions: Record<string, { x: number, y: number }>
   - guideOverlayMetadata: OrbitGuide[] | FeatureRegion[]

4. PRESENTATION & VIEWPORT STATE (Volatile / User Interaction)
   - selectedNodeId: string | null
   - hoveredNodeId: string | null
   - userDragOverrides: Record<LayoutMode, Record<string, { dx: number, dy: number }>>
   - cameraViewport: { zoom: number, panX: number, panY: number }
```

Camera viewport state (`zoom`, `pan`) belongs purely to rendering and must NEVER influence canonical layout geometry calculations.

---

## 14. Stability Requirements

GraphView layout projections must satisfy six explicit stability guarantees:

1. **Identity Stability:** Node ID is immutable and persistent across all lenses and layout modes.
2. **Semantic Stability:** Node layer and type classifications are deterministic functions of domain schema.
3. **Relative Stability:** Small topology edits or filter changes must preserve relative spatial adjacency of unaffected nodes.
4. **Positional Stability:** Switching between interactive and static modes must preserve exact screen coordinates without drift ($0.00000\text{px}$ drift requirement).
5. **Ordering Stability:** Lexicographical tie-breaking guarantees deterministic node ordering across 10x execution shuffles.
6. **Structural Stability (Incremental Change):** Adding 1 component to a graph of $N$ nodes must adjust local positions incrementally, without triggering a global angular or layer reshuffle of unrelated sub-graphs.

---

## 15. Counterexample Results

Testing proposed visual models against 10 critical edge cases:

| Case | Scenario | Current / Proposed Orbit Model Behavior | Verdict & Correct Model Behavior |
|---|---|---|---|
| **Case A** | 2 unrelated components in same feature | Forces components into same angular sector, falsely implying close functional coupling. | **FAIL.** Angular sectoring must not imply functional coupling. |
| **Case B** | 2 strongly dependent components in different features | Places components in opposite angular sectors ($0^\circ$ vs $180^\circ$), stretching edge across canvas. | **FAIL.** Directed DAG / flow layout keeps dependent components aligned. |
| **Case C** | 1 component in multiple architectural layers | Forces single ring placement, breaking multi-layer participation semantics. | **FAIL.** Node represented in primary layer; cross-layer edges show multi-layer role. |
| **Case D** | 1 shared service used by many LWCs | Multi-Sun Constellation places service at centroid; causes severe node crowding if 10+ LWCs share it. | **FAIL.** Deterministic radial/tangent displacement prevents crowding. |
| **Case E** | Disconnected subgraphs | Radial Orbit forces disconnected subgraphs onto outer rings around a single focal center. | **FAIL.** Subgraphs placed in parallel horizontal/vertical canvas bands. |
| **Case F** | Enormous dependency hub ($N > 50$) | Radial $k=1$ ring chokes due to $2\pi R$ chord capacity limit. | **FAIL.** Dynamic multi-track expansion ($T=2, T=3$) required. |
| **Case G** | Graph with only 3 nodes | Radial Orbit draws huge guide circles and sector arcs for 3 nodes, creating decorative clutter. | **FAIL.** Minimalist radial or simple tree without guide clutter. |
| **Case H** | Graph with 500+ nodes | Radial Orbit inner rings choke ($R_0, R_1$), outer rings expand beyond 3,000px width. | **FAIL.** Hierarchical DAG / Matrix view handles 500+ nodes cleanly. |
| **Case I** | Node selected but not intended as focus | Previous model recomputed entire layout around selected node. | **FAIL.** Selection highlights edges only; layout remains static. |
| **Case J** | Node hidden while dependencies remain visible | Hiding node broke layout calculation or collapsed connected edges. | **FAIL.** Hidden nodes removed from rendering while edge paths bridge cleanly. |

---

## 16. Alternative Visualization Models

We generate and evaluate three competing visualization models for GraphView:

### Model 1 — Current / Proposed Radial Orbit & Overloaded Constellation
- Global architectural layers mapped to concentric radial circles ($R_0 \dots R_5$) with feature angular sectors.
- Single-focal $k$-hop and Multi-Sun shared infrastructure merged under overloaded "Constellation" name.

### Model 2 — Alternative Architecture Visualization: Layered Architectural Flow Map (Hybrid DAG)
- Global architecture mapped to orthogonal horizontal layer bands (`Presentation`, `Application`, `Domain`, `Schema`).
- Features mapped to vertical domain columns. Topology rendered as top-to-bottom directed DAG flow.

### Model 3 — Alternative Component / Dependency Visualization: Dual Lens Architecture
- **Lens 3A (Focal Dependency Neighborhood Lens):** Single-focal $k$-hop transitive BFS radial graph for local component investigation.
- **Lens 3B (Shared Infrastructure Topology Lens):** Multi-root entry-point mapping with explicit centroid geometry and shared sObject/controller placement.

---

## 17. Comparative Model Decision Matrix

| Criterion | Model 1 (Current Radial Orbit) | Model 2 (Layered Architectural Flow) | Model 3 (Dual Lens Architecture) |
|---|---|---|---|
| **Semantic Honesty** | Low (falsely implies radial depth/center) | Very High (direct DAG flow representation) | High (honestly represents $k$-hop & shared nodes) |
| **User Comprehension** | Low (confusing center & angular sectors) | High (intuitive top-down architecture bands) | High (clear single-focal vs multi-sun purpose) |
| **Stability** | Low (inner ring choking forces radius shifts) | High (linear horizontal band expansion) | High (deterministic $k$-hop concentric rings) |
| **Scalability ($N > 500$)** | Poor ($2\pi R$ capacity choke) | High (unbounded band width) | Moderate (bounded by $k \le 3$ hop filter) |
| **Determinism** | High ($0.00000\text{px}$ drift) | High ($0.00000\text{px}$ drift) | High ($0.00000\text{px}$ drift) |
| **Relationship Visibility** | Poor (curved edges across sectors) | High (straight downward directed edges) | High (radial star-burst edge paths) |
| **Architectural Visibility** | Poor (inverted presentation/schema) | Excellent (explicit layer bands & domains) | N/A (local/shared focus, not global) |
| **Dependency Visibility** | Moderate (cluttered in dense rings) | High (clear hierarchical chains) | Excellent (direct $k$-hop transitive path) |
| **Interaction Clarity** | Low (selection mutates layout) | High (selection highlights, drag overrides) | High (explicit focal selection button) |
| **Implementation Complexity** | High (complex polar track math) | Moderate (13-stage hierarchical DAG) | Moderate (clean radial BFS & centroid math) |

---

## 18. Minimum Required Semantic Model

Proving field-by-field necessity for the canonical node semantic contract:

| Field | Why Needed? | Which Viz Uses It? | Domain Truth or Derived? | Authority Owner | Can Change? | If Unavailable? |
|---|---|---|---|---|---|---|
| `id` | Unique node identifier | All | Domain Truth | Schema / Backend | No | Fatal Error |
| `displayName` | Human-readable UI label | All rendering | Domain Truth | Schema / Backend | No | Fallback to `id` |
| `type` | Component role (`ApexClass`, `LWC`, `SObject`) | Layer classification | Domain Truth | Schema / Backend | No | Fallback to `External` |
| `layer` | Architectural layer (`presentation` $\dots$ `schema`) | Hierarchical / Hybrid | Derived | Layer Classifier | Yes (on rule change) | Default to `domain` |
| `domain` | Business subsystem assignment | Hybrid / Matrix | Derived | Domain Classifier | Yes | Default to `Unassigned` |
| `risk` | Vulnerability / quality risk rating | Findings / Inspector | Derived | Intelligence Engine | Yes | Default to `LOW` |
| `metrics` | Fan-in, fan-out, coupling score | Profile / Radar / Inspector | Derived | Metrics Analyzer | Yes | Default to `0` |

---

## 19. Analytical Projection Model

GraphView analysis must be structured as pure functional projections that accept the immutable canonical graph and return analytical metadata:

```typescript
// Pure Analytical Projection Functions
export interface ArchitectureProjection {
  layers: Map<ArchitectureLayer, ExplorerNode[]>;
  domains: Map<string, ExplorerNode[]>;
  crossDomainEdges: ExplorerEdge[];
}

export interface DependencyProjection {
  focalNodeId: string;
  maxHopDistance: number;
  hopNodes: Map<number, ExplorerNode[]>; // k -> nodes
  subgraphEdges: ExplorerEdge[];
}

export interface SharedInfrastructureProjection {
  sunNodes: ExplorerNode[]; // LWC root containers (N = 14)
  sharedNodes: Array<{
    node: ExplorerNode;
    referencingSunIds: string[];
    centroidRaw: { x: number; y: number };
  }>;
  localNodes: Map<string, ExplorerNode[]>; // sunId -> local nodes
}
```

---

## 20. Layout Projection Model

Layout projections consume analytical projections and viewport constraints to compute Cartesian coordinates without mutating graph state:

```typescript
export interface LayoutProjectionResult {
  positions: Record<string, { x: number; y: number }>;
  guides?: Array<{ type: 'circle' | 'band' | 'line'; metadata: Record<string, any> }>;
  projectedNodeIds: Set<string>;
}

// Pure Layout Function Signature
export type LayoutEngine = (
  projection: ArchitectureProjection | DependencyProjection | SharedInfrastructureProjection,
  options: LayoutOptions
) => LayoutProjectionResult;
```

---

## 21. Final Authority Matrix

| Concept | Domain Authority | Analytical Authority | Layout Authority | Interaction Authority |
|---|---|---|---|---|
| **Node Identity (`id`)** | Schema / Data (`explorer-data.json`) | None | None | None |
| **Relationship (`source`, `target`)** | Schema / Data (`explorer-data.json`) | None | None | None |
| **Architecture Layer** | Schema (`type`) | `classifyNodeLayer()` | None | None |
| **Feature Membership** | None | `discoverFeatures()` | None | None |
| **Dependency Depth ($k$)** | None | `computeGraphDepth()` | None | None |
| **Focus Node (`focalNodeId`)** | None | `InvestigationContext` | None | User Click / Cmd+K |
| **Selection Node (`selectedNodeId`)** | None | None | None | `SelectionContext` / User Click |
| **Visibility Filter (`filterQuery`)** | None | `search-filter.ts` | None | User Input |
| **Node Position $(x, y)$** | None | None | Layout Engine (`architecture-layout.ts`) | User Drag Override Map |
| **Camera Viewport (`zoom`, `pan`)** | None | None | None | Renderer (`Cytoscape` / `SVG`) |

---

## 22. Non-Negotiable GraphView Principles

1. **Semantic Truth Over Aesthetic Metaphor:** Visual geometry must communicate true domain relationships. Proximity, radius, and angle must never mislead the user.
2. **Layout Engines Must Never Mutate Graph Data:** Layout routines are pure functions taking graph data and returning coordinate maps.
3. **Selection and Focus Are Strictly Separated:** Selection is presentation-only (inspecting properties). Focus is analytical (recomputing local graph projections).
4. **Visibility Filtering Does Not Reallocate Layout:** Hiding nodes dims or hides elements visually; canonical layout positions remain fixed.
5. **Position Authority Is Layered and Isolated:** Canonical layout positions are computed deterministically per mode. User drag offsets apply ONLY as presentation overrides for the active mode.
6. **Different Lenses Consume Different Analytical Projections:** Global architecture views consume `ArchitectureProjection`; local neighborhood views consume `DependencyProjection`.
7. **Zero Dataset-Specific Identifiers in Generic Code:** Generic layout engines must NEVER hardcode dataset string IDs or coordinate numbers.
8. **10x Determinism Guarantee:** All layout projections must yield $0.00000\text{px}$ coordinate drift across 10x execution shuffles.

---

## 23. Visualization Decisions

For each visualization in the GraphView suite, we assign exactly one final verdict:

| Visualization | Decision | Justification |
|---|---|---|
| **Architecture Orbit** | **REPLACE** | Replace global radial Orbit with **Layered Architectural Flow Map** (or Reframe as an optional secondary radial overview). Radial geometry falsely implies quantitative depth and choking occurs on inner rings. |
| **Component Constellation** | **REFRAME** | Disambiguate the overloaded name "Constellation" and formally split into two clean visual lenses (Single-Focal vs Multi-Sun). |
| **Component Orbit** | **MERGE** | Merge dead/bypassed Component Orbit into the Single-Focal Local Neighborhood Lens. |
| **Single-Focal Constellation** | **KEEP — REDESIGN CONTRACT** | Keep as **Focal Dependency Neighborhood Lens** (`constellation` lens in registry). Uses clean $k$-hop radial BFS graph projection. |
| **Multi-Sun Constellation** | **KEEP — REDESIGN CONTRACT** | Keep as **Shared Infrastructure Topology Lens** in GraphView. Uses clean multi-root centroid math and generic AABB clearance without hardcoded strings. |

---

## 24. Correct GraphView Conceptual Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CANONICAL DOMAIN GRAPH                          │
│                (explorer-data.json: nodes, edges)                      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     ANALYTICAL PROJECTION LAYER                        │
│  ├─ ArchitectureProjection    (Layer bands & Domain columns)           │
│  ├─ DependencyProjection      (k-hop Transitive BFS graph)             │
│  └─ SharedInfrastructureProj  (Multi-Sun entry points & shared nodes)  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       LAYOUT PROJECTION LAYER                          │
│  ├─ Hierarchical / Hybrid DAG Engine (Orthogonal Layer Bands)          │
│  ├─ Focal Neighborhood Engine        (Radial k-hop Circles)            │
│  └─ Shared Infrastructure Engine     (Multi-Centroid Placement)        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      VIEWPORT & PRESENTATION LAYER                     │
│  ├─ Canvas Renderers (Cytoscape HTML5 Canvas / Custom SVG)             │
│  ├─ Presentation Overrides: UserDragMap (modeId, nodeId) -> (dx, dy)   │
│  └─ Viewport State: Camera (zoom, pan), Selection, Hover Highlights    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 25. What Must NOT Be Implemented Yet

Before implementation resumes, the following actions are strictly prohibited:

1. **DO NOT** write or modify any layout code in `architecture-layout.ts`, `orbit-layout.ts`, or `component-constellation-layout.ts`.
2. **DO NOT** attempt to patch or fix hardcoded strings in `component-constellation-layout.ts` until the generic shared node placement contract is frozen.
3. **DO NOT** re-enable `computeOrbitLayout` in `architecture-layout.ts` without explicit contract reframing.
4. **DO NOT** persist node positions globally across layout mode switches.
5. **DO NOT** merge Single-Focal and Multi-Sun constellation adapters into a single file.

---

## 26. Final Design Gate

**CHOSEN DESIGN GATE: B — PROPOSED MODEL PARTIALLY VALID**

### Justification:
The previous audit's structural diagnosis was 100% accurate regarding code bugs, bypassed layout engines, overloaded terms, hardcoded dataset strings, and position leaks. Furthermore, its proposed multi-tier execution pipeline (`Domain \rightarrow Projection \rightarrow Layout \rightarrow Render \rightarrow Interaction`) is validated and adopted.

However, its proposed replacement model (`Architecture Orbit = global radial architectural layers`, `Component Constellation = focal dependency neighborhood`) requires redesign and reframing. Global enterprise architecture is a directed DAG best represented by layered flow maps, and Single-Focal vs Multi-Sun analyses must be formally uncoupled into separate, dedicated visual lenses.

---

## 27. Evidence Index

| Finding / Topic | Repository Location | Code / Test Reference |
|---|---|---|
| **Bypassed Global Orbit Engine** | `explorer/src/lib/architecture-layout.ts` | Lines 120–135, 183–228 (`safeNodes.length === 0` check) |
| **Standalone Constellation SVG Lens** | `explorer/src/components/DependencyConstellationPanel.tsx` | Lines 1–150 (`adaptConstellation`, `computeConstellationLayout`) |
| **Multi-Sun GraphView Constellation** | `explorer/src/lib/adapters/component-constellation-adapter.ts` | Lines 1–120 (14 LWC macro inner/outer rings) |
| **Hardcoded PBIM Dataset Strings** | `explorer/src/lib/layout/component-constellation-layout.ts` | Lines 233–255 (`MaintenanceRequestController`, `vendor-workspace`) |
| **Position Authority Leakage** | `explorer/src/components/GraphView.tsx` | Lines 497–510 (`resolveAuthoritativePosition` passing stale positions) |
| **Feature Discovery Heuristics** | `explorer/src/lib/layout/features.ts` | Lines 1–120 (`discoverFeatures`, `isFeatureSeedCandidate`) |
| **Workspace Lens Registry** | `explorer/src/registry/workspace-registry.ts` | Lines 1–200 (`LENS_REGISTRY`, `SURFACE_REGISTRY`) |
| **Domain Router Mapping** | `explorer/src/lib/router/domain-mapping.ts` | Lines 1–80 (`WORKSPACE_DOMAINS`) |

---

## 28. Absolute Final Question Answer

> **If we deleted every existing Orbit and Constellation layout algorithm today and rebuilt GraphView from the raw graph data, what would be the most truthful visual questions to answer, and what should each visualization encode to answer those questions without misleading the user?**

### Answer:
If every existing Orbit and Constellation layout algorithm were deleted today, GraphView should answer exactly **three fundamental, semantically truthful visual questions**:

#### 1. Global Architectural Structure Question:
> *"How is the entire enterprise codebase organized across architectural layers and functional business domains?"*
- **Truthful Visual Encoding:** **Layered Architectural Flow Map (Hierarchical / Hybrid DAG)**.
  - **Vertical Axis ($Y$):** Architectural Layer (`Presentation` $\rightarrow$ `Application` $\rightarrow$ `Domain` $\rightarrow$ `Schema`). Communicates explicit top-down dependency flow.
  - **Horizontal Axis ($X$):** Functional Business Domain (`Billing`, `Inventory`, `Support`, etc.).
  - **Edges:** Directed arrows showing exact dependency calls downward.
  - **Why this does NOT mislead:** Uses linear Euclidean axes where $Y$ represents ordered layer flow and $X$ represents domain separation, avoiding radial capacity choke and false angular proximity.

#### 2. Local Impact & Neighborhood Question:
> *"What is the exact transitive dependency impact neighborhood ($k$-hop) centered around component X?"*
- **Truthful Visual Encoding:** **Focal Dependency Neighborhood Lens**.
  - **Origin $(0,0)$:** Exactly 1 selected focal component X ($k=0$).
  - **Concentric Circles ($R_k = k \cdot \Delta R$):** Transitive graph hop distance ($k = 1, 2, 3$).
  - **Angular Placement ($\theta$):** Uniformly distributed around circle to maximize node label readability.
  - **Edges:** Outward/inward radial star-burst paths.
  - **Why this does NOT mislead:** Radial distance $r$ directly measures shortest-path transitive graph hop count $k$, making radius a mathematically honest representation of topological distance from component X.

#### 3. Shared Infrastructure & Coupling Question:
> *"Which underlying controllers, services, and sObjects are shared across multiple top-level entry points (LWCs)?"*
- **Truthful Visual Encoding:** **Shared Infrastructure Topology Lens**.
  - **Entry Point Hubs ("Suns"):** Top-level LWC entry points positioned on outer entry boundaries or designated root tracks.
  - **Shared Nodes:** Positioned at the deterministic geometric centroid of their referencing entry points, with deterministic radial/tangent displacement for AABB collision clearance.
  - **Unshared Local Nodes:** Positioned in local radial clusters adjacent to their parent entry point.
  - **Why this does NOT mislead:** Centroid position directly communicates shared ownership across entry points without hardcoded strings or artificial layer distortion.
