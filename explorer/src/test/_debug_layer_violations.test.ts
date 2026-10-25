import { describe, it, expect } from 'vitest';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { ExplorerDataSchema } from '../types/explorer';
const fixturePath = resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = readFileSync(fixturePath, 'utf-8');
const rawParsed = JSON.parse(rawData);
const dataset = (rawParsed.data ? rawParsed.data : rawParsed) as ExplorerDataSchema;

describe('Debug layer violations', () => {
  it('prints violations', () => {
    const fullResult = computeArchitectureLayoutWithMetadata(dataset.nodes, dataset.edges, { enableFeatureLayout: true });
    const evalMetrics = evaluateLayout(dataset.nodes, dataset.edges, fullResult.positions);
    console.log('layerViolationCount =', evalMetrics.layerViolationCount);
    console.log('violation edges =', evalMetrics.layerViolationEdges?.length);
    if (evalMetrics.layerViolationEdges) {
      evalMetrics.layerViolationEdges.slice(0, 20).forEach(e => console.log(e.source, '->', e.target));
    }
    // keep test passing
    expect(evalMetrics.layerViolationCount).toBeGreaterThanOrEqual(0);
  });
});
