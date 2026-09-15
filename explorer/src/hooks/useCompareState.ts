import { useState, useCallback, useEffect } from 'react';
import {
  diffSnapshots,
  buildDiffOverlayGraph,
  type DiffResult,
  type DiffOverlayGraph,
} from '../lib/diff-adapter';

export interface UseCompareStateReturn {
  isActive: boolean;
  beforeRaw: string;
  afterRaw: string;
  diffResult: DiffResult | null;
  overlayGraph: DiffOverlayGraph | null;
  focusedEntityId: string | null;
  error: string | null;
  setBeforeRaw: (val: string) => void;
  setAfterRaw: (val: string) => void;
  runCompare: () => boolean;
  focusEntity: (id: string | null) => void;
  exitCompare: () => void;
}

export function useCompareState(): UseCompareStateReturn {
  const [isActive, setIsActive] = useState(false);
  const [beforeRaw, setBeforeRaw] = useState('');
  const [afterRaw, setAfterRaw] = useState('');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [overlayGraph, setOverlayGraph] = useState<DiffOverlayGraph | null>(null);
  const [focusedEntityId, setFocusedEntityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCompare = useCallback(() => {
    setError(null);
    setDiffResult(null);
    setOverlayGraph(null);

    let beforeObj: any = null;
    let afterObj: any = null;

    try {
      beforeObj = JSON.parse(beforeRaw);
    } catch (e: any) {
      setError(`Malformed 'before' snapshot JSON: ${e?.message || 'Invalid JSON format'}`);
      return false;
    }

    try {
      afterObj = JSON.parse(afterRaw);
    } catch (e: any) {
      setError(`Malformed 'after' snapshot JSON: ${e?.message || 'Invalid JSON format'}`);
      return false;
    }

    try {
      const res = diffSnapshots(beforeObj, afterObj);
      const graph = buildDiffOverlayGraph(beforeObj, afterObj, res);

      setDiffResult(res);
      setOverlayGraph(graph);
      setIsActive(true);
      return true;
    } catch (e: any) {
      setError(`Snapshot comparison failed: ${e?.message || 'Unknown schema error'}`);
      return false;
    }
  }, [beforeRaw, afterRaw]);

  const focusEntity = useCallback((id: string | null) => {
    setFocusedEntityId(id);
  }, []);

  const exitCompare = useCallback(() => {
    setIsActive(false);
    setDiffResult(null);
    setOverlayGraph(null);
    setFocusedEntityId(null);
    setError(null);
  }, []);

  // Exit compare mode on project switch to enforce multi-project data isolation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleProjectChanged = () => {
      exitCompare();
      setBeforeRaw('');
      setAfterRaw('');
    };

    window.addEventListener('explorer:project-changed', handleProjectChanged);
    return () => {
      window.removeEventListener('explorer:project-changed', handleProjectChanged);
    };
  }, [exitCompare]);

  return {
    isActive,
    beforeRaw,
    afterRaw,
    diffResult,
    overlayGraph,
    focusedEntityId,
    error,
    setBeforeRaw,
    setAfterRaw,
    runCompare,
    focusEntity,
    exitCompare,
  };
}
