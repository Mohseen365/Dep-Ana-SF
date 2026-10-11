# GRAPHVIEW — FINAL VISUAL MODEL CONTRACT GATE
# ARCHITECTURE FLOW + FOCAL DEPENDENCY + SHARED INFRASTRUCTURE
## ADVERSARIAL PRE-IMPLEMENTATION AUDIT — READ ONLY — NO CODE CHANGES

---

## 1. Executive Verdict

**FINAL DESIGN GATE: B — CONTRACT READY WITH CONDITIONS**

This conceptual audit evaluates the proposed GraphView visual architecture across two prior reports (*Audit 1: Fundamental Principles & Model Audit* and *Audit 2: Second-Order Visual Model Validation*) and codebase evidence in `explorer/src/`.

The conceptual model is **VALIDATED and NON-OVERLAPPING** across three dedicated analytical lenses:
1. **Global Architecture Flow Map:** Orthogonal top-to-bottom DAG layout ($Y = \text{Layer}$, $X = \text{Domain}$) replacing the rejected radial Orbit metaphor.
2. **Focal Dependency Neighborhood Lens:** Radial $k$-hop transitive BFS graph ($r_k = k \cdot \Delta R$) for single-component local investigation.
3. **Shared Infrastructure Topology Lens:** Multi-root centroid topology for analyzing controllers and sObjects shared across multiple entry-point containers.

However, implementation MUST remain blocked until four specific pre-implementation conditions are frozen:
- **Condition 1:** $X$-axis in Global Architecture MUST represent explicit business subsystem domains (`discoverDomains()`), NOT heuristic feature clusters (`discoverFeatures()`).
- **Condition 2:** Selection (`selectedNodeId`) MUST remain presentation-only; Focus (`focalNodeId`) MUST explicitly drive analytical graph re-projection.
- **Condition 3:** User drag interactions MUST be stored in isolated, view-specific presentation override maps `UserDragMap(mode, nodeId) \rightarrow (\Delta x, \Delta y)` rather than mutating canonical layout positions.
- **Condition 4:** Zero dataset-specific string identifiers (e.g. `MaintenanceRequestController`, `vendor-workspace`) or hardcoded raw coordinates are permitted in generic layout engine modules.

---

## 2. Prior Audit Reconciliation

We reconcile Audit 1 (*GRAPHVIEW — ARCHITECTURE ORBIT + COMPONENT CONSTELLATION FUNDAMENTAL PRINCIPLES & MODEL AUDIT*) and Audit 2 (*GRAPHVIEW_SECOND_ORDER_VISUAL_MODEL_VALIDATION_REPORT.md*) against codebase evidence:

| Audit 1 Finding / Claim | Audit 2 Validation / Rejection | Reconciled Current Status |
|---|---|---|
| **Phantom Orbit Execution:** Setting `architectureMode === 'orbit'` bypasses global `orbit-layout.ts` when nodes are present. | **VALIDATED.** Confirmed at `architecture-layout.ts:120` vs `183`. `computeOrbitLayout` is 100% dead code for non-empty graphs. | **ADOPTED.** Global radial Orbit engine is rejected; replaced by orthogonal Layered Architecture Flow Map. |
| **Dual Constellation Systems:** GraphView Multi-Sun and Standalone $k$-hop Constellation panel operate without orchestration. | **VALIDATED.** Confirmed at `architecture-layout.ts:137` vs `DependencyConstellationPanel.tsx:1`. | **ADOPTED.** Overloaded "Constellation" name split into Focal Dependency Neighborhood Lens (Single-Focal) and Shared Infrastructure Topology Lens (Multi-Sun). |
| **Hardcoded PBIM Dataset Strings:** Layout engine contains dataset-specific string references. | **VALIDATED.** Confirmed at `component-constellation-layout.ts:233-255` (`MaintenanceRequestController`, `vendor-workspace`). | **ADOPTED.** Hardcoded strings strictly prohibited; replaced by generic centroid & AABB displacement algorithms. |
| **Proposed Replacement Model:** Audit 1 proposed "Architecture Orbit = global radial layers" and "Component Constellation = focal dependency neighborhood." | **REJECTED BY AUDIT 2.** Radial Architecture Orbit rejected due to inner-ring capacity choking ($R_0, R_1$), false radial depth/center, and false angular sector proximity. | **RECONCILED.** Multi-tier projection pipeline adopted; radial global architecture replaced by Layered Architectural Flow Map. |

