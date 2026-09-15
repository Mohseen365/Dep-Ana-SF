import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  ProjectUIState,
  SelectedComponentState,
  FilterUIState,
  GraphLayoutState,
  ZoomPanState,
  SidebarUIState,
  InspectorUIState,
  NavigatorUIState,
  AnalysisViewUIState,
  ComparisonUIState,
  loadProjectState,
  saveProjectState,
  createDefaultProjectUIState,
  clearProjectState,
} from '../lib/projectState';

export interface ProjectStateContextValue {
  activeProjectId: string;
  projectState: ProjectUIState;
  updateSelectedComponent: (update: Partial<SelectedComponentState>) => void;
  updateFilters: (update: Partial<FilterUIState>) => void;
  updateGraphLayout: (update: Partial<GraphLayoutState>) => void;
  updateZoom: (update: Partial<ZoomPanState>) => void;
  updateSidebarState: (update: Partial<SidebarUIState>) => void;
  updateInspectorState: (update: Partial<InspectorUIState>) => void;
  updateNavigatorState: (update: Partial<NavigatorUIState>) => void;
  updateAnalysisView: (update: Partial<AnalysisViewUIState>) => void;
  updateComparisonState: (update: Partial<ComparisonUIState>) => void;
  resetProjectState: (targetProjectId?: string) => void;
  switchProjectState: (newProjectId: string) => void;
}

const ProjectStateContext = createContext<ProjectStateContextValue | null>(null);

function getInitialProjectIdFromUrlOrStorage(): string {
  if (typeof window === 'undefined') return 'default';
  try {
    const params = new URLSearchParams(window.location.search);
    const urlProj = params.get('project');
    if (urlProj) return urlProj;

    const saved = localStorage.getItem('explorer.activeProjectId');
    if (saved) return saved;
  } catch (_) {
    // Ignore
  }
  return 'default';
}

export interface ProjectStateProviderProps {
  children: React.ReactNode;
  projectId?: string;
  initialState?: Partial<ProjectUIState>;
}

