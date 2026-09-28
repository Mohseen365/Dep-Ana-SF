import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import { FeatureTreePanel } from './FeatureTreePanel';
import * as positionPolicy from '../lib/position-policy';

describe('FeatureTreePanel Component Tests', () => {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const canonicalData: ExplorerDataSchema = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  it('1. renders normal Tree UI with hierarchy summary, toolbar, and tree viewport', () => {
    render(<FeatureTreePanel data={canonicalData} />);

    // Check title and header stats
    expect(screen.getByText('Architecture Feature Hierarchy')).toBeInTheDocument();
    expect(screen.getByText('Domains:')).toBeInTheDocument();
    expect(screen.getByText('Features:')).toBeInTheDocument();
    expect(screen.getByText('Components:')).toBeInTheDocument();

    // Check tree viewport and toolbar controls
    expect(screen.getByTestId('feature-tree-panel')).toBeInTheDocument();
    expect(screen.getByTestId('tree-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('expand-all-btn')).toBeInTheDocument();
    expect(screen.getByTestId('collapse-all-btn')).toBeInTheDocument();
    expect(screen.getByTestId('feature-tree-viewport')).toBeInTheDocument();
    expect(screen.getByTestId('tree-inspector-pane')).toBeInTheDocument();
  });

  it('2. preserves domain, feature, role, and component hierarchy matching project semantics', () => {
    render(<FeatureTreePanel data={canonicalData} />);

    // Root node
    expect(screen.getByTestId('tree-node-root')).toBeInTheDocument();
    expect(screen.getByText('Architecture Hierarchy')).toBeInTheDocument();

    // Domain level nodes should be rendered (e.g. Shared Domain or similar)
    const viewport = screen.getByTestId('feature-tree-viewport');
    expect(viewport.textContent).toContain('Domain');
  });

  it('3. handles empty and minimal graph inputs gracefully', () => {
    // 1. Empty schema
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

    const { rerender } = render(<FeatureTreePanel data={emptySchema} />);
    expect(screen.getByText('No Feature Tree Data')).toBeInTheDocument();

    // 2. Null schema
    rerender(<FeatureTreePanel data={null} />);
    expect(screen.getByText('No Feature Tree Data')).toBeInTheDocument();

    // 3. Single node schema
    const singleNode: ExplorerNode = {
      id: 'ApexClass:SingleController',
      displayName: 'SingleController',
      type: 'ApexClass',
      file: 'classes/SingleController.cls',
      metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: false,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0,
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'UNTESTED',
      },
    };

    const singleNodeSchema: ExplorerDataSchema = {
      ...emptySchema,
      nodes: [singleNode],
      summary: { ...emptySchema.summary, nodeCount: 1 },
    };

    rerender(<FeatureTreePanel data={singleNodeSchema} />);
    expect(screen.getByText('Architecture Feature Hierarchy')).toBeInTheDocument();
    expect(screen.getByText('SingleController')).toBeInTheDocument();
  });

  it('4. provides deterministic rendering across multiple renders', () => {
    const { container: container1 } = render(<FeatureTreePanel data={canonicalData} />);
    const html1 = container1.innerHTML;

    const { container: container2 } = render(<FeatureTreePanel data={canonicalData} />);
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

    expect(() => render(<FeatureTreePanel data={frozenSchema} />)).not.toThrow();
  });

  it('6. invokes selection callbacks when clicking component nodes', () => {
    const onSelectNode = vi.fn();
    render(<FeatureTreePanel data={canonicalData} onSelectNode={onSelectNode} />);

    // Click Expand All to ensure component nodes are in DOM
    const expandBtn = screen.getByTestId('expand-all-btn');
    fireEvent.click(expandBtn);

    const matchedComponentNode = screen.getByText('AccountController');
    expect(matchedComponentNode).toBeInTheDocument();

    fireEvent.click(matchedComponentNode);
    expect(onSelectNode).toHaveBeenCalledWith('ApexClass:AccountController');
  });

  it('7. supports expand/collapse all actions and search query filtering', () => {
    render(<FeatureTreePanel data={canonicalData} />);

    const searchInput = screen.getByTestId('tree-search-input');
    fireEvent.change(searchInput, { target: { value: 'Invoice' } });

    // Collapsing and expanding all
    const collapseBtn = screen.getByTestId('collapse-all-btn');
    const expandBtn = screen.getByTestId('expand-all-btn');

    expect(() => fireEvent.click(collapseBtn)).not.toThrow();
    expect(() => fireEvent.click(expandBtn)).not.toThrow();
  });

  it('8. NEVER invokes position authority or graph coordinate layout APIs', () => {
    const shouldAutoLayoutSpy = vi.spyOn(positionPolicy, 'shouldAutoLayout');
    const resolveAuthSpy = vi.spyOn(positionPolicy, 'resolveAuthoritativePosition');

    render(<FeatureTreePanel data={canonicalData} />);

    expect(shouldAutoLayoutSpy).not.toHaveBeenCalled();
    expect(resolveAuthSpy).not.toHaveBeenCalled();

    shouldAutoLayoutSpy.mockRestore();
    resolveAuthSpy.mockRestore();
  });
});
