import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import App from '../App';
import { ProjectProvider } from '../context/ProjectContext';
import { ProjectStateProvider } from '../context/ProjectStateContext';
import cloudSpendData from '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json';

// Mock cytoscape and plugins
const { mockElementsRemove, mockCy, mockCytoscapeFn } = vi.hoisted(() => {
  const mockElementsRemove = vi.fn();
  const mockElementsCollection = {
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    unselect: vi.fn().mockReturnThis(),
    remove: mockElementsRemove
  };

  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
    pan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    center: vi.fn(),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    resize: vi.fn(),
    elements: vi.fn().mockReturnValue(mockElementsCollection),
    nodes: vi.fn().mockReturnValue([]),
    edges: vi.fn().mockReturnValue([]),
    add: vi.fn(),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    batch: vi.fn((fn: () => void) => fn()),
    on: vi.fn(),
    one: vi.fn(),
    animate: vi.fn(),
    fit: vi.fn(),
    getElementById: vi.fn().mockReturnValue({
      length: 0,
      isNode: () => false,
      isEdge: () => false,
      neighborhood: () => []
    }),
    destroy: vi.fn(),
    navigator: vi.fn().mockReturnValue({ destroy: vi.fn() })
  };

  const mockCytoscapeFn: any = vi.fn().mockReturnValue(mockCy);
  mockCytoscapeFn.use = vi.fn();

  return { mockElementsRemove, mockCy, mockCytoscapeFn };
});

vi.mock('cytoscape', () => {
  return { default: mockCytoscapeFn };
});

vi.mock('cytoscape-fcose', () => ({ default: vi.fn() }));
vi.mock('cytoscape-navigator', () => ({ default: vi.fn() }));

// Mock ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
window.matchMedia = window.matchMedia || vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock fetch to return cloud spend tracker data
global.fetch = vi.fn().mockImplementation(async (url) => {
  if (typeof url === 'string' && url.includes('project-manifest.json')) {
    return {
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        projects: [
          {
            id: 'default',
            name: 'Default Salesforce Project',
            description: 'Salesforce DX Architecture Analysis',
            sourcePath: 'force-app/main/default',
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
    json: async () => cloudSpendData,
    text: async () => JSON.stringify(cloudSpendData),
  } as Response;
});

function TestShell() {
  return (
    <ProjectProvider initialProjectId="default">
      <ProjectStateProvider>
        <App />
      </ProjectStateProvider>
    </ProjectProvider>
  );
}

describe('WAVE 11A UI & Runtime Integration Audit', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  test('Renders Graph Canvas Visibility panel with all 10 canonical node types', async () => {
    render(<TestShell />);

    // Wait for graph loading
    const visibilityHeader = await screen.findByText('Graph Canvas Visibility', {}, { timeout: 3000 });
    expect(visibilityHeader).toBeInTheDocument();

    // Check active counter (10/10)
    const counter = screen.getByTestId('graph-visibility-counter');
    expect(counter.textContent).toBe('10/10');

    // Check presence of checkboxes for all 10 types
    const nodeTypes = [
      'ApexClass',
      'ApexTrigger',
      'LWC',
      'Visualforce',
      'Flow',
      'Object',
      'CustomObject',
      'Field',
      'CustomField',
      'External',
    ];

    for (const type of nodeTypes) {
      const checkbox = screen.getByTestId(`node-type-checkbox-${type}`);
      expect(checkbox).toBeInTheDocument();
      const input = checkbox.querySelector('input');
      expect(input?.checked).toBe(true);
    }
  });

  test('Select All and Clear All buttons in Graph Canvas Visibility', async () => {
    render(<TestShell />);

    const clearAllBtn = await screen.findByTestId('clear-all-node-types-btn', {}, { timeout: 3000 });
    const selectAllBtn = screen.getByTestId('select-all-node-types-btn');

    // Click Clear All
    await act(async () => {
      fireEvent.click(clearAllBtn);
    });

    const counterAfterClear = screen.getByTestId('graph-visibility-counter');
    expect(counterAfterClear.textContent).toBe('0/10');

    // Status bar should show 0 / 240 visible nodes
    const visibleNodesStatus = screen.getByText('0 / 240');
    expect(visibleNodesStatus).toBeInTheDocument();

    // Click Select All
    await act(async () => {
      fireEvent.click(selectAllBtn);
    });

    const counterAfterSelectAll = screen.getByTestId('graph-visibility-counter');
    expect(counterAfterSelectAll.textContent).toBe('10/10');

    const restoredStatus = screen.getByText('240 / 240');
    expect(restoredStatus).toBeInTheDocument();
  });

  test('Selected node edge case: hiding type clears selection', async () => {
    render(<TestShell />);

    // Wait for sidebar header
    await screen.findByText('COMPONENTS', {}, { timeout: 3000 });

    const accountServiceEls = await screen.findAllByText('AccountService', {}, { timeout: 3000 });
    expect(accountServiceEls.length).toBeGreaterThan(0);

    // Select node
    await act(async () => {
      fireEvent.click(accountServiceEls[0]);
    });

    // Verify drawer opens
    const drawerSlot = screen.getByRole('heading', { name: 'AccountService' });
    expect(drawerSlot).toBeInTheDocument();

    // Uncheck ApexClass
    const apexCheckbox = screen.getByTestId('node-type-checkbox-ApexClass').querySelector('input')!;
    await act(async () => {
      fireEvent.click(apexCheckbox);
    });

    // Selected node should be cleared and drawer closed
    await waitFor(() => {
      expect(screen.queryByTestId('investigation-drawer')).not.toBeInTheDocument();
    });
  });
});
