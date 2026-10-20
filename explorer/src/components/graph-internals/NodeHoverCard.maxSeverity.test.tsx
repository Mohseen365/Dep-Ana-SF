import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NodeHoverCard } from './NodeHoverCard';
import type { ExplorerNode } from '../../types/explorer';
import type { ArchitectureFinding } from '../../lib/intelligence';

describe('NodeHoverCard Finding Max Severity Display (Fix #11)', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const node: ExplorerNode = {
    id: 'node-1',
    displayName: 'Hovered Node',
    type: 'ApexClass',
    risk: 'LOW',
    metrics: { fanIn: 1, fanOut: 1, coupling: 0, unresolved: 0, score: 0 },
  };

  it('renders maxSeverity when findings array has lower severity first', () => {
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

    render(<NodeHoverCard node={node} x={100} y={100} findings={findings} />);

    // The text should render maxSeverity (CRITICAL), not nodeFindings[0].severity (LOW)
    const summaryEl = screen.getByText(/2 issues \(CRITICAL\)/i);
    expect(summaryEl).toBeDefined();
  });
});
