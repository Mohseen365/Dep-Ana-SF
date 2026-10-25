const path = require('node:path');
const { readFileSync } = require('node:fs');
const { classifyNodeLayer, classifyNodeLayerWithReason } = require('../src/lib/layout/layers');

function getLayerRank(node) {
  const LAYER_ORDER = { presentation: 0, application: 1, domain: 2, schema: 3 };
  const layer = classifyNodeLayer(node);
  return LAYER_ORDER[layer] ?? 1;
}

function isTestNode(node) {
  if (node.behavior?.isTest) return true;
  const name = node.displayName || node.id || '';
  if (/(?:test|tests|testdatafactory)$/i.test(name)) return true;
  if (node.file && /(?:^|\/)(?:test|tests)\//i.test(node.file)) return true;
  return false;
}

const fixturePath = path.resolve(__dirname, '../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const data = JSON.parse(readFileSync(fixturePath, 'utf8'));
const ids = [
  'ApexClass:UserOrganizationRoleTriggerHandler',
  'ApexClass:AuditService',
  'ApexClass:UserContactMappingService',
];
const targetNodes = data.nodes.filter(n => ids.includes(n.id));
console.log('--- Target Nodes ---');
console.log(JSON.stringify(targetNodes, null, 2));

console.log('--- Classification Results ---');
for (const node of targetNodes) {
  const layer = classifyNodeLayer(node);
  const reason = classifyNodeLayerWithReason(node).reason;
  const rank = getLayerRank(node);
  console.log({ id: node.id, layer, rank, reason });
}

let violations = 0;
const violatingEdges = [];
for (const edge of data.edges) {
  const src = data.nodes.find(n => n.id === edge.source);
  const tgt = data.nodes.find(n => n.id === edge.target);
  if (!src || !tgt) continue;
  if (isTestNode(src) || isTestNode(tgt)) continue;
  const srcRank = getLayerRank(src);
  const tgtRank = getLayerRank(tgt);
  if (srcRank > tgtRank) { violations++; violatingEdges.push(edge); }
}
console.log('--- Summary ---');
console.log({ totalNodes: data.nodes.length, totalEdges: data.edges.length, violations });
console.log('--- Violating Edges ---');
console.log(JSON.stringify(violatingEdges, null, 2));
