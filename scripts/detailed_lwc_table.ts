import * as fs from 'fs';
import * as crypto from 'crypto';

interface Node {
  id: string;
  displayName?: string;
  type: string;
  file?: string;
  risk?: string;
  metrics?: {
    fanIn?: number;
    fanOut?: number;
    coupling?: number;
    score?: number;
  };
}

interface Edge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
}

interface Dataset {
  nodes: Node[];
  edges: Edge[];
}

const fileContent = fs.readFileSync('explorer/public/projects/pbim/explorer-data.json', 'utf8');
const sha256 = crypto.createHash('sha256').update(fileContent).digest('hex');

const data: Dataset = JSON.parse(fileContent);
const nodeMap = new Map<string, Node>(data.nodes.map(n => [n.id, n]));

const lwcNodes = data.nodes.filter(n => n.type === 'LWC').sort((a,b) => a.id.localeCompare(b.id));
const lwcIds = new Set(lwcNodes.map(n => n.id));

// Edge sets
const compEdges = data.edges.filter(e => e.relationshipType === 'lwc-template-child' && lwcIds.has(e.source) && lwcIds.has(e.target));
const apexEdges = data.edges.filter(e => e.relationshipType === 'lwc-apex');

// BFS helper for 1-hop and full-reach
function getBfsReach(startLwcId: string, maxDepth = 7) {
  const allowedEdgeTypes = new Set([
    'lwc-template-child', 'lwc-apex', 'method-call', 'instantiation',
    'type-reference', 'soql-object', 'soql-field', 'implements',
    'trigger-handler', 'trigger-object', 'generic-type', 'extends',
    'SOQL', 'DML', 'aura-enabled', 'lwc-import', 'field-reference',
    'trigger-on', 'visualforce-controller', 'event-publisher', 'unknown'
  ]);

  const visitedNodes = new Set<string>([startLwcId]);
  const visitedEdges = new Set<string>();
  const depthMap = new Map<string, number>([[startLwcId, 0]]);
  let queue = [startLwcId];

  // Build adjacency
  const adjMap = new Map<string, Edge[]>();
  data.edges.forEach(e => {
    if (allowedEdgeTypes.has(e.relationshipType)) {
      if (!adjMap.has(e.source)) adjMap.set(e.source, []);
      adjMap.get(e.source)!.push(e);
    }
  });

  let currentDepth = 0;
  while (queue.length > 0 && currentDepth < maxDepth) {
    const nextQueue: string[] = [];
    for (const curr of queue) {
      const edges = adjMap.get(curr) || [];
      for (const e of edges) {
        visitedEdges.add(e.id);
        if (!visitedNodes.has(e.target)) {
          visitedNodes.add(e.target);
          depthMap.set(e.target, currentDepth + 1);
          nextQueue.push(e.target);
        }
      }
    }
    queue = nextQueue;
    currentDepth++;
  }

  return { visitedNodes, visitedEdges, depthMap };
}

console.log('--- 30 LWC DETAILED TABLE ---');
console.log('ID | InComp | OutComp | DirectApex | 1-HopNodes | TotalBFSReach | Classification');

lwcNodes.forEach(lwc => {
  const inComp = compEdges.filter(e => e.target === lwc.id).length;
  const outComp = compEdges.filter(e => e.source === lwc.id).length;
  const directApex = apexEdges.filter(e => e.source === lwc.id).map(e => e.target);

  const reach1 = getBfsReach(lwc.id, 1);
  const reachFull = getBfsReach(lwc.id, 7);

  let category = '';
  if (inComp === 0 && outComp > 0) category = 'Root Container';
  else if (inComp === 0 && outComp === 0) category = 'Standalone Root';
  else if (inComp > 0 && outComp > 0) category = 'Bridge LWC';
  else category = 'Leaf LWC';

  console.log(`${lwc.id} | ${inComp} | ${outComp} | ${directApex.length} | ${reach1.visitedNodes.size} | ${reachFull.visitedNodes.size} | ${category}`);
});
