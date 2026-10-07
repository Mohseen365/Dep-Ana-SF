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
const data: Dataset = JSON.parse(fileContent);

const nodeMap = new Map<string, Node>(data.nodes.map(n => [n.id, n]));
const lwcNodes = data.nodes.filter(n => n.type === 'LWC').sort((a,b) => a.id.localeCompare(b.id));
const lwcIds = new Set(lwcNodes.map(n => n.id));

const compEdges = data.edges.filter(e => e.relationshipType === 'lwc-template-child' && lwcIds.has(e.source) && lwcIds.has(e.target));
const apexEdges = data.edges.filter(e => e.relationshipType === 'lwc-apex');

// In/Out degree
const inComp = new Map<string, number>();
const outComp = new Map<string, number>();
lwcNodes.forEach(n => { inComp.set(n.id, 0); outComp.set(n.id, 0); });
compEdges.forEach(e => {
  outComp.set(e.source, (outComp.get(e.source)||0) + 1);
  inComp.set(e.target, (inComp.get(e.target)||0) + 1);
});

// Classifications
const strict6Containers = lwcNodes.filter(n => (inComp.get(n.id) === 0) && (outComp.get(n.id)! > 0)).map(n => n.id);
const strict8Standalone = lwcNodes.filter(n => (inComp.get(n.id) === 0) && (outComp.get(n.id) === 0)).map(n => n.id);
const strict14Roots = lwcNodes.filter(n => inComp.get(n.id) === 0).map(n => n.id);
const strict3Bridges = lwcNodes.filter(n => inComp.get(n.id)! > 0 && outComp.get(n.id)! > 0).map(n => n.id);
const strict13Leaves = lwcNodes.filter(n => inComp.get(n.id)! > 0 && outComp.get(n.id) === 0).map(n => n.id);

// Previous 10 Containers (6 containers + 4 standalone with Apex controllers)
const prev10Containers = [
  ...strict6Containers,
  'LWC:approval-flow',
  'LWC:budget-utilization-summary',
  'LWC:citizen-report-portal',
  'LWC:dynamic-inspection-form'
].sort();

// Previous 18 Roots (10 containers + 8 standalone? Wait: 6 containers + 8 standalone + 4? Or 30 - 12 leaves = 18 LWCs)
// Non-leaf LWCs (18 LWCs): 6 containers + 8 standalone + 3 bridges + 1 child LWC with outComp=0 but inComp>0?
// Let's check non-leaf LWCs: 30 - 13 leaves = 17! 30 - 12 (previous child count) = 18!
const nonLeaf18Suns = lwcNodes.filter(n => {
  // If we take 14 strict roots + 3 bridges + 1 leaf = 18, or 6 containers + 8 standalone + 3 bridges + 1 leaf?
  // Let's list all 18 from the previous audit if possible:
  // Previous audit listed: 10 containers + 8 standalone = 18!
  // Wait! 6 containers + 4 standalone (the 10) + remaining 4 standalone = 18!
  // That means ALL 14 strict roots + 4 extra? Or wait! 6 containers + 8 standalone = 14!
  // Where did 18 come from?
  // Let's check: 6 containers + 8 standalone + 3 bridges + 1 leaf = 18!
  return true;
});

// Let's define the exact sets we want to test:
const candidateSets = {
  'Set_30_All': lwcNodes.map(n => n.id),
  'Set_14_StrictGraphRoots': strict14Roots,
  'Set_6_StrictRootContainers': strict6Containers,
  'Set_10_PrevRootContainers': prev10Containers,
  'Set_18_PrevRoots_or_NonLeaf': [
    ...strict14Roots,
    ...strict3Bridges, // 3 bridges
    'LWC:zone-dashboard' // 1 extra
  ].sort(),
  'Set_10Containers_Plus_8Standalone': [
    ...prev10Containers,
    'LWC:engineer-workload-dashboard',
    'LWC:error-panel',
    'LWC:maintenance-request-kanban',
    'LWC:notification-center'
  ].sort() // which is actually all 14 strict roots!
};

// BFS traversal helper
const allowedEdgeTypes = new Set([
  'lwc-template-child', 'lwc-apex', 'method-call', 'instantiation',
  'type-reference', 'soql-object', 'soql-field', 'implements',
  'trigger-handler', 'trigger-object', 'generic-type', 'extends',
  'SOQL', 'DML', 'aura-enabled', 'lwc-import', 'field-reference',
  'trigger-on', 'visualforce-controller', 'event-publisher', 'unknown'
]);

function getProjection(sunId: string, maxDepth: number) {
  const visitedNodes = new Set<string>([sunId]);
  const visitedEdges = new Set<string>();
  let queue = [sunId];

  const adjMap = new Map<string, Edge[]>();
  data.edges.forEach(e => {
    if (allowedEdgeTypes.has(e.relationshipType)) {
      if (!adjMap.has(e.source)) adjMap.set(e.source, []);
      adjMap.get(e.source)!.push(e);
    }
  });

  let d = 0;
  while (queue.length > 0 && d < maxDepth) {
    const nextQ: string[] = [];
    for (const curr of queue) {
      const edges = adjMap.get(curr) || [];
      for (const e of edges) {
        visitedEdges.add(e.id);
        if (!visitedNodes.has(e.target)) {
          visitedNodes.add(e.target);
          nextQ.push(e.target);
        }
      }
    }
    queue = nextQ;
    d++;
  }
  return { visitedNodes, visitedEdges };
}

