import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ConnectionControls } from './ConnectionControls';
import { ImpactControls } from './ImpactControls';
import { GraphControls } from './GraphControls';
import { ImpactState, ImpactAnalysisResult } from '../lib/impact-analysis';
import { ExplorerNode } from '../types/explorer';

const sampleNode: ExplorerNode = {
  id: 'ApexClass:Service',
  displayName: 'Service',
  type: 'ApexClass',
  file: 'force-app/main/default/classes/Service.cls',
  metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 2 },
  risk: 'HIGH',
  riskReasons: ['High risk'],
  behavior: {
    isTest: false,
    sharing: 'with sharing',
    publicContractsCount: 1,
    asyncPatterns: [],
    securitySignalsCount: 0,
    queryCount: 1,
    dmlCount: 0,
    calloutCount: 0,
  },
  refactoringReadiness: {
    isHighRisk: true,
    hasCycles: false,
    hasUnresolved: false,
    testCoverageStatus: 'COVERED',
  },
};

const sampleImpactResult: ImpactAnalysisResult = {
  originNodeId: 'ApexClass:Service',
  originNode: sampleNode,
  affectedNodeIds: new Set(['ApexClass:Service', 'ApexClass:Controller', 'ApexClass:ServiceTest']),
  affectedEdgeIds: new Set(['edge1']),
  directDependentIds: ['ApexClass:Controller'],
  transitiveDependentIds: ['ApexClass:Controller'],
  impactedTestNodeIds: ['ApexClass:ServiceTest'],
  summaryMetrics: {
    directDependentsCount: 1,
    transitiveDependentsCount: 1,
    impactedComponentsCount: 2,
    impactedTestsCount: 1,
    cyclesInvolvedCount: 0,
    unresolvedCount: 0,
    visibleImpactedCount: 2,
  },
};

