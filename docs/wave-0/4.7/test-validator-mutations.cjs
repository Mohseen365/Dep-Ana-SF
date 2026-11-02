/**
 * test-validator-mutations.cjs
 * Wave 0.4.7 Verification Harness for Validator Mutation Testing:
 * 20 mutations executed across 3 sweeps (60 executions) inside isolated sandbox directories.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const crypto = require('crypto');

const repoRoot = process.cwd();
const validatorPath = path.resolve(repoRoot, 'docs/wave-0/4.6/validate-wave0-4-6-dispatch.cjs');
const { runValidation } = require(validatorPath);

const logDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function hashFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function createBaseFixture() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w047-val-fixture-'));

  fs.copyFileSync(
    path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'),
    path.join(tmpDir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv')
  );
  fs.copyFileSync(
    path.join(repoRoot, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'),
    path.join(tmpDir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv')
  );
  fs.copyFileSync(
    path.join(repoRoot, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv'),
    path.join(tmpDir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv')
  );

  fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.4'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'),
    path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv')
  );
  fs.copyFileSync(
    path.join(repoRoot, 'docs/wave-0/4.4/WAVE_0_4_4_COMPONENT_API_SOURCE_PROVENANCE.csv'),
    path.join(tmpDir, 'docs/wave-0/4.4/WAVE_0_4_4_COMPONENT_API_SOURCE_PROVENANCE.csv')
  );

  // Contracts and architecture files
  fs.mkdirSync(path.join(tmpDir, 'docs/wave-0/4.3'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md'),
    path.join(tmpDir, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md')
  );
  fs.copyFileSync(
    path.join(repoRoot, 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md'),
    path.join(tmpDir, 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md')
  );

  // App shell source
  const appShellPath = path.join(tmpDir, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js');
  fs.mkdirSync(path.dirname(appShellPath), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js'), appShellPath);

  return tmpDir;
}

const mutationsDef = [
  {
    id: 'MUT-01',
    desc: 'Unexpected task added to task register',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFinding: 'TASK-COUNT-21',
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv'), '\nW99-1,Wave 99,Desc,Workstream X,None,None,None,Owner,None,None,test.cjs,test.cjs,Acc,Hand,READY_TO_LAUNCH,None\n');
    }
  },
  {
    id: 'MUT-02',
    desc: 'Missing task from canonical register',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFinding: 'TASK-COUNT-21',
    category: 'staticSchema',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      const lines = fs.readFileSync(p, 'utf8').split('\n').filter(l => !l.startsWith('W9-1'));
      fs.writeFileSync(p, lines.join('\n'));
    }
  },
  {
    id: 'MUT-03',
    desc: 'Duplicate task ID in task register',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFinding: 'TASK-DUPLICATE',
    category: 'staticSchema',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      const w51 = lines.find(l => l.startsWith('W5-1,'));
      lines[lines.length - 2] = w51;
      fs.writeFileSync(p, lines.join('\n'));
    }
  },
  {
    id: 'MUT-04',
    desc: 'Cyclic dependency injected into W5-1',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFinding: 'DEP-ACYCLIC',
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace('SERIALIZED_OR_BUNDLED (daGraphViewer shared with W5-2..W5-6),None,', 'SERIALIZED_OR_BUNDLED (daGraphViewer shared with W5-2..W5-6),W5-6,');
      fs.writeFileSync(p, content);
    }
  },
  {
    id: 'MUT-05',
    desc: 'Duplicate path in ownership manifest',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFinding: 'MANIFEST-DUPLICATE',
    category: 'staticSchema',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      lines[lines.length - 2] = lines[1];
      fs.writeFileSync(p, lines.join('\n'));
    }
  },
  {
    id: 'MUT-06',
    desc: 'Directory target inserted into manifest',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFinding: 'MANIFEST-NO-DIR-scratch/salesforce-poc/force-app/main/default/lwc/',
    category: 'filesystem',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace('scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js,', 'scratch/salesforce-poc/force-app/main/default/lwc/,');
      fs.writeFileSync(p, content);
    }
  },
  {
    id: 'MUT-07',
    desc: 'Batch 1 task count violation',
    target: 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv',
    expectedFinding: 'BATCH1-TASK-COUNT-11',
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), '\nW9-2,Wave 9,Workstream E,Workstream E Lead,scratch/file.js,NO\n');
    }
  },
  {
    id: 'MUT-08',
    desc: 'W7 contract ambiguous OR query introduced',
    target: 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md',
    expectedFinding: 'W7-REJECT-AMBIGUOUS-OR',
    category: 'semanticReview',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md'), '\nWHERE Id = :keyOrId OR External_Key__c = :keyOrId\n');
    }
  },
  {
    id: 'MUT-09',
    desc: 'W8 raw string limit omitted',
    target: 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md',
    expectedFinding: 'W8-10MB-STRING-GUARD',
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/10,485,760 chars \(~10 MB\)/g, '50MB uncapped');
      fs.writeFileSync(p, content);
    }
  },
  {
    id: 'MUT-10',
    desc: 'daAppShell.js dispatched event falsely introduced',
    target: 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js',
    expectedFinding: 'APPSHELL-NO-DISPATCH-EVENT',
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js');
      fs.appendFileSync(p, '\nthis.dispatchEvent(new CustomEvent("fake"));\n');
    }
  },
  {
    id: 'MUT-11',
    desc: 'Batch 1 task row outside allowed set injected',
    target: 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv',
    expectedFinding: 'BATCH1-TASK-W5-1',
    category: 'crossDocumentConsistency',
    apply: (dir) => {
      const p = path.join(dir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace(/W5-1/g, 'W5-99');
      fs.writeFileSync(p, c);
    }
  },
  {
    id: 'MUT-12',
    desc: 'Traceability contract ID set mismatch',
    target: 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv',
    expectedFinding: 'TRACE-COUNT-9',
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv'), 'W0-C99,Extra Contract,Source,W1,W2,Method,Test,File,Req,Dec,Status\n');
    }
  },
  {
    id: 'MUT-13',
    desc: 'Ownership manifest count violation',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFinding: 'MANIFEST-COUNT-175',
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'scratch/salesforce-poc/newfile.js,BlankPath,EXISTING,None,None,None,FROZEN_READ_ONLY,NONE,NO,NO\n');
    }
  },
  {
    id: 'MUT-14',
    desc: 'Wave 5 serialization violated (W5-3 running before W5-2)',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFinding: 'W5-CHAIN-W5-3',
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('"W5-1, W5-2"', 'W5-1');
      fs.writeFileSync(p, c);
    }
  },
  {
    id: 'MUT-15',
    desc: 'Cyclic dependency between W6-1 and W6-2 injected',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFinding: 'DEP-ACYCLIC',
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('None,Workstream B Lead,None,None,node scratch/salesforce-poc/tests/run-w6-1-tests.cjs', 'None,Workstream B Lead,None,W6-2,node scratch/salesforce-poc/tests/run-w6-1-tests.cjs');
      c = c.replace('None,Workstream B Lead,None,None,node scratch/salesforce-poc/tests/run-w6-2-tests.cjs', 'None,Workstream B Lead,None,W6-1,node scratch/salesforce-poc/tests/run-w6-2-tests.cjs');
      fs.writeFileSync(p, c);
    }
  },
  {
    id: 'MUT-16',
    desc: 'W5-1 dispatch status tampered',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFinding: 'W5-1-READY',
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('READY_TO_LAUNCH', 'BLOCKED');
      fs.writeFileSync(p, c);
    }
  },
  {
    id: 'MUT-17',
    desc: 'W5-2 serialized status tampered',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFinding: 'W5-2-DEPENDENT',
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('W5-2,Wave 5,Orbit Layout Activation & Concentric Engine,Workstream A,scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js; scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js; scratch/salesforce-poc/tests/run-w5-2-tests.cjs,scratch/salesforce-poc/tests/run-w5-2-tests.cjs,scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js; scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js,Workstream A Lead,SERIALIZED_OR_BUNDLED (daGraphViewer & daLayoutEngine shared),W5-1,node scratch/salesforce-poc/tests/run-w5-2-tests.cjs,All 9 immutable baseline test runners (187 tests),Concentric ring layout positioning; rings payload ingestion; zero baseline regression,"task-W5-2.patch, changed_files list, test logs",IMPLEMENTATION_DEPENDENT', 'W5-2,Wave 5,Orbit Layout Activation & Concentric Engine,Workstream A,scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js; scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js; scratch/salesforce-poc/tests/run-w5-2-tests.cjs,scratch/salesforce-poc/tests/run-w5-2-tests.cjs,scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js; scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js,Workstream A Lead,SERIALIZED_OR_BUNDLED (daGraphViewer & daLayoutEngine shared),W5-1,node scratch/salesforce-poc/tests/run-w5-2-tests.cjs,All 9 immutable baseline test runners (187 tests),Concentric ring layout positioning; rings payload ingestion; zero baseline regression,"task-W5-2.patch, changed_files list, test logs",READY_TO_LAUNCH');
      fs.writeFileSync(p, c);
    }
  },
  {
    id: 'MUT-18',
    desc: 'Missing required W7 canonical runName field',
    target: 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md',
    expectedFinding: 'W7-RUNNAME-CANONICAL',
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace(/runName/g, 'legacyRunIdentifier');
      fs.writeFileSync(p, c);
    }
  },
  {
    id: 'MUT-19',
    desc: 'Component API activeProjectId property missing from daAppShell.js',
    target: 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js',
    expectedFinding: 'APPSHELL-L77-API',
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('@api activeProjectId', '// removed activeProjectId');
      fs.writeFileSync(p, c);
    }
  },
  {
    id: 'MUT-20',
    desc: 'Path traversal sequence injected into ownership manifest',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFinding: 'MANIFEST-NO-TRAVERSAL',
    category: 'filesystem',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'scratch/../../secret.txt,Secret,EXISTING,None,None,None,FROZEN_READ_ONLY,NONE,NO,NO\n');
    }
  }
];

const mutationResults = [];

function runMutationSuite() {
  console.log('=== WAVE 0.4.7 VALIDATOR MUTATION SUITE (20 MUTATIONS x 3 SWEEPS = 60 RUNS) ===');

  for (let sweep = 1; sweep <= 3; sweep++) {
    console.log(`Executing Mutation Sweep ${sweep}/3...`);
    for (const m of mutationsDef) {
      const tmpDir = createBaseFixture();
      const targetAbs = path.join(tmpDir, m.target);
      const preHash = hashFile(targetAbs);

      m.apply(tmpDir);
      const mutatedHash = hashFile(targetAbs);

      const t0 = new Date().toISOString();
      let res = null;
      let detected = false;
      let findingsList = [];
      try {
        res = runValidation(tmpDir);
        findingsList = res.findings || [];
      } catch (e) {
        findingsList = [{ id: 'RUN_ERROR', message: e.message }];
      }
      const t1 = new Date().toISOString();

      detected = findingsList.some(f => f.id && f.id.includes(m.expectedFinding));

      // Restore
      fs.rmSync(tmpDir, { recursive: true, force: true });

      const logFileName = `validator-mutation-${m.id}-sweep-${sweep}.log`;
      const logAbs = path.join(logDir, logFileName);
      const logContent = `MUTATION: ${m.id}\nSWEEP: ${sweep}\nDESC: ${m.desc}\nSTART: ${t0}\nEND: ${t1}\nPRE_HASH: ${preHash}\nMUTATED_HASH: ${mutatedHash}\nEXPECTED_FINDING: ${m.expectedFinding}\nDETECTED: ${detected ? 'PASS' : 'FAIL'}\nTOTAL_FINDINGS: ${findingsList.length}\nFINDINGS: ${JSON.stringify(findingsList.map(f => f.id))}\n`;
      fs.writeFileSync(logAbs, logContent, 'utf8');
      const logSha = crypto.createHash('sha256').update(fs.readFileSync(logAbs)).digest('hex');

      mutationResults.push({
        scenarioId: `MUT-${m.id}-SWEEP-${sweep}`,
        sweep,
        mutationId: m.id,
        desc: m.desc,
        expectedFinding: m.expectedFinding,
        category: m.category,
        detected: detected ? 'PASS' : 'FAIL',
        findingsCount: findingsList.length,
        logFile: logFileName,
        logSha
      });
    }
  }

  const allPassed = mutationResults.every(r => r.detected === 'PASS');
  console.log(`Validator mutation suite completed: ${mutationResults.length} executions. 100% detection rate: ${allPassed ? 'YES' : 'NO'}`);
}

module.exports = { runMutationSuite, mutationResults, mutationsDef };
if (require.main === module) {
  runMutationSuite();
}
