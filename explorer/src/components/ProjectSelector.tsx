import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { ProjectCreationModal } from './ProjectCreationModal';
import type { ProjectMetadata } from '../types/explorer';

export interface ProjectSelectorProps {
  variant?: 'full' | 'compact';
  className?: string;
  onProjectSelect?: (projectId: string) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  variant = 'full',
  className,
  onProjectSelect,
}) => {
  const {
    projects,
    recentProjects,
    activeProject,
    activeProjectId,
    loading,
    error,
    clearError,
    selectProject,
    refreshProjects,
  } = useProject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCompactDropdownOpen, setIsCompactDropdownOpen] = useState(false);

  const handleOpenProject = (id: string) => {
    selectProject(id);
    onProjectSelect?.(id);
    setIsCompactDropdownOpen(false);
  };

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase().trim();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.sourcePath.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
    );
  }, [projects, searchQuery]);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Never analyzed';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime()) || date.getTime() === 0) return 'Never analyzed';
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return 'Never analyzed';
    }
  };

  const renderStatusBadge = (status: ProjectMetadata['analysisStatus']) => {
    let label = 'Not Analyzed';
    let badgeClass = 'ui-badge-none';
    let style: React.CSSProperties = {
      backgroundColor: 'var(--risk-none-bg)',
      color: 'var(--text-muted)',
      border: '1px solid var(--border-subtle)',
    };

    if (status === 'COMPLETE') {
      label = 'Analyzed';
      style = {
        backgroundColor: 'var(--state-success-bg)',
        color: 'var(--state-success)',
        border: '1px solid var(--state-success)',
      };
    } else if (status === 'ANALYZING') {
      label = 'Analyzing...';
      style = {
        backgroundColor: 'var(--state-warning-bg)',
        color: 'var(--state-warning)',
        border: '1px solid var(--state-warning)',
      };
    } else if (status === 'FAILED') {
      label = 'Analysis Failed';
      style = {
        backgroundColor: 'var(--state-error-bg)',
        color: 'var(--state-error)',
        border: '1px solid var(--state-error)',
      };
    }

    return (
      <span
        className={`ui-badge ${badgeClass}`}
        style={{
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 600,
          ...style,
        }}
      >
        {label}
      </span>
    );
  };

  // Compact Header Pill Variant
  if (variant === 'compact') {
    return (
      <div className={className} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          type="button"
          onClick={() => setIsCompactDropdownOpen((prev) => !prev)}
          className="ui-btn ui-btn-secondary ui-btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
          }}
          aria-expanded={isCompactDropdownOpen}
          aria-haspopup="true"
        >
          <span style={{ fontSize: '14px' }}>📁</span>
          <span style={{ fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeProject ? activeProject.name : 'Select Project'}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>▼</span>
        </button>

        {isCompactDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '6px',
              width: '280px',
              backgroundColor: 'var(--surface-panel)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-overlay)',
              zIndex: 500,
              padding: 'var(--space-2)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                color: 'var(--text-muted)',
                padding: 'var(--space-2) var(--space-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Salesforce Projects
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => handleOpenProject(proj.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-2) var(--space-3)',
                    backgroundColor: proj.id === activeProjectId ? 'var(--accent-subtle)' : 'transparent',
                    color: proj.id === activeProjectId ? 'var(--accent-primary)' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  <span style={{ fontWeight: proj.id === activeProjectId ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proj.name}
                  </span>
                  {proj.id === activeProjectId && <span>✓</span>}
                </button>
              ))}
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                marginTop: 'var(--space-2)',
                paddingTop: 'var(--space-2)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsCompactDropdownOpen(false);
                  setIsModalOpen(true);
                }}
                className="ui-btn ui-btn-ghost ui-btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--accent-primary)' }}
              >
                + Register New Project...
              </button>
            </div>
          </div>
        )}

        <ProjectCreationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleOpenProject}
        />
      </div>
    );
  }

  // Full Screen First-Class Application Selector Screen
  return (
    <div
      className={`project-selector-screen ${className || ''}`}
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--surface-base)',
        color: 'var(--text-primary)',
        padding: 'var(--space-8) var(--space-6)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '1080px' }}>
        {/* Header Hero Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 'var(--space-7)',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent-subtle)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                ⚡
              </div>
              <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Salesforce Architecture Explorer
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>
              Select a Salesforce DX project to explore dependencies, risk hotspots, and architectural intelligence.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="ui-btn ui-btn-primary ui-btn-lg"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
            <span>New Project</span>
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            style={{
              backgroundColor: 'var(--state-error-bg)',
              border: '1px solid var(--state-error)',
              color: 'var(--state-error)',
              padding: 'var(--space-4) var(--space-5)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong style={{ display: 'block', marginBottom: '2px' }}>Project Selection Error</strong>
              <span style={{ fontSize: 'var(--font-size-sm)' }}>{error.message}</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={clearError}
                className="ui-btn ui-btn-ghost ui-btn-sm"
                style={{ color: 'var(--state-error)' }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => refreshProjects()}
                className="ui-btn ui-btn-secondary ui-btn-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Recent Projects Section */}
        {recentProjects.length > 0 && !searchQuery && (
          <div style={{ marginBottom: 'var(--space-7)' }}>
            <h2
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-3)',
              }}
            >
              Recent Projects
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 'var(--space-4)',
              }}
            >
              {recentProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj.id)}
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.backgroundColor = 'var(--surface-card)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {proj.name}
                    </h3>
                    {renderStatusBadge(proj.analysisStatus)}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {proj.sourcePath}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Toolbar Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-5)',
            flexWrap: 'wrap',
          }}
        >
          <div className="ui-search-field" style={{ flex: '1 1 320px', maxWidth: '480px' }}>
            <span className="ui-search-icon">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter projects by name, ID, or source folder..."
              className="ui-search-input"
              aria-label="Filter projects"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="ui-search-clear"
                aria-label="Clear filter"
              >
                ×
              </button>
            )}
          </div>

          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredProjects.length}</strong> of <strong>{projects.length}</strong> project{projects.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 'var(--space-5)',
              width: '100%',
            }}
          >
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-6)',
                  height: '180px',
                  opacity: 0.6,
                }}
              >
                <div style={{ height: '20px', width: '60%', backgroundColor: 'var(--surface-active)', borderRadius: '4px', marginBottom: '12px' }} />
                <div style={{ height: '14px', width: '40%', backgroundColor: 'var(--surface-active)', borderRadius: '4px', marginBottom: '24px' }} />
                <div style={{ height: '36px', width: '100%', backgroundColor: 'var(--surface-active)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Empty State */
          <div className="ui-empty-state" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div className="ui-empty-icon" style={{ fontSize: '36px', marginBottom: 'var(--space-3)' }}>
              🔍
            </div>
            <h3 className="ui-empty-title" style={{ margin: '0 0 8px 0', fontSize: 'var(--font-size-lg)' }}>
              No Salesforce Projects Found
            </h3>
            <p className="ui-empty-description" style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', maxWidth: '400px' }}>
              {searchQuery
                ? `No project matched "${searchQuery}". Try adjusting your search query.`
                : 'No registered Salesforce projects found. Click below to create your first project.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="ui-btn ui-btn-secondary"
              >
                Clear Search Filter
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="ui-btn ui-btn-primary"
              >
                + Register New Project
              </button>
            )}
          </div>
        ) : (
          /* Main Project Grid */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 'var(--space-5)',
              width: '100%',
            }}
          >
            {filteredProjects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              return (
                <div
                  key={proj.id}
                  style={{
                    backgroundColor: 'var(--surface-panel)',
                    border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-6)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: isActive ? '0 0 0 1px var(--accent-primary)' : 'var(--shadow-sm)',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  {/* Card Header */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 'var(--space-3)',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      <div>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: 'var(--font-size-lg)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {proj.name}
                        </h2>
                        <span
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          ID: {proj.id}
                        </span>
                      </div>
                      {renderStatusBadge(proj.analysisStatus)}
                    </div>

                    {proj.description && (
                      <p
                        style={{
                          margin: '0 0 var(--space-4) 0',
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--text-secondary)',
                          lineHeight: 'var(--line-height-relaxed)',
                        }}
                      >
                        {proj.description}
                      </p>
                    )}

                    {/* Source Information */}
                    <div
                      style={{
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-3)',
                        marginBottom: 'var(--space-4)',
                        fontSize: 'var(--font-size-xs)',
                      }}
                    >
                      <div style={{ color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 500 }}>
                        Source Directory:
                      </div>
                      <div
                        style={{
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={proj.sourcePath}
                      >
                        {proj.sourcePath}
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 'var(--space-3)',
                        marginBottom: 'var(--space-5)',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: 'var(--surface-card)',
                          padding: 'var(--space-3)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          Components
                        </span>
                        <strong style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)' }}>
                          {proj.componentCount || 0}
                        </strong>
                      </div>

                      <div
                        style={{
                          backgroundColor: 'var(--surface-card)',
                          padding: 'var(--space-3)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          Dependencies
                        </span>
                        <strong style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)' }}>
                          {proj.dependencyCount || 0}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions & Metadata */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: 'var(--space-4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                      <span>Last Analyzed:</span>
                      <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {formatDate(proj.lastAnalyzedAt)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenProject(proj.id)}
                      className={`ui-btn ${isActive ? 'ui-btn-secondary' : 'ui-btn-primary'}`}
                      style={{ padding: '8px 16px' }}
                    >
                      {isActive ? 'Active Workspace' : 'Open Project'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ProjectCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleOpenProject}
      />
    </div>
  );
};
