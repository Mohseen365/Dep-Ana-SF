import React from 'react';
import { ExplorerNode, ExplorerNodeType } from '../types/explorer';
import { NODE_COLORS, getNodeShape } from '../lib/graph-style';

interface GraphLegendProps {
  nodes: ExplorerNode[];
}

interface LegendEntry {
  key: string;
  label: string;
  type: ExplorerNodeType;
  isTest?: boolean;
}

const SHAPE_GLYPHS: Record<string, string> = {
  ellipse: '●',
  triangle: '▲',
  rectangle: '■',
  'round-rectangle': '▢',
  'bottom-round-rectangle': '⬎',
  hexagon: '⬡',
  diamond: '◆',
  octagon: '⬟',
  rhomboid: '▰',
  'cut-rectangle': '▅',
  star: '★'
};

export const GraphLegend: React.FC<GraphLegendProps> = ({ nodes }) => {
  // Compute legend entries based on nodes present
  const legendEntries: LegendEntry[] = [];
  const typesPresent = Array.from(new Set<ExplorerNodeType>(nodes.map((n) => n.type)));

  typesPresent.forEach((type) => {
    if (type === 'ApexClass') {
      const hasNormalApexClass = nodes.some((n) => n.type === 'ApexClass' && !n.behavior?.isTest);
      const hasApexTestClass = nodes.some((n) => n.type === 'ApexClass' && n.behavior?.isTest);

      if (hasNormalApexClass || (!hasApexTestClass && nodes.some((n) => n.type === 'ApexClass'))) {
        legendEntries.push({
          key: 'ApexClass',
          label: 'Apex Class',
          type: 'ApexClass',
          isTest: false
        });
      }

      if (hasApexTestClass) {
        legendEntries.push({
          key: 'ApexTestClass',
          label: 'Apex Test Class',
          type: 'ApexClass',
          isTest: true
        });
      }
    } else {
      legendEntries.push({
        key: type,
        label: type,
        type: type,
        isTest: false
      });
    }
  });

  const getTypeColor = (type: string) => {
    return NODE_COLORS[type]?.background || '#64748b';
  };

  const getEntryShapeGlyph = (entry: LegendEntry) => {
    const shape = getNodeShape(entry.type, entry.isTest);
    return SHAPE_GLYPHS[shape] || '●';
  };

  if (legendEntries.length === 0) return null;

  return (
    <div className="graph-legend-floating" data-testid="graph-legend">
      <div className="legend-title">Legend</div>
      <div className="legend-section">
        <div className="legend-subtitle">Node Types</div>
        <div className="legend-items">
          {legendEntries.map((entry) => (
            <div key={entry.key} className="legend-item" data-testid={`legend-item-${entry.key}`}>
              <span
                className="legend-shape-icon"
                style={{ color: getTypeColor(entry.type), fontSize: '12px', width: '14px', textAlign: 'center', display: 'inline-block' }}
              >
                {getEntryShapeGlyph(entry)}
              </span>
              <span>{entry.label}</span>
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
