# GRAPHVIEW — LENS B FINAL DESIGN AUTHORITY AND CONTRACT FREEZE AUDIT

## 1. Executive Verdict

**FINAL DECISION:** `C — CONTRACT NOT FROZEN`

**EXECUTIVE SUMMARY:**
This final design-authority and contract-freeze audit evaluates **GraphView Lens B — Component Orbit / Component Constellation** to establish the exact boundary between:
$$\text{REPOSITORY TRUTH} \longrightarrow \text{SEMANTIC INVARIANT} \longrightarrow \text{DESIGN AUTHORITY} \longrightarrow \text{FROZEN CONTRACT} \longrightarrow \text{IMPLEMENTATION}$$

The audit confirms that while the execution semantics layer ($T_{\text{exec}}$, $d_{\text{exec}}$, BFS distance algebra, 19-relationship taxonomy) is previously closed, **Lens B geometry contracts CANNOT be frozen without explicit product/architecture design-authority decisions**.

Specifically:
1. **Primary-Host Requirement:** The repository schema (`ExplorerDataSchema`) does NOT mandate that a shared terminal `SObject` must be visually owned by a single host component. Attaching a shared object (`Account`) as a satellite to a single parent (`ServiceA`) is an **implementation choice for collision avoidance**, not an architectural truth. Doing so visually misleads users into perceiving shared enterprise objects as private child components.
2. **Angular / Sector Semantics:** A fundamental contradiction remains between prior assertions that "sectors communicate business domains" and code implementations in `component-orbit-layout.ts` where angles are calculated via linear index stepping ($i \cdot \Delta \theta$), discarding domain metadata.
3. **Position Authority Contamination:** `architecture-layout.ts` (lines 169–171, 219–221) forcibly copies `existingPositions` from previous layout modes or focal contexts into Lens B outputs, violating Position Authority Level 4 pure function constraints.
4. **Unreachable Node Policy:** `architecture-layout.ts` assigns stale coordinates to unreachable nodes instead of hiding them or isolating them on a peripheral shell, causing disconnected nodes to linger at invalid positions.

---

## 2. Retrieved Context Chain

All 15 historical context artifacts were retrieved and revalidated:

1. `GRAPHVIEW — ARCHITECTURE ORBIT + COMPONENT CONSTELLATION FUNDAMENTAL PRINCIPLES & MODEL AUDIT REPORT`
2. `GRAPHVIEW — SECOND-ORDER VISUAL MODEL VALIDATION / ARCHITECTURE ORBIT + COMPONENT CONSTELLATION`
3. `GRAPHVIEW — FINAL VISUAL MODEL CONTRACT GATE AUDIT`
4. `GRAPHVIEW — FINAL PRE-IMPLEMENTATION TRUTH AUDIT / FOUR-CONDITION CONTRACT CHALLENGE`
5. `GRAPHVIEW_ARCHITECTURAL_SEMANTIC_AUTHORITY_AUDIT_REPORT.md`
6. `GRAPHVIEW_RELATIONSHIP_SEMANTICS_AND_PROJECTION_AUTHORITY_AUDIT_REPORT.md`
7. `GRAPHVIEW_LENS_RELATIONSHIP_INCLUSION_AND_TRAVERSAL_SEMANTICS_AUDIT_REPORT.md`
8. `GRAPHVIEW_DISTANCE_ALGEBRA_AND_TRAVERSAL_METRIC_AUDIT_REPORT.md`
9. `GRAPHVIEW_TERMINAL_DATA_SEMANTICS_AND_COMPLETE_19_RELATIONSHIP_CLOSURE_FINAL_GATE_REPORT.md`
10. `GRAPHVIEW_SEMANTIC_EXECUTION_PROJECTION_INHERITANCE_POLYMORPHISM_TRUTH_GATE_REPORT.md`
11. `GRAPHVIEW — FINAL EXECUTION SEMANTICS CONTRADICTION CLOSURE GATE REPORT`
12. `GRAPHVIEW — LENS B BROWSER GEOMETRY + SATELLITE LAYOUT IMPLEMENTATION PROOF`
13. `GRAPHVIEW — LENS B GEOMETRY CONTRACT + SATELLITE OWNERSHIP + POSITION AUTHORITY FINAL GATE REPORT`
14. `GRAPHVIEW_LENS_B_FINAL_GEOMETRY_CONTRACT_CLOSURE_AUDIT_REPORT.md`
15. `GRAPHVIEW_LENS_B_DESIGN_NEUTRAL_GEOMETRY_CONTRACT_FINAL_CLOSURE_AUDIT_REPORT.md`

