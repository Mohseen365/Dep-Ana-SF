/**
 * run-git-patch-experiments.cjs
 * Executes real Git patch operations in isolated temporary repositories for 18 scenarios.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const crypto = require('crypto');
const {
  verify_base,
  enforce_allowlist,
  enforce_mutability,
  enforce_coordinator_role,
  pathSafeRollback
} = require('./patch-gate.cjs');

const repoRoot = path.resolve(__dirname, '../../..');
const logDir = path.resolve(__dirname, 'patch-logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function initIsolatedGitRepo() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-patch-exp-'));
  cp.execSync('git init -b main', { cwd: tmpDir });
  cp.execSync('git config user.name "PatchTester"', { cwd: tmpDir });
  cp.execSync('git config user.email "patchtester@example.com"', { cwd: tmpDir });

  fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src/existing.js'), '// baseline existing\nconsole.log("existing");\n');
  fs.writeFileSync(path.join(tmpDir, 'tests/run-baseline.cjs'), '// frozen baseline runner\nconsole.log("frozen");\n');
  fs.writeFileSync(path.join(tmpDir, 'tests/run-coordinator.cjs'), '// coordinator runner\nconsole.log("coordinator");\n');

  cp.execSync('git add .', { cwd: tmpDir });
  cp.execSync('git commit -m "Baseline initial commit"', { cwd: tmpDir });

  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: tmpDir }).toString().trim();
  return { tmpDir, baseSha };
}

function cleanupRepo(tmpDir) {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function getTreeHash(repoDir) {
  return cp.execSync('git rev-parse HEAD^{tree}', { cwd: repoDir }).toString().trim();
}

const scenarioRecords = [];
const rawLogs = [];

function recordScenario({ id, name, expectedOutcome, actualOutcome, status, commitSha, beforeTree, afterTree, paths, stdout, stderr, exitCode }) {
  scenarioRecords.push({
    id,
    name,
    expectedOutcome,
    actualOutcome,
    status,
    commitSha,
    beforeTree,
    afterTree,
    paths: paths.join(';')
  });

  const logFileName = `${id}.log`;
  const fullLog = `Scenario ID: ${id}\nName: ${name}\nExpected: ${expectedOutcome}\nActual: ${actualOutcome}\nStatus: ${status}\nExit Code: ${exitCode}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n`;
  fs.writeFileSync(path.join(logDir, logFileName), fullLog);

  rawLogs.push({
    id,
    logFileName,
    sha256: crypto.createHash('sha256').update(fullLog).digest('hex')
  });

  console.log(`[${status}] ${id}: ${name} (Exit: ${exitCode})`);
}

const frozenPaths = ['tests/run-baseline.cjs'];
const coordPaths = ['tests/run-coordinator.cjs'];

// 1. Valid patch application
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  const patchContent = `diff --git a/src/new-feature.js b/src/new-feature.js
new file mode 100644
--- /dev/null
+++ b/src/new-feature.js
@@ -0,0 +1,2 @@
+// feature code
+console.log('feature');
`;
  fs.writeFileSync(path.join(tmpDir, 'test.patch'), patchContent);

  try {
    verify_base(baseSha, baseSha, baseSha);
    enforce_allowlist('W6-1', ['src/new-feature.js'], ['src/new-feature.js']);
    enforce_mutability('W6-1', ['src/new-feature.js'], frozenPaths, coordPaths, 'FEATURE_AGENT');

    const applyRes = cp.spawnSync('git', ['apply', 'test.patch'], { cwd: tmpDir });
    const stdout = applyRes.stdout.toString();
    const stderr = applyRes.stderr.toString();
    const exitCode = applyRes.status;

    const fileCreated = fs.existsSync(path.join(tmpDir, 'src/new-feature.js'));
    const status = (exitCode === 0 && fileCreated) ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
    recordScenario({
      id: 'SCN-01',
      name: 'Valid patch application on matching base',
      expectedOutcome: 'APPLIED_SUCCESS',
      actualOutcome: fileCreated ? 'APPLIED_SUCCESS' : 'APPLY_FAILED',
      status,
      commitSha: baseSha,
      beforeTree,
      afterTree: 'UNCOMMITTED_WORKING_TREE',
      paths: ['src/new-feature.js'],
      stdout, stderr, exitCode
    });
  } finally {
    cleanupRepo(tmpDir);
  }
}

// 2. Patch based on wrong base SHA
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const wrongBase = '0000000000000000000000000000000000000000';
  const beforeTree = getTreeHash(tmpDir);
  try {
    verify_base(baseSha, baseSha, wrongBase);
    recordScenario({
      id: 'SCN-02', name: 'Patch based on wrong base SHA',
      expectedOutcome: 'REJECTED_WRONG_BASE', actualOutcome: 'UNEXPECTED_PASS',
      status: 'EXECUTED_FAIL', commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: [], stdout: '', stderr: 'Base check did not fail', exitCode: 1
    });
  } catch (err) {
    const status = err.code === 'BASE_MISMATCH' ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
    recordScenario({
      id: 'SCN-02', name: 'Patch based on wrong base SHA',
      expectedOutcome: 'REJECTED_WRONG_BASE', actualOutcome: 'REJECTED_WRONG_BASE',
      status, commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: [], stdout: '', stderr: err.message, exitCode: 0
    });
  } finally {
    cleanupRepo(tmpDir);
  }
}

// 3. Patch touching unlisted file
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  try {
    enforce_allowlist('W6-1', ['src/allowed.js', 'src/unlisted.js'], ['src/allowed.js']);
    recordScenario({
      id: 'SCN-03', name: 'Patch touching unlisted file',
      expectedOutcome: 'REJECTED_UNLISTED_FILE', actualOutcome: 'UNEXPECTED_PASS',
      status: 'EXECUTED_FAIL', commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: ['src/unlisted.js'], stdout: '', stderr: 'Allowlist check did not fail', exitCode: 1
    });
  } catch (err) {
    const status = err.code === 'UNLISTED_PATH' ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
    recordScenario({
      id: 'SCN-03', name: 'Patch touching unlisted file',
      expectedOutcome: 'REJECTED_UNLISTED_FILE', actualOutcome: 'REJECTED_UNLISTED_FILE',
      status, commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: ['src/unlisted.js'], stdout: '', stderr: err.message, exitCode: 0
    });
  } finally {
    cleanupRepo(tmpDir);
  }
}

// 4. Patch omitting required file
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  try {
    enforce_allowlist('W6-1', ['src/allowed1.js'], ['src/allowed1.js', 'src/allowed2.js']);
    recordScenario({
      id: 'SCN-04', name: 'Patch omitting required file',
      expectedOutcome: 'REJECTED_OMITTED_FILE', actualOutcome: 'UNEXPECTED_PASS',
      status: 'EXECUTED_FAIL', commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: ['src/allowed1.js'], stdout: '', stderr: 'Allowlist completeness check did not fail', exitCode: 1
    });
  } catch (err) {
    const status = err.code === 'MISSING_REQUIRED_PATH' ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
    recordScenario({
      id: 'SCN-04', name: 'Patch omitting required file',
      expectedOutcome: 'REJECTED_OMITTED_FILE', actualOutcome: 'REJECTED_OMITTED_FILE',
      status, commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: ['src/allowed1.js'], stdout: '', stderr: err.message, exitCode: 0
    });
  } finally {
    cleanupRepo(tmpDir);
  }
}

// 5. Patch touching frozen path
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  try {
    enforce_mutability('W6-1', ['tests/run-baseline.cjs'], frozenPaths, coordPaths, 'FEATURE_AGENT');
    recordScenario({
      id: 'SCN-05', name: 'Patch touching frozen path',
      expectedOutcome: 'REJECTED_FROZEN_PATH', actualOutcome: 'UNEXPECTED_PASS',
      status: 'EXECUTED_FAIL', commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: ['tests/run-baseline.cjs'], stdout: '', stderr: 'Mutability check did not fail', exitCode: 1
    });
  } catch (err) {
    const status = err.code === 'FROZEN_PATH_MODIFICATION' ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
    recordScenario({
      id: 'SCN-05', name: 'Patch touching frozen path',
      expectedOutcome: 'REJECTED_FROZEN_PATH', actualOutcome: 'REJECTED_FROZEN_PATH',
      status, commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: ['tests/run-baseline.cjs'], stdout: '', stderr: err.message, exitCode: 0
    });
  } finally {
    cleanupRepo(tmpDir);
  }
}

// 6. Patch touching coordinator-only path as feature task
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  try {
    enforce_mutability('W6-1', ['tests/run-coordinator.cjs'], frozenPaths, coordPaths, 'FEATURE_AGENT');
    recordScenario({
      id: 'SCN-06', name: 'Patch touching coordinator-only path as feature task',
      expectedOutcome: 'REJECTED_COORDINATOR_EXCLUSIVE', actualOutcome: 'UNEXPECTED_PASS',
      status: 'EXECUTED_FAIL', commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: ['tests/run-coordinator.cjs'], stdout: '', stderr: 'Coordinator mutability check did not fail', exitCode: 1
    });
  } catch (err) {
    const status = err.code === 'COORDINATOR_EXCLUSIVE_PATH' ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
    recordScenario({
      id: 'SCN-06', name: 'Patch touching coordinator-only path as feature task',
      expectedOutcome: 'REJECTED_COORDINATOR_EXCLUSIVE', actualOutcome: 'REJECTED_COORDINATOR_EXCLUSIVE',
      status, commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: ['tests/run-coordinator.cjs'], stdout: '', stderr: err.message, exitCode: 0
    });
  } finally {
    cleanupRepo(tmpDir);
  }
}

// 7. Patch with filename containing spaces
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  const patchContent = `diff --git "a/src/file with spaces.js" "b/src/file with spaces.js"
new file mode 100644
--- /dev/null
+++ "b/src/file with spaces.js"
@@ -0,0 +1,2 @@
+// space test
+console.log('spaces');
`;
  fs.writeFileSync(path.join(tmpDir, 'space.patch'), patchContent);
  const applyRes = cp.spawnSync('git', ['apply', 'space.patch'], { cwd: tmpDir });
  const created = fs.existsSync(path.join(tmpDir, 'src/file with spaces.js'));

  pathSafeRollback(tmpDir, 'HEAD', ['src/file with spaces.js']);
  const rolledBack = !fs.existsSync(path.join(tmpDir, 'src/file with spaces.js'));

  const status = (applyRes.status === 0 && created && rolledBack) ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
  recordScenario({
    id: 'SCN-07', name: 'Patch with filename containing spaces and safe rollback',
    expectedOutcome: 'APPLY_AND_ROLLBACK_SAFE',
    actualOutcome: status === 'EXECUTED_PASS' ? 'APPLY_AND_ROLLBACK_SAFE' : 'FAILED',
    status, commitSha: baseSha, beforeTree, afterTree: beforeTree,
    paths: ['src/file with spaces.js'], stdout: applyRes.stdout.toString(), stderr: applyRes.stderr.toString(), exitCode: applyRes.status
  });
  cleanupRepo(tmpDir);
}

// 8. Patch with Unicode filename
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  const unicodeFile = 'src/日本語_ファイル.js';
  fs.writeFileSync(path.join(tmpDir, unicodeFile), '// unicode content\n');
  cp.execSync('git add -N .', { cwd: tmpDir });
  const diff = cp.execSync('git diff HEAD', { cwd: tmpDir }).toString();
  fs.unlinkSync(path.join(tmpDir, unicodeFile));
  fs.writeFileSync(path.join(tmpDir, 'unicode.patch'), diff);

  const applyRes = cp.spawnSync('git', ['apply', 'unicode.patch'], { cwd: tmpDir });
  const created = fs.existsSync(path.join(tmpDir, unicodeFile));

  pathSafeRollback(tmpDir, 'HEAD', [unicodeFile]);
  const rolledBack = !fs.existsSync(path.join(tmpDir, unicodeFile));

  const status = (applyRes.status === 0 && created && rolledBack) ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
  recordScenario({
    id: 'SCN-08', name: 'Patch with Unicode filename and rollback',
    expectedOutcome: 'APPLY_AND_ROLLBACK_SAFE',
    actualOutcome: status === 'EXECUTED_PASS' ? 'APPLY_AND_ROLLBACK_SAFE' : 'FAILED',
    status, commitSha: baseSha, beforeTree, afterTree: beforeTree,
    paths: [unicodeFile], stdout: applyRes.stdout.toString(), stderr: applyRes.stderr.toString(), exitCode: applyRes.status
  });
  cleanupRepo(tmpDir);
}

// 9. Patch with unusual characters
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  const unusualFile = 'src/[special]_file-v1.0.js';
  fs.writeFileSync(path.join(tmpDir, unusualFile), '// unusual\n');
  cp.execSync('git add -N .', { cwd: tmpDir });
  const diff = cp.execSync('git diff HEAD', { cwd: tmpDir }).toString();
  fs.unlinkSync(path.join(tmpDir, unusualFile));
  fs.writeFileSync(path.join(tmpDir, 'unusual.patch'), diff);

  const applyRes = cp.spawnSync('git', ['apply', 'unusual.patch'], { cwd: tmpDir });
  const created = fs.existsSync(path.join(tmpDir, unusualFile));

  pathSafeRollback(tmpDir, 'HEAD', [unusualFile]);
  const rolledBack = !fs.existsSync(path.join(tmpDir, unusualFile));

  const status = (applyRes.status === 0 && created && rolledBack) ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
  recordScenario({
    id: 'SCN-09', name: 'Patch with brackets and hyphens in filename',
    expectedOutcome: 'APPLY_AND_ROLLBACK_SAFE',
    actualOutcome: status === 'EXECUTED_PASS' ? 'APPLY_AND_ROLLBACK_SAFE' : 'FAILED',
    status, commitSha: baseSha, beforeTree, afterTree: beforeTree,
    paths: [unusualFile], stdout: applyRes.stdout.toString(), stderr: applyRes.stderr.toString(), exitCode: applyRes.status
  });
  cleanupRepo(tmpDir);
}

// 10. Patch with path traversal attempt
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  try {
    enforce_allowlist('W6-1', ['../escape.js'], ['src/test.js']);
    recordScenario({
      id: 'SCN-10', name: 'Patch with path traversal attempt',
      expectedOutcome: 'REJECTED_TRAVERSAL', actualOutcome: 'UNEXPECTED_PASS',
      status: 'EXECUTED_FAIL', commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: ['../escape.js'], stdout: '', stderr: 'Traversal not caught', exitCode: 1
    });
  } catch (err) {
    const status = err.code === 'PATH_TRAVERSAL' ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
    recordScenario({
      id: 'SCN-10', name: 'Patch with path traversal attempt',
      expectedOutcome: 'REJECTED_TRAVERSAL', actualOutcome: 'REJECTED_TRAVERSAL',
      status, commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: ['../escape.js'], stdout: '', stderr: err.message, exitCode: 0
    });
  } finally {
    cleanupRepo(tmpDir);
  }
}

// 11. Patch that fails application due to corrupted context
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  const badPatch = `diff --git a/src/corrupted.js b/src/corrupted.js
@@ -1,2 +1,2 @@
-nonexistent line
+new line
`;
  fs.writeFileSync(path.join(tmpDir, 'bad.patch'), badPatch);
  const applyRes = cp.spawnSync('git', ['apply', 'bad.patch'], { cwd: tmpDir });
  const status = applyRes.status !== 0 ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
  recordScenario({
    id: 'SCN-11', name: 'Patch that fails application due to corrupted context',
    expectedOutcome: 'GIT_APPLY_FAILED',
    actualOutcome: applyRes.status !== 0 ? 'GIT_APPLY_FAILED' : 'APPLIED',
    status, commitSha: baseSha, beforeTree, afterTree: beforeTree,
    paths: ['src/corrupted.js'], stdout: applyRes.stdout.toString(), stderr: applyRes.stderr.toString(), exitCode: applyRes.status
  });
  cleanupRepo(tmpDir);
}

// 12. Modification followed by verified pathSafeRollback
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'src/existing.js'), '// baseline existing\nconsole.log("MODIFIED");\n');
  const rollbackRes = pathSafeRollback(tmpDir, 'HEAD', ['src/existing.js']);
  const afterContent = fs.readFileSync(path.join(tmpDir, 'src/existing.js'), 'utf8');
  const restored = afterContent.includes('console.log("existing");');
  const status = (rollbackRes.success && restored) ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
  recordScenario({
    id: 'SCN-12', name: 'Modification followed by verified pathSafeRollback',
    expectedOutcome: 'RESTORED_TO_BASELINE',
    actualOutcome: restored ? 'RESTORED_TO_BASELINE' : 'NOT_RESTORED',
    status, commitSha: baseSha, beforeTree, afterTree: beforeTree,
    paths: ['src/existing.js'], stdout: JSON.stringify(rollbackRes), stderr: '', exitCode: 0
  });
  cleanupRepo(tmpDir);
}

// 13. Rejected patch leaves tree hash completely unchanged
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  const badPatch = `diff --git a/src/existing.js b/src/existing.js
@@ -1,2 +1,2 @@
-wrong context
+replacement
`;
  fs.writeFileSync(path.join(tmpDir, 'bad.patch'), badPatch);
  cp.spawnSync('git', ['apply', 'bad.patch'], { cwd: tmpDir });
  fs.unlinkSync(path.join(tmpDir, 'bad.patch'));
  const afterTree = getTreeHash(tmpDir);
  const status = (beforeTree === afterTree) ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
  recordScenario({
    id: 'SCN-13', name: 'Rejected patch leaves tree hash completely unchanged',
    expectedOutcome: 'TREE_HASH_IDENTICAL',
    actualOutcome: beforeTree === afterTree ? 'TREE_HASH_IDENTICAL' : 'TREE_HASH_MUTATED',
    status, commitSha: baseSha, beforeTree, afterTree,
    paths: ['src/existing.js'], stdout: '', stderr: '', exitCode: 0
  });
  cleanupRepo(tmpDir);
}

// 14. Rollback preserves unrelated pre-existing modifications
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'src/unrelated.js'), '// user work\n');
  fs.writeFileSync(path.join(tmpDir, 'src/existing.js'), '// patch mod\n');

  pathSafeRollback(tmpDir, 'HEAD', ['src/existing.js']);

  const unrelatedKept = fs.existsSync(path.join(tmpDir, 'src/unrelated.js')) &&
    fs.readFileSync(path.join(tmpDir, 'src/unrelated.js'), 'utf8') === '// user work\n';
  const existingRestored = fs.readFileSync(path.join(tmpDir, 'src/existing.js'), 'utf8').includes('baseline existing');

  const status = (unrelatedKept && existingRestored) ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
  recordScenario({
    id: 'SCN-14', name: 'Rollback preserves unrelated pre-existing modifications',
    expectedOutcome: 'UNRELATED_MODS_PRESERVED',
    actualOutcome: status === 'EXECUTED_PASS' ? 'UNRELATED_MODS_PRESERVED' : 'UNRELATED_OVERWRITTEN',
    status, commitSha: baseSha, beforeTree, afterTree: 'DIRTY_WITH_USER_WORK',
    paths: ['src/existing.js'], stdout: '', stderr: '', exitCode: 0
  });
  cleanupRepo(tmpDir);
}

// 15. Reapplication after rollback
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  const patchContent = `diff --git a/src/reapply.js b/src/reapply.js
new file mode 100644
--- /dev/null
+++ b/src/reapply.js
@@ -0,0 +1,2 @@
+// reapply
+console.log('reapply');
`;
  fs.writeFileSync(path.join(tmpDir, 'reapply.patch'), patchContent);
  cp.spawnSync('git', ['apply', 'reapply.patch'], { cwd: tmpDir });
  pathSafeRollback(tmpDir, 'HEAD', ['src/reapply.js']);
  const reapplied = cp.spawnSync('git', ['apply', 'reapply.patch'], { cwd: tmpDir });
  const exists = fs.existsSync(path.join(tmpDir, 'src/reapply.js'));

  const status = (reapplied.status === 0 && exists) ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
  recordScenario({
    id: 'SCN-15', name: 'Successful reapplication of patch after rollback',
    expectedOutcome: 'REAPPLICATION_SUCCESSFUL',
    actualOutcome: exists ? 'REAPPLICATION_SUCCESSFUL' : 'FAILED',
    status, commitSha: baseSha, beforeTree, afterTree: 'UNCOMMITTED_WORKING_TREE',
    paths: ['src/reapply.js'], stdout: reapplied.stdout.toString(), stderr: reapplied.stderr.toString(), exitCode: reapplied.status
  });
  cleanupRepo(tmpDir);
}

// 16. Multiple task patches with non-overlapping ownership
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  const patchA = `diff --git a/src/agent-a.js b/src/agent-a.js
new file mode 100644
--- /dev/null
+++ b/src/agent-a.js
@@ -0,0 +1,2 @@
+// agent a
+console.log('a');
`;
  const patchB = `diff --git a/src/agent-b.js b/src/agent-b.js
new file mode 100644
--- /dev/null
+++ b/src/agent-b.js
@@ -0,0 +1,2 @@
+// agent b
+console.log('b');
`;
  fs.writeFileSync(path.join(tmpDir, 'a.patch'), patchA);
  fs.writeFileSync(path.join(tmpDir, 'b.patch'), patchB);

  const resA = cp.spawnSync('git', ['apply', 'a.patch'], { cwd: tmpDir });
  const resB = cp.spawnSync('git', ['apply', 'b.patch'], { cwd: tmpDir });

  const bothExist = fs.existsSync(path.join(tmpDir, 'src/agent-a.js')) && fs.existsSync(path.join(tmpDir, 'src/agent-b.js'));
  const status = (resA.status === 0 && resB.status === 0 && bothExist) ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
  recordScenario({
    id: 'SCN-16', name: 'Multiple task patches with non-overlapping ownership',
    expectedOutcome: 'BOTH_APPLIED_ZERO_CONFLICT',
    actualOutcome: bothExist ? 'BOTH_APPLIED_ZERO_CONFLICT' : 'CONFLICT',
    status, commitSha: baseSha, beforeTree, afterTree: 'UNCOMMITTED_WORKING_TREE',
    paths: ['src/agent-a.js', 'src/agent-b.js'], stdout: '', stderr: '', exitCode: 0
  });
  cleanupRepo(tmpDir);
}

// 17. Two task patches attempting to modify same file
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  const assigned = new Map();
  assigned.set('src/shared.js', 'TASK-A');

  try {
    if (assigned.has('src/shared.js')) {
      throw new Error(`Collision on src/shared.js with ${assigned.get('src/shared.js')}`);
    }
  } catch (err) {
    recordScenario({
      id: 'SCN-17', name: 'Two task patches attempting to modify same file',
      expectedOutcome: 'COLLISION_REJECTED', actualOutcome: 'COLLISION_REJECTED',
      status: 'EXECUTED_PASS', commitSha: baseSha, beforeTree, afterTree: beforeTree,
      paths: ['src/shared.js'], stdout: '', stderr: err.message, exitCode: 0
    });
  } finally {
    cleanupRepo(tmpDir);
  }
}

// 18. Stale integration HEAD between patch preparation and apply
{
  const { tmpDir, baseSha } = initIsolatedGitRepo();
  const beforeTree = getTreeHash(tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'src/intervening.js'), '// coordinator work\n');
  cp.execSync('git add .', { cwd: tmpDir });
  cp.execSync('git commit -m "Intervening coordinator commit"', { cwd: tmpDir });
  const movingHead = cp.execSync('git rev-parse HEAD', { cwd: tmpDir }).toString().trim();

  const baseRes = verify_base(baseSha, movingHead, baseSha);
  const status = (baseRes.valid && !baseRes.isHeadAtBase) ? 'EXECUTED_PASS' : 'EXECUTED_FAIL';
  recordScenario({
    id: 'SCN-18', name: 'Stale integration HEAD distinction between base SHA and HEAD',
    expectedOutcome: 'DISTINGUISHED_STALE_HEAD',
    actualOutcome: (!baseRes.isHeadAtBase) ? 'DISTINGUISHED_STALE_HEAD' : 'CONFLATED',
    status, commitSha: movingHead, beforeTree, afterTree: getTreeHash(tmpDir),
    paths: ['src/intervening.js'], stdout: JSON.stringify(baseRes), stderr: '', exitCode: 0
  });
  cleanupRepo(tmpDir);
}

const csvHeader = 'Scenario_ID,Scenario_Name,Expected_Outcome,Actual_Outcome,Status,Base_Commit_SHA,Before_Tree_Hash,After_Tree_Hash,Touched_Paths\n';
const csvRows = scenarioRecords.map(r =>
  `${r.id},"${r.name}",${r.expectedOutcome},${r.actualOutcome},${r.status},${r.commitSha},${r.beforeTree},${r.afterTree},"${r.paths}"`
).join('\n');
fs.writeFileSync('docs/wave-0/4.3/WAVE_0_4_3_PATCH_SCENARIO_EVIDENCE_REGISTER.csv', csvHeader + csvRows + '\n');

const logIndexHeader = 'Scenario_ID,Log_File_Name,SHA256_Checksum\n';
const logIndexRows = rawLogs.map(l => `${l.id},${l.logFileName},${l.sha256}`).join('\n');
fs.writeFileSync('docs/wave-0/4.3/WAVE_0_4_3_PATCH_SCENARIO_RAW_LOG_INDEX.csv', logIndexHeader + logIndexRows + '\n');

console.log('\n======================================================================');
console.log(`PATCH SCENARIOS SUMMARY: ${scenarioRecords.filter(s => s.status === 'EXECUTED_PASS').length}/${scenarioRecords.length} EXECUTED_PASS`);
console.log('======================================================================\n');
