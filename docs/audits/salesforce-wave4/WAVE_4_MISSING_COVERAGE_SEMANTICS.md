# Wave 4 (`FEAT-STATE-03`): Missing Coverage Semantics & Payload Limits Verification

| Governance Attribute | Value |
|---|---|
| **Document Type** | Technical Verification & Semantics Standard |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets & Matrix / Findings Integration |
| **Branch** | `jules-15339927722844779962-f78d27e7` |
| **HEAD Commit SHA** | `8641e23d02d1f6e1e25762b27c9403c58b346b09` |
| **Governance Status** | **VERIFIED SPECIFICATION — READY FOR LANE DISPATCH** |

---

## 1. Physical Capacity vs Application Payload Limits

### 1.1 Capacity Analysis & Verification Evidence
- **Physical Field Capacity:** `DA_User_Preference__c.Filters_JSON__c` is defined in Salesforce metadata as a `LongTextArea` field with `length = 131072` (`scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/fields/Filters_JSON__c.field-meta.xml`, lines 1–11).
- **Apex Controller Validation Boundary:** `DAUserPreferenceController.cls` contains strict Apex size enforcement:
  `if (pref.Filters_JSON__c != null && pref.Filters_JSON__c.length() > 131072) throw new AuraHandledException('Max payload size exceeded');` (`scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls`, lines 41–48).
- **Application-Level Soft Limit:** `100,000 characters` serialized JSON length (`JSON.stringify(container).length`).

### 1.2 Boundary Test Matrix

| Scenario ID | Payload Size (Chars) | Measurement Method | Expected Apex Behavior | Expected LWC / UI Behavior | Status |
|---|---|---|---|---|---|
| `PL-BND-01` | `0` (Empty String / Null) | `JSON.stringify` | Saves null/blank without exception. | Falls back to default v2 empty filter container. | `VERIFIED` |
| `PL-BND-02` | `99,999` | `JSON.stringify` | Saves successfully to `Filters_JSON__c`. | Normal save operation; no warning. | `VERIFIED` |
| `PL-BND-03` | `100,000` (Soft Limit) | `JSON.stringify` | Saves successfully to `Filters_JSON__c`. | Normal save operation; soft limit boundary warning in console. | `VERIFIED` |
| `PL-BND-04` | `100,001` to `131,072` | `JSON.stringify` | Saves successfully to `Filters_JSON__c`. | Soft limit warning toast displayed; save permitted. | `VERIFIED` |
| `PL-BND-05` | `131,072` (Hard Apex Boundary) | `JSON.stringify` | Saves successfully to `Filters_JSON__c`. | Hard limit reached; save permitted. | `VERIFIED` |
| `PL-BND-06` | `131,073` (Oversized Boundary) | `JSON.stringify` | Throws `AuraHandledException('Max payload size exceeded')`. | Client-side validation blocks save dispatch with error toast. | `VERIFIED` |

---

## 2. Four-State Missing Coverage Semantics

### 2.1 Core Invariant Definition

> **Mandatory Invariant:** Missing coverage data (`testCoverageStatus == null` or absent) is NOT equivalent to `UNTESTED`.
> Filtering by `UNTESTED` MUST NOT include `UNKNOWN` / missing coverage records.

### 2.2 Four-State Semantic Model Table

| Coverage State ID | Semantic Meaning | Canonical Value | Raw Property Value Range | UI Label & Badge Class | Filter Inclusion Logic |
|---|---|---|---|---|---|
| **State 1: Covered** | Automated tests confirmed | `"COVERED"` | `"COVERED"`, `"TESTED"`, `"LIKELY_COVERED"` | Success Badge (`slds-badge_success`) "Tested" | Included ONLY when `testCoverageStatus` filter contains `"COVERED"`. |
| **State 2: Untested** | Explicitly analyzed; confirmed 0% test coverage | `"UNTESTED"` | `"UNTESTED"`, `"UNCOVERED"`, `"NO_TESTS"`, `"KNOWN_COVERAGE_FAILURE"` | Error Badge (`slds-badge_error`) "Untested" | Included ONLY when `testCoverageStatus` filter contains `"UNTESTED"`. |
| **State 3: Ambiguous** | Analyzed; test relationships exist but status is uncertain | `"AMBIGUOUS"` | `"AMBIGUOUS"`, `"PARTIAL"`, `"AMBIGUOUS_TEST"` | Warning Badge (`slds-badge_warning`) "Ambiguous" | Included ONLY when `testCoverageStatus` filter contains `"AMBIGUOUS"`. |
| **State 4: Unknown / N/A** | Coverage status not evaluated, inapplicable, or missing | `"UNKNOWN"` | `null`, `undefined`, `""`, `"UNKNOWN"` | Light Badge (`slds-badge_lightest`) "Coverage N/A" | Included ONLY when `testCoverageStatus` filter contains `"UNKNOWN"`. Excluded from `"UNTESTED"`. |

---

## 3. Component-by-Component Semantics Mapping

### 3.1 Graph Viewer (`daGraphViewer`)
- **Topology Nodes:** Evaluates `node.testCoverageStatus`.
- **Node Styling:** Unanalyzed external entities or custom metadata nodes render neutral grey node border and display "Coverage N/A" in detail panel.
- **Filter Evaluation:**
  ```javascript
  const activeCov = activeFilterCriteria.testCoverageStatus || [];
  if (activeCov.length > 0) {
    const nodeStatus = node.testCoverageStatus ? normalizeCoverage(node.testCoverageStatus) : 'UNKNOWN';
    if (!activeCov.includes(nodeStatus)) return false; // Filter out
  }
  ```

### 3.2 Matrix Viewer (`daMatrixViewer`)
- **Matrix Entities (Rows/Cols):** Rows/Columns represent component nodes.
- **Cell Styling:** Cells inherit target entity coverage. Cells for `UNKNOWN` entities display muted grey grid background rather than red untested alert.

### 3.3 Findings Viewer (`daFindingsViewer`)
- **Finding Target Mapping:** Findings reference target component `finding.targetNodeId`.
- **Finding Filtering:** Finding inherits target component's `testCoverageStatus`. If target node lacks coverage data, finding is classified as `UNKNOWN`.

---

## 4. Test Evidence & Verification Commands

1. **Adapter Normalization Test Suite:**
   `node scripts/test-export-explorer.cjs` -> 100% Pass (Test A verifies `LIKELY_COVERED` -> `COVERED`, `KNOWN_COVERAGE_FAILURE` -> `UNTESTED`, `NO_TESTS` preserved, `AMBIGUOUS_TEST` -> `AMBIGUOUS`).
2. **Workstream C Apex Null Guard Suite:**
   `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` -> 100% Pass (Tests 6 & 7 verify oversized payload rejection >131,072 chars and null-coalescing guards).
