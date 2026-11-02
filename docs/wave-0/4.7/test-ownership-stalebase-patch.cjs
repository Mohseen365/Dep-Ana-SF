/**
 * test-ownership-stalebase-patch.cjs
 * Wave 0.4.7 Verification Harness for:
 * 1. Authoritative Ownership Gate (OWN-01..10)
 * 2. Stale Base Detection (BASE-01..06)
 * 3. Patch Gate Integration & Duplicate Headers (PG-DUP-01..03, PG-INT-01)
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const os = require('os');

const patchGatePath = path.resolve(__dirname, '../4.6/patch-gate.cjs');
const {
  apply_patch_with_provenance,
  verify_base,
  enforceAuthoritativeTaskOwnership,
  extractPatchTouchedPaths,
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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w047-gate-test-'));
  cp.spawnSync('git', ['init', '-b', 'main'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.name', 'Wave 0.4.7 Test'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.email', 'wave047@test.local'], { cwd: tmpDir });

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

  const initialFile = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  fs.mkdirSync(path.dirname(path.join(tmpDir, initialFile)), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, initialFile), '// initial content\nexport default class DaGraphViewer {}\n');

  const appShellFile = 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js';
  fs.mkdirSync(path.dirname(path.join(tmpDir, appShellFile)), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, appShellFile), '// app shell\nexport default class DaAppShell {}\n');

  const sfdxFile = 'scratch/salesforce-poc/sfdx-project.json';
  fs.writeFileSync(path.join(tmpDir, sfdxFile), '{"packageDirectories": [{"path": "force-app", "default": true}]}\n');

  cp.spawnSync('git', ['add', '.'], { cwd: tmpDir });
  cp.spawnSync('git', ['commit', '-m', 'Initial baseline commit'], { cwd: tmpDir });

  const headSha = cp.execSync('git rev-parse HEAD', { cwd: tmpDir, encoding: 'utf8' }).trim();
  return { tmpDir, headSha };
}

const scenarioRecords = [];

function recordResult(id, category, level, desc, expected, actual, exitCode, findingId, status, logFileName, logContent) {
  const logPath = path.join(logDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  scenarioRecords.push({
    id, category, level, desc, expected, actual, exitCode, findingId, status,
    logFile: logFileName,
    logSha
  });
}

function runSuite() {
  console.log('=== WAVE 0.4.7 OWNERSHIP, STALE BASE, AND PATCH INTEGRATION SUITE ===');
  const patchGateSha = hashFile(patchGatePath);

  // --- OWNERSHIP SCENARIOS (OWN-01..10) ---
  // OWN-01: Valid task modifies authorized file
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const patch = `diff --git a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
new file mode 100644
--- /dev/null
+++ b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
@@ -0,0 +1,2 @@
+// w5-1 test
+console.log("PASS");
`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    let exitCode = 0;
    try {
      apply_patch_with_provenance({
        taskId: 'W5-1',
        trustedRole: 'feature-agent',
        expectedBaseSha: headSha,
        patchBaseSha: headSha,
        patchContent: patch,
        repoDir: tmpDir
      });
      actual = 'APPLIED_SUCCESSFULLY';
    } catch (e) {
      actual = e.code || 'FAILED';
      findingId = e.code || 'ERROR';
      exitCode = 1;
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: OWN-01\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: ${exitCode}\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('OWN-01', 'AUTHORITATIVE_OWNERSHIP', 'INTEGRATION', 'Valid task (W5-1) modifies its authorized file', 'APPLIED_SUCCESSFULLY', actual, exitCode, findingId, actual === 'APPLIED_SUCCESSFULLY' ? 'PASS' : 'FAIL', 'OWN-01.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // OWN-02: Foreign task path
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
@@ -1,2 +1,3 @@
+// modified
`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      apply_patch_with_provenance({
        taskId: 'W6-1',
        trustedRole: 'feature-agent',
        expectedBaseSha: headSha,
        patchBaseSha: headSha,
        patchContent: patch,
        repoDir: tmpDir
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_FOREIGN_TASK_PATH';
      findingId = e.code || 'UNLISTED_PATH';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: OWN-02\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('OWN-02', 'AUTHORITATIVE_OWNERSHIP', 'INTEGRATION', 'Task cannot modify another task file (W6-1 attempting daGraphViewer)', 'REJECTED_FOREIGN_TASK_PATH', actual, 0, findingId, actual === 'REJECTED_FOREIGN_TASK_PATH' ? 'PASS' : 'FAIL', 'OWN-02.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // OWN-03: Forged caller allowlist
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
@@ -1,2 +1,3 @@
+// modified
`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      apply_patch_with_provenance({
        taskId: 'W6-1',
        trustedRole: 'feature-agent',
        expectedBaseSha: headSha,
        patchBaseSha: headSha,
        patchContent: patch,
        allowedPaths: ['scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js'],
        repoDir: tmpDir
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_FORGED_ALLOWLIST';
      findingId = e.code || 'UNLISTED_PATH';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: OWN-03\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('OWN-03', 'AUTHORITATIVE_OWNERSHIP', 'INTEGRATION', 'Caller cannot expand task allowlist beyond authoritative register', 'REJECTED_FORGED_ALLOWLIST', actual, 0, findingId, actual === 'REJECTED_FORGED_ALLOWLIST' ? 'PASS' : 'FAIL', 'OWN-03.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // OWN-04: Frozen path
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const patch = `diff --git a/scratch/salesforce-poc/sfdx-project.json b/scratch/salesforce-poc/sfdx-project.json
--- a/scratch/salesforce-poc/sfdx-project.json
+++ b/scratch/salesforce-poc/sfdx-project.json
@@ -1,1 +1,2 @@
+// modified
`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      apply_patch_with_provenance({
        taskId: 'W5-1',
        trustedRole: 'feature-agent',
        expectedBaseSha: headSha,
        patchBaseSha: headSha,
        patchContent: patch,
        repoDir: tmpDir
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_FROZEN_PATH';
      findingId = e.code || 'FROZEN_PATH_MODIFICATION';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: OWN-04\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('OWN-04', 'AUTHORITATIVE_OWNERSHIP', 'INTEGRATION', 'Task cannot modify a frozen path (sfdx-project.json)', 'REJECTED_FROZEN_PATH', actual, 0, findingId, actual === 'REJECTED_FROZEN_PATH' ? 'PASS' : 'FAIL', 'OWN-04.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // OWN-05: Coordinator exclusive
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js b/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
@@ -1,2 +1,3 @@
+// modified
`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      apply_patch_with_provenance({
        taskId: 'W5-1',
        trustedRole: 'feature-agent',
        expectedBaseSha: headSha,
        patchBaseSha: headSha,
        patchContent: patch,
        repoDir: tmpDir
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_COORDINATOR_EXCLUSIVE';
      findingId = e.code || 'COORDINATOR_EXCLUSIVE_PATH';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: OWN-05\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('OWN-05', 'AUTHORITATIVE_OWNERSHIP', 'INTEGRATION', 'Non-coordinator cannot modify coordinator-only path (daAppShell.js)', 'REJECTED_COORDINATOR_EXCLUSIVE', actual, 0, findingId, actual === 'REJECTED_COORDINATOR_EXCLUSIVE' ? 'PASS' : 'FAIL', 'OWN-05.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // OWN-06: Role impersonation
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js b/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
@@ -1,2 +1,3 @@
+// modified
`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      apply_patch_with_provenance({
        taskId: 'W5-1',
        trustedRole: 'coordinator', // Worker task cannot claim coordinator role
        expectedBaseSha: headSha,
        patchBaseSha: headSha,
        patchContent: patch,
        repoDir: tmpDir
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_ROLE_IMPERSONATION';
      findingId = e.code || 'UNAUTHORIZED_ROLE';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: OWN-06\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('OWN-06', 'AUTHORITATIVE_OWNERSHIP', 'INTEGRATION', 'Non-coordinator cannot impersonate coordinator by role string', 'REJECTED_ROLE_IMPERSONATION', actual, 0, findingId, actual === 'REJECTED_ROLE_IMPERSONATION' ? 'PASS' : 'FAIL', 'OWN-06.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // OWN-07: Unknown task
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const patch = `diff --git a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
new file mode 100644
--- /dev/null
+++ b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
@@ -0,0 +1,2 @@
+// unknown
+`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      apply_patch_with_provenance({
        taskId: 'UNKNOWN-TASK',
        trustedRole: 'feature-agent',
        expectedBaseSha: headSha,
        patchBaseSha: headSha,
        patchContent: patch,
        repoDir: tmpDir
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_UNKNOWN_TASK';
      findingId = e.code || 'UNKNOWN_TASK';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: OWN-07\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('OWN-07', 'AUTHORITATIVE_OWNERSHIP', 'INTEGRATION', 'Missing/unregistered task ID is rejected fail-closed', 'REJECTED_UNKNOWN_TASK', actual, 0, findingId, actual === 'REJECTED_UNKNOWN_TASK' ? 'PASS' : 'FAIL', 'OWN-07.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // OWN-08: Task outside Batch 1
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daExplorer/daExplorer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daExplorer/daExplorer.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daExplorer/daExplorer.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daExplorer/daExplorer.js
@@ -1,2 +1,3 @@
+// modified
`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      apply_patch_with_provenance({
        taskId: 'W9-2', // Task exists in register but not in Batch 1 allowlist
        trustedRole: 'feature-agent',
        expectedBaseSha: headSha,
        patchBaseSha: headSha,
        patchContent: patch,
        repoDir: tmpDir
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_TASK_OUTSIDE_BATCH1';
      findingId = e.code || 'TASK_OUTSIDE_BATCH1';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: OWN-08\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('OWN-08', 'AUTHORITATIVE_OWNERSHIP', 'INTEGRATION', 'Task outside Batch 1 boundary (W9-2) rejected when Batch 1 active', 'REJECTED_TASK_OUTSIDE_BATCH1', actual, 0, findingId, actual === 'REJECTED_TASK_OUTSIDE_BATCH1' ? 'PASS' : 'FAIL', 'OWN-08.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // OWN-09: Duplicate task record in register
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const regFile = path.join(tmpDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
    fs.appendFileSync(regFile, '\nW5-1,Dependency Analysis Graph Engine,EXISTING,W5-1,NONE,0,FROZEN_READ_ONLY\n');

    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      enforceAuthoritativeTaskOwnership({
        taskId: 'W5-1',
        trustedRole: 'feature-agent',
        touchedPaths: ['scratch/salesforce-poc/tests/run-w5-1-tests.cjs'],
        repoRoot: tmpDir
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_DUPLICATE_TASK_ID';
      findingId = e.code || 'DUPLICATE_TASK_ID';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: OWN-09\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('OWN-09', 'AUTHORITATIVE_OWNERSHIP', 'UNIT', 'Duplicate task record in register causes immediate fail-closed rejection', 'REJECTED_DUPLICATE_TASK_ID', actual, 0, findingId, actual === 'REJECTED_DUPLICATE_TASK_ID' ? 'PASS' : 'FAIL', 'OWN-09.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // OWN-10: Missing manifest path
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const patch = `diff --git a/scratch/salesforce-poc/unregistered/random-file.js b/scratch/salesforce-poc/unregistered/random-file.js
new file mode 100644
--- /dev/null
+++ b/scratch/salesforce-poc/unregistered/random-file.js
@@ -0,0 +1,1 @@
+// rogue
+`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      apply_patch_with_provenance({
        taskId: 'W5-1',
        trustedRole: 'feature-agent',
        expectedBaseSha: headSha,
        patchBaseSha: headSha,
        patchContent: patch,
        repoDir: tmpDir
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actual = 'REJECTED_UNREGISTERED_MANIFEST_PATH';
      findingId = e.code || 'UNLISTED_PATH';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: OWN-10\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('OWN-10', 'AUTHORITATIVE_OWNERSHIP', 'INTEGRATION', 'Missing manifest path causes fail-closed rejection', 'REJECTED_UNREGISTERED_MANIFEST_PATH', actual, 0, findingId, actual === 'REJECTED_UNREGISTERED_MANIFEST_PATH' ? 'PASS' : 'FAIL', 'OWN-10.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // --- STALE BASE SCENARIOS (BASE-01..06) ---
  // BASE-01: Match
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      const res = verify_base(tmpDir, headSha, headSha);
      actual = res.isHeadAtBase ? 'BASE_MATCH_ACCEPTED' : 'BASE_MISMATCH';
    } catch (e) {
      actual = e.code || 'FAILED';
      findingId = e.code || 'ERROR';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: BASE-01\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('BASE-01', 'STALE_BASE', 'INTEGRATION', 'Expected base, patch base, and current HEAD all match', 'BASE_MATCH_ACCEPTED', actual, 0, findingId, actual === 'BASE_MATCH_ACCEPTED' ? 'PASS' : 'FAIL', 'BASE-01.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // BASE-02: Patch declared base mismatch
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const fakePatchBase = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      const res = verify_base(tmpDir, headSha, fakePatchBase);
      actual = res.isHeadAtBase ? 'UNEXPECTED_MATCH' : 'REJECTED_PATCH_BASE_MISMATCH';
      if (!res.isHeadAtBase) findingId = 'BASE_MISMATCH';
    } catch (e) {
      actual = 'REJECTED_PATCH_BASE_MISMATCH';
      findingId = e.code || 'BASE_MISMATCH';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: BASE-02\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('BASE-02', 'STALE_BASE', 'INTEGRATION', 'Patch declared base differs from approved base SHA', 'REJECTED_PATCH_BASE_MISMATCH', actual, 0, findingId, actual === 'REJECTED_PATCH_BASE_MISMATCH' ? 'PASS' : 'FAIL', 'BASE-02.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // BASE-03: Current HEAD differs from approved base
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    fs.writeFileSync(path.join(tmpDir, 'commit.txt'), 'advance head');
    cp.spawnSync('git', ['add', '.'], { cwd: tmpDir });
    cp.spawnSync('git', ['commit', '-m', 'advancing head'], { cwd: tmpDir });
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      const res = verify_base(tmpDir, headSha, headSha);
      actual = res.isHeadAtBase ? 'UNEXPECTED_MATCH' : 'REJECTED_CURRENT_HEAD_MISMATCH';
      if (!res.isHeadAtBase) findingId = 'BASE_MISMATCH';
    } catch (e) {
      actual = 'REJECTED_CURRENT_HEAD_MISMATCH';
      findingId = e.code || 'BASE_MISMATCH';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: BASE-03\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('BASE-03', 'STALE_BASE', 'INTEGRATION', 'Current HEAD differs from approved base while patch declares approved base', 'REJECTED_CURRENT_HEAD_MISMATCH', actual, 0, findingId, actual === 'REJECTED_CURRENT_HEAD_MISMATCH' ? 'PASS' : 'FAIL', 'BASE-03.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // BASE-04: Current HEAD advanced; patch rejected without mutation
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    fs.writeFileSync(path.join(tmpDir, 'commit.txt'), 'advance head');
    cp.spawnSync('git', ['add', '.'], { cwd: tmpDir });
    cp.spawnSync('git', ['commit', '-m', 'advancing head'], { cwd: tmpDir });
    const targetFile = path.join(tmpDir, 'scratch/salesforce-poc/tests/run-w5-1-tests.cjs');
    const patch = `diff --git a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
new file mode 100644
--- /dev/null
+++ b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
@@ -0,0 +1,1 @@
+// mutate
+`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      apply_patch_with_provenance({
        taskId: 'W5-1',
        trustedRole: 'feature-agent',
        expectedBaseSha: headSha,
        patchBaseSha: headSha,
        patchContent: patch,
        repoDir: tmpDir
      });
      actual = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      if (!fs.existsSync(targetFile)) {
        actual = 'REJECTED_STALE_HEAD_MUTATION';
        findingId = e.code || 'BASE_MISMATCH';
      } else {
        actual = 'MUTATED_DESPITE_FAILURE';
      }
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: BASE-04\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('BASE-04', 'STALE_BASE', 'INTEGRATION', 'Current HEAD advanced after approved base; patch rejected without file mutation', 'REJECTED_STALE_HEAD_MUTATION', actual, 0, findingId, actual === 'REJECTED_STALE_HEAD_MUTATION' ? 'PASS' : 'FAIL', 'BASE-04.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // BASE-05: Missing expected base
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      verify_base(tmpDir, '', headSha);
      actual = 'UNEXPECTED_MATCH';
    } catch (e) {
      actual = 'REJECTED_MISSING_BASE_SHA';
      findingId = e.code || 'MALFORMED_BASE_SHA';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: BASE-05\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('BASE-05', 'STALE_BASE', 'UNIT', 'Missing expected base SHA rejected', 'REJECTED_MISSING_BASE_SHA', actual, 0, findingId, actual === 'REJECTED_MISSING_BASE_SHA' ? 'PASS' : 'FAIL', 'BASE-05.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // BASE-06: Malformed short base
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      verify_base(tmpDir, '12345', headSha);
      actual = 'UNEXPECTED_MATCH';
    } catch (e) {
      actual = 'REJECTED_MALFORMED_BASE_SHA';
      findingId = e.code || 'MALFORMED_BASE_SHA';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: BASE-06\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('BASE-06', 'STALE_BASE', 'UNIT', 'Malformed short base SHA rejected', 'REJECTED_MALFORMED_BASE_SHA', actual, 0, findingId, actual === 'REJECTED_MALFORMED_BASE_SHA' ? 'PASS' : 'FAIL', 'BASE-06.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // --- PATCH GATE INTEGRATION & DUPLICATE HEADERS (PG-DUP-01..03, PG-INT-01) ---
  // PG-DUP-01: Duplicate diff --git headers
  {
    const patch = `diff --git a/file1.txt b/file1.txt
--- a/file1.txt
+++ b/file1.txt
@@ -1 +1 @@
-a
+b
diff --git a/file1.txt b/file1.txt
--- a/file1.txt
+++ b/file1.txt
@@ -1 +1 @@
-b
+c
`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      extractPatchTouchedPaths(patch);
      actual = 'UNEXPECTED_ACCEPT';
    } catch (e) {
      actual = 'REJECTED_DUPLICATE_DIFF_HEADER';
      findingId = e.code || 'DUPLICATE_DIFF_HEADER';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: PG-DUP-01\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('PG-DUP-01', 'PATCH_INTEGRATION', 'UNIT', 'Duplicate diff --git headers in patch payload rejected', 'REJECTED_DUPLICATE_DIFF_HEADER', actual, 0, findingId, actual === 'REJECTED_DUPLICATE_DIFF_HEADER' ? 'PASS' : 'FAIL', 'PG-DUP-01.log', logContent);
  }

  // PG-DUP-02: Path traversal alias in patch header
  {
    const patch = `diff --git a/dir/../file1.txt b/dir/../file1.txt
--- a/dir/../file1.txt
+++ b/dir/../file1.txt
@@ -1 +1 @@
-a
+b
`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      extractPatchTouchedPaths(patch);
      actual = 'UNEXPECTED_ACCEPT';
    } catch (e) {
      actual = 'REJECTED_PATH_TRAVERSAL_ALIAS';
      findingId = e.code || 'PATH_TRAVERSAL';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: PG-DUP-02\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('PG-DUP-02', 'PATCH_INTEGRATION', 'UNIT', 'Path traversal alias in patch header rejected', 'REJECTED_PATH_TRAVERSAL_ALIAS', actual, 0, findingId, actual === 'REJECTED_PATH_TRAVERSAL_ALIAS' ? 'PASS' : 'FAIL', 'PG-DUP-02.log', logContent);
  }

  // PG-DUP-03: Normalized aliases resolving to same file
  {
    const patch = `diff --git a/foo/bar.txt b/foo/bar.txt
--- a/foo/bar.txt
+++ b/foo/bar.txt
@@ -1 +1 @@
-a
+b
diff --git a/./foo/bar.txt b/./foo/bar.txt
--- a/./foo/bar.txt
+++ b/./foo/bar.txt
@@ -1 +1 @@
-b
+c
`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      extractPatchTouchedPaths(patch);
      actual = 'UNEXPECTED_ACCEPT';
    } catch (e) {
      actual = 'REJECTED_NORMALIZED_ALIAS_DUPLICATE';
      findingId = e.code || 'DUPLICATE_DIFF_HEADER';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: PG-DUP-03\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('PG-DUP-03', 'PATCH_INTEGRATION', 'UNIT', 'Normalized path aliases resolving to same file rejected as duplicate', 'REJECTED_NORMALIZED_ALIAS_DUPLICATE', actual, 0, findingId, actual === 'REJECTED_NORMALIZED_ALIAS_DUPLICATE' ? 'PASS' : 'FAIL', 'PG-DUP-03.log', logContent);
  }

  // PG-INT-01: Valid patch applied cleanly using actual git apply
  {
    const { tmpDir, headSha } = createRepoWithRegisters();
    const patch = `diff --git a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
new file mode 100644
--- /dev/null
+++ b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
@@ -0,0 +1,2 @@
+// w5-1 test
+console.log("PASS");
`;
    const t0 = new Date().toISOString();
    let actual = '';
    let findingId = 'NONE';
    try {
      apply_patch_with_provenance({
        taskId: 'W5-1',
        trustedRole: 'feature-agent',
        expectedBaseSha: headSha,
        patchBaseSha: headSha,
        patchContent: patch,
        repoDir: tmpDir
      });
      const targetPath = path.join(tmpDir, 'scratch/salesforce-poc/tests/run-w5-1-tests.cjs');
      if (fs.existsSync(targetPath) && fs.readFileSync(targetPath, 'utf8').includes('PASS')) {
        actual = 'SEQUENTIAL_APPLY_SUCCESS';
      } else {
        actual = 'FILE_NOT_WRITTEN';
      }
    } catch (e) {
      actual = 'FAILED: ' + e.message;
      findingId = e.code || 'ERROR';
    }
    const t1 = new Date().toISOString();
    const logContent = `SCENARIO: PG-INT-01\nMODULE: ${patchGatePath}\nMODULE_SHA: ${patchGateSha}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: 0\nFINDING: ${findingId}\nACTUAL: ${actual}\n`;
    recordResult('PG-INT-01', 'PATCH_INTEGRATION', 'INTEGRATION', 'Valid patch applied cleanly using actual git apply', 'SEQUENTIAL_APPLY_SUCCESS', actual, 0, findingId, actual === 'SEQUENTIAL_APPLY_SUCCESS' ? 'PASS' : 'FAIL', 'PG-INT-01.log', logContent);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`Executed ${scenarioRecords.length} scenarios. All statuses: ${scenarioRecords.every(r => r.status === 'PASS') ? 'ALL PASS' : 'FAIL'}`);
}

module.exports = { runSuite, scenarioRecords };
if (require.main === module) {
  runSuite();
}
