# Wave 4 (`FEAT-STATE-03`): Final Coverage Normalization Contract (R2)

| Governance Attribute | Value |
|---|---|
| **Document Type** | Coverage Semantics Contract & Exporter Normalization Specification |
| **Target Feature** | Wave 4 — Remediation R2 & Exporter Coverage Pipeline (`scripts/export-explorer.cjs`) |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-8629279200045229050-798dadd2` |
| **HEAD Commit SHA** | `d8b3b273bf5d31736ad82fc244760fd5b85e3b91` |
| **Audit Date** | October 31, 2026 |
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

### 1.1 Mandatory Missing-Value Invariant (Approved Deterministic Correction)
Across all exporter transformations, data adapters, and UI filter schemas:
- `null` → **`UNKNOWN`**
- `undefined` → **`UNKNOWN`**
- Empty string `""` → **`UNKNOWN`**
- Whitespace-only string (e.g. `"   "`) → **`UNKNOWN`**
- Missing status property → **`UNKNOWN`**
- Malformed / unrecognized status string → **`UNKNOWN`**

*Rule:* Missing evidence MUST NEVER be mapped to `UNTESTED`. This is a deterministic bug fix supported by existing repository invariants and does not require policy approval.

---

## 2. Evidence Classification & Semantic Separation

To eliminate semantic conflation in coverage reporting, seven distinct underlying evidence concepts are established:

| Underlying Evidence Concept | Technical Meaning | Source Signal Examples | Information Model Distinction |
|---|---|---|---|
| **1. Runtime Test Execution Pass** | Verified test execution pass under coverage profiling | `covered`, `passed` | Direct test execution confirmed & assertions passed |
| **2. Static Inferred Association** | Static AST call-graph or naming convention match | `likely-covered`, `likely_covered` | Static link found; runtime execution unconfirmed |
| **3. Known Test Failure** | Test run executed but failed or breached coverage % | `failed`, `known-coverage-failure` | Tests exist and ran, but failed execution or coverage threshold |
| **4. Zero Tests Found** | Component analyzed; zero test references exist | `untested`, `no-tests`, `no-test-evidence` | Confirmed absence of test definitions |
| **5. Ambiguous Evidence** | Multiple candidates or dynamic reflection (`Type.forName`) | `ambiguous-test`, `ambiguous`, `ambiguous-tests` | Indeterminate test mapping |
| **6. Missing Evidence** | Status property omitted from JSON or absent | Absent property, `undefined` | Absence of property |
| **7. Unknown Evidence** | Blank or unrecognized string | `null`, `""`, `"   "`, `"INVALID"` | Absence of evaluable signal |

---

## 3. Separation of Deterministic Corrections from Unapproved Policy Decisions

### 3.1 Deterministic Defect Correction (No Human Policy Approval Needed)
- Correcting falsey/missing values (`null`, `undefined`, `""`, whitespace, unrecognized) from becoming `UNTESTED` to `UNKNOWN` is an authoritative, deterministic defect correction.
- It restores adherence to the fundamental data-contract invariant.

### 3.2 Unapproved Policy Mappings (Blocked Pending Human Decision)
The following proposed mappings represent subjective policy choices that incur information loss and require explicit approval from the **Lead Architect** and **Product Owner**:

1. **Mapping Static Inference (`likely-covered`) to `COVERED`:**
   - *Issue:* AST naming matches prove only that static references exist, not that code executed or assertions passed. Presenting static inference as `COVERED` overstates verified quality.
   - *Alternative:* Map to `AMBIGUOUS` or introduce a dedicated visual badge.
   - *Status:* **UNRESOLVED / PENDING APPROVAL (Lead Architect & Product Owner)**.
2. **Mapping Failed Execution (`known-coverage-failure` / `failed`) to `UNTESTED`:**
   - *Issue:* Conflates components that have broken tests with components that have never had tests written. A developer or release manager cannot distinguish broken tests from missing tests.
   - *Alternative:* Introduce a distinct `FAILED` state or map to `AMBIGUOUS`.
   - *Status:* **UNRESOLVED / PENDING APPROVAL (Lead Architect & Product Owner)**.

Neither policy mapping is approved. They are excluded from authoritative implementation contracts until signed off.

---

## 4. Authoritative Raw-to-Canonical Status Mapping Matrix

| Raw Input Value | Source Location | Actual Evidence Meaning | Canonical Status / Outcome | Confidence | Approval Status |
|---|---|---|---|---|---|
| `null` | Exporter / Adapter input | Missing coverage payload | **`UNKNOWN`** | High | **Approved Deterministic Fix** |
| `undefined` | AST parser / Node metric | Unset property | **`UNKNOWN`** | High | **Approved Deterministic Fix** |
| `""` (Empty String) | Serialized JSON input | Blank field | **`UNKNOWN`** | High | **Approved Deterministic Fix** |
| `"   "` (Whitespace) | User input / XML text | Whitespace-only string | **`UNKNOWN`** | High | **Approved Deterministic Fix** |
| Absent Property | `refactoringReadiness` map | Field missing from JSON | **`UNKNOWN`** | High | **Approved Deterministic Fix** |
| `untested` | `dependency-analyzer.cjs` | Analyzed; zero test references | **`UNTESTED`** | High | Standard Deterministic Contract |
| `no-tests` / `no-test-evidence` | `dependency-analyzer.cjs` | Confirmed no test classes found | **`UNTESTED`** | High | Standard Deterministic Contract |
| `ambiguous-test` / `ambiguous` | `dependency-analyzer.cjs` line 4118 | Multiple tests or dynamic call | **`AMBIGUOUS`** | High | Standard Deterministic Contract |
| `covered` / `passed` | `dependency-analyzer.cjs` line 3973 | Confirmed test profiling pass | **`COVERED`** | High | Standard Deterministic Contract |
| `likely-covered` / `likely_covered` | `dependency-analyzer.cjs` line 4141 | Static AST naming match | **UNRESOLVED (Pending Policy Decision)** | Medium | **REQUIRES APPROVAL (Lead Arch + PO)** |
| `failed` / `known-coverage-failure` | `dependency-analyzer.cjs` line 3955 | Test run failed / threshold breach | **UNRESOLVED (Pending Policy Decision)** | Medium | **REQUIRES APPROVAL (Lead Arch + PO)** |
| Unrecognized string e.g. `"INVALID"` | Arbitrary raw payload | Unexpected value | **`UNKNOWN`** | High | **Approved Deterministic Fix** |

---

## 5. Authoritative Proposed Exporter Implementation Contract (R2)

To preserve the separation between deterministic corrections and pending policy decisions, the authoritative implementation specification for `scripts/export-explorer.cjs` is structured with explicit unresolved policy branches:

```javascript
/**
 * Authoritative Exporter Coverage Normalization Contract (R2 Specification)
 * Strictly enforces missing-value invariant.
 * Unresolved policy mappings are gated behind pending decisions.
 */
