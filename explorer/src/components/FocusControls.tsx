import React, { useCallback } from 'react';
import { FocusState, FocusDirection, FocusDepth } from '../lib/focus-graph';

interface FocusControlsProps {
  focusState: FocusState;
  onFocusChange: (focusState: FocusState) => void;
  hasSelectedNode: boolean;
}

export const FocusControls: React.FC<FocusControlsProps> = ({
  focusState,
  onFocusChange,
  hasSelectedNode
}) => {
  const handleToggleFocus = useCallback(() => {
    if (!focusState.focusNodeId) return;
    
    onFocusChange({
      ...focusState,
      enabled: !focusState.enabled
    });
  }, [focusState, onFocusChange]);

  const handleDirectionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFocusChange({
      ...focusState,
      direction: e.target.value as FocusDirection
    });
  }, [focusState, onFocusChange]);

  const handleDepthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const depth = value === 'ALL' ? 'ALL' : (parseInt(value, 10) as FocusDepth);
    onFocusChange({
      ...focusState,
      depth
    });
  }, [focusState, onFocusChange]);

  const isDisabled = !hasSelectedNode;
  const isActive = focusState.enabled && hasSelectedNode;

  return (
    <div className={`focus-controls ${isActive ? 'active' : ''}`}>
      <div className="focus-toggle">
        <button 
          className={`focus-btn ${isActive ? 'active' : ''}`}
          onClick={handleToggleFocus}
          disabled={isDisabled}
          title={hasSelectedNode ? 'Focus on selected node' : 'Select a node to focus'}
        >
          <span className="focus-icon">◎</span>
          Focus
        </button>
      </div>

      {isActive && (
        <div className="focus-options">
          <div className="focus-option">
            <label>Direction</label>
            <select 
              value={focusState.direction} 
              onChange={handleDirectionChange}
              className="focus-select"
            >
              <option value="both">↔ Both</option>
              <option value="dependencies">→ Dependencies</option>
              <option value="dependents">← Dependents</option>
            </select>
          </div>

          <div className="focus-option">
            <label>Depth</label>
            <select 
              value={focusState.depth === 'ALL' ? 'ALL' : String(focusState.depth)} 
              onChange={handleDepthChange}
              className="focus-select"
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
        <span className="focus-hint">Select a node to enable focus</span>
      )}
    </div>
  );
};

export default FocusControls;