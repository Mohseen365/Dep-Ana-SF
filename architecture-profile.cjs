/**
 * Deterministic Architecture Profile Engine (Prompt B1)
 *
 * Provides component-level and architecture-level profiles summarizing
 * architectural characteristics by aggregating existing deterministic signals.
 *
 * Strict boundary rules:
 *   - Aggregates existing facts; does NOT invent new facts or act as an independent classifier.
 *   - Distinguishes unavailable information from false (e.g. signalNotEvaluated / unknown vs false).
 *   - Preserves source provenance (file path, hash, component ID).
 *   - 0 LLM runtime dependencies or calls.
 *   - 100% deterministic, explainable, and repeatable.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

/**
 * Builds a deterministic architecture profile for a single component.
 *
 * Accepts pre-computed capability signals or computes default structures.
 */
function buildComponentArchitectureProfile(symbol, graph = null, metric = null, options = {}) {
  if (!symbol) {
    return createDeterministicResult({
      value: "unknown",
      primary: "unknown",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      metadata: {
        componentId: null,
        componentName: null,
        availableSignals: 0,
        evaluatedSignals: [],
        missingSignals: [
          "role", "layer", "entryPoint", "bottleneck", "testStatus",
          "security", "externalBoundary", "dataImpact", "metrics", "paths"
        ],
        profile: {
          role: "unknown",
          layer: "unknown",
          entryPoint: { isEntryPoint: false, status: "unavailable" },
          bottleneck: { isBottleneck: false, score: 0, status: "unavailable" },
          testStatus: { signal: "unknown", status: "unavailable" },
          security: { sharingModel: "unspecified", boundaries: [], status: "unavailable" },
          externalBoundary: { hasExternalBoundary: false, types: [], status: "unavailable" },
          dataImpact: { objects: [], status: "unavailable" },
          metrics: { fanIn: 0, fanOut: 0, coupling: 0, status: "unavailable" },
          paths: { totalPaths: 0, status: "unavailable" }
        },
        provenance: null
      }
    });
  }

  const p = symbol.parsed || {};
  const symbolId = symbol.id || `ApexClass:${symbol.name}`;
  const symbolName = String(symbol.name || p.name || "").trim();
  const relFile = String(symbol.file || p.file || "").replace(/\\/g, "/");
  const sourceHash = symbol.parsed?.sourceHash || symbol.sourceHash || null;

  // Extract signals from options if provided, or fallback
  const roleSignal = options.role || options.roleInfo || null;
  const layerSignal = options.layer || options.layerInfo || null;
  const entryPointSignal = options.entryPoint || options.entryPointInfo || null;
  const bottleneckSignal = options.bottleneck || options.bottleneckInfo || null;
  const testGapSignal = options.testGap || options.testGapInfo || null;
  const securitySignal = options.securityBoundaries || options.securityInfo || null;
  const externalBoundarySignal = options.externalBoundary || options.externalBoundaryInfo || null;
  const dataImpactSignal = options.dataImpact || options.dataImpactInfo || null;
  const pathSignal = options.paths || options.pathInfo || null;

  const evaluatedSignals = [];
  const missingSignals = [];

  // 1. Role
  let role = "unknown";
  if (roleSignal) {
    role = roleSignal.primary || roleSignal.value || "unknown";
    evaluatedSignals.push("role");
  } else {
    missingSignals.push("role");
  }

  // 2. Layer
  let layer = "unknown";
  if (layerSignal) {
    layer = layerSignal.primary || layerSignal.value || "unknown";
    evaluatedSignals.push("layer");
  } else {
    missingSignals.push("layer");
  }

  // 3. Entry Point
  const entryPoint = {
    isEntryPoint: false,
    types: [],
    status: entryPointSignal ? "evaluated" : "unavailable"
  };
  if (entryPointSignal) {
    entryPoint.isEntryPoint = Boolean(entryPointSignal.isEntryPoint ?? (entryPointSignal.primary && entryPointSignal.primary !== "none"));
    entryPoint.types = Array.isArray(entryPointSignal.entryPointTypes)
      ? entryPointSignal.entryPointTypes
      : (entryPointSignal.primary && entryPointSignal.primary !== "none" ? [entryPointSignal.primary] : []);
    evaluatedSignals.push("entryPoint");
  } else {
    missingSignals.push("entryPoint");
  }

  // 4. Bottleneck
  const bottleneck = {
    isBottleneck: false,
    score: 0,
    status: bottleneckSignal ? "evaluated" : "unavailable"
  };
  if (bottleneckSignal) {
    bottleneck.isBottleneck = Boolean(bottleneckSignal.isBottleneck ?? (bottleneckSignal.primary === "bottleneck"));
    bottleneck.score = typeof bottleneckSignal.score === "number" ? bottleneckSignal.score : 0;
    evaluatedSignals.push("bottleneck");
  } else {
    missingSignals.push("bottleneck");
  }

  // 5. Test Status
  const testStatus = {
    signal: "unknown",
    status: testGapSignal ? "evaluated" : "unavailable"
  };
  if (testGapSignal) {
    testStatus.signal = testGapSignal.signal || testGapSignal.value || "unknown";
    evaluatedSignals.push("testStatus");
  } else {
    missingSignals.push("testStatus");
  }

  // 6. Security
  const security = {
    sharingModel: "unspecified",
    boundaries: [],
    status: securitySignal ? "evaluated" : "unavailable"
  };
  if (securitySignal) {
    security.sharingModel = securitySignal.metadata?.sharingModel || securitySignal.primary || "unspecified";
    security.boundaries = securitySignal.metadata?.boundaries || (Array.isArray(securitySignal.secondary) ? [securitySignal.primary, ...securitySignal.secondary] : [securitySignal.primary]);
    evaluatedSignals.push("security");
  } else {
    missingSignals.push("security");
  }

  // 7. External Boundary
  const externalBoundary = {
    hasExternalBoundary: false,
    types: [],
    targets: [],
    status: externalBoundarySignal ? "evaluated" : "unavailable"
  };
  if (externalBoundarySignal) {
    externalBoundary.hasExternalBoundary = Boolean(externalBoundarySignal.hasExternalBoundary ?? (externalBoundarySignal.primary && externalBoundarySignal.primary !== "none"));
    externalBoundary.types = Array.isArray(externalBoundarySignal.boundaryTypes)
      ? externalBoundarySignal.boundaryTypes
      : (externalBoundarySignal.primary && externalBoundarySignal.primary !== "none" ? [externalBoundarySignal.primary] : []);
    externalBoundary.targets = externalBoundarySignal.metadata?.targets || externalBoundarySignal.targets || [];
    evaluatedSignals.push("externalBoundary");
  } else {
    missingSignals.push("externalBoundary");
  }

  // 8. Data Impact
  const dataImpact = {
    objects: [],
    status: dataImpactSignal ? "evaluated" : "unavailable"
  };
  if (dataImpactSignal) {
    const rawObjs = dataImpactSignal.metadata?.objects || [];
    dataImpact.objects = rawObjs.map(o => typeof o === "string" ? o : o.name).filter(Boolean);
    evaluatedSignals.push("dataImpact");
  } else {
    missingSignals.push("dataImpact");
  }

  // 9. Metrics
  const metrics = {
    fanIn: metric?.fanIn ?? 0,
    fanOut: metric?.fanOut ?? 0,
    coupling: (metric?.fanIn ?? 0) + (metric?.fanOut ?? 0),
    status: metric ? "evaluated" : "unavailable"
  };
  if (metric) {
    evaluatedSignals.push("metrics");
  } else {
    missingSignals.push("metrics");
  }

  // 10. Paths Summary
  const paths = {
    totalPaths: pathSignal?.metadata?.summary?.totalPaths ?? (pathSignal?.evidence ? pathSignal.evidence.length : 0),
    status: pathSignal ? "evaluated" : "unavailable"
  };
  if (pathSignal) {
    evaluatedSignals.push("paths");
  } else {
    missingSignals.push("paths");
  }

  // Provenance metadata
  const provenance = {
    componentId: symbolId,
    componentName: symbolName,
    targetFile: relFile || null,
    sourceHash: sourceHash || null
  };

  const profileData = {
    role,
    layer,
    entryPoint,
    bottleneck,
    testStatus,
    security,
    externalBoundary,
    dataImpact,
    metrics,
    paths
  };

  const availableSignalCount = evaluatedSignals.length;
  let confidence = "low";
  if (availableSignalCount >= 7) {
    confidence = "high";
  } else if (availableSignalCount >= 3) {
    confidence = "medium";
  } else if (availableSignalCount === 0) {
    confidence = "unknown";
  }

  const evidenceList = [
    createEvidence("profile-composition", `Compiled architecture profile from ${availableSignalCount} available deterministic signal(s).`),
    createEvidence("source-provenance", `Target source: ${relFile || symbolId} (hash: ${sourceHash || "none"})`)
  ];

  if (missingSignals.length > 0) {
    evidenceList.push(createEvidence("missing-signals", `Signals not evaluated or unavailable: ${missingSignals.join(", ")}.`));
  }

  const result = createDeterministicResult({
    value: `${role}/${layer} profile (${availableSignalCount} signals)`,
    primary: `${role}/${layer}`,
    confidence,
    evidence: evidenceList,
    metadata: {
      componentId: symbolId,
      componentName: symbolName,
      availableSignals: availableSignalCount,
      evaluatedSignals,
      missingSignals,
      profile: profileData,
      provenance
    }
  });

  result.profile = profileData;
  result.provenance = provenance;

  return result;
}

