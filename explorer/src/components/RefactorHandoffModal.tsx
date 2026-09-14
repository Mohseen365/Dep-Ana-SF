import React, { useState } from 'react';
import { HandoffTarget, openHandoff, buildHandoffPayload } from '../lib/refactor-handoff';
import type { ExplorerNode } from '../types/explorer';

export interface RefactorHandoffModalProps {
  target: HandoffTarget | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RefactorHandoffModal: React.FC<RefactorHandoffModalProps> = ({
  target,
  onConfirm,
  onCancel,
}) => {
  if (!target) return null;

  return (
    <div
      className="refactor-confirm-modal-overlay"
      data-testid="refactor-confirm-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        className="refactor-confirm-modal"
        data-testid="refactor-confirm-modal"
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #38bdf8',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          color: '#f8fafc',
        }}
      >
        <h3 style={{ marginTop: 0, color: '#38bdf8' }}>Confirm Refactor Handoff</h3>
        <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
          You are initiating refactoring handoff for target component:
        </p>
        <div
          style={{
            backgroundColor: '#0f172a',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '0.85rem',
            marginBottom: '12px',
          }}
        >
          <div>
            <strong>Canonical Target ID:</strong> {target.nodeId}
          </div>
          <div>
            <strong>Component Name:</strong> {target.displayName}
          </div>
          <div>
            <strong>Component Type:</strong> {target.type}
          </div>
          <div>
            <strong>Source File:</strong> {target.file || 'N/A'}
          </div>
        </div>
        <p
          style={{
            fontSize: '0.8rem',
            color: '#94a3b8',
            fontStyle: 'italic',
            marginBottom: '12px',
          }}
        >
          🔒 Note: Selecting this action does NOT modify source code directly. A refactor job will
          only execute after explicit confirmation.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Standalone CLI Command:</span>
          <pre
            style={{
              backgroundColor: '#0f172a',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              overflowX: 'auto',
              margin: '4px 0 0 0',
            }}
          >
            <code>node refactor-litellm/orchestrator.js --component {target.displayName}</code>
          </pre>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            className="cancel-btn"
            style={{
              padding: '8px 14px',
              borderRadius: '4px',
              border: '1px solid #64748b',
              background: 'transparent',
              color: '#cbd5e1',
              cursor: 'pointer',
            }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="confirm-handoff-btn"
            style={{
              padding: '8px 14px',
              borderRadius: '4px',
              border: 'none',
              background: '#38bdf8',
              color: '#0f172a',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
            onClick={onConfirm}
          >
            Confirm & Send to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export interface RefactorHandoffHarnessProps {
  node: ExplorerNode | null;
  edge?: any;
  impactSummary?: any;
  onClose?: () => void;
}

export const RefactorHandoffHarness: React.FC<RefactorHandoffHarnessProps> = ({ node }) => {
  const [target, setTarget] = useState<HandoffTarget | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [handoffSuccess, setHandoffSuccess] = useState<string | null>(null);

  const handleInitiate = () => {
    if (!node || !node.id || !node.id.trim()) {
      setHandoffError('Invalid or stale target component selection.');
      return;
    }
    setHandoffError(null);
    setTarget(buildHandoffPayload(node));
  };

  const handleConfirm = () => {
    if (!target) return;
    openHandoff(target);
    const inIframe = typeof window !== 'undefined' && window.parent && window.parent !== window;
    if (inIframe) {
      setHandoffSuccess(`Dispatched postMessage handoff payload for ${target.displayName}.`);
    } else {
      setHandoffSuccess(`Standalone handoff confirmed for ${target.displayName}. Use CLI command to execute.`);
    }
    setTarget(null);
  };

  return (
    <div>
      <button onClick={handleInitiate}>⚡ Refactor in LiteLLM</button>
      {handoffError && <p className="handoff-error">{handoffError}</p>}
      {handoffSuccess && <p className="handoff-success">{handoffSuccess}</p>}
      <RefactorHandoffModal
        target={target}
        onConfirm={handleConfirm}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
};
