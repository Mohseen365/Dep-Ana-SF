import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { ProjectCreationModal } from './ProjectCreationModal';
import type { ProjectMetadata, ProjectAnalysisStatus } from '../types/explorer';

export interface ProjectManagerProps {
  className?: string;
  onProjectSelect?: (projectId: string) => void;
}

type SortField = 'lastAnalyzed' | 'name' | 'components' | 'status';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'ALL' | ProjectAnalysisStatus | 'ARCHIVED';

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  className = '',
  onProjectSelect,
}) => {
  const {
    projects,
    recentProjects,
    activeProjectId,
    loading,
    error,
    clearError,
    selectProject,
    updateProject,
    reanalyzeProject,
    duplicateProject,
    archiveProject,
    deleteProject,
    exportProject,
  } = useProject();

  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('lastAnalyzed');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Modal / Action States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectMetadata | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSourcePath, setEditSourcePath] = useState('');
  const [editMode, setEditMode] = useState<'rename' | 'source' | null>(null);

  const [deletingProject, setDeletingProject] = useState<ProjectMetadata | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleOpenProject = (id: string) => {
    selectProject(id);
    onProjectSelect?.(id);
  };

  const handleStartRename = (proj: ProjectMetadata) => {
    setEditingProject(proj);
    setEditName(proj.name);
    setEditDescription(proj.description || '');
    setEditMode('rename');
  };

  const handleStartChangeSource = (proj: ProjectMetadata) => {
    setEditingProject(proj);
    setEditSourcePath(proj.sourcePath);
    setEditMode('source');
  };

  const handleSaveEdit = async () => {
    if (!editingProject || !editMode) return;
    setActionError(null);
    try {
      if (editMode === 'rename') {
        if (!editName.trim()) {
          setActionError('Project name cannot be empty');
          return;
        }
        await updateProject(editingProject.id, {
          name: editName.trim(),
          description: editDescription.trim(),
        });
      } else if (editMode === 'source') {
        if (!editSourcePath.trim()) {
          setActionError('Source directory path cannot be empty');
          return;
        }
        await updateProject(editingProject.id, {
          sourcePath: editSourcePath.trim(),
        });
      }
      setEditingProject(null);
      setEditMode(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update project');
    }
  };

  const handleReanalyze = async (id: string) => {
    setActionLoadingId(id);
    setActionError(null);
    try {
      await reanalyzeProject(id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to re-analyze project');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    setActionLoadingId(id);
    setActionError(null);
    try {
      await duplicateProject(id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to duplicate project');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleArchive = async (proj: ProjectMetadata) => {
    setActionLoadingId(proj.id);
    setActionError(null);
    try {
      await archiveProject(proj.id, !proj.isArchived);
    } catch (err: any) {
      setActionError(err.message || 'Failed to archive project');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    setActionError(null);
    try {
      await deleteProject(deletingProject.id);
      setDeletingProject(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete project');
    }
  };

  const handleExport = async (id: string) => {
    setActionError(null);
    try {
      await exportProject(id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to export project');
    }
  };

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let list = [...projects];

    // Status / Archive Filter
    if (statusFilter === 'ARCHIVED') {
      list = list.filter((p) => p.isArchived);
    } else {
      list = list.filter((p) => !p.isArchived);
      if (statusFilter !== 'ALL') {
        list = list.filter((p) => p.analysisStatus === statusFilter);
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.sourcePath.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      let res = 0;
      if (sortField === 'name') {
        res = a.name.localeCompare(b.name);
      } else if (sortField === 'components') {
        res = a.componentCount - b.componentCount;
      } else if (sortField === 'status') {
        res = a.analysisStatus.localeCompare(b.analysisStatus);
      } else if (sortField === 'lastAnalyzed') {
        const timeA = a.lastAnalyzedAt ? new Date(a.lastAnalyzedAt).getTime() : 0;
        const timeB = b.lastAnalyzedAt ? new Date(b.lastAnalyzedAt).getTime() : 0;
        res = timeA - timeB;
      }
      return sortOrder === 'asc' ? res : -res;
    });

    return list;
  }, [projects, searchQuery, statusFilter, sortField, sortOrder]);

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

  const renderStatusBadge = (status: ProjectAnalysisStatus, isArchived?: boolean) => {
    if (isArchived) {
      return (
        <span
          className="ui-badge"
          style={{
            backgroundColor: 'var(--surface-active)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-default)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          Archived
        </span>
      );
    }

    let label = 'Not Analyzed';
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
        className="ui-badge"
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

  return (
    <div
      className={`project-manager-screen ${className}`}
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
      <div style={{ width: '100%', maxWidth: '1180px' }}>
        {/* Header Hero Section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 'var(--space-6)',
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
                Manage Salesforce Projects
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>
              Register, manage, re-analyze, and export Salesforce DX project environments and metadata dependencies.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
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

        {/* Global Action Error / Context Error */}
        {(error || actionError) && (
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
              <strong style={{ display: 'block', marginBottom: '2px' }}>Project Operation Alert</strong>
              <span style={{ fontSize: 'var(--font-size-sm)' }}>{actionError || error?.message}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                clearError();
              }}
              className="ui-btn ui-btn-ghost ui-btn-sm"
              style={{ color: 'var(--state-error)' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Recent Projects Bar */}
        {recentProjects.length > 0 && !searchQuery && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h2
              style={{
                fontSize: 'var(--font-size-xs)',
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {recentProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj.id)}
                  style={{
                    backgroundColor: 'var(--surface-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3) var(--space-4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {proj.name}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {proj.sourcePath}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ui-btn ui-btn-secondary ui-btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenProject(proj.id);
                    }}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter, Search, and Sorting Bar */}
        <div
          style={{
            backgroundColor: 'var(--surface-panel)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-5)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
          }}
        >
          {/* Search Box */}
          <div className="ui-search-field" style={{ flex: '1 1 300px', maxWidth: '420px' }}>
            <span className="ui-search-icon">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name, ID, or source..."
              className="ui-search-input"
              aria-label="Search projects"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="ui-search-clear"
                aria-label="Clear search filter"
              >
                ×
              </button>
            )}
          </div>

          {/* Filter & Sort Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {/* Status Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <label htmlFor="status-filter-select" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
                Filter:
              </label>
              <select
                id="status-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="ui-input"
                style={{ height: 'var(--control-height-sm)', padding: '0 8px', fontSize: 'var(--font-size-xs)' }}
              >
                <option value="ALL">All Active Projects</option>
                <option value="COMPLETE">Analyzed Only</option>
                <option value="NOT_ANALYZED">Not Analyzed</option>
                <option value="ANALYZING">Analyzing</option>
                <option value="FAILED">Failed</option>
                <option value="ARCHIVED">Archived Projects</option>
              </select>
            </div>

            {/* Sort Field Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <label htmlFor="sort-field-select" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
                Sort:
              </label>
              <select
                id="sort-field-select"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="ui-input"
                style={{ height: 'var(--control-height-sm)', padding: '0 8px', fontSize: 'var(--font-size-xs)' }}
              >
                <option value="lastAnalyzed">Last Analyzed</option>
                <option value="name">Name</option>
                <option value="components">Component Count</option>
                <option value="status">Status</option>
              </select>

              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="ui-icon-btn ui-icon-btn-sm"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '▲' : '▼'}
              </button>
            </div>
          </div>
        </div>

        {/* Project Table List */}
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading projects metadata…
          </div>
        ) : filteredAndSortedProjects.length === 0 ? (
          <div className="ui-empty-state" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div className="ui-empty-icon" style={{ fontSize: '36px', marginBottom: 'var(--space-3)' }}>
              📂
            </div>
            <h3 className="ui-empty-title" style={{ margin: '0 0 8px 0', fontSize: 'var(--font-size-lg)' }}>
              No Projects Matched Filter
            </h3>
            <p className="ui-empty-description" style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', maxWidth: '400px' }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'No project matched the search or filter criteria. Try adjusting your search query or clearing filters.'
                : 'No projects registered yet. Click below to create your first Salesforce DX project.'}
            </p>
            {searchQuery || statusFilter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="ui-btn ui-btn-secondary"
              >
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="ui-btn ui-btn-primary"
              >
                + Register New Project
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {filteredAndSortedProjects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const isActionLoading = actionLoadingId === proj.id;

              return (
                <div
                  key={proj.id}
                  style={{
                    backgroundColor: 'var(--surface-panel)',
                    border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                    boxShadow: isActive ? '0 0 0 1px var(--accent-primary)' : 'var(--shadow-sm)',
                    opacity: proj.isArchived ? 0.75 : 1,
                  }}
                >
                  {/* Top Row: Info & Key Metadata Display */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(160px, 1.5fr)',
                      gap: 'var(--space-4)',
                      alignItems: 'center',
                    }}
                  >
                    {/* Project Column */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <h2 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {proj.name}
                        </h2>
                        {isActive && (
                          <span className="ui-badge ui-badge-primary" style={{ fontSize: '10px', padding: '1px 6px' }}>
                            Active
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        ID: {proj.id} | Source: <code style={{ color: 'var(--text-secondary)' }}>{proj.sourcePath}</code>
                      </div>
                      {proj.description && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {proj.description}
                        </div>
                      )}
                    </div>

                    {/* Status Column */}
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        Status
                      </div>
                      {renderStatusBadge(proj.analysisStatus, proj.isArchived)}
                    </div>

                    {/* Components Column */}
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        Components
                      </div>
                      <strong style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>
                        {proj.componentCount || 0}
                      </strong>
                    </div>

                    {/* Dependencies Column */}
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        Dependencies
                      </div>
                      <strong style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>
                        {proj.dependencyCount || 0}
                      </strong>
                    </div>

                    {/* Last Analyzed Column */}
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        Last Analyzed
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {formatDate(proj.lastAnalyzedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar Row */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: 'var(--space-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {/* Open Action */}
                      <button
                        type="button"
                        onClick={() => handleOpenProject(proj.id)}
                        className={`ui-btn ui-btn-sm ${isActive ? 'ui-btn-secondary' : 'ui-btn-primary'}`}
                      >
                        {isActive ? 'Active Workspace' : 'Open'}
                      </button>

                      {/* Rename Action */}
                      <button
                        type="button"
                        onClick={() => handleStartRename(proj)}
                        className="ui-btn ui-btn-secondary ui-btn-sm"
                      >
                        Rename
                      </button>

                      {/* Change Source Action */}
                      <button
                        type="button"
                        onClick={() => handleStartChangeSource(proj)}
                        className="ui-btn ui-btn-secondary ui-btn-sm"
                      >
                        Change Source
                      </button>

                      {/* Re-analyze Action */}
                      <button
                        type="button"
                        onClick={() => handleReanalyze(proj.id)}
                        className="ui-btn ui-btn-secondary ui-btn-sm"
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? 'Analyzing...' : 'Re-analyze'}
                      </button>

                      {/* Duplicate Action */}
                      <button
                        type="button"
                        onClick={() => handleDuplicate(proj.id)}
                        className="ui-btn ui-btn-ghost ui-btn-sm"
                      >
                        Duplicate
                      </button>

                      {/* Archive Action */}
                      <button
                        type="button"
                        onClick={() => handleToggleArchive(proj)}
                        className="ui-btn ui-btn-ghost ui-btn-sm"
                      >
                        {proj.isArchived ? 'Unarchive' : 'Archive'}
                      </button>

                      {/* Export Action */}
                      <button
                        type="button"
                        onClick={() => handleExport(proj.id)}
                        className="ui-btn ui-btn-ghost ui-btn-sm"
                      >
                        Export
                      </button>
                    </div>

                    {/* Delete Action (Strict Confirmation Required) */}
                    <button
                      type="button"
                      onClick={() => setDeletingProject(proj)}
                      className="ui-btn ui-btn-danger ui-btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rename / Change Source Edit Modal */}
      {editingProject && editMode && (
        <div className="ui-overlay" role="dialog" aria-modal="true">
          <div className="ui-modal" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="ui-panel-header">
              <h2 className="ui-panel-title">
                {editMode === 'rename' ? 'Rename Project' : 'Change Project Source Directory'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingProject(null);
                  setEditMode(null);
                }}
                className="ui-icon-btn ui-icon-btn-sm"
              >
                ×
              </button>
            </div>

            <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {editMode === 'rename' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="ui-input"
                      placeholder="e.g., Core Sales Package"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Description (Optional)
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="ui-input"
                      rows={3}
                      placeholder="Project description or DX package scope..."
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Salesforce DX Source Directory Path
                  </label>
                  <input
                    type="text"
                    value={editSourcePath}
                    onChange={(e) => setEditSourcePath(e.target.value)}
                    className="ui-input"
                    placeholder="e.g., force-app/main/default"
                  />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Relative workspace path containing package metadata.
                  </span>
                </div>
              )}
            </div>

            <div style={{ backgroundColor: 'var(--panel-footer-bg)', padding: 'var(--space-4) var(--space-5)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={() => {
                  setEditingProject(null);
                  setEditMode(null);
                }}
                className="ui-btn ui-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="ui-btn ui-btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProject && (
        <div className="ui-overlay" role="dialog" aria-modal="true">
          <div className="ui-modal" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="ui-panel-header" style={{ borderBottomColor: 'var(--state-error-bg)' }}>
              <h2 className="ui-panel-title" style={{ color: 'var(--state-error)' }}>
                ⚠️ Delete Project Confirmation
              </h2>
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="ui-icon-btn ui-icon-btn-sm"
              >
                ×
              </button>
            </div>

            <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <p style={{ margin: 0, fontSize: 'var(--font-size-md)', color: 'var(--text-primary)' }}>
                Are you sure you want to delete project <strong>"{deletingProject.name}"</strong>?
              </p>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', lineHeight: 'var(--line-height-relaxed)' }}>
                This will remove the project registration and local state. This action cannot be undone.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--panel-footer-bg)', padding: 'var(--space-4) var(--space-5)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="ui-btn ui-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="ui-btn ui-btn-danger"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <ProjectCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleOpenProject}
      />
    </div>
  );
};
