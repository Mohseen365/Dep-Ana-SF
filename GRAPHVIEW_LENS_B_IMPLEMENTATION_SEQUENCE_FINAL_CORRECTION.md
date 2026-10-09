# GRAPHVIEW LENS B — IMPLEMENTATION SEQUENCE FINAL CORRECTION AND AUTHORIZATION BOUNDARY

## 1. Context Retrieval & Context Precedence Hierarchy

### 1.1 Context Retrieval Summary
This document establishes the corrected, source-grounded implementation sequence, test evidence framework, patch isolation rollback policy, canonical test paths, adversarial authorization audit, and readiness boundary for **GraphView Lens B — Component Orbit / Component Constellation**.

All authoritative context files, active application source code, test files, and predecessor audit reports were retrieved and inspected directly in the repository:
- `explorer/src/lib/projectState.ts` (Inspected: `legacyNodePositions` is **PROPOSED / UNIMPLEMENTED**)
- `explorer/src/lib/architecture-layout.ts` (Inspected: Lines 169–171 & 219–221 stale merge loops confirmed)
- `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` (Inspected: Tests TST-STG1-01 and TST-STG1-02 are **MISSING**)
- `explorer/src/lib/adapters/component-orbit-adapter.test.ts` (Inspected: Canonical path for TST-STG1-03)
- `explorer/src/lib/layout/orbit-layout.test.ts` (Inspected: Canonical path for TST-STG1-05)
- `context/CURRENT-DECISIONS.md` (Tier 1 Authority — 0 approved records for Gates A–D)
- `context/CURRENT-TESTS.md` (Tier 5 Test Inventory)
- `audit-evidence/features/FEAT-PERF/cli-integration.log` (Inspected: Historical log recording 31/31 CLI sub-tests passed in a prior run)

### 1.2 Context Precedence Rules
When sources conflict, the following strict authority hierarchy governs all present-state claims and implementation authorization:
1. **Tier 1 — Explicit Attributable Decisions:** `context/CURRENT-DECISIONS.md`.
2. **Tier 2 — Verified Source Code & Test Behavior:** Active source code in `explorer/src/` and test implementations in `explorer/src/test/` and `explorer/src/lib/`.
3. **Tier 3 — Technical Contracts & Specifications:** `context/CURRENT-CONTRACTS.md`, `context/CURRENT-ARCHITECTURE.md`.
4. **Tier 4 — Latest Audit & Reconciliation Reports:** Current audit deliverables (`GRAPHVIEW_LENS_B_*.md`).
5. **Tier 5 — Earlier Historical Reports & Recommendations:** Predecessor audit drafts and recommendations.

*A recommendation in a later report never constitutes product approval without an explicit record in `context/CURRENT-DECISIONS.md`.*

---

## 2. Authorization Track Separation & Standalone Milestones

To prevent product decision blockers from halting independent bug fixes, work is decoupled into two explicit authorization tracks with separate milestones, entry criteria, and exit criteria.

```text
===================================================================================
                       DUAL AUTHORIZATION TRACK ARCHITECTURE
===================================================================================

 [TRACK A: INDEPENDENT DEF-01 VALIDATION] ───► Code Review Authorization Pending
   - Standalone Milestone: DEF-01 Technical Correction & Independent Validation
   - Scope: Pure calculation output filtering (Position Authority Level 4)
   - Target Source: Delete L169–171 and L219–221 in architecture-layout.ts
   - Target Tests: Create and verify TST-STG1-01 and TST-STG1-02 in Phase2FA_CoreArchitecture.test.tsx
   - Dependency on Product Gates A–D: NONE (0%)

 [TRACK B: PRODUCT-DEPENDENT INTEGRATION] ───► BLOCKED pending Product Approval
   - Standalone Milestone: Product Feature Implementation & Full Workspace Integration
   - Scope: State schema updates, multi-tethers, sectors, DOM visibility, drag persistence
   - Target Decisions: Gates A (Shared SObjects), B (Sectors), C (DOM), D (Drag Scope)
   - Dependency on Product Gates A–D: 100%
   - Status in context/CURRENT-DECISIONS.md: UNAPPROVED
===================================================================================
```

