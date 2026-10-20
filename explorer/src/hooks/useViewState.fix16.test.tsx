import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewState } from './useViewState';

describe('Fix #16 — Replace JSON.stringify deep comparison in useViewState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('does not invoke JSON.stringify during state updates in URL-sync effect', () => {
    window.history.replaceState(null, '', '/');

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
