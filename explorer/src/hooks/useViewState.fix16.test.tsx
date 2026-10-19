import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewState } from './useViewState';

describe('Fix #16 — Replace JSON.stringify deep comparison in useViewState', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('does not invoke JSON.stringify during state updates in URL-sync effect', () => {
    delete (window as any).location;
    window.location = new URL('http://localhost/') as any;

    const stringifySpy = vi.spyOn(JSON, 'stringify');

    const { result } = renderHook(() => useViewState());

    stringifySpy.mockClear();

    // Trigger state change (selecting a node)
    act(() => {
      result.current.setSelectedNodeId('ApexClass:AccountController');
    });

    // Assert JSON.stringify was NOT called during the state update and URL sync
    expect(stringifySpy).not.toHaveBeenCalled();

    stringifySpy.mockRestore();
  });
});
