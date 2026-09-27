import React, { useMemo, useState, useEffect } from 'react';
import type { ExplorerDataSchema } from '../types/explorer';
import {
  adaptArchitectureDna,
  type ArchitectureDnaData,
  type ComponentDna,
  type DnaBand,
} from '../lib/adapters/dna-adapter';

export interface ArchitectureDNABarcodeProps {
  data: ExplorerDataSchema | null;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

export const ArchitectureDNABarcode: React.FC<ArchitectureDNABarcodeProps> = ({
  data,
  selectedNodeId,
  onSelectNode,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeComponentId, setActiveComponentId] = useState<string | null>(selectedNodeId ?? null);
  const [hoveredBandId, setHoveredBandId] = useState<string | null>(null);

  // Pure adaptation from input schema
  const dnaData: ArchitectureDnaData | null = useMemo(() => {
    if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      return null;
    }
    return adaptArchitectureDna(data);
  }, [data]);

  // Sync external selectedNodeId into local active component
  useEffect(() => {
    if (selectedNodeId) {
      setActiveComponentId(selectedNodeId);
    }
  }, [selectedNodeId]);

  // Fallback active component profile
  const activeProfile: ComponentDna | null = useMemo(() => {
    if (!dnaData || dnaData.dnaProfiles.length === 0) return null;
    if (activeComponentId && dnaData.dnaMap[activeComponentId]) {
      return dnaData.dnaMap[activeComponentId];
    }
    return dnaData.dnaProfiles[0];
  }, [dnaData, activeComponentId]);

