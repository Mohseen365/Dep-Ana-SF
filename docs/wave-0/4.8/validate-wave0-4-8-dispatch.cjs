/**
 * validate-wave0-4-8-dispatch.cjs - Wave 0.4.8
 * Authoritative Isolated Semantic Validator.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseStrictCSVToObjects, CsvParseError } = require('./strict-rfc4180-csv-parser.cjs');

const assertionCounts = {
  staticSchema: { passed: 0, failed: 0, unverified: 0 },
  crossDocumentConsistency: { passed: 0, failed: 0, unverified: 0 },
  filesystem: { passed: 0, failed: 0, unverified: 0 },
  semanticReview: { passed: 0, failed: 0, unverified: 0 },
  empiricalExecution: { passed: 0, failed: 0, unverified: 0 }
};

const findings = [];
const recordedAssertions = [];

function resetState() {
  for (const cat in assertionCounts) {
    assertionCounts[cat].passed = 0;
    assertionCounts[cat].failed = 0;
    assertionCounts[cat].unverified = 0;
  }
  findings.length = 0;
  recordedAssertions.length = 0;
}

function recordAssertion(category, id, description, passed, severity = 'P1', message = '') {
  if (!assertionCounts[category]) {
    throw new Error(`Unknown assertion category: ${category}`);
  }
  if (passed) {
    assertionCounts[category].passed++;
    recordedAssertions.push({ category, id, description, status: 'PASSED' });
  } else {
    assertionCounts[category].failed++;
    const finding = {
      findingId: id,
      severity,
      category,
      description,
      details: message
    };
    findings.push(finding);
    recordedAssertions.push({ category, id, description, status: 'FAILED', severity, message });
  }
}

function parseCsv(content) {
  return parseStrictCSVToObjects(content);
}

function runValidation(targetDir = process.cwd()) {
  resetState();

  const taskCsvPath = path.join(targetDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
  const manifestCsvPath = path.join(targetDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
  const traceCsvPath = path.join(targetDir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv');
  const batch1CsvPath = path.join(targetDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');

  let tasks = [];
  let manifest = [];
  let trace = [];
  let batch1Rows = [];

  const requiredFiles = [
    { p: taskCsvPath, name: 'task_register' },
    { p: manifestCsvPath, name: 'manifest' },
    { p: traceCsvPath, name: 'traceability' },
    { p: batch1CsvPath, name: 'batch1_allowlist' }
  ];

  for (const req of requiredFiles) {
    const exists = fs.existsSync(req.p);
    recordAssertion('staticSchema', `FILE_EXISTS_${req.name.toUpperCase()}`, `File ${path.basename(req.p)} must exist`, exists, 'P0');
    if (!exists) return getResult();
  }

  try {
    tasks = parseCsv(fs.readFileSync(taskCsvPath, 'utf8'));
    recordAssertion('staticSchema', 'PARSE_TASK_CSV', 'Task CSV must parse strictly', true);
  } catch (err) {
    recordAssertion('staticSchema', 'PARSE_TASK_CSV', 'Task CSV parse failure', false, 'P0', err.message);
    return getResult();
  }

  try {
    manifest = parseCsv(fs.readFileSync(manifestCsvPath, 'utf8'));
    recordAssertion('staticSchema', 'PARSE_MANIFEST_CSV', 'Manifest CSV must parse strictly', true);
  } catch (err) {
    recordAssertion('staticSchema', 'PARSE_MANIFEST_CSV', 'Manifest CSV parse failure', false, 'P0', err.message);
    return getResult();
  }

  try {
    trace = parseCsv(fs.readFileSync(traceCsvPath, 'utf8'));
    recordAssertion('staticSchema', 'PARSE_TRACE_CSV', 'Traceability CSV must parse strictly', true);
  } catch (err) {
    recordAssertion('staticSchema', 'PARSE_TRACE_CSV', 'Traceability CSV parse failure', false, 'P0', err.message);
    return getResult();
  }

  try {
    batch1Rows = parseCsv(fs.readFileSync(batch1CsvPath, 'utf8'));
    recordAssertion('staticSchema', 'PARSE_BATCH1_CSV', 'Batch 1 CSV must parse strictly', true);
  } catch (err) {
    recordAssertion('staticSchema', 'PARSE_BATCH1_CSV', 'Batch 1 CSV parse failure', false, 'P0', err.message);
    return getResult();
  }

  recordAssertion('staticSchema', 'TASK_REGISTER_COUNT_21', 'Task register must contain exactly 21 canonical tasks', tasks.length === 21, 'P0', `Actual count: ${tasks.length}`);
  recordAssertion('staticSchema', 'MANIFEST_COUNT_175', 'Manifest register must contain exactly 175 file paths', manifest.length === 175, 'P0', `Actual count: ${manifest.length}`);
  recordAssertion('staticSchema', 'TRACEABILITY_COUNT_9', 'Traceability register must contain exactly 9 contracts', trace.length === 9, 'P0', `Actual count: ${trace.length}`);
  recordAssertion('staticSchema', 'BATCH1_ROW_COUNT_49', 'Batch 1 allowlist must contain exactly 49 path rows', batch1Rows.length === 49, 'P0', `Actual count: ${batch1Rows.length}`);

  const uniqueBatch1Tasks = new Set(batch1Rows.map(b => b.Task_ID || b['Task ID']));
  recordAssertion('staticSchema', 'BATCH1_TASK_COUNT_11', 'Batch 1 allowlist must contain exactly 11 distinct tasks', uniqueBatch1Tasks.size === 11, 'P0', `Actual distinct tasks: ${uniqueBatch1Tasks.size}`);

  const taskIds = new Set(tasks.map(t => t['Task ID'] || t.Task_ID));
  let allBatch1InTasks = true;
  for (const bid of uniqueBatch1Tasks) {
    if (!taskIds.has(bid)) allBatch1InTasks = false;
  }
  recordAssertion('crossDocumentConsistency', 'BATCH1_SUBSET_OF_TASKS', 'All Batch 1 tasks must exist in authoritative task register', allBatch1InTasks, 'P0');

  const w5Tasks = tasks.filter(t => (t['Task ID'] || t.Task_ID || '').startsWith('W5-'));
  let w5ChainValid = (w5Tasks.length === 6);
  for (let i = 2; i <= 6; i++) {
    const t = tasks.find(x => (x['Task ID'] || x.Task_ID) === `W5-${i}`);
    const dep = t ? (t['Prerequisite Task IDs'] || t.Dependencies || '') : '';
    if (!dep.includes(`W5-${i-1}`)) w5ChainValid = false;
  }
  recordAssertion('crossDocumentConsistency', 'W5_SERIALIZATION_CHAIN', 'Wave 5 tasks must be strictly serialized W5-1 through W5-6', w5ChainValid, 'P0');

  const int1 = tasks.find(t => (t['Task ID'] || t.Task_ID) === 'INT-1');
  const int1Coord = int1 && (int1['Accountable Owner'] || '').includes('Coordinator');
  recordAssertion('crossDocumentConsistency', 'INT1_COORDINATOR_OWNED', 'INT-1 task must be coordinator-owned', int1Coord, 'P0');

  let existingFound = 0;
  let plannedCount = 0;
  for (const m of manifest) {
    const p = m.path || m.File_Path;
    const isNew = (m.status === 'NEW' || m.status === 'PLANNED_NEW' || m.Is_New_File === 'YES' || m.Lifecycle_State === 'PLANNED_NEW');
    if (isNew) {
      plannedCount++;
    } else {
      const fullPath = path.resolve(targetDir, p);
      if (fs.existsSync(fullPath)) {
        existingFound++;
      }
    }
  }
  recordAssertion('filesystem', 'EXISTING_FILES_PHYSICALLY_PRESENT', 'All 99 existing baseline files must physically exist', existingFound === 99, 'P0', `Found: ${existingFound}/99`);
  recordAssertion('filesystem', 'PLANNED_NEW_FILES_COUNT_76', 'Planned new files in manifest must equal exactly 76', plannedCount === 76, 'P1', `Planned: ${plannedCount}/76`);

  const baselineRunnerSet = new Set([
    'scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs',
    'scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs',
    'scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs',
    'scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs',
    'scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs',
    'scratch/salesforce-poc/tests/run-poc-tests.cjs',
    'scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs',
    'scratch/salesforce-poc/tests/run-workstream-a-tests.cjs',
    'scratch/salesforce-poc/tests/run-workstream-c-tests.cjs'
  ]);
  let frozenRunnersCount = 0;
  for (const m of manifest) {
    const p = m.path || m.File_Path;
    if (baselineRunnerSet.has(p)) {
      const tier = m.mutability_tier || m.Governance_Tier;
      if (tier === 'FROZEN_READ_ONLY' || m.Is_Frozen === 'YES') {
        frozenRunnersCount++;
      }
    }
  }
  recordAssertion('semanticReview', 'BASELINE_RUNNERS_FROZEN_TIER', 'All 9 baseline test runners must be marked FROZEN_READ_ONLY', frozenRunnersCount === 9, 'P0', `Frozen: ${frozenRunnersCount}/9`);

  const promptPath = path.join(targetDir, 'WAVE_0_4_8_JULES_DISPATCH_PROMPT_SINGLE_FILE.md');
  const promptHasNoDispatch = fs.existsSync(promptPath) && fs.readFileSync(promptPath, 'utf8').includes('Batch 1 dispatch authorized: NO');
  recordAssertion('empiricalExecution', 'PROMPT_PROHIBITS_BATCH1', 'Dispatch prompt must strictly prohibit Batch 1 dispatch', promptHasNoDispatch, 'P0');

  return getResult();
}

function getResult() {
  const isClean = findings.length === 0;
  return {
    valid: isClean,
    exitCode: isClean ? 0 : 1,
    assertionCounts,
    findings,
    recordedAssertions
  };
}

if (require.main === module) {
  const targetDir = process.argv[2] || process.cwd();
  const res = runValidation(targetDir);
  console.log(`Validation result: ${res.valid ? 'PASSED (0 findings)' : `FAILED (${res.findings.length} findings)`}`);
  console.log('Assertion Counts:', JSON.stringify(res.assertionCounts, null, 2));
  if (!res.valid) {
    console.log('Findings:', JSON.stringify(res.findings, null, 2));
    process.exit(1);
  }
}

module.exports = {
  runValidation,
  resetState,
  findings,
  assertionCounts
};
