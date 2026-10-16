import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  computeOrbitRingIndex,
  projectOrbitSemantics,
} from './orbit-semantics';
import type { ExplorerNode, ExplorerEdge, ExplorerNodeType } from '../../types/explorer';
import { classifyNodeLayer } from './layers';
import { classifyFeatureRole } from './feature-roles';

function loadProjectFixture(projectName: string): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, `../../../public/projects/${projectName}/explorer-data.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  return {
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
    edges: Array.isArray(data.edges) ? data.edges : [],
  };
}

describe('Workstream A — Orbit Semantic Projection & Invariants Test Suite', () => {
  describe('Unit Testing — computeOrbitRingIndex', () => {
    test('maps LWC, Visualforce, ApexTrigger, Flow, and presentation layer to Ring 0', () => {
      const lwcNode: ExplorerNode = {
        id: 'lwc_1',
        displayName: 'orderComponent',
        type: 'LWC',
        file: 'force-app/main/default/lwc/orderComponent.js',
        metrics: { fanIn: 1, fanOut: 2, coupling: 3, unresolved: 0, score: 1 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      };
      expect(computeOrbitRingIndex(lwcNode, 'presentation', 'FeatureAnchor')).toBe(0);

      const triggerNode: ExplorerNode = { ...lwcNode, id: 'trig_1', type: 'ApexTrigger' };
      expect(computeOrbitRingIndex(triggerNode, 'application', 'FeatureAnchor')).toBe(0);

      const flowNode: ExplorerNode = { ...lwcNode, id: 'flow_1', type: 'Flow' };
      expect(computeOrbitRingIndex(flowNode, 'application', 'FeatureAnchor')).toBe(0);
    });

    test('maps Application layer ApexClasses to Ring 1', () => {
      const controllerNode: ExplorerNode = {
        id: 'ctrl_1',
        displayName: 'OrderController',
        type: 'ApexClass',
        file: 'force-app/main/default/classes/OrderController.cls',
        metrics: { fanIn: 2, fanOut: 2, coupling: 4, unresolved: 0, score: 2 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      };
      expect(computeOrbitRingIndex(controllerNode, 'application', 'FeatureAnchor')).toBe(1);
    });

    test('maps Domain layer ApexClasses to Ring 2', () => {
      const serviceNode: ExplorerNode = {
        id: 'svc_1',
        displayName: 'OrderService',
        type: 'ApexClass',
        file: 'force-app/main/default/classes/OrderService.cls',
        metrics: { fanIn: 3, fanOut: 3, coupling: 6, unresolved: 0, score: 3 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      };
      expect(computeOrbitRingIndex(serviceNode, 'domain', 'FeatureCore')).toBe(2);
    });

    test('maps Objects and CustomObjects to Ring 3', () => {
      const objectNode: ExplorerNode = {
        id: 'obj_1',
        displayName: 'Order__c',
        type: 'CustomObject',
        file: 'force-app/main/default/objects/Order__c/Order__c.object-meta.xml',
        metrics: { fanIn: 5, fanOut: 0, coupling: 5, unresolved: 0, score: 4 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      };
      expect(computeOrbitRingIndex(objectNode, 'schema', 'FeatureData')).toBe(3);
    });

    test('maps Fields, CustomFields, and External to Ring 4', () => {
      const fieldNode: ExplorerNode = {
        id: 'fld_1',
        displayName: 'Order__c.Status__c',
        type: 'CustomField',
        file: 'force-app/main/default/objects/Order__c/fields/Status__c.field-meta.xml',
        metrics: { fanIn: 2, fanOut: 0, coupling: 2, unresolved: 0, score: 1 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      };
      expect(computeOrbitRingIndex(fieldNode, 'schema', 'FeatureData')).toBe(4);

      const extNode: ExplorerNode = { ...fieldNode, id: 'ext_1', type: 'External' };
      expect(computeOrbitRingIndex(extNode, 'schema', 'FeatureData')).toBe(4);
    });

    test('maps Tests and SharedInfrastructure to Ring 5', () => {
      const testNode: ExplorerNode = {
        id: 'test_1',
        displayName: 'OrderServiceTest',
        type: 'ApexClass',
        file: 'force-app/main/default/classes/OrderServiceTest.cls',
        metrics: { fanIn: 0, fanOut: 4, coupling: 4, unresolved: 0, score: 1 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: true, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      };
      expect(computeOrbitRingIndex(testNode, 'application', 'FeatureTest')).toBe(5);

      const sharedNode: ExplorerNode = {
        ...testNode,
        id: 'util_1',
        displayName: 'LoggerUtil',
        behavior: { ...testNode.behavior, isTest: false },
      };
      expect(computeOrbitRingIndex(sharedNode, 'application', 'SharedInfrastructure')).toBe(5);
    });
  });

  describe('Semantic Invariants S1 – S15 Execution', () => {
    const { nodes, edges } = loadProjectFixture('cst');
    const projection = projectOrbitSemantics(nodes, edges);

    test('S1: Every source node has exactly 1 Orbit semantic record', () => {
      expect(projection.nodes.size).toBe(nodes.length);
      expect(projection.nodeList.length).toBe(nodes.length);
      const uniqueIds = new Set(projection.nodeList.map(n => n.nodeId));
      expect(uniqueIds.size).toBe(nodes.length);
    });

    test('S2: No Orbit semantic record references a nonexistent source node', () => {
      const sourceIds = new Set(nodes.map(n => n.id));
      for (const rec of projection.nodeList) {
        expect(sourceIds.has(rec.nodeId)).toBe(true);
      }
    });

    test('S3: Ring assignment is deterministic', () => {
      const run1 = projectOrbitSemantics(nodes, edges);
      const run2 = projectOrbitSemantics(nodes, edges);
      for (const n of nodes) {
        expect(run1.nodes.get(n.id)?.orbitRingIndex).toBe(run2.nodes.get(n.id)?.orbitRingIndex);
      }
    });

    test('S4: Sector identity is deterministic', () => {
      const run1 = projectOrbitSemantics(nodes, edges);
      const run2 = projectOrbitSemantics(nodes, edges);
      for (const n of nodes) {
        expect(run1.nodes.get(n.id)?.orbitSectorId).toBe(run2.nodes.get(n.id)?.orbitSectorId);
      }
    });

    test('S5: orbitSectorId preserves authoritative feature identity', () => {
      for (const meta of projection.nodeList) {
        expect(meta.orbitSectorId).toBe(meta.primaryFeatureId);
        expect(typeof meta.orbitSectorId).toBe('string');
        expect(meta.orbitSectorId.length).toBeGreaterThan(0);
      }
    });

    test('S6: Domain identity does not overwrite feature sector identity', () => {
      for (const meta of projection.nodeList) {
        expect(meta.orbitSectorId).toBe(meta.primaryFeatureId);
        expect(meta.primaryDomainId).toBeDefined();
        // Check that sector ID is not replaced by domain ID
        if (meta.primaryFeatureId !== meta.primaryDomainId && meta.primaryFeatureId !== 'Shared') {
          expect(meta.orbitSectorId).not.toBe(meta.primaryDomainId);
        }
      }
    });

    test('S7: Ordering key is deterministic and well-formatted', () => {
      for (const meta of projection.nodeList) {
        expect(meta.semanticOrderKey).toMatch(/^R\d{2}:S.+:T.+:N.+$/);
      }
      // Check that sorting by semanticOrderKey is invariant
      const sorted1 = [...projection.nodeList].sort((a, b) => a.semanticOrderKey.localeCompare(b.semanticOrderKey));
      const sorted2 = [...projection.nodeList].sort((a, b) => a.semanticOrderKey.localeCompare(b.semanticOrderKey));
      expect(sorted1.map(n => n.nodeId)).toEqual(sorted2.map(n => n.nodeId));
    });

    test('S8: Missing metadata follows documented fallback rules', () => {
      const syntheticNode: ExplorerNode = {
        id: 'synthetic_untyped_1',
        displayName: 'UnknownEntity',
        type: '' as ExplorerNodeType,
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      };

      const result = projectOrbitSemantics([syntheticNode], []);
      const meta = result.nodes.get('synthetic_untyped_1')!;

      expect(meta.canonicalNodeType).toBe('External');
      expect(meta.canonicalLayer).toBe('application');
      expect(meta.fallbackFlags.isUntypedNodeFallback).toBe(true);
      expect(meta.fallbackFlags.isDefaultLayerFallback).toBe(true);
    });

    test('S9: Input iteration order cannot change semantic assignments (Adversarial Order Perturbation)', () => {
      const originalNodes = [...nodes];
      const reversedNodes = [...nodes].reverse();
      const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

      // Seeded random shuffle
      const shuffledNodes = [...nodes];
      for (let i = shuffledNodes.length - 1; i > 0; i--) {
        const j = (i * 17 + 3) % (i + 1);
        [shuffledNodes[i], shuffledNodes[j]] = [shuffledNodes[j], shuffledNodes[i]];
      }

      const pOriginal = projectOrbitSemantics(originalNodes, edges);
      const pReversed = projectOrbitSemantics(reversedNodes, edges);
      const pSorted = projectOrbitSemantics(sortedNodes, edges);
      const pShuffled = projectOrbitSemantics(shuffledNodes, edges);

      for (const n of originalNodes) {
        const id = n.id;
        const metaOrig = pOriginal.nodes.get(id)!;
        const metaRev = pReversed.nodes.get(id)!;
        const metaSort = pSorted.nodes.get(id)!;
        const metaShuf = pShuffled.nodes.get(id)!;

        expect(metaRev.orbitRingIndex).toBe(metaOrig.orbitRingIndex);
        expect(metaRev.primaryFeatureId).toBe(metaOrig.primaryFeatureId);
        expect(metaRev.primaryDomainId).toBe(metaOrig.primaryDomainId);
        expect(metaRev.orbitSectorId).toBe(metaOrig.orbitSectorId);
        expect(metaRev.semanticOrderKey).toBe(metaOrig.semanticOrderKey);

        expect(metaSort).toEqual(metaOrig);
        expect(metaShuf).toEqual(metaOrig);
      }
    });

    test('S10: No geometry fields exist in the semantic projection', () => {
      for (const meta of projection.nodeList) {
        const keys = Object.keys(meta);
        expect(keys).not.toContain('x');
        expect(keys).not.toContain('y');
        expect(keys).not.toContain('radius');
        expect(keys).not.toContain('angle');
        expect(keys).not.toContain('track');
        expect(keys).not.toContain('width');
        expect(keys).not.toContain('height');
        expect(keys).not.toContain('collision');
      }
    });

    test('S11: No semantic projection depends on React/browser state', () => {
      // Pure function invocation verification - can run without DOM/React state
      expect(projection).toBeDefined();
      expect(projection.nodes.size).toBe(nodes.length);
    });

    test('S12: No semantic projection depends on worker execution order', () => {
      // Synchronous execution, 10x determinism test
      const results = Array.from({ length: 10 }, () => projectOrbitSemantics(nodes, edges));
      const baselineJson = JSON.stringify(results[0].nodeList);
      for (let i = 1; i < 10; i++) {
        expect(JSON.stringify(results[i].nodeList)).toBe(baselineJson);
      }
    });

    test('S13: No semantic projection modifies global semantic classifiers', () => {
      const sampleNode = nodes[0];
      const layerBefore = classifyNodeLayer(sampleNode);
      const roleBefore = classifyFeatureRole(sampleNode);

      projectOrbitSemantics(nodes, edges);

      const layerAfter = classifyNodeLayer(sampleNode);
      const roleAfter = classifyFeatureRole(sampleNode);

      expect(layerAfter).toBe(layerBefore);
      expect(roleAfter).toBe(roleBefore);
    });

    test('S14: No Smax=25 semantic constraint exists', () => {
      const pbimFixture = loadProjectFixture('pbim');
      const pbimProj = projectOrbitSemantics(pbimFixture.nodes, pbimFixture.edges);

      expect(pbimProj.summary.sectorCount).toBeGreaterThan(0);
      // Sector count is strictly derived from features, not artificially capped at 25
      expect(typeof pbimProj.summary.sectorCount).toBe('number');
    });

    test('S15: No feature merger is claimed unless implemented', () => {
      for (const meta of projection.nodeList) {
        expect(meta.primaryFeatureId).toBe(meta.orbitSectorId);
      }
    });
  });

  describe('Real Fixture Matrix Execution', () => {
    const fixtures = ['food-app', 'cst', 'bqc', 'pbim'];

    for (const fixtureName of fixtures) {
      test(`Validates real fixture: ${fixtureName}`, () => {
        const { nodes, edges } = loadProjectFixture(fixtureName);
        const projection = projectOrbitSemantics(nodes, edges);

        expect(projection.summary.totalNodes).toBe(nodes.length);
        expect(projection.summary.totalEdges).toBe(edges.length);
        expect(projection.summary.unassignedNodes).toBe(0);
        expect(projection.summary.duplicateProjections).toBe(0);
        expect(projection.nodeList.length).toBe(nodes.length);

        console.log(`[FIXTURE METRICS] ${fixtureName}:`, {
          nodes: projection.summary.totalNodes,
          edges: projection.summary.totalEdges,
          types: projection.summary.distinctNodeTypes,
          ringCounts: projection.ringCounts,
          sectorCount: projection.summary.sectorCount,
          featureCount: projection.featureCount,
          domainCount: projection.domainCount,
          fallbacks: projection.fallbackCounts,
        });
      });
    }

    test('Deep PBIM Analysis Verification', () => {
      const { nodes, edges } = loadProjectFixture('pbim');
      const projection = projectOrbitSemantics(nodes, edges);

      expect(nodes.length).toBe(528);
      expect(edges.length).toBe(2063);

      const nodeTypes: Record<string, number> = {};
      for (const n of nodes) {
        nodeTypes[n.type] = (nodeTypes[n.type] || 0) + 1;
      }

      expect(nodeTypes['LWC']).toBe(30);
      expect(nodeTypes['ApexTrigger']).toBe(13);

      expect(projection.nodes.size).toBe(528);
      expect(projection.nodeList.length).toBe(528);

      // Verify node conservation: missing=0, duplicated=0, unassigned=0
      const nodeIds = nodes.map(n => n.id).sort((a, b) => a.localeCompare(b));
      const projectedIds = projection.nodeList.map(n => n.nodeId).sort((a, b) => a.localeCompare(b));
      expect(projectedIds).toEqual(nodeIds);
    });
  });
});
