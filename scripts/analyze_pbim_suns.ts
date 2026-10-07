import * as fs from 'fs';
import * as crypto from 'crypto';

interface Node {
  id: string;
  displayName?: string;
  type: string;
  file?: string;
  risk?: string;
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

console.log('SHA-256:', sha256);

const data: Dataset = JSON.parse(fileContent);

console.log('Total Nodes:', data.nodes.length);
console.log('Total Edges:', data.edges.length);

const lwcNodes = data.nodes.filter(n => n.type === 'LWC');
console.log('Total LWCs:', lwcNodes.length);

const lwcIds = new Set(lwcNodes.map(n => n.id));

// Edge types
const lwcCompositionEdges = data.edges.filter(e => e.relationshipType === 'lwc-template-child');
const lwcApexEdges = data.edges.filter(e => e.relationshipType === 'lwc-apex');

console.log('lwc-template-child edges:', lwcCompositionEdges.length);
console.log('lwc-apex edges:', lwcApexEdges.length);

// Shared Apex hubs
const apexNodes = data.nodes.filter(n => n.type === 'ApexClass');
const apexLwcConsumers = new Map<string, Set<string>>();
data.edges.forEach(e => {
  if (lwcIds.has(e.source) && !lwcIds.has(e.target)) {
    if (!apexLwcConsumers.has(e.target)) {
      apexLwcConsumers.set(e.target, new Set());
    }
    apexLwcConsumers.get(e.target)!.add(e.source);
  }
});

let sharedApexCount = 0;
apexLwcConsumers.forEach((consumers, targetId) => {
  const targetNode = data.nodes.find(n => n.id === targetId);
  if (targetNode && targetNode.type === 'ApexClass' && consumers.size >= 2) {
    sharedApexCount++;
  }
});
console.log('Shared Apex hubs (>=2 LWC consumers):', sharedApexCount);

// In-degree and out-degree in LWC composition graph (lwc-template-child only)
const lwcInDegree = new Map<string, number>();
const lwcOutDegree = new Map<string, number>();
const lwcChildrenMap = new Map<string, Set<string>>();
const lwcParentsMap = new Map<string, Set<string>>();

lwcNodes.forEach(n => {
  lwcInDegree.set(n.id, 0);
  lwcOutDegree.set(n.id, 0);
  lwcChildrenMap.set(n.id, new Set());
  lwcParentsMap.set(n.id, new Set());
});

lwcCompositionEdges.forEach(e => {
  if (lwcIds.has(e.source) && lwcIds.has(e.target)) {
    lwcOutDegree.set(e.source, (lwcOutDegree.get(e.source) || 0) + 1);
    lwcInDegree.set(e.target, (lwcInDegree.get(e.target) || 0) + 1);
    lwcChildrenMap.get(e.source)!.add(e.target);
    lwcParentsMap.get(e.target)!.add(e.source);
  }
});

const graphRoots = lwcNodes.filter(n => (lwcInDegree.get(n.id) || 0) === 0);
console.log('\nGraph Roots (inDegree = 0 in lwc-template-child): Count =', graphRoots.length);
graphRoots.forEach(r => {
  console.log(`  - ${r.id} (outDegree=${lwcOutDegree.get(r.id)})`);
});

const rootContainers = graphRoots.filter(r => (lwcOutDegree.get(r.id) || 0) > 0);
console.log('\nRoot Containers (inDegree = 0 AND outDegree > 0 in lwc-template-child): Count =', rootContainers.length);
rootContainers.forEach(r => {
  console.log(`  - ${r.id} (outDegree=${lwcOutDegree.get(r.id)})`);
});

const standaloneRoots = graphRoots.filter(r => (lwcOutDegree.get(r.id) || 0) === 0);
console.log('\nStandalone Roots (inDegree = 0 AND outDegree = 0): Count =', standaloneRoots.length);
standaloneRoots.forEach(r => {
  console.log(`  - ${r.id}`);
});

const bridgeLwcs = lwcNodes.filter(n => (lwcInDegree.get(n.id) || 0) > 0 && (lwcOutDegree.get(n.id) || 0) > 0);
console.log('\nBridge LWCs (inDegree > 0 AND outDegree > 0): Count =', bridgeLwcs.length);
bridgeLwcs.forEach(b => {
  console.log(`  - ${b.id} (inDegree=${lwcInDegree.get(b.id)}, outDegree=${lwcOutDegree.get(b.id)})`);
});

const leafLwcs = lwcNodes.filter(n => (lwcInDegree.get(n.id) || 0) > 0 && (lwcOutDegree.get(n.id) || 0) === 0);
console.log('\nLeaf LWCs (inDegree > 0 AND outDegree = 0): Count =', leafLwcs.length);
leafLwcs.forEach(l => {
  console.log(`  - ${l.id} (inDegree=${lwcInDegree.get(l.id)})`);
});
