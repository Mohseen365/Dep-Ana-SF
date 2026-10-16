import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { InvestigationProvider, useInvestigation } from './InvestigationContext';

const TestComponent: React.FC = () => {
  const {
    state,
    selectNode,
    selectEdge,
    selectFinding,
    selectCycle,
    selectUnresolvedEdge,
    clearSelection,
    setFocus,
    clearFocus,
    setImpact,
    clearImpact,
    setConnection,
    clearConnection,
    openDrawer,
    closeDrawer,
    setDrawerPinned,
    setDrawerDetached,
    drillIntoComponent,
    navigateBreadcrumb,
    resetInvestigationContext,
  } = useInvestigation();

  return (
    <div>
      <div data-testid="selected-node">{state.selectedNodeId || 'none'}</div>
      <div data-testid="selected-edge">{state.selectedEdgeId || 'none'}</div>
      <div data-testid="selected-finding">{state.selectedFindingId || 'none'}</div>
      <div data-testid="selected-cycle">{state.selectedCycleId || 'none'}</div>
      <div data-testid="selected-unresolved">{state.selectedUnresolvedEdgeId || 'none'}</div>

      <div data-testid="history-count">{state.selectionHistory.length}</div>
      <div data-testid="recent-count">{state.recentNodeIds.length}</div>
      <div data-testid="recent-first">{state.recentNodeIds[0] || 'none'}</div>
      <div data-testid="drill-path">{state.drillPath.join(' > ')}</div>

      <div data-testid="drawer-open">{state.drawerState.isOpen ? 'open' : 'closed'}</div>
      <div data-testid="drawer-tab">{state.drawerState.activeTab}</div>
      <div data-testid="drawer-pinned">{state.drawerState.isPinned ? 'pinned' : 'unpinned'}</div>
      <div data-testid="drawer-detached">{state.drawerState.isDetached ? 'detached' : 'attached'}</div>

      <div data-testid="focus-enabled">{state.focusState.enabled ? 'true' : 'false'}</div>
      <div data-testid="focus-node">{state.focusState.focusNodeId || 'none'}</div>

      <div data-testid="impact-enabled">{state.impactState.enabled ? 'true' : 'false'}</div>
      <div data-testid="impact-node">{state.impactState.originNodeId || 'none'}</div>

      <div data-testid="connection-dir">{state.connectionState.direction}</div>

      <button onClick={() => selectNode('node-1')}>Select Node 1</button>
      <button onClick={() => selectNode('node-2')}>Select Node 2</button>
      <button onClick={() => selectEdge('edge-1')}>Select Edge 1</button>
      <button onClick={() => selectFinding('finding-1', 'node-finding')}>Select Finding 1</button>
      <button onClick={() => selectCycle('cycle-1', 'node-cycle')}>Select Cycle 1</button>
      <button onClick={() => selectUnresolvedEdge('unresolved-1', 'node-unresolved')}>Select Unresolved 1</button>

      <button onClick={clearSelection}>Clear Selection</button>

      <button onClick={() => setFocus({ focusNodeId: 'node-focus', depth: 2 })}>Set Focus</button>
      <button onClick={clearFocus}>Clear Focus</button>

      <button onClick={() => setImpact({ originNodeId: 'node-impact', depth: 3 })}>Set Impact</button>
      <button onClick={clearImpact}>Clear Impact</button>

      <button onClick={() => setConnection({ direction: 'dependencies', depth: 1 })}>Set Connection</button>
      <button onClick={clearConnection}>Clear Connection</button>

      <button onClick={() => openDrawer('evidence')}>Open Drawer Evidence</button>
      <button onClick={closeDrawer}>Close Drawer</button>

      <button onClick={() => setDrawerPinned(true)}>Pin Drawer</button>
      <button onClick={() => setDrawerDetached(true)}>Detach Drawer</button>

      <button onClick={() => drillIntoComponent('node-drill-1')}>Drill Node 1</button>
      <button onClick={() => drillIntoComponent('node-drill-2')}>Drill Node 2</button>
      <button onClick={() => navigateBreadcrumb(0)}>Breadcrumb 0</button>

      <button onClick={resetInvestigationContext}>Reset Context</button>
    </div>
  );
};

