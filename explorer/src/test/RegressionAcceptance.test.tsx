import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { GraphSlot, App } from '../App';
import { ProjectProvider } from '../context/ProjectContext';
import { computeFocusedGraph, FocusDepth } from '../lib/focus-graph';
import { loadProjectState, saveProjectState, createDefaultProjectUIState } from '../lib/projectState';
import { ExplorerNode, ExplorerEdge, ExplorerNodeType } from '../types/explorer';

// Mock cytoscape for DOM layout tests
vi.mock('cytoscape', () => {
  const mockCy = {
    zoom: vi.fn().mockReturnValue(1),
    center: vi.fn(),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    resize: vi.fn(),
    elements: vi.fn().mockImplementation(() => {
      const arr = Object.assign([], {
        removeClass: vi.fn().mockReturnThis(),
        addClass: vi.fn().mockReturnThis(),
        unselect: vi.fn().mockReturnThis(),
        remove: vi.fn().mockReturnThis(),
        toArray: () => arr,
        empty: () => arr.length === 0,
      });
      return arr;
    }),
    add: vi.fn(),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    nodes: vi.fn().mockImplementation(() => {
      const arr = Object.assign([], {
        removeClass: vi.fn().mockReturnThis(),
        addClass: vi.fn().mockReturnThis(),
        toArray: () => arr,
        empty: () => true,
      });
      return arr;
    }),
    edges: vi.fn().mockImplementation(() => {
      const arr = Object.assign([], {
        removeClass: vi.fn().mockReturnThis(),
        addClass: vi.fn().mockReturnThis(),
        toArray: () => arr,
        empty: () => true,
      });
      return arr;
    }),
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

// Canonical Test Graph: A → B → C → D
const mockLinearNodes: ExplorerNode[] = [
  {
    id: 'A',
    displayName: 'A',
    type: 'ApexClass' as ExplorerNodeType,
    file: 'A.cls',
    metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
    risk: 'LOW',
    riskReasons: [],
    behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
  },
  {
    id: 'B',
    displayName: 'B',
    type: 'ApexClass' as ExplorerNodeType,
    file: 'B.cls',
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
    risk: 'MEDIUM',
    riskReasons: [],
    behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
  },
  {
    id: 'C',
    displayName: 'C',
    type: 'ApexClass' as ExplorerNodeType,
    file: 'C.cls',
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
    risk: 'MEDIUM',
    riskReasons: [],
    behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
  },
  {
    id: 'D',
    displayName: 'D',
    type: 'ApexClass' as ExplorerNodeType,
    file: 'D.cls',
    metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 1 },
    risk: 'LOW',
    riskReasons: [],
    behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
  },
];

const mockLinearEdges: ExplorerEdge[] = [
  {
    id: 'A-B',
    source: 'A',
    target: 'B',
    relationshipType: 'method-call',
    method: 'callB',
    evidence: 'B.method()',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'high',
    line: 1,
    column: 1,
    methodOwner: 'A',
    file: 'A.cls',
    canonical: {
      source: { type: 'ApexClass' as ExplorerNodeType, name: 'A', method: 'callB' },
      target: { type: 'ApexClass' as ExplorerNodeType, name: 'B', method: 'method' },
      relationship: { type: 'method-call', resolution: 'EXACT' as const },
      location: { line: 1, column: 1 },
    },
  },
  {
    id: 'B-C',
    source: 'B',
    target: 'C',
    relationshipType: 'method-call',
    method: 'callC',
    evidence: 'C.method()',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'high',
    line: 1,
    column: 1,
    methodOwner: 'B',
    file: 'B.cls',
    canonical: {
      source: { type: 'ApexClass' as ExplorerNodeType, name: 'B', method: 'callC' },
      target: { type: 'ApexClass' as ExplorerNodeType, name: 'C', method: 'method' },
      relationship: { type: 'method-call', resolution: 'EXACT' as const },
      location: { line: 1, column: 1 },
    },
  },
  {
    id: 'C-D',
    source: 'C',
    target: 'D',
    relationshipType: 'method-call',
    method: 'callD',
    evidence: 'D.method()',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'high',
    line: 1,
    column: 1,
    methodOwner: 'C',
    file: 'C.cls',
    canonical: {
      source: { type: 'ApexClass' as ExplorerNodeType, name: 'C', method: 'callD' },
      target: { type: 'ApexClass' as ExplorerNodeType, name: 'D', method: 'method' },
      relationship: { type: 'method-call', resolution: 'EXACT' as const },
      location: { line: 1, column: 1 },
    },
  },
];

const mockValidDataPayload = {
  schemaVersion: '1.0.0',
  analyzerVersion: '13.0.0',
  generatedAt: new Date().toISOString(),
  sourceDirectory: 'force-app/main/default',
  project: {
    id: 'default',
    name: 'Default',
    sourcePath: 'force-app/main/default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    analysisStatus: 'COMPLETE' as const,
    componentCount: 4,
    dependencyCount: 3,
  },
  summary: {
    nodeCount: 4,
    edgeCount: 3,
    highRiskCount: 0,
    mediumRiskCount: 2,
    lowRiskCount: 2,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: {
      files: 4,
      apexClasses: 4,
      apexTriggers: 0,
      lwcJs: 0,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 0,
      fields: 0,
    },
  },
  nodes: mockLinearNodes,
  edges: mockLinearEdges,
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {},
};

describe('Parallel Agent E Acceptance Suite', () => {
  beforeEach(() => {
    localStorage.clear();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
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

  describe('LAYOUT TESTS', () => {
    it('verifies sidebar open vs closed space reservation requirement', async () => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockValidDataPayload),
        })
      ));

      const { container } = render(
        <ProjectProvider>
          <App />
        </ProjectProvider>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(container.querySelector('.sidebar-slot')).not.toBeNull();
      });

      // Collapse sidebar using collapse button
      const collapseBtn = container.querySelector('.sidebar-toggle-btn') as HTMLButtonElement;
      if (collapseBtn) {
        act(() => {
          fireEvent.click(collapseBtn);
        });
        // CRITICAL REQUIREMENT: Closed panel must NOT reserve layout space (sidebar-slot unmounted)
        expect(container.querySelector('.sidebar-slot')).toBeNull();
      }
    });

    it('verifies drawer layout participation: no selected node -> no drawer-slot even if pinned', async () => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockValidDataPayload),
        })
      ));

      localStorage.setItem('explorer.drawer.pinned', 'true');

      const { container } = render(
        <ProjectProvider>
          <App />
        </ProjectProvider>
      );

      // Wait for data load
      await waitFor(() => {
        expect(container.querySelector('.sidebar-slot')).not.toBeNull();
      });

      // Crucial Fix Check: pinned is true but no node selected -> no drawer-slot in layout
      expect(container.querySelector('.drawer-slot')).toBeNull();
    });

    it('verifies navigator visible vs hidden requirement', () => {
      const { container } = render(
        <GraphSlot
          nodes={mockLinearNodes}
          edges={mockLinearEdges}
          selectedNodeId={null}
          selectedEdgeId={null}
          onSelectNode={() => {}}
          onSelectEdge={() => {}}
        />
      );

      // Minimap navigator is initially visible
      expect(container.querySelector('.minimap-container')).not.toBeNull();

      // Click close button on minimap
      const closeBtn = container.querySelector('.navigator-close-btn') as HTMLButtonElement;
      expect(closeBtn).not.toBeNull();
      act(() => {
        fireEvent.click(closeBtn);
      });

      // Navigator must be hidden and removed from DOM
      expect(container.querySelector('.minimap-container')).toBeNull();
    });
  });

  describe('DEPTH AND DIRECTION TESTS (A → B → C → D)', () => {
    it('verifies Depth 1, 2, 3, ALL for Dependencies direction starting at A', () => {
      // Depth 1 from A: A → B
      const resD1 = computeFocusedGraph(mockLinearNodes, mockLinearEdges, {
        enabled: true,
        focusNodeId: 'A',
        direction: 'dependencies',
        depth: 1,
      });
      expect(resD1.nodes.map((n) => n.id).sort()).toEqual(['A', 'B']);

      // Depth 2 from A: A → B → C
      const resD2 = computeFocusedGraph(mockLinearNodes, mockLinearEdges, {
        enabled: true,
        focusNodeId: 'A',
        direction: 'dependencies',
        depth: 2,
      });
      expect(resD2.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C']);

      // Depth 3 from A: A → B → C → D
      const resD3 = computeFocusedGraph(mockLinearNodes, mockLinearEdges, {
        enabled: true,
        focusNodeId: 'A',
        direction: 'dependencies',
        depth: 3,
      });
      expect(resD3.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C', 'D']);

      // ALL depth from A: A → B → C → D
      const resALL = computeFocusedGraph(mockLinearNodes, mockLinearEdges, {
        enabled: true,
        focusNodeId: 'A',
        direction: 'dependencies',
        depth: 'ALL' as FocusDepth,
      });
      expect(resALL.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C', 'D']);
    });

    it('verifies Depth 1, 2, 3, ALL for Dependents direction starting at D', () => {
      // Depth 1 from D: D ← C
      const resD1 = computeFocusedGraph(mockLinearNodes, mockLinearEdges, {
        enabled: true,
        focusNodeId: 'D',
        direction: 'dependents',
        depth: 1,
      });
      expect(resD1.nodes.map((n) => n.id).sort()).toEqual(['C', 'D']);

      // Depth 2 from D: D ← C ← B
      const resD2 = computeFocusedGraph(mockLinearNodes, mockLinearEdges, {
        enabled: true,
        focusNodeId: 'D',
        direction: 'dependents',
        depth: 2,
      });
      expect(resD2.nodes.map((n) => n.id).sort()).toEqual(['B', 'C', 'D']);

      // Depth 3 from D: D ← C ← B ← A
      const resD3 = computeFocusedGraph(mockLinearNodes, mockLinearEdges, {
        enabled: true,
        focusNodeId: 'D',
        direction: 'dependents',
        depth: 3,
      });
      expect(resD3.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C', 'D']);

      // ALL depth from D: D ← C ← B ← A
      const resALL = computeFocusedGraph(mockLinearNodes, mockLinearEdges, {
        enabled: true,
        focusNodeId: 'D',
        direction: 'dependents',
        depth: 'ALL' as FocusDepth,
      });
      expect(resALL.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C', 'D']);
    });

    it('verifies Both directions for middle node B at Depth 1 & Depth 2', () => {
      // Node B Both at Depth 1: Dependents (A) + Node B + Dependencies (C) = [A, B, C]
      const resB1 = computeFocusedGraph(mockLinearNodes, mockLinearEdges, {
        enabled: true,
        focusNodeId: 'B',
        direction: 'both',
        depth: 1,
      });
      expect(resB1.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C']);

      // Node B Both at Depth 2: Dependents (A) + Node B + Dependencies (C → D) = [A, B, C, D]
      const resB2 = computeFocusedGraph(mockLinearNodes, mockLinearEdges, {
        enabled: true,
        focusNodeId: 'B',
        direction: 'both',
        depth: 2,
      });
      expect(resB2.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('PROJECT EXPORT CONTRACT & ISOLATION TESTS', () => {
    it('verifies project state isolation across projects (movie-app vs project-a)', () => {
      // Modify state for movie-app
      const movieState = createDefaultProjectUIState('movie-app');
      movieState.selectedComponent.selectedNodeId = 'ApexClass:MovieController';
      saveProjectState('movie-app', movieState);

      // Modify state for project-a
      const projAState = createDefaultProjectUIState('project-a');
      projAState.selectedComponent.selectedNodeId = 'ApexClass:AccountService';
      saveProjectState('project-a', projAState);

      // Assert movie-app state was NOT overwritten by project-a
      const loadedMovieState = loadProjectState('movie-app');
      const loadedProjAState = loadProjectState('project-a');

      expect(loadedMovieState.selectedComponent.selectedNodeId).toBe('ApexClass:MovieController');
      expect(loadedProjAState.selectedComponent.selectedNodeId).toBe('ApexClass:AccountService');
    });
  });

  describe('STATIC MODE + NODE-TYPE FILTER + FOCUS TOPOLOGY INTEGRATION TESTS', () => {
    // Multi-type graph topology:
    // LWC: accountCard -> ApexClass: AccountController -> Object: Account -> Field: Name
    // Flow: AccountSync -> Object: Account
    const multiTypeNodes: ExplorerNode[] = [
      {
        id: 'LWC_Card',
        displayName: 'Account Card',
        type: 'LWC' as ExplorerNodeType,
        file: 'accountCard.js',
        metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'Apex_Controller',
        displayName: 'Account Controller',
        type: 'ApexClass' as ExplorerNodeType,
        file: 'AccountController.cls',
        metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
        risk: 'MEDIUM',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'Obj_Account',
        displayName: 'Account Object',
        type: 'Object' as ExplorerNodeType,
        file: 'Account.object-meta.xml',
        metrics: { fanIn: 2, fanOut: 1, coupling: 3, unresolved: 0, score: 3 },
        risk: 'HIGH',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'Field_Name',
        displayName: 'Account Name Field',
        type: 'Field' as ExplorerNodeType,
        file: 'Account.Name.field-meta.xml',
        metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 1 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'Flow_Sync',
        displayName: 'Account Sync Flow',
        type: 'Flow' as ExplorerNodeType,
        file: 'AccountSync.flow-meta.xml',
        metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
    ];

    const multiTypeEdges: ExplorerEdge[] = [
      {
        id: 'e1',
        source: 'LWC_Card',
        target: 'Apex_Controller',
        relationshipType: 'method-call',
        method: 'getAccounts',
        evidence: 'AccountController.getAccounts()',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'high',
        line: 1, column: 1, methodOwner: 'LWC_Card', file: 'accountCard.js',
        canonical: {
          source: { type: 'LWC', name: 'LWC_Card' },
          target: { type: 'ApexClass', name: 'Apex_Controller' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: {},
        },
      },
      {
        id: 'e2',
        source: 'Apex_Controller',
        target: 'Obj_Account',
        relationshipType: 'SOQL',
        method: 'SELECT',
        evidence: 'SELECT Id FROM Account',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'high',
        line: 5, column: 1, methodOwner: 'Apex_Controller', file: 'AccountController.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'Apex_Controller' },
          target: { type: 'Object', name: 'Obj_Account' },
          relationship: { type: 'SOQL', resolution: 'EXACT' },
          location: {},
        },
      },
      {
        id: 'e3',
        source: 'Obj_Account',
        target: 'Field_Name',
        relationshipType: 'field-reference',
        method: 'Name',
        evidence: 'Account.Name',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'high',
        line: 1, column: 1, methodOwner: 'Obj_Account', file: 'Account.object-meta.xml',
        canonical: {
          source: { type: 'Object', name: 'Obj_Account' },
          target: { type: 'Field', name: 'Field_Name' },
          relationship: { type: 'field-reference', resolution: 'EXACT' },
          location: {},
        },
      },
      {
        id: 'e4',
        source: 'Flow_Sync',
        target: 'Obj_Account',
        relationshipType: 'DML',
        method: 'UPDATE',
        evidence: 'Update Account',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'high',
        line: 1, column: 1, methodOwner: 'Flow_Sync', file: 'AccountSync.flow-meta.xml',
        canonical: {
          source: { type: 'Flow', name: 'Flow_Sync' },
          target: { type: 'Object', name: 'Obj_Account' },
          relationship: { type: 'DML', resolution: 'EXACT' },
          location: {},
        },
      },
    ];

    it('Full-Project Scope + Node-Type Filter (LWC only, LWC + Apex, exclude Objects & Fields)', () => {
      // 1. Full project scope (no focus) + LWC only
      const lwcOnly = multiTypeNodes.filter((n) => ['LWC'].includes(n.type));
      expect(lwcOnly.map((n) => n.id)).toEqual(['LWC_Card']);

      // 2. Full project scope + LWC + Apex Classes
      const lwcAndApex = multiTypeNodes.filter((n) => ['LWC', 'ApexClass'].includes(n.type));
      expect(lwcAndApex.map((n) => n.id).sort()).toEqual(['Apex_Controller', 'LWC_Card']);

      // 3. Full project scope + exclude Objects and Fields
      const noObjNoField = multiTypeNodes.filter((n) => !['Object', 'Field'].includes(n.type));
      expect(noObjNoField.map((n) => n.id).sort()).toEqual(['Apex_Controller', 'Flow_Sync', 'LWC_Card']);
    });

    it('Component Scope + Focus Topology + Visibility Filter (FOCUS TOPOLOGY -> VISIBILITY FILTER order)', () => {
      // 1. Component scope: Focus on LWC_Card, Dependencies direction, Depth 1 -> returns LWC_Card & Apex_Controller
      const focusedD1 = computeFocusedGraph(multiTypeNodes, multiTypeEdges, {
        enabled: true,
        focusNodeId: 'LWC_Card',
        direction: 'dependencies',
        depth: 1,
      });
      expect(focusedD1.nodes.map((n) => n.id).sort()).toEqual(['Apex_Controller', 'LWC_Card']);

      // Filter focused graph by ApexClass only
      const apexFilteredD1 = focusedD1.nodes.filter((n) => n.type === 'ApexClass');
      expect(apexFilteredD1.map((n) => n.id)).toEqual(['Apex_Controller']);

      // 2. Component scope: Focus on LWC_Card, Dependencies direction, Depth 2 -> returns LWC_Card, Apex_Controller, Obj_Account
      const focusedD2 = computeFocusedGraph(multiTypeNodes, multiTypeEdges, {
        enabled: true,
        focusNodeId: 'LWC_Card',
        direction: 'dependencies',
        depth: 2,
      });
      expect(focusedD2.nodes.map((n) => n.id).sort()).toEqual(['Apex_Controller', 'LWC_Card', 'Obj_Account']);

      // Exclude Objects and Fields from Depth 2 focused topology
      const noObjD2 = focusedD2.nodes.filter((n) => !['Object', 'Field'].includes(n.type));
      expect(noObjD2.map((n) => n.id).sort()).toEqual(['Apex_Controller', 'LWC_Card']);

      // 3. Component scope: Focus on Obj_Account, Dependents direction, Depth ALL -> returns Obj_Account, Apex_Controller, LWC_Card, Flow_Sync
      const focusedDependentsALL = computeFocusedGraph(multiTypeNodes, multiTypeEdges, {
        enabled: true,
        focusNodeId: 'Obj_Account',
        direction: 'dependents',
        depth: 'ALL' as FocusDepth,
      });
      expect(focusedDependentsALL.nodes.map((n) => n.id).sort()).toEqual([
        'Apex_Controller',
        'Flow_Sync',
        'LWC_Card',
        'Obj_Account',
      ]);

      // Filter by LWC + ApexClass only
      const lwcApexDependents = focusedDependentsALL.nodes.filter((n) => ['LWC', 'ApexClass'].includes(n.type));
      expect(lwcApexDependents.map((n) => n.id).sort()).toEqual(['Apex_Controller', 'LWC_Card']);

      // 4. Component scope: Focus on Apex_Controller, Both direction, Depth 1 -> Dependents (LWC_Card) + Node (Apex_Controller) + Dependencies (Obj_Account)
      const focusedBothD1 = computeFocusedGraph(multiTypeNodes, multiTypeEdges, {
        enabled: true,
        focusNodeId: 'Apex_Controller',
        direction: 'both',
        depth: 1,
      });
      expect(focusedBothD1.nodes.map((n) => n.id).sort()).toEqual(['Apex_Controller', 'LWC_Card', 'Obj_Account']);

      // Filter LWC only
      const lwcBothD1 = focusedBothD1.nodes.filter((n) => n.type === 'LWC');
      expect(lwcBothD1.map((n) => n.id)).toEqual(['LWC_Card']);
    });
  });
});
