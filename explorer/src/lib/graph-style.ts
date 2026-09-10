import type { StylesheetStyle } from 'cytoscape';

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

export function getGraphStyles(options: GraphStyleOptions = {}): StylesheetStyle[] {
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
    // Node type-specific base colors (overridden by risk for explicit nodes)
    {
      selector: 'node[type = "ApexClass"]',
      style: {
        'background-color': NODE_COLORS.ApexClass.background,
        'border-color': NODE_COLORS.ApexClass.border
      }
    },
    {
      selector: 'node[type = "ApexTrigger"]',
      style: {
        'background-color': NODE_COLORS.ApexTrigger.background,
        'border-color': NODE_COLORS.ApexTrigger.border
      }
    },
    {
      selector: 'node[type = "LWC"]',
      style: {
        'background-color': NODE_COLORS.LWC.background,
        'border-color': NODE_COLORS.LWC.border
      }
    },
    {
      selector: 'node[type = "Visualforce"]',
      style: {
        'background-color': NODE_COLORS.Visualforce.background,
        'border-color': NODE_COLORS.Visualforce.border
      }
    },
    {
      selector: 'node[type = "Flow"]',
      style: {
        'background-color': NODE_COLORS.Flow.background,
        'border-color': NODE_COLORS.Flow.border
      }
    },
    {
      selector: 'node[type = "Object"]',
      style: {
        'background-color': NODE_COLORS.Object.background,
        'border-color': NODE_COLORS.Object.border
      }
    },
    {
      selector: 'node[type = "CustomObject"]',
      style: {
        'background-color': NODE_COLORS.CustomObject.background,
        'border-color': NODE_COLORS.CustomObject.border
      }
    },
    {
      selector: 'node[type = "Field"]',
      style: {
        'background-color': NODE_COLORS.Field.background,
        'border-color': NODE_COLORS.Field.border
      }
    },
    {
      selector: 'node[type = "CustomField"]',
      style: {
        'background-color': NODE_COLORS.CustomField.background,
        'border-color': NODE_COLORS.CustomField.border
      }
    },
    {
      selector: 'node[type = "External"]',
      style: {
        'background-color': NODE_COLORS.External.background,
        'border-color': NODE_COLORS.External.border
      }
    },
    // Test classes - slightly different shape indicator via style
    {
      selector: 'node[isTest = "true"]',
      style: {
        'border-style': 'dashed'
      }
    },
    // Cycle indicator - pulsing effect simulation via color
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
    // Dimmed state for non-participating elements during cycle or focus highlight
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.15
      }
    },
    // Highlighted state for active cycle elements
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
    }
  ];

  // Add relationship type-specific edge colors
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

  return styles;
}

export { NODE_COLORS, RISK_BORDER_COLORS, EDGE_COLORS };