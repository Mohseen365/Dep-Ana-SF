import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from '../lib/layout/centrality';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeGlobalDomainLayout } from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { placeSatellites } from '../lib/layout/satellites';
import { resolveSpacingAndCollisions } from '../lib/layout/spacing';
import { packComponentPositions, calculateLocalComponentBounds, ComponentLocalLayout } from '../lib/layout/components';
import { calculateLayoutMetrics } from '../lib/layout/metrics';

interface Dataset {
  key: string;
  file: string;
}

const DATASETS: Dataset[] = [
  { key: 'cst', file: 'public/projects/cst/explorer-data.json' },
  { key: 'bqc', file: 'public/projects/bqc/explorer-data.json' },
  { key: 'pbim', file: 'public/projects/pbim/explorer-data.json' },
];

function loadDataset(dataset: Dataset): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const p1 = path.resolve(process.cwd(), dataset.file);
  const p2 = path.resolve(__dirname, '../../', dataset.file);
  const fullPath = fs.existsSync(p1) ? p1 : p2;
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

function calcPercentiles(arr: number[]): {
  min: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
} {
  if (arr.length === 0) {
    return { min: 0, p25: 0, median: 0, p75: 0, p90: 0, p95: 0, p99: 0, max: 0, mean: 0 };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;

  const getPercentile = (p: number) => {
    if (sorted.length === 1) return sorted[0];
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  return {
    min: sorted[0],
    p25: getPercentile(25),
    median: getPercentile(50),
    p75: getPercentile(75),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99),
    max: sorted[sorted.length - 1],
    mean,
  };
}

function getLayerY(layerYMap: any, layer: string): number {
  if (!layerYMap) return 0;
  if (typeof layerYMap.get === 'function') return layerYMap.get(layer) || 0;
  return layerYMap[layer] ?? 0;
}

// Unbounded 1D Stage 8 simulation for Pre-SB1C baseline
function computePreSB1CStage8(
  safeNodes: ExplorerNode[],
  centralityMap: Map<string, any>,
  layerMap: Map<string, string>,
  analysis: any,
  domainXCenters: Record<string, number>,
  globalDomainResult: any,
  primaryPositions: Record<string, { x: number; y: number }>
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = { ...primaryPositions };

  safeNodes.forEach(node => {
    if (isTestNode(node) || isFieldNode(node)) return;
    const centrality = centralityMap.get(node.id);
    if (centrality?.isBridge && !centrality.isHub) {
      const layer = layerMap.get(node.id) || 'application';
      const baseY = getLayerY(globalDomainResult.layerYMap, layer);

      const sortedConnectedDomains = [...centrality.connectedDomains].sort((a, b) => a.localeCompare(b));
      let sumX = 0;
      let dCount = 0;
      for (const d of sortedConnectedDomains) {
        if (domainXCenters[d] !== undefined) {
          sumX += domainXCenters[d];
          dCount++;
        }
      }
      let candidateX = dCount > 0 ? sumX / dCount : 0;

      let finalX = candidateX;
      let step = 0;
      while (step < 500) {
        let trialX = candidateX;
        if (step > 0) {
          const dir = step % 2 === 1 ? 1 : -1;
          const mag = Math.ceil(step / 2) * 160;
          trialX = candidateX + dir * mag;
        }

        let collision = false;
        for (const [pId, pos] of Object.entries(positions)) {
          if (Math.abs(pos.y - baseY) < 1e-3 && Math.abs(pos.x - trialX) < 160 - 1e-3) {
            collision = true;
            break;
          }
        }

        if (!collision) {
          finalX = trialX;
          break;
        }
        step++;
      }

      positions[node.id] = { x: finalX, y: baseY };
    }
  });

  return positions;
}

const allSummaries: Record<string, any> = {};

describe('Phase 4 — SB-1C Spatial Density Truth Audit Measurement Runner', () => {
  for (const ds of DATASETS) {
    test(`Phase 4 Spatial Density Measurements for ${ds.key.toUpperCase()}`, { timeout: 120000 }, () => {
      const { nodes, edges } = loadDataset(ds);

      const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

      const index = createLayoutGraphIndex(safeNodes, safeEdges);
      let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
      const layerMap = new Map<string, string>();
      safeNodes.forEach(node => {
        layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
      });
      analysis = applyLayerClassification(analysis, layerMap);

      const domainDiscovery = discoverDomains(safeNodes, safeEdges);
      const domainMap = new Map<string, string>();
      domainDiscovery.assignments.forEach((assignment, nodeId) => {
        domainMap.set(nodeId, assignment.primaryDomain);
      });
      analysis = applyDomainClassification(analysis, domainMap);

      const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

      const bridgeNodes: ExplorerNode[] = [];
      safeNodes.forEach(n => {
        const c = centralityMap.get(n.id);
        if (c?.isBridge && !c.isHub) {
          bridgeNodes.push(n);
        }
      });

      // Pipeline Stage Reconstructions
      const globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
        domainSpacing: 380,
        layerSpacing: 250,
        nodeWidth: 120,
        nodeHeight: 60,
        analysis,
        domainDiscovery,
        layerMap,
        domainMap,
        index,
      });

      const domainXCenters: Record<string, number> = {};
      const domainBounds: Record<string, { minX: number; maxX: number }> = {};
      globalDomainResult.domainRegions.forEach((region, domain) => {
        domainXCenters[domain] = region.xCenter;
        domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
      });

      const orderingResult = reduceEdgeCrossings({
        nodes: safeNodes,
        edges: safeEdges,
        layerMap,
        domainMap,
        domainOrder: globalDomainResult.orderedDomains,
        layerYMap: globalDomainResult.layerYMap,
      });

      const localResult = computeLocalNodeLayout({
        nodes: safeNodes,
        edges: safeEdges,
        analysis,
        domainRegions: globalDomainResult.domainRegions,
        layerMap,
        domainMap,
        bucketOrder: orderingResult.bucketOrder,
        options: {
          nodeWidth: 120,
          nodeHeight: 60,
          domainSpacing: 380,
          layerYMap: globalDomainResult.layerYMap,
        },
      });

      const stage7Positions: Record<string, { x: number; y: number }> = {
        ...localResult.primaryNodePositions,
      };

      const preSB1CStage8Positions = computePreSB1CStage8(
        safeNodes,
        centralityMap,
        layerMap,
        analysis,
        domainXCenters,
        globalDomainResult,
        stage7Positions
      );

      const preSB1CStage9 = placeSatellites(safeNodes, safeEdges, analysis, preSB1CStage8Positions, {
        nodeWidth: 120,
        nodeHeight: 60,
        layerSpacing: 250,
        layerYOffsets: globalDomainResult.layerYMap,
        index,
      });
      const preSB1CFinalCleanup = resolveSpacingAndCollisions({
        nodes: safeNodes,
        edges: safeEdges,
        positions: preSB1CStage9.positions,
        analysis,
        options: {
          nodeWidth: 120,
          nodeHeight: 60,
          layerMap,
          domainMap,
        },
      });
      const preSB1CFinalPositions = preSB1CFinalCleanup.positions;

      const stage8Positions: Record<string, { x: number; y: number }> = {
        ...stage7Positions,
      };

      const stage8Start = Date.now();
      safeNodes.forEach(node => {
        if (isTestNode(node) || isFieldNode(node)) return;
        const centrality = centralityMap.get(node.id);
        if (centrality?.isBridge && !centrality.isHub) {
          const neighborPositions: Record<string, { x: number; y: number }> = {};
          const nodeAnalysis = analysis.nodes.get(node.id);
          nodeAnalysis?.neighborIds.forEach(nId => {
            if (stage8Positions[nId]) {
              neighborPositions[nId] = stage8Positions[nId];
            }
          });

          const bridgeInfo = calculateBridgeCandidatePosition(
            node.id,
            layerMap.get(node.id) || 'application',
            centrality.connectedDomains,
            domainXCenters,
            domainBounds,
            neighborPositions,
            {
              layerSpacing: 250,
              nodeWidth: 120,
              nodeHeight: 60,
              layerYOffsets: globalDomainResult.layerYMap,
              index,
              allocatedPositions: stage8Positions,
            }
          );

          stage8Positions[node.id] = bridgeInfo.candidatePosition;
        }
      });
      const stage8IsolatedTime = Date.now() - stage8Start;

      const stage9Result = placeSatellites(safeNodes, safeEdges, analysis, stage8Positions, {
        nodeWidth: 120,
        nodeHeight: 60,
        layerSpacing: 250,
        layerYOffsets: globalDomainResult.layerYMap,
        index,
      });
      const stage9Positions = stage9Result.positions;

      let stage10Positions: Record<string, { x: number; y: number }> = {
        ...stage9Positions,
      };
      if (analysis.components.length > 1) {
        const componentLayouts: ComponentLocalLayout[] = analysis.components
          .map(comp => {
            const posMap: Record<string, { x: number; y: number }> = {};
            let minNodeId: string | undefined = undefined;
            let importance = 0;
            for (const nodeId of comp.nodeIds) {
              const pos = stage9Positions[nodeId];
              if (pos) {
                posMap[nodeId] = pos;
                if (!minNodeId || nodeId.localeCompare(minNodeId) < 0) minNodeId = nodeId;
                const c = centralityMap.get(nodeId);
                if (c) importance += c.hubScore + c.bridgeScore;
              }
            }
            return {
              id: comp.componentId,
              positions: posMap,
              nodeWidth: 120,
              nodeHeight: 60,
              structuralImportance: importance,
              minNodeId,
            };
          })
          .filter(c => Object.keys(c.positions).length > 0);

        if (componentLayouts.length > 1) {
          const compWidths = componentLayouts.map(c => {
            const bounds = calculateLocalComponentBounds(c.positions, 120, 60);
            return bounds.width;
          }).sort((a, b) => b - a);
          const maxW = compWidths[0] || 120;
          const secondMaxW = compWidths[1] || 120;
          const minRowWidth = maxW + secondMaxW + 100;
          let totalCompArea = 0;
          componentLayouts.forEach(c => {
            const bounds = calculateLocalComponentBounds(c.positions, 120, 60);
            totalCompArea += (bounds.width + 100) * (bounds.height + 100);
          });
          const targetWidth = Math.max(Math.sqrt(totalCompArea * 1.6), minRowWidth);
          const packed = packComponentPositions(componentLayouts, {
            gap: 100,
            targetWidth,
            targetAspectRatio: 1.6,
            nodeWidth: 120,
            nodeHeight: 60,
          });
          stage10Positions = packed.positions;
        }
      }

      const stage11Result = resolveSpacingAndCollisions({
        nodes: safeNodes,
        edges: safeEdges,
        positions: stage10Positions,
        analysis,
        options: {
          nodeWidth: 120,
          nodeHeight: 60,
          layerMap,
          domainMap,
        },
      });
      const stage11Positions = stage11Result.positions;

      const fullPipelineStart = Date.now();
      const fullOutput = computeArchitectureLayoutWithMetadata(safeNodes, safeEdges);
      const fullPipelineTime = Date.now() - fullPipelineStart;
      const finalPositions = fullOutput.positions;

      const getWidth = (posMap: Record<string, { x: number; y: number }>) => {
        let minX = Infinity;
        let maxX = -Infinity;
        Object.values(posMap).forEach(pos => {
          if (pos.x < minX) minX = pos.x;
          if (pos.x + 120 > maxX) maxX = pos.x + 120;
        });
        return maxX - minX;
      };

      const cWidths = {
        stage7: getWidth(stage7Positions),
        preSB1CStage8: getWidth(preSB1CStage8Positions),
        preSB1CFinal: getWidth(preSB1CFinalPositions),
        sb1cStage8: getWidth(stage8Positions),
        sb1cStage9: getWidth(stage9Positions),
        sb1cStage10: getWidth(stage10Positions),
        sb1cStage11: getWidth(stage11Positions),
        sb1cFinal: getWidth(finalPositions),
      };

      const computeSemanticDistances = (posMap: Record<string, { x: number; y: number }>) => {
        const minDists: number[] = [];
        const maxDists: number[] = [];
        const meanDists: number[] = [];
        const medianDists: number[] = [];
        const absXList: number[] = [];
        const absYList: number[] = [];
        const perBridgeDetails: Array<{
          bridgeId: string;
          neighbors: string[];
          minD: number;
          maxD: number;
          meanD: number;
          medianD: number;
          maxAbsX: number;
          maxAbsY: number;
        }> = [];

        bridgeNodes.forEach(bNode => {
          const bPos = posMap[bNode.id];
          if (!bPos) return;

          const nIds = analysis.nodes.get(bNode.id)?.neighborIds || [];
          const dists: number[] = [];
          let maxAbsX = 0;
          let maxAbsY = 0;

          nIds.forEach(nId => {
            const nPos = posMap[nId];
            if (!nPos) return;
            const dx = Math.abs(bPos.x - nPos.x);
            const dy = Math.abs(bPos.y - nPos.y);
            const dist = Math.sqrt(dx * dx + dy * dy);
            dists.push(dist);
            if (dx > maxAbsX) maxAbsX = dx;
            if (dy > maxAbsY) maxAbsY = dy;
          });

          if (dists.length > 0) {
            const p = calcPercentiles(dists);
            minDists.push(p.min);
            maxDists.push(p.max);
            meanDists.push(p.mean);
            medianDists.push(p.median);
            absXList.push(maxAbsX);
            absYList.push(maxAbsY);

            perBridgeDetails.push({
              bridgeId: bNode.id,
              neighbors: [...nIds],
              minD: p.min,
              maxD: p.max,
              meanD: p.mean,
              medianD: p.median,
              maxAbsX,
              maxAbsY,
            });
          }
        });

        return {
          minPercentiles: calcPercentiles(minDists),
          maxPercentiles: calcPercentiles(maxDists),
          meanPercentiles: calcPercentiles(meanDists),
          medianPercentiles: calcPercentiles(medianDists),
          absXPercentiles: calcPercentiles(absXList),
          absYPercentiles: calcPercentiles(absYList),
          perBridgeDetails,
        };
      };

      const preSB1CSemantic = computeSemanticDistances(preSB1CFinalPositions);
      const sb1cStage8Semantic = computeSemanticDistances(stage8Positions);
      const sb1cFinalSemantic = computeSemanticDistances(finalPositions);

      const computeCorridorLocality = (posMap: Record<string, { x: number; y: number }>) => {
        const nearestDomainDists: number[] = [];
        const farthestDomainDists: number[] = [];
        const distFromMidpoint: number[] = [];
        const distFromBoundary: number[] = [];

        bridgeNodes.forEach(bNode => {
          const bPos = posMap[bNode.id];
          if (!bPos) return;

          const centrality = centralityMap.get(bNode.id);
          const connDomains = [...(centrality?.connectedDomains || [])].sort((a, b) => a.localeCompare(b));

          let minDomainDist = Infinity;
          let maxDomainDist = -Infinity;
          let sumX = 0;
          let dCount = 0;
          let minConnX = Infinity;
          let maxConnX = -Infinity;

          connDomains.forEach(d => {
            const cx = domainXCenters[d];
            if (cx !== undefined) {
              const dX = Math.abs(bPos.x - cx);
              if (dX < minDomainDist) minDomainDist = dX;
              if (dX > maxDomainDist) maxDomainDist = dX;
              sumX += cx;
              dCount++;
            }
            const bounds = domainBounds[d];
            if (bounds) {
              if (bounds.minX < minConnX) minConnX = bounds.minX;
              if (bounds.maxX > maxConnX) maxConnX = bounds.maxX;
            }
          });

          if (dCount > 0) {
            const midpointX = sumX / dCount;
            nearestDomainDists.push(minDomainDist);
            farthestDomainDists.push(maxDomainDist);
            distFromMidpoint.push(Math.abs(bPos.x - midpointX));

            const legalMin = minConnX - 160;
            const legalMax = maxConnX + 160;
            let bDist = 0;
            if (bPos.x < legalMin) bDist = legalMin - bPos.x;
            else if (bPos.x > legalMax) bDist = bPos.x - legalMax;
            distFromBoundary.push(bDist);
          }
        });

        return {
          nearestDomain: calcPercentiles(nearestDomainDists),
          farthestDomain: calcPercentiles(farthestDomainDists),
          midpointDist: calcPercentiles(distFromMidpoint),
          boundaryDist: calcPercentiles(distFromBoundary),
        };
      };

      const sb1cStage8Corridor = computeCorridorLocality(stage8Positions);
      const sb1cFinalCorridor = computeCorridorLocality(finalPositions);

      const computeDisplacements = () => {
        const s7_s8: number[] = [];
        const s8_s9: number[] = [];
        const s8_s10: number[] = [];
        const s8_s11: number[] = [];
        const s8_final: number[] = [];
        const s7_final: number[] = [];

        bridgeNodes.forEach(bNode => {
          const p7 = stage7Positions[bNode.id];
          const p8 = stage8Positions[bNode.id];
          const p9 = stage9Positions[bNode.id];
          const p10 = stage10Positions[bNode.id];
          const p11 = stage11Positions[bNode.id];
          const pFinal = finalPositions[bNode.id];

          if (p7 && p8) {
            s7_s8.push(Math.sqrt(Math.pow(p8.x - p7.x, 2) + Math.pow(p8.y - p7.y, 2)));
          }
          if (p8 && p9) {
            s8_s9.push(Math.sqrt(Math.pow(p9.x - p8.x, 2) + Math.pow(p9.y - p8.y, 2)));
          }
          if (p8 && p10) {
            s8_s10.push(Math.sqrt(Math.pow(p10.x - p8.x, 2) + Math.pow(p10.y - p8.y, 2)));
          }
          if (p8 && p11) {
            s8_s11.push(Math.sqrt(Math.pow(p11.x - p8.x, 2) + Math.pow(p11.y - p8.y, 2)));
          }
          if (p8 && pFinal) {
            s8_final.push(Math.sqrt(Math.pow(pFinal.x - p8.x, 2) + Math.pow(pFinal.y - p8.y, 2)));
          }
          if (p7 && pFinal) {
            s7_final.push(Math.sqrt(Math.pow(pFinal.x - p7.x, 2) + Math.pow(pFinal.y - p7.y, 2)));
          }
        });

        return {
          s7_s8: calcPercentiles(s7_s8),
          s8_s9: calcPercentiles(s8_s9),
          s8_s10: calcPercentiles(s8_s10),
          s8_s11: calcPercentiles(s8_s11),
          s8_final: calcPercentiles(s8_final),
          s7_final: calcPercentiles(s7_final),
        };
      };

      const displacements = computeDisplacements();

      const computeDensity = (posMap: Record<string, { x: number; y: number }>) => {
        const width = getWidth(posMap);
        const nodesPer1000px = (safeNodes.length / width) * 1000;

        const arbitraryNNDists: number[] = [];
        safeNodes.forEach(nA => {
          const posA = posMap[nA.id];
          if (!posA) return;
          let minD = Infinity;
          safeNodes.forEach(nB => {
            if (nA.id === nB.id) return;
            const posB = posMap[nB.id];
            if (!posB) return;
            const d = Math.sqrt(Math.pow(posA.x - posB.x, 2) + Math.pow(posA.y - posB.y, 2));
            if (d < minD) minD = d;
          });
          if (minD < Infinity) arbitraryNNDists.push(minD);
        });

        return {
          width,
          nodesPer1000px,
          arbitraryNN: calcPercentiles(arbitraryNNDists),
        };
      };

      const densityFinal = computeDensity(finalPositions);

      const rankedBySemantic = [...sb1cFinalSemantic.perBridgeDetails].sort((a, b) => b.maxD - a.maxD);

      const worstOutliersTracing = rankedBySemantic.slice(0, 10).map(outlier => {
        const bId = outlier.bridgeId;
        const p7 = stage7Positions[bId] || { x: 0, y: 0 };
        const p8 = stage8Positions[bId] || { x: 0, y: 0 };
        const p9 = stage9Positions[bId] || { x: 0, y: 0 };
        const p10 = stage10Positions[bId] || { x: 0, y: 0 };
        const p11 = stage11Positions[bId] || { x: 0, y: 0 };
        const pFinal = finalPositions[bId] || { x: 0, y: 0 };

        const d7_8 = Math.sqrt(Math.pow(p8.x - p7.x, 2) + Math.pow(p8.y - p7.y, 2));
        const d8_9 = Math.sqrt(Math.pow(p9.x - p8.x, 2) + Math.pow(p9.y - p8.y, 2));
        const d9_10 = Math.sqrt(Math.pow(p10.x - p9.x, 2) + Math.pow(p10.y - p9.y, 2));
        const d10_11 = Math.sqrt(Math.pow(p11.x - p10.x, 2) + Math.pow(p10.y - p10.y, 2));

        let maxShiftStage = 'STAGE_8_ORIGIN';
        let maxShiftVal = d7_8;
        if (d8_9 > maxShiftVal) {
          maxShiftVal = d8_9;
          maxShiftStage = 'STAGE_9_ORIGIN';
        }
        if (d9_10 > maxShiftVal) {
          maxShiftVal = d9_10;
          maxShiftStage = 'STAGE_10_ORIGIN';
        }
        if (d10_11 > maxShiftVal) {
          maxShiftVal = d10_11;
          maxShiftStage = 'STAGE_11_ORIGIN';
        }

        return {
          bridgeId: bId,
          neighbors: outlier.neighbors,
          p7,
          p8,
          p9,
          p10,
          p11,
          pFinal,
          maxSemanticDist: outlier.maxD,
          stage11Disp: Math.sqrt(Math.pow(p11.x - p8.x, 2) + Math.pow(p11.y - p8.y, 2)),
          originStage: maxShiftStage,
          shifts: { d7_8, d8_9, d9_10, d10_11 },
        };
      });

      const sb1cMetrics = calculateLayoutMetrics(safeNodes, safeEdges, finalPositions);
      const preSB1CMetrics = calculateLayoutMetrics(safeNodes, safeEdges, preSB1CFinalPositions);

      const summary = {
        dataset: ds.key.toUpperCase(),
        nodeCount: safeNodes.length,
        edgeCount: safeEdges.length,
        bridgeCount: bridgeNodes.length,
        widths: cWidths,
        semanticNeighborDistance: {
          preSB1CFinalMax: preSB1CSemantic.maxPercentiles,
          sb1cStage8Max: sb1cStage8Semantic.maxPercentiles,
          sb1cFinalMax: sb1cFinalSemantic.maxPercentiles,
          preSB1CFinalMean: preSB1CSemantic.meanPercentiles,
          sb1cFinalMean: sb1cFinalSemantic.meanPercentiles,
          sb1cFinalMedian: sb1cFinalSemantic.medianPercentiles,
        },
        corridorLocality: {
          sb1cStage8: sb1cStage8Corridor,
          sb1cFinal: sb1cFinalCorridor,
        },
        displacements,
        localDensity: densityFinal,
        outliers: worstOutliersTracing,
        crossings: {
          preSB1C: {
            total: preSB1CMetrics.crossings,
          },
          sb1cFinal: {
            total: sb1cMetrics.crossings,
            primaryPrimary: sb1cMetrics.detailedCrossings?.primaryPrimaryCrossings ?? 0,
            primaryBridge: sb1cMetrics.detailedCrossings?.primaryBridgeCrossings ?? 0,
            bridgeBridge: sb1cMetrics.detailedCrossings?.bridgeBridgeCrossings ?? 0,
          },
        },
        performance: {
          stage8IsolatedTime,
          fullPipelineTime,
        },
      };

      allSummaries[ds.key.toUpperCase()] = summary;
      expect(summary.bridgeCount).toBeGreaterThan(0);
    });
  }

  test('Save Summaries to JSON File', () => {
    const outPath1 = path.resolve(process.cwd(), '../audit-evidence/sb1c-phase4-measurements.json');
    const outPath2 = path.resolve(__dirname, '../../../audit-evidence/sb1c-phase4-measurements.json');
    const outPath = process.cwd().endsWith('explorer') ? outPath1 : outPath2;
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(allSummaries, null, 2), 'utf8');
    console.log(`Saved measurements to ${outPath}`);
  });
});
