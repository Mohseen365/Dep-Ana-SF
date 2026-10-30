# Wave 4 (`FEAT-STATE-03`): Critical Remediation Proposal

| Governance Attribute | Value |
|---|---|
| **Document Type** | Technical Remediation Proposal & Exception Request |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets & Matrix / Findings Integration |
| **Branch** | `jules-12193033494328634635-fae468a5` |
| **HEAD Commit SHA** | `d5963b8831026e1a1c384e592a61ddd401be4c55` |
| **Audit Date** | March 2025 |
| **Proposal Status** | **PROPOSED FOR HUMAN AUTHORIZATION EXCEPTION** |

---

## Executive Summary

This proposal outlines a narrowly scoped technical remediation package (Remediations R1 through R4) designed to resolve four critical defects identified during the forensic audit of Wave 4 (`FEAT-STATE-03`).

Authorizing these remediations under a **Limited Technical Exception** allows engineering to eliminate data-loss risks, correct coverage reporting, fix inventory omissions, and execute true payload boundary tests *prior to* or *concurrently with* human approval of the four main product/architecture decision gates (`DEC-W4-01` through `DEC-W4-04`).

---

## 1. Remediation R1 — Apex Backward-Compatibility & Preset Preservation Guard

### 1.1 Technical Justification & Vulnerability Details
In `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` (line 124):
```apex
if (filtersJson != null) {
    prefRecord.Filters_JSON__c = filtersJson;
}
```
When a legacy Wave 3 client (or a client sending flat v1 JSON) calls `saveUserPreference`, line 124 unconditionally overwrites `Filters_JSON__c`. If the record already contains a Wave 4 v2 container string (`{ "schemaVersion": 2, "presets": [...], "activeFilter": {...} }`), the v2 container is destroyed and all user-created presets are permanently lost.

Furthermore, forensic audit of the sample algorithm previously published in `docs/audits/salesforce-wave4/WAVE_4_BACKWARD_COMPATIBILITY_VERIFICATION_MATRIX.md` revealed a critical safety flaw:
```apex
// FLAWED PROPOSAL IN PRIOR REPORT:
catch (Exception e) {
    return incomingV1Json; // FLAW: Overwrites existing v2 data on parse/merge failure!
}
```
Returning `incomingV1Json` on exception directly violates the mandatory safety requirement: parse or merge failures **must fail closed** and preserve existing v2 data.

### 1.2 Fail-Closed Technical Algorithm & Implementation Approach
Lane B must implement `mergeV1IntoV2Container` in `DAUserPreferenceController.cls` using the following fail-closed algorithm:

```apex
private static String mergeV1IntoV2Container(String existingV2Json, String incomingV1Json) {
    if (String.isBlank(existingV2Json)) {
        return incomingV1Json;
    }
    if (String.isBlank(incomingV1Json)) {
        return existingV2Json;
    }

    try {
        Map<String, Object> existingContainer = (Map<String, Object>) JSON.deserializeUntyped(existingV2Json);

        // Inspect if existing container is a valid v2 schema container
        if (existingContainer.containsKey('schemaVersion') || existingContainer.containsKey('presets')) {
            Map<String, Object> incomingFilter = (Map<String, Object>) JSON.deserializeUntyped(incomingV1Json);

            // If incoming is flat v1, nest it into activeFilter while keeping presets[] intact
            if (!incomingFilter.containsKey('schemaVersion')) {
                existingContainer.put('activeFilter', incomingFilter);
                return JSON.serialize(existingContainer);
            }
        }

        // If existing data was not a v2 container, accept incoming
        return incomingV1Json;
    } catch (Exception e) {
        // MANDATORY FAIL-CLOSED INVARIANT: On parse/merge failure, NEVER overwrite with destructive v1.
        // Return existing v2 data intact.
        return existingV2Json;
    }
}
```

### 1.3 Affected Files
- `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` (Source)
- `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls` (Apex Test)
- `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` (Offline Test Simulator)

### 1.4 Required Test Scenarios
1. **Wave 3 Save over Wave 4 Container:** Flat v1 save preserves `presets[]` array and updates `activeFilter`.
2. **Malformed Incoming v1 JSON:** Exception caught, returns `existingV2Json` without mutating presets.
3. **Corrupted Existing v2 JSON:** Exception caught, returns `existingV2Json` without wiping record.
4. **Wave 4 v2 Save over Wave 4 Container:** Round-trip v2 overwrite succeeds cleanly.

### 1.5 Governance & Exception Attributes
- **Responsible Lane:** Lane B (Apex Controller).
- **Required Approver Role:** Lead Architect.
- **Explicit Exception Required:** YES (modifies Apex source and Apex test class).
- **Separation from DEC-W4-01..04:** Independent data-loss prevention fix.

---

## 2. Remediation R2 — Four-State Coverage Normalization Alignment

### 2.1 Technical Justification & Defect Details
In `scripts/export-explorer.cjs` (line 215):
```javascript
function normalizeTestCoverageStatus(status) {
  if (!status) return "UNTESTED"; // DEFECT: Misclassifies missing/empty status as UNTESTED
  ...
  return "UNTESTED"; // DEFECT: Fallback misclassifies unknown status as UNTESTED
}
```
This violates the mandatory semantic invariant established across Wave 4 specifications:
> **Core Invariant:** Missing coverage data (`null`, `undefined`, `""`, absent) is **NOT equivalent to `UNTESTED`**.
> Filtering by `UNTESTED` MUST NEVER include `UNKNOWN` entities.

### 2.2 Corrected Exporter Implementation Approach
Update `normalizeTestCoverageStatus` in `scripts/export-explorer.cjs`:

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

