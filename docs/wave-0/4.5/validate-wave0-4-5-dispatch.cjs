/**
 * validate-wave0-4-5-dispatch.cjs
 * Wave 0.4.5 Authoritative Isolated Semantic Validator.
 */

const fs = require('fs');
const path = require('path');
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

function parseCsv(content) {
  if (parser && parser.parseStrictCSVToObjects) {
    return parser.parseStrictCSVToObjects(content);
  }
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    if (parts.length === header.length) {
      const obj = {};
      header.forEach((h, idx) => { obj[h] = parts[idx]; });
      rows.push(obj);
    }
  }
  return rows;
}

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

function assertCondition(cond, code, desc, category, details = {}) {
  if (cond) {
    assertionCounts[category].passed++;
    recordedAssertions.push({ code, desc, category, status: 'PASS' });
  } else {
    assertionCounts[category].failed++;
    recordedAssertions.push({ code, desc, category, status: 'FAIL', details });
    findings.push({
      id: code,
      severity: 'ERROR',
      category,
      desc,
      expected: details.expected || 'TRUE',
      actual: details.actual || 'FALSE',
      status: 'VIOLATION',
      remediation: details.remediation || 'Correct the document discrepancy'
    });
  }
}

function assertUnverified(code, desc, category, reason) {
  assertionCounts[category].unverified++;
  recordedAssertions.push({ code, desc, category, status: 'UNVERIFIED', reason });
  findings.push({
    id: code,
    severity: 'INFO',
    category,
    desc,
    expected: 'LIVE_VERIFICATION',
    actual: 'OFFLINE_RESTRICTION',
    status: 'UNVERIFIED',
    remediation: reason
  });
}

