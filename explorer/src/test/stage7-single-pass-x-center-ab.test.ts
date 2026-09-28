import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { LocalLayoutInput, LocalLayoutResult, LocalBucketLayout } from '../lib/layout/local-layout';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { classifyNodeLayer } from '../lib/layout/layers';
import { classifyNodeDomain } from '../lib/layout/domains';
import { computeArchitectureAnalysis } from '../lib/layout/analysis';
import type { DomainRegion } from '../lib/layout/global-layout';
import { calculateLayoutMetrics, type PositionMap } from '../lib/layout/metrics';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import { generateSyntheticSalesforceGraph } from './scalability-generator';

// Load Canonical Benchmark Fixture
const CANONICAL_FIXTURE_PATH = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const canonicalDataRaw = fs.readFileSync(CANONICAL_FIXTURE_PATH, 'utf-8');
const canonicalData = JSON.parse(canonicalDataRaw);

const LAYER_Y_BASE: Record<string, number> = {
  presentation: 100,
  application: 350,
  domain: 600,
  schema: 850,
};

const LAYERS_IN_ORDER: string[] = [
  'presentation',
  'application',
  'domain',
  'schema',
];

function getRelationshipWeight(relType?: string): number {
  switch (relType) {
    case 'method-call':
    case 'instantiation':
    case 'soql-object':
    case 'trigger-handler':
    case 'lwc-apex':
    case 'visualforce-controller':
    case 'extends':
    case 'implements':
    case 'SOQL':
    case 'DML':
    case 'event-publisher':
      return 3.0;
    case 'type-reference':
    case 'soql-field':
    case 'lwc-import':
    case 'lwc-template-child':
      return 1.5;
    case 'field-reference':
    case 'test-reference':
    case 'unknown':
    default:
      return 0.5;
  }
}

export interface CandidateWorkCounters {
  rowWidthCalculations: number;
  xCenteringOperations: number;
  centeringPasses: number;
  bucketTraversals: number;
  edgeScans: number;
}

/**
 * ORACLE WITH WORK COUNTERS
 * Computes exact same output as computeLocalNodeLayout but tracks operations bit-for-bit.
 */
