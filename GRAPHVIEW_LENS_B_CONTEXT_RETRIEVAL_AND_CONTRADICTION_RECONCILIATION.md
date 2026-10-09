# GRAPHVIEW LENS B — CONTEXT RETRIEVAL AND CONTRADICTION RECONCILIATION

## 1. Executive Verdict

**PRODUCT CONTRACT STATUS:** `C — PRODUCT CONTRACT NOT FROZEN`
**TECHNICAL IMPLEMENTATION STATUS:** `T2 — CONTRACT ESTABLISHED, IMPLEMENTATION GAPS REMAIN`
**VALIDATION STATUS:** `V2 — PARTIALLY VALIDATED`

### Executive Summary

This report completes the read-only context retrieval, contradiction reconciliation, and implementation-boundary audit for **GraphView Lens B — Component Orbit / Component Constellation**.

1. **Reconciliation of Reported Defects:**
   - **DEF-01 Classification (`MIXED / AUTHORIZED_INDEPENDENT_FIX`):** The stale position merge loop in `architecture-layout.ts` (lines 169–171, 219–221) violates Position Authority Level 4 pure function constraints (`CURRENT-CONTRACTS.md` Section 3). Removing the loop to ensure layout calculation output contains ONLY projected focal nodes is an **authorized independent technical fix**. However, Cytoscape DOM canvas element removal for unreachable nodes remains dependent on Gate C product approval.
   - **DEF-02 Classification (`CONFIRMED_BUT_PRODUCT_DECISION_DEPENDENT`):** Storage of dragged positions in `projectState.ts` (line 47) using flat keys (`nodePositions[nodeId]`) allows cross-context position leakage. However, updating storage schema and migrating legacy flat positions depends on Gate D product authority selection (Policy D1, D2, or D3) and state migration policy selection.
2. **Reconciliation of Gate Decisions:** Gates A, B, C, and D are classified as **`PROPOSED` / `UNRESOLVED`**. Zero explicit decision records exist in `context/CURRENT-DECISIONS.md` approving user-facing choices. Predecessor audit recommendations do NOT constitute product authority approvals.
3. **Reconciliation of Geometry Claims:** Reconciled $120 \times 60$ node dimensions versus $160 \times 100$ effective bounds and $188.68\text{px}$ chord clearance threshold ($d_{\text{chord}} = \sqrt{160^2 + 100^2}$). Confirmed that AABB non-overlap is mathematically established for fixed $120 \times 60$ node bodies, but dynamic text label wrapping remains DOM-dependent.
4. **Implementation Boundary:** Stage 1 independent technical fixes (removing L219 merge loop in `architecture-layout.ts`) may proceed once code review is complete. All product-feature UI changes (Gates A–D) remain strictly **BLOCKED** pending product authority approval in `context/CURRENT-DECISIONS.md`.

---

## 2. Current Repository and Commit Identity

- **Git Commit SHA:** `00cc29803313dec67766d938cc8d46029bfabb96`
- **Working-Tree Status:** Five audit report deliverables added (`GRAPHVIEW_LENS_B_FINAL_AUTHORITATIVE_CONTRACT_AND_REPOSITORY_TRUTH_AUDIT.md`, `GRAPHVIEW_LENS_B_FINAL_CONTRACT_DECISION_READINESS_AND_MINIMUM_CORRECTION_REPORT.md`, `GRAPHVIEW_LENS_B_PRODUCT_AUTHORITY_AND_IMPLEMENTATION_BOUNDARY.md`, `GRAPHVIEW_LENS_B_MINIMUM_CORRECTION_PLAN.md`, `GRAPHVIEW_LENS_B_PRODUCT_DECISION_PACKET.md`). Zero production application source code (`explorer/src/`) or test files modified.
- **Verification Environment:** Node.js v22.13.0, Linux x86_64, React 19, Cytoscape 3.30, Vitest 5.0.3.

---

## 3. Context Retrieval Manifest

All required baseline project records and predecessor reports were retrieved, inspected, and reconciled:

