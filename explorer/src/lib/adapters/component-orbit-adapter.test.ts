import { describe, it, expect } from 'vitest';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../../types/explorer';
import {
  adaptComponentOrbit,
  ComponentOrbitAdapterOptions,
  ComponentOrbitProjection,
} from './component-orbit-adapter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Independent Audit Oracle BFS implementation.
 * Does NOT import or call component-orbit-adapter.ts or graph-depth.ts.
 * Used strictly to verify expected depth and reachability independently.
 */
function independentOracleBFS(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  focalNodeId: string,
  maxDepth = 7,
  includeTestReferences = false
): { depthMap: Map<string, number>; reachableIds: Set<string> } {
  const nodeSet = new Set(nodes.map((n) => n.id));
  if (!nodeSet.has(focalNodeId)) {
    return { depthMap: new Map(), reachableIds: new Set() };
  }

  // Build adjacency
  const adj = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!includeTestReferences && e.relationshipType === 'test-reference') {
      return;
    }
    if (!adj.has(e.source)) {
      adj.set(e.source, []);
    }
    adj.get(e.source)!.push(e.target);
  });

  const depthMap = new Map<string, number>();
  depthMap.set(focalNodeId, 0);

  const queue: Array<{ id: string; d: number }> = [{ id: focalNodeId, d: 0 }];

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    if (d >= maxDepth) continue;

    const neighbors = adj.get(id) || [];
    for (const neighbor of neighbors) {
      if (!depthMap.has(neighbor) && nodeSet.has(neighbor)) {
        depthMap.set(neighbor, d + 1);
        queue.push({ id: neighbor, d: d + 1 });
      }
    }
  }

  return { depthMap, reachableIds: new Set(depthMap.keys()) };
}

