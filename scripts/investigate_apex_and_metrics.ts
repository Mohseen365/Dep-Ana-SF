import * as fs from 'fs';
import * as crypto from 'crypto';

interface Node {
  id: string;
  displayName?: string;
  type: string;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
}

const content = fs.readFileSync('explorer/public/projects/pbim/explorer-data.json', 'utf8');
const data = JSON.parse(content);
const nodes: Node[] = data.nodes;
const edges: Edge[] = data.edges;

const nodeMap = new Map<string, Node>(nodes.map(n => [n.id, n]));
const lwcs = nodes.filter(n => n.type === 'LWC').sort((a,b) => a.id.localeCompare(b.id));
const lwcIds = new Set(lwcs.map(n => n.id));

const compEdges = edges.filter(e => e.relationshipType === 'lwc-template-child' && lwcIds.has(e.source) && lwcIds.has(e.target));
const lwcApexEdges = edges.filter(e => e.relationshipType === 'lwc-apex' && lwcIds.has(e.source));

// 1. All Apex Classes in Dataset
const allApexNodes = nodes.filter(n => n.type === 'ApexClass');
console.log('Total ApexClass nodes in PBIM:', allApexNodes.length);

// 2. Apex Classes referenced directly by LWCs via lwc-apex
const apexLwcConsumersMap = new Map<string, Set<string>>();
lwcApexEdges.forEach(e => {
  if (!apexLwcConsumersMap.has(e.target)) apexLwcConsumersMap.set(e.target, new Set());
  apexLwcConsumersMap.get(e.target)!.add(e.source);
});

console.log('ApexClass nodes referenced directly by LWCs (via lwc-apex):', apexLwcConsumersMap.size);

// Shared Apex Hubs globally (referenced by >= 2 distinct LWCs directly)
const globalSharedApexHubs = Array.from(apexLwcConsumersMap.entries())
  .filter(([apexId, consumers]) => consumers.size >= 2)
  .map(([apexId]) => apexId)
  .sort();

console.log(`\n--- GLOBAL SHARED APEX HUBS (Count = ${globalSharedApexHubs.length}) ---`);
globalSharedApexHubs.forEach(id => {
  const consumers = Array.from(apexLwcConsumersMap.get(id)!).sort();
  console.log(`  - ${id} (Consumers: ${consumers.length} -> ${consumers.join(', ')})`);
});

// 3. 14 Strict Composition Roots
const inDegreeMap = new Map<string, number>();
const outDegreeMap = new Map<string, number>();
lwcs.forEach(l => { inDegreeMap.set(l.id, 0); outDegreeMap.set(l.id, 0); });
compEdges.forEach(e => {
  outDegreeMap.set(e.source, (outDegreeMap.get(e.source) || 0) + 1);
  inDegreeMap.set(e.target, (inDegreeMap.get(e.target) || 0) + 1);
});

const strict14Roots = lwcs.filter(l => inDegreeMap.get(l.id) === 0).map(l => l.id).sort();
console.log(`\nStrict 14 Roots Count: ${strict14Roots.length}`);

// 4. 1-Hop Macro Projections for 14 Strict Roots
// Direct 1-hop dependencies along allowed edge types
const allowedEdgeTypes = new Set([
  'lwc-template-child', 'lwc-apex', 'method-call', 'instantiation',
  'type-reference', 'soql-object', 'soql-field', 'implements',
  'trigger-handler', 'trigger-object', 'generic-type', 'extends',
  'SOQL', 'DML', 'aura-enabled', 'lwc-import', 'field-reference',
  'trigger-on', 'visualforce-controller', 'event-publisher', 'unknown'
]);

const root1HopNodesMap = new Map<string, Set<string>>();
strict14Roots.forEach(rootId => {
  const reached = new Set<string>([rootId]);
  edges.forEach(e => {
    if (e.source === rootId && allowedEdgeTypes.has(e.relationshipType)) {
      reached.add(e.target);
    }
  });
  root1HopNodesMap.set(rootId, reached);
});

// Union of 1-hop nodes across 14 roots
const union1Hop14Roots = new Set<string>();
root1HopNodesMap.forEach(set => set.forEach(n => union1Hop14Roots.add(n)));

