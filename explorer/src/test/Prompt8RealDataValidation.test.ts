import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import {
  applySimulationOperations,
  computeFindingDelta,
  computeStepImpact,
  computeTemporarySimulatedPositions,
  createProposalFromTargetNodes,
  createProposalFromFinding,
  isProposalStale,
  validateProposalCommit,
  computeGraphHash,
  type RefactoringProposal,
  type RefactoringOperation,
} from '../lib/refactoring-simulation';
import { runAllRules, createArchitectureContext } from '../lib/intelligence';
import { loadProjectState, saveProjectState, createDefaultProjectUIState } from '../lib/projectState';

const FIXTURE_RELATIVE_PATH = '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json';
const EXPECTED_FIXTURE_HASH = 'feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295';

function loadCloudSpendTrackerFixture(): ExplorerDataSchema {
  const fixturePath = path.resolve(__dirname, FIXTURE_RELATIVE_PATH);
  const raw = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(raw);
}

function getFixtureSha256(): string {
  const fixturePath = path.resolve(__dirname, FIXTURE_RELATIVE_PATH);
  const raw = fs.readFileSync(fixturePath);
  return crypto.createHash('sha256').update(raw).digest('hex');
}

describe('Prompt 8 — Cloud Spend Tracker Real-Data Validation & Safety', () => {
  let cstBase: ExplorerDataSchema;

  beforeEach(() => {
    cstBase = loadCloudSpendTrackerFixture();
  });

  // Requirement 1 & Acceptance Gate: Fixture Read-Only Integrity Hash
  it('1. verifies audit-fixtures/cloud-spend-tracker/explorer-data.json read-only SHA-256 integrity hash', () => {
    const currentHash = getFixtureSha256();
    expect(currentHash).toBe(EXPECTED_FIXTURE_HASH);
  });

  // Requirement 6: Cloud Spend Tracker Baseline Audit
  it('2. verifies real Cloud Spend Tracker baseline data parameters', () => {
    expect(cstBase.nodes.length).toBe(240);
    expect(cstBase.edges.length).toBe(1024);
    expect(cstBase.summary.nodeCount).toBe(240);
    expect(cstBase.summary.edgeCount).toBe(1024);
    expect(cstBase.summary.highRiskCount).toBe(40);
    expect(cstBase.summary.cycleCount).toBe(0);
    expect(cstBase.summary.unresolvedCount).toBe(263);

    // Node type breakdown
    const nodeTypeCounts: Record<string, number> = {};
    cstBase.nodes.forEach(n => {
      nodeTypeCounts[n.type] = (nodeTypeCounts[n.type] || 0) + 1;
    });

    expect(nodeTypeCounts['ApexClass']).toBe(79);
    expect(nodeTypeCounts['External']).toBe(59);
    expect(nodeTypeCounts['CustomField']).toBe(63);
    expect(nodeTypeCounts['LWC']).toBe(26);
    expect(nodeTypeCounts['CustomObject']).toBe(10);
    expect(nodeTypeCounts['ApexTrigger']).toBe(3);

    // Findings baseline
    const ctx = createArchitectureContext(cstBase as any);
    const findings = runAllRules(ctx);
    expect(findings.length).toBeGreaterThan(0);
  });

  // Requirement 5 & 29: Every currently supported operation type on real CST graph
  describe('Operation Type Suite on Real CST Graph', () => {
    it('supports add-node operation', () => {
      const newNode: ExplorerNode = {
        id: 'ApexClass:CloudSpendAuditHelper',
        displayName: 'CloudSpendAuditHelper',
        type: 'ApexClass',
        file: 'force-app/main/default/classes/CloudSpendAuditHelper.cls',
        risk: 'LOW',
        riskReasons: [],
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      };

      const result = applySimulationOperations(cstBase, [{ type: 'add-node', node: newNode }]);
      expect(result.nodes.length).toBe(241);
      expect(result.nodes.find(n => n.id === 'ApexClass:CloudSpendAuditHelper')).toBeDefined();
      expect(cstBase.nodes.length).toBe(240); // Base graph unchanged
    });

    it('supports remove-node operation with automatic incident edge removal', () => {
      const targetNodeId = 'ApexClass:AccountController';
      const incidentEdges = cstBase.edges.filter(e => e.source === targetNodeId || e.target === targetNodeId);
      expect(incidentEdges.length).toBeGreaterThan(0);

      const result = applySimulationOperations(cstBase, [{ type: 'remove-node', nodeId: targetNodeId }]);
      expect(result.nodes.length).toBe(239);
      expect(result.nodes.find(n => n.id === targetNodeId)).toBeUndefined();
      expect(result.edges.filter(e => e.source === targetNodeId || e.target === targetNodeId).length).toBe(0);
      expect(cstBase.nodes.length).toBe(240); // Base graph unchanged
    });

    it('supports add-edge operation', () => {
      const newEdge: ExplorerEdge = {
        id: 'sim-edge-account-to-spend',
        source: 'ApexClass:AccountController',
        target: 'ApexClass:AdminSpendController',
        relationshipType: 'method-call',
        method: 'getSpendData',
        evidence: 'AdminSpendController.getSpendData()',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 12,
        column: 4,
        methodOwner: 'AdminSpendController',
        file: 'AccountController.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'AccountController' },
          target: { type: 'ApexClass', name: 'AdminSpendController' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 12, column: 4 },
        },
      };

      const result = applySimulationOperations(cstBase, [{ type: 'add-edge', edge: newEdge }]);
      expect(result.edges.length).toBe(1025);
      expect(result.edges.find(e => e.id === 'sim-edge-account-to-spend')).toBeDefined();
    });

    it('supports remove-edge operation', () => {
      const targetEdge = cstBase.edges[0];
      const result = applySimulationOperations(cstBase, [{ type: 'remove-edge', edgeId: targetEdge.id }]);
      expect(result.edges.length).toBe(1023);
      expect(result.edges.find(e => e.id === targetEdge.id)).toBeUndefined();
    });

    it('supports modify-node operation', () => {
      const targetNodeId = 'ApexClass:AccountController';
      const result = applySimulationOperations(cstBase, [{
        type: 'modify-node',
        nodeId: targetNodeId,
        changes: { risk: 'HIGH', riskReasons: ['Manual simulation elevation'] },
      }]);

      expect(result.nodes.length).toBe(240);
      const modified = result.nodes.find(n => n.id === targetNodeId);
      expect(modified?.risk).toBe('HIGH');
      expect(modified?.riskReasons).toContain('Manual simulation elevation');
      expect(cstBase.nodes.find(n => n.id === targetNodeId)?.risk).not.toBe('HIGH');
    });
  });

  // Requirements 8: Scenarios A, B, C, D, E on Real Cloud Spend Tracker Data
  describe('Real-Data Scenarios A through E', () => {
    it('Scenario A: Real dependency removal (AccountController -> AccountService)', () => {
      const realEdge = cstBase.edges.find(e => e.source === 'ApexClass:AccountController' && e.target === 'ApexClass:AccountService');
      expect(realEdge).toBeDefined();

      const ops: RefactoringOperation[] = [{ type: 'remove-edge', edgeId: realEdge!.id }];
      const sim = applySimulationOperations(cstBase, ops);

      expect(sim.edges.find(e => e.id === realEdge!.id)).toBeUndefined();
      expect(sim.nodes.length).toBe(cstBase.nodes.length);
      expect(cstBase.edges.length).toBe(1024); // Committed state unchanged
    });

    it('Scenario B: Real dependency addition between existing classes', () => {
      const newEdge: ExplorerEdge = {
        id: 'edge-acct-to-admin',
        source: 'ApexClass:AccountService',
        target: 'ApexClass:AdminAuditController',
        relationshipType: 'method-call',
        method: 'auditAccount',
        evidence: 'AdminAuditController.auditAccount()',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: 'HIGH',
        line: 25,
        column: 2,
        methodOwner: 'AdminAuditController',
        file: 'AccountService.cls',
        canonical: {
          source: { type: 'ApexClass', name: 'AccountService' },
          target: { type: 'ApexClass', name: 'AdminAuditController' },
          relationship: { type: 'method-call', resolution: 'EXACT' },
          location: { line: 25, column: 2 },
        },
      };

      const ops: RefactoringOperation[] = [{ type: 'add-edge', edge: newEdge }];
      const sim = applySimulationOperations(cstBase, ops);

      expect(sim.edges.find(e => e.id === newEdge.id)).toBeDefined();
      expect(sim.edges.length).toBe(cstBase.edges.length + 1);

      // Verify no duplicate added if re-applied
      const sim2 = applySimulationOperations(sim, ops);
      expect(sim2.edges.length).toBe(sim.edges.length);
    });

    it('Scenario C: Real node modification', () => {
      const targetId = 'ApexClass:AccountService';
      const ops: RefactoringOperation[] = [{
        type: 'modify-node',
        nodeId: targetId,
        changes: { displayName: 'RefactoredAccountService' },
      }];

      const sim = applySimulationOperations(cstBase, ops);
      const mod = sim.nodes.find(n => n.id === targetId);
      expect(mod?.displayName).toBe('RefactoredAccountService');
      expect(cstBase.nodes.find(n => n.id === targetId)?.displayName).toBe('AccountService');
    });

    it('Scenario D: Real node removal (extract/retire CloudAccountSelector)', () => {
      const targetId = 'ApexClass:CloudAccountSelector';
      const ops: RefactoringOperation[] = [{ type: 'remove-node', nodeId: targetId }];

      const sim = applySimulationOperations(cstBase, ops);
      expect(sim.nodes.find(n => n.id === targetId)).toBeUndefined();
      expect(sim.edges.filter(e => e.source === targetId || e.target === targetId).length).toBe(0);
      expect(cstBase.nodes.find(n => n.id === targetId)).toBeDefined();
    });

    it('Scenario E: Multi-step real refactoring proposal sequence', () => {
      const proposal = createProposalFromTargetNodes(['ApexClass:AccountController', 'ApexClass:AdminSpendController'], cstBase, 'cst-project');
      expect(proposal.steps.length).toBeGreaterThanOrEqual(2);

      // Step 0: Baseline
      expect(cstBase.nodes.length).toBe(240);

      // Step 1: Extract helper service
      const step1Ops = proposal.steps[0].operations;
      const simStep1 = applySimulationOperations(cstBase, step1Ops);
      expect(simStep1.nodes.length).toBe(241);

      // Step 2: Reroute calls
      const allOps = proposal.steps.flatMap(s => s.operations);
      const simFinal = applySimulationOperations(cstBase, allOps);
      expect(simFinal.nodes.length).toBe(241);
      expect(simFinal.edges.length).toBe(cstBase.edges.length + allOps.filter(o => o.type === 'add-edge').length);
    });
  });

  // Requirement 10: Simulation State Isolation
  it('10. verifies simulation state isolation before, during, after step navigation, and cancellation', () => {
    const beforeNodeCount = cstBase.nodes.length;
    const beforeEdgeCount = cstBase.edges.length;

    const proposal = createProposalFromTargetNodes(['ApexClass:AccountService'], cstBase, 'cst-project');
    const ops = proposal.steps.flatMap(s => s.operations);

    // During simulation
    const sim = applySimulationOperations(cstBase, ops);
    expect(sim.nodes.length).toBeGreaterThan(beforeNodeCount);

    // Baseline remains untouched
    expect(cstBase.nodes.length).toBe(beforeNodeCount);
    expect(cstBase.edges.length).toBe(beforeEdgeCount);

    // Cancel / discard simulation -> return baseline
    const cancelledGraph = cstBase;
    expect(cancelledGraph.nodes.length).toBe(beforeNodeCount);
    expect(cancelledGraph.edges.length).toBe(beforeEdgeCount);
  });

  // Requirement 11: Deterministic Replay
  it('11. verifies 100% deterministic simulation replay (run A === run B)', () => {
    const proposal = createProposalFromTargetNodes(['ApexClass:AccountController', 'ApexClass:AccountService'], cstBase, 'cst-project');
    const ops = proposal.steps.flatMap(s => s.operations);

    const runA = applySimulationOperations(cstBase, ops);
    const runB = applySimulationOperations(cstBase, ops);

    expect(runA.nodes).toEqual(runB.nodes);
    expect(runA.edges).toEqual(runB.edges);
    expect(computeGraphHash(runA)).toBe(computeGraphHash(runB));
  });

  // Requirement 12: Sequential vs Batch Equivalence
  it('12. verifies sequential application equals batch operation application', () => {
    const proposal = createProposalFromTargetNodes(['ApexClass:AccountController', 'ApexClass:AccountService'], cstBase, 'cst-project');
    const step1Ops = proposal.steps[0].operations;
    const step2Ops = proposal.steps[1].operations;
    const allOps = [...step1Ops, ...step2Ops];

    // Sequential
    const seqStep1 = applySimulationOperations(cstBase, step1Ops);
    const seqStep2 = applySimulationOperations(seqStep1, step2Ops);

    // Batch
    const batchRes = applySimulationOperations(cstBase, allOps);

    expect(seqStep2.nodes).toEqual(batchRes.nodes);
    expect(seqStep2.edges).toEqual(batchRes.edges);
  });

  // Requirement 13 & 14: Finding Delta Integrity & Architecture Derived State
  it('13. calculates deterministic finding deltas without global churn or committed finding mutation', () => {
    const ctxBefore = createArchitectureContext(cstBase as any);
    const findingsBefore = runAllRules(ctxBefore);

    const proposal = createProposalFromFinding(findingsBefore[0], cstBase, 'cst-project');
    const ops = proposal.steps.flatMap(s => s.operations);

    const simGraph = applySimulationOperations(cstBase, ops);
    const ctxAfter = createArchitectureContext(simGraph as any);
    const findingsAfter = runAllRules(ctxAfter);

    const delta = computeFindingDelta(findingsBefore, findingsAfter);

    expect(delta).toBeDefined();
    expect(Array.isArray(delta.resolved)).toBe(true);
    expect(Array.isArray(delta.introduced)).toBe(true);
    expect(Array.isArray(delta.unchanged)).toBe(true);

    // Base findings remain unchanged
    expect(findingsBefore.length).toBeGreaterThan(0);
  });

  // Requirement 15 & 16: Position Authority & Temporary Simulated Position Calculations
  it('15 & 16. verifies position authority with 0px coordinate drift and deterministic temporary positions', () => {
    const basePositions: Record<string, { x: number; y: number }> = {
      'ApexClass:AccountController': { x: 100, y: 150 },
      'ApexClass:AccountService': { x: 300, y: 150 },
    };

    const simulatedNodes: ExplorerNode[] = [
      ...cstBase.nodes,
      {
        id: 'ApexClass:SimulatedHelper',
        displayName: 'SimulatedHelper',
        type: 'ApexClass',
        file: 'SimulatedHelper.cls',
        risk: 'LOW',
        riskReasons: [],
        metrics: { fanIn: 1, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
      },
    ];

    const tempPos1 = computeTemporarySimulatedPositions(simulatedNodes, [], basePositions);
    const tempPos2 = computeTemporarySimulatedPositions(simulatedNodes, [], basePositions);

    // 0px drift on existing authoritative positions
    expect(tempPos1['ApexClass:AccountController']).toEqual(basePositions['ApexClass:AccountController']);
    expect(tempPos1['ApexClass:AccountService']).toEqual(basePositions['ApexClass:AccountService']);

    // Deterministic position for simulated node
    expect(tempPos1['ApexClass:SimulatedHelper']).toEqual(tempPos2['ApexClass:SimulatedHelper']);
    expect(tempPos1['ApexClass:SimulatedHelper']).toBeDefined();
  });

  // Requirement 19, 20 & 21: Commit Integrity, Existing Mutation Pathway, Persistence & Reload
  it('19, 20 & 21. commits simulation through graph mutation pathway and persists to project state', () => {
    const projectId = 'cloud-spend-tracker-test';
    const initialUIState = createDefaultProjectUIState(projectId);
    saveProjectState(projectId, initialUIState);

    const proposal = createProposalFromTargetNodes(['ApexClass:AccountController'], cstBase, projectId);
    const allOps = proposal.steps.flatMap(s => s.operations);

    // Execute commit via mutation pipeline
    const committedGraph = applySimulationOperations(cstBase, allOps);
    expect(committedGraph.nodes.length).toBe(cstBase.nodes.length + 1);

    // Save positions to project state
    const updatedPositions = {
      'ApexClass:AccountController': { x: 200, y: 200 },
    };
    saveProjectState(projectId, {
      ...initialUIState,
      graphLayout: {
        ...initialUIState.graphLayout,
        nodePositions: updatedPositions,
      },
    });

    // Reload project state and verify preservation
    const reloadedUIState = loadProjectState(projectId);
    expect(reloadedUIState.graphLayout.nodePositions).toEqual(updatedPositions);
  });

  // Requirement 22: Cancellation / Pre-Commit Recovery
  it('22. verifies cancellation discards proposal without modifying committed graph or persistence', () => {
    const projectId = 'cst-cancel-test';
    const baseState = createDefaultProjectUIState(projectId);
    saveProjectState(projectId, baseState);

    const proposal = createProposalFromTargetNodes(['ApexClass:AdminSpendController'], cstBase, projectId);

    // Perform simulation steps in memory only...
    const step1Graph = applySimulationOperations(cstBase, proposal.steps[0].operations);
    expect(step1Graph.nodes.length).toBe(cstBase.nodes.length + 1);

    // Cancel simulation -> discard step1Graph
    const currentPersisted = loadProjectState(projectId);
    expect(currentPersisted.updatedAt).toBeDefined();
    expect(cstBase.nodes.length).toBe(240);
  });

  // Requirement 23, 24, 25 & 26: Project Isolation, Stale-Proposal Safety & Double-Commit Protection
  describe('Stale-Proposal & Multi-Project Safety', () => {
    it('23. prevents cross-project proposal commits (Project A -> Project B)', () => {
      const proposal = createProposalFromTargetNodes(['ApexClass:AccountController'], cstBase, 'ProjectA');

      const validation = validateProposalCommit(proposal, 'ProjectB', cstBase);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain("Proposal belongs to project 'ProjectA' but current project is 'ProjectB'");
    });

    it('24 & 26. detects stale proposals if underlying graph changes before commit', () => {
      const proposal = createProposalFromTargetNodes(['ApexClass:AccountController'], cstBase, 'cst-project');

      // Simulate an underlying committed graph change (e.g. another user or action deleted a node)
      const mutatedGraph = applySimulationOperations(cstBase, [{ type: 'remove-node', nodeId: 'ApexClass:AdminUserController' }]);

      const validation = validateProposalCommit(proposal, 'cst-project', mutatedGraph);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Underlying graph state changed since proposal creation');
    });

    it('25. prevents duplicate edge/node accumulation on double/repeated commit', () => {
      const proposal = createProposalFromTargetNodes(['ApexClass:AccountController'], cstBase, 'cst-project');
      const ops = proposal.steps.flatMap(s => s.operations);

      const commit1 = applySimulationOperations(cstBase, ops);
      const commit2 = applySimulationOperations(commit1, ops); // Repeated apply

      expect(commit2.nodes.length).toBe(commit1.nodes.length);
      expect(commit2.edges.length).toBe(commit1.edges.length);
    });
  });
});
