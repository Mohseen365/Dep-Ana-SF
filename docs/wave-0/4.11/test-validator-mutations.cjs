/**
 * test-validator-mutations.cjs
 * Wave 0.4.11 Mutation Suite with Exact-Finding Set Assertions & Child-Process Evidence
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const MUTATIONS = [
  {
    id: 'MUT-01',
    desc: 'Unmanaged file injected into ownership manifest',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFindings: ['MANIFEST-COUNT-175'],
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'scratch/salesforce-poc/extra.js,LWC,EXISTING,None,None,None,FROZEN_READ_ONLY,NONE,NO,NO\n');
    }
  },
  {
    id: 'MUT-02',
    desc: 'W9-1 canonical task removed from task register',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['TASK-COUNT-21', 'TASK-MISSING-W9-1'],
    category: 'staticSchema',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      const lines = fs.readFileSync(p, 'utf8').split('\n').filter(l => !l.startsWith('W9-1,'));
      fs.writeFileSync(p, lines.join('\n'));
    }
  },
  {
    id: 'MUT-03',
    desc: 'W5 serialization violated (W5-3 running before W5-2)',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['W5-CHAIN-W5-3'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('"W5-1, W5-2"', 'W5-1');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-04',
    desc: 'Cyclic dependency between W6-1 and W6-2 injected',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['DEP-ACYCLIC'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('None,Workstream B Lead,None,None,node scratch/salesforce-poc/tests/run-w6-1-tests.cjs', 'None,Workstream B Lead,None,W6-2,node scratch/salesforce-poc/tests/run-w6-1-tests.cjs');
      c = c.replace('None,Workstream B Lead,None,None,node scratch/salesforce-poc/tests/run-w6-2-tests.cjs', 'None,Workstream B Lead,None,W6-1,node scratch/salesforce-poc/tests/run-w6-2-tests.cjs');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-05',
    desc: 'Duplicate path in ownership manifest',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFindings: ['MANIFEST-COUNT-175', 'MANIFEST-DUPLICATE'],
    category: 'staticSchema',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
      const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
      lines.push(lines[1]);
      fs.writeFileSync(p, lines.join('\n') + '\n', 'utf8');
    }
  },
  {
    id: 'MUT-06',
    desc: 'Directory target inserted into manifest',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFindings: ['MANIFEST-NO-DIR-scratch/salesforce-poc/force-app/main/default/lwc/'],
    category: 'filesystem',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace('scratch/salesforce-poc/force-app/main/default/lwc/daGraphViewer/daGraphViewer.js,', 'scratch/salesforce-poc/force-app/main/default/lwc/,');
      fs.writeFileSync(p, content, 'utf8');
    }
  },
  {
    id: 'MUT-07',
    desc: 'Batch 1 task count violation',
    target: 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv',
    expectedFindings: ['BATCH1-TASK-COUNT-11', 'BATCH1-ROW-COUNT-49'],
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv'), 'W9-2,Wave 9,Workstream E,Workstream E Lead,scratch/file.js,NO\n');
    }
  },
  {
    id: 'MUT-08',
    desc: 'W7 contract ambiguous OR query introduced',
    target: 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md',
    expectedFindings: ['W7-REJECT-AMBIGUOUS-OR'],
    category: 'semanticReview',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md'), '\nWHERE Id = :keyOrId OR External_Key__c = :keyOrId\n');
    }
  },
  {
    id: 'MUT-09',
    desc: 'W8 raw string limit omitted',
    target: 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md',
    expectedFindings: ['W8-10MB-STRING-GUARD'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'docs/wave-0/4.3/WAVE_0_4_3_WAVE8_RESOURCE_AND_LIFECYCLE_ACCEPTANCE.md');
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/10,485,760 chars \(~10 MB\)/g, '50MB uncapped');
      fs.writeFileSync(p, content, 'utf8');
    }
  },
  {
    id: 'MUT-10',
    desc: 'daAppShell.js dispatched event falsely introduced',
    target: 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js',
    expectedFindings: ['APPSHELL-NO-DISPATCH-EVENT'],
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
    expectedFindings: ['BATCH1-TASK-W5-1'],
    category: 'crossDocumentConsistency',
    apply: (dir) => {
      const p = path.join(dir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace(/W5-1/g, 'W5-99');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-12',
    desc: 'Traceability contract count mismatch',
    target: 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv',
    expectedFindings: ['TRACE-COUNT-9'],
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv'), 'W0-C99,Extra Contract,Source,W1,W2,Method,Test,File,Req,Dec,Status\n');
    }
  },
  {
    id: 'MUT-13',
    desc: 'Ownership manifest count violation',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFindings: ['MANIFEST-COUNT-175'],
    category: 'staticSchema',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'scratch/salesforce-poc/newfile.js,BlankPath,EXISTING,None,None,None,FROZEN_READ_ONLY,NONE,NO,NO\n');
    }
  },
  {
    id: 'MUT-14',
    desc: 'W5-1 dispatch status tampered',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['W5-1-READY'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('READY_TO_LAUNCH', 'BLOCKED');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-15',
    desc: 'W5-2 serialized status tampered',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['W5-2-DEPENDENT'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('IMPLEMENTATION_DEPENDENT,Awaits W5-1 completion', 'READY_TO_LAUNCH,Awaits W5-1 completion');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-16',
    desc: 'Missing required W7 canonical runName field',
    target: 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md',
    expectedFindings: ['W7-RUNNAME-CANONICAL'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'docs/wave-0/4.3/WAVE_0_4_3_W7_PROJECT_RESOLUTION_CONTRACT.md');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace(/runName/g, 'legacyRunIdentifier');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-17',
    desc: 'Component API activeProjectId property missing from daAppShell.js',
    target: 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js',
    expectedFindings: ['APPSHELL-L77-API'],
    category: 'semanticReview',
    apply: (dir) => {
      const p = path.join(dir, 'scratch/salesforce-poc/force-app/main/default/lwc/daAppShell/daAppShell.js');
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace('@api activeProjectId', '// removed activeProjectId');
      fs.writeFileSync(p, c, 'utf8');
    }
  },
  {
    id: 'MUT-18',
    desc: 'Path traversal sequence injected into ownership manifest',
    target: 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
    expectedFindings: ['MANIFEST-COUNT-175', 'MANIFEST-NO-TRAVERSAL-scratch/../../secret.txt'],
    category: 'filesystem',
    apply: (dir) => {
      fs.appendFileSync(path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv'), 'scratch/../../secret.txt,Secret,EXISTING,None,None,None,FROZEN_READ_ONLY,NONE,NO,NO\n');
    }
  },
  {
    id: 'MUT-19',
    desc: 'Unexpected task W99-1 injected into task register',
    target: 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
    expectedFindings: ['TASK-COUNT-21', 'TASK-UNEXPECTED-W99-1'],
    category: 'staticSchema',
    apply: (dir) => {
      const p = path.join(dir, 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv');
      fs.appendFileSync(p, 'W99-1,Wave 99,Extra,Workstream A,scratch/test.js,scratch/test.js,None,Owner,None,None,test,reg,acc,art,READY_TO_LAUNCH,None\n');
    }
  },
  {
    id: 'MUT-20',
    desc: 'Batch 1 row count tampered in allowlist',
    target: 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv',
    expectedFindings: ['BATCH1-ROW-COUNT-49'],
    category: 'staticSchema',
    apply: (dir) => {
      const p = path.join(dir, 'docs/wave-0/4.4/WAVE_0_4_4_BATCH1_TASK_ALLOWLIST.csv');
      const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
      lines.pop();
      fs.writeFileSync(p, lines.join('\n') + '\n', 'utf8');
    }
  }
];

function runMutationSuite() {
  console.log('=== Wave 0.4.11 VALIDATOR MUTATION SUITE (EXACT-FINDING SET MATCHING) ===');

  const validatorScript = path.resolve(__dirname, 'validate-wave0-4-11-dispatch.cjs');
  const mutationResults = [];

  console.log('Running Initial Clean Negative Control...');
  let initialExit = 0;
  let initialOut = '';
  try {
    initialOut = cp.execSync(`node ${validatorScript}`, { cwd: repoRoot, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' });
  } catch (err) {
    initialExit = err.status || 1;
    initialOut = (err.stdout ? err.stdout.toString('utf8') : '') + (err.stderr ? err.stderr.toString('utf8') : '');
  }
  const cleanInitialPassed = (initialExit === 0);
  console.log(`Initial Clean Negative Control exited: ${initialExit} (Passed: ${cleanInitialPassed})`);

  for (const m of MUTATIONS) {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', `w0410-mut-${m.id}-`));

    const copyList = [
      'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv',
      'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv',
      'WAVE_0_4_1_COMPLETE_CONTRACT_TO_TASK_TRACEABILITY.csv',
      'scratch',
      'docs'
    ];
    for (const item of copyList) {
      const src = path.resolve(repoRoot, item);
      if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(tmpDir, item), { recursive: true });
      }
    }

    m.apply(tmpDir);

    const t0 = new Date().toISOString();
    let exitCode = 0;
    let stdout = '';
    let stderr = '';

    try {
      stdout = cp.execSync(`node ${path.join(tmpDir, 'docs/wave-0/4.11/validate-wave0-4-11-dispatch.cjs')}`, {
        cwd: tmpDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8'
      });
    } catch (err) {
      exitCode = err.status || 1;
      stdout = err.stdout ? err.stdout.toString('utf8') : '';
      stderr = err.stderr ? err.stderr.toString('utf8') : '';
    }
    const t1 = new Date().toISOString();

    const violations = [];
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.startsWith('- Code: ')) {
        const parts = line.split('|');
        const code = parts[0].replace('- Code: ', '').trim();
        const status = parts[1].replace('Status: ', '').trim();
        if (status === 'VIOLATION') {
          violations.push(code);
        }
      }
    }

    const expectedSet = new Set(m.expectedFindings);
    const actualSet = new Set(violations);
    const exactMatch = (expectedSet.size === actualSet.size && [...expectedSet].every(ef => actualSet.has(ef)));
    const status = (exactMatch && exitCode !== 0) ? 'PASS' : 'FAIL';

    fs.rmSync(tmpDir, { recursive: true, force: true });

    const logFileName = `validator-mutation-${m.id}.log`;
    const logContent = `COMMAND: node validate-wave0-4-11-dispatch.cjs\nMUTATION: ${m.id}\nDESC: ${m.desc}\nSTART: ${t0}\nEND: ${t1}\nEXIT_CODE: ${exitCode}\nEXPECTED_FINDINGS: ${JSON.stringify(m.expectedFindings)}\nACTUAL_VIOLATIONS: ${JSON.stringify(violations)}\nEXACT_MATCH: ${exactMatch}\nSTATUS: ${status}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\n`;
    fs.writeFileSync(path.join(evidenceDir, logFileName), logContent, 'utf8');
    const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

    mutationResults.push({
      id: m.id,
      desc: m.desc,
      expected: m.expectedFindings,
      actual: violations,
      exitCode,
      status,
      logFile: logFileName,
      logSha
    });
    console.log(`[${status}] ${m.id}: ${m.desc} (exit ${exitCode}, exactMatch: ${exactMatch})`);
  }

  console.log('Running Final Clean Negative Control...');
  let finalExit = 0;
  try {
    cp.execSync(`node ${validatorScript}`, { cwd: repoRoot, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' });
  } catch (err) {
    finalExit = err.status || 1;
  }
  const cleanFinalPassed = (finalExit === 0);
  console.log(`Final Clean Negative Control exited: ${finalExit} (Passed: ${cleanFinalPassed})`);

  const allPassed = cleanInitialPassed && cleanFinalPassed && mutationResults.every(r => r.status === 'PASS');
  console.log(`\nMutation suite completed: ${mutationResults.length} scenarios. All pass: ${allPassed}`);

  if (!allPassed) {
    process.exitCode = 1;
  }
  return mutationResults;
}

module.exports = { runMutationSuite, MUTATIONS };

if (require.main === module) {
  runMutationSuite();
}
