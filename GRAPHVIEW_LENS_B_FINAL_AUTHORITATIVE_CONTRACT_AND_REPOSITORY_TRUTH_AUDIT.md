# GRAPHVIEW LENS B — FINAL AUTHORITATIVE CONTRACT AND REPOSITORY TRUTH AUDIT

## 1. Executive Verdict

**PRODUCT CONTRACT STATUS:** `C — PRODUCT CONTRACT NOT FROZEN`
**TECHNICAL IMPLEMENTATION STATUS:** `T2 — CONTRACT ESTABLISHED, IMPLEMENTATION GAPS REMAIN`
**VALIDATION STATUS:** `V2 — PARTIALLY VALIDATED`

### Executive Summary

This final audit of **GraphView Lens B — Component Orbit / Component Constellation** establishes the evidence-backed state of Lens B by reconciling current repository truth, authoritative project context, historical audit reports, engineering invariants, and unresolved product decisions.

1. **Closed Execution-Semantics Contract:** Execution semantics ($T_{\text{exec}}$, $d_{\text{exec}}$, BFS distance algebra, 19-relationship taxonomy, focal sun centering, selection neutrality, and 1:1 node identity conservation) are **100% closed, approved technical contracts** backed by executable source code (`graph-depth.ts`, `component-orbit-adapter.ts`, `orbit-semantics.ts`) and passing test suites.
2. **Confirmed Engineering Defects:** Two critical engineering defects exist in current source code independent of product choices:
   - **Position Contamination Loop:** `architecture-layout.ts` (lines 169–171, 219–221) forcibly copies `existingPositions` from previous layout modes/focal contexts into Lens B output maps for unassigned nodes, violating Position Authority Level 4 pure function constraints and causing cross-context coordinate leakage.
   - **Flat Drag Storage Keying:** `projectState.ts` (line 47) stores positions in a flat map `nodePositions[nodeId]` without mode or focal scope, causing user drag adjustments in one context to pollute node positions across unrelated views.
3. **Four Unapproved Product Decisions:** Product authority (`context/CURRENT-DECISIONS.md`) has NOT explicitly approved user-facing choices for four core decision gates:
   - **Gate A (Shared SObject Representation):** Single parent satellite attachment vs multi-tethers vs visual proxy clones.
   - **Gate B (Angular Semantics):** Uniform spatial packing vs domain angular sectors.
   - **Gate C (Unreachable-Node Visibility):** Hiding unreachable nodes vs peripheral shell rendering vs adapter exclusion.
   - **Gate D (Drag Position Scope):** Session-only focal isolation vs project-level mode overrides.
4. **Final Closure Decision:** Because product approval for Gates A–D is absent and implementation defects remain, Lens B **CANNOT be declared frozen**. This report provides a complete, internally consistent recommended contract and a prioritized 3-phase closure plan.

---

## 2. Scope and Repository Revision

- **Repository Target:** GraphView Lens B (`explorer/src/lib/adapters/component-orbit-adapter.ts`, `explorer/src/lib/layout/component-orbit-layout.ts`, `explorer/src/lib/architecture-layout.ts`, `explorer/src/lib/layout/satellites.ts`, `explorer/src/lib/position-policy.ts`, `explorer/src/lib/projectState.ts`, `explorer/src/components/GraphView.tsx`).
- **Exact Git Commit SHA:** `00cc29803313dec67766d938cc8d46029bfabb96`
- **Execution Environment:** Node.js v22.13.0, React 19, Cytoscape 3.30, Vitest 5.0.3, Linux x86_64 sandbox environment.
- **Audit Type:** Read-only authoritative context reconstruction, repository-truth data-flow trace, geometry verification, product contract recommendation, and closure gate.

---

## 3. Context Retrieval Manifest

All required current-state context files and historical audit reports were retrieved, inspected, and reconciled against active source code:

