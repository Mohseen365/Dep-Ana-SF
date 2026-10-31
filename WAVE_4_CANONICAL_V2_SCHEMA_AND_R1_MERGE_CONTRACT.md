# Wave 4 (`FEAT-STATE-03`): Canonical V2 Schema & R1 Merge Contract

| Governance Attribute | Value |
|---|---|
| **Document Type** | Technical Schema Contract & R1 Apex Merge Algorithm Specification |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters & Presets Persistence |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-2662574214828896325-f3957679` |
| **HEAD Commit SHA** | `e643416f0aac66f9d0ba231f2f5920fee4c95a5e` |
| **Audit Date** | October 31, 2026 |
| **Status** | **R1 TOP-LEVEL CONTRACT DOCUMENTED — NESTED VALIDATION LAYER 5 INCOMPLETE — IMPLEMENTATION BLOCKED** |
| **Operational State** | **IMPLEMENTATION HOLD ACTIVE — NO IMPLEMENTATION PERMITTED** |

---

## 1. Context & Purpose

During Wave 4 development, conflicting draft specifications created ambiguity regarding schema recognition, incoming V2 write semantics (replacement vs. merge), and error-handling behavior. This document establishes one authoritative, internally consistent canonical Wave 4 V2 JSON schema contract and specifies the fail-closed Apex merge contract required for Remediation R1.

**Implementation Status:**
- Top-level schema contract is documented.
- Incoming write-gate ordering is documented.
- Nested validation requirements are inventoried.
- Nested validation contract is **NOT approved** (Layer 5 incomplete).
- Nested validation is **NOT implemented**.
- Nested validation is **NOT tested**.
- **Status:** `R1 TOP-LEVEL CONTRACT DOCUMENTED — NESTED VALIDATION LAYER 5 INCOMPLETE — IMPLEMENTATION BLOCKED`.
- The implementation hold remains strictly **ACTIVE**.

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
  ]
}
```

### 2.1 Authoritative Field Definitions & Nullability Rules

| JSON Path | Data Type | Mandatory / Optional | Nullable | Canonical Specification & Constraints |
|---|---|---|---|---|
| `$.schemaVersion` | Integer | Mandatory | **No** | Must equal literal integer `2`. Non-integer numbers (e.g. `2.5`), strings (`"2"`), null, or numbers `!= 2` must fail closed. |
| `$.activePresetId` | String | Optional | **Yes** | String identifier of the currently applied preset. May be `null` when ad-hoc filters differ from saved presets. |
| `$.activeFilter` | Object | Mandatory | **No** | Object containing currently applied filter criteria. Must not be `null`, primitive, or array. |
| `$.presets` | Array of Objects | Mandatory | **No** | Array containing saved preset items. Must not be `null`. Can be empty array `[]`. |

---

## 3. Strict Separation of Three Approval Responsibilities

To avoid conflating distinct architectural, product, and technical authorities, the approvals governing R1 are separated into three distinct categories:

### 3.1 Category A: R1 Source-Level Technical Remediation
- **Scope:** Narrowly scoped Apex controller code fix in `DAUserPreferenceController.cls` to prevent JSON deserialization crashes and enforce basic fail-closed validation.
- **Required Approver Role:** **Lead Architect**.
- **Boundary:** Approving technical remediation of the controller does **NOT** authorize product-level schema modifications or replacement-versus-merge behavior.

### 3.2 Category B: Incoming V2 Replacement-versus-Merge Decision
- **Scope:** Determining system behavior when a client sends a full V2 container payload (`schemaVersion: 2` with `presets`): whether to overwrite existing presets completely (Option A), merge presets by identifier (Option B), or reject client preset writes to this endpoint.
- **Required Approver Roles:** **Joint Lead Architect & Product Owner**.
- **Boundary:** Both approvals must be documented with verified human provenance before any write path for incoming V2 containers may be implemented.

