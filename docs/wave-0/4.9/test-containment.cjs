/**
 * test-containment.cjs
 * Wave 0.4.8 Filesystem Containment & Deterministic Race Harness
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const os = require('os');

const {
  verifyFilesystemContainment,
  apply_patch_with_provenance,
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

const containmentResults = [];

function recordResult(id, desc, expectedCode, actualCode, status, logFileName, logContent) {
  const logPath = path.join(logDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  containmentResults.push({
    id,
    desc,
    expectedCode,
    actualCode,
    status,
    logFile: logFileName,
    logSha
  });
}

function runContainmentSuite() {
  console.log('=== WAVE 0.4.8 FILESYSTEM CONTAINMENT & RACE SUITE (16 SCENARIOS) ===');

  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'w048-cont-repo-'));
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w048-cont-outside-'));
  const sentinelFile = path.join(outsideDir, 'sentinel.txt');
  fs.writeFileSync(sentinelFile, 'SENTINEL_DATA_MUST_NOT_BE_MODIFIED\n', 'utf8');
  const sentinelHash = hashFile(sentinelFile);

  try {
    cp.spawnSync('git', ['init', '-b', 'main'], { cwd: tmpRepo });
    cp.spawnSync('git', ['config', 'user.name', 'Containment Test'], { cwd: tmpRepo });
    cp.spawnSync('git', ['config', 'user.email', 'containment@test.local'], { cwd: tmpRepo });

    const existingFile = path.join(tmpRepo, 'sub/dir/test.js');
    fs.mkdirSync(path.dirname(existingFile), { recursive: true });
    fs.writeFileSync(existingFile, '// valid test\n', 'utf8');

    // CONT-01
    {
      let actualCode = 'NONE';
      try {
        const res = verifyFilesystemContainment(tmpRepo, 'sub/dir/test.js');
        actualCode = res.fullPath ? 'ACCEPTED' : 'FAILED';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'ACCEPTED') ? 'PASS' : 'FAIL';
      recordResult('CONT-01', 'Valid target file inside boundary accepted', 'ACCEPTED', actualCode, status, 'CONT-01.log', `SCENARIO: CONT-01\nSTATUS: ${status}\n`);
    }

    // CONT-02
    {
      let actualCode = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'sub/../../outside.txt');
        actualCode = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'PATH_TRAVERSAL') ? 'PASS' : 'FAIL';
      recordResult('CONT-02', 'Target with .. rejected', 'PATH_TRAVERSAL', actualCode, status, 'CONT-02.log', `SCENARIO: CONT-02\nSTATUS: ${status}\n`);
    }

    // CONT-03
    {
      let actualCode = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, '/etc/passwd');
        actualCode = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'INVALID_ABSOLUTE_PATH') ? 'PASS' : 'FAIL';
      recordResult('CONT-03', 'Absolute filesystem path rejected', 'INVALID_ABSOLUTE_PATH', actualCode, status, 'CONT-03.log', `SCENARIO: CONT-03\nSTATUS: ${status}\n`);
    }

    // CONT-04
    {
      let actualCode = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, '.');
        actualCode = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'DIRECTORY_TARGET_NOT_ALLOWED') ? 'PASS' : 'FAIL';
      recordResult('CONT-04', 'Target pointing to directory root rejected', 'DIRECTORY_TARGET_NOT_ALLOWED', actualCode, status, 'CONT-04.log', `SCENARIO: CONT-04\nSTATUS: ${status}\n`);
    }

    // CONT-05
    {
      let actualCode = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'C:\\Windows\\System32\\cmd.exe');
        actualCode = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'INVALID_ABSOLUTE_PATH') ? 'PASS' : 'FAIL';
      recordResult('CONT-05', 'Drive letter / UNC path rejected', 'INVALID_ABSOLUTE_PATH', actualCode, status, 'CONT-05.log', `SCENARIO: CONT-05\nSTATUS: ${status}\n`);
    }

    // CONT-06
    {
      const linkPath = path.join(tmpRepo, 'symlink_target.js');
      fs.symlinkSync(existingFile, linkPath);
      let actualCode = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'symlink_target.js');
        actualCode = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'SYMLINK_TARGET') ? 'PASS' : 'FAIL';
      recordResult('CONT-06', 'Direct symlink target rejected', 'SYMLINK_TARGET', actualCode, status, 'CONT-06.log', `SCENARIO: CONT-06\nSTATUS: ${status}\n`);
    }

    // CONT-07
    {
      const outsideLink = path.join(tmpRepo, 'outside_link.txt');
      fs.symlinkSync(sentinelFile, outsideLink);
      let actualCode = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'outside_link.txt');
        actualCode = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'SYMLINK_TARGET') ? 'PASS' : 'FAIL';
      recordResult('CONT-07', 'Symlink pointing outside repository rejected', 'SYMLINK_TARGET', actualCode, status, 'CONT-07.log', `SCENARIO: CONT-07\nSTATUS: ${status}\n`);
    }

    // CONT-08
    {
      const parentLink = path.join(tmpRepo, 'symlink_parent');
      fs.symlinkSync(outsideDir, parentLink, 'dir');
      let actualCode = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'symlink_parent/secret.txt');
        actualCode = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'SYMLINK_PARENT_COMPONENT') ? 'PASS' : 'FAIL';
      recordResult('CONT-08', 'Symlinked parent directory rejected', 'SYMLINK_PARENT_COMPONENT', actualCode, status, 'CONT-08.log', `SCENARIO: CONT-08\nSTATUS: ${status}\n`);
    }

    // CONT-09
    {
      const loopA = path.join(tmpRepo, 'loopA');
      const loopB = path.join(tmpRepo, 'loopB');
      try {
        fs.symlinkSync(loopB, loopA);
        fs.symlinkSync(loopA, loopB);
      } catch (e) {}

      let actualCode = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'loopA');
        actualCode = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'SYMLINK_TARGET') ? 'PASS' : 'FAIL';
      recordResult('CONT-09', 'Infinite symlink loop rejected', 'SYMLINK_TARGET', actualCode, status, 'CONT-09.log', `SCENARIO: CONT-09\nSTATUS: ${status}\n`);
    }

    // CONT-10
    {
      let actualCode = 'NONE';
      try {
        verifyFilesystemContainment(tmpRepo, 'sub/dir');
        actualCode = 'UNEXPECTED_ACCEPT';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'DIRECTORY_TARGET_NOT_ALLOWED') ? 'PASS' : 'FAIL';
      recordResult('CONT-10', 'Directory target rejected', 'DIRECTORY_TARGET_NOT_ALLOWED', actualCode, status, 'CONT-10.log', `SCENARIO: CONT-10\nSTATUS: ${status}\n`);
    }

    // CONT-11
    {
      const deepFile = path.join(tmpRepo, 'a/b/c/d/deep.js');
      fs.mkdirSync(path.dirname(deepFile), { recursive: true });
      fs.writeFileSync(deepFile, '// deep\n', 'utf8');

      let actualCode = 'NONE';
      try {
        const res = verifyFilesystemContainment(tmpRepo, 'a/b/c/d/deep.js');
        actualCode = res.fullPath ? 'ACCEPTED' : 'FAILED';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'ACCEPTED') ? 'PASS' : 'FAIL';
      recordResult('CONT-11', 'Deeply nested valid file accepted', 'ACCEPTED', actualCode, status, 'CONT-11.log', `SCENARIO: CONT-11\nSTATUS: ${status}\n`);
    }

    // CONT-12
    {
      let actualCode = 'NONE';
      try {
        const res = verifyFilesystemContainment(tmpRepo, 'sub/dir/new_leaf_file.js');
        actualCode = res.fullPath ? 'ACCEPTED' : 'FAILED';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'ACCEPTED') ? 'PASS' : 'FAIL';
      recordResult('CONT-12', 'Non-existent leaf file under valid path accepted', 'ACCEPTED', actualCode, status, 'CONT-12.log', `SCENARIO: CONT-12\nSTATUS: ${status}\n`);
    }

    // CONT-13
    {
      let actualCode = 'NONE';
      try {
        const res = verifyFilesystemContainment(tmpRepo, './sub/dir/test.js');
        actualCode = (res.normRel === 'sub/dir/test.js') ? 'NORMALIZED_ACCEPTED' : 'FAILED';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'NORMALIZED_ACCEPTED') ? 'PASS' : 'FAIL';
      recordResult('CONT-13', 'Benign dot-slash prefix normalized and accepted', 'NORMALIZED_ACCEPTED', actualCode, status, 'CONT-13.log', `SCENARIO: CONT-13\nSTATUS: ${status}\n`);
    }

    // CONT-14
    {
      let actualCode = 'NONE';
      try {
        const res = verifyFilesystemContainment(tmpRepo, 'sub//dir///test.js');
        actualCode = (res.normRel === 'sub/dir/test.js') ? 'NORMALIZED_ACCEPTED' : 'FAILED';
      } catch (e) {
        actualCode = e.code;
      }
      const status = (actualCode === 'NORMALIZED_ACCEPTED') ? 'PASS' : 'FAIL';
      recordResult('CONT-14', 'Redundant slash sequences normalized safely', 'NORMALIZED_ACCEPTED', actualCode, status, 'CONT-14.log', `SCENARIO: CONT-14\nSTATUS: ${status}\n`);
    }

    // CONT-15: Deterministic parent-symlink replacement attempt after preflight
    {
      const raceRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'w048-race15-'));
      cp.spawnSync('git', ['init', '-b', 'main'], { cwd: raceRepo });
      cp.spawnSync('git', ['config', 'user.name', 'Race Test'], { cwd: raceRepo });
      cp.spawnSync('git', ['config', 'user.email', 'race@test.local'], { cwd: raceRepo });

      const filesToCopy = [
        'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
        'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'
      ];
      for (const f of filesToCopy) {
        fs.copyFileSync(path.join(repoRoot, f), path.join(raceRepo, f));
      }
      fs.mkdirSync(path.join(raceRepo, 'docs/wave-0/4.4'), { recursive: true });
      fs.copyFileSync(
        path.join(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'),
        path.join(raceRepo, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv')
      );

      const targetRel = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
      const targetFull = path.join(raceRepo, targetRel);
      fs.mkdirSync(path.dirname(targetFull), { recursive: true });
      fs.writeFileSync(targetFull, '// Original content\n', 'utf8');

      cp.spawnSync('git', ['add', '.'], { cwd: raceRepo });
      cp.spawnSync('git', ['commit', '-m', 'race baseline'], { cwd: raceRepo });
      const baseSha = cp.execSync('git rev-parse HEAD', { cwd: raceRepo, encoding: 'utf8' }).trim();

      const patch = `diff --git a/${targetRel} b/${targetRel}
--- a/${targetRel}
+++ b/${targetRel}
@@ -1 +1,2 @@
 // Original content
+// Exploit attempt
`;
      let actualCode = 'NONE';
      try {
        apply_patch_with_provenance({
          repoDir: raceRepo,
          patchContent: patch,
          taskId: 'W5-1',
          expectedBaseSha: baseSha,
          _testHookPreMutate: () => {
            const parentDir = path.dirname(targetFull);
            fs.rmSync(parentDir, { recursive: true, force: true });
            fs.symlinkSync(outsideDir, parentDir, 'dir');
          }
        });
        actualCode = 'UNEXPECTED_MUTATE';
      } catch (e) {
        actualCode = e.code;
      }

      const currentSentinelHash = hashFile(sentinelFile);
      const sentinelIntact = (currentSentinelHash.hash === sentinelHash.hash);

      const status = (actualCode === 'SYMLINK_PARENT_COMPONENT' && sentinelIntact) ? 'PASS' : 'FAIL';
      const log = `SCENARIO: CONT-15\nEXPECTED: SYMLINK_PARENT_COMPONENT\nACTUAL: ${actualCode}\nSENTINEL_INTACT: ${sentinelIntact}\nSTATUS: ${status}\n`;
      recordResult('CONT-15', 'Deterministic parent symlink swap between preflight and mutation rejected', 'SYMLINK_PARENT_COMPONENT', actualCode, status, 'CONT-15.log', log);
      fs.rmSync(raceRepo, { recursive: true, force: true });
    }

    // CONT-16: Deterministic target replacement attempt after preflight
    {
      const raceRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'w048-race16-'));
      cp.spawnSync('git', ['init', '-b', 'main'], { cwd: raceRepo });
      cp.spawnSync('git', ['config', 'user.name', 'Race Test'], { cwd: raceRepo });
      cp.spawnSync('git', ['config', 'user.email', 'race@test.local'], { cwd: raceRepo });

      const filesToCopy = [
        'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
        'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'
      ];
      for (const f of filesToCopy) {
        fs.copyFileSync(path.join(repoRoot, f), path.join(raceRepo, f));
      }
      fs.mkdirSync(path.join(raceRepo, 'docs/wave-0/4.4'), { recursive: true });
      fs.copyFileSync(
        path.join(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'),
        path.join(raceRepo, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv')
      );

      const targetRel = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
      const targetFull = path.join(raceRepo, targetRel);
      fs.mkdirSync(path.dirname(targetFull), { recursive: true });
      fs.writeFileSync(targetFull, '// Original content\n', 'utf8');

      cp.spawnSync('git', ['add', '.'], { cwd: raceRepo });
      cp.spawnSync('git', ['commit', '-m', 'race baseline'], { cwd: raceRepo });
      const baseSha = cp.execSync('git rev-parse HEAD', { cwd: raceRepo, encoding: 'utf8' }).trim();

      const patch = `diff --git a/${targetRel} b/${targetRel}
--- a/${targetRel}
+++ b/${targetRel}
@@ -1 +1,2 @@
 // Original content
+// Exploit attempt 2
`;
      let actualCode = 'NONE';
      try {
        apply_patch_with_provenance({
          repoDir: raceRepo,
          patchContent: patch,
          taskId: 'W5-1',
          expectedBaseSha: baseSha,
          _testHookPreMutate: () => {
            fs.unlinkSync(targetFull);
            fs.symlinkSync(sentinelFile, targetFull);
          }
        });
        actualCode = 'UNEXPECTED_MUTATE';
      } catch (e) {
        actualCode = e.code;
      }

      const currentSentinelHash = hashFile(sentinelFile);
      const sentinelIntact = (currentSentinelHash.hash === sentinelHash.hash);

      const status = (actualCode === 'SYMLINK_TARGET' && sentinelIntact) ? 'PASS' : 'FAIL';
      const log = `SCENARIO: CONT-16\nEXPECTED: SYMLINK_TARGET\nACTUAL: ${actualCode}\nSENTINEL_INTACT: ${sentinelIntact}\nSTATUS: ${status}\n`;
      recordResult('CONT-16', 'Deterministic target symlink swap between preflight and mutation rejected', 'SYMLINK_TARGET', actualCode, status, 'CONT-16.log', log);
      fs.rmSync(raceRepo, { recursive: true, force: true });
    }

  } finally {
    fs.rmSync(tmpRepo, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  }

  console.log(`Containment suite finished: ${containmentResults.length} scenarios. All pass: ${containmentResults.every(r => r.status === 'PASS')}`);
  return containmentResults;
}

module.exports = { runContainmentSuite, containmentResults };
if (require.main === module) {
  runContainmentSuite();
}
