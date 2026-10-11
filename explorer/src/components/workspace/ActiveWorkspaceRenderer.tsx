import React from 'react';
import { WorkspaceViewMode } from '../../lib/projectState';
import { getWorkspaceDefinition } from '../../registry/workspace-registry';
import { adaptSubwayMap } from '../../lib/adapters/subway-adapter';
import { adaptConstellation } from '../../lib/adapters/constellation-adapter';
import { adaptFourDirectionView } from '../../lib/adapters/four-direction-adapter';
import { GraphSlot } from '../GraphSlot';
import { RefactoringSimulationPanel } from '../RefactoringSimulationPanel';
import type { ArchitectureFinding } from '../../lib/intelligence';
import type { RefactoringProposal } from '../../lib/refactoring-simulation';
import type { GraphViewRef } from '../GraphView';
import type { ExplorerNode, ExplorerEdge, ExplorerDataSchema, ArchitectureLayoutMode } from '../../types/explorer';

export interface ActiveWorkspaceRendererProps {
  activeViewMode: WorkspaceViewMode;
  isNotAnalyzed: boolean;
  activeProject: any;
  activeData: ExplorerDataSchema | null;
  visibleActiveData: ExplorerDataSchema | null;
  simulatedGraph: { nodes: ExplorerNode[]; edges: ExplorerEdge[] };
  selection: any;
  view: any;
  findings: ArchitectureFinding[];
  selectedFinding: ArchitectureFinding | null;
  highlightedCycleNodeIds: string[] | null;
  effectiveFocusState: any;
  effectivePositions: Record<string, { x: number; y: number }>;
  layoutMode: 'interactive' | 'static';
  architectureMode: ArchitectureLayoutMode;
  projectStateContext: any;
  simulatedAddedNodeIds: string[];
  simulatedRemovedNodeIds: string[];
  simulatedEdgeIds: string[];
  graphRef: React.RefObject<GraphViewRef>;
  isDrawerOpen: boolean;
  drillPath: string[];
  constellationOptions: {
    focalNodeId?: string;
    maxDepth?: number;
    direction?: 'both' | 'dependencies' | 'dependents';
  };
  setConstellationOptions: React.Dispatch<
    React.SetStateAction<{
      focalNodeId?: string;
      maxDepth?: number;
      direction?: 'both' | 'dependencies' | 'dependents';
    }>
  >;
  activeSimulationProposal: RefactoringProposal | null;
  simulationStepIndex: number;
  stepImpact: any;
  setSimulationStepIndex: (idx: number) => void;
  setActiveSimulationProposal: (prop: RefactoringProposal | null) => void;
  handleCommitSimulation: () => void;
  handleSelectFinding: (finding: ArchitectureFinding) => void;
  handleClearFinding: () => void;
  diagnosticsTab: 'cycles' | 'unresolved' | 'none';
  selectedCycleId: string | null;
  setSelectedCycleId: (id: string | null) => void;
  setDiagnosticsTab: (tab: 'cycles' | 'unresolved' | 'none') => void;
  compareState: any;
  activeProjectId: string;
  navigateToView: (viewMode: WorkspaceViewMode) => void;
  NotAnalyzedScreen: React.ComponentType<{ project?: any }>;
}

/**
 * Registry-driven Active Workspace Surface Resolver.
 * Replaces scattered view-mode conditionals with canonical registry lookup.
 */