### 2.1 Track A — Standalone DEF-01 Validation Milestone

#### Scope & Target
- **Source File:** `explorer/src/lib/architecture-layout.ts`
- **Target Functions:** `computeArchitectureLayoutWithMetadata`
- **Target Lines:** Deletion of Lines 169–171 (Constellation branch) and Lines 219–221 (Orbit branch).
- **Defect Description:** The layout orchestrator forcibly merges `existingPositions[id]` for nodes unassigned by the Orbit/Constellation projection. This violates Position Authority Level 4 (`context/CURRENT-CONTRACTS.md` Section 3), which requires pure function calculation output containing ONLY projected nodes.

#### Standalone Track A Milestone Requirements
1. **Explicit Code-Review Authorization:** Recipient of formal code-review sign-off authorizing Track A implementation.
2. **Isolated Authorized Source Change:** Deletion of L169–171 and L219–221 in `architecture-layout.ts` without collateral modifications.
3. **Creation and Verification of Missing Tests:** Implementation and local verification of `TST-STG1-01` and `TST-STG1-02` in `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx`.
4. **Required Regression Test Suite Verification:** Passing verification across baseline regression suites (`TST-STG1-03` through `06`).
5. **Attributable Test Execution Evidence:** Generation and storage of fresh execution log artifacts from the separately authorized implementation phase.
6. **Reviewed Patch and Rollback Procedure:** Verification of isolated `.patch` file against baseline `git status`.
7. **Position Authority Level 4 Contract Compliance:** Proof that `orbitPositions` and `constellationPositions` return coordinates strictly for projected nodes.

*Track A validation and completion does NOT implicitly depend on Track B or Product Gates A–D.*

#### Track A Gate Criteria
- **Entry Criteria:** Clean baseline SHA recorded; defect verified in source; patch isolation procedure defined; code review requested.
- **Blockers:** Code-review authorization is **PENDING**.
- **Exit Criteria:** `computeArchitectureLayoutWithMetadata` returns positions strictly for projected nodes; `TST-STG1-01` and `TST-STG1-02` created and verified; regression suites pass; patch diff verified clean.
- **Track A Status:** `PENDING_CODE_REVIEW`.

---

### 2.2 Track B — Standalone Product Integration Milestone

#### Scope & Workstreams
Track B covers decision-dependent product feature workstreams. No option choice is presupposed:
- **Gate A Workstream:** Shared SObject representation (Options A1 Multi-Tethers, A2 Single Node + Badge, A3 Proxy Clones).
- **Gate B Workstream:** Angular placement semantics (Options B1 Geometry Uniform Packing, B2 Semantic Domain Sectors).
- **Gate C Workstream:** Excluded node visibility policy (Options C1 Hide Unreachable, C2 Categorize Badges, C3 Peripheral Shell).
- **Gate D Workstream:** Drag position persistence scope (Options D1 Session-Only, D2 Mode-Scoped, D3 Composite Mode+Focal Scoped) and legacy state migration.

#### Standalone Track B Milestone Requirements
1. **Signed Decision Records:** Explicit approval records in `context/CURRENT-DECISIONS.md` for Gates A, B, C, and D.
2. **Quarantine Schema Implementation:** Prerequisite update of `GraphLayoutState` interface in `projectState.ts` to include `legacyNodePositions`.
3. **Full Workspace Integration:** End-to-end integration across Cytoscape DOM synchronization (`GraphView.tsx`), drag persistence, and mode switching.
4. **Track B Acceptance Suite Execution:** 100% pass across Track B UI integration and state isolation test suites.

*Current Track B Status: BLOCKED pending Product Authority decisions.*

---

## 3. Truthful Legacy Quarantine Schema & Migration Policy

### 3.1 Source Verification of `legacyNodePositions`
Direct inspection of `explorer/src/lib/projectState.ts` confirms:
- The field `legacyNodePositions` **DOES NOT EXIST** in active source code.
- `GraphLayoutState` currently contains only `nodePositions: Record<string, { x: number; y: number }>`.
- **Finding:** `legacyNodePositions` is a **PROPOSED COMPATIBILITY STRUCTURE**, NOT an existing or operational field. Claims that it is currently implemented are FALSE and corrected hereby.

