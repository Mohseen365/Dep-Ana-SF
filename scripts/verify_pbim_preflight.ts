import * as fs from 'fs';
import * as crypto from 'crypto';

interface Node {
  id: string;
  type: string;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
}

const content = fs.readFileSync('explorer/public/projects/pbim/explorer-data.json', 'utf8');
const sha256 = crypto.createHash('sha256').update(content).digest('hex');

const data = JSON.parse(content);
const nodes: Node[] = data.nodes;
const edges: Edge[] = data.edges;

const lwcs = nodes.filter(n => n.type === 'LWC');
const lwcIds = new Set(lwcs.map(n => n.id));

const lwcCompEdges = edges.filter(e => e.relationshipType === 'lwc-template-child' && lwcIds.has(e.source) && lwcIds.has(e.target));
const lwcApexEdges = edges.filter(e => e.relationshipType === 'lwc-apex');

// Shared Apex hubs (>= 2 LWC consumers)
const lwcByTarget = new Map<string, Set<string>>();
edges.forEach(e => {
  if (lwcIds.has(e.source) && !lwcIds.has(e.target)) {
    if (!lwcByTarget.has(e.target)) lwcByTarget.set(e.target, new Set());
    lwcByTarget.get(e.target)!.add(e.source);
  }
});

let sharedApexHubs = 0;
lwcByTarget.forEach((consumers, targetId) => {
  const targetNode = nodes.find(n => n.id === targetId);
  if (targetNode && targetNode.type === 'ApexClass' && consumers.size >= 2) {
    sharedApexHubs++;
  }
});

// BFS reachability from all 30 LWCs combined
const allowedEdgeTypes = new Set([
  'lwc-template-child', 'lwc-apex', 'method-call', 'instantiation',
  'type-reference', 'soql-object', 'soql-field', 'implements',
  'trigger-handler', 'trigger-object', 'generic-type', 'extends',
  'SOQL', 'DML', 'aura-enabled', 'lwc-import', 'field-reference',
  'trigger-on', 'visualforce-controller', 'event-publisher', 'unknown'
]);

const reachableFromAllLwcs = new Set<string>();
lwcs.forEach(lwc => {
  reachableFromAllLwcs.add(lwc.id);
  const queue = [lwc.id];
  const visited = new Set<string>([lwc.id]);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const outgoing = edges.filter(e => e.source === curr && allowedEdgeTypes.has(e.relationshipType));
    for (const e of outgoing) {
      if (!visited.has(e.target)) {
        visited.add(e.target);
        reachableFromAllLwcs.add(e.target);
        queue.push(e.target);
      }
    }
  }
});

console.log('--- PRE-FLIGHT VERIFICATION ---');
console.log('SHA-256:', sha256);
console.log('Total Nodes:', nodes.length);
console.log('Total Edges:', edges.length);
console.log('Total LWCs:', lwcs.length);
console.log('lwc-template-child edges:', lwcCompEdges.length);
console.log('lwc-apex edges:', lwcApexEdges.length);
console.log('Shared Apex hubs (>=2 LWCs):', sharedApexHubs);
console.log('Reachable from all LWCs combined:', reachableFromAllLwcs.size);
console.log('Unreachable backend nodes:', nodes.length - reachableFromAllLwcs.size);