export function computeLocalNodeLayoutOracleWithCounters(input: LocalLayoutInput): {
  result: LocalLayoutResult;
  counters: CandidateWorkCounters;
} {
  const counters: CandidateWorkCounters = {
    rowWidthCalculations: 0,
    xCenteringOperations: 0,
    centeringPasses: 0,
    bucketTraversals: 0,
    edgeScans: 0,
  };

  const safeNodes = Array.isArray(input.nodes) ? [...input.nodes] : [];
  const safeEdges = Array.isArray(input.edges) ? [...input.edges] : [];

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => (a.id ?? `${a.source}->${a.target}`).localeCompare(b.id ?? `${b.source}->${b.target}`));

  const options = input.options || {};
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const horizontalGap = options.horizontalGap ?? 40;
  const verticalGap = options.verticalGap ?? 40;
  const baseX = options.baseX ?? 100;
  const domainSpacing = options.domainSpacing ?? 380;

  const analysis = input.analysis || computeArchitectureAnalysis(safeNodes, safeEdges, {
    layerMap: input.layerMap,
    domainMap: input.domainMap,
  });

  const layerMap = new Map<string, any>();
  if (input.layerMap instanceof Map) {
    input.layerMap.forEach((v, k) => layerMap.set(k, v));
  } else if (input.layerMap) {
    Object.entries(input.layerMap).forEach(([k, v]) => layerMap.set(k, v));
  }
  safeNodes.forEach(node => {
    if (!layerMap.has(node.id)) {
      const nodeAnalysis = analysis.nodes.get(node.id);
      layerMap.set(node.id, nodeAnalysis?.layer || classifyNodeLayer(node));
    }
  });

  const domainMap = new Map<string, string>();
  if (input.domainMap instanceof Map) {
    input.domainMap.forEach((v, k) => domainMap.set(k, v));
  } else if (input.domainMap) {
    Object.entries(input.domainMap).forEach(([k, v]) => domainMap.set(k, v));
  }
  safeNodes.forEach(node => {
    if (!domainMap.has(node.id)) {
      const nodeAnalysis = analysis.nodes.get(node.id);
      domainMap.set(node.id, nodeAnalysis?.domain || classifyNodeDomain(node, safeNodes, safeEdges));
    }
  });

  const domainRegionsMap = new Map<string, DomainRegion>();
  if (input.domainRegions instanceof Map) {
    input.domainRegions.forEach((v, k) => domainRegionsMap.set(k, v));
  } else if (input.domainRegions) {
    Object.entries(input.domainRegions).forEach(([k, v]) => domainRegionsMap.set(k, v));
  }

  const bucketOrderMap = new Map<string, string[]>();
  if (input.bucketOrder instanceof Map) {
    input.bucketOrder.forEach((v, k) => bucketOrderMap.set(k, v));
  } else if (input.bucketOrder) {
    Object.entries(input.bucketOrder).forEach(([k, v]) => bucketOrderMap.set(k, v));
  }

  const primaryNodes = safeNodes.filter(node => {
    const nodeAnalysis = analysis.nodes.get(node.id);
    const isTest = nodeAnalysis ? nodeAnalysis.isTest : false;
    const isField = nodeAnalysis ? nodeAnalysis.isField : (node.type === 'Field' || node.type === 'CustomField');
    return !isTest && !isField;
  });

  const discoveredDomains = new Set<string>();
  primaryNodes.forEach(node => {
    discoveredDomains.add(domainMap.get(node.id) || 'Shared');
  });

  const sortedDomains = Array.from(discoveredDomains).sort((a, b) => {
    if (a === 'Shared') return -1;
    if (b === 'Shared') return 1;
    if (domainRegionsMap.has(a) && domainRegionsMap.has(b)) {
      return (domainRegionsMap.get(a)?.orderIndex ?? 0) - (domainRegionsMap.get(b)?.orderIndex ?? 0);
    }
    return a.localeCompare(b);
  });

  const bucketNodesMap = new Map<string, string[]>();
  LAYERS_IN_ORDER.forEach(layer => {
    sortedDomains.forEach(domain => {
      bucketNodesMap.set(`${layer}:${domain}`, []);
    });
  });

  primaryNodes.forEach(node => {
    const layer = layerMap.get(node.id) || 'application';
    const domain = domainMap.get(node.id) || 'Shared';
    const key = `${layer}:${domain}`;
    if (!bucketNodesMap.has(key)) {
      bucketNodesMap.set(key, []);
    }
    bucketNodesMap.get(key)!.push(node.id);
  });

  const primaryNodeSet = new Set(primaryNodes.map(n => n.id));
  const intraBucketAdj = new Map<string, Set<string>>();
  const intraBucketInDegree = new Map<string, number>();
  const intraBucketOutDegree = new Map<string, number>();
  const nodePrimaryEdgesMap = new Map<string, { neighborId: string; relationshipType?: string }[]>();

  primaryNodes.forEach(n => {
    intraBucketAdj.set(n.id, new Set());
    intraBucketInDegree.set(n.id, 0);
    intraBucketOutDegree.set(n.id, 0);
    nodePrimaryEdgesMap.set(n.id, []);
  });

  safeEdges.forEach(e => {
    if (primaryNodeSet.has(e.source) && primaryNodeSet.has(e.target) && e.source !== e.target) {
      intraBucketAdj.get(e.source)?.add(e.target);
      intraBucketOutDegree.set(e.source, (intraBucketOutDegree.get(e.source) || 0) + 1);
      intraBucketInDegree.set(e.target, (intraBucketInDegree.get(e.target) || 0) + 1);

      nodePrimaryEdgesMap.get(e.source)?.push({ neighborId: e.target, relationshipType: e.relationshipType });
      nodePrimaryEdgesMap.get(e.target)?.push({ neighborId: e.source, relationshipType: e.relationshipType });
    }
  });

  const primaryNodePositions: PositionMap = {};
  const bucketLayouts = new Map<string, LocalBucketLayout>();

  const domainXCenterMap = new Map<string, number>();
  sortedDomains.forEach((domain, dIdx) => {
    if (domainRegionsMap.has(domain)) {
      domainXCenterMap.set(domain, domainRegionsMap.get(domain)!.xCenter);
    } else {
      domainXCenterMap.set(domain, baseX + dIdx * domainSpacing + domainSpacing / 2);
    }
  });

  LAYERS_IN_ORDER.forEach(layer => {
    sortedDomains.forEach(domain => {
      counters.bucketTraversals++;
      const bucketKey = `${layer}:${domain}`;
      const unorderedIds = bucketNodesMap.get(bucketKey) || [];
      if (unorderedIds.length === 0) return;

      let orderedNodeIds: string[] = [];
      const wave2bBucket = bucketOrderMap.get(bucketKey);

      if (wave2bBucket && wave2bBucket.length > 0) {
        const wave2bPrimarySet = new Set<string>();
        wave2bBucket.forEach(id => {
          if (unorderedIds.includes(id)) {
            orderedNodeIds.push(id);
            wave2bPrimarySet.add(id);
          }
        });
        const missing = unorderedIds.filter(id => !wave2bPrimarySet.has(id));
        missing.sort((a, b) => {
          const degA = (analysis.nodes.get(a)?.hubScore || 0);
          const degB = (analysis.nodes.get(b)?.hubScore || 0);
          if (degB !== degA) return degB - degA;
          return a.localeCompare(b);
        });
        orderedNodeIds.push(...missing);
      } else {
        orderedNodeIds = [...unorderedIds].sort((a, b) => {
          const nodeA = analysis.nodes.get(a);
          const nodeB = analysis.nodes.get(b);
          const scoreA = nodeA ? nodeA.hubScore : 0;
          const scoreB = nodeB ? nodeB.hubScore : 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.localeCompare(b);
        });
      }

      const domainXCenter = domainXCenterMap.get(domain) ?? (baseX + domainSpacing / 2);

      const featureYMap = options.featureLayerYMap
        ? (options.featureLayerYMap instanceof Map
            ? options.featureLayerYMap.get(domain)
            : options.featureLayerYMap[domain])
        : (options.layerYMap as any)?.featureLayerYMap?.[domain];

      const layerBaseY = (featureYMap && featureYMap[layer] !== undefined)
        ? featureYMap[layer]
        : ((options.layerYMap && options.layerYMap[layer]) ?? LAYER_Y_BASE[layer]);

      const tier0: string[] = [];
      const tier1: string[] = [];
      const tier2: string[] = [];

      if (orderedNodeIds.length <= 2) {
        if (orderedNodeIds.length === 2) {
          const [n1, n2] = orderedNodeIds;
          const n1ToN2 = intraBucketAdj.get(n1)?.has(n2);
          const n2ToN1 = intraBucketAdj.get(n2)?.has(n1);
          if (n1ToN2 && !n2ToN1) {
            tier0.push(n1);
            tier2.push(n2);
          } else if (n2ToN1 && !n1ToN2) {
            tier0.push(n2);
            tier2.push(n1);
          } else {
            tier1.push(n1, n2);
          }
        } else {
          tier1.push(...orderedNodeIds);
        }
      } else {
        orderedNodeIds.forEach(id => {
          const inDeg = intraBucketInDegree.get(id) || 0;
          const outDeg = intraBucketOutDegree.get(id) || 0;

          if (outDeg > 0 && inDeg === 0) {
            tier0.push(id);
          } else if (inDeg > 0 && outDeg === 0) {
            tier2.push(id);
          } else if (outDeg > inDeg) {
            tier0.push(id);
          } else if (inDeg > outDeg) {
            tier2.push(id);
          } else {
            tier1.push(id);
          }
        });
      }

      const tiers: string[][] = [];
      if (tier0.length > 0) tiers.push(tier0);
      if (tier1.length > 0) tiers.push(tier1);
      if (tier2.length > 0) tiers.push(tier2);

      if (tiers.length === 0) {
        tiers.push(orderedNodeIds);
      }

      const initialRankMap = new Map<string, number>();
      orderedNodeIds.forEach((id, idx) => initialRankMap.set(id, idx));

      const hasBucketOrder = Boolean(wave2bBucket && wave2bBucket.length > 0);

      tier0.sort((a, b) => {
        const rankA = initialRankMap.get(a) ?? 0;
        const rankB = initialRankMap.get(b) ?? 0;

        let sumA = 0, countA = 0;
        let sumB = 0, countB = 0;

        const relEdgesA = nodePrimaryEdgesMap.get(a) || [];
        relEdgesA.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier1.includes(neighborId) || tier2.includes(neighborId)) {
            sumA += initialRankMap.get(neighborId) ?? 0;
            countA++;
          }
        });

        const relEdgesB = nodePrimaryEdgesMap.get(b) || [];
        relEdgesB.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier1.includes(neighborId) || tier2.includes(neighborId)) {
            sumB += initialRankMap.get(neighborId) ?? 0;
            countB++;
          }
        });

        const bcA = countA > 0 ? sumA / countA : rankA;
        const bcB = countB > 0 ? sumB / countB : rankB;

        if (Math.abs(bcA - bcB) > 1e-6) return bcA - bcB;
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
      });

      tier1.sort((a, b) => {
        const rankA = initialRankMap.get(a) ?? 0;
        const rankB = initialRankMap.get(b) ?? 0;

        let sumA = 0, countA = 0;
        let sumB = 0, countB = 0;

        const relEdgesA = nodePrimaryEdgesMap.get(a) || [];
        relEdgesA.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier0.includes(neighborId)) {
            sumA += tier0.indexOf(neighborId);
            countA++;
          } else if (tier2.includes(neighborId)) {
            sumA += initialRankMap.get(neighborId) ?? 0;
            countA++;
          }
        });

        const relEdgesB = nodePrimaryEdgesMap.get(b) || [];
        relEdgesB.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier0.includes(neighborId)) {
            sumB += tier0.indexOf(neighborId);
            countB++;
          } else if (tier2.includes(neighborId)) {
            sumB += initialRankMap.get(neighborId) ?? 0;
            countB++;
          }
        });

        const bcA = countA > 0 ? sumA / countA : rankA;
        const bcB = countB > 0 ? sumB / countB : rankB;

        if (Math.abs(bcA - bcB) > 1e-6) return bcA - bcB;
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
      });

      tier2.sort((a, b) => {
        const rankA = initialRankMap.get(a) ?? 0;
        const rankB = initialRankMap.get(b) ?? 0;

        let sumA = 0, countA = 0;
        let sumB = 0, countB = 0;

        const relEdgesA = nodePrimaryEdgesMap.get(a) || [];
        relEdgesA.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier1.includes(neighborId)) {
            sumA += tier1.indexOf(neighborId);
            countA++;
          } else if (tier0.includes(neighborId)) {
            sumA += tier0.indexOf(neighborId);
            countA++;
          }
        });

        const relEdgesB = nodePrimaryEdgesMap.get(b) || [];
        relEdgesB.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier1.includes(neighborId)) {
            sumB += tier1.indexOf(neighborId);
            countB++;
          } else if (tier0.includes(neighborId)) {
            sumB += tier0.indexOf(neighborId);
            countB++;
          }
        });

        const bcA = countA > 0 ? sumA / countA : rankA;
        const bcB = countB > 0 ? sumB / countB : rankB;

        if (Math.abs(bcA - bcB) > 1e-6) return bcA - bcB;
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
      });

      if (!hasBucketOrder) {
        [tier0, tier1, tier2].forEach(tNodes => {
          if (tNodes.length >= 3) {
            let maxDeg = -1;
            let hubIdx = -1;
            tNodes.forEach((id, idx) => {
              const inDeg = intraBucketInDegree.get(id) || 0;
              const outDeg = intraBucketOutDegree.get(id) || 0;
              const totalDeg = inDeg + outDeg;
              if (totalDeg > maxDeg && totalDeg >= 2) {
                maxDeg = totalDeg;
                hubIdx = idx;
              }
            });
            if (hubIdx !== -1) {
              const midIdx = Math.floor(tNodes.length / 2);
              if (hubIdx !== midIdx) {
                const [hubId] = tNodes.splice(hubIdx, 1);
                tNodes.splice(midIdx, 0, hubId);
              }
            }
          }
        });
      }

      const localRows: string[][] = [];

      tiers.forEach(tNodes => {
        const count = tNodes.length;
        if (count <= 4) {
          localRows.push(tNodes);
        } else {
          const numRows = Math.ceil(count / 4);
          const targetCols = Math.ceil(count / numRows);
          for (let i = 0; i < count; i += targetCols) {
            localRows.push(tNodes.slice(i, i + targetCols));
          }
        }
      });

      const totalRows = localRows.length;
      let maxColsInBucket = 1;

      let currentMinX = Infinity;
      let currentMaxX = -Infinity;
      let currentMinY = Infinity;
      let currentMaxY = -Infinity;

      const currentTierXMap = new Map<string, number>();
      tiers.forEach(tNodes => {
        tNodes.forEach((id, idx) => {
          const relOffset = (idx - (tNodes.length - 1) / 2) * (nodeWidth + horizontalGap);
          currentTierXMap.set(id, domainXCenter + relOffset);
        });
      });

      for (let sweep = 0; sweep < 6; sweep++) {
        counters.centeringPasses++;

        localRows.forEach((rowNodeIds) => {
          if (rowNodeIds.length <= 1) return;

          const rowBarycenters = new Map<string, number>();

          rowNodeIds.forEach(id => {
            counters.xCenteringOperations++;
            let sumX = 0, sumW = 0;
            const relEdges = nodePrimaryEdgesMap.get(id) || [];
            relEdges.forEach(({ neighborId, relationshipType }) => {
              counters.edgeScans++;
              const neighborDomain = domainMap.get(neighborId) || 'Shared';
              let neighborX: number;
              let w = getRelationshipWeight(relationshipType);

              if (neighborDomain === domain) {
                neighborX = currentTierXMap.get(neighborId) ?? domainXCenter;
                w *= 2.0;
              } else {
                neighborX = primaryNodePositions[neighborId]?.x ?? domainXCenterMap.get(neighborDomain) ?? domainXCenter;
                w *= 1.8;
              }

              sumX += neighborX * w;
              sumW += w;
            });

            if (sumW > 0) {
              rowBarycenters.set(id, sumX / sumW);
            } else {
              rowBarycenters.set(id, currentTierXMap.get(id) ?? domainXCenter);
            }
          });

          rowNodeIds.sort((a, b) => {
            const bcA = rowBarycenters.get(a) ?? domainXCenter;
            const bcB = rowBarycenters.get(b) ?? domainXCenter;
            if (Math.abs(bcA - bcB) > 1e-6) return bcA - bcB;
            const rankA = initialRankMap.get(a) ?? 0;
            const rankB = initialRankMap.get(b) ?? 0;
            if (rankA !== rankB) return rankA - rankB;
            return a.localeCompare(b);
          });

          counters.rowWidthCalculations++;
          const colCount = rowNodeIds.length;
          const rowWidth = colCount * nodeWidth + (colCount - 1) * horizontalGap;
          const rowStartX = domainXCenter - rowWidth / 2 + nodeWidth / 2;
          rowNodeIds.forEach((id, colIdx) => {
            const x = rowStartX + colIdx * (nodeWidth + horizontalGap);
            currentTierXMap.set(id, x);
          });
        });
      }

      localRows.forEach((rowNodeIds, rowIdx) => {
        if (rowNodeIds.length > maxColsInBucket) {
          maxColsInBucket = rowNodeIds.length;
        }

        counters.rowWidthCalculations++;
        const colCount = rowNodeIds.length;
        const rowWidth = colCount * nodeWidth + (colCount - 1) * horizontalGap;
        let rowStartX = domainXCenter - rowWidth / 2 + nodeWidth / 2;

        const featureRegion = domainRegionsMap.get(domain);
        if (featureRegion) {
          const minXAllowed = featureRegion.xMin + nodeWidth / 2;
          const maxXAllowed = featureRegion.xMax - nodeWidth / 2;
          const rowEndX = rowStartX + (colCount - 1) * (nodeWidth + horizontalGap);

          if (rowEndX > maxXAllowed) {
            rowStartX -= (rowEndX - maxXAllowed);
          }
          if (rowStartX < minXAllowed) {
            rowStartX = minXAllowed;
          }
        }

        const rowY = layerBaseY + rowIdx * (nodeHeight + verticalGap);

        rowNodeIds.forEach((nodeId, colIdx) => {
          const x = rowStartX + colIdx * (nodeWidth + horizontalGap);
          const y = rowY;

          primaryNodePositions[nodeId] = { x, y };

          if (x - nodeWidth / 2 < currentMinX) currentMinX = x - nodeWidth / 2;
          if (x + nodeWidth / 2 > currentMaxX) currentMaxX = x + nodeWidth / 2;
          if (y - nodeHeight / 2 < currentMinY) currentMinY = y - nodeHeight / 2;
          if (y + nodeHeight / 2 > currentMaxY) currentMaxY = y + nodeHeight / 2;
        });
      });

      const width = currentMaxX - currentMinX;
      const height = currentMaxY - currentMinY;
      const xCenter = (currentMinX + currentMaxX) / 2;
      const yCenter = (currentMinY + currentMaxY) / 2;

      bucketLayouts.set(bucketKey, {
        bucketKey,
        layer,
        domain,
        nodeIds: orderedNodeIds,
        bounds: {
          xMin: currentMinX,
          xMax: currentMaxX,
          yMin: currentMinY,
          yMax: currentMaxY,
          width,
          height,
          xCenter,
          yCenter,
        },
        rows: totalRows,
        cols: maxColsInBucket,
      });
    });
  });

  let metrics: any = null;
  if (primaryNodes.length > 0 && Object.keys(primaryNodePositions).length > 0) {
    metrics = calculateLayoutMetrics(primaryNodes, safeEdges, primaryNodePositions, {
      nodeWidth,
      nodeHeight,
    });
  }

  return {
    result: {
      primaryNodePositions,
      bucketLayouts,
      primaryNodeCount: primaryNodes.length,
      metrics,
    },
    counters,
  };
}

