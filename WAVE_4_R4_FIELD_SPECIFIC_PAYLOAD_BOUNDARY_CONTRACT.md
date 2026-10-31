# Wave 4 (`FEAT-STATE-03`): Field-Specific Payload Boundary Contract (R4)

| Governance Attribute | Value |
|---|---|
| **Document Type** | Payload Boundary Specification & Test Suite Verification Contract |
| **Target Feature** | Wave 4 — Remediation R4 & Preference Fields Boundary Verification |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-13015635749368501739-7bab4f95` |
| **HEAD Commit SHA** | `8bcdae35e7a4961d1517de8e40efac6b286d575a` |
| **Audit Date** | October 31, 2026 |
| **Status** | **SPECIFICATION COMPLETE — READY FOR HUMAN REVIEW — IMPLEMENTATION HOLD ACTIVE** |

---

## 1. Context & Evidence-Based Boundary Analysis

This contract establishes the field-specific payload boundary specifications across all three governed `DA_User_Preference__c` long text fields:
1. `Filters_JSON__c`
2. `Positions_JSON__c`
3. `Zoom_Pan_JSON__c`

### 1.1 Resolution of Prior Boundary Misconceptions
Prior specification drafts claimed that an application "soft limit" of 100,000 characters was enforced client-side for `Filters_JSON__c`, while also asserting that client-side rejections occurred for `Positions_JSON__c` and `Zoom_Pan_JSON__c` at 131,073 characters.

An inspection of actual repository source files clarifies:
- **`daAppShell.js` (Lines 8 & 254):** Enforces a client-side hard limit check against `MAX_PAYLOAD_SIZE = 131072` specifically for `filtersJson`. No 100,000 character soft limit exists in `daAppShell.js`.
- **`daAppShell.js` Client Limitation:** Does **NOT** inspect, handle, or validate `Positions_JSON__c` or `Zoom_Pan_JSON__c` client-side (passes `null` for both when dispatching save requests from the shell).
- **`DAUserPreferenceController.cls` (Lines 61–69):** Independently validates length for all three parameters against hard limit 131,072 and throws `AuraHandledException` if exceeded.
- **Salesforce Custom Field Metadata (`*.field-meta.xml`):** All three fields define `<type>LongTextArea</type>` with `<length>131072</length>`.

---

## 2. Four-Layer Boundary Evidence Architecture

To prevent conflating static capacity or code inspection with demonstrated persistence, every boundary expectation is evaluated across four distinct evidence layers:

1. **Layer 1: Client-Side Acceptance or Rejection:** Executed in the browser / LWC JavaScript layer (`daAppShell.js`). Only `filtersJson` is guarded here.
2. **Layer 2: Apex Guard Behavior:** Enforced on the Salesforce server by `DAUserPreferenceController.cls` length guards (all three fields guarded).
3. **Layer 3: Salesforce Metadata Physical Capacity:** Configured in `LongTextArea` field metadata definitions (131,072 characters maximum storage capacity per field).
4. **Layer 4: Actual End-to-End Persistence:** Verified database insertion, commit, and retrieval in a live Salesforce database. Source guards and metadata capacity do NOT constitute proof of end-to-end database persistence.

---

## 3. Authoritative Field Boundary Summary & Evidence Layer Matrix

| Field Name | Client-Side Check (Layer 1) | Apex Hard Guard (Layer 2) | Metadata Physical Capacity (Layer 3) | Actual Persistence Evidence (Layer 4) |
|---|---|---|---|---|
| **`Filters_JSON__c`** | **131,072 chars** (`daAppShell.js` line 254) | **131,072 chars** (`DAUserPreferenceController.cls` line 64) | **131,072 chars** (`Filters_JSON__c.field-meta.xml`) | **Deferred to Phase 7 Live Org** (No live persistence test) |
| **`Positions_JSON__c`** | None (Unchecked in LWC) | **131,072 chars** (`DAUserPreferenceController.cls` line 61) | **131,072 chars** (`Positions_JSON__c.field-meta.xml`) | **Deferred to Phase 7 Live Org** (Offline mock only) |
| **`Zoom_Pan_JSON__c`** | None (Unchecked in LWC) | **131,072 chars** (`DAUserPreferenceController.cls` line 67) | **131,072 chars** (`Zoom_Pan_JSON__c.field-meta.xml`) | **Deferred to Phase 7 Live Org** (No live persistence test) |

---

## 4. Boundary Execution Evidence vs. Expected Behavior Audit

The contract specifies that payloads up to 131,072 characters are accepted and payloads of 131,073 characters are rejected. The table below audits whether exact boundary execution evidence exists in the repository for each field:

| Field | Input Size (Chars) | Test Case / Inspection Reference | Expected Result | Actual Observed Result | Evidence Classification | Proven Layer |
|---|---|---|---|---|---|---|
| `Positions_JSON__c` | `131,072` | `run-workstream-c-tests.cjs` Test 6 inspection | Accepted | Not directly executed at exact boundary in baseline | **Expected Behavior** (from source/metadata inspection) | Apex & Metadata capacity |
| `Positions_JSON__c` | `131,073` | `run-workstream-c-tests.cjs` Test 6 (param 4) | Rejected with `AuraHandledException` | **PASSED (Throws exception as expected)** | **EXECUTED OFFLINE TEST** | Apex guard (mock environment) |
| `Filters_JSON__c` | `131,072` | `Filters_JSON__c.field-meta.xml` & `daAppShell.js` line 254 | Accepted | Not directly executed at exact boundary in baseline | **Expected Behavior** (from source/metadata inspection) | Client guard & Metadata capacity |
| `Filters_JSON__c` | `131,073` | `daAppShell.js` line 254 & Apex line 64 | Rejected | Not executed in baseline suite due to Test 6 parameter defect | **Expected Behavior** (from source/metadata inspection) | Client & Apex guard (unexecuted) |
| `Zoom_Pan_JSON__c` | `131,072` | `Zoom_Pan_JSON__c.field-meta.xml` & Apex line 67 | Accepted | Not directly executed at exact boundary in baseline | **Expected Behavior** (from source/metadata inspection) | Apex guard & Metadata capacity |
| `Zoom_Pan_JSON__c` | `131,073` | Apex line 67 (`DAUserPreferenceController.cls`) | Rejected | Not executed in baseline suite due to Test 6 parameter defect | **Expected Behavior** (from source/metadata inspection) | Apex guard (unexecuted) |

*Important Evidence Distinction:* Exact boundary execution evidence (>131,072 characters rejected) exists in the repository **ONLY for `Positions_JSON__c`** via `run-workstream-c-tests.cjs` Test 6. The boundary results for `Filters_JSON__c` and `Zoom_Pan_JSON__c` are **expected behaviors derived from source code and metadata inspection**, NOT demonstrated execution or persistence.

---

## 5. Parameter Binding Mapping & Test Suite Defect Analysis

### 5.1 Controller Method Signature
The Apex controller method signature in `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` is:

```apex
public static DA_User_Preference__c saveUserPreference(
    String projectId,     // Parameter 1
    String viewMode,      // Parameter 2
    String layoutMode,    // Parameter 3
    String positionsJson, // Parameter 4
    String filtersJson,   // Parameter 5
    String zoomPanJson    // Parameter 6
)
```

### 5.2 Verification of Test 6 Parameter Defect
In the baseline test runner `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` (Test 6):
```javascript
// Baseline Test 6 Execution:
const oversized = 'a'.repeat(131073);
prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', oversized, null, null);
```
- **Factual Finding:** `oversized` is passed as Parameter 4 (`positionsJson`).
- **Defect Disclosed:** Test 6 tests only `Positions_JSON__c` validation. `Filters_JSON__c` (Parameter 5) and `Zoom_Pan_JSON__c` (Parameter 6) are passed as `null` and therefore remain unexercised at the oversized boundary in the existing offline test runner.

### 5.3 Target Specification for Remediation R4 Test Update
When Remediation R4 is authorized, `run-workstream-c-tests.cjs` Test 6 must be expanded into three explicit sub-tests:

```javascript
// Target R4 Specification:
// Test 6a: Positions_JSON__c Hard Limit (Parameter 4)
assert.throws(() => {
    prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', oversized, null, null);
}, /Positions JSON exceeds maximum allowed length/);

// Test 6b: Filters_JSON__c Hard Limit (Parameter 5)
assert.throws(() => {
    prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, oversized, null);
}, /Filters JSON exceeds maximum allowed length/);

// Test 6c: Zoom_Pan_JSON__c Hard Limit (Parameter 6)
assert.throws(() => {
    prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, null, oversized);
}, /Zoom Pan JSON exceeds maximum allowed length/);
```

---

## 6. Non-Implementation Confirmation

This document specifies the boundary contracts and documents the Test 6 parameter correction. No Apex controllers (`DAUserPreferenceController.cls`), LWC components, or test scripts (`run-workstream-c-tests.cjs`) were modified during this dispatch. The implementation hold remains **ACTIVE**.
