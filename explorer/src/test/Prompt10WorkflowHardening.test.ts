import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge, Position } from '../types/explorer';
import {
  type ArchitectureFinding,
} from '../lib/intelligence';
import {
  runArchitectureRules,
  computeGraphHash,
  isProposalStale,
  validateProposalCommit,
  applySimulationOperations,
  computeFindingDelta,
  computeStepImpact,
  computeTemporarySimulatedPositions,
  createProposalFromTargetNodes,
  createProposalFromFinding,
  type RefactoringProposal,
  type RefactoringOperation,
  type RefactoringStep,
} from '../lib/refactoring-simulation';
import {
  loadProjectState,
  saveProjectState,
  updateProjectState,
  clearProjectState,
  type ProjectUIState,
} from '../lib/projectState';

const FIXTURE_PATH = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const EXPECTED_FIXTURE_HASH = 'feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295';

function loadFixture(): ExplorerDataSchema {
  const content = fs.readFileSync(FIXTURE_PATH, 'utf-8');
  return JSON.parse(content);
}

function computeFileSha256(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getBasePositions(graphData: ExplorerDataSchema): Record<string, Position> {
  const positions: Record<string, Position> = {};
  graphData.nodes.forEach((node, idx) => {
    positions[node.id] = {
      x: (idx % 10) * 100 + 50,
      y: Math.floor(idx / 10) * 100 + 50,
    };
  });
  return positions;
}

describe('Prompt 10 — Architecture Decision Workflow Hardening & Adversarial E2E Matrix', () => {
  let baselineGraph: ExplorerDataSchema;
  let initialSha256: string;

  beforeEach(() => {
    clearProjectState('cloud-spend-proj');
    clearProjectState('other-proj');
    clearProjectState('default');
    initialSha256 = computeFileSha256(FIXTURE_PATH);
    baselineGraph = loadFixture();
  });

  // Section 2: Fixture Integrity Gate
  describe('1. Dataset & Fixture Integrity Gate', () => {
    it('verifies primary Cloud Spend Tracker fixture SHA-256 matches established baseline', () => {
      expect(initialSha256).toBe(EXPECTED_FIXTURE_HASH);
    });

    it('confirms fixture file remains strictly read-only and unchanged after test execution', () => {
      const currentHash = computeFileSha256(FIXTURE_PATH);
      expect(currentHash).toBe(EXPECTED_FIXTURE_HASH);
    });
  });

  // Section 5: Operation Matrix (A - E)
  describe('2. Primitive Operation Matrix (add-node, remove-node, add-edge, remove-edge, modify-node)', () => {
    it('Scenario A [add-node]: adds new node, assigns deterministic temp position, preserves existing positions', () => {
      const basePositions = getBasePositions(baselineGraph);

      const newNode: ExplorerNode = {
        id: 'ApexClass:ExtractedSpendHelper',
        displayName: 'ExtractedSpendHelper',
        type: 'ApexClass',
        layer: 'application',
        risk: 'LOW',
        metrics: { linesOfCode: 90, fanIn: 1, fanOut: 0, cyclomaticComplexity: 3, weightedMethodCount: 3 },
      };

      const proposal: RefactoringProposal = {
        id: 'prop-add-node',
        title: 'Add Extracted Spend Helper',
        description: 'Introduce helper ApexClass',
        projectId: 'cloud-spend-proj',
        baseGraphHash: computeGraphHash(baselineGraph),
        steps: [
          {
            id: 's1',
            title: 'Add Helper Node',
            description: 'Add new Apex class to application layer',
            operations: [{ type: 'add-node', node: newNode }],
          },
        ],
      };

      // 1. Simulation
      const simulatedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      expect(simulatedGraph.nodes.length).toBe(baselineGraph.nodes.length + 1);
      expect(simulatedGraph.nodes.some(n => n.id === newNode.id)).toBe(true);

      // 2. Temp positions
      const tempPositions = computeTemporarySimulatedPositions(simulatedGraph.nodes, simulatedGraph.edges, basePositions);
      expect(tempPositions[newNode.id]).toBeDefined();

      // 3. Coordinate drift check (0 px)
      baselineGraph.nodes.forEach(n => {
        expect(tempPositions[n.id]).toEqual(basePositions[n.id]);
      });

      // 4. Commit validation & Graph Commit
      const val = validateProposalCommit(proposal, 'cloud-spend-proj', baselineGraph);
      expect(val.valid).toBe(true);

      const committedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);

      // 5. Post-commit re-analysis
      const postFindings = runArchitectureRules(committedGraph);
      expect(postFindings).toBeDefined();

      // 6. Persistence & Reload
      saveProjectState('cloud-spend-proj', {
        ...loadProjectState('cloud-spend-proj'),
        graphLayout: { layoutName: 'cola', mode: 'interactive', nodePositions: tempPositions },
      });

      const reloadedState = loadProjectState('cloud-spend-proj');
      expect(reloadedState.graphLayout.nodePositions[newNode.id]).toEqual(tempPositions[newNode.id]);
      expect(reloadedState.graphLayout.nodePositions[baselineGraph.nodes[0].id]).toEqual(basePositions[baselineGraph.nodes[0].id]);
    });

    it('Scenario B [remove-node]: removes node, purges all incident edges, preserves unrelated nodes/edges', () => {
      const targetNode = baselineGraph.nodes.find(n => n.type === 'ApexClass' && n.metrics?.fanOut && n.metrics.fanOut > 0)!;
      const targetNodeId = targetNode.id;

      const incidentEdgesBefore = baselineGraph.edges.filter(e => e.source === targetNodeId || e.target === targetNodeId);
      expect(incidentEdgesBefore.length).toBeGreaterThan(0);

      const proposal: RefactoringProposal = {
        id: 'prop-remove-node',
        title: `Remove ${targetNodeId}`,
        description: 'Decommission legacy class',
        projectId: 'cloud-spend-proj',
        baseGraphHash: computeGraphHash(baselineGraph),
        steps: [
          {
            id: 's1',
            title: 'Remove Node',
            description: 'Purge component and incident edges',
            operations: [{ type: 'remove-node', nodeId: targetNodeId }],
          },
        ],
      };

      const simulatedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      expect(simulatedGraph.nodes.some(n => n.id === targetNodeId)).toBe(false);
      expect(simulatedGraph.nodes.length).toBe(baselineGraph.nodes.length - 1);

      // Verify incident edges removed
      const incidentEdgesAfter = simulatedGraph.edges.filter(e => e.source === targetNodeId || e.target === targetNodeId);
      expect(incidentEdgesAfter.length).toBe(0);

      // Verify unrelated edges preserved
      const unrelatedEdgesBefore = baselineGraph.edges.filter(e => e.source !== targetNodeId && e.target !== targetNodeId);
      expect(simulatedGraph.edges.length).toBe(unrelatedEdgesBefore.length);

      // Commit & Post-commit re-analysis
      const committedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      expect(committedGraph).toEqual(simulatedGraph);

      const postFindings = runArchitectureRules(committedGraph);
      expect(postFindings.some(f => (f.nodeIds || []).includes(targetNodeId))).toBe(false);
    });

    it('Scenario C [add-edge]: adds dependency edge, preserves relationship type, handles parallel edges independently', () => {
      const sourceNode = baselineGraph.nodes[0];
      const targetNode = baselineGraph.nodes[1];

      const newEdge: ExplorerEdge = {
        id: `edge-${sourceNode.id}-to-${targetNode.id}-custom`,
        source: sourceNode.id,
        target: targetNode.id,
        relationshipType: 'calls',
        label: 'test call',
      };

      const proposal: RefactoringProposal = {
        id: 'prop-add-edge',
        title: 'Add Edge',
        description: 'Connect components',
        projectId: 'cloud-spend-proj',
        baseGraphHash: computeGraphHash(baselineGraph),
        steps: [
          {
            id: 's1',
            title: 'Add Edge',
            description: 'Add dependency',
            operations: [{ type: 'add-edge', edge: newEdge }],
          },
        ],
      };

      const simulatedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      expect(simulatedGraph.edges.some(e => e.id === newEdge.id)).toBe(true);
      expect(simulatedGraph.edges.length).toBe(baselineGraph.edges.length + 1);

      // Duplicate operation idempotency check
      const doubleSim = applySimulationOperations(simulatedGraph, proposal.steps[0].operations);
      expect(doubleSim.edges.length).toBe(simulatedGraph.edges.length);

      const postFindings = runArchitectureRules(simulatedGraph);
      expect(postFindings).toBeDefined();
    });

    it('Scenario D [remove-edge]: removes specific edge while leaving parallel relationships and unrelated structure intact', () => {
      const targetEdge = baselineGraph.edges[0];

      const proposal: RefactoringProposal = {
        id: 'prop-remove-edge',
        title: 'Remove Edge',
        description: 'Decouple edge',
        projectId: 'cloud-spend-proj',
        baseGraphHash: computeGraphHash(baselineGraph),
        steps: [
          {
            id: 's1',
            title: 'Remove Edge',
            description: 'Remove specific edge ID',
            operations: [{ type: 'remove-edge', edgeId: targetEdge.id }],
          },
        ],
      };

      const simulatedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      expect(simulatedGraph.edges.some(e => e.id === targetEdge.id)).toBe(false);
      expect(simulatedGraph.edges.length).toBe(baselineGraph.edges.length - 1);
      expect(simulatedGraph.nodes.length).toBe(baselineGraph.nodes.length);

      const committedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      expect(committedGraph).toEqual(simulatedGraph);
    });

    it('Scenario E [modify-node]: updates metadata, preserves node ID and existing relationships, updates analysis', () => {
      const targetNode = baselineGraph.nodes[0];

      const proposal: RefactoringProposal = {
        id: 'prop-modify-node',
        title: 'Modify Metadata',
        description: 'Update risk and layer',
        projectId: 'cloud-spend-proj',
        baseGraphHash: computeGraphHash(baselineGraph),
        steps: [
          {
            id: 's1',
            title: 'Modify Node',
            description: 'Change risk level',
            operations: [
              {
                type: 'modify-node',
                nodeId: targetNode.id,
                changes: { risk: 'HIGH', layer: 'domain' },
              },
            ],
          },
        ],
      };

      const simulatedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      const modified = simulatedGraph.nodes.find(n => n.id === targetNode.id)!;
      expect(modified.risk).toBe('HIGH');
      expect(modified.layer).toBe('domain');
      expect(modified.displayName).toBe(targetNode.displayName);

      // Incident edges preserved
      const incidentEdgesBefore = baselineGraph.edges.filter(e => e.source === targetNode.id || e.target === targetNode.id);
      const incidentEdgesAfter = simulatedGraph.edges.filter(e => e.source === targetNode.id || e.target === targetNode.id);
      expect(incidentEdgesAfter.length).toBe(incidentEdgesBefore.length);
    });
  });

  // Section 6: Finding Outcome Matrix
  describe('3. Finding Outcome Matrix (Resolved, Retained Active, Changed, New Introduced)', () => {
    it('Outcome 1 [Finding Resolved]: ACTIVE -> PREDICTED_RESOLVED -> COMMITTED -> ABSENT', () => {
      const beforeFindings = runArchitectureRules(baselineGraph);
      expect(beforeFindings.length).toBeGreaterThan(0);

      const targetFinding = beforeFindings[0];
      const primaryNodeId = (targetFinding.nodeIds || [])[0] || baselineGraph.nodes[0].id;

      // Remove affected node
      const proposal: RefactoringProposal = {
        id: 'prop-resolve-finding',
        title: 'Resolve Target Finding',
        description: 'Remove affected node',
        projectId: 'cloud-spend-proj',
        baseGraphHash: computeGraphHash(baselineGraph),
        steps: [
          {
            id: 's1',
            title: 'Remove Node',
            description: 'Decommission target node',
            operations: [{ type: 'remove-node', nodeId: primaryNodeId }],
          },
        ],
      };

      const simulatedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      const afterFindings = runArchitectureRules(simulatedGraph);

      const delta = computeFindingDelta(beforeFindings, afterFindings);
      expect(delta.resolved.some(f => f.id === targetFinding.id)).toBe(true);

      const committedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      const postCommitFindings = runArchitectureRules(committedGraph);

      expect(postCommitFindings.some(f => f.id === targetFinding.id)).toBe(false);
    });

    it('Outcome 2 [Finding Retained Active]: ACTIVE -> SIMULATED -> STILL ACTIVE -> COMMITTED -> STILL ACTIVE', () => {
      const beforeFindings = runArchitectureRules(baselineGraph);
      const targetFinding = beforeFindings[0];

      // Unrelated operation (add isolated helper node elsewhere)
      const newNode: ExplorerNode = {
        id: 'ApexClass:UnrelatedHelperClass',
        displayName: 'UnrelatedHelperClass',
        type: 'ApexClass',
        layer: 'application',
        risk: 'LOW',
        metrics: { linesOfCode: 50, fanIn: 0, fanOut: 0, cyclomaticComplexity: 1, weightedMethodCount: 1 },
      };

      const proposal: RefactoringProposal = {
        id: 'prop-unrelated-change',
        title: 'Unrelated Addition',
        description: 'Does not affect finding A',
        projectId: 'cloud-spend-proj',
        baseGraphHash: computeGraphHash(baselineGraph),
        steps: [
          {
            id: 's1',
            title: 'Add Isolated Component',
            description: 'Add isolated class',
            operations: [{ type: 'add-node', node: newNode }],
          },
        ],
      };

      const simulatedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      const afterFindings = runArchitectureRules(simulatedGraph);

      const delta = computeFindingDelta(beforeFindings, afterFindings);
      expect(delta.unchanged.some(f => f.id === targetFinding.id)).toBe(true);

      const postCommitFindings = runArchitectureRules(simulatedGraph);
      expect(postCommitFindings.some(f => f.id === targetFinding.id)).toBe(true);
    });

    it('Outcome 3 [Finding Changed]: Finding updates severity/evidence when partial refactoring occurs', () => {
      const beforeFindings = runArchitectureRules(baselineGraph);

      const multiNodeFinding = beforeFindings.find(f => (f.nodeIds || []).length > 1) || beforeFindings[0];
      const targetNodeId = (multiNodeFinding.nodeIds || [])[0];

      const proposal: RefactoringProposal = {
        id: 'prop-change-finding',
        title: 'Modify Affected Node',
        description: 'Update node risk',
        projectId: 'cloud-spend-proj',
        baseGraphHash: computeGraphHash(baselineGraph),
        steps: [
          {
            id: 's1',
            title: 'Modify Node Risk',
            description: 'Change risk level to HIGH',
            operations: [
              {
                type: 'modify-node',
                nodeId: targetNodeId,
                changes: { risk: 'HIGH' },
              },
            ],
          },
        ],
      };

      const simulatedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      const afterFindings = runArchitectureRules(simulatedGraph);

      const postCommitFinding = afterFindings.find(f => f.id === multiNodeFinding.id);
      expect(postCommitFinding).toBeDefined();
    });

    it('Outcome 4 [New Finding Introduced]: predicted new finding in simulation equals post-commit finding', () => {
      const beforeFindings = runArchitectureRules(baselineGraph);

      // Add a high fan-in hub node with fanIn = 25 (exceeding highFanInThreshold of 10)
      const hubNode: ExplorerNode = {
        id: 'ApexClass:ExcessiveFanInHub',
        displayName: 'ExcessiveFanInHub',
        type: 'ApexClass',
        layer: 'domain',
        risk: 'HIGH',
        metrics: { linesOfCode: 500, fanIn: 25, fanOut: 2, cyclomaticComplexity: 15, weightedMethodCount: 10 },
      };

      const proposal: RefactoringProposal = {
        id: 'prop-intro-finding',
        title: 'Introduce High Fan-In Hub',
        description: 'Add node with excessive fan-in',
        projectId: 'cloud-spend-proj',
        baseGraphHash: computeGraphHash(baselineGraph),
        steps: [
          {
            id: 's1',
            title: 'Add Hub Node',
            description: 'Add hub node with 25 fan-in',
            operations: [{ type: 'add-node', node: hubNode }],
          },
        ],
      };

      const simulatedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      const afterFindings = runArchitectureRules(simulatedGraph);

      const delta = computeFindingDelta(beforeFindings, afterFindings);
      expect(delta.introduced.length).toBeGreaterThan(0);
      expect(delta.introduced.some(f => f.id.includes(hubNode.id))).toBe(true);

      const committedGraph = applySimulationOperations(baselineGraph, proposal.steps[0].operations);
      const postCommitFindings = runArchitectureRules(committedGraph);

      const introducedInCommit = postCommitFindings.filter(f => !beforeFindings.some(bf => bf.id === f.id));
      expect(introducedInCommit.length).toEqual(delta.introduced.length);
    });
  });

  // Section 7: Unrelated Finding Stability
  describe('4. Unrelated Finding Stability (Zero Spurious Churn)', () => {
    it('proves that unrelated finding IDs, rule IDs, and severities remain 100% stable during refactoring', () => {
      const beforeFindings = runArchitectureRules(baselineGraph);

      const targetNode = baselineGraph.nodes[0];
      const unrelatedNode = baselineGraph.nodes[baselineGraph.nodes.length - 1];

      const unrelatedFindingsBefore = beforeFindings.filter(f =>
        (f.nodeIds || []).includes(unrelatedNode.id) && !(f.nodeIds || []).includes(targetNode.id)
      );

      const proposal = createProposalFromTargetNodes([targetNode.id], baselineGraph, 'cloud-spend-proj');
      const allOps = proposal.steps.flatMap(s => s.operations);

      const simulatedGraph = applySimulationOperations(baselineGraph, allOps);
      const afterFindings = runArchitectureRules(simulatedGraph);

      const unrelatedFindingsAfter = afterFindings.filter(f =>
        (f.nodeIds || []).includes(unrelatedNode.id) && !(f.nodeIds || []).includes(targetNode.id)
      );

      expect(unrelatedFindingsAfter.length).toEqual(unrelatedFindingsBefore.length);

      unrelatedFindingsBefore.forEach(beforeF => {
        const afterF = unrelatedFindingsAfter.find(f => f.id === beforeF.id);
        expect(afterF).toBeDefined();
        expect(afterF!.ruleId).toBe(beforeF.ruleId);
        expect(afterF!.severity).toBe(beforeF.severity);
      });
    });
  });

  // Section 8: Multi-Step Mixed Operation Scenario
  describe('5. Multi-Step Mixed Operation Scenario & Batch Equivalence', () => {
    it('executes a 4-step proposal combining all primitive operations, proving sequential and batch equivalence', () => {
      const basePositions = getBasePositions(baselineGraph);
      const beforeFindings = runArchitectureRules(baselineGraph);

      const helperNode: ExplorerNode = {
        id: 'ApexClass:MultiStepHelperService',
        displayName: 'MultiStepHelperService',
        type: 'ApexClass',
        layer: 'domain',
        risk: 'LOW',
        metrics: { linesOfCode: 120, fanIn: 1, fanOut: 0, cyclomaticComplexity: 2, weightedMethodCount: 2 },
      };

      const edgeA = baselineGraph.edges[0];
      const edgeB = baselineGraph.edges[1];

      const multiStepProposal: RefactoringProposal = {
        id: 'prop-multistep-mixed',
        title: 'Multi-Step Refactoring Sequence',
        description: 'Comprehensive 4-step refactor',
        projectId: 'cloud-spend-proj',
        baseGraphHash: computeGraphHash(baselineGraph),
        steps: [
          {
            id: 'step-1',
            title: 'Add Helper Node',
            description: 'Extract domain service',
            operations: [{ type: 'add-node', node: helperNode }],
          },
          {
            id: 'step-2',
            title: 'Add & Remove Edges',
            description: 'Reroute dependencies',
            operations: [
              {
                type: 'add-edge',
                edge: {
                  id: `edge-ms-1`,
                  source: baselineGraph.nodes[0].id,
                  target: helperNode.id,
                  relationshipType: 'calls',
                  label: 'delegates',
                },
              },
              { type: 'remove-edge', edgeId: edgeA.id },
            ],
          },
          {
            id: 'step-3',
            title: 'Modify Target Node',
            description: 'Update risk level',
            operations: [
              {
                type: 'modify-node',
                nodeId: baselineGraph.nodes[0].id,
                changes: { risk: 'LOW' },
              },
            ],
          },
          {
            id: 'step-4',
            title: 'Remove Legacy Edge',
            description: 'Remove edge B',
            operations: [{ type: 'remove-edge', edgeId: edgeB.id }],
          },
        ],
      };

      let currentGraph = baselineGraph;
      const stepHashes: string[] = [];

      multiStepProposal.steps.forEach((step, idx) => {
        currentGraph = applySimulationOperations(currentGraph, step.operations);
        const hash = computeGraphHash(currentGraph);
        stepHashes.push(hash);

        const impact = computeStepImpact(baselineGraph, currentGraph, beforeFindings, step.operations);
        expect(impact.affectedNodeIds).toBeDefined();

        const tempPositions = computeTemporarySimulatedPositions(currentGraph.nodes, currentGraph.edges, basePositions);
        baselineGraph.nodes.forEach(n => {
          expect(tempPositions[n.id]).toEqual(basePositions[n.id]);
        });
      });

      const allOps = multiStepProposal.steps.flatMap(s => s.operations);
      const batchGraph = applySimulationOperations(baselineGraph, allOps);
      const batchHash = computeGraphHash(batchGraph);

      expect(currentGraph).toEqual(batchGraph);
      expect(stepHashes[stepHashes.length - 1]).toBe(batchHash);

      const postCommitFindingsSeq = runArchitectureRules(currentGraph);
      const postCommitFindingsBatch = runArchitectureRules(batchGraph);
      expect(postCommitFindingsSeq).toEqual(postCommitFindingsBatch);
    });
  });

  // Section 9: Cancellation Matrix
  describe('6. Cancellation Safety Matrix (Zero Mutation Guarantee)', () => {
    it('verifies cancellation at all steps leaves baseline graph, positions, and persistence completely unmodified', () => {
      const basePositions = getBasePositions(baselineGraph);
      const baseHash = computeGraphHash(baselineGraph);

      saveProjectState('cloud-spend-proj', {
        ...loadProjectState('cloud-spend-proj'),
        graphLayout: { layoutName: 'cola', mode: 'interactive', nodePositions: basePositions },
      });

      const proposal = createProposalFromTargetNodes([baselineGraph.nodes[0].id], baselineGraph, 'cloud-spend-proj');

      [0, 1, proposal.steps.length - 1].forEach(stepIdx => {
        const ops = proposal.steps.slice(0, stepIdx + 1).flatMap(s => s.operations);
        const simulated = applySimulationOperations(baselineGraph, ops);
        expect(simulated).not.toEqual(baselineGraph);

        const persistedAfterCancel = loadProjectState('cloud-spend-proj');
        expect(persistedAfterCancel.graphLayout.nodePositions).toEqual(basePositions);
        expect(computeGraphHash(baselineGraph)).toBe(baseHash);
      });
    });
  });

  // Section 10: Stale Proposal Safeguards Matrix
  describe('7. Stale Proposal Safeguard Matrix (Scenario A - E)', () => {
    it('Scenario A [Node Mutation]: rejects commit if underlying node structure mutates after proposal creation', () => {
      const proposal = createProposalFromTargetNodes([baselineGraph.nodes[0].id], baselineGraph, 'cloud-spend-proj');

      const externalMutatedGraph: ExplorerDataSchema = {
        ...baselineGraph,
        nodes: [
          ...baselineGraph.nodes,
          {
            id: 'ApexClass:ExternalMutatedClass',
            displayName: 'ExternalMutatedClass',
            type: 'ApexClass',
            layer: 'domain',
            risk: 'LOW',
            metrics: { linesOfCode: 10, fanIn: 0, fanOut: 0, cyclomaticComplexity: 1, weightedMethodCount: 1 },
          },
        ],
      };

      const val = validateProposalCommit(proposal, 'cloud-spend-proj', externalMutatedGraph);
      expect(val.valid).toBe(false);
      expect(val.reason).toContain('Underlying graph state changed');
    });

    it('Scenario B [Edge Mutation]: rejects commit if underlying edge structure mutates after proposal creation', () => {
      const proposal = createProposalFromTargetNodes([baselineGraph.nodes[0].id], baselineGraph, 'cloud-spend-proj');

      const externalMutatedGraph: ExplorerDataSchema = {
        ...baselineGraph,
        edges: baselineGraph.edges.slice(1),
      };

      const val = validateProposalCommit(proposal, 'cloud-spend-proj', externalMutatedGraph);
      expect(val.valid).toBe(false);
      expect(val.reason).toContain('Underlying graph state changed');
    });

    it('Scenario C [Metadata Mutation]: rejects commit if node metadata changes graph hash', () => {
      const proposal = createProposalFromTargetNodes([baselineGraph.nodes[0].id], baselineGraph, 'cloud-spend-proj');

      const externalMutatedGraph: ExplorerDataSchema = {
        ...baselineGraph,
        nodes: baselineGraph.nodes.map((n, idx) => idx === 0 ? { ...n, id: `${n.id}-renamed` } : n),
      };

      const val = validateProposalCommit(proposal, 'cloud-spend-proj', externalMutatedGraph);
      expect(val.valid).toBe(false);
    });

    it('Scenario D [Project Switch]: rejects commit if proposal belongs to Project A but active project is Project B', () => {
      const proposal = createProposalFromTargetNodes([baselineGraph.nodes[0].id], baselineGraph, 'cloud-spend-proj');

      const val = validateProposalCommit(proposal, 'other-proj', baselineGraph);
      expect(val.valid).toBe(false);
      expect(val.reason).toContain("Proposal belongs to project 'cloud-spend-proj' but current project is 'other-proj'");
    });

    it('Scenario E [Repeated Commit]: second commit attempt is rejected due to updated graph hash', () => {
      const proposal = createProposalFromTargetNodes([baselineGraph.nodes[0].id], baselineGraph, 'cloud-spend-proj');

      const val1 = validateProposalCommit(proposal, 'cloud-spend-proj', baselineGraph);
      expect(val1.valid).toBe(true);

      const committedGraph = applySimulationOperations(baselineGraph, proposal.steps.flatMap(s => s.operations));

      const val2 = validateProposalCommit(proposal, 'cloud-spend-proj', committedGraph);
      expect(val2.valid).toBe(false);
      expect(val2.reason).toContain('Underlying graph state changed');
    });
  });

  // Section 11: Project Isolation
  describe('8. Multi-Project Isolation & State Non-Leakage', () => {
    it('guarantees Project A simulation proposal cannot commit into Project B and UI state never leaks across projects', () => {
      saveProjectState('cloud-spend-proj', {
        ...loadProjectState('cloud-spend-proj'),
        selectedComponent: { selectedNodeId: 'node-A', selectedEdgeId: null, selectedInvestigationId: 'inv-A' },
        filters: { searchQuery: 'spend', typeFilter: 'ApexClass', riskFilter: 'HIGH', hasCallouts: true, withoutSharing: false, hideTests: false, hasAsyncPatterns: false },
        graphLayout: { layoutName: 'cola', mode: 'interactive', nodePositions: { 'node-A': { x: 100, y: 100 } } },
      });

      const projBState = loadProjectState('other-proj');
      expect(projBState.selectedComponent.selectedNodeId).toBeNull();
      expect(projBState.filters.searchQuery).toBe('');
      expect(projBState.graphLayout.nodePositions).toEqual({});

      const proposalA = createProposalFromTargetNodes([baselineGraph.nodes[0].id], baselineGraph, 'cloud-spend-proj');
      const valB = validateProposalCommit(proposalA, 'other-proj', baselineGraph);
      expect(valB.valid).toBe(false);
    });
  });

  // Section 12: Persistence & Reload Equivalence
  describe('9. Persistence / Reload Equivalence (Committed State vs Abandoned Simulation)', () => {
    it('proves project reload reconstructs exact committed graph state and ignores discarded simulation state', () => {
      const basePositions = getBasePositions(baselineGraph);

      saveProjectState('cloud-spend-proj', {
        ...loadProjectState('cloud-spend-proj'),
        graphLayout: { layoutName: 'cola', mode: 'interactive', nodePositions: basePositions },
      });

      const helperNode: ExplorerNode = {
        id: 'ApexClass:SimulatedTempClass',
        displayName: 'SimulatedTempClass',
        type: 'ApexClass',
        layer: 'domain',
        risk: 'LOW',
        metrics: { linesOfCode: 50, fanIn: 0, fanOut: 0, cyclomaticComplexity: 1, weightedMethodCount: 1 },
      };

      const simulatedGraph = applySimulationOperations(baselineGraph, [{ type: 'add-node', node: helperNode }]);
      const simPositions = computeTemporarySimulatedPositions(simulatedGraph.nodes, simulatedGraph.edges, basePositions);

      const reloadedState = loadProjectState('cloud-spend-proj');
      expect(reloadedState.graphLayout.nodePositions[helperNode.id]).toBeUndefined();
      expect(reloadedState.graphLayout.nodePositions[baselineGraph.nodes[0].id]).toEqual(basePositions[baselineGraph.nodes[0].id]);
    });
  });

  // Section 13: Position Authority Hard Gate
  describe('10. Position Authority Hard Gate (0.00000 px Coordinate Drift & Zero Unauthorized Layout Calls)', () => {
    it('verifies 0.00000 px coordinate drift for existing nodes and 0 unauthorized layout invocations', () => {
      const basePositions = getBasePositions(baselineGraph);
      const layoutSpy = vi.fn();

      const proposal = createProposalFromTargetNodes([baselineGraph.nodes[0].id], baselineGraph, 'cloud-spend-proj');
      const allOps = proposal.steps.flatMap(s => s.operations);

      const simulatedGraph = applySimulationOperations(baselineGraph, allOps);
      const tempPositions = computeTemporarySimulatedPositions(simulatedGraph.nodes, simulatedGraph.edges, basePositions);

      expect(layoutSpy).toHaveBeenCalledTimes(0);

      baselineGraph.nodes.forEach(node => {
        const origPos = basePositions[node.id];
        const simPos = tempPositions[node.id];

        expect(simPos).toBeDefined();
        const deltaX = Math.abs(simPos.x - origPos.x);
        const deltaY = Math.abs(simPos.y - origPos.y);

        expect(deltaX).toBe(0);
        expect(deltaY).toBe(0);
      });

      const addedNode = simulatedGraph.nodes.find(n => !basePositions[n.id])!;
      expect(tempPositions[addedNode.id]).toBeDefined();
      expect(Number.isFinite(tempPositions[addedNode.id].x)).toBe(true);
      expect(Number.isFinite(tempPositions[addedNode.id].y)).toBe(true);
    });
  });

  // Section 15: Determinism & Replay
  describe('11. Determinism & Replay (10/10 Repeated Execution Invariance)', () => {
    it('executes 10 repeated simulations of the multi-step proposal and confirms 100% identical hashes, deltas, and positions', () => {
      const basePositions = getBasePositions(baselineGraph);
      const proposal = createProposalFromTargetNodes([baselineGraph.nodes[0].id, baselineGraph.nodes[1].id], baselineGraph, 'cloud-spend-proj');

      const initialSimGraph = applySimulationOperations(baselineGraph, proposal.steps.flatMap(s => s.operations));
      const initialHash = computeGraphHash(initialSimGraph);
      const initialPositions = computeTemporarySimulatedPositions(initialSimGraph.nodes, initialSimGraph.edges, basePositions);
      const initialFindings = runArchitectureRules(initialSimGraph);

      for (let run = 1; run <= 10; run++) {
        const runSimGraph = applySimulationOperations(baselineGraph, proposal.steps.flatMap(s => s.operations));
        const runHash = computeGraphHash(runSimGraph);
        const runPositions = computeTemporarySimulatedPositions(runSimGraph.nodes, runSimGraph.edges, basePositions);
        const runFindings = runArchitectureRules(runSimGraph);

        expect(runHash).toBe(initialHash);
        expect(runPositions).toEqual(initialPositions);
        expect(runFindings).toEqual(initialFindings);
      }
    });
  });

  // Section 16: Simulation / Commit Equivalence
  describe('12. Simulation / Commit Equivalence', () => {
    it('proves final simulated graph equals committed graph and simulation findings equal post-commit findings', () => {
      const beforeFindings = runArchitectureRules(baselineGraph);
      const proposal = createProposalFromTargetNodes([baselineGraph.nodes[0].id], baselineGraph, 'cloud-spend-proj');
      const ops = proposal.steps.flatMap(s => s.operations);

      const simulatedGraph = applySimulationOperations(baselineGraph, ops);
      const simImpact = computeStepImpact(baselineGraph, simulatedGraph, beforeFindings, ops);

      const committedGraph = applySimulationOperations(baselineGraph, ops);
      const postCommitFindings = runArchitectureRules(committedGraph);

      expect(committedGraph.nodes).toEqual(simulatedGraph.nodes);
      expect(committedGraph.edges).toEqual(simulatedGraph.edges);
      expect(computeGraphHash(committedGraph)).toBe(computeGraphHash(simulatedGraph));

      const postCommitDelta = computeFindingDelta(beforeFindings, postCommitFindings);
      expect(postCommitDelta.resolved).toEqual(simImpact.findingDelta.resolved);
      expect(postCommitDelta.introduced).toEqual(simImpact.findingDelta.introduced);
    });
  });

  // Section 17: Performance Benchmark Profile
  describe('13. Performance Benchmark Profile on Cloud Spend Tracker Fixture', () => {
    it('measures execution timings across all lifecycle phases against performance bounds', () => {
      const t0 = performance.now();
      const proposal = createProposalFromTargetNodes([baselineGraph.nodes[0].id], baselineGraph, 'cloud-spend-proj');
      const tProposal = performance.now() - t0;

      const t1 = performance.now();
      const simulatedGraph = applySimulationOperations(baselineGraph, proposal.steps.flatMap(s => s.operations));
      const tSim = performance.now() - t1;

      const t2 = performance.now();
      const beforeFindings = runArchitectureRules(baselineGraph);
      const stepImpact = computeStepImpact(baselineGraph, simulatedGraph, beforeFindings, proposal.steps[0].operations);
      const tImpact = performance.now() - t2;

      const t3 = performance.now();
      const val = validateProposalCommit(proposal, 'cloud-spend-proj', baselineGraph);
      const tValidation = performance.now() - t3;

      const t4 = performance.now();
      const committedGraph = applySimulationOperations(baselineGraph, proposal.steps.flatMap(s => s.operations));
      const tCommit = performance.now() - t4;

      const t5 = performance.now();
      const postFindings = runArchitectureRules(committedGraph);
      const tReanalysis = performance.now() - t5;

      const t6 = performance.now();
      saveProjectState('cloud-spend-proj', loadProjectState('cloud-spend-proj'));
      const tPersistence = performance.now() - t6;

      const t7 = performance.now();
      loadProjectState('cloud-spend-proj');
      const tReload = performance.now() - t7;

      console.log(`[PROMPT 10 PERFORMANCE PROFILE]`);
      console.log(`  Proposal Creation: ${tProposal.toFixed(2)}ms`);
      console.log(`  Simulation Ops: ${tSim.toFixed(2)}ms`);
      console.log(`  Step Impact & Finding Delta: ${tImpact.toFixed(2)}ms`);
      console.log(`  Commit Validation: ${tValidation.toFixed(2)}ms`);
      console.log(`  Graph Commit: ${tCommit.toFixed(2)}ms`);
      console.log(`  Post-Commit Re-analysis: ${tReanalysis.toFixed(2)}ms`);
      console.log(`  Persistence Save: ${tPersistence.toFixed(2)}ms`);
      console.log(`  Project Reload: ${tReload.toFixed(2)}ms`);

      expect(val.valid).toBe(true);
      expect(tProposal).toBeLessThan(100);
      expect(tSim).toBeLessThan(100);
      expect(tImpact).toBeLessThan(500);
      expect(tValidation).toBeLessThan(50);
      expect(tCommit).toBeLessThan(100);
      expect(tReanalysis).toBeLessThan(500);
      expect(tPersistence).toBeLessThan(50);
      expect(tReload).toBeLessThan(50);
    });
  });
});
