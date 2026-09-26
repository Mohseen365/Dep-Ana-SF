import React, { useEffect, useState, useMemo } from 'react';
import type cytoscape from 'cytoscape';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { FeatureDiscoveryResult } from '../../lib/layout/features';
import type { FeatureRegion } from '../../lib/layout/global-layout';
import { deriveFeatureCompositionGroups, type FeatureCompositionGroup } from '../../lib/layout/feature-composition';
import { getSharedHighlightData, type SharedHighlightResult } from '../../lib/layout/shared-highlight';
import type { ArchitectureFinding, FindingSeverity } from '../../lib/intelligence';
import { createLayoutGraphIndex } from '../../lib/layout/graph-index';

export interface FeatureOverlayCanvasProps {
  cy: cytoscape.Core | null;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  discoveryResult?: FeatureDiscoveryResult | null;
  featureRegions?: Map<string, FeatureRegion> | null;
  selectedNodeId?: string | null;
  hoveredNodeId?: string | null;
  nodePositions?: Record<string, { x: number; y: number }>;
  findings?: ArchitectureFinding[];
  enableOverlay?: boolean;
}

export const FeatureOverlayCanvas: React.FC<FeatureOverlayCanvasProps> = ({
  cy,
  nodes,
  edges,
  discoveryResult,
  featureRegions,
  selectedNodeId,
  hoveredNodeId,
  nodePositions,
  findings = [],
  enableOverlay = true,
}) => {
  const [transform, setTransform] = useState<{ pan: { x: number; y: number }; zoom: number }>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });

  const [modelPositions, setModelPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Track Cytoscape pan and zoom transform (viewport only)
  useEffect(() => {
    if (!cy) return;

    const updateTransform = () => {
      const pan = typeof cy.pan === 'function' ? cy.pan() : { x: 0, y: 0 };
      const zoom = typeof cy.zoom === 'function' ? cy.zoom() : 1;
      setTransform({ pan, zoom });
    };

    updateTransform();

    if (typeof cy.on === 'function') {
      cy.on('pan zoom', updateTransform);
    }

    return () => {
      if (typeof cy.off === 'function') {
        cy.off('pan zoom', updateTransform);
      }
    };
  }, [cy]);

  // Track Cytoscape model node positions (updated only when node coordinates change)
  useEffect(() => {
    if (!cy) return;

    const capturePositions = () => {
      const posMap: Record<string, { x: number; y: number }> = {};
      cy.nodes().forEach((n) => {
        posMap[n.id()] = n.position();
      });
      setModelPositions(posMap);
    };

    capturePositions();

    if (typeof cy.on === 'function') {
      cy.on('position dragfree layoutstop', capturePositions);
    }

    return () => {
      if (typeof cy.off === 'function') {
        cy.off('position dragfree layoutstop', capturePositions);
      }
    };
  }, [cy]);

  // Capture live node positions from props or captured model positions
  const currentPositions = useMemo(() => {
    if (nodePositions && Object.keys(nodePositions).length > 0) {
      return nodePositions;
    }
    return modelPositions;
  }, [nodePositions, modelPositions]);

  // Convert featureRegions Map to Array safely for rendering
  const featureRegionsList = useMemo(() => {
    if (!enableOverlay || !featureRegions || featureRegions.size === 0) return [];
    return Array.from(featureRegions.values());
  }, [enableOverlay, featureRegions]);

  // Pre-construct single graph index instance for node/edge topology
  const graphIndex = useMemo(() => {
    return createLayoutGraphIndex(nodes, edges);
  }, [nodes, edges]);

  // Derive LWC composition groups for all features
  const compositionGroups = useMemo(() => {
    if (!enableOverlay || !discoveryResult) return [];

    const allGroups: FeatureCompositionGroup[] = [];
    discoveryResult.features.forEach((feature) => {
      const groups = deriveFeatureCompositionGroups(
        feature,
        nodes,
        edges,
        currentPositions,
        { index: graphIndex, nodeWidth: 60, nodeHeight: 60, padding: 20 }
      );
      allGroups.push(...groups);
    });

    return allGroups;
  }, [enableOverlay, discoveryResult, nodes, edges, currentPositions, graphIndex]);

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

  // Group findings by node ID for fast SVG badge rendering
  const nodeFindingsMap = useMemo(() => {
    const map = new Map<string, { count: number; maxSeverity: FindingSeverity }>();
    if (!findings || findings.length === 0) return map;

    const severityRank: Record<FindingSeverity, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1,
    };

    for (const f of findings) {
      if (!f.nodeIds) continue;
      for (const nId of f.nodeIds) {
        const existing = map.get(nId);
        if (!existing) {
          map.set(nId, { count: 1, maxSeverity: f.severity });
        } else {
          existing.count++;
          if (severityRank[f.severity] > severityRank[existing.maxSeverity]) {
            existing.maxSeverity = f.severity;
          }
        }
      }
    }
    return map;
  }, [findings]);

  if (!enableOverlay || !cy) {
    return null;
  }

  const { pan, zoom } = transform;
  const isFarZoom = zoom < 0.6;
  const isCloseZoom = zoom >= 1.2;

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
        {/* Render Outer Semantic Feature Region Enclosure Boxes */}
        {featureRegionsList.map((region) => {
          const { featureId, xMin, yMin, width, height } = region;

          // Convert raw feature ID to human-readable title
          // e.g. "feature_cloud-spend__c"  →  "Cloud Spend"
          //      "feature_user-org-role"   →  "User Org Role"
          const labelText = featureId
            .replace(/^feature_/, '')
            .replace(/-/g, ' ')
            .replace(/__c$/i, '')
            .trim()
            .replace(/\b\w/g, (c) => c.toUpperCase());

          if (isFarZoom) {
            // Far zoom: minimal unlabelled outline only.
            // Preserves spatial orientation without cluttering the overview.
            return (
              <rect
                key={`fr_min_${featureId}`}
                x={xMin}
                y={yMin}
                width={width}
                height={height}
                rx={10}
                fill="rgba(59, 130, 246, 0.025)"
                stroke="rgba(59, 130, 246, 0.2)"
                strokeWidth={1}
              />
            );
          }

          // Mid / near zoom: full labelled box
          const labelWidth = labelText.length * 6.5 + 20;

          return (
            <g
              key={`feature_region_${featureId}`}
              className="semantic-feature-region-overlay"
              data-testid={`feature-region-${featureId}`}
            >
              <rect
                x={xMin}
                y={yMin}
                width={width}
                height={height}
                rx={16}
                fill="rgba(59, 130, 246, 0.04)"
                stroke="rgba(59, 130, 246, 0.35)"
                strokeWidth={2}
              />
              <rect
                x={xMin + 12}
                y={yMin - 13}
                width={labelWidth}
                height={22}
                rx={6}
                fill="rgba(15, 23, 42, 0.92)"
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth={1.2}
              />
              <text
                x={xMin + 22}
                y={yMin + 2}
                fill="#93c5fd"
                fontSize={11}
                fontWeight={700}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {labelText}
              </text>
            </g>
          );
        })}

        {/* Render LWC Composition Group Outline Boxes (Suppressed at Far Zoom) */}
        {!isFarZoom &&
          compositionGroups.map((group) => {
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
                  strokeWidth={isCloseZoom ? 2.0 : 1.5}
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

        {/* Render Compact Finding Summary Badges over Finding-Bearing Nodes (Suppressed at Far Zoom) */}
        {!isFarZoom &&
          nodes.map((node) => {
            const findingData = nodeFindingsMap.get(node.id);
            if (!findingData || findingData.count === 0) return null;

            const pos = currentPositions[node.id];
            if (!pos) return null;

            const { count, maxSeverity } = findingData;
            const countText = count > 9 ? '10+' : `${count}`;
            const badgeWidth = countText === '10+' ? 32 : 26;

            const strokeColor =
              maxSeverity === 'CRITICAL'
                ? '#ef4444'
                : maxSeverity === 'HIGH'
                ? '#f97316'
                : maxSeverity === 'MEDIUM'
                ? '#f59e0b'
                : '#3b82f6';

            return (
              <g
                key={`finding_badge_${node.id}`}
                className="finding-badge-overlay"
                data-testid={`finding-badge-${node.id}`}
                transform={`translate(${pos.x + 14}, ${pos.y - 28})`}
              >
                <rect
                  x={0}
                  y={0}
                  width={badgeWidth}
                  height={16}
                  rx={8}
                  fill="rgba(15, 23, 42, 0.95)"
                  stroke={strokeColor}
                  strokeWidth={1.5}
                />
                <text
                  x={badgeWidth / 2}
                  y={11}
                  fill="#f8fafc"
                  fontSize={9}
                  fontWeight={700}
                  textAnchor="middle"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  ⚠️ {countText}
                </text>
              </g>
            );
          })}
      </g>
    </svg>
  );
};
