# Wave 4 (`FEAT-STATE-03`): Final R4 Field Limit Source Verification

| Governance Attribute | Value |
|---|---|
| **Document Type** | Direct Source Code Verification & Field-Specific Payload Boundary Evidence Report |
| **Target Feature** | Wave 4 — Remediation R4 & Preference Payload Boundaries |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-2662574214828896325-f3957679` |
| **HEAD Commit SHA** | `e643416f0aac66f9d0ba231f2f5920fee4c95a5e` |
| **Audit Date** | October 31, 2026 |
| **Operational Directive** | **IMPLEMENTATION HOLD ACTIVE — NO APPLICATION SOURCE MODIFICATION PERMITTED** |
| **Live Acceptance Status** | **LIVE SALESFORCE ACCEPTANCE — DEFERRED TO PHASE 7** |

---

## 1. Executive Summary & Purpose

This deliverable records the direct source code and metadata inspection performed to independently resolve contradictory claims regarding a 100,000-character client-side limit or warning toast.

### Problem Addressed:
- Certain prior reports claimed that a 100,000-character client warning toast was enforced client-side for `Filters_JSON__c`.
- Other documents stated that `daAppShell.js` enforces a 131,072 hard limit for `filtersJson`, does not validate `positionsJson` or `zoomPanJson`, and contains no 100,000-character soft limit.

### Source Truth Established:
1. **No 100,000-Character Soft Limit in `daAppShell.js`:** Direct inspection of `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js` reveals **no** mention of 100,000 or warning toasts.
2. **Actual LWC Client Guard:** Line 8 defines `const MAX_PAYLOAD_SIZE = 131072;`. Line 254 validates `filtersJson.length > MAX_PAYLOAD_SIZE` and sets `this.preferenceError`.
3. **LWC Does Not Validate Positions or Zoom/Pan:** In `daAppShell.js` lines 266–273, `positionsJson: null` and `zoomPanJson: null` are hardcoded in the save call. LWC performs zero length checks on these fields.
4. **Apex Controller Guards All Three Fields:** `DAUserPreferenceController.cls` lines 61–69 enforces `length() > 131072` independently on `positionsJson`, `filtersJson`, and `zoomPanJson`, throwing `AuraHandledException`.
5. **Metadata Capacity:** All three field metadata files define `<length>131072</length>`.
6. **Where 100,000 Exists in Codebase:** The 100,000 constant exists solely in pagination services and test chunking fixtures (`DAGraphChunkService.cls`, `run-poc-tests.cjs`, `daGraphPayloadLoader.js`), completely unrelated to `DA_User_Preference__c` persistence limits.
7. **All Unsupported 100k Claims Removed:** All claims of a 100,000-character client warning toast have been purged from the Category D governance deliverables.

---

## 2. Field-Specific Evidence Verification Matrix

Every boundary assertion is disaggregated across the three persistence fields and evaluated across four distinct evidence tiers:

| Row # | Boundary Element / Field Topic | Source Location | Verified Limit Value | Verified Behavior | Evidence Classification |
|---|---|---|---|---|---|
| **1** | **Filters Client Guard** | `daAppShell.js` lines 8, 254–256 | 131,072 chars | Blocks async save call; sets `preferenceError` string; no warning toast | **SOURCE VERIFIED** |
| **2** | **Filters Apex Guard** | `DAUserPreferenceController.cls` lines 64–66 | 131,072 chars | Throws `AuraHandledException('Filters JSON exceeds maximum allowed length...')` | **SOURCE VERIFIED** |
| **3** | **Filters Metadata Capacity** | `Filters_JSON__c.field-meta.xml` line 5 | 131,072 chars | Schema capacity defined as `<length>131072</length>` | **METADATA VERIFIED** |
| **4** | **Positions Client Guard** | `daAppShell.js` lines 266–273 | None (Unchecked) | Passed as `null` by shell; no client-side length check in LWC | **NOT IMPLEMENTED** |
| **5** | **Positions Apex Guard** | `DAUserPreferenceController.cls` lines 61–63 | 131,072 chars | Throws `AuraHandledException('Positions JSON exceeds maximum allowed length...')` | **SOURCE VERIFIED** |
| **6** | **Positions Metadata Capacity** | `Positions_JSON__c.field-meta.xml` line 5 | 131,072 chars | Schema capacity defined as `<length>131072</length>` | **METADATA VERIFIED** |
| **7** | **Zoom/Pan Client Guard** | `daAppShell.js` lines 266–273 | None (Unchecked) | Passed as `null` by shell; no client-side length check in LWC | **NOT IMPLEMENTED** |
| **8** | **Zoom/Pan Apex Guard** | `DAUserPreferenceController.cls` lines 67–69 | 131,072 chars | Throws `AuraHandledException('Zoom Pan JSON exceeds maximum allowed length...')` | **SOURCE VERIFIED** |
| **9** | **Zoom/Pan Metadata Capacity** | `Zoom_Pan_JSON__c.field-meta.xml` line 5 | 131,072 chars | Schema capacity defined as `<length>131072</length>` | **METADATA VERIFIED** |
| **10** | **Actual Persistence Boundary Evidence** | Live Salesforce Database ORG | 131,072 chars | Real database transaction, multi-tenant storage, SOQL retrieval | **LIVE SALESFORCE VALIDATION DEFERRED** |

---

## 3. Boundary Test Qualification & Exact Execution Analysis

A rigorous inspection of existing unit test runners reveals the following empirical execution facts:

### 3.1 Positions Parameter Oversized Test Execution
- **Location:** `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` Test 6 (lines 392–398) and `DAUserPreferenceControllerTest.cls` lines 275–292.
- **Test Executed:** String of 131,073 characters passed as parameter 4 (`positionsJson`).
- **Result:** Throws expected length exception.
- **Classification:** **TEST EXECUTION VERIFIED** (for offline simulated mock and Apex test class).

### 3.2 Filters Parameter Oversized Boundary Execution
- **Location:** None.
- **Status:** Parameter 5 (`filtersJson`) is **NOT** directly exercised at 131,073 characters in any automated test runner.
- **Classification:** **NOT EXECUTED**.

### 3.3 Zoom/Pan Parameter Oversized Boundary Execution
- **Location:** None.
- **Status:** Parameter 6 (`zoomPanJson`) is **NOT** directly exercised at 131,073 characters in any automated test runner.
- **Classification:** **NOT EXECUTED**.

### 3.4 Exact Acceptance Boundary at 131,072 Characters
- **Location:** None.
- **Status:** Successful persistence of a payload measuring exactly 131,072 characters has **NOT** been directly executed for any field in baseline suites.
- **Classification:** **NOT EXECUTED**.

---

## 4. Distinction Between Offline Mock and Live Database Persistence

- **Offline Simulation:** In `run-workstream-c-tests.cjs`, tests run against an in-memory JavaScript database (`mockSalesforceDb`).
- **Governor Limit Isolation:** In-memory mocks do not execute Salesforce database transactions, do not enforce platform field-level security, and do not test governor limits.
- **Live Platform Acceptance:** Physical verification of records storing up to 131,072 characters in `DA_User_Preference__c` records is deferred to Phase 7 live org testing.

---

## 5. Audit Conclusion

The 100,000-character client toast claim is completely refuted by source code inspection. All governance documentation is reconciled to reflect actual source guards (131,072 characters) and precise test execution boundaries.
