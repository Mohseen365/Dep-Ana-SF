import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GraphControls } from './GraphControls';

describe('GraphControls Component', () => {
  it('renders standard graph controls organized in conceptual groups', () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onFitView = vi.fn();
    const onCenterSelected = vi.fn();
    const onResetLayout = vi.fn();
    const onToggleFullscreen = vi.fn();
    const onToggleNavigator = vi.fn();

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
        isNavigatorVisible={true}
        onToggleNavigator={onToggleNavigator}
      />
    );

    // Toolbar role
    expect(screen.getByRole('toolbar', { name: 'Graph controls' })).toBeInTheDocument();

    // Group roles
    expect(screen.getByRole('group', { name: 'Navigation controls' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Layout controls' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Workspace controls' })).toBeInTheDocument();

    // Buttons
    expect(screen.getByLabelText('Zoom In')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom Out')).toBeInTheDocument();
    expect(screen.getByLabelText('Fit View')).toBeInTheDocument();
    expect(screen.getByLabelText('Center Selected')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset Layout')).toBeInTheDocument();
    expect(screen.getByLabelText('Hide Navigator Overlay')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximize Graph')).toBeInTheDocument();
  });

  it('triggers navigation and layout callbacks when buttons are clicked', () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onFitView = vi.fn();
    const onCenterSelected = vi.fn();
    const onResetLayout = vi.fn();

    render(
      <GraphControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFitView={onFitView}
        onCenterSelected={onCenterSelected}
        onResetLayout={onResetLayout}
        hasSelectedNode={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Zoom In'));
    expect(onZoomIn).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Zoom Out'));
    expect(onZoomOut).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Fit View'));
    expect(onFitView).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Center Selected'));
    expect(onCenterSelected).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Reset Layout'));
    expect(onResetLayout).toHaveBeenCalledTimes(1);
  });

  it('hides Center Selected button when no node is selected', () => {
    render(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={false}
      />
    );

    expect(screen.queryByLabelText('Center Selected')).not.toBeInTheDocument();
  });

  it('renders FocusControls in Analysis controls group when focusState and onFocusChange are provided', () => {
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

    expect(screen.getByRole('group', { name: 'Analysis controls' })).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Direction' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Depth' })).toBeInTheDocument();
  });

  it('displays correct label for Navigator button when hidden', () => {
    const onToggleNavigator = vi.fn();

    render(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={false}
        isNavigatorVisible={false}
        onToggleNavigator={onToggleNavigator}
      />
    );

    const navBtn = screen.getByLabelText('Show Navigator Overlay');
    expect(navBtn).toBeInTheDocument();
    fireEvent.click(navBtn);
    expect(onToggleNavigator).toHaveBeenCalledTimes(1);
  });

  it('displays correct label for Fullscreen button when in fullscreen mode', () => {
    const onToggleFullscreen = vi.fn();

    render(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={false}
        isFullscreen={true}
        onToggleFullscreen={onToggleFullscreen}
      />
    );

    const fullBtn = screen.getByLabelText('Exit Fullscreen');
    expect(fullBtn).toBeInTheDocument();
    fireEvent.click(fullBtn);
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
  });
});
