# GRAPHVIEW LENS B FUNDAMENTAL-PRINCIPLES DECISION CLOSURE AND MINIMUM FROZEN CONTRACT AUDIT

## 1. Executive Decision and Rationale

**FINAL VERDICT:** `DECISION C — CONTRACT NOT FROZEN`

### Executive Rationale
This repository-truth, context-retrieval-driven, read-only adversarial audit evaluated **GraphView Lens B — Component Orbit / Component Constellation** to establish whether all remaining semantic, geometric, and operational questions can be resolved from authoritative requirements, established product behavior, historical decisions, and actual repository evidence.

While execution semantics ($T_{\text{exec}}$, $d_{\text{exec}}$, BFS distance algebra, 19-relationship taxonomy, focal sun centering, and selection neutrality) are closed as repository facts, **Lens B geometry and operational contracts CANNOT be frozen** because four fundamental, implementation-blocking product/design decisions remain unresolved and lack authoritative specification:

1. **Shared SObject Representation & Primary Ownership (Gate A):** The repository schema (`ExplorerDataSchema`) does NOT assign enterprise entities (`Object:Account`) to a single host component (`ServiceA`). Attaching shared objects as satellites to a single parent is an **implementation convenience for collision avoidance**, not a semantic truth. Attaching a shared object to one arbitrary component visually misleads users into perceiving shared enterprise objects as private child components. Arbitrary tie-breaking (e.g. `nodeId` sorting or interaction-count ranking) achieves determinism, but determinism alone does not convert a false ownership claim into a valid architectural fact.
2. **Angular / Sector Semantics (Gate B):** A direct contradiction exists between historical claims that "angular sectors convey business or architectural domains" and actual code implementations in `component-orbit-layout.ts` (lines 193–194) where polar angles are assigned via uniform linear step ($\Delta\theta = 2\pi / N$) after alphabetical `nodeId` sorting, discarding domain metadata entirely.
3. **Unreachable Node Visibility Policy (Gate C):** The adapter's `unreachableNodeIds` set conflates depth-truncated nodes, disconnected graph components, and schema-filtered elements. `architecture-layout.ts` forcibly assigns stale coordinates from previous layout modes to unreachable nodes (lines 169–171, 219–221), causing disconnected nodes to linger at invalid positions.
4. **Drag Lifecycle & Composite State Identity (Gate G):** Dragged node positions are currently persisted in `projectState.ts` (line 47) using a flat `Record<string, Position>` keyed solely by `nodeId`. This causes user drags performed in one layout mode or focal context to contaminate node positions across all other focal contexts and layout modes.

Because these decisions require explicit product/architecture design authority choices that cannot be manufactured from code defaults or lower-level audit recommendations, **GraphView Lens B cannot be declared frozen for implementation**.

---

## 2. Context-Retrieval Manifest

All 16 required historical predecessor reports were retrieved from the repository root, re-read, and validated against current repository state:

