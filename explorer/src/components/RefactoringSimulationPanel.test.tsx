import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RefactoringSimulationPanel } from './RefactoringSimulationPanel';
import type { RefactoringProposal, StepImpact } from '../lib/refactoring-simulation';

const sampleProposal: RefactoringProposal = {
  id: 'prop-1',
  title: 'Refactor Sample Service',
  description: 'Sample proposal description',
  steps: [
    {
      id: 'step-1',
      title: 'Step 1: Extract Service',
      description: 'Extract service component',
      operations: [{ type: 'remove-node', nodeId: 'old-service' }],
    },
    {
      id: 'step-2',
      title: 'Step 2: Add New Helper',
      description: 'Add new helper component',
      operations: [
        {
          type: 'add-node',
          node: { id: 'new-helper', displayName: 'NewHelper', type: 'ApexClass' },
        },
      ],
    },
  ],
};

const sampleStepImpact: StepImpact = {
  affectedNodeIds: ['old-service'],
  affectedEdgeIds: ['edge-1'],
  affectedComponentNames: ['OldService'],
  findingDelta: {
    resolved: [
      {
        id: 'f-1',
        ruleId: 'RULE1',
        severity: 'HIGH',
        title: 'Resolved Finding',
        description: 'Finding details',
        affectedNodeIds: ['old-service'],
      },
    ],
    introduced: [],
    unchanged: [],
    changed: [],
  },
  stepDescription: 'Remove node old-service',
};

describe('RefactoringSimulationPanel', () => {
  it('renders simulation panel and navigates steps correctly', () => {
    const onStepChange = vi.fn();
    const onCancel = vi.fn();
    const onCommit = vi.fn();

    render(
      <RefactoringSimulationPanel
        proposal={sampleProposal}
        currentStepIndex={0}
        stepImpact={sampleStepImpact}
        onStepChange={onStepChange}
        onCancel={onCancel}
        onCommit={onCommit}
      />
    );

    expect(screen.getByText('Refactor Sample Service')).toBeDefined();
    expect(screen.getByText('RESOLVED FINDINGS')).toBeDefined();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);

    const nextBtn = screen.getByText('Next Step \u2192');
    fireEvent.click(nextBtn);
    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it('triggers cancel and commit callbacks correctly', () => {
    const onStepChange = vi.fn();
    const onCancel = vi.fn();
    const onCommit = vi.fn();

    render(
      <RefactoringSimulationPanel
        proposal={sampleProposal}
        currentStepIndex={0}
        stepImpact={sampleStepImpact}
        onStepChange={onStepChange}
        onCancel={onCancel}
        onCommit={onCommit}
      />
    );

    const cancelBtn = screen.getByText('Cancel Simulation');
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();

    const commitBtn = screen.getByText('Commit Changes');
    fireEvent.click(commitBtn);
    expect(onCommit).toHaveBeenCalled();
  });
});
