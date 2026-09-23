import fs from 'fs';
import path from 'path';
import { computeArchitectureLayout } from '../../../explorer/src/lib/architecture-layout';
import { ExplorerNode, ExplorerEdge } from '../../../explorer/src/types/explorer';

function makeNode(id: string, type: string = 'ApexClass'): ExplorerNode {
  return {
    id,
    displayName: id,
    type,
    file: `classes/${id}.cls`,
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    risk: 'LOW',
    riskReasons: [],
    behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
  };
}

console.log('--- T-04 ADVERSARIAL CHECKS ---');

// 1. Empty graph
try {
  const resEmpty = computeArchitectureLayout([], [], { enableFeatureLayout: true });
  console.log('Empty graph result:', resEmpty, 'Keys count:', Object.keys(resEmpty).length);
} catch (e: any) {
  console.log('Empty graph ERROR:', e.message);
}

// 2. Single node
try {
  const resSingle = computeArchitectureLayout([makeNode('NodeA')], [], { enableFeatureLayout: true });
  console.log('Single node result:', resSingle);
} catch (e: any) {
  console.log('Single node ERROR:', e.message);
}

// 3. Fully connected graph (4 nodes)
try {
  const nodesFC = ['A', 'B', 'C', 'D'].map(id => makeNode(id));
  const edgesFC: ExplorerEdge[] = [
    { id: 'e1', source: 'A', target: 'B', type: 'calls' },
    { id: 'e2', source: 'A', target: 'C', type: 'calls' },
    { id: 'e3', source: 'A', target: 'D', type: 'calls' },
    { id: 'e4', source: 'B', target: 'C', type: 'calls' },
    { id: 'e5', source: 'B', target: 'D', type: 'calls' },
    { id: 'e6', source: 'C', target: 'D', type: 'calls' },
  ];
  const resFC = computeArchitectureLayout(nodesFC, edgesFC, { enableFeatureLayout: true });
  console.log('Fully connected graph (4 nodes) result:', resFC);
} catch (e: any) {
  console.log('Fully connected ERROR:', e.message);
}

// 4. Graph with 0 edges (3 nodes)
try {
  const nodes0E = ['A', 'B', 'C'].map(id => makeNode(id));
  const res0E = computeArchitectureLayout(nodes0E, [], { enableFeatureLayout: true });
  console.log('0 Edges graph result:', res0E);
} catch (e: any) {
  console.log('0 Edges ERROR:', e.message);
}

// 5. Graph with self-loops
try {
  const nodeSL = makeNode('A');
  const edgeSL: ExplorerEdge = { id: 'e1', source: 'A', target: 'A', type: 'calls' };
  const resSL = computeArchitectureLayout([nodeSL], [edgeSL], { enableFeatureLayout: true });
  console.log('Self-loop graph result:', resSL);
} catch (e: any) {
  console.log('Self-loop ERROR:', e.message);
}

console.log('\n--- T-05 REGRESSION PROTECTION SIMULATION ---');
// Simulate in-memory coordinate regression detection
const fixturePath = path.resolve('audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const realPositions = computeArchitectureLayout(rawData.nodes, rawData.edges, { enableFeatureLayout: false });

// Simulate regression by shifting one coordinate by +10.0px
const regressedPositions = { ...realPositions, [rawData.nodes[0].id]: { x: realPositions[rawData.nodes[0].id].x + 10, y: realPositions[rawData.nodes[0].id].y } };

let detected = false;
for (const node of rawData.nodes) {
  const expected = realPositions[node.id];
  const actual = regressedPositions[node.id];
  if (Math.abs(expected.x - actual.x) > 0.00001 || Math.abs(expected.y - actual.y) > 0.00001) {
    detected = true;
    console.log(`Regression caught on node ${node.id}: expected (${expected.x}, ${expected.y}), actual (${actual.x}, ${actual.y})`);
    break;
  }
}
console.log('Regression detection verification result:', detected ? 'PASS (Caught)' : 'FAIL');
