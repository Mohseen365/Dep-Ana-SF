/**
 * test-rollback.cjs
 * Wave 0.4.8 Safe Two-Phase Rollback Verification Harness
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
} = require('./patch-gate.cjs');

const repoRoot = process.cwd();
const logDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function hashFile(p) {
  const buf = fs.readFileSync(p);
  return {
    hash: crypto.createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length
  };
}

function createRepoWithRegisters() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w048-rb-test-'));
  cp.spawnSync('git', ['init', '-b', 'main'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.name', 'Wave 0.4.8 Rollback Test'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.email', 'wave048rb@test.local'], { cwd: tmpDir });

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

const rollbackResults = [];

function recordResult(id, desc, expectedCode, actualCode, status, logFileName, logContent) {
  const logPath = path.join(logDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  rollbackResults.push({
    id,
    desc,
    expectedCode,
    actualCode,
    status,
    logFile: logFileName,
    logSha
  });
}

function runRollbackSuite() {
  console.log('=== WAVE 0.4.8 SAFE TWO-PHASE ROLLBACK SUITE (22 SCENARIOS) ===');

  // RB-01: normal restore of modified file
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const preBuf = fs.readFileSync(path.join(repo, filePath));
    const preHash = hashBuf(preBuf);

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

    const rbRes = pathSafeRollback({
      repoDir: repo,
      provenance: applyRes.provenance,
      taskId: 'W5-1'
    });

    const postBuf = fs.readFileSync(path.join(repo, filePath));
    const postHash = hashBuf(postBuf);

    const status = (rbRes.success && postHash === preHash) ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-01\nPRE_HASH: ${preHash}\nPOST_ROLLBACK_HASH: ${postHash}\nSTATUS: ${status}\n`;
    recordResult('RB-01', 'Normal restore of modified file succeeds byte-for-byte', 'SUCCESS', status === 'PASS' ? 'SUCCESS' : 'MISMATCH', status, 'RB-01.log', log);
    cleanupRepo(repo);
  }

  // RB-02: removal of file created by patch
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
    const applyRes = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });

    const fullNew = path.join(repo, newFilePath);
    const existsAfterApply = fs.existsSync(fullNew);

    const rbRes = pathSafeRollback({
      repoDir: repo,
      provenance: applyRes.provenance,
      taskId: 'W5-1'
    });

    const existsAfterRollback = fs.existsSync(fullNew);
    const status = (applyRes.success && existsAfterApply && rbRes.success && !existsAfterRollback) ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-02\nEXISTS_POST_APPLY: ${existsAfterApply}\nEXISTS_POST_RB: ${existsAfterRollback}\nSTATUS: ${status}\n`;
    recordResult('RB-02', 'Removal of file created by patch succeeds completely', 'SUCCESS', status === 'PASS' ? 'SUCCESS' : 'FAILED', status, 'RB-02.log', log);
    cleanupRepo(repo);
  }

  // RB-03: reject modified post-apply file
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

    // Mutate file post-apply
    fs.appendFileSync(path.join(repo, filePath), '// User modifications made post-apply\n');
    const mutatedHash = hashFile(path.join(repo, filePath)).hash;

    let actualCode = 'NONE';
    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: applyRes.provenance,
        taskId: 'W5-1'
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }

    const currentHash = hashFile(path.join(repo, filePath)).hash;
    const unchanged = (currentHash === mutatedHash);
    const status = (actualCode === 'POST_APPLY_MUTATION' && unchanged) ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-03\nEXPECTED: POST_APPLY_MUTATION\nACTUAL: ${actualCode}\nFILE_UNCHANGED: ${unchanged}\nSTATUS: ${status}\n`;
    recordResult('RB-03', 'Reject modified post-apply file with zero mutation', 'POST_APPLY_MUTATION', actualCode, status, 'RB-03.log', log);
    cleanupRepo(repo);
  }

  // RB-04: reject deleted post-apply file
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

    // Delete file post-apply
    fs.unlinkSync(path.join(repo, filePath));

    let actualCode = 'NONE';
    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: applyRes.provenance,
        taskId: 'W5-1'
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }

    const stillMissing = !fs.existsSync(path.join(repo, filePath));
    const status = (actualCode === 'POST_APPLY_MISSING' && stillMissing) ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-04\nEXPECTED: POST_APPLY_MISSING\nACTUAL: ${actualCode}\nSTILL_MISSING: ${stillMissing}\nSTATUS: ${status}\n`;
    recordResult('RB-04', 'Reject deleted post-apply file with zero mutation', 'POST_APPLY_MISSING', actualCode, status, 'RB-04.log', log);
    cleanupRepo(repo);
  }

  // RB-05: reject directory target
  {
    const repo = createRepoWithRegisters();
    const prov = {
      taskId: 'W5-1',
      touchedPaths: ['scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer'],
      preApply: {
        'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer': { exists: true, hash: 'abc', originalContentBase64: 'abc' }
      },
      postApply: {
        'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer': { exists: true, hash: 'def' }
      }
    };
    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'DIRECTORY_TARGET_NOT_ALLOWED') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-05\nEXPECTED: DIRECTORY_TARGET_NOT_ALLOWED\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-05', 'Reject directory target in rollback provenance', 'DIRECTORY_TARGET_NOT_ALLOWED', actualCode, status, 'RB-05.log', log);
    cleanupRepo(repo);
  }

  // RB-06: reject symlink target
  {
    const repo = createRepoWithRegisters();
    const targetFile = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const fullTarget = path.join(repo, targetFile);
    fs.unlinkSync(fullTarget);
    fs.symlinkSync(path.join(repo, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), fullTarget);

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [targetFile],
      preApply: { [targetFile]: { exists: true, hash: '123', originalContentBase64: 'MTIz' } },
      postApply: { [targetFile]: { exists: true, hash: '456' } }
    };

    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'SYMLINK_TARGET') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-06\nEXPECTED: SYMLINK_TARGET\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-06', 'Reject symlink file target in rollback preflight', 'SYMLINK_TARGET', actualCode, status, 'RB-06.log', log);
    cleanupRepo(repo);
  }

  // RB-07: reject symlinked parent
  {
    const repo = createRepoWithRegisters();
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w048-outside-'));
    const parentPath = path.join(repo, 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer');
    fs.rmSync(parentPath, { recursive: true, force: true });
    fs.symlinkSync(outsideDir, parentPath, 'dir');

    const prov = {
      taskId: 'W5-1',
      touchedPaths: ['scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js'],
      preApply: { 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js': { exists: true, hash: '123', originalContentBase64: 'MTIz' } },
      postApply: { 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js': { exists: true, hash: '456' } }
    };

    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'SYMLINK_PARENT_COMPONENT') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-07\nEXPECTED: SYMLINK_PARENT_COMPONENT\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-07', 'Reject symlinked parent directory component', 'SYMLINK_PARENT_COMPONENT', actualCode, status, 'RB-07.log', log);
    cleanupRepo(repo);
    fs.rmSync(outsideDir, { recursive: true, force: true });
  }

  // RB-08: reject path traversal
  {
    const repo = createRepoWithRegisters();
    const prov = {
      taskId: 'W5-1',
      touchedPaths: ['scratch/salesforce-poc/../../etc/passwd'],
      preApply: { 'scratch/salesforce-poc/../../etc/passwd': { exists: true, hash: '123' } },
      postApply: { 'scratch/salesforce-poc/../../etc/passwd': { exists: true, hash: '456' } }
    };
    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'PATH_TRAVERSAL') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-08\nEXPECTED: PATH_TRAVERSAL\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-08', 'Reject directory traversal sequence in provenance', 'PATH_TRAVERSAL', actualCode, status, 'RB-08.log', log);
    cleanupRepo(repo);
  }

  // RB-09: reject duplicate touched path
  {
    const repo = createRepoWithRegisters();
    const p = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const prov = {
      taskId: 'W5-1',
      touchedPaths: [p, p],
      preApply: { [p]: { exists: true, hash: '123' } },
      postApply: { [p]: { exists: true, hash: '456' } }
    };
    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'DUPLICATE_TOUCHED_PATH') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-09\nEXPECTED: DUPLICATE_TOUCHED_PATH\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-09', 'Reject exact duplicate touched path in rollback request', 'DUPLICATE_TOUCHED_PATH', actualCode, status, 'RB-09.log', log);
    cleanupRepo(repo);
  }

  // RB-10: reject normalized/alias duplicate
  {
    const repo = createRepoWithRegisters();
    const p1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const p2 = './scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const prov = {
      taskId: 'W5-1',
      touchedPaths: [p1, p2],
      preApply: { [p1]: { exists: true, hash: '123' } },
      postApply: { [p1]: { exists: true, hash: '456' } }
    };
    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'DUPLICATE_TOUCHED_PATH') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-10\nEXPECTED: DUPLICATE_TOUCHED_PATH\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-10', 'Reject normalized alias duplicate in rollback request', 'DUPLICATE_TOUCHED_PATH', actualCode, status, 'RB-10.log', log);
    cleanupRepo(repo);
  }

  // RB-11: reject post-state says absent but file now exists
  {
    const repo = createRepoWithRegisters();
    const filePath = 'scratch/salesforce-poc/tests/run-w5-1-tests.cjs';
    const prov = {
      taskId: 'W5-1',
      touchedPaths: [filePath],
      preApply: { [filePath]: { exists: false, hash: null, byteLength: 0 } },
      postApply: { [filePath]: { exists: false, hash: null, byteLength: 0 } }
    };

    const parentDir = path.dirname(path.join(repo, filePath));
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    fs.writeFileSync(path.join(repo, filePath), '// User created important file\n', 'utf8');
    const userFileHash = hashFile(path.join(repo, filePath)).hash;

    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }

    const fileStillExists = fs.existsSync(path.join(repo, filePath));
    const contentUnchanged = fileStillExists && (hashFile(path.join(repo, filePath)).hash === userFileHash);
    const status = (actualCode === 'POST_APPLY_RECREATED_FILE' && contentUnchanged) ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-11\nEXPECTED: POST_APPLY_RECREATED_FILE\nACTUAL: ${actualCode}\nPRESERVED: ${contentUnchanged}\nSTATUS: ${status}\n`;
    recordResult('RB-11', 'Reject post-apply recreated file to prevent data loss', 'POST_APPLY_RECREATED_FILE', actualCode, status, 'RB-11.log', log);
    cleanupRepo(repo);
  }

  // RB-12: reject post-state says present but file is now absent
  {
    const repo = createRepoWithRegisters();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    fs.unlinkSync(path.join(repo, filePath));

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [filePath],
      preApply: { [filePath]: { exists: true, hash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', originalContentBase64: 'MTIz', mode: 0o100644 } },
      postApply: { [filePath]: { exists: true, hash: '456' } }
    };

    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'POST_APPLY_MISSING') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-12\nEXPECTED: POST_APPLY_MISSING\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-12', 'Public rollback invocation rejects missing post-apply file', 'POST_APPLY_MISSING', actualCode, status, 'RB-12.log', log);
    cleanupRepo(repo);
  }

  // RB-13: reject malformed pre-state
  {
    const repo = createRepoWithRegisters();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const currentHash = hashFile(path.join(repo, filePath)).hash;
    const prov = {
      taskId: 'W5-1',
      touchedPaths: [filePath],
      preApply: { [filePath]: { exists: true, hash: null, originalContentBase64: 'MTIz', mode: 0o100644 } },
      postApply: { [filePath]: { exists: true, hash: currentHash } }
    };
    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'INVALID_PRE_STATE') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-13\nEXPECTED: INVALID_PRE_STATE\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-13', 'Reject malformed pre-state missing hash in preflight', 'INVALID_PRE_STATE', actualCode, status, 'RB-13.log', log);
    cleanupRepo(repo);
  }

  // RB-14: reject malformed post-state
  {
    const repo = createRepoWithRegisters();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const prov = {
      taskId: 'W5-1',
      touchedPaths: [filePath],
      preApply: { [filePath]: { exists: true, hash: '123', originalContentBase64: 'MTIz' } },
      postApply: {}
    };
    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'CORRUPT_PROVENANCE_ENTRY') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-14\nEXPECTED: CORRUPT_PROVENANCE_ENTRY\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-14', 'Reject missing post-state record in preflight', 'CORRUPT_PROVENANCE_ENTRY', actualCode, status, 'RB-14.log', log);
    cleanupRepo(repo);
  }

  // RB-15: reject missing/null restore payload
  {
    const repo = createRepoWithRegisters();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const currentHash = hashFile(path.join(repo, filePath)).hash;
    const prov = {
      taskId: 'W5-1',
      touchedPaths: [filePath],
      preApply: { [filePath]: { exists: true, hash: '123', originalContentBase64: null } },
      postApply: { [filePath]: { exists: true, hash: currentHash } }
    };
    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'NULL_BUFFER_RESTORE') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-15\nEXPECTED: NULL_BUFFER_RESTORE\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-15', 'Reject null restore payload in preflight', 'NULL_BUFFER_RESTORE', actualCode, status, 'RB-15.log', log);
    cleanupRepo(repo);
  }

  // RB-16: reject restore payload with wrong hash
  {
    const repo = createRepoWithRegisters();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const currentHash = hashFile(path.join(repo, filePath)).hash;
    const prov = {
      taskId: 'W5-1',
      touchedPaths: [filePath],
      preApply: { [filePath]: { exists: true, hash: '0000000000000000000000000000000000000000000000000000000000000000', originalContentBase64: 'MTIz', mode: 0o100644 } },
      postApply: { [filePath]: { exists: true, hash: currentHash } }
    };
    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'RESTORE_PAYLOAD_CORRUPT') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-16\nEXPECTED: RESTORE_PAYLOAD_CORRUPT\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-16', 'Reject restore payload hash mismatch during guarded restoration', 'RESTORE_PAYLOAD_CORRUPT', actualCode, status, 'RB-16.log', log);
    cleanupRepo(repo);
  }

  // RB-17: reject invalid mode metadata
  {
    const repo = createRepoWithRegisters();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const currentHash = hashFile(path.join(repo, filePath)).hash;
    const prov = {
      taskId: 'W5-1',
      touchedPaths: [filePath],
      preApply: { [filePath]: { exists: true, hash: '123', originalContentBase64: 'MTIz', mode: 'invalid_mode_string' } },
      postApply: { [filePath]: { exists: true, hash: currentHash } }
    };
    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'INVALID_MODE_METADATA') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-17\nEXPECTED: INVALID_MODE_METADATA\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-17', 'Reject invalid mode metadata string in preflight', 'INVALID_MODE_METADATA', actualCode, status, 'RB-17.log', log);
    cleanupRepo(repo);
  }

  // RB-18: preserve binary file bytes exactly
  {
    const repo = createRepoWithRegisters();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const binaryBuf = Buffer.from([0x00, 0xFF, 0xFE, 0x80, 0x1B, 0x2C, 0x3D, 0xAA]);
    fs.writeFileSync(path.join(repo, filePath), binaryBuf);
    const preHash = hashBuf(binaryBuf);

    const mutatedBuf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    fs.writeFileSync(path.join(repo, filePath), mutatedBuf);
    const postHash = hashBuf(mutatedBuf);

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [filePath],
      preApply: {
        [filePath]: {
          exists: true,
          hash: preHash,
          byteLength: binaryBuf.length,
          originalContentBase64: binaryBuf.toString('base64'),
          mode: 0o100644
        }
      },
      postApply: {
        [filePath]: { exists: true, hash: postHash, byteLength: mutatedBuf.length, mode: 0o100644 }
      }
    };

    pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });

    const restoredBuf = fs.readFileSync(path.join(repo, filePath));
    const restoredHash = hashBuf(restoredBuf);
    const byteEqual = restoredBuf.equals(binaryBuf);

    const status = (restoredHash === preHash && byteEqual) ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-18\nPRE_HASH: ${preHash}\nRESTORED_HASH: ${restoredHash}\nBYTE_EQUAL: ${byteEqual}\nSTATUS: ${status}\n`;
    recordResult('RB-18', 'Preserve arbitrary binary bytes exactly via base64', 'SUCCESS', status === 'PASS' ? 'SUCCESS' : 'CORRUPT', status, 'RB-18.log', log);
    cleanupRepo(repo);
  }

  // RB-19: restore original file mode
  {
    const repo = createRepoWithRegisters();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const origMode = 0o100755;
    try { fs.chmodSync(path.join(repo, filePath), origMode); } catch (e) {}

    const fileBuf = fs.readFileSync(path.join(repo, filePath));
    const currentHash = hashBuf(fileBuf);

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [filePath],
      preApply: {
        [filePath]: {
          exists: true,
          hash: currentHash,
          byteLength: fileBuf.length,
          originalContentBase64: fileBuf.toString('base64'),
          mode: origMode
        }
      },
      postApply: {
        [filePath]: { exists: true, hash: currentHash, byteLength: fileBuf.length, mode: 0o100644 }
      }
    };

    pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
    const finalMode = fs.statSync(path.join(repo, filePath)).mode;
    const modeRestored = ((finalMode & 0o777) === (origMode & 0o777));

    const status = modeRestored ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-19\nORIG_MODE: ${origMode.toString(8)}\nFINAL_MODE: ${finalMode.toString(8)}\nSTATUS: ${status}\n`;
    recordResult('RB-19', 'Restore original file mode permissions', 'SUCCESS', status === 'PASS' ? 'SUCCESS' : 'MODE_MISMATCH', status, 'RB-19.log', log);
    cleanupRepo(repo);
  }

  // RB-20: all-target preflight catches a bad second target before first target changes (ZERO MUTATIONS)
  {
    const repo = createRepoWithRegisters();
    const p1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const p2 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';

    const p1OrigBuf = fs.readFileSync(path.join(repo, p1));
    const p1OrigHash = hashBuf(p1OrigBuf);
    const p2OrigBuf = fs.readFileSync(path.join(repo, p2));
    const p2OrigHash = hashBuf(p2OrigBuf);

    const p1MutatedBuf = Buffer.from('// Mutated p1');
    const p2MutatedBuf = Buffer.from('// Mutated p2');
    fs.writeFileSync(path.join(repo, p1), p1MutatedBuf);
    fs.writeFileSync(path.join(repo, p2), p2MutatedBuf);

    const p1PostHash = hashBuf(p1MutatedBuf);
    const p2PostHash = hashBuf(p2MutatedBuf);

    fs.appendFileSync(path.join(repo, p2), '// Post apply user change');
    const p2CorruptHash = hashFile(path.join(repo, p2)).hash;

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [p1, p2],
      preApply: {
        [p1]: { exists: true, hash: p1OrigHash, byteLength: p1OrigBuf.length, originalContentBase64: p1OrigBuf.toString('base64'), mode: 0o100644 },
        [p2]: { exists: true, hash: p2OrigHash, byteLength: p2OrigBuf.length, originalContentBase64: p2OrigBuf.toString('base64'), mode: 0o100644 }
      },
      postApply: {
        [p1]: { exists: true, hash: p1PostHash, byteLength: p1MutatedBuf.length, mode: 0o100644 },
        [p2]: { exists: true, hash: p2PostHash, byteLength: p2MutatedBuf.length, mode: 0o100644 }
      }
    };

    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }

    const p1CurrentBuf = fs.readFileSync(path.join(repo, p1));
    const p1Unchanged = p1CurrentBuf.equals(p1MutatedBuf);
    const p2CurrentBuf = fs.readFileSync(path.join(repo, p2));
    const p2Unchanged = (hashBuf(p2CurrentBuf) === p2CorruptHash);

    const zeroMutation = p1Unchanged && p2Unchanged;
    const status = (actualCode === 'POST_APPLY_MUTATION' && zeroMutation) ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-20\nEXPECTED: POST_APPLY_MUTATION\nACTUAL: ${actualCode}\nP1_UNCHANGED: ${p1Unchanged}\nP2_UNCHANGED: ${p2Unchanged}\nZERO_MUTATION: ${zeroMutation}\nSTATUS: ${status}\n`;
    recordResult('RB-20', 'Preflight catches bad second target with zero mutation on first target', 'POST_APPLY_MUTATION', actualCode, status, 'RB-20.log', log);
    cleanupRepo(repo);
  }

  // RB-21: post-apply recreated file is never overwritten/deleted
  {
    const repo = createRepoWithRegisters();
    const createdPath = 'scratch/salesforce-poc/tests/run-w5-1-tests.cjs';
    const userImportantContent = '// IMPORTANT USER WORK - MUST NEVER BE DELETED\nconst secret = 42;\n';

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [createdPath],
      preApply: {
        [createdPath]: { exists: false, hash: null, byteLength: 0 }
      },
      postApply: {
        [createdPath]: { exists: true, hash: 'patch_created_hash_1111111111111111111111111111111111111111111111111111111111111111', byteLength: 50, mode: 0o100644 }
      }
    };

    const parentDir2 = path.dirname(path.join(repo, createdPath));
    if (!fs.existsSync(parentDir2)) fs.mkdirSync(parentDir2, { recursive: true });
    fs.writeFileSync(path.join(repo, createdPath), userImportantContent, 'utf8');
    const userHash = hashFile(path.join(repo, createdPath)).hash;

    let actualCode = 'NONE';
    try {
      pathSafeRollback({ repoDir: repo, provenance: prov, taskId: 'W5-1' });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }

    const fileStillPresent = fs.existsSync(path.join(repo, createdPath));
    const contentIntact = fileStillPresent && (hashFile(path.join(repo, createdPath)).hash === userHash);

    const status = (actualCode === 'POST_APPLY_MUTATION' && contentIntact) ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-21\nEXPECTED: POST_APPLY_MUTATION\nACTUAL: ${actualCode}\nFILE_INTACT: ${contentIntact}\nSTATUS: ${status}\n`;
    recordResult('RB-21', 'Post-apply recreated file with modified content never deleted or overwritten', 'POST_APPLY_MUTATION', actualCode, status, 'RB-21.log', log);
    cleanupRepo(repo);
  }

  // RB-22: failure during guarded restoration reported with exact partial inventory
  {
    const repo = createRepoWithRegisters();
    const p1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const p1Buf = fs.readFileSync(path.join(repo, p1));
    const p1Hash = hashBuf(p1Buf);

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [p1],
      preApply: {
        [p1]: { exists: true, hash: p1Hash, byteLength: p1Buf.length, originalContentBase64: p1Buf.toString('base64'), mode: 0o100644 }
      },
      postApply: {
        [p1]: { exists: true, hash: p1Hash, byteLength: p1Buf.length, mode: 0o100644 }
      }
    };

    let actualCode = 'NONE';
    let details = null;
    try {
      pathSafeRollback({
        repoDir: repo,
        provenance: prov,
        taskId: 'W5-1',
        _testHookPrePhaseB: () => {
          prov.preApply[p1].hash = 'tampered_hash_triggering_guarded_restore_error';
        }
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
      details = e.details;
    }

    const hasInventory = (actualCode === 'RESTORE_PAYLOAD_CORRUPT' || (details && details.recoveryInstructions));
    const status = (hasInventory) ? 'PASS' : 'FAIL';
    const log = `SCENARIO: RB-22\nEXPECTED: RESTORE_PAYLOAD_CORRUPT or PARTIAL_RESTORE_ERROR\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('RB-22', 'Failure during restoration reported with precise recovery context', 'RESTORE_PAYLOAD_CORRUPT', actualCode, status, 'RB-22.log', log);
    cleanupRepo(repo);
  }

  console.log(`Rollback suite finished: ${rollbackResults.length} scenarios executed. All pass: ${rollbackResults.every(r => r.status === 'PASS')}`);
  return rollbackResults;
}

module.exports = { runRollbackSuite, rollbackResults };
if (require.main === module) {
  runRollbackSuite();
}
