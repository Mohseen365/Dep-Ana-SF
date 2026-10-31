# Wave 4 (`FEAT-STATE-03`): R1 Nested Validation Decision Register

| Governance Attribute | Value |
|---|---|
| **Document Type** | Layer 5 Nested Validation Analysis & Specification Gap Decision Register |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters & Presets Persistence (Remediation R1) |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-12874560060273924091-5d84f2b4` |
| **HEAD Commit SHA** | `921b8c54fb61b5b18a2e92f9821b6c8cfb1bd683` |
| **Audit Date** | October 31, 2026 |
| **Status** | **SPECIFICATION GAP IDENTIFIED — IMPLEMENTATION BLOCKING** |
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
| **Layer 5** | **Field-Specific Nested Validation** | **Not Implemented** in Apex source. | **Incomplete Specification.** Preset items, criteria enum domains, UUID/timestamps, and default uniqueness are not fully formalized. | **SPECIFICATION GAP — IMPLEMENTATION BLOCKING** |
| **Layer 6** | **Persistence & Boundary Validation** | **Implemented & Verified** in `DAUserPreferenceController.cls` lines 61–69 (`payload.length() > 131072` check). Live Salesforce commit is **DEFERRED**. | Fully specified in R4 payload boundary contract. | **Apex Guard Complete / Live Acceptance Deferred** |

---

## 2. R1 Nested Validation Decision Register (Layer 5)

Independent source code inspection of `force-app` and `scratch/salesforce-poc` controllers, LWC components, and test harnesses confirms that **none** of the deep nested validation rules for presets or filter criteria are implemented in Apex. Furthermore, the specification in `WAVE_4_CANONICAL_V2_SCHEMA_AND_R1_MERGE_CONTRACT.md` explicitly flags Layer 5 as incomplete.

The table below catalogs every nested validation topic, contrasting existing source evidence against existing specifications and recording the missing human decision and owner:

| Rule / Field Topic | Existing Source Evidence | Existing Specification | Missing Decision | Required Owner | Status |
|---|---|---|---|---|---|
| **1. Individual Preset Object Structure** | None. Apex does not inspect list items. LWC mock assumes valid object. | Section 4.2 states `presets` array items must be `Map<String, Object>` (no primitives/nulls). | Strictness of failure mode: reject entire save vs filter invalid items out. | Lead Architect | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |
| **2. Mandatory vs Optional Preset Properties** | None. No field existence checks in Apex. | Specifies `id`, `name`, `filters` mandatory; `description` optional; timestamps expected. | Exact required property set and fallback if optional fields omitted. | Product Owner & Lead Architect | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |
| **3. Preset ID Type, Format & Uniqueness** | None in Apex. Client generates string IDs. | Specifies non-empty string (e.g. `preset_TIMESTAMP_UUID`) and container uniqueness. | Regex format constraint, max ID length, and error handling for duplicate IDs. | Lead Architect | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |
| **4. Preset Name & Description Length/Sanitization** | None. No length checks on individual properties in Apex. | Recommends `name` <= 255 chars, `description` <= 1000 chars. | Exact length boundaries, empty name prohibition, and HTML/script sanitization. | Product Owner | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |
| **5. `isDefault` Boolean & Uniqueness Constraints** | None in Apex. | Specifies boolean literal; at most one preset may have `isDefault: true`. | Resolution policy if incoming payload contains multiple defaults (last-write-wins vs fail-closed). | Product Owner | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |
| **6. Timestamp Format & Validity** | None in Apex. | Specifies ISO-8601 UTC timestamp strings. | Server-side clock override vs accepting client timestamps; parse failure behavior. | Lead Architect | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |
| **7. `filters` Object Structure** | None in Apex. | Must be a JSON object (`Map<String, Object>`), non-null, matching `activeFilter`. | Whether `filters` object may be empty `{}` or must contain all key definitions. | Lead Architect | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |
| **8. Filter Criteria Value Types** | None in Apex. | Specifies `search` (String), arrays for facets, string for `testStatus`. | Type coercion rules (e.g., single string passed where array expected). | Lead Architect | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |
| **9. Allowed Enum Domains & Unknown Values** | None in Apex. Adapter uses 4-state vocabulary in JS only. | Lists `riskLevels` (`HIGH`,`MEDIUM`,`LOW`), `findingsStatus`, `findingsSeverity`. | Action on unknown enum: fail-closed rejection vs sanitization/stripping. | Lead Architect & Product Owner | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |
| **10. `testCoverageStatus` Validation** | JS adapter normalizes; Apex does not validate. | Must be array of canonical values (`COVERED`, `UNTESTED`, `AMBIGUOUS`, `UNKNOWN`). | Apex-level enforcement of canonical vocabulary vs relying solely on exporter/client. | Lead Architect | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |
| **11. Unknown Extension-Property Preservation** | Apex does not preserve unmapped keys. | Proposes unknown top-level extension properties should be preserved without mutation. | Deep extension property policy: allow arbitrary nested keys in presets vs strip. | Lead Architect | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |
| **12. Per-Field vs Aggregate Payload Length Rules** | Controller checks `payload.length() > 131072` on overall string. | Recommends 100,000 char client-side warning, 131,072 char Apex boundary. | Per-field memory bounds (e.g. max search query length, max presets count). | Lead Architect | `SPECIFICATION GAP — IMPLEMENTATION BLOCKING` |

---

## 3. Mandatory Governance Conclusion

Layer 5 validation rules directly determine runtime system behavior, data integrity, and error reporting for both end users and calling components.

1. **No Invention of Business Rules:** In accordance with dispatch directives, Jules has not invented default rules, regex patterns, enum domains, or error recovery semantics.
2. **Implementation Hold Enforced:** Because Layer 5 is incomplete, **full Wave 4 implementation dispatch cannot be authorized**.
3. **Prerequisite Human Action:** The Lead Architect and Product Owner must formalize and sign off on the 12 items in the decision register above before any Apex or LWC validation code is written.