| Source Artifact | Path / Location | Inspection Status | Authority Level | Key Finding / Finding Reference | Evidence Limitation |
|---|---|---|---|---|---|
| `context/CURRENT-ARCHITECTURE.md` | `context/CURRENT-ARCHITECTURE.md` | Retrieved & Inspected | Tier 2 Architecture Spec | Section 3 defines single-owner state authority and Level 1–5 Position Authority | Silent on user Gate choices |
| `context/CURRENT-CONTRACTS.md` | `context/CURRENT-CONTRACTS.md` | Retrieved & Inspected | Tier 2 Technical Contract | Section 2 specifies Orbit $160\times 100$ AABB bounds & pure calculation constraints | Technical spec |
| `context/CURRENT-DECISIONS.md` | `context/CURRENT-DECISIONS.md` | Retrieved & Inspected | Tier 1 Decision Log | Decisions 1–7 (State authority, Worker offloading, Orbit layout) | **0 approved records for Gates A–D** |
| `context/CURRENT-IMPLEMENTATION.md` | `context/CURRENT-IMPLEMENTATION.md` | Retrieved & Inspected | Tier 4 Implementation Map | Section 1 (Source map), Section 3 (Data Flow) | Implementation map |
| `context/CURRENT-TESTS.md` | `context/CURRENT-TESTS.md` | Retrieved & Inspected | Tier 5 Test Baseline | Section 1 (31 CLI test suites), Section 2 (Vitest suites) | Test baseline |
| `context/PROJECT-OVERVIEW.md` | `context/PROJECT-OVERVIEW.md` | Retrieved & Inspected | Tier 2 System Overview | Overview of Explorer workspace and analysis subsystem | Overview only |
| `context/SOURCE-REGISTER.md` | `context/SOURCE-REGISTER.md` | Retrieved & Inspected | Tier 2 Source Map | Subsystem routing and authority matrix | Routing map |
| `context/SUPERSESSION-MAP.md` | `context/SUPERSESSION-MAP.md` | Retrieved & Inspected | Tier 2 Milestone Map | Historical milestone supersession map | Historical map |
| `GRAPHVIEW_LENS_B_PRODUCT_AUTHORITY_AND_IMPLEMENTATION_BOUNDARY.md` | Root | Retrieved & Inspected | Tier 6 Audit Deliverable | Documented implementation boundary & defect verification matrix | Audit report |
| `GRAPHVIEW_LENS_B_MINIMUM_CORRECTION_PLAN.md` | Root | Retrieved & Inspected | Tier 6 Audit Deliverable | Proposed 3-step correction sequence for DEF-01 and DEF-02 | Audit report |
| `GRAPHVIEW_LENS_B_PRODUCT_DECISION_PACKET.md` | Root | Retrieved & Inspected | Tier 6 Audit Deliverable | Authorization packages and approval forms for Gates A–D | Audit report |
| `GRAPHVIEW_LENS_B_FINAL_CONTRACT_DECISION_READINESS_AND_MINIMUM_CORRECTION_REPORT.md` | Root | Retrieved & Inspected | Tier 6 Audit Deliverable | Geometry resolution & 12-scenario Gate D lifecycle | Audit report |
| `GRAPHVIEW_LENS_B_FINAL_AUTHORITATIVE_CONTRACT_AND_REPOSITORY_TRUTH_AUDIT.md` | Root | Retrieved & Inspected | Tier 6 Audit Deliverable | 14-claim historical reconciliation & decision register | Audit report |

---

## 4. Source-Backed Fact Ledger

Every material assertion across current source code and project documentation is classified and supported by verified source lines:

