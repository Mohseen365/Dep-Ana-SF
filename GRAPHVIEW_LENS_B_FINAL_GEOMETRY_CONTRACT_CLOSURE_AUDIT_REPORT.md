# GRAPHVIEW — LENS B FINAL GEOMETRY CONTRACT CLOSURE AUDIT

## 1. Executive Verdict

**FINAL DECISION:** `C — NO (NOT SAFE TO IMPLEMENT IN CURRENT STATE)`

**EXECUTIVE SUMMARY:**
The narrow adversarial audit of **GraphView Lens B — Component Orbit / Constellation Geometry** across the repository execution paths (`GraphView.tsx`, `architecture-layout.ts`, `component-orbit-adapter.ts`, `component-constellation-adapter.ts`, `component-orbit-layout.ts`, `component-constellation-layout.ts`, `satellites.ts`, `position-policy.ts`) confirms that while pure radial ring adapter transformations and satellite collision avoidance routines function deterministically, **Lens B geometry is NOT safe to implement as a frozen production contract**.

Critical blocking contradictions and unresolved contracts remain:
1. **Cross-Mode & Cross-Focal Position Contamination (ACTIVE BUG):** `architecture-layout.ts` (lines 169–171 and 219–221) forcibly mutates Lens B layout output by copying `existingPositions` (positions calculated under previous layout modes or focal nodes) into the output map for any node unassigned by the current Lens B adapter.
2. **Missing Primary-Host Selection Algorithm:** The repository contains no dataset-independent, deterministic, or semantic-neutral rule for assigning shared terminal `SObject` nodes to a single host. `satellites.ts` assumes a 1:1 parent-child anchoring relationship; multi-host access (`ServiceA -> Account`, `ServiceB -> Account`) causes arbitrary map iteration ordering or input list order to dictate visual placement.
3. **Ungrounded Satellite Threshold & Clustering Policies:** Threshold `8` in `component-orbit-layout.ts` and `component-constellation-layout.ts` is a hardcoded design heuristic unsupported by node geometry or label dimensions. Furthermore, no visual aggregate or cluster node model exists in the canonical graph schema or renderer.
4. **Angular / Sector Semantic Contradiction:** Prior contracts simultaneously declare angle as "pure geometric packing" while asserting that "sectors represent business subsystems/domains." In `component-orbit-layout.ts`, angle is computed via linear index stepping (`i * angleStep`), discarding domain/subsystem groupings.
5. **Unreachable Node Policy Ambiguity:** In `component-orbit-adapter.ts`, unreachable nodes are placed in `unreachableNodeIds` and excluded from rings, but `GraphView.tsx` and `architecture-layout.ts` fall back to displaying them at `existingPositions` or origin `(0, 0)`, confusing "outside execution projection" with "hidden" or "deleted."

---

## 2. Context Retrieval Results

The authoritative context chain of prior audit artifacts was retrieved and analyzed in full:

1. **`GRAPHVIEW — ARCHITECTURE ORBIT + COMPONENT CONSTELLATION FUNDAMENTAL PRINCIPLES and MODEL AUDIT REPORT`**: Defined 4 concentric rings (R0–R3), polar coordinate transform $P(\theta, r)$, and 180px radial spacing. Established that Lens B is a focal execution projection.
2. **`GRAPHVIEW — SECOND-ORDER VISUAL MODEL VALIDATION / ARCHITECTURE ORBIT + COMPONENT CONSTELLATION`**: Challenged multi-focal constellation blending, proving that multi-sun layouts require single-owner satellite anchor constraints.
3. **`GRAPHVIEW — FINAL VISUAL MODEL CONTRACT GATE AUDIT`**: Defined position authority boundaries, establishing that Level 4 layout calculations must be pure functions of `(graphTruth, activeLens, focalNode)`.
4. **`GRAPHVIEW — FINAL PRE-IMPLEMENTATION TRUTH AUDIT / FOUR-CONDITION CONTRACT CHALLENGE`**: Identified that `existingPositions` leakage across layout mode toggles creates state corruption.
5. **`GRAPHVIEW_ARCHITECTURAL_SEMANTIC_AUTHORITY_AUDIT_REPORT.md`**: Classified domain and layer classification authorities, establishing `ExplorerDataSchema` as graph truth.
6. **`GRAPHVIEW_RELATIONSHIP_SEMANTICS_AND_PROJECTION_AUTHORITY_AUDIT_REPORT.md`**: Proved that relationship inclusion in Lens B must be bounded by $T_{\text{exec}}$ relationship types.
7. **`GRAPHVIEW_LENS_RELATIONSHIP_INCLUSION_AND_TRAVERSAL_SEMANTICS_AUDIT_REPORT.md`**: Standardized execution relationship traversal bounds ($d_{\text{exec}} \le 7$).
8. **`GRAPHVIEW_DISTANCE_ALGEBRA_AND_TRAVERSAL_METRIC_AUDIT_REPORT.md`**: Formalized BFS distance metric $d_{\text{exec}}(u, v)$ as radial distance $r = R_0 + d \cdot \Delta R$.
9. **`GRAPHVIEW_TERMINAL_DATA_SEMANTICS_AND_COMPLETE_19_RELATIONSHIP_CLOSURE_FINAL_GATE_REPORT.md`**: Defined 19 canonical relationship types and classified terminal data nodes (Schema layer: SObjects, CustomFields).
10. **`GRAPHVIEW_SEMANTIC_EXECUTION_PROJECTION_INHERITANCE_POLYMORPHISM_TRUTH_GATE_REPORT.md`**: Closed execution traversal over class inheritance and interface dispatch.

