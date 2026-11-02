# WAVE 0.4.6 PATCH GATE INTEGRATION CLOSURE REPORT

This report documents the integration tests for patch application and duplicate header detection. Real git apply checks are used and duplicate diff headers or aliases are rejected.

## Scenario Execution Matrix

| ID | Level | Description | Expected | Actual | Exit Code | Finding ID | Log File |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| PG-DUP-01 | UNIT | "Duplicate diff --git headers in patch payload rejected" | REJECTED_DUPLICATE_DIFF_HEADER | REJECTED_DUPLICATE_DIFF_HEADER | 0 | DUPLICATE_TOUCHED_PATH | `PG-DUP-01.log` |
| PG-DUP-02 | UNIT | "Path traversal alias in patch header rejected" | REJECTED_PATH_TRAVERSAL_ALIAS | REJECTED_PATH_TRAVERSAL_ALIAS | 0 | PATH_TRAVERSAL | `PG-DUP-02.log` |
| PG-DUP-03 | UNIT | "Normalized path aliases resolving to same file rejected as duplicate" | REJECTED_NORMALIZED_ALIAS_DUPLICATE | REJECTED_NORMALIZED_ALIAS_DUPLICATE | 0 | DUPLICATE_TOUCHED_PATH | `PG-DUP-03.log` |
| PG-INT-01 | INTEGRATION | "Valid patch applied cleanly using actual git apply" | SEQUENTIAL_APPLY_SUCCESS | SEQUENTIAL_APPLY_SUCCESS | 0 | NONE | `PG-INT-01.log` |

## Verification & Integrity
- Total Scenarios: 4
- Total Pass: 4
- Total Fail: 0
- All tests executed in isolated environments with raw logs and SHA-256 hashes captured.
