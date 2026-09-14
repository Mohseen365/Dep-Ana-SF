/**
 * Deterministic Duplicate Architectural Responsibility Detector (WAVE-D4)
 *
 * Detects components that exhibit overlapping or duplicated architectural responsibility
 * using combinations of 100% deterministic repository facts, capability outputs,
 * roles, layers, domains, data/object impact, entry points, and graph relationships.
 *
 * Conservative Rules:
 *   - 0 LLM runtime dependencies or calls.
 *   - Diagnostic language ONLY: "These components exhibit overlapping architectural responsibility signals."
 *   - MUST NOT claim code/business logic equivalence based merely on similar names or code.
 *   - Avoids false positives by recognizing legitimate separation (e.g. selectors for different objects,
 *     controllers for different entry points, services in same domain with distinct data/dependencies).
 *   - Classifications: NO_DUPLICATION_SIGNAL, POSSIBLE_OVERLAP, STRONG_OVERLAP, UNKNOWN.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult,
  enforceDeterministicAuthority
} = require("./deterministic/contract.cjs");

const { classifyComponentRole } = require("./role-classifier.cjs");
const { classifyComponentLayer } = require("./layer-classifier.cjs");
const { classifyComponentDomain } = require("./domain-classifier.cjs");
const { analyzeComponentDataImpact } = require("./data-impact.cjs");
const { detectEntryPoint } = require("./entry-points.cjs");
const { detectExternalBoundary } = require("./external-boundaries.cjs");
const { detectComponentSmells } = require("./architecture-smells.cjs");

const DUPLICATION_CLASSIFICATIONS = Object.freeze([
  "NO_DUPLICATION_SIGNAL",
  "POSSIBLE_OVERLAP",
  "STRONG_OVERLAP",
  "UNKNOWN"
]);

/**
 * Computes Jaccard similarity index between two Sets or Arrays.
 */