---

## 3. Historical Contract Reconciliation

| Major Contract | First Proposed | Latest Challenge | Current Status | Classification |
|---|---|---|---|---|
| **Execution Inclusions ($T_{\text{exec}}$)** | Report 1 | Report 11 | CLOSED | `FACT` |
| **Execution Depth Metric ($d_{\text{exec}}$)** | Report 1 | Report 11 | CLOSED | `FACT` |
| **Terminal Data Nodes** | Report 1 | Report 11 | CLOSED | `FACT` |
| **Focal Node Placement** | Report 1 | Report 11 | CLOSED | `FACT` (Placed at origin $(0, 0)$) |
| **Selection Neutrality** | Report 3 | Report 15 | CLOSED | `FACT` (Owned in `InvestigationContext`) |
| **Shared Node Ownership** | Report 1 | Report 15 | **UNRESOLVED** | `DESIGN JUDGMENT` (Collision strategy vs Shared truth) |
| **Primary-Host Algorithm** | Report 13 | Report 15 | **UNRESOLVED** | `CONTRACT GAP` & `DESIGN JUDGMENT` |
| **Angular / Sector Semantics** | Report 1 | Report 15 | **CONTRADICTORY** | `DESIGN JUDGMENT` (Packing vs Domain Sectors) |
| **Unreachable Node Policy** | Report 1 | Report 15 | **UNRESOLVED** | `DESIGN JUDGMENT` (Hide vs Peripheral Shell) |
| **Position Authority Isolation** | Report 3 | Report 15 | **REPOSITORY DEFECT** | `FACT` (`architecture-layout.ts` leaks positions) |
| **Drag Lifecycle Keying** | Report 3 | Report 15 | **CONTRACT GAP** | `INFERENCE` (Requires composite keying) |
| **Ring Capacity Invariant** | Report 12 | Report 15 | **CONTRACT GAP** | `DESIGN JUDGMENT` (Ungrounded scalar 8) |

---

## 4. Current Repository Truth

Inspect of execution paths (`GraphView.tsx`, `architecture-layout.ts`, `component-orbit-adapter.ts`, `component-orbit-layout.ts`, `satellites.ts`, `position-policy.ts`) confirms:

```text
Graph Truth (`ExplorerDataSchema`)
    │
    ▼
`InvestigationContext` (`focalLwcId`, `activeLens`)
    │
    ▼
`adaptComponentOrbit` (`component-orbit-adapter.ts`)
    ├──> Computes BFS depths (`graph-depth.ts`)
    └──> Returns `ComponentOrbitProjection` { focus, rings, unreachableNodeIds }
    │
    ▼
`computeArchitectureLayoutWithMetadata` (`architecture-layout.ts`)
    ├──> Calls `computeComponentOrbitLayout` / `computeComponentConstellationLayout`
    ├──> Merges `existingPositions` for unassigned nodes (DEFECT: Position Leakage)
    └──> Calls `placeSatellites` (`satellites.ts`) -> 1:1 parent attachment via Map iteration
    │
    ▼
Position Policy & Cytoscape Canvas
```

---

## 5. Shared SObject / Primary Host Decision

**Canonical Challenge Case:**
```text
ServiceA ──→ Account
ServiceB ──→ Account
ServiceC ──→ Account
```

