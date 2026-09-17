import { describe, it, expect } from 'vitest';
import { getGraphStyles, getNodeShape, APEX_TEST_CLASS_SHAPE, NODE_COLORS, NODE_SHAPE_BY_TYPE, RISK_BORDER_COLORS, EDGE_COLORS } from './graph-style';
import { ALL_EXPLORER_NODE_TYPES, ExplorerNodeType } from '../types/explorer';

describe('graph-style', () => {
  describe('NODE_SHAPE_BY_TYPE', () => {
    it('defines a Cytoscape shape for every supported ExplorerNodeType', () => {
      ALL_EXPLORER_NODE_TYPES.forEach((type) => {
        expect(NODE_SHAPE_BY_TYPE[type]).toBeDefined();
        expect(typeof NODE_SHAPE_BY_TYPE[type]).toBe('string');
      });
    });

    it('ensures each entity type has a 100% unique node shape', () => {
      const shapes = ALL_EXPLORER_NODE_TYPES.map((type) => NODE_SHAPE_BY_TYPE[type]);
      const uniqueShapes = new Set(shapes);
      expect(uniqueShapes.size).toBe(ALL_EXPLORER_NODE_TYPES.length);
    });

    it('maps expected Cytoscape shapes for primary entity types', () => {
      expect(getNodeShape('ApexClass')).toBe('ellipse');
      expect(getNodeShape('ApexTrigger')).toBe('triangle');
      expect(getNodeShape('LWC')).toBe('rectangle');
      expect(getNodeShape('Visualforce')).toBe('round-rectangle');
      expect(getNodeShape('Flow')).toBe('hexagon');
      expect(getNodeShape('Object')).toBe('diamond');
      expect(getNodeShape('CustomObject')).toBe('octagon');
      expect(getNodeShape('Field')).toBe('rhomboid');
      expect(getNodeShape('CustomField')).toBe('cut-rectangle');
      expect(getNodeShape('External')).toBe('star');
    });

    it('falls back to default ellipse for unknown node type', () => {
      expect(getNodeShape('UnknownType' as ExplorerNodeType)).toBe('ellipse');
    });

    it('returns standard shape for normal Apex Class and distinct shape for Apex Test Class', () => {
      // Test 1: Normal Apex Class gets existing shape ('ellipse')
      const normalApexShape = getNodeShape('ApexClass', false);
      expect(normalApexShape).toBe('ellipse');

      // Test 2: Apex Test Class gets new distinct shape ('bottom-round-rectangle')
      const testApexShape = getNodeShape('ApexClass', true);
      expect(testApexShape).toBe(APEX_TEST_CLASS_SHAPE);

      // Test 3: The two shapes are different
      expect(normalApexShape).not.toBe(testApexShape);

      // Test 4: Apex Test Class does not accidentally use LWC/Object/Field/etc. shapes
      const otherShapes = ALL_EXPLORER_NODE_TYPES
        .filter(t => t !== 'ApexClass')
        .map(t => NODE_SHAPE_BY_TYPE[t]);
      expect(otherShapes).not.toContain(testApexShape);

      // Test 5: Other entity types retain their existing shapes regardless of isTest flag
      ALL_EXPLORER_NODE_TYPES.filter(t => t !== 'ApexClass').forEach(type => {
        expect(getNodeShape(type, false)).toBe(NODE_SHAPE_BY_TYPE[type]);
        expect(getNodeShape(type, true)).toBe(NODE_SHAPE_BY_TYPE[type]);
      });
    });

    it('accepts an ExplorerNode object directly in getNodeShape', () => {
      const normalNode = {
        id: 'ApexClass:MovieController',
        displayName: 'MovieController',
        type: 'ApexClass' as const,
        file: 'MovieController.cls',
        metrics: { fanIn: 1, fanOut: 0, coupling: 1, unresolved: 0, score: 1 },
        risk: 'LOW' as const,
        riskReasons: [],
        behavior: {
          isTest: false,
          publicContractsCount: 1,
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
          testCoverageStatus: 'COVERED' as const
        }
      };

      const testNode = {
        ...normalNode,
        id: 'ApexClass:MovieControllerTest',
        displayName: 'MovieControllerTest',
        behavior: {
          ...normalNode.behavior,
          isTest: true
        }
      };

      expect(getNodeShape(normalNode)).toBe('ellipse');
      expect(getNodeShape(testNode)).toBe(APEX_TEST_CLASS_SHAPE);
    });
  });

  describe('getGraphStyles', () => {
    it('returns an array of styles', () => {
      const styles = getGraphStyles();
      expect(Array.isArray(styles)).toBe(true);
      expect(styles.length).toBeGreaterThan(0);
    });

    it('includes base node selector', () => {
      const styles = getGraphStyles();
      const nodeStyle = styles.find(s => s.selector === 'node');
      expect(nodeStyle).toBeDefined();
      expect((nodeStyle?.style as any)['label']).toBe('data(label)');
    });

    it('includes selection style for nodes', () => {
      const styles = getGraphStyles();
      const selectedStyle = styles.find(s => s.selector === 'node:selected');
      expect(selectedStyle).toBeDefined();
      expect((selectedStyle?.style as any)['border-width']).toBe(4);
    });

    it('includes risk-based styles', () => {
      const styles = getGraphStyles();
      
      const highRiskStyle = styles.find(s => s.selector === 'node[risk = "HIGH"]');
      expect(highRiskStyle).toBeDefined();
      
      const mediumRiskStyle = styles.find(s => s.selector === 'node[risk = "MEDIUM"]');
      expect(mediumRiskStyle).toBeDefined();
      
      const lowRiskStyle = styles.find(s => s.selector === 'node[risk = "LOW"]');
      expect(lowRiskStyle).toBeDefined();
    });

    it('includes node type styles with shapes and colors', () => {
      const styles = getGraphStyles();
      
      ALL_EXPLORER_NODE_TYPES.forEach((type) => {
        const typeStyle = styles.find(s => s.selector === `node[type = "${type}"]`);
        expect(typeStyle).toBeDefined();
        expect((typeStyle?.style as any)['shape']).toBe(NODE_SHAPE_BY_TYPE[type]);
        expect((typeStyle?.style as any)['background-color']).toBeDefined();
        expect((typeStyle?.style as any)['border-color']).toBeDefined();
      });

      // Verify Apex Test Class specific selector style
      const apexTestStyle = styles.find(s => s.selector === 'node[type = "ApexClass"][?isTest]');
      expect(apexTestStyle).toBeDefined();
      expect((apexTestStyle?.style as any)['shape']).toBe(APEX_TEST_CLASS_SHAPE);
    });

    it('includes edge styles', () => {
      const styles = getGraphStyles();
      
      const edgeStyle = styles.find(s => s.selector === 'edge');
      expect(edgeStyle).toBeDefined();
      expect((edgeStyle?.style as any)['curve-style']).toBe('bezier');
    });

    it('includes unresolved edge style', () => {
      const styles = getGraphStyles();
      
      const unresolvedStyle = styles.find(s => s.selector === 'edge[unresolved = "true"]');
      expect(unresolvedStyle).toBeDefined();
      expect((unresolvedStyle?.style as any)['line-style']).toBe('dashed');
    });

    it('accepts custom options', () => {
      const styles = getGraphStyles({ nodeWidth: 80, nodeHeight: 80, fontSize: 14 });
      
      const nodeStyle = styles.find(s => s.selector === 'node');
      expect((nodeStyle?.style as any)['width']).toBe(80);
      expect((nodeStyle?.style as any)['height']).toBe(80);
      expect((nodeStyle?.style as any)['font-size']).toBe('14px');
    });
  });

  describe('NODE_COLORS', () => {
    it('has colors for all entity types in the data', () => {
      expect(NODE_COLORS.ApexClass).toBeDefined();
      expect(NODE_COLORS.External).toBeDefined();
    });

    it('has background and border colors', () => {
      expect(NODE_COLORS.ApexClass.background).toBeDefined();
      expect(NODE_COLORS.ApexClass.border).toBeDefined();
    });
  });

  describe('RISK_BORDER_COLORS', () => {
    it('has colors for all risk levels', () => {
      expect(RISK_BORDER_COLORS.HIGH).toBeDefined();
      expect(RISK_BORDER_COLORS.MEDIUM).toBeDefined();
      expect(RISK_BORDER_COLORS.LOW).toBeDefined();
    });
  });

  describe('EDGE_COLORS', () => {
    it('has colors for common relationship types', () => {
      expect(EDGE_COLORS['method-call']).toBeDefined();
      expect(EDGE_COLORS['instantiation']).toBeDefined();
      expect(EDGE_COLORS['SOQL']).toBeDefined();
    });
  });
});