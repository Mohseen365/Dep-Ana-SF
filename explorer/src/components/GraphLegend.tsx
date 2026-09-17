import React from 'react';
import { ExplorerNode, ExplorerNodeType } from '../types/explorer';
import { NODE_COLORS, NODE_SHAPE_BY_TYPE } from '../lib/graph-style';

interface GraphLegendProps {
  nodes: ExplorerNode[];
}

const SHAPE_GLYPHS: Record<string, string> = {
  ellipse: '●',
  triangle: '▲',
  rectangle: '■',
  'round-rectangle': '▢',
  hexagon: '⬡',
  diamond: '◆',
  octagon: '⬟',
  rhomboid: '▰',
  'cut-rectangle': '▅',
  star: '★'
};

export const GraphLegend: React.FC<GraphLegendProps> = ({ nodes }) => {
  // Compute unique node types present in graph data
  const typesPresent = Array.from(new Set<ExplorerNodeType>(nodes.map((n) => n.type)));

  const getTypeColor = (type: string) => {
    return NODE_COLORS[type]?.background || '#64748b';
  };

  const getTypeShapeGlyph = (type: ExplorerNodeType) => {
    const shape = NODE_SHAPE_BY_TYPE[type] || 'ellipse';
    return SHAPE_GLYPHS[shape] || '●';
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
                className="legend-shape-icon"
                style={{ color: getTypeColor(type), fontSize: '12px', width: '14px', textAlign: 'center', display: 'inline-block' }}
              >
                {getTypeShapeGlyph(type)}
              </span>
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
