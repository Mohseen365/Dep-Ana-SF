import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback, useMemo } from 'react';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import navigator from 'cytoscape-navigator';
import 'cytoscape-navigator/cytoscape.js-navigator.css';

import { ExplorerNode, ExplorerEdge, ArchitectureLayoutMode } from '../types/explorer';
import { buildGraphElements } from '../lib/graph-builder';
import { getGraphStyles } from '../lib/graph-style';
import { getLayoutOptions, runLayoutWithMetadata, runLayoutWithMetadataAsync, computeArchitectureLayoutWithMetadata, GraphLayoutOptions, type FeatureRegion } from '../lib/graph-layout';
import { ImpactAnalysisResult } from '../lib/impact-analysis';
import { FocusState } from '../lib/focus-graph';
import { GraphLayoutState, LayoutProvenance } from '../lib/projectState';
import {
  shouldAutoLayout,
  resolveAuthoritativePosition,
  calculateDeterministicNewNodePosition,
  LayoutMode,
  LayoutTrigger,
  Position,
} from '../lib/position-policy';
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
import { NodeHoverCard } from './graph-internals/NodeHoverCard';
import { EdgeHoverCard } from './graph-internals/EdgeHoverCard';
import { FeatureOverlayCanvas } from './graph-internals/FeatureOverlayCanvas';
import { useInvestigationOptional } from '../context/InvestigationContext';
import './graph-internals/graph.css';

cytoscape.use(fcose);
cytoscape.use(navigator);