function jaccardSimilarity(a, b) {
  const setA = new Set(a || []);
  const setB = new Set(b || []);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const elem of setA) {
    if (setB.has(elem)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Extracts normalized data objects associated with a component.
 */
function getComponentDataObjects(symbol, registry = null, graph = null) {
  const p = symbol?.parsed || {};
  const directObjs = new Set([
    ...(Array.isArray(p.objects) ? p.objects : []),
    ...(Array.isArray(p.soql) ? p.soql.map(s => s.object) : []),
    ...(Array.isArray(p.dml) ? p.dml.map(d => d.variable || d.object).filter(Boolean) : [])
  ].map(o => String(o).trim().toLowerCase()).filter(Boolean));

  if (directObjs.size > 0) return Array.from(directObjs);

  const impact = analyzeComponentDataImpact(symbol, graph, registry);
  const impactObjs = (impact.metadata?.objects || []).map(o => String(o.name).trim().toLowerCase());
  return impactObjs;
}

/**
 * Evaluates duplicate architectural responsibility signals between a target symbol and a candidate symbol.
 */
function compareTwoComponentsForDuplication(targetSymbol, candidateSymbol, graph = null, registry = null, options = {}) {
  if (!targetSymbol || !candidateSymbol || targetSymbol.id === candidateSymbol.id) {
    return null;
  }

  const tParsed = targetSymbol.parsed || {};
  const cParsed = candidateSymbol.parsed || {};

  const tName = String(targetSymbol.name || tParsed.name || targetSymbol.id).trim();
  const cName = String(candidateSymbol.name || cParsed.name || candidateSymbol.id).trim();

  // Test components vs production components are intentionally separated
  const tIsTest = Boolean(tParsed.isTest || targetSymbol.type === "ApexClass" && /Test$/i.test(tName));
  const cIsTest = Boolean(cParsed.isTest || candidateSymbol.type === "ApexClass" && /Test$/i.test(cName));
  if (tIsTest !== cIsTest) {
    return null; // Test vs Production separation
  }

  // 1. Role & Layer Analysis
  const tRoleInfo = options.roleInfoMap?.get(targetSymbol.id) || classifyComponentRole(targetSymbol, graph, null);
  const cRoleInfo = options.roleInfoMap?.get(candidateSymbol.id) || classifyComponentRole(candidateSymbol, graph, null);

  const tLayerInfo = options.layerInfoMap?.get(targetSymbol.id) || classifyComponentLayer(targetSymbol, graph, null, tRoleInfo);
  const cLayerInfo = options.layerInfoMap?.get(candidateSymbol.id) || classifyComponentLayer(candidateSymbol, graph, null, cRoleInfo);

  const sameRole = tRoleInfo.primary === cRoleInfo.primary && tRoleInfo.primary !== "unknown";
  const sameLayer = tLayerInfo.primary === cLayerInfo.primary && tLayerInfo.primary !== "unknown";

  // 2. Domain Analysis
  const tDomainInfo = options.domainInfoMap?.get(targetSymbol.id) || classifyComponentDomain(targetSymbol, registry, graph, null, null);
  const cDomainInfo = options.domainInfoMap?.get(candidateSymbol.id) || classifyComponentDomain(candidateSymbol, registry, graph, null, null);

  const sameDomain = tDomainInfo.primary === cDomainInfo.primary && tDomainInfo.primary !== "unknown";

  // 3. Data / Object Responsibility
  const tObjs = getComponentDataObjects(targetSymbol, registry, graph);
  const cObjs = getComponentDataObjects(candidateSymbol, registry, graph);
  const dataOverlapRatio = jaccardSimilarity(tObjs, cObjs);
  const hasSharedDataObjects = tObjs.some(o => cObjs.includes(o));

  // If both components interact with completely disjoint sets of data objects (e.g., AccountSelector vs ContactSelector),
  // they are legitimate separate components, NOT duplicates.
  const disjointDataObjects = tObjs.length > 0 && cObjs.length > 0 && !hasSharedDataObjects;

  // 4. Entry Point Responsibility
  const tEpInfo = options.entryPointInfoMap?.get(targetSymbol.id) || detectEntryPoint(targetSymbol, graph, null);
  const cEpInfo = options.entryPointInfoMap?.get(candidateSymbol.id) || detectEntryPoint(candidateSymbol, graph, null);

  const bothEntryPoints = tEpInfo.isEntryPoint && cEpInfo.isEntryPoint;
  const epTypeOverlap = jaccardSimilarity(tEpInfo.entryPointTypes, cEpInfo.entryPointTypes);
  // Legitimate separation: controllers/handlers for different entry points or boundaries
  const differentEntryBoundaries = tEpInfo.isEntryPoint && cEpInfo.isEntryPoint && epTypeOverlap === 0;

  // 5. External Boundaries
  const tExtInfo = options.extBoundaryInfoMap?.get(targetSymbol.id) || detectExternalBoundary(targetSymbol, graph, null);
  const cExtInfo = options.extBoundaryInfoMap?.get(candidateSymbol.id) || detectExternalBoundary(candidateSymbol, graph, null);
  const bothExternal = tExtInfo.hasExternalBoundary && cExtInfo.hasExternalBoundary;

  // 6. Graph Edges / Dependency & Consumer Overlap
  let depOverlapRatio = 0;
  let consumerOverlapRatio = 0;

  if (graph && Array.isArray(graph.edges)) {
    const tDeps = graph.edges.filter(e => e.from === targetSymbol.id).map(e => e.to);
    const cDeps = graph.edges.filter(e => e.from === candidateSymbol.id).map(e => e.to);
    depOverlapRatio = jaccardSimilarity(tDeps, cDeps);

    const tConsumers = graph.edges.filter(e => e.to === targetSymbol.id).map(e => e.from);
    const cConsumers = graph.edges.filter(e => e.to === candidateSymbol.id).map(e => e.from);
    consumerOverlapRatio = jaccardSimilarity(tConsumers, cConsumers);
  }

  // 7. Architectural Smells / Debt Duplication Signals
  const tSmellsInfo = options.smellsInfoMap?.get(targetSymbol.id) || detectComponentSmells(targetSymbol, graph, null, {});
  const hasMixedOrGodSmell = tSmellsInfo.smells?.some(s => s.smell === "mixed-responsibility" || s.smell === "god-component");

  // EVALUATE OVERLAP SIGNALS & FALSE POSITIVE SEPARATION FACTORS
  const signalEvidence = [];
  let signalScore = 0;

  if (sameRole) {
    signalScore += 2;
    signalEvidence.push(createEvidence("same-architectural-role", `Both '${tName}' and '${cName}' share architectural role '${tRoleInfo.primary}'.`));
  }

  if (sameLayer) {
    signalScore += 1;
    signalEvidence.push(createEvidence("same-architectural-layer", `Both '${tName}' and '${cName}' operate in layer '${tLayerInfo.primary}'.`));
  }

  if (sameDomain) {
    signalScore += 3;
    signalEvidence.push(createEvidence("same-architectural-domain", `Both components map to domain '${tDomainInfo.primary}'.`));
  }

  if (hasSharedDataObjects && dataOverlapRatio > 0) {
    const scoreVal = dataOverlapRatio >= 0.8 ? 4 : 2;
    signalScore += scoreVal;
    const sharedList = tObjs.filter(o => cObjs.includes(o)).join(", ");
    signalEvidence.push(createEvidence("shared-data-objects", `Components share SObject responsibility over: ${sharedList} (Jaccard similarity ${Math.round(dataOverlapRatio * 100)}%).`));
  }

  if (depOverlapRatio >= 0.5) {
    signalScore += 3;
    signalEvidence.push(createEvidence("overlapping-dependencies", `Components share ${Math.round(depOverlapRatio * 100)}% of outgoing architectural dependencies.`));
  }

  if (consumerOverlapRatio >= 0.5) {
    signalScore += 3;
    signalEvidence.push(createEvidence("overlapping-consumers", `Components are consumed by ${Math.round(consumerOverlapRatio * 100)}% of the same callers.`));
  }

  if (bothEntryPoints && epTypeOverlap > 0) {
    signalScore += 2;
    signalEvidence.push(createEvidence("overlapping-entry-point", `Both components serve as entry points of type (${tEpInfo.entryPointTypes.join(", ")}).`));
  }

  if (bothExternal) {
    signalScore += 1;
    signalEvidence.push(createEvidence("both-external-boundaries", `Both components interface with external system boundaries.`));
  }

  if (hasMixedOrGodSmell) {
    signalScore += 1;
    signalEvidence.push(createEvidence("duplication-smell-signal", `Component '${tName}' exhibits architectural smells associated with responsibility duplication.`));
  }

  // FALSE POSITIVE PROTECTION & SEPARATION FACTORS
  if (disjointDataObjects && (tRoleInfo.primary === "selector" || tRoleInfo.primary === "repository" || tRoleInfo.primary === "dao")) {
    // Legitimate separation: selectors/repositories for different objects
    signalScore -= 5;
    signalEvidence.push(createEvidence("distinct-data-object-responsibility", `Components target distinct SObjects (${tObjs.join(", ")} vs ${cObjs.join(", ")}), indicating legitimate architectural separation.`));
  }

  if (differentEntryBoundaries) {
    // Legitimate separation: entry points for different transport/UI boundaries
    signalScore -= 4;
    signalEvidence.push(createEvidence("distinct-entry-boundaries", `Components handle distinct entry-point boundaries (${tEpInfo.entryPointTypes.join(", ")} vs ${cEpInfo.entryPointTypes.join(", ")}).`));
  }

  if (!sameRole && !sameLayer) {
    signalScore -= 3;
    signalEvidence.push(createEvidence("distinct-role-layer", `Components operate in different roles ('${tRoleInfo.primary}' vs '${cRoleInfo.primary}') and layers ('${tLayerInfo.primary}' vs '${cLayerInfo.primary}').`));
  }

  // CLASSIFICATION DETERMINATION
  let classification = "NO_DUPLICATION_SIGNAL";
  if (signalScore >= 8) {
    classification = "STRONG_OVERLAP";
  } else if (signalScore >= 4) {
    classification = "POSSIBLE_OVERLAP";
  } else {
    classification = "NO_DUPLICATION_SIGNAL";
  }

  return {
    target: tName,
    targetId: targetSymbol.id,
    candidate: cName,
    candidateId: candidateSymbol.id,
    classification,
    signalScore,
    evidence: signalEvidence,
    diagnosticStatement: `Components '${tName}' and '${cName}' exhibit overlapping architectural responsibility signals (${classification}).`
  };
}

/**
 * Detects duplicate architectural responsibility signals for a single component against candidate components in the repository.
 */
function detectComponentDuplicateResponsibility(symbol, registry = null, graph = null, metric = null, options = {}) {
  if (!symbol) {
    const res = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      metadata: {
        componentId: null,
        componentName: null,
        classification: "UNKNOWN",
        confidence: "unknown",
        overlappingComponents: []
      }
    });
    res.classification = "UNKNOWN";
    res.overlappingComponents = [];
    return res;
  }

  const symbolId = symbol.id || `ApexClass:${symbol.name}`;
  const symbolName = String(symbol.name || symbol.parsed?.name || symbolId).trim();

  // If symbol is unparsed or missing AST metadata
  if (!symbol.parsed && Object.keys(symbol).length <= 2) {
    const res = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [createEvidence("unparsed-symbol", `Component '${symbolName}' lacks parsed AST representation. Duplication signal is UNKNOWN.`)],
      metadata: {
        componentId: symbolId,
        componentName: symbolName,
        classification: "UNKNOWN",
        confidence: "unknown",
        overlappingComponents: []
      }
    });
    res.classification = "UNKNOWN";
    res.overlappingComponents = [];
    return res;
  }

  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];
  const overlaps = [];

  for (const candidate of symbols) {
    if (candidate.id === symbol.id) continue;

    const compResult = compareTwoComponentsForDuplication(symbol, candidate, graph, registry, options);
    if (compResult && (compResult.classification === "POSSIBLE_OVERLAP" || compResult.classification === "STRONG_OVERLAP")) {
      overlaps.push(compResult);
    }
  }

  // Sort overlaps by signal score descending
  overlaps.sort((a, b) => b.signalScore - a.signalScore || a.candidate.localeCompare(b.candidate));

  let primaryClassification = "NO_DUPLICATION_SIGNAL";
  if (overlaps.some(o => o.classification === "STRONG_OVERLAP")) {
    primaryClassification = "STRONG_OVERLAP";
  } else if (overlaps.length > 0) {
    primaryClassification = "POSSIBLE_OVERLAP";
  }

  const resultEvidence = [];
  if (overlaps.length > 0) {
    for (const ov of overlaps) {
      for (const ev of ov.evidence) {
        resultEvidence.push(ev);
      }
      resultEvidence.push(
        createEvidence(
          "architectural-overlap-diagnostic",
          `These components exhibit overlapping architectural responsibility signals between '${symbolName}' and '${ov.candidate}' (${ov.classification}).`
        )
      );
    }
  } else {
    resultEvidence.push(
      createEvidence("no-duplication-signals", `Component '${symbolName}' exhibits no overlapping architectural responsibility signals with other repository components.`)
    );
  }

  const result = createDeterministicResult({
    value: primaryClassification,
    primary: primaryClassification,
    confidence: "high",
    evidence: resultEvidence,
    secondary: overlaps.map(o => `${o.candidate}:${o.classification}`),
    metadata: {
      componentId: symbolId,
      componentName: symbolName,
      classification: primaryClassification,
      confidence: "high",
      overlappingComponentsCount: overlaps.length,
      overlappingComponents: overlaps.map(o => ({
        candidate: o.candidate,
        candidateId: o.candidateId,
        classification: o.classification,
        signalScore: o.signalScore,
        diagnosticStatement: o.diagnosticStatement
      }))
    }
  });

  result.classification = primaryClassification;
  result.overlappingComponents = overlaps;

  return result;
}

