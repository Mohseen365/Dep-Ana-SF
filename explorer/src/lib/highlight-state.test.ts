import { describe, it, expect } from 'vitest';
import cytoscape from 'cytoscape';
import {
  applyHighlightState,
  isOwnedVisualClass,
  type HighlightState,
} from './highlight-state';

describe('highlight-state state machine (F9)', () => {
  function createTestGraph() {
    return cytoscape({
      headless: true,
      elements: [
        { data: { id: 'nodeA' } },
        { data: { id: 'nodeB' } },
        { data: { id: 'nodeC' } },
        { data: { id: 'edgeAB', source: 'nodeA', target: 'nodeB' } },
        { data: { id: 'edgeBC', source: 'nodeB', target: 'nodeC' } },
      ],
    });
  }

  it('correctly identifies owned visual classes', () => {
    expect(isOwnedVisualClass('dimmed')).toBe(true);
    expect(isOwnedVisualClass('highlighted')).toBe(true);
    expect(isOwnedVisualClass('cycle-1')).toBe(true);
    expect(isOwnedVisualClass('zoom-far')).toBe(false);
    expect(isOwnedVisualClass('hovered')).toBe(false);
  });

  it('applies "none" state cleanly removing owned classes', () => {
    const cy = createTestGraph();
    cy.getElementById('nodeA').addClass('dimmed highlighted custom-semantic-class');

    applyHighlightState(cy, { kind: 'none' });

    expect(cy.getElementById('nodeA').hasClass('dimmed')).toBe(false);
    expect(cy.getElementById('nodeA').hasClass('highlighted')).toBe(false);
    expect(cy.getElementById('nodeA').hasClass('custom-semantic-class')).toBe(true);
  });

  it('applies selection state highlighting target node and connections', () => {
    const cy = createTestGraph();

    applyHighlightState(cy, { kind: 'selection', nodeId: 'nodeA' });

    expect(cy.getElementById('nodeA').hasClass('highlighted')).toBe(true);
    expect(cy.getElementById('edgeAB').hasClass('highlighted')).toBe(true);
    expect(cy.getElementById('nodeB').hasClass('highlighted')).toBe(true);

    expect(cy.getElementById('nodeC').hasClass('dimmed')).toBe(true);
    expect(cy.getElementById('edgeBC').hasClass('dimmed')).toBe(true);
  });

  it('applies path state highlighting path nodes and edges', () => {
    const cy = createTestGraph();

    applyHighlightState(cy, { kind: 'path', pathNodeIds: ['nodeA', 'nodeB', 'nodeC'] });

    expect(cy.getElementById('nodeA').hasClass('path-highlighted')).toBe(true);
    expect(cy.getElementById('nodeB').hasClass('path-highlighted')).toBe(true);
    expect(cy.getElementById('nodeC').hasClass('path-highlighted')).toBe(true);
    expect(cy.getElementById('edgeAB').hasClass('path-highlighted')).toBe(true);
    expect(cy.getElementById('edgeBC').hasClass('path-highlighted')).toBe(true);
  });

  it('applies impact state distinguishing origin, affected, and muted elements', () => {
    const cy = createTestGraph();

    applyHighlightState(cy, {
      kind: 'impact',
      originNodeId: 'nodeA',
      affectedNodeIds: ['nodeB'],
      affectedEdgeIds: ['edgeAB'],
    });

    expect(cy.getElementById('nodeA').hasClass('impact-origin')).toBe(true);
    expect(cy.getElementById('nodeB').hasClass('impact-affected')).toBe(true);
    expect(cy.getElementById('edgeAB').hasClass('impact-affected')).toBe(true);

    expect(cy.getElementById('nodeC').hasClass('impact-muted')).toBe(true);
    expect(cy.getElementById('nodeC').hasClass('dimmed')).toBe(true);
  });

  it('is idempotent when re-applying identical state', () => {
    const cy = createTestGraph();
    const state: HighlightState = { kind: 'selection', nodeId: 'nodeA' };

    applyHighlightState(cy, state);
    const classesRun1 = cy.elements().map((e) => ({ id: e.id(), classes: e.classes() }));

    applyHighlightState(cy, state);
    const classesRun2 = cy.elements().map((e) => ({ id: e.id(), classes: e.classes() }));

    expect(classesRun1).toEqual(classesRun2);
  });

  it('cleans up previous mode state when switching modes', () => {
    const cy = createTestGraph();

    applyHighlightState(cy, {
      kind: 'impact',
      originNodeId: 'nodeA',
      affectedNodeIds: ['nodeB'],
    });
    expect(cy.getElementById('nodeA').hasClass('impact-origin')).toBe(true);

    applyHighlightState(cy, {
      kind: 'path',
      pathNodeIds: ['nodeB', 'nodeC'],
    });

    expect(cy.getElementById('nodeA').hasClass('impact-origin')).toBe(false);
    expect(cy.getElementById('nodeB').hasClass('path-highlighted')).toBe(true);
    expect(cy.getElementById('nodeC').hasClass('path-highlighted')).toBe(true);
  });
});