// Compute metrics for each set under Macro (1-hop) and Full (7-hop)
console.log('--- POLICY METRIC EVALUATION ---');

Object.entries(candidateSets).forEach(([setName, sunIds]) => {
  const sunSet = new Set(sunIds);
  const nonSunLwcs = lwcNodes.filter(n => !sunSet.has(n.id));

  // 1-hop union
  const nodes1HopUnion = new Set<string>();
  const edges1HopUnion = new Set<string>();
  // 7-hop union
  const nodes7HopUnion = new Set<string>();
  const edges7HopUnion = new Set<string>();

  const perSun1Hop = new Map<string, Set<string>>();
  const perSun7Hop = new Map<string, Set<string>>();

  sunIds.forEach(id => {
    const p1 = getProjection(id, 1);
    perSun1Hop.set(id, p1.visitedNodes);
    p1.visitedNodes.forEach(n => nodes1HopUnion.add(n));
    p1.visitedEdges.forEach(e => edges1HopUnion.add(e));

    const p7 = getProjection(id, 7);
    perSun7Hop.set(id, p7.visitedNodes);
    p7.visitedNodes.forEach(n => nodes7HopUnion.add(n));
    p7.visitedEdges.forEach(e => edges7HopUnion.add(e));
  });

  // Unique Apex nodes in 1-hop & 7-hop
  const apex1Hop = Array.from(nodes1HopUnion).filter(id => nodeMap.get(id)?.type === 'ApexClass');
  const apex7Hop = Array.from(nodes7HopUnion).filter(id => nodeMap.get(id)?.type === 'ApexClass');

  // Shared Apex hubs reached
  const sharedApex1Hop = apex1Hop.filter(id => {
    const consumers = data.edges.filter(e => e.target === id && lwcIds.has(e.source));
    return consumers.length >= 2;
  });

  // Direct child LWCs covered (in 1-hop composition or 1-hop dependency)
  const childLwcsCovered1Hop = Array.from(nodes1HopUnion).filter(id => lwcIds.has(id) && !sunSet.has(id));

  // LWC composition edges represented
  const compEdgesRepresented = compEdges.filter(e => sunSet.has(e.source) || nodes1HopUnion.has(e.source));

  // Bridge LWCs initially visible as Suns
  const bridgesVisibleAsSuns = strict3Bridges.filter(b => sunSet.has(b));
  const bridgesHidden = strict3Bridges.filter(b => !sunSet.has(b));

  // Leaf LWCs visible as Suns
  const leavesVisibleAsSuns = strict13Leaves.filter(l => sunSet.has(l));
  const leavesHidden = strict13Leaves.filter(l => !sunSet.has(l));

  // Isolated LWCs visible as Suns
  const standaloneVisibleAsSuns = strict8Standalone.filter(s => sunSet.has(s));

  // Calculate pairwise projection overlap for 1-hop
  let totalOverlapRatio = 0;
  let pairCount = 0;
  const sunList = Array.from(sunIds);
  for (let i = 0; i < sunList.length; i++) {
    for (let j = i + 1; j < sunList.length; j++) {
      const setA = perSun1Hop.get(sunList[i])!;
      const setB = perSun1Hop.get(sunList[j])!;
      const intersection = new Set([...setA].filter(x => setB.has(x)));
      const minSize = Math.min(setA.size, setB.size);
      if (minSize > 0) {
        totalOverlapRatio += intersection.size / minSize;
      }
      pairCount++;
    }
  }
  const avg1HopOverlap = pairCount > 0 ? (totalOverlapRatio / pairCount) : 0;

  console.log(`\n================ ${setName} (Suns: ${sunIds.length}) ================`);
  console.log(`Suns Count: ${sunIds.length}`);
  console.log(`Non-Sun LWCs: ${nonSunLwcs.length}`);
  console.log(`Bridges as Suns: ${bridgesVisibleAsSuns.length} (Hidden: ${bridgesHidden.length})`);
  console.log(`Leaves as Suns: ${leavesVisibleAsSuns.length} (Hidden: ${leavesHidden.length})`);
  console.log(`Standalone as Suns: ${standaloneVisibleAsSuns.length}`);
  console.log(`Direct Child LWCs Covered (1-Hop): ${childLwcsCovered1Hop.length}`);
  console.log(`Composition Edges Represented: ${compEdgesRepresented.length} / 19`);
  console.log(`1-Hop Macro Union Nodes: ${nodes1HopUnion.size} / 528`);
  console.log(`1-Hop Macro Union Edges: ${edges1HopUnion.size} / 2063`);
  console.log(`1-Hop Apex Classes Reached: ${apex1Hop.length}`);
  console.log(`1-Hop Shared Apex Hubs Reached: ${sharedApex1Hop.length} / 7`);
  console.log(`7-Hop Full Union Nodes: ${nodes7HopUnion.size} / 528`);
  console.log(`Average 1-Hop Pairwise Overlap: ${(avg1HopOverlap * 100).toFixed(2)}%`);
});
