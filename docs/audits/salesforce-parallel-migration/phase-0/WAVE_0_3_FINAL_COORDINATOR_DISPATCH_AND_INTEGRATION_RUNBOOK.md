# Wave 0.3: Final Coordinator Dispatch and Integration Runbook

## 1. Governance Principles & Coordinator Mandate

The Salesforce migration execution is governed by three non-negotiable principles:
1. **Single-Writer Working Tree Guarantee:** Only the Integration Coordinator is authorized to stage, commit, or merge changes to the integration branch.
2. **Deterministic Patch Handoff:** Parallel Jules feature agents work in isolated sandboxes and communicate strictly via structured handoff packages containing unified diffs generated via intent-to-add (`git add -N`) targeting explicit task manifests.
3. **Immutable Baseline Test Gate:** All nine existing baseline test runners (`run-poc-tests.cjs`, `run-wave4-integration-suite.cjs`, etc.) are 100% frozen. Every integrated change must achieve 187/187 passing test outcomes across these baseline runners with zero modifications to the runners themselves.

---

## 2. Stage A — Coordinator Preparation & Environmental Verification

Before dispatching any feature task:
1. **Confirm Clean Repository State:**
   ```bash
   git status --porcelain
   ```
   *Pass Condition:* Strictly empty output (working tree clean, zero uncommitted changes).
2. **Record Integration Base Commit:**
   ```bash
   BASE_HEAD=$(git rev-parse HEAD)
   echo "Base commit: $BASE_HEAD"
   ```
3. **Verify Baseline Test Harness:**
   Execute all 9 baseline suites:
   ```bash
   node scratch/salesforce-poc/tests/run-poc-tests.cjs
   node scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs
   node scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs
   node scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs
   node scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs
   node scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs
   node scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs
   node scratch/salesforce-poc/tests/run-workstream-a-tests.cjs
   node scratch/salesforce-poc/tests/run-workstream-c-tests.cjs
   ```
   *Pass Condition:* Exactly 187/187 test executions report `PASSED`. Zero failures.
4. **Confirm Environment Capabilities:**
   - Node.js >= 20 (verified v22.22.1).
   - Playwright CLI and Chromium binary verified in cache.
   - Note that offline emulation is the authoritative gate; do not attempt `sfdx-lwc-jest`.

---

## 3. Stage B — Corrected Implementation Dispatch Strategy

### 3.1 Corrected Launch Metrics
- **Total Feature Tasks:** 20 (`W5-1..6`, `W6-1..4`, `W7-P1`, `W7-1..3`, `W8-1..3`, `W9-1..3`)
- **Integration Task:** 1 (`INT-1`)
- **Immediately Launchable Tasks:** **11**
  - Wave 5: `W5-1` (Workstream A Lead)
  - Wave 6: `W6-1`, `W6-2`, `W6-3`, `W6-4` (Workstream B Lead)
  - Wave 7: `W7-P1`, `W7-1`, `W7-2` (Workstream C Lead)
  - Wave 8: `W8-1`, `W8-2` (Workstream D Lead)
  - Wave 9: `W9-1` (Workstream E Lead)
- **Implementation-Dependent Tasks:** **9**
  - Wave 5: `W5-2`, `W5-3`, `W5-4`, `W5-5`, `W5-6` (Serialized under Workstream A to eliminate `daGraphViewer` write collisions)
  - Wave 7: `W7-3` (Awaits `W7-P1`)
  - Wave 8: `W8-3` (Awaits `W8-2` and `W7-P1`)
  - Wave 9: `W9-2`, `W9-3` (Await `W9-1`)
- **Coordinator Only:** **1** (`INT-1`)

### 3.2 Dispatch Instructions per Workstream

#### Workstream A (Wave 5: Deep Graph & Layouts)
- **Launch Mode:** Dispatched strictly as a serialized sequence or single unified bundle (`W5-BUNDLE`).
- **Initial Task:** `W5-1` (Shell Layout Switcher).
- **Prohibited:** Concurrently dispatching `W5-4`, `W5-5`, or `W5-6` while `W5-1` is in progress.
- **Dedicated Runner:** `scratch/salesforce-poc/tests/run-wave5-tests.cjs`.

#### Workstream B (Wave 6: Analytical Views)
- **Launch Mode:** 4 parallel tasks (`W6-1`, `W6-2`, `W6-3`, `W6-4`) into separate new component directories:
  - `daRadarView`, `daTreemapView`, `daSubwayView`, `daHotspotsView`.