const DEFAULT_EMPTY_ARRAY: string[] = [];

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

  const architectureMode: ArchitectureLayoutMode =
    architectureModeProp || graphLayout?.architectureMode || 'hierarchical';

  const enableFeatureLayout =
    enableFeatureLayoutProp ??
    layoutOptions?.enableFeatureLayout ??
    (architectureMode === 'hybrid');

  const nodePositions = props.nodePositions || graphLayout?.nodePositions;
  const layoutMode: LayoutMode = layoutModeProp || graphLayout?.mode || 'interactive';
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
  const effectiveLayoutOptionsRef = useRef<GraphLayoutOptions>(effectiveLayoutOptions);

  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
    onSelectEdgeRef.current = onSelectEdge;
    onNodeDoubleTapRef.current = onNodeDoubleTapProp;
  }, [onSelectNode, onSelectEdge, onNodeDoubleTapProp]);

  // In-session explicit drag positions
  const sessionPositionsRef = useRef<Map<string, Position>>(new Map());

  // Pending layoutstop listener reference and layout running state
  const pendingLayoutStopRef = useRef<((evt?: any) => void) | null>(null);
  const pendingModeSwitchCaptureRef = useRef<((evt?: any) => void) | null>(null);
  const isLayoutRunningRef = useRef<boolean>(false);

  // Request generation ref for async worker layout cancellation
  const layoutRequestRef = useRef<number>(0);

  // Initial mount ref to prevent duplicate element teardown / re-layout on mount
  const isInitialMountRef = useRef<boolean>(true);

  // Track previous modes
  const prevLayoutModeRef = useRef<LayoutMode>(layoutMode);
  const prevArchitectureModeRef = useRef<ArchitectureLayoutMode>(architectureMode);
  const prevFocalLwcIdRef = useRef<string | null | undefined>(effectiveLayoutOptions.focalLwcId);

  const [hoverCard, setHoverCard] = useState<HoverCardState>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isNavigatorVisible, setIsNavigatorVisible] = useState(true);
  const [featureRegions, setFeatureRegions] = useState<Map<string, FeatureRegion> | undefined>(undefined);
  const [orbitGuides, setOrbitGuides] = useState<any | undefined>(undefined);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive Feature Discovery Result deterministically
  const discoveryResult: FeatureDiscoveryResult = useMemo(() => {
    return discoverFeatures(nodes, edges);
  }, [nodes, edges]);

  // Build nodeId → featureId map for edge inter-feature classification (Hybrid mode only)
  const featureAssignmentMap = useMemo((): Map<string, string> | undefined => {
    if (architectureMode !== 'hybrid') return undefined;
    const map = new Map<string, string>();
    discoveryResult.assignments.forEach((assignment, nodeId) => {
      map.set(nodeId, assignment.primaryFeatureId);
    });
    return map;
  }, [architectureMode, discoveryResult]);

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

  // Capture all current canvas node positions with explicit provenance tracking
  const captureAndPersistPositions = useCallback((overrideProvenance?: LayoutProvenance) => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    const currentPositions: Record<string, Position> = { ...(nodePositionsRef.current || {}) };

    cy.nodes().forEach((n) => {
      const pos = n.position();
      const rounded = { x: Math.round(pos.x), y: Math.round(pos.y) };
      currentPositions[n.id()] = rounded;
      sessionPositionsRef.current.set(n.id(), rounded);
    });

    const provenance: LayoutProvenance = overrideProvenance ||
      (architectureMode === 'hybrid' ? 'automatic-hybrid' : 'automatic-hierarchical');

    if (onNodePositionsChangeRef.current) {
      (onNodePositionsChangeRef.current as any)(currentPositions, provenance);
    }
  }, [architectureMode]);

  // Handle Mode Switch
  useEffect(() => {
    if (prevLayoutModeRef.current === layoutMode) return;

    const oldMode = prevLayoutModeRef.current;
    prevLayoutModeRef.current = layoutMode;

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
        cyRef.current.one('layoutstop', onStop);
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

    // Clear transient drag positions from previous layout mode
    sessionPositionsRef.current.clear();

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

    const requestId = ++layoutRequestRef.current;
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const activeToken =
      effectiveLayoutOptionsRef.current?.correlationToken ??
      (typeof window !== 'undefined' ? (window as any).__CURRENT_CORRELATION_TOKEN__ : undefined);

    if (typeof window !== 'undefined' && (window as any).__CURRENT_CORRELATION_TOKEN__) {
      delete (window as any).__CURRENT_CORRELATION_TOKEN__;
    }

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
        (window as any).__LAST_LAYOUT_COMPLETED__ = detail;
        window.dispatchEvent(new CustomEvent('app:layoutcomplete', { detail }));
      }
    };

    if (nodesRef.current.length >= 20) {
      runLayoutWithMetadataAsync(cy, {
        ...effectiveLayoutOptionsRef.current,
        nodes: nodesRef.current,
        edges: edgesRef.current,
        nodeCount: nodesRef.current.length,
        animate: false,
        architectureMode,
        enableFeatureLayout: architectureMode === 'hybrid',
        fit: true,
      }).then((layoutRes) => {
        if (requestId !== layoutRequestRef.current) return;
        setFeatureRegions(layoutRes.featureRegions);
        setOrbitGuides(layoutRes.orbitGuides);
        captureAndPersistPositions(targetProvenance);
        notifyComplete('complete', layoutRes.correlationToken || activeToken);
      }).catch(() => {
        if (requestId !== layoutRequestRef.current) return;
        const layoutRes = runLayoutWithMetadata(cy, {
          ...effectiveLayoutOptionsRef.current,
          nodes: nodesRef.current,
          edges: edgesRef.current,
          nodeCount: nodesRef.current.length,
          animate: false,
          architectureMode,
          enableFeatureLayout: architectureMode === 'hybrid',
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
        fit: true,
      });
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
    if (isNavigatorVisible && cyRef.current && minimapRef.current) {
      destroyNavigator();
      try {
        const bodyEl = minimapRef.current.querySelector('.navigator-body') || minimapRef.current;
        navRef.current = (cyRef.current as any).navigator({
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
  }, [isNavigatorVisible, destroyNavigator]);

  // Reset Layout handler
  const executeResetLayout = useCallback(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    sessionPositionsRef.current.clear();

    if (pendingLayoutStopRef.current) {
      cy.off('layoutstop', pendingLayoutStopRef.current);
      pendingLayoutStopRef.current = null;
    }

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const nodeCount = nodesRef.current.length;
    const shouldAnimate = !prefersReducedMotion && nodeCount < 100;

    if (shouldAnimate) {
      const onStop = () => {
        pendingLayoutStopRef.current = null;
        captureAndPersistPositions();
      };
      pendingLayoutStopRef.current = onStop;
      cy.one('layoutstop', onStop);

      const layoutRes = runLayoutWithMetadata(cy, {
        ...effectiveLayoutOptionsRef.current,
        nodes: nodesRef.current,
        edges: edgesRef.current,
        nodeCount,
        animate: true,
        architectureMode,
      });
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
      setFeatureRegions(layoutRes.featureRegions);
      setOrbitGuides(layoutRes.orbitGuides);
      captureAndPersistPositions();
    }
  }, [captureAndPersistPositions]);

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
      if (cyRef.current && selectedNodeId) {
        const ele = cyRef.current.getElementById(selectedNodeId);
        if (ele.length > 0) {
          cyRef.current.animate({ center: { eles: ele } }, { duration: 250 });
        }
      }
    },
    resetLayout: executeResetLayout,
  }), [selectedNodeId, executeResetLayout]);

  // Cytoscape Initialization & Teardown
  useEffect(() => {
    if (!containerRef.current) return;

    const elements = buildGraphElements(nodesRef.current, edgesRef.current, findings, featureAssignmentMap);
    const styles = getGraphStyles({
      nodeWidth: 50,
      nodeHeight: 50,
      fontSize: 12
    });

    let hasAuth = false;
    if (nodePositionsRef.current && Object.keys(nodePositionsRef.current).length > 0) {
      const storedArchMode = graphLayoutRef.current?.architectureMode || architectureMode;
      if (storedArchMode === architectureMode) {
        hasAuth = true;
      }
    }

    const autoLayoutPolicy = shouldAutoLayout(layoutModeRef.current, 'initial', {
      hasAuthoritativePositions: hasAuth,
    });

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const layoutOptions = autoLayoutPolicy === true
      ? getLayoutOptions({
          ...effectiveLayoutOptionsRef.current,
          nodes: nodesRef.current,
          edges: edgesRef.current,
          nodeCount: nodesRef.current.length,
          padding: 50,
          animate: !prefersReducedMotion && nodesRef.current.length < 100
        })
      : { name: 'preset' };

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: styles,
      layout: layoutOptions,
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.2,
      boxSelectionEnabled: true,
      autounselectify: false
    });

    cyRef.current = cy;
    if (typeof window !== 'undefined') {
      (window as any).__CY__ = cy;
      (window as any).__LAYOUT_MODULE__ = {
        runLayoutWithMetadata,
        computeArchitectureLayoutWithMetadata,
      };
    }

    const knownPosMap: Record<string, Position> = {};
    cy.nodes().forEach((cyNode) => {
      const id = cyNode.id();
      const resolved = resolveAuthoritativePosition(id, {
        sessionPositions: sessionPositionsRef.current,
        persistedPositions: nodePositionsRef.current,
        hasAuthoritativePositions: hasAuth,
      });

      if (resolved) {
        cyNode.position({ x: resolved.position.x, y: resolved.position.y });
        knownPosMap[id] = resolved.position;
      }
    });

    if (autoLayoutPolicy === true) {
      cy.layout(layoutOptions).run();
      const layoutRes = runLayoutWithMetadata(cy, {
        ...effectiveLayoutOptionsRef.current,
        nodes: nodesRef.current,
        edges: edgesRef.current,
        nodeCount: nodesRef.current.length,
        animate: false,
        architectureMode,
        fit: true,
      });
      setFeatureRegions(layoutRes.featureRegions);
      setOrbitGuides(layoutRes.orbitGuides);
      captureAndPersistPositions();
    } else {
      let newlyPlaced = false;
      cy.nodes().forEach((cyNode) => {
        const id = cyNode.id();
        if (!knownPosMap[id]) {
          const newPos = calculateDeterministicNewNodePosition(id, edgesRef.current, knownPosMap);
          cyNode.position(newPos);
          knownPosMap[id] = newPos;
          sessionPositionsRef.current.set(id, newPos);
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

      sessionPositionsRef.current.set(nodeId, rounded);
      captureAndPersistPositions('user-authored');

      if (onNodeDragEndRef.current) {
        onNodeDragEndRef.current(nodeId, rounded);
      }

      if (onNodePositionsChangeRef.current) {
        const currentStoredPositions =
          graphLayoutRef.current?.nodePositions ||
          nodePositionsRef.current ||
          {};

        const updatedPositions = {
          ...currentStoredPositions,
          [nodeId]: rounded,
        };

        (onNodePositionsChangeRef.current as any)(updatedPositions, 'user-authored');
      }
    });

    const nodeCount = nodesRef.current.length;
    const initialZoom = nodeCount < 15 ? 1.4
                      : nodeCount < 50 ? 1.0
                      : nodeCount < 200 ? 0.7
                      : 0.4;
    cy.on('layoutstart', () => {
      isLayoutRunningRef.current = true;
    });

    cy.on('layoutstop', () => {
      isLayoutRunningRef.current = false;
    });

    cy.zoom(initialZoom);
    cy.center();

    let zoomTimeout: ReturnType<typeof setTimeout> | null = null;
    const updateZoomClass = () => {
      const currentZoom = cy.zoom();
      const nodeCount = nodesRef.current.length;
      const edgeCount = edgesRef.current.length;
      const lodConfig = computeCanvasLODLevel({ zoom: currentZoom, nodeCount, edgeCount });

      cy.batch(() => {
        cy.elements().removeClass('zoom-far zoom-mid zoom-near lod-0 lod-1 lod-2 lod-3 lod-4');

        if (lodConfig.lodLevel >= 2) {
          cy.elements().addClass(`zoom-far lod-${lodConfig.lodLevel}`);
        } else if (lodConfig.lodLevel === 1) {
          cy.elements().addClass(`zoom-mid lod-${lodConfig.lodLevel}`);
        } else {
          cy.elements().addClass(`zoom-near lod-${lodConfig.lodLevel}`);
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

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const pos = evt.renderedPosition || (typeof node.renderedPosition === 'function' ? node.renderedPosition() : { x: 0, y: 0 });
      const nodeId = node.id();
      const nodeObj = nodesRef.current.find(n => n.id === nodeId);

      setHoveredNodeId(nodeId);

      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

      if (nodeObj && pos) {
        hoverTimerRef.current = setTimeout(() => {
          setHoverCard({
            type: 'node',
            node: nodeObj,
            x: pos.x,
            y: pos.y
          });
        }, 250);
      }
    });

    cy.on('mouseout', 'node', () => {
      setHoveredNodeId(null);
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
        hoverTimerRef.current = setTimeout(() => {
          setHoverCard({
            type: 'edge',
            edge: edgeObj,
            x: pos.x,
            y: pos.y
          });
        }, 250);
      }
    });

    cy.on('mouseout', 'edge', () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setHoverCard(null);
    });

    cy.on('mouseleave', () => {
      setHoveredNodeId(null);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setHoverCard(null);
      document.body.style.cursor = 'default';
    });

    bindGraphInteractions(cy, {
      onNodeSelect: (selectedNode) => {
        const fullNode = selectedNode ? (nodesRef.current.find(n => n.id === selectedNode.id) || selectedNode) : null;
        if (investigation) {
          investigation.selectNode(fullNode ? fullNode.id : null);
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
          if (investigation) {
            investigation.selectEdge(edgeId);
          }
          onSelectEdgeRef.current(edgeId);
        }
      },
      onBackgroundTap: () => {
        if (investigation) {
          investigation.clearSelection();
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
      if (typeof window !== 'undefined' && (window as any).__CY__ === cy) {
        (window as any).__CY__ = null;
      }
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

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

    let hasAuthForUpdate = false;
    let hasGenuinelyNewNodes = false;

    if (nodePositionsRef.current && Object.keys(nodePositionsRef.current).length > 0) {
      const storedArchMode = graphLayoutRef.current?.architectureMode || architectureMode;
      if (storedArchMode === architectureMode) {
        hasAuthForUpdate = true;
      }
    }

    for (const node of nodes) {
      const resolved = resolveAuthoritativePosition(node.id, {
        sessionPositions: sessionPositionsRef.current,
        persistedPositions: nodePositionsRef.current,
        cyNodePosition: cyPositionsBefore[node.id],
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
      const resolved = resolveAuthoritativePosition(id, {
        sessionPositions: sessionPositionsRef.current,
        persistedPositions: nodePositionsRef.current,
        cyNodePosition: cyPositionsBefore[id],
        hasAuthoritativePositions: hasAuthForUpdate,
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
        sessionPositionsRef.current.set(id, newPos);
        newlyPlaced = true;
      }
    });

    if (newlyPlaced) {
      captureAndPersistPositions();
    }

    if (autoLayoutPolicy === true || architectureMode === 'orbit' || architectureMode === 'constellation') {
      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
      const shouldAnimate = !prefersReducedMotion && nodes.length < 100 && architectureMode !== 'orbit';

      const fitInSyncEffect = architectureMode === 'orbit' ? false : undefined;

      if (shouldAnimate) {
        cy.one('layoutstop', () => {
          captureAndPersistPositions();
        });
        const layoutRes = runLayoutWithMetadata(cy, {
          ...effectiveLayoutOptionsRef.current,
          nodes,
          edges,
          nodeCount: nodes.length,
          animate: true,
          architectureMode,
          fit: fitInSyncEffect,
        });
        setFeatureRegions(layoutRes.featureRegions);
        setOrbitGuides(layoutRes.orbitGuides);
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
        setFeatureRegions(layoutRes.featureRegions);
        setOrbitGuides(layoutRes.orbitGuides);
        captureAndPersistPositions();
      }
    }

    // Apply simulation visual classes
    cy.batch(() => {
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
    });

    if (selectedNodeId) {
      selectNode(cy, selectedNodeId);
      highlightNodeConnections(cy, selectedNodeId);
    } else if (selectedEdgeId) {
      const edge = cy.getElementById(selectedEdgeId);
      if (edge.length > 0 && edge.isEdge()) {
        edge.select();
      }
    }

    if (impactResult) {
      const { originNodeId, affectedNodeIds, affectedEdgeIds } = impactResult;
      cy.batch(() => {
        cy.elements().removeClass('impact-origin impact-affected impact-muted');
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
      });
    }

    if (selectedCycleNodeIds && selectedCycleNodeIds.length > 0) {
      highlightCycle(cy, selectedCycleNodeIds);
    }

    if (focusedNodeId) {
      focusOnNode(cy, focusedNodeId);
    }
  }, [nodes, edges, findings, featureAssignmentMap, architectureMode, effectiveLayoutOptions, captureAndPersistPositions, simulatedNodeIds, simulatedRemovedNodeIds, simulatedEdgeIds]);

  // Position-Only Synchronization Effect (runs when nodePositions prop changes without structural graph change)
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.batch(() => {
      cy.nodes().forEach((cyNode) => {
        const id = cyNode.id();
        const pos = sessionPositionsRef.current.get(id) || (nodePositions ? nodePositions[id] : undefined);
        if (pos) {
          const curr = cyNode.position();
          if (curr.x !== pos.x || curr.y !== pos.y) {
            cyNode.position({ x: pos.x, y: pos.y });
          }
        }
      });
    });
  }, [nodePositions]);

  // Handle selected node changes
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.batch(() => {
      if (selectedNodeId) {
        selectNode(cy, selectedNodeId);
        highlightNodeConnections(cy, selectedNodeId);
      } else if (!selectedEdgeId) {
        deselectAll(cy);
        clearHighlights(cy);
      }
    });
  }, [selectedNodeId, selectedEdgeId]);

  // Handle selected edge changes
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (selectedEdgeId) {
      const edge = cy.getElementById(selectedEdgeId);
      if (edge.length > 0 && edge.isEdge()) {
        edge.select();
      }
    }
  }, [selectedEdgeId]);

  // Handle Impact Mode highlighting
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.batch(() => {
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
    });
  }, [impactResult]);

  // Handle Cycle Mode highlighting
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (selectedCycleNodeIds && selectedCycleNodeIds.length > 0) {
      highlightCycle(cy, selectedCycleNodeIds);
    } else {
      clearCycleHighlight(cy);
    }
  }, [selectedCycleNodeIds]);

  // Handle selectedFinding element highlighting
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.batch(() => {
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
    });
  }, [selectedFinding]);

  // Handle focusedNodeId for progressive drilling
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (focusedNodeId) {
      focusOnNode(cy, focusedNodeId);
    } else if (selectedNodeId) {
      highlightNodeConnections(cy, selectedNodeId);
    } else {
      clearHighlights(cy);
    }
  }, [focusedNodeId, selectedNodeId]);

  // Keyboard Navigation Handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (e.key === 'f' || e.key === 'F' || e.key === '0') {
      fitToScreen(cy, 50);
    } else if (e.key === '+' || e.key === '=') {
      cy.zoom(cy.zoom() * 1.2);
    } else if (e.key === '-' || e.key === '_') {
      cy.zoom(cy.zoom() * 0.8);
    } else if (e.key === 'Escape') {
      onSelectNode(null);
      onSelectEdge('');
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (selectedNodeId) {
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
    const nextMode: ArchitectureLayoutMode =
      architectureMode === 'hierarchical'
        ? 'hybrid'
        : architectureMode === 'hybrid'
        ? 'orbit'
        : architectureMode === 'orbit'
        ? 'constellation'
        : 'hierarchical';
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
    >
      <div ref={containerRef} className="cytoscape-view" />

      {/* Feature Composition & Orbit Guide Overlay Canvas */}
      <FeatureOverlayCanvas
        cy={cyRef.current}
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
        orbitGuides={architectureMode === 'orbit' ? orbitGuides : undefined}
      />

      {/* Mode Indicator Overlay Badge */}
      <div
        className={`graph-mode-badge ${layoutMode === 'static' ? 'static' : 'interactive'}`}
        data-testid="graph-mode-indicator"
        title={layoutMode === 'static' ? 'Node positions are preserved' : 'Graph automatically arranges nodes'}
      >
        {layoutMode === 'static' ? '📌 Static Mode — Node positions preserved' : `🔀 Interactive Mode (${architectureMode === 'constellation' ? 'Constellation' : architectureMode === 'orbit' ? 'Orbit' : architectureMode === 'hybrid' ? 'Hybrid' : 'Hierarchical'})`}
      </div>

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

      {/* Floating Controls & Legend */}
      <GraphControls
        onZoomIn={() => {
          if (cyRef.current) {
            cyRef.current.zoom({
              level: cyRef.current.zoom() * 1.2,
              renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 }
            });
          }
        }}
        onZoomOut={() => {
          if (cyRef.current) {
            cyRef.current.zoom({
              level: cyRef.current.zoom() * 0.8,
              renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 }
            });
          }
        }}
        onFitView={() => {
          if (cyRef.current) fitToScreen(cyRef.current, 50);
        }}
        onCenterSelected={() => {
          if (cyRef.current && selectedNodeId) {
            const ele = cyRef.current.getElementById(selectedNodeId);
            if (ele.length > 0) cyRef.current.animate({ center: { eles: ele } }, { duration: 200 });
          }
        }}
        onResetLayout={executeResetLayout}
        hasSelectedNode={!!selectedNodeId}
        selectedNodeId={selectedNodeId}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        isNavigatorVisible={isNavigatorVisible}
        onToggleNavigator={() => setIsNavigatorVisible((prev) => !prev)}
        focusState={focusState}
        onFocusChange={onFocusChange}
        layoutMode={layoutMode}
        onToggleLayoutMode={onLayoutModeChange ? handleToggleLayoutModeInternal : undefined}
        architectureMode={architectureMode}
        onToggleArchitectureMode={onArchitectureModeChange ? handleToggleArchitectureModeInternal : undefined}
      />
      <GraphLegend nodes={nodes} />
    </div>
  );
});

GraphView.displayName = 'GraphView';
