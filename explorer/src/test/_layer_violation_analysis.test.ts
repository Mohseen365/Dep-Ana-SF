import path from 'node:path';
import { readFileSync } from 'node:fs';
import { classifyNodeLayer, classifyNodeLayerWithReason } from '../lib/layout/layers';
import { getLayerRank, layerViolationCount } from '../lib/layout/metrics';

const fixturePath = path.resolve(process.cwd(), '../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const data = JSON.parse(readFileSync(fixturePath, 'utf8')) as { nodes: any[]; edges: any[] };

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
  const src = data.nodes.find(n => n.id === e.source);
  const tgt = data.nodes.find(n => n.id === e.target);
  if (!src || !tgt) return false;
  // use same isTestNode logic as in analysis.ts
  const isTestNode = (node: any) => {
    if (node.behavior?.isTest) return true;
    const name = node.displayName || node.id || '';
    if (/(?:test|tests|testdatafactory)$/i.test(name)) return true;
    if (node.file && /(?:^|\/)(?:test|tests)\//i.test(node.file)) return true;
    return false;
  };
  if (isTestNode(src) || isTestNode(tgt)) return false;
  const srcRank = getLayerRank(src);
  const tgtRank = getLayerRank(tgt);
  return srcRank > tgtRank;
});
console.log('--- Violating Edges ---');
console.log(JSON.stringify(violatingEdges, null, 2));
