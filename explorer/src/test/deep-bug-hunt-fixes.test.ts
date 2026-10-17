import { describe, it, expect, vi } from 'vitest';
import { clearHighlights } from '../lib/graph-interactions';

describe('Deep Bug Hunt & Graph Interactions Regression Suite', () => {
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

  it('verifies clearHighlights safely handles custom cycle class prefixes on elements', () => {
    const removeClassMock = vi.fn();
    const mockElement = {
      classes: () => ['cycle-1', 'dimmed', 'some-other-class'],
      removeClass: removeClassMock,
    };

    const mockCy = {
      elements: vi.fn(() => ({
        removeClass: vi.fn(),
        forEach: (cb: any) => cb(mockElement),
      })),
    } as any;

    clearHighlights(mockCy);

    expect(removeClassMock).toHaveBeenCalledWith('cycle-1');
  });
});
