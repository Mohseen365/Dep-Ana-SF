# DEC-W4-01: Filter Preset Storage Architecture

| Document Attribute | Value |
|---|---|
| **Decision ID** | `DEC-W4-01` |
| **Title** | Filter Preset Storage Architecture |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets & Matrix / Findings Integration |
| **Required Approver** | Product Owner |
| **Approval Status** | **APPROVED (OPTION A)** |
| **Approver Name** | Project Owner (Authorized Decision-Maker) |
| **Approval Date** | 31 October 2026 |
| **Governance Classification** | `EXPLICIT HUMAN AUTHORIZATION RECORDED IN REPOSITORY — CONVERSATION CONFIRMATION (31 OCTOBER 2026) — NOT CRYPTOGRAPHICALLY SIGNED` |

---

## 1. Decision Question

How should multiple named filter presets be persisted in Salesforce for the Architecture Dependency Analyzer?

---

## 2. Background & Evidence

During Wave 3 (`FEAT-DATA-03`), the Salesforce user preference architecture was established using the custom object `DA_User_Preference__c`. In this model:
- `DA_User_Preference__c` records are uniquely indexed by `Preference_Key__c` (a composite string consisting of `User__c + '_' + Project__c`).
- Active filter selections are stored as a JSON string in the `Filters_JSON__c` long text area field (capacity: **131,072 characters**).
- As delivered in Wave 3, `Filters_JSON__c` holds a single, unversioned active filter criteria object (referred to as **v1 active filter state**):
  ```json
  {
    "search": "",
    "riskLevels": ["HIGH", "MEDIUM", "LOW"],
    "nodeTypes": ["ApexClass", "LWC"],
    "layers": [],
    "testStatus": "ALL"
  }
  ```

Wave 4 (`FEAT-STATE-03`) introduces **Saved Named Filter Presets**, allowing users to save, switch between, modify, and delete multiple preset filter configurations. Before implementation dispatch, a formal architectural decision is required to select the persistence mechanism for these preset collections.

---

## 3. Evaluation of Options

### Option A: Enclosing Versioned JSON Container in Existing `Filters_JSON__c` (Recommended)

Store both active filter selections and saved preset definitions inside a versioned JSON container object residing entirely within the existing `Filters_JSON__c` long text area field on `DA_User_Preference__c`.

#### Key Structural Model
```json
{
  "schemaVersion": 2,
  "activePresetId": "preset_01",
  "activeFilter": {
    "search": "Service",
    "riskLevels": ["HIGH"],
    "nodeTypes": ["ApexClass"],
    "layers": ["Logic"],
    "testStatus": "UNTESTED"
  },
  "presets": [
    {
      "id": "preset_01",
      "name": "High Risk Untested Logic",
      "description": "Critical logic components requiring test coverage",
      "isDefault": true,
      "createdAt": "2026-10-30T10:00:00Z",
      "updatedAt": "2026-10-30T10:00:00Z",
      "filters": {
        "search": "Service",
        "riskLevels": ["HIGH"],
        "nodeTypes": ["ApexClass"],
        "layers": ["Logic"],
        "testStatus": "UNTESTED"
      }
    }
  ]
}
```

*(Note: Legacy draft schemas previously used `version` and `activeFilters`. The active canonical V2 schema strictly standardizes on `schemaVersion` and singular `activeFilter` per `WAVE_4_CANONICAL_V2_SCHEMA_AND_R1_MERGE_CONTRACT.md` Section 2).*

#### Detailed Evaluation Matrix Criteria

1. **Backward Compatibility:**
   - **High.** Upon reading `Filters_JSON__c`, the application shell (`daAppShell`) checks for the presence of a top-level `"schemaVersion"` property. If the payload lacks `"schemaVersion"` or is a plain active filter object, the system automatically migrates the payload in memory to a v2 container without loss of active filter state.
2. **Migration and Rollback:**
   - **Zero Schema Migration Overhead.** No Salesforce metadata changes (`.object-meta.xml`), deployment packages, or database migrations are required.
   - **Rollback Safety.** Rolling back LWC code to Wave 3 does not break Apex DML or database integrity; older LWCs will simply re-serialize active filter criteria into `Filters_JSON__c`.
