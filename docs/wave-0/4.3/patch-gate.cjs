/**
 * patch-gate.cjs
 * Executable patch verification and integration gate helper module for Wave 0.4.3.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

class PatchGateError extends Error {
  constructor(code, message, details = {}) {
    super(`[PATCH_GATE_${code}] ${message}`);
    this.name = 'PatchGateError';
    this.code = code;
    this.details = details;
  }
}

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

function normalizeSafePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new PatchGateError('MALFORMED_PATH', 'Path must be a non-empty string', { rawPath });
  }
  if (rawPath.startsWith('/') || /^[a-zA-Z]:/.test(rawPath) || rawPath.startsWith('\\\\')) {
    throw new PatchGateError('ABSOLUTE_PATH', `Absolute or UNC paths are prohibited: ${rawPath}`, { rawPath });
  }
  const normalized = path.posix.normalize(rawPath.replace(/\\/g, '/'));
  if (normalized.startsWith('../') || normalized === '..' || normalized.includes('/../')) {
    throw new PatchGateError('PATH_TRAVERSAL', `Path traversal detected: ${rawPath}`, { rawPath });
  }
  return normalized;
}

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

function enforce_coordinator_role(taskId, role, requiresCoordinator) {
  if (requiresCoordinator && role !== 'COORDINATOR') {
    throw new PatchGateError('UNAUTHORIZED_ROLE', `Task ${taskId} requires COORDINATOR role, but role was '${role}'`, {
      taskId,
      role
    });
  }
  return { valid: true, taskId, role };
}

function pathSafeRollback(repoDir, targetCommitOrHead, pathsToRevert) {
  if (!fs.existsSync(repoDir)) {
    throw new PatchGateError('REPO_NOT_FOUND', `Directory does not exist: ${repoDir}`);
  }

  const normalizedPaths = pathsToRevert.map(p => normalizeSafePath(p));
  const results = [];

  for (const p of normalizedPaths) {
    const fullPath = path.join(repoDir, p);
    try {
      const fileShow = cp.spawnSync('git', ['cat-file', '-e', `${targetCommitOrHead}:${p}`], { cwd: repoDir });
      if (fileShow.status === 0) {
        const res = cp.spawnSync('git', ['checkout', targetCommitOrHead, '--', p], { cwd: repoDir });
        if (res.status !== 0) {
          throw new Error(res.stderr.toString());
        }
        results.push({ path: p, action: 'RESTORED' });
      } else {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        cp.spawnSync('git', ['rm', '-f', '--cached', '--', p], { cwd: repoDir });
        results.push({ path: p, action: 'REMOVED_UNTRACKED' });
      }
    } catch (err) {
      throw new PatchGateError('ROLLBACK_FAILED', `Failed to rollback path '${p}': ${err.message}`, { path: p });
    }
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
  pathSafeRollback,
  normalizeSafePath,
  PatchGateError
};
