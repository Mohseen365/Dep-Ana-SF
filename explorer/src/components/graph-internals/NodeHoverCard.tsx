import React from 'react';
import { ExplorerNode } from '../../types/explorer';
import type { ArchitectureFinding } from '../../lib/intelligence';

export interface NodeHoverCardProps {
  node: ExplorerNode;
  x: number;
  y: number;
  findings?: ArchitectureFinding[];
}

export const NodeHoverCard: React.FC<NodeHoverCardProps> = ({ node, x, y, findings }) => {
  const fanIn = node.metrics?.fanIn ?? 0;
  const fanOut = node.metrics?.fanOut ?? 0;

  const nodeFindings = (findings || []).filter(
    (f) => f.nodeIds && f.nodeIds.includes(node.id)
  );

  // Clamp positioning to keep within screen viewport
  const left = Math.min(x + 12, window.innerWidth - 260);
  const top = Math.min(y + 12, window.innerHeight - 160);

  return (
    <div
      className="graph-hover-card node-hover-card"
      style={{ left: `${left}px`, top: `${top}px` }}
      role="tooltip"
    >
      <div className="hover-card-header">
        <span className="hover-card-title">{node.displayName}</span>
        <span className={`hover-card-badge risk-${(node.risk || 'LOW').toLowerCase()}`}>
          {node.risk || 'LOW'}
        </span>
      </div>
      <div className="hover-card-detail">
        <span className="label">Type:</span> <span className="value">{node.type}</span>
      </div>
      <div className="hover-card-detail">
        <span className="label">Fan-In:</span> <span className="value">{fanIn}</span>
        <span className="divider">|</span>
        <span className="label">Fan-Out:</span> <span className="value">{fanOut}</span>
      </div>
      {node.file && (
        <div className="hover-card-detail file-path" title={node.file}>
          {node.file}
        </div>
      )}
      {nodeFindings.length > 0 && (
        <div className="hover-card-detail findings-summary" style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px', color: '#f87171' }}>
          <span className="label">Findings:</span> <span className="value" style={{ fontWeight: 700 }}>⚠️ {nodeFindings.length} issue{nodeFindings.length > 1 ? 's' : ''} ({nodeFindings[0].severity})</span>
        </div>
      )}
    </div>
  );
};

export default NodeHoverCard;