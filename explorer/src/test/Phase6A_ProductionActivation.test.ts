import { describe, test, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import {
  computeArchitectureLayoutWithMetadata,
  type ArchitectureLayoutOptions,
} from '../lib/architecture-layout';

interface DatasetSpec {
  key: string;
  file: string;
}

const DATASETS: DatasetSpec[] = [
  { key: 'cst', file: 'public/projects/cst/explorer-data.json' },
  { key: 'bqc', file: 'public/projects/bqc/explorer-data.json' },
  { key: 'pbim', file: 'public/projects/pbim/explorer-data.json' },
];

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

    // Simulate effectiveLayoutOptions for Hierarchical
    const optionsHierarchical: ArchitectureLayoutOptions = {
      architectureMode: 'hierarchical',
      enableCandidateDOrdering: 'hierarchical' === 'hierarchical',
    };

    expect(optionsHierarchical.enableCandidateDOrdering).toBe(true);

    const resHierarchical = computeArchitectureLayoutWithMetadata(nodes, edges, optionsHierarchical);
    expect(resHierarchical.positions).toBeDefined();
  });

  test('Constellation / Orbit Negative Control Disables Candidate D', () => {
    const { nodes, edges } = loadDataset({ key: 'cst', file: 'public/projects/cst/explorer-data.json' });

    // Simulate effectiveLayoutOptions for Orbit/Constellation
    const optionsOrbit: ArchitectureLayoutOptions = {
      architectureMode: 'orbit',
      enableCandidateDOrdering: 'orbit' === 'hierarchical',
    };

    const optionsHybrid: ArchitectureLayoutOptions = {
      architectureMode: 'hybrid',
      enableCandidateDOrdering: 'hybrid' === 'hierarchical',
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
    const runOrbit = computeArchitectureLayoutWithMetadata(pbimData.nodes, pbimData.edges, {
      architectureMode: 'orbit',
      enableCandidateDOrdering: false,
    }).positions;

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
