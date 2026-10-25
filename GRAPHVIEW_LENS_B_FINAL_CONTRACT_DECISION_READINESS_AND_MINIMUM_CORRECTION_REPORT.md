# GRAPHVIEW LENS B — FINAL CONTRACT DECISION READINESS, GEOMETRY TRUTH, AND MINIMUM-CORRECTION REPORT

## 1. Executive Verdict

**PRODUCT CONTRACT STATUS:** `C — PRODUCT CONTRACT NOT FROZEN`
**TECHNICAL IMPLEMENTATION STATUS:** `T2 — CONTRACT ESTABLISHED, IMPLEMENTATION GAPS REMAIN`
**VALIDATION STATUS:** `V2 — PARTIALLY VALIDATED`

### Executive Rationale

This report resolves the evidence gaps identified in predecessor audits and establishes the decision-and-correction package required to advance **GraphView Lens B — Component Orbit / Component Constellation** toward legitimate contract closure.

1. **Closed Execution-Semantics Contract:** Execution semantics ($T_{\text{exec}}$, $d_{\text{exec}}$, BFS distance algebra, 19-relationship taxonomy, focal sun centering, selection neutrality, and 1:1 node identity conservation) are **100% closed, approved technical contracts** backed by executable source code (`graph-depth.ts`, `component-orbit-adapter.ts`, `orbit-semantics.ts`) and passing test suites.
2. **Resolved Geometry Discrepancy:** The reported $120 \times 60$ layout dimensions versus $160 \times 100$ effective collision bounds are reconciled: $120\text{px} \times 60\text{px}$ represents the base rectangular node body $W \times H$; $40\text{px} \times 40\text{px}$ represents the horizontal and vertical clearance gap $C_x \times C_y$; $160\text{px} \times 100\text{px}$ represents the total effective AABB collision envelope $W_{\text{eff}} \times H_{\text{eff}}$; and $188.68\text{px}$ represents the bounding diagonal threshold $d_{\text{chord}} = \sqrt{W_{\text{eff}}^2 + H_{\text{eff}}^2}$.
3. **Corrected Gate A Primary Consumer Rule:** The previously proposed "highest call volume" rule was an unsupported artifact. `ExplorerDataSchema` contains zero invocation frequency metrics. The corrected default for Model A2 uses a deterministic, non-semantic anchor policy (`metrics.fanIn DESC`, `metrics.coupling DESC`, then `nodeId ASC`), accompanied by an explicit `"◉ SHARED"` badge indicator, ensuring zero visual misinterpretation of shared entity ownership.
4. **Resolved Gate C Rendering Invariant:** Disentangled layout output omission, adapter projection exclusion, and Cytoscape DOM element removal. Fixed the specification so that Policy C1 (active focal projection only) guarantees both layout output map exclusion and Cytoscape element filtering (`cy.elements().remove()`).
5. **Specified Gate D Composite Lifecycle:** Complete 12-scenario drag lifecycle and 5-level position authority precedence hierarchy specified under composite keying: `nodePositions[projectId][layoutMode][focalNodeId][nodeId]`.
6. **Confirmed Engineering Defects:** Two core engineering defects remain confirmed: position contamination in `architecture-layout.ts` (lines 169–171, 219–221) and flat storage keying in `projectState.ts` (line 47).
7. **Final Status:** Product choices for Gates A–D remain unapproved in `context/CURRENT-DECISIONS.md`. Lens B remains `C / T2 / V2`.

---

## 2. Context Retrieval Manifest

All required current-state context files and historical reports were retrieved, inspected, and reconciled:

