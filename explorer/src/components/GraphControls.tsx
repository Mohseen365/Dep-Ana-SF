import React from 'react';
import { ArchitectureLayoutMode, ARCH_MODE_META } from '../types/explorer';
import { FocusState } from '../lib/focus-graph';
import { FocusControls } from './FocusControls';

export interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onCenterSelected: () => void;
  onResetLayout: () => void;
  hasSelectedNode: boolean;
  selectedNodeId?: string | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isNavigatorVisible?: boolean;
  onToggleNavigator?: () => void;
  focusState?: FocusState;
  onFocusChange?: (focusState: FocusState) => void;
  layoutMode?: 'static' | 'interactive';
  onToggleLayoutMode?: () => void;
  architectureMode?: ArchitectureLayoutMode;
  onToggleArchitectureMode?: () => void;
  nodeCount?: number;
  isPathModeActive?: boolean;
  onTogglePathMode?: () => void;
  canGoBack?: boolean;
  onNavigateBack?: () => void;
  canGoForward?: boolean;
  onNavigateForward?: () => void;
  onExportPNG?: () => void;
  onShowShortcutsHelp?: () => void;
  orientation?: 'horizontal' | 'vertical';
}

export const GraphControls: React.FC<GraphControlsProps> = React.memo(function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitView,
  onCenterSelected,
  onResetLayout,
  hasSelectedNode,
  selectedNodeId,
  isFullscreen = false,
  onToggleFullscreen,
  isNavigatorVisible = true,
  onToggleNavigator,
  focusState,
  onFocusChange,
  layoutMode = 'interactive',
  onToggleLayoutMode,
  architectureMode = 'hierarchical',
  onToggleArchitectureMode,
  nodeCount,
  isPathModeActive = false,
  onTogglePathMode,
  canGoBack = false,
  onNavigateBack,
  canGoForward = false,
  onNavigateForward,
  onExportPNG,
  onShowShortcutsHelp,
  orientation = 'horizontal',
}) {
  const [activeControlIndex, setActiveControlIndex] = React.useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // [N18] Memoize focus state to prevent unnecessary component re-renders
  const memoizedFocusState = React.useMemo(() => {
    if (!focusState) return undefined;
    return {
      enabled: focusState.enabled,
      focusNodeId: focusState.focusNodeId,
      direction: focusState.direction,
      depth: focusState.depth,
    };
  }, [
    focusState?.enabled,
    focusState?.focusNodeId,
    focusState?.direction,
    focusState?.depth,
  ]);

  // [T1-8] getInteractiveElements filter using getComputedStyle (display, visibility, opacity)
  const getInteractiveElements = React.useCallback((container: HTMLElement): HTMLElement[] => {
    const selector =
      'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';
    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) => {
      if (el.getAttribute('aria-hidden') === 'true') return false;
      if (typeof window !== 'undefined' && window.getComputedStyle) {
        try {
          const computed = window.getComputedStyle(el);
          if (computed) {
            if (computed.display === 'none') return false;
            if (computed.visibility === 'hidden') return false;
            if (computed.opacity === '0') return false;
          }
        } catch {
          // Fallback if getComputedStyle fails in mock environment
        }
      }
      return true;
    });
  }, []);

  const updateTabIndexes = React.useCallback(() => {
    if (!containerRef.current) return;
    const controls = getInteractiveElements(containerRef.current);
    if (controls.length === 0) return;

    let validIndex = activeControlIndex;
    if (validIndex >= controls.length) {
      validIndex = 0;
      setActiveControlIndex(0);
    }

    controls.forEach((control, index) => {
      if (index === validIndex) {
        control.setAttribute('tabindex', '0');
      } else {
        control.setAttribute('tabindex', '-1');
      }
    });
  }, [activeControlIndex, getInteractiveElements]);

  React.useLayoutEffect(() => {
    updateTabIndexes();
  }, [
    updateTabIndexes,
    focusState,
    hasSelectedNode,
    isFullscreen,
    isNavigatorVisible,
    layoutMode,
    architectureMode,
    nodeCount,
  ]);

  const handleContainerFocus = React.useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) return;
      const controls = getInteractiveElements(containerRef.current);
      const target = e.target as HTMLElement;
      const index = controls.indexOf(target);
      if (index !== -1 && index !== activeControlIndex) {
        setActiveControlIndex(index);
      }
    },
    [activeControlIndex, getInteractiveElements]
  );

  const handleToolbarKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const key = e.key;

      const container = containerRef.current || e.currentTarget;

      // [N20] Focus containment guard: ensure both activeElement & target are within toolbar container
      const activeElement = document.activeElement as HTMLElement;
      if (!container.contains(activeElement) || !container.contains(e.target as Node)) {
        return;
      }

      // Protection for native controls (select, input, textarea, slider)
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const role = target.getAttribute('role');
      if (tagName === 'select' || tagName === 'input' || tagName === 'textarea' || role === 'slider') {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
          return; // Do not hijack arrow, home, or end keys when inside inputs, selects, or textareas
        }
      }

      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(key)) {
        return;
      }

      const controls = getInteractiveElements(container);
      if (controls.length === 0) return;

      let currentIndex = controls.indexOf(activeElement);
      if (currentIndex === -1) {
        currentIndex = activeControlIndex < controls.length ? activeControlIndex : 0;
      }

      let nextIndex = currentIndex;
      if (key === 'ArrowRight' || key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % controls.length;
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + controls.length) % controls.length;
      } else if (key === 'Home') {
        nextIndex = 0;
      } else if (key === 'End') {
        nextIndex = controls.length - 1;
      }

      e.preventDefault();
      setActiveControlIndex(nextIndex);

      controls.forEach((control, index) => {
        control.setAttribute('tabindex', index === nextIndex ? '0' : '-1');
      });

      const targetControl = controls[nextIndex];
      if (targetControl) {
        targetControl.focus();
      }
    },
    [activeControlIndex, getInteractiveElements]
  );

  return (
    <div
      ref={containerRef}
      className="graph-controls-floating"
      role="toolbar"
      aria-label="Graph controls"
      aria-orientation={orientation}
      onKeyDown={handleToolbarKeyDown}
      onFocus={handleContainerFocus}
    >
      {/* Analysis Section */}
      {memoizedFocusState && onFocusChange && (
        <div className="graph-control-group analysis-group" role="group" aria-label="Analysis controls">
          <FocusControls
            focusState={memoizedFocusState}
            onFocusChange={onFocusChange}
            hasSelectedNode={hasSelectedNode}
            selectedNodeId={selectedNodeId}
          />
          <div className="graph-control-divider" aria-hidden="true" />
        </div>
      )}

      {/* Navigation Section */}
      <div className="graph-control-group navigation-group" role="group" aria-label="Navigation controls">
        {(onNavigateBack || onNavigateForward) && (
          <>
            <button
              className="graph-control-btn"
              onClick={onNavigateBack}
              disabled={!canGoBack}
              title="Navigate Back (Alt+Left)"
              aria-label="Navigate Back"
              aria-keyshortcuts="Alt+ArrowLeft"
              type="button"
            >
              <span aria-hidden="true">⬅️</span>
            </button>
            <button
              className="graph-control-btn"
              onClick={onNavigateForward}
              disabled={!canGoForward}
              title="Navigate Forward (Alt+Right)"
              aria-label="Navigate Forward"
              aria-keyshortcuts="Alt+ArrowRight"
              type="button"
            >
              <span aria-hidden="true">➡️</span>
            </button>
          </>
        )}
        <button
          className="graph-control-btn"
          onClick={onZoomIn}
          title="Zoom In (+)"
          aria-label="Zoom In"
          aria-keyshortcuts="+"
          type="button"
        >
          <span aria-hidden="true">➕</span>
        </button>
        <button
          className="graph-control-btn"
          onClick={onZoomOut}
          title="Zoom Out (-)"
          aria-label="Zoom Out"
          aria-keyshortcuts="-"
          type="button"
        >
          <span aria-hidden="true">➖</span>
        </button>
        <button
          className="graph-control-btn"
          onClick={onFitView}
          title="Fit All to Screen"
          aria-label="Fit View"
          aria-keyshortcuts="f 0"
          type="button"
        >
          <span aria-hidden="true">⛶</span>
        </button>
        <button
          className="graph-control-btn"
          onClick={onCenterSelected}
          disabled={!hasSelectedNode}
          title={hasSelectedNode ? 'Center Selected Component' : 'Select a node first to center'}
          aria-label="Center Selected"
          type="button"
        >
          <span aria-hidden="true">🎯</span>
        </button>
        {onTogglePathMode && (
          <button
            className={`graph-control-btn ${isPathModeActive ? 'active' : ''}`}
            onClick={onTogglePathMode}
            title={isPathModeActive ? 'Cancel Path Finder' : 'Find Path Between Two Nodes'}
            aria-label={isPathModeActive ? 'Cancel Path Mode' : 'Find Shortest Path'}
            aria-pressed={isPathModeActive}
            type="button"
          >
            <span aria-hidden="true">🧭</span>
          </button>
        )}
      </div>

      <div className="graph-control-divider" aria-hidden="true" />

      {/* Layout Section */}
      <div className="graph-control-group layout-group" role="group" aria-label="Layout controls">
        {onToggleArchitectureMode && (
          <button
            className={`graph-control-btn ${architectureMode !== 'hierarchical' ? 'active' : ''}`}
            onClick={onToggleArchitectureMode}
            title={ARCH_MODE_META[architectureMode].description}
            aria-label={`Architecture layout: ${ARCH_MODE_META[architectureMode].label}. Activate to switch to ${ARCH_MODE_META[ARCH_MODE_META[architectureMode].next].label}.`}
            data-testid="architecture-mode-toggle"
            type="button"
          >
            <span aria-hidden="true">{ARCH_MODE_META[architectureMode].icon}</span>
            <span className="graph-control-btn-label" style={{ marginLeft: '4px' }}>{ARCH_MODE_META[architectureMode].label}</span>
          </button>
        )}
        {onToggleLayoutMode && (
          <button
            className={`graph-control-btn ${layoutMode === 'static' ? 'active' : ''}`}
            onClick={onToggleLayoutMode}
            title={layoutMode === 'static' ? 'Static Layout (Positions Locked)' : 'Interactive Layout'}
            aria-label={layoutMode === 'static' ? 'Switch to Interactive Layout' : 'Switch to Static Layout'}
            aria-pressed={layoutMode === 'static'}
            data-testid="layout-mode-toggle"
            type="button"
          >
            <span aria-hidden="true">{layoutMode === 'static' ? '📌' : '🔀'}</span>
          </button>
        )}
        <button
          className="graph-control-btn"
          onClick={onResetLayout}
          disabled={nodeCount === 0}
          title={nodeCount === 0 ? 'No components in graph to arrange' : 'Rearrange / Reset Layout'}
          aria-label="Reset Layout"
          type="button"
        >
          <span aria-hidden="true">🔄</span>
        </button>
      </div>

      {/* Workspace Section */}
      {(onToggleNavigator || onToggleFullscreen || onExportPNG || onShowShortcutsHelp) && (
        <>
          <div className="graph-control-divider" aria-hidden="true" />
          <div className="graph-control-group workspace-group" role="group" aria-label="Workspace controls">
            {onExportPNG && (
              <button
                className="graph-control-btn"
                onClick={onExportPNG}
                title="Export View as PNG"
                aria-label="Export View as PNG"
                type="button"
              >
                <span aria-hidden="true">📸</span>
              </button>
            )}
            {onShowShortcutsHelp && (
              <button
                className="graph-control-btn"
                onClick={onShowShortcutsHelp}
                title="Keyboard Shortcuts (?)"
                aria-label="Keyboard Shortcuts"
                aria-keyshortcuts="?"
                type="button"
              >
                <span aria-hidden="true">❓</span>
              </button>
            )}
            {onToggleNavigator && (
              <button
                className={`graph-control-btn ${isNavigatorVisible ? 'active' : ''}`}
                onClick={onToggleNavigator}
                title={isNavigatorVisible ? 'Hide Navigator Overlay' : 'Show Navigator Overlay'}
                aria-label={isNavigatorVisible ? 'Hide Navigator Overlay' : 'Show Navigator Overlay'}
                aria-pressed={isNavigatorVisible}
                type="button"
              >
                <span aria-hidden="true">🗺️</span>
              </button>
            )}
            {onToggleFullscreen && (
              <button
                className={`graph-control-btn ${isFullscreen ? 'active' : ''}`}
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Toggle Fullscreen'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Maximize Graph'}
                aria-keyshortcuts="Escape"
                aria-pressed={isFullscreen}
                type="button"
              >
                <span aria-hidden="true">{isFullscreen ? '⤢' : '⛶'}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default GraphControls;
