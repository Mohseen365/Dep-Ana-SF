import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DependencyConstellationPanel } from './DependencyConstellationPanel';
import { ConstellationData } from '../lib/adapters/constellation-adapter';

describe('DependencyConstellationPanel Component', () => {
  const sampleData: ConstellationData = {
    focalNode: {
      id: 'ApexClass:OrderController',
      displayName: 'OrderController',
      type: 'ApexClass',
      file: 'OrderController.cls',
      risk: 'HIGH',
      featureId: 'OrderView',
      featureName: 'OrderView',
      layerName: 'Controller / Api',
      metrics: {
        fanIn: 1,
        fanOut: 2,
        coupling: 3,
        score: 50,
      },
    },
    rings: [
      {
        ringIndex: 1,
        hopDistance: 1,
        label: '1-Hop Orbit (2 components)',
        items: [
          {
            nodeId: 'LWC:OrderCard',
            displayName: 'OrderCard',
            type: 'LWC',
            file: 'orderCard.js',
            risk: 'LOW',
            featureId: 'OrderView',
            featureName: 'OrderView',
            layerName: 'Ui / Presentation',
            hopDistance: 1,
            metrics: { fanIn: 0, fanOut: 1, coupling: 1, score: 10 },
            incomingCount: 0,
            outgoingCount: 1,
          },
          {
            nodeId: 'ApexClass:OrderService',
            displayName: 'OrderService',
            type: 'ApexClass',
            file: 'OrderService.cls',
            risk: 'MEDIUM',
            featureId: 'OrderView',
            featureName: 'OrderView',
            layerName: 'Service / Business',
            hopDistance: 1,
            metrics: { fanIn: 1, fanOut: 1, coupling: 2, score: 30 },
            incomingCount: 1,
            outgoingCount: 1,
          },
        ],
        totalCount: 2,
      },
    ],
    nodes: {
      'ApexClass:OrderController': {
        nodeId: 'ApexClass:OrderController',
        displayName: 'OrderController',
        type: 'ApexClass',
        file: 'OrderController.cls',
        risk: 'HIGH',
        featureId: 'OrderView',
        featureName: 'OrderView',
        layerName: 'Controller / Api',
        hopDistance: 0,
        metrics: { fanIn: 1, fanOut: 2, coupling: 3, score: 50 },
        incomingCount: 1,
        outgoingCount: 2,
      },
      'LWC:OrderCard': {
        nodeId: 'LWC:OrderCard',
        displayName: 'OrderCard',
        type: 'LWC',
        file: 'orderCard.js',
        risk: 'LOW',
        featureId: 'OrderView',
        featureName: 'OrderView',
        layerName: 'Ui / Presentation',
        hopDistance: 1,
        metrics: { fanIn: 0, fanOut: 1, coupling: 1, score: 10 },
        incomingCount: 0,
        outgoingCount: 1,
      },
      'ApexClass:OrderService': {
        nodeId: 'ApexClass:OrderService',
        displayName: 'OrderService',
        type: 'ApexClass',
        file: 'OrderService.cls',
        risk: 'MEDIUM',
        featureId: 'OrderView',
        featureName: 'OrderView',
        layerName: 'Service / Business',
        hopDistance: 1,
        metrics: { fanIn: 1, fanOut: 1, coupling: 2, score: 30 },
        incomingCount: 1,
        outgoingCount: 1,
      },
    },
    edges: [
      {
        edgeId: 'e1',
        source: 'LWC:OrderCard',
        target: 'ApexClass:OrderController',
        relationshipType: 'calls',
        sourceHop: 1,
        targetHop: 0,
        isSameRing: false,
        isCrossRing: true,
        provenance: {
          edgeId: 'e1',
          sourceComponentName: 'OrderCard',
          targetComponentName: 'OrderController',
          relationshipType: 'calls',
        },
      },
      {
        edgeId: 'e2',
        source: 'ApexClass:OrderController',
        target: 'ApexClass:OrderService',
        relationshipType: 'calls',
        sourceHop: 0,
        targetHop: 1,
        isSameRing: false,
        isCrossRing: true,
        provenance: {
          edgeId: 'e2',
          sourceComponentName: 'OrderController',
          targetComponentName: 'OrderService',
          relationshipType: 'calls',
        },
      },
    ],
    availableNodes: [
      {
        id: 'ApexClass:OrderController',
        displayName: 'OrderController',
        type: 'ApexClass',
        featureName: 'OrderView',
        layerName: 'Controller / Api',
        coupling: 3,
      },
      {
        id: 'ApexClass:OrderService',
        displayName: 'OrderService',
        type: 'ApexClass',
        featureName: 'OrderView',
        layerName: 'Service / Business',
        coupling: 2,
      },
      {
        id: 'LWC:OrderCard',
        displayName: 'OrderCard',
        type: 'LWC',
        featureName: 'OrderView',
        layerName: 'Ui / Presentation',
        coupling: 1,
      },
    ],
    summary: {
      focalNodeId: 'ApexClass:OrderController',
      totalNodes: 3,
      totalEdges: 2,
      ringCount: 1,
      maxHopDepth: 2,
    },
    options: {
      focalNodeId: 'ApexClass:OrderController',
      maxDepth: 2,
      direction: 'both',
    },
  };

  it('renders focal component header and orbital SVG canvas', () => {
    render(<DependencyConstellationPanel data={sampleData} />);

    expect(screen.getByTestId('dependency-constellation-panel')).toBeInTheDocument();
    expect(screen.getByTestId('constellation-svg')).toBeInTheDocument();
    expect(screen.getByTestId('constellation-inspection-drawer')).toBeInTheDocument();

    expect(screen.getAllByText('OrderController').length).toBeGreaterThan(0);
  });

  it('handles focal selection change', () => {
    const handleOptionChange = vi.fn();
    render(<DependencyConstellationPanel data={sampleData} onOptionChange={handleOptionChange} />);

    const select = screen.getByTestId('focal-selector');
    fireEvent.change(select, { target: { value: 'ApexClass:OrderService' } });

    expect(handleOptionChange).toHaveBeenCalledWith({ focalNodeId: 'ApexClass:OrderService' });
  });

  it('handles depth selection change', () => {
    const handleOptionChange = vi.fn();
    render(<DependencyConstellationPanel data={sampleData} onOptionChange={handleOptionChange} />);

    const depthSelect = screen.getByTestId('depth-selector');
    fireEvent.change(depthSelect, { target: { value: '1' } });

    expect(handleOptionChange).toHaveBeenCalledWith({ maxDepth: 1 });
  });

  it('filters orbital nodes by search query', () => {
    render(<DependencyConstellationPanel data={sampleData} />);

    const input = screen.getByTestId('constellation-filter-input');
    fireEvent.change(input, { target: { value: 'OrderCard' } });

    expect(input).toHaveValue('OrderCard');
  });

  it('renders return to graph button when callback is provided', () => {
    const handleReturn = vi.fn();
    render(<DependencyConstellationPanel data={sampleData} onReturnToGraph={handleReturn} />);

    const btn = screen.getByTestId('return-graph-btn');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleReturn).toHaveBeenCalledTimes(1);
  });
});