| # | Filename / Artifact | Scope & Description | Status | Size (Bytes) |
|---|---|---|---|---|
| 1 | `GRAPHVIEW_LENS_B_FINAL_DESIGN_AUTHORITY_AND_CONTRACT_FREEZE_AUDIT_REPORT.md` | Highest-priority predecessor. Established Decision C. | **RETRIEVED** | 19,485 |
| 2 | `GRAPHVIEW_LENS_B_DESIGN_NEUTRAL_GEOMETRY_CONTRACT_FINAL_CLOSURE_AUDIT_REPORT.md` | Audit of design-neutral geometry contracts and gaps. | **RETRIEVED** | 21,253 |
| 3 | `GRAPHVIEW_LENS_B_FINAL_GEOMETRY_CONTRACT_CLOSURE_AUDIT_REPORT.md` | Forensic evaluation of Lens B geometry contracts. | **RETRIEVED** | 28,091 |
| 4 | `GRAPHVIEW_LENS_B_GEOMETRY_CONTRACT_SATELLITE_OWNERSHIP_POSITION_AUTHORITY_GATE_REPORT.md` | Satellite ownership and position authority gate. | **RETRIEVED** | 22,753 |
| 5 | `GRAPHVIEW_LENS_B_BROWSER_GEOMETRY_SATELLITE_LAYOUT_PROOF_REPORT.md` | Real-browser geometry and satellite layout proof. | **RETRIEVED** | 24,209 |
| 6 | `GRAPHVIEW_FINAL_EXECUTION_SEMANTICS_CONTRADICTION_CLOSURE_GATE_REPORT.md` | Final closure of execution semantics ($T_{\text{exec}}, d_{\text{exec}}$). | **RETRIEVED** | 29,433 |
| 7 | `GRAPHVIEW_SEMANTIC_EXECUTION_PROJECTION_INHERITANCE_POLYMORPHISM_TRUTH_GATE_REPORT.md` | Projection, inheritance, and polymorphism truth gate. | **RETRIEVED** | 24,953 |
| 8 | `GRAPHVIEW_TERMINAL_DATA_SEMANTICS_AND_COMPLETE_19_RELATIONSHIP_CLOSURE_FINAL_GATE_REPORT.md` | Terminal data semantics and 19-relationship taxonomy. | **RETRIEVED** | 52,188 |
| 9 | `GRAPHVIEW_DISTANCE_ALGEBRA_AND_TRAVERSAL_METRIC_AUDIT_REPORT.md` | BFS distance algebra and traversal metric audit. | **RETRIEVED** | 17,995 |
| 10 | `GRAPHVIEW_LENS_RELATIONSHIP_INCLUSION_AND_TRAVERSAL_SEMANTICS_AUDIT_REPORT.md` | Relationship inclusion and traversal semantics. | **RETRIEVED** | 20,139 |
| 11 | `GRAPHVIEW_RELATIONSHIP_SEMANTICS_AND_PROJECTION_AUTHORITY_AUDIT_REPORT.md` | Relationship semantics and projection authority. | **RETRIEVED** | 24,156 |
| 12 | `GRAPHVIEW_ARCHITECTURAL_SEMANTIC_AUTHORITY_AUDIT_REPORT.md` | Architectural semantic authority audit. | **RETRIEVED** | 28,974 |
| 13 | `GRAPHVIEW_FINAL_PRE_IMPLEMENTATION_TRUTH_AUDIT_REPORT.md` | Four-condition contract challenge audit. | **RETRIEVED** | 17,720 |
| 14 | `GRAPHVIEW_FINAL_VISUAL_MODEL_CONTRACT_GATE_REPORT.md` | Final visual model contract gate. | **RETRIEVED** | 30,772 |
| 15 | `GRAPHVIEW_SECOND_ORDER_VISUAL_MODEL_VALIDATION_REPORT.md` | Second-order visual model validation. | **RETRIEVED** | 44,603 |
| 16 | `GRAPHVIEW — ARCHITECTURE ORBIT + COMPONENT CONSTELLATION FUNDAMENTAL PRINCIPLES and MODEL AUDIT REPORT READ-ONLY ADVERSARIAL AUDIT.md` | Fundamental principles and visual model audit. | **RETRIEVED** | 28,610 |

In addition, current project state context files in `context/` (`CURRENT-ARCHITECTURE.md`, `CURRENT-CONTRACTS.md`, `CURRENT-DECISIONS.md`, `CURRENT-IMPLEMENTATION.md`, `CURRENT-TESTS.md`) were retrieved and reconciled.

---

## 3. Evidence Hierarchy and Authoritative Sources

All claims in this audit are evaluated against the strict 6-tier evidence hierarchy:

1. **Tier 1: Explicit User/Product Requirements or Approved Design Decisions:** Authoritative product contracts.
2. **Tier 2: Verified Architectural or Semantic Contracts:** Closed facts from prior authoritative audits ($T_{\text{exec}}$, $d_{\text{exec}}$, BFS algebra).
3. **Tier 3: Actual Repository Implementation & Reachable Path:** Code truth in `explorer/src/`.
4. **Tier 4: Tests and Reproducible Runtime Evidence:** Vitest unit test suites and Playwright automation.
5. **Tier 5: Historical Audit Interpretations:** Claims and analyses from prior reports.
6. **Tier 6: Recommendations & Hypothetical Designs:** Unapproved proposals or formulas.

