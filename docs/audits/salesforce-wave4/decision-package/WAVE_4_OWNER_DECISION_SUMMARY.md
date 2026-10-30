# Wave 4 (`FEAT-STATE-03`): Owner Decision Summary

| Document Attribute | Value |
|---|---|
| **Document Type** | Executive Decision Summary Package |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets & Matrix / Findings Integration |
| **Target Repository Branch** | `jules-7221768199511345373-8ac36ed1` |
| **HEAD Commit SHA** | `32c60cb8855699a86dbd0838ea83e3a57984ba48` |
| **Overall Decision Package Status** | **PENDING OWNER APPROVAL** |
| **Governance Classification** | `APPROVAL RECORDED IN REPOSITORY — UNDERLYING HUMAN PROVENANCE NOT INDEPENDENTLY VERIFIED` |

---

## Executive Summary

This document summarizes the **four core architectural and product-scope decisions** prepared for owner review prior to authorizing the implementation dispatch for **Wave 4 (`FEAT-STATE-03`)**.

All four decision documents have been prepared based on authoritative evidence in the repository, existing Salesforce POC LWC/Apex implementations, and Wave 3 closure audit benchmarks.

---

## Summary of Prepared Decisions

| Decision ID | Decision Title | Question | Options | Evaluated Recommendation | Required Approver | Current Status |
|---|---|---|---|---|---|---|
| **`DEC-W4-01`** | Preset Storage Architecture | How should multiple named filter presets be persisted in Salesforce? | **Option A:** Enclosing versioned JSON container in `Filters_JSON__c`<br>**Option B:** Dedicated `DA_Filter_Preset__c` custom object | **Option A** (Versioned v2 JSON Container in `Filters_JSON__c`) | Product Owner | **PENDING** |
| **`DEC-W4-02`** | Cross-View Filter Semantics | How should shared filter criteria behave across Graph, Matrix, and Findings? | **Option A:** Shared canonical filter model with strict common semantics<br>**Option B:** Independent per-view filter configurations | **Option A** (Shared Canonical Model with View Mapping Table) | Lead Architect | **PENDING** |
| **`DEC-W4-03`** | Preset Ownership and Scope | Should presets be strictly project-scoped or user-global? | **Option A:** Strict project-scoped presets<br>**Option B:** User-global presets | **Option A** (Strict Project-Scoped via `Preference_Key__c`) | Product Owner | **PENDING** |
| **`DEC-W4-04`** | Matrix & Findings Implementation Scope | What is the required LWC implementation scope for Matrix and Findings in Wave 4? | **Option A:** Full Parity LWCs<br>**Option B:** Shared-filter Stubs Only<br>**Option C:** Minimal Functional Views | **Option C** (Minimal Functional Views with defined limitations) | Product Owner | **PENDING** |

---

## Consolidated Recommendations Matrix

### 1. Preset Storage Architecture (`DEC-W4-01`)
- **Recommendation:** **Option A (Enclosing Container Schema)**.
- **Rationale:** Leverages existing 131,072 character `Filters_JSON__c` field on `DA_User_Preference__c`. Zero database schema changes required. 100% atomic writes. Accommodates up to 50 saved presets (~8.5 KB payload size). Full backward compatibility with v1 active filters.

### 2. Cross-View Filter Semantics (`DEC-W4-02`)
- **Recommendation:** **Option A (Shared Canonical Filter Model)**.
- **Rationale:** Single source of truth in `daAppShell`. Preserves visual context when switching between Graph, Matrix, and Findings tabs. View adapters map canonical criteria to local data models and ignore unsupported fields gracefully.

### 3. Preset Ownership and Scope (`DEC-W4-03`)
- **Recommendation:** **Option A (Strict Project-Scoped Presets)**.
- **Rationale:** Aligns with Wave 3 composite preference indexing (`User__c + Project__c`). Prevents cross-project filter leakage and "dead" preset selections.

### 4. Matrix and Findings Implementation Scope (`DEC-W4-04`)
- **Recommendation:** **Option C (Minimal Functional Views)**.
- **Rationale:** Delivers genuine user value (SLDS component interaction grid for Matrix, Lightning Datatable for Findings) using existing graph analytics payloads without adding new Salesforce custom objects or delaying Wave 4 execution.

---

## Action Required for Implementation Authorization

Wave 4 implementation dispatch remains **BLOCKED**.

To unblock implementation:
1. **Product Owner** must sign `DEC_W4_01_PRESET_STORAGE_ARCHITECTURE.md`.
2. **Lead Architect** must sign `DEC_W4_02_CROSS_VIEW_FILTER_SEMANTICS.md`.
3. **Product Owner** must sign `DEC_W4_03_PRESET_OWNERSHIP_SCOPE.md`.
4. **Product Owner** must sign `DEC_W4_04_MATRIX_FINDINGS_PRODUCT_SCOPE.md`.
5. The **Implementation Authorization Gate** (`WAVE_4_IMPLEMENTATION_AUTHORIZATION_GATE.md`) must be executed.

---

## Approval Status Table

| Role | Approver Name | Decision ID | Approval Status | Date |
|---|---|---|---|---|
| **Product Owner** | _______________________ | `DEC-W4-01` | **PENDING** | _____________ |
| **Lead Architect** | _______________________ | `DEC-W4-02` | **PENDING** | _____________ |
| **Product Owner** | _______________________ | `DEC-W4-03` | **PENDING** | _____________ |
| **Product Owner** | _______________________ | `DEC-W4-04` | **PENDING** | _____________ |
