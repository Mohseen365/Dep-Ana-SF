import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import { RadarPanel, getVisualNormalizedValue } from './RadarPanel';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import { adaptRadarDimensions } from '../lib/adapters/radar-adapter';
import * as positionPolicy from '../lib/position-policy';

function loadCanonicalFixture(): ExplorerDataSchema {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const raw = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(raw) as ExplorerDataSchema;
}

describe('RadarPanel Component Tests (`explorer/src/components/RadarPanel.test.tsx`)', () => {
  const canonicalData = loadCanonicalFixture();

  // Test 1: Normal Radar rendering
  it('1. renders normal Radar UI with health summary banner, SVG radar, and dimensions table', () => {
    render(<RadarPanel data={canonicalData} />);

    expect(screen.getByTestId('radar-panel')).toBeInTheDocument();
    expect(screen.getByTestId('radar-svg')).toBeInTheDocument();
    expect(screen.getByTestId('radar-dimensions-table')).toBeInTheDocument();

    const adapterResult = adaptRadarDimensions(canonicalData);
    expect(screen.getByText(new RegExp(`Health: ${adapterResult.summary.architectureHealthScore}/100`))).toBeInTheDocument();
  });

  // Test 2: All adapter dimensions are represented
  it('2. renders all actual adapter dimensions preserving raw values and unit semantics', () => {
    render(<RadarPanel data={canonicalData} />);

    const adapterResult = adaptRadarDimensions(canonicalData);
    expect(adapterResult.dimensions.length).toBe(9);

    adapterResult.dimensions.forEach(dim => {
      expect(screen.getAllByText(dim.label).length).toBeGreaterThan(0);
      expect(screen.getAllByText(String(dim.rawValue)).length).toBeGreaterThan(0);
      expect(screen.getAllByText(dim.unit).length).toBeGreaterThan(0);
    });
  });

  // Test 3: Presentation-only visual scaling function
  it('3. uses presentation-only visual normalization that is deterministic, bounded, and preserves raw values', () => {
    const adapterResult = adaptRadarDimensions(canonicalData);

    adapterResult.dimensions.forEach(dim => {
      const norm = getVisualNormalizedValue(dim, adapterResult.summary);
      expect(norm).toBeGreaterThanOrEqual(0);
      expect(norm).toBeLessThanOrEqual(1.0);
    });

    render(<RadarPanel data={canonicalData} />);
    // Raw source values are displayed in table
    adapterResult.dimensions.forEach(dim => {
      expect(screen.getAllByText(String(dim.rawValue)).length).toBeGreaterThan(0);
    });
  });

  // Test 4: Unsupported missing primitives display
  it('4. displays unsupported missing primitives callout without inventing synthetic metrics', () => {
    render(<RadarPanel data={canonicalData} />);

    expect(screen.getByText(/Missing Architectural Primitives/i)).toBeInTheDocument();
    expect(screen.getByText(/Layer Purity Score:/i)).toBeInTheDocument();
    expect(screen.getByText(/Dependency Health Index:/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Coverage Score:/i)).toBeInTheDocument();
  });

  // Test 5: Deterministic rendering across multiple calls
  it('5. provides deterministic rendering across multiple renders', () => {
    const { container: container1 } = render(<RadarPanel data={canonicalData} />);
    const html1 = container1.innerHTML;

    const { container: container2 } = render(<RadarPanel data={canonicalData} />);
    const html2 = container2.innerHTML;

    expect(html1).toBe(html2);
  });

  // Test 6: Empty/minimal input behavior
  it('6. handles empty and minimal graph inputs gracefully', () => {
    const emptySchema: ExplorerDataSchema = {
      summary: {
        nodeCount: 0,
        edgeCount: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        cycleCount: 0,
        unresolvedCount: 0,
        inventory: { files: 0, apexClasses: 0, apexTriggers: 0, lwcJs: 0, lwcHtml: 0, visualforce: 0, flows: 0, objects: 0, fields: 0 }
      },
      nodes: [],
      edges: [],
      cycles: [],
      unresolvedReferences: [],
      impactSummaries: {}
    };

    const { container } = render(<RadarPanel data={emptySchema} />);
    expect(container).toBeInTheDocument();

    const { container: nullContainer } = render(<RadarPanel data={null} />);
    expect(nullContainer).toBeInTheDocument();
  });

  // Test 7: Frozen/read-only input
  it('7. guarantees input graph schema immutability during rendering', () => {
    const frozenSchema: ExplorerDataSchema = Object.freeze({
      ...canonicalData,
      nodes: Object.freeze(canonicalData.nodes.map(n => Object.freeze({ ...n }))) as unknown as ExplorerNode[],
      edges: Object.freeze(canonicalData.edges.map(e => Object.freeze({ ...e }))) as unknown as ExplorerEdge[],
    });

    expect(() => render(<RadarPanel data={frozenSchema} />)).not.toThrow();
  });

  // Test 8: Position Authority safety
  it('8. NEVER invokes position authority or graph coordinate layout APIs', () => {
    const spyResolve = vi.spyOn(positionPolicy, 'resolveAuthoritativePosition');

    render(<RadarPanel data={canonicalData} />);

    expect(spyResolve).not.toHaveBeenCalled();
    spyResolve.mockRestore();
  });

  // Test 9: Hover / Interaction detail
  it('9. supports hovering/clicking radar axis or table row to inspect dimension details', () => {
    render(<RadarPanel data={canonicalData} />);

    const axisGroup = screen.getByTestId('radar-axis-architecture_health');
    fireEvent.mouseEnter(axisGroup);

    expect(screen.getByText('Dimension Inspector')).toBeInTheDocument();
    expect(screen.getAllByText('Architecture Health').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/calculateArchitectureHealth/).length).toBeGreaterThan(0);
  });
});
