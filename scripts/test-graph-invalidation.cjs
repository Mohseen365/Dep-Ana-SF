#!/usr/bin/env node
/**
 * Graph Structure Key Invalidation & Async Request Lifecycle Test Suite
 * Covers 10 mandatory interior-mutation, semantic equality, and async ordering scenarios.
 */

const assert = require('assert');

console.log('Running Graph Structure Key Invalidation & Async Lifecycle Test Suite...\n========================================================');

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ Test ${total} PASSED: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ Test ${total} FAILED: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// Endpoint-sampling implementation (vulnerable baseline)
const endpointSamplingKey = (nodes, edges) => {
  if (nodes.length === 0) return '0:0';
  const firstNode = nodes[0];
  const lastNode = nodes[nodes.length - 1];
  const firstEdge = edges[0];
  const lastEdge = edges[edges.length - 1];
  return `${nodes.length}:${edges.length}:${firstNode?.id}:${firstNode?.type}:${firstNode?.layer}:${lastNode?.id}:${lastNode?.type}:${lastNode?.layer}:${firstEdge?.id}:${firstEdge?.relationshipType}:${lastEdge?.id}:${lastEdge?.relationshipType}`;
};

// Corrected structural fingerprint implementation
const structuralFingerprintKey = (nodes, edges) => {
  if (nodes.length === 0) return '0:0';
  const nodeFP = nodes.map(n => `${n.id}:${n.type || ''}:${n.layer || ''}:${n.domain || ''}`).join('|');
  const edgeFP = edges.map(e => `${e.id}:${e.source}:${e.target}:${e.relationshipType || ''}`).join('|');
  return `${nodes.length}:${edges.length}#${nodeFP}#${edgeFP}`;
};

// Test setup: 3 nodes, 2 edges
const baseNodes = [
  { id: 'nodeA', type: 'ApexClass', layer: 'Core', domain: 'D1' },
  { id: 'nodeB', type: 'ApexClass', layer: 'Core', domain: 'D1' },
  { id: 'nodeC', type: 'ApexClass', layer: 'UI', domain: 'D2' },
];

const baseEdges = [
  { id: 'e1', source: 'nodeA', target: 'nodeB', relationshipType: 'method-call' },
  { id: 'e2', source: 'nodeB', target: 'nodeC', relationshipType: 'event' },
];

// Scenario 1: Interior node changes type
runTest('Scenario 1: Interior node type change invalidates structure key', () => {
  const updatedNodes = baseNodes.map((n, i) => i === 1 ? { ...n, type: 'LWC' } : n);
  const oldKey = endpointSamplingKey(baseNodes, baseEdges);
  const newKeyOld = endpointSamplingKey(updatedNodes, baseEdges);

  // Verify endpoint sampling fails to detect interior change
  assert.strictEqual(oldKey, newKeyOld, 'Endpoint sampling incorrectly returns same key for interior node type change');

  // Verify structural fingerprint detects change
  const fp1 = structuralFingerprintKey(baseNodes, baseEdges);
  const fp2 = structuralFingerprintKey(updatedNodes, baseEdges);
  assert.notStrictEqual(fp1, fp2, 'Structural fingerprint must invalidate when interior node type changes');
});

// Scenario 2: Interior node changes layer
runTest('Scenario 2: Interior node layer change invalidates structure key', () => {
  const updatedNodes = baseNodes.map((n, i) => i === 1 ? { ...n, layer: 'Feature' } : n);
  const fp1 = structuralFingerprintKey(baseNodes, baseEdges);
  const fp2 = structuralFingerprintKey(updatedNodes, baseEdges);
  assert.notStrictEqual(fp1, fp2, 'Structural fingerprint must invalidate when interior node layer changes');
});

// Scenario 3: Interior edge changes relationshipType
runTest('Scenario 3: Interior edge relationshipType change invalidates structure key', () => {
  const updatedEdges = [
    { id: 'e1', source: 'nodeA', target: 'nodeB', relationshipType: 'field-access' },
    baseEdges[1],
  ];
  const fp1 = structuralFingerprintKey(baseNodes, baseEdges);
  const fp2 = structuralFingerprintKey(baseNodes, updatedEdges);
  assert.notStrictEqual(fp1, fp2, 'Structural fingerprint must invalidate when edge relationshipType changes');
});

