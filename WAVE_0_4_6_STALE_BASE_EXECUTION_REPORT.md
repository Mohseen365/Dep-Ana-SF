# WAVE 0.4.6 STALE BASE GATE REPORT

This report documents the verification of strict base SHA comparison (`expectedBaseSha === patchBaseSha === currentHeadSha`). Stale current HEAD or patch base mismatches are rejected before modifying any file.

## Scenario Execution Matrix

| ID | Level | Description | Expected | Actual | Exit Code | Finding ID | Log File |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| BASE-01 | INTEGRATION | "Expected base, patch base, and current HEAD all match" | BASE_MATCH_ACCEPTED | BASE_MATCH_ACCEPTED | 0 | NONE | `BASE-01.log` |
| BASE-02 | INTEGRATION | "Patch declared base differs from approved base SHA" | REJECTED_PATCH_BASE_MISMATCH | REJECTED_PATCH_BASE_MISMATCH | 0 | BASE_MISMATCH | `BASE-02.log` |
| BASE-03 | INTEGRATION | "Current HEAD differs from approved base while patch declares approved base" | REJECTED_CURRENT_HEAD_MISMATCH | REJECTED_CURRENT_HEAD_MISMATCH | 0 | BASE_MISMATCH | `BASE-03.log` |
| BASE-04 | INTEGRATION | "Current HEAD advanced after approved base; patch rejected without file mutation" | REJECTED_STALE_HEAD_MUTATION | REJECTED_STALE_HEAD_MUTATION | 0 | BASE_MISMATCH | `BASE-04.log` |
| BASE-05 | UNIT | "Missing expected base SHA rejected" | REJECTED_MISSING_BASE_SHA | REJECTED_MISSING_BASE_SHA | 0 | MALFORMED_BASE_SHA | `BASE-05.log` |
| BASE-06 | UNIT | "Malformed short base SHA rejected" | REJECTED_MALFORMED_BASE_SHA | REJECTED_MALFORMED_BASE_SHA | 0 | MALFORMED_BASE_SHA | `BASE-06.log` |

## Verification & Integrity
- Total Scenarios: 6
- Total Pass: 6
- Total Fail: 0
- All tests executed in isolated environments with raw logs and SHA-256 hashes captured.
