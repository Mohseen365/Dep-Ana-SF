// Simple performance measurement for graphStructureKey
const { performance } = require('perf_hooks');
function generateGraph(nodeCount, edgeCount) {
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `n${i}`,
      type: 'type',
      layer: 'layer',
      domain: 'domain',
    });
  }
  const edges = [];
  for (let i = 0; i < edgeCount; i++) {
    const src = `n${i % nodeCount}`;
    const tgt = `n${(i + 1) % nodeCount}`;
    edges.push({ id: `e${i}`, source: src, target: tgt, relationshipType: 'rel' });
  }
  return { nodes, edges };
}
function fingerprint(nodes, edges) {
  if (nodes.length === 0) return '0:0';
  const nodeFP = nodes.map(n => `${n.id}:${n.type || ''}:${n.layer || ''}:${n.domain || ''}`).join('|');
  const edgeFP = edges.map(e => `${e.id}:${e.source}:${e.target}:${e.relationshipType || ''}`).join('|');
  return `${nodes.length}:${edges.length}#${nodeFP}#${edgeFP}`;
}
function measure(count) {
  const { nodes, edges } = generateGraph(count, count * 2);
  const start = performance.now();
  const key = fingerprint(nodes, edges);
  const end = performance.now();
  console.log(`Graph ${count} nodes, ${count * 2} edges: ${(end - start).toFixed(2)} ms, key length ${key.length}`);
}
[100, 1000, 5000, 10000].forEach(measure);
