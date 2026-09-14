/**
 * Deterministic Architectural Safety Envelope Classifier (WAVE-C1)
 *
 * Evaluates whether an architectural component or proposed change is:
 *   - SAFE
 *   - SAFE_WITH_REVIEW
 *   - HIGH_RISK
 *   - BLOCKED
 *   - UNKNOWN
 *
 * This is an architectural safety classification based strictly on deterministic
 * repository facts and intelligence, NOT an LLM judgment.
 *
 * Boundary Rules:
 *   - 0 LLM runtime dependencies or calls.
 *   - 0 RL dependencies.
 *   - Conservative deterministic authority.
 *   - No circular dependencies.
 *   - Reuses existing graph/impact/boundary/smell/criticality infrastructure.
 *   - Centralized, explainable, named thresholds.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

const { classifyComponentRole } = require("./role-classifier.cjs");
const { classifyComponentLayer } = require("./layer-classifier.cjs");
const { detectEntryPoint } = require("./entry-points.cjs");
const { detectExternalBoundary } = require("./external-boundaries.cjs");
const { analyzeSecurityBoundaries } = require("./security-boundaries.cjs");
const { analyzeComponentDataImpact } = require("./data-impact.cjs");
const { detectComponentSmells } = require("./architecture-smells.cjs");
const { classifyComponentBusinessCriticality } = require("./business-criticality.cjs");
const { simulateChange } = require("./change-simulator.cjs");
const { detectComponentBottleneck } = require("./bottleneck-detector.cjs");

const SAFETY_CLASSIFICATIONS = Object.freeze([
  "SAFE",
  "SAFE_WITH_REVIEW",
  "HIGH_RISK",
  "BLOCKED",
  "UNKNOWN"
]);

/**
 * Centralized, explainable thresholds for deterministic safety classification.
 */
const SAFETY_THRESHOLDS = Object.freeze({
  BLOCKED_COUPLING: 20,
  BLOCKED_FAN_IN: 15,
  BLOCKED_TRANSITIVE_DEPENDENTS: 15,
  HIGH_RISK_COUPLING: 12,
  HIGH_RISK_FAN_IN: 8,
  HIGH_RISK_TRANSITIVE_DEPENDENTS: 5,
  SAFE_MAX_COUPLING: 4,
  SAFE_MAX_FAN_OUT: 4,
  SAFE_MAX_FAN_IN: 4,
  EXTERNAL_BOUNDARY_CRITICAL_COUNT: 2
});

/**
 * Evaluates deterministic safety envelope classification for a component or change.
 *
 * @param {Object} symbol Symbol definition object.
 * @param {Object} [graph] Graph object { nodes, edges }.
 * @param {Object} [metric] Coupling metric object { fanIn, fanOut, coupling, risk }.
 * @param {Object} [registry] Symbol registry object { symbols, byName }.
 * @param {Object} [options] Pre-evaluated context or options.
 * @returns {Object} BASE-ARCH-1 contract result with safety classification.
 */
