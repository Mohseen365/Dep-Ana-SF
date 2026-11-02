/**
 * run-mutation-suite.cjs - Wave 0.4.8
 * Mutation test suite asserting exact semantic finding set equality.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { runValidation } = require('./validate-wave0-4-8-dispatch.cjs');

console.log('Running Isolated Mutation Test Suite (20+ Cases across 3 Runs)...');

const repoRoot = path.resolve(__dirname, '../../..');

function createPristineFixture() {
  const dir = fs.mkdtempSync(path.join('/tmp', 'mut-fixture-'));
  fs.copyFileSync(path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'));
  fs.copyFileSync(path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'));
  fs.copyFileSync(path.join(repoRoot, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv'), path.join(dir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv'));
  fs.mkdirSync(path.join(dir, 'docs/wave-0/4.4'), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), path.join(dir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));
  fs.copyFileSync(path.join(repoRoot, 'WAVE_0_4_8_JULES_DISPATCH_PROMPT_SINGLE_FILE.md'), path.join(dir, 'WAVE_0_4_8_JULES_DISPATCH_PROMPT_SINGLE_FILE.md'));

  const { parseStrictCSVToObjects } = require('./strict-rfc4180-csv-parser.cjs');
  const manifest = parseStrictCSVToObjects(fs.readFileSync(path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'utf8'));
  for (const m of manifest) {
    if (m.status === 'EXISTING') {
      const full = path.join(dir, m.path);
      if (!fs.existsSync(full)) {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, 'baseline stub');
      }
    }
  }

  return dir;
}

const mutationDefinitions = [
  {
    id: 'MUT-01',
    description: 'Append syntactically valid complete task row to task register (task count exceeds 21)',
    expectedFindingIds: ['TASK_REGISTER_COUNT_21'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      const validRow = 'W99-1,Wave 99,Extra Task,Workstream Z,scratch/salesforce-poc/tests/run-poc-tests.cjs,scratch/salesforce-poc/tests/run-poc-tests.cjs,None,Workstream Z Lead,None,None,node scratch/fake.cjs,None,Criteria,Artifacts,READY,Valid extra row\n';
      fs.appendFileSync(p, validRow);
    }
  },
  {
    id: 'MUT-02',
    description: 'Delete one task row from task register (task count 20)',
    expectedFindingIds: ['TASK_REGISTER_COUNT_21'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
      lines.splice(lines.length - 2, 1);
      fs.writeFileSync(p, lines.join('\n') + '\n');
    }
  },
  {
    id: 'MUT-03',
    description: 'Remove task register file completely',
    expectedFindingIds: ['FILE_EXISTS_TASK_REGISTER'],
    apply: (fixtureDir) => {
      fs.unlinkSync(path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'));
    }
  },
  {
    id: 'MUT-04',
    description: 'Remove ownership manifest file completely',
    expectedFindingIds: ['FILE_EXISTS_MANIFEST'],
    apply: (fixtureDir) => {
      fs.unlinkSync(path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'));
    }
  },
  {
    id: 'MUT-05',
    description: 'Remove traceability contract file completely',
    expectedFindingIds: ['FILE_EXISTS_TRACEABILITY'],
    apply: (fixtureDir) => {
      fs.unlinkSync(path.join(fixtureDir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv'));
    }
  },
  {
    id: 'MUT-06',
    description: 'Remove Batch 1 allowlist file completely',
    expectedFindingIds: ['FILE_EXISTS_BATCH1_ALLOWLIST'],
    apply: (fixtureDir) => {
      fs.unlinkSync(path.join(fixtureDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'));
    }
  },
  {
    id: 'MUT-07',
    description: 'Corrupt task register with unescaped double quote (strict CSV parse failure)',
    expectedFindingIds: ['PARSE_TASK_CSV'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      fs.appendFileSync(p, 'corrupted,"unescaped quote\n');
    }
  },
  {
    id: 'MUT-08',
    description: 'Append extra row to manifest (manifest count 176)',
    expectedFindingIds: ['MANIFEST_COUNT_175', 'PLANNED_NEW_FILES_COUNT_76'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
      fs.appendFileSync(p, 'scratch/fake.js,ApexClass,NEW,Owner,Owner,W1,EXCLUSIVE_FEATURE_OWNER,NONE,NO,NO\n');
    }
  },
  {
    id: 'MUT-09',
    description: 'Break Wave 5 serialization chain (change W5-3 dependency from W5-2 to W5-99)',
    expectedFindingIds: ['W5_SERIALIZATION_CHAIN'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/W5-2/g, 'W5-99');
      fs.writeFileSync(p, content);
    }
  },
  {
    id: 'MUT-10',
    description: 'Break INT-1 coordinator ownership (change accountable owner to Feature Agent)',
    expectedFindingIds: ['INT1_COORDINATOR_OWNED'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/Integration Coordinator/g, 'Feature Agent');
      fs.writeFileSync(p, content);
    }
  },
  {
    id: 'MUT-11',
    description: 'Delete one existing baseline file from filesystem',
    expectedFindingIds: ['EXISTING_FILES_PHYSICALLY_PRESENT'],
    apply: (fixtureDir) => {
      fs.unlinkSync(path.join(fixtureDir, 'scratch/salesforce-poc/tests/run-poc-tests.cjs'));
    }
  },
  {
    id: 'MUT-12',
    description: 'Change frozen baseline runner mutability tier from FROZEN_READ_ONLY to MUTABLE',
    expectedFindingIds: ['BASELINE_RUNNERS_FROZEN_TIER'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/run-poc-tests\.cjs,OfflineTestRunner,EXISTING,Integration Coordinator,Integration Coordinator,Baseline,FROZEN_READ_ONLY/, 'run-poc-tests.cjs,OfflineTestRunner,EXISTING,Integration Coordinator,Integration Coordinator,Baseline,MUTABLE');
      fs.writeFileSync(p, content);
    }
  },
  {
    id: 'MUT-13',
    description: 'Modify dispatch prompt to allow Batch 1 dispatch',
    expectedFindingIds: ['PROMPT_PROHIBITS_BATCH1'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_8_JULES_DISPATCH_PROMPT_SINGLE_FILE.md');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/Batch 1 dispatch authorized: NO/g, 'Batch 1 dispatch authorized: YES');
      fs.writeFileSync(p, content);
    }
  },
  {
    id: 'MUT-14',
    description: 'Add an unmanifested task ID into Batch 1 allowlist',
    expectedFindingIds: ['BATCH1_ROW_COUNT_49', 'BATCH1_TASK_COUNT_11', 'BATCH1_SUBSET_OF_TASKS'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');
      fs.appendFileSync(p, 'W99-9,Wave 99,Workstream Z,Lead,scratch/file.js,NO\n');
    }
  },
  {
    id: 'MUT-15',
    description: 'Delete a contract from traceability CSV (traceability count 8)',
    expectedFindingIds: ['TRACEABILITY_COUNT_9'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv');
      const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
      lines.pop();
      fs.writeFileSync(p, lines.join('\n') + '\n');
    }
  },
  {
    id: 'MUT-16',
    description: 'Duplicate header in task register (CSV duplicate header check)',
    expectedFindingIds: ['PARSE_TASK_CSV'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      lines[0] = lines[0] + ',Task ID';
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) lines[i] = lines[i] + ',val';
      }
      fs.writeFileSync(p, lines.join('\n'));
    }
  },
  {
    id: 'MUT-17',
    description: 'Empty header in manifest CSV (CSV empty header check)',
    expectedFindingIds: ['PARSE_MANIFEST_CSV'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      lines[0] = lines[0] + ',';
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) lines[i] = lines[i] + ',val';
      }
      fs.writeFileSync(p, lines.join('\n'));
    }
  },
  {
    id: 'MUT-18',
    description: 'Row width mismatch in traceability CSV',
    expectedFindingIds: ['PARSE_TRACE_CSV'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv');
      fs.appendFileSync(p, 'only,two,fields\n');
    }
  },
  {
    id: 'MUT-19',
    description: 'Delete multiple rows from Batch 1 allowlist (count 40 rows, 10 tasks)',
    expectedFindingIds: ['BATCH1_ROW_COUNT_49', 'BATCH1_TASK_COUNT_11'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');
      const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
      const filtered = lines.filter(l => !l.startsWith('W5-1'));
      fs.writeFileSync(p, filtered.join('\n') + '\n');
    }
  },
  {
    id: 'MUT-20',
    description: 'Change planned new file status in manifest to EXISTING (planned count becomes 75)',
    expectedFindingIds: ['PLANNED_NEW_FILES_COUNT_76'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/,NEW,/, ',EXISTING,');
      fs.writeFileSync(p, content);
    }
  },
  {
    id: 'MUT-21',
    description: 'Corrupt Batch 1 CSV with unclosed double quote',
    expectedFindingIds: ['PARSE_BATCH1_CSV'],
    apply: (fixtureDir) => {
      const p = path.join(fixtureDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');
      fs.appendFileSync(p, '"unclosed quote,1,2,3,4,5\n');
    }
  }
];

function runNegativeControl(dir, label) {
  const res = runValidation(dir);
  assert.strictEqual(res.valid, true, `${label} failed: expected 0 findings, got ${res.findings.length}`);
  assert.strictEqual(res.findings.length, 0);
  console.log(`  ✓ [NEGATIVE CONTROL] ${label}: 0 findings, exit code 0`);
}

const runResults = [];

for (let sweep = 1; sweep <= 3; sweep++) {
  console.log(`\n=== MUTATION SWEEP ${sweep} OF 3 ===`);
  const fixtureDir = createPristineFixture();
  runNegativeControl(fixtureDir, `Pre-Sweep ${sweep} Negative Control`);

  let sweepPassed = 0;
  for (const def of mutationDefinitions) {
    const mutDir = createPristineFixture();
    def.apply(mutDir);
    const res = runValidation(mutDir);
    const actualFindingIds = res.findings.map(f => f.findingId).sort();
    const expectedFindingIds = [...def.expectedFindingIds].sort();

    assert.deepStrictEqual(
      actualFindingIds,
      expectedFindingIds,
      `[${def.id}] Sweep ${sweep}: Expected findings ${JSON.stringify(expectedFindingIds)}, got ${JSON.stringify(actualFindingIds)}`
    );

    sweepPassed++;
    runResults.push({
      sweep,
      id: def.id,
      expected: expectedFindingIds,
      actual: actualFindingIds,
      exitCode: res.exitCode
    });
    fs.rmSync(mutDir, { recursive: true, force: true });
  }

  runNegativeControl(fixtureDir, `Post-Sweep ${sweep} Negative Control`);
  fs.rmSync(fixtureDir, { recursive: true, force: true });
  console.log(`Sweep ${sweep} Complete: ${sweepPassed}/${mutationDefinitions.length} mutations detected with exact finding set equality.`);
}

console.log(`\nTotal Mutation Suite Results: 63/63 successful detections across 3 sweeps (21 cases x 3 runs).`);
fs.writeFileSync('docs/wave-0/4.8/mutation-results.json', JSON.stringify(runResults, null, 2));
