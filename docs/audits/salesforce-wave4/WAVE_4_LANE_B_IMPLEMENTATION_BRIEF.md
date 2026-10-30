# Wave 4 Implementation Brief — Lane B: Apex Persistence and Compatibility

| Brief Attribute | Specification |
|---|---|
| **Lane ID** | `LANE-B` |
| **Objective** | Update Apex preference controller (`DAUserPreferenceController.cls`) to handle v2 multi-preset JSON payloads in `Filters_JSON__c` with character limits (<=131,072), project isolation, and backward compatibility for older clients. |
| **Status** | **NOT AUTHORIZED FOR IMPLEMENTATION** (Draft Readiness Specification) |
| **Target Directory** | `scratch/salesforce-poc/force-app/main/default/classes/` |

---

## 1. Exact Scope & File Ownership

### Owned Files
- `scratch/salesforce-poc/force-app/main/default/classes/controllers/DAUserPreferenceController.cls`
- `scratch/salesforce-poc/force-app/main/default/classes/tests/DAUserPreferenceControllerTest.cls`
- `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`

### Prohibited Modifications
- MUST NOT modify LWC UI files (`daAppShell.js`, `daGraphViewer.js`).
- MUST NOT introduce new Salesforce Custom Objects or Custom Fields (`DA_Filter_Preset__c`).

---

## 2. Interface Contracts & Key Tasks

1. Maintain `saveUserPreference` and `getUserPreference` method signatures intact.
2. Validate `filtersJson` character length (<= 131,072 characters).
3. Enforce Apex syntax validation (`JSON.deserializeUntyped(filtersJson)`).
4. Preserve null-coalescing logic across `Positions_JSON__c`, `Filters_JSON__c`, and `Zoom_Pan_JSON__c`.
5. Ensure user and project isolation using composite key `Preference_Key__c = UserId + ':' + ProjectId`.
6. Add Apex unit test scenarios in `DAUserPreferenceControllerTest.cls` and offline harness `run-workstream-c-tests.cjs` for v2 JSON structure persistence.

---

## 3. Acceptance Criteria

- `Filters_JSON__c` safely stores v2 multi-preset JSON strings up to 131,072 characters.
- Malformed JSON strings in `filtersJson` are rejected with `AuraHandledException`.
- Null arguments preserve existing record values without overwriting.
- All 18 Workstream C offline tests pass 100%.
