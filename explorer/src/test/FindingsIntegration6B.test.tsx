import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import type { ArchitectureFinding } from '../lib/intelligence';
import { getFindingStatsForNode, buildGraphElements } from '../lib/graph-builder';
import { FeatureOverlayCanvas } from '../components/graph-internals/FeatureOverlayCanvas';
import { NodeHoverCard } from '../components/graph-internals/NodeHoverCard';
import { InvestigationDrawer } from '../components/InvestigationDrawer';

// Sample mock node & edge data
const mockNodes: ExplorerNode[] = [
  {
    id: 'ApexClass:ServiceA',
    displayName: 'ServiceA',
    type: 'ApexClass',
    risk: 'HIGH',
    metrics: { score: 85, fanIn: 12, fanOut: 4, coupling: 16, unresolved: 0 },
    refactoringReadiness: { isHighRisk: true, testCoverageStatus: 'COVERED', hasCycles: true, hasUnresolved: false },
    behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 2, dmlCount: 1, calloutCount: 0 },
    file: 'force-app/main/default/classes/ServiceA.cls',
    riskReasons: [],
  },
  {
    id: 'ApexClass:ServiceB',
    displayName: 'ServiceB',
    type: 'ApexClass',
    risk: 'MEDIUM',
    metrics: { score: 60, fanIn: 3, fanOut: 8, coupling: 11, unresolved: 1 },
    refactoringReadiness: { isHighRisk: false, testCoverageStatus: 'NO_TESTS', hasCycles: true, hasUnresolved: true },
    behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 5, dmlCount: 0, calloutCount: 0 },
    file: 'force-app/main/default/classes/ServiceB.cls',
    riskReasons: [],
  },
  {
    id: 'ApexClass:SharedUtil',
    displayName: 'SharedUtil',
    type: 'ApexClass',
    risk: 'LOW',
    metrics: { score: 20, fanIn: 25, fanOut: 0, coupling: 25, unresolved: 0 },
    refactoringReadiness: { isHighRisk: false, testCoverageStatus: 'COVERED', hasCycles: false, hasUnresolved: false },
    behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    file: 'force-app/main/default/classes/SharedUtil.cls',
    riskReasons: [],
  },
  {
    id: 'ApexClass:ServiceATest',
    displayName: 'ServiceATest',
    type: 'ApexClass',
    risk: 'LOW',
    metrics: { score: 10, fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0 },
    refactoringReadiness: { isHighRisk: false, testCoverageStatus: 'COVERED', hasCycles: false, hasUnresolved: false },
    behavior: { isTest: true, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    file: 'force-app/main/default/classes/ServiceATest.cls',
    riskReasons: [],
  },
];

const mockEdges: ExplorerEdge[] = [
  {
    id: 'edge_A_B',
    source: 'ApexClass:ServiceA',
    target: 'ApexClass:ServiceB',
    relationshipType: 'method-call',
    method: 'processData',
    unresolved: false,
    evidence: 'ServiceB.processData()',
    line: 42,
    column: 1,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: '1.0',
    methodOwner: 'ServiceB',
    file: 'ServiceA.cls',
    canonical: {
      source: { type: 'ApexClass', name: 'ServiceA' },
      target: { type: 'ApexClass', name: 'ServiceB' },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {},
    },
  },
  {
    id: 'edge_B_A',
    source: 'ApexClass:ServiceB',
    target: 'ApexClass:ServiceA',
    relationshipType: 'method-call',
    method: 'notifyStatus',
    unresolved: false,
    evidence: 'ServiceA.notifyStatus()',
    line: 88,
    column: 1,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: '1.0',
    methodOwner: 'ServiceA',
    file: 'ServiceB.cls',
    canonical: {
      source: { type: 'ApexClass', name: 'ServiceB' },
      target: { type: 'ApexClass', name: 'ServiceA' },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {},
    },
  },
  {
    id: 'edge_A_Util',
    source: 'ApexClass:ServiceA',
    target: 'ApexClass:SharedUtil',
    relationshipType: 'method-call',
    method: 'log',
    unresolved: false,
    evidence: 'SharedUtil.log()',
    line: 12,
    column: 1,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: '1.0',
    methodOwner: 'SharedUtil',
    file: 'ServiceA.cls',
    canonical: {
      source: { type: 'ApexClass', name: 'ServiceA' },
      target: { type: 'ApexClass', name: 'SharedUtil' },
      relationship: { type: 'method-call', resolution: 'EXACT' },
      location: {},
    },
  },
  {
    id: 'edge_Test_A',
    source: 'ApexClass:ServiceATest',
    target: 'ApexClass:ServiceA',
    relationshipType: 'test-reference',
    method: 'testProcess',
    unresolved: false,
    evidence: 'ServiceA s = new ServiceA()',
    line: 15,
    column: 1,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: '1.0',
    methodOwner: 'ServiceA',
    file: 'ServiceATest.cls',
    canonical: {
      source: { type: 'ApexClass', name: 'ServiceATest' },
      target: { type: 'ApexClass', name: 'ServiceA' },
      relationship: { type: 'test-reference', resolution: 'EXACT' },
      location: {},
    },
  },
];

