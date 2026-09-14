/**
 * Deterministic Change Simulator (Prompt B3 / Prompt 17-Wave A)
 *
 * Given a component or architecture element, simulates the deterministic blast
 * radius and impact signals of changing or removing it across the codebase.
 *
 * Strict boundary rules:
 *   - 100% deterministic rules, graph traversal, and metadata logic.
 *   - 0 LLM calls or AI runtime dependencies.
 *   - Reuses existing analyzer infrastructure (graph, path analyzer, data impact,
 *     entry points, external boundaries, security boundaries, bottlenecks).
 *   - Cycle-safe and strictly bounded by maxDepth, maxPaths, maxSteps.
 *   - Does NOT collapse impacts into an opaque risk score; reports distinct impact signals.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

const { buildAdjacencyMaps } = require("./path-analyzer.cjs");
const { analyzeComponentDataImpact } = require("./data-impact.cjs");
const { detectEntryPoint } = require("./entry-points.cjs");
const { detectExternalBoundary } = require("./external-boundaries.cjs");
const { analyzeSecurityBoundaries } = require("./security-boundaries.cjs");
const { classifyComponentRole } = require("./role-classifier.cjs");
const { classifyComponentLayer } = require("./layer-classifier.cjs");
const { detectComponentBottleneck } = require("./bottleneck-detector.cjs");

/**
 * Normalizes operation string into standard change scenario names:
 *   - 'modify_component' (or 'change_component', 'modify', 'change')
 *   - 'remove_component' (or 'remove')
 *   - 'change_dependency' (or 'modify_dependency')
 */
function normalizeOperation(op) {
  const s = String(op || "modify_component").toLowerCase().trim();
  if (s.includes("remove") || s === "delete") return "remove_component";
  if (s.includes("dependency") || s.includes("edge")) return "change_dependency";
  return "modify_component";
}

/**
 * Helper to resolve target symbol object and node ID from target parameter or graph/registry.
 */
function resolveTargetNode(target, graph = null, registry = null) {
  if (!target) return null;

  let targetId = null;
  let targetName = null;
  let targetSymbol = null;

  if (typeof target === "string") {
    const raw = target.trim();
    if (registry && Array.isArray(registry.symbols)) {
      targetSymbol = registry.symbols.find(
        s => s.id === raw || s.name === raw || s.id.toLowerCase() === raw.toLowerCase() || s.name.toLowerCase() === raw.toLowerCase()
      ) || null;
    }
    if (targetSymbol) {
      targetId = targetSymbol.id;
      targetName = targetSymbol.name;
    } else if (graph && Array.isArray(graph.nodes)) {
      const node = graph.nodes.find(
        n => n.id === raw || n.name === raw || n.id.toLowerCase() === raw.toLowerCase() || n.name.toLowerCase() === raw.toLowerCase()
      );
      if (node) {
        targetId = node.id;
        targetName = node.name || node.id;
      } else {
        targetId = raw;
        targetName = raw.includes(":") ? raw.split(":")[1] : raw;
      }
    } else {
      targetId = raw;
      targetName = raw.includes(":") ? raw.split(":")[1] : raw;
    }
  } else if (typeof target === "object") {
    targetId = target.id || target.name;
    targetName = target.name || target.id;
    targetSymbol = target.parsed ? target : null;
  }

  return { targetId, targetName, targetSymbol };
}

/**
 * Cycle-safe, bounded BFS traversal to collect upstream dependents (who depends on target).
 */
function collectUpstreamDependents(targetId, graph, options = {}) {
  const maxDepth = options.maxDepth ?? 10;
  const maxPaths = options.maxPaths ?? 100;
  const maxSteps = options.maxSteps ?? 5000;

  const directDependents = [];
  const transitiveDependents = [];

  if (!targetId || !graph) {
    return { directDependents, transitiveDependents, cycleDetected: false };
  }

  const { incoming } = buildAdjacencyMaps(graph);
  const seenKeys = new Set();
  const visitedNodes = new Set();
  let cycleDetected = false;

  const queue = [
    {
      current: targetId,
      path: [targetId],
      visited: new Set([targetId])
    }
  ];

  let steps = 0;

  while (queue.length > 0 && (directDependents.length + transitiveDependents.length) < maxPaths && steps < maxSteps) {
    steps++;
    const state = queue.shift();
    const depth = state.path.length - 1;

    if (depth >= maxDepth) continue;

    const edges = incoming.get(state.current) || [];
    for (const edge of edges) {
      const upstreamId = edge.from;

      if (state.visited.has(upstreamId)) {
        cycleDetected = true;
        continue;
      }

      const newPath = [upstreamId, ...state.path];
      const length = newPath.length - 1;
      const key = `${upstreamId}|${targetId}`;

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        visitedNodes.add(upstreamId);

        const item = {
          id: upstreamId,
          depth: length,
          path: newPath,
          edgeType: edge.type,
          evidence: edge.evidence || null
        };

        if (length === 1) {
          directDependents.push(item);
        } else {
          transitiveDependents.push(item);
        }
      }

      const newVisited = new Set(state.visited);
      newVisited.add(upstreamId);
      queue.push({
        current: upstreamId,
        path: newPath,
        visited: newVisited
      });
    }
  }

  // Sort deterministically by depth, then ID
  directDependents.sort((a, b) => a.id.localeCompare(b.id));
  transitiveDependents.sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));

  return { directDependents, transitiveDependents, cycleDetected };
}

