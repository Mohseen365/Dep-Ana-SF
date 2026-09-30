import React from 'react';
import { Header } from '../Header';
import { Sidebar } from '../Sidebar';
import { WorkspaceHeader } from './WorkspaceHeader';
import { InvestigationDrawer } from '../InvestigationDrawer';
import { StatusBar } from '../StatusBar';
import { CommandPalette } from '../CommandPalette';
import { RefactorHandoffModal } from '../RefactorHandoffModal';
import { ActiveWorkspaceRenderer } from './ActiveWorkspaceRenderer';
import { useWorkspaceRouter } from '../../context/WorkspaceRouterContext';
import { WorkspaceViewMode } from '../../lib/projectState';
import type { ArchitectureFinding } from '../../lib/intelligence';
import type { RefactoringProposal } from '../../lib/refactoring-simulation';
import type { GraphViewRef } from '../GraphView';
import type { ExplorerNode, ExplorerEdge, ExplorerDataSchema, ArchitectureLayoutMode } from '../../types/explorer';

export interface WorkspaceShellProps {
  activeProjectId: string;
  activeProject: any;
  activeData: ExplorerDataSchema | null;
  visibleActiveData: ExplorerDataSchema | null;
  simulatedGraph: { nodes: ExplorerNode[]; edges: ExplorerEdge[] };
  displayNodes: ExplorerNode[];
  selection: any;
  view: any;
  compareState: any;
  palette: any;
  projectStateContext: any;
  findings: ArchitectureFinding[];
  selectedFinding: ArchitectureFinding | null;
  highlightedCycleNodeIds: string[] | null;
  effectiveFocusState: any;
  effectivePositions: Record<string, { x: number; y: number }>;
  layoutMode: 'interactive' | 'static';
  architectureMode: ArchitectureLayoutMode;
  simulatedAddedNodeIds: string[];
  simulatedRemovedNodeIds: string[];
  simulatedEdgeIds: string[];
  graphRef: React.RefObject<GraphViewRef>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isPinned: boolean;
  handleTogglePin: () => void;
  isDetached: boolean;
  handleDetach: () => void;
  selectedNode: ExplorerNode | null;
  drillPath: string[];
  handleDrill: (targetId: string) => void;
  handleNavigateBreadcrumb: (targetId: string) => void;
  recentNodeIds: string[];
  handleSelectRecentNode: (targetId: string) => void;
  handleRequestHandoff: (nodeId: string) => void;
  handleStartSimulationForNode: (nodeId: string) => void;
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
  handleResetView: () => void;
  handleSelectFinding: (finding: ArchitectureFinding) => void;
  handleClearFinding: () => void;
  diagnosticsTab: 'cycles' | 'unresolved' | 'none';
  selectedCycleId: string | null;
  setSelectedCycleId: (id: string | null) => void;
  setDiagnosticsTab: (tab: 'cycles' | 'unresolved' | 'none') => void;
  isNotAnalyzed: boolean;
  handoffTarget: any;
  setHandoffTarget: (target: any) => void;
  openHandoff: (target: any) => void;
  NotAnalyzedScreen: React.ComponentType<{ project?: any }>;
}

/**
 * WorkspaceShell - The canonical composition shell for the architecture explorer.
 * Owns layout composition, navigation headers, sidebars, active surface rendering, drawer, and status regions.
 */