| Claim ID | Classification | Source File Path | Line / Symbol | Direct Source Evidence | Implementation Boundary Implication |
|---|---|---|---|---|---|
| **FCT-01** | `FACT` | `architecture-layout.ts` | L86–87 | `nodeWidth = 120, nodeHeight = 60` default options | Base rectangular node body bounds |
| **FCT-02** | `FACT` | `architecture-layout.ts` | L169–171, L219–221 | `for (const [id, pos] of Object.entries(existingPositions)) if (!(id in orbitPositions)) orbitPositions[id] = pos;` | Merges stale positions for unassigned nodes (**DEF-01**) |
| **FCT-03** | `FACT` | `projectState.ts` | L47 | `nodePositions: Record<string, { x: number; y: number }>;` | Flat position storage without mode/focal scope (**DEF-02**) |
| **FCT-04** | `FACT` | `component-orbit-adapter.ts` | L105 | `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` set defines authorized execution edges | Traversal algebra filter |
| **FCT-05** | `FACT` | `component-orbit-adapter.ts` | L146–155 | `nodes.sort((a, b) => a.id.localeCompare(b.id))` pre-sort | 100% input-order determinism |
| **FCT-06** | `FACT` | `component-orbit-adapter.ts` | L280–285 | `unreachableNodeIds = nodes.filter(id => !reachableSet.has(id))` | Lists unreachable nodes |
| **FCT-07** | `FACT` | `component-orbit-layout.ts` | L66–75 | `effWidth = (120+120)/2 + 40 = 160`, `effHeight = (60+60)/2 + 40 = 100` | Effective AABB collision bounds |
| **FCT-08** | `FACT` | `component-orbit-layout.ts` | L180–190 | `reqRadius = requiredChordSeparation / (2 * Math.sin(Math.PI / n_k))` | Dynamic chord separation formula |
| **FCT-09** | `FACT` | `component-orbit-layout.ts` | L193–194 | `angle = trackAngularOffset + nodeIdxOnTrack * (2 * Math.PI / n_k)` | Geometry-only uniform angular packing |
| **FCT-10** | `FACT` | `satellites.ts` | L466 | `findParentObjectId` iterates over incident edges and picks 1st matching parent | Parent assignment for collision grid |
| **FCT-11** | `FACT` | `ExplorerDataSchema` | L110 | `nodes`, `edges`, `cycles`, `unresolvedReferences`, `impactSummaries` | Zero call-volume/invocation fields |
| **FCT-12** | `FACT` | `context/CURRENT-DECISIONS.md` | Entire file | Decisions 1–7 (State authority, Worker offloading, Orbit) | Zero approved records for Gates A–D |

---

## 5. Contradictions Between Latest Reports Reconciled

Reconciled apparent contradictions across predecessor deliverables:

| Contradiction Subject | Deliverable A/B Claim | Predecessor Claim | Source Truth & Reconciliation | Final Disposition |
|---|---|---|---|---|
| **DEF-01 Authorization Status** | Deliverable A listed DEF-01 fix as "Authorized Technical Work". | Deliverable B listed precondition "Approved product choices required before implementation". | Removing L219 stale merge loop in `architecture-layout.ts` is an **authorized independent fix** under Level 4 Position Authority (`CURRENT-CONTRACTS.md`). Cytoscape DOM element removal for unreachable nodes remains **Gate C dependent**. | **RESOLVED:** Split into independent L219 code fix (Stage 1) and Gate C DOM rendering filter (Stage 2). |
| **Project Identity in Drag State Schema** | Predecessor suggested `nodePositions[proj][mode][focalId][nodeId]`. | `projectState.ts` is already loaded via `loadProjectState(projectId)` (`localStorage.getItem('explorer.projectState.' + projectId)`). | `projectState.ts` is **already project-scoped at the top-level localStorage key**. Adding `projectId` inside `GraphLayoutState` is redundant. | **RESOLVED:** Correct storage schema is `nodePositions[layoutMode][focalNodeId][nodeId]`. |
| **Shared SObject Primary Consumer Rule** | Predecessor proposed "highest call volume" rule. | `ExplorerDataSchema` contains zero call volume fields. | `ExplorerDataSchema` lacks invocation frequency data. Correct non-semantic anchor uses available schema metrics (`metrics.fanIn DESC`, `metrics.coupling DESC`, `nodeId ASC`). | **RESOLVED:** Replaced unsupported call-volume rule with deterministic schema metrics anchor policy. |
| **Gate C Omission vs DOM Removal** | Predecessor conflated layout output omission with DOM element deletion. | Cytoscape elements are created via `buildGraphElements(nodes, edges)`. | Omitting nodes from `orbitPositions` map does not automatically delete Cytoscape DOM elements unless `GraphView.tsx` filters `nodes` against `projectedNodeIds`. | **RESOLVED:** Disentangled layout output map omission from Cytoscape DOM element removal. |

---

## 6. DEF-01 Authorization Determination

- **Classification:** `MIXED / AUTHORIZED_INDEPENDENT_FIX`
- **Source Location:** `explorer/src/lib/architecture-layout.ts` (lines 169–171, 219–221)
- **Violation:** Position Authority Level 4 pure calculation constraint (`context/CURRENT-CONTRACTS.md` Section 3). `computeArchitectureLayoutWithMetadata` forcibly copies `existingPositions[id]` for any `id` absent from `orbitOutput.positions`.
- **Authorized Portion (Stage 1 Independent Fix):** Deleting lines 169–171 and 219–221 in `architecture-layout.ts` ensures layout calculation returns coordinates strictly for projected focal nodes. This fix violates no product policies and restores Position Authority Level 4 compliance.
- **Blocked Portion (Stage 2 Product-Dependent Change):** Modifying `GraphView.tsx` or `buildGraphElements` to permanently delete unprojected Cytoscape DOM elements remains **BLOCKED** until Gate C product approval (Policy C1 vs C2 vs C3) is recorded in `context/CURRENT-DECISIONS.md`.