export const ProjectStateProvider: React.FC<ProjectStateProviderProps> = ({
  children,
  projectId: externalProjectId,
  initialState,
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return externalProjectId || getInitialProjectIdFromUrlOrStorage();
  });

  const activeProjectIdRef = useRef<string>(activeProjectId);
  activeProjectIdRef.current = activeProjectId;

  const [projectState, setProjectState] = useState<ProjectUIState>(() => {
    const loaded = loadProjectState(activeProjectId);
    if (initialState) {
      return {
        ...loaded,
        ...initialState,
        projectId: activeProjectId,
      };
    }
    return loaded;
  });

  const projectStateRef = useRef<ProjectUIState>(projectState);
  projectStateRef.current = projectState;

  // Sync when externalProjectId prop changes directly
  useEffect(() => {
    if (externalProjectId && externalProjectId !== activeProjectIdRef.current) {
      // Save current project state first
      saveProjectState(activeProjectIdRef.current, projectStateRef.current);

      // Load new project state
      const targetState = loadProjectState(externalProjectId);
      setActiveProjectId(externalProjectId);
      setProjectState(targetState);

      // Dispatch state restored event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('explorer:project-state-restored', {
            detail: { projectId: externalProjectId, projectState: targetState },
          })
        );
      }
    }
  }, [externalProjectId]);

  // Listen to window custom event 'explorer:project-changed'
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleProjectChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ projectId: string }>;
      const newId = customEvent.detail?.projectId;

      if (newId && newId !== activeProjectIdRef.current) {
        // Persist current project state before switching
        saveProjectState(activeProjectIdRef.current, projectStateRef.current);

        // Load new project state
        const restored = loadProjectState(newId);
        setActiveProjectId(newId);
        setProjectState(restored);

        window.dispatchEvent(
          new CustomEvent('explorer:project-state-restored', {
            detail: { projectId: newId, projectState: restored },
          })
        );
      }
    };

    window.addEventListener('explorer:project-changed', handleProjectChanged);
    return () => {
      window.removeEventListener('explorer:project-changed', handleProjectChanged);
    };
  }, []);

  const switchProjectState = useCallback((newProjectId: string) => {
    if (!newProjectId || newProjectId === activeProjectIdRef.current) return;

    // Save active state
    saveProjectState(activeProjectIdRef.current, projectStateRef.current);

    // Load new state
    const restored = loadProjectState(newProjectId);
    setActiveProjectId(newProjectId);
    setProjectState(restored);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('explorer:project-state-restored', {
          detail: { projectId: newProjectId, projectState: restored },
        })
      );
    }
  }, []);

  const updateStateSlice = useCallback(
    <K extends keyof ProjectUIState>(sliceKey: K, update: Partial<ProjectUIState[K]>) => {
      setProjectState((prev) => {
        const nextSlice = typeof prev[sliceKey] === 'object' && prev[sliceKey] !== null
          ? { ...prev[sliceKey], ...update }
          : update;

        const nextState: ProjectUIState = {
          ...prev,
          [sliceKey]: nextSlice,
          updatedAt: new Date().toISOString(),
        };

        // Persist atomically to project-scoped storage
        saveProjectState(prev.projectId, nextState);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('explorer:project-state-changed', {
              detail: { projectId: prev.projectId, projectState: nextState },
            })
          );
        }

        return nextState;
      });
    },
    []
  );

  const updateSelectedComponent = useCallback(
    (update: Partial<SelectedComponentState>) => {
      updateStateSlice('selectedComponent', update);
    },
    [updateStateSlice]
  );

  const updateFilters = useCallback(
    (update: Partial<FilterUIState>) => {
      updateStateSlice('filters', update);
    },
    [updateStateSlice]
  );

  const updateGraphLayout = useCallback(
    (update: Partial<GraphLayoutState>) => {
      updateStateSlice('graphLayout', update);
    },
    [updateStateSlice]
  );

  const updateZoom = useCallback(
    (update: Partial<ZoomPanState>) => {
      updateStateSlice('zoom', update);
    },
    [updateStateSlice]
  );

  const updateSidebarState = useCallback(
    (update: Partial<SidebarUIState>) => {
      updateStateSlice('sidebarState', update);
    },
    [updateStateSlice]
  );

  const updateInspectorState = useCallback(
    (update: Partial<InspectorUIState>) => {
      updateStateSlice('inspectorState', update);
    },
    [updateStateSlice]
  );

  const updateNavigatorState = useCallback(
    (update: Partial<NavigatorUIState>) => {
      updateStateSlice('navigatorState', update);
    },
    [updateStateSlice]
  );

  const updateAnalysisView = useCallback(
    (update: Partial<AnalysisViewUIState>) => {
      updateStateSlice('analysisView', update);
    },
    [updateStateSlice]
  );

  const updateComparisonState = useCallback(
    (update: Partial<ComparisonUIState>) => {
      updateStateSlice('comparisonState', update);
    },
    [updateStateSlice]
  );

  const resetProjectState = useCallback((targetProjectId?: string) => {
    const id = targetProjectId || activeProjectIdRef.current;
    clearProjectState(id);
    const defaults = createDefaultProjectUIState(id);
    if (id === activeProjectIdRef.current) {
      setProjectState(defaults);
    }
  }, []);

  const value = useMemo(
    () => ({
      activeProjectId,
      projectState,
      updateSelectedComponent,
      updateFilters,
      updateGraphLayout,
      updateZoom,
      updateSidebarState,
      updateInspectorState,
      updateNavigatorState,
      updateAnalysisView,
      updateComparisonState,
      resetProjectState,
      switchProjectState,
    }),
    [
      activeProjectId,
      projectState,
      updateSelectedComponent,
      updateFilters,
      updateGraphLayout,
      updateZoom,
      updateSidebarState,
      updateInspectorState,
      updateNavigatorState,
      updateAnalysisView,
      updateComparisonState,
      resetProjectState,
      switchProjectState,
    ]
  );

  return (
    <ProjectStateContext.Provider value={value}>
      {children}
    </ProjectStateContext.Provider>
  );
};

export function useProjectState(): ProjectStateContextValue {
  const context = useContext(ProjectStateContext);
  if (!context) {
    throw new Error('useProjectState must be used within a ProjectStateProvider');
  }
  return context;
}
