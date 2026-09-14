/**
 * Deterministic Architectural Bottleneck Detector (Prompt 23)
 *
 * Identifies structurally important components based on measurable graph and
 * metric properties.
 *
 * Signals evaluated:
 *   - High Fan-In: Inbound dependency concentration
 *   - High Fan-Out: Outbound dependency expansion
 *   - Cycle Participation: Involvement in circular dependency loops
 *   - Many Dependents: High upstream component dependence
 *   - Many Dependency Paths: High transitive dependency path count
 *   - Bridge-like Graph Position: Position between UI/Entry-Points and Data/Selectors
 *   - High Dependency Impact: Broad downstream impact surface
 *
 * Score Calculation Methodology (0-100 scale):
 *   The bottleneck score is a deterministic composite measure of structural
 *   chokepoint pressure. It is NOT a probability and does NOT represent
 *   business risk or business criticality.
 *
 *   Weights:
 *     - high-fan-in:               +30 pts (fanIn >= 8)
 *     - high-fan-out:              +25 pts (fanOut >= 10)
 *     - cycle-participant:         +25 pts (participates in 1+ cycles)
 *     - bridge-position:           +20 pts (connects UI/entry points to data layer)
 *     - many-dependents:           +15 pts (upstream dependents >= 10)
 *     - many-dependency-paths:     +15 pts (downstream dependency paths >= 15)
 *     - high-dependency-impact:    +15 pts (downstream impact total >= 10)
 *
 *   Classification thresholds:
 *     - isBottleneck = score >= 25
 *     - value = isBottleneck ? "bottleneck" : (coupling === 0 ? "disconnected" : "normal")
 *     - confidence = signals.length >= 2 ? "high" : signals.length === 1 ? "medium" : "low" (or "unknown" if missing symbol)
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

const THRESHOLDS = Object.freeze({
  HIGH_FAN_IN: 8,
  HIGH_FAN_OUT: 10,
  MANY_DEPENDENTS: 10,
  MANY_PATHS: 15,
  HIGH_IMPACT: 10
});

/**
 * Traverses graph downstream / upstream to count transitive nodes and paths.
 */
function getTraversalStats(startId, graph, maxDepth = 10) {
  if (!graph || !Array.isArray(graph.edges)) {
    return { downstreamNodes: 0, downstreamPaths: 0, upstreamNodes: 0 };
  }

  const outgoing = new Map();
  const incoming = new Map();

  for (const edge of graph.edges) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  }

  // Downstream BFS
  const visitedDownstream = new Set();
  let pathCount = 0;
  const queueDown = [{ id: startId, depth: 0 }];

  while (queueDown.length > 0) {
    const current = queueDown.shift();
    if (current.depth >= maxDepth) continue;

    const edges = outgoing.get(current.id) || [];
    for (const edge of edges) {
      pathCount++;
      if (!visitedDownstream.has(edge.to) && edge.to !== startId) {
        visitedDownstream.add(edge.to);
        queueDown.push({ id: edge.to, depth: current.depth + 1 });
      }
    }
  }

  // Upstream BFS
  const visitedUpstream = new Set();
  const queueUp = [{ id: startId, depth: 0 }];

  while (queueUp.length > 0) {
    const current = queueUp.shift();
    if (current.depth >= maxDepth) continue;

    const edges = incoming.get(current.id) || [];
    for (const edge of edges) {
      if (!visitedUpstream.has(edge.from) && edge.from !== startId) {
        visitedUpstream.add(edge.from);
        queueUp.push({ id: edge.from, depth: current.depth + 1 });
      }
    }
  }

  return {
    downstreamNodes: visitedDownstream.size,
    downstreamPaths: pathCount,
    upstreamNodes: visitedUpstream.size
  };
}

/**
 * Detects whether a component acts as a bridge between entry/controller layer and data/selector layer.
 */
function checkBridgePosition(symbolId, graph) {
  if (!graph || !Array.isArray(graph.edges)) return false;

  const inEdges = graph.edges.filter(e => e.to === symbolId);
  const outEdges = graph.edges.filter(e => e.from === symbolId);

  if (inEdges.length === 0 || outEdges.length === 0) return false;

  const hasEntryInbound = inEdges.some(e => {
    const src = String(e.from);
    return (
      src.startsWith("LWC:") ||
      src.startsWith("Trigger:") ||
      src.startsWith("Visualforce:") ||
      /Controller|Page|View|Component/i.test(src)
    );
  });

  const hasDataOutbound = outEdges.some(e => {
    const tgt = String(e.to);
    return (
      tgt.startsWith("Object:") ||
      tgt.startsWith("Field:") ||
      /Selector|Repository|DAO|Queries|Finder|Object|Database/i.test(tgt)
    );
  });

  return hasEntryInbound && hasDataOutbound;
}

/**
 * Detects structural bottleneck signals for a single component.
 */
