import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout, computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import {
  calculateFeatureLocalityDiagnostics,
  primaryNodeOverlapCount,
  satelliteNodeOverlapCount,
  minimumNodeClearance,
} from '../lib/layout/metrics';
import { discoverFeatures } from '../lib/layout/features';
import { classifyNodeLayer, classifyNodeLayerWithReason } from '../lib/layout/layers';
import { computeFeatureLayerYMap, buildDomainGraph } from '../lib/layout/global-layout';
import type { ArchitectureLayer } from '../lib/layout/types';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification } from '../lib/layout/analysis';
import { discoverDomains } from '../lib/layout/domains';

const cloudSpendFixturePath = path.resolve(
  __dirname,
  '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);
const cloudSpendRaw = fs.readFileSync(cloudSpendFixturePath, 'utf8');
const cloudSpendData = JSON.parse(cloudSpendRaw);
const cloudSpendNodes: ExplorerNode[] = cloudSpendData.nodes;
const cloudSpendEdges: ExplorerEdge[] = cloudSpendData.edges;

describe('Phase 6-B — Feature Locality & Adaptive Vertical Compaction', () => {
  it('1. Verifies strict architectural layer hierarchy preservation (Y_presentation < Y_application < Y_domain < Y_schema)', () => {
    const layoutResult = computeArchitectureLayoutWithMetadata(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const safeNodes = [...cloudSpendNodes].sort((a, b) => a.id.localeCompare(b.id));
    const safeEdges = [...cloudSpendEdges].sort((a, b) => a.id.localeCompare(b.id));
    const index = createLayoutGraphIndex(safeNodes, safeEdges);
    let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
    const layerMap = new Map();
    safeNodes.forEach(node => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
    analysis = applyLayerClassification(analysis, layerMap);
    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map();
    domainDiscovery.assignments.forEach((assignment, nodeId) => domainMap.set(nodeId, assignment.primaryDomain));
    analysis = applyDomainClassification(analysis, domainMap);

    const discovery = discoverFeatures(safeNodes, safeEdges, { index, analysis, layerMap, domainMap });

    const featureMap = new Map<string, string>();
    discovery.assignments.forEach((assignment, nodeId) => {
      featureMap.set(nodeId, assignment.primaryFeatureId);
    });

    const featureGraph = buildDomainGraph(safeNodes, safeEdges, undefined, index, featureMap);
    const featureYMap = computeFeatureLayerYMap(safeNodes, safeEdges, featureGraph, {
      analysis,
      index,
      featureMap,
      featureRegions: layoutResult.featureRegions,
    });

    let transitionPairs = 0;
    let violations = 0;

    discovery.featureList.forEach(cluster => {
      const featureId = cluster.id;
      const yMap = featureYMap[featureId];
      if (!yMap) return;

      const primaryMembers = cluster.primaryNodeIds;
      const layersSet = new Set<ArchitectureLayer>();
      primaryMembers.forEach(id => {
        const node = cloudSpendNodes.find(n => n.id === id);
        if (node) {
          layersSet.add(classifyNodeLayer(node));
        }
      });

      const layersPresent = ['presentation', 'application', 'domain', 'schema'].filter(l =>
        layersSet.has(l as ArchitectureLayer)
      );

      for (let i = 0; i < layersPresent.length - 1; i++) {
        const lUpper = layersPresent[i] as ArchitectureLayer;
        const lLower = layersPresent[i + 1] as ArchitectureLayer;

        if (yMap[lUpper] > yMap[lLower]) {
          violations++;
        }
        transitionPairs++;
      }
    });

    expect(discovery.featureList.length).toBe(11);
    expect(layoutResult.featureRegions?.size).toBe(13);
    expect(transitionPairs).toBe(3);
    expect(violations).toBe(0);

    const metrics = evaluateLayout(cloudSpendNodes, cloudSpendEdges, layoutResult.positions);
    expect(metrics.layerViolationCount).toBe(0);
  });

  it('2. Evaluates feature-local compact spacing and verifies final coordinate locality metrics', () => {
    const posCompact = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
      layerSpacing: 60,
    });

    const posBaseline = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
      layerSpacing: 250,
    });

    const localityCompact = calculateFeatureLocalityDiagnostics(cloudSpendNodes, cloudSpendEdges, posCompact);
    const localityBaseline = calculateFeatureLocalityDiagnostics(cloudSpendNodes, cloudSpendEdges, posBaseline);

    expect(localityCompact.medianIntraFeatureEdgeLength).toBeLessThanOrEqual(localityBaseline.medianIntraFeatureEdgeLength);
    expect(localityCompact.medianIntraFeatureEdgeLength).toBeGreaterThan(0);
    expect(localityCompact.medianInterFeatureEdgeLength).toBeGreaterThan(0);
  });

  it('3. Guarantees zero primary and satellite overlaps with minimum clearance >= 40px', () => {
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const primaryOverlaps = primaryNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, positions);
    const satelliteOverlaps = satelliteNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, positions);
    const clearance = minimumNodeClearance(cloudSpendNodes, cloudSpendEdges, positions);

    expect(primaryOverlaps).toBe(0);
    expect(satelliteOverlaps).toBe(0);
    expect(clearance).toBeGreaterThanOrEqual(40.0);
  });

  it('4. Enforces 0.00000 px determinism drift across 10 repeat executions and 5 input order shuffles', { timeout: 20000 }, () => {
    const posBase = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    // 10 Repeated Runs
    for (let r = 0; r < 10; r++) {
      const posRepeat = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
        enableFeatureLayout: true,
      });
      cloudSpendNodes.forEach(n => {
        expect(posRepeat[n.id].x).toBe(posBase[n.id].x);
        expect(posRepeat[n.id].y).toBe(posBase[n.id].y);
      });
    }

    // 5 Shuffled Input Orders
    for (let s = 1; s <= 5; s++) {
      const shufNodes = [...cloudSpendNodes].sort((a, b) => (s % 2 === 0 ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)));
      const shufEdges = [...cloudSpendEdges].sort((a, b) => (s % 2 === 0 ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)));
      const posShuf = computeArchitectureLayout(shufNodes, shufEdges, {
        enableFeatureLayout: true,
      });
      cloudSpendNodes.forEach(n => {
        expect(posShuf[n.id].x).toBe(posBase[n.id].x);
        expect(posShuf[n.id].y).toBe(posBase[n.id].y);
      });
    }
  });

  it('5. Verifies legacy path immutability when enableFeatureLayout = false', () => {
    const posDefault = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges);
    const posExplicitFalse = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: false,
    });

    cloudSpendNodes.forEach(n => {
      expect(posDefault[n.id].x).toBe(posExplicitFalse[n.id].x);
      expect(posDefault[n.id].y).toBe(posExplicitFalse[n.id].y);
    });
  });
});
