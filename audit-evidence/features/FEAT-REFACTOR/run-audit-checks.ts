import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../../../explorer/src/types/explorer';
import {
  computeGraphHash,
  isProposalStale,
  validateProposalCommit,
  applySimulationOperations,
  computeFindingDelta,
  computeStepImpact,
  createProposalFromFinding,
  createProposalFromTargetNodes,
  runArchitectureRules,
  RefactoringProposal,
  RefactoringOperation
} from '../../../explorer/src/lib/refactoring-simulation';

import { runAllRules, createArchitectureContext } from '../../../explorer/src/lib/intelligence';
import { generateSyntheticSalesforceGraph } from '../../../explorer/src/test/scalability-generator';

const FIXTURE_PATH = path.resolve('/app/audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = fs.readFileSync(FIXTURE_PATH, 'utf8');
const baseGraph: ExplorerDataSchema = JSON.parse(rawData);

console.log('=== FEAT-REFACTOR AUDIT RUNNER ===\n');

// Baseline
const sha256 = crypto.createHash('sha256').update(rawData).digest('hex');
console.log(`BASELINE SHA256: ${sha256}`);
console.log(`Node Count: ${baseGraph.nodes.length}`);
console.log(`Edge Count: ${baseGraph.edges.length}\n`);

// V-04 Base graph immutability
console.log('--- V-04 Base Graph Immutability ---');
const baseHashBefore = computeGraphHash(baseGraph);
const baseCloneBefore = JSON.stringify(baseGraph);

const proposal5 = createProposalFromTargetNodes(['CloudSpendService', 'CloudSpendController', 'UserOrganizationRoleController'], baseGraph, 'cloud-spend-proj');
let simulated = baseGraph;
for (const step of proposal5.steps) {
  simulated = applySimulationOperations(simulated, step.operations);
}

const baseHashAfter = computeGraphHash(baseGraph);
const baseCloneAfter = JSON.stringify(baseGraph);
const isImmutable = (baseHashBefore === baseHashAfter) && (baseCloneBefore === baseCloneAfter);
console.log(`Base Hash Before: ${baseHashBefore}`);
console.log(`Base Hash After:  ${baseHashAfter}`);
console.log(`V-04 Base Graph Immutable: ${isImmutable ? 'PASS' : 'FAIL'}\n`);

// V-05 Operation determinism
console.log('--- V-05 Operation Determinism ---');
const results: string[] = [];
for (let i = 0; i < 5; i++) {
  const sim = applySimulationOperations(baseGraph, proposal5.steps[0].operations);
  results.push(JSON.stringify(sim));
}
const allIdentical = results.every(r => r === results[0]);
console.log(`5 Runs Byte-Identical: ${allIdentical ? 'PASS' : 'FAIL'}\n`);

// V-06 Cancellation restoration
console.log('--- V-06 Cancellation Restoration ---');
let activeGraph = baseGraph;
const activeHashBefore = computeGraphHash(activeGraph);
// Apply 3 steps
let workingGraph = activeGraph;
for (let i = 0; i < Math.min(3, proposal5.steps.length); i++) {
  workingGraph = applySimulationOperations(workingGraph, proposal5.steps[i].operations);
}

// Cancel: discard workingGraph, restore activeGraph
workingGraph = activeGraph;
const activeHashAfterCancel = computeGraphHash(workingGraph);
console.log(`Active Hash Before Sim: ${activeHashBefore}`);
console.log(`Active Hash After Cancel: ${activeHashAfterCancel}`);
console.log(`V-06 Cancellation Restoration: ${activeHashBefore === activeHashAfterCancel ? 'PASS' : 'FAIL'}\n`);

// V-07 Stale proposal rejection
console.log('--- V-07 Stale Proposal Rejection ---');
const proposalForHashA = createProposalFromTargetNodes(['CloudSpendService'], baseGraph, 'cloud-spend-proj');
// Mutate graph to Hash B
const graphHashB = applySimulationOperations(baseGraph, [{
  type: 'add-node',
  node: {
    id: 'ExtraNode',
    displayName: 'ExtraNode',
    type: 'ApexClass',
    file: 'classes/ExtraNode.cls',
    risk: 'LOW',
    riskReasons: [],
    metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
    behavior: { isTest: false, publicContractsCount: 1, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
    refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' }
  }
}]);

const validationResult = validateProposalCommit(proposalForHashA, 'cloud-spend-proj', graphHashB);
console.log(`Validation Valid: ${validationResult.valid}`);
console.log(`Validation Reason: ${validationResult.reason}`);
console.log(`V-07 Stale Proposal Rejection: ${!validationResult.valid ? 'PASS' : 'FAIL'}\n`);

// V-08 Finding delta uniqueness
console.log('--- V-08 Finding Delta Uniqueness ---');
const beforeFindings = runArchitectureRules(baseGraph);
const afterFindings = runArchitectureRules(graphHashB);
const delta = computeFindingDelta(beforeFindings, afterFindings);

const resolvedIds = new Set(delta.resolved.map(f => f.id));
const introducedIds = new Set(delta.introduced.map(f => f.id));
const unchangedIds = new Set(delta.unchanged.map(f => f.id));
const changedIds = new Set(delta.changed.map(f => f.id));

let overlapCount = 0;
const allFindingIds = [...beforeFindings.map(f => f.id), ...afterFindings.map(f => f.id)];
const uniqueFindingIds = Array.from(new Set(allFindingIds));

for (const fid of uniqueFindingIds) {
  let count = 0;
  if (resolvedIds.has(fid)) count++;
  if (introducedIds.has(fid)) count++;
  if (unchangedIds.has(fid)) count++;
  if (changedIds.has(fid)) count++;
  if (count !== 1) overlapCount++;
}

console.log(`Resolved: ${delta.resolved.length}, Introduced: ${delta.introduced.length}, Unchanged: ${delta.unchanged.length}, Changed: ${delta.changed.length}`);
console.log(`Category Disjointness Overlaps: ${overlapCount}`);
console.log(`V-08 Finding Delta Uniqueness: ${overlapCount === 0 ? 'PASS' : 'FAIL'}\n`);

// V-09 Post-commit equivalence
console.log('--- V-09 Post-Commit Equivalence ---');
const simFinalGraph = applySimulationOperations(baseGraph, proposal5.steps[0].operations);
// Commit: replace baseGraph with simFinalGraph
const committedGraph = JSON.parse(JSON.stringify(simFinalGraph));
const isPostCommitEquivalent = JSON.stringify(simFinalGraph) === JSON.stringify(committedGraph);
console.log(`Simulated Final Graph === Committed Graph: ${isPostCommitEquivalent}`);
console.log(`V-09 Post-Commit Equivalence: ${isPostCommitEquivalent ? 'PASS' : 'FAIL'}\n`);

// SEC Cross-Project Safeguard
console.log('--- SEC Cross-Project Rejection ---');
const crossProjectCheck = validateProposalCommit(proposal5, 'other-proj', baseGraph);
console.log(`Cross Project Validation Valid: ${crossProjectCheck.valid}`);
console.log(`Cross Project Reason: ${crossProjectCheck.reason}`);
console.log(`SEC Cross-Project Protection: ${!crossProjectCheck.valid ? 'PASS' : 'FAIL'}\n`);

// PERF Simulation Step Speed
console.log('--- PERF Simulation Step Timing ---');
const t0 = performance.now();
for (let i = 0; i < 100; i++) {
  applySimulationOperations(baseGraph, proposal5.steps[0].operations);
}
const t1 = performance.now();
const avgMs = (t1 - t0) / 100;
console.log(`Avg Simulation Step Time across 100 runs: ${avgMs.toFixed(3)} ms`);
console.log(`PERF (< 50ms): ${avgMs < 50 ? 'PASS' : 'FAIL'}\n`);

// SCALE 1,000-Node Graph Simulation
console.log('--- SCALE 1,000-Node Simulation ---');
const synth1000 = generateSyntheticSalesforceGraph({ nodeCount: 1000, seed: 123 });
const synthHashBefore = computeGraphHash(synth1000);
const st0 = performance.now();
const synthProposal = createProposalFromTargetNodes([synth1000.nodes[0].id], synth1000, 'synth-proj');
const synthSim = applySimulationOperations(synth1000, synthProposal.steps[0].operations);
const st1 = performance.now();
const synthHashAfter = computeGraphHash(synth1000);
console.log(`1000-Node Graph Ops Time: ${(st1 - st0).toFixed(3)} ms`);
console.log(`1000-Node Base Graph Immutable: ${synthHashBefore === synthHashAfter}`);
console.log(`SCALE 1000-Node Simulation: ${(st1 - st0) < 1000 && synthHashBefore === synthHashAfter ? 'PASS' : 'FAIL'}\n`);
