import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import {
  calculateFeatureLocalityDiagnostics,
  calculateDetailedEdgeCrossings,
  primaryNodeOverlapCount,
  satelliteNodeOverlapCount,
  minimumNodeClearance,
} from '../lib/layout/metrics';
import { discoverFeatures } from '../lib/layout/features';
import { classifyNodeLayer } from '../lib/layout/layers';

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
    const positions = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const LAYER_ORDER = {
      presentation: 0,
      application: 1,
      domain: 2,
      schema: 3,
    };

    const discovery = discoverFeatures(cloudSpendNodes, cloudSpendEdges);

    discovery.featureList.forEach(cluster => {
      const primaryMembers = cluster.primaryNodeIds;
      const nodesByLayer: Record<string, ExplorerNode[]> = {
        presentation: [],
        application: [],
        domain: [],
        schema: [],
      };

      primaryMembers.forEach(id => {
        const node = cloudSpendNodes.find(n => n.id === id);
        if (node) {
          const layer = classifyNodeLayer(node);
          nodesByLayer[layer].push(node);
        }
      });

      const layersPresent = ['presentation', 'application', 'domain', 'schema'].filter(
        l => nodesByLayer[l].length > 0
      );

      for (let i = 0; i < layersPresent.length - 1; i++) {
        const lUpper = layersPresent[i];
        const lLower = layersPresent[i + 1];

        const avgYUpper =
          nodesByLayer[lUpper].reduce((sum, n) => sum + positions[n.id].y, 0) /
          nodesByLayer[lUpper].length;
        const avgYLower =
          nodesByLayer[lLower].reduce((sum, n) => sum + positions[n.id].y, 0) /
          nodesByLayer[lLower].length;

        expect(avgYUpper).toBeLessThanOrEqual(avgYLower);
      }
    });

    const metrics = evaluateLayout(cloudSpendNodes, cloudSpendEdges, positions);
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
