# GRAPHVIEW — LENS B DESIGN-NEUTRAL GEOMETRY CONTRACT FINAL CLOSURE AUDIT

## 1. Executive Verdict

**FINAL DECISION:** `C — NOT IMPLEMENTATION READY`

**EXECUTIVE SUMMARY:**
This design-neutral truth audit of **GraphView Lens B — Component Orbit / Component Constellation Geometry, Satellite Ownership, Position Authority, and Browser Geometry** evaluates the repository state against prior audit claims and recommendations.

While previous reports identified active repository bugs (such as position contamination across layout modes), they also introduced several **unfrozen design judgments and recommendations** (e.g., sorting hosts alphabetically, dynamic capacity formulas, peripheral shells at $R_{\text{max}} + 250\text{px}$, opacity 0.3, and composite key structures) as if they were established architectural facts.

This audit strictly separates:
1. **Repository Facts & Defects** (objective errors in current code).
2. **Contract Gaps** (unspecified semantic rules requiring formal definition).
3. **Design Judgments** (product/architecture choices requiring design authority).
4. **Recommendations** (proposed candidate solutions that MUST NOT yet be treated as requirements).

**Key Findings:**
- **Primary Host Selection:** The repository does NOT mandate that a shared `SObject` must have a single primary host. The visual attachment to a single parent in `satellites.ts` is an **implementation choice for collision avoidance**, not a semantic graph truth. Treating visual attachment as semantic ownership creates visual deception for shared enterprise objects.
- **Cross-Mode Position Leakage:** `architecture-layout.ts` (lines 169–171, 219–221) forcibly copies `existingPositions` from previous layout modes into Lens B layout outputs. This is an **objective repository defect** violating position isolation.
- **Angular / Sector Semantics:** In `component-orbit-layout.ts`, angles are assigned via sequential linear stepping ($i \cdot \Delta \theta$), discarding domain and subsystem metadata. Claiming that angles represent "business domains" while calculating them via sequential index steps is an unresolved contradiction.
- **Satellite Capacity & Overflow:** Hardcoded threshold `8` in `component-orbit-layout.ts` is an ungrounded design heuristic. No capacity invariant (e.g. bounding-box clearance, label wrapping bounds) or overflow behavior (spill rings, cluster nodes) is defined by the graph schema or renderer.

---

## 2. Retrieved Context Chain

The 14 authoritative context chain artifacts were retrieved and analyzed in full:

1. `GRAPHVIEW — ARCHITECTURE ORBIT + COMPONENT CONSTELLATION FUNDAMENTAL PRINCIPLES & MODEL AUDIT REPORT`
2. `GRAPHVIEW — SECOND-ORDER VISUAL MODEL VALIDATION / ARCHITECTURE ORBIT + COMPONENT CONSTELLATION`
3. `GRAPHVIEW — FINAL VISUAL MODEL CONTRACT GATE AUDIT`
4. `GRAPHVIEW — FINAL PRE-IMPLEMENTATION TRUTH AUDIT / FOUR-CONDITION CONTRACT CHALLENGE`
5. `GRAPHVIEW_ARCHITECTURAL_SEMANTIC_AUTHORITY_AUDIT_REPORT.md`
6. `GRAPHVIEW_RELATIONSHIP_SEMANTICS_AND_PROJECTION_AUTHORITY_AUDIT_REPORT`
7. `GRAPHVIEW_LENS_RELATIONSHIP_INCLUSION_AND_TRAVERSAL_SEMANTICS_AUDIT_REPORT`
8. `GRAPHVIEW_DISTANCE_ALGEBRA_AND_TRAVERSAL_METRIC_AUDIT_REPORT`
9. `GRAPHVIEW_TERMINAL_DATA_SEMANTICS_AND_COMPLETE_19_RELATIONSHIP_CLOSURE_FINAL_GATE_REPORT`
10. `GRAPHVIEW_SEMANTIC_EXECUTION_PROJECTION_INHERITANCE_POLYMORPHISM_TRUTH_GATE_REPORT`
11. `GRAPHVIEW — FINAL EXECUTION SEMANTICS CONTRADICTION CLOSURE GATE REPORT`
12. `GRAPHVIEW — LENS B BROWSER GEOMETRY + SATELLITE LAYOUT IMPLEMENTATION PROOF`
13. `GRAPHVIEW — LENS B GEOMETRY CONTRACT + SATELLITE OWNERSHIP + POSITION AUTHORITY FINAL GATE REPORT`
14. `GRAPHVIEW_LENS_B_FINAL_GEOMETRY_CONTRACT_CLOSURE_AUDIT_REPORT.md`

