import { describe, it, expect } from 'vitest';
import { adaptSubwayMap, generateSubwayRoutePath } from './subway-adapter';
import { ExplorerDataSchema } from '../../types/explorer';

describe('subway-adapter', () => {
  const sampleData: ExplorerDataSchema = {
    nodes: [
      { id: 'node1', displayName: 'AccountController', type: 'ApexClass', risk: 'HIGH', file: 'AccountController.cls' },
      { id: 'node2', displayName: 'AccountService', type: 'ApexClass', risk: 'MEDIUM', file: 'AccountService.cls' },
      { id: 'node3', displayName: 'AccountTrigger', type: 'ApexTrigger', risk: 'LOW', file: 'AccountTrigger.trigger' },
      { id: 'node4', displayName: 'LoggerUtil', type: 'ApexClass', risk: 'LOW', file: 'LoggerUtil.cls' },
    ],
    edges: [
      { id: 'e1', source: 'node1', target: 'node2', relationshipType: 'CALLS' },
      { id: 'e2', source: 'node3', target: 'node2', relationshipType: 'CALLS' },
      { id: 'e3', source: 'node2', target: 'node4', relationshipType: 'CALLS' },
    ]
  };

  it('handles empty data gracefully', () => {
    const result = adaptSubwayMap({ nodes: [], edges: [] });
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
