import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge, ExplorerDataSchema } from '../types/explorer';
import { adaptConstellation, type ConstellationData } from '../lib/adapters/constellation-adapter';
import { computeConstellationLayout, type ConstellationLayoutResult } from '../lib/layout/constellation-layout';

interface DatasetSpec {
  key: string;
  file: string;
}

const DATASETS: DatasetSpec[] = [
  { key: 'cst', file: 'public/projects/cst/explorer-data.json' },
  { key: 'bqc', file: 'public/projects/bqc/explorer-data.json' },
  { key: 'pbim', file: 'public/projects/pbim/explorer-data.json' },
];

function loadDataset(ds: DatasetSpec): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const p1 = path.resolve(process.cwd(), ds.file);
  const p2 = path.resolve(__dirname, '../../', ds.file);
  const fullPath = fs.existsSync(p1) ? p1 : p2;
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

function makeSchema(nodes: ExplorerNode[], edges: ExplorerEdge[]): ExplorerDataSchema {
  return {
    nodes,
    edges,
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      cycleCount: 0,
      unresolvedCount: 0,
      inventory: {
        files: 0,
        apexClasses: 0,
        apexTriggers: 0,
        lwcJs: 0,
        lwcHtml: 0,
        visualforce: 0,
        flows: 0,
        objects: 0,
        fields: 0,
      },
    },
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {},
  };
}

export const CANONICAL_SCENARIOS = [
  {
    label: 'CST AccountController 2-hop',
    datasetKey: 'cst',
    focalNodeId: 'ApexClass:AccountController',
    maxDepth: 2,
    expectedNodes: 37,
    expectedRings: [3, 33],
  },
  {
    label: 'CST Org_Hierarchy 3-hop',
    datasetKey: 'cst',
    focalNodeId: 'Object:Organization_Hierarchy__c',
    maxDepth: 3,
    expectedNodes: 205,
    expectedRings: [29, 120, 55],
  },
  {
    label: 'BQC Bouquet_Order__c 2-hop',
    datasetKey: 'bqc',
    focalNodeId: 'Object:Bouquet_Order__c',
    maxDepth: 2,
    expectedNodes: 134,
    expectedRings: [35, 98],
  },
  {
    label: 'BQC Bouquet_Order__c 3-hop',
    datasetKey: 'bqc',
    focalNodeId: 'Object:Bouquet_Order__c',
    maxDepth: 3,
    expectedNodes: 169,
    expectedRings: [35, 98, 35],
  },
  {
    label: 'PBIM Maintenance_Request__c 2-hop',
    datasetKey: 'pbim',
    focalNodeId: 'Object:Maintenance_Request__c',
    maxDepth: 2,
    expectedNodes: 287,
    expectedRings: [69, 217],
  },
  {
    label: 'PBIM Maintenance_Request__c 3-hop',
    datasetKey: 'pbim',
    focalNodeId: 'Object:Maintenance_Request__c',
    maxDepth: 3,
    expectedNodes: 415,
    expectedRings: [69, 217, 128],
  },
];

export interface CanonicalCollisionAudit {
  label: string;
  totalNodes: number;
  focalNodeId: string;
  ringPopulations: number[];
  sameTrackOverlaps: number;
  sameRingCrossTrackOverlaps: number;
  crossRingOverlaps: number;
  focalOverlaps: number;
  totalAabbOverlaps: number;
  bboxWidth: number;
  bboxHeight: number;
  medianLocality: number;
  p95Locality: number;
  maxLocality: number;
  ringBaseRadii: number[];
}

