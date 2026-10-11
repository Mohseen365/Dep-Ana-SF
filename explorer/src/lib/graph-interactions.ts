import type cytoscape from 'cytoscape';
import type { ExplorerNode } from '../types/explorer';
import type { GraphNodeData } from './graph-builder';

/**
 * Binds event handlers to the Cytoscape graph instance.
 * Handles node selection, tap-to-deselect, and provides interaction callbacks.
 */
export interface InteractionCallbacks {
  onNodeSelect?: (node: ExplorerNode | null) => void;
  onNodeTap?: (nodeId: string, nodeData: GraphNodeData | undefined) => void;
  onNodeDoubleTap?: (nodeId: string, node: ExplorerNode | null) => void;
  onBackgroundTap?: () => void;
  onEdgeSelect?: (edgeId: string) => void;
  onEdgeTap?: (edgeId: string) => void;
  onGraphReady?: (cy: cytoscape.Core) => void;
}

export function bindGraphInteractions(
  cy: cytoscape.Core,
  callbacks: InteractionCallbacks,
  originalNodes?: ExplorerNode[]
): void {
  const { onNodeSelect, onNodeTap, onNodeDoubleTap, onBackgroundTap, onEdgeSelect, onEdgeTap, onGraphReady } = callbacks;

  // Node tap event
  cy.on('tap', 'node', (event) => {
    const node = event.target;
    const nodeId = node.id();
    const nodeData = node.data() as GraphNodeData;
    
    // Find the full node object from original data if available
    let explorerNode: ExplorerNode | null = null;
    
    if (originalNodes) {
      const found = originalNodes.find(n => n.id === nodeId);
      if (found) {
        explorerNode = found;
      }
    }
    
    // Fallback: create minimal node object from cytoscape data
    if (!explorerNode && nodeData) {
      explorerNode = {
        id: nodeData.id,
        displayName: nodeData.label,
        type: nodeData.type as any,
        file: nodeData.file,
        metrics: {
          fanIn: nodeData.fanIn || 0,
          fanOut: nodeData.fanOut || 0,
          coupling: nodeData.coupling || 0,
          unresolved: nodeData.hasUnresolved ? 1 : 0,
          score: 0
        },
        risk: nodeData.risk as any,
        riskReasons: [],
        behavior: {
          isTest: nodeData.isTest || false,
          sharing: null,
          publicContractsCount: 0,
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: 0,
          dmlCount: 0,
          calloutCount: 0
        },
        refactoringReadiness: {
          isHighRisk: nodeData.risk === 'HIGH',
          hasCycles: nodeData.hasCycles || false,
          hasUnresolved: nodeData.hasUnresolved || false,
          testCoverageStatus: 'COVERED'
        }
      };
    }
    
    if (onNodeTap) {
      onNodeTap(nodeId, nodeData);
    }
    
    if (onNodeSelect) {
      onNodeSelect(explorerNode);
    }
  });

  let lastDblTapTime = 0;
  let lastDblTapNodeId = '';

  // Node double tap / double click event
  cy.on('dbltap dblclick', 'node', (event) => {
    const node = event.target;
    const nodeId = typeof node?.id === 'function' ? node.id() : node?.id;
    if (!nodeId) return;

    const now = Date.now();
    // Suppress duplicate event dispatches (e.g., Cytoscape emitting both dbltap and dblclick for the same gesture)
    if (nodeId === lastDblTapNodeId && now - lastDblTapTime < 50) {
      return;
    }
    lastDblTapTime = now;
    lastDblTapNodeId = nodeId;

    let explorerNode: ExplorerNode | null = null;
    if (originalNodes) {
      const found = originalNodes.find(n => n.id === nodeId);
      if (found) {
        explorerNode = found;
      }
    }

    if (onNodeDoubleTap) {
      onNodeDoubleTap(nodeId, explorerNode);
    }
  });

  // Edge tap event
  cy.on('tap', 'edge', (event) => {
    const edge = event.target;
    const edgeId = edge.id();
    
    if (onEdgeSelect) {
      onEdgeSelect(edgeId);
    }
    
    if (onEdgeTap) {
      onEdgeTap(edgeId);
    }
  });

  // Background tap (deselect)
  cy.on('tap', (event) => {
    if (event.target === cy) {
      if (onBackgroundTap) {
        onBackgroundTap();
      }
      if (onNodeSelect) {
        onNodeSelect(null);
      }
    }
  });

  // Mouseover for nodes - cursor change
  cy.on('mouseover', 'node', (event) => {
    event.target.addClass('hovered');
    document.body.style.cursor = 'pointer';
  });

  cy.on('mouseout', 'node', (event) => {
    event.target.removeClass('hovered');
    document.body.style.cursor = 'default';
  });

  // Graph ready event
  if (onGraphReady) {
    onGraphReady(cy);
  }
}

