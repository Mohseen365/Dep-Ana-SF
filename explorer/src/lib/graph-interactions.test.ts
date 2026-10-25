import { describe, it, expect, vi } from 'vitest';
import cytoscape from 'cytoscape';
import { highlightCycle, clearCycleHighlight, findShortestPath, highlightPath } from './graph-interactions';

describe('graph-interactions cycle highlighting', () => {
  it('highlights cycle elements and dims others', () => {
    const cy = cytoscape({
      headless: true,
      elements: [
        { data: { id: 'nodeA' } },
        { data: { id: 'nodeB' } },
        { data: { id: 'nodeC' } },
        { data: { id: 'edgeAB', source: 'nodeA', target: 'nodeB' } },
      ],
    });

    highlightCycle(cy, ['nodeA', 'nodeB']);

    expect(cy.getElementById('nodeA').hasClass('highlighted')).toBe(true);
    expect(cy.getElementById('nodeB').hasClass('highlighted')).toBe(true);
    expect(cy.getElementById('edgeAB').hasClass('highlighted')).toBe(true);
    expect(cy.getElementById('nodeC').hasClass('dimmed')).toBe(true);
  });

  it('clears cycle highlight', () => {
    const cy = cytoscape({
      headless: true,
      elements: [
        { data: { id: 'nodeA' } },
      ],
    });

    cy.getElementById('nodeA').addClass('dimmed highlighted');
    clearCycleHighlight(cy);

    expect(cy.getElementById('nodeA').hasClass('dimmed')).toBe(false);
    expect(cy.getElementById('nodeA').hasClass('highlighted')).toBe(false);
  });
});

describe('findShortestPath and highlightPath (F1)', () => {
  function createGraph() {
    return cytoscape({
      headless: true,
      elements: [
        { data: { id: 'A' } },
        { data: { id: 'B' } },
        { data: { id: 'C' } },
        { data: { id: 'D' } },
        { data: { id: 'edgeAB', source: 'A', target: 'B' } },
        { data: { id: 'edgeBC', source: 'B', target: 'C' } },
      ],
    });
  }

  it('finds forward path between A and C', () => {
    const cy = createGraph();
    const path = findShortestPath(cy, 'A', 'C', 'forward');
    expect(path).not.toBeNull();
    expect(path?.map((n) => n.id())).toEqual(['A', 'B', 'C']);
  });

  it('returns null if path does not exist in requested direction', () => {
    const cy = createGraph();
    const path = findShortestPath(cy, 'C', 'A', 'forward');
    expect(path).toBeNull();
  });

  it('finds reverse path between C and A', () => {
    const cy = createGraph();
    const path = findShortestPath(cy, 'C', 'A', 'reverse');
    expect(path).not.toBeNull();
    expect(path?.map((n) => n.id())).toEqual(['C', 'B', 'A']);
  });

  it('returns single node when source equals target', () => {
    const cy = createGraph();
    const path = findShortestPath(cy, 'A', 'A');
    expect(path?.map((n) => n.id())).toEqual(['A']);
  });

  it('returns null for missing source or target', () => {
    const cy = createGraph();
    expect(findShortestPath(cy, 'A', 'NONEXISTENT')).toBeNull();
    expect(findShortestPath(cy, 'NONEXISTENT', 'C')).toBeNull();
  });

  it('highlights path and dims unrelated nodes', () => {
    const cy = createGraph();
    const path = findShortestPath(cy, 'A', 'C')!;
    highlightPath(cy, path);

    expect(cy.getElementById('A').hasClass('path-highlighted')).toBe(true);
    expect(cy.getElementById('B').hasClass('path-highlighted')).toBe(true);
    expect(cy.getElementById('C').hasClass('path-highlighted')).toBe(true);
    expect(cy.getElementById('D').hasClass('dimmed')).toBe(true);
  });
});

describe('graph-interactions zoom and pan runtime helpers', () => {
  it('invokes userZoomingEnabled on cytoscape core', async () => {
    const { setMouseWheelZoom } = await import('./graph-interactions');
    const mockCy: any = {
      userZoomingEnabled: vi.fn(),
    };

    setMouseWheelZoom(mockCy, false);
    expect(mockCy.userZoomingEnabled).toHaveBeenCalledWith(false);

    setMouseWheelZoom(mockCy, true);
    expect(mockCy.userZoomingEnabled).toHaveBeenCalledWith(true);
  });

  it('invokes userPanningEnabled on cytoscape core', async () => {
    const { setPanning } = await import('./graph-interactions');
    const mockCy: any = {
      userPanningEnabled: vi.fn(),
    };

    setPanning(mockCy, false);
    expect(mockCy.userPanningEnabled).toHaveBeenCalledWith(false);

    setPanning(mockCy, true);
    expect(mockCy.userPanningEnabled).toHaveBeenCalledWith(true);
  });
});
