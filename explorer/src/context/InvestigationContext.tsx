import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { FocusState, createEmptyFocusState } from '../lib/focus-graph';
import { ImpactState, createEmptyImpactState } from '../lib/impact-analysis';
import { ConnectionQueryState } from '../lib/url';

export type DrawerTab = 'overview' | 'dependencies' | 'dependents' | 'evidence' | 'actions';

export interface DrawerState {
  isOpen: boolean;
  activeTab: DrawerTab;
  isPinned: boolean;
  isDetached: boolean;
}

export interface InvestigationState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedFindingId: string | null;
  selectedCycleId: string | null;
  selectedUnresolvedEdgeId: string | null;

  selectionHistory: string[]; // Max 20 entries
  recentNodeIds: string[];    // Max 10 entries
  drillPath: string[];

  drawerState: DrawerState;

  focusState: FocusState;
  impactState: ImpactState;
  connectionState: ConnectionQueryState;
}

export type InvestigationAction =
  | { type: 'SELECT_NODE'; payload: { nodeId: string | null } }
  | { type: 'SELECT_EDGE'; payload: { edgeId: string | null } }
  | { type: 'SELECT_FINDING'; payload: { findingId: string | null; associatedNodeId?: string | null } }
  | { type: 'SELECT_CYCLE'; payload: { cycleId: string | null; associatedNodeId?: string | null } }
  | { type: 'SELECT_UNRESOLVED_EDGE'; payload: { edgeId: string | null; associatedNodeId?: string | null } }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_FOCUS'; payload: Partial<FocusState> }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'SET_IMPACT'; payload: Partial<ImpactState> }
  | { type: 'CLEAR_IMPACT' }
  | { type: 'SET_CONNECTION'; payload: Partial<ConnectionQueryState> }
  | { type: 'CLEAR_CONNECTION' }
  | { type: 'OPEN_INVESTIGATION_DRAWER'; payload?: { tab?: DrawerTab } }
  | { type: 'CLOSE_INVESTIGATION_DRAWER' }
  | { type: 'SET_DRAWER_PINNED'; payload: boolean }
  | { type: 'SET_DRAWER_DETACHED'; payload: boolean }
  | { type: 'DRILL_INTO_COMPONENT'; payload: { nodeId: string } }
  | { type: 'NAVIGATE_BREADCRUMB'; payload: { index: number } }
  | { type: 'RESET_INVESTIGATION_CONTEXT' };

export const initialInvestigationState: InvestigationState = {
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedFindingId: null,
  selectedCycleId: null,
  selectedUnresolvedEdgeId: null,

  selectionHistory: [],
  recentNodeIds: [],
  drillPath: [],

  drawerState: {
    isOpen: false,
    activeTab: 'overview',
    isPinned: false,
    isDetached: false,
  },

  focusState: createEmptyFocusState(),
  impactState: createEmptyImpactState(),
  connectionState: {
    direction: 'both',
    depth: 2,
  },
};

function pushSelectionHistory(history: string[], id: string): string[] {
  if (history.length > 0 && history[history.length - 1] === id) {
    return history;
  }
  const next = [...history, id];
  return next.length > 20 ? next.slice(next.length - 20) : next;
}

function pushRecentNodeIds(recent: string[], id: string): string[] {
  const filtered = recent.filter((item) => item !== id);
  return [id, ...filtered].slice(0, 10);
}

