import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FeatureOverlayCanvas } from './FeatureOverlayCanvas';
import type { ExplorerNode } from '../../types/explorer';
import type { ArchitectureFinding } from '../../lib/intelligence';

describe('Fix #20 — Replace emoji inside SVG <text> with vector glyph path', () => {
  it('renders a vector <path> warning triangle and no emoji in <text>', () => {
    const stubCy = {
      pan: () => ({ x: 0, y: 0 }),
      zoom: () => 1,
      on: () => {},
      off: () => {},
      nodes: () => [{ id: () => 'n1', position: () => ({ x: 100, y: 100 }) }],
    } as any;

    const nodes: ExplorerNode[] = [
      { id: 'n1', displayName: 'Node 1', type: 'ApexClass' },
    ];

    const findings: ArchitectureFinding[] = [
      {
        id: 'f1',
        title: 'Finding 1',
        description: 'Desc',
        severity: 'HIGH',
        nodeIds: ['n1'],
      },
    ];

    const { container } = render(
      <FeatureOverlayCanvas
        cy={stubCy}
        nodes={nodes}
        edges={[]}
        findings={findings}
        enableOverlay={true}
      />
    );

    const badge = container.querySelector('[data-testid="finding-badge-n1"]');
    expect(badge).not.toBeNull();

    const path = badge?.querySelector('path');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toBe('M 6 12 L 10 4 L 14 12 Z');

    const text = badge?.querySelector('text');
    expect(text?.textContent).not.toContain('⚠️');
    expect(text?.textContent).toBe('1');
  });
});