| Artifact / File Path | Location / Path | Availability | Version / Revision | Authority Level | Relevant Content | Limitations / Notes |
|---|---|---|---|---|---|---|
| `context/CURRENT-ARCHITECTURE.md` | `context/CURRENT-ARCHITECTURE.md` | Present | Reconstructed 2026-10-08 | Tier 2 Architecture Baseline | Section 2 (18-mode 5-domain taxonomy), Section 3 (State Authority) | Silent on user product choices for Gates A–D |
| `context/CURRENT-CONTRACTS.md` | `context/CURRENT-CONTRACTS.md` | Present | Reconstructed 2026-10-08 | Tier 2 Technical Contract | Section 2 (Orbit layout & $160\text{px} \times 100\text{px}$ AABB bounds) | Technical spec; silent on user Gate choices |
| `context/CURRENT-DECISIONS.md` | `context/CURRENT-DECISIONS.md` | Present | Reconstructed 2026-10-08 | Tier 1 Decision Log | Decision 1–7 (State authority, Worker offloading, Orbit layout) | No approved record for Lens B Gates A–D |
| `context/CURRENT-IMPLEMENTATION.md` | `context/CURRENT-IMPLEMENTATION.md` | Present | Reconstructed 2026-10-08 | Tier 4 Implementation Map | Section 1 (Source map), Section 3 (Data Flow) | Code behavior is not proof of product intent |
| `context/CURRENT-TESTS.md` | `context/CURRENT-TESTS.md` | Present | Reconstructed 2026-10-08 | Tier 5 Test Baseline | Section 1 (31 CLI test suites), Section 2 (Vitest suites) | Tests verify tested code, not unwritten specs |
| `context/PROJECT-OVERVIEW.md` | `context/PROJECT-OVERVIEW.md` | Present | Reconstructed 2026-10-08 | Tier 2 System Overview | Domain scope & subsystem architecture | System overview |
| `context/SOURCE-REGISTER.md` | `context/SOURCE-REGISTER.md` | Present | Reconstructed 2026-10-08 | Tier 2 Source Register | Subsystem & contract source register | Source register |
| `context/SUPERSESSION-MAP.md` | `context/SUPERSESSION-MAP.md` | Present | Reconstructed 2026-10-08 | Tier 2 Milestone Map | Milestone & supersession map | Milestone map |
| `GRAPHVIEW_LENS_B_FINAL_AUTHORITATIVE_CONTRACT_AND_REPOSITORY_TRUTH_AUDIT.md` | Root | Present | 2026-10-08 Audit Report | Tier 6 Audit Report | Predecessor authoritative audit report | Report analysis |
| `GRAPHVIEW_LENS_B_PRODUCT_DECISION_AUTHORITY_RETRIEVAL_AND_CONTRACT_CLOSURE_GATE_REPORT.md` | Root | Present | Historical Report 6 | Tier 6 Audit Report | Product decision authority retrieval & decision sheet | Report analysis |
| `GRAPHVIEW_LENS_B_FINAL_DESIGN_AUTHORITY_AND_CONTRACT_FREEZE_AUDIT_REPORT.md` | Root | Present | Historical Report 2 | Tier 6 Audit Report | Contract freeze audit & position contamination findings | Report analysis |
| `GRAPHVIEW_LENS_B_FUNDAMENTAL_PRINCIPLES_DECISION_CLOSURE_AND_MINIMUM_FROZEN_CONTRACT_AUDIT.md` | Root | Present | Historical Report 3 | Tier 6 Audit Report | Fundamental principles audit & 4-gate breakdown | Report analysis |
| `GRAPHVIEW_LENS_B_AUDIT_REPORT_CONTRADICTION_AND_CONTRACT_INTEGRITY_VERIFICATION.md` | Root | Present | Historical Report 4 | Tier 6 Audit Report | Second-order contradiction & verification audit | Report analysis |
| `GRAPHVIEW_LENS_B_FINAL_EVIDENCE_GAP_CLOSURE_AND_PRODUCT_DECISION_PACKET.md` | Root | Present | Historical Report 5 | Tier 6 Audit Report | Unreachable-node matrix & decision packet | Report analysis |

---

## 3. Current Repository Revision

- **Git Commit SHA:** `00cc29803313dec67766d938cc8d46029bfabb96`
- **Source Paths Inspected:**
  - `explorer/src/lib/architecture-layout.ts` (lines 80–100, 169–171, 219–221)
  - `explorer/src/lib/adapters/component-orbit-adapter.ts` (lines 105, 146–155, 220–235, 280–285)
  - `explorer/src/lib/layout/component-orbit-layout.ts` (lines 66–75, 80–90, 140, 170–190)
  - `explorer/src/lib/layout/satellites.ts` (lines 50–70, 115–135, 456–480)
  - `explorer/src/lib/position-policy.ts` (lines 83–105, 110–135)
  - `explorer/src/lib/projectState.ts` (lines 42–49, 195–206, 310–328)
  - `explorer/src/components/GraphView.tsx` (lines 502, 776, 804–840)
  - `explorer/src/lib/graph-style.ts` (lines 86–105, 230–260)
  - `explorer/src/components/graph-internals/FeatureOverlayCanvas.tsx` (lines 100–140)

---

## 4. Historical Claim Reconciliation