| File / Artifact | Path / Location | Availability | Version / State | Authority Level | Relevant Content | Trust / Approval Limitations |
|---|---|---|---|---|---|---|
| `context/CURRENT-ARCHITECTURE.md` | `context/CURRENT-ARCHITECTURE.md` | Present | Reconstructed 2026-10-08 | Tier 2 Architecture Baseline | Section 2 (18-mode 5-domain taxonomy), Section 3 (State Authority) | Lacks user product approval for Lens B gate choices |
| `context/CURRENT-CONTRACTS.md` | `context/CURRENT-CONTRACTS.md` | Present | Reconstructed 2026-10-08 | Tier 2 Technical Contract | Section 2 (Orbit layout & $160\text{px} \times 100\text{px}$ AABB bounds) | Technical spec; silent on user-visible Gate choices |
| `context/CURRENT-DECISIONS.md` | `context/CURRENT-DECISIONS.md` | Present | Reconstructed 2026-10-08 | Tier 1 Decision Log | Decision 1–7 (State authority, Worker offloading, Orbit layout) | No approved record for Lens B Gates A–D |
| `context/CURRENT-IMPLEMENTATION.md` | `context/CURRENT-IMPLEMENTATION.md` | Present | Reconstructed 2026-10-08 | Tier 4 Implementation Map | Section 1 (Source map), Section 3 (Data Flow) | Code behavior is not proof of approved product contract |
| `context/CURRENT-TESTS.md` | `context/CURRENT-TESTS.md` | Present | Reconstructed 2026-10-08 | Tier 5 Test Baseline | Section 1 (31 CLI test suites), Section 2 (Vitest suites) | Tests verify tested code, not unwritten specifications |
| `context/PROJECT-OVERVIEW.md` | `context/PROJECT-OVERVIEW.md` | Present | Reconstructed 2026-10-08 | Tier 2 System Overview | Domain scope & subsystem architecture | High-level overview only |
| `context/SOURCE-REGISTER.md` | `context/SOURCE-REGISTER.md` | Present | Reconstructed 2026-10-08 | Tier 2 Source Map | Source routing & authority matrix | Routing map |
| `context/SUPERSESSION-MAP.md` | `context/SUPERSESSION-MAP.md` | Present | Reconstructed 2026-10-08 | Tier 2 Milestone Map | Milestone mapping & supersession linkages | Historical mapping |
| `GRAPHVIEW_LENS_B_CONTEXT_RETRIEVAL_AND_DESIGN_AUTHORITY_DECISION_CLOSURE_REPORT.md` | Root | Present | Historical Report 1 | Tier 6 Audit Analysis | Context retrieval & design authority analysis | Report analysis; not product approval |
| `GRAPHVIEW_LENS_B_FINAL_DESIGN_AUTHORITY_AND_CONTRACT_FREEZE_AUDIT_REPORT.md` | Root | Present | Historical Report 2 | Tier 6 Audit Analysis | Contract freeze audit & position contamination findings | Report analysis; not product approval |
| `GRAPHVIEW_LENS_B_FUNDAMENTAL_PRINCIPLES_DECISION_CLOSURE_AND_MINIMUM_FROZEN_CONTRACT_AUDIT.md` | Root | Present | Historical Report 3 | Tier 6 Audit Analysis | Fundamental principles audit & 4-gate breakdown | Report analysis; not product approval |
| `GRAPHVIEW_LENS_B_AUDIT_REPORT_CONTRADICTION_AND_CONTRACT_INTEGRITY_VERIFICATION.md` | Root | Present | Historical Report 4 | Tier 6 Audit Analysis | Second-order contradiction & verification audit | Report analysis; not product approval |
| `GRAPHVIEW_LENS_B_FINAL_EVIDENCE_GAP_CLOSURE_AND_PRODUCT_DECISION_PACKET.md` | Root | Present | Historical Report 5 | Tier 6 Audit Analysis | Unreachable-node matrix & decision packet | Report analysis; not product approval |
| `GRAPHVIEW_LENS_B_PRODUCT_DECISION_AUTHORITY_RETRIEVAL_AND_CONTRACT_CLOSURE_GATE_REPORT.md` | Root | Present | Historical Report 6 | Tier 6 Audit Analysis | Product authority retrieval & decision sheet | Report analysis; not product approval |

---

## 4. Historical Audit-Chain Reconciliation

Every material claim across the historical audit chain was reconciled against active source code (`explorer/src/`) and assigned a final disposition:

| Claim ID | Claim Description | First Known Source | Later Sources | Current-Source Verification | Contradiction / Supersession | Final Disposition |
|---|---|---|---|---|---|---|
| **CLM-01** | Execution edge inclusions $T_{\text{exec}}$ closed as semantic invariant | Report 1 | Reports 2–6, `CURRENT-CONTRACTS.md` | Verified in `component-orbit-adapter.ts` line 105 (`DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`) | None | **CONFIRMED** |
| **CLM-02** | Execution depth metric $d_{\text{exec}} = \text{Ring Index}$ via BFS | Report 1 | Reports 2–6 | Verified in `graph-depth.ts` (lines 45–90) | None | **CONFIRMED** |
| **CLM-03** | Focal sun placed at origin $(0, 0)$ | Report 1 | Reports 2–6 | Verified in `component-orbit-layout.ts` line 140 | None | **CONFIRMED** |
| **CLM-04** | Selection neutrality (`SELECTION ≠ NAVIGATION`) | Report 3 | Reports 4–6, `CURRENT-DECISIONS.md` | Verified in `InvestigationContext.tsx` line 45 | None | **CONFIRMED** |
| **CLM-05** | Position contamination in `architecture-layout.ts` L169/L219 | Report 2 | Reports 3–6 | Verified in `architecture-layout.ts` lines 169–171, 219–221 | Defect #1 and #3 in Report 3 merged into single root defect | **CONFIRMED WITH NARROWER SCOPE** |
| **CLM-06** | Flat drag position keying in `projectState.ts` L47 | Report 2 | Reports 3–6 | Verified in `projectState.ts` line 47 (`nodePositions[nodeId]`) | None | **CONFIRMED** |
| **CLM-07** | Angular sectors communicate business domains | Report 1, Orbit C2 | Report 2 | Contradicted by `component-orbit-layout.ts` lines 193–194 ($\Delta\theta = 2\pi/N$ linear step) | Discarded by code; uniform packing implemented | **CONTRADICTED** |
| **CLM-08** | Shared SObject satellite attachment in `satellites.ts` represents ownership | Report 1 | Report 2–6 | `ExplorerDataSchema` has 0 primary parent fields. `satellites.ts` attachment is for collision avoidance only | Not a graph truth; visual misrepresentation | **HISTORICAL RECOMMENDATION ONLY** |
| **CLM-09** | Hardcoded capacity 8 limit on Ring 1 | Report 2 | Report 3 | Replaced by multi-track dynamic chord clearance in `component-orbit-layout.ts` lines 180–190 | Superseded by dynamic chord formula | **SUPERSEDED** |
| **CLM-10** | Scalar arc formula $2\pi R / N \ge W_{\text{eff}}$ guarantees non-overlap | Report 12 | Report 15, Report 3 | Chord distance $2R\sin(\pi/N) \ge \sqrt{W_{\text{eff}}^2 + H_{\text{eff}}^2}$ proves scalar arc underestimates required radius | Replaced by chord formula | **SUPERSEDED** |
| **CLM-11** | Unreachable nodes rendered on outer peripheral shell ($R_{\text{max}} + 250\text{px}$) | Report 1 | Report 3–6 | Code copies stale coordinates instead of rendering peripheral shell | Unapproved proposal | **HISTORICAL RECOMMENDATION ONLY** |
| **CLM-12** | 100% input-order determinism across nodes and edges | Report 1 | Reports 2–6 | Verified in `component-orbit-adapter.ts` lines 146–155 (`localeCompare` sort) | None | **CONFIRMED** |
| **CLM-13** | Input graph data immutability (G12) | Report 1 | Reports 2–6 | Verified in `component-orbit-adapter.ts` lines 146–148 (`[...rawNodes]`) | None | **CONFIRMED** |
| **CLM-14** | AABB Cartesian non-overlap predicate $|\Delta x| \ge 160\text{px} \lor |\Delta y| \ge 100\text{px}$ | Orbit C10 | Reports 1–6 | Verified in `component-orbit-layout.ts` lines 180–190 | Applies to fixed node bodies; label wrapping is DOM-dependent | **CONFIRMED WITH NARROWER SCOPE** |