- **1. Is `Account` one canonical graph node?** YES (`Object:Account`).
- **2. Can all three relationships coexist?** YES (3 edges in `ExplorerDataSchema`).
- **3. Does graph truth assign ownership to any service?** **NO.** Shared enterprise objects have no single owner.
- **4. Does Lens B require a single visual parent?** **NO.** Attaching `Account` as a satellite to `ServiceA` is an implementation convenience in `satellites.ts` to reduce edge length, NOT a graph truth.
- **5. Semantic Risk:** Visual attachment implies private ownership, deceiving users about multi-service dependency risks.

**Classification:**
- **Primary Host Requirement:** `DESIGN JUDGMENT` (Collision strategy vs Shared Node Representation).
- **Current Selection Implementation:** `REPOSITORY DEFECT` (Non-deterministic under edge reshuffling).

---

## 6. Shared Visual Semantics Decision

When `Account` is placed in proximity to `ServiceA`:
- **Proximity Meaning:** In the current layout engine, proximity represents **geometric anchoring for slot allocation**, NOT semantic ownership.
- **Missing Visual Language:** The UI does not distinguish private satellites from shared enterprise objects.

**Classification:** `INFERENCE` & `DESIGN JUDGMENT`

---

## 7. Angular / Sector Semantics Decision

**Contradiction:**
- Prior reports claimed that angular sectors represent business domains.
- `component-orbit-layout.ts` calculates angles sequentially ($i \cdot \Delta \theta$), discarding domain and subsystem metadata.

**Models:**
- **Model A (Geometric Packing):** Angle has no domain meaning; components are packed strictly for uniform distribution.
- **Model B (Semantic Sectors):** $2\pi$ is partitioned into domain angular sectors, and components are placed inside their assigned sector.

**Classification:** `UNRESOLVED CONTRADICTION` & `DESIGN JUDGMENT`

---

## 8. Unreachable Node Decision

- **Meaning:** `unreachableNodeIds` contains nodes beyond `maxDepth` or disconnected from the focal node.
- **Current Defect:** `architecture-layout.ts` (lines 219–221) copies `existingPositions` for unreachable nodes, causing them to linger at stale coordinates.
- **Policy Decision Required:** Product authority must specify whether unreachable nodes are **hidden from canvas** or **rendered on a peripheral shell** ($R_{\text{peripheral}} = R_{\text{max}} + 250\text{px}$, `opacity = 0.3`).

**Classification:**
- **Stale Position Rendering:** `REPOSITORY DEFECT`.
- **Visibility Policy:** `DESIGN JUDGMENT`.

---

## 9. Ring Capacity / Collision Contract

- **Hardcoded Limit:** `maxSatellitesPerRing = 8` in `component-orbit-layout.ts` is an ungrounded design heuristic.
- **Effective Clearance Width:** $W_{\text{eff}} = 160\text{px}$ (Node width 120px + 40px margin).
- **Ring 1 Geometry:** Circumference $= 2\pi(180) = 1130.97\text{px}$. Max non-overlapping nodes $= \lfloor 1130.97 / 160 \rfloor = 7$. Placing 8 nodes on Ring 1 **guarantees visual node-body bounding-box collision**.

**Classification:**
- **Hardcoded 8:** `DESIGN JUDGMENT`.
- **Protected Capacity Invariant:** `CONTRACT GAP` ($N \cdot W_{\text{eff}} \le 2\pi R$).

---

## 10. Overflow / Clustering Contract

- **Current Repository Truth:** No "Terminal Data Cluster Node" or aggregate node collapse exists in Cytoscape styles or graph schemas.
- **Presentation vs Canonical Aggregate:** Visual clustering MUST remain a presentation-layer transform and MUST NOT mutate canonical graph truth.

**Classification:** `CONTRACT GAP` & `DESIGN JUDGMENT`

---

