# Wave 4 (`FEAT-STATE-03`): Gap & Decision Register

**Audit Date:** October 30, 2026
**Auditor:** Jules (Independent Migration Auditor)

---

## 1. Prioritized Gap & Risk Register

| ID | Severity | Finding / Gap | Evidence | Impact | Required Resolution | Authority | Blocks Wave 4? |
|---|---|---|---|---|---|---|---|
| **GAP-W4-01** | **P1 (High)** | Multi-Preset Schema Contract Undefined | `daAppShell.js` handles v1 single active filter object | Potential payload structure mismatch between LWC preset panel & `Filters_JSON__c` | Approve Option A container schema in DEC-W4-01 | Product Owner | **YES (Before Dispatch)** |
| **GAP-W4-02** | **P1 (High)** | Cross-View Filter Mapping Rules Unspecified | No Matrix or Findings LWC exists in POC source | Inconsistent filtering behavior across tabs | Approve Strict Common Subset Mapping in DEC-W4-02 | Lead Architect | **YES (Before Dispatch)** |
| **GAP-W4-03** | **P1 (High)** | Scope Boundaries for Filter Presets (Global vs Project) | `DA_User_Preference__c` is strictly scoped per User + Project | Presets cannot be shared across projects without global flag | Approve Project-Scoped Default in DEC-W4-03 | Product Owner | **YES (Before Dispatch)** |
| **GAP-W4-04** | **P2 (Med)** | Missing Matrix & Findings LWC Test Fixtures | `scratch/salesforce-poc/force-app/main/default/lwc/` lacks Matrix/Findings components | Cannot run end-to-end multi-view integration tests in LWC | Author lightweight LWC adapters/stubs in Work Package 4.6/4.7 | Migration Lead | **NO (Resolved in WP)** |
| **GAP-W4-05** | **P3 (Low)** | Explorer Vitest Baseline Suite Discrepancies | 4 pre-existing Vitest mock DOM errors in `explorer/` | Non-blocking background noise during testing | Keep existing mock bypass flags intact | Auditor | **NO** |

---

## 2. Unresolved Owner Decisions Register

### Decision DEC-W4-01: Filter Preset JSON Storage Architecture
- **Question:** How should multiple saved filter presets be stored in Salesforce?
- **Options:**
  - **Option A (Recommended):** Store an array of preset objects inside `Filters_JSON__c` alongside `activePresetId` and `activeFilters`. Zero Salesforce metadata changes required.
  - **Option B:** Create a new custom object `DA_Filter_Preset__c` with master-detail/lookup relationships.
- **Recommendation:** **Option A**. The 131,072 character capacity of `Filters_JSON__c` easily holds up to ~50 named presets without schema migration overhead.

### Decision DEC-W4-02: Cross-View Filter Synchronization Policy
- **Question:** Should active filter criteria apply identically across Graph, Matrix, and Findings views, or should each view maintain isolated filters?
- **Options:**
  - **Option A (Recommended):** Strict Common Subset. A single active filter payload in `daAppShell` controls all three views simultaneously, ensuring seamless visual context switching.
  - **Option B:** Isolated Per-View Filters. Graph, Matrix, and Findings maintain distinct filter criteria sub-keys.
- **Recommendation:** **Option A**. Preserves user mental model when toggling tabs in `daAppShell`.

### Decision DEC-W4-03: Preset Ownership & Visibility Scoping
- **Question:** Should filter presets be strictly scoped to a specific project or available globally across all projects for a user?
- **Options:**
  - **Option A (Recommended):** Strictly Project-Scoped. Presets saved under Project A exist only within Project A's `DA_User_Preference__c` record.
  - **Option B:** User-Global Presets. Presets are stored in a global preference key (`User_Global`) and mapped across projects.
- **Recommendation:** **Option A**. Aligns with existing `Preference_Key__c` composite indexing (`User__c + Project__c`).
