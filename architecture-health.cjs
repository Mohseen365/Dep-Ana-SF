/**
 * Deterministic Architecture Health Engine (WAVE-C5)
 *
 * Provides an explainable, deterministic Architecture Health assessment
 * aggregating existing architecture intelligence across Wave A and Wave B capabilities.
 *
 * Strict boundary rules:
 *   - Aggregates existing facts; does NOT act as an independent re-analyzer.
 *   - 0 LLM runtime dependencies or calls.
 *   - 100% deterministic, explainable, and repeatable.
 *   - Business criticality remains strictly distinct from structural health.
 *   - Does NOT produce a single opaque score; provides dimension-level evidence and classifications.
 *   - Preserves UNKNOWN when critical evidence is missing and reduces confidence appropriately.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

const HEALTH_LEVELS = Object.freeze([
  "HEALTHY",
  "ATTENTION",
  "DEGRADED",
  "HIGH_RISK",
  "UNKNOWN"
]);

/**
 * Maps numeric penalty/risk pressure to standard health levels.
 */
function classifyHealthFromPressure(negativePoints, positivePoints = 0, hasUnknown = false) {
  if (negativePoints >= 10) return "HIGH_RISK";
  if (negativePoints >= 5) return "DEGRADED";
  if (negativePoints >= 2) return "ATTENTION";
  if (hasUnknown && positivePoints === 0) return "UNKNOWN";
  return "HEALTHY";
}

/**
 * Evaluates component-level architectural health based on pre-computed intelligence signals.
 */
