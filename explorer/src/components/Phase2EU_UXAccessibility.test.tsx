import { render, screen, fireEvent } from '@testing-library/react';
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
    file: 'classes/OrderService.cls',
    risk: 'HIGH',
    riskReasons: ['High risk'],
    metrics: { score: 85, coupling: 12, fanIn: 5, fanOut: 4, unresolved: 0 },
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
      isHighRisk: true,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED',
    },
  },
  {
    id: 'node-2',
    displayName: 'OrderController',
    type: 'ApexClass',
    file: 'classes/OrderController.cls',
    risk: 'MEDIUM',
    riskReasons: [],
    metrics: { score: 60, coupling: 8, fanIn: 2, fanOut: 3, unresolved: 0 },
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

const mockData: ExplorerDataSchema = {
  project: {
    id: 'proj-1',
    name: 'Sample Project',
    sourcePath: 'force-app',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    analysisStatus: 'COMPLETE',
    componentCount: 2,
    dependencyCount: 1,
  },
  nodes: sampleNodes,
  edges: [
    {
      id: 'edge-1',
      source: 'node-2',
      target: 'node-1',
      relationshipType: 'method-call',
      method: 'processOrder',
      evidence: 'OrderService.processOrder()',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 10,
      column: 5,
      methodOwner: 'OrderService',
      file: 'classes/OrderController.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'OrderController' },
        target: { type: 'ApexClass', name: 'OrderService' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 10, column: 5 },
      },
    },
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
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {},
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
