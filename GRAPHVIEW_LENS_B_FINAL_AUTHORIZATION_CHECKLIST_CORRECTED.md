# GRAPHVIEW LENS B — FINAL AUTHORIZATION CHECKLIST (CORRECTED)

## 1. Track A vs. Track B Authorization Status Summary

To prevent product decision blockers from halting independent bug fixes, authorizations are tracked on two separate operational tracks with standalone milestones:

- **Track A (Independent DEF-01 Technical Correction):** `PENDING_CODE_REVIEW`
  - Technical contract verified; pending code review approval.
  - Zero product decision blockers (0% dependency on Gates A–D).
  - Standalone milestone for technical fix, test creation (`TST-STG1-01` & `02`), and independent validation.
- **Track B (Product-Gate Dependent Changes):** `BLOCKED`
  - 0 decision records in `context/CURRENT-DECISIONS.md` for Gates A, B, C, or D.
  - Standalone milestone for product features, state schema updates, and workspace integration.

---

## 2. Track B — Product Decisions Checklist (Gates A–D)

Before Track B implementation or Lens B contract freeze can occur, Product Authority must approve and record choices in `context/CURRENT-DECISIONS.md`.

*All selections are currently PROPOSED DEFAULTS and remain UNAPPROVED until an attributable decision record is created in `context/CURRENT-DECISIONS.md`. No choice is presupposed.*

- [ ] **Gate A — Shared SObject Representation Workstream:**
  - Option Selection: `[ ] A1 (Multi-Tethers) | [ ] A2 (Single Node + Non-Semantic Anchor + SHARED Badge) [PROPOSED DEFAULT — NOT APPROVED] | [ ] A3 (Proxy Clones)`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES` (Status: `UNAPPROVED / BLOCKED`)

- [ ] **Gate B — Angular Placement Semantics Workstream:**
  - Option Selection: `[ ] B1 (Geometry Uniform Packing) [PROPOSED DEFAULT — NOT APPROVED] | [ ] B2 (Semantic Domain Sectors)`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES` (Status: `UNAPPROVED / BLOCKED`)

