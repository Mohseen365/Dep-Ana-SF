import { describe, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import {
  calculateLayoutMetrics,
  calculateDetailedEdgeCrossings,
  primaryNodeOverlapCount,
  satelliteNodeOverlapCount,
  minimumNodeClearance,
} from '../lib/layout/metrics';

const cloudSpendFixturePath = path.resolve(
  __dirname,
  '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);

const rawData = JSON.parse(fs.readFileSync(cloudSpendFixturePath, 'utf8'));
const nodes: ExplorerNode[] = rawData.nodes;
const edges: ExplorerEdge[] = rawData.edges;

describe('Phase 7B Forensic & Locality Analysis', () => {
  it('analyzes current baseline metrics', () => {
    const pos = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const detailed = calculateDetailedEdgeCrossings(nodes, edges, pos);
    const metrics = calculateLayoutMetrics(nodes, edges, pos);
    console.log('AUTHORITATIVE BASELINE:');
    console.log(`C_pp: ${detailed.primaryPrimaryCrossings}`);
    console.log(`C_ps: ${detailed.primarySatelliteCrossings}`);
    console.log(`C_ss: ${detailed.satelliteSatelliteCrossings}`);
    console.log(`C_total: ${detailed.totalGeometricCrossings}`);
    console.log(`Layer violations: ${metrics.layerViolationCount}`);
    console.log(`Primary overlaps: ${primaryNodeOverlapCount(nodes, edges, pos)}`);
    console.log(`Satellite overlaps: ${satelliteNodeOverlapCount(nodes, edges, pos)}`);
    console.log(`Min clearance: ${minimumNodeClearance(nodes, edges, pos)}`);
  });
});
