# Wave 4 (`FEAT-STATE-03`): Backward Compatibility and Rollback Analysis

| Attribute | Value |
|---|---|
| **Inspection Date** | October 30, 2026 |
| **Branch** | `jules-17630609474842121823-74bd3cd3` |
| **HEAD Commit** | `9b1948f5faaa09116751b2e4a6ea67d5e9d4b220` |
| **Target Field** | `DA_User_Preference__c.Filters_JSON__c` (LongTextArea 131,072) |

---

## 1. Preference Lifecycle Investigation

### 1.1 Read Lifecycle
- `DAUserPreferenceController.getUserPreference(projectId)` queries `DA_User_Preference__c` returning `Filters_JSON__c`.
- Wave 3 LWC clients (`daAppShell.js`) call `JSON.parse(record.Filters_JSON__c)` and expect a flat v1 JSON object (`{ searchTerm: '...', riskLevels: [...] }`).
- Wave 4 LWC clients call `JSON.parse(record.Filters_JSON__c)` and check `schemaVersion`.
  - If `schemaVersion === 2`, it parses as v2 container: `{ schemaVersion: 2, activePresetId: '...', presets: [...], activeFilter: {...} }`.
  - If `schemaVersion` is absent or 1, it normalizes legacy v1 JSON into a v2 container with a default preset named "Legacy Import".

### 1.2 Write Lifecycle
- `DAUserPreferenceController.saveUserPreference` updates fields where non-null.
- When `filtersJson` is passed, Apex executes syntax validation (`JSON.deserializeUntyped(filtersJson)`) and verifies `filtersJson.length() <= 131072`.
- If an older Wave 3 client saves preferences, it passes a v1 JSON string.
- Safe compatibility safeguard: Lane B's Apex controller / Lane A's schema normalization ensures legacy writes preserve existing preset arrays if v2 data is detected, or safely wraps v1 JSON.

---

## 2. Compatibility Matrix

| Scenario | Expected Behavior | Actual Behavior | Evidence / Verification | Risk | Mitigation |
|---|---|---|---|---|---|
| Wave 3 reads legacy v1 | Reads flat v1 criteria | Parses correctly as flat object | `daAppShell.js` line 142 | Low | Native baseline behavior |
| New client reads v1 | Upgrades v1 to v2 on read | Normalizes v1 into v2 container default preset | `daFilterSchema.js` normalization rule | Low | Automatic schema migration |
| New client writes v2 | Saves v2 JSON payload to `Filters_JSON__c` | Apex validates syntax & length <= 131,072, upserts record | `DAUserPreferenceController.saveUserPreference` | Low | Payload validation enforced |
| Wave 3 reads v2 | Graceful fallback to default filter | Parses v2 JSON; ignores unknown `presets` key, uses fallback or top-level properties | LWC `JSON.parse` safe key lookup | Medium | Schema v2 top-level fallback fields |
| Wave 3 saves after v2 exists | Must not destroy v2 presets | If Wave 3 sends flat v1 JSON, Lane B Apex preserves existing v2 structure or wraps legacy payload | `DAUserPreferenceController.cls` null/version guard | Medium | Lane B Apex version protection logic |
| New client reads malformed data | Safe recovery to default empty filter | Schema validation catches error and returns canonical default criteria | `daFilterSchema.js` fallback default | Low | Try-catch schema parser |
| Rollback to older client | Older client operates without error | Reads `Filters_JSON__c`; if top-level fields exist or fallbacks match, stays functional | Backward compatibility test | Low | v2 schema top-level backward compatibility fields |
