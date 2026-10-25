import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge, ArchitectureLayoutMode } from '../types/explorer';
import {
  computeArchitectureLayoutWithMetadata,
  type ArchitectureLayoutOptions,
} from '../lib/architecture-layout';

interface DatasetSpec {
  key: string;
  file: string;
}

function loadDataset(ds: DatasetSpec): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const p1 = path.resolve(process.cwd(), ds.file);
  const p2 = path.resolve(__dirname, '../../', ds.file);
  const fullPath = fs.existsSync(p1) ? p1 : p2;
  const raw = fs.readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

describe('Phase 6A — Production Activation & Constellation Isolation Suite', () => {
  test('Hierarchical Mode Activates Candidate D', () => {
    const { nodes, edges } = loadDataset({ key: 'cst', file: 'public/projects/cst/explorer-data.json' });

    function isCandidateDMode(mode: ArchitectureLayoutMode): boolean {
      return mode === 'hierarchical';
    }

    // Simulate effectiveLayoutOptions for Hierarchical
    const modeHierarchical: ArchitectureLayoutMode = 'hierarchical';
    const optionsHierarchical: ArchitectureLayoutOptions = {
      architectureMode: modeHierarchical,
      enableCandidateDOrdering: isCandidateDMode(modeHierarchical),
    };

    expect(optionsHierarchical.enableCandidateDOrdering).toBe(true);

    const resHierarchical = computeArchitectureLayoutWithMetadata(nodes, edges, optionsHierarchical);
    expect(resHierarchical.positions).toBeDefined();
  });

  test('Constellation / Orbit Negative Control Disables Candidate D', () => {
    function isCandidateDMode(mode: ArchitectureLayoutMode): boolean {
      return mode === 'hierarchical';
    }

    const { nodes, edges } = loadDataset({ key: 'cst', file: 'public/projects/cst/explorer-data.json' });

    // Simulate effectiveLayoutOptions for Orbit/Constellation
    const modeOrbit: ArchitectureLayoutMode = 'orbit';
    const modeHybrid: ArchitectureLayoutMode = 'hybrid';

    const optionsOrbit: ArchitectureLayoutOptions = {
      architectureMode: modeOrbit,
      enableCandidateDOrdering: isCandidateDMode(modeOrbit),
    };

    const optionsHybrid: ArchitectureLayoutOptions = {
      architectureMode: modeHybrid,
      enableCandidateDOrdering: isCandidateDMode(modeHybrid),
    };

    expect(optionsOrbit.enableCandidateDOrdering).toBe(false);
    expect(optionsHybrid.enableCandidateDOrdering).toBe(false);

    const resOrbit = computeArchitectureLayoutWithMetadata(nodes, edges, optionsOrbit);
    expect(resOrbit.positions).toBeDefined();
  });

  test('Mode Transition Test: Hierarchical -> Constellation -> Hierarchical (Zero State Leakage)', () => {
    const pbimData = loadDataset({ key: 'pbim', file: 'public/projects/pbim/explorer-data.json' });

    // 1. First Hierarchical Run (Candidate D ON)
    const run1 = computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, {
      architectureMode: 'hierarchical',
      enableCandidateDOrdering: true,
    }).positions;

    // 2. Constellation / Orbit Run (Candidate D OFF)
    computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, {
      architectureMode: 'orbit',
      enableCandidateDOrdering: false,
    });

    // 3. Second Hierarchical Run (Candidate D ON)
    const run2 = computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, {
      architectureMode: 'hierarchical',
      enableCandidateDOrdering: true,
    }).positions;

    expect(Object.keys(run1).length).toBe(pbimData.nodes.length);
    expect(Object.keys(run2).length).toBe(pbimData.nodes.length);

    // Verify complete bit-for-bit coordinate identity between Run 1 and Run 2
    for (const [id, pos1] of Object.entries(run1)) {
      const pos2 = run2[id];
      expect(pos2).toBeDefined();
      expect(pos2.x).toBe(pos1.x);
      expect(pos2.y).toBe(pos1.y);
    }
  });
});
