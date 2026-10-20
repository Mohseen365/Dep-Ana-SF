import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GraphView } from './GraphView';

describe('Fix #23 — Memoize DEBUG flag in GraphView', () => {
  it('memoizes DEBUG evaluation across re-renders', () => {
    let searchReadCount = 0;
    const originalLocation = window.location;

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new Proxy(originalLocation, {
        get(target, prop, receiver) {
          if (prop === 'search') {
            searchReadCount++;
            return '?debug=true';
          }
          return Reflect.get(target, prop, receiver);
        },
      }),
    });

    const node = {
      id: 'n1',
      displayName: 'Node 1',
      type: 'ApexClass',
      metrics: { fanIn: 1, fanOut: 1, coupling: 0.5, instability: 0.5, cyclomaticComplexity: 1 },
      refactoringReadiness: { hasCycles: false, hasUnresolved: false },
    };

    const { rerender } = render(
      <GraphView
        nodes={[node]}
        edges={[]}
        onSelectNode={() => {}}
        onSelectEdge={() => {}}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    const countAfterMount = searchReadCount;

    rerender(
      <GraphView
        nodes={[node]}
        edges={[]}
        onSelectNode={() => {}}
        onSelectEdge={() => {}}
        selectedNodeId="n1"
        selectedEdgeId={null}
      />
    );

    // window.location.search read count should not increase during re-render because DEBUG is wrapped in useMemo([], ...)
    expect(searchReadCount).toBe(countAfterMount);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});
