# GRAPHVIEW — ARCHITECTURE ORBIT + COMPONENT CONSTELLATION
# FUNDAMENTAL PRINCIPLES & MODEL AUDIT REPORT
## READ-ONLY ADVERSARIAL AUDIT — NO CODE CHANGES

---

## 1. Executive Verdict

**FINAL DECISION GATE: C — FOUNDATION UNSOUND**

The current `GraphView` conceptual model for **Architecture Orbit** and **Component Constellation** is built on overloaded visual metaphors, competing and un-orchestrated layout algorithms, overloaded spatial dimensions, hardcoded dataset-specific domain identifiers, and broken position authority rules.

Specifically, the audit uncovered the following critical architectural findings:

1. **Phantom / Bypassed Architecture Orbit Execution:** In `explorer/src/components/GraphView.tsx` and `explorer/src/lib/architecture-layout.ts`, setting `architectureMode === 'orbit'` does **NOT** run the global full-graph Architecture Orbit engine (`projectOrbitSemantics` / `computeOrbitLayout` in `orbit-semantics.ts` and `orbit-layout.ts`). Instead, `architecture-layout.ts` delegates `architectureMode === 'orbit'` to `adaptComponentOrbit` and `computeComponentOrbitLayout`—which is a single-focal LWC component dependency depth view! Global Architecture Orbit code is **100% dead/bypassed code** in the primary GraphView layout path.
2. **Disconnected Dual Constellation Systems:** "Constellation" exists as two completely separate, un-orchestrated implementations in the repository:
   - **System A:** Multi-Sun 14-LWC Macro Constellation layout inside GraphView (`adaptComponentConstellation` + `computeComponentConstellationLayout` in `architecture-layout.ts`).
   - **System B:** Single-Focal k-hop BFS radial lens inside `DependencyConstellationPanel.tsx` (`adaptConstellation` + `computeConstellationLayout` in `constellation-adapter.ts` and `constellation-layout.ts`).
   Systems A and B share no adapter, no contract, no layout geometry, and no interaction state.
3. **Overloaded & Contradictory Spatial Dimensions:** The terms "Orbit", "Ring", and "Radius ($r$)" represent three completely different, mutually exclusive concepts depending on which file is executing:
   - In `orbit-semantics.ts`: Ring = Architectural Layer (0=Presentation to 5=Supporting).
   - In `component-orbit-adapter.ts` & `constellation-adapter.ts`: Ring = Transitive Graph Hop Distance from a focal node ($k = 0, 1, 2, \dots$).
   - In `component-constellation-adapter.ts`: Macro Ring = LWC Root Tier (Inner 6 Root Containers at $R=900\text{px}$ vs Outer 8 Standalone Roots at $R=1760\text{px}$).
4. **Hardcoded Dataset Identifiers inside Layout Engine:** Core library layout code in `explorer/src/lib/layout/component-constellation-layout.ts` (lines 180–225) contains hardcoded string references to `'ApexClass:MaintenanceRequestController'`, `'LWC:vendor-workspace'`, and coordinate `(-675.0, -389.7114)` to force spatial clearance on a single fixture (`pbim`). Domain data facts and dataset-specific strings are directly baked into generic layout geometry algorithms!
5. **Position Authority Corruption & State Leakage:** When switching layout modes (`hierarchical` $\leftrightarrow$ `hybrid` $\leftrightarrow$ `orbit` $\leftrightarrow$ `constellation`), `GraphView.tsx` passes `nodePositions` (positions calculated by the *previous* layout mode) as `existingPositions` into the *new* layout mode. Because `architecture-layout.ts` treats `existingPositions` as authoritative if `hasAuthoritativePositions` is true, stale Cartesian coordinates from one layout mode leak into and corrupt the layout calculations of another mode.

Because these problems stem from fundamental conceptual contradictions rather than minor rendering bugs, the foundation is declared **UNSOUND**. Implementation work, polishing, and bug-fixing must be halted until a unified, principles-first semantic contract is adopted.

---

## 2. What GraphView Is Actually Modeling

Based on direct inspection of the codebase vs first-principles modeling, GraphView currently answers the 16 primary questions as follows:

1. **What exactly is being visualized?** A Cytoscape HTML5 Canvas element populated by raw nodes and edges from `ExplorerDataSchema`, whose positions $(x, y)$ are set by preset position maps computed by various layout algorithms in `architecture-layout.ts`.
2. **Semantic unit of a node:** In the domain analyzer, a node represents a Salesforce codebase component (`ApexClass`, `LWC`, `Object`, `Flow`, etc.). In GraphView, a node is a $50 \times 50\text{px}$ Cytoscape DOM element styled by `getGraphStyles()`.
3. **Semantic meaning of a connection:** Static codebase relationships (`lwc-apex`, `soql-object`, `method-call`, `lwc-template-child`). In GraphView, a Cytoscape edge element with directional arrowheads.
4. **What determines spatial position?** A multi-headed authority conflict: User drag state (`sessionPositionsRef`), persisted project state (`nodePositions`), preset position map from `computeArchitectureLayoutWithMetadata`, or Cytoscape `fcose` force simulation.
5. **What determines grouping?** In `hybrid` mode: `discoverFeatures` / `discoverDomains`. In `orbit` mode (as executed): Transitive BFS depth from a focal LWC. In `constellation` mode (as executed in GraphView): $k=1$ proximity to 14 LWC Suns. In `DependencyConstellationPanel`: $k$-hop BFS neighborhood.
6. **What determines hierarchy?** In `hierarchical`: 4 layer bands (`presentation`, `application`, `domain`, `schema`). In `orbit` (intended): 6 architectural layers. In `orbit` (executed): BFS hop depth.
7. **What determines proximity?** In layout algorithms: AABB bounding box clearance ($120 \times 60\text{px}$) and chord/track spacing. In rendering: Cytoscape viewport scale.
8. **What determines visual scale?** Fixed bounding box sizes ($120 \times 60\text{px}$ layout AABB, $50 \times 50\text{px}$ DOM render node) and canvas zoom / Canvas LOD levels (`computeCanvasLODLevel`).
9. **What determines ordering?** Lexicographical sorting by `nodeId` combined with tie-breaking rules (`coupling`, `roleSymbol`, `layerOrderMap`).
10. **Inside vs Outside:** Radius $r$ in polar coordinate space determines ring membership, while angle $\theta$ determines sector or intra-ring track position.
11. **Orbit/ring/sector/track placement:**
    - *Ring:* Overloaded concept (Architectural Layer vs Hop Distance vs LWC Macro Tier).
    - *Sector:* Feature cluster in `orbit-semantics.ts`; unused in `component-orbit-layout.ts`.
    - *Track:* Radial offset ($r_k = r_0 + k \cdot \Delta r$) applied when intra-ring node density exceeds track capacity $N_{\max}$.
12. **Constellation placement:** Concentric macro rings ($R_{\text{inner}}=900\text{px}, R_{\text{outer}}=1760\text{px}$) around 14 LWC Suns (in GraphView) or $k$-hop BFS concentric circles (in `DependencyConstellationPanel`).
13. **Visual decoration:** Concentric guide circles, sector arc boundaries, mode badges, and minimap navigator.
14. **Authoritative vs Derived:** Authoritative = `nodes` and `edges` in `ExplorerDataSchema`. Derived = All spatial positions, layer classifications, feature clusters, and polar angles. (Corrupted = When derived positions are saved as user-authored state).
15. **What should remain stable:** Node identity, canonical layer classification, feature cluster assignment, and relative angular ordering.
16. **What should change:** Polar radius $r$ when filtering depth changes; Cartesian positions when focal node changes.

---

## 3. Architecture Orbit — Current Semantic Model

The repository contains two completely different implementations of "Architecture Orbit":

### Intended Model (`orbit-semantics.ts` & `orbit-layout.ts`)
- **Layer Mapping:** Concentric radial rings representing 6 architectural layers:
  - Ring 0: Nucleus / Core Entry Points (LWCs, Triggers, Flows)
  - Ring 1: Application / Controller Layer
  - Ring 2: Domain / Business Logic Layer
  - Ring 3: High-level Schema Objects (`Object`, `CustomObject`)
  - Ring 4: Fine-grained Schema Fields & External
  - Ring 5: Supporting Satellites & Apex Tests