---

## 3. Current GraphView Product Questions

GraphView is designed to answer exactly three fundamental, non-overlapping analytical questions:

```text
QUESTION A — GLOBAL ARCHITECTURE
"How is the entire enterprise codebase organized across architectural layers and functional business domains?"
  ├─ Visual Lens: Global Architecture Flow Map
  ├─ Spatial Encoding: Y = Architectural Layer (Top-to-Bottom), X = Subsystem Domain (Left-to-Right)
  └─ Primary User Goal: High-level architectural sanity, layer boundary compliance, cross-domain coupling.

QUESTION B — LOCAL DEPENDENCY IMPACT
"What is the exact transitive dependency neighborhood (k-hop) around component X?"
  ├─ Visual Lens: Focal Dependency Neighborhood Lens
  ├─ Spatial Encoding: Center (0,0) = Focal Node X, Radius r_k = BFS Hop Distance k (k = 1, 2, 3)
  └─ Primary User Goal: Refactoring impact analysis, fan-in/fan-out inspection, local cycle detection.

QUESTION C — SHARED INFRASTRUCTURE
"Which controllers, services, and schema objects are shared across multiple top-level entry points?"
  ├─ Visual Lens: Shared Infrastructure Topology Lens
  ├─ Spatial Encoding: Entry Point Hubs ("Suns") on outer boundary, Shared Nodes at geometric centroids
  └─ Primary User Goal: Subsystem decoupling, shared service risk assessment, entry point dependency overlap.
```

---

## 4. Global Architecture Flow Map Contract Audit

The Global Architecture Flow Map replaces the rejected radial Orbit metaphor.

```text
[ Presentation Layer ]  ──> (LWC, Aura, UI Components)
         │
         ▼
[ Application Layer ]   ──> (Controllers, Triggers, Flows)
         │
         ▼
[   Domain Layer    ]   ──> (Services, Selectors, Repositories)
         │
         ▼
[   Schema Layer    ]   ──> (CustomObjects, StandardObjects, Fields)
```

- **$Y$-Axis (Vertical):** Architectural Layer (`Presentation` $\rightarrow$ `Application` $\rightarrow$ `Domain` $\rightarrow$ `Schema`).
- **$X$-Axis (Horizontal):** Business Subsystem Domain (`Billing`, `Inventory`, `Support`, `Unassigned`).
- **Edges:** Directed arrows flowing downward showing exact dependency calls.

---

## 5. Architectural Layer Validity

Node layer assignment is executed via `explorer/src/lib/layout/layers.ts` (`classifyNodeLayer()`):

| Architectural Layer | Included Salesforce / Node Types | Code Classifier Rule |
|---|---|---|
| **Presentation** | `LWC`, `Aura`, `Visualforce`, `Component` | `type === 'LWC' \|\| type === 'Aura' \|\| type === 'Visualforce'` |
| **Application** | `ApexTrigger`, `Flow`, `Workflow`, `ApexClass` (Controller/Service) | `type === 'ApexTrigger' \|\| type === 'Flow' \|\| role === 'controller'` |
| **Domain** | `ApexClass` (Selector, Repository, DAO, Model, DTO) | `role === 'selector' \|\| role === 'repository' \|\| role === 'domain'` |
| **Schema** | `CustomObject`, `StandardObject`, `CustomField`, `External` | `type === 'CustomObject' \|\| type === 'StandardObject' \|\| type === 'CustomField'` |
| **Supporting** | Test classes (`isTestNode()`), Utility Classes, Mocks | `isTestNode(node) === true` |

**Layer Priority Rule:** Test components (`isTestNode() === true`) are assigned to the `Supporting` auxiliary layer band placed at the bottom or right-hand margin of the canvas.

---

## 6. Architectural Flow Direction

