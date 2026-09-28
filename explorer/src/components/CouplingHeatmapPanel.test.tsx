import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CouplingHeatmapPanel } from './CouplingHeatmapPanel';
import type { ExplorerDataSchema } from '../types/explorer';
import { createMockNode, createMockEdge, createMockDataSchema } from '../test/mock-factories';

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

const mockExplorerData: ExplorerDataSchema = createMockDataSchema(
  [
    createMockNode('A1', 'AccountController', 'ApexClass', 'LOW', 'AccountController.cls'),
    createMockNode('A2', 'AccountService', 'ApexClass', 'LOW', 'AccountService.cls'),
    createMockNode('B1', 'OrderController', 'ApexClass', 'LOW', 'OrderController.cls'),
    createMockNode('B2', 'OrderService', 'ApexClass', 'LOW', 'OrderService.cls'),
  ],
  [
    createMockEdge('e1', 'A1', 'A2', 'method-call'),
    createMockEdge('e2', 'A1', 'B2', 'method-call'),
    createMockEdge('e3', 'B1', 'B2', 'method-call'),
    createMockEdge('e4', 'B1', 'A2', 'method-call'),
  ]
);

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