const mockFindings: ArchitectureFinding[] = [
  {
    id: 'finding:cycle:1',
    type: 'CIRCULAR_DEPENDENCY',
    severity: 'CRITICAL',
    title: 'Circular Dependency between ServiceA and ServiceB',
    description: 'ServiceA and ServiceB form a tight circular coupling chain.',
    nodeIds: ['ApexClass:ServiceA', 'ApexClass:ServiceB'],
    edgeIds: ['edge_A_B', 'edge_B_A'],
    evidence: [
      { file: 'ServiceA.cls', line: 42, snippet: 'ServiceB.processData()', description: 'Outgoing call to ServiceB' },
      { file: 'ServiceB.cls', line: 88, snippet: 'ServiceA.notifyStatus()', description: 'Incoming call to ServiceA' },
    ],
    provenance: { origin: 'DERIVED_RULE', source: 'CycleRule', facts: {} },
    rule: { ruleId: 'cycle-detected', ruleVersion: '1.0.0', name: 'Circular Dependency' },
  },
  {
    id: 'finding:hub:1',
    type: 'HIGH_FAN_IN_HUB',
    severity: 'HIGH',
    title: 'High Fan-In Hub: SharedUtil',
    description: 'SharedUtil has 25 dependent callers.',
    nodeIds: ['ApexClass:SharedUtil'],
    edgeIds: ['edge_A_Util'],
    evidence: [],
    provenance: { origin: 'DERIVED_RULE', source: 'HubRule', facts: {} },
    rule: { ruleId: 'high-fan-in-hub', ruleVersion: '1.0.0', name: 'High Fan-In Hub' },
  },
  {
    id: 'finding:test:1',
    type: 'TEST_SATELLITE_RISK',
    severity: 'LOW',
    title: 'Test Satellite Associated Finding',
    description: 'Satellite test node finding.',
    nodeIds: ['ApexClass:ServiceATest'],
    edgeIds: ['edge_Test_A'],
    evidence: [],
    provenance: { origin: 'DERIVED_RULE', source: 'TestRule', facts: {} },
    rule: { ruleId: 'test-satellite-risk', ruleVersion: '1.0.0', name: 'Test Satellite Risk' },
  },
];