function runValidation(targetDir = process.cwd(), options = {}) {
  resetState();
  const canonicalTarget = path.resolve(targetDir);

  const taskCsvPath = path.join(canonicalTarget, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
  const manifestCsvPath = path.join(canonicalTarget, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
  const traceCsvPath = path.join(canonicalTarget, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv');
  const batch1CsvPath = path.join(canonicalTarget, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');
  const provenanceCsvPath = path.join(canonicalTarget, 'docs/wave-0/4.4/WAVE_0_4_4_COMPONENT_API_SOURCE_PROVENANCE.csv');

  assertCondition(fs.existsSync(taskCsvPath), 'FS-TASK-CSV', 'Authoritative Task Register exists in targetDir', 'filesystem');
  assertCondition(fs.existsSync(manifestCsvPath), 'FS-MANIFEST-CSV', 'Authoritative Ownership Manifest exists in targetDir', 'filesystem');
  assertCondition(fs.existsSync(traceCsvPath), 'FS-TRACE-CSV', 'Contract Traceability exists in targetDir', 'filesystem');
  assertCondition(fs.existsSync(batch1CsvPath), 'FS-BATCH1-CSV', 'Batch 1 Allowlist exists in targetDir', 'filesystem');
  assertCondition(fs.existsSync(provenanceCsvPath), 'FS-PROV-CSV', 'Component Provenance exists in targetDir', 'filesystem');

  let taskRecords = [];
  let manifestRecords = [];
  let traceRecords = [];
  let batch1Records = [];
  let provRecords = [];

  try {
    if (fs.existsSync(taskCsvPath)) taskRecords = parseCsv(fs.readFileSync(taskCsvPath, 'utf8'));
    if (fs.existsSync(manifestCsvPath)) manifestRecords = parseCsv(fs.readFileSync(manifestCsvPath, 'utf8'));
    if (fs.existsSync(traceCsvPath)) traceRecords = parseCsv(fs.readFileSync(traceCsvPath, 'utf8'));
    if (fs.existsSync(batch1CsvPath)) batch1Records = parseCsv(fs.readFileSync(batch1CsvPath, 'utf8'));
    if (fs.existsSync(provenanceCsvPath)) provRecords = parseCsv(fs.readFileSync(provenanceCsvPath, 'utf8'));
  } catch (err) {
    assertCondition(false, 'CSV-PARSE-ERR', `CSV parsing failed: ${err.message}`, 'staticSchema');
  }

  const expectedTaskIds = [
    'W5-1', 'W5-2', 'W5-3', 'W5-4', 'W5-5', 'W5-6',
    'W6-1', 'W6-2', 'W6-3', 'W6-4',
    'W7-P1', 'W7-1', 'W7-2', 'W7-3',
    'W8-1', 'W8-2', 'W8-3',
    'W9-1', 'W9-2', 'W9-3',
    'INT-1'
  ];

  const rawTaskIds = taskRecords.map(r => (r['Task ID'] || r.Task_ID || '').trim());
  assertCondition(rawTaskIds.length === 21, 'TASK-COUNT-21', `Task register contains exactly 21 tasks (found ${rawTaskIds.length})`, 'staticSchema', { expected: '21', actual: String(rawTaskIds.length) });

  const seenTasks = new Set();
  let hasDupTask = false;
  let dupTid = '';
  for (const tid of rawTaskIds) {
    if (seenTasks.has(tid)) {
      hasDupTask = true;
      dupTid = tid;
      break;
    }
    seenTasks.add(tid);
  }
  assertCondition(!hasDupTask, 'TASK-DUPLICATE', `Task register contains zero duplicate Task IDs (dup: ${dupTid})`, 'staticSchema', { expected: 'No duplicate', actual: dupTid });

  for (const eid of expectedTaskIds) {
    assertCondition(seenTasks.has(eid), `TASK-MISSING-${eid}`, `Canonical task ID ${eid} must exist`, 'staticSchema', { expected: eid, actual: 'MISSING' });
  }
  for (const tid of rawTaskIds) {
    if (tid) {
      assertCondition(expectedTaskIds.includes(tid), `TASK-UNEXPECTED-${tid}`, `Task ID ${tid} is recognized in canonical 21-task register`, 'staticSchema', { expected: 'Canonical Task', actual: tid });
    }
  }

  const taskMap = new Map();
  taskRecords.forEach(t => taskMap.set(t['Task ID'] || t.Task_ID, t));
  const w5Chain = ['W5-1', 'W5-2', 'W5-3', 'W5-4', 'W5-5', 'W5-6'];
  for (let i = 1; i < w5Chain.length; i++) {
    const cur = taskMap.get(w5Chain[i]);
    const prev = w5Chain[i - 1];
    if (cur) {
      const deps = (cur['Dependencies'] || cur.Dependencies || '').split(',').map(s => s.trim());
      assertCondition(deps.includes(prev), `W5-CHAIN-${w5Chain[i]}`, `Task ${w5Chain[i]} depends on predecessor ${prev}`, 'semanticReview', { expected: prev, actual: deps.join(';') });
    }
  }

  const graph = new Map();
  for (const t of taskRecords) {
    const tid = t['Task ID'] || t.Task_ID;
    const depsRaw = (t['Dependencies'] || t.Dependencies || '').trim();
    const deps = (depsRaw && depsRaw !== 'None') ? depsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    graph.set(tid, deps);
  }

  function hasCycle(node, visited, recursionStack) {
    visited.add(node);
    recursionStack.add(node);
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor, visited, recursionStack)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    recursionStack.delete(node);
    return false;
  }

  let cycleDetected = false;
  const visited = new Set();
  const recStack = new Set();
  for (const tid of graph.keys()) {
    if (!visited.has(tid)) {
      if (hasCycle(tid, visited, recStack)) {
        cycleDetected = true;
        break;
      }
    }
  }
  assertCondition(!cycleDetected, 'DEP-ACYCLIC', 'Task dependency graph must be strictly acyclic', 'semanticReview', { expected: 'Acyclic', actual: cycleDetected ? 'Cycle found' : 'Acyclic' });

  const rawPaths = manifestRecords.map(m => (m.path || m.File_Path || '').trim());
  assertCondition(rawPaths.length === 175, 'MANIFEST-COUNT-175', `Manifest contains exactly 175 paths (found ${rawPaths.length})`, 'staticSchema', { expected: '175', actual: String(rawPaths.length) });

  const seenPaths = new Set();
  let hasDupPath = false;
  let dupP = '';
  for (const p of rawPaths) {
    const norm = p.replace(/\\/g, '/').replace(/^\.\//, '');
    if (seenPaths.has(norm)) {
      hasDupPath = true;
      dupP = norm;
      break;
    }
    seenPaths.add(norm);
  }
  assertCondition(!hasDupPath, 'MANIFEST-DUPLICATE', `Manifest contains zero duplicate paths (dup: ${dupP})`, 'staticSchema', { expected: 'No duplicate', actual: dupP });

  for (const p of rawPaths) {
    const isDir = p.endsWith('/') || p === '.';
    const isTravers = p.includes('..') || p.startsWith('/') || /^[a-zA-Z]:/.test(p);
    assertCondition(!isDir, `MANIFEST-NO-DIR-${p}`, `Manifest path ${p} must be a regular file, not a directory`, 'filesystem', { actual: p });
    assertCondition(!isTravers, `MANIFEST-NO-TRAVERSAL-${p}`, `Manifest path ${p} must not contain traversal or absolute root`, 'filesystem', { actual: p });
  }

  const batch1TaskIds = Array.from(new Set(batch1Records.map(b => (b.Task_ID || b['Task ID'] || '').trim())));
  assertCondition(batch1TaskIds.length === 11, 'BATCH1-TASK-COUNT-11', `Batch 1 allowlist contains exactly 11 tasks (found ${batch1TaskIds.length})`, 'staticSchema', { expected: '11', actual: String(batch1TaskIds.length) });
  assertCondition(batch1Records.length === 49, 'BATCH1-ROW-COUNT-49', `Batch 1 allowlist contains exactly 49 task/path rows (found ${batch1Records.length})`, 'staticSchema', { expected: '49', actual: String(batch1Records.length) });

  const expectedBatch1 = ['W5-1', 'W6-1', 'W6-2', 'W6-3', 'W6-4', 'W7-P1', 'W7-1', 'W7-2', 'W8-1', 'W8-2', 'W9-1'];
  for (const eid of expectedBatch1) {
    assertCondition(batch1TaskIds.includes(eid), `BATCH1-TASK-${eid}`, `Batch 1 includes ${eid}`, 'crossDocumentConsistency');
  }

  const w5_1_rec = taskMap.get('W5-1');
  if (w5_1_rec) {
    assertCondition((w5_1_rec['Dispatch Status'] || w5_1_rec.Dispatch_Status) === 'READY_TO_LAUNCH', 'W5-1-READY', 'W5-1 status is READY_TO_LAUNCH', 'semanticReview');
  }
  for (let i = 2; i <= 6; i++) {
    const t = taskMap.get(`W5-${i}`);
    if (t) {
      assertCondition((t['Dispatch Status'] || t.Dispatch_Status) === 'IMPLEMENTATION_DEPENDENT', `W5-${i}-DEPENDENT`, `W5-${i} is serialized as IMPLEMENTATION_DEPENDENT`, 'semanticReview');
    }
  }

  assertCondition(traceRecords.length === 9, 'TRACE-COUNT-9', `Traceability matrix contains exactly 9 contracts (found ${traceRecords.length})`, 'staticSchema', { expected: '9', actual: String(traceRecords.length) });

  const shellPath = path.join(canonicalTarget, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js');
  if (fs.existsSync(shellPath)) {
    const shellContent = fs.readFileSync(shellPath, 'utf8');
    const shellSha = crypto.createHash('sha256').update(shellContent).digest('hex');
    assertCondition(shellSha === 'b908430756f9efdf273e4574b8d2b77b7efc367687ec238348b459b5de03c80c', 'APPSHELL-SHA-MATCH', 'daAppShell.js SHA-256 matches verified hash', 'staticSchema', {
      expected: 'b908430756f9efdf273e4574b8d2b77b7efc367687ec238348b459b5de03c80c',
      actual: shellSha
    });

    const newlineCount = (shellContent.match(/\n/g) || []).length;
    assertCondition(newlineCount === 593, 'APPSHELL-LINE-COUNT-593', `daAppShell.js line count is 593 (found ${newlineCount})`, 'staticSchema', { expected: '593', actual: String(newlineCount) });
    const lines = shellContent.split('\n');

    const line77 = lines[76] || '';
    const line78 = lines[77] || '';
    assertCondition(line77.includes('@api activeProjectId'), 'APPSHELL-L77-API', 'daAppShell.js line 77 declares @api activeProjectId', 'semanticReview', { actual: line77 });
    assertCondition(line78.includes('@api activeProjectKey'), 'APPSHELL-L78-API', 'daAppShell.js line 78 declares @api activeProjectKey', 'semanticReview', { actual: line78 });

    assertCondition(!shellContent.includes('dispatchEvent'), 'APPSHELL-NO-DISPATCH-EVENT', 'daAppShell.js contains zero dispatchEvent calls (pure container with inbound handlers)', 'semanticReview');
    assertCondition(shellContent.includes('handleFilterChange'), 'APPSHELL-INBOUND-FILTER', 'daAppShell.js declares inbound handleFilterChange', 'semanticReview');
    assertCondition(shellContent.includes('handleContainerChange'), 'APPSHELL-INBOUND-CONTAINER', 'daAppShell.js declares inbound handleContainerChange', 'semanticReview');
    assertCondition(shellContent.includes('handleProjectChange'), 'APPSHELL-INBOUND-PROJECT', 'daAppShell.js declares inbound handleProjectChange', 'semanticReview');
    assertCondition(shellContent.includes('handleNodeSelect'), 'APPSHELL-INBOUND-NODE', 'daAppShell.js declares inbound handleNodeSelect', 'semanticReview');
  } else {
    assertCondition(false, 'APPSHELL-EXISTS', 'daAppShell.js exists in targetDir', 'filesystem');
  }

  const w7DocPath = path.join(canonicalTarget, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md');
  if (fs.existsSync(w7DocPath)) {
    const w7Content = fs.readFileSync(w7DocPath, 'utf8');
    assertCondition(w7Content.includes('Strict Two-Step Logical Separation') || w7Content.includes('two-step project resolution'), 'W7-TWO-STEP-RESOLUTION', 'W7 contract specifies two-step resolution', 'semanticReview');
    assertCondition(w7Content.includes('runName'), 'W7-RUNNAME-CANONICAL', 'W7 contract mandates canonical runName DTO field', 'semanticReview');
    assertCondition(!w7Content.includes('WHERE Id = :keyOrId OR External_Key__c = :keyOrId'), 'W7-REJECT-AMBIGUOUS-OR', 'W7 contract rejects ambiguous OR query', 'semanticReview');
  } else {
    assertCondition(false, 'W7-DOC-EXISTS', 'W7 resolution contract document exists in targetDir', 'filesystem');
  }

  const w8DocPath = path.join(canonicalTarget, 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md');
  if (fs.existsSync(w8DocPath)) {
    const w8Content = fs.readFileSync(w8DocPath, 'utf8');
    assertCondition(w8Content.includes('10,485,760 chars (~10 MB)'), 'W8-10MB-STRING-GUARD', 'Wave 8 mandates 10 MB raw-string character guard', 'semanticReview');
    assertCondition(w8Content.includes('Generation Token') || w8Content.includes('Generation token'), 'W8-GENERATION-TOKEN', 'Wave 8 enforces generation token invalidation', 'semanticReview');
    assertCondition(w8Content.includes('surrogate pair'), 'W8-SURROGATE-SAFE', 'Wave 8 enforces surrogate pair chunk boundary safety', 'semanticReview');
  } else {
    assertCondition(false, 'W8-DOC-EXISTS', 'Wave 8 lifecycle document exists in targetDir', 'filesystem');
  }

  assertUnverified('UNVERIFIED-SF-LIVE-ORG', 'Live Salesforce org deployment & governor limit verification', 'empiricalExecution', 'Requires live scratch org connection');
  assertUnverified('UNVERIFIED-BROWSER-CANVAS', 'Browser DOM drag & canvas rendering verification', 'empiricalExecution', 'Requires browser runtime');

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
  let targetDir = process.cwd();
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--targetDir' && process.argv[i + 1]) {
      targetDir = process.argv[i + 1];
      i++;
    }
  }

  console.log('======================================================================');
  console.log(`   RUNNING WAVE 0.4.5 ISOLATED SEMANTIC VALIDATOR`);
  console.log(`   Target Directory: ${path.resolve(targetDir)}`);
  console.log('======================================================================\n');

  const res = runValidation(targetDir);

  console.log(`Passed Assertions:     ${res.totalPassed}`);
  console.log(`Failed Assertions:     ${res.totalFailed}`);
  console.log(`Unverified Gates:      ${res.totalUnverified}`);
  console.log(`Findings Recorded:     ${res.findings.length}\n`);

  const csvPath = 'WAVE_0_4_5_VALIDATOR_FINDINGS.csv';
  const jsonPath = 'WAVE_0_4_5_VALIDATOR_FINDINGS.json';

  const header = 'Finding_ID,Severity,Category,Description,Expected,Actual,Status,Remediation\n';
  const rows = res.findings.map(f => `${f.id},${f.severity},${f.category},"${f.desc}","${f.expected}","${f.actual}",${f.status},"${f.remediation}"`).join('\n');
  fs.writeFileSync(csvPath, header + rows + '\n');
  fs.writeFileSync(jsonPath, JSON.stringify(res, null, 2));

  if (res.totalFailed > 0) {
    console.error(`Validator completed with ${res.totalFailed} failure(s).`);
    process.exit(1);
  } else {
    console.log('Wave 0.4.5 validation completed successfully with zero failures.');
  }
}

module.exports = {
  runValidation,
  resetState
};
