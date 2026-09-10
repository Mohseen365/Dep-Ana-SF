import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailsPanel } from './DetailsPanel';
import { ExplorerNode, ExplorerEdge, ExplorerNodeType, ExplorerComponentImpactSummary } from '../types/explorer';

const mockNode: ExplorerNode = {
  id: 'ApexClass:TestClass',
  displayName: 'TestClass',
  type: 'ApexClass' as ExplorerNodeType,
  file: 'force-app/main/default/classes/TestClass.cls',
  metrics: {
    fanIn: 3,
    fanOut: 2,
    coupling: 5,
    unresolved: 1,
    score: 10
  },
  risk: 'HIGH',
  riskReasons: ['high coupling', 'has unresolved references'],
  behavior: {
    isTest: false,
    sharing: 'with sharing',
    publicContractsCount: 2,
    asyncPatterns: ['Future'],
    securitySignalsCount: 1,
    queryCount: 5,
    dmlCount: 3,
    calloutCount: 1
  },
  refactoringReadiness: {
    isHighRisk: true,
    hasCycles: true,
    hasUnresolved: true,
    testCoverageStatus: 'COVERED'
  }
};

const mockEdge: ExplorerEdge = {
  id: 'ApexClass:TestClass|ApexClass:Helper|method-call|doWork|TestClass.doWork()',
  source: 'ApexClass:TestClass',
  target: 'ApexClass:Helper',
  relationshipType: 'method-call',
  method: 'doWork',
  evidence: 'Helper.doWork();',
  unresolved: false,
  resolutionClassification: 'RESOLVED_LOCAL',
  resolutionStrategy: 'EXACT',
  confidence: 'high',
  line: 42,
  column: 9,
  methodOwner: 'processData',
  file: 'force-app/main/default/classes/TestClass.cls',
  canonical: {
    source: { type: 'ApexClass' as ExplorerNodeType, name: 'TestClass', method: 'processData' },
    target: { type: 'ApexClass' as ExplorerNodeType, name: 'Helper', method: 'doWork' },
    relationship: { type: 'method-call', resolution: 'EXACT' as const },
    location: { line: 42, column: 9 }
  }
};

const mockUnresolvedEdge: ExplorerEdge = {
  id: 'ApexClass:TestClass|External:PaymentGateway|instantiation||new PaymentGateway()',
  source: 'ApexClass:TestClass',
  target: 'External:PaymentGateway',
  relationshipType: 'instantiation',
  method: null,
  evidence: 'new PaymentGateway();',
  unresolved: true,
  resolutionClassification: 'UNKNOWN',
  resolutionStrategy: 'LLM',
  confidence: 'low',
  line: 85,
  column: 12,
  methodOwner: 'processPayment',
  file: 'force-app/main/default/classes/TestClass.cls',
  canonical: {
    source: { type: 'ApexClass' as ExplorerNodeType, name: 'TestClass', method: 'processPayment' },
    target: { type: 'External' as ExplorerNodeType, name: 'PaymentGateway', method: null },
    relationship: { type: 'instantiation', resolution: 'UNRESOLVED' as const },
    location: { line: 85, column: 12 }
  }
};

const mockImpactSummary: ExplorerComponentImpactSummary = {
  id: 'ApexClass:TestClass',
  directDependencies: ['ApexClass:Helper'],
  directDependents: ['ApexClass:TestRunner'],
  transitiveDependencies: ['ApexClass:Helper', 'External:PaymentGateway'],
  transitiveDependents: ['ApexClass:TestRunner'],
  impactedTests: ['ApexClass:TestRunner'],
  totalImpactCount: 3
};

