import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvestigationDrawer } from './InvestigationDrawer';
import type { ExplorerDataSchema, ExplorerNode } from '../types/explorer';

describe('InvestigationDrawer', () => {
  const mockNodeServiceX: ExplorerNode = {
    id: 'ServiceX',
    displayName: 'ServiceX',
    type: 'ApexClass',
    file: 'force-app/main/default/classes/ServiceX.cls',
    metrics: { fanIn: 1, fanOut: 2, coupling: 3, unresolved: 0, score: 5 },
    risk: 'MEDIUM',
    riskReasons: ['Medium risk'],
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
      isHighRisk: false,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED',
    },
  };

  const mockNodeOrderController: ExplorerNode = {
    ...mockNodeServiceX,
    id: 'OrderController',
    displayName: 'OrderController',
  };

  const mockNodeCartService: ExplorerNode = {
    ...mockNodeServiceX,
    id: 'CartService',
    displayName: 'CartService',
  };

  const mockData: ExplorerDataSchema = {
    schemaVersion: '1.0.0',
    analyzerVersion: '1.0.0',
    generatedAt: '2026-01-01T00:00:00Z',
    sourceDirectory: 'force-app',
    summary: {
      nodeCount: 3,
      edgeCount: 2,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 3,
      cycleCount: 0,
      unresolvedCount: 0,
      inventory: {
        files: 3,
        apexClasses: 3,
        apexTriggers: 0,
        lwcJs: 0,
        lwcHtml: 0,
        visualforce: 0,
        flows: 0,
        objects: 0,
        fields: 0,
      },
    },
    nodes: [mockNodeServiceX, mockNodeOrderController, mockNodeCartService],
    edges: [
      {
        id: 'edge1',
        source: 'OrderController',
        target: 'ServiceX',
        relationshipType: 'method-call',
        method: 'executeProcess',
        evidence: 'ServiceX.executeProcess();',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'high',
        line: 42,
        column: 10,
        methodOwner: 'executeProcess',
        file: 'force-app/main/default/classes/OrderController.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'OrderController' },
          target: { type: 'ApexClass', name: 'ServiceX' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 42, column: 10 },
        },
      },
    ],
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {
      ServiceX: {
        id: 'ServiceX',
        directDependents: ['OrderController'],
        transitiveDependents: ['CartService'],
        directDependencies: ['CartService'],
        transitiveDependencies: [],
        impactedTests: [],
        totalImpactCount: 10,
      },
      OrderController: {
        id: 'OrderController',
        directDependents: ['CartService'],
        transitiveDependents: [],
        directDependencies: [],
        transitiveDependencies: [],
        impactedTests: [],
        totalImpactCount: 5,
      },
      CartService: {
        id: 'CartService',
        directDependents: [],
        transitiveDependents: [],
        directDependencies: [],
        transitiveDependencies: [],
        impactedTests: [],
        totalImpactCount: 2,
      },
    },
  };

  it('renders null when open=false', () => {
    const { container } = render(
      <InvestigationDrawer
        node={mockNodeServiceX}
        open={false}
        onClose={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders header, breadcrumb trail, and ranked dependents/dependencies when open=true', () => {
    render(
      <InvestigationDrawer
        node={mockNodeServiceX}
        open={true}
        onClose={vi.fn()}
        data={mockData}
        drillPath={['ServiceX']}
        recentNodeIds={['ServiceX', 'OrderController']}
      />
    );

    expect(screen.getAllByText('ServiceX').length).toBeGreaterThan(0);
    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    expect(screen.getByTestId('recent-investigations')).toBeInTheDocument();

    expect(screen.getByTestId('dependents-section')).toBeInTheDocument();
    expect(screen.getByTestId('dependencies-section')).toBeInTheDocument();

    expect(screen.getAllByText('OrderController').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CartService').length).toBeGreaterThan(0);
  });

  it('triggers onDrill when clicking a dependent or dependency row', () => {
    const handleDrill = vi.fn();
    render(
      <InvestigationDrawer
        node={mockNodeServiceX}
        open={true}
        onClose={vi.fn()}
        onDrill={handleDrill}
        data={mockData}
        drillPath={['ServiceX']}
      />
    );

    const orderRow = screen.getByTestId('dependent-row-OrderController');
    fireEvent.click(orderRow);

    expect(handleDrill).toHaveBeenCalledWith('OrderController');
  });

  it('renders empty states cleanly when node has zero dependents/dependencies', () => {
    render(
      <InvestigationDrawer
        node={mockNodeCartService}
        open={true}
        onClose={vi.fn()}
        data={mockData}
        drillPath={['CartService']}
      />
    );

    expect(screen.getByText('No dependents detected')).toBeInTheDocument();
    expect(screen.getByText('No dependencies detected')).toBeInTheDocument();
  });

  it('onClose fires on close button click when not pinned', () => {
    const handleClose = vi.fn();

    render(
      <InvestigationDrawer
        node={mockNodeServiceX}
        open={true}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /close investigation drawer/i });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('disables close button when drawer is pinned', () => {
    const handleClose = vi.fn();

    render(
      <InvestigationDrawer
        node={mockNodeServiceX}
        open={true}
        onClose={handleClose}
        isPinned={true}
        onTogglePin={vi.fn()}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /close investigation drawer/i });
    expect(closeBtn).toBeDisabled();

    fireEvent.click(closeBtn);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('triggers onTogglePin and onDetach when clicking header buttons', () => {
    const handleTogglePin = vi.fn();
    const handleDetach = vi.fn();

    render(
      <InvestigationDrawer
        node={mockNodeServiceX}
        open={true}
        onClose={vi.fn()}
        isPinned={false}
        onTogglePin={handleTogglePin}
        isDetached={false}
        onDetach={handleDetach}
      />
    );

    const pinBtn = screen.getByTestId('investigation-drawer-pin-btn');
    const detachBtn = screen.getByTestId('investigation-drawer-detach-btn');

    fireEvent.click(pinBtn);
    expect(handleTogglePin).toHaveBeenCalledTimes(1);

    fireEvent.click(detachBtn);
    expect(handleDetach).toHaveBeenCalledTimes(1);
  });

  it('renders "Hand off" header button and calls onRequestHandoff when provided', () => {
    const handleRequestHandoff = vi.fn();

    render(
      <InvestigationDrawer
        node={mockNodeServiceX}
        open={true}
        onClose={vi.fn()}
        onRequestHandoff={handleRequestHandoff}
      />
    );

    const handoffBtn = screen.getByTestId('investigation-drawer-handoff-btn');
    expect(handoffBtn).toBeInTheDocument();
    expect(handoffBtn).toHaveAttribute('aria-label', 'Hand off to refactor');

    fireEvent.click(handoffBtn);
    expect(handleRequestHandoff).toHaveBeenCalledWith('ServiceX');
  });

  it('does NOT render "Hand off" header button when onRequestHandoff is undefined', () => {
    render(
      <InvestigationDrawer
        node={mockNodeServiceX}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('investigation-drawer-handoff-btn')).not.toBeInTheDocument();
  });

  it('switches tabs and renders progressive disclosure sections cleanly', () => {
    render(
      <InvestigationDrawer
        node={mockNodeServiceX}
        open={true}
        onClose={vi.fn()}
        data={mockData}
        drillPath={['ServiceX']}
      />
    );

    // Verify Tab bar exists
    expect(screen.getByTestId('inspector-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-risk-summary')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-key-metrics')).toBeInTheDocument();

    // Switch to Evidence Tab
    const evidenceTab = screen.getByTestId('tab-evidence');
    fireEvent.click(evidenceTab);
    expect(screen.getByTestId('tab-content-evidence')).toBeInTheDocument();
    expect(screen.getByText('ServiceX.executeProcess();')).toBeInTheDocument();

    // Switch to Actions Tab
    const actionsTab = screen.getByTestId('tab-actions');
    fireEvent.click(actionsTab);
    expect(screen.getByTestId('tab-content-actions')).toBeInTheDocument();
  });

  it('renders empty state when node is null', () => {
    render(
      <InvestigationDrawer
        node={null}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('inspector-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No Component Selected')).toBeInTheDocument();
  });
});