**CHRONOLOGICAL RECONCILIATION:**
While execution traversal ($T_{\text{exec}}$, $d_{\text{exec}}$) was closed by prior reports, the visual geometry, state isolation, and satellite ownership contracts were asserted closed prematurely without verifying the actual repository implementation in `architecture-layout.ts` and `GraphView.tsx`.

---

## 3. Repository Execution Path

The actual execution path for Lens B (Component Orbit / Constellation) in the repository proceeds as follows:

```text
App.tsx / InvestigationContext
   │
   ├──> state: activeLens ('orbit' | 'constellation'), focalNodeId
   │
   ▼
GraphView.tsx (useEffect / useMemo on elements)
   │
   ├──> calls adaptComponentOrbit(schema, { focalLwcId, maxDepth: 7 })
   │       └──> computeGraphDepths(...) -> reachableNodeIds, depthMap, unreachableNodeIds
   │       └──> returns ComponentOrbitProjection { focus, rings, unreachableNodeIds, ... }
   │
   ├──> calls computeArchitectureLayoutWithMetadata(data, mode, existingPositions, options)
   │       │
   │       ├──> [If mode === 'constellation']:
   │       │       calls computeComponentConstellationLayout(projection, options)
   │       │       ├──> loops over existingPositions (L169-L171):
   │       │       │       if (!constellationOutput.has(id)) positions.set(id, existingPositions[id])  <-- BUG: Contamination
   │       │       └──> calls placeSatellites(positions, ...)
   │       │
   │       ├──> [If mode === 'orbit']:
   │       │       calls computeComponentOrbitLayout(projection, options)
   │       │       ├──> loops over existingPositions (L219-L221):
   │       │       │       if (!orbitOutput.has(id)) positions.set(id, existingPositions[id])        <-- BUG: Contamination
   │       │       └──> calls placeSatellites(positions, ...)
   │       │
   │       └──> returns { positions, metadata }
   │
   ▼
Cytoscape Canvas (`cy.nodes().positions(...)`)
```

---

## 4. Primary Host Determinism

**Repository Finding:** `UNRESOLVED — CONTRACT NOT FROZEN`

For a shared SObject accessed by multiple services:
```text
ServiceA ──> Account
ServiceB ──> Account
ServiceC ──> Account
```

- **A. Is there exactly one canonical SObject node?** YES (`Object:Account`).
- **B. Can multiple service nodes retain distinct relationships?** YES (3 edges in `ExplorerDataSchema`).
- **C. Does the geometry assign the SObject to one host?** YES. In `satellites.ts` (`placeSatellites`), field/SObject satellite items are grouped by a single parent anchor ID.
- **D. What EXACT algorithm chooses that host?** NONE. The repository selects whichever host appears first when iterating over schema relationships or object keys in `adaptComponentOrbit` / `satellites.ts`.
- **E. Is that algorithm deterministic and independent of input ordering?** **NO.** It depends directly on JavaScript `Map`/`Array` insertion order and input JSON node/edge order.
- **F. Is "first reached by BFS" actually safe?** **NO.** BFS discovery order changes if edge array ordering in input data changes.
- **G. Is "highest interaction degree" semantically meaningful?** HEURISTIC ONLY. Highest degree indicates central usage, not semantic ownership.
- **H. Can two equally valid hosts produce different visual ownership?** YES. If `ServiceA` and `ServiceB` both have 5 accesses to `Account`, input array order determines whether `Account` orbits `ServiceA` or `ServiceB`.

