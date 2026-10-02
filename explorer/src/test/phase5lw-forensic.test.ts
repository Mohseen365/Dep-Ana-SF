import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { computeGraphCentralityAnalysis } from '../lib/layout/centrality';
import { createLayoutGraphIndex } from '../lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from '../lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from '../lib/layout/layers';
import { discoverDomains } from '../lib/layout/domains';
import { computeGlobalDomainLayout } from '../lib/layout/global-layout';
import { reduceEdgeCrossings } from '../lib/layout/ordering';
import { computeLocalNodeLayout } from '../lib/layout/local-layout';

function loadDataset(key: string): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, `../../public/projects/${key}/explorer-data.json`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return { nodes: parsed.nodes || [], edges: parsed.edges || [] };
}

describe('Phase 5L-W Forensic Data Extraction', () => {
  test('BQC 8 Divergent Bridges Deep Extraction', () => {
    const { nodes, edges } = loadDataset('bqc');
    const safeNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    const safeEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

    const index = createLayoutGraphIndex(safeNodes, safeEdges);
    let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
    const layerMap = new Map<string, any>();
    safeNodes.forEach(node => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
    analysis = applyLayerClassification(analysis, layerMap);

    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) => domainMap.set(nodeId, assignment.primaryDomain));
    analysis = applyDomainClassification(analysis, domainMap);

    const centralityMap = computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

    const globalDomainResult = computeGlobalDomainLayout(safeNodes, safeEdges, {
      domainSpacing: 380, layerSpacing: 250, nodeWidth: 120, nodeHeight: 60,
      analysis, domainDiscovery, layerMap, domainMap, index,
    });

    const orderingResult = reduceEdgeCrossings({
      nodes: safeNodes, edges: safeEdges, layerMap, domainMap,
      domainOrder: globalDomainResult.orderedDomains, layerYMap: globalDomainResult.layerYMap,
    });

    const localResult = computeLocalNodeLayout({
      nodes: safeNodes, edges: safeEdges, analysis,
      domainRegions: globalDomainResult.domainRegions, layerMap, domainMap,
      bucketOrder: orderingResult.bucketOrder,
      options: { nodeWidth: 120, nodeHeight: 60, domainSpacing: 380, layerYMap: globalDomainResult.layerYMap },
    });

    const domainXCenters: Record<string, number> = {};
    const domainBounds: Record<string, { minX: number; maxX: number }> = {};
    globalDomainResult.domainRegions.forEach((region, domain) => {
      domainXCenters[domain] = region.xCenter;
      domainBounds[domain] = { minX: region.xMin, maxX: region.xMax };
    });

    const stage7PrimaryPositions = Object.freeze({ ...localResult.primaryNodePositions });

    function runStage8(enableImmutablePrimary: boolean) {
      const basePositions: Record<string, { x: number; y: number }> = { ...stage7PrimaryPositions };
      let primaryRejections = 0;
      let dynamicRejections = 0;
      const rejectionsByBridge: Record<string, { primary: number; dynamic: number }> = {};

      safeNodes.forEach(node => {
        if (isTestNode(node) || isFieldNode(node)) return;
        const centrality = centralityMap.get(node.id);
        if (centrality?.isBridge && !centrality.isHub) {
          rejectionsByBridge[node.id] = { primary: 0, dynamic: 0 };
          const nodeAnalysis = analysis.nodes.get(node.id);
          const layer = layerMap.get(node.id) || 'application';
          const minDx = 160; const minDy = 100;
          const layerYOffsets = globalDomainResult.layerYMap;
          const baseY = layerYOffsets[layer];

          const sortedConnectedDomains = [...centrality.connectedDomains].sort((a, b) => a.localeCompare(b));
          let sumX = 0; let dCount = 0;
          for (const d of sortedConnectedDomains) {
            if (domainXCenters[d] !== undefined) { sumX += domainXCenters[d]; dCount++; }
          }
          let neighborSumX = 0; let neighborCount = 0;
          for (const nId of nodeAnalysis?.neighborIds || []) {
            if (basePositions[nId]) { neighborSumX += basePositions[nId].x; neighborCount++; }
          }
          let semanticX = neighborCount > 0 ? neighborSumX / neighborCount : (dCount > 0 ? sumX / dCount : 0);

          let minConnectedX = Infinity; let maxConnectedX = -Infinity;
          for (const d of sortedConnectedDomains) {
            const bounds = domainBounds[d];
            if (bounds) {
              if (bounds.minX < minConnectedX) minConnectedX = bounds.minX;
              if (bounds.maxX > maxConnectedX) maxConnectedX = bounds.maxX;
            }
          }
          if (!Number.isFinite(minConnectedX)) { minConnectedX = semanticX; maxConnectedX = semanticX; }

          const initialMinX = minConnectedX - minDx;
          const initialMaxX = maxConnectedX + minDx;
          const X0 = Math.max(initialMinX, Math.min(initialMaxX, semanticX));

          let hasIntermediateTrap = false;
          for (const domainId of Object.keys(domainBounds)) {
            if (sortedConnectedDomains.includes(domainId) || domainId === 'Shared') continue;
            const bounds = domainBounds[domainId];
            if (bounds && semanticX >= bounds.minX - 60 && semanticX <= bounds.maxX + 60) {
              hasIntermediateTrap = true; break;
            }
          }

          const legalYLanes = (hasIntermediateTrap || sortedConnectedDomains.length >= 2)
            ? [baseY - minDy, baseY + minDy, baseY]
            : [baseY, baseY - minDy, baseY + minDy];

          let accepted: { x: number; y: number } | null = null;
          const evaluatedXSet = new Set<number>();

          for (let k = 0; k <= 50; k++) {
            const currentMinX = initialMinX - k * minDx;
            const currentMaxX = initialMaxX + k * minDx;
            const xSteps: number[] = [];
            let stepIndex = 0;
            while (true) {
              let addedAny = false;
              if (stepIndex === 0) {
                if (X0 >= currentMinX - 1e-2 && X0 <= currentMaxX + 1e-2) { xSteps.push(X0); addedAny = true; }
              } else {
                const rightX = X0 + stepIndex * minDx;
                const leftX = X0 - stepIndex * minDx;
                if (rightX <= currentMaxX + 1e-2 && rightX >= currentMinX - 1e-2) { xSteps.push(rightX); addedAny = true; }
                if (leftX >= currentMinX - 1e-2 && leftX <= currentMaxX + 1e-2) { xSteps.push(leftX); addedAny = true; }
              }
              if (!addedAny && (X0 + stepIndex * minDx > currentMaxX + 1e-2) && (X0 - stepIndex * minDx < currentMinX - 1e-2)) break;
              stepIndex++;
            }

            for (const testX of xSteps) {
              const xKey = Math.round(testX * 100) / 100;
              if (evaluatedXSet.has(xKey)) continue;
              evaluatedXSet.add(xKey);

              for (const testY of legalYLanes) {
                let dynamicCollide = false;
                for (const [otherId, otherPos] of Object.entries(basePositions)) {
                  if (otherId === node.id) continue;
                  if (Math.abs(otherPos.x - testX) < minDx - 1e-3 && Math.abs(otherPos.y - testY) < minDy - 1e-3) {
                    dynamicCollide = true; dynamicRejections++; rejectionsByBridge[node.id].dynamic++; break;
                  }
                }

                let primaryCollide = false;
                if (!dynamicCollide && enableImmutablePrimary) {
                  for (const [otherId, otherPos] of Object.entries(stage7PrimaryPositions)) {
                    if (otherId === node.id) continue;
                    if (Math.abs(otherPos.x - testX) < minDx - 1e-3 && Math.abs(otherPos.y - testY) < minDy - 1e-3) {
                      primaryCollide = true; primaryRejections++; rejectionsByBridge[node.id].primary++; break;
                    }
                  }
                }

                if (!dynamicCollide && !primaryCollide) {
                  accepted = { x: Math.round(testX * 100) / 100, y: Math.round(testY * 100) / 100 };
                  break;
                }
              }
              if (accepted) break;
            }
            if (accepted) break;
          }

          if (!accepted) accepted = { x: Math.round(X0 * 100) / 100, y: Math.round(baseY * 100) / 100 };
          basePositions[node.id] = accepted;
        }
      });

      return { positions: basePositions, primaryRejections, dynamicRejections, rejectionsByBridge };
    }

    const sb1cStage8 = runStage8(false);
    const h5aStage8 = runStage8(true);

    const bridgeNodes = safeNodes.filter(n => {
      if (isTestNode(n) || isFieldNode(n)) return false;
      const c = centralityMap.get(n.id);
      return c?.isBridge && !c.isHub;
    });

    console.log('\n--- BQC 8 STAGE 8 DIVERGENT BRIDGES FORENSICS ---');
    let bridgeProcessingIndex = 0;
    const divergentList: any[] = [];

    bridgeNodes.forEach(node => {
      bridgeProcessingIndex++;
      const bId = node.id;
      const sb1cPos = sb1cStage8.positions[bId];
      const h5aPos = h5aStage8.positions[bId];
      const delta = Math.hypot(sb1cPos.x - h5aPos.x, sb1cPos.y - h5aPos.y);

      if (delta > 0.01) {
        divergentList.push({
          bridgeId: bId,
          sb1c: `${sb1cPos.x.toFixed(2)}, ${sb1cPos.y.toFixed(2)}`,
          h5a: `${h5aPos.x.toFixed(2)}, ${h5aPos.y.toFixed(2)}`,
          delta: delta.toFixed(2) + 'px',
          processingIndex: bridgeProcessingIndex,
          primaryRejectionsH5A: h5aStage8.rejectionsByBridge[bId]?.primary || 0,
          dynamicRejectionsH5A: h5aStage8.rejectionsByBridge[bId]?.dynamic || 0,
        });
      }
    });

    console.table(divergentList);
    expect(divergentList.length).toBe(8);
  });
});
