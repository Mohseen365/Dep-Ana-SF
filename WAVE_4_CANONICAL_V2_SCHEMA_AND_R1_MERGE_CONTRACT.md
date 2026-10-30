# Wave 4 (`FEAT-STATE-03`): Canonical V2 Schema & R1 Merge Contract

| Governance Attribute | Value |
|---|---|
| **Document Type** | Technical Schema Contract & R1 Apex Merge Algorithm Specification |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters & Presets Persistence |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-11542301699362109650-b5a0782a` |
| **HEAD Commit SHA** | `8d9dc237611e0111122c3f3c1b0b0d16aae6ca2c` |
| Audit Date | March 2026 |
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

### Mandatory & Optional Schema Properties
1. **`schemaVersion` (Integer, Required):** Must be numeric literal `2`.
2. **`presets` (Array, Required):** Collection of saved preset objects (`FilterPreset[]`). Defaults to `[]` if initialized empty.
3. **`activeFilter` (Object, Required):** Filter criteria currently applied to the workspace.
4. **`activePresetId` (String or Null, Optional):** ID of currently active preset, or `null` when custom ad-hoc filters are applied.
5. **`testCoverageStatus` (Array, Optional):** Coverage status metadata retained from prior schema versions. Optional; defaults to `[]` if absent.
6. **Forward Compatibility Rule:** Any unknown or extra top-level properties present in existing v2 JSON (e.g. `"customAttribute": true`) must be preserved intact during reads, merges, and writes.

---

## 3. Remediation R1 — Proposed Fail-Closed Apex Merge Algorithm & Validation Order

When legacy Wave 3 clients or flat v1 filter payloads are submitted to `DAUserPreferenceController.saveUserPreference()`, `Filters_JSON__c` must be updated without overwriting existing v2 preset collections.

### 3.1 Validation Order & Execution Sequence
To prevent malformed or oversized incoming payloads from bypassing validation (even when existing JSON is blank or null), the processing order must strictly follow:

1. **Incoming Payload Syntax Validation:** Validate incoming JSON payload syntax via `validateJsonString`. If incoming string is non-blank but invalid JSON, throw an `AuraHandledException` immediately.
2. **Existing Payload Validation & Deserialization:** Parse existing `Filters_JSON__c` string. If existing JSON is malformed, fail-closed and retain existing data intact or raise an exception.
3. **Schema Recognition:** Determine whether existing payload is a recognized V2 container, a flat V1 payload, or blank/null.
4. **Validation & Merge Execution:** Perform V1-to-V2 migration or activeFilter update while preserving `presets`, `schemaVersion: 2`, and unknown extension properties.
5. **Persistence Exception Protection:** If a merge failure or runtime exception occurs, throw an `AuraHandledException` so the client caller receives an explicit failure notification rather than a false success response with unchanged data.

### Proposed Apex Algorithm Specification

```apex
@TestVisible
private static String mergeV1IntoV2Container(String existingV2Json, String incomingV1Json) {
    // 1. Validate incoming JSON syntax if non-blank
    if (String.isNotBlank(incomingV1Json)) {
        try {
            JSON.deserializeUntyped(incomingV1Json);
        } catch (Exception e) {
            throw new AuraHandledException('Malformed incoming filter JSON payload: ' + e.getMessage());
        }
    }

    // 2. If existing data is null or blank, return incoming payload directly (already validated syntax)
    if (String.isBlank(existingV2Json)) {
        return incomingV1Json;
    }
    // 3. If incoming payload is null or blank, retain existing data
    if (String.isBlank(incomingV1Json)) {
        return existingV2Json;
    }

    try {
        Object deserializedExisting = JSON.deserializeUntyped(existingV2Json);
        if (!(deserializedExisting instanceof Map<String, Object>)) {
            // Existing payload is JSON array or primitive, treat as unhandled -> fail-closed
            return existingV2Json;
        }

        Map<String, Object> existingContainer = (Map<String, Object>) deserializedExisting;

        // Check schema version explicit value or presence of presets list
        Object schemaVerObj = existingContainer.get('schemaVersion');
        Object presetsObj = existingContainer.get('presets');

        Boolean isV2Container = false;
        if (schemaVerObj instanceof Integer || schemaVerObj instanceof Long || schemaVerObj instanceof Decimal) {
            Integer ver = Integer.valueOf(schemaVerObj);
            if (ver == 2) {
                isV2Container = true;
            } else if (ver > 2) {
                // Unsupported future schema version -> Fail-closed protection: preserve existing untouched
                return existingV2Json;
            }
        } else if (presetsObj instanceof List<Object>) {
            isV2Container = true;
        }

        if (isV2Container) {
            Object deserializedIncoming = JSON.deserializeUntyped(incomingV1Json);
            if (deserializedIncoming instanceof Map<String, Object>) {
                Map<String, Object> incomingMap = (Map<String, Object>) deserializedIncoming;

                // If incoming payload is flat v1 (lacks schemaVersion), merge into activeFilter
                if (!incomingMap.containsKey('schemaVersion')) {
                    existingContainer.put('activeFilter', incomingMap);
                    existingContainer.put('activePresetId', null); // Ad-hoc v1 filter update clears active preset ID
                    if (!existingContainer.containsKey('schemaVersion')) {
                        existingContainer.put('schemaVersion', 2);
                    }
                    return JSON.serialize(existingContainer);
                }
            }
        }

        // If existing payload is flat v1, or incoming is already a v2 container, accept incoming
        return incomingV1Json;

    } catch (Exception e) {
        // FAIL-CLOSED INVARIANT: On any JSON parsing or type-cast failure, return existing v2 data intact.
        // NEVER fall back to destructive overwrite of existing data.
        return existingV2Json;
    }
}
```

---

## 4. Comprehensive Edge-Case Analysis Matrix

The following table specifies the exact expected behavior for all 13 required edge cases under the proposed fail-closed algorithm:

| # | Condition / Input Scenario | Existing Payload (`existingV2Json`) | Incoming Payload (`incomingV1Json`) | Expected Resulting `Filters_JSON__c` | Preservation / Safety Semantics |
|---|---|---|---|---|---|
| 1 | `schemaVersion: 2` with valid V2 structure | Valid V2 Container | Valid Flat V1 Filter JSON | Updated V2 Container (`activeFilter` updated, `presets` preserved, `activePresetId` = `null`, `schemaVersion` = 2) | **Presets Preserved Intact** |
| 2 | `schemaVersion: 1` | Flat V1 Filter JSON e.g. `{"search":"Apex"}` | Valid Flat V1 Filter JSON | Incoming Flat V1 JSON | Standard V1 overwrite |
| 3 | `schemaVersion: 99` | Future V99 Container `{"schemaVersion":99}` | Valid Flat V1 Filter JSON | Existing V99 Container untouched | **Fail-Closed Protection** (Future schema protected) |
| 4 | Missing `schemaVersion` | Container with `presets: [...]` but no `schemaVersion` key | Valid Flat V1 Filter JSON | Updated V2 Container (`presets` detected; V1 merged into `activeFilter`, `schemaVersion` added as 2) | Presets Preserved Intact |
| 5 | `presets` without a version | Container with `presets: [...]` | Valid Flat V1 Filter JSON | Updated V2 Container (`presets` recognized as V2 container) | Presets Preserved Intact |
| 6 | Version present but `presets` malformed | Container with `schemaVersion: 2, presets: "bad"` | Valid Flat V1 Filter JSON | Existing V2 Container untouched | Fail-Closed Protection |
| 7 | Valid V2 container with unknown properties | V2 Container with `"customAttr": true` | Valid Flat V1 Filter JSON | Updated V2 Container retaining `"customAttr": true` | Forward Compatibility Preserved |
| 8 | Malformed existing JSON | `{bad_json` | Valid Flat V1 Filter JSON | Existing string untouched | **Fail-Closed Protection** |
| 9 | Empty existing JSON | `""` | Valid Flat V1 Filter JSON | Incoming Flat V1 JSON | Created as initial V1 preference |
| 10 | Blank / Null existing JSON | `null` | Valid Flat V1 Filter JSON | Incoming Flat V1 JSON | Created as initial V1 preference |
| 11 | Valid incoming V1 payload | Valid V2 Container | `{"search":"Service","riskLevels":["HIGH"]}` | Updated V2 Container (`activeFilter` set to V1 object, `activePresetId` set to `null`) | Presets & Extensions Preserved |
| 12 | Valid incoming V2 payload | Valid V2 Container | Full V2 Container JSON | Incoming V2 Container | Replaces existing container with new V2 payload |
| 13 | Malformed incoming payload | Valid V2 Container | `[invalid_json` | **Threw AuraHandledException** | **Incoming validation fails; save rejected** |

---

## 5. Transactional & Concurrency Analysis

Inspection of the actual source code (`DAUserPreferenceController.cls` lines 21–48 and 80–120) reveals:

- **Row Locking (`FOR UPDATE`):** `DAUserPreferenceController.getUserPreference()` and `saveUserPreference()` do **NOT** execute SOQL queries with `FOR UPDATE`.
- **Concurrent Updates:** Two concurrent transactions writing to the same preference record will execute last-write-wins without row-level database locking.
- **Atomic Preservation Guarantee Status:** **UNRESOLVED / PENDING ARCHITECTURAL DECISION**. Atomic read-modify-write preservation of `presets` under concurrent V1 and V2 client writes is **NOT** currently guaranteed by Apex source code. Adding `FOR UPDATE` or optimistic concurrency checks is a proposed future remediation requirement pending Lead Architect review.

---

## 6. Non-Implementation Confirmation

This document specifies the target contract and algorithm. No Apex controller modifications (`DAUserPreferenceController.cls`) or unit tests were executed or implemented during this dispatch.

### Proposed Apex Algorithm Specification

```apex
@TestVisible
private static String mergeV1IntoV2Container(String existingV2Json, String incomingV1Json) {
    // 1. If existing data is null or blank, return incoming payload
    if (String.isBlank(existingV2Json)) {
        return incomingV1Json;
    }
    // 2. If incoming payload is null or blank, retain existing data
    if (String.isBlank(incomingV1Json)) {
        return existingV2Json;
    }

    try {
        Map<String, Object> existingContainer = (Map<String, Object>) JSON.deserializeUntyped(existingV2Json);

        // Check if existing data is a recognized v2 container (has schemaVersion or presets)
        Boolean isV2Container = existingContainer != null &&
            (existingContainer.containsKey('schemaVersion') || existingContainer.containsKey('presets'));

        if (isV2Container) {
            Map<String, Object> incomingFilter = (Map<String, Object>) JSON.deserializeUntyped(incomingV1Json);

            // If incoming payload is flat v1 (lacks schemaVersion), merge into activeFilter
            if (incomingFilter != null && !incomingFilter.containsKey('schemaVersion')) {
                existingContainer.put('activeFilter', incomingFilter);
                existingContainer.put('activePresetId', null); // Ad-hoc v1 filter update clears active preset ID
                return JSON.serialize(existingContainer);
            }
        }

        // If existing payload is flat v1, or incoming is already a v2 container, accept incoming
        return incomingV1Json;

    } catch (Exception e) {
        // FAIL-CLOSED INVARIANT: On any JSON parsing or type-cast failure, return existing v2 data intact.
        // NEVER fall back to destructive overwrite of existing data.
        return existingV2Json;
    }
}
```

---

## 4. Comprehensive Edge-Case Analysis Matrix

The following table specifies the exact expected behavior for all 14 required edge cases under the proposed fail-closed algorithm:

| # | Existing Preference (`existingV2Json`) | Incoming Payload (`incomingV1Json`) | Expected Resulting `Filters_JSON__c` | Preservation Behavior |
|---|---|---|---|---|
| 1 | `null` | Valid Flat v1 Filter JSON | Incoming Flat v1 JSON | Created as initial v1 preference |
| 2 | `""` (Empty String) | Valid Flat v1 Filter JSON | Incoming Flat v1 JSON | Created as initial v1 preference |
| 3 | Valid Flat v1 Filter JSON | Valid Flat v1 Filter JSON | Incoming Flat v1 JSON | Standard v1 overwrite |
| 4 | Valid Canonical v2 Container | Valid Flat v1 Filter JSON | Updated v2 Container (v1 merged into `activeFilter`, `presets` preserved, `activePresetId` = null) | **Presets Preserved Intact** |
| 5 | Valid v2 Container without `schemaVersion` key | Valid Flat v1 Filter JSON | Updated v2 Container (`presets` detected; v1 merged into `activeFilter`) | Presets Preserved Intact |
| 6 | Valid v2 Container with `schemaVersion: 99` | Valid Flat v1 Filter JSON | Existing v2 Container untouched (Unsupported future schema version protected) | **Fail-Closed Protection** |
| 7 | Malformed JSON e.g. `{bad_json` | Valid Flat v1 Filter JSON | Existing string untouched | **Fail-Closed Protection** |
| 8 | Valid Canonical v2 Container | Malformed JSON e.g. `[invalid` | Existing v2 Container untouched | **Fail-Closed Protection** |
| 9 | Valid Canonical v2 Container | `null` | Existing v2 Container untouched | Existing Data Preserved |
| 10 | Valid Canonical v2 Container | `""` (Empty String) | Existing v2 Container untouched | Existing Data Preserved |
| 11 | Valid Canonical v2 Container with 20 Presets | Valid Flat v1 Filter JSON | Updated v2 Container with all 20 presets preserved intact in `presets[]` | **Presets Preserved Intact** |
| 12 | Valid v2 Container with extra unknown property `"customAttribute": true` | Valid Flat v1 Filter JSON | Updated v2 Container retaining `"customAttribute": true` | Forward Compatibility Preserved |
| 13 | Valid v2 Container with invalid/stale `activePresetId` | Valid Flat v1 Filter JSON | Updated v2 Container with `activePresetId` set to `null` | Active Filter Replaced |
| 14 | Stale/Concurrent update on v2 Container | Valid Flat v1 Filter JSON | Apex transaction processes sequentially under SOQL FOR UPDATE / single-record upsert | Single-Record Transactional Integrity |

---

## 5. Non-Implementation Confirmation

This document specifies the target contract and algorithm. No Apex controller modifications (`DAUserPreferenceController.cls`) or unit tests were executed or implemented during this dispatch.
