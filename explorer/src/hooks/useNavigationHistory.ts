import { useState, useCallback, useRef } from 'react';

export interface NavigationHistoryReturn<T> {
  current: T | null;
  push: (value: T) => void;
  back: () => T | null;
  forward: () => T | null;
  canGoBack: boolean;
  canGoForward: boolean;
  stack: T[];
  index: number;
}

export function useNavigationHistory<T>(maxSize = 50): NavigationHistoryReturn<T> {
  const [stack, setStack] = useState<T[]>([]);
  const [index, setIndex] = useState<number>(-1);

  const indexRef = useRef<number>(-1);
  indexRef.current = index;

  const stackRef = useRef<T[]>([]);
  stackRef.current = stack;

  const push = useCallback(
    (value: T) => {
      if (value === null || value === undefined) return;
      const currentStack = stackRef.current;
      const currentIndex = indexRef.current;

      const currentItem = currentIndex >= 0 && currentIndex < currentStack.length ? currentStack[currentIndex] : null;
      if (currentItem === value) return; // Deduplicate consecutive identical items

      const truncated = currentStack.slice(0, currentIndex + 1);
      const next = [...truncated, value];
      if (next.length > maxSize) {
        next.shift();
      }
      const nextIdx = next.length - 1;
      indexRef.current = nextIdx;
      stackRef.current = next;
      setStack(next);
      setIndex(nextIdx);
    },
    [maxSize]
  );

  const back = useCallback((): T | null => {
    const currentStack = stackRef.current;
    const currentIndex = indexRef.current;
    if (currentIndex > 0) {
      const nextIdx = currentIndex - 1;
      indexRef.current = nextIdx;
      setIndex(nextIdx);
      return currentStack[nextIdx] ?? null;
    }
    return null;
  }, []);

  const forward = useCallback((): T | null => {
    const currentStack = stackRef.current;
    const currentIndex = indexRef.current;
    if (currentIndex < currentStack.length - 1) {
      const nextIdx = currentIndex + 1;
      indexRef.current = nextIdx;
      setIndex(nextIdx);
      return currentStack[nextIdx] ?? null;
    }
    return null;
  }, []);

  return {
    current: index >= 0 && index < stack.length ? stack[index] : null,
    push,
    back,
    forward,
    canGoBack: index > 0,
    canGoForward: index < stack.length - 1,
    stack,
    index,
  };
}

export default useNavigationHistory;
