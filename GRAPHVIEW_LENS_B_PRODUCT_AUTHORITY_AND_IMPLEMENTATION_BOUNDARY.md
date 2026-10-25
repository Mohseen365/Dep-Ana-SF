# GRAPHVIEW LENS B — PRODUCT AUTHORITY AND IMPLEMENTATION BOUNDARY

## 1. Executive Verdict

**PRODUCT CONTRACT STATUS:** `C — PRODUCT CONTRACT NOT FROZEN`
**TECHNICAL IMPLEMENTATION STATUS:** `T2 — CONTRACT ESTABLISHED, IMPLEMENTATION GAPS REMAIN`
**VALIDATION STATUS:** `V2 — PARTIALLY VALIDATED`

### Executive Rationale

This report establishes the precise implementation boundary for **GraphView Lens B — Component Orbit / Component Constellation** by separating approved technical invariants from unapproved product choices and verified source code defects.

1. **Approval Authority Boundary:** Gates A, B, C, and D remain **UNAPPROVED** (classified as `PROPOSED` / `UNRESOLVED`). No explicit, attributable product decision in `context/CURRENT-DECISIONS.md` authorizes user-facing choices for Shared SObject representation (Gate A), Angular domain sectors (Gate B), Unreachable node visibility (Gate C), or Drag position persistence lifetime (Gate D). Predecessor audit recommendations do NOT constitute product approvals.
2. **Implementation Boundary:**
   - **Blocked Work:** Production code changes that implement specific product choices for Gates A, B, C, or D (e.g. adding SHARED badges, sector angular offsets, or complex storage schemas) are strictly **BLOCKED** until formal product authority selection is recorded.
   - **Authorized Engineering Corrections:** Technical defects that violate established Position Authority Level 4 pure function constraints or state isolation invariants (`DEF-01` position contamination loop in `architecture-layout.ts` lines 169–171, 219–221; `DEF-02` flat position keying in `projectState.ts` line 47) are verified in current source code and ready for minimal, backward-compatible correction once preconditions are satisfied.
3. **Closure Path:** Lens B contract freeze requires one concrete action: recording product decision selections for Gates A–D in `context/CURRENT-DECISIONS.md`, followed by minimal implementation of the verified technical corrections.

---

## 2. Current Commit and Working-Tree State

- **Exact Git Commit SHA:** `00cc29803313dec67766d938cc8d46029bfabb96`
- **Working-Tree State:** Uncommitted additions include predecessor audit deliverables `GRAPHVIEW_LENS_B_FINAL_AUTHORITATIVE_CONTRACT_AND_REPOSITORY_TRUTH_AUDIT.md` and `GRAPHVIEW_LENS_B_FINAL_CONTRACT_DECISION_READINESS_AND_MINIMUM_CORRECTION_REPORT.md`. Zero production source code (`explorer/src/`) or test files modified.
- **Verification Environment:** Node.js v22.13.0, Linux x86_64, React 19, Cytoscape 3.30, Vitest 5.0.3.

---

## 3. Context Sources Retrieved

All baseline context files and predecessor reports were retrieved and inspected in current checkout:

| File / Artifact | Location / Path | Availability | Version / Revision | Authority Level | Relevant Content | Limitations / Notes |
|---|---|---|---|---|---|---|
| `context/CURRENT-ARCHITECTURE.md` | `context/CURRENT-ARCHITECTURE.md` | Present | Reconstructed 2026-10-08 | Tier 2 Architecture Spec | Section 2 (18-mode taxonomy), Section 3 (State Authority) | Lacks user product approvals for Lens B Gates |
| `context/CURRENT-CONTRACTS.md` | `context/CURRENT-CONTRACTS.md` | Present | Reconstructed 2026-10-08 | Tier 2 Technical Contract | Section 2 (Orbit layout & $160\times 100$ AABB bounds) | Technical spec; silent on user Gate choices |
| `context/CURRENT-DECISIONS.md` | `context/CURRENT-DECISIONS.md` | Present | Reconstructed 2026-10-08 | Tier 1 Decision Log | Decisions 1–7 (State authority, Worker offloading, Orbit) | **0 approved records for Lens B Gates A–D** |
| `context/CURRENT-IMPLEMENTATION.md` | `context/CURRENT-IMPLEMENTATION.md` | Present | Reconstructed 2026-10-08 | Tier 4 Implementation Map | Section 1 (Source map), Section 3 (Data Flow) | Code behavior is not proof of product intent |
| `context/CURRENT-TESTS.md` | `context/CURRENT-TESTS.md` | Present | Reconstructed 2026-10-08 | Tier 5 Test Baseline | Section 1 (31 CLI test suites), Section 2 (Vitest) | Tests verify tested code, not unwritten specs |
| `GRAPHVIEW_LENS_B_FINAL_CONTRACT_DECISION_READINESS_AND_MINIMUM_CORRECTION_REPORT.md` | Root | Present | 2026-10-08 | Tier 6 Audit Report | Reconciled claims, 120x60 vs 160x100 math, 12-scenario Gate D | Predecessor report |
| `GRAPHVIEW_LENS_B_FINAL_AUTHORITATIVE_CONTRACT_AND_REPOSITORY_TRUTH_AUDIT.md` | Root | Present | 2026-10-08 | Tier 6 Audit Report | Predecessor authoritative audit report | Predecessor report |

---

## 4. Current Repository Evidence

Source code verification across `explorer/src/`:

1. **Unified Layout Dispatcher (`explorer/src/lib/architecture-layout.ts`):**
   - Lines 86–87: Default options `nodeWidth = 120, nodeHeight = 60`.
   - Lines 169–171 (Constellation) & 219–221 (Orbit):
     ```typescript
     for (const [id, pos] of Object.entries(existingPositions)) {
       if (pos && !(id in orbitOutput.positions)) {
         orbitPositions[id] = { x: pos.x, y: pos.y };
       }
     }
     ```
     *Verified Fact:* Merges stale coordinates from `existingPositions` into output map for unassigned nodes.

2. **Project UI State Storage (`explorer/src/lib/projectState.ts`):**
   - Line 47:
     ```typescript
     export interface GraphLayoutState {
       nodePositions: Record<string, { x: number; y: number }>;
     }
     ```
     *Verified Fact:* Stores node positions in flat `nodePositions[nodeId]` map without `layoutMode` or `focalNodeId` scope.

3. **Component Orbit Adapter (`explorer/src/lib/adapters/component-orbit-adapter.ts`):**
   - Line 105: `DEFAULT_COMPONENT_ORBIT_EDGE_TYPES` set defines authorized execution relationship types.
   - Lines 146–155: Deterministic pre-sorting via `localeCompare()` on nodes and edges.
   - Lines 280–285: `unreachableNodeIds` filters nodes absent from BFS depth map.

4. **Component Orbit Geometry Engine (`explorer/src/lib/layout/component-orbit-layout.ts`):**
   - Lines 66–75: `getEffectiveAABBGap` computes effective collision bounds $W_{\text{eff}} = 120 + 40 = 160\text{px}$, $H_{\text{eff}} = 60 + 40 = 100\text{px}$.
   - Lines 180–190: Dynamic track radius formula $R_{\text{track}} = d_{\text{chord}} / (2\sin(\pi/n_k))$ where $d_{\text{chord}} = \sqrt{160^2 + 100^2} \approx 188.68\text{px}$.
   - Lines 193–194: Angular assignment via uniform step $\Delta\theta = 2\pi / n_k$.

5. **Cytoscape Canvas Component (`explorer/src/components/GraphView.tsx`):**
   - Lines 804–840: Element synchronization rebuilds Cytoscape elements via `buildGraphElements(nodes, edges)`.
   - Passes `nodePositions` to Cytoscape node elements.

---

## 5. Four-Gate Decision-Authority Matrix

Every decision gate is evaluated against explicit approval records in `context/CURRENT-DECISIONS.md`:

