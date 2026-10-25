// Test for delimiter collisions in graphStructureKey implementation
// Replicates the fingerprint logic from GraphView.tsx lines 465-471
function fingerprint(nodes, edges) {
  if (nodes.length === 0) return '0:0';
  const nodeFP = nodes.map(n => `${n.id}:${n.type || ''}:${n.layer || ''}:${n.domain || ''}`).join('|');
  const edgeFP = edges.map(e => `${e.id}:${e.source}:${e.target}:${e.relationshipType || ''}`).join('|');
  return `${nodes.length}:${edges.length}#${nodeFP}#${edgeFP}`;
}

function testCollision() {
  const graphA = {
    nodes: [
      { id: 'a:1', type: 'type|x', layer: 'layer#y', domain: '' },
      { id: 'b', type: '', layer: '', domain: '' }
    ],
    edges: [{ id: 'e1', source: 'a:1', target: 'b', relationshipType: '' }]
  };
  const graphB = {
    nodes: [
      { id: 'a', type: '1', layer: 'type|x', domain: 'layer#y' },
      { id: 'b', type: '', layer: '', domain: '' }
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', relationshipType: '' }]
  };
  const fpA = fingerprint(graphA.nodes, graphA.edges);
  const fpB = fingerprint(graphB.nodes, graphB.edges);
  console.log('Fingerprint A:', fpA);
  console.log('Fingerprint B:', fpB);
  console.log('Collision?', fpA === fpB);
}

testCollision();