- **Dedicated Runner:** `scratch/salesforce-poc/tests/run-wave6-tests.cjs`.

#### Workstream C (Wave 7: Diagnostics & History)
- **Launch Mode:**
  - `W7-P1`: Minimal History API (Contract A in `DAGraphController.cls`, `DAAnalysisRunSummaryDTO.cls`, `DAGraphControllerTest.cls`).
  - `W7-1` & `W7-2`: Dispatched concurrently (`daDiagnosticsView`, `daArchitectureDnaBarcode`).
  - `W7-3` (`daAnalysisHistoryView`): Held until `W7-P1` is integrated.
- **Dedicated Runner:** `scratch/salesforce-poc/tests/run-wave7-tests.cjs`.

#### Workstream D (Wave 8: Investigation & Compare)
- **Launch Mode:**
  - `W8-1` & `W8-2`: Dispatched concurrently (`daInvestigationDrawer`, `daDiffEngine`).
  - `W8-3` (`daCompareView`): Held until `W8-2` and `W7-P1` are integrated.
- **Dedicated Runner:** `scratch/salesforce-poc/tests/run-wave8-tests.cjs`.

#### Workstream E (Wave 9: Refactoring Simulation)
- **Launch Mode:**
  - `W9-1`: Dispatched immediately (`daRefactoringEngine` pure math).
  - `W9-2` & `W9-3`: Held until `W9-1` is integrated.
- **Dedicated Runner:** `scratch/salesforce-poc/tests/run-wave9-tests.cjs`.

---

## 4. Stage C — Coordinator Serialized Integration Sequence

For every completed feature task submitted by an agent:

1. **Step 1: Ingest Handoff Artifact Package:**
   Verify presence of `task_id`, `changed_files`, `patch_file`, and test logs.
2. **Step 2: Programmatic Ownership Audit:**
   Verify every path in `changed_files` against `WAVE_0_3_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv`.
   *Rule:* If any path is out-of-scope or belongs to the 9 immutable runners, **reject immediately**.
3. **Step 3: Dry-Run Patch Validation:**
   ```bash
   git apply --check task-<TASK_ID>.patch
   ```
   *Pass Condition:* Exit code 0, zero rejects, zero context drift errors.
4. **Step 4: Apply Patch:**
   ```bash
   git apply task-<TASK_ID>.patch
   ```
5. **Step 5: Execute Lane-Specific Test Suite:**
   ```bash
   node scratch/salesforce-poc/tests/run-wave<W>-tests.cjs
   ```
   *Pass Condition:* Exit code 0, 100% of new unit tests pass.
6. **Step 6: Execute Full 9-Suite Immutable Baseline Gate:**
   Execute all 9 baseline suites.
   *Pass Condition:* Exactly 187/187 test executions pass. Zero regressions.
7. **Step 7: Verify Baseline Runner Immutability:**
   ```bash
   git diff --name-only HEAD -- scratch/salesforce-poc/tests/
   ```
   *Pass Condition:* Only the newly allocated wave runner (e.g. `run-wave6-tests.cjs`) may appear in diffs. None of the 9 baseline runners may show any modifications.
8. **Step 8: Task-Scoped Rollback on Failure:**
   If any step fails, execute the task-scoped rollback:
   ```bash
   git apply --reverse task-<TASK_ID>.patch || git checkout HEAD -- "${TASK_TRACKED_FILES[@]}"
   ```
   Remove task untracked files. Working tree returns to clean baseline.
9. **Step 9: Coordinator Commit:**
   Commit the integrated work to the integration branch:
   ```bash
   git add -- "${CHANGED_FILES[@]}"
   git commit -m "feat(wave-${W}): integrate task ${TASK_ID} - ${DESCRIPTION}"
   ```

---

## 5. Stage D — Final Human Authorization Gate Criteria

Before requesting human authorization to merge to `main` or begin production deployment:
1. All 20 feature tasks integrated with passing wave test suites.
2. All 9 immutable baseline test runners passing with 187/187 test executions.
3. Cross-lane integration harness (`run-wave4-integration-suite.cjs` + new shell integration suite) passing 100%.
4. Frozen invariants reverified:
   - `SELECTION != NAVIGATION` verified across all new analytical views.
   - Project-scoped data security verified under `WITH USER_MODE`.
   - Chunk sequence and UTF-16 surrogate-pair integrity verified.
5. Clean Git diff review with zero unexpected modifications outside migration boundaries.
