import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExplorerData } from './useExplorerData';

const validData = {
  schemaVersion: '1.0',
  analyzerVersion: '2.0.0',
  generatedAt: '2025-01-01T00:00:00Z',
  sourceDirectory: 'force-app',
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
