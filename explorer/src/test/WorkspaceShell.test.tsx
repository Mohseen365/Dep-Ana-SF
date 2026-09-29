import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { WorkspaceRouterProvider } from '../context/WorkspaceRouterContext';
import { InvestigationProvider } from '../context/InvestigationContext';
import { SelectionProvider } from '../context/SelectionContext';
import { WorkspaceShell } from '../components/workspace/WorkspaceShell';

describe('WorkspaceShell Component', () => {
  it('renders active workspace surface based on registry resolution', () => {
    const mockSelection = {
      selectedNodeId: null,
      selectedEdgeId: null,
      selectNode: () => {},
      selectEdge: () => {},
      clear: () => {},
    };

    const mockView = {
      filterState: { searchQuery: '', visibleNodeTypes: [] },
      focusState: { enabled: false },
      setFilterState: () => {},
      setFocusState: () => {},
      isInvestigating: false,
      setIsInvestigating: () => {},
    };

    const mockPalette = {
      isOpen: false,
      open: () => {},
      close: () => {},
      query: '',
      setQuery: () => {},
    };

    const mockCompareState = {
      focusedEntityId: null,
      setBeforeRaw: () => {},
      setAfterRaw: () => {},
      runCompare: () => {},
    };

    const NotAnalyzedScreen = () => <div data-testid="not-analyzed">Not Analyzed</div>;

    render(
      <InvestigationProvider>
        <WorkspaceRouterProvider initialViewMode="dashboard">
          <SelectionProvider value={mockSelection as any}>
            <WorkspaceShell
              activeProjectId="default"
              activeProject={{ id: 'default', name: 'Default Project' }}
              activeData={null}
              visibleActiveData={null}
              simulatedGraph={{ nodes: [], edges: [] }}
              displayNodes={[]}
              selection={mockSelection}
              view={mockView}
              compareState={mockCompareState}
              palette={mockPalette}
              projectStateContext={null}
              findings={[]}
              selectedFinding={null}
              highlightedCycleNodeIds={null}
              effectiveFocusState={{ enabled: false }}
              effectivePositions={{}}
              layoutMode="interactive"
              architectureMode="hierarchical"
              simulatedAddedNodeIds={[]}
              simulatedRemovedNodeIds={[]}
              simulatedEdgeIds={[]}
              graphRef={React.createRef()}
              isSidebarCollapsed={false}
              setIsSidebarCollapsed={() => {}}
              isPinned={false}
              handleTogglePin={() => {}}
              isDetached={false}
              handleDetach={() => {}}
              selectedNode={null}
              drillPath={[]}
              handleDrill={() => {}}
              handleNavigateBreadcrumb={() => {}}
              recentNodeIds={[]}
              handleSelectRecentNode={() => {}}
              handleRequestHandoff={() => {}}
              handleStartSimulationForNode={() => {}}
              constellationOptions={{}}
              setConstellationOptions={() => {}}
              activeSimulationProposal={null}
              simulationStepIndex={0}
              stepImpact={null}
              setSimulationStepIndex={() => {}}
              setActiveSimulationProposal={() => {}}
              handleCommitSimulation={() => {}}
              handleResetView={() => {}}
              handleSelectFinding={() => {}}
              handleClearFinding={() => {}}
              diagnosticsTab="none"
              selectedCycleId={null}
              setSelectedCycleId={() => {}}
              setDiagnosticsTab={() => {}}
              isNotAnalyzed={false}
              handoffTarget={null}
              setHandoffTarget={() => {}}
              openHandoff={() => {}}
              NotAnalyzedScreen={NotAnalyzedScreen}
            />
          </SelectionProvider>
        </WorkspaceRouterProvider>
      </InvestigationProvider>
    );

    expect(screen.getByTestId('view-mode-switcher')).toBeDefined();
  });
});
