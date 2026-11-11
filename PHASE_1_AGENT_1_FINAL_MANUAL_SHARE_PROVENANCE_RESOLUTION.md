# Phase 1 Agent 1 Final Manual-Share Provenance Resolution

## Document Identification
- **Document Type**: Security Architecture & Authoritative Share Provenance Resolution
- **Component**: `DAProjectSecurityService.cls`
- **Owner**: Agent 1 (Salesforce Security & Project Isolation Lead)
- **Coordinator**: Integration Coordinator D1
- **Verifier**: Independent Verifier D2
- **Date**: 2026-11-11
- **Status**: IMPLEMENTED & TEST-VERIFIED
- **Baseline Git HEAD**: `61520f9a011151f377e6279b115d6c81b90d7538`

---

## 1. Executive Summary & Problem Resolution

### 1.1 Outstanding Contradiction
Previously, manual shares on `DA_Project__Share` (`RowCause = 'Manual'`) with zero currently associated emergency grant records risked being treated as independently authorized direct shares. This violated the core security invariant:
> **Absence of an emergency grant record must never be treated as proof of independent direct authorization.**

An emergency grant could have existed historically, had its grant record deleted or expired, or experienced asynchronous cleanup failure. Treating missing provenance as authorization constitutes an open security vulnerability.

### 1.2 Corrected Architecture & Security Invariant
In `DAProjectSecurityService.cls`, unproven access paths fail-closed to `UNAUTHORIZED`:
1. **Direct Record Ownership**: `proj.OwnerId == userId` constitutes authoritative direct access (`DIRECT_SHARE`).
2. **Standard Non-Manual Sharing Causes**: Sharing causes such as `RowCause != 'Manual'` (e.g., Role Hierarchy, Territory, or Rule-based sharing) constitute authoritative direct access (`DIRECT_SHARE`).
3. **Active Emergency Grants**: An active, unrevoked, unexpired emergency grant (`Expires_At__c > Datetime.now()`, `Is_Active__c = true`, `Revoked__c = false`) with matching scope confers `EMERGENCY_GRANT`.
4. **Unproven Manual Shares**: Any `DA_Project__Share` row with `RowCause = 'Manual'` lacking explicit independent direct entitlement verification is treated as unproven and **fails-closed to `UNAUTHORIZED`**, logging `ACTION_ACCESS_DENIED`.
5. **Revocation Preservation**: Revocation of emergency grants revokes emergency access but cleanly preserves independent direct ownership and verified non-manual sharing without accidental deletion.

---

## 2. Persisted Evidence & Data Model Distinction

| Access State | Exact Persisted Evidence | Source Symbols / Fields | Provenance Classification |
|---|---|---|---|
| **1. Independently Authorized Direct Access** | Project record ownership OR `DA_Project__Share` with `RowCause != 'Manual'` | `DA_Project__c.OwnerId`, `DA_Project__Share.RowCause` | `DIRECT_SHARE` |
| **2. Active Emergency-Generated Access** | `DA_Emergency_Access_Grant__c` row with `Is_Active__c = true`, `Revoked__c = false`, `Expires_At__c > now` | `DA_Emergency_Access_Grant__c` (Fields: `Project__c`, `User__c`, `Scope__c`, `Expires_At__c`, `Is_Active__c`, `Revoked__c`) | `EMERGENCY_GRANT` |
| **3. Stale Emergency Access (Expired/Revoked)** | `DA_Emergency_Access_Grant__c` row with `Expires_At__c <= now` OR `Revoked__c = true` OR `Is_Active__c = false` | `DAProjectSecurityService.staleGrants` query | `UNAUTHORIZED` (lingering share row rejected) |
| **4. Unknown / Unprovable Provenance** | `DA_Project__Share` with `RowCause = 'Manual'` and no verified non-manual cause or active grant | `DAProjectSecurityService.hasAuthoritativeDirectShare` returning `false` | `UNAUTHORIZED` (Fail-closed) |

---

## 3. Historical Data Treatment & Safe Transition

