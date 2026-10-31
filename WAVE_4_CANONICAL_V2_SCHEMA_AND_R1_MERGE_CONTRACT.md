# Wave 4 (`FEAT-STATE-03`): Canonical V2 Schema & R1 Merge Contract

| Governance Attribute | Value |
|---|---|
| **Document Type** | Technical Schema Contract & R1 Apex Merge Algorithm Specification |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters & Presets Persistence |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-8629279200045229050-798dadd2` |
| **HEAD Commit SHA** | `d8b3b273bf5d31736ad82fc244760fd5b85e3b91` |
| **Audit Date** | October 31, 2026 |
| **Status** | **SPECIFICATION COMPLETE — READY FOR HUMAN REVIEW — IMPLEMENTATION HOLD ACTIVE** |

---

## 1. Context & Purpose

During Wave 4 development, conflicting draft specifications created ambiguity regarding schema recognition, incoming V2 write semantics (replacement vs. merge), and error-handling behavior. This document establishes one authoritative, internally consistent canonical Wave 4 V2 JSON schema contract and specifies the fail-closed Apex merge contract required for Remediation R1.

**Implementation Status:** This specification defines contracts and algorithms for review. No application source code or Apex controllers have been modified. The implementation hold remains strictly **ACTIVE**.

---

## 2. Established Canonical Wave 4 V2 Schema Contract

All persistent representations of filter preferences saved in `DA_User_Preference__c.Filters_JSON__c` must adhere to the canonical V2 JSON schema definition:

```json
{
  "schemaVersion": 2,
  "activePresetId": "preset_1730280000000_a1b2",
  "activeFilter": {
    "search": "Service",
    "riskLevels": ["HIGH", "MEDIUM"],
    "nodeTypes": ["ApexClass"],
    "layers": ["Controller"],
    "testStatus": "UNTESTED",
    "findingsSeverity": ["CRITICAL"],
    "findingsStatus": ["OPEN"]
  },
  "presets": [
    {
      "id": "preset_1730280000000_a1b2",
      "name": "High Risk Untested",
      "description": "High risk untested controllers",
      "isDefault": true,
      "createdAt": "2026-10-30T10:00:00Z",
      "updatedAt": "2026-10-30T10:00:00Z",
      "filters": {
        "search": "Service",
        "riskLevels": ["HIGH", "MEDIUM"],
        "nodeTypes": ["ApexClass"],
        "layers": ["Controller"],
        "testStatus": "UNTESTED",
        "findingsSeverity": ["CRITICAL"],
        "findingsStatus": ["OPEN"]
      }
    }
  ],
  "testCoverageStatus": []
}
```

### 2.1 Canonical Schema Property Requirements
1. **`schemaVersion` (Integer, Required):** Must be integer literal `2`. Payloads missing `schemaVersion` or specifying any value other than `2` do NOT conform to canonical V2.
2. **`presets` (Array, Required):** Must be a JSON array of preset objects (`FilterPreset[]`). Missing `presets` or wrong-type `presets` violates V2 schema.
3. **`activeFilter` (Object, Required):** Must be a JSON object containing the active filter criteria. Missing `activeFilter` or wrong-type `activeFilter` violates V2 schema.
4. **`activePresetId` (String or Null, Optional):** ID of currently active preset, or `null` when custom ad-hoc filters are applied.
5. **`testCoverageStatus` (Array, Optional):** Coverage status metadata retained from prior schema versions. Optional; defaults to `[]` if absent.
6. **Forward Preservation Rule:** Unknown or extra top-level extension properties present in valid V2 JSON (e.g. `"customAttribute": true`) must be preserved intact during reads and merges.

---

## 3. Authoritative Schema Recognition & Validation Contract

To eliminate contradictory edge-case behaviors and prevent silent corruption, container recognition follows strict, non-repairing, fail-closed rules:

| Case | Input Structure | Canonical Classification | Operation / Disposition | Reason & Safety Constraint |
|---|---|---|---|---|
| **1** | Missing `schemaVersion` (without `presets`) | **Flat V1 / Legacy** | Treated as legacy V1 payload. If existing container is V2, V1 merges into `activeFilter`. | Standard legacy backward-compatibility path. |
| **2** | Missing `schemaVersion` (with `presets` array) | **Ambiguous Payload** | **BLOCKED / UNRESOLVED** pending Lead Architect architectural decision. Must NOT be automatically recognized as V2. | Automatic recognition of unversioned payloads as V2 is an unapproved implicit rule. |
| **3** | Unsupported `schemaVersion` (e.g. `1` or `> 2`) | **Unsupported Schema** | **FAIL-CLOSED REJECTION:** Throw `AuraHandledException`. Retain existing database payload untouched. | Prevents silent downgrade or destructive overwrite of future versions. |
| **4** | Missing required `presets` (with `schemaVersion: 2`) | **Invalid V2 Structure** | **FAIL-CLOSED REJECTION:** Throw `AuraHandledException`. Do NOT silently supply default `[]`. | Schema requires `presets`. Unapproved silent repair is prohibited. |
| **5** | Wrong type for `presets` (non-array, e.g. primitive/object) | **Invalid V2 Structure** | **FAIL-CLOSED REJECTION:** Throw `AuraHandledException`. | Malformed container structure. |
| **6** | Missing required `activeFilter` (with `schemaVersion: 2`) | **Invalid V2 Structure** | **FAIL-CLOSED REJECTION:** Throw `AuraHandledException`. Do NOT silently repair or update. | Contradiction resolved: Schema requires `activeFilter`; missing `activeFilter` is invalid V2. |
| **7** | Wrong type for `activeFilter` (non-object, e.g. array/primitive) | **Invalid V2 Structure** | **FAIL-CLOSED REJECTION:** Throw `AuraHandledException`. | Malformed filter criteria structure. |
| **8** | Missing `activePresetId` | **Valid V2 Container** | Accepted. `activePresetId` is optional; interpreted as `null` (ad-hoc criteria active). | Optional property per Section 2.1. |
| **9** | Invalid or malformed JSON syntax (e.g. `{bad_json`) | **Invalid Payload Syntax** | **FAIL-CLOSED REJECTION:** Throw `AuraHandledException`. | Syntax error caught immediately before database mutation. |
| **10** | Valid legacy V1 payload (JSON object without `schemaVersion` or `presets`) | **Valid Legacy V1** | Merged into `activeFilter` of existing V2, or saved as V1 if no existing V2. | Verified backward-compatibility contract. |
| **11** | Valid V2 payload (conforms to all required properties and types) | **Valid V2 Payload** | **UNRESOLVED WRITE BEHAVIOR:** See Section 4.3. Incoming V2 replacement vs. merge is pending human approval. | Prevents unauthorized implicit write choice. |
| **12** | Structurally invalid V2 payload (missing required keys or type mismatch) | **Invalid V2 Structure** | **FAIL-CLOSED REJECTION:** Throw `AuraHandledException`. | Preserves database integrity. |

---

## 4. Multi-Layered Validation Model

To prevent treating a superficial JSON check as schema validation, six explicit validation layers are defined:

1. **JSON Syntax Validation:** Validates that the input string is syntactically well-formed JSON (via parser). If invalid, fail immediately.
2. **Top-Level Object Validation:** Validates that deserialized JSON is a `Map<String, Object>` (JSON object), rejecting arrays (`[]`) and primitives.
3. **Schema-Version Recognition:** Inspects `schemaVersion`. Distinguishes unversioned (V1), canonical V2 (`schemaVersion == 2`), ambiguous (unversioned with presets), and unsupported versions (`!= 2`).
4. **Complete V2 Structural Validation:** Validates that all canonical required properties (`schemaVersion`, `presets`, `activeFilter`) are present and conform to required types (`Integer`, `List<Object>`, `Map<String, Object>`).
5. **Field-Specific Value Validation:** Validates inner fields (e.g. preset object structures, criteria enum values, length bounds).
6. **Persistence Validation:** Enforces physical field character limits (131,072 characters) and transactional database consistency.

### 4.1 Six Validation Layers Status and Evidence Matrix

| Layer | Required Validation | Defined Rules | Algorithm Coverage | Source Implementation Evidence | Status |
|---|---|---|---|---|---|
| **Layer 1: JSON Syntax Validation** | Input string must be well-formed JSON | Must parse via parser without syntax errors | Fully covered in proposed algorithm (try/catch around `JSON.deserializeUntyped`) | Implemented in `DAUserPreferenceController.validateJsonString()` | **Source Implementation Verified** |
| **Layer 2: Top-Level Object Validation** | Root structure must be a JSON object (`Map<String, Object>`) | Reject arrays `[]`, primitives, null/scalar root | Fully covered in proposed algorithm (`instanceof Map<String, Object>`) | Not implemented in controller (controller only runs `validateJsonString` without type check) | **Partially Specified Contract / Not Implemented** |
| **Layer 3: Schema-Version Recognition** | Version classification and discrimination | Version must be integer `2`; unversioned legacy is V1; unversioned + presets is Ambiguous; other versions unsupported | Fully covered in proposed algorithm (explicit classification gates) | Not implemented in controller | **Fully Specified Contract / Not Implemented** |
| **Layer 4: Complete V2 Structural Validation** | Required top-level V2 properties and collection types | `schemaVersion` (Integer = 2), `presets` (List), `activeFilter` (Map) required; missing or wrong type rejected | Fully covered in proposed algorithm (type checks and presence gates) | Not implemented in controller | **Fully Specified Contract / Not Implemented** |
| **Layer 5: Field-Specific Value Validation** | Deep nested validation of presets and active filter criteria | Detailed below in Section 4.2; nested preset and filter criteria schema rules | Partially covered in algorithm (checks `presets` is List, `activeFilter` is Map; does NOT validate preset item fields or filter criteria values) | Not implemented in controller | **Incomplete Specification — Implementation Blocking** |
| **Layer 6: Persistence Validation** | Capacity constraints, field limits, and transactional safety | Character length <= 131,072 chars, atomic rollback on exception | Fully covered in contract & controller length check; offline mock passes | Implemented in controller lines 61–69 (`.length() > 131072`); live database persistence deferred | **Apex Guard Verified / Live Persistence Deferred** |

### 4.2 Nested V2 Validation Breakdown & Missing Rules

The canonical contract must NOT claim full field-specific validation merely because top-level `presets` is confirmed to be an array and `activeFilter` is confirmed to be an object. An inspection of the schema and application requirements identifies the following nested validation rules:

| Element | Property / Constraint | Defined Contract Rules | Algorithm Coverage | Completeness Status |
|---|---|---|---|---|
| **Preset Object Structure** | Individual preset items in `presets` array | Each item in `presets` must be a JSON object (`Map<String, Object>`). Array must not contain primitives or nulls. | Not checked in algorithm | **Incomplete — Implementation Blocking** |
| **Required Preset Properties** | Mandatory keys in preset items | Schema defines `id`, `name`, `isDefault`, `createdAt`, `updatedAt`, `filters` as properties of preset specimens. Mandatory vs optional enforcement rules: `id`, `name`, `filters` required; `description` optional. | Not checked in algorithm | **Incomplete — Implementation Blocking** |
| **Preset Identifier Types** | `preset.id` format & uniqueness | Must be non-empty String (e.g. `preset_TIMESTAMP_UUID`). Must be unique across all presets in the container. | Not checked in algorithm | **Incomplete — Implementation Blocking** |
| **Preset Names & Descriptions** | `preset.name`, `preset.description` | `name` must be non-empty String <= 255 chars; `description` String <= 1000 chars. No special character injection. | Not checked in algorithm | **Incomplete — Implementation Blocking** |
| **Default Flag** | `preset.isDefault` | Boolean literal. At most one preset in the `presets` array may have `isDefault: true`. | Not checked in algorithm | **Incomplete — Implementation Blocking** |
| **Timestamp Fields** | `preset.createdAt`, `preset.updatedAt` | ISO-8601 UTC timestamp strings. Must parse as valid dates. | Not checked in algorithm | **Incomplete — Implementation Blocking** |
| **Preset Filters Object** | `preset.filters` | Must be a JSON object matching the `activeFilter` structure. Cannot be null or primitive. | Not checked in algorithm | **Incomplete — Implementation Blocking** |
| **Filter Criteria Properties** | `activeFilter` and `preset.filters` keys | May contain `search` (String), `riskLevels` (List<String>), `nodeTypes` (List<String>), `layers` (List<String>), `testStatus` (String), `findingsSeverity` (List<String>), `findingsStatus` (List<String>). | Not checked in algorithm | **Incomplete — Implementation Blocking** |
| **Filter Criteria Enum Values** | Domain values for filter criteria | `riskLevels` in [`HIGH`, `MEDIUM`, `LOW`]; `testStatus` in canonical set [`COVERED`, `UNTESTED`, `AMBIGUOUS`, `UNKNOWN`]; `findingsSeverity` in [`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`]; `findingsStatus` in [`OPEN`, `RESOLVED`, `SUPPRESSED`]. | Not checked in algorithm | **Incomplete — Implementation Blocking** |
| **Optional & Extension Keys** | `testCoverageStatus`, unknown extension keys | `testCoverageStatus` must be array if present; unknown top-level extension keys preserved without modification. | Not checked in algorithm | **Incomplete — Implementation Blocking** |
| **Field-Specific Length Bounds** | Per-property length guards | No single preset name or criteria value may exceed memory limits, aggregate payload <= 131,072 chars. | Partially covered by aggregate length guard | **Incomplete — Implementation Blocking** |

**Rule:** Where nested validation rules are missing, the contract is explicitly marked as **INCOMPLETE AND IMPLEMENTATION-BLOCKING**. Full feature implementation cannot proceed until these field-level rules are fully specified by the Lead Architect.

### 4.3 Persistence Validation & Evidence Boundaries

Persistence validation encompasses four distinct levels:
1. **Apex Length Guards:** Verified in controller source `DAUserPreferenceController.cls` lines 61–69, rejecting strings with `.length() > 131072`.
2. **Salesforce Metadata Physical Capacity:** Verified in field metadata (`Filters_JSON__c.field-meta.xml`, `Positions_JSON__c.field-meta.xml`, `Zoom_Pan_JSON__c.field-meta.xml`) as `<length>131072</length>`.
3. **Database Transaction Behavior:** Apex execution model dictates that any uncaught `AuraHandledException` causes an automatic rollback of the transaction, preserving database state. This is an expected platform behavior, verified in offline simulation mocks.
4. **Actual Live Salesforce Persistence:** Verified end-to-end insertion, commit, and retrieval in a live Salesforce multi-tenant database. This is **DEFERRED** to Phase 7 acceptance in live scratch/sandbox orgs.

Offline mock behavior in `run-workstream-c-tests.cjs` confirms mock database logic, but must NEVER be cited as proof of live Salesforce persistence.

## 5. Remediation R1 — Fail-Closed Apex Merge Specification

### 5.1 Unresolved Decision: Incoming V2 Full Replacement vs. Partial Merge
When an incoming payload is itself a valid V2 container (`schemaVersion: 2`):
- **Option A (Full Replacement):** Incoming V2 payload completely replaces existing persisted container.
  - *Risk:* If client loaded stale state, concurrent preset creations by other sessions are permanently destroyed.
- **Option B (Partial Merge):** Merge incoming `presets` with existing persisted `presets` using preset ID matching.
  - *Risk:* Deletion of presets becomes ambiguous (cannot distinguish intentional deletion from absence in client state).
- **Governance Status:** **PENDING HUMAN DECISION (Product Owner & Lead Architect)**.
- **Contract Rule:** Neither behavior is approved. Authoritative pseudocode must NOT silently implement either behavior. Any write of incoming V2 must stop with a documented unresolved outcome until human authorization is granted.
- **Strict Universality Rule:** The unresolved incoming V2 write decision applies **regardless of whether the existing persisted payload is blank, null, a valid V1 container, or a valid V2 container**. There is NO initial-save exception that permits an unvalidated or unresolved incoming V2 payload to be written directly to the database.

---

### 5.2 Authoritative Proposed Processing Order

The documented processing order for incoming and existing payloads must strictly follow these 10 fail-closed steps:

1. **Validate Incoming JSON Syntax:** Parse `incomingFilterJson` via parser. If malformed, throw `AuraHandledException` immediately.
2. **Validate Incoming Top-Level Object Type:** If incoming payload is non-blank, ensure deserialized object is a `Map<String, Object>`. Reject arrays (`[]`) and scalars.
3. **Classify Incoming Schema Version & Structure:** Inspect incoming keys (`schemaVersion`, `presets`, `activeFilter`).
4. **Reject Unsupported Incoming Schema Versions:** If `schemaVersion` is present and not integer `2`, reject immediately with `AuraHandledException`.
5. **Reject Ambiguous Unversioned Incoming Payloads:** If `schemaVersion` is absent but `presets` is present, reject immediately as ambiguous unversioned payload.
6. **Validate All Required V2 Properties and Types (Incoming):** If incoming is V2 (`schemaVersion == 2`), enforce that `presets` is a `List<Object>` and `activeFilter` is a `Map<String, Object>`. If either is missing or wrong type, reject as structurally invalid V2.
7. **Apply Unresolved Incoming V2 Decision Gate:** If incoming is a valid V2 payload, throw `AuraHandledException` blocking write pending Lead Architect & Product Owner replacement-versus-merge decision. (This applies regardless of existing payload state).
8. **Evaluate Existing Persisted Data & Initial Save:** Only after the incoming payload has successfully passed all incoming validation and decision gates (i.e. incoming is confirmed to be valid legacy V1 or blank), evaluate existing persisted data:
   - If incoming is blank, retain existing data untouched.
   - If existing data is blank/null, proceed with documented initial V1 save behavior (return incoming V1).
9. **Validate and Classify Existing Persisted Data:** If existing data is non-blank:
   - Validate JSON syntax and top-level object structure.
   - Classify schema version: if `schemaVersion` != 2, reject unsupported schema; if unversioned with `presets`, reject ambiguous container; if V2, validate required `presets` array and `activeFilter` object.
10. **Apply Authorized V1-to-V2 Merge Behavior:**
    - If existing data is valid V2 container and incoming is valid flat V1, merge incoming flat V1 criteria into `existingContainer.activeFilter`, reset `activePresetId` to `null`, and return serialized container.
    - If existing data is legacy flat V1 and incoming is flat V1, accept standard V1 update.

---

### 5.3 Authoritative Proposed Apex Merge Algorithm

This algorithm represents the **SINGLE AUTHORITATIVE PROPOSED ALGORITHM SPECIFICATION** for Remediation R1. It is a proposed specification only; **NO IMPLEMENTATION EXISTS IN THE REPOSITORY**.

```apex
/**
 * Authoritative Proposed Algorithm Specification for Remediation R1
 * Fail-closed merge helper specification for DAUserPreferenceController.cls
 *
 * NOTE: PROPOSED SPECIFICATION ONLY — NOT IMPLEMENTED IN APEX SOURCE.
 * IMPLEMENTATION HOLD REMAINS STRICTLY ACTIVE.
 */
@TestVisible
private static String mergeV1IntoV2Container(String existingV2Json, String incomingFilterJson) {
    // -------------------------------------------------------------
    // STEP 1 & 2: Validate incoming payload syntax and object type
    // -------------------------------------------------------------
    Map<String, Object> incomingMap = null;
    Boolean incomingIsBlank = String.isBlank(incomingFilterJson);

    if (!incomingIsBlank) {
        try {
            Object parsedIncoming = JSON.deserializeUntyped(incomingFilterJson);
            if (!(parsedIncoming instanceof Map<String, Object>)) {
                throw new AuraHandledException('Invalid incoming JSON payload structure: Must be a JSON object.');
            }
            incomingMap = (Map<String, Object>) parsedIncoming;
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Malformed incoming filter JSON payload: ' + e.getMessage());
        }

        // -------------------------------------------------------------
        // STEP 3, 4, 5, 6: Classify and validate incoming schema
        // -------------------------------------------------------------
        Boolean incomingHasSchemaVer = incomingMap.containsKey('schemaVersion');
        Boolean incomingHasPresets = incomingMap.containsKey('presets');

        if (incomingHasSchemaVer) {
            Object inVerObj = incomingMap.get('schemaVersion');
            if (!(inVerObj instanceof Integer || inVerObj instanceof Long || inVerObj instanceof Decimal)) {
                throw new AuraHandledException('Incoming filter payload has invalid schemaVersion type.');
            }
            Integer inVer = Integer.valueOf(inVerObj);
            if (inVer != 2) {
                // STEP 4: Reject unsupported schema versions
                throw new AuraHandledException('Unsupported incoming schema version: ' + inVer);
            }

            // STEP 6: Complete structural validation for incoming V2 payload
            if (!incomingMap.containsKey('presets') || !(incomingMap.get('presets') instanceof List<Object>)) {
                throw new AuraHandledException('Incoming V2 container is structurally invalid: presets array is required.');
            }
            if (!incomingMap.containsKey('activeFilter') || !(incomingMap.get('activeFilter') instanceof Map<String, Object>)) {
                throw new AuraHandledException('Incoming V2 container is structurally invalid: activeFilter object is required.');
            }

            // STEP 7: UNRESOLVED DECISION GATE: Incoming V2 write semantics (Replacement vs. Merge)
            // Blocks regardless of whether existing payload is blank, V1, or V2!
            throw new AuraHandledException('UNRESOLVED DECISION: Incoming V2 container write semantics (full replacement vs. partial merge) require Product Owner and Lead Architect sign-off.');
        }

        // STEP 5: Check if incoming is ambiguous (has presets but no schemaVersion)
        if (!incomingHasSchemaVer && incomingHasPresets) {
            throw new AuraHandledException('Ambiguous incoming filter payload: presets present without schemaVersion. Pending architectural decision.');
        }
    }

    // -------------------------------------------------------------
    // STEP 8: Only after incoming passes all validation & gates,
    // evaluate existing payload and blank-data handling.
    // -------------------------------------------------------------
    // Handle blank incoming payload: retain existing data untouched
    if (incomingIsBlank) {
        return existingV2Json;
    }

    // Handle blank existing data: initial V1 save
    // (At this point, incoming payload has been validated and confirmed to be valid flat V1)
    if (String.isBlank(existingV2Json)) {
        return incomingFilterJson;
    }

    // -------------------------------------------------------------
    // STEP 9: Parse, classify, and validate existing container
    // -------------------------------------------------------------
    try {
        Object deserializedExisting = JSON.deserializeUntyped(existingV2Json);
        if (!(deserializedExisting instanceof Map<String, Object>)) {
            throw new AuraHandledException('Existing persisted filter preference has invalid container structure: Must be a JSON object.');
        }

        Map<String, Object> existingContainer = (Map<String, Object>) deserializedExisting;
        Boolean hasSchemaVer = existingContainer.containsKey('schemaVersion');
        Object schemaVerObj = existingContainer.get('schemaVersion');
        Boolean hasPresets = existingContainer.containsKey('presets');
        Object presetsObj = existingContainer.get('presets');
        Boolean hasActiveFilter = existingContainer.containsKey('activeFilter');
        Object activeFilterObj = existingContainer.get('activeFilter');

        // Check for ambiguous container: presets present but missing schemaVersion
        if (!hasSchemaVer && hasPresets) {
            throw new AuraHandledException('Ambiguous persisted filter preference: presets present without schemaVersion. Pending architectural decision.');
        }

        Boolean isV2Container = false;
        if (hasSchemaVer) {
            if (!(schemaVerObj instanceof Integer || schemaVerObj instanceof Long || schemaVerObj instanceof Decimal)) {
                throw new AuraHandledException('Existing filter preference has invalid schemaVersion type: Must be integer.');
            }
            Integer ver = Integer.valueOf(schemaVerObj);
            if (ver == 2) {
                // Complete V2 structural validation
                if (!hasPresets || !(presetsObj instanceof List<Object>)) {
                    throw new AuraHandledException('Existing V2 container is structurally invalid: presets array is required.');
                }
                if (!hasActiveFilter || !(activeFilterObj instanceof Map<String, Object>)) {
                    throw new AuraHandledException('Existing V2 container is structurally invalid: activeFilter object is required.');
                }
                isV2Container = true;
            } else {
                throw new AuraHandledException('Unsupported schema version: ' + ver + '. Persisted data preserved untouched.');
            }
        }

        // -------------------------------------------------------------
        // STEP 10: Apply authorized V1-to-V2 merge behavior
        // -------------------------------------------------------------
        if (isV2Container) {
            // Merge incoming flat V1 criteria into existing V2 container activeFilter
            existingContainer.put('activeFilter', incomingMap);
            existingContainer.put('activePresetId', null); // Ad-hoc filter modification clears active preset ID
            return JSON.serialize(existingContainer);
        }

        // Existing data was flat V1; incoming is flat V1 -> accept standard V1 update
        return incomingFilterJson;

    } catch (AuraHandledException e) {
        throw e;
    } catch (Exception e) {
        throw new AuraHandledException('Failed to process filter preference merge: ' + e.getMessage());
    }
}
```

---

### 5.4 Single Authoritative Failure Contract
- **No Destructive Fallback:** If JSON validation or deserialization fails, existing database records must NOT be overwritten with partial, blank, or corrupted data.
- **No False Successful Save:** Catch blocks must NOT silently swallow exceptions or return `existingV2Json` as if save succeeded when incoming data was invalid.
- **Explicit Failure Response:** Any syntax or structural error throws an `AuraHandledException`, delivering an explicit error message to the caller.
- **Database Consistency:** Database transaction rolls back on exception, ensuring persisted data remains unchanged.

## 6. Concurrency & Transactional Analysis

Inspection of source code `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` reveals:

- **SOQL `FOR UPDATE` Status:** `DAUserPreferenceController.getUserPreference()` (lines 21–48) and `saveUserPreference()` (lines 80–120) do **NOT** execute SOQL queries with `FOR UPDATE`.
- **Last-Write-Wins Behavior:** Concurrent transactions writing to the same preference record execute standard last-write-wins without row-level locking.
- **Atomic Preservation Limitation:** Concurrent updates where Client A writes flat V1 filters while Client B creates a V2 preset can result in a race condition where one write overwrites the other.
- **Future Remediation:** Adding `FOR UPDATE` row locking or optimistic concurrency tokens is documented as a future architectural enhancement requiring Lead Architect review. No transactional locking is currently implemented.

---

## 7. Authoritative Edge-Case Analysis Matrix

The following edge-case matrix aligns 100% with Section 3, Section 4, and Section 5, demonstrating strict incoming validation before blank-existing handling:

| # | Existing Payload (`existingV2Json`) | Incoming Payload (`incomingFilterJson`) | Expected Resulting `Filters_JSON__c` | Preservation & Safety Outcome |
|---|---|---|---|---|
| 1 | Blank / Empty `""` | Valid Flat V1 Filter JSON | Incoming Flat V1 JSON | Follows documented initial V1 save behavior |
| 2 | Blank / Empty `""` | Valid V2 Container JSON | Exception Thrown: `UNRESOLVED DECISION: Incoming V2 container write semantics` | **Block pending replacement/merge decision (NO initial save bypass)** |
| 3 | Blank / Empty `""` | V2 missing `presets` | Exception Thrown: `Incoming V2 container is structurally invalid: presets array is required` | **Reject invalid V2** |
| 4 | Blank / Empty `""` | V2 missing `activeFilter` | Exception Thrown: `Incoming V2 container is structurally invalid: activeFilter object is required` | **Reject invalid V2** |
| 5 | Blank / Empty `""` | Unsupported schema version (e.g. `schemaVersion: 99`) | Exception Thrown: `Unsupported incoming schema version: 99` | **Reject unsupported schema version** |
| 6 | Blank / Empty `""` | Unversioned payload containing `presets` | Exception Thrown: `Ambiguous incoming filter payload: presets present without schemaVersion` | **Block as ambiguous pending decision** |
| 7 | Blank / Empty `""` | Malformed incoming JSON `{bad_json` | Exception Thrown: `Malformed incoming filter JSON payload` | **Reject syntax error** |
| 8 | Blank / Empty `""` | Incoming JSON Array `[1, 2, 3]` | Exception Thrown: `Invalid incoming JSON payload structure: Must be a JSON object` | **Reject non-object root** |
| 9 | Valid V2 Container with 5 Presets | Valid Flat V1 Filter JSON | Updated V2 Container (`activeFilter` updated, all 5 `presets` preserved, `activePresetId` = null) | **Presets Preserved Intact** |
| 10 | Legacy Flat V1 Filter JSON | Valid Flat V1 Filter JSON | Incoming Flat V1 JSON | Standard V1 update |
| 11 | Unsupported V99 Container (`"schemaVersion": 99`) | Valid Flat V1 Filter JSON | Exception Thrown: `Unsupported schema version: 99` | **Fail-Closed Protection** |
| 12 | Container with `presets: [...]` (missing `schemaVersion`) | Valid Flat V1 Filter JSON | Exception Thrown: `Ambiguous persisted filter preference` | **Blocked Pending Decision** |
| 13 | Container with `schemaVersion: 2, presets: "bad"` | Valid Flat V1 Filter JSON | Exception Thrown: `Existing V2 container is structurally invalid: presets array is required` | **Fail-Closed Protection** |
| 14 | Container with `schemaVersion: 2` (missing `activeFilter`) | Valid Flat V1 Filter JSON | Exception Thrown: `Existing V2 container is structurally invalid: activeFilter object is required` | **Fail-Closed Protection (No Silent Repair)** |
| 15 | Valid V2 Container with `"customAttr": true` | Valid Flat V1 Filter JSON | Updated V2 Container retaining `"customAttr": true` | Extension Preserved |
| 16 | Malformed existing JSON `{bad_json` | Valid Flat V1 Filter JSON | Exception Thrown: `Existing persisted filter preference has invalid container structure` | **Fail-Closed Protection; preserve persisted data** |
| 17 | Valid V2 Container | Valid V2 Container JSON | Exception Thrown: `UNRESOLVED DECISION: Incoming V2 container write semantics` | **Block pending replacement/merge decision** |
| 18 | Valid V2 Container | Malformed incoming JSON `[bad_json` | Exception Thrown: `Malformed incoming filter JSON payload` | **Fail-Closed Protection** |
| 19 | Valid V2 Container | Null or Empty `""` incoming payload | Existing V2 Container returned untouched | Existing Data Preserved |
| 20 | Valid V2 Container | JSON Array `[1, 2, 3]` | Exception Thrown: `Invalid incoming JSON payload structure: Must be a JSON object` | **Fail-Closed Protection** |
| 21 | Valid V2 Container | V2 Container missing `presets` | Exception Thrown: `Incoming V2 container is structurally invalid: presets array is required` | **Fail-Closed Protection** |
| 22 | Valid V2 Container | V2 Container missing `activeFilter` | Exception Thrown: `Incoming V2 container is structurally invalid: activeFilter object is required` | **Fail-Closed Protection** |

## 8. Non-Implementation Confirmation

This document specifies the contract and algorithm. No Apex source code (`DAUserPreferenceController.cls`) or Apex test files were modified during this specification task. The implementation hold remains **ACTIVE**.

---

## Appendix A — Historical Superseded Algorithms (Non-Authoritative)

*(Included for historical audit trail only. Explicitly marked: **SUPERSEDED — NOT AN IMPLEMENTATION CONTRACT**).*

### Superseded Draft 1: Swallowing Exceptions and Returning Existing Data
```apex
// SUPERSEDED ALGORITHM — DO NOT IMPLEMENT
// Relied on property presence check without incoming syntax validation
// and returned existing JSON in catch block (swallowed errors, false success).
@TestVisible
private static String mergeV1IntoV2Container_SUPERSEDED_DRAFT1(String existingV2Json, String incomingV1Json) {
    if (String.isBlank(existingV2Json)) return incomingV1Json;
    if (String.isBlank(incomingV1Json)) return existingV2Json;
    try {
        Map<String, Object> existingContainer = (Map<String, Object>) JSON.deserializeUntyped(existingV2Json);
        Boolean isV2 = existingContainer != null && (existingContainer.containsKey('schemaVersion') || existingContainer.containsKey('presets'));
        if (isV2) {
            Map<String, Object> incomingFilter = (Map<String, Object>) JSON.deserializeUntyped(incomingV1Json);
            if (incomingFilter != null && !incomingFilter.containsKey('schemaVersion')) {
                existingContainer.put('activeFilter', incomingFilter);
                existingContainer.put('activePresetId', null);
                return JSON.serialize(existingContainer);
            }
        }
        return incomingV1Json;
    } catch (Exception e) {
        return existingV2Json; // Catch block swallows exception and returns existing data
    }
}
```

### Superseded Draft 2: Unilateral Incoming V2 Replacement
```apex
// SUPERSEDED ALGORITHM — DO NOT IMPLEMENT
// Unilaterally returned incoming V2 payload without resolving replacement vs merge decision.
@TestVisible
private static String mergeV1IntoV2Container_SUPERSEDED_DRAFT2(String existingV2Json, String incomingV1Json) {
    // ...
    // Unapproved choice: accepted incoming V2 directly, risking preset destruction
    return incomingV1Json;
}
```
