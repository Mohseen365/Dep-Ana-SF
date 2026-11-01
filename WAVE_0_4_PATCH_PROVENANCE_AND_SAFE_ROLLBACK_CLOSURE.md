# Wave 0.4: Patch Provenance and Safe Rollback Closure (Workstream B)

## 1. Problem Formulation & Defect Analysis

Wave 0.3 recognized that broad Git reset operations (e.g. `git checkout -- scratch/salesforce-poc/` or `git clean -fd`) were unsafe and introduced task-scoped rollback. However, the final coordinator runbook in Wave 0.3 still contained an unsafe automatic fallback:
```bash
git apply --reverse task-<TASK_ID>.patch || git checkout HEAD -- "${TASK_TRACKED_FILES[@]}"
```

### Defect Impact:
1. **Destructive Clobbering of Sequential Integrations:**
   Suppose Task 1 integrates modifications into a file (e.g. `DAGraphController.cls`). Task 2 later applies changes to the same file. If Task 2 subsequently fails verification and the coordinator executes `git checkout HEAD -- DAGraphController.cls`, Git checks out the file from `HEAD` (which may be prior to Task 1 if commits were uncommitted, or conversely, if committed in an integration branch, reverts uncommitted work). More critically, if multiple tasks touch a directory or file sequentially, blindly checking out `HEAD` destroys all intermediate successfully integrated tasks.
2. **Missing Base Commit Verification:**
   If a feature agent branched or executed against an out-of-date base commit, applying the patch on the coordinator's current integration tree can succeed textually with fuzzy offset application, but silently introduce structural regressions or delete newly merged features.
3. **Ambiguity in Patch Reversal Failure:**
   When `git apply --reverse` fails, it indicates that the working tree has diverged or contains conflicting modifications. Executing automatic destructive overrides in an uncertain state is an anti-pattern that guarantees data loss.

---

## 2. Empirical Specimen Repository Evidence

To verify the exact behavior of Git patch generation, application, and reversal, empirical tests were executed against temporary specimen repositories in `/tmp` using Git 2.43+:

### 2.1 Test Matrix & Observed Behavior

| Test ID | Scenario Tested | Procedure | Observed Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| `SPEC-01` | Tracked File Modification | Modify tracked file, `git add -N`, `git diff HEAD` | Clean diff generated; cleanly applies and reverses with `git apply --reverse`. | **VERIFIED** |
| `SPEC-02` | Tracked File Deletion | Delete tracked file, `git add -N`, `git diff HEAD` | Deletion diff generated; cleanly restores file on `git apply --reverse`. | **VERIFIED** |
| `SPEC-03` | Newly Created Untracked File | Create new file, `git add -N`, `git diff HEAD` | Diff generated with `/dev/null` source; on `git apply --reverse`, file is cleanly deleted. | **VERIFIED** |
| `SPEC-04` | Nested Newly Created File | Create `nested/sub/file.txt`, `git add -N`, `git diff HEAD` | Clean diff generated; applies and reverses cleanly. | **VERIFIED** |
| `SPEC-05` | Paths with Spaces | File named `file with spaces.txt` | Diff quotes path appropriately; applies and reverses cleanly with `--`. | **VERIFIED** |
| `SPEC-06` | Intervening Conflict Reversal | Apply patch, modify file, attempt `git apply --reverse --check` | **Exits with code 128 / error: patch does not apply.** | **VERIFIED** |
| `SPEC-07` | Dangerous Checkout Fallback | Apply Task 1, Apply Task 2, `git checkout HEAD -- file` | Wipes out Task 2 AND any uncommitted Task 1 edits. Confirms fallback is dangerous. | **VERIFIED** |

### 2.2 Key Findings:
1. `git add -N -- <paths>` followed by `git diff HEAD -- <paths>` reliably captures modifications, deletions, and new additions (including nested directory structures).
2. `git apply --reverse task.patch` cleanly removes newly added files without needing `rm` or `git clean`.
3. When intervening modifications occur, `git apply --reverse --check` safely fails without altering any files on disk.
4. **Mandatory Rule:** Automatic fallback to `git checkout HEAD` must be strictly eradicated.

---

