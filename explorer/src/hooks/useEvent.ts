import { useRef, useLayoutEffect, useCallback } from 'react';

export function useEvent<F extends (...args: any[]) => any>(fn: F): F {
  const ref = useRef<F>(fn);

  useLayoutEffect(() => {
    ref.current = fn;
  });

  return useCallback((((...args: any[]) => ref.current(...args)) as F), []);
}

export default useEvent;
