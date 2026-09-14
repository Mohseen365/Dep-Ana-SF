import React from 'react';
import { ExplorerNode } from '../types/explorer';

interface GraphLegendProps {
  nodes: ExplorerNode[];
}

export const GraphLegend: React.FC<GraphLegendProps> = ({ nodes }) => {
  // Compute unique node types present in graph data
  const typesPresent = Array.from(new Set<string>(nodes.map((n) => n.type)));

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ApexClass':
        return '#3b82f6';
      case 'ApexTrigger':
        return '#ef4444';
      case 'LWC':
      case 'LwcJs':
      case 'LwcHtml':
        return '#10b981';
      case 'Flow':
        return '#8b5cf6';
      case 'CustomObject':
      case 'Object':
        return '#f59e0b';
      case 'Visualforce':
        return '#ec4899';
      case 'Field':
      case 'CustomField':
        return '#06b6d4';
      default:
        return '#64748b';
    }
  };

  if (typesPresent.length === 0) return null;

  return (
    <div className="graph-legend-floating" data-testid="graph-legend">
      <div className="legend-title">Legend</div>
      <div className="legend-section">
        <div className="legend-subtitle">Node Types</div>
        <div className="legend-items">
          {typesPresent.map((type) => (
            <div key={type} className="legend-item" data-testid={`legend-item-${type}`}>
              <span
                className="legend-color-dot"
                style={{ backgroundColor: getTypeColor(type) }}
              />
              <span>{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="legend-section">
        <div className="legend-subtitle">Relationships</div>
        <div className="legend-items">
          <div className="legend-item">
            <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>➔</span>
            <span>Resolved Edge</span>
          </div>
          <div className="legend-item">
            <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>⚡</span>
            <span>Unresolved Reference</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphLegend;
