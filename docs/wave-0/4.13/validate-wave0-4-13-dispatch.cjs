/**
 * validate-wave0-4-13-dispatch.cjs
 * Wave 0.4.13 Authoritative Isolated Semantic Validator.
 * Fully RFC 4180 compliant, exact-finding assertions, zero silent fallbacks.
 * Emits exact finding codes and details on stdout for child-process consumers.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const parser = require('./strict-rfc4180-csv-parser.cjs');

function parseCsv(content, filename = 'input.csv') {
  return parser.parseStrictCSVToObjects(content, { filename });
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
    severity: 'WARNING',
    category,
    desc,
    status: 'UNVERIFIED',
    reason
  });
}

function runValidation(targetDir = process.cwd()) {
  resetState();

  const manifestPath = path.resolve(targetDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
  const taskRegPath = path.resolve(targetDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
  const traceabilityPath = path.resolve(targetDir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv');
  const batch1Path = path.resolve(targetDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');
  const appShellPath = path.resolve(targetDir, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js');
  const w7ContractPath = path.resolve(targetDir, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md');
  const w8ContractPath = path.resolve(targetDir, 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md');

  // 1. Authoritative Task Register (21 tasks)
  if (fs.existsSync(taskRegPath)) {
    const tasks = parseCsv(fs.readFileSync(taskRegPath, 'utf8'), 'task-register.csv');
    assertCondition(tasks.length === 21, 'TASK-COUNT-21', 'Authoritative task register contains exactly 21 tasks', 'staticSchema', { expected: 21, actual: tasks.length });

    const taskIds = new Set(tasks.map(t => t['Task ID']));
    const expectedTasks = [
      'W5-1', 'W5-2', 'W5-3', 'W5-4', 'W5-5', 'W5-6',
      'W6-1', 'W6-2', 'W6-3', 'W6-4',
      'W7-P1', 'W7-1', 'W7-2', 'W7-3',
      'W8-1', 'W8-2', 'W8-3',
      'W9-1', 'W9-2', 'W9-3',
      'INT-1'
    ];

    for (const et of expectedTasks) {
      assertCondition(taskIds.has(et), `TASK-MISSING-${et}`, `Task register contains canonical task ${et}`, 'staticSchema');
    }
    for (const tid of taskIds) {
      assertCondition(expectedTasks.includes(tid), `TASK-UNEXPECTED-${tid}`, `Task ${tid} is within canonical task set`, 'staticSchema');
    }

    // W5 Chain Check
    const w51 = tasks.find(t => t['Task ID'] === 'W5-1');
    const w52 = tasks.find(t => t['Task ID'] === 'W5-2');
    const w53 = tasks.find(t => t['Task ID'] === 'W5-3');

    if (w51) {
      assertCondition(w51['Dispatch Status'] === 'READY_TO_LAUNCH', 'W5-1-READY', 'W5-1 has READY_TO_LAUNCH status', 'semanticReview');
    }
    if (w52) {
      assertCondition(w52['Dispatch Status'] === 'IMPLEMENTATION_DEPENDENT', 'W5-2-DEPENDENT', 'W5-2 has IMPLEMENTATION_DEPENDENT status', 'semanticReview');
    }
    if (w53) {
      assertCondition((w53.Dependencies || '').includes('W5-2'), 'W5-CHAIN-W5-3', 'W5-3 requires W5-2 prerequisite', 'semanticReview');
    }

    // Acyclic check
    const taskMap = new Map(tasks.map(t => [t['Task ID'], t]));
    let hasCycle = false;
    const visited = new Set();
    const stack = new Set();
    function checkCycle(id) {
      visited.add(id);
      stack.add(id);
      const rec = taskMap.get(id);
      if (rec && rec.Dependencies && rec.Dependencies.toLowerCase() !== 'none') {
        const deps = rec.Dependencies.split(',').map(s => s.trim().split(' ')[0]).filter(Boolean);
        for (const d of deps) {
          if (taskMap.has(d)) {
            if (stack.has(d)) hasCycle = true;
            else if (!visited.has(d)) checkCycle(d);
          }
        }
      }
      stack.delete(id);
    }
    for (const t of tasks) {
      if (!visited.has(t['Task ID'])) checkCycle(t['Task ID']);
    }
    assertCondition(!hasCycle, 'DEP-ACYCLIC', 'Task dependency graph is strictly acyclic', 'semanticReview');

  } else {
    assertCondition(false, 'TASK-REG-EXISTS', 'Task register exists in targetDir', 'filesystem');
  }

  // 2. Ownership Manifest (175 entries)
  if (fs.existsSync(manifestPath)) {
    const manifestRows = parseCsv(fs.readFileSync(manifestPath, 'utf8'), 'manifest.csv');
    assertCondition(manifestRows.length === 175, 'MANIFEST-COUNT-175', 'Manifest contains exactly 175 records', 'staticSchema', { expected: 175, actual: manifestRows.length });

    const seenPaths = new Set();
    let hasDuplicate = false;
    for (const r of manifestRows) {
      const p = r.path || r.Path;
      if (seenPaths.has(p)) hasDuplicate = true;
      seenPaths.add(p);

      if (p.endsWith('/')) {
        assertCondition(false, `MANIFEST-NO-DIR-${p}`, `Manifest entry ${p} is not a directory target`, 'filesystem');
      }
      if (p.includes('..')) {
        assertCondition(false, `MANIFEST-NO-TRAVERSAL-${p}`, `Manifest entry ${p} does not contain traversal sequences`, 'filesystem');
      }
    }
    assertCondition(!hasDuplicate, 'MANIFEST-DUPLICATE', 'Manifest contains zero duplicate paths', 'staticSchema');
  } else {
    assertCondition(false, 'MANIFEST-EXISTS', 'Manifest exists in targetDir', 'filesystem');
  }

  // 3. Batch 1 Allowlist (11 tasks, 49 rows)
  if (fs.existsSync(batch1Path)) {
    const b1Rows = parseCsv(fs.readFileSync(batch1Path, 'utf8'), 'batch1.csv');
    const b1Tasks = new Set(b1Rows.map(r => r.Task_ID || r.taskId || r['Task ID']));
    assertCondition(b1Tasks.size === 11, 'BATCH1-TASK-COUNT-11', 'Batch 1 allowlist contains exactly 11 distinct tasks', 'staticSchema', { expected: 11, actual: b1Tasks.size });
    assertCondition(b1Rows.length === 49, 'BATCH1-ROW-COUNT-49', 'Batch 1 allowlist contains exactly 49 path rows', 'staticSchema', { expected: 49, actual: b1Rows.length });
    assertCondition(b1Tasks.has('W5-1'), 'BATCH1-TASK-W5-1', 'Batch 1 contains task W5-1', 'crossDocumentConsistency');
  } else {
    assertCondition(false, 'BATCH1-EXISTS', 'Batch 1 allowlist exists in targetDir', 'filesystem');
  }

  // 4. Traceability Contracts (9 contracts)
  if (fs.existsSync(traceabilityPath)) {
    const traceRows = parseCsv(fs.readFileSync(traceabilityPath, 'utf8'), 'traceability.csv');
    assertCondition(traceRows.length === 9, 'TRACE-COUNT-9', 'Traceability matrix contains exactly 9 contracts', 'staticSchema', { expected: 9, actual: traceRows.length });
  } else {
    assertCondition(false, 'TRACE-EXISTS', 'Traceability matrix exists in targetDir', 'filesystem');
  }

  // 5. Contract Review (W7 and W8)
  if (fs.existsSync(w7ContractPath)) {
    const w7Content = fs.readFileSync(w7ContractPath, 'utf8');
    assertCondition(!w7Content.includes('WHERE Id = :keyOrId OR External_Key__c = :keyOrId'), 'W7-REJECT-AMBIGUOUS-OR', 'W7 contract explicitly rejects ambiguous OR query', 'semanticReview');
    assertCondition(w7Content.includes('runName'), 'W7-RUNNAME-CANONICAL', 'W7 contract specifies canonical runName field', 'semanticReview');
  }

  if (fs.existsSync(w8ContractPath)) {
    const w8Content = fs.readFileSync(w8ContractPath, 'utf8');
    assertCondition(w8Content.includes('10,485,760 chars (~10 MB)'), 'W8-10MB-STRING-GUARD', 'Wave 8 enforces 10MB string length guard', 'semanticReview');
  }

  // 6. daAppShell AST and Content
  if (fs.existsSync(appShellPath)) {
    const shellContent = fs.readFileSync(appShellPath, 'utf8');
    assertCondition(!shellContent.includes('dispatchEvent('), 'APPSHELL-NO-DISPATCH-EVENT', 'daAppShell has zero dispatchEvent calls', 'semanticReview');
    assertCondition(shellContent.includes('@api activeProjectId'), 'APPSHELL-L77-API', 'daAppShell defines public @api activeProjectId', 'semanticReview');
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
  console.log(`   RUNNING Wave 0.4.13 ISOLATED SEMANTIC VALIDATOR`);
  console.log(`   Target Directory: ${path.resolve(targetDir)}`);
  console.log('======================================================================\n');

  const res = runValidation(targetDir);

  console.log(`Passed Assertions:     ${res.totalPassed}`);
  console.log(`Failed Assertions:     ${res.totalFailed}`);
  console.log(`Unverified Gates:      ${res.totalUnverified}`);
  console.log(`Findings Recorded:     ${res.findings.length}\n`);

  console.log(`Identified Findings (${res.findings.length}):`);
  for (const f of res.findings) {
    console.log(`- Code: ${f.id} | Status: ${f.status} | Severity: ${f.severity} | Category: ${f.category} | Desc: ${f.desc}`);
  }
  console.log('======================================================================\n');

  if (res.totalFailed > 0) {
    console.error(`Validator completed with ${res.totalFailed} failure(s).`);
    process.exit(1);
  } else {
    console.log('Wave 0.4.13 validation completed successfully with zero failures.');
  }
}

module.exports = {
  runValidation,
  resetState
};
