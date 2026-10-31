# Wave 4 (`FEAT-STATE-03`): Canonical V2 Schema & R1 Merge Contract

| Governance Attribute | Value |
|---|---|
| **Document Type** | Technical Schema Contract & R1 Apex Merge Algorithm Specification |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters & Presets Persistence |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-5014689980934327006-a6a229d3` |
| **HEAD Commit SHA** | `8ff54cae850a4f569da5f8ee602e142b74a110bc` |
| **Audit Date** | March 2026 (Execution Date) / October 2026 Roadmap |
| **Status** | **SPECIFICATION COMPLETE — READY FOR HUMAN REVIEW — IMPLEMENTATION HOLD ACTIVE** |

---

## 1. Context & Purpose

During Wave 4 development, a specification draft proposed a non-canonical container format (`{ "version": "v2", "activePresetId": "default", ... }`). This report re-establishes the canonical Wave 4 v2 JSON container schema contract established in earlier Wave 4 architecture decisions and specifies the fail-closed Apex merge algorithm required for Remediation R1.

---

## 2. Established Canonical Wave 4 V2 Schema Contract

All persistent representations of filter preferences saved in `DA_User_Preference__c.Filters_JSON__c` must adhere to the following canonical v2 JSON contract:

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

### 2.1 Schema Property Definitions
1. **`schemaVersion` (Integer, Required):** Must be integer literal `2`.
2. **`presets` (Array, Required):** Collection of saved preset objects (`FilterPreset[]`). Defaults to `[]` if initialized empty.
3. **`activeFilter` (Object, Required):** Filter criteria object currently applied to the workspace.
4. **`activePresetId` (String or Null, Optional):** ID of currently active preset, or `null` when custom ad-hoc filters are applied.
5. **`testCoverageStatus` (Array, Optional):** Coverage status metadata retained from prior schema versions. Optional; defaults to `[]` if absent.
6. **Forward Compatibility Rule:** Any unknown or extra top-level extension properties present in valid v2 JSON (e.g. `"customAttribute": true`) must be preserved intact during reads, merges, and writes.

---

## 3. Schema Recognition & Classification Contract

To resolve exact schema recognition and avoid ambiguous or destructive upgrades, the following rules govern container classification:

| Input Container Structure | Classification Outcome | Treatment & Preservations |
|---|---|---|
| Valid `schemaVersion: 2`, valid `presets` array, valid `activeFilter` object | **Recognized V2** | Valid V2 container. Active filter merges or V2 replacements operate per contract. |
| `schemaVersion: 2`, malformed `presets` (e.g. non-array string or primitive) | **Invalid V2** | Never silently treat as valid V2. Operations fail-closed without mutating database. |
| `schemaVersion: 2`, missing required `activeFilter` | **Invalid V2** | Malformed V2 container. Operations fail-closed. |
| `schemaVersion: 1` or flat filter object (e.g. `{"search":"Account"}`) | **Legacy Flat V1** | Recognized as legacy flat V1 filter payload. Migration or merge converts to V2. |
| `schemaVersion: 99` (or any `schemaVersion > 2`) | **Unsupported Future Schema** | Fail-closed protection: preserve existing payload untouched to prevent data loss. |
| Missing `schemaVersion` with `presets` array present | **Ambiguous / Legacy V2** | Documented as Pending Architectural Decision. Proposed Default: Treat as V2 if `presets` is a valid array, and add `schemaVersion: 2`. |
| Missing `schemaVersion` without `presets` | **Flat V1 / Unversioned** | Treated as legacy V1 payload. |
| JSON Array (e.g. `[1, 2, 3]`) or Primitive (e.g. `"string"`, `123`) | **Invalid Payload Structure** | Fail-closed rejection. Raise exception or retain existing data. |
| Malformed JSON syntax (e.g. `{bad_json`) | **Invalid Payload Syntax** | Fail-closed rejection. Throw `AuraHandledException`. |
| Valid V2 with unknown extension properties | **Valid V2 with Extensions** | Fully recognized V2 container; unknown extension properties preserved. |

*Note on Ambiguous Presets:* Silently treating `presets` presence as proof of V2 without checking array validity is prohibited.

---

## 4. Remediation R1 — Authoritative Fail-Closed Apex Merge Specification

When legacy Wave 3 clients or flat v1 filter payloads are submitted to `DAUserPreferenceController.saveUserPreference()`, `Filters_JSON__c` must be updated without overwriting existing v2 preset collections.

### 4.1 Strict 9-Step Processing & Validation Sequence

1. **Check Input Size:** Ensure incoming payload string length does not exceed 131,072 characters.
2. **Validate Incoming Syntax:** Parse incoming JSON payload via `validateJsonString`. If non-blank string is invalid JSON syntax, throw an `AuraHandledException` immediately.
3. **Validate Incoming Payload Structure & Type:** Determine whether incoming JSON is a Map (object), array, or primitive.
4. **Parse Existing Persisted Data:** Retrieve existing `Filters_JSON__c` string from database. If blank/null, handle as initial save.
5. **Recognize Existing Schema Version:** Apply Section 3 recognition rules to classify existing container format.
6. **Determine Migration or Merge Operation:**
   - If existing payload is Recognized V2 and incoming is Flat V1, merge V1 into `activeFilter`.
   - If incoming is valid V2, handle V2 save according to Section 4.3 policy.
7. **Preserve Existing Data Where Required:** Retain `presets`, `schemaVersion: 2`, `testCoverageStatus`, and unknown extension properties.
8. **Persist Transactionally:** Execute `upsert as user` inside Apex transaction.
9. **Return Explicit Result or Failure:** Return updated `DA_User_Preference__c` record on success, or throw `AuraHandledException` on failure.

---

### 4.2 Authoritative Proposed Apex Merge Algorithm

This code represents the **SINGLE AUTHORITATIVE PROPOSED ALGORITHM CONTRACT** for Remediation R1:

```apex
/**
 * Authoritative Proposed Algorithm for Remediation R1
 * Fail-closed merge helper for DAUserPreferenceController.cls
 */
@TestVisible
private static String mergeV1IntoV2Container(String existingV2Json, String incomingV1Json) {
    // Step 1 & 2: Validate incoming payload syntax if non-blank
    if (String.isNotBlank(incomingV1Json)) {
        try {
            Object parsedIncoming = JSON.deserializeUntyped(incomingV1Json);
            if (!(parsedIncoming instanceof Map<String, Object>)) {
                throw new AuraHandledException('Invalid incoming JSON payload structure: Must be a JSON object.');
            }
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Malformed incoming filter JSON payload: ' + e.getMessage());
        }
    }

    // Step 4: Handle blank existing data
    if (String.isBlank(existingV2Json)) {
        return incomingV1Json;
    }

    // Handle blank incoming payload
    if (String.isBlank(incomingV1Json)) {
        return existingV2Json;
    }

    // Step 5: Parse and classify existing payload
    try {
        Object deserializedExisting = JSON.deserializeUntyped(existingV2Json);
        if (!(deserializedExisting instanceof Map<String, Object>)) {
            // Existing payload is array or primitive -> Unrecognized format, fail-closed
            throw new AuraHandledException('Existing persisted filter preference has invalid container structure.');
        }

        Map<String, Object> existingContainer = (Map<String, Object>) deserializedExisting;
        Object schemaVerObj = existingContainer.get('schemaVersion');
        Object presetsObj = existingContainer.get('presets');

        Boolean isV2Container = false;
        if (schemaVerObj instanceof Integer || schemaVerObj instanceof Long || schemaVerObj instanceof Decimal) {
            Integer ver = Integer.valueOf(schemaVerObj);
            if (ver == 2) {
                // Check required presets array
                if (presetsObj != null && !(presetsObj instanceof List<Object>)) {
                    throw new AuraHandledException('Existing V2 container has malformed presets array.');
                }
                isV2Container = true;
            } else if (ver > 2) {
                // Unsupported future schema version -> Fail-closed protection
                throw new AuraHandledException('Unsupported future schema version: ' + ver);
            }
        } else if (presetsObj instanceof List<Object>) {
            // Ambiguous V2 without schemaVersion
            isV2Container = true;
        }

        if (isV2Container) {
            Map<String, Object> incomingMap = (Map<String, Object>) JSON.deserializeUntyped(incomingV1Json);

            // If incoming payload is flat V1 (lacks schemaVersion), merge into activeFilter
            if (!incomingMap.containsKey('schemaVersion')) {
                existingContainer.put('activeFilter', incomingMap);
                existingContainer.put('activePresetId', null); // Ad-hoc V1 filter clears active preset ID
                if (!existingContainer.containsKey('schemaVersion')) {
                    existingContainer.put('schemaVersion', 2);
                }
                return JSON.serialize(existingContainer);
            }
        }

        // If existing payload is flat V1, or incoming is a valid V2 container, accept incoming
        return incomingV1Json;

    } catch (AuraHandledException e) {
        throw e;
    } catch (Exception e) {
        throw new AuraHandledException('Failed to process filter preference merge: ' + e.getMessage());
    }
}
```

---

### 4.3 V1-to-V2 Conversion Semantics
When a valid flat V1 payload is merged into an existing V2 container:
- **`activeFilter`:** Updated to match incoming V1 criteria object.
- **`activePresetId`:** Reset to `null` (reflects ad-hoc filter criteria modification).
- **`presets`:** Preserved 100% intact without losing saved preset objects.
- **`schemaVersion`:** Maintained as `2` (or explicitly set to `2` if missing).
- **`testCoverageStatus`:** Preserved intact if present.
- **Unknown Extension Properties:** Retained intact in top-level JSON container map.

---

### 4.4 Incoming V2 Behavior & Operational Modes
When an incoming payload is itself a V2 container, two operations are possible:
1. **Full Replacement (Default Proposed):** Replaces existing container with new incoming V2 container (used during explicit preset creation, deletion, or re-ordering from `daPresetManager`).
2. **Partial Preset Merge (Alternative):** Merges incoming presets list with existing presets list.

*Blocking Architectural Decision:* Whether saving a V2 container overwrites existing presets or merges them is currently a **Pending Decision for Lead Architect & Product Owner**.
*Safest Proposed Default:* Full Replacement when saved explicitly by a V2-aware client (`daPresetManager`), provided client fetched current container prior to saving.

---

### 4.5 Single Authoritative Failure Contract
- **No Destructive Fallback:** If JSON validation or deserialization fails, existing database records must NOT be overwritten with partial or empty data.
- **No False Successful Save:** Catch blocks must NOT silently swallow exceptions or return `existingV2Json` as if save succeeded when incoming data was invalid.
- **Explicit Failure Response:** Any syntax or structural error throws an `AuraHandledException`, delivering an explicit error message to the client.
- **Database Consistency:** Database transaction rolls back on exception, ensuring persisted data remains unchanged.

*Comparison with Current Implementation:*
Currently in `DAUserPreferenceController.cls`, `saveUserPreference` validates JSON using `validateJsonString` which throws `AuraHandledException`. However, current code does not perform V1-to-V2 merge—it overwrites `Filters_JSON__c` directly. The proposed R1 contract replaces direct overwrite with `mergeV1IntoV2Container()`.

---

## 5. Concurrency & Transactional Analysis

Inspection of source code `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls` reveals:

- **SOQL `FOR UPDATE` Status:** `DAUserPreferenceController.getUserPreference()` (lines 21–48) and `saveUserPreference()` (lines 80–120) do **NOT** execute SOQL queries with `FOR UPDATE`.
- **Concurrent Updates:** Concurrent transactions writing to the same preference record will execute last-write-wins without row-level database locking.
- **Atomic Preservation Limitation:** Concurrent updates where Client A writes flat V1 filters while Client B creates a V2 preset can result in a race condition where one write overwrites the other.
- **Future Remediation:** Adding `FOR UPDATE` or optimistic concurrency tokens is documented as a future architectural enhancement requiring Lead Architect review.

---

## 6. Authoritative Edge-Case Analysis Matrix

The following edge-case matrix aligns 100% with Section 3, Section 4.2, and Section 4.5:

| # | Existing Payload (`existingV2Json`) | Incoming Payload (`incomingV1Json`) | Expected Resulting `Filters_JSON__c` | Preservation & Safety Outcome |
|---|---|---|---|---|
| 1 | Valid V2 Container with 5 Presets | Valid Flat V1 Filter JSON | Updated V2 Container (`activeFilter` updated, all 5 `presets` preserved, `activePresetId` = null) | **Presets Preserved Intact** |
| 2 | Legacy Flat V1 Filter JSON | Valid Flat V1 Filter JSON | Incoming Flat V1 JSON (or converted V2) | Standard V1 update |
| 3 | Unsupported V99 Container (`"schemaVersion": 99`) | Valid Flat V1 Filter JSON | Exception Thrown: `Unsupported future schema version` | **Fail-Closed Protection** |
| 4 | Container with `presets: [...]` (missing `schemaVersion`) | Valid Flat V1 Filter JSON | Updated V2 Container (`presets` preserved, V1 merged into `activeFilter`, `schemaVersion` = 2) | Presets Preserved Intact |
| 5 | Container with `schemaVersion: 2, presets: "bad"` | Valid Flat V1 Filter JSON | Exception Thrown: `Existing V2 container has malformed presets array` | **Fail-Closed Protection** |
| 6 | Container with `schemaVersion: 2` (missing `activeFilter`) | Valid Flat V1 Filter JSON | Updated V2 Container (`activeFilter` initialized to incoming V1) | Structurally Repaired |
| 7 | Valid V2 Container with `"customAttr": true` | Valid Flat V1 Filter JSON | Updated V2 Container retaining `"customAttr": true` | Extension Preserved |
| 8 | Malformed existing JSON `{bad_json` | Valid Flat V1 Filter JSON | Exception Thrown: `Existing persisted filter preference has invalid container structure` | **Fail-Closed Protection** |
| 9 | Null or Empty `""` existing payload | Valid Flat V1 Filter JSON | Incoming Flat V1 JSON | Initial save accepted |
| 10 | Valid V2 Container | Malformed incoming JSON `[bad_json` | Exception Thrown: `Malformed incoming filter JSON payload` | **Fail-Closed Protection** |
| 11 | Valid V2 Container | Null or Empty `""` incoming payload | Existing V2 Container returned untouched | Existing Data Preserved |
| 12 | Valid V2 Container | Valid V2 Container JSON | Incoming V2 Container JSON | V2 Container Updated |
| 13 | Valid V2 Container | JSON Array `[1, 2, 3]` | Exception Thrown: `Invalid incoming JSON payload structure` | **Fail-Closed Protection** |

---

## 7. Non-Implementation Confirmation

This document specifies the contract and algorithm. No Apex source code (`DAUserPreferenceController.cls`) or Apex test files were modified during this specification task.

---

## Appendix A — Historical Superseded Algorithm

*(Included for historical reference only. Explicitly marked: **SUPERSEDED — NOT AN IMPLEMENTATION CONTRACT**).*

```apex
// HISTORICAL SUPERSEDED ALGORITHM — DO NOT IMPLEMENT
// This algorithm relied on property presence check without incoming syntax validation
// and returned existing JSON in catch block (false success).
@TestVisible
private static String mergeV1IntoV2Container_SUPERSEDED(String existingV2Json, String incomingV1Json) {
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
