import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { buildGraphElements } from '../lib/graph-builder';
import { getGraphStyles } from '../lib/graph-style';
import { getLayoutOptions, runLayout } from '../lib/graph-layout';
import { ImpactAnalysisResult } from '../lib/impact-analysis';
import { bindGraphInteractions, fitToScreen, selectNode, deselectAll, highlightCycle, clearCycleHighlight } from '../lib/graph-interactions';

interface GraphViewProps {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  onSelectNode: (node: ExplorerNode | null) => void;
  onSelectEdge: (edgeId: string) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  impactResult?: ImpactAnalysisResult | null;
  selectedCycleNodeIds?: string[] | null;
}

export const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  edges,
  onSelectNode,
  onSelectEdge,
  selectedNodeId,
  selectedEdgeId,
  impactResult
  selectedCycleNodeIds
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const nodesRef = useRef<ExplorerNode[]>(nodes);

  // Keep nodes ref updated
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Initialize Cytoscape graph
  useEffect(() => {
    if (!containerRef.current) return;

    // Build graph elements using the separated module
    const elements = buildGraphElements(nodes, edges);
    
    // Get styles using the separated module
    const styles = getGraphStyles({
      nodeWidth: 50,
      nodeHeight: 50,
      fontSize: 12
    });

    // Get layout options using the separated module
    const layoutOptions = getLayoutOptions({
      padding: 50,
      animate: false
    });

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: styles,
      layout: layoutOptions,
      // Enable interactions
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.2,
      boxSelectionEnabled: false,
      autounselectify: false
    });

    // Store reference
    cyRef.current = cy;

    // Bind interactions using the separated module
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
        // Background tap - deselect
      },
      onGraphReady: (graph) => {
        // Fit to screen after layout completes
        fitToScreen(graph, 50);
      }
    }, nodes);

    // Initial fit-to-screen after layout
    cy.one('layoutstop', () => {
      fitToScreen(cy, 50);
    });

    // Run initial layout
    runLayout(cy, { animate: false });

    // Cleanup on unmount
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, onSelectNode]);

  // Handle external selection changes
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (selectedNodeId) {
      // Select the node in Cytoscape
      const success = selectNode(cy, selectedNodeId);
      if (success) {
        // Center on the selected node
        cy.animate({
          center: { eles: cy.getElementById(selectedNodeId) },
          zoom: cy.zoom()
        }, {
          duration: 200,
          easing: 'ease-out'
        });
      }
    } else if (!selectedEdgeId) {
      // Deselect all when no node or edge is selected
      deselectAll(cy);
    }
  }, [selectedNodeId]);

  // Handle edge selection changes
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (selectedEdgeId) {
      const edge = cy.getElementById(selectedEdgeId);
      if (edge.length > 0 && edge.isEdge()) {
        edge.select();
        // Center on the edge
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
  // Handle cycle highlighting
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.batch(() => {
      // Remove all impact classes first
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
    if (selectedCycleNodeIds && selectedCycleNodeIds.length > 0) {
      highlightCycle(cy, selectedCycleNodeIds);
    } else {
      clearCycleHighlight(cy);
    }
  }, [selectedCycleNodeIds]);

  return (
    <div className="graph-container">
      <div ref={containerRef} className="cytoscape-view" />
    </div>
  );
};
