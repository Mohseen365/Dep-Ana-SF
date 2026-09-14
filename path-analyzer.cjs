/**
 * Deterministic Dependency Paths Analyzer (Prompt 21)
 *
 * Provides cycle-safe, bounded, explainable, and reproducible
 * dependency path analysis across the architecture graph.
 *
 * Support minimum required path categories:
 *   - component -> dependency (length 1)
 *   - component -> transitive dependency (length > 1)
 *   - dependent -> component (length 1)
 *   - transitive dependent -> component (length > 1)
 *
 * Structural representation:
 *   {
 *     "from": "A",
 *     "to": "D",
 *     "path": ["A", "B", "C", "D"],
 *     "length": 3
 *   }
 *
 * Edge cases handled:
 *   - cycles (per-path visited set)
 *   - disconnected components
 *   - self-reference (length 0 path)
 *   - duplicate paths (deduplicated by path key)
 *   - path explosion (bounded by maxDepth, maxPaths, maxSteps)
 *
 * 100% deterministic, 0 LLM calls.
 */

"use strict";

const {
  createEvidence,
  createDeterministicResult
} = require("./deterministic/contract.cjs");

/**
 * Builds incoming and outgoing adjacency maps from a graph object ({ nodes, edges }).
 */
function buildAdjacencyMaps(graph) {
  const outgoing = new Map();
  const incoming = new Map();

  if (graph && Array.isArray(graph.nodes)) {
    for (const node of graph.nodes) {
      outgoing.set(node.id, []);
      incoming.set(node.id, []);
    }
  }

  if (graph && Array.isArray(graph.edges)) {
    for (const edge of graph.edges) {
      if (!edge.from || !edge.to) continue;
      if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
      if (!incoming.has(edge.to)) incoming.set(edge.to, []);

      outgoing.get(edge.from).push(edge);
      incoming.get(edge.to).push(edge);
    }
  }

  return { outgoing, incoming };
}

/**
 * Finds all simple paths between fromId and toId in the dependency graph.
 *
 * Bounded by maxDepth, maxPaths, and maxSteps to prevent path explosion.
 * Cycle-safe using a per-path visited set.
 */
function findPaths(fromId, toId, graph, options = {}) {
  const maxDepth = options.maxDepth ?? 10;
  const maxPaths = options.maxPaths ?? 50;
  const maxSteps = options.maxSteps ?? 5000;

  if (!fromId || !toId || !graph) {
    return [];
  }

  if (fromId === toId) {
    return [
      {
        from: fromId,
        to: toId,
        path: [fromId],
        length: 0
      }
    ];
  }

  const { outgoing } = buildAdjacencyMaps(graph);
  if (!outgoing.has(fromId)) {
    return [];
  }

  const paths = [];
  const seenPathKeys = new Set();

  const queue = [
    {
      current: fromId,
      path: [fromId],
      visited: new Set([fromId])
    }
  ];

  let steps = 0;

  while (queue.length > 0 && paths.length < maxPaths && steps < maxSteps) {
    steps++;
    const state = queue.shift();

    if (state.path.length - 1 >= maxDepth) {
      continue;
    }

    const nextEdges = outgoing.get(state.current) || [];
    for (const edge of nextEdges) {
      const nextId = edge.to;

      if (state.visited.has(nextId)) {
        // Cycle-safe: skip nodes already in current path traversal
        continue;
      }

      const newPath = [...state.path, nextId];
      const pathKey = newPath.join("->");

      if (nextId === toId) {
        if (!seenPathKeys.has(pathKey)) {
          seenPathKeys.add(pathKey);
          paths.push({
            from: fromId,
            to: toId,
            path: newPath,
            length: newPath.length - 1
          });
        }
      } else {
        const newVisited = new Set(state.visited);
        newVisited.add(nextId);
        queue.push({
          current: nextId,
          path: newPath,
          visited: newVisited
        });
      }

      if (paths.length >= maxPaths) break;
    }
  }

  return paths;
}

/**
 * Analyzes dependency paths for a given component in the graph.
 * Classifies paths into:
 *   - directDependencies: component -> dependency (length 1)
 *   - transitiveDependencies: component -> transitive dependency (length > 1)
 *   - directDependents: dependent -> component (length 1)
 *   - transitiveDependents: dependent -> component (length > 1)
 */
