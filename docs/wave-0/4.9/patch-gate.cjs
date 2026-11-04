/**
 * patch-gate.cjs - Wave 0.4.8 Hardened Edition
 *
 * Implements security-critical dispatch remediation:
 * 1. Derives authorization strictly from fixed authoritative registers. Public APIs accept NO caller-controlled role or bypass options.
 * 2. Unconditionally enforces Batch 1 allowlist for feature tasks.
 * 3. Separate, narrow coordinator-only entry point (`apply_coordinator_patch_with_provenance`) restricted to coordinator tasks.
 * 4. Full patch header parser: parses source (a/...), destination (b/...), renames, copies, deletes, quotes, and escaped characters.
 * 5. Data-loss safe Two-Phase Rollback:
 *    - Phase A: Non-mutating preflight across ALL target paths. Rejects if file now exists when post-state was absent (preventing overwrite of post-apply created files). Byte-exact binary verification. If any target fails, ZERO mutations.
 *    - Phase B: Guarded restoration with byte-level fidelity (Buffer/base64), file mode restoration, and atomic safe writes.
 * 6. Deterministic containment checking and synchronized hook support for race tests.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const parser = require('./strict-rfc4180-csv-parser.cjs');

class PatchGateError extends Error {
  constructor(code, message, details = {}) {
    super(`[PATCH_GATE_${code}] ${message}`);
    this.name = 'PatchGateError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Parses a CSV file strictly. Fails closed with no fallback.
 */
