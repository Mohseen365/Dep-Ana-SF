import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EdgeHoverCard } from './EdgeHoverCard';
import type { ExplorerEdge } from '../../types/explorer';

describe('EdgeHoverCard vscodeUrl encoding', () => {
  it('correctly encodes paths with spaces, Windows drive letters, #, and special characters', () => {
    const edgeWithSpaces: ExplorerEdge = {
      id: 'e1',
      source: 'n1',
      target: 'n2',
      relationshipType: 'calls',
      file: 'C:/Users/My Name/Project/src#1/app.ts',
      line: 42,
    };

    render(<EdgeHoverCard edge={edgeWithSpaces} x={100} y={100} />);

    const link = screen.getByRole('link', { name: /open in editor/i });
    expect(link).toHaveAttribute(
      'href',
      'vscode://file/C%3A/Users/My%20Name/Project/src%231/app.ts:42'
    );
  });
});
