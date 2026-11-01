# Wave 0.4.1: Final Ownership and Collision Reconciliation

## 1. Executive Summary & Defect Remediation

During the independent technical audit of Wave 0.4, a critical P0 contradiction was identified between the collision closure narrative and the authoritative task register:
- **Defect Identified:** The Wave 0.4 collision closure report established that feature agents must author only task-specific runners (`run-w<id>-tests.cjs`), while the Integration Coordinator exclusively owns wave-level aggregate test runners (`run-wave<w>-tests.cjs`). However, `WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv` still assigned aggregate runners (`run-wave6-tests.cjs`, `run-wave7-tests.cjs`, `run-wave8-tests.cjs`, `run-wave9-tests.cjs`) under the `Existing Files Modified` column across 10 feature tasks (`W6-2`, `W6-3`, `W6-4`, `W7-1`, `W7-2`, `W7-3`, `W8-2`, `W8-3`, `W9-2`, `W9-3`).
- **Remediation Enacted in Wave 0.4.1:**
  1. Every aggregate runner has been completely expunged from the writable allocations (`Exact Affected Files`, `Existing Files Modified`, `New Files`) of all feature tasks in `WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv`.
  2. The Integration Coordinator exclusively owns the 5 wave-level aggregate runners (`run-wave5-tests.cjs` through `run-wave9-tests.cjs`) and the cross-wave integration suite (`run-coordinator-integration-suite.cjs`).
  3. Feature agents exclusively own only their single dedicated task runner:
     - Wave 5: `run-w5-1-tests.cjs` through `run-w5-6-tests.cjs` (Workstream A)
     - Wave 6: `run-w6-1-tests.cjs` through `run-w6-4-tests.cjs` (Workstream B)
     - Wave 7: `run-w7-p1-tests.cjs`, `run-w7-1-tests.cjs` through `run-w7-3-tests.cjs` (Workstream C)
     - Wave 8: `run-w8-1-tests.cjs` through `run-w8-3-tests.cjs` (Workstream D)
     - Wave 9: `run-w9-1-tests.cjs` through `run-w9-3-tests.cjs` (Workstream E)
  4. The 9 frozen baseline test runners remain completely immutable and assigned to `FROZEN_READ_ONLY`.

---

## 2. Definitive Runner Ownership & Partitioning Matrix

