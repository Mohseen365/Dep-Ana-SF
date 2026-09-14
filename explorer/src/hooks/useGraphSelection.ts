import { useState, useCallback } from 'react';

export function useGraphSelection(): {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  history: string[];
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  clear: () => void;
  clearHistory: () => void;
} {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    if (id !== null) {
      setSelectedEdgeId(null);
      setHistory((prev) => {
        if (prev.length > 0 && prev[prev.length - 1] === id) {
          return prev;
        }
        const next = [...prev, id];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });
    }
  }, []);

  const selectEdge = useCallback((id: string | null) => {
    setSelectedEdgeId(id);
    if (id !== null) {
      setSelectedNodeId(null);
    }
  }, []);

  const clear = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    selectedNodeId,
    selectedEdgeId,
    history,
    selectNode,
    selectEdge,
    clear,
    clearHistory,
  };
}
