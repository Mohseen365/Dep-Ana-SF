# Wave 0.3: Task-Scoped Rollback Procedure & Empirical Verification

## 1. Problem Formulation & Defect Analysis

In Wave 0.2, the coordinator integration runbook specified coarse, directory-wide rollback commands:
```bash
git checkout -- scratch/salesforce-poc/
git clean -fd scratch/salesforce-poc/
```

### Defect Impact:
1. **Destructive Clobbering of Unrelated Tracked Files:** `git checkout -- scratch/salesforce-poc/` reverts *all* modified files in `scratch/salesforce-poc/`, including changes made by prior integrated tasks, coordinator configurations, or other ongoing inspections.
2. **Catastrophic Deletion of Unrelated Untracked Files:** `git clean -fd scratch/salesforce-poc/` forcibly deletes *every* untracked file and directory under `scratch/salesforce-poc/`. In an environment where multiple agents or coordinators maintain uncommitted test logs, draft specifications, or workstream evidence files, `git clean -fd` permanently obliterates unrelated work.
3. **Misleading Classification:** Describing these coarse reset commands as "non-destructive rollback" is factually incorrect and introduces severe operational risk.

---

## 2. Corrected Authoritative Task-Scoped Rollback Procedure

The corrected procedure operates strictly on the **task-scoped changed-file manifest** or uses patch-specific reversal (`git apply --reverse`). It never executes wholesale directory checkouts or untracked directory wipes.

### 2.1 Rollback Protocol Using Task Manifest

When an applied task patch fails integration checks, unit tests, or the baseline regression suite:

#### Step 1: Validate Target Rollback Manifest
The coordinator verifies the list of files touched by the failed task (`TASK_FILES`):
```bash
# Example for task W5-1:
TASK_FILES=(
  "scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js"
  "scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html"
)
```

#### Step 2: Preferred Mechanism A — Patch-Specific Reversal
If the patch was applied cleanly via `git apply task-<ID>.patch`:
```bash
# Dry run the reversal
git apply --reverse --check task-<TASK_ID>.patch

# Execute the reversal
git apply --reverse task-<TASK_ID>.patch
```
*Technical guarantee:* Reversing the exact patch undoes modifications, restores deleted files, and deletes created files that were in the patch without touching any other file in the repository.

#### Step 3: Fallback Mechanism B — Manifest-Bounded Reversion
If the patch cannot be reversed cleanly (or manual edits occurred):
1. **Revert Task-Modified Tracked Files Only:**
   ```bash
   git checkout HEAD -- "${TASK_TRACKED_FILES[@]}"
   ```
2. **Remove Task-Created Untracked Files Only:**
   ```bash
   for file in "${TASK_UNTRACKED_FILES[@]}"; do
     if [ -f "$file" ]; then
       rm -f "$file"
     fi
   done
   # Remove empty parent directory if created solely for this task component
   rmdir --ignore-fail-on-non-empty -p "scratch/salesforce-poc/force-app/main/default/lwc/<newComponent>" 2>/dev/null || true
   ```
3. **Verify Residual Working Tree:**
   ```bash
   git status --porcelain
   ```
   Confirm that unrelated modified files and unrelated untracked files remain intact, and only the failed task's modifications have been reverted.

---

## 3. Empirical Verification on Harmless Specimen

A technical verification was executed in an isolated temporary specimen repository (`/tmp/wave03_specimen_rollback`) to prove that task-scoped rollback reverts task changes while preserving unrelated work.

### 3.1 Specimen State Setup
The baseline repository was initialized with:
- `unrelated_tracked.txt`
- `task_tracked.txt`
Committed as baseline HEAD.

Four distinct files/states were then introduced simultaneously:
1. **Unrelated Modified Tracked File:** Appended `"unrelated in-flight work\n"` to `unrelated_tracked.txt`.
2. **Unrelated Untracked File:** Created `unrelated_untracked.txt` containing `"unrelated temporary notes\n"`.
3. **Task Modified Tracked File:** Appended `"task feature code addition\n"` to `task_tracked.txt`.
4. **Task Created Untracked File:** Created `force-app/main/default/lwc/taskNewComp/taskNewComp.js`.

### 3.2 Pre-Rollback Observed Status
```
 M task_tracked.txt
 M unrelated_tracked.txt
?? force-app/
?? unrelated_untracked.txt
```

### 3.3 Rollback Execution
The manifest-bounded rollback procedure was executed targeting exclusively `task_tracked.txt` and `force-app/main/default/lwc/taskNewComp/taskNewComp.js`:
1. `git checkout HEAD -- task_tracked.txt`
2. `rm -f force-app/main/default/lwc/taskNewComp/taskNewComp.js`
3. Removed newly created empty directories `force-app/main/default/lwc/taskNewComp`, etc.

### 3.4 Post-Rollback Observed Status
```
 M unrelated_tracked.txt
?? unrelated_untracked.txt
```

### 3.5 Automated Verification Invariants
- `unrelated_tracked.txt`: Still modified, containing `"unrelated in-flight work"`. **Preserved.**
- `unrelated_untracked.txt`: Still present, containing `"unrelated temporary notes"`. **Preserved.**
- `task_tracked.txt`: Reverted to exact baseline HEAD content. **Reverted.**
- `taskNewComp.js` and directory: Completely removed. **Reverted.**
- Unrelated project files: Zero unintended deletions.

### 3.6 Cleanup
The temporary specimen directory was cleanly removed with zero impact on `/app`.

---

## 4. Verification Evidence Matrix

| Verification ID | Objective | Method / Command | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `VERIF-ROLLBACK-01` | Preserve unrelated tracked modifications | Task-scoped checkout of task files only | Unrelated modified files retain edits | `unrelated_tracked.txt` retained modifications | **PASS** |
| `VERIF-ROLLBACK-02` | Preserve unrelated untracked files | Targeted deletion of task files only | Unrelated untracked files remain intact | `unrelated_untracked.txt` remained present and unchanged | **PASS** |
| `VERIF-ROLLBACK-03` | Revert task tracked modifications | `git checkout HEAD -- <task_files>` | Task files restored to HEAD baseline | `task_tracked.txt` cleanly restored | **PASS** |
| `VERIF-ROLLBACK-04` | Clean task untracked files & dirs | Targeted `rm` and `rmdir -p` | Task component removed cleanly | Task file and nested folder cleanly deleted | **PASS** |
| `VERIF-ROLLBACK-05` | Zero repository pollution | Cleanup `/tmp` specimen | Repository `/app` unaffected | Working tree in `/app` remained clean | **PASS** |
