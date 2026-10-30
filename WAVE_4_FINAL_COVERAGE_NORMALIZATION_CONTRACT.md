# Wave 4 (`FEAT-STATE-03`): Final Coverage Normalization Contract

| Governance Attribute | Value |
|---|---|
| **Document Type** | Coverage Semantics Contract & Exporter Normalization Specification |
| **Target Feature** | Wave 4 — Remediation R2 & Exporter Coverage Pipeline (`scripts/export-explorer.cjs`) |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-11542301699362109650-b5a0782a` |
| **HEAD Commit SHA** | `8d9dc237611e0111122c3f3c1b0b0d16aae6ca2c` |
| **Audit Date** | March 2025 |
| **Status** | **SPECIFICATION COMPLETE — READY FOR HUMAN REVIEW** |

---

## 1. Context & Mandatory Missing-Value Invariant

In `scripts/export-explorer.cjs` line 331:
```javascript
function normalizeTestCoverageStatus(status) {
  if (!status) return "UNTESTED"; // DEFECT: Falsey/missing status mapped to UNTESTED!
  ...
}
```
This violates the repository's missing-value invariant by treating unanalyzed components (`UNKNOWN`) as confirmed zero-coverage components (`UNTESTED`).

### Mandatory Missing-Value Invariant
Across all exporter transformations, data adapters, and UI filter schemas:
- `null` → **`UNKNOWN`**
- `undefined` → **`UNKNOWN`**
- Empty string `""` → **`UNKNOWN`**
- Missing status property → **`UNKNOWN`**
- Malformed / unrecognized status string → **`UNKNOWN`**

---

## 2. Deterministic Raw-to-Canonical Signal Mapping Matrix

The table below provides the authoritative normalization contract mapping every raw adapter signal to its canonical UI result:

| Raw Signal | Source System / Meaning | Canonical UI Result | Contract Rationale | Confidence | Policy Decision Required? |
|---|---|---|---|---|---|
| `null` | Absence of test coverage data / component not analyzed | **`UNKNOWN`** | Preserves mandatory missing-value invariant | High | No (Defect Fix) |
| `undefined` | Unset node attribute in AST export | **`UNKNOWN`** | Preserves mandatory missing-value invariant | High | No (Defect Fix) |
| `""` (Empty String) | Blank status string in raw payload | **`UNKNOWN`** | Preserves mandatory missing-value invariant | High | No (Defect Fix) |
| Absent Property | Node missing `testCoverageStatus` key | **`UNKNOWN`** | Preserves mandatory missing-value invariant | High | No (Defect Fix) |
| `covered` / `passed` | Confirmed test execution pass under coverage profiling | **`COVERED`** | Confirmed runtime test coverage evidence | High | No |
| `likely-covered` / `likely_covered` | Static AST call-graph reference found in test class | **`COVERED`** | Static call-graph reference indicates test dependency | High | **YES (Policy Approval Required)** |
| `untested` / `failed` | Verified zero test coverage or execution failure | **`UNTESTED`** | Confirmed zero coverage or test run failure | High | No |
| `no-tests` / `no-test-evidence` | AST verified zero incoming test references | **`UNTESTED`** | Confirmed absence of test references | High | No |
| `known-coverage-failure` | Test execution completed but failed coverage threshold | **`UNTESTED`** | Coverage threshold breach is a deterministic zero-pass result | High | No |
| `ambiguous-test` / `ambiguous` | Dynamic or indirect test reference (e.g., `Type.forName()`) | **`AMBIGUOUS`** | Indeterminate test association requires user inspection | High | No |
| Any Unrecognized String | Malformed or unexpected status value | **`UNKNOWN`** | Safe fallback prevents invalid UI state | High | No |

---

## 3. Key Semantic Distinctions & Policy Decisions

1. **`COVERED` vs Static AST Inference (`LIKELY_COVERED`):**
   - Executed runtime test coverage evidence is distinct from static AST call-graph inferences.
   - For offline static exports (`scripts/export-explorer.cjs`), `likely-covered` is mapped to `"COVERED"`.
   - **Open Policy Question for Lead Architect & Product Owner:** Should `LIKELY_COVERED` be retained as mapped to `"COVERED"` in static exports, or should a distinct canonical UI state `LIKELY_COVERED` be introduced in a future release?
2. **`KNOWN_COVERAGE_FAILURE` Categorization:**
   - When a test suite executes but fails a coverage threshold or assertion, the result is deterministically mapped to `"UNTESTED"` rather than `"AMBIGUOUS"`. A failed test run represents unverified code coverage, not uncertain dynamic call graphs.

---

## 4. Corrected Exporter Code Implementation Specification (R2)

When Remediation R2 is authorized, `scripts/export-explorer.cjs` line 331 must be updated to:

```javascript
function normalizeTestCoverageStatus(status) {
  if (status === null || status === undefined || String(status).trim() === "") {
    return "UNKNOWN";
  }
  const s = String(status).trim().toLowerCase().replace(/_/g, "-");
  if (s === "likely-covered" || s === "covered" || s === "passed") return "COVERED";
  if (s === "known-coverage-failure" || s === "untested" || s === "failed") return "UNTESTED";
  if (s === "no-tests" || s === "no-test-evidence") return "UNTESTED";
  if (s === "ambiguous-test" || s === "ambiguous" || s === "ambiguous-tests") return "AMBIGUOUS";
  return "UNKNOWN";
}
```

---

## 5. Non-Implementation Confirmation

This document specifies the normalization contract and R2 code correction. No exporter scripts (`scripts/export-explorer.cjs`) or test suites were modified during this dispatch.
