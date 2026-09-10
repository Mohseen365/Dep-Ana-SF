import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { ExplorerNode, ExplorerEdge } from '../types/explorer';

interface GraphViewProps {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  onSelectNode: (node: ExplorerNode | null) => void;
  selectedNodeId: string | null;
}

export const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  edges,
  onSelectNode,
  selectedNodeId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Collect all node IDs present in nodes array
    const knownNodeIds = new Set(nodes.map((n) => n.id));

    // Build Cytoscape nodes from explicit nodes
    const cyNodes = nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.displayName,
        type: node.type,
        risk: node.risk,
        coupling: node.metrics.coupling
      }
    }));

    // Check for any edge targets/sources not in knownNodeIds and synthesize external nodes
    edges.forEach((edge) => {
      if (!knownNodeIds.has(edge.source)) {
        knownNodeIds.add(edge.source);
        cyNodes.push({
          data: {
            id: edge.source,
            label: edge.source.includes(':') ? edge.source.split(':')[1] : edge.source,
            type: 'External',
            risk: 'LOW',
            coupling: 0
          }
        });
      }
      if (!knownNodeIds.has(edge.target)) {
        knownNodeIds.add(edge.target);
        cyNodes.push({
          data: {
            id: edge.target,
            label: edge.target.includes(':') ? edge.target.split(':')[1] : edge.target,
            type: 'External',
            risk: 'LOW',
            coupling: 0
          }
        });
      }
    });

    const cyEdges = edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relationshipType: edge.relationshipType,
        unresolved: edge.unresolved ? 'true' : 'false'
      }
    }));

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'background-color': '#2563eb',
            'color': '#f8fafc',
            'font-size': '12px',
            'font-weight': 'bold',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'width': 36,
            'height': 36,
            'border-width': 2,
            'border-color': '#1e293b'
          }
        },
        {
          selector: 'node[type = "External"]',
          style: {
            'background-color': '#64748b',
            'border-color': '#334155'
          }
        },
        {
          selector: 'node[risk = "HIGH"]',
          style: {
            'background-color': '#ef4444',
            'border-color': '#991b1b'
          }
        },
        {
          selector: 'node[risk = "MEDIUM"]',
          style: {
            'background-color': '#f59e0b',
            'border-color': '#92400e'
          }
        },
        {
          selector: 'node[risk = "LOW"]',
          style: {
            'background-color': '#10b981',
            'border-color': '#065f46'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#3b82f6'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'font-size': '10px',
            'color': '#64748b'
          }
        },
        {
          selector: 'edge[unresolved = "true"]',
          style: {
            'line-style': 'dashed',
            'line-color': '#f97316',
            'target-arrow-color': '#f97316'
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: false,
        padding: 50
      }
    });

    cy.on('tap', 'node', (evt) => {
      const clickedId = evt.target.id();
      const nodeObj = nodes.find((n) => n.id === clickedId) || null;
      onSelectNode(nodeObj);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onSelectNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [nodes, edges, onSelectNode]);

  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.nodes().unselect();
    if (selectedNodeId) {
      const selectedCyNode = cy.getElementById(selectedNodeId);
      if (selectedCyNode) {
        selectedCyNode.select();
      }
    }
  }, [selectedNodeId]);

  return (
    <div className="graph-container">
      <div ref={containerRef} className="cytoscape-view" />
    </div>
  );
};
