# WAVE 0.4.6 AUTHORITATIVE OWNERSHIP GATE REPORT

This report documents the verification of authoritative ownership enforcement in `docs/wave-0/4.5/patch-gate.cjs`. Caller-supplied allowlists are rejected in favor of authoritative resolution from repository registers.

## Scenario Execution Matrix

| ID | Level | Description | Expected | Actual | Exit Code | Finding ID | Log File |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| OWN-01 | INTEGRATION | "Valid task (W5-1) modifies its authorized file" | APPLIED_SUCCESSFULLY | APPLIED_SUCCESSFULLY | 0 | NONE | `OWN-01.log` |
| OWN-02 | INTEGRATION | "Task cannot modify another task file (W6-1 attempting daGraphViewer)" | REJECTED_FOREIGN_TASK_PATH | REJECTED_FOREIGN_TASK_PATH | 0 | UNLISTED_PATH | `OWN-02.log` |
| OWN-03 | INTEGRATION | "Caller cannot expand task allowlist beyond authoritative register" | REJECTED_FORGED_ALLOWLIST | REJECTED_FORGED_ALLOWLIST | 0 | UNLISTED_PATH | `OWN-03.log` |
| OWN-04 | INTEGRATION | "Task cannot modify a frozen path (sfdx-project.json)" | REJECTED_FROZEN_PATH | REJECTED_FROZEN_PATH | 0 | FROZEN_PATH_MODIFICATION | `OWN-04.log` |
| OWN-05 | INTEGRATION | "Non-coordinator cannot modify coordinator-only path (daAppShell.js)" | REJECTED_COORDINATOR_EXCLUSIVE | REJECTED_COORDINATOR_EXCLUSIVE | 0 | COORDINATOR_EXCLUSIVE_PATH | `OWN-05.log` |
| OWN-06 | INTEGRATION | "Non-coordinator cannot impersonate coordinator by role string" | REJECTED_ROLE_IMPERSONATION | REJECTED_ROLE_IMPERSONATION | 0 | UNAUTHORIZED_ROLE | `OWN-06.log` |
| OWN-07 | INTEGRATION | "Missing/unregistered task ID is rejected fail-closed" | REJECTED_UNKNOWN_TASK | REJECTED_UNKNOWN_TASK | 0 | UNKNOWN_TASK | `OWN-07.log` |
| OWN-08 | INTEGRATION | "Task outside Batch 1 boundary (W9-2) rejected when Batch 1 active" | REJECTED_TASK_OUTSIDE_BATCH1 | REJECTED_TASK_OUTSIDE_BATCH1 | 0 | TASK_OUTSIDE_BATCH1 | `OWN-08.log` |
| OWN-09 | UNIT | "Duplicate task record in register causes immediate fail-closed rejection" | REJECTED_DUPLICATE_TASK_ID | REJECTED_DUPLICATE_TASK_ID | 0 | DUPLICATE_TASK_ID | `OWN-09.log` |
| OWN-10 | INTEGRATION | "Missing manifest path causes fail-closed rejection" | REJECTED_UNREGISTERED_MANIFEST_PATH | REJECTED_UNREGISTERED_MANIFEST_PATH | 0 | UNLISTED_PATH | `OWN-10.log` |

## Verification & Integrity
- Total Scenarios: 10
- Total Pass: 10
- Total Fail: 0
- All tests executed in isolated environments with raw logs and SHA-256 hashes captured.
