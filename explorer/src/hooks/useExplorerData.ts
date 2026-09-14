import { useState, useEffect, useCallback, useRef } from 'react';
import type { ExplorerDataSchema } from '../types/explorer';
import { parseExplorerData } from '../lib/schema';

function resolveDataUrl(projectIdOrUrl?: string): string {
  if (!projectIdOrUrl) {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlProject = urlParams.get('project');
        if (urlProject && urlProject !== 'default') {
          return `/projects/${urlProject}/explorer-data.json`;
        }
        const savedProject = localStorage.getItem('explorer.activeProjectId');
        if (savedProject && savedProject !== 'default') {
          return `/projects/${savedProject}/explorer-data.json`;
        }
      } catch (_) {
        // Ignore
      }
    }
    return '/explorer-data.json';
  }

  if (
    projectIdOrUrl.startsWith('/') ||
    projectIdOrUrl.startsWith('http') ||
    projectIdOrUrl.endsWith('.json')
  ) {
    return projectIdOrUrl;
  }

  if (projectIdOrUrl === 'default') {
    return '/explorer-data.json';
  }

  return `/projects/${projectIdOrUrl}/explorer-data.json`;
}

export function useExplorerData(projectIdOrUrl?: string): {
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

  const resolvedUrl = resolveDataUrl(projectIdOrUrl);

  const retry = useCallback(() => {
    retryCountRef.current = 0;
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const handleProjectChange = () => {
      retryCountRef.current = 0;
      setRetryTrigger((prev) => prev + 1);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('explorer:project-changed', handleProjectChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('explorer:project-changed', handleProjectChange);
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isSubscribed = true;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(resolvedUrl, { signal: controller.signal });
        if (!res.ok) {
          // Fallback to default /explorer-data.json if project-specific file 404s
          if (res.status === 404 && resolvedUrl !== '/explorer-data.json') {
            const fallbackRes = await fetch('/explorer-data.json', { signal: controller.signal });
            if (fallbackRes.ok) {
              const fallbackJson = await fallbackRes.json();
              const parsedFallback = parseExplorerData(fallbackJson);
              if (isSubscribed) {
                setData(parsedFallback);
                setLoading(false);
              }
              return;
            }
          }
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
  }, [resolvedUrl, retryTrigger]);

  return { data, loading, error, retry };
}
