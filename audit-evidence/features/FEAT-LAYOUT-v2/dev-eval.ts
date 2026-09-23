import fs from 'fs';
import path from 'path';
import { computeArchitectureLayout } from '../../../explorer/src/lib/architecture-layout';
import { evaluateLayout } from '../../../explorer/src/lib/layout/evaluate-layout';
import { ExplorerNode, ExplorerEdge } from '../../../explorer/src/types/explorer';

const fixturePath = path.resolve('audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const nodes: ExplorerNode[] = rawData.nodes;
const edges: ExplorerEdge[] = rawData.edges;

console.log(`Loaded fixture: ${nodes.length} nodes, ${edges.length} edges.`);

// V-02: Run with enableFeatureLayout: true
const startTime = performance.now();
const positionsFeature = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
const endTime = performance.now();
const runtimeMs = endTime - startTime;

const metricsFeature = evaluateLayout(nodes, edges, positionsFeature);

console.log('--- V-02 METRICS (enableFeatureLayout: true) ---');
console.log(`Runtime: ${runtimeMs.toFixed(2)} ms`);
console.log(`Ctotal: ${metricsFeature.edgeCrossingCount}`);
if (metricsFeature.detailedCrossings) {
  const dc = metricsFeature.detailedCrossings;
  console.log(`Cpp: ${dc.primaryPrimaryCrossings}`);
  console.log(`Cps: ${dc.primarySatelliteCrossings}`);
  console.log(`Css: ${dc.satelliteSatelliteCrossings}`);
  console.log(`Cpb: ${dc.primaryBridgeCrossings}`);
  console.log(`Cbb: ${dc.bridgeBridgeCrossings}`);
  const sum = dc.primaryPrimaryCrossings + dc.primarySatelliteCrossings + dc.satelliteSatelliteCrossings + dc.primaryBridgeCrossings + dc.bridgeBridgeCrossings;
  console.log(`Equation sum: ${sum} (Matches Ctotal: ${sum === metricsFeature.edgeCrossingCount})`);
}
console.log(`primaryOverlaps: ${metricsFeature.primaryOverlapCount}`);
console.log(`satelliteOverlaps: ${metricsFeature.satelliteOverlapCount}`);
console.log(`layerViolations: ${metricsFeature.layerViolationCount}`);
console.log(`minClearancePx: ${metricsFeature.minClearance}`);

// V-04: 10x determinism
let maxDrift10x = 0;
const basePos = positionsFeature;
for (let i = 0; i < 10; i++) {
  const pos = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
  for (const nodeId of Object.keys(basePos)) {
    const dx = Math.abs(pos[nodeId].x - basePos[nodeId].x);
    const dy = Math.abs(pos[nodeId].y - basePos[nodeId].y);
    if (dx > maxDrift10x) maxDrift10x = dx;
    if (dy > maxDrift10x) maxDrift10x = dy;
  }
}
console.log(`\n--- V-04 DETERMINISM (10x) ---`);
console.log(`Max coordinate drift (10x): ${maxDrift10x.toFixed(5)} px`);

// V-05: 5x input shuffle
let maxDrift5xShuffle = 0;
for (let i = 0; i < 5; i++) {
  const shuffledNodes = [...nodes].sort(() => (i % 2 === 0 ? 0.5 - Math.random() : -0.5 + Math.random()));
  const shuffledEdges = [...edges].sort(() => (i % 2 === 0 ? -0.5 + Math.random() : 0.5 - Math.random()));
  const pos = computeArchitectureLayout(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });
  for (const nodeId of Object.keys(basePos)) {
    const dx = Math.abs(pos[nodeId].x - basePos[nodeId].x);
    const dy = Math.abs(pos[nodeId].y - basePos[nodeId].y);
    if (dx > maxDrift5xShuffle) maxDrift5xShuffle = dx;
    if (dy > maxDrift5xShuffle) maxDrift5xShuffle = dy;
  }
}
console.log(`\n--- V-05 SHUFFLE DETERMINISM (5x) ---`);
console.log(`Max coordinate drift (5x shuffle): ${maxDrift5xShuffle.toFixed(5)} px`);

// V-06: Legacy path (enableFeatureLayout: false)
const positionsLegacy1 = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });
const positionsLegacy2 = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });
let maxDriftLegacy = 0;
for (const nodeId of Object.keys(positionsLegacy1)) {
  const dx = Math.abs(positionsLegacy1[nodeId].x - positionsLegacy2[nodeId].x);
  const dy = Math.abs(positionsLegacy1[nodeId].y - positionsLegacy2[nodeId].y);
  if (dx > maxDriftLegacy) maxDriftLegacy = dx;
  if (dy > maxDriftLegacy) maxDriftLegacy = dy;
}
console.log(`\n--- V-06 LEGACY PATH ---`);
console.log(`Max legacy coordinate drift: ${maxDriftLegacy.toFixed(5)} px`);

// V-08: Coordinate validity
let nonFiniteCount = 0;
for (const [id, pos] of Object.entries(positionsFeature)) {
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
    nonFiniteCount++;
  }
}
console.log(`\n--- V-08 COORDINATE VALIDITY ---`);
console.log(`Non-finite coordinate count: ${nonFiniteCount} / ${Object.keys(positionsFeature).length}`);
