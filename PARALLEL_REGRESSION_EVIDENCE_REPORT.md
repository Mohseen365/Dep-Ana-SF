# PARALLEL_REGRESSION_EVIDENCE_REPORT.md
## Baseline & Task-Specific Comprehensive Regression Suite

- **Date:** 8 November 2026
- **Coordinator:** Jules (Integration Coordinator)
- **Environment:** Node.js `v22.22.1`, npm `11.1.0`, Linux x64

---

### 1. Cumulative Test Suite Summary

| Category | Suite Name | Runner Path | Tests | Pass | Fail | Exit Code | Duration |
|---|---|---|---|---|---|---|---|
| Baseline 1 | POC Tests | `scratch/salesforce-poc/tests/run-poc-tests.cjs` | 43 | 43 | 0 | 0 | ~1980ms |
| Baseline 2 | Wave 4 Integration | `scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs` | 32 | 32 | 0 | 0 | ~86ms |
| Baseline 3 | Lane A Schema | `scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs` | 9 | 9 | 0 | 0 | ~54ms |
| Baseline 4 | Lane C Preset Manager | `scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs` | 10 | 10 | 0 | 0 | ~53ms |
| Baseline 5 | Lane D Graph Filter | `scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs` | 15 | 15 | 0 | 0 | ~68ms |
| Baseline 6 | Lane E Matrix | `scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs` | 11 | 11 | 0 | 0 | ~56ms |
| Baseline 7 | Lane F Findings | `scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs` | 12 | 12 | 0 | 0 | ~53ms |
| Baseline 8 | Workstream A Tests | `scratch/salesforce-poc/tests/run-workstream-a-tests.cjs` | 33 | 33 | 0 | 0 | ~76ms |
| Baseline 9 | Workstream C Tests | `scratch/salesforce-poc/tests/run-workstream-c-tests.cjs` | 22 | 22 | 0 | 0 | ~105ms |
| **Baseline Total** | **9 Frozen Suites** | | **187** | **187** | **0** | **0** | **~2525ms** |
| Prior Feature | Task W5-1 Tests | `scratch/salesforce-poc/tests/run-w5-1-tests.cjs` | 17 | 17 | 0 | 0 | ~851ms |
| Wave 1A Feature | Task W6-2 Tests | `scratch/salesforce-poc/tests/run-w6-2-tests.cjs` | 7 | 7 | 0 | 0 | ~58ms |
| Wave 1A Feature | Task W6-3 Tests | `scratch/salesforce-poc/tests/run-w6-3-tests.cjs` | 7 | 7 | 0 | 0 | ~55ms |
| Wave 1A Feature | Task W6-4 Tests | `scratch/salesforce-poc/tests/run-w6-4-tests.cjs` | 7 | 7 | 0 | 0 | ~56ms |
| Wave 1A Feature | Task W7-1 Tests | `scratch/salesforce-poc/tests/run-w7-1-tests.cjs` | 6 | 6 | 0 | 0 | ~54ms |
| Wave 1A Feature | Task W7-2 Tests | `scratch/salesforce-poc/tests/run-w7-2-tests.cjs` | 7 | 7 | 0 | 0 | ~56ms |
| **Grand Total** | **15 Test Runners** | | **238** | **238** | **0** | **0** | **~3655ms** |

---

### 2. Regression Verdict
- **Zero regressions** detected across all historical baseline tests.
- **100% pass rate** (238 / 238 tests passing across 15 independent test suites).
- All runner scripts execute independently in standard CommonJS Node.js without external dependencies.