### 2.3 Raw Property Mapping Justification
- `LIKELY_COVERED` -> `"COVERED"`: Justified by static AST method call-graph evidence and `@isTest` annotations (policy decision to map static AST likelihood to `COVERED` in explorer output model).
- `KNOWN_COVERAGE_FAILURE` -> `"UNTESTED"`: Justified by explicit test execution failure or 0% coverage assertion.
- `NO_TESTS` -> Raw signal `"NO_TESTS"` / Filter category `"UNTESTED"`: Preserved in exporter node metadata, mapped to `UNTESTED` during UI filtering.
- `AMBIGUOUS_TEST` -> `"AMBIGUOUS"`: Justified by indirect or inconclusive AST relationships.
- `null` / `undefined` / `""` / Absent -> `"UNKNOWN"`: Justified by absence of analysis or unmapped component status.

### 2.4 Affected Files
- `scripts/export-explorer.cjs` (Source)
- `scripts/test-export-explorer.cjs` (Test Suite)
- `scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js` (Lane A contract module when created)

### 2.5 Governance & Exception Attributes
- **Responsible Lane:** Core Exporter / Lane A.
- **Required Approver Role:** Lead Architect & Product Owner.
- **Explicit Exception Required:** YES (modifies exporter JavaScript script).
- **Separation from DEC-W4-01..04:** Independent normalization bug fix.

---

## 3. Remediation R3 — Evidence Integrity & Ownership Inventory Reconciliation

### 3.1 Technical Justification & Inventory Gaps
The original 30-file inventory in `docs/audits/salesforce-wave4/WAVE_4_COMPLETE_FILE_OWNERSHIP_INVENTORY.md` omitted:
- `scripts/export-explorer.cjs` (Exporter source)
- `scripts/test-export-explorer.cjs` (Exporter test runner)
- `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` (Workstream A test runner)
- `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` (Workstream C test runner)
- `scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/fields/Filters_JSON__c.field-meta.xml` (Schema metadata)
- New governance and reconciliation audit report deliverables.

### 3.2 Implementation Approach
Publish `WAVE_4_CORRECTED_PROPOSED_FILE_OWNERSHIP_INVENTORY.md` establishing explicit single-lane ownership for all 38 files, and align executive summary documents to reflect open remediation work.

### 3.3 Governance & Exception Attributes
- **Responsible Lane:** Migration Auditor / Governance.
- **Required Approver Role:** Migration Auditor.
- **Explicit Exception Required:** NO (documentation proposal).

---

## 4. Remediation R4 — Payload Boundary Executable Verification

### 4.1 Technical Justification & Test Mismatch
In `docs/audits/salesforce-wave4/WAVE_4_FINAL_IMPLEMENTATION_AUTHORIZATION_GATE.md` Section 3, payload boundary enforcement for oversized input (>131,072 characters) was claimed as an `EXECUTED TEST` for `Filters JSON` via `run-workstream-c-tests.cjs` Test 6.

Inspection of `run-workstream-c-tests.cjs` line 273 reveals:
```javascript
prefService.saveUserPreference('001_proj_alpha', 'graph', 'orbit', oversized, null, null);
```
Parameter 4 passed is `positionsJson`, meaning Test 6 tested `Positions_JSON__c` length limit, NOT `Filters_JSON__c`.

Furthermore:
- Soft limit (100,000 characters) is documented in specs but lacks explicit unit test execution.
- Hard limit exact boundary (131,072 characters accepted vs 131,073 characters rejected) lacks distinct test cases for `Filters_JSON__c` and `Zoom_Pan_JSON__c`.

### 4.2 Implementation Approach
Add explicit, dedicated test cases in `run-workstream-c-tests.cjs` and `DAUserPreferenceControllerTest.cls` validating:
1. `Filters_JSON__c` length = 0 / null (accepted).
2. `Filters_JSON__c` length = 99,999 (accepted).
3. `Filters_JSON__c` length = 100,000 (soft limit boundary).
4. `Filters_JSON__c` length = 100,001 (soft limit breach).
5. `Filters_JSON__c` length = 131,072 (exact Apex/LongTextArea max capacity, accepted).
6. `Filters_JSON__c` length = 131,073 (throws `Filters JSON exceeds maximum allowed length of 131,072 characters.`).

### 4.3 Affected Files
- `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`
- `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls`

### 4.4 Governance & Exception Attributes
- **Responsible Lane:** Lane B / Integration Coordinator.
- **Required Approver Role:** Lead Architect.
- **Explicit Exception Required:** YES (modifies test code).

---

## 5. Summary of Proposed Remediation Authorization Request

| Remediation | Target Area | Files Modified | Approver Role | Exception Required? | Separation from DEC-W4-01..04 |
|---|---|---|---|---|---|
| **R1** | Apex v1/v2 Backward Compatibility | `DAUserPreferenceController.cls`, `DAUserPreferenceControllerTest.cls`, `run-workstream-c-tests.cjs` | Lead Architect | **YES** | Independent Data Protection |
| **R2** | Four-State Coverage Normalization | `scripts/export-explorer.cjs`, `scripts/test-export-explorer.cjs` | Lead Architect & Product Owner | **YES** | Independent Normalization |
| **R3** | Inventory & Evidence Reconciliation | Inventory documentation reports | Migration Auditor | **NO** | Pure Documentation |
| **R4** | Payload Boundary Verification | `run-workstream-c-tests.cjs`, `DAUserPreferenceControllerTest.cls` | Lead Architect | **YES** | Independent Test Quality |