---

## 3. Chronological Contract Reconciliation

| Contract | First Proposed | Later Modified | Claimed Closed | Current Repository Truth |
|---|---|---|---|---|
| **Execution Relationship Inclusion** | Report 1 | Report 6, 7 | CLOSED (Report 11) | Bounded by $T_{\text{exec}}$ set in `component-orbit-adapter.ts` |
| **Execution Distance ($d_{\text{exec}}$)** | Report 1 | Report 8 | CLOSED (Report 11) | BFS depth calculated in `graph-depth.ts` |
| **Terminal Data Semantics** | Report 1 | Report 9 | CLOSED (Report 11) | Schema layer nodes (SObjects, CustomFields) |
| **Focal Semantics** | Report 1 | Report 3 | CLOSED (Report 11) | Single focal LWC node placed at origin $(0, 0)$ |
| **Selection Semantics** | Report 3 | Report 4 | CLOSED (Report 14) | `selectedNodeId` owned in `InvestigationContext`, decoupled from focal |
| **Canonical Positions** | Report 3 | Report 4 | CLAIMED CLOSED | Contaminated across modes in `architecture-layout.ts` (DEFECT) |
| **User Drag Positions** | Report 3 | Report 13 | CLAIMED CLOSED | Level 1 drag overrides calculated pos; offset keying unbounded |
| **Satellite Ownership** | Report 1 | Report 13, 14 | UNRESOLVED | 1:1 parent attachment in `satellites.ts` depends on iteration order |
| **Unreachable Nodes** | Report 1 | Report 14 | UNRESOLVED | Detected in adapter; rendered at stale pos in `architecture-layout.ts` |
| **Angular Semantics** | Report 1 | Report 14 | CONTRADICTORY | Linear index stepping ($i \cdot \Delta \theta$), domain metadata unread |
| **Ring Spacing** | Report 1 | Report 12 | PROPOSED | Hardcoded $180\text{px}$ step radius in layout modules |
| **Satellite Capacity** | Report 12 | Report 14 | UNROUNDED | Hardcoded scalar `8` in `component-orbit-layout.ts` |
| **Collision Rules** | Report 12 | Report 13 | CLAIMED CLOSED | Slot search in `satellites.ts`; ring overlap occurs if $N > 7$ |
| **Cross-Mode Isolation** | Report 4 | Report 14 | DEFECT PROVEN | `architecture-layout.ts` copies `existingPositions` across layout modes |

---

## 4. Current Repository Execution Path

The actual execution path in the codebase proceeds as follows:

```text
Graph Truth (`ExplorerDataSchema`)
    │
    ▼
InvestigationContext (`focalLwcId`, `activeLens`)
    │
    ▼
`adaptComponentOrbit` (`component-orbit-adapter.ts`)
    ├──> `computeGraphDepths` (`graph-depth.ts`) -> BFS depths & `unreachableNodeIds`
    └──> returns `ComponentOrbitProjection` { focus, rings, unreachableNodeIds }
    │
    ▼
`computeArchitectureLayoutWithMetadata` (`architecture-layout.ts`)
    ├──> [mode === 'orbit']: `computeComponentOrbitLayout`
    ├──> [mode === 'constellation']: `computeComponentConstellationLayout`
    │       ├──> Merges `existingPositions` for unassigned nodes (DEFECT: Leakage)
    │       └──> `placeSatellites` (`satellites.ts`)
    └──> returns `{ positions, metadata }`
    │
    ▼
Position Policy (`position-policy.ts`) & Cytoscape Canvas
```

