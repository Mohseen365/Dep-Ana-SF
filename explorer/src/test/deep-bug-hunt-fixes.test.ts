import { describe, it, expect, vi } from 'vitest';
import { clearHighlights } from '../lib/graph-interactions';

describe('Graph Interactions & Visual State Cleanup Regression', () => {
  it('clearHighlights removes all highlight, dimmed, impact, finding, and focus classes', () => {
    const removeClassMock = vi.fn();
    const forEachMock = vi.fn();

    const mockCy = {
      elements: vi.fn(() => ({
        removeClass: removeClassMock,
        forEach: forEachMock,
      })),
    } as any;

    clearHighlights(mockCy);

    expect(removeClassMock).toHaveBeenCalledWith(
      'dimmed highlighted impact-muted impact-origin impact-affected finding-highlighted focus-center focus-neighbor focus-dimmed'
    );
  });
});
