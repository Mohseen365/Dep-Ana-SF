import fs from 'fs';
import path from 'path';
import { measurePipelineStageMetrics } from '../../../explorer/src/lib/layout/pipeline-stage-diagnostics';

const fixturePath = path.resolve('audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

console.log('Running 13-stage pipeline boundary instrumentation...');
const report = measurePipelineStageMetrics(rawData.nodes, rawData.edges, { enableFeatureLayout: true });

console.log('\nStage Boundary Table:');
console.log('Stage | Stage Name | Node Count | C_pp | C_total | Avg Edge Len | Layer Violations | Overlaps');
console.log('------|------------|------------|------|---------|--------------|------------------|---------');

report.stageTable.forEach(s => {
  console.log(`${s.stage.padEnd(8)} | ${s.stageName.padEnd(38)} | ${s.positionedNodeCount.toString().padStart(10)} | ${s.primaryPrimaryCrossings.toString().padStart(4)} | ${s.totalCrossings.toString().padStart(7)} | ${s.avgEdgeLength.toFixed(1).padStart(12)} | ${s.layerViolations.toString().padStart(16)} | ${s.primaryOverlaps + s.satelliteOverlaps}`);
});
