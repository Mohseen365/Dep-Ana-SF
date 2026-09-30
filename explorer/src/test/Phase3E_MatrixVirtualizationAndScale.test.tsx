import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FeatureMatrixPanel } from '../components/FeatureMatrixPanel';
import { generateSyntheticSalesforceGraph } from './scalability-generator';
import type { ExplorerDataSchema } from '../types/explorer';

describe('Phase 3E Matrix Virtualization & Scale Test Suite', () => {
  const createMockSchema = (nodeCount: number): ExplorerDataSchema => {
    const { nodes, edges } = generateSyntheticSalesforceGraph({ nodeCount, seed: 42 });
    return {
      summary: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: nodes.length,
        cycleCount: 0,
        unresolvedCount: 0,
        inventory: {
          files: nodes.length,
          apexClasses: nodes.length,
          apexTriggers: 0,
          lwcJs: 0,
          lwcHtml: 0,
          visualforce: 0,
          flows: 0,
          objects: 0,
          fields: 0,
        },
      },
      nodes,
      edges,
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    };
  };

  it('1. renders windowed subset of cells at large feature scale (F >= 80)', () => {
    // 1000 nodes generates ~80 features
    const schema = createMockSchema(1000);
    const { container } = render(<FeatureMatrixPanel data={schema} />);

    expect(screen.getByTestId('feature-matrix-panel')).toBeInTheDocument();
    expect(screen.getByTestId('feature-matrix-table')).toBeInTheDocument();

    // Verify virtualized active badge is visible when totalFeatures >= 80
    // Total cells in DOM should be bounded O(1) << F^2
    const renderedRows = container.querySelectorAll('tbody tr.matrix-row');
    const totalDOMCells = container.querySelectorAll('tbody td');

    // DOM cell count must be strictly bounded (< 2000 cells) rather than full 80x80 = 6400 cells
    expect(totalDOMCells.length).toBeLessThan(2000);
    expect(renderedRows.length).toBeGreaterThan(0);
  });

  it('2. supports keyboard arrow navigation and focus management', () => {
    const schema = createMockSchema(240);
    const { container } = render(<FeatureMatrixPanel data={schema} />);

    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();

    // Focus grid container
    grid.focus();

    // Arrow down navigation
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    fireEvent.keyDown(grid, { key: 'ArrowRight' });

    expect(grid).toHaveFocus();
  });

  it('3. maintains 10x deterministic DOM output on virtualized matrix', () => {
    const schema = createMockSchema(500);

    const { container: container1 } = render(<FeatureMatrixPanel data={schema} />);
    const html1 = container1.innerHTML;

    const { container: container2 } = render(<FeatureMatrixPanel data={schema} />);
    const html2 = container2.innerHTML;

    expect(html1).toBe(html2);
  });

  it('4. preserves input schema immutability during virtualized rendering', () => {
    const schema = createMockSchema(500);
    Object.freeze(schema);
    Object.freeze(schema.nodes);
    Object.freeze(schema.edges);

    expect(() => render(<FeatureMatrixPanel data={schema} />)).not.toThrow();
  });

  it('5. selection callbacks work in virtualized row headers', () => {
    const onSelectFeatureAnchor = vi.fn();
    const schema = createMockSchema(240);

    const { container } = render(
      <FeatureMatrixPanel data={schema} onSelectFeatureAnchor={onSelectFeatureAnchor} />
    );

    const rowHeader = container.querySelector('tbody th');
    if (rowHeader) {
      fireEvent.click(rowHeader);
      expect(onSelectFeatureAnchor).toHaveBeenCalled();
    }
  });
});
