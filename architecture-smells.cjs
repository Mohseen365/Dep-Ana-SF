/**
 * Deterministic Architecture Smell Detector (Prompt B2)
 *
 * Identifies structurally observable architectural smells based on 100%
 * deterministic repository facts, metrics, graph relationships, and Wave A intelligence.
 *
 * Vocabulary:
 *   - god-component: Component with excessive coupling and size/responsibility
 *   - hub-component: Structural dependency hub with high fan-in
 *   - high-coupling: Total coupling (fan-in + fan-out) exceeding configured threshold
 *   - circular-dependency: Participation in circular dependency loop(s)
 *   - orphan-component: Isolated component with 0 fan-in and 0 fan-out (not entry point/test/config)
 *   - uncovered-critical-path: Structurally critical component (bottleneck/entry-point/high fan-in) with test gap
 *   - layer-violation: Illegal lower-to-higher or cross-layer structural dependency
 *   - mixed-responsibility: Component mixing conflicting responsibilities (e.g. Controller with direct SOQL/DML)
 *   - external-boundary-concentration: Component concentrating multiple distinct external boundary types
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");
const { classifyComponentRole } = require("./role-classifier.cjs");
const { classifyComponentLayer } = require("./layer-classifier.cjs");
const { detectComponentBottleneck } = require("./bottleneck-detector.cjs");
const { detectEntryPoint } = require("./entry-points.cjs");
const { detectExternalBoundary } = require("./external-boundaries.cjs");

const SMELL_TYPES = Object.freeze([
  "god-component",
  "hub-component",
  "high-coupling",
  "circular-dependency",
  "orphan-component",
  "uncovered-critical-path",
  "layer-violation",
  "mixed-responsibility",
  "external-boundary-concentration"
]);

const SMELL_THRESHOLDS = Object.freeze({
  HIGH_FAN_IN: 8,
  HIGH_FAN_OUT: 10,
  HIGH_COUPLING: 12,
  GOD_COMPONENT_COUPLING: 15,
  GOD_COMPONENT_LINES: 500,
  EXTERNAL_BOUNDARY_CONCENTRATION: 2
});

/**
 * Evaluates whether a dependency from sourceLayer to targetLayer constitutes an illegal layer violation.
 */
function isLayerViolation(sourceLayer, targetLayer) {
  if (!sourceLayer || !targetLayer || sourceLayer === "unknown" || targetLayer === "unknown") {
    return false;
  }
  // Data / Domain layer depending on Presentation / Application layer
  if ((sourceLayer === "data" || sourceLayer === "domain") && (targetLayer === "presentation" || targetLayer === "application")) {
    return true;
  }
  // Service layer depending on Presentation layer
  if (sourceLayer === "service" && targetLayer === "presentation") {
    return true;
  }
  return false;
}

/**
 * Detects architectural smells for a single component using deterministic evidence.
 */
