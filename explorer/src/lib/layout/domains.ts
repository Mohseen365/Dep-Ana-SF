import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';

export type DomainConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DomainAssignment {
  nodeId: string;
  primaryDomain: string;
  confidence: DomainConfidence;
  reason: string;
  /** Sorted list of distinct non-Shared domains connected to this node */
  connectedDomains: string[];
}

export interface DomainDiscoveryResult {
  assignments: Map<string, DomainAssignment>;
  domainToNodes: Map<string, string[]>;
  allDomains: string[];
}

const ARCHITECTURAL_SUFFIXES = [
  'TestDataFactory',
  'ControllerExtension',
  'ControllerExt',
  'Controller',
  'Services',
  'Service',
  'Selectors',
  'Selector',
  'Repositories',
  'Repository',
  'Repo',
  'DAO',
  'Manager',
  'Processor',
  'Engine',
  'Handlers',
  'Handler',
  'Helper',
  'Helpers',
  'Utility',
  'Util',
  'Utils',
  'Factory',
  'Batch',
  'Queueable',
  'Schedulable',
  'Orchestrator',
  'Workflow',
  'Facade',
  'Director',
  'DTO',
  'VO',
  'Model',
  'Wrapper',
  'Events',
  'Event',
  'Triggers',
  'Trigger',
  'Component',
  'View',
  'Adapter',
  'Gateway',
  'Client',
  'Queries',
  'Finder',
  'Constants',
  'Config',
  'Configuration',
  'Settings',
  'Tests',
  'Test',
];

const GENERIC_STEMS = new Set([
  'base',
  'app',
  'application',
  'common',
  'global',
  'util',
  'utils',
  'utility',
  'helper',
  'helpers',
  'core',
  'main',
  'system',
  'data',
  'test',
  'tests',
  'object',
  'field',
  'custom',
  'standard',
  'shared',
  'process',
]);

const GENERIC_FOLDER_NAMES = new Set([
  'default',
  'main',
  'force-app',
  'src',
  'classes',
  'lwc',
  'aura',
  'triggers',
  'pages',
  'objects',
  'fields',
  'staticresources',
  'labels',
  'layouts',
  'permissionsets',
  'profiles',
  'roles',
  'flexipages',
  'components',
  'domains',
  'modules',
]);

function cleanName(raw: string): string {
  if (!raw) return '';
  let name = String(raw).trim();
  name = name.replace(/__(?:c|mdt|e|r)$/i, '');
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name;
}

export function extractDomainStem(name: string): string | null {
  if (!name || typeof name !== 'string') return null;

  // Check if name is explicitly generic itself
  if (GENERIC_STEMS.has(name.toLowerCase())) {
    return null;
  }

  // Strip known architectural suffixes
  for (const suffix of ARCHITECTURAL_SUFFIXES) {
    if (name.length > suffix.length && name.endsWith(suffix)) {
      const candidate = name.slice(0, name.length - suffix.length);
      if (candidate.length >= 2) {
        if (GENERIC_STEMS.has(candidate.toLowerCase())) {
          return null; // Prefix is generic (e.g. CommonUtil, SharedHelper, MainOrchestrator) -> No domain stem
        }
        return cleanName(candidate);
      }
    }
  }

  // Check if name itself is a clean entity stem
  if (name.length >= 2 && /^[A-Z][A-Za-z0-9_]*$/.test(name) && !GENERIC_STEMS.has(name.toLowerCase())) {
    const isKeyword = ARCHITECTURAL_SUFFIXES.some(s => s.toLowerCase() === name.toLowerCase());
    if (!isKeyword) {
      return cleanName(name);
    }
  }

  return null;
}

export function extractDomainFromPath(filePath?: string): string | null {
  if (!filePath || typeof filePath !== 'string') return null;
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);

  // We look for directory segments preceding a file segment (i.e. i + 1 < parts.length - 1)
  for (let i = 0; i < parts.length - 2; i++) {
    const part = parts[i].toLowerCase();
    if (['classes', 'lwc', 'triggers', 'pages', 'domains', 'modules'].includes(part)) {
      const folder = parts[i + 1];
      if (
        folder &&
        folder.length >= 2 &&
        !GENERIC_STEMS.has(folder.toLowerCase()) &&
        !GENERIC_FOLDER_NAMES.has(folder.toLowerCase())
      ) {
        return cleanName(folder);
      }
    }
  }

  return null;
}

