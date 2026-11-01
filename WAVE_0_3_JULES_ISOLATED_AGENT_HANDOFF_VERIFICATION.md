# Wave 0.3: Jules Isolated-Agent Handoff Technical Contract & Operational Verification

## 1. Operating Model & Constraints

In this environment, Jules feature agents execute within isolated sandbox sessions. Subagents do not share live memory, background daemons, or concurrent working trees.

### Verified Capabilities & Operational Boundaries:
1. **Isolated Filesystem:** Each agent session has its own filesystem view during execution.
2. **Deterministic Handoff via Structured Artifacts:** The only robust, verifiable handoff mechanism between an isolated feature agent and the Integration Coordinator is a structured artifact package consisting of:
   - A unified Git patch file.
   - An explicit manifest of changed files.
   - Captured test execution stdout/stderr logs.
   - An evidence / unresolved issues summary.
3. **Coordinator Single-Writer Authority:** Only the Integration Coordinator applies patches to the shared integration branch and executes the baseline regression gate.

---

## 2. Explicit Agent Handoff Contract Specification

Every feature agent assigned to a task (e.g. `W6-1`, `W7-1`, `W8-1`) must return a strictly defined handoff payload:

```json
{
  "task_id": "W6-1",
  "workstream": "Workstream B",
  "status": "COMPLETED",
  "changed_files": [
    "scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js",
    "scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.html",
    "scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.css",
    "scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js-meta.xml",
    "scratch/salesforce-poc/tests/run-wave6-tests.cjs"
  ],
  "patch_file": "task-W6-1.patch",
  "test_execution": {
    "runner": "node scratch/salesforce-poc/tests/run-wave6-tests.cjs",
    "exit_code": 0,
    "reported_passed": 8,
    "reported_failed": 0
  },
  "unresolved_issues": []
}
```

### 2.1 File Boundary Validation
Prior to testing or applying the patch, the coordinator executes programmatic validation against `WAVE_0_3_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv`:
- **Criterion 1:** Every path in `changed_files` must belong to the assigned workstream.
- **Criterion 2:** No path may belong to `daAppShell/`, `objects/`, `config/`, or any of the 9 immutable baseline test runners.
- **Criterion 3:** If any unauthorized path is present, the coordinator **rejects the patch immediately without applying**.

---

## 3. Coordinator Intake & Verification Lifecycle

```
Feature Agent                                                 Coordinator
     |                                                             |
     |--- 1. Submits Handoff Payload (JSON + Patch + Logs) ------>|
     |                                                             |
     |                                           2. Ownership Boundary Audit
     |                                              (Match against CSV manifest)
     |                                                             |
     |                                           3. Dry Run Apply:
     |                                              `git apply --check <patch>`
     |                                                             |
     |                                           4. Apply Patch:
     |                                              `git apply <patch>`
     |                                                             |
     |                                           5. Run Wave Test Runner:
     |                                              `node run-wave<W>-tests.cjs`
     |                                                             |
     |                                           6. Run 9 Baseline Runners:
     |                                              (187/187 tests must pass)
     |                                                             |
     |                                           7. Diff & Immutability Audit:
     |                                              (Verify baseline unchanged)
     |                                                             |
     |                                                   [Pass / Fail?]
     |                                                      /      \
     |                                                  FAIL        PASS
     |                                                    /            \
     |<-- 8a. Return Rejection & Task-Scoped Rollback --+              +--> 8b. Coordinator
                                                                                Commit to Branch
```

### 3.1 Failure Handling & Task-Scoped Rollback
If any check in steps 2 through 7 fails:
1. The coordinator executes the **Task-Scoped Rollback Procedure** (defined in `WAVE_0_3_TASK_SCOPED_ROLLBACK_AND_VERIFICATION.md`):
   ```bash
   git apply --reverse task-<TASK_ID>.patch || git checkout HEAD -- "${TASK_TRACKED_FILES[@]}"
   ```
2. Unrelated in-flight files and other workstream artifacts are preserved.
3. The coordinator records the failure log and returns a rejection report to the agent.

---

## 4. Scope of Empirical Verification

- **Technically Verified in Wave 0.3:**
  The local patch generation procedure (`git add -N`, `git diff HEAD -- <paths>`), patch completeness across all 4 file change types (including untracked files and nested folders), dry-run validation (`git apply --check`), application fidelity, and task-scoped rollback were **empirically executed and verified** on isolated specimens in `/tmp` (documented in `WAVE_0_3_PATCH_HANDOFF_PROCEDURE_AND_VERIFICATION.md` and `WAVE_0_3_TASK_SCOPED_ROLLBACK_AND_VERIFICATION.md`).
- **Operational Boundary Disclosure:**
  Cross-agent network transmission of patches between separate container instances was **not** simulated or executed, as no multi-agent execution was authorized during this planning-only phase. The transfer model relies on standard file system artifact handoff or topic branch PRs as defined in the coordinator runbook.
