import { ExplorerNode, ExplorerCycleGroup, ExplorerComponentImpactSummary } from '../types/explorer';

export interface HotspotItem {
  node: ExplorerNode;
  category: 'High Risk' | 'High Fan-In' | 'High Coupling' | 'Circular Dependency' | 'Unresolved Reference';
  details: string;
}

export interface CategorizedHotspots {
  highRisk: ExplorerNode[];
  highFanIn: ExplorerNode[];
  highCoupling: ExplorerNode[];
  circular: ExplorerNode[];
  unresolved: ExplorerNode[];
  topRanked: HotspotItem[];
}

export function sortNodesDeterministically(nodes: ExplorerNode[]): ExplorerNode[] {
  return [...nodes].sort((a, b) => {
    const scoreA = a.metrics?.score || 0;
    const scoreB = b.metrics?.score || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;

    const couplingA = a.metrics?.coupling || 0;
    const couplingB = b.metrics?.coupling || 0;
    if (couplingB !== couplingA) return couplingB - couplingA;

    const fanInA = a.metrics?.fanIn || 0;
    const fanInB = b.metrics?.fanIn || 0;
    if (fanInB !== fanInA) return fanInB - fanInA;

    return a.displayName.localeCompare(b.displayName);
  });
}

export function getArchitecturalHotspots(
  nodes: ExplorerNode[],
  cycles: ExplorerCycleGroup[] = [],
  _impactSummaries?: Record<string, ExplorerComponentImpactSummary>
): CategorizedHotspots {
  if (!nodes || nodes.length === 0) {
    return {
      highRisk: [],
      highFanIn: [],
      highCoupling: [],
      circular: [],
      unresolved: [],
      topRanked: []
    };
  }

  const cycleNodeIds = new Set<string>();
  cycles.forEach(c => c.nodes.forEach(id => cycleNodeIds.add(id)));

  const highRisk = sortNodesDeterministically(
    nodes.filter(n => n.risk === 'HIGH' || n.refactoringReadiness?.isHighRisk)
  );

  const highFanIn = sortNodesDeterministically(
    nodes.filter(n => (n.metrics?.fanIn || 0) >= 8)
  );

  const highCoupling = sortNodesDeterministically(
    nodes.filter(n => (n.metrics?.coupling || 0) >= 15)
  );

  const circular = sortNodesDeterministically(
    nodes.filter(n => cycleNodeIds.has(n.id) || n.refactoringReadiness?.hasCycles)
  );

  const unresolved = sortNodesDeterministically(
    nodes.filter(n => (n.metrics?.unresolved || 0) > 0 || n.refactoringReadiness?.hasUnresolved)
  );

  // Derive ranked hotspot items deterministically
  const rankedItems: HotspotItem[] = [];
  const processedNodeIds = new Set<string>();

  const sortedAll = sortNodesDeterministically(nodes);

  for (const node of sortedAll) {
    if (processedNodeIds.has(node.id)) continue;

    const isHighRisk = node.risk === 'HIGH' || node.refactoringReadiness?.isHighRisk;
    const isFanIn = (node.metrics?.fanIn || 0) >= 8;
    const isCoupling = (node.metrics?.coupling || 0) >= 15;
    const isCircular = cycleNodeIds.has(node.id) || node.refactoringReadiness?.hasCycles;
    const isUnresolved = (node.metrics?.unresolved || 0) > 0 || node.refactoringReadiness?.hasUnresolved;

    if (isHighRisk || isFanIn || isCoupling || isCircular || isUnresolved) {
      processedNodeIds.add(node.id);

      let category: HotspotItem['category'] = 'High Risk';
      let details = `Score: ${node.metrics?.score || 0} | Fan-In: ${node.metrics?.fanIn || 0} | Coupling: ${node.metrics?.coupling || 0}`;

      if (isHighRisk) {
        category = 'High Risk';
        details = `HIGH Risk | Fan-In: ${node.metrics?.fanIn || 0} | Coupling: ${node.metrics?.coupling || 0}`;
      } else if (isCircular) {
        category = 'Circular Dependency';
        details = `Cycle: Yes | Coupling: ${node.metrics?.coupling || 0}`;
      } else if (isUnresolved) {
        category = 'Unresolved Reference';
        details = `Unresolved: ${node.metrics?.unresolved || 0} | Coupling: ${node.metrics?.coupling || 0}`;
      } else if (isCoupling) {
        category = 'High Coupling';
        details = `Coupling: ${node.metrics?.coupling || 0} | Fan-In: ${node.metrics?.fanIn || 0}`;
      } else if (isFanIn) {
        category = 'High Fan-In';
        details = `Fan-In: ${node.metrics?.fanIn || 0} | Fan-Out: ${node.metrics?.fanOut || 0}`;
      }

      rankedItems.push({
        node,
        category,
        details
      });
    }
  }

  return {
    highRisk,
    highFanIn,
    highCoupling,
    circular,
    unresolved,
    topRanked: rankedItems
  };
}
