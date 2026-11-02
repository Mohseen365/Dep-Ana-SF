/**
 * test-authorization-patch.cjs
 * Wave 0.4.8 Verification Harness for Authorization & Patch Application
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const os = require('os');

const {
  apply_patch_with_provenance,
  apply_coordinator_patch_with_provenance,
  PatchGateError
} = require('./patch-gate.cjs');

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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w048-auth-test-'));
  cp.spawnSync('git', ['init', '-b', 'main'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.name', 'Wave 0.4.8 Auth Test'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.email', 'wave048auth@test.local'], { cwd: tmpDir });

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

const authResults = [];

function recordResult(id, desc, expectedCode, actualCode, status, logFileName, logContent) {
  const logPath = path.join(logDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  authResults.push({
    id,
    desc,
    expectedCode,
    actualCode,
    status,
    logFile: logFileName,
    logSha
  });
}

function runAuthSuite() {
  console.log('=== WAVE 0.4.8 AUTHORIZATION & PATCH PATH SUITE ===');

  // AUTH-01: Feature task cannot claim coordinator role
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js b/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
@@ -1 +1,2 @@
 // Original content
+// Tamper
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha,
        trustedRole: 'coordinator'
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'COORDINATOR_EXCLUSIVE_PATH') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-01\nEXPECTED: COORDINATOR_EXCLUSIVE_PATH\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-01', 'Feature task cannot modify coordinator path even if passing coordinator role', 'COORDINATOR_EXCLUSIVE_PATH', actualCode, status, 'AUTH-01.log', log);
    cleanupRepo(repo);
  }

  // AUTH-02: Feature task cannot use INT-1
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js b/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
@@ -1 +1,2 @@
 // Original content
+// Tamper
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'INT-1',
        expectedBaseSha: baseSha
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'COORDINATOR_TASK_ON_FEATURE_ROUTE') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-02\nEXPECTED: COORDINATOR_TASK_ON_FEATURE_ROUTE\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-02', 'Coordinator task INT-1 cannot be dispatched on feature agent route', 'COORDINATOR_TASK_ON_FEATURE_ROUTE', actualCode, status, 'AUTH-02.log', log);
    cleanupRepo(repo);
  }

  // AUTH-03: Caller cannot disable Batch 1 enforcement
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
@@ -1 +1,2 @@
 // Original content
+// Tamper
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-2',
        expectedBaseSha: baseSha,
        batch1Enforce: false
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'TASK_OUTSIDE_BATCH1') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-03\nEXPECTED: TASK_OUTSIDE_BATCH1\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-03', 'Non-Batch 1 task W5-2 rejected even if caller passes batch1Enforce: false', 'TASK_OUTSIDE_BATCH1', actualCode, status, 'AUTH-03.log', log);
    cleanupRepo(repo);
  }

  // AUTH-04: Caller-supplied owner metadata is ignored/rejected
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
@@ -1 +1,2 @@
 // Original content
+// Tamper
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W6-1',
        expectedBaseSha: baseSha,
        claimedOwner: 'Workstream A Lead'
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'UNLISTED_PATH' || actualCode === 'WRONG_TASK_OWNERSHIP') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-04\nEXPECTED: UNLISTED_PATH or WRONG_TASK_OWNERSHIP\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-04', 'Caller supplied owner metadata ignored, register ownership enforced', 'UNLISTED_PATH', actualCode, status, 'AUTH-04.log', log);
    cleanupRepo(repo);
  }

  // AUTH-05: Caller-supplied allowlist/register is ignored/rejected
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/sfdx-project.json b/scratch/salesforce-poc/sfdx-project.json
--- a/scratch/salesforce-poc/sfdx-project.json
+++ b/scratch/salesforce-poc/sfdx-project.json
@@ -1 +1,2 @@
 // Original content
+// Tamper
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha,
        customAllowlist: ['scratch/salesforce-poc/sfdx-project.json']
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'FROZEN_PATH_MODIFICATION' || actualCode === 'UNLISTED_PATH') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-05\nEXPECTED: FROZEN_PATH_MODIFICATION or UNLISTED_PATH\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-05', 'Custom allowlist ignored; frozen file sfdx-project.json rejected', 'FROZEN_PATH_MODIFICATION', actualCode, status, 'AUTH-05.log', log);
    cleanupRepo(repo);
  }

  // AUTH-06: Non-Batch-1 task rejected even when caller passes legacy bypass-shaped options
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
@@ -1 +1,2 @@
 // Original content
+// Tamper
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-3',
        expectedBaseSha: baseSha,
        bypass: true,
        force: true
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'TASK_OUTSIDE_BATCH1') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-06\nEXPECTED: TASK_OUTSIDE_BATCH1\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-06', 'Task W5-3 rejected with TASK_OUTSIDE_BATCH1 regardless of bypass flags', 'TASK_OUTSIDE_BATCH1', actualCode, status, 'AUTH-06.log', log);
    cleanupRepo(repo);
  }

  // AUTH-07: Task with unmet dependency/status rejected
  {
    const repo = createRepoWithRegisters();
    const tCsv = path.join(repo, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
    let tContent = fs.readFileSync(tCsv, 'utf8');
    tContent = tContent.replace('READY_TO_LAUNCH', 'BLOCKED');
    fs.writeFileSync(tCsv, tContent);
    cp.execSync('git add . && git commit -m "block w5-1"', { cwd: repo });
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();

    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
@@ -1 +1,2 @@
 // Original content
+// Tamper
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'INELIGIBLE_TASK_STATUS') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-07\nEXPECTED: INELIGIBLE_TASK_STATUS\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-07', 'Task with status BLOCKED rejected fail-closed', 'INELIGIBLE_TASK_STATUS', actualCode, status, 'AUTH-07.log', log);
    cleanupRepo(repo);
  }

  // AUTH-08: Wrong task/path ownership rejected
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js b/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
@@ -1 +1,2 @@
 // Original content
+// Tamper
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'COORDINATOR_EXCLUSIVE_PATH' || actualCode === 'UNLISTED_PATH') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-08\nEXPECTED: COORDINATOR_EXCLUSIVE_PATH or UNLISTED_PATH\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-08', 'Task W5-1 rejected when attempting to touch coordinator file daAppShell.js', 'COORDINATOR_EXCLUSIVE_PATH', actualCode, status, 'AUTH-08.log', log);
    cleanupRepo(repo);
  }

  // AUTH-09: Malformed or duplicate authoritative register entries fail closed
  {
    const repo = createRepoWithRegisters();
    const tCsv = path.join(repo, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
    const origContent = fs.readFileSync(tCsv, 'utf8').trim();
    const lines = origContent.split('\n');
    const w51 = lines.find(l => l.startsWith('W5-1,'));
    fs.writeFileSync(tCsv, origContent + '\n' + w51 + '\n');
    cp.execSync('git add . && git commit -m "dup task"', { cwd: repo });
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();

    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
@@ -1 +1,2 @@
 // Original content
+// Tamper
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'DUPLICATE_TASK_ID') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-09\nEXPECTED: DUPLICATE_TASK_ID\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-09', 'Duplicate Task ID in register fails closed', 'DUPLICATE_TASK_ID', actualCode, status, 'AUTH-09.log', log);
    cleanupRepo(repo);
  }

  // AUTH-10: Legitimate Batch 1 task with exact authorized path passes authorization layer
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1 +1,2 @@
 // Original content of ${filePath}
+// Authorized patch addition
`;
    let actualCode = 'NONE';
    let res = null;
    try {
      res = apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      actualCode = 'SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'SUCCESS' && res && res.success) ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-10\nEXPECTED: SUCCESS\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-10', 'Legitimate Batch 1 task with authorized path applies successfully', 'SUCCESS', actualCode, status, 'AUTH-10.log', log);
    cleanupRepo(repo);
  }

  // AUTH-11: Coordinator-only path accepted only through explicitly designed coordinator route
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const coordPath = 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js';
    const patch = `diff --git a/${coordPath} b/${coordPath}
--- a/${coordPath}
+++ b/${coordPath}
@@ -1 +1,2 @@
 // Original content of ${coordPath}
+// Coordinator patch addition
`;
    let featureRouteCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'INT-1',
        expectedBaseSha: baseSha
      });
      featureRouteCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      featureRouteCode = e.code;
    }

    let coordRouteCode = 'NONE';
    let res = null;
    try {
      res = apply_coordinator_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'INT-1',
        expectedBaseSha: baseSha
      });
      coordRouteCode = 'SUCCESS';
    } catch (e) {
      coordRouteCode = e.code;
    }

    const status = (featureRouteCode === 'COORDINATOR_TASK_ON_FEATURE_ROUTE' && coordRouteCode === 'SUCCESS') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-11\nFEATURE_ROUTE_EXPECTED: COORDINATOR_TASK_ON_FEATURE_ROUTE\nFEATURE_ROUTE_ACTUAL: ${featureRouteCode}\nCOORD_ROUTE_EXPECTED: SUCCESS\nCOORD_ROUTE_ACTUAL: ${coordRouteCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-11', 'Coordinator-only task INT-1 accepted only via coordinator route', 'SUCCESS', coordRouteCode, status, 'AUTH-11.log', log);
    cleanupRepo(repo);
  }

  // AUTH-12: Stale base SHA rejected by public entry point
  {
    const repo = createRepoWithRegisters();
    const staleSha = '0000000000000000000000000000000000000000';
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
@@ -1 +1,2 @@
 // Original content
+// Tamper
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: staleSha
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'STALE_BASE') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: AUTH-12\nEXPECTED: STALE_BASE\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('AUTH-12', 'Stale expectedBaseSha rejected fail-closed with STALE_BASE', 'STALE_BASE', actualCode, status, 'AUTH-12.log', log);
    cleanupRepo(repo);
  }

  // --- RENAME & COPY PATCH PATH TESTS (REN-01..09) ---

  // REN-01: Authorized rename source + destination
  {
    const repo = createRepoWithRegisters();
    const tCsv = path.join(repo, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
    let t = fs.readFileSync(tCsv, 'utf8');
    t = t.replace('daGraphViewer.js; scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html', 'daGraphViewer.js; scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html; scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer2.js');
    fs.writeFileSync(tCsv, t);

    const mCsv = path.join(repo, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
    fs.appendFileSync(mCsv, 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer2.js,LWC,PLANNED_NEW,Workstream A Lead,Workstream A Lead,Wave 5 (W5-1 through W5-6),FEATURE_DEVELOPMENT,NONE,NO,NO\n');
    cp.execSync('git add . && git commit -m "add secondary w5-1 file"', { cwd: repo });
    const newBaseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();

    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer2.js
similarity index 100%
rename from scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
rename to scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer2.js
`;
    let actualCode = 'NONE';
    try {
      const res = apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: newBaseSha
      });
      actualCode = res.success ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'SUCCESS') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: REN-01\nEXPECTED: SUCCESS\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('REN-01', 'Authorized rename source and destination accepted', 'SUCCESS', actualCode, status, 'REN-01.log', log);
    cleanupRepo(repo);
  }

  // REN-02: Unauthorized rename source rejected
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/sfdx-project.json b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
similarity index 100%
rename from scratch/salesforce-poc/sfdx-project.json
rename to scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'FROZEN_PATH_MODIFICATION' || actualCode === 'UNLISTED_PATH') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: REN-02\nEXPECTED: FROZEN_PATH_MODIFICATION or UNLISTED_PATH\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('REN-02', 'Unauthorized rename source rejected', 'FROZEN_PATH_MODIFICATION', actualCode, status, 'REN-02.log', log);
    cleanupRepo(repo);
  }

  // REN-03: Unauthorized rename destination rejected
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/sfdx-project.json
similarity index 100%
rename from scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
rename to scratch/salesforce-poc/sfdx-project.json
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'FROZEN_PATH_MODIFICATION' || actualCode === 'UNLISTED_PATH') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: REN-03\nEXPECTED: FROZEN_PATH_MODIFICATION or UNLISTED_PATH\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('REN-03', 'Unauthorized rename destination rejected', 'FROZEN_PATH_MODIFICATION', actualCode, status, 'REN-03.log', log);
    cleanupRepo(repo);
  }

  // REN-04: Authorized copy source and destination
  {
    const repo = createRepoWithRegisters();
    const tCsv = path.join(repo, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
    let t = fs.readFileSync(tCsv, 'utf8');
    t = t.replace('daGraphViewer.js; scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html', 'daGraphViewer.js; scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html; scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewerCopy.js');
    fs.writeFileSync(tCsv, t);

    const mCsv = path.join(repo, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
    fs.appendFileSync(mCsv, 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewerCopy.js,LWC,PLANNED_NEW,Workstream A Lead,Workstream A Lead,Wave 5 (W5-1 through W5-6),FEATURE_DEVELOPMENT,NONE,NO,NO\n');
    cp.execSync('git add . && git commit -m "add copy destination"', { cwd: repo });
    const newBaseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();

    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewerCopy.js
similarity index 100%
copy from scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
copy to scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewerCopy.js
`;
    let actualCode = 'NONE';
    try {
      const res = apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: newBaseSha
      });
      actualCode = res.success ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'SUCCESS') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: REN-04\nEXPECTED: SUCCESS\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('REN-04', 'Authorized copy source and destination accepted', 'SUCCESS', actualCode, status, 'REN-04.log', log);
    cleanupRepo(repo);
  }

  // REN-05: Unauthorized copy source rejected
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/sfdx-project.json b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
similarity index 100%
copy from scratch/salesforce-poc/sfdx-project.json
copy to scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'FROZEN_PATH_MODIFICATION' || actualCode === 'UNLISTED_PATH') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: REN-05\nEXPECTED: FROZEN_PATH_MODIFICATION or UNLISTED_PATH\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('REN-05', 'Unauthorized copy source rejected', 'FROZEN_PATH_MODIFICATION', actualCode, status, 'REN-05.log', log);
    cleanupRepo(repo);
  }

  // REN-06: Unauthorized copy destination rejected
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
similarity index 100%
copy from scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
copy to scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'COORDINATOR_EXCLUSIVE_PATH' || actualCode === 'UNLISTED_PATH') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: REN-06\nEXPECTED: COORDINATOR_EXCLUSIVE_PATH or UNLISTED_PATH\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('REN-06', 'Unauthorized copy destination rejected', 'COORDINATOR_EXCLUSIVE_PATH', actualCode, status, 'REN-06.log', log);
    cleanupRepo(repo);
  }

  // REN-07: Delete authorized source path accepted
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const p = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';
    const patch = `diff --git a/${p} b/${p}
deleted file mode 100644
--- a/${p}
+++ /dev/null
@@ -1 +0,0 @@
-// Original content of ${p}
`;
    let actualCode = 'NONE';
    try {
      const res = apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      actualCode = res.success ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'SUCCESS') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: REN-07\nEXPECTED: SUCCESS\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('REN-07', 'Delete authorized file path accepted', 'SUCCESS', actualCode, status, 'REN-07.log', log);
    cleanupRepo(repo);
  }

  // REN-08: Quoted patch path handled
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const p = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
    const patch = `diff --git "a/${p}" "b/${p}"
--- "a/${p}"
+++ "b/${p}"
@@ -1 +1,2 @@
 // Original content of ${p}
+// Quoted header patch
`;
    let actualCode = 'NONE';
    try {
      const res = apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      actualCode = res.success ? 'SUCCESS' : 'FAILED';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'SUCCESS') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: REN-08\nEXPECTED: SUCCESS\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('REN-08', 'Quoted patch diff header parsed and applied', 'SUCCESS', actualCode, status, 'REN-08.log', log);
    cleanupRepo(repo);
  }

  // REN-09: Malformed diff header rejected
  {
    const repo = createRepoWithRegisters();
    const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    const patch = `diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
--- a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js
@@ -1 +1,2 @@
 // Original content
`;
    let actualCode = 'NONE';
    try {
      apply_patch_with_provenance({
        repoDir: repo,
        patchContent: patch,
        taskId: 'W5-1',
        expectedBaseSha: baseSha
      });
      actualCode = 'UNEXPECTED_SUCCESS';
    } catch (e) {
      actualCode = e.code;
    }
    const status = (actualCode === 'MALFORMED_DIFF_HEADER') ? 'PASS' : 'FAIL';
    const log = `SCENARIO: REN-09\nEXPECTED: MALFORMED_DIFF_HEADER\nACTUAL: ${actualCode}\nSTATUS: ${status}\n`;
    recordResult('REN-09', 'Malformed diff header rejected fail-closed', 'MALFORMED_DIFF_HEADER', actualCode, status, 'REN-09.log', log);
    cleanupRepo(repo);
  }

  console.log(`Authorization & Patch suite finished: ${authResults.length} scenarios. All pass: ${authResults.every(r => r.status === 'PASS')}`);
  return authResults;
}

module.exports = { runAuthSuite, authResults };
if (require.main === module) {
  runAuthSuite();
}
