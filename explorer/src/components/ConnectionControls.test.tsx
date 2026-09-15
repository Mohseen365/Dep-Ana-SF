import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionControls } from './ConnectionControls';
import { ExplorerNode } from '../types/explorer';

describe('ConnectionControls component', () => {
  const sampleNode: ExplorerNode = {
    id: 'ApexClass:Service',
    displayName: 'Service',
    type: 'ApexClass',
    file: 'force-app/main/default/classes/Service.cls',
    metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
    risk: 'HIGH',
    riskReasons: ['High coupling'],
    behavior: {
      isTest: false,
      sharing: 'with sharing',
      publicContractsCount: 2,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 2,
      dmlCount: 1,
      calloutCount: 0,
    },
    refactoringReadiness: {
      isHighRisk: true,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED',
    },
  };

  const defaultConnectionState = {
    enabled: true,
    originNodeId: 'ApexClass:Service',
    direction: 'both' as const,
    depth: 2 as const,
  };

  it('renders disabled toggle button when no node selected and inactive', () => {
    const handleConnectionChange = vi.fn();
    render(
      <ConnectionControls
        connectionState={{ enabled: false, originNodeId: null, direction: 'both', depth: 2 }}
        connectionResult={null}
        onConnectionChange={handleConnectionChange}
        onExitConnection={vi.fn()}
        selectedNode={null}
        onShowConnection={vi.fn()}
      />
    );

    expect(screen.getByTestId('connection-toggle-btn')).toBeDefined();
    expect(screen.getByText('Select a component to analyze method-level connections')).toBeDefined();
  });

  it('renders direction and depth dropdowns when active', () => {
    const handleConnectionChange = vi.fn();
    render(
      <ConnectionControls
        connectionState={defaultConnectionState}
        connectionResult={null}
        onConnectionChange={handleConnectionChange}
        onExitConnection={vi.fn()}
        selectedNode={sampleNode}
        onShowConnection={vi.fn()}
      />
    );

    expect(screen.getByTestId('connection-direction-select')).toBeDefined();
    expect(screen.getByTestId('connection-depth-select')).toBeDefined();
  });

  it('calls onConnectionChange with updated direction when direction changed', () => {
    const handleConnectionChange = vi.fn();
    render(
      <ConnectionControls
        connectionState={defaultConnectionState}
        connectionResult={null}
        onConnectionChange={handleConnectionChange}
        onExitConnection={vi.fn()}
        selectedNode={sampleNode}
        onShowConnection={vi.fn()}
      />
    );

    const dirSelect = screen.getByTestId('connection-direction-select');
    fireEvent.change(dirSelect, { target: { value: 'dependencies' } });

    expect(handleConnectionChange).toHaveBeenCalledWith({
      ...defaultConnectionState,
      direction: 'dependencies',
    });
  });

  it('calls onConnectionChange with depths 1, 2, 3, ALL when depth changed', () => {
    const handleConnectionChange = vi.fn();
    render(
      <ConnectionControls
        connectionState={defaultConnectionState}
        connectionResult={null}
        onConnectionChange={handleConnectionChange}
        onExitConnection={vi.fn()}
        selectedNode={sampleNode}
        onShowConnection={vi.fn()}
      />
    );

    const depthSelect = screen.getByTestId('connection-depth-select');

    fireEvent.change(depthSelect, { target: { value: '1' } });
    expect(handleConnectionChange).toHaveBeenCalledWith({
      ...defaultConnectionState,
      depth: 1,
    });

    fireEvent.change(depthSelect, { target: { value: '3' } });
    expect(handleConnectionChange).toHaveBeenCalledWith({
      ...defaultConnectionState,
      depth: 3,
    });

    fireEvent.change(depthSelect, { target: { value: 'ALL' } });
    expect(handleConnectionChange).toHaveBeenCalledWith({
      ...defaultConnectionState,
      depth: 'ALL',
    });
  });
});
