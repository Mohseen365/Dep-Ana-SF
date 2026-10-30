# Wave 4 (`FEAT-STATE-03`): Dependency & Architecture Analysis

**Audit Date:** October 30, 2026
**Auditor:** Jules (Independent Migration Auditor)

---

## 1. Architectural Overview & Component Dependency Graph

Wave 4 (`FEAT-STATE-03`) introduces centralized filter state management, saved filter presets, and multi-view synchronization across **Graph**, **Matrix**, and **Findings** views.

```
                         +-----------------------------+
                         |      DA_User_Preference__c  |
                         |     (Filters_JSON__c)       |
                         +--------------+--------------+
                                        ^
                                        | Apex DML (WITH USER_MODE)
                                        v
                         +-----------------------------+
                         | DAUserPreferenceController  |
                         +--------------+--------------+
                                        ^
                                        | @AuraEnabled (get/save)
                                        v
                         +-----------------------------+
                         |         daAppShell          |
                         | (Canonical Filter State &   |
                         |   Active Preset Manager)    |
                         +-------+------+------+-------+
                                 |      |      |
         +-----------------------+      |      +-----------------------+
         | (LWC Event / Property)       | (LWC Event / Property)       | (LWC Event / Property)
         v                              v                              v
+------------------+          +------------------+          +------------------+
|  daGraphViewer   |          |  daMatrixViewer  |          | daFindingsViewer |
|  (Graph Filter   |          |  (Matrix Filter  |          | (Findings Filter |
|     Adapter)     |          |  Adapter - Stub) |          |  Adapter - Stub) |
+------------------+          +------------------+          +------------------+
```

---

## 2. Shared vs. View-Specific Filter Responsibilities

### 2.1 Canonical State Owner: `daAppShell`
`daAppShell` must act as the sole source of truth for:
1. Loading `Filters_JSON__c` from Salesforce upon initialization and project switching.
2. Holding active filter criteria (search term, risk level, node types, component layer, test coverage status).
3. Maintaining the list of user presets (`presets: []`) and tracking `activePresetId`.
4. Dispatching updated filter configurations down to active/inactive view components.
5. Debouncing user modifications and persisting updated filter payloads back to Salesforce.

### 2.2 View Adaptation Layer
Each view component receives the canonical filter object from `daAppShell` and applies view-specific predicates:
- **`daGraphViewer`:** Hides Cytoscape graph nodes and connected edges that fail filter criteria; updates neighborhood focus highlights.
- **`daMatrixViewer` (Proposed Stub):** Filters row/column dependency cells based on component layers and risk tiers.
- **`daFindingsViewer` (Proposed Stub):** Filters finding issue rows based on severity, status, and associated component tags.

---

## 3. Preset Schema Contract Options (DEC-W4-01)

### Option A: Enclosing Container Schema (Recommended)
Embed active filter state and preset collections into a single structured JSON object within `Filters_JSON__c`:

```json
{
  "version": 1,
  "activePresetId": "preset_high_risk_01",
  "activeFilters": {
    "search": "auth",
    "riskLevels": ["HIGH", "CRITICAL"],
    "nodeTypes": ["ApexClass", "LWC"],
    "layers": ["Controller", "Service"],
    "testStatus": "UNTESTED"
  },
  "presets": [
    {
      "id": "preset_high_risk_01",
      "name": "High Risk Apex Controllers",
      "isDefault": true,
      "createdAt": "2026-10-30T10:00:00Z",
      "filters": {
        "search": "auth",
        "riskLevels": ["HIGH", "CRITICAL"],
        "nodeTypes": ["ApexClass"],
        "layers": ["Controller"],
        "testStatus": "ALL"
      }
    }
  ]
}
```

- **Pros:** Completely backward-compatible with existing 131,072 character `Filters_JSON__c` field; single atomic read/write; zero Apex schema changes needed.
- **Cons:** Shared payload size grows with number of saved presets (though 20 presets take <10 KB of the 131 KB limit).

### Option B: Dedicated Custom Object `DA_Filter_Preset__c`
Create a separate Salesforce object with fields `Name__c`, `Criteria_JSON__c`, `Is_Default__c`, `User__c`, `Project__c`.

- **Pros:** Scalable to hundreds of presets per project.
- **Cons:** Requires metadata deployment (`sfdx force:source:deploy`), new permission sets, and new Apex controller methods (`DAFilterPresetController.cls`).

---

## 4. Cross-View Filter Evaluation Policy (DEC-W4-02)

1. **Strict Common Subset Policy (Recommended):**
   - Filters defined in `daAppShell` apply uniformly to all three views. Attribute fields that do not exist in a view (e.g., Matrix cell risk vs. Findings severity) are mapped via a well-defined field translation mapping or ignored gracefully.
2. **Independent View Filter Policy:**
   - Graph, Matrix, and Findings maintain completely decoupled filter sub-objects within `Filters_JSON__c` (`filters.graph`, `filters.matrix`, `filters.findings`).
   - **Risk:** Breaks seamless cross-view context synchronization when toggling view tabs in `daAppShell`.

---

## 5. Security & Isolation Boundaries

1. **Per-User & Per-Project Scoping:**
   - All filter preference queries and writes pass `Preference_Key__c = User__c + '_' + Project__c`.
   - No user can access or modify another user's filter presets.
2. **Apex Enforcement:**
   - All SOQL in `DAUserPreferenceController.cls` uses `WITH USER_MODE`.
   - Payload length bounds check (`131,072` chars) and `JSON.deserializeUntyped()` syntax checks prevent injection or memory exhaustion attacks.
