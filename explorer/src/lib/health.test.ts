import { describe, it, expect } from 'vitest';
import { calculateArchitectureHealth } from './health';
import { ExplorerDataSchema } from '../types/explorer';

describe('calculateArchitectureHealth', () => {
  const baseData: ExplorerDataSchema = {
    schemaVersion: '1.0.0',
    analyzerVersion: '13.0.0',
    generatedAt: new Date().toISOString(),
    sourceDirectory: 'force-app/main/default',
    summary: {
      nodeCount: 10,
      edgeCount: 15,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 10,
      cycleCount: 0,
      unresolvedCount: 0,
      inventory: { files: 10, apexClasses: 10, apexTriggers: 0, lwcJs: 0, lwcHtml: 0, visualforce: 0, flows: 0, objects: 0, fields: 0 }
    },
    nodes: [],
    edges: [],
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {}
  };

  it('calculates score 100 and level GOOD for pristine architecture', () => {
    const res = calculateArchitectureHealth(baseData);
    expect(res.score).toBe(100);
    expect(res.level).toBe('GOOD');
    expect(res.mainConcerns).toContain('No major architectural concerns identified');
  });

  it('calculates score penalty for high risk components', () => {
    const data: ExplorerDataSchema = {
      ...baseData,
      summary: { ...baseData.summary, highRiskCount: 5, lowRiskCount: 5 }
    };
    const res = calculateArchitectureHealth(data);
    expect(res.score).toBe(80); // 100 - (5/10 * 40)
    expect(res.level).toBe('CAUTION');
    expect(res.mainConcerns).toContain('5 high-risk components');
  });

  it('penalizes cycles and unresolved references', () => {
    const data: ExplorerDataSchema = {
      ...baseData,
      summary: { ...baseData.summary, highRiskCount: 8, cycleCount: 2, unresolvedCount: 4 }
    };
    const res = calculateArchitectureHealth(data);
    expect(res.score).toBeLessThan(60);
    expect(res.level).toBe('HIGH CONCERN');
  });
});
