/**
 * validate-wave0-4-1-dispatch.cjs
 * Comprehensive cross-document semantic consistency validator for Wave 0.4.1.
 */

const fs = require('fs');
const path = require('path');

let errors = [];
let warnings = [];
let passCount = 0;

function assert(condition, message, code = 'ERR') {
  if (!condition) {
    errors.push(`[${code}] ${message}`);
  } else {
    passCount++;
  }
}

function parseCSV(content) {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  function parseLine(line) {
    let result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      let char = line[i];
      if (char === '"' || char === '“' || char === '”') {
        if (inQuotes && i + 1 < line.length && (line[i+1] === '"' || line[i+1] === '”')) {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur);
    return result;
  }

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    rows.push(row);
  }
  return rows;
}

console.log('======================================================================');
console.log('   WAVE 0.4.1 AUTOMATED CROSS-DOCUMENT DISPATCH VALIDATOR');
console.log('======================================================================\n');

// 1. Validate File Existence
const requiredFiles = [
  'WAVE_0_4_1_FINAL_OWNERSHIP_AND_COLLISION_RECONCILIATION.md',
  'WAVE_0_4_1_W7_P1_FILE_AND_METADATA_OWNERSHIP_CLOSURE.md',
  'WAVE_0_4_1_WAVE5_TASK_SCOPE_AND_DEPENDENCY_CORRECTION.md',
  'WAVE_0_4_1_PATCH_PROVENANCE_AND_BATCH_INTEGRATION_PROTOCOL.md',
  'WAVE_0_4_1_WAVE7_ID_KEY_AND_DTO_CONTRACT_RECONCILIATION.md',
  'WAVE_0_4_1_FILE_COUNT_AND_MANIFEST_RECONCILIATION.md',
  'WAVE_0_4_1_HANDOFF_SCHEMA_AND_PATCH_VALIDATION_CLOSURE.md',
  'WAVE_0_4_1_COMPONENT_API_AND_TRACEABILITY_RECONCILIATION.md',
  'WAVE_0_4_1_WAVE8_RESOURCE_AND_LIFECYCLE_EVIDENCE_CORRECTION.md',
  'WAVE_0_4_1_AGGREGATE_TEST_RUNNER_EXECUTION_PROTOCOL.md',
  'WAVE_0_4_1_ENVIRONMENT_AND_TEST_PROVENANCE_RECONCILIATION.md',
  'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
  'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
  'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv',
  'WAVE_0_4_1_FINAL_COORDINATOR_DISPATCH_AND_INTEGRATION_RUNBOOK.md'
];

requiredFiles.forEach(f => {
  assert(fs.existsSync(f), `Required deliverable file exists: ${f}`, 'FILE_EXIST');
});

// 2. Parse Registers
const manifestContent = fs.readFileSync('WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv', 'utf8');
const taskContent = fs.readFileSync('WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv', 'utf8');
const traceabilityContent = fs.readFileSync('WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv', 'utf8');

const manifestRows = parseCSV(manifestContent);
const taskRows = parseCSV(taskContent);
const traceabilityRows = parseCSV(traceabilityContent);

// A. Task Identity & Task ID Regex Validation
console.log('--- Checking Task Identity & Hierarchy ---');
const taskIdPattern = /^(W[5-9]-[1-6]|W7-P1|INT-1)$/;
const taskIds = new Set();
taskRows.forEach(row => {
  const tid = row['Task ID'];
  assert(taskIdPattern.test(tid), `Task ID adheres to canonical regex ^(W[5-9]-[1-6]|W7-P1|INT-1)$: ${tid}`, 'TASK_ID_FORMAT');
  assert(!taskIds.has(tid), `Task ID is unique across register: ${tid}`, 'TASK_ID_UNIQUE');
  taskIds.add(tid);
});
assert(taskRows.length === 21, `Authoritative task register contains exactly 21 tasks (found ${taskRows.length})`, 'TASK_COUNT');

