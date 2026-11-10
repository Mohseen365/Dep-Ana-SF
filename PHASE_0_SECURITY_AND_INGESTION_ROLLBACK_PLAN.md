# Phase 0 Security & Ingestion Rollback and Recovery Plan

## Document Metadata
- **Classification**: Phase 0 Fault Containment & Recovery Procedures
- **Date**: 2026-11-10
- **Auditor**: Integration Coordinator D1
- **Status**: AUTHORITATIVE ROLLBACK PROCEDURES

---

## 1. Domain-Specific Rollback Specifications

### 1. Security Changes (OWD & Permissions)
- **Trigger Condition**: Legitimate users lose record visibility; tests fail with `INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY`; or sharing recalculation times out.
- **Responsible Owner**: Workstream Lead WS-B & Agent 1.
- **Recovery Action**: Revert `DA_Project__c.object-meta.xml` (`<sharingModel>ReadWrite</sharingModel>`) and `DA_Architecture_Analyst.permissionset-meta.xml` (`<viewAllRecords>true</viewAllRecords>`).
- **Data Preservation**: Preserves all project records, runs, and user preferences.
- **Validation Procedure**: Run `node scratch/salesforce-poc/tests/run-s1-security-tests.cjs`.
- **Residual Risk**: Temporarily re-exposes multi-tenant visibility; requires urgent root-cause fix.
- **Approval Requirement**: Project Owner emergency authorization.

### 2. Ingestion Lifecycle & Chunk Key Changes
- **Trigger Condition**: Upload payloads fail with false-positive size cap errors; `Chunk_Key__c` constraint rejects legitimate chunks; or Apex heap exceeds 6 MB.
- **Responsible Owner**: Workstream Lead WS-A, Agent 2 & Agent 3.
- **Recovery Action**: Revert `DAGraphIngestionService.cls` and `DAGraphIngestionRestResource.cls` to commit `52e0429`. Drop Unique Case-Insensitive attribute on `Chunk_Key__c`. Reset stuck `UPLOADING`/`VALIDATING` runs to `FAILED`.
- **Data Preservation**: Existing `AVAILABLE` runs and graph chunks remain intact.
- **Validation Procedure**: Run `node scratch/salesforce-poc/tests/run-p0-verification-tests.cjs` and `node scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs`.
- **Residual Risk**: High concurrency upload races could create duplicate chunks.
- **Approval Requirement**: WS-A Lead and Coordinator D1 joint signoff.

### 3. Finding Review Persistence Changes
- **Trigger Condition**: Status updates fail with user-mode DML exceptions or break `daFindingsView.js`.
- **Responsible Owner**: Workstream Lead WS-D & Agent 6.
- **Recovery Action**: Revert `DAGraphController.cls` method `updateFindingStatus`; revert `daFindingsView.js` to in-memory handling.
- **Data Preservation**: Existing finding records retain current values.
- **Validation Procedure**: Run `node scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs`.
- **Approval Requirement**: WS-D Lead and Coordinator D1 signoff.

### 4. Shared Shell & Component Mounting Integration
- **Trigger Condition**: Mounting `daSankeyView` or modals destabilizes `daAppShell` or violates `SELECTION != NAVIGATION`.
- **Responsible Owner**: Integration Coordinator D1 exclusively.
- **Recovery Action**: Revert `daAppShell.js` and `daAppShell.html` to commit `52e0429`. Standalone component bundles remain intact.
- **Validation Procedure**: Run `node scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs`.
- **Approval Requirement**: Coordinator D1 exclusive authority.