### 3.3 Category C: Nested Validation Rules (Layer 5)
- **Scope:** The twelve outstanding field-specific validation rules governing preset items, identifiers, timestamps, string bounds, and filter criteria enums.
- **Required Approver Roles:**
  - Technical validation rules (syntax, regex, type constraints, size limits): **Lead Architect**.
  - Product-behavior decisions (mandatory preset fields, default conflict resolution, unknown enum handling, user error feedback): **Joint Lead Architect & Product Owner**.
- **Boundary:** Each rule must be evaluated individually; a generic single-role approval does not apply to rules affecting product semantics.

---

## 4. Multi-Layered Validation Model & Technical Inspections

To prevent treating a superficial JSON check as schema validation, six explicit validation layers are defined:

1. **JSON Syntax Validation:** Validates that the input string is syntactically well-formed JSON (via parser). If invalid, fail immediately.
2. **Top-Level Object Validation:** Validates that deserialized JSON is a `Map<String, Object>` (JSON object), rejecting arrays (`[]`) and primitives.
3. **Schema-Version Recognition:** Inspects `schemaVersion`. Distinguishes unversioned (V1), canonical V2 (`schemaVersion == 2`), ambiguous (unversioned with presets), and unsupported versions (`!= 2`).
4. **Complete V2 Structural Validation:** Validates that all canonical required properties (`schemaVersion`, `presets`, `activeFilter`) are present and conform to required types (`Integer`, `List<Object>`, `Map<String, Object>`).
5. **Field-Specific Value Validation:** Validates inner fields (e.g. preset object structures, criteria enum values, length bounds).
6. **Persistence Validation:** Enforces physical field character limits (131,072 characters) and transactional database consistency.

### 4.1 Technical Inspection: Numeric `schemaVersion` Handling in Apex
An inspection of the proposed Apex merge algorithm revealed the following type-check pattern:
```apex
Object inVerObj = incomingMap.get('schemaVersion');
if (!(inVerObj instanceof Integer || inVerObj instanceof Long || inVerObj instanceof Decimal)) {
    throw new AuraHandledException('Incoming filter payload has invalid schemaVersion type.');
}
Integer inVer = Integer.valueOf(inVerObj);
```

#### Apex Language Semantics Analysis:
1. **JSON Deserialization Behavior:** In Salesforce Apex, `JSON.deserializeUntyped()` deserializes numeric literals without decimals as `Integer` (or `Long` if large), and numbers containing decimal points as `Decimal`.
2. **Truncation / Coercion Risk:** If an incoming payload contains a fractional number, such as `{"schemaVersion": 2.7}`, Apex's `Integer.valueOf(2.7)` will truncate or round the Decimal to `2` (or may throw an exception depending on runtime method overload). If coerced to `2`, an invalid fractional schema version would improperly pass validation!
3. **Proven vs Unproven Behavior:** Repository execution tests do **not** currently test fractional Decimals in Apex controllers.
4. **Authoritative Specification Rule:**
   - Only exact integer values are valid for `schemaVersion`.
   - The contract must explicitly require checking that if the value is a `Decimal`, it has zero scale and matches its integer value:
     ```apex
     if (inVerObj instanceof Decimal) {
         Decimal d = (Decimal) inVerObj;
         if (d != d.intValue()) {
             throw new AuraHandledException('Incoming schemaVersion cannot be a fractional number.');
         }
     }
     ```
   - Truncation or numeric coercion is a **documented risk** that must be formally approved by the **Lead Architect** prior to implementation.

### 4.2 Technical Inspection: Blank-Input Behavior vs Stored Payloads
An audit was conducted on how the algorithm handles blank inputs versus stored payloads:

1. **Blank Incoming Update (`incomingFilterJson` is null or empty `""`):**
   - **Behavior:** Operates as a strict **NO-OP**.
   - **Outcome:** Returns `existingV2Json` completely untouched.
   - **Validation Bypass Distinction:** Because a blank incoming update signifies no change to the field, it intentionally does not re-validate the existing stored payload during that operation.
