import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ProjectStateProvider, useProjectState } from './ProjectStateContext';
import { loadProjectState } from '../lib/projectState';

const TestComponent: React.FC = () => {
  const {
    activeProjectId,
    projectState,
    updateZoom,
    updateSidebarState,
    updateFilters,
    updateAnalysisView,
    switchProjectState,
  } = useProjectState();

  return (
    <div>
      <div data-testid="active-project">{activeProjectId}</div>
      <div data-testid="zoom-level">{projectState.zoom.zoom}</div>
      <div data-testid="sidebar-collapsed">{String(projectState.sidebarState.collapsed)}</div>
      <div data-testid="search-query">{projectState.filters.searchQuery}</div>
      <div data-testid="view-mode">{projectState.analysisView.viewMode}</div>

      <button
        data-testid="set-proj-a-state"
        onClick={() => {
          updateSidebarState({ collapsed: true });
          updateZoom({ zoom: 0.8 });
          updateFilters({ searchQuery: 'Account' });
          updateAnalysisView({ viewMode: 'findings' });
        }}
      >
        Set Proj A State
      </button>

      <button
        data-testid="set-proj-b-state"
        onClick={() => {
          updateSidebarState({ collapsed: false });
          updateZoom({ zoom: 1.2 });
          updateFilters({ searchQuery: 'Invoice' });
          updateAnalysisView({ viewMode: 'hotspots' });
        }}
      >
        Set Proj B State
      </button>

      <button data-testid="switch-to-b" onClick={() => switchProjectState('proj-b')}>
        Switch to Proj B
      </button>

      <button data-testid="switch-to-a" onClick={() => switchProjectState('proj-a')}>
        Switch to Proj A
      </button>
    </div>
  );
};

describe('ProjectStateContext & useProjectState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('provides project state and allows updating slice values', () => {
    render(
      <ProjectStateProvider projectId="proj-a">
        <TestComponent />
      </ProjectStateProvider>
    );

    expect(screen.getByTestId('active-project')).toHaveTextContent('proj-a');
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('1');
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');

    act(() => {
      fireEvent.click(screen.getByTestId('set-proj-a-state'));
    });

    expect(screen.getByTestId('zoom-level')).toHaveTextContent('0.8');
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
    expect(screen.getByTestId('search-query')).toHaveTextContent('Account');
    expect(screen.getByTestId('view-mode')).toHaveTextContent('findings');
  });

  it('STRICT ISOLATION IN REACT RENDER TREE: Project A state does not pollute Project B state when switching projects', () => {
    render(
      <ProjectStateProvider projectId="proj-a">
        <TestComponent />
      </ProjectStateProvider>
    );

    // 1. Set Project A state: sidebar collapsed, zoom 80%
    act(() => {
      fireEvent.click(screen.getByTestId('set-proj-a-state'));
    });

    expect(screen.getByTestId('active-project')).toHaveTextContent('proj-a');
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('0.8');

    // 2. Switch to Project B
    act(() => {
      fireEvent.click(screen.getByTestId('switch-to-b'));
    });

    expect(screen.getByTestId('active-project')).toHaveTextContent('proj-b');
    // Default initial state for Project B
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('1');

    // 3. Set Project B state: sidebar expanded, zoom 120%
    act(() => {
      fireEvent.click(screen.getByTestId('set-proj-b-state'));
    });

    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('false');
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('1.2');
    expect(screen.getByTestId('search-query')).toHaveTextContent('Invoice');

    // 4. Switch back to Project A
    act(() => {
      fireEvent.click(screen.getByTestId('switch-to-a'));
    });

    expect(screen.getByTestId('active-project')).toHaveTextContent('proj-a');
    // Restored state for Project A must remain sidebar collapsed & zoom 80%
    expect(screen.getByTestId('sidebar-collapsed')).toHaveTextContent('true');
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('0.8');
    expect(screen.getByTestId('search-query')).toHaveTextContent('Account');
    expect(screen.getByTestId('view-mode')).toHaveTextContent('findings');
  });

  it('responds to global window "explorer:project-changed" events', () => {
    render(
      <ProjectStateProvider projectId="proj-a">
        <TestComponent />
      </ProjectStateProvider>
    );

    // Set Project A zoom to 0.5
    act(() => {
      fireEvent.click(screen.getByTestId('set-proj-a-state'));
    });

    // Dispatch global event switching to proj-c
    act(() => {
      window.dispatchEvent(
        new CustomEvent('explorer:project-changed', {
          detail: { projectId: 'proj-c' },
        })
      );
    });

    expect(screen.getByTestId('active-project')).toHaveTextContent('proj-c');
    expect(screen.getByTestId('zoom-level')).toHaveTextContent('1');

    // Verify localStorage has persisted proj-a state correctly
    const savedA = loadProjectState('proj-a');
    expect(savedA.zoom.zoom).toBe(0.8);
    expect(savedA.sidebarState.collapsed).toBe(true);
  });

  it('throws error when useProjectState is used outside of ProjectStateProvider', () => {
    const ComponentOutside = () => {
      useProjectState();
      return null;
    };

    expect(() => render(<ComponentOutside />)).toThrow(
      'useProjectState must be used within a ProjectStateProvider'
    );
  });
});
