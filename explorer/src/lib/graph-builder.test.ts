import { describe, it, expect } from 'vitest';
import { buildGraphElements, getNodeById } from './graph-builder';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

describe('graph-builder', () => {
  // Sample test data from explorer-data.json
  const testNodes: ExplorerNode[] = [
    {
      id: 'ApexClass:AssetDashboardService',
      displayName: 'AssetDashboardService',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/AssetDashboardService.cls',
      metrics: { fanIn: 2, fanOut: 3, coupling: 5, unresolved: 1, score: 12 },
      risk: 'HIGH',
      riskReasons: ['high coupling score'],
      behavior: {
        isTest: false,
        sharing: 'with sharing',
        publicContractsCount: 2,
        asyncPatterns: ['Queueable'],
        securitySignalsCount: 1,
        queryCount: 3,
        dmlCount: 1,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: true,
        hasCycles: true,
        hasUnresolved: true,
        testCoverageStatus: 'COVERED'
      }
    },
    {
      id: 'ApexClass:AssetHelper',
      displayName: 'AssetHelper',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/AssetHelper.cls',
      metrics: { fanIn: 1, fanOut: 1, coupling: 2, unresolved: 0, score: 4 },
      risk: 'MEDIUM',
      riskReasons: ['participates in circular dependency'],
      behavior: {
        isTest: false,
        sharing: 'with sharing',
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 1,
        dmlCount: 0,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: true,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED'
      }
    },
    {
      id: 'ApexClass:AssetDashboardServiceTest',
      displayName: 'AssetDashboardServiceTest',
      type: 'ApexClass',
      file: 'force-app/main/default/classes/AssetDashboardServiceTest.cls',
      metrics: { fanIn: 0, fanOut: 1, coupling: 1, unresolved: 0, score: 1 },
      risk: 'LOW',
      riskReasons: [],
      behavior: {
        isTest: true,
        sharing: null,
        publicContractsCount: 0,
        asyncPatterns: [],
        securitySignalsCount: 0,
        queryCount: 0,
        dmlCount: 0,
        calloutCount: 0
      },
      refactoringReadiness: {
        isHighRisk: false,
        hasCycles: false,
        hasUnresolved: false,
        testCoverageStatus: 'COVERED'
      }
    }
  ];

  const testEdges: ExplorerEdge[] = [
    {
      id: 'edge-1',
      source: 'ApexClass:AssetDashboardService',
      target: 'ApexClass:AssetHelper',
      relationshipType: 'method-call',
      method: 'calculateMetrics',
      evidence: 'AssetHelper.calculateMetrics(assetList);',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 42,
      column: 9,
      methodOwner: 'loadDashboardData',
      file: 'force-app/main/default/classes/AssetDashboardService.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'AssetDashboardService', method: 'loadDashboardData' },
        target: { type: 'ApexClass', name: 'AssetHelper', method: 'calculateMetrics' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 42, column: 9 }
      }
    },
    {
      id: 'edge-2',
      source: 'ApexClass:AssetHelper',
      target: 'ApexClass:AssetDashboardService',
      relationshipType: 'method-call',
      method: 'notifyService',
      evidence: 'AssetDashboardService.notifyService();',
      unresolved: false,
      resolutionClassification: 'RESOLVED_LOCAL',
      resolutionStrategy: 'EXACT',
      confidence: 'high',
      line: 18,
      column: 9,
      methodOwner: 'calculateMetrics',
      file: 'force-app/main/default/classes/AssetHelper.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'AssetHelper', method: 'calculateMetrics' },
        target: { type: 'ApexClass', name: 'AssetDashboardService', method: 'notifyService' },
        relationship: { type: 'method-call', resolution: 'EXACT' },
        location: { line: 18, column: 9 }
      }
    },
    {
      id: 'edge-3',
      source: 'ApexClass:AssetDashboardService',
      target: 'External:ExternalPaymentGateway',
      relationshipType: 'instantiation',
      method: null,
      evidence: 'new ExternalPaymentGateway();',
      unresolved: true,
      resolutionClassification: 'UNKNOWN',
      resolutionStrategy: 'LLM',
      confidence: 'low',
      line: 85,
      column: 12,
      methodOwner: 'processPayment',
      file: 'force-app/main/default/classes/AssetDashboardService.cls',
      canonical: {
        source: { type: 'ApexClass', name: 'AssetDashboardService', method: 'processPayment' },
        target: { type: 'External', name: 'ExternalPaymentGateway', method: null },
        relationship: { type: 'instantiation', resolution: 'UNRESOLVED' },
        location: { line: 85, column: 12 }
      }
    }
  ];

  describe('buildGraphElements', () => {
    it('renders all valid nodes from the data', () => {
      const elements = buildGraphElements(testNodes, testEdges);
      
      const nodes = elements.filter(el => 'data' in el && 'source' in el.data === false);
      expect(nodes).toHaveLength(4); // 3 explicit + 1 external
      
      const nodeIds = nodes.map(n => n.data.id);
      expect(nodeIds).toContain('ApexClass:AssetDashboardService');
      expect(nodeIds).toContain('ApexClass:AssetHelper');
      expect(nodeIds).toContain('ApexClass:AssetDashboardServiceTest');
      expect(nodeIds).toContain('External:ExternalPaymentGateway');
    });

    it('renders all valid edges from the data', () => {
      const elements = buildGraphElements(testNodes, testEdges);
      
      const edges = elements.filter(el => 'data' in el && 'source' in el.data && 'target' in el.data);
      expect(edges).toHaveLength(3);
      
      const edgeIds = edges.map(e => e.data.id);
      expect(edgeIds).toContain('edge-1');
      expect(edgeIds).toContain('edge-2');
      expect(edgeIds).toContain('edge-3');
    });

    it('creates external node for unresolved edge target', () => {
      const elements = buildGraphElements(testNodes, testEdges);
      
      const externalNode = elements.find(
        el => 'data' in el && el.data.id === 'External:ExternalPaymentGateway'
      );
      
      expect(externalNode).toBeDefined();
      expect(externalNode?.data.type).toBe('External');
      expect(externalNode?.data.risk).toBe('LOW');
      expect(externalNode?.data.label).toBe('ExternalPaymentGateway');
    });

    it('handles unresolved edge correctly', () => {
      const elements = buildGraphElements(testNodes, testEdges);
      
      const unresolvedEdge = elements.find(
        el => 'data' in el && el.data.id === 'edge-3'
      );
      
      expect(unresolvedEdge).toBeDefined();
      expect(unresolvedEdge?.data.unresolved).toBe(true);
    });

    it('does not crash with cycle data (circular dependencies)', () => {
      // The test data contains a cycle: AssetDashboardService -> AssetHelper -> AssetDashboardService
      expect(() => {
        const elements = buildGraphElements(testNodes, testEdges);
        // Just verify it doesn't throw and has correct structure
        expect(elements.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('includes node data for all properties', () => {
      const elements = buildGraphElements(testNodes, testEdges);
      
      const node = elements.find(
        el => 'data' in el && el.data.id === 'ApexClass:AssetDashboardService'
      );
      
      expect(node?.data.type).toBe('ApexClass');
      expect(node?.data.risk).toBe('HIGH');
      expect(node?.data.coupling).toBe(5);
      expect(node?.data.fanIn).toBe(2);
      expect(node?.data.fanOut).toBe(3);
      expect(node?.data.isTest).toBe(false);
      expect(typeof node?.data.isTest).toBe('boolean');
      expect(node?.data.hasCycles).toBe(true);
      expect(node?.data.hasUnresolved).toBe(true);

      const testNode = elements.find(
        el => 'data' in el && el.data.id === 'ApexClass:AssetDashboardServiceTest'
      );
      expect(testNode?.data.type).toBe('ApexClass');
      expect(testNode?.data.isTest).toBe(true);
      expect(typeof testNode?.data.isTest).toBe('boolean');

      const externalNode = elements.find(
        el => 'data' in el && el.data.id === 'External:ExternalPaymentGateway'
      );
      expect(externalNode?.data.isTest).toBe(false);
      expect(typeof externalNode?.data.isTest).toBe('boolean');
    });

    it('preserves node type classification for Object and CustomObject in node data', () => {
      const schemaNodes: ExplorerNode[] = [
        {
          id: 'Object:Account',
          displayName: 'Account',
          type: 'Object',
          file: '',
          metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'NOT_COVERED' }
        },
        {
          id: 'CustomObject:Invoice__c',
          displayName: 'Invoice__c',
          type: 'CustomObject',
          file: '',
          metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
          risk: 'LOW',
          riskReasons: [],
          behavior: { isTest: false, sharing: null, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
          refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'NOT_COVERED' }
        }
      ];

      const elements = buildGraphElements(schemaNodes, []);
      const standardObj = elements.find(e => e.data.id === 'Object:Account');
      const customObj = elements.find(e => e.data.id === 'CustomObject:Invoice__c');

      expect(standardObj?.data.type).toBe('Object');
      expect(customObj?.data.type).toBe('CustomObject');
    });

    it('handles empty nodes and edges', () => {
      const elements = buildGraphElements([], []);
      expect(elements).toHaveLength(0);
    });

    it('handles edges without corresponding nodes', () => {
      const orphanEdge: ExplorerEdge[] = [
        {
          id: 'orphan-edge',
          source: 'External:OrphanSource',
          target: 'External:OrphanTarget',
          relationshipType: 'unknown',
          method: null,
          evidence: '',
          unresolved: false,
          resolutionClassification: 'UNKNOWN',
          resolutionStrategy: 'EXACT',
          confidence: 'low',
          line: null,
          column: null,
          methodOwner: null,
          file: '',
          canonical: {
            source: { type: 'External', name: 'OrphanSource' },
            target: { type: 'External', name: 'OrphanTarget' },
            relationship: { type: 'unknown', resolution: 'UNRESOLVED' },
            location: {}
          }
        }
      ];
      
      const elements = buildGraphElements([], orphanEdge);
      
      expect(elements).toHaveLength(3); // 2 nodes + 1 edge
    });
  });

  describe('getNodeById', () => {
    it('finds node by exact ID', () => {
      const found = getNodeById(testNodes, 'ApexClass:AssetDashboardService');
      expect(found).toBeDefined();
      expect(found?.displayName).toBe('AssetDashboardService');
    });

    it('returns undefined for non-existent ID', () => {
      const found = getNodeById(testNodes, 'NonExistent:Id');
      expect(found).toBeUndefined();
    });
  });
});