2. **Blank Existing Stored Payload (`existingV2Json` is null or empty `""`):**
   - **Behavior:** Represents an initial save.
   - **Outcome:** The incoming payload is fully validated (Steps 1–7). If incoming is a valid V1 payload, it is saved. If incoming is an incoming V2 payload, it is **blocked** by Step 7 (no initial-save bypass).
3. **Malformed Existing Stored Payload:**
   - **Behavior:** If incoming is valid V1 and existing data is malformed (e.g. `{bad_json`), Step 9 fails closed and throws `AuraHandledException`. The malformed data in the database is **not** silently overwritten.
4. **Valid Existing V2 Payload:**
   - **Behavior:** Step 10 safely merges incoming flat V1 criteria into `activeFilter` without destroying existing presets.

---

## 5. Remediation R1 — Fail-Closed Apex Merge Specification

### 5.1 Authoritative Proposed Processing Order

1. **Validate Incoming JSON Syntax:** Parse `incomingFilterJson`. If malformed, throw `AuraHandledException` immediately.
2. **Validate Incoming Top-Level Object Type:** If incoming payload is non-blank, ensure deserialized object is a `Map<String, Object>`. Reject arrays (`[]`) and scalars.
3. **Classify Incoming Schema Version & Structure:** Inspect incoming keys (`schemaVersion`, `presets`, `activeFilter`).
4. **Validate Schema Version Numerics:** Enforce integer-only values; reject fractional numbers, strings, and versions `!= 2`.
5. **Reject Ambiguous Unversioned Incoming Payloads:** If `schemaVersion` is absent but `presets` is present, reject immediately as ambiguous.
6. **Validate Required V2 Structure (Incoming):** If incoming is V2, enforce that `presets` is `List<Object>` and `activeFilter` is `Map<String, Object>`.
7. **Apply Unresolved Incoming V2 Decision Gate:** If incoming is V2, throw `AuraHandledException` blocking write pending Lead Architect & Product Owner decision.
8. **Evaluate Blank Incoming vs Blank Existing Data:**
   - If incoming is blank, return existing data untouched (no-op).
   - If existing data is blank/null, proceed with initial V1 save behavior.
9. **Validate and Classify Existing Persisted Data:** Validate existing container syntax, object structure, schema version, and required V2 properties.
10. **Apply Authorized V1-to-V2 Merge Behavior:** Merge incoming flat V1 criteria into `existingContainer.activeFilter`, reset `activePresetId` to `null`, and return serialized container.

---

### 5.2 Authoritative Proposed Apex Merge Algorithm

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
            if (inVerObj instanceof Decimal) {
                Decimal d = (Decimal) inVerObj;
                if (d != d.intValue()) {
                    throw new AuraHandledException('Incoming schemaVersion cannot be a fractional number.');
                }
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
    // Handle blank incoming payload: retain existing data untouched (no-op)
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
            if (schemaVerObj instanceof Decimal) {
                Decimal dExisting = (Decimal) schemaVerObj;
                if (dExisting != dExisting.intValue()) {
                    throw new AuraHandledException('Existing persisted schemaVersion cannot be a fractional number.');
                }
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

## 6. Authoritative Edge-Case Analysis Matrix

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
| 19 | Valid V2 Container | Null or Empty `""` incoming payload | Existing V2 Container returned untouched | Existing Data Preserved (No-Op) |
| 20 | Valid V2 Container | JSON Array `[1, 2, 3]` | Exception Thrown: `Invalid incoming JSON payload structure: Must be a JSON object` | **Fail-Closed Protection** |
| 21 | Valid V2 Container | V2 Container missing `presets` | Exception Thrown: `Incoming V2 container is structurally invalid: presets array is required` | **Fail-Closed Protection** |
| 22 | Valid V2 Container | V2 Container missing `activeFilter` | Exception Thrown: `Incoming V2 container is structurally invalid: activeFilter object is required` | **Fail-Closed Protection** |

---

## 7. Non-Implementation Confirmation

This document specifies the contract and algorithm. No Apex source code (`DAUserPreferenceController.cls`) or Apex test files were modified during this specification task. The implementation hold remains **ACTIVE**.