---

## 5. Primary Host Necessity and Determinism

**Analysis of Primary Host Requirement:**
1. **Does graph truth require one visual parent?** **NO.** In `ExplorerDataSchema`, `Account` is a shared node with multiple incoming dependency edges (`ServiceA -> Account`, `ServiceB -> Account`).
2. **Is "primary host" a semantic requirement or collision strategy?** **COLLISION STRATEGY.** The 1:1 parent anchoring model in `satellites.ts` was written to simplify polar angle calculations, not to reflect domain truth.
3. **Determinism Assessment:** In `satellites.ts` (lines 115–135), parent anchor selection for shared fields/SObjects depends on `Object.keys()` iteration order or edge array ordering. Reordering input JSON changes which component acts as the visual anchor.

**Classification:**
- **Primary Host Requirement:** `DESIGN JUDGMENT` (Collision strategy vs Shared Node Representation).
- **Current Selection Implementation:** `REPOSITORY DEFECT` (Non-deterministic under input reshuffling).

---

## 6. Shared SObject Visual Semantics

Placing a shared node (e.g. `Account`) directly adjacent as a satellite to `ServiceA`:
- **Semantic Reality:** `ServiceA` does NOT own `Account`. `ServiceB` and `ServiceC` also depend on `Account`.
- **Visual Risk:** Users interpret proximity as private ownership, masking shared dependency risks.
- **Repository Truth:** The UI provides no visual badge, halo, or dashed line distinguishing private satellites from shared enterprise objects.

**Classification:** `INFERENCE` & `DESIGN JUDGMENT`

---

## 7. Satellite Capacity and Overflow Contract

**Invariants & Geometry Reality:**
- **Hardcoded Limit:** `maxSatellitesPerRing = 8` in `component-orbit-layout.ts` (line 42) is an ungrounded design heuristic.
- **Node Dimensions:** Effective node AABB clearance width $W_{\text{eff}} = 160\text{px}$.
- **Ring Geometry:** On Ring 1 ($R = 180\text{px}$), circumference is $1130.97\text{px}$. Max non-overlapping 160px nodes $= \lfloor 1130.97 / 160 \rfloor = 7$. Placing 8 nodes on Ring 1 **guarantees visual bounding-box collision**.

**Classification:**
- **Hardcoded 8:** `DESIGN JUDGMENT` (Ungrounded).
- **Protected Invariant:** `CONTRACT GAP` (Minimum angular separation and AABB bounding-box clearance must be formally specified).

---

## 8. Overflow / Clustering

- **Current Repository Behavior:** There is NO implementation of a "Terminal Data Cluster Node" or aggregate node collapse in Cytoscape.
- **Semantic Hazard:** Introducing a synthetic cluster node in presentation geometry MUST NOT mutate canonical graph truth or obscure searchability.

**Classification:** `CONTRACT GAP` & `DESIGN JUDGMENT`

---

## 9. Unreachable Node Contract

- **Detection:** `adaptComponentOrbit` correctly identifies unreachable nodes in `unreachableNodeIds`.
- **Current Rendering Behavior:** `architecture-layout.ts` lines 219–221 assign `existingPositions` to unreachable nodes, displaying them at stale coordinates from previous views rather than hiding them or isolating them on a peripheral shell.
- **Semantic Distinction:** `unreachable` $\neq$ `hidden` $\neq$ `deleted`.

**Classification:**
- **Stale Position Rendering:** `REPOSITORY DEFECT`.
- **Visibility & Peripheral Shell Policy:** `DESIGN JUDGMENT`.

---

## 10. Canonical Position Authority

**Invariant Violation:**
$$\text{CanonicalPosition} \neq f(\text{graphTruth}, \text{activeLens}, \text{focalNode})$$

**Proof:**
In `architecture-layout.ts`:
```typescript
// Lines 219-221
for (const [id, pos] of Object.entries(existingPositions)) {
  if (!orbitOutput.positions[id]) {
    orbitOutput.positions[id] = pos;
  }
}
```
If node `X` was laid out in `hierarchical` mode at $(x_1, y_1)$ and is absent from the current Orbit projection, `architecture-layout.ts` copies $(x_1, y_1)$ into the Orbit position output.

