import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NodeHoverCard } from './NodeHoverCard';
import type { ExplorerNode } from '../../types/explorer';
import type { ArchitectureFinding } from '../../lib/intelligence';

describe('NodeHoverCard Finding Max Severity Display (Fix #11)', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const node: ExplorerNode = {
    id: 'node-1',
    displayName: 'Hovered Node',
    type: 'ApexClass',
    file: 'src/Node1.cls',
    risk: 'LOW',
    riskReasons: [],
    metrics: { fanIn: 1, fanOut: 1, coupling: 0, unresolved: 0, score: 0 },
    behavior: { isTest: false },
    refactoringReadiness: {
      isHighRisk: false,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED',
    },
  };

  it('renders maxSeverity when findings array has lower severity first', () => {
    const findings: ArchitectureFinding[] = [
      {
        id: 'finding-1',
        type: 'LOW_SEVERITY_ISSUE',
        severity: 'LOW',
        title: 'Low severity finding',
        description: 'Low severity description',
        nodeIds: ['node-1'],
        edgeIds: [],
        evidence: [],
        provenance: {
          origin: 'ANALYZER_FACT',
          source: 'RuleEngine',
          facts: {},
        },
        rule: {
          ruleId: 'low-sev-1',
          ruleVersion: '1.0',
          name: 'Low Severity Rule',
        },
      },
      {
        id: 'finding-2',
        type: 'CRITICAL_SEVERITY_ISSUE',
        severity: 'CRITICAL',
        title: 'Critical severity finding',
        description: 'Critical severity description',
        nodeIds: ['node-1'],
        edgeIds: [],
        evidence: [],
        provenance: {
          origin: 'ANALYZER_FACT',
          source: 'RuleEngine',
          facts: {},
        },
        rule: {
          ruleId: 'crit-sev-1',
          ruleVersion: '1.0',
          name: 'Critical Severity Rule',
        },
      },
    ];

    render(<NodeHoverCard node={node} x={100} y={100} findings={findings} />);

    // The text should render maxSeverity (CRITICAL), not nodeFindings[0].severity (LOW)
    const summaryEl = screen.getByText(/2 issues \(CRITICAL\)/i);
    expect(summaryEl).toBeDefined();
  });
});
