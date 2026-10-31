# Wave 4 (`FEAT-STATE-03`): Field-Specific Payload Boundary Contract (R4)

| Governance Attribute | Value |
|---|---|
| **Document Type** | Payload Boundary Specification & Test Suite Verification Contract |
| **Target Feature** | Wave 4 — Remediation R4 & Preference Fields Boundary Verification |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-5014689980934327006-a6a229d3` |
| **HEAD Commit SHA** | `8ff54cae850a4f569da5f8ee602e142b74a110bc` |
| **Audit Date** | March 2026 (Execution Date) / October 2026 Roadmap |
| **Status** | **SPECIFICATION COMPLETE — READY FOR HUMAN REVIEW — IMPLEMENTATION HOLD ACTIVE** |

---

## 1. Context & Evidence-Based Boundary Analysis

This contract establishes the exact field-specific payload boundary specifications across all three governed `DA_User_Preference__c` long text fields:
1. `Filters_JSON__c`
2. `Positions_JSON__c`
3. `Zoom_Pan_JSON__c`

### 1.1 Resolution of Prior Specification Contradictions
Prior specification drafts claimed that an application "soft limit" of 100,000 characters was enforced client-side for `Filters_JSON__c`, while also claiming client-side rejections occurred for `Positions_JSON__c` and `Zoom_Pan_JSON__c` at 131,073 characters.

An inspection of actual repository source files clarifies:
- **`daAppShell.js` (Lines 8 & 236):** Enforces a client-side hard limit check against `MAX_PAYLOAD_SIZE = 131072` specifically for `filtersJson`. No 100,000 character soft limit exists in `daAppShell.js`.
- **`daAppShell.js` Client Limitation:** Does **NOT** handle or validate `Positions_JSON__c` or `Zoom_Pan_JSON__c` client-side (passes `null` for both when issuing save requests).
- **`DAUserPreferenceController.cls` (Lines 61–69):** Independently validates length for all three parameters against hard limit 131,072 and throws `AuraHandledException` if exceeded.
- **Salesforce Custom Field Metadata (`*.field-meta.xml`):** All three fields define `<type>LongTextArea</type>` with `<length>131072</length>`.

---

## 2. Authoritative Field Boundary Summary Matrix

| Field Name | Client-Side Soft Limit | Client-Side Hard Limit | Apex Hard Guard | Metadata Capacity | Source Evidence |
|---|---|---|---|---|---|
| **`Filters_JSON__c`** | None (Unenforced) | **131,072 chars** | **131,072 chars** | **131,072 chars** | `daAppShell.js` line 236 & `DAUserPreferenceController.cls` line 64 |
| **`Positions_JSON__c`** | None | None (Unchecked in LWC) | **131,072 chars** | **131,072 chars** | `DAUserPreferenceController.cls` line 61 & `Positions_JSON__c.field-meta.xml` |
| **`Zoom_Pan_JSON__c`** | None | None (Unchecked in LWC) | **131,072 chars** | **131,072 chars** | `DAUserPreferenceController.cls` line 67 & `Zoom_Pan_JSON__c.field-meta.xml` |

---

## 3. Detailed Field Boundary Behavior Tables

### 3.1 `Filters_JSON__c` Boundary Validation Matrix

| Input Length (Chars) | Boundary Concept | Expected Client Behavior (`daAppShell.js`) | Expected Apex Behavior (`DAUserPreferenceController.cls`) | Expected Salesforce Metadata Behavior | Expected Outcome / Exception Message |
|---|---|---|---|---|---|
| `null` | Unset Field | Permitted | Permitted | Permitted | Preserves existing saved field value |
| `0` | Empty String | Permitted | Permitted | Permitted | Field cleared / updated to `""` |
| `1` | Minimal JSON | Permitted | Permitted | Permitted | Success |
| `99,999` | Typical Large Filter | Permitted | Permitted | Permitted | Success |
| `100,000` | Standard Boundary | Permitted | Permitted | Permitted | Success |
| `100,001` | Large Payload | Permitted | Permitted | Permitted | Success |
| `131,071` | Near Hard Limit | Permitted | Permitted | Permitted | Success |
| `131,072` | Exact Capacity | Permitted | Permitted | Permitted | Success (Max physical capacity) |
| `131,073` | Above Capacity | **REJECTED CLIENT-SIDE** | **REJECTED APEX** | Rejected DB | `AuraHandledException: Filters JSON exceeds maximum allowed length of 131,072 characters.` |

---

### 3.2 `Positions_JSON__c` Boundary Validation Matrix

| Input Length (Chars) | Boundary Concept | Expected Client Behavior (`daAppShell.js`) | Expected Apex Behavior (`DAUserPreferenceController.cls`) | Expected Salesforce Metadata Behavior | Expected Outcome / Exception Message |
|---|---|---|---|---|---|
| `null` | Unset Field | Passed as `null` | Permitted | Permitted | Preserves existing saved positions |
| `0` | Empty String | Unhandled | Permitted | Permitted | Field cleared |
| `100,000` | Standard Graph Layout | Unhandled | Permitted | Permitted | Success |
| `131,072` | Exact Capacity | Unhandled | Permitted | Permitted | Success |
| `131,073` | Above Capacity | Unhandled (Not checked in LWC) | **REJECTED APEX** | Rejected DB | `AuraHandledException: Positions JSON exceeds maximum allowed length of 131,072 characters.` |

---

### 3.3 `Zoom_Pan_JSON__c` Boundary Validation Matrix

| Input Length (Chars) | Boundary Concept | Expected Client Behavior (`daAppShell.js`) | Expected Apex Behavior (`DAUserPreferenceController.cls`) | Expected Salesforce Metadata Behavior | Expected Outcome / Exception Message |
|---|---|---|---|---|---|
| `null` | Unset Field | Passed as `null` | Permitted | Permitted | Preserves existing saved zoom/pan |
| `0` | Empty String | Unhandled | Permitted | Permitted | Field cleared |
| `1,000` | Typical Viewport | Unhandled | Permitted | Permitted | Success |
| `131,072` | Exact Capacity | Unhandled | Permitted | Permitted | Success |
| `131,073` | Above Capacity | Unhandled (Not checked in LWC) | **REJECTED APEX** | Rejected DB | `AuraHandledException: Zoom Pan JSON exceeds maximum allowed length of 131,072 characters.` |

---

## 4. Parameter Binding Mapping & Test Suite Defect Analysis

### 4.1 Method Parameter Binding
The Apex controller method signature in `DAUserPreferenceController.cls` is:

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

### 4.2 Analysis of Test 6 Parameter Binding Defect
In the baseline test runner `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` (Test 6):
```javascript
// Current Baseline Test 6 Execution:
const oversized = 'a'.repeat(131073);
prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', oversized, null, null);
```
- **Defect Identified:** `oversized` was passed in parameter position 4 (`positionsJson`). Consequently, Test 6 tested `Positions_JSON__c` length validation, NOT `Filters_JSON__c` (parameter position 5) or `Zoom_Pan_JSON__c` (parameter position 6).

### 4.3 Target Test Specification for Remediation R4
When Remediation R4 is human-authorized, `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` Test 6 must be updated to test all three fields independently:

```javascript
// Target R4 Specification:
// Test 6a: Positions_JSON__c Hard Limit (Param 4)
assert.throws(() => {
    prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', oversized, null, null);
}, /Positions JSON exceeds maximum allowed length/);

// Test 6b: Filters_JSON__c Hard Limit (Param 5)
assert.throws(() => {
    prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, oversized, null);
}, /Filters JSON exceeds maximum allowed length/);

// Test 6c: Zoom_Pan_JSON__c Hard Limit (Param 6)
assert.throws(() => {
    prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', null, null, oversized);
}, /Zoom Pan JSON exceeds maximum allowed length/);
```

---

## 5. Non-Implementation Confirmation

This document specifies the field boundary contracts and test parameter corrections. No Apex controllers (`DAUserPreferenceController.cls`), LWC components, or test scripts (`run-workstream-c-tests.cjs`) were modified during this dispatch.