3. **131,072-Character Field Limit Evaluation:**
   - Standard active filter payload size: ~350 characters.
   - Standard preset entry size: ~400 characters.
   - 20 rich presets occupy ~8,500 characters (< 6.5% of the 131,072 character limit).
   - Capacity comfortably accommodates up to ~250 presets per project per user.
4. **Maximum Payload & Boundary Handling:**
   - Authoritative boundary: The system accepts payloads up to **131,072 characters** and rejects payloads of **131,073 characters** fail-closed.
   - Client-side UX guidance: Soft warning thresholds (such as 50 presets or 100,000 characters) may notify users before approaching the hard 131,072 character limit.
5. **Concurrent Updates & Race Conditions:**
   - Leverages existing `DAUserPreferenceController.savePreference()` Apex controller, which executes single-record upsert guarded by FLS and `WITH USER_MODE`.
   - In-flight request token guards (`_preferenceRequestId`) prevent out-of-order asynchronous responses from overwriting newer user changes.
6. **Atomicity:**
   - **100% Atomic.** Active filters and preset definitions are saved in a single database operation on `DA_User_Preference__c`, eliminating partial-save or orphan-preset states.
7. **Preset CRUD Operations:**
   - Performed purely via client-side array manipulation inside `daAppShell.js` and persisted via the existing Apex save method.
8. **Ownership & Access Control:**
   - Enforces strict user and project isolation inherent in `DA_User_Preference__c` (SOQL `WITH USER_MODE` and key composite `User__c + Project__c`).
9. **Schema Evolution:**
   - Future filter fields (e.g., tags, date ranges) are added as optional JSON attributes in future version containers (`schemaVersion: 3`) with forward-compatible default fallbacks.
10. **Data Retention & Deletion:**
    - Cascades automatically when a user preference record is deleted or when an org user/project is purged.
11. **Testability:**
    - Fully testable in offline Node.js simulators (`run-workstream-a-tests.cjs` and `run-poc-tests.cjs`) without requiring live Salesforce org metadata deployments.
12. **Future Scalability:**
    - Excellent for individual user/project workspace needs.

---

### Option B: Dedicated `DA_Filter_Preset__c` Custom Object

Create a new custom object (`DA_Filter_Preset__c`) with master-detail or lookup relationship to `DA_User_Preference__c` (or direct lookup to `User` and `Project__c`), containing dedicated custom fields (`Name__c`, `Description__c`, `Is_Default__c`, `Criteria_JSON__c`).

#### Evaluation against Criteria
- **Backward Compatibility:** Requires migrating existing `Filters_JSON__c` records via batch Apex or data scripts.
- **Migration and Rollback:** Requires Salesforce metadata deployment (`CustomObject`, `CustomFields`, `PermissionSets`, `ApexClass`, `ApexTest`). Rollback requires metadata deletion.
- **Field Limits:** Bypasses single-field limits, but introduces SOQL query limits (100 SOQL queries / transaction) and row limits.
- **Atomicity:** Saving active filters and presets requires multi-object DML transactions or multiple Apex server roundtrips, raising orphan record risk if a write fails.
- **Ownership & Access:** Requires configuring Sharing Rules, FLS, and CRUD permissions for the new custom object across all user profiles.
- **Testability:** Offline testing requires expanding complex in-memory Apex ORM simulators.

---

## 4. Architectural Recommendation

**RECOMMENDATION: OPTION A (Enclosing Versioned JSON Container).**

Option A provides maximum safety, zero metadata deployment overhead, 100% atomic persistence, and full compatibility with existing Wave 3 Apex controllers and offline test harnesses.

---

## 5. Explicit Specification for Option A

If Option A is approved by the Product Owner, implementation must strictly comply with the following specification:

### 5.1 JSON Contract Specification (v2 Schema)

