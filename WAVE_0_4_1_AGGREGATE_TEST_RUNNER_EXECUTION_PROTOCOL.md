# Wave 0.4.1: Aggregate Test Runner Execution Protocol

## 1. Executive Summary & Defect Remediation

In Wave 0.4, the runbook did not explicitly define the lifecycle of aggregate test runners relative to feature task integration:
- **Defect Identified:** The runbook prescribed executing aggregate runners (`node scratch/salesforce-poc/tests/run-wave<w>-tests.cjs`) during feature task integration, but failed to specify when those aggregate runners are created, how missing task runners are handled, and how the runner script safely parses individual test outcomes without false success.
- **Remediation Enacted in Wave 0.4.1:**
  1. **Lifecycle Definition:** Aggregate runners are coordinator-exclusive artifacts. They are authored and maintained solely by the Integration Coordinator.
  2. **Existence Precondition:** An aggregate runner is created or updated by the coordinator only after constituent task runners have been successfully integrated and verified individually.
  3. **Robust Test Parsing:** Test runner execution checks process exit codes, requires explicit regex matches, and validates exact test unit counts per runner, preventing aggregate arithmetic masking individual runner failures.

---

## 2. Test Runner Execution & Validation Protocol

### 2.1 Per-Runner Verification Protocol
Every test execution in the coordinator verification harness must enforce:
1. **Zero Process Exit Code:** The runner command (`node <runner-path>`) must exit with code `0`.
2. **Explicit Pass Count Extraction:** The runner output must match the expected pattern `Summary: (\d+) PASSED, 0 FAILED` or `<Name> Results: (\d+) PASSED, 0 FAILED`.
3. **Zero Failure Assertion:** The extracted fail count must strictly equal `0`.
4. **Non-Empty Pass Count:** The extracted pass count must be greater than zero and match expected units.

### 2.2 Aggregate Runner Orchestration
When multiple tasks of a wave are integrated (e.g. `W6-1`, `W6-2`, `W6-3`, `W6-4`):
1. The Integration Coordinator creates or updates `run-wave6-tests.cjs`.
2. `run-wave6-tests.cjs` invokes each constituent runner via child processes (`child_process.execFileSync`), capturing stdout and exit codes.
3. If any constituent task runner is missing or fails, the aggregate runner exits immediately with a non-zero code.
4. Feature agents are strictly prohibited from creating or modifying aggregate runners.

---

## 3. Frozen Baseline 187-Unit Offline Test Gate

The 9 frozen baseline test runners under `scratch/salesforce-poc/tests/` must be executed and verified before and after every integration:

| Baseline Runner | Expected Test Units | Verified Status |
| :--- | :---: | :---: |
| `run-poc-tests.cjs` | 43 | **PASS** |
| `run-wave4-integration-suite.cjs` | 32 | **PASS** |
| `run-lane-a-schema-tests.cjs` | 9 | **PASS** |
| `run-lane-c-preset-manager-tests.cjs` | 10 | **PASS** |
| `run-lane-d-graph-filter-tests.cjs` | 15 | **PASS** |
| `run-lane-e-matrix-tests.cjs` | 11 | **PASS** |
| `run-lane-f-findings-tests.cjs` | 12 | **PASS** |
| `run-workstream-a-tests.cjs` | 33 | **PASS** |
| `run-workstream-c-tests.cjs` | 22 | **PASS** |
| **Total Baseline Units** | **187** | **PASS** |

### Robust Node.js Execution Harness
```javascript
const cp = require('child_process');
const baselineRunners = [
  { path: 'scratch/salesforce-poc/tests/run-poc-tests.cjs', expected: 43 },
  { path: 'scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs', expected: 32 },
  { path: 'scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs', expected: 9 },
  { path: 'scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs', expected: 10 },
  { path: 'scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs', expected: 15 },
  { path: 'scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs', expected: 11 },
  { path: 'scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs', expected: 12 },
  { path: 'scratch/salesforce-poc/tests/run-workstream-a-tests.cjs', expected: 33 },
  { path: 'scratch/salesforce-poc/tests/run-workstream-c-tests.cjs', expected: 22 }
];

let totalPassed = 0;
for (const runner of baselineRunners) {
  try {
    const stdout = cp.execSync(`node ${runner.path}`, { encoding: 'utf8' });
    const match = stdout.match(/(\d+)\s+PASSED,\s+0\s+FAILED/i);
    if (!match) {
      throw new Error(`Output regex mismatch in ${runner.path}`);
    }
    const count = parseInt(match[1], 10);
    if (count !== runner.expected) {
      throw new Error(`Count mismatch in ${runner.path}: got ${count}, expected ${runner.expected}`);
    }
    totalPassed += count;
  } catch (err) {
    console.error(`Runner failed: ${runner.path}`, err.message);
    process.exit(1);
  }
}

if (totalPassed !== 187) {
  console.error(`Baseline verification failed: total ${totalPassed} != 187`);
  process.exit(1);
}
console.log(`Baseline verification PASSED: exactly ${totalPassed} units confirmed.`);
```
