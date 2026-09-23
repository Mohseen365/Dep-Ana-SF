import { describe, it, expect } from 'vitest';
import { parseExplorerData } from '../../../explorer/src/lib/schema';
import fixtureData from '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json';

describe('Canonical Fixture Validation', () => {
  it('strictly parses canonical fixture via Zod parseExplorerData', () => {
    const parsed = parseExplorerData(fixtureData);
    expect(parsed).toBeDefined();
    expect(parsed.schemaVersion).toBe('1.0.0');
    expect(parsed.analyzerVersion).toBe('13.0.0');
    expect(parsed.nodes.length).toBe(240);
    expect(parsed.edges.length).toBe(1114);
  });
});
