import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from './App';

const validData = {
  schemaVersion: '1.0',
  analyzerVersion: '2.0.0',
  generatedAt: '2025-01-01T00:00:00Z',
  sourceDirectory: 'force-app',
  summary: {
    nodeCount: 1,
    edgeCount: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 1,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: {
      files: 1,
      apexClasses: 1,
      apexTriggers: 0,
      lwcJs: 0,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 0,
      fields: 0,
    },
  },
  nodes: [
    {
      id: 'ApexClass:Foo',
      displayName: 'Foo',
      type: 'ApexClass',
      file: 'force-app/Foo.cls',
      metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        sharing: 'with sharing',
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED',
      },
    },
  ],
  edges: [],
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {},
};

describe('App composed shell', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders loading screen initially', () => {
    vi.mocked(fetch).mockReturnValueOnce(new Promise(() => {})); // Never resolves
    render(<App />);
    expect(screen.getByText('Loading Architecture Graph…')).toBeInTheDocument();
  });

  it('renders error screen when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Fetch Failed'));
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Explorer')).toBeInTheDocument();
    });
  });

  it('renders shell layout with slots when data loads successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => validData,
    } as Response);

    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Dependency Explorer')).toBeInTheDocument();
    });

    expect(container.querySelector('[data-slot="graph"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="sidebar"]')).toBeInTheDocument();
  });
});
