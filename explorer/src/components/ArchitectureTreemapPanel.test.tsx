import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArchitectureTreemapPanel } from './ArchitectureTreemapPanel';
import type { ExplorerDataSchema } from '../types/explorer';

const mockSchema: ExplorerDataSchema = {
  summary: {
    nodeCount: 3,
    edgeCount: 2,
    highRiskCount: 1,
    mediumRiskCount: 1,
    lowRiskCount: 1,
    cycleCount: 0,
    unresolvedCount: 0,
    inventory: {
      files: 3,
      apexClasses: 2,
      apexTriggers: 0,
      lwcJs: 1,
      lwcHtml: 0,
      visualforce: 0,
      flows: 0,
      objects: 0,
      fields: 0,
    },
  },
  nodes: [
    {
      id: 'OrderController',
      displayName: 'Order Controller',
      type: 'ApexClass',
      file: 'OrderController.cls',
      metrics: { fanIn: 3, fanOut: 1, coupling: 4, unresolved: 0, score: 70 },
      risk: 'HIGH',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: true, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
    {
      id: 'OrderService',
      displayName: 'Order Service',
      type: 'ApexClass',
      file: 'OrderService.cls',
      metrics: { fanIn: 1, fanOut: 2, coupling: 3, unresolved: 0, score: 30 },
      risk: 'MEDIUM',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
    {
      id: 'orderCard',
      displayName: 'Order Card',
      type: 'LWC',
      file: 'orderCard.js',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 10 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'orderCard',
      target: 'OrderController',
      relationshipType: 'lwc-apex',
      method: null,
      evidence: 'e1',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 1,
      column: 1,
      methodOwner: null,
      file: 'orderCard.js',
      canonical: {
        source: { type: 'LWC', name: 'orderCard' },
        target: { type: 'ApexClass', name: 'OrderController' },
        relationship: { type: 'lwc-apex', resolution: 'EXACT' },
        location: { line: 1, column: 1 },
      },
    },
    {
      id: 'e2',
      source: 'OrderController',
      target: 'OrderService',
      relationshipType: 'method-call',
      method: 'processOrder',
      evidence: 'e2',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'HIGH',
      line: 2,
      column: 1,
      methodOwner: 'OrderService',
      file: 'OrderController.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'OrderController' },
        target: { type: 'ApexClass', name: 'OrderService' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 2, column: 1 },
      },
    },
  ],
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {},
};

describe('ArchitectureTreemapPanel Component', () => {
  it('renders panel header and controls', () => {
    render(<ArchitectureTreemapPanel data={mockSchema} />);

    expect(screen.getByTestId('architecture-treemap-panel')).toBeInTheDocument();
    expect(screen.getByText(/Architecture Treemap Lens/i)).toBeInTheDocument();
    expect(screen.getByTestId('treemap-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('treemap-metric-select')).toBeInTheDocument();
    expect(screen.getByTestId('treemap-color-select')).toBeInTheDocument();
  });

  it('renders treemap rects and canvas container', () => {
    render(<ArchitectureTreemapPanel data={mockSchema} />);

    expect(screen.getByTestId('treemap-canvas-container')).toBeInTheDocument();
  });

  it('allows switching size metrics and color schemes', () => {
    render(<ArchitectureTreemapPanel data={mockSchema} />);

    const metricSelect = screen.getByTestId('treemap-metric-select');
    fireEvent.change(metricSelect, { target: { value: 'coupling' } });
    expect(metricSelect).toHaveValue('coupling');

    const colorSelect = screen.getByTestId('treemap-color-select');
    fireEvent.change(colorSelect, { target: { value: 'risk' } });
    expect(colorSelect).toHaveValue('risk');
  });

  it('handles empty data state gracefully', () => {
    render(<ArchitectureTreemapPanel data={{ ...mockSchema, nodes: [] }} />);

    expect(screen.getByText(/No Architecture Data Available/i)).toBeInTheDocument();
  });
});