/**
 * Detects duplicate architectural responsibilities across all components in a repository registry.
 */
function detectAllDuplicateResponsibilities(registry, graph = null, metricList = [], options = {}) {
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];

  if (symbols.length === 0) {
    const emptyResult = createDeterministicResult({
      value: "UNKNOWN",
      primary: "UNKNOWN",
      confidence: "unknown",
      evidence: [createEvidence("empty-repository", "Repository contains 0 symbols or graph nodes.")],
      metadata: {
        totalComponents: 0,
        componentsWithOverlapCount: 0,
        strongOverlapCount: 0,
        possibleOverlapCount: 0,
        noOverlapCount: 0
      }
    });
    emptyResult.classificationSummary = { strongOverlapCount: 0, possibleOverlapCount: 0, noOverlapCount: 0 };
    emptyResult.componentDuplicates = new Map();
    return emptyResult;
  }

  const componentDuplicates = new Map();
  const summary = {
    totalComponents: symbols.length,
    componentsWithOverlapCount: 0,
    strongOverlapCount: 0,
    possibleOverlapCount: 0,
    noOverlapCount: 0,
    uniqueOverlappingPairsCount: 0
  };

  const pairSet = new Set();

  for (const symbol of symbols) {
    const metric = metricList ? metricList.find(m => m.id === symbol.id) || null : null;
    const dupResult = detectComponentDuplicateResponsibility(symbol, registry, graph, metric, options);

    componentDuplicates.set(symbol.id, dupResult);

    const classification = dupResult.classification;
    if (classification === "STRONG_OVERLAP") {
      summary.strongOverlapCount++;
      summary.componentsWithOverlapCount++;
    } else if (classification === "POSSIBLE_OVERLAP") {
      summary.possibleOverlapCount++;
      summary.componentsWithOverlapCount++;
    } else {
      summary.noOverlapCount++;
    }

    for (const ov of dupResult.overlappingComponents || []) {
      const pairKey = [symbol.id, ov.candidateId].sort().join("||");
      pairSet.add(pairKey);
    }
  }

  summary.uniqueOverlappingPairsCount = pairSet.size;

  const overallValue = summary.strongOverlapCount > 0
    ? "STRONG_OVERLAP_DETECTED"
    : summary.possibleOverlapCount > 0
      ? "POSSIBLE_OVERLAP_DETECTED"
      : "NO_DUPLICATION_SIGNALS";

  const resultEvidence = [
    createEvidence(
      "duplicate-responsibility-summary",
      `Evaluated ${symbols.length} repository component(s): ${summary.strongOverlapCount} strong overlap(s), ${summary.possibleOverlapCount} possible overlap(s) across ${summary.uniqueOverlappingPairsCount} component pair(s).`
    )
  ];

  const result = createDeterministicResult({
    value: overallValue,
    primary: overallValue,
    confidence: "high",
    evidence: resultEvidence,
    metadata: {
      summary,
      componentDuplicatesCount: componentDuplicates.size
    }
  });

  result.summary = summary;
  result.componentDuplicates = componentDuplicates;

  return result;
}

module.exports = {
  DUPLICATION_CLASSIFICATIONS,
  jaccardSimilarity,
  compareTwoComponentsForDuplication,
  detectComponentDuplicateResponsibility,
  detectAllDuplicateResponsibilities
};