### Evidence Classification Matrix
Every conclusion is explicitly categorized:
- **FACT:** Supported by direct source code, schema, or test evidence.
- **INFERENCE:** Directly derived from logical implications of facts.
- **DESIGN JUDGMENT:** Requires a choice of user-facing meaning by product authority.
- **RECOMMENDATION:** Proposed implementation option; not an established requirement.
- **UNRESOLVED:** Insufficient evidence or authority to decide.

---

## 4. Actual Current Architecture and Data-Flow Trace

```
1. ExplorerDataSchema (`explorer/src/types/explorer.ts`)
   │  (Contains canonical nodes, edges, summary, cycles, unresolvedReferences)
   ▼
2. InvestigationContext (`explorer/src/context/InvestigationContext.tsx`)
   │  (Holds transient selection state: focalLwcId, selectedNodeId, activeLens)
   ▼
3. adaptComponentOrbit / adaptComponentConstellation (`explorer/src/lib/adapters/`)
   │  ├── Invokes computeGraphDepths (`graph-depth.ts`) via BFS traversal
   │  ├── Assigns depth = ringIndex, classifies role symbols (☉, ◎, ◉, ○)
   │  └── Returns ComponentOrbitProjection { focus, rings, nodes, edges, unreachableNodeIds }
   ▼
4. computeArchitectureLayoutWithMetadata (`explorer/src/lib/architecture-layout.ts`)
   │  ├── Calls computeComponentOrbitLayout (`component-orbit-layout.ts`)
   │  │   ├── G1: Focal Sun placed at center (0, 0)
   │  │   ├── G2/G3: Depth N nodes assigned to Ring N
   │  │   ├── G4/G5: Sort nodes by nodeId (localeCompare) -> assign angle = idx * (2π / N)
   │  │   └── G6-G12: Check AABB overlap & perform multi-track radial expansion
   │  ├── [DEFECT lines 169-171, 219-221] Merges existingPositions for unassigned nodes
   │  └── Returns { positions, orbitGuides, projectedNodeIds }
   ▼
5. Position Policy (`explorer/src/lib/position-policy.ts`)
   │  (Resolves 5-level Position Authority hierarchy)
   ▼
6. Cytoscape Rendering (`explorer/src/components/GraphView.tsx`)
   │  (Applies positions, applies LOD, renders node bodies and labels)
```

---

## 5. Shared SObject Representation and Satellite Ownership (Decision Gate A)

### Canonical Problem Case
```
ServiceA ──► Account
ServiceB ──► Account
ServiceC ──► Account
```

### Analysis against Repository Truth
1. **Canonical Identity:** `ExplorerDataSchema` defines `Object:Account` as **one single canonical entity**.
2. **Relationship Visibility:** Three directed edges (`ServiceA->Account`, `ServiceB->Account`, `ServiceC->Account`) exist in `ExplorerDataSchema`.
3. **Ownership Truth:** The schema does NOT assign enterprise objects to a single parent. `Account` is a shared enterprise table, not a private child of `ServiceA`.
4. **Satellite Placement Code:** In `satellites.ts` (`findParentObjectId`), field/satellite placement attaches `Account` to a single parent component found via map iteration.
5. **Semantic Misrepresentation:** Attaching `Account` as a satellite underneath `ServiceA` visually communicates that `Account` is an internal private child of `ServiceA`, disguising its shared nature across `ServiceB` and `ServiceC`.
6. **Tie-Breaking Fallacy:** Arbitrary tie-breaking (e.g. sorting by `nodeId` or interaction count) makes the choice deterministic, but determinism alone does not convert a false ownership claim into an architectural truth.

### Comparison of Visual Representation Models

| Model | Identity Preservation | Edge Preservation | Visual Meaning | Layout Feasibility | Classification |
|---|---|---|---|---|---|
| **1. Shared Node with Multi-Tethers** | 100% (1 Node) | 100% (3 Edges) | Shared enterprise node; no privileged owner. | Requires dynamic inter-component tethers; may cross rings. | **RECOMMENDATION** |
| **2. Designated Geometric Anchor** | 100% (1 Node) | 100% (3 Edges) | Node anchored near primary consumer with explicit "SHARED" badge. | Straightforward; requires badge rendering. | **RECOMMENDATION** |
| **3. Visual Clones / Cloned Satellites** | Duplicated visual nodes | Split per-clone edges | Each service gets a local proxy referencing canonical `Account`. | Simple local layout; breaks 1:1 node visual identity without clear indication. | **RECOMMENDATION** |

