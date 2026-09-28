import React, { useMemo, useState, useEffect } from 'react';
import type { ExplorerDataSchema } from '../types/explorer';
import {
  adaptComponentProfile,
  type ComponentProfileData,
  type ComponentProfile,
} from '../lib/adapters/profile-adapter';

export interface FeatureProfilePanelProps {
  data: ExplorerDataSchema | null;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

export const FeatureProfilePanel: React.FC<FeatureProfilePanelProps> = ({
  data,
  selectedNodeId,
  onSelectNode,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProfileId, setActiveProfileId] = useState<string | null>(selectedNodeId ?? null);

  // Pure adaptation from input data
  const profileData: ComponentProfileData | null = useMemo(() => {
    if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      return null;
    }
    return adaptComponentProfile(data);
  }, [data]);

  // Sync external selectedNodeId prop changes into local activeProfileId
  useEffect(() => {
    if (selectedNodeId) {
      setActiveProfileId(selectedNodeId);
    }
  }, [selectedNodeId]);

  // Fallback active profile if none selected or invalid
  const activeProfile: ComponentProfile | null = useMemo(() => {
    if (!profileData || profileData.profiles.length === 0) return null;
    if (activeProfileId && profileData.profileMap[activeProfileId]) {
      return profileData.profileMap[activeProfileId];
    }
    return profileData.profiles[0];
  }, [profileData, activeProfileId]);

