import type { StylesheetStyle } from 'cytoscape';
import type { ExplorerNode, ExplorerNodeType } from '../types/explorer';

export type NodeShape =
  | 'ellipse'
  | 'triangle'
  | 'rectangle'
  | 'round-rectangle'
  | 'bottom-round-rectangle'
  | 'hexagon'
  | 'diamond'
  | 'octagon'
  | 'rhomboid'
  | 'cut-rectangle'
  | 'star';

export const APEX_TEST_CLASS_SHAPE: NodeShape = 'bottom-round-rectangle';

export const NODE_SHAPE_BY_TYPE: Record<ExplorerNodeType, NodeShape> = {
  ApexClass: 'ellipse',
  ApexTrigger: 'triangle',
  LWC: 'rectangle',
  Visualforce: 'round-rectangle',
  Flow: 'hexagon',
  Object: 'diamond',
  CustomObject: 'octagon',
  Field: 'rhomboid',
  CustomField: 'cut-rectangle',
  External: 'star'
};

export function getNodeShape(
  nodeOrType: ExplorerNode | ExplorerNodeType,
  isTestArg?: boolean
): NodeShape {
  if (typeof nodeOrType === 'object' && nodeOrType !== null) {
    const type = nodeOrType.type;
    const isTest = Boolean(nodeOrType.behavior?.isTest);
    if (type === 'ApexClass' && isTest) {
      return APEX_TEST_CLASS_SHAPE;
    }
    return NODE_SHAPE_BY_TYPE[type] || 'ellipse';
  }

  const type = nodeOrType;
  if (type === 'ApexClass' && isTestArg) {
    return APEX_TEST_CLASS_SHAPE;
  }
  return NODE_SHAPE_BY_TYPE[type] || 'ellipse';
}

// Salesforce entity type colors - distinct visual identity
const NODE_COLORS: Record<string, { background: string; border: string }> = {
  ApexClass: { background: '#3b82f6', border: '#1d4ed8' },       // Blue
  ApexTrigger: { background: '#8b5cf6', border: '#6d28d9' },     // Purple
  LWC: { background: '#f59e0b', border: '#d97706' },             // Amber
  Visualforce: { background: '#ec4899', border: '#db2777' },     // Pink
  Flow: { background: '#14b8a6', border: '#0d9488' },            // Teal
  Object: { background: '#22c55e', border: '#16a34a' },          // Green
  CustomObject: { background: '#22c55e', border: '#16a34a' },    // Green (same as Object)
  Field: { background: '#84cc16', border: '#65a30d' },           // Lime
  CustomField: { background: '#84cc16', border: '#65a30d' },     // Lime (same as Field)
  External: { background: '#64748b', border: '#475569' }         // Slate (external deps)
};

// Risk level border colors - for highlighting
const RISK_BORDER_COLORS: Record<string, string> = {
  HIGH: '#dc2626',      // Red-600
  MEDIUM: '#ea580c',   // Orange-600  
  LOW: '#059669'       // Emerald-600
};

// Edge colors for relationship types
const EDGE_COLORS: Record<string, string> = {
  'method-call': '#64748b',
  'instantiation': '#8b5cf6',
  'type-reference': '#3b82f6',
  'extends': '#22c55e',
  'implements': '#14b8a6',
  'SOQL': '#f59e0b',
  'soql-object': '#f59e0b',
  'soql-field': '#eab308',
  'DML': '#ef4444',
  'aura-enabled': '#ec4899',
  'lwc-apic': '#f97316',
  'lwc-template-child': '#f97316',
  'field-reference': '#84cc16',
  'trigger-handler': '#8b5cf6',
  'trigger-object': '#8b5cf6',
  'visualforce-controller': '#ec4899',
  'test-reference': '#22c55e',
  'unknown': '#94a3b8'
};

export interface GraphStyleOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  fontSize?: number;
}

let cachedStyleOptions: GraphStyleOptions | null = null;
let cachedStyles: StylesheetStyle[] | null = null;

function shallowEqualOptions(a: GraphStyleOptions, b: GraphStyleOptions): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.nodeWidth === b.nodeWidth && a.nodeHeight === b.nodeHeight && a.fontSize === b.fontSize;
}

