/**
 * test-rollback.cjs
 * Wave 0.4.10 Hardened Rollback Verification Test Harness
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const {
  PatchGateError,
  pathSafeRollback,
  recordPreApplyState
} = require('./patch-gate.cjs');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const rbResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  rbResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runRollbackSuite() {
  console.log('=== WAVE 0.4.10 TWO-PHASE ROLLBACK VERIFICATION SUITE ===');

  // RB-01: P0-01 Adversarial test — Forged INT-1 Task Rollback
  {
    const prov = {
      taskId: 'INT-1',
      touchedPaths: ['scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs'],
      preApply: {},
      postApply: {}
    };
    let actual = '';
    try {
      pathSafeRollback({ repoDir: repoRoot, provenance: prov, taskId: 'INT-1' });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && (e.code === 'COORDINATOR_PRIVILEGE_ESCALATION' || e.code === 'COORDINATOR_ROLLBACK_PROHIBITED')) ? 'REJECTED_COORDINATOR_ROLLBACK' : e.message;
    }
    const status = (actual === 'REJECTED_COORDINATOR_ROLLBACK') ? 'PASS' : 'FAIL';
    recordResult('RB-01', 'P0-01: Forged INT-1 task rollback rejected fail-closed via public API', 'REJECTED_COORDINATOR_ROLLBACK', actual, status, 'RB-01.log', `ACTUAL: ${actual}\n`);
  }

  // RB-02: P0-01 Adversarial test — Feature Task touching Coordinator-Exclusive File
  {
    const prov = {
      taskId: 'W5-1',
      touchedPaths: ['scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs'],
      preApply: {},
      postApply: {}
    };
    let actual = '';
    try {
      pathSafeRollback({ repoDir: repoRoot, provenance: prov, taskId: 'W5-1' });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && (e.code === 'COORDINATOR_PRIVILEGE_ESCALATION' || e.code === 'COORDINATOR_EXCLUSIVE_PATH' || e.code === 'PATH_OUTSIDE_TASK_SCOPE')) ? 'REJECTED_COORDINATOR_PATH' : e.message;
    }
    const status = (actual === 'REJECTED_COORDINATOR_PATH') ? 'PASS' : 'FAIL';
    recordResult('RB-02', 'P0-01: Public rollback touching coordinator-exclusive file rejected fail-closed', 'REJECTED_COORDINATOR_PATH', actual, status, 'RB-02.log', `ACTUAL: ${actual}\n`);
  }

  // RB-03: Zero-Byte File Restore (empty base64 string)
  {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0410-rb-03-'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(tmpDir, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(tmpDir, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'));
    fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
    fs.cpSync(path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));

    const testFile = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const targetAbs = path.join(tmpDir, testFile);
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.writeFileSync(targetAbs, 'some content post apply', 'utf8');

    const emptyBuf = Buffer.from('');
    const emptyHash = crypto.createHash('sha256').update(emptyBuf).digest('hex');
    const stPost = fs.statSync(targetAbs);

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [testFile],
      preApply: {
        [testFile]: {
          exists: true,
          hash: emptyHash,
          byteCount: 0,
          originalContentBase64: '',
          mode: stPost.mode
        }
      },
      postApply: {
        [testFile]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('some content post apply')).digest('hex'),
          byteCount: 23,
          mode: stPost.mode
        }
      }
    };

    let actual = '';
    try {
      const res = pathSafeRollback({ repoDir: tmpDir, provenance: prov, taskId: 'W5-1' });
      const currentBuf = fs.readFileSync(targetAbs);
      if (res.success && currentBuf.length === 0) {
        actual = 'ZERO_BYTE_RESTORE_SUCCESS';
      } else {
        actual = `LENGTH_${currentBuf.length}`;
      }
    } catch (e) {
      actual = e.message;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const status = (actual === 'ZERO_BYTE_RESTORE_SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('RB-03', 'Rollback restores zero-byte file correctly without truthiness failure', 'ZERO_BYTE_RESTORE_SUCCESS', actual, status, 'RB-03.log', `ACTUAL: ${actual}\n`);
  }

  // RB-04: Phase A All-Target Preflight Rejection (Second target payload corrupt, ZERO mutations to Target 1)
  {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0410-rb-04-'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(tmpDir, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(tmpDir, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'));
    fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
    fs.cpSync(path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));

    const file1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const file2 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';
    const abs1 = path.join(tmpDir, file1);
    const abs2 = path.join(tmpDir, file2);
    fs.mkdirSync(path.dirname(abs1), { recursive: true });
    fs.writeFileSync(abs1, 'post-apply 1', 'utf8');
    fs.writeFileSync(abs2, 'post-apply 2', 'utf8');
    const st1 = fs.statSync(abs1);
    const st2 = fs.statSync(abs2);

    const buf1Old = Buffer.from('pre-apply 1');
    const hash1Old = crypto.createHash('sha256').update(buf1Old).digest('hex');

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [file1, file2],
      preApply: {
        [file1]: {
          exists: true,
          hash: hash1Old,
          byteCount: buf1Old.length,
          originalContentBase64: buf1Old.toString('base64'),
          mode: st1.mode
        },
        [file2]: {
          exists: true,
          hash: 'deadbeefwronghash',
          byteCount: 11,
          originalContentBase64: Buffer.from('pre-apply 2').toString('base64'),
          mode: st2.mode
        }
      },
      postApply: {
        [file1]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('post-apply 1')).digest('hex'),
          byteCount: 12,
          mode: st1.mode
        },
        [file2]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('post-apply 2')).digest('hex'),
          byteCount: 12,
          mode: st2.mode
        }
      }
    };

    let actual = '';
    try {
      pathSafeRollback({ repoDir: tmpDir, provenance: prov, taskId: 'W5-1' });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      const curContent1 = fs.readFileSync(abs1, 'utf8');
      const curContent2 = fs.readFileSync(abs2, 'utf8');
      if (e instanceof PatchGateError && e.code === 'RESTORE_PAYLOAD_CORRUPT' && curContent1 === 'post-apply 1' && curContent2 === 'post-apply 2') {
        actual = 'PHASE_A_ZERO_MUTATION_SUCCESS';
      } else {
        actual = `FAIL: ${e.message}, file1 mutated: ${curContent1 !== 'post-apply 1'}`;
      }
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const status = (actual === 'PHASE_A_ZERO_MUTATION_SUCCESS') ? 'PASS' : 'FAIL';
    recordResult('RB-04', 'Second target corrupt payload fails Phase A with ZERO mutations to any target', 'PHASE_A_ZERO_MUTATION_SUCCESS', actual, status, 'RB-04.log', `ACTUAL: ${actual}\n`);
  }

  // RB-05: Binary Payload Restoration Fidelity
  {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0410-rb-05-'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(tmpDir, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(tmpDir, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'));
    fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
    fs.cpSync(path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));

    const testFile = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const targetAbs = path.join(tmpDir, testFile);
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.writeFileSync(targetAbs, 'mutated bytes');
    const st = fs.statSync(targetAbs);

    const binBytes = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) binBytes[i] = i;
    const binHash = crypto.createHash('sha256').update(binBytes).digest('hex');

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [testFile],
      preApply: {
        [testFile]: {
          exists: true,
          hash: binHash,
          byteCount: binBytes.length,
          originalContentBase64: binBytes.toString('base64'),
          mode: st.mode
        }
      },
      postApply: {
        [testFile]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('mutated bytes')).digest('hex'),
          byteCount: 13,
          mode: st.mode
        }
      }
    };

    let actual = '';
    try {
      const res = pathSafeRollback({ repoDir: tmpDir, provenance: prov, taskId: 'W5-1' });
      const restored = fs.readFileSync(targetAbs);
      if (res.success && restored.equals(binBytes)) {
        actual = 'BINARY_RESTORE_EXACT';
      } else {
        actual = 'BINARY_MISMATCH';
      }
    } catch (e) {
      actual = e.message;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const status = (actual === 'BINARY_RESTORE_EXACT') ? 'PASS' : 'FAIL';
    recordResult('RB-05', 'Arbitrary binary payload restored with byte-level fidelity', 'BINARY_RESTORE_EXACT', actual, status, 'RB-05.log', `ACTUAL: ${actual}\n`);
  }

  // RB-06: Target Mode Mismatch Rejection
  {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0410-rb-06-'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(tmpDir, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv'));
    fs.cpSync(path.resolve(repoRoot, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(tmpDir, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv'));
    fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
    fs.cpSync(path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));

    const testFile = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const targetAbs = path.join(tmpDir, testFile);
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.writeFileSync(targetAbs, 'content', { mode: 0o644 });

    const prov = {
      taskId: 'W5-1',
      touchedPaths: [testFile],
      preApply: {
        [testFile]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('old')).digest('hex'),
          byteCount: 3,
          originalContentBase64: Buffer.from('old').toString('base64'),
          mode: 0o644
        }
      },
      postApply: {
        [testFile]: {
          exists: true,
          hash: crypto.createHash('sha256').update(Buffer.from('content')).digest('hex'),
          byteCount: 7,
          mode: 0o755 // Expecting 755 but file is 644
        }
      }
    };

    let actual = '';
    try {
      pathSafeRollback({ repoDir: tmpDir, provenance: prov, taskId: 'W5-1' });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'CURRENT_MODE_MISMATCH') ? 'REJECTED_MODE_MISMATCH' : e.message;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const status = (actual === 'REJECTED_MODE_MISMATCH') ? 'PASS' : 'FAIL';
    recordResult('RB-06', 'File mode mismatch against expected post-apply mode rejected fail-closed', 'REJECTED_MODE_MISMATCH', actual, status, 'RB-06.log', `ACTUAL: ${actual}\n`);
  }

  console.log(`Rollback suite finished: ${rbResults.length} scenarios. All pass: ${rbResults.every(r => r.status === 'PASS')}`);
  if (!rbResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return rbResults;
}

module.exports = { runRollbackSuite, rbResults };

if (require.main === module) {
  runRollbackSuite();
}
