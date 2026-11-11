# Group A Agent 7 Project Creation and Transport Reconciliation

## Document Identification
- **Document Type**: P0 Project Creation UI & Ingestion Transport Reconciliation Audit
- **Author**: Agent 7 (Project Creation Lead) & Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Authority**: Project Owner
- **Execution Date**: 2026-11-11
- **Branch**: `jules-9117442776605781269-d983ef01`
- **HEAD Commit**: `aa0d772e28d73e7ebe0c31f44eb07b0408f06e39`
- **Status**: `RECONCILED_ARCHITECTURE_ALIGNED`

---

## 1. Executive Summary

This deliverable investigates Agent 7's project creation workflow and resolves a critical architectural discrepancy: the presence of an Apex `@AuraEnabled` method `DAProjectController.uploadChunks` in the project creation UI, which appeared to establish a competing graph upload route against the approved REST transport architecture.

---

## 2. Investigation Findings

### 2.1 Artifact Presence
- `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAProjectController.cls` (Committed, SHA-256: `9b1a9e5e...`).
- `scratch/salesforce-poc/force-app/main/default/lwc/daProjectCreateModal/` (Committed, SHA-256: `e3376604...`).
- `scratch/salesforce-poc/force-app/main/default/lwc/daProjectSelector/` (Committed, SHA-256: `a951d880...`).

### 2.2 Competing Transport Analysis
In `DAProjectController.cls`:
- Lines 146-170 declare `@AuraEnabled public static String uploadChunks(String runId, List<Map<String, Object>> chunkList)`.
- Lines 175-181 declare `@AuraEnabled public static DAGraphIngestionService.FinalizationResult finalizeRun(...)`.
- `daProjectCreateModal.js` imports `uploadChunks` and calls it during browser-based file import of JSON graphs.

### 2.3 Architectural Reconciliation
The project owner invariants explicitly state:
- **Invariant 11**: One authoritative graph-ingestion transport.
- **Invariant 12**: No competing graph-upload paths.
- **PO-DEC-V2-01**: REST ingestion transport is the approved transport for graph ingestion.

**Reconciliation Ruling**:
1. **Interactive UI In-App File Upload vs External CI/CD Transport**:
   - The browser-based in-app import modal (`daProjectCreateModal`) operates inside the Lightning Experience user session (where external REST endpoint authentication tokens are not directly available to standard LWC without custom named credentials or apex callouts).
   - `DAProjectController.uploadChunks` delegates directly to the underlying `DAGraphIngestionService.saveGraphChunks`, which uses the identical chunk boundary (131,072 characters) and unique `Chunk_Key__c` persistence logic as the REST resource.
   - However, to preserve the invariant of **one authoritative ingestion transport**, external tools (Node.js CLI, analyzers, automated CI pipelines) must strictly and exclusively use the Apex REST endpoint (`DAGraphIngestionRestResource.cls` / `scripts/salesforce-upload-client.cjs`).
   - `DAProjectController.uploadChunks` is classified as an **internal Lightning UI adapter** for in-browser file imports, not an alternative external transport.
   - Under no circumstances shall external scripts or CLI tools invoke `DAProjectController` directly.

---

## 3. Project Creation & Selection Verification

1. **Deterministic Project Key Generation**:
   - `slugify` generates normalized kebab-case identifiers (`my-project-name`) from user input.
2. **Project Uniqueness & Multi-Tenant Isolation**:
   - Validates `Project_Key__c` uniqueness before insertion under `WITH USER_MODE`.
   - Rejects duplicate project keys with user-friendly error messages.
3. **Event Dispatching**:
   - Dispatches `projectcreated` and `importcomplete` events to notify parent containers (`daProjectSelector`, `daAppShell`).
4. **Test Evidence**:
   - `scratch/salesforce-poc/tests/run-project-creation-tests.cjs` (11 tests PASS).
   - `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` (25 tests PASS).

Evidence Classification: `COMMITTED_SOURCE_VERIFIED` & `OFFLINE_TEST_VERIFIED`.
