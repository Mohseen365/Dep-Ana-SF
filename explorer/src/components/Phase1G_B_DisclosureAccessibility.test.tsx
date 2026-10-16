import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SummaryBar } from './SummaryBar';
import { HotspotPanel } from './HotspotPanel';
import { FindingsPanel } from './FindingsPanel';
import { FeatureTreePanel } from './FeatureTreePanel';
import { Sidebar } from './Sidebar';
import { WorkspaceHeader } from './workspace/WorkspaceHeader';
import { WorkspaceRouterProvider } from '../context/WorkspaceRouterContext';
import type { ExplorerNode, ExplorerSummary, ExplorerDataSchema } from '../types/explorer';
import type { ArchitectureFinding } from '../lib/intelligence';
import { createEmptyFilterState } from '../lib/search-filter';
import { createMockSummary } from '../test/fixtures/mockFactories';

const mockSummary: ExplorerSummary = createMockSummary({
  nodeCount: 12,
  edgeCount: 15,
  highRiskCount: 2,
  mediumRiskCount: 3,
  lowRiskCount: 7,
  cycleCount: 1,
  unresolvedCount: 0,
});

const mockNodes: ExplorerNode[] = [
  {
    id: 'ApexClass:TestClass',
    displayName: 'TestClass',
    type: 'ApexClass',
    file: 'classes/TestClass.cls',
    risk: 'HIGH',
    riskReasons: ['High fan-in'],
    metrics: { fanIn: 5, fanOut: 2, coupling: 7, score: 85, unresolved: 0 },
    behavior: {
      isTest: false,
      publicContractsCount: 1,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 0,
      dmlCount: 0,
      calloutCount: 0,
    },
    refactoringReadiness: {
      isHighRisk: true,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED',
    },
  },
  {
    id: 'ApexClass:UtilClass',
    displayName: 'UtilClass',
    type: 'ApexClass',
    file: 'classes/UtilClass.cls',
    risk: 'LOW',
    riskReasons: [],
    metrics: { fanIn: 1, fanOut: 0, coupling: 1, score: 20, unresolved: 0 },
    behavior: {
      isTest: false,
      publicContractsCount: 1,
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
];

const mockExplorerData: ExplorerDataSchema = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  summary: mockSummary,
  nodes: mockNodes,
  edges: [],
  cycles: [],
  unresolvedReferences: [],
  impactSummaries: {},
  entryPoints: [],
};

const mockFindings: ArchitectureFinding[] = [
  {
    id: 'finding-1',
    type: 'HIGH_FAN_IN_HUB',
    severity: 'HIGH',
    title: 'High Fan-In Hub Class',
    description: 'TestClass is imported by 5 components.',
    nodeIds: ['ApexClass:TestClass'],
    edgeIds: [],
    evidence: [
      {
        file: 'classes/TestClass.cls',
        line: 12,
        snippet: 'public class TestClass {}',
        description: 'Main declaration',
      },
    ],
    provenance: {
      origin: 'DERIVED_RULE',
      source: 'Phase1G_B test',
      facts: {},
    },
    rule: {
      ruleId: 'high-fan-in',
      ruleVersion: '1.0.0',
      name: 'High Fan-In Hub',
    },
  },
];

describe('Phase 1G-B Disclosure and Expanded/Collapsed Accessibility', () => {
  it('1. SummaryBar toggle exposes correct aria-expanded and aria-controls state', () => {
    render(<SummaryBar summary={mockSummary} />);

    const toggleBtn = screen.getByRole('button', { name: /collapse summary/i });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    const controlledId = toggleBtn.getAttribute('aria-controls');
    expect(controlledId).toBeTruthy();

    const controlledRegion = document.getElementById(controlledId!);
    expect(controlledRegion).toBeInTheDocument();
    expect(controlledRegion).toHaveClass('summary-bar');

    // Collapse
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(toggleBtn).not.toHaveAttribute('aria-controls');
    expect(document.getElementById(controlledId!)).not.toBeInTheDocument();

    // Re-expand
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    const newControlledId = toggleBtn.getAttribute('aria-controls');
    expect(newControlledId).toBeTruthy();
    expect(document.getElementById(newControlledId!)).toBeInTheDocument();
  });

  it('2. HotspotPanel panel collapse and ranked item expansion state', () => {
    render(
      <HotspotPanel
        nodes={mockNodes}
        cycles={[]}
        impactSummaries={{}}
        onSelectHotspot={() => {}}
        selectedNodeId={null}
      />
    );

    // Panel collapse toggle
    const panelToggleBtn = screen.getByRole('button', { name: /collapse hotspots/i });
    expect(panelToggleBtn).toHaveAttribute('aria-expanded', 'true');
    const panelBodyId = panelToggleBtn.getAttribute('aria-controls');
    expect(panelBodyId).toBeTruthy();
    expect(document.getElementById(panelBodyId!)).toHaveClass('hotspot-body');

    // Hotspot ranked item expand button
    const itemExpandBtn = screen.getByRole('button', { name: /expand metrics for testclass/i });
    expect(itemExpandBtn).toHaveAttribute('aria-expanded', 'false');
    expect(itemExpandBtn.getAttribute('aria-controls')).toBeNull();

    // Expand metrics
    fireEvent.click(itemExpandBtn);
    expect(itemExpandBtn).toHaveAttribute('aria-expanded', 'true');
    const metricsRegionId = itemExpandBtn.getAttribute('aria-controls');
    expect(metricsRegionId).toBeTruthy();
    expect(document.getElementById(metricsRegionId!)).toHaveClass('hotspot-expanded-metrics');

    // Collapse panel
    fireEvent.click(panelToggleBtn);
    expect(panelToggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(panelToggleBtn.getAttribute('aria-controls')).toBeNull();
    expect(document.getElementById(panelBodyId!)).not.toBeInTheDocument();
  });

  it('3. FindingsPanel evidence disclosure accessibility', () => {
    render(
      <FindingsPanel
        findings={mockFindings}
        selectedFindingId={null}
        onSelectFinding={() => {}}
        onClearSelection={() => {}}
      />
    );

    const expandEvidenceBtn = screen.getByRole('button', { name: /expand evidence for high fan-in hub class/i });
    expect(expandEvidenceBtn).toHaveAttribute('aria-expanded', 'false');
    expect(expandEvidenceBtn.getAttribute('aria-controls')).toBeNull();

    // Expand evidence
    fireEvent.click(expandEvidenceBtn);
    expect(expandEvidenceBtn).toHaveAttribute('aria-expanded', 'true');
    const evidenceId = expandEvidenceBtn.getAttribute('aria-controls');
    expect(evidenceId).toBeTruthy();
    const evidenceBox = document.getElementById(evidenceId!);
    expect(evidenceBox).toBeInTheDocument();
    expect(evidenceBox).toHaveClass('finding-evidence-box');

    // Collapse evidence
    fireEvent.click(expandEvidenceBtn);
    expect(expandEvidenceBtn).toHaveAttribute('aria-expanded', 'false');
    expect(expandEvidenceBtn.getAttribute('aria-controls')).toBeNull();
    expect(document.getElementById(evidenceId!)).not.toBeInTheDocument();
  });

  it('4. FeatureTreePanel branch expand/collapse chevrons maintain unique aria-controls and expanded state', () => {
    render(<FeatureTreePanel data={mockExplorerData} />);

    // Domain or root branch chevrons
    const rootExpandBtn = screen.getByTestId('expand-btn-root');
    expect(rootExpandBtn).toHaveAttribute('aria-expanded', 'true');
    const rootChildrenId = rootExpandBtn.getAttribute('aria-controls');
    expect(rootChildrenId).toBeTruthy();
    expect(document.getElementById(rootChildrenId!)).toHaveClass('tree-node-children');

    // Collapse root branch
    fireEvent.click(rootExpandBtn);
    expect(rootExpandBtn).toHaveAttribute('aria-expanded', 'false');
    expect(rootExpandBtn.getAttribute('aria-controls')).toBeNull();
    expect(document.getElementById(rootChildrenId!)).not.toBeInTheDocument();
  });

  it('5. Sidebar and WorkspaceHeader disclosure accessibility alignment', () => {
    const onToggleCollapse = vi.fn();
    const onExpandSidebar = vi.fn();

    // Render open sidebar
    const { rerender } = render(
      <Sidebar
        nodes={mockNodes}
        displayNodes={mockNodes}
        filterState={createEmptyFilterState()}
        selectedNodeId={null}
        collapsed={false}
        onToggleCollapse={onToggleCollapse}
        onFilterChange={() => {}}
        onSelectNode={() => {}}
      />
    );

    const collapseSidebarBtn = screen.getByTestId('collapse-sidebar-btn');
    expect(collapseSidebarBtn).toHaveAttribute('aria-expanded', 'true');
    expect(collapseSidebarBtn).toHaveAttribute('aria-controls', 'component-sidebar-panel');
    expect(document.getElementById('component-sidebar-panel')).toBeInTheDocument();

    // Render collapsed state in WorkspaceHeader
    rerender(
      <WorkspaceRouterProvider initialViewMode="graph">
        <WorkspaceHeader
          isSidebarCollapsed={true}
          onExpandSidebar={onExpandSidebar}
        />
      </WorkspaceRouterProvider>
    );

    const expandSidebarBtn = screen.getByTestId('expand-sidebar-btn');
    expect(expandSidebarBtn).toHaveAttribute('aria-expanded', 'false');
    expect(expandSidebarBtn).toHaveAttribute('aria-controls', 'component-sidebar-panel');
  });

  it('6. Focus is preserved on the toggle button when collapsing focused content', () => {
    render(<SummaryBar summary={mockSummary} data={mockExplorerData} />);

    // Focus inside summary content (Health score trigger button)
    const healthItem = screen.getByTitle('Click to view Architecture Health details');
    healthItem.focus();
    expect(document.activeElement).toBe(healthItem);

    // Collapse via summary toggle button
    const toggleBtn = screen.getByRole('button', { name: /collapse summary/i });
    fireEvent.click(toggleBtn);

    // Focus should be returned to the toggle button, not stranded or lost
    expect(document.activeElement).toBe(toggleBtn);
  });

  it('7. Native button keyboard activation via Enter/Space works cleanly without duplicate triggers', () => {
    render(<SummaryBar summary={mockSummary} />);

    const toggleBtn = screen.getByRole('button', { name: /collapse summary/i });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    // Fire native keypress/click sequence
    fireEvent.keyDown(toggleBtn, { key: 'Enter', code: 'Enter' });
    fireEvent.click(toggleBtn);

    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(toggleBtn, { key: ' ', code: 'Space' });
    fireEvent.click(toggleBtn);

    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('8. Multiple component instances generate unique region IDs without cross-linking', () => {
    render(
      <div>
        <SummaryBar summary={mockSummary} />
        <SummaryBar summary={mockSummary} />
      </div>
    );

    const toggleBtns = screen.getAllByRole('button', { name: /collapse summary/i });
    expect(toggleBtns).toHaveLength(2);

    const id1 = toggleBtns[0].getAttribute('aria-controls');
    const id2 = toggleBtns[1].getAttribute('aria-controls');

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('9. Multiple HotspotPanel and FindingsPanel instances generate collision-free region IDs using useId()', () => {
    render(
      <div>
        <HotspotPanel nodes={mockNodes} cycles={[]} impactSummaries={{}} onSelectHotspot={() => {}} selectedNodeId={null} />
        <HotspotPanel nodes={mockNodes} cycles={[]} impactSummaries={{}} onSelectHotspot={() => {}} selectedNodeId={null} />
        <FindingsPanel findings={mockFindings} selectedFindingId={null} onSelectFinding={() => {}} onClearSelection={() => {}} />
        <FindingsPanel findings={mockFindings} selectedFindingId={null} onSelectFinding={() => {}} onClearSelection={() => {}} />
      </div>
    );

    // Expand items in both HotspotPanel instances
    const hotspotBtns = screen.getAllByRole('button', { name: /expand metrics for testclass/i });
    expect(hotspotBtns).toHaveLength(2);
    fireEvent.click(hotspotBtns[0]);
    fireEvent.click(hotspotBtns[1]);

    const hId1 = hotspotBtns[0].getAttribute('aria-controls');
    const hId2 = hotspotBtns[1].getAttribute('aria-controls');
    expect(hId1).toBeTruthy();
    expect(hId2).toBeTruthy();
    expect(hId1).not.toBe(hId2);

    // Expand items in both FindingsPanel instances
    const findingsBtns = screen.getAllByRole('button', { name: /expand evidence for high fan-in hub class/i });
    expect(findingsBtns).toHaveLength(2);
    fireEvent.click(findingsBtns[0]);
    fireEvent.click(findingsBtns[1]);

    const fId1 = findingsBtns[0].getAttribute('aria-controls');
    const fId2 = findingsBtns[1].getAttribute('aria-controls');
    expect(fId1).toBeTruthy();
    expect(fId2).toBeTruthy();
    expect(fId1).not.toBe(fId2);
  });
});