function normalizeTestCoverageStatus(status, policyDecisions = {}) {
  // 1. Mandatory Missing-Value Invariant (Deterministic Defect Fix)
  if (status === null || status === undefined || String(status).trim() === "") {
    return "UNKNOWN";
  }

  const s = String(status).trim().toLowerCase().replace(/_/g, "-");

  // 2. Confirmed Runtime Test Execution Pass
  if (s === "covered" || s === "passed") {
    return "COVERED";
  }

  // 3. Confirmed Zero Tests Found
  if (s === "untested" || s === "no-tests" || s === "no-test-evidence") {
    return "UNTESTED";
  }

  // 4. Ambiguous Evidence
  if (s === "ambiguous-test" || s === "ambiguous" || s === "ambiguous-tests") {
    return "AMBIGUOUS";
  }

  // 5. UNRESOLVED POLICY BRANCH A: Static Inferred Coverage (likely-covered)
  // Requires explicit Lead Architect and Product Owner approval
  if (s === "likely-covered") {
    if (policyDecisions.allowStaticInferenceAsCovered === true) {
      return "COVERED";
    }
    // Default until approved: preserve as UNRESOLVED / AMBIGUOUS
    return "UNRESOLVED_STATIC_INFERENCE_POLICY";
  }

  // 6. UNRESOLVED POLICY BRANCH B: Known Test Failure (failed / known-coverage-failure)
  // Requires explicit Lead Architect and Product Owner approval
  if (s === "failed" || s === "known-coverage-failure") {
    if (policyDecisions.mapFailedExecutionToUntested === true) {
      return "UNTESTED";
    }
    // Default until approved: preserve as UNRESOLVED / FAILED
    return "UNRESOLVED_FAILED_EXECUTION_POLICY";
  }

  // 7. Unrecognized string fallback
  return "UNKNOWN";
}
```

---

## 6. Source and Test Inspection Evidence

An inspection of the repository confirms:
- **`scripts/export-explorer.cjs` Line 331:** Still contains `if (!status) return "UNTESTED";`. The known missing-status defect remains present in source code.
- **`scripts/test-export-explorer.cjs`:** Verifies exporter path containment and source normalization, but does not yet assert the corrected `UNKNOWN` missing-status invariant.
- **Hold Status:** In accordance with `IMPLEMENTATION HOLD — ACTIVE`, no changes have been applied to `scripts/export-explorer.cjs` or `scripts/test-export-explorer.cjs`.
- **Verification Statement:** The corrected normalization behavior has **NOT** been implemented or executed in the repository. It remains an authoritative specification awaiting human authorization.
