import type { ExplorerDataSchema, ExplorerNode } from '../types/explorer';

export function rankDependents(
  nodeId: string,
  data: ExplorerDataSchema
): Array<{ node: ExplorerNode; impactCount: number; isDirect: boolean }> {
  if (!data || !nodeId) return [];

  const nodeMap = new Map<string, ExplorerNode>();
  for (const n of data.nodes) {
    nodeMap.set(n.id, n);
  }

  if (!nodeMap.has(nodeId)) return [];

  const summary = data.impactSummaries?.[nodeId];
  let directIds: Set<string>;
  let transitiveIds: Set<string>;

  if (summary) {
    directIds = new Set(summary.directDependents.filter((id) => id !== nodeId));
    transitiveIds = new Set(summary.transitiveDependents.filter((id) => id !== nodeId));
  } else {
    directIds = new Set<string>();
    for (const e of data.edges) {
      if (e.target === nodeId && e.source !== nodeId) {
        directIds.add(e.source);
      }
    }
    transitiveIds = new Set<string>();
    const queue = Array.from(directIds);
    const visited = new Set<string>([nodeId, ...directIds]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const e of data.edges) {
        if (e.target === current && !visited.has(e.source)) {
          visited.add(e.source);
          transitiveIds.add(e.source);
          queue.push(e.source);
        }
      }
    }
  }

  const allDependentIds = new Set<string>([...directIds, ...transitiveIds]);
  const result: Array<{ node: ExplorerNode; impactCount: number; isDirect: boolean }> = [];

  for (const depId of allDependentIds) {
    const depNode = nodeMap.get(depId);
    if (!depNode) continue;
    const isDirect = directIds.has(depId);
    const depSummary = data.impactSummaries?.[depId];
    const impactCount = depSummary ? depSummary.totalImpactCount : 0;
    result.push({
      node: depNode,
      impactCount,
      isDirect,
    });
  }

  result.sort((a, b) => {
    if (b.impactCount !== a.impactCount) {
      return b.impactCount - a.impactCount;
    }
    return a.node.displayName.localeCompare(b.node.displayName);
  });

  return result;
}

export function rankDependencies(
  nodeId: string,
  data: ExplorerDataSchema
): Array<{ node: ExplorerNode; impactCount: number }> {
  if (!data || !nodeId) return [];

  const nodeMap = new Map<string, ExplorerNode>();
  for (const n of data.nodes) {
    nodeMap.set(n.id, n);
  }

  if (!nodeMap.has(nodeId)) return [];

  const summary = data.impactSummaries?.[nodeId];
  let allDependencyIds: Set<string>;

  if (summary) {
    allDependencyIds = new Set(
      [...summary.directDependencies, ...summary.transitiveDependencies].filter(
        (id) => id !== nodeId
      )
    );
  } else {
    allDependencyIds = new Set<string>();
    const queue: string[] = [];
    for (const e of data.edges) {
      if (e.source === nodeId && e.target !== nodeId) {
        allDependencyIds.add(e.target);
        queue.push(e.target);
      }
    }
    const visited = new Set<string>([nodeId, ...allDependencyIds]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const e of data.edges) {
        if (e.source === current && !visited.has(e.target)) {
          visited.add(e.target);
          allDependencyIds.add(e.target);
          queue.push(e.target);
        }
      }
    }
  }

  const result: Array<{ node: ExplorerNode; impactCount: number }> = [];

  for (const depId of allDependencyIds) {
    const depNode = nodeMap.get(depId);
    if (!depNode) continue;
    const depSummary = data.impactSummaries?.[depId];
    const impactCount = depSummary ? depSummary.totalImpactCount : 0;
    result.push({
      node: depNode,
      impactCount,
    });
  }

  result.sort((a, b) => {
    if (b.impactCount !== a.impactCount) {
      return b.impactCount - a.impactCount;
    }
    return a.node.displayName.localeCompare(b.node.displayName);
  });

  return result;
}