| Gate | User-Visible Question | Recommended Option | Current Code Behavior | Approved Decision Record? | Decision Status | Authority Blocker |
|---|---|---|---|---|---|---|
| **Gate A** | Shared SObject Representation | **A2:** Single Node + Non-Semantic Anchor + SHARED Badge | `satellites.ts` L466 attaches SObject to 1st parent in Map iteration | **NONE** in `CURRENT-DECISIONS.md` | `PROPOSED` / `UNRESOLVED` | Product Authority approval required |
| **Gate B** | Angular Placement Semantics | **B1:** Geometry-Only Uniform Packing ($\Delta\theta = 2\pi / N$) | `component-orbit-layout.ts` L193 assigns uniform angles | **NONE** in `CURRENT-DECISIONS.md` | `PROPOSED` / `UNRESOLVED` | Product Authority approval required |
| **Gate C** | Excluded Node Visibility | **C1:** Active Focal Projection Only (Hide unreachable) | `architecture-layout.ts` L219 merges stale coordinates | **NONE** in `CURRENT-DECISIONS.md` | `PROPOSED` / `UNRESOLVED` | Product Authority approval required |
| **Gate D** | Drag Position Scope | **D3:** Composite Scope (`[mode][focalId][nodeId]`) | `projectState.ts` L47 stores flat `nodePositions[nodeId]` | **NONE** in `CURRENT-DECISIONS.md` | `PROPOSED` / `UNRESOLVED` | Product Authority approval required |

---

## 6. DEF-01 and DEF-02 Verification Matrix

| Defect ID | Source Location | Reproduction Trigger | Observable Failure | Root Cause Analysis | Current Status | Minimal Correction |
|---|---|---|---|---|---|---|
| **DEF-01** | `architecture-layout.ts` L169–171, L219–221 | Switch layout mode (Hierarchical -> Orbit) or change focal LWC in Orbit mode | Stale coordinates from prior context merged into output map for unassigned nodes | `computeArchitectureLayoutWithMetadata` copies `existingPositions[id]` for any `id` absent from `orbitOutput.positions` | **CONFIRMED PRESENT** | Remove the `existingPositions` copy loop for unassigned nodes in Orbit/Constellation layout blocks |
| **DEF-02** | `projectState.ts` L47 (`nodePositions[nodeId]`) | Drag node in Orbit mode for LWC A, then switch focal node to LWC B or switch mode | Dragged position forces node position in unrelated focal views or Hierarchical layout | Storage schema keys positions solely by `nodeId` without `layoutMode` or `focalNodeId` scope | **CONFIRMED PRESENT** | Update `projectState.ts` storage schema and `mergeWithDefaultState` to key positions by composite key `nodePositions[mode][focalId][nodeId]` |

---

## 7. Supported Versus Conditional Geometry Claims

| Geometry Claim | Mathematical Basis | Current Code Evidence | Test Assertion Evidence | Browser Evidence | Classification | Scope / Conditions |
|---|---|---|---|---|---|---|
| **Focal Sun Origin (0,0)** | $(x, y) = (0, 0)$ | `component-orbit-layout.ts` L140 | `orbit-layout.test.ts` L45 | Playwright Chromium pass | **SUPPORTED FACT** | Applies to depth $d=0$ focal sun |
| **Radial Ring Spacing** | $R_N = R_{\text{inner}} + (N-1) \cdot R_{\text{spacing}}$ | `component-orbit-layout.ts` L154 | `orbit-layout.test.ts` L62 | Playwright Chromium pass | **SUPPORTED FACT** | Applies to depth $d \ge 1$ rings |
| **AABB Body Non-Overlap** | $|\Delta x| \ge 160\text{px} \lor |\Delta y| \ge 100\text{px}$ | `component-orbit-layout.ts` L180–190 | `orbit-layout.test.ts` L95 (`collisionCount === 0`) | Playwright Chromium pass | **CONDITIONAL FACT** | Bounded for fixed $120 \times 60$ rectangular node bodies with $40 \times 40$ gap |
| **Dynamic Chord Separation** | $d_{\text{chord}} = 2 R \sin(\pi/N) \ge 188.68\text{px}$ | `component-orbit-layout.ts` L185 | `orbit-layout.test.ts` L110 | Playwright Chromium pass | **CONDITIONAL FACT** | Assumes equal rectangular bodies on circular track |
| **Multiline Text Label Clearance** | Text bounds $W_{\text{label}} \times H_{\text{label}}$ | Cytoscape `graph-style.ts` L96 (`text-max-width: 120px`) | Tested via single-line bounds | Playwright Chromium pass | **CONDITIONAL / UNVERIFIED** | Multi-line wrapped text depends on DOM canvas text measuring |

