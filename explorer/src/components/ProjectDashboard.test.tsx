import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { ProjectDashboard } from './ProjectDashboard';
import type { ProjectMetadata, ExplorerDataSchema } from '../types/explorer';
import type { ArchitectureFinding } from '../lib/intelligence';

vi.mock('../hooks/useExplorerData', () => ({
  useExplorerData: vi.fn().mockReturnValue({
    data: null,
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

const mockProject: ProjectMetadata = {
  id: 'core-crm',
  name: 'Core CRM Salesforce Org',
  description: 'Primary customer relationship management package',
  sourcePath: 'force-app/main/default',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-15T12:00:00.000Z',
  lastAnalyzedAt: '2026-03-01T08:30:00.000Z',
  analysisStatus: 'COMPLETE',
  componentCount: 42,
  dependencyCount: 88,
  analysisPath: '/projects/core-crm/explorer-data.json',
};

const mockData: ExplorerDataSchema = {
  schemaVersion: '1.0.0',
  analyzerVersion: '13.0.0',
  generatedAt: '2026-03-01T08:30:00.000Z',
  sourceDirectory: 'force-app/main/default',
  project: mockProject,
  summary: {
    nodeCount: 42,
    edgeCount: 88,
    highRiskCount: 5,
    mediumRiskCount: 12,
    lowRiskCount: 25,
    cycleCount: 2,
    unresolvedCount: 3,
    inventory: {
      files: 42,
      apexClasses: 25,
      apexTriggers: 5,
      lwcJs: 8,
      lwcHtml: 0,
      visualforce: 2,
      flows: 2,
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
      metrics: { fanIn: 10, fanOut: 2, coupling: 0.8, unresolved: 0, score: 85 },
      risk: 'HIGH',
      riskReasons: ['High fan-in hub'],
      behavior: {
        isTest: false,
        publicContractsCount: 3,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 4,
        dmlCount: 2,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: true,
        hasCycles: true,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED',
      },
    },
  ],
  edges: [],
  cycles: [
    { id: 'cycle-1', size: 2, nodes: ['ApexClass:AccountService', 'ApexClass:OrderService'] },
    { id: 'cycle-2', size: 2, nodes: ['ApexClass:PaymentGateway', 'ApexClass:BillingEngine'] },
  ],
  unresolvedReferences: [
    {
      edgeId: 'edge-unresolved-1',
      sourceNodeId: 'ApexClass:AccountService',
      targetName: 'ExternalPaymentAPI',
      targetType: 'ApexClass',
      file: 'force-app/main/default/classes/AccountService.cls',
      line: 42,
      evidence: 'ExternalPaymentAPI.charge()',
      reason: 'Missing definition',
    },
  ],
  impactSummaries: {},
};

const mockFindings: ArchitectureFinding[] = [
  {
    id: 'finding:high-fan-in:AccountService',
    type: 'HIGH_FAN_IN_HUB',
    severity: 'CRITICAL',
    title: 'High Fan-In Architectural Hub',
    description: 'Component AccountService has 10 incoming dependencies.',
    nodeIds: ['ApexClass:AccountService'],
    edgeIds: [],
    evidence: [],
    provenance: {
      origin: 'DERIVED_RULE',
      source: 'high-fan-in-hub',
      facts: {},
    },
    rule: {
      ruleId: 'high-fan-in-hub',
      ruleVersion: '1.0.0',
      name: 'High Fan-In Architectural Hub',
    },
  },
  {
    id: 'finding:cycle:cycle-1',
    type: 'CIRCULAR_DEPENDENCY',
    severity: 'HIGH',
    title: 'Circular Dependency Cycle Detected',
    description: 'Cycle involving 2 components.',
    nodeIds: ['ApexClass:AccountService', 'ApexClass:OrderService'],
    edgeIds: [],
    evidence: [],
    provenance: {
      origin: 'DERIVED_RULE',
      source: 'cycle-detected',
      facts: {},
    },
    rule: {
      ruleId: 'cycle-detected',
      ruleVersion: '1.0.0',
      name: 'Circular Dependency Cycle Detected',
    },
  },
];

describe('ProjectDashboard', () => {
  it('renders project name, status badge, and source directory', () => {
    render(<ProjectDashboard project={mockProject} data={mockData} findings={mockFindings} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Core CRM Salesforce Org' })).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getAllByText('force-app/main/default')[0]).toBeInTheDocument();
  });

  it('renders summary metric cards correctly', () => {
    render(<ProjectDashboard project={mockProject} data={mockData} findings={mockFindings} />);

    const compCard = screen.getByText('Component Count').parentElement!.parentElement!;
    expect(within(compCard).getByText('42')).toBeInTheDocument();

    const depCard = screen.getByText('Dependency Count').parentElement!.parentElement!;
    expect(within(depCard).getByText('88')).toBeInTheDocument();

    const findingsCard = screen.getByText('Findings Count').parentElement!.parentElement!;
    expect(within(findingsCard).getByText('2')).toBeInTheDocument();

    expect(screen.getByText('Last Analysis')).toBeInTheDocument();
  });

  it('renders architecture summary component breakdown', () => {
    render(<ProjectDashboard project={mockProject} data={mockData} findings={mockFindings} />);

    expect(screen.getByText('Architecture Summary')).toBeInTheDocument();
    expect(screen.getByText('Apex Classes')).toBeInTheDocument();

    const apexClassesRow = screen.getByText('Apex Classes').parentElement!;
    expect(within(apexClassesRow).getByText('25')).toBeInTheDocument();

    const apexTriggersRow = screen.getByText('Apex Triggers').parentElement!;
    expect(within(apexTriggersRow).getByText('5')).toBeInTheDocument();

    const lwcRow = screen.getByText('LWC Components').parentElement!;
    expect(within(lwcRow).getByText('8')).toBeInTheDocument();
  });

  it('renders risk and quality summary breakdown', () => {
    render(<ProjectDashboard project={mockProject} data={mockData} findings={mockFindings} />);

    expect(screen.getByText('Risk & Quality Summary')).toBeInTheDocument();

    const highRiskPill = screen.getByText('High Risk').parentElement!;
    expect(within(highRiskPill).getByText('5')).toBeInTheDocument();

    const mediumRiskPill = screen.getByText('Medium Risk').parentElement!;
    expect(within(mediumRiskPill).getByText('12')).toBeInTheDocument();

    const lowRiskPill = screen.getByText('Low Risk').parentElement!;
    expect(within(lowRiskPill).getByText('25')).toBeInTheDocument();

    expect(screen.getByText('2 cycles')).toBeInTheDocument();
    expect(screen.getByText('3 unresolved')).toBeInTheDocument();
    expect(screen.getByText('1 critical')).toBeInTheDocument();
  });

  it('renders recent activity section', () => {
    render(<ProjectDashboard project={mockProject} data={mockData} findings={mockFindings} />);

    expect(screen.getByText('Recent Activity & Timeline')).toBeInTheDocument();
    expect(screen.getByText('Static Dependency Analysis Executed')).toBeInTheDocument();
    expect(screen.getByText('Project Metadata Updated')).toBeInTheDocument();
    expect(screen.getByText('Project Registered')).toBeInTheDocument();
  });

  it('triggers onExploreGraph callback when primary action button is clicked', () => {
    const onExploreGraph = vi.fn();
    render(
      <ProjectDashboard
        project={mockProject}
        data={mockData}
        findings={mockFindings}
        onExploreGraph={onExploreGraph}
      />
    );

    const exploreBtn = screen.getByTestId('explore-graph-btn');
    fireEvent.click(exploreBtn);
    expect(onExploreGraph).toHaveBeenCalledTimes(1);
  });

  it('triggers onRunAnalysis, onViewFindings, and onViewHistory callbacks when secondary buttons are clicked', () => {
    const onRunAnalysis = vi.fn();
    const onViewFindings = vi.fn();
    const onViewHistory = vi.fn();

    render(
      <ProjectDashboard
        project={mockProject}
        data={mockData}
        findings={mockFindings}
        onRunAnalysis={onRunAnalysis}
        onViewFindings={onViewFindings}
        onViewHistory={onViewHistory}
      />
    );

    fireEvent.click(screen.getByTestId('run-analysis-btn'));
    expect(onRunAnalysis).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('view-findings-btn'));
    expect(onViewFindings).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('view-history-btn'));
    expect(onViewHistory).toHaveBeenCalledTimes(1);
  });

  it('handles disabled run analysis button gracefully when no onRunAnalysis prop is provided', () => {
    render(<ProjectDashboard project={mockProject} data={mockData} findings={mockFindings} />);

    const disabledBtn = screen.getByTestId('run-analysis-btn-disabled');
    expect(disabledBtn).toBeDisabled();
    expect(disabledBtn).toHaveAttribute(
      'title',
      'Analysis can be run via CLI: node scripts/export-explorer.cjs'
    );
  });
});
