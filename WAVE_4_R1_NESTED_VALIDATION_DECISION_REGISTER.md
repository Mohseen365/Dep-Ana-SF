# Wave 4 (`FEAT-STATE-03`): R1 Nested Validation Decision Register

| Governance Attribute | Value |
|---|---|
| **Document Type** | Layer 5 Nested Validation Analysis & Specification Gap Decision Register |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters & Presets Persistence (Remediation R1) |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-13015635749368501739-7bab4f95` |
| **HEAD Commit SHA** | `8bcdae35e7a4961d1517de8e40efac6b286d575a` |
| **Audit Date** | October 31, 2026 |
| **Status** | **R1 TOP-LEVEL CONTRACT DOCUMENTED — NESTED VALIDATION LAYER 5 INCOMPLETE — IMPLEMENTATION BLOCKED** |
| **Operational State** | **IMPLEMENTATION HOLD ACTIVE — NO IMPLEMENTATION PERMITTED** |

---

## 1. Six Validation Layers Status Breakdown

To provide total clarity on the boundaries of verification and implementation readiness, the Wave 4 payload validation stack is partitioned into six distinct architectural layers:

| Layer | Level / Scope | Current Repository Implementation State | Contract Specification State | Implementation Readiness Verdict |
|---|---|---|---|---|
| **Layer 1** | **JSON Syntax Validation** | **Implemented & Verified** in `DAUserPreferenceController.cls` lines 121–123 (`(Map<String, Object>) JSON.deserializeUntyped(...)`) and tested in `run-workstream-c-tests.cjs` Test 5. | Fully specified in R1 merge contract Step 1. | **COMPLETE** |
| **Layer 2** | **Top-Level Object Type Validation** | **Not Implemented** in Apex source (raw cast without instanceof/type check). | Fully specified in R1 merge contract Step 2 (reject lists/primitives). | **SPECIFIED — IMPLEMENTATION PENDING** |
| **Layer 3** | **Schema Version & Structure Recognition** | **Not Implemented** in Apex source (legacy v1 assumed). | Fully specified in R1 merge contract Steps 3–5 (`schemaVersion`, `presets`, `activeFilter`). | **SPECIFIED — IMPLEMENTATION PENDING** |
| **Layer 4** | **V2 Structural Validation** | **Not Implemented** in Apex source. | Fully specified in R1 merge contract Step 6 (`presets` must be List, `activeFilter` must be Map). | **SPECIFIED — IMPLEMENTATION PENDING** |
| **Layer 5** | **Field-Specific Nested Validation** | **Not Implemented** in Apex source. | **Incomplete Specification.** Preset items, criteria enum domains, UUID/timestamps, default uniqueness, and string lengths not formalized. | **SPECIFICATION GAP — IMPLEMENTATION BLOCKING** |
| **Layer 6** | **Persistence & Boundary Validation** | **Implemented & Verified** in `DAUserPreferenceController.cls` lines 61–69 (`payload.length() > 131072` check). Live Salesforce commit is **DEFERRED**. | Fully specified in R4 payload boundary contract. | **Apex Guard Complete / Live Acceptance Deferred** |

---

## 2. R1 Nested Validation Decision Register (Layer 5)

Independent source code inspection of `force-app` and `scratch/salesforce-poc` controllers, LWC components, and test harnesses confirms that **none** of the deep nested validation rules for presets or filter criteria are implemented in Apex. Furthermore, Layer 5 is explicitly classified as incomplete.

The table below catalogs every nested validation topic, contrasting existing source evidence against existing specifications, classifying the rule type, and identifying the required approver role:

| # | Rule / Field Topic | Exact Rule | Evidence Source | Exists in Implementation? | Rule Classification | Required Approver Role(s) | Implementation Blocked? | Further Product Clarification Needed? |
|---|---|---|---|---|---|---|---|---|
| **1** | **Preset Item Object Structure** | Each item in `presets` must be a JSON object (`Map<String, Object>`), non-null, non-primitive. | `WAVE_4_CANONICAL_V2_SCHEMA_AND_R1_MERGE_CONTRACT.md` Section 2.1 | **No** (Apex source does not iterate list) | Proposed Technical Validation Rule | **Lead Architect** | **YES** | No (pure structural constraint) |
| **2** | **Required Preset Properties** | Preset objects must contain `id`, `name`, `isDefault`, `createdAt`, `updatedAt`, `filters`. Optional: `description`. | Spec Section 2.1; LWC mock schemas | **No** (No property existence check in Apex) | Product-Behavior Decision | **Joint Lead Architect & Product Owner** | **YES** | **YES** (Determine fallback if optional fields omitted) |
| **3** | **Preset ID Format & Uniqueness** | Non-empty string (e.g. `preset_TIMESTAMP_UUID`), regex `^[a-zA-Z0-9_-]+$`, max 64 chars; unique within container. | Client mock generator in `daAppShell` | **No** (No ID check in Apex) | Proposed Technical Validation Rule | **Lead Architect** | **YES** | No (technical uniqueness constraint) |
| **4** | **Name & Description Constraints** | `name` non-empty String <= 255 chars; `description` String <= 1000 chars; HTML/script tags stripped/rejected. | Schema spec proposal | **No** (No string length check on fields in Apex) | Product-Behavior Decision | **Product Owner** | **YES** | **YES** (Prohibit empty names vs auto-generate default name) |
| **5** | **`isDefault` Type & Uniqueness** | Must be boolean literal; exactly 0 or 1 preset in `presets` array may have `isDefault: true`. | Schema spec Section 4.2 | **No** (No default checking in Apex) | Product-Behavior Decision | **Product Owner** | **YES** | **YES** (Conflict policy if client sends multiple defaults) |
| **6** | **Timestamp Format & Semantics** | ISO-8601 UTC string (`YYYY-MM-DDTHH:mm:ssZ`); valid calendar date; server timestamp precedence vs client. | Schema spec specimen | **No** (No timestamp validation in Apex) | Proposed Technical Validation Rule | **Lead Architect** | **YES** | No (standard technical datetime validation) |
| **7** | **`filters` Object Structure** | Non-null JSON object (`Map<String, Object>`) matching criteria structure. | Schema spec Section 2.1 | **No** (Apex does not inspect `filters`) | Proposed Technical Validation Rule | **Lead Architect** | **YES** | No (technical structural constraint) |
| **8** | **Criteria Property Structure** | `search` (String), arrays for multi-select facets (`riskLevels`, `nodeTypes`, `layers`), string for `testStatus`. | Schema spec Section 4.2 | **No** (Apex does not check criteria types) | Proposed Technical Validation Rule | **Lead Architect** | **YES** | **YES** (Coercion rule if single string passed where array expected) |
| **9** | **Enum Domains & Unknown Values** | Values restricted: `riskLevels` in [`HIGH`,`MEDIUM`,`LOW`], `findingsStatus` in [`OPEN`,`RESOLVED`,`SUPPRESSED`], etc. | Exporter / Adapter fixtures | **No** (Apex does not check enums) | Product-Behavior Decision | **Joint Lead Architect & Product Owner** | **YES** | **YES** (Fail-closed rejection vs stripping unknown enums) |
| **10** | **Optional & Extension Keys** | Deep nested extension keys in preset objects: define whether unknown properties are preserved or stripped. | Schema spec Section 4.2 | **No** (Apex untyped map preserves, but no contract exists) | Architecture / Product Contract Decision | **Joint Lead Architect & Product Owner** | **YES** | **YES** (Determine strict schema vs open extension keys) |
| **11** | **Field-Specific Size Boundaries** | Individual field memory limits (max preset count, max search string length, max array item count). | R4 payload contract | **No** (Only aggregate 131,072 char check exists in Apex) | Proposed Technical Validation Rule | **Lead Architect** | **YES** | **YES** (Upper bound on preset array size) |
| **12** | **Cross-Property Validation Rules** | Synchronizing `activePresetId` with presets array: if non-null, must match an existing preset ID; criteria sync. | Schema spec Section 5.1 | **No** (Apex does not cross-validate IDs) | Product-Behavior Decision | **Joint Lead Architect & Product Owner** | **YES** | **YES** (Behavior when `activePresetId` does not exist in `presets`) |

---

## 3. Mandatory Governance Conclusion

Layer 5 validation rules directly determine runtime system behavior, data integrity, and error reporting for both end users and calling components.

1. **No Invention of Business Rules:** Jules has strictly avoided inventing default rules, regex patterns, enum domains, or error recovery semantics. Unresolved requirements are explicitly marked as requiring human decisions.
2. **Implementation Hold Enforced:** Because Layer 5 remains incomplete and unapproved, **full Wave 4 implementation dispatch cannot be authorized**.
3. **Prerequisite Human Action:** The Lead Architect and Product Owner must formalize, review, and approve the 12 items in the decision register above before any Apex or LWC validation code is written.
