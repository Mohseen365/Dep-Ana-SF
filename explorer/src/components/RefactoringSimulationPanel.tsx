import React, { useState } from 'react';
import type { RefactoringProposal, StepImpact } from '../lib/refactoring-simulation';

interface RefactoringSimulationPanelProps {
  proposal: RefactoringProposal;
  currentStepIndex: number;
  stepImpact: StepImpact;
  onStepChange: (index: number) => void;
  onCancel: () => void;
  onCommit: () => void;
}

export const RefactoringSimulationPanel: React.FC<RefactoringSimulationPanelProps> = ({
  proposal,
  currentStepIndex,
  stepImpact,
  onStepChange,
  onCancel,
  onCommit,
}) => {
  const [activeTab, setActiveTab] = useState<'impact' | 'operations' | 'findings'>('impact');
  const [commitError, setCommitError] = useState<string | null>(null);

  const totalSteps = proposal.steps.length;
  const currentStep = proposal.steps[currentStepIndex];

  if (!currentStep) return null;

  return (
    <div
      className="refactoring-simulation-panel"
      data-testid="refactoring-simulation-panel"
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        width: '380px',
        maxHeight: 'calc(100vh - 32px)',
        backgroundColor: '#0f172a',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        color: '#f8fafc',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(59, 130, 246, 0.3)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Simulation Header Banner */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#38bdf8',
                boxShadow: '0 0 8px #38bdf8',
              }}
            />
            SIMULATION MODE — STEP {currentStepIndex + 1} OF {totalSteps}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>
            {proposal.title}
          </div>
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '2px 6px',
          }}
          title="Exit simulation"
        >
          &times;
        </button>
      </div>

      {/* Step Navigation Controls */}
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <button
          onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
          disabled={currentStepIndex === 0}
          style={{
            padding: '6px 12px',
            backgroundColor: currentStepIndex === 0 ? '#1e293b' : '#334155',
            color: currentStepIndex === 0 ? '#64748b' : '#f8fafc',
            border: 'none',
            borderRadius: '4px',
            cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          &larr; Previous Step
        </button>

        <select
          value={currentStepIndex}
          onChange={e => onStepChange(Number(e.target.value))}
          style={{
            flex: 1,
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '4px',
            padding: '6px 8px',
            fontSize: '12px',
            outline: 'none',
          }}
        >
          {proposal.steps.map((step, idx) => (
            <option key={step.id} value={idx}>
              Step {idx + 1}: {step.title}
            </option>
          ))}
        </select>

        <button
          onClick={() => onStepChange(Math.min(totalSteps - 1, currentStepIndex + 1))}
          disabled={currentStepIndex === totalSteps - 1}
          style={{
            padding: '6px 12px',
            backgroundColor: currentStepIndex === totalSteps - 1 ? '#1e293b' : '#334155',
            color: currentStepIndex === totalSteps - 1 ? '#64748b' : '#f8fafc',
            border: 'none',
            borderRadius: '4px',
            cursor: currentStepIndex === totalSteps - 1 ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          Next Step &rarr;
        </button>
      </div>

      {/* Tabs Header */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0f172a',
        }}
      >
        <button
          onClick={() => setActiveTab('impact')}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'impact' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'impact' ? '#38bdf8' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Impact Overview
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'operations' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'operations' ? '#38bdf8' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Operations ({currentStep.operations.length})
        </button>
        <button
          onClick={() => setActiveTab('findings')}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'findings' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'findings' ? '#38bdf8' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Finding Delta ({stepImpact.findingDelta.resolved.length + stepImpact.findingDelta.introduced.length})
        </button>
      </div>

      {/* Content Area */}
      <div style={{ padding: '16px', overflowY: 'auto', flex: 1, maxHeight: '320px' }}>
        {activeTab === 'impact' && (
          <div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '12px', lineHeight: 1.4 }}>
              <strong>STEP {currentStepIndex + 1} DESCRIPTION</strong>
              <div style={{ color: '#94a3b8', marginTop: '4px' }}>{currentStep.description}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #22c55e' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>RESOLVED FINDINGS</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>
                  {stepImpact.findingDelta.resolved.length}
                </div>
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>INTRODUCED FINDINGS</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>
                  {stepImpact.findingDelta.introduced.length}
                </div>
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>AFFECTED NODES</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                  {stepImpact.affectedNodeIds.length}
                </div>
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>AFFECTED EDGES</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                  {stepImpact.affectedEdgeIds.length}
                </div>
              </div>
            </div>

            {stepImpact.affectedComponentNames.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>
                  AFFECTED COMPONENTS ({stepImpact.affectedComponentNames.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {stepImpact.affectedComponentNames.map(name => (
                    <span
                      key={name}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        backgroundColor: '#1e293b',
                        color: '#38bdf8',
                        borderRadius: '12px',
                        border: '1px solid #334155',
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'operations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentStep.operations.map((op, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#1e293b',
                  borderRadius: '6px',
                  fontSize: '12px',
                  borderLeft:
                    op.type === 'add-node' || op.type === 'add-edge'
                      ? '3px solid #3b82f6'
                      : op.type === 'remove-node' || op.type === 'remove-edge'
                      ? '3px solid #ef4444'
                      : '3px solid #eab308',
                }}
              >
                <div style={{ fontWeight: 600, color: '#f8fafc', textTransform: 'uppercase', fontSize: '10px' }}>
                  {op.type}
                </div>
                <div style={{ color: '#cbd5e1', marginTop: '2px' }}>
                  {op.type === 'add-node' && `Add node: ${op.node.displayName || op.node.id}`}
                  {op.type === 'remove-node' && `Remove node: ${op.nodeId}`}
                  {op.type === 'add-edge' && `Add edge: ${op.edge.source} \u2192 ${op.edge.target}`}
                  {op.type === 'remove-edge' && `Remove edge: ${op.edgeId}`}
                  {op.type === 'modify-node' && `Modify node: ${op.nodeId}`}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'findings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stepImpact.findingDelta.resolved.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700, marginBottom: '6px' }}>
                  RESOLVED IN SIMULATION ({stepImpact.findingDelta.resolved.length})
                </div>
                {stepImpact.findingDelta.resolved.map(f => (
                  <div
                    key={f.id}
                    style={{
                      padding: '8px',
                      backgroundColor: '#14532d20',
                      border: '1px solid #22c55e40',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginBottom: '4px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#4ade80' }}>{f.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>{f.description}</div>
                  </div>
                ))}
              </div>
            )}

            {stepImpact.findingDelta.introduced.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, marginBottom: '6px' }}>
                  INTRODUCED BY SIMULATION ({stepImpact.findingDelta.introduced.length})
                </div>
                {stepImpact.findingDelta.introduced.map(f => (
                  <div
                    key={f.id}
                    style={{
                      padding: '8px',
                      backgroundColor: '#7f1d1d20',
                      border: '1px solid #ef444440',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginBottom: '4px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#f87171' }}>{f.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>{f.description}</div>
                  </div>
                ))}
              </div>
            )}

            {stepImpact.findingDelta.resolved.length === 0 && stepImpact.findingDelta.introduced.length === 0 && (
              <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
                No findings resolved or introduced in this step.
              </div>
            )}
          </div>
        )}
      </div>

        {commitError && (
          <div
            className="commit-error-banner"
            data-testid="commit-error-banner"
            style={{
              padding: '8px 12px',
              backgroundColor: '#7f1d1d',
              borderTop: '1px solid #ef4444',
              color: '#fca5a5',
              fontSize: '11px',
              lineHeight: '1.4',
            }}
          >
            ⚠️ {commitError}
          </div>
        )}

      {/* Action Footer */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#1e293b',
          borderTop: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <button
          onClick={onCancel}
          style={{
            padding: '8px 14px',
            backgroundColor: '#334155',
            color: '#f8fafc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          Cancel Simulation
        </button>

        <button
            onClick={() => {
              setCommitError(null);
              try {
                onCommit();
              } catch (err: any) {
                setCommitError(err.message || 'Failed to commit simulation.');
              }
            }}
          style={{
            padding: '8px 14px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
          }}
        >
          Commit Changes
        </button>
      </div>
    </div>
  );
};
