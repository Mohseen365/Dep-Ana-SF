import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { placeSatellites, isTriggerNode, isHandlerNode } from '../lib/layout/satellites';
import { computeArchitectureAnalysis, findParentProductionNodeId, findParentObjectId } from '../lib/layout/analysis';
import { discoverFeatures } from '../lib/layout/features';
import { classifyNodeLayerWithReason } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import type { ExplorerDataSchema, ExplorerEdge } from '../types/explorer';
import type { ArchitectureLayer } from '../lib/layout/types';

const fixturePath = resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = readFileSync(fixturePath, 'utf-8');
const rawParsed = JSON.parse(rawData);
const canonicalDataset = (rawParsed.data ? rawParsed.data : rawParsed) as ExplorerDataSchema;

function deduplicateEdges(edges: ExplorerEdge[]): ExplorerEdge[] {
  const seen = new Set<string>();
  const result: ExplorerEdge[] = [];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    let edgeId = e.id;
    if (seen.has(edgeId)) {
      edgeId = `${e.id}_dedup_${i}`;
    }
    seen.add(edgeId);
    result.push({ ...e, id: edgeId });
  }
  return result;
}

describe('Stage 9 State, Reuse and Call Topology Forensic Investigation', () => {
  it('1. Scale Tier Invocation & Repeated-Work Instrumentation', () => {
    const tier2 = generateSyntheticSalesforceGraph({ nodeCount: 500, seed: 101 });
    const tier3 = generateSyntheticSalesforceGraph({ nodeCount: 1000, seed: 102 });
    const tier4 = generateSyntheticSalesforceGraph({ nodeCount: 2000, seed: 103 });

    const scaleMatrix = [
      { name: 'Canonical', nodes: canonicalDataset.nodes, edges: canonicalDataset.edges },
      { name: 'Tier 2 (500N)', nodes: tier2.nodes, edges: deduplicateEdges(tier2.edges) },
      { name: 'Tier 3 (1,000N)', nodes: tier3.nodes, edges: deduplicateEdges(tier3.edges) },
      { name: 'Tier 4 (2,000N)', nodes: tier4.nodes, edges: deduplicateEdges(tier4.edges) },
    ];

    console.log('\n--- STAGE 9 SCALE TIER INVOCATION & REPEATED WORK METRICS ---');

    for (const tier of scaleMatrix) {
      const { nodes, edges } = tier;
      const analysis = computeArchitectureAnalysis(nodes, edges);

      // Count node classifications
      let isTestCount = 0;
      let isFieldCount = 0;
      let isTriggerCount = 0;
      let isHandlerCount = 0;

      for (const item of analysis.nodeList) {
        if (item.isTest) isTestCount++;
        if (item.isField) isFieldCount++;
        if (isTriggerNode(item)) isTriggerCount++;
        if (isHandlerNode(item)) isHandlerCount++;
      }

      // Parent lookup call counts
      let parentObjectLookupCalls = 0;
      let parentProdLookupCalls = 0;

      for (const item of analysis.nodeList) {
        if (item.isField) {
          parentObjectLookupCalls++;
          findParentObjectId(item.node, nodes, edges);
        }
        if (item.isTest) {
          parentProdLookupCalls++;
          findParentProductionNodeId(item.node, nodes, edges);
        }
      }

      console.log(`\nTier: ${tier.name} (${nodes.length} Nodes, ${edges.length} Edges)`);
      console.log(`  Total Nodes in Analysis          : ${analysis.nodeList.length}`);
      console.log(`  Classification Counts            : Test=${isTestCount}, Field=${isFieldCount}, Trigger=${isTriggerCount}, Handler=${isHandlerCount}`);
      console.log(`  Classification Evaluations       : ${analysis.nodeList.length * 4}`);
      console.log(`  Parent Object Lookup Calls       : ${parentObjectLookupCalls}`);
      console.log(`  Parent Prod Node Lookup Calls    : ${parentProdLookupCalls}`);
    }
  });

  it('2. Call Topology Details for Canonical Dataset', () => {
    const nodes = canonicalDataset.nodes;
    const edges = canonicalDataset.edges;
    const analysis = computeArchitectureAnalysis(nodes, edges);

    const layerMap = new Map<string, ArchitectureLayer>();
    nodes.forEach(node => {
      layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
    });

    const domainDiscovery = discoverDomains(nodes, edges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) => {
      domainMap.set(nodeId, assignment.primaryDomain);
    });

    const featureDiscovery = discoverFeatures(nodes, edges, { analysis, layerMap, domainMap });
    const featureMap = new Map<string, string>();
    featureDiscovery.assignments.forEach((assignment, nodeId) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });

    const fullResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });

    const primaryPositions: Record<string, { x: number; y: number }> = {};
    const primaryNodeIds = new Set<string>();
    for (const item of analysis.nodeList) {
      if (!item.isTest && !item.isField && !isTriggerNode(item) && !isHandlerNode(item)) {
        if (fullResult.positions[item.nodeId]) {
          primaryPositions[item.nodeId] = fullResult.positions[item.nodeId];
          primaryNodeIds.add(item.nodeId);
        }
      }
    }

    // Pre-build primary segments count
    let primarySegmentsCount = 0;
    for (const e of edges) {
      if (primaryNodeIds.has(e.source) && primaryNodeIds.has(e.target)) {
        if (primaryPositions[e.source] && primaryPositions[e.target]) {
          primarySegmentsCount++;
        }
      }
    }

    // Categorize satellites and groups
    const triggerNodes: string[] = [];
    const handlerNodes: string[] = [];
    const fieldsByParent = new Map<string, string[]>();
    const unanchoredFields: string[] = [];
    const testsByTarget = new Map<string, string[]>();
    const unanchoredTests: string[] = [];

    for (const item of analysis.nodeList) {
      if (primaryNodeIds.has(item.nodeId)) continue;

      if (item.isTest) {
        const targetId = item.parentProductionNodeId || findParentProductionNodeId(item.node, nodes, edges);
        if (targetId && primaryPositions[targetId]) {
          if (!testsByTarget.has(targetId)) testsByTarget.set(targetId, []);
          testsByTarget.get(targetId)!.push(item.nodeId);
        } else {
          unanchoredTests.push(item.nodeId);
        }
      } else if (item.isField) {
        const parentId = item.parentObjectId || findParentObjectId(item.node, nodes, edges);
        if (parentId && primaryPositions[parentId]) {
          if (!fieldsByParent.has(parentId)) fieldsByParent.set(parentId, []);
          fieldsByParent.get(parentId)!.push(item.nodeId);
        } else {
          unanchoredFields.push(item.nodeId);
        }
      } else if (isTriggerNode(item)) {
        triggerNodes.push(item.nodeId);
      } else if (isHandlerNode(item)) {
        handlerNodes.push(item.nodeId);
      }
    }

    console.log('\n--- CANONICAL CALL TOPOLOGY SUMMARY ---');
    console.log(`Primary Production Nodes (Locked Anchors): ${Object.keys(primaryPositions).length}`);
    console.log(`Primary Segments Count (S0 Immutable)    : ${primarySegmentsCount}`);
    console.log(`Trigger Microcluster Invocations         : ${triggerNodes.length}`);
    console.log(`Handler Microcluster Invocations         : ${handlerNodes.length}`);
    console.log(`Field Parent Groups Invocations          : ${fieldsByParent.size} (Total Anchored Fields: ${Array.from(fieldsByParent.values()).reduce((a, b) => a + b.length, 0)})`);
    console.log(`Unanchored Field Invocations             : ${unanchoredFields.length > 0 ? 1 : 0} (Count: ${unanchoredFields.length})`);
    console.log(`Test Target Groups Invocations           : ${testsByTarget.size} (Total Anchored Tests: ${Array.from(testsByTarget.values()).reduce((a, b) => a + b.length, 0)})`);
    console.log(`Unanchored Test Invocations              : ${unanchoredTests.length > 0 ? 1 : 0} (Count: ${unanchoredTests.length})`);

    const totalSlotCalls =
      triggerNodes.length +
      handlerNodes.length +
      fieldsByParent.size +
      (unanchoredFields.length > 0 ? 1 : 0) +
      testsByTarget.size +
      (unanchoredTests.length > 0 ? 1 : 0);

    console.log(`TOTAL generateSatelliteSlots Invocations  : ${totalSlotCalls}`);
  });

  it('3. Deterministic Validation Across 5 Repeated Executions', () => {
    const nodes = canonicalDataset.nodes;
    const edges = canonicalDataset.edges;

    const baselineResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
    const baselineEval = evaluateLayout(nodes, edges, baselineResult.positions);

    for (let run = 1; run <= 5; run++) {
      const res = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });
      const ev = evaluateLayout(nodes, edges, res.positions);

      let maxDrift = 0;
      for (const id of Object.keys(baselineResult.positions)) {
        const p1 = baselineResult.positions[id];
        const p2 = res.positions[id];
        const drift = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        if (drift > maxDrift) maxDrift = drift;
      }

      expect(maxDrift).toBe(0);
      expect(ev.detailedCrossings?.primaryPrimaryCrossings).toBe(baselineEval.detailedCrossings?.primaryPrimaryCrossings);
      expect(ev.edgeCrossingCount).toBe(baselineEval.edgeCrossingCount);
      expect(ev.primaryOverlapCount).toBe(0);
      expect(ev.satelliteOverlapCount).toBe(0);
      expect(ev.layerViolationCount).toBe(0);
      expect(ev.minClearance).toBe(baselineEval.minClearance);
    }

    console.log('[DETERMINISM] 5 Repeated Runs Verified - 0.00000 px Drift');
  });

  it('4. 50 Scenario Seeds State Invariant Validation', () => {
    let scenariosPassed = 0;

    for (let seed = 201; seed <= 250; seed++) {
      const scenarioRaw = generateSyntheticSalesforceGraph({ nodeCount: 20 + (seed % 15), seed });
      const scenario = { nodes: scenarioRaw.nodes, edges: deduplicateEdges(scenarioRaw.edges) };
      const analysis = computeArchitectureAnalysis(scenario.nodes, scenario.edges);

      const layout = computeArchitectureLayoutWithMetadata(scenario.nodes, scenario.edges, { enableFeatureLayout: true });
      const primaryPositions: Record<string, { x: number; y: number }> = {};

      for (const item of analysis.nodeList) {
        if (!item.isTest && !item.isField && !isTriggerNode(item) && !isHandlerNode(item)) {
          if (layout.positions[item.nodeId]) {
            primaryPositions[item.nodeId] = layout.positions[item.nodeId];
          }
        }
      }

      const runA = placeSatellites(scenario.nodes, scenario.edges, analysis, primaryPositions);
      const runB = placeSatellites(scenario.nodes, scenario.edges, analysis, primaryPositions);

      let drift = 0;
      for (const k of Object.keys(runA.positions)) {
        const d = Math.sqrt(
          Math.pow(runA.positions[k].x - runB.positions[k].x, 2) +
          Math.pow(runA.positions[k].y - runB.positions[k].y, 2)
        );
        if (d > drift) drift = d;
      }

      expect(drift).toBe(0);
      scenariosPassed++;
    }

    console.log(`[SCENARIO SEEDS] ${scenariosPassed}/50 Deterministic Scenarios PASSED (0.00000 px drift)`);
  });
});