// Apex Classes reached in 1-hop view by 14 roots
const apex1Hop14Roots = Array.from(union1Hop14Roots)
  .filter(id => nodeMap.get(id)?.type === 'ApexClass')
  .sort();

console.log(`\nDistinct Apex Classes reached in 1-hop by 14 roots: Count = ${apex1Hop14Roots.length}`);
apex1Hop14Roots.forEach(id => {
  const consumersOfThisApexIn14 = strict14Roots.filter(r => root1HopNodesMap.get(r)!.has(id));
  const totalLwcConsumers = Array.from(apexLwcConsumersMap.get(id) || []);
  console.log(`  - ${id} | Direct 1-hop consumers among 14 roots: ${consumersOfThisApexIn14.length} (${consumersOfThisApexIn14.join(', ')}) | Total LWC consumers: ${totalLwcConsumers.length}`);
});

// Shared Apex Hubs reached in 1-hop by 14 roots:
const sharedHubsReachedIn1Hop = globalSharedApexHubs.filter(id => union1Hop14Roots.has(id));
console.log(`\nGlobal Shared Apex Hubs reached in 1-hop view: ${sharedHubsReachedIn1Hop.length} / ${globalSharedApexHubs.length}`);
sharedHubsReachedIn1Hop.forEach(id => {
  console.log(`  - Reached Hub: ${id}`);
});

// 5. Weakly Connected Components (Clusters) in LWC composition graph
const adjUndirected = new Map<string, Set<string>>();
lwcs.forEach(l => adjUndirected.set(l.id, new Set()));
compEdges.forEach(e => {
  adjUndirected.get(e.source)!.add(e.target);
  adjUndirected.get(e.target)!.add(e.source);
});

const visitedLwcs = new Set<string>();
const lwcClusters: string[][] = [];

lwcs.forEach(l => {
  if (!visitedLwcs.has(l.id)) {
    const cluster: string[] = [];
    const q = [l.id];
    visitedLwcs.add(l.id);
    while (q.length > 0) {
      const curr = q.shift()!;
      cluster.push(curr);
      adjUndirected.get(curr)!.forEach(neighbor => {
        if (!visitedLwcs.has(neighbor)) {
          visitedLwcs.add(neighbor);
          q.push(neighbor);
        }
      });
    }
    lwcClusters.push(cluster.sort());
  }
});

console.log(`\nLWC Composition Graph Weakly Connected Components (Clusters): Count = ${lwcClusters.length}`);
lwcClusters.forEach((c, idx) => {
  const rootsInCluster = c.filter(id => inDegreeMap.get(id) === 0);
  console.log(`  Cluster ${idx+1} (${c.length} LWCs): Root(s) = [${rootsInCluster.join(', ')}] | Members = [${c.join(', ')}]`);
});

// 6. Test 1,000 array shuffles for determinism
let deterministicPass = true;
const baseSortedRoots = [...strict14Roots];

for (let i = 0; i < 1000; i++) {
  const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
  const shuffledEdges = [...edges].sort(() => Math.random() - 0.5);

  const shuffledLwcs = shuffledNodes.filter(n => n.type === 'LWC');
  const shuffledLwcIds = new Set(shuffledLwcs.map(n => n.id));

  const shuffledCompEdges = shuffledEdges.filter(e => e.relationshipType === 'lwc-template-child' && shuffledLwcIds.has(e.source) && shuffledLwcIds.has(e.target));

  const shuffledInDegree = new Map<string, number>();
  shuffledLwcs.forEach(l => shuffledInDegree.set(l.id, 0));
  shuffledCompEdges.forEach(e => {
    shuffledInDegree.set(e.target, (shuffledInDegree.get(e.target) || 0) + 1);
  });

  const computedRoots = shuffledLwcs
    .filter(l => shuffledInDegree.get(l.id) === 0)
    .map(l => l.id)
    .sort((a, b) => a.localeCompare(b));

  if (JSON.stringify(computedRoots) !== JSON.stringify(baseSortedRoots)) {
    deterministicPass = false;
    break;
  }
}

console.log('\n1,000 Shuffled Permutation Determinism Test:', deterministicPass ? 'PASS (100% BIT-FOR-BIT IDENTICAL)' : 'FAIL');
