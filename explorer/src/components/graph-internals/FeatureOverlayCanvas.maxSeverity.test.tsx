import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { FeatureOverlayCanvas } from './FeatureOverlayCanvas';
import type { ExplorerNode } from '../../types/explorer';
import type { ArchitectureFinding } from '../../lib/intelligence';

describe('FeatureOverlayCanvas Finding Max Severity Badge (Fix #11)', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockCy = {
    pan: () => ({ x: 0, y: 0 }),
    zoom: () => 1,
    nodes: () => [],
    on: () => {},
    off: () => {},
  } as any;

  const nodes: ExplorerNode[] = [
    {
      id: 'node-1',
      displayName: 'Node 1',
      type: 'ApexClass',
      risk: 'LOW',
      metrics: { fanIn: 1, fanOut: 1, coupling: 0, unresolved: 0, score: 0 },
    },
  ];

  it('renders badge with maxSeverity when findings array has lower severity first', () => {
    const findings: ArchitectureFinding[] = [
      {
        id: 'finding-1',
        title: 'Low severity finding',
        severity: 'LOW',
        nodeIds: ['node-1'],
      } as ArchitectureFinding,
      {
        id: 'finding-2',
        title: 'Critical severity finding',
        severity: 'CRITICAL',
        nodeIds: ['node-1'],
      } as ArchitectureFinding,
    ];

    const { container } = render(
      <FeatureOverlayCanvas
        cy={mockCy}
        nodes={nodes}
        edges={[]}
        findings={findings}
        nodePositions={{ 'node-1': { x: 100, y: 100 } }}
        enableOverlay={true}
      />
    );

    const badgeEl = container.querySelector("[data-testid='finding-badge-node-1']") as HTMLElement;
    expect(badgeEl).not.toBeNull();
    expect(badgeEl.getAttribute('data-max-severity')).toBe('CRITICAL');

    const titleEl = badgeEl.querySelector('title');
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toBe('2 issues (CRITICAL)');
  });
});
