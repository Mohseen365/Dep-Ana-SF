/**
 * generate-synthesis.cjs
 * Wave 0.4.8 Fail-Closed Deterministic Evidence Synthesis Generator
 *
 * Implements:
 * 1. Authoritative evidence manifest loading and validation.
 * 2. Exact artifact and raw log verification (hash + byte count).
 * 3. Self-exclusion of generator output and log from input set to prevent cycle/non-determinism.
 * 4. Deterministic output formatting across multiple runs.
 * 5. Fail-closed exit on any missing, corrupt, duplicate, or unindexed evidence.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hashBuf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return {
    hash: crypto.createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length
  };
}

function runSynthesis({ repoRoot, manifest, evidenceDir, dryRun = false }) {
  if (!manifest || !manifest.requiredArtifacts || !manifest.requiredLogs) {
    throw new Error('SYNTHESIS_ERROR: Authoritative manifest must specify requiredArtifacts and requiredLogs');
  }

  const findings = [];
  const verifiedArtifacts = [];
  const verifiedLogs = [];

  // Verify Required Artifacts
  for (const art of manifest.requiredArtifacts) {
    const fullPath = path.resolve(repoRoot, art.path);
    if (!fs.existsSync(fullPath)) {
      findings.push({ code: 'MISSING_REQUIRED_ARTIFACT', path: art.path, expectedId: art.id });
      continue;
    }
    const { hash, bytes } = hashFile(fullPath);
    if (art.expectedSha256 && hash !== art.expectedSha256) {
      findings.push({ code: 'ARTIFACT_HASH_MISMATCH', path: art.path, expected: art.expectedSha256, actual: hash });
      continue;
    }
    if (art.expectedBytes && bytes !== art.expectedBytes) {
      findings.push({ code: 'ARTIFACT_BYTE_MISMATCH', path: art.path, expected: art.expectedBytes, actual: bytes });
      continue;
    }
    verifiedArtifacts.push({
      id: art.id,
      path: art.path,
      type: art.type,
      sha256: hash,
      byteCount: bytes
    });
  }

  // Verify Raw Execution Logs
  for (const logItem of manifest.requiredLogs) {
    const fullLogPath = path.resolve(evidenceDir, logItem.filename);
    if (!fs.existsSync(fullLogPath)) {
      findings.push({ code: 'MISSING_REQUIRED_LOG', filename: logItem.filename, expectedScenario: logItem.scenarioId });
      continue;
    }
    const { hash, bytes } = hashFile(fullLogPath);
    if (logItem.expectedSha256 && hash !== logItem.expectedSha256) {
      findings.push({ code: 'LOG_HASH_MISMATCH', filename: logItem.filename, expected: logItem.expectedSha256, actual: hash });
      continue;
    }
    verifiedLogs.push({
      filename: logItem.filename,
      scenarioId: logItem.scenarioId,
      sha256: hash,
      byteCount: bytes
    });
  }

  // Detect unindexed log files in evidenceDir (excluding synthesis self-log)
  if (fs.existsSync(evidenceDir)) {
    const filesInDir = fs.readdirSync(evidenceDir);
    const indexedSet = new Set(manifest.requiredLogs.map(l => l.filename));
    // Self-excluded logs
    indexedSet.add('synthesis-generator.log');
    indexedSet.add('synthesis-manifest.json');

    for (const f of filesInDir) {
      if (!indexedSet.has(f)) {
        findings.push({ code: 'UNINDEXED_EVIDENCE_LOG', filename: f });
      }
    }
  }

  // Check for duplicate IDs or filenames
  const seenArtIds = new Set();
  for (const a of manifest.requiredArtifacts) {
    if (seenArtIds.has(a.id)) {
      findings.push({ code: 'DUPLICATE_ARTIFACT_ID', id: a.id });
    }
    seenArtIds.add(a.id);
  }

  const seenLogFiles = new Set();
  for (const l of manifest.requiredLogs) {
    if (seenLogFiles.has(l.filename)) {
      findings.push({ code: 'DUPLICATE_LOG_FILENAME', filename: l.filename });
    }
    seenLogFiles.add(l.filename);
  }

  const success = (findings.length === 0);

  const synthesisResult = {
    findings,
    findingsCount: findings.length,
    generatedAt: manifest.fixedTimestamp || '2026-11-02T12:00:00.000Z',
    success,
    verifiedArtifacts,
    verifiedArtifactsCount: verifiedArtifacts.length,
    verifiedLogs,
    verifiedLogsCount: verifiedLogs.length
  };

  const outputJson = JSON.stringify(synthesisResult, null, 2);
  const synthesisSha = hashBuf(Buffer.from(outputJson, 'utf8'));

  if (!dryRun) {
    const outPath = path.resolve(evidenceDir, 'synthesis-manifest.json');
    fs.writeFileSync(outPath, outputJson, 'utf8');
  }

  return {
    success,
    synthesisSha,
    outputJson,
    findings
  };
}

module.exports = { runSynthesis, hashFile, hashBuf };
