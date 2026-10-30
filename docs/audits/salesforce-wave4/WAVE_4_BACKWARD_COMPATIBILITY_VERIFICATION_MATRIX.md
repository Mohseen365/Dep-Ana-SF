# Wave 4 (`FEAT-STATE-03`): Backward Compatibility & Verification Matrix

| Verification Attribute | Value |
|---|---|
| **Document Type** | Cross-Version Compatibility & Rollback Forensic Audit |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets & Matrix / Findings Integration |
| **Branch** | `jules-15339927722844779962-f78d27e7` |
| **HEAD Commit SHA** | `8641e23d02d1f6e1e25762b27c9403c58b346b09` |
| **Governance Status** | **AUDITED & VERIFIED MATRIX — VERSION GUARD REQUIRED** |

---

## 1. Cross-Version Reader / Writer Scenario Matrix

The table below evaluates all 6 cross-version operational scenarios between legacy Wave 3 clients (which produce/consume flat v1 filter JSON) and new Wave 4 clients (which produce/consume v2 container JSON with presets).

| Scenario ID | Writer Version | Stored Schema Version | Reader Version | Expected Behavior | Data-Loss Risk | Actual Evidence / Method | Test Status |
|---|---|---|---|---|---|---|---|
| `COMP-01` | Wave 3 | None (v1 Flat JSON) | Wave 3 | Reads flat filter criteria JSON (`searchTerm`, `riskLevels`, `testStatus`). App operates normally. | `NONE` | Tested in `run-workstream-a-tests.cjs` (Tests 14, 17, 20). | `VERIFIED` |
| `COMP-02` | Wave 3 | None (v1 Flat JSON) | Wave 4 | Wave 4 `daAppShell` detects missing `schemaVersion`, automatically normalizes v1 criteria into in-memory v2 container (`schemaVersion: 2`, `presets: []`). | `NONE` | Tested in `run-workstream-a-tests.cjs` (Tests 19, 21, 23). | `VERIFIED` |
| `COMP-03` | Wave 4 | v2 Container | Wave 4 | Reads v2 container, parses `activePresetId`, `presets[]`, and `activeFilter{}`. Full preset functionality enabled. | `NONE` | Tested in `run-workstream-a-tests.cjs` (Tests 15, 18, 19). | `VERIFIED` |
| `COMP-04` | Wave 4 | v2 Container | Wave 3 | Legacy Wave 3 client reads `Filters_JSON__c` containing v2 JSON container `{ schemaVersion: 2, ... }`. `JSON.parse` succeeds, but Wave 3 UI looks for top-level `searchTerm`/`riskLevels`. Wave 3 filters fail silently or fall back to defaults. | `LOW` (Read-only UI degradation) | Inspection of `daAppShell.js` (Wave 3 version lacks `schemaVersion` switch). | `VERIFIED` |
| `COMP-05` | Wave 4 | v2 Container | Wave 3 (Save/Update) | Legacy Wave 3 client edits filters and calls `DAUserPreferenceController.saveUserPreference` with flat v1 JSON string. Apex blindly overwrites `Filters_JSON__c`, **destroying saved v2 presets**. | **HIGH (CRITICAL DATA LOSS)** | Verified in `DAUserPreferenceController.cls` line 48 (`if (filtersJson != null) pref.Filters_JSON__c = filtersJson;`). | **NOT VERIFIED (UNSAFE WITHOUT APEX GUARD)** |
| `COMP-06` | Wave 3 | Overwritten v1 Flat JSON | Wave 4 | Wave 4 reads back overwritten v1 JSON. Treats it as migrated v1 payload (`presets: []`). Presets previously saved in v2 container are permanently lost. | **HIGH (CRITICAL DATA LOSS)** | Inferred consequence of `COMP-05`. | **NOT VERIFIED (UNSAFE WITHOUT APEX GUARD)** |

---

## 2. Risk Mitigation & Required Apex Version Protection Guard

### 2.1 Identified Defect in Existing Production Apex
In `DAUserPreferenceController.cls`:
```apex
if (filtersJson != null) {
    pref.Filters_JSON__c = filtersJson;
}
```
If a Wave 3 client submits a flat v1 JSON payload (`{"searchTerm":"Account"}`) to an existing record that already contains a Wave 4 v2 container with presets (`{"schemaVersion":2, "presets":[...], "activeFilter":{...}}`), the Apex controller directly overwrites the field, resulting in **irrecoverable loss of the user's saved presets**.

### 2.2 Proposed Lane B Apex Version Guard (Non-Breaking Mitigation)
To prevent legacy clients from destroying v2 presets, Lane B MUST implement a version protection guard in `DAUserPreferenceController.cls` during Wave 4 implementation:

```apex
if (filtersJson != null) {
    // If existing record contains a v2 container and incoming JSON is flat v1 (lacks schemaVersion: 2)
    if (pref.Filters_JSON__c != null && pref.Filters_JSON__c.contains('"schemaVersion": 2') && !filtersJson.contains('"schemaVersion": 2')) {
        // Merge flat v1 incoming filter into activeFilter of existing v2 container while preserving presets[]
        pref.Filters_JSON__c = mergeV1IntoV2Container(pref.Filters_JSON__c, filtersJson);
    } else {
        pref.Filters_JSON__c = filtersJson;
    }
}
```

---

## 3. Rollback & Downgrade Safety Analysis

### 3.1 Emergency Rollback Strategy
If Wave 4 LWC bundle deployment must be rolled back to Wave 3 LWC code:
1. **Database Safety:** `DA_User_Preference__c` records will retain v2 JSON payloads in `Filters_JSON__c`.
2. **User Impact:** Wave 3 UI will fall back to default empty filter state upon reading v2 JSON.
3. **Data Preservation:** Saved presets in `Filters_JSON__c` will remain intact in Salesforce unless edited by a Wave 3 client (mitigated by the Apex Version Guard above).
4. **Recovery Path:** Re-deploying Wave 4 LWC immediately restores access to all previously saved presets and active filter selections.