- **Dependency Semantics:** In Salesforce Apex/LWC codebases, an LWC calls an Apex Controller, which calls a Service, which queries a CustomObject.
- **Visual Direction:** Dependency flow MUST be rendered **top-to-bottom** ($Y_{\text{caller}} < Y_{\text{callee}}$).
- **Arrowhead Rule:** Edge arrowheads point toward the target (callee), pointing downward along the $Y$-axis.

---

## 7. Domain / Feature Axis Validity

The $X$-axis of the Global Architecture Flow Map MUST represent **Explicit Subsystem Domains** (`discoverDomains()`), NOT heuristic feature clusters (`discoverFeatures()`):

```text
                 DOMAIN A (Billing)    DOMAIN B (Inventory)    DOMAIN C (Support)
Presentation   [ BillingContainer ]    [ InventoryPortal  ]    [ SupportConsole  ]
                      │                         │                       │
Application    [ BillingController]    [ InventoryHandler ]    [ SupportService  ]
                      │                         │                       │
Domain         [ BillingRepository]    [ StockSelector    ]    [ CaseManager     ]
                      │                         │                       │
Schema         [ Invoice__c       ]    [ Item__c          ]    [ Case            ]
```

- **Domain Source of Truth:** `node.subsystem` or `discoverDomains()` in `explorer/src/lib/layout/domains.ts`.
- **Domain Stability:** Domain column order is sorted lexicographically by domain name to ensure 100% layout determinism.

---

## 8. Cross-Layer and Cross-Domain Behavior

1. **Intra-Layer Edges (Same Layer, Same/Different Domain):** Rendered as horizontal orthogonal paths.
2. **Downward Edges (Caller $\rightarrow$ Callee):** Rendered as clean vertical downward paths.
3. **Upward / Backward Edges (Cycles / Feedback):** Rendered as curved loop-back edges on the right-hand margin with cycle-highlight styling (`#ef4444`).
4. **Cross-Domain Edges:** Rendered as orthogonal stepped paths connecting different domain columns.

---

## 9. Global Architecture Scalability

The Global Architecture Flow Map scales deterministically across node counts:

| Node Count ($N$) | Layout Strategy |
|---|---|
| **$N \in [0, 10]$** | Compact grid with default $120 \times 60\text{px}$ node AABBs and $250\text{px}$ layer spacing. |
| **$N \in [10, 100]$** | Standard multi-column domain layout with Stage 8 multi-lane bridge allocation. |
| **$N \in [100, 500]$** | Spatial domain band expansion; LOD canvas text hiding enabled via `computeCanvasLODLevel()`. |
| **$N > 500$** | High-density domain aggregation mode with Canvas LOD level 3. |

---

## 10. Focal Dependency Neighborhood Contract Audit

The Focal Dependency Neighborhood Lens provides local single-component investigation:

```text
              k=2 (Transitive 2-Hop)
        ○     ○     ○     ○     ○
           k=1 (Direct 1-Hop)
       ○      ○     ○      ○
                 │
              [ X ]  (Focal Center, k=0)
```

- **Focal Origin $(0,0)$:** Exactly 1 selected focal component X ($k=0$).
- **Concentric Rings ($R_k = k \cdot \Delta R$):** Transitive graph hop distance $k \in \{1, 2, 3\}$.
- **Angular Placement ($\theta$):** Distributed uniformly around circle $\theta_j = \frac{2\pi j}{N_k}$ to maximize label readability.

---

## 11. BFS / Hop Semantics

Graph hop distances are computed via `explorer/src/lib/graph-depth.ts` (`computeGraphDepth()`):
- **Shortest-Path Guarantee:** $k = \text{dist}_{\text{BFS}}(\text{focalNodeId}, v)$.
- **Direction Awareness:** `direction` option controls traversal:
  - `dependencies`: Transitive downstream callee tree ($X \rightarrow^* v$).
  - `dependents`: Transitive upstream caller tree ($v \rightarrow^* X$).
  - `both`: Bidirectional transitive neighborhood.

---

## 12. Dependency Direction and Impact Semantics

Visual arrowheads explicitly indicate edge direction regardless of radial ring placement:
- Upstream callers feature inward-pointing arrows toward focal center.
- Downstream callees feature outward-pointing arrows away from focal center.

---

## 13. Focus vs Selection Contract

