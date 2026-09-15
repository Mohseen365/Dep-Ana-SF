import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExplorerData } from './useExplorerData';

const validData = {
  schemaVersion: '1.0.0',
  analyzerVersion: '13.0.0',
  generatedAt: '2025-01-01T00:00:00Z',
  sourceDirectory: 'force-app/main/default',
  summary: {
    nodeCount: 0,
    edgeCount: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: {
      files: 0,
      apexClasses: 0,
      apexTriggers: 0,
      lwcJs: 0,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 0,
      fields: 0,
    },
  },
  nodes: [],
  edges: [],
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {},
};

describe('useExplorerData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('Case A — default project loads normally from /explorer-data.json', async () => {
    const jsonSpy = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(validData),
      json: jsonSpy,
    } as unknown as Response);

    const { result } = renderHook(() => useExplorerData('/explorer-data.json'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(validData);
    expect(result.current.error).toBeNull();
  });

  it('Case B1 — newly created project with missing analysis (HTTP 404) does not fallback to default', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
      text: async () => '404 Not Found',
    } as Response);

    const { result } = renderHook(() => useExplorerData('test-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/projects/test-project/explorer-data.json', expect.any(Object));
    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toContain('NOT_ANALYZED');
  });

  it('Case B2 — newly created project with HTML SPA fallback does NOT parse HTML as JSON', async () => {
    const mockJson = vi.fn().mockImplementation(() => {
      throw new SyntaxError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON");
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: async () => '<!DOCTYPE html><html><body>SPA Index</body></html>',
      json: mockJson,
    } as unknown as Response);

    const { result } = renderHook(() => useExplorerData('test-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify mockJson (res.json) was NEVER called on HTML
    expect(mockJson).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toContain('NOT_ANALYZED');
  });

  it('Case C — real project analysis exists and loads correctly', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(validData),
    } as unknown as Response);

    const { result } = renderHook(() => useExplorerData('core-crm'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

      expect(fetch).toHaveBeenCalledWith('/projects/core-crm/explorer-data.json', expect.any(Object));
    expect(result.current.data).toEqual(validData);
    expect(result.current.error).toBeNull();
  });

  it('Case E — default project key resolves to /explorer-data.json not /projects/default/explorer-data.json', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(validData),
    } as unknown as Response);

    const { result } = renderHook(() => useExplorerData('default'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith('/explorer-data.json', expect.any(Object));
    expect(result.current.data).toEqual(validData);
    expect(result.current.error).toBeNull();
  });

  it('Case F — browser reload with custom project in URL parameter loads project-specific data', async () => {
    const mockProjectData = {
      ...validData,
      summary: {
        ...validData.summary,
        nodeCount: 9,
        edgeCount: 16,
      },
      project: {
        id: 'movie-app',
        name: 'movie-app',
        analysisStatus: 'COMPLETE',
        analysisPath: '/projects/movie-app/explorer-data.json',
      },
    };

    vi.spyOn(globalThis, 'localStorage', 'get').mockReturnValue({
      getItem: (key: string) => key === 'explorer.activeProjectId' ? 'movie-app' : null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    } as Storage);

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(mockProjectData),
    } as unknown as Response);

    const { result } = renderHook(() => useExplorerData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith('/projects/movie-app/explorer-data.json', expect.any(Object));
    expect(result.current.data?.summary.nodeCount).toBe(9);
    expect(result.current.data?.summary.edgeCount).toBe(16);
  });

  it('Case G — project switch to different project loads correct project-specific data', async () => {
    const projectAData = { ...validData, summary: { ...validData.summary, nodeCount: 5, edgeCount: 10 } };
    const projectBData = { ...validData, summary: { ...validData.summary, nodeCount: 3, edgeCount: 7 } };

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify(projectAData),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify(projectBData),
      } as unknown as Response);

    const { result, rerender } = renderHook(
      ({ projectId }) => useExplorerData(projectId),
      { initialProps: { projectId: 'proj-a' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith('/projects/proj-a/explorer-data.json', expect.any(Object));
    expect(result.current.data?.summary.nodeCount).toBe(5);

    rerender({ projectId: 'proj-b' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith('/projects/proj-b/explorer-data.json', expect.any(Object));
    expect(result.current.data?.summary.nodeCount).toBe(3);
  });

  it('Case H — project with empty but valid JSON loads correctly (edge case)', async () => {
    const emptyData = {
      ...validData,
      nodes: [],
      edges: [],
      summary: { ...validData.summary, nodeCount: 0, edgeCount: 0 },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(emptyData),
    } as unknown as Response);

    const { result } = renderHook(() => useExplorerData('empty-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(emptyData);
    expect(result.current.error).toBeNull();
  });

  it('Case I — HTTP 403 for project analysis returns NOT_ANALYZED (not default fallback)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: new Headers(),
      text: async () => '403 Forbidden',
    } as Response);

    const { result } = renderHook(() => useExplorerData('forbidden-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toContain('NOT_ANALYZED');
  });

  it('Case D — malformed JSON produces a controlled error state without uncaught exception', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => '{ malformed json string',
    } as unknown as Response);

    const { result } = renderHook(() => useExplorerData('/explorer-data.json'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain('Failed to parse explorer data');
  });

  it('retries once on network failure before setting error', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockRejectedValueOnce(new Error('Persistent Error'));

    const { result } = renderHook(() => useExplorerData('/test-url.json'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current.error?.message).toBe('Persistent Error');
  });

  it('retries successfully on second attempt', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Transient Error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => validData,
      } as Response);

    const { result } = renderHook(() => useExplorerData('/test-url.json'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual(validData);
    expect(result.current.error).toBeNull();
  });
});
