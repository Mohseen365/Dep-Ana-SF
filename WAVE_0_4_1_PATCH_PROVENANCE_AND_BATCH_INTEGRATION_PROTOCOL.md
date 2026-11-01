# Wave 0.4.1: Patch Provenance and Batch Integration Protocol

## 1. Executive Summary & Defect Remediation

In Wave 0.4, a fundamental contradiction existed in the patch provenance and integration rules:
- **Defect Identified:** The provenance policy stated that a patch handoff must be rejected if `handoff.base_commit != CurrentIntegrationBase`. At the same time, the runbook authorized dispatching multiple parallel tasks (e.g. 11 tasks in Batch 1) from a common starting commit `A`. If Task 1 integrates and produces commit `B`, then under a rigid equality check (`handoff.base_commit == CurrentIntegrationBase`), Task 2 (whose `base_commit` is `A`) would be rejected immediately despite being a valid, completely disjoint parallel patch.
- **Remediation Enacted in Wave 0.4.1:**
  We formally establish the **Batch Integration Protocol**, distinguishing between:
  1. `dispatch_base_commit`: The immutable base commit SHA from which the parallel dispatch batch was created.
  2. `current_integration_head`: The latest commit SHA on the coordinator integration branch after applying preceding patches.
  3. `task_patch_provenance`: The recorded origin SHA, patch SHA-256 checksum, exact file allowlist, and offline test results.

---

## 2. Definitive Three-Tier Commit & Provenance Architecture

```
                      [Dispatch Base Commit A]
                     /           |            \
           Task W6-1             Task W6-2     Task W7-P1
           (base: A)             (base: A)     (base: A)
              |                      |             |
              v                      |             |
Coordinator Integrates W6-1          |             |
Commit B: [HEAD = B]                 |             |
              |                      v             |
              |            Coordinator Integrates  |
              |            W6-2 (base: A, clean apply on B)
              |            Commit C: [HEAD = C]    |
              |                      |             v
              |                      |   Coordinator Integrates
              |                      |   W7-P1 (base: A, clean apply on C)
              |                      |   Commit D: [HEAD = D]
              +----------------------+-------------+
```

### Protocol Rules:
1. **Parallel Dispatch Authorization:** Tasks in the same parallel batch (e.g. Batch 1) start from the same `dispatch_base_commit`.
2. **Disjoint Path Invariant:** Because tasks in the parallel batch have strictly disjoint writable file allocations, their patches touch mutually exclusive paths.
3. **Integration Gate Check (`git apply --check`):**
   When the coordinator receives a patch from a task whose `base_commit == dispatch_base_commit`:
   - The coordinator verifies that `handoff.base_commit` equals `dispatch_base_commit`.
   - The coordinator verifies that the patch touches **only** files authorized in the task's allowlist.
   - The coordinator executes a non-destructive dry-run: `git apply --check task-<TASK_ID>.patch`.
   - Because the paths are disjoint from previously integrated patches in the batch, `git apply --check` will succeed cleanly even though `current_integration_head` has advanced.
4. **Collision or Overlap Guard:**
   If a patch attempts to modify any file already modified by a prior integrated task, `git apply --check` will either detect a conflict or the allowlist check will reject it, halting integration immediately.

---

## 3. Safe, Non-Destructive Rollback Protocol

Destructive commands (`git reset --hard`, `git clean -fd`, `git checkout HEAD -- ...`) remain strictly prohibited.

When an integrated patch fails post-application verification (e.g. baseline or task tests fail):
```bash
# STEP 1: Verify that reverse application is clean
if git apply --reverse --check "task-${TASK_ID}.patch"; then
    echo "Dry-run reverse apply succeeded. Reverting task patch..."
    git apply --reverse "task-${TASK_ID}.patch"
    echo "Task patch cleanly reversed. Repository state restored."
else
    echo "CRITICAL: Reverse check failed! Working tree diverged."
    echo "AUTOMATIC ROLLBACK HALTED to prevent destructive corruption."
    exit 1
fi
```

### Rollback Invariants:
1. Reverses **only** the exact changes introduced by `task-<TASK_ID>.patch`.
2. Never resets or wipes out previously integrated sibling tasks.
3. If reverse dry-run fails, the process halts without modifying disk state.