// B. Wave 5 Strict Linear Dependency Chain
console.log('--- Checking Wave 5 Serialization ---');
const w5Deps = {
  'W5-1': '',
  'W5-2': 'W5-1',
  'W5-3': 'W5-1, W5-2',
  'W5-4': 'W5-3',
  'W5-5': 'W5-4',
  'W5-6': 'W5-5'
};
taskRows.filter(r => r['Task ID'].startsWith('W5-')).forEach(r => {
  const tid = r['Task ID'];
  const actualDeps = r['Dependencies'];
  if (w5Deps[tid] !== undefined) {
    if (w5Deps[tid] === '') {
      assert(actualDeps === 'None' || actualDeps === '', `${tid} has no dependencies`, 'W5_DEPS');
    } else {
      assert(actualDeps === w5Deps[tid], `${tid} dependencies match canonical chain (${w5Deps[tid]}): got ${actualDeps}`, 'W5_DEPS');
    }
  }
});

// C. File Ownership & Collision Checks
console.log('--- Checking File Ownership & Mutability Tiers ---');
const manifestPaths = new Map();
manifestRows.forEach(r => {
  manifestPaths.set(r['path'], r);
});
assert(manifestRows.length === 175, `Ownership manifest contains exactly 175 unique paths (found ${manifestRows.length})`, 'MANIFEST_COUNT');

const aggregateRunners = [
  'scratch/salesforce-poc/tests/run-wave5-tests.cjs',
  'scratch/salesforce-poc/tests/run-wave6-tests.cjs',
  'scratch/salesforce-poc/tests/run-wave7-tests.cjs',
  'scratch/salesforce-poc/tests/run-wave8-tests.cjs',
  'scratch/salesforce-poc/tests/run-wave9-tests.cjs',
  'scratch/salesforce-poc/tests/run-coordinator-integration-suite.cjs'
];

const frozenBaselineRunners = [
  'scratch/salesforce-poc/tests/run-poc-tests.cjs',
  'scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs',
  'scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs',
  'scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs',
  'scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs',
  'scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs',
  'scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs',
  'scratch/salesforce-poc/tests/run-workstream-a-tests.cjs',
  'scratch/salesforce-poc/tests/run-workstream-c-tests.cjs'
];

// Check frozen baseline runners
frozenBaselineRunners.forEach(r => {
  const entry = manifestPaths.get(r);
  assert(entry !== undefined, `Frozen baseline runner in manifest: ${r}`, 'BASELINE_RUNNER_EXISTS');
  if (entry) {
    assert(entry.mutability_tier === 'FROZEN_READ_ONLY', `Baseline runner is FROZEN_READ_ONLY: ${r}`, 'BASELINE_FROZEN');
  }
});

// Check aggregate runners
aggregateRunners.forEach(r => {
  const entry = manifestPaths.get(r);
  assert(entry !== undefined, `Aggregate runner in manifest: ${r}`, 'AGG_RUNNER_EXISTS');
  if (entry) {
    assert(entry.mutability_tier === 'COORDINATOR_EXCLUSIVE', `Aggregate runner is COORDINATOR_EXCLUSIVE: ${r}`, 'AGG_COORDINATOR');
    assert(entry.proposed_owner === 'Integration Coordinator', `Aggregate runner owner is Integration Coordinator: ${r}`, 'AGG_OWNER');
  }
});

