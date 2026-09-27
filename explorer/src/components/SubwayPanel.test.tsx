import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubwayPanel } from './SubwayPanel';
import { SubwayMapData } from '../lib/adapters/subway-adapter';

describe('SubwayPanel Component', () => {
  const mockSubwayData: SubwayMapData = {
    lines: [
      {
        lineId: 'feat-1',
        name: 'Account Management',
        color: '#3b82f6',
        y: 100,
        isShared: false,
        stations: [
          {
            nodeId: 'node1',
            displayName: 'AccountController',
            type: 'ApexClass',
            file: 'AccountController.cls',
            risk: 'HIGH',
            featureId: 'feat-1',
            featureName: 'Account Management',
            layerName: 'Presentation',
            x: 120,
            y: 100,
            lineIndex: 0,
            stationIndex: 0,
            isShared: false,
            isTransfer: true,
            fanIn: 2,
            fanOut: 1,
            connectedEdgeIds: ['e1'],
          }
        ]
      }
    ],
    stations: [
      {
        nodeId: 'node1',
        displayName: 'AccountController',
        type: 'ApexClass',
        file: 'AccountController.cls',
        risk: 'HIGH',
        featureId: 'feat-1',
        featureName: 'Account Management',
        layerName: 'Presentation',
        x: 120,
        y: 100,
        lineIndex: 0,
        stationIndex: 0,
        isShared: false,
        isTransfer: true,
        fanIn: 2,
        fanOut: 1,
        connectedEdgeIds: ['e1'],
      }
    ],
    stationsById: new Map([
      [
        'node1',
        {
          nodeId: 'node1',
          displayName: 'AccountController',
          type: 'ApexClass',
          file: 'AccountController.cls',
          risk: 'HIGH',
          featureId: 'feat-1',
          featureName: 'Account Management',
          layerName: 'Presentation',
          x: 120,
          y: 100,
          lineIndex: 0,
          stationIndex: 0,
          isShared: false,
          isTransfer: true,
          fanIn: 2,
          fanOut: 1,
          connectedEdgeIds: ['e1'],
        }
      ]
    ]),
    routes: [],
    summary: {
      totalLines: 1,
      totalStations: 1,
      totalRoutes: 0,
      totalTransferHubs: 1,
      sharedLineCount: 0,
    },
    availableFeatures: [
      { id: 'feat-1', name: 'Account Management', color: '#3b82f6', count: 1 }
    ]
  };

  it('renders empty state when no data provided', () => {
    const emptyData: SubwayMapData = {
      lines: [],
      stations: [],
      stationsById: new Map(),
      routes: [],
      summary: { totalLines: 0, totalStations: 0, totalRoutes: 0, totalTransferHubs: 0, sharedLineCount: 0 },
      availableFeatures: []
    };

    render(<SubwayPanel data={emptyData} />);
    expect(screen.getByText('No Subway Map Data Available')).toBeInTheDocument();
  });

  it('renders subway map canvas with lines and station markers', () => {
    render(<SubwayPanel data={mockSubwayData} />);
    expect(screen.getByTestId('subway-panel')).toBeInTheDocument();
    expect(screen.getByTestId('subway-svg-canvas')).toBeInTheDocument();
    expect(screen.getByText('Account Management Line')).toBeInTheDocument();
    expect(screen.getByText('AccountController')).toBeInTheDocument();
  });

  it('opens inspector drawer when station node is clicked', () => {
    const onSelectNode = vi.fn();
    render(<SubwayPanel data={mockSubwayData} onSelectNode={onSelectNode} />);

    const stationLabel = screen.getByText('AccountController');
    fireEvent.click(stationLabel);

    expect(onSelectNode).toHaveBeenCalledWith('node1');
    expect(screen.getByTestId('subway-inspector')).toBeInTheDocument();
    expect(screen.getByText(/Transfer Station \(Cross-Feature Hub\)/)).toBeInTheDocument();
  });

  it('filters stations via search query input', () => {
    render(<SubwayPanel data={mockSubwayData} />);
    const searchInput = screen.getByTestId('subway-search-input');

    fireEvent.change(searchInput, { target: { value: 'NonExistentComponent' } });
    expect(screen.queryByText('AccountController')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Account' } });
    expect(screen.getByText('AccountController')).toBeInTheDocument();
  });

  it('invokes onExploreInGraph when explore button is clicked', () => {
    const onExploreInGraph = vi.fn();
    render(<SubwayPanel data={mockSubwayData} onExploreInGraph={onExploreInGraph} />);

    fireEvent.click(screen.getByText('AccountController'));
    const exploreBtn = screen.getByText('Explore in Graph');
    fireEvent.click(exploreBtn);

    expect(onExploreInGraph).toHaveBeenCalledWith('node1');
  });
});
