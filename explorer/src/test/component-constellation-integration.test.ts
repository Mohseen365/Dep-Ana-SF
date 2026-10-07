import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import type { ExplorerDataSchema } from '../../types/explorer';

describe('Component Constellation Integration — End-to-End Orchestration & Regression', () => {
  const pbimPath = path.join(__dirname, '../../public/projects/pbim/explorer-data.json');
  const pbimRaw = fs.readFileSync(pbimPath, 'utf8');
  const pbimData: ExplorerDataSchema = JSON.parse(pbimRaw);

  it('1. Reaches constellation layout path and calculates positions for PBIM', () => {
    const result = computeArchitectureLayoutWithMetadata(
      pbimData.nodes,
      pbimData.edges,
      { architectureMode: 'constellation' }
    );

    expect(result.positions).toBeDefined();
    expect(Object.keys(result.positions).length).toBe(42); // 42 unique k=1 nodes in PBIM projection
    expect(result.projectedNodeIds).toBeDefined();
    expect(result.projectedNodeIds!.size).toBe(42);
    expect(result.orbitGuides).toBeDefined();
  });

  it('2. Preserves non-regression of existing architecture modes (hierarchical, hybrid, orbit)', { timeout: 60000 }, () => {
    const hierarchicalRes = computeArchitectureLayoutWithMetadata(
      pbimData.nodes,
      pbimData.edges,
      { architectureMode: 'hierarchical' }
    );
    expect(Object.keys(hierarchicalRes.positions).length).toBe(pbimData.nodes.length);

    const hybridRes = computeArchitectureLayoutWithMetadata(
      pbimData.nodes,
      pbimData.edges,
      { architectureMode: 'hybrid' }
    );
    expect(Object.keys(hybridRes.positions).length).toBe(pbimData.nodes.length);
    expect(hybridRes.featureRegions).toBeDefined();

    const orbitRes = computeArchitectureLayoutWithMetadata(
      pbimData.nodes,
      pbimData.edges,
      { architectureMode: 'orbit', focalLwcId: 'LWC:asset-dashboard-container' }
    );
    expect(orbitRes.positions['LWC:asset-dashboard-container']).toEqual({ x: 0, y: 0 });
  });
});