**Gate A Outcome:** `UNRESOLVED` (`DESIGN JUDGMENT`). No authoritative requirement selects among these models. Product/design authority must explicitly choose the shared entity representation rule.

---

## 6. Angular Semantics (Decision Gate B)

### Model Evaluation
- **Model A (Geometry-Only Packing):** Angles are assigned purely for collision avoidance and uniform spatial distribution. Angular proximity conveys zero domain or business meaning.
- **Model B (Semantically Meaningful Sectors):** Angular regions/wedges encode explicit business domains, functional groups, or architectural layers.

### Repository Truth & Contradiction Evidence
- In `component-orbit-layout.ts` (lines 193–194):
  $$\Delta\theta = \frac{2\pi}{N_k}, \quad \theta_i = \text{offset} + i \cdot \Delta\theta$$
  Nodes on a ring are sorted purely alphabetically by `nodeId` (`ringNodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId))`).
- The current implementation is **100% Model A (Geometry-Only Packing)**. Domain stem and sector metadata are completely discarded.
- However, historical Report 1 and Orbit C2/C10 documents claimed "sectors represent business/architectural domains" (Model B).
- While radial distance semantics ($d_{\text{exec}} = \text{Ring Index}$) are closed as a `FACT`, angular semantics in Lens B remain an unresolved contradiction between historical proposals and actual geometry-only packing code.

**Gate B Outcome:** `UNRESOLVED` (`DESIGN JUDGMENT`). Product/design authority must establish whether angles communicate business domain membership (Model B) or pure uniform spatial distribution (Model A).

---

## 7. Unreachable Nodes and Visibility (Decision Gate C)

### Repository Evidence
In `component-orbit-adapter.ts` (lines 280–285), `unreachableNodeIds` contains all nodes where `depthMap.has(id)` is false. This single array conflates three distinct states:
1. **Depth-Truncated Nodes:** Reachable in graph topology, but beyond `maxDepth` (e.g. depth > 7).
2. **Disconnected Components:** Completely unreachable from focal LWC (0 topological paths).
3. **Filtered/Excluded Elements:** Excluded by relationship type filters (e.g. `includeTestReferences: false`).

In `architecture-layout.ts` (lines 169–171, 219–221), nodes NOT returned by Lens B layout have their stale coordinates copied from `existingPositions`. As a result, disconnected or truncated nodes linger at invalid coordinates from previous views.

### Evaluation of Presentation Policies

| Policy | Semantic Truth | User Comprehension | Graph Completeness | Classification |
|---|---|---|---|---|
| **Hide Unreachable Nodes** | High (Shows only focal subgraph) | High (Clean focal view) | Subgraph only | **RECOMMENDATION** |
| **Peripheral Outer Shell ($R_{\text{max}} + \Delta R$)** | Medium (Differentiates reachable vs unreachable) | Medium (Visual clutter at edge) | 100% Complete | **RECOMMENDATION** |
| **Adapter Boundary Exclusion** | High (Excludes at projection) | High (Strict focal context) | Subgraph only | **RECOMMENDATION** |

**Gate C Outcome:** `UNRESOLVED` (`DESIGN JUDGMENT`). Product authority must establish the explicit visibility policy for unreachable nodes.

---

## 8. Ring Capacity and Collision Invariants (Decision Gate D)

### Re-Evaluation of Hardcoded Capacity vs Actual Geometry
Prior reports proposed the scalar circumference capacity condition:
$$N \cdot W_{\text{eff}} \le 2\pi R$$

### Geometric Validation against Actual Rendering Engine
1. **Bounding Box Dimensions:** Base node width $W = 120\text{px}$, base height $H = 60\text{px}$. With clearance gaps $C_x = 40\text{px}, C_y = 40\text{px} \implies W_{\text{eff}} = 160\text{px}, H_{\text{eff}} = 100\text{px}$.
2. **Diagonal Chord Distance:** The bounding diagonal is $\sqrt{160^2 + 100^2} \approx 188.68\text{px}$.
3. **Chord Separation vs Arc Separation:** On a circle of radius $R$, straight-line chord distance between $N$ node centers is:
   $$d_{\text{chord}} = 2 R \sin\left(\frac{\pi}{N}\right)$$
   For non-overlap, $d_{\text{chord}} \ge \sqrt{W_{\text{eff}}^2 + H_{\text{eff}}^2}$. Therefore:
   $$R \ge \frac{\sqrt{W_{\text{eff}}^2 + H_{\text{eff}}^2}}{2 \sin\left(\frac{\pi}{N}\right)}$$
