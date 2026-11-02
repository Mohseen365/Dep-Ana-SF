const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { generateSynthesis, computeHashAndBytes } = require('./generate-wave0-4-8-synthesis.cjs');

console.log('Running Synthesis Generator Integrity & Determinism Tests (SYN-01 to SYN-05)...');

let passed = 0;
let total = 0;

function runTest(id, name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [${id}] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [${id}] ${name} FAILED:`, err.message);
    throw err;
  }
}

const repoRoot = path.resolve(__dirname, '../../..');

// Helper to create test manifest
function createTempManifest(artifacts) {
  const tmpFile = path.join('/tmp', `syn-manifest-${Date.now()}-${Math.random()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify({ requiredArtifacts: artifacts }, null, 2));
  return tmpFile;
}

// SYN-01: Valid manifest succeeds
runTest('SYN-01', 'Valid manifest succeeds and matches metadata', () => {
  const p = 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv';
  const meta = computeHashAndBytes(fs.readFileSync(path.resolve(repoRoot, p)));
  const manifestPath = createTempManifest([
    { id: 'ART-01', path: p, type: 'register', expectedSha256: meta.sha256, expectedBytes: meta.bytes }
  ]);

  const res = generateSynthesis({ repoRoot, manifestPath });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.synthesis.totalVerifiedArtifacts, 1);
  fs.unlinkSync(manifestPath);
});

// SYN-02: Missing artifact fails closed
runTest('SYN-02', 'Missing artifact fails closed', () => {
  const manifestPath = createTempManifest([
    { id: 'ART-01', path: 'non_existent_file.csv', type: 'register', expectedSha256: 'abc', expectedBytes: 123 }
  ]);
  const res = generateSynthesis({ repoRoot, manifestPath });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.integrityFailures[0].error, 'FILE_MISSING');
  fs.unlinkSync(manifestPath);
});

// SYN-03: Hash mismatch fails closed
runTest('SYN-03', 'Hash mismatch fails closed', () => {
  const p = 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv';
  const meta = computeHashAndBytes(fs.readFileSync(path.resolve(repoRoot, p)));
  const manifestPath = createTempManifest([
    { id: 'ART-01', path: p, type: 'register', expectedSha256: '0000000000000000000000000000000000000000000000000000000000000000', expectedBytes: meta.bytes }
  ]);
  const res = generateSynthesis({ repoRoot, manifestPath });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.integrityFailures[0].error, 'HASH_MISMATCH');
  fs.unlinkSync(manifestPath);
});

// SYN-04: Byte count mismatch fails closed
runTest('SYN-04', 'Byte count mismatch fails closed', () => {
  const p = 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv';
  const meta = computeHashAndBytes(fs.readFileSync(path.resolve(repoRoot, p)));
  const manifestPath = createTempManifest([
    { id: 'ART-01', path: p, type: 'register', expectedSha256: meta.sha256, expectedBytes: meta.bytes + 1 }
  ]);
  const res = generateSynthesis({ repoRoot, manifestPath });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.integrityFailures[0].error, 'BYTE_COUNT_MISMATCH');
  fs.unlinkSync(manifestPath);
});

// SYN-05: Determinism proof: two consecutive runs produce byte-identical output
runTest('SYN-05', 'Two consecutive runs produce byte-identical output', () => {
  const p1 = 'WAVE_0_4_1_AUTHORITATIVE_TASK_AND_DEPENDENCY_REGISTER.csv';
  const p2 = 'WAVE_0_4_1_AUTHORITATIVE_FILE_OWNERSHIP_MANIFEST.csv';
  const m1 = computeHashAndBytes(fs.readFileSync(path.resolve(repoRoot, p1)));
  const m2 = computeHashAndBytes(fs.readFileSync(path.resolve(repoRoot, p2)));

  const manifestPath = createTempManifest([
    { id: 'ART-02', path: p2, type: 'manifest', expectedSha256: m2.sha256, expectedBytes: m2.bytes },
    { id: 'ART-01', path: p1, type: 'register', expectedSha256: m1.sha256, expectedBytes: m1.bytes }
  ]);

  const run1 = generateSynthesis({ repoRoot, manifestPath });
  const run2 = generateSynthesis({ repoRoot, manifestPath });

  assert.strictEqual(run1.success, true);
  assert.strictEqual(run2.success, true);
  assert.strictEqual(run1.outputJson, run2.outputJson);
  assert.strictEqual(run1.sha256, run2.sha256);
  fs.unlinkSync(manifestPath);
});

console.log(`\nSynthesis Generator Integrity Suite: ${passed}/${total} PASSED\n`);
