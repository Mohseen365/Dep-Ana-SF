/**
 * test-api-surface.cjs
 * Wave 0.4.11 Public API Surface and Mutation Hook Elimination Verification
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pg = require('./patch-gate.cjs');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const apiResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  apiResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runApiSurfaceSuite() {
  console.log('=== Wave 0.4.11 PUBLIC API SURFACE & HOOK INSPECTION SUITE ===');

  const patchGateSource = fs.readFileSync(path.resolve(__dirname, 'patch-gate.cjs'), 'utf8');

  // API-01: No _testHookPreMutate in patch-gate.cjs source
  {
    const hasHook = patchGateSource.includes('_testHookPreMutate');
    const actual = (!hasHook) ? 'HOOK_FREE' : 'CONTAINS_TEST_HOOK';
    const status = (actual === 'HOOK_FREE') ? 'PASS' : 'FAIL';
    recordResult('API-01', 'patch-gate.cjs source contains zero references to _testHookPreMutate', 'HOOK_FREE', actual, status, 'API-01.log', `ACTUAL: ${actual}\n`);
  }

  // API-02: No _testHookPrePhaseB in patch-gate.cjs source
  {
    const hasHook = patchGateSource.includes('_testHookPrePhaseB');
    const actual = (!hasHook) ? 'HOOK_FREE' : 'CONTAINS_TEST_HOOK';
    const status = (actual === 'HOOK_FREE') ? 'PASS' : 'FAIL';
    recordResult('API-02', 'patch-gate.cjs source contains zero references to _testHookPrePhaseB', 'HOOK_FREE', actual, status, 'API-02.log', `ACTUAL: ${actual}\n`);
  }

  // API-03: Function signatures of apply_patch_with_provenance
  {
    const fnStr = pg.apply_patch_with_provenance.toString();
    const hasHookParam = fnStr.includes('_testHook');
    const actual = (!hasHookParam) ? 'NO_HOOK_PARAMS' : 'HAS_HOOK_PARAM';
    const status = (actual === 'NO_HOOK_PARAMS') ? 'PASS' : 'FAIL';
    recordResult('API-03', 'apply_patch_with_provenance signature contains zero test hook parameters', 'NO_HOOK_PARAMS', actual, status, 'API-03.log', `FN_STRING:\n${fnStr}\nACTUAL: ${actual}\n`);
  }

  // API-04: P0-01 - Coordinator function completely absent from public exports
  {
    const isExported = typeof pg.apply_coordinator_patch_with_provenance !== 'undefined';
    const actual = (!isExported) ? 'COORDINATOR_EXCISED' : 'COORDINATOR_STILL_EXPORTED';
    const status = (actual === 'COORDINATOR_EXCISED') ? 'PASS' : 'FAIL';
    recordResult('API-04', 'apply_coordinator_patch_with_provenance completely excised from exports', 'COORDINATOR_EXCISED', actual, status, 'API-04.log', `ACTUAL: ${actual}\n`);
  }

  // API-05: Function signature of pathSafeRollback
  {
    const fnStr = pg.pathSafeRollback.toString();
    const hasHookParam = fnStr.includes('_testHook');
    const actual = (!hasHookParam) ? 'NO_HOOK_PARAMS' : 'HAS_HOOK_PARAM';
    const status = (actual === 'NO_HOOK_PARAMS') ? 'PASS' : 'FAIL';
    recordResult('API-05', 'pathSafeRollback signature contains zero test hook parameters', 'NO_HOOK_PARAMS', actual, status, 'API-05.log', `FN_STRING:\n${fnStr}\nACTUAL: ${actual}\n`);
  }

  // API-06: Allowed exports check
  {
    const allowedExports = [
      'PatchGateError',
      'loadAuthoritativeRegisters',
      'normalizeSafePath',
      'verifyFilesystemContainment',
      'verify_base',
      'validateTaskDependencies',
      'enforceAuthoritativeTaskOwnership',
      'unescapeGitCQuotedPath',
      'extractPatchTouchedPaths',
      'recordPreApplyState',
      'checkIsTracked',
      'checkIsDirty',
      'apply_patch_with_provenance',
      'pathSafeRollback'
    ];
    const actualExports = Object.keys(pg);
    const hasUnsafeExport = actualExports.some(e => !allowedExports.includes(e));
    const actual = (!hasUnsafeExport && actualExports.length === allowedExports.length) ? 'EXACT_SAFE_EXPORTS' : `EXPORTS_${actualExports.length}`;
    const status = (actual === 'EXACT_SAFE_EXPORTS') ? 'PASS' : 'FAIL';
    recordResult('API-06', 'Exported API surface contains strictly allowed functions with zero bypass seams', 'EXACT_SAFE_EXPORTS', actual, status, 'API-06.log', `EXPORTS:\n${JSON.stringify(actualExports)}\nACTUAL: ${actual}\n`);
  }

  console.log(`API Surface suite finished: ${apiResults.length} scenarios. All pass: ${apiResults.every(r => r.status === 'PASS')}`);
  if (!apiResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return apiResults;
}

module.exports = { runApiSurfaceSuite, apiResults };

if (require.main === module) {
  runApiSurfaceSuite();
}
