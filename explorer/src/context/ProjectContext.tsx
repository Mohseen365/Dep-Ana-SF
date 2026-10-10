import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { ProjectMetadata, MultiProjectManifest } from "../types/explorer";

export interface ProjectContextValue {
  projects: ProjectMetadata[];
  recentProjects: ProjectMetadata[];
  activeProject: ProjectMetadata | null;
  activeProjectId: string;
  loading: boolean;
  error: Error | null;
  clearError: () => void;
  selectProject: (projectId: string) => void;
  createProject: (input: {
    name: string;
    id?: string;
    description?: string;
    sourcePath?: string;
  }) => Promise<ProjectMetadata>;
  updateProject: (
    id: string,
    updates: Partial<
      Pick<ProjectMetadata, "name" | "description" | "sourcePath">
    >,
  ) => Promise<ProjectMetadata>;
  reanalyzeProject: (id: string) => Promise<ProjectMetadata>;
  duplicateProject: (id: string) => Promise<ProjectMetadata>;
  archiveProject: (id: string, archive?: boolean) => Promise<ProjectMetadata>;
  deleteProject: (id: string) => Promise<void>;
  exportProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  getProjectDataUrl: (projectId?: string) => string;
}

export const DEFAULT_PROJECT: ProjectMetadata = {
  id: "default",
  name: "Default Salesforce Project",
  description: "Primary Salesforce DX package directory",
  sourcePath: "force-app/main/default",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  lastAnalyzedAt: null,
  analysisStatus: "COMPLETE",
  componentCount: 0,
  dependencyCount: 0,
  analysisPath: "/explorer-data.json",
};
function getInitialProjectId(): string {
  if (typeof window === "undefined") return DEFAULT_PROJECT.id;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlProject = urlParams.get("project");
    if (urlProject) return slugify(urlProject) || DEFAULT_PROJECT.id;

    const savedProject = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (savedProject) return slugify(savedProject) || DEFAULT_PROJECT.id;
  } catch (_) {
    // Ignore storage/URL access errors
  }
  return DEFAULT_PROJECT.id;
}
const ProjectContext = createContext<ProjectContextValue | null>(null);

const ACTIVE_PROJECT_KEY = "explorer.activeProjectId";
const RECENT_PROJECTS_KEY = "explorer.recentProjectIds";
const LOCAL_PROJECTS_KEY = "explorer.localProjects";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getStoredRecentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed))
        return parsed.map((x) => slugify(String(x))).filter(Boolean);
    }
  } catch (_) {
    // Ignore
  }
  return [];
}