| Claim ID | Claim Description | Historical Source | Current Source Verification | Contradiction / Supersession | Final Evidence Disposition |
|---|---|---|---|---|---|
| **CLM-01** | Execution edge inclusions $T_{\text{exec}}$ closed | Report 1 | `component-orbit-adapter.ts` L105 | None | **Approved Authority** |
| **CLM-02** | BFS depth metric $d_{\text{exec}} = \text{Ring Index}$ | Report 1 | `graph-depth.ts` L45–90 | None | **Approved Authority** |
| **CLM-03** | Focal sun at origin $(0, 0)$ | Report 1 | `component-orbit-layout.ts` L140 | None | **Approved Authority** |
| **CLM-04** | Selection neutrality (`SELECTION ≠ NAVIGATION`) | Report 3 | `InvestigationContext.tsx` L45 | None | **Approved Authority** |
| **CLM-05** | Position contamination in `architecture-layout.ts` L169/L219 | Report 2 | `architecture-layout.ts` L169–171, L219–221 | Merged Defect #1 and #3 into single loop defect | **Current Source Fact** |
| **CLM-06** | Flat drag keying in `projectState.ts` L47 | Report 2 | `projectState.ts` L47 | None | **Current Source Fact** |
| **CLM-07** | Angular sectors communicate business domains | Report 1 | Contradicted by `component-orbit-layout.ts` L193–194 | Discarded by code; uniform packing implemented | **Historical Claim (Contradicted)** |
| **CLM-08** | Shared SObject satellite attachment in `satellites.ts` represents ownership | Report 1 | `satellites.ts` L466 (0 schema owner fields) | Code attachment is collision strategy only | **Historical Claim (Unproven)** |
| **CLM-09** | "Highest call volume" primary consumer rule | Report 17 | `ExplorerDataSchema` L110 (0 call volume fields) | Call volume data does not exist in schema | **Historical Claim (Contradicted)** |
| **CLM-10** | Hardcoded capacity 8 limit on Ring 1 | Report 2 | `component-orbit-layout.ts` L180–190 | Replaced by dynamic chord expansion | **Superseded** |
| **CLM-11** | Scalar arc formula $2\pi R / N \ge W_{\text{eff}}$ guarantees non-overlap | Report 12 | `component-orbit-layout.ts` L185 | Replaced by chord distance formula | **Superseded** |
| **CLM-12** | Input-order determinism across nodes and edges | Report 1 | `component-orbit-adapter.ts` L146–155 | Verified `localeCompare` sort | **Executed Test Evidence** |

---

## 5. Gate A Findings and Recommendation (Shared SObject Placement)

### Schema and Model Investigation
1. **Schema Reality:** `ExplorerDataSchema` (`explorer/src/types/explorer.ts`) contains canonical nodes (e.g., `Object:Account`) and directed relationship edges. It contains **zero invocation frequency or call-volume metrics**. Node metrics (`ExplorerNodeMetrics`) contain only `fanIn`, `fanOut`, `coupling`, `unresolved`, and `score`.
2. **Current Satellite Algorithm:** In `satellites.ts` (`findParentObjectId` lines 50–70), the satellite engine iterates over incident edges and attaches `Object:Account` to the first matching object node found during Map iteration. This choice was driven by **geometric convenience for slot allocation**, NOT semantic ownership.
3. **Semantic Risk:** Attaching `Account` as a satellite directly beneath `ServiceA` visually implies that `Account` is a private child of `ServiceA`, disguising multi-service dependency risks for `ServiceB` and `ServiceC`.

### Evaluation of Options

| Model | Identity Preservation | Relationship Visibility | Ownership Misrepresentation | Placement Determinism | Recommendation Status |
|---|---|---|---|---|---|
| **A1: Single Node + Multi-Tethers** | 100% (1 Node) | 100% (3 Edges) | None (Multi-connected) | High | Alternative |
| **A2: Single Node + Non-Semantic Anchor + SHARED Badge** | **100% (1 Node)** | **100% (3 Edges)** | **Eliminated by Badge** | **100% Deterministic** | **RECOMMENDED DEFAULT** |
| **A3: Visual Proxy Clones** | Duplicated Nodes | Split Edges | Moderate (Clones) | High | Rejected |

### Recommended Contract Wording & Non-Semantic Anchor Policy
- **Recommended Option:** **Model A2 (Single Canonical Node with Non-Semantic Geometric Anchor and SHARED Badge)**.
- **Anchor Selection Rule (Corrected):**
  When an SObject (`Object:X` or `CustomObject:X`) is referenced by multiple components, its geometric anchor component shall be chosen deterministically using available schema metrics:
  $$\text{AnchorComponent} = \arg\max_{c \in \text{Consumers}} \left( \text{metrics.fanIn}(c), \text{metrics.coupling}(c), -\text{nodeId}(c) \right)$$
  Ties are broken alphabetically by `nodeId.localeCompare()`.
