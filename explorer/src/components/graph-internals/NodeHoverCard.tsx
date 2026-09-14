import React from 'react';
import { ExplorerNode } from '../../types/explorer';

export interface NodeHoverCardProps {
  node: ExplorerNode;
  x: number;
  y: number;
}

export const NodeHoverCard: React.FC<NodeHoverCardProps> = ({ node, x, y }) => {
  const fanIn = node.metrics?.fanIn ?? 0;
  const fanOut = node.metrics?.fanOut ?? 0;

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
    </div>
  );
};

export default NodeHoverCard;