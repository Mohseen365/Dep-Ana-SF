import React, { useCallback } from 'react';
import { FocusState, FocusDirection, FocusDepth } from '../lib/focus-graph';

interface FocusControlsProps {
  focusState: FocusState;
  onFocusChange: (focusState: FocusState) => void;
  hasSelectedNode: boolean;
  selectedNodeId?: string | null;
}

export const FocusControls: React.FC<FocusControlsProps> = ({
  focusState,
  onFocusChange,
  hasSelectedNode,
  selectedNodeId,
}) => {
  const handleToggleFocus = useCallback(() => {
    const targetNodeId = focusState.enabled
      ? null
      : selectedNodeId || focusState.focusNodeId || null;

    if (!targetNodeId && !focusState.enabled) return;

    onFocusChange({
      ...focusState,
      enabled: !focusState.enabled,
      focusNodeId: targetNodeId,
    });
  }, [focusState, onFocusChange, selectedNodeId]);

  const handleDirectionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFocusChange({
        ...focusState,
        direction: e.target.value as FocusDirection,
      });
    },
    [focusState, onFocusChange]
  );

  const handleDepthChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const depth = value === 'ALL' ? 'ALL' : (parseInt(value, 10) as FocusDepth);
      onFocusChange({
        ...focusState,
        depth,
      });
    },
    [focusState, onFocusChange]
  );

  const isDisabled = !hasSelectedNode && !focusState.focusNodeId;
  const isActive = focusState.enabled && (hasSelectedNode || !!focusState.focusNodeId);

  const buttonTitle = isDisabled
    ? 'Select a node to enable focus'
    : isActive
    ? 'Focus: ON (Click to disable focus)'
    : 'Focus: OFF (Click to focus on selected node)';

  return (
    <div className={`focus-controls ${isActive ? 'active' : ''}`} role="group" aria-label="Focus analysis controls">
      <div className="focus-toggle">
        <button
          className={`focus-btn ${isActive ? 'active' : ''}`}
          onClick={handleToggleFocus}
          disabled={isDisabled}
          title={buttonTitle}
          aria-label={isActive ? 'Focus: ON' : 'Focus: OFF'}
          aria-pressed={isActive}
          type="button"
        >
          <span className="focus-icon" aria-hidden="true">◎</span>
          <span>Focus</span>
          <span className={`focus-badge ${isActive ? 'active' : 'inactive'}`}>
            {isActive ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {isActive && (
        <div className="focus-options">
          <div className="focus-option">
            <label htmlFor="focus-direction-select">Direction</label>
            <select
              id="focus-direction-select"
              value={focusState.direction}
              onChange={handleDirectionChange}
              className="focus-select"
              aria-label="Direction"
            >
              <option value="both">↔ Both</option>
              <option value="dependencies">→ Dependencies</option>
              <option value="dependents">← Dependents</option>
            </select>
          </div>

          <div className="focus-option">
            <label htmlFor="focus-depth-select">Depth</label>
            <select
              id="focus-depth-select"
              value={focusState.depth === 'ALL' ? 'ALL' : String(focusState.depth)}
              onChange={handleDepthChange}
              className="focus-select"
              aria-label="Depth"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="ALL">ALL</option>
            </select>
          </div>
        </div>
      )}

      {isDisabled && (
        <span className="focus-hint" id="focus-disabled-hint">
          Select a node to enable focus
        </span>
      )}
    </div>
  );
};

export default FocusControls;