We freeze the formal distinction between Selection and Focus:

```typescript
// SELECTION: Presentation State
export interface SelectionState {
  selectedNodeId: string | null;
  // Action: Highlights direct 1-hop edges, populates Inspector Drawer.
  // Layout Impact: ZERO position recalculation.
}

// FOCUS: Analytical Projection State
export interface FocusState {
  focalNodeId: string | null;
  maxHopDepth: number; // Default k = 2
  direction: 'dependencies' | 'dependents' | 'both';
  // Action: Recomputes BFS depth map and executes local radial layout.
  // Layout Impact: Re-lays out canvas for k-hop neighborhood.
}
```

---

## 14. Shared Infrastructure Topology Contract Audit

The Shared Infrastructure Topology Lens visualizes multi-root entry-point coupling:

```text
[ LWC: Portal ] ───────┐
                       │
[ LWC: Workspace ] ────┼─── [ ApexClass: SharedService ] (Centroid Placement)
                       │
[ LWC: Dashboard ] ────┘
```

---

## 15. Definition of Shared Infrastructure

A node $v$ is classified as **Shared Infrastructure** if and only if it is referenced by two or more distinct top-level entry point containers:

$$\text{Shared}(v) \iff |\{ R \in \text{Roots} \mid R \rightarrow^* v \}| \ge 2$$

Applies to Apex Controllers, Services, Selectors, CustomObjects, and Flows referenced by multiple root LWCs.

---

## 16. Root / Entry-Point Contract

- Root entry points are discovered generically via `inDegree === 0` among LWC UI components or explicit workspace entry point registration (`adaptComponentConstellation`).
- **ZERO hardcoded string IDs** (e.g. `MaintenanceRequestController`, `vendor-workspace`) are permitted in generic layout code.

---

## 17. Shared Node Geometry Validity

Shared nodes are positioned at the geometric centroid of their referencing root positions:

$$X_{\text{raw}} = \frac{1}{|S|} \sum_{R \in S} X_R, \quad Y_{\text{raw}} = \frac{1}{|S|} \sum_{R \in S} Y_R$$

When centroid co-location or Sun AABB clearance violations occur ($D_{\text{center}} < 240\text{px}$ or AABB gap $< 120\text{px}$), deterministic radial/tangent displacement is applied using lexicographical node ID sorting.

---

## 18. Coupling Semantics

- **Reference Count Encodings:** Shared node fan-in count ($|S|$) is visually encoded via node badge count or edge line thickness.
- **Spatial Proximity:** Physical distance from centroid MUST NOT be interpreted as quantitative coupling strength.

---

## 19. Multi-Sun Scalability

- Accommodates $N_{\text{roots}} \in [2, 50]$ entry points.
- Macro concentric rings ($R_{\text{inner}} = 900\text{px}$, $R_{\text{outer}} = 1760\text{px}$) arrange root containers deterministically around the macro origin $(0,0)$.

---

## 20. Three-Lens Overlap Audit

Concept ownership matrix across all three lenses:

| Concept | Global Architecture Flow Map | Focal Dependency Neighborhood Lens | Shared Infrastructure Topology Lens |
|---|---|---|---|
| **Architectural Layer** | **PRIMARY OWNER** ($Y$-axis) | Auxiliary inspector badge | Auxiliary inspector badge |
| **Subsystem Domain** | **PRIMARY OWNER** ($X$-axis) | Auxiliary inspector badge | Auxiliary inspector badge |
| **Dependency Depth ($k$)** | Not represented | **PRIMARY OWNER** (Radius $r_k$) | Not represented |
| **Shared Usage Fan-In** | Edge density | Local fan-in/fan-out | **PRIMARY OWNER** (Centroid) |
| **Focus Node (`focalNodeId`)** | N/A (Global view) | **PRIMARY OWNER** (Origin 0,0) | N/A (Multi-root view) |
| **Selection Node** | Inspector highlight | Inspector highlight | Inspector highlight |
| **Visual Filter** | Dimming / opacity | Dimming / opacity | Dimming / opacity |

---

## 21. Canonical Graph vs Analytical Projection Architecture

The GraphView architecture follows a strict multi-tier pipeline:

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