  // Filter profiles for component list
  const filteredProfiles = useMemo(() => {
    if (!profileData) return [];
    if (!searchQuery.trim()) return profileData.profiles;
    const query = searchQuery.toLowerCase().trim();
    return profileData.profiles.filter(p =>
      p.displayName.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query) ||
      p.entityType.toLowerCase().includes(query) ||
      p.layer.toLowerCase().includes(query) ||
      p.domain.toLowerCase().includes(query) ||
      p.featureId.toLowerCase().includes(query) ||
      p.featureRole.toLowerCase().includes(query) ||
      (p.hotspotCategory && p.hotspotCategory.toLowerCase().includes(query))
    );
  }, [profileData, searchQuery]);

  if (!profileData || profileData.profiles.length === 0) {
    return (
      <div className={`feature-profile-panel ui-panel ${className}`} data-testid="feature-profile-panel">
        <div className="analysis-mode-nav">
          <span className="nav-mode-item">Graph</span>
          <span className="nav-mode-item active">Profile</span>
          <span className="nav-mode-item">Findings</span>
          <span className="nav-mode-item">Hotspots</span>
        </div>
        <div className="profile-empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>👤</span>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>
            No Component Profile Data
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
            Select or analyze a project dataset containing components to view architecture profiles.
          </p>
        </div>
      </div>
    );
  }

  const { summary } = profileData;

  const getLayerColor = (layer: string) => {
    switch (layer) {
      case 'presentation':
        return '#3b82f6';
      case 'application':
        return '#8b5cf6';
      case 'domain':
        return '#10b981';
      case 'schema':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

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
      className={`feature-profile-panel ui-panel ${className}`}
      data-testid="feature-profile-panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', padding: '12px' }}
    >
      {/* Header & Summary Bar */}
      <div
        className="profile-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default, #334155)',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>👤</span>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
            Component Architecture Profile
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Components: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{summary.totalComponents}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            High Risk: <strong style={{ color: '#f87171' }}>{summary.highRiskCount}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Hotspots: <strong style={{ color: '#f59e0b' }}>{summary.hotspotCount}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Bridges: <strong style={{ color: 'var(--accent-primary, #3b82f6)' }}>{summary.bridgeCount}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Hubs: <strong style={{ color: '#8b5cf6' }}>{summary.hubCount}</strong>
          </span>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
            Avg Coupling: <strong style={{ color: 'var(--text-primary, #f8fafc)' }}>{summary.averageCoupling}</strong>
          </span>
        </div>
      </div>

      {/* Main Split Area */}
      <div className="profile-content-area" style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0, overflow: 'hidden' }}>
        {/* Left List Pane: Component Selector */}
        <div
          className="profile-selector-pane"
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
              placeholder="Filter components..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              data-testid="profile-search-input"
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

          {/* Filtered Component List */}
          <div
            className="profile-component-list"
            data-testid="profile-component-list"
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
                const isSelected = activeProfile?.id === prof.id || selectedNodeId === prof.id;
                const isDimmed = !!selectedNodeId && prof.id !== selectedNodeId;
                return (
                  <div
                    key={prof.id}
                    data-testid={`profile-item-${prof.id}`}
                    className={`profile-item ${isDimmed ? 'dimmed' : ''}`}
                    onClick={() => {
                      setActiveProfileId(prof.id);
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
                      gap: '4px',
                      opacity: isDimmed ? 0.35 : 1.0,
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
                          ...getRiskStyle(prof.risk),
                        }}
                      >
                        {prof.risk}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
                      <span
                        style={{
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: 'var(--surface-subtle, #0f172a)',
                          color: getLayerColor(prof.layer),
                          fontWeight: 600,
                        }}
                      >
                        {prof.layer}
                      </span>
                      <span style={{ color: 'var(--text-muted, #94a3b8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prof.entityType}
                      </span>
                      {prof.isHotspot && (
                        <span style={{ marginLeft: 'auto', fontSize: '10px' }} title={`Hotspot: ${prof.hotspotCategory || 'Hotspot'}`}>
                          🔥
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane: Active Profile Dashboard */}
        <div
          className="profile-detail-pane"
          data-testid="profile-detail-pane"
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {activeProfile ? (
            <>
              {/* Profile Header Card */}
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
                    <span style={{ fontSize: '20px' }}>📄</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                        {activeProfile.displayName}
                      </h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontFamily: 'var(--font-mono, monospace)' }}>
                        ID: {activeProfile.id}
                      </span>
                    </div>
                  </div>
                  {onSelectNode && (
                    <button
                      onClick={() => onSelectNode(activeProfile.id)}
                      data-testid="profile-explore-graph-btn"
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

              {/* Architectural Classifications Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                }}
              >
                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-card, #1e293b)', border: '1px solid var(--border-default, #334155)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>
                    Architectural Layer
                  </span>
                  <strong style={{ fontSize: '13px', color: getLayerColor(activeProfile.layer) }}>
                    {activeProfile.layer}
                  </strong>
                </div>

                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-card, #1e293b)', border: '1px solid var(--border-default, #334155)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>
                    Domain
                  </span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary, #f8fafc)' }}>
                    {activeProfile.domain}
                  </strong>
                </div>

                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-card, #1e293b)', border: '1px solid var(--border-default, #334155)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>
                    Feature Assignment
                  </span>
                  <strong style={{ fontSize: '13px', color: 'var(--accent-primary, #3b82f6)' }}>
                    {activeProfile.featureId}
                  </strong>
                </div>

                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-card, #1e293b)', border: '1px solid var(--border-default, #334155)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>
                    Feature Role
                  </span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary, #f8fafc)' }}>
                    {activeProfile.featureRole}
                  </strong>
                </div>
              </div>

              {/* Dependency & Risk Metrics Section */}
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
                  Dependency & Risk Metrics
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                  <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-base, #090d16)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>Fan-In (Dependents)</span>
                    <strong style={{ fontSize: '16px', color: 'var(--text-primary, #f8fafc)' }}>{activeProfile.fanIn}</strong>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-base, #090d16)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>Fan-Out (Dependencies)</span>
                    <strong style={{ fontSize: '16px', color: 'var(--text-primary, #f8fafc)' }}>{activeProfile.fanOut}</strong>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-base, #090d16)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>Total Coupling</span>
                    <strong style={{ fontSize: '16px', color: 'var(--accent-primary, #3b82f6)' }}>{activeProfile.coupling}</strong>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-base, #090d16)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>Unresolved References</span>
                    <strong style={{ fontSize: '16px', color: activeProfile.unresolved > 0 ? '#f59e0b' : 'var(--text-primary, #f8fafc)' }}>
                      {activeProfile.unresolved}
                    </strong>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-base, #090d16)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>Risk Score</span>
                    <strong style={{ fontSize: '16px', color: 'var(--text-primary, #f8fafc)' }}>{activeProfile.score}</strong>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-base, #090d16)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>Risk Level</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '3px', fontWeight: 700, ...getRiskStyle(activeProfile.risk) }}>
                      {activeProfile.risk}
                    </span>
                  </div>
                </div>
              </div>

              {/* Centrality & Topology Section */}
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
                  Centrality & Structural Topology
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-base, #090d16)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>Spatial Role</span>
                    <strong style={{ fontSize: '12px', color: 'var(--text-primary, #f8fafc)' }}>{activeProfile.spatialRole}</strong>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-base, #090d16)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>Hub Type</span>
                    <strong style={{ fontSize: '12px', color: 'var(--text-primary, #f8fafc)' }}>{activeProfile.hubType}</strong>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-base, #090d16)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>Bridge Node</span>
                    <strong style={{ fontSize: '12px', color: activeProfile.isBridge ? 'var(--accent-primary, #3b82f6)' : 'var(--text-muted, #94a3b8)' }}>
                      {activeProfile.isBridge ? 'Yes 🌉' : 'No'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Hotspot & Refactoring Readiness Section */}
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
                  Hotspots & Refactoring Readiness
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {activeProfile.isHotspot && (
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      🔥 Hotspot ({activeProfile.hotspotCategory || 'Ranked'})
                    </span>
                  )}
                  {activeProfile.isHighRisk && (
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      ⚠️ High Risk Component
                    </span>
                  )}
                  {activeProfile.hasCycles && (
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      🔄 Circular Dependency Cycles
                    </span>
                  )}
                  {activeProfile.hasUnresolved && (
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      ⚡ Unresolved Reference Risk
                    </span>
                  )}
                  {activeProfile.isTest && (
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: '#3b82f6',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      🧪 Test Suite Component
                    </span>
                  )}
                  {activeProfile.isField && (
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(139, 92, 246, 0.2)',
                        color: '#8b5cf6',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      🏷️ Field Component
                    </span>
                  )}
                  {!activeProfile.isHotspot &&
                   !activeProfile.isHighRisk &&
                   !activeProfile.hasCycles &&
                   !activeProfile.hasUnresolved &&
                   !activeProfile.isTest &&
                   !activeProfile.isField && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                      Standard production component with no active risk or structural flags.
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', padding: '24px 0', textAlign: 'center' }}>
              Select a component profile from the list to inspect its architectural details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureProfilePanel;
