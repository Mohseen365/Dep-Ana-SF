import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SummaryBar } from './SummaryBar';
import { ExplorerSummary } from '../types/explorer';

const mockSummary: ExplorerSummary = {
  nodeCount: 10,
  edgeCount: 15,
  highRiskCount: 3,
  mediumRiskCount: 2,
  lowRiskCount: 5,
  cycleCount: 1,
  unresolvedCount: 2,
  inventory: {
    files: 10,
    apexClasses: 8,
    apexTriggers: 2,
    lwcJs: 0,
    lwcHtml: 0,
    visualforce: 0,
    flows: 0,
    objects: 0,
    fields: 0
  }
};

describe('SummaryBar', () => {
  it('renders all summary values correctly', () => {
    render(<SummaryBar summary={mockSummary} />);

    expect(screen.getByText('Nodes').nextElementSibling?.textContent).toBe('10');
    expect(screen.getByText('Edges').nextElementSibling?.textContent).toBe('15');
    expect(screen.getByText('High Risk').nextElementSibling?.textContent).toBe('3');
    expect(screen.getByText('Medium Risk').nextElementSibling?.textContent).toBe('2');
    expect(screen.getByText('Low Risk').nextElementSibling?.textContent).toBe('5');
    expect(screen.getByText('Cycles').nextElementSibling?.textContent).toBe('1');
    expect(screen.getByText('Unresolved').nextElementSibling?.textContent).toBe('2');
  });

  it('triggers onRiskFilterChange when risk items are clicked', () => {
    const onRiskFilterChange = vi.fn();
    render(<SummaryBar summary={mockSummary} onRiskFilterChange={onRiskFilterChange} />);

    fireEvent.click(screen.getByText('High Risk').parentElement!);
    expect(onRiskFilterChange).toHaveBeenCalledWith('HIGH');

    fireEvent.click(screen.getByText('Medium Risk').parentElement!);
    expect(onRiskFilterChange).toHaveBeenCalledWith('MEDIUM');

    fireEvent.click(screen.getByText('Low Risk').parentElement!);
    expect(onRiskFilterChange).toHaveBeenCalledWith('LOW');
  });

  it('triggers onCyclesClick and onUnresolvedClick when clicked', () => {
    const onCyclesClick = vi.fn();
    const onUnresolvedClick = vi.fn();
    render(
      <SummaryBar
        summary={mockSummary}
        onCyclesClick={onCyclesClick}
        onUnresolvedClick={onUnresolvedClick}
      />
    );

    fireEvent.click(screen.getByText('Cycles').parentElement!);
    expect(onCyclesClick).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Unresolved').parentElement!);
    expect(onUnresolvedClick).toHaveBeenCalled();
  });
});
