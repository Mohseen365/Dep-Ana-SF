# WAVE 0.4.3 VALIDATOR EXECUTION REPORT

## 1. Execution Identity and Environment

| Dimension | Measured Value |
|:---|:---|
| **Repository Root** | `/app` |
| **Git Branch** | `jules-3891393051459543315-25d41193` |
| **Integration HEAD SHA** | `a0c2a77f48b8b7cfe411e2e5df82ccc3b1c36a76` |
| **Working Tree State** | `CLEAN` |
| **Validator Version** | `0.4.3-strict` |
| **Validator Script Hash (SHA-256)** | `2e261e00764f5b874589bcf0e46bfec0f9a2825e9cf16a68abb265e3673e56a3` |
| **Execution Timestamp** | `2026-11-01T17:59:51.363Z` |

---

## 2. Summary Assertion Totals

| Status | Count | Description |
|:---|:---:|:---|
| **PASSED** | **930** | Actually executed and empirically satisfied checks |
| **FAILED** | **0** | Executed assertions that failed |
| **SKIPPED** | **0** | Checks intentionally bypassed with justification |
| **UNVERIFIED** | **2** | Checks requiring unavailable live Salesforce/browser runtime |
| **WARNING** | **0** | Non-blocking observations |
| **TOTAL EXECUTED** | **932** | Zero inflation, 1:1 mapped assertions |

---

## 3. Assertion Breakdown by Category

| Category | Passed | Failed | Skipped | Unverified |
|:---|:---:|:---:|:---:|:---:|
| **staticSchema** | 592 | 0 | 0 | 0 |
| **crossDocumentConsistency** | 330 | 0 | 0 | 0 |
| **filesystem** | 4 | 0 | 0 | 0 |
| **semanticReview** | 3 | 0 | 0 | 2 |
| **empiricalExecution** | 1 | 0 | 0 | 0 |

---

## 4. Unverified Findings and Platform Boundaries

### Finding FIND-W043-0001: [UNVERIFIED] UNVERIFIED-SF-ORG
- **Category:** semanticReview
- **Expected:** Full platform verification
- **Actual:** Unverified offline: No live Salesforce scratch org is connected in offline sandbox environment
- **Remediation:** Execute via SFDX/Salesforce CLI when authorized org environment is available

### Finding FIND-W043-0002: [UNVERIFIED] UNVERIFIED-BROWSER-E2E
- **Category:** semanticReview
- **Expected:** Full platform verification
- **Actual:** Unverified offline: Headless browser / Playwright execution not authorized during offline evidence gate closure
- **Remediation:** Execute browser test harness during full UI verification phase


---

## 5. Reproduction Command

To reproduce this validation run independently:

```bash
node docs/wave-0/4.3/validate-wave0-4-3-dispatch.cjs
```
