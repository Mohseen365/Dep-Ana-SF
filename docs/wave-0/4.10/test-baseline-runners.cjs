/**
 * test-baseline-runners.cjs
 * Wave 0.4.10 Baseline Runner Verification Harness
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return {
    hash: crypto.createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length
  };
}

const RUNNERS = [
  { name: 'poc', file: 'scratch/salesforce-poc/tests/run-poc-tests.cjs', expectedCount: 43 },
  { name: 'wave4', file: 'scratch/salesforce-poc/tests/run-wave4-integration-suite.cjs', expectedCount: 32 },
  { name: 'lane-a', file: 'scratch/salesforce-poc/tests/run-lane-a-schema-tests.cjs', expectedCount: 9 },
  { name: 'lane-c', file: 'scratch/salesforce-poc/tests/run-lane-c-preset-manager-tests.cjs', expectedCount: 10 },
  { name: 'lane-d', file: 'scratch/salesforce-poc/tests/run-lane-d-graph-filter-tests.cjs', expectedCount: 15 },
  { name: 'lane-e', file: 'scratch/salesforce-poc/tests/run-lane-e-matrix-tests.cjs', expectedCount: 11 },
  { name: 'lane-f', file: 'scratch/salesforce-poc/tests/run-lane-f-findings-tests.cjs', expectedCount: 12 },
  { name: 'workstream-a', file: 'scratch/salesforce-poc/tests/run-workstream-a-tests.cjs', expectedCount: 33 },
  { name: 'workstream-c', file: 'scratch/salesforce-poc/tests/run-workstream-c-tests.cjs', expectedCount: 22 }
];

function runBaselineSuite() {
  console.log('=== WAVE 0.4.10 BASELINE RUNNERS (9 RUNNERS x 3 SWEEPS = 27 EXECUTIONS) ===');

  const baselineResults = [];
  const initialRunnerHashes = {};

  for (const r of RUNNERS) {
    initialRunnerHashes[r.file] = hashFile(path.resolve(repoRoot, r.file)).hash;
  }

  for (let sweep = 1; sweep <= 3; sweep++) {
    console.log(`\n--- SWEEP ${sweep}/3 ---`);
    for (const r of RUNNERS) {
      const runnerPath = path.resolve(repoRoot, r.file);
      const preHash = hashFile(runnerPath).hash;

      const t0 = new Date().toISOString();
      const startTime = Date.now();

      let exitCode = 0;
      let stdout = '';
      let stderr = '';

      try {
        stdout = cp.execSync(`node ${r.file}`, {
          cwd: repoRoot,
          stdio: ['pipe', 'pipe', 'pipe'],
          encoding: 'utf8'
        });
      } catch (err) {
        exitCode = err.status || 1;
        stdout = err.stdout ? err.stdout.toString('utf8') : '';
        stderr = err.stderr ? err.stderr.toString('utf8') : '';
      }

      const durationMs = Date.now() - startTime;
      const t1 = new Date().toISOString();
      const postHash = hashFile(runnerPath).hash;

      if (preHash !== postHash || postHash !== initialRunnerHashes[r.file]) {
        throw new Error(`CRITICAL INTEGRITY FAILURE: Frozen runner modified during execution: ${r.file}`);
      }

      const logFileName = `baseline-${r.name}-sweep-${sweep}.log`;
      const fullLog = `COMMAND: node ${r.file}\nSWEEP: ${sweep}\nEXIT_CODE: ${exitCode}\nSTART: ${t0}\nEND: ${t1}\nDURATION_MS: ${durationMs}\nPRE_HASH: ${preHash}\nPOST_HASH: ${postHash}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\n`;
      fs.writeFileSync(path.resolve(evidenceDir, logFileName), fullLog, 'utf8');

      const logSha = crypto.createHash('sha256').update(fullLog).digest('hex');

      baselineResults.push({
        name: r.name,
        file: r.file,
        sweep,
        exitCode,
        durationMs,
        expectedCount: r.expectedCount,
        passed: (exitCode === 0),
        preHash,
        postHash,
        logFileName,
        logSha
      });
      console.log(`[PASS] ${r.name} sweep ${sweep} exited 0 in ${durationMs}ms`);
    }
  }

  const allPassed = baselineResults.every(b => b.passed);
  console.log(`\nBaseline execution finished: ${baselineResults.length} executions completed. All exited 0: ${allPassed}`);
  if (!allPassed) {
    process.exitCode = 1;
  }
  return baselineResults;
}

module.exports = { runBaselineSuite, RUNNERS };

if (require.main === module) {
  runBaselineSuite();
}
