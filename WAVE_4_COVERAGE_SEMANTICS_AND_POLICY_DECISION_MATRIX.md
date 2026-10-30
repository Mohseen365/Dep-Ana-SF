# Wave 4 (`FEAT-STATE-03`): Coverage Semantics & Policy Decision Matrix

| Governance Attribute | Value |
|---|---|
| **Document Type** | Technical Coverage Semantics, Exporter Analysis & Policy Decision Matrix |
| **Target Feature** | Exporter Adapter & Wave 4 Filter Schema (`scripts/export-explorer.cjs`) |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-8132510048781945081-00416bfe` |
| **HEAD Commit SHA** | `250f56dfd26a4044387188e38ea85e0d976922f3` |
| **Audit Date** | March 2025 |
| **Status** | **ANALYSIS COMPLETE — PROPOSED CODE CORRECTION (R2) & UNRESOLVED POLICY MATRICES IDENTIFIED** |

---

## 1. Executive Summary & Missing-Value Invariant

An audit of the coverage normalization logic in `scripts/export-explorer.cjs` (line 330) reveals a violation of the system's core coverage contract.

### Mandatory Missing-Value Invariant
Across all exporter data transformations, UI filter schemas, and reporting views:
- `null` → **`UNKNOWN`**
- `undefined` → **`UNKNOWN`**
- Empty String `""` → **`UNKNOWN`**
- Absent status property → **`UNKNOWN`**

### Active Code Defect
In `scripts/export-explorer.cjs` line 331:
```javascript
function normalizeTestCoverageStatus(status) {
  if (!status) return "UNTESTED"; // DEFECT: Falsey/missing status mapped to UNTESTED!
  ...
  return "UNTESTED"; // DEFECT: Fallback mapped to UNTESTED!
}
```
Mapping missing coverage data to `"UNTESTED"` corrupts the data model by confusing components that were never analyzed (`UNKNOWN`) with components that were analyzed and confirmed to have 0 tests or 0% coverage (`UNTESTED`).

---

## 2. Deep-Dive Semantic Analysis of Raw Coverage Statuses

### A. `NO_TESTS`
- **Source Meaning:** Confirmed absence of tests for an analyzed component (e.g., static inspection verified zero `@isTest` classes or test methods reference this Apex class).
- **Codebase Finding:** Raw analyzer outputs assign `NO_TESTS` when AST resolution completes but finds zero incoming test references.
- **Proposed Mapping:** Preserved in node metadata as `"NO_TESTS"`, mapped to canonical UI state `"UNTESTED"`.

### B. `KNOWN_COVERAGE_FAILURE`
- **Source Meaning:** A test suite ran and explicitly reported a failure or coverage failure (e.g. class coverage below threshold).
- **Codebase Finding:** Represents a confirmed test execution result that failed assertion or threshold verification.
- **Proposed Mapping:** Mapped to canonical UI state `"UNTESTED"` (or distinct failure indicator in detailed node inspector), NOT `"AMBIGUOUS"`. Mapping to `"AMBIGUOUS"` is rejected because a failed test is a deterministic failure, not an uncertain relationship.

### C. `LIKELY_COVERED`
- **Source Meaning:** Static call-graph AST analysis identified test calls or method references to this component, but runtime execution coverage profiling was not run.
- **Codebase Finding:** `scripts/export-explorer.cjs` maps `LIKELY_COVERED` to `"COVERED"`.
- **Policy Question:** Static call-graph inference is NOT executed code coverage. However, in offline static analyzer exports, treating AST likelihood as `"COVERED"` is the current project convention.
- **Required Approval:** Product Owner and Lead Architect must explicitly decide whether static AST likelihood can be presented as `"COVERED"` in the UI or if it requires a separate `"LIKELY_COVERED"` canonical state.

### D. `AMBIGUOUS_TEST`
- **Source Meaning:** Indirect, generic, or dynamic references exist in tests (e.g., reflection, dynamic Apex `Type.forName()`, or multi-target test utilities) where static analysis cannot deterministically confirm that this specific component is exercised.
- **Proposed Mapping:** Retained as canonical state **`"AMBIGUOUS"`**.

---

## 3. Authoritative Coverage Semantics Mapping Matrix

| Raw Value | Actual Source Meaning | Proposed Canonical State | Verification Evidence (`scripts/export-explorer.cjs`) | Confidence | Required Human Decision Role |
|---|---|---|---|---|---|
| `null` | Absence of coverage data / unanalyzed | **`UNKNOWN`** | **DEVIATION:** Line 331 currently returns `"UNTESTED"`. Remediation R2 fixes this to `"UNKNOWN"`. | High | Lead Architect |
| `undefined` | Unset node attribute | **`UNKNOWN`** | **DEVIATION:** Line 331 currently returns `"UNTESTED"`. Remediation R2 fixes this to `"UNKNOWN"`. | High | Lead Architect |
| `""` (Empty String) | Blank string attribute | **`UNKNOWN`** | **DEVIATION:** Line 331 currently returns `"UNTESTED"`. Remediation R2 fixes this to `"UNKNOWN"`. | High | Lead Architect |
| Absent Key | Node missing `refactoringReadiness` | **`UNKNOWN`** | Verified: Line 622 `rawNode.refactoringReadiness?.testCoverageStatus` yields `undefined` -> `"UNKNOWN"`. | High | Lead Architect |
| `covered` / `likely-covered` | Executed coverage or AST call-graph reference | **`COVERED`** | Line 333: `if (s === "likely-covered" || s === "covered") return "COVERED";` | High | Product Owner & Lead Architect |
| `untested` / `known-coverage-failure` | Confirmed zero coverage or failed test run | **`UNTESTED`** | Line 334: `if (s === "known-coverage-failure" || s === "untested") return "UNTESTED";` | High | Lead Architect |
| `no-tests` / `no-test-evidence` | AST verified zero test references | **`NO_TESTS` / `UNTESTED`** | Line 335: `if (s === "no-tests" || s === "no-test-evidence") return "NO_TESTS";` | High | Lead Architect |
| `ambiguous-test` / `ambiguous` | Indirect/dynamic test relationship | **`AMBIGUOUS`** | Line 336: `if (s === "ambiguous-test" || s === "ambiguous") return "AMBIGUOUS";` | High | Lead Architect |

---

## 4. Separation of Policy Domains

1. **Facts Verified from Source:**
   - Exporter line 331 currently maps `null`/`undefined` to `"UNTESTED"`.
   - Exporter line 333 maps `likely-covered` to `"COVERED"`.
2. **Existing Project Policy:**
   - The UI filter bar contract supports four primary statuses: `COVERED`, `UNTESTED`, `AMBIGUOUS`, `UNKNOWN`.
3. **Proposed Policy (Remediation R2):**
   - Correct line 331 to enforce the missing-value invariant (`null` -> `"UNKNOWN"`).
4. **Unresolved Policy Questions for Human Approvers:**
   - Should `LIKELY_COVERED` remain mapped to `"COVERED"` for static offline exports? (Role: Lead Architect & Product Owner).

---

## 5. Corrected Code Implementation Specification (R2)

In `scripts/export-explorer.cjs`:

```javascript
function normalizeTestCoverageStatus(status) {
  if (status === null || status === undefined || String(status).trim() === "") {
    return "UNKNOWN";
  }
  const s = String(status).trim().toLowerCase().replace(/_/g, "-");
  if (s === "likely-covered" || s === "covered") return "COVERED";
  if (s === "known-coverage-failure" || s === "untested") return "UNTESTED";
  if (s === "no-tests" || s === "no-test-evidence") return "NO_TESTS";
  if (s === "ambiguous-test" || s === "ambiguous" || s === "ambiguous-tests") return "AMBIGUOUS";
  return "UNKNOWN";
}
```
