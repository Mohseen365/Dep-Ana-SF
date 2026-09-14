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

  it('fetches and parses data successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => validData,
    } as Response);

    const { result } = renderHook(() => useExplorerData('/test-url.json'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(validData);
    expect(result.current.error).toBeNull();
  });

  it('fetches project-specific dataset when given a project ID', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => validData,
    } as Response);

    const { result } = renderHook(() => useExplorerData('core-crm'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith('/projects/core-crm/explorer-data.json', expect.any(Object));
  });

  it('falls back to default /explorer-data.json if project dataset returns 404', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => validData,
      } as Response);

    const { result } = renderHook(() => useExplorerData('missing-proj'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith('/projects/missing-proj/explorer-data.json', expect.any(Object));
    expect(fetch).toHaveBeenCalledWith('/explorer-data.json', expect.any(Object));
    expect(result.current.data).toEqual(validData);
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
