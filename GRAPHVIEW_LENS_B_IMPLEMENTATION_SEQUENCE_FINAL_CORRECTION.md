# GRAPHVIEW LENS B — IMPLEMENTATION SEQUENCE FINAL CORRECTION AND AUTHORIZATION BOUNDARY

## 1. Context Retrieval & Context Precedence Hierarchy

### 1.1 Context Retrieval Summary
This document establishes the corrected, source-grounded implementation sequence for **GraphView Lens B — Component Orbit / Component Constellation**.

All authoritative context files and predecessor audit reports were retrieved and inspected directly in the repository:
- `context/CURRENT-DECISIONS.md` (Tier 1 Authority — 0 approved records for Gates A–D)
- `context/CURRENT-CONTRACTS.md` (Tier 2 Technical Contract — Section 3 Position Authority Level 4)
- `context/CURRENT-ARCHITECTURE.md` (Tier 2 Architecture Spec — Section 3 State Authority & Section 4 Position Authority)
- `context/CURRENT-IMPLEMENTATION.md` (Tier 4 Implementation Map)
- `context/CURRENT-TESTS.md` (Tier 5 Test Inventory)
- `GRAPHVIEW_LENS_B_DOCUMENTATION_CONTRADICTION_CLOSURE.md` (Latest contradiction closure audit)
- `GRAPHVIEW_LENS_B_SAFE_IMPLEMENTATION_SEQUENCE_CORRECTED.md` (Prior implementation sequence)
- `GRAPHVIEW_LENS_B_FINAL_AUTHORIZATION_CHECKLIST_CORRECTED.md` (Prior authorization checklist)

### 1.2 Context Precedence Rules
When sources conflict, the following strict authority hierarchy governs all present-state claims and implementation authorization:
1. **Tier 1 — Explicit Attributable Decisions:** `context/CURRENT-DECISIONS.md`.
2. **Tier 2 — Verified Source Code & Test Behavior:** Active source code in `explorer/src/` and passing test suites.
3. **Tier 3 — Technical Contracts & Specifications:** `context/CURRENT-CONTRACTS.md`, `context/CURRENT-ARCHITECTURE.md`.
4. **Tier 4 — Latest Audit & Reconciliation Reports:** Current audit deliverables (`GRAPHVIEW_LENS_B_*.md`).
5. **Tier 5 — Earlier Historical Reports & Recommendations:** Predecessor audit drafts and recommendations.

*A recommendation in a later report never constitutes product approval without an explicit record in `context/CURRENT-DECISIONS.md`.*

---

## 2. Authorization Track Separation (Track A vs. Track B)

To resolve the contradiction where unresolved product decisions blocked independent technical bug fixes, work is split into two explicit authorization tracks.

```text
===================================================================================
                       DUAL AUTHORIZATION TRACK ARCHITECTURE
===================================================================================

 [TRACK A: INDEPENDENT DEF-01 TECHNICAL FIX] ───► Ready for Code Review & Fix
   - Target: Remove L169–171 & L219–221 stale merge loops in architecture-layout.ts
   - Scope: Pure calculation output filtering (Position Authority Level 4)
   - Dependency on Product Gates A–D: NONE (0%)

 [TRACK B: PRODUCT-GATE DEPENDENT CHANGES]   ───► BLOCKED pending Product Approval
   - Target: Gates A (SHARED badge), B (Sectors), C (DOM removal), D (Drag state)
   - Dependency on Product Gates A–D: 100%
   - Status in context/CURRENT-DECISIONS.md: UNAPPROVED
===================================================================================
```

### 2.1 Track A — Independent DEF-01 Technical Correction

#### Scope & Target
- **Source File:** `explorer/src/lib/architecture-layout.ts`
- **Target Functions:** `computeArchitectureLayoutWithMetadata`
- **Target Lines:** Lines 169–171 (Constellation branch) and Lines 219–221 (Orbit branch).
- **Defect Description:** The layout orchestrator forcibly merges `existingPositions[id]` for nodes unassigned by the Orbit/Constellation projection. This violates Position Authority Level 4 (`context/CURRENT-CONTRACTS.md` Section 3), which requires pure function calculation output containing ONLY projected nodes.

#### Independence Assessment & Proof
Inspecting `architecture-layout.ts` confirms that removing lines 169–171 and 219–221:
1. Does NOT alter SHARED SObject rendering or anchor logic (Gate A independent).
2. Does NOT alter polar angle packing or sector allocations (Gate B independent).
3. Does NOT alter Cytoscape DOM element synchronization or removal in `GraphView.tsx` (Gate C independent).
4. Does NOT alter `projectState.ts` storage keys or drag persistence (Gate D independent).
5. Does NOT alter legacy flat position storage or migration policies (Migration independent).