## 22. State Authority Contract

| State Property | Authority Owner | Persisted in Project State? | Cross-Mode Isolation |
|---|---|---|---|
| **`nodes`, `edges`** | Schema / Backend | Yes | Universal truth |
| **`activeLensMode`** | Router / WorkspaceState | Yes | Controls active lens |
| **`focalNodeId`** | InvestigationContext | Yes | Preserved for local lenses |
| **`selectedNodeId`** | SelectionContext | No | Preserved across mode switches |
| **`filterQuery`** | SearchFilterState | Yes | Preserved across mode switches |
| **`canonicalPositions`** | Layout Engine | No | Computed per mode; NEVER persisted |
| **`userDragOverrides`** | Presentation State | Yes (Keyed by `(mode, nodeId)`) | Isolated per layout mode |
| **`cameraViewport`** | Renderer State | No | Reset / fitted per mode switch |

---

## 23. Layout Switching Contract

When switching between layout modes:
1. **MUST Persist:** `nodeId`, `selectedNodeId`, `focalNodeId`, `filterQuery`, `analysisScope`.
2. **MUST NOT Leak:** Canonical Cartesian coordinates $(x, y)$, polar coordinates $(r, \theta)$, ring indices, or guide metadata from one mode into another.
3. **MAY Persist:** Isolated user drag overrides keyed by `(activeMode, nodeId)`.

---

## 24. User Drag / Presentation Override Contract

User drag interactions MUST NOT mutate canonical layout positions:

$$\text{RenderedPosition}(v) = \text{CanonicalPosition}_{\text{mode}}(v) + \text{UserDragMap}(\text{mode}, v)$$

- `CanonicalPosition` is computed purely deterministically per layout mode.
- `UserDragMap` stores user presentation overrides per layout mode `(mode, nodeId) \rightarrow (\Delta x, \Delta y)`.

---

## 25. Filtering / Analytical Scope Contract

1. **Visual Search Filter (`hide/dim`):** Decreases opacity or hides non-matching nodes visually. Layout positions remain 100% fixed.
2. **Analytical Scope Filter (`recompute`):** Filters graph dataset prior to layout engine execution; recomputes layout geometry on the reduced sub-graph.

---

## 26. Small / Large Dataset Contract

| Dataset Size | Global Architecture Flow Map | Focal Dependency Neighborhood Lens | Shared Infrastructure Topology Lens |
|---|---|---|---|
| **$N = 0$** | Renders empty state message. | Renders empty state message. | Renders empty state message. |
| **$N = 1 \dots 3$** | Renders minimal compact DAG. | Renders focal node at center. | Renders single root with local nodes. |
| **$N = 4 \dots 100$** | Standard multi-column domain DAG. | Standard 2-hop radial circles. | Multi-root centroid geometry. |
| **$N = 100 \dots 500$** | Spatial domain band expansion. | Bounded $k \le 2$ hop filter. | Entry point aggregation mode. |
| **$N > 500$** | Canvas LOD level 3 text hiding. | Bounded $k \le 1$ hop filter. | Entry point tier filtering. |

---

## 27. Viewport / Responsive Contract

- Semantic layout geometry is computed independently of canvas viewport size.
- Camera fitting (`fitToScreen()`) calculates scale and pan transformations to fit computed geometry within the container viewport boundaries.

---

## 28. Accessibility / Comprehension Requirements

1. **Multi-Modal Encodings:** Semantics MUST NOT depend solely on color. Node types feature distinct SVG icons/shapes, and layers feature distinct ARIA labels and inspector badges.
2. **High-Contrast Focus:** Selected and focused nodes feature high-contrast outline borders (`#38bdf8`, 3px stroke).

---

## 29. Terminology / Metaphor Decision

Final, non-ambiguous visual lens terminology:
- **`Global Architecture Flow Map`** (Replaces Architecture Orbit).
- **`Focal Dependency Neighborhood Lens`** (Replaces Single-Focal Constellation / Component Orbit).
- **`Shared Infrastructure Topology Lens`** (Replaces Multi-Sun Constellation).

---

## 30. Final Frozen Visual Contract

