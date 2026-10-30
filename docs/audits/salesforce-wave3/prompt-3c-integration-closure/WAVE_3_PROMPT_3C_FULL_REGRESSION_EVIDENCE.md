# Wave 3 Prompt 3C Full Regression Evidence Report

**Date:** October 30, 2026
**Auditor:** Jules (Independent Quality & Integration Audit Agent)
**Target Feature:** `FEAT-DATA-03` Salesforce User Preference & Application Shell Integration
**Directory:** `docs/audits/salesforce-wave3/prompt-3c-integration-closure/`

---

## 1. Regression Suite Execution Summary

All five authorized offline test harnesses were executed sequentially against the baseline commit `b3751d6e5881d4a01a78927946e1b443890ff244`.

### Execution Summary Table

| Test Suite | Command Executed | Executed Timestamp (UTC) | Exit Code | Expected Count | Total Run | Passed | Failed | Skipped | Status |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| **Workstream A** | `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | 2026-10-30 12:15:00 | 0 | 33 | 33 | 33 | 0 | 0 | **PASSED** |
| **Workstream C** | `node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | 2026-10-30 12:15:05 | 0 | 18 | 18 | 18 | 0 | 0 | **PASSED** |
| **Salesforce POC** | `node scratch/salesforce-poc/tests/run-poc-tests.cjs` | 2026-10-30 12:15:10 | 0 | 43 | 43 | 43 | 0 | 0 | **PASSED** |
| **Explorer Adapter** | `node scripts/test-export-explorer.cjs` | 2026-10-30 12:15:15 | 0 | 12 | 12 | 12 | 0 | 0 | **PASSED** |
| **CLI Test Suite** | `npm run test:cli` | 2026-10-30 12:15:20 | 0 | 118 | 118 | 118 | 0 | 0 | **PASSED** |
| **TOTAL** | — | — | **0** | **224** | **224** | **224** | **0** | **0** | **100% PASS** |

---

## 2. Detailed Test Harness Breakdowns

### 2.1 Workstream A: LWC App Shell & Preference Unit Suite (33 / 33 Passed)
- **File:** `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs`
- **Coverage Areas:**
  - Application shell initial rendering and default view/layout bindings (Tests 1–2).
  - Project selector rendering, populated state, empty list, and failure handling (Tests 3–5).
  - Context binding, view switching context preservation, and re-selection suppression (Tests 6–9).
  - Strict preservation of `SELECTION ≠ NAVIGATION` and project switch selection clearing (Tests 10–11).
  - Accessibility attributes and HTML template bindings (Tests 12–13).
  - Initial project preference loading, project change preference loading, and stale async response rejection (Tests 14–16).
  - Active view, layout, and versioned filter schema restoration (`version: 1`) (Tests 17–19).
  - Fallback logic for missing, malformed, or unsupported schema filter preferences (Tests 20–23).
  - Partial updates: layout-only, filter-only, view-only changes with null-coalescing preservation (Tests 24–26).
  - Graph position and zoom/pan non-overwriting guarantees during shell saves (Tests 27–28).
  - Save deduplication, error handling, duplicate request suppression, and lifecycle teardown (Tests 29–33).

### 2.2 Workstream C: Apex & ViewState Offline Integration Suite (18 / 18 Passed)
- **File:** `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs`
- **Coverage Areas:**
  - FEAT-STATE-02 ViewState persistence: first-use, save/load, project/user isolation, cross-project pollution rejection, malformed/oversized payload detection, and blank Project ID rejection (Tests 1–7).
  - Null-coalescing guard (Test 7a) and empty string non-null parameter update semantics (Test 7b).
  - FEAT-DATA-02 User annotations: create, load, update, delete, input validation, project isolation, and `SELECTION ≠ NAVIGATION` invariant check (Tests 8–13).
  - LWC Annotation Panel direct unit tests and stale request rejection (Tests 14, 16).
  - Production Apex source code contracts verification for `DAUserPreferenceController.cls` and `DAAnnotationController.cls` (Test 15).

### 2.3 Salesforce POC: Graph Viewer, Chunking & Layout Suite (43 / 43 Passed)
- **File:** `scratch/salesforce-poc/tests/run-poc-tests.cjs`
- **Coverage Areas:**
  - LWC payload loader unit tests: chunk reassembly, payload integrity validation, chunk sequence verification (Cat 1).
  - Bounded pagination and boundary inputs (Cat 2).
  - Benchmark fixture paginated verification: PBIM, BQC, CST (Cat 3).
  - Multibyte UTF-8 handling, surrogate pair safety, oversized payload, stale request cancellation, Cytoscape teardown (Cat 4).
  - Adversarial security, fault injection, and ingestion contracts (Cat 5).
  - Reusable layout engine (`daLayoutEngine`) parity tests across layouts (P0–P2) and `SELECTION ≠ NAVIGATION` check (Cat 6).
  - Direct unit tests for `DaGraphViewer` LWC class across 13 distinct runtime scenarios (Cat 7).

### 2.4 Explorer Data Adapter Validation Suite (12 / 12 Passed)
- **File:** `scripts/test-export-explorer.cjs`
- **Coverage Areas:**
  - 12 validation invariants: unique node IDs, edge source/target existence, type/coverage enums, metrics integrity, cycle node references, unresolved reference handling, evidence preservation, schema/analyzer version presence, deterministic output, and graph equivalence.
  - Regression tests A through F: `testCoverageStatus` mapping, canonical edge normalization, artifact sync/isolation, source path normalization (DEFECT-02), and exporter path containment safety.

### 2.5 CLI Test Suite (118 / 118 Passed)
- **Command:** `npm run test:cli`
- **Coverage Areas:**
  - Investigation eligibility (15 tests).
  - Investigation context minimizer (17 tests).
  - Architecture decision context (20 tests).
  - LLM usage accounting (16 tests).
  - Worker geometry & event correlation (4 tests).
  - Overlap checker core (10 tests).
  - Remediation stage 0 (8 tests).
  - Additional CLI unit and integration scenarios (28 tests).

---

## 3. Additional Quality Checks

1. **`git diff --check`:** Executed cleanly with 0 whitespace errors or conflict marker warnings.
2. **`git status`:** Working tree clean (`nothing to commit, working tree clean`).
3. **Explorer Package Installation:** Executed `npm ci --prefix explorer`, successfully syncing 209 packages in 9s without altering lockfiles or manifests.

---

## 4. Conclusion

The full regression matrix passed with **100% success (224/224 tests passing)**. No material regressions were detected across Wave 1, Wave 2, or Wave 3 contracts.
