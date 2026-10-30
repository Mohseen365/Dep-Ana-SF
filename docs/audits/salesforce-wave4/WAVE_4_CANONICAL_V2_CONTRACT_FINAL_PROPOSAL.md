# Wave 4 (`FEAT-STATE-03`): Canonical V2 Contract Final Proposal

| Contract Attribute | Value |
|---|---|
| **Contract Version** | `v2.0.0-canonical` |
| **Module Ownership** | Lane A (`scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daFilterSchema.js`) |
| **Governance Status** | **PROPOSED CANONICAL CONTRACT — PENDING HUMAN APPROVALS** |
| **Governance Classification** | `APPROVAL RECORDED IN REPOSITORY — UNDERLYING HUMAN PROVENANCE NOT INDEPENDENTLY VERIFIED` |

---

## 1. Executive Context & Contract Reconciliation

During Wave 4 decision preparation and readiness analysis, three competing schema variants and two communication models were identified across decision documents (`DEC_W4_01`, `DEC_W4_02`), specifications (`WAVE_4_CANONICAL_FILTER_CONTRACT_SPECIFICATION.md`), and readiness reports (`WAVE_4_DEPENDENCY_AND_ARCHITECTURE_ANALYSIS.md`).

This document reconciles all discrepancies into one authoritative, fully specified, testable canonical contract.

---

## 2. Canonical V2 JSON Schema

The authoritative JSON container persisted in `DA_User_Preference__c.Filters_JSON__c` MUST adhere to the following draft-07 JSON Schema definition:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Wave4FilterPresetContainerV2",
  "type": "object",
  "required": ["schemaVersion", "presets", "activeFilter"],
  "properties": {
    "schemaVersion": {
      "type": "integer",
      "enum": [2],
      "description": "Explicit integer version identifier. Fixed at 2 for Wave 4."
    },
    "activePresetId": {
      "type": ["string", "null"],
      "description": "ID of currently selected preset, or null if custom/un-saved criteria are active."
    },
    "presets": {
      "type": "array",
      "description": "Collection of saved named filter presets for the project.",
      "items": {
        "type": "object",
        "required": ["id", "name", "criteria"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "isDefault": { "type": "boolean", "default": false },
          "criteria": { "$ref": "#/definitions/CanonicalFilterCriteria" }
        }
      }
    },
    "activeFilter": {
      "$ref": "#/definitions/CanonicalFilterCriteria",
      "description": "Currently active filter criteria applied across active views."
    }
  },
  "definitions": {
    "CanonicalFilterCriteria": {
      "type": "object",
      "required": ["searchTerm", "riskLevels", "nodeTypes", "layers", "testCoverageStatus", "findingsSeverity", "findingsStatus"],
      "properties": {
        "searchTerm": { "type": "string", "default": "" },
        "riskLevels": { "type": "array", "items": { "type": "string" }, "default": [] },
        "nodeTypes": { "type": "array", "items": { "type": "string" }, "default": [] },
        "layers": { "type": "array", "items": { "type": "string" }, "default": [] },
        "testCoverageStatus": { "type": "array", "items": { "type": "string" }, "default": [] },
        "findingsSeverity": { "type": "array", "items": { "type": "string" }, "default": [] },
        "findingsStatus": { "type": "array", "items": { "type": "string" }, "default": [] }
      }
    }
  }
}
```

---

## 3. Discrepancy Field Mapping & Normalization Table

To ensure backwards compatibility with legacy Wave 3 payloads and resolve document contradictions, the following field mapping is enforced during payload normalization:

| Proposal A (`DEC_W4_01` / Readiness) | Proposal B (`SPEC_V2`) | Canonical V2 Field | Field Type | Default Value | Normalization & Legacy Behavior |
|---|---|---|---|---|---|
| `version` | `schemaVersion` | `schemaVersion` | `integer` | `2` | Mapped from legacy `version`. Lacking version indicates legacy v1 payload. |
| `activeFilters` | `activeFilter` | `activeFilter` | `object` | Default criteria object | Mapped from legacy `activeFilters` or root object if v1 flat JSON. |
| `testStatus` (String) | `testCoverageStatus` (Array) | `testCoverageStatus` | `array` (`string[]`) | `[]` (All) | String value `"UNTESTED"` converted to `["UNTESTED"]`. String `"ALL"` or empty mapped to `[]`. |
| N/A | `activePresetId` | `activePresetId` | `string \| null` | `null` | Defaults to `null` if un-preset or custom filter active. |
| N/A | `presets` | `presets` | `array` (`object[]`)| `[]` | Defaults to empty array if no presets saved. |
| `searchTerm` | `searchTerm` | `searchTerm` | `string` | `""` | Coerced to string; `null`/`undefined` becomes `""`. |
| `riskLevels` | `riskLevels` | `riskLevels` | `array` (`string[]`) | `[]` | `null`/`undefined` becomes `[]`. Upper-cased string items (`"HIGH"`, `"MEDIUM"`, `"LOW"`). |
| `nodeTypes` | `nodeTypes` | `nodeTypes` | `array` (`string[]`) | `[]` | Mapped and normalized to canonical component types (`"ApexClass"`, `"LWC"`, etc). |
| `layers` | `layers` | `layers` | `array` (`string[]`) | `[]` | Mapped to architectural layers (`"Domain"`, `"Service"`, etc). |
| N/A | `findingsSeverity` | `findingsSeverity` | `array` (`string[]`) | `[]` | Target enum: `"CRITICAL"`, `"HIGH"`, `"MEDIUM"`, `"LOW"`. Ignored by Graph/Matrix views. |
| N/A | `findingsStatus` | `findingsStatus` | `array` (`string[]`) | `[]` | Target enum: `"OPEN"`, `"MUTED"`, `"RESOLVED"`. Ignored by Graph/Matrix views. |

---

## 4. Validation, Fallback & Migration Rules

1. **Required vs Optional Fields:**
   - Container root required fields: `schemaVersion`, `presets`, `activeFilter`.
   - Criteria object required fields: `searchTerm`, `riskLevels`, `nodeTypes`, `layers`, `testCoverageStatus`, `findingsSeverity`, `findingsStatus`.
   - Optional fields: `activePresetId` (may be `null`).

2. **Unknown-Field Preservation (Forward Compatibility):**
   - When encountering schema payloads where `schemaVersion > 2` or additional top-level/criteria fields are present (e.g. from future releases), `daFilterSchema.js` MUST preserve unknown properties upon in-memory manipulation and re-serialization.

3. **Legacy V1 Migration Behavior:**
   - If `Filters_JSON__c` is a JSON object lacking `schemaVersion` (or with `version: 1`), `daAppShell` normalizes it into a v2 container:
     - `schemaVersion = 2`
     - `activePresetId = null`
     - `presets = []`
     - `activeFilter = normalizeCriteria(parsedV1Object)`

4. **Malformed JSON & Missing Preference Behavior:**
   - If `Filters_JSON__c` is `null`, empty string, invalid JSON, or a non-object primitive, `daAppShell` falls back safely to default container state without raising UI exceptions:
     `{ schemaVersion: 2, activePresetId: null, presets: [], activeFilter: { searchTerm: "", riskLevels: [], nodeTypes: [], layers: [], testCoverageStatus: [], findingsSeverity: [], findingsStatus: [] } }`.

---

## 5. Authoritative Payload Limits

1. **Physical Salesforce Capacity:** `DA_User_Preference__c.Filters_JSON__c` is defined as a `LongTextArea` field with physical capacity of **131,072 characters** (`scratch/salesforce-poc/force-app/main/default/objects/DA_User_Preference__c/fields/Filters_JSON__c.field-meta.xml`, line 6).
2. **Existing Controller Enforcement:** `DAUserPreferenceController.cls` enforces `131,072` character check (`Max payload size exceeded`).
3. **Application-Level V2 Target Limit:** To ensure safety margin for presets and avoid boundary truncation, the recommended application-level payload soft limit is **100,000 characters**.
4. **Measurement Method:** Measurement is performed using standard JavaScript `JSON.stringify(payload).length` prior to Apex save dispatch.
5. **Boundary Behavior:**
   - `<= 100,000 chars`: Allowed, normal save.
   - `> 100,000` and `<= 131,072 chars`: Warning logged in console; save permitted.
   - `> 131,072 chars`: Save rejected on client before network dispatch with user error toast ("Filter preset storage capacity exceeded").

---

## 6. LWC Parent-Child Communication Contract

To eliminate invalid bubbling/composed event assumptions from early briefs and comply with LWC unidirectional data flow architecture:

```
                  +-----------------------+
                  |      daAppShell       |  <-- Owns canonical filter state & persistence
                  +-----------------------+
                    /         |         \
   @api activeFilter Criteria |          \ @api activeFilterCriteria
                  /           |           \
                 v            v            v
          +------------+ +------------+ +---------------+
          |daGraphViewer||daMatrixViewer||daFindingsViewer|
          +------------+ +------------+ +---------------+