describe('DetailsPanel', () => {
  describe('node selection', () => {
    it('should show placeholder when no node or edge selected', () => {
      render(<DetailsPanel node={null} edge={null} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText('No Component Selected')).toBeDefined();
      expect(screen.getByText(/Click on any node or edge/i)).toBeDefined();
    });

    it('should display node name', () => {
      render(<DetailsPanel node={mockNode} edge={null} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText('TestClass')).toBeDefined();
    });

    it('should display node type', () => {
      render(<DetailsPanel node={mockNode} edge={null} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText('ApexClass')).toBeDefined();
    });

    it('should display risk badge', () => {
      render(<DetailsPanel node={mockNode} edge={null} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText('HIGH RISK')).toBeDefined();
    });

    it('should display source file path', () => {
      render(<DetailsPanel node={mockNode} edge={null} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText(/TestClass.cls/)).toBeDefined();
    });

    it('should display fan-in metric', () => {
      render(<DetailsPanel node={mockNode} edge={null} impactSummary={null} onClose={() => {}} />);
      
      // Find the fan-in metric card which contains "Fan-In" label and "3" value
      const fanInCard = screen.getByText('Fan-In').parentElement;
      expect(fanInCard?.querySelector('.metric-num')?.textContent).toBe('3');
    });

    it('should display fan-out metric', () => {
      render(<DetailsPanel node={mockNode} edge={null} impactSummary={null} onClose={() => {}} />);
      
      const fanOutCard = screen.getByText('Fan-Out').parentElement;
      expect(fanOutCard?.querySelector('.metric-num')?.textContent).toBe('2');
    });

    it('should display coupling metric', () => {
      render(<DetailsPanel node={mockNode} edge={null} impactSummary={null} onClose={() => {}} />);
      
      const couplingCard = screen.getByText('Coupling').parentElement;
      expect(couplingCard?.querySelector('.metric-num')?.textContent).toBe('5');
    });

    it('should display risk reasons', () => {
      render(<DetailsPanel node={mockNode} edge={null} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText(/high coupling/)).toBeDefined();
      expect(screen.getByText(/has unresolved references/)).toBeDefined();
    });

    it('should handle empty risk reasons safely', () => {
      const nodeNoRiskReasons: ExplorerNode = {
        ...mockNode,
        risk: 'LOW',
        riskReasons: []
      };
      render(<DetailsPanel node={nodeNoRiskReasons} edge={null} impactSummary={null} onClose={() => {}} />);

      expect(screen.getByText('No additional risk reasons provided by analyzer.')).toBeDefined();
    });

    it('should display component capabilities', () => {
      render(<DetailsPanel node={mockNode} edge={null} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText(/Is Test Class:/)).toBeDefined();
      expect(screen.getByText(/No/)).toBeDefined();
      expect(screen.getByText(/with sharing/)).toBeDefined();
    });

    it('should display impact summary', () => {
      render(<DetailsPanel node={mockNode} edge={null} impactSummary={mockImpactSummary} onClose={() => {}} />);
      
      expect(screen.getByText(/Total Impacted Components:/)).toBeDefined();
      expect(screen.getByText(/Direct Dependencies:/)).toBeDefined();
      expect(screen.getAllByText(/ApexClass:Helper/)).toBeDefined();
    });

    it('should display Show Impact button and handle click', () => {
      const onShowImpact = vi.fn();
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={mockImpactSummary}
          onClose={() => {}}
          onShowImpact={onShowImpact}
        />
      );

      const impactBtn = screen.getByText(/Show Impact/);
      impactBtn.click();
      expect(onShowImpact).toHaveBeenCalledWith('ApexClass:TestClass');
    });

    it('should display fallback when no impacted tests exist', () => {
      const emptyImpactSummary: ExplorerComponentImpactSummary = {
        ...mockImpactSummary,
        impactedTests: []
      };
      render(
        <DetailsPanel
          node={mockNode}
          edge={null}
          impactSummary={emptyImpactSummary}
          onClose={() => {}}
        />
      );

      expect(screen.getByText(/No impacted tests identified by analyzer data/)).toBeDefined();
    });
  });

  describe('edge selection', () => {
    it('should display edge evidence when edge is selected', () => {
      render(<DetailsPanel node={null} edge={mockEdge} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText('Relationship Evidence')).toBeDefined();
    });

    it('should display relationship type', () => {
      render(<DetailsPanel node={null} edge={mockEdge} impactSummary={null} onClose={() => {}} />);
      
      // The code formats "method-call" as "METHOD CALL" (replaces - with space)
      expect(screen.getByText('METHOD CALL')).toBeDefined();
    });

    it('should display source and target', () => {
      render(<DetailsPanel node={null} edge={mockEdge} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText(/ApexClass:TestClass/)).toBeDefined();
      expect(screen.getByText(/ApexClass:Helper/)).toBeDefined();
    });

    it('should display evidence code', () => {
      render(<DetailsPanel node={null} edge={mockEdge} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText(/Helper.doWork/)).toBeDefined();
    });

    it('should display resolution status', () => {
      render(<DetailsPanel node={null} edge={mockEdge} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText(/Resolved/)).toBeDefined();
    });

    it('should display resolution classification', () => {
      render(<DetailsPanel node={null} edge={mockEdge} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText(/RESOLVED_LOCAL/)).toBeDefined();
    });

    it('should display confidence level', () => {
      render(<DetailsPanel node={null} edge={mockEdge} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText(/High/)).toBeDefined();
    });
  });

  describe('missing evidence', () => {
    it('should indicate when evidence is unavailable', () => {
      const edgeNoEvidence: ExplorerEdge = {
        ...mockEdge,
        evidence: ''
      };
      render(<DetailsPanel node={null} edge={edgeNoEvidence} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText(/No evidence available/)).toBeDefined();
    });
  });

  describe('unresolved relationships', () => {
    it('should display unresolved status', () => {
      render(<DetailsPanel node={null} edge={mockUnresolvedEdge} impactSummary={null} onClose={() => {}} />);
      
      // Check for the unresolved class and text
      const statusElement = screen.getByText((_content: string, element: Element | null) => {
        return element?.classList.contains('unresolved') === true;
      });
      expect(statusElement).toBeDefined();
    });

    it('should show unresolved reference information', () => {
      render(<DetailsPanel node={null} edge={mockUnresolvedEdge} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText(/Unresolved Reference/)).toBeDefined();
      expect(screen.getByText(/could not resolve/)).toBeDefined();
    });

    it('should display low confidence for unresolved', () => {
      render(<DetailsPanel node={null} edge={mockUnresolvedEdge} impactSummary={null} onClose={() => {}} />);
      
      expect(screen.getByText(/Low/)).toBeDefined();
    });
  });

  describe('onClose', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<DetailsPanel node={mockNode} edge={null} impactSummary={null} onClose={onClose} />);
      
      const closeBtn = screen.getByTitle('Close details');
      closeBtn.click();
      
      expect(onClose).toHaveBeenCalled();
    });
  });
});