export function isTestNode(node: ExplorerNode): boolean {
  if (node.behavior?.isTest) return true;
  const name = node.displayName || node.id || '';
  if (/(?:test|tests|testdatafactory)$/i.test(name)) return true;
  if (node.file && /(?:^|\/)(?:test|tests)\//i.test(node.file)) return true;
  return false;
}

export function findProductionTarget(
  testNode: ExplorerNode,
  allNodes: ExplorerNode[],
  edges: ExplorerEdge[]
): ExplorerNode | null {
  const testName = testNode.displayName || testNode.id;

  // 1. Direct edge check (test-reference or any edge)
  const connectedEdges = edges
    .filter(e => e.source === testNode.id || e.target === testNode.id)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const edge of connectedEdges) {
    const otherId = edge.source === testNode.id ? edge.target : edge.source;
    const targetNode = allNodes.find(n => n.id === otherId && !isTestNode(n));
    if (targetNode) return targetNode;
  }

  // 2. Name convention match (e.g., OrderServiceTest -> OrderService)
  const strippedName = testName.replace(/(?:test|tests|testdatafactory)$/i, '');
  if (strippedName && strippedName !== testName) {
    const prodNodes = allNodes
      .filter(n => !isTestNode(n) && (n.displayName === strippedName || n.id.endsWith(`:${strippedName}`)))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (prodNodes.length > 0) return prodNodes[0];
  }

  return null;
}

export function findParentObject(
  fieldNode: ExplorerNode,
  allNodes: ExplorerNode[],
  edges: ExplorerEdge[]
): ExplorerNode | null {
  // 1. Check ID structure e.g. Object:Order__c.Field:Status__c or Order.Status
  const idParts = fieldNode.id.split('.');
  if (idParts.length >= 2) {
    const parentObjName = idParts[0].replace(/^(?:Object|CustomObject):/, '');
    const matchingObjects = allNodes
      .filter(
        n =>
          (n.type === 'Object' || n.type === 'CustomObject') &&
          (n.displayName === parentObjName || n.id.endsWith(`:${parentObjName}`))
      )
      .sort((a, b) => a.id.localeCompare(b.id));

    if (matchingObjects.length > 0) return matchingObjects[0];
  }

  // 2. Check field-reference / parent-child connected edges
  const fieldEdges = edges
    .filter(e => e.source === fieldNode.id || e.target === fieldNode.id)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const edge of fieldEdges) {
    const otherId = edge.source === fieldNode.id ? edge.target : edge.source;
    const parentObj = allNodes.find(
      n => (n.type === 'Object' || n.type === 'CustomObject') && n.id === otherId
    );
    if (parentObj) return parentObj;
  }

  return null;
}

/**
 * Deterministically discovers domain / subsystem classifications for all graph nodes.
 */