| Test Runner Path | Category | Authoritative Owner | Mutability Tier | Permitted Modifiers |
| :--- | :--- | :--- | :--- | :--- |
| `scratch/salesforce-poc/tests/run-poc-tests.cjs` | Baseline Suite | Repository Baseline | `FROZEN_READ_ONLY` | None (Read-only) |
| `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | Baseline Suite | Repository Baseline | `FROZEN_READ_ONLY` | None (Read-only) |
| `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | Baseline Suite | Repository Baseline | `FROZEN_READ_ONLY` | None (Read-only) |
| `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | Baseline Suite | Repository Baseline | `FROZEN_READ_ONLY` | None (Read-only) |
| `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | Baseline Suite | Repository Baseline | `FROZEN_READ_ONLY` | None (Read-only) |
| `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | Baseline Suite | Repository Baseline | `FROZEN_READ_ONLY` | None (Read-only) |
| `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | Baseline Suite | Repository Baseline | `FROZEN_READ_ONLY` | None (Read-only) |
| `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | Baseline Suite | Repository Baseline | `FROZEN_READ_ONLY` | None (Read-only) |
| `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | Baseline Suite | Repository Baseline | `FROZEN_READ_ONLY` | None (Read-only) |
| `scratch/salesforce-poc/tests/run-w5-1-tests.cjs` | Task Runner | Workstream A Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W5-1` only |
| `scratch/salesforce-poc/tests/run-w5-2-tests.cjs` | Task Runner | Workstream A Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W5-2` only |
| `scratch/salesforce-poc/tests/run-w5-3-tests.cjs` | Task Runner | Workstream A Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W5-3` only |
| `scratch/salesforce-poc/tests/run-w5-4-tests.cjs` | Task Runner | Workstream A Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W5-4` only |
| `scratch/salesforce-poc/tests/run-w5-5-tests.cjs` | Task Runner | Workstream A Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W5-5` only |
| `scratch/salesforce-poc/tests/run-w5-6-tests.cjs` | Task Runner | Workstream A Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W5-6` only |
| `scratch/salesforce-poc/tests/run-w6-1-tests.cjs` | Task Runner | Workstream B Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W6-1` only |
| `scratch/salesforce-poc/tests/run-w6-2-tests.cjs` | Task Runner | Workstream B Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W6-2` only |
| `scratch/salesforce-poc/tests/run-w6-3-tests.cjs` | Task Runner | Workstream B Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W6-3` only |
| `scratch/salesforce-poc/tests/run-w6-4-tests.cjs` | Task Runner | Workstream B Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W6-4` only |
| `scratch/salesforce-poc/tests/run-w7-p1-tests.cjs` | Task Runner | Workstream C Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W7-P1` only |
| `scratch/salesforce-poc/tests/run-w7-1-tests.cjs` | Task Runner | Workstream C Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W7-1` only |
| `scratch/salesforce-poc/tests/run-w7-2-tests.cjs` | Task Runner | Workstream C Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W7-2` only |
| `scratch/salesforce-poc/tests/run-w7-3-tests.cjs` | Task Runner | Workstream C Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W7-3` only |
| `scratch/salesforce-poc/tests/run-w8-1-tests.cjs` | Task Runner | Workstream D Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W8-1` only |
| `scratch/salesforce-poc/tests/run-w8-2-tests.cjs` | Task Runner | Workstream D Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W8-2` only |
| `scratch/salesforce-poc/tests/run-w8-3-tests.cjs` | Task Runner | Workstream D Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W8-3` only |
| `scratch/salesforce-poc/tests/run-w9-1-tests.cjs` | Task Runner | Workstream E Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W9-1` only |
| `scratch/salesforce-poc/tests/run-w9-2-tests.cjs` | Task Runner | Workstream E Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W9-2` only |
| `scratch/salesforce-poc/tests/run-w9-3-tests.cjs` | Task Runner | Workstream E Lead | `EXCLUSIVE_FEATURE_OWNER` | Task `W9-3` only |
| `scratch/salesforce-poc/tests/run-wave5-tests.cjs` | Aggregate Runner | Integration Coordinator | `COORDINATOR_EXCLUSIVE` | Coordinator during Wave 5 integration |
| `scratch/salesforce-poc/tests/run-wave6-tests.cjs` | Aggregate Runner | Integration Coordinator | `COORDINATOR_EXCLUSIVE` | Coordinator during Wave 6 integration |
| `scratch/salesforce-poc/tests/run-wave7-tests.cjs` | Aggregate Runner | Integration Coordinator | `COORDINATOR_EXCLUSIVE` | Coordinator during Wave 7 integration |
| `scratch/salesforce-poc/tests/run-wave8-tests.cjs` | Aggregate Runner | Integration Coordinator | `COORDINATOR_EXCLUSIVE` | Coordinator during Wave 8 integration |
| `scratch/salesforce-poc/tests/run-wave9-tests.cjs` | Aggregate Runner | Integration Coordinator | `COORDINATOR_EXCLUSIVE` | Coordinator during Wave 9 integration |
| `scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs` | Aggregate Runner | Integration Coordinator | `COORDINATOR_EXCLUSIVE` | Coordinator during Task INT-1 |

---

## 3. Disjoint Partitioning Verification

1. **Feature-to-Feature Disjointness:** No two feature tasks in any concurrent dispatch batch share any writable file.
2. **Feature-to-Coordinator Disjointness:** No feature agent is permitted to edit or create aggregate test runners or `daAppShell.*` files. Any patch containing aggregate runners or shell files submitted by a feature agent will be rejected by the coordinator's patch validation gate.
3. **Task-Specific Rollback Isolation:** Because each feature task exclusively modifies its own component bundle and its own task test runner, reverting a feature patch using `git apply --reverse` leaves all other feature components, aggregate runners, and baseline runners untouched.