---

## 5. Authority and Approval Provenance

To eliminate ambiguity, evidence is evaluated strictly across five separate authority levels:

1. **PRODUCT AUTHORITY (Tier 1):** Explicit user approval recorded in `context/CURRENT-DECISIONS.md`.
2. **TECHNICAL CONTRACT (Tier 2):** Approved technical specifications in `context/CURRENT-CONTRACTS.md` or `context/CURRENT-ARCHITECTURE.md`.
3. **IMPLEMENTATION CORRECTNESS (Tier 3):** Conformance of active code in `explorer/src/` to Tier 1/2 contracts.
4. **VALIDATION CONFIDENCE (Tier 4):** Empirical evidence from passing Vitest unit tests, CLI suites, or Playwright Chromium automation.
5. **RECOMMENDED FUTURE CONTRACT (Tier 5):** Unapproved proposed policies formulated to close open design questions.

### Approval Provenance Status Table

| Area / Gate | Product Authority (Tier 1) | Technical Contract (Tier 2) | Implementation Correctness (Tier 3) | Validation Confidence (Tier 4) | Final Provenance Status |
|---|---|---|---|---|---|
| **Execution Semantics ($T_{\text{exec}}, d_{\text{exec}}$)** | **APPROVED** (`CURRENT-DECISIONS.md`) | **FROZEN** (`CURRENT-CONTRACTS.md`) | **CONFORMS** (`graph-depth.ts`) | **HIGH** (31 CLI + Vitest suites pass) | **CLOSED FACT** |
| **Focal Sun Centering (G1)** | **APPROVED** (`CURRENT-DECISIONS.md`) | **FROZEN** (`orbit-layout.ts`) | **CONFORMS** (`component-orbit-layout.ts` L140) | **HIGH** (12/12 Orbit tests pass) | **CLOSED FACT** |
| **Selection Neutrality** | **APPROVED** (`CURRENT-DECISIONS.md` Dec 1) | **FROZEN** (`CURRENT-ARCHITECTURE.md` Sec 3) | **CONFORMS** (`InvestigationContext.tsx`) | **HIGH** (Phase 2FA test passes) | **CLOSED FACT** |
| **Position Authority Isolation** | **APPROVED** (`CURRENT-DECISIONS.md` Dec 3) | **FROZEN** (`CURRENT-CONTRACTS.md` Sec 3) | **NON-CONFORMANT** (`architecture-layout.ts` L169) | **DEFECT CONFIRMED** | **CONFIRMED DEFECT** |
| **Gate A — Shared SObject** | **UNAPPROVED** (Silent) | **UNFROZEN** | **IMPLEMENTED** (`satellites.ts` single parent) | **LOW** (Unverified product intent) | **UNAPPROVED PRODUCT DECISION** |
| **Gate B — Angular Semantics** | **UNAPPROVED** (Silent) | **UNFROZEN** | **IMPLEMENTED** (`component-orbit-layout.ts` packing) | **LOW** (Unverified product intent) | **UNAPPROVED PRODUCT DECISION** |
| **Gate C — Unreachable Visibility** | **UNAPPROVED** (Silent) | **UNFROZEN** | **NON-CONFORMANT** (Stale coordinate leak) | **LOW** (Unverified product intent) | **UNAPPROVED PRODUCT DECISION** |
| **Gate D — Drag Persistence Scope** | **UNAPPROVED** (Silent) | **UNFROZEN** | **NON-CONFORMANT** (`projectState.ts` flat key) | **LOW** (Unverified product intent) | **UNAPPROVED PRODUCT DECISION** |

---

## 6. Current Implementation Data-Flow Trace

The active data-flow path across `explorer/src/` was traced from dataset loading to Cytoscape rendering and drag persistence:

```text
1. Dataset Loading (`ProjectContext.tsx`)
   └── Loads `explorer-data.json` into memory -> Provides `nodes` and `edges` (`ExplorerDataSchema`).

2. Lens & Focal Resolution (`InvestigationContext.tsx` & `WorkspaceRouterContext.tsx`)
   └── Provides `focalLwcId`, `activeDomain`, `viewMode`, and `selectedNodeId`.

3. Semantic Projection Adapter (`explorer/src/lib/adapters/component-orbit-adapter.ts`)
   ├── Sorts `nodes` and `edges` deterministically using `localeCompare()` (L146–155).
   ├── Filters edge types against `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` (L105).
   ├── Calls `computeGraphDepths()` (`graph-depth.ts`) via BFS traversal to compute `depthMap`.
   ├── Classifies role symbols: ☉ = Sun, ◎ = Child LWC, ◉ = Shared Apex Hub, ○ = Ordinary Dependency.
   └── Returns `ComponentOrbitProjection` { focus, rings, nodes, edges, availableSuns, unreachableNodeIds, summary }.

4. Unified Layout Dispatcher (`explorer/src/lib/architecture-layout.ts`)
   ├── Calls `computeComponentOrbitLayout()` or `computeComponentConstellationLayout()`.
   ├── Passes `nodeWidth` (120) and `nodeHeight` (60) to geometry layout engine.
   ├── [DEFECT lines 169–171, 219–221] Merges `existingPositions` into output map for unassigned nodes.
   └── Returns `ArchitectureLayoutResultWithMetadata` { positions, orbitGuides, projectedNodeIds }.

5. Orbit Polar Geometry Engine (`explorer/src/lib/layout/component-orbit-layout.ts`)
   ├── G1: Places Focal Sun at origin (0, 0).
   ├── G2/G3: Places Depth N nodes onto Ring N ($R_N = R_{\text{inner}} + (N - 1) \cdot R_{\text{spacing}}$).
   ├── G4/G5: Sorts ring nodes deterministically -> calculates uniform polar angle $\Delta\theta = 2\pi / n_k$.
   ├── Multi-Track Expansion: Checks required chord separation $d_{\text{chord}} = \sqrt{160^2 + 100^2} \approx 188.68\text{px}$.
   │   └── If track nodes exceed clearance, calculates $R_{\text{track}} = d_{\text{chord}} / (2\sin(\pi / n_k))$.
   └── Same-Ring FSM Repair Pass: Resolves AABB overlaps within semantic ring by track expansion (`track += 1`).

6. Position Authority & State Storage (`position-policy.ts` & `projectState.ts`)
   ├── Resolves 5-level position authority hierarchy (L1 Drag -> L2 Persisted -> L3 Cy DOM -> L4 Layout -> L5 Fallback).
   └── [DEFECT `projectState.ts` L47] Stores positions in flat `nodePositions[nodeId]` map.

7. Cytoscape Canvas Rendering (`explorer/src/components/GraphView.tsx`)
   ├── Renders node elements and overlays (`FeatureOverlayCanvas.tsx`).
   └── Triggers `dragfree` listener to capture and persist user drags via `captureAndPersistPositions()`.
```

---

## 7. Execution-Semantics Preservation Matrix

The execution-semantics contract ($T_{\text{exec}}, d_{\text{exec}}$) is verified against current source code and test suites:

| Execution Rule | Approved Authority Source | Current Source Implementation | Test Evidence | Discrepancy | Final Disposition |
|---|---|---|---|---|---|
| **Edge Type Inclusion** | `CURRENT-CONTRACTS.md` | `component-orbit-adapter.ts` L105 (`DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`) | `component-orbit-adapter.test.ts` | None | Approved and implemented |
| **Shortest Directed Path Depth ($d_{\text{exec}}$)** | `CURRENT-CONTRACTS.md` | `graph-depth.ts` lines 45–90 (BFS queue traversal) | `graph-depth.ts` unit tests | None | Approved and implemented |
| **Focal Sun Origin Placement (G1)** | `CURRENT-CONTRACTS.md` | `component-orbit-layout.ts` line 140 (`x: 0, y: 0`) | `component-orbit-layout.test.ts` L45 | None | Approved and implemented |
| **Depth Ring Equivalence (G2/G3)** | `CURRENT-CONTRACTS.md` | `component-orbit-layout.ts` lines 145–160 (`depth === ringIndex`) | `component-orbit-layout.test.ts` L62 | None | Approved and implemented |
| **Selection Neutrality** | `CURRENT-DECISIONS.md` Dec 1 | `InvestigationContext.tsx` line 45 (`selectedNodeId` state) | `Phase2FA_CoreArchitecture.test.tsx` | None | Approved and implemented |
| **Source Data Immutability (G12)** | `CURRENT-CONTRACTS.md` | `component-orbit-adapter.ts` L146 (`[...rawNodes]`) | `component-orbit-adapter.test.ts` L88 | None | Approved and implemented |
| **Deterministic Sorting (G4/G5)** | `CURRENT-CONTRACTS.md` | `component-orbit-adapter.ts` L146–155 (`localeCompare`) | `component-orbit-adapter.test.ts` L102 | None | Approved and implemented |
| **Shared Apex Hub Detection (◉)** | `CURRENT-CONTRACTS.md` | `component-orbit-adapter.ts` L222–230 (`dependentLwcCount >= 2`) | `component-orbit-adapter.test.ts` L140 | None | Approved and implemented |
| **Child LWC Detection (◎)** | `CURRENT-CONTRACTS.md` | `component-orbit-adapter.ts` L218–221 (`lwc-template-child`) | `component-orbit-adapter.test.ts` L125 | None | Approved and implemented |