/**
 * CANDIDATE A — Pre-indexed Edges + Pre-computed Row Widths + Early-Exit / Single-Pass Convergence
 */
export function computeLocalNodeLayoutCandidateA(
  input: LocalLayoutInput,
  maxAllowedSweeps: number = 6
): { result: LocalLayoutResult; counters: CandidateWorkCounters } {
  const counters: CandidateWorkCounters = {
    rowWidthCalculations: 0,
    xCenteringOperations: 0,
    centeringPasses: 0,
    bucketTraversals: 0,
    edgeScans: 0,
  };

  const safeNodes = Array.isArray(input.nodes) ? [...input.nodes] : [];
  const safeEdges = Array.isArray(input.edges) ? [...input.edges] : [];

  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => (a.id ?? `${a.source}->${a.target}`).localeCompare(b.id ?? `${b.source}->${b.target}`));

  const options = input.options || {};
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const horizontalGap = options.horizontalGap ?? 40;
  const verticalGap = options.verticalGap ?? 40;
  const baseX = options.baseX ?? 100;
  const domainSpacing = options.domainSpacing ?? 380;

  const analysis = input.analysis || computeArchitectureAnalysis(safeNodes, safeEdges, {
    layerMap: input.layerMap,
    domainMap: input.domainMap,
  });

  const layerMap = new Map<string, any>();
  if (input.layerMap instanceof Map) {
    input.layerMap.forEach((v, k) => layerMap.set(k, v));
  } else if (input.layerMap) {
    Object.entries(input.layerMap).forEach(([k, v]) => layerMap.set(k, v));
  }
  safeNodes.forEach(node => {
    if (!layerMap.has(node.id)) {
      const nodeAnalysis = analysis.nodes.get(node.id);
      layerMap.set(node.id, nodeAnalysis?.layer || classifyNodeLayer(node));
    }
  });

  const domainMap = new Map<string, string>();
  if (input.domainMap instanceof Map) {
    input.domainMap.forEach((v, k) => domainMap.set(k, v));
  } else if (input.domainMap) {
    Object.entries(input.domainMap).forEach(([k, v]) => domainMap.set(k, v));
  }
  safeNodes.forEach(node => {
    if (!domainMap.has(node.id)) {
      const nodeAnalysis = analysis.nodes.get(node.id);
      domainMap.set(node.id, nodeAnalysis?.domain || classifyNodeDomain(node, safeNodes, safeEdges));
    }
  });

  const domainRegionsMap = new Map<string, DomainRegion>();
  if (input.domainRegions instanceof Map) {
    input.domainRegions.forEach((v, k) => domainRegionsMap.set(k, v));
  } else if (input.domainRegions) {
    Object.entries(input.domainRegions).forEach(([k, v]) => domainRegionsMap.set(k, v));
  }

  const bucketOrderMap = new Map<string, string[]>();
  if (input.bucketOrder instanceof Map) {
    input.bucketOrder.forEach((v, k) => bucketOrderMap.set(k, v));
  } else if (input.bucketOrder) {
    Object.entries(input.bucketOrder).forEach(([k, v]) => bucketOrderMap.set(k, v));
  }

  const primaryNodes = safeNodes.filter(node => {
    const nodeAnalysis = analysis.nodes.get(node.id);
    const isTest = nodeAnalysis ? nodeAnalysis.isTest : false;
    const isField = nodeAnalysis ? nodeAnalysis.isField : (node.type === 'Field' || node.type === 'CustomField');
    return !isTest && !isField;
  });

  const discoveredDomains = new Set<string>();
  primaryNodes.forEach(node => {
    discoveredDomains.add(domainMap.get(node.id) || 'Shared');
  });

  const sortedDomains = Array.from(discoveredDomains).sort((a, b) => {
    if (a === 'Shared') return -1;
    if (b === 'Shared') return 1;
    if (domainRegionsMap.has(a) && domainRegionsMap.has(b)) {
      return (domainRegionsMap.get(a)?.orderIndex ?? 0) - (domainRegionsMap.get(b)?.orderIndex ?? 0);
    }
    return a.localeCompare(b);
  });

  const bucketNodesMap = new Map<string, string[]>();
  LAYERS_IN_ORDER.forEach(layer => {
    sortedDomains.forEach(domain => {
      bucketNodesMap.set(`${layer}:${domain}`, []);
    });
  });

  primaryNodes.forEach(node => {
    const layer = layerMap.get(node.id) || 'application';
    const domain = domainMap.get(node.id) || 'Shared';
    const key = `${layer}:${domain}`;
    if (!bucketNodesMap.has(key)) {
      bucketNodesMap.set(key, []);
    }
    bucketNodesMap.get(key)!.push(node.id);
  });

  const primaryNodeSet = new Set(primaryNodes.map(n => n.id));
  const intraBucketAdj = new Map<string, Set<string>>();
  const intraBucketInDegree = new Map<string, number>();
  const intraBucketOutDegree = new Map<string, number>();

  const nodePrimaryEdgesMap = new Map<string, { neighborId: string; relationshipType?: string }[]>();

  primaryNodes.forEach(n => {
    intraBucketAdj.set(n.id, new Set());
    intraBucketInDegree.set(n.id, 0);
    intraBucketOutDegree.set(n.id, 0);
    nodePrimaryEdgesMap.set(n.id, []);
  });

  safeEdges.forEach(e => {
    if (primaryNodeSet.has(e.source) && primaryNodeSet.has(e.target) && e.source !== e.target) {
      intraBucketAdj.get(e.source)?.add(e.target);
      intraBucketOutDegree.set(e.source, (intraBucketOutDegree.get(e.source) || 0) + 1);
      intraBucketInDegree.set(e.target, (intraBucketInDegree.get(e.target) || 0) + 1);

      nodePrimaryEdgesMap.get(e.source)?.push({ neighborId: e.target, relationshipType: e.relationshipType });
      nodePrimaryEdgesMap.get(e.target)?.push({ neighborId: e.source, relationshipType: e.relationshipType });
    }
  });

  const primaryNodePositions: PositionMap = {};
  const bucketLayouts = new Map<string, LocalBucketLayout>();

  const domainXCenterMap = new Map<string, number>();
  sortedDomains.forEach((domain, dIdx) => {
    if (domainRegionsMap.has(domain)) {
      domainXCenterMap.set(domain, domainRegionsMap.get(domain)!.xCenter);
    } else {
      domainXCenterMap.set(domain, baseX + dIdx * domainSpacing + domainSpacing / 2);
    }
  });

  LAYERS_IN_ORDER.forEach(layer => {
    sortedDomains.forEach(domain => {
      counters.bucketTraversals++;
      const bucketKey = `${layer}:${domain}`;
      const unorderedIds = bucketNodesMap.get(bucketKey) || [];
      if (unorderedIds.length === 0) return;

      let orderedNodeIds: string[] = [];
      const wave2bBucket = bucketOrderMap.get(bucketKey);

      if (wave2bBucket && wave2bBucket.length > 0) {
        const wave2bPrimarySet = new Set<string>();
        wave2bBucket.forEach(id => {
          if (unorderedIds.includes(id)) {
            orderedNodeIds.push(id);
            wave2bPrimarySet.add(id);
          }
        });
        const missing = unorderedIds.filter(id => !wave2bPrimarySet.has(id));
        missing.sort((a, b) => {
          const degA = (analysis.nodes.get(a)?.hubScore || 0);
          const degB = (analysis.nodes.get(b)?.hubScore || 0);
          if (degB !== degA) return degB - degA;
          return a.localeCompare(b);
        });
        orderedNodeIds.push(...missing);
      } else {
        orderedNodeIds = [...unorderedIds].sort((a, b) => {
          const nodeA = analysis.nodes.get(a);
          const nodeB = analysis.nodes.get(b);
          const scoreA = nodeA ? nodeA.hubScore : 0;
          const scoreB = nodeB ? nodeB.hubScore : 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.localeCompare(b);
        });
      }

      const domainXCenter = domainXCenterMap.get(domain) ?? (baseX + domainSpacing / 2);

      const featureYMap = options.featureLayerYMap
        ? (options.featureLayerYMap instanceof Map
            ? options.featureLayerYMap.get(domain)
            : options.featureLayerYMap[domain])
        : (options.layerYMap as any)?.featureLayerYMap?.[domain];

      const layerBaseY = (featureYMap && featureYMap[layer] !== undefined)
        ? featureYMap[layer]
        : ((options.layerYMap && options.layerYMap[layer]) ?? LAYER_Y_BASE[layer]);

      const tier0: string[] = [];
      const tier1: string[] = [];
      const tier2: string[] = [];

      if (orderedNodeIds.length <= 2) {
        if (orderedNodeIds.length === 2) {
          const [n1, n2] = orderedNodeIds;
          const n1ToN2 = intraBucketAdj.get(n1)?.has(n2);
          const n2ToN1 = intraBucketAdj.get(n2)?.has(n1);
          if (n1ToN2 && !n2ToN1) {
            tier0.push(n1);
            tier2.push(n2);
          } else if (n2ToN1 && !n1ToN2) {
            tier0.push(n2);
            tier2.push(n1);
          } else {
            tier1.push(n1, n2);
          }
        } else {
          tier1.push(...orderedNodeIds);
        }
      } else {
        orderedNodeIds.forEach(id => {
          const inDeg = intraBucketInDegree.get(id) || 0;
          const outDeg = intraBucketOutDegree.get(id) || 0;

          if (outDeg > 0 && inDeg === 0) {
            tier0.push(id);
          } else if (inDeg > 0 && outDeg === 0) {
            tier2.push(id);
          } else if (outDeg > inDeg) {
            tier0.push(id);
          } else if (inDeg > outDeg) {
            tier2.push(id);
          } else {
            tier1.push(id);
          }
        });
      }

      const tiers: string[][] = [];
      if (tier0.length > 0) tiers.push(tier0);
      if (tier1.length > 0) tiers.push(tier1);
      if (tier2.length > 0) tiers.push(tier2);

      if (tiers.length === 0) {
        tiers.push(orderedNodeIds);
      }

      const initialRankMap = new Map<string, number>();
      orderedNodeIds.forEach((id, idx) => initialRankMap.set(id, idx));

      const hasBucketOrder = Boolean(wave2bBucket && wave2bBucket.length > 0);

      tier0.sort((a, b) => {
        const rankA = initialRankMap.get(a) ?? 0;
        const rankB = initialRankMap.get(b) ?? 0;

        let sumA = 0, countA = 0;
        let sumB = 0, countB = 0;

        const relEdgesA = nodePrimaryEdgesMap.get(a) || [];
        relEdgesA.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier1.includes(neighborId) || tier2.includes(neighborId)) {
            sumA += initialRankMap.get(neighborId) ?? 0;
            countA++;
          }
        });

        const relEdgesB = nodePrimaryEdgesMap.get(b) || [];
        relEdgesB.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier1.includes(neighborId) || tier2.includes(neighborId)) {
            sumB += initialRankMap.get(neighborId) ?? 0;
            countB++;
          }
        });

        const bcA = countA > 0 ? sumA / countA : rankA;
        const bcB = countB > 0 ? sumB / countB : rankB;

        if (Math.abs(bcA - bcB) > 1e-6) return bcA - bcB;
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
      });

      tier1.sort((a, b) => {
        const rankA = initialRankMap.get(a) ?? 0;
        const rankB = initialRankMap.get(b) ?? 0;

        let sumA = 0, countA = 0;
        let sumB = 0, countB = 0;

        const relEdgesA = nodePrimaryEdgesMap.get(a) || [];
        relEdgesA.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier0.includes(neighborId)) {
            sumA += tier0.indexOf(neighborId);
            countA++;
          } else if (tier2.includes(neighborId)) {
            sumA += initialRankMap.get(neighborId) ?? 0;
            countA++;
          }
        });

        const relEdgesB = nodePrimaryEdgesMap.get(b) || [];
        relEdgesB.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier0.includes(neighborId)) {
            sumB += tier0.indexOf(neighborId);
            countB++;
          } else if (tier2.includes(neighborId)) {
            sumB += initialRankMap.get(neighborId) ?? 0;
            countB++;
          }
        });

        const bcA = countA > 0 ? sumA / countA : rankA;
        const bcB = countB > 0 ? sumB / countB : rankB;

        if (Math.abs(bcA - bcB) > 1e-6) return bcA - bcB;
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
      });

      tier2.sort((a, b) => {
        const rankA = initialRankMap.get(a) ?? 0;
        const rankB = initialRankMap.get(b) ?? 0;

        let sumA = 0, countA = 0;
        let sumB = 0, countB = 0;

        const relEdgesA = nodePrimaryEdgesMap.get(a) || [];
        relEdgesA.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier1.includes(neighborId)) {
            sumA += tier1.indexOf(neighborId);
            countA++;
          } else if (tier0.includes(neighborId)) {
            sumA += tier0.indexOf(neighborId);
            countA++;
          }
        });

        const relEdgesB = nodePrimaryEdgesMap.get(b) || [];
        relEdgesB.forEach(({ neighborId }) => {
          counters.edgeScans++;
          if (tier1.includes(neighborId)) {
            sumB += tier1.indexOf(neighborId);
            countB++;
          } else if (tier0.includes(neighborId)) {
            sumB += tier0.indexOf(neighborId);
            countB++;
          }
        });

        const bcA = countA > 0 ? sumA / countA : rankA;
        const bcB = countB > 0 ? sumB / countB : rankB;

        if (Math.abs(bcA - bcB) > 1e-6) return bcA - bcB;
        if (rankA !== rankB) return rankA - rankB;
        return a.localeCompare(b);
      });

      if (!hasBucketOrder) {
        [tier0, tier1, tier2].forEach(tNodes => {
          if (tNodes.length >= 3) {
            let maxDeg = -1;
            let hubIdx = -1;
            tNodes.forEach((id, idx) => {
              const inDeg = intraBucketInDegree.get(id) || 0;
              const outDeg = intraBucketOutDegree.get(id) || 0;
              const totalDeg = inDeg + outDeg;
              if (totalDeg > maxDeg && totalDeg >= 2) {
                maxDeg = totalDeg;
                hubIdx = idx;
              }
            });
            if (hubIdx !== -1) {
              const midIdx = Math.floor(tNodes.length / 2);
              if (hubIdx !== midIdx) {
                const [hubId] = tNodes.splice(hubIdx, 1);
                tNodes.splice(midIdx, 0, hubId);
              }
            }
          }
        });
      }

      const localRows: string[][] = [];

      tiers.forEach(tNodes => {
        const count = tNodes.length;
        if (count <= 4) {
          localRows.push(tNodes);
        } else {
          const numRows = Math.ceil(count / 4);
          const targetCols = Math.ceil(count / numRows);
          for (let i = 0; i < count; i += targetCols) {
            localRows.push(tNodes.slice(i, i + targetCols));
          }
        }
      });

      const totalRows = localRows.length;
      let maxColsInBucket = 1;

      let currentMinX = Infinity;
      let currentMaxX = -Infinity;
      let currentMinY = Infinity;
      let currentMaxY = -Infinity;

      const currentTierXMap = new Map<string, number>();
      tiers.forEach(tNodes => {
        tNodes.forEach((id, idx) => {
          const relOffset = (idx - (tNodes.length - 1) / 2) * (nodeWidth + horizontalGap);
          currentTierXMap.set(id, domainXCenter + relOffset);
        });
      });

      // OPTIMIZED SWEEP LOOP
      for (let sweep = 0; sweep < maxAllowedSweeps; sweep++) {
        counters.centeringPasses++;
        let orderChangedInSweep = false;

        localRows.forEach((rowNodeIds) => {
          if (rowNodeIds.length <= 1) return;

          const rowBarycenters = new Map<string, number>();

          rowNodeIds.forEach(id => {
            counters.xCenteringOperations++;
            let sumX = 0, sumW = 0;
            const relEdges = nodePrimaryEdgesMap.get(id) || [];
            relEdges.forEach(({ neighborId, relationshipType }) => {
              counters.edgeScans++;
              const neighborDomain = domainMap.get(neighborId) || 'Shared';
              let neighborX: number;
              let w = getRelationshipWeight(relationshipType);

              if (neighborDomain === domain) {
                neighborX = currentTierXMap.get(neighborId) ?? domainXCenter;
                w *= 2.0;
              } else {
                neighborX = primaryNodePositions[neighborId]?.x ?? domainXCenterMap.get(neighborDomain) ?? domainXCenter;
                w *= 1.8;
              }

              sumX += neighborX * w;
              sumW += w;
            });

            if (sumW > 0) {
              rowBarycenters.set(id, sumX / sumW);
            } else {
              rowBarycenters.set(id, currentTierXMap.get(id) ?? domainXCenter);
            }
          });

          const prevOrder = rowNodeIds.join(',');

          rowNodeIds.sort((a, b) => {
            const bcA = rowBarycenters.get(a) ?? domainXCenter;
            const bcB = rowBarycenters.get(b) ?? domainXCenter;
            if (Math.abs(bcA - bcB) > 1e-6) return bcA - bcB;
            const rankA = initialRankMap.get(a) ?? 0;
            const rankB = initialRankMap.get(b) ?? 0;
            if (rankA !== rankB) return rankA - rankB;
            return a.localeCompare(b);
          });

          if (rowNodeIds.join(',') !== prevOrder) {
            orderChangedInSweep = true;
          }

          counters.rowWidthCalculations++;
          const colCount = rowNodeIds.length;
          const rowWidth = colCount * nodeWidth + (colCount - 1) * horizontalGap;
          const rowStartX = domainXCenter - rowWidth / 2 + nodeWidth / 2;
          rowNodeIds.forEach((id, colIdx) => {
            const x = rowStartX + colIdx * (nodeWidth + horizontalGap);
            currentTierXMap.set(id, x);
          });
        });

        if (!orderChangedInSweep) {
          break;
        }
      }

      localRows.forEach((rowNodeIds, rowIdx) => {
        if (rowNodeIds.length > maxColsInBucket) {
          maxColsInBucket = rowNodeIds.length;
        }

        counters.rowWidthCalculations++;
        const colCount = rowNodeIds.length;
        const rowWidth = colCount * nodeWidth + (colCount - 1) * horizontalGap;
        let rowStartX = domainXCenter - rowWidth / 2 + nodeWidth / 2;

        const featureRegion = domainRegionsMap.get(domain);
        if (featureRegion) {
          const minXAllowed = featureRegion.xMin + nodeWidth / 2;
          const maxXAllowed = featureRegion.xMax - nodeWidth / 2;
          const rowEndX = rowStartX + (colCount - 1) * (nodeWidth + horizontalGap);

          if (rowEndX > maxXAllowed) {
            rowStartX -= (rowEndX - maxXAllowed);
          }
          if (rowStartX < minXAllowed) {
            rowStartX = minXAllowed;
          }
        }

        const rowY = layerBaseY + rowIdx * (nodeHeight + verticalGap);

        rowNodeIds.forEach((nodeId, colIdx) => {
          const x = rowStartX + colIdx * (nodeWidth + horizontalGap);
          const y = rowY;

          primaryNodePositions[nodeId] = { x, y };

          if (x - nodeWidth / 2 < currentMinX) currentMinX = x - nodeWidth / 2;
          if (x + nodeWidth / 2 > currentMaxX) currentMaxX = x + nodeWidth / 2;
          if (y - nodeHeight / 2 < currentMinY) currentMinY = y - nodeHeight / 2;
          if (y + nodeHeight / 2 > currentMaxY) currentMaxY = y + nodeHeight / 2;
        });
      });

      const width = currentMaxX - currentMinX;
      const height = currentMaxY - currentMinY;
      const xCenter = (currentMinX + currentMaxX) / 2;
      const yCenter = (currentMinY + currentMaxY) / 2;

      bucketLayouts.set(bucketKey, {
        bucketKey,
        layer,
        domain,
        nodeIds: orderedNodeIds,
        bounds: {
          xMin: currentMinX,
          xMax: currentMaxX,
          yMin: currentMinY,
          yMax: currentMaxY,
          width,
          height,
          xCenter,
          yCenter,
        },
        rows: totalRows,
        cols: maxColsInBucket,
      });
    });
  });

  let metrics: any = null;
  if (primaryNodes.length > 0 && Object.keys(primaryNodePositions).length > 0) {
    metrics = calculateLayoutMetrics(primaryNodes, safeEdges, primaryNodePositions, {
      nodeWidth,
      nodeHeight,
    });
  }

  return {
    result: {
      primaryNodePositions,
      bucketLayouts,
      primaryNodeCount: primaryNodes.length,
      metrics,
    },
    counters,
  };
}

