import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { computeArchitectureLayoutWithMetadata } from '../lib/architecture-layout';
import type { ExplorerDataSchema } from '../types/explorer';

describe('Component Constellation Integration — Option C Dual Experience & E2E Orchestration', () => {
  it('1. Verifies Option C dual experience contract (Macro Cytoscape mode & Standalone Focal SVG Lens)', () => {
    // 1a. Macro Cytoscape constellation mode metadata
    const macroResult = computeArchitectureLayoutWithMetadata(
      pbimData.nodes,
      pbimData.edges,
      { architectureMode: 'constellation' }
    );
    expect(macroResult.positions).toBeDefined();
    expect(Object.keys(macroResult.positions).length).toBe(42);
    expect(macroResult.projectedNodeIds?.size).toBe(42);

    // 1b. Focal orbital SVG lens adapter contract
    const { adaptConstellation } = require('../lib/adapters/constellation-adapter');
    const focalResult = adaptConstellation(pbimData, {
      focalNodeId: 'LWC:asset-dashboard-container',
      maxDepth: 2,
      direction: 'both',
    });
    expect(focalResult.focalNode).toBeDefined();
    expect(focalResult.focalNode.displayName).toContain('asset-dashboard-container');
    expect(focalResult.summary.ringCount).toBeGreaterThan(0);
  });

  it('2. CC-003 Project Isolation: Resets or falls back when focal ID is invalid for dataset', () => {
    const { adaptConstellation } = require('../lib/adapters/constellation-adapter');
    const invalidFocalResult = adaptConstellation(pbimData, {
      focalNodeId: 'INVALID_PROJECT_A_NODE_ID',
      maxDepth: 2,
    });
    expect(invalidFocalResult.focalNode).toBeDefined();
    expect(invalidFocalResult.focalNode?.id).not.toBe('INVALID_PROJECT_A_NODE_ID');
    expect(invalidFocalResult.availableNodes.length).toBeGreaterThan(0);
    expect(invalidFocalResult.focalNode?.id).toBe(invalidFocalResult.availableNodes[0].id);
  });

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