function detectComponentBottleneck(symbol, graph = null, metric = null, cycles = []) {
  if (!symbol) {
    const res = createDeterministicResult({
      value: "unknown",
      primary: "unknown",
      confidence: "unknown",
      evidence: [createEvidence("no-symbol", "Component symbol is missing or null.")],
      metadata: {
        isBottleneck: false,
        score: 0,
        signals: []
      }
    });
    res.isBottleneck = false;
    res.score = 0;
    res.signals = res.evidence;
    return res;
  }

  const symbolId = symbol.id || `ApexClass:${symbol.name}`;
  const fanIn = metric?.fanIn ?? (graph?.edges ? graph.edges.filter(e => e.to === symbolId).length : 0);
  const fanOut = metric?.fanOut ?? (graph?.edges ? graph.edges.filter(e => e.from === symbolId).length : 0);
  const coupling = fanIn + fanOut;

  const signals = [];
  let score = 0;

  // 1. HIGH FAN-IN SIGNAL
  if (fanIn >= THRESHOLDS.HIGH_FAN_IN) {
    score += 30;
    signals.push(
      createEvidence(
        "high-fan-in",
        `Component has high inbound fan-in (${fanIn} >= threshold ${THRESHOLDS.HIGH_FAN_IN}), creating a structural concentration point.`
      )
    );
  }

  // 2. HIGH FAN-OUT SIGNAL
  if (fanOut >= THRESHOLDS.HIGH_FAN_OUT) {
    score += 25;
    signals.push(
      createEvidence(
        "high-fan-out",
        `Component has high outbound fan-out (${fanOut} >= threshold ${THRESHOLDS.HIGH_FAN_OUT}), creating wide outbound structural coupling.`
      )
    );
  }

  // 3. CYCLE PARTICIPATION SIGNAL
  const activeCycles = (cycles || []).filter(cycleGroup => Array.isArray(cycleGroup) && cycleGroup.includes(symbolId));
  if (activeCycles.length > 0) {
    score += 25;
    signals.push(
      createEvidence(
        "cycle-participant",
        `Component participates in ${activeCycles.length} circular dependency group(s).`
      )
    );
  }

  // 4. BRIDGE-LIKE POSITION SIGNAL
  const isBridge = checkBridgePosition(symbolId, graph);
  if (isBridge) {
    score += 20;
    signals.push(
      createEvidence(
        "bridge-position",
        `Component occupies a bridge-like graph position connecting entry-point/UI consumers to data/selector targets.`
      )
    );
  }

  // 5. TRAVERSAL-BASED SIGNALS (MANY DEPENDENTS, MANY PATHS, HIGH IMPACT)
  if (graph) {
    const stats = getTraversalStats(symbolId, graph);

    if (stats.upstreamNodes >= THRESHOLDS.MANY_DEPENDENTS) {
      score += 15;
      signals.push(
        createEvidence(
          "many-dependents",
          `Component has ${stats.upstreamNodes} upstream dependent component(s) (threshold >= ${THRESHOLDS.MANY_DEPENDENTS}).`
        )
      );
    }

    if (stats.downstreamPaths >= THRESHOLDS.MANY_PATHS) {
      score += 15;
      signals.push(
        createEvidence(
          "many-dependency-paths",
          `Component participates in ${stats.downstreamPaths} downstream dependency path(s) (threshold >= ${THRESHOLDS.MANY_PATHS}).`
        )
      );
    }

    if (stats.downstreamNodes >= THRESHOLDS.HIGH_IMPACT) {
      score += 15;
      signals.push(
        createEvidence(
          "high-dependency-impact",
          `Component has a broad downstream dependency surface impacting ${stats.downstreamNodes} component(s) (threshold >= ${THRESHOLDS.HIGH_IMPACT}).`
        )
      );
    }
  }

  const finalScore = Math.min(100, Math.max(0, score));
  const isBottleneck = finalScore >= 25;

  let primaryValue = "normal";
  if (isBottleneck) {
    primaryValue = "bottleneck";
  } else if (coupling === 0) {
    primaryValue = "disconnected";
  }

  let confidence = "low";
  if (signals.length >= 2 || (isBottleneck && finalScore >= 50)) {
    confidence = "high";
  } else if (signals.length === 1 || coupling === 0) {
    confidence = "medium";
  }

  const result = createDeterministicResult({
    value: primaryValue,
    primary: primaryValue,
    confidence,
    evidence: signals,
    secondary: [],
    metadata: {
      isBottleneck,
      score: finalScore,
      signals,
      fanIn,
      fanOut,
      coupling,
      isCycleParticipant: activeCycles.length > 0
    }
  });

  // Attach convenience fields expected by caller contract
  result.isBottleneck = isBottleneck;
  result.score = finalScore;
  result.signals = signals;

  return result;
}

/**
 * Analyzes all symbols in a registry and produces summary statistics for bottlenecks.
 */
function detectAllBottlenecks(registry, graph = null, metricList = [], cycles = []) {
  const metricById = new Map((metricList || []).map(m => [m.id, m]));
  const symbols = Array.isArray(registry?.symbols) ? registry.symbols : [];

  const componentBottlenecks = new Map();
  const summary = {
    totalComponents: symbols.length,
    bottleneckCount: 0,
    normalCount: 0,
    disconnectedCount: 0,
    signalCounts: {
      "high-fan-in": 0,
      "high-fan-out": 0,
      "cycle-participant": 0,
      "bridge-position": 0,
      "many-dependents": 0,
      "many-dependency-paths": 0,
      "high-dependency-impact": 0
    }
  };

  for (const symbol of symbols) {
    const metric = metricById.get(symbol.id) || null;
    const bottleneckInfo = detectComponentBottleneck(symbol, graph, metric, cycles);

    componentBottlenecks.set(symbol.id, bottleneckInfo);

    if (bottleneckInfo.isBottleneck) {
      summary.bottleneckCount++;
    } else if (bottleneckInfo.value === "disconnected") {
      summary.disconnectedCount++;
    } else {
      summary.normalCount++;
    }

    for (const signal of bottleneckInfo.signals) {
      if (summary.signalCounts[signal.rule] !== undefined) {
        summary.signalCounts[signal.rule]++;
      }
    }
  }

  return {
    componentBottlenecks,
    summary
  };
}

module.exports = {
  THRESHOLDS,
  checkBridgePosition,
  getTraversalStats,
  detectComponentBottleneck,
  detectAllBottlenecks
};