## 3. Enhanced Handoff JSON Specification

Every feature task handoff must produce an explicit, auditable machine-readable manifest (`handoff-task-<TASK_ID>.json`) conforming to the following schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Wave04TaskHandoffManifest",
  "type": "object",
  "required": [
    "task_id",
    "workstream",
    "base_commit",
    "patch_file",
    "patch_sha256",
    "changed_files",
    "test_runner",
    "test_exit_code",
    "test_pass_count",
    "test_fail_count",
    "unresolved_issues"
  ],
  "properties": {
    "task_id": { "type": "string", "pattern": "^(W[5-9]-[1-6P]|INT-1)$" },
    "workstream": { "type": "string" },
    "base_commit": { "type": "string", "pattern": "^[0-9a-f]{40}$" },
    "patch_file": { "type": "string" },
    "patch_sha256": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
    "changed_files": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "test_runner": { "type": "string" },
    "test_exit_code": { "type": "integer" },
    "test_pass_count": { "type": "integer", "minimum": 0 },
    "test_fail_count": { "type": "integer", "maximum": 0 },
    "unresolved_issues": { "type": "array", "items": { "type": "string" } }
  }
}
```

---

## 4. Coordinator Patch Validation Algorithm

Before applying any submitted patch, the Integration Coordinator executes the following validation algorithm:

```
Algorithm ValidateAndIntegratePatch(HandoffJSON, CurrentIntegrationBase):
  1. Provenance Check:
     Assert HandoffJSON.base_commit == CurrentIntegrationBase
     If mismatch:
       REJECT handoff: "Base commit mismatch. Rebase patch against current integration base."

  2. Patch Integrity Check:
     ComputedSHA = SHA256(HandoffJSON.patch_file)
     Assert ComputedSHA == HandoffJSON.patch_sha256
     If mismatch:
       REJECT handoff: "Patch file corrupted or modified after handoff."

  3. Ownership Allowlist Verification:
     Extract PatchPaths from `git apply --numstat HandoffJSON.patch_file`
     For each Path in PatchPaths:
       Assert Path in TaskAuthorizedAllowlist(HandoffJSON.task_id)
       Assert Path in HandoffJSON.changed_files
       Assert Path is NOT in ProtectedBaselineRunners
       Assert Path is NOT in FrozenMetadata
     If any assertion fails:
       REJECT handoff: "Patch modifies unauthorized or protected path."

  4. Clean Dry-Run Verification:
     Execute: `git apply --check HandoffJSON.patch_file`
     If exit code != 0:
       REJECT handoff: "Patch dry-run failed with conflicts."

  5. Application & Verification:
     Execute: `git apply HandoffJSON.patch_file`
     Execute: `node HandoffJSON.test_runner`
     Execute: All 9 baseline test runners
     If any runner fails:
       Execute SafeRollbackProtocol(HandoffJSON.patch_file)
       REJECT handoff: "Verification test suite failed."
```

---

## 5. Correct Safe Rollback Protocol

When verification fails after patch application, the coordinator executes the Safe Rollback Protocol:

```bash
# STEP 1: Verify that reverse apply can execute cleanly
if git apply --reverse --check "task-${TASK_ID}.patch"; then
    echo "Executing clean reverse patch rollback..."
    git apply --reverse "task-${TASK_ID}.patch"
    echo "Task changes cleanly reverted."
else
    echo "CRITICAL ERROR: Reverse apply check failed! Working tree contains unexpected intervening changes."
    echo "AUTOMATIC ROLLBACK HALTED to prevent destructive loss of sequential integrations."
    echo "Coordinator must invoke Manual Reconciliation Protocol using pre-task stash/snapshot."
    exit 1
fi
```

### Safety Invariants:
1. **Never Fall Back to `git checkout HEAD`:** The unsafe fallback is permanently removed.
2. **Halt on Ambiguity:** If `git apply --reverse --check` fails, the tool stops immediately, preserving all files and reporting the exact conflict.
3. **Pre-Task Integration Snapshot:** Prior to applying any patch, the coordinator takes an in-memory stash or working tree commit reference, allowing exact point-in-time recovery without blanket workspace wipes.