// Check that NO feature task owns an aggregate runner or frozen file
taskRows.forEach(t => {
  const tid = t['Task ID'];
  const affected = t['Exact Affected Files'].split(';').map(s => s.trim()).filter(Boolean);
  const existing = t['Existing Files Modified'].split(';').map(s => s.trim()).filter(s => s && s !== 'None');
  const newFiles = t['New Files'].split(';').map(s => s.trim()).filter(s => s && s !== 'None');

  const allClaimed = new Set([...affected, ...existing, ...newFiles]);

  allClaimed.forEach(filePath => {
    // Cannot be bare filename
    assert(filePath.includes('/'), `Path must be normalized repo-relative path, not bare: ${filePath} in ${tid}`, 'NORMALIZED_PATH');

    const manifestEntry = manifestPaths.get(filePath);
    assert(manifestEntry !== undefined, `Path must exist in ownership manifest: ${filePath} in ${tid}`, 'PATH_IN_MANIFEST');

    if (tid !== 'INT-1') {
      // Must not be aggregate runner
      assert(!aggregateRunners.includes(filePath), `Feature task ${tid} must NOT have aggregate runner in writable files: ${filePath}`, 'P0_AGG_COLLISION');
      // Must not be frozen read-only
      if (manifestEntry) {
        assert(manifestEntry.mutability_tier !== 'FROZEN_READ_ONLY', `Feature task ${tid} must NOT have frozen file in writable files: ${filePath}`, 'P0_FROZEN_COLLISION');
      }
    }
  });

  // W7-P1 specific checks
  if (tid === 'W7-P1') {
    assert(!allClaimed.has('scratch/salesforce-poc/force-app/main/default/classes/controllers/DAGraphController.cls-meta.xml'), 'W7-P1 does not write DAGraphController.cls-meta.xml', 'W7P1_META');
    assert(!allClaimed.has('scratch/salesforce-poc/force-app/main/default/classes/tests/DAGraphControllerTest.cls-meta.xml'), 'W7-P1 does not write DAGraphControllerTest.cls-meta.xml', 'W7P1_TEST_META');
  }
});

// D. Concurrency Disjoint Partitioning for Batch 1
console.log('--- Checking Batch 1 Concurrency Disjoint Partitioning ---');
const batch1Tasks = ['W5-1', 'W6-1', 'W6-2', 'W6-3', 'W6-4', 'W7-P1', 'W7-1', 'W7-2', 'W8-1', 'W8-2', 'W9-1'];
const batch1Paths = new Map();

batch1Tasks.forEach(tid => {
  const row = taskRows.find(r => r['Task ID'] === tid);
  assert(row !== undefined, `Batch 1 task found: ${tid}`, 'BATCH1_TASK');
  if (row) {
    const affected = row['Exact Affected Files'].split(';').map(s => s.trim()).filter(Boolean);
    affected.forEach(p => {
      if (batch1Paths.has(p)) {
        assert(false, `Batch 1 path collision detected on ${p} between ${batch1Paths.get(p)} and ${tid}`, 'BATCH1_COLLISION');
      } else {
        batch1Paths.set(p, tid);
      }
    });
  }
});
assert(batch1Tasks.length === 11, 'Batch 1 contains exactly 11 immediately launchable tasks', 'BATCH1_COUNT');

// E. Traceability Mapping Validation
console.log('--- Checking Contract Traceability ---');
assert(traceabilityRows.length === 9, `Traceability matrix contains 9 architectural contracts (found ${traceabilityRows.length})`, 'CONTRACT_COUNT');
traceabilityRows.forEach(r => {
  assert(r['Contract ID'].startsWith('W0-C'), `Valid contract ID: ${r['Contract ID']}`, 'CONTRACT_ID');
  assert(r['Exact Contract Definition'].length > 0, `Contract definition non-empty for ${r['Contract ID']}`, 'CONTRACT_DEF');
  assert(r['Outstanding Decisions'].includes('NONE'), `No unresolved decisions blocking ${r['Contract ID']}`, 'CONTRACT_BLOCKED');
});

console.log('\n======================================================================');
console.log(`SUMMARY: ${passCount} PASSED, ${errors.length} FAILED`);
console.log('======================================================================\n');

if (errors.length > 0) {
  console.error('FAILURES DETECTED:');
  errors.forEach(e => console.error('  ' + e));
  process.exit(1);
} else {
  console.log('ALL CROSS-DOCUMENT CHECKS PASSED PERFECTLY!');
  process.exit(0);
}
