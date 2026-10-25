import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NodeHoverCard } from './graph-internals/NodeHoverCard';
import { EdgeHoverCard } from './graph-internals/EdgeHoverCard';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

describe('HoverCard Copy controls (F3)', () => {
  const writeTextMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
  });

  it('renders copy button in NodeHoverCard and writes node file path', async () => {
    const mockNode: ExplorerNode = {
      id: 'node1',
      displayName: 'AccountController',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/AccountController.cls',
      metrics: { fanIn: 2, fanOut: 3, coupling: 0.5, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: { isTest: false, sharing: 'with sharing', publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
      refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'COVERED' },
    };

    render(<NodeHoverCard node={mockNode} x={100} y={100} />);

    const copyBtn = screen.getByRole('button', { name: 'Copy file path' });
    expect(copyBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(writeTextMock).toHaveBeenCalledWith('force-app/main/default/classes/AccountController.cls');
  });

  it('renders copy button in EdgeHoverCard and writes edge location file:line', async () => {
    const mockEdge: ExplorerEdge = {
      id: 'edge1',
      source: 'node1',
      target: 'node2',
      relationshipType: 'method-call',
      file: 'force-app/main/default/classes/AccountController.cls',
      line: 42,
      column: 1,
      method: 'getAccount',
      evidence: 'AccountController.getAccount()',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: '1.0',
      methodOwner: 'AccountController',
      canonical: {
        source: { type: 'ApexClass', name: 'OrderService' },
        target: { type: 'ApexClass', name: 'AccountController' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 42, column: 1 },
      },
    };

    render(<EdgeHoverCard edge={mockEdge} x={100} y={100} />);

    const copyBtn = screen.getByRole('button', { name: 'Copy source location' });
    expect(copyBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(writeTextMock).toHaveBeenCalledWith('force-app/main/default/classes/AccountController.cls:42');
  });
});
