import * as fs from 'fs';
import * as path from 'path';
import { createLayoutGraphIndex } from './explorer/src/lib/layout/graph-index';
import { computeArchitectureAnalysis, applyLayerClassification, applyDomainClassification, isFieldNode } from './explorer/src/lib/layout/analysis';
import { classifyNodeLayerWithReason, isTestNode } from './explorer/src/lib/layout/layers';
import { discoverDomains } from './explorer/src/lib/layout/domains';
import { computeGraphCentralityAnalysis, calculateBridgeCandidatePosition } from './explorer/src/lib/layout/centrality';
import { computeGlobalDomainLayout } from './explorer/src/lib/layout/global-layout';
import { reduceEdgeCrossings } from './explorer/src/lib/layout/ordering';
import { computeLocalNodeLayout } from './explorer/src/lib/layout/local-layout';

const fullPath = path.resolve(process.cwd(), 'explorer/public/projects/cst/explorer-data.json');
const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
const safeNodes = [...parsed.nodes].sort((a, b) => a.id.localeCompare(b.id));
const safeEdges = [...parsed.edges].sort((a, b) => a.id.localeCompare(b.id));

const index = createLayoutGraphIndex(safeNodes, safeEdges);
let analysis = computeArchitectureAnalysis(safeNodes, safeEdges, { index });
const layerMap = new Map<string, any>();
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

const immutableStage7Primary = Object.freeze({ ...localResult.primaryNodePositions });
const basePositions: Record<string, { x: number; y: number }> = { ...localResult.primaryNodePositions };

console.log('=== KNOWN CST SPECIMEN TRACE ===');
console.log('Target Node (Primary): ApexClass:DateUtils');
console.log('Stage 7 Primary Coordinate:', immutableStage7Primary['ApexClass:DateUtils']);

let bridgeIndex = 0;
safeNodes.forEach(node => {
  if (isTestNode(node) || isFieldNode(node)) return;
  const centrality = centralityMap.get(node.id);
  if (centrality?.isBridge && !centrality.isHub) {
    bridgeIndex++;
    const neighborPositions: Record<string, { x: number; y: number }> = {};
    const nodeAnalysis = analysis.nodes.get(node.id);
    nodeAnalysis?.neighborIds.forEach(nId => {
      if (basePositions[nId]) {
        neighborPositions[nId] = basePositions[nId];
      }
    });

    if (node.id === 'ApexClass:DateUtils') {
      console.log(`\n--- Bridge #${bridgeIndex}: ${node.id} Allocation ---`);
      console.log('Before allocation, basePositions["ApexClass:DateUtils"] =', basePositions['ApexClass:DateUtils']);
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
          allocatedPositions: basePositions,
          immutablePrimaryPositions: immutableStage7Primary,
        }
      );
      basePositions[node.id] = bridgeInfo.candidatePosition;
      console.log('After allocation, DateUtils allocated bridge position =', bridgeInfo.candidatePosition);
      console.log('immutableStage7Primary["ApexClass:DateUtils"] remains =', immutableStage7Primary['ApexClass:DateUtils']);
    } else if (node.id === 'ApexClass:StandardAccessPolicy') {
      console.log(`\n--- Bridge #${bridgeIndex}: ${node.id} Candidate Evaluation ---`);
      console.log('Evaluating StandardAccessPolicy...');
      console.log('Dynamic bridge occupancy for DateUtils:', basePositions['ApexClass:DateUtils']);
      console.log('Immutable primary occupancy for DateUtils:', immutableStage7Primary['ApexClass:DateUtils']);

      const candidateTest = { x: 4538.80, y: 260.00 };
      const dateUtilsPrimary = immutableStage7Primary['ApexClass:DateUtils'];
      const dateUtilsBridge = basePositions['ApexClass:DateUtils'];

      const dxPrimary = Math.abs(dateUtilsPrimary.x - candidateTest.x);
      const dyPrimary = Math.abs(dateUtilsPrimary.y - candidateTest.y);
      const primaryCollides = dxPrimary < 160 - 1e-3 && dyPrimary < 100 - 1e-3;

      const dxBridge = Math.abs(dateUtilsBridge.x - candidateTest.x);
      const dyBridge = Math.abs(dateUtilsBridge.y - candidateTest.y);
      const bridgeCollides = dxBridge < 160 - 1e-3 && dyBridge < 100 - 1e-3;

      console.log(`Candidate Coordinate: (${candidateTest.x}, ${candidateTest.y})`);
      console.log(`Against DateUtils Primary (${dateUtilsPrimary.x}, ${dateUtilsPrimary.y}):`);
      console.log(`  dx = ${dxPrimary.toFixed(2)}, dy = ${dyPrimary.toFixed(2)}, collides = ${primaryCollides}`);
      console.log(`Against DateUtils Bridge (${dateUtilsBridge.x}, ${dateUtilsBridge.y}):`);
      console.log(`  dx = ${dxBridge.toFixed(2)}, dy = ${dyBridge.toFixed(2)}, collides = ${bridgeCollides}`);

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
          allocatedPositions: basePositions,
          immutablePrimaryPositions: immutableStage7Primary,
        }
      );
      basePositions[node.id] = bridgeInfo.candidatePosition;
      console.log('StandardAccessPolicy accepted candidate position =', bridgeInfo.candidatePosition);
    } else {
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
          allocatedPositions: basePositions,
          immutablePrimaryPositions: immutableStage7Primary,
        }
      );
      basePositions[node.id] = bridgeInfo.candidatePosition;
    }
  }
});
