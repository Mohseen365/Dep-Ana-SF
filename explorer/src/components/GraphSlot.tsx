import React from 'react';
import { GraphView, GraphViewRef } from './GraphView';
import type { ArchitectureFinding } from '../lib/intelligence';
import type { ExplorerNode, ExplorerEdge, ArchitectureLayoutMode } from '../types/explorer';

export function GraphSlot(props: {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (node: ExplorerNode | null) => void;
  onSelectEdge: (edgeId: string) => void;
  impactResult?: any;
  selectedCycleNodeIds?: string[] | null;
  findings?: ArchitectureFinding[];
  selectedFinding?: ArchitectureFinding | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  graphRef?: React.RefObject<GraphViewRef>;
  focusedNodeId?: string | null;
  focusState?: any;
  onFocusChange?: (focusState: any) => void;
  nodePositions?: Record<string, { x: number; y: number }>;
  onNodePositionsChange?: (positions: Record<string, { x: number; y: number }>, provenance?: string) => void;
  layoutMode?: 'static' | 'interactive';
  onLayoutModeChange?: (mode: 'static' | 'interactive') => void;
  architectureMode?: ArchitectureLayoutMode;
  onArchitectureModeChange?: (mode: ArchitectureLayoutMode) => void;
  simulatedNodeIds?: string[];
  simulatedRemovedNodeIds?: string[];
  simulatedEdgeIds?: string[];
}) {
  return (
    <div className="graph-container" data-slot="graph" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <GraphView
        ref={props.graphRef}
        nodes={props.nodes}
        edges={props.edges}
        selectedNodeId={props.selectedNodeId}
        selectedEdgeId={props.selectedEdgeId}
        onSelectNode={props.onSelectNode}
        onSelectEdge={props.onSelectEdge}
        impactResult={props.impactResult}
        selectedCycleNodeIds={props.selectedCycleNodeIds}
        findings={props.findings}
        selectedFinding={props.selectedFinding}
        isFullscreen={props.isFullscreen}
        onToggleFullscreen={props.onToggleFullscreen}
        focusedNodeId={props.focusedNodeId}
        focusState={props.focusState}
        onFocusChange={props.onFocusChange}
        nodePositions={props.nodePositions}
        onNodePositionsChange={props.onNodePositionsChange}
        layoutMode={props.layoutMode}
        onLayoutModeChange={props.onLayoutModeChange}
        architectureMode={props.architectureMode}
        onArchitectureModeChange={props.onArchitectureModeChange}
        simulatedNodeIds={props.simulatedNodeIds}
        simulatedRemovedNodeIds={props.simulatedRemovedNodeIds}
        simulatedEdgeIds={props.simulatedEdgeIds}
      />
    </div>
  );
}