```

1. **Parent-to-Child State Delivery:**
   - `daAppShell` passes the normalized `activeFilter` criteria object to child views using a public `@api` property on child components:
     - `daGraphViewer`: `@api activeFilterCriteria`
     - `daMatrixViewer`: `@api activeFilterCriteria`
     - `daFindingsViewer`: `@api activeFilterCriteria`
   - Child components implement explicit `@api` setters or `renderedCallback`/`attributeChangedCallback` state setters to update local Cytoscape/DOM filtering upon receiving new property bindings.

2. **Child-to-Parent User Action Events:**
   - When user interacts with filter controls (e.g. `daGraphControls` or `daFilterPanel`), the child view fires standard custom events to `daAppShell`:
     - **Event Name:** `filterchange` or `presetchange`
     - **Bubbles:** `false` (or `true` if nested inside a control panel bundle), **Composed:** `false`.
     - **Detail Payload:**
       ```javascript
       {
         criteria: { searchTerm: "Asset", riskLevels: ["HIGH"], ... },
         presetId: "preset_123" // Optional
       }
       ```

3. **Lifecycle & Project Switch Isolation:**
   - Upon project switch in `daAppShell`, outstanding async filter/preference requests are invalidated using project-switch correlation tokens (`activeProjectId`).
   - Child views reset local highlight/selection states immediately when `@api activeFilterCriteria` or `@api projectId` changes.

---

## 7. Four-State Coverage Semantics

Canonical filter evaluation MUST strictly enforce the established four-state coverage semantics (`WAVE_4_MISSING_COVERAGE_SEMANTICS.md`):

1. **`COVERED` / `TESTED`:** Automated tests confirmed. (`testCoverageStatus === 'COVERED'`).
2. **`UNTESTED` / `UNCOVERED`:** Analyzed; explicitly confirmed 0% test coverage. (`testCoverageStatus === 'UNTESTED'`).
3. **`AMBIGUOUS` / `PARTIAL`:** Analyzed; test relationship exists but status/percentage is uncertain. (`testCoverageStatus === 'AMBIGUOUS'`).
4. **`UNKNOWN` / Missing / Null:** Coverage status not evaluated or inapplicable. (`testCoverageStatus == null` or absent).

**Mandatory Invariant:** `UNKNOWN` / Missing coverage data MUST NEVER be treated as `UNTESTED`. Filtering by `UNTESTED` MUST NOT include `UNKNOWN` records.
