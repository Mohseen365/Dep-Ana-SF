# Wave 0.4.2: Workstream C — Patch Integration and Collision Control Protocol

## 1. Principles and Disambiguation

In parallel multi-agent migration, confusion between the **dispatch base commit** and the **integration HEAD** can cause severe integration regressions.
- **Dispatch Base SHA:** The static commit SHA from which all feature agent branches/workspaces are created. Every feature patch is generated relative to this baseline (`git diff <dispatch-base>`).
- **Current Integration HEAD:** The moving coordinator branch commit as successive patches are validated, integrated, and committed.

`git apply --check` passing against an integration HEAD does not prove lack of semantic conflict. The Integration Coordinator must enforce an explicit allowlist, detect unpermitted file overlaps, and maintain a verifiable collision ledger.

---

## 2. Mandatory Integration Ledger Schema

Every patch integrated by the Integration Coordinator must be recorded in an immutable integration ledger (`COORDINATOR_INTEGRATION_LEDGER.csv`):

| Column Name | Data Type / Format | Purpose |
| :--- | :--- | :--- |
| `task_id` | String (`W5-1..INT-1`) | Task identifier from authoritative register |
| `workstream` | String | Workstream owning the task |
| `agent_id` | String | Subagent / worker identifier |
| `dispatch_base_sha` | 40-char hex SHA | Baseline commit used to generate patch |
| `patch_sha256` | 64-char hex SHA | SHA-256 digest of patch file |
| `patch_filename` | String | Filename of the patch artifact |
| `timestamp_iso` | ISO 8601 UTC | Integration execution timestamp |
| `modified_paths` | Semicolon-delimited list | Existing repository files modified |
| `new_paths` | Semicolon-delimited list | New files created by the patch |
| `deleted_paths` | Semicolon-delimited list | Files deleted by the patch (must be empty in Wave 0.4) |
| `renamed_paths` | Semicolon-delimited list | Renamed files (must be empty in Wave 0.4) |
| `binary_changes` | Boolean (`true`/`false`) | Binary diff present (strictly prohibited) |
| `pre_integration_head` | 40-char hex SHA | Coordinator HEAD SHA immediately prior to patch apply |
| `post_integration_head` | 40-char hex SHA | Coordinator HEAD SHA immediately after committing patch |
| `prior_integrated_tasks` | Semicolon-delimited list | List of all previously integrated tasks |
| `overlap_detected` | Boolean (`true`/`false`) | Whether patch intersects previously integrated files |
| `overlap_authorized` | Boolean (`true`/`false`) | Whether detected overlap was explicitly authorized |
| `patch_apply_status` | Enum (`PASS`, `FAIL`) | Exit status of patch validation and apply |
| `task_unit_tests_passed`| Integer | Count of passing task-specific offline tests |
| `baseline_tests_passed` | Integer | Baseline suite outcome (must equal 187) |
| `coordinator_signoff` | String | Coordinator approval signature |
| `rollback_invoked` | Boolean (`true`/`false`) | Whether rollback was triggered for this task |

---

## 3. Mandatory 16-Step Pre-Application Gate Pipeline

Before applying any patch to the coordinator integration branch, the coordinator must execute the following 16 sequential checks:

1. **Gate 1: Task ID Allowlist Check**
   Verify that `task_id` matches the authoritative task set (`W5-1..6`, `W6-1..4`, `W7-P1`, `W7-1..3`, `W8-1..3`, `W9-1..3`, `INT-1`).
2. **Gate 2: Ownership and Workstream Check**
   Verify that the submitting agent corresponds to the owning workstream registered in `WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv`.
3. **Gate 3: Dispatch Base Verification**
   Verify that the patch's `dispatch_base_sha` matches the official dispatch commit.
4. **Gate 4: Checksum Verification**
   Compute `sha256sum <patch-file>` and ensure it matches the handoff manifest `patch_sha256`.
5. **Gate 5: Patch Path Extraction**
   Extract all touched paths from diff headers (`diff --git a/... b/...`).
6. **Gate 6: Exact Task Allowlist Comparison**
   Compare all extracted paths against the task's `Exact Affected Files` from the register. **If any unlisted path is touched, reject immediately.**
7. **Gate 7: Frozen-File Protection**
   Ensure no path in the patch has `mutability_tier == 'FROZEN_READ_ONLY'` (e.g. baseline test runners, existing metadata).
