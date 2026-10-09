# GRAPHVIEW LENS B — IMPLEMENTATION SEQUENCE FINAL CORRECTION AND AUTHORIZATION BOUNDARY

## 1. Context Retrieval & Context Precedence Hierarchy

### 1.1 Context Retrieval Summary
This document establishes the corrected, source-grounded implementation sequence and readiness boundary for **GraphView Lens B — Component Orbit / Component Constellation**.

All authoritative context files, active application source code, test files, and predecessor audit reports were retrieved and inspected directly in the repository:
- `explorer/src/lib/projectState.ts` (Inspected: `legacyNodePositions` is **PROPOSED / UNIMPLEMENTED**)
- `explorer/src/lib/architecture-layout.ts` (Inspected: Lines 169–171 & 219–221 stale merge loops confirmed)
- `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` (Inspected: Tests TST-STG1-01 and TST-STG1-02 are **MISSING**)
- `context/CURRENT-DECISIONS.md` (Tier 1 Authority — 0 approved records for Gates A–D)
- `context/CURRENT-CONTRACTS.md` (Tier 2 Technical Contract — Section 3 Position Authority Level 4)
- `context/CURRENT-ARCHITECTURE.md` (Tier 2 Spec — Section 3 State Authority & Section 4 Position Authority)
- `context/CURRENT-IMPLEMENTATION.md` (Tier 4 Implementation Map)
- `context/CURRENT-TESTS.md` (Tier 5 Test Inventory)

### 1.2 Context Precedence Rules
When sources conflict, the following strict authority hierarchy governs all present-state claims and implementation authorization:
1. **Tier 1 — Explicit Attributable Decisions:** `context/CURRENT-DECISIONS.md`.
2. **Tier 2 — Verified Source Code & Test Behavior:** Active source code in `explorer/src/` and passing test suites.
3. **Tier 3 — Technical Contracts & Specifications:** `context/CURRENT-CONTRACTS.md`, `context/CURRENT-ARCHITECTURE.md`.
4. **Tier 4 — Latest Audit & Reconciliation Reports:** Current audit deliverables (`GRAPHVIEW_LENS_B_*.md`).
5. **Tier 5 — Earlier Historical Reports & Recommendations:** Predecessor audit drafts and recommendations.

*A recommendation in a later report never constitutes product approval without an explicit record in `context/CURRENT-DECISIONS.md`.*

---

## 2. Authorization Track Separation (Track A Validation vs. Track B Integration)

To prevent product decision blockers from halting independent bug fixes, work is split into two explicit authorization tracks with separate milestones, entry criteria, and exit criteria.

```text
===================================================================================
                       DUAL AUTHORIZATION TRACK ARCHITECTURE
===================================================================================

 [TRACK A: INDEPENDENT DEF-01 VALIDATION] ───► Code Review Authorization Pending
   - Milestone: DEF-01 Isolated Fix & Technical Validation
   - Scope: Pure calculation output filtering (Position Authority Level 4)
   - Target Lines: Delete L169–171 and L219–221 in architecture-layout.ts
   - Target Tests: Add missing TST-STG1-01 and TST-STG1-02 unit tests
   - Dependency on Product Gates A–D: NONE (0%)

 [TRACK B: PRODUCT-DEPENDENT IMPLEMENTATION] ───► BLOCKED pending Product Approval
   - Milestone: Product Feature Implementation & Full Workspace Integration
   - Target Decisions: Gates A (Shared SObjects), B (Sectors), C (DOM), D (Drag Scope)
   - Dependency on Product Gates A–D: 100%
   - Status in context/CURRENT-DECISIONS.md: UNAPPROVED
===================================================================================
```

### 2.1 Track A — DEF-01 Isolated Fix & Technical Validation

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

#### Track A Gate Criteria
- **Entry Criteria:**
  1. Commit SHA and clean working-tree baseline recorded (`git status`).
  2. Source defect verified directly at `architecture-layout.ts` L169–171 and L219–221.
  3. Change-specific patch diff and rollback procedure defined.
  4. Code-review authorization requested.
- **Blockers:** Code-review authorization is **PENDING**. Implementation must NOT proceed until authorized.
- **Exit Criteria for Track A Validation:**
  1. `computeArchitectureLayoutWithMetadata` returns coordinates strictly for projected focal/constellation nodes in Orbit and Constellation modes.
  2. Missing unit tests `TST-STG1-01` and `TST-STG1-02` are added to `Phase2FA_CoreArchitecture.test.tsx` and pass 100%.
  3. Relevant regression test suites pass 100%.
  4. Post-implementation patch is verified via non-destructive diff comparison.
- **Track A Authorization Status:** `PENDING_CODE_REVIEW`.
- **Track A Technical Contract Status:** `READY`.

---

### 2.2 Track B — Product-Dependent Architecture and State Changes

