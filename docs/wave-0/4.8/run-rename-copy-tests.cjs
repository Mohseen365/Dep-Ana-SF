const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const {
  parsePatchAffectedPaths,
  verifyAndApplyPatch,
  PatchGateError
} = require('./patch-gate.cjs');

console.log('Running Patch Path Parsing & Rename/Copy Policy Test Suite (PNC-01 to PNC-10)...');

const repoRoot = path.resolve(__dirname, '../../..');
let passed = 0;
let total = 0;

function runTest(id, name, fn) {
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

function setupSandbox() {
  const dir = fs.mkdtempSync(path.join('/tmp', 'pnc-'));
  cp.execSync('git init -b main', { cwd: dir });
  cp.execSync('git config user.name "Test"', { cwd: dir });
  cp.execSync('git config user.email "test@test.com"', { cwd: dir });

  fs.copyFileSync(path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'));
  fs.copyFileSync(path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'));
  fs.mkdirSync(path.join(dir, 'docs/wave-0/4.4'), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(dir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));

  return dir;
}

runTest('PNC-01', 'Parse standard modify diff header', () => {
  const patch = `diff --git a/foo/bar.txt b/foo/bar.txt
index 1111..2222 100644
--- a/foo/bar.txt
+++ b/foo/bar.txt
@@ -1 +1 @@
-old
+new
`;
  const res = parsePatchAffectedPaths(patch);
  assert.strictEqual(res.touchedPaths.length, 1);
  assert.strictEqual(res.touchedPaths[0], 'foo/bar.txt');
  assert.strictEqual(res.diffs[0].type, 'modify');
});

runTest('PNC-02', 'Parse add (new file) diff header', () => {
  const patch = `diff --git a/new.txt b/new.txt
new file mode 100644
--- /dev/null
+++ b/new.txt
@@ -0,0 +1 @@
+hello
`;
  const res = parsePatchAffectedPaths(patch);
  assert.strictEqual(res.touchedPaths.length, 1);
  assert.strictEqual(res.touchedPaths[0], 'new.txt');
  assert.strictEqual(res.diffs[0].type, 'add');
});

runTest('PNC-03', 'Parse delete diff header', () => {
  const patch = `diff --git a/del.txt b/del.txt
deleted file mode 100644
--- a/del.txt
+++ /dev/null
@@ -1 +0,0 @@
-bye
`;
  const res = parsePatchAffectedPaths(patch);
  assert.strictEqual(res.touchedPaths.length, 1);
  assert.strictEqual(res.touchedPaths[0], 'del.txt');
  assert.strictEqual(res.diffs[0].type, 'delete');
});

runTest('PNC-04', 'Parse rename diff header (both old and new paths captured)', () => {
  const patch = `diff --git a/old.txt b/new.txt
similarity index 100%
rename from old.txt
rename to new.txt
`;
  const res = parsePatchAffectedPaths(patch);
  assert.strictEqual(res.touchedPaths.length, 2);
  assert.deepStrictEqual(res.touchedPaths.sort(), ['new.txt', 'old.txt']);
  assert.strictEqual(res.diffs[0].type, 'rename');
  assert.strictEqual(res.diffs[0].oldPath, 'old.txt');
  assert.strictEqual(res.diffs[0].newPath, 'new.txt');
});

runTest('PNC-05', 'Parse copy diff header', () => {
  const patch = `diff --git a/src.txt b/dst.txt
similarity index 100%
copy from src.txt
copy to dst.txt
`;
  const res = parsePatchAffectedPaths(patch);
  assert.strictEqual(res.touchedPaths.length, 2);
  assert.deepStrictEqual(res.touchedPaths.sort(), ['dst.txt', 'src.txt']);
  assert.strictEqual(res.diffs[0].type, 'copy');
});

runTest('PNC-06', 'Parse quoted path with spaces in diff header', () => {
  const patch = `diff --git "a/path with spaces/file.txt" "b/path with spaces/file.txt"
index 1111..2222 100644
--- "a/path with spaces/file.txt"
+++ "b/path with spaces/file.txt"
@@ -1 +1 @@
-old
+new
`;
  const res = parsePatchAffectedPaths(patch);
  assert.strictEqual(res.touchedPaths.length, 1);
  assert.strictEqual(res.touchedPaths[0], 'path with spaces/file.txt');
});

runTest('PNC-07', 'Reject rename when source path is unauthorized', () => {
  const sandbox = setupSandbox();
  const patch = `diff --git a/scratch/salesforce-poc/tests/run-poc-tests.cjs b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
similarity index 100%
rename from scratch/salesforce-poc/tests/run-poc-tests.cjs
rename to scratch/salesforce-poc/tests/run-w5-1-tests.cjs
`;
  cp.execSync('git add . && git commit -m "init"', { cwd: sandbox });
  const headSha = cp.execSync('git rev-parse HEAD', { cwd: sandbox }).toString().trim();

  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: sandbox,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: headSha
    });
  }, (err) => {
    return err instanceof PatchGateError && (err.code === 'FROZEN_PATH_MODIFICATION' || err.code === 'WRONG_TASK_OWNER' || err.code === 'UNLISTED_PATH');
  });

  fs.rmSync(sandbox, { recursive: true, force: true });
});

runTest('PNC-08', 'Reject rename when destination path is unauthorized', () => {
  const sandbox = setupSandbox();
  const patch = `diff --git a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs b/scratch/salesforce-poc/tests/run-poc-tests.cjs
similarity index 100%
rename from scratch/salesforce-poc/tests/run-w5-1-tests.cjs
rename to scratch/salesforce-poc/tests/run-poc-tests.cjs
`;
  cp.execSync('git add . && git commit -m "init"', { cwd: sandbox });
  const headSha = cp.execSync('git rev-parse HEAD', { cwd: sandbox }).toString().trim();

  assert.throws(() => {
    verifyAndApplyPatch({
      repoDir: sandbox,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: headSha
    });
  }, (err) => {
    return err instanceof PatchGateError && (err.code === 'FROZEN_PATH_MODIFICATION' || err.code === 'WRONG_TASK_OWNER' || err.code === 'UNLISTED_PATH');
  });

  fs.rmSync(sandbox, { recursive: true, force: true });
});

runTest('PNC-09', 'Reject malformed rename missing rename to', () => {
  const patch = `diff --git a/old.txt b/new.txt
rename from old.txt
`;
  assert.throws(() => parsePatchAffectedPaths(patch), (err) => {
    return err instanceof PatchGateError && err.code === 'MALFORMED_RENAME';
  });
});

runTest('PNC-10', 'Reject patch with no diff headers', () => {
  const patch = `Random text without git diff header`;
  assert.throws(() => parsePatchAffectedPaths(patch), (err) => {
    return err instanceof PatchGateError && err.code === 'NO_DIFF_FOUND';
  });
});

console.log(`\nPatch Path Parsing & Rename/Copy Policy Suite: ${passed}/${total} PASSED\n`);