---

## 5. Shared SObject Identity vs Visual Attachment

The current proposed architecture conflates **Geometric Anchoring** with **Semantic Ownership**.

```text
Canonical Graph Identity (Object:Account)
        │
        ├── Relationship 1: ServiceA ──> Account (DML)
        ├── Relationship 2: ServiceB ──> Account (SOQL)
        │
        ▼
Visual Attachment (Placed as satellite near ServiceA)
```

- **Semantic Ownership:** `ServiceA` does NOT own `Account`. `Account` is a shared enterprise schema object.
- **Placement Convenience:** Placing `Account` next to `ServiceA` is merely a layout optimization to prevent long crossing edges.
- **Visual Risk:** When `Account` is visually attached as a satellite to `ServiceA`, users perceive `Account` as a private child component of `ServiceA`, masking the dependency risk from `ServiceB`.

**Classification:** `INFERENCE` & `DESIGN JUDGMENT` — The UI currently provides no visual distinction (e.g. dashed bridge lines or shared badges) between private satellites and shared SObjects.

---

## 6. Terminal Satellite Overflow Gate

**Repository Finding:** `DESIGN JUDGMENT — NOT YET FROZEN`

In `component-orbit-layout.ts` (lines 42–48) and `component-constellation-layout.ts`:
- The threshold `8` is hardcoded (`maxSatellitesPerRing = 8`).
- **Origin:** Pure design judgment. It is not derived from node width (120px), height (60px), or arc length calculations.
- **Browser Geometry Reality:** At ring radius $R = 180\text{px}$, circumference is $2\pi(180) \approx 1131\text{px}$. With 8 nodes of effective width 160px ($8 \times 160 = 1280\text{px}$), 8 nodes **cause visual bounding-box collision**.
- **Clustering Behavior:** The repository contains NO implementation of a "Terminal Data Cluster Node" or aggregate collapse UI in Cytoscape.
- **Semantic Impact:** Collapsing 10 SObjects into a single cluster node would alter the graph topology and hide node IDs from search/selection unless explicit expand/collapse handlers are built.

---

## 7. Unreachable Node Policy Gate

**Repository Finding:** `DESIGN JUDGMENT & IMPLEMENTATION DEFECT`

1. **Detection:** `adaptComponentOrbit` in `component-orbit-adapter.ts` (lines 296–300) identifies unreachable nodes as any node where `depthMap.has(nodeId)` is false (distance > `maxDepth` or disconnected).
2. **Current GraphView Behavior:** `unreachableNodeIds` are returned in the projection object, but `architecture-layout.ts` does NOT hide them. Instead, lines 219–221 copy their `existingPositions` or leave them at `(0, 0)`.
3. **Explicit Control:** There is currently NO UI toggle for "Show All Unreachable Nodes".
4. **Peripheral Shell (`Rmax + 250px`):** The value `250px` appears as a constant in `satellites.ts` (line 12), but no peripheral ring rendering logic exists in `component-orbit-layout.ts`.
5. **Semantic Equivalence Hazard:** "Unreachable from focal node" is NOT equivalent to "hidden" or "deleted." Placing unreachable nodes in a greyed-out outer shell communicates "out of focal context," whereas omitting them entirely causes users to believe the components do not exist in the project.

---

## 8. Focal Position Authority Gate

**Repository Finding:** `FACT — CONTAMINATION DEFECT PROVEN`

The invariant:
$$\text{CanonicalPosition} = f(\text{graphTruth}, \text{activeLens}, \text{focalNode})$$
is **VIOLATED** by current repository code.

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
If a user loads the graph in `hierarchical` mode (Focal A), node `X` receives position $(x_1, y_1)$.
When switching to `orbit` mode with Focal B where node `X` is unreachable, `orbitOutput` does not contain `X`.
`architecture-layout.ts` reads `existingPositions[X]` and assigns $(x_1, y_1)$ to node `X` in the Orbit layout output!