4. **Scalar Arc Flaw:** The scalar formula $2\pi R / N \ge W_{\text{eff}}$ uses arc length, which underestimates required radial distance for rectangular nodes because arc length is strictly greater than straight-line chord distance, and completely ignores node height $H$ and variable label bounds!
5. **Cytoscape Label Rendering:** Cytoscape renders non-rotated axis-aligned bounding boxes (AABBs). Longer label text (12px font) increases node bounding height and width, making scalar limits (such as hardcoded 8) unreliable without dynamic AABB checks.

### Separation of Concerns
- **1. Safety Invariant:** Mandatory AABB non-overlap (`abs(dx) >= W_eff || abs(dy) >= H_eff`) across all rendered node pairs (`FACT`).
- **2. Capacity Policy:** Number of nodes placed per radial track (`CONTRACT GAP`).
- **3. Overflow Policy:** Multi-track concentric radial expansion (`component-orbit-layout.ts` lines 165–170) (`FACT`).

**Gate D Outcome:** `CONTRACT GAP` (`INFERENCE`). The safety invariant (AABB non-overlap) is proven, but scalar capacity numbers (8 or scalar arc formulas) are ungrounded. Capacity must depend on variable node/label bounds and chord separation.

---

## 9. Overflow and Clustering (Decision Gate E)

### Evaluation
- `ExplorerDataSchema` contains zero cluster entity types.
- `component-orbit-layout.ts` handles geometric overflow by multi-track radial track expansion (`trackIdx` 0, 1, 2...) on the same semantic ring index (`ringIndex`), adding `trackSpacing` (160px).
- Multi-track expansion handles geometric overflow purely via radial spacing without inventing fake cluster nodes!
- Inventing "cluster nodes" without schema authority would mutate canonical graph truth and create fake entities that could be mistaken for Salesforce components.

**Gate E Outcome:** `FROZEN` (`FACT`). Canonical graph truth must remain un-mutated. Geometric overflow is handled via multi-track layout expansion; product-level aggregation is an optional non-canonical presentation overlay if authorized in the future.

---

## 10. Position Authority and Cross-Mode Isolation (Decision Gate F)

### Proven Repository Defect Evidence
In `explorer/src/lib/architecture-layout.ts`:
- **Lines 169–171 (Constellation Mode):**
  ```typescript
  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos && !(id in constellationOutput.positions)) {
      constellationPositions[id] = { x: pos.x, y: pos.y };
    }
  }
  ```
- **Lines 219–221 (Orbit Mode):**
  ```typescript
  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos && !(id in orbitOutput.positions)) {
      orbitPositions[id] = { x: pos.x, y: pos.y };
    }
  }
  ```

When switching layout modes (e.g. from Hierarchical to Orbit/Constellation) or changing focal nodes in Orbit mode, `existingPositions` (passed from `graphLayout.nodePositions`) contains positions of nodes from the PREVIOUS mode/focal context.

Any node not projected in the new Lens B layout has its old coordinates forcibly merged into `orbitPositions` / `constellationPositions`. This directly violates Position Authority Level 4 pure layout constraints and causes cross-mode and cross-focal position contamination.

**Gate F Outcome:** `REPOSITORY DEFECT CONFIRMED` (`FACT`).

---

## 11. Drag Lifecycle and State Identity (Decision Gate G)

### Repository Evidence & Lifecycle Analysis
In `explorer/src/lib/projectState.ts` (line 47), positions are stored as:
```typescript
export interface GraphLayoutState {
  nodePositions: Record<string, { x: number; y: number }>;
}
```
The storage key is solely `nodeId`.

### State Contamination Impact
Because the storage key is only `nodeId`, a user drag performed while viewing `"LWC:Header"` in Orbit mode is saved as `nodePositions["Object:Account"] = { x: 500, y: 200 }`.
When the user switches focal node to `"LWC:Footer"` or switches layout mode to `hierarchical`, the position policy (`position-policy.ts` line 131) reads `persistedPositions["Object:Account"]` and forces `Object:Account` to `{ x: 500, y: 200 }`.