/**
 * Builds a repository-level architecture profile summarizing component profiles across the system.
 */
function buildRepositoryArchitectureProfile(registry, graph = null, metricList = [], options = {}) {
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];
  const metricById = new Map((metricList || []).map(m => [m.id, m]));

  const componentProfiles = new Map();
  const summary = {
    totalComponents: symbols.length,
    roles: {},
    layers: {},
    entryPoints: { count: 0 },
    bottlenecks: { count: 0 },
    testStatus: {},
    externalBoundaries: { count: 0 },
    securitySharingModels: {},
    impactedObjects: new Set()
  };

  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const profileResult = buildComponentArchitectureProfile(symbol, graph, metric, {
      role: options.roles?.symbolRoles?.get(symbol.id),
      layer: options.layers?.symbolLayers?.get(symbol.id),
      entryPoint: options.entryPoints?.symbolEntryPoints?.get(symbol.id),
      bottleneck: options.bottlenecks?.componentBottlenecks?.get(symbol.id),
      testGap: options.testGaps?.get ? options.testGaps.get(symbol.id) : null,
      securityBoundaries: options.securityBoundaries?.symbolBoundaries?.get(symbol.id),
      externalBoundary: options.externalBoundaries?.symbolExternalBoundaries?.get(symbol.id),
      dataImpact: options.dataImpact?.get ? options.dataImpact.get(symbol.id) : null,
      paths: options.paths?.get ? options.paths.get(symbol.id) : null
    });

    componentProfiles.set(symbol.id, profileResult);

    const p = profileResult.profile;
    if (p) {
      summary.roles[p.role] = (summary.roles[p.role] || 0) + 1;
      summary.layers[p.layer] = (summary.layers[p.layer] || 0) + 1;
      if (p.entryPoint.isEntryPoint) summary.entryPoints.count++;
      if (p.bottleneck.isBottleneck) summary.bottlenecks.count++;
      summary.testStatus[p.testStatus.signal] = (summary.testStatus[p.testStatus.signal] || 0) + 1;
      if (p.externalBoundary.hasExternalBoundary) summary.externalBoundaries.count++;
      summary.securitySharingModels[p.security.sharingModel] = (summary.securitySharingModels[p.security.sharingModel] || 0) + 1;
      for (const obj of p.dataImpact.objects) {
        summary.impactedObjects.add(obj);
      }
    }
  }

  summary.impactedObjects = Array.from(summary.impactedObjects).sort();

  return {
    componentProfiles,
    summary
  };
}

module.exports = {
  buildComponentArchitectureProfile,
  buildRepositoryArchitectureProfile
};