**Lifecycle Matrix:**
- `Focal A -> Focal B -> Focal A`: Stale positions from Focal B leak into Focal A if nodes are omitted.
- `Lens B -> Lens A -> Lens B`: Lens A coordinates contaminate Lens B output.
- `Filter change`: Hidden nodes retain stale coordinates in `existingPositions` and corrupt next layout compute.

---

## 9. Drag Offset Lifecycle Gate

**Repository Finding:** `FACT — POSITION AUTHORITY LEVEL 1 PRESERVED, BUT DRAG KEYING IS UNBOUNDED`

In `GraphView.positionAuthority.test.tsx` and `position-policy.ts`:
- **Level 1 (User Drag Session):** Explicit user drag overrides calculated layout.
- **Keying:** Drag offsets are currently keyed strictly by `nodeId`.
- **Defect:** If a user drags node `Account` 200px to the right while viewing Focal A in Orbit mode, and then switches to Focal B or Hierarchical mode, the 200px drag offset is applied to `Account` in the new context where `Account` may have a completely different canonical position or role!
- **Required Keying:** Drag offsets MUST be composite-keyed as `(projectId, layoutMode, focalNodeId, nodeId)`.

---

## 10. Angular / Sector Semantics Gate

**Repository Finding:** `UNRESOLVED CONTRADICTION`

Prior audit contracts contain a fundamental semantic contradiction:
- **Claim 1:** "Radius represents execution depth $d_{\text{exec}}$."
- **Claim 2:** "Angle represents deterministic geometric packing only."
- **Claim 3:** "Sectors represent business domains/subsystems."

**Contradiction Proof:**
If angle is purely geometric packing, then angular position is assigned sequentially ($2\pi / N$). In that case, two components in the same domain will be placed in completely different angles if their indices in the ring array are far apart.
If angle represents domain grouping, then angular space must be partitioned into domain sectors.
In `component-orbit-layout.ts`, angle is calculated as `i * angleStep` without reading `primaryDomainId` or `primaryFeatureId`.
**Conclusion:** Sector/domain semantics in Lens B are **currently ungrounded heuristics** in the code.

---

## 11. Browser / Label Collision Truth Gate

**Repository Finding:** `UNSUPPORTED / HEURISTIC`

- **Node Dimensions:** Nodes are rendered with width = 120px, height = 60px. Effective AABB clearance requires width = 160px, height = 100px.
- **Radial Spacing:** Ring step is set to `180px`.
- **Geometry Check:** On Ring 1 ($R = 180\text{px}$), circumference $= 1130.97\text{px}$.
  Maximum non-overlapping 160px nodes on Ring 1 $= \lfloor 1130.97 / 160 \rfloor = 7$ nodes.
  If Ring 1 contains 8 or more nodes, **AABB bounding boxes collide in rendered browser geometry**.
- **Labels:** Node labels render below the node body without text wrapping bounds in Cytoscape styles (`graph-style.ts`), adding an additional 20px–40px vertical visual overlap.
- **Cytoscape Overlay:** Cytoscape does NOT automatically resolve node collisions in custom layout engines. Collision avoidance MUST be guaranteed by the layout algorithm itself.

---

## 12. Cross-Mode Position Contamination Gate

**Repository Evidence:**

| File Path | Line Numbers | Code Behavior | Classification | Violation |
|---|---|---|---|---|
| `explorer/src/lib/architecture-layout.ts` | 169–171 | `for (const [id, pos] of Object.entries(existingPositions)) { if (!constellationOutput.positions[id]) constellationOutput.positions[id] = pos; }` | **FACT (BUG)** | Violates Position Isolation across Layout Modes |
| `explorer/src/lib/architecture-layout.ts` | 219–221 | `for (const [id, pos] of Object.entries(existingPositions)) { if (!orbitOutput.positions[id]) orbitOutput.positions[id] = pos; }` | **FACT (BUG)** | Violates Position Isolation across Layout Modes |
| `explorer/src/lib/architecture-layout.ts` | 618–620 | Merges `existingPositions` globally into fallback position map | **FACT (BUG)** | Leaks stale layout coordinates |

---

## 13. Determinism Proof

