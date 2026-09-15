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

  it('renders Focus button disabled when no node selected and no focusNodeId', () => {
    const handleFocusChange = vi.fn();
    render(
      <FocusControls
        focusState={{ enabled: false, focusNodeId: null, direction: 'both', depth: 2 }}
        onFocusChange={handleFocusChange}
        hasSelectedNode={false}
      />
    );

    const focusBtn = screen.getByRole('button', { name: /Focus: OFF/i });
    expect(focusBtn).toBeDisabled();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByText('OFF')).toBeInTheDocument();
    expect(screen.getByText('Select a node to enable focus')).toBeInTheDocument();
  });

  it('renders Focus OFF when enabled is false but a node is selected', () => {
    const handleFocusChange = vi.fn();
    render(
      <FocusControls
        focusState={{ enabled: false, focusNodeId: null, direction: 'both', depth: 2 }}
        onFocusChange={handleFocusChange}
        hasSelectedNode={true}
        selectedNodeId="ApexClass:Service"
      />
    );

    const focusBtn = screen.getByRole('button', { name: /Focus: OFF/i });
    expect(focusBtn).not.toBeDisabled();
    expect(screen.getByText('OFF')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Direction' })).not.toBeInTheDocument();
  });

  it('renders Focus ON with direction and depth options when focus is active', () => {
    const handleFocusChange = vi.fn();
    render(
      <FocusControls
        focusState={defaultFocusState}
        onFocusChange={handleFocusChange}
        hasSelectedNode={true}
      />
    );

    const focusBtn = screen.getByRole('button', { name: /Focus: ON/i });
    expect(focusBtn).not.toBeDisabled();
    expect(screen.getByText('ON')).toBeInTheDocument();

    const dirSelect = screen.getByRole('combobox', { name: 'Direction' }) as HTMLSelectElement;
    expect(dirSelect).toBeInTheDocument();
    expect(dirSelect.value).toBe('both');

    const depthSelect = screen.getByRole('combobox', { name: 'Depth' }) as HTMLSelectElement;
    expect(depthSelect).toBeInTheDocument();
    expect(depthSelect.value).toBe('2');
  });

  it('calls onFocusChange with updated direction on direction selection for Both, Dependencies, Dependents', () => {
    const handleFocusChange = vi.fn();
    render(
      <FocusControls
        focusState={defaultFocusState}
        onFocusChange={handleFocusChange}
        hasSelectedNode={true}
      />
    );

    const dirSelect = screen.getByRole('combobox', { name: 'Direction' });

    // Both
    fireEvent.change(dirSelect, { target: { value: 'both' } });
    expect(handleFocusChange).toHaveBeenCalledWith({
      ...defaultFocusState,
      direction: 'both',
    });

    // Dependencies
    fireEvent.change(dirSelect, { target: { value: 'dependencies' } });
    expect(handleFocusChange).toHaveBeenCalledWith({
      ...defaultFocusState,
      direction: 'dependencies',
    });

    // Dependents
    fireEvent.change(dirSelect, { target: { value: 'dependents' } });
    expect(handleFocusChange).toHaveBeenCalledWith({
      ...defaultFocusState,
      direction: 'dependents',
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

    fireEvent.change(depthSelect, { target: { value: '2' } });
    expect(handleFocusChange).toHaveBeenCalledWith({
      ...defaultFocusState,
      depth: 2,
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

  it('toggles focus on when clicking Focus button when focus is OFF', () => {
    const handleFocusChange = vi.fn();
    render(
      <FocusControls
        focusState={{ enabled: false, focusNodeId: null, direction: 'both', depth: 2 }}
        onFocusChange={handleFocusChange}
        hasSelectedNode={true}
        selectedNodeId="ApexClass:Service"
      />
    );

    const focusBtn = screen.getByRole('button', { name: /Focus: OFF/i });
    expect(focusBtn).not.toBeDisabled();

    fireEvent.click(focusBtn);

    expect(handleFocusChange).toHaveBeenCalledWith({
      enabled: true,
      focusNodeId: 'ApexClass:Service',
      direction: 'both',
      depth: 2,
    });
  });

  it('toggles focus off when clicking Focus button when focus is ON', () => {
    const handleFocusChange = vi.fn();
    render(
      <FocusControls
        focusState={{ enabled: true, focusNodeId: 'ApexClass:Service', direction: 'both', depth: 2 }}
        onFocusChange={handleFocusChange}
        hasSelectedNode={true}
        selectedNodeId="ApexClass:Service"
      />
    );

    const focusBtn = screen.getByRole('button', { name: /Focus: ON/i });
    expect(focusBtn).not.toBeDisabled();

    fireEvent.click(focusBtn);

    expect(handleFocusChange).toHaveBeenCalledWith({
      enabled: false,
      focusNodeId: 'ApexClass:Service',
      direction: 'both',
      depth: 2,
    });
  });
});
