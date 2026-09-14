import type { ExplorerNode, ExplorerDataSchema } from '../types/explorer';

export interface HandoffTarget {
  nodeId: string;
  displayName: string;
  type: string;
  file: string;
}

export function buildHandoffPayload(
  node: ExplorerNode,
  _data?: ExplorerDataSchema
): HandoffTarget {
  const compName =
    node.displayName ||
    (node.id.includes(':') ? node.id.split(':')[1] : node.id);

  return {
    nodeId: node.id,
    displayName: compName,
    type: node.type,
    file: node.file || '',
  };
}

export function openHandoff(
  target: HandoffTarget,
  options?: { inIframe?: boolean }
): void {
  const payload = {
    type: 'OPEN_COMPONENT_MODAL',
    targetComponentId: target.nodeId,
    componentName: target.displayName,
    componentType: target.type,
    sourceFile: target.file || '',
    nodeId: target.nodeId,
    component: target.displayName,
  };

  const inIframe =
    options?.inIframe ??
    (typeof window !== 'undefined' && window.parent && window.parent !== window);

  if (inIframe && typeof window !== 'undefined' && window.parent) {
    window.parent.postMessage(payload, '*');
  }
}
