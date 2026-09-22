import React from 'react';
import { ArchitectureLayoutMode } from '../types/explorer';
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
}

export const GraphControls: React.FC<GraphControlsProps> = ({
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
}) => {
  return (
    <div className="graph-controls-floating" role="toolbar" aria-label="Graph controls">
      {/* Analysis Section */}
      {focusState && onFocusChange && (
        <div className="graph-control-group analysis-group" role="group" aria-label="Analysis controls">
          <FocusControls
            focusState={focusState}
            onFocusChange={onFocusChange}
            hasSelectedNode={hasSelectedNode}
            selectedNodeId={selectedNodeId}
          />
          <div className="graph-control-divider" aria-hidden="true" />
        </div>
      )}

      {/* Navigation Section */}
      <div className="graph-control-group navigation-group" role="group" aria-label="Navigation controls">
        <button
          className="graph-control-btn"
          onClick={onZoomIn}
          title="Zoom In (+)"
          aria-label="Zoom In"
          type="button"
        >
          ➕
        </button>
        <button
          className="graph-control-btn"
          onClick={onZoomOut}
          title="Zoom Out (-)"
          aria-label="Zoom Out"
          type="button"
        >
          ➖
        </button>
        <button
          className="graph-control-btn"
          onClick={onFitView}
          title="Fit All to Screen"
          aria-label="Fit View"
          type="button"
        >
          ⛶
        </button>
        {hasSelectedNode && (
          <button
            className="graph-control-btn"
            onClick={onCenterSelected}
            title="Center Selected Component"
            aria-label="Center Selected"
            type="button"
          >
            🎯
          </button>
        )}
      </div>

      <div className="graph-control-divider" aria-hidden="true" />

      {/* Layout Section */}
      <div className="graph-control-group layout-group" role="group" aria-label="Layout controls">
        {onToggleArchitectureMode && (
          <button
            className={`graph-control-btn ${architectureMode === 'hybrid' ? 'active' : ''}`}
            onClick={onToggleArchitectureMode}
            title={architectureMode === 'hybrid' ? 'Hybrid Layout (Clustered Feature Regions)' : 'Hierarchical Layout (Layered Flow)'}
            aria-label={architectureMode === 'hybrid' ? 'Switch to Hierarchical Layout' : 'Switch to Hybrid Layout'}
            aria-pressed={architectureMode === 'hybrid'}
            data-testid="architecture-mode-toggle"
            type="button"
          >
            {architectureMode === 'hybrid' ? '🧩' : '🏢'}
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
            {layoutMode === 'static' ? '📌' : '🔀'}
          </button>
        )}
        <button
          className="graph-control-btn"
          onClick={onResetLayout}
          title="Rearrange / Reset Layout"
          aria-label="Reset Layout"
          type="button"
        >
          🔄
        </button>
      </div>

      {/* Workspace Section */}
      {(onToggleNavigator || onToggleFullscreen) && (
        <>
          <div className="graph-control-divider" aria-hidden="true" />
          <div className="graph-control-group workspace-group" role="group" aria-label="Workspace controls">
            {onToggleNavigator && (
              <button
                className={`graph-control-btn ${isNavigatorVisible ? 'active' : ''}`}
                onClick={onToggleNavigator}
                title={isNavigatorVisible ? 'Hide Navigator Overlay' : 'Show Navigator Overlay'}
                aria-label={isNavigatorVisible ? 'Hide Navigator Overlay' : 'Show Navigator Overlay'}
                aria-pressed={isNavigatorVisible}
                type="button"
              >
                🗺️
              </button>
            )}
            {onToggleFullscreen && (
              <button
                className={`graph-control-btn ${isFullscreen ? 'active' : ''}`}
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Toggle Fullscreen'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Maximize Graph'}
                aria-pressed={isFullscreen}
                type="button"
              >
                {isFullscreen ? '⤢' : '⛶'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GraphControls;
