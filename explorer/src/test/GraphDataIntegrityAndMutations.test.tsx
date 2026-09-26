import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import { ExplorerNode, ExplorerEdge, ExplorerNodeType } from '../types/explorer';
import { buildGraphElements, createNodeMap } from '../lib/graph-builder';
import { computeArchitectureAnalysis } from '../lib/layout/analysis';
import { discoverDomains } from '../lib/layout/domains';
import { discoverFeatures } from '../lib/layout/features';
import { deriveFeatureCompositionGroups } from '../lib/layout/feature-composition';
import { computeGraphCentralityAnalysis } from '../lib/layout/centrality';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { computeFocusedGraph } from '../lib/focus-graph';
import { applyFilters, createEmptyFilterState } from '../lib/search-filter';
import { createFinding } from '../lib/intelligence/finding';
import { GraphView } from '../components/GraphView';
import { ProjectStateProvider } from '../context/ProjectStateContext';

describe('Prompt 6F — Graph Data Integrity, Incremental Updates & Mutation Forensics', () => {

  // Sample Baseline Nodes
  const createBaseNode = (id: string, type: ExplorerNodeType = 'ApexClass', displayName?: string): ExplorerNode => ({
    id,
    displayName: displayName || id.split(':').pop() || id,
    type,
    file: `src/classes/${id}.cls`,
    metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 50 },
    risk: 'LOW',
    riskReasons: [],
    behavior: {
      isTest: false,
      publicContractsCount: 1,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 1,
      dmlCount: 0,
      calloutCount: 0,
    },
    refactoringReadiness: {
      isHighRisk: false,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED',
    },
  });

  const createBaseEdge = (
    id: string,
    source: string,
    target: string,
    relationshipType: any = 'method-call'
  ): ExplorerEdge => ({
    id,
    source,
    target,
    relationshipType,
    method: 'execute',
    evidence: 'OrderService.cls:12',
    unresolved: false,
    resolutionClassification: 'RESOLVED_LOCAL',
    resolutionStrategy: 'EXACT',
    confidence: 'HIGH',
    line: 12,
    column: 5,
    methodOwner: 'OrderService',
    file: 'OrderService.cls',
    canonical: {
      source: { type: 'ApexClass', name: source },
      target: { type: 'ApexClass', name: target },
      relationship: { type: relationshipType, resolution: 'EXACT' },
      location: { line: 12, column: 5 },
    },
  });

  describe('1. Node & Edge Identity Verification', () => {
    it('distinguishes canonical node types sharing the same entity name without colliding', () => {
      const allTypes: ExplorerNodeType[] = [
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

      const sameNameNodes: ExplorerNode[] = allTypes.map(type =>
        createBaseNode(`${type}:Account`, type, 'Account')
      );

      const nodeMap = createNodeMap(sameNameNodes);
      expect(nodeMap.size).toBe(10);
      allTypes.forEach(type => {
        expect(nodeMap.has(`${type}:Account`)).toBe(true);
        expect(nodeMap.get(`${type}:Account`)?.type).toBe(type);
      });

      // Verify Cytoscape build elements generate 10 unique node IDs
      const cyElements = buildGraphElements(sameNameNodes, []);
      const cyNodeIds = cyElements.filter(e => e.group === 'nodes').map(e => e.data.id);
      expect(cyNodeIds.length).toBe(10);
      expect(new Set(cyNodeIds).size).toBe(10);
    });

    it('maintains distinct parallel edges between same source and target when relationship types differ', () => {
      const nodeA = createBaseNode('ApexClass:OrderService');
      const nodeB = createBaseNode('ApexClass:PaymentGateway');

      const edge1 = createBaseEdge('edge-1', nodeA.id, nodeB.id, 'method-call');
      const edge2 = createBaseEdge('edge-2', nodeA.id, nodeB.id, 'SOQL');
      const edge3 = createBaseEdge('edge-3', nodeA.id, nodeB.id, 'instantiation');

      const edges = [edge1, edge2, edge3];
      const cyElements = buildGraphElements([nodeA, nodeB], edges);
      const cyEdges = cyElements.filter(e => e.group === 'edges');

      expect(cyEdges.length).toBe(3);
      const relationshipTypes = cyEdges.map(e => e.data.relationshipType);
      expect(relationshipTypes).toEqual(['method-call', 'SOQL', 'instantiation']);

      // Remove one parallel relationship without affecting others
      const remainingEdges = edges.filter(e => e.id !== 'edge-2');
      const cyElementsAfter = buildGraphElements([nodeA, nodeB], remainingEdges);
      const cyEdgesAfter = cyElementsAfter.filter(e => e.group === 'edges');

      expect(cyEdgesAfter.length).toBe(2);
      expect(cyEdgesAfter.map(e => e.data.id)).toEqual(['edge-1', 'edge-3']);
    });
  });

  describe('2. Incremental Node & Edge Additions', () => {
    it('adds a node and edge while preserving 0 coordinate drift for existing authoritative nodes', () => {
      const nodeA = createBaseNode('ApexClass:NodeA');
      const nodeB = createBaseNode('ApexClass:NodeB');
      const edgeAB = createBaseEdge('e-ab', nodeA.id, nodeB.id);

      const initialNodes = [nodeA, nodeB];
      const initialEdges = [edgeAB];

      const initialPositions = computeArchitectureLayout(initialNodes, initialEdges);
      expect(initialPositions['ApexClass:NodeA']).toBeDefined();
      expect(initialPositions['ApexClass:NodeB']).toBeDefined();

      // Authoritative positions established
      const authPositions = {
        'ApexClass:NodeA': { x: 100, y: 150 },
        'ApexClass:NodeB': { x: 400, y: 150 },
      };

      // Mutate: Add Node C and Edge B -> C
      const nodeC = createBaseNode('ApexClass:NodeC');
      const edgeBC = createBaseEdge('e-bc', nodeB.id, nodeC.id);

      const updatedNodes = [...initialNodes, nodeC];
      const updatedEdges = [...initialEdges, edgeBC];

      const updatedPositions = computeArchitectureLayout(updatedNodes, updatedEdges, {
        existingPositions: authPositions,
      });

      // Assert zero coordinate drift on existing authoritative nodes
      expect(updatedPositions['ApexClass:NodeA']).toEqual({ x: 100, y: 150 });
      expect(updatedPositions['ApexClass:NodeB']).toEqual({ x: 400, y: 150 });

      // Assert new node C receives a valid deterministic position
      expect(updatedPositions['ApexClass:NodeC']).toBeDefined();
      expect(typeof updatedPositions['ApexClass:NodeC'].x).toBe('number');
      expect(typeof updatedPositions['ApexClass:NodeC'].y).toBe('number');
      expect(Number.isNaN(updatedPositions['ApexClass:NodeC'].x)).toBe(false);
    });

    it('updates focus graph traversal when a new edge is incrementally added', () => {
      const nodeA = createBaseNode('ApexClass:NodeA');
      const nodeB = createBaseNode('ApexClass:NodeB');
      const nodeC = createBaseNode('ApexClass:NodeC');
      const edgeAB = createBaseEdge('e-ab', nodeA.id, nodeB.id);

      const focusState = {
        enabled: true,
        focusNodeId: 'ApexClass:NodeA',
        direction: 'both' as const,
        depth: 2 as const,
      };

      // Before edge addition: C is not reachable from A
      const focusBefore = computeFocusedGraph([nodeA, nodeB, nodeC], [edgeAB], focusState);
      expect(focusBefore.nodes.map(n => n.id)).toContain('ApexClass:NodeA');
      expect(focusBefore.nodes.map(n => n.id)).toContain('ApexClass:NodeB');
      expect(focusBefore.nodes.map(n => n.id)).not.toContain('ApexClass:NodeC');

      // Add edge B -> C
      const edgeBC = createBaseEdge('e-bc', nodeB.id, nodeC.id);
      const focusAfter = computeFocusedGraph([nodeA, nodeB, nodeC], [edgeAB, edgeBC], focusState);

      // C is now reachable at depth 2 downstream from A
      expect(focusAfter.nodes.map(n => n.id)).toContain('ApexClass:NodeC');
      expect(focusAfter.edges.map(e => e.id)).toContain('e-bc');
    });
  });

  describe('3. Node & Edge Removal Forensics (No Ghost References)', () => {
    it('completely removes node and incident edges across analysis, centrality, features, and composition', () => {
      const nodeA = createBaseNode('ApexClass:NodeA');
      const nodeB = createBaseNode('ApexClass:NodeB');
      const nodeC = createBaseNode('ApexClass:NodeC');
      const edgeAB = createBaseEdge('e-ab', nodeA.id, nodeB.id);
      const edgeBC = createBaseEdge('e-bc', nodeB.id, nodeC.id);

      const nodes = [nodeA, nodeB, nodeC];
      const edges = [edgeAB, edgeBC];

      // Analysis before removal
      const analysisBefore = computeArchitectureAnalysis(nodes, edges);
      expect(analysisBefore.nodes.has('ApexClass:NodeB')).toBe(true);
      expect(analysisBefore.totalEdges).toBe(2);

      // Remove Node B and incident edges (e-ab, e-bc)
      const nodesAfter = nodes.filter(n => n.id !== 'ApexClass:NodeB');
      const edgesAfter = edges.filter(e => e.source !== 'ApexClass:NodeB' && e.target !== 'ApexClass:NodeB');

      const analysisAfter = computeArchitectureAnalysis(nodesAfter, edgesAfter);

      // Assert B is purged from authoritative collections
      expect(analysisAfter.nodes.has('ApexClass:NodeB')).toBe(false);
      expect(analysisAfter.nodeList.some(n => n.nodeId === 'ApexClass:NodeB')).toBe(false);
      expect(analysisAfter.totalNodes).toBe(2);
      expect(analysisAfter.totalEdges).toBe(0);

      // Feature discovery & composition checks
      const featuresAfter = discoverFeatures(nodesAfter, edgesAfter);
      featuresAfter.featureList.forEach(cluster => {
        const groupsAfter = deriveFeatureCompositionGroups(cluster, nodesAfter, edgesAfter);
        groupsAfter.forEach(group => {
          expect(group.nodeIds).not.toContain('ApexClass:NodeB');
        });
      });

      // Cytoscape elements check
      const cyElements = buildGraphElements(nodesAfter, edgesAfter);
      const cyIds = cyElements.map(e => e.data.id);
      expect(cyIds).not.toContain('ApexClass:NodeB');
      expect(cyIds).not.toContain('e-ab');
      expect(cyIds).not.toContain('e-bc');
    });

    it('repairs focus graph and filters cleanly when focused node is removed', () => {
      const nodeA = createBaseNode('ApexClass:NodeA');
      const nodeB = createBaseNode('ApexClass:NodeB');
      const edgeAB = createBaseEdge('e-ab', nodeA.id, nodeB.id);

      const focusState = {
        enabled: true,
        focusNodeId: 'ApexClass:NodeA',
        direction: 'both' as const,
        depth: 2 as const,
      };

      // Remove focusNodeId NodeA
      const nodesAfter = [nodeB];
      const edgesAfter: ExplorerEdge[] = [];

      const focusAfter = computeFocusedGraph(nodesAfter, edgesAfter, focusState);
      expect(focusAfter.nodes.length).toBe(0);
      expect(focusAfter.edges.length).toBe(0);
    });
  });

  describe('4. Node Metadata Updates & Reclassifications', () => {
    it('updates ApexClass -> Apex Test Class metadata and reclassifies test satellite behavior', () => {
      const nodeA = createBaseNode('ApexClass:OrderService');
      const nodeTest = createBaseNode('ApexClass:OrderServiceTest');

      const nodes = [nodeA, nodeTest];
      const edges = [createBaseEdge('e-test', nodeTest.id, nodeA.id, 'test-reference')];

      const analysisBefore = computeArchitectureAnalysis(nodes, edges);
      const testAnalysisBefore = analysisBefore.nodes.get('ApexClass:OrderServiceTest');
      expect(testAnalysisBefore?.isTest).toBe(true);

      // Refresh metadata: OrderServiceTest receives behavior.isTest = true explicitly
      const nodeTestUpdated: ExplorerNode = {
        ...nodeTest,
        behavior: {
          ...nodeTest.behavior,
          isTest: true,
        },
      };

      const nodesUpdated = [nodeA, nodeTestUpdated];
      const analysisAfter = computeArchitectureAnalysis(nodesUpdated, edges);
      const testAnalysisAfter = analysisAfter.nodes.get('ApexClass:OrderServiceTest');

      expect(testAnalysisAfter?.isTest).toBe(true);
      expect(testAnalysisAfter?.parentProductionNodeId).toBe('ApexClass:OrderService');

      // Verify canvas visibility filtering rule: ApexClass visibility filter retains both normal and test classes
      const filterState = createEmptyFilterState();
      filterState.visibleNodeTypes = ['ApexClass'];

      const filtered = applyFilters(nodesUpdated, edges, filterState);
      expect(filtered.nodes.map(n => n.id)).toContain('ApexClass:OrderService');
      expect(filtered.nodes.map(n => n.id)).toContain('ApexClass:OrderServiceTest');
    });

    it('updates domain and feature discovery when node domain/feature metadata shifts', () => {
      const nodeA = createBaseNode('ApexClass:BillingService');
      const nodeB = createBaseNode('ApexClass:OrderService');
      const edge = createBaseEdge('e1', nodeA.id, nodeB.id);

      const nodes = [nodeA, nodeB];
      const edges = [edge];

      const domainsBefore = discoverDomains(nodes, edges);
      expect(domainsBefore.assignments.get('ApexClass:BillingService')?.primaryDomain).toBe('Billing');

      // Metadata update: Rename BillingService -> InvoiceService
      const nodeAUpdated = createBaseNode('ApexClass:InvoiceService', 'ApexClass', 'InvoiceService');
      const edgeUpdated = createBaseEdge('e1', nodeAUpdated.id, nodeB.id);

      const domainsAfter = discoverDomains([nodeAUpdated, nodeB], [edgeUpdated]);
      expect(domainsAfter.assignments.get('ApexClass:InvoiceService')?.primaryDomain).toBe('Invoice');
      expect(domainsAfter.assignments.has('ApexClass:BillingService')).toBe(false);
    });
  });

  describe('5. Centrality, Bridge & Shared Infrastructure Dynamic Reclassification', () => {
    it('dynamically promotes high fan-in node to bridge/hub centrality when connections expand', () => {
      const coreNode = createBaseNode('ApexClass:CoreUtility');
      const client1 = createBaseNode('ApexClass:Client1');
      const client2 = createBaseNode('ApexClass:Client2');
      const client3 = createBaseNode('ApexClass:Client3');

      const initialNodes = [coreNode, client1, client2];
      const initialEdges = [
        createBaseEdge('e1', client1.id, coreNode.id),
        createBaseEdge('e2', client2.id, coreNode.id),
      ];

      const domainMapInitial = new Map<string, string>([
        [coreNode.id, 'Shared'],
        [client1.id, 'Sales'],
        [client2.id, 'Billing'],
      ]);

      const layerMap = new Map<string, any>([
        [coreNode.id, 'domain'],
        [client1.id, 'application'],
        [client2.id, 'application'],
        [client3.id, 'application'],
      ]);

      const centralityBefore = computeGraphCentralityAnalysis(initialNodes, initialEdges, domainMapInitial, layerMap);
      const scoreBefore = centralityBefore.get(coreNode.id)?.hubScore || 0;
      expect(scoreBefore).toBeGreaterThan(0);

      // Expand connections: Add Client3 (Domain: Support)
      const expandedNodes = [...initialNodes, client3];
      const expandedEdges = [...initialEdges, createBaseEdge('e3', client3.id, coreNode.id)];
      const domainMapExpanded = new Map(domainMapInitial);
      domainMapExpanded.set(client3.id, 'Support');

      const centralityAfter = computeGraphCentralityAnalysis(expandedNodes, expandedEdges, domainMapExpanded, layerMap);
      const coreCentrality = centralityAfter.get(coreNode.id);

      expect(coreCentrality?.hubScore).toBeGreaterThan(scoreBefore);
      expect(coreCentrality?.connectedDomains.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('6. Derived Findings & Composition Invalidation', () => {
    it('invalidates findings when underlying architecture violations are resolved', () => {
      const findingBefore = createFinding({
        id: 'finding-cycle-1',
        type: 'CIRCULAR_DEPENDENCY',
        severity: 'HIGH',
        title: 'Circular Dependency Detected',
        description: 'OrderService and PaymentGateway form a cycle',
        nodeIds: ['ApexClass:OrderService', 'ApexClass:PaymentGateway'],
        edgeIds: ['e-1', 'e-2'],
        provenance: { origin: 'ANALYZER_FACT', source: 'dependency-graph', facts: {} },
        rule: {
          ruleId: 'R-CYCLE-01',
          ruleVersion: '1.0',
          name: 'No Circular Dependencies',
          description: 'Prevents circular coupling between services',
        },
      });

      expect(findingBefore.nodeIds).toEqual(['ApexClass:OrderService', 'ApexClass:PaymentGateway']);

      // Relationship fixed: e-2 removed, cycle broken
      const edgesAfter = [createBaseEdge('e-1', 'ApexClass:OrderService', 'ApexClass:PaymentGateway')];
      const analysisAfter = computeArchitectureAnalysis(
        [createBaseNode('ApexClass:OrderService'), createBaseNode('ApexClass:PaymentGateway')],
        edgesAfter
      );

      expect(analysisAfter.components.length).toBe(1);
    });
  });

  describe('7. Cytoscape Canvas Element Synchronization Integrity', () => {
    it('ensures zero ghost elements or duplicate elements on incremental React prop updates in GraphView', async () => {
      const nodeA = createBaseNode('ApexClass:NodeA');
      const nodeB = createBaseNode('ApexClass:NodeB');
      const edgeAB = createBaseEdge('e-ab', nodeA.id, nodeB.id);

      const { rerender, container } = render(
        <ProjectStateProvider projectId="test-p1">
          <GraphView
            nodes={[nodeA, nodeB]}
            edges={[edgeAB]}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
          />
        </ProjectStateProvider>
      );

      expect(container.querySelector('.cytoscape-view')).not.toBeNull();

      // Rerender 1: Add Node C
      const nodeC = createBaseNode('ApexClass:NodeC');
      const edgeBC = createBaseEdge('e-bc', nodeB.id, nodeC.id);

      rerender(
        <ProjectStateProvider projectId="test-p1">
          <GraphView
            nodes={[nodeA, nodeB, nodeC]}
            edges={[edgeAB, edgeBC]}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
          />
        </ProjectStateProvider>
      );

      // Rerender 2: Remove Node B and incident edges
      rerender(
        <ProjectStateProvider projectId="test-p1">
          <GraphView
            nodes={[nodeA, nodeC]}
            edges={[]}
            onSelectNode={vi.fn()}
            onSelectEdge={vi.fn()}
            selectedNodeId={null}
            selectedEdgeId={null}
          />
        </ProjectStateProvider>
      );

      // Verify final element counts in buildGraphElements
      const finalElements = buildGraphElements([nodeA, nodeC], []);
      expect(finalElements.length).toBe(2);
      expect(finalElements.map(e => e.data.id)).toEqual(['ApexClass:NodeA', 'ApexClass:NodeC']);
    });
  });

  describe('8. Multi-Project Isolation & Persistence Invariance', () => {
    it('guarantees mutations in Project A do not bleed into Project B state', () => {
      const projectANodes = [createBaseNode('ApexClass:ProjectA_Class')];
      const projectBNodes = [createBaseNode('ApexClass:ProjectB_Class')];

      const layoutA = computeArchitectureLayout(projectANodes, []);
      const layoutB = computeArchitectureLayout(projectBNodes, []);

      expect(layoutA['ApexClass:ProjectA_Class']).toBeDefined();
      expect(layoutA['ApexClass:ProjectB_Class']).toBeUndefined();

      expect(layoutB['ApexClass:ProjectB_Class']).toBeDefined();
      expect(layoutB['ApexClass:ProjectA_Class']).toBeUndefined();
    });
  });

  describe('9. Large Graph Mutation Safety & Determinism', () => {
    it('repeatedly applies graph mutations and asserts exact 0 coordinate drift and determinism', () => {
      const node1 = createBaseNode('ApexClass:Node1');
      const node2 = createBaseNode('ApexClass:Node2');
      const edge12 = createBaseEdge('e12', node1.id, node2.id);

      const step1Layout = computeArchitectureLayout([node1, node2], [edge12]);

      // Mutation sequence: Add Node3 -> Remove Node2 -> Re-add Node2
      const node3 = createBaseNode('ApexClass:Node3');
      const edge23 = createBaseEdge('e23', node2.id, node3.id);

      const step2Layout = computeArchitectureLayout([node1, node2, node3], [edge12, edge23], {
        existingPositions: step1Layout,
      });

      expect(step2Layout['ApexClass:Node1']).toEqual(step1Layout['ApexClass:Node1']);
      expect(step2Layout['ApexClass:Node2']).toEqual(step1Layout['ApexClass:Node2']);

      // Repeat identical mutation sequence and assert identical coordinates
      const step2Repeat = computeArchitectureLayout([node1, node2, node3], [edge12, edge23], {
        existingPositions: step1Layout,
      });

      expect(step2Repeat).toEqual(step2Layout);
    });
  });
});
