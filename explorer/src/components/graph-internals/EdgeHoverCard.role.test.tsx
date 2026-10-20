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
    };

    const { container } = render(
      <EdgeHoverCard edge={edge} x={100} y={100} />
    );

    const card = container.querySelector('.edge-hover-card');
    expect(card).not.toBeNull();
    expect(card?.getAttribute('role')).toBe('tooltip');
  });
});
