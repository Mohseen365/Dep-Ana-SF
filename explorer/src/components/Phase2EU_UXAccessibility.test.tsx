import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { InvestigationDrawer } from './InvestigationDrawer';
import { Sidebar } from './Sidebar';
import { SearchFilterPanel } from './SearchFilterPanel';
import { createEmptyFilterState } from '../lib/search-filter';
import type { ExplorerDataSchema, ExplorerNode } from '../types/explorer';

const sampleNodes: ExplorerNode[] = [
  {
    id: 'node-1',
    displayName: 'OrderService',
    type: 'ApexClass',
    risk: 'HIGH',
    layer: 'domain',
    metrics: { score: 85, coupling: 12, fanIn: 5, fanOut: 4, complexity: 10, unresolved: 0 },
  },
  {
    id: 'node-2',
    displayName: 'OrderController',
    type: 'ApexClass',
    risk: 'MEDIUM',
    layer: 'application',
    metrics: { score: 60, coupling: 8, fanIn: 2, fanOut: 3, complexity: 6, unresolved: 0 },
  },
];

const mockData: ExplorerDataSchema = {
  project: { id: 'proj-1', name: 'Sample Project' },
  nodes: sampleNodes,
  edges: [
    { id: 'edge-1', source: 'node-2', target: 'node-1', relationshipType: 'CALLS' },
  ],
  summary: {
    nodeCount: 2,
    edgeCount: 1,
    highRiskCount: 1,
    mediumRiskCount: 1,
    lowRiskCount: 0,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: {
      files: 2,
      apexClasses: 2,
      apexTriggers: 0,
      lwcJs: 0,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 0,
      fields: 0,
    },
  },
};

describe('Phase 2E-U — UX & Accessibility Hardening Tests', () => {
  it('1. ViewModeSwitcher renders correct ARIA tablist and tab roles', () => {
    render(<ViewModeSwitcher viewMode="graph" onChangeViewMode={() => {}} />);

    const tablist = screen.getByRole('tablist', { name: /workspace view modes/i });
    expect(tablist).toBeDefined();

    const graphTab = screen.getByTestId('view-btn-graph');
    expect(graphTab.getAttribute('role')).toBe('tab');
    expect(graphTab.getAttribute('aria-selected')).toBe('true');

    const matrixTab = screen.getByTestId('view-btn-matrix');
    expect(matrixTab.getAttribute('role')).toBe('tab');
    expect(matrixTab.getAttribute('aria-selected')).toBe('false');
  });

  it('2. InvestigationDrawer renders correct ARIA tablist and tab roles', () => {
    render(
      <InvestigationDrawer
        node={sampleNodes[0]}
        open={true}
        onClose={() => {}}
        data={mockData}
      />
    );

    const tabsNav = screen.getByTestId('inspector-tabs');
    expect(tabsNav.getAttribute('role')).toBe('tablist');

    const overviewTab = screen.getByTestId('tab-overview');
    expect(overviewTab.getAttribute('role')).toBe('tab');
    expect(overviewTab.getAttribute('aria-selected')).toBe('true');

    const depsTab = screen.getByTestId('tab-dependencies');
    expect(depsTab.getAttribute('role')).toBe('tab');
    expect(depsTab.getAttribute('aria-selected')).toBe('false');
  });

  it('3. Sidebar renders polite ARIA live region for screen readers', () => {
    render(
      <Sidebar
        nodes={sampleNodes}
        displayNodes={sampleNodes}
        filterState={createEmptyFilterState()}
        selectedNodeId={null}
        collapsed={false}
        onToggleCollapse={() => {}}
        onFilterChange={() => {}}
        onSelectNode={() => {}}
      />
    );

    const liveRegion = screen.getByTestId('sidebar-a11y-status');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion.textContent).toContain('Showing 2 components');
  });

  it('4. SearchFilterPanel renders search live region for screen readers', () => {
    render(
      <SearchFilterPanel
        nodes={sampleNodes}
        filterState={{ ...createEmptyFilterState(), searchQuery: 'Order' }}
        quickFilter="all"
        sortOption="risk"
        onFilterChange={() => {}}
        onQuickFilterChange={() => {}}
        onSortOptionChange={() => {}}
        onSelectResult={() => {}}
      />
    );

    const liveRegion = screen.getByTestId('search-a11y-status');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
  });

  it('5. Sidebar keyboard navigation allows Arrow key focus and Enter selection', () => {
    const onSelectNode = vi.fn();
    render(
      <Sidebar
        nodes={sampleNodes}
        displayNodes={sampleNodes}
        filterState={createEmptyFilterState()}
        selectedNodeId={null}
        collapsed={false}
        onToggleCollapse={() => {}}
        onFilterChange={() => {}}
        onSelectNode={onSelectNode}
      />
    );

    const listbox = screen.getByRole('listbox');

    // Press ArrowDown to focus first item
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    // Press Enter to select focused item
    fireEvent.keyDown(listbox, { key: 'Enter' });

    expect(onSelectNode).toHaveBeenCalledWith(sampleNodes[0]);
  });

  it('6. Empty state in Sidebar explains situation and provides Clear Filters button', () => {
    const onFilterChange = vi.fn();
    render(
      <Sidebar
        nodes={sampleNodes}
        displayNodes={[]}
        filterState={{ ...createEmptyFilterState(), searchQuery: 'NonExistent' }}
        selectedNodeId={null}
        collapsed={false}
        onToggleCollapse={() => {}}
        onFilterChange={onFilterChange}
        onSelectNode={() => {}}
      />
    );

    expect(screen.getByText(/No components match your search/i)).toBeDefined();
    const clearBtn = screen.getByText(/Clear All Filters/i);
    fireEvent.click(clearBtn);
    expect(onFilterChange).toHaveBeenCalled();
  });
});
