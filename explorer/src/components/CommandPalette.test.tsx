import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CommandPalette } from './CommandPalette';
import { ExplorerNode } from '../types/explorer';

const createMockNode = (overrides: Partial<ExplorerNode> & { id: string; displayName: string }): ExplorerNode => ({
  type: 'ApexClass',
  file: `classes/${overrides.displayName}.cls`,
  risk: 'LOW',
  riskReasons: [],
  metrics: {
    fanIn: 0,
    fanOut: 0,
    coupling: 0,
    unresolved: 0,
    score: 100,
  },
  behavior: {
    isTest: false,
    sharing: 'with sharing',
    calloutCount: 0,
    asyncPatterns: [],
    publicContractsCount: 0,
    securitySignalsCount: 0,
    queryCount: 0,
    dmlCount: 0,
  },
  refactoringReadiness: {
    isHighRisk: false,
    hasCycles: false,
    hasUnresolved: false,
    testCoverageStatus: 'COVERED',
  },
  ...overrides,
});

const mockNodes: ExplorerNode[] = [
  createMockNode({
    id: 'ApexClass:MovieController',
    displayName: 'MovieController',
    type: 'ApexClass',
    file: 'classes/MovieController.cls',
    risk: 'HIGH',
  }),
  createMockNode({
    id: 'ApexClass:MovieService',
    displayName: 'MovieService',
    type: 'ApexClass',
    file: 'classes/MovieService.cls',
    risk: 'MEDIUM',
  }),
  createMockNode({
    id: 'LWC:movieCard',
    displayName: 'movieCard',
    type: 'LWC',
    file: 'lwc/movieCard/movieCard.js',
    risk: 'LOW',
  }),
  createMockNode({
    id: 'ApexClass:AccountService',
    displayName: 'AccountService',
    type: 'ApexClass',
    file: 'classes/AccountService.cls',
    risk: 'LOW',
  }),
];

describe('CommandPalette', () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onSelectNode: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onClose = vi.fn();
    onSelectNode = vi.fn();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CommandPalette
        isOpen={false}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders search input, commands, and list when isOpen is true', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );

    expect(screen.getByTestId('command-palette-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-input')).toBeInTheDocument();
    // Default shows commands + nodes
    expect(screen.getByText('⚡ Open Summary')).toBeInTheDocument();
    expect(screen.getByText('⚡ Open Hotspots')).toBeInTheDocument();
    expect(screen.getByText('MovieController')).toBeInTheDocument();
  });

  it('renders mounted panel view when "Open Summary" command is selected', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );

    const summaryCmd = screen.getByTestId('command-palette-item-cmd-summary');
    fireEvent.click(summaryCmd);

    expect(screen.getByTestId('command-palette-panel-view')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-panel-content-summary')).toBeInTheDocument();
    expect(screen.getByText('Open Summary')).toBeInTheDocument();
  });

  it('renders mounted panel view for each panel command', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );

    // Test Hotspots
    fireEvent.click(screen.getByTestId('command-palette-item-cmd-hotspots'));
    expect(screen.getByTestId('command-palette-panel-content-hotspots')).toBeInTheDocument();

    // Back to list
    fireEvent.click(screen.getByTestId('command-palette-back-btn'));

    // Test Diagnostics
    fireEvent.click(screen.getByTestId('command-palette-item-cmd-diagnostics'));
    expect(screen.getByTestId('command-palette-panel-content-diagnostics')).toBeInTheDocument();

    // Back to list
    fireEvent.click(screen.getByTestId('command-palette-back-btn'));

    // Test Findings
    fireEvent.click(screen.getByTestId('command-palette-item-cmd-findings'));
    expect(screen.getByTestId('command-palette-panel-content-findings')).toBeInTheDocument();
  });

  it('"← Back" returns from panel view to command search list mode', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );

    fireEvent.click(screen.getByTestId('command-palette-item-cmd-summary'));
    expect(screen.getByTestId('command-palette-panel-view')).toBeInTheDocument();

    const backBtn = screen.getByTestId('command-palette-back-btn');
    fireEvent.click(backBtn);

    expect(screen.queryByTestId('command-palette-panel-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('command-palette-input')).toBeInTheDocument();
  });

  it('Escape key closes palette from panel mode', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );

    fireEvent.click(screen.getByTestId('command-palette-item-cmd-summary'));
    expect(screen.getByTestId('command-palette-panel-view')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('executes action command callbacks and closes palette', () => {
    const onApplyFocus = vi.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
        onApplyFocus={onApplyFocus}
      />
    );

    fireEvent.click(screen.getByTestId('command-palette-item-cmd-focus'));

    expect(onApplyFocus).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('filters commands and nodes based on input query', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );

    const input = screen.getByTestId('command-palette-input');
    fireEvent.change(input, { target: { value: 'Compare' } });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByText('⚡ Compare snapshots')).toBeInTheDocument();
    expect(screen.queryByText('MovieController')).not.toBeInTheDocument();
  });

  it('renders "Hand off to refactor" command disabled when no node is investigated', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
        selectedNodeId={null}
        isInvestigating={false}
      />
    );

    const handoffItem = screen.getByTestId('command-palette-item-handoff-to-refactor');
    expect(handoffItem).toBeInTheDocument();
    expect(handoffItem).toHaveAttribute('aria-disabled', 'true');
    expect(handoffItem).toHaveClass('disabled');
  });

  it('invokes onRequestHandoff callback with current node ID and closes palette when handoff command is enabled and selected', () => {
    const onRequestHandoff = vi.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
        selectedNodeId="ApexClass:MovieController"
        isInvestigating={true}
        onRequestHandoff={onRequestHandoff}
      />
    );

    const handoffItem = screen.getByTestId('command-palette-item-handoff-to-refactor');
    expect(handoffItem).not.toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(handoffItem);

    expect(onRequestHandoff).toHaveBeenCalledWith('ApexClass:MovieController');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
