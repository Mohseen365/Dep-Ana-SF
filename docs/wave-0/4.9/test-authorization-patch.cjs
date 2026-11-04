/**
 * test-authorization-patch.cjs
 * Wave 0.4.9 Verification Harness for Authorization & Patch Application
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const os = require('os');

const patchGate = require('./patch-gate.cjs');
const {
  apply_patch_with_provenance,
  PatchGateError
} = patchGate;

const repoRoot = process.cwd();
const logDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function createRepoWithRegisters() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w049-auth-test-'));
  cp.spawnSync('git', ['init', '-b', 'main'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.name', 'Wave 0.4.9 Auth Test'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.email', 'wave049auth@test.local'], { cwd: tmpDir });

  const filesToCopy = [
    'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'
  ];
  for (const f of filesToCopy) {
    fs.copyFileSync(path.join(repoRoot, f), path.join(tmpDir, f));
  }

  fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'),
    path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv')
  );

  const targetRel = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  fs.mkdirSync(path.join(tmpDir, path.dirname(targetRel)), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, targetRel), '// Original W5-1 graph viewer\n', 'utf8');

  const coordRel = 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js';
  fs.mkdirSync(path.join(tmpDir, path.dirname(coordRel)), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, coordRel), '// Original daAppShell\n', 'utf8');

  cp.spawnSync('git', ['add', '.'], { cwd: tmpDir });
  cp.spawnSync('git', ['commit', '-m', 'Initial fixtures'], { cwd: tmpDir });

  const headSha = cp.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tmpDir, encoding: 'utf8' }).stdout.trim();
  return { tmpDir, headSha, targetRel, coordRel };
}

const authResults = [];

function recordResult(id, desc, expectedError, actualError, status, logFileName, logContent) {
  const logPath = path.join(logDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  authResults.push({
    id,
    desc,
    expectedError,
    actualError,
    status,
    logFile: logFileName,
    logSha
  });
}

function runAuthSuite() {
  console.log('=== WAVE 0.4.9 AUTHORIZATION & DISPATCH HARNESS ===');
  let allPassed = true;

  // AUTH-01: Public exports check
  {
    const hasCoordExport = typeof patchGate.apply_coordinator_patch_with_provenance !== 'undefined';
    const status = (!hasCoordExport) ? 'PASS' : 'FAIL';
    if (status === 'FAIL') allPassed = false;
    recordResult('AUTH-01', 'Verify coordinator entry point is NOT publicly exported', 'UNDEFINED', hasCoordExport ? 'EXPORTED' : 'UNDEFINED', status, 'AUTH-01.log', `EXPORTS: ${Object.keys(patchGate).join(', ')}\n`);
  }

  // AUTH-02: No public test hooks
  {
    const hasTestHooks = Object.keys(patchGate).some(k => k.startsWith('_testHook'));
    const status = (!hasTestHooks) ? 'PASS' : 'FAIL';
    if (status === 'FAIL') allPassed = false;
    recordResult('AUTH-02', 'Verify no public test hooks in exported API surface', 'NO_HOOKS', hasTestHooks ? 'HAS_HOOKS' : 'NO_HOOKS', status, 'AUTH-02.log', `EXPORTS: ${Object.keys(patchGate).join(', ')}\n`);
  }

  // AUTH-03: Feature caller attempting INT-1
  {
    const { tmpDir, headSha, coordRel } = createRepoWithRegisters();
    const patchContent = `diff --git a/${coordRel} b/${coordRel}
--- a/${coordRel}
+++ b/${coordRel}
@@ -1 +1,2 @@
 // Original daAppShell
+// Exploit attempt
`;
    let actualErr = '';
    try {
      apply_patch_with_provenance({
        repoDir: tmpDir,
        patchContent,
        taskId: 'INT-1',
        expectedBaseSha: headSha,
        patchBaseSha: headSha
      });
      actualErr = 'NONE_SUCCESS';
    } catch (e) {
      actualErr = e.code || e.message;
    }
    const expected = 'COORDINATOR_TASK_ON_FEATURE_ROUTE';
    const status = (actualErr === expected) ? 'PASS' : 'FAIL';
    if (status === 'FAIL') allPassed = false;
    recordResult('AUTH-03', 'Feature caller cannot dispatch INT-1', expected, actualErr, status, 'AUTH-03.log', `ACTUAL ERROR: ${actualErr}\n`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // AUTH-04: Feature caller attempting coordinator path
  {
    const { tmpDir, headSha, coordRel } = createRepoWithRegisters();
    const patchContent = `diff --git/${coordRel} b/${coordRel}
--- a/${coordRel}
+++ b/${coordRel}
@@ -1 +1,2 @@
 // Original daAppShell
+// Privilege escalation attempt
`;
    let actualErr = '';
    try {
      apply_patch_with_provenance({
        repoDir: tmpDir,
        patchContent,
        taskId: 'W5-1',
        expectedBaseSha: headSha,
        patchBaseSha: headSha
      });
      actualErr = 'NONE_SUCCESS';
    } catch (e) {
      actualErr = e.code || e.message;
    }
    const expected = 'COORDINATOR_EXCLUSIVE_PATH';
    const status = (actualErr === expected) ? 'PASS' : 'FAIL';
    if (status === 'FAIL') allPassed = false;
    recordResult('AUTH-04', 'Feature task modifying coordinator-exclusive path is rejected', expected, actualErr, status, 'AUTH-04.log', `ACTUAL ERROR: ${actualErr}\n`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // AUTH-05: Non-Batch-1 task (W7-3) rejected
  {
    const { tmpDir } = createRepoWithRegisters();
    const w73Rel = 'scratch/salesforce-poc/force-app/main/default/lwc/daAnalysisHistoryView/daAnalysisHistoryView.js';
    fs.mkdirSync(path.join(tmpDir, path.dirname(w73Rel)), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, w73Rel), '// w73\n', 'utf8');
    cp.spawnSync('git', ['add', '.'], { cwd: tmpDir });
    cp.spawnSync('git', ['commit', '-m', 'Add w7-3 target'], { cwd: tmpDir });
    const newHead = cp.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tmpDir, encoding: 'utf8' }).stdout.trim();

    const patchContent = `diff --git a/${w73Rel} b/${w73Rel}
--- a/${w73Rel}
+++ b/${w73Rel}
@@ -1 +1,2 @@
 // w73
+// Update
`;
    let actualErr = '';
    try {
      apply_patch_with_provenance({
        repoDir: tmpDir,
        patchContent,
        taskId: 'W7-3',
        expectedBaseSha: newHead,
        patchBaseSha: newHead
      });
      actualErr = 'NONE_SUCCESS';
    } catch (e) {
      actualErr = e.code || e.message;
    }
    const expected = 'TASK_OUTSIDE_BATCH1';
    const status = (actualErr === expected) ? 'PASS' : 'FAIL';
    if (status === 'FAIL') allPassed = false;
    recordResult('AUTH-05', 'Non-Batch-1 task rejected', expected, actualErr, status, 'AUTH-05.log', `ACTUAL ERROR: ${actualErr}\n`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // AUTH-06: Task outside Batch 1 (W5-2)
  {
    const { tmpDir } = createRepoWithRegisters();
    const w52Rel = 'scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js';
    fs.mkdirSync(path.join(tmpDir, path.dirname(w52Rel)), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, w52Rel), '// daLayoutEngine\n', 'utf8');
    cp.spawnSync('git', ['add', '.'], { cwd: tmpDir });
    cp.spawnSync('git', ['commit', '-m', 'Add w5-2 target'], { cwd: tmpDir });
    const newHead = cp.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tmpDir, encoding: 'utf8' }).stdout.trim();

    const patchContent = `diff --git a/${w52Rel} b/${w52Rel}
--- a/${w52Rel}
+++ b/${w52Rel}
@@ -1 +1,2 @@
 // daLayoutEngine
+// Orbit layout
`;
    let actualErr = '';
    try {
      apply_patch_with_provenance({
        repoDir: tmpDir,
        patchContent,
        taskId: 'W5-2',
        expectedBaseSha: newHead,
        patchBaseSha: newHead
      });
      actualErr = 'NONE_SUCCESS';
    } catch (e) {
      actualErr = e.code || e.message;
    }
    const expected = 'TASK_OUTSIDE_BATCH1';
    const status = (actualErr === expected) ? 'PASS' : 'FAIL';
    if (status === 'FAIL') allPassed = false;
    recordResult('AUTH-06', 'Task outside Batch 1 / unfulfilled dependency rejected', expected, actualErr, status, 'AUTH-06.log', `ACTUAL ERROR: ${actualErr}\n`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // AUTH-07: Valid authorized W5-1 patch application succeeds
  {
    const { tmpDir, headSha, targetRel } = createRepoWithRegisters();
    const patchContent = `diff --git a/${targetRel} b/${targetRel}
--- a/${targetRel}
+++ b/${targetRel}
@@ -1 +1,2 @@
 // Original W5-1 graph viewer
+// Switcher implementation
`;
    let actualRes = null;
    let actualErr = '';
    try {
      actualRes = apply_patch_with_provenance({
        repoDir: tmpDir,
        patchContent,
        taskId: 'W5-1',
        expectedBaseSha: headSha,
        patchBaseSha: headSha
      });
    } catch (e) {
      actualErr = e.code || e.message;
    }

    const fileContent = fs.readFileSync(path.join(tmpDir, targetRel), 'utf8');
    const hasApplied = fileContent.includes('// Switcher implementation');
    const status = (actualRes && actualRes.success && hasApplied) ? 'PASS' : 'FAIL';
    if (status === 'FAIL') allPassed = false;
    recordResult('AUTH-07', 'Authorized W5-1 patch applies successfully', 'SUCCESS', status === 'PASS' ? 'SUCCESS' : actualErr, status, 'AUTH-07.log', `RESULT: ${JSON.stringify(actualRes)}\nCONTENT: ${fileContent}\n`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`Authorization suite completed. Total tests: ${authResults.length}, All passed: ${allPassed}`);
  if (!allPassed) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAuthSuite();
}

module.exports = {
  authResults,
  runAuthSuite
};