### 3.2 Proposed Schema & Deserialization Behavior (Track B Prerequisite)
Before state migration can occur under Track B, the following interface update and deserialization handling must be implemented:

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
1. **Explicit Provenance Requirement:** A legacy coordinate `legacyNodePositions[nodeId]` is migrated into `nodePositions[mode][focalId][nodeId]` ONLY when explicit historical metadata attached to that exact record proves its origin context.
2. **Ambiguous Coordinate Quarantine:** If context is ambiguous, missing, or inferred solely from current application state, the coordinate MUST remain preserved in `legacyNodePositions` without active assignment.
3. **Active Lookups Bypass Quarantine:** Quarantined coordinates in `legacyNodePositions` are NEVER consumed by Position Authority Level 2 active position lookups.
4. **Collision & Anti-Duplication Rules:** Composite entries `nodePositions[mode][focalId][nodeId]` take strict precedence over legacy coordinates. Migration runs ONCE during state deserialization (`mergeWithDefaultState`).
5. **Authorization Dependency:** Implementation remains **BLOCKED** until Gate D is formally approved in `context/CURRENT-DECISIONS.md`.

---

## 4. Technical Rollback & Tightened Patch Isolation Preconditions (Correction 2)

### 4.1 Staged vs. Unstaged Git State Mechanics & Differential Scopes
A critical requirement for safe rollback is recognizing that standard `git diff <path>`, `git diff --staged <path>`, and `git diff HEAD <path>` inspect fundamentally different scopes:

- `git diff <path>` inspects **ONLY unstaged changes** in the working directory relative to the Git index. If changes are staged (`git add`), `git diff` returns an empty output, creating a false impression of a clean file.
- `git diff --staged <path>` inspects **ONLY staged changes** in the index relative to `HEAD`. It ignores unstaged edits in the working directory.
- `git diff HEAD <path>` inspects **ALL changes (staged + unstaged)** in the working directory relative to `HEAD`.
- **Scope Directive:** None of these commands alone should be treated as proof that a patch contains strictly authorized changes. All three scopes must be inspected against a recorded baseline.

### 4.2 Tightened Rollback Preconditions & Protocol

To prevent accidental data loss or reversing unrelated user edits:

1. **Clean Pre-Implementation Baseline Required:** The target file (`explorer/src/lib/architecture-layout.ts`) MUST have a recorded, clean pre-implementation baseline captured via `git status --porcelain`.
2. **Pre-Existing Change Prohibition:** Existing staged, unstaged, overlapping, or unattributable target-file changes PROHIBIT automated patch reversal.
3. **Single-Purpose Patch Constraint:** A patch file must contain strictly the exact authorized DEF-01 source modification (deletion of L169–171 and L219–221 in `architecture-layout.ts`). If a patch contains combined or collateral diffs, automated reversal is strictly prohibited.
4. **Ownership Verification Stop Condition:** If patch ownership or baseline clean state cannot be conclusively established, the procedure MUST STOP immediately and require manual reconciliation.
5. **No Patch/Rollback Execution:** No patch file shall be generated, and no rollback command shall be executed during this documentation task.

```text
===================================================================================
               TIGHTENED PATCH ISOLATION & ROLLBACK PROTOCOL
===================================================================================

Step 1: Baseline Working-Tree Capture & Verification
  ├─► Execute `git status --porcelain` to record all staged, unstaged, and untracked files.
  └─► Confirm target file `explorer/src/lib/architecture-layout.ts` matches clean baseline.

Step 2: Apply Authorized Source Change (In Separately Authorized Phase)
  └─► Apply exact authorized edit: delete L169–171 and L219–221 in architecture-layout.ts.

Step 3: Multi-Scope Diff Verification & Patch Isolation
  ├─► Inspect unstaged diff: `git diff explorer/src/lib/architecture-layout.ts`
  ├─► Inspect staged diff:   `git diff --staged explorer/src/lib/architecture-layout.ts`
  ├─► Inspect HEAD diff:     `git diff HEAD explorer/src/lib/architecture-layout.ts`
  ├─► Generate isolated patch against HEAD:
  │     `git diff HEAD explorer/src/lib/architecture-layout.ts > stage1_def01.patch`
  └─► Verify patch content contains strictly L169–171 & L219–221 deletions.

Step 4: Stop Condition Evaluation (AUTOMATIC ROLLBACK PROHIBITION)
  └─► STOP CONDITION: If target file contains pre-existing, overlapping, staged,
      unattributable, combined, or collateral changes, DO NOT execute automated rollback.
      Halt immediately and require manual reconciliation.

Step 5: Conditional Patch Reversion (If Reversal Triggered in Authorized Phase)
  ├─► Reverse only the reviewed authorized change:
  │     `git apply -R stage1_def01.patch`
  └─► Remove temporary patch artifact: `rm stage1_def01.patch`

Step 6: Post-Rollback Baseline Audit
  ├─► Execute `git status --porcelain` and compare against Step 1 baseline.
  └─► Confirm pre-existing user work and untracked files were preserved without loss.
===================================================================================
```

