import { describe, it, expect } from 'vitest';
import { parseExplorerData } from './schema';
import publicExplorerData from '../../public/explorer-data.json';

describe('parseExplorerData', () => {
  const validPayload = {
    schemaVersion: '1.0',
    analyzerVersion: '2.0.0',
    generatedAt: '2025-01-01T00:00:00Z',
    sourceDirectory: 'force-app',
    summary: {
      nodeCount: 1,
      edgeCount: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 1,
      cycleCount: 0,
      unresolvedCount: 0,
      inventory: {
        files: 1,
        apexClasses: 1,
        apexTriggers: 0,
        lwcJs: 0,
        lwcHtml: 0,
        visualforce: 0,
        flows: 0,
        objects: 0,
        fields: 0,
      },
    },
    nodes: [
      {
        id: 'ApexClass:Foo',
        displayName: 'Foo',
        type: 'ApexClass',
        file: 'force-app/Foo.cls',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: {
          isTest: false,
          sharing: 'with sharing',
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: false,
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: 'COVERED',
        },
      },
    ],
    edges: [],
    cycles: [],
    unresolvedReferences: [],
    impactSummaries: {},
  };

  it('parses valid payload successfully', () => {
    const parsed = parseExplorerData(validPayload);
    expect(parsed.schemaVersion).toBe('1.0');
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.nodes[0].displayName).toBe('Foo');
  });

  it('throws descriptive error on missing required field', () => {
    const invalid = { ...validPayload, schemaVersion: undefined };
    expect(() => parseExplorerData(invalid)).toThrowError(/Invalid Explorer Data Schema: schemaVersion:/);
  });

  it('strips unknown extra fields', () => {
    const payloadWithExtra = {
      ...validPayload,
      unknownExtraFieldAtRoot: 'should be stripped',
      summary: {
        ...validPayload.summary,
        extraInSummary: 123,
      },
    };
    const parsed = parseExplorerData(payloadWithExtra) as unknown as Record<string, unknown>;
    expect(parsed).not.toHaveProperty('unknownExtraFieldAtRoot');
    expect((parsed.summary as Record<string, unknown>)).not.toHaveProperty('extraInSummary');
  });

  it('validates the sample explorer-data.json from public directory', () => {
    const parsed = parseExplorerData(publicExplorerData);
    expect(parsed).toBeDefined();
    expect(parsed.nodes.length).toBeGreaterThan(0);
    expect(parsed.summary.nodeCount).toBeGreaterThan(0);
  });
});
