import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';

interface ProjectCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

export const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createProject, projects, clearError: clearGlobalError } = useProject();
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [sourcePath, setSourcePath] = useState('force-app/main/default');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form and errors when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('');
      setId('');
      setDescription('');
      setSourcePath('force-app/main/default');
      setErrors({});
      clearGlobalError();
    }
  }, [isOpen, clearGlobalError]);

  if (!isOpen) return null;

  const validateField = (field: string, value: string): string | null => {
    if (field === 'name') {
      if (!value.trim()) return 'Project name is required';
      if (value.trim().length < 2) return 'Project name must be at least 2 characters';
    }
    if (field === 'id' && value.trim()) {
      const slugPattern = /^[a-zA-Z0-9_-]+$/;
      if (!slugPattern.test(value.trim())) {
        return 'Project ID can only contain letters, numbers, hyphens, and underscores';
      }
      const existing = projects.find((p) => p.id === value.trim().toLowerCase());
      if (existing) {
        return `A project with ID "${value.trim().toLowerCase()}" already exists`;
      }
    }
    if (field === 'sourcePath') {
      if (!value.trim()) return 'Salesforce project/source folder path is required';
    }
    return null;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.name;
      delete copy.form;
      return copy;
    });
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setId(val);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.id;
      delete copy.form;
      return copy;
    });
  };

  const handleSourcePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSourcePath(val);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.sourcePath;
      delete copy.form;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const nameErr = validateField('name', name);
    if (nameErr) newErrors.name = nameErr;

    const idErr = validateField('id', id);
    if (idErr) newErrors.id = idErr;

    const sourceErr = validateField('sourcePath', sourcePath);
    if (sourceErr) newErrors.sourcePath = sourceErr;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      const created = await createProject({
        name: name.trim(),
        id: id.trim() || undefined,
        description: description.trim(),
        sourcePath: sourcePath.trim(),
      });
      setIsSubmitting(false);
      onSuccess?.(created.id);
      onClose();
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      setErrors({ form: msg });
    }
  };

  const handleClearErrors = () => {
    setErrors({});
    clearGlobalError();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="ui-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 13, 22, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="ui-modal"
        style={{
          backgroundColor: 'var(--surface-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          width: '100%',
          maxWidth: '540px',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-overlay)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div>
            <h2 id="modal-title" style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>
              Create Salesforce Project
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
              Register a Salesforce DX source directory for multi-project architecture exploration.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project modal"
            className="ui-icon-btn ui-icon-btn-sm"
          >
            ✕
          </button>
        </div>

        {errors.form && (
          <div
            style={{
              backgroundColor: 'var(--state-error-bg)',
              border: '1px solid var(--state-error)',
              color: 'var(--state-error)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{errors.form}</span>
            <button
              type="button"
              onClick={handleClearErrors}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--state-error)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 'var(--font-size-xs)',
              }}
            >
              Clear
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Project Name */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              htmlFor="project-name"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Project Name <span style={{ color: 'var(--state-error)' }}>*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Core CRM Services"
              className="ui-input"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderColor: errors.name ? 'var(--state-error)' : undefined,
              }}
            />
            {errors.name && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--state-error)', marginTop: '4px', display: 'block' }}>
                {errors.name}
              </span>
            )}
          </div>

          {/* Salesforce Project/Source Folder */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              htmlFor="source-path"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Salesforce Project / Source Folder <span style={{ color: 'var(--state-error)' }}>*</span>
            </label>
            <input
              id="source-path"
              type="text"
              value={sourcePath}
              onChange={handleSourcePathChange}
              placeholder="e.g. force-app/main/default or packages/billing"
              className="ui-input"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-mono)',
                borderColor: errors.sourcePath ? 'var(--state-error)' : undefined,
              }}
            />
            {errors.sourcePath ? (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--state-error)', marginTop: '4px', display: 'block' }}>
                {errors.sourcePath}
              </span>
            ) : (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Relative path to the Salesforce metadata source directory.
              </span>
            )}
          </div>

          {/* Project ID (Slug) */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
              htmlFor="project-id"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Project ID Slug
            </label>
            <input
              id="project-id"
              type="text"
              value={id}
              onChange={handleIdChange}
              placeholder="e.g. core-crm (auto-generated if empty)"
              className="ui-input"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-mono)',
                borderColor: errors.id ? 'var(--state-error)' : undefined,
              }}
            />
            {errors.id ? (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--state-error)', marginTop: '4px', display: 'block' }}>
                {errors.id}
              </span>
            ) : (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Unique identifier used for isolated data storage paths.
              </span>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <label
              htmlFor="project-desc"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Description
            </label>
            <textarea
              id="project-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional package description or architecture notes"
              className="ui-input"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                resize: 'none',
                padding: 'var(--space-3)',
              }}
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ui-btn ui-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ui-btn ui-btn-primary"
            >
              {isSubmitting ? 'Creating Project...' : 'Create & Open Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