describe('Phase 1C Accessibility Requirements (1B5-07 & 1B5-09)', () => {
  describe('1B5-07: Form-Label Associations', () => {
    it('1. ConnectionControls connects Direction and Depth labels to select inputs', () => {
      render(
        <ConnectionControls
          connectionState={{ enabled: true, originNodeId: 'ApexClass:Service', direction: 'both', depth: 2 }}
          connectionResult={null}
          onConnectionChange={vi.fn()}
          onExitConnection={vi.fn()}
          selectedNode={sampleNode}
          onShowConnection={vi.fn()}
        />
      );

      const directionSelect = screen.getByLabelText(/^Direction:/i);
      expect(directionSelect.tagName).toBe('SELECT');
      expect(directionSelect.getAttribute('id')).toBeTruthy();

      const depthSelect = screen.getByLabelText(/^Depth:/i);
      expect(depthSelect.tagName).toBe('SELECT');
      expect(depthSelect.getAttribute('id')).toBeTruthy();
    });

    it('2. ImpactControls connects Depth label to select input and formats static Impact Direction appropriately', () => {
      const impactState: ImpactState = { enabled: true, originNodeId: 'ApexClass:Service', depth: 'ALL' };
      const { container } = render(
        <ImpactControls
          impactState={impactState}
          impactResult={sampleImpactResult}
          onImpactChange={vi.fn()}
          onExitImpact={vi.fn()}
          selectedNode={sampleNode}
          onShowImpact={vi.fn()}
        />
      );

      const depthSelect = screen.getByLabelText(/^Depth:/i);
      expect(depthSelect.tagName).toBe('SELECT');
      expect(depthSelect.getAttribute('id')).toBeTruthy();

      // Static Impact Direction display check
      const directionLabels = container.querySelectorAll('label');
      const impactDirLabel = Array.from(directionLabels).find(l => l.textContent?.includes('Impact Direction:'));
      expect(impactDirLabel).toBeUndefined(); // Must NOT be a dangling form label

      const groupRole = screen.getByRole('group', { name: /^Impact Direction:/i });
      expect(groupRole).toBeDefined();
    });

    it('3. Simultaneous component instances generate unique control IDs', () => {
      const { container } = render(
        <>
          <ConnectionControls
            connectionState={{ enabled: true, originNodeId: 'ApexClass:Service', direction: 'both', depth: 2 }}
            connectionResult={null}
            onConnectionChange={vi.fn()}
            onExitConnection={vi.fn()}
            selectedNode={sampleNode}
            onShowConnection={vi.fn()}
          />
          <ConnectionControls
            connectionState={{ enabled: true, originNodeId: 'ApexClass:Service', direction: 'both', depth: 2 }}
            connectionResult={null}
            onConnectionChange={vi.fn()}
            onExitConnection={vi.fn()}
            selectedNode={sampleNode}
            onShowConnection={vi.fn()}
          />
        </>
      );

      const selectElements = container.querySelectorAll('select');
      const ids = Array.from(selectElements).map(el => el.id);
      expect(ids.length).toBe(4);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(4);
    });
  });

  describe('1B5-09: Decorative Emoji Accessibility Treatment', () => {
    it('1. ConnectionControls hides visual icon glyphs with aria-hidden="true"', () => {
      render(
        <ConnectionControls
          connectionState={{ enabled: true, originNodeId: 'ApexClass:Service', direction: 'both', depth: 2 }}
          connectionResult={null}
          onConnectionChange={vi.fn()}
          onExitConnection={vi.fn()}
          selectedNode={sampleNode}
          onShowConnection={vi.fn()}
        />
      );

      const toggleBtn = screen.getByTestId('connection-toggle-btn');
      expect(toggleBtn.textContent).toContain('Exit Connections');

      const iconSpan = toggleBtn.querySelector('.connection-icon');
      expect(iconSpan).not.toBeNull();
      expect(iconSpan?.getAttribute('aria-hidden')).toBe('true');
    });

    it('2. ImpactControls hides visual icon glyphs with aria-hidden="true"', () => {
      const impactState: ImpactState = { enabled: true, originNodeId: 'ApexClass:Service', depth: 'ALL' };
      render(
        <ImpactControls
          impactState={impactState}
          impactResult={sampleImpactResult}
          onImpactChange={vi.fn()}
          onExitImpact={vi.fn()}
          selectedNode={sampleNode}
          onShowImpact={vi.fn()}
        />
      );

      const toggleBtn = screen.getByRole('button', { name: /Exit Impact/i });
      const impactIcon = toggleBtn.querySelector('.impact-icon');
      expect(impactIcon?.getAttribute('aria-hidden')).toBe('true');

      // Expand breakdown
      const breakdownHeader = screen.getByText(/Affected Dependents & Test Breakdown/i);
      fireEvent.click(breakdownHeader);

      const testPill = screen.getByText(/ServiceTest/i);
      const testIcon = testPill.querySelector('[aria-hidden="true"]');
      expect(testIcon).not.toBeNull();
      expect(testIcon?.textContent).toBe('🧪');
    });

    it('3. GraphControls hides all decorative button glyphs with aria-hidden="true"', () => {
      render(
        <GraphControls
          onZoomIn={vi.fn()}
          onZoomOut={vi.fn()}
          onFitView={vi.fn()}
          onCenterSelected={vi.fn()}
          onResetLayout={vi.fn()}
          hasSelectedNode={true}
          selectedNodeId="ApexClass:Service"
          isFullscreen={false}
          onToggleFullscreen={vi.fn()}
          isNavigatorVisible={true}
          onToggleNavigator={vi.fn()}
          layoutMode="interactive"
          onToggleLayoutMode={vi.fn()}
          architectureMode="hierarchical"
          onToggleArchitectureMode={vi.fn()}
        />
      );

      const zoomInBtn = screen.getByRole('button', { name: 'Zoom In' });
      expect(zoomInBtn.querySelector('[aria-hidden="true"]')?.textContent).toBe('➕');

      const zoomOutBtn = screen.getByRole('button', { name: 'Zoom Out' });
      expect(zoomOutBtn.querySelector('[aria-hidden="true"]')?.textContent).toBe('➖');

      const fitViewBtn = screen.getByRole('button', { name: 'Fit View' });
      expect(fitViewBtn.querySelector('[aria-hidden="true"]')?.textContent).toBe('⛶');

      const centerBtn = screen.getByRole('button', { name: 'Center Selected' });
      expect(centerBtn.querySelector('[aria-hidden="true"]')?.textContent).toBe('🎯');

      const archBtn = screen.getByTestId('architecture-mode-toggle');
      expect(archBtn.querySelector('[aria-hidden="true"]')?.textContent).toBe('🏢');

      const layoutBtn = screen.getByTestId('layout-mode-toggle');
      expect(layoutBtn.querySelector('[aria-hidden="true"]')?.textContent).toBe('🔀');

      const resetBtn = screen.getByRole('button', { name: 'Reset Layout' });
      expect(resetBtn.querySelector('[aria-hidden="true"]')?.textContent).toBe('🔄');

      const navBtn = screen.getByRole('button', { name: 'Hide Navigator Overlay' });
      expect(navBtn.querySelector('[aria-hidden="true"]')?.textContent).toBe('🗺️');

      const fullBtn = screen.getByRole('button', { name: 'Maximize Graph' });
      expect(fullBtn.querySelector('[aria-hidden="true"]')?.textContent).toBe('⛶');
    });
  });
});
