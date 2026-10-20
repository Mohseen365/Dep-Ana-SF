import type cytoscape from 'cytoscape';

export type FocusDirection = 'forward' | 'reverse' | 'both';

export type HighlightState =
  | { kind: 'none' }
  | { kind: 'selection'; nodeId?: string; edgeId?: string }
  | { kind: 'focus'; nodeId: string; depth: number; direction: FocusDirection }
  | { kind: 'path'; pathNodeIds: string[]; pathEdgeIds?: string[] }
  | { kind: 'cycle'; cycleNodeIds: string[] }
  | { kind: 'impact'; originNodeId: string; affectedNodeIds: string[]; affectedEdgeIds?: string[] }
  | { kind: 'finding'; nodeIds: string[]; edgeIds: string[] }
  | { kind: 'simulation'; addedNodeIds: string[]; removedNodeIds: string[]; affectedNodeIds?: string[]; addedEdgeIds?: string[]; removedEdgeIds?: string[] }
  | { kind: 'diff'; addedNodeIds: string[]; removedNodeIds: string[]; modifiedNodeIds: string[]; addedEdgeIds?: string[]; removedEdgeIds?: string[] };

export const OWNED_VISUAL_CLASSES = new Set([
  'dimmed',
  'highlighted',
  'path-highlighted',
  'focus-center',
  'focus-neighbor',
  'focus-dimmed',
  'impact-origin',
  'impact-affected',
  'impact-muted',
  'finding-highlighted',
  'simulated-added',
  'simulated-removed',
  'simulated-affected',
  'diff-added',
  'diff-removed',
  'diff-modified',
]);

export function isOwnedVisualClass(cls: string): boolean {
  if (OWNED_VISUAL_CLASSES.has(cls)) return true;
  if (cls.startsWith('cycle-')) return true;
  return false;
}

/**
 * Computes the exact set of visual classes each element in the Cytoscape graph should have
 * according to the authoritative HighlightState.
 */
