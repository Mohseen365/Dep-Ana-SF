import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback, useMemo } from 'react';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import navigator from 'cytoscape-navigator';
import 'cytoscape-navigator/cytoscape.js-navigator.css';

import { ExplorerNode, ExplorerEdge, ArchitectureLayoutMode, ARCH_MODE_META } from '../types/explorer';
import { buildGraphElements } from '../lib/graph-builder';
import { getGraphStyles } from '../lib/graph-style';
import { runLayoutWithMetadata, runLayoutWithMetadataAsync, computeArchitectureLayoutWithMetadata, GraphLayoutOptions, type FeatureRegion } from '../lib/graph-layout';
import { ImpactAnalysisResult } from '../lib/impact-analysis';
import { FocusState } from '../lib/focus-graph';
import { GraphLayoutState, LayoutProvenance } from '../lib/projectState';
import {
  shouldAutoLayout,
  calculateDeterministicNewNodePosition,
  LayoutMode,
  LayoutTrigger,
  Position,
} from '../lib/position-policy';
import { resolvePosition } from '../lib/layout/positions';
import {
  bindGraphInteractions,
  fitToScreen,
  selectNode,
  deselectAll,
  highlightCycle,
  clearCycleHighlight,
  focusOnNode,
  clearHighlights,
  highlightNodeConnections,
} from '../lib/graph-interactions';

import { discoverFeatures, type FeatureDiscoveryResult } from '../lib/layout/features';
import type { ArchitectureFinding } from '../lib/intelligence';
import { computeCanvasLODLevel } from '../lib/canvas-lod';
import { GraphControls } from './GraphControls';
import { GraphLegend } from './GraphLegend';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { NodeHoverCard } from './graph-internals/NodeHoverCard';
import { EdgeHoverCard } from './graph-internals/EdgeHoverCard';
import { FeatureOverlayCanvas } from './graph-internals/FeatureOverlayCanvas';
import { GraphErrorBoundary } from './graph-internals/GraphErrorBoundary';
import { useInvestigationOptional } from '../context/InvestigationContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useEvent } from '../hooks/useEvent';
import { useNavigationHistory } from '../hooks/useNavigationHistory';
import './graph-internals/graph.css';

cytoscape.use(fcose);
cytoscape.use(navigator);

const DEFAULT_EMPTY_ARRAY: string[] = [];

// Module singleton for correlation tokens
let currentCorrelationToken: string | undefined = undefined;

export const setCorrelationToken = (token: string | undefined) => {
  currentCorrelationToken = token;
};

export const getCorrelationToken = (): string | undefined => {
  const token = currentCorrelationToken;
  currentCorrelationToken = undefined;
  return token;
};

if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, '__CURRENT_CORRELATION_TOKEN__', {
      configurable: true,
      enumerable: true,
      get: () => currentCorrelationToken,
      set: (val: string | undefined) => {
        // Z39: Restrict direct external mutations; internal correlation token management uses module state
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
          currentCorrelationToken = val;
        }
      },
    });
  } catch (e) {
    // Fallback if property already defined or non-configurable
  }
}

function getHashModes(): { arch?: ArchitectureLayoutMode; layout?: LayoutMode; node?: string } {
  if (typeof window === 'undefined' || !window.location.hash) return {};
  try {
    const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(raw);
    const arch = params.get('arch') as ArchitectureLayoutMode | null;
    const layout = params.get('layout') as LayoutMode | null;
    const node = params.get('node');
    const validArch: ArchitectureLayoutMode[] = ['hierarchical', 'hybrid', 'orbit', 'constellation'];
    const validLayout: LayoutMode[] = ['static', 'interactive'];
    return {
      arch: arch && validArch.includes(arch) ? arch : undefined,
      layout: layout && validLayout.includes(layout) ? layout : undefined,
      node: node || undefined,
    };
  } catch (e) {
    return {};
  }
}

export interface GraphViewProps {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  onSelectNode: (node: ExplorerNode | null) => void;
  onSelectEdge: (edgeId: string) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  impactResult?: ImpactAnalysisResult | null;
  selectedCycleNodeIds?: string[] | null;
  findings?: ArchitectureFinding[];
  selectedFinding?: ArchitectureFinding | null;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  focusedNodeId?: string | null;
  focusState?: FocusState;
  onFocusChange?: (focusState: FocusState) => void;
  graphLayout?: GraphLayoutState;
  nodePositions?: Record<string, { x: number; y: number }>;
  onNodePositionsChange?: (nodePositions: Record<string, { x: number; y: number }>) => void;
  onNodePositionChange?: (nodePositions: Record<string, { x: number; y: number }>) => void;
  onNodeDragEnd?: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeDoubleTap?: (nodeId: string, node: ExplorerNode | null) => void;
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
  architectureMode?: ArchitectureLayoutMode;
  onArchitectureModeChange?: (mode: ArchitectureLayoutMode) => void;
  simulatedNodeIds?: string[];
  simulatedRemovedNodeIds?: string[];
  simulatedEdgeIds?: string[];
  enableFeatureLayout?: boolean;
  layoutOptions?: GraphLayoutOptions;
}

export interface GraphViewRef {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  centerSelected: () => void;
  resetLayout: () => void;
}

interface NodeHoverCardData {
  type: 'node';
  node: ExplorerNode;
  x: number;
  y: number;
}

interface EdgeHoverCardData {
  type: 'edge';
  edge: ExplorerEdge;
  x: number;
  y: number;
}

type HoverCardState = NodeHoverCardData | EdgeHoverCardData | null;

