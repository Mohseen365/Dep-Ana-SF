import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useViewState } from './useViewState';
import { focusQuery } from '../lib/url';

describe('Fix #15 — Defensive readStateFromUrl', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('mounts safely when a query parser throws on garbage parameters, logging a warning and parsing other valid params', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Spy on focusQuery.fromQuery to throw on garbage param
    const originalFocusFromQuery = focusQuery.fromQuery;
    vi.spyOn(focusQuery, 'fromQuery').mockImplementation((params, fallback) => {
      if (params.get('focus') === 'throw_error') {
        throw new Error('Corrupted focus parameter');
      }
      return originalFocusFromQuery(params, fallback);
    });

    delete (window as any).location;
    window.location = new URL('http://localhost/?focus=throw_error&node=ApexClass:TestNode') as any;

    let hookResult: any;
    expect(() => {
      const { result } = renderHook(() => useViewState());
      hookResult = result;
    }).not.toThrow();

    // Valid node parameter should still be parsed and set
    expect(hookResult.current.selectedNodeId).toBe('ApexClass:TestNode');

    // Console warning should have been logged for the focus parsing error
    expect(warnSpy).toHaveBeenCalledWith(
      '[useViewState] failed to parse focus params:',
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });
});
