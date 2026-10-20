import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { NodeHoverCard } from './NodeHoverCard';
import type { ExplorerNode } from '../../types/explorer';

describe('NodeHoverCard Viewport Resize Repositioning', () => {
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalInnerHeight });
    vi.unstubAllGlobals();
  });

  const node: ExplorerNode = {
    id: 'node-1',
    displayName: 'Hovered Node',
    type: 'ApexClass',
    risk: 'LOW',
    metrics: { fanIn: 1, fanOut: 1, coupling: 0, unresolved: 0, score: 0 },
  };

  it('repositions hover card when window is resized', () => {
    // Hovered near bottom-right edge: x = 900, y = 700 on 1000x800 window
    // Initial left: min(900 + 12, 1000 - 260) = 740px
    // Initial top: min(700 + 12, 800 - 160) = 640px
    const { container } = render(<NodeHoverCard node={node} x={900} y={700} />);

    const cardEl = container.querySelector('.node-hover-card') as HTMLElement;
    expect(cardEl.style.left).toBe('740px');
    expect(cardEl.style.top).toBe('640px');

    // Resize window smaller to 600x500
    // Expected left: min(900 + 12, 600 - 260) = 340px
    // Expected top: min(700 + 12, 500 - 160) = 340px
    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 600 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 500 });
      window.dispatchEvent(new Event('resize'));
    });

    expect(cardEl.style.left).toBe('340px');
    expect(cardEl.style.top).toBe('340px');
  });
});