### Composite State Identity Invariant
To guarantee cross-mode and cross-focal isolation, user drag state must be scoped using a composite key:
$$\text{StorageKey} = (\text{projectId}, \text{layoutMode}, \text{focalNodeId} \mid \text{'global'}, \text{nodeId})$$

**Gate G Outcome:** `UNRESOLVED` (`DESIGN JUDGMENT`). The minimum state-identity composite key invariant is derived, but product authority must specify persistence lifetime (session-only vs project-level permanent override).

---

## 12. Determinism, Identity, and Dataset Independence Matrix (Decision Gate H)

| Property | Target Requirement | Current Repository Status | Evidence / Source | Scope |
|---|---|---|---|---|
| **Canonical Node Identity** | Preserved 1:1 without duplication | **PASS** | `component-orbit-adapter.ts` line 347 | `FACT` |
| **Relationship Preservation** | Preserved with provenance | **PASS** | `component-orbit-adapter.ts` line 428 | `FACT` |
| **Shared Entity Uniqueness** | Single canonical entry in projection | **PASS** | `component-orbit-adapter.ts` line 302 | `FACT` |
| **Input Order Invariance** | Deterministic sort before layout | **PASS** | `component-orbit-adapter.ts` lines 146–155 | `FACT` |
| **Edge-Order Invariance** | Sort edges prior to traversal | **PASS** | `component-orbit-adapter.ts` lines 148–155 | `FACT` |
| **Cross-Mode Position Isolation** | No stale position contamination | **FAIL** | `architecture-layout.ts` lines 169–171, 219–221 | `REPOSITORY DEFECT` |
| **Dataset Independence** | Generic schema, no project hardcoding | **PASS** | `component-orbit-layout.ts` lines 99–120 | `FACT` |
| **Focal / Selection Separation** | Selection neutral in `InvestigationContext` | **PASS** | `InvestigationContext.tsx` line 45 | `FACT` |
| **General Layout Invariants** | G1–G12 geometry invariants | **PASS** | `component-orbit-layout.test.ts` (all pass) | `FACT` |

---

## 13. Contradiction and Historical Decision Ledger

| # | Conflict Subject | Historical Claim & Source | Current Repository Truth | Classification | Final Disposition |
|---|---|---|---|---|---|
| 1 | **Angular / Sector Semantics** | "Sectors communicate business domains" (Report 1 & Orbit C2). | `component-orbit-layout.ts` (lines 193–194) assigns angles via uniform step $\Delta\theta = 2\pi/N$, discarding domain metadata. | `DESIGN JUDGMENT` | **UNRESOLVED.** Requires product decision between Model A (packing) and Model B (domain sectors). |
| 2 | **Shared SObject Ownership** | Shared SObjects must be attached to a single primary host component (Report 13). | `ExplorerDataSchema` has 0 primary host fields. Single parent attachment in `satellites.ts` is an implementation convenience for collision avoidance. | `DESIGN JUDGMENT` | **UNRESOLVED.** Requires product decision on shared entity representation. |
| 3 | **Unreachable Node Visibility** | Unreachable nodes should be placed on a peripheral shell (Report 1). | `architecture-layout.ts` lines 169–171/219–221 copies stale coordinates from previous views into output. | `REPOSITORY DEFECT` & `DESIGN JUDGMENT` | **UNRESOLVED.** Requires explicit visibility policy (hide vs peripheral shell). |
| 4 | **Position Authority Isolation** | Pure layout calculation should not inherit stale positions (Report 3). | `architecture-layout.ts` forcibly merges `existingPositions` into Lens B outputs for unassigned nodes. | `REPOSITORY DEFECT` | **RETAINED DEFECT.** Confirmed repository defect. |
| 5 | **Ring Capacity Formula** | $N \cdot W_{\text{eff}} \le 2\pi R$ guarantees zero collisions (Report 12). | Arc length formula underestimates required chord distance $2R\sin(\pi/N)$ and ignores variable AABB label bounds. | `CONTRACT GAP` | **SUPERSEDED.** Replaced by chord clearance & AABB overlap predicate. |
| 6 | **Drag Storage Keying** | Flat `nodeId` keying in `projectState.ts` is sufficient (Report 1). | Single `nodeId` key causes user drag in one mode/focal context to distort positions in other views. | `CONTRACT GAP` | **SUPERSEDED.** Requires composite keying `(projectId, layoutMode, focalNodeId, nodeId)`. |

