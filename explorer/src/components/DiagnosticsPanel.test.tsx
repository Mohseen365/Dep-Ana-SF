import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { ExplorerCycleGroup, ExplorerUnresolvedReference, ExplorerNode, ExplorerNodeType } from '../types/explorer';

const mockNodes: ExplorerNode[] = [
  {
    id: 'ApexClass:AssetDashboardService',
    displayName: 'AssetDashboardService',
    type: 'ApexClass' as ExplorerNodeType,
    file: 'force-app/main/default/classes/AssetDashboardService.cls',
    metrics: { fanIn: 2, fanOut: 3, coupling: 5, unresolved: 1, score: 10 },
    risk: 'HIGH',
    riskReasons: ['High coupling', 'Participates in cycle'],
    behavior: {
      isTest: false,
      publicContractsCount: 1,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 2,
      dmlCount: 1,
      calloutCount: 0
    },
    refactoringReadiness: {
      isHighRisk: true,
      hasCycles: true,
      hasUnresolved: true,
      testCoverageStatus: 'COVERED'
    }
  },
  {
    id: 'ApexClass:AssetHelper',
    displayName: 'AssetHelper',
    type: 'ApexClass' as ExplorerNodeType,
    file: 'force-app/main/default/classes/AssetHelper.cls',
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 3 },
    risk: 'MEDIUM',
    riskReasons: ['Participates in cycle'],
    behavior: {
      isTest: false,
      publicContractsCount: 1,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 1,
      dmlCount: 0,
      calloutCount: 0
    },
    refactoringReadiness: {
      isHighRisk: false,
      hasCycles: true,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED'
    }
  }
];

const mockCycles: ExplorerCycleGroup[] = [
  {
    id: 'cycle-1',
    size: 2,
    nodes: ['ApexClass:AssetDashboardService', 'ApexClass:AssetHelper']
  }
];

const mockUnresolved: ExplorerUnresolvedReference[] = [
  {
    edgeId: 'edge-unresolved-1',
    sourceNodeId: 'ApexClass:AssetDashboardService',
    targetName: 'ExternalPaymentGateway',
    targetType: 'External',
    file: 'force-app/main/default/classes/AssetDashboardService.cls',
    line: 85,
    evidence: 'new ExternalPaymentGateway();',
    reason: 'Class symbol ExternalPaymentGateway was not found in symbol registry.'
  }
];

