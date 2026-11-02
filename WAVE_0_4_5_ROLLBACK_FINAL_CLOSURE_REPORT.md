# WAVE 0.4.5 ROLLBACK FINAL CLOSURE REPORT

This report documents the verification of Two-Phase Safe Rollback in `docs/wave-0/4.5/patch-gate.cjs`.

## Scenario Execution Matrix

| ID | Level | Description | Expected | Actual | Exit Code | Finding ID | Log File |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| RB-01 | END_TO_END | "Newly created file removed by rollback" | NEW_FILE_SAFELY_DELETED | NEW_FILE_SAFELY_DELETED | 0 | NONE | `RB-01.log` |
| RB-02 | END_TO_END | "Clean tracked file restored exactly to pre-apply state" | CLEAN_TRACKED_RESTORED_EXACTLY | CLEAN_TRACKED_RESTORED_EXACTLY | 0 | NONE | `RB-02.log` |
| RB-03 | END_TO_END | "Tracked dirty file preserved exact pre-apply bytes" | DIRTY_TRACKED_PRESERVED_EXACTLY | DIRTY_TRACKED_PRESERVED_EXACTLY | 0 | NONE | `RB-03.log` |
| RB-04 | END_TO_END | "Multiple valid files all rolled back cleanly" | MULTI_FILE_ROLLBACK_SUCCESS | MULTI_FILE_ROLLBACK_SUCCESS | 0 | NONE | `RB-04.log` |
| RB-05 | END_TO_END | "Phase A complete preflight prevents partial mutation on corrupt record" | ATOMIC_PREFLIGHT_ZERO_MUTATION | ATOMIC_PREFLIGHT_ZERO_MUTATION | 0 | CORRUPT_PROVENANCE_ENTRY | `RB-05.log` |
| RB-06 | END_TO_END | "Rollback refused when file modified after patch application" | REJECTED_POST_APPLY_OVERWRITE | REJECTED_POST_APPLY_OVERWRITE | 0 | POST_APPLY_MUTATION | `RB-06.log` |
| RB-07 | UNIT | "Rollback without provenance record refused" | REJECTED_MISSING_PROVENANCE | REJECTED_MISSING_PROVENANCE | 0 | PROVENANCE_REQUIRED | `RB-07.log` |
| RB-08 | END_TO_END | "Rollback with caller task mismatch refused" | REJECTED_TASK_MISMATCH | REJECTED_TASK_MISMATCH | 0 | TASK_MISMATCH | `RB-08.log` |

## Verification & Integrity
- Total Scenarios: 8
- Total Pass: 8
- Total Fail: 0
- All tests executed in isolated environments with raw logs and SHA-256 hashes captured.