function analyzeComponentPaths(componentId, graph, options = {}) {
  const maxDepth = options.maxDepth ?? 10;
  const maxPaths = options.maxPaths ?? 100;
  const maxSteps = options.maxSteps ?? 5000;

  if (!componentId || !graph) {
    return createDeterministicResult({
      value: "unknown",
      primary: "unknown",
      confidence: "unknown",
      evidence: [createEvidence("no-component", "Component ID or graph missing.")],
      metadata: {
        componentId: componentId || null,
        directDependencies: [],
        transitiveDependencies: [],
        directDependents: [],
        transitiveDependents: [],
        summary: { totalPaths: 0, directDependenciesCount: 0, transitiveDependenciesCount: 0, directDependentsCount: 0, transitiveDependentsCount: 0 }
      }
    });
  }

  const { outgoing, incoming } = buildAdjacencyMaps(graph);

  const directDependencies = [];
  const transitiveDependencies = [];
  const directDependents = [];
  const transitiveDependents = [];

  const seenDepKeys = new Set();
  const seenDeptKeys = new Set();

  // 1. Downstream path exploration (component -> dependencies)
  const queueDownstream = [
    {
      current: componentId,
      path: [componentId],
      visited: new Set([componentId])
    }
  ];

  let steps = 0;
  while (queueDownstream.length > 0 && (directDependencies.length + transitiveDependencies.length) < maxPaths && steps < maxSteps) {
    steps++;
    const state = queueDownstream.shift();
    const depth = state.path.length - 1;

    if (depth >= maxDepth) continue;

    const edges = outgoing.get(state.current) || [];
    for (const edge of edges) {
      const nextId = edge.to;
      if (state.visited.has(nextId)) continue;

      const newPath = [...state.path, nextId];
      const length = newPath.length - 1;
      const key = `${componentId}|${nextId}|${newPath.join("->")}`;

      if (!seenDepKeys.has(key)) {
        seenDepKeys.add(key);
        const item = {
          from: componentId,
          to: nextId,
          path: newPath,
          length
        };

        if (length === 1) {
          directDependencies.push(item);
        } else {
          transitiveDependencies.push(item);
        }
      }

      const newVisited = new Set(state.visited);
      newVisited.add(nextId);
      queueDownstream.push({
        current: nextId,
        path: newPath,
        visited: newVisited
      });
    }
  }

  // 2. Upstream path exploration (dependents -> component)
  const queueUpstream = [
    {
      current: componentId,
      path: [componentId],
      visited: new Set([componentId])
    }
  ];

  steps = 0;
  while (queueUpstream.length > 0 && (directDependents.length + transitiveDependents.length) < maxPaths && steps < maxSteps) {
    steps++;
    const state = queueUpstream.shift();
    const depth = state.path.length - 1;

    if (depth >= maxDepth) continue;

    const edges = incoming.get(state.current) || [];
    for (const edge of edges) {
      const prevId = edge.from;
      if (state.visited.has(prevId)) continue;

      const newPath = [prevId, ...state.path];
      const length = newPath.length - 1;
      const key = `${prevId}|${componentId}|${newPath.join("->")}`;

      if (!seenDeptKeys.has(key)) {
        seenDeptKeys.add(key);
        const item = {
          from: prevId,
          to: componentId,
          path: newPath,
          length
        };

        if (length === 1) {
          directDependents.push(item);
        } else {
          transitiveDependents.push(item);
        }
      }

      const newVisited = new Set(state.visited);
      newVisited.add(prevId);
      queueUpstream.push({
        current: prevId,
        path: newPath,
        visited: newVisited
      });
    }
  }

  const totalPaths = directDependencies.length + transitiveDependencies.length + directDependents.length + transitiveDependents.length;
  const confidence = totalPaths > 0 ? "high" : "unknown";

  const evidence = [];
  if (directDependencies.length > 0) {
    evidence.push(createEvidence("direct-dependencies-paths", `Identified ${directDependencies.length} direct dependency path(s) (length 1).`));
  }
  if (transitiveDependencies.length > 0) {
    evidence.push(createEvidence("transitive-dependencies-paths", `Identified ${transitiveDependencies.length} transitive dependency path(s) (length > 1).`));
  }
  if (directDependents.length > 0) {
    evidence.push(createEvidence("direct-dependents-paths", `Identified ${directDependents.length} direct dependent path(s) (length 1).`));
  }
  if (transitiveDependents.length > 0) {
    evidence.push(createEvidence("transitive-dependents-paths", `Identified ${transitiveDependents.length} transitive dependent path(s) (length > 1).`));
  }
  if (totalPaths === 0) {
    evidence.push(createEvidence("isolated-component", `Component '${componentId}' has no inbound or outbound dependency paths.`));
  }

  return createDeterministicResult({
    value: totalPaths > 0 ? "analyzed" : "isolated",
    primary: totalPaths > 0 ? "analyzed" : "isolated",
    confidence,
    evidence,
    metadata: {
      componentId,
      directDependencies,
      transitiveDependencies,
      directDependents,
      transitiveDependents,
      summary: {
        totalPaths,
        directDependenciesCount: directDependencies.length,
        transitiveDependenciesCount: transitiveDependencies.length,
        directDependentsCount: directDependents.length,
        transitiveDependentsCount: transitiveDependents.length
      }
    }
  });
}

module.exports = {
  buildAdjacencyMaps,
  findPaths,
  analyzeComponentPaths
};