**Classification:** `REPOSITORY DEFECT`

---

## 11. User Drag Authority and Lifecycle

- **Current Implementation:** User drag session overrides calculated layout (Position Authority Level 1).
- **Keying Defect:** Drag offsets are keyed strictly by `nodeId`. Dragging `Account` in Orbit mode under Focal A applies the same offset when switching to Focal B or Hierarchical mode.

**Classification:**
- **Level 1 Drag Precedence:** `FACT` (Preserved).
- **Unbounded Drag Keying:** `REPOSITORY DEFECT` / `CONTRACT GAP`.

---

## 12. Angular / Sector Semantics

**Contradiction:**
- Prior audit reports asserted that angular sectors represent business domains/subsystems.
- `component-orbit-layout.ts` assigns angles via `i * angleStep` (sequential index stepping), completely ignoring `primaryDomainId` and `primaryFeatureId`.

**Candidate Models:**
- **Model A:** Radius = execution depth; Angle = pure geometric packing.
- **Model B:** Radius = execution depth; Angle = semantic domain sectors.

**Classification:** `UNRESOLVED CONTRADICTION` & `DESIGN JUDGMENT`

---

## 13. Collision Contract

| Collision Type | Current Status | Repository Evidence | Classification |
|---|---|---|---|
| **Node-Body Collision** | **FAILED** on dense rings ($N > 7$) | $8 \times 160\text{px} > 1130.97\text{px}$ circumference | REPOSITORY DEFECT |
| **Label Collision** | **UNBOUNDED** | `graph-style.ts` lacks text wrapping height bounds | CONTRACT GAP |
| **Edge Collision** | **UNBOUNDED** | No edge crossing minimization in radial rings | DESIGN JUDGMENT |
| **Satellite Collision** | **PASSED** | 2D slot search in `satellites.ts` prevents satellite overlaps | FACT |
| **Viewport Overflow** | **UNBOUNDED** | Large $R_{\text{max}}$ exceeds standard canvas viewBox | CONTRACT GAP |

---

## 14. Determinism Proof

- **Focal Determinism:** `PASS` (Same schema + same focal node yields identical projection).
- **Satellite Slot Determinism:** `PASS` (Slot search in `satellites.ts` is deterministic given fixed primary positions).
- **Input Edge-Order Determinism:** `FAIL` (BFS discovery order and primary host selection depend on edge array ordering).
- **Mode Isolation Determinism:** `FAIL` (Contaminated by `existingPositions`).

---

## 15. Dataset Independence

- **Hardcoded PBIM Component Strings:** `NONE` (Zero PBIM component name literals in Lens B layout files).
- **Hardcoded Geometry Constants:** `maxDepth = 7`, `maxSatellites = 8`, `baseRadius = 180px`, `stepRadius = 150px`.

**Classification:** `FACT` (Generic spatial heuristics, zero dataset-specific overrides).

---

## 16. Repository Defects

1. **[DEFECT-01] Cross-Mode Position Contamination:** `architecture-layout.ts` lines 169–171 and 219–221 merge `existingPositions` into Lens B output maps.
2. **[DEFECT-02] Input-Order Dependent Host Attachment:** `satellites.ts` primary parent selection depends on JSON edge array ordering.
3. **[DEFECT-03] Dense Ring Node Bounding-Box Overlaps:** Hardcoded satellite limit `8` on Ring 1 ($R = 180\text{px}$) causes $160\text{px}$ wide nodes to overlap visually.
4. **[DEFECT-04] Stale Coordinate Assignment for Unreachable Nodes:** Unreachable nodes are assigned stale coordinates from `existingPositions` rather than being hidden or placed on an isolated peripheral shell.

---

## 17. Contract Gaps

