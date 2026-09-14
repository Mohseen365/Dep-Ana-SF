import React from 'react';

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onCenterSelected: () => void;
  onResetLayout: () => void;
  hasSelectedNode: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isNavigatorVisible?: boolean;
  onToggleNavigator?: () => void;
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onCenterSelected,
  onResetLayout,
  hasSelectedNode,
  isFullscreen = false,
  onToggleFullscreen,
  isNavigatorVisible = true,
  onToggleNavigator
}) => {
  return (
    <div className="graph-controls-floating" role="toolbar" aria-label="Graph controls">
      <button
        className="graph-control-btn"
        onClick={onZoomIn}
        title="Zoom In (+)"
        aria-label="Zoom In"
      >
        ➕
      </button>
      <button
        className="graph-control-btn"
        onClick={onZoomOut}
        title="Zoom Out (-)"
        aria-label="Zoom Out"
      >
        ➖
      </button>
      <div className="graph-control-divider" />
      <button
        className="graph-control-btn"
        onClick={onFitView}
        title="Fit All to Screen"
        aria-label="Fit View"
      >
        ⛶
      </button>
      {hasSelectedNode && (
        <button
          className="graph-control-btn"
          onClick={onCenterSelected}
          title="Center Selected Component"
          aria-label="Center Selected"
        >
          🎯
        </button>
      )}
      <button
        className="graph-control-btn"
        onClick={onResetLayout}
        title="Rearrange / Reset Layout"
        aria-label="Reset Layout"
      >
        🔄
      </button>
      {onToggleNavigator && (
        <button
          className={`graph-control-btn ${isNavigatorVisible ? 'active' : ''}`}
          onClick={onToggleNavigator}
          title={isNavigatorVisible ? "Hide Navigator Overlay" : "Show Navigator Overlay"}
          aria-label={isNavigatorVisible ? "Hide Navigator Overlay" : "Show Navigator Overlay"}
          type="button"
        >
          🗺️
        </button>
      )}
      {onToggleFullscreen && (
        <button
          className="graph-control-btn"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen (Esc)" : "Toggle Fullscreen"}
          aria-label={isFullscreen ? "Exit Fullscreen" : "Maximize Graph"}
        >
          {isFullscreen ? '⤢' : '⛶'}
        </button>
      )}
    </div>
  );
};

export default GraphControls;