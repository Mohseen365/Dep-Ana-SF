import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useProjectOptional, useProject, ProjectProvider } from './ProjectContext';

describe('ProjectContext Optional Accessor', () => {
  it('returns null when no ProjectProvider is mounted', () => {
    const { result } = renderHook(() => useProjectOptional());
    expect(result.current).toBeNull();
  });

  it('returns live value when ProjectProvider is mounted', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProjectProvider initialProjectId="default">{children}</ProjectProvider>
    );
    const { result: optionalResult } = renderHook(() => useProjectOptional(), { wrapper });
    const { result: mainResult } = renderHook(() => useProject(), { wrapper });

    expect(optionalResult.current).not.toBeNull();
    expect(optionalResult.current?.activeProjectId).toEqual(mainResult.current.activeProjectId);
  });

  it('throws when useProject is called without a provider', () => {
    expect(() => renderHook(() => useProject())).toThrow(
      'useProject must be used within a ProjectProvider'
    );
  });
});
