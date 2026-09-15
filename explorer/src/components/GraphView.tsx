import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import navigator from 'cytoscape-navigator';
import 'cytoscape-navigator/cytoscape.js-navigator.css';

import { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { buildGraphElements } from '../lib/graph-builder';
import { getGraphStyles } from '../lib/graph-style';
import { getLayoutOptions, runLayout } from '../lib/graph-layout';
import { ImpactAnalysisResult } from '../lib/impact-analysis';
import { FocusState } from '../lib/focus-graph';
import {
  bindGraphInteractions,
  fitToScreen,
  selectNode,
  deselectAll,
  highlightCycle,
  clearCycleHighlight,
  focusOnNode,
  clearHighlights,
} from '../lib/graph-interactions';

import { GraphControls } from './GraphControls';
import { GraphLegend } from './GraphLegend';
import { NodeHoverCard } from './graph-internals/NodeHoverCard';
import { EdgeHoverCard } from './graph-internals/EdgeHoverCard';
import './graph-internals/graph.css';

cytoscape.use(fcose);
cytoscape.use(navigator);

export interface GraphViewProps {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  onSelectNode: (node: ExplorerNode | null) => void;
  onSelectEdge: (edgeId: string) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  impactResult?: ImpactAnalysisResult | null;
  selectedCycleNodeIds?: string[] | null;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  focusedNodeId?: string | null;
  focusState?: FocusState;
  onFocusChange?: (focusState: FocusState) => void;
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

export const GraphView = forwardRef<GraphViewRef, GraphViewProps>(({
  nodes,
  edges,
  onSelectNode,
  onSelectEdge,
  selectedNodeId,
  selectedEdgeId,
  impactResult,
  selectedCycleNodeIds,
  onToggleFullscreen,
  isFullscreen = false,
  focusedNodeId,
  focusState,
  onFocusChange,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const navRef = useRef<any>(null);

  const nodesRef = useRef<ExplorerNode[]>(nodes);
  const edgesRef = useRef<ExplorerEdge[]>(edges);

  const [hoverCard, setHoverCard] = useState<HoverCardState>(null);
  const [isNavigatorVisible, setIsNavigatorVisible] = useState(true);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep internal refs synchronized with latest props
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Re-attach cytoscape navigator when isNavigatorVisible becomes true or cy changes
  useEffect(() => {
    if (isNavigatorVisible && cyRef.current && minimapRef.current) {
      if (navRef.current && typeof navRef.current.destroy === 'function') {
        try { navRef.current.destroy(); } catch (e) {}
      }
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
  }, [isNavigatorVisible]);

  // Expose imperative control methods via Ref
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
    resetLayout: () => {
      if (cyRef.current) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        runLayout(cyRef.current, {
          nodeCount: nodes.length,
          animate: !prefersReducedMotion && nodes.length < 100
        });
      }
    }
  }), [selectedNodeId, nodes.length]);

  // Main Cytoscape Initialization & Teardown
  useEffect(() => {
    if (!containerRef.current) return;

    const elements = buildGraphElements(nodes, edges);
    const styles = getGraphStyles({
      nodeWidth: 50,
      nodeHeight: 50,
      fontSize: 12
    });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layoutOptions = getLayoutOptions({
      nodeCount: nodes.length,
      padding: 50,
      animate: !prefersReducedMotion && nodes.length < 100
    });

    // A5. Cytoscape instance creation with wheelSensitivity & boxSelectionEnabled
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

    // A6. Minimap Initialization
    if (minimapRef.current && isNavigatorVisible) {
      try {
        const bodyEl = minimapRef.current.querySelector('.navigator-body') || minimapRef.current;
        navRef.current = (cy as any).navigator({
          container: bodyEl,
          scale: 0.15
        });
      } catch (err) {
        console.warn('Cytoscape navigator init notice:', err);
      }
    }

    // A7. Initial Zoom by Node Count
    const nodeCount = nodes.length;
    const initialZoom = nodeCount < 15 ? 1.4
                      : nodeCount < 50 ? 1.0
                      : nodeCount < 200 ? 0.7
                      : 0.4;
    cy.zoom(initialZoom);
    cy.center();

    // A4. Throttled (60ms) Zoom Listener for Semantic Zoom
    let zoomTimeout: ReturnType<typeof setTimeout> | null = null;
    const updateZoomClass = () => {
      const currentZoom = cy.zoom();
      cy.batch(() => {
        cy.elements().removeClass('zoom-far zoom-mid zoom-near');
        if (currentZoom < 0.5) {
          cy.elements().addClass('zoom-far');
        } else if (currentZoom < 1.5) {
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

    // A9. Hover Cards with 250ms Delay
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      const pos = evt.renderedPosition;
      const nodeId = node.id();
      const nodeObj = nodesRef.current.find(n => n.id === nodeId);

      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

      if (nodeObj) {
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

    // Interaction bindings
    bindGraphInteractions(cy, {
      onNodeSelect: (selectedNode) => {
        onSelectNode(selectedNode);
      },
      onEdgeSelect: (edgeId) => {
        if (edgeId) {
          onSelectEdge(edgeId);
        }
      },
      onBackgroundTap: () => {
        onSelectNode(null);
      }
    }, nodes);

    // A3. ResizeObserver calling cy.resize()
    const resizeObserver = new ResizeObserver(() => {
      if (cyRef.current) {
        cyRef.current.resize();
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Grid transition hardening: fire cy.resize() on transitionend of parent layout containers
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
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (zoomTimeout) clearTimeout(zoomTimeout);
      resizeObserver.disconnect();
      window.removeEventListener('transitionend', handleTransitionEnd);

      if (navRef.current && typeof navRef.current.destroy === 'function') {
        try { navRef.current.destroy(); } catch (e) {}
      }

      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, onSelectNode, onSelectEdge]);

  // Handle selected node changes
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (selectedNodeId) {
      const success = selectNode(cy, selectedNodeId);
      if (success) {
        const node = cy.getElementById(selectedNodeId);
        cy.animate({
          center: { eles: node },
          zoom: cy.zoom()
        }, {
          duration: 200,
          easing: 'ease-out'
        });
      }
    } else if (!selectedEdgeId) {
      deselectAll(cy);
    }
  }, [selectedNodeId, selectedEdgeId]);

  // Handle selected edge changes
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (selectedEdgeId) {
      const edge = cy.getElementById(selectedEdgeId);
      if (edge.length > 0 && edge.isEdge()) {
        edge.select();
        cy.animate({
          center: { eles: edge },
          zoom: cy.zoom()
        }, {
          duration: 200,
          easing: 'ease-out'
        });
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

  // Handle focusedNodeId for progressive drilling centering and dimming
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (focusedNodeId) {
      focusOnNode(cy, focusedNodeId);
    } else {
      clearHighlights(cy);
    }
  }, [focusedNodeId]);

  // A8. Keyboard Navigation Handler
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

  return (
    <div
      className="graph-container"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Salesforce Architecture Dependency Graph"
    >
      <div ref={containerRef} className="cytoscape-view" />

      {/* Product-Grade Navigator Container Floating Bottom Right */}
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

      {/* A8. Screen Reader Accessible Node List */}
      <ul role="tree" className="sr-only" aria-label="Component Nodes">
        {nodes.map(n => (
          <li
            key={n.id}
            role="treeitem"
            tabIndex={0}
            aria-selected={n.id === selectedNodeId}
            aria-label={`${n.displayName}, ${n.type}, risk ${n.risk}`}
            onClick={() => onSelectNode(n)}
            onKeyDown={(evt) => {
              if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault();
                onSelectNode(n);
              }
            }}
          >
            {n.displayName}
          </li>
        ))}
      </ul>

      {/* A9. Hover Cards */}
      {hoverCard && hoverCard.type === 'node' && (
        <NodeHoverCard
          node={hoverCard.node}
          x={hoverCard.x}
          y={hoverCard.y}
        />
      )}

      {hoverCard && hoverCard.type === 'edge' && (
        <EdgeHoverCard
          edge={hoverCard.edge}
          x={hoverCard.x}
          y={hoverCard.y}
        />
      )}

      {/* A10. Floating Controls (Bottom Right) & Legend (Bottom Left) */}
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
        onResetLayout={() => {
          if (cyRef.current) {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            runLayout(cyRef.current, {
              nodeCount: nodes.length,
              animate: !prefersReducedMotion && nodes.length < 100
            });
          }
        }}
        hasSelectedNode={!!selectedNodeId}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        isNavigatorVisible={isNavigatorVisible}
        onToggleNavigator={() => setIsNavigatorVisible((prev) => !prev)}
        focusState={focusState}
        onFocusChange={onFocusChange}
      />
      <GraphLegend nodes={nodes} />
    </div>
  );
});

GraphView.displayName = 'GraphView';
