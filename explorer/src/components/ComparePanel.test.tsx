import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComparePanel } from './ComparePanel';
import type { UseCompareStateReturn } from '../hooks/useCompareState';

describe('ComparePanel Component', () => {
  const createMockCompareState = (overrides = {}): UseCompareStateReturn => ({
    isActive: false,
    beforeRaw: '',
    afterRaw: '',
    diffResult: null,
    overlayGraph: null,
    focusedEntityId: null,
    error: null,
    setBeforeRaw: vi.fn(),
    setAfterRaw: vi.fn(),
    runCompare: vi.fn(() => true),
    focusEntity: vi.fn(),
    exitCompare: vi.fn(),
    ...overrides,
  });

  it('renders input textareas and compare button when inactive', () => {
    const state = createMockCompareState({ isActive: false });
    render(<ComparePanel compareState={state} />);

    expect(screen.getByText(/Architecture Snapshot Compare/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste baseline snapshot JSON/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste target snapshot JSON/i)).toBeInTheDocument();
    expect(screen.getByText(/Compare Snapshots/i)).toBeInTheDocument();
  });

  it('renders error banner when malformed JSON error is present', () => {
    const state = createMockCompareState({
      isActive: false,
      error: "Malformed 'before' snapshot JSON: Unexpected token in JSON at position 0",
    });
    render(<ComparePanel compareState={state} />);

    expect(screen.getByText(/Malformed 'before' snapshot JSON/i)).toBeInTheDocument();
  });

  it('renders "No architectural changes" when snapshots are identical', () => {
    const state = createMockCompareState({
      isActive: true,
      diffResult: {
        diffSchemaVersion: 1,
        snapshotBeforeIdentity: 'snap1',
        snapshotAfterIdentity: 'snap1',
        hasChanges: false,
        summary: {
          addedNodesCount: 0,
          removedNodesCount: 0,
          changedNodesCount: 0,
          addedEdgesCount: 0,
          removedEdgesCount: 0,
          addedCyclesCount: 0,
          removedCyclesCount: 0,
          addedUnresolvedReferencesCount: 0,
          removedUnresolvedReferencesCount: 0,
          totalChangesCount: 0,
        },
        addedNodes: [],
        removedNodes: [],
        changedNodes: [],
        addedEdges: [],
        removedEdges: [],
        cycleChanges: { added: [], removed: [] },
        unresolvedReferenceChanges: { added: [], removed: [] },
      },
    });
    render(<ComparePanel compareState={state} />);

    expect(screen.getByText(/No architectural changes/i)).toBeInTheDocument();
    expect(screen.getByText(/Exit Compare Mode/i)).toBeInTheDocument();
  });

  it('renders diff summary cards and change items when diff exists', () => {
    const state = createMockCompareState({
      isActive: true,
      diffResult: {
        diffSchemaVersion: 1,
        snapshotBeforeIdentity: 'snap1',
        snapshotAfterIdentity: 'snap2',
        hasChanges: true,
        summary: {
          addedNodesCount: 1,
          removedNodesCount: 0,
          changedNodesCount: 1,
          addedEdgesCount: 1,
          removedEdgesCount: 0,
          addedCyclesCount: 0,
          removedCyclesCount: 0,
          addedUnresolvedReferencesCount: 0,
          removedUnresolvedReferencesCount: 0,
          totalChangesCount: 3,
        },
        addedNodes: [{ id: 'ApexClass:NewComponent', name: 'NewComponent', type: 'ApexClass' }],
        removedNodes: [],
        changedNodes: [
          {
            id: 'ApexClass:ServiceA',
            name: 'ServiceA',
            type: 'ApexClass',
            changes: [{ property: 'risk', before: 'LOW', after: 'HIGH' }],
          },
        ],
        addedEdges: [
          {
            id: 'ApexClass:ServiceA|ApexClass:NewComponent|method-call|call',
            source: 'ApexClass:ServiceA',
            target: 'ApexClass:NewComponent',
            relationshipType: 'method-call',
            method: 'call',
          },
        ],
        removedEdges: [],
        cycleChanges: { added: [], removed: [] },
        unresolvedReferenceChanges: { added: [], removed: [] },
      },
    });

    render(<ComparePanel compareState={state} />);

    expect(screen.getByText(/\+ Added Node:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ApexClass:NewComponent/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Changed Node:/i)).toBeInTheDocument();
    expect(screen.getByText(/risk: LOW ➔ HIGH/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ Added Edge:/i)).toBeInTheDocument();
  });

  it('triggers focusEntity when a change item is clicked', () => {
    const focusEntity = vi.fn();
    const state = createMockCompareState({
      isActive: true,
      focusEntity,
      diffResult: {
        diffSchemaVersion: 1,
        snapshotBeforeIdentity: 'snap1',
        snapshotAfterIdentity: 'snap2',
        hasChanges: true,
        summary: {
          addedNodesCount: 1,
          removedNodesCount: 0,
          changedNodesCount: 0,
          addedEdgesCount: 0,
          removedEdgesCount: 0,
          addedCyclesCount: 0,
          removedCyclesCount: 0,
          addedUnresolvedReferencesCount: 0,
          removedUnresolvedReferencesCount: 0,
          totalChangesCount: 1,
        },
        addedNodes: [{ id: 'ApexClass:NewComponent', name: 'NewComponent', type: 'ApexClass' }],
        removedNodes: [],
        changedNodes: [],
        addedEdges: [],
        removedEdges: [],
        cycleChanges: { added: [], removed: [] },
        unresolvedReferenceChanges: { added: [], removed: [] },
      },
    });

    render(<ComparePanel compareState={state} />);

    const item = screen.getByText(/\+ Added Node:/i).parentElement;
    if (item) {
      fireEvent.click(item);
      expect(focusEntity).toHaveBeenCalledWith('ApexClass:NewComponent');
    }
  });

  it('triggers exitCompare when Exit Compare Mode button is clicked', () => {
    const exitCompare = vi.fn();
    const state = createMockCompareState({
      isActive: true,
      exitCompare,
      diffResult: {
        diffSchemaVersion: 1,
        snapshotBeforeIdentity: 'snap1',
        snapshotAfterIdentity: 'snap1',
        hasChanges: false,
        summary: {
          addedNodesCount: 0,
          removedNodesCount: 0,
          changedNodesCount: 0,
          addedEdgesCount: 0,
          removedEdgesCount: 0,
          addedCyclesCount: 0,
          removedCyclesCount: 0,
          addedUnresolvedReferencesCount: 0,
          removedUnresolvedReferencesCount: 0,
          totalChangesCount: 0,
        },
        addedNodes: [],
        removedNodes: [],
        changedNodes: [],
        addedEdges: [],
        removedEdges: [],
        cycleChanges: { added: [], removed: [] },
        unresolvedReferenceChanges: { added: [], removed: [] },
      },
    });

    render(<ComparePanel compareState={state} />);

    const btn = screen.getByText(/Exit Compare Mode/i);
    fireEvent.click(btn);
    expect(exitCompare).toHaveBeenCalled();
  });
});
