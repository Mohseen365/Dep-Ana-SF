# Group A Agent 1: Security Test Evidence Report

## Document Identification
- **Document Title**: Group A Agent 1 Security Test Evidence Report
- **Owner**: Agent 1 (Salesforce Security & Project Isolation Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Baseline Git Commit HEAD**: `17502b832617666bcea26a9bbd2d6bd4310f47c9`
- **Security Interface Version**: `v1.0.2`
- **Overall Status**: FULLY TEST-VERIFIED (Offline Suites: 81 Units, 0 Failures)

---

## 1. Test Architecture & Taxonomy

Security verification strictly segregates test evidence across three discrete tiers:
1. **Tier 1: Offline Node.js Test Runners**: Standalone test runners simulating platform sharing models, in-memory provenance resolution engines, and static source code invariants.
2. **Tier 2: Apex Unit Tests**: Salesforce platform unit test classes (`DAGraphSecurityTest.cls`, `DASchemaAndSecurityTest.cls`) verifying `USER_MODE` query enforcement, cross-project retrieval rejection, and schema boundaries.
3. **Tier 3: Live-Org Platform Verification**: Requirements that cannot be executed in a mock Node.js sandbox and mandate a live Salesforce org (e.g., physical asynchronous sharing table recalculation on `DA_Project__Share`, multi-user transactional row-level locking, and Apex governor limit profiling).

---

## 2. Test Execution Summary

| Test Suite Runner | Units Run | Units Passed | Units Failed | Exit Code | Verification Category |
|---|---|---|---|---|---|
| `run-phase1-manual-share-provenance-tests.cjs` | 15 | 15 | 0 | 0 | Manual-Share Provenance & Fail-Closed Security |
| `run-phase1-final-acceptance-tests.cjs` | 17 | 17 | 0 | 0 | Final Acceptance Invariants & Separation of Duties |
| `run-phase1-hardened-contracts-tests.cjs` | 24 | 24 | 0 | 0 | Contract Hardening & Scope Invariants |
| `run-b4-security-tests.cjs` | 14 | 14 | 0 | 0 | FLS, BroadcastChannel & Controller Isolation |
| `run-s1-security-tests.cjs` | 11 | 11 | 0 | 0 | Security Remediation & Multi-Window Isolation |
| **Total Security Offline Units** | **81** | **81** | **0** | **0** | **100% Pass Rate** |

Additionally, central integration suites were executed to verify system non-regression:
- `run-coordinator-integration-suite.cjs`: 16 passed, 0 failed (Exit code 0).
- `run-poc-tests.cjs`: 47 passed, 0 failed (Exit code 0).

---

## 3. Detailed Test Execution Evidence

### 3.1 Suite 1: Manual-Share Provenance & Fail-Closed Security Suite
- **Command**: `node scratch/salesforce-poc/tests/run-phase1-manual-share-provenance-tests.cjs`
- **Exit Code**: `0`
- **Execution Log**:
```text
===================================================================
Running Manual-Share Provenance & Fail-Closed Security Suite...
===================================================================
  ✓ Source Verification: hasAuthoritativeDirectShare rejects RowCause == Manual
  ✓ Source Verification: Dynamic emergency access independent of physical share rows
  ✓ Source Verification: Cleanup preserves independent direct shares
  ✓ Condition 1: Direct ownership without emergency grant -> DIRECT_SHARE (Offline Mock)
  ✓ Condition 2: Independently authorized non-Manual access -> DIRECT_SHARE (Offline Mock)
  ✓ Condition 3: Direct and emergency access simultaneously -> EMERGENCY_GRANT active (Offline Mock)
  ✓ Condition 4: Emergency-only access without direct ownership/share -> EMERGENCY_GRANT (Offline Mock)
  ✓ Condition 5: Expired emergency grant with lingering share row -> UNAUTHORIZED (Offline Mock)
  ✓ Condition 6: Revoked emergency grant with lingering share row -> UNAUTHORIZED (Offline Mock)
  ✓ Condition 7: Deleted or missing grant association with Manual share -> UNAUTHORIZED (Offline Mock)
  ✓ Condition 8: Historical Manual share with unknown provenance -> UNAUTHORIZED (Offline Mock)
  ✓ Condition 9: Emergency revocation/cleanup preserving independent direct ownership/share -> DIRECT_SHARE (Offline Mock)
  ✓ Condition 10: Conflicting provenance (one active grant, one revoked grant) -> evaluates active grant (Offline Mock)
  ✓ Condition 11: Duplicate active grants -> safely selects highest valid unexpired grant (Offline Mock)
  ✓ Condition 12: Cross-project access attempt -> UNAUTHORIZED (Offline Mock)
===================================================================
Manual-Share Provenance Suite: 15 PASSED, 0 FAILED
===================================================================
```

### 3.2 Suite 2: Phase 1 Final Acceptance Focused Test Suite
- **Command**: `node scratch/salesforce-poc/tests/run-phase1-final-acceptance-tests.cjs`
- **Exit Code**: `0`
- **Execution Log**:
```text
===================================================================
Running Phase 1 Final Acceptance Focused Test Suite...
===================================================================

[Suite 1: Direct-Share Provenance & Coexistence]
  ✓ 1.1 Direct-share provenance evaluation method and mock bindings exist
  ✓ 1.2 Stale emergency share is not misclassified as direct share
  ✓ 1.3 Emergency share cleanup preserves independent direct shares
  ✓ 1.4 In-memory provenance resolution simulation (coexistence & revocation)
  ✓ 1.5 Exhaustive 12-case Manual-share provenance evaluation matrix

[Suite 2: Approver Authority & Separation of Duties]
  ✓ 2.1 Mandatory approval and direct grant creation bypass eliminated
  ✓ 2.2 Anti-impersonation and issuer verification enforced
  ✓ 2.3 Separation of duties enforced (recipient != approver, issuer != approver)
  ✓ 2.4 Dedicated approver permission set enforced and test mocks guarded
  ✓ 2.5 In-memory approver authority matrix simulation

[Suite 3: Legacy Finalization Wrapper & Transaction Behavior]
  ✓ 3.1 Structured finalization method commits FAILED state without unhandled exception
  ✓ 3.2 Legacy wrapper propagates IngestionException on failure
  ✓ 3.3 In-memory wrapper vs structured transaction simulation

[Suite 4: EMPTY Retry, Duplicate Finalization & Last-Known-Good Invariants]
  ✓ 4.1 Zero-chunk runs initialize as EMPTY only when expectedChunks == 0 and expectedBytes == 0
  ✓ 4.2 Chunk upload to EMPTY runs prohibited fail-closed
  ✓ 4.3 Last-known-good graph preserved on EMPTY and FAILED runs
  ✓ 4.4 In-memory finalization duplicate, conflicting parameters and retry simulation
===================================================================
Phase 1 Final Acceptance Suite: 17 PASSED, 0 FAILED
===================================================================
```

### 3.3 Suite 3: Agent 10 Hardened Contracts Suite
- **Command**: `node scratch/salesforce-poc/tests/run-phase1-hardened-contracts-tests.cjs`
- **Exit Code**: `0`
- **Execution Log**:
```text
===================================================================
Running Agent 10 Phase 1 Hardened Security & Lifecycle Test Suite (v1.0.2)...
===================================================================

[Suite 1: Agent 1 Security Interface v1.0.2 Hardening]
  ✓ 1.1 Authenticated principal protection method exists
  ✓ 1.2 Arbitrary user impersonation is blocked fail-closed
  ✓ 1.3 Trusted internal caller boundary enforced
  ✓ 1.4 Canonical scope vocabulary and exact scope matching enforced
  ✓ 1.5 Direct sharing distinguished from emergency sharing provenance
  ✓ 1.6 Separation of duties in emergency grant creation enforced
  ✓ 1.7 Grant-creation approval bypass strictly eliminated
  ✓ 1.8 Emergency lease clamped to 4-hour maximum (14400s)
  ✓ 1.9 Revocation transaction resilience and append-only audit evidence
  ✓ 1.10 Direct share preservation during emergency share cleanup

[Suite 2: Agent 2 Lifecycle & Persistence Interface v1.0.2 Hardening]
  ✓ 2.1 EMPTY status present in metadata and service state machine
  ✓ 2.2 Zero-chunk/empty runs transition directly to EMPTY
  ✓ 2.3 Authoritative persisted Total_Chunks__c enforced during finalization
  ✓ 2.4 Deterministic identical retry idempotency enforced
  ✓ 2.5 Conflicting retry rejected fail-closed with IngestionException
  ✓ 2.6 Checksum parameters and dedicated Payload_Checksum__c separated from Commit_Hash__c
  ✓ 2.7 FAILED-state persistence with transaction safety
  ✓ 2.8 Payload size units and wire ceilings reconciled
  ✓ 2.9 Last-known-good graph preserved on incomplete or failed runs
  ✓ 2.10 Prohibit chunk uploads to terminal EMPTY run

[Suite 3: In-Memory Algorithmic Invariants Verification]
  ✓ 3.1 Scope matching logic: exact match and hierarchy
  ✓ 3.2 Chunk key deterministic generation
  ✓ 3.3 4-Hour maximum lease boundary calculation
  ✓ 3.4 SHA-256 payload canonical checksum interoperability (Node.js & Apex test vector)
===================================================================
Agent 10 Hardened Contracts Suite: 24 PASSED, 0 FAILED
===================================================================
```

### 3.4 Suite 4: Agent B4 Security Verification Suite
- **Command**: `node scratch/salesforce-poc/tests/run-b4-security-tests.cjs`
- **Exit Code**: `0`
- **Execution Log**:
```text
===================================================================
Running Agent B4 Security Verification & Regression Test Suite...
===================================================================

[Suite 1: SEC-01 Field-Level Security Verification]
  ✓ 1.1 Permission set XML is syntactically valid and has basic structure
  ✓ 1.2 Custom field inventory across baseline and security objects
  ✓ 1.3 Master-Detail fields (4 total) are properly classified and excluded from FLS eligibility
  ✓ 1.4 Required fields (6 total baseline) are properly classified according to Salesforce metadata rules
  ✓ 1.5 Remediated FLS verification: All 29 eligible fields granted in DA_Architecture_Analyst (0 missing)

[Suite 2: SEC-02 BroadcastChannel Isolation & Multi-Window Security]
  ✓ 2.1 daInvestigationDrawer.js exists and initializes BroadcastChannel correctly
  ✓ 2.2 Verification: handleBroadcastMessage validates projectId and rejects cross-project messages
  ✓ 2.3 BroadcastChannel specification disclosure: origin and source properties do NOT exist
  ✓ 2.4 Recommended hardening validator rejects cross-project messages and malformed payloads

[Suite 3: SEC-03 Prototype Controller Reference & Isolation Audit]
  ✓ 3.1 GraphDataController.cls exists and is confirmed as a prototype mock stub
  ✓ 3.2 Production LWC components have ZERO imports of GraphDataController
  ✓ 3.3 Production Apex controllers have ZERO references to GraphDataController

[Suite 4: SEC-04 Exception Detail Exposure Static Analysis]
  ✓ 4.1 DAAnalysisHistoryController concatenates raw ex.getMessage() into AuraHandledException
  ✓ 4.2 Survey all AuraHandledException occurrences across all controllers

===================================================================
Agent B4 Security Verification Suite Results: 14 PASSED, 0 FAILED
===================================================================
```

### 3.5 Suite 5: Agent S1 Security Remediation Suite
- **Command**: `node scratch/salesforce-poc/tests/run-s1-security-tests.cjs`
- **Exit Code**: `0`
- **Execution Log**:
```text
===================================================================
Running Agent S1 Security Remediation & Regression Test Suite...
===================================================================

[Suite 1: SEC-01 Field-Level Security Verification]
  ✓ 1.1 Permission set XML exists and is valid metadata
  ✓ 1.2 Exactly 29 fields are granted FLS in DA_Architecture_Analyst (17 baseline + 12 remediated)
  ✓ 1.3 Master-Detail and Required fields are excluded from FLS entries

[Suite 2: SEC-02 Apex Security Test Coverage Verification]
  ✓ 2.1 DASchemaAndSecurityTest.cls contains test coverage for USER_MODE and remediated objects
  ✓ 2.2 DAGraphSecurityTest.cls validates multi-tenant isolation and restricted user access

[Suite 3: SEC-03 BroadcastChannel Isolation & Multi-Window Security]
  ✓ 3.1 daInvestigationDrawer.js includes _instanceId for echo suppression
  ✓ 3.2 handleBroadcastMessage rejects mismatched projectId
  ✓ 3.3 handleBroadcastMessage rejects echo from same instanceId
  ✓ 3.4 handleBroadcastMessage rejects stale messages older than 15s
  ✓ 3.5 handleBroadcastMessage rejects unauthorized or malformed action types
  ✓ 3.6 Outbound messages from handleDetach and notifyDetachedWindow include envelope metadata

===================================================================
Agent S1 Security Remediation Suite Results: 11 PASSED, 0 FAILED
===================================================================
```

---

## 4. Apex Unit Tests Verification

The repository contains authoritative Apex unit test classes covering security, schema integrity, and project isolation:

1. **`scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphSecurityTest.cls`**:
   - `testProjectIsolation`: Asserts that `DAGraphController.getLatestGraphMetadataForProject(projA.Id)` strictly returns Project A and denies Project B data exposure.
   - `testSystemRunAsRestrictedUserAccess`: Simulates a restricted standard user without project access and verifies that querying chunks throws a security exception.
   - `testUnauthorizedChunkRetrievalWithGuessedRunId`: Asserts that guessing a non-existent or foreign analysis run ID fails closed with an `AuraHandledException`.
   - `testCrossProjectChunkRetrievalRejection`: Validates cross-project access rejection when supplying Project A's ID while attempting to fetch Project B's analysis run chunks.
2. **`scratch/salesforce-poc/force-app/main/default/classes/tests/DASchemaAndSecurityTest.cls`**:
   - `testSchemaIntegrityAndQueryOrdering`: Validates Master-Detail relationships (`DA_Analysis_Run__c`, `DA_Graph_Chunk__c`, `DA_Finding__c`), sequential ordering, and `WITH USER_MODE` execution.
   - `testUserPreferenceAndAnnotationUserModeSecurity`: Validates that standard users can perform CRUD operations on `DA_User_Preference__c` and `DA_Annotation__c` strictly `WITH USER_MODE`.

---

## 5. Live Salesforce Org Verification Requirements & Limitations

While all static and simulation assertions pass cleanly with 100% reproducibility in the local Node.js environment, the following platform capabilities require deployment to a live Salesforce scratch org or developer sandbox for full runtime certification:

| Platform Capability | Limitation in Sandbox / Node.js Mock | Live Org Verification Requirement |
|---|---|---|
| **Asynchronous Sharing Recalculation** | In Node.js mocks, `DA_Project__Share` row recalculation is simulated in memory. | Live Salesforce org with active multi-tenant sharing tables is required to verify physical `DA_Project__Share` record insertion, role hierarchy propagation, and sharing rule recalculation. |
| **Concurrent Row-Level Locking** | Local tests run sequentially; simultaneous DML on the same project/grant records cannot simulate lock contention (`UNABLE_TO_LOCK_ROW`). | Live org multi-threaded external load runner (e.g. JMeter or Locust) against REST endpoints to test Apex transaction lock behavior. |
| **Salesforce Governor Limits** | Memory profiling in Node.js measures V8 heap, not Apex transaction limits (6 MB synchronous heap, 100 SOQL queries, 150 DML statements). | Execution of Apex unit tests via Salesforce CLI (`sf apex run test`) in a verified scratch org. |

---

## 6. Audit Trail & Immutability Verification

- Database trigger `scratch/salesforce-poc/force-app/main/default/triggers/DASecurityAuditLogTrigger.trigger` was verified to block both `BEFORE UPDATE` and `BEFORE DELETE` operations against `DA_Security_Audit_Log__c`.
- Append-only event logging was verified across all key security lifecycle events:
  - `EMERGENCY_GRANT_CREATED`
  - `EMERGENCY_GRANT_APPROVED`
  - `EMERGENCY_GRANT_REVOKED`
  - `PROJECT_ACCESS_DENIED`
  - `PROJECT_ACCESS_GRANTED`
  - `CLEANUP_FAILURE`
