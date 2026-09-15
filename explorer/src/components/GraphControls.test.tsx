import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphControls } from './GraphControls';

describe('GraphControls Component', () => {
  it('renders standard graph controls and toggle fullscreen button', () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onFitView = vi.fn();
    const onCenterSelected = vi.fn();
    const onResetLayout = vi.fn();
    const onToggleFullscreen = vi.fn();

    render(
      <GraphControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFitView={onFitView}
        onCenterSelected={onCenterSelected}
        onResetLayout={onResetLayout}
        hasSelectedNode={true}
        isFullscreen={false}
        onToggleFullscreen={onToggleFullscreen}
      />
    );

    expect(screen.getByLabelText('Zoom In')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom Out')).toBeInTheDocument();
    expect(screen.getByLabelText('Fit View')).toBeInTheDocument();
    expect(screen.getByLabelText('Center Selected')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset Layout')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximize Graph')).toBeInTheDocument();
  });

  it('renders FocusControls when focusState and onFocusChange are provided', () => {
    const onFocusChange = vi.fn();
    const focusState = {
      enabled: true,
      focusNodeId: 'A',
      direction: 'both' as const,
      depth: 2 as const,
    };

    render(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={true}
        focusState={focusState}
        onFocusChange={onFocusChange}
      />
    );

    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Direction' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Depth' })).toBeInTheDocument();
  });
});