---

## 14. Repository Defects Inventory

### Defect 1: Cross-Mode and Cross-Focal Position Contamination
- **File Path:** `explorer/src/lib/architecture-layout.ts`
- **Line Numbers:** 169–171 (Constellation Mode), 219–221 (Orbit Mode)
- **Code:**
  ```typescript
  for (const [id, pos] of Object.entries(existingPositions)) {
    if (pos && !(id in orbitOutput.positions)) {
      orbitPositions[id] = { x: pos.x, y: pos.y };
    }
  }
  ```
- **Impact:** Merges stale node coordinates from previous layout modes or focal contexts into newly calculated Lens B outputs.

### Defect 2: Flat Drag/Persisted Position Storage Keying
- **File Path:** `explorer/src/lib/projectState.ts`
- **Line Numbers:** Line 47 (`nodePositions: Record<string, { x: number; y: number }>;`)
- **Impact:** User drag positions are stored without `layoutMode` or `focalNodeId` scope, contaminating other views.

### Defect 3: Unreachable Node Stale Coordinate Inheritance
- **File Path:** `explorer/src/lib/architecture-layout.ts`
- **Line Numbers:** Lines 169–171, 219–221
- **Impact:** Assigns stale positions to unreachable nodes instead of hiding or isolating them.

---

## 15. Contract Gaps and Design Decisions

| Gap # | Category | Description | Required Design Authority Decision |
|---|---|---|---|
| **GAP-01** | Gate A | Shared SObject Representation | Choose between Single Shared Node with Multi-Tethers, Designated Geometric Anchor, or Visual Clones. |
| **GAP-02** | Gate B | Angular Semantics | Choose between Model A (Geometry-Only Uniform Packing) and Model B (Semantically Meaningful Sectors). |
| **GAP-03** | Gate C | Unreachable Node Visibility | Specify whether unreachable nodes are hidden, placed on a peripheral shell, or excluded at adapter boundary. |
| **GAP-04** | Gate D | Dynamic Label Capacity Formula | Specify dynamic chord clearance formula accounting for variable AABB label dimensions. |
| **GAP-05** | Gate G | Drag Position Persistence Scope | Specify whether user drag overrides persist per-session, per-project, or reset on focal change. |

---

## 16. Minimal Genuinely Frozen Contract

The following statements are genuinely frozen and supported by repository facts:

### Layer 1 — Semantic Graph Contract (FROZEN)
- **1.1 Canonical Identity:** Every graph node possesses a immutable canonical string `id` (e.g. `LWC:vendor-workspace`, `Object:Account`).
- **1.2 Traversal Algebra:** Lens B traversal uses pure BFS distance algebra over authorized edge types (`DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`).
- **1.3 Execution Depth:** Depth $d_{\text{exec}} = 0$ for focal sun, $d_{\text{exec}} = 1$ for direct dependencies/dependents, up to $d_{\text{exec}} = \text{maxDepth}$.
- **1.4 Immutability:** Adapter functions (`adaptComponentOrbit`, `adaptComponentConstellation`) are pure functions that clone inputs and cause zero graph mutation.

### Layer 2 — Lens B Projection Contract (PARTIALLY FROZEN)
- **2.1 Focal Sun Assignment:** In Orbit mode, specified `focalLwcId` is assigned as focal sun (depth 0). If omitted or invalid, adapter deterministically picks the highest-coupling root LWC.
- **2.2 Reachable Node Dictionary:** Reachable nodes are placed into depth-indexed rings (`rings[depth]`).
- **2.3 Selection Neutrality:** Selection state (`selectedNodeId`) is owned exclusively in `InvestigationContext` and does not alter layout coordinates.

