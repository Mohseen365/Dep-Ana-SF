import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigationHistory } from './useNavigationHistory';

describe('useNavigationHistory (F4)', () => {
  it('starts empty with index -1 and cannot go back or forward', () => {
    const { result } = renderHook(() => useNavigationHistory<string>());
    expect(result.current.current).toBeNull();
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoForward).toBe(false);
  });

  it('pushes items, updates current, and enables going back', () => {
    const { result } = renderHook(() => useNavigationHistory<string>());

    act(() => {
      result.current.push('nodeA');
    });
    expect(result.current.current).toBe('nodeA');
    expect(result.current.canGoBack).toBe(false);

    act(() => {
      result.current.push('nodeB');
    });
    expect(result.current.current).toBe('nodeB');
    expect(result.current.canGoBack).toBe(true);
    expect(result.current.canGoForward).toBe(false);
  });

  it('deduplicates consecutive identical pushes', () => {
    const { result } = renderHook(() => useNavigationHistory<string>());

    act(() => {
      result.current.push('nodeA');
      result.current.push('nodeA');
    });

    expect(result.current.stack).toEqual(['nodeA']);
  });

  it('navigates backward and forward correctly', () => {
    const { result } = renderHook(() => useNavigationHistory<string>());

    act(() => {
      result.current.push('nodeA');
      result.current.push('nodeB');
      result.current.push('nodeC');
    });

    expect(result.current.current).toBe('nodeC');

    act(() => {
      result.current.back();
    });
    expect(result.current.current).toBe('nodeB');
    expect(result.current.canGoForward).toBe(true);

    act(() => {
      result.current.back();
    });
    expect(result.current.current).toBe('nodeA');
    expect(result.current.canGoBack).toBe(false);

    act(() => {
      result.current.forward();
    });
    expect(result.current.current).toBe('nodeB');
  });

  it('truncates forward branch when pushing a new item after navigating back', () => {
    const { result } = renderHook(() => useNavigationHistory<string>());

    act(() => {
      result.current.push('nodeA');
      result.current.push('nodeB');
      result.current.push('nodeC');
    });

    act(() => {
      result.current.back(); // index at 'nodeB'
    });

    act(() => {
      result.current.push('nodeD');
    });

    expect(result.current.stack).toEqual(['nodeA', 'nodeB', 'nodeD']);
    expect(result.current.current).toBe('nodeD');
    expect(result.current.canGoForward).toBe(false);
  });

  it('enforces maxSize stack bound', () => {
    const { result } = renderHook(() => useNavigationHistory<string>(3));

    act(() => {
      result.current.push('1');
      result.current.push('2');
      result.current.push('3');
      result.current.push('4');
    });

    expect(result.current.stack).toEqual(['2', '3', '4']);
    expect(result.current.current).toBe('4');
  });
});
