import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';
import { FeatureProfilePanel } from './FeatureProfilePanel';
import { adaptComponentProfile } from '../lib/adapters/profile-adapter';
import * as positionPolicy from '../lib/position-policy';

describe('FeatureProfilePanel Component Tests', () => {
  const fixturePath = path.resolve(__dirname, '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json');
  const canonicalData: ExplorerDataSchema = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  it('1. renders normal Profile UI with summary metrics bar and component list', () => {
    render(<FeatureProfilePanel data={canonicalData} />);

    expect(screen.getByTestId('feature-profile-panel')).toBeInTheDocument();
    expect(screen.getByText('Component Architecture Profile')).toBeInTheDocument();
    expect(screen.getByTestId('profile-component-list')).toBeInTheDocument();
    expect(screen.getByTestId('profile-detail-pane')).toBeInTheDocument();

    const profileData = adaptComponentProfile(canonicalData);
    expect(screen.getByText(String(profileData.summary.totalComponents))).toBeInTheDocument();
    expect(screen.getByText(String(profileData.summary.highRiskCount))).toBeInTheDocument();
    expect(screen.getByText(String(profileData.summary.hotspotCount))).toBeInTheDocument();
  });

  it('2. renders actual adapter fields for representative active component profile', () => {
    render(<FeatureProfilePanel data={canonicalData} />);

    const profileData = adaptComponentProfile(canonicalData);
    expect(profileData.profiles.length).toBeGreaterThan(0);

    const activeProf = profileData.profiles[0];

    expect(screen.getAllByText(activeProf.displayName).length).toBeGreaterThan(0);
    expect(screen.getByText(`ID: ${activeProf.id}`)).toBeInTheDocument();
    expect(screen.getAllByText(activeProf.layer).length).toBeGreaterThan(0);
    expect(screen.getAllByText(activeProf.domain).length).toBeGreaterThan(0);
    expect(screen.getAllByText(activeProf.featureId).length).toBeGreaterThan(0);
    expect(screen.getAllByText(activeProf.featureRole).length).toBeGreaterThan(0);

    expect(screen.getAllByText(String(activeProf.fanIn)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(String(activeProf.fanOut)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(String(activeProf.coupling)).length).toBeGreaterThan(0);
  });

  it('3. handles empty and minimal graph inputs gracefully', () => {
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

    const { rerender } = render(<FeatureProfilePanel data={emptySchema} />);
    expect(screen.getByText('No Component Profile Data')).toBeInTheDocument();

    rerender(<FeatureProfilePanel data={null} />);
    expect(screen.getByText('No Component Profile Data')).toBeInTheDocument();
  });

  it('4. provides deterministic rendering across multiple renders', () => {
    const { container: container1 } = render(<FeatureProfilePanel data={canonicalData} />);
    const html1 = container1.innerHTML;

    const { container: container2 } = render(<FeatureProfilePanel data={canonicalData} />);
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

    expect(() => render(<FeatureProfilePanel data={frozenSchema} />)).not.toThrow();
  });

  it('6. invokes selection callbacks when selecting a component or clicking explore button', () => {
    const onSelectNode = vi.fn();

    render(<FeatureProfilePanel data={canonicalData} onSelectNode={onSelectNode} />);

    const profileData = adaptComponentProfile(canonicalData);
    expect(profileData.profiles.length).toBeGreaterThan(1);

    const secondProfile = profileData.profiles[1];
    const secondItem = screen.getByTestId(`profile-item-${secondProfile.id}`);

    fireEvent.click(secondItem);
    expect(onSelectNode).toHaveBeenCalledWith(secondProfile.id);

    const exploreBtn = screen.getByTestId('profile-explore-graph-btn');
    fireEvent.click(exploreBtn);
    expect(onSelectNode).toHaveBeenCalledWith(secondProfile.id);
  });

  it('7. supports search query filtering in component list', () => {
    render(<FeatureProfilePanel data={canonicalData} />);

    const profileData = adaptComponentProfile(canonicalData);
    const searchInput = screen.getByTestId('profile-search-input');

    const targetProf = profileData.profiles[5];
    fireEvent.change(searchInput, { target: { value: targetProf.displayName } });

    expect(screen.getByTestId(`profile-item-${targetProf.id}`)).toBeInTheDocument();
  });

  it('8. NEVER invokes position authority or graph coordinate layout APIs', () => {
    const resolveSpy = vi.spyOn(positionPolicy, 'resolveAuthoritativePosition');

    render(<FeatureProfilePanel data={canonicalData} />);

    expect(resolveSpy).not.toHaveBeenCalled();

    resolveSpy.mockRestore();
  });
});
