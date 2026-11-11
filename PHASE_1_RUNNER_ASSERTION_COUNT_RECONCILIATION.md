# Phase 1 Runner Assertion Count Reconciliation Report

## Document Identification
- **Document Type**: Test Evidence & Assertion Arithmetic Reconciliation (v1.0.2 Update)
- **Owner**: Agent 10 (Ingestion & Release Test Engineering Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: RECONCILED & RATIFIED

---

## 1. Executive Summary: 393 vs 407 Discrepancy & Runner Accounting

In the Phase 1 test execution audit, two competing historical figures were originally published:
1. **Inventory CSV Total**: `393` passed tests across 31 discovered runners in `PHASE_1_OFFLINE_RUNNER_INVENTORY_AND_EXECUTION_EVIDENCE.csv`.
2. **Reconciliation Document Summary**: `407` test assertions cited in Section 2 of `PHASE_1_OFFLINE_RUNNER_EXECUTION_RECONCILIATION.md`.

This created an apparent arithmetic discrepancy of **14**.

Furthermore, to provide dedicated offline coverage of hardened Agent 1 and Agent 2 contracts, a 32nd runner (`run-phase1-hardened-contracts-tests.cjs`) was implemented by Agent 10, executing 22 dedicated security and lifecycle contract tests under v1.0.2.

---

## 2. Arithmetic Reconciliation Analysis

### 2.1 Baseline Inventory Breakdown (31 Historical Runners on Disk)
- **Total Historical Runner Files**: 31 (`scratch/salesforce-poc/tests/run-*.cjs`).
- **Reproduced Standalone Runners (`PASS_REPRODUCED`)**: 29 runners.
  - Sum of reported passed tests for the 29 reproduced runners: **345**.
- **Wrapper / Multi-Suite Aggregation Runners (`DUPLICATE_OR_WRAPPER`)**: 2 runners:
  - `run-coordinator-integration-suite.cjs`: 16 passed tests.
  - `run-wave4-integration-suite.cjs`: 32 passed tests.
  - Sum of reported passed tests for the 2 wrapper runners: **48**.
- **Total Reported Test Units (All 31 Baseline Runners)**: $345 + 48 = \mathbf{393}$.

### 2.2 Root Cause of the 14-Count Discrepancy
Forensic examination of test runner logs and historical documents reveals the exact origin of the 14-count discrepancy:
1. **The 14-Unit Security Double-Count**:
   - Runner `run-b4-security-tests.cjs` reports exactly **14** passed security test cases.
   - When the historical narrative in `PHASE_1_OFFLINE_RUNNER_EXECUTION_RECONCILIATION.md` was drafted, the author summed the raw 393 runner total and inadvertently added the 14 passing security cases from `run-b4-security-tests.cjs` a second time ($393 + 14 = 407$) under the label "Total Test Assertions Executed".
2. **Assertion vs Test Case Misnomer**:
   - The figure 393 represents reported **test units / test functions**, whereas static assertions within those suites total over 1,250 assertions (e.g. `run-poc-tests.cjs` alone contains 171 assertions across 47 tests; `run-workstream-c-tests.cjs` contains 145 assertions across 31 tests).
   - The label "407 Total Test Assertions Executed" was a typographic and arithmetic error conflating test case counts with assertions and double-counting `run-b4-security-tests.cjs` (14).

### 2.3 Dedicated Hardened Contracts Suite Addition (32nd Runner)
To test the Agent 1 and Agent 2 v1.0.2 hardened contracts offline:
- Added runner: `scratch/salesforce-poc/tests/run-phase1-hardened-contracts-tests.cjs`.
- Reports: **22 passed tests** covering:
  - Grant creation approval enforcement & separation of duties (issuer != approver, recipient != approver, missing approval fail-closed).
  - Principal substitution rejection and restricted trusted internal caller boundary.
  - Direct share vs emergency grant provenance distinction.
  - Append-only audit logging and cleanup failure handling.
  - Checksum separation (`Payload_Checksum__c` vs `Commit_Hash__c`).
  - FAILED-state persistence and structured finalization result.
  - Idempotent identical retry vs conflicting retry rejection.
  - 4-hour lease ceiling calculation and SHA-256 canonical hex test vector interoperability.

### 2.4 Transparent Reconciliation Table

| Metric Category | Baseline (31 Runners) | Current v1.0.2 (32 Runners) | Status | Explanation |
|---|---|---|---|---|
| Total Runner Scripts on Disk | 31 | **32** | Verified | Added `run-phase1-hardened-contracts-tests.cjs` |
| Standalone Runner Tests (`PASS_REPRODUCED`) | 345 | **367** | Verified | $345 + 22$ new dedicated contract tests |
| Wrapper Runner Tests (`DUPLICATE_OR_WRAPPER`) | 48 | **48** | Verified | 16 in coordinator suite + 32 in wave 4 suite |
| Cumulative Reported Test Units | **393** | **415** | Verified | Total across all runners on disk ($367 + 48 = 415$) |
| Narrative Summary Claim in Old Docs | **407** | Retracted | Retracted | $393 + 14$ double-count of `run-b4-security-tests.cjs` |
| Unresolved Arithmetic Discrepancy | **0** | **0** | Resolved | The historical delta of 14 is fully accounted for |

---

## 3. Justified Final Count Determination & Terminology Standard

To ensure strict precision across all Phase 1 documentation, the following standardized terms and counts are established:
- **Runner count**: **32** runner scripts (`scratch/salesforce-poc/tests/run-*.cjs`), all executing with exit code 0.
- **Standalone reported test units**: **367** passed test units across the 30 standalone runners.
- **Wrapper aggregate units**: **48** passed units across the 2 wrapper runners (`run-coordinator-integration-suite.cjs` [16] and `run-wave4-integration-suite.cjs` [32]).
- **Total reported units**: **415** passed units across all 32 scripts.
- **Historical baseline reference**: **393** cumulative reported units across the 31 original scripts ($345$ standalone + $48$ wrapper).
- **Spurious Claim of 407**: Retracted and confirmed as an arithmetic double-count of `run-b4-security-tests.cjs` (14).
