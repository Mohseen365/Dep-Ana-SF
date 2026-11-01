/**
 * patch-gate.cjs
 * Wave 0.4.4 Executable patch verification, integration, and provenance-aware safe rollback helper.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

class PatchGateError extends Error {
  constructor(code, message, details = {}) {
    super(`[PATCH_GATE_${code}] ${message}`);
    this.name = 'PatchGateError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Normalizes and validates a target path strictly.
 * Rejects directories, normalized '.', traversal, absolute paths, UNC paths, and Windows drive paths.
 */
function normalizeSafePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new PatchGateError('MALFORMED_PATH', 'Path must be a non-empty string', { rawPath });
  }

  // Reject absolute paths, UNC paths, Windows drive paths
  if (rawPath.startsWith('/') || /^[a-zA-Z]:/.test(rawPath) || rawPath.startsWith('\\\\')) {
    throw new PatchGateError('ABSOLUTE_PATH', `Absolute, drive, or UNC paths are prohibited: ${rawPath}`, { rawPath });
  }

  // Reject trailing slashes (directory indicators)
  if (rawPath.endsWith('/') || rawPath.endsWith('\\')) {
    throw new PatchGateError('DIRECTORY_PATH', `Directory paths are prohibited as regular file targets: ${rawPath}`, { rawPath });
  }

  const normalized = path.posix.normalize(rawPath.replace(/\\/g, '/'));

  // Reject traversal escaping repo root
  if (normalized.startsWith('../') || normalized === '..' || normalized.includes('/../')) {
    throw new PatchGateError('PATH_TRAVERSAL', `Path traversal detected: ${rawPath}`, { rawPath });
  }

  // Reject normalized '.' (representing repository root / current directory)
  if (normalized === '.' || normalized === './') {
    throw new PatchGateError('DIRECTORY_PATH', `Root directory target '.' is prohibited: ${rawPath}`, { rawPath });
  }

  return normalized;
}

/**
 * Validates that base SHA matches expected dispatch base.
 */
function verify_base(expectedBaseSha, currentHeadSha, patchBaseSha) {
  if (!expectedBaseSha || typeof expectedBaseSha !== 'string' || expectedBaseSha.length < 7) {
    throw new PatchGateError('INVALID_EXPECTED_BASE', 'Expected dispatch base SHA is missing or malformed', { expectedBaseSha });
  }
  if (!patchBaseSha || typeof patchBaseSha !== 'string' || patchBaseSha.length < 7) {
    throw new PatchGateError('INVALID_PATCH_BASE', 'Patch base SHA is missing or malformed', { patchBaseSha });
  }

  if (!expectedBaseSha.startsWith(patchBaseSha) && !patchBaseSha.startsWith(expectedBaseSha)) {
    throw new PatchGateError('BASE_MISMATCH', `Patch base SHA (${patchBaseSha}) does not match expected dispatch base (${expectedBaseSha})`, {
      expectedBaseSha,
      patchBaseSha,
      currentHeadSha
    });
  }

  return {
    valid: true,
    expectedBaseSha,
    patchBaseSha,
    currentHeadSha,
    isHeadAtBase: (currentHeadSha.startsWith(expectedBaseSha) || expectedBaseSha.startsWith(currentHeadSha))
  };
}

/**
 * Enforces task allowlist rules.
 */
function enforce_allowlist(taskId, touchedPaths, allowedPaths, options = {}) {
  const requireExactMatch = options.requireExactMatch !== false;
  const normalizedAllowed = new Set(allowedPaths.map(p => normalizeSafePath(p)));
  const normalizedTouched = [];
  const seenTouched = new Set();

  for (const p of touchedPaths) {
    const norm = normalizeSafePath(p);
    if (seenTouched.has(norm)) {
      throw new PatchGateError('DUPLICATE_TOUCHED_PATH', `Duplicate path in patch payload: ${norm}`, { taskId, path: norm });
    }
    seenTouched.add(norm);
    normalizedTouched.push(norm);

    if (!normalizedAllowed.has(norm)) {
      throw new PatchGateError('UNLISTED_PATH', `Patch touches unlisted path '${norm}' not in task ${taskId} allowlist`, {
        taskId,
        path: norm,
        allowedPaths: Array.from(normalizedAllowed)
      });
    }
  }

  if (requireExactMatch && normalizedTouched.length !== normalizedAllowed.size) {
    const missing = Array.from(normalizedAllowed).filter(p => !seenTouched.has(p));
    throw new PatchGateError('MISSING_REQUIRED_PATH', `Patch omits required task paths: ${missing.join(', ')}`, {
      taskId,
      missingPaths: missing
    });
  }

  return {
    valid: true,
    taskId,
    touchedCount: normalizedTouched.length,
    allowedCount: normalizedAllowed.size
  };
}

