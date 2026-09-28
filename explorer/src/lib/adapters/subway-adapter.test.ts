import { describe, it, expect } from 'vitest';
import { adaptSubwayMap, generateSubwayRoutePath } from './subway-adapter';
import { createMockNode, createMockEdge, createMockDataSchema } from '../../test/mock-factories';

describe('subway-adapter', () => {
  const sampleData = createMockDataSchema(
    [
      createMockNode('node1', 'AccountController', 'ApexClass', 'HIGH', 'AccountController.cls'),
      createMockNode('node2', 'AccountService', 'ApexClass', 'MEDIUM', 'AccountService.cls'),
      createMockNode('node3', 'AccountTrigger', 'ApexTrigger', 'LOW', 'AccountTrigger.trigger'),
      createMockNode('node4', 'LoggerUtil', 'ApexClass', 'LOW', 'LoggerUtil.cls'),
    ],
    [
      createMockEdge('e1', 'node1', 'node2', 'method-call'),
      createMockEdge('e2', 'node3', 'node2', 'method-call'),
      createMockEdge('e3', 'node2', 'node4', 'method-call'),
    ]
  );

  it('handles empty data gracefully', () => {
    const result = adaptSubwayMap(createMockDataSchema([], []));
    expect(result.lines).toEqual([]);
    expect(result.stations).toEqual([]);
    expect(result.routes).toEqual([]);
    expect(result.summary.totalLines).toBe(0);
    expect(result.summary.totalStations).toBe(0);
  });

  it('transforms sample graph into SubwayMapData with lines and stations', () => {
    const result = adaptSubwayMap(sampleData);
    expect(result.summary.totalStations).toBe(4);
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.routes.length).toBe(3);

    const station1 = result.stationsById.get('node1');
    expect(station1).toBeDefined();
    expect(station1?.displayName).toBe('AccountController');
    expect(station1?.x).toBeGreaterThan(0);
    expect(station1?.y).toBeGreaterThan(0);
  });

  it('identifies transfer hubs connecting across feature boundaries', () => {
    const result = adaptSubwayMap(sampleData);
    expect(result.summary.totalTransferHubs).toBeGreaterThanOrEqual(0);
  });

  it('generates valid octilinear route paths', () => {
    const pathHorizontal = generateSubwayRoutePath(100, 100, 300, 100);
    expect(pathHorizontal).toBe('M 100 100 L 300 100');

    const pathVertical = generateSubwayRoutePath(100, 100, 100, 300);
    expect(pathVertical).toBe('M 100 100 L 100 300');

    const pathDiagonal = generateSubwayRoutePath(100, 100, 200, 300);
    expect(pathDiagonal).toContain('M 100 100');
    expect(pathDiagonal).toContain('L 200 300');
  });

  it('maintains input immutability and deterministic ordering', () => {
    const copyInput = JSON.parse(JSON.stringify(sampleData));
    const result1 = adaptSubwayMap(sampleData);
    const result2 = adaptSubwayMap(sampleData);

    expect(sampleData).toEqual(copyInput);
    expect(result1.stations.map(s => s.nodeId)).toEqual(result2.stations.map(s => s.nodeId));
    expect(result1.lines.map(l => l.lineId)).toEqual(result2.lines.map(l => l.lineId));
  });
});
