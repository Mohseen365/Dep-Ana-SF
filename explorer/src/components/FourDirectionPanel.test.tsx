import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FourDirectionPanel } from './FourDirectionPanel';
import { FourDirectionData } from '../lib/adapters/four-direction-adapter';

describe('FourDirectionPanel Component', () => {
  const sampleData: FourDirectionData = {
    subject: {
      nodeId: 'ApexClass:OrderController',
      displayName: 'OrderController',
      type: 'ApexClass',
      file: 'OrderController.cls',
      risk: 'HIGH',
      featureName: 'OrderView',
      layerName: 'Controller / Api',
      metrics: {
        fanIn: 1,
        fanOut: 2,
        coupling: 3,
        unresolved: 0,
        score: 50,
      },
    },
    quadrants: {
      up: {
        direction: 'up',
        title: 'Upstream Dependents',
        subtitle: 'Callers & Ingesting Components',
        items: [
          {
            nodeId: 'LWC:OrderCard',
            displayName: 'OrderCard',
            type: 'LWC',
            file: 'orderCard.js',
            risk: 'LOW',
            direction: 'up',
            directionLabel: 'Upstream Dependent',
            edges: [],
            relationshipTypes: ['lwc-apex'],
            distance: 1,
            featureName: 'OrderView',
            layerName: 'Ui / Presentation',
          },
        ],
        totalCount: 1,
      },
      down: {
        direction: 'down',
        title: 'Downstream Dependencies',
        subtitle: 'Callees & Services/Data',
        items: [
          {
            nodeId: 'ApexClass:OrderService',
            displayName: 'OrderService',
            type: 'ApexClass',
            file: 'OrderService.cls',
            risk: 'MEDIUM',
            direction: 'down',
            directionLabel: 'Downstream Dependency',
            edges: [],
            relationshipTypes: ['instantiation'],
            distance: 1,
            featureName: 'OrderView',
            layerName: 'Service / Business Logic',
          },
        ],
        totalCount: 1,
      },
      left: {
        direction: 'left',
        title: 'Same-Feature Peers',
        subtitle: 'Intra-Feature Components',
        items: [],
        totalCount: 0,
      },
      right: {
        direction: 'right',
        title: 'Shared & Cross-Feature',
        subtitle: 'Shared Utilities & External Data',
        items: [
          {
            nodeId: 'ApexClass:LoggerUtil',
            displayName: 'LoggerUtil',
            type: 'ApexClass',
            file: 'LoggerUtil.cls',
            risk: 'LOW',
            direction: 'right',
            directionLabel: 'Shared Infrastructure',
            edges: [],
            relationshipTypes: ['method-call'],
            distance: 1,
            featureName: 'Shared',
            layerName: 'Utility / Infrastructure',
          },
        ],
        totalCount: 1,
      },
    },
    summary: {
      totalNeighbors: 3,
      upstreamCount: 1,
      downstreamCount: 1,
      leftPeerCount: 0,
      rightCrossCount: 1,
      selectedNodeId: 'ApexClass:OrderController',
    },
    availableNodes: [
      { id: 'ApexClass:OrderController', displayName: 'OrderController', type: 'ApexClass' },
      { id: 'LWC:OrderCard', displayName: 'OrderCard', type: 'LWC' },
    ],
  };

  it('renders subject card and 4 cardinal quadrants', () => {
    render(<FourDirectionPanel data={sampleData} />);

    expect(screen.getByTestId('four-direction-panel')).toBeInTheDocument();
    expect(screen.getByTestId('subject-center-card')).toBeInTheDocument();
    expect(screen.getByTestId('quadrant-up')).toBeInTheDocument();
    expect(screen.getByTestId('quadrant-down')).toBeInTheDocument();
    expect(screen.getByTestId('quadrant-left')).toBeInTheDocument();
    expect(screen.getByTestId('quadrant-right')).toBeInTheDocument();

    expect(screen.getByText('OrderController')).toBeInTheDocument();
    expect(screen.getByText('OrderCard')).toBeInTheDocument();
    expect(screen.getByText('OrderService')).toBeInTheDocument();
    expect(screen.getByText('LoggerUtil')).toBeInTheDocument();
  });

  it('triggers onSelectNode when subject selector changes', () => {
    const handleSelect = vi.fn();
    render(<FourDirectionPanel data={sampleData} onSelectNode={handleSelect} />);

    const selector = screen.getByTestId('subject-selector');
    fireEvent.change(selector, { target: { value: 'LWC:OrderCard' } });

    expect(handleSelect).toHaveBeenCalledWith('LWC:OrderCard');
  });

  it('triggers onReturnToGraph when Return button is clicked', () => {
    const handleReturn = vi.fn();
    render(<FourDirectionPanel data={sampleData} onReturnToGraph={handleReturn} />);

    const returnBtn = screen.getByTestId('return-graph-btn');
    fireEvent.click(returnBtn);

    expect(handleReturn).toHaveBeenCalledTimes(1);
  });

  it('filters items in quadrants based on search input', () => {
    render(<FourDirectionPanel data={sampleData} />);

    const filterInput = screen.getByTestId('quadrant-filter-input');
    fireEvent.change(filterInput, { target: { value: 'Logger' } });

    expect(screen.getByText('LoggerUtil')).toBeInTheDocument();
    expect(screen.queryByText('OrderCard')).not.toBeInTheDocument();
    expect(screen.queryByText('OrderService')).not.toBeInTheDocument();
  });
});