### 4.3 Rollback Readiness Status
Because the actual implementation patch for DEF-01 has **not yet been generated or reviewed** (implementation is pending code-review authorization), the implementation-specific rollback command remains **conditional**.

- **Rollback Readiness Classification:** **`CONDITIONALLY_READY`** (Pending generation and diff review of the isolated DEF-01 patch).

---

## 5. Normalized Canonical Test Paths & Execution Disclosure (Correction 1 & 3)

### 5.1 Reconciled Canonical Test Inventory (TST-STG1-01 through TST-STG1-06)
Every test ID is normalized with its exact, verified repository-relative path and evaluated across 5 explicit dimensions:

| Test ID | Invariant Under Test | Canonical Repository-Relative Path | Implementation Status | Assertion Inspected | Historical Claim | Current-Run Execution Result | Track A Requirement |
|---|---|---|---|---|---|---|---|
| **TST-STG1-01** | Orbit L219–221 stale merge loop removal assertion | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | `DEFINED / MISSING` | N/A (Missing) | Historical report claim | **NOT EXECUTED IN THIS RUN** | **MUST BE CREATED IN TRACK A** |
| **TST-STG1-02** | Constellation L169–171 stale merge loop removal assertion | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | `DEFINED / MISSING` | N/A (Missing) | Historical report claim | **NOT EXECUTED IN THIS RUN** | **MUST BE CREATED IN TRACK A** |
| **TST-STG1-03** | Projected coordinate fidelity ($0.00000\text{px}$ drift) | `explorer/src/lib/adapters/component-orbit-adapter.test.ts` | `EXISTS` | `VERIFIED` | 31/31 CLI pass | **NOT EXECUTED IN THIS RUN** | Baseline regression check |
| **TST-STG1-04** | Hierarchical mode fallback protection | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | `EXISTS` | `VERIFIED` | 31/31 CLI pass | **NOT EXECUTED IN THIS RUN** | Baseline regression check |
| **TST-STG1-05** | Empty / minimal graph edge case normalization | `explorer/src/lib/layout/orbit-layout.test.ts` | `EXISTS` | `VERIFIED` | 31/31 CLI pass | **NOT EXECUTED IN THIS RUN** | Baseline regression check |
| **TST-STG1-06** | Level 1–5 Position Authority pure calculation check | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | `EXISTS` | `VERIFIED` | 31/31 CLI pass | **NOT EXECUTED IN THIS RUN** | Baseline regression check |

*Path Resolution Note: Resolved path prefix inconsistencies for `TST-STG1-03` (`explorer/src/lib/adapters/component-orbit-adapter.test.ts`) and `TST-STG1-05` (`explorer/src/lib/layout/orbit-layout.test.ts`) to reflect their exact locations in the active filesystem.*

### 5.2 Disclosure of Historical Execution Log Artifacts
- The reported `31/31 pass` result for `npm run test:cli` originates from historical execution log artifact `audit-evidence/features/FEAT-PERF/cli-integration.log`.
- **Command Recorded in Artifact:** `Running Hardened CLI Integration Boundary Test Suite (DA-2.1)...` / `npm run test:cli`.
- **Observed Outcome in Artifact:** `ALL 21 CLI INTEGRATION BOUNDARY CONTRACT TESTS PASSED SUCCESSFULLY!` (31 sub-tests overall in CLI suite).
- **Current Run Disclosure:** **NO TESTS WERE EXECUTED DURING THIS DOCUMENTATION TASK.** No test is claimed to have passed in this current run. The historical log artifact is cited solely for provenance.