/**
 * Fit the graph to the viewport with optional padding.
 */
export function fitToScreen(cy: cytoscape.Core, padding: number = 50): void {
  cy.fit(undefined, padding);
}

/**
 * Center the graph in the viewport.
 */
export function centerGraph(cy: cytoscape.Core, animated: boolean = true): void {
  if (animated) {
    cy.animate({
      center: { eles: cy.elements() },
      zoom: cy.zoom()
    }, {
      duration: 300,
      easing: 'ease-in-out'
    });
  } else {
    cy.center();
  }
}

/**
 * Zoom to fit all elements with padding.
 */
export function zoomToFit(cy: cytoscape.Core, padding: number = 50): void {
  cy.fit(undefined, padding);
}

/**
 * Get the currently selected node(s).
 */
export function getSelectedNodes(cy: cytoscape.Core): cytoscape.SingularElementReturnValue {
  return cy.nodes(':selected') as cytoscape.SingularElementReturnValue;
}

/**
 * Select a node by ID.
 */
export function selectNode(cy: cytoscape.Core, nodeId: string): boolean {
  const node = cy.getElementById(nodeId);
  if (node.length > 0 && node.isNode()) {
    node.select();
    return true;
  }
  return false;
}

/**
 * Deselect all nodes.
 */
export function deselectAll(cy: cytoscape.Core): void {
  cy.elements().unselect();
}

/**
 * Highlight a node and its connections.
 */
export function highlightNodeConnections(
  cy: cytoscape.Core,
  nodeId: string,
  _highlightColor: string = '#3b82f6'
): void {
  const node = cy.getElementById(nodeId);
  if (node.length === 0 || !node.isNode()) return;
  
  // Get connected edges and neighbor nodes safely
  const connectedEdges = typeof node.connectedEdges === 'function' ? node.connectedEdges() : null;
  const neighbors = typeof node.neighborhood === 'function' ? node.neighborhood('node') : null;
  
  // Dim everything first
  if (typeof cy.elements === 'function') {
    const eles = cy.elements();
    if (typeof eles.addClass === 'function') eles.addClass('dimmed');
  }
  
  // Remove dim from the selected node and its connections
  if (typeof node.removeClass === 'function') node.removeClass('dimmed');
  if (connectedEdges && typeof connectedEdges.removeClass === 'function') connectedEdges.removeClass('dimmed');
  if (neighbors && typeof neighbors.removeClass === 'function') neighbors.removeClass('dimmed');
  
  // Apply highlight
  if (typeof node.addClass === 'function') node.addClass('highlighted');
  if (connectedEdges && typeof connectedEdges.addClass === 'function') connectedEdges.addClass('highlighted');
  if (neighbors && typeof neighbors.addClass === 'function') neighbors.addClass('highlighted');
}

/**
 * Clear all highlights.
 */
export function clearHighlights(cy: cytoscape.Core): void {
  cy.elements().removeClass('dimmed highlighted');
}

/**
 * Highlight a cycle group on the graph and mute/dim unrelated content.
 */
export function highlightCycle(
  cy: cytoscape.Core,
  cycleNodeIds: string[]
): void {
  if (!cy) return;

  // Clear any existing highlights/dimming first
  cy.elements().removeClass('dimmed highlighted');

  if (!cycleNodeIds || cycleNodeIds.length === 0) {
    return;
  }

  const cycleNodeSet = new Set(cycleNodeIds);

  // Dim all elements by default
  cy.elements().addClass('dimmed');

  // Find cycle nodes
  const cycleNodes = cy.nodes().filter(node => cycleNodeSet.has(node.id()));

  // Find cycle edges (edges connecting nodes in the cycle)
  const cycleEdges = cy.edges().filter(edge => {
    const src = edge.data('source');
    const tgt = edge.data('target');
    return cycleNodeSet.has(src) && cycleNodeSet.has(tgt);
  });

  // Remove dimmed and add highlighted to cycle elements
  if (typeof cycleNodes.removeClass === 'function') {
    cycleNodes.removeClass('dimmed').addClass('highlighted');
  } else {
    cy.batch(() => {
      cy.nodes().forEach(node => {
        if (cycleNodeSet.has(node.id())) {
          node.removeClass('dimmed');
          node.addClass('highlighted');
        }
      });
    });
  }

  if (typeof cycleEdges.removeClass === 'function') {
    cycleEdges.removeClass('dimmed').addClass('highlighted');
  } else {
    cy.batch(() => {
      cy.edges().forEach(edge => {
        const src = edge.data('source');
        const tgt = edge.data('target');
        if (cycleNodeSet.has(src) && cycleNodeSet.has(tgt)) {
          edge.removeClass('dimmed');
          edge.addClass('highlighted');
        }
      });
    });
  }

  // Center and fit viewport to cycle nodes if any exist
  if (cycleNodes.length > 0) {
    cy.animate({
      fit: {
        eles: cycleNodes,
        padding: 50
      }
    }, {
      duration: 300,
      easing: 'ease-in-out'
    });
  }
}