export function deriveVisualClasses(
  state: HighlightState,
  cy: cytoscape.Core
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  if (!cy || typeof cy.elements !== 'function') return result;

  const elements = cy.elements();
  if (!elements || typeof (elements as any).forEach !== 'function') return result;
  elements.forEach((ele) => {
    result.set(ele.id(), new Set<string>());
  });

  if (state.kind === 'none') {
    return result;
  }

  if (state.kind === 'selection') {
    const { nodeId, edgeId } = state;
    if (!nodeId && !edgeId) return result;

    const activeNodeIds = new Set<string>();
    const activeEdgeIds = new Set<string>();

    if (nodeId) {
      const node = cy.getElementById(nodeId);
      if (node.length > 0 && node.isNode()) {
        activeNodeIds.add(nodeId);
        const conn = typeof node.connectedEdges === 'function' ? node.connectedEdges() : null;
        if (conn) {
          conn.forEach((e) => {
            activeEdgeIds.add(e.id());
          });
        }
        const neigh = typeof node.neighborhood === 'function' ? node.neighborhood('node') : null;
        if (neigh) {
          neigh.forEach((n) => {
            activeNodeIds.add(n.id());
          });
        }
      }
    }

    if (edgeId) {
      const edge = cy.getElementById(edgeId);
      if (edge.length > 0 && edge.isEdge()) {
        activeEdgeIds.add(edgeId);
        activeNodeIds.add(edge.data('source'));
        activeNodeIds.add(edge.data('target'));
      }
    }

    elements.forEach((ele) => {
      const classes = result.get(ele.id())!;
      const id = ele.id();
      const isActive = ele.isNode() ? activeNodeIds.has(id) : activeEdgeIds.has(id);
      if (isActive) {
        classes.add('highlighted');
      } else {
        classes.add('dimmed');
      }
    });

    return result;
  }

  if (state.kind === 'focus') {
    const { nodeId, depth, direction } = state;
    const centerNode = cy.getElementById(nodeId);
    if (centerNode.length === 0 || !centerNode.isNode()) {
      return result;
    }

    const neighborSet = new Set<string>();
    const edgeSet = new Set<string>();

    const visited = new Set<string>([nodeId]);
    let currentLevel: cytoscape.NodeSingular[] = [centerNode as cytoscape.NodeSingular];

    for (let d = 0; d < depth; d++) {
      const nextLevel: cytoscape.NodeSingular[] = [];
      currentLevel.forEach((n) => {
        let connectedEdges: cytoscape.EdgeCollection;
        if (direction === 'forward') {
          connectedEdges = n.outgoers('edge');
        } else if (direction === 'reverse') {
          connectedEdges = n.incomers('edge');
        } else {
          connectedEdges = n.connectedEdges();
        }

        connectedEdges.forEach((edge) => {
          edgeSet.add(edge.id());
          const otherNodes = edge.connectedNodes().difference(n);
          otherNodes.forEach((other) => {
            const otherId = other.id();
            if (!visited.has(otherId)) {
              visited.add(otherId);
              neighborSet.add(otherId);
              nextLevel.push(other as cytoscape.NodeSingular);
            }
          });
        });
      });
      currentLevel = nextLevel;
    }

    elements.forEach((ele) => {
      const classes = result.get(ele.id())!;
      const id = ele.id();
      if (id === nodeId) {
        classes.add('focus-center');
        classes.add('highlighted');
      } else if (ele.isNode() && neighborSet.has(id)) {
        classes.add('focus-neighbor');
        classes.add('highlighted');
      } else if (ele.isEdge() && edgeSet.has(id)) {
        classes.add('highlighted');
      } else {
        classes.add('dimmed');
      }
    });

    return result;
  }

  if (state.kind === 'path') {
    const { pathNodeIds, pathEdgeIds } = state;
    const nodeSet = new Set(pathNodeIds);
    const edgeSet = new Set(pathEdgeIds ?? []);

    if (!pathEdgeIds || pathEdgeIds.length === 0) {
      for (let i = 0; i < pathNodeIds.length - 1; i++) {
        const u = cy.getElementById(pathNodeIds[i]);
        const v = cy.getElementById(pathNodeIds[i + 1]);
        if (u.length > 0 && v.length > 0) {
          const connectors = u.edgesTo(v);
          connectors.forEach((e) => {
            edgeSet.add(e.id());
          });
        }
      }
    }

    elements.forEach((ele) => {
      const classes = result.get(ele.id())!;
      const id = ele.id();
      const inPath = ele.isNode() ? nodeSet.has(id) : edgeSet.has(id);
      if (inPath) {
        classes.add('path-highlighted');
      } else {
        classes.add('dimmed');
      }
    });

    return result;
  }

  if (state.kind === 'cycle') {
    const { cycleNodeIds } = state;
    const nodeSet = new Set(cycleNodeIds);

    elements.forEach((ele) => {
      const classes = result.get(ele.id())!;
      if (ele.isNode() && nodeSet.has(ele.id())) {
        classes.add('highlighted');
      } else if (ele.isEdge() && nodeSet.has(ele.data('source')) && nodeSet.has(ele.data('target'))) {
        classes.add('highlighted');
      } else {
        classes.add('dimmed');
      }
    });

    return result;
  }

  if (state.kind === 'impact') {
    const { originNodeId, affectedNodeIds, affectedEdgeIds } = state;
    const affectedNodeSet = new Set(affectedNodeIds);
    const affectedEdgeSet = new Set(affectedEdgeIds ?? []);

    if (!affectedEdgeIds || affectedEdgeIds.length === 0) {
      cy.edges().forEach((edge) => {
        const src = edge.data('source');
        const tgt = edge.data('target');
        if ((src === originNodeId || affectedNodeSet.has(src)) && affectedNodeSet.has(tgt)) {
          affectedEdgeSet.add(edge.id());
        }
      });
    }

    elements.forEach((ele) => {
      const classes = result.get(ele.id())!;
      const id = ele.id();
      if (id === originNodeId) {
        classes.add('impact-origin');
      } else if (ele.isNode() && affectedNodeSet.has(id)) {
        classes.add('impact-affected');
      } else if (ele.isEdge() && affectedEdgeSet.has(id)) {
        classes.add('impact-affected');
      } else {
        classes.add('impact-muted');
        classes.add('dimmed');
      }
    });

    return result;
  }

  if (state.kind === 'finding') {
    const { nodeIds, edgeIds } = state;
    const nodeSet = new Set(nodeIds);
    const edgeSet = new Set(edgeIds);

    elements.forEach((ele) => {
      const classes = result.get(ele.id())!;
      const id = ele.id();
      const isFinding = ele.isNode() ? nodeSet.has(id) : edgeSet.has(id);
      if (isFinding) {
        classes.add('finding-highlighted');
      } else {
        classes.add('dimmed');
      }
    });

    return result;
  }

  if (state.kind === 'simulation') {
    const addedNodeSet = new Set(state.addedNodeIds);
    const removedNodeSet = new Set(state.removedNodeIds);
    const affectedNodeSet = new Set(state.affectedNodeIds ?? []);
    const addedEdgeSet = new Set(state.addedEdgeIds ?? []);
    const removedEdgeSet = new Set(state.removedEdgeIds ?? []);

    elements.forEach((ele: cytoscape.SingularElementArgument) => {
      const classes = result.get(ele.id())!;
      const id = ele.id();
      if (ele.isNode()) {
        if (addedNodeSet.has(id)) classes.add('simulated-added');
        else if (removedNodeSet.has(id)) classes.add('simulated-removed');
        else if (affectedNodeSet.has(id)) classes.add('simulated-affected');
      } else if (ele.isEdge()) {
        if (addedEdgeSet.has(id)) classes.add('simulated-added');
        else if (removedEdgeSet.has(id)) classes.add('simulated-removed');
      }
    });

    return result;
  }

  if (state.kind === 'diff') {
    const addedNodeSet = new Set(state.addedNodeIds);
    const removedNodeSet = new Set(state.removedNodeIds);
    const modifiedNodeSet = new Set(state.modifiedNodeIds);
    const addedEdgeSet = new Set(state.addedEdgeIds ?? []);
    const removedEdgeSet = new Set(state.removedEdgeIds ?? []);

    elements.forEach((ele: cytoscape.SingularElementArgument) => {
      const classes = result.get(ele.id())!;
      const id = ele.id();
      if (ele.isNode()) {
        if (addedNodeSet.has(id)) classes.add('diff-added');
        else if (removedNodeSet.has(id)) classes.add('diff-removed');
        else if (modifiedNodeSet.has(id)) classes.add('diff-modified');
      } else if (ele.isEdge()) {
        if (addedEdgeSet.has(id)) classes.add('diff-added');
        else if (removedEdgeSet.has(id)) classes.add('diff-removed');
      }
    });

    return result;
  }

  return result;
}

