/**
 * Canonical Architecture Snapshot Engine (WAVE-E1)
 * =================================================
 *
 * Purpose:
 *   Produce a canonical, deterministic, persisted Architecture Snapshot that
 *   represents the complete architecture state produced by the dependency analyzer
 *   at a specific analysis point.
 *
 * Requirements:
 *   - 0 LLM calls or imports.
 *   - 100% deterministic, repeatable serialization.
 *   - Stable component & relationship ordering.
 *   - Deterministic Snapshot Identity based on logical architecture state.
 *   - UNKNOWN preservation & deterministic authority.
 */

"use strict";

const crypto = require("crypto");
const {
  validateConfidence,
  enforceDeterministicAuthority
} = require("./deterministic/contract.cjs");

const SNAPSHOT_SCHEMA_VERSION = 5;
const CURRENT_ANALYZER_VERSION = "13";

/**
 * Recursively normalizes and sorts object keys for deterministic JSON stringification.
 */
function sortKeysRecursively(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeysRecursively);
  }
  const sortedObj = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sortedObj[key] = sortKeysRecursively(obj[key]);
  }
  return sortedObj;
}

/**
 * Computes a stable, deterministic Snapshot Identity string.
 * Uses SHA-256 over normalized, key-sorted logical architecture state.
 * Execution metadata (timestamps, mtime, system-dependent absolute paths) is excluded.
 */
function computeSnapshotIdentity(logicalState) {
  const normalized = sortKeysRecursively(logicalState);
  const jsonStr = JSON.stringify(normalized);
  const hash = crypto.createHash("sha256").update(jsonStr, "utf8").digest("hex");
  return `arch-snap-sha256:${hash}`;
}

/**
 * Builds a canonical normalized relationship object with stable key ordering.
 */
function normalizeRelationship(edge) {
  const fromStr = String(edge.from || "").trim();
  const toStr = String(edge.to || "").trim();
  const typeStr = String(edge.type || "unknown").trim();
  const methodStr = edge.method ? String(edge.method).trim() : null;
  const evidenceStr = edge.evidence ? String(edge.evidence).trim() : null;
  const confidenceStr = edge.confidence ? String(edge.confidence).toLowerCase().trim() : "unknown";

  return {
    id: edge.id || `${fromStr}|${toStr}|${typeStr}|${methodStr || ""}|${evidenceStr || ""}`,
    from: fromStr,
    to: toStr,
    type: typeStr,
    method: methodStr,
    evidence: evidenceStr,
    confidence: validateConfidence(confidenceStr) ? confidenceStr : "unknown",
    unresolved: Boolean(edge.unresolved),
    canonical: edge.canonical || null
  };
}

/**
 * Normalizes and deterministically sorts an array of relationship objects.
 */
function normalizeAndSortRelationships(edges) {
  if (!Array.isArray(edges)) return [];
  const normalized = edges.map(normalizeRelationship);

  return normalized.sort((a, b) => {
    return (
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to) ||
      a.type.localeCompare(b.type) ||
      String(a.method || "").localeCompare(String(b.method || "")) ||
      String(a.evidence || "").localeCompare(String(b.evidence || ""))
    );
  });
}

/**
 * Normalizes and deterministically sorts an array of component objects.
 */
