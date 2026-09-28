import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { WorkspaceRouterProvider, useWorkspaceRouter } from './WorkspaceRouterContext';

const TestRouterComponent: React.FC = () => {
  const {
    activeDomain,
    activeViewMode,
    navigateToDomain,
    navigateToView,
    setViewMode,
    resetWorkspace,
  } = useWorkspaceRouter();

  return (
    <div>
      <div data-testid="active-domain">{activeDomain}</div>
      <div data-testid="active-view">{activeViewMode}</div>

      <button onClick={() => navigateToDomain('feature')}>Go To Feature Domain</button>
      <button onClick={() => navigateToDomain('governance')}>Go To Governance Domain</button>

      <button onClick={() => navigateToView('tree')}>Go To Tree View</button>
      <button onClick={() => setViewMode('radar')}>Set View Radar</button>

      <button onClick={resetWorkspace}>Reset Workspace</button>
    </div>
  );
};

describe('WorkspaceRouterContext', () => {
  it('throws error when useWorkspaceRouter is used outside Provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestRouterComponent />)).toThrow(
      'useWorkspaceRouter must be used within a WorkspaceRouterProvider'
    );
    consoleError.mockRestore();
  });

  it('provides default domain and view mode', () => {
    render(
      <WorkspaceRouterProvider>
        <TestRouterComponent />
      </WorkspaceRouterProvider>
    );

    expect(screen.getByTestId('active-domain').textContent).toBe('topological');
    expect(screen.getByTestId('active-view').textContent).toBe('graph');
  });

  it('navigates across domains and view modes cleanly', () => {
    const handleChange = vi.fn();

    render(
      <WorkspaceRouterProvider initialViewMode="graph" onChange={handleChange}>
        <TestRouterComponent />
      </WorkspaceRouterProvider>
    );

    fireEvent.click(screen.getByText('Go To Feature Domain'));
    expect(screen.getByTestId('active-domain').textContent).toBe('feature');
    expect(screen.getByTestId('active-view').textContent).toBe('matrix');
    expect(handleChange).toHaveBeenLastCalledWith('matrix', 'feature');

    fireEvent.click(screen.getByText('Go To Tree View'));
    expect(screen.getByTestId('active-domain').textContent).toBe('topological');
    expect(screen.getByTestId('active-view').textContent).toBe('tree');
    expect(handleChange).toHaveBeenLastCalledWith('tree', 'topological');

    fireEvent.click(screen.getByText('Set View Radar'));
    expect(screen.getByTestId('active-domain').textContent).toBe('local');
    expect(screen.getByTestId('active-view').textContent).toBe('radar');
    expect(handleChange).toHaveBeenLastCalledWith('radar', 'local');

    fireEvent.click(screen.getByText('Reset Workspace'));
    expect(screen.getByTestId('active-domain').textContent).toBe('topological');
    expect(screen.getByTestId('active-view').textContent).toBe('graph');
  });
});
