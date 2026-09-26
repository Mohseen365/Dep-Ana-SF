import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerDataSchema, ExplorerNode } from '../types/explorer';
import { FeatureMatrixPanel } from './FeatureMatrixPanel';
import { adaptFeatureMatrix } from '../lib/adapters/matrix-adapter';

describe('FeatureMatrixPanel Component Tests', () => {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const canonicalData: ExplorerDataSchema = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  it('1. renders normal Matrix UI with row and column headers', () => {
    render(<FeatureMatrixPanel data={canonicalData} />);

    expect(screen.getByTestId('feature-matrix-panel')).toBeInTheDocument();
    expect(screen.getByText('Feature Dependency Matrix')).toBeInTheDocument();
    expect(screen.getByTestId('feature-matrix-table')).toBeInTheDocument();

    const matrixData = adaptFeatureMatrix(canonicalData);
    expect(screen.getByText(String(matrixData.summary.totalFeatures))).toBeInTheDocument();
    expect(screen.getByText(String(matrixData.summary.totalDependencies))).toBeInTheDocument();
  });

  it('2. renders representative relationship cells and details on hover', () => {
    const { container } = render(<FeatureMatrixPanel data={canonicalData} />);

    const cells = container.querySelectorAll('tbody td');
    expect(cells.length).toBeGreaterThan(0);

    // Find a cell with relationship weight
    const activeCells = Array.from(cells).filter(c => c.textContent && c.textContent !== '\\' && c.textContent !== '·');
    expect(activeCells.length).toBeGreaterThan(0);

    // Hover over the first relationship cell
    fireEvent.mouseEnter(activeCells[0]);
    expect(screen.getByText('Dependency Details')).toBeInTheDocument();
    expect(screen.getByText('Source Feature:')).toBeInTheDocument();
    expect(screen.getByText('Target Feature:')).toBeInTheDocument();

    // Mouse leave
    fireEvent.mouseLeave(activeCells[0]);
    expect(screen.getByText('Hover over a matrix cell to inspect directional feature dependency weights.')).toBeInTheDocument();
  });

  it('3. handles empty and minimal graph inputs gracefully', () => {
    // Empty schema
    const emptySchema: ExplorerDataSchema = {
      summary: {
        nodeCount: 0,
        edgeCount: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        cycleCount: 0,
        unresolvedCount: 0,
        inventory: {
          files: 0,
          apexClasses: 0,
          apexTriggers: 0,
          lwcJs: 0,
          lwcHtml: 0,
          visualforce: 0,
          flows: 0,
          objects: 0,
          fields: 0,
        },
      },
      nodes: [],
      edges: [],
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {},
    };

    const { rerender } = render(<FeatureMatrixPanel data={emptySchema} />);
    expect(screen.getByText('No Feature Matrix Data')).toBeInTheDocument();

    // Null data
    rerender(<FeatureMatrixPanel data={null} />);
    expect(screen.getByText('No Feature Matrix Data')).toBeInTheDocument();
  });

  it('4. provides deterministic rendering across multiple renders', () => {
    const { container: container1 } = render(<FeatureMatrixPanel data={canonicalData} />);
    const html1 = container1.innerHTML;

    const { container: container2 } = render(<FeatureMatrixPanel data={canonicalData} />);
    const html2 = container2.innerHTML;

    expect(html1).toBe(html2);
  });

  it('5. guarantees input graph schema immutability during rendering', () => {
    const frozenNodes = canonicalData.nodes.map(n => Object.freeze({ ...n }));
    const frozenEdges = canonicalData.edges.map(e => Object.freeze({ ...e }));

    const frozenSchema: ExplorerDataSchema = Object.freeze({
      ...canonicalData,
      nodes: Object.freeze(frozenNodes) as unknown as ExplorerNode[],
      edges: Object.freeze(frozenEdges) as unknown as ExplorerEdge[],
    });

    expect(() => render(<FeatureMatrixPanel data={frozenSchema} />)).not.toThrow();
  });

  it('6. invokes selection callbacks when clicking row headers or cells', () => {
    const onSelectNode = vi.fn();
    const onSelectFeatureAnchor = vi.fn();

    const { container } = render(
      <FeatureMatrixPanel
        data={canonicalData}
        onSelectNode={onSelectNode}
        onSelectFeatureAnchor={onSelectFeatureAnchor}
      />
    );

    const rowHeaders = container.querySelectorAll('tbody th');
    expect(rowHeaders.length).toBeGreaterThan(0);

    fireEvent.click(rowHeaders[0]);
    expect(onSelectFeatureAnchor).toHaveBeenCalled();
  });
});
