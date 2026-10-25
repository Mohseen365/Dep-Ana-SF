import { describe, it, expect, vi } from 'vitest';
import { GraphErrorBoundary } from './GraphErrorBoundary';

describe('GraphErrorBoundary Component', () => {
  it('renders children normally when no error is thrown', () => {
    // In node environment without React DOM testing-library, test instance rendering logic directly
    const errorBoundary = new GraphErrorBoundary({
      children: <div>Child Content</div>,
    });
    expect(errorBoundary.render()).toEqual(<div>Child Content</div>);
  });

  it('updates state to error on getDerivedStateFromError', () => {
    const error = new Error('Test Failure');
    const state = GraphErrorBoundary.getDerivedStateFromError(error);
    expect(state).toEqual({
      hasError: true,
      error,
      isRecovering: false,
    });
  });

  it('resets error state ONLY when resetKey or resetKeys change, ignoring children reference changes', () => {
    const boundary = new GraphErrorBoundary({
      children: <div>Child 1</div>,
      resetKey: 'key1',
      resetKeys: ['mode1', 1],
    });

    boundary.state = {
      hasError: true,
      error: new Error('Child Crash'),
      isRecovering: false,
    };

    const setStateSpy = vi.spyOn(boundary, 'setState');

    // 1. Re-render with new inline children reference but SAME resetKey & resetKeys
    boundary.componentDidUpdate({
      children: <div>Child 2</div>, // Fresh reference
      resetKey: 'key1',
      resetKeys: ['mode1', 1],
    });

    // Should NOT reset error state (Issue #2 fix verification)
    expect(setStateSpy).not.toHaveBeenCalled();

    // 2. Re-render with CHANGED resetKey
    boundary.componentDidUpdate({
      children: <div>Child 2</div>,
      resetKey: 'key0',
      resetKeys: ['mode1', 1],
    });

    expect(setStateSpy).toHaveBeenLastCalledWith({
      hasError: false,
      error: null,
      isRecovering: false,
    });

    // 3. Re-render with CHANGED resetKeys array content
    boundary.state = {
      hasError: true,
      error: new Error('Child Crash 2'),
      isRecovering: false,
    };
    setStateSpy.mockClear();

    boundary.componentDidUpdate({
      children: <div>Child 3</div>,
      resetKey: 'key1',
      resetKeys: ['mode1', 0], // Changed array element
    });

    expect(setStateSpy).toHaveBeenLastCalledWith({
      hasError: false,
      error: null,
      isRecovering: false,
    });
  });
});
