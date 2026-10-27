# Wave 2 Scope Reconciliation Changelog

## Summary of Reconciliation Corrections

This changelog documents all corrections made during the final Wave 2 scope reconciliation audit.

---

## Change Ledger

### 1. Parity Matrix CSV Formatting Correction
- **Previous Value:** `FEAT-DATA-01,Data Export (JSON, PNG, CSV),...` (Unquoted feature name containing commas).
- **New Value:** `FEAT-DATA-01,"Data Export (JSON, PNG, CSV)",...` (Double-quoted string field).
- **Reason:** Prevented column-shifting errors in CSV parsing.
- **Affected Artifacts:** `AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv`, `FULL_MIGRATION_PARITY_MATRIX.csv`.

### 2. NOT_STARTED Status Arithmetic Correction
- **Previous Value:** Text claimed 9 capabilities in `NOT_STARTED` while listing 10 names.
- **New Value:** Explicitly recorded as **10 capabilities** in `NOT_STARTED` (`FEAT-SHELL-04`, `FEAT-PANEL-01`..`07`, `FEAT-ADV-01`..`02`).
- **Reason:** Corrected inventory arithmetic to match actual CSV rows (10 + 3 + 5 + 4 + 10 = 32 total).
- **Affected Artifacts:** `AUTHORITATIVE_MIGRATION_EXECUTIVE_STATUS.md`, `MIGRATION_PLAN_RECONCILIATION_REPORT.md`.

### 3. SCAFFOLD_ONLY Status Arithmetic Correction
- **Previous Value:** Text claimed 5 capabilities in `SCAFFOLD_ONLY`.
- **New Value:** Explicitly recorded as **4 capabilities** in `SCAFFOLD_ONLY` (`FEAT-STATE-02`, `FEAT-PANEL-08`, `FEAT-DATA-02`, `FEAT-DATA-03`).
- **Reason:** Text had miscounted sub-objects as capabilities. Reconciled to feature IDs.
- **Affected Artifacts:** `AUTHORITATIVE_MIGRATION_EXECUTIVE_STATUS.md`.

### 4. Wave 2 Tranche Feature Manifest Scope Reconciliation
- **Previous Value:** Readiness Decision listed 4 proposed capabilities (`FEAT-SHELL-01`, `FEAT-SHELL-03`, `FEAT-STATE-02`, `FEAT-DATA-02`).
- **New Value:** Reconciled to **5 proposed capabilities** by adding `FEAT-SHELL-02` (Header & Status Banner).
- **Reason:** `FEAT-SHELL-02` was assigned to Wave 2 in the Wave Plan and Parity Matrix, and is required to complete the top-level application shell (`daAppShell`).
- **Affected Artifacts:** `WAVE_2_AUTHORITATIVE_FEATURE_MANIFEST.csv`, `WAVE_2_FINAL_READINESS_DECISION.md`, `WAVE_2_FINAL_SCOPE_RECONCILIATION_REPORT.md`.

### 5. Preference Feature Boundary Clarification
- **Previous Value:** Potential confusion between `FEAT-STATE-02` and `FEAT-DATA-03` both pointing to `DA_User_Preference__c`.
- **New Value:** `FEAT-STATE-02` assigned to Wave 2 (Graph ViewState and node coordinates); `FEAT-DATA-03` assigned to Wave 3 (General application settings and filter defaults).
- **Reason:** Distinct behavioral capabilities and scheduling.
- **Affected Artifacts:** `AUTHORITATIVE_MIGRATION_PARITY_MATRIX.csv`, `AUTHORITATIVE_MIGRATION_WAVE_PLAN.md`.
