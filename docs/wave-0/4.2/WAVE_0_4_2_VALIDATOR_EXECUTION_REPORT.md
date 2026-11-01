# Wave 0.4.2: Validator Execution Report

## 1. Executive Summary

The standalone validator `docs/wave-0/4.2/validate-wave0-4-2-dispatch.cjs` was implemented with zero external dependencies and executed against all authoritative Wave 0.4.1 registers and Wave 0.4.2 contract deliverables.
- **Execution Runtime:** Node.js `v22.22.1`
- **Total Assertions Executed:** 1,835
- **Passed Assertions:** 1,835
- **Failed Assertions:** 0
- **Process Exit Code:** `0` (Success)

---

## 2. Categorized Assertion Breakdown

To prevent the reporting of unverified or conflated assertions (e.g. the historical 491/491 claim), assertions are partitioned into five mutually exclusive categories:

| Assertion Category | Executed | Passed | Failed | Scope & Domain Covered |
| :--- | :---: | :---: | :---: | :--- |
| **`staticSchema`** | 1,221 | 1,221 | 0 | Exact task ID allowlist, manifest row count (175), column populations, RFC 4180 parsing, path normalization |
| **`crossDocumentConsistency`** | 581 | 581 | 0 | Exact Affected Files = New ∪ Existing Modified, Batch 1 disjoint paths, frozen/coordinator file protection, dependency cycles |
| **`filesystem`** | 11 | 11 | 0 | Existence and readability of all mandatory input and deliverable files |
| **`semanticReview`** | 4 | 4 | 0 | Ratification of W7 two-step query, patch integration protocol, W8 memory classification, component API heterogeneity |
| **`empiricalExecution`** | 18 | 18 | 0 | Verification of 15 patch scenarios (14 EXECUTED_PASS, 1 NOT_APPLICABLE) and status integrity |
| **Total Assertions** | **1,835** | **1,835** | **0** | **100% Empirically Validated and Reproducible** |

---

## 3. Exact Key Validations Confirmed

1. **Exact Task Allowlist:** All 21 tasks in the register match the canonical set (`W5-1..6`, `W6-1..4`, `W7-P1`, `W7-1..3`, `W8-1..3`, `W9-1..3`, `INT-1`). No invented IDs (`W7-4`, `W8-5`, `W9-6`) exist.
2. **Path Uniqueness & Count:** Exactly 175 unique paths in the ownership manifest (99 existing baseline, 76 planned new).
3. **Batch 1 Disjointness:** All 11 immediately launchable tasks in Batch 1 share exactly zero writable paths.
4. **Frozen and Coordinator Protection:** Zero feature tasks write to `FROZEN_READ_ONLY` files or `COORDINATOR_EXCLUSIVE` aggregate runners.
5. **Exact Mathematical Union:** In every task, `Exact Affected Files` strictly equals the union of `New Files` and `Existing Files Modified`.
