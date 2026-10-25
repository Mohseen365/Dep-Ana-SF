import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImpactControls } from './ImpactControls';
import { ImpactState, ImpactAnalysisResult } from '../lib/impact-analysis';
import { ExplorerNode } from '../types/explorer';

const mockSelectedNode: ExplorerNode = {
  id: 'ApexClass:Service',
  displayName: 'Service',
  type: 'ApexClass',
  file: 'Service.cls',
  metrics: { fanIn: 2, fanOut: 1, coupling: 3, unresolved: 0, score: 3 },
  risk: 'MEDIUM',
  riskReasons: [],
  behavior: {
    isTest: false,
    sharing: 'with sharing',
    publicContractsCount: 1,
    asyncPatterns: [],
    securitySignalsCount: 0,
    queryCount: 0,
    dmlCount: 0,
    calloutCount: 0
  },
  refactoringReadiness: {
    isHighRisk: false,
    hasCycles: false,
    hasUnresolved: false,
    testCoverageStatus: 'UNTESTED'
  }
};

const mockImpactResult: ImpactAnalysisResult = {
  originNodeId: 'ApexClass:Service',
  originNode: mockSelectedNode,
  affectedNodeIds: new Set(['ApexClass:Service', 'ApexClass:Controller', 'ApexClass:ServiceTest']),
  affectedEdgeIds: new Set(['edge1', 'edge2']),
  directDependentIds: ['ApexClass:Controller', 'ApexClass:ServiceTest'],
  transitiveDependentIds: ['ApexClass:Controller', 'ApexClass:ServiceTest', 'LWC:component'],
  impactedTestNodeIds: ['ApexClass:ServiceTest'],
  summaryMetrics: {
    directDependentsCount: 2,
    transitiveDependentsCount: 3,
    impactedComponentsCount: 3,
    impactedTestsCount: 1,
    cyclesInvolvedCount: 1,
    unresolvedCount: 0,
    visibleImpactedCount: 3
  }
};

describe('ImpactControls component', () => {
  it('renders disabled toggle when no node selected and mode inactive', () => {
    const state: ImpactState = { enabled: false, originNodeId: null, depth: 'ALL' };
    render(
      <ImpactControls
        impactState={state}
        impactResult={null}
        onImpactChange={() => {}}
        onExitImpact={() => {}}
        selectedNode={null}
        onShowImpact={() => {}}
      />
    );

    const btn = screen.getByRole('button', { name: /Show Impact/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Select a component to show blast radius/i)).toBeDefined();
  });

  it('renders enabled Show Impact button when a node is selected', () => {
    const state: ImpactState = { enabled: false, originNodeId: null, depth: 'ALL' };
    const onShowImpact = vi.fn();

    render(
      <ImpactControls
        impactState={state}
        impactResult={null}
        onImpactChange={() => {}}
        onExitImpact={() => {}}
        selectedNode={mockSelectedNode}
        onShowImpact={onShowImpact}
      />
    );

    const btn = screen.getByRole('button', { name: /Show Impact/i });
    expect(btn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(btn);
    expect(onShowImpact).toHaveBeenCalledWith('ApexClass:Service');
  });

  it('renders Impact Mode active banner and summary metrics when active', () => {
    const state: ImpactState = { enabled: true, originNodeId: 'ApexClass:Service', depth: 'ALL' };
    const onExitImpact = vi.fn();

    render(
      <ImpactControls
        impactState={state}
        impactResult={mockImpactResult}
        onImpactChange={() => {}}
        onExitImpact={onExitImpact}
        selectedNode={mockSelectedNode}
        onShowImpact={() => {}}
      />
    );

    expect(screen.getByText(/IMPACT MODE:/i)).toBeDefined();
    expect(screen.getByText(/★ Service ★/i)).toBeDefined();
    expect(screen.getByText(/Direct Dependents:/i)).toBeDefined();
    expect(screen.getByText(/Transitive Dependents:/i)).toBeDefined();
    expect(screen.getByText(/Impacted Components:/i)).toBeDefined();
    expect(screen.getByText(/Impacted Tests:/i)).toBeDefined();
    expect(screen.getByText(/Cycles Involved:/i)).toBeDefined();

    const exitBtn = screen.getByRole('button', { name: /Exit Impact/i });
    fireEvent.click(exitBtn);
    expect(onExitImpact).toHaveBeenCalled();
  });

  it('handles depth selector change', () => {
    const state: ImpactState = { enabled: true, originNodeId: 'ApexClass:Service', depth: 'ALL' };
    const onImpactChange = vi.fn();

    render(
      <ImpactControls
        impactState={state}
        impactResult={mockImpactResult}
        onImpactChange={onImpactChange}
        onExitImpact={() => {}}
        selectedNode={mockSelectedNode}
        onShowImpact={() => {}}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2' } });

    expect(onImpactChange).toHaveBeenCalledWith({
      ...state,
      depth: 2
    });
  });

  it('allows exiting active impact mode even when neither origin nor selected node exists (Fix C 1B5-10)', () => {
    const onExitImpact = vi.fn();
    const onShowImpact = vi.fn();

    // Active impact state with null originNodeId, null impactResult, and null selectedNode
    const activeDisconnectedState: ImpactState = {
      enabled: true,
      originNodeId: null,
      depth: 'ALL',
    };

    render(
      <ImpactControls
        impactState={activeDisconnectedState}
        impactResult={null}
        onImpactChange={vi.fn()}
        onExitImpact={onExitImpact}
        selectedNode={null}
        onShowImpact={onShowImpact}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /Exit Impact/i });
    expect(toggleBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(toggleBtn);
    expect(onExitImpact).toHaveBeenCalledTimes(1);
    expect(onShowImpact).not.toHaveBeenCalled();
  });
});