function detectComponentSmells(symbol, graph = null, metric = null, context = {}) {
  if (!symbol) {
    const res = createDeterministicResult({
      value: "unknown",
      primary: "unknown",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      secondary: [],
      metadata: { smells: [] }
    });
    res.hasSmells = false;
    res.smells = [];
    return res;
  }

  const symbolId = symbol.id || `ApexClass:${symbol.name}`;
  const p = symbol.parsed || {};

  const fanIn = metric?.fanIn ?? (graph?.edges ? graph.edges.filter(e => e.to === symbolId).length : 0);
  const fanOut = metric?.fanOut ?? (graph?.edges ? graph.edges.filter(e => e.from === symbolId).length : 0);
  const coupling = fanIn + fanOut;
  const lineCount = p.lineCount || p.lines || 0;

  const roleInfo = context.roleInfo || classifyComponentRole(symbol, graph, metric);
  const role = roleInfo?.primary || "unknown";

  const layerInfo = context.layerInfo || classifyComponentLayer(symbol, graph, metric, roleInfo);
  const layer = layerInfo?.primary || "unknown";

  const bottleneckInfo = context.bottleneckInfo || detectComponentBottleneck(symbol, graph, metric, context.cycles || []);
  const entryPointInfo = context.entryPointInfo || detectEntryPoint(symbol, graph, metric);
  const externalBoundaryInfo = context.externalBoundaryInfo || detectExternalBoundary(symbol, graph, metric);
  const testGapInfo = context.testGapInfo || null;

  const detectedSmells = [];

  // 1. GOD-COMPONENT
  if (
    (fanIn >= SMELL_THRESHOLDS.HIGH_FAN_IN && fanOut >= SMELL_THRESHOLDS.HIGH_FAN_OUT) ||
    coupling >= SMELL_THRESHOLDS.GOD_COMPONENT_COUPLING ||
    (lineCount >= SMELL_THRESHOLDS.GOD_COMPONENT_LINES && coupling >= 10)
  ) {
    detectedSmells.push({
      smell: "god-component",
      component: symbol.name,
      componentId: symbol.id,
      confidence: "high",
      evidence: [
        createEvidence(
          "god-component-high-coupling",
          `Component '${symbol.name}' has fan-in ${fanIn}, fan-out ${fanOut}, total coupling ${coupling} (threshold coupling >= ${SMELL_THRESHOLDS.GOD_COMPONENT_COUPLING}), acting as a bloated architectural god component.`
        )
      ]
    });
  }

  // 2. HUB-COMPONENT
  if (fanIn >= SMELL_THRESHOLDS.HIGH_FAN_IN && !detectedSmells.some(s => s.smell === "god-component")) {
    detectedSmells.push({
      smell: "hub-component",
      component: symbol.name,
      componentId: symbol.id,
      confidence: "high",
      evidence: [
        createEvidence(
          "fan-in-threshold",
          `Fan-in is ${fanIn}, exceeding configured hub threshold of ${SMELL_THRESHOLDS.HIGH_FAN_IN}.`
        )
      ]
    });
  }

  // 3. HIGH-COUPLING
  if (
    (coupling >= SMELL_THRESHOLDS.HIGH_COUPLING || fanOut >= SMELL_THRESHOLDS.HIGH_FAN_OUT) &&
    !detectedSmells.some(s => s.smell === "god-component")
  ) {
    detectedSmells.push({
      smell: "high-coupling",
      component: symbol.name,
      componentId: symbol.id,
      confidence: "high",
      evidence: [
        createEvidence(
          "fan-out-threshold",
          `Fan-out is ${fanOut}, coupling is ${coupling}, exceeding configured threshold of ${SMELL_THRESHOLDS.HIGH_COUPLING}.`
        )
      ]
    });
  }

  // 4. CIRCULAR-DEPENDENCY
  const activeCycles = (context.cycles || []).filter(cycleGroup => Array.isArray(cycleGroup) && cycleGroup.includes(symbolId));
  if (activeCycles.length > 0) {
    detectedSmells.push({
      smell: "circular-dependency",
      component: symbol.name,
      componentId: symbol.id,
      confidence: "high",
      evidence: [
        createEvidence(
          "cycle-participant",
          `Component participates in ${activeCycles.length} circular dependency loop(s).`
        )
      ]
    });
  }

  // 5. ORPHAN-COMPONENT
  if (
    coupling === 0 &&
    role !== "entry-point" &&
    role !== "test" &&
    role !== "configuration" &&
    layer !== "presentation" &&
    layer !== "entry" &&
    layer !== "test" &&
    layer !== "configuration"
  ) {
    detectedSmells.push({
      smell: "orphan-component",
      component: symbol.name,
      componentId: symbol.id,
      confidence: "medium",
      evidence: [
        createEvidence(
          "zero-coupling-orphan",
          `Component '${symbol.name}' has 0 inbound and 0 outbound graph dependencies, and is not an entry-point, test, or configuration component.`
        )
      ]
    });
  }

  // 6. UNCOVERED-CRITICAL-PATH
  if (testGapInfo && testGapInfo.hasTestGap) {
    const isCritical = bottleneckInfo.isBottleneck || entryPointInfo.isEntryPoint || fanIn >= SMELL_THRESHOLDS.HIGH_FAN_IN;
    if (isCritical) {
      detectedSmells.push({
        smell: "uncovered-critical-path",
        component: symbol.name,
        componentId: symbol.id,
        confidence: "high",
        evidence: [
          createEvidence(
            "uncovered-critical-component",
            `Structurally critical component '${symbol.name}' (bottleneck=${bottleneckInfo.isBottleneck}, entryPoint=${entryPointInfo.isEntryPoint}, fanIn=${fanIn}) has test gap status '${testGapInfo.status || testGapInfo.signal}'.`
          )
        ]
      });
    }
  }

  // 7. LAYER-VIOLATION
  if (graph && Array.isArray(graph.edges)) {
    const outgoingEdges = graph.edges.filter(e => e.from === symbolId);
    const symbolMap = context.symbolMap || null;

    for (const edge of outgoingEdges) {
      const targetSymbol = symbolMap ? symbolMap.get(edge.to) : null;
      if (targetSymbol) {
        const targetLayerInfo = classifyComponentLayer(targetSymbol, graph, null, null);
        const targetLayer = targetLayerInfo?.primary || "unknown";

        if (isLayerViolation(layer, targetLayer)) {
          detectedSmells.push({
            smell: "layer-violation",
            component: symbol.name,
            componentId: symbol.id,
            confidence: "high",
            evidence: [
              createEvidence(
                "illegal-layer-dependency",
                `Component in layer '${layer}' directly depends on target '${targetSymbol.name}' in higher/restricted layer '${targetLayer}'.`
              )
            ]
          });
          break; // One evidence per component is sufficient
        }
      }
    }
  }

  // 8. MIXED-RESPONSIBILITY
  const soqlQueries = Array.isArray(p.soql) ? p.soql : [];
  const dmlOps = Array.isArray(p.dml) ? p.dml : [];
  const hasDbOps = soqlQueries.length > 0 || dmlOps.length > 0;

  if (
    (role === "controller" || role === "entry-point" || layer === "presentation" || layer === "entry") &&
    hasDbOps
  ) {
    detectedSmells.push({
      smell: "mixed-responsibility",
      component: symbol.name,
      componentId: symbol.id,
      confidence: "high",
      evidence: [
        createEvidence(
          "controller-direct-db-access",
          `Component '${symbol.name}' in role '${role}' / layer '${layer}' directly performs database operations (${soqlQueries.length} SOQL, ${dmlOps.length} DML), mixing presentation/entry control with data persistence.`
        )
      ]
    });
  }

  // 9. EXTERNAL-BOUNDARY-CONCENTRATION
  const boundaryTypes = externalBoundaryInfo?.boundaryTypes || [];
  const callouts = Array.isArray(p.callouts) ? p.callouts : [];
  if (boundaryTypes.length >= SMELL_THRESHOLDS.EXTERNAL_BOUNDARY_CONCENTRATION || callouts.length >= SMELL_THRESHOLDS.EXTERNAL_BOUNDARY_CONCENTRATION) {
    detectedSmells.push({
      smell: "external-boundary-concentration",
      component: symbol.name,
      componentId: symbol.id,
      confidence: "high",
      evidence: [
        createEvidence(
          "multiple-external-boundary-types",
          `Component '${symbol.name}' concentrates ${boundaryTypes.length} external boundary type(s) (${boundaryTypes.join(", ")}) and ${callouts.length} callout signal(s).`
        )
      ]
    });
  }

  const hasSmells = detectedSmells.length > 0;
  const primaryValue = hasSmells ? "has-smells" : "clean";

  const resultEvidence = hasSmells
    ? detectedSmells.flatMap(s => s.evidence)
    : [createEvidence("no-smells", `No architecture smells detected for component '${symbol.name}'.`)];

  const result = createDeterministicResult({
    value: primaryValue,
    primary: primaryValue,
    confidence: "high",
    evidence: resultEvidence,
    secondary: detectedSmells.map(s => s.smell),
    metadata: {
      hasSmells,
      smellCount: detectedSmells.length,
      smells: detectedSmells
    }
  });

  result.hasSmells = hasSmells;
  result.smells = detectedSmells;

  return result;
}

