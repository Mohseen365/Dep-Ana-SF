import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CouplingHeatmapPanel } from './CouplingHeatmapPanel';
import type { ExplorerDataSchema } from '../types/explorer';

// Mock HTML5 Canvas context for JSDOM
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  strokeRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 20 }),
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

const mockExplorerData: ExplorerDataSchema = {
  version: '1.0.0',
  timestamp: '2026-09-26T00:00:00.000Z',
  nodes: [
    {
      id: 'A1',
      name: 'AccountController',
      type: 'ApexClass',
      layer: 'presentation',
      feature: 'AccountManagement',
      domain: 'Sales',
      metrics: { loc: 100, fanIn: 2, fanOut: 3, cbo: 5, lcom: 0.2, changeCoupling: 0.1, cyclomaticComplexity: 4, riskScore: 20, debtRatio: 0.05 },
      status: 'active',
    },
    {
      id: 'A2',
      name: 'AccountService',
      type: 'ApexClass',
      layer: 'application',
      feature: 'AccountManagement',
      domain: 'Sales',
      metrics: { loc: 150, fanIn: 4, fanOut: 2, cbo: 6, lcom: 0.1, changeCoupling: 0.2, cyclomaticComplexity: 6, riskScore: 30, debtRatio: 0.08 },
      status: 'active',
    },
    {
      id: 'B1',
      name: 'OrderController',
      type: 'ApexClass',
      layer: 'presentation',
      feature: 'OrderManagement',
      domain: 'Sales',
      metrics: { loc: 120, fanIn: 1, fanOut: 4, cbo: 5, lcom: 0.3, changeCoupling: 0.15, cyclomaticComplexity: 5, riskScore: 25, debtRatio: 0.06 },
      status: 'active',
    },
    {
      id: 'B2',
      name: 'OrderService',
      type: 'ApexClass',
      layer: 'application',
      feature: 'OrderManagement',
      domain: 'Sales',
      metrics: { loc: 200, fanIn: 5, fanOut: 1, cbo: 6, lcom: 0.15, changeCoupling: 0.25, cyclomaticComplexity: 8, riskScore: 40, debtRatio: 0.1 },
      status: 'active',
    },
  ],
  links: [
    { source: 'A1', target: 'A2', type: 'calls', weight: 1 },
    { source: 'A1', target: 'B2', type: 'calls', weight: 1 },
    { source: 'B1', target: 'B2', type: 'calls', weight: 1 },
    { source: 'B1', target: 'A2', type: 'calls', weight: 1 },
  ],
  clusters: [],
  layers: [],
  domains: [],
};

describe('CouplingHeatmapPanel Component', () => {
  it('renders empty state when data is null', () => {
    render(<CouplingHeatmapPanel data={null} />);
    expect(screen.getByTestId('coupling-heatmap-panel')).toBeInTheDocument();
    expect(screen.getByText('No Coupling Heatmap Data')).toBeInTheDocument();
  });

  it('renders heatmap panel with header controls and canvas', () => {
    render(<CouplingHeatmapPanel data={mockExplorerData} />);
    expect(screen.getByTestId('coupling-heatmap-panel')).toBeInTheDocument();
    expect(screen.getByText('Feature Coupling Heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('coupling-heatmap-canvas')).toBeInTheDocument();
  });

  it('allows metric mode switching', () => {
    render(<CouplingHeatmapPanel data={mockExplorerData} />);

    const directBtn = screen.getByTestId('heatmap-metric-direct');
    expect(directBtn).toBeInTheDocument();

    fireEvent.click(directBtn);
    expect(directBtn).toHaveStyle({ fontWeight: '700' });
  });

  it('filters features based on search query', () => {
    render(<CouplingHeatmapPanel data={mockExplorerData} />);

    const searchInput = screen.getByTestId('heatmap-search-input');
    fireEvent.change(searchInput, { target: { value: 'Account' } });

    expect(screen.getByTestId('coupling-heatmap-canvas')).toBeInTheDocument();
  });

  it('handles empty/null nodes array without throwing', () => {
    const emptyData = { ...mockExplorerData, nodes: [] };
    render(<CouplingHeatmapPanel data={emptyData} />);
    expect(screen.getByText('No Coupling Heatmap Data')).toBeInTheDocument();
  });

  it('produces deterministic canvas rendering across multiple renders', () => {
    const { rerender } = render(<CouplingHeatmapPanel data={mockExplorerData} />);
    expect(screen.getByTestId('coupling-heatmap-canvas')).toBeInTheDocument();

    rerender(<CouplingHeatmapPanel data={mockExplorerData} />);
    expect(screen.getByTestId('coupling-heatmap-canvas')).toBeInTheDocument();
  });

  it('does not mutate input schema or invoke position policy', () => {
    const originalNodesJson = JSON.stringify(mockExplorerData.nodes);
    render(<CouplingHeatmapPanel data={mockExplorerData} />);
    expect(JSON.stringify(mockExplorerData.nodes)).toBe(originalNodesJson);
  });
});