function normalizeAndSortComponents(symbols, inputMaps = {}) {
  if (!Array.isArray(symbols)) return [];

  const {
    roleMap = new Map(),
    layerMap = new Map(),
    domainMap = new Map(),
    entryPointMap = new Map(),
    extBoundaryMap = new Map(),
    bottleneckMap = new Map(),
    smellMap = new Map(),
    debtMap = new Map(),
    testGapMap = new Map(),
    securityMap = new Map(),
    criticalityMap = new Map(),
    safetyMap = new Map(),
    healthMap = new Map(),
    metricsMap = new Map(),
    duplicateMap = new Map()
  } = inputMaps;

  const normalizedComponents = symbols.map(symbol => {
    const id = String(symbol.id || "").trim();
    const name = String(symbol.name || "").trim();
    const type = String(symbol.type || "").trim();
    const file = symbol.file ? String(symbol.file).replace(/\\/g, "/") : null;

    const role = roleMap.get(id) || { primary: "unknown", confidence: "unknown", evidence: [], secondary: [] };
    const layer = layerMap.get(id) || { primary: "unknown", confidence: "unknown", evidence: [], secondary: [] };
    const domain = domainMap.get(id) || { primary: "unknown", confidence: "unknown", evidence: [], secondary: [] };
    const entryPoint = entryPointMap.get(id) || { isEntryPoint: false, type: "none", confidence: "unknown" };
    const externalBoundary = extBoundaryMap.get(id) || { isExternalBoundary: false, boundaryType: "none", confidence: "unknown" };
    const bottleneck = bottleneckMap.get(id) || { isBottleneck: false, risk: "LOW", score: 0 };
    const smells = smellMap.get(id) || { smells: [], smellCount: 0 };
    const debt = debtMap.get(id) || { debtItems: [], totalDebtScore: 0 };
    const testGap = testGapMap.get(id) || { signal: "no-test-evidence", status: "NO_TEST_EVIDENCE", hasTestGap: true };
    const security = securityMap.get(id) || { sharingModel: "unspecified", securitySignals: [] };
    const criticality = criticalityMap.get(id) || { classification: "MEDIUM", score: 0 };
    const safety = safetyMap.get(id) || { classification: "UNKNOWN", score: 0, factors: [] };
    const health = healthMap.get(id) || { level: "UNKNOWN", score: 0 };
    const metrics = metricsMap.get(id) || { fanIn: 0, fanOut: 0, coupling: 0, risk: "LOW" };
    const duplicate = duplicateMap.get(id) || { classification: "NO_DUPLICATION_SIGNAL" };

    return {
      id,
      name,
      type,
      file,
      metrics: {
        fanIn: Number(metrics.fanIn) || 0,
        fanOut: Number(metrics.fanOut) || 0,
        coupling: Number(metrics.coupling) || 0,
        risk: String(metrics.risk || "LOW")
      },
      role,
      layer,
      domain,
      entryPoint,
      externalBoundary,
      bottleneck,
      smells,
      architectureDebt: debt,
      testGap,
      securityBoundaries: security,
      businessCriticality: criticality,
      safetyEnvelope: safety,
      architectureHealth: health,
      duplicateResponsibility: duplicate
    };
  });

  return normalizedComponents.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Creates a canonical architecture snapshot object containing deterministic architecture state.
 */
function createCanonicalArchitectureSnapshot({
  registry = { symbols: [] },
  graph = { nodes: [], edges: [] },
  metricList = [],
  cycles = [],
  roleAnalysis = null,
  layerAnalysis = null,
  domainAnalysis = null,
  entryPointAnalysis = null,
  externalBoundaryAnalysis = null,
  bottleneckAnalysis = null,
  smellAnalysis = null,
  architectureDebtAnalysis = null,
  businessCriticalityAnalysis = null,
  repositoryProfile = null,
  safetyEnvelopeAnalysis = null,
  architectureHealthAnalysis = null,
  qualityGateAnalysis = null,
  duplicateResponsibilityAnalysis = null,
  testGapSummary = null,
  sourceDir = "force-app/main/default",
  options = {}
} = {}) {
  const symbols = Array.isArray(registry) ? registry : (registry.symbols || []);
  const edges = Array.isArray(graph) ? graph : (graph.edges || []);
  const nodes = graph.nodes || [];

  const metricsMap = new Map(metricList.map(m => [m.id, m]));
  const roleMap = roleAnalysis?.symbolRoles || new Map();
  const layerMap = layerAnalysis?.symbolLayers || new Map();
  const domainMap = domainAnalysis?.symbolDomains || new Map();
  const entryPointMap = entryPointAnalysis?.symbolEntryPoints || new Map();
  const extBoundaryMap = externalBoundaryAnalysis?.symbolExternalBoundaries || new Map();
  const bottleneckMap = bottleneckAnalysis?.componentBottlenecks || new Map();
  const smellMap = smellAnalysis?.componentSmells || new Map();
  const debtMap = architectureDebtAnalysis?.componentDebt || new Map();
  const criticalityMap = businessCriticalityAnalysis?.componentBusinessCriticality || new Map();
  const safetyMap = safetyEnvelopeAnalysis?.componentSafetyEnvelopes || new Map();
  const duplicateMap = duplicateResponsibilityAnalysis?.duplicates || new Map();

  const sortedComponents = normalizeAndSortComponents(symbols, {
    roleMap,
    layerMap,
    domainMap,
    entryPointMap,
    extBoundaryMap,
    bottleneckMap,
    smellMap,
    debtMap,
    criticalityMap,
    safetyMap,
    metricsMap,
    duplicateMap
  });

  const sortedRelationships = normalizeAndSortRelationships(edges);

  const sortedCycles = [...cycles].map(c => [...c].sort()).sort((a, b) => (a[0] || "").localeCompare(b[0] || ""));

  const normalizedSourceDir = String(sourceDir || "force-app/main/default").replace(/\\/g, "/");

  const logicalState = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    analyzerVersion: CURRENT_ANALYZER_VERSION,
    sourceDirectory: normalizedSourceDir,
    components: sortedComponents,
    relationships: sortedRelationships,
    cycles: sortedCycles,
    summaries: {
      roles: roleAnalysis?.roles || {},
      layers: layerAnalysis?.layers || {},
      domains: domainAnalysis?.domains || {},
      entryPoints: entryPointAnalysis?.summary || {},
      externalBoundaries: externalBoundaryAnalysis?.summary || {},
      bottlenecks: bottleneckAnalysis?.summary || {},
      smells: smellAnalysis?.summary || {},
      architectureDebt: architectureDebtAnalysis?.summary || {},
      businessCriticality: businessCriticalityAnalysis?.summary || {},
      safetyEnvelopes: safetyEnvelopeAnalysis?.summary || {},
      architectureHealth: architectureHealthAnalysis ? {
        overallHealth: architectureHealthAnalysis.overallHealth,
        confidence: architectureHealthAnalysis.confidence,
        dimensions: architectureHealthAnalysis.dimensions
      } : {},
      qualityGates: qualityGateAnalysis ? {
        overallResult: qualityGateAnalysis.overallResult,
        confidence: qualityGateAnalysis.confidence,
        ruleResults: qualityGateAnalysis.ruleResults
      } : {},
      duplicateResponsibility: duplicateResponsibilityAnalysis?.summary || {},
      testGaps: testGapSummary || {}
    }
  };

  const snapshotIdentity = computeSnapshotIdentity(logicalState);

  const snapshot = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    analyzerVersion: CURRENT_ANALYZER_VERSION,
    analyzer: `Salesforce Dependency Analyzer v${CURRENT_ANALYZER_VERSION}`,
    snapshotIdentity,
    generatedAt: new Date().toISOString(),
    sourceDirectory: normalizedSourceDir,
    metadata: {
      fileCount: symbols.length,
      componentCount: sortedComponents.length,
      relationshipCount: sortedRelationships.length,
      cycleCount: sortedCycles.length
    },
    inventory: {
      components: sortedComponents.length,
      relationships: sortedRelationships.length,
      cycles: sortedCycles.length
    },
    components: sortedComponents,
    relationships: sortedRelationships,
    cycles: sortedCycles,
    roles: roleAnalysis?.roles || {},
    layers: layerAnalysis?.layers || {},
    domains: domainAnalysis?.domains || {},
    profiles: repositoryProfile || {},
    entryPoints: entryPointAnalysis?.summary || {},
    externalBoundaries: externalBoundaryAnalysis?.summary || {},
    bottlenecks: bottleneckAnalysis?.summary || {},
    smells: smellAnalysis?.summary || {},
    architectureDebt: architectureDebtAnalysis?.summary || {},
    testGaps: testGapSummary || {},
    businessCriticality: businessCriticalityAnalysis?.summary || {},
    safetyEnvelopes: safetyEnvelopeAnalysis?.summary || {},
    architectureHealth: architectureHealthAnalysis ? {
      overallHealth: architectureHealthAnalysis.overallHealth,
      confidence: architectureHealthAnalysis.confidence,
      dimensions: architectureHealthAnalysis.dimensions,
      strongestPositiveSignals: architectureHealthAnalysis.strongestPositiveSignals,
      strongestNegativeSignals: architectureHealthAnalysis.strongestNegativeSignals,
      unknownIncompleteAreas: architectureHealthAnalysis.unknownIncompleteAreas
    } : {},
    qualityGates: qualityGateAnalysis ? {
      overallResult: qualityGateAnalysis.overallResult,
      confidence: qualityGateAnalysis.confidence,
      ruleResults: qualityGateAnalysis.ruleResults,
      failures: qualityGateAnalysis.failures,
      warnings: qualityGateAnalysis.warnings,
      unknownChecks: qualityGateAnalysis.unknownChecks
    } : {},
    duplicateResponsibility: duplicateResponsibilityAnalysis?.summary || {}
  };

  return snapshot;
}

