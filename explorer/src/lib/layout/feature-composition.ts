import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { FeatureCluster } from './features';
import type { LayoutGraphIndex } from './graph-index';
import { createLayoutGraphIndex } from './graph-index';

export interface RectBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  width: number;
  height: number;
}

export interface FeatureCompositionGroup {
  id: string;
  featureId: string;
  nodeIds: readonly string[];
  anchorNodeId?: string;
  label?: string;
  bounds?: RectBounds;
}

export interface DeriveCompositionGroupOptions {
  index?: LayoutGraphIndex;
  nodeWidth?: number;
  nodeHeight?: number;
  padding?: number;
}

/**
 * Derives LWC / component composition groups for a Feature Cluster from graph topology evidence.
 * Preferred evidence order:
 * 1. direct LWC -> LWC composition/import relationships
 * 2. parent/child component relationships
 * 3. LWC -> Controller relationships
 * 4. existing domain information
 * 5. naming/path only as explanatory metadata
 *
 * Bounds are computed dynamically from existing node positions without moving any nodes.
 * Execution is generic and returns an empty array when no multi-node composition subgroup exists.
 */
export function deriveFeatureCompositionGroups(
  feature: FeatureCluster,
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  nodePositions?: Record<string, { x: number; y: number }>,
  options: DeriveCompositionGroupOptions = {}
): FeatureCompositionGroup[] {
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const padding = options.padding ?? 20;

  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const index = options.index || createLayoutGraphIndex(safeNodes, safeEdges);

  // Combine primary and secondary member node IDs for the feature
  const memberSet = new Set<string>([
    ...feature.primaryNodeIds,
    ...feature.secondaryNodeIds,
  ]);

  if (memberSet.size < 2) {
    return [];
  }

  // Filter candidate nodes that are UI components, LWCs, Controllers, or related Apex classes
  const candidateNodeIds = Array.from(memberSet).filter((id) => {
    const node = index.nodeById.get(id);
    if (!node) return false;
    // Exclude fields and test classes
    if (node.type === 'Field' || node.type === 'CustomField') return false;
    if (node.behavior?.isTest) return false;
    return true;
  });

  candidateNodeIds.sort((a, b) => a.localeCompare(b));

  if (candidateNodeIds.length < 2) {
    return [];
  }

  // Build internal adjacency list for candidate nodes within this feature
  const internalAdj = new Map<string, Set<string>>();
  candidateNodeIds.forEach((id) => internalAdj.set(id, new Set()));

  const candidateSet = new Set(candidateNodeIds);

  safeEdges.forEach((edge) => {
    if (candidateSet.has(edge.source) && candidateSet.has(edge.target) && edge.source !== edge.target) {
      internalAdj.get(edge.source)?.add(edge.target);
      internalAdj.get(edge.target)?.add(edge.source);
    }
  });

  // Also connect LWCs that share prefix or parent component topology if direct edge doesn't exist
  for (let i = 0; i < candidateNodeIds.length; i++) {
    for (let j = i + 1; j < candidateNodeIds.length; j++) {
      const idA = candidateNodeIds[i];
      const idB = candidateNodeIds[j];
      const nodeA = index.nodeById.get(idA);
      const nodeB = index.nodeById.get(idB);

      if (nodeA && nodeB && (nodeA.type === 'LWC' || nodeB.type === 'LWC')) {
        const nameA = nodeA.displayName || idA.split(':').pop() || '';
        const nameB = nodeB.displayName || idB.split(':').pop() || '';

        // Check prefix match (e.g. forecastAdminAudit and forecastAdminAuditHeader)
        const stemA = nameA.replace(/(?:Header|Footer|Panel|Modal|Card|Item|List|Form|Row|Table|View|Cell|Button|Grid|Filter)$/i, '');
        const stemB = nameB.replace(/(?:Header|Footer|Panel|Modal|Card|Item|List|Form|Row|Table|View|Cell|Button|Grid|Filter)$/i, '');

        if (stemA.length > 3 && stemB.length > 3 && (stemA === stemB || nameA.startsWith(stemB) || nameB.startsWith(stemA))) {
          internalAdj.get(idA)?.add(idB);
          internalAdj.get(idB)?.add(idA);
        }
      }
    }
  }

  // Find connected components within internal graph
  const visited = new Set<string>();
  const rawSubgroups: string[][] = [];

  for (const startId of candidateNodeIds) {
    if (visited.has(startId)) continue;

    const subgroup: string[] = [];
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      subgroup.push(curr);

      const neighbors = Array.from(internalAdj.get(curr) || []);
      neighbors.sort((a, b) => a.localeCompare(b));

      for (const nId of neighbors) {
        if (!visited.has(nId)) {
          visited.add(nId);
          queue.push(nId);
        }
      }
    }

    subgroup.sort((a, b) => a.localeCompare(b));
    if (subgroup.length >= 2) {
      rawSubgroups.push(subgroup);
    }
  }

  rawSubgroups.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));

  const groups: FeatureCompositionGroup[] = [];

  for (let idx = 0; idx < rawSubgroups.length; idx++) {
    const groupNodeIds = rawSubgroups[idx];

    // Find anchor node in subgroup (LWC first, then highest fanIn/fanOut)
    let anchorNodeId = groupNodeIds[0];
    let bestLwc = groupNodeIds.find((id) => index.nodeById.get(id)?.type === 'LWC');
    if (bestLwc) {
      anchorNodeId = bestLwc;
    } else {
      let maxDegree = -1;
      for (const id of groupNodeIds) {
        const deg = (index.incidentNeighborsByNode.get(id) || []).length;
        if (deg > maxDegree) {
          maxDegree = deg;
          anchorNodeId = id;
        }
      }
    }

    const anchorNode = index.nodeById.get(anchorNodeId);
    const anchorName = anchorNode?.displayName || anchorNodeId.split(':').pop() || 'Subgroup';

    // Format human-readable label
    const formattedName = anchorName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .trim();

    const groupLabel = `${formattedName} Group`;
    const groupId = `${feature.id}_composition_${idx + 1}`;

    // Compute bounding box if positions available
    let bounds: RectBounds | undefined = undefined;

    if (nodePositions) {
      let xMin = Infinity;
      let xMax = -Infinity;
      let yMin = Infinity;
      let yMax = -Infinity;
      let validCount = 0;

      for (const nId of groupNodeIds) {
        const pos = nodePositions[nId];
        if (pos) {
          validCount++;
          const minX = pos.x - nodeWidth / 2;
          const maxX = pos.x + nodeWidth / 2;
          const minY = pos.y - nodeHeight / 2;
          const maxY = pos.y + nodeHeight / 2;

          if (minX < xMin) xMin = minX;
          if (maxX > xMax) xMax = maxX;
          if (minY < yMin) yMin = minY;
          if (maxY > yMax) yMax = maxY;
        }
      }

      if (validCount > 0) {
        xMin -= padding;
        xMax += padding;
        yMin -= padding;
        yMax += padding;
        bounds = {
          xMin,
          xMax,
          yMin,
          yMax,
          width: xMax - xMin,
          height: yMax - yMin,
        };
      }
    }

    groups.push({
      id: groupId,
      featureId: feature.id,
      nodeIds: groupNodeIds,
      anchorNodeId,
      label: groupLabel,
      bounds,
    });
  }

  return groups;
}
