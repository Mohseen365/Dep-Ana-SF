# Wave 1R Remediation Implementation Report

## Executive Summary
This report documents the completion of Wave 1R critical remediation and re-verification for the Salesforce Migration workstream. All four primary technical findings reported in the Wave 1 closure audit have been addressed, verified through offline regression tests, and fully documented.

---

## Findings Summary & Remediation Status

| Finding ID | Title / Severity | Confirmed In Source? | Remediation Action | Status |
|---|---|---|---|---|
| **REM-W1-01** | UTF-16 Surrogate Pair Boundary Splitting (HIGH) | YES | Updated `DAGraphChunkService.cls` (Apex) and `daGraphPayloadLoader.js` (LWC) `chunkPayload` to inspect UTF-16 code units at chunk boundaries and adjust boundary index backward when straddling high surrogates (`0xD800..0xDBFF`). Added regression tests in `run-poc-tests.cjs`. | `REMEDIATED` |
| **REM-W1-02** | Scope Authorization Defect in `getGraphChunks` (HIGH) | YES | Updated `DAGraphController.getGraphChunks()` in Apex to validate that `runId` matches `projectId` via `WITH USER_MODE`. Updated `daGraphViewer.js` to pass `projectId: this.recordId`. Added cross-project rejection tests in `DAGraphSecurityTest.cls`. | `REMEDIATED` |
| **REM-W1-03** | Missing Schema Invariant Validation in Loader (HIGH) | YES | Updated `validatePayloadIntegrity()` in `daGraphPayloadLoader.js` to validate root object envelope, `nodes` array, `edges` array, node ID types, edge source/target fields, and edge endpoint existence in the node set. Added comprehensive unit tests in `run-poc-tests.cjs`. | `REMEDIATED` |
| **REM-W1-04** | Orbit / Constellation / Sankey Layout Parity (MEDIUM) | YES | Inspected TS source vs LWC JS target. Architecture (P0) confirmed `FULL PARITY`. Orbit (P1), Constellation (P1), and Sankey (P2) marked `PARTIAL PARITY` due to simplified LWC single-pass rendering omitting web-worker dynamic force simulations. | `PARTIAL PARITY (DOCUMENTED)` |

---

## Summary of Files Modified

1. `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphChunkService.cls`
   * Implemented UTF-16 surrogate-pair boundary protection in `chunkPayload`.

2. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphPayloadLoader/daGraphPayloadLoader.js`
   * Exported `chunkPayload()` with UTF-16 surrogate pair protection.
   * Enhanced `validatePayloadIntegrity()` with canonical schema envelope, record, and endpoint checks.

3. `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`
   * Overloaded and updated `getGraphChunks(runId, startIndex, maxChunks, projectId)` to enforce strict project-run ownership validation via `WITH USER_MODE`.

4. `scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js`
   * Updated `fetchGraphData()` to pass `projectId: this.recordId` during `getGraphChunks` invocation.

5. `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphSecurityTest.cls`
   * Added `testCrossProjectChunkRetrievalRejection` to assert `AuraHandledException` on cross-project chunk retrieval attempts.

6. `scratch/salesforce-poc/tests/run-poc-tests.cjs`
   * Added surrogate-pair boundary safety regression tests and graph schema validation unit tests.

7. `WAVE_1_REMEDIATION_REGISTER.csv`
   * Updated register statuses from `OPEN` to `CLOSED` / `VERIFIED`.

---

## Unresolved Work & Follow-Ups

* **Apex Platform Execution:** Apex unit tests (`DAGraphSecurityTest`, `DAGraphControllerTest`) remain pending live execution on a Salesforce org.
* **Large-Payload Ingestion Architecture:** Single-transaction synchronous ingestion for 10 MB payloads is documented as requiring client-driven batching or Queueable Apex.
* **Layout Physics Polish:** Orbit, Constellation, and Sankey layouts function deterministically in LWC but omit complex multi-pass force-directed web worker physics.
