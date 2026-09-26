import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { resolveAuthoritativePosition } from '../lib/position-policy';
import { calculateDetailedEdgeCrossings } from '../lib/layout/metrics';
type NodePositionMap = Record<string, { x: number; y: number; isUserDefined?: boolean; layoutProvenance?: string }>;

describe('Phase 13 Real Execution Forensic Audit & Regression Test Suite', () => {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const rawData = fs.readFileSync(fixturePath, 'utf8');
  const fixtureData = JSON.parse(rawData);

  it('1. Authoritative Fixture Verification (Checksum, Node Count, Edge Count)', () => {
    const hash = crypto.createHash('sha256').update(rawData).digest('hex');
    expect(hash).toBe('feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295');
    expect(fixtureData.nodes.length).toBe(240);
    expect(fixtureData.edges.length).toBe(1024);
  });

  it('2. Position Policy Bug Prevention Test: Stale Automatic Positions Must NOT Overwrite Hybrid Layout', () => {
    // 1. Generate fresh Hybrid Layout
    const hybridPositions = computeArchitectureLayout(fixtureData.nodes, fixtureData.edges, {
      enableFeatureLayout: true,
    });

    // 2. Create stale automatic hierarchical positions map
    const staleHierarchicalPositions: NodePositionMap = {};
    fixtureData.nodes.forEach((n: any, idx: number) => {
      staleHierarchicalPositions[n.id] = {
        x: 100 + idx,
        y: 200 + idx,
        layoutProvenance: 'automatic-hierarchical'
      };
    });

    const testNodeId = fixtureData.nodes[0].id;
    const freshHybridPos = hybridPositions[testNodeId];
    expect(freshHybridPos).toBeDefined();

    // 3. Test resolveAuthoritativePosition when hasAuthoritativePositions is FALSE (i.e. switching modes)
    const resolvedWhenNotAuth = resolveAuthoritativePosition(
      testNodeId,
      {
        persistedPositions: staleHierarchicalPositions,
        hasAuthoritativePositions: false
      }
    );

    // Resolved position MUST be null so GraphView falls back to computed Hybrid position
    expect(resolvedWhenNotAuth).toBeNull();

    // Simulated GraphView resolution logic:
    const finalPosition = resolvedWhenNotAuth ? resolvedWhenNotAuth.position : hybridPositions[testNodeId];
    expect(finalPosition.x).toBe(freshHybridPos.x);
    expect(finalPosition.y).toBe(freshHybridPos.y);

    // 4. Test resolveAuthoritativePosition when hasAuthoritativePositions is TRUE (user dragged node)
    const userPositions: NodePositionMap = {};
    userPositions[testNodeId] = { x: 999, y: 888, isUserDefined: true, layoutProvenance: 'user-authored' };

    const resolvedWhenAuth = resolveAuthoritativePosition(
      testNodeId,
      {
        persistedPositions: userPositions,
        hasAuthoritativePositions: true
      }
    );

    expect(resolvedWhenAuth).not.toBeNull();
    expect(resolvedWhenAuth?.position.x).toBe(999);
    expect(resolvedWhenAuth?.position.y).toBe(888);
  });

  it('3. Candidate E Crossing Metrics Assertions on Real Fixture Output', () => {
    const hybridPositions = computeArchitectureLayout(fixtureData.nodes, fixtureData.edges, {
      enableFeatureLayout: true,
    });

    const crossings = calculateDetailedEdgeCrossings(
      fixtureData.nodes,
      fixtureData.edges,
      hybridPositions
    );

    expect(crossings.primaryPrimaryCrossings).toBe(7812);
    expect(crossings.primarySatelliteCrossings).toBe(38706);
    expect(crossings.satelliteSatelliteCrossings).toBe(36381);
    expect(crossings.primaryBridgeCrossings).toBe(2272);
    expect(crossings.bridgeBridgeCrossings).toBe(196);
    expect(crossings.totalGeometricCrossings).toBe(85367);
    expect(crossings.totalGeometricCrossings).toBe(
      crossings.primaryPrimaryCrossings +
      crossings.primarySatelliteCrossings +
      crossings.satelliteSatelliteCrossings +
      crossings.primaryBridgeCrossings +
      crossings.bridgeBridgeCrossings
    );
  });
});
