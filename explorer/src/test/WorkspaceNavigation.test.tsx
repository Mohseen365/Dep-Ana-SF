import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  WorkspaceRouterProvider,
  useWorkspaceRouter,
} from '../context/WorkspaceRouterContext';
import {
  getDomainForViewMode,
  getDefaultViewModeForDomain,
} from '../lib/router/domain-mapping';

describe('Workspace Navigation & Domain Contracts', () => {
  it('maps view mode to canonical domain for all 18 views', () => {
    expect(getDomainForViewMode('dashboard')).toBe('portfolio');
    expect(getDomainForViewMode('compare')).toBe('portfolio');
    expect(getDomainForViewMode('history')).toBe('portfolio');

    expect(getDomainForViewMode('graph')).toBe('topological');
    expect(getDomainForViewMode('subway')).toBe('topological');
    expect(getDomainForViewMode('constellation')).toBe('topological');
    expect(getDomainForViewMode('tree')).toBe('topological');
    expect(getDomainForViewMode('treemap')).toBe('topological');

    expect(getDomainForViewMode('matrix')).toBe('feature');
    expect(getDomainForViewMode('heatmap')).toBe('feature');
    expect(getDomainForViewMode('river')).toBe('feature');
    expect(getDomainForViewMode('dna')).toBe('feature');

    expect(getDomainForViewMode('profile')).toBe('local');
    expect(getDomainForViewMode('radar')).toBe('local');
    expect(getDomainForViewMode('four-direction')).toBe('local');

    expect(getDomainForViewMode('findings')).toBe('governance');
    expect(getDomainForViewMode('hotspots')).toBe('governance');
    expect(getDomainForViewMode('diagnostics')).toBe('governance');
  });

  it('navigates to canonical default view for each domain', () => {
    expect(getDefaultViewModeForDomain('portfolio')).toBe('dashboard');
    expect(getDefaultViewModeForDomain('topological')).toBe('graph');
    expect(getDefaultViewModeForDomain('feature')).toBe('matrix');
    expect(getDefaultViewModeForDomain('local')).toBe('profile');
    expect(getDefaultViewModeForDomain('governance')).toBe('findings');
  });

  it('updates domain synchronously when navigating across view modes in router', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceRouterProvider initialViewMode="graph">
        {children}
      </WorkspaceRouterProvider>
    );

    const { result } = renderHook(() => useWorkspaceRouter(), { wrapper });

    expect(result.current.activeViewMode).toBe('graph');
    expect(result.current.activeDomain).toBe('topological');

    act(() => {
      result.current.navigateToDomain('feature');
    });

    expect(result.current.activeViewMode).toBe('matrix');
    expect(result.current.activeDomain).toBe('feature');

    act(() => {
      result.current.navigateToView('radar');
    });

    expect(result.current.activeViewMode).toBe('radar');
    expect(result.current.activeDomain).toBe('local');

    act(() => {
      result.current.resetWorkspace();
    });

    expect(result.current.activeViewMode).toBe('graph');
    expect(result.current.activeDomain).toBe('topological');
  });
});
