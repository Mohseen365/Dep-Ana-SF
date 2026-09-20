import React, { useEffect, useState, useMemo } from 'react';
import type cytoscape from 'cytoscape';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { FeatureDiscoveryResult } from '../../lib/layout/features';
import { deriveFeatureCompositionGroups, type FeatureCompositionGroup } from '../../lib/layout/feature-composition';
import { getSharedHighlightData, type SharedHighlightResult } from '../../lib/layout/shared-highlight';

export interface FeatureOverlayCanvasProps {
  cy: cytoscape.Core | null;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  discoveryResult?: FeatureDiscoveryResult | null;
  selectedNodeId?: string | null;
  hoveredNodeId?: string | null;
  nodePositions?: Record<string, { x: number; y: number }>;
  enableOverlay?: boolean;
}

export const FeatureOverlayCanvas: React.FC<FeatureOverlayCanvasProps> = ({
  cy,
  nodes,
  edges,
  discoveryResult,
  selectedNodeId,
  hoveredNodeId,
  nodePositions,
  enableOverlay = true,
}) => {
  const [transform, setTransform] = useState<{ pan: { x: number; y: number }; zoom: number }>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });

  // Track Cytoscape pan and zoom transform
  useEffect(() => {
    if (!cy) return;

    const updateTransform = () => {
      setTransform({
        pan: cy.pan(),
        zoom: cy.zoom(),
      });
    };

    updateTransform();

    cy.on('pan zoom position render bounds', updateTransform);

    return () => {
      cy.off('pan zoom position render bounds', updateTransform);
    };
  }, [cy]);

  // Capture live node positions from Cytoscape or props
  const currentPositions = useMemo(() => {
    if (nodePositions && Object.keys(nodePositions).length > 0) {
      return nodePositions;
    }
    const posMap: Record<string, { x: number; y: number }> = {};
    if (cy) {
      cy.nodes().forEach((n) => {
        posMap[n.id()] = n.position();
      });
    }
    return posMap;
  }, [cy, nodePositions, transform]);

  // Derive LWC composition groups for all features
  const compositionGroups = useMemo(() => {
    if (!enableOverlay || !discoveryResult) return [];

    const allGroups: FeatureCompositionGroup[] = [];
    discoveryResult.features.forEach((feature) => {
      const groups = deriveFeatureCompositionGroups(
        feature,
        nodes,
        edges,
        currentPositions
      );
      allGroups.push(...groups);
    });

    return allGroups;
  }, [enableOverlay, discoveryResult, nodes, edges, currentPositions]);

  // Derive Shared Infrastructure highlight connections
  const activeHighlightNodeId = hoveredNodeId || selectedNodeId || null;
  const sharedHighlight: SharedHighlightResult = useMemo(() => {
    if (!enableOverlay || !discoveryResult || !activeHighlightNodeId) {
      return {
        type: 'none',
        activeId: '',
        sharedNodeIds: [],
        featureIds: [],
        connectedNodeIds: [],
        connectedEdgeIds: [],
      };
    }

    return getSharedHighlightData(activeHighlightNodeId, discoveryResult, nodes, edges);
  }, [enableOverlay, discoveryResult, activeHighlightNodeId, nodes, edges]);

  if (!enableOverlay || !cy) {
    return null;
  }

  const { pan, zoom } = transform;

  return (
    <svg
      className="feature-overlay-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
        overflow: 'visible',
      }}
      data-testid="feature-overlay-canvas"
    >
      <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
        {/* Render LWC Composition Group Outline Boxes */}
        {compositionGroups.map((group) => {
          if (!group.bounds) return null;
          const { xMin, yMin, width, height } = group.bounds;
          const labelWidth = (group.label?.length || 10) * 6.5 + 16;

          return (
            <g key={group.id} className="composition-group-overlay">
              <rect
                x={xMin}
                y={yMin}
                width={width}
                height={height}
                rx={10}
                fill="rgba(99, 102, 241, 0.03)"
                stroke="rgba(99, 102, 241, 0.45)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
              />
              <rect
                x={xMin + 8}
                y={yMin - 11}
                width={labelWidth}
                height={20}
                rx={4}
                fill="rgba(30, 41, 59, 0.9)"
                stroke="rgba(99, 102, 241, 0.5)"
                strokeWidth={1}
              />
              <text
                x={xMin + 16}
                y={yMin + 3}
                fill="#cbd5e1"
                fontSize={10}
                fontWeight={600}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {group.label}
              </text>
            </g>
          );
        })}

        {/* Render Shared Infrastructure Highlighting Connections */}
        {sharedHighlight.type !== 'none' && (
          <g className="shared-highlight-overlay">
            {sharedHighlight.sharedNodeIds.map((sId) => {
              const sharedPos = currentPositions[sId];
              if (!sharedPos) return null;

              return sharedHighlight.featureIds.map((fId) => {
                const feature = discoveryResult?.features.get(fId);
                if (!feature) return null;

                // Calculate centroid of connected feature
                let sumX = 0;
                let sumY = 0;
                let count = 0;
                feature.primaryNodeIds.forEach((pId) => {
                  const pPos = currentPositions[pId];
                  if (pPos) {
                    sumX += pPos.x;
                    sumY += pPos.y;
                    count++;
                  }
                });

                if (count === 0) return null;
                const fX = sumX / count;
                const fY = sumY / count;

                const midX = (sharedPos.x + fX) / 2;
                const midY = (sharedPos.y + fY) / 2 - 30;

                return (
                  <g key={`link_${sId}_${fId}`}>
                    <path
                      d={`M ${sharedPos.x} ${sharedPos.y} Q ${midX} ${midY} ${fX} ${fY}`}
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      strokeDasharray="6 3"
                      fill="none"
                      opacity={0.85}
                    />
                    <circle cx={sharedPos.x} cy={sharedPos.y} r={18} fill="none" stroke="#38bdf8" strokeWidth={2} opacity={0.6} />
                    <circle cx={fX} cy={fY} r={24} fill="none" stroke="#818cf8" strokeWidth={2} opacity={0.5} strokeDasharray="4 2" />
                  </g>
                );
              });
            })}
          </g>
        )}
      </g>
    </svg>
  );
};