1. **[GAP-01] Primary Host Selection Rule:** No semantic rule exists for choosing a primary anchor among multiple candidate hosts.
2. **[GAP-02] Protected Capacity Invariant:** No formal invariant defines maximum ring density based on node bounding-box clearance.
3. **[GAP-03] Overflow / Clustering Specification:** No presentation aggregate schema or cluster collapse contract exists.
4. **[GAP-04] Label Bounds & Text Wrapping:** No Cytoscape vertical padding bounds are defined for multiline node labels.
5. **[GAP-05] Drag Offset Lifecycle Keying:** Drag offset storage scope (`projectId`, `layoutMode`, `focalNodeId`, `nodeId`) is undefined in `position-policy.ts`.

---

## 18. Design Judgments

1. **[DJ-01] Visual Representation of Shared Nodes:** Decision required on whether shared `SObjects` attach to one host or render as independent shared graph nodes.
2. **[DJ-02] Angular Semantics Model:** Decision required between Model A (pure geometric packing) and Model B (domain angular sectors).
3. **[DJ-03] Unreachable Node Visibility Policy:** Decision required on whether unreachable components are hidden by default or rendered on a peripheral shell.

---

## 19. Recommendations — NOT FROZEN

The following previous audit proposals are explicitly classified as **UNFROZEN RECOMMENDATIONS**:

1. *Recommendation A:* Sorting host candidates by `interaction count DESC, nodeId ASC`. (Requires Design Authority DJ-01).
2. *Recommendation B:* Capacity formula $N_{\text{max}}(R) = \lfloor 2\pi R / W_{\text{eff}} \rfloor$. (Requires Contract Gap GAP-02 closure).
3. *Recommendation C:* Automatic sub-ring spilling. (Requires Design Authority DJ-02).
4. *Recommendation D:* Peripheral shell at $R_{\text{peripheral}} = R_{\text{max}} + 250\text{px}$. (Requires Design Authority DJ-03).
5. *Recommendation E:* Rendering unreachable nodes with `opacity = 0.3`. (Requires Design Authority DJ-03).
6. *Recommendation F:* Keying drag offsets by `(projectId, layoutMode, focalNodeId, nodeId)`. (Requires Contract Gap GAP-05 closure).

---

## 20. Final Contract Matrix

| Contract | Repository-Proven? | Existing Contract Valid? | Design Decision Required? | Implementation Defect? | Blocking? | Minimal Contract Needed |
|---|---|---|---|---|---|---|
| **1. Canonical SObject Identity** | YES | YES | NO | NO | NO | Exactly 1 node per SObject identity |
| **2. Shared SObject Access** | YES | YES | NO | NO | NO | Multiple distinct edges supported |
| **3. Primary Host Necessity** | NO | NO | **YES (DJ-01)** | NO | **YES** | Define whether shared nodes require single anchor |
| **4. Primary Host Selection** | NO | NO | **YES (DJ-01)** | **YES (DEF-02)** | **YES** | Define input-independent host tie-breaker |
| **5. Visual Ownership Semantics** | NO | NO | **YES (DJ-01)** | NO | **YES** | Distinguish shared dependencies from private children |
| **6. Satellite Capacity Invariant** | NO | NO | NO | **YES (DEF-03)** | **YES** | Enforce $N \cdot W_{\text{eff}} \le 2\pi R$ clearance |
| **7. Overflow Behavior** | NO | NO | **YES (GAP-03)** | NO | **YES** | Define overflow handling strategy |
| **8. Cluster Semantics** | NO | NO | **YES (GAP-03)** | NO | **YES** | Define presentation aggregate schema |
| **9. Unreachable Meaning** | YES | YES | NO | NO | NO | BFS distance $> d_{\text{max}}$ or disconnected |
| **10. Unreachable Visibility** | NO | NO | **YES (DJ-03)** | **YES (DEF-04)** | **YES** | Specify hide vs peripheral shell policy |
| **11. Cross-Mode Isolation** | NO | NO | NO | **YES (DEF-01)** | **YES** | Clear/scope `existingPositions` across modes |
| **12. Cross-Focal Isolation** | NO | NO | NO | **YES (DEF-01)** | **YES** | Clear/scope `existingPositions` across focals |
| **13. Canonical Position Authority**| YES | YES | NO | NO | NO | $P = f(\text{graph}, \text{lens}, \text{focal})$ pure function |
| **14. Drag Authority** | YES | YES | NO | NO | NO | Level 1 drag session overrides calculated pos |
| **15. Drag Lifecycle Scope** | NO | NO | NO | **YES (GAP-05)** | **YES** | Composite-key drag offsets |
| **16. Radius Semantics** | YES | YES | NO | NO | NO | $r = R_0 + d_{\text{exec}} \cdot \Delta R$ |
| **17. Angular Semantics** | NO | NO | **YES (DJ-02)** | NO | **YES** | Choose Model A (Packing) or Model B (Sector) |
| **18. Domain-Sector Semantics** | NO | NO | **YES (DJ-02)** | NO | **YES** | Bind angle to domain if Model B selected |
| **19. Node-Body Collision** | NO | NO | NO | **YES (DEF-03)** | **YES** | Enforce AABB bounding-box clearance |
| **20. Label Collision** | NO | NO | NO | **YES (GAP-04)** | **YES** | Define vertical label padding bounds |
| **21. Satellite Collision** | YES | YES | NO | NO | NO | 0 collisions via slot search |
| **22. Determinism** | NO | NO | NO | **YES (DEF-02)** | **YES** | Guarantee input-order independence |
| **23. Dataset Independence** | YES | YES | NO | NO | NO | 0 PBIM hardcoded literals |
| **24. Selection/Focus Separation** | YES | YES | NO | NO | NO | Selection neutral to navigation |
| **25. Analytical Filtering** | YES | YES | NO | NO | NO | Filtering preserves graph truth |