function classifyComponentSafetyEnvelope(
  symbol,
  graph = null,
  metric = null,
  registry = null,
  options = {}
) {
  if (!symbol) {
    const res = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null. Safety classification is UNKNOWN.")],
      secondary: [],
      metadata: {
        safetyClassification: "UNKNOWN",
        blockers: [],
        riskFactors: [],
        safeguards: [],
        signals: {}
      }
    });
    res.safetyClassification = "UNKNOWN";
    res.blockers = [];
    res.riskFactors = [];
    res.safeguards = [];
    return res;
  }

  const symbolId = symbol.id || `ApexClass:${symbol.name}`;
  const p = symbol.parsed || {};
  const name = String(symbol.name || p.name || symbolId).trim();

  // If parsed representation is missing or unparseable, classify as UNKNOWN
  if (!symbol.parsed && Object.keys(symbol).length <= 2) {
    const res = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [createEvidence("unparsed-symbol", `Component '${name}' lacks parsed AST representation. Safety is UNKNOWN.`)],
      secondary: [],
      metadata: {
        safetyClassification: "UNKNOWN",
        blockers: [],
        riskFactors: [],
        safeguards: [],
        signals: {}
      }
    });
    res.safetyClassification = "UNKNOWN";
    res.blockers = [];
    res.riskFactors = [];
    res.safeguards = [];
    return res;
  }

  // Gather / evaluate component intelligence signals
  const roleInfo = options.roleInfo || classifyComponentRole(symbol, graph, metric);
  const layerInfo = options.layerInfo || classifyComponentLayer(symbol, graph, metric, roleInfo);
  const entryPointInfo = options.entryPointInfo || detectEntryPoint(symbol, graph, metric);
  const externalBoundaryInfo = options.externalBoundaryInfo || detectExternalBoundary(symbol, graph, metric);
  const securityBoundaries = options.securityBoundaries || analyzeSecurityBoundaries(symbol, graph);
  const dataImpact = options.dataImpact || (registry ? analyzeComponentDataImpact(symbol, graph, registry) : null);

  // Evaluate test gap info
  let testGapInfo = options.testGapInfo || null;
  if (!testGapInfo && options.analyzeTestGapFn) {
    testGapInfo = options.analyzeTestGapFn(symbol, registry, graph);
  } else if (!testGapInfo && p.coverage) {
    const percent = p.coverage.percentCovered ?? p.coverage.percent;
    const isFailed = p.coverage.failed === true || (percent !== undefined && percent < 75);
    testGapInfo = {
      hasTestGap: isFailed,
      signal: isFailed ? "known-coverage-failure" : "covered",
      status: isFailed ? "KNOWN_COVERAGE_FAILURE" : "COVERED",
      reason: isFailed ? `Known coverage ${percent}% below 75%` : `Coverage ${percent}% passed`
    };
  }

  const smellsInfo = options.smellsInfo || detectComponentSmells(symbol, graph, metric, {
    cycles: options.cycles || [],
    testGapInfo
  });

  const criticalityInfo = options.criticalityInfo || classifyComponentBusinessCriticality(
    symbol,
    graph,
    metric,
    roleInfo,
    layerInfo,
    entryPointInfo,
    externalBoundaryInfo
  );

  const simulationResult = options.simulationResult || (
    graph ? simulateChange(symbol, "modify_component", graph, registry, options) : null
  );

  const bottleneckInfo = options.bottleneckInfo || detectComponentBottleneck(
    symbol,
    graph,
    metric,
    options.cycles || []
  );

  // Extract metrics & impact metrics
  const fanIn = metric?.fanIn ?? 0;
  const fanOut = metric?.fanOut ?? 0;
  const coupling = metric?.coupling ?? (fanIn + fanOut);

  const simMeta = simulationResult?.metadata || {};
  const blastRadiusLevel = simMeta.blastRadiusLevel || "SMALL";
  const transitiveDependents = Array.isArray(simMeta.transitiveDependents) ? simMeta.transitiveDependents : [];
  const directDependents = Array.isArray(simMeta.directDependents) ? simMeta.directDependents : [];
  const cyclesInvolved = simMeta.cycleInvolved || (options.cycles || []).some(c => Array.isArray(c) && c.includes(symbolId));

  const blockers = [];
  const riskFactors = [];
  const safeguards = [];

  // =========================================================================
  // 1. DETERMINISTIC BLOCKERS EVALUATION
  // =========================================================================

  // Blocker Rule 1: Critical Business Component with Inadequate Test Evidence
  const isHighBusinessCriticality = criticalityInfo?.businessCriticality === "high" || criticalityInfo?.value === "high";
  const hasTestGap = testGapInfo ? Boolean(testGapInfo.hasTestGap || testGapInfo.signal === "no-test-evidence" || testGapInfo.signal === "known-coverage-failure") : false;

  if (isHighBusinessCriticality && hasTestGap) {
    blockers.push(
      createEvidence(
        "critical-business-component-test-gap",
        `High business criticality component '${name}' has inadequate test evidence (${testGapInfo?.reason || "no tests"}). Refactoring is BLOCKED until tests exist.`
      )
    );
  }

  // Blocker Rule 2: Critical External Boundary Impact
  const boundaryTypes = externalBoundaryInfo?.boundaryTypes || externalBoundaryInfo?.metadata?.types || [];
  const callouts = Array.isArray(p.callouts) ? p.callouts : [];
  const hasCriticalExternalBoundary = externalBoundaryInfo?.hasExternalBoundary && (
    boundaryTypes.length >= SAFETY_THRESHOLDS.EXTERNAL_BOUNDARY_CRITICAL_COUNT ||
    callouts.length >= SAFETY_THRESHOLDS.EXTERNAL_BOUNDARY_CRITICAL_COUNT ||
    (externalBoundaryInfo.hasExternalBoundary && (coupling >= SAFETY_THRESHOLDS.HIGH_RISK_COUPLING || entryPointInfo.isEntryPoint))
  );

  if (hasCriticalExternalBoundary) {
    blockers.push(
      createEvidence(
        "critical-external-boundary-impact",
        `Component '${name}' manages critical external boundary integrations (${boundaryTypes.join(", ") || callouts.join(", ") || "external integration"}) combined with entry-point exposure or high coupling.`
      )
    );
  }

  // Blocker Rule 3: Critical Security Boundary Impact
  const sharingModel = String(p.sharing || securityBoundaries?.metadata?.sharingModel || "").toLowerCase();
  const isWithoutSharing = sharingModel === "without sharing";
  const hasSoqlOrDml = (Array.isArray(p.soql) && p.soql.length > 0) || (Array.isArray(p.dml) && p.dml.length > 0);
  const isSecured = p.behavior?.securitySignals?.some(s => /USER_MODE|SECURITY_ENFORCED/i.test(s));

  if (isWithoutSharing && (entryPointInfo.isEntryPoint || (hasSoqlOrDml && !isSecured))) {
    blockers.push(
      createEvidence(
        "critical-security-boundary-impact",
        `Component '${name}' operates in 'without sharing' mode with entry-point exposure or database persistence operations without explicit USER_MODE / SECURITY_ENFORCED checks.`
      )
    );
  }

  // Blocker Rule 4: Unresolved Architectural Ambiguity in Critical Path
  const dynamicApex = Array.isArray(p.dynamicApex) ? p.dynamicApex : [];
  const unresolvedInTarget = Array.isArray(simMeta.riskSignals) && simMeta.riskSignals.some(r => r.rule === "unresolved-reference");
  const isHighCouplingOrBottleneck = coupling >= SAFETY_THRESHOLDS.HIGH_RISK_COUPLING || bottleneckInfo.isBottleneck;

  if ((dynamicApex.length > 0 || unresolvedInTarget) && isHighCouplingOrBottleneck) {
    blockers.push(
      createEvidence(
        "unresolved-architectural-ambiguity",
        `Component '${name}' contains dynamic Apex / unresolved references (${dynamicApex.join(", ") || "unresolved deps"}) while acting as a high-coupling bottleneck.`
      )
    );
  }

  // Blocker Rule 5: Broad Transitive Impact Combined with Insufficient Safeguards
  if (blastRadiusLevel === "LARGE" && cyclesInvolved && (hasTestGap || smellsInfo.hasSmells)) {
    blockers.push(
      createEvidence(
        "broad-transitive-impact-unprotected",
        `Broad transitive impact (LARGE blast radius, ${transitiveDependents.length} transitive dependents) combined with circular dependency participation and test gaps/smells.`
      )
    );
  }

  // =========================================================================
  // 2. RISK FACTORS EVALUATION
  // =========================================================================

  if (coupling >= SAFETY_THRESHOLDS.HIGH_RISK_COUPLING || fanIn >= SAFETY_THRESHOLDS.HIGH_RISK_FAN_IN) {
    riskFactors.push(
      createEvidence(
        "high-coupling",
        `High coupling metrics: fan-in ${fanIn}, fan-out ${fanOut}, total coupling ${coupling} (threshold >= ${SAFETY_THRESHOLDS.HIGH_RISK_COUPLING}).`
      )
    );
  }

  if (transitiveDependents.length >= SAFETY_THRESHOLDS.HIGH_RISK_TRANSITIVE_DEPENDENTS || blastRadiusLevel === "LARGE") {
    riskFactors.push(
      createEvidence(
        "broad-transitive-impact",
        `Broad blast radius: ${transitiveDependents.length} transitive dependent(s) affected.`
      )
    );
  }

  if (bottleneckInfo.isBottleneck) {
    riskFactors.push(
      createEvidence(
        "architectural-bottleneck",
        `Component is classified as an architectural bottleneck.`
      )
    );
  }

  if (externalBoundaryInfo.hasExternalBoundary) {
    riskFactors.push(
      createEvidence(
        "external-boundary-exposure",
        `Component interfaces with external system boundaries (${boundaryTypes.join(", ") || "external system"}).`
      )
    );
  }

  if (isWithoutSharing || sharingModel === "inherited sharing") {
    riskFactors.push(
      createEvidence(
        "security-boundary-exposure",
        `Security sharing declaration is '${sharingModel || "unspecified"}'.`
      )
    );
  }

  if (smellsInfo.hasSmells) {
    const smellNames = (smellsInfo.smells || []).map(s => s.smell).join(", ");
    riskFactors.push(
      createEvidence(
        "architecture-smells-present",
        `Architectural smell(s) detected: ${smellNames || "smells present"}.`
      )
    );
  }

  if (entryPointInfo.isEntryPoint) {
    riskFactors.push(
      createEvidence(
        "entry-point-exposure",
        `Component is an architectural entry point (${entryPointInfo.primary || "Entry Point"}).`
      )
    );
  }

  if (hasTestGap && !isHighBusinessCriticality) {
    riskFactors.push(
      createEvidence(
        "test-gap-present",
        `Test gap identified for component (${testGapInfo?.reason || "no direct test evidence"}).`
      )
    );
  }

  if (isHighBusinessCriticality && !hasTestGap) {
    riskFactors.push(
      createEvidence(
        "high-business-criticality",
        `Component has high explicit business criticality (passing tests present).`
      )
    );
  }

  if (cyclesInvolved) {
    riskFactors.push(
      createEvidence(
        "cycle-participant",
        `Component or its immediate blast radius participates in circular dependencies.`
      )
    );
  }

  // =========================================================================
  // 3. SAFEGUARDS EVALUATION
  // =========================================================================

  if (!hasTestGap && testGapInfo) {
    safeguards.push(
      createEvidence(
        "covered-by-tests",
        `Component has passing test coverage / direct test suite reference (${testGapInfo.status || testGapInfo.signal}).`
      )
    );
  }

  if (coupling <= SAFETY_THRESHOLDS.SAFE_MAX_COUPLING) {
    safeguards.push(
      createEvidence(
        "low-coupling",
        `Low coupling score: ${coupling} (threshold <= ${SAFETY_THRESHOLDS.SAFE_MAX_COUPLING}).`
      )
    );
  }

  if (!smellsInfo.hasSmells) {
    safeguards.push(
      createEvidence(
        "clean-architecture",
        `No architectural smells detected.`
      )
    );
  }

  if (coupling === 0) {
    safeguards.push(
      createEvidence(
        "isolated-component",
        `Component is isolated with zero inbound and outbound dependencies.`
      )
    );
  }

  if (sharingModel === "with sharing") {
    safeguards.push(
      createEvidence(
        "explicit-security-mode",
        `Component explicitly declares 'with sharing' security enforcement.`
      )
    );
  }

  // =========================================================================
  // 4. CLASSIFICATION DETERMINATION
  // =========================================================================

  let classification = "SAFE";
  let confidence = "high";

  if (blockers.length > 0) {
    classification = "BLOCKED";
  } else if (
    riskFactors.length >= 2 ||
    riskFactors.some(r => [
      "broad-transitive-impact",
      "high-coupling",
      "external-boundary-exposure",
      "architectural-bottleneck",
      "architecture-smells-present"
    ].includes(r.rule))
  ) {
    classification = "HIGH_RISK";
  } else if (
    riskFactors.length === 1 ||
    entryPointInfo.isEntryPoint ||
    hasTestGap ||
    criticalityInfo?.businessCriticality === "medium"
  ) {
    classification = "SAFE_WITH_REVIEW";
  } else if (blockers.length === 0 && riskFactors.length === 0) {
    classification = "SAFE";
  } else {
    classification = "UNKNOWN";
    confidence = "unknown";
  }

  const allEvidence = [
    ...blockers,
    ...riskFactors,
    ...safeguards
  ];

  if (allEvidence.length === 0) {
    allEvidence.push(
      createEvidence(
        "default-safety-evaluation",
        `Component '${name}' evaluated as ${classification} with no specific risk signals or blockers.`
      )
    );
  }

  const result = createDeterministicResult({
    value: classification,
    primary: classification,
    confidence,
    evidence: allEvidence,
    secondary: [
      ...blockers.map(b => `blocker:${b.rule}`),
      ...riskFactors.map(r => `risk:${r.rule}`),
      ...safeguards.map(s => `safeguard:${s.rule}`)
    ],
    metadata: {
      safetyClassification: classification,
      blockers,
      riskFactors,
      safeguards,
      signals: {
        role: roleInfo?.primary || "unknown",
        layer: layerInfo?.primary || "unknown",
        isEntryPoint: entryPointInfo?.isEntryPoint || false,
        hasExternalBoundary: externalBoundaryInfo?.hasExternalBoundary || false,
        sharingModel: sharingModel || "unspecified",
        testStatus: testGapInfo?.status || testGapInfo?.signal || "unknown",
        hasSmells: smellsInfo?.hasSmells || false,
        businessCriticality: criticalityInfo?.businessCriticality || "unknown",
        blastRadiusLevel,
        coupling,
        fanIn,
        fanOut
      }
    }
  });

  result.safetyClassification = classification;
  result.blockers = blockers;
  result.riskFactors = riskFactors;
  result.safeguards = safeguards;

  return result;
}