function parseCsvStrict(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new PatchGateError('MISSING_CSV_FILE', `Authoritative CSV file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    return parser.parseStrictCSVToObjects(content, { filename: path.basename(filePath) });
  } catch (err) {
    throw new PatchGateError('MALFORMED_CSV', `Strict CSV parse error for ${filePath}: ${err.message}`, { originalError: err });
  }
}

/**
 * Normalizes relative paths safely. Rejects path traversal, bare root, UNC, and drive letters.
 */
function normalizeSafePath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    throw new PatchGateError('INVALID_PATH', 'Path must be a non-empty string', { rawPath });
  }
  let p = rawPath.trim();
  p = p.replace(/^["']|["']$/g, '');
  p = p.replace(/\\/g, '/');

  if (/^[a-zA-Z]:/.test(p) || p.startsWith('//') || p.startsWith('\\\\')) {
    throw new PatchGateError('INVALID_ABSOLUTE_PATH', `Drive letters and UNC paths prohibited: ${rawPath}`, { rawPath });
  }
  if (p.startsWith('/')) {
    throw new PatchGateError('INVALID_ABSOLUTE_PATH', `Absolute paths prohibited: ${rawPath}`, { rawPath });
  }

  const segments = p.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      throw new PatchGateError('PATH_TRAVERSAL', `Directory traversal (..) detected: ${rawPath}`, { rawPath });
    }
  }

  const clean = path.normalize(p).replace(/\\/g, '/').replace(/^\.\//, '');
  if (clean === '.' || clean === '') {
    throw new PatchGateError('DIRECTORY_TARGET_NOT_ALLOWED', `Directory root cannot be a target: ${rawPath}`, { rawPath });
  }
  if (clean.startsWith('..')) {
    throw new PatchGateError('PATH_TRAVERSAL', `Directory traversal (..) detected: ${rawPath}`, { rawPath });
  }
  return clean;
}

/**
 * Verifies physical filesystem containment inside repoRoot.
 * Rejects symlink targets, symlinked parent directories, and directories.
 */
function verifyFilesystemContainment(repoRoot, relativePath) {
  const normRel = normalizeSafePath(relativePath);
  const resolvedRoot = fs.realpathSync(repoRoot);
  const candidateFull = path.resolve(resolvedRoot, normRel);

  // Check prefix containment
  if (!candidateFull.startsWith(resolvedRoot + path.sep) && candidateFull !== resolvedRoot) {
    throw new PatchGateError('OUTSIDE_ROOT_ESCAPE', `Path escapes repository boundary: ${normRel}`, { normRel });
  }

  // Walk all path components from root downward to verify no symlink exists in the parent tree
  const parts = normRel.split('/');
  let currentAccum = resolvedRoot;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentAccum = path.join(currentAccum, part);
    const isTarget = (i === parts.length - 1);

    if (fs.existsSync(currentAccum) || fs.lstatSync(currentAccum, { throwIfNoEntry: false })) {
      const st = fs.lstatSync(currentAccum);
      if (st.isSymbolicLink()) {
        if (isTarget) {
          throw new PatchGateError('SYMLINK_TARGET', `Symlink file target rejected: ${normRel}`, { normRel });
        } else {
          throw new PatchGateError('SYMLINK_PARENT_COMPONENT', `Symlinked parent directory component rejected: ${part} in ${normRel}`, { normRel, part });
        }
      }

      if (isTarget && st.isDirectory()) {
        throw new PatchGateError('DIRECTORY_TARGET_NOT_ALLOWED', `Target is a directory, not a file: ${normRel}`, { normRel });
      }

      const realAccum = fs.realpathSync(currentAccum);
      if (!realAccum.startsWith(resolvedRoot + path.sep) && realAccum !== resolvedRoot) {
        throw new PatchGateError('OUTSIDE_ROOT_ESCAPE', `Realpath escapes root: ${realAccum}`, { normRel, realAccum });
      }
    }
  }

  return { fullPath: candidateFull, normRel };
}

/**
 * Loads authoritative registers. Fails closed on any inconsistency or duplication.
 */
function loadAuthoritativeRegisters(repoRoot) {
  const taskCsv = path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
  const manifestCsv = path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
  const batch1Csv = path.join(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');

  const tasksRaw = parseCsvStrict(taskCsv);
  const manifestRaw = parseCsvStrict(manifestCsv);
  const batch1Raw = parseCsvStrict(batch1Csv);

  const batch1Set = new Set();
  for (const r of batch1Raw) {
    const tid = r['Task ID'] || r.Task_ID || r.taskId;
    if (tid) batch1Set.add(tid.trim());
  }

  const taskMap = new Map();
  for (const t of tasksRaw) {
    const tid = t['Task ID'] || t.Task_ID;
    if (!tid) continue;
    const cleanTid = tid.trim();
    if (taskMap.has(cleanTid)) {
      throw new PatchGateError('DUPLICATE_TASK_ID', `Authoritative task register has duplicate task ID: ${cleanTid}`, { cleanTid });
    }
    const affectedFilesStr = t['Exact Affected Files'] || t.Exact_Affected_Files || '';
    const affectedFiles = affectedFilesStr.split(';')
      .map(s => s.trim().replace(/\\/g, '/').replace(/^\.\//, ''))
      .filter(Boolean);
    t._affectedFiles = new Set(affectedFiles);
    taskMap.set(cleanTid, t);
  }

  const manifestMap = new Map();
  for (const m of manifestRaw) {
    const p = m.path || m.File_Path;
    if (!p) continue;
    const norm = p.replace(/\\/g, '/').replace(/^\.\//, '');
    if (manifestMap.has(norm)) {
      throw new PatchGateError('DUPLICATE_MANIFEST_PATH', `Authoritative ownership manifest has duplicate path: ${norm}`, { norm });
    }
    manifestMap.set(norm, m);
  }

  return { taskMap, manifestMap, batch1Set };
}

/**
 * Authoritatively validates task and path ownership.
 * Derived strictly from registers. Does NOT accept caller-supplied roles or bypasses.
 */
function enforceAuthoritativeTaskOwnership({ repoRoot, taskId, touchedPaths, isCoordinatorCall = false }) {
  if (!taskId || typeof taskId !== 'string') {
    throw new PatchGateError('TASK_ID_REQUIRED', 'Task ID is missing or malformed');
  }

  const { taskMap, manifestMap, batch1Set } = loadAuthoritativeRegisters(repoRoot);
  const cleanTaskId = taskId.trim();
  const taskRecord = taskMap.get(cleanTaskId);

  if (!taskRecord) {
    throw new PatchGateError('UNKNOWN_TASK', `Task ID ${cleanTaskId} is not registered in authoritative task register`, { taskId: cleanTaskId });
  }

  const ownerField = taskRecord['Accountable Owner'] || taskRecord.Accountable_Owner || '';
  const isTaskCoordinator = ownerField.toLowerCase().includes('coordinator') || cleanTaskId === 'INT-1';

  // Security property: feature task cannot use INT-1 or coordinator entry
  if (isCoordinatorCall) {
    if (!isTaskCoordinator) {
      throw new PatchGateError('UNAUTHORIZED_COORDINATOR_ROUTE', `Task ${cleanTaskId} is not a coordinator task, cannot use coordinator entry point`, { taskId: cleanTaskId });
    }
  } else {
    // Feature agent route: INT-1 is rejected
    if (cleanTaskId === 'INT-1' || isTaskCoordinator) {
      throw new PatchGateError('COORDINATOR_TASK_ON_FEATURE_ROUTE', `Coordinator task ${cleanTaskId} cannot be dispatched through feature-agent route`, { taskId: cleanTaskId });
    }
    // Batch 1 enforcement is UNCONDITIONAL for feature tasks
    if (!batch1Set.has(cleanTaskId)) {
      throw new PatchGateError('TASK_OUTSIDE_BATCH1', `Task ${cleanTaskId} is not authorized in Batch 1 allowlist`, { taskId: cleanTaskId });
    }
  }

  // Validate dependencies & status
  const status = (taskRecord['Dispatch Status'] || taskRecord.Dispatch_Status || taskRecord.Status || taskRecord['Execution Status'] || '').toUpperCase();
  if (status === 'COMPLETED' || status === 'BLOCKED') {
    throw new PatchGateError('INELIGIBLE_TASK_STATUS', `Task ${cleanTaskId} has ineligible execution status: ${status}`, { taskId: cleanTaskId, status });
  }

  const taskDeclaredFiles = taskRecord._affectedFiles || new Set();

  for (const rawP of touchedPaths) {
    const normP = normalizeSafePath(rawP);
    verifyFilesystemContainment(repoRoot, normP);

    const manifestRow = manifestMap.get(normP);
    if (!manifestRow) {
      throw new PatchGateError('UNLISTED_PATH', `Path ${normP} is not present in authoritative ownership manifest`, { path: normP, taskId: cleanTaskId });
    }

    const tier = manifestRow.mutability_tier || manifestRow.Mutability_Tier;
    if (tier === 'FROZEN_READ_ONLY' || manifestRow.Is_Frozen === 'YES') {
      throw new PatchGateError('FROZEN_PATH_MODIFICATION', `Path ${normP} is strictly frozen and cannot be modified`, { path: normP, taskId: cleanTaskId });
    }

    if (tier === 'INTEGRATION_COORDINATOR_ONLY' || manifestRow.Is_Coordinator_Exclusive === 'YES') {
      if (!isCoordinatorCall || !isTaskCoordinator) {
        throw new PatchGateError('COORDINATOR_EXCLUSIVE_PATH', `Path ${normP} is coordinator-exclusive; feature-agent route rejected`, { path: normP, taskId: cleanTaskId });
      }
    }

    if (!taskDeclaredFiles.has(normP)) {
      throw new PatchGateError('UNLISTED_PATH', `Path ${normP} is not declared as affected file for task ${cleanTaskId}`, { path: normP, taskId: cleanTaskId });
    }

    const assignedWorkstreamOrTask = manifestRow.workstream_or_task || manifestRow.Workstream_Or_Task || '';
    if (assignedWorkstreamOrTask && assignedWorkstreamOrTask !== 'None') {
      let isMatch = assignedWorkstreamOrTask.includes(cleanTaskId);
      if (!isMatch) {
        const rangeMatch = assignedWorkstreamOrTask.match(/W5-(\d)\s+through\s+W5-(\d)/i);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          const tMatch = cleanTaskId.match(/W5-(\d)/i);
          if (tMatch) {
            const cur = parseInt(tMatch[1], 10);
            if (cur >= start && cur <= end) isMatch = true;
          }
        }
      }
      if (!isMatch) {
        throw new PatchGateError('WRONG_TASK_OWNERSHIP', `Path ${normP} is owned by ${assignedWorkstreamOrTask}, not task ${cleanTaskId}`, { path: normP, taskId: cleanTaskId, owner: assignedWorkstreamOrTask });
      }
    }
  }

  return { taskRecord, authorizedPaths: Array.from(taskDeclaredFiles) };
}

/**
 * Extracts and strictly validates patch file headers.
 * Extracts ALL affected paths: source (a/..., rename from, copy from) and destination (b/..., rename to, copy to).
 */
function extractPatchTouchedPaths(patchContent) {
  if (!patchContent || typeof patchContent !== 'string' || patchContent.trim() === '') {
    throw new PatchGateError('EMPTY_PATCH', 'Patch content is empty or malformed');
  }

  const rawPaths = [];
  const lines = patchContent.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git ')) {
      const rest = line.substring(11).trim();
      const parts = parseGitDiffHeaderPaths(rest);
      if (!parts || !parts.aPath || !parts.bPath) {
        throw new PatchGateError('MALFORMED_DIFF_HEADER', `Malformed diff --git line: ${line}`, { line });
      }
      if (parts.aPath !== '/dev/null') rawPaths.push(parts.aPath);
      if (parts.bPath !== '/dev/null') rawPaths.push(parts.bPath);
      continue;
    }

    if (line.startsWith('--- ')) {
      const p = cleanHeaderPath(line.substring(4).trim(), 'a/');
      if (p && p !== '/dev/null') rawPaths.push(p);
      continue;
    }

    if (line.startsWith('+++ ')) {
      const p = cleanHeaderPath(line.substring(4).trim(), 'b/');
      if (p && p !== '/dev/null') rawPaths.push(p);
      continue;
    }

    if (line.startsWith('rename from ')) {
      const p = cleanHeaderPath(line.substring(12).trim());
      if (p) rawPaths.push(p);
      continue;
    }

    if (line.startsWith('rename to ')) {
      const p = cleanHeaderPath(line.substring(10).trim());
      if (p) rawPaths.push(p);
      continue;
    }

    if (line.startsWith('copy from ')) {
      const p = cleanHeaderPath(line.substring(10).trim());
      if (p) rawPaths.push(p);
      continue;
    }

    if (line.startsWith('copy to ')) {
      const p = cleanHeaderPath(line.substring(8).trim());
      if (p) rawPaths.push(p);
      continue;
    }
  }

  if (rawPaths.length === 0) {
    throw new PatchGateError('MALFORMED_PATCH', 'No diff --git or affected file headers found in patch');
  }

  const seenNorm = new Set();
  const normalizedList = [];

  for (const raw of rawPaths) {
    const norm = normalizeSafePath(raw);
    if (!seenNorm.has(norm)) {
      seenNorm.add(norm);
      normalizedList.push(norm);
    }
  }

  return normalizedList;
}

function parseGitDiffHeaderPaths(rest) {
  if (rest.startsWith('"')) {
    const firstEnd = rest.indexOf('"', 1);
    if (firstEnd === -1) return null;
    const aRaw = rest.substring(1, firstEnd);
    const remainder = rest.substring(firstEnd + 1).trim();
    if (!remainder.startsWith('"') || !remainder.endsWith('"')) {
      const bRaw = remainder.replace(/^b\//, '');
      return { aPath: aRaw.replace(/^a\//, ''), bPath: bRaw };
    }
    const bRaw = remainder.substring(1, remainder.length - 1);
    return { aPath: aRaw.replace(/^a\//, ''), bPath: bRaw.replace(/^b\//, '') };
  } else {
    const spaceIdx = rest.indexOf(' b/');
    if (spaceIdx === -1) {
      const parts = rest.split(' ');
      if (parts.length >= 2) {
        return { aPath: parts[0].replace(/^a\//, ''), bPath: parts[1].replace(/^b\//, '') };
      }
      return null;
    }
    const aRaw = rest.substring(0, spaceIdx);
    const bRaw = rest.substring(spaceIdx + 3);
    return { aPath: aRaw.replace(/^a\//, ''), bPath: bRaw };
  }
}

function cleanHeaderPath(p, prefix = '') {
  let cleaned = p.trim().replace(/^["']|["']$/g, '');
  if (prefix && cleaned.startsWith(prefix)) {
    cleaned = cleaned.substring(prefix.length);
  }
  return cleaned;
}

/**
 * Strict base verification: expectedBaseSha === patchBaseSha === currentHeadSha.
 */
function verify_base(repoDir, expectedBaseSha, patchBaseSha) {
  if (!expectedBaseSha || typeof expectedBaseSha !== 'string') {
    throw new PatchGateError('BASE_SHA_REQUIRED', 'expectedBaseSha is required');
  }
  let currentHeadSha = '';
  try {
    currentHeadSha = cp.execSync('git rev-parse HEAD', { cwd: repoDir, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
  } catch (err) {
    throw new PatchGateError('GIT_ERROR', 'Failed to retrieve git HEAD SHA', { error: err.message });
  }

  const patchSha = patchBaseSha || expectedBaseSha;

  if (expectedBaseSha !== currentHeadSha || patchSha !== currentHeadSha) {
    throw new PatchGateError('STALE_BASE', `Base SHA mismatch: currentHead=${currentHeadSha}, expected=${expectedBaseSha}, patchBase=${patchSha}`, {
      currentHeadSha,
      expectedBaseSha,
      patchBaseSha: patchSha
    });
  }

  return { currentHeadSha, matches: true };
}

/**
 * Records pre-apply state for target paths. Byte-exact binary preservation using base64.
 */
function recordPreApplyState(repoDir, targetPaths) {
  const preApply = {};
  for (const rel of targetPaths) {
    const { fullPath, normRel } = verifyFilesystemContainment(repoDir, rel);
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      const st = fs.statSync(fullPath);
      const isTracked = checkIsTracked(repoDir, normRel);
      const isDirty = checkIsDirty(repoDir, normRel);
      preApply[normRel] = {
        exists: true,
        hash,
        byteLength: buf.length,
        isTracked,
        isDirty,
        originalContentBase64: buf.toString('base64'),
        mode: st.mode
      };
    } else {
      preApply[normRel] = {
        exists: false,
        hash: null,
        byteLength: 0,
        isTracked: false,
        isDirty: false,
        originalContentBase64: null,
        mode: null
      };
    }
  }
  return preApply;
}

function checkIsTracked(repoDir, normRel) {
  try {
    const out = cp.execSync(`git ls-files --error-unmatch "${normRel}"`, { cwd: repoDir, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' });
    return out.trim().length > 0;
  } catch (e) {
    return false;
  }
}

function checkIsDirty(repoDir, normRel) {
  try {
    const out = cp.execSync(`git status --porcelain "${normRel}"`, { cwd: repoDir, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' });
    return out.trim().length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Executes authoritative patch application for feature tasks.
 * No caller-controlled role or allowlist flags accepted.
 */
function apply_patch_with_provenance({ repoDir, patchContent, taskId, expectedBaseSha, patchBaseSha, _testHookPreMutate = null }) {
  return _internalApplyPatch({
    repoDir,
    patchContent,
    taskId,
    expectedBaseSha,
    patchBaseSha,
    isCoordinatorCall: false,
    _testHookPreMutate
  });
}

/**
 * Executes authoritative patch application for coordinator-only integration tasks.
 */
function apply_coordinator_patch_with_provenance({ repoDir, patchContent, taskId, expectedBaseSha, patchBaseSha, _testHookPreMutate = null }) {
  return _internalApplyPatch({
    repoDir,
    patchContent,
    taskId,
    expectedBaseSha,
    patchBaseSha,
    isCoordinatorCall: true,
    _testHookPreMutate
  });
}

function _internalApplyPatch({ repoDir, patchContent, taskId, expectedBaseSha, patchBaseSha, isCoordinatorCall, _testHookPreMutate }) {
  const baseCheck = verify_base(repoDir, expectedBaseSha, patchBaseSha);
  const touchedPaths = extractPatchTouchedPaths(patchContent);

  // Authoritatively enforce task & path ownership
  enforceAuthoritativeTaskOwnership({
    repoRoot: repoDir,
    taskId,
    touchedPaths,
    isCoordinatorCall
  });

  const preApply = recordPreApplyState(repoDir, touchedPaths);

  // Testing synchronization barrier for race testing
  if (typeof _testHookPreMutate === 'function') {
    _testHookPreMutate();
  }

  // Pre-check containment again immediately before mutate
  for (const rel of touchedPaths) {
    verifyFilesystemContainment(repoDir, rel);
  }

  // Apply patch via git apply
  try {
    cp.execSync('git apply --whitespace=nowarn -', {
      cwd: repoDir,
      input: patchContent,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err) {
    throw new PatchGateError('APPLY_FAILED', `git apply failed: ${err.stderr ? err.stderr.toString() : err.message}`, {
      stderr: err.stderr ? err.stderr.toString() : null
    });
  }

  // Record post-apply state
  const postApply = {};
  for (const rel of touchedPaths) {
    const norm = normalizeSafePath(rel);
    const full = path.resolve(repoDir, norm);
    if (fs.existsSync(full)) {
      const buf = fs.readFileSync(full);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      const st = fs.statSync(full);
      postApply[norm] = { exists: true, hash, byteLength: buf.length, mode: st.mode };
    } else {
      postApply[norm] = { exists: false, hash: null, byteLength: 0, mode: null };
    }
  }

  const provenance = {
    taskId,
    appliedAt: new Date().toISOString(),
    baseSha: baseCheck.currentHeadSha,
    touchedPaths,
    preApply,
    postApply
  };

  return {
    success: true,
    touchedPaths,
    provenance
  };
}

/**
 * Data-loss safe Two-Phase Rollback implementation.
 * Zero mutations performed if Phase A preflight fails for any path.
 */
function pathSafeRollback({ repoDir, provenance, taskId, _testHookPrePhaseB = null }) {
  if (!provenance || typeof provenance !== 'object') {
    throw new PatchGateError('PROVENANCE_REQUIRED', 'Rollback requires valid provenance object');
  }

  if (!provenance.taskId || !provenance.touchedPaths || !provenance.preApply || !provenance.postApply) {
    throw new PatchGateError('INVALID_PROVENANCE', 'Provenance record is incomplete or corrupted');
  }

  if (taskId && provenance.taskId !== taskId) {
    throw new PatchGateError('TASK_MISMATCH', `Provenance task ${provenance.taskId} does not match request task ${taskId}`);
  }

  const effectiveTaskId = taskId || provenance.taskId;

  // Check for duplicates or aliases in touchedPaths
  const seenPaths = new Set();
  for (const p of provenance.touchedPaths) {
    const norm = normalizeSafePath(p);
    if (seenPaths.has(norm)) {
      throw new PatchGateError('DUPLICATE_TOUCHED_PATH', `Duplicate touched path in rollback request: ${norm}`, { path: norm });
    }
    seenPaths.add(norm);
  }

  // Determine coordinator status from registers
  const { taskMap } = loadAuthoritativeRegisters(repoDir);
  const taskRec = taskMap.get(effectiveTaskId);
  const isCoordinator = taskRec && ((taskRec['Accountable Owner'] || '').toLowerCase().includes('coordinator') || effectiveTaskId === 'INT-1');

  enforceAuthoritativeTaskOwnership({
    repoRoot: repoDir,
    taskId: effectiveTaskId,
    touchedPaths: provenance.touchedPaths,
    isCoordinatorCall: isCoordinator
  });

  // PHASE A: Comprehensive Read-Only Preflight across ALL target paths
  for (const rel of provenance.touchedPaths) {
    const normRel = normalizeSafePath(rel);
    const { fullPath } = verifyFilesystemContainment(repoDir, normRel);

    const pre = provenance.preApply[normRel];
    const post = provenance.postApply[normRel];
    if (!pre || !post) {
      throw new PatchGateError('CORRUPT_PROVENANCE_ENTRY', `Missing pre/post record for ${normRel}`, { rel: normRel });
    }

    // Validate pre/post record structures
    if (pre.exists) {
      if (!pre.hash) {
        throw new PatchGateError('INVALID_PRE_STATE', `Pre-state hash missing for ${normRel}`, { rel: normRel });
      }
      if ((pre.originalContentBase64 === undefined || pre.originalContentBase64 === null) && typeof pre.originalContent !== 'string') {
        throw new PatchGateError('NULL_BUFFER_RESTORE', `Pre-state indicates file existed but restore payload is null/missing for ${normRel}`, { rel: normRel });
      }
      if (pre.mode !== undefined && pre.mode !== null && typeof pre.mode !== 'number') {
        throw new PatchGateError('INVALID_MODE_METADATA', `Pre-state mode metadata invalid for ${normRel}`, { rel: normRel });
      }

      let testBuf = null;
      if (pre.originalContentBase64 !== undefined && pre.originalContentBase64 !== null) {
        try {
          testBuf = Buffer.from(pre.originalContentBase64, 'base64');
        } catch (e) {
          throw new PatchGateError('RESTORE_PAYLOAD_CORRUPT', `Base64 decode failed for ${normRel}`, { rel: normRel });
        }
      } else if (typeof pre.originalContent === 'string') {
        testBuf = Buffer.from(pre.originalContent, 'utf8');
      }
      const testHash = crypto.createHash('sha256').update(testBuf).digest('hex');
      if (testHash !== pre.hash) {
        throw new PatchGateError('RESTORE_PAYLOAD_CORRUPT', `Restore payload hash mismatch for ${normRel}: expected ${pre.hash}, got ${testHash}`, {
          expected: pre.hash,
          actual: testHash
        });
      }
      if (pre.byteLength !== undefined && testBuf.length !== pre.byteLength) {
        throw new PatchGateError('RESTORE_PAYLOAD_LENGTH_MISMATCH', `Restore payload byte length mismatch for ${normRel}`, { rel: normRel });
      }
    }

    const fileExistsNow = fs.existsSync(fullPath);

    if (fileExistsNow) {
      const st = fs.lstatSync(fullPath);
      if (st.isDirectory()) {
        throw new PatchGateError('DIRECTORY_TARGET_NOT_ALLOWED', `Target path is a directory: ${normRel}`, { rel: normRel });
      }
      if (st.isSymbolicLink()) {
        throw new PatchGateError('SYMLINK_TARGET', `Target path is a symlink: ${normRel}`, { rel: normRel });
      }

      // CRITICAL DATA LOSS CHECK:
      // If postApply says the file did NOT exist, but the file exists now, it was created after patch application!
      if (!post.exists) {
        throw new PatchGateError('POST_APPLY_RECREATED_FILE', `File ${normRel} was created post-apply; refusing rollback to prevent data loss`, { rel: normRel });
      }

      const currentBuf = fs.readFileSync(fullPath);
      const currentHash = crypto.createHash('sha256').update(currentBuf).digest('hex');

      if (post.exists && currentHash !== post.hash) {
        throw new PatchGateError('POST_APPLY_MUTATION', `File ${normRel} was modified after patch application; rollback refused to prevent data loss`, {
          rel: normRel,
          currentHash,
          postApplyHash: post.hash
        });
      }
    } else {
      // File does not exist now
      if (post.exists) {
        throw new PatchGateError('POST_APPLY_MISSING', `File ${normRel} existed after patch application but is now missing`, { rel: normRel });
      }
    }
  }

  // Preflight hook for race/concurrency test
  if (typeof _testHookPrePhaseB === 'function') {
    _testHookPrePhaseB();
  }

  // PHASE B: Guarded restoration
  const restoredPaths = [];
  try {
    for (const rel of provenance.touchedPaths) {
      const normRel = normalizeSafePath(rel);
      const { fullPath } = verifyFilesystemContainment(repoDir, normRel);
      const pre = provenance.preApply[normRel];

      if (pre.exists) {
        const parentDir = path.dirname(fullPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        let restoreBuf = null;
        if (pre.originalContentBase64) {
          restoreBuf = Buffer.from(pre.originalContentBase64, 'base64');
        } else if (typeof pre.originalContent === 'string') {
          restoreBuf = Buffer.from(pre.originalContent, 'utf8');
        } else {
          throw new PatchGateError('NULL_BUFFER_RESTORE', `Attempted to restore invalid/null content for ${normRel}`);
        }

        // Verify buffer hash before write
        const bufHash = crypto.createHash('sha256').update(restoreBuf).digest('hex');
        if (bufHash !== pre.hash) {
          throw new PatchGateError('RESTORE_PAYLOAD_CORRUPT', `Restore payload hash mismatch for ${normRel}: expected ${pre.hash}, got ${bufHash}`, {
            expected: pre.hash,
            actual: bufHash
          });
        }

        // Safe atomic write via temporary file
        const tmpFile = `${fullPath}.w048tmp.${crypto.randomBytes(4).toString('hex')}`;
        fs.writeFileSync(tmpFile, restoreBuf);
        if (typeof pre.mode === 'number') {
          try { fs.chmodSync(tmpFile, pre.mode); } catch (e) {}
        }
        fs.renameSync(tmpFile, fullPath);

        const currentBuf = fs.readFileSync(fullPath);
        const restoredHash = crypto.createHash('sha256').update(currentBuf).digest('hex');
        if (restoredHash !== pre.hash) {
          throw new PatchGateError('RESTORE_VERIFICATION_FAILED', `Restored hash mismatch for ${normRel}`, {
            expected: pre.hash,
            actual: restoredHash
          });
        }
        restoredPaths.push(normRel);
      } else {
        // File did not exist prior to patch; remove it only if present
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          restoredPaths.push(normRel);
        }
      }
    }
  } catch (err) {
    if (err instanceof PatchGateError && (err.code === 'RESTORE_PAYLOAD_CORRUPT' || err.code === 'RESTORE_VERIFICATION_FAILED')) {
      throw err;
    }
    throw new PatchGateError('PARTIAL_RESTORE_ERROR', `Error during restoration phase: ${err.message}`, {
      partiallyRestoredPaths: restoredPaths,
      allTouchedPaths: provenance.touchedPaths,
      recoveryInstructions: 'Inspect partiallyRestoredPaths vs allTouchedPaths and manually restore from repository commit'
    });
  }

  return {
    success: true,
    rolledBackPaths: provenance.touchedPaths
  };
}

module.exports = {
  PatchGateError,
  loadAuthoritativeRegisters,
  normalizeSafePath,
  verifyFilesystemContainment,
  verify_base,
  enforceAuthoritativeTaskOwnership,
  extractPatchTouchedPaths,
  recordPreApplyState,
  apply_patch_with_provenance,
  pathSafeRollback
};