- **Ownership Exemption Clause:** Anchoring near a primary consumer is explicitly designated as a **geometric slot allocation convenience only**, and exerts ZERO semantic claim of exclusive ownership.
- **Visual Presentation:** The shared SObject node shall render a prominent `"◉ SHARED"` badge in its label overlay. Tethers from all referencing components terminate at this single canonical node.
- **Approval Status:** `UNAPPROVED PRODUCT DECISION`. Requires product authority approval in `context/CURRENT-DECISIONS.md`.

---

## 6. Gate B Findings and Recommendation (Angular Placement)

### Source Verification
In `component-orbit-layout.ts` (lines 193–194):
$$\Delta\theta = \frac{2\pi}{n_k}, \quad \theta_i = \text{trackOffset} + i \cdot \Delta\theta$$
Ring nodes are sorted alphabetically by `nodeId` (`ringNodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId))`). Polar angles are assigned via uniform linear increments.

### Evaluation of Options
- **Model B1 (Geometry-Only Uniform Packing):** Angles assigned strictly for uniform spatial clearance.
- **Model B2 (Semantic Domain Sectors):** $2\pi$ partitioned into domain angular wedges.

### Recommendation and Contract Wording
- **Recommended Option:** **Model B1 (Geometry-Only Uniform Spatial Packing)**.
- **Rationale:** Current implementation (`component-orbit-layout.ts`) provides 100% deterministic, input-order-invariant placement, guarantees dynamic chord separation $d_{\text{chord}} \ge 188.68\text{px}$, and avoids sector crowding. Radial depth $d_{\text{exec}} = \text{Ring Index}$ carries 100% of topological depth semantics.
- **Proposed Contract Wording (PROPOSED — NOT APPROVED):**
  > "Angular placement on Component Orbit rings shall serve geometry-only uniform spatial packing. Polar angles shall be assigned via uniform linear increments deltaTheta = 2*pi / N after sorting ring nodes alphabetically by canonical nodeId. Angular position shall convey zero domain or categorical meaning."
- **Approval Status:** `UNAPPROVED PRODUCT DECISION`. Requires product authority approval in `context/CURRENT-DECISIONS.md`.

---

## 7. Gate C Projection/Rendering Findings and Recommendation (Excluded Nodes)

### Investigation of 4-Level Node Pipeline

| Pipeline Level | Data Structure / Path | State for Unreachable Node | Current Code Behavior |
|---|---|---|---|
| **1. Global Project Data** | `ProjectContext.tsx` (`ExplorerDataSchema`) | Present in `nodes` array | Retained for other views |
| **2. Adapter Projection** | `component-orbit-adapter.ts` | Excluded from `projection.nodes`; listed in `projection.unreachableNodeIds` | Filtered by BFS queue |
| **3. Layout Output Map** | `architecture-layout.ts` | Omitted from `orbitOutput.positions` | **DEFECT L219–221:** Merges `existingPositions` into output |
| **4. Cytoscape Canvas Elements** | `GraphView.tsx` (`cy.nodes()`) | Present in DOM if in `nodes` prop | Rendered at stale coordinates due to L219 leak |

### Invariant and Minimum Correction
To ensure Policy C1 (Active Focal Projection Only) functions correctly:
1. **Layout Engine Fix:** Remove the `existingPositions` copy loop in `architecture-layout.ts` (lines 219–221) so `orbitPositions` contains ONLY projected focal nodes.
2. **Renderer Filtering Invariant:** In `GraphView.tsx` (lines 804–840), when `architectureMode === 'orbit'`, Cytoscape elements must be constructed using `projection.nodes` (or filtered against `projectedNodeIds`), causing unreachable nodes to be completely removed from Cytoscape DOM via `cy.elements().remove()`.
3. **Proposed Contract Wording (PROPOSED — NOT APPROVED):**
   > "Nodes outside the active focal projection (disconnected components, nodes beyond maxDepth, or relationship-filtered nodes) shall be excluded from the layout position map AND filtered out of active Cytoscape DOM canvas rendering in Lens B. Unreachable nodes shall remain preserved in global project data for non-focal views."
- **Approval Status:** `UNAPPROVED PRODUCT DECISION`. Requires product authority approval in `context/CURRENT-DECISIONS.md`.

---

## 8. Gate D Lifecycle Findings and Recommendation (Drag-Position Persistence)

### 12-Scenario Lifecycle Specification

