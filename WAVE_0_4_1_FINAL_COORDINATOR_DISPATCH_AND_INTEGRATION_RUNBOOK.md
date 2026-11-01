# Wave 0.4.1: Final Coordinator Dispatch and Integration Runbook

## 1. Executive Summary & Operational Directives

This runbook defines the authoritative operational procedure for the Integration Coordinator during the execution of Waves 5 through 9 of the Salesforce Dependency Analyzer migration.

### Mandatory Operating Invariants:
1. **Implementation Freeze:** Wave 0.4.1 is strictly read-only planning and documentation reconciliation. Feature implementation must not begin without explicit Human Authorization (Gate 1).
2. **Exclusion of Destructive Git Commands:** `git reset --hard`, `git clean -fd`, and `git checkout -- ...` are permanently prohibited. Automatic fallback to destructive checkouts is strictly forbidden.
3. **Immutability of Baseline Runners:** The 9 baseline offline test runners (187 test units) are immutable (`FROZEN_READ_ONLY`).
4. **Disjoint Ownership Enforcement:** Feature agents exclusively author task-specific test runners (`run-w<id>-tests.cjs`). Only the coordinator touches aggregate runners and `daAppShell`.
5. **Batch Integration Protocol:** Patches originating from the common `dispatch_base_commit` are accepted in parallel as long as their paths are disjoint and dry-run check succeeds.

---

## 2. Four-Stage Lifecycle Protocol

```
+-----------------------------------------------------------------------------------+
| STAGE A: Coordinator Preparation & Baseline Verification                          |
|   - Record Git commit SHA & clean status                                          |
|   - Execute 9 baseline test suites (187 tests) with exact count assertions        |
|   - Verify absence of uncommitted changes                                         |
|   - Await Human Authorization Gate 1                                              |
+-----------------------------------------------------------------------------------+
                                        |
+-----------------------------------------------------------------------------------+
| STAGE B: Feature Task Dispatch & Concurrency Partitioning                         |
|   - Verify task eligibility against dependency register                           |
|   - Enforce Wave 5 strict serialization (W5-1 -> W5-2 -> ... -> W5-6)             |
|   - Dispatch disjoint parallel tasks (e.g. W6-1, W6-2, W6-3, W6-4, W7-P1, W8-1)  |
|   - Provide agent with exact file allowlist & dispatch_base_commit SHA            |
+-----------------------------------------------------------------------------------+
                                        |
+-----------------------------------------------------------------------------------+
| STAGE C: Coordinator Integration & Safe Verification                              |
|   - Receive handoff JSON + patch                                                  |
|   - Execute 5-point patch validation (base SHA, checksum, allowlist, dry-run)     |
|   - Apply patch                                                                   |
|   - Execute task runner, aggregate runner (if created), and 9 baseline suites     |
|   - If failure: Execute SafeRollbackProtocol (clean reverse apply; HALT on error) |
|   - If pass: Commit integration on coordinator branch                             |
+-----------------------------------------------------------------------------------+
                                        |
+-----------------------------------------------------------------------------------+
| STAGE D: Human Authorization Gates & Governance Sign-Off                          |
|   - Gate 1: Authorization to Begin Implementation                                 |
|   - Gate 2: Authorization to Merge Completed Migration Work                      |
|   - Gate 3: Authorization to Deploy to Salesforce Org                             |
+-----------------------------------------------------------------------------------+
```

---

## 3. Stage A: Baseline Verification Script

Execute the robust verification script:
```bash
node -e '
const cp = require("child_process");
const baselineRunners = [
  { path: "scratch/salesforce-poc/tests/run-poc-tests.cjs", expected: 43 },
  { path: "scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs", expected: 32 },
  { path: "scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs", expected: 9 },
  { path: "scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs", expected: 10 },
  { path: "scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs", expected: 15 },
  { path: "scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs", expected: 11 },
  { path: "scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs", expected: 12 },
  { path: "scratch/salesforce-poc/tests/run-workstream-a-tests.cjs", expected: 33 },
  { path: "scratch/salesforce-poc/tests/run-workstream-c-tests.cjs", expected: 22 }
];

let totalPassed = 0;
for (const runner of baselineRunners) {
  const stdout = cp.execSync(`node ${runner.path}`, { encoding: "utf8" });
  const match = stdout.match(/(\d+)\s+PASSED,\s+0\s+FAILED/i);
  if (!match) throw new Error(`Pattern mismatch in ${runner.path}`);
  const count = parseInt(match[1], 10);
  if (count !== runner.expected) throw new Error(`Count mismatch in ${runner.path}`);
  totalPassed += count;
}
console.log(`Baseline verification PASSED: exactly ${totalPassed} units confirmed.`);
if (totalPassed !== 187) process.exit(1);
'
```

