import React from 'react';
import { ExplorerEdge } from '../../types/explorer';

export interface EdgeHoverCardProps {
  edge: ExplorerEdge;
  x: number;
  y: number;
}

export const EdgeHoverCard: React.FC<EdgeHoverCardProps> = React.memo(function EdgeHoverCard({ edge, x, y }) {
  const left = Math.min(x + 12, window.innerWidth - 280);
  const top = Math.min(y + 12, window.innerHeight - 180);

  const line = edge.line ?? 1;
  const file = edge.file || '';
  const fileWithLine = file ? `${file}:${line}` : 'N/A';
  const vscodeUrl = file ? `vscode://file/${file}:${line}` : null;

  return (
    <div
      className="graph-hover-card edge-hover-card"
      style={{ left: `${left}px`, top: `${top}px` }}
      role="tooltip"
    >
      <div className="hover-card-header">
        <span className="hover-card-title">{edge.method || edge.relationshipType}</span>
        <span className="hover-card-badge rel-type">{edge.relationshipType}</span>
      </div>
      {edge.evidence && (
        <div className="hover-card-detail">
          <span className="label">Evidence:</span> <span className="value">{edge.evidence}</span>
        </div>
      )}
      <div className="hover-card-detail">
        <span className="label">Location:</span> <span className="value">{fileWithLine}</span>
      </div>
      {vscodeUrl && (
        <div className="hover-card-action">
          <a
            href={vscodeUrl}
            className="hover-card-link"
            target="_blank"
            rel="noreferrer"
          >
            Open in editor ↗
          </a>
        </div>
      )}
    </div>
  );
});

export default EdgeHoverCard;