export const ActiveWorkspaceRenderer: React.FC<ActiveWorkspaceRendererProps> = (props) => {
  const {
    activeViewMode,
    isNotAnalyzed,
    activeProject,
    activeData,
    visibleActiveData,
    simulatedGraph,
    selection,
    view,
    findings,
    selectedFinding,
    highlightedCycleNodeIds,
    effectiveFocusState,
    effectivePositions,
    layoutMode,
    architectureMode,
    projectStateContext,
    simulatedAddedNodeIds,
    simulatedRemovedNodeIds,
    simulatedEdgeIds,
    graphRef,
    isDrawerOpen,
    drillPath,
    constellationOptions,
    setConstellationOptions,
    activeSimulationProposal,
    simulationStepIndex,
    stepImpact,
    setSimulationStepIndex,
    setActiveSimulationProposal,
    handleCommitSimulation,
    handleSelectFinding,
    handleClearFinding,
    diagnosticsTab,
    selectedCycleId,
    setSelectedCycleId,
    setDiagnosticsTab,
    compareState,
    activeProjectId,
    navigateToView,
    NotAnalyzedScreen,
  } = props;

  const def = getWorkspaceDefinition(activeViewMode);
  if (!def) {
    return <NotAnalyzedScreen project={activeProject} />;
  }

  const Component = def.component;

  // Render registry component based on activeViewMode contract
  switch (activeViewMode) {
    case 'graph':
      return isNotAnalyzed || !activeData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <>
          <GraphSlot
            graphRef={graphRef}
            nodes={simulatedGraph.nodes}
            edges={simulatedGraph.edges}
            selectedNodeId={selection.selectedNodeId}
            selectedEdgeId={selection.selectedEdgeId}
            onSelectNode={(node) => {
              selection.selectNode(node ? node.id : null);
              if (node) {
                view.setIsInvestigating(true);
              }
            }}
            onSelectEdge={(edgeId) => selection.selectEdge(edgeId)}
            selectedCycleNodeIds={highlightedCycleNodeIds}
            findings={findings}
            selectedFinding={selectedFinding}
            focusedNodeId={
              isDrawerOpen && drillPath.length > 1
                ? drillPath[drillPath.length - 1]
                : null
            }
            focusState={effectiveFocusState}
            onFocusChange={view.setFocusState}
            nodePositions={effectivePositions}
            onNodePositionsChange={(positions, provenance) =>
              projectStateContext?.updateGraphLayout({
                nodePositions: positions,
                architectureMode,
                ...(provenance ? { layoutProvenance: provenance as any } : {}),
              })
            }
            layoutMode={layoutMode}
            onLayoutModeChange={(mode) =>
              projectStateContext?.updateGraphLayout({ mode })
            }
            architectureMode={architectureMode}
            onArchitectureModeChange={(mode) =>
              projectStateContext?.updateGraphLayout({ architectureMode: mode })
            }
            simulatedNodeIds={simulatedAddedNodeIds}
            simulatedRemovedNodeIds={simulatedRemovedNodeIds}
            simulatedEdgeIds={simulatedEdgeIds}
          />
          {activeSimulationProposal && stepImpact && (
            <RefactoringSimulationPanel
              proposal={activeSimulationProposal}
              currentStepIndex={simulationStepIndex}
              stepImpact={stepImpact}
              onStepChange={setSimulationStepIndex}
              onCancel={() => setActiveSimulationProposal(null)}
              onCommit={handleCommitSimulation}
            />
          )}
        </>
      );

    case 'dashboard':
      return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            project={activeData?.project ?? activeProject}
            data={activeData}
            findings={findings}
            onExploreGraph={() => navigateToView('graph')}
            onViewFindings={() => navigateToView('findings')}
            onViewHistory={() => navigateToView('history')}
          />
        </div>
      );

    case 'matrix':
      return isNotAnalyzed || !visibleActiveData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            data={visibleActiveData}
            selectedNodeId={selection.selectedNodeId}
            onSelectNode={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
              navigateToView('graph');
            }}
            onSelectFeatureAnchor={(anchorNodeId: string) => {
              selection.selectNode(anchorNodeId);
              view.setIsInvestigating(true);
              navigateToView('graph');
            }}
          />
        </div>
      );

    case 'constellation':
      return isNotAnalyzed || !visibleActiveData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            data={adaptConstellation(visibleActiveData, {
              focalNodeId: constellationOptions.focalNodeId || selection.selectedNodeId,
              maxDepth: constellationOptions.maxDepth,
              direction: constellationOptions.direction,
            })}
            selectedNodeId={selection.selectedNodeId}
            onSelectNode={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
            }}
            onOptionChange={(opts: any) => {
              setConstellationOptions((prev) => ({ ...prev, ...opts }));
            }}
            onReturnToGraph={() => {
              navigateToView('graph');
            }}
          />
        </div>
      );

    case 'treemap':
      return isNotAnalyzed || !visibleActiveData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            data={visibleActiveData}
            selectedNodeId={selection.selectedNodeId}
            onSelectComponent={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
            }}
            onExploreInGraph={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
              navigateToView('graph');
            }}
          />
        </div>
      );

    case 'subway':
      return isNotAnalyzed || !visibleActiveData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            data={adaptSubwayMap(visibleActiveData, {
              selectedStationId: selection.selectedNodeId,
            })}
            selectedNodeId={selection.selectedNodeId}
            onSelectNode={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
            }}
            onExploreInGraph={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
              navigateToView('graph');
            }}
          />
        </div>
      );

    case 'four-direction':
      return isNotAnalyzed || !visibleActiveData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            data={adaptFourDirectionView(visibleActiveData, {
              selectedNodeId: selection.selectedNodeId,
            })}
            selectedNodeId={selection.selectedNodeId}
            onSelectNode={(nodeId: string) => {
              selection.selectNode(nodeId);
            }}
            onReturnToGraph={() => {
              navigateToView('graph');
            }}
          />
        </div>
      );

    case 'heatmap':
      return isNotAnalyzed || !visibleActiveData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            data={visibleActiveData}
            selectedNodeId={selection.selectedNodeId}
            onSelectNode={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
              navigateToView('graph');
            }}
            onSelectFeatureAnchor={(anchorNodeId: string) => {
              selection.selectNode(anchorNodeId);
              view.setIsInvestigating(true);
              navigateToView('graph');
            }}
          />
        </div>
      );

    case 'river':
      return isNotAnalyzed || !visibleActiveData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            data={visibleActiveData}
            selectedNodeId={selection.selectedNodeId}
            onSelectNode={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
              navigateToView('graph');
            }}
            onReturnToGraph={() => {
              navigateToView('graph');
            }}
          />
        </div>
      );

    case 'dna':
    case 'profile':
    case 'radar':
    case 'tree':
      return isNotAnalyzed || !visibleActiveData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            data={visibleActiveData}
            selectedNodeId={selection.selectedNodeId}
            onSelectNode={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
              navigateToView('graph');
            }}
          />
        </div>
      );

    case 'findings':
      return isNotAnalyzed || !activeData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            findings={findings}
            selectedFindingId={selectedFinding?.id ?? null}
            onSelectFinding={handleSelectFinding}
            onClearSelection={handleClearFinding}
            onInvestigateNode={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
            }}
            onExploreInGraph={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
              navigateToView('graph');
            }}
          />
        </div>
      );

    case 'hotspots':
      return isNotAnalyzed || !activeData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            nodes={activeData?.nodes ?? []}
            cycles={activeData?.cycles ?? []}
            impactSummaries={activeData?.impactSummaries ?? {}}
            onSelectHotspot={(node: ExplorerNode) => {
              selection.selectNode(node.id);
              view.setIsInvestigating(true);
            }}
            onExploreInGraph={(nodeId: string) => {
              selection.selectNode(nodeId);
              view.setIsInvestigating(true);
              navigateToView('graph');
            }}
            selectedNodeId={selection.selectedNodeId}
          />
        </div>
      );

    case 'diagnostics':
      return isNotAnalyzed || !activeData ? (
        <NotAnalyzedScreen project={activeProject} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            cycles={activeData?.cycles ?? []}
            unresolvedReferences={activeData?.unresolvedReferences ?? []}
            nodes={activeData?.nodes ?? []}
            activeTab={diagnosticsTab}
            selectedCycleId={selectedCycleId}
            selectedUnresolvedEdgeId={selection.selectedEdgeId}
            onSelectCycle={(cycle: any) => {
              setSelectedCycleId(cycle ? cycle.id : null);
              if (cycle && cycle.nodes.length > 0) {
                selection.selectNode(cycle.nodes[0]);
              }
            }}
            onSelectUnresolved={(ref: any) => {
              if (ref) {
                selection.selectEdge(ref.edgeId);
                selection.selectNode(ref.sourceNodeId);
              } else {
                selection.clear();
              }
            }}
            onTabChange={(tab: 'cycles' | 'unresolved' | 'none') => setDiagnosticsTab(tab)}
          />
        </div>
      );

    case 'compare':
      return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            compareState={compareState}
            onClose={() => navigateToView('graph')}
          />
        </div>
      );

    case 'history':
      return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
          <Component
            projectId={activeProjectId}
            projectMeta={activeData?.project ?? activeProject}
            currentData={activeData}
            compareState={compareState}
            onCompareSnapshots={(snapA: any, snapB: any) => {
              if (snapA.rawSchemaJson) compareState.setBeforeRaw(snapA.rawSchemaJson);
              if (snapB.rawSchemaJson) compareState.setAfterRaw(snapB.rawSchemaJson);
              compareState.runCompare();
              navigateToView('compare');
            }}
          />
        </div>
      );

    default:
      return <NotAnalyzedScreen project={activeProject} />;
  }
};
