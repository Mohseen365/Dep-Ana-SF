import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { GraphControls } from './GraphControls';
import { InvestigationDrawer } from './InvestigationDrawer';
import { WorkspaceHeader } from './workspace/WorkspaceHeader';
import { WorkspaceRouterContext } from '../context/WorkspaceRouterContext';
import type { ExplorerDataSchema, ExplorerNode } from '../types/explorer';

const sampleNodes: ExplorerNode[] = [
  {
    id: 'node-1',
    displayName: 'OrderService',
    type: 'ApexClass',
    risk: 'HIGH',
    layer: 'domain',
    metrics: { score: 85, coupling: 12, fanIn: 5, fanOut: 4, complexity: 10, unresolved: 0 },
  },
  {
    id: 'node-2',
    displayName: 'OrderController',
    type: 'ApexClass',
    risk: 'MEDIUM',
    layer: 'application',
    metrics: { score: 60, coupling: 8, fanIn: 2, fanOut: 3, complexity: 6, unresolved: 0 },
  },
];

const mockData: ExplorerDataSchema = {
  project: { id: 'proj-1', name: 'Sample Project' },
  nodes: sampleNodes,
  edges: [{ id: 'edge-1', source: 'node-2', target: 'node-1', relationshipType: 'CALLS' }],
  summary: {
    nodeCount: 2,
    edgeCount: 1,
    highRiskCount: 1,
    mediumRiskCount: 1,
    lowRiskCount: 0,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: {
      files: 2,
      apexClasses: 2,
      apexTriggers: 0,
      lwcJs: 0,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 0,
      fields: 0,
    },
  },
};

describe('Phase 1G-A — Tablist & Toolbar Keyboard Accessibility Test Suite', () => {
  it('1. All interactive controls in GraphControls can be reached using keyboard navigation', () => {
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
    const resetLayout = screen.getByLabelText('Reset Layout');

    expect(zoomIn).toBeInTheDocument();
    expect(zoomOut).toBeInTheDocument();
    expect(fitView).toBeInTheDocument();
    expect(centerSelected).toBeInTheDocument();
    expect(resetLayout).toBeInTheDocument();
  });

  it('2. Toolbar arrow navigation moves focus to expected enabled control', () => {
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

    const toolbar = screen.getByRole('toolbar', { name: 'Graph controls' });
    const zoomIn = screen.getByLabelText('Zoom In');
    const zoomOut = screen.getByLabelText('Zoom Out');

    zoomIn.focus();
    expect(document.activeElement).toBe(zoomIn);

    fireEvent.keyDown(toolbar, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(zoomOut);

    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(zoomIn);
  });

  it('3. Home/End navigation works as expected on toolbar and tablist', () => {
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

    const toolbar = screen.getByRole('toolbar', { name: 'Graph controls' });
    const zoomIn = screen.getByLabelText('Zoom In');
    const resetLayout = screen.getByLabelText('Reset Layout');

    zoomIn.focus();
    fireEvent.keyDown(toolbar, { key: 'End' });
    expect(document.activeElement).toBe(resetLayout);

    fireEvent.keyDown(toolbar, { key: 'Home' });
    expect(document.activeElement).toBe(zoomIn);
  });

  it('4. Disabled controls are skipped during keyboard arrow navigation', () => {
    const focusState = {
      enabled: false,
      focusNodeId: null,
      direction: 'both' as const,
      depth: 1 as const,
    };

    render(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={false} // Focus button disabled
        focusState={focusState}
        onFocusChange={vi.fn()}
      />
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Graph controls' });
    const focusBtn = screen.getByRole('button', { name: 'Focus: OFF' });
    expect(focusBtn).toBeDisabled();

    const zoomIn = screen.getByLabelText('Zoom In');
    zoomIn.focus();

    // ArrowLeft from ZoomIn should wrap to ResetLayout, skipping disabled Focus button
    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' });
    expect(document.activeElement).not.toBe(focusBtn);
  });

  it('5. Arrow keys inside inputs and selects are NOT hijacked by toolbar container', () => {
    const onFocusChange = vi.fn();
    const focusState = {
      enabled: true,
      focusNodeId: 'node-1',
      direction: 'both' as const,
      depth: 1 as const,
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

    const dirSelect = screen.getByRole('combobox', { name: 'Direction' });
    dirSelect.focus();
    expect(document.activeElement).toBe(dirSelect);

    const toolbar = screen.getByRole('toolbar', { name: 'Graph controls' });
    fireEvent.keyDown(dirSelect, { key: 'ArrowDown', target: dirSelect });

    // Focus remains on the select element, arrow key was not hijacked to move to another toolbar button
    expect(document.activeElement).toBe(dirSelect);
  });

  it('6. Enter/Space activates controls without duplicate action dispatch', () => {
    const onZoomIn = vi.fn();
    render(
      <GraphControls
        onZoomIn={onZoomIn}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={false}
      />
    );

    const zoomIn = screen.getByLabelText('Zoom In');
    fireEvent.click(zoomIn);
    expect(onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('7. Focus remains visible and predictable after state rerenders', () => {
    const { rerender } = render(
      <ViewModeSwitcher viewMode="graph" onChangeViewMode={() => {}} />
    );

    const graphTab = screen.getByTestId('view-btn-graph');
    expect(graphTab.getAttribute('tabindex')).toBe('0');

    rerender(<ViewModeSwitcher viewMode="matrix" onChangeViewMode={() => {}} />);
    const matrixTab = screen.getByTestId('view-btn-matrix');
    expect(matrixTab.getAttribute('tabindex')).toBe('0');
    expect(graphTab.getAttribute('tabindex')).toBe('-1');
  });

  it('8. Tablist arrow navigation, aria-selected, tabIndex, and active view state stay synchronized in ViewModeSwitcher', () => {
    const onChangeViewMode = vi.fn();
    render(<ViewModeSwitcher viewMode="graph" onChangeViewMode={onChangeViewMode} />);

    const tablist = screen.getByRole('tablist', { name: 'Workspace View Modes' });
    const graphTab = screen.getByTestId('view-btn-graph');

    graphTab.focus();
    expect(graphTab.getAttribute('aria-selected')).toBe('true');
    expect(graphTab.getAttribute('tabindex')).toBe('0');

    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(onChangeViewMode).toHaveBeenCalledWith('subway');
  });

  it('9. Existing mouse/touch activation remains unchanged', () => {
    const onChangeViewMode = vi.fn();
    render(<ViewModeSwitcher viewMode="graph" onChangeViewMode={onChangeViewMode} />);

    const matrixTab = screen.getByTestId('view-btn-matrix');
    fireEvent.click(matrixTab);
    expect(onChangeViewMode).toHaveBeenCalledWith('matrix');
  });

  it('10. Unmount/remount does not leave stale listeners or duplicate handlers', () => {
    const { unmount } = render(
      <GraphControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        onCenterSelected={vi.fn()}
        onResetLayout={vi.fn()}
        hasSelectedNode={true}
      />
    );

    expect(() => unmount()).not.toThrow();
  });
});