| Dimension | Status | Evidence / Analysis |
|---|---|---|
| **Input-order determinism** | **FAILED** | `adaptComponentOrbit` iterates over raw schema edge arrays. Reordering edges in JSON alters ring array indices and angular placement. |
| **Edge-order determinism** | **FAILED** | Edge array order in `ExplorerDataSchema` dictates BFS queue insertion order during depth calculation in `graph-depth.ts`. |
| **Map iteration determinism** | **PARTIAL** | ES6 Maps preserve insertion order. If insertion order depends on input JSON, iteration is non-deterministic across dataset variations. |
| **Focal determinism** | **PASS** | Same schema + same focal node ID yields identical `ComponentOrbitProjection` object. |
| **Mode determinism** | **FAILED** | Contaminated by `existingPositions` from previous active modes. |
| **Satellite determinism** | **PASS** | `placeSatellites` in `satellites.ts` uses deterministic ring slot sorting when given identical primary anchor inputs. |
| **Shared-object determinism** | **FAILED** | Shared objects attach to whichever host is processed first in schema traversal. |
| **Overflow determinism** | **NOT PROVEN BY TESTS** | No unit tests exist for satellite overflow clustering. |

---

## 14. Dataset Independence Gate

Search across `component-orbit-adapter.ts`, `component-orbit-layout.ts`, `component-constellation-layout.ts`, and `satellites.ts` confirmed:
- **NO hardcoded PBIM component IDs** (e.g. `ApexClass:ApprovalFlowController`) exist in the Lens B layout files.
- **HARDCODED CONSTANTS:**
  - `maxDepth = 7` in `component-orbit-adapter.ts` (line 247).
  - `maxSatellitesPerRing = 8` in `component-orbit-layout.ts` (line 42).
  - `Rmax + 250px` in `satellites.ts` (line 12).
  - `baseRadius = 180px`, `ringStepRadius = 150px` in `component-constellation-layout.ts`.

These hardcoded spatial constants represent **design heuristics**, not dataset-specific overrides, but they restrict scale independence on large or dense component graphs.

---

## 15. Contract Matrix

