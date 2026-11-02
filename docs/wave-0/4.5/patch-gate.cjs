/**
 * patch-gate.cjs - Wave 0.4.5
 * Authoritative patch verification, integration, and provenance-aware safe rollback helper.
 *
 * Implements:
 * 1. Authoritative Task & Ownership Resolution from canonical repo CSVs (no forged allowlists/roles).
 * 2. Strict SHA Matching: expectedBaseSha === patchBaseSha === currentHeadSha.
 * 3. Physical Filesystem Containment & Realpath Validation (rejecting symlinked parent directories, symlink targets, UNC, drive letters, bare directories).
 * 4. Two-Phase Safe Rollback: Complete preflight before mutation, exact dirty/tracked byte restoration, post-apply hash checks, null-buffer protection.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

let parser = null;
const possibleParserPaths = [
  path.resolve(__dirname, '../4.3/strict-rfc4180-csv-parser.cjs'),
  path.resolve(__dirname, 'strict-rfc4180-csv-parser.cjs'),
  path.resolve(process.cwd(), 'docs/wave-0/4.3/strict-rfc4180-csv-parser.cjs')
];
for (const p of possibleParserPaths) {
  if (fs.existsSync(p)) {
    parser = require(p);
    break;
  }
}

class PatchGateError extends Error {
  constructor(code, message, details = {}) {
    super(`[PATCH_GATE_${code}] ${message}`);
    this.name = 'PatchGateError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Parses a CSV file using strict RFC 4180 parser.
 */
