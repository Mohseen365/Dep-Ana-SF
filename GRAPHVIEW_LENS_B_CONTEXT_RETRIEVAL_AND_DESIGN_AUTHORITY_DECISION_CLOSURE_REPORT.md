# GRAPHVIEW LENS B CONTEXT-RETRIEVAL AND DESIGN-AUTHORITY DECISION CLOSURE REPORT

## 1. Executive Verdict

**TECHNICAL VERDICT:** `B — CONTRACT FROZEN WITH EXPLICIT IMPLEMENTATION GAPS`
**PRODUCT CONTRACT STATUS:** `DECISION C — CONTRACT NOT FROZEN`

### Executive Rationale
This context-retrieval-driven design-authority reconciliation evaluated whether the four recurring Lens B design questions (Shared SObject representation, Angular sector semantics, Unreachable-node visibility, and Drag position persistence lifecycle) are already answered by authoritative context, approved requirements, or established design records.

1. **Engineering Correctness Invariants (FROZEN BY AUTHORITY):** Execution semantics ($T_{\text{exec}}$, $d_{\text{exec}}$, BFS algebra, 19-relationship taxonomy, focal sun centering, selection neutrality, and AABB body non-overlap predicate $d_{\text{chord}} \ge \sqrt{W_{\text{eff}}^2 + H_{\text{eff}}^2}$) are 100% closed facts supported by repository implementation and unit test suites.
2. **Repository Defects Isolated:** The position contamination bug in `architecture-layout.ts` (lines 169–171, 219–221) copying `existingPositions` into layout output and the flat storage key in `projectState.ts` (line 47) are technical implementation bugs, NOT product specification ambiguities.
3. **Unresolved Product Decisions:** No authoritative requirement in `context/` or baseline contracts specifies the user-facing choices for Shared SObject representation (Gate A), Angular domain sectors (Gate B), Unreachable node presentation (Gate C), or Drag position persistence lifetime (Gate D).

---

## 2. Context-Retrieval Manifest

All required predecessor audit reports and current `context/` baseline files were retrieved, re-read, and reconciled:

| # | Filename / Artifact | Retrieval Status | Scope & Authority |
|---|---|---|---|
| 1 | `GRAPHVIEW_LENS_B_FINAL_EVIDENCE_GAP_CLOSURE_AND_PRODUCT_DECISION_PACKET.md` | **RETRIEVED** | Evidence gap closure & product decision packet. |
| 2 | `GRAPHVIEW_LENS_B_AUDIT_REPORT_CONTRADICTION_AND_CONTRACT_INTEGRITY_VERIFICATION.md` | **RETRIEVED** | Second-order contradiction & verification audit. |
| 3 | `GRAPHVIEW_LENS_B_FUNDAMENTAL_PRINCIPLES_DECISION_CLOSURE_AND_MINIMUM_FROZEN_CONTRACT_AUDIT.md` | **RETRIEVED** | Primary contract freeze audit report. |
| 4 | `GRAPHVIEW_LENS_B_FINAL_DESIGN_AUTHORITY_AND_CONTRACT_FREEZE_AUDIT_REPORT.md` | **RETRIEVED** | Predecessor design authority report. |
| 5 | `GRAPHVIEW_LENS_B_DESIGN_NEUTRAL_GEOMETRY_CONTRACT_FINAL_CLOSURE_AUDIT_REPORT.md` | **RETRIEVED** | Design-neutral geometry contract report. |
| 6 | `GRAPHVIEW_LENS_B_FINAL_GEOMETRY_CONTRACT_CLOSURE_AUDIT_REPORT.md` | **RETRIEVED** | Geometry contract closure report. |
| 7 | `context/CURRENT-ARCHITECTURE.md` | **RETRIEVED** | Current workspace & domain architecture. |
| 8 | `context/CURRENT-CONTRACTS.md` | **RETRIEVED** | Current contract specifications. |
| 9 | `context/CURRENT-DECISIONS.md` | **RETRIEVED** | Historical & current decision records. |
| 10 | `context/CURRENT-IMPLEMENTATION.md` | **RETRIEVED** | Implementation mapping across `explorer/src/`. |
| 11 | `context/CURRENT-TESTS.md` | **RETRIEVED** | Test baseline across CLI & Vitest suites. |

---

## 3. Authority Hierarchy and Conflict Resolution

All claims are evaluated according to the strict 7-tier authority hierarchy:

1. **Tier 1: Explicit User-Approved Product Decision / Requirement:** Supreme product authority.
2. **Tier 2: Approved Architecture Decision Record / Frozen Contract:** Authoritative architectural contracts.
3. **Tier 3: Verified Semantic Contract established by Prior Audits:** Closed execution semantics ($T_{\text{exec}}, d_{\text{exec}}$).
4. **Tier 4: Current Repository Implementation:** Code truth in `explorer/src/`.
5. **Tier 5: Tests and Reproducible Runtime Evidence:** Vitest unit test suites & CLI scripts.
6. **Tier 6: Historical Audit Interpretations:** Analysis from earlier reports.
7. **Tier 7: Recommendations and Hypothetical Designs:** Unapproved proposals.

