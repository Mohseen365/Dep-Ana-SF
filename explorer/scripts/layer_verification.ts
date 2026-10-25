import path from 'node:path';
import { readFileSync } from 'node:fs';
import { classifyNodeLayer, classifyNodeLayerWithReason } from '../src/lib/layout/layers';

// Recreate layer order mapping (same as in metrics.ts)
const LAYER_ORDER: Record<string, number> = {
  presentation: 0,
  application: 1,
  domain: 2,
  schema: 3,
};

function getLayerRank(node: any): number {
  const layer = classifyNodeLayer(node);
  return LAYER_ORDER[layer] ?? 1;
}

function isTestNode(node: any): boolean {
  if (node.behavior?.isTest) return true;
  const name = node.displayName || node.id || '';
  if (/(?:test|tests|testdatafactory)$/i.test(name)) return true;
  if (node.file && /(?:^|\/)(?:test|tests)\//i.test(node.file)) return true;
  return false;
}

const fixturePath = path.resolve(__dirname, '../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
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
  const reason = classifyNodeLayerWithReason(node).reason;
  const rank = getLayerRank(node);
  console.log({ id: node.id, layer, rank, reason });
}

const totalNodes = data.nodes.length;
const totalEdges = data.edges.length;
let violations = 0;
const violatingEdges: any[] = [];

for (const edge of data.edges) {
  const src = data.nodes.find(n => n.id === edge.source);
  const tgt = data.nodes.find(n => n.id === edge.target);
  if (!src || !tgt) continue;
  if (isTestNode(src) || isTestNode(tgt)) continue;
  const srcRank = getLayerRank(src);
  const tgtRank = getLayerRank(tgt);
  if (srcRank > tgtRank) {
    violations++;
    violatingEdges.push(edge);
  }
}

console.log('--- Summary ---');
console.log({ totalNodes, totalEdges, violations });

console.log('--- Violating Edges ---');
console.log(JSON.stringify(violatingEdges, null, 2));
