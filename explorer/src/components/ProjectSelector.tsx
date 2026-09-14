import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { ProjectCreationModal } from './ProjectCreationModal';

export const ProjectSelector: React.FC<{ className?: string }> = ({ className }) => {
  const { projects, activeProjectId, activeProject, selectProject } = useProject();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__NEW_PROJECT__') {
      setIsModalOpen(true);
    } else {
      selectProject(val);
    }
  };

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#1e293b',
        padding: '4px 8px',
        borderRadius: '6px',
        border: '1px solid #334155',
      }}
    >
      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>Project:</span>
      <select
        aria-label="Select Active Salesforce Project"
        value={activeProjectId}
        onChange={handleSelectChange}
        style={{
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          border: '1px solid #475569',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {projects.map((proj) => (
          <option key={proj.id} value={proj.id}>
            {proj.name} ({proj.id})
          </option>
        ))}
        <option value="__NEW_PROJECT__">+ Register New Project...</option>
      </select>

      {activeProject && (
        <span
          title={`Source Path: ${activeProject.sourcePath}\nStatus: ${activeProject.analysisStatus}`}
          style={{
            fontSize: '0.75rem',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: activeProject.analysisStatus === 'COMPLETE' ? '#065f46' : '#854d0e',
            color: activeProject.analysisStatus === 'COMPLETE' ? '#34d399' : '#fef08a',
            fontWeight: 600,
          }}
        >
          {activeProject.analysisStatus}
        </span>
      )}

      <ProjectCreationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
