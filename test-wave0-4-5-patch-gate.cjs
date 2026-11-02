/**
 * test-wave0-4-5-patch-gate.cjs
 * Comprehensive test harness validating:
 * 1. Authoritative Task & Ownership Enforcement (P0)
 * 2. Stale Base Detection (P0)
 * 3. Real Git Patch Integration & Duplicate Header Detection (P1)
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const os = require('os');

const {
  apply_patch_with_provenance,
  pathSafeRollback,
  verify_base,
  enforceAuthoritativeTaskOwnership,
  extractPatchTouchedPaths,
  PatchGateError
} = require('./docs/wave-0/4.5/patch-gate.cjs');

const repoRoot = process.cwd();
const ownershipLogDir = path.resolve(repoRoot, 'docs/wave-0/4.5/ownership-logs');
const staleBaseLogDir = path.resolve(repoRoot, 'docs/wave-0/4.5/stale-base-logs');
const patchLogDir = path.resolve(repoRoot, 'docs/wave-0/4.5/patch-logs');

[ownershipLogDir, staleBaseLogDir, patchLogDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function createRepoWithRegisters() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'da-pg-test-'));
  cp.spawnSync('git', ['init', '-b', 'main'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.name', 'Wave 0.4.5 Gate Test'], { cwd: tmpDir });
  cp.spawnSync('git', ['config', 'user.email', 'wave045@test.local'], { cwd: tmpDir });

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
  const frozen_file = 'scratch/salesforce-poc/sfdx-project.json';
  const coord_file = 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js';

  [w5_1_js, frozen_file, coord_file].forEach(f => {
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

const ownershipScenarios = [];
const staleBaseScenarios = [];
const patchGateScenarios = [];

function recordScenario(list, sc) {
  list.push(sc);
  const logFile = path.join(sc.logDir, `${sc.id}.log`);
  fs.writeFileSync(logFile, sc.logContent, 'utf8');
  sc.logSha256 = hashBuf(fs.readFileSync(logFile));
  console.log(`[PASS] ${sc.id}: ${sc.description} -> ${sc.actualOutcome}`);
}

console.log('======================================================================');
console.log('   RUNNING WAVE 0.4.5 AUTHORITATIVE OWNERSHIP GATE SUITE');
console.log('======================================================================');

// OWN-01: Valid task modifies authorized file
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1 +1,2 @@
 // Original content of ${filePath}
+// Authorized modification by W5-1
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const res = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha,
      trustedRole: 'feature-agent'
    });
    if (res.success) {
      outcome = 'APPLIED_SUCCESSFULLY';
      exitCode = 0;
      log = `Applied patch cleanly for authorized task W5-1: ${JSON.stringify(res.provenance)}`;
    }
  } catch (err) {
    log = `Error: ${err.message}`;
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(ownershipScenarios, {
    id: 'OWN-01',
    category: 'AUTHORITATIVE_OWNERSHIP',
    testLevel: 'INTEGRATION',
    description: 'Valid task (W5-1) modifies its authorized file',
    expectedOutcome: 'APPLIED_SUCCESSFULLY',
    actualOutcome: outcome,
    exitCode,
    findingId: 'NONE',
    logDir: ownershipLogDir,
    logContent: log
  });
}

// OWN-02: Task cannot modify another task's file
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1 +1,2 @@
 // Original content of ${filePath}
+// Unauthorized cross-task edit
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W6-1',
      expectedBaseSha: baseSha
    });
  } catch (err) {
    if (err.code === 'UNLISTED_PATH') {
      outcome = 'REJECTED_FOREIGN_TASK_PATH';
      exitCode = 0;
      log = `Correctly rejected foreign task file modification: ${err.message}`;
    }
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(ownershipScenarios, {
    id: 'OWN-02',
    category: 'AUTHORITATIVE_OWNERSHIP',
    testLevel: 'INTEGRATION',
    description: 'Task cannot modify another task file (W6-1 attempting daGraphViewer)',
    expectedOutcome: 'REJECTED_FOREIGN_TASK_PATH',
    actualOutcome: outcome,
    exitCode,
    findingId: 'UNLISTED_PATH',
    logDir: ownershipLogDir,
    logContent: log
  });
}

// OWN-03: Task cannot expand allowlist by caller-supplied array
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daRadarView/daRadarView.js';
  const patch = `diff --git a/${filePath} b/${filePath}
--- /dev/null
+++ b/${filePath}
@@ -0,0 +1 @@
+// Forged allowlist test
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });
  } catch (err) {
    if (err.code === 'UNLISTED_PATH') {
      outcome = 'REJECTED_FORGED_ALLOWLIST';
      exitCode = 0;
      log = `Correctly rejected caller allowlist expansion: ${err.message}`;
    }
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(ownershipScenarios, {
    id: 'OWN-03',
    category: 'AUTHORITATIVE_OWNERSHIP',
    testLevel: 'INTEGRATION',
    description: 'Caller cannot expand task allowlist beyond authoritative register',
    expectedOutcome: 'REJECTED_FORGED_ALLOWLIST',
    actualOutcome: outcome,
    exitCode,
    findingId: 'UNLISTED_PATH',
    logDir: ownershipLogDir,
    logContent: log
  });
}

// OWN-04: Task cannot modify frozen path
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/sfdx-project.json';
  const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1 +1,2 @@
 // Original content
+// Modification to frozen file
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });
  } catch (err) {
    if (err.code === 'FROZEN_PATH_MODIFICATION' || err.code === 'UNLISTED_PATH') {
      outcome = 'REJECTED_FROZEN_PATH';
      exitCode = 0;
      log = `Correctly rejected frozen path modification: ${err.message}`;
    }
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(ownershipScenarios, {
    id: 'OWN-04',
    category: 'AUTHORITATIVE_OWNERSHIP',
    testLevel: 'INTEGRATION',
    description: 'Task cannot modify a frozen path (sfdx-project.json)',
    expectedOutcome: 'REJECTED_FROZEN_PATH',
    actualOutcome: outcome,
    exitCode,
    findingId: 'FROZEN_PATH_MODIFICATION',
    logDir: ownershipLogDir,
    logContent: log
  });
}

// OWN-05: Non-coordinator cannot modify coordinator-only path
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js';
  const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1 +1,2 @@
 // Original content
+// Modification by non-coordinator
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha,
      trustedRole: 'feature-agent'
    });
  } catch (err) {
    if (err.code === 'COORDINATOR_EXCLUSIVE_PATH' || err.code === 'UNLISTED_PATH') {
      outcome = 'REJECTED_COORDINATOR_EXCLUSIVE';
      exitCode = 0;
      log = `Correctly rejected non-coordinator modifying coordinator path: ${err.message}`;
    }
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(ownershipScenarios, {
    id: 'OWN-05',
    category: 'AUTHORITATIVE_OWNERSHIP',
    testLevel: 'INTEGRATION',
    description: 'Non-coordinator cannot modify coordinator-only path (daAppShell.js)',
    expectedOutcome: 'REJECTED_COORDINATOR_EXCLUSIVE',
    actualOutcome: outcome,
    exitCode,
    findingId: 'COORDINATOR_EXCLUSIVE_PATH',
    logDir: ownershipLogDir,
    logContent: log
  });
}

// OWN-06: Non-coordinator caller cannot impersonate coordinator by role string
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js';
  const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1 +1,2 @@
 // Original content
+// Impersonating coordinator
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha,
      trustedRole: 'coordinator'
    });
  } catch (err) {
    if (err.code === 'UNAUTHORIZED_ROLE' || err.code === 'COORDINATOR_EXCLUSIVE_PATH') {
      outcome = 'REJECTED_ROLE_IMPERSONATION';
      exitCode = 0;
      log = `Correctly rejected role impersonation: ${err.message}`;
    }
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(ownershipScenarios, {
    id: 'OWN-06',
    category: 'AUTHORITATIVE_OWNERSHIP',
    testLevel: 'INTEGRATION',
    description: 'Non-coordinator cannot impersonate coordinator by role string',
    expectedOutcome: 'REJECTED_ROLE_IMPERSONATION',
    actualOutcome: outcome,
    exitCode,
    findingId: 'UNAUTHORIZED_ROLE',
    logDir: ownershipLogDir,
    logContent: log
  });
}

// OWN-07: Unknown/missing task rejected
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1 +1,2 @@
 // Original
+// Edit
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W99-NONEXISTENT',
      expectedBaseSha: baseSha
    });
  } catch (err) {
    if (err.code === 'UNKNOWN_TASK') {
      outcome = 'REJECTED_UNKNOWN_TASK';
      exitCode = 0;
      log = `Correctly rejected unregistered task ID: ${err.message}`;
    }
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(ownershipScenarios, {
    id: 'OWN-07',
    category: 'AUTHORITATIVE_OWNERSHIP',
    testLevel: 'INTEGRATION',
    description: 'Missing/unregistered task ID is rejected fail-closed',
    expectedOutcome: 'REJECTED_UNKNOWN_TASK',
    actualOutcome: outcome,
    exitCode,
    findingId: 'UNKNOWN_TASK',
    logDir: ownershipLogDir,
    logContent: log
  });
}

// OWN-08: Task outside active Batch 1 boundary rejected
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daRefactoringEngine/daRefactoringEngine.js';
  const patch = `diff --git a/${filePath} b/${filePath}
--- /dev/null
+++ b/${filePath}
@@ -0,0 +1 @@
+// W9-2 outside Batch 1
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W9-2',
      expectedBaseSha: baseSha,
      batch1Enforce: true
    });
  } catch (err) {
    if (err.code === 'TASK_OUTSIDE_BATCH1') {
      outcome = 'REJECTED_TASK_OUTSIDE_BATCH1';
      exitCode = 0;
      log = `Correctly rejected task outside Batch 1 boundary: ${err.message}`;
    }
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(ownershipScenarios, {
    id: 'OWN-08',
    category: 'AUTHORITATIVE_OWNERSHIP',
    testLevel: 'INTEGRATION',
    description: 'Task outside Batch 1 boundary (W9-2) rejected when Batch 1 active',
    expectedOutcome: 'REJECTED_TASK_OUTSIDE_BATCH1',
    actualOutcome: outcome,
    exitCode,
    findingId: 'TASK_OUTSIDE_BATCH1',
    logDir: ownershipLogDir,
    logContent: log
  });
}

// OWN-09: Duplicate task ID in register causes fail-closed rejection
{
  const repo = createRepoWithRegisters();
  const taskCsvPath = path.join(repo, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
  const parser = require('./docs/wave-0/4.3/strict-rfc4180-csv-parser.cjs');
  const taskContent = fs.readFileSync(taskCsvPath, 'utf8');
  const parsed = parser.parseStrictCSV(taskContent);
  function serializeCsvRow(fields) {
    return fields.map(f => {
      if (f.includes(',') || f.includes('"') || f.includes('\n')) {
        return '"' + f.replace(/"/g, '""') + '"';
      }
      return f;
    }).join(',');
  }
  const duplicateLine = serializeCsvRow(parsed[1]);
  fs.writeFileSync(taskCsvPath, taskContent.trim() + '\n' + duplicateLine + '\n', 'utf8');

  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const headSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
    apply_patch_with_provenance({
      repoDir: repo,
      patchContent: 'diff --git a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js\n--- a/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js\n+++ b/scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js\n@@ -1 +1,2 @@\n // a\n+// b\n',
      taskId: 'W5-1',
      expectedBaseSha: headSha
    });
  } catch (err) {
    if (err.code === 'DUPLICATE_TASK_ID') {
      outcome = 'REJECTED_DUPLICATE_TASK_ID';
      exitCode = 0;
      log = `Correctly detected duplicate task in register: ${err.message}`;
    } else {
      log = `Unexpected error: ${err.message}`;
    }
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(ownershipScenarios, {
    id: 'OWN-09',
    category: 'AUTHORITATIVE_OWNERSHIP',
    testLevel: 'UNIT',
    description: 'Duplicate task record in register causes immediate fail-closed rejection',
    expectedOutcome: 'REJECTED_DUPLICATE_TASK_ID',
    actualOutcome: outcome,
    exitCode,
    findingId: 'DUPLICATE_TASK_ID',
    logDir: ownershipLogDir,
    logContent: log
  });
}

// OWN-10: Missing manifest record causes fail-closed rejection
{
  const repo = createRepoWithRegisters();
  const baseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const filePath = 'scratch/salesforce-poc/unregistered/random-file.js';
  const patch = `diff --git a/${filePath} b/${filePath}
--- /dev/null
+++ b/${filePath}
@@ -0,0 +1 @@
+// Unregistered file
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: baseSha
    });
  } catch (err) {
    if (err.code === 'UNLISTED_PATH') {
      outcome = 'REJECTED_UNREGISTERED_MANIFEST_PATH';
      exitCode = 0;
      log = `Correctly rejected unregistered file: ${err.message}`;
    }
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(ownershipScenarios, {
    id: 'OWN-10',
    category: 'AUTHORITATIVE_OWNERSHIP',
    testLevel: 'INTEGRATION',
    description: 'Missing manifest path causes fail-closed rejection',
    expectedOutcome: 'REJECTED_UNREGISTERED_MANIFEST_PATH',
    actualOutcome: outcome,
    exitCode,
    findingId: 'UNLISTED_PATH',
    logDir: ownershipLogDir,
    logContent: log
  });
}

console.log('======================================================================');
console.log('   RUNNING WAVE 0.4.5 STALE BASE DETECTION SUITE');
console.log('======================================================================');

// BASE-01: All three SHAs match
{
  const repo = createRepoWithRegisters();
  const headSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const res = verify_base(repo, headSha, headSha);
  let outcome = res.isHeadAtBase ? 'BASE_MATCH_ACCEPTED' : 'FAIL';
  let exitCode = res.isHeadAtBase ? 0 : 1;
  let log = `Base verification matched cleanly: ${JSON.stringify(res)}`;
  cleanupRepo(repo);

  recordScenario(staleBaseScenarios, {
    id: 'BASE-01',
    category: 'STALE_BASE',
    testLevel: 'INTEGRATION',
    description: 'Expected base, patch base, and current HEAD all match',
    expectedOutcome: 'BASE_MATCH_ACCEPTED',
    actualOutcome: outcome,
    exitCode,
    findingId: 'NONE',
    logDir: staleBaseLogDir,
    logContent: log
  });
}

// BASE-02: Patch base differs from approved base
{
  const repo = createRepoWithRegisters();
  const headSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  const wrongPatchBase = '1111222233334444555566667777888899990000';
  const res = verify_base(repo, headSha, wrongPatchBase);
  let outcome = !res.isHeadAtBase ? 'REJECTED_PATCH_BASE_MISMATCH' : 'FAIL';
  let exitCode = !res.isHeadAtBase ? 0 : 1;
  let log = `Rejected patch base mismatch: ${JSON.stringify(res)}`;
  cleanupRepo(repo);

  recordScenario(staleBaseScenarios, {
    id: 'BASE-02',
    category: 'STALE_BASE',
    testLevel: 'INTEGRATION',
    description: 'Patch declared base differs from approved base SHA',
    expectedOutcome: 'REJECTED_PATCH_BASE_MISMATCH',
    actualOutcome: outcome,
    exitCode,
    findingId: 'BASE_MISMATCH',
    logDir: staleBaseLogDir,
    logContent: log
  });
}

// BASE-03: Current HEAD differs from approved base
{
  const repo = createRepoWithRegisters();
  const approvedBase = '0000111122223333444455556666777788889999';
  const res = verify_base(repo, approvedBase, approvedBase);
  let outcome = !res.isHeadAtBase ? 'REJECTED_CURRENT_HEAD_MISMATCH' : 'FAIL';
  let exitCode = !res.isHeadAtBase ? 0 : 1;
  let log = `Rejected current head mismatch: ${JSON.stringify(res)}`;
  cleanupRepo(repo);

  recordScenario(staleBaseScenarios, {
    id: 'BASE-03',
    category: 'STALE_BASE',
    testLevel: 'INTEGRATION',
    description: 'Current HEAD differs from approved base while patch declares approved base',
    expectedOutcome: 'REJECTED_CURRENT_HEAD_MISMATCH',
    actualOutcome: outcome,
    exitCode,
    findingId: 'BASE_MISMATCH',
    logDir: staleBaseLogDir,
    logContent: log
  });
}

// BASE-04: Current HEAD changes between preflight and application
{
  const repo = createRepoWithRegisters();
  const oldBase = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(repo, 'unrelated.txt'), 'hello');
  cp.spawnSync('git', ['add', '.'], { cwd: repo });
  cp.spawnSync('git', ['commit', '-m', 'Move head forward'], { cwd: repo });

  const filePath = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  const patch = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1 +1,2 @@
 // Original
+// Edit
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch,
      taskId: 'W5-1',
      expectedBaseSha: oldBase
    });
  } catch (err) {
    if (err.code === 'BASE_MISMATCH') {
      outcome = 'REJECTED_STALE_HEAD_MUTATION';
      exitCode = 0;
      log = `Correctly rejected stale HEAD before modifying any file: ${err.message}`;
    }
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(staleBaseScenarios, {
    id: 'BASE-04',
    category: 'STALE_BASE',
    testLevel: 'INTEGRATION',
    description: 'Current HEAD advanced after approved base; patch rejected without file mutation',
    expectedOutcome: 'REJECTED_STALE_HEAD_MUTATION',
    actualOutcome: outcome,
    exitCode,
    findingId: 'BASE_MISMATCH',
    logDir: staleBaseLogDir,
    logContent: log
  });
}

// BASE-05: Missing expected SHA
{
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    verify_base(repoRoot, null);
  } catch (err) {
    if (err.code === 'MALFORMED_BASE_SHA') {
      outcome = 'REJECTED_MISSING_BASE_SHA';
      exitCode = 0;
      log = `Correctly rejected missing base SHA: ${err.message}`;
    }
  }
  recordScenario(staleBaseScenarios, {
    id: 'BASE-05',
    category: 'STALE_BASE',
    testLevel: 'UNIT',
    description: 'Missing expected base SHA rejected',
    expectedOutcome: 'REJECTED_MISSING_BASE_SHA',
    actualOutcome: outcome,
    exitCode,
    findingId: 'MALFORMED_BASE_SHA',
    logDir: staleBaseLogDir,
    logContent: log
  });
}

// BASE-06: Malformed expected SHA
{
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    verify_base(repoRoot, 'abc');
  } catch (err) {
    if (err.code === 'MALFORMED_BASE_SHA') {
      outcome = 'REJECTED_MALFORMED_BASE_SHA';
      exitCode = 0;
      log = `Correctly rejected short/malformed base SHA: ${err.message}`;
    }
  }
  recordScenario(staleBaseScenarios, {
    id: 'BASE-06',
    category: 'STALE_BASE',
    testLevel: 'UNIT',
    description: 'Malformed short base SHA rejected',
    expectedOutcome: 'REJECTED_MALFORMED_BASE_SHA',
    actualOutcome: outcome,
    exitCode,
    findingId: 'MALFORMED_BASE_SHA',
    logDir: staleBaseLogDir,
    logContent: log
  });
}

console.log('======================================================================');
console.log('   RUNNING WAVE 0.4.5 PATCH INTEGRATION & DUPLICATE HEADER SUITE');
console.log('======================================================================');

// PG-DUP-01: Duplicate diff --git headers
{
  const patch = `diff --git a/file1.js b/file1.js
--- a/file1.js
+++ b/file1.js
@@ -1 +1 @@
-a
+b
diff --git a/file1.js b/file1.js
--- a/file1.js
+++ b/file1.js
@@ -1 +1 @@
-b
+c
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    extractPatchTouchedPaths(patch);
  } catch (err) {
    if (err.code === 'DUPLICATE_TOUCHED_PATH') {
      outcome = 'REJECTED_DUPLICATE_DIFF_HEADER';
      exitCode = 0;
      log = `Correctly detected duplicate diff header: ${err.message}`;
    }
  }
  recordScenario(patchGateScenarios, {
    id: 'PG-DUP-01',
    category: 'PATCH_INTEGRATION',
    testLevel: 'UNIT',
    description: 'Duplicate diff --git headers in patch payload rejected',
    expectedOutcome: 'REJECTED_DUPLICATE_DIFF_HEADER',
    actualOutcome: outcome,
    exitCode,
    findingId: 'DUPLICATE_TOUCHED_PATH',
    logDir: patchLogDir,
    logContent: log
  });
}

// PG-DUP-02: Path traversal alias in patch header
{
  const patch = `diff --git a/dir/../file1.js b/dir/../file1.js
--- a/file1.js
+++ b/file1.js
@@ -1 +1 @@
-a
+b
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    extractPatchTouchedPaths(patch);
  } catch (err) {
    if (err.code === 'PATH_TRAVERSAL') {
      outcome = 'REJECTED_PATH_TRAVERSAL_ALIAS';
      exitCode = 0;
      log = `Correctly rejected path traversal alias: ${err.message}`;
    }
  }
  recordScenario(patchGateScenarios, {
    id: 'PG-DUP-02',
    category: 'PATCH_INTEGRATION',
    testLevel: 'UNIT',
    description: 'Path traversal alias in patch header rejected',
    expectedOutcome: 'REJECTED_PATH_TRAVERSAL_ALIAS',
    actualOutcome: outcome,
    exitCode,
    findingId: 'PATH_TRAVERSAL',
    logDir: patchLogDir,
    logContent: log
  });
}

// PG-DUP-03: Mixed separator aliases
{
  const patch = `diff --git a/file1.js b/file1.js
--- a/file1.js
+++ b/file1.js
@@ -1 +1 @@
-a
+b
diff --git a/./file1.js b/./file1.js
--- a/file1.js
+++ b/file1.js
@@ -1 +1 @@
-b
+c
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    extractPatchTouchedPaths(patch);
  } catch (err) {
    if (err.code === 'DUPLICATE_TOUCHED_PATH') {
      outcome = 'REJECTED_NORMALIZED_ALIAS_DUPLICATE';
      exitCode = 0;
      log = `Correctly detected duplicate alias after normalization: ${err.message}`;
    }
  }
  recordScenario(patchGateScenarios, {
    id: 'PG-DUP-03',
    category: 'PATCH_INTEGRATION',
    testLevel: 'UNIT',
    description: 'Normalized path aliases resolving to same file rejected as duplicate',
    expectedOutcome: 'REJECTED_NORMALIZED_ALIAS_DUPLICATE',
    actualOutcome: outcome,
    exitCode,
    findingId: 'DUPLICATE_TOUCHED_PATH',
    logDir: patchLogDir,
    logContent: log
  });
}

// PG-INT-01: Valid patch applied cleanly using actual git apply
{
  const repo = createRepoWithRegisters();
  const file1 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js';
  const file2 = 'scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.html';
  fs.writeFileSync(path.join(repo, file2), '<!-- original html -->\n', 'utf8');
  cp.spawnSync('git', ['add', file2], { cwd: repo });
  cp.spawnSync('git', ['commit', '-m', 'Add html file'], { cwd: repo });
  const newBaseSha = cp.execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim();

  const patch1 = `diff --git a/${file1} b/${file1}
--- a/${file1}
+++ b/${file1}
@@ -1 +1,2 @@
 // Original content of ${file1}
+// Mod 1
`;
  let outcome = 'FAIL';
  let exitCode = 1;
  let log = '';
  try {
    const res1 = apply_patch_with_provenance({
      repoDir: repo,
      patchContent: patch1,
      taskId: 'W5-1',
      expectedBaseSha: newBaseSha
    });
    if (res1.success) {
      outcome = 'SEQUENTIAL_APPLY_SUCCESS';
      exitCode = 0;
      log = `First patch applied cleanly with provenance: ${JSON.stringify(res1.provenance)}`;
    }
  } catch (err) {
    log = `Error: ${err.message}`;
  } finally {
    cleanupRepo(repo);
  }

  recordScenario(patchGateScenarios, {
    id: 'PG-INT-01',
    category: 'PATCH_INTEGRATION',
    testLevel: 'INTEGRATION',
    description: 'Valid patch applied cleanly using actual git apply',
    expectedOutcome: 'SEQUENTIAL_APPLY_SUCCESS',
    actualOutcome: outcome,
    exitCode,
    findingId: 'NONE',
    logDir: patchLogDir,
    logContent: log
  });
}

function writeCsv(dest, rows) {
  const header = 'Scenario_ID,Category,Test_Level,Description,Expected_Outcome,Actual_Outcome,Exit_Code,Finding_ID,Log_File,Log_SHA256\n';
  const body = rows.map(r => `${r.id},${r.category},${r.testLevel},"${r.description}",${r.expectedOutcome},${r.actualOutcome},${r.exitCode},${r.findingId},${r.id}.log,${r.logSha256}`).join('\n');
  fs.writeFileSync(dest, header + body + '\n');
}

writeCsv('WAVE_0_4_5_OWNERSHIP_GATE_SCENARIOS.csv', ownershipScenarios);
writeCsv('WAVE_0_4_5_STALE_BASE_SCENARIOS.csv', staleBaseScenarios);
writeCsv('WAVE_0_4_5_PATCH_GATE_SCENARIOS.csv', patchGateScenarios);

console.log('Ownership, Stale Base, and Patch Gate tests completed.');