function evaluateComponentArchitectureHealth(symbol, graph = null, metric = null, options = {}) {
  if (!symbol) {
    const res = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      metadata: {
        componentId: null,
        componentName: null,
        overallHealth: "UNKNOWN",
        confidence: "unknown",
        dimensions: {},
        strongestPositiveSignals: [],
        strongestNegativeSignals: [],
        unknownIncompleteAreas: ["Symbol missing or unresolvable."],
        businessCriticality: "unknown"
      }
    });
    res.overallHealth = "UNKNOWN";
    res.dimensions = {};
    res.strongestPositiveSignals = [];
    res.strongestNegativeSignals = [];
    res.unknownIncompleteAreas = ["Symbol missing or unresolvable."];
    res.businessCriticality = "unknown";
    return res;
  }

  const symbolId = symbol.id || `ApexClass:${symbol.name}`;
  const symbolName = String(symbol.name || symbol.parsed?.name || symbolId).trim();

  // Extract consumed signals from options or fallback to default structures
  const roleInfo = options.role || options.roleInfo || null;
  const layerInfo = options.layer || options.layerInfo || null;
  const bottleneckInfo = options.bottleneck || options.bottleneckInfo || null;
  const entryPointInfo = options.entryPoint || options.entryPointInfo || null;
  const externalBoundaryInfo = options.externalBoundary || options.externalBoundaryInfo || null;
  const testGapInfo = options.testGap || options.testGapInfo || null;
  const securityInfo = options.securityBoundaries || options.securityInfo || null;
  const smellInfo = options.smells || options.smellInfo || null;
  const changeSimInfo = options.changeSimulation || options.changeSimInfo || null;
  const businessInfo = options.businessCriticality || options.businessInfo || null;

  const positiveSignals = [];
  const negativeSignals = [];
  const unknownAreas = [];

  const dimensions = {};

  // 1. STRUCTURAL COUPLING
  const fanIn = metric?.fanIn ?? 0;
  const fanOut = metric?.fanOut ?? 0;
  const coupling = metric?.coupling ?? (fanIn + fanOut);
  const couplingEvidence = [];
  let couplingHealth = "HEALTHY";
  let couplingConfidence = metric ? "high" : "medium";

  if (coupling >= 15 || fanIn >= 12 || fanOut >= 12) {
    couplingHealth = "HIGH_RISK";
    const msg = `Component '${symbolName}' has severe coupling (fan-in: ${fanIn}, fan-out: ${fanOut}, total: ${coupling}).`;
    couplingEvidence.push(createEvidence("severe-coupling", msg));
    negativeSignals.push(msg);
  } else if (coupling >= 8 || fanIn >= 8 || fanOut >= 8) {
    couplingHealth = "ATTENTION";
    const msg = `Component '${symbolName}' has elevated coupling (fan-in: ${fanIn}, fan-out: ${fanOut}, total: ${coupling}).`;
    couplingEvidence.push(createEvidence("elevated-coupling", msg));
    negativeSignals.push(msg);
  } else {
    const msg = `Component '${symbolName}' maintains low structural coupling (coupling: ${coupling}).`;
    couplingEvidence.push(createEvidence("low-coupling", msg));
    positiveSignals.push(msg);
  }

  dimensions.structuralCoupling = {
    classification: couplingHealth,
    confidence: couplingConfidence,
    evidence: couplingEvidence,
    signals: { fanIn, fanOut, coupling }
  };

  // 2. DEPENDENCY COMPLEXITY
  const activeCycles = options.cycles
    ? options.cycles.filter(c => Array.isArray(c) && c.includes(symbolId))
    : [];

  const complexityEvidence = [];
  let complexityHealth = "HEALTHY";
  let complexityConfidence = options.cycles !== undefined ? "high" : "medium";

  if (activeCycles.length > 0) {
    complexityHealth = "HIGH_RISK";
    const msg = `Component '${symbolName}' participates in ${activeCycles.length} circular dependency cycle(s).`;
    complexityEvidence.push(createEvidence("circular-dependency-loop", msg));
    negativeSignals.push(msg);
  } else {
    const msg = `Component '${symbolName}' has zero circular dependency loops.`;
    complexityEvidence.push(createEvidence("no-cycles", msg));
    positiveSignals.push(msg);
  }

  dimensions.dependencyComplexity = {
    classification: complexityHealth,
    confidence: complexityConfidence,
    evidence: complexityEvidence,
    signals: { cycleCount: activeCycles.length }
  };

  // 3. CHANGE RISK
  const changeEvidence = [];
  let changeHealth = "HEALTHY";
  let changeConfidence = "medium";
  let blastRadius = "small";

  if (changeSimInfo) {
    changeConfidence = changeSimInfo.confidence || "high";
    blastRadius = changeSimInfo.metadata?.blastRadiusLevel || changeSimInfo.value || "small";
    const dependentsCount = (changeSimInfo.metadata?.directDependents?.length || 0) + (changeSimInfo.metadata?.transitiveDependents?.length || 0);

    if (blastRadius.toUpperCase() === "LARGE" || dependentsCount >= 10) {
      changeHealth = "HIGH_RISK";
      const msg = `Component '${symbolName}' change simulation indicates a LARGE blast radius touching ${dependentsCount} dependent(s).`;
      changeEvidence.push(createEvidence("large-blast-radius", msg));
      negativeSignals.push(msg);
    } else if (blastRadius.toUpperCase() === "MEDIUM" || dependentsCount >= 3) {
      changeHealth = "ATTENTION";
      const msg = `Component '${symbolName}' change simulation indicates a MEDIUM blast radius touching ${dependentsCount} dependent(s).`;
      changeEvidence.push(createEvidence("medium-blast-radius", msg));
      negativeSignals.push(msg);
    } else {
      const msg = `Component '${symbolName}' has a SMALL change blast radius.`;
      changeEvidence.push(createEvidence("small-blast-radius", msg));
      positiveSignals.push(msg);
    }
  } else {
    changeConfidence = "high";
    changeEvidence.push(createEvidence("default-change-sim", "Change simulator not run; assuming baseline localized change risk."));
  }

  dimensions.changeRisk = {
    classification: changeHealth,
    confidence: changeConfidence,
    evidence: changeEvidence,
    signals: { blastRadius }
  };

  // 4. TEST PROTECTION
  const testEvidence = [];
  let testHealth = "HEALTHY";
  let testConfidence = "medium";
  let testSignal = "unknown";

  if (testGapInfo) {
    testConfidence = "high";
    testSignal = testGapInfo.signal || testGapInfo.status || "unknown";

    if (testGapInfo.hasTestGap || testSignal === "known-coverage-failure" || testSignal === "no-test-evidence") {
      const isCritical = (bottleneckInfo && bottleneckInfo.isBottleneck) || (entryPointInfo && entryPointInfo.isEntryPoint) || fanIn >= 8;
      if (isCritical) {
        testHealth = "HIGH_RISK";
        const msg = `Uncovered critical component '${symbolName}' has test gap status '${testSignal}'.`;
        testEvidence.push(createEvidence("uncovered-critical-path", msg));
        negativeSignals.push(msg);
      } else {
        testHealth = "DEGRADED";
        const msg = `Component '${symbolName}' lacks test protection (test gap status: '${testSignal}').`;
        testEvidence.push(createEvidence("test-gap-present", msg));
        negativeSignals.push(msg);
      }
    } else if (testSignal === "covered" || testSignal === "likely-covered") {
      testHealth = "HEALTHY";
      const msg = `Component '${symbolName}' has valid test protection (${testSignal}).`;
      testEvidence.push(createEvidence("test-protected", msg));
      positiveSignals.push(msg);
    } else {
      testHealth = "ATTENTION";
      const msg = `Component '${symbolName}' test protection status is '${testSignal}'.`;
      testEvidence.push(createEvidence("test-ambiguous", msg));
    }
  } else {
    testHealth = "UNKNOWN";
    testConfidence = "unknown";
    unknownAreas.push("Test gap metadata unavailable for component.");
    testEvidence.push(createEvidence("missing-test-signals", "Test gap analysis signal not provided."));
  }

  dimensions.testProtection = {
    classification: testHealth,
    confidence: testConfidence,
    evidence: testEvidence,
    signals: { testSignal }
  };

  // 5. BOUNDARY RISK
  const boundaryEvidence = [];
  let boundaryHealth = "HEALTHY";
  let boundaryConfidence = externalBoundaryInfo ? "high" : "medium";

  if (externalBoundaryInfo && externalBoundaryInfo.hasExternalBoundary) {
    const types = externalBoundaryInfo.boundaryTypes || externalBoundaryInfo.types || [];
    if (types.length >= 2) {
      boundaryHealth = "DEGRADED";
      const msg = `Component '${symbolName}' concentrates multiple external boundaries (${types.join(", ")}).`;
      boundaryEvidence.push(createEvidence("external-boundary-concentration", msg));
      negativeSignals.push(msg);
    } else {
      boundaryHealth = "ATTENTION";
      const msg = `Component '${symbolName}' exposes external boundary (${types.join(", ") || "external integration"}).`;
      boundaryEvidence.push(createEvidence("external-boundary-present", msg));
    }
  } else {
    const msg = `Component '${symbolName}' has no unisolated external boundaries.`;
    boundaryEvidence.push(createEvidence("clean-boundary", msg));
    positiveSignals.push(msg);
  }

  dimensions.boundaryRisk = {
    classification: boundaryHealth,
    confidence: boundaryConfidence,
    evidence: boundaryEvidence,
    signals: { hasExternalBoundary: Boolean(externalBoundaryInfo?.hasExternalBoundary) }
  };

  // 6. SECURITY RISK
  const securityEvidence = [];
  let securityHealth = "HEALTHY";
  let securityConfidence = "medium";
  let sharingModel = "unspecified";

  if (securityInfo) {
    securityConfidence = securityInfo.confidence || "high";
    sharingModel = securityInfo.metadata?.sharingModel || securityInfo.primary || "unspecified";

    if (sharingModel === "unspecified" && symbol.type === "ApexClass") {
      securityHealth = "ATTENTION";
      const msg = `Class '${symbolName}' has unspecified sharing mode (omitted sharing declaration).`;
      securityEvidence.push(createEvidence("unspecified-sharing", msg));
      unknownAreas.push(`Class '${symbolName}' has unspecified sharing mode.`);
    } else if (sharingModel === "without sharing") {
      securityHealth = "ATTENTION";
      const msg = `Class '${symbolName}' explicitly declares 'without sharing' mode.`;
      securityEvidence.push(createEvidence("without-sharing", msg));
    } else {
      securityHealth = "HEALTHY";
      const msg = `Class '${symbolName}' declares valid sharing mode '${sharingModel}'.`;
      securityEvidence.push(createEvidence("valid-sharing", msg));
      positiveSignals.push(msg);
    }
  } else {
    securityHealth = "UNKNOWN";
    securityConfidence = "unknown";
    unknownAreas.push("Security boundary information unavailable.");
    securityEvidence.push(createEvidence("missing-security-signals", "Security boundaries not evaluated."));
  }

  dimensions.securityRisk = {
    classification: securityHealth,
    confidence: securityConfidence,
    evidence: securityEvidence,
    signals: { sharingModel }
  };

  // 7. ARCHITECTURAL DEBT
  const debtEvidence = [];
  let debtHealth = "HEALTHY";
  let debtConfidence = smellInfo ? "high" : "medium";

  const smells = smellInfo?.smells || smellInfo?.metadata?.smells || [];
  if (smells.length > 0) {
    const godOrHub = smells.some(s => s.smell === "god-component" || s.smell === "hub-component");
    const violations = smells.some(s => s.smell === "layer-violation" || s.smell === "mixed-responsibility");

    if (godOrHub || smells.length >= 3) {
      debtHealth = "HIGH_RISK";
      const msg = `Component '${symbolName}' exhibits severe debt smells: ${smells.map(s => s.smell).join(", ")}.`;
      debtEvidence.push(createEvidence("severe-architectural-debt", msg));
      negativeSignals.push(msg);
    } else if (violations || smells.length >= 1) {
      debtHealth = "DEGRADED";
      const msg = `Component '${symbolName}' exhibits architectural smells: ${smells.map(s => s.smell).join(", ")}.`;
      debtEvidence.push(createEvidence("architectural-smells-present", msg));
      negativeSignals.push(msg);
    }
  } else {
    const msg = `Component '${symbolName}' is free of detected architectural smells.`;
    debtEvidence.push(createEvidence("zero-smells", msg));
    positiveSignals.push(msg);
  }

  dimensions.architecturalDebt = {
    classification: debtHealth,
    confidence: debtConfidence,
    evidence: debtEvidence,
    signals: { smellCount: smells.length, smells: smells.map(s => s.smell) }
  };

  // 8. CONCENTRATION & BOTTLENECKS
  const bottleneckEvidence = [];
  let bottleneckHealth = "HEALTHY";
  let bottleneckConfidence = bottleneckInfo ? "high" : "medium";

  if (bottleneckInfo && bottleneckInfo.isBottleneck) {
    bottleneckHealth = "HIGH_RISK";
    const msg = `Component '${symbolName}' is a identified architectural bottleneck (score: ${bottleneckInfo.score || 0}).`;
    bottleneckEvidence.push(createEvidence("architectural-bottleneck", msg));
    negativeSignals.push(msg);
  } else {
    const msg = `Component '${symbolName}' is not a bottleneck component.`;
    bottleneckEvidence.push(createEvidence("not-a-bottleneck", msg));
    positiveSignals.push(msg);
  }

  dimensions.concentrationBottlenecks = {
    classification: bottleneckHealth,
    confidence: bottleneckConfidence,
    evidence: bottleneckEvidence,
    signals: { isBottleneck: Boolean(bottleneckInfo?.isBottleneck) }
  };

  // 9. ARCHITECTURAL CLARITY
  const clarityEvidence = [];
  let clarityHealth = "HEALTHY";
  let clarityConfidence = roleInfo && layerInfo ? "high" : "medium";

  const role = roleInfo?.primary || "unknown";
  const layer = layerInfo?.primary || "unknown";

  if (role === "unknown" || layer === "unknown") {
    clarityHealth = "ATTENTION";
    const msg = `Component '${symbolName}' has ambiguous role/layer clarity (role: '${role}', layer: '${layer}').`;
    clarityEvidence.push(createEvidence("ambiguous-role-layer", msg));
    unknownAreas.push(`Role or layer is unknown for component '${symbolName}'.`);
  } else {
    const msg = `Component '${symbolName}' has clear architectural role '${role}' and layer '${layer}'.`;
    clarityEvidence.push(createEvidence("clear-role-layer", msg));
    positiveSignals.push(msg);
  }

  dimensions.architecturalClarity = {
    classification: clarityHealth,
    confidence: clarityConfidence,
    evidence: clarityEvidence,
    signals: { role, layer }
  };

  // DETERMINE OVERALL COMPONENT HEALTH CLASSIFICATION
  const dimValues = Object.values(dimensions).map(d => d.classification);
  let overallHealth = "HEALTHY";

  if (dimValues.includes("HIGH_RISK")) {
    overallHealth = "HIGH_RISK";
  } else if (dimValues.filter(v => v === "DEGRADED").length >= 2 || (dimValues.includes("DEGRADED") && dimValues.includes("ATTENTION"))) {
    overallHealth = "DEGRADED";
  } else if (dimValues.includes("DEGRADED") || dimValues.filter(v => v === "ATTENTION").length >= 2) {
    overallHealth = "DEGRADED";
  } else if (dimValues.includes("ATTENTION")) {
    overallHealth = "ATTENTION";
  } else if (dimValues.every(v => v === "UNKNOWN")) {
    overallHealth = "UNKNOWN";
  }

  // Determine overall confidence
  let overallConfidence = "high";
  if (unknownAreas.length >= 3 || dimValues.filter(v => v === "UNKNOWN").length >= 3) {
    overallConfidence = "low";
  } else if (unknownAreas.length >= 1 || dimValues.includes("UNKNOWN")) {
    overallConfidence = "medium";
  }

  // Business Criticality distinction
  const explicitBusiness = businessInfo?.businessCriticality || "unknown";
  const structuralCriticality = businessInfo?.structuralCriticality?.level || "unknown";

  const resultEvidence = [
    createEvidence(
      "health-assessment-summary",
      `Component '${symbolName}' evaluated with overall health '${overallHealth}' (confidence: '${overallConfidence}').`
    )
  ];

  if (negativeSignals.length > 0) {
    resultEvidence.push(
      createEvidence("negative-health-drivers", `Primary negative drivers: ${negativeSignals.join("; ")}`)
    );
  }

  if (positiveSignals.length > 0) {
    resultEvidence.push(
      createEvidence("positive-health-drivers", `Primary positive drivers: ${positiveSignals.join("; ")}`)
    );
  }

  const result = createDeterministicResult({
    value: overallHealth,
    primary: overallHealth,
    confidence: overallConfidence,
    evidence: resultEvidence,
    secondary: Object.entries(dimensions).map(([k, v]) => `${k}:${v.classification}`),
    metadata: {
      componentId: symbolId,
      componentName: symbolName,
      overallHealth,
      confidence: overallConfidence,
      dimensions,
      strongestPositiveSignals: positiveSignals,
      strongestNegativeSignals: negativeSignals,
      unknownIncompleteAreas: unknownAreas,
      businessCriticality: explicitBusiness,
      structuralCriticality
    }
  });

  result.overallHealth = overallHealth;
  result.dimensions = dimensions;
  result.strongestPositiveSignals = positiveSignals;
  result.strongestNegativeSignals = negativeSignals;
  result.unknownIncompleteAreas = unknownAreas;
  result.businessCriticality = explicitBusiness;

  return result;
}