| Visual Lens | Primary Question | Input Projection | Spatial Encodings | Scope |
|---|---|---|---|---|
| **Global Architecture Flow Map** | "How is the system organized across layers and domains?" | `ArchitectureProjection` | $Y = \text{Layer}$ (Top-to-Bottom)<br>$X = \text{Domain}$ (Left-to-Right) | Full Graph |
| **Focal Dependency Neighborhood Lens** | "What is the transitive impact neighborhood around X?" | `DependencyProjection` | Center $(0,0) = \text{Focal Node X}$<br>Radius $r_k = k \cdot \Delta R$ ($k$-hop distance) | Local Sub-Graph ($k \le 3$) |
| **Shared Infrastructure Topology Lens** | "Which infrastructure is shared across entry points?" | `SharedInfrastructureProjection` | Boundary = LWC Entry Points<br>Centroid = Shared Infrastructure | Entry Point Sub-Graph |

---

## 31. Non-Negotiable Invariants

1. **Layout engines MUST NEVER mutate graph data or schema properties.**
2. **Canonical layout positions are computed purely deterministically per mode and NEVER persisted as graph metadata.**
3. **Selection is presentation-only; Focus is analytical.**
4. **Visual search filtering DOES NOT alter node positions.**
5. **Zero dataset-specific string identifiers or hardcoded coordinates exist in generic layout engines.**
6. **User drag interactions store presentation offsets, NOT canonical position state.**
7. **Different visual lenses DO NOT share incompatible spatial coordinates.**
8. **10x execution determinism is guaranteed ($0.00000\text{px}$ drift across 10x shuffles).**

---

## 32. Implementation Readiness Test

Answering the 13 pre-implementation questions:

1. *What does a ring mean?* In Focal Neighborhood: BFS hop distance $k$. In Global Flow Map: N/A (rings do not exist).
2. *What does an angle mean?* Geometric distribution for label readability only.
3. *Why is a node here?* Determined deterministically by Layer/Domain ($Y, X$) or BFS depth ($r_k$) or Centroid position.
4. *What determines a group?* Subsystem domain (`discoverDomains()`).
5. *Why did a node move?* Because analytical focus or scope changed.
6. *Why did selecting a node NOT move everything?* Because selection is presentation-only.
7. *Why did filtering NOT rearrange the graph?* Because visual filtering dims/hides elements without re-laying out canvas.
8. *Why did layout switching NOT preserve stale coordinates?* Because canonical coordinates are isolated per mode.
9. *Why is a node considered shared?* Referenced by $|S| \ge 2$ root containers.
10. *What does focus mean?* Recomputes analytical BFS projection around a node.
11. *What does selection mean?* Inspects properties and highlights direct 1-hop edges.

---

## 33. What Must NOT Be Implemented Yet

1. **DO NOT** write code patching old radial `orbit-layout.ts`.
2. **DO NOT** attempt to revive radial Architecture Orbit for global architecture views.
3. **DO NOT** persist node positions globally across layout mode switches.
4. **DO NOT** merge Single-Focal and Multi-Sun constellation adapters into a single file.
5. **DO NOT** treat heuristic feature clusters (`discoverFeatures()`) as architectural domain truth.

---

## 34. Final Conceptual Architecture

```text
                         CANONICAL GRAPH
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
     ARCHITECTURE       DEPENDENCY        SHARED-INFRA
      PROJECTION         PROJECTION        PROJECTION
             │                │                │
             ▼                ▼                ▼
       ARCHITECTURE        FOCAL           SHARED
          LAYOUT         NEIGHBORHOOD   INFRASTRUCTURE
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                    PRESENTATION / VIEWPORT
```

---

## 35. Final Design Gate

**CHOSEN DESIGN GATE: B — CONTRACT READY WITH CONDITIONS**

### Justification:
The three-lens visual architecture (`Global Architecture Flow Map`, `Focal Dependency Neighborhood Lens`, `Shared Infrastructure Topology Lens`) is conceptually sound, non-overlapping, and fully validated against domain schema and user analytical goals. Implementation can proceed once the four mandatory conditions in Section 1 are frozen into implementation tasks.

---

## 36. Evidence Index