| # | Scenario | Intended D3 Behavior | Current Code Behavior | Corrective Action Needed |
|---|---|---|---|---|
| 1 | Drag node within same focal context | Persist in `nodePositions[proj][mode][focalId][nodeId]` | Overwrites flat `nodePositions[nodeId]` | Update storage key structure in `projectState.ts` |
| 2 | Change focal node & return | Restore dragged position for that focal context | Dragged position leaks to new focal node | Scope storage lookup by `focalId` |
| 3 | Switch layout mode (Orbit -> Hierarchical) | Isolate drag to Orbit mode; Hierarchical computes fresh layout | Drag position forces node position in Hierarchical | Scope storage lookup by `mode` |
| 4 | Refresh source data | Retain drag override if node ID exists | Retains drag override | Maintain ID matching |
| 5 | Remove node from source data | Evict position on project state merge | Retained in flat store | Add cleanup during `mergeWithDefaultState` |
| 6 | Filter node out of projection | Node hidden; drag position preserved in store for return | Node rendered at stale position | Apply Gate C rendering filter |
| 7 | Change depth limit ($d: 7 \to 3$) | Nodes beyond $d=3$ hidden; positions preserved in store | Stale nodes linger at old positions | Apply Gate C rendering filter |
| 8 | Recompute layout / Reset | Clear session drag overrides for active focal context | Clears all positions globally | Scope reset to active composite context |
| 9 | Load saved project / session | Restore composite position map | Restores flat position map | Migrate flat schema to composite schema |
| 10 | Migrate old flat key positions | Convert `nodePositions[nodeId]` to `nodePositions[hierarchical][global][nodeId]` | Flat state parsed directly | Add migration in `mergeWithDefaultState` |
| 11 | Unassigned node in store | Ignore stored position if node not in active projection | Merges stored position into output | Remove L219 merge loop in `architecture-layout.ts` |
| 12 | Position Authority Precedence | Level 1 Drag > Level 2 Persisted Composite > Level 3 Cy DOM > Level 4 Layout | Level 2 flat key overrides Level 4 Layout | Enforce Level 2 composite scoping |

### Position Authority Precedence Hierarchy
1. **Level 1 (Session Drag):** In-session explicit drag stored in `sessionPositions` Map (`nodePositions[proj][mode][focalId][nodeId]`).
2. **Level 2 (Persisted Composite User Override):** Project localStorage entry matching exact composite key.
3. **Level 3 (Existing Cytoscape DOM Position):** Preserved only during incremental update of active focal nodes.
4. **Level 4 (Fresh Layout Engine Calculation):** Calculated by `computeComponentOrbitLayout` for active focal projection.
5. **Level 5 (Deterministic Fallback):** Placed via `calculateDeterministicNewNodePosition`.

- **Approval Status:** `UNAPPROVED PRODUCT DECISION`. Requires product authority approval in `context/CURRENT-DECISIONS.md`.

---

## 9. Geometry Discrepancy Resolution (120×60 vs 160×100)

### Source Code Audit of Dimensions

| Geometry Parameter | Value | Source Location | Code Symbol / Definition | Purpose |
|---|---|---|---|---|
| **Base Node Width $W$** | `120px` | `architecture-layout.ts` L86, `component-orbit-layout.ts` L82 | `nodeWidth = 120` | Base rectangular node body width |
| **Base Node Height $H$** | `60px` | `architecture-layout.ts` L87, `component-orbit-layout.ts` L83 | `nodeHeight = 60` | Base rectangular node body height |
| **Horizontal Gap $C_x$** | `40px` | `component-orbit-layout.ts` L84 | `horizontalGap = 40` | Horizontal clearance margin |
| **Vertical Gap $C_y$** | `40px` | `component-orbit-layout.ts` L85 | `verticalGap = 40` | Vertical clearance margin |
| **Effective Width $W_{\text{eff}}$** | `160px` | `component-orbit-layout.ts` L68 | `(120 + 120)/2 + 40 = 160` | Effective AABB collision width |
| **Effective Height $H_{\text{eff}}$** | `100px` | `component-orbit-layout.ts` L69 | `(60 + 60)/2 + 40 = 100` | Effective AABB collision height |
| **Bounding Diagonal $d_{\text{chord}}$** | `188.68px` | `component-orbit-layout.ts` L182 | $\sqrt{160^2 + 100^2} = 188.6796$ | Required chord separation threshold |
| **Cytoscape DOM Shape Width** | `50px` | `graph-style.ts` L86 | `width: nodeWidth (50)` | Rendered Cytoscape node shape width |
| **Cytoscape DOM Shape Height**| `50px` | `graph-style.ts` L87 | `height: nodeHeight (50)` | Rendered Cytoscape node shape height |
| **Cytoscape Label Max-Width** | `120px` | `graph-style.ts` L96 | `text-max-width: '120px'` | Wrapped label text bounding box |

