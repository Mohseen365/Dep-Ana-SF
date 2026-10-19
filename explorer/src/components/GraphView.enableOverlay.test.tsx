import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GraphView } from './GraphView';

describe('Fix #25 — Thread enableFeatureOverlay prop through GraphViewProps', () => {
  it('suppresses FeatureOverlayCanvas when enableFeatureOverlay is false', () => {
    const node = {
      id: 'n1',
      displayName: 'Node 1',
      type: 'ApexClass',
      metrics: { fanIn: 1, fanOut: 1, coupling: 0.5, instability: 0.5, cyclomaticComplexity: 1 },
      refactoringReadiness: { hasCycles: false, hasUnresolved: false, readinessScore: 100 },
    };

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
    const node = {
      id: 'n1',
      displayName: 'Node 1',
      type: 'ApexClass',
      metrics: { fanIn: 1, fanOut: 1, coupling: 0.5, instability: 0.5, cyclomaticComplexity: 1 },
      refactoringReadiness: { hasCycles: false, hasUnresolved: false, readinessScore: 100 },
    };

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
