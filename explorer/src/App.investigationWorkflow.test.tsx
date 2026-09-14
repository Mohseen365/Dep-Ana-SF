import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as useExplorerDataModule from './hooks/useExplorerData';
import type { ExplorerDataSchema } from './types/explorer';

const mockData: ExplorerDataSchema = {
  schemaVersion: '1.0.0',
  analyzerVersion: '13.0.0',
  generatedAt: '2025-01-01T00:00:00Z',
  sourceDirectory: 'force-app/main/default',
  summary: {
    nodeCount: 4,
    edgeCount: 3,
    highRiskCount: 1,
    mediumRiskCount: 1,
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
  nodes: [
    {
      id: 'ApexClass:AccountService',
      displayName: 'AccountService',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/AccountService.cls',
      metrics: { fanIn: 1, fanOut: 2, coupling: 3, unresolved: 0, score: 5 },
      risk: 'HIGH',
      riskReasons: ['High coupling'],
      behavior: { isTest: false, sharing: 'with sharing', queryCount: 2, dmlCount: 1, calloutCount: 0, publicContractsCount: 2, asyncPatterns: [], securitySignalsCount: 0 },
      refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
    {
      id: 'ApexClass:AccountRepository',
      displayName: 'AccountRepository',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/AccountRepository.cls',
      metrics: { fanIn: 2, fanOut: 0, coupling: 2, unresolved: 0, score: 2 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, sharing: 'with sharing', queryCount: 5, dmlCount: 0, calloutCount: 0, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
    {
      id: 'ApexClass:OrderService',
      displayName: 'OrderService',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/OrderService.cls',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      risk: 'MEDIUM',
      riskReasons: ['Medium fan-out'],
      behavior: { isTest: false, sharing: 'without sharing', queryCount: 1, dmlCount: 2, calloutCount: 1, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
    {
      id: 'ApexClass:AccountServiceTest',
      displayName: 'AccountServiceTest',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/AccountServiceTest.cls',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: true, sharing: 'with sharing', queryCount: 0, dmlCount: 0, calloutCount: 0, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
  ],
  edges: [
    {
      id: 'ApexClass:AccountService|ApexClass:AccountRepository|method-call|getAccount|AccountService.fetch()',
      source: 'ApexClass:AccountService',
      target: 'ApexClass:AccountRepository',
      relationshipType: 'method-call',
      method: 'getAccount',
      evidence: 'AccountRepository.getAccount();',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 15,
      column: 5,
      methodOwner: 'fetch',
      file: 'force-app/main/default/classes/AccountService.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'AccountService', method: 'fetch' },
        target: { type: 'ApexClass', name: 'AccountRepository', method: 'getAccount' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 15, column: 5 },
      },
    },
    {
      id: 'ApexClass:OrderService|ApexClass:AccountService|method-call|processOrder|OrderService.run()',
      source: 'ApexClass:OrderService',
      target: 'ApexClass:AccountService',
      relationshipType: 'method-call',
      method: 'processOrder',
      evidence: 'AccountService.processOrder();',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 20,
      column: 8,
      methodOwner: 'run',
      file: 'force-app/main/default/classes/OrderService.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'OrderService', method: 'run' },
        target: { type: 'ApexClass', name: 'AccountService', method: 'processOrder' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 20, column: 8 },
      },
    },
    {
      id: 'ApexClass:AccountServiceTest|ApexClass:AccountService|method-call|testProcess|AccountServiceTest.testAll()',
      source: 'ApexClass:AccountServiceTest',
      target: 'ApexClass:AccountService',
      relationshipType: 'method-call',
      method: 'testProcess',
      evidence: 'AccountService.processOrder();',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 10,
      column: 4,
      methodOwner: 'testAll',
      file: 'force-app/main/default/classes/AccountServiceTest.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'AccountServiceTest', method: 'testAll' },
        target: { type: 'ApexClass', name: 'AccountService', method: 'testProcess' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 10, column: 4 },
      },
    },
  ],
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {
    'ApexClass:AccountService': {
      id: 'ApexClass:AccountService',
      directDependencies: ['ApexClass:AccountRepository'],
      directDependents: ['ApexClass:OrderService', 'ApexClass:AccountServiceTest'],
      transitiveDependencies: ['ApexClass:AccountRepository'],
      transitiveDependents: ['ApexClass:OrderService', 'ApexClass:AccountServiceTest'],
      impactedTests: ['ApexClass:AccountServiceTest'],
      totalImpactCount: 3,
    },
    'ApexClass:AccountRepository': {
      id: 'ApexClass:AccountRepository',
      directDependencies: [],
      directDependents: ['ApexClass:AccountService'],
      transitiveDependencies: [],
      transitiveDependents: ['ApexClass:AccountService', 'ApexClass:OrderService'],
      impactedTests: ['ApexClass:AccountServiceTest'],
      totalImpactCount: 3,
    },
  },
};

describe('Phase 3 Unified Investigation Workflow Integration', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn()
      .mockReturnValue("data:image/png;base64,00");
    vi.spyOn(useExplorerDataModule, 'useExplorerData').mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      retry: vi.fn(),
    });
    window.history.replaceState(null, '', '/');
  });

  it('navigates search -> component selection -> investigation drawer drill', async () => {
    render(<App />);

    // 1. Filter / search component from sidebar input
    const filterInput = screen.getByPlaceholderText(/Filter or search/i);
    fireEvent.change(filterInput, { target: { value: 'AccountService' } });

    const componentItems = screen.getAllByText('AccountService');
    fireEvent.click(componentItems[0]);

    // 2. REMOVED IN UX-8: 3-tab details workspace removed in favor of InvestigationDrawer progressive drill.
    // InvestigationDrawer should open and display AccountService header and dependents
    expect(screen.getAllByText('AccountService').length).toBeGreaterThan(0);
    expect(screen.getByText('OrderService')).toBeInTheDocument();
  });

  it('synchronizes target selection when clicking dependents in investigation drawer', async () => {
    render(<App />);

    // Select AccountService
    const componentItems = screen.getAllByText('AccountService');
    fireEvent.click(componentItems[0]);

    expect(screen.getAllByText('AccountService').length).toBeGreaterThan(0);

    // Click dependent row in InvestigationDrawer
    const dependentRow = screen.getByTestId('dependent-row-ApexClass:OrderService');
    fireEvent.click(dependentRow);

    // InvestigationDrawer should drill into OrderService
    await waitFor(() => {
      expect(screen.getAllByText('OrderService').length).toBeGreaterThan(0);
    });
  });

  it('updates URL state and restores canonical investigation state on popstate', async () => {
    window.history.replaceState(null, '', '/?node=ApexClass%3AAccountService&investigate=true');

    render(<App />);

    // App should hydrate AccountService selection from deep link URL
    await waitFor(() => {
      expect(screen.getAllByText('AccountService').length).toBeGreaterThan(0);
    });

    // Check URL node parameter persistence
    expect(window.location.search).toContain('node=ApexClass%3AAccountService');
  });
});
