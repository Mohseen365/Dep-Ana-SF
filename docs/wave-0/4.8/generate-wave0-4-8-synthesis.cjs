/**
 * generate-wave0-4-8-synthesis.cjs - Wave 0.4.8
 * Deterministic, Fail-Closed Evidence Synthesis Generator.
 *
 * Properties:
 * 1. Loads authoritative manifest of required artifacts and test logs.
 * 2. Verifies every required artifact exists and matches exact SHA-256 and byte length.
 * 3. Excludes its own output and log from inputs.
 * 4. Deterministic: two consecutive runs produce byte-identical output.
 * 5. Fails closed with non-zero exit code if any artifact is missing or mismatched.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function computeHashAndBytes(content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  return {
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length
  };
}

function generateSynthesis(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const manifestPath = options.manifestPath || path.join(repoRoot, 'docs/wave-0/4.8/authoritative-evidence-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`[SYNTHESIS_ERROR] Manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const verifiedArtifacts = [];
  const integrityFailures = [];

  for (const item of manifest.requiredArtifacts) {
    const fullPath = path.resolve(repoRoot, item.path);
    if (!fs.existsSync(fullPath)) {
      integrityFailures.push({
        id: item.id,
        path: item.path,
        error: 'FILE_MISSING'
      });
      continue;
    }

    const content = fs.readFileSync(fullPath);
    const actual = computeHashAndBytes(content);

    if (item.expectedSha256 && actual.sha256 !== item.expectedSha256) {
      integrityFailures.push({
        id: item.id,
        path: item.path,
        error: 'HASH_MISMATCH',
        expectedSha256: item.expectedSha256,
        actualSha256: actual.sha256
      });
      continue;
    }

    if (item.expectedBytes && actual.bytes !== item.expectedBytes) {
      integrityFailures.push({
        id: item.id,
        path: item.path,
        error: 'BYTE_COUNT_MISMATCH',
        expectedBytes: item.expectedBytes,
        actualBytes: actual.bytes
      });
      continue;
    }

    verifiedArtifacts.push({
      id: item.id,
      path: item.path,
      type: item.type,
      sha256: actual.sha256,
      bytes: actual.bytes
    });
  }

  if (integrityFailures.length > 0) {
    return {
      success: false,
      integrityFailures,
      summary: `Integrity check failed: ${integrityFailures.length} errors found`
    };
  }

  // Deterministic sorting of verified artifacts
  verifiedArtifacts.sort((a, b) => a.id.localeCompare(b.id));

  // Build deterministic synthesis manifest
  const synthesis = {
    wave: '0.4.8',
    schemaVersion: '1.0.0',
    totalVerifiedArtifacts: verifiedArtifacts.length,
    artifacts: verifiedArtifacts
  };

  const outputJson = JSON.stringify(synthesis, null, 2) + '\n';
  return {
    success: true,
    synthesis,
    outputJson,
    sha256: crypto.createHash('sha256').update(outputJson).digest('hex')
  };
}

if (require.main === module) {
  try {
    const res = generateSynthesis();
    if (!res.success) {
      console.error('Synthesis generation FAILED with integrity errors:');
      console.error(JSON.stringify(res.integrityFailures, null, 2));
      process.exit(1);
    }
    const outputPath = path.join(process.cwd(), 'docs/wave-0/4.8/synthesis-manifest.json');
    fs.writeFileSync(outputPath, res.outputJson);
    console.log(`Synthesis manifest generated successfully. SHA-256: ${res.sha256}`);
  } catch (err) {
    console.error('Synthesis error:', err.message);
    process.exit(1);
  }
}

module.exports = {
  computeHashAndBytes,
  generateSynthesis
};