### Conflict Resolution Principle
Existing code defaults (Tier 4) and historical audit recommendations (Tier 7) cannot override missing product authority (Tier 1). Where Tier 1 is silent, the decision remains `UNRESOLVED PRODUCT DECISION`.

---

## 4. Shared SObject Decision Findings (Gate A)

### Canonical Case Reconciliation
```
ServiceA ──► Account
ServiceB ──► Account
ServiceC ──► Account
```

### Context & Evidence Analysis
1. `ExplorerDataSchema` contains `Object:Account` as a single canonical graph entity.
2. Single-parent attachment in `satellites.ts` (`findParentObjectId`) attaches `Account` to `ServiceA` purely for local satellite grid layout.
3. No approved product decision in `context/CURRENT-DECISIONS.md` authorizes attaching shared enterprise entities to an arbitrary primary host component.
4. **Viable Models:**
   - **A1 (One shared node with multiple relationships):** Preserves 1:1 identity; may introduce cross-ring edges.
   - **A2 (One shared node with designated non-semantic anchor):** Preserves 1:1 identity; requires "SHARED" badge indicator.
   - **A3 (Relationship-specific visual proxies):** Improves local cluster layout; duplicates visual node representations.

**Gate A Verdict:** `UNRESOLVED PRODUCT DECISION`. Requires product authority choice among Models A1–A3.

---

## 5. Angular-Semantics Decision Findings (Gate B)

### Context & Evidence Analysis
1. In `component-orbit-layout.ts` (lines 193–194), polar angles are calculated via uniform linear step $\Delta\theta = 2\pi / N$ after sorting nodes alphabetically by `nodeId`.
2. This is **Model B1 (Geometry-Only Uniform Packing)**.
3. Historical Report 1 proposed Model B2 (Semantic Sectors), but no approved product requirement in `context/CURRENT-DECISIONS.md` mandates domain sector grouping in Lens B.
4. Angular semantics remain independent of radial depth $d_{\text{exec}} = \text{Ring Index}$ (which is frozen as `FACT`).

**Gate B Verdict:** `UNRESOLVED PRODUCT DECISION`. Requires product authority choice between Model B1 (Packing) and Model B2 (Domain Sectors).

---

## 6. Unreachable-Node Presentation Decision Findings (Gate C)

### Context & Evidence Analysis
1. `unreachableNodeIds` in `component-orbit-adapter.ts` (lines 280–285) contains depth-truncated nodes ($d > 7$), disconnected graph components, and relationship-filtered nodes.
2. In `architecture-layout.ts` (lines 169–171, 219–221), `existingPositions` merges stale coordinates into output for all unassigned nodes.
3. **Viable Policies:**
   - **C1 (Focal-subgraph-only view):** Hide unreachable nodes from focal view (`display: none`).
   - **C2 (Separate treatment for truncation vs disconnection):** Distinguish depth-truncated from disconnected nodes.
   - **C3 (Complete inventory with peripheral shell):** Render unreachable nodes on an outer ring ($R_{\text{max}} + \Delta R$).

**Gate C Verdict:** `UNRESOLVED PRODUCT DECISION`. Requires product authority choice among Policies C1–C3.

---

## 7. Drag-Position Lifecycle Decision Findings (Gate D)

### Context & Evidence Analysis
1. `projectState.ts` (line 47) stores positions in `graphLayout.nodePositions` keyed solely by `nodeId`.
2. Single-key storage allows user drags in one view/focal context to contaminate other views.
3. **Viable Behavioral Isolation Policies:**
   - **D1 (Session-scoped focal isolation):** Drags apply only to current focal session.
   - **D2 (Layout-mode-scoped persistence):** `nodePositions[mode][nodeId]`.
   - **D3 (Layout-mode-and-focal-scoped persistence):** `nodePositions[mode][focalId][nodeId]`.
   - **D4 (Explicit global-position semantics):** Intentionally shared across views.

**Gate D Verdict:** `UNRESOLVED PRODUCT DECISION`. Requires product authority choice among Policies D1–D4.

---

## 8. Engineering Invariants Independent of Product Decisions

The following technical invariants are established as repository facts and may proceed independently of product authority choices:

1. **Canonical Identity:** 1:1 node ID conservation (`component-orbit-adapter.ts` line 347).
2. **Traversal Algebra:** Pure BFS traversal over authorized edge types (`graph-depth.ts`).
3. **Execution Depth:** $d_{\text{exec}} = 0$ for focal sun, $d_{\text{exec}} = \text{depth}$ for rings.
4. **Deterministic Sorting:** Input nodes sorted by `nodeId.localeCompare()` prior to angle calculation.
5. **Multi-Track Expansion:** Dynamic track expansion satisfying chord clearance $d_{\text{chord}} \ge 188.68\text{px}$.
6. **Selection Neutrality:** Transient selection owned exclusively in `InvestigationContext`.
7. **Pure Function Constraint:** Layout engine must NOT inherit stale positions across layout modes or focal contexts (`architecture-layout.ts` defect isolation).

