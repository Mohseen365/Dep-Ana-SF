# Wave 4 (`FEAT-STATE-03`): Canonical V2 Schema & R1 Merge Contract

| Governance Attribute | Value |
|---|---|
| **Document Type** | Technical Schema Contract & R1 Apex Merge Algorithm Specification |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters & Presets Persistence |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-11542301699362109650-b5a0782a` |
| **HEAD Commit SHA** | `8d9dc237611e0111122c3f3c1b0b0d16aae6ca2c` |
| **Audit Date** | March 2025 |
| **Status** | **SPECIFICATION COMPLETE — READY FOR HUMAN REVIEW** |

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

### Mandatory Schema Properties
1. `schemaVersion` (Integer): Must be numeric literal `2`.
2. `presets` (Array): Collection of saved preset objects (`FilterPreset[]`).
3. `activePresetId` (String or Null): ID of currently active preset, or `null` when custom ad-hoc filters are applied.
4. `activeFilter` (Object): Filter criteria currently applied to the workspace.
5. `testCoverageStatus` (Array): Coverage status metadata retained from prior/existing schema versions.
6. **Forward Compatibility Rule:** Any unknown or extra top-level properties present in existing v2 JSON must be preserved intact during reads and writes.

---

## 3. Remediation R1 — Proposed Fail-Closed Apex Merge Algorithm

When legacy Wave 3 clients or flat v1 filter payloads are submitted to `DAUserPreferenceController.saveUserPreference()`, `Filters_JSON__c` must be updated without overwriting existing v2 preset collections.

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
