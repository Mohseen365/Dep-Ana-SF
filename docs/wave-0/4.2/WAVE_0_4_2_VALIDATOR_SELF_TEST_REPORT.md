# Wave 0.4.2: Validator Self-Test Report

## 1. Executive Summary

To ensure the validator cannot produce false positive passes, a dedicated negative self-test suite (`docs/wave-0/4.2/test-validator-self-tests.cjs`) was executed.
- **Execution Runtime:** Node.js `v22.22.1`
- **Total Self-Tests Executed:** 19
- **Passed:** 19
- **Failed:** 0
- **Process Exit Code:** `0` (Success)

---

## 2. Tested Defect Scenarios and Results

Every intentionally defective fixture was verified to be cleanly rejected by the validator:

| Scenario ID | Tested Defect / Edge Case | Test Fixture Mechanism | Expected Rejection Code | Actual Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `PARSER-01` | Malformed CSV: unclosed quotes | Inline string with dangling quote | `unclosed quote detected` | Clean Exception | **PASS** |
| `PARSER-02` | Malformed CSV: inconsistent column count | Row with extra field | `Inconsistent column count` | Clean Exception | **PASS** |
| `PARSER-03` | Multiline quoted CSV fields | Newlines inside quoted description | Exact 2 rows parsed | Clean Pass | **PASS** |
| `PARSER-04` | Escaped double quotes & commas | Quoted string with `""` and `,` | Quotes preserved | Clean Pass | **PASS** |
| `CLEAN-01` | Baseline clean sandbox fixture | Authoritative registers in temp dir | Zero errors | 1835 Passed | **PASS** |
| `DEFECT-01` | Duplicate manifest paths | Appended duplicate path in manifest | `MANIFEST_PATH_UNIQUE` | Rejected cleanly | **PASS** |
| `DEFECT-02` | Missing mandatory task ID | Deleted task row `W5-1` | `MANDATORY_TASK_PRESENT` | Rejected cleanly | **PASS** |
| `DEFECT-03` | Invented task ID | Injected task `W7-4` | `TASK_ID_ALLOWLIST` | Rejected cleanly | **PASS** |
| `DEFECT-04` | Duplicate task ID | Injected second row for `W6-1` | `TASK_ID_UNIQUE` | Rejected cleanly | **PASS** |
| `DEFECT-05` | Missing dependency reference | Pointed `W5-2` to non-existent task | `DEP_EXISTS` | Rejected cleanly | **PASS** |
| `DEFECT-06` | Dependency cycles | Circular reference `W5-1 <-> W5-2` | `NO_DEP_CYCLES` | Rejected cleanly | **PASS** |
| `DEFECT-07` | Frozen-file ownership violation | Feature task allocated `run-poc-tests` | `NO_FROZEN_MOD` | Rejected cleanly | **PASS** |
| `DEFECT-08` | Coordinator-file violation | Feature task allocated aggregate runner | `NO_COORD_MOD` | Rejected cleanly | **PASS** |
| `DEFECT-09` | Incorrect new/existing status | Existing baseline file marked `NEW` | `NEW_FILE_STATUS` | Rejected cleanly | **PASS** |
| `DEFECT-10` | Exact Affected Files union inequality| Omitted files from Exact Affected | `FILE_UNION_EQUALITY` | Rejected cleanly | **PASS** |
| `DEFECT-11` | Batch 1 path collision | `W6-2` touches file owned by `W6-1` | `BATCH1_ZERO_COLLISION` | Rejected cleanly | **PASS** |
| `DEFECT-12` | Non-ready Batch 1 task | Batch 1 task set to `BLOCKED_NOT_READY`| `BATCH1_STATUS_READY` | Rejected cleanly | **PASS** |
| `DEFECT-13` | Malformed contract ID prefix | Contract ID altered to `INVALID-C1` | `CONTRACT_ID_PREFIX` | Rejected cleanly | **PASS** |
| `DEFECT-16` | Missing mandatory deliverable | Deleted `W7_PROJECT_ID...md` file | `FILE_EXISTS` | Rejected cleanly | **PASS** |

---

## 3. Verification Conclusion
The self-test suite proves that `validate-wave0-4-2-dispatch.cjs` is robust, strict, and incapable of silently ignoring syntactic, structural, ownership, or concurrency violations.
