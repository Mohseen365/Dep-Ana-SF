import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalysisHistoryPanel } from './AnalysisHistoryPanel';
import type { ProjectSnapshot } from '../types/explorer';

describe('AnalysisHistoryPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders project analysis history panel with default timeline items', () => {
    render(<AnalysisHistoryPanel projectId="core-crm" />);

    expect(screen.getByRole('heading', { level: 2, name: /Project Analysis History/i })).toBeInTheDocument();
    expect(screen.getByText(/core-crm/i)).toBeInTheDocument();

    // Verify timeline items rendered per specification display format:
    expect(screen.getByText('Sep 14')).toBeInTheDocument();
    expect(screen.getByText('428 components')).toBeInTheDocument();
    expect(screen.getByText('612 dependencies')).toBeInTheDocument();

    expect(screen.getByText('Sep 12')).toBeInTheDocument();
    expect(screen.getByText('421 components')).toBeInTheDocument();
    expect(screen.getByText('597 dependencies')).toBeInTheDocument();

    expect(screen.getByText('Sep 08')).toBeInTheDocument();
    expect(screen.getByText('403 components')).toBeInTheDocument();
    expect(screen.getByText('561 dependencies')).toBeInTheDocument();
  });

  it('renders active snapshot badge on active snapshot entry', () => {
    render(<AnalysisHistoryPanel projectId="core-crm" />);

    const activeBadge = screen.getByText('● Active Snapshot');
    expect(activeBadge).toBeInTheDocument();

    const makeActiveBtns = screen.getAllByRole('button', { name: /Make Active/i });
    expect(makeActiveBtns).toHaveLength(2);
  });

  it('renders change delta summaries between consecutive snapshots', () => {
    render(<AnalysisHistoryPanel projectId="core-crm" />);

    expect(screen.getByText('Change vs Sep 12:')).toBeInTheDocument();
    expect(screen.getByText('+7 components')).toBeInTheDocument();
    expect(screen.getByText('+15 dependencies')).toBeInTheDocument();

    expect(screen.getByText('Change vs Sep 08:')).toBeInTheDocument();
    expect(screen.getByText('+18 components')).toBeInTheDocument();
    expect(screen.getByText('+36 dependencies')).toBeInTheDocument();
  });

  it('allows user to switch active snapshot and invokes onSelectSnapshot', () => {
    const onSelectSnapshot = vi.fn();
    render(<AnalysisHistoryPanel projectId="core-crm" onSelectSnapshot={onSelectSnapshot} />);

    const makeActiveBtns = screen.getAllByRole('button', { name: /Make Active/i });
    fireEvent.click(makeActiveBtns[0]); // Click Make Active on Sep 12

    expect(onSelectSnapshot).toHaveBeenCalledTimes(1);
    const selectedSnap: ProjectSnapshot = onSelectSnapshot.mock.calls[0][0];
    expect(selectedSnap.dateDisplay).toBe('Sep 12');

    expect(screen.getByTestId('active-badge-snap-core-crm-sep12')).toBeInTheDocument();
  });

  it('triggers comparison callback when "Compare with Active" is clicked', () => {
    const onCompareSnapshots = vi.fn();
    render(<AnalysisHistoryPanel projectId="core-crm" onCompareSnapshots={onCompareSnapshots} />);

    const compareBtn = screen.getByTestId('compare-active-btn-snap-core-crm-sep12');
    fireEvent.click(compareBtn);

    expect(onCompareSnapshots).toHaveBeenCalledTimes(1);
    const [targetSnap, activeSnap] = onCompareSnapshots.mock.calls[0];
    expect(targetSnap.dateDisplay).toBe('Sep 12');
    expect(activeSnap.dateDisplay).toBe('Sep 14');
  });

  it('allows selecting pairwise snapshots and running pairwise comparison', () => {
    const onCompareSnapshots = vi.fn();
    render(<AnalysisHistoryPanel projectId="core-crm" onCompareSnapshots={onCompareSnapshots} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    // Select Sep 14 and Sep 08
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[2]);

    expect(screen.getByText(/Selected for comparison:/i)).toBeInTheDocument();

    const runPairwiseBtn = screen.getByTestId('run-pairwise-compare-btn');
    expect(runPairwiseBtn).not.toBeDisabled();

    fireEvent.click(runPairwiseBtn);

    expect(onCompareSnapshots).toHaveBeenCalledTimes(1);
    const [snapA, snapB] = onCompareSnapshots.mock.calls[0];
    expect(snapA.dateDisplay).toBe('Sep 14');
    expect(snapB.dateDisplay).toBe('Sep 08');
  });

  it('calls onClose callback when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AnalysisHistoryPanel projectId="core-crm" onClose={onClose} />);

    const closeBtn = screen.getByTestId('close-history-btn');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
