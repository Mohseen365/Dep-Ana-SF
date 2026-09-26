import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import { reduceEdgeCrossings } from '../lib/layout/ordering';

function analyzeInvocationMultiplicityAndFingerprints(nodes: ExplorerNode[], edges: ExplorerEdge[]) {
  // Run actual reduceEdgeCrossings to get result and iteration count
  const orderingResult = reduceEdgeCrossings({ nodes, edges });

  // Record total calls and iteration details
  const totalCalls = 1 + orderingResult.iterationsExecuted;

  const fingerprints: string[] = [];
  orderingResult.bucketOrder.forEach((nodeIds, key) => {
    fingerprints.push(`${key}:${nodeIds.join(',')}`);
  });
  const fullOrderFingerprint = Array.from(orderingResult.bucketOrder.entries())
    .map(([k, ids]) => `${k}=${ids.join(',')}`)
    .sort()
    .join('|');

  return {
    totalCalls,
    iterationsExecuted: orderingResult.iterationsExecuted,
    estimatedCrossings: orderingResult.estimatedCrossings,
    regionsCount: orderingResult.regions.length,
    fullOrderFingerprintLength: fullOrderFingerprint.length,
  };
}

describe('Invocation Multiplicity & Duplicate-Work Fingerprint Analysis', () => {
  it('analyzes invocation multiplicity on CST fixture', () => {
    const cstPath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const cstData = JSON.parse(fs.readFileSync(cstPath, 'utf-8'));

    const result = analyzeInvocationMultiplicityAndFingerprints(cstData.nodes, cstData.edges);

    console.log('\n--- INVOCATION MULTIPLICITY & DUP ANALYSIS: CST ---');
    console.log(`  Total Crossing Calls per Stage 6 Run : ${result.totalCalls}`);
    console.log(`  Iterations Executed                   : ${result.iterationsExecuted}`);
    console.log(`  Final Estimated Crossings             : ${result.estimatedCrossings}`);
    console.log(`  Regions Count                         : ${result.regionsCount}`);
    console.log('---------------------------------------------------\n');

    expect(result.totalCalls).toBe(9);
  });

  it('analyzes invocation multiplicity on 5,000 node graph', () => {
    const graph = generateSyntheticSalesforceGraph({ nodeCount: 5000, seed: 42, componentCount: 3 });

    const result = analyzeInvocationMultiplicityAndFingerprints(graph.nodes, graph.edges);

    console.log('\n--- INVOCATION MULTIPLICITY & DUP ANALYSIS: 5,000 Nodes ---');
    console.log(`  Total Crossing Calls per Stage 6 Run : ${result.totalCalls}`);
    console.log(`  Iterations Executed                   : ${result.iterationsExecuted}`);
    console.log(`  Final Estimated Crossings             : ${result.estimatedCrossings}`);
    console.log('------------------------------------------------------------\n');

    expect(result.totalCalls).toBe(9);
  });
});