  // Filter components
  const filteredProfiles = useMemo(() => {
    if (!dnaData) return [];
    if (!searchQuery.trim()) return dnaData.dnaProfiles;
    const q = searchQuery.toLowerCase().trim();
    return dnaData.dnaProfiles.filter(p =>
      p.displayName.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.entityType.toLowerCase().includes(q) ||
      p.layer.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q) ||
      p.featureId.toLowerCase().includes(q)
    );
  }, [dnaData, searchQuery]);

  if (!dnaData || dnaData.dnaProfiles.length === 0) {
    return (
      <div className={`architecture-dna-panel ui-panel ${className}`} data-testid="architecture-dna-panel">
        <div className="dna-empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🧬</span>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>
            No Architecture DNA Data
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
            Select or analyze a project dataset containing components to view 7-band Architecture DNA barcodes.
          </p>
        </div>
      </div>
    );
  }

  const { summary } = dnaData;

  const getRiskStyle = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case 'HIGH':
        return { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' };
      case 'MEDIUM':
        return { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' };
      default:
        return { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' };
    }
  };

  return (
    <div
      className={`architecture-dna-panel ui-panel ${className}`}
      data-testid="architecture-dna-panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', padding: '12px', boxSizing: 'border-box' }}
    >
      {/* Header & Summary Bar */}
      <div
        className="dna-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default, #334155)',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🧬</span>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
            Architecture DNA / Barcode Lens
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Components: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{summary.totalComponents}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            High Risk DNA: <strong style={{ color: '#f87171' }}>{summary.highRiskDnaCount}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Hotspot DNA: <strong style={{ color: '#f59e0b' }}>{summary.hotspotDnaCount}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Hub DNA: <strong style={{ color: '#8b5cf6' }}>{summary.hubDnaCount}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Avg DNA Index: <strong style={{ color: 'var(--accent-primary, #3b82f6)' }}>{summary.averageDnaIndex}</strong>
          </span>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="dna-content-area" style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0, overflow: 'hidden' }}>
        {/* Left Pane: Filterable Component List */}
        <div
          className="dna-selector-pane"
          style={{
            width: '320px',
            minWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderRight: '1px solid var(--border-default, #334155)',
            paddingRight: '12px',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Filter DNA components..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              data-testid="dna-search-input"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid var(--border-default, #334155)',
                backgroundColor: 'var(--surface-base, #090d16)',
                color: 'var(--text-primary, #f8fafc)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Component Barcode List */}
          <div
            className="dna-component-list"
            data-testid="dna-component-list"
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {filteredProfiles.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', padding: '12px 4px', fontStyle: 'italic' }}>
                No components match "{searchQuery}"
              </div>
            ) : (
              filteredProfiles.map(prof => {
                const isSelected = activeProfile?.id === prof.id;
                return (
                  <div
                    key={prof.id}
                    data-testid={`dna-item-${prof.id}`}
                    onClick={() => {
                      setActiveComponentId(prof.id);
                      if (onSelectNode) {
                        onSelectNode(prof.id);
                      }
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: isSelected
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'var(--surface-panel, #111827)',
                      border: isSelected
                        ? '1px solid var(--accent-primary, #3b82f6)'
                        : '1px solid var(--border-subtle, #1e293b)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: isSelected ? 'var(--accent-primary, #3b82f6)' : 'var(--text-primary, #f8fafc)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                        title={prof.displayName}
                      >
                        {prof.displayName}
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          ...getRiskStyle(prof.riskLevel),
                        }}
                      >
                        {prof.riskLevel}
                      </span>
                    </div>

                    {/* Mini 7-Strip Barcode Strip */}
                    <div
                      style={{
                        display: 'flex',
                        height: '10px',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        backgroundColor: 'var(--surface-subtle, #0f172a)',
                        gap: '1px',
                        padding: '1px',
                      }}
                      title={`DNA Index: ${prof.overallDnaIndex}`}
                    >
                      {prof.bands.map(b => (
                        <div
                          key={b.id}
                          style={{
                            flex: 1,
                            backgroundColor: b.color,
                            opacity: 0.3 + b.normalizedValue * 0.7,
                            height: '100%',
                            borderRadius: '1px',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane: Active Component Barcode Inspector */}
        <div
          className="dna-detail-pane"
          data-testid="dna-detail-pane"
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {activeProfile ? (
            <>
              {/* Header Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--surface-card, #1e293b)',
                  border: '1px solid var(--border-default, #334155)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🧬</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                        {activeProfile.displayName}
                      </h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontFamily: 'var(--font-mono, monospace)' }}>
                        ID: {activeProfile.id} | Type: {activeProfile.entityType} | Layer: {activeProfile.layer}
                      </span>
                    </div>
                  </div>
                  {onSelectNode && (
                    <button
                      onClick={() => onSelectNode(activeProfile.id)}
                      data-testid="dna-explore-graph-btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: 'var(--accent-primary, #3b82f6)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Explore in Graph Canvas →
                    </button>
                  )}
                </div>

                {activeProfile.file && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #cbd5e1)', fontFamily: 'var(--font-mono, monospace)' }}>
                    File: <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{activeProfile.file}</span>
                  </div>
                )}
              </div>

              {/* Large 7-Band Barcode Graphic */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--surface-card, #1e293b)',
                  border: '1px solid var(--border-default, #334155)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #94a3b8)' }}>
                    7-Band Architectural DNA Barcode
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--accent-primary, #3b82f6)', fontWeight: 600 }}>
                    Overall DNA Index: {(activeProfile.overallDnaIndex * 100).toFixed(1)}%
                  </span>
                </div>

                {/* SVG / CSS Barcode Visual Strips */}
                <div
                  data-testid="dna-barcode-visual-strips"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '6px',
                    height: '100px',
                    backgroundColor: 'var(--surface-base, #090d16)',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle, #1e293b)',
                    alignItems: 'end',
                  }}
                >
                  {activeProfile.bands.map(band => {
                    const isHovered = hoveredBandId === band.id;
                    const heightPercent = Math.max(10, Math.round(band.normalizedValue * 100));
                    return (
                      <div
                        key={band.id}
                        data-testid={`dna-band-strip-${band.id}`}
                        onMouseEnter={() => setHoveredBandId(band.id)}
                        onMouseLeave={() => setHoveredBandId(null)}
                        style={{
                          height: `${heightPercent}%`,
                          backgroundColor: band.color,
                          borderRadius: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '4px 2px',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                          opacity: isHovered ? 1.0 : 0.85,
                          transform: isHovered ? 'scaleY(1.05)' : 'scaleY(1.0)',
                          transition: 'all 0.15s ease',
                          boxShadow: isHovered ? `0 0 8px ${band.color}` : 'none',
                        }}
                        title={`${band.label}: ${band.displayValue}`}
                      >
                        <span style={{ fontSize: '8px', color: '#ffffff', fontWeight: 700, textAlign: 'center' }}>
                          {Math.round(band.normalizedValue * 100)}%
                        </span>
                        <span style={{ fontSize: '8px', color: '#ffffff', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase' }}>
                          {band.id}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Band Details Inspection List */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--surface-card, #1e293b)',
                  border: '1px solid var(--border-default, #334155)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #94a3b8)' }}>
                  DNA Band Metric Provenance & Authoritative Raw Values
                </h4>

                <div
                  className="dna-band-inspector-grid"
                  data-testid="dna-band-inspector-grid"
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  {activeProfile.bands.map(band => {
                    const isHovered = hoveredBandId === band.id;
                    return (
                      <div
                        key={band.id}
                        data-testid={`dna-band-card-${band.id}`}
                        onMouseEnter={() => setHoveredBandId(band.id)}
                        onMouseLeave={() => setHoveredBandId(null)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '4px',
                          backgroundColor: isHovered ? 'var(--surface-hover, #2d3748)' : 'var(--surface-base, #090d16)',
                          border: isHovered ? `1px solid ${band.color}` : '1px solid var(--border-subtle, #1e293b)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' }}>
                          <span
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '3px',
                              backgroundColor: band.color,
                              display: 'inline-block',
                            }}
                          />
                          <div>
                            <strong style={{ fontSize: '12px', color: 'var(--text-primary, #f8fafc)', display: 'block' }}>
                              {band.label}
                            </strong>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
                              {band.description}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ flex: 1, maxWidth: '140px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '6px',
                              backgroundColor: 'var(--surface-card, #1e293b)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.round(band.normalizedValue * 100)}%`,
                                height: '100%',
                                backgroundColor: band.color,
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', width: '32px', textAlign: 'right' }}>
                            {Math.round(band.normalizedValue * 100)}%
                          </span>
                        </div>

                        {/* Raw Value Badge */}
                        <div style={{ minWidth: '100px', textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--surface-card, #1e293b)',
                              color: band.color,
                              border: `1px solid ${band.color}40`,
                              fontFamily: 'var(--font-mono, monospace)',
                            }}
                          >
                            {band.displayValue}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', padding: '24px 0', textAlign: 'center' }}>
              Select a component from the list to inspect its 7-band Architecture DNA barcode.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchitectureDNABarcode;
