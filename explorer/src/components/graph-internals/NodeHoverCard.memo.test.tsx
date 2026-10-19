import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NodeHoverCard } from './NodeHoverCard';
import type { ExplorerNode } from '../../types/explorer';
import type { ArchitectureFinding } from '../../lib/intelligence';

describe('Fix #22 — Memoize per-node findings filter in NodeHoverCard', () => {
  it('does not re-filter findings when parent re-renders with identical findings and node', () => {
    const node: ExplorerNode = { id: 'n1', displayName: 'N1', type: 'ApexClass' };
    const findings: ArchitectureFinding[] = [
      { id: 'f1', title: 'F1', description: 'D1', severity: 'HIGH', nodeIds: ['n1'] },
    ];

    const filterSpy = vi.spyOn(Array.prototype, 'filter');

    const { rerender } = render(
      <NodeHoverCard node={node} x={100} y={100} findings={findings} />
    );

    const initialCallCount = filterSpy.mock.calls.length;
    expect(initialCallCount).toBeGreaterThan(0);

    // Re-render with same props
    rerender(
      <NodeHoverCard node={node} x={100} y={100} findings={findings} />
    );

    // Array.prototype.filter should not have been called again for nodeFindings
    expect(filterSpy.mock.calls.length).toBe(initialCallCount);

    filterSpy.mockRestore();
  });
});