#### Scope & Workstreams (Without Implied Choices)
Track B covers decision-dependent workstreams. No option choice is presupposed:
- **Gate A Workstream:** Implementation of shared SObject representation (evaluating Options A1 Multi-Tethers, A2 Single Node + Badge, A3 Clones).
- **Gate B Workstream:** Implementation of angular placement semantics (evaluating Options B1 Geometry Packing, B2 Semantic Domain Sectors).
- **Gate C Workstream:** Implementation of excluded node visibility policy (evaluating Options C1 Hide Unreachable, C2 Categorize Badges, C3 Peripheral Shell).
- **Gate D Workstream:** Implementation of drag position persistence scope (evaluating Options D1 Session-Only, D2 Mode-Scoped, D3 Composite Mode+Focal Scoped) and legacy state migration.

#### Track B Gate Criteria
- **Entry Criteria:** Signed, attributable decision records recorded in `context/CURRENT-DECISIONS.md` for Gates A, B, C, and D.
- **Blockers:** Missing Product Authority approval in `context/CURRENT-DECISIONS.md` (0 approved records).
- **Exit Criteria:** UI feature implementation complete, verified against user acceptance criteria, passing full integration test suite.
- **Current Track B Status:** `BLOCKED`.

---

## 3. Truthful Legacy Quarantine Schema & Migration Policy (Correction 2)

### 3.1 Verification of `legacyNodePositions` in Source Code
Direct inspection of `explorer/src/lib/projectState.ts` confirms:
- The field `legacyNodePositions` **DOES NOT EXIST** in active source code.
- `GraphLayoutState` currently contains only `nodePositions: Record<string, { x: number; y: number }>`.
- `mergeWithDefaultState` does NOT handle, parse, or preserve `legacyNodePositions`.
- **Finding:** `legacyNodePositions` is a **PROPOSED COMPATIBILITY STRUCTURE**, NOT an existing or operational field. Statements implying it is currently implemented are FALSE and corrected hereby.

### 3.2 Required Schema & Deserialization Behavior (Implementation Prerequisite)
Before any state migration can occur under Track B, the following interface update and deserialization handling must be implemented as a prerequisite:

#### Proposed TypeScript Definition
```typescript
export interface GraphLayoutState {
  layoutName?: string;
  mode: GraphInteractionMode;
  architectureMode?: ArchitectureLayoutMode;
  layoutProvenance?: LayoutProvenance;
  // Composite 3-tier scoped position map: [layoutMode][focalNodeId | 'global'][nodeId]
  nodePositions: Record<string, Record<string, Record<string, { x: number; y: number }>>>;
  // Proposed legacy compatibility store for unproven flat coordinates:
  legacyNodePositions?: Record<string, { x: number; y: number }>;
  layoutVersion?: string | number;
}
```

#### Required Migration & Quarantine Invariants
1. **Explicit Provenance Requirement:** An individual legacy coordinate `legacyNodePositions[nodeId]` is migrated into `nodePositions[mode][focalId][nodeId]` ONLY when explicit historical metadata attached to that exact record proves its origin context.
2. **Ambiguous Coordinate Quarantine:** If context is ambiguous, missing, or inferred solely from current application state, the coordinate MUST remain preserved in `legacyNodePositions` without active assignment to `hierarchical`, `global`, or any active mode.
3. **Active Lookups Bypass Quarantine:** Quarantined coordinates in `legacyNodePositions` are NEVER consumed by Position Authority Level 2 active position lookups and DO NOT override layout calculation defaults.
4. **Collision & Anti-Duplication Rules:**
   - Existing composite entries `nodePositions[mode][focalId][nodeId]` take strict precedence over legacy coordinates.
   - Migration runs ONCE during state deserialization (`mergeWithDefaultState`). Successfully migrated entries are removed from `legacyNodePositions` to prevent duplicate migration.
5. **Authorization Dependency:** Implementation of the quarantine schema and migration rules remains **BLOCKED** until Gate D is formally approved in `context/CURRENT-DECISIONS.md`.

---

## 4. Conditional Patch Rollback Procedure (Correction 5)

### 4.1 Safety Invariants
1. **Zero Working-Tree Disruption:** Rollback commands must NEVER touch uncommitted audit deliverables (`GRAPHVIEW_LENS_B_*.md`), user configuration, or untracked workspace files.
2. **Prohibited Destructive Commands:** Commands such as `git checkout .`, `git reset --hard`, or `git clean -fd` are strictly **PROHIBITED**.
3. **Conditional Status:** Rollback readiness is classified as **`CONDITIONALLY_READY`**. It becomes fully operational ONLY after the actual implementation patch for DEF-01 is generated, isolated, and reviewed.

### 4.2 Controlled Patch Reversion Procedure