| Contract | Repository Evidence | Prior Audit Position | Current Truth | Classification | Blocking? | Required Closure |
|---|---|---|---|---|---|---|
| **1. Canonical SObject Identity** | `ExplorerDataSchema.nodes` | FROZEN | Exactly 1 node per SObject identity | FACT | NO | None |
| **2. Multiple Access Relationships** | `ExplorerDataSchema.edges` | FROZEN | Multiple distinct edges allowed | FACT | NO | None |
| **3. Primary Host Selection** | `satellites.ts` L120 | Asserted Closed | Input/iteration order dependent | UNRESOLVED | **YES** | Formalize deterministic selection rule |
| **4. Primary Host Determinism** | `satellites.ts` | Asserted Closed | Non-deterministic under edge reordering | UNRESOLVED | **YES** | Sort host candidates alphabetically |
| **5. Primary Host Semantic Neutrality**| None | Asserted Closed | Visual attachment implies ownership | INFERENCE | **YES** | Render visual badge for shared SObjects |
| **6. Satellite Overflow** | `component-orbit-layout.ts` L42| Proposed | Hardcoded limit = 8 | DESIGN JUDGMENT | **YES** | Derive limit from $2\pi R / W_{\text{eff}}$ |
| **7. Cluster Threshold** | `component-orbit-layout.ts` L42| Proposed | 8 nodes | DESIGN JUDGMENT | **YES** | Ground threshold in angular resolution |
| **8. Cluster Semantics** | None | Proposed | Unimplemented in Cytoscape | UNRESOLVED | **YES** | Implement visual aggregate node schema |
| **9. Unreachable Detection** | `component-orbit-adapter.ts` L296| Closed | Detected via BFS depth map | FACT | NO | None |
| **10. Unreachable Visibility** | `architecture-layout.ts` L219| Proposed | Displayed at stale positions | BUG | **YES** | Hide by default or isolate in shell |
| **11. Peripheral Shell** | `satellites.ts` L12 | Proposed | Unimplemented constant (250px) | UNRESOLVED | **YES** | Formalize $R_{\text{max}} + \Delta R$ geometry |
| **12. Focal Canonical Position** | `component-orbit-layout.ts` | Closed | Focal node placed at $(0, 0)$ | FACT | NO | None |
| **13. Cross-Focal Isolation** | `architecture-layout.ts` L219| Asserted Closed | Leakage via `existingPositions` | BUG | **YES** | Clear position cache on focal change |
| **14. Cross-Mode Isolation** | `architecture-layout.ts` L169| Asserted Closed | Leakage via `existingPositions` | BUG | **YES** | Scope position cache by `layoutMode` |
| **15. Drag Offset Authority** | `position-policy.ts` L45 | Closed | Level 1 drag overrides calculated pos | FACT | NO | None |
| **16. Drag Lifecycle** | `GraphView.tsx` L420 | Closed | Offsets keyed by `nodeId` only | INFERENCE | **YES** | Key drag offsets by `(mode, focal, node)` |
| **17. Radius Semantics** | `component-orbit-adapter.ts` L310| Closed | $r = R_0 + d_{\text{exec}} \cdot \Delta R$ | FACT | NO | None |
| **18. Angular Semantics** | `component-orbit-layout.ts` L55| Contradictory | Sequential step ($i \cdot \Delta \theta$) | CONTRADICTION | **YES** | Resolve domain sector vs packing |
| **19. Sector/Domain Semantics** | None in Lens B | Proposed | Unread by Orbit layout engine | CONTRADICTION | **YES** | Bind angle to domain/subsystem |
| **20. Browser Node Collision** | Rendered DOM | Asserted Closed | Overlaps on Ring 1 if $N > 7$ | UNSUPPORTED | **YES** | Enforce dynamic ring capacity bounds |
| **21. Label Collision** | `graph-style.ts` | Asserted Closed | Unwrapped labels overlap vertically | UNSUPPORTED | **YES** | Add vertical label padding bounds |
| **22. Satellite Collision** | `satellites.ts` L200 | Closed | 0 collisions via slot search | FACT | NO | None |
| **23. Determinism** | Test suites | Asserted Closed | Fails edge-order reshuffling | NOT PROVEN BY TESTS | **YES** | Add edge/node shuffle tests |
| **24. Dataset Independence** | Adapter modules | Closed | 0 PBIM hardcoded strings | FACT | NO | None |
| **25. Selection/Focus Separation** | `InvestigationContext.tsx` | Closed | `selectedNodeId != focalLwcId` | FACT | NO | None |
| **26. Presentation vs Analytical**| `search-filter.ts` | Closed | Filtering does not mutate schema | FACT | NO | None |

---

## 16. Remaining Contradictions

1. **Angular Sector vs Pure Packing Contradiction:**
   - *Prior Assertion:* Sector grouping communicates domain structure.
   - *Code Reality:* `component-orbit-layout.ts` calculates angle as $i \cdot \Delta \theta$, ignoring domain metadata.
2. **Static Mode / Position Authority vs Layout Output Contradiction:**
   - *Prior Assertion:* Position Authority Level 4 calculates pure layout coordinates without side-effects.
   - *Code Reality:* `architecture-layout.ts` merges `existingPositions` into layout output, making Level 4 output statefully dependent on previous user interactions in other view modes.
3. **Primary Host Ownership vs Shared Access Contradiction:**
   - *Prior Assertion:* Shared SObjects are deterministically attached to a primary host.
   - *Code Reality:* Primary host selection is unanchored in code and defaults to arbitrary JSON iteration order.

---

## 17. Required Closure Conditions

Before Lens B Component Orbit / Constellation Geometry can be declared **IMPLEMENTATION READY**, the following 6 blocking conditions MUST be completed:

1. **[BLOCKER-01] Eliminate Cross-Mode & Cross-Focal Position Contamination:**
   Remove lines 169–171 and 219–221 in `explorer/src/lib/architecture-layout.ts`. Layout output for Lens B MUST contain ONLY nodes present in the current `ComponentOrbitProjection` / `ComponentConstellationProjection`.
2. **[BLOCKER-02] Formalize Deterministic Primary-Host Selection:**
   Implement a deterministic host selection algorithm in `satellites.ts`: for an SObject with multiple candidate host components, select the host using a stable tie-breaker: `1. Highest interaction count desc`, `2. Canonical host nodeId asc (alphabetical)`.
3. **[BLOCKER-03] Formalize Sector / Angular Semantics Contract:**
   Explicitly choose and enforce one model:
   - *Option A:* Angle is pure geometric packing. UI MUST NOT render sector background wedges or claim sectors represent domains.
   - *Option B:* Angle encodes domain sectors. `component-orbit-layout.ts` MUST partition $2\pi$ into domain angular sectors and place components within their assigned domain sector.