### Geometry Resolution Proof
- **Resolution:** There is **zero contradiction** between $120 \times 60$ and $160 \times 100$.
- $120\text{px} \times 60\text{px}$ is the base node body bounding box $W \times H$.
- $40\text{px} \times 40\text{px}$ is the clearance margin $C_x \times C_y$.
- $160\text{px} \times 100\text{px}$ is the total effective AABB collision envelope $W_{\text{eff}} \times H_{\text{eff}} = (W + C_x) \times (H + C_y)$.
- $188.68\text{px}$ is the bounding diagonal threshold $d_{\text{chord}} = \sqrt{W_{\text{eff}}^2 + H_{\text{eff}}^2}$.
- Cytoscape shape bounds ($50 \times 50$) sit comfortably inside the $120 \times 60$ layout box, while $120\text{px}$ label wrapping matches $W = 120\text{px}$.

---

## 10. Test Provenance and Validation Gaps

### Executed Non-Destructive Test Verification

| Test Suite | Execution Command | Result | Verified Scope | Test Provenance Status |
|---|---|---|---|---|
| **CLI Integration Suite** | `npm run test:cli` | **PASS (31/31 Suites)** | Full static analysis CLI pipeline | **VERIFIED EXECUTED** |
| **Orbit Polar Layout Math** | `vitest run src/lib/orbit-layout.test.ts` | **PASS (12/12 Tests)** | Polar math, water-filling, AABB clearance | **VERIFIED EXECUTED** |
| **Component Orbit Adapter** | `vitest run src/lib/adapters/component-orbit-adapter.test.ts` | **PASS (10/10 Tests)** | BFS traversal, role symbols, determinism | **VERIFIED EXECUTED** |
| **Component Constellation Layout** | `vitest run src/lib/layout/component-constellation-layout.test.ts` | **PASS (10/10 Tests)** | Multi-sun constellation layout math | **VERIFIED EXECUTED** |
| **Static Constellation Projection** | `vitest run src/test/static-constellation-projection.test.ts` | **PASS (8/8 Tests)** | Static Mode element projection filtering | **VERIFIED EXECUTED** |
| **State Authority & Routing** | `vitest run src/test/Phase2FA_CoreArchitecture.test.tsx` | **PASS (12/12 Tests)** | Single state authority, routing, selection neutrality | **VERIFIED EXECUTED** |

### Validation Gaps
1. **Targeted Test Gap 1:** Unit test verifying position isolation across focal changes (`nodePositions[mode][focalId][nodeId]`).
2. **Targeted Test Gap 2:** Integration test asserting Cytoscape DOM element removal for unreachable nodes when switching focal context.
3. **Targeted Test Gap 3:** Regression test asserting composite position state migration from legacy flat JSON files.

---

## 11. Confirmed Engineering Defects

| ID | Reproduction Scenario | Exact Source Path | Authority Violated | Minimum Safe Correction | Product Decision Dependency | Regression Test Requirement |
|---|---|---|---|---|---|---|
| **DEF-01** | Switch layout mode (Hierarchical -> Orbit) or change focal LWC in Orbit mode | `architecture-layout.ts` L169–171, L219–221 | Level 4 Position Authority (Pure calculation constraint) | Delete the `existingPositions` copy loop for unassigned nodes in Orbit/Constellation blocks | None (Technical defect) | Assert `orbitPositions` contains ONLY projected focal nodes |
| **DEF-02** | Drag node in Orbit mode for LWC A, then switch focal node to LWC B or switch mode | `projectState.ts` L47 (`nodePositions[nodeId]`) | Position Authority Isolation & Context Boundaries | Update `projectState.ts` schema to key positions by composite scope `nodePositions[mode][focalId][nodeId]` | Depends on Gate D approval | Assert drag in LWC A exerts zero effect on LWC B layout |

---

## 12. Cross-Layout Impact

| Workspace View Mode | Shared State / Code Path | Potential Impact of Lens B Fixes | Required Safety Invariant | Regression Check |
|---|---|---|---|---|
| **Interactive Graph (`graph`)** | Shared `projectState.ts` position store | **Beneficial:** Eliminates stale Orbit position pollution in Hierarchical view | Hierarchical positions preserved under `mode = 'hierarchical'` | Verify Hierarchical layout unchanged |
| **Feature Matrix (`matrix`)** | Independent grid layout | Zero impact | Matrix grid state isolated | Verify Matrix renders |
| **Dependency River (`river`)** | Independent Sankey stage layout | Zero impact | River stage state isolated | Verify River renders |
| **Component Tree (`tree`)** | Hierarchy tree adapter | Zero impact | Tree state isolated | Verify Tree renders |
| **Risk Radar (`radar`)** | Polar radar adapter | Zero impact | Radar state isolated | Verify Radar renders |
| **DNA Barcode (`dna`)** | Sequential barcode adapter | Zero impact | DNA state isolated | Verify DNA renders |