export const GraphView = forwardRef<GraphViewRef, GraphViewProps>((props, ref) => {
  const investigation = useInvestigationOptional();
  const {
    nodes,
    edges,
    onSelectNode,
    onSelectEdge,
    selectedNodeId,
    selectedEdgeId,
    impactResult,
    selectedCycleNodeIds,
    findings,
    selectedFinding,
    onToggleFullscreen,
    isFullscreen = false,
    focusedNodeId,
    focusState,
    onFocusChange,
    graphLayout,
    onNodeDragEnd,
    onNodePositionChange,
    onNodePositionsChange: onNodePositionsChangeProp,
    onNodeDoubleTap: onNodeDoubleTapProp,
    layoutMode: layoutModeProp,
    onLayoutModeChange,
    architectureMode: architectureModeProp,
    onArchitectureModeChange,
    simulatedNodeIds = DEFAULT_EMPTY_ARRAY,
    simulatedRemovedNodeIds = DEFAULT_EMPTY_ARRAY,
    simulatedEdgeIds = DEFAULT_EMPTY_ARRAY,
    enableFeatureLayout: enableFeatureLayoutProp,
    layoutOptions,
  } = props;

  const hashModes = useMemo(() => getHashModes(), []);

  const initialArchMode: ArchitectureLayoutMode = useMemo(() => {
    if (hashModes.arch) return hashModes.arch;
    if (architectureModeProp) return architectureModeProp;
    if (graphLayout?.architectureMode) return graphLayout.architectureMode;
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('explorer:architectureMode') as ArchitectureLayoutMode | null;
        if (stored && ['hierarchical', 'hybrid', 'orbit', 'constellation'].includes(stored)) {
          return stored;
        }
      }
    } catch {
      /* storage unavailable */
    }
    return 'hierarchical';
  }, [hashModes.arch, architectureModeProp, graphLayout?.architectureMode]);

  const initialLayoutMode: LayoutMode = useMemo(() => {
    if (hashModes.layout) return hashModes.layout;
    if (layoutModeProp) return layoutModeProp;
    if (graphLayout?.mode) return graphLayout.mode;
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('explorer:layoutMode') as LayoutMode | null;
        if (stored && ['static', 'interactive'].includes(stored)) {
          return stored;
        }
      }
    } catch {
      /* storage unavailable */
    }
    return 'interactive';
  }, [hashModes.layout, layoutModeProp, graphLayout?.mode]);

  const architectureMode: ArchitectureLayoutMode = architectureModeProp || initialArchMode;
  const layoutMode: LayoutMode = layoutModeProp || initialLayoutMode;

  const restoredHashNodeRef = useRef(false);

  // On mount, notify parent if hash or localStorage specified a different initial mode
  useEffect(() => {
    if (initialArchMode !== (architectureModeProp || graphLayout?.architectureMode) && onArchitectureModeChange) {
      onArchitectureModeChange(initialArchMode);
    }
    if (initialLayoutMode !== (layoutModeProp || graphLayout?.mode) && onLayoutModeChange) {
      onLayoutModeChange(initialLayoutMode);
    }
  }, []);

  // Sync architectureMode & layoutMode to localStorage and location.hash.
  // NOTE: selectedNodeId is owned by useViewState (query string), not this hash.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Wait for hashNode restore before writing URL, otherwise we clobber it.
    if (!restoredHashNodeRef.current && hashModes.node && !selectedNodeId) {
      return;
    }

    try {
      if (localStorage.getItem('explorer:architectureMode') !== architectureMode) {
        localStorage.setItem('explorer:architectureMode', architectureMode);
      }
      if (localStorage.getItem('explorer:layoutMode') !== layoutMode) {
        localStorage.setItem('explorer:layoutMode', layoutMode);
      }
    } catch (e) {}

    try {
      const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      const params = new URLSearchParams(raw);
      let changed = false;

      if (params.get('arch') !== architectureMode) {
        params.set('arch', architectureMode);
        changed = true;
      }
      if (params.get('layout') !== layoutMode) {
        params.set('layout', layoutMode);
        changed = true;
      }

      if (changed) {
        const hash = params.toString();
        const suffix = hash ? `#${hash}` : '';
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${suffix}`);
      }
    } catch (e) {}
  }, [architectureMode, layoutMode, selectedNodeId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readHashModes = () => {
      try {
        const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
        const params = new URLSearchParams(raw);
        const arch = params.get('arch') as ArchitectureLayoutMode | null;
        const layout = params.get('layout') as LayoutMode | null;
        const validArch: ArchitectureLayoutMode[] = ['hierarchical', 'hybrid', 'orbit', 'constellation'];
        const validLayout: LayoutMode[] = ['static', 'interactive'];
        if (arch && validArch.includes(arch) && arch !== architectureMode && onArchitectureModeChange) {
          onArchitectureModeChange(arch);
        }
        if (layout && validLayout.includes(layout) && layout !== layoutMode && onLayoutModeChange) {
          onLayoutModeChange(layout);
        }
      } catch { /* ignore */ }
    };

    readHashModes();

    window.addEventListener('popstate', readHashModes);
    window.addEventListener('hashchange', readHashModes);
    return () => {
      window.removeEventListener('popstate', readHashModes);
      window.removeEventListener('hashchange', readHashModes);
    };
  }, [architectureMode, layoutMode, onArchitectureModeChange, onLayoutModeChange]);


  const enableFeatureLayout =
    enableFeatureLayoutProp ??
    layoutOptions?.enableFeatureLayout ??
    (architectureMode === 'hybrid');

  const nodePositions = props.nodePositions || graphLayout?.nodePositions;
  const onNodePositionsChange = onNodePositionsChangeProp || onNodePositionChange;

  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const navRef = useRef<any>(null);

  const derivedFocalLwcId = useMemo(() => {
    const isLwcNode = (id: string | null | undefined): boolean => {
      if (!id) return false;
      return nodes.some((n) => n.id === id && n.type === 'LWC');
    };

    return (
      (isLwcNode(selectedNodeId) ? selectedNodeId : null) ??
      (isLwcNode(layoutOptions?.focalLwcId) ? layoutOptions?.focalLwcId : null) ??
      (isLwcNode(focusedNodeId) ? focusedNodeId : null) ??
      null
    );
  }, [selectedNodeId, layoutOptions?.focalLwcId, focusedNodeId, nodes]);

  const effectiveLayoutOptions = useMemo((): GraphLayoutOptions => {
    return {
      ...layoutOptions,
      enableFeatureLayout,
      enableCandidateDOrdering: architectureMode === 'hierarchical',
      focalLwcId: derivedFocalLwcId,
    };
  }, [enableFeatureLayout, architectureMode, layoutOptions, derivedFocalLwcId]);

  const nodesRef = useRef<ExplorerNode[]>(nodes);
  const edgesRef = useRef<ExplorerEdge[]>(edges);
  const graphLayoutRef = useRef<GraphLayoutState | undefined>(graphLayout);
  const nodePositionsRef = useRef<Record<string, Position> | undefined>(nodePositions);
  const onNodePositionsChangeRef = useRef<((positions: Record<string, Position>) => void) | undefined>(onNodePositionsChange);
  const layoutModeRef = useRef<LayoutMode>(layoutMode);
  const onNodeDragEndRef = useRef<((nodeId: string, position: Position) => void) | undefined>(onNodeDragEnd);
  const onSelectNodeRef = useRef(onSelectNode);
  const onSelectEdgeRef = useRef(onSelectEdge);
  const onNodeDoubleTapRef = useRef(onNodeDoubleTapProp);
  const onFocusChangeRef = useRef(onFocusChange);
  const investigationRef = useRef(investigation);
  const effectiveLayoutOptionsRef = useRef<GraphLayoutOptions>(effectiveLayoutOptions);

  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
    onSelectEdgeRef.current = onSelectEdge;
    onNodeDoubleTapRef.current = onNodeDoubleTapProp;
    onFocusChangeRef.current = onFocusChange;
    investigationRef.current = investigation;
  }, [onSelectNode, onSelectEdge, onNodeDoubleTapProp, onFocusChange, investigation]);

  // In-session explicit drag positions scoped per architecture mode
  const sessionPositionsRef = useRef<Map<ArchitectureLayoutMode, Map<string, Position>>>(new Map());

  const getSessionPositionsForMode = useCallback((mode: ArchitectureLayoutMode): Map<string, Position> => {
    let modeMap = sessionPositionsRef.current.get(mode);
    if (!modeMap) {
      modeMap = new Map<string, Position>();
      sessionPositionsRef.current.set(mode, modeMap);
    }
    return modeMap;
  }, []);

  // Duplicate-layout detector ref tracking { reason, at }
  const lastRunRef = useRef<{ reason: string; at: number } | null>(null);

  // Pending layoutstop listener reference and layout running state
  const pendingLayoutStopRef = useRef<((evt?: any) => void) | null>(null);
  const pendingModeSwitchCaptureRef = useRef<((evt?: any) => void) | null>(null);
  const isLayoutRunningRef = useRef<boolean>(false);
  const [isLayoutRunning, setIsLayoutRunning] = useState<boolean>(false);

  // Request generation ref for async worker layout cancellation
  const layoutRequestRef = useRef<number>(0);

  const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
  const [, setLastLayoutCompletedTrigger] = useState<number>(0);

  const guardLayoutRun = useCallback((reason: string) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (lastRunRef.current && now - lastRunRef.current.at < 150) {
      console.warn(`[layout] duplicate run: ${lastRunRef.current.reason} -> ${reason} (${Math.round(now - lastRunRef.current.at)}ms)`);
    }
    lastRunRef.current = { reason, at: now };
  }, []);

  const markLayoutStart = useCallback((reason: string) => {
    guardLayoutRun(reason);
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`layout-${reason}-start`);
    }
  }, [guardLayoutRun]);

  const markLayoutEnd = useCallback((reason: string, mode: string) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`layout-${reason}-end`);
      if (performance.measure) {
        try {
          performance.measure(`layout:${mode}:${reason}`, `layout-${reason}-start`, `layout-${reason}-end`);
        } catch (e) {
          // Safe catch if mark missing
        }
      }
    }
  }, []);

  // Ref tracking for graphStructureKey and discoveryResult memoization
  const prevStructureKeyRef = useRef<string>('');
  const discoveryResultRef = useRef<FeatureDiscoveryResult | null>(null);

  // Initial mount ref to prevent duplicate element teardown / re-layout on mount
  const isInitialMountRef = useRef<boolean>(true);

  // Track previous modes
  const prevLayoutModeRef = useRef<LayoutMode>(layoutMode);
  const prevArchitectureModeRef = useRef<ArchitectureLayoutMode>(architectureMode);
  const prevFocalLwcIdRef = useRef<string | null | undefined>(effectiveLayoutOptions.focalLwcId);

  const [cyInstance, setCyInstance] = useState<cytoscape.Core | null>(null);
  const [hoverCard, setHoverCard] = useState<HoverCardState>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isNavigatorVisible, setIsNavigatorVisible] = useState(true);
  const [featureRegions, setFeatureRegions] = useState<Map<string, FeatureRegion> | undefined>(undefined);
  const [orbitGuides, setOrbitGuides] = useState<any | undefined>(undefined);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefersReducedMotion = usePrefersReducedMotion();
  const [layoutAnnouncement, setLayoutAnnouncement] = useState<string>('');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const navHistory = useNavigationHistory<string>();
  const isNavigatingHistoryRef = useRef(false);

  useEffect(() => {
    if (selectedNodeId && !isNavigatingHistoryRef.current) {
      navHistory.push(selectedNodeId);
    }
    isNavigatingHistoryRef.current = false;
  }, [selectedNodeId]);

  const handleNavigateBack = useCallback(() => {
    const prevNodeId = navHistory.back();
    if (prevNodeId) {
      isNavigatingHistoryRef.current = true;
      const matchedNode = nodes.find((n) => n.id === prevNodeId);
      if (matchedNode) {
        onSelectNode(matchedNode);
      }
    }
  }, [navHistory, nodes, onSelectNode]);

  const handleNavigateForward = useCallback(() => {
    const nextNodeId = navHistory.forward();
    if (nextNodeId) {
      isNavigatingHistoryRef.current = true;
      const matchedNode = nodes.find((n) => n.id === nextNodeId);
      if (matchedNode) {
        onSelectNode(matchedNode);
      }
    }
  }, [navHistory, nodes, onSelectNode]);

  // Initial node restoration from URL hash
  useEffect(() => {
    if (!cyInstance || nodes.length === 0 || restoredHashNodeRef.current) return;

    const initialNodeId = hashModes.node;
    if (initialNodeId && !selectedNodeId) {
      restoredHashNodeRef.current = true;
      const matchedNode = nodes.find(n => n.id === initialNodeId || n.displayName === initialNodeId);
      if (matchedNode) {
        onSelectNode(matchedNode);
        const ele = cyInstance.getElementById(matchedNode.id);
        if (ele.length > 0) {
          if (prefersReducedMotion) {
            cyInstance.center(ele);
          } else {
            cyInstance.animate({ center: { eles: ele }, zoom: 1.5 }, { duration: 400 });
          }
        }
      }
    }
  }, [cyInstance, nodes, hashModes.node, selectedNodeId, onSelectNode, prefersReducedMotion]);

  // Compute complete structural fingerprint to avoid re-running discoverFeatures or layouts on array reference shifts when node/edge contents & ordering are identical
  const graphStructureKey = useMemo(() => {
    if (nodes.length === 0) return '0:0';
    const nodeFP = nodes.map(n => `${n.id}:${n.type || ''}:${n.layer || ''}:${(n as any).domain || ''}`).join('|');
    const edgeFP = edges.map(e => `${e.id}:${e.source}:${e.target}:${e.relationshipType || ''}`).join('|');
    return `${nodes.length}:${edges.length}#${nodeFP}#${edgeFP}`;
  }, [nodes, edges]);

  // Derive Feature Discovery Result deterministically based on structure fingerprint
  const discoveryResult: FeatureDiscoveryResult = useMemo(() => {
    if (!discoveryResultRef.current || prevStructureKeyRef.current !== graphStructureKey) {
      discoveryResultRef.current = discoverFeatures(nodes, edges);
      prevStructureKeyRef.current = graphStructureKey;
    }
    return discoveryResultRef.current;
  }, [graphStructureKey, nodes, edges]);

  // Build nodeId → featureId map for edge inter-feature classification (Hybrid mode only)
  const featureAssignmentMap = useMemo((): Map<string, string> | undefined => {
    if (architectureMode !== 'hybrid') return undefined;
    const map = new Map<string, string>();
    discoveryResult.assignments.forEach((assignment, nodeId) => {
      map.set(nodeId, assignment.primaryFeatureId);
    });
    return map;
  }, [architectureMode, discoveryResult]);

  // Dev-only invariant check to detect Cytoscape vs data node count desync
  useEffect(() => {
    const isDev = (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') || (import.meta as any).env?.DEV;
    if (!isDev || !cyInstance) return;
    const cyCount = cyInstance.nodes().length;
    if (cyCount !== nodes.length) {
      console.error(`[graph] desync invariant failure: cy nodes count (${cyCount}) !== data nodes count (${nodes.length})`);
    }
  }, [nodes, cyInstance]);

  // Derive bounded accessible node list to prevent DOM inflation on large graphs
  const accessibleNodes = useMemo(() => {
    if (nodes.length <= 50) return nodes;
    const top50 = nodes.slice(0, 50);
    if (selectedNodeId && !top50.some(n => n.id === selectedNodeId)) {
      const selected = nodes.find(n => n.id === selectedNodeId);
      if (selected) return [...top50, selected];
    }
    return top50;
  }, [nodes, selectedNodeId]);

  // Keep internal refs synchronized
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
    nodePositionsRef.current = nodePositions;
    onNodePositionsChangeRef.current = onNodePositionsChange;
    layoutModeRef.current = layoutMode;
    graphLayoutRef.current = graphLayout;
    onNodeDragEndRef.current = onNodeDragEnd;
    effectiveLayoutOptionsRef.current = effectiveLayoutOptions;
  }, [
    nodes,
    edges,
    nodePositions,
    onNodePositionsChange,
    layoutMode,
    graphLayout,
    onNodeDragEnd,
    effectiveLayoutOptions,
  ]);

  const architectureModeRef = useRef<ArchitectureLayoutMode>(architectureMode);
  useEffect(() => {
    architectureModeRef.current = architectureMode;
  }, [architectureMode]);

  // Capture all current canvas node positions with explicit provenance tracking
  const captureAndPersistPositions = useCallback((overrideProvenance?: LayoutProvenance) => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    const currentPositions: Record<string, Position> = { ...(nodePositionsRef.current || {}) };

    const currentMode = architectureModeRef.current;
    const modeSessionMap = getSessionPositionsForMode(currentMode);
    cy.nodes().forEach((n) => {
      const pos = n.position();
      const rounded = { x: Math.round(pos.x), y: Math.round(pos.y) };
      currentPositions[n.id()] = rounded;
      modeSessionMap.set(n.id(), rounded);
    });

    const provenance: LayoutProvenance = overrideProvenance || (
      currentMode === 'hybrid'        ? 'automatic-hybrid'        :
      currentMode === 'orbit'         ? 'automatic-orbit'         :
      currentMode === 'constellation' ? 'automatic-constellation' :
                                         'automatic-hierarchical'
    );

    if (onNodePositionsChangeRef.current) {
      (onNodePositionsChangeRef.current as any)(currentPositions, provenance);
    }
  }, []);

  // Handle Mode Switch
  useEffect(() => {
    if (prevLayoutModeRef.current === layoutMode) return;

    const oldMode = prevLayoutModeRef.current;
    prevLayoutModeRef.current = layoutMode;

    if (cyRef.current && typeof cyRef.current.autolock === 'function') {
      cyRef.current.autolock(layoutMode === 'static');
    }

    if (oldMode === 'interactive' && layoutMode === 'static') {
      if (isLayoutRunningRef.current && cyRef.current) {
        if (pendingModeSwitchCaptureRef.current) {
          cyRef.current.off('layoutstop', pendingModeSwitchCaptureRef.current);
        }
        const onStop = () => {
          pendingModeSwitchCaptureRef.current = null;
          captureAndPersistPositions();
        };
        pendingModeSwitchCaptureRef.current = onStop;
        if (typeof cyRef.current.one === 'function') {
          cyRef.current.one('layoutstop', onStop);
        } else {
          cyRef.current.on('layoutstop', onStop);
        }
      } else {
        captureAndPersistPositions();
      }
    }
  }, [layoutMode, captureAndPersistPositions]);

  // Handle Architecture Mode or Focal LWC Switch (Hierarchical <-> Hybrid <-> Orbit transitions & focal LWC changes)
  useEffect(() => {
    const modeChanged = prevArchitectureModeRef.current !== architectureMode;
    const focalChanged = architectureMode === 'orbit' && prevFocalLwcIdRef.current !== effectiveLayoutOptions.focalLwcId;

    if (!modeChanged && !focalChanged) return;

    prevArchitectureModeRef.current = architectureMode;
    prevFocalLwcIdRef.current = effectiveLayoutOptions.focalLwcId;

    if (!cyRef.current) return;
    const cy = cyRef.current;

    const targetProvenance: LayoutProvenance =
      architectureMode === 'hybrid'
        ? 'automatic-hybrid'
        : architectureMode === 'orbit'
        ? 'automatic-orbit'
        : architectureMode === 'constellation'
        ? 'automatic-constellation'
        : 'automatic-hierarchical';

    const storedArchMode = graphLayoutRef.current?.architectureMode;
    const currentProv = graphLayoutRef.current?.layoutProvenance;
    const hasAuth =
      !!nodePositionsRef.current &&
      Object.keys(nodePositionsRef.current).length > 0 &&
      (currentProv === 'user-authored' ||
        (storedArchMode === architectureMode &&
          (currentProv === undefined || currentProv === targetProvenance)));

    const autoLayoutPolicy = shouldAutoLayout(layoutModeRef.current, 'architecture-mode-switch', {
      hasAuthoritativePositions: hasAuth,
    });

    if (autoLayoutPolicy === false) {
      captureAndPersistPositions(targetProvenance);
      return;
    }

    const existingPosMap = graphLayoutRef.current?.layoutPositions?.[architectureMode] ?? {};

    const requestId = ++layoutRequestRef.current;
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const activeToken =
      effectiveLayoutOptionsRef.current?.correlationToken ??
      getCorrelationToken();

    const notifyComplete = (outcome: 'complete' | 'fallback-complete', correlationToken?: string) => {
      if (typeof window !== 'undefined') {
        const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const durationMs = Math.round(endTime - startTime);
        const detail = {
          architectureMode,
          layoutMode: layoutModeRef.current,
          requestId,
          correlationToken,
          timestamp: Date.now(),
          durationMs,
          outcome,
          nodeCount: nodesRef.current.length,
          edgeCount: edgesRef.current.length,
        };
        if (DEBUG || (import.meta as any).env?.DEV || process.env.NODE_ENV !== 'production') {
          (window as any).__LAST_LAYOUT_COMPLETED__ = detail;
        }
        window.dispatchEvent(new CustomEvent('app:layoutcomplete', { detail }));
        setLayoutAnnouncement(`${architectureMode} layout applied, ${nodesRef.current.length} components`);
        if (DEBUG) {
          setLastLayoutCompletedTrigger((prev) => prev + 1);
        }
      }
    };

    markLayoutStart('architecture-mode-switch');

    if (nodesRef.current.length >= 20) {
      runLayoutWithMetadataAsync(cy, {
        ...effectiveLayoutOptionsRef.current,
        nodes: nodesRef.current,
        edges: edgesRef.current,
        nodeCount: nodesRef.current.length,
        animate: false,
        architectureMode,
        enableFeatureLayout: architectureMode === 'hybrid',
        existingPositions: existingPosMap,
        fit: true,
      }).then((layoutRes) => {
        if (requestId !== layoutRequestRef.current) return;
        markLayoutEnd('architecture-mode-switch', architectureMode);
        setFeatureRegions(layoutRes.featureRegions);
        setOrbitGuides(layoutRes.orbitGuides);
        captureAndPersistPositions(targetProvenance);
        notifyComplete('complete', layoutRes.correlationToken || activeToken);
      }).catch(() => {
        if (requestId !== layoutRequestRef.current) return;
        markLayoutEnd('architecture-mode-switch', architectureMode);
        const layoutRes = runLayoutWithMetadata(cy, {
          ...effectiveLayoutOptionsRef.current,
          nodes: nodesRef.current,
          edges: edgesRef.current,
          nodeCount: nodesRef.current.length,
          animate: false,
          architectureMode,
          enableFeatureLayout: architectureMode === 'hybrid',
          existingPositions: existingPosMap,
          fit: true,
        });
        setFeatureRegions(layoutRes.featureRegions);
        setOrbitGuides(layoutRes.orbitGuides);
        captureAndPersistPositions(targetProvenance);
        notifyComplete('fallback-complete', activeToken);
      });
    } else {
      const layoutRes = runLayoutWithMetadata(cy, {
        ...effectiveLayoutOptionsRef.current,
        nodes: nodesRef.current,
        edges: edgesRef.current,
        nodeCount: nodesRef.current.length,
        animate: false,
        architectureMode,
        enableFeatureLayout: architectureMode === 'hybrid',
        existingPositions: existingPosMap,
        fit: true,
      });
      markLayoutEnd('architecture-mode-switch', architectureMode);
      setFeatureRegions(layoutRes.featureRegions);
      setOrbitGuides(layoutRes.orbitGuides);
      captureAndPersistPositions(targetProvenance);
      notifyComplete('complete', activeToken);
    }
  }, [architectureMode, effectiveLayoutOptions.focalLwcId, captureAndPersistPositions]);

  // Safe helper to unbind and destroy Cytoscape Navigator
  const destroyNavigator = useCallback(() => {
    if (navRef.current) {
      try {
        if (typeof navRef.current._removeCyListeners === 'function') {
          navRef.current._removeCyListeners();
        }
        if (typeof navRef.current.destroy === 'function') {
          navRef.current.destroy();
        }
      } catch (e) {
        // Safe cleanup fallback
      }
      navRef.current = null;
    }
  }, []);

  // Re-attach cytoscape navigator
  useEffect(() => {
    if (isNavigatorVisible && cyInstance && minimapRef.current) {
      destroyNavigator();
      try {
        const bodyEl = minimapRef.current.querySelector('.navigator-body') || minimapRef.current;
        navRef.current = (cyInstance as any).navigator({
          container: bodyEl,
          scale: 0.15
        });
      } catch (err) {
        console.warn('Cytoscape navigator re-init notice:', err);
      }
    }
    return () => {
      destroyNavigator();
    };
  }, [isNavigatorVisible, cyInstance, destroyNavigator]);

  const handleZoomIn = useEvent(() => {
    if (cyRef.current) {
      cyRef.current.zoom({
        level: cyRef.current.zoom() * 1.2,
        renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 }
      });
    }
  });

  const handleZoomOut = useEvent(() => {
    if (cyRef.current) {
      cyRef.current.zoom({
        level: cyRef.current.zoom() * 0.8,
        renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 }
      });
    }
  });

  const handleFitView = useEvent(() => {
    if (cyRef.current) fitToScreen(cyRef.current, 50);
  });

  const handleCenterSelected = useEvent(() => {
    if (cyRef.current && selectedNodeId) {
      const ele = cyRef.current.getElementById(selectedNodeId);
      if (ele.length > 0) {
        if (prefersReducedMotion) {
          cyRef.current.center(ele);
        } else {
          cyRef.current.animate({ center: { eles: ele } }, { duration: 200 });
        }
      }
    }
  });

  const handleToggleNavigator = useEvent(() => setIsNavigatorVisible((prev) => !prev));

  // Reset Layout handler
  const executeResetLayout = useCallback(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    getSessionPositionsForMode(architectureMode).clear();

    if (pendingLayoutStopRef.current) {
      cy.off('layoutstop', pendingLayoutStopRef.current);
      pendingLayoutStopRef.current = null;
    }

    const requestId = ++layoutRequestRef.current;
    const nodeCount = nodesRef.current.length;
    const shouldAnimate = !prefersReducedMotion && nodeCount < 100;

    markLayoutStart('reset');

    if (shouldAnimate) {
      const onStop = () => {
        pendingLayoutStopRef.current = null;
        if (requestId !== layoutRequestRef.current) return;
        markLayoutEnd('reset', architectureMode);
        captureAndPersistPositions();
      };
      pendingLayoutStopRef.current = onStop;
      if (typeof cy.one === 'function') {
        cy.one('layoutstop', onStop);
      } else {
        cy.on('layoutstop', onStop);
      }

      const layoutRes = runLayoutWithMetadata(cy, {
        ...effectiveLayoutOptionsRef.current,
        nodes: nodesRef.current,
        edges: edgesRef.current,
        nodeCount,
        animate: true,
        architectureMode,
      });
      if (requestId !== layoutRequestRef.current) return;
      setFeatureRegions(layoutRes.featureRegions);
      setOrbitGuides(layoutRes.orbitGuides);
    } else {
      const layoutRes = runLayoutWithMetadata(cy, {
        ...effectiveLayoutOptionsRef.current,
        nodes: nodesRef.current,
        edges: edgesRef.current,
        nodeCount,
        animate: false,
        architectureMode,
      });
      if (requestId !== layoutRequestRef.current) return;
      markLayoutEnd('reset', architectureMode);
      setFeatureRegions(layoutRes.featureRegions);
      setOrbitGuides(layoutRes.orbitGuides);
      captureAndPersistPositions();
    }
  }, [architectureMode, captureAndPersistPositions, markLayoutStart, markLayoutEnd, prefersReducedMotion]);

  const selectedNodeIdRef = useRef<string | null>(selectedNodeId);
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  // Expose imperative control methods
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (cyRef.current) {
        cyRef.current.zoom({
          level: cyRef.current.zoom() * 1.2,
          renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 }
        });
      }
    },
    zoomOut: () => {
      if (cyRef.current) {
        cyRef.current.zoom({
          level: cyRef.current.zoom() * 0.8,
          renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 }
        });
      }
    },
    fitView: () => {
      if (cyRef.current) {
        fitToScreen(cyRef.current, 50);
      }
    },
    centerSelected: () => {
      if (cyRef.current && selectedNodeIdRef.current) {
        const ele = cyRef.current.getElementById(selectedNodeIdRef.current);
        if (ele.length > 0) {
          if (prefersReducedMotion) {
            cyRef.current.center(ele);
          } else {
            cyRef.current.animate({ center: { eles: ele } }, { duration: 250 });
          }
        }
      }
    },
    resetLayout: executeResetLayout,
  }), [executeResetLayout, prefersReducedMotion]);

  // Cytoscape Initialization & Teardown
  useEffect(() => {
    if (!containerRef.current) return;

    const elements = buildGraphElements(nodesRef.current, edgesRef.current, findings, featureAssignmentMap);
    const styles = getGraphStyles({
      nodeWidth: 50,
      nodeHeight: 50,
      fontSize: 12
    });

    const storedArchMode = graphLayoutRef.current?.architectureMode;
    const currentProv = graphLayoutRef.current?.layoutProvenance;
    const expectedProvenance: LayoutProvenance =
      architectureMode === 'hybrid'
        ? 'automatic-hybrid'
        : architectureMode === 'orbit'
        ? 'automatic-orbit'
        : architectureMode === 'constellation'
        ? 'automatic-constellation'
        : 'automatic-hierarchical';

    const hasAuth =
      !!nodePositionsRef.current &&
      Object.keys(nodePositionsRef.current).length > 0 &&
      (currentProv === 'user-authored' ||
        (storedArchMode === architectureMode &&
          (currentProv === undefined || currentProv === expectedProvenance)));

    const autoLayoutPolicy = shouldAutoLayout(layoutModeRef.current, 'initial', {
      hasAuthoritativePositions: hasAuth,
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: styles,
      // Layout is applied explicitly below so we can capture metadata + fit together.
      layout: { name: 'preset' },
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.2,
      boxSelectionEnabled: true,
      autounselectify: false
    });

    cyRef.current = cy;
    if (typeof cy.autolock === 'function') {
      cy.autolock(layoutMode === 'static');
    }
    setCyInstance(cy);
    if (typeof window !== 'undefined' && ((import.meta as any).env?.DEV || (window as any).__EXPOSE_CY__)) {
      (window as any).__CY__ = cy;
      (window as any).__LAYOUT_MODULE__ = {
        runLayoutWithMetadata,
        computeArchitectureLayoutWithMetadata,
      };
    }

    const knownPosMap: Record<string, Position> = {};
    const modeSessionMapOnMount = getSessionPositionsForMode(architectureMode);
    cy.nodes().forEach((cyNode) => {
      const id = cyNode.id();
      const resolved = resolvePosition(id, {
        session: modeSessionMapOnMount,
        persisted: nodePositionsRef.current,
        hasAuth,
      });

      if (resolved) {
        cyNode.position({ x: resolved.position.x, y: resolved.position.y });
        knownPosMap[id] = resolved.position;
      }
    });

    const requestId = ++layoutRequestRef.current;

    if (autoLayoutPolicy === true) {
      markLayoutStart('initial');
      const layoutRes = runLayoutWithMetadata(cy, {
        ...effectiveLayoutOptionsRef.current,
        nodes: nodesRef.current,
        edges: edgesRef.current,
        nodeCount: nodesRef.current.length,
        animate: false,
        architectureMode,
        fit: true,
      });
      if (requestId === layoutRequestRef.current) {
        markLayoutEnd('initial', architectureMode);
        setFeatureRegions(layoutRes.featureRegions);
        setOrbitGuides(layoutRes.orbitGuides);
        captureAndPersistPositions();
      }
    } else {
      let newlyPlaced = false;
      cy.nodes().forEach((cyNode) => {
        const id = cyNode.id();
        if (!knownPosMap[id]) {
          const newPos = calculateDeterministicNewNodePosition(id, edgesRef.current, knownPosMap);
          cyNode.position(newPos);
          knownPosMap[id] = newPos;
          modeSessionMapOnMount.set(id, newPos);
          newlyPlaced = true;
        }
      });
      if (newlyPlaced) {
        captureAndPersistPositions();
      }
    }

    cy.on('dragfree', 'node', (evt) => {
      const node = evt.target;
      const nodeId = node.id();
      const pos = node.position();
      const rounded = { x: Math.round(pos.x), y: Math.round(pos.y) };

      const currentMode = architectureModeRef.current;
      getSessionPositionsForMode(currentMode).set(nodeId, rounded);
      captureAndPersistPositions('user-authored');

      if (onNodeDragEndRef.current) {
        onNodeDragEndRef.current(nodeId, rounded);
      }
    });

    const nodeCount = nodesRef.current.length;
    const initialZoom = nodeCount < 15 ? 1.4
                      : nodeCount < 50 ? 1.0
                      : nodeCount < 200 ? 0.7
                      : 0.4;
    let layoutDepth = 0;
    cy.on('layoutstart', () => {
      layoutDepth++;
      isLayoutRunningRef.current = true;
      setIsLayoutRunning(true);
    });

    cy.on('layoutstop', () => {
      layoutDepth = Math.max(0, layoutDepth - 1);
      if (layoutDepth === 0) {
        isLayoutRunningRef.current = false;
        setIsLayoutRunning(false);
      }
    });

    // Only apply a manual zoom fallback when the layout did not fit.
    if (autoLayoutPolicy !== true) {
      cy.zoom(initialZoom);
      cy.center();
    }

    let zoomTimeout: ReturnType<typeof setTimeout> | null = null;
    const updateZoomClass = () => {
      const currentZoom = cy.zoom();
      const nodeCount = nodesRef.current.length;
      const edgeCount = edgesRef.current.length;
      const lodConfig = computeCanvasLODLevel({ zoom: currentZoom, nodeCount, edgeCount });

      cy.batch(() => {
        cy.elements().removeClass('zoom-far zoom-mid zoom-near');

        if (lodConfig.lodLevel >= 2) {
          cy.elements().addClass('zoom-far');
        } else if (lodConfig.lodLevel === 1) {
          cy.elements().addClass('zoom-mid');
        } else {
          cy.elements().addClass('zoom-near');
        }
      });
    };

    cy.on('zoom', () => {
      if (zoomTimeout) return;
      zoomTimeout = setTimeout(() => {
        zoomTimeout = null;
        updateZoomClass();
      }, 60);
    });

    updateZoomClass();

    cy.on('grab', 'node', () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setHoverCard(null);
    });

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const pos = evt.renderedPosition || (typeof node.renderedPosition === 'function' ? node.renderedPosition() : { x: 0, y: 0 });
      const nodeId = node.id();
      const nodeObj = nodesRef.current.find(n => n.id === nodeId);

      setHoveredNodeId(prev => (prev === nodeId ? prev : nodeId));

      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

      if (nodeObj && pos) {
        const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : { left: 0, top: 0 };
        const screenX = rect.left + pos.x;
        const screenY = rect.top + pos.y;
        hoverTimerRef.current = setTimeout(() => {
          setHoverCard({
            type: 'node',
            node: nodeObj,
            x: screenX,
            y: screenY
          });
        }, 250);
      }
    });

    cy.on('mouseout', 'node', () => {
      setHoveredNodeId(prev => (prev === null ? prev : null));
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setHoverCard(null);
    });

    cy.on('mouseover', 'edge', (evt) => {
      const edge = evt.target;
      const pos = evt.renderedPosition;
      const edgeId = edge.id();
      const edgeObj = edgesRef.current.find(e => e.id === edgeId);

      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

      if (edgeObj) {
        const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : { left: 0, top: 0 };
        const screenX = rect.left + pos.x;
        const screenY = rect.top + pos.y;
        hoverTimerRef.current = setTimeout(() => {
          setHoverCard({
            type: 'edge',
            edge: edgeObj,
            x: screenX,
            y: screenY
          });
        }, 250);
      }
    });

    cy.on('mouseout', 'edge', () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setHoverCard(null);
    });

    cy.on('mouseleave', () => {
      setHoveredNodeId(prev => (prev === null ? prev : null));
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setHoverCard(null);
      if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }
    });

    bindGraphInteractions(cy, {
      onNodeSelect: (selectedNode) => {
        const fullNode = selectedNode ? (nodesRef.current.find(n => n.id === selectedNode.id) || selectedNode) : null;
        const inv = investigationRef.current;
        if (inv) {
          inv.selectNode(fullNode ? fullNode.id : null);
        }
        onSelectNodeRef.current(fullNode);
      },
      onNodeDoubleTap: (nodeId, selectedNode) => {
        if (onNodeDoubleTapRef.current) {
          const fullNode = selectedNode ? (nodesRef.current.find(n => n.id === selectedNode.id) || selectedNode) : null;
          onNodeDoubleTapRef.current(nodeId, fullNode);
        }
      },
      onEdgeSelect: (edgeId) => {
        if (edgeId) {
          const inv = investigationRef.current;
          if (inv) {
            inv.selectEdge(edgeId);
          }
          onSelectEdgeRef.current(edgeId);
        }
      },
      onBackgroundTap: () => {
        const inv = investigationRef.current;
        if (inv) {
          inv.clearSelection();
        }
        onSelectNodeRef.current(null);
      }
    }, nodesRef.current);

    const resizeObserver = new ResizeObserver(() => {
      if (cyRef.current) {
        cyRef.current.resize();
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const handleTransitionEnd = (e: TransitionEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.classList.contains('main-viewport') ||
          e.target.classList.contains('graph-view-layout') ||
          e.target.classList.contains('investigation-drawer'))
      ) {
        if (cyRef.current) {
          cyRef.current.resize();
        }
      }
    };

    window.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      if (pendingLayoutStopRef.current && cyRef.current) {
        try { cyRef.current.off('layoutstop', pendingLayoutStopRef.current); } catch (e) {}
        pendingLayoutStopRef.current = null;
      }
      if (pendingModeSwitchCaptureRef.current && cyRef.current) {
        try { cyRef.current.off('layoutstop', pendingModeSwitchCaptureRef.current); } catch (e) {}
        pendingModeSwitchCaptureRef.current = null;
      }
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (zoomTimeout) clearTimeout(zoomTimeout);
      resizeObserver.disconnect();
      window.removeEventListener('transitionend', handleTransitionEnd);

      destroyNavigator();

      if (cyRef.current) {
        try { cyRef.current.off('render'); } catch (e) {}
      }

      document.body.style.cursor = 'default';
      if (typeof window !== 'undefined') {
        if ((window as any).__CY__ === cy) {
          (window as any).__CY__ = null;
        }
        delete (window as any).__LAYOUT_MODULE__;
      }
      cy.destroy();
      setCyInstance(null);
      cyRef.current = null;
    };
  }, []);

  const findingFP = useMemo(() => {
    if (!findings || findings.length === 0) return '';
    return findings
      .map(f => `${f.id}:${f.severity}:${(f.nodeIds ?? []).join(',')}`)
      .sort()
      .join('|');
  }, [findings]);

  const featureAssignmentFP = useMemo(() => {
    if (!featureAssignmentMap || featureAssignmentMap.size === 0) return '';
    return Array.from(featureAssignmentMap.entries())
      .map(([nId, fId]) => `${nId}->${fId}`)
      .sort()
      .join('|');
  }, [featureAssignmentMap]);

  const structuralFingerprint = useMemo(() => {
    const nodeFP = nodes.map(n => `${n.id}:${n.type ?? ''}:${n.layer ?? ''}`).join('|');
    const edgeFP = edges.map(e => `${e.id}:${e.source}:${e.target}:${e.relationshipType ?? ''}`).join('|');
    return `${nodes.length}:${edges.length}#${nodeFP}#${edgeFP}#${findingFP}#${architectureMode}#${featureAssignmentFP}`;
  }, [nodes, edges, findingFP, architectureMode, featureAssignmentFP]);

  const applyDecorations = useCallback((cy: cytoscape.Core) => {
    if (!cy) return;
    cy.batch(() => {
      // selection
      clearHighlights(cy);
      if (selectedNodeIdRef.current) {
        deselectAll(cy);
        selectNode(cy, selectedNodeIdRef.current);
        highlightNodeConnections(cy, selectedNodeIdRef.current);
      } else if (selectedEdgeId) {
        deselectAll(cy);
        const edge = cy.getElementById(selectedEdgeId);
        if (edge.length > 0 && edge.isEdge()) edge.select();
      } else {
        deselectAll(cy);
      }

      // impact
      cy.elements().removeClass('impact-origin impact-affected impact-muted');
      if (impactResult) {
        const { originNodeId, affectedNodeIds, affectedEdgeIds } = impactResult;
        cy.nodes().forEach(node => {
          const id = node.id();
          if (id === originNodeId) {
            node.addClass('impact-origin');
          } else if (affectedNodeIds.has(id)) {
            node.addClass('impact-affected');
          } else {
            node.addClass('impact-muted');
          }
        });

        cy.edges().forEach(edge => {
          const id = edge.id();
          if (affectedEdgeIds.has(id)) {
            edge.addClass('impact-affected');
          } else {
            edge.addClass('impact-muted');
          }
        });
      }

      // finding highlight
      cy.elements().removeClass('finding-highlighted');
      if (selectedFinding) {
        if (selectedFinding.nodeIds && selectedFinding.nodeIds.length > 0) {
          selectedFinding.nodeIds.forEach((nodeId) => {
            const ele = cy.getElementById(nodeId);
            if (ele.length > 0) ele.addClass('finding-highlighted');
          });
        }
        if (selectedFinding.edgeIds && selectedFinding.edgeIds.length > 0) {
          selectedFinding.edgeIds.forEach((edgeId) => {
            const ele = cy.getElementById(edgeId);
            if (ele.length > 0) ele.addClass('finding-highlighted');
          });
        }
      }

      // cycle
      if (selectedCycleNodeIds && selectedCycleNodeIds.length > 0) {
        highlightCycle(cy, selectedCycleNodeIds);
      } else {
        clearCycleHighlight(cy);
      }

      // simulation
      cy.elements().removeClass('simulated-added simulated-removed simulated-affected');
      if (simulatedNodeIds && simulatedNodeIds.length > 0) {
        simulatedNodeIds.forEach(id => {
          const ele = cy.getElementById(id);
          if (ele.length > 0) ele.addClass('simulated-added');
        });
      }
      if (simulatedRemovedNodeIds && simulatedRemovedNodeIds.length > 0) {
        simulatedRemovedNodeIds.forEach(id => {
          const ele = cy.getElementById(id);
          if (ele.length > 0) ele.addClass('simulated-removed');
        });
      }
      if (simulatedEdgeIds && simulatedEdgeIds.length > 0) {
        simulatedEdgeIds.forEach(id => {
          const ele = cy.getElementById(id);
          if (ele.length > 0) ele.addClass('simulated-added');
        });
      }

      // focusedNode
      if (focusedNodeId) {
        focusOnNode(cy, focusedNodeId);
      } else if (selectedNodeIdRef.current) {
        highlightNodeConnections(cy, selectedNodeIdRef.current);
      }
    });
  }, [
    selectedEdgeId,
    impactResult,
    selectedFinding,
    selectedCycleNodeIds,
    simulatedNodeIds,
    simulatedRemovedNodeIds,
    simulatedEdgeIds,
    focusedNodeId,
  ]);

  // Structural Element Synchronization Effect (runs ONLY when nodes, edges, or structural options change)
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (!cyRef.current) return;
    const cy = cyRef.current;

    const cyPositionsBefore: Record<string, Position> = {};
    cy.nodes().forEach((n) => {
      const pos = n.position();
      const posObj = { x: Math.round(pos.x), y: Math.round(pos.y) };
      cyPositionsBefore[n.id()] = posObj;
    });

    let hasGenuinelyNewNodes = false;
    const storedArchModeSync = graphLayoutRef.current?.architectureMode;
    const currentProvSync = graphLayoutRef.current?.layoutProvenance;
    const expectedProvenanceSync: LayoutProvenance =
      architectureMode === 'hybrid'
        ? 'automatic-hybrid'
        : architectureMode === 'orbit'
        ? 'automatic-orbit'
        : architectureMode === 'constellation'
        ? 'automatic-constellation'
        : 'automatic-hierarchical';

    const hasAuthForUpdate =
      !!nodePositionsRef.current &&
      Object.keys(nodePositionsRef.current).length > 0 &&
      (currentProvSync === 'user-authored' ||
        (storedArchModeSync === architectureMode &&
          (currentProvSync === undefined || currentProvSync === expectedProvenanceSync)));

    const modeSessionMapInSync = getSessionPositionsForMode(architectureMode);

    for (const node of nodes) {
      const resolved = resolvePosition(node.id, {
        session: modeSessionMapInSync,
        persisted: nodePositionsRef.current,
        cy: cyPositionsBefore[node.id],
        hasAuth: hasAuthForUpdate,
      });

      if (!resolved) {
        hasGenuinelyNewNodes = true;
      }
    }

    const trigger: LayoutTrigger = hasGenuinelyNewNodes ? 'new-nodes' : 'graph-update';
    const autoLayoutPolicy = shouldAutoLayout(layoutModeRef.current, trigger, {
      hasAuthoritativePositions: hasAuthForUpdate,
      hasNewNodes: hasGenuinelyNewNodes,
    });

    const newElements = buildGraphElements(nodes, edges, findings, featureAssignmentMap);

    cy.batch(() => {
      cy.elements().remove();
      cy.add(newElements);
    });

    const knownPositionsMap: Record<string, Position> = {};

    cy.nodes().forEach((node) => {
      const id = node.id();
      const resolved = resolvePosition(id, {
        session: modeSessionMapInSync,
        persisted: nodePositionsRef.current,
        cy: cyPositionsBefore[id],
        hasAuth: hasAuthForUpdate,
      });

      if (resolved) {
        node.position({ x: resolved.position.x, y: resolved.position.y });
        knownPositionsMap[id] = resolved.position;
      }
    });

    let newlyPlaced = false;
    cy.nodes().forEach((node) => {
      const id = node.id();
      if (!knownPositionsMap[id]) {
        const newPos = calculateDeterministicNewNodePosition(id, edges, knownPositionsMap);
        node.position(newPos);
        knownPositionsMap[id] = newPos;
        modeSessionMapInSync.set(id, newPos);
        newlyPlaced = true;
      }
    });

    if (newlyPlaced) {
      captureAndPersistPositions();
    }
    applyDecorations(cy);

    const requestId = ++layoutRequestRef.current;

    if (autoLayoutPolicy === true) {
      const shouldAnimate = !prefersReducedMotion && nodes.length < 100 && architectureMode !== 'orbit';

      const fitInSyncEffect = architectureMode === 'orbit' ? false : undefined;

      markLayoutStart('structural-sync');

      if (shouldAnimate) {
        const onStop = () => {
          if (requestId !== layoutRequestRef.current) return;
          markLayoutEnd('structural-sync', architectureMode);
          captureAndPersistPositions();
        };
        if (typeof cy.one === 'function') {
          cy.one('layoutstop', onStop);
        } else {
          cy.on('layoutstop', onStop);
        }
        const layoutRes = runLayoutWithMetadata(cy, {
          ...effectiveLayoutOptionsRef.current,
          nodes,
          edges,
          nodeCount: nodes.length,
          animate: true,
          architectureMode,
          fit: fitInSyncEffect,
        });
        if (requestId === layoutRequestRef.current) {
          setFeatureRegions(layoutRes.featureRegions);
          setOrbitGuides(layoutRes.orbitGuides);
        }
      } else {
        const layoutRes = runLayoutWithMetadata(cy, {
          ...effectiveLayoutOptionsRef.current,
          nodes,
          edges,
          nodeCount: nodes.length,
          animate: false,
          architectureMode,
          fit: fitInSyncEffect,
        });
        markLayoutEnd('structural-sync', architectureMode);
        if (requestId === layoutRequestRef.current) {
          setFeatureRegions(layoutRes.featureRegions);
          setOrbitGuides(layoutRes.orbitGuides);
          captureAndPersistPositions();
        }
      }
    }

  }, [structuralFingerprint, captureAndPersistPositions, applyDecorations]);

  // Dedicated Effect for Simulation Visual Classes
  useEffect(() => {
    if (!cyRef.current) return;
    applyDecorations(cyRef.current);
  }, [simulatedNodeIds, simulatedRemovedNodeIds, simulatedEdgeIds, applyDecorations]);

  // Position-Only Synchronization Effect (runs when nodePositions prop changes without structural graph change)
  useEffect(() => {
    if (!cyRef.current) return;
    if (isLayoutRunningRef.current) return;
    const cy = cyRef.current;

    const storedArchMode = graphLayoutRef.current?.architectureMode;
    const currentProv = graphLayoutRef.current?.layoutProvenance;
    const expectedProvenancePosSync: LayoutProvenance =
      architectureMode === 'hybrid'
        ? 'automatic-hybrid'
        : architectureMode === 'orbit'
        ? 'automatic-orbit'
        : architectureMode === 'constellation'
        ? 'automatic-constellation'
        : 'automatic-hierarchical';

    const hasAuth =
      !!nodePositions &&
      Object.keys(nodePositions).length > 0 &&
      (currentProv === 'user-authored' ||
        (storedArchMode === architectureMode &&
          (currentProv === undefined || currentProv === expectedProvenancePosSync)));

    const modeSessionMapInPosSync = getSessionPositionsForMode(architectureMode);

    cy.batch(() => {
      cy.nodes().forEach((cyNode) => {
        const id = cyNode.id();
        const resolved = resolvePosition(id, {
          session: modeSessionMapInPosSync,
          persisted: nodePositions,
          cy: cyNode.position(),
          hasAuth,
        });

        if (resolved) {
          const pos = resolved.position;
          const curr = cyNode.position();
          if (curr.x !== pos.x || curr.y !== pos.y) {
            cyNode.position({ x: pos.x, y: pos.y });
          }
        }
      });
    });
  }, [nodePositions, architectureMode]);

  // Handle selected node & edge changes
  useEffect(() => {
    if (!cyRef.current) return;
    applyDecorations(cyRef.current);
  }, [selectedNodeId, selectedEdgeId, applyDecorations]);

  // Handle Impact Mode highlighting
  useEffect(() => {
    if (!cyRef.current) return;
    applyDecorations(cyRef.current);
  }, [impactResult, applyDecorations]);

  // Handle Cycle Mode highlighting
  useEffect(() => {
    if (!cyRef.current) return;
    applyDecorations(cyRef.current);
  }, [selectedCycleNodeIds, applyDecorations]);

  // Handle selectedFinding element highlighting
  useEffect(() => {
    if (!cyRef.current) return;
    applyDecorations(cyRef.current);
  }, [selectedFinding, applyDecorations]);

  // Handle focusedNodeId for progressive drilling
  useEffect(() => {
    if (!cyRef.current) return;
    applyDecorations(cyRef.current);
  }, [focusedNodeId, selectedNodeId, applyDecorations]);

  // Keyboard Navigation Handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    const target = e.target as HTMLElement;
    const tagName = target?.tagName?.toLowerCase();
    const isEditable = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;

    if (e.key === '?' && !isEditable) {
      e.preventDefault();
      setIsShortcutsModalOpen(true);
      return;
    }

    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      handleNavigateBack();
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      handleNavigateForward();
    } else if (e.key === 'f' || e.key === 'F' || e.key === '0') {
      if (!isEditable) fitToScreen(cy, 50);
    } else if (e.key === '+' || e.key === '=') {
      if (!isEditable) cy.zoom(cy.zoom() * 1.2);
    } else if (e.key === '-' || e.key === '_') {
      if (!isEditable) cy.zoom(cy.zoom() * 0.8);
    } else if (e.key === 'Escape') {
      if (isEditable) return;
      onSelectNode(null);
      onSelectEdge('');
      if (onFocusChangeRef.current) {
        onFocusChangeRef.current({ enabled: false, focusNodeId: null, direction: 'both', depth: 1 });
      }
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (!selectedNodeId && nodes.length > 0) {
        onSelectNode(nodes[0]);
      } else if (selectedNodeId) {
        const currNode = cy.getElementById(selectedNodeId);
        if (currNode.length > 0) {
          const neighbors = currNode.neighborhood('node');
          if (neighbors.length > 0) {
            const currPos = currNode.renderedPosition();
            let chosenNeighbor = neighbors[0];

            let bestDist = Infinity;
            neighbors.forEach(neighbor => {
              const pos = neighbor.renderedPosition();
              const dx = pos.x - currPos.x;
              const dy = pos.y - currPos.y;

              let isDirectionMatch = false;
              if (e.key === 'ArrowUp' && dy < 0) isDirectionMatch = true;
              if (e.key === 'ArrowDown' && dy > 0) isDirectionMatch = true;
              if (e.key === 'ArrowLeft' && dx < 0) isDirectionMatch = true;
              if (e.key === 'ArrowRight' && dx > 0) isDirectionMatch = true;

              if (isDirectionMatch) {
                const dist = dx * dx + dy * dy;
                if (dist < bestDist) {
                  bestDist = dist;
                  chosenNeighbor = neighbor;
                }
              }
            });

            const nextNodeObj = nodes.find(n => n.id === chosenNeighbor.id());
            if (nextNodeObj) {
              onSelectNode(nextNodeObj);
            }
          }
        }
      }
    }
  };

  const handleToggleLayoutModeInternal = useCallback(() => {
    const nextMode: LayoutMode = layoutMode === 'static' ? 'interactive' : 'static';
    if (nextMode === 'static') {
      captureAndPersistPositions();
    }
    if (onLayoutModeChange) {
      onLayoutModeChange(nextMode);
    }
  }, [layoutMode, onLayoutModeChange, captureAndPersistPositions]);

  const handleToggleArchitectureModeInternal = useCallback(() => {
    const nextMode = ARCH_MODE_META[architectureMode].next;
    if (onArchitectureModeChange) {
      onArchitectureModeChange(nextMode);
    }
  }, [architectureMode, onArchitectureModeChange]);

  return (
    <div
      className="graph-container"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Salesforce Architecture Dependency Graph"
      data-architecture-mode={architectureMode}
      data-layout-mode={layoutMode}
      data-layout-running={isLayoutRunning ? 'true' : 'false'}
      data-node-count={nodes.length}
      data-edge-count={edges.length}
    >
      <div ref={containerRef} className="cytoscape-view" />

      {DEBUG && (
        <div
          className="graph-debug-panel"
          data-testid="graph-debug-panel"
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            zIndex: 1000,
            padding: '8px 12px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '11px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}
        >
          <div><strong>Layout Debug</strong></div>
          <div>arch: {architectureMode}</div>
          <div>layout: {layoutMode}</div>
          <div>running: {String(isLayoutRunning)}</div>
          <div>reqId: {layoutRequestRef.current}</div>
          <div>nodes: {nodes.length} (data) / {cyRef.current?.nodes().length ?? 0} (cy)</div>
          <div>last: {typeof window !== 'undefined' && JSON.stringify((window as any).__LAST_LAYOUT_COMPLETED__)}</div>
        </div>
      )}

      {/* Empty State Overlay */}
      {nodes.length === 0 && (
        <div
          className="graph-empty-state"
          data-testid="graph-empty-state"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '24px 32px',
            backgroundColor: 'var(--surface-panel, rgba(17, 24, 39, 0.95))',
            border: '1px solid var(--border-default, #334155)',
            borderRadius: 'var(--radius-lg, 8px)',
            color: 'var(--text-primary, #f8fafc)',
            textAlign: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          }}
        >
          <span style={{ fontSize: '32px' }} aria-hidden="true">🔍</span>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #cbd5e1)' }}>
            No components match the current filters.
          </p>
          <button
            type="button"
            className="ui-btn ui-btn-secondary ui-btn-sm"
            onClick={executeResetLayout}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Reset view
          </button>
        </div>
      )}

      {/* Protected Overlays */}
      <GraphErrorBoundary
        resetKeys={[architectureMode, nodes.length, edges.length]}
        onError={(err) => {
          console.error('[GraphErrorBoundary] overlay failed', err);
          if (typeof window !== 'undefined') {
            (window as any).__LAST_OVERLAY_ERROR__ = {
              message: err?.message,
              stack: err?.stack,
              at: Date.now(),
            };
          }
        }}
      >
        <FeatureOverlayCanvas
          cy={cyInstance}
          nodes={nodes}
          edges={edges}
          discoveryResult={discoveryResult}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          nodePositions={nodePositions}
          findings={findings}
          enableOverlay={true}
          architectureMode={architectureMode}
          featureRegions={architectureMode === 'hybrid' ? featureRegions : undefined}
          orbitGuides={architectureMode === 'orbit' || architectureMode === 'constellation' ? orbitGuides : undefined}
        />

        {/* Navigator Container */}
        {isNavigatorVisible && (
          <div
            id="minimap"
            ref={minimapRef}
            className="minimap-container"
            data-testid="minimap-container"
          >
            <div className="navigator-header">
              <span className="navigator-title">Graph Navigator</span>
              <button
                className="navigator-close-btn"
                onClick={() => setIsNavigatorVisible(false)}
                title="Close navigator"
                aria-label="Close navigator"
                type="button"
              >
                ×
              </button>
            </div>
            <div className="navigator-body" />
          </div>
        )}

        {/* Hover Cards */}
        {hoverCard && hoverCard.type === 'node' && (
          <NodeHoverCard
            node={hoverCard.node}
            x={hoverCard.x}
            y={hoverCard.y}
            findings={findings}
          />
        )}

        {hoverCard && hoverCard.type === 'edge' && (
          <EdgeHoverCard
            edge={hoverCard.edge}
            x={hoverCard.x}
            y={hoverCard.y}
          />
        )}
      </GraphErrorBoundary>

      {/* Live Region for Screen Readers on Layout Completion */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {layoutAnnouncement}
      </div>

      {/* Mode Indicator Overlay Badge */}
      <div
        className={`graph-mode-badge ${layoutMode === 'static' ? 'static' : 'interactive'}`}
        data-testid="graph-mode-indicator"
        title={layoutMode === 'static' ? 'Node positions are preserved' : 'Graph automatically arranges nodes'}
      >
        {layoutMode === 'static' ? '📌 Static Mode — Node positions preserved' : `🔀 Interactive Mode (${architectureMode === 'constellation' ? 'Constellation' : architectureMode === 'orbit' ? 'Orbit' : architectureMode === 'hybrid' ? 'Hybrid' : 'Hierarchical'})`}
      </div>

      {/* Accessible Node List */}
      <ul role="list" className="sr-only" aria-label="Component Nodes">
        {accessibleNodes.map((n) => (
          <li key={n.id} role="listitem">
            <button
              type="button"
              aria-current={n.id === selectedNodeId ? 'true' : undefined}
              aria-label={`${n.displayName}, ${n.type}, risk ${n.risk}`}
              onClick={() => onSelectNode(n)}
            >
              {n.displayName}
            </button>
          </li>
        ))}

        {nodes.length > 50 && (
          <li
            role="listitem"
            aria-label={`Showing ${accessibleNodes.length} of ${nodes.length} total components`}
          >
            Showing {accessibleNodes.length} of {nodes.length} components.
            Select components or use search to navigate.
          </li>
        )}
      </ul>

      {/* Floating Controls & Legend */}
      <GraphControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onCenterSelected={handleCenterSelected}
        onResetLayout={executeResetLayout}
        hasSelectedNode={!!selectedNodeId}
        selectedNodeId={selectedNodeId}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        isNavigatorVisible={isNavigatorVisible}
        onToggleNavigator={handleToggleNavigator}
        focusState={focusState}
        onFocusChange={onFocusChange}
        layoutMode={layoutMode}
        onToggleLayoutMode={onLayoutModeChange ? handleToggleLayoutModeInternal : undefined}
        architectureMode={architectureMode}
        onToggleArchitectureMode={onArchitectureModeChange ? handleToggleArchitectureModeInternal : undefined}
        nodeCount={nodes.length}
        canGoBack={navHistory.canGoBack}
        onNavigateBack={handleNavigateBack}
        canGoForward={navHistory.canGoForward}
        onNavigateForward={handleNavigateForward}
        onShowShortcutsHelp={() => setIsShortcutsModalOpen(true)}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
      <GraphLegend nodes={nodes} />
    </div>
  );
});

GraphView.displayName = 'GraphView';
