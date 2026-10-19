import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { WorkspaceViewMode } from '../lib/projectState';
import {
  WorkspaceDomain,
  getDomainForViewMode,
  getDefaultViewModeForDomain,
} from '../lib/router/domain-mapping';

export interface WorkspaceRouterState {
  activeDomain: WorkspaceDomain;
  activeViewMode: WorkspaceViewMode;
}

export interface WorkspaceRouterContextValue {
  activeDomain: WorkspaceDomain;
  activeViewMode: WorkspaceViewMode;
  navigateToDomain: (domain: WorkspaceDomain) => void;
  navigateToView: (viewMode: WorkspaceViewMode) => void;
  setViewMode: (viewMode: WorkspaceViewMode) => void;
  resetWorkspace: () => void;
}

const WorkspaceRouterContext = createContext<WorkspaceRouterContextValue | null>(null);

export interface WorkspaceRouterProviderProps {
  children: ReactNode;
  initialViewMode?: WorkspaceViewMode;
  onChange?: (viewMode: WorkspaceViewMode, domain: WorkspaceDomain) => void;
}

export function WorkspaceRouterProvider({
  children,
  initialViewMode = 'graph',
  onChange,
}: WorkspaceRouterProviderProps): JSX.Element {
  const [activeViewMode, setActiveViewModeState] = useState<WorkspaceViewMode>(initialViewMode);
  const [activeDomain, setActiveDomainState] = useState<WorkspaceDomain>(() =>
    getDomainForViewMode(initialViewMode)
  );

  const setViewMode = useCallback(
    (viewMode: WorkspaceViewMode) => {
      const domain = getDomainForViewMode(viewMode);
      setActiveViewModeState(viewMode);
      setActiveDomainState(domain);
      if (onChange) {
        onChange(viewMode, domain);
      }
    },
    [onChange]
  );

  const navigateToDomain = useCallback(
    (domain: WorkspaceDomain) => {
      const defaultView = getDefaultViewModeForDomain(domain);
      setViewMode(defaultView);
    },
    [setViewMode]
  );

  const navigateToView = useCallback(
    (viewMode: WorkspaceViewMode) => {
      setViewMode(viewMode);
    },
    [setViewMode]
  );

  const resetWorkspace = useCallback(() => {
    setViewMode('graph');
  }, [setViewMode]);

  const value = useMemo<WorkspaceRouterContextValue>(
    () => ({
      activeDomain,
      activeViewMode,
      navigateToDomain,
      navigateToView,
      setViewMode,
      resetWorkspace,
    }),
    [activeDomain, activeViewMode, navigateToDomain, navigateToView, setViewMode, resetWorkspace]
  );

  return (
    <WorkspaceRouterContext.Provider value={value}>
      {children}
    </WorkspaceRouterContext.Provider>
  );
}

export function useWorkspaceRouterOptional(): WorkspaceRouterContextValue | null {
  return useContext(WorkspaceRouterContext);
}

export function useWorkspaceRouter(): WorkspaceRouterContextValue {
  const context = useContext(WorkspaceRouterContext);
  if (!context) {
    throw new Error('useWorkspaceRouter must be used within a WorkspaceRouterProvider');
  }
  return context;
}