export function getGraphStyles(options: GraphStyleOptions = {}): StylesheetStyle[] {
  if (cachedStyles && cachedStyleOptions && shallowEqualOptions(cachedStyleOptions, options)) {
    return cachedStyles;
  }

  const {
    nodeWidth = 50,
    nodeHeight = 50,
    fontSize = 12
  } = options;

  const styles: StylesheetStyle[] = [
    // Base node style
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'min-zoomed-font-size': 10,
        'background-color': '#3b82f6',
        'color': '#f8fafc',
        'font-size': `${fontSize}px`,
        'font-weight': 'bold',
        'text-valign': 'bottom',
        'text-margin-y': 8,
        'width': nodeWidth,
        'height': nodeHeight,
        'border-width': 2,
        'border-color': '#1e293b',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '120px'
      }
    },
    // Selection highlight
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#3b82f6'
      }
    },
    // High risk indicator - thicker border with red tint
    {
      selector: 'node[risk = "HIGH"]',
      style: {
        'border-width': 4,
        'border-color': RISK_BORDER_COLORS.HIGH
      }
    },
    // Medium risk indicator
    {
      selector: 'node[risk = "MEDIUM"]',
      style: {
        'border-width': 3,
        'border-color': RISK_BORDER_COLORS.MEDIUM
      }
    },
    // Low risk indicator - standard border
    {
      selector: 'node[risk = "LOW"]',
      style: {
        'border-width': 2,
        'border-color': RISK_BORDER_COLORS.LOW
      }
    },
    // Refactoring Simulation Styles
    {
      selector: 'node.simulated-added',
      style: {
        'border-width': 4,
        'border-color': '#38bdf8',
        'border-style': 'dashed',
        'background-color': '#0284c7',
        'opacity': 1,
      }
    },
    {
      selector: 'node.simulated-removed',
      style: {
        'border-width': 4,
        'border-color': '#ef4444',
        'border-style': 'dashed',
        'opacity': 0.45,
      }
    },
    {
      selector: 'node.simulated-affected',
      style: {
        'border-width': 5,
        'border-color': '#f59e0b',
      }
    },
    {
      selector: 'edge.simulated-added',
      style: {
        'width': 4,
        'line-color': '#38bdf8',
        'target-arrow-color': '#38bdf8',
        'line-style': 'dashed',
      }
    },
    {
      selector: 'edge.simulated-removed',
      style: {
        'width': 3,
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        'line-style': 'dashed',
        'opacity': 0.4,
      }
    },
    // Node type-specific base colors and shapes
    {
      selector: 'node[type = "ApexClass"]',
      style: {
        'background-color': NODE_COLORS.ApexClass.background,
        'border-color': NODE_COLORS.ApexClass.border,
        'shape': NODE_SHAPE_BY_TYPE.ApexClass
      }
    },
    {
      selector: 'node[type = "ApexClass"][?isTest]',
      style: {
        'shape': APEX_TEST_CLASS_SHAPE
      }
    },
    {
      selector: 'node[type = "ApexTrigger"]',
      style: {
        'background-color': NODE_COLORS.ApexTrigger.background,
        'border-color': NODE_COLORS.ApexTrigger.border,
        'shape': NODE_SHAPE_BY_TYPE.ApexTrigger
      }
    },
    {
      selector: 'node[type = "LWC"]',
      style: {
        'background-color': NODE_COLORS.LWC.background,
        'border-color': NODE_COLORS.LWC.border,
        'shape': NODE_SHAPE_BY_TYPE.LWC
      }
    },
    {
      selector: 'node[type = "Visualforce"]',
      style: {
        'background-color': NODE_COLORS.Visualforce.background,
        'border-color': NODE_COLORS.Visualforce.border,
        'shape': NODE_SHAPE_BY_TYPE.Visualforce
      }
    },
    {
      selector: 'node[type = "Flow"]',
      style: {
        'background-color': NODE_COLORS.Flow.background,
        'border-color': NODE_COLORS.Flow.border,
        'shape': NODE_SHAPE_BY_TYPE.Flow
      }
    },
    {
      selector: 'node[type = "Object"]',
      style: {
        'background-color': NODE_COLORS.Object.background,
        'border-color': NODE_COLORS.Object.border,
        'shape': NODE_SHAPE_BY_TYPE.Object
      }
    },
    {
      selector: 'node[type = "CustomObject"]',
      style: {
        'background-color': NODE_COLORS.CustomObject.background,
        'border-color': NODE_COLORS.CustomObject.border,
        'shape': NODE_SHAPE_BY_TYPE.CustomObject
      }
    },
    {
      selector: 'node[type = "Field"]',
      style: {
        'background-color': NODE_COLORS.Field.background,
        'border-color': NODE_COLORS.Field.border,
        'shape': NODE_SHAPE_BY_TYPE.Field
      }
    },
    {
      selector: 'node[type = "CustomField"]',
      style: {
        'background-color': NODE_COLORS.CustomField.background,
        'border-color': NODE_COLORS.CustomField.border,
        'shape': NODE_SHAPE_BY_TYPE.CustomField
      }
    },
    {
      selector: 'node[type = "External"]',
      style: {
        'background-color': NODE_COLORS.External.background,
        'border-color': NODE_COLORS.External.border,
        'shape': NODE_SHAPE_BY_TYPE.External
      }
    },
    // Test classes
    {
      selector: 'node[isTest = "true"]',
      style: {
        'border-style': 'dashed'
      }
    },
    // Cycle indicator
    {
      selector: 'node[hasCycles = "true"]',
      style: {
        'border-color': '#f59e0b'
      }
    },
    // Unresolved reference indicator
    {
      selector: 'node[hasUnresolved = "true"]',
      style: {
        'border-color': '#f97316'
      }
    },
    // Base edge style
    {
      selector: 'edge',
      style: {
        'width': 2,
        'min-zoomed-font-size': 8,
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'font-size': '10px',
        'color': '#64748b'
      }
    },
    // Unresolved edges - dashed and orange
    {
      selector: 'edge[unresolved = "true"]',
      style: {
        'line-style': 'dashed',
        'line-color': '#f97316',
        'target-arrow-color': '#f97316'
      }
    },
    // Edge selection highlight
    {
      selector: 'edge:selected',
      style: {
        'width': 4,
        'line-color': '#3b82f6',
        'target-arrow-color': '#3b82f6'
      }
    },
    // Impact mode styles
    {
      selector: 'node.impact-origin',
      style: {
        'border-width': 6,
        'border-color': '#f59e0b',
        'border-style': 'solid',
        'opacity': 1
      }
    },
    {
      selector: 'node.impact-affected',
      style: {
        'border-width': 4,
        'border-color': '#ef4444',
        'border-style': 'solid',
        'opacity': 1
      }
    },
    {
      selector: 'node.impact-muted',
      style: {
        'opacity': 0.25
      }
    },
    {
      selector: 'edge.impact-affected',
      style: {
        'width': 4,
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        'opacity': 1
      }
    },
    {
      selector: 'edge.impact-muted',
      style: {
        'opacity': 0.15
      }
    },
    // Dimmed state
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.15
      }
    },
    // Highlighted state
    {
      selector: 'node.highlighted',
      style: {
        'opacity': 1,
        'border-width': 4,
        'border-color': '#f59e0b'
      }
    },
    {
      selector: 'edge.highlighted',
      style: {
        'opacity': 1,
        'width': 3,
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b'
      }
    },
    // Semantic zoom rules:
    {
      selector: '.zoom-far',
      style: {
        'label': ''
      }
    },
    {
      selector: 'node.zoom-far',
      style: {
        'label': ''
      }
    },
    // FAR ZOOM — mute all edges; keep inter-feature edges lightly visible for orientation
    {
      selector: 'edge.zoom-far',
      style: {
        'label': '',
        'opacity': 0.18,
        'width': 1,
      }
    },
    {
      selector: 'edge[isInterFeature = "true"].zoom-far',
      style: {
        'opacity': 0.55,
        'width': 1.8,
      }
    },
    {
      selector: 'node.zoom-mid',
      style: {
        'label': 'data(label)'
      }
    },
    // MID ZOOM — moderate edge visibility; inter-feature edges stay prominent
    {
      selector: 'edge.zoom-mid',
      style: {
        'label': '',
        'opacity': 0.45,
      }
    },
    {
      selector: 'edge[isInterFeature = "true"].zoom-mid',
      style: {
        'opacity': 0.85,
      }
    },
    {
      selector: 'node.zoom-near',
      style: {
        'label': 'data(label)'
      }
    },
    // NEAR ZOOM — full visibility, show relationship type label
    {
      selector: 'edge.zoom-near',
      style: {
        'label': 'data(relationshipType)',
      }
    },
    // Intra-feature edges: thinner and muted — local dependency, low visual noise
    {
      selector: 'edge[isInterFeature = "false"]',
      style: {
        'width': 1.5,
        'opacity': 0.6,
      }
    },
    // Inter-feature edges: dashed and prominent — cross-feature architectural boundary
    {
      selector: 'edge[isInterFeature = "true"]',
      style: {
        'width': 2.5,
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
        'opacity': 0.9,
      }
    }
  ];

  for (const [relType, color] of Object.entries(EDGE_COLORS)) {
    if (relType !== 'unknown') {
      styles.push({
        selector: `edge[relationshipType = "${relType}"]`,
        style: {
          'line-color': color,
          'target-arrow-color': color
        }
      });
    }
  }

  cachedStyleOptions = options;
  cachedStyles = styles;
  return styles;
}

export { NODE_COLORS, RISK_BORDER_COLORS, EDGE_COLORS };
