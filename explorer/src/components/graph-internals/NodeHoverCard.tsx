import React from 'react';
import { ExplorerNode } from '../../types/explorer';
import type { ArchitectureFinding } from '../../lib/intelligence';
import { useViewportSize } from '../../hooks/useViewportSize';

export interface NodeHoverCardProps {
  node: ExplorerNode;
  x: number;
  y: number;
  findings?: ArchitectureFinding[];
}

export const NodeHoverCard: React.FC<NodeHoverCardProps> = React.memo(function NodeHoverCard({ node, x, y, findings }) {
  const fanIn = node.metrics?.fanIn ?? 0;
  const fanOut = node.metrics?.fanOut ?? 0;

  const nodeFindings = (findings || []).filter(
    (f) => f.nodeIds && f.nodeIds.includes(node.id)
  );

  const [copied, setCopied] = React.useState(false);
  const viewport = useViewportSize();

  // Clamp positioning to keep within screen viewport
  const left = Math.min(x + 12, viewport.width - 260);
  const top = Math.min(y + 12, viewport.height - 160);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!node.file) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(node.file).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

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
        <div className="hover-card-detail file-path" title={node.file} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.file}</span>
          <button
            type="button"
            className="hover-card-copy-btn"
            aria-label="Copy file path"
            onClick={handleCopy}
            title="Copy file path"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '12px', color: '#38bdf8' }}
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
      )}
      {nodeFindings.length > 0 && (
        <div className="hover-card-detail findings-summary" style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px', color: '#f87171' }}>
          <span className="label">Findings:</span> <span className="value" style={{ fontWeight: 700 }}>⚠️ {nodeFindings.length} issue{nodeFindings.length > 1 ? 's' : ''} ({nodeFindings[0].severity})</span>
        </div>
      )}
    </div>
  );
});

export default NodeHoverCard;