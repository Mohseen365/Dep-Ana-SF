/**
 * test-containment.cjs
 * Wave 0.4.12 Filesystem Containment and Path Safety Harness
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  PatchGateError,
  normalizeSafePath,
  verifyFilesystemContainment
} = require('./patch-gate.cjs');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const contResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  contResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runContainmentSuite() {
  console.log('=== Wave 0.4.12 FILESYSTEM CONTAINMENT SUITE ===');

  // CONT-01: Path traversal ../../etc/passwd
  {
    let actual = '';
    try {
      normalizeSafePath('../../etc/passwd');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'PATH_TRAVERSAL_DETECTED') ? 'REJECTED_TRAVERSAL' : e.message;
    }
    const status = (actual === 'REJECTED_TRAVERSAL') ? 'PASS' : 'FAIL';
    recordResult('CONT-01', 'Relative traversal ../../etc/passwd rejected', 'REJECTED_TRAVERSAL', actual, status, 'CONT-01.log', `ACTUAL: ${actual}\n`);
  }

  // CONT-02: Absolute root path /etc/passwd
  {
    let actual = '';
    try {
      normalizeSafePath('/etc/passwd');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'INVALID_ROOT_PATH') ? 'REJECTED_ROOT_PATH' : e.message;
    }
    const status = (actual === 'REJECTED_ROOT_PATH') ? 'PASS' : 'FAIL';
    recordResult('CONT-02', 'Absolute root path /etc/passwd rejected', 'REJECTED_ROOT_PATH', actual, status, 'CONT-02.log', `ACTUAL: ${actual}\n`);
  }

  // CONT-03: Windows drive letter C:\Windows\System32
  {
    let actual = '';
    try {
      normalizeSafePath('C:/Windows/System32');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'INVALID_ABSOLUTE_PATH') ? 'REJECTED_DRIVE_LETTER' : e.message;
    }
    const status = (actual === 'REJECTED_DRIVE_LETTER') ? 'PASS' : 'FAIL';
    recordResult('CONT-03', 'Windows drive letter C: rejected', 'REJECTED_DRIVE_LETTER', actual, status, 'CONT-03.log', `ACTUAL: ${actual}\n`);
  }

  // CONT-04: UNC path //server/share/file
  {
    let actual = '';
    try {
      normalizeSafePath('//server/share/file');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'INVALID_ABSOLUTE_PATH') ? 'REJECTED_UNC_PATH' : e.message;
    }
    const status = (actual === 'REJECTED_UNC_PATH') ? 'PASS' : 'FAIL';
    recordResult('CONT-04', 'UNC path //server/share rejected', 'REJECTED_UNC_PATH', actual, status, 'CONT-04.log', `ACTUAL: ${actual}\n`);
  }

  // CONT-05: NUL character in path
  {
    let actual = '';
    try {
      normalizeSafePath('scratch/test\x00.js');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'INVALID_PATH_CONTROL_CHARS') ? 'REJECTED_CONTROL_CHAR' : e.message;
    }
    const status = (actual === 'REJECTED_CONTROL_CHAR') ? 'PASS' : 'FAIL';
    recordResult('CONT-05', 'NUL byte in path rejected fail-closed', 'REJECTED_CONTROL_CHAR', actual, status, 'CONT-05.log', `ACTUAL: ${actual}\n`);
  }

  // CONT-06: Escaping symlinked parent directory
  {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0410-cont-06-'));
    const outsideDir = fs.mkdtempSync(path.join('/tmp', 'w0410-outside-'));
    fs.symlinkSync(outsideDir, path.join(tmpDir, 'symlink_dir'));

    let actual = '';
    try {
      verifyFilesystemContainment(tmpDir, 'symlink_dir/subfile.js');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && (e.code === 'CONTAINMENT_BREACH' || e.code === 'SYMLINK_PARENT_ESCAPES')) ? 'REJECTED_ESCAPING_SYMLINK' : e.message;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });

    const status = (actual === 'REJECTED_ESCAPING_SYMLINK') ? 'PASS' : 'FAIL';
    recordResult('CONT-06', 'Symlink parent directory escaping root rejected fail-closed', 'REJECTED_ESCAPING_SYMLINK', actual, status, 'CONT-06.log', `ACTUAL: ${actual}\n`);
  }

  console.log(`Containment suite finished: ${contResults.length} scenarios. All pass: ${contResults.every(r => r.status === 'PASS')}`);
  if (!contResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return contResults;
}

module.exports = { runContainmentSuite, contResults };

if (require.main === module) {
  runContainmentSuite();
}
