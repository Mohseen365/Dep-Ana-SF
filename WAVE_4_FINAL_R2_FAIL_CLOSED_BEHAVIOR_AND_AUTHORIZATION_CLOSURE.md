# Wave 4 (`FEAT-STATE-03`): Final R2 Fail-Closed Behavior & Authorization Closure

| Governance Attribute | Value |
|---|---|
| **Document Type** | R2 Definitive Fail-Closed Behavior Contract & Authorization Classification Closure |
| **Target Feature** | Wave 4 — Remediation R2 & Exporter Coverage Pipeline (`scripts/export-explorer.cjs`) |
| **Repository Root** | `/app` |
| **Current Branch** | `jules-2662574214828896325-f3957679` |
| **HEAD Commit SHA** | `e643416f0aac66f9d0ba231f2f5920fee4c95a5e` |
| **Audit Date** | October 31, 2026 |
| **Operational Directive** | **IMPLEMENTATION HOLD ACTIVE — NO APPLICATION SOURCE CODE MODIFICATION PERMITTED** |
| **R2 Classification** | **SPECIFIED — HUMAN IMPLEMENTATION AUTHORIZATION PENDING** |

---

## 1. Executive Summary & Purpose

This deliverable establishes the final, unambiguous runtime contract for Remediation R2 (coverage status normalization in `scripts/export-explorer.cjs`) and rectifies prior governance classification ambiguities.

### Problem Addressed:
1. **Ambiguous Runtime Behavior:** Prior specification drafts permitted alternative behaviors: throwing an explicit error vs. quarantining unresolved evidence outside canonical records.
2. **Premature Authorization Language:** Prior reports labeled deterministic normalization as an "Approved Deterministic Fix," implying that human authorization to modify exporter code had already been granted.

### Definitive Closures Established:
1. **Single Mandatory Behavior:** `UnresolvedCoverageEvidenceError` is the sole mandatory runtime behavior for unresolved or prohibited coverage evidence (`likely-covered`, `failed`, `known-coverage-failure`).
2. **Quarantine Demoted:** Node quarantine is strictly classified as an unapproved future architectural alternative, not an active runtime alternative.
3. **Four Canonical States Only:** Canonical output is strictly bounded to `COVERED`, `UNTESTED`, `AMBIGUOUS`, and `UNKNOWN`. No fifth state is permitted.
4. **Correct Authorization Status:** The entire R2 remediation is classified as `SPECIFIED — HUMAN IMPLEMENTATION AUTHORIZATION PENDING`.
5. **Human Approval Boundary:** Exporter source (`scripts/export-explorer.cjs`) and test runner (`scripts/test-export-explorer.cjs`) changes remain strictly blocked pending joint human sign-off from both the Lead Architect and Product Owner.

---

## 2. Definitive Fail-Closed Runtime Contract

When the exporter encounters coverage evidence that cannot be mapped deterministically to one of the canonical states, it must fail-closed immediately.

### 2.1 The Seven Mandatory Operational Rules

1. **Do Not Convert to `COVERED`:** Unresolved evidence (such as static AST inference `likely-covered`) must never be mapped to `COVERED`.
2. **Do Not Convert to `UNTESTED`:** Failed or inferred evidence must never be mapped to `UNTESTED`.
3. **Do Not Add a Fifth Canonical State:** No non-canonical enum (e.g. `QUARANTINED`, `FAILED`, `LIKELY_COVERED`, `PARTIALLY_TESTED`) may ever appear in canonical output nodes.
4. **Do Not Silently Discard Evidence:** The exporter must not drop components with unresolved coverage to bypass validation.
5. **Do Not Persist Prohibited Values:** Raw legacy strings must never pass through unmodified into output records.
6. **Raise `UnresolvedCoverageEvidenceError`:** The pipeline must immediately abort execution with a dedicated, structured `UnresolvedCoverageEvidenceError`.
7. **Preserve Diagnostic Context:** The thrown error must preserve diagnostic details (component ID, component name, and raw status encountered) without leaking secrets, tokens, or PII.

---

## 3. Mandatory Pseudocode Implementation Specification

The proposed normalization routine in `scripts/export-explorer.cjs` (currently line 331) must be replaced with the following fail-closed implementation once authorized:

