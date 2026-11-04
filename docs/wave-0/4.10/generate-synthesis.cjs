/**
 * generate-synthesis.cjs
 * Wave 0.4.10 Fail-Closed Deterministic Evidence Synthesis Generator
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
  if (!manifest || !Array.isArray(manifest.requiredArtifacts) || !Array.isArray(manifest.requiredLogs)) {
    throw new Error('SYNTHESIS_ERROR: Authoritative manifest must specify requiredArtifacts and requiredLogs arrays');
  }

  const findings = [];
  const verifiedArtifacts = [];
  const verifiedLogs = [];

  const seenArtIds = new Set();
  const seenArtPaths = new Set();
  for (const a of manifest.requiredArtifacts) {
    if (!a.id || !a.path) {
      findings.push({ code: 'MALFORMED_ARTIFACT_ENTRY', artifact: a });
      continue;
    }
    if (seenArtIds.has(a.id)) {
      findings.push({ code: 'DUPLICATE_ARTIFACT_ID', id: a.id });
    }
    seenArtIds.add(a.id);

    const normPath = a.path.replace(/\\/g, '/');
    if (seenArtPaths.has(normPath)) {
      findings.push({ code: 'DUPLICATE_ARTIFACT_PATH', path: normPath });
    }
    seenArtPaths.add(normPath);
  }

  const seenLogFiles = new Set();
  const seenScenarioIds = new Set();
  for (const l of manifest.requiredLogs) {
    if (!l.filename || !l.scenarioId) {
      findings.push({ code: 'MALFORMED_LOG_ENTRY', log: l });
      continue;
    }
    if (seenLogFiles.has(l.filename)) {
      findings.push({ code: 'DUPLICATE_LOG_FILENAME', filename: l.filename });
    }
    seenLogFiles.add(l.filename);

    if (seenScenarioIds.has(l.scenarioId)) {
      findings.push({ code: 'DUPLICATE_SCENARIO_ID', scenarioId: l.scenarioId });
    }
    seenScenarioIds.add(l.scenarioId);
  }

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
    if (art.expectedBytes !== undefined && art.expectedBytes !== null && bytes !== art.expectedBytes) {
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
    if (logItem.expectedBytes !== undefined && logItem.expectedBytes !== null && bytes !== logItem.expectedBytes) {
      findings.push({ code: 'LOG_BYTE_MISMATCH', filename: logItem.filename, expected: logItem.expectedBytes, actual: bytes });
      continue;
    }

    const logHead = fs.readFileSync(fullLogPath, 'utf8').substring(0, 500);
    const hasRawMarker = logHead.includes('COMMAND:') || logHead.includes('EXIT_CODE:') || logHead.includes('START:') || logHead.includes('ACTUAL:');
    if (!hasRawMarker) {
      findings.push({ code: 'LOG_NOT_RAW_CHILD_PROCESS', filename: logItem.filename });
    }

    verifiedLogs.push({
      filename: logItem.filename,
      scenarioId: logItem.scenarioId,
      sha256: hash,
      byteCount: bytes
    });
  }

  if (fs.existsSync(evidenceDir)) {
    const filesInDir = fs.readdirSync(evidenceDir);
    const indexedSet = new Set(manifest.requiredLogs.map(l => l.filename));
    indexedSet.add('synthesis-generator.log');
    indexedSet.add('synthesis-manifest.json');

    for (const f of filesInDir) {
      if (!indexedSet.has(f)) {
        findings.push({ code: 'UNINDEXED_EVIDENCE_LOG', filename: f });
      }
    }
  }

  const success = (findings.length === 0);

  const synthesisResult = {
    verdict: success ? 'READY_FOR_INDEPENDENT_AUTHORIZATION_REVIEW' : 'NOT_READY_EVIDENCE_INSUFFICIENT',
    batch1DispatchAuthorized: false,
    findings,
    findingsCount: findings.length,
    generatedAt: manifest.fixedTimestamp || '2026-11-04T12:00:00.000Z',
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
