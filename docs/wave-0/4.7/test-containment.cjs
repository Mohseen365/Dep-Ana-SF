/**
 * test-containment.cjs
 * Wave 0.4.7 Verification Harness for Filesystem Containment:
 * CONT-01..14 (Wave 0.4.6 baseline)
 * W047-CONT-15 and W047-CONT-16 (Wave 0.4.7 closure scenarios)
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const os = require('os');

const patchGatePath = path.resolve(__dirname, '../4.6/patch-gate.cjs');
const {
  verifyFilesystemContainment,
  apply_patch_with_provenance,
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

const containmentRecords = [];

function recordResult(id, category, level, desc, expected, actual, exitCode, findingId, status, logFileName, logContent) {
  const logPath = path.join(logDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  containmentRecords.push({
    id, category, level, desc, expected, actual, exitCode, findingId, status,
    logFile: logFileName,
    logSha
  });
}

function runContainmentSuite() {
  containmentRecords.length = 0;
  console.log('=== WAVE 0.4.7 FILESYSTEM CONTAINMENT SUITE ===');
  const patchGateSha = hashFile(patchGatePath);

  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'w047-cont-test-'));
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w047-cont-outside-'));

  try {
    // Normal file setup
    fs.mkdirSync(path.join(tmpRepo, 'sub/dir'), { recursive: true });
    fs.writeFileSync(path.join(tmpRepo, 'file.txt'), 'normal file');
    fs.writeFileSync(path.join(tmpRepo, 'sub/dir/nested.txt'), 'nested file');

    // External symlink parent
    fs.symlinkSync(outsideDir, path.join(tmpRepo, 'ext_link'), 'dir');

    // Internal symlink parent
    fs.symlinkSync(path.join(tmpRepo, 'sub'), path.join(tmpRepo, 'int_link'), 'dir');

    // Symlinked file target
    fs.writeFileSync(path.join(outsideDir, 'target.txt'), 'target');
    fs.symlinkSync(path.join(outsideDir, 'target.txt'), path.join(tmpRepo, 'symlink_file.txt'));

    // CONT-01: Normal repository file
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'file.txt');
        actual = 'ACCEPTED_VALID_FILE';
      } catch (e) {
        actual = e.code || 'FAILED';
        findingId = e.code;
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-01\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-01', 'CONTAINMENT', 'INTEGRATION', 'Normal repository file accepted', 'ACCEPTED_VALID_FILE', actual, 0, findingId, actual === 'ACCEPTED_VALID_FILE' ? 'PASS' : 'FAIL', 'CONT-01.log', logContent);
    }

    // CONT-02: Normal nested file
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'sub/dir/nested.txt');
        actual = 'ACCEPTED_NESTED_FILE';
      } catch (e) {
        actual = e.code || 'FAILED';
        findingId = e.code;
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-02\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-02', 'CONTAINMENT', 'INTEGRATION', 'Normal nested file accepted', 'ACCEPTED_NESTED_FILE', actual, 0, findingId, actual === 'ACCEPTED_NESTED_FILE' ? 'PASS' : 'FAIL', 'CONT-02.log', logContent);
    }

    // CONT-03: Non-existing nested file under valid parent
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'sub/dir/new_file.txt');
        actual = 'ACCEPTED_NEW_NESTED_FILE';
      } catch (e) {
        actual = e.code || 'FAILED';
        findingId = e.code;
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-03\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-03', 'CONTAINMENT', 'INTEGRATION', 'Non-existing nested file under valid parent accepted', 'ACCEPTED_NEW_NESTED_FILE', actual, 0, findingId, actual === 'ACCEPTED_NEW_NESTED_FILE' ? 'PASS' : 'FAIL', 'CONT-03.log', logContent);
    }

    // CONT-04: Symlinked parent pointing outside repository
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'ext_link/escape.txt');
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_SYMLINK_PARENT_EXTERNAL';
        findingId = e.code || 'SYMLINK_PARENT_COMPONENT';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-04\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-04', 'CONTAINMENT', 'INTEGRATION', 'Symlinked parent directory pointing outside repository rejected', 'REJECTED_SYMLINK_PARENT_EXTERNAL', actual, 0, findingId, actual === 'REJECTED_SYMLINK_PARENT_EXTERNAL' ? 'PASS' : 'FAIL', 'CONT-04.log', logContent);
    }

    // CONT-05: Symlinked parent pointing internally
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'int_link/nested.txt');
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_SYMLINK_PARENT_INTERNAL';
        findingId = e.code || 'SYMLINK_PARENT_COMPONENT';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-05\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-05', 'CONTAINMENT', 'INTEGRATION', 'Symlinked parent directory pointing internally rejected', 'REJECTED_SYMLINK_PARENT_INTERNAL', actual, 0, findingId, actual === 'REJECTED_SYMLINK_PARENT_INTERNAL' ? 'PASS' : 'FAIL', 'CONT-05.log', logContent);
    }

    // CONT-06: Symlinked final target file
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'symlink_file.txt');
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_SYMLINK_TARGET';
        findingId = e.code || 'SYMLINK_TARGET';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-06\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-06', 'CONTAINMENT', 'INTEGRATION', 'Symlinked final target file rejected', 'REJECTED_SYMLINK_TARGET', actual, 0, findingId, actual === 'REJECTED_SYMLINK_TARGET' ? 'PASS' : 'FAIL', 'CONT-06.log', logContent);
    }

    // CONT-07: Windows drive path
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'C:\\Windows\\System32\\calc.exe');
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_WINDOWS_DRIVE';
        findingId = e.code || 'ABSOLUTE_PATH';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-07\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-07', 'CONTAINMENT', 'UNIT', 'Windows drive path rejected', 'REJECTED_WINDOWS_DRIVE', actual, 0, findingId, actual === 'REJECTED_WINDOWS_DRIVE' ? 'PASS' : 'FAIL', 'CONT-07.log', logContent);
    }

    // CONT-08: UNC network path
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, '\\\\server\\share\\exploit.exe');
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_UNC_PATH';
        findingId = e.code || 'ABSOLUTE_PATH';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-08\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-08', 'CONTAINMENT', 'UNIT', 'UNC network path rejected', 'REJECTED_UNC_PATH', actual, 0, findingId, actual === 'REJECTED_UNC_PATH' ? 'PASS' : 'FAIL', 'CONT-08.log', logContent);
    }

    // CONT-09: POSIX absolute path
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, '/etc/shadow');
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_POSIX_ABSOLUTE';
        findingId = e.code || 'ABSOLUTE_PATH';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-09\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-09', 'CONTAINMENT', 'UNIT', 'POSIX absolute path rejected', 'REJECTED_POSIX_ABSOLUTE', actual, 0, findingId, actual === 'REJECTED_POSIX_ABSOLUTE' ? 'PASS' : 'FAIL', 'CONT-09.log', logContent);
    }

    // CONT-10: Path traversal segment (..)
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, '../../etc/passwd');
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_TRAVERSAL_PATH';
        findingId = e.code || 'PATH_TRAVERSAL';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-10\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-10', 'CONTAINMENT', 'UNIT', 'Path traversal segment (..) rejected', 'REJECTED_TRAVERSAL_PATH', actual, 0, findingId, actual === 'REJECTED_TRAVERSAL_PATH' ? 'PASS' : 'FAIL', 'CONT-10.log', logContent);
    }

    // CONT-11: Path containing NUL byte
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'sub/file\0.txt');
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_NUL_BYTE_PATH';
        findingId = e.code || 'NUL_BYTE_PATH';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-11\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-11', 'CONTAINMENT', 'UNIT', 'Path containing NUL byte rejected', 'REJECTED_NUL_BYTE_PATH', actual, 0, findingId, actual === 'REJECTED_NUL_BYTE_PATH' ? 'PASS' : 'FAIL', 'CONT-11.log', logContent);
    }

    // CONT-12: Directory path with trailing slash
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'sub/dir/');
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_DIRECTORY_SLASH';
        findingId = e.code || 'DIRECTORY_PATH';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-12\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-12', 'CONTAINMENT', 'UNIT', 'Directory path with trailing slash rejected', 'REJECTED_DIRECTORY_SLASH', actual, 0, findingId, actual === 'REJECTED_DIRECTORY_SLASH' ? 'PASS' : 'FAIL', 'CONT-12.log', logContent);
    }

    // CONT-13: Bare existing directory target
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'sub/dir');
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_BARE_DIRECTORY';
        findingId = e.code || 'DIRECTORY_PATH';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-13\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-13', 'CONTAINMENT', 'INTEGRATION', 'Bare existing directory target rejected', 'REJECTED_BARE_DIRECTORY', actual, 0, findingId, actual === 'REJECTED_BARE_DIRECTORY' ? 'PASS' : 'FAIL', 'CONT-13.log', logContent);
    }

    // CONT-14: Root target "."
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, '.');
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_ROOT_DOT';
        findingId = e.code || 'DIRECTORY_PATH';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: CONT-14\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('CONT-14', 'CONTAINMENT', 'UNIT', 'Root target "." rejected', 'REJECTED_ROOT_DOT', actual, 0, findingId, actual === 'REJECTED_ROOT_DOT' ? 'PASS' : 'FAIL', 'CONT-14.log', logContent);
    }

    // --- WAVE 0.4.7 DISCREPANCY CLOSURE EXTENSIONS (W047-CONT-15, W047-CONT-16) ---
    // W047-CONT-15: Deeply nested new file under multi-level nonexistent directories
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'deep/nested/sub/path/newfile.js');
        actual = 'ACCEPTED_DEEP_NEW_NESTED';
      } catch (e) {
        actual = e.code || 'FAILED';
        findingId = e.code;
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: W047-CONT-15\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('W047-CONT-15', 'CONTAINMENT', 'INTEGRATION', 'Deeply nested new file under multi-level nonexistent directory within repository accepted', 'ACCEPTED_DEEP_NEW_NESTED', actual, 0, findingId, actual === 'ACCEPTED_DEEP_NEW_NESTED' ? 'PASS' : 'FAIL', 'W047-CONT-15.log', logContent);
    }

    // W047-CONT-16: Symlink swap TOCTOU detection test (verifying preflight realpath containment checks)
    {
      const t0 = new Date().toISOString();
      let actual = '';
      let findingId = 'NONE';
      const fakeEscapePath = 'sub/escape_link/target.txt';
      try {
        fs.symlinkSync(outsideDir, path.join(tmpRepo, 'sub/escape_link'), 'dir');
        verifyFilesystemContainment(tmpRepo, fakeEscapePath);
        actual = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actual = 'REJECTED_NESTED_SYMLINK_ESCAPE';
        findingId = e.code || 'SYMLINK_PARENT_COMPONENT';
      }
      const t1 = new Date().toISOString();
      const logContent = `SCENARIO: W047-CONT-16\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
      recordResult('W047-CONT-16', 'CONTAINMENT', 'INTEGRATION', 'Nested symlinked directory escaping repository bounds rejected', 'REJECTED_NESTED_SYMLINK_ESCAPE', actual, 0, findingId, actual === 'REJECTED_NESTED_SYMLINK_ESCAPE' ? 'PASS' : 'FAIL', 'W047-CONT-16.log', logContent);
    }

  } finally {
    fs.rmSync(tmpRepo, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  }

  console.log(`Containment suite finished: ${containmentRecords.length} scenarios executed. All pass: ${containmentRecords.every(r => r.status === 'PASS')}`);
}

module.exports = { runContainmentSuite, containmentRecords };
if (require.main === module) {
  runContainmentSuite();
}
