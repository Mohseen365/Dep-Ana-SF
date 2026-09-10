import { describe, it, expect } from 'vitest';
import { getGraphStyles, NODE_COLORS, RISK_BORDER_COLORS, EDGE_COLORS } from './graph-style';

describe('graph-style', () => {
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

    it('includes node type styles', () => {
      const styles = getGraphStyles();
      
      const apexClassStyle = styles.find(s => s.selector === 'node[type = "ApexClass"]');
      expect(apexClassStyle).toBeDefined();
      
      const externalStyle = styles.find(s => s.selector === 'node[type = "External"]');
      expect(externalStyle).toBeDefined();
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