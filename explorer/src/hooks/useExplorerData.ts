import { useState, useEffect, useCallback, useRef } from 'react';
import type { ExplorerDataSchema } from '../types/explorer';
import { parseExplorerData } from '../lib/schema';

export function useExplorerData(url: string = '/explorer-data.json'): {
  data: ExplorerDataSchema | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
} {
  const [data, setData] = useState<ExplorerDataSchema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const retryCountRef = useRef<number>(0);

  const retry = useCallback(() => {
    retryCountRef.current = 0;
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isSubscribed = true;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Failed to load explorer data: HTTP ${res.status}`);
        }
        const json = await res.json();
        const parsed = parseExplorerData(json);
        if (isSubscribed) {
          setData(parsed);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;

        if (retryCountRef.current < 1) {
          retryCountRef.current += 1;
          fetchData();
        } else {
          if (isSubscribed) {
            setError(err instanceof Error ? err : new Error(String(err)));
            setLoading(false);
          }
        }
      }
    }

    fetchData();

    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [url, retryTrigger]);

  return { data, loading, error, retry };
}
