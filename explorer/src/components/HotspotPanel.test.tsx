import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HotspotPanel } from './HotspotPanel';
import { ExplorerNode } from '../types/explorer';

describe('HotspotPanel', () => {
  const nodes: ExplorerNode[] = [
    {
      id: 'ApexClass:CommonSelector',
      displayName: 'CommonSelector',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/CommonSelector.cls',
      metrics: { fanIn: 82, fanOut: 5, coupling: 87, unresolved: 0, score: 20 },
      risk: 'HIGH',
      riskReasons: ['high fan-in'],
      behavior: { isTest: false, publicContractsCount: 5, asyncPatterns: [], securitySignalsCount: 0, queryCount: 10, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
    }
  ];

  it('renders architectural hotspots header and items', () => {
    render(
      <HotspotPanel
        nodes={nodes}
        cycles={[]}
        impactSummaries={{}}
        onSelectHotspot={vi.fn()}
        selectedNodeId={null}
      />
    );

    expect(screen.getByText('Architectural Hotspots')).toBeInTheDocument();
    expect(screen.getByText('CommonSelector')).toBeInTheDocument();
  });

  it('triggers onSelectHotspot when hotspot item is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <HotspotPanel
        nodes={nodes}
        cycles={[]}
        impactSummaries={{}}
        onSelectHotspot={handleSelect}
        selectedNodeId={null}
      />
    );

    fireEvent.click(screen.getByText('CommonSelector'));
    expect(handleSelect).toHaveBeenCalledWith(nodes[0]);
  });

  it('allows switching hotspot tabs', () => {
    render(
      <HotspotPanel
        nodes={nodes}
        cycles={[]}
        impactSummaries={{}}
        onSelectHotspot={vi.fn()}
        selectedNodeId={null}
      />
    );

    const fanInTab = screen.getByRole('button', { name: /Fan-In/i });
    fireEvent.click(fanInTab);
    expect(screen.getByText('CommonSelector')).toBeInTheDocument();
  });
});