/**
 * Enforces path mutability and coordinator-exclusive paths.
 */
function enforce_mutability(taskId, touchedPaths, frozenPaths, coordinatorOnlyPaths, role = 'FEATURE_AGENT') {
  const frozenSet = new Set(frozenPaths.map(p => normalizeSafePath(p)));
  const coordSet = new Set(coordinatorOnlyPaths.map(p => normalizeSafePath(p)));

  for (const p of touchedPaths) {
    const norm = normalizeSafePath(p);

    if (frozenSet.has(norm)) {
      throw new PatchGateError('FROZEN_PATH_MODIFICATION', `Patch attempts to modify frozen read-only path: ${norm}`, {
        taskId,
        path: norm
      });
    }

    if (role !== 'COORDINATOR' && coordSet.has(norm)) {
      throw new PatchGateError('COORDINATOR_EXCLUSIVE_PATH', `Feature task ${taskId} attempts to modify coordinator-exclusive path: ${norm}`, {
        taskId,
        path: norm,
        role
      });
    }
  }

  return {
    valid: true,
    taskId,
    role
  };
}

/**
 * Enforces coordinator role requirement.
 */
function enforce_coordinator_role(taskId, role, requiresCoordinator) {
  if (requiresCoordinator && role !== 'COORDINATOR') {
    throw new PatchGateError('UNAUTHORIZED_ROLE', `Task ${taskId} requires COORDINATOR role, but role was '${role}'`, {
      taskId,
      role
    });
  }
  return { valid: true, taskId, role };
}

/**
 * Records pre-apply state for target files to guarantee safe, file-scoped rollback.
 * Captures existence, tracked status, symlink status, pre-apply content hash and raw bytes.
 */