Therefore, DEF-01 layout calculation filtering is a **GENUINELY INDEPENDENT TECHNICAL FIX**.

#### Track A Gate Criteria
- **Entry Criteria:**
  1. Commit SHA and clean working-tree baseline recorded (`git status`).
  2. Source defect verified directly at `architecture-layout.ts` L169–171 and L219–221.
  3. Change-specific patch diff and rollback procedure defined.
  4. Track A test matrix (`TST-STG1-01` through `TST-STG1-06`) verified.
- **Blockers:** Code review approval required before applying fix. Zero product decision blockers.
- **Exit Criteria:** `computeArchitectureLayoutWithMetadata` returns coordinates strictly for projected focal/constellation nodes in Orbit and Constellation modes. All 6 Track A tests pass 100%.
- **Current Track A Status:** `READY_FOR_AUTHORIZATION_ATTEMPT`.

---

### 2.2 Track B — Product-Dependent Architecture and State Changes

#### Scope & Targets
- **Gate A:** SHARED SObject multi-parent representation & `"SHARED"` badge in `satellites.ts` and `FeatureOverlayCanvas.tsx`.
- **Gate B:** Domain sector angular offsets and guidelines in `component-orbit-layout.ts`.
- **Gate C:** Excluded node DOM canvas deletion via `cy.elements().remove()` in `GraphView.tsx`.
- **Gate D:** Composite drag position persistence schema (`nodePositions[layoutMode][focalNodeId][nodeId]`) in `projectState.ts` and `GraphView.tsx`.

#### Track B Gate Criteria
- **Entry Criteria:** Signed, attributable decision records recorded in `context/CURRENT-DECISIONS.md` for Gates A, B, C, and D.
- **Blockers:** Missing Product Authority approval in `context/CURRENT-DECISIONS.md`.
- **Exit Criteria:** UI feature implementation complete, verified against user acceptance criteria, passing full integration test suite.
- **Current Track B Status:** `BLOCKED` (0 decision records present in `context/CURRENT-DECISIONS.md`).

---

## 3. Provenance-Based Migration and Quarantine Policy (Correction B)

### 3.1 Unrecoverability of Legacy Provenance
Inspecting `projectState.ts` (L47) confirms that legacy `nodePositions` is stored as `Record<string, { x: number; y: number }>`.
- It contains NO `architectureMode`, `layoutMode`, `focalNodeId`, `viewMode`, or timestamp metadata per coordinate.
- Current application mode (e.g., `graphLayout.architectureMode`) reflects current user view selection, NOT the historical mode in which a specific node drag occurred.
- Inferring historical coordinate provenance from current application state is **UNSAFE** and risks corrupting layouts by applying Orbit circular coordinates as Hierarchical drag overrides.

### 3.2 Mandatory Migration Rules

1. **Proven-Context Migration (M1 Rule):**
   A legacy flat position entry `legacyNodePositions[nodeId]` is migrated to `nodePositions[layoutMode][focalNodeId][nodeId]` ONLY when explicit historical metadata attached to that exact record proves its origin context.

2. **Default Compatibility Quarantine (M2 Rule):**
   When provenance is ambiguous, missing, or inferred solely from current state, the coordinate is stored in `legacyNodePositions` compatibility field.
   - Quarantined coordinates are **NEVER** automatically assigned to `nodePositions.hierarchical.global` or any active mode.
   - Quarantined coordinates are never consumed as Level 2 active drag overrides.
   - Quarantined coordinates remain preserved in raw JSON storage to prevent user data loss.

3. **Collision & Anti-Duplication Handling:**
   - If a valid composite entry `nodePositions[mode][focalId][nodeId]` already exists, it takes strict precedence over any legacy coordinate.
   - Migration runs ONCE during state deserialization (`mergeWithDefaultState`). Migrated entries are deleted from `legacyNodePositions` to prevent re-migration or duplication.

4. **Diagnostics and Export Availability:**
   - Quarantined entries remain readable via `ProjectUIState.graphLayout.legacyNodePositions`.
   - Admin UI or diagnostic export features can display quarantined positions for manual user restoration.

5. **Unresolved Approvals Needed Before Implementation:**
   - Product Authority must approve Policy D3 (Composite Storage Scope) and state migration rules (M1/M2) in `context/CURRENT-DECISIONS.md` before Track B migration code can be written.

---

## 4. Non-Destructive, Change-Specific Rollback Procedure (Correction C)

