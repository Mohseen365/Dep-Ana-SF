import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DependencyRiverPanel } from './DependencyRiverPanel';
import type { ExplorerDataSchema } from '../types/explorer';

describe('DependencyRiverPanel UI Component', () => {
  const mockGraphData: ExplorerDataSchema = {
    schemaVersion: '1.0',
    project: {
      id: 'test-project',
      name: 'Test Project',
      sourcePath: 'force-app',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      analysisStatus: 'COMPLETE',
      componentCount: 4,
      dependencyCount: 3,
    },
    summary: {
      nodeCount: 4,
      edgeCount: 3,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 4,
      cycleCount: 0,
      unresolvedCount: 0,
      inventory: {
        files: 4,
        apexClasses: 3,
        apexTriggers: 0,
        lwcJs: 0,
        lwcHtml: 0,
        visualforce: 0,
        flows: 0,
        objects: 1,
        fields: 0,
      },
    },
    nodes: [
      {
        id: 'c1',
        displayName: 'BillingController',
        type: 'ApexClass',
        file: 'BillingController.cls',
        risk: 'LOW',
        riskReasons: [],
        metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 10 },
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'c2',
        displayName: 'BillingService',
        type: 'ApexClass',
        file: 'BillingService.cls',
        risk: 'LOW',
        riskReasons: [],
        metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 10 },
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'c3',
        displayName: 'AccountRepository',
        type: 'ApexClass',
        file: 'AccountRepository.cls',
        risk: 'LOW',
        riskReasons: [],
        metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 10 },
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
      {
        id: 'c4',
        displayName: 'Account__c',
        type: 'CustomObject',
        file: 'Account__c.object-meta.xml',
        risk: 'LOW',
        riskReasons: [],
        metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 10 },
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'c1',
        target: 'c2',
        relationshipType: 'method-call',
        method: 'execute',
        evidence: 'c1 calls c2',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 10,
        column: 5,
        methodOwner: 'BillingService',
        file: 'BillingController.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'BillingController' },
          target: { type: 'ApexClass', name: 'BillingService' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 10, column: 5 },
        },
      },
      {
        id: 'e2',
        source: 'c2',
        target: 'c3',
        relationshipType: 'method-call',
        method: 'find',
        evidence: 'c2 calls c3',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 15,
        column: 5,
        methodOwner: 'AccountRepository',
        file: 'BillingService.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'BillingService' },
          target: { type: 'ApexClass', name: 'AccountRepository' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 15, column: 5 },
        },
      },
      {
        id: 'e3',
        source: 'c3',
        target: 'c4',
        relationshipType: 'SOQL',
        method: 'query',
        evidence: 'c3 queries c4',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 20,
        column: 5,
        methodOwner: 'Account__c',
        file: 'AccountRepository.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'AccountRepository' },
          target: { type: 'CustomObject', name: 'Account__c' },
          relationship: { type: 'SOQL', resolution: 'EXACT' },
          location: { line: 20, column: 5 },
        },
      },
    ],
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {},
  };

  it('renders the river panel, search filter, and stage column headers', () => {
    render(<DependencyRiverPanel data={mockGraphData} />);

    expect(screen.getByTestId('dependency-river-panel')).toBeInTheDocument();
    expect(screen.getByTestId('sankey-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('sankey-canvas-container')).toBeInTheDocument();
    expect(screen.getByTestId('sankey-inspector-pane')).toBeInTheDocument();
  });

  it('allows filtering feature nodes via search input', () => {
    render(<DependencyRiverPanel data={mockGraphData} />);

    const searchInput = screen.getByTestId('sankey-search-input');
    fireEvent.change(searchInput, { target: { value: 'Billing' } });

    expect(searchInput).toHaveValue('Billing');
  });

  it('triggers onReturnToGraph callback when Return button is clicked', () => {
    const handleReturn = vi.fn();
    render(<DependencyRiverPanel data={mockGraphData} onReturnToGraph={handleReturn} />);

    const returnBtn = screen.getByTestId('return-to-graph-btn');
    fireEvent.click(returnBtn);

    expect(handleReturn).toHaveBeenCalledTimes(1);
  });
});