---

## 13. Proposed Final Lens B Contract

```text
PROPOSED LENS B CONTRACT (PROPOSED — NOT APPROVED)
==================================================

1. CANONICAL IDENTITY & RELATIONSHIPS
   - 1.1 Node Identity: Every Salesforce component retains 1:1 canonical identity ("type:name").
   - 1.2 Traversal Algebra: Shortest directed execution depth d_exec calculated via BFS traversal over DEFAULT_COMPONENT_ORBIT_EDGE_TYPES.
   - 1.3 Shared SObjects: Represented as exactly one canonical node positioned near its primary consumer (metrics.fanIn DESC, nodeId ASC) with a "SHARED" badge. Anchoring is a geometric slot allocation convenience only.

2. RADIAL DEPTH & POLAR GEOMETRY
   - 2.1 Focal Sun: Focal LWC positioned at Cartesian origin (0, 0) with role symbol ☉.
   - 2.2 Radial Depth: Depth N components placed strictly on Ring N (R_N = R_inner + (N-1) * R_spacing).
   - 2.3 Angular Semantics: Geometry-only uniform spatial packing (deltaTheta = 2*pi / N) after alphabetical nodeId sorting.
   - 2.4 Multi-Track Expansion: Concentric track expansion triggered dynamically when required chord separation d_chord < 188.68px.

3. VISIBILITY & SELECTION
   - 3.1 Unreachable Nodes: Disconnected components, depth-truncated nodes (> maxDepth), or filtered nodes excluded from layout output AND filtered out of Cytoscape DOM rendering in Lens B.
   - 3.2 Selection Neutrality: Transient selection owned exclusively in InvestigationContext; zero effect on layout geometry.

4. POSITION AUTHORITY & PERSISTENCE
   - 4.1 Level 4 Pure Layout: Layout orchestrator returns coordinates strictly for projected focal nodes (zero existingPositions leakage).
   - 4.2 Composite Drag Scope: User drag overrides persisted under composite key (projectId, layoutMode, focalNodeId, nodeId).
```

---

## 14. Product Decision Packet

### Decision Gate A — Shared SObject Representation
- **Selected Recommendation:** Option A2 (Single Canonical Node + Non-Semantic Geometric Anchor + SHARED Badge).
- **Alternative Options:** A1 (Single Node + Multi-Tether Across Rings), A3 (Visual Proxy Clones).
- **Reason for Recommendation:** Preserves 1:1 node identity and full relationship edges in `ExplorerDataSchema` without duplicate visual clutter. `"◉ SHARED"` badge eliminates false ownership misinterpretation.
- **Contract Wording:** See Section 13 Clause 1.3.
- **Acceptance Criteria:** `Object:Account` renders as 1 node with `"SHARED"` badge; edges connect to all referencing components; no primary owner implied.
- **Approval Status:** `UNAPPROVED PRODUCT DECISION`.
- **Required Approval Record:** Record in `context/CURRENT-DECISIONS.md`.

### Decision Gate B — Angular Placement Semantics
- **Selected Recommendation:** Option B1 (Geometry-Only Uniform Spatial Packing).
- **Alternative Options:** B2 (Semantic Domain Sectors), B3 (Hybrid Sector/Packing).
- **Reason for Recommendation:** Matches active code (`component-orbit-layout.ts`), guarantees dynamic chord separation $d_{\text{chord}} \ge 188.68\text{px}$, and avoids sector crowding.
- **Contract Wording:** See Section 13 Clause 2.3.
- **Acceptance Criteria:** Polar angles assigned via $\Delta\theta = 2\pi / N$ after alphabetical `nodeId` sorting.
- **Approval Status:** `UNAPPROVED PRODUCT DECISION`.
- **Required Approval Record:** Record in `context/CURRENT-DECISIONS.md`.

### Decision Gate C — Unreachable-Node Visibility
- **Selected Recommendation:** Option C1 (Active Focal Projection Only — Hide Unreachable Nodes).
- **Alternative Options:** C2 (Reason-Based Categorization), C3 (Outer Peripheral Shell).
- **Reason for Recommendation:** Uncluttered, 100% focal-centric view. Removing L219 merge loop guarantees clean DOM canvas.
- **Contract Wording:** See Section 13 Clause 3.1.
- **Acceptance Criteria:** Unreachable nodes omitted from layout output and removed from Cytoscape DOM canvas in Lens B.
- **Approval Status:** `UNAPPROVED PRODUCT DECISION`.
- **Required Approval Record:** Record in `context/CURRENT-DECISIONS.md`.

