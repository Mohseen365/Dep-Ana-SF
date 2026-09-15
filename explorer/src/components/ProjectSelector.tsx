import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { ProjectCreationModal } from './ProjectCreationModal';
import { ProjectManager } from './ProjectManager';

export interface ProjectSelectorProps {
  variant?: 'full' | 'compact';
  className?: string;
  onProjectSelect?: (projectId: string) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  variant,
  className,
  onProjectSelect,
}) => {
  const isCompact = variant === 'compact' || className?.includes('header');
  const {
    projects,
    activeProject,
    activeProjectId,
    selectProject,
  } = useProject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompactDropdownOpen, setIsCompactDropdownOpen] = useState(false);

  const handleOpenProject = (id: string) => {
    selectProject(id);
    onProjectSelect?.(id);
    setIsCompactDropdownOpen(false);
  };

  // Compact Header Pill Variant
  if (isCompact) {
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

  // Full Screen Application Project Management Screen
  return (
    <ProjectManager className={className} onProjectSelect={onProjectSelect} />
  );
};