/**
 * Cycle-safe, bounded BFS traversal to collect downstream dependencies (what target depends on).
 */
function collectDownstreamDependencies(targetId, graph, options = {}) {
  const maxDepth = options.maxDepth ?? 10;
  const maxPaths = options.maxPaths ?? 100;
  const maxSteps = options.maxSteps ?? 5000;

  const directDependencies = [];
  const transitiveDependencies = [];

  if (!targetId || !graph) {
    return { directDependencies, transitiveDependencies, cycleDetected: false };
  }

  const { outgoing } = buildAdjacencyMaps(graph);
  const seenKeys = new Set();
  let cycleDetected = false;

  const queue = [
    {
      current: targetId,
      path: [targetId],
      visited: new Set([targetId])
    }
  ];

  let steps = 0;

  while (queue.length > 0 && (directDependencies.length + transitiveDependencies.length) < maxPaths && steps < maxSteps) {
    steps++;
    const state = queue.shift();
    const depth = state.path.length - 1;

    if (depth >= maxDepth) continue;

    const edges = outgoing.get(state.current) || [];
    for (const edge of edges) {
      const downstreamId = edge.to;

      if (state.visited.has(downstreamId)) {
        cycleDetected = true;
        continue;
      }

      const newPath = [...state.path, downstreamId];
      const length = newPath.length - 1;
      const key = `${targetId}|${downstreamId}`;

      if (!seenKeys.has(key)) {
        seenKeys.add(key);

        const item = {
          id: downstreamId,
          depth: length,
          path: newPath,
          edgeType: edge.type,
          evidence: edge.evidence || null
        };

        if (length === 1) {
          directDependencies.push(item);
        } else {
          transitiveDependencies.push(item);
        }
      }

      const newVisited = new Set(state.visited);
      newVisited.add(downstreamId);
      queue.push({
        current: downstreamId,
        path: newPath,
        visited: newVisited
      });
    }
  }

  directDependencies.sort((a, b) => a.id.localeCompare(b.id));
  transitiveDependencies.sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));

  return { directDependencies, transitiveDependencies, cycleDetected };
}

/**
 * Simulates the deterministic architectural blast radius and impact signals
 * of changing, removing, or modifying a component or dependency.
 *
 * @param {Object|string} target - Component ID, name, or symbol object.
 * @param {string|Object} [operationOrOptions] - Operation name or options object.
 * @param {Object} [graph] - Graph object { nodes, edges }.
 * @param {Object} [registry] - Symbol registry object { symbols, byName }.
 * @param {Object} [options] - Traversal and analysis options.
 * @returns {Object} Deterministic result conforming to contract with complete impact metadata.
 */
