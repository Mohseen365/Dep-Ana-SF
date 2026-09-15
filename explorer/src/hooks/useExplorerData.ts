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

      const isDefaultUrl = resolvedUrl === '/explorer-data.json';

      try {
        const res = await fetch(resolvedUrl, { signal: controller.signal });

        if (!res.ok) {
          if (!isDefaultUrl) {
            throw new Error(`NOT_ANALYZED: Project analysis data not found (HTTP ${res.status})`);
          }
          throw new Error(`Failed to load explorer data: HTTP ${res.status}`);
        }

        const contentType =
          res.headers && typeof res.headers.get === 'function'
            ? res.headers.get('content-type') || ''
            : '';

        let text = '';
        if (typeof res.text === 'function') {
          text = await res.text();
        } else if (typeof res.json === 'function') {
          const jsonVal = await res.json();
          text = typeof jsonVal === 'string' ? jsonVal : JSON.stringify(jsonVal);
        }

        const trimmedText = text.trim();

        const isHtml =
          contentType.includes('text/html') ||
          trimmedText.startsWith('<') ||
          trimmedText.startsWith('<!DOCTYPE') ||
          trimmedText.startsWith('<!doctype');

        if (isHtml) {
          if (!isDefaultUrl) {
            throw new Error(`NOT_ANALYZED: Project analysis data not found (HTML SPA fallback)`);
          }
          throw new Error('Failed to load explorer data: Server returned HTML instead of JSON');
        }

        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch (parseErr) {
          throw new Error(
            `Failed to parse explorer data: ${parseErr instanceof Error ? parseErr.message : 'Invalid JSON'}`
          );
        }

        const parsed = parseExplorerData(json);
        if (isSubscribed) {
          setData(parsed);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;

        const errMessage = err instanceof Error ? err.message : String(err);
        const isNotAnalyzed = errMessage.startsWith('NOT_ANALYZED:');
        const isParseError = errMessage.includes('Failed to parse explorer data');

        if (retryCountRef.current < 1 && !isNotAnalyzed && !isParseError) {
          retryCountRef.current += 1;
          fetchData();
        } else {
          if (isSubscribed) {
            setData(null);
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
