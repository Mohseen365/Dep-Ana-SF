import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGraphSelection } from './useGraphSelection';

describe('useGraphSelection', () => {
  it('initializes with empty selection and history', () => {
    const { result } = renderHook(() => useGraphSelection());
    expect(result.current.selectedNodeId).toBeNull();
    expect(result.current.selectedEdgeId).toBeNull();
    expect(result.current.history).toEqual([]);
  });

  it('selects node, clears edge selection, and appends to history up to limit', () => {
    const { result } = renderHook(() => useGraphSelection());

    act(() => {
      result.current.selectEdge('edge-1');
    });
    expect(result.current.selectedEdgeId).toBe('edge-1');

    act(() => {
      result.current.selectNode('node-1');
    });
    expect(result.current.selectedNodeId).toBe('node-1');
    expect(result.current.selectedEdgeId).toBeNull();
    expect(result.current.history).toEqual(['node-1']);

    act(() => {
      result.current.selectNode('node-1'); // Duplicate consecutive selection
    });
    expect(result.current.history).toEqual(['node-1']);

    act(() => {
      result.current.selectNode('node-2');
    });
    expect(result.current.history).toEqual(['node-1', 'node-2']);
  });

  it('selects edge and clears node selection', () => {
    const { result } = renderHook(() => useGraphSelection());

    act(() => {
      result.current.selectNode('node-1');
    });
    expect(result.current.selectedNodeId).toBe('node-1');

    act(() => {
      result.current.selectEdge('edge-100');
    });
    expect(result.current.selectedEdgeId).toBe('edge-100');
    expect(result.current.selectedNodeId).toBeNull();
  });

  it('clears node and edge selection and clears history', () => {
    const { result } = renderHook(() => useGraphSelection());

    act(() => {
      result.current.selectNode('node-1');
    });

    act(() => {
      result.current.clear();
    });
    expect(result.current.selectedNodeId).toBeNull();
    expect(result.current.selectedEdgeId).toBeNull();
    expect(result.current.history).toEqual(['node-1']);

    act(() => {
      result.current.clearHistory();
    });
    expect(result.current.history).toEqual([]);
  });
});
