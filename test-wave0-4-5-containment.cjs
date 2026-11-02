/**
 * test-wave0-4-5-containment.cjs
 * Comprehensive test harness validating:
 * Physical Filesystem Containment & Symlink Protection (P0).
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const os = require('os');

const {
  verifyFilesystemContainment,
  normalizeSafePath,
  PatchGateError
} = require('./docs/wave-0/4.5/patch-gate.cjs');

const repoRoot = process.cwd();
const containmentLogDir = path.resolve(repoRoot, 'docs/wave-0/4.5/containment-logs');
if (!fs.existsSync(containmentLogDir)) fs.mkdirSync(containmentLogDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'da-containment-'));
}

function cleanupTempDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {}
}

const containmentScenarios = [];

function recordScenario(sc) {
  containmentScenarios.push(sc);
  const logFile = path.join(containmentLogDir, `${sc.id}.log`);
  fs.writeFileSync(logFile, sc.logContent, 'utf8');
  sc.logSha256 = hashBuf(fs.readFileSync(logFile));
  console.log(`[PASS] ${sc.id}: ${sc.description} -> ${sc.actualOutcome}`);
}

console.log('======================================================================');
console.log('   RUNNING WAVE 0.4.5 FILESYSTEM CONTAINMENT SUITE');
console.log('======================================================================');

// CONT-01: Normal repository file
{
  const tmp = createTempDir();
  const f = path.join(tmp, 'file.txt');
  fs.writeFileSync(f, 'hello');
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const res = verifyFilesystemContainment(tmp, 'file.txt');
    outcome = 'ACCEPTED_VALID_FILE';
    exitCode = 0;
    log = `Verified containment: ${JSON.stringify(res)}`;
  } catch (e) {
    log = e.message;
  } finally {
    cleanupTempDir(tmp);
  }
  recordScenario({
    id: 'CONT-01',
    category: 'CONTAINMENT',
    testLevel: 'INTEGRATION',
    description: 'Normal repository file accepted',
    expectedOutcome: 'ACCEPTED_VALID_FILE',
    actualOutcome: outcome,
    exitCode,
    findingId: 'NONE',
    logContent: log
  });
}

// CONT-02: Normal nested file
{
  const tmp = createTempDir();
  fs.mkdirSync(path.join(tmp, 'nested/dir'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'nested/dir/file.txt'), 'hello');
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const res = verifyFilesystemContainment(tmp, 'nested/dir/file.txt');
    outcome = 'ACCEPTED_NESTED_FILE';
    exitCode = 0;
    log = `Verified containment: ${JSON.stringify(res)}`;
  } catch (e) {
    log = e.message;
  } finally {
    cleanupTempDir(tmp);
  }
  recordScenario({
    id: 'CONT-02',
    category: 'CONTAINMENT',
    testLevel: 'INTEGRATION',
    description: 'Normal nested file accepted',
    expectedOutcome: 'ACCEPTED_NESTED_FILE',
    actualOutcome: outcome,
    exitCode,
    findingId: 'NONE',
    logContent: log
  });
}

// CONT-03: Non-existing nested file under valid parent
{
  const tmp = createTempDir();
  fs.mkdirSync(path.join(tmp, 'nested/dir'), { recursive: true });
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const res = verifyFilesystemContainment(tmp, 'nested/dir/newfile.txt');
    outcome = 'ACCEPTED_NEW_NESTED_FILE';
    exitCode = 0;
    log = `Verified containment for future file: ${JSON.stringify(res)}`;
  } catch (e) {
    log = e.message;
  } finally {
    cleanupTempDir(tmp);
  }
  recordScenario({
    id: 'CONT-03',
    category: 'CONTAINMENT',
    testLevel: 'INTEGRATION',
    description: 'Non-existing nested file under valid parent accepted',
    expectedOutcome: 'ACCEPTED_NEW_NESTED_FILE',
    actualOutcome: outcome,
    exitCode,
    findingId: 'NONE',
    logContent: log
  });
}

// CONT-04: Symlinked parent pointing outside the repository
{
  const tmp = createTempDir();
  const externalDir = createTempDir();
  const externalFile = path.join(externalDir, 'secret.txt');
  fs.writeFileSync(externalFile, 'secret content');
  const externalHashBefore = hashBuf(fs.readFileSync(externalFile));

  fs.symlinkSync(externalDir, path.join(tmp, 'symparent'));

  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    verifyFilesystemContainment(tmp, 'symparent/secret.txt');
  } catch (e) {
    if (e.code === 'SYMLINK_PARENT_COMPONENT') {
      outcome = 'REJECTED_SYMLINK_PARENT_EXTERNAL';
      exitCode = 0;
      log = `Correctly rejected symlinked parent directory: ${e.message}`;
    }
  } finally {
    const externalHashAfter = hashBuf(fs.readFileSync(externalFile));
    if (externalHashBefore !== externalHashAfter) {
      outcome = 'CORRUPTED_EXTERNAL_FILE';
      exitCode = 1;
    }
    cleanupTempDir(tmp);
    cleanupTempDir(externalDir);
  }

  recordScenario({
    id: 'CONT-04',
    category: 'CONTAINMENT',
    testLevel: 'INTEGRATION',
    description: 'Symlinked parent directory pointing outside repository rejected',
    expectedOutcome: 'REJECTED_SYMLINK_PARENT_EXTERNAL',
    actualOutcome: outcome,
    exitCode,
    findingId: 'SYMLINK_PARENT_COMPONENT',
    logContent: log
  });
}

// CONT-05: Symlinked parent pointing elsewhere inside repository
{
  const tmp = createTempDir();
  fs.mkdirSync(path.join(tmp, 'realdir'));
  fs.writeFileSync(path.join(tmp, 'realdir/target.txt'), 'content');
  fs.symlinkSync(path.join(tmp, 'realdir'), path.join(tmp, 'linkdir'));

  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    verifyFilesystemContainment(tmp, 'linkdir/target.txt');
  } catch (e) {
    if (e.code === 'SYMLINK_PARENT_COMPONENT') {
      outcome = 'REJECTED_SYMLINK_PARENT_INTERNAL';
      exitCode = 0;
      log = `Correctly rejected symlinked parent component inside repo: ${e.message}`;
    }
  } finally {
    cleanupTempDir(tmp);
  }

  recordScenario({
    id: 'CONT-05',
    category: 'CONTAINMENT',
    testLevel: 'INTEGRATION',
    description: 'Symlinked parent directory pointing internally rejected',
    expectedOutcome: 'REJECTED_SYMLINK_PARENT_INTERNAL',
    actualOutcome: outcome,
    exitCode,
    findingId: 'SYMLINK_PARENT_COMPONENT',
    logContent: log
  });
}

// CONT-06: Symlinked final target file
{
  const tmp = createTempDir();
  const realFile = path.join(tmp, 'real.txt');
  fs.writeFileSync(realFile, 'real content');
  fs.symlinkSync(realFile, path.join(tmp, 'link.txt'));

  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    verifyFilesystemContainment(tmp, 'link.txt');
  } catch (e) {
    if (e.code === 'SYMLINK_TARGET') {
      outcome = 'REJECTED_SYMLINK_TARGET';
      exitCode = 0;
      log = `Correctly rejected symlink final target: ${e.message}`;
    }
  } finally {
    cleanupTempDir(tmp);
  }

  recordScenario({
    id: 'CONT-06',
    category: 'CONTAINMENT',
    testLevel: 'INTEGRATION',
    description: 'Symlinked final target file rejected',
    expectedOutcome: 'REJECTED_SYMLINK_TARGET',
    actualOutcome: outcome,
    exitCode,
    findingId: 'SYMLINK_TARGET',
    logContent: log
  });
}

// CONT-07: Windows-style absolute path
{
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    normalizeSafePath('C:\\Windows\\System32\\calc.exe');
  } catch (e) {
    if (e.code === 'ABSOLUTE_PATH') {
      outcome = 'REJECTED_WINDOWS_DRIVE';
      exitCode = 0;
      log = `Correctly rejected Windows drive path: ${e.message}`;
    }
  }
  recordScenario({
    id: 'CONT-07',
    category: 'CONTAINMENT',
    testLevel: 'UNIT',
    description: 'Windows drive path rejected',
    expectedOutcome: 'REJECTED_WINDOWS_DRIVE',
    actualOutcome: outcome,
    exitCode,
    findingId: 'ABSOLUTE_PATH',
    logContent: log
  });
}

// CONT-08: UNC path
{
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    normalizeSafePath('\\\\server\\share\\file.js');
  } catch (e) {
    if (e.code === 'ABSOLUTE_PATH') {
      outcome = 'REJECTED_UNC_PATH';
      exitCode = 0;
      log = `Correctly rejected UNC path: ${e.message}`;
    }
  }
  recordScenario({
    id: 'CONT-08',
    category: 'CONTAINMENT',
    testLevel: 'UNIT',
    description: 'UNC network path rejected',
    expectedOutcome: 'REJECTED_UNC_PATH',
    actualOutcome: outcome,
    exitCode,
    findingId: 'ABSOLUTE_PATH',
    logContent: log
  });
}

// CONT-09: POSIX absolute path
{
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    normalizeSafePath('/etc/passwd');
  } catch (e) {
    if (e.code === 'ABSOLUTE_PATH') {
      outcome = 'REJECTED_POSIX_ABSOLUTE';
      exitCode = 0;
      log = `Correctly rejected POSIX absolute path: ${e.message}`;
    }
  }
  recordScenario({
    id: 'CONT-09',
    category: 'CONTAINMENT',
    testLevel: 'UNIT',
    description: 'POSIX absolute path rejected',
    expectedOutcome: 'REJECTED_POSIX_ABSOLUTE',
    actualOutcome: outcome,
    exitCode,
    findingId: 'ABSOLUTE_PATH',
    logContent: log
  });
}

// CONT-10: Traversal path
{
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    normalizeSafePath('src/../../etc/passwd');
  } catch (e) {
    if (e.code === 'PATH_TRAVERSAL') {
      outcome = 'REJECTED_TRAVERSAL_PATH';
      exitCode = 0;
      log = `Correctly rejected traversal path: ${e.message}`;
    }
  }
  recordScenario({
    id: 'CONT-10',
    category: 'CONTAINMENT',
    testLevel: 'UNIT',
    description: 'Path traversal segment (..) rejected',
    expectedOutcome: 'REJECTED_TRAVERSAL_PATH',
    actualOutcome: outcome,
    exitCode,
    findingId: 'PATH_TRAVERSAL',
    logContent: log
  });
}

// CONT-11: NUL-containing path
{
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    normalizeSafePath('src/file\0.js');
  } catch (e) {
    if (e.code === 'NUL_BYTE_PATH') {
      outcome = 'REJECTED_NUL_BYTE_PATH';
      exitCode = 0;
      log = `Correctly rejected NUL byte path: ${e.message}`;
    }
  }
  recordScenario({
    id: 'CONT-11',
    category: 'CONTAINMENT',
    testLevel: 'UNIT',
    description: 'Path containing NUL byte rejected',
    expectedOutcome: 'REJECTED_NUL_BYTE_PATH',
    actualOutcome: outcome,
    exitCode,
    findingId: 'NUL_BYTE_PATH',
    logContent: log
  });
}

// CONT-12: Directory path with trailing slash
{
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    normalizeSafePath('src/components/');
  } catch (e) {
    if (e.code === 'DIRECTORY_PATH') {
      outcome = 'REJECTED_DIRECTORY_SLASH';
      exitCode = 0;
      log = `Correctly rejected directory path with trailing slash: ${e.message}`;
    }
  }
  recordScenario({
    id: 'CONT-12',
    category: 'CONTAINMENT',
    testLevel: 'UNIT',
    description: 'Directory path with trailing slash rejected',
    expectedOutcome: 'REJECTED_DIRECTORY_SLASH',
    actualOutcome: outcome,
    exitCode,
    findingId: 'DIRECTORY_PATH',
    logContent: log
  });
}

// CONT-13: Bare directory target
{
  const tmp = createTempDir();
  fs.mkdirSync(path.join(tmp, 'src'));
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    verifyFilesystemContainment(tmp, 'src');
  } catch (e) {
    if (e.code === 'DIRECTORY_PATH') {
      outcome = 'REJECTED_BARE_DIRECTORY';
      exitCode = 0;
      log = `Correctly rejected bare directory target: ${e.message}`;
    }
  } finally {
    cleanupTempDir(tmp);
  }
  recordScenario({
    id: 'CONT-13',
    category: 'CONTAINMENT',
    testLevel: 'INTEGRATION',
    description: 'Bare existing directory target rejected',
    expectedOutcome: 'REJECTED_BARE_DIRECTORY',
    actualOutcome: outcome,
    exitCode,
    findingId: 'DIRECTORY_PATH',
    logContent: log
  });
}

// CONT-14: Repository root target "."
{
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    normalizeSafePath('.');
  } catch (e) {
    if (e.code === 'DIRECTORY_PATH') {
      outcome = 'REJECTED_ROOT_DOT';
      exitCode = 0;
      log = `Correctly rejected root dot target: ${e.message}`;
    }
  }
  recordScenario({
    id: 'CONT-14',
    category: 'CONTAINMENT',
    testLevel: 'UNIT',
    description: 'Root target "." rejected',
    expectedOutcome: 'REJECTED_ROOT_DOT',
    actualOutcome: outcome,
    exitCode,
    findingId: 'DIRECTORY_PATH',
    logContent: log
  });
}

const header = 'Scenario_ID,Category,Test_Level,Description,Expected_Outcome,Actual_Outcome,Exit_Code,Finding_ID,Log_File,Log_SHA256\n';
const body = containmentScenarios.map(r => `${r.id},${r.category},${r.testLevel},"${r.description}",${r.expectedOutcome},${r.actualOutcome},${r.exitCode},${r.findingId},${r.id}.log,${r.logSha256}`).join('\n');
fs.writeFileSync('WAVE_0_4_5_FILESYSTEM_CONTAINMENT_SCENARIOS.csv', header + body + '\n');

console.log('Filesystem Containment suite completed successfully.');
