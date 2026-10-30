# Wave 4 (`FEAT-STATE-03`): Field-Specific Payload Boundary Contract (R4)

| Governance Attribute | Value |
|---|---|
| **Document Type** | Payload Boundary Specification & Test Suite Verification Contract |
| **Target Feature** | Wave 4 — Remediation R4 & Preference Fields Boundary Verification |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-11542301699362109650-b5a0782a` |
| **HEAD Commit SHA** | `8d9dc237611e0111122c3f3c1b0b0d16aae6ca2c` |
| **Audit Date** | March 2025 |
| **Status** | **SPECIFICATION COMPLETE — READY FOR HUMAN REVIEW** |

---

## 1. Context & Identified Test Parameter Mismatch

In the current baseline test suite `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` (Test 6):
- The test purports to verify `Filters_JSON__c` length limits when calling `DAUserPreferenceController.saveUserPreference()`.
- However, parameter position 4 (`positionsJson`) was passed as `oversized`, testing `Positions_JSON__c` instead of `Filters_JSON__c` (parameter position 5).

Remediation R4 specifies the field-specific payload boundary limits and corrects test parameter bindings.

---

## 2. Distinction Between Physical Hard Limits & Application Soft Limits

To prevent specification confusion, two distinct capacity boundaries are defined:

1. **Salesforce Physical Field Hard Limit (131,072 Characters):**
   - Enforced by Salesforce Custom Field Metadata (`LongTextArea` max length 131,072) and guarded in Apex (`DAUserPreferenceController.cls` lines 61–69):
     ```apex
     if (filtersJson != null && filtersJson.length() > 131072) {
         throw new AuraHandledException('Filters JSON exceeds maximum allowed length of 131,072 characters.');
     }
     ```
2. **Application Soft Safety Ceiling (100,000 Characters):**
   - Enforced client-side in LWC (`daAppShell.js`) before issuing Apex save requests to prevent approaching database boundaries and provide clear user messaging.

---

## 3. Field-Specific Boundary Validation Matrices

### 3.1 `Filters_JSON__c` Boundary Validation Matrix

| Input Length (Chars) | Boundary Concept | Expected Client LWC Behavior | Expected Apex Behavior | Expected Salesforce Metadata Behavior | Expected Error / Return Message |
|---|---|---|---|---|---|
| `null` | Unset Field | Permitted | Permitted | Permitted | Field remains null / existing preserved |
| `0` | Empty String | Permitted | Permitted | Permitted | Field cleared |
| `99,999` | Below Soft Limit | Permitted | Permitted | Permitted | Success |
| `100,000` | Exact Soft Limit | Permitted | Permitted | Permitted | Success |
| `100,001` | Above Soft Ceiling | **REJECTED CLIENT-SIDE** | Permitted (if sent) | Permitted (if sent) | Client Warning: *"Preset payload soft limit exceeded (100,000 chars)."* |
| `131,072` | Exact Physical Capacity | Blocked by Soft Limit | Permitted | Permitted | Success |
| `131,073` | Above Hard Boundary | Blocked by Soft Limit | **REJECTED APEX** | Rejected DB | `AuraHandledException: Filters JSON exceeds maximum allowed length of 131,072 characters.` |

---

### 3.2 `Positions_JSON__c` Boundary Validation Matrix

| Input Length (Chars) | Boundary Concept | Expected Client LWC Behavior | Expected Apex Behavior | Expected Salesforce Metadata Behavior | Expected Error / Return Message |
|---|---|---|---|---|---|
| `null` | Unset Field | Permitted | Permitted | Permitted | Field remains null |
| `0` | Empty String | Permitted | Permitted | Permitted | Field cleared |
| `99,999` | Below Limit | Permitted | Permitted | Permitted | Success |
| `100,000` | Standard Payload | Permitted | Permitted | Permitted | Success |
| `100,001` | Above Soft Limit | Permitted | Permitted | Permitted | Success (Positions JSON has no soft ceiling) |
| `131,072` | Exact Physical Capacity | Permitted | Permitted | Permitted | Success |
| `131,073` | Above Hard Boundary | Blocked | **REJECTED APEX** | Rejected DB | `AuraHandledException: Positions JSON exceeds maximum allowed length of 131,072 characters.` |

---

### 3.3 `Zoom_Pan_JSON__c` Boundary Validation Matrix

| Input Length (Chars) | Boundary Concept | Expected Client LWC Behavior | Expected Apex Behavior | Expected Salesforce Metadata Behavior | Expected Error / Return Message |
|---|---|---|---|---|---|
| `null` | Unset Field | Permitted | Permitted | Permitted | Field remains null |
| `0` | Empty String | Permitted | Permitted | Permitted | Field cleared |
| `1,000` | Typical View State | Permitted | Permitted | Permitted | Success |
| `131,072` | Exact Physical Capacity | Permitted | Permitted | Permitted | Success |
| `131,073` | Above Hard Boundary | Blocked | **REJECTED APEX** | Rejected DB | `AuraHandledException: Zoom Pan JSON exceeds maximum allowed length of 131,072 characters.` |

---

## 4. Test Parameter Binding Specification for Remediation R4

When Remediation R4 is implemented following human authorization, `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` Test 6 must be updated from:

```javascript
// INCORRECT (Current Baseline):
DAUserPreferenceController.saveUserPreference(
  projectId, viewMode, layoutMode, oversizedJson, null, null
); // Parameter 4 = positionsJson
```

To explicit field-specific boundary tests:

```javascript
// CORRECT (Target R4 Specification):
// Test 6a: Filters_JSON__c Hard Limit (131,073 chars)
DAUserPreferenceController.saveUserPreference(
  projectId, viewMode, layoutMode, null, oversizedJson, null
); // Parameter 5 = filtersJson -> Expect AuraHandledException

// Test 6b: Positions_JSON__c Hard Limit (131,073 chars)
DAUserPreferenceController.saveUserPreference(
  projectId, viewMode, layoutMode, oversizedJson, null, null
); // Parameter 4 = positionsJson -> Expect AuraHandledException

// Test 6c: Zoom_Pan_JSON__c Hard Limit (131,073 chars)
DAUserPreferenceController.saveUserPreference(
  projectId, viewMode, layoutMode, null, null, oversizedJson
); // Parameter 6 = zoomPanJson -> Expect AuraHandledException
```

---

## 5. Non-Implementation Confirmation

This document specifies the boundary contracts and test corrections. No test runners or Apex files were edited during this dispatch.
