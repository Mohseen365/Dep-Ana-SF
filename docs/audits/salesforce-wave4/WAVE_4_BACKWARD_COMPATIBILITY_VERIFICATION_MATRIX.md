# Wave 4 (`FEAT-STATE-03`): Backward Compatibility & Verification Matrix

| Verification Attribute | Value |
|---|---|
| **Document Type** | Cross-Version Compatibility & Rollback Forensic Audit |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets & Matrix / Findings Integration |
| **Branch** | `jules-15803627608761853366-1bbd7df3` |
| **HEAD Commit SHA** | `75ad1292a6f6d586df07beea5c3c959f15e200da` |
| **Governance Status** | **AUDITED & VERIFIED MATRIX — VERSION GUARD REQUIRED** |

---

## 1. Executive Summary & Critical Data-Loss Finding

This forensic compatibility audit evaluates the interaction between legacy Wave 3 clients (which create and consume flat v1 filter JSON) and Wave 4 clients (which produce and consume v2 JSON containers with saved presets).

### Key Finding:
In the current production Apex controller (`scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls`, lines 123–125):
```apex
if (filtersJson != null) {
    prefRecord.Filters_JSON__c = filtersJson;
}
```
If a Wave 3 client updates filters on a record that already contains a Wave 4 v2 container with saved presets, **the Apex controller blindly overwrites `Filters_JSON__c` with flat v1 JSON, destroying all saved presets**.

An Apex-side version guard (`mergeV1IntoV2Container`) has been proposed for Lane B implementation to prevent this data loss, but **it does not yet exist in the codebase**.

---

## 2. Complete 8-Scenario Compatibility Matrix (BC-01 through BC-08)

| Scenario ID | Writer | Stored Data | Reader / Subsequent Writer | Expected Behavior | Actual Current Behavior | Executable Test Evidence | Data-Loss Risk | Final Status |
|---|---|---|---|---|---|---|---|---|
| **BC-01** | Wave 3 | Flat v1 JSON | Wave 3 | Reads flat filter criteria (`searchTerm`, `riskLevels`, `testStatus`). App operates normally. | Flat JSON parsed directly into component filter properties. | `run-workstream-a-tests.cjs` (Tests 14, 17, 20) | `NONE` | `VERIFIED` |
| **BC-02** | Wave 3 | Flat v1 JSON | Wave 4 | Safe v1-to-v2 normalization in `daAppShell.js`. Flat filter criteria placed into `activeFilter`, with empty `presets: []`. | App detects missing `schemaVersion` and normalizes v1 into v2 in-memory container. | `run-workstream-a-tests.cjs` (Tests 19, 21, 23) | `NONE` | `VERIFIED` |
| **BC-03** | Wave 4 | v2 Container | Wave 4 | Round-trip serialization/deserialization of `schemaVersion: 2`, `activePresetId`, `presets[]`, and `activeFilter{}`. | Full preset and active filter state retrieved and hydrated without loss. | `run-workstream-a-tests.cjs` (Tests 15, 18, 19) | `NONE` | `VERIFIED` |
| **BC-04** | Wave 4 | v2 Container | Wave 3 (Read) | Legacy Wave 3 client reads v2 JSON container `{ schemaVersion: 2, ... }`. `JSON.parse` succeeds, but top-level v1 properties are missing. Safe fallback to default criteria. | Legacy UI falls back gracefully to default empty filter state without runtime exceptions. | Code inspection of `daAppShell.js` (Wave 3 version lacks v2 parsing) | `LOW` (Read-only UI fallback) | `VERIFIED` |
| **BC-05** | Wave 4 | v2 Container | Wave 3 (Update/Save) | Wave 3 client saves flat v1 JSON. Apex must preserve existing v2 presets rather than overwriting. | **Apex blindly overwrites `Filters_JSON__c` with flat v1 JSON, destroying saved v2 presets.** | Direct code verification in `DAUserPreferenceController.cls` line 124 | **HIGH (CRITICAL PRESET LOSS)** | **NOT VERIFIED (UNSAFE WITHOUT APEX GUARD)** |
| **BC-06** | Wave 3 | Overwritten v1 JSON | Wave 4 | Wave 4 reads back overwritten record. No silent downgrade or preset loss. | Wave 4 reads overwritten flat v1 JSON, normalizes to v2 with empty `presets: []`. Prior v2 presets permanently lost. | Inferred consequence of BC-05 | **HIGH (CRITICAL DATA LOSS)** | **NOT VERIFIED (UNSAFE WITHOUT APEX GUARD)** |
| **BC-07** | Wave 4 | v2 Container | Wave 4 (Project Switch) | Switching projects clears active state and loads target project's v2 preference. No cross-project data leakage. | `Preference_Key__c` composite index (`UserId:ProjectId`) guarantees complete project isolation. | `run-workstream-a-tests.cjs` (Tests 15, 16), `run-workstream-c-tests.cjs` (Test 4) | `NONE` | `VERIFIED` |
| **BC-08** | Wave 4 | Malformed or unsupported version | Wave 4 | Safe fallback to default v2 empty container or explicit validation rejection. | Component catches JSON parse failure or unsupported version number and falls back to empty v2 filter container. | `run-workstream-a-tests.cjs` (Tests 21, 22, 23) | `NONE` | `VERIFIED` |

---

## 3. Required Future Behavior & Proposed Lane B Apex Mitigation

To guarantee preset preservation in multi-version Orgs where Wave 3 and Wave 4 clients operate concurrently, Lane B MUST implement `mergeV1IntoV2Container` in `DAUserPreferenceController.cls`:

### Proposed Logic:
```apex
private static String mergeV1IntoV2Container(String existingV2Json, String incomingV1Json) {
    if (String.isBlank(existingV2Json)) return incomingV1Json;
    if (String.isBlank(incomingV1Json)) return existingV2Json;

    try {
        Map<String, Object> existingContainer = (Map<String, Object>) JSON.deserializeUntyped(existingV2Json);
        Map<String, Object> incomingFilter = (Map<String, Object>) JSON.deserializeUntyped(incomingV1Json);

        // Update activeFilter criteria in existing container while leaving presets[] untouched
        existingContainer.put('activeFilter', incomingFilter);
        return JSON.serialize(existingContainer);
    } catch (Exception e) {
        return incomingV1Json; // Fallback
    }
}
```

---

## 4. Rollback & Downgrade Safety Analysis

1. **Database Safety:** `DA_User_Preference__c.Filters_JSON__c` retains valid JSON strings regardless of version.
2. **UI Fallback Safety:** Wave 3 clients reading Wave 4 v2 containers fall back cleanly to empty filter state without runtime crashes.
3. **Recovery Path:** Re-deploying Wave 4 LWC bundle immediately restores access to all saved presets.
