/**
 * patch-gate.cjs - Wave 0.4.11 Hardened Security Edition
 *
 * Implements security closures mandated by Wave 0.4.11:
 * 1. P0-01: Public rollback (`pathSafeRollback`) rejects coordinator-exclusive paths fail-closed.
 *    Never derives coordinator identity from caller-supplied taskId, provenance, or headers.
 * 2. P0-02: Zero public mutation hooks (test hook callbacks completely removed from signatures).
 * 3. Complete all-target Phase A preflight validation before any mutation in rollback.
 *    Handles empty base64 string for 0-byte file without truthiness failure. Byte-exact SHA-256 and mode validation.
 * 4. Strict CSV in production caller with documented dialect.
 * 5. Full Git diff header parser: rejects duplicate diff sections, parses C-quoted paths with octal escapes,
 *    and validates safe relative paths (no traversals, drive letters, UNC, NULs).
 * 6. Authoritative task dependency parsing and traversal: enforces W5 chain (W5-1 -> W5-2 -> ... -> W5-6)
 *    and prerequisite completion, detects cycles, rejects unknown tasks.
 * 7. Path-tainted shell elimination: replaces execSync with spawnSync (shell: false, discrete argument arrays).
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

function parseCsvStrict(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new PatchGateError('MISSING_CSV_FILE', `Authoritative CSV file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    return parser.parseStrictCSVToObjects(content, {
      filename: path.basename(filePath),
      strictCrlf: options.strictCrlf === true,
      strictColumnCount: true,
      requireNonEmptyHeader: true,
      disallowDuplicateHeaders: true
    });
  } catch (err) {
    throw new PatchGateError('MALFORMED_CSV', `Strict CSV parse error for ${filePath}: ${err.message}`, { originalError: err });
  }
}

function normalizeSafePath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    throw new PatchGateError('INVALID_PATH', 'Path must be a non-empty string', { rawPath });
  }
  let p = rawPath.trim();
  p = p.replace(/^["']|["']$/g, '');
  p = p.replace(/\\/g, '/');

  if (/[\x00-\x1f\x7f]/.test(p)) {
    throw new PatchGateError('INVALID_PATH_CONTROL_CHARS', `Control characters prohibited: ${rawPath}`, { rawPath });
  }

  if (/^[a-zA-Z]:/.test(p) || p.startsWith('//') || p.startsWith('\\\\')) {
    throw new PatchGateError('INVALID_ABSOLUTE_PATH', `Drive letters and UNC paths prohibited: ${rawPath}`, { rawPath });
  }

  if (p.startsWith('/')) {
    throw new PatchGateError('INVALID_ROOT_PATH', `Absolute root paths prohibited: ${rawPath}`, { rawPath });
  }

  const parts = p.split('/');
  const stack = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (stack.length === 0) {
        throw new PatchGateError('PATH_TRAVERSAL_DETECTED', `Path traversal sequence detected: ${rawPath}`, { rawPath });
      }
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  if (stack.length === 0) {
    throw new PatchGateError('EMPTY_RESOLVED_PATH', `Path resolves to empty root: ${rawPath}`, { rawPath });
  }

  return stack.join('/');
}

function verifyFilesystemContainment(repoRoot, relPath) {
  const normRel = normalizeSafePath(relPath);
  const realRepoRoot = fs.realpathSync(repoRoot);
  const targetAbs = path.resolve(realRepoRoot, normRel);

  if (targetAbs !== realRepoRoot && !targetAbs.startsWith(realRepoRoot + path.sep)) {
    throw new PatchGateError('CONTAINMENT_BREACH', `Path escapes repository root: ${relPath}`, { relPath, targetAbs });
  }

  let cur = path.dirname(targetAbs);
  while (cur.length >= realRepoRoot.length) {
    if (fs.existsSync(cur)) {
      const st = fs.lstatSync(cur);
      if (st.isSymbolicLink()) {
        const realCur = fs.realpathSync(cur);
        if (realCur !== realRepoRoot && !realCur.startsWith(realRepoRoot + path.sep)) {
          throw new PatchGateError('SYMLINK_PARENT_ESCAPES', `Parent directory is symlink escaping repository root: ${cur}`, { cur, realCur });
        }
      }
    }
    if (cur === realRepoRoot) break;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  return { normRel, fullPath: targetAbs };
}

function loadAuthoritativeRegisters(repoRoot, options = {}) {
  const taskCsv = fs.existsSync(path.resolve(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'))
    ? path.resolve(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv')
    : path.resolve(repoRoot, 'WAVE_0_4_AUTHORITATIVE_FINAL_TASK_AND_DEPENDENCY_REGISTER.csv');
  const manifestCsv = fs.existsSync(path.resolve(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'))
    ? path.resolve(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv')
    : path.resolve(repoRoot, 'WAVE_0_4_EXHAUSTIVE_FILE_OWNERSHIP_MANIFEST.csv');
  const batch1Csv = path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');

  const tasksRaw = parseCsvStrict(taskCsv, options);
  const manifestRaw = parseCsvStrict(manifestCsv, options);
  const batch1Raw = parseCsvStrict(batch1Csv, options);

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
    const p = m.path || m.Path;
    if (!p) continue;
    const norm = normalizeSafePath(p);
    if (manifestMap.has(norm)) {
      throw new PatchGateError('DUPLICATE_MANIFEST_PATH', `Ownership manifest has duplicate path: ${norm}`, { path: norm });
    }
    manifestMap.set(norm, m);
  }

  return { taskMap, manifestMap, batch1Set };
}

function validateTaskDependencies(taskMap, taskId) {
  if (!taskMap.has(taskId)) {
    throw new PatchGateError('UNKNOWN_TASK_ID', `Task ID not found in authoritative register: ${taskId}`, { taskId });
  }

  const visited = new Set();
  const recursionStack = new Set();

  function checkCycles(currId) {
    visited.add(currId);
    recursionStack.add(currId);

    const rec = taskMap.get(currId);
    if (rec) {
      const depStr = rec['Dependencies'] || rec.Dependencies || '';
      const deps = parseDependencyList(depStr);
      for (const d of deps) {
        if (!taskMap.has(d)) {
          throw new PatchGateError('MISSING_DEPENDENCY_ID', `Task ${currId} depends on unknown task ID: ${d}`, { currId, dependencyId: d });
        }
        if (recursionStack.has(d)) {
          throw new PatchGateError('CYCLIC_DEPENDENCY', `Cyclic dependency detected involving task ${currId} and ${d}`, { currId, dependencyId: d });
        }
        if (!visited.has(d)) {
          checkCycles(d);
        }
      }
    }
    recursionStack.delete(currId);
  }

  checkCycles(taskId);

  const w5Order = ['W5-1', 'W5-2', 'W5-3', 'W5-4', 'W5-5', 'W5-6'];
  const w5Idx = w5Order.indexOf(taskId);
  if (w5Idx > 0) {
    const prevPrereq = w5Order[w5Idx - 1];
    const rec = taskMap.get(taskId);
    const depStr = rec['Dependencies'] || rec.Dependencies || '';
    const deps = parseDependencyList(depStr);
    if (!deps.includes(prevPrereq)) {
      throw new PatchGateError('W5_CHAIN_VIOLATION', `Wave 5 task ${taskId} must explicitly depend on previous task ${prevPrereq}`, {
        taskId,
        requiredPrerequisite: prevPrereq,
        declaredDependencies: deps
      });
    }
    const status = rec['Dispatch Status'] || rec.Dispatch_Status;
    // Task W5-2..W5-6 cannot be executed until preceding tasks complete
    if (status === 'IMPLEMENTATION_DEPENDENT') {
      throw new PatchGateError('TASK_BLOCKED_ON_PREREQUISITES', `Wave 5 serialized task ${taskId} is currently IMPLEMENTATION_DEPENDENT and awaits completion of ${prevPrereq}`, { taskId, status });
    }
  } else if (taskId === 'W5-1') {
    const rec = taskMap.get(taskId);
    const status = rec['Dispatch Status'] || rec.Dispatch_Status;
    if (status !== 'READY_TO_LAUNCH') {
      throw new PatchGateError('W5_INVALID_STATUS', `Wave 5 initial task W5-1 must have READY_TO_LAUNCH status`, { taskId, status });
    }
  }
}

function parseDependencyList(depStr) {
  if (!depStr || depStr.trim().toLowerCase() === 'none') return [];
  return depStr.split(',')
    .map(s => {
      let clean = s.trim();
      const parenIdx = clean.indexOf('(');
      if (parenIdx !== -1) clean = clean.substring(0, parenIdx).trim();
      return clean;
    })
    .filter(Boolean);
}

function enforceAuthoritativeTaskOwnership({ repoRoot, taskId, touchedPaths, isCoordinatorCall }) {
  if (!taskId || typeof taskId !== 'string') {
    throw new PatchGateError('INVALID_TASK_ID', 'taskId is required and must be a string');
  }

  const { taskMap, manifestMap, batch1Set } = loadAuthoritativeRegisters(repoRoot);

  if (!taskMap.has(taskId)) {
    throw new PatchGateError('UNREGISTERED_TASK_ID', `Task ID ${taskId} is not registered in authoritative register`, { taskId });
  }

  const taskRecord = taskMap.get(taskId);
  const taskAffectedFiles = taskRecord._affectedFiles;
  const isCoordinatorTask = (taskRecord['Accountable Owner'] || '').toLowerCase().includes('coordinator') || taskId === 'INT-1';

  if (isCoordinatorCall && !isCoordinatorTask) {
    throw new PatchGateError('COORDINATOR_MISMATCH', `Coordinator entry point invoked for non-coordinator task ${taskId}`, { taskId });
  }
  if (!isCoordinatorCall && isCoordinatorTask) {
    throw new PatchGateError('COORDINATOR_TASK_VIA_FEATURE_ENTRY', `Coordinator-only task ${taskId} cannot be invoked via feature patch gate`, { taskId });
  }

  if (!isCoordinatorCall) {
    if (!batch1Set.has(taskId)) {
      throw new PatchGateError('TASK_NOT_IN_BATCH_1', `Task ${taskId} is not in Batch 1 allowlist`, { taskId });
    }
    validateTaskDependencies(taskMap, taskId);
  }

  for (const rawPath of touchedPaths) {
    const norm = normalizeSafePath(rawPath);

    if (!manifestMap.has(norm)) {
      throw new PatchGateError('UNMANAGED_PATH', `Path ${norm} is not in authoritative file ownership manifest`, { path: norm });
    }

    const manifestEntry = manifestMap.get(norm);
    const mutTier = manifestEntry.mutability_tier || manifestEntry.Mutability_Tier;
    const isBaselineTest = (manifestEntry.is_baseline_test || manifestEntry.Is_Baseline_Test || '').toUpperCase() === 'YES';

    if (isBaselineTest) {
      throw new PatchGateError('FROZEN_BASELINE_TEST_MODIFICATION', `Path ${norm} is a frozen baseline test runner and cannot be modified`, { path: norm });
    }

    if (mutTier === 'FROZEN_READ_ONLY') {
      throw new PatchGateError('FROZEN_READ_ONLY_MODIFICATION', `Path ${norm} is FROZEN_READ_ONLY in manifest`, { path: norm });
    }

    if (mutTier === 'COORDINATOR_INTEGRATION_EXCLUSIVE' && !isCoordinatorCall) {
      throw new PatchGateError('COORDINATOR_EXCLUSIVE_PATH', `Path ${norm} requires coordinator privileges`, { path: norm, taskId });
    }

    if (!taskAffectedFiles.has(norm)) {
      throw new PatchGateError('PATH_OUTSIDE_TASK_SCOPE', `Path ${norm} is not in the declared Exact Affected Files for task ${taskId}`, { path: norm, taskId });
    }
  }

  return true;
}

function unescapeGitCQuotedPath(quotedStr) {
  if (!quotedStr.startsWith('"') || !quotedStr.endsWith('"')) {
    return quotedStr;
  }
  const inner = quotedStr.substring(1, quotedStr.length - 1);
  const bytes = [];

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '\\' && i + 1 < inner.length) {
      const next = inner[i + 1];
      if (next >= '0' && next <= '7') {
        let octalStr = next;
        let j = i + 2;
        while (j < inner.length && j < i + 4 && inner[j] >= '0' && inner[j] <= '7') {
          octalStr += inner[j];
          j++;
        }
        bytes.push(parseInt(octalStr, 8));
        i = j - 1;
      } else if (next === 'n') {
        bytes.push(0x0a);
        i++;
      } else if (next === 't') {
        bytes.push(0x09);
        i++;
      } else if (next === 'r') {
        bytes.push(0x0d);
        i++;
      } else if (next === 'b') {
        bytes.push(0x08);
        i++;
      } else if (next === 'f') {
        bytes.push(0x0c);
        i++;
      } else if (next === 'v') {
        bytes.push(0x0b);
        i++;
      } else if (next === 'a') {
        bytes.push(0x07);
        i++;
      } else if (next === '\\') {
        bytes.push(0x5c);
        i++;
      } else if (next === '"') {
        bytes.push(0x22);
        i++;
      } else {
        bytes.push(inner.charCodeAt(i + 1));
        i++;
      }
    } else {
      bytes.push(inner.charCodeAt(i));
    }
  }

  return Buffer.from(bytes).toString('utf8');
}

function extractPatchTouchedPaths(patchContent) {
  if (typeof patchContent !== 'string' || !patchContent.trim()) {
    throw new PatchGateError('EMPTY_PATCH', 'Patch content must be a non-empty string');
  }

  const lines = patchContent.split(/\r?\n/);
  const diffSections = [];
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git ')) {
      if (currentSection) {
        diffSections.push(currentSection);
      }
      currentSection = {
        diffLine: line,
        paths: []
      };
      const rest = line.substring(11).trim();
      const parts = parseGitDiffHeaderPaths(rest);
      if (!parts || !parts.aPath || !parts.bPath) {
        throw new PatchGateError('MALFORMED_DIFF_HEADER', `Malformed diff --git line: ${line}`, { line });
      }
      if (parts.aPath !== '/dev/null') currentSection.paths.push(parts.aPath);
      if (parts.bPath !== '/dev/null') currentSection.paths.push(parts.bPath);
      continue;
    }

    if (!currentSection) continue;

    if (line.startsWith('--- ')) {
      const p = cleanHeaderPath(line.substring(4).trim(), 'a/');
      if (p && p !== '/dev/null') currentSection.paths.push(p);
      continue;
    }

    if (line.startsWith('+++ ')) {
      const p = cleanHeaderPath(line.substring(4).trim(), 'b/');
      if (p && p !== '/dev/null') currentSection.paths.push(p);
      continue;
    }

    if (line.startsWith('rename from ')) {
      const p = cleanHeaderPath(line.substring(12).trim());
      if (p) currentSection.paths.push(p);
      continue;
    }

    if (line.startsWith('rename to ')) {
      const p = cleanHeaderPath(line.substring(10).trim());
      if (p) currentSection.paths.push(p);
      continue;
    }

    if (line.startsWith('copy from ')) {
      const p = cleanHeaderPath(line.substring(10).trim());
      if (p) currentSection.paths.push(p);
      continue;
    }

    if (line.startsWith('copy to ')) {
      const p = cleanHeaderPath(line.substring(8).trim());
      if (p) currentSection.paths.push(p);
      continue;
    }
  }

  if (currentSection) {
    diffSections.push(currentSection);
  }

  if (diffSections.length === 0) {
    throw new PatchGateError('MALFORMED_PATCH', 'No diff --git sections found in patch');
  }

  const seenSectionPaths = new Set();
  const allTouchedPaths = [];

  for (const sec of diffSections) {
    if (sec.paths.length === 0) {
      throw new PatchGateError('MALFORMED_DIFF_HEADER', `Diff section has no paths: ${sec.diffLine}`);
    }

    const secNormPaths = sec.paths.map(p => normalizeSafePath(p));

    for (const norm of secNormPaths) {
      if (seenSectionPaths.has(norm)) {
        throw new PatchGateError('DUPLICATE_DIFF_SECTION', `Repeated diff section or colliding path in patch: ${norm}`, { path: norm });
      }
    }

    secNormPaths.forEach(p => seenSectionPaths.add(p));
    secNormPaths.forEach(p => {
      if (!allTouchedPaths.includes(p)) allTouchedPaths.push(p);
    });
  }

  return allTouchedPaths;
}

function parseGitDiffHeaderPaths(rest) {
  let aRaw = '';
  let bRaw = '';

  if (rest.startsWith('"')) {
    let endQuote = -1;
    let escaped = false;
    for (let i = 1; i < rest.length; i++) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (rest[i] === '\\') {
        escaped = true;
        continue;
      }
      if (rest[i] === '"') {
        endQuote = i;
        break;
      }
    }
    if (endQuote === -1) return null;
    aRaw = unescapeGitCQuotedPath(rest.substring(0, endQuote + 1));
    const remainder = rest.substring(endQuote + 1).trim();

    if (remainder.startsWith('"')) {
      bRaw = unescapeGitCQuotedPath(remainder);
    } else {
      bRaw = remainder;
    }
  } else {
    const spaceB = rest.indexOf(' b/');
    const spaceQuote = rest.indexOf(' "b/');
    if (spaceQuote !== -1 && (spaceB === -1 || spaceQuote < spaceB)) {
      aRaw = rest.substring(0, spaceQuote);
      bRaw = unescapeGitCQuotedPath(rest.substring(spaceQuote + 1).trim());
    } else if (spaceB !== -1) {
      aRaw = rest.substring(0, spaceB);
      bRaw = rest.substring(spaceB + 3);
    } else {
      const parts = rest.split(' ');
      if (parts.length >= 2) {
        aRaw = parts[0];
        bRaw = parts[1];
      } else {
        return null;
      }
    }
  }

  if (aRaw.startsWith('a/')) aRaw = aRaw.substring(2);
  if (bRaw.startsWith('b/')) bRaw = bRaw.substring(2);

  return { aPath: aRaw, bPath: bRaw };
}

function cleanHeaderPath(p, prefix = '') {
  let cleaned = p.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = unescapeGitCQuotedPath(cleaned);
  }
  if (prefix && cleaned.startsWith(prefix)) {
    cleaned = cleaned.substring(prefix.length);
  }
  return cleaned;
}

function verify_base(repoDir, expectedBaseSha, patchBaseSha) {
  if (!expectedBaseSha || typeof expectedBaseSha !== 'string') {
    throw new PatchGateError('BASE_SHA_REQUIRED', 'expectedBaseSha is required');
  }
  let currentHeadSha = '';
  try {
    const res = cp.spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: false
    });
    if (res.status !== 0) {
      throw new Error(res.stderr || 'git rev-parse failed');
    }
    currentHeadSha = res.stdout.trim();
  } catch (err) {
    throw new PatchGateError('GIT_ERROR', 'Failed to retrieve git HEAD SHA', { error: err.message });
  }

  const patchSha = patchBaseSha || expectedBaseSha;

  if (expectedBaseSha !== currentHeadSha) {
    throw new PatchGateError('BASE_SHA_MISMATCH', `Repository HEAD (${currentHeadSha}) does not match expectedBaseSha (${expectedBaseSha})`, {
      expectedBaseSha,
      currentHeadSha
    });
  }

  if (patchSha !== currentHeadSha) {
    throw new PatchGateError('PATCH_BASE_MISMATCH', `Patch base (${patchSha}) does not match repository HEAD (${currentHeadSha})`, {
      patchBaseSha: patchSha,
      currentHeadSha
    });
  }

  return { currentHeadSha, matched: true };
}

function recordPreApplyState(repoDir, touchedPaths) {
  const preApply = {};
  for (const rel of touchedPaths) {
    const norm = normalizeSafePath(rel);
    const { fullPath } = verifyFilesystemContainment(repoDir, norm);

    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      const st = fs.statSync(fullPath);
      preApply[norm] = {
        exists: true,
        hash,
        byteCount: buf.length,
        originalContentBase64: buf.toString('base64'),
        mode: st.mode,
        isTracked: checkIsTracked(repoDir, norm),
        isDirty: checkIsDirty(repoDir, norm)
      };
    } else {
      preApply[norm] = {
        exists: false,
        hash: null,
        byteCount: 0,
        originalContentBase64: null,
        mode: null,
        isTracked: false,
        isDirty: false
      };
    }
  }
  return preApply;
}

function checkIsTracked(repoDir, normRel) {
  try {
    const res = cp.spawnSync('git', ['ls-files', '--error-unmatch', '--', normRel], {
      cwd: repoDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: false
    });
    return res.status === 0 && res.stdout.trim().length > 0;
  } catch (e) {
    return false;
  }
}

function checkIsDirty(repoDir, normRel) {
  try {
    const res = cp.spawnSync('git', ['status', '--porcelain', '--', normRel], {
      cwd: repoDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: false
    });
    return res.status === 0 && res.stdout.trim().length > 0;
  } catch (e) {
    return false;
  }
}

function apply_patch_with_provenance({ repoDir, patchContent, taskId, expectedBaseSha, patchBaseSha }) {
  return _internalApplyPatch({
    repoDir,
    patchContent,
    taskId,
    expectedBaseSha,
    patchBaseSha,
    isCoordinatorCall: false
  });
}

// P0-01: Public coordinator privilege bypass excised from public API.

function _internalApplyPatch({ repoDir, patchContent, taskId, expectedBaseSha, patchBaseSha, isCoordinatorCall }) {
  const baseCheck = verify_base(repoDir, expectedBaseSha, patchBaseSha);
  const touchedPaths = extractPatchTouchedPaths(patchContent);

  enforceAuthoritativeTaskOwnership({
    repoRoot: repoDir,
    taskId,
    touchedPaths,
    isCoordinatorCall
  });

  const preApply = recordPreApplyState(repoDir, touchedPaths);

  for (const rel of touchedPaths) {
    verifyFilesystemContainment(repoDir, rel);
  }

  const applyRes = cp.spawnSync('git', ['apply', '--whitespace=nowarn', '-'], {
    cwd: repoDir,
    input: patchContent,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false
  });

  if (applyRes.status !== 0) {
    throw new PatchGateError('GIT_APPLY_FAILED', `git apply failed: ${applyRes.stderr ? applyRes.stderr.toString('utf8') : 'unknown error'}`, {
      stdout: applyRes.stdout ? applyRes.stdout.toString('utf8') : '',
      stderr: applyRes.stderr ? applyRes.stderr.toString('utf8') : ''
    });
  }

  const postApply = {};
  for (const rel of touchedPaths) {
    const norm = normalizeSafePath(rel);
    const { fullPath } = verifyFilesystemContainment(repoDir, norm);
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      const st = fs.statSync(fullPath);
      postApply[norm] = {
        exists: true,
        hash,
        byteCount: buf.length,
        mode: st.mode
      };
    } else {
      postApply[norm] = {
        exists: false,
        hash: null,
        byteCount: 0,
        mode: null
      };
    }
  }

  const provenance = {
    taskId,
    touchedPaths,
    preApply,
    postApply,
    appliedBaseSha: baseCheck.currentHeadSha,
    patchSha256: crypto.createHash('sha256').update(patchContent).digest('hex')
  };

  return {
    success: true,
    appliedBaseSha: baseCheck.currentHeadSha,
    taskId,
    touchedPaths,
    preApply,
    postApply,
    patchSha256: provenance.patchSha256,
    provenance
  };
}

function pathSafeRollback({ repoDir, provenance, taskId }) {
  if (provenance && provenance.provenance && typeof provenance.provenance === 'object') {
    provenance = provenance.provenance;
  }
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

  const seenPaths = new Set();
  for (const p of provenance.touchedPaths) {
    const norm = normalizeSafePath(p);
    if (seenPaths.has(norm)) {
      throw new PatchGateError('DUPLICATE_TOUCHED_PATH', `Duplicate touched path in rollback request: ${norm}`, { path: norm });
    }
    seenPaths.add(norm);
  }

  const { taskMap, manifestMap } = loadAuthoritativeRegisters(repoDir);

  // P0-01 SECURITY BOUNDARY:
  // Public rollback NEVER authorizes restoration of coordinator-exclusive files or coordinator tasks.
  for (const p of provenance.touchedPaths) {
    const norm = normalizeSafePath(p);
    const manifestEntry = manifestMap.get(norm);
    if (manifestEntry) {
      const mutTier = manifestEntry.mutability_tier || manifestEntry.Mutability_Tier;
      if (mutTier === 'COORDINATOR_INTEGRATION_EXCLUSIVE') {
        throw new PatchGateError('COORDINATOR_PRIVILEGE_ESCALATION', `Public rollback rejected: path ${norm} is coordinator-exclusive. Coordinator rollback is unsupported via public API.`, {
          path: norm,
          effectiveTaskId
        });
      }
    }
  }

  const taskRec = taskMap.get(effectiveTaskId);
  const isCoordinator = taskRec && ((taskRec['Accountable Owner'] || '').toLowerCase().includes('coordinator') || effectiveTaskId === 'INT-1');
  if (isCoordinator) {
    throw new PatchGateError('COORDINATOR_ROLLBACK_PROHIBITED', `Public rollback cannot be invoked for coordinator task ${effectiveTaskId}. Coordinator-only rollback is unsupported.`, {
      effectiveTaskId
    });
  }

  enforceAuthoritativeTaskOwnership({
    repoRoot: repoDir,
    taskId: effectiveTaskId,
    touchedPaths: provenance.touchedPaths,
    isCoordinatorCall: false
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

    if (pre.exists) {
      if (!pre.hash) {
        throw new PatchGateError('INVALID_PRE_STATE', `Pre-state hash missing for ${normRel}`, { rel: normRel });
      }
      if (typeof pre.originalContentBase64 !== 'string' && typeof pre.originalContent !== 'string') {
        throw new PatchGateError('NULL_BUFFER_RESTORE', `Pre-state indicates file existed but restore payload is null/missing for ${normRel}`, { rel: normRel });
      }
      if (pre.mode !== undefined && pre.mode !== null && typeof pre.mode !== 'number') {
        throw new PatchGateError('INVALID_MODE_METADATA', `Pre-state mode metadata invalid for ${normRel}`, { rel: normRel });
      }

      let payloadBuf = null;
      if (typeof pre.originalContentBase64 === 'string') {
        payloadBuf = Buffer.from(pre.originalContentBase64, 'base64');
      } else {
        payloadBuf = Buffer.from(pre.originalContent, 'utf8');
      }
      const payloadHash = crypto.createHash('sha256').update(payloadBuf).digest('hex');
      if (payloadHash !== pre.hash) {
        throw new PatchGateError('RESTORE_PAYLOAD_CORRUPT', `Preflight restore payload hash mismatch for ${normRel}: expected ${pre.hash}, got ${payloadHash}`, {
          rel: normRel,
          expected: pre.hash,
          actual: payloadHash
        });
      }
      if (pre.byteCount !== undefined && pre.byteCount !== null && payloadBuf.length !== pre.byteCount) {
        throw new PatchGateError('RESTORE_BYTE_COUNT_MISMATCH', `Preflight restore payload byte count mismatch for ${normRel}: expected ${pre.byteCount}, got ${payloadBuf.length}`, {
          rel: normRel,
          expected: pre.byteCount,
          actual: payloadBuf.length
        });
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

      // Check file permission mask match if postApply mode specified
      if (post.mode !== undefined && post.mode !== null && ((st.mode & 0o777) !== (post.mode & 0o777))) {
        throw new PatchGateError('CURRENT_MODE_MISMATCH', `File ${normRel} mode modified post-apply; expected ${(post.mode & 0o777).toString(8)}, got ${(st.mode & 0o777).toString(8)}`, {
          rel: normRel,
          expectedMode: post.mode,
          currentMode: st.mode
        });
      }
    } else {
      if (post.exists) {
        throw new PatchGateError('POST_APPLY_MISSING', `File ${normRel} existed after patch application but is now missing`, { rel: normRel });
      }
    }
  }

  // PHASE B: Guarded restoration with atomic safe writes
  const restoredPaths = [];
  const recoveryInventory = [];

  try {
    for (const rel of provenance.touchedPaths) {
      const normRel = normalizeSafePath(rel);
      const { fullPath } = verifyFilesystemContainment(repoDir, normRel);
      const pre = provenance.preApply[normRel];
      const post = provenance.postApply[normRel];

      // Phase B per-target immediate revalidation before mutation (P0-02)
      verifyFilesystemContainment(repoDir, normRel);
      const existsNow = fs.existsSync(fullPath);
      if (existsNow) {
        const st = fs.lstatSync(fullPath);
        if (st.isDirectory()) {
          throw new PatchGateError('DIRECTORY_TARGET_NOT_ALLOWED', `Phase B: Target path is a directory: ${normRel}`, { rel: normRel });
        }
        if (st.isSymbolicLink()) {
          throw new PatchGateError('SYMLINK_TARGET', `Phase B: Target path is a symlink: ${normRel}`, { rel: normRel });
        }
        if (!post.exists) {
          throw new PatchGateError('STATE_MUTATION_RACE', `Phase B: File ${normRel} was created between preflight and Phase B restoration`, { rel: normRel });
        }
        const curBuf = fs.readFileSync(fullPath);
        const curHash = crypto.createHash('sha256').update(curBuf).digest('hex');
        if (curHash !== post.hash) {
          throw new PatchGateError('STATE_MUTATION_RACE', `File ${normRel} changed between preflight and Phase B restoration`, { rel: normRel });
        }
        if (post.mode !== undefined && post.mode !== null && ((st.mode & 0o777) !== (post.mode & 0o777))) {
          throw new PatchGateError('STATE_MUTATION_RACE', `File ${normRel} mode changed between preflight and Phase B restoration`, { rel: normRel });
        }
      } else {
        if (post.exists) {
          throw new PatchGateError('STATE_MUTATION_RACE', `Phase B: File ${normRel} was deleted between preflight and Phase B restoration`, { rel: normRel });
        }
      }

      if (pre.exists) {
        const parentDir = path.dirname(fullPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        let restoreBuf = null;
        if (typeof pre.originalContentBase64 === 'string') {
          restoreBuf = Buffer.from(pre.originalContentBase64, 'base64');
        } else if (typeof pre.originalContent === 'string') {
          restoreBuf = Buffer.from(pre.originalContent, 'utf8');
        } else {
          throw new PatchGateError('NULL_BUFFER_RESTORE', `Attempted to restore invalid/null content for ${normRel}`);
        }

        const bufHash = crypto.createHash('sha256').update(restoreBuf).digest('hex');
        if (bufHash !== pre.hash) {
          throw new PatchGateError('RESTORE_PAYLOAD_CORRUPT', `Restore payload hash mismatch for ${normRel}: expected ${pre.hash}, got ${bufHash}`, {
            expected: pre.hash,
            actual: bufHash
          });
        }

        const tmpFile = `${fullPath}.w0410tmp.${crypto.randomBytes(4).toString('hex')}`;
        fs.writeFileSync(tmpFile, restoreBuf);
        if (typeof pre.mode === 'number') {
          try { fs.chmodSync(tmpFile, pre.mode & 0o777); } catch (e) {
            throw new PatchGateError('CHMOD_FAILED', `Failed to restore file mode on ${normRel}: ${e.message}`, { rel: normRel, error: e.message });
          }
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
        if (currentBuf.length !== restoreBuf.length) {
          throw new PatchGateError('RESTORE_LENGTH_FAILED', `Restored byte length mismatch for ${normRel}`, {
            expected: restoreBuf.length,
            actual: currentBuf.length
          });
        }

        restoredPaths.push(normRel);
        recoveryInventory.push({
          path: normRel,
          action: 'RESTORED_TO_PRE_APPLY',
          preHash: pre.hash,
          restoredHash
        });
      } else {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          restoredPaths.push(normRel);
          recoveryInventory.push({
            path: normRel,
            action: 'DELETED_POST_APPLY_FILE',
            preHash: null,
            restoredHash: null
          });
        }
      }
    }
  } catch (err) {
    if (err instanceof PatchGateError && (err.code === 'RESTORE_PAYLOAD_CORRUPT' || err.code === 'RESTORE_VERIFICATION_FAILED' || err.code === 'RESTORE_LENGTH_FAILED')) {
      throw err;
    }
    throw new PatchGateError('PARTIAL_RESTORE_ERROR', `Error during restoration phase: ${err.message}`, {
      partiallyRestoredPaths: restoredPaths,
      allTouchedPaths: provenance.touchedPaths,
      recoveryInventory,
      recoveryInstructions: 'Inspect partiallyRestoredPaths vs allTouchedPaths and manually restore from repository commit'
    });
  }

  return {
    success: true,
    rolledBackPaths: provenance.touchedPaths,
    recoveryInventory
  };
}

module.exports = {
  PatchGateError,
  loadAuthoritativeRegisters,
  normalizeSafePath,
  verifyFilesystemContainment,
  verify_base,
  validateTaskDependencies,
  enforceAuthoritativeTaskOwnership,
  unescapeGitCQuotedPath,
  extractPatchTouchedPaths,
  recordPreApplyState,
  checkIsTracked,
  checkIsDirty,
  apply_patch_with_provenance,
  pathSafeRollback
};
