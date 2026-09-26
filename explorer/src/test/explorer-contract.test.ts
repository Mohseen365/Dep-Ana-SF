import { describe, it, expect } from 'vitest';
import type { ExplorerNode as ContractExplorerNode } from '../../../explorer-contract';
import type { ExplorerNode as AppExplorerNode } from '../types/explorer';
import { ExplorerNodeZ } from '../lib/schema';

describe('explorer-contract testCoverageStatus alignment', () => {
  it('asserts AMBIGUOUS is valid in testCoverageStatus in contract', () => {
    const validContractStatuses: ContractExplorerNode['refactoringReadiness']['testCoverageStatus'][] = [
      'COVERED',
      'NO_TESTS',
      'UNTESTED',
      'AMBIGUOUS',
    ];
    expect(validContractStatuses).toContain('AMBIGUOUS');
  });

  it('asserts no drift between TypeScript types and Zod schema for testCoverageStatus', () => {
    const validAppStatuses: AppExplorerNode['refactoringReadiness']['testCoverageStatus'][] = [
      'COVERED',
      'NO_TESTS',
      'UNTESTED',
      'AMBIGUOUS',
    ];

    validAppStatuses.forEach((status) => {
      const mockNode = {
        id: 'ApexClass:Test',
        displayName: 'Test',
        type: 'ApexClass',
        file: 'force-app/Test.cls',
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
          testCoverageStatus: status,
        },
      };

      const parsed = ExplorerNodeZ.safeParse(mockNode);
      expect(parsed.success).toBe(true);
    });
  });
});