describe('InvestigationContext', () => {
  it('throws error when useInvestigation is used outside Provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow(
      'useInvestigation must be used within an InvestigationProvider'
    );
    consoleError.mockRestore();
  });

  it('manages node selection, drawer state, and selection history limits', () => {
    render(
      <InvestigationProvider>
        <TestComponent />
      </InvestigationProvider>
    );

    expect(screen.getByTestId('selected-node').textContent).toBe('none');
    expect(screen.getByTestId('drawer-open').textContent).toBe('closed');

    fireEvent.click(screen.getByText('Select Node 1'));
    expect(screen.getByTestId('selected-node').textContent).toBe('node-1');
    expect(screen.getByTestId('drawer-open').textContent).toBe('open');
    expect(screen.getByTestId('history-count').textContent).toBe('1');
    expect(screen.getByTestId('recent-first').textContent).toBe('node-1');

    // Duplicate selection should not append consecutive history
    fireEvent.click(screen.getByText('Select Node 1'));
    expect(screen.getByTestId('history-count').textContent).toBe('1');

    fireEvent.click(screen.getByText('Select Node 2'));
    expect(screen.getByTestId('selected-node').textContent).toBe('node-2');
    expect(screen.getByTestId('history-count').textContent).toBe('2');
    expect(screen.getByTestId('recent-first').textContent).toBe('node-2');
  });

  it('manages edge, finding, cycle, and unresolved edge selections correctly', () => {
    render(
      <InvestigationProvider>
        <TestComponent />
      </InvestigationProvider>
    );

    fireEvent.click(screen.getByText('Select Edge 1'));
    expect(screen.getByTestId('selected-edge').textContent).toBe('edge-1');
    expect(screen.getByTestId('selected-node').textContent).toBe('none');

    fireEvent.click(screen.getByText('Select Finding 1'));
    expect(screen.getByTestId('selected-finding').textContent).toBe('finding-1');
    expect(screen.getByTestId('selected-node').textContent).toBe('node-finding');

    fireEvent.click(screen.getByText('Select Cycle 1'));
    expect(screen.getByTestId('selected-cycle').textContent).toBe('cycle-1');
    expect(screen.getByTestId('selected-node').textContent).toBe('node-cycle');

    fireEvent.click(screen.getByText('Select Unresolved 1'));
    expect(screen.getByTestId('selected-unresolved').textContent).toBe('unresolved-1');
    expect(screen.getByTestId('selected-node').textContent).toBe('node-unresolved');

    fireEvent.click(screen.getByText('Clear Selection'));
    expect(screen.getByTestId('selected-node').textContent).toBe('none');
    expect(screen.getByTestId('selected-edge').textContent).toBe('none');
    expect(screen.getByTestId('selected-finding').textContent).toBe('none');
    expect(screen.getByTestId('selected-cycle').textContent).toBe('none');
    expect(screen.getByTestId('selected-unresolved').textContent).toBe('none');
  });

  it('handles focus, impact, connection, drawer pinning, and drill breadcrumbs', () => {
    render(
      <InvestigationProvider>
        <TestComponent />
      </InvestigationProvider>
    );

    fireEvent.click(screen.getByText('Set Focus'));
    expect(screen.getByTestId('focus-enabled').textContent).toBe('true');
    expect(screen.getByTestId('focus-node').textContent).toBe('node-focus');

    fireEvent.click(screen.getByText('Clear Focus'));
    expect(screen.getByTestId('focus-enabled').textContent).toBe('false');

    fireEvent.click(screen.getByText('Set Impact'));
    expect(screen.getByTestId('impact-enabled').textContent).toBe('true');
    expect(screen.getByTestId('impact-node').textContent).toBe('node-impact');

    fireEvent.click(screen.getByText('Clear Impact'));
    expect(screen.getByTestId('impact-enabled').textContent).toBe('false');

    fireEvent.click(screen.getByText('Set Connection'));
    expect(screen.getByTestId('connection-dir').textContent).toBe('dependencies');

    fireEvent.click(screen.getByText('Clear Connection'));
    expect(screen.getByTestId('connection-dir').textContent).toBe('both');

    fireEvent.click(screen.getByText('Pin Drawer'));
    expect(screen.getByTestId('drawer-pinned').textContent).toBe('pinned');

    fireEvent.click(screen.getByText('Detach Drawer'));
    expect(screen.getByTestId('drawer-detached').textContent).toBe('detached');

    fireEvent.click(screen.getByText('Drill Node 1'));
    fireEvent.click(screen.getByText('Drill Node 2'));
    expect(screen.getByTestId('drill-path').textContent).toBe('node-drill-1 > node-drill-2');

    fireEvent.click(screen.getByText('Breadcrumb 0'));
    expect(screen.getByTestId('drill-path').textContent).toBe('node-drill-1');
    expect(screen.getByTestId('selected-node').textContent).toBe('node-drill-1');

    fireEvent.click(screen.getByText('Reset Context'));
    expect(screen.getByTestId('selected-node').textContent).toBe('none');
    expect(screen.getByTestId('drill-path').textContent).toBe('');
    // Drawer pinned/detached preferences persist across reset
    expect(screen.getByTestId('drawer-pinned').textContent).toBe('pinned');
  });
});
