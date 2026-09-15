import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewState } from '../hooks/useViewState';
import { useCompareState } from '../hooks/useCompareState';
import { loadProjectState, saveProjectState, createDefaultProjectUIState } from '../lib/projectState';
import { createDefaultProjectHistory } from '../lib/projectHistory';
import { addAnnotation, getAnnotationsForNode } from '../lib/annotations';

describe('FINAL AUDIT: Project Isolation & Compare Semantics', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Project-Scoped State & Persistence Isolation', () => {
    it('maintains strict isolation between Project A and Project B UI states', () => {
      const stateA = createDefaultProjectUIState('proj-a');
      stateA.selectedComponent.selectedNodeId = 'ApexClass:ServiceA';
      stateA.filters.searchQuery = 'Account';
      stateA.zoom.zoom = 1.5;
      saveProjectState('proj-a', stateA);

      const stateB = createDefaultProjectUIState('proj-b');
      stateB.selectedComponent.selectedNodeId = 'ApexClass:ServiceB';
      stateB.filters.searchQuery = 'Order';
      stateB.zoom.zoom = 0.8;
      saveProjectState('proj-b', stateB);

      const loadedA = loadProjectState('proj-a');
      const loadedB = loadProjectState('proj-b');

      expect(loadedA.selectedComponent.selectedNodeId).toBe('ApexClass:ServiceA');
      expect(loadedA.filters.searchQuery).toBe('Account');
      expect(loadedA.zoom.zoom).toBe(1.5);

      expect(loadedB.selectedComponent.selectedNodeId).toBe('ApexClass:ServiceB');
      expect(loadedB.filters.searchQuery).toBe('Order');
      expect(loadedB.zoom.zoom).toBe(0.8);
    });

    it('isolates analysis history timelines by project ID', () => {
      const historyA = createDefaultProjectHistory('proj-a');
      const historyB = createDefaultProjectHistory('proj-b');

      expect(historyA.projectId).toBe('proj-a');
      expect(historyA.snapshots[0].id).toContain('proj-a');

      expect(historyB.projectId).toBe('proj-b');
      expect(historyB.snapshots[0].id).toContain('proj-b');
    });

    it('isolates component annotations by project ID', () => {
      addAnnotation('ApexClass:SharedService', 'Dev A', 'Project A Note', { projectId: 'proj-a' });
      addAnnotation('ApexClass:SharedService', 'Dev B', 'Project B Note', { projectId: 'proj-b' });

      const notesA = getAnnotationsForNode('ApexClass:SharedService', 'proj-a');
      const notesB = getAnnotationsForNode('ApexClass:SharedService', 'proj-b');

      expect(notesA.length).toBe(1);
      expect(notesA[0].text).toBe('Project A Note');

      expect(notesB.length).toBe(1);
      expect(notesB[0].text).toBe('Project B Note');
    });
  });

  describe('Project Switching & View Reset Behavior', () => {
    it('resets view state when explorer:project-changed custom event fires', () => {
      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.setSelectedNodeId('ApexClass:ComponentA');
        result.current.setSelectedFindingId('finding-123');
        result.current.setIsInvestigating(true);
        result.current.setFocusState({
          enabled: true,
          focusNodeId: 'ApexClass:ComponentA',
          depth: 2,
          direction: 'both',
        });
      });

      expect(result.current.selectedNodeId).toBe('ApexClass:ComponentA');
      expect(result.current.selectedFindingId).toBe('finding-123');
      expect(result.current.isInvestigating).toBe(true);

      act(() => {
        window.dispatchEvent(
          new CustomEvent('explorer:project-changed', { detail: { projectId: 'proj-b' } })
        );
      });

      expect(result.current.selectedNodeId).toBeNull();
      expect(result.current.selectedFindingId).toBeNull();
      expect(result.current.isInvestigating).toBe(false);
      expect(result.current.focusState.enabled).toBe(false);
    });

    it('exits compare mode automatically when project is switched', () => {
      const { result } = renderHook(() => useCompareState());

      const sampleBefore = JSON.stringify({
        schemaVersion: 5,
        components: [{ id: 'ApexClass:ServiceA', name: 'ServiceA', type: 'ApexClass' }],
        relationships: [],
      });

      const sampleAfter = JSON.stringify({
        schemaVersion: 5,
        components: [
          { id: 'ApexClass:ServiceA', name: 'ServiceA', type: 'ApexClass' },
          { id: 'ApexClass:ServiceB', name: 'ServiceB', type: 'ApexClass' },
        ],
        relationships: [],
      });

      act(() => {
        result.current.setBeforeRaw(sampleBefore);
        result.current.setAfterRaw(sampleAfter);
      });

      act(() => {
        result.current.runCompare();
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.diffResult).not.toBeNull();

      act(() => {
        window.dispatchEvent(
          new CustomEvent('explorer:project-changed', { detail: { projectId: 'proj-b' } })
        );
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.diffResult).toBeNull();
      expect(result.current.beforeRaw).toBe('');
      expect(result.current.afterRaw).toBe('');
    });
  });

  describe('Compare Semantics', () => {
    it('correctly computes diff between two valid JSON snapshots', () => {
      const { result } = renderHook(() => useCompareState());

      const beforeJson = JSON.stringify({
        schemaVersion: 5,
        components: [{ id: 'ApexClass:Core', name: 'Core', type: 'ApexClass', risk: 'LOW' }],
        relationships: [],
      });

      const afterJson = JSON.stringify({
        schemaVersion: 5,
        components: [
          { id: 'ApexClass:Core', name: 'Core', type: 'ApexClass', risk: 'HIGH' },
          { id: 'ApexClass:Helper', name: 'Helper', type: 'ApexClass', risk: 'LOW' },
        ],
        relationships: [
          { from: 'ApexClass:Core', to: 'ApexClass:Helper', type: 'method-call' },
        ],
      });

      act(() => {
        result.current.setBeforeRaw(beforeJson);
        result.current.setAfterRaw(afterJson);
      });

      let success = false;
      act(() => {
        success = result.current.runCompare();
      });

      expect(success).toBe(true);
      expect(result.current.isActive).toBe(true);
      expect(result.current.diffResult?.summary.addedNodesCount).toBe(1);
      expect(result.current.diffResult?.summary.changedNodesCount).toBe(1);
      expect(result.current.diffResult?.summary.addedEdgesCount).toBe(1);
    });

    it('gracefully handles malformed JSON input during snapshot compare', () => {
      const { result } = renderHook(() => useCompareState());

      act(() => {
        result.current.setBeforeRaw('{ invalid json');
        result.current.setAfterRaw('{}');
      });

      let success = true;
      act(() => {
        success = result.current.runCompare();
      });

      expect(success).toBe(false);
      expect(result.current.isActive).toBe(false);
      expect(result.current.error).toContain('Malformed');
    });
  });
});
