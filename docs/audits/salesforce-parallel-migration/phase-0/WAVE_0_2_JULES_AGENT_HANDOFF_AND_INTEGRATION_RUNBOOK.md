# Wave 0.2: Isolated Jules Agent Handoff & Integration Runbook

## 1. Operating Environment & Execution Principles

### 1.1 Verified Platform Realities
1. **Agent Task Isolation:** Each Jules subagent or feature session operates within an isolated container runtime without shared live memory or concurrent filesystem access to the coordinator's checkout.
2. **Git Working Tree Single-Writer Guarantee:** To prevent catastrophic merge collisions, silent regressions, and git lock corruption, only the **Integration Coordinator** is authorized to apply changes and commit to the shared integration branch.
3. **Verified Git Capabilities:**
   - Standard unified diffs and Git patches (`git diff`, `git apply --check`, `git apply`) are 100% verified and functional in this Linux environment.
   - Patch-based handoff provides deterministic provenance, explicit file tracking, and fail-safe dry-run validation.

---

## 2. Multi-Stage Operational Lifecycle

```
 +-------------------------------------------------------------------------+
 | STAGE 1: COORDINATOR PREPARATION & TASK DISPATCH                        |
 | - Verify clean baseline & record HEAD commit                            |
 | - Provide agent with task scope, exclusive files, contracts, tests      |
 +-------------------------------------------------------------------------+
                                      |
                                      v
 +-------------------------------------------------------------------------+
 | STAGE 2: ISOLATED FEATURE AGENT EXECUTION                               |
 | - Agent modifies ONLY assigned files                                    |
 | - Agent runs unit tests & generates test execution evidence             |
 | - Agent produces unified git patch & changed-file manifest              |
 +-------------------------------------------------------------------------+
                                      |
                                      v
 +-------------------------------------------------------------------------+
 | STAGE 3: AGENT-TO-COORDINATOR HANDOFF ARTIFACT PACKAGE                  |
 | Deliverables:                                                           |
 | 1. Changed-file manifest (exact paths)                                  |
 | 2. Formatted git patch (*.patch)                                        |
 | 3. Offline test execution log (commands & results)                      |
 | 4. Risk / Unresolved decisions summary                                  |
 +-------------------------------------------------------------------------+
                                      |
                                      v
 +-------------------------------------------------------------------------+
 | STAGE 4: COORDINATOR VERIFICATION & SERIALIZED INTEGRATION              |
 | - Validate patch against ownership matrix: zero out-of-scope files      |
 | - Dry-run patch: `git apply --check <patch>`                            |
 | - Apply patch: `git apply <patch>`                                      |
 | - Execute lane unit test runner                                         |
 | - Execute full 9-suite offline baseline regression harness (187 tests)  |
 | - Inspect diff & commit to integration branch                           |
 +-------------------------------------------------------------------------+
                                      |
                     [Regression or Ownership Failure?]
                                    /   \
                                  YES    NO
                                  /       \
                                 v         v
                   +------------------+  +--------------------------------+
                   | STAGE 5: ROLLBACK|  | Integration Gate PASSED        |
                   | `git checkout .` |  | Proceed to next lane dispatch  |
                   | Reject patch     |  +--------------------------------+
                   +------------------+
```

---

## 3. Detailed Stage Instructions

### Stage 1: Coordinator Preparation
Prior to dispatching any task:
1. Verify `git status` is clean.
2. Record integration base commit: `BASE_HEAD=$(git rev-parse HEAD)`.
3. Generate the task prompt specifying:
   - Task ID (e.g. `W6-1`).
   - Exclusive permitted files.
   - Applicable contracts (e.g. `W0-C1`, `W0-C3`, `W0-C4`).
   - Offline test runner command (e.g. `node scratch/salesforce-poc/tests/run-wave6-tests.cjs`).
   - Forbidden files (`daAppShell.*`, `objects/*`, `package.json`).

### Stage 2: Feature Agent Execution
The feature agent executes within its assigned sandbox:
1. Implements code strictly within assigned files.
2. Writes unit tests in the designated wave test runner.
3. Runs the test suite until 100% passing.
4. Generates a unified patch file:
   ```bash
   git diff > task-<TASK_ID>.patch
   ```

### Stage 3: Handoff Artifact Package
The feature agent hands off the following package to the coordinator:
- `task_id`: String (e.g. `W6-1`)
- `changed_files`: Array of exact file paths.
- `patch_content`: Complete unified diff string.
- `test_results`: Exact output showing test counts and zero failures.
- `unresolved_issues`: Any boundary edge cases or noted observations.

### Stage 4: Coordinator Integration & Verification
The coordinator performs serialized integration:
1. **Ownership Validation:** Check that every path in `changed_files` belongs to the agent's workstream in `WAVE_0_2_EXHAUSTIVE_OWNERSHIP_AND_COLLISION_AUDIT.md`. Reject immediately if any shared shell or foreign file is modified.
2. **Dry Run Apply:**
   ```bash
   git apply --check task-<TASK_ID>.patch
   ```
3. **Apply Patch:**
   ```bash
   git apply task-<TASK_ID>.patch
   ```
4. **Lane Test Verification:**
   Execute the lane's specific test runner (e.g. `node scratch/salesforce-poc/tests/run-wave6-tests.cjs`).
5. **Full Baseline Regression Gate:**
   Execute all 9 baseline suites (187 test cases). All 187 must pass with 0 failures.
6. **Commit Changes:**
   Commit the integrated lane work with standard semantic commit messages.

### Stage 5: Rollback & Recovery
If any patch check fails, ownership is violated, or baseline regression tests fail:
1. Coordinator executes non-destructive rollback:
   ```bash
   git checkout -- scratch/salesforce-poc/
   git clean -fd scratch/salesforce-poc/
   ```
2. Log the failure reason and return feedback to the agent for remediation.
3. Working tree returns to exact `BASE_HEAD` state.

---

## 4. Fallback Handoff Mechanism (Branch / PR)
If patch file transfer is unavailable in a multi-repo or remote GitHub workflow:
- **Primary Mechanism:** Unified Git Patch (`git apply`).
- **Fallback Mechanism:** Topic Branch PR (`origin/feature/wave-<W>-<TASK>`).
  Coordinator fetches the topic branch, validates changed files via `git diff --name-only origin/main...origin/feature/...`, cherry-picks or merges with `--no-commit`, runs the 9-suite regression gate, and finalizes the merge.
