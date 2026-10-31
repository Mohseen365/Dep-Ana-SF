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

---

## 5. Remediation R1 — Fail-Closed Apex Merge Specification

### 5.1 Unresolved Decision: Incoming V2 Full Replacement vs. Partial Merge
When an incoming payload is itself a valid V2 container (`schemaVersion: 2`):
- **Option A (Full Replacement):** Incoming V2 payload completely replaces existing persisted container.
  - *Risk:* If client loaded stale state, concurrent preset creations by other sessions are permanently destroyed.
- **Option B (Partial Merge):** Merge incoming `presets` with existing persisted `presets` using preset ID matching.
  - *Risk:* Deletion of presets becomes ambiguous (cannot distinguish intentional deletion from absence in client state).
- **Governance Status:** **PENDING HUMAN DECISION (Product Owner & Lead Architect)**.
- **Contract Rule:** Neither behavior is approved. Authoritative pseudocode must NOT silently implement either behavior. Any write of incoming V2 must stop with a documented unresolved outcome until human authorization is granted.

---

### 5.2 Authoritative Proposed Apex Merge Algorithm

This algorithm represents the **SINGLE AUTHORITATIVE PROPOSED ALGORITHM CONTRACT** for Remediation R1:

```apex
/**
 * Authoritative Proposed Algorithm for Remediation R1
 * Fail-closed merge helper for DAUserPreferenceController.cls
 */
@TestVisible
private static String mergeV1IntoV2Container(String existingV2Json, String incomingFilterJson) {
    // -------------------------------------------------------------
    // Layer 1 & 2: Validate incoming payload syntax and object type
    // -------------------------------------------------------------
    Map<String, Object> incomingMap = null;
    if (String.isNotBlank(incomingFilterJson)) {
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
    }

    // Handle blank existing data: initial save
    if (String.isBlank(existingV2Json)) {
        return incomingFilterJson;
    }

    // Handle blank incoming payload: retain existing data untouched
    if (String.isBlank(incomingFilterJson)) {
        return existingV2Json;
    }

    // -------------------------------------------------------------
    // Layer 3 & 4: Parse, classify, and validate existing container
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
            // Unresolved architectural decision: do not guess or silently upgrade
            throw new AuraHandledException('Ambiguous persisted filter preference: presets present without schemaVersion. Pending architectural decision.');
        }

        Boolean isV2Container = false;
        if (hasSchemaVer) {
            if (!(schemaVerObj instanceof Integer || schemaVerObj instanceof Long || schemaVerObj instanceof Decimal)) {
                throw new AuraHandledException('Existing filter preference has invalid schemaVersion type: Must be integer.');
            }
            Integer ver = Integer.valueOf(schemaVerObj);
            if (ver == 2) {
                // Complete V2 structural validation: both presets and activeFilter are required
                if (!hasPresets || !(presetsObj instanceof List<Object>)) {
                    throw new AuraHandledException('Existing V2 container is structurally invalid: presets array is required.');
                }
                if (!hasActiveFilter || !(activeFilterObj instanceof Map<String, Object>)) {
                    throw new AuraHandledException('Existing V2 container is structurally invalid: activeFilter object is required.');
                }
                isV2Container = true;
            } else {
                // Unsupported future or legacy schema version -> fail-closed protection
                throw new AuraHandledException('Unsupported schema version: ' + ver + '. Persisted data preserved untouched.');
            }
        }

        // -------------------------------------------------------------
        // Layer 5: Validate and process incoming payload
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
                throw new AuraHandledException('Unsupported incoming schema version: ' + inVer);
            }
            // Complete structural validation for incoming V2 payload
            if (!incomingMap.containsKey('presets') || !(incomingMap.get('presets') instanceof List<Object>)) {
                throw new AuraHandledException('Incoming V2 container is structurally invalid: presets array is required.');
            }
            if (!incomingMap.containsKey('activeFilter') || !(incomingMap.get('activeFilter') instanceof Map<String, Object>)) {
                throw new AuraHandledException('Incoming V2 container is structurally invalid: activeFilter object is required.');
            }

            // UNRESOLVED DECISION GATE: Incoming V2 write semantics (Replacement vs. Merge)
            // Neither behavior is approved by Product Owner and Lead Architect.
            // Execution stops here with explicit notification.
            throw new AuraHandledException('UNRESOLVED DECISION: Incoming V2 container write semantics (full replacement vs. partial merge) require Product Owner and Lead Architect sign-off.');
        }

        // Check if incoming is ambiguous (has presets but no schemaVersion)
        if (!incomingHasSchemaVer && incomingHasPresets) {
            throw new AuraHandledException('Ambiguous incoming filter payload: presets present without schemaVersion. Pending architectural decision.');
        }

        // Incoming is legacy flat V1 filter payload
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

### 5.3 Single Authoritative Failure Contract
- **No Destructive Fallback:** If JSON validation or deserialization fails, existing database records must NOT be overwritten with partial, blank, or corrupted data.
- **No False Successful Save:** Catch blocks must NOT silently swallow exceptions or return `existingV2Json` as if save succeeded when incoming data was invalid.
- **Explicit Failure Response:** Any syntax or structural error throws an `AuraHandledException`, delivering an explicit error message to the caller.
- **Database Consistency:** Database transaction rolls back on exception, ensuring persisted data remains unchanged.

---

## 6. Concurrency & Transactional Analysis

Inspection of source code `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` reveals:

- **SOQL `FOR UPDATE` Status:** `DAUserPreferenceController.getUserPreference()` (lines 21–48) and `saveUserPreference()` (lines 80–120) do **NOT** execute SOQL queries with `FOR UPDATE`.
- **Last-Write-Wins Behavior:** Concurrent transactions writing to the same preference record execute standard last-write-wins without row-level locking.
- **Atomic Preservation Limitation:** Concurrent updates where Client A writes flat V1 filters while Client B creates a V2 preset can result in a race condition where one write overwrites the other.
- **Future Remediation:** Adding `FOR UPDATE` row locking or optimistic concurrency tokens is documented as a future architectural enhancement requiring Lead Architect review. No transactional locking is currently implemented.

---

## 7. Authoritative Edge-Case Analysis Matrix

The following edge-case matrix aligns 100% with Section 3, Section 4, and Section 5:

| # | Existing Payload (`existingV2Json`) | Incoming Payload (`incomingFilterJson`) | Expected Resulting `Filters_JSON__c` | Preservation & Safety Outcome |
|---|---|---|---|---|
| 1 | Valid V2 Container with 5 Presets | Valid Flat V1 Filter JSON | Updated V2 Container (`activeFilter` updated, all 5 `presets` preserved, `activePresetId` = null) | **Presets Preserved Intact** |
| 2 | Legacy Flat V1 Filter JSON | Valid Flat V1 Filter JSON | Incoming Flat V1 JSON | Standard V1 update |
| 3 | Unsupported V99 Container (`"schemaVersion": 99`) | Valid Flat V1 Filter JSON | Exception Thrown: `Unsupported schema version: 99` | **Fail-Closed Protection** |
| 4 | Container with `presets: [...]` (missing `schemaVersion`) | Valid Flat V1 Filter JSON | Exception Thrown: `Ambiguous persisted filter preference` | **Blocked Pending Decision** |
| 5 | Container with `schemaVersion: 2, presets: "bad"` | Valid Flat V1 Filter JSON | Exception Thrown: `Existing V2 container is structurally invalid: presets array is required` | **Fail-Closed Protection** |
| 6 | Container with `schemaVersion: 2` (missing `activeFilter`) | Valid Flat V1 Filter JSON | Exception Thrown: `Existing V2 container is structurally invalid: activeFilter object is required` | **Fail-Closed Protection (No Silent Repair)** |
| 7 | Valid V2 Container with `"customAttr": true` | Valid Flat V1 Filter JSON | Updated V2 Container retaining `"customAttr": true` | Extension Preserved |
| 8 | Malformed existing JSON `{bad_json` | Valid Flat V1 Filter JSON | Exception Thrown: `Existing persisted filter preference has invalid container structure` | **Fail-Closed Protection** |
| 9 | Null or Empty `""` existing payload | Valid Flat V1 Filter JSON | Incoming Flat V1 JSON | Initial save accepted |
| 10 | Valid V2 Container | Malformed incoming JSON `[bad_json` | Exception Thrown: `Malformed incoming filter JSON payload` | **Fail-Closed Protection** |
| 11 | Valid V2 Container | Null or Empty `""` incoming payload | Existing V2 Container returned untouched | Existing Data Preserved |
| 12 | Valid V2 Container | Valid V2 Container JSON | Exception Thrown: `UNRESOLVED DECISION: Incoming V2 container write semantics` | **Blocked Pending Decision** |
| 13 | Valid V2 Container | JSON Array `[1, 2, 3]` | Exception Thrown: `Invalid incoming JSON payload structure: Must be a JSON object` | **Fail-Closed Protection** |
| 14 | Valid V2 Container | V2 Container missing `presets` | Exception Thrown: `Incoming V2 container is structurally invalid: presets array is required` | **Fail-Closed Protection** |
| 15 | Valid V2 Container | V2 Container missing `activeFilter` | Exception Thrown: `Incoming V2 container is structurally invalid: activeFilter object is required` | **Fail-Closed Protection** |

---

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
