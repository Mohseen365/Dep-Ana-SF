# Wave 0.4: Final Coordinator Dispatch & Integration Runbook (Workstream H)

## 1. Overview & Operational Governance

This runbook defines the authoritative operational protocol for the Integration Coordinator during the execution of Waves 5 through 9 of the Salesforce Dependency Analyzer migration.

### Non-Negotiable Operational Directives:
1. **Feature Implementation Prohibition:** Wave 0.4 is strictly a read-only planning and documentation correction wave. Feature implementation must not begin without explicit Human Authorization (Gate 1).
2. **Exclusion of Destructive Git Commands:** The commands `git reset --hard`, `git clean -fd`, and `git checkout -- scratch/salesforce-poc/` are permanently prohibited. Automatic fallback to `git checkout HEAD -- ...` is eradicated.
3. **Immutability of Baseline Runners:** The 9 baseline offline test runners under `scratch/salesforce-poc/tests/` (187 test units) are immutable.
4. **Disjoint Ownership Enforcement:** Feature agents exclusively author task-specific test runners (`run-w<id>-tests.cjs`). Only the coordinator touches aggregate runners and `daAppShell`.

---

## 2. Four-Stage Lifecycle Protocol

```
+-----------------------------------------------------------------------------------+
| STAGE A: Coordinator Preparation & Baseline Verification                          |
|   - Record Git commit SHA & clean status                                          |
|   - Execute 9 baseline test suites (187 tests)                                    |
|   - Verify absence of uncommitted changes                                         |
|   - Await Human Authorization Gate 1                                              |
+-----------------------------------------------------------------------------------+
                                        |
+-----------------------------------------------------------------------------------+
| STAGE B: Feature Task Dispatch & Concurrency Partitioning                         |
|   - Verify task eligibility against dependency register                           |
|   - Enforce Wave 5 strict serialization (W5-1 -> W5-2 -> ... -> W5-6)             |
|   - Dispatch disjoint parallel tasks (e.g. W6-1, W6-2, W6-3, W6-4, W7-P1, W8-1)  |
|   - Provide agent with exact file allowlist & base commit SHA                     |
+-----------------------------------------------------------------------------------+
                                        |
+-----------------------------------------------------------------------------------+
| STAGE C: Coordinator Integration & Safe Verification                              |
|   - Receive handoff JSON + patch                                                  |
|   - Execute 5-point patch validation (base SHA, checksum, allowlist, dry-run)     |
|   - Apply patch                                                                   |
|   - Execute task runner, aggregate runner, and 9 baseline suites                  |
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

## 3. Stage A: Coordinator Preparation Checklist

1. Record initial repository state:
   ```bash
   git status
   git rev-parse HEAD
   ```
2. Verify baseline offline test gate:
   ```bash
   node -e '
   const cp = require("child_process");
   const runners = [
     "scratch/salesforce-poc/tests/run-poc-tests.cjs",
     "scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs",
     "scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs",
     "scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs",
     "scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs",
     "scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs",
     "scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs",
     "scratch/salesforce-poc/tests/run-workstream-a-tests.cjs",
     "scratch/salesforce-poc/tests/run-workstream-c-tests.cjs"
   ];
   let total = 0;
   runners.forEach(r => {
     const out = cp.execSync("node " + r, { encoding: "utf8" });
     const m = out.match(/Passed:\s+(\d+)/) || out.match(/(\d+)\s+passed/i) || out.match(/Passing:\s+(\d+)/);
     total += parseInt(m[1], 10);
   });
   console.log("Total Baseline Tests Passing:", total); // Must equal 187
   if (total !== 187) process.exit(1);
   '
   ```
3. Verify all 13 Wave 0.4 governance and contract deliverables exist and are reconciled.
4. Confirm Gate 1 human approval before issuing any task prompt.

---

## 4. Stage B: Feature Dispatch & Parallel Concurrency Groups

### 4.1 Launchable Task Classification

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

### 4.2 Implementation-Dependent Tasks (9 tasks)
- `W5-2` through `W5-6`: Sequentially dependent on `W5-1..W5-5` due to shared `daGraphViewer` / `daLayoutEngine` modifications.
- `W7-3`: Dependent on `W7-P1`.
- `W8-3`: Dependent on `W8-2` and `W7-P1`.
- `W9-2` and `W9-3`: Dependent on `W9-1`.

### 4.3 Coordinator-Only Tasks (1 task)
- `INT-1`: Application Shell Integration and Navigation Mount (`daAppShell` modifications + `run-coordinator-integration-suite.cjs`). Dispatched only after all feature waves complete.

---

## 5. Stage C: Coordinator Integration & Safe Verification Protocol

Upon receiving a feature task handoff:

1. **Verify Base Commit Provenance:**
   Confirm `handoff.base_commit == CURRENT_INTEGRATION_BASE_SHA`.
2. **Verify Checksum:**
   Confirm `sha256(patch_file) == handoff.patch_sha256`.
3. **Verify File Allowlist:**
   Confirm all paths in patch exist in task allowlist and no protected runners are touched.
4. **Dry-Run Apply:**
   `git apply --check task-<TASK_ID>.patch`
5. **Apply Patch:**
   `git apply task-<TASK_ID>.patch`
6. **Execute Verification Suites:**
   - `node <handoff.test_runner>`
   - `node scratch/salesforce-poc/tests/run-wave<W>-tests.cjs` (aggregate runner)
   - Execute all 9 baseline runners (187 test gate).
7. **Safe Rollback Protocol (If Verification Fails):**
   ```bash
   if git apply --reverse --check task-<TASK_ID>.patch; then
       git apply --reverse task-<TASK_ID>.patch
       echo "Task patch cleanly reversed."
   else
       echo "CRITICAL: Reverse check failed. HALTING automatic rollback to prevent data loss."
       exit 1
   fi
   ```
8. **Commit Integrated Work:**
   Once all checks pass, coordinator commits the task integration:
   `git commit -m "feat(migration): integrate task <TASK_ID> (<Description>)"`

---

## 6. Stage D: Three Distinct Human Authorization Gates

To prevent false readiness claims and premature org deployment, three explicit, non-overlapping gates are enforced:

### Gate 1: Authorization to Begin Implementation
- **Prerequisite:** Wave 0.4 deliverables fully verified, test baselines established (187 tests passing), zero file collisions, and explicit approval by the Human Project Lead.
- **Outcome:** Authorizes launching Batch 1 feature agents in isolated branches.

### Gate 2: Authorization to Merge Completed Migration Work
- **Prerequisite:** All 20 feature tasks integrated by Coordinator, Task `INT-1` complete, all 20 task runners passing, 5 aggregate runners passing, `run-coordinator-integration-suite.cjs` passing, 9 baseline runners passing (187 tests).
- **Outcome:** Authorizes merging the coordinator integration branch into the main repository branch.

### Gate 3: Authorization to Deploy to Salesforce Org
- **Prerequisite:** Gate 2 achieved, Salesforce CLI / `sf` installed, valid org credentials / scratch org active, Apex compilation successful, Apex test runner (`DAGraphControllerTest.cls`) passing in org, LWC components deployed and verified in Salesforce Lightning runtime.
- **Outcome:** Authorizes production metadata deployment to target Salesforce organization.