export function discoverDomains(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[]
): DomainDiscoveryResult {
  // Defensive sorting for guaranteed determinism
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

  const nodeMap = new Map<string, ExplorerNode>();
  sortedNodes.forEach(n => nodeMap.set(n.id, n));

  // Build sorted adjacency lists
  const adjMap = new Map<string, Array<{ neighborId: string; edge: ExplorerEdge }>>();
  sortedNodes.forEach(n => adjMap.set(n.id, []));

  sortedEdges.forEach(e => {
    if (adjMap.has(e.source) && adjMap.has(e.target)) {
      adjMap.get(e.source)!.push({ neighborId: e.target, edge: e });
      adjMap.get(e.target)!.push({ neighborId: e.source, edge: e });
    }
  });

  // Sort neighbors by neighborId ascending
  adjMap.forEach(neighbors => {
    neighbors.sort((a, b) => a.neighborId.localeCompare(b.neighborId));
  });

  const rawAssignments = new Map<string, { domain: string; confidence: DomainConfidence; reason: string }>();

  // Pass 1: Direct Signals (Primary production nodes, objects)
  sortedNodes.forEach(node => {
    if (isTestNode(node) || node.type === 'Field' || node.type === 'CustomField') {
      return; // Will be resolved in Pass 2 (Inheritance)
    }

    const name = node.displayName || node.id || '';
    const nameStem = extractDomainStem(name);
    const pathDomain = extractDomainFromPath(node.file);

    // Salesforce Object Signal
    if (node.type === 'Object' || node.type === 'CustomObject') {
      const cleanObjName = cleanName(name);
      if (cleanObjName && !GENERIC_STEMS.has(cleanObjName.toLowerCase())) {
        rawAssignments.set(node.id, {
          domain: cleanObjName,
          confidence: 'HIGH',
          reason: `Salesforce Object domain anchor: ${cleanObjName}`,
        });
        return;
      }
    }

    // Agreement between path and stem
    if (pathDomain && nameStem && pathDomain.toLowerCase() === nameStem.toLowerCase()) {
      rawAssignments.set(node.id, {
        domain: nameStem,
        confidence: 'HIGH',
        reason: `Agreement between folder path (${pathDomain}) and name stem (${nameStem})`,
      });
      return;
    }

    // Path folder evidence
    if (pathDomain) {
      rawAssignments.set(node.id, {
        domain: pathDomain,
        confidence: 'HIGH',
        reason: `Folder path structure signal: ${pathDomain}`,
      });
      return;
    }

    // Name stem evidence
    if (nameStem) {
      rawAssignments.set(node.id, {
        domain: nameStem,
        confidence: 'MEDIUM',
        reason: `Architectural name stem signal: ${nameStem}`,
      });
      return;
    }
  });

  // Pass 2: Field and Test Inheritance
  sortedNodes.forEach(node => {
    if (rawAssignments.has(node.id)) return;

    if (node.type === 'Field' || node.type === 'CustomField') {
      const parentObj = findParentObject(node, sortedNodes, sortedEdges);
      if (parentObj) {
        const parentAssignment = rawAssignments.get(parentObj.id);
        if (parentAssignment) {
          rawAssignments.set(node.id, {
            domain: parentAssignment.domain,
            confidence: 'HIGH',
            reason: `Field inherited domain from parent object ${parentObj.displayName || parentObj.id}`,
          });
          return;
        }
      }
    }

    if (isTestNode(node)) {
      const targetProd = findProductionTarget(node, sortedNodes, sortedEdges);
      if (targetProd) {
        const targetAssignment = rawAssignments.get(targetProd.id);
        if (targetAssignment) {
          rawAssignments.set(node.id, {
            domain: targetAssignment.domain,
            confidence: 'HIGH',
            reason: `Test inherited domain from production target ${targetProd.displayName || targetProd.id}`,
          });
          return;
        }
      }
    }
  });

  // Pass 3: Graph Neighborhood Cohesion & Disambiguation
  sortedNodes.forEach(node => {
    if (rawAssignments.has(node.id)) return;

    const neighbors = adjMap.get(node.id) || [];
    const neighborDomains = new Set<string>();

    neighbors.forEach(({ neighborId }) => {
      const assignment = rawAssignments.get(neighborId);
      if (assignment && assignment.domain !== 'Shared') {
        neighborDomains.add(assignment.domain);
      }
    });

    const sortedNeighborDomains = Array.from(neighborDomains).sort((a, b) => a.localeCompare(b));

    if (sortedNeighborDomains.length === 1) {
      const singleDomain = sortedNeighborDomains[0];
      rawAssignments.set(node.id, {
        domain: singleDomain,
        confidence: 'MEDIUM',
        reason: `Inferred from graph neighborhood cohesion with domain: ${singleDomain}`,
      });
      return;
    } else if (sortedNeighborDomains.length >= 2) {
      rawAssignments.set(node.id, {
        domain: 'Shared',
        confidence: 'HIGH',
        reason: `Shared: cross-cutting utility connected to multiple domains: [${sortedNeighborDomains.join(', ')}]`,
      });
      return;
    }
  });

  // Pass 4: Generic / Shared Fallback
  sortedNodes.forEach(node => {
    if (!rawAssignments.has(node.id)) {
      const name = node.displayName || node.id || '';
      rawAssignments.set(node.id, {
        domain: 'Shared',
        confidence: 'LOW',
        reason: `Shared: generic stem or insufficient domain evidence for node '${name}'`,
      });
    }
  });

  // Pass 5: Final Assembly & Connected Domains Tracking
  const assignments = new Map<string, DomainAssignment>();
  const domainToNodes = new Map<string, string[]>();

  sortedNodes.forEach(node => {
    const raw = rawAssignments.get(node.id)!;
    const neighbors = adjMap.get(node.id) || [];

    const connectedDomainSet = new Set<string>();
    neighbors.forEach(({ neighborId }) => {
      const neighborRaw = rawAssignments.get(neighborId);
      if (neighborRaw && neighborRaw.domain !== 'Shared') {
        connectedDomainSet.add(neighborRaw.domain);
      }
    });

    const connectedDomains = Array.from(connectedDomainSet).sort((a, b) => a.localeCompare(b));

    const finalAssignment: DomainAssignment = {
      nodeId: node.id,
      primaryDomain: raw.domain,
      confidence: raw.confidence,
      reason: raw.reason,
      connectedDomains,
    };

    assignments.set(node.id, finalAssignment);

    if (!domainToNodes.has(raw.domain)) {
      domainToNodes.set(raw.domain, []);
    }
    domainToNodes.get(raw.domain)!.push(node.id);
  });

  // Sort node arrays in domainToNodes
  domainToNodes.forEach(nodeIds => {
    nodeIds.sort((a, b) => a.localeCompare(b));
  });

  // Build sorted list of all domains ('Shared' first, then alphabetical)
  const allDomains = Array.from(domainToNodes.keys()).sort((a, b) => {
    if (a === 'Shared') return -1;
    if (b === 'Shared') return 1;
    return a.localeCompare(b);
  });

  return {
    assignments,
    domainToNodes,
    allDomains,
  };
}

/**
 * Backward-compatible single-node domain classification.
 */
export function classifyNodeDomain(
  node: ExplorerNode,
  allNodes: ExplorerNode[],
  edges: ExplorerEdge[]
): string {
  const result = discoverDomains(allNodes, edges);
  const assignment = result.assignments.get(node.id);
  return assignment ? assignment.primaryDomain : 'Shared';
}
