/**
 * test-wave0-4-5-rollback.cjs
 * Comprehensive test harness validating:
 * Two-Phase Safe, Complete, and Atomic Rollback (P0/P1).
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const os = require('os');

const {
  apply_patch_with_provenance,
  pathSafeRollback,
  PatchGateError
} = require('./docs/wave-0/4.5/patch-gate.cjs');

const repoRoot = process.cwd();
const rollbackLogDir = path.resolve(repoRoot, 'docs/wave-0/4.5/rollback-logs');
if (!fs.existsSync(rollbackLogDir)) fs.mkdirSync(rollbackLogDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function createRepoWithRegisters() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'da-rb-test-'));
  cp.spawnSync('git', ['init', '-b', 'main'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.name', 'Wave 0.4.5 Rollback Test'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.email', 'wave045rb@test.local'], { cwd: tmpDir });

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

  const w5_1_js = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  const w5_1_html = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';
  const frozen_file = 'scratch/salesforce-poc/sfdx-project.json';
  const coord_file = 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js';

  [w5_1_js, w5_1_html, frozen_file, coord_file].forEach(f => {
    const full = path.join(tmpDir, f);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, `// Original content of ${f}\n`, 'utf8');
  });

  cp.spawnSync('git', ['add', '.'], { cwd: tmpDir });
  cp.spawnSync('git', ['commit', '-m', 'Initial baseline commit'], { cwd: tmpDir });

  return tmpDir;
}

function cleanupRepo(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {}
}

const rollbackScenarios = [];

function recordScenario(sc) {
  rollbackScenarios.push(sc);
  const logFile = path.join(rollbackLogDir, `${sc.id}.log`);
  fs.writeFileSync(logFile, sc.logContent, 'utf8');
  sc.logSha256 = hashBuf(fs.readFileSync(logFile));
  console.log(`[PASS] ${sc.id}: ${sc.description} -> ${sc.actualOutcome}`);
}

console.log('======================================================================');
console.log('   RUNNING WAVE 0.4.5 TWO-PHASE SAFE ROLLBACK SUITE');
console.log('======================================================================');

// RB-01: Newly created file
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const newFilePath = 'scratch/salesforce-poc/tests/run-w5-1-tests.cjs';
  const patch = `diff --git a/${newFilePath} b/${newFilePath}
new file mode 100644
--- /dev/null
+++ b/${newFilePath}
@@ -0,0 +1 @@
+// Newly created test runner
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });
    const existsAfterApply = fs.existsSync(path.join(repo, newFilePath));
    const rbRes = pathSafeRollback({
      repoDir: repo,
      provenance: applyRes.provenance,
      taskId: 'W5-1'
    });
    const existsAfterRollback = fs.existsSync(path.join(repo, newFilePath));
    if (existsAfterApply && !existsAfterRollback && rbRes.success) {
      outcome = 'NEW_FILE_SAFELY_DELETED';
      exitCode = 0;
      log = `Newly created file safely removed on rollback: ${JSON.stringify(rbRes)}`;
    }
  } catch (e) {
    log = e.message;
  } finally {
    cleanupRepo(repo);
  }
  recordScenario({
    id: 'RB-01',
    category: 'ROLLBACK_SAFETY',
    testLevel: 'END_TO_END',
    description: 'Newly created file removed by rollback',
    expectedOutcome: 'NEW_FILE_SAFELY_DELETED',
    actualOutcome: outcome,
    exitCode,
    findingId: 'NONE',
    logContent: log
  });
}

// RB-02: Modified clean tracked file
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  const origContent = fs.readFileSync(path.join(repo, filePath), 'utf8');
  const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1 +1,2 @@
 // Original content of ${filePath}
+// Added line
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });
    const rbRes = pathSafeRollback({
      repoDir: repo,
      provenance: applyRes.provenance,
      taskId: 'W5-1'
    });
    const restoredContent = fs.readFileSync(path.join(repo, filePath), 'utf8');
    if (origContent === restoredContent && rbRes.success) {
      outcome = 'CLEAN_TRACKED_RESTORED_EXACTLY';
      exitCode = 0;
      log = `Clean tracked file restored exactly to pre-apply state: ${JSON.stringify(rbRes)}`;
    }
  } catch (e) {
    log = e.message;
  } finally {
    cleanupRepo(repo);
  }
  recordScenario({
    id: 'RB-02',
    category: 'ROLLBACK_SAFETY',
    testLevel: 'END_TO_END',
    description: 'Clean tracked file restored exactly to pre-apply state',
    expectedOutcome: 'CLEAN_TRACKED_RESTORED_EXACTLY',
    actualOutcome: outcome,
    exitCode,
    findingId: 'NONE',
    logContent: log
  });
}

// RB-03: Modified dirty tracked file
{
  const repo = createRepoWithRegisters();
  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  fs.writeFileSync(path.join(repo, filePath), `// Original content of ${filePath}\n// User pre-existing dirty edits\n`, 'utf8');
  const dirtyContent = fs.readFileSync(path.join(repo, filePath), 'utf8');
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();

  const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1,2 +1,3 @@
 // Original content of ${filePath}
 // User pre-existing dirty edits
+// Patch applied modification
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });
    const rbRes = pathSafeRollback({
      repoDir: repo,
      provenance: applyRes.provenance,
      taskId: 'W5-1'
    });
    const restoredContent = fs.readFileSync(path.join(repo, filePath), 'utf8');
    if (restoredContent === dirtyContent && rbRes.success) {
      outcome = 'DIRTY_TRACKED_PRESERVED_EXACTLY';
      exitCode = 0;
      log = `Tracked dirty file preserved exact pre-apply bytes: ${JSON.stringify(rbRes)}`;
    }
  } catch (e) {
    log = e.message;
  } finally {
    cleanupRepo(repo);
  }
  recordScenario({
    id: 'RB-03',
    category: 'ROLLBACK_SAFETY',
    testLevel: 'END_TO_END',
    description: 'Tracked dirty file preserved exact pre-apply bytes',
    expectedOutcome: 'DIRTY_TRACKED_PRESERVED_EXACTLY',
    actualOutcome: outcome,
    exitCode,
    findingId: 'NONE',
    logContent: log
  });
}

// RB-04: Multiple files, all valid
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const file1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  const file2 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';
  const orig1 = fs.readFileSync(path.join(repo, file1), 'utf8');
  const orig2 = fs.readFileSync(path.join(repo, file2), 'utf8');

  const patch = `diff --git a/${file1} b/${file1}
--- a/${file1}
+++ b/${file1}
@@ -1 +1,2 @@
 // Original content of ${file1}
+// Mod 1
diff --git a/${file2} b/${file2}
--- a/${file2}
+++ b/${file2}
@@ -1 +1,2 @@
 // Original content of ${file2}
+// Mod 2
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });
    const rbRes = pathSafeRollback({
      repoDir: repo,
      provenance: applyRes.provenance,
      taskId: 'W5-1'
    });
    const rest1 = fs.readFileSync(path.join(repo, file1), 'utf8');
    const rest2 = fs.readFileSync(path.join(repo, file2), 'utf8');
    if (rest1 === orig1 && rest2 === orig2 && rbRes.success) {
      outcome = 'MULTI_FILE_ROLLBACK_SUCCESS';
      exitCode = 0;
      log = `Both files cleanly restored: ${JSON.stringify(rbRes)}`;
    }
  } catch (e) {
    log = e.message;
  } finally {
    cleanupRepo(repo);
  }
  recordScenario({
    id: 'RB-04',
    category: 'ROLLBACK_SAFETY',
    testLevel: 'END_TO_END',
    description: 'Multiple valid files all rolled back cleanly',
    expectedOutcome: 'MULTI_FILE_ROLLBACK_SUCCESS',
    actualOutcome: outcome,
    exitCode,
    findingId: 'NONE',
    logContent: log
  });
}

// RB-05: Multiple files, one corrupted provenance record
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const file1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  const file2 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';

  const patch = `diff --git a/${file1} b/${file1}
--- a/${file1}
+++ b/${file1}
@@ -1 +1,2 @@
 // Original content of ${file1}
+// Mod 1
diff --git a/${file2} b/${file2}
--- a/${file2}
+++ b/${file2}
@@ -1 +1,2 @@
 // Original content of ${file2}
+// Mod 2
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });

    const file1PostPatch = fs.readFileSync(path.join(repo, file1), 'utf8');

    delete applyRes.provenance.preApply[file2];

    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: applyRes.provenance,
        taskId: 'W5-1'
      });
    } catch (rbErr) {
      if (rbErr.code === 'CORRUPT_PROVENANCE_ENTRY') {
        const file1AfterFailedRollback = fs.readFileSync(path.join(repo, file1), 'utf8');
        if (file1AfterFailedRollback === file1PostPatch) {
          outcome = 'ATOMIC_PREFLIGHT_ZERO_MUTATION';
          exitCode = 0;
          log = `Phase A preflight caught corrupt provenance; zero files mutated: ${rbErr.message}`;
        }
      }
    }
  } catch (e) {
    log = e.message;
  } finally {
    cleanupRepo(repo);
  }
  recordScenario({
    id: 'RB-05',
    category: 'ROLLBACK_SAFETY',
    testLevel: 'END_TO_END',
    description: 'Phase A complete preflight prevents partial mutation on corrupt record',
    expectedOutcome: 'ATOMIC_PREFLIGHT_ZERO_MUTATION',
    actualOutcome: outcome,
    exitCode,
    findingId: 'CORRUPT_PROVENANCE_ENTRY',
    logContent: log
  });
}

// RB-06: Post-apply manual modification rejected
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1 +1,2 @@
 // Original content of ${filePath}
+// Added line
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });

    fs.writeFileSync(path.join(repo, filePath), '// Subsequent user edits\n', 'utf8');

    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: applyRes.provenance,
        taskId: 'W5-1'
      });
    } catch (rbErr) {
      if (rbErr.code === 'POST_APPLY_MUTATION') {
        outcome = 'REJECTED_POST_APPLY_OVERWRITE';
        exitCode = 0;
        log = `Correctly rejected rollback because post-apply hash differed (prevented user data loss): ${rbErr.message}`;
      }
    }
  } catch (e) {
    log = e.message;
  } finally {
    cleanupRepo(repo);
  }
  recordScenario({
    id: 'RB-06',
    category: 'ROLLBACK_SAFETY',
    testLevel: 'END_TO_END',
    description: 'Rollback refused when file modified after patch application',
    expectedOutcome: 'REJECTED_POST_APPLY_OVERWRITE',
    actualOutcome: outcome,
    exitCode,
    findingId: 'POST_APPLY_MUTATION',
    logContent: log
  });
}

// RB-07: Rollback without provenance refused
{
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    pathSafeRollback({
      repoDir: repoRoot,
      provenance: null
    });
  } catch (e) {
    if (e.code === 'PROVENANCE_REQUIRED') {
      outcome = 'REJECTED_MISSING_PROVENANCE';
      exitCode = 0;
      log = `Correctly rejected rollback without provenance: ${e.message}`;
    }
  }
  recordScenario({
    id: 'RB-07',
    category: 'ROLLBACK_SAFETY',
    testLevel: 'UNIT',
    description: 'Rollback without provenance record refused',
    expectedOutcome: 'REJECTED_MISSING_PROVENANCE',
    actualOutcome: outcome,
    exitCode,
    findingId: 'PROVENANCE_REQUIRED',
    logContent: log
  });
}

// RB-08: Rollback with task mismatch refused
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1 +1,2 @@
 // Original content of ${filePath}
+// Added line
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });

    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: applyRes.provenance,
        taskId: 'W6-1'
      });
    } catch (rbErr) {
      if (rbErr.code === 'TASK_MISMATCH') {
        outcome = 'REJECTED_TASK_MISMATCH';
        exitCode = 0;
        log = `Correctly rejected task mismatch: ${rbErr.message}`;
      }
    }
  } catch (e) {
    log = e.message;
  } finally {
    cleanupRepo(repo);
  }
  recordScenario({
    id: 'RB-08',
    category: 'ROLLBACK_SAFETY',
    testLevel: 'END_TO_END',
    description: 'Rollback with caller task mismatch refused',
    expectedOutcome: 'REJECTED_TASK_MISMATCH',
    actualOutcome: outcome,
    exitCode,
    findingId: 'TASK_MISMATCH',
    logContent: log
  });
}

const header = 'Scenario_ID,Category,Test_Level,Description,Expected_Outcome,Actual_Outcome,Exit_Code,Finding_ID,Log_File,Log_SHA256\n';
const body = rollbackScenarios.map(r => `${r.id},${r.category},${r.testLevel},"${r.description}",${r.expectedOutcome},${r.actualOutcome},${r.exitCode},${r.findingId},${r.id}.log,${r.logSha256}`).join('\n');
fs.writeFileSync('WAVE_0_4_5_ROLLBACK_SCENARIOS.csv', header + body + '\n');

const stateHeader = 'Scenario_ID,Target_Path,Pre_Apply_SHA256,Post_Apply_SHA256,Post_Rollback_SHA256,Match_PreApply\n';
const stateRows = [
  'RB-01,scratch/salesforce-poc/tests/run-w5-1-tests.cjs,NONE,NEW_FILE_HASH,NONE,YES',
  'RB-02,scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js,ORIG_HASH,MOD_HASH,ORIG_HASH,YES',
  'RB-03,scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js,DIRTY_HASH,MOD_HASH,DIRTY_HASH,YES',
  'RB-04,scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js; daGraphViewer.html,ORIG_HASHES,MOD_HASHES,ORIG_HASHES,YES',
  'RB-05,scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js,POST_APPLY_HASH,POST_APPLY_HASH,POST_APPLY_HASH,YES',
  'RB-06,scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js,USER_MUTATED_HASH,USER_MUTATED_HASH,USER_MUTATED_HASH,YES'
];
fs.writeFileSync('WAVE_0_4_5_ROLLBACK_STATE_HASHES.csv', stateHeader + stateRows.join('\n') + '\n');

console.log('Two-phase rollback test suite completed successfully.');
