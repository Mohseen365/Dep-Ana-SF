import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { ProjectProvider } from '../context/ProjectContext';
import { ProjectStateProvider } from '../context/ProjectStateContext';
import { loadProjectState } from '../lib/projectState';

// Mock cytoscape for DOM layout tests
vi.mock('cytoscape', () => {
  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
    center: vi.fn(),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    resize: vi.fn(),
    elements: vi.fn().mockReturnValue({
      removeClass: vi.fn().mockReturnThis(),
      addClass: vi.fn().mockReturnThis(),
      unselect: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
    }),
    add: vi.fn(),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
    batch: vi.fn((fn: () => void) => fn()),
    on: vi.fn(),
    animate: vi.fn(),
    fit: vi.fn(),
    getElementById: vi.fn().mockReturnValue({
      length: 0,
      isNode: () => false,
      isEdge: () => false,
      neighborhood: () => [],
    }),
    destroy: vi.fn(),
    navigator: vi.fn().mockReturnValue({ destroy: vi.fn() }),
  };

  const cytoscapeFn: any = vi.fn().mockImplementation(() => mockCy);
  cytoscapeFn.use = vi.fn();
  return { default: cytoscapeFn };
});

vi.mock('cytoscape-fcose', () => ({ default: vi.fn() }));
vi.mock('cytoscape-navigator', () => ({ default: vi.fn() }));

const MOCK_PROJECT_DATA = {
  project: {
    id: 'default',
    name: 'Default Salesforce Project',
    sourcePath: 'force-app/main/default',
    analysisStatus: 'ANALYZED',
  },
  summary: {
    nodeCount: 3,
    edgeCount: 2,
    cycleCount: 0,
    unresolvedCount: 0,
  },
  nodes: [
    {
      id: 'Apex1',
      name: 'Apex1',
      displayName: 'Apex1',
      type: 'ApexClass',
      risk: 'LOW',
      layer: 'Business Logic',
      metrics: { fanIn: 1, fanOut: 1, coupling: 0, unresolved: 0, score: 0 },
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
    {
      id: 'LWC1',
      name: 'LWC1',
      displayName: 'LWC1',
      type: 'LightningComponent',
      risk: 'MEDIUM',
      layer: 'Presentation',
      metrics: { fanIn: 0, fanOut: 1, coupling: 0, unresolved: 0, score: 0 },
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
    {
      id: 'Obj1',
      name: 'Obj1',
      displayName: 'Obj1',
      type: 'CustomObject',
      risk: 'LOW',
      layer: 'Data Model',
      metrics: { fanIn: 1, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
  ],
  edges: [
    { id: 'e1', source: 'LWC1', target: 'Apex1', type: 'DEPENDS_ON' },
    { id: 'e2', source: 'Apex1', target: 'Obj1', type: 'DEPENDS_ON' },
  ],
  cycles: [],
  unresolvedReferences: [],
};

vi.mock('../hooks/useExplorerData', () => ({
  useExplorerData: () => ({
    data: MOCK_PROJECT_DATA,
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

describe('Layout Mode Toggle & Regression Acceptance Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('toggles layout mode from interactive to static and back, updating UI badge, button, application state, and LocalStorage', async () => {
    render(
      <ProjectProvider>
        <ProjectStateProvider projectId="default">
          <App />
        </ProjectStateProvider>
      </ProjectProvider>
    );

    // Initial state check
    const modeIndicator = screen.getByTestId('graph-mode-indicator');
    expect(modeIndicator).toHaveTextContent(/🔀 Interactive Mode/i);

    const toggleBtn = screen.getByTestId('layout-mode-toggle');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(toggleBtn).toHaveTextContent('🔀');

    let state = loadProjectState('default');
    expect(state.graphLayout.mode).toBe('interactive');

    // First click: Interactive -> Static
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByTestId('graph-mode-indicator')).toHaveTextContent(/📌 Static Mode — Node positions preserved/i);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(toggleBtn).toHaveTextContent('📌');

    state = loadProjectState('default');
    expect(state.graphLayout.mode).toBe('static');

    // Second click: Static -> Interactive
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByTestId('graph-mode-indicator')).toHaveTextContent(/🔀 Interactive Mode/i);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(toggleBtn).toHaveTextContent('🔀');

    state = loadProjectState('default');
    expect(state.graphLayout.mode).toBe('interactive');

    // Third click: Interactive -> Static
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByTestId('graph-mode-indicator')).toHaveTextContent(/📌 Static Mode — Node positions preserved/i);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');

    state = loadProjectState('default');
    expect(state.graphLayout.mode).toBe('static');
  });
});