/**
 * Clear cycle highlight and restore normal appearance.
 */
export function clearCycleHighlight(cy: cytoscape.Core): void {
  if (!cy) return;
  cy.elements().removeClass('dimmed highlighted');
}

/**
 * Pan to a specific node.
 */
export function panToNode(cy: cytoscape.Core, nodeId: string, animated: boolean = true): boolean {
  const node = cy.getElementById(nodeId);
  if (node.length === 0) return false;
  
  if (animated) {
    cy.animate({
      center: { eles: node },
      zoom: cy.zoom()
    }, {
      duration: 300,
      easing: 'ease-in-out'
    });
  } else {
    cy.center(node);
  }
  
  return true;
}

/**
 * Zoom in/out.
 */
export function zoomGraph(cy: cytoscape.Core, level: number): void {
  cy.zoom({
    level: level,
    renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 }
  });
}

export function zoomIn(cy: cytoscape.Core): void {
  const currentZoom = cy.zoom();
  cy.zoom({
    level: currentZoom * 1.2,
    renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 }
  });
}

export function zoomOut(cy: cytoscape.Core): void {
  const currentZoom = cy.zoom();
  cy.zoom({
    level: currentZoom / 1.2,
    renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 }
  });
}

/**
 * Enable/disable mouse wheel / user zooming at runtime.
 */
export function setMouseWheelZoom(cy: cytoscape.Core, enabled: boolean): void {
  if (!cy) return;
  if (typeof cy.userZoomingEnabled === 'function') {
    cy.userZoomingEnabled(Boolean(enabled));
  }
}

/**
 * Enable/disable user panning at runtime.
 */
export function setPanning(cy: cytoscape.Core, enabled: boolean): void {
  if (!cy) return;
  if (typeof cy.userPanningEnabled === 'function') {
    cy.userPanningEnabled(Boolean(enabled));
  } else if (typeof cy.panningEnabled === 'function') {
    cy.panningEnabled(Boolean(enabled));
  }
}

/**
 * Enable/disable box selection.
 */
export function setBoxSelection(cy: cytoscape.Core, enabled: boolean): void {
  if (enabled) {
    cy.boxSelectionEnabled(true);
  } else {
    cy.boxSelectionEnabled(false);
  }
}

/**
 * Focuses on a node during drilling:
 * - Centers viewport on the node (animated, 300ms) without changing zoom level.
 * - If the node has zero neighbors in the current visible set, falls back to fitToScreen.
 * - Dims all unrelated nodes/edges, keeping current node + direct neighbors highlighted.
 */
export function focusOnNode(cy: cytoscape.Core, nodeId: string): void {
  if (!cy || !nodeId) return;

  const node = cy.getElementById(nodeId);
  if (node.length === 0 || !node.isNode()) {
    fitToScreen(cy, 50);
    return;
  }

  const neighbors = node.neighborhood('node');

  if (neighbors.length === 0) {
    fitToScreen(cy, 50);
  } else {
    cy.animate(
      {
        center: { eles: node },
        zoom: cy.zoom(),
      },
      {
        duration: 300,
        easing: 'ease-in-out',
      }
    );
  }

  // Dim unrelated nodes and edges, keeping current node + direct neighbors highlighted
  cy.batch(() => {
    cy.elements().addClass('dimmed');
    node.removeClass('dimmed');
    node.connectedEdges().removeClass('dimmed');
    neighbors.removeClass('dimmed');
  });
}