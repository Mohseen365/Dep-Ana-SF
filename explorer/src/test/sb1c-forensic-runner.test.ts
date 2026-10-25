import { describe, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import {
  computeGraphCentralityAnalysis,
  calculateBridgeCandidatePosition,
} from '../lib/layout/centrality';
import { calculateLayoutMetrics } from '../lib/layout/metrics';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeGlobalDomainLayout } from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';
import { placeSatellites } from '../lib/layout/satellites';
import { resolveSpacingAndCollisions } from '../lib/layout/spacing';

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

describe('SB-1C Capacity Forensic Audit Runner', () => {
  for (const ds of DATASETS) {
    test(`Run Complete Capacity Forensic Analysis for ${ds.key.toUpperCase()}`, { timeout: 60000 }, () => {
      const { nodes, edges } = loadDataset(ds);

      const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

      // Node type breakdown
      const typeCounts: Record<string, number> = {};
      safeNodes.forEach(n => {
        const t = n.type || 'Unknown';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });

      const index = createLayoutGraphIndex(safeNodes, safeEdges);
      let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
      const layerMap = new Map();
      safeNodes.forEach(node => {
        layerMap.set(node.id, classifyNodeLayerWithReason(node).layer);
      });
      analysis = applyLayerClassification(analysis, layerMap);

      const domainDiscovery = discoverDomains(safeNodes, safeEdges);
      const domainMap = new Map();
      domainDiscovery.assignments.forEach((assignment, nodeId) => {
        domainMap.set(nodeId, assignment.primaryDomain);
      });
      analysis = applyDomainClassification(analysis, domainMap);

      const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

      let hubCount = 0;
      let bridgeCount = 0;
      safeNodes.forEach(n => {
        const c = centralityMap.get(n.id);
        if (c?.isHub) hubCount++;
        if (c?.isBridge && !c.isHub) bridgeCount++;
      });

      // Pipeline Stage Geometry Tracking
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

      // Stage 5 width (Global Layout - Domain Regions)
      let stage5MinX = Infinity;
      let stage5MaxX = -Infinity;
      globalDomainResult.domainRegions.forEach(region => {
        if (region.xMin < stage5MinX) stage5MinX = region.xMin;
        if (region.xMax > stage5MaxX) stage5MaxX = region.xMax;
      });
      const stage5Width = stage5MaxX - stage5MinX;

      // Stage 6 (Ordering)
      const orderingResult = reduceEdgeCrossings({
        nodes: safeNodes,
        edges: safeEdges,
        layerMap,
        domainMap,
        domainOrder: globalDomainResult.orderedDomains,
        layerYMap: globalDomainResult.layerYMap,
      });

      // Stage 7 (Local Primary Node Layout)
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

      let stage7MinX = Infinity;
      let stage7MaxX = -Infinity;
      Object.values(localResult.primaryNodePositions).forEach(pos => {
        if (pos.x < stage7MinX) stage7MinX = pos.x;
        if (pos.x + 120 > stage7MaxX) stage7MaxX = pos.x + 120;
      });
      const stage7Width = stage7MaxX - stage7MinX;

      // Stage 8 (Bridge Placement - BASELINE Unbounded 1D)
      const domainXCenters: Record<string, number> = {};
      const domainBounds: Record<string, { minX: number; maxX: number }> = {};
      globalDomainResult.domainRegions.forEach((region, domain) => {
        domainXCenters[domain] = region.xCenter;
        domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
      });

      const basePositions: Record<string, { x: number; y: number }> = {
        ...localResult.primaryNodePositions,
      };

      let baselineStage8MinX = stage7MinX;
      let baselineStage8MaxX = stage7MaxX;
      let baselineEscapes = 0;
      const baselineDisplacements: number[] = [];
      const bridgeCorridorAssignments: Array<{
        nodeId: string;
        connectedDomains: string[];
        layer: string;
        candidateX: number;
        candidateY: number;
        finalX: number;
        finalY: number;
        minConnX: number;
        maxConnX: number;
        isEscape: boolean;
      }> = [];

      safeNodes.forEach(node => {
        if (isTestNode(node) || isFieldNode(node)) return;
        const centrality = centralityMap.get(node.id);
        if (centrality?.isBridge && !centrality.isHub) {
          const neighborPositions: Record<string, { x: number; y: number }> = {};
          const nodeAnalysis = analysis.nodes.get(node.id);
          nodeAnalysis?.neighborIds.forEach(nId => {
            if (basePositions[nId]) neighborPositions[nId] = basePositions[nId];
          });

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
          const layer = layerMap.get(node.id) || 'application';

          const bridgeInfo = calculateBridgeCandidatePosition(
            node.id,
            layer,
            centrality.connectedDomains,
            domainXCenters,
            domainBounds,
            neighborPositions,
            { layerSpacing: 250, nodeWidth: 120, nodeHeight: 60, layerYOffsets: globalDomainResult.layerYMap, index, allocatedPositions: basePositions }
          );

          basePositions[node.id] = bridgeInfo.candidatePosition;

          let minConnX = Infinity;
          let maxConnX = -Infinity;
          for (const d of sortedConnectedDomains) {
            const b = domainBounds[d];
            if (b) {
              if (b.minX < minConnX) minConnX = b.minX;
              if (b.maxX > maxConnX) maxConnX = b.maxX;
            }
          }

          const margin = 160;
          const minLegalX = minConnX - margin;
          const maxLegalX = maxConnX + margin;
          const isEscape = bridgeInfo.candidatePosition.x < minLegalX - 1e-2 || bridgeInfo.candidatePosition.x > maxLegalX + 1e-2;
          if (isEscape) baselineEscapes++;

          const disp = Math.abs(bridgeInfo.candidatePosition.x - candidateX);
          baselineDisplacements.push(disp);

          bridgeCorridorAssignments.push({
            nodeId: node.id,
            connectedDomains: sortedConnectedDomains,
            layer,
            candidateX,
            candidateY: bridgeInfo.candidatePosition.y,
            finalX: bridgeInfo.candidatePosition.x,
            finalY: bridgeInfo.candidatePosition.y,
            minConnX,
            maxConnX,
            isEscape,
          });

          if (bridgeInfo.candidatePosition.x < baselineStage8MinX) baselineStage8MinX = bridgeInfo.candidatePosition.x;
          if (bridgeInfo.candidatePosition.x + 120 > baselineStage8MaxX) baselineStage8MaxX = bridgeInfo.candidatePosition.x + 120;
        }
      });

      const baselineStage8Width = baselineStage8MaxX - baselineStage8MinX;

      // Stage 9 (Satellites)
      const satelliteResult = placeSatellites(
        safeNodes,
        safeEdges,
        analysis,
        basePositions,
        {
          nodeWidth: 120,
          nodeHeight: 60,
          layerSpacing: 250,
          layerYOffsets: globalDomainResult.layerYMap,
          index,
        }
      );

      let stage9MinX = Infinity;
      let stage9MaxX = -Infinity;
      Object.values(satelliteResult.positions).forEach(pos => {
        if (pos.x < stage9MinX) stage9MinX = pos.x;
        if (pos.x + 120 > stage9MaxX) stage9MaxX = pos.x + 120;
      });
      const stage9Width = stage9MaxX - stage9MinX;

      // Stage 11 (Spacing & Collisions)
      const finalCleanupResult = resolveSpacingAndCollisions({
        nodes: safeNodes,
        edges: safeEdges,
        positions: satelliteResult.positions,
        analysis,
        options: {
          nodeWidth: 120,
          nodeHeight: 60,
          layerMap,
          domainMap,
        },
      });

      let stage11MinX = Infinity;
      let stage11MaxX = -Infinity;
      Object.values(finalCleanupResult.positions).forEach(pos => {
        if (pos.x < stage11MinX) stage11MinX = pos.x;
        if (pos.x + 120 > stage11MaxX) stage11MaxX = pos.x + 120;
      });
      const stage11Width = stage11MaxX - stage11MinX;

      const baselineMetrics = calculateLayoutMetrics(nodes, edges, finalCleanupResult.positions, {
        nodeWidth: 120,
        nodeHeight: 60,
      });

      baselineDisplacements.sort((a, b) => a - b);
      const medianDisp = baselineDisplacements[Math.floor(baselineDisplacements.length * 0.5)] || 0;
      const p95Disp = baselineDisplacements[Math.floor(baselineDisplacements.length * 0.95)] || 0;
      const maxDisp = baselineDisplacements[baselineDisplacements.length - 1] || 0;

      console.log(`\n=================== BASELINE REPRODUCTION: ${ds.key.toUpperCase()} ===================`);
      console.log(`Node Types: ${JSON.stringify(typeCounts)}`);
      console.log(`Hubs: ${hubCount} | Bridges: ${bridgeCount}`);
      console.log(`Stage 5 Width: ${stage5Width.toFixed(2)}px`);
      console.log(`Stage 7 Width: ${stage7Width.toFixed(2)}px`);
      console.log(`Stage 8 Width (Baseline): ${baselineStage8Width.toFixed(2)}px`);
      console.log(`Stage 9 Width: ${stage9Width.toFixed(2)}px`);
      console.log(`Stage 11 Width: ${stage11Width.toFixed(2)}px`);
      console.log(`Stage Deltas:`);
      console.log(`  Stage 5 -> 7: +${(stage7Width - stage5Width).toFixed(2)}px`);
      console.log(`  Stage 7 -> 8: +${(baselineStage8Width - stage7Width).toFixed(2)}px`);
      console.log(`  Stage 8 -> 9: +${(stage9Width - baselineStage8Width).toFixed(2)}px`);
      console.log(`  Stage 9 -> 11: +${(stage11Width - stage9Width).toFixed(2)}px`);
      console.log(`Baseline Bridge Statistics:`);
      console.log(`  Corridor Escapes: ${baselineEscapes} / ${bridgeCount} (${((baselineEscapes/Math.max(1,bridgeCount))*100).toFixed(1)}%)`);
      console.log(`  Displacements: Median ${medianDisp.toFixed(2)}px | P95 ${p95Disp.toFixed(2)}px | Max ${maxDisp.toFixed(2)}px`);
      console.log(`Baseline Correctness:`);
      console.log(`  Node Overlaps: ${baselineMetrics.nodeOverlapCount}`);
      console.log(`  Layer Violations: ${baselineMetrics.layerViolationCount}`);
      console.log(`  Crossings: ${baselineMetrics.edgeCrossingCount}`);

      // =========================================================================
      // CORRIDOR INVENTORY & SB-1B CAPACITY RECONSTRUCTION
      // =========================================================================
      const corridorGroups = new Map<string, typeof bridgeCorridorAssignments>();

      bridgeCorridorAssignments.forEach(b => {
        const key = `${b.connectedDomains.join('__')}__${b.layer}`;
        if (!corridorGroups.has(key)) corridorGroups.set(key, []);
        corridorGroups.get(key)!.push(b);
      });

      console.log(`\n------------------- CORRIDOR INVENTORY: ${ds.key.toUpperCase()} -------------------`);
      console.log(`Total Corridors Identified: ${corridorGroups.size}`);

      interface CorridorStat {
        corridorId: string;
        connectedDomains: string[];
        layer: string;
        minConnX: number;
        maxConnX: number;
        minLegalX: number;
        maxLegalX: number;
        width: number;
        bridgeCount: number;
        bridgeIds: string[];
        primaryNodesInCorridor: number;
        primaryNodeOccupancy: number; // blocked slot count
        theoreticalSlotsPerLane: number;
        theoreticalTotalSlots: number;
        collisionFreeSlots: number;
        requiredSlotsCeilN3: number;
        actualRequiredSlots: number;
        capacityDeficitSB1B: number;
        utilizationRatioSB1B: number;
        formulaClassification: string;
      }

      const corridorStats: CorridorStat[] = [];

      for (const [corridorId, bridges] of corridorGroups.entries()) {
        const sample = bridges[0];
        const minConnX = sample.minConnX;
        const maxConnX = sample.maxConnX;
        const minLegalX = minConnX - 160;
        const maxLegalX = maxConnX + 160;
        const width = maxLegalX - minLegalX;
        const N = bridges.length;
        const bridgeIds = bridges.map(b => b.nodeId);

        // Calculate primary node occupancy in this corridor interval on layer Y
        const layerOrderY = globalDomainResult.layerYMap[sample.layer as keyof typeof globalDomainResult.layerYMap] || 100;
        let primaryNodesInCorridor = 0;
        const primaryXPositions: number[] = [];

        Object.entries(localResult.primaryNodePositions).forEach(([, pPos]) => {
          if (Math.abs(pPos.y - layerOrderY) < 125) { // within same layer band
            if (pPos.x >= minLegalX - 60 && pPos.x <= maxLegalX + 60) {
              primaryNodesInCorridor++;
              primaryXPositions.push(pPos.x);
            }
          }
        });

        const slotSpacing = 160;
        const theoreticalSlotsPerLane = Math.max(1, Math.floor(width / slotSpacing) + 1);
        const theoreticalTotalSlots = theoreticalSlotsPerLane * 3; // 3 Y lanes in SB-1B

        // Determine how many slots on Y0 are blocked by primary nodes
        // Slot x_k = minLegalX + k * 160
        let blockedSlotsY0 = 0;
        for (let k = 0; k < theoreticalSlotsPerLane; k++) {
          const slotX = minLegalX + k * slotSpacing;
          const isBlocked = primaryXPositions.some(px => Math.abs(px - slotX) < 160 - 1e-3);
          if (isBlocked) blockedSlotsY0++;
        }

        // Under 3 Y lanes, Y0 - 100 and Y0 + 100 rarely have primary nodes (since primary nodes are on baseY)
        const collisionFreeSlots = theoreticalTotalSlots - blockedSlotsY0;
        const requiredSlotsCeilN3 = Math.ceil(N / 3);
        const actualRequiredSlots = Math.ceil(N / 3); // theoretical

        const capacityDeficitSB1B = Math.max(0, N - collisionFreeSlots);
        const utilizationRatioSB1B = collisionFreeSlots > 0 ? N / collisionFreeSlots : 999;

        let formulaClassification = 'FORMULA_EXACT';
        if (collisionFreeSlots < N) {
          formulaClassification = 'FORMULA_UNDERESTIMATES';
        } else if (collisionFreeSlots > N * 2) {
          formulaClassification = 'FORMULA_CONSERVATIVE';
        }

        corridorStats.push({
          corridorId,
          connectedDomains: sample.connectedDomains,
          layer: sample.layer,
          minConnX,
          maxConnX,
          minLegalX,
          maxLegalX,
          width,
          bridgeCount: N,
          bridgeIds,
          primaryNodesInCorridor,
          primaryNodeOccupancy: blockedSlotsY0,
          theoreticalSlotsPerLane,
          theoreticalTotalSlots,
          collisionFreeSlots,
          requiredSlotsCeilN3,
          actualRequiredSlots,
          capacityDeficitSB1B,
          utilizationRatioSB1B,
          formulaClassification,
        });
      }

      corridorStats.sort((a, b) => b.bridgeCount - a.bridgeCount);

      console.log(`Top 5 Heaviest Corridors for ${ds.key.toUpperCase()}:`);
      corridorStats.slice(0, 5).forEach(c => {
        console.log(`  Corridor: ${c.corridorId}`);
        console.log(`    Domains: ${c.connectedDomains.join(', ')} | Layer: ${c.layer}`);
        console.log(`    Interval: [${c.minConnX.toFixed(1)}, ${c.maxConnX.toFixed(1)}] | Legal Bounds: [${c.minLegalX.toFixed(1)}, ${c.maxLegalX.toFixed(1)}] (Width: ${c.width.toFixed(1)}px)`);
        console.log(`    Bridge Count (N): ${c.bridgeCount} | Primary Nodes in Band: ${c.primaryNodesInCorridor}`);
        console.log(`    Theoretical 2D Slots (3 lanes): ${c.theoreticalTotalSlots} (Per lane: ${c.theoreticalSlotsPerLane})`);
        console.log(`    Blocked Slots by Primary: ${c.primaryNodeOccupancy} | Collision-Free Slots: ${c.collisionFreeSlots}`);
        console.log(`    SB-1B Deficit: ${c.capacityDeficitSB1B} | Utilization: ${(c.utilizationRatioSB1B * 100).toFixed(1)}%`);
        console.log(`    ceil(N/3) Prediction: ${c.requiredSlotsCeilN3} slots | Class: ${c.formulaClassification}`);
      });

      // Utilization buckets count
      let bucketUnder50 = 0, bucket5075 = 0, bucket7590 = 0, bucket90100 = 0, bucketOver100 = 0;
      corridorStats.forEach(c => {
        if (c.utilizationRatioSB1B < 0.5) bucketUnder50++;
        else if (c.utilizationRatioSB1B <= 0.75) bucket5075++;
        else if (c.utilizationRatioSB1B <= 0.90) bucket7590++;
        else if (c.utilizationRatioSB1B <= 1.0) bucket90100++;
        else bucketOver100++;
      });

      console.log(`Corridor Utilization Distribution (SB-1B Model):`);
      console.log(`  <50%: ${bucketUnder50} | 50-75%: ${bucket5075} | 75-90%: ${bucket7590} | 90-100%: ${bucket90100} | >100% (Overloaded): ${bucketOver100}`);

      // =========================================================================
      // SB-1B PLACEMENT SIMULATION & FIRST EXHAUSTION / ALLOCATION ORDERING
      // =========================================================================
      console.log(`\n------------------- SB-1B SIMULATION & ORDERING FORENSICS: ${ds.key.toUpperCase()} -------------------`);

      function runSB1BSimulation(nodeOrderList: ExplorerNode[]) {
        const simAllocated: Record<string, { x: number; y: number }> = {
          ...localResult.primaryNodePositions,
        };
        let simExhaustedCount = 0;
        let simEscapesCount = 0;
        const simDisplacements: number[] = [];
        const simExhaustionDetails: Array<{
          nodeId: string;
          corridorId: string;
          orderIndex: number;
          allocatedBefore: number;
          candidateX: number;
        }> = [];

        let orderIdx = 0;
        nodeOrderList.forEach(node => {
          if (isTestNode(node) || isFieldNode(node)) return;
          const centrality = centralityMap.get(node.id);
          if (centrality?.isBridge && !centrality.isHub) {
            orderIdx++;
            const neighborPositions: Record<string, { x: number; y: number }> = {};
            const nodeAnalysis = analysis.nodes.get(node.id);
            nodeAnalysis?.neighborIds.forEach(nId => {
              if (simAllocated[nId]) neighborPositions[nId] = simAllocated[nId];
            });

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
            const layer = layerMap.get(node.id) || 'application';
            const baseY = globalDomainResult.layerYMap[layer as keyof typeof globalDomainResult.layerYMap] || 100;

            let minConnX = Infinity;
            let maxConnX = -Infinity;
            for (const d of sortedConnectedDomains) {
              const b = domainBounds[d];
              if (b) {
                if (b.minX < minConnX) minConnX = b.minX;
                if (b.maxX > maxConnX) maxConnX = b.maxX;
              }
            }
            const minLegalX = minConnX - 160;
            const maxLegalX = maxConnX + 160;
            const clampedCandidateX = Math.max(minLegalX, Math.min(maxLegalX, candidateX));

            // SB-1B 2D legal search
            const minDx = 160;
            const minDy = 100;
            const validYLanes = [baseY, baseY - 100, baseY + 100];

            let placedPos: { x: number; y: number } | null = null;

            // Generate X steps inside [minLegalX, maxLegalX] outward from clampedCandidateX
            const xSteps: number[] = [clampedCandidateX];
            let stepIndex = 1;
            while (true) {
              const leftX = clampedCandidateX - stepIndex * minDx;
              const rightX = clampedCandidateX + stepIndex * minDx;
              let added = false;
              if (leftX >= minLegalX - 1e-2) {
                xSteps.push(leftX);
                added = true;
              }
              if (rightX <= maxLegalX + 1e-2) {
                xSteps.push(rightX);
                added = true;
              }
              if (!added) break;
              stepIndex++;
            }

            for (const testX of xSteps) {
              for (const testY of validYLanes) {
                let collides = false;
                for (const [otherId, otherPos] of Object.entries(simAllocated)) {
                  if (otherId === node.id) continue;
                  if (Math.abs(otherPos.x - testX) < minDx - 1e-3 && Math.abs(otherPos.y - testY) < minDy - 1e-3) {
                    collides = true;
                    break;
                  }
                }
                if (!collides) {
                  placedPos = { x: Math.round(testX * 100) / 100, y: Math.round(testY * 100) / 100 };
                  break;
                }
              }
              if (placedPos) break;
            }

            if (!placedPos) {
              simExhaustedCount++;
              placedPos = { x: Math.round(clampedCandidateX * 100) / 100, y: baseY };
              simExhaustionDetails.push({
                nodeId: node.id,
                corridorId: `${sortedConnectedDomains.join('__')}__${layer}`,
                orderIndex: orderIdx,
                allocatedBefore: Object.keys(simAllocated).length - Object.keys(localResult.primaryNodePositions).length,
                candidateX,
              });
            }

            simAllocated[node.id] = placedPos;
            const disp = Math.abs(placedPos.x - candidateX);
            simDisplacements.push(disp);

            if (placedPos.x < minLegalX - 1e-2 || placedPos.x > maxLegalX + 1e-2) {
              simEscapesCount++;
            }
          }
        });

        simDisplacements.sort((a, b) => a - b);
        const maxDisp = simDisplacements[simDisplacements.length - 1] || 0;

        return {
          exhaustedCount: simExhaustedCount,
          escapesCount: simEscapesCount,
          maxDisp,
          exhaustionDetails: simExhaustionDetails,
          simAllocated,
        };
      }

      // Order 1: Alphabetical (Current)
      const orderCurrent = [...safeNodes].sort((a, b) => a.id.localeCompare(b.id));
      const resCurrent = runSB1BSimulation(orderCurrent);

      // Order 2: Reverse Alphabetical
      const orderReverse = [...safeNodes].sort((a, b) => b.id.localeCompare(a.id));
      const resReverse = runSB1BSimulation(orderReverse);

      // Order 3: Corridor Population Priority (Busiest corridors first)
      const corridorPopMap = new Map<string, number>();
      corridorStats.forEach(c => corridorPopMap.set(c.corridorId, c.bridgeCount));
      const orderCorridorPop = [...safeNodes].sort((a, b) => {
        const cA = centralityMap.get(a.id);
        const cB = centralityMap.get(b.id);
        const keyA = cA ? `${[...cA.connectedDomains].sort().join('__')}__${layerMap.get(a.id)}` : '';
        const keyB = cB ? `${[...cB.connectedDomains].sort().join('__')}__${layerMap.get(b.id)}` : '';
        const popA = corridorPopMap.get(keyA) || 0;
        const popB = corridorPopMap.get(keyB) || 0;
        if (popB !== popA) return popB - popA;
        return a.id.localeCompare(b.id);
      });
      const resCorridorPop = runSB1BSimulation(orderCorridorPop);

      // Order 4: Degree / Bridge Score Priority
      const orderDegree = [...safeNodes].sort((a, b) => {
        const cA = centralityMap.get(a.id);
        const cB = centralityMap.get(b.id);
        const scoreA = cA?.bridgeScore || 0;
        const scoreB = cB?.bridgeScore || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.id.localeCompare(b.id);
      });
      const resDegree = runSB1BSimulation(orderDegree);

      console.log(`Ordering Forensics Results for ${ds.key.toUpperCase()} (SB-1B 2D Model):`);
      console.log(`  1. Current Alphabetical: Exhausted = ${resCurrent.exhaustedCount} | Escapes = ${resCurrent.escapesCount} | Max Disp = ${resCurrent.maxDisp.toFixed(1)}px`);
      console.log(`  2. Reverse Alphabetical: Exhausted = ${resReverse.exhaustedCount} | Escapes = ${resReverse.escapesCount} | Max Disp = ${resReverse.maxDisp.toFixed(1)}px`);
      console.log(`  3. Busiest Corridor First: Exhausted = ${resCorridorPop.exhaustedCount} | Escapes = ${resCorridorPop.escapesCount} | Max Disp = ${resCorridorPop.maxDisp.toFixed(1)}px`);
      console.log(`  4. Bridge Score First: Exhausted = ${resDegree.exhaustedCount} | Escapes = ${resDegree.escapesCount} | Max Disp = ${resDegree.maxDisp.toFixed(1)}px`);

      if (resCurrent.exhaustionDetails.length > 0) {
        console.log(`First Exhaustion Details (Current Order):`);
        resCurrent.exhaustionDetails.slice(0, 3).forEach(ex => {
          console.log(`  Node: ${ex.nodeId} | Corridor: ${ex.corridorId} | OrderIdx: ${ex.orderIndex} | Allocated Before: ${ex.allocatedBefore}`);
        });
      }

      // =========================================================================
      // SB-1C DYNAMIC BOUND SIMULATION (RIGHT, LEFT, SYMMETRIC, BEST-SIDE)
      // =========================================================================
      console.log(`\n------------------- SB-1C DYNAMIC BOUND SIMULATION: ${ds.key.toUpperCase()} -------------------`);

      function runDynamicBoundSimulation(strategy: 'RIGHT' | 'LEFT' | 'SYMMETRIC' | 'BEST_DISPLACEMENT') {
        const simAllocated: Record<string, { x: number; y: number }> = {
          ...localResult.primaryNodePositions,
        };
        let simExhaustedCount = 0;
        let totalExpansionWidth = 0;
        let maxExpansionWidth = 0;
        const simDisplacements: number[] = [];

        safeNodes.forEach(node => {
          if (isTestNode(node) || isFieldNode(node)) return;
          const centrality = centralityMap.get(node.id);
          if (centrality?.isBridge && !centrality.isHub) {
            const neighborPositions: Record<string, { x: number; y: number }> = {};
            const nodeAnalysis = analysis.nodes.get(node.id);
            nodeAnalysis?.neighborIds.forEach(nId => {
              if (simAllocated[nId]) neighborPositions[nId] = simAllocated[nId];
            });

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
            const layer = layerMap.get(node.id) || 'application';
            const baseY = globalDomainResult.layerYMap[layer as keyof typeof globalDomainResult.layerYMap] || 100;

            let minConnX = Infinity;
            let maxConnX = -Infinity;
            for (const d of sortedConnectedDomains) {
              const b = domainBounds[d];
              if (b) {
                if (b.minX < minConnX) minConnX = b.minX;
                if (b.maxX > maxConnX) maxConnX = b.maxX;
              }
            }
            const baseMinLegalX = minConnX - 160;
            const baseMaxLegalX = maxConnX + 160;

            const minDx = 160;
            const minDy = 100;
            const validYLanes = [baseY, baseY - 100, baseY + 100];

            let placedPos: { x: number; y: number } | null = null;
            let currentExpansion = 0;

            // Expand bounds incrementally until a valid 2D slot is found
            while (currentExpansion <= 10000) { // Safety outer limit 10,000px
              let minLegalX = baseMinLegalX;
              let maxLegalX = baseMaxLegalX;

              if (strategy === 'RIGHT') {
                maxLegalX += currentExpansion;
              } else if (strategy === 'LEFT') {
                minLegalX -= currentExpansion;
              } else if (strategy === 'SYMMETRIC') {
                minLegalX -= currentExpansion / 2;
                maxLegalX += currentExpansion / 2;
              } else if (strategy === 'BEST_DISPLACEMENT') {
                if (candidateX >= (baseMinLegalX + baseMaxLegalX) / 2) {
                  maxLegalX += currentExpansion;
                } else {
                  minLegalX -= currentExpansion;
                }
              }

              const clampedCandidateX = Math.max(minLegalX, Math.min(maxLegalX, candidateX));

              // Search inside [minLegalX, maxLegalX]
              const xSteps: number[] = [clampedCandidateX];
              let stepIndex = 1;
              while (true) {
                const leftX = clampedCandidateX - stepIndex * minDx;
                const rightX = clampedCandidateX + stepIndex * minDx;
                let added = false;
                if (leftX >= minLegalX - 1e-2) {
                  xSteps.push(leftX);
                  added = true;
                }
                if (rightX <= maxLegalX + 1e-2) {
                  xSteps.push(rightX);
                  added = true;
                }
                if (!added) break;
                stepIndex++;
              }

              for (const testX of xSteps) {
                for (const testY of validYLanes) {
                  let collides = false;
                  for (const [otherId, otherPos] of Object.entries(simAllocated)) {
                    if (otherId === node.id) continue;
                    if (Math.abs(otherPos.x - testX) < minDx - 1e-3 && Math.abs(otherPos.y - testY) < minDy - 1e-3) {
                      collides = true;
                      break;
                    }
                  }
                  if (!collides) {
                    placedPos = { x: Math.round(testX * 100) / 100, y: Math.round(testY * 100) / 100 };
                    break;
                  }
                }
                if (placedPos) break;
              }

              if (placedPos) {
                if (currentExpansion > 0) {
                  totalExpansionWidth += currentExpansion;
                  if (currentExpansion > maxExpansionWidth) maxExpansionWidth = currentExpansion;
                }
                break;
              }

              currentExpansion += minDx; // Increment bound by 160px
            }

            if (!placedPos) {
              simExhaustedCount++;
              placedPos = { x: Math.round(candidateX * 100) / 100, y: baseY };
            }

            simAllocated[node.id] = placedPos;
            const disp = Math.abs(placedPos.x - candidateX);
            simDisplacements.push(disp);
          }
        });

        // Compute Stage 8 min/max X with dynamic simulation positions
        let dynStage8MinX = stage7MinX;
        let dynStage8MaxX = stage7MaxX;
        Object.values(simAllocated).forEach(p => {
          if (p.x < dynStage8MinX) dynStage8MinX = p.x;
          if (p.x + 120 > dynStage8MaxX) dynStage8MaxX = p.x + 120;
        });
        const dynStage8Width = dynStage8MaxX - dynStage8MinX;

        simDisplacements.sort((a, b) => a - b);
        const avgDisp = simDisplacements.reduce((a, b) => a + b, 0) / Math.max(1, simDisplacements.length);
        const maxDisp = simDisplacements[simDisplacements.length - 1] || 0;

        return {
          exhaustedCount: simExhaustedCount,
          dynStage8Width,
          maxExpansionWidth,
          totalExpansionWidth,
          avgDisp,
          maxDisp,
        };
      }

      const dynRight = runDynamicBoundSimulation('RIGHT');
      const dynLeft = runDynamicBoundSimulation('LEFT');
      const dynSym = runDynamicBoundSimulation('SYMMETRIC');
      const dynBest = runDynamicBoundSimulation('BEST_DISPLACEMENT');

      console.log(`Dynamic Bound Strategy Comparison for ${ds.key.toUpperCase()}:`);
      console.log(`  Strategy A (Right Expansion): Stage 8 Width = ${dynRight.dynStage8Width.toFixed(1)}px | Max Expansion = +${dynRight.maxExpansionWidth}px | Avg Disp = ${dynRight.avgDisp.toFixed(1)}px | Max Disp = ${dynRight.maxDisp.toFixed(1)}px | Exhausted = ${dynRight.exhaustedCount}`);
      console.log(`  Strategy B (Left Expansion):  Stage 8 Width = ${dynLeft.dynStage8Width.toFixed(1)}px | Max Expansion = +${dynLeft.maxExpansionWidth}px | Avg Disp = ${dynLeft.avgDisp.toFixed(1)}px | Max Disp = ${dynLeft.maxDisp.toFixed(1)}px | Exhausted = ${dynLeft.exhaustedCount}`);
      console.log(`  Strategy C (Symmetric Expansion): Stage 8 Width = ${dynSym.dynStage8Width.toFixed(1)}px | Max Expansion = +${dynSym.maxExpansionWidth}px | Avg Disp = ${dynSym.avgDisp.toFixed(1)}px | Max Disp = ${dynSym.maxDisp.toFixed(1)}px | Exhausted = ${dynSym.exhaustedCount}`);
      console.log(`  Strategy D (Least Displacement Expansion): Stage 8 Width = ${dynBest.dynStage8Width.toFixed(1)}px | Max Expansion = +${dynBest.maxExpansionWidth}px | Avg Disp = ${dynBest.avgDisp.toFixed(1)}px | Max Disp = ${dynBest.maxDisp.toFixed(1)}px | Exhausted = ${dynBest.exhaustedCount}`);

    });
  }
});
