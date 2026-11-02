const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const {
  verifyAndApplyPatch,
  coordinatorApplyPatch,
  PatchGateError
} = require('./patch-gate.cjs');

console.log('Running Authorization Gate Public Entry Suite (AUTH-01 to AUTH-12)...');

const repoRoot = path.resolve(__dirname, '../../..');
const currentHeadSha = cp.execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim();

let passed = 0;
let total = 0;

function runAuthTest(id, name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [${id}] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [${id}] ${name} FAILED:`, err.message);
    throw err;
  }
}

const patchW5_1 = `diff --git a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
new file mode 100644
--- /dev/null
+++ b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
@@ -0,0 +1 @@
+// test w5-1
`;

const patchINT_1 = `diff --git a/scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs b/scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs
new file mode 100644
--- /dev/null
+++ b/scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs
@@ -0,0 +1 @@
+// test int-1
`;

runAuthTest('AUTH-01', 'Feature task cannot claim coordinator role via options', () => {
  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: repoRoot,
      patchContent: patchINT_1,
      taskId: 'W5-1',
      expectedBaseSha: currentHeadSha,
      trustedRole: 'coordinator'
    });
  }, (err) => {
    return err instanceof PatchGateError && (err.code === 'COORDINATOR_EXCLUSIVE_PATH' || err.code === 'UNMANIFESTED_PATH' || err.code === 'WRONG_TASK_OWNER' || err.code === 'UNLISTED_PATH');
  });
});

runAuthTest('AUTH-02', 'Feature task cannot use INT-1 through public entry point', () => {
  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: repoRoot,
      patchContent: patchINT_1,
      taskId: 'INT-1',
      expectedBaseSha: currentHeadSha
    });
  }, (err) => {
    return err instanceof PatchGateError && err.code === 'UNAUTHORIZED_COORDINATOR_TASK';
  });
});

runAuthTest('AUTH-03', 'Caller cannot disable Batch 1 enforcement', () => {
  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: repoRoot,
      patchContent: patchW5_1,
      taskId: 'W5-2',
      expectedBaseSha: currentHeadSha,
      batch1Enforce: false
    });
  }, (err) => {
    return err instanceof PatchGateError && err.code === 'TASK_NOT_IN_BATCH_1';
  });
});

runAuthTest('AUTH-04', 'Caller-supplied owner metadata is ignored/rejected', () => {
  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: repoRoot,
      patchContent: patchINT_1,
      taskId: 'W5-1',
      expectedBaseSha: currentHeadSha,
      taskRecord: { Accountable_Owner: 'Integration Coordinator' }
    });
  }, (err) => {
    return err instanceof PatchGateError;
  });
});

runAuthTest('AUTH-05', 'Caller-supplied allowlist/register is ignored/rejected', () => {
  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: repoRoot,
      patchContent: patchW5_1,
      taskId: 'W5-2',
      expectedBaseSha: currentHeadSha,
      batch1Set: new Set(['W5-2'])
    });
  }, (err) => {
    return err instanceof PatchGateError && err.code === 'TASK_NOT_IN_BATCH_1';
  });
});

runAuthTest('AUTH-06', 'Non-Batch-1 task is rejected even when caller passes legacy bypass-shaped options', () => {
  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: repoRoot,
      patchContent: patchW5_1,
      taskId: 'W9-2',
      expectedBaseSha: currentHeadSha,
      trustedRole: 'coordinator',
      batch1Enforce: false
    });
  }, (err) => {
    return err instanceof PatchGateError && err.code === 'TASK_NOT_IN_BATCH_1';
  });
});

runAuthTest('AUTH-07', 'Task with unmet dependency/status is rejected', () => {
  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: repoRoot,
      patchContent: patchW5_1,
      taskId: 'W5-2',
      expectedBaseSha: currentHeadSha
    });
  }, (err) => {
    return err instanceof PatchGateError && (err.code === 'TASK_NOT_IN_BATCH_1' || err.code === 'UNMET_DEPENDENCY');
  });
});

runAuthTest('AUTH-08', 'Wrong task/path ownership is rejected', () => {
  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: repoRoot,
      patchContent: patchW5_1,
      taskId: 'W6-1',
      expectedBaseSha: currentHeadSha
    });
  }, (err) => {
    return err instanceof PatchGateError && (err.code === 'UNLISTED_PATH' || err.code === 'WRONG_TASK_OWNER');
  });
});

runAuthTest('AUTH-09', 'Malformed or duplicate authoritative register entries fail closed', () => {
  const tempDir = fs.mkdtempSync(path.join('/tmp', 'auth09-'));
  fs.writeFileSync(path.join(tempDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'Task ID\nW1\nW1\n');
  fs.writeFileSync(path.join(tempDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'path\nfoo\n');
  fs.mkdirSync(path.join(tempDir, 'docs/wave-0/4.4'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), 'Task ID\nW1\n');

  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: tempDir,
      patchContent: patchW5_1,
      taskId: 'W1',
      expectedBaseSha: currentHeadSha
    });
  }, (err) => {
    return err instanceof PatchGateError;
  });
  fs.rmSync(tempDir, { recursive: true, force: true });
});

runAuthTest('AUTH-10', 'A legitimate Batch 1 task with exact authorized path passes authorization layer', () => {
  const tempRepo = fs.mkdtempSync(path.join('/tmp', 'auth10-'));
  cp.execSync('git init -b main', { cwd: tempRepo });
  cp.execSync('git config user.name "Test"', { cwd: tempRepo });
  cp.execSync('git config user.email "test@test.com"', { cwd: tempRepo });
  fs.copyFileSync(path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(tempRepo, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'));
  fs.copyFileSync(path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(tempRepo, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'));
  fs.mkdirSync(path.join(tempRepo, 'docs/wave-0/4.4'), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(tempRepo, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));
  fs.mkdirSync(path.join(tempRepo, 'scratch/salesforce-poc/tests'), { recursive: true });
  cp.execSync('git add . && git commit -m "init"', { cwd: tempRepo });
  const tempHead = cp.execSync('git rev-parse HEAD', { cwd: tempRepo }).toString().trim();

  const res = verifyAndApplyPatch({
    repoDir: tempRepo,
    patchContent: patchW5_1,
    taskId: 'W5-1',
    expectedBaseSha: tempHead
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.taskId, 'W5-1');
  assert.strictEqual(fs.existsSync(path.join(tempRepo, 'scratch/salesforce-poc/tests/run-w5-1-tests.cjs')), true);
  fs.rmSync(tempRepo, { recursive: true, force: true });
});

runAuthTest('AUTH-11', 'Coordinator-only path accepted only through coordinator route', () => {
  const tempRepo = fs.mkdtempSync(path.join('/tmp', 'auth11-'));
  cp.execSync('git init -b main', { cwd: tempRepo });
  cp.execSync('git config user.name "Test"', { cwd: tempRepo });
  cp.execSync('git config user.email "test@test.com"', { cwd: tempRepo });
  fs.copyFileSync(path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(tempRepo, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'));
  fs.copyFileSync(path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(tempRepo, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'));
  fs.mkdirSync(path.join(tempRepo, 'docs/wave-0/4.4'), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(tempRepo, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));
  fs.mkdirSync(path.join(tempRepo, 'scratch/salesforce-poc/tests'), { recursive: true });
  cp.execSync('git add . && git commit -m "init"', { cwd: tempRepo });
  const tempHead = cp.execSync('git rev-parse HEAD', { cwd: tempRepo }).toString().trim();

  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: tempRepo,
      patchContent: patchINT_1,
      taskId: 'INT-1',
      expectedBaseSha: tempHead
    });
  }, (err) => err instanceof PatchGateError && err.code === 'UNAUTHORIZED_COORDINATOR_TASK');

  const res = coordinatorApplyPatch({
    repoDir: tempRepo,
    patchContent: patchINT_1,
    taskId: 'INT-1',
    expectedBaseSha: tempHead
  });
  assert.strictEqual(res.success, true);
  fs.rmSync(tempRepo, { recursive: true, force: true });
});

runAuthTest('AUTH-12', 'Stale base is rejected by public entry point', () => {
  const staleSha = '0000000000000000000000000000000000000000';
  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: repoRoot,
      patchContent: patchW5_1,
      taskId: 'W5-1',
      expectedBaseSha: staleSha
    });
  }, (err) => {
    return err instanceof PatchGateError && err.code === 'STALE_BASE_HEAD_MISMATCH';
  });
});

console.log(`\nAuthorization Gate Public Entry Suite: ${passed}/${total} PASSED\n`);