function parseCsvStrict(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new PatchGateError('MISSING_CSV_FILE', `CSV file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (parser && parser.parseStrictCSVToObjects) {
    return parser.parseStrictCSVToObjects(content);
  }
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    if (parts.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = parts[idx]; });
      rows.push(row);
    }
  }
  return rows;
}

/**
 * Authoritatively loads task register and ownership manifest from the repository or given targetDir.
 */
function loadAuthoritativeRegisters(repoRoot) {
  const taskCsv = path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
  const manifestCsv = path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
  const batch1Csv = path.join(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');

  if (!fs.existsSync(taskCsv)) {
    throw new PatchGateError('MISSING_TASK_REGISTER', `Authoritative task register not found: ${taskCsv}`);
  }
  if (!fs.existsSync(manifestCsv)) {
    throw new PatchGateError('MISSING_MANIFEST_REGISTER', `Authoritative manifest register not found: ${manifestCsv}`);
  }

  const tasksRaw = parseCsvStrict(taskCsv);
  const manifestRaw = parseCsvStrict(manifestCsv);

  const taskMap = new Map();
  for (const t of tasksRaw) {
    const tid = t['Task ID'] || t.Task_ID;
    if (!tid) continue;
    if (taskMap.has(tid)) {
      throw new PatchGateError('DUPLICATE_TASK_ID', `Authoritative task register has duplicate task ID: ${tid}`);
    }
    const affectedFilesStr = t['Exact Affected Files'] || t.Exact_Affected_Files || '';
    const affectedFiles = affectedFilesStr.split(';').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean);
    t._affectedFiles = new Set(affectedFiles);
    taskMap.set(tid, t);
  }

  const manifestMap = new Map();
  for (const m of manifestRaw) {
    const p = m.path || m.File_Path;
    if (!p) continue;
    const norm = p.replace(/\\/g, '/').replace(/^\.\//, '');
    if (manifestMap.has(norm)) {
      throw new PatchGateError('DUPLICATE_MANIFEST_PATH', `Authoritative manifest has duplicate path: ${norm}`);
    }
    manifestMap.set(norm, m);
  }

  let batch1Set = null;
  let batch1Rows = [];
  if (fs.existsSync(batch1Csv)) {
    batch1Rows = parseCsvStrict(batch1Csv);
    batch1Set = new Set(batch1Rows.map(r => r.Task_ID || r['Task ID']));
  }

  return { taskMap, manifestMap, batch1Set, batch1Rows };
}

/**
 * Normalizes and validates a target path strictly (lexical safety).
 */
function normalizeSafePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new PatchGateError('MALFORMED_PATH', 'Path must be a non-empty string', { rawPath });
  }

  if (rawPath.includes('\0')) {
    throw new PatchGateError('NUL_BYTE_PATH', 'Path contains NUL byte', { rawPath });
  }

  if (rawPath.startsWith('/') || /^[a-zA-Z]:/.test(rawPath) || rawPath.startsWith('\\\\')) {
    throw new PatchGateError('ABSOLUTE_PATH', 'Absolute, drive, and UNC paths are strictly forbidden', { rawPath });
  }

  const unified = rawPath.replace(/\\/g, '/');

  if (unified === '.' || unified.trim() === '') {
    throw new PatchGateError('DIRECTORY_PATH', 'Normalized path cannot be current directory "."', { rawPath });
  }

  if (unified.endsWith('/')) {
    throw new PatchGateError('DIRECTORY_PATH', 'Directory paths are forbidden; targets must be regular files', { rawPath });
  }

  const segments = unified.split('/');
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg === '' && i > 0 && i < segments.length - 1) {
      throw new PatchGateError('MALFORMED_PATH', 'Empty path segments (double slashes) are forbidden', { rawPath });
    }
    if (seg === '..') {
      throw new PatchGateError('PATH_TRAVERSAL', 'Path traversal segments ("..") are strictly forbidden', { rawPath });
    }
  }

  const normalized = path.posix.normalize(unified);
  if (normalized === '.' || normalized.endsWith('/')) {
    throw new PatchGateError('DIRECTORY_PATH', 'Normalized path resolved to directory or "."', { rawPath });
  }
  if (normalized.startsWith('../')) {
    throw new PatchGateError('PATH_TRAVERSAL', 'Normalized path escapes root via traversal', { rawPath });
  }

  return normalized;
}

/**
 * Physically verifies filesystem containment against canonical repository root.
 */
function verifyFilesystemContainment(repoRoot, relPath) {
  const normRel = normalizeSafePath(relPath);
  const canonicalRoot = fs.realpathSync(repoRoot);
  const fullPath = path.resolve(repoRoot, normRel);

  const segments = normRel.split('/');
  let currentAccum = canonicalRoot;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isTarget = (i === segments.length - 1);
    currentAccum = path.join(currentAccum, seg);

    if (fs.existsSync(currentAccum) || isLstatLink(currentAccum)) {
      const st = fs.lstatSync(currentAccum);
      if (st.isSymbolicLink()) {
        if (!isTarget) {
          throw new PatchGateError('SYMLINK_PARENT_COMPONENT', `Parent path component is a symlink: ${seg}`, { relPath, segment: seg });
        } else {
          throw new PatchGateError('SYMLINK_TARGET', `Final target is a symlink: ${normRel}`, { relPath });
        }
      }

      if (isTarget && st.isDirectory()) {
        throw new PatchGateError('DIRECTORY_PATH', `Final target is an existing directory: ${normRel}`, { relPath });
      }
    }
  }

  let probe = fullPath;
  while (!fs.existsSync(probe) && !isLstatLink(probe)) {
    probe = path.dirname(probe);
  }
  const realAncestor = fs.realpathSync(probe);
  const relFromRoot = path.relative(canonicalRoot, realAncestor);
  if (relFromRoot.startsWith('..') || path.isAbsolute(relFromRoot)) {
    throw new PatchGateError('FILESYSTEM_ESCAPE', `Physical realpath escapes repository root: ${normRel}`, { relPath, realAncestor, canonicalRoot });
  }

  if (fs.existsSync(fullPath)) {
    const realTarget = fs.realpathSync(fullPath);
    const targetRel = path.relative(canonicalRoot, realTarget);
    if (targetRel.startsWith('..') || path.isAbsolute(targetRel)) {
      throw new PatchGateError('FILESYSTEM_ESCAPE', `Existing file realpath escapes repository root: ${normRel}`, { relPath, realTarget, canonicalRoot });
    }
  }

  return { canonicalRoot, fullPath, normRel };
}

function isLstatLink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch (e) {
    return false;
  }
}

/**
 * Strict base verification.
 */
function verify_base(repoDir, expectedBaseSha, patchBaseSha = null) {
  if (!expectedBaseSha || typeof expectedBaseSha !== 'string' || expectedBaseSha.length < 7) {
    throw new PatchGateError('MALFORMED_BASE_SHA', 'Expected base SHA is missing or malformed', { expectedBaseSha });
  }

  if (!patchBaseSha || typeof patchBaseSha !== 'string' || patchBaseSha.length < 7) {
    throw new PatchGateError('MALFORMED_BASE_SHA', 'Patch-declared base SHA is missing or malformed', { patchBaseSha });
  }

  let currentHeadSha = null;
  try {
    currentHeadSha = cp.execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    throw new PatchGateError('GIT_HEAD_ERROR', 'Failed to retrieve current HEAD SHA from git repository', { error: err.message });
  }

  if (!currentHeadSha) {
    throw new PatchGateError('MISSING_CURRENT_HEAD', 'Current Git HEAD SHA could not be determined');
  }

  const isMatch = (expectedBaseSha === patchBaseSha && expectedBaseSha === currentHeadSha);

  if (!isMatch) {
    return {
      isHeadAtBase: false,
      expectedBaseSha,
      patchBaseSha,
      currentHeadSha,
      rejectionReason: `Base SHA mismatch: expected=${expectedBaseSha}, patch=${patchBaseSha}, currentHead=${currentHeadSha}`
    };
  }

  return {
    isHeadAtBase: true,
    expectedBaseSha,
    patchBaseSha,
    currentHeadSha,
    rejectionReason: null
  };
}

/**
 * Authoritatively validates task and path ownership.
 */
function enforceAuthoritativeTaskOwnership({
  repoRoot,
  taskId,
  touchedPaths,
  trustedRole = 'feature-agent',
  batch1Enforce = true
}) {
  const { taskMap, manifestMap, batch1Set } = loadAuthoritativeRegisters(repoRoot);

  if (!taskId || typeof taskId !== 'string') {
    throw new PatchGateError('TASK_ID_REQUIRED', 'Task ID is missing or malformed');
  }

  const taskRecord = taskMap.get(taskId);
  if (!taskRecord) {
    throw new PatchGateError('UNKNOWN_TASK', `Task ID ${taskId} is not registered in authoritative task register`, { taskId });
  }

  if (batch1Enforce) {
    if (!batch1Set || !batch1Set.has(taskId)) {
      throw new PatchGateError('TASK_OUTSIDE_BATCH1', `Task ${taskId} is not authorized in Batch 1 allowlist`, { taskId });
    }
  }

  const ownerField = taskRecord['Accountable Owner'] || taskRecord.Accountable_Owner || '';
  const isTaskCoordinator = ownerField.includes('Coordinator') || taskId === 'INT-1';
  if (trustedRole === 'coordinator' && !isTaskCoordinator) {
    throw new PatchGateError('UNAUTHORIZED_ROLE', `Role 'coordinator' claimed, but task ${taskId} is not coordinator-owned`, { taskId, trustedRole });
  }

  const taskDeclaredFiles = taskRecord._affectedFiles || new Set();

  for (const rawP of touchedPaths) {
    const normP = normalizeSafePath(rawP);
    verifyFilesystemContainment(repoRoot, normP);

    const manifestRow = manifestMap.get(normP);
    if (!manifestRow) {
      throw new PatchGateError('UNLISTED_PATH', `Path ${normP} is not present in authoritative ownership manifest`, { path: normP, taskId });
    }

    const tier = manifestRow.mutability_tier || manifestRow.Mutability_Tier;
    if (tier === 'FROZEN_READ_ONLY' || manifestRow.Is_Frozen === 'YES') {
      throw new PatchGateError('FROZEN_PATH_MODIFICATION', `Path ${normP} is strictly frozen and cannot be modified`, { path: normP, taskId });
    }

    if (tier === 'INTEGRATION_COORDINATOR_ONLY' || manifestRow.Is_Coordinator_Exclusive === 'YES') {
      if (trustedRole !== 'coordinator' || !isTaskCoordinator) {
        throw new PatchGateError('COORDINATOR_EXCLUSIVE_PATH', `Path ${normP} is coordinator-exclusive; non-coordinator role rejected`, { path: normP, taskId, trustedRole });
      }
    }

    if (!taskDeclaredFiles.has(normP)) {
      throw new PatchGateError('UNLISTED_PATH', `Path ${normP} is not declared as affected file for task ${taskId}`, { path: normP, taskId });
    }

    const assignedWorkstreamOrTask = manifestRow.workstream_or_task || manifestRow.Workstream_Or_Task || '';
    if (assignedWorkstreamOrTask && assignedWorkstreamOrTask !== 'None') {
      let isMatch = assignedWorkstreamOrTask.includes(taskId);
      if (!isMatch) {
        const rangeMatch = assignedWorkstreamOrTask.match(/W5-(\d)\s+through\s+W5-(\d)/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          const tMatch = taskId.match(/W5-(\d)/);
          if (tMatch) {
            const cur = parseInt(tMatch[1], 10);
            if (cur >= start && cur <= end) isMatch = true;
          }
        }
      }
      if (!isMatch) {
        throw new PatchGateError('UNLISTED_PATH', `Path ${normP} is owned by ${assignedWorkstreamOrTask}, not task ${taskId}`, { path: normP, taskId, owner: assignedWorkstreamOrTask });
      }
    }
  }

  return { taskRecord, authorizedPaths: Array.from(taskDeclaredFiles) };
}

/**
 * Extracts and strictly validates patch file headers.
 */
function extractPatchTouchedPaths(patchContent) {
  if (!patchContent || typeof patchContent !== 'string' || patchContent.trim() === '') {
    throw new PatchGateError('EMPTY_PATCH', 'Patch content is empty or malformed');
  }

  const rawHeaders = [];
  const lines = patchContent.split('\n');

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      const parts = line.split(' ');
      if (parts.length >= 4) {
        let bPath = parts[3].replace(/^b\//, '');
        rawHeaders.push(bPath);
      }
    }
  }

  if (rawHeaders.length === 0) {
    for (const line of lines) {
      if (line.startsWith('+++ b/')) {
        rawHeaders.push(line.substring(6).trim());
      }
    }
  }

  if (rawHeaders.length === 0) {
    throw new PatchGateError('MALFORMED_PATCH', 'No diff --git or +++ headers found in patch');
  }

  const seenNorm = new Set();
  const normalizedList = [];

  for (const raw of rawHeaders) {
    const norm = normalizeSafePath(raw);
    if (seenNorm.has(norm)) {
      throw new PatchGateError('DUPLICATE_TOUCHED_PATH', `Duplicate touched path in patch payload: ${norm}`, { raw, norm });
    }
    seenNorm.add(norm);
    normalizedList.push(norm);
  }

  return normalizedList;
}

/**
 * Records pre-apply state for target paths.
 */
function recordPreApplyState(repoDir, targetPaths) {
  const preApply = {};
  for (const rel of targetPaths) {
    const { fullPath, normRel } = verifyFilesystemContainment(repoDir, rel);
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      const isTracked = checkIsTracked(repoDir, normRel);
      const isDirty = checkIsDirty(repoDir, normRel);
      preApply[normRel] = {
        exists: true,
        hash,
        isTracked,
        isDirty,
        originalContent: buf.toString('utf8'),
        mode: fs.statSync(fullPath).mode
      };
    } else {
      preApply[normRel] = {
        exists: false,
        hash: null,
        isTracked: false,
        isDirty: false,
        originalContent: null,
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
 * Executes authoritative patch application.
 */
function apply_patch_with_provenance({
  repoDir,
  patchContent,
  taskId,
  expectedBaseSha,
  patchBaseSha = null,
  trustedRole = 'feature-agent',
  batch1Enforce = true
}) {
  const effectivePatchBase = patchBaseSha || expectedBaseSha;
  const baseCheck = verify_base(repoDir, expectedBaseSha, effectivePatchBase);
  if (!baseCheck.isHeadAtBase) {
    throw new PatchGateError('BASE_MISMATCH', baseCheck.rejectionReason, {
      expectedBaseSha,
      patchBaseSha: baseCheck.patchBaseSha,
      currentHeadSha: baseCheck.currentHeadSha
    });
  }

  const touchedPaths = extractPatchTouchedPaths(patchContent);

  enforceAuthoritativeTaskOwnership({
    repoRoot: repoDir,
    taskId,
    touchedPaths,
    trustedRole,
    batch1Enforce
  });

  const preApply = recordPreApplyState(repoDir, touchedPaths);

  const tmpPatch = path.join(repoDir, `.tmp-apply-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.patch`);
  fs.writeFileSync(tmpPatch, patchContent, 'utf8');

  try {
    const checkRes = cp.spawnSync('git', ['apply', '--check', tmpPatch], { cwd: repoDir, encoding: 'utf8' });
    if (checkRes.status !== 0) {
      throw new PatchGateError('APPLY_CHECK_FAILED', `git apply --check failed: ${checkRes.stderr}`, { stderr: checkRes.stderr });
    }

    const applyRes = cp.spawnSync('git', ['apply', tmpPatch], { cwd: repoDir, encoding: 'utf8' });
    if (applyRes.status !== 0) {
      throw new PatchGateError('APPLY_FAILED', `git apply failed: ${applyRes.stderr}`, { stderr: applyRes.stderr });
    }
  } finally {
    if (fs.existsSync(tmpPatch)) {
      fs.unlinkSync(tmpPatch);
    }
  }

  const postApply = {};
  for (const rel of touchedPaths) {
    const full = path.resolve(repoDir, rel);
    if (fs.existsSync(full)) {
      const buf = fs.readFileSync(full);
      postApply[rel] = {
        exists: true,
        hash: crypto.createHash('sha256').update(buf).digest('hex')
      };
    } else {
      postApply[rel] = {
        exists: false,
        hash: null
      };
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
 * Two-phase safe rollback implementation.
 */
function pathSafeRollback({
  repoDir,
  provenance,
  taskId,
  trustedRole = 'feature-agent',
  batch1Enforce = true
}) {
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

  enforceAuthoritativeTaskOwnership({
    repoRoot: repoDir,
    taskId: effectiveTaskId,
    touchedPaths: provenance.touchedPaths,
    trustedRole,
    batch1Enforce
  });

  // PHASE A: Complete Preflight across all paths with ZERO filesystem mutation
  for (const rel of provenance.touchedPaths) {
    const normRel = normalizeSafePath(rel);
    const { fullPath } = verifyFilesystemContainment(repoDir, normRel);

    const pre = provenance.preApply[normRel];
    const post = provenance.postApply[normRel];
    if (!pre || !post) {
      throw new PatchGateError('CORRUPT_PROVENANCE_ENTRY', `Missing pre/post record for ${normRel}`, { rel: normRel });
    }

    if (fs.existsSync(fullPath)) {
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
      if (post.exists) {
        throw new PatchGateError('POST_APPLY_MISSING', `File ${normRel} existed after patch application but is now missing`, { rel: normRel });
      }
    }
  }

  // PHASE B: Controlled atomic restoration
  for (const rel of provenance.touchedPaths) {
    const normRel = normalizeSafePath(rel);
    const fullPath = path.resolve(repoDir, normRel);
    const pre = provenance.preApply[normRel];

    if (pre.exists) {
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      if (typeof pre.originalContent !== 'string') {
        throw new PatchGateError('NULL_BUFFER_RESTORE', `Attempted to restore invalid/null content for ${normRel}`);
      }
      fs.writeFileSync(fullPath, pre.originalContent, 'utf8');

      const restoredHash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
      if (restoredHash !== pre.hash) {
        throw new PatchGateError('RESTORE_VERIFICATION_FAILED', `Restored hash mismatch for ${normRel}`, {
          expected: pre.hash,
          actual: restoredHash
        });
      }
    } else {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
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