8. **Gate 8: Coordinator-Exclusive Protection**
   Ensure no path has `mutability_tier == 'COORDINATOR_EXCLUSIVE'` (e.g. `daAppShell`, aggregate runners), unless `task_id == 'INT-1'`.
9. **Gate 9: Predecessor Task Completion**
   Verify that all tasks declared in `Dependencies` have already been committed in the integration ledger.
10. **Gate 10: Cumulative Overlap Analysis**
    Compare extracted paths against the cumulative union of all paths modified by prior integrated tasks.
11. **Gate 11: Overlap Authorization Check**
    If overlap is detected: check if the overlap is explicitly permitted by a serialized dependency chain (e.g. `W5-2` modifying files from `W5-1`). If not authorized, halt integration immediately.
12. **Gate 12: File Operation Restrictions**
    Verify: zero binary files, zero file deletions, zero mode/permission alterations.
13. **Gate 13: Clean Working Tree Check**
    Verify `git status --porcelain` is empty on the coordinator workspace.
14. **Gate 14: Safe Dry-Run Check (`git apply --check`)**
    Execute `git apply --check --verbose <patch-file>` against the current integration HEAD.
15. **Gate 15: Apply Patch**
    Execute `git apply <patch-file>`.
16. **Gate 16: Verification & Commit**
    Execute task-specific runner (`node scratch/salesforce-poc/tests/run-w<id>-tests.cjs`) and baseline suite (187 units). If all pass, commit with structured commit message and update the ledger.

---

## 4. Supported and Prohibited File Operations

| Operation Type | Status | Handling Protocol |
| :--- | :---: | :--- |
| **New Tracked Text File** | **SUPPORTED** | Added with standard Git `/dev/null` diff header |
| **Modified Tracked Text File** | **SUPPORTED** | Modified with unified diff hunk |
| **Nested Directory Creation** | **SUPPORTED** | Supported via Git intent-to-add (`git add -N`) |
| **File Deletions** | **PROHIBITED** | Prohibited in Wave 0.4 feature tasks |
| **File Renames / Moves** | **PROHIBITED** | Prohibited; would disrupt concurrent workstream paths |
| **Binary File Additions** | **PROHIBITED** | Prohibited; binary diffs cannot be audited in text reviews |
| **File Mode Changes (chmod)** | **PROHIBITED** | Prohibited; all repository files remain standard 100644 |
| **Symlinks** | **PROHIBITED** | Prohibited across Salesforce metadata directories |
| **Whitespace-Only Modifications**| **PERMITTED WITH CAUTION** | Must be within allowlist; normalized to LF line endings |

---

## 5. Task-Scoped Safe Rollback Protocol

If a patch applies cleanly but fails its verification suite or corrupts tests, a task-scoped rollback must be performed.

### 5.1 Prohibited Coarse Commands
The following destructive commands are **strictly prohibited** in the coordinator environment:
- `git checkout HEAD -- .` (destroys uncommitted coordinator state or untracked task files)
- `git reset --hard` (destroys commits and untracked files)
- `git clean -fd` (indiscriminately deletes untracked files from concurrent tasks)

### 5.2 Deterministic Task-Scoped Rollback Procedure
```bash
# 1. Capture the exact file paths introduced/modified by the failed task
AFFECTED_PATHS=$(git apply --numstat <patch-file> | awk '{print $3}')

# 2. Check if reverse application is clean
git apply --reverse --check <patch-file>

if [ $? -eq 0 ]; then
  # 3a. Clean reverse application
  git apply --reverse <patch-file>
  echo "Task patch cleanly reversed."
else
  # 3b. If reverse application conflicts (e.g. intermediate state dirty):
  # Only revert the specific affected paths that were modified
  for FILE in $AFFECTED_PATHS; do
    if git ls-files --error-unmatch "$FILE" >/dev/null 2>&1; then
      git checkout HEAD -- "$FILE"
    else
      rm -f "$FILE"
    fi
  done
  echo "Task-scoped path revert complete."
fi

# 4. Verify post-rollback state
git status --porcelain

# 5. Rerun 187-unit baseline gate to prove working tree returned to healthy state
node scratch/salesforce-poc/tests/run-poc-tests.cjs
```
If the baseline test gate does not immediately pass with 187 units post-rollback, the coordinator must halt all operations and request manual human review.
