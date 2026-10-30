# Wave 4 (`FEAT-STATE-03`): Technical Remediation Specification R1–R4

| Governance Attribute | Value |
|---|---|
| **Document Type** | Technical Remediation Specification & Algorithm Contract |
| **Target Feature** | Wave 4 — Proposed Remediations R1, R2, R3, R4 |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-8132510048781945081-00416bfe` |
| **HEAD Commit SHA** | `250f56dfd26a4044387188e38ea85e0d976922f3` |
| **Audit Date** | March 2025 |
| **Status** | **SPECIFICATION COMPLETE — READY FOR HUMAN EXCEPTION AUTHORIZATION** |

---

## 1. Remediation R1 — Apex Backward Compatibility & Fail-Closed Preset Preservation

### 1.1 Defect & Root Cause
In `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` (line 124):
```apex
if (filtersJson != null) {
    prefRecord.Filters_JSON__c = filtersJson;
}
```
When a Wave 3 legacy client or flat v1 JSON payload is saved via `saveUserPreference`, line 124 unconditionally overwrites `Filters_JSON__c`. If the record contains a Wave 4 v2 container payload (`{ "schemaVersion": 2, "presets": [...], "activeFilter": {...} }`), all existing user presets are wiped out and permanently lost.

Prior proposed algorithms in draft reports contained a fatal flaw:
```apex
// FLAWED DRAFT:
catch (Exception e) {
    return incomingV1Json; // FLAW: Overwrites existing v2 container on parse error!
}
```

### 1.2 Fail-Closed Algorithm Contract
Lane B must implement the private helper `mergeV1IntoV2Container` in `DAUserPreferenceController.cls` adhering to these strict rules:

1. **Rule 1 (Null Existing):** If `existingV2Json` is blank/null, return `incomingV1Json`.
2. **Rule 2 (Null Incoming):** If `incomingV1Json` is blank/null, return `existingV2Json`.
3. **Rule 3 (v2 Preservation):** If `existingV2Json` is a valid v2 container and `incomingV1Json` is a flat v1 filter, merge `incomingV1Json` into `existingV2Json.activeFilter` while preserving `existingV2Json.presets` untouched.
4. **Rule 4 (Fail-Closed Invariant):** If JSON parsing, type casting, or merging fails due to corrupted existing data or malformed incoming data, **CATCH THE EXCEPTION AND RETURN `existingV2Json` INTACT**. NEVER fall back to destructive v1 replacement.

### 1.3 Apex Algorithm Implementation
```apex
@TestVisible
private static String mergeV1IntoV2Container(String existingV2Json, String incomingV1Json) {
    if (String.isBlank(existingV2Json)) {
        return incomingV1Json;
    }
    if (String.isBlank(incomingV1Json)) {
        return existingV2Json;
    }

    try {
        Map<String, Object> existingContainer = (Map<String, Object>) JSON.deserializeUntyped(existingV2Json);

        if (existingContainer != null && (existingContainer.containsKey('schemaVersion') || existingContainer.containsKey('presets'))) {
            Map<String, Object> incomingFilter = (Map<String, Object>) JSON.deserializeUntyped(incomingV1Json);

            if (incomingFilter != null && !incomingFilter.containsKey('schemaVersion')) {
                existingContainer.put('activeFilter', incomingFilter);
                return JSON.serialize(existingContainer);
            }
        }

        return incomingV1Json;
    } catch (Exception e) {
        // FAIL-CLOSED INVARIANT: Return existing v2 data intact on parse/merge failure.
        return existingV2Json;
    }
}
```

### 1.4 Test Cases Required
- Wave 3 flat v1 save over Wave 4 v2 container preserves `presets[]`.
- Malformed existing JSON returns existing string without throwing or wiping.
- Malformed incoming JSON returns existing v2 container without wiping.
- Valid Wave 4 v2 container save cleanly replaces container.

---

## 2. Remediation R2 — Exporter Four-State Coverage Normalization

### 2.1 Defect & Root Cause
In `scripts/export-explorer.cjs` line 331, falsey `status` (`null`, `undefined`, `""`) returns `"UNTESTED"`. This corrupts the data model by treating unanalyzed nodes as tested and missing coverage.

### 2.2 Corrected Implementation
Modify `normalizeTestCoverageStatus` in `scripts/export-explorer.cjs`:

```javascript
function normalizeTestCoverageStatus(status) {
  if (status === null || status === undefined || String(status).trim() === "") {
    return "UNKNOWN";
  }
  const s = String(status).trim().toLowerCase().replace(/_/g, "-");
  if (s === "likely-covered" || s === "covered") return "COVERED";
  if (s === "known-coverage-failure" || s === "untested") return "UNTESTED";
  if (s === "no-tests" || s === "no-test-evidence") return "NO_TESTS";
  if (s === "ambiguous-test" || s === "ambiguous" || s === "ambiguous-tests") return "AMBIGUOUS";
  return "UNKNOWN";
}
```

---

## 3. Remediation R3 — Governance Evidence & File Inventory Alignment

### 3.1 Defect & Root Cause
Prior reports had math errors and omitted 8 critical files.

### 3.2 Corrected Alignment
Reconcile all governance records to reflect the itemized 43-file inventory established in `WAVE_4_FINAL_RECONCILED_FILE_OWNERSHIP_INVENTORY.md`.

---

## 4. Remediation R4 — Payload Boundary Executable Verification

### 4.1 Defect & Root Cause
In `run-workstream-c-tests.cjs` Test 6, parameter 4 (`positionsJson`) was passed as `oversized`, testing `Positions_JSON__c` length limits instead of `Filters_JSON__c`. Furthermore, the 100,000 soft limit lacked explicit unit test assertions.

### 4.2 Field Capacity Concepts
- **Salesforce Physical LongTextArea Limit:** 131,072 characters.
- **Apex Hard Boundary Limit:** 131,072 characters (enforced via `throw new AuraHandledException(...)`).
- **Proposed Application Soft Limit:** 100,000 characters.

### 4.3 Test Suite Boundary Matrix
Add explicit unit tests in `run-workstream-c-tests.cjs` and `DAUserPreferenceControllerTest.cls` for `Filters_JSON__c`, `Positions_JSON__c`, and `Zoom_Pan_JSON__c`:

| Length (Chars) | Boundary Concept | Expected Result | Exception / Error Message |
|---|---|---|---|
| `null` / `0` | Empty Field | **PASSED** | None |
| `99,999` | Below Soft Limit | **PASSED** | None |
| `100,000` | Exact Soft Limit | **PASSED** | None |
| `100,001` | Soft Limit Breach | **PASSED (Apex Hard)** / Warning (UI) | Soft limit warning log (or Apex hard pass if soft limit not enforced in Apex) |
| `131,072` | Exact Hard Limit | **PASSED** | None |
| `131,073` | Hard Limit Breach | **REJECTED** | `AuraHandledException: <Field> JSON exceeds maximum allowed length of 131,072 characters.` |

---

## 5. Rollback & Risk Considerations

- **R1 Rollback:** In the event of an unforeseen regression in Apex merge logic, removing the helper call reverts to direct field assignment (re-introducing legacy overwrite behavior, but restoring baseline code).
- **R2 Rollback:** Reverting line 331 in `scripts/export-explorer.cjs` restores previous fallback behavior.
- **R4 Rollback:** Additional unit tests in `run-workstream-c-tests.cjs` are strictly additive and carry zero runtime risk.