export function investigationReducer(
  state: InvestigationState,
  action: InvestigationAction
): InvestigationState {
  switch (action.type) {
    case 'SELECT_NODE': {
      const { nodeId } = action.payload;
      if (nodeId === null) {
        return {
          ...state,
          selectedNodeId: null,
          drawerState: {
            ...state.drawerState,
            isOpen: state.drawerState.isPinned,
          },
        };
      }
      return {
        ...state,
        selectedNodeId: nodeId,
        selectedEdgeId: null,
        selectionHistory: pushSelectionHistory(state.selectionHistory, nodeId),
        recentNodeIds: pushRecentNodeIds(state.recentNodeIds, nodeId),
        drillPath: [nodeId],
        drawerState: {
          ...state.drawerState,
          isOpen: true,
        },
      };
    }

    case 'SELECT_EDGE': {
      const { edgeId } = action.payload;
      if (edgeId === null) {
        return {
          ...state,
          selectedEdgeId: null,
        };
      }
      return {
        ...state,
        selectedEdgeId: edgeId,
        selectedNodeId: null,
      };
    }

    case 'SELECT_FINDING': {
      const { findingId, associatedNodeId } = action.payload;
      if (findingId === null) {
        return {
          ...state,
          selectedFindingId: null,
        };
      }
      let newState = {
        ...state,
        selectedFindingId: findingId,
      };
      if (associatedNodeId) {
        newState = {
          ...newState,
          selectedNodeId: associatedNodeId,
          selectedEdgeId: null,
          selectionHistory: pushSelectionHistory(newState.selectionHistory, associatedNodeId),
          recentNodeIds: pushRecentNodeIds(newState.recentNodeIds, associatedNodeId),
          drillPath: [associatedNodeId],
        };
      }
      return newState;
    }

    case 'SELECT_CYCLE': {
      const { cycleId, associatedNodeId } = action.payload;
      if (cycleId === null) {
        return {
          ...state,
          selectedCycleId: null,
        };
      }
      let newState = {
        ...state,
        selectedCycleId: cycleId,
      };
      if (associatedNodeId) {
        newState = {
          ...newState,
          selectedNodeId: associatedNodeId,
          selectedEdgeId: null,
          selectionHistory: pushSelectionHistory(newState.selectionHistory, associatedNodeId),
          recentNodeIds: pushRecentNodeIds(newState.recentNodeIds, associatedNodeId),
          drillPath: [associatedNodeId],
        };
      }
      return newState;
    }

    case 'SELECT_UNRESOLVED_EDGE': {
      const { edgeId, associatedNodeId } = action.payload;
      if (edgeId === null) {
        return {
          ...state,
          selectedUnresolvedEdgeId: null,
        };
      }
      let newState = {
        ...state,
        selectedUnresolvedEdgeId: edgeId,
        selectedEdgeId: edgeId,
      };
      if (associatedNodeId) {
        newState = {
          ...newState,
          selectedNodeId: associatedNodeId,
          selectionHistory: pushSelectionHistory(newState.selectionHistory, associatedNodeId),
          recentNodeIds: pushRecentNodeIds(newState.recentNodeIds, associatedNodeId),
          drillPath: [associatedNodeId],
        };
      }
      return newState;
    }

    case 'CLEAR_SELECTION': {
      return {
        ...state,
        selectedNodeId: null,
        selectedEdgeId: null,
        selectedFindingId: null,
        selectedCycleId: null,
        selectedUnresolvedEdgeId: null,
        drillPath: [],
        drawerState: {
          ...state.drawerState,
          isOpen: state.drawerState.isPinned,
        },
      };
    }

    case 'SET_FOCUS': {
      return {
        ...state,
        focusState: {
          ...state.focusState,
          ...action.payload,
          enabled: true,
        },
      };
    }

    case 'CLEAR_FOCUS': {
      return {
        ...state,
        focusState: createEmptyFocusState(),
      };
    }

    case 'SET_IMPACT': {
      return {
        ...state,
        impactState: {
          ...state.impactState,
          ...action.payload,
          enabled: true,
        },
      };
    }

    case 'CLEAR_IMPACT': {
      return {
        ...state,
        impactState: createEmptyImpactState(),
      };
    }

    case 'SET_CONNECTION': {
      return {
        ...state,
        connectionState: {
          ...state.connectionState,
          ...action.payload,
        },
      };
    }

    case 'CLEAR_CONNECTION': {
      return {
        ...state,
        connectionState: {
          direction: 'both',
          depth: 2,
        },
      };
    }

    case 'OPEN_INVESTIGATION_DRAWER': {
      return {
        ...state,
        drawerState: {
          ...state.drawerState,
          isOpen: true,
          activeTab: action.payload?.tab || state.drawerState.activeTab,
        },
      };
    }

    case 'CLOSE_INVESTIGATION_DRAWER': {
      return {
        ...state,
        drawerState: {
          ...state.drawerState,
          isOpen: false,
        },
      };
    }

    case 'SET_DRAWER_PINNED': {
      return {
        ...state,
        drawerState: {
          ...state.drawerState,
          isPinned: action.payload,
        },
      };
    }

    case 'SET_DRAWER_DETACHED': {
      return {
        ...state,
        drawerState: {
          ...state.drawerState,
          isDetached: action.payload,
        },
      };
    }

    case 'DRILL_INTO_COMPONENT': {
      const { nodeId } = action.payload;
      const newDrillPath = [...state.drillPath, nodeId];
      return {
        ...state,
        selectedNodeId: nodeId,
        selectedEdgeId: null,
        selectionHistory: pushSelectionHistory(state.selectionHistory, nodeId),
        recentNodeIds: pushRecentNodeIds(state.recentNodeIds, nodeId),
        drillPath: newDrillPath,
        drawerState: {
          ...state.drawerState,
          isOpen: true,
        },
      };
    }

    case 'NAVIGATE_BREADCRUMB': {
      const { index } = action.payload;
      if (index < 0 || index >= state.drillPath.length) {
        return state;
      }
      const newDrillPath = state.drillPath.slice(0, index + 1);
      const targetNodeId = newDrillPath[newDrillPath.length - 1];
      return {
        ...state,
        selectedNodeId: targetNodeId,
        drillPath: newDrillPath,
      };
    }

    case 'RESET_INVESTIGATION_CONTEXT': {
      return {
        ...initialInvestigationState,
        drawerState: {
          ...initialInvestigationState.drawerState,
          isPinned: state.drawerState.isPinned,
          isDetached: state.drawerState.isDetached,
        },
      };
    }

    default:
      return state;
  }
}

