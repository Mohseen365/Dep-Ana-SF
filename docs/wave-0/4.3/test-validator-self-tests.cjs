/**
 * test-validator-self-tests.cjs
 * Comprehensive 32+ defect class self-test suite for Wave 0.4.3 Validator.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { runValidation } = require('./validate-wave0-4-3-dispatch.cjs');

const repoRoot = path.resolve(__dirname, '../../..');

const manifestTemplate = fs.readFileSync(path.resolve(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'utf8');
const taskTemplate = fs.readFileSync(path.resolve(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), 'utf8');
const traceTemplate = fs.readFileSync(path.resolve(repoRoot, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv'), 'utf8');

function setupSandbox(customManifest, customTask, customTrace) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w043-val-sandbox-'));

  fs.writeFileSync(path.join(tmpDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), customManifest || manifestTemplate);
  fs.writeFileSync(path.join(tmpDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), customTask || taskTemplate);
  fs.writeFileSync(path.join(tmpDir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv'), customTrace || traceTemplate);

  const docsTarget = path.join(tmpDir, 'docs/wave-0/4.2');
  fs.mkdirSync(docsTarget, { recursive: true });
  const docsSrc = path.join(repoRoot, 'docs/wave-0/4.2');
  if (fs.existsSync(docsSrc)) {
    for (const f of fs.readdirSync(docsSrc)) {
      fs.copyFileSync(path.join(docsSrc, f), path.join(docsTarget, f));
    }
  }

  return tmpDir;
}

function cleanupSandbox(tmpDir) {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const defectScenarios = [
  {
    id: 'DEF-01',
    name: 'Missing task W5-1',
    mutateTask: content => content.replace(/^W5-1,.*$/m, ''),
    expectedFail: true
  },
  {
    id: 'DEF-02',
    name: 'Extra unauthorized task W10-1',
    mutateTask: content => content + '\nW10-1,Wave 10,Extra Task,Workstream X,foo.js,foo.js,None,Agent X,None,None,test.cjs,test.cjs,Accept,Handoff,READY_TO_LAUNCH,None',
    expectedFail: true
  },
  {
    id: 'DEF-03',
    name: 'Duplicate task W6-1',
    mutateTask: content => content.replace('W6-2,Wave 6', 'W6-1,Wave 6'),
    expectedFail: true
  },
  {
    id: 'DEF-04',
    name: 'Invalid task dependency on non-existent W99-9',
    mutateTask: content => content.replace(/W7-1,([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),None,/, "W7-1,$1,$2,$3,$4,$5,$6,$7,$8,W99-9,"),
    expectedFail: true
  },
  {
    id: 'DEF-05',
    name: 'Dependency cycle between W6-1 and W6-2',
    mutateTask: content => content
      .replace(/W6-1,([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),None,/, "W6-1,$1,$2,$3,$4,$5,$6,$7,$8,W6-2,")
      .replace(/W6-2,([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),None,/, "W6-2,$1,$2,$3,$4,$5,$6,$7,$8,W6-1,"),
    expectedFail: true
  },
  {
    id: 'DEF-06',
    name: 'Task self-dependency W7-1 on W7-1',
    mutateTask: content => content.replace(/W7-1,([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),None,/, "W7-1,$1,$2,$3,$4,$5,$6,$7,$8,W7-1,"),
    expectedFail: true
  },
  {
    id: 'DEF-07',
    name: 'Duplicate manifest path',
    mutateManifest: content => content + '\nscratch/salesforce-poc/tests/run-poc-tests.cjs,test,EXISTING,Integration Coordinator,Integration Coordinator,Baseline,FROZEN_READ_ONLY,NONE,TRUE,FALSE',
    expectedFail: true
  },
  {
    id: 'DEF-08',
    name: 'Windows drive-qualified path in manifest',
    mutateManifest: content => content + '\nC:/repo/scratch/test.js,source,NEW,Workstream B,Workstream B,W6-1,TASK_EXCLUSIVE,NONE,FALSE,FALSE',
    expectedFail: true
  },
  {
    id: 'DEF-09',
    name: 'UNC path in manifest',
    mutateManifest: content => content + '\n\\\\server\\share\\test.js,source,NEW,Workstream B,Workstream B,W6-1,TASK_EXCLUSIVE,NONE,FALSE,FALSE',
    expectedFail: true
  },
  {
    id: 'DEF-10',
    name: 'Traversal path segment in manifest',
    mutateManifest: content => content + '\nscratch/../secret.txt,source,NEW,Workstream B,Workstream B,W6-1,TASK_EXCLUSIVE,NONE,FALSE,FALSE',
    expectedFail: true
  },
  {
    id: 'DEF-11',
    name: 'Feature task modifies frozen runner',
    mutateTask: content => content.replace('scratch/salesforce-poc/tests/run-w6-1-tests.cjs', 'scratch/salesforce-poc/tests/run-poc-tests.cjs'),
    expectedFail: true
  },
  {
    id: 'DEF-12',
    name: 'Feature task modifies coordinator-only aggregate runner',
    mutateTask: content => content.replace('scratch/salesforce-poc/tests/run-w6-1-tests.cjs', 'scratch/salesforce-poc/tests/run-wave6-tests.cjs'),
    expectedFail: true
  },
  {
    id: 'DEF-13',
    name: 'Missing contract ID W0-C1 in traceability',
    mutateTrace: content => content.replace(/^W0-C1,.*$/m, ''),
    expectedFail: true
  },
  {
    id: 'DEF-14',
    name: 'Duplicate contract ID W0-C2',
    mutateTrace: content => content.replace('W0-C3,', 'W0-C2,'),
    expectedFail: true
  },
  {
    id: 'DEF-15',
    name: 'Contract status non-frozen',
    mutateTrace: content => content.replace('FROZEN', 'DRAFT_UNAPPROVED'),
    expectedFail: true
  },
  {
    id: 'DEF-16',
    name: 'Outstanding decision present on frozen contract',
    mutateTrace: content => content.replace('NONE (summary discrepancy resolved as typographical shorthand)', 'DECISION_PENDING_REVIEW'),
    expectedFail: true
  },
  {
    id: 'DEF-17',
    name: 'Task affected files union mismatch (extra file in union)',
    mutateTask: content => content.replace('scratch/salesforce-poc/tests/run-w6-1-tests.cjs,None,Workstream B Lead', 'scratch/salesforce-poc/tests/run-w6-1-tests.cjs;scratch/extra.js,None,Workstream B Lead'),
    expectedFail: true
  },
  {
    id: 'DEF-18',
    name: 'Unknown task path not in manifest',
    mutateTask: content => content.replace('scratch/salesforce-poc/tests/run-w6-1-tests.cjs', 'scratch/salesforce-poc/tests/run-unknown.cjs'),
    expectedFail: true
  },
  {
    id: 'DEF-19',
    name: 'Dot segment path in manifest (./path)',
    mutateManifest: content => content + '\n./scratch/salesforce-poc/test.js,source,NEW,Workstream B,Workstream B,W6-1,TASK_EXCLUSIVE,NONE,FALSE,FALSE',
    expectedFail: true
  },
  {
    id: 'DEF-20',
    name: 'Backslash path separator in manifest',
    mutateManifest: content => content + '\nscratch\\salesforce-poc\\test.js,source,NEW,Workstream B,Workstream B,W6-1,TASK_EXCLUSIVE,NONE,FALSE,FALSE',
    expectedFail: true
  },
  {
    id: 'DEF-21',
    name: 'Empty manifest path row',
    mutateManifest: content => content + '\n,source,NEW,Workstream B,Workstream B,W6-1,TASK_EXCLUSIVE,NONE,FALSE,FALSE',
    expectedFail: true
  },
  {
    id: 'DEF-22',
    name: 'Empty task ID row',
    mutateTask: content => content + '\n,Wave 6,Desc,Workstream B,foo.js,foo.js,None,Owner,None,None,test.cjs,test.cjs,Acc,Hand,READY_TO_LAUNCH,None',
    expectedFail: true
  },
  {
    id: 'DEF-23',
    name: 'Contract missing exact definition',
    mutateTrace: content => content.replace(/W0-C1,[^,]+,/, 'W0-C1,,'),
    expectedFail: true
  },
  {
    id: 'DEF-24',
    name: 'Broken Wave 5 serialized chain (W5-3 does not depend on W5-2)',
    mutateTask: content => content.replace('W5-1, W5-2', 'W5-1'),
    expectedFail: true
  },
  {
    id: 'DEF-25',
    name: 'Manifest row count less than 175',
    mutateManifest: content => content.split('\n').slice(0, 100).join('\n'),
    expectedFail: true
  },
  {
    id: 'DEF-26',
    name: 'Task register count less than 21',
    mutateTask: content => content.split('\n').slice(0, 15).join('\n'),
    expectedFail: true
  },
  {
    id: 'DEF-27',
    name: 'Traceability matrix count less than 9',
    mutateTrace: content => content.split('\n').slice(0, 5).join('\n'),
    expectedFail: true
  },
  {
    id: 'DEF-28',
    name: 'Absolute path starting with slash in manifest',
    mutateManifest: content => content + '\n/scratch/salesforce-poc/test.js,source,NEW,Workstream B,Workstream B,W6-1,TASK_EXCLUSIVE,NONE,FALSE,FALSE',
    expectedFail: true
  },
  {
    id: 'DEF-29',
    name: 'Existing file count mismatch in manifest',
    mutateManifest: content => content.replace('EXISTING', 'NEW'),
    expectedFail: true
  },
  {
    id: 'DEF-30',
    name: 'New file count mismatch in manifest',
    mutateManifest: content => content.replace('NEW', 'EXISTING'),
    expectedFail: true
  },
  {
    id: 'DEF-31',
    name: 'Contract ID missing prefix W0-C',
    mutateTrace: content => content.replace('W0-C1,', 'C1,'),
    expectedFail: true
  },
  {
    id: 'DEF-32',
    name: 'Duplicate contract ID in traceability',
    mutateTrace: content => content.replace('W0-C9,', 'W0-C8,'),
    expectedFail: true
  }
];

function runSweep(sweepNum) {
  console.log(`\n==================================================`);
  console.log(`   RUNNING VALIDATOR SELF-TEST SWEEP ${sweepNum}/3`);
  console.log(`==================================================`);

  let sweepPass = 0;
  let sweepFail = 0;
  const sweepResults = [];

  const cleanBox = setupSandbox();
  try {
    const res = runValidation({ targetDir: cleanBox, isSelfTest: true });
    assert(res.totalFailed === 0, `Clean sandbox must pass zero errors (had ${res.totalFailed})`);
    sweepPass++;
    sweepResults.push({ id: 'BASE-CLEAN', name: 'Baseline Clean Fixture', passed: true, details: '0 errors' });
  } catch (err) {
    sweepFail++;
    sweepResults.push({ id: 'BASE-CLEAN', name: 'Baseline Clean Fixture', passed: false, details: err.message });
  } finally {
    cleanupSandbox(cleanBox);
  }

  for (const def of defectScenarios) {
    const sBox = setupSandbox(
      def.mutateManifest ? def.mutateManifest(manifestTemplate) : manifestTemplate,
      def.mutateTask ? def.mutateTask(taskTemplate) : taskTemplate,
      def.mutateTrace ? def.mutateTrace(traceTemplate) : traceTemplate
    );

    try {
      const res = runValidation({ targetDir: sBox, isSelfTest: true });
      if (def.expectedFail) {
        if (res.totalFailed > 0) {
          sweepPass++;
          sweepResults.push({ id: def.id, name: def.name, passed: true, details: `Successfully caught ${res.totalFailed} failure(s)` });
        } else {
          sweepFail++;
          sweepResults.push({ id: def.id, name: def.name, passed: false, details: 'Expected validator to fail, but it passed!' });
        }
      } else {
        if (res.totalFailed === 0) {
          sweepPass++;
          sweepResults.push({ id: def.id, name: def.name, passed: true, details: 'Passed as expected' });
        } else {
          sweepFail++;
          sweepResults.push({ id: def.id, name: def.name, passed: false, details: `Failed with ${res.totalFailed} errors` });
        }
      }
    } catch (err) {
      if (def.expectedFail) {
        sweepPass++;
        sweepResults.push({ id: def.id, name: def.name, passed: true, details: `Caught exception: ${err.message}` });
      } else {
        sweepFail++;
        sweepResults.push({ id: def.id, name: def.name, passed: false, details: err.message });
      }
    } finally {
      cleanupSandbox(sBox);
    }
  }

  console.log(`Sweep ${sweepNum} Result: ${sweepPass} PASSED, ${sweepFail} FAILED out of ${sweepResults.length} cases.`);
  return { sweepNum, sweepPass, sweepFail, sweepResults };
}

const sweep1 = runSweep(1);
const sweep2 = runSweep(2);
const sweep3 = runSweep(3);

console.log('\n==================================================');
console.log('   SELF-TEST REPRODUCIBILITY SUMMARY (3 RUNS)');
console.log('==================================================');
console.log(`Run 1: ${sweep1.sweepPass}/${sweep1.sweepResults.length} passed`);
console.log(`Run 2: ${sweep2.sweepPass}/${sweep2.sweepResults.length} passed`);
console.log(`Run 3: ${sweep3.sweepPass}/${sweep3.sweepResults.length} passed`);

const consistent = (sweep1.sweepPass === sweep2.sweepPass && sweep2.sweepPass === sweep3.sweepPass && sweep1.sweepFail === 0);
console.log(`Run-to-run consistency across all 3 sweeps: ${consistent ? '100% (No variation observed across 3 runs)' : 'VARIATION OBSERVED'}`);

const registerHeader = 'Test_ID,Scenario_Name,Expected_Result,Run1_Status,Run2_Status,Run3_Status,Consistent\n';
const registerRows = sweep1.sweepResults.map((r, idx) => {
  const r2 = sweep2.sweepResults[idx];
  const r3 = sweep3.sweepResults[idx];
  const isConsistent = (r.passed === r2.passed && r2.passed === r3.passed);
  return `${r.id},"${r.name}",EXPECTED_REJECTION,${r.passed ? 'PASS' : 'FAIL'},${r2.passed ? 'PASS' : 'FAIL'},${r3.passed ? 'PASS' : 'FAIL'},${isConsistent ? 'TRUE' : 'FALSE'}`;
}).join('\n');

fs.writeFileSync('docs/wave-0/4.3/WAVE_0_4_3_VALIDATOR_SELF_TEST_REGISTER.csv', registerHeader + registerRows + '\n');

if (!consistent) {
  process.exit(1);
}
