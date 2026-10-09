# GRAPHVIEW LENS B — FINAL AUTHORIZATION CHECKLIST (CORRECTED)

## 1. Track A vs. Track B Authorization Status Summary

To prevent product decision blockers from halting independent bug fixes, authorizations are tracked on two separate operational tracks:

- **Track A (Independent DEF-01 Technical Fix):** `PENDING_CODE_REVIEW` (Technical contract verified; pending code review approval; zero product decision blockers).
- **Track B (Product-Gate Dependent Changes):** `BLOCKED` (0 decision records in `context/CURRENT-DECISIONS.md`).

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

## 3. Track A — Technical Corrections Checklist (DEF-01)

Independent technical defect correction in `explorer/src/lib/architecture-layout.ts`:

- [ ] **DEF-01 — Remove Stale Position Merge Loop in `architecture-layout.ts`:**
  - Source defect verified at L169–171 (Constellation branch) and L219–221 (Orbit branch): `[x] VERIFIED`
  - Position Authority Level 4 pure calculation contract violation confirmed: `[x] VERIFIED`
  - Track A implementation isolated from Gates A–D: `[x] VERIFIED`
  - Code review authorization received: `[ ] PENDING`
  - Delete L169–171 (Constellation stale position copy loop): `[ ] NOT STARTED`
  - Delete L219–221 (Orbit stale position copy loop): `[ ] NOT STARTED`
  - Add missing unit test TST-STG1-01 (Orbit stale loop removal assertion): `[ ] MISSING (REQUIRED IN TRACK A)`
  - Add missing unit test TST-STG1-02 (Constellation stale loop removal assertion): `[ ] MISSING (REQUIRED IN TRACK A)`
  - Verified `orbitPositions` contains ONLY projected focal nodes: `[ ] UNVERIFIED (PENDING FIX)`
  - Verified `constellationPositions` contains ONLY projected constellation nodes: `[ ] UNVERIFIED (PENDING FIX)`

---

## 4. Track B — State Migration & Quarantine Schema Checklist (DEF-02)

- [ ] **Quarantine Schema Definition (Prerequisite):** Proposed `legacyNodePositions` field added to `GraphLayoutState` interface in `projectState.ts`: `[ ] PROPOSED / UNIMPLEMENTED`
- [ ] **M1 Proven-Context Migration:** Legacy flat entries migrated ONLY when explicit historical metadata proves origin context: `[ ] UNIMPLEMENTED / BLOCKED`
- [ ] **M2 Default Compatibility Quarantine:** Ambiguous/unproven legacy entries retained in `legacyNodePositions` compatibility store without active assignment to `hierarchical/global`: `[ ] UNIMPLEMENTED / BLOCKED`
- [ ] **Data Preservation:** Zero loss of user drag coordinates during schema updates: `[ ] UNIMPLEMENTED / BLOCKED`
- [ ] **Cross-Context Isolation:** User drag in LWC A Orbit view exerts zero effect on LWC B Orbit view or Hierarchical view: `[ ] UNIMPLEMENTED / BLOCKED`

---

## 5. Truthful Test Readiness Matrix (TST-STG1-01 through TST-STG1-06)

| Test ID | Test Target / Description | Target File Location | Existence Status | Execution Evidence | Track A Status |
|---|---|---|---|---|---|
| **TST-STG1-01** | Orbit L219–221 stale merge loop removal assertion | `Phase2FA_CoreArchitecture.test.tsx` | `DEFINED / MISSING` | Historical claim (not in codebase) | **PREREQUISITE FOR TRACK A VALIDATION** |
| **TST-STG1-02** | Constellation L169–171 stale merge loop removal assertion | `Phase2FA_CoreArchitecture.test.tsx` | `DEFINED / MISSING` | Historical claim (not in codebase) | **PREREQUISITE FOR TRACK A VALIDATION** |
| **TST-STG1-03** | Projected coordinate fidelity ($0.00000\text{px}$ drift) | `component-orbit-adapter.test.ts` | `EXISTS / VERIFIED` | Executed in CLI suite (`31/31 pass`) | Baseline regression check |
| **TST-STG1-04** | Hierarchical mode fallback protection | `Phase2FA_CoreArchitecture.test.tsx` | `EXISTS / VERIFIED` | Executed in CLI suite (`31/31 pass`) | Baseline regression check |
| **TST-STG1-05** | Empty / minimal graph edge case normalization | `orbit-layout.test.ts` | `EXISTS / VERIFIED` | Executed in CLI suite (`31/31 pass`) | Baseline regression check |
| **TST-STG1-06** | Level 1–5 Position Authority pure calculation check | `Phase2FA_CoreArchitecture.test.tsx` | `EXISTS / VERIFIED` | Executed in CLI suite (`31/31 pass`) | Baseline regression check |

---

## 6. Working-Tree and Rollback Safeguards

- [x] **Pre-Implementation Baseline Captured:** `git status` verified clean working tree.
- [x] **Non-Destructive Patch Reversion Procedure Defined:** `git apply -R stage1_def01.patch` documented.
- [ ] **Patch Diff Isolated & Reviewed:** Patch file `stage1_def01.patch` created and verified clean: `[ ] PENDING IMPLEMENTATION`
- [x] **Audit Deliverables Protection:** Uncommitted documentation deliverables (`GRAPHVIEW_LENS_B_*.md`) protected from destructive commands (`git checkout .` prohibited).
- [x] **Stop Conditions Established:** If unrelated edits overlap `architecture-layout.ts`, implementation stops for manual reconciliation.
- [ ] **Rollback Readiness Classification:** `CONDITIONALLY_READY` (Pending patch isolation).

---

## 7. Stage Readiness & Start Conditions

| Implementation Stage | Track | Prerequisites Required | Clearance Status | Conditions Preventing Start |
|---|---|---|---|---|
| **Stage 0 — Prerequisites** | Governance | Retrieve and verify context across repository | **COMPLETE** | None |
| **Stage 1 — DEF-01 Technical Fix** | Track A | Code review approval for L169–171 & L219–221 deletion + Track A tests | **PENDING CODE REVIEW** | Code review authorization pending |
| **Stage 2 — Product Decision Changes** | Track B | Signed decision records in `context/CURRENT-DECISIONS.md` for Gates A–D | **BLOCKED** | Missing Product Authority decision records |
| **Stage 3 — Integration & Validation** | Track A & B | Stage 1 and Stage 2 complete | **BLOCKED ON STAGE 2** | Stage 2 incomplete |

---

## 8. Acceptance Criteria Required Before Lens B Freeze Declaration

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
