import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ProjectMetadata, MultiProjectManifest } from '../types/explorer';

export interface ProjectContextValue {
  projects: ProjectMetadata[];
  activeProject: ProjectMetadata | null;
  activeProjectId: string;
  loading: boolean;
  error: Error | null;
  selectProject: (projectId: string) => void;
  createProject: (
    input: {
      name: string;
      id?: string;
      description?: string;
      sourcePath?: string;
    }
  ) => Promise<ProjectMetadata>;
  refreshProjects: () => Promise<void>;
  getProjectDataUrl: (projectId?: string) => string;
}

export const DEFAULT_PROJECT: ProjectMetadata = {
  id: 'default',
  name: 'Default Salesforce Project',
  description: 'Primary Salesforce DX package directory',
  sourcePath: 'force-app/main/default',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  lastAnalyzedAt: null,
  analysisStatus: 'COMPLETE',
  componentCount: 0,
  dependencyCount: 0,
  analysisPath: '/explorer-data.json',
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

const ACTIVE_PROJECT_KEY = 'explorer.activeProjectId';
const LOCAL_PROJECTS_KEY = 'explorer.localProjects';

function getInitialProjectId(): string {
  if (typeof window === 'undefined') return DEFAULT_PROJECT.id;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlProject = urlParams.get('project');
    if (urlProject) return urlProject;

    const savedProject = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (savedProject) return savedProject;
  } catch (_) {
    // Ignore storage/URL access errors
  }
  return DEFAULT_PROJECT.id;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const ProjectProvider: React.FC<{
  children: React.ReactNode;
  initialProjectId?: string;
  manifestUrl?: string;
}> = ({ children, initialProjectId, manifestUrl = '/project-manifest.json' }) => {
  const [projects, setProjects] = useState<ProjectMetadata[]>([DEFAULT_PROJECT]);
  const [activeProjectId, setActiveProjectId] = useState<string>(
    initialProjectId || getInitialProjectId()
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    let manifestProjects: ProjectMetadata[] = [];
    let activeIdFromManifest: string | null = null;

    try {
      const res = await fetch(manifestUrl);
      if (res.ok) {
        const manifest: MultiProjectManifest = await res.json();
        if (Array.isArray(manifest.projects) && manifest.projects.length > 0) {
          manifestProjects = manifest.projects;
        }
        if (manifest.activeProjectId) {
          activeIdFromManifest = manifest.activeProjectId;
        }
      }
    } catch (_) {
      // Manifest load failure - fallback to local storage or defaults
    }

    // Read client-side created projects from localStorage
    let localProjects: ProjectMetadata[] = [];
    try {
      const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
      if (stored) {
        localProjects = JSON.parse(stored);
      }
    } catch (_) {
      // Ignore
    }

    // Merge projects by ID
    const mergedMap = new Map<string, ProjectMetadata>();
    mergedMap.set(DEFAULT_PROJECT.id, DEFAULT_PROJECT);

    manifestProjects.forEach((p) => mergedMap.set(p.id, p));
    localProjects.forEach((p) => mergedMap.set(p.id, p));

    const allProjects = Array.from(mergedMap.values());
    setProjects(allProjects);

    // Determine target active project
    const currentId = initialProjectId || getInitialProjectId();
    const validId = mergedMap.has(currentId)
      ? currentId
      : activeIdFromManifest && mergedMap.has(activeIdFromManifest)
      ? activeIdFromManifest
      : DEFAULT_PROJECT.id;

    setActiveProjectId(validId);
    setLoading(false);
  }, [manifestUrl, initialProjectId]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const selectProject = useCallback(
    (projectId: string) => {
      setActiveProjectId(projectId);

      try {
        localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);

        // Update URL query parameter
        if (typeof window !== 'undefined' && window.history) {
          const url = new URL(window.location.href);
          if (url.searchParams.get('project') !== projectId) {
            url.searchParams.set('project', projectId);
            // Clear single-project component selection on project switch for isolation
            url.searchParams.delete('node');
            url.searchParams.delete('finding');
            window.history.pushState({}, '', url.toString());
          }
        }

        // Notify app of project change
        window.dispatchEvent(
          new CustomEvent('explorer:project-changed', {
            detail: { projectId },
          })
        );
      } catch (_) {
        // Storage / history failure
      }
    },
    []
  );

  const createProject = useCallback(
    async (input: {
      name: string;
      id?: string;
      description?: string;
      sourcePath?: string;
    }): Promise<ProjectMetadata> => {
      const rawId = input.id || slugify(input.name) || `project-${Date.now()}`;
      const id = slugify(rawId);

      const now = new Date().toISOString();
      const newProject: ProjectMetadata = {
        id,
        name: input.name.trim(),
        description: input.description?.trim() || '',
        sourcePath: input.sourcePath?.trim() || 'force-app/main/default',
        createdAt: now,
        updatedAt: now,
        lastAnalyzedAt: null,
        analysisStatus: 'NOT_ANALYZED',
        componentCount: 0,
        dependencyCount: 0,
        analysisPath: `/projects/${id}/explorer-data.json`,
      };

      setProjects((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === id);
        let updated: ProjectMetadata[];
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = newProject;
        } else {
          updated = [...prev, newProject];
        }

        try {
          const customOnly = updated.filter((p) => p.id !== DEFAULT_PROJECT.id);
          localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(customOnly));
        } catch (_) {
          // Ignore
        }

        return updated;
      });

      selectProject(id);
      return newProject;
    },
    [selectProject]
  );

  const getProjectDataUrl = useCallback(
    (projectId?: string): string => {
      const targetId = projectId || activeProjectId;
      if (targetId === 'default' || !targetId) {
        return '/explorer-data.json';
      }
      const proj = projects.find((p) => p.id === targetId);
      if (proj && proj.analysisPath) {
        return proj.analysisPath;
      }
      return `/projects/${targetId}/explorer-data.json`;
    },
    [activeProjectId, projects]
  );

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || DEFAULT_PROJECT;
  }, [projects, activeProjectId]);

  const value = useMemo(
    () => ({
      projects,
      activeProject,
      activeProjectId,
      loading,
      error,
      selectProject,
      createProject,
      refreshProjects,
      getProjectDataUrl,
    }),
    [
      projects,
      activeProject,
      activeProjectId,
      loading,
      error,
      selectProject,
      createProject,
      refreshProjects,
      getProjectDataUrl,
    ]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
