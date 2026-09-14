import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from './useCommandPalette';

describe('useCommandPalette', () => {
  beforeEach(() => {
    // Clear any leftover state
  });

  it('initializes with isOpen = false and query = ""', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.query).toBe('');
  });

  it('toggles open/close with Cmd+K / Ctrl+K', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('closes on Escape key when open', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      result.current.open();
      result.current.setQuery('test');
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.query).toBe('test');

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.query).toBe('');
  });

  it('allows manual open, close, setQuery, and toggle', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.setQuery('movie');
    });
    expect(result.current.query).toBe('movie');

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.query).toBe('');

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('cleans up event listener on unmount', () => {
    const { result, unmount } = renderHook(() => useCommandPalette());

    unmount();

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    // Should remain false because hook unmounted
    expect(result.current.isOpen).toBe(false);
  });
});
