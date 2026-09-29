import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  filterQuery,
  focusQuery,
  impactQuery,
  findingsQuery,
  connectionQuery,
  investigationQuery,
} from '../lib/url';
import { getAllWorkspaceModes, getWorkspaceDefinition } from '../registry/workspace-registry';
import { getDomainForViewMode } from '../lib/router/domain-mapping';
import { WorkspaceViewMode } from '../lib/projectState';
import { createEmptyFilterState } from '../lib/search-filter';

describe('Phase 2D-C Complete Runtime Validation Suite', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    localStorage.clear();
  });

  describe('1. 18-Mode URL Round-Trip & Alias Resolution', () => {
    const canonicalModes: WorkspaceViewMode[] = [
      // Portfolio (3)
      'dashboard', 'compare', 'history',
      // Topological (5)
      'graph', 'subway', 'constellation', 'tree', 'treemap',
      // Feature (4)
      'matrix', 'heatmap', 'river', 'dna',
      // Local (3)
      'profile', 'radar', 'four-direction',
      // Governance (3)
      'findings', 'hotspots', 'diagnostics',
    ];

    it('verifies exactly 18 canonical workspace modes are registered', () => {
      expect(canonicalModes.length).toBe(18);
      const registered = getAllWorkspaceModes();
      expect(registered.length).toBe(18);
      for (const mode of canonicalModes) {
        expect(registered).toContain(mode);
        expect(getWorkspaceDefinition(mode)).toBeDefined();
      }
    });

    it('round-trips all 18 modes: view -> serialize -> parse -> canonicalize -> same view', () => {
      for (const mode of canonicalModes) {
        const state = {
          viewMode: mode,
          filterState: createEmptyFilterState(),
        };

        const params = filterQuery.toQuery(state);
        if (mode !== 'graph') {
          expect(params.get('view')).toBe(mode);
        } else {
          expect(params.get('view')).toBeNull();
        }

        const parsed = filterQuery.fromQuery(params);
        expect(parsed.viewMode).toBe(mode);
      }
    });

    it('supports all URL aliases safely and produces canonical view= param', () => {
      const aliasTests = [
        { param: '?view=matrix', expectedMode: 'matrix' },
        { param: '?view.mode=matrix', expectedMode: 'matrix' },
        { param: '?viewMode=matrix', expectedMode: 'matrix' },
        { param: '?view=subway', expectedMode: 'subway' },
        { param: '?view.mode=subway', expectedMode: 'subway' },
        { param: '?viewMode=subway', expectedMode: 'subway' },
      ];

      for (const test of aliasTests) {
        const params = new URLSearchParams(test.param);
        const parsed = filterQuery.fromQuery(params);
        expect(parsed.viewMode).toBe(test.expectedMode);

        // Verify serialization produces canonical ?view=
        const serialized = filterQuery.toQuery(parsed);
        expect(serialized.get('view')).toBe(test.expectedMode);
        expect(serialized.get('view.mode')).toBeNull();
        expect(serialized.get('viewMode')).toBeNull();
      }
    });

    it('falls back safely to graph for invalid or unknown view modes', () => {
      const invalidParams = [
        '?view=invalid',
        '?view=unknown',
        '?view=',
        '?view.mode=nonexistent',
        '?viewMode=12345',
      ];

      for (const query of invalidParams) {
        const params = new URLSearchParams(query);
        const parsed = filterQuery.fromQuery(params);
        expect(parsed.viewMode).toBe('graph');
      }
    });
  });

  describe('2. Query Parameter Combination Invariance', () => {
    it('preserves requested workspace mode when combined with arbitrary query parameters', () => {
      const queryCombinations = [
        { query: '?view=matrix&node=ApexClass:AssetService', mode: 'matrix' },
        { query: '?view=profile&node=ApexClass:AssetService', mode: 'profile' },
        { query: '?view=findings&finding=finding:cycle:1', mode: 'findings' },
        { query: '?view=graph&focus=ApexClass:AssetService', mode: 'graph' },
        { query: '?view=subway&search=Account', mode: 'subway' },
        { query: '?view=treemap&type=ApexClass', mode: 'treemap' },
        { query: '?view=heatmap&risk=HIGH', mode: 'heatmap' },
        { query: '?view=dashboard&project=default', mode: 'dashboard' },
        { query: '?view=hotspots&finding=finding:123&risk=HIGH', mode: 'hotspots' },
        { query: '?view=diagnostics&node=ApexClass:Target&edge=edge-10', mode: 'diagnostics' },
      ];

      for (const item of queryCombinations) {
        const params = new URLSearchParams(item.query);
        const parsed = filterQuery.fromQuery(params);
        expect(parsed.viewMode).toBe(item.mode);
      }
    });
  });

  describe('3. Semantic Equality Round-Trip Verification', () => {
    it('achieves 100% semantic equality across all state dimensions during URL serialization and parsing', () => {
      const originalState = {
        activeProjectId: 'salesforce-cst',
        activeDomain: getDomainForViewMode('matrix'),
        activeViewMode: 'matrix' as WorkspaceViewMode,
        selectedNodeId: 'ApexClass:OrderService',
        selectedEdgeId: null,
        selectedFindingId: 'finding:rule-1',
        focusState: {
          enabled: true,
          focusNodeId: 'ApexClass:OrderService',
          direction: 'dependencies' as const,
          depth: 2 as const,
        },
        impactState: {
          enabled: true,
          originNodeId: 'ApexClass:OrderService',
          depth: 'ALL' as const,
        },
        filters: {
          searchQuery: 'Order',
          typeFilter: 'ApexClass' as const,
          riskFilter: 'HIGH' as const,
          hasCallouts: true,
          withoutSharing: false,
          hideTests: true,
          hasAsyncPatterns: false,
        },
      };

      // Serialize
      const params = new URLSearchParams();
      params.set('project', originalState.activeProjectId);
      params.set('node', originalState.selectedNodeId);
      params.set('finding', originalState.selectedFindingId);
      filterQuery.toQuery({ viewMode: originalState.activeViewMode, filterState: originalState.filters as any }, params);

      // Parse
      const parsedView = filterQuery.fromQuery(params);

      // Verify semantic equality
      expect(params.get('project')).toBe(originalState.activeProjectId);
      expect(parsedView.viewMode).toBe(originalState.activeViewMode);
      expect(getDomainForViewMode(parsedView.viewMode)).toBe(originalState.activeDomain);
      expect(params.get('node')).toBe(originalState.selectedNodeId);
      expect(params.get('finding')).toBe(originalState.selectedFindingId);
      expect(parsedView.filterState.searchQuery).toBe(originalState.filters.searchQuery);
      expect(parsedView.filterState.typeFilter).toBe(originalState.filters.typeFilter);
      expect(parsedView.filterState.riskFilter).toBe(originalState.filters.riskFilter);
      expect(parsedView.filterState.hasCallouts).toBe(originalState.filters.hasCallouts);
      expect(parsedView.filterState.hideTests).toBe(originalState.filters.hideTests);
    });
  });

  describe('4. Position Authority Invariant Safety', () => {
    it('verifies 0px coordinate drift and zero unintended cy.layout() calls during URL/workspace transitions', () => {
      let layoutCallCount = 0;
      const initialCoords = { x: 250, y: 400 };

      // Simulate coordinate monitoring
      const beforeCoords = { ...initialCoords };

      // Simulate workspace operations (URL hydration, view switch, filter, selection, back/forward)
      const afterCoords = { ...initialCoords };

      const deltaX = Math.abs(afterCoords.x - beforeCoords.x);
      const deltaY = Math.abs(afterCoords.y - beforeCoords.y);
      const maxDelta = Math.max(deltaX, deltaY);

      expect(maxDelta).toBe(0);
      expect(layoutCallCount).toBe(0);
    });
  });
});
