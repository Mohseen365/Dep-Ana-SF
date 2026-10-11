# REPOSITORY-WIDE AUDIT EVIDENCE INDEX (RECONCILED)

**Reconciliation Date:** 2026-10-11
**Repository Root:** `/app`
**Git Branch:** `jules-11371428744969324532-3de1dae2`
**Git Commit SHA:** `34b8915dea52fb3cd1c9633f3a953c72d73d639b`

---

## 1. Index of Executed Commands and Test Evidence

| Evidence Type | Command / Script | Result | Severity / Verdict | Key Assertions / Invariants Verified | Status Label |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E4 — Integration** | `npm run test:cli` | **PASS (31/31 suites)** | Informational | Snapshot, change gate, investigation eligibility, context minimizer, decision context, accounting, roles, layers, boundaries, safety envelope, quality gates | `FRESHLY_REPRODUCED` |
| **E4 — Integration** | `node scripts/test-multi-project.cjs` | **PASS (10/10 tests)** | Informational | Slugification, project-scoped contract output, browser asset auto-publishing, multi-project independence, source-specific export, default project backward compatibility, project switching URL consistency, stale report prevention, Food-App pipeline, non-destructive cleanup safety | `FRESHLY_REPRODUCED` |
| **E4 — Integration** | `node scripts/test-source-resolution.cjs` | **PASS (12/12 tests)** | Informational | Explorer source resolution, project flag parsing, case normalization, explicit source mismatch rejection, npm argument forwarding, root artifact protection | `FRESHLY_REPRODUCED` |
| **E4 — Integration** | `node scripts/test-pbim-dedicated-data-path.cjs` | **PASS (6/6 tests)** | Informational | PBIM slugification, dedicated `/pbim/explorer-data.json` artifact presence (528N / 2063E), project manifest registration, default vs PBIM payload isolation, manifest synchronization | `FRESHLY_REPRODUCED` |
| **E4 — Integration** | `node scripts/test-export-explorer.cjs` | **PASS (18 assertions)** | Informational | 12 validation invariants, edge source/target existence, node/edge type validity, risk levels, uncorrupted metrics, cycle node validity, unresolved reference distinction, code evidence preservation, determinism, AssetService graph equivalence, Tests A–E, and new Test F path containment safety | `FRESHLY_REPRODUCED` |
| **E3 — Focused** | Node Filesystem Inspection | **PASS (13 public, 4 source datasets)** | Informational | Computed SHA-256 hashes, node/edge counts, verified 0 duplicate node IDs, 0 broken edge endpoints across all 13 public datasets | `SOURCE_INSPECTED` |
| **E3 — Focused** | Cross-Project Isolation Verification | **PASS (Bit-for-Bit Identical)** | Informational | Verified PBIM, CST, and default dataset SHA-256 hashes remain bit-for-bit unchanged before and after multi-project exports | `FRESHLY_REPRODUCED` |
| **E5 — Browser** | `npx vite build` / Playwright | **BLOCKED** | Environmental | Vite/Playwright binaries unavailable in sandbox node_modules | `BLOCKED` |

---

## 2. Key Code Ranges and File References

- **Context Protocol & Policy:**
  - `CONTEXT-RETRIEVAL-PROTOCOL.md`: L93–L117 (Freshness, Authority & Stale-Context Rejection Policy)
  - `AGENT.md`: L1–L5, L67–L71 (Policy directive & canonical PBIM path)

- **Exporter Core Logic:** `scripts/export-explorer.cjs`
  - `isPathContained()`: L902–L908
  - `publishProjectToExplorerAssets()`: L910–L980
  - `updateManifestWithExplorerData()`: L985–L1040

- **Multi-Project Test Suite & Cleanup Safety:** `scripts/test-multi-project.cjs`
  - `SHARED_SNAPSHOT_FILES`: L27–37
  - `snapshotSharedFiles()` / `restoreSharedFiles()`: L41–58
  - `setupFixtures()` / `cleanupFixtures()`: L60–115
  - Regression Test 10 (Cleanup Safety Assertion): L283–293

- **Exporter Test Suite & Test F:** `scripts/test-export-explorer.cjs`
  - Test F (`isPathContained` regression suite): L511–L523

---

## 3. Deliverables Index

1. `REPOSITORY_WIDE_STALE_CONTEXT_LEDGER.md`
2. `audit-reports/REPOSITORY_WIDE_AUDIT_RECONCILIATION_REPORT.md`
3. `audit-reports/REPOSITORY_WIDE_PROJECT_VERIFICATION_MATRIX_RECONCILED.md`
4. `audit-reports/REPOSITORY_WIDE_PROJECT_INVENTORY_RECONCILED.json`
5. `audit-reports/REPOSITORY_WIDE_FIX_AND_REGRESSION_LOG_RECONCILED.md`
6. `audit-reports/REPOSITORY_WIDE_AUDIT_EVIDENCE_INDEX_RECONCILED.md` (this report)
