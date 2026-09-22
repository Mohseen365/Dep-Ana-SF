import fs from 'fs';
import path from 'path';
import { computeArchitectureLayout } from '../../../explorer/src/lib/architecture-layout';
import { ExplorerNode, ExplorerEdge } from '../../../explorer/src/types/explorer';

const fixturePath = path.resolve('audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

console.log('--- P-04 RUNTIME FOOTPRINT ON CANONICAL FIXTURE ---');

const startTime = performance.now();
const positions = computeArchitectureLayout(rawData.nodes, rawData.edges, { enableFeatureLayout: true });
const endTime = performance.now();
const runtimeMs = endTime - startTime;

let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const [id, pos] of Object.entries(positions)) {
  if (pos.x < minX) minX = pos.x;
  if (pos.x > maxX) maxX = pos.x;
  if (pos.y < minY) minY = pos.y;
  if (pos.y > maxY) maxY = pos.y;
}

const width = maxX - minX;
const height = maxY - minY;

console.log(`Node count: ${Object.keys(positions).length}`);
console.log(`Runtime: ${runtimeMs.toFixed(2)} ms`);
console.log(`Bounding Box: minX=${minX.toFixed(1)}, maxX=${maxX.toFixed(1)}, minY=${minY.toFixed(1)}, maxY=${maxY.toFixed(1)}`);
console.log(`Dimensions: ${width.toFixed(1)} px x ${height.toFixed(1)} px`);
console.log(`Aspect Ratio: ${(width / height).toFixed(2)}`);

const memUsage = process.memoryUsage();
console.log(`Memory Usage: heapUsed=${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB, rss=${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
