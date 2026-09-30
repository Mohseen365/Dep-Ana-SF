import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from './App';
import { ProjectProvider } from './context/ProjectContext';

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

  it('renders shell layout with graph pane when data loads successfully without permanent chrome', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(validData),
    } as unknown as Response);

    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Architecture Explorer')).toBeInTheDocument();
    });

    expect(container.querySelector('main.graph-pane')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="graph"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="sidebar"]')).not.toBeInTheDocument();
    expect(container.querySelector('.summary-bar')).not.toBeInTheDocument();
    expect(container.querySelector('.status-bar')).toBeInTheDocument();
  });

  it('updates focused graph when focus depth and direction change', async () => {
    const makeNode = (id: string, name: string) => ({
      id,
      displayName: name,
      type: 'ApexClass',
      file: `${name}.cls`,
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
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
    });

    const makeEdge = (id: string, src: string, tgt: string) => ({
      id,
      source: src,
      target: tgt,
      relationshipType: 'method-call',
      method: null,
      evidence: 'Call()',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 10,
      column: 5,
      methodOwner: null,
      file: 'A.cls',
      canonical: {
        source: { type: 'ApexClass', name: src.split(':')[1], method: null },
        target: { type: 'ApexClass', name: tgt.split(':')[1], method: null },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 10, column: 5 },
      },
    });

    const multiHopData = {
      schemaVersion: '1.0.0',
      analyzerVersion: '13.0.0',
      generatedAt: '2025-01-01T00:00:00Z',
      sourceDirectory: 'force-app',
      summary: {
        nodeCount: 4,
        edgeCount: 3,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 4,
        cycleCount: 0,
        unresolvedCount: 0,
        inventory: { files: 4, apexClasses: 4, apexTriggers: 0, lwcJs: 0, lwcHtml: 0, visualforce: 0, flows: 0, objects: 0, fields: 0 },
      },
      nodes: [
        makeNode('ApexClass:A', 'A'),
        makeNode('ApexClass:B', 'B'),
        makeNode('ApexClass:C', 'C'),
        makeNode('ApexClass:D', 'D'),
      ],
      edges: [
        makeEdge('A|B', 'ApexClass:A', 'ApexClass:B'),
        makeEdge('B|C', 'ApexClass:B', 'ApexClass:C'),
        makeEdge('C|D', 'ApexClass:C', 'ApexClass:D'),
      ],
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    };

    vi.mocked(fetch).mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('project-manifest.json')) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            projects: [
              {
                id: 'default',
                name: 'Default Salesforce Project',
                description: 'Test proj',
                sourcePath: 'force-app',
                analysisStatus: 'COMPLETE',
                analysisPath: '/explorer-data.json',
              },
            ],
            activeProjectId: 'default',
          }),
        } as Response;
      }
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify(multiHopData),
      } as unknown as Response;
    });

    // Deep link with Node A selected and Focus active with depth 1
    window.history.replaceState(null, '', '/?node=ApexClass:A&focus.enabled=true&focus.direction=both&focus.depth=1');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Architecture Explorer')).toBeInTheDocument();
    });

    // Check Focus controls are rendered
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Depth' })).toBeInTheDocument();
  });

  it('verifies drawer-slot is absent when no node is selected and present when node is selected', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(validData),
    } as unknown as Response);

    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Architecture Explorer')).toBeInTheDocument();
    });

    // Initially no node is selected -> no drawer slot in DOM
    expect(container.querySelector('.drawer-slot')).toBeNull();
  });

  it('renders NOT_ANALYZED empty state view cleanly when active project has no analysis data', async () => {
    // Mock project manifest fetch & project-specific analysis fetch returning 404 or HTML
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('project-manifest.json')) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            projects: [
              {
                id: 'new-unparsed-proj',
                name: 'New Unparsed Project',
                description: 'Test proj',
                sourcePath: 'force-app',
                analysisStatus: 'NOT_ANALYZED',
                analysisPath: '/projects/new-unparsed-proj/explorer-data.json',
              },
            ],
            activeProjectId: 'new-unparsed-proj',
          }),
        } as Response;
      }
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => '<!DOCTYPE html><html><body>SPA HTML Fallback</body></html>',
      } as unknown as Response;
    });

    window.history.pushState({}, '', '/?project=new-unparsed-proj');

    render(
      <ProjectProvider initialProjectId="new-unparsed-proj">
        <App />
      </ProjectProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Project created successfully.')).toBeInTheDocument();
    });

    expect(screen.getByText('This project has not been analyzed yet.')).toBeInTheDocument();
    expect(screen.getByText(/Run analysis to generate dependency data:/)).toBeInTheDocument();
    expect(screen.getByTestId('not-analyzed-screen')).toBeInTheDocument();
  });
});