/**
 * Applies the given HighlightState authoritatively to a Cytoscape instance.
 * Ensures state updates are idempotent, atomic, and completely clean up stale visual classes.
 */
export function applyHighlightState(cy: cytoscape.Core, state: HighlightState): void {
  if (!cy || typeof cy.batch !== 'function') return;

  cy.batch(() => {
    const wantedClasses = deriveVisualClasses(state, cy);
    cy.elements().forEach((ele) => {
      const targetClasses = wantedClasses.get(ele.id()) ?? new Set<string>();

      // 1. Remove owned visual classes that are NOT in targetClasses
      const rawClasses = typeof ele.classes === 'function'
        ? ele.classes()
        : (Array.isArray((ele as any)?.classes) ? (ele as any).classes : (typeof (ele as any)?.classes === 'string' ? (ele as any).classes.split(/\s+/) : []));

      const currentClasses = Array.isArray(rawClasses) ? rawClasses : [];
      currentClasses.forEach((cls) => {
        if (isOwnedVisualClass(cls) && !targetClasses.has(cls)) {
          if (typeof ele.removeClass === 'function') {
            ele.removeClass(cls);
          }
        }
      });

      // 2. Add target classes that are missing
      targetClasses.forEach((cls) => {
        const hasCls = typeof ele.hasClass === 'function' ? ele.hasClass(cls) : false;
        if (!hasCls && typeof ele.addClass === 'function') {
          ele.addClass(cls);
        }
      });
    });
  });
}
