# Architecture Explorer — PBIM CLI Test Discrepancy Investigation Report

**Prepared:** October 2026
**Repository Root:** `/app`
**Branch:** `jules-8184527292476676089-68f34f6c`
**HEAD SHA:** `92029b7ac5a643ba7bf98690f43ff4d53789bcae`
**Initial Git Baseline:** Clean working tree (except for pre-existing reports)
**Investigation Scope:** Targeted CLI Test Discrepancy between Master Remediation Report claims and external `dependency-analyzer.zip` snapshot observation.

---

## 1. Executive Conclusion

The reported failure of `scripts/test-pbim-dedicated-data-path.cjs` due to a missing `explorer/public/pbim/explorer-data.json` dataset path is classified as a **Packaging or Archive Omission in the external snapshot zip (`dependency-analyzer.zip`)**.

In the current canonical checkout `/app` (HEAD SHA `92029b7ac5a643ba7bf98690f43ff4d53789bcae`):
1. The expected dataset file `explorer/public/pbim/explorer-data.json` exists, is non-empty (4.25 MB, 528 nodes / 2,063 edges), and is actively tracked in Git (`git ls-files` confirmed).
2. The dedicated test suite `node scripts/test-pbim-dedicated-data-path.cjs` executes and **passes 6/6 tests**.
3. `npm run test:worker-geometry` executes and **passes 4/4 categories**.
4. `npm run test:cli` executes and **passes 31/31 integration scripts** with 184 assertions.

The 31/31 passing CLI claim made in the master remediation report is **100% verified and reproducible** in the current repository checkout.

---

## 2. Actual Checkout Identity & Relationship to Master Report

- **Checkout Root:** `/app`
- **Git Branch:** `jules-8184527292476676089-68f34f6c`
- **HEAD SHA:** `92029b7ac5a643ba7bf98690f43ff4d53789bcae`
- **Git Tracking Status:** `explorer/public/pbim/explorer-data.json` is tracked in Git commit `92029b7ac5a643ba7bf98690f43ff4d53789bcae`.

The master remediation report was generated against this exact same HEAD SHA (`92029b7ac5a643ba7bf98690f43ff4d53789bcae`) and branch (`jules-8184527292476676089-68f34f6c`). The current checkout matches the master report provenance identically.

---

## 3. Test Expectation vs File Path Reality

### Test Expectation (`scripts/test-pbim-dedicated-data-path.cjs` L20-29)
The dedicated test asserts that the PBIM artifact exists specifically at `explorer/public/pbim/explorer-data.json`:
```javascript
const pbimPublicPath = path.join(PUBLIC_DIR, 'pbim', 'explorer-data.json');
assert.ok(fs.existsSync(pbimPublicPath), 'explorer/public/pbim/explorer-data.json must exist');
```

### File System Truth in `/app`
All three relevant PBIM data paths exist, contain identical 528-node / 2063-edge datasets, and are fully tracked in Git:
- `explorer/public/pbim/explorer-data.json` (Tracked in Git, 4,253,560 bytes)
- `explorer/public/projects/pbim/explorer-data.json` (Tracked in Git, 4,253,560 bytes)
- `analyze/projects/pbim/explorer-data.json` (Tracked in Git, 4,253,560 bytes)

---

## 4. Production/Runtime Path Resolution Contract

The application and exporter contracts require `/pbim/explorer-data.json` as the dedicated public static path for explicit `?project=pbim` loading:
- `explorer/public/project-manifest.json` maps `pbim` to `analysisPath: "/pbim/explorer-data.json"`.
- `scripts/export-explorer.cjs` slugifies `pbim` and exports dedicated project data to `explorer/public/pbim/explorer-data.json`.
- `ProjectContext.tsx` fetches `/pbim/explorer-data.json` when `?project=pbim` is specified in the URL.

The path `explorer/public/pbim/explorer-data.json` is the **authoritative public production dataset artifact**.

---

## 5. Root Cause Classification

**Classification:** **Packaging or Archive Omission (External Zip Artifact)**

**Evidence:**
1. In the current Git repository at `/app`, `explorer/public/pbim/explorer-data.json` is present and committed.
2. In the uploaded zip archive `dependency-analyzer.zip`, the directory `explorer/public/pbim/` was omitted or excluded during archive creation, while `explorer/public/projects/pbim/` was preserved.
3. Because the Git repository `/app` retains `explorer/public/pbim/explorer-data.json`, all test suites pass natively in the repository without requiring any code, test, or dataset mutations.

---

## 6. Test Execution Log

| Command | Working Directory | Exit Code | Result |
|---|---|---|---|
| `node scripts/test-pbim-dedicated-data-path.cjs` | `/app` | 0 | **PASS (6/6 tests)** |
| `npm run test:worker-geometry` | `/app` | 0 | **PASS (4/4 categories)** |
| `npm run test:cli` | `/app` | 0 | **PASS (31/31 scripts, 184 assertions)** |
| `npx vitest run` | `/app` | 1 | **BLOCKED** (`explorer/node_modules` missing) |
| `npx tsc --noEmit` | `/app` | 127 | **UNEXECUTED** (`tsc` binary uninstalled) |

---

## 7. Minimal Proposed Patch Plan (Not Applied)

No code, manifest, test, or dataset changes are necessary in `/app` because all tests pass cleanly in the repository.

If zip archiving tools/scripts are updated in the future:
- Ensure archive packaging scripts include all subdirectories under `explorer/public/`, specifically `explorer/public/pbim/`.

---

## 8. Effect on Canonical 41-Issue Matrix & Readiness Verdict

- **Canonical 41-Issue Ledger (A1–G5):** Unchanged.
- **Master Readiness Verdict:** Retained as **`PASS WITH LIMITATIONS`**.
- The 31/31 CLI test pass status claimed in the master report is fully confirmed and verified in `/app`.

---

## 9. Single Next Action Required

Ensure any future repository packaging or distribution scripts preserve all tracked git files under `explorer/public/pbim/` when building release archives. No further code changes are required for the repository checkout.
