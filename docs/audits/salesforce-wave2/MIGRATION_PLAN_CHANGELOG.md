# Migration Plan Changelog

**Reconciliation Date:** October 2026
**Reconciled Commit SHA:** `f5985ac74aa54b20ad9da86897f86e71ec2828d1`
**Superceded Snapshot SHA:** `cc1469d23f28193686488f7c2d21cd8eb464b421`

---

## 1. Summary of Reconciled Discrepancies

This changelog records all corrections, status updates, and structure changes made during the full migration plan reconciliation task.

---

## 2. Inventory & Feature Count Correction (42 vs 32)

- **Previous Claim:** "42 distinct functional capabilities across 8 core domain groups" (stated in `FULL_SALESFORCE_MIGRATION_INVENTORY.md` and `FULL_MIGRATION_EXECUTIVE_STATUS.md`).
- **Corrected Fact:** The canonical feature parity matrix (`FULL_MIGRATION_PARITY_MATRIX.csv`) defines exactly **32 unique, stable feature IDs**.
- **Root Cause:** Historical Markdown prose over-counted capabilities by listing sub-components (e.g. `KeyboardShortcutsModal.tsx`, `HotspotPanel.tsx`, `DiagnosticsPanel.tsx`) as independent features, whereas the canonical feature matrix consolidates sub-components into single functional units (`FEAT-SHELL-04`, `FEAT-PANEL-06`, `FEAT-SHELL-05`).
- **Action Taken:** Standardized all 7 migration deliverables to use the 32 canonical Feature IDs (`FEAT-SHELL-01..05`, `FEAT-STATE-01..03`, `FEAT-ANALYSIS-01..02`, `FEAT-APEX-01..03`, `FEAT-GRAPH-01..05`, `FEAT-PANEL-01..08`, `FEAT-ADV-01..03`, `FEAT-DATA-01..03`).

---

## 3. Status Classification Standardization

- **Previous Problem:** Single status fields mixed implementation completeness (`PARTIALLY_IMPLEMENTED`) with evidence strength (`OFFLINE_VERIFIED`), causing confusion regarding migration progress.
- **Action Taken:** Separated status into two distinct, orthogonal fields across all deliverables:
  1. **Implementation Status:** `IMPLEMENTED` (10), `APPROVED_EXTERNAL_SERVICE` (3), `PARTIALLY_IMPLEMENTED` (5), `SCAFFOLD_ONLY` (5), `NOT_STARTED` (9).
  2. **Verification Status:** `OFFLINE_TESTED` (22), `STATICALLY_INSPECTED` (1), `NOT_TESTED` (9), `ORG_VERIFIED` (0).

---

## 4. Test Metric Reconciliation

- **Previous Problem:** Contradictory reports claiming "34/34 root CLI files" vs "16/16 CLI tests".
- **Corrected Fact:**
  - `npm run test:cli` executes 16 registered CLI test runners, passing 360 assertions (100% pass rate). "34" referred to the total file count in the `scripts/` folder.
  - `node scratch/salesforce-poc/tests/run-poc-tests.cjs` executes 30 offline tests across 6 categories (100% pass rate).
  - `node scripts/test-export-explorer.cjs` executes 12 validation invariants + regression tests A-F (100% pass rate).
  - Explorer Vitest library unit tests pass 100% when run in targeted batches (e.g., `annotations.test.ts` 7/7 pass). Full un-targeted DOM suite times out in sandbox without explicit memory flags.

---

## 5. Wave 2 Readiness Declaration

- **Previous Status:** Proposed Wave 2 tranche pending reconciliation.
- **Updated Status:** Declared **`READY FOR USER AUTHORIZATION`**.
- **Verified Assets:** Verified presence of custom metadata (`DA_User_Preference__c`, `DA_Annotation__c`), Apex controllers (`DAGraphController.cls`), and offline test suites.
- **Rule Enforced:** No Wave 2 implementation code has been written or modified in this task.