## 11. Label Geometry Contract

- **Cytoscape Styles:** `graph-style.ts` defines label font size and color but lacks vertical padding or wrapping bounds.
- **Label Collision Risk:** Multiline node labels extend vertically outside the $100\text{px}$ effective node height, colliding with adjacent ring nodes.

**Classification:** `CONTRACT GAP`

---

## 12. Position Authority Contract

**Contamination Defect:**
In `architecture-layout.ts`:
```typescript
// Lines 169-171 & 219-221
for (const [id, pos] of Object.entries(existingPositions)) {
  if (!orbitOutput.positions[id]) {
    orbitOutput.positions[id] = pos;
  }
}
```
Position Authority Level 4 is violated because layout calculation output is contaminated by `existingPositions` from previous layout modes or focal contexts.

**Classification:** `REPOSITORY DEFECT`

---

## 13. Drag Lifecycle Contract

- **Level 1 Drag Session:** Explicit user drag overrides calculated layout.
- **Storage Scope Gap:** Drag offsets are currently stored under key `nodeId`, corrupting layout positions when toggling view modes or focal nodes.

**Classification:** `CONTRACT GAP` (Requires composite keying `(projectId, layoutMode, focalNodeId, nodeId)`).

---

## 14. Determinism Contract

- **Focal Determinism:** `PASS`.
- **Satellite Slot Determinism:** `PASS`.
- **Input Edge-Order Determinism:** `FAIL` (`satellites.ts` parent selection depends on JSON edge array ordering).
- **Cross-Mode Isolation Determinism:** `FAIL` (`existingPositions` leakage).

**Classification:** `REPOSITORY DEFECT`

---

## 15. Dataset Independence

- **Hardcoded PBIM Literals:** `NONE`.
- **Generic Spatial Constants:** `maxDepth = 7`, `maxSatellites = 8`, `baseRadius = 180px`, `stepRadius = 150px`.

**Classification:** `FACT` (Generic heuristics, zero dataset-specific overrides).

---

## 16. Blocking Repository Defects

1. **[BLK-DEF-01] Cross-Mode & Cross-Focal Position Contamination:** `architecture-layout.ts` lines 169–171 and 219–221 merge `existingPositions` into Lens B outputs.
2. **[BLK-DEF-02] Input-Order Dependent Primary Parent Selection:** `satellites.ts` parent attachment depends on raw edge array or Map iteration order.
3. **[BLK-DEF-03] Bounding-Box Overlaps on Dense Rings:** Hardcoded limit `8` on Ring 1 ($R = 180\text{px}$) causes $160\text{px}$ wide node bounding boxes to collide.
4. **[BLK-DEF-04] Stale Positioning of Unreachable Nodes:** Unreachable nodes inherit stale coordinates from `existingPositions` instead of being hidden or placed on a peripheral shell.

---

## 17. Blocking Contract Gaps

1. **[BLK-GAP-01] Primary Host Selection Rule:** No semantic rule exists for choosing a primary anchor among multiple candidate host components.
2. **[BLK-GAP-02] Ring Capacity Clearance Invariant:** No formal invariant defines maximum ring population based on node clearance width $W_{\text{eff}} = 160\text{px}$.
3. **[BLK-GAP-03] Satellite Overflow & Clustering Specification:** No presentation aggregate schema or cluster collapse behavior is specified.
4. **[BLK-GAP-04] Label Bounds & Text Wrapping Bounds:** No Cytoscape vertical padding bounds are defined for multiline node labels.
5. **[BLK-GAP-05] Drag Offset Storage Scope:** Drag offset storage scope is not composite-keyed by `(projectId, layoutMode, focalNodeId, nodeId)`.

---

## 18. Blocking Design Decisions

