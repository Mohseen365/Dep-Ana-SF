import { describe, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { measurePipelineStageMetrics } from './layout/pipeline-stage-diagnostics';

describe('Controlled Variant Experiments & Coordinate Tracing', () => {
  it('runs measurePipelineStageMetrics and outputs full stage table and coordinate trace', () => {
    const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
    const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const result = measurePipelineStageMetrics(data.nodes, data.edges, { enableFeatureLayout: true });

    console.log('\n=================== STAGE-BY-STAGE METRICS TABLE ===================');
    console.table(result.stageTable);

    // Trace representative nodes across stages
    const repNodeIds = [
      'ApexClass:CloudSpendService', // High fan-in primary
      'ApexClass:AccountController', // Primary caller
      'ApexClass:AccountServiceTest', // Secondary test satellite
      'Field:Cloud_Account__c.Status__c', // Secondary field satellite
    ];

    console.log('\n=================== REPRESENTATIVE NODE COORDINATE TRACE ===================');
    const stages = ['Stage 5', 'Stage 6', 'Stage 7', 'Stage 8', 'Stage 9', 'Stage 10', 'Stage 11'];

    repNodeIds.forEach(nodeId => {
      console.log(`\nNode: ${nodeId}`);
      stages.forEach(stg => {
        const snap = result.snapshots[stg];
        const pos = snap?.positions[nodeId];
        console.log(`  ${stg} (${snap?.stageName}): ${pos ? `(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})` : 'NOT POSITIONED'}`);
      });
    });
  });
});