export const WorkspaceShell: React.FC<WorkspaceShellProps> = (props) => {
  const { activeViewMode, navigateToView } = useWorkspaceRouter();

  const {
    activeProjectId,
    activeProject,
    activeData,
    visibleActiveData,
    simulatedGraph,
    displayNodes,
    selection,
    view,
    compareState,
    palette,
    projectStateContext,
    findings,
    selectedFinding,
    highlightedCycleNodeIds,
    effectiveFocusState,
    effectivePositions,
    layoutMode,
    architectureMode,
    simulatedAddedNodeIds,
    simulatedRemovedNodeIds,
    simulatedEdgeIds,
    graphRef,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isPinned,
    handleTogglePin,
    isDetached,
    handleDetach,
    selectedNode,
    drillPath,
    handleDrill,
    handleNavigateBreadcrumb,
    recentNodeIds,
    handleSelectRecentNode,
    handleRequestHandoff,
    handleStartSimulationForNode,
    constellationOptions,
    setConstellationOptions,
    activeSimulationProposal,
    simulationStepIndex,
    stepImpact,
    setSimulationStepIndex,
    setActiveSimulationProposal,
    handleCommitSimulation,
    handleResetView,
    handleSelectFinding,
    handleClearFinding,
    diagnosticsTab,
    selectedCycleId,
    setSelectedCycleId,
    setDiagnosticsTab,
    isNotAnalyzed,
    handoffTarget,
    setHandoffTarget,
    openHandoff,
    NotAnalyzedScreen,
  } = props;

  const hasDrawerContent = selectedNode !== null;
  const isDrawerOpen = hasDrawerContent && (view.isInvestigating || isPinned);

  // Keyboard Escape listener to dismiss drawer when active
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen && view.setIsInvestigating) {
          view.setIsInvestigating(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, view]);

  return (
    <div
      className="app-layout"
      data-sidebar={isSidebarCollapsed ? 'closed' : 'open'}
      data-drawer={isDrawerOpen ? 'open' : 'closed'}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}
    >
      {/* Visually hidden live region for workspace and selection announcements */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        data-testid="workspace-a11y-announcer"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {`Active workspace: ${activeViewMode}${selectedNode ? `. Selected: ${selectedNode.displayName}` : ''}`}
      </div>
      {/* Top Header */}
      <Header
        onResetView={handleResetView}
        onToggleCompare={() => navigateToView(activeViewMode === 'compare' ? 'graph' : 'compare')}
        isCompareOpen={activeViewMode === 'compare'}
        onOpenCommandPalette={() => palette.open()}
        onOpenPanel={(panelId) => navigateToView(panelId as WorkspaceViewMode)}
      />

      {/* Main Body Container */}
      <div
        className="app-body-container"
        data-sidebar={isSidebarCollapsed ? 'closed' : 'open'}
        data-drawer={isDrawerOpen ? 'open' : 'closed'}
        style={{ display: 'flex', flex: 1, width: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' }}
      >
        {/* Collapsible Left Sidebar Slot */}
        {!isSidebarCollapsed && (
          <div
            className="sidebar-slot"
            style={{ width: '280px', minWidth: '280px', height: '100%', borderRight: '1px solid var(--border-default, #334155)', flexShrink: 0 }}
          >
            <Sidebar
              nodes={activeData?.nodes ?? []}
              displayNodes={displayNodes}
              filterState={view.filterState}
              selectedNodeId={selection.selectedNodeId}
              collapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(true)}
              onFilterChange={view.setFilterState}
              onSelectNode={(node) => {
                selection.selectNode(node.id);
                view.setIsInvestigating(true);
              }}
            />
          </div>
        )}

        {/* Center Workspace */}
        <div className="workspace-center-pane" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minWidth: 0, overflow: 'hidden', position: 'relative' }}>
          {/* Workspace Header with Domain Navigation and Lens Switcher */}
          <div className="app-workspace-bar" style={{ background: 'var(--surface-panel, #111827)', borderBottom: '1px solid var(--border-default, #334155)', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, minHeight: 0 }}>
            <WorkspaceHeader
              findingsCount={findings.length}
              isSidebarCollapsed={isSidebarCollapsed}
              onExpandSidebar={() => setIsSidebarCollapsed(false)}
            />
          </div>

          {/* Active View Surface Container */}
          <main className="graph-pane" style={{ flex: 1, position: 'relative', overflow: 'hidden', height: '100%', width: '100%' }}>
            <ActiveWorkspaceRenderer
              activeViewMode={activeViewMode}
              isNotAnalyzed={isNotAnalyzed}
              activeProject={activeProject}
              activeData={activeData}
              visibleActiveData={visibleActiveData}
              simulatedGraph={simulatedGraph}
              selection={selection}
              view={view}
              findings={findings}
              selectedFinding={selectedFinding}
              highlightedCycleNodeIds={highlightedCycleNodeIds}
              effectiveFocusState={effectiveFocusState}
              effectivePositions={effectivePositions}
              layoutMode={layoutMode}
              architectureMode={architectureMode}
              projectStateContext={projectStateContext}
              simulatedAddedNodeIds={simulatedAddedNodeIds}
              simulatedRemovedNodeIds={simulatedRemovedNodeIds}
              simulatedEdgeIds={simulatedEdgeIds}
              graphRef={graphRef}
              isDrawerOpen={isDrawerOpen}
              drillPath={drillPath}
              constellationOptions={constellationOptions}
              setConstellationOptions={setConstellationOptions}
              activeSimulationProposal={activeSimulationProposal}
              simulationStepIndex={simulationStepIndex}
              stepImpact={stepImpact}
              setSimulationStepIndex={setSimulationStepIndex}
              setActiveSimulationProposal={setActiveSimulationProposal}
              handleCommitSimulation={handleCommitSimulation}
              handleSelectFinding={handleSelectFinding}
              handleClearFinding={handleClearFinding}
              diagnosticsTab={diagnosticsTab}
              selectedCycleId={selectedCycleId}
              setSelectedCycleId={setSelectedCycleId}
              setDiagnosticsTab={setDiagnosticsTab}
              compareState={compareState}
              activeProjectId={activeProjectId}
              navigateToView={navigateToView}
              NotAnalyzedScreen={NotAnalyzedScreen}
            />
          </main>
        </div>

        {/* Collapsible Right Inspector Drawer Slot */}
        {isDrawerOpen && (
          <div
            className="drawer-slot"
            style={{ width: '380px', minWidth: '380px', height: '100%', borderLeft: '1px solid var(--border-default, #334155)', flexShrink: 0 }}
          >
            <InvestigationDrawer
              node={selectedNode}
              open={isDrawerOpen}
              onClose={() => {
                view.setIsInvestigating(false);
                if (isPinned) handleTogglePin();
              }}
              onDrill={handleDrill}
              data={activeData}
              findings={findings}
              drillPath={drillPath}
              onNavigateBreadcrumb={handleNavigateBreadcrumb}
              recentNodeIds={recentNodeIds}
              onSelectRecentNode={handleSelectRecentNode}
              onRequestHandoff={handleRequestHandoff}
              onSimulateRefactoring={handleStartSimulationForNode}
              isPinned={isPinned}
              onTogglePin={handleTogglePin}
              isDetached={isDetached}
              onDetach={handleDetach}
            />
          </div>
        )}
      </div>

      {/* Bottom Status Indicator Bar */}
      <StatusBar
        totalNodes={activeData?.summary?.nodeCount ?? activeData?.nodes?.length ?? 0}
        totalEdges={activeData?.summary?.edgeCount ?? activeData?.edges?.length ?? 0}
        visibleNodes={simulatedGraph.nodes.length}
        selectedNodeName={selectedNode?.displayName ?? null}
        activeFilterCount={view.filterState.searchQuery ? 1 : 0}
        cycleCount={activeData?.summary?.cycleCount ?? activeData?.cycles?.length ?? 0}
        unresolvedCount={activeData?.summary?.unresolvedCount ?? activeData?.unresolvedReferences?.length ?? 0}
      />

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={palette.isOpen}
        onClose={palette.close}
        nodes={activeData?.nodes ?? []}
        query={palette.query}
        onQueryChange={palette.setQuery}
        data={activeData}
        selectedNodeId={selection.selectedNodeId}
        isInvestigating={view.isInvestigating}
        findings={findings}
        selectedFindingId={selectedFinding?.id ?? null}
        onSelectFinding={(f) => {
          handleSelectFinding(f);
          palette.close();
        }}
        onClearFinding={handleClearFinding}
        compareState={compareState}
        activeRiskFilter={view.filterState.riskFilter}
        onRiskFilterChange={(risk) => view.setFilterState({ ...view.filterState, riskFilter: risk })}
        onSelectNode={(nodeId) => {
          selection.selectNode(nodeId);
          view.setIsInvestigating(true);
          palette.close();
        }}
        onApplyFocus={() => {
          if (selection.selectedNodeId) {
            view.setFocusState({
              enabled: true,
              focusNodeId: selection.selectedNodeId,
              depth: 1,
              direction: 'both',
            });
          }
          palette.close();
        }}
        onShowImpact={() => {
          if (selection.selectedNodeId) {
            view.setImpactState({ enabled: true, originNodeId: selection.selectedNodeId, depth: 'ALL' });
          }
          palette.close();
        }}
        onToggleViewMode={() => {
          navigateToView(activeViewMode === 'graph' ? 'findings' : 'graph');
          palette.close();
        }}
        onRequestHandoff={handleRequestHandoff}
      />

      <RefactorHandoffModal
        target={handoffTarget}
        onConfirm={() => {
          if (handoffTarget) openHandoff(handoffTarget);
          setHandoffTarget(null);
        }}
        onSimulate={(target) => {
          handleStartSimulationForNode(target.nodeId);
        }}
        onCancel={() => setHandoffTarget(null)}
      />
    </div>
  );
};