---

## 6. Truthful 10-Part Readiness Dimension Model

To provide complete clarity across engineering and governance boundaries, readiness is reported across 10 separate dimensions:

| Readiness Dimension | Status Classification | Source Evidence & Rationale |
|---|---|---|
| **1. DEF-01 Technical-Contract Readiness** | `READY` | Source defect at L169–171 and L219–221 in `architecture-layout.ts` verified. Violation of Position Authority Level 4 confirmed. |
| **2. DEF-01 Implementation Authorization** | `PENDING_CODE_REVIEW` | Scope isolated to Track A. Pending explicit code review authorization before implementation attempt. |
| **3. Track A Test Readiness** | `CONDITIONALLY_READY` | Tests `TST-STG1-03` through `06` exist at canonical paths. Tests `TST-STG1-01` and `02` are missing in `Phase2FA_CoreArchitecture.test.tsx` and must be created during Track A. |
| **4. Track A Validation Readiness** | `PENDING_AUTHORIZATION` | Blocked on code review approval for Track A and creation of missing unit tests `TST-STG1-01` and `TST-STG1-02`. |
| **5. Track B Integration Readiness** | `BLOCKED` | Dependent on Gate A–D product decision records in `context/CURRENT-DECISIONS.md`. |
| **6. Legacy Quarantine Schema Readiness** | `PROPOSED_NOT_IMPLEMENTED` | Inspected `projectState.ts`: `legacyNodePositions` field DOES NOT EXIST in active source code. Proposed schema is an implementation prerequisite for Track B. |
| **7. Migration Readiness** | `BLOCKED` | Provenance-based M1/M2 policy defined. Blocked pending Track B Gate D authorization and quarantine schema implementation. |
| **8. Rollback Readiness** | `CONDITIONALLY_READY` | Non-destructive reverse-patch procedure defined with tightened preconditions and multi-scope diff checks. Pending isolation and review of actual DEF-01 patch diff. |
| **9. Product-Gate Status** | `BLOCKED` | 0 decision records exist in `context/CURRENT-DECISIONS.md` for Gates A, B, C, or D. All options remain unresolved choices marked `PROPOSED DEFAULT — NOT APPROVED`. |
| **10. Overall Implementation Readiness** | `TRACK_A_PENDING / TRACK_B_BLOCKED` | Track A (DEF-01) pending code review authorization; Track B (Gates A–D & state migration) strictly blocked. |

---

## 7. Separation of Facts, Inferences, Recommendations, and Decisions

- **Verified Fact (Tier 2):** Lines 169–171 and 219–221 in `architecture-layout.ts` forcibly copy `existingPositions` into Orbit/Constellation layout outputs.
- **Verified Fact (Tier 2):** `legacyNodePositions` DOES NOT EXIST in `projectState.ts`.
- **Verified Fact (Tier 2):** Tests `TST-STG1-01` and `TST-STG1-02` DO NOT EXIST in `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx`.
- **Verified Fact (Tier 2):** `TST-STG1-03` exists at `explorer/src/lib/adapters/component-orbit-adapter.test.ts`; `TST-STG1-05` exists at `explorer/src/lib/layout/orbit-layout.test.ts`.
- **Verified Fact (Tier 1):** `context/CURRENT-DECISIONS.md` contains ZERO approved decision records for Gates A, B, C, or D.
- **Technical Inference:** Deleting lines 169–171 and 219–221 enforces Position Authority Level 4 pure calculation rules without affecting DOM rendering or storage persistence.
- **Engineering Recommendation:** The documentation package is **RECOMMENDED FOR TRACK A CODE-REVIEW AUTHORIZATION** to proceed with the DEF-01 technical correction and test creation in a separately authorized implementation phase. *This recommendation does NOT constitute implementation authorization.*
- **Unresolved Decision:** Product Authority selection for Gates A–D in `context/CURRENT-DECISIONS.md`.
