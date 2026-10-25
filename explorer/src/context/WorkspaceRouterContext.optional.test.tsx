import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useWorkspaceRouterOptional, useWorkspaceRouter, WorkspaceRouterProvider } from './WorkspaceRouterContext';

describe('WorkspaceRouterContext Optional Accessor', () => {
  it('returns null when no WorkspaceRouterProvider is mounted', () => {
    const { result } = renderHook(() => useWorkspaceRouterOptional());
    expect(result.current).toBeNull();
  });

  it('returns live value when WorkspaceRouterProvider is mounted', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceRouterProvider initialViewMode="graph">{children}</WorkspaceRouterProvider>
    );
    const { result } = renderHook(
      () => ({
        optional: useWorkspaceRouterOptional(),
        main: useWorkspaceRouter(),
      }),
      { wrapper }
    );

    expect(result.current.optional).not.toBeNull();
    expect(result.current.optional).toBe(result.current.main);
  });

  it('throws when useWorkspaceRouter is called without a provider', () => {
    expect(() => renderHook(() => useWorkspaceRouter())).toThrow(
      'useWorkspaceRouter must be used within a WorkspaceRouterProvider'
    );
  });
});
