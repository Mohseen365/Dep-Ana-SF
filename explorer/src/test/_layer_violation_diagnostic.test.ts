// Temporary diagnostic to reproduce production layerViolationCount on the canonical fixture
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import { layerViolationCount } from '../lib/layout/metrics';
import { classifyNodeLayer } from '../lib/layout/layers';
import { isTestNode } from '../lib/layout/analysis';

const fixturePath = path.resolve(__dirname, '../../..', 'audit-fixtures', 'cloud-spend-tracker', 'explorer-data.json');
const raw = readFileSync(fixturePath, 'utf-8');
const data = JSON.parse(raw) as { nodes: ExplorerNode[]; edges: ExplorerEdge[] };

const nodes = data.nodes;
const edges = data.edges;

console.log('Fixture path:', fixturePath);
console.log('Node count:', nodes.length);
console.log('Edge count:', edges.length);

const totalViolations = layerViolationCount(nodes, edges);
console.log('Production layerViolationCount:', totalViolations);

// Collect detailed info on each violating edge
const violations: any[] = [];
const LAYER_ORDER: Record<string, number> = {
  presentation: 0,
  application: 1,
  domain: 2,
  schema: 3,
};

function getRank(node: ExplorerNode): number {
  const layer = classifyNodeLayer(node);
  return LAYER_ORDER[layer] ?? 1;
}

for (const edge of edges) {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);
  if (!sourceNode || !targetNode) continue;
  if (isTestNode(sourceNode) || isTestNode(targetNode)) continue;
  const sourceRank = getRank(sourceNode);
  const targetRank = getRank(targetNode);
  if (sourceRank > targetRank) {
    violations.push({
      edge,
      source: {
        id: sourceNode.id,
        name: sourceNode.displayName,
        type: sourceNode.type,
        file: sourceNode.file,
        layer: classifyNodeLayer(sourceNode),
        rank: sourceRank,
      },
      target: {
        id: targetNode.id,
        name: targetNode.displayName,
        type: targetNode.type,
        file: targetNode.file,
        layer: classifyNodeLayer(targetNode),
        rank: targetRank,
      },
    });
  }
}

console.log('Violation details count:', violations.length);
for (const v of violations) {
  console.log('---');
  console.log('Edge ID:', v.edge.source, '->', v.edge.target);
  console.log('Relationship:', v.edge.relationship?.type ?? 'unknown');
  console.log('Source:', v.source.id, v.source.name, v.source.type, 'layer', v.source.layer, 'rank', v.source.rank);
  console.log('Target:', v.target.id, v.target.name, v.target.type, 'layer', v.target.layer, 'rank', v.target.rank);
}

// Export a dummy test so vitest runs the file
test('layer violation diagnostic', () => {
  expect(totalViolations).toBeGreaterThanOrEqual(0);
});
