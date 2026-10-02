import { runFullPipelineHarness } from './run-harness';

const exp = runFullPipelineHarness({ useDualOccupancy: true });
const bqc = exp.BQC;

console.log('=== BQC STAGE 8 OVERLAPS DETAILED ANALYSIS ===');

// Identify primary vs bridge nodes in BQC Stage 8
const fullPath = require('path').resolve(process.cwd(), 'explorer/public/projects/bqc/explorer-data.json');
const parsed = JSON.parse(require('fs').readFileSync(fullPath, 'utf8'));
const safeNodes = [...parsed.nodes].sort((a: any, b: any) => a.id.localeCompare(b.id));
const safeEdges = [...parsed.edges].sort((a: any, b: any) => a.id.localeCompare(b.id));

const index = require('./explorer/src/lib/layout/graph-index').createLayoutGraphIndex(safeNodes, safeEdges);
let analysis = require('./explorer/src/lib/layout/analysis').computeArchitectureAnalysis(safeNodes, safeEdges, { index });
const layerMap = new Map();
safeNodes.forEach(node => {
  layerMap.set(node.id, require('./explorer/src/lib/layout/layers').classifyNodeLayerWithReason(node).layer);
});
analysis = require('./explorer/src/lib/layout/analysis').applyLayerClassification(analysis, layerMap);

const domainDiscovery = require('./explorer/src/lib/layout/domains').discoverDomains(safeNodes, safeEdges);
const domainMap = new Map();
domainDiscovery.assignments.forEach((assignment: any, nodeId: string) => {
  domainMap.set(nodeId, assignment.primaryDomain);
});
analysis = require('./explorer/src/lib/layout/analysis').applyDomainClassification(analysis, domainMap);

const centralityMap = require('./explorer/src/lib/layout/centrality').computeGraphCentralityAnalysis(safeNodes, safeEdges, domainMap, layerMap, { index });

const globalDomainResult = require('./explorer/src/lib/layout/global-layout').computeGlobalDomainLayout(safeNodes, safeEdges, {
  domainSpacing: 380, layerSpacing: 250, nodeWidth: 120, nodeHeight: 60, analysis, domainDiscovery, layerMap, domainMap, index
});
const orderingResult = require('./explorer/src/lib/layout/ordering').reduceEdgeCrossings({
  nodes: safeNodes, edges: safeEdges, layerMap, domainMap, domainOrder: globalDomainResult.orderedDomains, layerYMap: globalDomainResult.layerYMap
});
const localResult = require('./explorer/src/lib/layout/local-layout').computeLocalNodeLayout({
  nodes: safeNodes, edges: safeEdges, analysis, domainRegions: globalDomainResult.domainRegions, layerMap, domainMap, bucketOrder: orderingResult.bucketOrder, options: { nodeWidth: 120, nodeHeight: 60, domainSpacing: 380, layerYMap: globalDomainResult.layerYMap }
});

const primaryPositions = localResult.primaryNodePositions;
const stage8Positions = bqc.stage8Positions;

const bridgeNodeIds = safeNodes.filter(n => {
  const c = centralityMap.get(n.id);
  return c?.isBridge && !c.isHub;
}).map(n => n.id);

let bpOverlaps = 0;
let bbOverlaps = 0;
let ppOverlaps = 0;

for (const bId of bridgeNodeIds) {
  const bPos = stage8Positions[bId];
  if (!bPos) continue;
  for (const pId of Object.keys(primaryPositions)) {
    if (pId === bId) continue;
    const pPos = primaryPositions[pId];
    if (Math.abs(pPos.x - bPos.x) < 160 - 1e-3 && Math.abs(pPos.y - bPos.y) < 100 - 1e-3) {
      bpOverlaps++;
      console.log(`Bridge-Primary Overlap: Bridge ${bId} (${bPos.x}, ${bPos.y}) vs Primary ${pId} (${pPos.x}, ${pPos.y})`);
    }
  }
}

console.log(`Verified Bridge-Primary Overlaps in BQC under H-5A: ${bpOverlaps}`);