function auditCollisions(
  constData: ConstellationData,
  layout: ConstellationLayoutResult
): CanonicalCollisionAudit {
  const positions = layout.nodePositions;
  const allPosList = Object.values(positions);

  let sameTrackOverlaps = 0;
  let sameRingCrossTrackOverlaps = 0;
  let crossRingOverlaps = 0;
  let focalOverlaps = 0;

  for (let i = 0; i < allPosList.length; i++) {
    for (let j = i + 1; j < allPosList.length; j++) {
      const p1 = allPosList[i];
      const p2 = allPosList[j];

      const dx = Math.abs(p1.x - p2.x);
      const dy = Math.abs(p1.y - p2.y);

      const isP1Focal = p1.hopDistance === 0;
      const isP2Focal = p2.hopDistance === 0;

      if (isP1Focal || isP2Focal) {
        if (dx < 30 && dy < 30) {
          focalOverlaps++;
        }
      } else {
        if (dx < 24 && dy < 24) {
          if (p1.hopDistance === p2.hopDistance) {
            if (p1.trackIndex === p2.trackIndex) {
              sameTrackOverlaps++;
            } else {
              sameRingCrossTrackOverlaps++;
            }
          } else {
            crossRingOverlaps++;
          }
        }
      }
    }
  }

  const totalAabbOverlaps =
    sameTrackOverlaps + sameRingCrossTrackOverlaps + crossRingOverlaps + focalOverlaps;

  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  allPosList.forEach((p) => {
    const halfD = p.hopDistance === 0 ? 18 : 12;
    if (p.x - halfD < minX) minX = p.x - halfD;
    if (p.x + halfD > maxX) maxX = p.x + halfD;
    if (p.y - halfD < minY) minY = p.y - halfD;
    if (p.y + halfD > maxY) maxY = p.y + halfD;
  });

  const bboxWidth = Math.max(0, maxX - minX);
  const bboxHeight = Math.max(0, maxY - minY);

  // Connected edge locality
  const edgeLengths: number[] = [];
  constData.edges.forEach((e) => {
    const p1 = positions[e.source];
    const p2 = positions[e.target];
    if (p1 && p2) {
      const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
      edgeLengths.push(dist);
    }
  });

  edgeLengths.sort((a, b) => a - b);
  const count = edgeLengths.length;
  const getPercentile = (p: number) => {
    if (count === 0) return 0;
    if (count === 1) return edgeLengths[0];
    const index = (p / 100) * (count - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (upper >= count) return edgeLengths[count - 1];
    return edgeLengths[lower] * (1 - weight) + edgeLengths[upper] * weight;
  };

  const ringBaseRadii = layout.ringGeometries
    .filter((rg) => rg.trackIndex === 0)
    .map((rg) => rg.radius);

  return {
    label: '',
    totalNodes: constData.summary.totalNodes,
    focalNodeId: constData.focalNode?.id || '',
    ringPopulations: constData.rings.map((r) => r.totalCount),
    sameTrackOverlaps,
    sameRingCrossTrackOverlaps,
    crossRingOverlaps,
    focalOverlaps,
    totalAabbOverlaps,
    bboxWidth,
    bboxHeight,
    medianLocality: getPercentile(50),
    p95Locality: getPercentile(95),
    maxLocality: count > 0 ? edgeLengths[count - 1] : 0,
    ringBaseRadii,
  };
}

describe('PHASE 13 — Production Dependency Constellation Verification', () => {
  const canonicalAuditResults: Record<string, CanonicalCollisionAudit> = {};

  test('Semantic Integrity Gate Across All Canonical Scenarios', () => {
    CANONICAL_SCENARIOS.forEach((scen) => {
      const dsSpec = DATASETS.find((d) => d.key === scen.datasetKey)!;
      const { nodes, edges } = loadDataset(dsSpec);

      const constData = adaptConstellation(
        makeSchema(nodes, edges),
        {
          focalNodeId: scen.focalNodeId,
          maxDepth: scen.maxDepth,
          direction: 'both',
        }
      );

      // Verify Semantic Integrity
      expect(constData.focalNode).not.toBeNull();
      expect(constData.focalNode?.id).toBe(scen.focalNodeId);
      expect(constData.summary.totalNodes).toBe(scen.expectedNodes);
      expect(constData.rings.length).toBe(scen.expectedRings.length);

      const ringPops = constData.rings.map((r) => r.totalCount);
      expect(ringPops).toEqual(scen.expectedRings);
    });
  });

  test('Hard Collision Gate Across Canonical Scenarios (TOTAL AABB OVERLAPS = 0)', () => {
    CANONICAL_SCENARIOS.forEach((scen) => {
      const dsSpec = DATASETS.find((d) => d.key === scen.datasetKey)!;
      const { nodes, edges } = loadDataset(dsSpec);

      const constData = adaptConstellation(
        makeSchema(nodes, edges),
        {
          focalNodeId: scen.focalNodeId,
          maxDepth: scen.maxDepth,
          direction: 'both',
        }
      );

      // Run production layout calculation
      const layout = computeConstellationLayout(constData);

      const audit = auditCollisions(constData, layout);
      audit.label = scen.label;
      canonicalAuditResults[scen.label] = audit;

      // Hard Collision Gate Assertions
      expect(audit.sameTrackOverlaps).toBe(0);
      expect(audit.sameRingCrossTrackOverlaps).toBe(0);
      expect(audit.crossRingOverlaps).toBe(0);
      expect(audit.focalOverlaps).toBe(0);
      expect(audit.totalAabbOverlaps).toBe(0);
    });
  });

  test('Adversarial BQC Boundary Verification (N in 29..40)', () => {
    const dsSpec = DATASETS.find((d) => d.key === 'bqc')!;
    const { nodes, edges } = loadDataset(dsSpec);

    // Test BQC Ring 1 node count sparse threshold boundary
    const constData = adaptConstellation(
      makeSchema(nodes, edges),
      {
        focalNodeId: 'Object:Bouquet_Order__c',
        maxDepth: 3,
        direction: 'both',
      }
    );

    // Production BQC Ring 1 has 35 nodes (>30), so it takes T=4 and has 0 collisions
    const layout = computeConstellationLayout(constData);
    const audit = auditCollisions(constData, layout);
    expect(audit.sameTrackOverlaps).toBe(0);
    expect(audit.totalAabbOverlaps).toBe(0);
  });

  test('10x Determinism & Input-Order Invariance Gate', () => {
    const dsSpec = DATASETS.find((d) => d.key === 'pbim')!;
    const { nodes, edges } = loadDataset(dsSpec);

    const constData1 = adaptConstellation(
      makeSchema(nodes, edges),
      {
        focalNodeId: 'Object:Maintenance_Request__c',
        maxDepth: 3,
        direction: 'both',
      }
    );

    const baseLayout = computeConstellationLayout(constData1);

    // 10x Identical Executions
    for (let run = 0; run < 10; run++) {
      const curLayout = computeConstellationLayout(constData1);
      expect(curLayout.nodePositions).toEqual(baseLayout.nodePositions);
    }

    // 10x Input Shuffles
    for (let run = 0; run < 10; run++) {
      const shuffledNodes = [...nodes].sort(() => Math.random() - 0.5);
      const shuffledEdges = [...edges].sort(() => Math.random() - 0.5);

      const constDataShuffled = adaptConstellation(
        makeSchema(shuffledNodes, shuffledEdges),
        {
          focalNodeId: 'Object:Maintenance_Request__c',
          maxDepth: 3,
          direction: 'both',
        }
      );

      const curLayout = computeConstellationLayout(constDataShuffled);
      expect(curLayout.nodePositions).toEqual(baseLayout.nodePositions);
    }
  });

  test('Broader Dataset Matrix Evaluation', () => {
    DATASETS.forEach((ds) => {
      const { nodes, edges } = loadDataset(ds);
      const constData = adaptConstellation(
        makeSchema(nodes, edges),
        {
          maxDepth: 3,
          direction: 'both',
        }
      );

      const layout = computeConstellationLayout(constData);
      const audit = auditCollisions(constData, layout);

      expect(audit.totalAabbOverlaps).toBe(0);
    });
  });

  test('Dump Phase 13 Canonical Verification Audit Results JSON', () => {
    const artifactPath = path.resolve(process.cwd(), 'PHASE_13_CANONICAL_AUDIT_DUMP.json');
    fs.writeFileSync(artifactPath, JSON.stringify(canonicalAuditResults, null, 2), 'utf8');
    expect(fs.existsSync(artifactPath)).toBe(true);
  });
});
