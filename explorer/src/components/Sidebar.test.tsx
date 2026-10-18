import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { createEmptyFilterState } from '../lib/search-filter';
import type { ExplorerNode } from '../types/explorer';

describe('Sidebar', () => {
  const mockNodes: ExplorerNode[] = [
    {
      id: 'ServiceA',
      displayName: 'ServiceA',
      type: 'ApexClass',
      file: 'ServiceA.cls',
      metrics: { fanIn: 3, fanOut: 1, coupling: 4, unresolved: 0, score: 8 },
      risk: 'HIGH',
      riskReasons: ['High coupling'],
      behavior: {
        isTest: false,
        publicContractsCount: 1,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 1,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: true,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED',
      },
    },
    {
      id: 'UtilB',
      displayName: 'UtilB',
      type: 'ApexClass',
      file: 'UtilB.cls',
      metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 2 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        publicContractsCount: 1,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED',
      },
    },
  ];

  it('renders null when collapsed is true', () => {
    const { container } = render(
      <Sidebar
        nodes={mockNodes}
        displayNodes={mockNodes}
        filterState={createEmptyFilterState()}
        selectedNodeId={null}
        collapsed={true}
        onToggleCollapse={vi.fn()}
        onFilterChange={vi.fn()}
        onSelectNode={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders sidebar container and component list when collapsed is false', () => {
    render(
      <Sidebar
        nodes={mockNodes}
        displayNodes={mockNodes}
        filterState={createEmptyFilterState()}
        selectedNodeId={null}
        collapsed={false}
        onToggleCollapse={vi.fn()}
        onFilterChange={vi.fn()}
        onSelectNode={vi.fn()}
      />
    );

    expect(screen.getByTestId('component-sidebar')).toBeInTheDocument();
    expect(screen.getByText('ServiceA')).toBeInTheDocument();
    expect(screen.getByText('UtilB')).toBeInTheDocument();
  });

  it('calls onToggleCollapse when collapse button is clicked', () => {
    const handleToggleCollapse = vi.fn();

    render(
      <Sidebar
        nodes={mockNodes}
        displayNodes={mockNodes}
        filterState={createEmptyFilterState()}
        selectedNodeId={null}
        collapsed={false}
        onToggleCollapse={handleToggleCollapse}
        onFilterChange={vi.fn()}
        onSelectNode={vi.fn()}
      />
    );

    const collapseBtn = screen.getByTestId('collapse-sidebar-btn');
    fireEvent.click(collapseBtn);

    expect(handleToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectNode when a component item is clicked', () => {
    const handleSelectNode = vi.fn();

    render(
      <Sidebar
        nodes={mockNodes}
        displayNodes={mockNodes}
        filterState={createEmptyFilterState()}
        selectedNodeId={null}
        collapsed={false}
        onToggleCollapse={vi.fn()}
        onFilterChange={vi.fn()}
        onSelectNode={handleSelectNode}
      />
    );

    const item = screen.getByText('ServiceA');
    fireEvent.click(item);

    expect(handleSelectNode).toHaveBeenCalledWith(mockNodes[0]);
  });

  it('debounces search query filter changes in search input', async () => {
    vi.useFakeTimers();
    const handleFilterChange = vi.fn();

    render(
      <Sidebar
        nodes={mockNodes}
        displayNodes={mockNodes}
        filterState={createEmptyFilterState()}
        selectedNodeId={null}
        collapsed={false}
        onToggleCollapse={vi.fn()}
        onFilterChange={handleFilterChange}
        onSelectNode={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search components...');
    fireEvent.change(input, { target: { value: 'Serv' } });

    // Should not have been called immediately before timer elapses
    expect(handleFilterChange).not.toHaveBeenCalled();

    // Fast forward timer by 150ms
    vi.advanceTimersByTime(150);

    expect(handleFilterChange).toHaveBeenCalledTimes(1);
    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ searchQuery: 'Serv' })
    );

    vi.useRealTimers();
  });
});