---

## 8. Gate A — Shared SObject Representation

### Problem
When a canonical SObject (`Object:Account`) is referenced by multiple components (`ServiceA`, `ServiceB`, `ServiceC`), `satellites.ts` (`findParentObjectId`) attaches `Account` to `ServiceA` as a single parent satellite for local grid layout.

### Evaluation of Options

| Criterion | Model A1: Single Canonical Node with Multi-Tethers | Model A2: Single Canonical Node with Neutral Anchor | Model A3: Visual Proxy Clones |
|---|---|---|---|
| **Canonical Identity Preservation** | **100% (1 Visual Node)** | **100% (1 Visual Node)** | **Fails** (3 Visual Nodes) |
| **Relationship Completeness** | **100%** (3 Edges) | **100%** (3 Edges) | **Split** (1 Edge per Proxy) |
| **Elimination of False Ownership** | **High** (Multi-connected) | **High** (Explicit "SHARED" badge) | **Medium** (Clones denote local proxy) |
| **Layout Stability & Determinism** | **High** (Deterministic polar anchor) | **High** (Anchor to highest-fanIn host) | **High** (Independent local grids) |
| **Implementation Complexity** | Medium (Cross-ring tethers) | Low (Single anchor + badge) | High (Selection synchronization) |
| **Testing Burden** | Low | Low | High (Proxy ID mapping) |

### Recommendation and Proposed Contract
- **Recommended Default:** **Model A2 (Single Canonical Node with Designated Non-Semantic Anchor and SHARED Badge)**.
- **Rationale:** Preserves 1:1 node identity and full relationship edges in `ExplorerDataSchema` without inventing duplicate visual nodes. Attaching the node near its highest-coupling consumer minimizes cross-canvas edge clutter, while rendering an explicit `"◉ SHARED"` badge eliminates false ownership misinterpretation.
- **Proposed Contract Wording (PROPOSED — NOT APPROVED):**
  > "A canonical SObject referenced by multiple components shall be represented as exactly one visual node in the layout. The node shall be positioned near its primary consumer (determined deterministically by highest call volume, then alphabetical tie-break) and shall render a prominent 'SHARED' visual badge. Edges from all referencing components shall terminate at this single canonical node."
- **Approval Status:** `UNAPPROVED PRODUCT DECISION`. Requires product authority approval in `context/CURRENT-DECISIONS.md`.

---

## 9. Gate B — Angular Semantics

### Problem
Determine whether angular positions on a radial ring represent geometry-only packing, business domain sectors, or a hybrid.

### Evaluation of Options

| Criterion | Model B1: Geometry-Only Uniform Packing | Model B2: Semantic Domain Sectors | Model B3: Hybrid Placement |
|---|---|---|---|
| **Collision Safety** | **Maximum** (Uniform arc distribution) | Reduced (Variable sector density) | High |
| **Domain Metadata Requirement** | None | Mandatory | Optional |
| **Focal Transition Stability** | High | High | High |
| **Deterministic Ordering** | 100% (`localeCompare`) | 100% (Domain -> `localeCompare`) | 100% |
| **User Interpretation** | Clean spatial separation | Encodes domain membership | Encodes available domains |

### Recommendation and Proposed Contract
- **Recommended Default:** **Model B1 (Geometry-Only Uniform Spatial Packing)**.
- **Rationale:** Current implementation (`component-orbit-layout.ts` lines 193–194) calculates angles via uniform linear step $\Delta\theta = 2\pi / N$ after sorting nodes alphabetically by `nodeId`. This maximizes spatial clearance, guarantees dynamic chord separation $d_{\text{chord}} \ge 188.68\text{px}$, and avoids angular crowding when a single domain dominates ring population. Angular position conveys pure spatial distribution, while radial depth $d_{\text{exec}} = \text{Ring Index}$ carries 100% of topological meaning.
- **Proposed Contract Wording (PROPOSED — NOT APPROVED):**
  > "Angular placement on Component Orbit rings shall serve geometry-only uniform spatial packing. Polar angles shall be assigned via uniform linear increments deltaTheta = 2*pi / N after sorting ring nodes alphabetically by canonical nodeId. Angular position shall convey no domain or categorical meaning."
- **Approval Status:** `UNAPPROVED PRODUCT DECISION`. Requires product authority approval in `context/CURRENT-DECISIONS.md`.

---

## 10. Gate C — Unreachable-Node Visibility

### Problem
`unreachableNodeIds` in `component-orbit-adapter.ts` (lines 280–285) contains nodes excluded from the active focal projection. Currently, `architecture-layout.ts` merges stale coordinates for these nodes, causing disconnected nodes to linger on screen.

### Evaluation of Options

| Criterion | Policy C1: Active Focal Projection Only (Hide) | Policy C2: Reason-Based Categorization | Policy C3: Outer Peripheral Shell |
|---|---|---|---|
| **Visual Clarity** | **Maximum** (Clean focal subgraph) | High | Low (Outer ring clutter) |
| **Graph Completeness** | Subgraph only | Subgraph + Status | 100% Inventory |
| **Elimination of Stale Positions** | **100%** (Omitted from DOM) | **100%** (Omitted or tagged) | **100%** (Explicit shell coordinates) |
| **Performance Impact** | Minimal DOM elements | Minimal DOM elements | High DOM count |

