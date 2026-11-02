/**
 * patch-gate.cjs - Wave 0.4.8
 * Authoritative patch verification, integration, and provenance-aware safe rollback helper.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const { parseStrictCSVToObjects, CsvParseError } = require('./strict-rfc4180-csv-parser.cjs');

class PatchGateError extends Error {
  constructor(code, message, details = {}) {
    super(`[PATCH_GATE_${code}] ${message}`);
    this.name = 'PatchGateError';
    this.code = code;
    this.details = details;
  }
}

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
  if (!fs.existsSync(batch1Csv)) {
    throw new PatchGateError('MISSING_BATCH1_ALLOWLIST', `Batch 1 allowlist not found: ${batch1Csv}`);
  }

  let tasksRaw, manifestRaw, batch1Raw;
  try {
    tasksRaw = parseStrictCSVToObjects(fs.readFileSync(taskCsv, 'utf8'));
    manifestRaw = parseStrictCSVToObjects(fs.readFileSync(manifestCsv, 'utf8'));
    batch1Raw = parseStrictCSVToObjects(fs.readFileSync(batch1Csv, 'utf8'));
  } catch (err) {
    throw new PatchGateError('MALFORMED_AUTHORITATIVE_REGISTER', `Failed to parse authoritative CSV: ${err.message}`, { error: err });
  }

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

  const batch1Set = new Set();
  for (const b of batch1Raw) {
    const bid = b['Task ID'] || b.Task_ID;
    if (!bid) continue;
    batch1Set.add(bid);
  }

  return { taskMap, manifestMap, batch1Set, batch1Raw };
}

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

  const segments = unified.split('/').filter(Boolean);
  const resolved = [];

  for (const seg of segments) {
    if (seg === '.') continue;
    if (seg === '..') {
      if (resolved.length === 0) {
        throw new PatchGateError('PATH_TRAVERSAL', `Path attempts traversal outside root: ${rawPath}`, { rawPath });
      }
      resolved.pop();
    } else {
      resolved.push(seg);
    }
  }

  if (resolved.length === 0) {
    throw new PatchGateError('DIRECTORY_PATH', 'Path resolves to empty/root directory', { rawPath });
  }

  return resolved.join('/');
}

function verifyFilesystemContainment(repoRoot, relPath, hook = null) {
  const normRel = normalizeSafePath(relPath);
  const fullPath = path.resolve(repoRoot, normRel);
  const realRepoRoot = fs.realpathSync(repoRoot);

  if (!fullPath.startsWith(realRepoRoot + path.sep) && fullPath !== realRepoRoot) {
    throw new PatchGateError('ESCAPE_ATTEMPT', `Path resolves outside repository root: ${relPath}`, { relPath, fullPath });
  }

  if (typeof hook === 'function') {
    hook('BEFORE_CONTAINMENT_INSPECTION', { repoRoot, relPath, fullPath });
  }

  const parts = normRel.split('/');
  let currentAccum = realRepoRoot;

  for (let i = 0; i < parts.length - 1; i++) {
    currentAccum = path.join(currentAccum, parts[i]);
    if (fs.existsSync(currentAccum)) {
      const st = fs.lstatSync(currentAccum);
      if (st.isSymbolicLink()) {
        throw new PatchGateError('SYMLINK_PARENT_DETECTED', `Parent directory is a symlink: ${parts.slice(0, i + 1).join('/')}`, {
          path: relPath,
          offendingParent: currentAccum
        });
      }
      if (!st.isDirectory()) {
        throw new PatchGateError('PARENT_NOT_DIRECTORY', `Parent path component is not a directory: ${currentAccum}`, {
          path: relPath,
          component: currentAccum
        });
      }
    }
  }

  if (fs.existsSync(fullPath)) {
    const targetStat = fs.lstatSync(fullPath);
    if (targetStat.isSymbolicLink()) {
      throw new PatchGateError('SYMLINK_TARGET_DETECTED', `Target is a symlink: ${relPath}`, { path: relPath, fullPath });
    }
    if (targetStat.isDirectory()) {
      throw new PatchGateError('DIRECTORY_TARGET_DETECTED', `Target is a directory: ${relPath}`, { path: relPath, fullPath });
    }
    const realTarget = fs.realpathSync(fullPath);
    if (!realTarget.startsWith(realRepoRoot + path.sep)) {
      throw new PatchGateError('SYMLINK_ESCAPE', `Target resolves outside repository root: ${relPath}`, { path: relPath, realTarget });
    }
  }

  return { fullPath, normRel, realRepoRoot };
}

function parsePatchAffectedPaths(patchContent) {
  if (!patchContent || typeof patchContent !== 'string') {
    throw new PatchGateError('EMPTY_PATCH', 'Patch content must be a non-empty string');
  }

  const lines = patchContent.split(/\r?\n/);
  const diffs = [];
  let currentDiff = null;

  function unquotePath(p) {
    if (!p) return p;
    let s = p.trim();
    if (s.startsWith('"') && s.endsWith('"')) {
      s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return s;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git ')) {
      if (currentDiff) {
        diffs.push(currentDiff);
      }
      const rest = line.substring(11).trim();
      currentDiff = {
        header: line,
        oldPath: null,
        newPath: null,
        renameFrom: null,
        renameTo: null,
        copyFrom: null,
        copyTo: null,
        isRename: false,
        isCopy: false,
        isNew: false,
        isDelete: false
      };

      if (rest.startsWith('"')) {
        const m = rest.match(/^"([^"]+)"\s+"?([^"]+)"?$/);
        if (m) {
          currentDiff.oldPath = m[1].replace(/^[ab]\//, '');
          currentDiff.newPath = m[2].replace(/^[ab]\//, '');
        }
      } else {
        const parts = rest.split(' ');
        if (parts.length >= 2) {
          currentDiff.oldPath = parts[0].replace(/^[ab]\//, '');
          currentDiff.newPath = parts[1].replace(/^[ab]\//, '');
        }
      }
      continue;
    }

    if (!currentDiff) continue;

    if (line.startsWith('rename from ')) {
      currentDiff.isRename = true;
      currentDiff.renameFrom = unquotePath(line.substring(12));
    } else if (line.startsWith('rename to ')) {
      currentDiff.isRename = true;
      currentDiff.renameTo = unquotePath(line.substring(10));
    } else if (line.startsWith('copy from ')) {
      currentDiff.isCopy = true;
      currentDiff.copyFrom = unquotePath(line.substring(10));
    } else if (line.startsWith('copy to ')) {
      currentDiff.isCopy = true;
      currentDiff.copyTo = unquotePath(line.substring(8));
    } else if (line.startsWith('new file mode')) {
      currentDiff.isNew = true;
    } else if (line.startsWith('deleted file mode')) {
      currentDiff.isDelete = true;
    } else if (line.startsWith('--- ')) {
      const p = unquotePath(line.substring(4));
      if (p === '/dev/null') {
        currentDiff.isNew = true;
      } else {
        currentDiff.oldPath = p.replace(/^[ab]\//, '');
      }
    } else if (line.startsWith('+++ ')) {
      const p = unquotePath(line.substring(4));
      if (p === '/dev/null') {
        currentDiff.isDelete = true;
      } else {
        currentDiff.newPath = p.replace(/^[ab]\//, '');
      }
    }
  }

  if (currentDiff) {
    diffs.push(currentDiff);
  }

  if (diffs.length === 0) {
    throw new PatchGateError('NO_DIFF_FOUND', 'No valid diff --git headers found in patch');
  }

  const affected = [];
  const touchedSet = new Set();

  for (const d of diffs) {
    if (d.isRename) {
      if (!d.renameFrom || !d.renameTo) {
        throw new PatchGateError('MALFORMED_RENAME', 'Rename diff missing source or destination path', { diff: d });
      }
      affected.push({ type: 'rename', oldPath: d.renameFrom, newPath: d.renameTo });
      touchedSet.add(d.renameFrom);
      touchedSet.add(d.renameTo);
    } else if (d.isCopy) {
      if (!d.copyFrom || !d.copyTo) {
        throw new PatchGateError('MALFORMED_COPY', 'Copy diff missing source or destination path', { diff: d });
      }
      affected.push({ type: 'copy', oldPath: d.copyFrom, newPath: d.copyTo });
      touchedSet.add(d.copyFrom);
      touchedSet.add(d.copyTo);
    } else if (d.isNew) {
      if (!d.newPath) {
        throw new PatchGateError('MALFORMED_ADD', 'Add diff missing destination path', { diff: d });
      }
      affected.push({ type: 'add', oldPath: null, newPath: d.newPath });
      touchedSet.add(d.newPath);
    } else if (d.isDelete) {
      if (!d.oldPath) {
        throw new PatchGateError('MALFORMED_DELETE', 'Delete diff missing source path', { diff: d });
      }
      affected.push({ type: 'delete', oldPath: d.oldPath, newPath: null });
      touchedSet.add(d.oldPath);
    } else {
      const target = d.newPath || d.oldPath;
      if (!target) {
        throw new PatchGateError('MALFORMED_DIFF', 'Diff header missing target path', { diff: d });
      }
      affected.push({ type: 'modify', oldPath: d.oldPath || target, newPath: d.newPath || target });
      touchedSet.add(target);
    }
  }

  return {
    diffs: affected,
    touchedPaths: Array.from(touchedSet).map(normalizeSafePath)
  };
}

function verifyAuthoritativeTaskOwnership({
  repoRoot,
  taskId,
  touchedPaths,
  isCoordinatorExecution = false
}) {
  const { taskMap, manifestMap, batch1Set } = loadAuthoritativeRegisters(repoRoot);

  if (!taskId || typeof taskId !== 'string') {
    throw new PatchGateError('TASK_ID_REQUIRED', 'A valid Task ID string is required');
  }

  const taskRecord = taskMap.get(taskId);
  if (!taskRecord) {
    throw new PatchGateError('UNKNOWN_TASK_ID', `Task ID ${taskId} is not in authoritative task register`, { taskId });
  }

  const ownerField = taskRecord['Accountable Owner'] || taskRecord.Accountable_Owner || '';
  const isTaskCoordinator = ownerField.includes('Coordinator') || taskId === 'INT-1';

  if (taskId === 'INT-1' && !isCoordinatorExecution) {
    throw new PatchGateError('UNAUTHORIZED_COORDINATOR_TASK', `Task INT-1 is restricted to coordinator route`, { taskId });
  }

  if (isCoordinatorExecution) {
    if (!isTaskCoordinator) {
      throw new PatchGateError('COORDINATOR_ROUTE_MISUSE', `Coordinator route invoked for non-coordinator task: ${taskId}`, { taskId });
    }
  } else {
    if (!batch1Set.has(taskId)) {
      throw new PatchGateError('TASK_NOT_IN_BATCH_1', `Task ${taskId} is not authorized for Batch 1 dispatch`, { taskId });
    }

    const depsStr = taskRecord['Prerequisite Task IDs'] || taskRecord.Dependencies || '';
    if (depsStr && depsStr !== 'NONE' && depsStr !== 'None') {
      const deps = depsStr.split(';').map(s => s.trim()).filter(Boolean);
      for (const d of deps) {
        const depRecord = taskMap.get(d);
        if (!depRecord) {
          throw new PatchGateError('UNMET_DEPENDENCY', `Task ${taskId} has unknown prerequisite task ${d}`, { taskId, dependency: d });
        }
        const depStatus = depRecord['Execution Status'] || depRecord.Execution_Status || depRecord.Status;
        if (depStatus !== 'COMPLETE' && depStatus !== 'MERGED' && depStatus !== 'VERIFIED') {
          throw new PatchGateError('UNMET_DEPENDENCY', `Task ${taskId} prerequisite ${d} is not complete (status: ${depStatus})`, {
            taskId,
            dependency: d,
            depStatus
          });
        }
      }
    }
  }

  const taskDeclaredFiles = taskRecord._affectedFiles || new Set();

  for (const rawP of touchedPaths) {
    const normP = normalizeSafePath(rawP);
    const manifestRow = manifestMap.get(normP);
    if (!manifestRow) {
      throw new PatchGateError('UNMANIFESTED_PATH', `Path ${normP} is not present in authoritative ownership manifest`, { path: normP, taskId });
    }

    const tier = manifestRow.mutability_tier || manifestRow.Governance_Tier || manifestRow['Governance Tier'];
    if (tier === 'FROZEN_READ_ONLY' || manifestRow.Is_Frozen === 'YES') {
      throw new PatchGateError('FROZEN_PATH_MODIFICATION', `Path ${normP} is strictly frozen and cannot be modified`, { path: normP, taskId });
    }

    if (tier === 'INTEGRATION_COORDINATOR_ONLY' || tier === 'COORDINATOR_EXCLUSIVE' || manifestRow.Is_Coordinator_Exclusive === 'YES') {
      if (!isCoordinatorExecution || !isTaskCoordinator) {
        throw new PatchGateError('COORDINATOR_EXCLUSIVE_PATH', `Path ${normP} is coordinator-exclusive; feature agent rejected`, { path: normP, taskId });
      }
    }

    if (!taskDeclaredFiles.has(normP)) {
      throw new PatchGateError('UNLISTED_PATH', `Path ${normP} is not declared as affected file for task ${taskId}`, { path: normP, taskId });
    }

    const assignedTask = manifestRow.workstream_or_task || manifestRow['Authorized Migration Task'] || manifestRow.Authorized_Migration_Task;
    if (assignedTask && assignedTask !== taskId && assignedTask !== 'None' && assignedTask !== 'Repository Baseline') {
      throw new PatchGateError('WRONG_TASK_OWNER', `Path ${normP} is assigned to task ${assignedTask}, not ${taskId}`, {
        path: normP,
        taskId,
        assignedTask
      });
    }
  }

  return { taskRecord, isTaskCoordinator };
}

function verifyHeadBaseSha(repoDir, expectedBaseSha, patchBaseSha) {
  if (!expectedBaseSha || typeof expectedBaseSha !== 'string') {
    throw new PatchGateError('EXPECTED_BASE_SHA_REQUIRED', 'expectedBaseSha is required');
  }

  let currentHeadSha = '';
  try {
    currentHeadSha = cp.execSync('git rev-parse HEAD', { cwd: repoDir, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  } catch (err) {
    throw new PatchGateError('GIT_REV_PARSE_FAILED', `Failed to determine HEAD SHA: ${err.message}`);
  }

  if (expectedBaseSha !== currentHeadSha) {
    throw new PatchGateError('STALE_BASE_HEAD_MISMATCH', `Expected base SHA ${expectedBaseSha} does not match current HEAD ${currentHeadSha}`, {
      expectedBaseSha,
      currentHeadSha
    });
  }

  if (patchBaseSha && patchBaseSha !== expectedBaseSha) {
    throw new PatchGateError('PATCH_BASE_MISMATCH', `Patch base SHA ${patchBaseSha} does not match expected base ${expectedBaseSha}`, {
      patchBaseSha,
      expectedBaseSha
    });
  }

  return { currentHeadSha };
}

function recordPreApplyState(repoDir, touchedPaths) {
  const preApply = {};
  for (const rel of touchedPaths) {
    const normRel = normalizeSafePath(rel);
    const fullPath = path.resolve(repoDir, normRel);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      const buf = fs.readFileSync(fullPath);
      preApply[normRel] = {
        exists: true,
        hash: crypto.createHash('sha256').update(buf).digest('hex'),
        byteLength: buf.length,
        mode: stat.mode,
        encoding: 'base64',
        dataBase64: buf.toString('base64')
      };
    } else {
      preApply[normRel] = {
        exists: false,
        hash: null,
        byteLength: 0,
        mode: null,
        encoding: null,
        dataBase64: null
      };
    }
  }
  return preApply;
}

function verifyAndApplyPatch({
  repoDir,
  patchContent,
  taskId,
  expectedBaseSha,
  patchBaseSha = null
}) {
  verifyHeadBaseSha(repoDir, expectedBaseSha, patchBaseSha);
  const { touchedPaths } = parsePatchAffectedPaths(patchContent);

  for (const p of touchedPaths) {
    verifyFilesystemContainment(repoDir, p);
  }

  verifyAuthoritativeTaskOwnership({
    repoRoot: repoDir,
    taskId,
    touchedPaths,
    isCoordinatorExecution: false
  });

  const preApply = recordPreApplyState(repoDir, touchedPaths);

  try {
    cp.execSync('git apply --check -', {
      cwd: repoDir,
      input: patchContent,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    cp.execSync('git apply -', {
      cwd: repoDir,
      input: patchContent,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err) {
    throw new PatchGateError('GIT_APPLY_FAILED', `git apply failed: ${err.stderr ? err.stderr.toString() : err.message}`);
  }

  const postApply = {};
  for (const rel of touchedPaths) {
    const normRel = normalizeSafePath(rel);
    const fullPath = path.resolve(repoDir, normRel);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      const buf = fs.readFileSync(fullPath);
      postApply[normRel] = {
        exists: true,
        hash: crypto.createHash('sha256').update(buf).digest('hex'),
        byteLength: buf.length,
        mode: stat.mode
      };
    } else {
      postApply[normRel] = {
        exists: false,
        hash: null,
        byteLength: 0,
        mode: null
      };
    }
  }

  return {
    success: true,
    taskId,
    touchedPaths,
    provenance: {
      taskId,
      baseSha: expectedBaseSha,
      touchedPaths,
      preApply,
      postApply
    }
  };
}

function coordinatorApplyPatch({
  repoDir,
  patchContent,
  taskId,
  expectedBaseSha,
  patchBaseSha = null
}) {
  verifyHeadBaseSha(repoDir, expectedBaseSha, patchBaseSha);
  const { touchedPaths } = parsePatchAffectedPaths(patchContent);

  for (const p of touchedPaths) {
    verifyFilesystemContainment(repoDir, p);
  }

  verifyAuthoritativeTaskOwnership({
    repoRoot: repoDir,
    taskId,
    touchedPaths,
    isCoordinatorExecution: true
  });

  const preApply = recordPreApplyState(repoDir, touchedPaths);

  try {
    cp.execSync('git apply --check -', {
      cwd: repoDir,
      input: patchContent,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    cp.execSync('git apply -', {
      cwd: repoDir,
      input: patchContent,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err) {
    throw new PatchGateError('COORDINATOR_APPLY_FAILED', `Coordinator patch application failed: ${err.stderr ? err.stderr.toString() : err.message}`);
  }

  const postApply = {};
  for (const rel of touchedPaths) {
    const normRel = normalizeSafePath(rel);
    const fullPath = path.resolve(repoDir, normRel);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      const buf = fs.readFileSync(fullPath);
      postApply[normRel] = {
        exists: true,
        hash: crypto.createHash('sha256').update(buf).digest('hex'),
        byteLength: buf.length,
        mode: stat.mode
      };
    } else {
      postApply[normRel] = {
        exists: false,
        hash: null,
        byteLength: 0,
        mode: null
      };
    }
  }

  return {
    success: true,
    taskId,
    touchedPaths,
    provenance: {
      taskId,
      baseSha: expectedBaseSha,
      touchedPaths,
      preApply,
      postApply
    }
  };
}

function pathSafeRollback({
  repoDir,
  provenance,
  taskId = null,
  raceHook = null
}) {
  if (!provenance || typeof provenance !== 'object') {
    throw new PatchGateError('PROVENANCE_REQUIRED', 'Rollback requires valid provenance object');
  }

  const effectiveTaskId = taskId || provenance.taskId;
  if (!effectiveTaskId) {
    throw new PatchGateError('TASK_ID_REQUIRED', 'Task ID is required for rollback');
  }

  if (!Array.isArray(provenance.touchedPaths) || provenance.touchedPaths.length === 0) {
    throw new PatchGateError('EMPTY_TOUCHED_PATHS', 'Provenance must contain non-empty touchedPaths array');
  }

  if (!provenance.preApply || !provenance.postApply) {
    throw new PatchGateError('MALFORMED_PROVENANCE', 'Provenance missing preApply or postApply records');
  }

  const seenNormPaths = new Set();
  for (const rawP of provenance.touchedPaths) {
    const normP = normalizeSafePath(rawP);
    if (seenNormPaths.has(normP)) {
      throw new PatchGateError('DUPLICATE_TOUCHED_PATH', `Duplicate touched path in rollback provenance: ${normP}`, { path: normP });
    }
    seenNormPaths.add(normP);
  }

  const plannedOperations = [];

  for (const rel of provenance.touchedPaths) {
    const normRel = normalizeSafePath(rel);
    const { fullPath } = verifyFilesystemContainment(repoDir, normRel, raceHook);

    const pre = provenance.preApply[normRel];
    const post = provenance.postApply[normRel];
    if (!pre || typeof pre !== 'object') {
      throw new PatchGateError('MALFORMED_PRE_STATE', `Missing or invalid pre-state record for ${normRel}`, { rel: normRel });
    }
    if (!post || typeof post !== 'object') {
      throw new PatchGateError('MALFORMED_POST_STATE', `Missing or invalid post-state record for ${normRel}`, { rel: normRel });
    }

    const currentExists = fs.existsSync(fullPath);

    if (!post.exists) {
      if (currentExists) {
        throw new PatchGateError('POST_APPLY_RECREATED', `File ${normRel} was recreated after patch apply; rollback refused to prevent data loss`, { rel: normRel });
      }
    } else {
      if (!currentExists) {
        throw new PatchGateError('POST_APPLY_MISSING', `File ${normRel} existed after patch application but is now missing`, { rel: normRel });
      }
      const currentBuf = fs.readFileSync(fullPath);
      const currentHash = crypto.createHash('sha256').update(currentBuf).digest('hex');
      if (currentHash !== post.hash) {
        throw new PatchGateError('POST_APPLY_MUTATION', `File ${normRel} was modified after patch application; rollback refused to prevent data loss`, {
          rel: normRel,
          currentHash,
          postApplyHash: post.hash
        });
      }
    }

    if (pre.exists) {
      if (pre.dataBase64 === null || pre.dataBase64 === undefined || typeof pre.dataBase64 !== 'string') {
        throw new PatchGateError('MISSING_RESTORE_PAYLOAD', `Missing restore payload for ${normRel}`, { rel: normRel });
      }
      if (typeof pre.mode !== 'number' || pre.mode <= 0) {
        throw new PatchGateError('INVALID_MODE_METADATA', `Invalid mode metadata for ${normRel}`, { rel: normRel, mode: pre.mode });
      }
      const restoredBuf = Buffer.from(pre.dataBase64, 'base64');
      const payloadHash = crypto.createHash('sha256').update(restoredBuf).digest('hex');
      if (payloadHash !== pre.hash) {
        throw new PatchGateError('RESTORE_PAYLOAD_HASH_MISMATCH', `Restore payload hash mismatch for ${normRel}`, {
          rel: normRel,
          expected: pre.hash,
          actual: payloadHash
        });
      }
      plannedOperations.push({
        action: 'RESTORE_FILE',
        normRel,
        fullPath,
        restoredBuf,
        mode: pre.mode,
        expectedHash: pre.hash
      });
    } else {
      plannedOperations.push({
        action: 'UNLINK_FILE',
        normRel,
        fullPath
      });
    }
  }

  const executedOperations = [];
  try {
    for (const op of plannedOperations) {
      if (op.action === 'RESTORE_FILE') {
        const parentDir = path.dirname(op.fullPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        const tmpPath = `${op.fullPath}.tmp.${Date.now()}`;
        fs.writeFileSync(tmpPath, op.restoredBuf);
        fs.chmodSync(tmpPath, op.mode);
        fs.renameSync(tmpPath, op.fullPath);

        const writtenBuf = fs.readFileSync(op.fullPath);
        const writtenHash = crypto.createHash('sha256').update(writtenBuf).digest('hex');
        if (writtenHash !== op.expectedHash) {
          throw new PatchGateError('RESTORE_VERIFICATION_FAILED', `Restored hash mismatch for ${op.normRel}`);
        }
        executedOperations.push({ action: 'RESTORE_FILE', path: op.normRel, hash: writtenHash });
      } else if (op.action === 'UNLINK_FILE') {
        if (fs.existsSync(op.fullPath)) {
          fs.unlinkSync(op.fullPath);
        }
        executedOperations.push({ action: 'UNLINK_FILE', path: op.normRel });
      }
    }
  } catch (err) {
    throw new PatchGateError('GUARDED_RESTORATION_FAILURE', `Error during guarded restoration: ${err.message}`, {
      executedOperations,
      recoveryInstructions: 'Inspect executedOperations inventory and restore uncompleted paths manually.'
    });
  }

  return {
    success: true,
    rolledBackPaths: provenance.touchedPaths,
    executedOperations
  };
}

module.exports = {
  PatchGateError,
  loadAuthoritativeRegisters,
  normalizeSafePath,
  verifyFilesystemContainment,
  parsePatchAffectedPaths,
  verifyAuthoritativeTaskOwnership,
  verifyHeadBaseSha,
  recordPreApplyState,
  verifyAndApplyPatch,
  coordinatorApplyPatch,
  pathSafeRollback
};
