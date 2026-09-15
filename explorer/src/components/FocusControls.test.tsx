import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusControls } from './FocusControls';
import { FocusState } from '../lib/focus-graph';

describe('FocusControls component', () => {
  const defaultFocusState: FocusState = {
    enabled: true,
    focusNodeId: 'ApexClass:Service',
    direction: 'both',
    depth: 2,
  };

  it('renders Focus button disabled when no node selected', () => {
    const handleFocusChange = vi.fn();
    render(
      <FocusControls
        focusState={{ enabled: false, focusNodeId: null, direction: 'both', depth: 2 }}
        onFocusChange={handleFocusChange}
        hasSelectedNode={false}
      />
    );

    expect(screen.getByText('Focus')).toBeDefined();
    expect(screen.getByText('Select a node to enable focus')).toBeDefined();
  });

  it('renders direction and depth options when focus is active', () => {
    const handleFocusChange = vi.fn();
    render(
      <FocusControls
        focusState={defaultFocusState}
        onFocusChange={handleFocusChange}
        hasSelectedNode={true}
      />
    );

    expect(screen.getByRole('combobox', { name: 'Direction' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Depth' })).toBeDefined();
  });

  it('calls onFocusChange with updated direction on direction selection', () => {
    const handleFocusChange = vi.fn();
    render(
      <FocusControls
        focusState={defaultFocusState}
        onFocusChange={handleFocusChange}
        hasSelectedNode={true}
      />
    );

    const dirSelect = screen.getByRole('combobox', { name: 'Direction' });
    fireEvent.change(dirSelect, { target: { value: 'dependencies' } });

    expect(handleFocusChange).toHaveBeenCalledWith({
      ...defaultFocusState,
      direction: 'dependencies',
    });
  });

  it('calls onFocusChange with depth values 1, 2, 3, and ALL', () => {
    const handleFocusChange = vi.fn();
    render(
      <FocusControls
        focusState={defaultFocusState}
        onFocusChange={handleFocusChange}
        hasSelectedNode={true}
      />
    );

    const depthSelect = screen.getByRole('combobox', { name: 'Depth' });

    fireEvent.change(depthSelect, { target: { value: '1' } });
    expect(handleFocusChange).toHaveBeenCalledWith({
      ...defaultFocusState,
      depth: 1,
    });

    fireEvent.change(depthSelect, { target: { value: '3' } });
    expect(handleFocusChange).toHaveBeenCalledWith({
      ...defaultFocusState,
      depth: 3,
    });

    fireEvent.change(depthSelect, { target: { value: 'ALL' } });
    expect(handleFocusChange).toHaveBeenCalledWith({
      ...defaultFocusState,
      depth: 'ALL',
    });
  });
});