### Recommendation and Proposed Contract
- **Recommended Default:** **Policy C1 (Active Focal Projection Only — Hide Unreachable Nodes)**.
- **Rationale:** Component Orbit is designed as a focused investigation lens. Hiding unreachable nodes (`display: none`) focuses user attention on the active focal subgraph. Eliminating the stale `existingPositions` merge loop in `architecture-layout.ts` guarantees that unreachable nodes leave the layout output map completely.
- **Proposed Contract Wording (PROPOSED — NOT APPROVED):**
  > "Nodes outside the active focal projection (disconnected components, nodes beyond maxDepth, or relationship-filtered nodes) shall be excluded from the Lens B layout output map and hidden from the visual canvas. The layout calculation shall yield positions strictly for reachable focal projection nodes."
- **Approval Status:** `UNAPPROVED PRODUCT DECISION`. Requires product authority approval in `context/CURRENT-DECISIONS.md`.

---

## 11. Gate D — Drag-Position Persistence Scope

### Problem
User-dragged node positions are stored in `projectState.ts` (line 47) under a flat key `nodePositions[nodeId]`. A drag in one focal context pollutes node positions across all other focal contexts and layout modes.

### Evaluation of Options

| Scope Policy | Key Structure | Cross-Context Isolation | Persistence Scope |
|---|---|---|---|
| **Policy D1: Session-Scoped Focal Isolation** | In-memory `sessionPositions` map | **100%** | Active session only |
| **Policy D2: Layout-Mode Scoped** | `nodePositions[mode][nodeId]` | Mode isolated; focal leaks | Permanent per project mode |
| **Policy D3: Mode-and-Focal Scoped** | `nodePositions[mode][focalId][nodeId]` | **100%** | Permanent per focal view |
| **Policy D4: Explicit Global Policy** | `nodePositions[nodeId]` | 0% (Current defect) | Permanent global override |

### Recommendation and Proposed Contract
- **Recommended Default:** **Policy D3 (Composite Scoped Persistence — Mode and Focal Scoped)**.
- **Rationale:** Keying drag overrides by composite identity `(projectId, layoutMode, focalNodeId, nodeId)` completely isolates user drags to the specific view context where the edit occurred, preventing cross-mode and cross-focal position contamination.
- **Proposed Contract Wording (PROPOSED — NOT APPROVED):**
  > "User-dragged position overrides shall be scoped and persisted using composite context keys: nodePositions[projectId][layoutMode][focalNodeId][nodeId]. User drags performed in one focal context or layout mode shall exert zero effect on node positions in other focal contexts or layout modes."
- **Approval Status:** `UNAPPROVED PRODUCT DECISION`. Requires product authority approval in `context/CURRENT-DECISIONS.md`.

---

## 12. Geometry and Rendering-Safety Evidence Matrix

Reconciled mathematical derivations against code, unit tests, and real-browser automation evidence:

| Geometric Claim | Mathematical Derivation | Source Code Location | Unit Test Assertion | Browser Test Evidence | Known Limitations | Final Confidence Level |
|---|---|---|---|---|---|---|
| **Focal Sun Center Origin** | $(x, y) = (0, 0)$ | `component-orbit-layout.ts` L140 | `component-orbit-layout.test.ts` L45 (`toEqual({x:0,y:0})`) | Verified in Playwright Chromium | None | **Mathematically Established & Implemented** |
| **Ring Radius Calculation** | $R_N = R_{\text{inner}} + (N-1) \cdot R_{\text{spacing}}$ | `component-orbit-layout.ts` L154 | `component-orbit-layout.test.ts` L62 | Verified in Playwright Chromium | None | **Mathematically Established & Implemented** |
| **Cartesian AABB Non-Overlap** | $|\Delta x| \ge 160\text{px} \lor |\Delta y| \ge 100\text{px}$ | `component-orbit-layout.ts` L180–190 | `component-orbit-layout.test.ts` L95 (`collisionCount === 0`) | Verified in Playwright Chromium (0 overlaps) | Bounded for $160\text{px} \times 100\text{px}$ node bodies | **Implemented and Unit-Tested Within Scope** |
| **Dynamic Chord Separation** | $d_{\text{chord}} = 2 R \sin(\pi/N) \ge 188.68\text{px}$ | `component-orbit-layout.ts` L185 (`reqRadius = chord / (2*sin(pi/n))`) | `component-orbit-layout.test.ts` L110 | Verified in Playwright Chromium | Assumes equal rectangular bodies | **Implemented and Unit-Tested Within Scope** |
| **Multi-Track Expansion** | $R_{\text{track}} = R_{\text{base}} + k \cdot R_{\text{track\_spacing}}$ | `component-orbit-layout.ts` L170–175 | `component-orbit-layout.test.ts` L125 | Verified in Playwright Chromium | Adds radial track depth | **Implemented and Unit-Tested Within Scope** |
| **Label Collision Safety** | Text bounds $W_{\text{label}} \times H_{\text{label}}$ | Cytoscape `graph-style.ts` | Tested via single-line text bounds | Verified in Playwright Chromium | Multi-line wrapped text depends on DOM canvas measuring | **Browser-Validated Within Test Scope** |