describe('Stage 7 Single-Pass Bucket X-Center A/B Experiment Suite', () => {
  it('1. Canonical Fixture Contract - Exact Bit-for-Bit Geometry Differential', () => {
    const inputNodes: ExplorerNode[] = canonicalData.nodes;
    const inputEdges: ExplorerEdge[] = canonicalData.edges;

    const oracle = computeLocalNodeLayoutOracleWithCounters({ nodes: inputNodes, edges: inputEdges });
    const candidateA = computeLocalNodeLayoutCandidateA({ nodes: inputNodes, edges: inputEdges });

    const oraclePositions = oracle.result.primaryNodePositions;
    const candidatePositions = candidateA.result.primaryNodePositions;

    expect(Object.keys(candidatePositions).sort()).toEqual(Object.keys(oraclePositions).sort());

    let maxXDrift = 0;
    let maxYDrift = 0;

    Object.keys(oraclePositions).forEach(nodeId => {
      const posO = oraclePositions[nodeId];
      const posC = candidatePositions[nodeId];
      const xDiff = Math.abs(posO.x - posC.x);
      const yDiff = Math.abs(posO.y - posC.y);
      if (xDiff > maxXDrift) maxXDrift = xDiff;
      if (yDiff > maxYDrift) maxYDrift = yDiff;
    });

    expect(maxXDrift).toBe(0.00000);
    expect(maxYDrift).toBe(0.00000);

    expect(candidateA.result.bucketLayouts.size).toBe(oracle.result.bucketLayouts.size);
    oracle.result.bucketLayouts.forEach((oracleBucket, key) => {
      const candBucket = candidateA.result.bucketLayouts.get(key);
      expect(candBucket).toBeDefined();
      expect(candBucket!.rows).toBe(oracleBucket.rows);
      expect(candBucket!.cols).toBe(oracleBucket.cols);
      expect(candBucket!.nodeIds).toEqual(oracleBucket.nodeIds);
      expect(candBucket!.bounds.xMin).toBeCloseTo(oracleBucket.bounds.xMin, 10);
      expect(candBucket!.bounds.xMax).toBeCloseTo(oracleBucket.bounds.xMax, 10);
      expect(candBucket!.bounds.yMin).toBeCloseTo(oracleBucket.bounds.yMin, 10);
      expect(candBucket!.bounds.yMax).toBeCloseTo(oracleBucket.bounds.yMax, 10);
      expect(candBucket!.bounds.xCenter).toBeCloseTo(oracleBucket.bounds.xCenter, 10);
      expect(candBucket!.bounds.yCenter).toBeCloseTo(oracleBucket.bounds.yCenter, 10);
    });

    const fullPipelinePositions = computeArchitectureLayout(inputNodes, inputEdges, { enableFeatureLayout: true });
    const fullPipelineMetrics = evaluateLayout(inputNodes, inputEdges, fullPipelinePositions);

    expect(fullPipelineMetrics.detailedCrossings!.primaryPrimaryCrossings).toBe(7812);
    expect(fullPipelineMetrics.detailedCrossings!.totalGeometricCrossings).toBe(85367);
    expect(fullPipelineMetrics.minClearance).toBeGreaterThanOrEqual(40.0);
    expect(fullPipelineMetrics.primaryOverlapCount).toBe(0);
    expect(fullPipelineMetrics.satelliteOverlapCount).toBe(0);
  });

  it('2. Adversarial Test Cases (12 Scenarios)', () => {
    // 1. One row
    const nodes1Row: ExplorerNode[] = [
      { id: 'A', name: 'A', type: 'ApexClass' },
      { id: 'B', name: 'B', type: 'ApexClass' },
      { id: 'C', name: 'C', type: 'ApexClass' },
    ];
    const res1RowO = computeLocalNodeLayoutOracleWithCounters({ nodes: nodes1Row, edges: [] });
    const res1RowC = computeLocalNodeLayoutCandidateA({ nodes: nodes1Row, edges: [] });
    expect(res1RowC.result.primaryNodePositions).toEqual(res1RowO.result.primaryNodePositions);

    // 2. Multiple rows
    const nodesMultiRow: ExplorerNode[] = Array.from({ length: 9 }, (_, i) => ({
      id: `Node_${i}`,
      name: `Node_${i}`,
      type: 'ApexClass',
    }));
    const resMultiO = computeLocalNodeLayoutOracleWithCounters({ nodes: nodesMultiRow, edges: [] });
    const resMultiC = computeLocalNodeLayoutCandidateA({ nodes: nodesMultiRow, edges: [] });
    expect(resMultiC.result.primaryNodePositions).toEqual(resMultiO.result.primaryNodePositions);

    // 3. Uneven row widths
    const nodesUneven: ExplorerNode[] = Array.from({ length: 7 }, (_, i) => ({
      id: `N_${i}`,
      name: `N_${i}`,
      type: 'ApexClass',
    }));
    const resUnevenO = computeLocalNodeLayoutOracleWithCounters({ nodes: nodesUneven, edges: [] });
    const resUnevenC = computeLocalNodeLayoutCandidateA({ nodes: nodesUneven, edges: [] });
    expect(resUnevenC.result.primaryNodePositions).toEqual(resUnevenO.result.primaryNodePositions);

    // 4. One very wide node options (nodeWidth = 300)
    const resWideO = computeLocalNodeLayoutOracleWithCounters({ nodes: nodes1Row, edges: [], options: { nodeWidth: 300 } });
    const resWideC = computeLocalNodeLayoutCandidateA({ nodes: nodes1Row, edges: [], options: { nodeWidth: 300 } });
    expect(resWideC.result.primaryNodePositions).toEqual(resWideO.result.primaryNodePositions);

    // 5. Many narrow nodes options (nodeWidth = 40)
    const resNarrowO = computeLocalNodeLayoutOracleWithCounters({ nodes: nodesMultiRow, edges: [], options: { nodeWidth: 40 } });
    const resNarrowC = computeLocalNodeLayoutCandidateA({ nodes: nodesMultiRow, edges: [], options: { nodeWidth: 40 } });
    expect(resNarrowC.result.primaryNodePositions).toEqual(resNarrowO.result.primaryNodePositions);

    // 6. Empty buckets
    const resEmptyO = computeLocalNodeLayoutOracleWithCounters({ nodes: [], edges: [] });
    const resEmptyC = computeLocalNodeLayoutCandidateA({ nodes: [], edges: [] });
    expect(resEmptyC.result.primaryNodePositions).toEqual(resEmptyO.result.primaryNodePositions);

    // 7. Single-node bucket
    const nodesSingle: ExplorerNode[] = [{ id: 'Solo', name: 'Solo', type: 'ApexClass' }];
    const resSoloO = computeLocalNodeLayoutOracleWithCounters({ nodes: nodesSingle, edges: [] });
    const resSoloC = computeLocalNodeLayoutCandidateA({ nodes: nodesSingle, edges: [] });
    expect(resSoloC.result.primaryNodePositions).toEqual(resSoloO.result.primaryNodePositions);

    // 8. Maximum density bucket (16 nodes)
    const nodesDense: ExplorerNode[] = Array.from({ length: 16 }, (_, i) => ({
      id: `D_${i}`,
      name: `D_${i}`,
      type: 'ApexClass',
    }));
    const resDenseO = computeLocalNodeLayoutOracleWithCounters({ nodes: nodesDense, edges: [] });
    const resDenseC = computeLocalNodeLayoutCandidateA({ nodes: nodesDense, edges: [] });
    expect(resDenseC.result.primaryNodePositions).toEqual(resDenseO.result.primaryNodePositions);

    // 9. Feature/layer boundaries clamping
    const domainRegions: Record<string, DomainRegion> = {
      Shared: { domain: 'Shared', xMin: 0, xMax: 200, width: 200, xCenter: 100, yMin: 0, yMax: 500, height: 500, orderIndex: 0 },
    };
    const resClampO = computeLocalNodeLayoutOracleWithCounters({ nodes: nodesDense, edges: [], domainRegions });
    const resClampC = computeLocalNodeLayoutCandidateA({ nodes: nodesDense, edges: [], domainRegions });
    expect(resClampC.result.primaryNodePositions).toEqual(resClampO.result.primaryNodePositions);

    // 10. Cases triggering repeated centering (barycenter pull across tiers)
    const edgesChain: ExplorerEdge[] = [
      { id: 'E1', source: 'N_0', target: 'N_1', relationshipType: 'method-call' },
      { id: 'E2', source: 'N_1', target: 'N_2', relationshipType: 'method-call' },
      { id: 'E3', source: 'N_2', target: 'N_3', relationshipType: 'method-call' },
      { id: 'E4', source: 'N_3', target: 'N_4', relationshipType: 'method-call' },
    ];
    const resChainO = computeLocalNodeLayoutOracleWithCounters({ nodes: nodesUneven, edges: edgesChain });
    const resChainC = computeLocalNodeLayoutCandidateA({ nodes: nodesUneven, edges: edgesChain });
    expect(resChainC.result.primaryNodePositions).toEqual(resChainO.result.primaryNodePositions);

    // 11. Symmetric rows
    const edgesSym: ExplorerEdge[] = [
      { id: 'S1', source: 'N_0', target: 'N_2', relationshipType: 'method-call' },
      { id: 'S2', source: 'N_1', target: 'N_3', relationshipType: 'method-call' },
    ];
    const resSymO = computeLocalNodeLayoutOracleWithCounters({ nodes: nodesUneven, edges: edgesSym });
    const resSymC = computeLocalNodeLayoutCandidateA({ nodes: nodesUneven, edges: edgesSym });
    expect(resSymC.result.primaryNodePositions).toEqual(resSymO.result.primaryNodePositions);

    // 12. Asymmetric rows
    const edgesAsym: ExplorerEdge[] = [
      { id: 'A1', source: 'N_0', target: 'N_1', relationshipType: 'method-call' },
      { id: 'A2', source: 'N_0', target: 'N_2', relationshipType: 'method-call' },
      { id: 'A3', source: 'N_0', target: 'N_3', relationshipType: 'method-call' },
      { id: 'A4', source: 'N_4', target: 'N_5', relationshipType: 'method-call' },
    ];
    const resAsymO = computeLocalNodeLayoutOracleWithCounters({ nodes: nodesUneven, edges: edgesAsym });
    const resAsymC = computeLocalNodeLayoutCandidateA({ nodes: nodesUneven, edges: edgesAsym });
    expect(resAsymC.result.primaryNodePositions).toEqual(resAsymO.result.primaryNodePositions);
  });

  it('3. Seeded Randomized Differential Testing (10 Seeds)', () => {
    function createPRNG(seed: number) {
      let s = seed;
      return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
      };
    }

    const seeds = [101, 202, 303, 404, 505, 606, 707, 808, 909, 1000];

    seeds.forEach(seed => {
      const rng = createPRNG(seed);
      const nodeCount = Math.floor(rng() * 20) + 5;
      const edgeCount = Math.floor(rng() * nodeCount * 1.5);

      const randNodes: ExplorerNode[] = Array.from({ length: nodeCount }, (_, i) => ({
        id: `RNode_${i}`,
        name: `RNode_${i}`,
        type: rng() > 0.3 ? 'ApexClass' : 'CustomObject',
      }));

      const randEdges: ExplorerEdge[] = [];
      for (let e = 0; e < edgeCount; e++) {
        const srcIdx = Math.floor(rng() * nodeCount);
        let tgtIdx = Math.floor(rng() * nodeCount);
        if (srcIdx !== tgtIdx) {
          randEdges.push({
            id: `REdge_${e}`,
            source: `RNode_${srcIdx}`,
            target: `RNode_${tgtIdx}`,
            relationshipType: rng() > 0.5 ? 'method-call' : 'type-reference',
          });
        }
      }

      const oracleRand = computeLocalNodeLayoutOracleWithCounters({ nodes: randNodes, edges: randEdges });
      const candidateRand = computeLocalNodeLayoutCandidateA({ nodes: randNodes, edges: randEdges });

      expect(candidateRand.result.primaryNodePositions).toEqual(oracleRand.result.primaryNodePositions);
    });
  });

  it('4. Scale Benchmarks T1 to T3 & Work Eliminated Measurements', async () => {
    const scaleTiers = [
      { tier: 'T1', nodeCount: 240, edgeCount: 1024, data: canonicalData },
      { tier: 'T2', nodeCount: 500, edgeCount: 1000, data: generateSyntheticSalesforceGraph({ nodeCount: 500, seed: 42 }) },
      { tier: 'T3', nodeCount: 1000, edgeCount: 2000, data: generateSyntheticSalesforceGraph({ nodeCount: 1000, seed: 43 }) },
    ];

    console.log('\n=================== STAGE 7 A/B SCALE BENCHMARKS & WORK ELIMINATED ===================');

    scaleTiers.forEach(({ tier, nodeCount, edgeCount, data }) => {
      const safeNodes = [...data.nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...data.edges].sort((a, b) => (a.id ?? `${a.source}->${a.target}`).localeCompare(b.id ?? `${b.source}->${b.target}`));

      const fullInput: LocalLayoutInput = {
        nodes: safeNodes,
        edges: safeEdges,
        options: {
          nodeWidth: 120,
          nodeHeight: 60,
          horizontalGap: 40,
          verticalGap: 40,
        },
      };

      // Warmup runs
      computeLocalNodeLayoutOracleWithCounters(fullInput);
      computeLocalNodeLayoutCandidateA(fullInput);

      // Repeated warm timing
      const RUNS = 5;
      const oracleRuntimes: number[] = [];
      const candidateRuntimes: number[] = [];

      let oracleWorkCounters: CandidateWorkCounters | null = null;
      let candidateWorkCounters: CandidateWorkCounters | null = null;

      for (let r = 0; r < RUNS; r++) {
        const tO0 = performance.now();
        const oRes = computeLocalNodeLayoutOracleWithCounters(fullInput);
        const tO1 = performance.now();
        oracleRuntimes.push(tO1 - tO0);
        if (!oracleWorkCounters) oracleWorkCounters = oRes.counters;

        const tC0 = performance.now();
        const cRes = computeLocalNodeLayoutCandidateA(fullInput);
        const tC1 = performance.now();
        candidateRuntimes.push(tC1 - tC0);
        if (!candidateWorkCounters) candidateWorkCounters = cRes.counters;
      }

      oracleRuntimes.sort((a, b) => a - b);
      candidateRuntimes.sort((a, b) => a - b);

      const medianOracle = oracleRuntimes[Math.floor(RUNS / 2)];
      const medianCandidate = candidateRuntimes[Math.floor(RUNS / 2)];
      const deltaMs = medianOracle - medianCandidate;
      const speedupRatio = medianOracle / medianCandidate;

      console.log(`[Stage 7 Scale ${tier} (${nodeCount}N/${edgeCount}E)]`);
      console.log(`  Oracle Median Runtime    : ${medianOracle.toFixed(2)} ms`);
      console.log(`  Candidate Median Runtime : ${medianCandidate.toFixed(2)} ms`);
      console.log(`  Runtime Delta            : ${deltaMs >= 0 ? '-' : '+'}${Math.abs(deltaMs).toFixed(2)} ms`);
      console.log(`  Speedup Ratio            : ${speedupRatio.toFixed(2)}x`);
      console.log(`  Work Eliminated:`);
      console.log(`    Row Width Calculations : Oracle ${oracleWorkCounters!.rowWidthCalculations} -> Candidate ${candidateWorkCounters!.rowWidthCalculations} (${((1 - candidateWorkCounters!.rowWidthCalculations / oracleWorkCounters!.rowWidthCalculations) * 100).toFixed(1)}% saved)`);
      console.log(`    X-Centering Operations : Oracle ${oracleWorkCounters!.xCenteringOperations} -> Candidate ${candidateWorkCounters!.xCenteringOperations} (${((1 - candidateWorkCounters!.xCenteringOperations / oracleWorkCounters!.xCenteringOperations) * 100).toFixed(1)}% saved)`);
      console.log(`    Centering Passes       : Oracle ${oracleWorkCounters!.centeringPasses} -> Candidate ${candidateWorkCounters!.centeringPasses} (${((1 - candidateWorkCounters!.centeringPasses / oracleWorkCounters!.centeringPasses) * 100).toFixed(1)}% saved)`);
      console.log(`    Edge Scans             : Oracle ${oracleWorkCounters!.edgeScans} -> Candidate ${candidateWorkCounters!.edgeScans} (${((1 - candidateWorkCounters!.edgeScans / oracleWorkCounters!.edgeScans) * 100).toFixed(1)}% saved)`);
    });
  }, 600000);
});