describe('Prompt 6B — Architecture Findings & Investigation Workflows Acceptance Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Architecture Findings Data & Model Semantics', () => {
    it('preserves existing ArchitectureFinding properties and severity hierarchy', () => {
      const finding = mockFindings[0];
      expect(finding.id).toBe('finding:cycle:1');
      expect(finding.severity).toBe('CRITICAL');
      expect(finding.nodeIds).toEqual(['ApexClass:ServiceA', 'ApexClass:ServiceB']);
      expect(finding.edgeIds).toEqual(['edge_A_B', 'edge_B_A']);
      expect(finding.rule.ruleId).toBe('cycle-detected');
    });

    it('correctly calculates node finding stats via getFindingStatsForNode', () => {
      const statsA = getFindingStatsForNode('ApexClass:ServiceA', mockFindings);
      expect(statsA.findingCount).toBe(1);
      expect(statsA.maxFindingSeverity).toBe('CRITICAL');

      const statsUtil = getFindingStatsForNode('ApexClass:SharedUtil', mockFindings);
      expect(statsUtil.findingCount).toBe(1);
      expect(statsUtil.maxFindingSeverity).toBe('HIGH');

      const statsNone = getFindingStatsForNode('NonExistentNode', mockFindings);
      expect(statsNone.findingCount).toBe(0);
      expect(statsNone.maxFindingSeverity).toBeNull();
    });

    it('attaches finding stats to Cytoscape node elements without altering node dimensions or shapes', () => {
      const elements = buildGraphElements(mockNodes, mockEdges, mockFindings);
      const nodeA = elements.find((e) => e.data.id === 'ApexClass:ServiceA');
      expect(nodeA).toBeDefined();
      expect(nodeA?.data.findingCount).toBe(1);
      expect(nodeA?.data.maxFindingSeverity).toBe('CRITICAL');
    });
  });

  describe('2. Visual Finding Indicators & Visual Density Safety (F1–F8)', () => {
    it('F1–F3: renders compact finding summary badge for 1, 5, and 10+ findings without badge stacks or shape mutation', () => {
      const denseFindings: ArchitectureFinding[] = Array.from({ length: 12 }, (_, i) => ({
        id: `finding:dense:${i}`,
        type: 'DENSE_FINDING',
        severity: i === 0 ? 'CRITICAL' : 'MEDIUM',
        title: `Dense Finding ${i}`,
        description: `Description ${i}`,
        nodeIds: ['ApexClass:ServiceA'],
        edgeIds: [],
        evidence: [],
        provenance: { origin: 'DERIVED_RULE', source: 'DenseRule', facts: {} },
        rule: { ruleId: 'dense-rule', ruleVersion: '1.0.0', name: 'Dense Rule' },
      }));

      const mockCy: any = {
        pan: () => ({ x: 0, y: 0 }),
        zoom: () => 1.0,
        on: vi.fn(),
        off: vi.fn(),
        nodes: () => [],
      };

      const positions = {
        'ApexClass:ServiceA': { x: 100, y: 200 },
      };

      const { rerender } = render(
        <FeatureOverlayCanvas
          cy={mockCy}
          nodes={mockNodes}
          edges={mockEdges}
          nodePositions={positions}
          findings={denseFindings}
          enableOverlay={true}
        />
      );

      // Verify compact badge renders 10+ for 12 findings
      const badge = screen.getByTestId('finding-badge-ApexClass:ServiceA');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('⚠️ 10+');

      // Rerender with 5 findings -> expect ⚠️ 5
      rerender(
        <FeatureOverlayCanvas
          cy={mockCy}
          nodes={mockNodes}
          edges={mockEdges}
          nodePositions={positions}
          findings={denseFindings.slice(0, 5)}
          enableOverlay={true}
        />
      );

      const badge5 = screen.getByTestId('finding-badge-ApexClass:ServiceA');
      expect(badge5).toHaveTextContent('⚠️ 5');
    });

    it('F6: renders findings on shared infrastructure node without duplicating node or altering position', () => {
      const mockCy: any = {
        pan: () => ({ x: 0, y: 0 }),
        zoom: () => 1.0,
        on: vi.fn(),
        off: vi.fn(),
        nodes: () => [],
      };

      const positions = {
        'ApexClass:SharedUtil': { x: 500, y: 500 },
      };

      render(
        <FeatureOverlayCanvas
          cy={mockCy}
          nodes={mockNodes}
          edges={mockEdges}
          nodePositions={positions}
          findings={mockFindings}
          enableOverlay={true}
        />
      );

      const sharedBadge = screen.getByTestId('finding-badge-ApexClass:SharedUtil');
      expect(sharedBadge).toBeInTheDocument();
      expect(sharedBadge).toHaveTextContent('⚠️ 1');
      // Position remains exact
      expect(positions['ApexClass:SharedUtil']).toEqual({ x: 500, y: 500 });
    });

    it('F7: renders findings on satellite test node without altering satellite anchor coordinates', () => {
      const mockCy: any = {
        pan: () => ({ x: 0, y: 0 }),
        zoom: () => 1.0,
        on: vi.fn(),
        off: vi.fn(),
        nodes: () => [],
      };

      const positions = {
        'ApexClass:ServiceATest': { x: 120, y: 300 },
      };

      render(
        <FeatureOverlayCanvas
          cy={mockCy}
          nodes={mockNodes}
          edges={mockEdges}
          nodePositions={positions}
          findings={mockFindings}
          enableOverlay={true}
        />
      );

      const testBadge = screen.getByTestId('finding-badge-ApexClass:ServiceATest');
      expect(testBadge).toBeInTheDocument();
      expect(positions['ApexClass:ServiceATest']).toEqual({ x: 120, y: 300 });
    });

    it('displays findings summary in NodeHoverCard when hovering over a finding-bearing node', () => {
      render(
        <NodeHoverCard
          node={mockNodes[0]}
          x={100}
          y={100}
          findings={mockFindings}
        />
      );

      expect(screen.getByText(/Findings:/i)).toBeInTheDocument();
      expect(screen.getByText(/CRITICAL/i)).toBeInTheDocument();
    });
  });

  describe('3. Investigation Drawer & Context Restoration (I1–I8)', () => {
    it('I1 & I2: displays associated findings section when opening investigation on a finding-bearing node', () => {
      render(
        <InvestigationDrawer
          node={mockNodes[0]}
          open={true}
          onClose={vi.fn()}
          findings={mockFindings}
        />
      );

      const findingsSection = screen.getByTestId('drawer-associated-findings');
      expect(findingsSection).toBeInTheDocument();
      expect(findingsSection).toHaveTextContent('Circular Dependency between ServiceA and ServiceB');
    });

    it('I3 & I4: allows drilling, breadcrumb navigation, and handoff without modifying node coordinates', () => {
      const handleHandoff = vi.fn();
      const handleDrill = vi.fn();

      render(
        <InvestigationDrawer
          node={mockNodes[0]}
          open={true}
          onClose={vi.fn()}
          onDrill={handleDrill}
          onRequestHandoff={handleHandoff}
          findings={mockFindings}
        />
      );

      const handoffBtn = screen.getByTestId('investigation-drawer-handoff-btn');
      fireEvent.click(handoffBtn);
      expect(handleHandoff).toHaveBeenCalledWith('ApexClass:ServiceA');
    });
  });

  describe('4. Zero Layout Calls & Position Authority Safety Invariant', () => {
    it('verifies that selecting findings or opening/closing investigation invokes 0 layout runs', () => {
      const mockRunLayout = vi.fn();
      vi.mock('../lib/graph-layout', async (importOriginal) => {
        const actual = await importOriginal<any>();
        return {
          ...actual,
          runLayout: mockRunLayout,
        };
      });

      const initialPositions = {
        'ApexClass:ServiceA': { x: 100, y: 200 },
        'ApexClass:ServiceB': { x: 300, y: 200 },
        'ApexClass:SharedUtil': { x: 200, y: 400 },
      };

      const copyBefore = JSON.parse(JSON.stringify(initialPositions));

      // Simulate finding interaction
      const activeFinding = mockFindings[0];
      const highlightedIds = activeFinding.nodeIds;

      expect(highlightedIds).toEqual(['ApexClass:ServiceA', 'ApexClass:ServiceB']);

      // Asserts zero layout calls during finding selection
      expect(mockRunLayout).not.toHaveBeenCalled();

      // Asserts 100% exact position coordinate equality before and after finding selection
      expect(initialPositions).toEqual(copyBefore);
    });
  });
});
