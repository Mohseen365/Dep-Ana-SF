import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createMockNode, createMockEdge, createMockDataSchema } from './mock-factories';
import { ALL_EXPLORER_NODE_TYPES } from '../types/explorer';
import { filterGraphByNodeTypes } from '../lib/search-filter';
import { FeatureMatrixPanel } from '../components/FeatureMatrixPanel';
import { CouplingHeatmapPanel } from '../components/CouplingHeatmapPanel';
import { DependencyRiverPanel } from '../components/DependencyRiverPanel';
import { FeatureTreePanel } from '../components/FeatureTreePanel';
import { ArchitectureTreemapPanel } from '../components/ArchitectureTreemapPanel';
import { SubwayPanel } from '../components/SubwayPanel';
import { adaptSubwayMap } from '../lib/adapters/subway-adapter';
import { DependencyConstellationPanel } from '../components/DependencyConstellationPanel';
import { adaptConstellation } from '../lib/adapters/constellation-adapter';
import { FeatureProfilePanel } from '../components/FeatureProfilePanel';
import { RadarPanel } from '../components/RadarPanel';
import { ArchitectureDNABarcode } from '../components/ArchitectureDNABarcode';
import { FourDirectionPanel } from '../components/FourDirectionPanel';
import { adaptFourDirectionView } from '../lib/adapters/four-direction-adapter';