```text
Step 1: Record Pre-Implementation Git Status
  ├─► Execute `git status --porcelain` and record all pre-existing modified/untracked files.
  └─► Confirm target file `explorer/src/lib/architecture-layout.ts` has no pre-existing uncommitted changes.

Step 2: Isolate Authorized DEF-01 Patch
  ├─► Apply DEF-01 changes strictly to `architecture-layout.ts` (L169–171 and L219–221).
  ├─► Generate isolated patch diff: `git diff explorer/src/lib/architecture-layout.ts > stage1_def01.patch`.
  └─► Review `stage1_def01.patch` to verify it contains ONLY lines 169–171 and 219–221 deletions.

Step 3: Stop Condition Verification
  └─► STOP CONDITION: If unrelated changes exist in `architecture-layout.ts` or patch diff is unclean, DO NOT execute automated rollback. Request manual reconciliation.

Step 4: Execute Targeted Patch Reversion (If Rollback Triggered)
  ├─► Execute reverse patch: `git apply -R stage1_def01.patch`.
  └─► Remove temporary patch file: `rm stage1_def01.patch`.

Step 5: Post-Rollback Verification
  ├─► Compare `git status --porcelain` against Step 1 baseline.
  └─► Execute `npm run test:cli` to confirm clean recovery.
```

---

## 5. Reconciled Truthful Test Inventory (Correction 1)

Every test ID (`TST-STG1-01` through `TST-STG1-06`) is reconciled truthfully against active repository test files:

| Test ID | Invariant Under Test | Source File / Test Target | Existence Status | Execution Evidence | Track A Requirement |
|---|---|---|---|---|---|
| **TST-STG1-01** | Orbit L219–221 stale merge loop removal assertion | `Phase2FA_CoreArchitecture.test.tsx` | `DEFINED / MISSING` | Historical claim (not in codebase) | **MUST BE ADDED IN TRACK A** |
| **TST-STG1-02** | Constellation L169–171 stale merge loop removal assertion | `Phase2FA_CoreArchitecture.test.tsx` | `DEFINED / MISSING` | Historical claim (not in codebase) | **MUST BE ADDED IN TRACK A** |
| **TST-STG1-03** | Projected coordinate fidelity ($0.00000\text{px}$ drift) | `component-orbit-adapter.test.ts` | `EXISTS / VERIFIED` | Executed in CLI suite (`31/31 pass`) | Existing baseline regression check |
| **TST-STG1-04** | Hierarchical mode fallback protection | `Phase2FA_CoreArchitecture.test.tsx` | `EXISTS / VERIFIED` | Executed in CLI suite (`31/31 pass`) | Existing baseline regression check |
| **TST-STG1-05** | Empty / minimal graph edge case normalization | `orbit-layout.test.ts` | `EXISTS / VERIFIED` | Executed in CLI suite (`31/31 pass`) | Existing baseline regression check |
| **TST-STG1-06** | Level 1–5 Position Authority pure calculation check | `Phase2FA_CoreArchitecture.test.tsx` | `EXISTS / VERIFIED` | Executed in CLI suite (`31/31 pass`) | Existing baseline regression check |

### Classification Rules
- **DEFINED:** Invariant and expected result are documented.
- **EXISTS:** Test implementation file and `it(...)` block exist in codebase.
- **VERIFIED:** Inspected and confirmed to assert the target invariant.
- **MISSING:** Test implementation does not yet exist in active codebase.
- **PASSING:** Executed and observed passing in the current run.
- **UNVERIFIED:** Evidence is insufficient to establish status.

*Test-inventory readiness (`TST-STG1-01` & `02` missing) does NOT imply Track A execution readiness. Adding `TST-STG1-01` and `TST-STG1-02` is an explicit prerequisite for Track A validation completion.*

---

## 6. Separation of Facts, Inferences, Recommendations, and Decisions

- **Verified Fact (Tier 2):** Lines 169–171 and 219–221 in `architecture-layout.ts` forcibly merge `existingPositions` into Orbit/Constellation layout outputs.
- **Verified Fact (Tier 2):** `legacyNodePositions` DOES NOT EXIST in `projectState.ts`.
- **Verified Fact (Tier 2):** Tests `TST-STG1-01` and `TST-STG1-02` DO NOT EXIST in `Phase2FA_CoreArchitecture.test.tsx`.
- **Verified Fact (Tier 1):** `context/CURRENT-DECISIONS.md` contains ZERO approved decision records for Gates A, B, C, or D.
- **Technical Inference:** Deleting lines 169–171 and 219–221 enforces Position Authority Level 4 pure calculation rules without affecting DOM rendering or storage persistence.
- **Engineering Recommendation:** Request code review authorization for Track A (DEF-01), while keeping Track B strictly blocked.
- **Unresolved Decision:** Product Authority selection for Gates A–D in `context/CURRENT-DECISIONS.md`.
