# Architecture Explorer — Current Repository Provenance Report

**Generated Date:** October 2026
**Repository Root:** `/app`
**Git Branch:** `jules-9314064933776358154-b7dbc7df`
**HEAD Commit SHA:** `08e83bb422cd7c03ddadcb93d2e6df84749aca0b`
**Working-Tree Status:** Clean prior to deliverable creation (`git status` verified)

---

## 1. Checkout Provenance and Historical Relationship

This checkout represents the canonical working baseline for the Architecture Explorer evidence-gated remediation task.

### Historical Provenance Comparison
| Report / Baseline | Git Branch | HEAD SHA | Status vs Current Checkout |
|---|---|---|---|
| Master Remediation / PBIM Discrepancy Report | `jules-8184527292476676089-68f34f6c` | `92029b7ac5a643ba7bf98690f43ff4d53789bcae` | Prior Historical SHA |
| Corrected Verification Matrix | `jules-5058169819641989774-00079a20` | `5872a8b4649984c6bb1dd0346695ed1d97ebcf72` | Prior Historical SHA |
| **Current Canonical Baseline** | `jules-9314064933776358154-b7dbc7df` | `08e83bb422cd7c03ddadcb93d2e6df84749aca0b` | **Active Source of Truth** |

**Note on Provenance:** The current checkout (`08e83bb422cd7c03ddadcb93d2e6df84749aca0b`) contains all previously merged source fixes, test suites, and data artifacts (including `explorer/public/pbim/explorer-data.json`). All claims in this remediation cycle are evaluated strictly against this current HEAD SHA.

---

## 2. Environment & Toolchain Capability Matrix

| Tool / Runtime | Command Evaluated | Status | Version / Error |
|---|---|---|---|
| **Node.js** | `node -v` | **AVAILABLE** | `v22.22.1` |
| **npm** | `npm -v` | **AVAILABLE** | `10.9.4` |
| **Git** | `git --version` | **AVAILABLE** | `git version 2.39.5` |
| **Node.js CLI Test Runner** | `node scripts/test-*.cjs` | **AVAILABLE** | Executes standard CommonJS assertions natively |
| **TypeScript Compiler (`tsc`)** | `npx tsc --noEmit` | **UNAVAILABLE** | Package `tsc`/`typescript` not installed in environment |
| **Vitest Test Runner** | `cd explorer && npx vitest run` | **UNAVAILABLE** | `explorer/node_modules` missing (`vitest/config` unresolved) |
| **Vite Bundler** | `npm run build` | **UNAVAILABLE** | `vite` binary missing in sandbox |
| **Playwright / Browser** | `npx playwright test` | **UNAVAILABLE** | Browser binaries and `playwright` package missing |

---

## 3. Canonical Ledger & Master Report Mapping

- **Canonical 41-Issue Inventory:** `ARCHITECTURE_EXPLORER_EXPANDED_HISTORICAL_ISSUE_INVENTORY.md`
- **Prior Matrix:** `ARCHITECTURE_EXPLORER_ISSUE_RESOLUTION_VERIFICATION_MATRIX_CORRECTED.md`
- **PBIM CLI Discrepancy Finding:** `ARCHITECTURE_EXPLORER_PBIM_CLI_TEST_DISCREPANCY_INVESTIGATION.md`
- **Current Provenance Report:** `ARCHITECTURE_EXPLORER_CURRENT_REPOSITORY_PROVENANCE.md` (This file)
- **Current Validation Matrix:** `ARCHITECTURE_EXPLORER_VALIDATION_MATRIX.md`
- **Master 41-Issue Closure Matrix:** `ARCHITECTURE_EXPLORER_MASTER_41_ISSUE_CLOSURE_MATRIX.md`
- **Final Readiness Report:** `ARCHITECTURE_EXPLORER_FINAL_READINESS_REPORT.md`

---

## 4. Governing Repository Protocols

All remediation work adheres strictly to:
1. `AGENTS.md` / `AGENT.md` — Context Retrieval Protocol & Navigation Map.
2. `CONTEXT-RETRIEVAL-PROTOCOL.md` — Freshness, Authority & Stale-Context Rejection Policy (10 Rules).
3. **Evidence-First Safety Directives:** Fix only demonstrated defects verified on HEAD; preserve existing user changes; perform no unauthorized dependency installations or environment modifications.