---

## 8. Executed Tests and Evidence Limitations

Non-destructive test executions performed in current checkout:

| Test Command | Test Suite File | Exit Code | Passing Count | Relevant Coverage Scope | Evidence Limitations |
|---|---|---|---|---|---|
| `npm run test:cli` | `scripts/test-cli-integration.cjs` | `0` | **31/31 Suites Pass** | Master CLI static analysis & snapshot pipeline | Verifies CLI tools; does not execute React DOM rendering |
| `npx vitest run` | `explorer/src/lib/orbit-layout.test.ts` | `0` | **12/12 Tests Pass** | Orbit polar math, dynamic track radius, AABB non-overlap | Pure math unit test; JSDOM environment |
| `npx vitest run` | `explorer/src/lib/adapters/component-orbit-adapter.test.ts` | `0` | **10/10 Tests Pass** | BFS traversal, role symbols (☉, ◎, ◉, ○), determinism | Pure adapter unit test; JSDOM environment |
| `npx vitest run` | `explorer/src/lib/layout/component-constellation-layout.test.ts` | `0` | **10/10 Tests Pass** | Multi-sun constellation layout math | Pure layout unit test; JSDOM environment |
| `npx vitest run` | `explorer/src/test/static-constellation-projection.test.ts` | `0` | **8/8 Tests Pass** | Static Mode element projection filtering | React component test; JSDOM environment |
| `npx vitest run` | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | `0` | **12/12 Tests Pass** | Single state authority, routing, selection neutrality | React integration test; JSDOM environment |

---

## 9. Exact Implementation Boundary

```text
================================================================================
                        IMPLEMENTATION BOUNDARY MAP
================================================================================

[BLOCKED WORK — UNAPPROVED PRODUCT CHOICES]
-------------------------------------------
1. BLOCKED: Adding "SHARED" badge UI or modifying SObject anchor logic for Gate A.
   Reason: Product authority choice for Gate A (Model A1 vs A2 vs A3) is missing.
2. BLOCKED: Adding domain sector angular offsets or sector guidelines for Gate B.
   Reason: Product authority choice for Gate B (Model B1 vs B2) is missing.
3. BLOCKED: Modifying Cytoscape element removal or adapter filtering for Gate C.
   Reason: Product authority choice for Gate C (Policy C1 vs C2 vs C3) is missing.
4. BLOCKED: Implementing composite drag storage keying schema for Gate D.
   Reason: Product authority choice for Gate D (Policy D1 vs D2 vs D3 vs D4) is missing.

[AUTHORIZED TECHNICAL WORK — VERIFIED ENGINEERING DEFECTS]
---------------------------------------------------------
1. AUTHORIZED: Removing the `existingPositions` copy loop for unassigned nodes in
   `architecture-layout.ts` (lines 169–171, 219–221).
   Reason: Restores Position Authority Level 4 pure function constraints.
2. AUTHORIZED: Backward-compatible flat-key migration in `projectState.ts`.
   Reason: Ensures legacy localStorage entries parse safely without crashing.
================================================================================
```

---

## 10. Explicit Blockers and Required Approvals

To cross the implementation boundary and enable full Lens B completion, the following single blocker must be resolved:

- **Blocker ID:** `BLK-PROD-01` (Missing Product Authority Approvals for Gates A–D)
- **Location:** `context/CURRENT-DECISIONS.md`
- **Required Approval Action:** Record explicit product decision selections for Gates A, B, C, and D in `context/CURRENT-DECISIONS.md` using the decision packet provided in Deliverable C (`GRAPHVIEW_LENS_B_PRODUCT_DECISION_PACKET.md`).

---

## 11. Next Required Action

The single next action that advances Lens B toward legitimate completion without repeating investigation is:

**Submit Deliverable C (`GRAPHVIEW_LENS_B_PRODUCT_DECISION_PACKET.md`) to Product Authority for formal selection and recording of Gate decisions in `context/CURRENT-DECISIONS.md`.**