1. **[BLK-DJ-01] Visual Representation of Shared SObjects:** Decision required on whether shared enterprise objects attach to a single host or render as independent shared graph nodes.
2. **[BLK-DJ-02] Angular Semantics Model:** Decision required between Model A (geometric packing) and Model B (domain angular sectors).
3. **[BLK-DJ-03] Unreachable Node Visibility Policy:** Decision required on whether unreachable components are hidden by default or rendered on a peripheral shell.

---

## 19. Non-Blocking Recommendations

The following candidate solutions are explicitly classified as **UNFROZEN RECOMMENDATIONS**:

1. *Recommendation A:* Sorting host candidates by `interaction count DESC, nodeId ASC`.
2. *Recommendation B:* Capacity formula $N_{\text{max}}(R) = \lfloor 2\pi R / W_{\text{eff}} \rfloor$.
3. *Recommendation C:* Automatic sub-ring spilling for ring overflow.
4. *Recommendation D:* Peripheral shell at $R_{\text{peripheral}} = R_{\text{max}} + 250\text{px}$.
5. *Recommendation E:* Rendering unreachable nodes with `opacity = 0.3`.
6. *Recommendation F:* Keying drag offsets by `(projectId, layoutMode, focalNodeId, nodeId)`.

---

## 20. Minimum Frozen Lens B Contract

To safely freeze Lens B, the architecture MUST formally enforce:

```text
Graph Truth (ExplorerDataSchema)
    │
    ▼
Lens B Projection (Pure function of graphTruth + focalLwcId + maxDepth)
    │
    ▼
Canonical Geometry Contract
    ├── Radial Distance: r = R_0 + d_exec * Delta_R
    ├── Angular Allocation: Model A (Packing) or Model B (Domain Sectors)
    ├── Ring Capacity Invariant: N * W_eff <= 2 * pi * R
    └── Unreachable Policy: Hide or Peripheral Shell (No stale positions)
    │
    ▼
Position Authority Contract
    ├── Level 4 Pure Layout: Output contains ONLY projection nodes
    ├── Level 1 User Drag: Keyed by (projectId, layoutMode, focalNodeId, nodeId)
    └── Zero Cross-Mode / Cross-Focal Position Contamination
    │
    ▼
Rendering Contract
    └── Cytoscape Canvas (AABB Clearance + Label Padding)
```

---

## 21. Final Decision Matrix

| Decision / Contract | Repository Fact | Contract Gap | Design Judgment | Recommendation | Final Status |
|---|---|---|---|---|---|
| **1. Shared SObject Identity** | YES | NO | NO | NO | **FROZEN** |
| **2. Shared SObject Multiple Edges** | YES | NO | NO | NO | **FROZEN** |
| **3. Need for Primary Host** | NO | NO | **YES (BLK-DJ-01)** | NO | **UNFROZEN** |
| **4. Primary Host Selection** | NO | **YES (BLK-GAP-01)**| **YES (BLK-DJ-01)** | YES (Rec A) | **UNFROZEN** |
| **5. Visual Ownership Semantics** | NO | NO | **YES (BLK-DJ-01)** | NO | **UNFROZEN** |
| **6. Radius Semantics** | YES ($r = R_0 + d \cdot \Delta R$) | NO | NO | NO | **FROZEN** |
| **7. Angular Semantics** | NO | NO | **YES (BLK-DJ-02)** | NO | **UNFROZEN** |
| **8. Domain-Sector Semantics** | NO | NO | **YES (BLK-DJ-02)** | NO | **UNFROZEN** |
| **9. Unreachable Meaning** | YES ($d > d_{\text{max}}$) | NO | NO | NO | **FROZEN** |
| **10. Unreachable Visibility** | NO | NO | **YES (BLK-DJ-03)** | YES (Rec D, E) | **UNFROZEN** |
| **11. Ring Capacity Invariant** | NO | **YES (BLK-GAP-02)**| NO | YES (Rec B) | **UNFROZEN** |
| **12. Overflow Behavior** | NO | **YES (BLK-GAP-03)**| **YES** | YES (Rec C) | **UNFROZEN** |
| **13. Cluster Semantics** | NO | **YES (BLK-GAP-03)**| **YES** | NO | **UNFROZEN** |
| **14. Label Bounds** | NO | **YES (BLK-GAP-04)**| NO | NO | **UNFROZEN** |
| **15. Node-Body Collision** | NO (Fails dense ring) | NO | NO | NO | **UNFROZEN** |
| **16. Satellite Collision** | YES (Slot search) | NO | NO | NO | **FROZEN** |
| **17. Edge Collision** | NO | NO | **YES** | NO | **UNFROZEN** |
| **18. Viewport Overflow** | NO | **YES** | NO | NO | **UNFROZEN** |
| **19. Canonical Position Authority**| YES | NO | NO | NO | **FROZEN** |
| **20. Cross-Mode Isolation** | NO (Leaked in L169/219) | NO | NO | NO | **DEFECT** |
| **21. Cross-Focal Isolation** | NO (Leaked in L169/219) | NO | NO | NO | **DEFECT** |
| **22. Drag Authority** | YES (Level 1 precedence) | NO | NO | NO | **FROZEN** |
| **23. Drag Lifecycle Scope** | NO | **YES (BLK-GAP-05)**| NO | YES (Rec F) | **UNFROZEN** |
| **24. Input-Order Determinism** | NO (Map iteration) | NO | NO | NO | **DEFECT** |
| **25. Dataset Independence** | YES (Zero PBIM strings) | NO | NO | NO | **FROZEN** |

