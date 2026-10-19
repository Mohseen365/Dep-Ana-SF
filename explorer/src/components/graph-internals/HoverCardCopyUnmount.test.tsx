import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NodeHoverCard } from './NodeHoverCard';
import { EdgeHoverCard } from './EdgeHoverCard';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';

describe('Fix #21 — Clear copy timers on unmount in hover cards', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('clears copy timeout when NodeHoverCard unmounts', async () => {
    const node: ExplorerNode = { id: 'n1', displayName: 'N1', type: 'ApexClass', file: 'src/N1.cls' };
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    const { getByTitle, unmount } = render(
      <NodeHoverCard node={node} x={100} y={100} />
    );

    const btn = getByTitle('Copy file path');
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('src/N1.cls');

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('clears copy timeout when EdgeHoverCard unmounts', async () => {
    const edge: ExplorerEdge = { id: 'e1', source: 'n1', target: 'n2', relationshipType: 'calls', file: 'src/E1.cls', line: 12 };
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    const { getByTitle, unmount } = render(
      <EdgeHoverCard edge={edge} x={100} y={100} />
    );

    const btn = getByTitle('Copy source location');
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('src/E1.cls:12');

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
