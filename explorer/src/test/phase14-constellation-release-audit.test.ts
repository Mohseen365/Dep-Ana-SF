import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge, ExplorerDataSchema } from '../types/explorer';
import { adaptConstellation, type ConstellationData } from '../lib/adapters/constellation-adapter';
import { computeConstellationLayout, type ConstellationLayoutResult } from '../lib/layout/constellation-layout';
import { computeArchitectureLayout, computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';

export interface DatasetRecord {
  name: string;
  sourcePath: string;
  nodePopulation: number;
  edgePopulation: number;
  availableConstellationDepths: number[];
  whetherPreviouslyTested: boolean;
  whetherPhase13TestedIt: boolean;
  whetherPhase14TestsIt: boolean;
}

export const REPOSITORY_PROJECT_DATASETS: DatasetRecord[] = [
  {
    name: 'bqc',
    sourcePath: 'public/projects/bqc/explorer-data.json',
    nodePopulation: 274,
    edgePopulation: 603,
    availableConstellationDepths: [1, 2, 3],
    whetherPreviouslyTested: true,
    whetherPhase13TestedIt: true,
    whetherPhase14TestsIt: true,
  },
  {
    name: 'cloud-spend-tracker',
    sourcePath: 'public/projects/cloud-spend-tracker/explorer-data.json',
    nodePopulation: 240,
    edgePopulation: 1024,
    availableConstellationDepths: [1, 2, 3],
    whetherPreviouslyTested: true,
    whetherPhase13TestedIt: true,
    whetherPhase14TestsIt: true,
  },
  {
    name: 'cst',
    sourcePath: 'public/projects/cst/explorer-data.json',
    nodePopulation: 240,
    edgePopulation: 1024,
    availableConstellationDepths: [1, 2, 3],
    whetherPreviouslyTested: true,
    whetherPhase13TestedIt: true,
    whetherPhase14TestsIt: true,
  },
  {
    name: 'food-app',
    sourcePath: 'public/projects/food-app/explorer-data.json',
    nodePopulation: 1,
    edgePopulation: 0,
    availableConstellationDepths: [1, 2, 3],
    whetherPreviouslyTested: true,
    whetherPhase13TestedIt: true,
    whetherPhase14TestsIt: true,
  },
  {
    name: 'movie',
    sourcePath: 'public/projects/movie/explorer-data.json',
    nodePopulation: 9,
    edgePopulation: 16,
    availableConstellationDepths: [1, 2, 3],
    whetherPreviouslyTested: false,
    whetherPhase13TestedIt: false,
    whetherPhase14TestsIt: true,
  },
  {
    name: 'movie-app',
    sourcePath: 'public/projects/movie-app/explorer-data.json',
    nodePopulation: 9,
    edgePopulation: 16,
    availableConstellationDepths: [1, 2, 3],
    whetherPreviouslyTested: false,
    whetherPhase13TestedIt: false,
    whetherPhase14TestsIt: true,
  },
  {
    name: 'pbim',
    sourcePath: 'public/projects/pbim/explorer-data.json',
    nodePopulation: 528,
    edgePopulation: 2063,
    availableConstellationDepths: [1, 2, 3],
    whetherPreviouslyTested: true,
    whetherPhase13TestedIt: true,
    whetherPhase14TestsIt: true,
  },
  {
    name: 'project-b',
    sourcePath: 'public/projects/project-b/explorer-data.json',
    nodePopulation: 14,
    edgePopulation: 16,
    availableConstellationDepths: [1, 2, 3],
    whetherPreviouslyTested: false,
    whetherPhase13TestedIt: false,
    whetherPhase14TestsIt: true,
  },
  {
    name: 'pub-infra-mang',
    sourcePath: 'public/projects/pub-infra-mang/explorer-data.json',
    nodePopulation: 528,
    edgePopulation: 2063,
    availableConstellationDepths: [1, 2, 3],
    whetherPreviouslyTested: false,
    whetherPhase13TestedIt: false,
    whetherPhase14TestsIt: true,
  },
  {
    name: 'test-canonical-project',
    sourcePath: 'public/projects/test-canonical-project/explorer-data.json',
    nodePopulation: 2,
    edgePopulation: 1,
    availableConstellationDepths: [1, 2, 3],
    whetherPreviouslyTested: false,
    whetherPhase13TestedIt: false,
    whetherPhase14TestsIt: true,
  },
  {
    name: 'test-norm-proj',
    sourcePath: 'public/projects/test-norm-proj/explorer-data.json',
    nodePopulation: 1,
    edgePopulation: 0,
    availableConstellationDepths: [1, 2, 3],
    whetherPreviouslyTested: false,
    whetherPhase13TestedIt: false,
    whetherPhase14TestsIt: true,
  },
];

function loadProjectData(sourcePath: string): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const fullPath = path.resolve(process.cwd(), sourcePath);
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

function makeSyntheticNode(id: string, displayName: string): ExplorerNode {
  return {
    id,
    displayName,
    type: 'ApexClass',
    file: `src/${displayName}.cls`,
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
      testCoverageStatus: 'COVERED',
    },
  };
}