---

## 22. Implementation-Readiness Gate

### **Final Choice:** **`C — CONTRACT NOT FROZEN`**

**Reasoning:**
Four blocking repository defects (`BLK-DEF-01` to `BLK-DEF-04`), five blocking contract gaps (`BLK-GAP-01` to `BLK-GAP-05`), and three blocking design decisions (`BLK-DJ-01` to `BLK-DJ-03`) remain unresolved.

---

## 23. Exact Repository Evidence Index

| ID | File Path | Symbol / Function | Line Range | Repository Behavior | Classification | Impact |
|---|---|---|---|---|---|---|
| **BLK-DEF-01** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayoutWithMetadata` | L169–L171, L219–L221 | Merges `existingPositions` into Lens B outputs | **REPOSITORY DEFECT** | Violates Position Authority Level 4 pure layout functions. |
| **BLK-DEF-02** | `explorer/src/lib/layout/satellites.ts` | `placeSatellites` | L115–L135 | Parent anchor selection depends on Map iteration | **REPOSITORY DEFECT** | Causes input-order non-determinism under JSON reshuffling. |
| **BLK-DEF-03** | `explorer/src/lib/layout/component-orbit-layout.ts` | `computeComponentOrbitLayout` | L42–L48 | Hardcoded scalar limit `8` | **REPOSITORY DEFECT** | Causes $160\text{px}$ wide node bounding boxes to collide on Ring 1. |
| **BLK-DEF-04** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayoutWithMetadata` | L219–L221 | Assigns stale coordinates to unreachable nodes | **REPOSITORY DEFECT** | Renders unreachable nodes at invalid stale positions. |
| **BLK-DJ-01** | `explorer/src/lib/layout/satellites.ts` | `placeSatellites` | Structural | 1:1 parent anchoring for shared SObjects | **DESIGN JUDGMENT** | Requires product decision on shared node representation. |
| **BLK-DJ-02** | `explorer/src/lib/layout/component-orbit-layout.ts` | `computeComponentOrbitLayout` | L55–L62 | Linear index stepping `i * angleStep` | **DESIGN JUDGMENT** | Requires decision between packing (Model A) and domain sectors (Model B). |
| **BLK-DJ-03** | `explorer/src/components/GraphView.tsx` | `GraphView` component | L831–L845 | Handling of `unreachableNodeIds` | **DESIGN JUDGMENT** | Requires product decision on hide vs peripheral shell rendering. |
