/**
 * test-synthesis.cjs
 * Wave 0.4.11 Evidence Synthesis Generator Test Harness
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  runSynthesis,
  hashBuf,
  hashFile
} = require('./generate-synthesis.cjs');

const repoRoot = process.cwd();
const evidenceDir = path.resolve(__dirname, 'evidence/raw');
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

const synResults = [];

function recordResult(id, desc, expected, actual, status, logFileName, logContent) {
  const logPath = path.join(evidenceDir, logFileName);
  fs.writeFileSync(logPath, logContent, 'utf8');
  const logSha = hashBuf(Buffer.from(logContent, 'utf8'));

  synResults.push({
    id,
    desc,
    expected,
    actual,
    status,
    logFile: logFileName,
    logSha
  });
}

function runSynthesisSuite() {
  console.log('=== Wave 0.4.11 SYNTHESIS GENERATOR SUITE ===');

  // SYN-01: Rejection on Missing Required Artifact
  {
    const manifest = {
      requiredArtifacts: [{ id: 'TEST-ART-1', path: 'non_existent_file.txt', type: 'Config' }],
      requiredLogs: []
    };
    const res = runSynthesis({ repoRoot, manifest, evidenceDir, dryRun: true });
    const actual = (!res.success && res.findings.some(f => f.code === 'MISSING_REQUIRED_ARTIFACT')) ? 'REJECTED_MISSING_ARTIFACT' : 'FAILED';
    const status = (actual === 'REJECTED_MISSING_ARTIFACT') ? 'PASS' : 'FAIL';
    recordResult('SYN-01', 'Synthesis fails closed when required artifact is missing', 'REJECTED_MISSING_ARTIFACT', actual, status, 'SYN-01.log', `ACTUAL: ${actual}\nFINDINGS: ${JSON.stringify(res.findings)}\n`);
  }

  // SYN-02: Rejection on Artifact Hash Mismatch
  {
    const manifest = {
      requiredArtifacts: [{ id: 'TEST-ART-2', path: 'package.json', expectedSha256: 'deadbeefwronghash', type: 'Config' }],
      requiredLogs: []
    };
    const res = runSynthesis({ repoRoot, manifest, evidenceDir, dryRun: true });
    const actual = (!res.success && res.findings.some(f => f.code === 'ARTIFACT_HASH_MISMATCH')) ? 'REJECTED_HASH_MISMATCH' : 'FAILED';
    const status = (actual === 'REJECTED_HASH_MISMATCH') ? 'PASS' : 'FAIL';
    recordResult('SYN-02', 'Synthesis fails closed when artifact hash does not match expected', 'REJECTED_HASH_MISMATCH', actual, status, 'SYN-02.log', `ACTUAL: ${actual}\nFINDINGS: ${JSON.stringify(res.findings)}\n`);
  }

  // SYN-03: Rejection on Duplicate Artifact ID
  {
    const manifest = {
      requiredArtifacts: [
        { id: 'TEST-ART-DUP', path: 'package.json', type: 'Config' },
        { id: 'TEST-ART-DUP', path: 'package-lock.json', type: 'Config' }
      ],
      requiredLogs: []
    };
    const res = runSynthesis({ repoRoot, manifest, evidenceDir, dryRun: true });
    const actual = (!res.success && res.findings.some(f => f.code === 'DUPLICATE_ARTIFACT_ID')) ? 'REJECTED_DUPLICATE_ID' : 'FAILED';
    const status = (actual === 'REJECTED_DUPLICATE_ID') ? 'PASS' : 'FAIL';
    recordResult('SYN-03', 'Synthesis fails closed on duplicate artifact ID', 'REJECTED_DUPLICATE_ID', actual, status, 'SYN-03.log', `ACTUAL: ${actual}\nFINDINGS: ${JSON.stringify(res.findings)}\n`);
  }

  // SYN-04: Deterministic Byte-Identical Output Across Multiple Runs
  {
    const manifest = {
      fixedTimestamp: '2026-11-04T12:00:00.000Z',
      requiredArtifacts: [{ id: 'TEST-ART-DET', path: 'package.json', type: 'Config' }],
      requiredLogs: []
    };
    const res1 = runSynthesis({ repoRoot, manifest, evidenceDir, dryRun: true });
    const res2 = runSynthesis({ repoRoot, manifest, evidenceDir, dryRun: true });
    const actual = (res1.outputJson === res2.outputJson && res1.synthesisSha === res2.synthesisSha) ? 'DETERMINISTIC_EXACT_MATCH' : 'NONDETERMINISTIC';
    const status = (actual === 'DETERMINISTIC_EXACT_MATCH') ? 'PASS' : 'FAIL';
    recordResult('SYN-04', 'Synthesis generator produces byte-identical output across consecutive runs', 'DETERMINISTIC_EXACT_MATCH', actual, status, 'SYN-04.log', `SHA1: ${res1.synthesisSha}\nSHA2: ${res2.synthesisSha}\nACTUAL: ${actual}\n`);
  }


  // SYN-05: P1-02 CLI Child Process Execution - Missing Manifest returns exit code 2
  {
    const cp = require('child_process');
    const cliPath = path.resolve(__dirname, 'generate-synthesis.cjs');
    const res = cp.spawnSync('node', [cliPath, '--manifest', '/nonexistent/path/manifest.json'], { encoding: 'utf8' });
    const actual = (res.status === 2) ? 'CLI_EXIT_2_MISSING_MANIFEST' : `EXIT_${res.status}`;
    const status = (actual === 'CLI_EXIT_2_MISSING_MANIFEST') ? 'PASS' : 'FAIL';
    recordResult('SYN-05', 'Synthesis CLI returns exit code 2 on missing manifest', 'CLI_EXIT_2_MISSING_MANIFEST', actual, status, 'SYN-05.log', `EXIT: ${res.status}\nSTDERR: ${res.stderr}\n`);
  }

  // SYN-06: P1-02 CLI Child Process Execution - Findings Detected returns exit code 1
  {
    const cp = require('child_process');
    const cliPath = path.resolve(__dirname, 'generate-synthesis.cjs');
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'w0411-syn-cli-'));
    const badManifest = path.join(tmpDir, 'bad-manifest.json');
    fs.writeFileSync(badManifest, JSON.stringify({
      requiredArtifacts: [{ id: 'MISSING', path: 'missing_file.xyz' }],
      requiredLogs: []
    }));
    const res = cp.spawnSync('node', [cliPath, '--manifest', badManifest, '--dry-run'], { encoding: 'utf8' });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const actual = (res.status === 1) ? 'CLI_EXIT_1_FINDINGS' : `EXIT_${res.status}`;
    const status = (actual === 'CLI_EXIT_1_FINDINGS') ? 'PASS' : 'FAIL';
    recordResult('SYN-06', 'Synthesis CLI returns exit code 1 on synthesis findings', 'CLI_EXIT_1_FINDINGS', actual, status, 'SYN-06.log', `EXIT: ${res.status}\nSTDERR: ${res.stderr}\n`);
  }
  console.log(`Synthesis suite finished: ${synResults.length} scenarios. All pass: ${synResults.every(r => r.status === 'PASS')}`);
  if (!synResults.every(r => r.status === 'PASS')) {
    process.exitCode = 1;
  }
  return synResults;
}

module.exports = { runSynthesisSuite, synResults };

if (require.main === module) {
  runSynthesisSuite();
}
