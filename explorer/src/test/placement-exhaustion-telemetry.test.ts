import { describe, test, expect, beforeEach } from 'vitest';
import {
  calculateBridgeCandidatePosition,
  getPlacementExhaustionRecords,
  clearBridgeAllocations,
} from '../lib/layout/centrality';

describe('Placement Exhaustion Telemetry Unit & Contract Suite', () => {
  beforeEach(() => {
    clearBridgeAllocations();
  });

  test('No exhaustion records exist initially or before exhaustion occurs', () => {
    expect(getPlacementExhaustionRecords()).toEqual([]);
  });

  test('Successful placement produces no exhaustion records', () => {
    const result = calculateBridgeCandidatePosition(
      'bridge-node-1',
      'application',
      ['domainA', 'domainB'],
      { domainA: { x: 0, y: 100 }, domainB: { x: 400, y: 100 } },
      { domainA: { xMin: 0, xMax: 200, yMin: 0, yMax: 200 }, domainB: { xMin: 300, xMax: 500, yMin: 0, yMax: 200 } },
      {}
    );

    expect(result.isExhausted).toBe(false);
    expect(result.exhaustionTelemetry).toBeUndefined();
    expect(getPlacementExhaustionRecords()).toEqual([]);
  });

  test('Exhausted finite search space produces structured telemetry record with all contract fields', () => {
    // Build precise minimal blockers covering the candidate grid
    // For small range: initialMinX=100, initialMaxX=120, maxExpansionSteps=10
    const denseOccupancy: Record<string, { x: number; y: number }> = {};
    let count = 0;
    for (let x = -2000; x <= 2000; x += 120) {
      for (const y of [100, 0, 200]) {
        denseOccupancy[`blocker-${count++}`] = { x, y };
      }
    }

    const result = calculateBridgeCandidatePosition(
      'bridge-exhausted-node',
      'application',
      ['domainA', 'domainB'],
      { domainA: { x: 100, y: 100 }, domainB: { x: 120, y: 100 } },
      { domainA: { xMin: 100, xMax: 110, yMin: 0, yMax: 200 }, domainB: { xMin: 110, xMax: 120, yMin: 0, yMax: 200 } },
      {},
      {
        allocatedPositions: denseOccupancy,
      }
    );

    expect(result.isExhausted).toBe(true);
    expect(result.exhaustionTelemetry).toBeDefined();

    const records = getPlacementExhaustionRecords();
    expect(records.length).toBe(1);

    const rec = records[0];
    expect(rec.bridgeId).toBe('bridge-exhausted-node');
    expect(rec.corridorKey).toBe('application:domainA,domainB');
    expect(typeof rec.corridorPopulation).toBe('number');
    expect(typeof rec.allocationOrder).toBe('number');
    expect(typeof rec.initialMinX).toBe('number');
    expect(typeof rec.initialMaxX).toBe('number');
    expect(typeof rec.finalMinX).toBe('number');
    expect(typeof rec.finalMaxX).toBe('number');
    expect(typeof rec.baseY).toBe('number');
    expect(typeof rec.candidateCount).toBe('number');
    expect(rec.candidateCount).toBeGreaterThan(0);
    expect(typeof rec.collisionChecks).toBe('number');
    expect(rec.collisionChecks).toBeGreaterThan(0);
    expect(typeof rec.expansionSteps).toBe('number');
    expect(typeof rec.primaryNodeCount).toBe('number');
    expect(rec.reason).toBe('FINITE_SEARCH_SPACE_EXHAUSTED');
  });

  test('getPlacementExhaustionRecords returns a defensive snapshot isolated from internal mutations', () => {
    const denseOccupancy: Record<string, { x: number; y: number }> = {};
    let count = 0;
    for (let x = -2000; x <= 2000; x += 120) {
      for (const y of [100, 0, 200]) {
        denseOccupancy[`blocker-${count++}`] = { x, y };
      }
    }

    calculateBridgeCandidatePosition(
      'bridge-node-mut',
      'application',
      ['domainA', 'domainB'],
      { domainA: { x: 100, y: 100 }, domainB: { x: 120, y: 100 } },
      { domainA: { xMin: 100, xMax: 110, yMin: 0, yMax: 200 }, domainB: { xMin: 110, xMax: 120, yMin: 0, yMax: 200 } },
      {},
      { allocatedPositions: denseOccupancy }
    );

    const snapshot1 = getPlacementExhaustionRecords();
    expect(snapshot1.length).toBe(1);

    // Mutate returned snapshot
    (snapshot1[0] as any).reason = 'MUTATED_REASON';
    (snapshot1[0] as any).candidateCount = 99999;

    const snapshot2 = getPlacementExhaustionRecords();
    expect(snapshot2[0].reason).toBe('FINITE_SEARCH_SPACE_EXHAUSTED');
    expect(snapshot2[0].candidateCount).not.toBe(99999);
  });

  test('clearBridgeAllocations resets telemetry deterministically between runs', () => {
    const denseOccupancy: Record<string, { x: number; y: number }> = {};
    let count = 0;
    for (let x = -2000; x <= 2000; x += 120) {
      for (const y of [100, 0, 200]) {
        denseOccupancy[`blocker-${count++}`] = { x, y };
      }
    }

    calculateBridgeCandidatePosition(
      'bridge-node-reset',
      'application',
      ['domainA', 'domainB'],
      { domainA: { x: 100, y: 100 }, domainB: { x: 120, y: 100 } },
      { domainA: { xMin: 100, xMax: 110, yMin: 0, yMax: 200 }, domainB: { xMin: 110, xMax: 120, yMin: 0, yMax: 200 } },
      {},
      { allocatedPositions: denseOccupancy }
    );

    expect(getPlacementExhaustionRecords().length).toBe(1);

    clearBridgeAllocations();

    expect(getPlacementExhaustionRecords()).toEqual([]);
  });
});
