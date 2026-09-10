import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthSummary } from './HealthSummary';
import { ArchitectureHealth } from '../lib/health';

describe('HealthSummary', () => {
  const sampleHealth: ArchitectureHealth = {
    score: 74,
    level: 'CAUTION',
    riskPercent: 20,
    cycleCount: 2,
    unresolvedCount: 3,
    hotspotCount: 5,
    mainConcerns: ['2 circular dependency groups', '5 architectural hotspot components']
  };

  it('renders health score, level, and main concerns', () => {
    render(<HealthSummary health={sampleHealth} />);

    expect(screen.getByText('74')).toBeInTheDocument();
    expect(screen.getByText('CAUTION')).toBeInTheDocument();
    expect(screen.getByText('• 2 circular dependency groups')).toBeInTheDocument();
    expect(screen.getByText('• 5 architectural hotspot components')).toBeInTheDocument();
  });
});