```javascript
/**
 * Custom error class raised when unmapped or prohibited coverage evidence is encountered.
 */
class UnresolvedCoverageEvidenceError extends Error {
  constructor(message, rawStatus, componentContext = {}) {
    super(message);
    this.name = 'UnresolvedCoverageEvidenceError';
    this.rawStatus = rawStatus;
    this.componentId = componentContext.id || null;
    this.componentName = componentContext.name || null;
  }
}

/**
 * Authoritative coverage status normalizer for export-explorer.cjs.
 * Strictly bounded to four canonical states: COVERED, UNTESTED, AMBIGUOUS, UNKNOWN.
 * Fails closed with UnresolvedCoverageEvidenceError on unresolved/prohibited inputs.
 *
 * @param {string|null|undefined} status - Raw coverage status from input evidence
 * @param {Object} [componentContext={}] - Diagnostic metadata for error reporting
 * @returns {string} Canonical coverage status: 'COVERED' | 'UNTESTED' | 'AMBIGUOUS' | 'UNKNOWN'
 * @throws {UnresolvedCoverageEvidenceError} On prohibited or unresolved statuses
 */
function normalizeTestCoverageStatus(status, componentContext = {}) {
  // 1. Missing / Blank / Null / Whitespace / Unset Invariant -> UNKNOWN
  if (status === null || status === undefined) {
    return 'UNKNOWN';
  }
  if (typeof status !== 'string') {
    return 'UNKNOWN';
  }
  const s = status.trim().toLowerCase();
  if (s === '') {
    return 'UNKNOWN';
  }

  // 2. Canonical Passing Test Evidence -> COVERED
  if (s === 'covered' || s === 'passed') {
    return 'COVERED';
  }

  // 3. Canonical Zero-Test Evidence -> UNTESTED
  if (s === 'untested' || s === 'no-tests' || s === 'no-test-evidence') {
    return 'UNTESTED';
  }

  // 4. Canonical Ambiguous Test Evidence -> AMBIGUOUS
  if (s === 'ambiguous' || s === 'ambiguous-test') {
    return 'AMBIGUOUS';
  }

  // 5. Prohibited / Unresolved Static Inference -> FAIL-CLOSED
  if (s === 'likely-covered' || s === 'likely_covered') {
    throw new UnresolvedCoverageEvidenceError(
      `Encountered unresolved static inference coverage status "${status}" for component "${componentContext.id || 'unknown'}". ` +
      `No authenticated policy authorization mechanism exists. Operation blocked.`,
      status,
      componentContext
    );
  }

  // 6. Prohibited / Unresolved Test Failure -> FAIL-CLOSED
  if (s === 'failed' || s === 'known-coverage-failure') {
    throw new UnresolvedCoverageEvidenceError(
      `Encountered unresolved failed execution coverage status "${status}" for component "${componentContext.id || 'unknown'}". ` +
      `No authenticated policy authorization mechanism exists. Operation blocked.`,
      status,
      componentContext
    );
  }

  // 7. Arbitrary Unrecognized Legacy String -> UNKNOWN
  return 'UNKNOWN';
}
```

---

## 4. Formal Demotion of Quarantine Alternative

Prior working documents discussed quarantining unmapped nodes into an isolated metadata array (e.g. `metadata.quarantinedNodes`) as an alternative to throwing an error.

### Governance Ruling:
- **Quarantine is NOT an Authorized Runtime Alternative:** Quarantine mode is strictly a future architectural proposal.
- **Prerequisites for Future Quarantine Design:**
  1. A dedicated architectural design proposal outlining data structure, indexing, and UI display impacts.
  2. Formal security review to prevent data loss or silent suppression of components.
  3. Formal joint approval from the Lead Architect and Product Owner.
- **Current Contract:** Throwing `UnresolvedCoverageEvidenceError` is the single authoritative contract behavior.

---

## 5. Authoritative Raw-to-Canonical Mapping & Authorization Register

| Raw Status Value | Evidence Source | Canonical Result | Governance Classification | Required Approval | Current Implementation Status |
|---|---|---|---|---|---|
| `null` | AST / Adapter input | `UNKNOWN` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |
| `undefined` | AST / Adapter input | `UNKNOWN` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |
| `""` (Empty string) | Serialized payload | `UNKNOWN` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |
| `"   "` (Whitespace) | User / XML payload | `UNKNOWN` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |
| Absent property | Node metadata map | `UNKNOWN` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |
| `untested` | Analyzed component | `UNTESTED` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |
| `no-tests` | Analyzed component | `UNTESTED` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |
| `ambiguous-test` | Multi-call component | `AMBIGUOUS` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |
| `covered` / `passed` | Profiler verified | `COVERED` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |
| `likely-covered` | Static AST heuristic | Throws `UnresolvedCoverageEvidenceError` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |
| `failed` | Test run failure | Throws `UnresolvedCoverageEvidenceError` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |
| Unrecognized string | Arbitrary raw text | `UNKNOWN` | `SPECIFIED — HUMAN AUTHORIZATION PENDING` | Lead Arch + PO | NOT IMPLEMENTED (Blocked by Hold) |

---

## 6. Implementation Authorization Boundary

1. **Source Code State:** `scripts/export-explorer.cjs` line 331 remains untouched in the repository.
2. **Test State:** `scripts/test-export-explorer.cjs` remains untouched in the repository.
3. **Authorization Requirement:** Under the ownership matrix, modifying either `scripts/export-explorer.cjs` or `scripts/test-export-explorer.cjs` requires **joint written authorization from both the Lead Architect and Product Owner**.
4. **No Inferred Approval:** Neither technical specification readiness nor offline test passage constitutes implementation approval.

---

## 7. Audit Conclusion & Operational Status

Remediation R2 is fully specified, deterministic, and fail-closed. All throw-or-quarantine ambiguities have been resolved.

- **Definitive Status:** `SPECIFIED — HUMAN IMPLEMENTATION AUTHORIZATION PENDING`
- **Operational Directive:** `IMPLEMENTATION HOLD — ACTIVE`
- **Application Source Modified:** `NO` (0 lines changed in exporter source or test runner)