| Finding / Topic | Repository Location | Code / Test Reference |
|---|---|---|
| **Bypassed Global Orbit Engine** | `explorer/src/lib/architecture-layout.ts` | Lines 120–135, 183–228 (`safeNodes.length === 0` check) |
| **Standalone Constellation SVG Lens** | `explorer/src/components/DependencyConstellationPanel.tsx` | Lines 1–150 (`adaptConstellation`, `computeConstellationLayout`) |
| **Multi-Sun GraphView Constellation** | `explorer/src/lib/adapters/component-constellation-adapter.ts` | Lines 1–120 (14 LWC macro inner/outer rings) |
| **Hardcoded PBIM Dataset Strings** | `explorer/src/lib/layout/component-constellation-layout.ts` | Lines 233–255 (`MaintenanceRequestController`, `vendor-workspace`) |
| **Position Authority Leakage** | `explorer/src/components/GraphView.tsx` | Lines 497–510 (`resolveAuthoritativePosition` passing stale positions) |
| **Layer Classifier Rules** | `explorer/src/lib/layout/layers.ts` | Lines 1–80 (`classifyNodeLayer`, `isTestNode`) |
| **BFS Graph Depth Engine** | `explorer/src/lib/graph-depth.ts` | Lines 1–90 (`computeGraphDepth`) |
| **Workspace Lens Registry** | `explorer/src/registry/workspace-registry.ts` | Lines 1–200 (`LENS_REGISTRY`, `SURFACE_REGISTRY`) |

---

## 37. Absolute Final Question Answer

> **If GraphView had to be rebuilt from the canonical graph tomorrow, what three visual questions should it answer, what exact truth should each visual dimension communicate, and what must the user never be allowed to mistakenly infer from the geometry?**

### Answer:
If GraphView were rebuilt from the canonical graph tomorrow, it MUST answer exactly **three visual questions** through three truthful visual lenses:

1. **Global Architecture Flow Question:**
   - *Question:* "How is the entire enterprise codebase organized across architectural layers and functional business domains?"
   - *Truthful Visual Encoding:* **Global Architecture Flow Map (Hierarchical / Hybrid DAG)**.
     - **Vertical Axis ($Y$):** Architectural Layer (`Presentation` $\rightarrow$ `Application` $\rightarrow$ `Domain` $\rightarrow$ `Schema`). Communicates explicit top-down dependency flow.
     - **Horizontal Axis ($X$):** Explicit Subsystem Domain (`Billing`, `Inventory`, `Support`, `Unassigned`).
     - **Edges:** Directed downward arrows showing caller $\rightarrow$ callee relationships.
   - *What the user MUST NEVER mistakenly infer:* The user must never infer that $Y$-position represents quantitative depth from a "center" or that $X$-position represents a continuous scalar metric space.

2. **Local Dependency Impact Question:**
   - *Question:* "What is the exact transitive dependency impact neighborhood ($k$-hop) centered around component X?"
   - *Truthful Visual Encoding:* **Focal Dependency Neighborhood Lens**.
     - **Focal Center $(0,0)$:** Exactly 1 selected focal component X ($k=0$).
     - **Concentric Circles ($R_k = k \cdot \Delta R$):** Shortest-path transitive graph hop distance $k \in \{1, 2, 3\}$.
     - **Angular Placement ($\theta$):** Uniform geometric distribution around the circle to maximize label readability.
   - *What the user MUST NEVER mistakenly infer:* The user must never infer that angular proximity between two nodes on a $k$-hop circle implies functional similarity or domain belonging.

3. **Shared Infrastructure & Coupling Question:**
   - *Question:* "Which underlying controllers, services, and sObjects are shared across multiple top-level entry points (LWCs)?"
   - *Truthful Visual Encoding:* **Shared Infrastructure Topology Lens**.
     - **Outer Boundary Entry Points ("Suns"):** Top-level LWC entry points.
     - **Geometric Centroids:** Shared controllers and sObjects placed at the geometric centroid of referencing entry points.
     - **Local Radial Clusters:** Unshared components placed adjacent to their parent entry point.
   - *What the user MUST NEVER mistakenly infer:* The user must never infer that physical distance from the centroid represents quantitative coupling strength or that hardcoded exceptions dictate node placement.
