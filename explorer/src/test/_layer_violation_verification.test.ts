import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { classifyNodeLayer, classifyNodeLayerWithReason } from '../lib/layout/layers';
import { getLayerRank, layerViolationCount } from '../lib/layout/metrics';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

test('Layer Violation Verification', () => {
  const fixturePath = resolve(__dirname, '../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const data = JSON.parse(readFileSync(fixturePath, 'utf8')) as { nodes: ExplorerNode[]; edges: ExplorerEdge[] };
  const targetIds = [
    'ApexClass:UserOrganizationRoleTriggerHandler',
    'ApexClass:AuditService',
    'ApexClass:UserContactMappingService',
  ];
  const targetNodes = data.nodes.filter(n => targetIds.includes(n.id));
  console.log('--- Target Nodes ---');
  console.log(JSON.stringify(targetNodes, null, 2));

  console.log('--- Classification Results ---');
  for (const node of targetNodes) {
    const layer = classifyNodeLayer(node);
    const withReason = classifyNodeLayerWithReason(node);
    const rank = getLayerRank(node);
    console.log({ id: node.id, layer, rank, reason: withReason.reason, confidence: withReason.confidence });
  }

  const totalNodes = data.nodes.length;
  const totalEdges = data.edges.length;
  const violations = layerViolationCount(data.nodes, data.edges);
  console.log('--- Summary ---');
  console.log({ totalNodes, totalEdges, violations });

  const violatingEdges = data.edges.filter(e => {
    const source = data.nodes.find(n => n.id === e.source);
    const target = data.nodes.find(n => n.id === e.target);
    if (!source || !target) return false;
    if (source && target) {
      const srcRank = getLayerRank(source);
      const tgtRank = getLayerRank(target);
      // replicate same logic as layerViolationCount (skip test nodes)
      const isTest = (node: ExplorerNode) => {
        // duplicate isTestNode logic (simplified)
        if (node.behavior?.isTest) return true;
        const name = node.displayName || node.id || '';
        if (/(?:test|tests|testdatafactory)$/i.test(name)) return true;
        if (node.file && /(?:^|\/)(?:test|tests)\//i.test(node.file)) return true;
        return false;
      };
      if (isTest(source) || isTest(target)) return false;
      return srcRank > tgtRank;
    }
    return false;
  });
  console.log('--- Violating Edges ---');
  console.log(JSON.stringify(violatingEdges, null, 2));
});
