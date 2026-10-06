import { describe, test, expect, beforeEach } from 'vitest';
import cytoscape from 'cytoscape';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { adaptComponentOrbit } from '../lib/adapters/component-orbit-adapter';
import { computeComponentOrbitLayout } from '../lib/layout/component-orbit-layout';
import { runLayoutWithMetadata } from '../lib/graph-layout';
import { buildGraphElements } from '../lib/graph-builder';
import { getGraphStyles } from '../lib/graph-style';
import type { ExplorerDataSchema, ExplorerNode, ExplorerEdge } from '../types/explorer';

describe('Component Orbit Focused Projection Visibility Suite', () => {
  // --------------------------------------------------------------------------
  // SYNTHETIC TESTS (Tests 1 - 6)
  // --------------------------------------------------------------------------

  describe('Synthetic Visibility & Filtering Tests', () => {
    let cy: cytoscape.Core;

    const syntheticNodes: ExplorerNode[] = [
      {
        id: 'LWC:parent-comp',
        displayName: 'ParentComp',
        type: 'LWC',
        file: 'parentComp.js',
        metrics: { fanIn: 0, fanOut: 2, coupling: 2, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      },
      {
        id: 'LWC:child-comp',
        displayName: 'ChildComp',
        type: 'LWC',
        file: 'childComp.js',
        metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      },
      {
        id: 'ApexClass:UnrelatedService',
        displayName: 'UnrelatedService',
        type: 'ApexClass',
        file: 'UnrelatedService.cls',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      },
    ];

    const syntheticEdges: ExplorerEdge[] = [
      {
        id: 'edge-1',
        source: 'LWC:parent-comp',
        target: 'LWC:child-comp',
        relationshipType: 'lwc-template-child',
        method: null,
        evidence: '',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: '1.0',
        line: null,
        column: null,
        methodOwner: null,
        file: '',
        canonical: { source: { type: 'LWC', name: 'LWC:parent-comp' }, target: { type: 'LWC', name: 'LWC:child-comp' }, relationship: { type: 'lwc-template-child', resolution: 'EXACT' }, location: {} },
      },
      {
        id: 'edge-2',
        source: 'LWC:child-comp',
        target: 'ApexClass:UnrelatedService',
        relationshipType: 'lwc-apex',
        method: null,
        evidence: '',
        unresolved: false,
        resolutionClassification: 'RESOLVED_LOCAL',
        resolutionStrategy: 'EXACT',
        confidence: '1.0',
        line: null,
        column: null,
        methodOwner: null,
        file: '',
        canonical: { source: { type: 'LWC', name: 'LWC:child-comp' }, target: { type: 'ApexClass', name: 'ApexClass:UnrelatedService' }, relationship: { type: 'lwc-apex', resolution: 'EXACT' }, location: {} },
      },
    ];

    beforeEach(() => {
      const elements = buildGraphElements(syntheticNodes, syntheticEdges);
      cy = cytoscape({
        elements,
        style: getGraphStyles(),
        styleEnabled: true,
        headless: true,
      });
    });

    test('Test 1 — Focused projection node visibility', () => {
      expect(cy.nodes().length).toBe(3);

      // Run Component Orbit focused on LWC:parent-comp with maxDepth: 1
      runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:parent-comp',
        nodes: syntheticNodes,
        edges: syntheticEdges,
        componentOrbitOptions: {
          focalLwcId: 'LWC:parent-comp',
          maxDepth: 1,
        },
      });

      const visibleNodes = cy.nodes().filter((n) => n.visible());
      const hiddenNodes = cy.nodes().filter((n) => !n.visible());

      expect(cy.nodes().length).toBe(3); // Complete graph preserved
      expect(visibleNodes.length).toBe(2); // Parent and Child
      expect(hiddenNodes.length).toBe(1); // UnrelatedService hidden

      expect(visibleNodes.map((n) => n.id()).sort()).toEqual([
        'LWC:child-comp',
        'LWC:parent-comp',
      ]);
      expect(hiddenNodes.map((n) => n.id())).toEqual(['ApexClass:UnrelatedService']);
    });

    test('Test 2 — Edge filtering', () => {
      // Create a scenario where parent-comp -> child-comp is internal, and child-comp -> UnrelatedService is cross-projection
      runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:parent-comp',
        nodes: syntheticNodes,
        edges: syntheticEdges,
        componentOrbitOptions: {
          focalLwcId: 'LWC:parent-comp',
          maxDepth: 1,
        },
      });

      const visibleEdges = cy.edges().filter((e) => e.visible());
      const hiddenEdges = cy.edges().filter((e) => !e.visible());

      expect(visibleEdges.length).toBe(1);
      expect(visibleEdges[0].id()).toBe('edge-1'); // internal LWC:parent-comp -> LWC:child-comp
      expect(hiddenEdges.length).toBe(1);
      expect(hiddenEdges[0].id()).toBe('edge-2'); // cross-projection edge to hidden node
    });

    test('Test 3 — Focus transition (Projection A -> Projection B)', () => {
      // Focus A: parent-comp (maxDepth: 1 -> parent-comp + child-comp)
      runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:parent-comp',
        nodes: syntheticNodes,
        edges: syntheticEdges,
        componentOrbitOptions: { focalLwcId: 'LWC:parent-comp', maxDepth: 1 },
      });

      expect(cy.nodes().filter((n) => n.visible()).length).toBe(2);

      // Focus B: child-comp (child-comp -> UnrelatedService)
      runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:child-comp',
        nodes: syntheticNodes,
        edges: syntheticEdges,
      });

      const visibleNodesB = cy.nodes().filter((n) => n.visible());
      const hiddenNodesB = cy.nodes().filter((n) => !n.visible());

      expect(visibleNodesB.length).toBe(2); // child-comp + UnrelatedService
      expect(hiddenNodesB.length).toBe(1); // parent-comp hidden
      expect(cy.getElementById('LWC:parent-comp').visible()).toBe(false); // Old Focus A node is hidden
      expect(cy.nodes().length).toBe(3); // Total graph count remains 3
    });

    test('Test 4 — Isolated component (error-panel scenario)', () => {
      // UnrelatedService has no dependencies, so focal projection has 1 node
      runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: 'ApexClass:UnrelatedService',
        nodes: syntheticNodes,
        edges: syntheticEdges,
      });

      // Note: adaptComponentOrbit accepts any valid node ID, or falls back if non-LWC.
      // If we pass an isolated LWC or focal ID:
      const isolatedNodes: ExplorerNode[] = [
        ...syntheticNodes,
        {
          id: 'LWC:error-panel',
          displayName: 'error-panel',
          type: 'LWC',
          file: 'errorPanel.js',
          metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
        },
      ];

      const cyIsolated = cytoscape({
        elements: buildGraphElements(isolatedNodes, syntheticEdges),
        style: getGraphStyles(),
        styleEnabled: true,
        headless: true,
      });

      runLayoutWithMetadata(cyIsolated, {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:error-panel',
        nodes: isolatedNodes,
        edges: syntheticEdges,
      });

      const visible = cyIsolated.nodes().filter((n) => n.visible());
      const hidden = cyIsolated.nodes().filter((n) => !n.visible());

      expect(visible.length).toBe(1);
      expect(visible[0].id()).toBe('LWC:error-panel');
      expect(hidden.length).toBe(3);
      expect(cyIsolated.edges().filter((e) => e.visible()).length).toBe(0);
      expect(cyIsolated.nodes().length).toBe(4); // Authoritative graph preserved
    });

    test('Test 5 — Exit Component Orbit (Orbit -> Hierarchical/Hybrid)', () => {
      // First go to Orbit
      runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:parent-comp',
        nodes: syntheticNodes,
        edges: syntheticEdges,
        componentOrbitOptions: { focalLwcId: 'LWC:parent-comp', maxDepth: 1 },
      });

      expect(cy.nodes().filter((n) => n.visible()).length).toBe(2);

      // Exit Orbit -> Hierarchical
      runLayoutWithMetadata(cy, {
        architectureMode: 'hierarchical',
        nodes: syntheticNodes,
        edges: syntheticEdges,
      });

      expect(cy.nodes().filter((n) => n.visible()).length).toBe(3);
      expect(cy.edges().filter((e) => e.visible()).length).toBe(2);

      // Exit Orbit -> Hybrid
      runLayoutWithMetadata(cy, {
        architectureMode: 'hybrid',
        nodes: syntheticNodes,
        edges: syntheticEdges,
        enableFeatureLayout: true,
      });

      expect(cy.nodes().filter((n) => n.visible()).length).toBe(3);
      expect(cy.edges().filter((e) => e.visible()).length).toBe(2);
    });

    test('Test 6 — Semantic identity preservation', () => {
      const initialNodeIds = cy.nodes().map((n) => n.id()).sort();
      const initialEdgeIds = cy.edges().map((e) => e.id()).sort();

      runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:parent-comp',
        nodes: syntheticNodes,
        edges: syntheticEdges,
      });

      const currentNodes = cy.nodes();
      const currentEdges = cy.edges();

      expect(currentNodes.length).toBe(3);
      expect(currentEdges.length).toBe(2);
      expect(currentNodes.map((n) => n.id()).sort()).toEqual(initialNodeIds);
      expect(currentEdges.map((e) => e.id()).sort()).toEqual(initialEdgeIds);

      // Verify source & target endpoints on edges
      currentEdges.forEach((edge) => {
        const orig = syntheticEdges.find((e) => e.id === edge.id());
        expect(orig).toBeDefined();
        expect(edge.data('source')).toBe(orig?.source);
        expect(edge.data('target')).toBe(orig?.target);
      });
    });
  });

  // --------------------------------------------------------------------------
  // REAL PBIM DATASET VERIFICATION (Section 15 & 17)
  // --------------------------------------------------------------------------

  describe('Real PBIM Dataset Visibility Verification', () => {
    let pbimData: ExplorerDataSchema;
    let pbimHash: string;
    let cyPbim: cytoscape.Core;

    beforeEach(() => {
      const pbimPath = path.join(__dirname, '../../public/projects/pbim/explorer-data.json');
      if (!fs.existsSync(pbimPath)) {
        throw new Error(`VALIDATION BLOCKED — WRONG DATASET: PBIM file missing at ${pbimPath}`);
      }

      const rawPbim = fs.readFileSync(pbimPath, 'utf8');
      pbimHash = crypto.createHash('sha256').update(rawPbim).digest('hex');
      pbimData = JSON.parse(rawPbim);

      const expectedPbimHash = 'd6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b';
      if (pbimHash !== expectedPbimHash || pbimData.nodes.length !== 528 || pbimData.edges.length !== 2063) {
        throw new Error(`VALIDATION BLOCKED — WRONG DATASET: SHA-256 or node/edge mismatch.`);
      }

      const elements = buildGraphElements(pbimData.nodes, pbimData.edges);
      cyPbim = cytoscape({
        elements,
        style: getGraphStyles(),
        styleEnabled: true,
        headless: true,
      });
    });

    test('Dataset Preflight Verification', () => {
      expect(pbimHash).toBe('d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b');
      expect(pbimData.nodes.length).toBe(528);
      expect(pbimData.edges.length).toBe(2063);
      expect(cyPbim.nodes().length).toBe(528);
      expect(cyPbim.edges().length).toBe(2063);
    });

    test('Scenario 1 — LWC:asset-dashboard-container visibility', () => {
      const focalId = 'LWC:asset-dashboard-container';
      const projection = adaptComponentOrbit(pbimData, { focalLwcId: focalId, maxDepth: 7 });
      const expectedProjectedIds = new Set(Object.keys(projection.nodes));

      expect(expectedProjectedIds.size).toBe(128);

      runLayoutWithMetadata(cyPbim, {
        architectureMode: 'orbit',
        focalLwcId: focalId,
        nodes: pbimData.nodes,
        edges: pbimData.edges,
      });

      const totalNodes = cyPbim.nodes().length;
      const visibleNodes = cyPbim.nodes().filter((n) => n.visible());
      const hiddenNodes = cyPbim.nodes().filter((n) => !n.visible());

      const visibleIds = new Set(visibleNodes.map((n) => n.id()));
      const visibleUnfocused = new Set([...visibleIds].filter((id) => !expectedProjectedIds.has(id)));

      expect(totalNodes).toBe(528);
      expect(visibleNodes.length).toBe(128);
      expect(hiddenNodes.length).toBe(400);
      expect(visibleUnfocused.size).toBe(0); // 0 visible unfocused nodes
      expect(visibleIds).toEqual(expectedProjectedIds);
    });

    test('Scenario 2 — LWC:citizen-report-portal visibility', () => {
      const focalId = 'LWC:citizen-report-portal';
      const projection = adaptComponentOrbit(pbimData, { focalLwcId: focalId, maxDepth: 7 });
      const expectedProjectedIds = new Set(Object.keys(projection.nodes));

      expect(expectedProjectedIds.size).toBe(102);

      runLayoutWithMetadata(cyPbim, {
        architectureMode: 'orbit',
        focalLwcId: focalId,
        nodes: pbimData.nodes,
        edges: pbimData.edges,
      });

      const totalNodes = cyPbim.nodes().length;
      const visibleNodes = cyPbim.nodes().filter((n) => n.visible());
      const hiddenNodes = cyPbim.nodes().filter((n) => !n.visible());

      const visibleIds = new Set(visibleNodes.map((n) => n.id()));
      const visibleUnfocused = new Set([...visibleIds].filter((id) => !expectedProjectedIds.has(id)));

      expect(totalNodes).toBe(528);
      expect(visibleNodes.length).toBe(102);
      expect(hiddenNodes.length).toBe(426);
      expect(visibleUnfocused.size).toBe(0);
      expect(visibleIds).toEqual(expectedProjectedIds);
    });

    test('Scenario 3 — LWC:vendor-workspace visibility', () => {
      const focalId = 'LWC:vendor-workspace';
      const projection = adaptComponentOrbit(pbimData, { focalLwcId: focalId, maxDepth: 7 });
      const expectedProjectedIds = new Set(Object.keys(projection.nodes));

      expect(expectedProjectedIds.size).toBe(101);

      runLayoutWithMetadata(cyPbim, {
        architectureMode: 'orbit',
        focalLwcId: focalId,
        nodes: pbimData.nodes,
        edges: pbimData.edges,
      });

      const totalNodes = cyPbim.nodes().length;
      const visibleNodes = cyPbim.nodes().filter((n) => n.visible());
      const hiddenNodes = cyPbim.nodes().filter((n) => !n.visible());

      const visibleIds = new Set(visibleNodes.map((n) => n.id()));
      const visibleUnfocused = new Set([...visibleIds].filter((id) => !expectedProjectedIds.has(id)));

      expect(totalNodes).toBe(528);
      expect(visibleNodes.length).toBe(101);
      expect(hiddenNodes.length).toBe(427);
      expect(visibleUnfocused.size).toBe(0);
      expect(visibleIds).toEqual(expectedProjectedIds);
    });

    test('Scenario 4 — LWC:error-panel visibility', () => {
      const focalId = 'LWC:error-panel';
      const projection = adaptComponentOrbit(pbimData, { focalLwcId: focalId, maxDepth: 7 });
      const expectedProjectedIds = new Set(Object.keys(projection.nodes));

      expect(expectedProjectedIds.size).toBe(1);

      runLayoutWithMetadata(cyPbim, {
        architectureMode: 'orbit',
        focalLwcId: focalId,
        nodes: pbimData.nodes,
        edges: pbimData.edges,
      });

      const totalNodes = cyPbim.nodes().length;
      const visibleNodes = cyPbim.nodes().filter((n) => n.visible());
      const hiddenNodes = cyPbim.nodes().filter((n) => !n.visible());

      const visibleIds = new Set(visibleNodes.map((n) => n.id()));
      const visibleUnfocused = new Set([...visibleIds].filter((id) => !expectedProjectedIds.has(id)));

      expect(totalNodes).toBe(528);
      expect(visibleNodes.length).toBe(1);
      expect(hiddenNodes.length).toBe(527);
      expect(visibleUnfocused.size).toBe(0);
      expect(visibleIds).toEqual(expectedProjectedIds);
      expect(cyPbim.edges().filter((e) => e.visible()).length).toBe(0);
    });

    test('Focus Transition Matrix (asset -> citizen -> vendor -> error -> asset)', () => {
      const transitions = [
        { focalId: 'LWC:asset-dashboard-container', expected: 128 },
        { focalId: 'LWC:citizen-report-portal', expected: 102 },
        { focalId: 'LWC:vendor-workspace', expected: 101 },
        { focalId: 'LWC:error-panel', expected: 1 },
        { focalId: 'LWC:asset-dashboard-container', expected: 128 },
      ];

      for (const step of transitions) {
        const projection = adaptComponentOrbit(pbimData, { focalLwcId: step.focalId, maxDepth: 7 });
        const expectedIds = new Set(Object.keys(projection.nodes));

        runLayoutWithMetadata(cyPbim, {
          architectureMode: 'orbit',
          focalLwcId: step.focalId,
          nodes: pbimData.nodes,
          edges: pbimData.edges,
        });

        const visibleNodes = cyPbim.nodes().filter((n) => n.visible());
        const visibleIds = new Set(visibleNodes.map((n) => n.id()));
        const visibleUnfocused = new Set([...visibleIds].filter((id) => !expectedIds.has(id)));

        expect(cyPbim.nodes().length).toBe(528);
        expect(visibleNodes.length).toBe(step.expected);
        expect(visibleUnfocused.size).toBe(0);
        expect(visibleIds).toEqual(expectedIds);
      }
    });

    test('Stale Position Contamination Test', () => {
      // Pick representative unfocused nodes from Scenario 1 (asset-dashboard-container)
      // e.g. ApexClass:ApprovalFlowController and ApexClass:ApprovalFlowControllerTest
      const focalId = 'LWC:asset-dashboard-container';

      runLayoutWithMetadata(cyPbim, {
        architectureMode: 'orbit',
        focalLwcId: focalId,
        nodes: pbimData.nodes,
        edges: pbimData.edges,
      });

      const unfocusedId1 = 'ApexClass:ApprovalFlowController';
      const unfocusedId2 = 'ApexClass:ApprovalFlowControllerTest';

      const node1 = cyPbim.getElementById(unfocusedId1);
      const node2 = cyPbim.getElementById(unfocusedId2);

      expect(node1.length).toBe(1);
      expect(node2.length).toBe(1);

      // Node exists in Cytoscape and ID is unchanged
      expect(node1.id()).toBe(unfocusedId1);
      expect(node2.id()).toBe(unfocusedId2);

      // Node.visible() MUST be false
      expect(node1.visible()).toBe(false);
      expect(node2.visible()).toBe(false);
    });
  });
});
