# REPOSITORY-WIDE AUDIT EVIDENCE INDEX

**Audit Date:** 2026-10-10
**Repository:** `context-analyzer-graph`
**Git Commit:** `b2bc9a57a9fe1b9c4e00f75df81a1bd2a2fdc3e7`

---

## 1. Index of Executed Commands and Test Evidence

| Evidence Type | Command / Script | Result | Severity / Verdict | Key Assertions / Invariants Verified |
| :--- | :--- | :--- | :--- | :--- |
| **E4 — Integration** | `npm run test:cli` | **PASS (31/31 suites)** | Informational | Architecture snapshot, change gate, investigation eligibility, context minimizer, decision context, LLM usage accounting, roles, layers, boundaries, safety envelope, quality gates |
| **E4 — Integration** | `node scripts/test-multi-project.cjs` | **PASS (9/9 tests)** | Informational | Project slugification, project-scoped contract output, browser asset auto-publishing, multi-project independence, source-specific export, default project backward compatibility, project switching URL consistency, stale report prevention, Food-App pipeline |
| **E4 — Integration** | `node scripts/test-source-resolution.cjs` | **PASS (11/11 tests)** | Informational | Explorer source resolution, project flag parsing, case normalization, explicit source mismatch rejection, npm argument forwarding, root artifact protection |
| **E4 — Integration** | `node scripts/test-pbim-dedicated-data-path.cjs` | **PASS (6/6 tests)** | Informational | PBIM slugification, dedicated `/pbim/explorer-data.json` artifact presence (528N / 2063E), project manifest registration, default vs PBIM payload isolation, manifest synchronization |
| **E4 — Integration** | `node scripts/test-export-explorer.cjs` | **PASS (12/12 invariants)** | Informational | Unique stable node IDs, edge source/target existence, node/edge type validity, risk levels, uncorrupted metrics, cycle node validity, unresolved reference distinction, code evidence preservation, determinism, AssetService graph equivalence |
| **E3 — Focused** | `node -e "..."` (Artifact Integrity Check) | **PASS (13 datasets)** | Informational | Computed SHA-256 hashes, node/edge counts, verified 0 duplicate node IDs, 0 broken edge endpoints across all 13 public datasets |
| **E3 — Focused** | `node -e "..."` (Cross-Project Isolation) | **PASS (Bit-for-Bit Identical)** | Informational | Verified PBIM, CST, and default dataset SHA-256 hashes remain bit-for-bit unchanged before and after multi-project exports |
| **E5 — Browser** | `npx vite build` / Playwright | **BLOCKED** | Environmental | Vite/Playwright binaries unavailable in sandbox node_modules |

---

## 2. Key Code Ranges and File References

- **Exporter Core Logic:** `scripts/export-explorer.cjs`
  - `slugify()`: L18–25
  - `parseArgs()`: L27–120
  - `isSameSource()`: L122–128
  - `resolveInputFile()`: L138–190
  - `normalizeSourcePath()`: L198–238
  - `exportExplorerData()`: L365–580
  - `publishProjectToExplorerAssets()`: L590–680
  - `updateManifestWithExplorerData()`: L685–740

- **Multi-Project Test Suite:** `scripts/test-multi-project.cjs`
  - `TEST_ANALYZE_DIR`: L22 (`path.join(__dirname, "../analyze/temp-multi-project-analyze")`)
  - `setupFixtures()`: L25–60
  - `cleanupFixtures()`: L62–82
  - `runMultiProjectTests()`: L84–250

- **PBIM Dedicated Data Path Suite:** `scripts/test-pbim-dedicated-data-path.cjs`
  - PBIM artifact checks: L40–120

- **CLI Forwarding & Source Resolution:** `scripts/test-source-resolution.cjs`
  - Source resolution regression tests: L1–180

---

## 3. Deliverables Index

1. `audit-reports/REPOSITORY_WIDE_PROJECT_AND_ARTIFACT_AUDIT_REPORT.md`
2. `audit-reports/REPOSITORY_WIDE_PROJECT_VERIFICATION_MATRIX.md`
3. `audit-reports/REPOSITORY_WIDE_FIX_AND_REGRESSION_LOG.md`
4. `audit-reports/REPOSITORY_WIDE_PROJECT_INVENTORY.json`
5. `audit-reports/REPOSITORY_WIDE_AUDIT_EVIDENCE_INDEX.md` (this report)
