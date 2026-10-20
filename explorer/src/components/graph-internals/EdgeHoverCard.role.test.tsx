import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EdgeHoverCard } from './EdgeHoverCard';
import type { ExplorerEdge } from '../../types/explorer';

describe('Fix #24 — Add role="tooltip" to EdgeHoverCard', () => {
  it('renders EdgeHoverCard with role="tooltip"', () => {
    const edge: ExplorerEdge = {
      id: 'e1',
      source: 'n1',
      target: 'n2',
      relationshipType: 'method-call',
      method: null,
      evidence: 'Test evidence',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      line: 10,
      column: 5,
      methodOwner: null,
      file: 'src/n1.ts',
      canonical: {
        source: { type: 'ApexClass', name: 'n1', method: null },
        target: { type: 'ApexClass', name: 'n2', method: null },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 10, column: 5 },
      },
    };

    const { container } = render(
      <EdgeHoverCard edge={edge} x={100} y={100} />
    );

    const card = container.querySelector('.edge-hover-card');
    expect(card).not.toBeNull();
    expect(card?.getAttribute('role')).toBe('tooltip');
  });
});