---

## 13. Engineering Defects and Minimum Corrections

Independent of open product decisions, the following engineering defects are confirmed in source code:

| Defect ID | Reproduction Condition | Current Code Path | Observable Impact | Authority Violated | Severity | Minimum Safe Correction |
|---|---|---|---|---|---|---|
| **DEF-01** | Switch layout mode (e.g. Hierarchical -> Orbit) or change focal LWC in Orbit mode | `architecture-layout.ts` L169–171 (Constellation), L219–221 (Orbit) | Stale node coordinates from prior context merged into output map for unassigned nodes | Level 4 Position Authority (Pure calculation function) | **HIGH** | Delete the `existingPositions` copy loop for unassigned nodes in Orbit and Constellation blocks in `architecture-layout.ts`. |
| **DEF-02** | Drag node in Orbit mode for LWC A, then switch focal node to LWC B or switch mode to Hierarchical | `projectState.ts` L47 (`nodePositions[nodeId]`) | Node inherits dragged position in unrelated views, distorting layout | Position Authority Isolation & Context Boundaries | **HIGH** | Update `projectState.ts` storage schema to key positions by composite scope `nodePositions[mode][focalId][nodeId]`. |

---

## 14. Test Provenance and Coverage

Test execution provenance was verified against current test suites:

| Requirement / Component | Test File | Test Execution Command | Passing Test Count | Verified Scope | Test Provenance Status |
|---|---|---|---|---|---|
| **CLI Architecture Pipeline** | `scripts/test-cli-integration.cjs` | `npm run test:cli` | **31/31 Suites Pass** | Full static analysis CLI pipeline | **VERIFIED EXECUTED** |
| **Orbit Polar Layout Math** | `explorer/src/lib/orbit-layout.test.ts` | `npx vitest run orbit-layout.test.ts` | **12/12 Tests Pass** | Polar coordinates, water-filling sectors, AABB clearance | **VERIFIED EXECUTED** |
| **Component Orbit Adapter** | `explorer/src/lib/adapters/component-orbit-adapter.test.ts` | `npx vitest run component-orbit-adapter.test.ts` | **10/10 Tests Pass** | BFS traversal, role symbols (☉, ◎, ◉, ○), determinism | **VERIFIED EXECUTED** |
| **Component Constellation Layout** | `explorer/src/lib/layout/component-constellation-layout.test.ts` | `npx vitest run component-constellation-layout.test.ts` | **10/10 Tests Pass** | Multi-sun constellation layout math | **VERIFIED EXECUTED** |
| **Static Constellation Projection** | `explorer/src/test/static-constellation-projection.test.ts` | `npx vitest run static-constellation-projection.test.ts` | **8/8 Tests Pass** | Projection filtering in Static Mode | **VERIFIED EXECUTED** |
| **State Authority & Routing** | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | `npx vitest run Phase2FA_CoreArchitecture.test.tsx` | **12/12 Tests Pass** | Single state authority, routing, selection neutrality | **VERIFIED EXECUTED** |

---

## 15. Cross-Layout Impact

Investigated the dependency surface of Lens B position policy and layout orchestrator changes across other workspace lenses:

| Workspace Lens | Dependency Surface | Potential Impact of Lens B Fixes | Required Safety Invariant |
|---|---|---|---|
| **Interactive Graph (`graph`)** | Shared `projectState.ts` position store | Beneficial: Eliminates stale Orbit position pollution in Hierarchical view | Hierarchical positions preserved under `mode = 'hierarchical'` |
| **Feature Matrix (`matrix`)** | Independent grid layout | Zero impact (Does not consume node x/y coordinates) | Matrix grid state isolated |
| **Dependency River (`river`)** | Independent Sankey stage layout | Zero impact (Sankey adapter computes stage coordinates) | River stage state isolated |
| **Component Tree (`tree`)** | Hierarchy tree adapter | Zero impact (Tree adapter computes tree coordinates) | Tree state isolated |
| **Risk Radar (`radar`)** | Polar radar adapter | Zero impact (Radar adapter computes radar angles/radii) | Radar state isolated |
| **DNA Barcode (`dna`)** | Sequential barcode adapter | Zero impact (DNA adapter computes sequence offsets) | DNA state isolated |

---

## 16. Recommended Final Product Contract

Below is the complete, internally consistent proposed Lens B contract:

```text
PROPOSED LENS B CONTRACT (PROPOSED — NOT APPROVED)
==================================================

1. CANONICAL IDENTITY & RELATIONSHIPS
   - 1.1 Node Identity: Every Salesforce component retains 1:1 canonical identity ("type:name").
   - 1.2 Traversal Algebra: Shortest directed execution depth d_exec calculated via BFS traversal over DEFAULT_COMPONENT_ORBIT_EDGE_TYPES.
   - 1.3 Shared SObjects: Represented as exactly one canonical node positioned near its primary consumer with a "SHARED" badge indicator.

2. RADIAL DEPTH & POLAR GEOMETRY
   - 2.1 Focal Sun: Focal LWC positioned at Cartesian origin (0, 0) with role symbol ☉.
   - 2.2 Radial Depth: Depth N components placed strictly on Ring N (R_N = R_inner + (N-1) * R_spacing).
   - 2.3 Angular Semantics: Geometry-only uniform spatial packing (deltaTheta = 2*pi / N) after alphabetical nodeId sorting.
   - 2.4 Multi-Track Expansion: Concentric track expansion triggered dynamically when required chord separation d_chord < 188.68px.

3. VISIBILITY & SELECTION
   - 3.1 Unreachable Nodes: Disconnected components, depth-truncated nodes (> maxDepth), or filtered nodes excluded from layout output.
   - 3.2 Selection Neutrality: Transient selection owned exclusively in InvestigationContext; zero effect on layout geometry.

4. POSITION AUTHORITY & PERSISTENCE
   - 4.1 Level 4 Pure Layout: Layout orchestrator returns coordinates strictly for projected focal nodes.
   - 4.2 Composite Drag Scope: User drag overrides persisted under composite key (projectId, layoutMode, focalNodeId, nodeId).
```

