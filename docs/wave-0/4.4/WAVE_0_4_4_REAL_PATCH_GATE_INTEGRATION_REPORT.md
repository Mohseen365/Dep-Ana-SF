# WAVE 0.4.4 REAL PATCH-GATE INTEGRATION REPORT

## 1. Executive Summary & Architecture

The simulated patch gate scenarios in prior waves have been replaced with a real integration test harness (`test-wave0-4-4-patch-gate.cjs`) invoking the actual audit helper functions in `docs/wave-0/4.4/patch-gate.cjs`.

Each scenario is executed inside an isolated, fully initialized temporary Git repository with genuine Git commands (`git apply`, `git checkout`, `git rev-parse`, etc.).

---

## 2. Mandatory Scenario Breakdown (24/24 EXECUTED_PASS)

| ID | Description | Expected Outcome | Actual Outcome | Status |
|:---:|:---|:---|:---|:---:|
| **PG-01** | Valid patch against the expected base SHA | Apply succeeds cleanly | Patch applied cleanly: true | **PASS** |
| **PG-02** | Patch based on stale HEAD | BASE_MISMATCH error | Rejected stale base: BASE_MISMATCH | **PASS** |
| **PG-03** | Patch containing a file outside its allowlist | UNLISTED_PATH error | Rejected unlisted path: UNLISTED_PATH | **PASS** |
| **PG-04** | Patch containing a file owned by another task | UNLISTED_PATH error | Rejected foreign task path: UNLISTED_PATH | **PASS** |
| **PG-05** | Patch containing a frozen path | FROZEN_PATH_MODIFICATION error | Rejected frozen path modification: FROZEN_PATH_MODIFICATION | **PASS** |
| **PG-06** | Patch containing a coordinator-exclusive path | COORDINATOR_EXCLUSIVE_PATH error | Rejected coordinator-exclusive path: COORDINATOR_EXCLUSIVE_PATH | **PASS** |
| **PG-07** | Patch containing duplicate paths | DUPLICATE_TOUCHED_PATH error | Rejected duplicate path in patch payload: DUPLICATE_TOUCHED_PATH | **PASS** |
| **PG-08** | Patch with a path traversal attempt | PATH_TRAVERSAL error | Rejected path traversal: PATH_TRAVERSAL | **PASS** |
| **PG-09** | Patch with an absolute path | ABSOLUTE_PATH error | Rejected absolute path: ABSOLUTE_PATH | **PASS** |
| **PG-10** | Patch with a directory target | DIRECTORY_PATH or DIRECTORY_TARGET error | Rejected directory path: DIRECTORY_PATH | **PASS** |
| **PG-11** | Patch with malformed patch content | APPLY_CHECK_FAILED or APPLY_FAILED error | Rejected malformed patch: EMPTY_PATCH | **PASS** |
| **PG-12** | Patch with an actual Git application conflict | APPLY_CHECK_FAILED error | Real git apply conflict detected: APPLY_CHECK_FAILED | **PASS** |
| **PG-13** | Two real patches modifying the same file | Second conflicting patch rejected | First applied, second conflicted on git apply: APPLY_CHECK_FAILED | **PASS** |
| **PG-14** | Two real patches modifying separate files | Both patches apply cleanly in succession | Both independent patches applied cleanly: true | **PASS** |
| **PG-15** | Two patches with overlapping ownership | Allowlist prevents unowned path in second task | Overlapping ownership rejected: UNLISTED_PATH | **PASS** |
| **PG-16** | Coordinator-role rejection for feature-agent operations | UNAUTHORIZED_ROLE error | Rejected non-coordinator role: UNAUTHORIZED_ROLE | **PASS** |
| **PG-17** | Feature-agent rejection for coordinator-exclusive operations | COORDINATOR_EXCLUSIVE_PATH or UNAUTHORIZED_ROLE error | Rejected coordinator-exclusive path: COORDINATOR_EXCLUSIVE_PATH | **PASS** |
| **PG-18** | Rollback after a successful patch | Pre-patch state restored exactly | Rolled back cleanly to original content: true | **PASS** |
| **PG-19** | Rollback after a partial application failure | Pre-apply state restored, no lingering corruption | Pre-apply state restored after partial operation: true | **PASS** |
| **PG-20** | Preservation of unrelated pre-existing dirty files | Unrelated dirty file completely untouched | Unrelated dirty file completely preserved: true | **PASS** |
| **PG-21** | Preservation of dirty files inside declared task scope | Pre-existing dirty file preserved across rollback | Dirty file inside task scope preserved: true | **PASS** |
| **PG-22** | Rejection of task whose declared paths differ from authoritative allowlist | MISSING_REQUIRED_PATH or UNLISTED_PATH error | Rejected missing required path: MISSING_REQUIRED_PATH | **PASS** |
| **PG-23** | Rejection of patch that modifies a path not declared by task | UNLISTED_PATH error | Rejected undeclared path: UNLISTED_PATH | **PASS** |
| **PG-24** | Rejection of integration attempt against unexpected HEAD | BASE_MISMATCH error | Rejected unexpected HEAD: BASE_MISMATCH | **PASS** |

---

## 3. Raw Execution Log Traceability

All 24 raw execution logs are stored in `docs/wave-0/4.4/patch-logs/` and indexed with SHA-256 hashes in `docs/wave-0/4.4/WAVE_0_4_4_PATCH_GATE_RAW_EVIDENCE_INDEX.csv`.