### Layer 3 — Geometry Contract (PARTIALLY FROZEN)
- **3.1 Focal Sun Placement:** Focal sun is placed at Cartesian origin $(0, 0)$.
- **3.2 Ring Isolation (G2):** Nodes assigned to depth $d$ are placed strictly on radial ring $d$.
- **3.3 Multi-Track Expansion:** When ring node count exceeds `maxNodesPerTrack` (16), nodes expand into concentric tracks (`trackIdx` 0, 1, 2...) with radial track spacing (160px).
- **3.4 Determinism (G4):** Nodes are sorted deterministically by `nodeId.localeCompare()` prior to angle calculation.

### Layer 4 — Position Authority Contract (UNFROZEN / DEFECTS ISOLATED)
- **4.1 Hierarchy:** Position authority levels: 1 = User Drag, 2 = Persisted Project State, 3 = Cytoscape DOM, 4 = Layout Calculation, 5 = Fallback.
- **4.2 Pure Calculation Constraint:** Layout calculation MUST NOT inherit stale positions from previous layout modes or focal contexts (Defect in `architecture-layout.ts` lines 169–171, 219–221 must be resolved before freezing).

### Layer 5 — Rendering Contract (PARTIALLY FROZEN)
- **5.1 AABB Non-Overlap Invariant:** No two rendered node bounding boxes may overlap: $\forall i \neq j, \lvert x_i - x_j \rvert \ge W_{\text{eff}} \lor \lvert y_i - y_j \rvert \ge H_{\text{eff}}$.

---

## 17. Explicit Unresolved Decisions Required for Closure

To reach contract closure (PASS / DECISION A or B) in a future audit, product/design authority must provide explicit answers to the following 4 questions:

1. **Question 1 (Shared SObjects):** When a single `SObject` (e.g. `Account`) is referenced by 3 LWC components, should it be rendered as:
   - (a) A single shared node connected by 3 visual tethers across components?
   - (b) A single node anchored to one host with a visual "SHARED" indicator?
   - (c) Relationship-specific visual proxy clones?
2. **Question 2 (Angular Semantics):** Should polar angles on a ring convey:
   - (a) Geometry-only uniform spatial distribution (Model A)?
   - (b) Business / architectural domain sectors (Model B)?
3. **Question 3 (Unreachable Nodes):** Should nodes disconnected from the focal LWC or beyond max depth be:
   - (a) Hidden completely from the view?
   - (b) Placed on a peripheral outer ring ($R_{\text{max}} + \Delta R$) with reduced opacity?
   - (c) Excluded at the adapter boundary?
4. **Question 4 (Drag Lifecycle Scope):** Should a user drag position persist:
   - (a) Only within the current focal node and layout mode session?
   - (b) Across focal node changes within the same layout mode?
   - (c) Permanently across all views for that project?

---

## 18. Final Decision Gate

### **FINAL DECISION: `DECISION C — CONTRACT NOT FROZEN`**

**Justification:** Implementation-blocking semantic and product decisions (Shared SObject representation, Angular domain sectors, Unreachable node visibility, and Drag position lifecycle) remain unresolved, and repository defects exist in `architecture-layout.ts` (lines 169–171, 219–221) and `projectState.ts` (line 47). Contract freeze cannot proceed until product authority resolves these questions.

---

## 19. Evidence Index

| Artifact / Module | File Path | Line Ranges | Verified Scope |
|---|---|---|---|
| Architecture Layout Orchestrator | `explorer/src/lib/architecture-layout.ts` | 21–24, 109–120, 169–171, 219–221 | Position leak defects & mode dispatch |
| Component Orbit Adapter | `explorer/src/lib/adapters/component-orbit-adapter.ts` | 139–155, 222–242, 280–285 | Deterministic sort, focal sun, depth map |
| Component Orbit Layout Engine | `explorer/src/lib/layout/component-orbit-layout.ts` | 99–120, 154, 193–194, 210–225 | Geometry calculation, linear angle step, multi-track expansion |
| Satellite Layout Engine | `explorer/src/lib/layout/satellites.ts` | 456–480 | Secondary satellite placement & single parent lookup |
| Position Policy | `explorer/src/lib/position-policy.ts` | 83–105, 110–135 | 5-level position authority resolution |
| Project State Storage | `explorer/src/lib/projectState.ts` | 42–49, 195–206, 310–328 | Flat `nodePositions` storage & localStorage schema |
| Cytoscape Graph Canvas | `explorer/src/components/GraphView.tsx` | 502, 776, 804, 831–840 | `persistedPositions` ref passing & element sync |