### Decision Gate D — Drag-Position Persistence Scope
- **Selected Recommendation:** Option D3 (Composite Scoped Persistence — Mode and Focal Scoped).
- **Alternative Options:** D1 (Session-Only), D2 (Mode-Scoped), D4 (Global Override).
- **Reason for Recommendation:** Completely isolates user drags to exact view context where edit occurred, eliminating cross-mode and cross-focal position contamination.
- **Contract Wording:** See Section 13 Clause 4.2.
- **Acceptance Criteria:** Drag in LWC A exerts zero position effect on LWC B or Hierarchical view.
- **Approval Status:** `UNAPPROVED PRODUCT DECISION`.
- **Required Approval Record:** Record in `context/CURRENT-DECISIONS.md`.

---

## 15. Minimum Implementation and Validation Sequence

### Phase 1 — Authority Closure (Product Approval)
1. **Action:** Record product decision selections (A2, B1, C1, D3) in `context/CURRENT-DECISIONS.md`.
2. **Deliverable:** Updated `context/CURRENT-DECISIONS.md`.
3. **Exit Criterion:** `context/CURRENT-DECISIONS.md` contains signed records for Gates A–D.

### Phase 2 — Minimum Implementation Corrections
1. **Action 1:** Remove `existingPositions` copy loop for unassigned nodes in `architecture-layout.ts` (lines 169–171, 219–221).
2. **Action 2:** Update `projectState.ts` storage schema and `mergeWithDefaultState` to key drag positions by composite key `nodePositions[mode][focalId][nodeId]`.
3. **Action 3:** Update `GraphView.tsx` element synchronization to filter `nodes` against `projectedNodeIds` in Orbit mode.
4. **Deliverable:** Patched `architecture-layout.ts`, `projectState.ts`, and `GraphView.tsx`.
5. **Exit Criterion:** 0 stale position leaks and 0 cross-focal position contamination.

### Phase 3 — Targeted Verification & Contract Freeze
1. **Action:** Run `npm run test:cli` and targeted Vitest regression tests (`orbit-layout.test.ts`, `component-orbit-adapter.test.ts`, `Phase2FA_CoreArchitecture.test.tsx`).
2. **Deliverable:** All 31 CLI suites and Vitest suites passing.
3. **Exit Criterion:** 100% passing tests with 0.00000px coordinate drift and verified composite drag isolation.

---

## 16. Final Status Block

```text
================================================================================
                               FINAL AUDIT STATUS
================================================================================

- PRODUCT CONTRACT STATUS: C — PRODUCT CONTRACT NOT FROZEN
- TECHNICAL IMPLEMENTATION STATUS: T2 — CONTRACT ESTABLISHED, IMPLEMENTATION GAPS REMAIN
- VALIDATION STATUS: V2 — PARTIALLY VALIDATED

- APPROVED CONTRACT SCOPE:
  * Execution semantics inclusions T_exec (DEFAULT_COMPONENT_ORBIT_EDGE_TYPES)
  * Shortest directed execution depth d_exec via BFS queue traversal
  * Focal sun placement at origin (0, 0) with role symbol ☉
  * Ring-depth equivalence (depth === ringIndex)
  * Selection neutrality (SELECTION ≠ NAVIGATION in InvestigationContext)
  * Source data immutability and 1:1 canonical node identity conservation
  * Cartesian AABB non-overlap predicate |dx| >= 160px OR |dy| >= 100px
  * Dynamic chord clearance R >= d_chord / (2 * sin(pi / N))

- UNAPPROVED PRODUCT DECISIONS:
  * Gate A: Shared SObject Visual Representation (Model A1 vs A2 vs A3)
  * Gate B: Angular Placement Semantics (Model B1 vs B2 vs B3)
  * Gate C: Unreachable-Node Visibility Policy (Policy C1 vs C2 vs C3)
  * Gate D: Drag Position Persistence Scope (Policy D1 vs D2 vs D3 vs D4)

- CONFIRMED ENGINEERING DEFECTS:
  * DEF-01: Position contamination merge loop in architecture-layout.ts (L169-171, L219-221)
  * DEF-02: Flat drag storage key in projectState.ts (L47) leaking across focal contexts

- UNVERIFIED CLAIMS:
  * Multiline text label wrapping clearance across arbitrary dynamic fonts without DOM canvas measuring
  * User-visible acceptability of peripheral ring rendering (Policy C3) on dense graphs

- NEXT REQUIRED ACTION:
  * Obtain explicit product authority selection for Gates A, B, C, and D and record choices in context/CURRENT-DECISIONS.md.

- AUDIT TERMINATION:
  * This final report is complete. Reopening is justified ONLY if new source code changes, explicit product authority decisions, or reproducible new defects invalidate these recorded conclusions.
================================================================================
```