/**
 * Analyzes architecture smells across all symbols in a registry and produces aggregate summary metrics.
 */
function detectAllSmells(registry, graph = null, metricList = [], cycles = [], extraContext = {}) {
  const metricById = new Map((metricList || []).map(m => [m.id, m]));
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];
  const symbolMap = new Map(symbols.map(s => [s.id, s]));

  const componentSmells = new Map();
  const allSmells = [];

  const summary = {
    totalComponents: symbols.length,
    componentsWithSmellsCount: 0,
    cleanComponentsCount: 0,
    totalSmellsCount: 0,
    smellCounts: {
      "god-component": 0,
      "hub-component": 0,
      "high-coupling": 0,
      "circular-dependency": 0,
      "orphan-component": 0,
      "uncovered-critical-path": 0,
      "layer-violation": 0,
      "mixed-responsibility": 0,
      "external-boundary-concentration": 0
    }
  };

  const context = {
    ...extraContext,
    cycles,
    symbolMap
  };

  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const smellInfo = detectComponentSmells(symbol, graph, metric, context);

    componentSmells.set(symbol.id, smellInfo);

    if (smellInfo.hasSmells) {
      summary.componentsWithSmellsCount++;
      summary.totalSmellsCount += smellInfo.smells.length;

      for (const smellItem of smellInfo.smells) {
        allSmells.push(smellItem);
        if (summary.smellCounts[smellItem.smell] !== undefined) {
          summary.smellCounts[smellItem.smell]++;
        }
      }
    } else {
      summary.cleanComponentsCount++;
    }
  }

  return {
    componentSmells,
    allSmells,
    summary
  };
}

module.exports = {
  SMELL_TYPES,
  SMELL_THRESHOLDS,
  isLayerViolation,
  detectComponentSmells,
  detectAllSmells
};
