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

  it('renders search input and list when isOpen is true', () => {
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
    // Default shows all nodes when query is empty
    expect(screen.getByText('MovieController')).toBeInTheDocument();
    expect(screen.getByText('MovieService')).toBeInTheDocument();
    expect(screen.getByText('movieCard')).toBeInTheDocument();
    expect(screen.getByText('AccountService')).toBeInTheDocument();
  });

  it('filters nodes based on input query after debounce', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );

    const input = screen.getByTestId('command-palette-input');
    fireEvent.change(input, { target: { value: 'movie' } });

    // Advance past 100ms debounce
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByText('MovieController')).toBeInTheDocument();
    expect(screen.getByText('MovieService')).toBeInTheDocument();
    expect(screen.getByText('movieCard')).toBeInTheDocument();
    expect(screen.queryByText('AccountService')).not.toBeInTheDocument();
  });

  it('shows "No matches" when query finds no nodes', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );

    const input = screen.getByTestId('command-palette-input');
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByTestId('command-palette-empty')).toHaveTextContent('No matches');
  });

  it('allows arrow key navigation and Enter to select', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );

    const input = screen.getByTestId('command-palette-input');

    // Default selectedIndex is 0 ('MovieController')
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // Selected becomes 1 ('MovieService')

    const items = screen.getAllByRole('option');
    expect(items[1]).toHaveClass('selected');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelectNode).toHaveBeenCalledWith('ApexClass:MovieService');
    expect(onClose).toHaveBeenCalled();
  });

  it('allows clicking an item to select it', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );

    const item = screen.getByTestId('command-palette-item-LWC:movieCard');
    fireEvent.click(item);

    expect(onSelectNode).toHaveBeenCalledWith('LWC:movieCard');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when clicking backdrop overlay', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={mockNodes}
        onSelectNode={onSelectNode}
      />
    );

    const overlay = screen.getByTestId('command-palette-overlay');
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalled();
  });

  it('performance: searches 500 nodes in under 200ms', () => {
    const largeNodesList: ExplorerNode[] = Array.from({ length: 500 }, (_, i) =>
      createMockNode({
        id: `ApexClass:Component_${i}`,
        displayName: `Component_${i}`,
        type: 'ApexClass',
        file: `classes/Component_${i}.cls`,
        risk: i % 2 === 0 ? 'HIGH' : 'LOW',
      })
    );

    largeNodesList[250].displayName = 'SpecialMovieComponent';

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        nodes={largeNodesList}
        onSelectNode={onSelectNode}
      />
    );

    const input = screen.getByTestId('command-palette-input');
    const startTime = performance.now();

    fireEvent.change(input, { target: { value: 'SpecialMovie' } });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(200);
    expect(screen.getByText('SpecialMovieComponent')).toBeInTheDocument();
  });
});