function recordPreApplyState(repoDir, targetPaths) {
  const state = {};
  for (const rawPath of targetPaths) {
    const p = normalizeSafePath(rawPath);
    const fullPath = path.join(repoDir, p);

    let exists = false;
    let isSymlink = false;
    let isDirectory = false;
    let isFile = false;
    let contentHash = null;
    let contentBuffer = null;

    try {
      const lstat = fs.lstatSync(fullPath);
      exists = true;
      isSymlink = lstat.isSymbolicLink();
      isDirectory = lstat.isDirectory();
      isFile = lstat.isFile();
      if (isFile) {
        contentBuffer = fs.readFileSync(fullPath);
        contentHash = crypto.createHash('sha256').update(contentBuffer).digest('hex');
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }

    if (exists && isDirectory) {
      throw new PatchGateError('DIRECTORY_TARGET', `Target path is an existing directory: ${p}`, { path: p });
    }
    if (exists && isSymlink) {
      throw new PatchGateError('SYMLINK_TARGET', `Target path is a symlink: ${p}`, { path: p });
    }

    // Check tracked status in git
    const lsFiles = cp.spawnSync('git', ['ls-files', '--error-unmatch', '--', p], { cwd: repoDir, stdio: 'pipe' });
    const isTracked = (lsFiles.status === 0);

    // Check if dirty in git
    let isDirty = false;
    if (isTracked) {
      const diffProc = cp.spawnSync('git', ['diff', '--quiet', '--', p], { cwd: repoDir });
      const stagedDiffProc = cp.spawnSync('git', ['diff', '--cached', '--quiet', '--', p], { cwd: repoDir });
      isDirty = (diffProc.status !== 0 || stagedDiffProc.status !== 0);
    }

    state[p] = {
      path: p,
      exists,
      isTracked,
      isDirty,
      isSymlink,
      isFile,
      contentHash,
      contentBuffer
    };
  }
  return state;
}

/**
 * Applies a patch with provenance recording.
 * Fails closed if pre-conditions fail.
 */
function apply_patch_with_provenance(repoDir, patchFilePath, options = {}) {
  const taskId = options.taskId || 'UNKNOWN_TASK';
  const role = options.role || 'FEATURE_AGENT';
  const allowedPaths = options.allowedPaths || [];
  const frozenPaths = options.frozenPaths || [];
  const coordinatorOnlyPaths = options.coordinatorOnlyPaths || [];
  const expectedBaseSha = options.expectedBaseSha;

  // 1. Parse patch to find target files
  const patchContent = fs.readFileSync(patchFilePath, 'utf8');
  const touchedPaths = parsePatchTouchedPaths(patchContent);

  if (touchedPaths.length === 0) {
    throw new PatchGateError('EMPTY_PATCH', 'Patch does not touch any files', { patchFilePath });
  }

  // 2. Validate paths
  for (const p of touchedPaths) {
    normalizeSafePath(p);
  }

  // 3. Enforce allowlist & mutability
  enforce_allowlist(taskId, touchedPaths, allowedPaths, { requireExactMatch: options.requireExactMatch });
  enforce_mutability(taskId, touchedPaths, frozenPaths, coordinatorOnlyPaths, role);

  // 4. Verify base SHA if provided
  if (expectedBaseSha) {
    const headProc = cp.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf8' });
    const currentHeadSha = headProc.stdout.trim();
    const patchBaseSha = options.patchBaseSha || currentHeadSha;
    verify_base(expectedBaseSha, currentHeadSha, patchBaseSha);
  }

  // 5. Record pre-apply state
  const preApplyState = recordPreApplyState(repoDir, touchedPaths);

  // 6. Test apply
  const checkProc = cp.spawnSync('git', ['apply', '--check', patchFilePath], { cwd: repoDir, stdio: 'pipe' });
  if (checkProc.status !== 0) {
    throw new PatchGateError('APPLY_CHECK_FAILED', `Git apply --check failed: ${checkProc.stderr.toString()}`, {
      stderr: checkProc.stderr.toString()
    });
  }

  // 7. Apply patch
  const applyProc = cp.spawnSync('git', ['apply', patchFilePath], { cwd: repoDir, stdio: 'pipe' });
  if (applyProc.status !== 0) {
    throw new PatchGateError('APPLY_FAILED', `Git apply failed: ${applyProc.stderr.toString()}`, {
      stderr: applyProc.stderr.toString()
    });
  }

  const provenance = {
    taskId,
    role,
    patchFilePath,
    touchedPaths,
    preApplyState,
    appliedAt: new Date().toISOString()
  };

  return {
    success: true,
    provenance
  };
}

/**
 * Extracts touched file paths from a unified diff patch text.
 */
function parsePatchTouchedPaths(patchText) {
  const paths = new Set();
  const lines = patchText.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('--- a/')) {
      const p = line.substring(6).trim();
      if (p !== '/dev/null') paths.add(p);
    } else if (line.startsWith('+++ b/')) {
      const p = line.substring(6).trim();
      if (p !== '/dev/null') paths.add(p);
    } else if (line.startsWith('diff --git a/')) {
      const parts = line.split(' ');
      if (parts.length >= 4) {
        const p1 = parts[2].substring(2);
        paths.add(p1);
      }
    }
  }
  return Array.from(paths);
}

/**
 * Provenance-aware, strictly file-scoped safe rollback.
 * NEVER deletes untracked files without proof of patch creation.
 * NEVER uses broad `git checkout HEAD -- <dir>` or `git clean`.
 * Preserves pre-existing dirty tracked modifications.
 */
