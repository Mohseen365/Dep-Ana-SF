import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GraphControls } from './GraphControls';

describe('GraphControls Component', () => {
  it('renders standard graph controls organized in conceptual groups with aria-orientation', () => {
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

    // Toolbar role & T1-9 aria-orientation
    const toolbar = screen.getByRole('toolbar', { name: 'Graph controls' });
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');

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

  it('disables Center Selected button when no node is selected', () => {
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

    const btn = screen.getByLabelText('Center Selected');
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
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

  it('renders mode toggle control and triggers callback when clicked', () => {
    const onToggleLayoutMode = vi.fn();

    const { rerender } = render(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={false}
        layoutMode="interactive"
        onToggleLayoutMode={onToggleLayoutMode}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /switch to static layout/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggleBtn);
    expect(onToggleLayoutMode).toHaveBeenCalledTimes(1);

    // Rerender in static mode
    rerender(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={false}
        layoutMode="static"
        onToggleLayoutMode={onToggleLayoutMode}
      />
    );

    const staticToggleBtn = screen.getByRole('button', { name: /switch to interactive layout/i });
    expect(staticToggleBtn).toBeInTheDocument();
    expect(staticToggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(staticToggleBtn).toHaveClass('active');
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

  /* N19 — Roving tabIndex & Keyboard Navigation Tests */
  it('applies roving tabIndex (0 to initial active control, -1 to others)', () => {
    render(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={true}
      />
    );

    const zoomIn = screen.getByLabelText('Zoom In');
    const zoomOut = screen.getByLabelText('Zoom Out');
    const fitView = screen.getByLabelText('Fit View');
    const centerSelected = screen.getByLabelText('Center Selected');

    expect(zoomIn).toHaveAttribute('tabindex', '0');
    expect(zoomOut).toHaveAttribute('tabindex', '-1');
    expect(fitView).toHaveAttribute('tabindex', '-1');
    expect(centerSelected).toHaveAttribute('tabindex', '-1');
  });

  it('navigates with ArrowRight, ArrowLeft, Home, and End keys correctly', () => {
    render(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={true}
      />
    );

    const toolbar = screen.getByRole('toolbar');
    const zoomIn = screen.getByLabelText('Zoom In');
    const zoomOut = screen.getByLabelText('Zoom Out');
    const fitView = screen.getByLabelText('Fit View');
    const centerSelected = screen.getByLabelText('Center Selected');

    zoomIn.focus();
    expect(document.activeElement).toBe(zoomIn);

    // ArrowRight -> Zoom Out
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(zoomOut).toHaveAttribute('tabindex', '0');
    expect(zoomIn).toHaveAttribute('tabindex', '-1');

    // ArrowRight -> Fit View
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(fitView).toHaveAttribute('tabindex', '0');

    // ArrowLeft -> Zoom Out
    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' });
    expect(zoomOut).toHaveAttribute('tabindex', '0');

    // End -> Reset Layout (last control)
    const resetLayout = screen.getByLabelText('Reset Layout');
    fireEvent.keyDown(toolbar, { key: 'End' });
    expect(resetLayout).toHaveAttribute('tabindex', '0');

    // Home -> Zoom In (first control)
    fireEvent.keyDown(toolbar, { key: 'Home' });
    expect(zoomIn).toHaveAttribute('tabindex', '0');
  });

  /* N20 — Focus Containment Guard Tests */
  it('does not intercept arrow keys if document.activeElement is outside the toolbar', () => {
    render(
      <div>
        <button data-testid="outside-btn">Outside</button>
        <GraphControls
          onZoomIn={vi.fn()}
          onZoomOut={vi.fn()}
          onFitView={vi.fn()}
          onCenterSelected={vi.fn()}
          onResetLayout={vi.fn()}
          hasSelectedNode={true}
        />
      </div>
    );

    const outsideBtn = screen.getByTestId('outside-btn');
    const toolbar = screen.getByRole('toolbar');
    const zoomIn = screen.getByLabelText('Zoom In');

    outsideBtn.focus();
    expect(document.activeElement).toBe(outsideBtn);

    // Trigger keydown on toolbar while activeElement is outside
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });

    // Focus remains outside and zoomIn retains initial tabIndex 0
    expect(document.activeElement).toBe(outsideBtn);
    expect(zoomIn).toHaveAttribute('tabindex', '0');
  });

  it('allows native key navigation inside select elements without hijacking', () => {
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
        onFocusChange={vi.fn()}
      />
    );

    const directionSelect = screen.getByRole('combobox', { name: 'Direction' });

    directionSelect.focus();
    expect(document.activeElement).toBe(directionSelect);

    // ArrowDown inside select should not hijack focus to next control
    fireEvent.keyDown(directionSelect, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(directionSelect);
  });

  /* T1-9 — Orientation Prop Test */
  it('supports vertical orientation when orientation prop is provided', () => {
    render(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={true}
        orientation="vertical"
      />
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Graph controls' });
    expect(toolbar).toHaveAttribute('aria-orientation', 'vertical');
  });

  /* T1-8 — getComputedStyle Filter Test */
  it('excludes hidden or display:none elements from interactive focusable list', () => {
    const { container } = render(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={true}
      />
    );

    const zoomOutBtn = screen.getByLabelText('Zoom Out');
    // Simulate hidden styling
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
      if (el === zoomOutBtn) {
        return { display: 'none' } as CSSStyleDeclaration;
      }
      return { display: 'block' } as CSSStyleDeclaration;
    });

    const zoomInBtn = screen.getByLabelText('Zoom In');
    const fitViewBtn = screen.getByLabelText('Fit View');

    zoomInBtn.focus();
    const toolbar = screen.getByRole('toolbar');

    // ArrowRight should skip zoomOutBtn because display: 'none'
    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(fitViewBtn).toHaveAttribute('tabindex', '0');

    vi.restoreAllMocks();
  });
});