- **Quarantine / Fail-Closed Policy**: Existing historical Manual share rows whose creation provenance cannot be linked to verified direct authorization are denied access fail-closed until an authorized administrative reconciliation process or dedicated junction object (`DA_Direct_Share_Entitlement__c`) establishes provenance.
- **No Silent Reclassification**: Historical records are not silently altered or deleted.
- **Salesforce Standard Constraint**: Custom fields cannot be added to standard share tables (`DA_Project__Share`), and custom `RowCause` values are only supported on custom objects when Apex sharing reasons are defined. Because `DA_Project__c` uses standard sharing, `RowCause = 'Manual'` shares cannot natively record provenance metadata without an external junction record.
- **Compatibility & Rollback**: Denying unproven manual shares preserves all record owner access and all non-manual sharing (roles/rules) with zero breaking changes to verified collaboration.

---

## 4. Test Verification Matrix (12 Mandatory Test Cases)

All 12 test conditions specified in Section 2.5 of the Executive Directive are verified in `scratch/salesforce-poc/tests/run-phase1-final-acceptance-tests.cjs`:

| Test Case | Scenario Description | Expected Provenance | Test Result | Execution Mode |
|---|---|---|---|---|
| **Test 1** | Direct ownership without emergency grant | `DIRECT_SHARE` | **PASS** | Offline Unit / Mock |
| **Test 2** | Independently authorized non-Manual access (`RowCause != 'Manual'`) | `DIRECT_SHARE` | **PASS** | Offline Unit / Mock |
| **Test 3** | Direct and emergency access simultaneously | `EMERGENCY_GRANT` | **PASS** | Offline Unit / Mock |
| **Test 4** | Emergency-only access | `EMERGENCY_GRANT` | **PASS** | Offline Unit / Mock |
| **Test 5** | Expired emergency grant with stale share | `UNAUTHORIZED` | **PASS** | Offline Unit / Mock |
| **Test 6** | Revoked emergency grant with stale share | `UNAUTHORIZED` | **PASS** | Offline Unit / Mock |
| **Test 7** | Deleted or missing grant association (absence != proof) | `UNAUTHORIZED` | **PASS** | Offline Unit / Mock |
| **Test 8** | Historical Manual share with unknown provenance | `UNAUTHORIZED` | **PASS** | Offline Unit / Mock |
| **Test 9** | Emergency cleanup preserving independent direct access | `DIRECT_SHARE` | **PASS** | Offline Unit / Mock |
| **Test 10** | Conflicting provenance | `UNAUTHORIZED` | **PASS** | Offline Unit / Mock |
| **Test 11** | Duplicate provenance | `UNAUTHORIZED` | **PASS** | Offline Unit / Mock |
| **Test 12** | Cross-project access attempt | `UNAUTHORIZED` | **PASS** | Offline Unit / Mock |

---

## 5. Execution Commands and Evidence

- **Execution Command**:
  ```bash
  node scratch/salesforce-poc/tests/run-phase1-final-acceptance-tests.cjs
  ```
- **Exit Code**: `0`
- **Result Output**: `16 PASSED, 0 FAILED`
- **Hardened Contracts Runner**:
  ```bash
  node scratch/salesforce-poc/tests/run-phase1-hardened-contracts-tests.cjs
  ```
- **Exit Code**: `0`
- **Result Output**: `24 PASSED, 0 FAILED`

---

## 6. Remaining Limitations & Org Qualification

- Local Node.js tests verify the Apex logic, security state machine, and fail-closed branching rules.
- Multi-tenant Salesforce database evaluation of `[SELECT Id FROM DA_Project__c WITH USER_MODE]` and actual platform `DA_Project__Share` record insertion/deletion require an active Salesforce scratch or sandbox org (`NOT_VERIFIABLE — LIVE SALESFORCE ORG REQUIRED`).
- **Final Determination**: `SPECIFICATION_VERIFIED`, `IMPLEMENTED_SOURCE_VERIFIED`, `OFFLINE_TEST_VERIFIED`.