/**
 * Validates whether an object complies with the Architecture Snapshot schema.
 */
function validateArchitectureSnapshot(snapshot) {
  const errors = [];

  if (!snapshot || typeof snapshot !== "object") {
    return { valid: false, errors: ["Snapshot must be a non-null object."] };
  }

  if (typeof snapshot.schemaVersion !== "number" || snapshot.schemaVersion < 1) {
    errors.push("Missing or invalid 'schemaVersion'. Must be a positive integer.");
  }

  if (typeof snapshot.analyzerVersion !== "string" || !snapshot.analyzerVersion) {
    errors.push("Missing or invalid 'analyzerVersion'.");
  }

  if (typeof snapshot.snapshotIdentity !== "string" || !snapshot.snapshotIdentity.startsWith("arch-snap-sha256:")) {
    errors.push("Missing or invalid 'snapshotIdentity'. Must start with 'arch-snap-sha256:'.");
  }

  if (!Array.isArray(snapshot.components)) {
    errors.push("Missing or invalid 'components'. Must be an array.");
  }

  if (!Array.isArray(snapshot.relationships)) {
    errors.push("Missing or invalid 'relationships'. Must be an array.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  SNAPSHOT_SCHEMA_VERSION,
  CURRENT_ANALYZER_VERSION,
  computeSnapshotIdentity,
  createCanonicalArchitectureSnapshot,
  validateArchitectureSnapshot
};
