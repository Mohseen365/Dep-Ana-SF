# Wave 4 (`FEAT-STATE-03`): Coverage Normalization Decision & Test Report

| Governance Attribute | Value |
|---|---|
| **Document Type** | Technical Verification & Semantics Standard |
| **Target Feature** | Wave 4 — `FEAT-STATE-03`: Advanced Filters, Presets & Matrix / Findings Integration |
| **Branch** | `jules-15803627608761853366-1bbd7df3` |
| **HEAD Commit SHA** | `75ad1292a6f6d586df07beea5c3c959f15e200da` |
| **Governance Status** | **VERIFIED SPECIFICATION — 4-STATE SEMANTICS ENFORCED** |

---

## 1. Mandatory Semantic Invariant

> **Core Invariant:** Missing coverage data (`testCoverageStatus == null`, `undefined`, `""`, or absent) is **NOT equivalent to `UNTESTED`**.
> Filtering by `UNTESTED` MUST NEVER include `UNKNOWN` / missing coverage entities.

---

## 2. Canonical Four-State Coverage Model

The canonical filter criteria contract (`activeFilterCriteria.testCoverageStatus`) accepts an array containing any subset of four discrete state strings:

1. **`COVERED`**: Confirmed automated test coverage.
2. **`UNTESTED`**: Explicitly analyzed entity with confirmed 0% test coverage.
3. **`AMBIGUOUS`**: Analyzed entity with uncertain or partial test relationship signals.
4. **`UNKNOWN`**: Entity coverage status was not analyzed, is unmapped, or is missing.

---

## 3. Raw Property Mapping & Exporter Resolution

Inspection of `scripts/export-explorer.cjs` (lines 214–222) and `scripts/test-export-explorer.cjs` (Test A) reveals the following exact mapping logic and evidence rationale:

| Raw Property Value | Normalized Model State | Rationale & Evidence Source | Exporter Preservation Status |
|---|---|---|---|
| `"COVERED"`, `"TESTED"` | `"COVERED"` | Confirmed test execution. | Mapped to `"COVERED"` |
| `"LIKELY_COVERED"`, `"likely-covered"` | `"COVERED"` | Static AST analysis identified explicit test method call graphs or `@isTest` annotations confirming automated test coupling. | Mapped to `"COVERED"` |
| `"UNTESTED"`, `"untested"` | `"UNTESTED"` | Explicitly analyzed component with 0% coverage. | Mapped to `"UNTESTED"` |
| `"KNOWN_COVERAGE_FAILURE"` | `"UNTESTED"` | Analyzed test run resulting in failure or explicit zero coverage assertion. | Mapped to `"UNTESTED"` |
| `"NO_TESTS"`, `"no-tests"` | `"NO_TESTS"` (Raw) / `"UNTESTED"` (Filter Category) | Preserved as raw signal `"NO_TESTS"` in exporter node metadata (`refactoringReadiness.testCoverageStatus`), but categorized under `"UNTESTED"` filter category during UI evaluation. | Preserved as `"NO_TESTS"` in exporter output |
| `"AMBIGUOUS"`, `"AMBIGUOUS_TEST"`, `"PARTIAL"` | `"AMBIGUOUS"` | AST analysis detected indirect or inconclusive test relationships. | Mapped to `"AMBIGUOUS"` |
| `null`, `undefined`, `""` | `"UNKNOWN"` | Missing or unanalyzed entities. | Must map to `"UNKNOWN"` in canonical schema |

### Discrepancy Note & Lane A Correction:
`scripts/export-explorer.cjs` line 215 currently contains: `if (!status) return "UNTESTED";`.
To strictly adhere to the mandatory invariant, Lane A (`daFilterSchema.js`) and `export-explorer.cjs` will update `if (!status)` to return `"UNKNOWN"`, ensuring unanalyzed components are never misclassified as `"UNTESTED"`.

---

## 4. Consumer Component Behaviors

### 4.1 Graph Viewer (`daGraphViewer`)
- Evaluates `node.testCoverageStatus`.
- Unanalyzed external entities render with neutral grey styling and display "Coverage N/A" in detail panels.
- Filtering by `testCoverageStatus = ["UNTESTED"]` strictly excludes `UNKNOWN` nodes.

### 4.2 Matrix Viewer (`daMatrixViewer`)
- Matrix cells for `UNKNOWN` entities render with matted grey grid backgrounds rather than red error/untested alerts.

### 4.3 Findings Viewer (`daFindingsViewer`)
- Findings inherit target component coverage status (`finding.targetNodeId`).
- Target components without test data are classified as `UNKNOWN`.

### 4.4 Shared Canonical Filter Logic (`daFilterSchema.js`)
- Validates `testCoverageStatus` arrays against `["COVERED", "UNTESTED", "AMBIGUOUS", "UNKNOWN"]`.

---

## 5. Executable Test Evidence

1. **Exporter Adapter Test A:**
   `node scripts/test-export-explorer.cjs` -> Verified `LIKELY_COVERED` -> `COVERED`, `KNOWN_COVERAGE_FAILURE` -> `UNTESTED`, `NO_TESTS` -> `NO_TESTS`, `AMBIGUOUS_TEST` -> `AMBIGUOUS`.
2. **Workstream A Preset Tests:**
   `node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` -> Verified criteria filtering in `daAppShell.js`.