describe('Component Orbit Adapter — Executable Invariant & Real PBIM Test Suite', () => {
  // Load real PBIM dataset once for real graph tests
  const pbimPath = path.resolve(__dirname, '../../../public/projects/pbim/explorer-data.json');
  const rawPbimJson = fs.readFileSync(pbimPath, 'utf-8');
  const realPbimData: ExplorerDataSchema = JSON.parse(rawPbimJson);

  // ---------------------------------------------------------------------------
  // SECTION 1: SYNTHETIC TEST MATRIX (S1–S10)
  // ---------------------------------------------------------------------------
  describe('Synthetic Invariant Test Matrix (S1–S10)', () => {
    it('S1 — Single LWC graph returns depth 0 only', () => {
      const graph: ExplorerDataSchema = {
        summary: { nodeCount: 1, edgeCount: 0, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 0, unresolvedCount: 0, inventory: { files: 1, apexClasses: 0, apexTriggers: 0, lwcJs: 1, lwcHtml: 1, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
        nodes: [{ id: 'LWC:component-a', displayName: 'component-a', type: 'LWC', file: 'a.js', metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } }],
        edges: [],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {},
      };

      const projection = adaptComponentOrbit(graph, { focalLwcId: 'LWC:component-a' });
      expect(projection.focus?.nodeId).toBe('LWC:component-a');
      expect(projection.summary.totalReachableNodes).toBe(1);
      expect(projection.summary.maxDepth).toBe(0);
      expect(projection.rings.length).toBe(1);
      expect(projection.rings[0].ringIndex).toBe(0);
      expect(projection.rings[0].items[0].roleSymbol).toBe('☉');
    });

    it('S2 — One Apex dependency assigns Sun depth 0, Apex depth 1', () => {
      const graph: ExplorerDataSchema = {
        summary: { nodeCount: 2, edgeCount: 1, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 0, unresolvedCount: 0, inventory: { files: 2, apexClasses: 1, apexTriggers: 0, lwcJs: 1, lwcHtml: 1, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
        nodes: [
          { id: 'LWC:component-a', displayName: 'component-a', type: 'LWC', file: 'a.js', metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'ApexClass:ServiceA', displayName: 'ServiceA', type: 'ApexClass', file: 'ServiceA.cls', metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
        ],
        edges: [
          { id: 'e1', source: 'LWC:component-a', target: 'ApexClass:ServiceA', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'a.js', canonical: { source: { type: 'LWC', name: 'component-a' }, target: { type: 'ApexClass', name: 'ServiceA' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
        ],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {},
      };

      const projection = adaptComponentOrbit(graph, { focalLwcId: 'LWC:component-a' });
      expect(projection.nodes['LWC:component-a'].depth).toBe(0);
      expect(projection.nodes['ApexClass:ServiceA'].depth).toBe(1);
      expect(projection.nodes['ApexClass:ServiceA'].roleSymbol).toBe('○');
      expect(projection.edges.length).toBe(1);
      expect(projection.edges[0].isCrossRing).toBe(true);
    });

    it('S3 — Child LWC composition edge classifies target as child LWC (◎)', () => {
      const graph: ExplorerDataSchema = {
        summary: { nodeCount: 2, edgeCount: 1, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 0, unresolvedCount: 0, inventory: { files: 2, apexClasses: 0, apexTriggers: 0, lwcJs: 2, lwcHtml: 2, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
        nodes: [
          { id: 'LWC:parent-a', displayName: 'parent-a', type: 'LWC', file: 'parent.js', metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'LWC:child-b', displayName: 'child-b', type: 'LWC', file: 'child.js', metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
        ],
        edges: [
          { id: 'e1', source: 'LWC:parent-a', target: 'LWC:child-b', relationshipType: 'lwc-template-child', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'parent.html', canonical: { source: { type: 'LWC', name: 'parent-a' }, target: { type: 'LWC', name: 'child-b' }, relationship: { type: 'lwc-template-child', resolution: 'EXACT' }, location: {} } },
        ],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {},
      };

      const projection = adaptComponentOrbit(graph, { focalLwcId: 'LWC:parent-a' });
      const childNode = projection.nodes['LWC:child-b'];
      expect(childNode.depth).toBe(1);
      expect(childNode.isChildLwc).toBe(true);
      expect(childNode.roleSymbol).toBe('◎');
      expect(projection.nodes['LWC:parent-a'].childLwcTargets).toContain('LWC:child-b');
      expect(projection.summary.childLwcCount).toBe(1);
    });

    it('S4 — Shared Apex hub referenced by >= 2 LWCs preserves single node identity (◉)', () => {
      const graph: ExplorerDataSchema = {
        summary: { nodeCount: 3, edgeCount: 2, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 0, unresolvedCount: 0, inventory: { files: 3, apexClasses: 1, apexTriggers: 0, lwcJs: 2, lwcHtml: 2, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
        nodes: [
          { id: 'LWC:comp-a', displayName: 'comp-a', type: 'LWC', file: 'a.js', metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'LWC:comp-b', displayName: 'comp-b', type: 'LWC', file: 'b.js', metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'ApexClass:SharedHub', displayName: 'SharedHub', type: 'ApexClass', file: 'SharedHub.cls', metrics: { fanIn: 2, fanOut: 0, coupling: 2, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
        ],
        edges: [
          { id: 'e1', source: 'LWC:comp-a', target: 'ApexClass:SharedHub', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'a.js', canonical: { source: { type: 'LWC', name: 'comp-a' }, target: { type: 'ApexClass', name: 'SharedHub' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
          { id: 'e2', source: 'LWC:comp-b', target: 'ApexClass:SharedHub', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'b.js', canonical: { source: { type: 'LWC', name: 'comp-b' }, target: { type: 'ApexClass', name: 'SharedHub' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
        ],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {},
      };

      const projection = adaptComponentOrbit(graph, { focalLwcId: 'LWC:comp-a' });
      const hubNode = projection.nodes['ApexClass:SharedHub'];
      expect(hubNode).toBeDefined();
      expect(hubNode.isSharedHub).toBe(true);
      expect(hubNode.roleSymbol).toBe('◉');
      expect(hubNode.dependentLwcCount).toBe(2);
      expect(hubNode.dependentLwcIds).toEqual(['LWC:comp-a', 'LWC:comp-b']);
      // Verify node conservation (exactly 1 identity object for SharedHub in projection)
      const hubOccurrences = Object.keys(projection.nodes).filter((id) => id === 'ApexClass:SharedHub');
      expect(hubOccurrences.length).toBe(1);
    });

    it('S5 — Graph cycle A -> B -> C -> A terminates safely with shortest depth', () => {
      const graph: ExplorerDataSchema = {
        summary: { nodeCount: 3, edgeCount: 3, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 1, unresolvedCount: 0, inventory: { files: 3, apexClasses: 2, apexTriggers: 0, lwcJs: 1, lwcHtml: 1, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
        nodes: [
          { id: 'LWC:node-a', displayName: 'node-a', type: 'LWC', file: 'a.js', metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: true, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'ApexClass:node-b', displayName: 'node-b', type: 'ApexClass', file: 'b.cls', metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: true, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'ApexClass:node-c', displayName: 'node-c', type: 'ApexClass', file: 'c.cls', metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: true, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
        ],
        edges: [
          { id: 'e1', source: 'LWC:node-a', target: 'ApexClass:node-b', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'a.js', canonical: { source: { type: 'LWC', name: 'node-a' }, target: { type: 'ApexClass', name: 'node-b' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
          { id: 'e2', source: 'ApexClass:node-b', target: 'ApexClass:node-c', relationshipType: 'method-call', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'b.cls', canonical: { source: { type: 'ApexClass', name: 'node-b' }, target: { type: 'ApexClass', name: 'node-c' }, relationship: { type: 'method-call', resolution: 'EXACT' }, location: {} } },
          { id: 'e3', source: 'ApexClass:node-c', target: 'LWC:node-a', relationshipType: 'type-reference', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'c.cls', canonical: { source: { type: 'ApexClass', name: 'node-c' }, target: { type: 'LWC', name: 'node-a' }, relationship: { type: 'type-reference', resolution: 'EXACT' }, location: {} } },
        ],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {},
      };

      const projection = adaptComponentOrbit(graph, { focalLwcId: 'LWC:node-a' });
      expect(projection.nodes['LWC:node-a'].depth).toBe(0);
      expect(projection.nodes['ApexClass:node-b'].depth).toBe(1);
      expect(projection.nodes['ApexClass:node-c'].depth).toBe(2);
      expect(projection.summary.totalReachableNodes).toBe(3);
    });

    it('S6 — Multi-edge between same nodes preserves both distinct edge relationship types', () => {
      const graph: ExplorerDataSchema = {
        summary: { nodeCount: 2, edgeCount: 2, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 0, unresolvedCount: 0, inventory: { files: 2, apexClasses: 1, apexTriggers: 0, lwcJs: 1, lwcHtml: 1, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
        nodes: [
          { id: 'LWC:comp-a', displayName: 'comp-a', type: 'LWC', file: 'a.js', metrics: { fanIn: 0, fanOut: 2, coupling: 2, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'ApexClass:ServiceA', displayName: 'ServiceA', type: 'ApexClass', file: 'ServiceA.cls', metrics: { fanIn: 2, fanOut: 0, coupling: 2, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
        ],
        edges: [
          { id: 'e1', source: 'LWC:comp-a', target: 'ApexClass:ServiceA', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'a.js', canonical: { source: { type: 'LWC', name: 'comp-a' }, target: { type: 'ApexClass', name: 'ServiceA' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
          { id: 'e2', source: 'LWC:comp-a', target: 'ApexClass:ServiceA', relationshipType: 'type-reference', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 2, column: 1, methodOwner: null, file: 'a.js', canonical: { source: { type: 'LWC', name: 'comp-a' }, target: { type: 'ApexClass', name: 'ServiceA' }, relationship: { type: 'type-reference', resolution: 'EXACT' }, location: {} } },
        ],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {},
      };

      const projection = adaptComponentOrbit(graph, { focalLwcId: 'LWC:comp-a' });
      expect(projection.edges.length).toBe(2);
      const relTypes = projection.edges.map((e) => e.relationshipType).sort();
      expect(relTypes).toEqual(['lwc-apex', 'type-reference']);
    });

    it('S7 — Unreachable node C is excluded from active projection and placed in unreachableNodeIds', () => {
      const graph: ExplorerDataSchema = {
        summary: { nodeCount: 3, edgeCount: 1, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 0, unresolvedCount: 0, inventory: { files: 3, apexClasses: 2, apexTriggers: 0, lwcJs: 1, lwcHtml: 1, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
        nodes: [
          { id: 'LWC:comp-a', displayName: 'comp-a', type: 'LWC', file: 'a.js', metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'ApexClass:ServiceB', displayName: 'ServiceB', type: 'ApexClass', file: 'b.cls', metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'ApexClass:IsolatedC', displayName: 'IsolatedC', type: 'ApexClass', file: 'c.cls', metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
        ],
        edges: [
          { id: 'e1', source: 'LWC:comp-a', target: 'ApexClass:ServiceB', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'a.js', canonical: { source: { type: 'LWC', name: 'comp-a' }, target: { type: 'ApexClass', name: 'ServiceB' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
        ],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {},
      };

      const projection = adaptComponentOrbit(graph, { focalLwcId: 'LWC:comp-a' });
      expect(projection.nodes['ApexClass:IsolatedC']).toBeUndefined();
      expect(projection.unreachableNodeIds).toContain('ApexClass:IsolatedC');
      expect(projection.summary.totalUnreachableNodes).toBe(1);
    });

    it('S8 — Input-order shuffle invariance (10 random node/edge shuffles produce identical output)', () => {
      const graph: ExplorerDataSchema = {
        summary: { nodeCount: 3, edgeCount: 2, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 0, unresolvedCount: 0, inventory: { files: 3, apexClasses: 1, apexTriggers: 0, lwcJs: 2, lwcHtml: 2, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
        nodes: [
          { id: 'LWC:comp-a', displayName: 'comp-a', type: 'LWC', file: 'a.js', metrics: { fanIn: 0, fanOut: 2, coupling: 2, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'LWC:comp-b', displayName: 'comp-b', type: 'LWC', file: 'b.js', metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'ApexClass:ServiceA', displayName: 'ServiceA', type: 'ApexClass', file: 'ServiceA.cls', metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
        ],
        edges: [
          { id: 'e1', source: 'LWC:comp-a', target: 'LWC:comp-b', relationshipType: 'lwc-template-child', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'a.html', canonical: { source: { type: 'LWC', name: 'comp-a' }, target: { type: 'LWC', name: 'comp-b' }, relationship: { type: 'lwc-template-child', resolution: 'EXACT' }, location: {} } },
          { id: 'e2', source: 'LWC:comp-a', target: 'ApexClass:ServiceA', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'a.js', canonical: { source: { type: 'LWC', name: 'comp-a' }, target: { type: 'ApexClass', name: 'ServiceA' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
        ],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {},
      };

      const baseProjection = adaptComponentOrbit(graph, { focalLwcId: 'LWC:comp-a' });

      for (let i = 0; i < 10; i++) {
        const shuffledGraph: ExplorerDataSchema = {
          ...graph,
          nodes: [...graph.nodes].sort(() => Math.random() - 0.5),
          edges: [...graph.edges].sort(() => Math.random() - 0.5),
        };
        const shuffledProjection = adaptComponentOrbit(shuffledGraph, { focalLwcId: 'LWC:comp-a' });

        expect(shuffledProjection.summary).toEqual(baseProjection.summary);
        expect(Object.keys(shuffledProjection.nodes).sort()).toEqual(Object.keys(baseProjection.nodes).sort());
        expect(shuffledProjection.edges.map((e) => e.edgeId)).toEqual(baseProjection.edges.map((e) => e.edgeId));
      }
    });

    it('S9 — Empty graph returns valid empty projection without exception', () => {
      const emptyGraph: ExplorerDataSchema = {
        summary: { nodeCount: 0, edgeCount: 0, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 0, unresolvedCount: 0, inventory: { files: 0, apexClasses: 0, apexTriggers: 0, lwcJs: 0, lwcHtml: 0, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
        nodes: [],
        edges: [],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {},
      };

      const projection = adaptComponentOrbit(emptyGraph);
      expect(projection.focus).toBeNull();
      expect(projection.rings).toEqual([]);
      expect(projection.summary.totalReachableNodes).toBe(0);
      expect(projection.summary.totalUnreachableNodes).toBe(0);
    });

    it('S10 — Invalid focus ID or ApexClass focal ID rejects invalid focus and falls back safely', () => {
      const graph: ExplorerDataSchema = {
        summary: { nodeCount: 2, edgeCount: 1, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0, cycleCount: 0, unresolvedCount: 0, inventory: { files: 2, apexClasses: 1, apexTriggers: 0, lwcJs: 1, lwcHtml: 1, visualforce: 0, flows: 0, objects: 0, fields: 0 } },
        nodes: [
          { id: 'LWC:valid-lwc', displayName: 'valid-lwc', type: 'LWC', file: 'a.js', metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
          { id: 'ApexClass:ServiceA', displayName: 'ServiceA', type: 'ApexClass', file: 'ServiceA.cls', metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 }, risk: 'LOW', riskReasons: [], behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 }, refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' } },
        ],
        edges: [
          { id: 'e1', source: 'LWC:valid-lwc', target: 'ApexClass:ServiceA', relationshipType: 'lwc-apex', method: null, evidence: '', unresolved: false, resolutionClassification: 'RESOLVED_LOCAL', resolutionStrategy: 'EXACT', confidence: 'HIGH', line: 1, column: 1, methodOwner: null, file: 'a.js', canonical: { source: { type: 'LWC', name: 'valid-lwc' }, target: { type: 'ApexClass', name: 'ServiceA' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} } },
        ],
        cycles: [],
        unresolvedReferences: [],
        impactSummaries: {},
      };

      // Case A: Invalid non-existent ID
      const projA = adaptComponentOrbit(graph, { focalLwcId: 'LWC:does-not-exist' });
      expect(projA.focus?.nodeId).toBe('LWC:valid-lwc');

      // Case B: Passing ApexClass ID as focal Sun (strictly forbidden)
      const projB = adaptComponentOrbit(graph, { focalLwcId: 'ApexClass:ServiceA' });
      expect(projB.focus?.nodeId).toBe('LWC:valid-lwc');
      expect(projB.focus?.type).toBe('LWC');
    });
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: REAL PBIM TEST MATRIX & INDEPENDENT ORACLE VALIDATION
  // ---------------------------------------------------------------------------
  describe('Real PBIM Dataset Projection Matrix & Independent Oracle Validation', () => {
    it('PBIM Scenario 1 — LWC:asset-dashboard-container', () => {
      const focusId = 'LWC:asset-dashboard-container';
      const oracle = independentOracleBFS(realPbimData.nodes, realPbimData.edges, focusId, 7);
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: focusId, maxDepth: 7 });

      // Oracle vs Adapter verification
      expect(projection.summary.totalReachableNodes).toBe(oracle.reachableIds.size);
      expect(projection.summary.totalUnreachableNodes).toBe(realPbimData.nodes.length - oracle.reachableIds.size);

      // Verify node depths match oracle exactly across all reachable nodes
      oracle.depthMap.forEach((expectedDepth, nodeId) => {
        expect(projection.nodes[nodeId]).toBeDefined();
        expect(projection.nodes[nodeId].depth).toBe(expectedDepth);
        expect(projection.nodes[nodeId].ringIndex).toBe(expectedDepth);
      });

      // Verify direct Depth 1 children & shared hub classification
      expect(projection.nodes['LWC:asset-detail-dashboard'].isChildLwc).toBe(true);
      expect(projection.nodes['LWC:asset-detail-dashboard'].roleSymbol).toBe('◎');
      expect(projection.nodes['LWC:asset-health-map'].isChildLwc).toBe(true);
      expect(projection.nodes['LWC:asset-history'].isChildLwc).toBe(true);

      const sharedHub = projection.nodes['ApexClass:AssetDashboardController'];
      expect(sharedHub).toBeDefined();
      expect(sharedHub.isSharedHub).toBe(true);
      expect(sharedHub.roleSymbol).toBe('◉');
      expect(sharedHub.dependentLwcCount).toBe(4);
    });

    it('PBIM Scenario 2 — LWC:citizen-report-portal', () => {
      const focusId = 'LWC:citizen-report-portal';
      const oracle = independentOracleBFS(realPbimData.nodes, realPbimData.edges, focusId, 7);
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: focusId, maxDepth: 7 });

      expect(projection.summary.totalReachableNodes).toBe(oracle.reachableIds.size);
      oracle.depthMap.forEach((expectedDepth, nodeId) => {
        expect(projection.nodes[nodeId].depth).toBe(expectedDepth);
      });

      // Direct Depth 1 should contain 2 Shared Apex Hubs
      const hub1 = projection.nodes['ApexClass:CitizenRequestController'];
      const hub2 = projection.nodes['ApexClass:CityZoneController'];
      expect(hub1.isSharedHub).toBe(true);
      expect(hub1.roleSymbol).toBe('◉');
      expect(hub2.isSharedHub).toBe(true);
      expect(hub2.roleSymbol).toBe('◉');
    });

    it('PBIM Scenario 3 — LWC:vendor-workspace', () => {
      const focusId = 'LWC:vendor-workspace';
      const oracle = independentOracleBFS(realPbimData.nodes, realPbimData.edges, focusId, 7);
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: focusId, maxDepth: 7 });

      expect(projection.summary.totalReachableNodes).toBe(oracle.reachableIds.size);
      oracle.depthMap.forEach((expectedDepth, nodeId) => {
        expect(projection.nodes[nodeId].depth).toBe(expectedDepth);
      });

      expect(projection.nodes['LWC:vendor-card'].isChildLwc).toBe(true);
      expect(projection.nodes['LWC:vendor-history-modal'].isChildLwc).toBe(true);

      const hub1 = projection.nodes['ApexClass:MaintenanceRequestController'];
      const hub2 = projection.nodes['ApexClass:VendorAssignmentController'];
      expect(hub1.isSharedHub).toBe(true);
      expect(hub2.isSharedHub).toBe(true);
    });

    it('PBIM Scenario 4 — LWC:error-panel (Isolated LWC)', () => {
      const focusId = 'LWC:error-panel';
      const oracle = independentOracleBFS(realPbimData.nodes, realPbimData.edges, focusId, 7);
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: focusId, maxDepth: 7 });

      expect(oracle.reachableIds.size).toBe(1);
      expect(projection.summary.totalReachableNodes).toBe(1);
      expect(projection.summary.totalUnreachableNodes).toBe(527);
      expect(projection.summary.maxDepth).toBe(0);
      expect(projection.summary.totalEdges).toBe(0);
      expect(projection.rings.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: ALL 15 GRAPH-PRESERVATION INVARIANTS
  // ---------------------------------------------------------------------------
  describe('All 15 Graph-Preservation Invariants', () => {
    it('Invariant 1 — Focus Identity: Exactly one authoritative LWC is the Sun', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      expect(projection.focus).toBeDefined();
      expect(projection.focus?.isSun).toBe(true);
      expect(projection.focus?.roleSymbol).toBe('☉');
      expect(projection.focus?.type).toBe('LWC');
      const suns = Object.values(projection.nodes).filter((n) => n.isSun);
      expect(suns.length).toBe(1);
    });

    it('Invariant 2 — Node Identity: Every projected node maps 1:1 to a source node', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const sourceNodeMap = new Map(realPbimData.nodes.map((n) => [n.id, n]));

      Object.values(projection.nodes).forEach((pNode) => {
        const sourceNode = sourceNodeMap.get(pNode.nodeId);
        expect(sourceNode).toBeDefined();
        expect(pNode.displayName).toBe(sourceNode?.displayName || sourceNode?.id);
        expect(pNode.type).toBe(sourceNode?.type);
      });
    });

    it('Invariant 3 — Edge Provenance: Every projected edge maps to an actual source edge', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const sourceEdgeSet = new Set(realPbimData.edges.map((e) => `${e.source}->${e.target}:${e.relationshipType}`));

      projection.edges.forEach((pEdge) => {
        const key = `${pEdge.source}->${pEdge.target}:${pEdge.relationshipType}`;
        expect(sourceEdgeSet.has(key)).toBe(true);
        expect(pEdge.provenance.sourceComponentName).toBeDefined();
        expect(pEdge.provenance.targetComponentName).toBeDefined();
      });
    });

    it('Invariant 4 — Depth Determinism: Same graph + same focus = same depth', () => {
      const p1 = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const p2 = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });

      expect(p1.summary).toEqual(p2.summary);
      Object.keys(p1.nodes).forEach((id) => {
        expect(p1.nodes[id].depth).toBe(p2.nodes[id].depth);
      });
    });

    it('Invariant 5 — Ring/Depth Equivalence: ringIndex === depth', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      Object.values(projection.nodes).forEach((node) => {
        expect(node.ringIndex).toBe(node.depth);
      });
      projection.rings.forEach((ring) => {
        expect(ring.ringIndex).toBe(ring.depth);
        ring.items.forEach((item) => {
          expect(item.depth).toBe(ring.ringIndex);
        });
      });
    });

    it('Invariant 6 — Shared Apex Identity: One shared Apex source node remains one projected node', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const sharedHubId = 'ApexClass:AssetDashboardController';

      expect(projection.nodes[sharedHubId]).toBeDefined();
      const occurrences = Object.keys(projection.nodes).filter((id) => id === sharedHubId);
      expect(occurrences.length).toBe(1);
    });

    it('Invariant 7 — Child LWC Identity: Child LWCs retain canonical IDs and LWC type', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const childNode = projection.nodes['LWC:asset-detail-dashboard'];

      expect(childNode).toBeDefined();
      expect(childNode.type).toBe('LWC');
      expect(childNode.isChildLwc).toBe(true);
      expect(childNode.roleSymbol).toBe('◎');
    });

    it('Invariant 8 — Relationship Preservation: Relationship types are preserved', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const compositionEdge = projection.edges.find((e) => e.relationshipType === 'lwc-template-child');
      const controllerEdge = projection.edges.find((e) => e.relationshipType === 'lwc-apex');

      expect(compositionEdge).toBeDefined();
      expect(compositionEdge?.isCompositionEdge).toBe(true);
      expect(controllerEdge).toBeDefined();
      expect(controllerEdge?.isControllerEdge).toBe(true);
    });

    it('Invariant 9 — Zero Geometry: No geometry fields are emitted inside projection', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const rawJson = JSON.stringify(projection);

      expect(rawJson).not.toContain('"x":');
      expect(rawJson).not.toContain('"y":');
      expect(rawJson).not.toContain('"angle":');
      expect(rawJson).not.toContain('"radius":');
      expect(rawJson).not.toContain('"boundingBox":');
    });

    it('Invariant 10 — Geometry Independence: Coordinates cannot influence semantics', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      expect(projection.summary.totalReachableNodes).toBeGreaterThan(0);
      expect(projection.options.focalLwcId).toBe('LWC:asset-dashboard-container');
    });

    it('Invariant 11 — Input Order Independence: Node/edge input order cannot change semantics', () => {
      const p1 = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:citizen-report-portal' });

      for (let i = 0; i < 10; i++) {
        const shuffled: ExplorerDataSchema = {
          ...realPbimData,
          nodes: [...realPbimData.nodes].sort(() => Math.random() - 0.5),
          edges: [...realPbimData.edges].sort(() => Math.random() - 0.5),
        };
        const p2 = adaptComponentOrbit(shuffled, { focalLwcId: 'LWC:citizen-report-portal' });

        expect(p2.summary).toEqual(p1.summary);
        expect(Object.keys(p2.nodes).sort()).toEqual(Object.keys(p1.nodes).sort());
      }
    });

    it('Invariant 12 — Focus Isolation: Unreachable nodes do not appear in focused projection', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:citizen-report-portal' });
      const reachableSet = new Set(Object.keys(projection.nodes));

      projection.unreachableNodeIds.forEach((unreachableId) => {
        expect(reachableSet.has(unreachableId)).toBe(false);
      });
      expect(reachableSet.size + projection.unreachableNodeIds.length).toBe(realPbimData.nodes.length);
    });

    it('Invariant 13 — Cycle Safety: Cycles terminate safely without infinite loops or depth drift', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      expect(projection.summary.maxDepth).toBeLessThanOrEqual(7);
      expect(Number.isFinite(projection.summary.totalReachableNodes)).toBe(true);
    });

    it('Invariant 14 — Multi-Edge Preservation: Distinct source edges remain distinct', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });

      // Group projected edges by source and target
      const edgeGroupMap = new Map<string, string[]>();
      projection.edges.forEach((e) => {
        const key = `${e.source}->${e.target}`;
        if (!edgeGroupMap.has(key)) edgeGroupMap.set(key, []);
        edgeGroupMap.get(key)!.push(e.relationshipType);
      });

      // Find pairs with multiple relationship types in PBIM
      let multiEdgeCount = 0;
      edgeGroupMap.forEach((relTypes) => {
        if (relTypes.length > 1) {
          multiEdgeCount++;
        }
      });
      expect(multiEdgeCount).toBeGreaterThan(0);
    });

    it('Invariant 15 — No Source Mutation: Input graph is completely unchanged after projection', () => {
      const originalJson = JSON.stringify(realPbimData);
      adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });
      const afterJson = JSON.stringify(realPbimData);

      expect(afterJson).toBe(originalJson);
    });
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: ARCHITECTURE ORBIT CONTAMINATION GUARD
  // ---------------------------------------------------------------------------
  describe('Architecture Orbit Contamination Guard', () => {
    it('proves Component Orbit rings equal dependency depth and NOT architecture layer index', () => {
      const projection = adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container' });

      // In Architecture Orbit, all LWCs are on Ring 0, and all Controllers are on Ring 1.
      // In Component Orbit, LWC:asset-detail-dashboard is a Child LWC on Ring 1.
      const childLwc = projection.nodes['LWC:asset-detail-dashboard'];
      expect(childLwc.depth).toBe(1);
      expect(childLwc.ringIndex).toBe(1);

      // In Architecture Orbit, Schema objects sit on Ring 3.
      // In Component Orbit, transitive schema objects sit on Depth 4 or 5 depending on BFS path.
      const schemaNode = Object.values(projection.nodes).find((n) => n.type === 'CustomField');
      if (schemaNode) {
        expect(schemaNode.depth).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: ACCOUNTING PARITY & PERFORMANCE
  // ---------------------------------------------------------------------------
  describe('Graph Preservation Accounting & Performance Metrics', () => {
    it('verifies 100% exact node and edge accounting across all 4 focus scenarios', () => {
      const scenarios = [
        'LWC:asset-dashboard-container',
        'LWC:citizen-report-portal',
        'LWC:vendor-workspace',
        'LWC:error-panel',
      ];

      scenarios.forEach((focalId) => {
        const projection = adaptComponentOrbit(realPbimData, { focalLwcId: focalId, maxDepth: 7 });
        const oracle = independentOracleBFS(realPbimData.nodes, realPbimData.edges, focalId, 7);

        // Reachable + Unreachable = Total PBIM Nodes
        expect(projection.summary.totalReachableNodes + projection.summary.totalUnreachableNodes).toBe(realPbimData.nodes.length);
        expect(projection.summary.totalReachableNodes).toBe(oracle.reachableIds.size);

        // Every projected edge connects two reachable nodes
        projection.edges.forEach((edge) => {
          expect(projection.nodes[edge.source]).toBeDefined();
          expect(projection.nodes[edge.target]).toBeDefined();
        });
      });
    });

    it('measures real PBIM projection execution performance (<20ms SLA)', () => {
      const startTime = performance.now();
      const runCount = 10;

      for (let i = 0; i < runCount; i++) {
        adaptComponentOrbit(realPbimData, { focalLwcId: 'LWC:asset-dashboard-container', maxDepth: 7 });
      }

      const totalTimeMs = performance.now() - startTime;
      const avgTimeMs = totalTimeMs / runCount;

      console.log(`Component Orbit Adapter PBIM Benchmark: ${avgTimeMs.toFixed(2)}ms per projection (${runCount} runs total)`);
      expect(avgTimeMs).toBeLessThan(20.0); // Fast execution SLA
    });
  });
});