describe('DiagnosticsPanel', () => {
  describe('Cycles View', () => {
    it('should render cycle summary count and cycle card', () => {
      render(
        <DiagnosticsPanel
          cycles={mockCycles}
          unresolvedReferences={mockUnresolved}
          nodes={mockNodes}
          activeTab="cycles"
          selectedCycleId={null}
          selectedUnresolvedEdgeId={null}
          onSelectCycle={() => {}}
          onSelectUnresolved={() => {}}
          onTabChange={() => {}}
        />
      );

      expect(screen.getByText('Circular Dependency Diagnostics')).toBeDefined();
      expect(screen.getByText('Circular Dependency #1')).toBeDefined();
      expect(screen.getAllByText('AssetDashboardService').length).toBeGreaterThan(0);
      expect(screen.getByText('AssetHelper')).toBeDefined();
    });

    it('should call onSelectCycle when Highlight Cycle button is clicked', () => {
      const onSelectCycle = vi.fn();
      render(
        <DiagnosticsPanel
          cycles={mockCycles}
          unresolvedReferences={mockUnresolved}
          nodes={mockNodes}
          activeTab="cycles"
          selectedCycleId={null}
          selectedUnresolvedEdgeId={null}
          onSelectCycle={onSelectCycle}
          onSelectUnresolved={() => {}}
          onTabChange={() => {}}
        />
      );

      const btn = screen.getByText('Highlight Cycle on Graph');
      fireEvent.click(btn);
      expect(onSelectCycle).toHaveBeenCalledWith(mockCycles[0]);
    });

    it('should show Clear Cycle Highlight when cycle is selected', () => {
      const onSelectCycle = vi.fn();
      render(
        <DiagnosticsPanel
          cycles={mockCycles}
          unresolvedReferences={mockUnresolved}
          nodes={mockNodes}
          activeTab="cycles"
          selectedCycleId="cycle-1"
          selectedUnresolvedEdgeId={null}
          onSelectCycle={onSelectCycle}
          onSelectUnresolved={() => {}}
          onTabChange={() => {}}
        />
      );

      const btn = screen.getByText('Clear Cycle Highlight');
      fireEvent.click(btn);
      expect(onSelectCycle).toHaveBeenCalledWith(null);
    });

    it('should handle empty cycles safely without crashing', () => {
      render(
        <DiagnosticsPanel
          cycles={[]}
          unresolvedReferences={[]}
          nodes={[]}
          activeTab="cycles"
          selectedCycleId={null}
          selectedUnresolvedEdgeId={null}
          onSelectCycle={() => {}}
          onSelectUnresolved={() => {}}
          onTabChange={() => {}}
        />
      );

      expect(screen.getByText(/No circular dependencies detected/i)).toBeDefined();
    });
  });

  describe('Unresolved References View', () => {
    it('should render unresolved reference summary and details', () => {
      render(
        <DiagnosticsPanel
          cycles={mockCycles}
          unresolvedReferences={mockUnresolved}
          nodes={mockNodes}
          activeTab="unresolved"
          selectedCycleId={null}
          selectedUnresolvedEdgeId={null}
          onSelectCycle={() => {}}
          onSelectUnresolved={() => {}}
          onTabChange={() => {}}
        />
      );

      expect(screen.getByText('Unresolved Reference Diagnostics')).toBeDefined();
      expect(screen.getAllByText('ExternalPaymentGateway').length).toBeGreaterThan(0);
      expect(screen.getAllByText('External').length).toBeGreaterThan(0);
      expect(screen.getByText(/Class symbol ExternalPaymentGateway was not found/)).toBeDefined();
      expect(screen.getByText(/new ExternalPaymentGateway\(\);/)).toBeDefined();
    });

    it('should display explicit semantic distinction banner', () => {
      render(
        <DiagnosticsPanel
          cycles={mockCycles}
          unresolvedReferences={mockUnresolved}
          nodes={mockNodes}
          activeTab="unresolved"
          selectedCycleId={null}
          selectedUnresolvedEdgeId={null}
          onSelectCycle={() => {}}
          onSelectUnresolved={() => {}}
          onTabChange={() => {}}
        />
      );

      expect(screen.getByText('Semantic Distinction:')).toBeDefined();
      expect(screen.getByText(/Dependency\/reference exists in source code, but target symbol is unresolved in registry./i)).toBeDefined();
    });

    it('should call onSelectUnresolved when item is clicked', () => {
      const onSelectUnresolved = vi.fn();
      render(
        <DiagnosticsPanel
          cycles={mockCycles}
          unresolvedReferences={mockUnresolved}
          nodes={mockNodes}
          activeTab="unresolved"
          selectedCycleId={null}
          selectedUnresolvedEdgeId={null}
          onSelectCycle={() => {}}
          onSelectUnresolved={onSelectUnresolved}
          onTabChange={() => {}}
        />
      );

      const btn = screen.getByText('Inspect Edge & Evidence');
      fireEvent.click(btn);
      expect(onSelectUnresolved).toHaveBeenCalledWith(mockUnresolved[0]);
    });

    it('should handle empty unresolved references safely', () => {
      render(
        <DiagnosticsPanel
          cycles={[]}
          unresolvedReferences={[]}
          nodes={[]}
          activeTab="unresolved"
          selectedCycleId={null}
          selectedUnresolvedEdgeId={null}
          onSelectCycle={() => {}}
          onSelectUnresolved={() => {}}
          onTabChange={() => {}}
        />
      );

      expect(screen.getByText(/No unresolved references detected/i)).toBeDefined();
    });
  });
});
