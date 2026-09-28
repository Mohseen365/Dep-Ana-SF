import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ExplorerDataSchema } from '../types/explorer';
import { ArchitectureDNABarcode } from './ArchitectureDNABarcode';
import { createMockNode, createMockEdge, createMockDataSchema } from '../test/mock-factories';

describe('ArchitectureDNABarcode', () => {
  const nodeB = createMockNode('ApexClass:ServiceB', 'ServiceB', 'ApexClass', 'HIGH', 'force-app/main/default/classes/ServiceB.cls');
  nodeB.metrics = { fanIn: 10, fanOut: 2, coupling: 12, unresolved: 0, score: 85 };

  const nodeA = createMockNode('ApexClass:ControllerA', 'ControllerA', 'ApexClass', 'LOW', 'force-app/main/default/classes/ControllerA.cls');
  nodeA.metrics = { fanIn: 0, fanOut: 5, coupling: 5, unresolved: 0, score: 10 };

  const mockSchema: ExplorerDataSchema = {
    ...createMockDataSchema(
      [nodeB, nodeA],
      [createMockEdge('edge-1', 'ApexClass:ControllerA', 'ApexClass:ServiceB', 'method-call')]
    ),
    schemaVersion: '1.0.0',
    analyzerVersion: '1.0.0',
    generatedAt: '2026-09-27T00:00:00.000Z',
    sourceDirectory: 'force-app/main/default',
  };

  it('1. renders ArchitectureDNABarcode panel with summary bar and component list', () => {
    render(<ArchitectureDNABarcode data={mockSchema} />);

    expect(screen.getByTestId('architecture-dna-panel')).toBeInTheDocument();
    expect(screen.getByText('Architecture DNA / Barcode Lens')).toBeInTheDocument();
    expect(screen.getByTestId('dna-component-list')).toBeInTheDocument();
    expect(screen.getAllByText('ControllerA').length).toBeGreaterThan(0);
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
    fireEvent.change(searchInput, { target: { value: 'XYZ_NonExistent' } });

    expect(screen.queryByTestId('dna-item-ApexClass:ControllerA')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dna-item-ApexClass:ServiceB')).not.toBeInTheDocument();
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