### 4.1 Safety Invariants
1. **Zero Working-Tree Disruption:** Rollback commands must NEVER touch uncommitted audit deliverables (`GRAPHVIEW_LENS_B_*.md`), user configuration, or untracked workspace files.
2. **Prohibited Destructive Commands:** Commands such as `git checkout .`, `git reset --hard`, or `git clean -fd` are strictly **PROHIBITED**.

### 4.2 Controlled Patch Reversion Checklist

```text
Step 1: Record Pre-Implementation Baseline
  ├─► Execute `git status --porcelain` and record all pre-existing modified/untracked files.
  └─► Confirm target file `explorer/src/lib/architecture-layout.ts` is unmodified.

Step 2: Isolate Implementation Diff
  ├─► Apply DEF-01 changes to `architecture-layout.ts` (L169–171 and L219–221).
  ├─► Generate isolated patch: `git diff explorer/src/lib/architecture-layout.ts > stage1_def01.patch`.
  └─► Inspect `stage1_def01.patch` to verify it touches ONLY lines 169–171 and 219–221.

Step 3: Controlled Rollback Execution (If Verification Fails)
  ├─► STOP CONDITION: If unrelated changes were made to `architecture-layout.ts`, DO NOT apply patch.
  ├─► Execute reverse patch: `git apply -R stage1_def01.patch`.
  └─► Remove temporary patch file: `rm stage1_def01.patch`.

Step 4: Post-Rollback Verification
  ├─► Execute `git status --porcelain` and verify state matches Step 1 baseline exactly.
  └─► Execute `npm run test:cli` to verify zero regressions.
```

---

## 5. Reconciled DEF-01 Test Inventory (Correction D)

All six test IDs (`TST-STG1-01` through `TST-STG1-06`) are reconciled directly against the repository source and test architecture in `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx`:

| Test ID | Invariant Under Test | Source Module / Target Path | Expected Result | Existence Status | Execution Mode | Evidence Status |
|---|---|---|---|---|---|---|
| **TST-STG1-01** | Orbit L219–221 stale position loop removal | `architecture-layout.ts` L219–221 | `orbitOutput.positions` contains ONLY projected focal nodes; `existingPositions` entries absent | Must be added in Track A | Independent Vitest | `VERIFIED_CONTRACT_DEFECT` |
| **TST-STG1-02** | Constellation L169–171 stale position loop removal | `architecture-layout.ts` L169–171 | `constellationOutput.positions` contains ONLY projected nodes; `existingPositions` entries absent | Must be added in Track A | Independent Vitest | `VERIFIED_CONTRACT_DEFECT` |
| **TST-STG1-03** | Projected coordinate fidelity | `adapters/component-orbit-adapter.ts` | Projected node coordinates match adapter calculation bit-for-bit ($0.00000\text{px}$ drift) | Exists in `component-orbit-adapter.test.ts` | Independent Vitest | `VERIFIED_PASSING` |
| **TST-STG1-04** | Hierarchical mode fallback protection | `architecture-layout.ts` (Hierarchical block) | Hierarchical layout calculation remains 100% unaffected | Exists in `Phase2FA_CoreArchitecture.test.tsx` | Independent Vitest | `VERIFIED_PASSING` |
| **TST-STG1-05** | Empty / minimal graph edge cases | `architecture-layout.ts` (Stage 0 normalization) | Empty node/edge inputs return empty positions without throwing exceptions | Exists in `Phase2FA_CoreArchitecture.test.tsx` | Independent Vitest | `VERIFIED_PASSING` |
| **TST-STG1-06** | Level 1–5 Position Authority pure function invariant | `architecture-layout.ts` | Calculation functions produce 0 state mutations and respect Level 4 purity | Exists in `Phase2FA_CoreArchitecture.test.tsx` | Independent Vitest | `VERIFIED_PASSING` |

---

## 6. Separation of Facts, Inferences, Recommendations, and Decisions

- **Verified Fact (Tier 2):** Lines 169–171 and 219–221 in `architecture-layout.ts` forcibly merge `existingPositions` into Orbit/Constellation layout outputs.
- **Verified Fact (Tier 1):** `context/CURRENT-DECISIONS.md` contains ZERO approved decision records for Gates A, B, C, or D.
- **Technical Inference:** Deleting lines 169–171 and 219–221 enforces Position Authority Level 4 pure calculation rules without affecting DOM rendering or storage persistence.
- **Engineering Recommendation:** Proceed with Track A code review for DEF-01, while keeping Track B strictly blocked.
- **Unresolved Decision:** Product Authority selection for Gates A–D in `context/CURRENT-DECISIONS.md`.
