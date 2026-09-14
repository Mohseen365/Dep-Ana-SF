import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SelectionProvider, useSelection } from './SelectionContext';

const ConsumerComponent: React.FC = () => {
  const { selectedNodeId, selectNode, clear } = useSelection();
  return (
    <div>
      <span data-testid="selected-node">{selectedNodeId || 'none'}</span>
      <button onClick={() => selectNode('node-123')}>Select Node</button>
      <button onClick={clear}>Clear</button>
    </div>
  );
};

describe('SelectionContext', () => {
  it('throws error when useSelection is called outside SelectionProvider', () => {
    // Prevent Vitest error output pollution
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ConsumerComponent />)).toThrow(
      'useSelection must be used within a SelectionProvider'
    );
    consoleError.mockRestore();
  });

  it('provides selection state to children within SelectionProvider', () => {
    render(
      <SelectionProvider>
        <ConsumerComponent />
      </SelectionProvider>
    );

    expect(screen.getByTestId('selected-node').textContent).toBe('none');

    fireEvent.click(screen.getByText('Select Node'));
    expect(screen.getByTestId('selected-node').textContent).toBe('node-123');

    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByTestId('selected-node').textContent).toBe('none');
  });

  it('accepts custom value prop in SelectionProvider', () => {
    const dummySelection = {
      selectedNodeId: 'custom-node',
      selectedEdgeId: null,
      history: ['custom-node'],
      selectNode: vi.fn(),
      selectEdge: vi.fn(),
      clear: vi.fn(),
      clearHistory: vi.fn(),
    };

    render(
      <SelectionProvider value={dummySelection}>
        <ConsumerComponent />
      </SelectionProvider>
    );

    expect(screen.getByTestId('selected-node').textContent).toBe('custom-node');
  });
});
