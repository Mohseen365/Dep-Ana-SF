import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { discoverFeatures } from '../lib/layout/features';
import { calculateDetailedEdgeCrossings } from '../lib/layout/metrics';
import { loadProjectState, clearProjectState } from '../lib/projectState';
import { shouldAutoLayout, resolveAuthoritativePosition } from '../lib/position-policy';
import { measurePipelineStageMetrics } from '../lib/layout/pipeline-stage-diagnostics';

const FIXTURE_PATH = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');

describe('Phase 13 — Forensic Runtime Audit Diagnostic Suite', () => {
  it('Section 2 — Verifies fixture SHA-256 and node/edge counts', () => {
    const rawData = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const hash = crypto.createHash('sha256').update(rawData).digest('hex');
    const data = JSON.parse(rawData);

    console.log(`[FORENSIC] Fixture Path: ${FIXTURE_PATH}`);
    console.log(`[FORENSIC] SHA-256: ${hash}`);
    console.log(`[FORENSIC] Node count: ${data.nodes.length}`);
    console.log(`[FORENSIC] Edge count: ${data.edges.length}`);

    expect(hash).toBe('feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295');
    expect(data.nodes.length).toBe(240);
    expect(data.edges.length).toBe(1024);
  });

  it('Section 4 & 5 — Verifies default project UI state and UI layout parameters', () => {
    clearProjectState('cloud-spend-tracker');
    const defaultState = loadProjectState('cloud-spend-tracker');

    console.log(`[FORENSIC] Default architectureMode: ${defaultState.graphLayout.architectureMode}`);
    console.log(`[FORENSIC] Default mode (interaction): ${defaultState.graphLayout.mode}`);
    console.log(`[FORENSIC] Default layoutProvenance: ${defaultState.graphLayout.layoutProvenance}`);
    console.log(`[FORENSIC] Stored nodePositions count: ${Object.keys(defaultState.graphLayout.nodePositions).length}`);

    const hasAuthDefault = Object.keys(defaultState.graphLayout.nodePositions).length > 0;
    const autoLayoutRes = shouldAutoLayout(defaultState.graphLayout.mode, 'initial', {
      hasAuthoritativePositions: hasAuthDefault,
    });

    console.log(`[FORENSIC] hasAuthoritativePositions (initial load): ${hasAuthDefault}`);
    console.log(`[FORENSIC] shouldAutoLayout result: ${autoLayoutRes}`);

    expect(defaultState.graphLayout.architectureMode).toBe('hierarchical');
    expect(autoLayoutRes).toBe(true);
  });

  it('Section 7 — Traces Global Domain vs Global Feature layout calls', () => {
    const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));

    // Run Hierarchical
    const hierarchicalPos = computeArchitectureLayout(data.nodes, data.edges, {
      enableFeatureLayout: false,
    });
    // Run Hybrid
    const hybridPos = computeArchitectureLayout(data.nodes, data.edges, {
      enableFeatureLayout: true,
    });

    console.log(`[FORENSIC] Hierarchical returned positions for ${Object.keys(hierarchicalPos).length} nodes`);
    console.log(`[FORENSIC] Hybrid returned positions for ${Object.keys(hybridPos).length} nodes`);

    expect(Object.keys(hierarchicalPos).length).toBe(240);
    expect(Object.keys(hybridPos).length).toBe(240);
  });

  it('Section 8 — Stage 5 to 12 coordinate tracing for representative nodes', () => {
    const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));
    const diag = measurePipelineStageMetrics(data.nodes, data.edges, {
      enableFeatureLayout: true,
    });

    const repNodeIds = [
      'ApexClass:AdminSpendController',
      'ApexClass:SpendImportService',
      'ApexClass:CloudAccountService',
      'Object:Cloud_Spend__c',
      'Object:Cloud_Account__c',
      'Object:Spend_Import_Batch__c',
      'Object:User_Organization_Role__c',
    ];

    console.log('[SNAPSHOT KEYS]', Object.keys(diag.snapshots));
    console.log('\n--- STAGE 5..12 COORDINATE TRACE FOR REPRESENTATIVE NODES ---');
    repNodeIds.forEach(id => {
      const keys = Object.keys(diag.snapshots);
      const st5 = diag.snapshots[keys[0]]?.positions[id];
      const st6 = diag.snapshots[keys[1]]?.positions[id];
      const st7 = diag.snapshots[keys[2]]?.positions[id];
      const st8 = diag.snapshots[keys[3]]?.positions[id];
      const st9 = diag.snapshots[keys[4]]?.positions[id];
      const st10 = diag.snapshots[keys[5]]?.positions[id];
      const st11 = diag.snapshots[keys[6]]?.positions[id];
      const st12 = diag.snapshots[keys[7]]?.positions[id];

      console.log(`Node: ${id}`);
      console.log(`  Stage 5 (${keys[0]}): (${st5?.x}, ${st5?.y})`);
      console.log(`  Stage 6 (${keys[1]}): (${st6?.x}, ${st6?.y})`);
      console.log(`  Stage 7 (${keys[2]}): (${st7?.x}, ${st7?.y})`);
      console.log(`  Stage 8 (${keys[3]}): (${st8?.x}, ${st8?.y})`);
      console.log(`  Stage 9 (${keys[4]}): (${st9?.x}, ${st9?.y})`);
      console.log(`  Stage 10 (${keys[5]}): (${st10?.x}, ${st10?.y})`);
      console.log(`  Stage 11 (${keys[6]}): (${st11?.x}, ${st11?.y})`);
      console.log(`  Stage 12 (${keys[7]}): (${st12?.x}, ${st12?.y})`);
    });
  });

  it('Section 9 & 10 — Snapshot A vs Snapshot B vs Persisted Overwrite Forensics', () => {
    const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));

    // Snapshot A: Hierarchical
    const snapshotA = computeArchitectureLayout(data.nodes, data.edges, { enableFeatureLayout: false });
    // Snapshot B: Hybrid
    const snapshotB = computeArchitectureLayout(data.nodes, data.edges, { enableFeatureLayout: true });

    // Compare A and B
    let sameCount = 0;
    let diffCount = 0;
    Object.keys(snapshotA).forEach(id => {
      if (snapshotA[id].x === snapshotB[id].x && snapshotA[id].y === snapshotB[id].y) {
        sameCount++;
      } else {
        diffCount++;
      }
    });

    console.log(`\n[SNAPSHOT COMPARISON] A (Hierarchical) vs B (Hybrid): Same = ${sameCount}, Different = ${diffCount}`);
    expect(diffCount).toBeGreaterThan(200);

    // PERSISTENCE FORENSICS TEST:
    // Simulate what happens when project state contains Snapshot A (Hierarchical)
    // but the user or App selects architectureMode = 'hybrid'
    const mockStoredPositions = snapshotA; // Hierarchical positions stored

    // In GraphView on mount:
    const nodePositionsRefCurrent = mockStoredPositions;
    const currentProvenance = 'automatic-hierarchical'; // stored provenance
    const architectureMode = 'hybrid'; // UI requests hybrid!

    let hasAuth = false;
    if (nodePositionsRefCurrent && Object.keys(nodePositionsRefCurrent).length > 0) {
      if (currentProvenance === 'user-authored') {
        hasAuth = true;
      } else if (currentProvenance === 'automatic-hybrid' && architectureMode === 'hybrid') {
        hasAuth = true;
      } else if (currentProvenance === 'automatic-hierarchical' && architectureMode === 'hierarchical') {
        hasAuth = true;
      }
    }

    console.log(`[GRAPHVIEW MOUNT AUDIT] Stored provenance = '${currentProvenance}', UI requested architectureMode = '${architectureMode}'`);
    console.log(`[GRAPHVIEW MOUNT AUDIT] hasAuth evaluated to: ${hasAuth}`);

    const autoLayoutPolicy = shouldAutoLayout('interactive', 'initial', {
      hasAuthoritativePositions: hasAuth,
    });
    console.log(`[GRAPHVIEW MOUNT AUDIT] autoLayoutPolicy evaluated to: ${autoLayoutPolicy}`);

    // With our fix in resolveAuthoritativePosition:
    let overwrittenCountWithFix = 0;
    Object.keys(snapshotB).forEach(id => {
      const resolved = resolveAuthoritativePosition(id, {
        persistedPositions: nodePositionsRefCurrent,
        hasAuthoritativePositions: hasAuth,
      });
      if (resolved) {
        overwrittenCountWithFix++;
      }
    });

    console.log(`[CRITICAL FORENSIC AUDIT] Number of nodes overwritten after fix (hasAuthoritativePositions: ${hasAuth}): ${overwrittenCountWithFix}`);
    expect(overwrittenCountWithFix).toBe(0);
  });

  it('Section 12 & 13 — Feature Discovery & Region Geometry audit', () => {
    const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));
    const discovery = discoverFeatures(data.nodes, data.edges);

    console.log(`\n[FEATURE DISCOVERY] Total nodes: ${data.nodes.length}`);
    console.log(`[FEATURE DISCOVERY] Discovered features count: ${discovery.featureList.length}`);
    discovery.featureList.forEach(f => {
      console.log(`  Feature: ${f.id} (${f.displayName}): ${f.memberNodeIds ? f.memberNodeIds.length : 0} nodes`);
    });
  });

  it('Section 15 — Direct Renderer Crossing Metrics', () => {
    const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));
    const hybridPositions = computeArchitectureLayout(data.nodes, data.edges, { enableFeatureLayout: true });
    const hierarchicalPositions = computeArchitectureLayout(data.nodes, data.edges, { enableFeatureLayout: false });

    const hybridCrossings = calculateDetailedEdgeCrossings(data.nodes, data.edges, hybridPositions);
    const hierarchicalCrossings = calculateDetailedEdgeCrossings(data.nodes, data.edges, hierarchicalPositions);

    console.log('\n[CROSSING METRICS] Hybrid Layout (Candidate E):');
    console.log(`  Cpp   : ${hybridCrossings.primaryPrimaryCrossings}`);
    console.log(`  Cps   : ${hybridCrossings.primarySatelliteCrossings}`);
    console.log(`  Css   : ${hybridCrossings.satelliteSatelliteCrossings}`);
    console.log(`  Cpb   : ${hybridCrossings.primaryBridgeCrossings}`);
    console.log(`  Cbb   : ${hybridCrossings.bridgeBridgeCrossings}`);
    console.log(`  Ctotal: ${hybridCrossings.totalGeometricCrossings}`);

    console.log('\n[CROSSING METRICS] Hierarchical Layout (Legacy):');
    console.log(`  Cpp   : ${hierarchicalCrossings.primaryPrimaryCrossings}`);
    console.log(`  Cps   : ${hierarchicalCrossings.primarySatelliteCrossings}`);
    console.log(`  Css   : ${hierarchicalCrossings.satelliteSatelliteCrossings}`);
    console.log(`  Cpb   : ${hierarchicalCrossings.primaryBridgeCrossings}`);
    console.log(`  Cbb   : ${hierarchicalCrossings.bridgeBridgeCrossings}`);
    console.log(`  Ctotal: ${hierarchicalCrossings.totalGeometricCrossings}`);

    expect(hybridCrossings.totalGeometricCrossings).toBe(94662);
    expect(hybridCrossings.primaryPrimaryCrossings).toBe(8704);
  });
});
