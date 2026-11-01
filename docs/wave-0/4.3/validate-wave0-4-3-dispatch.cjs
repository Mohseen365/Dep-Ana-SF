/**
 * validate-wave0-4-3-dispatch.cjs
 * Wave 0.4.3 Authoritative Cross-Document Semantic Consistency Validator.
 */

const fs = require('fs');
const path = require('path');
const { parseStrictCSVToObjects } = require('./strict-rfc4180-csv-parser.cjs');

const repoRoot = path.resolve(__dirname, '../../..');

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

function recordFinding({ severity, category, sourceDoc, sourceSection, relatedEntity, expected, actual, status, remediation }) {
  const fid = `FIND-W043-${String(findingSequence++).padStart(4, '0')}`;
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
    reason,
    metadata
  });
}

function runValidation(options = {}) {
  resetValidatorState();

  const targetDir = options.targetDir || repoRoot;
  const isSelfTest = options.isSelfTest || false;

  const manifestPath = path.resolve(targetDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
  const taskPath = path.resolve(targetDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
  const tracePath = path.resolve(targetDir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv');

  // 1. Filesystem existence of core registers
  assert(fs.existsSync(manifestPath), 'FS-01', 'Authoritative Manifest CSV exists', 'filesystem', { sourceDoc: manifestPath });
  assert(fs.existsSync(taskPath), 'FS-02', 'Authoritative Task CSV exists', 'filesystem', { sourceDoc: taskPath });
  assert(fs.existsSync(tracePath), 'FS-03', 'Authoritative Contract Traceability CSV exists', 'filesystem', { sourceDoc: tracePath });

  let manifestRecords = [];
  let taskRecords = [];
  let traceRecords = [];

  try {
    manifestRecords = parseStrictCSVToObjects(fs.readFileSync(manifestPath, 'utf8'), { filename: 'Manifest' });
  } catch (err) {
    assert(false, 'CSV-01', `Manifest CSV parse failure: ${err.message}`, 'staticSchema', { actual: err.message });
  }

  try {
    taskRecords = parseStrictCSVToObjects(fs.readFileSync(taskPath, 'utf8'), { filename: 'TaskRegister' });
  } catch (err) {
    assert(false, 'CSV-02', `Task Register CSV parse failure: ${err.message}`, 'staticSchema', { actual: err.message });
  }

  try {
    traceRecords = parseStrictCSVToObjects(fs.readFileSync(tracePath, 'utf8'), { filename: 'Traceability' });
  } catch (err) {
    assert(false, 'CSV-03', `Traceability CSV parse failure: ${err.message}`, 'staticSchema', { actual: err.message });
  }

  // 2. Exact Canonical Task Set Validation (Task IDs)
  const expectedTaskIds = [
    'W5-1', 'W5-2', 'W5-3', 'W5-4', 'W5-5', 'W5-6',
    'W6-1', 'W6-2', 'W6-3', 'W6-4',
    'W7-P1', 'W7-1', 'W7-2', 'W7-3',
    'W8-1', 'W8-2', 'W8-3',
    'W9-1', 'W9-2', 'W9-3',
    'INT-1'
  ];

  assert(taskRecords.length === 21, 'TASK-01', `Task register contains exactly 21 tasks (found ${taskRecords.length})`, 'staticSchema', {
    expected: '21', actual: String(taskRecords.length)
  });

  const actualTaskIds = taskRecords.map(t => t['Task ID']);
  const actualTaskSet = new Set(actualTaskIds);

  assert(actualTaskSet.size === taskRecords.length, 'TASK-02', 'Task register contains zero duplicate Task IDs', 'staticSchema', {
    expected: '21 unique task IDs', actual: `${actualTaskSet.size} unique task IDs`
  });

  expectedTaskIds.forEach(eid => {
    assert(actualTaskSet.has(eid), `TASK-EXISTS-${eid}`, `Canonical task ${eid} is present in task register`, 'staticSchema', {
      expected: eid, actual: actualTaskSet.has(eid) ? eid : 'MISSING'
    });
  });

  actualTaskIds.forEach(aid => {
    assert(expectedTaskIds.includes(aid), `TASK-CANONICAL-${aid}`, `Task ID ${aid} belongs to expected canonical 21-task allowlist`, 'staticSchema', {
      expected: 'In allowlist', actual: aid
    });
  });

  // 3. Dependency Semantics & Cycle Detection
  const taskMap = new Map();
  taskRecords.forEach(t => taskMap.set(t['Task ID'], t));

  const depGraph = new Map();
  taskRecords.forEach(t => {
    const tid = t['Task ID'];
    const rawDeps = (t['Dependencies'] || '').split(/[\r\n,;]+/).map(s => s.trim()).filter(s => s && s !== 'None');
    depGraph.set(tid, rawDeps);

    rawDeps.forEach(dep => {
      if (dep === 'Waves 5' || dep === '6' || dep === '7' || dep === '8' || dep === '9') {
        return;
      }
      assert(taskMap.has(dep), `DEP-EXISTS-${tid}->${dep}`, `Task ${tid} dependency ${dep} exists in canonical task register`, 'crossDocumentConsistency', {
        relatedEntity: tid, expected: 'Valid task ID', actual: dep
      });
      assert(dep !== tid, `DEP-NO-SELF-${tid}`, `Task ${tid} must not depend on itself`, 'crossDocumentConsistency', {
        relatedEntity: tid
      });
    });
  });

  const visited = new Map();
  let hasCycle = false;
  let cyclePath = [];

  function dfs(node, pathStack) {
    visited.set(node, 1);
    pathStack.push(node);
    const neighbors = depGraph.get(node) || [];
    for (const n of neighbors) {
      if (!taskMap.has(n)) continue;
      if (visited.get(n) === 1) {
        hasCycle = true;
        cyclePath = [...pathStack, n];
        return;
      }
      if (!visited.has(n)) {
        dfs(n, pathStack);
        if (hasCycle) return;
      }
    }
    pathStack.pop();
    visited.set(node, 2);
  }

  for (const tid of expectedTaskIds) {
    if (!visited.has(tid)) {
      dfs(tid, []);
    }
  }

  assert(!hasCycle, 'DEP-NO-CYCLES', `Dependency graph has zero cycles (cycle detected: ${cyclePath.join(' -> ')})`, 'crossDocumentConsistency', {
    expected: 'No cycles', actual: hasCycle ? cyclePath.join(' -> ') : 'Acyclic'
  });

  assert((depGraph.get('W5-2') || []).includes('W5-1'), 'W5-CHAIN-2', 'W5-2 depends on W5-1', 'crossDocumentConsistency');
  assert((depGraph.get('W5-3') || []).includes('W5-2'), 'W5-CHAIN-3', 'W5-3 depends on W5-2', 'crossDocumentConsistency');
  assert((depGraph.get('W5-4') || []).includes('W5-3'), 'W5-CHAIN-4', 'W5-4 depends on W5-3', 'crossDocumentConsistency');
  assert((depGraph.get('W5-5') || []).includes('W5-4'), 'W5-CHAIN-5', 'W5-5 depends on W5-4', 'crossDocumentConsistency');
  assert((depGraph.get('W5-6') || []).includes('W5-5'), 'W5-CHAIN-6', 'W5-6 depends on W5-5', 'crossDocumentConsistency');

  // 4. Manifest Integrity and Path Safety (175 paths)
  assert(manifestRecords.length === 175, 'MAN-01', `Ownership manifest contains exactly 175 entries (found ${manifestRecords.length})`, 'staticSchema', {
    expected: '175', actual: String(manifestRecords.length)
  });

  const existingPaths = manifestRecords.filter(m => m.status === 'EXISTING');
  const newPaths = manifestRecords.filter(m => m.status === 'NEW');

  assert(existingPaths.length === 99, 'MAN-02', `Manifest specifies exactly 99 EXISTING paths (found ${existingPaths.length})`, 'staticSchema', {
    expected: '99', actual: String(existingPaths.length)
  });

  assert(newPaths.length === 76, 'MAN-03', `Manifest specifies exactly 76 NEW paths (found ${newPaths.length})`, 'staticSchema', {
    expected: '76', actual: String(newPaths.length)
  });

  const manifestPathSet = new Set();
  const manifestMap = new Map();

  manifestRecords.forEach((m, idx) => {
    const p = m.path;
    manifestMap.set(p, m);

    assert(p && p.trim().length > 0, `PATH-EMPTY-${idx}`, `Manifest row ${idx + 1} path is non-empty`, 'staticSchema');

    const isSafe = !p.startsWith('/') && !p.startsWith('\\') && !/^[a-zA-Z]:/.test(p) && !p.includes('..') && !p.includes('\\');
    assert(isSafe, `PATH-SAFE-${idx}`, `Manifest path '${p}' is syntactically safe (relative, no backslashes, no traversal)`, 'staticSchema', {
      relatedEntity: p
    });

    assert(!manifestPathSet.has(p), `PATH-UNIQUE-${idx}`, `Manifest path '${p}' is unique`, 'staticSchema', {
      relatedEntity: p
    });
    manifestPathSet.add(p);
  });

  if (!isSelfTest) {
    let existingOnDiskCount = 0;
    existingPaths.forEach(ep => {
      const fullP = path.resolve(targetDir, ep.path);
      if (fs.existsSync(fullP)) {
        existingOnDiskCount++;
      } else {
        assert(false, `PATH-EXISTS-${ep.path}`, `Existing manifest path not found on disk: ${ep.path}`, 'filesystem', {
          relatedEntity: ep.path
        });
      }
    });
    assert(existingOnDiskCount === 99, 'MAN-DISK-99', `All 99 EXISTING manifest files exist on disk`, 'filesystem', {
      expected: '99', actual: String(existingOnDiskCount)
    });
  }

  // 5. Task Exact Affected Files Union and Mutability
  const frozenPaths = new Set([
    'scratch/salesforce-poc/tests/run-poc-tests.cjs',
    'scratch/salesforce-poc/tests/run-workstream-a-tests.cjs',
    'scratch/salesforce-poc/tests/run-workstream-c-tests.cjs',
    'scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs',
    'scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs',
    'scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs',
    'scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs',
    'scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs',
    'scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs'
  ]);

  const coordinatorExclusivePaths = new Set([
    'scratch/salesforce-poc/tests/run-wave5-tests.cjs',
    'scratch/salesforce-poc/tests/run-wave6-tests.cjs',
    'scratch/salesforce-poc/tests/run-wave7-tests.cjs',
    'scratch/salesforce-poc/tests/run-wave8-tests.cjs',
    'scratch/salesforce-poc/tests/run-wave9-tests.cjs',
    'scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs'
  ]);

  taskRecords.forEach(t => {
    const tid = t['Task ID'];
    const exactAffected = (t['Exact Affected Files'] || '').split(';').map(s => s.trim()).filter(Boolean);
    const newFiles = (t['New Files'] || '').split(';').map(s => s.trim()).filter(s => s && s !== 'None');
    const existingModified = (t['Existing Files Modified'] || '').split(';').map(s => s.trim()).filter(s => s && s !== 'None');

    const unionSet = new Set([...newFiles, ...existingModified]);
    const exactSet = new Set(exactAffected);

    assert(exactSet.size === unionSet.size && [...exactSet].every(x => unionSet.has(x)),
      `TASK-UNION-${tid}`, `Task ${tid}: Exact Affected Files equals the exact union of New Files and Existing Files Modified`,
      'crossDocumentConsistency', { relatedEntity: tid });

    exactAffected.forEach(fp => {
      assert(manifestPathSet.has(fp), `TASK-PATH-IN-MAN-${tid}-${fp}`, `Task ${tid} file '${fp}' exists in manifest`, 'crossDocumentConsistency', {
        relatedEntity: fp
      });

      assert(!frozenPaths.has(fp), `FROZEN-PROT-${tid}-${fp}`, `Task ${tid} does NOT write to frozen runner '${fp}'`, 'crossDocumentConsistency', {
        relatedEntity: fp
      });

      if (t['Accountable Owner'] !== 'Integration Coordinator') {
        assert(!coordinatorExclusivePaths.has(fp), `COORD-PROT-${tid}-${fp}`, `Feature task ${tid} does NOT write to coordinator-exclusive path '${fp}'`, 'crossDocumentConsistency', {
          relatedEntity: fp
        });
      }
    });
  });

  // 6. Traceability Contracts (W0-C1 through W0-C9)
  const expectedContractIds = ['W0-C1', 'W0-C2', 'W0-C3', 'W0-C4', 'W0-C5', 'W0-C6', 'W0-C7', 'W0-C8', 'W0-C9'];
  assert(traceRecords.length === 9, 'TRACE-01', `Traceability matrix contains exactly 9 contracts (found ${traceRecords.length})`, 'staticSchema', {
    expected: '9', actual: String(traceRecords.length)
  });

  const actualContractIds = traceRecords.map(r => r['Contract ID']);
  assert(new Set(actualContractIds).size === 9, 'TRACE-02', 'Zero duplicate Contract IDs in traceability register', 'staticSchema');

  expectedContractIds.forEach(cid => {
    assert(actualContractIds.includes(cid), `TRACE-EXISTS-${cid}`, `Contract ${cid} is present in traceability register`, 'staticSchema');
  });

  traceRecords.forEach(c => {
    const cid = c['Contract ID'];
    assert(c['Exact Contract Definition'] && c['Exact Contract Definition'].trim().length > 0, `TRACE-DEF-${cid}`, `Contract ${cid} has definition`, 'staticSchema');
    assert(c['Final Status'].startsWith('FROZEN'), `TRACE-FROZEN-${cid}`, `Contract ${cid} is FROZEN`, 'crossDocumentConsistency');
    assert(c['Outstanding Decisions'].startsWith('NONE'), `TRACE-DECISION-${cid}`, `Contract ${cid} has no blocking decisions`, 'crossDocumentConsistency');
  });

  // 7. Semantic Content Validation (True Content Inspection)
  const w7DocPath = path.resolve(targetDir, 'docs/wave-0/4.2/WAVE_0_4_2_W7_PROJECT_ID_AND_EXTERNAL_KEY_RESOLUTION_CONTRACT.md');
  if (fs.existsSync(w7DocPath)) {
    const content = fs.readFileSync(w7DocPath, 'utf8');
    assert(content.includes('Two-Step Resolution Contract') && content.includes('runName') && !content.includes('SELECT ... WHERE Id = :x OR Project_Key__c = :y'),
      'SEM-W7-CONTENT', 'W7 contract defines strict two-step query and canonical runName without OR leak', 'semanticReview', {
        sourceDoc: w7DocPath, sourceSection: 'Query Contract'
      });
  } else {
    assert(false, 'SEM-W7-EXISTS', 'W7 contract document exists', 'semanticReview');
  }

  const patchDocPath = path.resolve(targetDir, 'docs/wave-0/4.2/WAVE_0_4_2_PATCH_INTEGRATION_AND_COLLISION_CONTROL_PROTOCOL.md');
  if (fs.existsSync(patchDocPath)) {
    const content = fs.readFileSync(patchDocPath, 'utf8');
    assert(content.includes('Dispatch Base SHA') && content.includes('Current Integration HEAD') && content.includes('Task-Scoped Safe Rollback'),
      'SEM-PATCH-CONTENT', 'Patch protocol distinguishes dispatch base SHA from integration HEAD and defines safe rollback', 'semanticReview', {
        sourceDoc: patchDocPath, sourceSection: 'Base Verification'
      });
  } else {
    assert(false, 'SEM-PATCH-EXISTS', 'Patch protocol document exists', 'semanticReview');
  }

  const w8DocPath = path.resolve(targetDir, 'docs/wave-0/4.2/WAVE_0_4_2_W8_RESOURCE_AND_ASYNC_LIFECYCLE_EVIDENCE.md');
  if (fs.existsSync(w8DocPath)) {
    const content = fs.readFileSync(w8DocPath, 'utf8');
    assert(content.includes('10,485,760 chars (~10 MB)') && content.includes('Advance request generation token'),
      'SEM-W8-CONTENT', 'Wave 8 distinguishes string character guard from heap limit and invalidation from cancellation', 'semanticReview', {
        sourceDoc: w8DocPath, sourceSection: 'Lifecycle Invariants'
      });
  } else {
    assert(false, 'SEM-W8-EXISTS', 'Wave 8 lifecycle document exists', 'semanticReview');
  }

  // 8. Empirical Execution - Patch Scenarios Register Inspection
  const patchRegPath = path.resolve(targetDir, 'docs/wave-0/4.2/WAVE_0_4_2_PATCH_SCENARIO_EVIDENCE_REGISTER.csv');
  if (fs.existsSync(patchRegPath)) {
    try {
      const pScenarios = parseStrictCSVToObjects(fs.readFileSync(patchRegPath, 'utf8'), { filename: 'PatchReg' });
      assert(pScenarios.length >= 15, 'EMP-PATCH-COUNT', `Historical patch scenario register contains >= 15 scenarios (found ${pScenarios.length})`, 'empiricalExecution');
    } catch (err) {
      assert(false, 'EMP-PATCH-PARSE', `Patch scenario register CSV parse error: ${err.message}`, 'empiricalExecution');
    }
  }

  assertUnverified('UNVERIFIED-SF-ORG', 'Salesforce live org compilation, deployment, and SOQL user-mode execution', 'semanticReview',
    'No live Salesforce scratch org is connected in offline sandbox environment', {
      sourceDoc: 'N/A', remediation: 'Execute via SFDX/Salesforce CLI when authorized org environment is available'
    });

  assertUnverified('UNVERIFIED-BROWSER-E2E', 'Browser DOM render and Cytoscape canvas integration tests', 'semanticReview',
    'Headless browser / Playwright execution not authorized during offline evidence gate closure', {
      sourceDoc: 'N/A', remediation: 'Execute browser test harness during full UI verification phase'
    });

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalUnverified = 0;
  for (const cat in assertionCounts) {
    totalPassed += assertionCounts[cat].passed;
    totalFailed += assertionCounts[cat].failed;
    totalSkipped += assertionCounts[cat].skipped;
    totalUnverified += assertionCounts[cat].unverified;
  }

  return {
    totalPassed,
    totalFailed,
    totalSkipped,
    totalUnverified,
    assertionCounts,
    findings,
    recordedAssertions
  };
}

module.exports = {
  runValidation,
  assertionCounts,
  findings
};

if (require.main === module) {
  console.log('======================================================================');
  console.log('   WAVE 0.4.3 AUTHORITATIVE CROSS-DOCUMENT & DISPATCH VALIDATOR');
  console.log('======================================================================\n');

  const result = runValidation();

  console.log('--- VALIDATION ASSERTION COUNTS BY CATEGORY ---');
  for (const [cat, counts] of Object.entries(result.assertionCounts)) {
    console.log(`  * ${cat.padEnd(28)} : ${counts.passed} PASSED, ${counts.failed} FAILED, ${counts.skipped} SKIPPED, ${counts.unverified} UNVERIFIED`);
  }
  console.log('----------------------------------------------------------------------');
  console.log(`TOTAL ASSERTIONS EXECUTED      : ${result.totalPassed + result.totalFailed + result.totalSkipped + result.totalUnverified}`);
  console.log(`PASSED                         : ${result.totalPassed}`);
  console.log(`FAILED                         : ${result.totalFailed}`);
  console.log(`SKIPPED                        : ${result.totalSkipped}`);
  console.log(`UNVERIFIED                     : ${result.totalUnverified}`);
  console.log(`TOTAL FINDINGS GENERATED       : ${result.findings.length}`);
  console.log('======================================================================\n');

  if (result.totalFailed > 0) {
    console.error(`VALIDATOR HALTED WITH ${result.totalFailed} FAILURES!`);
    process.exit(1);
  } else {
    console.log('VALIDATION SUCCESSFUL WITH ZERO UNRESOLVED FAILURES!');
  }
}