export const ProjectProvider: React.FC<{
  children: React.ReactNode;
  initialProjectId?: string;
  manifestUrl?: string;
}> = ({
  children,
  initialProjectId,
  manifestUrl = "/project-manifest.json",
}) => {
  const [projects, setProjects] = useState<ProjectMetadata[]>([
    DEFAULT_PROJECT,
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string>(
    initialProjectId
      ? slugify(initialProjectId) || DEFAULT_PROJECT.id
      : getInitialProjectId(),
  );
  const [recentIds, setRecentIds] = useState<string[]>(getStoredRecentIds());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
          activeIdFromManifest = slugify(manifest.activeProjectId);
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

    manifestProjects.forEach((p) => {
      const pId = slugify(p.id) || p.id;
      mergedMap.set(pId, {
        ...p,
        id: pId,
        analysisPath:
          p.analysisPath ||
          (pId === "pbim"
            ? "/pbim/explorer-data.json"
            : pId !== "default"
              ? `/projects/${pId}/explorer-data.json`
              : "/explorer-data.json"),
      });
    });

    localProjects.forEach((p) => {
      const pId = slugify(p.id) || p.id;
      mergedMap.set(pId, {
        ...p,
        id: pId,
        analysisPath:
          p.analysisPath ||
          (pId === "pbim"
            ? "/pbim/explorer-data.json"
            : pId !== "default"
              ? `/projects/${pId}/explorer-data.json`
              : "/explorer-data.json"),
      });
    });

    const allProjects = Array.from(mergedMap.values());
    setProjects(allProjects);

    // Determine target active project
    const currentId = initialProjectId
      ? slugify(initialProjectId)
      : getInitialProjectId();
    const validId = mergedMap.has(currentId)
      ? currentId
      : currentId !== DEFAULT_PROJECT.id
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

  const selectProject = useCallback((projectId: string) => {
    const targetId = slugify(projectId) || DEFAULT_PROJECT.id;
    setActiveProjectId(targetId);

    try {
      localStorage.setItem(ACTIVE_PROJECT_KEY, targetId);

      // Update recent IDs
      setRecentIds((prev) => {
        const updated = [
          targetId,
          ...prev.filter((id) => id !== targetId),
        ].slice(0, 5);
        try {
          localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
        } catch (_) {
          // Ignore
        }
        return updated;
      });

      // Update URL query parameter
      if (typeof window !== "undefined" && window.history) {
        const url = new URL(window.location.href);
        if (url.searchParams.get("project") !== targetId) {
          url.searchParams.set("project", targetId);
          // Clear single-project component selection on project switch for isolation
          url.searchParams.delete("node");
          url.searchParams.delete("finding");
          window.history.pushState(
            {},
            "",
            url.pathname + url.search + url.hash,
          );
        }
      }

      // Notify app of project change
      window.dispatchEvent(
        new CustomEvent("explorer:project-changed", {
          detail: { projectId: targetId },
        }),
      );
    } catch (_) {
      // Storage / history failure
    }
  }, []);

  const createProject = useCallback(
    async (input: {
      name: string;
      id?: string;
      description?: string;
      sourcePath?: string;
    }): Promise<ProjectMetadata> => {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        const err = new Error("Project name cannot be empty");
        setError(err);
        throw err;
      }

      const rawId = input.id?.trim() || slugify(trimmedName);
      const id = slugify(rawId);

      if (!id) {
        const err = new Error("Invalid project ID generated");
        setError(err);
        throw err;
      }

      const now = new Date().toISOString();
      const newProject: ProjectMetadata = {
        id,
        name: trimmedName,
        description: input.description?.trim() || "",
        sourcePath: input.sourcePath?.trim() || "force-app/main/default",
        createdAt: now,
        updatedAt: now,
        lastAnalyzedAt: null,
        analysisStatus: "NOT_ANALYZED",
        componentCount: 0,
        dependencyCount: 0,
        analysisPath:
          id !== "default"
            ? `/projects/${id}/explorer-data.json`
            : "/explorer-data.json",
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

      try {
        const customOnly = projects
          .concat(newProject)
          .filter((p) => p.id !== DEFAULT_PROJECT.id);
        localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(customOnly));
      } catch (_) {}

      selectProject(id);
      return newProject;
    },
    [selectProject, projects],
  );

  const saveLocalProjects = (updatedProjects: ProjectMetadata[]) => {
    try {
      const customOnly = updatedProjects.filter(
        (p) => p.id !== DEFAULT_PROJECT.id,
      );
      localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(customOnly));
    } catch (_) {
      // Ignore
    }
  };

  const getProjectDataUrl = useCallback(
    (projectId?: string): string => {
      const rawId = projectId || activeProjectId;
      const targetId = slugify(rawId) || DEFAULT_PROJECT.id;
      if (targetId === "default") {
        return "/explorer-data.json";
      }
      const proj = projects.find((p) => p.id === targetId);
      if (proj && proj.analysisPath) {
        return proj.analysisPath;
      }
      if (targetId === "pbim") {
        return "/pbim/explorer-data.json";
      }
      return `/projects/${targetId}/explorer-data.json`;
    },
    [activeProjectId, projects],
  );

  const updateProject = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<ProjectMetadata, "name" | "description" | "sourcePath">
      >,
    ): Promise<ProjectMetadata> => {
      const targetId = slugify(id);
      const existing = projects.find((p) => p.id === targetId);
      if (!existing) {
        throw new Error(`Project "${id}" not found`);
      }
      const now = new Date().toISOString();
      const updatedProject: ProjectMetadata = {
        ...existing,
        name: updates.name !== undefined ? updates.name.trim() : existing.name,
        description:
          updates.description !== undefined
            ? updates.description.trim()
            : existing.description,
        sourcePath:
          updates.sourcePath !== undefined
            ? updates.sourcePath.trim()
            : existing.sourcePath,
        updatedAt: now,
      };

      setProjects((prev) => {
        const next = prev.map((p) => (p.id === targetId ? updatedProject : p));
        saveLocalProjects(next);
        return next;
      });

      return updatedProject;
    },
    [projects],
  );

  const reanalyzeProject = useCallback(
    async (id: string): Promise<ProjectMetadata> => {
      const targetId = slugify(id);
      const now = new Date().toISOString();
      let projectToReanalyze = projects.find((p) => p.id === targetId);
      if (!projectToReanalyze) throw new Error(`Project "${id}" not found`);

      // Set state to ANALYZING first
      setProjects((prev) => {
        const next = prev.map((p) =>
          p.id === targetId
            ? { ...p, analysisStatus: "ANALYZING" as const, updatedAt: now }
            : p,
        );
        saveLocalProjects(next);
        return next;
      });

      try {
        const url = getProjectDataUrl(targetId);
        const res = await fetch(url);
        let componentCount = projectToReanalyze.componentCount;
        let dependencyCount = projectToReanalyze.dependencyCount;
        let status: ProjectMetadata["analysisStatus"] = "COMPLETE";

        if (res.ok) {
          const data = await res.json();
          componentCount =
            data?.summary?.nodeCount ?? data?.nodes?.length ?? componentCount;
          dependencyCount =
            data?.summary?.edgeCount ?? data?.edges?.length ?? dependencyCount;
        }

        const completionTime = new Date().toISOString();
        let updated: ProjectMetadata | null = null;

        setProjects((prev) => {
          const next = prev.map((p) => {
            if (p.id === targetId) {
              updated = {
                ...p,
                analysisStatus: status,
                componentCount,
                dependencyCount,
                lastAnalyzedAt: completionTime,
                updatedAt: completionTime,
              };
              return updated;
            }
            return p;
          });
          saveLocalProjects(next);
          return next;
        });

        if (updated) return updated;
        return {
          ...projectToReanalyze,
          analysisStatus: status,
          componentCount,
          dependencyCount,
          lastAnalyzedAt: completionTime,
          updatedAt: completionTime,
        };
      } catch (_) {
        const completionTime = new Date().toISOString();
        let updated: ProjectMetadata | null = null;
        setProjects((prev) => {
          const next = prev.map((p) => {
            if (p.id === targetId) {
              updated = {
                ...p,
                analysisStatus: p.componentCount > 0 ? "COMPLETE" : "FAILED",
                lastAnalyzedAt: completionTime,
                updatedAt: completionTime,
              };
              return updated;
            }
            return p;
          });
          saveLocalProjects(next);
          return next;
        });
        if (updated) return updated;
        return {
          ...projectToReanalyze,
          analysisStatus: "COMPLETE",
          lastAnalyzedAt: completionTime,
          updatedAt: completionTime,
        };
      }
    },
    [projects, getProjectDataUrl],
  );

  const duplicateProject = useCallback(
    async (id: string): Promise<ProjectMetadata> => {
      const targetId = slugify(id);
      const source = projects.find((p) => p.id === targetId);
      if (!source) throw new Error(`Project "${id}" not found`);

      const baseNewId = `${targetId}-copy`;
      let newId = baseNewId;
      let counter = 1;
      while (projects.some((p) => p.id === newId)) {
        counter++;
        newId = `${baseNewId}-${counter}`;
      }

      const now = new Date().toISOString();
      const duplicate: ProjectMetadata = {
        ...source,
        id: newId,
        name: `${source.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
        analysisPath: `/projects/${newId}/explorer-data.json`,
      };

      setProjects((prev) => {
        const next = [...prev, duplicate];
        saveLocalProjects(next);
        return next;
      });

      return duplicate;
    },
    [projects],
  );

  const archiveProject = useCallback(
    async (id: string, archive: boolean = true): Promise<ProjectMetadata> => {
      const targetId = slugify(id);
      const existing = projects.find((p) => p.id === targetId);
      if (!existing) throw new Error(`Project "${id}" not found`);

      const now = new Date().toISOString();
      const updatedProject: ProjectMetadata = {
        ...existing,
        isArchived: archive,
        updatedAt: now,
      };

      setProjects((prev) => {
        const next = prev.map((p) => (p.id === targetId ? updatedProject : p));
        saveLocalProjects(next);
        return next;
      });

      return updatedProject;
    },
    [projects],
  );

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      const targetId = slugify(id);
      setProjects((prev) => {
        const next = prev.filter((p) => p.id !== targetId);
        saveLocalProjects(next);
        return next;
      });

      setRecentIds((prev) => {
        const updated = prev.filter((rId) => rId !== targetId);
        try {
          localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      if (activeProjectId === targetId) {
        const remaining = projects.filter((p) => p.id !== targetId);
        const fallbackId =
          remaining.length > 0 ? remaining[0].id : DEFAULT_PROJECT.id;
        selectProject(fallbackId);
      }
    },
    [activeProjectId, projects, selectProject],
  );

  const exportProject = useCallback(
    async (id: string): Promise<void> => {
      const targetId = slugify(id);
      const proj = projects.find((p) => p.id === targetId);
      if (!proj) throw new Error(`Project "${id}" not found`);

      let dataPayload: any = null;
      try {
        const url = getProjectDataUrl(targetId);
        const res = await fetch(url);
        if (res.ok) {
          dataPayload = await res.json();
        }
      } catch (_) {}

      const exportObject = {
        manifestVersion: "1.0.0",
        exportedAt: new Date().toISOString(),
        project: proj,
        data: dataPayload,
      };

      const jsonString = JSON.stringify(exportObject, null, 2);
      if (typeof window !== "undefined" && window.document) {
        const blob = new Blob([jsonString], { type: "application/json" });
        const createUrl =
          typeof URL.createObjectURL === "function"
            ? URL.createObjectURL
            : () =>
                "data:application/json;charset=utf-8," +
                encodeURIComponent(jsonString);
        const downloadUrl = createUrl(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${proj.id}-project-export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (
          typeof URL.revokeObjectURL === "function" &&
          downloadUrl.startsWith("blob:")
        ) {
          URL.revokeObjectURL(downloadUrl);
        }
      }
    },
    [projects, getProjectDataUrl],
  );

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || DEFAULT_PROJECT;
  }, [projects, activeProjectId]);

  const recentProjects = useMemo(() => {
    const result: ProjectMetadata[] = [];
    recentIds.forEach((id) => {
      if (id !== activeProjectId) {
        const found = projects.find((p) => p.id === id);
        if (found) result.push(found);
      }
    });
    return result;
  }, [recentIds, projects, activeProjectId]);

  const value = useMemo(
    () => ({
      projects,
      recentProjects,
      activeProject,
      activeProjectId,
      loading,
      error,
      clearError,
      selectProject,
      createProject,
      updateProject,
      reanalyzeProject,
      duplicateProject,
      archiveProject,
      deleteProject,
      exportProject,
      refreshProjects,
      getProjectDataUrl,
    }),
    [
      projects,
      recentProjects,
      activeProject,
      activeProjectId,
      loading,
      error,
      clearError,
      selectProject,
      createProject,
      updateProject,
      reanalyzeProject,
      duplicateProject,
      archiveProject,
      deleteProject,
      exportProject,
      refreshProjects,
      getProjectDataUrl,
    ],
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