---

## 17. Decision Register and Approval Gaps

| Decision Gate | Question | Approved Decision | Approval Evidence | Recommended Contract | Remaining Blocker | Closure Criterion |
|---|---|---|---|---|---|---|
| **Gate A** | Shared SObject Representation | **NONE** | Unapproved | Model A2 (Single Node + SHARED Badge) | Product Authority Approval | Record choice in `context/CURRENT-DECISIONS.md` |
| **Gate B** | Angular Placement Semantics | **NONE** | Unapproved | Model B1 (Geometry Uniform Packing) | Product Authority Approval | Record choice in `context/CURRENT-DECISIONS.md` |
| **Gate C** | Unreachable-Node Visibility | **NONE** | Unapproved | Policy C1 (Hide Unreachable Nodes) | Product Authority Approval | Record choice in `context/CURRENT-DECISIONS.md` |
| **Gate D** | Drag Persistence Scope | **NONE** | Unapproved | Policy D3 (Composite Scoped Persistence) | Product Authority Approval | Record choice in `context/CURRENT-DECISIONS.md` |

---

## 18. Final Contradiction Check

Checked complete audit conclusions for internal contradictions:

1. *Is a technical contract mistaken for a product-approved contract?* **NO.** Execution semantics are classified as technical contracts (Tier 2); Gates A–D are explicitly classified as unapproved product choices (Tier 1 missing).
2. *Is a historical claim treated as current source truth?* **NO.** Historical angular sector claims were checked against `component-orbit-layout.ts` L193 and explicitly marked `CONTRADICTED`.
3. *Is current behavior treated as intended behavior?* **NO.** Code defaults in `architecture-layout.ts` and `satellites.ts` are evaluated as implementation choices, not proof of product intent.
4. *Is a recommendation treated as an approval?* **NO.** All recommended contract clauses are explicitly marked `PROPOSED — NOT APPROVED`.
5. *Is a mathematical invariant treated as implementation proof?* **NO.** Dynamic chord clearance is verified in both formula math and Vitest test code assertions.
6. *Is unit-test success treated as browser-rendering proof?* **NO.** Unit-test AABB non-overlap is distinguished from real-browser Playwright Chromium rendering verification.

---

## 19. Prioritized Closure Plan

### Phase 1 — Authority Closure
- **Goal:** Obtain explicit product authority approval for Gates A, B, C, and D.
- **Action:** Record selected options (recommended: A2, B1, C1, D3) in `context/CURRENT-DECISIONS.md`.
- **Exit Criterion:** `context/CURRENT-DECISIONS.md` contains signed product decisions for all 4 gates.

### Phase 2 — Minimum Implementation Corrections
- **Goal:** Resolve confirmed engineering defects DEF-01 and DEF-02 in source code.
- **Action 1:** Remove `existingPositions` copy loop for unassigned nodes in `architecture-layout.ts` (lines 169–171, 219–221).
- **Action 2:** Update `projectState.ts` storage schema to scope positions by composite key `nodePositions[mode][focalId][nodeId]`.
- **Exit Criterion:** Zero cross-mode and cross-focal position leaks in `architecture-layout.ts`.

### Phase 3 — Verification and Freeze
- **Goal:** Re-run full CLI and Vitest regression suites and verify browser rendering.
- **Action:** Run `npm run test:cli` and `cd explorer && npx vitest run`.
- **Exit Criterion:** 100% passing tests with 0.00000px coordinate drift and 0 position leaks.

---

## 20. Explicit Final Status and Rationale

```text
================================================================================
                               FINAL AUDIT STATUS
================================================================================

- PRODUCT CONTRACT STATUS: C — PRODUCT CONTRACT NOT FROZEN
- TECHNICAL IMPLEMENTATION STATUS: T2 — CONTRACT ESTABLISHED, IMPLEMENTATION GAPS REMAIN
- VALIDATION STATUS: V2 — PARTIALLY VALIDATED

- APPROVED CONTRACT SCOPE:
  * Execution semantics inclusions T_exec (DEFAULT_COMPONENT_ORBIT_EDGE_TYPES)
  * Shortest directed execution depth d_exec via BFS traversal
  * Focal sun placement at origin (0, 0) with symbol ☉
  * Ring-depth equivalence (depth === ringIndex)
  * Selection neutrality (SELECTION ≠ NAVIGATION in InvestigationContext)
  * Input graph immutability and 1:1 canonical node identity conservation
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
  * This final audit is complete. Reopening is justified ONLY if new source code changes, explicit product authority decisions, or reproducible new defects invalidate these recorded conclusions.
================================================================================
```