---

## 7. DEF-02 State and Migration Determination

- **Classification:** `CONFIRMED_BUT_PRODUCT_DECISION_DEPENDENT`
- **Source Location:** `explorer/src/lib/projectState.ts` (line 47)
- **Violation:** State Isolation Invariant (`context/CURRENT-ARCHITECTURE.md` Section 3). Flat storage key `nodePositions[nodeId]` allows user drags in one focal view to pollute node positions in other views.
- **Project Boundary Truth:** `projectState.ts` is **already project-scoped** via top-level localStorage key `explorer.projectState.${projectId}` (`loadProjectState` line 185).
- **Correct Composite Key Structure:**
  $$\text{StorageKey} = \text{nodePositions}[\text{layoutMode}][\text{focalNodeId} \mid \text{'global'}][\text{nodeId}]$$
- **Legacy Migration Policy Evaluation:**

| Policy | Description | Cross-Context Contamination Risk | User Edit Loss Risk | Backward Compatibility | Final Determination |
|---|---|---|---|---|---|
| **M1: Proven-Context Migration** | Migrate legacy flat entries only if original mode/focal can be established from stored metadata | **Zero** | Low | High | **RECOMMENDED DEFAULT** |
| **M2: Compatibility Quarantine** | Retain legacy flat entries in `legacyNodePositions` compatibility map without applying automatically | **Zero** | Zero (Preserved) | **100%** | **RECOMMENDED DEFAULT** |
| **M3: Explicit Legacy Fallback** | Apply legacy entries as Level 2 fallback only when no composite entry exists | High (Leaks flat positions) | Zero | High | Rejected (Reintroduces contamination) |
| **M4: Reset Legacy Overrides** | Discard flat legacy custom positions on load | Zero | High (Loss of edits) | Low | Rejected (Loss of user edits) |

- **State Migration Determination:** Combine **M1 & M2**: Migrate flat legacy positions into `legacyNodePositions` compatibility field, initializing `nodePositions.hierarchical.global = legacyNodePositions`. This guarantees **100% backward compatibility** and **zero cross-focal position contamination**.

---

## 8. Gate A–D Authority Matrix

| Gate | User-Visible Choice | Current Code Fact | Predecessor Recommendation | Approved Decision Record? | Decision Status | Implementation Status |
|---|---|---|---|---|---|---|
| **Gate A** | Shared SObject Representation | `satellites.ts` L466 attaches SObject to 1st parent in Map iteration | Model A2 (Single Node + SHARED Badge) | **NONE** in `CURRENT-DECISIONS.md` | `PROPOSED` / `UNRESOLVED` | **BLOCKED** |
| **Gate B** | Angular Placement Semantics | `component-orbit-layout.ts` L193 uniform linear angle step | Model B1 (Geometry Uniform Packing) | **NONE** in `CURRENT-DECISIONS.md` | `PROPOSED` / `UNRESOLVED` | **BLOCKED** |
| **Gate C** | Excluded Node Visibility | `architecture-layout.ts` L219 stale position merge loop | Policy C1 (Hide Unreachable Nodes) | **NONE** in `CURRENT-DECISIONS.md` | `PROPOSED` / `UNRESOLVED` | **BLOCKED** |
| **Gate D** | Drag Position Scope | `projectState.ts` L47 flat `nodePositions[nodeId]` | Policy D3 (Composite Scoped Persistence) | **NONE** in `CURRENT-DECISIONS.md` | `PROPOSED` / `UNRESOLVED` | **BLOCKED** |

---

## 9. Geometry Claim Corrections