---

## 4. Stage B: Launchable Task Classification (Batch 1)

| Task ID | Workstream | Description | Dependencies | Dispatch Status | Concurrent Group |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `W5-1` | Workstream A | Shell Layout Switcher | None | READY_TO_LAUNCH | Batch 1 (Serialized A) |
| `W6-1` | Workstream B | Radar View Component | None | READY_TO_LAUNCH | Batch 1 (Parallel B) |
| `W6-2` | Workstream B | Treemap View Component | None | READY_TO_LAUNCH | Batch 1 (Parallel B) |
| `W6-3` | Workstream B | Subway View Component | None | READY_TO_LAUNCH | Batch 1 (Parallel B) |
| `W6-4` | Workstream B | Hotspots View Component | None | READY_TO_LAUNCH | Batch 1 (Parallel B) |
| `W7-P1`| Workstream C | History Listing Apex Contract A | None | READY_TO_LAUNCH | Batch 1 (Parallel C) |
| `W7-1` | Workstream C | Diagnostics Scorecard Component | None | READY_TO_LAUNCH | Batch 1 (Parallel C) |
| `W7-2` | Workstream C | Architecture DNA Barcode | None | READY_TO_LAUNCH | Batch 1 (Parallel C) |
| `W8-1` | Workstream D | Investigation Drawer | None | READY_TO_LAUNCH | Batch 1 (Parallel D) |
| `W8-2` | Workstream D | Diff Engine Utility Module | None | READY_TO_LAUNCH | Batch 1 (Parallel D) |
| `W9-1` | Workstream E | Refactoring Pure Math Engine | None | READY_TO_LAUNCH | Batch 1 (Parallel E) |

**Total Immediately Launchable Tasks:** **11 tasks**.
Every task in Batch 1 has **zero file overlap** with any other concurrently running task.

---

## 5. Stage C: Coordinator Patch Validation & Safe Rollback

```bash
# 1. Verify dispatch base provenance
if [ "$HANDOFF_DISPATCH_BASE" != "$DISPATCH_BASE_COMMIT" ]; then
    echo "ERROR: Dispatch base commit mismatch."
    exit 1
fi

# 2. Check patch checksum
CALCULATED_SHA=$(sha256sum "$PATCH_FILE" | awk '{print $1}')
if [ "$CALCULATED_SHA" != "$HANDOFF_PATCH_SHA" ]; then
    echo "ERROR: Patch checksum mismatch."
    exit 1
fi

# 3. Dry-run apply
if ! git apply --check "$PATCH_FILE"; then
    echo "ERROR: Patch dry-run apply failed."
    exit 1
fi

# 4. Apply patch
git apply "$PATCH_FILE"

# 5. Run verification tests
if ! node "$HANDOFF_TEST_RUNNER"; then
    echo "Task test failed. Reverting..."
    git apply --reverse --check "$PATCH_FILE" && git apply --reverse "$PATCH_FILE"
    exit 1
fi

# 6. Verify 9 baseline test runners
# (Run baseline verification script)
```

---

## 6. Stage D: Three Human Authorization Gates

### Gate 1: Authorization to Begin Implementation
- Prerequisite: Wave 0.4.1 reconciliation complete, baseline 187 units verified, cross-document validator passes.
- Authorizes: Batch 1 isolated branch dispatch.

### Gate 2: Authorization to Merge Completed Migration Work
- Prerequisite: All 20 feature tasks integrated by Coordinator, Task `INT-1` complete, all 20 task runners passing, 5 aggregate runners passing, `run-coordinator-integration-suite.cjs` passing, 9 baseline runners passing (187 units).
- Authorizes: Merging coordinator branch into main repository branch.

### Gate 3: Authorization to Deploy to Salesforce Org
- Prerequisite: Connected Salesforce scratch org active, Apex compilation successful, Apex test runner (`DAGraphControllerTest.cls`) passing in org, LWC components deployed and verified in Salesforce Lightning runtime.
- Authorizes: Deployment to target Salesforce org.
