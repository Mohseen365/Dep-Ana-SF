import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvestigationDrawer } from './InvestigationDrawer';
import type { ExplorerNode } from '../types/explorer';

describe('InvestigationDrawer', () => {
  const mockNode: ExplorerNode = {
    id: 'ApexClass:AccountService',
    displayName: 'AccountService',
    type: 'ApexClass',
    file: 'force-app/main/default/classes/AccountService.cls',
    metrics: { fanIn: 1, fanOut: 2, coupling: 3, unresolved: 0, score: 5 },
    risk: 'MEDIUM',
    riskReasons: ['Medium risk'],
    behavior: {
      isTest: false,
      publicContractsCount: 1,
      asyncPatterns: [],
      securitySignalsCount: 0,
      queryCount: 1,
      dmlCount: 0,
      calloutCount: 0,
    },
    refactoringReadiness: {
      isHighRisk: false,
      hasCycles: false,
      hasUnresolved: false,
      testCoverageStatus: 'COVERED',
    },
  };

  it('renders null when open=false', () => {
    const { container } = render(
      <InvestigationDrawer
        node={mockNode}
        open={false}
        onClose={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders node name and type when open=true', () => {
    render(
      <InvestigationDrawer
        node={mockNode}
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('AccountService')).toBeInTheDocument();
    expect(screen.getByText('ApexClass')).toBeInTheDocument();
    expect(screen.getByText('Drilling content coming in UX-4')).toBeInTheDocument();
  });

  it('onClose fires on close button click', () => {
    const handleClose = vi.fn();

    render(
      <InvestigationDrawer
        node={mockNode}
        open={true}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /close investigation drawer/i });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