function makeSyntheticEdge(id: string, source: string, target: string): ExplorerEdge {
  return {
    id,
    source,
    target,
    relationshipType: 'method-call',
    method: null,
    evidence: '',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: '1.0',
    line: null,
    column: null,
    methodOwner: null,
    file: '',
    canonical: {
      source: { type: 'ApexClass', name: source },
      target: { type: 'ApexClass', name: target },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {},
    },
  };
}

interface CollisionDetails {
  sameTrackOverlaps: number;
  sameRingCrossTrackOverlaps: number;
  crossRingOverlaps: number;
  focalOverlaps: number;
  totalAabbOverlaps: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  occupiedWidth: number;
  occupiedHeight: number;
  occupiedArea: number;
  nodeCount: number;
  nodeDensity: number;
  medianLocality: number;
  p95Locality: number;
  maxLocality: number;
}

function computeScenarioMetrics(
  constData: ConstellationData,
  layout: ConstellationLayoutResult
): CollisionDetails {
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

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  allPosList.forEach((p) => {
    const halfD = p.hopDistance === 0 ? 18 : 12;
    if (p.x - halfD < minX) minX = p.x - halfD;
    if (p.x + halfD > maxX) maxX = p.x + halfD;
    if (p.y - halfD < minY) minY = p.y - halfD;
    if (p.y + halfD > maxY) maxY = p.y + halfD;
  });

  if (allPosList.length === 0) {
    minX = 0; maxX = 0; minY = 0; maxY = 0;
  }

  const occupiedWidth = Math.max(0, maxX - minX);
  const occupiedHeight = Math.max(0, maxY - minY);
  const occupiedArea = occupiedWidth * occupiedHeight;
  const nodeCount = allPosList.length;
  const nodeDensity = occupiedArea > 0 ? nodeCount / occupiedArea : 0;

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

  return {
    sameTrackOverlaps,
    sameRingCrossTrackOverlaps,
    crossRingOverlaps,
    focalOverlaps,
    totalAabbOverlaps,
    minX,
    maxX,
    minY,
    maxY,
    occupiedWidth,
    occupiedHeight,
    occupiedArea,
    nodeCount,
    nodeDensity,
    medianLocality: getPercentile(50),
    p95Locality: getPercentile(95),
    maxLocality: count > 0 ? edgeLengths[count - 1] : 0,
  };
}

