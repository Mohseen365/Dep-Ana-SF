import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ExplorerDataSchema } from '../types/explorer';
import { ArchitectureDNABarcode } from './ArchitectureDNABarcode';

describe('ArchitectureDNABarcode', () => {
  const mockSchema: ExplorerDataSchema = {
    schemaVersion: '1.0.0',
    analyzerVersion: '1.0.0',
    generatedAt: '2026-09-27T00:00:00.000Z',
    sourceDirectory: 'force-app/main/default',
    project: {
      id: 'test-project',
      name: 'Test Project',
      description: 'Test Dataset',
      sourcePath: 'force-app/main/default',
      createdAt: '2026-09-27T00:00:00.000Z',
      updatedAt: '2026-09-27T00:00:00.000Z',
      lastAnalyzedAt: '2026-09-27T00:00:00.000Z',
      analysisStatus: 'COMPLETE',
      componentCount: 2,
      dependencyCount: 1,
    },
    nodes: [
      {
        id: 'ApexClass:ServiceB',
        name: 'ServiceB',
        displayName: 'ServiceB',
        type: 'ApexClass',
        file: 'force-app/main/default/classes/ServiceB.cls',
        layer: 'domain',
        domain: 'DomainB',
        risk: 'HIGH',
        metrics: { fanIn: 10, fanOut: 2, coupling: 12, unresolved: 0, score: 85 },
        refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false },
      },
      {
        id: 'ApexClass:ControllerA',
        name: 'ControllerA',
        displayName: 'ControllerA',
        type: 'ApexClass',
        file: 'force-app/main/default/classes/ControllerA.cls',
        layer: 'presentation',
        domain: 'DomainA',
        risk: 'LOW',
        metrics: { fanIn: 0, fanOut: 5, coupling: 5, unresolved: 0, score: 10 },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'ApexClass:ControllerA',
        target: 'ApexClass:ServiceB',
        type: 'calls',
      },
    ],
    cycles: [],
    impactSummaries: {},
  };

  it('1. renders ArchitectureDNABarcode panel with summary bar and component list', () => {
    render(<ArchitectureDNABarcode data={mockSchema} />);

    expect(screen.getByTestId('architecture-dna-panel')).toBeInTheDocument();
    expect(screen.getByText('Architecture DNA / Barcode Lens')).toBeInTheDocument();
    expect(screen.getByTestId('dna-component-list')).toBeInTheDocument();
    expect(screen.getByText('ControllerA')).toBeInTheDocument();
    expect(screen.getByText('ServiceB')).toBeInTheDocument();
  });

  it('2. renders 7-band barcode visual strips and band inspector cards', () => {
    render(<ArchitectureDNABarcode data={mockSchema} selectedNodeId="ApexClass:ServiceB" />);

    expect(screen.getByTestId('dna-barcode-visual-strips')).toBeInTheDocument();
    expect(screen.getByTestId('dna-band-inspector-grid')).toBeInTheDocument();

    // Verify all 7 band inspector cards are rendered
    const bandIds = ['layer', 'fanIn', 'fanOut', 'risk', 'centrality', 'hotspot', 'hygiene'];
    bandIds.forEach(id => {
      expect(screen.getByTestId(`dna-band-card-${id}`)).toBeInTheDocument();
    });
  });

  it('3. handles null or empty dataset gracefully', () => {
    render(<ArchitectureDNABarcode data={null} />);

    expect(screen.getByTestId('architecture-dna-panel')).toBeInTheDocument();
    expect(screen.getByText('No Architecture DNA Data')).toBeInTheDocument();
  });

  it('4. filters component list via search input', () => {
    render(<ArchitectureDNABarcode data={mockSchema} />);

    const searchInput = screen.getByTestId('dna-search-input');
    fireEvent.change(searchInput, { target: { value: 'Service' } });

    expect(screen.getByText('ServiceB')).toBeInTheDocument();
    expect(screen.queryByText('ControllerA')).not.toBeInTheDocument();
  });

  it('5. triggers onSelectNode callback when Explore button is clicked', () => {
    const handleSelectNode = vi.fn();
    render(<ArchitectureDNABarcode data={mockSchema} selectedNodeId="ApexClass:ControllerA" onSelectNode={handleSelectNode} />);

    const exploreBtn = screen.getByTestId('dna-explore-graph-btn');
    fireEvent.click(exploreBtn);

    expect(handleSelectNode).toHaveBeenCalledWith('ApexClass:ControllerA');
  });

  it('6. operates on frozen input without mutation', () => {
    const frozenSchema = Object.freeze({
      ...mockSchema,
      nodes: Object.freeze([...mockSchema.nodes.map(n => Object.freeze({ ...n }))]),
      edges: Object.freeze([...mockSchema.edges.map(e => Object.freeze({ ...e }))]),
    });

    expect(() => render(<ArchitectureDNABarcode data={frozenSchema as ExplorerDataSchema} />)).not.toThrow();
  });
});