function pathSafeRollback(repoDir, pathsToRevert, provenance = null) {
  if (!fs.existsSync(repoDir)) {
    throw new PatchGateError('REPO_NOT_FOUND', `Directory does not exist: ${repoDir}`);
  }

  if (!pathsToRevert || !Array.isArray(pathsToRevert) || pathsToRevert.length === 0) {
    throw new PatchGateError('INVALID_ROLLBACK_PATHS', 'pathsToRevert must be a non-empty array of file paths');
  }

  // Validate and reject directory targets, normalized '.', symlinks
  const normalizedPaths = [];
  for (const p of pathsToRevert) {
    const norm = normalizeSafePath(p);
    const fullPath = path.join(repoDir, norm);

    if (fs.existsSync(fullPath)) {
      const lstat = fs.lstatSync(fullPath);
      if (lstat.isDirectory()) {
        throw new PatchGateError('DIRECTORY_TARGET', `Cannot rollback directory target: ${norm}`, { path: norm });
      }
      if (lstat.isSymbolicLink()) {
        throw new PatchGateError('SYMLINK_TARGET', `Cannot rollback symlink target: ${norm}`, { path: norm });
      }
    }
    normalizedPaths.push(norm);
  }

  const results = [];

  for (const p of normalizedPaths) {
    const fullPath = path.join(repoDir, p);
    const preState = provenance && provenance.preApplyState ? provenance.preApplyState[p] : null;

    // Requirement: Refuse rollback when ownership/provenance cannot be established
    if (!provenance || !preState) {
      throw new PatchGateError('PROVENANCE_REQUIRED', `Cannot rollback path '${p}' without established pre-apply provenance`, { path: p });
    }

    // Verify ownership in provenance touchedPaths
    if (!provenance.touchedPaths || !provenance.touchedPaths.includes(p)) {
      throw new PatchGateError('PROVENANCE_MISMATCH', `Path '${p}' was not touched by patch operation ${provenance.taskId}`, { path: p });
    }

    // Case 1: Pre-existing tracked file that was dirty before the patch was applied
    if (preState.isTracked && preState.isDirty) {
      // Must restore exact pre-apply dirty content, NOT git checkout HEAD
      fs.writeFileSync(fullPath, preState.contentBuffer);
      results.push({ path: p, action: 'RESTORED_PRE_DIRTY_CONTENT' });
      continue;
    }

    // Case 2: Pre-existing clean tracked file
    if (preState.isTracked && !preState.isDirty) {
      if (preState.contentBuffer !== null) {
        fs.writeFileSync(fullPath, preState.contentBuffer);
      } else {
        const co = cp.spawnSync('git', ['checkout', 'HEAD', '--', p], { cwd: repoDir });
        if (co.status !== 0) {
          throw new PatchGateError('ROLLBACK_FAILED', `Git checkout failed for file ${p}: ${co.stderr.toString()}`, { path: p });
        }
      }
      results.push({ path: p, action: 'RESTORED_PRE_PATCH_TRACKED' });
      continue;
    }

    // Case 3: Untracked file that existed BEFORE patch application
    if (!preState.isTracked && preState.exists) {
      // File existed prior to patch. Restore its exact pre-apply content; DO NOT DELETE.
      fs.writeFileSync(fullPath, preState.contentBuffer);
      results.push({ path: p, action: 'PRESERVED_PRE_EXISTING_UNTRACKED' });
      continue;
    }

    // Case 4: File did NOT exist prior to patch application (created by patch)
    if (!preState.exists) {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      cp.spawnSync('git', ['rm', '-f', '--cached', '--ignore-unmatch', '--', p], { cwd: repoDir });
      results.push({ path: p, action: 'REMOVED_PATCH_CREATED_FILE' });
      continue;
    }

    throw new PatchGateError('UNHANDLED_ROLLBACK_STATE', `Unhandled rollback state for path ${p}`);
  }

  return {
    success: true,
    revertedCount: results.length,
    actions: results
  };
}

module.exports = {
  verify_base,
  enforce_allowlist,
  enforce_mutability,
  enforce_coordinator_role,
  recordPreApplyState,
  apply_patch_with_provenance,
  pathSafeRollback,
  normalizeSafePath,
  parsePatchTouchedPaths,
  PatchGateError
};