describe('PHASE 14 — Constellation Release Readiness & Regression Gate Audit', () => {
  test('Complete Dataset Inventory Verification & Scenario Audit', () => {
    const fullAuditResults: Record<string, any> = {};

    REPOSITORY_PROJECT_DATASETS.forEach((ds) => {
      const { nodes, edges } = loadProjectData(ds.sourcePath);

      let focalNode = nodes[0];
      if (nodes.length > 1) {
        const degreeMap: Record<string, number> = {};
        edges.forEach(e => {
          degreeMap[e.source] = (degreeMap[e.source] || 0) + 1;
          degreeMap[e.target] = (degreeMap[e.target] || 0) + 1;
        });
        focalNode = [...nodes].sort((a, b) => (degreeMap[b.id] || 0) - (degreeMap[a.id] || 0))[0];
      }

      [1, 2, 3].forEach((depth) => {
        const constData = adaptConstellation(
          makeSchema(nodes, edges),
          {
            focalNodeId: focalNode ? focalNode.id : undefined,
            maxDepth: depth,
            direction: 'both',
          }
        );

        const layout = computeConstellationLayout(constData);
        const metrics = computeScenarioMetrics(constData, layout);

        const scenarioKey = `${ds.name}_depth_${depth}`;
        fullAuditResults[scenarioKey] = {
          dataset: ds.name,
          depth,
          focalNodeId: constData.focalNode?.id || null,
          totalNodes: constData.summary.totalNodes,
          totalEdges: constData.edges.length,
          ringPopulations: constData.rings.map(r => r.totalCount),
          metrics,
        };

        // Assert 0 collisions for all real production dataset scenarios
        expect(metrics.totalAabbOverlaps).toBe(0);
      });
    });

    const dumpPath = path.resolve(process.cwd(), 'PHASE_14_FULL_DATASET_AUDIT_DUMP.json');
    fs.writeFileSync(dumpPath, JSON.stringify(fullAuditResults, null, 2), 'utf8');
    expect(fs.existsSync(dumpPath)).toBe(true);
  });

  test('Boundary Population Test around Sparse Threshold N_threshold = 30', () => {
    const testCounts = [29, 30, 31, 34, 35, 36, 40];

    testCounts.forEach((n) => {
      const syntheticNodes: ExplorerNode[] = [makeSyntheticNode('focal', 'focal')];
      const syntheticEdges: ExplorerEdge[] = [];

      for (let i = 1; i <= n; i++) {
        const id = `node_${i}`;
        syntheticNodes.push(makeSyntheticNode(id, id));
        syntheticEdges.push(makeSyntheticEdge(`e_${i}`, 'focal', id));
      }

      const constData = adaptConstellation(
        makeSchema(syntheticNodes, syntheticEdges),
        { focalNodeId: 'focal', maxDepth: 1, direction: 'both' }
      );

      const layout = computeConstellationLayout(constData);
      const metrics = computeScenarioMetrics(constData, layout);

      const expectedTrackCount = n <= 30 ? 1 : 4;
      const registeredTracks = layout.ringGeometries.filter(r => r.ringIndex === 1).length;

      expect(registeredTracks).toBe(expectedTrackCount);
      expect(metrics.totalAabbOverlaps).toBe(0);
    });
  });

  test('Broader Ring Population Test near N = 60, 100, 120, 200, 217, 250 across Ring Radii', () => {
    const testCounts = [60, 100, 120, 200, 217, 250];
    const broaderAuditDump: Record<number, any> = {};

    testCounts.forEach((n) => {
      const syntheticNodes: ExplorerNode[] = [makeSyntheticNode('focal', 'focal')];
      const syntheticEdges: ExplorerEdge[] = [];

      for (let i = 1; i <= n; i++) {
        const id = `node_${i}`;
        syntheticNodes.push(makeSyntheticNode(id, id));
        syntheticEdges.push(makeSyntheticEdge(`e_${i}`, 'focal', id));
      }

      const constData = adaptConstellation(
        makeSchema(syntheticNodes, syntheticEdges),
        { focalNodeId: 'focal', maxDepth: 1, direction: 'both' }
      );

      const layout = computeConstellationLayout(constData);
      const metrics = computeScenarioMetrics(constData, layout);

      broaderAuditDump[n] = {
        ring1Population: n,
        totalOverlaps: metrics.totalAabbOverlaps,
        sameTrackOverlaps: metrics.sameTrackOverlaps,
        occupiedWidth: metrics.occupiedWidth,
        occupiedHeight: metrics.occupiedHeight,
      };
    });

    const broaderDumpPath = path.resolve(process.cwd(), 'PHASE_14_BROADER_POPULATION_AUDIT_DUMP.json');
    fs.writeFileSync(broaderDumpPath, JSON.stringify(broaderAuditDump, null, 2), 'utf8');
    expect(fs.existsSync(broaderDumpPath)).toBe(true);
  });

  test('Cross-Layout Isolation (Hierarchical and Orbit)', () => {
    const dsCst = loadProjectData('public/projects/cst/explorer-data.json');

    // Verify Hierarchical Candidate D / SB1C / H5A
    const hierarchicalPositions = computeArchitectureLayout(dsCst.nodes, dsCst.edges, {
      architectureMode: 'hierarchical',
      enableCandidateDOrdering: true,
      enableImmutablePrimaryPositions: true,
    });
    expect(Object.keys(hierarchicalPositions).length).toBe(dsCst.nodes.length);

    // Verify Orbit Mode
    const orbitResult = computeArchitectureLayoutWithMetadata(dsCst.nodes, dsCst.edges, {
      architectureMode: 'orbit',
    });
    const expectedOrbitCount = orbitResult.projectedNodeIds ? orbitResult.projectedNodeIds.size : dsCst.nodes.length;
    expect(Object.keys(orbitResult.positions).length).toBe(expectedOrbitCount);
  });
});
