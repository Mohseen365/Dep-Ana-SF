import React from 'react';
import { ExplorerNode, ExplorerEdge, ExplorerComponentImpactSummary } from '../types/explorer';

interface DetailsPanelProps {
  node: ExplorerNode | null;
  edge: ExplorerEdge | null;
  impactSummary: ExplorerComponentImpactSummary | null;
  onClose: () => void;
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({
  node,
  edge,
  impactSummary,
  onClose
}) => {
  // Show edge details if an edge is selected
  if (edge) {
    return (
      <div className="details-panel">
        <div className="details-header">
          <div>
            <span className="badge edge-badge">
              {edge.relationshipType.toUpperCase().replace('-', ' ')}
            </span>
            <h2>Relationship Evidence</h2>
            <span className="node-type-label">Edge Details</span>
          </div>
          <button className="close-btn" onClick={onClose} title="Close details">
            ×
          </button>
        </div>

        <div className="details-content">
          <div className="details-section">
            <h4>Connection</h4>
            <div className="evidence-flow">
              <div className="evidence-endpoint">
                <span className="evidence-label">Source</span>
                <span className="evidence-value">{edge.source}</span>
                {edge.methodOwner && (
                  <span className="evidence-detail">via {edge.methodOwner}()</span>
                )}
              </div>
              <span className="evidence-arrow">→</span>
              <div className="evidence-endpoint">
                <span className="evidence-label">Target</span>
                <span className="evidence-value">{edge.target}</span>
                {edge.method && (
                  <span className="evidence-detail">calls {edge.method}()</span>
                )}
              </div>
            </div>
          </div>

          <div className="details-section">
            <h4>Evidence</h4>
            <div className="evidence-code">
              {edge.evidence ? (
                <code>{edge.evidence}</code>
              ) : (
                <span className="evidence-missing">No evidence available</span>
              )}
            </div>
            {edge.file && (
              <p className="evidence-location">
                {edge.file}:{edge.line || '?'}
              </p>
            )}
          </div>

          <div className="details-section">
            <h4>Resolution Details</h4>
            <div className="resolution-grid">
              <div className="resolution-item">
                <span className="resolution-label">Status</span>
                <span className={`resolution-value ${edge.unresolved ? 'unresolved' : 'resolved'}`}>
                  {edge.unresolved ? '⚠️ Unresolved' : '✓ Resolved'}
                </span>
              </div>
              <div className="resolution-item">
                <span className="resolution-label">Classification</span>
                <span className="resolution-value">{edge.resolutionClassification}</span>
              </div>
              <div className="resolution-item">
                <span className="resolution-label">Strategy</span>
                <span className="resolution-value">{edge.resolutionStrategy}</span>
              </div>
              <div className="resolution-item">
                <span className="resolution-label">Confidence</span>
                <span className={`resolution-value confidence-${edge.confidence}`}>
                  {edge.confidence.charAt(0).toUpperCase() + edge.confidence.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {edge.unresolved && (
            <div className="details-section">
              <h4>Unresolved Reference</h4>
              <div className="unresolved-box">
                <p>The analyzer could not resolve this reference. This may indicate:</p>
                <ul>
                  <li>Missing dependency in the source code</li>
                  <li>External dependency not in the analyzed scope</li>
                  <li>Typo or removed reference</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show node details if a node is selected
  if (!node) {
    return (
      <div className="details-panel details-empty">
        <div className="details-placeholder">
          <span className="placeholder-icon">🔍</span>
          <h3>No Component Selected</h3>
          <p>Click on any node or edge in the architecture graph to view detailed information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="details-panel">
      <div className="details-header">
        <div>
          <span className={`badge risk-badge risk-${node.risk.toLowerCase()}`}>
            {node.risk} RISK
          </span>
          <h2>{node.displayName}</h2>
          <span className="node-type-label">{node.type}</span>
        </div>
        <button className="close-btn" onClick={onClose} title="Close details">
          ×
        </button>
      </div>

      <div className="details-content">
        <div className="details-section">
          <h4>Source File</h4>
          <p className="file-path">{node.file || 'N/A'}</p>
        </div>

        <div className="details-section">
          <h4>Coupling Metrics</h4>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-title">Fan-In</span>
              <span className="metric-num">{node.metrics.fanIn}</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Fan-Out</span>
              <span className="metric-num">{node.metrics.fanOut}</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Coupling</span>
              <span className="metric-num">{node.metrics.coupling}</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Unresolved</span>
              <span className="metric-num">{node.metrics.unresolved}</span>
            </div>
          </div>
        </div>

        <div className="details-section">
          <h4>Risk</h4>
          <p className={`risk-level-value risk-${node.risk.toLowerCase()}`}>{node.risk}</p>
          <h4>Reasons</h4>
          {node.riskReasons && node.riskReasons.length > 0 ? (
            <ul className="risk-reasons-list">
              {node.riskReasons.map((reason, idx) => (
                <li key={idx}>• {reason}</li>
              ))}
            </ul>
          ) : (
            <p className="risk-reasons-empty">No additional risk reasons provided by analyzer.</p>
          )}
        </div>

        <div className="details-section">
          <h4>Component Capabilities</h4>
          <div className="behavior-grid">
            <div>
              <span className="label">Is Test Class:</span>{' '}
              <span className="value">{node.behavior.isTest ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="label">Sharing:</span>{' '}
              <span className="value">{node.behavior.sharing || 'None'}</span>
            </div>
            <div>
              <span className="label">Public Contracts:</span>{' '}
              <span className="value">{node.behavior.publicContractsCount}</span>
            </div>
            <div>
              <span className="label">SOQL Queries:</span>{' '}
              <span className="value">{node.behavior.queryCount}</span>
            </div>
            <div>
              <span className="label">DML Operations:</span>{' '}
              <span className="value">{node.behavior.dmlCount}</span>
            </div>
            <div>
              <span className="label">Callouts:</span>{' '}
              <span className="value">{node.behavior.calloutCount}</span>
            </div>
          </div>
        </div>

        {impactSummary && (
          <div className="details-section">
            <h4>Refactoring Impact Summary</h4>
            <div className="impact-box">
              <p>
                <strong>Total Impacted Components:</strong>{' '}
                {impactSummary.totalImpactCount}
              </p>
              <p>
                <strong>Direct Dependencies:</strong>{' '}
                {impactSummary.directDependencies.length > 0
                  ? impactSummary.directDependencies.join(', ')
                  : 'None'}
              </p>
              <p>
                <strong>Direct Dependents:</strong>{' '}
                {impactSummary.directDependents.length > 0
                  ? impactSummary.directDependents.join(', ')
                  : 'None'}
              </p>
              <p>
                <strong>Impacted Test Classes:</strong>{' '}
                {impactSummary.impactedTests.length > 0
                  ? impactSummary.impactedTests.join(', ')
                  : 'None'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};