4. **[BLOCKER-04] Dynamic Ring Capacity & Collision Prevention:**
   Replace hardcoded `maxSatellitesPerRing = 8` with dynamic ring capacity:
   $$N_{\text{max}}(R) = \left\lfloor \frac{2\pi R}{W_{\text{eff}}} \right\rfloor$$
   where $W_{\text{eff}} = 160\text{px}$. If ring population exceeds $N_{\text{max}}(R)$, automatically spill excess nodes to sub-rings $R + \Delta R_{\text{sub}}$.
5. **[BLOCKER-05] Unreachable Node Policy Enforcement:**
   Update `GraphView.tsx` to handle `unreachableNodeIds`: unreachable nodes MUST either be hidden from the Cytoscape element set or explicitly placed on a peripheral shell at $R_{\text{peripheral}} = R_{\text{max}} + 250\text{px}$ with opacity = 0.3. Stale coordinates from `existingPositions` MUST NOT be used.
6. **[BLOCKER-06] Composite Keying for Drag Offsets:**
   Update `position-policy.ts` and `GraphView.tsx` so user drag offsets are stored under key `(projectId, layoutMode, focalNodeId, nodeId)`, preventing drag offsets from corrupting node positions when changing focal components or layout modes.

---

## 18. Decisive Implementation-Readiness Gate

### **Final Choice:** **`C — NO`**

**Reasoning:**
At least four fundamental geometry contracts remain unresolved or actively defective in the codebase: cross-mode position contamination (`architecture-layout.ts`), non-deterministic primary host attachment (`satellites.ts`), ungrounded angular sector semantics (`component-orbit-layout.ts`), and browser bounding-box overlaps on dense rings (`component-orbit-layout.ts`).

---

## 19. Exact Repository Evidence Index

| Blocker ID | File Path | Symbol / Function | Line Range | Relevant Code / Behavior | Classification | Why It Matters |
|---|---|---|---|---|---|---|
| **BLK-01** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayoutWithMetadata` | L169–L171 | `for (const [id, pos] of Object.entries(existingPositions)) { if (!constellationOutput.positions[id]) constellationOutput.positions[id] = pos; }` | **FACT (BUG)** | Causes nodes from other layout modes to leak into Constellation view mode. |
| **BLK-02** | `explorer/src/lib/architecture-layout.ts` | `computeArchitectureLayoutWithMetadata` | L219–L221 | `for (const [id, pos] of Object.entries(existingPositions)) { if (!orbitOutput.positions[id]) orbitOutput.positions[id] = pos; }` | **FACT (BUG)** | Causes nodes from other layout modes or prior focal selections to leak into Orbit view mode. |
| **BLK-03** | `explorer/src/lib/layout/satellites.ts` | `placeSatellites` | L115–L135 | `const primaryNodeIds = new Set(Object.keys(primaryPositions)); ... if (primaryNodeIds.has(fieldItem.nodeId)) continue;` | **FACT (DEFECT)** | Selects host anchor based on un-ordered Map iteration over schema relationships, creating non-deterministic host assignment. |
| **BLK-04** | `explorer/src/lib/layout/component-orbit-layout.ts` | `computeComponentOrbitLayout` | L42–L48 | `const maxSatellitesPerRing = 8;` | **DESIGN JUDGMENT** | Hardcoded scalar `8` ignores ring circumference and node width (160px), causing browser DOM node overlaps when $N > 7$ on Ring 1. |
| **BLK-05** | `explorer/src/lib/layout/component-orbit-layout.ts` | `computeComponentOrbitLayout` | L55–L62 | `const angle = i * angleStep;` | **CONTRADICTION** | Sequential angle stepping ignores `primaryDomainId` / `primaryFeatureId`, contradicting claims that angles/sectors represent business domains. |
| **BLK-06** | `explorer/src/components/GraphView.tsx` | `GraphView` component | L831–L845 | Evaluates auto-layout policy without handling `unreachableNodeIds` | **FACT (DEFECT)** | Unreachable nodes fall back to origin `(0, 0)` or stale coordinates from previous views rather than being hidden or placed on a peripheral shell. |