---

## 9. Decision-Authority Matrix

| Decision / Issue | Existing Authoritative Answer? | Evidence / Source | Status | Decision Owner | Minimum Next Action |
|---|---|---|---|---|---|
| **Execution Semantics ($T_{\text{exec}}, d_{\text{exec}}$)** | **YES** | `graph-depth.ts`, BFS algebra | **FROZEN BY AUTHORITY** | Architecture Authority | Maintain test assertions. |
| **Focal Sun Origin (0,0)** | **YES** | `component-orbit-layout.ts` line 140 | **FROZEN BY AUTHORITY** | Architecture Authority | Maintain origin placement. |
| **Position Contamination Defect** | **NO** (Implementation bug) | `architecture-layout.ts` lines 169–171 | **ENGINEERING REQUIREMENT ESTABLISHED** | Engineering Lead | Remove `existingPositions` merge for unassigned nodes. |
| **Shared SObject Representation** | **NO** | `context/CURRENT-DECISIONS.md` | **UNRESOLVED PRODUCT DECISION** | Product/Design Authority | Choose visual representation Model A1, A2, or A3. |
| **Angular Placement Semantics** | **NO** | `component-orbit-layout.ts` line 193 | **UNRESOLVED PRODUCT DECISION** | Product/Design Authority | Choose Model B1 (Packing) or Model B2 (Sectors). |
| **Unreachable Node Visibility** | **NO** | `component-orbit-adapter.ts` line 280 | **UNRESOLVED PRODUCT DECISION** | Product/Design Authority | Choose Policy C1 (Hide), C2 (Differentiate), or C3 (Shell). |
| **Drag Persistence Scope** | **NO** | `projectState.ts` line 47 | **UNRESOLVED PRODUCT DECISION** | Product/Design Authority | Choose Persistence Policy D1, D2, D3, or D4. |

---

## 10. Minimum Frozen Contract

### Layers 1–3 (FROZEN BY AUTHORITY)
- **1. Identity & Traversal:** Node identity conserved 1:1; BFS algebra over `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES`.
- **2. Radial Depth:** Depth $d = 0$ at origin $(0,0)$; depth $d = N$ placed on radial ring $N$.
- **3. Geometry Safety:** AABB non-overlap $d_{\text{chord}} \ge \sqrt{W_{\text{eff}}^2 + H_{\text{eff}}^2}$ guaranteed by dynamic chord radius formula $R \ge d_{\text{chord}} / (2\sin(\pi/N))$.
- **4. Selection Neutrality:** Selection state in `InvestigationContext` zero position effect.

### Layer 4 & 5 (UNFROZEN PRODUCT PORTION)
- Requires explicit product choices on Shared SObjects (Gate A), Angular sectors (Gate B), Unreachable node visibility (Gate C), and Drag scope (Gate D).

---

## 11. Remaining Decisions Requiring Explicit Approval

Product / Design Authority must approve answers to these 4 questions:

1. **Shared SObjects:** Model A1 (Shared Node Multi-Tether) vs A2 (Designated Host with Badge) vs A3 (Visual Proxy Clones).
2. **Angular Semantics:** Model B1 (Geometry Uniform Packing) vs Model B2 (Domain Sectors).
3. **Unreachable Visibility:** Policy C1 (Hide) vs C2 (Differentiate Truncated/Disconnected) vs C3 (Outer Peripheral Shell).
4. **Drag Persistence Scope:** Policy D1 (Session Focal) vs D2 (Mode Scoped) vs D3 (Composite Mode+Focal Scoped) vs D4 (Global Override).

---

## 12. Final Verdict

### **FINAL DECISION: `DECISION C — CONTRACT NOT FROZEN`**

**Justification:** While all engineering correctness invariants and position authority defects are 100% established and ready for implementation fixes, Lens B product contracts CANNOT be declared frozen until Product/Design Authority provides explicit answers to the 4 open decision packet questions.

---

## 13. Evidence Index

- `explorer/src/lib/architecture-layout.ts` (lines 169–171, 219–221)
- `explorer/src/lib/adapters/component-orbit-adapter.ts` (lines 139–155, 280–285)
- `explorer/src/lib/layout/component-orbit-layout.ts` (lines 99–120, 180–194)
- `explorer/src/lib/projectState.ts` (lines 42–49, 205)
- `context/CURRENT-ARCHITECTURE.md`, `context/CURRENT-CONTRACTS.md`, `context/CURRENT-DECISIONS.md`
