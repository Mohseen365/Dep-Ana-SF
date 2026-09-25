import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import {
  computeGlobalFeatureLayout,
  computeFeatureLayerYMap,
  buildDomainGraph,
  DEFAULT_FEATURE_LAYER_SPACING,
} from '../lib/layout/global-layout';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';

const CST_FIXTURE_PATH = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const cstRaw = fs.readFileSync(CST_FIXTURE_PATH, 'utf-8');
const cstData = JSON.parse(cstRaw);
const cstNodes: ExplorerNode[] = cstData.nodes;
const cstEdges: ExplorerEdge[] = cstData.edges;

const PUB_INFRA_PATH = path.resolve(__dirname, '../../public/projects/pub-infra-mang/explorer-data.json');
let pubInfraNodes: ExplorerNode[] = [];
let pubInfraEdges: ExplorerEdge[] = [];
if (fs.existsSync(PUB_INFRA_PATH)) {
  const pubRaw = fs.readFileSync(PUB_INFRA_PATH, 'utf-8');
  const pubData = JSON.parse(pubRaw);
  pubInfraNodes = pubData.nodes;
  pubInfraEdges = pubData.edges;
}

describe('Phase 13 — Feature-Layer Spacing Implementation & Validation Suite', () => {
  it('1. DEFAULT_FEATURE_LAYER_SPACING constant is 60px', () => {
    expect(DEFAULT_FEATURE_LAYER_SPACING).toBe(60);
  });

  it('2. computeFeatureLayerYMap() evaluates interLayerGap correctly', () => {
    const featureMap = new Map<string, string>();
    cstNodes.forEach(n => featureMap.set(n.id, 'TestFeature'));
    const featureGraph = buildDomainGraph(cstNodes, cstEdges, undefined, undefined, featureMap);

    // Default (undefined featureLayerSpacing, layerSpacing = 250) -> 60px
    const yMapDefault = computeFeatureLayerYMap(cstNodes, cstEdges, featureGraph, {
      featureMap,
      layerSpacing: 250,
    });

    // Explicit 60px -> 60px
    const yMap60 = computeFeatureLayerYMap(cstNodes, cstEdges, featureGraph, {
      featureMap,
      layerSpacing: 250,
      featureLayerSpacing: 60,
    });

    // Explicit 40px -> 40px
    const yMap40 = computeFeatureLayerYMap(cstNodes, cstEdges, featureGraph, {
      featureMap,
      layerSpacing: 250,
      featureLayerSpacing: 40,
    });

    expect(yMapDefault['TestFeature']).toEqual(yMap60['TestFeature']);
    expect(yMap40['TestFeature']).not.toEqual(yMap60['TestFeature']);
  });

  it('3. Empty-layer behavior: rows === 0 does NOT advance currentY', () => {
    // Construct single node in application layer only
    const singleNode: ExplorerNode[] = [
      {
        id: 'ApexClass:SingleAppClass',
        displayName: 'SingleAppClass',
        type: 'ApexClass',
        file: 'classes/SingleAppClass.cls',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'UNTESTED',
        },
      },
    ];
    const featureMap = new Map<string, string>([['ApexClass:SingleAppClass', 'FeatA']]);
    const featureGraph = buildDomainGraph(singleNode, [], undefined, undefined, featureMap);

    const yMap = computeFeatureLayerYMap(singleNode, [], featureGraph, {
      featureMap,
      baseY: 100,
    });

    // Presentation has 0 rows -> Y remains 100
    expect(yMap['FeatA'].presentation).toBe(100);
    // Application starts at 100 because presentation (0 rows) did not advance Y
    expect(yMap['FeatA'].application).toBe(100);
    // Domain & Schema also receive currentY after Application advances
    expect(yMap['FeatA'].domain).toBeGreaterThan(100);
  });

  it('4. Pipeline Propagation: computeArchitectureLayoutWithMetadata with default vs explicit featureLayerSpacing', () => {
    const resDefault = computeArchitectureLayoutWithMetadata(cstNodes, cstEdges, {
      enableFeatureLayout: true,
      layerSpacing: 250,
    });

    const res60 = computeArchitectureLayoutWithMetadata(cstNodes, cstEdges, {
      enableFeatureLayout: true,
      layerSpacing: 250,
      featureLayerSpacing: 60,
    });

    const res40 = computeArchitectureLayoutWithMetadata(cstNodes, cstEdges, {
      enableFeatureLayout: true,
      layerSpacing: 250,
      featureLayerSpacing: 40,
    });

    // Verify Default and 60px produce 100% identical positions
    expect(resDefault.positions).toEqual(res60.positions);

    // Verify 40px yields valid positions with compact height
    expect(Object.keys(res40.positions).length).toBe(cstNodes.length);
  }, 30000);

  it('5. Full Invariant Gate on CST: Overlaps = 0, Clearance >= 40.0px, Determinism = 0.00000px', () => {
    const run1 = computeArchitectureLayoutWithMetadata(cstNodes, cstEdges, {
      enableFeatureLayout: true,
      featureLayerSpacing: 60,
    });

    const eval1 = evaluateLayout(cstNodes, cstEdges, run1.positions);
    expect(eval1.nodeOverlapCount).toBe(0);
    expect(eval1.primaryOverlapCount).toBe(0);
    expect(eval1.satelliteOverlapCount).toBe(0);
    expect(eval1.minClearance).toBeGreaterThanOrEqual(40.0);

    // Determinism test: 5 repeated runs
    for (let i = 0; i < 5; i++) {
      const runIter = computeArchitectureLayoutWithMetadata(cstNodes, cstEdges, {
        enableFeatureLayout: true,
        featureLayerSpacing: 60,
      });
      for (const id of Object.keys(run1.positions)) {
        expect(runIter.positions[id].x).toBe(run1.positions[id].x);
        expect(runIter.positions[id].y).toBe(run1.positions[id].y);
      }
    }

    // Shuffled input determinism
    const shuffledNodes = [...cstNodes].sort(() => Math.random() - 0.5);
    const shuffledEdges = [...cstEdges].sort(() => Math.random() - 0.5);
    const runShuffled = computeArchitectureLayoutWithMetadata(shuffledNodes, shuffledEdges, {
      enableFeatureLayout: true,
      featureLayerSpacing: 60,
    });
    for (const id of Object.keys(run1.positions)) {
      expect(runShuffled.positions[id].x).toBe(run1.positions[id].x);
      expect(runShuffled.positions[id].y).toBe(run1.positions[id].y);
    }
  }, 30000);

  if (pubInfraNodes.length > 0) {
    it('6. Full Invariant Gate on pub-infra-mang (528 nodes)', () => {
      const runDefault = computeArchitectureLayoutWithMetadata(pubInfraNodes, pubInfraEdges, {
        enableFeatureLayout: true,
      });
      const evalDefault = evaluateLayout(pubInfraNodes, pubInfraEdges, runDefault.positions);

      expect(evalDefault.nodeOverlapCount).toBe(0);
      expect(evalDefault.primaryOverlapCount).toBe(0);
      expect(evalDefault.satelliteOverlapCount).toBe(0);
      expect(evalDefault.minClearance).toBeGreaterThanOrEqual(40.0);

      // Verify bounds match authoritative baseline (12760 x 24670)
      const ys = Object.values(runDefault.positions).map(p => p.y);
      const xs = Object.values(runDefault.positions).map(p => p.x);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);

      expect(maxX - minX).toBe(12760);
      expect(maxY - minY).toBe(24670);
    }, 60000);
  }
});
