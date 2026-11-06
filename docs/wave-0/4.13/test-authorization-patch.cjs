/**
 * test-authorization-patch.cjs
 * Wave 0.4.13 Authorization, Dependency, Path Parsing, and Shell Safety Test Harness
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const {
  PatchGateError,
  loadAuthoritativeRegisters,
  validateTaskDependencies,
  extractPatchTouchedPaths,
  unescapeGitCQuotedPath,
  apply_patch_with_provenance,
  checkIsTracked,
  checkIsDirty
} = require('./patch-gate.cjs');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const authResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  authResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runAuthSuite() {
  console.log('=== Wave 0.4.13 AUTHORIZATION & PATCH GATE VERIFICATION SUITE ===');

  // AUTH-01: Valid Feature Task (W5-1)
  {
    const { taskMap, batch1Set } = loadAuthoritativeRegisters(repoRoot, { permissiveMode: true });
    let actual = '';
    try {
      validateTaskDependencies(taskMap, 'W5-1');
      actual = (batch1Set.has('W5-1')) ? 'VALID_BATCH1_TASK' : 'NOT_IN_BATCH1';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'VALID_BATCH1_TASK') ? 'PASS' : 'FAIL';
    recordResult('AUTH-01', 'Valid Batch 1 feature task (W5-1) passes dependency and batch 1 check', 'VALID_BATCH1_TASK', actual, status, 'AUTH-01.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-02: Out-of-order W5 Task (W5-2 invoked when status is IMPLEMENTATION_DEPENDENT)
  {
    const { taskMap } = loadAuthoritativeRegisters(repoRoot, { permissiveMode: true });
    let actual = '';
    try {
      validateTaskDependencies(taskMap, 'W5-2');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && (e.code === 'TASK_BLOCKED_ON_PREREQUISITES' || e.code === 'PREREQUISITE_NOT_COMPLETED')) ? 'REJECTED_W5_ORDER' : e.message;
    }
    const status = (actual === 'REJECTED_W5_ORDER') ? 'PASS' : 'FAIL';
    recordResult('AUTH-02', 'Out-of-order W5-2 task rejected as IMPLEMENTATION_DEPENDENT', 'REJECTED_W5_ORDER', actual, status, 'AUTH-02.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-03: Cyclic Dependency Detection
  {
    const { taskMap } = loadAuthoritativeRegisters(repoRoot, { permissiveMode: true });
    const cycleMap = new Map(taskMap);
    const w61 = { ...cycleMap.get('W6-1'), 'Dispatch Status': 'COMPLETED', Dependencies: 'W6-2' };
    const w62 = { ...cycleMap.get('W6-2'), 'Dispatch Status': 'COMPLETED', Dependencies: 'W6-1' };
    cycleMap.set('W6-1', w61);
    cycleMap.set('W6-2', w62);

    let actual = '';
    try {
      validateTaskDependencies(cycleMap, 'W6-1');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'CYCLIC_DEPENDENCY') ? 'REJECTED_CYCLE' : e.message;
    }
    const status = (actual === 'REJECTED_CYCLE') ? 'PASS' : 'FAIL';
    recordResult('AUTH-03', 'Cyclic dependency between W6-1 and W6-2 rejected', 'REJECTED_CYCLE', actual, status, 'AUTH-03.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-04: Missing Dependency ID Detection
  {
    const { taskMap } = loadAuthoritativeRegisters(repoRoot, { permissiveMode: true });
    const brokenMap = new Map(taskMap);
    const brokenTask = { ...brokenMap.get('W6-1'), Dependencies: 'NON_EXISTENT_TASK' };
    brokenMap.set('W6-1', brokenTask);

    let actual = '';
    try {
      validateTaskDependencies(brokenMap, 'W6-1');
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'MISSING_DEPENDENCY_ID') ? 'REJECTED_MISSING_DEP' : e.message;
    }
    const status = (actual === 'REJECTED_MISSING_DEP') ? 'PASS' : 'FAIL';
    recordResult('AUTH-04', 'Missing dependency task ID rejected', 'REJECTED_MISSING_DEP', actual, status, 'AUTH-04.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-05: Coordinator task rejected through feature entry point with VALID matching base SHA (P0-01)
  {
    const headSha = cp.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).stdout.trim();
    let actual = '';
    try {
      apply_patch_with_provenance({
        repoDir: repoRoot,
        patchContent: 'diff --git a/scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs b/scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs\n--- a/scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs\n+++ b/scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs\n@@ -1 +1 @@\n+// test\n',
        taskId: 'INT-1',
        expectedBaseSha: headSha,
        patchBaseSha: headSha
      });
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && (e.code === 'COORDINATOR_TASK_VIA_FEATURE_GATE' || e.code === 'COORDINATOR_TASK_VIA_FEATURE_ENTRY')) ? 'REJECTED_COORDINATOR' : e.message;
    }
    const status = (actual === 'REJECTED_COORDINATOR') ? 'PASS' : 'FAIL';
    recordResult('AUTH-05', 'Coordinator task INT-1 rejected through feature entry point with valid matching base SHA', 'REJECTED_COORDINATOR', actual, status, 'AUTH-05.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-06: P0-01 Remediation - apply_coordinator_patch_with_provenance completely excised from public API
  {
    const pg = require('./patch-gate.cjs');
    let actual = '';
    if (typeof pg.apply_coordinator_patch_with_provenance === 'undefined') {
      actual = 'COORDINATOR_EXPORT_REMOVED';
    } else {
      actual = 'COORDINATOR_EXPORT_EXISTS';
    }
    const status = (actual === 'COORDINATOR_EXPORT_REMOVED') ? 'PASS' : 'FAIL';
    recordResult('AUTH-06', 'P0-01: Public coordinator privilege bypass excised from public exports', 'COORDINATOR_EXPORT_REMOVED', actual, status, 'AUTH-06.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-07: Shell Injection Resistance in checkIsTracked
  {
    const maliciousPath = 'scratch/test.js"; echo "INJECTED"; #';
    const isTracked = checkIsTracked(repoRoot, maliciousPath);
    const actual = (isTracked === false) ? 'SAFE_NO_SHELL_EXEC' : 'VULNERABLE';
    const status = (actual === 'SAFE_NO_SHELL_EXEC') ? 'PASS' : 'FAIL';
    recordResult('AUTH-07', 'checkIsTracked with shell metacharacters executes safely without shell expansion', 'SAFE_NO_SHELL_EXEC', actual, status, 'AUTH-07.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-08: Shell Injection Resistance in checkIsDirty
  {
    const maliciousPath = 'scratch/test.js$(id); echo "INJECTED"';
    const isDirty = checkIsDirty(repoRoot, maliciousPath);
    const actual = (isDirty === false) ? 'SAFE_NO_SHELL_EXEC' : 'VULNERABLE';
    const status = (actual === 'SAFE_NO_SHELL_EXEC') ? 'PASS' : 'FAIL';
    recordResult('AUTH-08', 'checkIsDirty with command substitution syntax executes safely without shell expansion', 'SAFE_NO_SHELL_EXEC', actual, status, 'AUTH-08.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-09: Unescaping Git C-Quoted Path with Octal UTF-8 sequences
  {
    const quoted = '"scratch/path/with\\342\\234\\223.txt"';
    const unescaped = unescapeGitCQuotedPath(quoted);
    const actual = (unescaped === 'scratch/path/with\u2713.txt') ? 'OCTAL_UNESCAPED_CORRECT' : 'FAILED';
    const status = (actual === 'OCTAL_UNESCAPED_CORRECT') ? 'PASS' : 'FAIL';
    recordResult('AUTH-09', 'Git C-quoted path with octal UTF-8 sequences unescaped accurately', 'OCTAL_UNESCAPED_CORRECT', actual, status, 'AUTH-09.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-10: Unescaping Git C-Quoted Path with Quotes and Backslashes
  {
    const quoted = '"scratch/path/with\\"quote\\"and\\\\backslash.txt"';
    const unescaped = unescapeGitCQuotedPath(quoted);
    const actual = (unescaped === 'scratch/path/with"quote"and\\backslash.txt') ? 'ESCAPES_UNESCAPED_CORRECT' : 'FAILED';
    const status = (actual === 'ESCAPES_UNESCAPED_CORRECT') ? 'PASS' : 'FAIL';
    recordResult('AUTH-10', 'Git C-quoted path with escaped quotes and backslashes unescaped accurately', 'ESCAPES_UNESCAPED_CORRECT', actual, status, 'AUTH-10.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-11: Rejection of Duplicate Diff Sections for Same Path
  {
    const duplicatePatch = `diff --git a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
--- a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
+++ b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
@@ -1 +1 @@
-console.log("old");
+console.log("new 1");
diff --git a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
--- a/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
+++ b/scratch/salesforce-poc/tests/run-w5-1-tests.cjs
@@ -1 +1 @@
-console.log("old");
+console.log("new 2");
`;
    let actual = '';
    try {
      extractPatchTouchedPaths(duplicatePatch);
      actual = 'UNEXPECTED_PASS';
    } catch (e) {
      actual = (e instanceof PatchGateError && e.code === 'DUPLICATE_DIFF_SECTION') ? 'REJECTED_DUPLICATE_DIFF_SECTION' : e.message;
    }
    const status = (actual === 'REJECTED_DUPLICATE_DIFF_SECTION') ? 'PASS' : 'FAIL';
    recordResult('AUTH-11', 'Duplicate diff sections for identical normalized path rejected', 'REJECTED_DUPLICATE_DIFF_SECTION', actual, status, 'AUTH-11.log', `ACTUAL: ${actual}\n`);
  }

  // AUTH-12: Extraction of Valid Diff with Space and Special Characters
  {
    const validPatch = `diff --git "a/scratch/salesforce-poc/file with spaces.txt" "b/scratch/salesforce-poc/file with spaces.txt"
--- "a/scratch/salesforce-poc/file with spaces.txt"
+++ "b/scratch/salesforce-poc/file with spaces.txt"
@@ -1 +1 @@
-old
+new
`;
    let actual = '';
    try {
      const paths = extractPatchTouchedPaths(validPatch);
      actual = (paths.length === 1 && paths[0] === 'scratch/salesforce-poc/file with spaces.txt') ? 'EXTRACTED_SPACES_PATH' : 'FAILED';
    } catch (e) {
      actual = e.message;
    }
    const status = (actual === 'EXTRACTED_SPACES_PATH') ? 'PASS' : 'FAIL';
    recordResult('AUTH-12', 'Diff header with C-quoted filenames containing spaces parsed correctly', 'EXTRACTED_SPACES_PATH', actual, status, 'AUTH-12.log', `ACTUAL: ${actual}\n`);
  }

  console.log(`Authorization suite finished: ${authResults.length} scenarios. All pass: ${authResults.every(r => r.status === 'PASS')}`);
  if (!authResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return authResults;
}

module.exports = { runAuthSuite, authResults };

if (require.main === module) {
  runAuthSuite();
}
