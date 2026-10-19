import React from 'react';
import { ExplorerEdge } from '../../types/explorer';
import { useViewportSize } from '../../hooks/useViewportSize';

export interface EdgeHoverCardProps {
  edge: ExplorerEdge;
  x: number;
  y: number;
}

export const EdgeHoverCard: React.FC<EdgeHoverCardProps> = React.memo(function EdgeHoverCard({ edge, x, y }) {
  const [copied, setCopied] = React.useState(false);
  const viewport = useViewportSize();

  const left = Math.min(x + 12, viewport.width - 280);
  const top = Math.min(y + 12, viewport.height - 180);

  const line = edge.line;
  const file = edge.file || '';
  const locationStr = file ? (line ? `${file}:${line}` : file) : null;
  const fileWithLine = locationStr || 'N/A';
  const vscodeUrl = file
    ? `vscode://file/${encodeURIComponent(file).replace(/%2F/gi, '/')}:${line ?? 1}`
    : null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!locationStr) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(locationStr).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <div
      className="graph-hover-card edge-hover-card"
      style={{ left: `${left}px`, top: `${top}px` }}
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
      <div className="hover-card-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <span className="label">Location:</span> <span className="value">{fileWithLine}</span>
        </div>
        {locationStr && (
          <button
            type="button"
            className="hover-card-copy-btn"
            aria-label="Copy source location"
            onClick={handleCopy}
            title="Copy source location"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '12px', color: '#38bdf8' }}
          >
            {copied ? '✓' : '📋'}
          </button>
        )}
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