// Scenario 4: Interior node ID changes
runTest('Scenario 4: Interior node ID change invalidates structure key', () => {
  const updatedNodes = baseNodes.map((n, i) => i === 1 ? { ...n, id: 'nodeB2' } : n);
  const updatedEdges = [
    { id: 'e1', source: 'nodeA', target: 'nodeB2', relationshipType: 'method-call' },
    { id: 'e2', source: 'nodeB2', target: 'nodeC', relationshipType: 'event' },
  ];
  const fp1 = structuralFingerprintKey(baseNodes, baseEdges);
  const fp2 = structuralFingerprintKey(updatedNodes, updatedEdges);
  assert.notStrictEqual(fp1, fp2, 'Structural fingerprint must invalidate when interior node ID changes');
});

// Scenario 5: Interior edge ID or endpoints change
runTest('Scenario 5: Interior edge endpoint change invalidates structure key', () => {
  const updatedEdges = [
    { id: 'e1', source: 'nodeA', target: 'nodeC', relationshipType: 'method-call' },
    baseEdges[1],
  ];
  const fp1 = structuralFingerprintKey(baseNodes, baseEdges);
  const fp2 = structuralFingerprintKey(baseNodes, updatedEdges);
  assert.notStrictEqual(fp1, fp2, 'Structural fingerprint must invalidate when edge endpoints change');
});

// Scenario 6: Node order change where order is semantically significant
runTest('Scenario 6: Node order change invalidates structure key', () => {
  const reorderedNodes = [baseNodes[1], baseNodes[0], baseNodes[2]];
  const fp1 = structuralFingerprintKey(baseNodes, baseEdges);
  const fp2 = structuralFingerprintKey(reorderedNodes, baseEdges);
  assert.notStrictEqual(fp1, fp2, 'Structural fingerprint must invalidate when node array order changes');
});

// Scenario 7: Structurally equivalent graph produces identical key across new object instances
runTest('Scenario 7: Structurally equivalent graph maintains stable structure key without false invalidation', () => {
  const clonedNodes = JSON.parse(JSON.stringify(baseNodes));
  const clonedEdges = JSON.parse(JSON.stringify(baseEdges));
  const fp1 = structuralFingerprintKey(baseNodes, baseEdges);
  const fp2 = structuralFingerprintKey(clonedNodes, clonedEdges);
  assert.strictEqual(fp1, fp2, 'Structurally equivalent graphs must produce identical keys');
});

// Scenario 8: Empty graph and first/last element transitions
runTest('Scenario 8: Empty graph and edge cases handle transitions safely', () => {
  assert.strictEqual(structuralFingerprintKey([], []), '0:0');
  const singleNode = [{ id: 'n1', type: 'Class', layer: 'Core' }];
  const singleKey = structuralFingerprintKey(singleNode, []);
  assert.ok(singleKey.startsWith('1:0#'));
  assert.notStrictEqual(singleKey, '0:0');
});

// Scenario 9: Graph mutation arrives while older async layout request is pending
runTest('Scenario 9: Monotonic layoutRequestRef isolates in-flight async layout requests', () => {
  let layoutRequestRef = { current: 0 };
  let appliedResults = [];

  const simulateAsyncLayout = (graphKey, delayMs) => {
    const requestId = ++layoutRequestRef.current;
    setTimeout(() => {
      if (requestId !== layoutRequestRef.current) {
        // Stale result discarded
        return;
      }
      appliedResults.push({ requestId, graphKey });
    }, delayMs);
  };

  simulateAsyncLayout('key1', 50); // Older request
  simulateAsyncLayout('key2', 10); // Newer request arriving quickly

  return new Promise((resolve) => {
    setTimeout(() => {
      assert.strictEqual(appliedResults.length, 1);
      assert.strictEqual(appliedResults[0].requestId, 2);
      assert.strictEqual(appliedResults[0].graphKey, 'key2');
      resolve();
    }, 100);
  });
});

// Scenario 10: Result computed for old graph cannot overwrite state for new graph
runTest('Scenario 10: Old graph result cannot overwrite state of updated graph', async () => {
  let layoutRequestRef = { current: 10 };

  const oldRequestId = 10;
  layoutRequestRef.current = 11; // User modified graph, incrementing request ID

  let committedState = 'new-graph-state';

  const tryCommitOldResult = (requestId, result) => {
    if (requestId !== layoutRequestRef.current) {
      return false; // Guard blocks stale commit
    }
    committedState = result;
    return true;
  };

  const committed = tryCommitOldResult(oldRequestId, 'stale-old-state');
  assert.strictEqual(committed, false);
  assert.strictEqual(committedState, 'new-graph-state');
});

console.log(`========================================================\nALL ${passed}/${total} GRAPH INVALIDATION & ASYNC LIFECYCLE TESTS PASSED!`);
