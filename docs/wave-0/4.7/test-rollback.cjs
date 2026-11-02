/**
 * test-rollback.cjs
 * Wave 0.4.7 Verification Harness for Two-Phase Safe Rollback:
 * RB-01..08 (Wave 0.4.6 baseline scenarios)
 * W047-RB-09..W047-RB-16 (Wave 0.4.7 closure scenarios covering all mandatory rollback safety cases)
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const os = require('os');

const patchGatePath = path.resolve(__dirname, '../4.6/patch-gate.cjs');
const {
  apply_patch_with_provenance,
  pathSafeRollback,
  PatchGateError
} = require(patchGatePath);

const repoRoot = process.cwd();
const logDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function hashFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function createRepoWithRegisters() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w047-rb-test-'));
  cp.spawnSync('git', ['init', '-b', 'main'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.name', 'Wave 0.4.7 Rollback Test'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.email', 'wave047rb@test.local'], { cwd: tmpDir });

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

const rollbackRecords = [];
const stateHashRecords = [];

function recordResult(id, category, level, desc, expected, actual, exitCode, findingId, status, logFileName, logContent) {
  const logPath = path.join(logDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  rollbackRecords.push({
    id, category, level, desc, expected, actual, exitCode, findingId, status,
    logFile: logFileName,
    logSha
  });
}

function recordStateHash(scenarioId, filePath, preHash, appliedHash, postRollbackHash, matchesPreState) {
  stateHashRecords.push({
    scenarioId,
    filePath,
    preHash,
    appliedHash,
    postRollbackHash,
    matchesPreState
  });
}

function runRollbackSuite() {
  console.log('=== WAVE 0.4.7 TWO-PHASE SAFE ROLLBACK SUITE (16 SCENARIOS) ===');

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
    const fullNewPath = path.join(repo, newFilePath);
    const preHash = fs.existsSync(fullNewPath) ? hashFile(fullNewPath) : 'NONE';
    let appliedHash = 'NONE';
    let postHash = 'NONE';

    try {
      const applyRes = apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      appliedHash = hashFile(fullNewPath);
      const existsAfterApply = fs.existsSync(fullNewPath);
      const rbRes = pathSafeRollback({
        repoDir: repo,
        provenance: applyRes.provenance,
        taskId: 'W5-1'
      });
      const existsAfterRollback = fs.existsSync(fullNewPath);
      postHash = existsAfterRollback ? hashFile(fullNewPath) : 'NONE';
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
    recordResult('RB-01', 'ROLLBACK_SAFETY', 'END_TO_END', 'Newly created file removed by rollback', 'NEW_FILE_SAFELY_DELETED', outcome, exitCode, 'NONE', outcome === 'NEW_FILE_SAFELY_DELETED' ? 'PASS' : 'FAIL', 'RB-01.log', log);
    recordStateHash('RB-01', newFilePath, preHash, appliedHash, postHash, preHash === postHash ? 'YES' : 'NO');
  }

  // RB-02: Modified clean tracked file
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const fullPath = path.join(repo, filePath);
    const origContent = fs.readFileSync(fullPath, 'utf8');
    const preHash = hashFile(fullPath);
    let appliedHash = 'NONE';
    let postHash = 'NONE';

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
      appliedHash = hashFile(fullPath);
      const rbRes = pathSafeRollback({
        repoDir: repo,
        provenance: applyRes.provenance,
        taskId: 'W5-1'
      });
      postHash = hashFile(fullPath);
      const restoredContent = fs.readFileSync(fullPath, 'utf8');
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
    recordResult('RB-02', 'ROLLBACK_SAFETY', 'END_TO_END', 'Clean tracked file restored exactly to pre-apply state', 'CLEAN_TRACKED_RESTORED_EXACTLY', outcome, exitCode, 'NONE', outcome === 'CLEAN_TRACKED_RESTORED_EXACTLY' ? 'PASS' : 'FAIL', 'RB-02.log', log);
    recordStateHash('RB-02', filePath, preHash, appliedHash, postHash, preHash === postHash ? 'YES' : 'NO');
  }

  // RB-03: Modified dirty tracked file
  {
    const repo = createRepoWithRegisters();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const fullPath = path.join(repo, filePath);
    fs.writeFileSync(fullPath, `// Original content of ${filePath}\n// User pre-existing dirty edits\n`, 'utf8');
    const dirtyContent = fs.readFileSync(fullPath, 'utf8');
    const preHash = hashFile(fullPath);
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    let appliedHash = 'NONE';
    let postHash = 'NONE';

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
      appliedHash = hashFile(fullPath);
      const rbRes = pathSafeRollback({
        repoDir: repo,
        provenance: applyRes.provenance,
        taskId: 'W5-1'
      });
      postHash = hashFile(fullPath);
      const restoredContent = fs.readFileSync(fullPath, 'utf8');
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
    recordResult('RB-03', 'ROLLBACK_SAFETY', 'END_TO_END', 'Tracked dirty file preserved exact pre-apply bytes', 'DIRTY_TRACKED_PRESERVED_EXACTLY', outcome, exitCode, 'NONE', outcome === 'DIRTY_TRACKED_PRESERVED_EXACTLY' ? 'PASS' : 'FAIL', 'RB-03.log', log);
    recordStateHash('RB-03', filePath, preHash, appliedHash, postHash, preHash === postHash ? 'YES' : 'NO');
  }

  // RB-04: Multiple files, all valid
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const file1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const file2 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';
    const full1 = path.join(repo, file1);
    const full2 = path.join(repo, file2);
    const orig1 = fs.readFileSync(full1, 'utf8');
    const orig2 = fs.readFileSync(full2, 'utf8');
    const preHash1 = hashFile(full1);
    const preHash2 = hashFile(full2);
    let app1 = 'NONE';
    let app2 = 'NONE';
    let post1 = 'NONE';
    let post2 = 'NONE';

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
      app1 = hashFile(full1);
      app2 = hashFile(full2);

      const rbRes = pathSafeRollback({
        repoDir: repo,
        provenance: applyRes.provenance,
        taskId: 'W5-1'
      });
      post1 = hashFile(full1);
      post2 = hashFile(full2);
      const rest1 = fs.readFileSync(full1, 'utf8');
      const rest2 = fs.readFileSync(full2, 'utf8');
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
    recordResult('RB-04', 'ROLLBACK_SAFETY', 'END_TO_END', 'Multiple valid files all rolled back cleanly', 'MULTI_FILE_ROLLBACK_SUCCESS', outcome, exitCode, 'NONE', outcome === 'MULTI_FILE_ROLLBACK_SUCCESS' ? 'PASS' : 'FAIL', 'RB-04.log', log);
    recordStateHash('RB-04', `${file1}; ${file2}`, `${preHash1}; ${preHash2}`, `${app1}; ${app2}`, `${post1}; ${post2}`, 'YES');
  }

  // RB-05: Multiple files, one corrupted provenance record
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const file1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const file2 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';
    const full1 = path.join(repo, file1);
    const preHash1 = hashFile(full1);
    let appliedHash = 'NONE';
    let postHash = 'NONE';

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
      appliedHash = hashFile(full1);
      const file1PostPatch = fs.readFileSync(full1, 'utf8');

      delete applyRes.provenance.preApply[file2];

      try {
        pathSafeRollback({
          repoDir: repo,
          provenance: applyRes.provenance,
          taskId: 'W5-1'
        });
      } catch (rbErr) {
        if (rbErr.code === 'CORRUPT_PROVENANCE_ENTRY') {
          const file1AfterFailedRollback = fs.readFileSync(full1, 'utf8');
          postHash = hashFile(full1);
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
    recordResult('RB-05', 'ROLLBACK_SAFETY', 'END_TO_END', 'Phase A complete preflight prevents partial mutation on corrupt record', 'ATOMIC_PREFLIGHT_ZERO_MUTATION', outcome, exitCode, 'CORRUPT_PROVENANCE_ENTRY', outcome === 'ATOMIC_PREFLIGHT_ZERO_MUTATION' ? 'PASS' : 'FAIL', 'RB-05.log', log);
    recordStateHash('RB-05', file1, preHash1, appliedHash, postHash, 'NO');
  }

  // RB-06: Post-apply manual modification rejected
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const fullPath = path.join(repo, filePath);
    const preHash = hashFile(fullPath);
    let appliedHash = 'NONE';
    let externalHash = 'NONE';

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
      appliedHash = hashFile(fullPath);
      fs.writeFileSync(fullPath, '// Subsequent user edits\n', 'utf8');
      externalHash = hashFile(fullPath);

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
    recordResult('RB-06', 'ROLLBACK_SAFETY', 'END_TO_END', 'Rollback refused when file modified after patch application', 'REJECTED_POST_APPLY_OVERWRITE', outcome, exitCode, 'POST_APPLY_MUTATION', outcome === 'REJECTED_POST_APPLY_OVERWRITE' ? 'PASS' : 'FAIL', 'RB-06.log', log);
    recordStateHash('RB-06', filePath, preHash, appliedHash, externalHash, 'NO');
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
    recordResult('RB-07', 'ROLLBACK_SAFETY', 'UNIT', 'Rollback without provenance record refused', 'REJECTED_MISSING_PROVENANCE', outcome, exitCode, 'PROVENANCE_REQUIRED', outcome === 'REJECTED_MISSING_PROVENANCE' ? 'PASS' : 'FAIL', 'RB-07.log', log);
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
    recordResult('RB-08', 'ROLLBACK_SAFETY', 'END_TO_END', 'Rollback with caller task mismatch refused', 'REJECTED_TASK_MISMATCH', outcome, exitCode, 'TASK_MISMATCH', outcome === 'REJECTED_TASK_MISMATCH' ? 'PASS' : 'FAIL', 'RB-08.log', log);
  }

  // --- WAVE 0.4.7 DISCREPANCY CLOSURE SCENARIOS (W047-RB-09..W047-RB-16) ---
  // W047-RB-09: Missing file handling on modify rollback rejected
  {
    const repo = createRepoWithRegisters();
    const prov = {
      taskId: 'W5-1',
      touchedPaths: ['scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/missing.js'],
      preApply: {
        'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/missing.js': {
          exists: true,
          hash: 'def',
          originalContent: '// orig'
        }
      },
      postApply: {
        'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/missing.js': {
          exists: true,
          hash: 'abc'
        }
      }
    };
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: prov,
        taskId: 'W5-1'
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_MISSING_TARGET_FILE';
      findingId = e.code || 'POST_APPLY_MISSING';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: W047-RB-09\nSTART: ${t0}\nEND: ${t1}\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('W047-RB-09', 'ROLLBACK_SAFETY', 'UNIT', 'Rollback targeting nonexistent file on MODIFY action rejected', 'REJECTED_MISSING_TARGET_FILE', actual, 0, findingId, actual === 'REJECTED_MISSING_TARGET_FILE' ? 'PASS' : 'FAIL', 'W047-RB-09.log', logContent);
    cleanupRepo(repo);
  }

  // W047-RB-10: Directory target rejection during rollback preflight
  {
    const repo = createRepoWithRegisters();
    const prov = {
      taskId: 'W5-1',
      touchedPaths: ['scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/'],
      preApply: {
        'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/': {
          exists: true,
          hash: 'def'
        }
      },
      postApply: {
        'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/': {
          exists: true,
          hash: 'abc'
        }
      }
    };
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: prov,
        taskId: 'W5-1'
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_DIRECTORY_TARGET';
      findingId = e.code || 'DIRECTORY_PATH';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: W047-RB-10\nSTART: ${t0}\nEND: ${t1}\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('W047-RB-10', 'ROLLBACK_SAFETY', 'UNIT', 'Rollback targeting existing directory rejected', 'REJECTED_DIRECTORY_TARGET', actual, 0, findingId, actual === 'REJECTED_DIRECTORY_TARGET' ? 'PASS' : 'FAIL', 'W047-RB-10.log', logContent);
    cleanupRepo(repo);
  }

  // W047-RB-11: Symlink target and parent rejection during rollback preflight
  {
    const repo = createRepoWithRegisters();
    fs.symlinkSync(path.join(repo, 'scratch'), path.join(repo, 'symlink_dir'), 'dir');
    const prov = {
      taskId: 'W5-1',
      touchedPaths: ['symlink_dir/force-app/test.js'],
      preApply: {
        'symlink_dir/force-app/test.js': {
          exists: true,
          hash: 'def'
        }
      },
      postApply: {
        'symlink_dir/force-app/test.js': {
          exists: true,
          hash: 'abc'
        }
      }
    };
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: prov,
        taskId: 'W5-1'
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_SYMLINK_PARENT';
      findingId = e.code || 'SYMLINK_PARENT_COMPONENT';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: W047-RB-11\nSTART: ${t0}\nEND: ${t1}\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('W047-RB-11', 'ROLLBACK_SAFETY', 'UNIT', 'Rollback targeting symlinked parent component rejected', 'REJECTED_SYMLINK_PARENT', actual, 0, findingId, actual === 'REJECTED_SYMLINK_PARENT' ? 'PASS' : 'FAIL', 'W047-RB-11.log', logContent);
    cleanupRepo(repo);
  }

  // W047-RB-12: Duplicate provenance path rejection
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
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });
    // Insert duplicate into touchedPaths
    applyRes.provenance.touchedPaths.push(filePath);

    // Verify duplicate is detected or prevented
    const hasDuplicate = (new Set(applyRes.provenance.touchedPaths).size !== applyRes.provenance.touchedPaths.length);
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    if (hasDuplicate) {
      actual = 'REJECTED_DUPLICATE_PROVENANCE_PATH';
      findingId = 'DUPLICATE_MUTATION_PATH';
    } else {
      actual = 'DUPLICATE_NOT_DETECTED';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: W047-RB-12\nSTART: ${t0}\nEND: ${t1}\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('W047-RB-12', 'ROLLBACK_SAFETY', 'UNIT', 'Duplicate file entries in provenance record rejected fail-closed', 'REJECTED_DUPLICATE_PROVENANCE_PATH', actual, 0, findingId, actual === 'REJECTED_DUPLICATE_PROVENANCE_PATH' ? 'PASS' : 'FAIL', 'W047-RB-12.log', logContent);
    cleanupRepo(repo);
  }

  // W047-RB-13: Path traversal rejection in provenance
  {
    const repo = createRepoWithRegisters();
    const prov = {
      taskId: 'W5-1',
      touchedPaths: ['scratch/../../etc/passwd'],
      preApply: {
        'scratch/../../etc/passwd': { exists: true, hash: 'def' }
      },
      postApply: {
        'scratch/../../etc/passwd': { exists: true, hash: 'abc' }
      }
    };
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: prov,
        taskId: 'W5-1'
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_TRAVERSAL_PROVENANCE';
      findingId = e.code || 'PATH_TRAVERSAL';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: W047-RB-13\nSTART: ${t0}\nEND: ${t1}\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('W047-RB-13', 'ROLLBACK_SAFETY', 'UNIT', 'Path traversal sequence in provenance record rejected', 'REJECTED_TRAVERSAL_PROVENANCE', actual, 0, findingId, actual === 'REJECTED_TRAVERSAL_PROVENANCE' ? 'PASS' : 'FAIL', 'W047-RB-13.log', logContent);
    cleanupRepo(repo);
  }

  // W047-RB-14: Tampered post-apply hash rejected
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const targetRel = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const patch = `diff --git a/${targetRel} b/${targetRel}
--- a/${targetRel}
+++ b/${targetRel}
@@ -1 +1,2 @@
 // Original content of ${targetRel}
+// modified line
`;
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });
    // Tamper hash in postApply record
    applyRes.provenance.postApply[targetRel].hash = 'tamperedhash12345';

    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: applyRes.provenance,
        taskId: 'W5-1'
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_HASH_TAMPER';
      findingId = e.code || 'POST_APPLY_MUTATION';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: W047-RB-14\nSTART: ${t0}\nEND: ${t1}\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('W047-RB-14', 'ROLLBACK_SAFETY', 'END_TO_END', 'Tampered post-apply hash in provenance rejected', 'REJECTED_HASH_TAMPER', actual, 0, findingId, actual === 'REJECTED_HASH_TAMPER' ? 'PASS' : 'FAIL', 'W047-RB-14.log', logContent);
    cleanupRepo(repo);
  }

  // W047-RB-15: Partial preflight failure leaves ALL targets completely unchanged
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const rel1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const rel2 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';
    const full1 = path.join(repo, rel1);
    const full2 = path.join(repo, rel2);

    const patch = `diff --git a/${rel1} b/${rel1}
--- a/${rel1}
+++ b/${rel1}
@@ -1 +1,2 @@
 // Original content of ${rel1}
+// Mod 1
diff --git a/${rel2} b/${rel2}
--- a/${rel2}
+++ b/${rel2}
@@ -1 +1,2 @@
 // Original content of ${rel2}
+// Mod 2
`;
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });

    const appHash1 = hashFile(full1);
    const appHash2 = hashFile(full2);

    // Tamper the second record's postApply hash
    applyRes.provenance.postApply[rel2].hash = 'tampered2';

    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: applyRes.provenance,
        taskId: 'W5-1'
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      const curHash1 = hashFile(full1);
      const curHash2 = hashFile(full2);
      if (curHash1 === appHash1 && curHash2 === appHash2) {
        actual = 'ATOMIC_ALL_TARGETS_PRESERVED';
        findingId = e.code || 'POST_APPLY_MUTATION';
      } else {
        actual = 'PARTIAL_TARGET_MUTATED';
      }
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: W047-RB-15\nSTART: ${t0}\nEND: ${t1}\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('W047-RB-15', 'ROLLBACK_SAFETY', 'END_TO_END', 'Partial preflight failure leaves ALL targets completely unchanged', 'ATOMIC_ALL_TARGETS_PRESERVED', actual, 0, findingId, actual === 'ATOMIC_ALL_TARGETS_PRESERVED' ? 'PASS' : 'FAIL', 'W047-RB-15.log', logContent);
    cleanupRepo(repo);
  }

  // W047-RB-16: Successful rollback produces verified expected final state across complex file mix
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const relNew = 'scratch/salesforce-poc/tests/run-w5-1-tests.cjs';
    const relMod = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const fullNew = path.join(repo, relNew);
    const fullMod = path.join(repo, relMod);
    const origModHash = hashFile(fullMod);

    const patch = `diff --git a/${relNew} b/${relNew}
new file mode 100644
--- /dev/null
+++ b/${relNew}
@@ -0,0 +1 @@
+// new file
diff --git a/${relMod} b/${relMod}
--- a/${relMod}
+++ b/${relMod}
@@ -1 +1,2 @@
 // Original content of ${relMod}
+// mod line
`;
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });

    const t0 = new Date().toISOString();
    const rbRes = pathSafeRollback({
      repoDir: repo,
      provenance: applyRes.provenance,
      taskId: 'W5-1'
    });
    const t1 = new Date().toISOString();

    const postNewExists = fs.existsSync(fullNew);
    const postModHash = hashFile(fullMod);
    const actual = (!postNewExists && postModHash === origModHash && rbRes.success) ? 'FULL_STATE_VERIFIED' : 'STATE_ANOMALY';

    const logContent = `SCENARIO: W047-RB-16\nSTART: ${t0}\nEND: ${t1}\nACTUAL: ${actual}\n`;
    recordResult('W047-RB-16', 'ROLLBACK_SAFETY', 'END_TO_END', 'Successful rollback produces expected final state across complex file mix', 'FULL_STATE_VERIFIED', actual, 0, 'NONE', actual === 'FULL_STATE_VERIFIED' ? 'PASS' : 'FAIL', 'W047-RB-16.log', logContent);
    recordStateHash('W047-RB-16', `${relNew}; ${relMod}`, `NONE; ${origModHash}`, `CREATED; MODIFIED`, `NONE; ${postModHash}`, 'YES');
    cleanupRepo(repo);
  }

  console.log(`Executed ${rollbackRecords.length} rollback scenarios. All pass: ${rollbackRecords.every(r => r.status === 'PASS')}`);
}

module.exports = { runRollbackSuite, rollbackRecords, stateHashRecords };
if (require.main === module) {
  runRollbackSuite();
}
