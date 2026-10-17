import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from './useCommandPalette';

describe('useCommandPalette (F10)', () => {
  beforeEach(() => {
    // Clear any leftover state
  });

  it('initializes with isOpen = false and query = ""', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.query).toBe('');
    expect(result.current.commands).toEqual([]);
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

  it('registers and runs commands correctly', () => {
    const { result } = renderHook(() => useCommandPalette());
    const runMock = vi.fn();

    act(() => {
      result.current.registerCommand({
        id: 'graph.focus-node',
        label: 'Focus on selected node',
        category: 'Graph',
        run: runMock,
      });
    });

    expect(result.current.commands).toHaveLength(1);
    expect(result.current.commands[0].id).toBe('graph.focus-node');

    act(() => {
      result.current.open();
      const success = result.current.runCommand('graph.focus-node');
      expect(success).toBe(true);
    });

    expect(runMock).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
  });

  it('does not run disabled commands', () => {
    const { result } = renderHook(() => useCommandPalette());
    const runMock = vi.fn();

    act(() => {
      result.current.registerCommand({
        id: 'graph.copy-path',
        label: 'Copy selected node file path',
        disabled: true,
        run: runMock,
      });
    });

    act(() => {
      const success = result.current.runCommand('graph.copy-path');
      expect(success).toBe(false);
    });

    expect(runMock).not.toHaveBeenCalled();
  });
});
