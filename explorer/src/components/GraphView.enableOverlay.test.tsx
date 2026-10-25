import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GraphView } from './GraphView';
import { createMockNode } from '../test/mock-factories';

describe('Fix #25 — Thread enableFeatureOverlay prop through GraphViewProps', () => {
  it('suppresses FeatureOverlayCanvas when enableFeatureOverlay is false', () => {
    const node = createMockNode('n1', 'Node 1', 'ApexClass');

    const { container } = render(
      <GraphView
        nodes={[node]}
        edges={[]}
        onSelectNode={() => {}}
        onSelectEdge={() => {}}
        selectedNodeId={null}
        selectedEdgeId={null}
        enableFeatureOverlay={false}
      />
    );

    const overlay = container.querySelector('[data-testid="feature-overlay-canvas"]');
    expect(overlay).toBeNull();
  });

  it('renders FeatureOverlayCanvas when enableFeatureOverlay is true or omitted', () => {
    const node = createMockNode('n1', 'Node 1', 'ApexClass');

    const { container } = render(
      <GraphView
        nodes={[node]}
        edges={[]}
        onSelectNode={() => {}}
        onSelectEdge={() => {}}
        selectedNodeId={null}
        selectedEdgeId={null}
      />
    );

    const overlay = container.querySelector('[data-testid="feature-overlay-canvas"]');
    expect(overlay).not.toBeNull();
  });
});