```typescript
interface FilterCriteriaV1 {
  search: string;              // Required: Search query string (default "")
  riskLevels: string[];        // Required: Array of risk levels e.g. ["HIGH", "MEDIUM", "LOW"]
  nodeTypes: string[];         // Required: Array of metadata node types e.g. ["ApexClass", "LWC"]
  layers: string[];            // Required: Array of component layers e.g. ["Controller", "Service"]
  testStatus: string;          // Required: e.g. "ALL" | "COVERED" | "UNTESTED" | "NO_TESTS" | "AMBIGUOUS"
  findingsSeverity?: string[]; // Optional: e.g. ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
  findingsStatus?: string[];   // Optional: e.g. ["OPEN", "RESOLVED", "WAIVED"]
}

interface FilterPreset {
  id: string;                  // Required: Unique string ID e.g. "preset_1730280000000_a1b2"
  name: string;                // Required: Non-empty user-defined name (max 80 chars)
  description?: string;        // Optional: User description (max 255 chars)
  isDefault?: boolean;         // Optional: Indicates if this is the project default preset
  createdAt: string;           // Required: ISO-8601 timestamp string
  updatedAt: string;           // Required: ISO-8601 timestamp string
  filters: FilterCriteriaV1;   // Required: Complete filter criteria object
}

interface PresetContainerV2 {
  schemaVersion: 2;            // Required: Integer literal 2
  activePresetId: string | null; // Required: ID of active preset or null if ad-hoc custom filters active
  activeFilter: FilterCriteriaV1; // Required: Currently applied filter criteria
  presets: FilterPreset[];     // Required: Array of saved presets (max 50)
}
```

### 5.2 Required Behavior Rules

1. **Legacy v1 Migration Behavior:**
   - If `Filters_JSON__c` contains a valid JSON object lacking top-level `"schemaVersion"` or lacking `"presets"`, `daAppShell` converts it into a `PresetContainerV2`:
     - Sets `schemaVersion = 2`.
     - Sets `activePresetId = null`.
     - Sets `activeFilter = <parsed v1 object or mapped legacy activeFilters>`.
     - Sets `presets = []`.
2. **Malformed Data Fallback:**
   - If `Filters_JSON__c` contains invalid JSON, empty string, or `null`, `daAppShell` falls back to system defaults (`schemaVersion: 2`, `activePresetId: null`, standard default `activeFilter`, `presets: []`) without throwing uncaught UI exceptions.
3. **Unknown Version Behavior:**
   - If `schemaVersion > 2` is encountered (e.g. from future releases), `daAppShell` safely parses known fields (`activeFilter`, `presets`) and preserves unrecognized top-level key-value pairs upon re-serialization.
4. **Duplicate Preset ID Handling:**
   - Preset IDs must be generated using `preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`.
   - If duplicate preset IDs are detected during parsing, the system re-indexes duplicate entries with fresh unique IDs.
5. **Duplicate Preset Name Behavior:**
   - Duplicate preset names are permitted but discouraged in the UI. When saving a preset with an existing name, the UI prompts the user to either "Overwrite existing preset" or "Save as new preset (append number e.g. 'My Preset (1)')".
6. **Empty Preset Collection Behavior:**
   - An empty `presets: []` array is valid and represents a workspace with custom active filters but no saved presets.
7. **Payload Boundary Behavior:**
   - Authoritative field capacity accepted by persistence: **131,072 characters** (131,073 rejected).
   - Recommended client soft warning threshold: **50 presets** or **100,000 characters**.
   - If a user approaches limits or exceeds 131,072 characters, the UI displays an explicit error/warning: `"Preset storage limit reached. Please remove unused presets before saving new ones."`

---

## 6. Consequences of Approval

- **Implementation Path:** Work Packages WP 4.1 (`daAppShell.js` schema manager) and WP 4.2 (`DAUserPreferenceController.cls` verification) will execute using Option A container format.
- **Database / Metadata Impact:** Zero database schema changes required in Salesforce orgs.
- **Test Suite Impact:** Tests TEST-W4-01 through TEST-W4-04 in `run-workstream-a-tests.cjs` will validate Option A serialization, migration, and boundary handling.

---

## 7. Approval Block

| Role | Name | Status | Decision & Date |
|---|---|---|---|
| **Product Owner** | Project Owner (Authorized Decision-Maker) | **APPROVED (OPTION A)** | Explicit Owner Approval via Project Conversation / 31 October 2026 |

*Provenance Note: Approved by the Project Owner in the project conversation on 31 October 2026 ("I APPROVE ALL EIGHT WAVE 4 ITEMS AS WRITTEN"). Conversation confirmation; not an independently authenticated cryptographic signature.*