/**
 * Evaluates repository-wide architecture health by aggregating component-level and repository-level intelligence.
 */
function evaluateArchitectureHealth(registry, graph = null, metricList = [], options = {}) {
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];
  const metricById = new Map((metricList || []).map(m => [m.id, m]));

  if (symbols.length === 0 && (!graph || !graph.nodes || graph.nodes.length === 0)) {
    const emptyResult = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [createEvidence("empty-repository", "Repository registry and graph are empty or unavailable.")],
      metadata: {
        overallHealth: "UNKNOWN",
        confidence: "unknown",
        dimensions: {
          structuralCoupling: { classification: "UNKNOWN", confidence: "unknown", evidence: [], signals: {} },
          dependencyComplexity: { classification: "UNKNOWN", confidence: "unknown", evidence: [], signals: {} },
          changeRisk: { classification: "UNKNOWN", confidence: "unknown", evidence: [], signals: {} },
          testProtection: { classification: "UNKNOWN", confidence: "unknown", evidence: [], signals: {} },
          boundaryRisk: { classification: "UNKNOWN", confidence: "unknown", evidence: [], signals: {} },
          securityRisk: { classification: "UNKNOWN", confidence: "unknown", evidence: [], signals: {} },
          architecturalDebt: { classification: "UNKNOWN", confidence: "unknown", evidence: [], signals: {} },
          concentrationBottlenecks: { classification: "UNKNOWN", confidence: "unknown", evidence: [], signals: {} },
          architecturalClarity: { classification: "UNKNOWN", confidence: "unknown", evidence: [], signals: {} }
        },
        strongestPositiveSignals: [],
        strongestNegativeSignals: [],
        unknownIncompleteAreas: ["Repository contains 0 symbols or graph nodes."],
        businessCriticalitySummary: { explicitCount: 0, unknownCount: 0 }
      }
    });

    emptyResult.overallHealth = "UNKNOWN";
    emptyResult.dimensions = emptyResult.metadata.dimensions;
    emptyResult.strongestPositiveSignals = [];
    emptyResult.strongestNegativeSignals = [];
    emptyResult.unknownIncompleteAreas = emptyResult.metadata.unknownIncompleteAreas;
    emptyResult.businessCriticalitySummary = { explicitCount: 0, unknownCount: 0 };
    return emptyResult;
  }

  // Pre-computed aggregate analyses if provided or default
  const roleAnalysis = options.roles || null;
  const layerAnalysis = options.layers || null;
  const bottleneckAnalysis = options.bottlenecks || null;
  const entryPointAnalysis = options.entryPoints || null;
  const externalBoundaryAnalysis = options.externalBoundaries || null;
  const smellAnalysis = options.smells || null;
  const businessAnalysis = options.businessCriticality || null;
  const testGapSummary = options.testGapSummary || null;
  const cycles = options.cycles || [];

  const positiveSignals = [];
  const negativeSignals = [];
  const unknownAreas = [];

  // Evaluate all individual components
  const componentHealthMap = new Map();
  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const cHealth = evaluateComponentArchitectureHealth(symbol, graph, metric, {
      role: roleAnalysis?.symbolRoles?.get(symbol.id),
      layer: layerAnalysis?.symbolLayers?.get(symbol.id),
      bottleneck: bottleneckAnalysis?.componentBottlenecks?.get(symbol.id),
      entryPoint: entryPointAnalysis?.symbolEntryPoints?.get(symbol.id),
      externalBoundary: externalBoundaryAnalysis?.symbolExternalBoundaries?.get(symbol.id),
      smells: smellAnalysis?.componentSmells?.get(symbol.id),
      businessCriticality: businessAnalysis?.symbolCriticality?.get(symbol.id),
      testGapInfo: options.testGaps?.get ? options.testGaps.get(symbol.id) : null,
      cycles
    });
    componentHealthMap.set(symbol.id, cHealth);
  }

  // --- REPOSITORY DIMENSION 1: STRUCTURAL COUPLING ---
  const totalComponents = symbols.length || 1;
  const highCouplingCount = metricList.filter(m => (m.coupling || 0) >= 15).length;
  const mediumCouplingCount = metricList.filter(m => (m.coupling || 0) >= 8 && (m.coupling || 0) < 15).length;

  let repCouplingHealth = "HEALTHY";
  const repCouplingEvidence = [];
  if (highCouplingCount >= Math.max(1, Math.ceil(totalComponents * 0.15))) {
    repCouplingHealth = "HIGH_RISK";
    const msg = `${highCouplingCount} component(s) exceed high coupling threshold (>= 15).`;
    repCouplingEvidence.push(createEvidence("high-coupling-concentration", msg));
    negativeSignals.push(msg);
  } else if (highCouplingCount > 0 || mediumCouplingCount >= Math.max(1, Math.ceil(totalComponents * 0.25))) {
    repCouplingHealth = "ATTENTION";
    const msg = `${highCouplingCount} high-coupling and ${mediumCouplingCount} medium-coupling component(s) present.`;
    repCouplingEvidence.push(createEvidence("elevated-coupling-concentration", msg));
    negativeSignals.push(msg);
  } else {
    const msg = `Low coupling pressure across all ${totalComponents} repository components.`;
    repCouplingEvidence.push(createEvidence("healthy-coupling-distribution", msg));
    positiveSignals.push(msg);
  }

  // --- REPOSITORY DIMENSION 2: DEPENDENCY COMPLEXITY ---
  const cycleCount = cycles.length;
  let repComplexityHealth = "HEALTHY";
  const repComplexityEvidence = [];
  if (cycleCount >= 3) {
    repComplexityHealth = "HIGH_RISK";
    const msg = `Repository contains ${cycleCount} circular dependency groups.`;
    repComplexityEvidence.push(createEvidence("severe-circular-dependencies", msg));
    negativeSignals.push(msg);
  } else if (cycleCount >= 1) {
    repComplexityHealth = "DEGRADED";
    const msg = `Repository contains ${cycleCount} circular dependency group(s).`;
    repComplexityEvidence.push(createEvidence("circular-dependencies-present", msg));
    negativeSignals.push(msg);
  } else {
    const msg = `Repository contains 0 circular dependency loops.`;
    repComplexityEvidence.push(createEvidence("zero-circular-dependencies", msg));
    positiveSignals.push(msg);
  }

  // --- REPOSITORY DIMENSION 3: CHANGE RISK ---
  let repChangeHealth = "HEALTHY";
  const repChangeEvidence = [];
  const bottleneckCount = bottleneckAnalysis?.summary?.bottleneckCount ?? metricList.filter(m => (m.fanIn || 0) >= 8 && (m.fanOut || 0) >= 8).length;

  if (bottleneckCount >= Math.max(2, Math.ceil(totalComponents * 0.2))) {
    repChangeHealth = "HIGH_RISK";
    const msg = `${bottleneckCount} high-risk bottleneck component(s) expand change blast radius.`;
    repChangeEvidence.push(createEvidence("high-change-blast-radius", msg));
    negativeSignals.push(msg);
  } else if (bottleneckCount >= 1) {
    repChangeHealth = "ATTENTION";
    const msg = `${bottleneckCount} architectural bottleneck component(s) present.`;
    repChangeEvidence.push(createEvidence("moderate-change-blast-radius", msg));
    negativeSignals.push(msg);
  } else {
    const msg = "Repository has low change propagation pressure.";
    repChangeEvidence.push(createEvidence("small-change-propagation-risk", msg));
    positiveSignals.push(msg);
  }

  // --- REPOSITORY DIMENSION 4: TEST PROTECTION ---
  let repTestHealth = "HEALTHY";
  let repTestConfidence = testGapSummary ? "high" : "medium";
  const repTestEvidence = [];

  if (testGapSummary) {
    const gapsCount = testGapSummary.componentsWithTestGap || 0;
    const gapRatio = gapsCount / totalComponents;

    if (gapRatio >= 0.5 && totalComponents >= 3) {
      repTestHealth = "DEGRADED";
      const msg = `High test gap ratio: ${gapsCount} of ${totalComponents} component(s) (${Math.round(gapRatio * 100)}%) lack test protection.`;
      repTestEvidence.push(createEvidence("high-test-gap-ratio", msg));
      negativeSignals.push(msg);
    } else if (gapsCount > 0) {
      repTestHealth = "ATTENTION";
      const msg = `${gapsCount} component(s) exhibit test gap status.`;
      repTestEvidence.push(createEvidence("test-gaps-identified", msg));
      negativeSignals.push(msg);
    } else {
      const msg = "100% test protection verified across repository components.";
      repTestEvidence.push(createEvidence("full-test-protection", msg));
      positiveSignals.push(msg);
    }
  } else {
    repTestHealth = "UNKNOWN";
    repTestConfidence = "unknown";
    unknownAreas.push("Repository test gap summary unavailable.");
    repTestEvidence.push(createEvidence("missing-test-summary", "Test gap summary not provided."));
  }

  // --- REPOSITORY DIMENSION 5: BOUNDARY RISK ---
  let repBoundaryHealth = "HEALTHY";
  const repBoundaryEvidence = [];
  const extBoundaryCount = externalBoundaryAnalysis?.summary?.externalBoundaryComponentCount ?? 0;

  if (extBoundaryCount >= Math.max(3, Math.ceil(totalComponents * 0.3))) {
    repBoundaryHealth = "ATTENTION";
    const msg = `${extBoundaryCount} component(s) maintain external system boundaries.`;
    repBoundaryEvidence.push(createEvidence("elevated-external-boundaries", msg));
  } else {
    const msg = `Managed external boundary exposure across ${extBoundaryCount} component(s).`;
    repBoundaryEvidence.push(createEvidence("controlled-external-boundaries", msg));
    positiveSignals.push(msg);
  }

  // --- REPOSITORY DIMENSION 6: SECURITY RISK ---
  let repSecurityHealth = "HEALTHY";
  let repSecurityConfidence = "medium";
  const repSecurityEvidence = [];

  const unspecifiedSharingCount = symbols.filter(s => s.type === "ApexClass" && !s.parsed?.sharing).length;
  if (unspecifiedSharingCount >= Math.max(1, Math.ceil(totalComponents * 0.2))) {
    repSecurityHealth = "ATTENTION";
    repSecurityConfidence = "high";
    const msg = `${unspecifiedSharingCount} Apex class(es) lack explicit sharing model declarations.`;
    repSecurityEvidence.push(createEvidence("unspecified-sharing-concentration", msg));
    unknownAreas.push(`${unspecifiedSharingCount} Apex class(es) have unspecified sharing mode.`);
  } else if (unspecifiedSharingCount > 0) {
    repSecurityHealth = "HEALTHY";
    repSecurityConfidence = "medium";
    const msg = `${unspecifiedSharingCount} Apex class(es) have omitted sharing declaration.`;
    repSecurityEvidence.push(createEvidence("minor-unspecified-sharing", msg));
  } else {
    repSecurityConfidence = "high";
    const msg = "100% of Apex classes explicitly declare sharing models.";
    repSecurityEvidence.push(createEvidence("explicit-sharing-verified", msg));
    positiveSignals.push(msg);
  }

  // --- REPOSITORY DIMENSION 7: ARCHITECTURAL DEBT ---
  let repDebtHealth = "HEALTHY";
  const repDebtEvidence = [];
  const totalSmells = smellAnalysis?.summary?.totalSmellsCount ?? 0;
  const godCount = smellAnalysis?.summary?.smellCounts?.["god-component"] ?? 0;
  const violationCount = smellAnalysis?.summary?.smellCounts?.["layer-violation"] ?? 0;

  if (godCount >= 1 || totalSmells >= 5) {
    repDebtHealth = "HIGH_RISK";
    const msg = `Severe architectural debt: ${totalSmells} smell(s) detected (${godCount} god components, ${violationCount} layer violations).`;
    repDebtEvidence.push(createEvidence("severe-architectural-debt-detected", msg));
    negativeSignals.push(msg);
  } else if (totalSmells >= 1) {
    repDebtHealth = "DEGRADED";
    const msg = `Architectural debt identified: ${totalSmells} smell(s) present across repository.`;
    repDebtEvidence.push(createEvidence("architectural-smells-detected", msg));
    negativeSignals.push(msg);
  } else {
    const msg = "0 architectural smells detected across the repository.";
    repDebtEvidence.push(createEvidence("zero-architectural-smells", msg));
    positiveSignals.push(msg);
  }

  // --- REPOSITORY DIMENSION 8: CONCENTRATION & BOTTLENECKS ---
  let repBottleneckHealth = "HEALTHY";
  const repBottleneckEvidence = [];
  if (bottleneckCount >= 2) {
    repBottleneckHealth = "HIGH_RISK";
    const msg = `${bottleneckCount} central architectural bottlenecks identified.`;
    repBottleneckEvidence.push(createEvidence("multiple-bottlenecks-present", msg));
    negativeSignals.push(msg);
  } else if (bottleneckCount === 1) {
    repBottleneckHealth = "ATTENTION";
    const msg = "1 central architectural bottleneck identified.";
    repBottleneckEvidence.push(createEvidence("single-bottleneck-present", msg));
  } else {
    const msg = "Zero central architectural bottlenecks detected.";
    repBottleneckEvidence.push(createEvidence("zero-bottlenecks", msg));
    positiveSignals.push(msg);
  }

  // --- REPOSITORY DIMENSION 9: ARCHITECTURAL CLARITY ---
  let repClarityHealth = "HEALTHY";
  const repClarityEvidence = [];
  const unknownRoles = roleAnalysis ? (roleAnalysis.roles?.unknown || 0) : 0;

  if (unknownRoles >= Math.max(2, Math.ceil(totalComponents * 0.3))) {
    repClarityHealth = "ATTENTION";
    const msg = `${unknownRoles} component(s) have unclassified/unknown architectural roles.`;
    repClarityEvidence.push(createEvidence("ambiguous-component-roles", msg));
    unknownAreas.push(`${unknownRoles} component(s) have unknown architectural roles.`);
  } else {
    const msg = "Clear role and layer separation established for repository components.";
    repClarityEvidence.push(createEvidence("clear-architectural-structure", msg));
    positiveSignals.push(msg);
  }

  const dimensions = {
    structuralCoupling: { classification: repCouplingHealth, confidence: "high", evidence: repCouplingEvidence, signals: { highCouplingCount } },
    dependencyComplexity: { classification: repComplexityHealth, confidence: "high", evidence: repComplexityEvidence, signals: { cycleCount } },
    changeRisk: { classification: repChangeHealth, confidence: "high", evidence: repChangeEvidence, signals: { bottleneckCount } },
    testProtection: { classification: repTestHealth, confidence: repTestConfidence, evidence: repTestEvidence, signals: { gapsCount: testGapSummary?.componentsWithTestGap || 0 } },
    boundaryRisk: { classification: repBoundaryHealth, confidence: "high", evidence: repBoundaryEvidence, signals: { extBoundaryCount } },
    securityRisk: { classification: repSecurityHealth, confidence: repSecurityConfidence, evidence: repSecurityEvidence, signals: { unspecifiedSharingCount } },
    architecturalDebt: { classification: repDebtHealth, confidence: "high", evidence: repDebtEvidence, signals: { totalSmells, godCount } },
    concentrationBottlenecks: { classification: repBottleneckHealth, confidence: "high", evidence: repBottleneckEvidence, signals: { bottleneckCount } },
    architecturalClarity: { classification: repClarityHealth, confidence: "high", evidence: repClarityEvidence, signals: { unknownRoles } }
  };

  // OVERALL REPOSITORY HEALTH CLASSIFICATION
  const dimValues = Object.values(dimensions).map(d => d.classification);
  let overallHealth = "HEALTHY";

  if (dimValues.includes("HIGH_RISK")) {
    overallHealth = "HIGH_RISK";
  } else if (dimValues.filter(v => v === "DEGRADED").length >= 2 || (dimValues.includes("DEGRADED") && dimValues.includes("ATTENTION"))) {
    overallHealth = "DEGRADED";
  } else if (dimValues.includes("DEGRADED") || dimValues.filter(v => v === "ATTENTION").length >= 3) {
    overallHealth = "DEGRADED";
  } else if (dimValues.includes("ATTENTION")) {
    overallHealth = "ATTENTION";
  } else if (dimValues.every(v => v === "UNKNOWN")) {
    overallHealth = "UNKNOWN";
  }

  let overallConfidence = "high";
  if (unknownAreas.length >= 3 || dimValues.filter(v => v === "UNKNOWN").length >= 3) {
    overallConfidence = "low";
  } else if (unknownAreas.length >= 1 || dimValues.includes("UNKNOWN")) {
    overallConfidence = "medium";
  }

  // Business criticality remains strictly distinct
  const businessSummary = businessAnalysis?.summary || {
    explicitBusinessCriticalityCount: 0,
    unknownBusinessCriticalityCount: symbols.length
  };

  const summaryEvidence = [
    createEvidence(
      "repository-health-evaluation",
      `Repository evaluated with overall health '${overallHealth}' across ${totalComponents} component(s) (confidence: '${overallConfidence}').`
    )
  ];

  if (negativeSignals.length > 0) {
    summaryEvidence.push(
      createEvidence("negative-health-drivers", `Primary negative drivers: ${negativeSignals.join("; ")}`)
    );
  }

  if (positiveSignals.length > 0) {
    summaryEvidence.push(
      createEvidence("positive-health-drivers", `Primary positive drivers: ${positiveSignals.join("; ")}`)
    );
  }

  const result = createDeterministicResult({
    value: overallHealth,
    primary: overallHealth,
    confidence: overallConfidence,
    evidence: summaryEvidence,
    secondary: Object.entries(dimensions).map(([k, v]) => `${k}:${v.classification}`),
    metadata: {
      overallHealth,
      confidence: overallConfidence,
      dimensions,
      strongestPositiveSignals: positiveSignals,
      strongestNegativeSignals: negativeSignals,
      unknownIncompleteAreas: unknownAreas,
      businessCriticalitySummary: businessSummary,
      componentHealthCount: componentHealthMap.size
    }
  });

  result.overallHealth = overallHealth;
  result.dimensions = dimensions;
  result.strongestPositiveSignals = positiveSignals;
  result.strongestNegativeSignals = negativeSignals;
  result.unknownIncompleteAreas = unknownAreas;
  result.businessCriticalitySummary = businessSummary;
  result.componentHealthMap = componentHealthMap;

  return result;
}

module.exports = {
  HEALTH_LEVELS,
  classifyHealthFromPressure,
  evaluateComponentArchitectureHealth,
  evaluateArchitectureHealth
};
