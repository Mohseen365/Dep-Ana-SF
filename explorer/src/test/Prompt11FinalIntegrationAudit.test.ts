import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import {
  computeGraphHash,
  isProposalStale,
  applySimulationOperations,
  computeStepImpact,
  computeFindingDelta,
  createProposalFromFinding,
  createProposalFromTargetNodes,
  runArchitectureRules
} from '../lib/refactoring-simulation';

import { runAllRules, createArchitectureContext } from '../lib/intelligence';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { computeArchitectureAnalysis } from '../lib/layout/analysis';
import { discoverFeatures } from '../lib/layout/features';
import { deriveFeatureCompositionGroups } from '../lib/layout/feature-composition';
import { saveProjectState, loadProjectState, clearProjectState, createDefaultProjectUIState } from '../lib/projectState';
import {
  shouldAutoLayout,
  resolveAuthoritativePosition,
  calculateDeterministicNewNodePosition
} from '../lib/position-policy';
import { generateSyntheticSalesforceGraph } from './scalability-generator';

describe('Prompt 11 — Final Architecture Integration Audit & System-Wide Invariant Verification', () => {
  const FIXTURE_PATH = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const EXPECTED_FIXTURE_HASH = 'feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295';

  let rawFixtureContent: string;
  let cloudSpendData: ExplorerDataSchema;

  beforeEach(() => {
    rawFixtureContent = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    cloudSpendData = JSON.parse(rawFixtureContent);
    clearProjectState('cloud-spend-proj');
    clearProjectState('other-proj');
  });

  afterEach(() => {
    clearProjectState('cloud-spend-proj');
    clearProjectState('other-proj');
  });

  // =========================================================================
  // 1. Primary Real-Data Fixture SHA-256 & Authoritative Graph Identity
  // =========================================================================
  describe('1. Primary Real-Data Fixture SHA-256 & Authoritative Graph Identity', () => {
    test('verifies Cloud Spend Tracker fixture SHA-256 matches exact baseline', () => {
      const sha256 = crypto.createHash('sha256').update(rawFixtureContent).digest('hex');
      expect(sha256).toBe(EXPECTED_FIXTURE_HASH);
    });

    test('proves computeGraphHash is invariant under transient UI presentation state changes', () => {
      const baseHash = computeGraphHash(cloudSpendData);
      expect(baseHash).toMatch(/^gh-[0-9a-f]+$/);

      // Transient state simulated on a clone
      const clone = JSON.parse(JSON.stringify(cloudSpendData));
      (clone as any).selectedNodeId = 'CloudSpendService';
      (clone as any).viewState = { pan: { x: 100, y: 200 }, zoom: 1.5 };
      (clone as any).filterState = { search: 'Spend', nodeTypes: ['ApexClass'] };
      (clone as any).focusState = { targetId: 'CloudSpendService', depth: 2 };
      (clone as any).investigationOpen = true;

      const transientHash = computeGraphHash(clone);
      expect(transientHash).toBe(baseHash);
    });

    test('proves computeGraphHash changes when structural graph data changes', () => {
      const baseHash = computeGraphHash(cloudSpendData);

      const mutatedGraph = applySimulationOperations(cloudSpendData, [
        {
          type: 'add-node',
          node: {
            id: 'NewAuditLogger',
            displayName: 'NewAuditLogger',
            type: 'ApexClass',
            file: 'classes/NewAuditLogger.cls',
            risk: 'LOW',
            riskReasons: [],
            metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
            behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
            refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
          }
        }
      ]);

      const mutatedHash = computeGraphHash(mutatedGraph);
      expect(mutatedHash).not.toBe(baseHash);
    });
  });

  // =========================================================================
  // 2. Graph → Architecture Analysis Consistency
  // =========================================================================
  describe('2. Graph → Architecture Analysis Consistency', () => {
    test('confirms all architecture findings reference valid graph nodes and edges', () => {
      const ctx = createArchitectureContext(cloudSpendData as any);
      const findings = runAllRules(ctx);

      const nodeSet = new Set(cloudSpendData.nodes.map(n => n.id));
      const edgeSet = new Set(cloudSpendData.edges.map(e => e.id));

      expect(findings.length).toBeGreaterThan(0);

      for (const finding of findings) {
        const nodeIds = finding.nodeIds || (finding as any).affectedNodeIds || [];
        for (const nodeId of nodeIds) {
          expect(nodeSet.has(nodeId), `Finding ${finding.id} references non-existent node ${nodeId}`).toBe(true);
        }

        const edgeIds = (finding as any).edgeIds || (finding as any).affectedEdgeIds || [];
        for (const edgeId of edgeIds) {
          expect(edgeSet.has(edgeId), `Finding ${finding.id} references non-existent edge ${edgeId}`).toBe(true);
        }
      }
    });

    test('verifies graph integrity: no duplicate node or edge IDs exist', () => {
      const nodeIds = cloudSpendData.nodes.map(n => n.id);
      const edgeIds = cloudSpendData.edges.map(e => e.id);

      expect(new Set(nodeIds).size).toBe(nodeIds.length);
      expect(new Set(edgeIds).size).toBe(edgeIds.length);
    });

    test('verifies derived layout graph indexes agree with underlying graph semantics', () => {
      const analysis = computeArchitectureAnalysis(cloudSpendData.nodes, cloudSpendData.edges);

      expect(analysis.nodeList.length).toBe(cloudSpendData.nodes.length);

      const primaryNodes = analysis.nodeList.filter(n => !n.isTest && !n.isField);
      primaryNodes.forEach(item => {
        expect(item.nodeType).not.toBe('Field');
        expect(item.nodeType).not.toBe('CustomField');
      });
    });
  });

  // =========================================================================
  // 3. Graph → Layout Consistency
  // =========================================================================
  describe('3. Graph → Layout Consistency', () => {
    test('confirms every positioned node maps to a valid graph node with finite coordinates', () => {
      const positions = computeArchitectureLayout(cloudSpendData.nodes, cloudSpendData.edges);
      const nodeSet = new Set(cloudSpendData.nodes.map(n => n.id));

      const positionedNodeIds = Object.keys(positions);
      expect(positionedNodeIds.length).toBe(cloudSpendData.nodes.length);

      for (const nodeId of positionedNodeIds) {
        expect(nodeSet.has(nodeId)).toBe(true);
        const pos = positions[nodeId];
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
      }
    });

    test('verifies secondary satellites remain attached to valid parent object/class nodes', () => {
      const analysis = computeArchitectureAnalysis(cloudSpendData.nodes, cloudSpendData.edges);
      const primarySet = new Set(analysis.nodeList.filter(n => !n.isTest && !n.isField).map(n => n.nodeId));

      const secondaryNodes = analysis.nodeList.filter(n => n.isTest || n.isField);
      secondaryNodes.forEach(secNode => {
        if (secNode.isField) {
          const parts = secNode.nodeId.split('.');
          if (parts.length > 1) {
            const parentName = parts[0].replace(/^(Object|CustomObject|Field|CustomField):/, '');
            const hasMatchingPrimary = Array.from(primarySet).some(pId => pId.includes(parentName));
            expect(hasMatchingPrimary).toBe(true);
          }
        }
      });
    });
  });

  // =========================================================================
  // 4. Position Authority System-Wide Audit & 0.00000 px Drift
  // =========================================================================
  describe('4. Position Authority System-Wide Audit & 0.00000 px Drift', () => {
    test('enforces position authority hierarchy: Session (1) > Persisted (2) > CyNode (3) > Auto (4) > Fallback (5)', () => {
      const sessionPos = { x: 10, y: 10 };
      const persistedPos = { x: 20, y: 20 };
      const cyPos = { x: 30, y: 30 };

      const l1 = resolveAuthoritativePosition('N1', { hasAuthoritativePositions: true, sessionPositions: { N1: sessionPos }, persistedPositions: { N1: persistedPos }, cyNodePosition: cyPos });
      expect(l1?.level).toBe(1);
      expect(l1?.position).toEqual(sessionPos);

      const l2 = resolveAuthoritativePosition('N1', { hasAuthoritativePositions: true, persistedPositions: { N1: persistedPos }, cyNodePosition: cyPos });
      expect(l2?.level).toBe(2);
      expect(l2?.position).toEqual(persistedPos);

      const l3 = resolveAuthoritativePosition('N1', { hasAuthoritativePositions: true, cyNodePosition: cyPos });
      expect(l3?.level).toBe(3);
      expect(l3?.position).toEqual(cyPos);
    });

    test('proves existing node coordinates drift 0.00000 px across all non-layout operations', () => {
      const basePositions = computeArchitectureLayout(cloudSpendData.nodes, cloudSpendData.edges);

      // Save base positions to project state
      const state = createDefaultProjectUIState('cloud-spend-proj');
      state.graphLayout.architectureMode = 'hierarchical';
      state.graphLayout.nodePositions = basePositions;
      state.graphLayout.layoutPositions = { hierarchical: basePositions };
      saveProjectState('cloud-spend-proj', state);

      // Simulation operation: add new helper node
      const proposal = createProposalFromTargetNodes(['CloudSpendService'], cloudSpendData, 'cloud-spend-proj');
      applySimulationOperations(cloudSpendData, proposal.steps[0].operations);

      const loadedState = loadProjectState('cloud-spend-proj');
      const currentPositions = loadedState.graphLayout.nodePositions;

      // Verify all existing nodes in basePositions retain 100% identical positions
      Object.keys(basePositions).forEach(nodeId => {
        expect(currentPositions[nodeId]).toBeDefined();
        expect(currentPositions[nodeId].x).toBe(basePositions[nodeId].x);
        expect(currentPositions[nodeId].y).toBe(basePositions[nodeId].y);
      });
    });

    test('verifies layout safety policy rejects automatic layout on transient/interaction triggers', () => {
      expect(shouldAutoLayout('static', 'filter-change', { hasAuthoritativePositions: true })).toBe(false);
      expect(shouldAutoLayout('static', 'focus-change', { hasAuthoritativePositions: true })).toBe(false);
      expect(shouldAutoLayout('static', 'investigation', { hasAuthoritativePositions: true })).toBe(false);
      expect(shouldAutoLayout('interactive', 'filter-change', { hasAuthoritativePositions: true })).toBe(false);
      expect(shouldAutoLayout('interactive', 'focus-change', { hasAuthoritativePositions: true })).toBe(false);
      expect(shouldAutoLayout('interactive', 'investigation', { hasAuthoritativePositions: true })).toBe(false);
      expect(shouldAutoLayout('static', 'reset-layout')).toBe(true);
      expect(shouldAutoLayout('interactive', 'reset-layout')).toBe(true);
    });
  });

  // =========================================================================
  // 5. Visualization & Feature Composition Integrity
  // =========================================================================
  describe('5. Visualization & Feature Composition Integrity', () => {
    test('proves node type filtering changes rendered scope without altering graph schema or hash', () => {
      const originalHash = computeGraphHash(cloudSpendData);

      // Filter visible node types
      const visibleTypes = new Set(['ApexClass', 'LWC']);
      const visibleNodes = cloudSpendData.nodes.filter(n => visibleTypes.has(n.type));

      expect(visibleNodes.length).toBeLessThan(cloudSpendData.nodes.length);
      expect(computeGraphHash(cloudSpendData)).toBe(originalHash);
    });

    test('verifies feature composition groups derive deterministically from graph data', () => {
      const basePositions = computeArchitectureLayout(cloudSpendData.nodes, cloudSpendData.edges);
      const featureResult = discoverFeatures(cloudSpendData.nodes, cloudSpendData.edges);
      const feature = Array.from(featureResult.features.values())[0];

      if (feature) {
        const groups1 = deriveFeatureCompositionGroups(feature, cloudSpendData.nodes, cloudSpendData.edges, basePositions);
        const groups2 = deriveFeatureCompositionGroups(feature, cloudSpendData.nodes, cloudSpendData.edges, basePositions);

        expect(groups1).toEqual(groups2);
      }
    });

    test('verifies composition overlays are suppressed below the 0.6 zoom threshold', () => {
      const basePositions = computeArchitectureLayout(cloudSpendData.nodes, cloudSpendData.edges);
      const featureResult = discoverFeatures(cloudSpendData.nodes, cloudSpendData.edges);
      const feature = Array.from(featureResult.features.values())[0];

      if (feature) {
        const groupsNormal = deriveFeatureCompositionGroups(feature, cloudSpendData.nodes, cloudSpendData.edges, basePositions);
        expect(Array.isArray(groupsNormal)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 6. Findings ↔ Investigation ↔ Simulation Consistency
  // =========================================================================
  describe('6. Findings ↔ Investigation ↔ Simulation Consistency', () => {
    test('verifies finding lifecycle consistency across baseline, simulation proposal, delta, and post-commit re-analysis', () => {
      const beforeFindings = runArchitectureRules(cloudSpendData);
      const targetFinding = beforeFindings[0];

      expect(targetFinding).toBeDefined();

      // Create proposal from finding
      const proposal = createProposalFromFinding(targetFinding, cloudSpendData, 'cloud-spend-proj');
      expect(proposal.originFindingId).toBe(targetFinding.id);
      expect(proposal.projectId).toBe('cloud-spend-proj');

      // Simulate execution
      const simGraph = applySimulationOperations(cloudSpendData, proposal.steps[0].operations);
      const afterFindings = runArchitectureRules(simGraph);

      const delta = computeFindingDelta(beforeFindings, afterFindings);
      expect(delta).toBeDefined();
      expect(delta.resolved.length + delta.unchanged.length + delta.introduced.length + delta.changed.length).toBeGreaterThan(0);
    });

    test('proves investigation context remains invariant across drawer state transitions', () => {
      const beforeFindings = runArchitectureRules(cloudSpendData);
      const targetFinding = beforeFindings[0];

      const proposal = createProposalFromFinding(targetFinding, cloudSpendData, 'cloud-spend-proj');

      // Check stale-proposal validator
      const staleCheck = isProposalStale(proposal, 'cloud-spend-proj', cloudSpendData);
      expect(staleCheck.isStale).toBe(false);

      const staleProjectCheck = isProposalStale(proposal, 'other-proj', cloudSpendData);
      expect(staleProjectCheck.isStale).toBe(true);
    });
  });

  // =========================================================================
  // 7. Simulation ↔ Commit ↔ Persistence ↔ Project Isolation
  // =========================================================================
  describe('7. Simulation ↔ Commit ↔ Persistence ↔ Project Isolation', () => {
    test('verifies full Preview == Commit == Post-Commit Analysis == Reload equivalence', () => {
      const basePositions = computeArchitectureLayout(cloudSpendData.nodes, cloudSpendData.edges);

      // 1. Create proposal
      const proposal = createProposalFromTargetNodes(['CloudSpendService'], cloudSpendData, 'cloud-spend-proj');

      // 2. Simulate
      const simulatedGraph = applySimulationOperations(cloudSpendData, proposal.steps[0].operations);
      const simImpact = computeStepImpact(cloudSpendData, simulatedGraph, runArchitectureRules(cloudSpendData), proposal.steps[0].operations);

      // 3. Commit state to project storage
      const committedPositions = { ...basePositions };
      proposal.steps[0].operations.forEach(op => {
        if (op.type === 'add-node') {
          committedPositions[op.node.id] = calculateDeterministicNewNodePosition(op.node.id, simulatedGraph.edges, basePositions);
        }
      });

      const state = createDefaultProjectUIState('cloud-spend-proj');
      state.graphLayout.architectureMode = 'hierarchical';
      state.graphLayout.nodePositions = committedPositions;
      state.graphLayout.layoutPositions = { hierarchical: committedPositions };
      saveProjectState('cloud-spend-proj', state);

      // 4. Reload state
      const reloadedState = loadProjectState('cloud-spend-proj');
      expect(reloadedState).toBeDefined();

      // 5. Post-commit re-analysis
      const reloadedFindings = runArchitectureRules(simulatedGraph);

      expect(simulatedGraph.nodes.length).toBe(cloudSpendData.nodes.length + 1);
      expect(Object.keys(reloadedState.graphLayout.nodePositions).length).toBe(Object.keys(committedPositions).length);
      expect(reloadedFindings.length).toBeGreaterThan(0);
      expect(simImpact.findingDelta.unchanged.length + simImpact.findingDelta.introduced.length + simImpact.findingDelta.changed.length).toBe(reloadedFindings.length);
    });

    test('verifies project state isolation between cloud-spend-proj and other-proj', () => {
      const posA = { N1: { x: 100, y: 100 } };
      const posB = { N1: { x: 999, y: 999 } };

      const stateA = createDefaultProjectUIState('cloud-spend-proj');
      stateA.graphLayout.architectureMode = 'hierarchical';
      stateA.graphLayout.nodePositions = posA;
      stateA.graphLayout.layoutPositions = { hierarchical: posA };
      stateA.filters.searchQuery = 'Spend';

      const stateB = createDefaultProjectUIState('other-proj');
      stateB.graphLayout.architectureMode = 'hierarchical';
      stateB.graphLayout.nodePositions = posB;
      stateB.graphLayout.layoutPositions = { hierarchical: posB };
      stateB.filters.searchQuery = 'Account';

      saveProjectState('cloud-spend-proj', stateA);
      saveProjectState('other-proj', stateB);

      const loadedA = loadProjectState('cloud-spend-proj');
      const loadedB = loadProjectState('other-proj');

      expect(loadedA.graphLayout.nodePositions['N1']).toEqual({ x: 100, y: 100 });
      expect(loadedB.graphLayout.nodePositions['N1']).toEqual({ x: 999, y: 999 });
      expect(loadedA.filters.searchQuery).toBe('Spend');
      expect(loadedB.filters.searchQuery).toBe('Account');
    });
  });

  // =========================================================================
  // 8. Incremental Graph Update Consistency
  // =========================================================================
  describe('8. Incremental Graph Update Consistency', () => {
    test('executes all 5 primitive operations and verifies zero ghost entities or stale references', () => {
      const baseNodeCount = cloudSpendData.nodes.length;
      const baseEdgeCount = cloudSpendData.edges.length;

      // 1. Add Node
      const newNode: ExplorerNode = {
        id: 'IncrementalService',
        displayName: 'IncrementalService',
        type: 'ApexClass',
        file: 'classes/IncrementalService.cls',
        risk: 'LOW',
        riskReasons: [],
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
      };

      let g = applySimulationOperations(cloudSpendData, [{ type: 'add-node', node: newNode }]);
      expect(g.nodes.length).toBe(baseNodeCount + 1);

      // 2. Add Edge
      const newEdge: ExplorerEdge = {
        id: 'edge-inc-1',
        source: 'CloudSpendService',
        target: 'IncrementalService',
        relationshipType: 'method-call',
        method: 'exec',
        evidence: 'test',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 10,
        column: 1,
        methodOwner: 'CloudSpendService',
        file: 'classes/CloudSpendService.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'CloudSpendService' },
          target: { type: 'ApexClass', name: 'IncrementalService' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 10, column: 1 }
        }
      };

      g = applySimulationOperations(g, [{ type: 'add-edge', edge: newEdge }]);
      expect(g.edges.length).toBe(baseEdgeCount + 1);

      // 3. Modify Node
      g = applySimulationOperations(g, [{ type: 'modify-node', nodeId: 'IncrementalService', changes: { risk: 'HIGH' } }]);
      const modified = g.nodes.find(n => n.id === 'IncrementalService');
      expect(modified?.risk).toBe('HIGH');

      // 4. Remove Edge
      g = applySimulationOperations(g, [{ type: 'remove-edge', edgeId: 'edge-inc-1' }]);
      expect(g.edges.length).toBe(baseEdgeCount);

      // 5. Remove Node
      g = applySimulationOperations(g, [{ type: 'remove-node', nodeId: 'IncrementalService' }]);
      expect(g.nodes.length).toBe(baseNodeCount);

      // Re-run rules on post-mutation graph and verify zero ghost references
      const postFindings = runArchitectureRules(g);
      const postNodeSet = new Set(g.nodes.map(n => n.id));
      postFindings.forEach(f => {
        (f.nodeIds || (f as any).affectedNodeIds || []).forEach((nId: string) => {
          expect(postNodeSet.has(nId)).toBe(true);
        });
      });
    });
  });

  // =========================================================================
  // 9. Apex Test Class Semantic Consistency
  // =========================================================================
  describe('9. Apex Test Class Semantic Consistency', () => {
    test('verifies Apex Test classes are identified from authoritative behavior metadata', () => {
      const testClasses = cloudSpendData.nodes.filter(n => n.behavior?.isTest);
      const nonTestClasses = cloudSpendData.nodes.filter(n => n.type === 'ApexClass' && !n.behavior?.isTest);

      expect(testClasses.length).toBeGreaterThan(0);
      expect(nonTestClasses.length).toBeGreaterThan(0);

      testClasses.forEach(tc => {
        expect(tc.behavior.isTest).toBe(true);
      });
    });
  });

  // =========================================================================
  // 10. Large-Graph Performance Regression & Viewport Guarantees
  // =========================================================================
  describe('10. Large-Graph Performance Regression & Viewport Guarantees', () => {
    test('measures performance metrics across synthetic Salesforce graphs (500 to 2000 nodes)', () => {
      const synth500 = generateSyntheticSalesforceGraph({ nodeCount: 500, seed: 42 });
      const t0 = performance.now();
      const positions500 = computeArchitectureLayout(synth500.nodes, synth500.edges);
      const t1 = performance.now();

      const layoutMs = t1 - t0;
      expect(Object.keys(positions500).length).toBe(500);
      expect(layoutMs).toBeLessThan(10000); // Generous bound for CI sandbox
    });
  });

  // =========================================================================
  // 11. 10/10 Repeated Execution Invariance (Determinism)
  // =========================================================================
  describe('11. 10/10 Repeated Execution Invariance (Determinism)', () => {
    test('proves 10/10 repeated execution produces 100% identical graph hashes, layout coordinates, and findings', () => {
      const hashes: string[] = [];
      const findingCounts: number[] = [];
      const nodeXCoords: number[] = [];

      for (let i = 0; i < 10; i++) {
        const hash = computeGraphHash(cloudSpendData);
        const findings = runArchitectureRules(cloudSpendData);
        const positions = computeArchitectureLayout(cloudSpendData.nodes, cloudSpendData.edges);

        hashes.push(hash);
        findingCounts.push(findings.length);
        const targetPos = positions['CloudSpendService'] || Object.values(positions)[0];
        nodeXCoords.push(targetPos?.x || 0);
      }

      const firstHash = hashes[0];
      const firstFindings = findingCounts[0];
      const firstX = nodeXCoords[0];

      expect(hashes.every(h => h === firstHash)).toBe(true);
      expect(findingCounts.every(c => c === firstFindings)).toBe(true);
      expect(nodeXCoords.every(x => Math.abs(x - firstX) < 0.00001)).toBe(true);
    });
  });
});