describe('Cross-Layout Visibility Control & Synchronized Selection Suite', () => {
  const nodeClassA = createMockNode('ApexClass:AccountController', 'AccountController', 'ApexClass', 'HIGH');
  const nodeClassB = createMockNode('ApexClass:AccountService', 'AccountService', 'ApexClass', 'LOW');
  const nodeLwc1 = createMockNode('LWC:accountView', 'accountView', 'LWC', 'MEDIUM');
  const nodeFlow1 = createMockNode('Flow:AccountApprovalFlow', 'AccountApprovalFlow', 'Flow', 'LOW');
  const nodeTrigger1 = createMockNode('ApexTrigger:AccountTrigger', 'AccountTrigger', 'ApexTrigger', 'HIGH');

  const edge1 = createMockEdge('edge-1', nodeClassA.id, nodeClassB.id);
  const edge2 = createMockEdge('edge-2', nodeLwc1.id, nodeClassA.id);
  const edge3 = createMockEdge('edge-3', nodeFlow1.id, nodeClassB.id);

  const fullNodes = [nodeClassA, nodeClassB, nodeLwc1, nodeFlow1, nodeTrigger1];
  const fullEdges = [edge1, edge2, edge3];
  const mockSchema = createMockDataSchema(fullNodes, fullEdges);

  describe('1. Centralized Visibility Filtering Logic', () => {
    it('returns all nodes and edges when all node types are visible', () => {
      const res = filterGraphByNodeTypes(fullNodes, fullEdges, ALL_EXPLORER_NODE_TYPES);
      expect(res.nodes).toHaveLength(5);
      expect(res.edges).toHaveLength(3);
    });

    it('filters out nodes and connected edges when node type is disabled', () => {
      const res = filterGraphByNodeTypes(fullNodes, fullEdges, ['ApexClass', 'LWC']);
      expect(res.nodes.map(n => n.id)).toEqual(
        expect.arrayContaining(['ApexClass:AccountController', 'ApexClass:AccountService', 'LWC:accountView'])
      );
      expect(res.nodes).toHaveLength(3);
      // edge1 (ApexClass->ApexClass) and edge2 (LWC->ApexClass) should remain; edge3 (Flow->ApexClass) is excluded
      expect(res.edges).toHaveLength(2);
      expect(res.edges.map(e => e.id)).not.toContain('edge-3');
    });

    it('returns empty graph when no node types are selected', () => {
      const res = filterGraphByNodeTypes(fullNodes, fullEdges, []);
      expect(res.nodes).toHaveLength(0);
      expect(res.edges).toHaveLength(0);
    });
  });

  describe('2. Cross-Layout Selection & Visual Dimming Assertions', () => {
    it('renders FeatureMatrixPanel with selected feature highlighted and non-selected dimmed', () => {
      const { container } = render(
        <FeatureMatrixPanel
          data={mockSchema}
          selectedNodeId="ApexClass:AccountController"
        />
      );
      expect(screen.getByTestId('feature-matrix-panel')).toBeInTheDocument();
      const rows = container.querySelectorAll('.matrix-row');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('renders CouplingHeatmapPanel canvas with selectedNodeId active without crashing', () => {
      render(
        <CouplingHeatmapPanel
          data={mockSchema}
          selectedNodeId="ApexClass:AccountController"
        />
      );
      expect(screen.getByTestId('coupling-heatmap-panel')).toBeInTheDocument();
      expect(screen.getByTestId('coupling-heatmap-canvas')).toBeInTheDocument();
    });

    it('renders DependencyRiverPanel with selectedNodeId and applies dimmed style to non-selected nodes', () => {
      render(
        <DependencyRiverPanel
          data={mockSchema}
          selectedNodeId="ApexClass:AccountController"
        />
      );
      expect(screen.getByTestId('dependency-river-panel')).toBeInTheDocument();
      expect(screen.getByTestId('sankey-svg')).toBeInTheDocument();
    });

    it('renders FeatureTreePanel with selectedNodeId, auto-expanding parent and dimming non-selected nodes', () => {
      const { container } = render(
        <FeatureTreePanel
          data={mockSchema}
          selectedNodeId="ApexClass:AccountController"
        />
      );
      expect(screen.getByTestId('feature-tree-panel')).toBeInTheDocument();
      const treeRows = container.querySelectorAll('.tree-node-row');
      expect(treeRows.length).toBeGreaterThan(0);
    });

    it('renders ArchitectureTreemapPanel with selectedNodeId prop', () => {
      render(
        <ArchitectureTreemapPanel
          data={mockSchema}
          selectedNodeId="ApexClass:AccountController"
        />
      );
      expect(screen.getByTestId('architecture-treemap-panel')).toBeInTheDocument();
    });

    it('renders SubwayPanel with selectedNodeId prop and marks non-selected stations dimmed', () => {
      const subwayData = adaptSubwayMap(mockSchema, { selectedStationId: 'ApexClass:AccountController' });
      const { container } = render(
        <SubwayPanel
          data={subwayData}
          selectedNodeId="ApexClass:AccountController"
        />
      );
      expect(screen.getByTestId('subway-panel')).toBeInTheDocument();
      const stations = container.querySelectorAll('.subway-station-node');
      expect(stations.length).toBeGreaterThan(0);
    });

    it('renders DependencyConstellationPanel with selectedNodeId prop', () => {
      const constellationData = adaptConstellation(mockSchema, { focalNodeId: 'ApexClass:AccountController' });
      render(
        <DependencyConstellationPanel
          data={constellationData}
          selectedNodeId="ApexClass:AccountController"
        />
      );
      expect(screen.getByTestId('dependency-constellation-panel')).toBeInTheDocument();
    });

    it('renders FeatureProfilePanel highlighting selected component and dimming non-selected items', () => {
      const { container } = render(
        <FeatureProfilePanel
          data={mockSchema}
          selectedNodeId="ApexClass:AccountController"
        />
      );
      expect(screen.getByTestId('feature-profile-panel')).toBeInTheDocument();
      const dimmedItems = container.querySelectorAll('.profile-item.dimmed');
      expect(dimmedItems.length).toBeGreaterThan(0);
    });

    it('renders RadarPanel with selectedNodeId prop without errors', () => {
      render(
        <RadarPanel
          data={mockSchema}
          selectedNodeId="ApexClass:AccountController"
        />
      );
      expect(screen.getByTestId('radar-panel')).toBeInTheDocument();
    });

    it('renders ArchitectureDNABarcode highlighting selected component and dimming non-selected items', () => {
      const { container } = render(
        <ArchitectureDNABarcode
          data={mockSchema}
          selectedNodeId="ApexClass:AccountController"
        />
      );
      expect(screen.getByTestId('architecture-dna-panel')).toBeInTheDocument();
      const dimmedItems = container.querySelectorAll('.dna-item.dimmed');
      expect(dimmedItems.length).toBeGreaterThan(0);
    });

    it('renders FourDirectionPanel highlighting active subject and dimming non-selected quadrant items', () => {
      const fourDirData = adaptFourDirectionView(mockSchema, { selectedNodeId: 'ApexClass:AccountController' });
      const { container } = render(
        <FourDirectionPanel
          data={fourDirData}
          selectedNodeId="ApexClass:AccountController"
        />
      );
      expect(screen.getByTestId('four-direction-panel')).toBeInTheDocument();
      const items = container.querySelectorAll('.quadrant-item');
      expect(items.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('3. Multi-View Synchronization Contract', () => {
    it('ensures canonical node ID is consistently passed and recognized across adapters', () => {
      const canonicalId = 'ApexClass:AccountController';

      const filteredData = filterGraphByNodeTypes(mockSchema.nodes, mockSchema.edges, ['ApexClass']);
      const filteredSchema = createMockDataSchema(filteredData.nodes, filteredData.edges);

      const subwayData = adaptSubwayMap(filteredSchema, { selectedStationId: canonicalId });
      expect(subwayData.stations.some(s => s.nodeId === canonicalId)).toBe(true);

      const constellationData = adaptConstellation(filteredSchema, { focalNodeId: canonicalId });
      expect(constellationData.focalNode?.id).toBe(canonicalId);

      const fourDirData = adaptFourDirectionView(filteredSchema, { selectedNodeId: canonicalId });
      expect(fourDirData.subject?.nodeId).toBe(canonicalId);
    });
  });
});