---

## 21. Implementation-Readiness Gate

### **Final Choice:** **`C — NOT IMPLEMENTATION READY`**

**Reasoning:**
Four repository defects (`DEF-01` to `DEF-04`), five contract gaps (`GAP-01` to `GAP-05`), and three required design authority decisions (`DJ-01` to `DJ-03`) remain unresolved. Implementing Lens B prior to resolving these items will re-introduce state corruption, visual deception, and non-deterministic layout rendering.

---

## 22. Exact Repository Evidence Index

| ID | File Path | Symbol / Function | Line Range | Behavior / Finding | Classification | Impact |
|---|---|---|---|---|---|---|
| **DEF-01** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayoutWithMetadata` | L169–L171, L219–L221 | Merges `existingPositions` for unassigned nodes | **REPOSITORY DEFECT** | Causes nodes from other layout modes to leak into Lens B. |
| **DEF-02** | `explorer/src/lib/layout/satellites.ts` | `placeSatellites` | L115–L135 | Primary parent anchor selected via Map/edge iteration | **REPOSITORY DEFECT** | Creates input-order non-determinism under JSON reshuffling. |
| **DEF-03** | `explorer/src/lib/layout/component-orbit-layout.ts` | `computeComponentOrbitLayout` | L42–L48 | Hardcoded scalar limit `8` | **REPOSITORY DEFECT** | Causes $160\text{px}$ wide node bounding boxes to overlap on Ring 1. |
| **DEF-04** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayoutWithMetadata` | L219–L221 | Assigns stale coordinates to unreachable nodes | **REPOSITORY DEFECT** | Renders unreachable nodes at invalid stale positions. |
| **DJ-01** | `explorer/src/lib/layout/satellites.ts` | `placeSatellites` | Structural | 1:1 parent anchoring for shared SObjects | **DESIGN JUDGMENT** | Requires product decision on shared node representation. |
| **DJ-02** | `explorer/src/lib/layout/component-orbit-layout.ts` | `computeComponentOrbitLayout` | L55–L62 | Sequential angle calculation `i * angleStep` | **DESIGN JUDGMENT** | Requires decision between packing (Model A) and domain sectors (Model B). |
| **DJ-03** | `explorer/src/components/GraphView.tsx` | `GraphView` component | L831–L845 | Handling of `unreachableNodeIds` | **DESIGN JUDGMENT** | Requires product decision on hide vs peripheral shell rendering. |
