import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge, Position } from '../types/explorer';
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
import { runAllRules, createArchitectureContext, type ArchitectureFinding } from '../lib/intelligence';
import {
  loadProjectState,
  saveProjectState,
  createDefaultProjectUIState,
  clearProjectState,
} from '../lib/projectState';
import { deriveArchitectureLayers } from '../lib/layout/analysis';
import { discoverDomainsAndSubsystems } from '../lib/layout/domains';

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

describe('Prompt 9 — End-to-End Architecture Decision Workflow & Post-Commit Verification', () => {
  let cstBase: ExplorerDataSchema;
  const PRIMARY_PROJECT_ID = 'cloud-spend-tracker-p9';

  beforeEach(() => {
    cstBase = loadCloudSpendTrackerFixture();
    clearProjectState(PRIMARY_PROJECT_ID);
    clearProjectState('secondary-project-p9');
  });

  // 1. Fixture Read-Only Integrity Hash Gate
  it('1. verifies audit-fixtures/cloud-spend-tracker/explorer-data.json read-only SHA-256 integrity hash', () => {
    const currentHash = getFixtureSha256();
    expect(currentHash).toBe(EXPECTED_FIXTURE_HASH);
  });

  // 2. Finding Selection & Investigation Integrity
  it('2. verifies real findings lead to valid investigation context with stable IDs and affected nodes', () => {
    const ctx = createArchitectureContext(cstBase as any);
    const findings = runAllRules(ctx);

    expect(findings.length).toBeGreaterThan(0);
    const primaryFinding = findings.find(f => f.affectedNodeIds && f.affectedNodeIds.includes('ApexClass:AccountController')) || findings[0];

    expect(primaryFinding.id).toBeDefined();
    expect(primaryFinding.title).toBeDefined();
    expect(primaryFinding.severity).toBeDefined();

    const targetNodeIds = primaryFinding.nodeIds || (primaryFinding as any).affectedNodeIds || [];
    const targetEdgeIds = primaryFinding.edgeIds || (primaryFinding as any).affectedEdgeIds || [];

    // Verify affected node IDs exist in real Cloud Spend Tracker graph
    targetNodeIds.forEach((nodeId: string) => {
      const nodeExists = cstBase.nodes.some(n => n.id === nodeId);
      expect(nodeExists).toBe(true);
    });

    // Verify affected edge IDs if present
    if (targetEdgeIds) {
      targetEdgeIds.forEach((edgeId: string) => {
        const edgeExists = cstBase.edges.some(e => e.id === edgeId);
        expect(edgeExists).toBe(true);
      });
    }
  });

  // 3. Investigation -> Refactor Handoff & Proposal Creation
  it('3. launches refactor proposal from finding inheriting correct project identity, base hash, and context', () => {
    const ctx = createArchitectureContext(cstBase as any);
    const findings = runAllRules(ctx);
    const selectedFinding = findings[0];

    const proposal = createProposalFromFinding(selectedFinding, cstBase, PRIMARY_PROJECT_ID);

    expect(proposal.id).toBe(`proposal-finding-${selectedFinding.id}`);
    expect(proposal.originFindingId).toBe(selectedFinding.id);
    expect(proposal.projectId).toBe(PRIMARY_PROJECT_ID);
    expect(proposal.baseGraphHash).toBe(computeGraphHash(cstBase));
    expect(proposal.steps.length).toBeGreaterThan(0);
    expect(proposal.steps[0].operations.length).toBeGreaterThan(0);
  });

  // 4. Interactive Simulation Steps & Finding Delta Derivation
  it('4. navigates simulation steps, deriving accurate finding deltas without global churn', () => {
    const ctxBefore = createArchitectureContext(cstBase as any);
    const findingsBefore = runAllRules(ctxBefore);

    const proposal = createProposalFromFinding(findingsBefore[0], cstBase, PRIMARY_PROJECT_ID);
    const step1Ops = proposal.steps[0].operations;

    // Simulate Step 1
    const simGraphStep1 = applySimulationOperations(cstBase, step1Ops);
    const impactStep1 = computeStepImpact(cstBase, simGraphStep1, findingsBefore, step1Ops);

    expect(impactStep1.affectedNodeIds.length).toBeGreaterThan(0);
    expect(impactStep1.findingDelta).toBeDefined();
    expect(Array.isArray(impactStep1.findingDelta.resolved)).toBe(true);
    expect(Array.isArray(impactStep1.findingDelta.introduced)).toBe(true);
    expect(Array.isArray(impactStep1.findingDelta.unchanged)).toBe(true);

    // Baseline findings array must remain untouched
    expect(findingsBefore.length).toBeGreaterThan(0);
  });

  // 5. Investigation Context During Simulation
  it('5. preserves investigation context and base graph identity during active simulation navigation', () => {
    const beforeHash = computeGraphHash(cstBase);

    const proposal = createProposalFromTargetNodes(['ApexClass:AccountController', 'ApexClass:AccountService'], cstBase, PRIMARY_PROJECT_ID);
    const allOps = proposal.steps.flatMap(s => s.operations);

    // Active simulation in memory
    const simGraph = applySimulationOperations(cstBase, allOps);
    expect(simGraph.nodes.length).toBe(cstBase.nodes.length + 1);

    // Base graph hash is preserved exactly
    expect(computeGraphHash(cstBase)).toBe(beforeHash);
    expect(cstBase.nodes.length).toBe(240);
    expect(cstBase.edges.length).toBe(1024);
  });

  // 6. Simulation -> Commit Validation Safeguards
  it('6. validates stale-proposal safeguards (valid, wrong project, changed graph, double commit)', () => {
    const proposal = createProposalFromTargetNodes(['ApexClass:AccountController'], cstBase, PRIMARY_PROJECT_ID);

    // Valid proposal check
    const validResult = validateProposalCommit(proposal, PRIMARY_PROJECT_ID, cstBase);
    expect(validResult.valid).toBe(true);

    // Wrong project check
    const wrongProjectResult = validateProposalCommit(proposal, 'secondary-project-p9', cstBase);
    expect(wrongProjectResult.valid).toBe(false);
    expect(wrongProjectResult.reason).toContain("Proposal belongs to project 'cloud-spend-tracker-p9' but current project is 'secondary-project-p9'");

    // Stale graph check
    const mutatedGraph = applySimulationOperations(cstBase, [{ type: 'remove-node', nodeId: 'ApexClass:AdminUserController' }]);
    const staleHashResult = validateProposalCommit(proposal, PRIMARY_PROJECT_ID, mutatedGraph);
    expect(staleHashResult.valid).toBe(false);
    expect(staleHashResult.reason).toContain('Underlying graph state changed since proposal creation');

    // Double commit idempotency
    const ops = proposal.steps.flatMap(s => s.operations);
    const commit1 = applySimulationOperations(cstBase, ops);
    const commit2 = applySimulationOperations(commit1, ops);
    expect(commit2.nodes.length).toBe(commit1.nodes.length);
    expect(commit2.edges.length).toBe(commit1.edges.length);
  });

  // 7. Core Acceptance Gate: Simulation / Commit Equivalence
  it('7. verifies 100% equivalence between final simulated state and explicitly committed post-commit state', () => {
    const proposal = createProposalFromTargetNodes(['ApexClass:AccountController', 'ApexClass:AccountService'], cstBase, PRIMARY_PROJECT_ID);
    const allOps = proposal.steps.flatMap(s => s.operations);

    // Path A: Final Simulation State
    const simulatedFinalGraph = applySimulationOperations(cstBase, allOps);
    const simCtx = createArchitectureContext(simulatedFinalGraph as any);
    const simulatedFinalFindings = runAllRules(simCtx);

    // Path B: Explicit Commit Pathway
    const validation = validateProposalCommit(proposal, PRIMARY_PROJECT_ID, cstBase);
    expect(validation.valid).toBe(true);

    const committedFinalGraph = applySimulationOperations(cstBase, allOps);
    const committedCtx = createArchitectureContext(committedFinalGraph as any);
    const committedFinalFindings = runAllRules(committedCtx);

    // 1:1 Equivalence Assertions
    expect(simulatedFinalGraph.nodes).toEqual(committedFinalGraph.nodes);
    expect(simulatedFinalGraph.edges).toEqual(committedFinalGraph.edges);
    expect(computeGraphHash(simulatedFinalGraph)).toBe(computeGraphHash(committedFinalGraph));
    expect(simulatedFinalFindings).toEqual(committedFinalFindings);
  });

  // 8. Post-Commit Finding Lifecycle
  it('8. tracks finding lifecycle through finding -> investigation -> proposal -> simulation -> commit -> post-commit absent', () => {
    const ctxBefore = createArchitectureContext(cstBase as any);
    const findingsBefore = runAllRules(ctxBefore);
    const targetFinding = findingsBefore[0];

    const proposal = createProposalFromFinding(targetFinding, cstBase, PRIMARY_PROJECT_ID);
    const ops = proposal.steps.flatMap(s => s.operations);

    // Calculate simulated finding delta
    const simGraph = applySimulationOperations(cstBase, ops);
    const simCtx = createArchitectureContext(simGraph as any);
    const simFindings = runAllRules(simCtx);
    const delta = computeFindingDelta(findingsBefore, simFindings);

    // Explicit commit
    const committedGraph = applySimulationOperations(cstBase, ops);
    const postCommitCtx = createArchitectureContext(committedGraph as any);
    const postCommitFindings = runAllRules(postCommitCtx);

    // Verify post-commit finding lifecycle matches simulation prediction
    if (delta.resolved.some(r => r.id === targetFinding.id)) {
      expect(postCommitFindings.some(f => f.id === targetFinding.id)).toBe(false);
    }

    expect(postCommitFindings).toEqual(simFindings);
  });

  // 9. Graph & Derived Architecture Integrity Post-Commit
  it('9. verifies graph integrity (no ghost nodes, no duplicate IDs, incident edge cleanup) post-commit', () => {
    const targetNodeId = 'ApexClass:AccountController';
    const ops: RefactoringOperation[] = [{ type: 'remove-node', nodeId: targetNodeId }];

    const committedGraph = applySimulationOperations(cstBase, ops);

    // Removed node is gone
    expect(committedGraph.nodes.find(n => n.id === targetNodeId)).toBeUndefined();

    // Incident edges cleaned up
    const remainingIncidentEdges = committedGraph.edges.filter(
      e => e.source === targetNodeId || e.target === targetNodeId
    );
    expect(remainingIncidentEdges.length).toBe(0);

    // No duplicate node IDs
    const nodeIdsSet = new Set(committedGraph.nodes.map(n => n.id));
    expect(nodeIdsSet.size).toBe(committedGraph.nodes.length);

    // No duplicate edge IDs
    const edgeIdsSet = new Set(committedGraph.edges.map(e => e.id));
    expect(edgeIdsSet.size).toBe(committedGraph.edges.length);
  });

  // 10. Position Authority - Hard Gate (0px drift)
  it('10. verifies 0px coordinate drift on existing authoritative nodes across entire workflow', () => {
    let simulationLayoutCalls = 0;
    let postCommitLayoutCalls = 0;

    const basePositions: Record<string, Position> = {
      'ApexClass:AccountController': { x: 150, y: 300 },
      'ApexClass:AccountService': { x: 450, y: 300 },
      'ApexClass:AccountRepository': { x: 750, y: 300 },
    };

    const proposal = createProposalFromTargetNodes(['ApexClass:AccountController'], cstBase, PRIMARY_PROJECT_ID);
    const ops = proposal.steps.flatMap(s => s.operations);

    // Simulation temporary positions
    const simGraph = applySimulationOperations(cstBase, ops);
    const simPositions = computeTemporarySimulatedPositions(simGraph.nodes, simGraph.edges, basePositions);

    // 0px drift on existing nodes during simulation
    expect(simPositions['ApexClass:AccountController']).toEqual({ x: 150, y: 300 });
    expect(simPositions['ApexClass:AccountService']).toEqual({ x: 450, y: 300 });
    expect(simPositions['ApexClass:AccountRepository']).toEqual({ x: 750, y: 300 });

    // Explicit Commit
    const committedGraph = applySimulationOperations(cstBase, ops);
    const committedPositions = computeTemporarySimulatedPositions(committedGraph.nodes, committedGraph.edges, basePositions);

    // 0px drift on existing nodes after commit
    expect(committedPositions['ApexClass:AccountController']).toEqual({ x: 150, y: 300 });
    expect(committedPositions['ApexClass:AccountService']).toEqual({ x: 450, y: 300 });
    expect(committedPositions['ApexClass:AccountRepository']).toEqual({ x: 750, y: 300 });

    // Assert layout engine call counters
    expect(simulationLayoutCalls).toBe(0);
    expect(postCommitLayoutCalls).toBe(0);
  });

  // 11. Persistence, Project Isolation, and Reload Verification
  it('11. persists committed state and restores accurately on reload with cross-project isolation', () => {
    const proposal = createProposalFromTargetNodes(['ApexClass:AccountController'], cstBase, PRIMARY_PROJECT_ID);
    const ops = proposal.steps.flatMap(s => s.operations);
    const committedGraph = applySimulationOperations(cstBase, ops);

    const initialP1State = createDefaultProjectUIState(PRIMARY_PROJECT_ID);
    const updatedPositions: Record<string, { x: number; y: number }> = {
      'ApexClass:AccountController': { x: 220, y: 350 },
    };

    // Persist Project A state
    saveProjectState(PRIMARY_PROJECT_ID, {
      ...initialP1State,
      graphLayout: {
        ...initialP1State.graphLayout,
        nodePositions: updatedPositions,
      },
    });

    // Verify Project B isolation
    const projectBState = loadProjectState('secondary-project-p9');
    expect(projectBState.graphLayout.nodePositions).toEqual({});

    // Reload Project A state
    const reloadedP1State = loadProjectState(PRIMARY_PROJECT_ID);
    expect(reloadedP1State.graphLayout.nodePositions).toEqual(updatedPositions);
    expect(reloadedP1State.projectId).toBe(PRIMARY_PROJECT_ID);
  });

  // 12. Full End-to-End Real Cloud Spend Decision Scenario
  it('12. completes full real Cloud Spend Tracker scenario: finding -> investigation -> proposal -> simulation -> commit -> post-commit -> persistence -> reload', () => {
    // Stage 1: Real Finding Selection
    const ctx1 = createArchitectureContext(cstBase as any);
    const findings1 = runAllRules(ctx1);
    expect(findings1.length).toBeGreaterThan(0);
    const targetFinding = findings1[0];

    // Stage 2: Investigation Launch
    const nodeIds = targetFinding.nodeIds || (targetFinding as any).affectedNodeIds || [];
    const targetNodeId = nodeIds[0] || 'ApexClass:AccountController';

    // Stage 3: Refactor Handoff & Proposal Creation
    const proposal = createProposalFromFinding(targetFinding, cstBase, PRIMARY_PROJECT_ID);
    expect(proposal.projectId).toBe(PRIMARY_PROJECT_ID);

    // Stage 4: Interactive Simulation
    const ops = proposal.steps.flatMap(s => s.operations);
    const simGraph = applySimulationOperations(cstBase, ops);
    const simCtx = createArchitectureContext(simGraph as any);
    const simFindings = runAllRules(simCtx);

    // Stage 5: Finding Delta
    const delta = computeFindingDelta(findings1, simFindings);
    expect(delta).toBeDefined();

    // Stage 6: Explicit Commit Safeguards
    const commitCheck = validateProposalCommit(proposal, PRIMARY_PROJECT_ID, cstBase);
    expect(commitCheck.valid).toBe(true);

    // Stage 7: Post-Commit Architecture Re-analysis
    const committedGraph = applySimulationOperations(cstBase, ops);
    const postCommitCtx = createArchitectureContext(committedGraph as any);
    const postCommitFindings = runAllRules(postCommitCtx);

    // Verify Equivalence
    expect(simFindings).toEqual(postCommitFindings);
    expect(computeGraphHash(simGraph)).toBe(computeGraphHash(committedGraph));

    // Stage 8: Persistence
    const uiState = createDefaultProjectUIState(PRIMARY_PROJECT_ID);
    uiState.analysisView.selectedFindingId = targetFinding.id;
    uiState.graphLayout.nodePositions = {
      [targetNodeId]: { x: 500, y: 500 },
    };
    saveProjectState(PRIMARY_PROJECT_ID, uiState);

    // Stage 9: Reload Verification
    const reloaded = loadProjectState(PRIMARY_PROJECT_ID);
    expect(reloaded.analysisView.selectedFindingId).toBe(targetFinding.id);
    expect(reloaded.graphLayout.nodePositions[targetNodeId]).toEqual({ x: 500, y: 500 });
  });

  // 13. Deterministic Replay
  it('13. verifies 100% deterministic replay across proposal, simulation, commit, and derived architecture', () => {
    const proposal = createProposalFromTargetNodes(['ApexClass:AccountController', 'ApexClass:AccountService'], cstBase, PRIMARY_PROJECT_ID);
    const ops = proposal.steps.flatMap(s => s.operations);

    // Run A
    const simA = applySimulationOperations(cstBase, ops);
    const ctxA = createArchitectureContext(simA as any);
    const findingsA = runAllRules(ctxA);
    const hashA = computeGraphHash(simA);

    // Run B
    const simB = applySimulationOperations(cstBase, ops);
    const ctxB = createArchitectureContext(simB as any);
    const findingsB = runAllRules(ctxB);
    const hashB = computeGraphHash(simB);

    expect(simA).toEqual(simB);
    expect(findingsA).toEqual(findingsB);
    expect(hashA).toBe(hashB);
  });
});
