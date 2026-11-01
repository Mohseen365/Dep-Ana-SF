/**
 * validate-wave0-4-4-dispatch.cjs
 * Wave 0.4.4 Authoritative Cross-Document Semantic Consistency Validator.
 * Enforces deep semantic invariants across tasks, manifest, contracts, API provenance,
 * Wave 7/8 semantics, and empirical Wave 0.4.4 patch execution evidence.
 */

const fs = require('fs');
const path = require('path');
const parserPath = fs.existsSync(path.resolve(__dirname, 'docs/wave-0/4.3/strict-rfc4180-csv-parser.cjs'))
  ? path.resolve(__dirname, 'docs/wave-0/4.3/strict-rfc4180-csv-parser.cjs')
  : path.resolve(__dirname, '../4.3/strict-rfc4180-csv-parser.cjs');
const { parseStrictCSVToObjects } = require(parserPath);

const repoRoot = fs.existsSync(path.resolve(__dirname, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'))
  ? path.resolve(__dirname)
  : path.resolve(__dirname, '../../..');

const assertionCounts = {
  staticSchema: { passed: 0, failed: 0, skipped: 0, unverified: 0, warning: 0 },
  crossDocumentConsistency: { passed: 0, failed: 0, skipped: 0, unverified: 0, warning: 0 },
  filesystem: { passed: 0, failed: 0, skipped: 0, unverified: 0, warning: 0 },
  semanticReview: { passed: 0, failed: 0, skipped: 0, unverified: 0, warning: 0 },
  empiricalExecution: { passed: 0, failed: 0, skipped: 0, unverified: 0, warning: 0 }
};

const findings = [];
const recordedAssertions = [];
let findingSequence = 1;

function resetValidatorState() {
  for (const cat in assertionCounts) {
    assertionCounts[cat].passed = 0;
    assertionCounts[cat].failed = 0;
    assertionCounts[cat].skipped = 0;
    assertionCounts[cat].unverified = 0;
    assertionCounts[cat].warning = 0;
  }
  findings.length = 0;
  recordedAssertions.length = 0;
  findingSequence = 1;
}

function recordFinding({ severity, category, sourceDoc, sourceSection, relatedEntity, expected, actual, status, remediation, findingId }) {
  const fid = findingId || `FIND-W044-${String(findingSequence++).padStart(4, '0')}`;
  findings.push({
    id: fid,
    severity,
    category,
    sourceDoc,
    sourceSection,
    relatedEntity,
    expected,
    actual,
    status,
    remediation
  });
  return fid;
}

function assert(condition, assertionId, description, category = 'crossDocumentConsistency', metadata = {}) {
  const result = {
    id: assertionId,
    description,
    category,
    status: condition ? 'PASS' : 'FAIL',
    metadata
  };

  if (condition) {
    assertionCounts[category].passed++;
  } else {
    assertionCounts[category].failed++;
    recordFinding({
      findingId: assertionId,
      severity: metadata.severity || 'HIGH',
      category,
      sourceDoc: metadata.sourceDoc || 'N/A',
      sourceSection: metadata.sourceSection || 'N/A',
      relatedEntity: metadata.relatedEntity || assertionId,
      expected: metadata.expected || 'Condition must evaluate to true',
      actual: metadata.actual || 'Condition failed',
      status: 'OPEN',
      remediation: metadata.remediation || 'Correct the document or schema contradiction'
    });
  }

  recordedAssertions.push(result);
  return condition;
}

function assertUnverified(assertionId, description, category, reason, metadata = {}) {
  assertionCounts[category].unverified++;
  recordFinding({
    findingId: assertionId,
    severity: 'UNVERIFIED',
    category,
    sourceDoc: metadata.sourceDoc || 'N/A',
    sourceSection: metadata.sourceSection || 'N/A',
    relatedEntity: metadata.relatedEntity || assertionId,
    expected: metadata.expected || 'Full platform verification',
    actual: `Unverified offline: ${reason}`,
    status: 'OPEN',
    remediation: metadata.remediation || 'Requires live Salesforce org or runtime verification'
  });
  recordedAssertions.push({
    id: assertionId,
    description,
    category,
    status: 'UNVERIFIED',
    metadata
  });
}

function runValidation(options = {}) {
  resetValidatorState();

  const targetDir = options.targetDir || repoRoot;
  const isSelfTest = options.isSelfTest || false;

  // 1. Filesystem existence checks
  const manifestPath = path.resolve(targetDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
  const taskPath = path.resolve(targetDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
  const tracePath = path.resolve(targetDir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv');

  assert(fs.existsSync(manifestPath), 'FS-01', 'Authoritative Manifest CSV exists', 'filesystem', { sourceDoc: manifestPath });
  assert(fs.existsSync(taskPath), 'FS-02', 'Authoritative Task CSV exists', 'filesystem', { sourceDoc: taskPath });
  assert(fs.existsSync(tracePath), 'FS-03', 'Authoritative Contract Traceability CSV exists', 'filesystem', { sourceDoc: tracePath });

  let manifestRecords = [];
  let taskRecords = [];
  let traceRecords = [];

  try {
    if (fs.existsSync(manifestPath)) {
      manifestRecords = parseStrictCSVToObjects(fs.readFileSync(manifestPath, 'utf8'));
    }
  } catch (err) {
    assert(false, 'CSV-01', `Manifest CSV parse failure: ${err.message}`, 'staticSchema', { actual: err.message });
  }

  try {
    if (fs.existsSync(taskPath)) {
      taskRecords = parseStrictCSVToObjects(fs.readFileSync(taskPath, 'utf8'));
    }
  } catch (err) {
    assert(false, 'CSV-02', `Task Register CSV parse failure: ${err.message}`, 'staticSchema', { actual: err.message });
  }

  try {
    if (fs.existsSync(tracePath)) {
      traceRecords = parseStrictCSVToObjects(fs.readFileSync(tracePath, 'utf8'));
    }
  } catch (err) {
    assert(false, 'CSV-03', `Traceability CSV parse failure: ${err.message}`, 'staticSchema', { actual: err.message });
  }

  // =========================================================================
  // WORKSTREAM C1: TASK REGISTER VALIDATION
  // =========================================================================
  const expectedTaskIds = [
    'W5-1', 'W5-2', 'W5-3', 'W5-4', 'W5-5', 'W5-6',
    'W6-1', 'W6-2', 'W6-3', 'W6-4',
    'W7-P1', 'W7-1', 'W7-2', 'W7-3',
    'W8-1', 'W8-2', 'W8-3',
    'W9-1', 'W9-2', 'W9-3',
    'INT-1'
  ];

  // Exact task count
  assert(taskRecords.length === 21, 'TASK-01', `Task register contains exactly 21 tasks (found ${taskRecords.length})`, 'staticSchema', {
    expected: '21',
    actual: String(taskRecords.length)
  });

  // Duplicate detection without using Set to mask duplicates
  const rawTaskIds = taskRecords.map(r => (r['Task ID'] || '').trim());
  const seenTaskIds = {};
  let duplicateTaskIdFound = false;
  let dupId = '';
  for (const tid of rawTaskIds) {
    if (!tid) {
      assert(false, 'TASK-NONEMPTY', 'Task ID row must not be empty', 'staticSchema');
      continue;
    }
    if (seenTaskIds[tid]) {
      duplicateTaskIdFound = true;
      dupId = tid;
      break;
    }
    seenTaskIds[tid] = true;
  }
  assert(!duplicateTaskIdFound, 'TASK-02', `Task register contains zero duplicate Task IDs (duplicate found: ${dupId})`, 'staticSchema', {
    expected: 'Zero duplicates',
    actual: duplicateTaskIdFound ? `Duplicate ${dupId}` : 'Zero duplicates'
  });

  // Exact membership
  for (const eid of expectedTaskIds) {
    assert(seenTaskIds[eid] === true, `TASK-EXISTS-${eid}`, `Canonical task ${eid} is present in task register`, 'crossDocumentConsistency', {
      expected: eid,
      actual: seenTaskIds[eid] ? 'PRESENT' : 'MISSING'
    });
  }
  for (const aid of rawTaskIds) {
    if (aid) {
      assert(expectedTaskIds.includes(aid), `TASK-CANONICAL-${aid}`, `Task ID ${aid} belongs to expected canonical task set`, 'crossDocumentConsistency', {
        expected: 'Canonical ID',
        actual: aid
      });
    }
  }

  // Dependency graph, self-dependencies, acyclicity, and exact Wave 5 serialization
  const depGraph = new Map();
  const taskMap = new Map();
  for (const t of taskRecords) {
    const tid = (t['Task ID'] || '').trim();
    taskMap.set(tid, t);
    const depsRaw = (t['Dependencies'] || '').trim();
    if (depsRaw && depsRaw !== 'None') {
      // INT-1 has descriptive dependency 'Waves 5, 6, 7, 8, 9' representing completion of all waves
      if (tid === 'INT-1') {
        depGraph.set(tid, ['W5-6', 'W6-4', 'W7-3', 'W8-3', 'W9-3']);
      } else {
        const deps = depsRaw.split(',').map(d => d.trim()).filter(Boolean);
        depGraph.set(tid, deps);
        for (const dep of deps) {
          assert(taskMap.has(dep) || expectedTaskIds.includes(dep), `DEP-EXISTS-${tid}->${dep}`, `Task ${tid} dependency ${dep} exists in canonical set`, 'crossDocumentConsistency', {
            expected: 'Existing canonical task',
            actual: dep
          });
          assert(dep !== tid, `DEP-NO-SELF-${tid}`, `Task ${tid} must not depend on itself`, 'crossDocumentConsistency', {
            expected: `dep != ${tid}`,
            actual: dep
          });
        }
      }
    } else {
      depGraph.set(tid, []);
    }
  }

  // Detect cycles via DFS
  let hasCycle = false;
  let cyclePath = [];
  const visited = new Set();
  const recStack = new Set();
  function checkCycle(node, currentPath) {
    visited.add(node);
    recStack.add(node);
    const neighbors = depGraph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (checkCycle(neighbor, [...currentPath, neighbor])) return true;
      } else if (recStack.has(neighbor)) {
        hasCycle = true;
        cyclePath = [...currentPath, neighbor];
        return true;
      }
    }
    recStack.delete(node);
    return false;
  }
  for (const tid of expectedTaskIds) {
    if (!visited.has(tid)) {
      if (checkCycle(tid, [tid])) break;
    }
  }
  assert(!hasCycle, 'DEP-NO-CYCLES', `Dependency graph has zero cycles (cycle: ${cyclePath.join(' -> ')})`, 'crossDocumentConsistency');

  // Exact Wave 5 strict serialization
  assert((depGraph.get('W5-2') || []).includes('W5-1'), 'W5-CHAIN-2', 'W5-2 depends on W5-1', 'crossDocumentConsistency');
  assert((depGraph.get('W5-3') || []).includes('W5-2'), 'W5-CHAIN-3', 'W5-3 depends on W5-2', 'crossDocumentConsistency');
  assert((depGraph.get('W5-4') || []).includes('W5-3'), 'W5-CHAIN-4', 'W5-4 depends on W5-3', 'crossDocumentConsistency');
  assert((depGraph.get('W5-5') || []).includes('W5-4'), 'W5-CHAIN-5', 'W5-5 depends on W5-4', 'crossDocumentConsistency');
  assert((depGraph.get('W5-6') || []).includes('W5-5'), 'W5-CHAIN-6', 'W5-6 depends on W5-5', 'crossDocumentConsistency');

  // =========================================================================
  // WORKSTREAM C2: TASK PATHS AND MANIFEST VALIDATION
  // =========================================================================
  assert(manifestRecords.length === 175, 'MAN-01', `Ownership manifest contains exactly 175 entries (found ${manifestRecords.length})`, 'staticSchema', {
    expected: '175',
    actual: String(manifestRecords.length)
  });

  const existingPaths = manifestRecords.filter(r => (r['status'] || '').trim().toUpperCase() === 'EXISTING');
  const newPaths = manifestRecords.filter(r => (r['status'] || '').trim().toUpperCase() === 'NEW');

  assert(existingPaths.length === 99, 'MAN-02', `Manifest specifies exactly 99 EXISTING paths (found ${existingPaths.length})`, 'staticSchema', {
    expected: '99',
    actual: String(existingPaths.length)
  });
  assert(newPaths.length === 76, 'MAN-03', `Manifest specifies exactly 76 NEW paths (found ${newPaths.length})`, 'staticSchema', {
    expected: '76',
    actual: String(newPaths.length)
  });

  const seenRawPaths = {};
  const seenNormPaths = {};
  let dupRawPath = '';
  let dupNormPath = '';

  for (let idx = 0; idx < manifestRecords.length; idx++) {
    const row = manifestRecords[idx];
    const rawPath = row['path'] || '';

    // Non-empty check
    assert(rawPath && rawPath.trim().length > 0, `PATH-EMPTY-${idx}`, `Manifest row ${idx + 1} path is non-empty`, 'staticSchema');
    if (!rawPath || !rawPath.trim()) continue;

    // Duplicate check on raw path
    if (seenRawPaths[rawPath]) {
      dupRawPath = rawPath;
    }
    seenRawPaths[rawPath] = true;

    // Syntactic path checks
    const hasBackslash = rawPath.includes('\\');
    const isAbsolute = rawPath.startsWith('/') || /^[a-zA-Z]:/.test(rawPath);
    const hasDotSegment = rawPath.startsWith('./') || rawPath.includes('/./') || rawPath === '.';
    const hasTraversal = rawPath.includes('..');
    const isDir = rawPath.endsWith('/');

    assert(!hasBackslash, `PATH-NO-BS-${idx}`, `Manifest path '${rawPath}' contains no backslashes`, 'staticSchema');
    assert(!isAbsolute, `PATH-NO-ABS-${idx}`, `Manifest path '${rawPath}' is not absolute`, 'staticSchema');
    assert(!hasDotSegment, `PATH-NO-DOT-${idx}`, `Manifest path '${rawPath}' has no dot segments`, 'staticSchema');
    assert(!hasTraversal, `PATH-NO-TRAV-${idx}`, `Manifest path '${rawPath}' contains no traversal`, 'staticSchema');
    assert(!isDir, `PATH-NO-DIR-${idx}`, `Manifest path '${rawPath}' is a regular file target, not directory`, 'staticSchema');

    const norm = path.posix.normalize(rawPath);
    if (seenNormPaths[norm]) {
      dupNormPath = norm;
    }
    seenNormPaths[norm] = true;
  }

  assert(!dupRawPath, 'MAN-NO-DUP-RAW', `No duplicate raw manifest paths (duplicate: ${dupRawPath})`, 'staticSchema');
  assert(!dupNormPath, 'MAN-NO-DUP-NORM', `No duplicate normalized manifest paths (duplicate: ${dupNormPath})`, 'staticSchema');

  // Verify all 99 existing files physically exist on disk (when targetDir has the actual tree)
  if (!isSelfTest) {
    let existingOnDiskCount = 0;
    for (const ep of existingPaths) {
      const fullP = path.resolve(targetDir, ep['path']);
      if (fs.existsSync(fullP)) {
        existingOnDiskCount++;
      } else {
        assert(false, `PATH-EXISTS-${ep['path']}`, `Existing manifest path not found on disk: ${ep['path']}`, 'filesystem');
      }
    }
    assert(existingOnDiskCount === 99, 'MAN-DISK-99', `All 99 EXISTING manifest files exist on disk`, 'filesystem');
  }

  // Frozen paths and coordinator-exclusive paths validation
  const frozenPaths = new Set(manifestRecords.filter(r => (r['mutability_tier'] || '').includes('FROZEN')).map(r => r['path']));
  const coordinatorPaths = new Set(manifestRecords.filter(r => (r['workstream_or_task'] || '').toUpperCase().includes('INT-1') || (r['current_owner'] || '').includes('Coordinator')).map(r => r['path']));

  for (const t of taskRecords) {
    const tid = (t['Task ID'] || '').trim();
    const affectedRaw = t['Exact Affected Files'] || '';
    const affected = affectedRaw.split(';').map(p => p.trim()).filter(Boolean);

    for (const fp of affected) {
      assert(seenNormPaths[fp] === true, `TASK-PATH-IN-MAN-${tid}-${fp}`, `Task ${tid} file '${fp}' exists in manifest`, 'crossDocumentConsistency');
      if (tid !== 'INT-1') {
        assert(!frozenPaths.has(fp), `FROZEN-PROT-${tid}-${fp}`, `Feature task ${tid} does not modify frozen path: ${fp}`, 'crossDocumentConsistency');
        assert(!coordinatorPaths.has(fp), `COORD-PROT-${tid}-${fp}`, `Feature task ${tid} does not modify coordinator path: ${fp}`, 'crossDocumentConsistency');
      }
    }
  }

  // =========================================================================
  // WORKSTREAM C3: TRACEABILITY MATRIX VALIDATION (W0-C1 to W0-C9)
  // =========================================================================
  const expectedContracts = ['W0-C1', 'W0-C2', 'W0-C3', 'W0-C4', 'W0-C5', 'W0-C6', 'W0-C7', 'W0-C8', 'W0-C9'];
  assert(traceRecords.length === 9, 'TRACE-01', `Traceability matrix contains exactly 9 contracts (found ${traceRecords.length})`, 'staticSchema');

  const rawContractIds = traceRecords.map(r => (r['Contract ID'] || '').trim());
  const seenContractIds = {};
  let dupContractId = '';
  for (const cid of rawContractIds) {
    if (seenContractIds[cid]) dupContractId = cid;
    seenContractIds[cid] = true;
  }
  assert(!dupContractId, 'TRACE-02', `Zero duplicate Contract IDs in traceability register (duplicate: ${dupContractId})`, 'staticSchema');

  for (const cid of expectedContracts) {
    assert(seenContractIds[cid] === true, `TRACE-EXISTS-${cid}`, `Contract ${cid} is present in traceability matrix`, 'crossDocumentConsistency');
  }

  for (const c of traceRecords) {
    const cid = (c['Contract ID'] || '').trim();
    assert(cid.startsWith('W0-C'), `TRACE-PREFIX-${cid}`, `Contract ${cid} has valid W0-C prefix`, 'staticSchema');
    assert(c['Exact Contract Definition'] && c['Exact Contract Definition'].trim().length > 0, `TRACE-DEF-${cid}`, `Contract ${cid} has non-empty definition`, 'semanticReview');
    assert(c['Final Status'] && c['Final Status'].startsWith('FROZEN'), `TRACE-FROZEN-${cid}`, `Contract ${cid} is FROZEN`, 'crossDocumentConsistency');
    assert(c['Outstanding Decisions'] && c['Outstanding Decisions'].startsWith('NONE'), `TRACE-DECISION-${cid}`, `Contract ${cid} has zero outstanding decisions`, 'crossDocumentConsistency');
    assert(c['Producer Tasks'] && c['Producer Tasks'].trim().length > 0, `TRACE-PROD-${cid}`, `Contract ${cid} has declared producer tasks`, 'crossDocumentConsistency');
    assert(c['Consumer Tasks'] && c['Consumer Tasks'].trim().length > 0, `TRACE-CONS-${cid}`, `Contract ${cid} has declared consumer tasks`, 'crossDocumentConsistency');
  }

  // =========================================================================
  // WORKSTREAM C4: COMPONENT API PROVENANCE
  // =========================================================================
  const appShellPath = path.resolve(targetDir, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js');
  if (!isSelfTest) {
    assert(fs.existsSync(appShellPath), 'API-APPSHELL-FILE', 'daAppShell.js exists on disk', 'filesystem');
    if (fs.existsSync(appShellPath)) {
      const shellSrc = fs.readFileSync(appShellPath, 'utf8');
      const crypto = require('crypto');
      const shellSha = crypto.createHash('sha256').update(shellSrc).digest('hex');
      assert(shellSha === 'b908430756f9efdf273e4574b8d2b77b7efc367687ec238348b459b5de03c80c', 'API-APPSHELL-SHA', 'daAppShell.js SHA-256 matches verified baseline', 'staticSchema', {
        expected: 'b908430756f9efdf273e4574b8d2b77b7efc367687ec238348b459b5de03c80c',
        actual: shellSha
      });
      assert(shellSrc.includes('@api activeProjectId'), 'API-APPSHELL-PROP-1', 'daAppShell implements @api activeProjectId', 'semanticReview');
      assert(shellSrc.includes('@api activeProjectKey'), 'API-APPSHELL-PROP-2', 'daAppShell implements @api activeProjectKey', 'semanticReview');
      assert(shellSrc.includes('handleFilterChange'), 'API-APPSHELL-METHOD-1', 'daAppShell implements handleFilterChange', 'semanticReview');
    }
  }

  // =========================================================================
  // WORKSTREAM C5: WAVE 7 SEMANTICS (Two-Step ID/Key Resolution)
  // =========================================================================
  const w7DocPath = path.resolve(repoRoot, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md');
  if (fs.existsSync(w7DocPath)) {
    const w7Content = fs.readFileSync(w7DocPath, 'utf8');
    assert(w7Content.includes('Strict Two-Step Logical Separation') || w7Content.includes('two-step project resolution'), 'SEM-W7-TWO-STEP', 'W7 contract specifies two-step resolution', 'semanticReview');
    assert(w7Content.includes('runName'), 'SEM-W7-RUNNAME', 'W7 contract mandates canonical runName DTO field', 'semanticReview');
    assert(!w7Content.includes('WHERE Id = :keyOrId OR External_Key__c = :keyOrId'), 'SEM-W7-NO-OR', 'W7 contract explicitly rejects ambiguous OR query', 'semanticReview');
  } else {
    assert(false, 'SEM-W7-EXISTS', 'W7 resolution contract document exists', 'filesystem');
  }

  // =========================================================================
  // WORKSTREAM C6: WAVE 8 SEMANTICS (Dual-Snapshot & Chunking Limits)
  // =========================================================================
  const w8DocPath = path.resolve(repoRoot, 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md');
  if (fs.existsSync(w8DocPath)) {
    const w8Content = fs.readFileSync(w8DocPath, 'utf8');
    assert(w8Content.includes('10,485,760 chars (~10 MB)'), 'SEM-W8-10MB', 'Wave 8 specifies 10 MB raw-string character guard', 'semanticReview');
    assert(w8Content.includes('Generation Token') || w8Content.includes('Generation token'), 'SEM-W8-GEN-TOKEN', 'Wave 8 distinguishes request generation invalidation from server cancellation', 'semanticReview');
    assert(w8Content.includes('surrogate pair'), 'SEM-W8-SURROGATE', 'Wave 8 enforces surrogate pair boundary safety across chunks', 'semanticReview');
  } else {
    assert(false, 'SEM-W8-EXISTS', 'Wave 8 lifecycle acceptance document exists', 'filesystem');
  }

  // =========================================================================
  // WORKSTREAM C7: WAVE 0.4.4 REAL PATCH & ROLLBACK EVIDENCE VALIDATION
  // =========================================================================
  const rbCsvPath = path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_ROLLBACK_REGRESSION_SCENARIOS.csv');
  const pgCsvPath = path.resolve(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_PATCH_GATE_SCENARIOS.csv');

  if (fs.existsSync(rbCsvPath)) {
    try {
      const rbRows = parseStrictCSVToObjects(fs.readFileSync(rbCsvPath, 'utf8'));
      assert(rbRows.length === 15, 'EMP-RB-COUNT-15', `Wave 0.4.4 rollback scenarios register contains exactly 15 rows (found ${rbRows.length})`, 'empiricalExecution');
      const allRbPass = rbRows.every(r => (r['Status'] || '').trim() === 'PASS');
      assert(allRbPass, 'EMP-RB-ALL-PASS', 'All 15 rollback regression scenarios passed (15/15 PASS)', 'empiricalExecution');
    } catch (e) {
      assert(false, 'EMP-RB-PARSE', `Rollback scenario CSV parse error: ${e.message}`, 'empiricalExecution');
    }
  } else {
    assert(false, 'EMP-RB-EXISTS', 'Wave 0.4.4 rollback scenario CSV exists', 'filesystem');
  }

  if (fs.existsSync(pgCsvPath)) {
    try {
      const pgRows = parseStrictCSVToObjects(fs.readFileSync(pgCsvPath, 'utf8'));
      assert(pgRows.length === 24, 'EMP-PG-COUNT-24', `Wave 0.4.4 patch gate scenarios register contains exactly 24 rows (found ${pgRows.length})`, 'empiricalExecution');
      const allPgPass = pgRows.every(r => (r['Status'] || '').trim() === 'PASS');
      assert(allPgPass, 'EMP-PG-ALL-PASS', 'All 24 patch gate integration scenarios passed (24/24 PASS)', 'empiricalExecution');
    } catch (e) {
      assert(false, 'EMP-PG-PARSE', `Patch gate scenario CSV parse error: ${e.message}`, 'empiricalExecution');
    }
  } else {
    assert(false, 'EMP-PG-EXISTS', 'Wave 0.4.4 patch gate scenario CSV exists', 'filesystem');
  }

  // Offline verification boundaries
  assertUnverified('UNVERIFIED-SF-ORG', 'Salesforce live org compilation, deployment, and SOQL user-mode access', 'empiricalExecution', 'No live Salesforce org connected');
  assertUnverified('UNVERIFIED-BROWSER-E2E', 'Browser DOM render and Cytoscape canvas integration tests', 'empiricalExecution', 'Headless browser prohibited offline');

  let totalPassed = 0;
  let totalFailed = 0;
  let totalUnverified = 0;
  for (const cat in assertionCounts) {
    totalPassed += assertionCounts[cat].passed;
    totalFailed += assertionCounts[cat].failed;
    totalUnverified += assertionCounts[cat].unverified;
  }

  return {
    totalPassed,
    totalFailed,
    totalUnverified,
    assertionCounts,
    findings,
    recordedAssertions
  };
}

if (require.main === module) {
  console.log('======================================================================');
  console.log('   RUNNING WAVE 0.4.4 CROSS-DOCUMENT SEMANTIC VALIDATOR');
  console.log('======================================================================\n');

  const res = runValidation();

  console.log(`Passed Assertions:     ${res.totalPassed}`);
  console.log(`Failed Assertions:     ${res.totalFailed}`);
  console.log(`Unverified Gates:      ${res.totalUnverified}`);
  console.log(`Findings Recorded:     ${res.findings.length}\n`);

  // Write findings and results
  const findingsHeader = 'Finding_ID,Severity,Category,Source_Doc,Source_Section,Related_Entity,Expected,Actual,Status,Remediation\n';
  const findingsRows = res.findings.map(f =>
    `${f.id},${f.severity},${f.category},"${f.sourceDoc}","${f.sourceSection}","${f.relatedEntity}","${(f.expected || '').replace(/"/g, '""')}","${(f.actual || '').replace(/"/g, '""')}",${f.status},"${(f.remediation || '').replace(/"/g, '""')}"`
  ).join('\n');
  fs.writeFileSync('docs/wave-0/4.4/WAVE_0_4_4_VALIDATOR_FINDINGS_REGISTER.csv', findingsHeader + findingsRows + '\n');

  if (res.totalFailed > 0) {
    console.error(`Validation failed with ${res.totalFailed} failure(s).`);
    process.exit(1);
  } else {
    console.log('Wave 0.4.4 validation completed with zero failures.');
  }
}

module.exports = {
  runValidation,
  resetValidatorState
};