- **Sector Mapping:** Angular slices representing primary feature clusters discovered by `discoverFeatures()`.
- **Placement Engine:** Water-filling angular sector allocation + multi-track expansion + multi-pass AABB collision repair (`computeOrbitLayout`).

### Executed Model in GraphView (`component-orbit-adapter.ts` & `component-orbit-layout.ts`)
- When a user selects `Orbit` in GraphView, `architecture-layout.ts` (lines 135–168) executes:
  ```ts
  const isOrbit = architectureMode === 'orbit';
  if (isOrbit) {
    const projection = adaptComponentOrbit(schemaInput, { focalLwcId: options.focalLwcId });
    const orbitOutput = computeComponentOrbitLayout(projection, { nodeWidth, nodeHeight });
    ...
  }
Actual Semantic Model: Single-focal LWC dependency depth view!
Ring 0: Focal LWC ("Sun") placed at center $(0,0)$.
Ring $N$: Transitive 1-hop, 2-hop, $N$-hop dependencies reachable from the focal LWC via BFS traversal (computeGraphDepths).
Unreachable nodes: Filtered out and hidden from canvas.
4. Architecture Orbit — Fundamental Problems
Bypassed / Dead Code Engine: The global 6-ring Architecture Orbit implementation (projectOrbitSemantics and computeOrbitLayout) is completely bypassed in architecture-layout.ts. Selecting "Orbit" in GraphView renders a single LWC depth view rather than the full architecture graph.
Semantic Overloading of "Ring": Users selecting "Orbit" expect rings to represent architectural layers (Presentation $\rightarrow$ Domain $\rightarrow$ Schema). Instead, they see rings representing BFS hop distance from a selected LWC.
Loss of Global System Context: In ComponentOrbit, all nodes not directly or transitively reachable from the selected focal LWC are hidden (display: none). Switching to Orbit mode causes ~80% of the architecture graph to disappear without warning.
Collision Repair Mutates Meaning: When computeComponentOrbitLayout encounters an AABB collision on a dense ring, it increments track and adds trackSpacing ($160\text{px}$) to the polar radius $r$. To the user, a node pushed outward to track 1 of Ring 1 appears visually closer to Ring 2, blurring the distinction between Depth 1 and Depth 2.
5. Component Constellation — Current Semantic Model
Component Constellation also exists in two competing forms across the codebase:

System A: GraphView Multi-Sun Constellation (component-constellation-adapter.ts & component-constellation-layout.ts)
Macro Geometry: Places 14 "Sun" LWCs across two concentric macro rings around $(0,0)$:
Inner Ring ($R=900\text{px}$): 6 Root Containers (CONTRACTED_INNER_SUN_IDS) spaced at $60^\circ$ increments.
Outer Ring ($R=1760\text{px}$): 8 Standalone Roots (CONTRACTED_OUTER_SUN_IDS) spaced at $45^\circ$ increments with a $22.5^\circ$ interlacing offset.
Micro Geometry:
Non-shared direct $k=1$ dependencies are placed in local orbits ($R=280\text{px}$) around their parent Sun.
Shared nodes (referenced by $\ge 2$ Suns) are placed at the barycentric centroid of their parent Suns with radial and tangent displacement rules.
System B: Dependency Constellation Panel (constellation-adapter.ts & constellation-layout.ts)
Standalone view component rendered in DependencyConstellationPanel.tsx.
Single-focal $k$-hop BFS radial lens with Strategy B interleaved multi-track allocation ($T=1$ for $N \le 30$, $T=4$ for $N > 30$).
6. Component Constellation — Fundamental Problems
Two Disconnected Systems: DependencyConstellationPanel.tsx uses System B (single-focal $k$-hop BFS), while GraphView.tsx (in architectureMode === 'constellation') uses System A (Multi-Sun 14-LWC). A user switching between the "Constellation" tab in the view switcher and "Constellation" mode in GraphView sees two completely different, inconsistent visual layouts.
Hardcoded Dataset Strings in Layout Engine: In explorer/src/lib/layout/component-constellation-layout.ts (lines 180–225), the generic layout engine contains hardcoded business logic for a specific dataset (pbim):
if (sNode.nodeId === 'ApexClass:MaintenanceRequestController' || sNode.nodeId.includes('MaintenanceRequestController')) {
  ...
  const targetDist = 245.62; // Contracted distance achieving 124.41px AABB gap
  ...
}
const isCoLocatedGroup = Math.abs(rawX - (-675.0)) < 1.0 && Math.abs(rawY - (-389.7114)) < 2.0;
Baking specific node ID strings and raw floating-point coordinates into a core layout algorithm violates pure-function and zero-side-effect principles.
Arbitrary Fallback Heuristics: The 14 Suns are defined by hardcoded string arrays (CONTRACTED_INNER_SUN_IDS, CONTRACTED_OUTER_SUN_IDS). If a user opens a different project dataset (e.g. cst or bqc), the adapter falls back to slicing allLwcs by index (idx < 6).
No Collision Guarantee for Arbitrary Graphs: The Multi-Sun macro geometry ($R=900\text{px}, R=1760\text{px}$) was mathematically derived specifically for 14 Suns on dataset pbim. It offers zero collision guarantees when applied to graphs with different LWC counts or higher edge density.
7. Orbit vs Constellation — Semantic Comparison
Dimension	Architecture Orbit (First-Principles Target)	Component Orbit (Current GraphView Execution)	Multi-Sun Component Constellation	Single-Focal Dependency Constellation Lens
Primary Question Answered	How is the entire system structured across architectural layers and feature sectors?	What are the transitive dependencies of a single selected LWC component?	How do component neighborhoods around root LWCs overlap and share infrastructure?	What is the $k$-hop dependency neighborhood around a selected focus component?
Node Meaning	Entire architecture graph node (Apex, LWC, Object, etc.)	Reachable dependency node from focal LWC	Component reachable within 1-hop of any of 14 Sun LWCs	Component within $k$-hops of single focus node
Edge Meaning	Architectural dependency	Transitive dependency from focus LWC	Direct 1-hop dependency between Sun and child/shared node	Neighborhood graph edge
Center / Origin	System Nucleus (abstract origin 0,0)	Focal LWC ("Sun")	Origin (0,0) around which 14 Suns rotate	Single Selected Focus Node
Radial Distance ($r$)	Architectural Layer (0=Presentation .. 5=Supporting)	BFS Hop Depth from Focal LWC ($0, 1, 2, \dots$)	Macro Sun Ring (Inner 900px vs Outer 1760px) or Local Orbit (280px)	BFS Hop Distance (1-hop = 180px, 2-hop = 300px)
Angular Position ($\theta$)	Primary Feature Cluster Assignment	Deterministic nodeId sort order within ring	Sun placement ($60^\circ / 45^\circ$ steps) or local child angle	Interleaved track distribution angle
Proximity Meaning	Feature membership & Layer proximity	Proximity to focal LWC in dependency graph	Shared dependency across multiple Sun LWCs	Graph distance in hops
Appropriate Use Case	High-level system architecture overview & domain partitioning	Focused component deep-dive inspection	System-wide LWC cluster & shared Apex hub audit	Local neighborhood dependency exploration
8. Position Authority Map
Property	Current Authority in Code	Derived From	Semantic?	Deterministic?	Correct?
x, y (Interactive Mode)	Layout Engine (architecture-layout.ts)	Radial / Layer formulas	Yes	Yes (100%)	Partially (In Orbit mode, uses Component Depth)
x, y (Static Mode)	sessionPositionsRef / nodePositions	User manual drag or previous layout run	No	No (State-dependent)	NO (Pollutes layout across mode switches)
radius ($r$)	Layout Engine	Ring index + Track offset	Yes	Yes	NO (Overloaded: Layer vs Hop Depth vs Macro Tier)
angle ($\theta$)	Layout Engine	Sector allocation + nodeId sort	Yes (in full orbit) / Geometric (in component orbit)	Yes	Yes
ring	Semantic Adapter (orbit-semantics.ts or component-orbit-adapter.ts)	Layer classification OR BFS hop depth	Yes	Yes	NO (Competing definitions of ring membership)
sector	discoverFeatures()	Feature cluster analysis	Yes	Yes	Correct in full orbit; unused in component orbit
track	Layout Engine	Collision repair pass (track += 1)	No (Rendering convenience)	Yes	NO (Shifts polar radius, altering visual meaning)
cluster	discoverFeatures() / discoverDomains()	Graph topology & naming stems	Yes	Yes	Correct
Critical Position Authority Flaw
When a user manually drags a node in Orbit or Constellation mode, GraphView.tsx records its Cartesian position $(x, y)$ in nodePositions and sets provenance to 'user-authored'. If the user then changes the focal LWC or switches layout modes, GraphView.tsx passes nodePositions back to computeArchitectureLayoutWithMetadata as existingPositions. architecture-layout.ts prioritizes existingPositions over new layout calculations, locking the dragged node at its stale Cartesian coordinate despite the fact that the underlying polar origin or layout mode has changed!

9. Semantic vs Geometric Boundary Audit
Properties classified into formal categories A–E:

Category A (Domain Truth): ExplorerNode.type, ExplorerNode.file, ExplorerEdge.relationshipType.
Category B (Graph Truth): BFS hop depth, fan-in/fan-out, connectivity, shared node status.
Category C (Layout Truth): Architectural layer assignment, ring index, feature sector assignment.
Category D (Rendering Convenience): Multi-track expansion index, AABB clearance offset, chord radius bump, hardcoded displacement.
Category E (Interaction State): Selected node, focused node, layout mode, hover card.
Violations Found: Category D & E Polluting Categories A, B & C
Category D (Rendering Convenience) mutates Category C (Layout Truth): In component-orbit-layout.ts, collision repair shifts nodes to outer tracks ($r += 160\text{px}$). This alters polar radius $r$, making a Depth-1 node appear at the radius of Depth-2 nodes.
Category E (Interaction State) mutates Category B & C (Graph & Layout Truth): Clicking a node in GraphView updates selectedNodeId, which re-derives focalLwcId. This causes adaptComponentOrbit to re-filter the graph and recompute all node depths and rings, completely rearranging the canvas geometry.
10. Stability and Determinism Findings
Intra-Run Determinism (PASSED): Given the exact same input graph and configuration, all adapters (component-orbit-adapter, component-constellation-adapter, orbit-semantics) and layout engines (component-orbit-layout, component-constellation-layout, orbit-layout) sort nodes and edges deterministically by nodeId. 10x repeated executions produce $0.00000\text{px}$ coordinate drift.
Dataset-Change Stability (FAILED): Adding or removing a node from a ring causes angleStep to change for all nodes on that ring, causing every node to rotate to a new angular position.
Interaction Stability (FAILED): Node selection triggers full layout recomputation in Orbit mode, causing node jumps across the canvas.
State Persistence Pollution (FAILED): Dragging a node in static mode saves Cartesian coordinates that pollute subsequent layout mode transitions.
11. Selection / Visibility Findings
Selection Principle: Node selection should be a presentation-only state (highlighting connected edges and opening inspection panels) and must NEVER alter spatial coordinates or recompute layout geometry unless the user explicitly clicks a "Re-center on Component" action button.
Current Code Violation: In GraphView.tsx, effectiveLayoutOptions derives derivedFocalLwcId from selectedNodeId:
const derivedFocalLwcId = (isLwcNode(selectedNodeId) ? selectedNodeId : null) ?? ...
Selecting any LWC node instantly changes the focal center and triggers runLayoutWithMetadata, causing the entire canvas to jump and recalculate.
Visibility Principle: Hiding or filtering nodes (e.g. by risk or search query) should alter element opacity or display style, but must not re-allocate radial rings or sector angles for remaining nodes.
12. Layout Switching Findings
Switching between layout modes in GraphView (hierarchical $\leftrightarrow$ hybrid $\leftrightarrow$ orbit $\leftrightarrow$ constellation) exhibits severe state leakage:

User selects 'hybrid' -> positions generated -> saved in nodePositions
       ↓
User switches to 'orbit' -> nodePositions passed as existingPositions
       ↓
architecture-layout.ts checks hasAuthoritativePositions -> TRUE
       ↓
Existing Cartesian positions override Orbit radial positions!
This occurs because GraphView.tsx maintains a single nodePositions state object without partitioning positions by layout mode (nodePositions.hierarchical, nodePositions.hybrid, nodePositions.orbit, nodePositions.constellation).

13. Fundamental Failure Modes Found
Failure A — Visual Metaphor Without Semantic Contract: The visual metaphor of "Orbit" is used without a single authoritative definition of what a "Ring" represents.
Failure B — Layout Algorithm Pretending to Be Domain Truth: Hardcoded node IDs (MaintenanceRequestController) inside generic layout geometry functions.
Failure C — Multiple Authorities: Three separate layout files independently defining ring membership and radius.
Failure D — Position as Hidden State: Stale Cartesian coordinates leaking across layout mode switches.
Failure E — Interaction Mutates Semantics: Selecting a node triggers a full spatial re-layout.
Failure F — Bypassed Implementation: GraphView's orbit mode completely bypassing the actual global Architecture Orbit implementation.
14. Corrected First-Principles Model
To eliminate all conceptual contradictions, the visualization system must follow a strict 5-stage unidirectional pipeline:

1. DOMAIN / GRAPH TRUTH
   (Raw Analyzer JSON: Nodes, Edges, Types, Metrics — Immutable)
        ↓
2. SEMANTIC PROJECTION
   (Pure classification: Layers, Feature Clusters, BFS Hop Depths — Zero Geometry)
        ↓
3. LAYOUT-SPECIFIC GEOMETRY
   (Pure math: Polar/Cartesian coordinates, track allocation, AABB clearance — Zero DOM/State)
        ↓
4. RENDERING
   (Cytoscape / SVG / Canvas element painting, guides, overlays — Presentation Only)
        ↓
5. INTERACTION
   (Selection, hover, inspection drawer, search filter — Non-mutating UI State)
15. Proposed Semantic Contract
All radial visualization lenses must consume a unified semantic graph contract:

export interface CanonicalSemanticGraph {
  nodes: Record<string, CanonicalSemanticNode>;
  edges: CanonicalSemanticEdge[];
  summary: CanonicalGraphSummary;
}

export interface CanonicalSemanticNode {
  id: string;
  displayName: string;
  type: ExplorerNodeType;
  layer: ArchitectureLayer;          // 'presentation' | 'application' | 'domain' | 'schema' | 'supporting'
  featureClusterId: string;         // Discovered feature ID
  domainId: string;                 // Discovered domain ID
  metrics: ComponentMetrics;
}

export interface CanonicalSemanticEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: ExplorerRelationshipType;
}
16. Proposed Orbit Contract (ArchitectureOrbitProjection)
System Architecture Orbit must be formally defined as a global, full-graph visualization lens:

Primary Question: "How is the entire system structured across architectural layers and feature sectors?"
Center / Origin: Abstract System Nucleus Core $(0, 0)$.
Ring Membership ($r$): Strictly determined by Architectural Layer:
Ring 0: Core Entry Points (Triggers, Flows)
Ring 1: Presentation Layer (LWCs, Visualforce)
Ring 2: Application Layer (Controllers, Handlers)
Ring 3: Domain Layer (Services, Domain Logic)
Ring 4: Schema Layer (Custom Objects, Fields)
Ring 5: Supporting Infrastructure & Tests
Sector Membership ($\theta$): Derived from primaryFeatureId discovered by discoverFeatures().
Invariants:
Every node in the graph is represented (no hiding of unreachable nodes).
Ring radii $R_0 < R_1 < R_2 < R_3 < R_4 < R_5$ are strictly non-overlapping.
Multi-track expansion occurs strictly within the angular slice allocated to that sector.
17. Proposed Constellation Contract (ComponentConstellationProjection)
Dependency Constellation must be formally defined as a focal component neighborhood lens:

Primary Question: "What is the local dependency neighborhood and shared infrastructure around selected focal component(s)?"
Modes:
Single-Focal Mode: $1$ selected focus component at origin $(0, 0)$; rings represent transitive $k$-hop BFS distance ($k = 1, 2, 3$).
Multi-Sun Root Mode: $M$ selected root container LWCs placed on a macro ring; rings represent local $k=1$ dependencies and shared Apex hubs.
Invariants:
Zero hardcoded dataset node ID strings in layout engines.
Shared node positions derived purely from mathematical barycentric centroids + deterministic radial/tangent AABB clearance offsets.
Ring distance $r$ strictly encodes BFS hop depth $k$.
18. Non-Negotiable Invariants
Pure Immutability: Adapters and layout engines must never mutate input objects or graph metadata.
Zero Dataset-Specific Literals: No layout function may contain hardcoded string identifiers for specific nodes, features, or projects.
Explicit Layout Mode Isolation: Staged node positions must be partitioned per layout mode (positions.hierarchical, positions.hybrid, positions.orbit, positions.constellation). Switching modes must never leak Cartesian coordinates across layout paths.
Unambiguous Spatial Meaning:
In Architecture Orbit: Radius $r \equiv$ Architectural Layer.
In Dependency Constellation: Radius $r \equiv$ Transitive Hop Distance $k$.
Selection Non-Interference: Selecting a node must never trigger spatial position recalculation or canvas jumps unless the user explicitly invokes "Re-center".
100% Determinism: Input order variations must yield $0.00000\text{px}$ coordinate drift across 10x repeated runs.
19. What Must NOT Be Implemented Yet
Do NOT patch or attempt to "fix" component-constellation-layout.ts by adding more hardcoded coordinate checks.
Do NOT attempt to wire orbit-semantics.ts into GraphView.tsx without first separating ArchitectureOrbit (global) from ComponentOrbit (local).
Do NOT add CSS animations, visual polish, or canvas controls to Orbit or Constellation views.
Do NOT refactor state persistence until position state is explicitly partitioned by layout mode.
20. Recommended Architectural Direction
Deprecate Overloaded Mode Names: Rename GraphView's current orbit mode to component-depth to accurately reflect that it displays a single LWC depth view.
Promote Global Architecture Orbit: Wire projectOrbitSemantics and computeOrbitLayout as the authoritative engine for full-graph Architecture Orbit.
Unify Constellation Implementations: Deprecate component-constellation-layout.ts's hardcoded Multi-Sun engine and replace it with a generalized MultiSunConstellationEngine driven purely by graph barycentric math.
Partition Position Persistence: Update GraphLayoutState in projectState.ts to store positions per mode:
export interface GraphLayoutState {
  mode: LayoutMode;
  architectureMode: ArchitectureLayoutMode;
  positionsByMode: {
    hierarchical?: Record<string, Position>;
    hybrid?: Record<string, Position>;
    orbit?: Record<string, Position>;
    constellation?: Record<string, Position>;
  };
}
21. Final Decision Gate
DECISION GATE: C — FOUNDATION UNSOUND

Rationale: The current GraphView model suffers from fundamental conceptual contradictions, bypassed layout engine execution, overloaded spatial dimensions, hardcoded dataset identifiers inside layout algorithms, and cross-mode position authority corruption. The visualizations cannot be rendered semantically correct through minor bug fixes; they require the clean-room adoption of the principles-first target contracts defined in this report.

22. Evidence Index
Finding / Issue	Primary Source Code File	Line / Location
Bypassed Global Architecture Orbit	explorer/src/lib/architecture-layout.ts	Lines 135–168
Global Orbit Engine (Bypassed)	explorer/src/lib/layout/orbit-semantics.ts & orbit-layout.ts	Entire files
Component Orbit Adapter (Single LWC Depth)	explorer/src/lib/adapters/component-orbit-adapter.ts	Lines 110–280
Hardcoded Node IDs in Layout Engine	explorer/src/lib/layout/component-constellation-layout.ts	Lines 180–225
Hardcoded 14 Sun Lists	explorer/src/lib/adapters/component-constellation-adapter.ts	Lines 7–27
Dual Constellation Implementation (Panel)	explorer/src/components/DependencyConstellationPanel.tsx	Lines 45–58
Single-Focal Constellation Adapter	explorer/src/lib/adapters/constellation-adapter.ts	Lines 110–230
Single-Focal Constellation Layout	explorer/src/lib/layout/constellation-layout.ts	Lines 60–180
Selection Mutating Focal Center & Positions	explorer/src/components/GraphView.tsx	Lines 150–165
Mode Switch Position Authority Leakage	explorer/src/components/GraphView.tsx	Lines 170–190 & 360–390
Workspace Registry Lens & Surface Definitions	explorer/src/registry/workspace-registry.ts	Lines 60–120
