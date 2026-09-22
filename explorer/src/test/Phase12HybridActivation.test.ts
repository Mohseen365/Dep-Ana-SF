import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge, ArchitectureLayoutMode } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import {
  createDefaultProjectUIState,
  loadProjectState,
  saveProjectState,
  clearProjectState,
  mergeWithDefaultState,
} from '../lib/projectState';
import { shouldAutoLayout } from '../lib/position-policy';

const FIXTURE_PATH = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
const rawData = fs.readFileSync(FIXTURE_PATH, 'utf-8');
const data = JSON.parse(rawData);
const fixtureNodes: ExplorerNode[] = data.nodes;
const fixtureEdges: ExplorerEdge[] = data.edges;

describe('Phase 12 — Hybrid Layout Production Activation & Position Reconciliation Suite', () => {
  it('Test 1 — Default behavior: No explicit layout mode supplied defaults to hierarchical (enableFeatureLayout = false)', () => {
    const defaultState = createDefaultProjectUIState('test-proj-1');
    expect(defaultState.graphLayout.architectureMode).toBe('hierarchical');

    const defaultPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges);
    const legacyExplicitPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: false });

    expect(Object.keys(defaultPositions).sort()).toEqual(Object.keys(legacyExplicitPositions).sort());
    for (const key of Object.keys(defaultPositions)) {
      expect(defaultPositions[key].x).toBe(legacyExplicitPositions[key].x);
      expect(defaultPositions[key].y).toBe(legacyExplicitPositions[key].y);
    }
  });

  it('Test 2 — Explicit Hierarchical: architectureMode = "hierarchical" evaluates to enableFeatureLayout = false', () => {
    const architectureMode: ArchitectureLayoutMode = 'hierarchical';
    const enableFeatureLayout = architectureMode === 'hybrid';

    expect(enableFeatureLayout).toBe(false);

    const positions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout });
    const legacyPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: false });

    for (const key of Object.keys(positions)) {
      expect(positions[key].x).toBe(legacyPositions[key].x);
      expect(positions[key].y).toBe(legacyPositions[key].y);
    }
  });

  it('Test 3 — Explicit Hybrid: architectureMode = "hybrid" evaluates to enableFeatureLayout = true and executes computeGlobalFeatureLayout()', () => {
    const architectureMode: ArchitectureLayoutMode = 'hybrid';
    const enableFeatureLayout = architectureMode === 'hybrid';

    expect(enableFeatureLayout).toBe(true);

    const spyDebug = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const positions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout });

    expect(spyDebug).toHaveBeenCalledWith(expect.stringContaining('computeGlobalFeatureLayout'));
    spyDebug.mockRestore();

    expect(Object.keys(positions).length).toBe(fixtureNodes.length);
  });

  it('Test 4 — Final Stage 12 coordinates: Verify Stage 12 Hybrid coordinates reach the evaluator/renderer', () => {
    const positions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });
    const metrics = evaluateLayout(fixtureNodes, fixtureEdges, positions);

    expect(metrics.edgeCrossingCount).toBe(94662);
    expect(metrics.detailedCrossings?.primaryPrimaryCrossings).toBe(8704);
    expect(metrics.detailedCrossings?.totalGeometricCrossings).toBe(94662);
  });

  it('Test 5 — Existing Hierarchical automatic positions + Hybrid request triggers Hybrid recomputation', () => {
    const projId = 'test-proj-5';
    clearProjectState(projId);

    // Initial state with automatic hierarchical positions
    const initialHierarchicalPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: false });
    const initialState = createDefaultProjectUIState(projId);
    initialState.graphLayout.architectureMode = 'hierarchical';
    initialState.graphLayout.layoutProvenance = 'automatic-hierarchical';
    initialState.graphLayout.nodePositions = initialHierarchicalPositions;
    saveProjectState(projId, initialState);

    // When requested mode is hybrid
    const loadedState = loadProjectState(projId);
    loadedState.graphLayout.architectureMode = 'hybrid';

    // Verify layoutProvenance allows distinguishing automatic-hierarchical from automatic-hybrid
    expect(loadedState.graphLayout.layoutProvenance).toBe('automatic-hierarchical');
    expect(loadedState.graphLayout.architectureMode).toBe('hybrid');

    // Provenance mismatch indicates automatic-hierarchical positions are stale for hybrid mode
    const isStaleForHybrid = loadedState.graphLayout.layoutProvenance !== 'automatic-hybrid' &&
      loadedState.graphLayout.layoutProvenance !== 'user-authored';
    expect(isStaleForHybrid).toBe(true);

    // Hybrid recomputation executes
    const hybridPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });
    expect(hybridPositions[fixtureNodes[0].id].x).not.toBe(initialHierarchicalPositions[fixtureNodes[0].id].x);

    clearProjectState(projId);
  });

  it('Test 6 — User-authored positions: Existing user position authority rules remain intact', () => {
    const targetNodeId = fixtureNodes[0].id;
    const userPos = { x: 9999, y: 8888 };

    const existingPositions = {
      [targetNodeId]: userPos,
    };

    const runPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, {
      enableFeatureLayout: true,
      existingPositions,
    });

    expect(runPositions[targetNodeId].x).toBe(userPos.x);
    expect(runPositions[targetNodeId].y).toBe(userPos.y);
  });

  it('Test 7 — Hybrid reload: Persist Hybrid state/coordinates and verify reload survival', () => {
    const projId = 'test-proj-7';
    clearProjectState(projId);

    const hybridPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });
    const state = createDefaultProjectUIState(projId);
    state.graphLayout.architectureMode = 'hybrid';
    state.graphLayout.layoutProvenance = 'automatic-hybrid';
    state.graphLayout.nodePositions = hybridPositions;
    saveProjectState(projId, state);

    const reloaded = loadProjectState(projId);
    expect(reloaded.graphLayout.architectureMode).toBe('hybrid');
    expect(reloaded.graphLayout.layoutProvenance).toBe('automatic-hybrid');
    expect(reloaded.graphLayout.nodePositions[fixtureNodes[0].id].x).toBe(hybridPositions[fixtureNodes[0].id].x);
    expect(reloaded.graphLayout.nodePositions[fixtureNodes[0].id].y).toBe(hybridPositions[fixtureNodes[0].id].y);

    clearProjectState(projId);
  });

  it('Test 8 — Hybrid -> Hierarchical transition executes Hierarchical layout', () => {
    const hybridPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });
    const hierarchicalPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: false });

    const hybridMetrics = evaluateLayout(fixtureNodes, fixtureEdges, hybridPositions);
    const hierarchicalMetrics = evaluateLayout(fixtureNodes, fixtureEdges, hierarchicalPositions);

    expect(hybridMetrics.edgeCrossingCount).toBe(94662);
    expect(hierarchicalMetrics.edgeCrossingCount).not.toBe(94662);
  });

  it('Test 9 — Hierarchical -> Hybrid transition executes Hybrid layout', () => {
    const hierarchicalPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: false });
    const hybridPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });

    const hierarchicalMetrics = evaluateLayout(fixtureNodes, fixtureEdges, hierarchicalPositions);
    const hybridMetrics = evaluateLayout(fixtureNodes, fixtureEdges, hybridPositions);

    expect(hybridMetrics.edgeCrossingCount).toBe(94662);
    expect(hybridMetrics.detailedCrossings?.primaryPrimaryCrossings).toBe(8704);
  });

  it('Test 10 — Legacy callers without mode specification default to enableFeatureLayout = false', () => {
    const legacyPositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, {});
    const explicitFalsePositions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: false });

    for (const key of Object.keys(legacyPositions)) {
      expect(legacyPositions[key].x).toBe(explicitFalsePositions[key].x);
      expect(legacyPositions[key].y).toBe(explicitFalsePositions[key].y);
    }
  });

  it('Test 11 — Canonical Candidate E metrics assertion on cloud-spend-tracker', () => {
    const positions = computeArchitectureLayout(fixtureNodes, fixtureEdges, { enableFeatureLayout: true });
    const metrics = evaluateLayout(fixtureNodes, fixtureEdges, positions);

    expect(metrics.detailedCrossings).toBeDefined();
    const dc = metrics.detailedCrossings!;

    expect(dc.primaryPrimaryCrossings).toBe(8704);
    expect(dc.primarySatelliteCrossings).toBe(41590);
    expect(dc.satelliteSatelliteCrossings).toBe(41544);
    expect(dc.primaryBridgeCrossings).toBe(2594);
    expect(dc.bridgeBridgeCrossings).toBe(230);
    expect(dc.totalGeometricCrossings).toBe(94662);

    const sum =
      dc.primaryPrimaryCrossings +
      dc.primaryBridgeCrossings +
      dc.bridgeBridgeCrossings +
      dc.primarySatelliteCrossings +
      dc.satelliteSatelliteCrossings;

    expect(dc.totalGeometricCrossings).toBe(sum);
    expect(metrics.edgeCrossingCount).toBe(sum);
  });
});
