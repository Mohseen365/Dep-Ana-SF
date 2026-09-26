import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { placeSatellites, isTriggerNode, isHandlerNode } from '../lib/layout/satellites';
import { computeArchitectureAnalysis } from '../lib/layout/analysis';
import { discoverFeatures } from '../lib/layout/features';
import { classifyNodeLayerWithReason } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import type { ExplorerDataSchema } from '../types/explorer';
import type { ArchitectureLayer } from '../lib/layout/types';

const fixturePath = resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = readFileSync(fixturePath, 'utf-8');
const rawParsed = JSON.parse(rawData);
const dataset = (rawParsed.data ? rawParsed.data : rawParsed) as ExplorerDataSchema;

describe('Stage 9 Satellite Placement Semantic Forensic Harness', () => {
  it('1. Search Radius Formula and Candidate Grid Explosion Analysis', () => {
    const counts = [1, 10, 50, 100, 250, 500, 1000, 2000];

    console.log('\n--- SEARCH RADIUS & GRID EXPLOSION MATRIX ---');
    console.log('Count | maxSearchRadius | Grid Width x Height | Total Candidate Slots');
    console.log('-------------------------------------------------------------------');

    for (const count of counts) {
      const maxSearchRadius = Math.max(12, Math.ceil(Math.sqrt(count) * 3));
      const width = 2 * maxSearchRadius + 1;
      const height = 2 * maxSearchRadius + 1;
      const totalSlots = width * height - 1; // excluding (0,0)

      console.log(
        `${count.toString().padStart(5)} | ` +
        `${maxSearchRadius.toString().padStart(15)} | ` +
        `${(width + 'x' + height).padStart(19)} | ` +
        `${totalSlots.toString().padStart(21)}`
      );
    }
  });

  it('2. Determinism and Input Order Invariance Analysis', () => {
    const nodes = dataset.nodes;
    const edges = dataset.edges;
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

    const fullResult1 = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });

    // Extract only primary production node positions
    const primaryPositions: Record<string, { x: number; y: number }> = {};
    for (const item of analysis.nodeList) {
      if (!item.isTest && !item.isField && !isTriggerNode(item) && !isHandlerNode(item)) {
        if (fullResult1.positions[item.nodeId]) {
          primaryPositions[item.nodeId] = fullResult1.positions[item.nodeId];
        }
      }
    }

    // Run Stage 9 repeatedly with identical inputs
    const run1 = placeSatellites(nodes, edges, analysis, primaryPositions, {
      featureMap,
    });

    const run2 = placeSatellites(nodes, edges, analysis, primaryPositions, {
      featureMap,
    });

    let maxRepeatedDrift = 0;
    for (const key of Object.keys(run1.positions)) {
      const p1 = run1.positions[key];
      const p2 = run2.positions[key];
      const drift = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      if (drift > maxRepeatedDrift) maxRepeatedDrift = drift;
    }
    expect(maxRepeatedDrift).toBe(0);

    // Test 2a: Shuffled input directly to placeSatellites without Stage 0 sorting
    const shuffledNodes = [...nodes].reverse();
    const shuffledEdges = [...edges].reverse();
    const shuffledAnalysis = computeArchitectureAnalysis(shuffledNodes, shuffledEdges);

    const runShuffledDirect = placeSatellites(shuffledNodes, shuffledEdges, shuffledAnalysis, primaryPositions, {
      featureMap,
    });

    let maxShuffledDirectDrift = 0;
    for (const key of Object.keys(run1.positions)) {
      const p1 = run1.positions[key];
      const p2 = runShuffledDirect.positions[key];
      if (p2) {
        const drift = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        if (drift > maxShuffledDirectDrift) maxShuffledDirectDrift = drift;
      }
    }

    // Test 2b: Full pipeline execution with Stage 0 sorting
    const fullResultShuffled = computeArchitectureLayoutWithMetadata(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });
    let maxPipelineShuffledDrift = 0;
    for (const key of Object.keys(fullResult1.positions)) {
      const p1 = fullResult1.positions[key];
      const p2 = fullResultShuffled.positions[key];
      if (p2) {
        const drift = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        if (drift > maxPipelineShuffledDrift) maxPipelineShuffledDrift = drift;
      }
    }

    console.log(`[FORENSIC] Primary Production Nodes Count: ${Object.keys(primaryPositions).length}`);
    console.log(`[FORENSIC] Repeated Execution Max Drift: ${maxRepeatedDrift.toFixed(5)} px`);
    console.log(`[FORENSIC] Direct placeSatellites Shuffled Input Max Drift: ${maxShuffledDirectDrift.toFixed(5)} px (Input Order Sensitive)`);
    console.log(`[FORENSIC] Full Pipeline (Stage 0 Sorted) Shuffled Input Max Drift: ${maxPipelineShuffledDrift.toFixed(5)} px (Input Order Invariant)`);

    expect(maxRepeatedDrift).toBe(0);
    expect(maxPipelineShuffledDrift).toBe(0);
  });

  it('3. Stage 9 Internal Work & Locality Telemetry', () => {
    const nodes = dataset.nodes;
    const edges = dataset.edges;
    const analysis = computeArchitectureAnalysis(nodes, edges);

    const fullResult = computeArchitectureLayoutWithMetadata(nodes, edges, { enableFeatureLayout: true });

    // Filter primary positions
    const primaryPositions: Record<string, { x: number; y: number }> = {};
    for (const item of analysis.nodeList) {
      if (!item.isTest && !item.isField && !isTriggerNode(item) && !isHandlerNode(item)) {
        if (fullResult.positions[item.nodeId]) {
          primaryPositions[item.nodeId] = fullResult.positions[item.nodeId];
        }
      }
    }

    const satResult = placeSatellites(nodes, edges, analysis, primaryPositions);

    console.log('[SAT RESULT] Primary Nodes:', Object.keys(primaryPositions).length);
    console.log('[SAT RESULT] Placed Tests:', satResult.placedTestsCount);
    console.log('[SAT RESULT] Placed Fields:', satResult.placedFieldsCount);
    console.log('[SAT RESULT] Placed Microclusters:', satResult.placedMicroclusterCount);
    console.log('[SAT RESULT] Total Satellite Positions:', Object.keys(satResult.satellitePositions).length);

    expect(Object.keys(satResult.satellitePositions).length).toBe(
      satResult.placedTestsCount + satResult.placedFieldsCount + satResult.placedMicroclusterCount
    );
  });

  it('4. Correctness Baseline & Regression Validation', () => {
    const fullResult = computeArchitectureLayoutWithMetadata(dataset.nodes, dataset.edges, {
      enableFeatureLayout: true,
    });
    const evalMetrics = evaluateLayout(dataset.nodes, dataset.edges, fullResult.positions);

    const cpp = evalMetrics.detailedCrossings?.primaryPrimaryCrossings;
    console.log('[BASELINE] Primary Crossings (Cpp):', cpp);
    console.log('[BASELINE] Total Crossings (Ctotal):', evalMetrics.edgeCrossingCount);
    console.log('[BASELINE] Min Clearance:', evalMetrics.minClearance);
    console.log('[BASELINE] Primary Overlaps:', evalMetrics.primaryOverlapCount);
    console.log('[BASELINE] Satellite Overlaps:', evalMetrics.satelliteOverlapCount);
    console.log('[BASELINE] Layer Violations:', evalMetrics.layerViolationCount);

    expect(cpp).toBeLessThanOrEqual(9335);
    expect(evalMetrics.edgeCrossingCount).toBeLessThanOrEqual(95000);
    expect(evalMetrics.primaryOverlapCount).toBe(0);
    expect(evalMetrics.satelliteOverlapCount).toBe(0);
    expect(evalMetrics.layerViolationCount).toBe(0);
    expect(evalMetrics.minClearance).toBeGreaterThanOrEqual(39.99);
  });
});
