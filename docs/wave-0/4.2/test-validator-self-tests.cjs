#!/usr/bin/env node
/**
 * test-validator-self-tests.cjs
 * Self-test suite for validate-wave0-4-2-dispatch.cjs.
 * Verifies that the validator correctly rejects intentionally defective fixtures across 16 scenarios:
 * 1. Duplicate manifest paths
 * 2. Missing task IDs
 * 3. Invented task IDs
 * 4. Duplicate task IDs
 * 5. Missing dependencies
 * 6. Dependency cycles
 * 7. Frozen-file ownership violations
 * 8. Coordinator-owned file violations
 * 9. Incorrect new/existing classification
 * 10. Inconsistent exact-affected-file unions
 * 11. Batch 1 path collisions
 * 12. Non-ready Batch 1 tasks
 * 13. Invalid contract references
 * 14. Malformed CSV (unclosed quotes)
 * 15. Multiline quoted CSV fields parsed incorrectly
 * 16. Missing required evidence files
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseRFC4180CSV, runValidation } = require('./validate-wave0-4-2-dispatch.cjs');

console.log('======================================================================');
console.log('   WAVE 0.4.2 VALIDATOR SELF-TEST SUITE (16 DEFECT SCENARIOS)');
console.log('======================================================================\n');

let selfTestsPassed = 0;
let selfTestsFailed = 0;

function assertSelfTest(name, passed, details = '') {
  if (passed) {
    console.log(`[PASS] ${name}`);
    selfTestsPassed++;
  } else {
    console.error(`[FAIL] ${name}: ${details}`);
    selfTestsFailed++;
  }
}

// 1. CSV Parser Unit Tests
console.log('--- Testing RFC 4180 CSV Parser Edge Cases ---');

// Test 14: Malformed CSV with unclosed quotes
try {
  parseRFC4180CSV('col1,col2\nval1,"unclosed quote', 'test-unclosed');
  assertSelfTest('Scenario 14: Rejection of unclosed quotes in CSV', false, 'Expected error not thrown');
} catch (e) {
  assertSelfTest('Scenario 14: Rejection of unclosed quotes in CSV', e.message.includes('unclosed quote'), e.message);
}

// Inconsistent column counts
try {
  parseRFC4180CSV('col1,col2\nval1,val2,val3\n', 'test-cols');
  assertSelfTest('Scenario 14b: Inconsistent column counts detected', false, 'Expected error not thrown');
} catch (e) {
  assertSelfTest('Scenario 14b: Inconsistent column counts detected', e.message.includes('Inconsistent column count'), e.message);
}

// Test 15: Multiline quoted CSV fields
const multilineCSV = 'id,description\n1,"First line\nSecond line\nThird line"\n2,Simple field';
const parsedMulti = parseRFC4180CSV(multilineCSV, 'test-multiline');
assertSelfTest('Scenario 15: Multiline quoted CSV fields parsed into exact record count',
  parsedMulti.length === 2 && parsedMulti[0].description === 'First line\nSecond line\nThird line' && parsedMulti[1].description === 'Simple field',
  `Got length ${parsedMulti.length}`);

// Escaped quotes & commas inside quotes
const escapedQuoteCSV = 'id,value\n1,"Hello, ""World"""\n';
const parsedEscaped = parseRFC4180CSV(escapedQuoteCSV, 'test-escaped');
assertSelfTest('Scenario 15b: Escaped double quotes and commas preserved cleanly',
  parsedEscaped.length === 1 && parsedEscaped[0].value === 'Hello, "World"',
  `Got value: ${parsedEscaped[0]?.value}`);


// Helper to set up a clean fixture sandbox
function setupSandbox() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-sandbox-'));

  // Copy authoritative files to sandbox
  const filesToCopy = [
    'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv',
    'WAVE_0_4_1_FINAL_COORDINATOR_DISPATCH_AND_INTEGRATION_RUNBOOK.md'
  ];
  filesToCopy.forEach(f => {
    fs.copyFileSync(path.resolve(process.cwd(), f), path.join(tmpDir, f));
  });

  // Create docs/wave-0/4.2 in sandbox
  const subDocs = path.join(tmpDir, 'docs/wave-0/4.2');
  fs.mkdirSync(subDocs, { recursive: true });

  const docFiles = [
    'WAVE_0_4_2_EXECUTION_BASELINE_AND_INPUT_INVENTORY.md',
    'WAVE_0_4_2_W7_PROJECT_ID_AND_EXTERNAL_KEY_RESOLUTION_CONTRACT.md',
    'WAVE_0_4_2_PATCH_INTEGRATION_AND_COLLISION_CONTROL_PROTOCOL.md',
    'WAVE_0_4_2_W8_RESOURCE_AND_ASYNC_LIFECYCLE_EVIDENCE.md',
    'WAVE_0_4_2_COMPONENT_API_AND_TRACEABILITY_RECONCILIATION.md',
    'WAVE_0_4_2_BASELINE_TEST_PROVENANCE_AND_REPRODUCIBILITY_REPORT.md',
    'WAVE_0_4_2_PATCH_SCENARIO_EVIDENCE_REGISTER.csv'
  ];
  docFiles.forEach(f => {
    fs.copyFileSync(path.resolve(process.cwd(), 'docs/wave-0/4.2', f), path.join(subDocs, f));
  });

  return tmpDir;
}

console.log('\n--- Testing Validator Rejections on Defective Sandbox Fixtures ---');

// Base clean test
const cleanBox = setupSandbox();
const cleanRes = runValidation({ repoRoot: cleanBox });
assertSelfTest('Base clean fixtures pass with zero errors', cleanRes.totalFailed === 0, `Expected 0 errors, got ${cleanRes.totalFailed}`);
fs.rmSync(cleanBox, { recursive: true, force: true });

// Scenario 1: Duplicate manifest paths
const sb1 = setupSandbox();
const manifest1 = fs.readFileSync(path.join(sb1, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'utf8');
fs.appendFileSync(path.join(sb1, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), '\nscratch/salesforce-poc/sfdx-project.json,ProjectConfig,EXISTING,Repository Baseline,Repository Baseline,None,FROZEN_READ_ONLY,NONE,NO,NO');
const res1 = runValidation({ repoRoot: sb1 });
assertSelfTest('Scenario 1: Reject duplicate manifest paths', res1.errors.some(e => e.includes('MANIFEST_PATH_UNIQUE')), 'Did not catch duplicate manifest path');
fs.rmSync(sb1, { recursive: true, force: true });

// Scenario 2: Missing task ID
const sb2 = setupSandbox();
let task2 = fs.readFileSync(path.join(sb2, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'utf8');
task2 = task2.replace(/^W5-1,.*$/m, ''); // remove W5-1 row
fs.writeFileSync(path.join(sb2, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), task2);
const res2 = runValidation({ repoRoot: sb2 });
assertSelfTest('Scenario 2: Reject missing mandatory task ID', res2.errors.some(e => e.includes('MANDATORY_TASK_PRESENT')), 'Did not catch missing task');
fs.rmSync(sb2, { recursive: true, force: true });

// Scenario 3: Invented task ID (e.g. W7-4, W8-5)
const sb3 = setupSandbox();
const inventedRow = 'W7-4,Wave 7,Invented Task,Workstream C,scratch/salesforce-poc/tests/run-w7-4-tests.cjs,scratch/salesforce-poc/tests/run-w7-4-tests.cjs,,Workstream C,NONE,None,test,test,criteria,handoff,READY_TO_LAUNCH,None';
fs.appendFileSync(path.join(sb3, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), '\n' + inventedRow);
const res3 = runValidation({ repoRoot: sb3 });
assertSelfTest('Scenario 3: Reject invented task ID W7-4', res3.errors.some(e => e.includes('TASK_ID_ALLOWLIST') && e.includes('W7-4')), 'Did not reject invented task ID');
fs.rmSync(sb3, { recursive: true, force: true });

// Scenario 4: Duplicate task ID
const sb4 = setupSandbox();
const dupTaskRow = 'W6-1,Wave 6,Duplicate Task,Workstream B,scratch/salesforce-poc/tests/run-w6-1-tests.cjs,scratch/salesforce-poc/tests/run-w6-1-tests.cjs,,Workstream B,NONE,None,test,test,criteria,handoff,READY_TO_LAUNCH,None';
fs.appendFileSync(path.join(sb4, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), '\n' + dupTaskRow);
const res4 = runValidation({ repoRoot: sb4 });
assertSelfTest('Scenario 4: Reject duplicate task ID W6-1', res4.errors.some(e => e.includes('TASK_ID_UNIQUE')), 'Did not reject duplicate task ID');
fs.rmSync(sb4, { recursive: true, force: true });

// Scenario 5: Missing dependency reference
const sb5 = setupSandbox();
let task5 = fs.readFileSync(path.join(sb5, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'utf8');
task5 = task5.replace(/W5-2,Wave 5,([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),W5-1,/, 'W5-2,Wave 5,$1,$2,$3,$4,$5,$6,$7,NONEXISTENT_TASK,');
fs.writeFileSync(path.join(sb5, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), task5);
const res5 = runValidation({ repoRoot: sb5 });
assertSelfTest('Scenario 5: Reject missing dependency reference', res5.errors.some(e => e.includes('DEP_EXISTS')), 'Did not catch non-existent dependency');
fs.rmSync(sb5, { recursive: true, force: true });

// Scenario 6: Dependency cycles (W5-1 depending on W5-2 while W5-2 depends on W5-1)
const sb6 = setupSandbox();
let task6 = fs.readFileSync(path.join(sb6, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'utf8');
task6 = task6.replace('SERIALIZED_OR_BUNDLED (daGraphViewer shared with W5-2..W5-6),None,',
                       'SERIALIZED_OR_BUNDLED (daGraphViewer shared with W5-2..W5-6),W5-2,');
fs.writeFileSync(path.join(sb6, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), task6);
const res6 = runValidation({ repoRoot: sb6 });
assertSelfTest('Scenario 6: Detect dependency cycle', res6.errors.some(e => e.includes('NO_DEP_CYCLES') || e.includes('Cycle detected')), 'Did not catch dependency cycle');
fs.rmSync(sb6, { recursive: true, force: true });

// Scenario 7: Frozen-file ownership violation
const sb7 = setupSandbox();
let task7 = fs.readFileSync(path.join(sb7, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'utf8');
task7 = task7.replace('run-w6-1-tests.cjs', 'run-poc-tests.cjs');
fs.writeFileSync(path.join(sb7, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), task7);
const res7 = runValidation({ repoRoot: sb7 });
assertSelfTest('Scenario 7: Reject feature task modifying FROZEN_READ_ONLY file', res7.errors.some(e => e.includes('NO_FROZEN_MOD')), 'Did not reject frozen file modification');
fs.rmSync(sb7, { recursive: true, force: true });

// Scenario 8: Coordinator-owned file violation
const sb8 = setupSandbox();
let task8 = fs.readFileSync(path.join(sb8, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'utf8');
task8 = task8.replace('run-w6-1-tests.cjs', 'run-wave6-tests.cjs');
fs.writeFileSync(path.join(sb8, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), task8);
const res8 = runValidation({ repoRoot: sb8 });
assertSelfTest('Scenario 8: Reject feature task modifying coordinator-exclusive aggregate runner', res8.errors.some(e => e.includes('NO_COORD_MOD') || e.includes('NO_AGG_RUNNER_TOUCH')), 'Did not reject aggregate runner touch');
fs.rmSync(sb8, { recursive: true, force: true });

// Scenario 9: Incorrect new/existing classification
const sb9 = setupSandbox();
let task9 = fs.readFileSync(path.join(sb9, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'utf8');
// In W6-1, mark an existing file as new
task9 = task9.replace('scratch/salesforce-poc/tests/run-w6-1-tests.cjs,None', 'scratch/salesforce-poc/sfdx-project.json,None');
task9 = task9.replace('scratch/salesforce-poc/tests/run-w6-1-tests.cjs;', 'scratch/salesforce-poc/sfdx-project.json;');
fs.writeFileSync(path.join(sb9, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), task9);
const res9 = runValidation({ repoRoot: sb9 });
assertSelfTest('Scenario 9: Reject incorrect new/existing file classification', res9.errors.some(e => e.includes('NEW_FILE_STATUS')), 'Did not catch existing file declared as new');
fs.rmSync(sb9, { recursive: true, force: true });

// Scenario 10: Inconsistent exact-affected-file unions
const sb10 = setupSandbox();
let task10 = fs.readFileSync(path.join(sb10, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'utf8');
// Alter Exact Affected Files for W6-2 by removing files from the Exact Affected column while leaving them in New Files
task10 = task10.replace(
  'scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.js; scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.html; scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.css; scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.js-meta.xml; scratch/salesforce-poc/tests/run-w6-2-tests.cjs,scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.js',
  'scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.js,scratch/salesforce-poc/force-app/main/default/lwc/daTreemapView/daTreemapView.js'
);
fs.writeFileSync(path.join(sb10, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), task10);
const res10 = runValidation({ repoRoot: sb10 });
assertSelfTest('Scenario 10: Detect Exact Affected Files union inequality', res10.errors.some(e => e.includes('FILE_UNION_EQUALITY')), 'Did not catch union inequality');
fs.rmSync(sb10, { recursive: true, force: true });

// Scenario 11: Batch 1 path collisions
const sb11 = setupSandbox();
let task11 = fs.readFileSync(path.join(sb11, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'utf8');
// Give W6-2 a file owned by W6-1
task11 = task11.replace('scratch/salesforce-poc/tests/run-w6-2-tests.cjs', 'scratch/salesforce-poc/tests/run-w6-1-tests.cjs');
fs.writeFileSync(path.join(sb11, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), task11);
const res11 = runValidation({ repoRoot: sb11 });
assertSelfTest('Scenario 11: Detect Batch 1 concurrent path collision', res11.errors.some(e => e.includes('BATCH1_ZERO_COLLISION')), 'Did not catch Batch 1 path collision');
fs.rmSync(sb11, { recursive: true, force: true });

// Scenario 12: Non-ready Batch 1 tasks
const sb12 = setupSandbox();
let task12 = fs.readFileSync(path.join(sb12, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'utf8');
task12 = task12.replace('W6-3,Wave 6,Subway View Component,Workstream B,', 'W6-3,Wave 6,Subway View Component,Workstream B,');
task12 = task12.replace(',READY_TO_LAUNCH,Isolated new component bundle.', ',BLOCKED_NOT_READY,Isolated new component bundle.');
fs.writeFileSync(path.join(sb12, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), task12);
const res12 = runValidation({ repoRoot: sb12 });
assertSelfTest('Scenario 12: Reject non-ready task declared in Batch 1', res12.errors.some(e => e.includes('BATCH1_STATUS_READY')), 'Did not reject non-ready Batch 1 task');
fs.rmSync(sb12, { recursive: true, force: true });

// Scenario 13: Invalid contract references
const sb13 = setupSandbox();
let trace13 = fs.readFileSync(path.join(sb13, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv'), 'utf8');
trace13 = trace13.replace('W0-C1', 'INVALID-C1');
fs.writeFileSync(path.join(sb13, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv'), trace13);
const res13 = runValidation({ repoRoot: sb13 });
assertSelfTest('Scenario 13: Reject malformed contract ID prefix', res13.errors.some(e => e.includes('CONTRACT_ID_PREFIX')), 'Did not catch invalid contract ID');
fs.rmSync(sb13, { recursive: true, force: true });

// Scenario 16: Missing required evidence files
const sb16 = setupSandbox();
fs.rmSync(path.join(sb16, 'docs/wave-0/4.2/WAVE_0_4_2_W7_PROJECT_ID_AND_EXTERNAL_KEY_RESOLUTION_CONTRACT.md'));
const res16 = runValidation({ repoRoot: sb16 });
assertSelfTest('Scenario 16: Reject missing mandatory deliverable file', res16.errors.some(e => e.includes('FILE_EXISTS')), 'Did not catch missing deliverable file');
fs.rmSync(sb16, { recursive: true, force: true });

console.log('\n======================================================================');
console.log(`SELF-TEST RESULTS: ${selfTestsPassed} PASSED, ${selfTestsFailed} FAILED`);
console.log('======================================================================\n');

if (selfTestsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