/**
 * Evaluates safety envelope classification across all components in a symbol registry.
 */
function classifyAllSafetyEnvelopes(registry, graph = null, metricList = [], options = {}) {
  const metricById = new Map((metricList || []).map(m => [m.id, m]));
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];

  const symbolSafetyEnvelopes = new Map();
  const summary = {
    totalComponents: symbols.length,
    byClassification: {
      SAFE: 0,
      SAFE_WITH_REVIEW: 0,
      HIGH_RISK: 0,
      BLOCKED: 0,
      UNKNOWN: 0
    },
    blockerCounts: {},
    riskFactorCounts: {}
  };

  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const safetyInfo = classifyComponentSafetyEnvelope(symbol, graph, metric, registry, options);

    symbolSafetyEnvelopes.set(symbol.id, safetyInfo);

    const classification = safetyInfo.safetyClassification || "UNKNOWN";
    if (summary.byClassification[classification] !== undefined) {
      summary.byClassification[classification]++;
    } else {
      summary.byClassification.UNKNOWN++;
    }

    for (const b of safetyInfo.blockers || []) {
      summary.blockerCounts[b.rule] = (summary.blockerCounts[b.rule] || 0) + 1;
    }

    for (const r of safetyInfo.riskFactors || []) {
      summary.riskFactorCounts[r.rule] = (summary.riskFactorCounts[r.rule] || 0) + 1;
    }
  }

  return {
    symbolSafetyEnvelopes,
    summary
  };
}

module.exports = {
  SAFETY_CLASSIFICATIONS,
  SAFETY_THRESHOLDS,
  classifyComponentSafetyEnvelope,
  classifyAllSafetyEnvelopes
};
