# Wave 0.1: Git & Parallel Execution Governance Specification

**Status:** APPROVED & MANDATORY
**Target Environment:** Jules Agent Workspaces & Sandboxed Repository Checkout
**Scope:** Wave 5 through Wave 9 Implementation Dispatch

---

## 1. Verified Environment Capabilities & Constraints

We conducted environmental probing of git operations in the Jules container:
1. **Repository Status:** Shallow clone (`git rev-parse --is-shallow-repository` returns `true`).
2. **Current Branch:** `jules-15691906185275771090-6c195703`.
3. **Local Branch Creation:** Supported (`git branch <name>` functions normally).
4. **Git Worktree Support:**
   - Creating worktrees outside `/app` fails with permission denied on `../`.
   - Creating worktrees inside `/app` checks out all 2,211 files and creates heavy duplicate file I/O overhead.
5. **Multi-Agent Sandbox Constraints:**
   - Feature agents running concurrently in isolated agent instances do not share live filesystem memory unless running sequentially or coordinated through explicit branch handoffs.

---

## 2. Authorized Parallel Operating Model

To guarantee maximum stability, eliminate merge conflicts, and prevent accidental git state corruptions:

$$\mathbf{SERIALIZED\ INTEGRATION\ IN\ SINGLE\ CHECKOUT\ (COORDINATOR-LED)}$$

### 2.1 Role Definitions & Permissions

| Role | Permitted Actions | Strictly Prohibited Actions |
| :--- | :--- | :--- |
| **Feature Workstream Agent** (Waves 5, 6, 7, 8, 9) | - Edit assigned exclusive files in `scratch/salesforce-poc/`<br>- Create new component files in assigned directories<br>- Run local offline test runners (`node scratch/salesforce-poc/tests/...`) | - `git commit`<br>- `git merge`<br>- `git rebase`<br>- `git push`<br>- `git checkout` / branch switching<br>- Editing `daAppShell.*`<br>- Modifying `package.json` |
| **Integration Coordinator Agent** | - Inspect working tree diffs (`git status`, `git diff`)<br>- Verify collision absence against `WAVE_0_1_EXHAUSTIVE_FILE_OWNERSHIP_MATRIX.csv`<br>- Run regression test harness (all 9 suites)<br>- Perform Stage C shell wiring in `daAppShell.*`<br>- Stage files and create authoritative integration commits | - Modifying feature component logic without workstream lead sign-off<br>- Overwriting unverified code<br>- Bypassing regression test gates |

---

## 3. Step-by-Step Integration & Stop Conditions

When a feature lane completes its assigned component implementation:
1. **Verification Gate:** The workstream runs its dedicated test suite and confirms 100% pass rate.
2. **Handoff:** The workstream reports completion, changed files, and test output to the Coordinator.
3. **Collision Detection:** The Coordinator runs:
   ```bash
   git status -s
   ```
   and validates that all modified/added files belong exclusively to that workstream per the ownership matrix.
4. **Regression Run:** The Coordinator runs all 9 baseline suites (187 test executions) plus any new lane test suites.
5. **Commit Serialization:** If all gates pass, the Coordinator commits the changes with a standardized message:
   `feat(salesforce): integrate wave X lane Y (<component>)`
6. **Stop Conditions / Rollback:**
   - If any test fails, integration immediately halts.
   - If unowned or shared files (`daAppShell.*`, `daFilterSchema.js`, `package.json`) were touched, the Coordinator rejects the workstream and restores those files via `git checkout -- <file>`.