| Claim Subject | Layout Calculation Dimension | Effective Collision Envelope | Cytoscape Rendered Dimension | Proof / Status | Scope / Limitation |
|---|---|---|---|---|---|
| **Node Body Dimensions** | $W = 120\text{px}, H = 60\text{px}$ (`architecture-layout.ts` L86) | $W_{\text{eff}} = 160\text{px}, H_{\text{eff}} = 100\text{px}$ | Shape $50\text{px} \times 50\text{px}$ (`graph-style.ts` L86) | **SUPPORTED FACT** | $120 \times 60$ is base body; $160 \times 100$ includes $40\text{px}$ gap |
| **Diagonal Clearance** | $d_{\text{chord}} = \sqrt{160^2 + 100^2} \approx 188.68\text{px}$ | $d_{\text{chord}} = 188.68\text{px}$ | N/A | **SUPPORTED FACT** | Minimum Cartesian diagonal threshold |
| **Dynamic Track Radius** | $R \ge d_{\text{chord}} / (2\sin(\pi/n_k))$ | Checked in `component-orbit-layout.ts` L185 | Verified in `orbit-layout.test.ts` L110 | **SUPPORTED FACT** | Guarantees non-overlap for equal rectangular bodies |
| **Multiline Text Label Clearance** | Text max width $120\text{px}$ | Text bounds $W_{\text{label}} \times H_{\text{label}}$ | `text-max-width: '120px'`, `text-wrap: 'wrap'` | **CONDITIONAL / UNVERIFIED** | DOM text measuring depends on dynamic browser font canvas |

---

## 10. Test Evidence and Targeted Gaps

### Executed Non-Destructive Test Evidence

| Test Suite | Command | Exit Status | Passing Count | Relevant Coverage Scope |
|---|---|---|---|---|
| **CLI Integration Suite** | `npm run test:cli` | `0` | **31/31 Suites Pass** | Full static analysis CLI pipeline |
| **Orbit Polar Layout Math** | `npx vitest run src/lib/orbit-layout.test.ts` | `0` | **12/12 Tests Pass** | Polar coordinates, water-filling, AABB clearance |
| **Component Orbit Adapter** | `npx vitest run src/lib/adapters/component-orbit-adapter.test.ts` | `0` | **10/10 Tests Pass** | BFS traversal, role symbols (☉, ◎, ◉, ○), determinism |
| **Component Constellation Layout** | `npx vitest run src/lib/layout/component-constellation-layout.test.ts` | `0` | **10/10 Tests Pass** | Multi-sun constellation layout math |
| **Static Constellation Projection** | `npx vitest run src/test/static-constellation-projection.test.ts` | `0` | **8/8 Tests Pass** | Static Mode element projection filtering |
| **State Authority & Routing** | `npx vitest run src/test/Phase2FA_CoreArchitecture.test.tsx` | `0` | **12/12 Tests Pass** | Single state authority, routing, selection neutrality |

### Targeted Test Gaps Identified
1. **Gap 1:** Test asserting `orbitPositions` map omits unassigned nodes when `architectureMode === 'orbit'`.
2. **Gap 2:** Test asserting user drag in Orbit mode for LWC A does not alter node coordinates in LWC B view under composite storage scoping.
3. **Gap 3:** Test asserting legacy flat `nodePositions` state parses safely into `legacyNodePositions` compatibility store without crashing.

---

## 11. Remaining Blockers

- **Blocker ID:** `BLK-DECISION-01`
- **Description:** Missing Product Authority selection for Decision Gates A, B, C, and D in `context/CURRENT-DECISIONS.md`.
- **Location:** `context/CURRENT-DECISIONS.md`
- **Resolution Path:** Record product decisions in `context/CURRENT-DECISIONS.md` using Deliverable C (`GRAPHVIEW_LENS_B_PRODUCT_DECISION_PACKET.md`).

---

## 12. Final Implementation Boundary

```text
================================================================================
                    FINAL RECONCILED IMPLEMENTATION BOUNDARY
================================================================================

[AUTHORIZED STAGE 1 WORK — INDEPENDENT TECHNICAL FIX]
------------------------------------------------------
1. Delete the `existingPositions` copy loops in `architecture-layout.ts`
   (lines 169–171, 219–221) to enforce Level 4 Position Authority pure function
   constraints for Orbit and Constellation layout calculation outputs.

[BLOCKED STAGE 2 WORK — REQUIRES PRODUCT APPROVAL IN CURRENT-DECISIONS.MD]
-------------------------------------------------------------------------
1. BLOCKED: Gate A SHARED badge UI and SObject anchor logic.
2. BLOCKED: Gate B domain sector angular offsets and sector guidelines.
3. BLOCKED: Gate C Cytoscape DOM element removal filtering in GraphView.tsx.
4. BLOCKED: Gate D composite drag position storage schema in projectState.ts.
================================================================================
```
