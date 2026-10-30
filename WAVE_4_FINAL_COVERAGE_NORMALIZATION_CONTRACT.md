# Wave 4 (`FEAT-STATE-03`): Final Coverage Normalization Contract (R2)

| Governance Attribute | Value |
|---|---|
| **Document Type** | Coverage Semantics Contract & Exporter Normalization Specification |
| **Target Feature** | Wave 4 — Remediation R2 & Exporter Coverage Pipeline (`scripts/export-explorer.cjs`) |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-5014689980934327006-a6a229d3` |
| **HEAD Commit SHA** | `8ff54cae850a4f569da5f8ee602e142b74a110bc` |
| **Audit Date** | March 2026 (Execution Date) / October 2026 Roadmap |
| **Status** | **SPECIFICATION COMPLETE — READY FOR HUMAN REVIEW — IMPLEMENTATION HOLD ACTIVE** |

---

## 1. Context & Mandatory Missing-Value Invariant

In `scripts/export-explorer.cjs` line 331:
```javascript
function normalizeTestCoverageStatus(status) {
  if (!status) return "UNTESTED"; // DEFECT: Falsey/missing status mapped to UNTESTED!
  ...
}
```
This implementation defect violates the repository's missing-value invariant by treating unanalyzed or missing components (`UNKNOWN`) as confirmed zero-coverage components (`UNTESTED`).

### 1.1 Mandatory Missing-Value Invariant
Across all exporter transformations, data adapters, and UI filter schemas:
- `null` → **`UNKNOWN`**
- `undefined` → **`UNKNOWN`**
- Empty string `""` → **`UNKNOWN`**
- Whitespace-only string (e.g. `"   "`) → **`UNKNOWN`**
- Missing status property → **`UNKNOWN`**
- Malformed / unrecognized status string → **`UNKNOWN`**

*Rule:* Missing evidence MUST NEVER be mapped to `UNTESTED`.

---

## 2. Evidence Classification & Semantic Separation

To eliminate semantic conflation in coverage reporting, six underlying evidence concepts are established:

| Underlying Evidence Concept | Technical Meaning | Source Signal Examples | Information Model Distinction |
|---|---|---|---|
| **1. Confirmed Runtime Coverage** | Verified test execution pass under coverage profiling | `covered`, `passed` | Execution confirmed & assertions passed |
| **2. Static Inferred Association** | Static AST call-graph or naming convention match | `likely-covered`, `likely_covered` | Static link found; runtime execution unconfirmed |
| **3. Ambiguous / Dynamic Association** | Multiple candidates or dynamic reflection (`Type.forName`) | `ambiguous-test`, `ambiguous` | Indeterminate test mapping |
| **4. Explicitly Untested** | Component analyzed; zero test references found | `untested`, `no-tests`, `no-test-evidence` | Confirmed absence of tests |
| **5. Failed Test Execution** | Test run executed but failed or breached coverage % | `failed`, `known-coverage-failure` | Tests exist and ran, but failed execution/threshold |
| **6. Unknown / Missing Evidence** | Coverage analysis not performed or missing property | `null`, `undefined`, `""`, `"   "`, unrecognized | Absence of evidence |

---

## 3. Canonical UI State Mapping & Information Loss Analysis

The canonical frontend state set consists of four UI filter states:
- **`COVERED`**
- **`UNTESTED`**
- **`AMBIGUOUS`**
- **`UNKNOWN`**

### 3.1 Mapping 6 Evidence Concepts to 4 UI States

Because the canonical UI schema supports 4 states while underlying evidence contains 6 distinct concepts, mapping requires explicit handling and documentation of information loss:

```
[1. Confirmed Runtime Coverage] ------------> COVERED
[2. Static Inferred Association] -----------> COVERED (or AMBIGUOUS pending Lead Arch/PO policy)
[3. Ambiguous / Dynamic Association] -------> AMBIGUOUS
[4. Explicitly Untested] ------------------> UNTESTED
[5. Failed Test Execution] -----------------> UNTESTED (Information loss: conceals test existence)
[6. Unknown / Missing Evidence] -----------> UNKNOWN
```

### 3.2 Key Semantic Policy Decisions

1. **Static Inferred Coverage vs Runtime Coverage (`likely-covered`):**
   - AST naming matches (`likely-covered`) prove static code relationships, not executed runtime coverage.
   - Mapping `likely-covered` directly to `COVERED` in the 4-state UI model overstates verified coverage.
   - **Policy Decision Required:** Lead Architect & Product Owner sign-off is required to determine whether `likely-covered` maps to `COVERED` (with UI disclaimer) or `AMBIGUOUS`.
2. **Failed Execution vs Untested (`known-coverage-failure`):**
   - Mapping `failed` or `known-coverage-failure` to `UNTESTED` conflates components that have failing tests with components that have no tests at all.
   - In the 4-state UI model, `known-coverage-failure` is mapped to `UNTESTED` so high-risk unverified code is highlighted for remediation. However, this incurs **information loss**: users cannot distinguish zero test coverage from broken test coverage without inspecting individual node metrics.

---

## 4. Authoritative Raw-to-Canonical Status Mapping Matrix

The matrix below inspects actual repository producers (`dependency-analyzer.cjs`, `scripts/export-explorer.cjs`) and consumers:

| Raw Input Value | Source Location | Actual Evidence Meaning | Proposed Canonical Result | Confidence | Approval Required? |
|---|---|---|---|---|---|
| `null` | Exporter / Adapter input | Missing coverage payload | **`UNKNOWN`** | High | No (Bug Fix) |
| `undefined` | AST parser / Node metric | Unset property | **`UNKNOWN`** | High | No (Bug Fix) |
| `""` (Empty String) | Serialized JSON input | Blank field | **`UNKNOWN`** | High | No (Bug Fix) |
| `"   "` (Whitespace) | User input / XML text | Whitespace-only string | **`UNKNOWN`** | High | No (Bug Fix) |
| Absent Property | `refactoringReadiness` map | Field missing from JSON | **`UNKNOWN`** | High | No (Bug Fix) |
| `covered` / `passed` | `dependency-analyzer.cjs` line 3973 | Confirmed test profiling pass | **`COVERED`** | High | No |
| `likely-covered` / `likely_covered` | `dependency-analyzer.cjs` line 4141 | Static AST naming match | **`COVERED`** (Proposed) | Medium | **YES (Lead Arch + PO)** |
| `untested` | `dependency-analyzer.cjs` | Analyzed; zero test references | **`UNTESTED`** | High | No |
| `no-tests` / `no-test-evidence` | `dependency-analyzer.cjs` | Confirmed no test classes found | **`UNTESTED`** | High | No |
| `failed` / `known-coverage-failure` | `dependency-analyzer.cjs` line 3955 | Test run failed / threshold breach | **`UNTESTED`** (Lossy) | Medium | **YES (Lead Arch + PO)** |
| `ambiguous-test` / `ambiguous` | `dependency-analyzer.cjs` line 4118 | Multiple tests or dynamic call | **`AMBIGUOUS`** | High | No |
| Unrecognized string e.g. `"INVALID"` | Arbitrary raw payload | Unexpected value | **`UNKNOWN`** | High | No (Bug Fix) |

---

## 5. Corrected Exporter Source Implementation Specification (R2)

When Remediation R2 is authorized by Lead Architect and Product Owner, `scripts/export-explorer.cjs` `normalizeTestCoverageStatus` must be updated to:

```javascript
/**
 * Corrected Exporter Coverage Normalization Function (R2 Specification)
 * Preserves mandatory missing-value invariant and handles all raw signals deterministically.
 */
function normalizeTestCoverageStatus(status) {
  if (status === null || status === undefined || String(status).trim() === "") {
    return "UNKNOWN";
  }
  const s = String(status).trim().toLowerCase().replace(/_/g, "-");
  if (s === "covered" || s === "passed" || s === "likely-covered") {
    return "COVERED";
  }
  if (s === "untested" || s === "no-tests" || s === "no-test-evidence" || s === "failed" || s === "known-coverage-failure") {
    return "UNTESTED";
  }
  if (s === "ambiguous-test" || s === "ambiguous" || s === "ambiguous-tests") {
    return "AMBIGUOUS";
  }
  return "UNKNOWN";
}
```

---

## 6. Non-Implementation Confirmation

This document specifies the normalization contract. No exporter scripts (`scripts/export-explorer.cjs`) or test suites were modified during this dispatch.
