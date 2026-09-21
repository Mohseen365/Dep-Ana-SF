import { describe, it } from 'vitest';
import path from 'path';
import fs from 'fs';
import { buildDomainGraph, determineGlobalDomainOrder } from './global-layout';
import { discoverFeatures } from './features';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';

const FIXTURE_PATH = path.resolve(__dirname, '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');

describe('Phase 2.1 Feature Graph Structure Audit', () => {
  const rawData = fs.readFileSync(FIXTURE_PATH, 'utf-8');
  const fixture = JSON.parse(rawData);
  const nodes = fixture.nodes as ExplorerNode[];
  const edges = fixture.edges as ExplorerEdge[];

  it('audits feature graph nodes, edges, adjacency, and component breakdown', () => {
    const featureDiscovery = discoverFeatures(nodes, edges);
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((assignment, nodeId) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });
    nodes.forEach(node => {
      if (!featureMap.has(node.id)) {
        featureMap.set(node.id, 'Unassigned');
      }
    });

    const featureGraph = buildDomainGraph(nodes, edges, undefined, undefined, featureMap);

    console.log('==== FEATURE GRAPH NODES ====');
    featureGraph.nodeList.forEach(fn => {
      console.log(`Feature: ${fn.domain} | Nodes: ${fn.nodeCount} | Primary: ${fn.primaryNodeCount} | PrimaryLayer: ${fn.primaryLayer} | ConnectedFeatures: [${fn.connectedDomains.join(', ')}]`);
    });

    console.log('\n==== FEATURE GRAPH EDGES (CROSS-FEATURE DEPENDENCIES) ====');
    featureGraph.edges.forEach(e => {
      console.log(`${e.sourceDomain} <---> ${e.targetDomain} | Forward(${e.sourceDomain}->${e.targetDomain}): ${e.edgeCount} | Backward: ${e.reverseEdgeCount} | Total: ${e.totalEdgeCount} | Strength: ${e.strength.toFixed(3)} | Span: [${e.layerSpan.join(', ')}]`);
    });

    const defaultOrder = determineGlobalDomainOrder(featureGraph);
    console.log('\n==== DEFAULT DETERMINE GLOBAL DOMAIN ORDER ====');
    console.log(defaultOrder);
  });
});
