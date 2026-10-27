# Wave 1R.2 Implementation Report

## Executive Summary
This report documents the implementation of Wave 1R.2 security hardening, safe large-payload ingestion contracts, Unicode/schema verification, and final closure gate preparation for the Salesforce Dependency Analyzer migration.

## Baseline & Working Tree State
* **Branch:** `jules-8995062742914380924-f8a3f65a`
* **HEAD Commit:** `fba2d2e`
* **Working Tree:** Clean prior to Wave 1R.2 changes.
* **Scope:** Confined strictly to Salesforce migration POC classes, LWC components, offline test runner, documentation, and remediation registers.

## Modified Source Files
1. `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls`:
   - Updated both `getGraphChunks` overloads to enforce server-side project/run ownership validation via `WITH USER_MODE`.
   - Prevented cross-project data access by resolving/verifying `projectId` on all retrieval paths.
2. `scratch/salesforce-poc/force-app/main/default/classes/services/DAGraphIngestionService.cls`:
   - Added bounded client-driven batching limits (`MAX_BATCH_CHUNKS = 10`, `MAX_CHUNK_SIZE = 131072`, `MAX_TOTAL_PAYLOAD_SIZE = 10485760`).
   - Implemented idempotent chunk update/insert persistence to prevent duplicate chunk records on retries or repeated batch calls.
   - Enforced project/run scoping checks on chunk persistence calls.
3. `scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphSecurityTest.cls`:
   - Added unit test cases for cross-project chunk access rejection, derived project context, null/blank/invalid run and project identifiers.
4. `scratch/salesforce-poc/tests/run-poc-tests.cjs`:
   - Added offline unit tests for bounded batch ingestion, duplicate batch idempotency, and oversized batch rejection.
5. `WAVE_1_REMEDIATION_REGISTER.csv` & `docs/audits/salesforce-wave1/WAVE_1_REMEDIATION_REGISTER.csv`:
   - Reconciled remediation items to `CLOSED / VERIFIED`.

## Invariant Preservations
- **SELECTION ≠ NAVIGATION:** Selecting a node in `daGraphViewer` updates local selection state only without triggering route navigation.
- **Backward Compatibility:** All existing Apex method signatures remain intact while applying stricter server-side authorization checks.