export interface InvestigationContextValue {
  state: InvestigationState;
  dispatch: React.Dispatch<InvestigationAction>;

  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  selectFinding: (findingId: string | null, associatedNodeId?: string | null) => void;
  selectCycle: (cycleId: string | null, associatedNodeId?: string | null) => void;
  selectUnresolvedEdge: (edgeId: string | null, associatedNodeId?: string | null) => void;
  clearSelection: () => void;

  setFocus: (focus: Partial<FocusState>) => void;
  clearFocus: () => void;

  setImpact: (impact: Partial<ImpactState>) => void;
  clearImpact: () => void;

  setConnection: (connection: Partial<ConnectionQueryState>) => void;
  clearConnection: () => void;

  openDrawer: (tab?: DrawerTab) => void;
  closeDrawer: () => void;
  setDrawerPinned: (pinned: boolean) => void;
  setDrawerDetached: (detached: boolean) => void;

  drillIntoComponent: (nodeId: string) => void;
  navigateBreadcrumb: (index: number) => void;

  resetInvestigationContext: () => void;
}

const InvestigationContext = createContext<InvestigationContextValue | null>(null);

export interface InvestigationProviderProps {
  children: ReactNode;
  initialState?: Partial<InvestigationState>;
}

export function InvestigationProvider({ children, initialState }: InvestigationProviderProps): JSX.Element {
  const mergedInitialState: InvestigationState = {
    ...initialInvestigationState,
    ...initialState,
    drawerState: {
      ...initialInvestigationState.drawerState,
      ...(initialState?.drawerState || {}),
    },
  };

  const [state, dispatch] = useReducer(investigationReducer, mergedInitialState);

  const selectNode = useCallback((nodeId: string | null) => {
    dispatch({ type: 'SELECT_NODE', payload: { nodeId } });
  }, []);

  const selectEdge = useCallback((edgeId: string | null) => {
    dispatch({ type: 'SELECT_EDGE', payload: { edgeId } });
  }, []);

  const selectFinding = useCallback((findingId: string | null, associatedNodeId?: string | null) => {
    dispatch({ type: 'SELECT_FINDING', payload: { findingId, associatedNodeId } });
  }, []);

  const selectCycle = useCallback((cycleId: string | null, associatedNodeId?: string | null) => {
    dispatch({ type: 'SELECT_CYCLE', payload: { cycleId, associatedNodeId } });
  }, []);

  const selectUnresolvedEdge = useCallback((edgeId: string | null, associatedNodeId?: string | null) => {
    dispatch({ type: 'SELECT_UNRESOLVED_EDGE', payload: { edgeId, associatedNodeId } });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const setFocus = useCallback((focus: Partial<FocusState>) => {
    dispatch({ type: 'SET_FOCUS', payload: focus });
  }, []);

  const clearFocus = useCallback(() => {
    dispatch({ type: 'CLEAR_FOCUS' });
  }, []);

  const setImpact = useCallback((impact: Partial<ImpactState>) => {
    dispatch({ type: 'SET_IMPACT', payload: impact });
  }, []);

  const clearImpact = useCallback(() => {
    dispatch({ type: 'CLEAR_IMPACT' });
  }, []);

  const setConnection = useCallback((connection: Partial<ConnectionQueryState>) => {
    dispatch({ type: 'SET_CONNECTION', payload: connection });
  }, []);

  const clearConnection = useCallback(() => {
    dispatch({ type: 'CLEAR_CONNECTION' });
  }, []);

  const openDrawer = useCallback((tab?: DrawerTab) => {
    dispatch({ type: 'OPEN_INVESTIGATION_DRAWER', payload: { tab } });
  }, []);

  const closeDrawer = useCallback(() => {
    dispatch({ type: 'CLOSE_INVESTIGATION_DRAWER' });
  }, []);

  const setDrawerPinned = useCallback((pinned: boolean) => {
    dispatch({ type: 'SET_DRAWER_PINNED', payload: pinned });
  }, []);

  const setDrawerDetached = useCallback((detached: boolean) => {
    dispatch({ type: 'SET_DRAWER_DETACHED', payload: detached });
  }, []);

  const drillIntoComponent = useCallback((nodeId: string) => {
    dispatch({ type: 'DRILL_INTO_COMPONENT', payload: { nodeId } });
  }, []);

  const navigateBreadcrumb = useCallback((index: number) => {
    dispatch({ type: 'NAVIGATE_BREADCRUMB', payload: { index } });
  }, []);

  const resetInvestigationContext = useCallback(() => {
    dispatch({ type: 'RESET_INVESTIGATION_CONTEXT' });
  }, []);

  const value: InvestigationContextValue = {
    state,
    dispatch,
    selectNode,
    selectEdge,
    selectFinding,
    selectCycle,
    selectUnresolvedEdge,
    clearSelection,
    setFocus,
    clearFocus,
    setImpact,
    clearImpact,
    setConnection,
    clearConnection,
    openDrawer,
    closeDrawer,
    setDrawerPinned,
    setDrawerDetached,
    drillIntoComponent,
    navigateBreadcrumb,
    resetInvestigationContext,
  };

  return (
    <InvestigationContext.Provider value={value}>
      {children}
    </InvestigationContext.Provider>
  );
}

export function useInvestigation(): InvestigationContextValue {
  const context = useContext(InvestigationContext);
  if (!context) {
    throw new Error('useInvestigation must be used within an InvestigationProvider');
  }
  return context;
}