function simulateChange(target, operationOrOptions = "modify_component", graphInput = null, registryInput = null, optionsInput = {}) {
  let operation = "modify_component";
  let graph = graphInput;
  let registry = registryInput;
  let options = { ...optionsInput };

  if (typeof operationOrOptions === "object" && operationOrOptions !== null && !operationOrOptions.nodes) {
    options = { ...operationOrOptions, ...optionsInput };
    operation = options.operation || options.changeType || "modify_component";
    if (options.graph) graph = options.graph;
    if (options.registry) registry = options.registry;
  } else if (typeof operationOrOptions === "string") {
    operation = operationOrOptions;
  }

  const normOp = normalizeOperation(operation);

  const { targetId, targetName, targetSymbol } = resolveTargetNode(target, graph, registry);

  if (!targetId) {
    return createDeterministicResult({
      value: "unknown",
      primary: "unknown",
      confidence: "unknown",
      evidence: [createEvidence("no-target", "Target component or architecture element could not be resolved.")],
      metadata: {
        target: String(target || "null"),
        operation: normOp,
        directDependents: [],
        transitiveDependents: [],
        directDependencies: [],
        transitiveDependencies: [],
        affectedObjects: [],
        affectedEntryPoints: [],
        affectedExternalBoundaries: [],
        affectedTests: [],
        securityImpact: [],
        riskSignals: [createEvidence("target-not-found", "Target element was not found in graph or registry.")]
      }
    });
  }

  const symbolMap = new Map();
  if (registry && Array.isArray(registry.symbols)) {
    for (const s of registry.symbols) {
      symbolMap.set(s.id, s);
      if (s.name) symbolMap.set(s.name, s);
    }
  }

  const resolvedSymbol = targetSymbol || symbolMap.get(targetId) || null;

  // 1. Traverse upstream dependents & downstream dependencies
  const { directDependents, transitiveDependents, cycleDetected: upstreamCycle } = collectUpstreamDependents(targetId, graph, options);
  const { directDependencies, transitiveDependencies, cycleDetected: downstreamCycle } = collectDownstreamDependencies(targetId, graph, options);

  const allAffectedComponentIds = new Set([
    targetId,
    ...directDependents.map(d => d.id),
    ...transitiveDependents.map(d => d.id)
  ]);

  // 2. Data / Object Impact Analysis
  const affectedObjectsMap = new Map();
  if (resolvedSymbol) {
    const dataImpactResult = analyzeComponentDataImpact(resolvedSymbol, graph, registry);
    const objects = dataImpactResult.metadata?.objects || [];
    for (const obj of objects) {
      affectedObjectsMap.set(obj.name, {
        object: obj.name,
        operations: obj.operations,
        evidence: obj.evidence
      });
    }
  }

  // Also check data impact for direct dependents
  for (const dep of directDependents) {
    const depSymbol = symbolMap.get(dep.id);
    if (depSymbol) {
      const depDataResult = analyzeComponentDataImpact(depSymbol, graph, registry);
      const objects = depDataResult.metadata?.objects || [];
      for (const obj of objects) {
        if (!affectedObjectsMap.has(obj.name)) {
          affectedObjectsMap.set(obj.name, {
            object: obj.name,
            operations: obj.operations,
            evidence: [createEvidence("dependent-data-impact", `Impact on object ${obj.name} via dependent ${dep.id}`)]
          });
        }
      }
    }
  }

  const affectedObjects = Array.from(affectedObjectsMap.values()).sort((a, b) => a.object.localeCompare(b.object));

  // 3. Affected Entry Points Analysis
  const affectedEntryPointsMap = new Map();
  for (const id of allAffectedComponentIds) {
    const s = symbolMap.get(id);
    if (s) {
      const epResult = detectEntryPoint(s, graph);
      if (epResult.isEntryPoint) {
        affectedEntryPointsMap.set(id, {
          id,
          name: s.name || id,
          entryPointTypes: epResult.entryPointTypes,
          evidence: epResult.evidence
        });
      }
    }
  }
  const affectedEntryPoints = Array.from(affectedEntryPointsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // 4. Affected External Boundaries Analysis
  const affectedExternalBoundariesMap = new Map();
  for (const id of allAffectedComponentIds) {
    const s = symbolMap.get(id);
    if (s) {
      const ebResult = detectExternalBoundary(s, graph);
      if (ebResult.hasExternalBoundary) {
        affectedExternalBoundariesMap.set(id, {
          id,
          name: s.name || id,
          boundaryTypes: ebResult.boundaryTypes,
          targets: ebResult.targets,
          evidence: ebResult.evidence
        });
      }
    }
  }
  const affectedExternalBoundaries = Array.from(affectedExternalBoundariesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // 5. Affected Tests Analysis
  const affectedTestsMap = new Map();
  for (const id of allAffectedComponentIds) {
    const s = symbolMap.get(id);
    if (s) {
      const isTestClass = Boolean(s.parsed?.isTest || (s.type === "ApexClass" && /Test$/i.test(s.name)));
      if (isTestClass) {
        affectedTestsMap.set(id, {
          id,
          name: s.name || id,
          signal: "test-component",
          evidence: [createEvidence("direct-test-affected", `Test component '${s.name}' directly impacted by simulation target '${targetName}'.`)]
        });
      }
    }
  }

  // Also check graph for test-reference edges pointing to target or affected components
  if (graph && Array.isArray(graph.edges)) {
    const testEdges = graph.edges.filter(
      e => e.type === "test-reference" && allAffectedComponentIds.has(e.to)
    );
    for (const edge of testEdges) {
      const testSymbol = symbolMap.get(edge.from);
      const testName = testSymbol ? testSymbol.name : edge.from;
      if (!affectedTestsMap.has(edge.from)) {
        affectedTestsMap.set(edge.from, {
          id: edge.from,
          name: testName,
          signal: "covered",
          evidence: [createEvidence("test-reference-edge", `Test suite '${testName}' references affected component '${edge.to}'.`)]
        });
      }
    }
  }

  const affectedTests = Array.from(affectedTestsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // 6. Security Impact Analysis
  const securityImpactList = [];
  if (resolvedSymbol) {
    const secResult = analyzeSecurityBoundaries(resolvedSymbol, graph);
    securityImpactList.push({
      id: targetId,
      name: targetName,
      sharingModel: secResult.metadata?.sharingModel || "unspecified",
      boundaries: secResult.metadata?.boundaries || [secResult.primary],
      evidence: secResult.evidence
    });
  }

  // 7. Risk Signals and Blast Radius Level Calculation
  const riskSignals = [];

  // Check cycle participation
  const cyclesInvolved = (upstreamCycle || downstreamCycle) ? 1 : 0;
  if (cyclesInvolved > 0) {
    riskSignals.push(createEvidence("cycle-participation", `Component '${targetName}' or its blast radius participates in 1+ circular dependency cycles.`));
  }

  // Check fan-in / fan-out bottleneck signals
  if (resolvedSymbol) {
    const bottleneckInfo = detectComponentBottleneck(resolvedSymbol, graph);
    if (bottleneckInfo.isBottleneck) {
      riskSignals.push(createEvidence("architectural-bottleneck", `Component '${targetName}' is a high-coupling architectural bottleneck.`));
    }
  }

  if (directDependents.length > 0) {
    riskSignals.push(createEvidence("direct-dependents-impact", `Simulation identifies ${directDependents.length} direct dependent component(s).`));
  }

  if (transitiveDependents.length > 0) {
    riskSignals.push(createEvidence("transitive-dependents-impact", `Simulation identifies ${transitiveDependents.length} transitive dependent component(s).`));
  }

  if (affectedEntryPoints.length > 0) {
    riskSignals.push(createEvidence("entry-point-exposure", `Change impacts ${affectedEntryPoints.length} architectural entry point(s) (${affectedEntryPoints.map(e => e.name).join(", ")}).`));
  }

  if (affectedExternalBoundaries.length > 0) {
    riskSignals.push(createEvidence("external-boundary-exposure", `Change impacts ${affectedExternalBoundaries.length} external boundary component(s) (${affectedExternalBoundaries.map(e => e.name).join(", ")}).`));
  }

  if (normOp === "remove_component") {
    riskSignals.push(createEvidence("high-consequence-removal", `Removal simulation: target '${targetName}' removal directly breaks ${directDependents.length} dependent component(s).`));
  }

  // Blast Radius Level Classification
  let blastRadiusLevel = "SMALL";
  if (transitiveDependents.length >= 10 || cyclesInvolved > 0 || riskSignals.some(r => r.rule === "architectural-bottleneck")) {
    blastRadiusLevel = "LARGE";
  } else if (transitiveDependents.length >= 3 || directDependents.length >= 3 || affectedEntryPoints.length > 0 || affectedExternalBoundaries.length > 0) {
    blastRadiusLevel = "MEDIUM";
  } else {
    blastRadiusLevel = "SMALL";
  }

  const isDisconnected = directDependents.length === 0 && directDependencies.length === 0;
  if (isDisconnected) {
    riskSignals.push(createEvidence("disconnected-component", `Component '${targetName}' is isolated with zero inbound and outbound graph dependencies.`));
  }

  const confidence = "high";
  const evidenceList = [
    createEvidence("change-simulation-complete", `Simulated deterministic '${normOp}' impact for target '${targetName}' across ${directDependents.length + transitiveDependents.length} dependent(s).`),
    ...riskSignals
  ];

  return createDeterministicResult({
    value: blastRadiusLevel.toLowerCase(),
    primary: blastRadiusLevel.toLowerCase(),
    confidence,
    evidence: evidenceList,
    secondary: [normOp, `blast-radius-${blastRadiusLevel.toLowerCase()}`],
    metadata: {
      target: targetName,
      targetId,
      operation: normOp,
      blastRadiusLevel,
      directDependents,
      transitiveDependents,
      directDependencies,
      transitiveDependencies,
      affectedObjects,
      affectedEntryPoints,
      affectedExternalBoundaries,
      affectedTests,
      securityImpact: securityImpactList,
      riskSignals,
      isDisconnected,
      cycleInvolved: cyclesInvolved > 0
    }
  });
}

module.exports = {
  simulateChange,
  normalizeOperation,
  collectUpstreamDependents,
  collectDownstreamDependencies
};