- [ ] **Gate C — Excluded Node Visibility Policy Workstream:**
  - Option Selection: `[ ] C1 (Hide Unreachable Nodes) [PROPOSED DEFAULT — NOT APPROVED] | [ ] C2 (Categorize Badges) | [ ] C3 (Peripheral Shell)`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES` (Status: `UNAPPROVED / BLOCKED`)

- [ ] **Gate D — Drag Position Persistence Scope Workstream:**
  - Option Selection: `[ ] D1 (Session-Only) | [ ] D2 (Mode-Scoped) | [ ] D3 (Composite Mode+Focal Scoped) [PROPOSED DEFAULT — NOT APPROVED]`
  - Recorded in `context/CURRENT-DECISIONS.md`: `[ ] YES` (Status: `UNAPPROVED / BLOCKED`)

---

## 3. Track A — Technical Corrections Checklist (DEF-01 Standalone Milestone)

Independent technical defect correction in `explorer/src/lib/architecture-layout.ts`:

- [ ] **DEF-01 — Remove Stale Position Merge Loop in `architecture-layout.ts`:**
  - Source defect verified at L169–171 (Constellation branch) and L219–221 (Orbit branch): `[x] VERIFIED`
  - Position Authority Level 4 pure calculation contract violation confirmed: `[x] VERIFIED`
  - Track A implementation isolated from Gates A–D: `[x] VERIFIED`
  - Code review authorization received: `[ ] PENDING_CODE_REVIEW`
  - Delete L169–171 (Constellation stale position copy loop): `[ ] NOT STARTED`
  - Delete L219–221 (Orbit stale position copy loop): `[ ] NOT STARTED`
  - Add missing unit test TST-STG1-01 (Orbit stale loop removal assertion): `[ ] MISSING (REQUIRED IN TRACK A)`
  - Add missing unit test TST-STG1-02 (Constellation stale loop removal assertion): `[ ] MISSING (REQUIRED IN TRACK A)`
  - Verified `orbitPositions` contains ONLY projected focal nodes: `[ ] UNVERIFIED (PENDING AUTHORIZED FIX)`
  - Verified `constellationPositions` contains ONLY projected constellation nodes: `[ ] UNVERIFIED (PENDING AUTHORIZED FIX)`

---

## 4. Track B — State Migration & Quarantine Schema Checklist (DEF-02 Prerequisite)

- [ ] **Quarantine Schema Definition (Prerequisite):** Proposed `legacyNodePositions` field added to `GraphLayoutState` interface in `projectState.ts`: `[ ] PROPOSED / UNIMPLEMENTED`
- [ ] **M1 Proven-Context Migration:** Legacy flat entries migrated ONLY when explicit historical metadata proves origin context: `[ ] UNIMPLEMENTED / BLOCKED`
- [ ] **M2 Default Compatibility Quarantine:** Ambiguous/unproven legacy entries retained in `legacyNodePositions` compatibility store without active assignment to `hierarchical/global`: `[ ] UNIMPLEMENTED / BLOCKED`
- [ ] **Data Preservation:** Zero loss of user drag coordinates during schema updates: `[ ] UNIMPLEMENTED / BLOCKED`
- [ ] **Cross-Context Isolation:** User drag in LWC A Orbit view exerts zero effect on LWC B Orbit view or Hierarchical view: `[ ] UNIMPLEMENTED / BLOCKED`

---

## 5. Truthful Test Inventory & Execution Disclosure (TST-STG1-01 through TST-STG1-06)

| Test ID | Test Target / Description | Canonical Repository-Relative Path | Implementation Status | Assertion Inspected | Historical Claim | Current-Run Execution Result | Track A Status |
|---|---|---|---|---|---|---|---|
| **TST-STG1-01** | Orbit L219–221 stale merge loop removal assertion | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | `DEFINED / MISSING` | N/A (Missing) | Historical report claim | **NOT EXECUTED IN THIS RUN** | **PREREQUISITE FOR TRACK A VALIDATION** |
| **TST-STG1-02** | Constellation L169–171 stale merge loop removal assertion | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | `DEFINED / MISSING` | N/A (Missing) | Historical report claim | **NOT EXECUTED IN THIS RUN** | **PREREQUISITE FOR TRACK A VALIDATION** |
| **TST-STG1-03** | Projected coordinate fidelity ($0.00000\text{px}$ drift) | `explorer/src/lib/adapters/component-orbit-adapter.test.ts` | `EXISTS` | `VERIFIED` | 31/31 CLI pass | **NOT EXECUTED IN THIS RUN** | Baseline regression check |
| **TST-STG1-04** | Hierarchical mode fallback protection | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | `EXISTS` | `VERIFIED` | 31/31 CLI pass | **NOT EXECUTED IN THIS RUN** | Baseline regression check |
| **TST-STG1-05** | Empty / minimal graph edge case normalization | `explorer/src/lib/layout/orbit-layout.test.ts` | `EXISTS` | `VERIFIED` | 31/31 CLI pass | **NOT EXECUTED IN THIS RUN** | Baseline regression check |
| **TST-STG1-06** | Level 1–5 Position Authority pure calculation check | `explorer/src/test/Phase2FA_CoreArchitecture.test.tsx` | `EXISTS` | `VERIFIED` | 31/31 CLI pass | **NOT EXECUTED IN THIS RUN** | Baseline regression check |

*Disclosure: No tests were executed in this current documentation task. Historical claims are derived from audit artifact `audit-evidence/features/FEAT-PERF/cli-integration.log`.*

---

## 6. Working-Tree and Tightened Rollback Safeguards

- [x] **Pre-Implementation Baseline Captured:** Clean pre-implementation baseline recorded via `git status --porcelain`.
- [x] **Multi-Scope Differential Mechanics Documented:** `git diff` (unstaged), `git diff --staged` (index), and `git diff HEAD` (combined) explicitly distinguished. None alone is treated as proof of patch isolation.
- [x] **Tightened Patch Isolation Preconditions Established:**
  - Target file must match clean recorded pre-implementation baseline.
  - Pre-existing staged, unstaged, overlapping, or unattributable changes prohibit automated patch reversal.
  - Patch file must contain strictly the single authorized DEF-01 change (L169–171 & L219–221 deletions).
  - Combined diffs containing unrelated edits prohibit automated rollback.
  - Ownership or baseline uncertainty triggers immediate STOP condition requiring manual reconciliation.
- [x] **Non-Destructive Patch Reversion Protocol Defined:** Reverse patch protocol (`git apply -R stage1_def01.patch`) documented.
- [ ] **Patch Diff Isolated & Reviewed:** Patch file `stage1_def01.patch` created and verified clean: `[ ] PENDING IMPLEMENTATION AUTHORIZATION`
- [x] **Audit Deliverables Protection:** Uncommitted documentation deliverables (`GRAPHVIEW_LENS_B_*.md`) protected from destructive commands (`git checkout .` prohibited).
- [ ] **Rollback Readiness Classification:** `CONDITIONALLY_READY` (Pending generation and review of isolated DEF-01 patch).

---

## 7. Stage Readiness & Standalone Milestone Breakdown

| Implementation Stage | Track | Scope & Prerequisites | Clearance Status | Blockers / Conditions Preventing Start |
|---|---|---|---|---|
| **Stage 0 — Governance Prerequisites** | Governance | Retrieve and verify context across repository | **COMPLETE** | None |
| **Stage 1 — DEF-01 Standalone Technical Milestone** | Track A | Code review approval for L169–171 & L219–221 deletion + creation of TST-STG1-01 & 02 | **PENDING_CODE_REVIEW** | Code review authorization pending |
| **Stage 2 — Track B Product Decisions** | Track B | Signed decision records in `context/CURRENT-DECISIONS.md` for Gates A–D | **BLOCKED** | Missing Product Authority decision records |
| **Stage 3 — Full Workspace Integration Milestone** | Track A & B | Completion of Stage 1 (Track A) and Stage 2 (Track B) | **BLOCKED ON STAGE 2** | Stage 2 incomplete |

*Note: Track A validation and completion occurs within Stage 1 and does NOT depend on Stage 2 or Stage 3.*

---

## 8. Truthful 10-Part Readiness Dimension Model

| Readiness Dimension | Status Classification | Source Evidence & Summary |
|---|---|---|
| **1. DEF-01 Technical-Contract Readiness** | `READY` | Source defect at L169–171 and L219–221 in `architecture-layout.ts` verified. Violation of Position Authority Level 4 confirmed. |
| **2. DEF-01 Implementation Authorization** | `PENDING_CODE_REVIEW` | Scope isolated to Track A. Pending explicit code review authorization before implementation attempt. |
| **3. Track A Test Readiness** | `CONDITIONALLY_READY` | Tests `TST-STG1-03` through `06` exist at canonical paths. Tests `TST-STG1-01` and `02` are missing and must be created during Track A implementation. |
| **4. Track A Validation Readiness** | `PENDING_AUTHORIZATION` | Blocked on code review approval for Track A and creation of missing unit tests `TST-STG1-01` and `TST-STG1-02`. |
| **5. Track B Integration Readiness** | `BLOCKED` | Dependent on Gate A–D product decision records in `context/CURRENT-DECISIONS.md`. |
| **6. Legacy Quarantine Schema Readiness** | `PROPOSED_NOT_IMPLEMENTED` | Inspected `projectState.ts`: `legacyNodePositions` field DOES NOT EXIST in active source code. Proposed schema is an implementation prerequisite for Track B. |
| **7. Migration Readiness** | `BLOCKED` | Provenance-based M1/M2 policy defined. Blocked pending Track B Gate D authorization and quarantine schema implementation. |
| **8. Rollback Readiness** | `CONDITIONALLY_READY` | Non-destructive reverse-patch procedure defined with tightened preconditions and multi-scope diff checks. Pending isolation and review of actual DEF-01 patch diff. |
| **9. Product-Gate Status** | `BLOCKED` | 0 decision records exist in `context/CURRENT-DECISIONS.md` for Gates A, B, C, or D. All options remain unresolved choices marked `PROPOSED DEFAULT — NOT APPROVED`. |
| **10. Overall Implementation Readiness** | `TRACK_A_PENDING / TRACK_B_BLOCKED` | Track A (DEF-01) pending code review authorization; Track B (Gates A–D & state migration) strictly blocked. |

---

## 9. Acceptance Criteria Required Before Lens B Freeze Declaration

The Lens B lens may be declared **PRODUCT CONTRACT FROZEN (A)** and **TECHNICAL IMPLEMENTATION VERIFIED (T1)** only when:

1. [ ] `context/CURRENT-DECISIONS.md` contains signed product decision records for Gates A, B, C, and D.
2. [ ] `computeArchitectureLayoutWithMetadata` returns positions strictly for projected focal/constellation nodes in Orbit and Constellation modes.
3. [ ] Unreachable nodes leave Cytoscape DOM canvas rendering in Orbit mode (Gate C).
4. [ ] User drag overrides in LWC A view exert zero position effect in LWC B view or Hierarchical view (Gate D).
5. [ ] Shared SObjects render with `"SHARED"` badge without implying exclusive ownership (Gate A).
6. [ ] Proposed `legacyNodePositions` schema is implemented and legacy flat JSON state migrates/quarantines automatically without data loss or unproven active assignments.
7. [ ] Missing unit tests `TST-STG1-01` and `TST-STG1-02` are created, and all 6 Track A tests (`TST-STG1-01` through `TST-STG1-06`) pass 100%.
8. [ ] Master CLI integration test suite passes 100% (`npm run test:cli`).
9. [ ] Zero position authority coordinate drift (`0.00000px`).
