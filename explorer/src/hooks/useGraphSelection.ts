import { useState, useCallback } from 'react';
import { useInvestigation } from '../context/InvestigationContext';

function useInvestigationSafe() {
  try {
    return useInvestigation();
  } catch (_) {
    return null;
  }
}

export function useGraphSelection(): {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  history: string[];
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  clear: () => void;
  clearHistory: () => void;
} {
  const investigation = useInvestigationSafe();

  const [localNodeId, setLocalNodeId] = useState<string | null>(null);
  const [localEdgeId, setLocalEdgeId] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<string[]>([]);

  const selectNodeFallback = useCallback((id: string | null) => {
    setLocalNodeId(id);
    if (id !== null) {
      setLocalEdgeId(null);
      setLocalHistory((prev) => {
        if (prev.length > 0 && prev[prev.length - 1] === id) {
          return prev;
        }
        const next = [...prev, id];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });
    }
  }, []);

  const selectEdgeFallback = useCallback((id: string | null) => {
    setLocalEdgeId(id);
    if (id !== null) {
      setLocalNodeId(null);
    }
  }, []);

  const clearFallback = useCallback(() => {
    setLocalNodeId(null);
    setLocalEdgeId(null);
  }, []);

  const clearHistoryFallback = useCallback(() => {
    setLocalHistory([]);
  }, []);

  if (investigation) {
    return {
      selectedNodeId: investigation.state.selectedNodeId,
      selectedEdgeId: investigation.state.selectedEdgeId,
      history: investigation.state.selectionHistory,
      selectNode: investigation.selectNode,
      selectEdge: investigation.selectEdge,
      clear: investigation.clearSelection,
      clearHistory: () => {},
    };
  }

  return {
    selectedNodeId: localNodeId,
    selectedEdgeId: localEdgeId,
    history: localHistory,
    selectNode: selectNodeFallback,
    selectEdge: selectEdgeFallback,
    clear: clearFallback,
    clearHistory: clearHistoryFallback,
  };
}
