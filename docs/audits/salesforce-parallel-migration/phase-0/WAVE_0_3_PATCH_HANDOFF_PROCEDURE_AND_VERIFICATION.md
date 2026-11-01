# Wave 0.3: Jules Agent Patch Handoff Procedure & Empirical Verification

## 1. Problem Formulation & Defect Analysis

In Wave 0.2, the isolated agent handoff procedure specified:
```bash
git diff > task-<TASK_ID>.patch
```

### Defect Impact:
By default, standard `git diff` only computes differences across tracked files. In a parallel Salesforce migration, new feature workstreams introduce entirely new LWC component bundles (e.g., `daRadarView`, `daTreemapView`, `daDiagnosticsView`, `daDiffEngine`, `daRefactoringEngine`), new Apex classes (e.g., `DAAnalysisRunSummaryDTO.cls`), metadata companions (`.js-meta.xml`, `.cls-meta.xml`), and new test runners (`run-wave6-tests.cjs`, etc.).
If an isolated agent executes `git diff > patch.patch`, **all newly created files and directories remain untracked and are silently omitted from the patch artifact**. The agent reports successful completion and passes local tests, but the handoff patch delivered to the coordinator is hollow, causing immediate integration failure or silent omissions.

Furthermore, naive alternatives such as `git add . && git diff --cached` are dangerous in multi-agent sandboxes because they indiscriminately stage unrelated scratch files, temporary logs, or unintended edits.

---

## 2. Corrected Authoritative Patch Generation Procedure

The corrected procedure relies on an **explicit manifest of changed files** combined with Git intent-to-add (`git add -N`) bounded strictly to task-assigned paths.

### 2.1 Step-by-Step Feature Agent Procedure
1. **Maintain Task-Scoped Changed File Manifest:**
   The agent records every path modified, created, or deleted as part of the task assignment.
2. **Intent-to-Add Newly Created and Modified Files:**
   For each created or modified path in the task manifest, execute:
   ```bash
   git add -N -- <path1> <path2> ...
   ```
   *Technical guarantee:* `git add -N` (intent-to-add) records that the path exists in the index without staging its contents. This allows `git diff` to treat newly created files as diffs against `/dev/null` (`new file mode 100644`).
3. **Generate Scoped Unified Patch:**
   Generate the unified patch targeting exclusively the manifest paths:
   ```bash
   git diff HEAD -- <path1> <path2> ... > task-<TASK_ID>.patch
   ```
4. **Self-Check Patch Completeness:**
   The agent validates that the generated patch contains all expected paths:
   ```bash
   git apply --stat task-<TASK_ID>.patch
   ```
5. **Verify Clean Intent-to-Add Teardown (if needed):**
   If the agent needs to unstage intent-to-add before other operations:
   ```bash
   git reset -- <path1> <path2> ...
   ```

---

## 3. Empirical Verification on Harmless Specimen

A rigorous technical verification was conducted using an isolated temporary git repository (`/tmp/wave03_specimen_handoff`) to empirically prove that all four change types are accurately captured, validated with `git apply --check`, and cleanly applied in a destination working tree.

### 3.1 Harmless Specimen Setup
The specimen baseline was initialized with three tracked files:
- `tracked_mod.txt`
- `tracked_del.txt`
- `tracked_untouched.txt`
The initial commit was created (`Initial baseline commit`).

Four distinct operations were then performed:
1. **Modified Tracked File:** Appended line to `tracked_mod.txt`.
2. **Deleted Tracked File:** Removed `tracked_del.txt`.
3. **Newly Created File:** Created untracked `new_root_file.js`.
4. **Newly Created Nested Directory & File:** Created untracked `force-app/main/default/lwc/daNewComponent/daNewComponent.js`.

### 3.2 Execution Commands & Observations

```bash
# Explicit changed files list
CHANGED_FILES=(
  "tracked_mod.txt"
  "tracked_del.txt"
  "new_root_file.js"
  "force-app/main/default/lwc/daNewComponent/daNewComponent.js"
)

# Step A: Intent-to-add existing paths in manifest
git add -N -- "${CHANGED_FILES[@]}"

# Step B: Generate diff against HEAD for manifest paths
git diff HEAD -- "${CHANGED_FILES[@]}" > task-test.patch
```

#### Observed Patch Content:
```diff
diff --git a/force-app/main/default/lwc/daNewComponent/daNewComponent.js b/force-app/main/default/lwc/daNewComponent/daNewComponent.js
new file mode 100644
index 0000000..98604a0
--- /dev/null
+++ b/force-app/main/default/lwc/daNewComponent/daNewComponent.js
@@ -0,0 +1 @@
+// newly created nested LWC file
diff --git a/new_root_file.js b/new_root_file.js
new file mode 100644
index 0000000..8f384a8
--- /dev/null
+++ b/new_root_file.js
@@ -0,0 +1 @@
+// newly created file
diff --git a/tracked_del.txt b/tracked_del.txt
deleted file mode 100644
index 4202011..0000000
--- a/tracked_del.txt
+++ /dev/null
@@ -1 +0,0 @@
-to be deleted
diff --git a/tracked_mod.txt b/tracked_mod.txt
index 4c609e8..38bbe97 100644
--- a/tracked_mod.txt
+++ b/tracked_mod.txt
@@ -1 +1,2 @@
 initial tracked content
+additional modified line
```

### 3.3 Destination Dry-Run & Application Verification
In a separate clean destination repository (`/tmp/wave03_specimen_dest` at baseline commit):
1. **Dry-Run Check:**
   ```bash
   git apply --check task-test.patch
   ```
   *Result:* Exit code `0`, stderr empty.
2. **Apply Patch:**
   ```bash
   git apply task-test.patch
   ```
   *Result:* Exit code `0`.
3. **Working Tree Verification:**
   - `new_root_file.js` exists with exact content.
   - `force-app/main/default/lwc/daNewComponent/daNewComponent.js` exists with exact content.
   - `tracked_del.txt` was cleanly removed.
   - `tracked_mod.txt` contains both initial and modified lines.
   - `tracked_untouched.txt` remained completely unmodified.

### 3.4 Cleanup
All temporary specimen directories (`/tmp/wave03_specimen_handoff` and `/tmp/wave03_specimen_dest`) were verified cleanly removed. Zero project files in `/app` were modified.

---

## 4. Verification Evidence Matrix

| Verification ID | Objective | Method / Command | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `VERIF-PATCH-01` | Intent-to-add for untracked files | `git add -N <paths>` | Untracked files visible in `git diff` | Diff contains `new file mode 100644` with `/dev/null` source | **PASS** |
| `VERIF-PATCH-02` | Include nested directories | Add nested LWC component path | Nested directories represented in patch | Correct relative path recorded in diff headers | **PASS** |
| `VERIF-PATCH-03` | Include deleted tracked files | Remove tracked file & diff | Diff contains `deleted file mode 100644` | Deleted file diff cleanly represented | **PASS** |
| `VERIF-PATCH-04` | Dry-run validation | `git apply --check task.patch` | Exit code 0 | Exit code 0, no rejects | **PASS** |
| `VERIF-PATCH-05` | Recreation fidelity | `git apply task.patch` | Destination matches source changes exactly | Exact match verified programmatically | **PASS** |
| `VERIF-PATCH-06` | Isolation & non-pollution | Target only manifest paths | Unrelated files omitted from patch | `tracked_untouched.txt` omitted from patch | **PASS** |
