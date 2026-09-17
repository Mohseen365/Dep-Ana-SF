import type { ExplorerNode, ExplorerEdge } from '../types/explorer';

export interface ArchitectureLayoutOptions {
  /** Width of nodes used for collision avoidance (default: 120) */
  nodeWidth?: number;
  /** Height of nodes used for collision avoidance (default: 60) */
  nodeHeight?: number;
  /** Vertical distance between architectural layer bands (default: 250) */
  layerSpacing?: number;
  /** Horizontal distance between domain/subsystem clusters (default: 380) */
  domainSpacing?: number;
  /** Horizontal gap between disconnected graph components (default: 450) */
  componentGap?: number;
  /** Map of existing authoritative positions to preserve for incremental layout */
  existingPositions?: Record<string, { x: number; y: number }>;
}

export type ArchitectureLayer = 'presentation' | 'application' | 'domain' | 'schema';

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

  // Strip known suffixes
  for (const suffix of ARCHITECTURAL_SUFFIXES) {
    if (name.length > suffix.length && name.endsWith(suffix)) {
      const candidate = name.slice(0, name.length - suffix.length);
      if (candidate.length >= 2 && !GENERIC_STEMS.has(candidate.toLowerCase())) {
        return cleanName(candidate);
      }
    }
  }

  // If no suffix matched, check if name itself is a clean entity stem
  if (name.length >= 2 && /^[A-Z][A-Za-z0-9_]*$/.test(name) && !GENERIC_STEMS.has(name.toLowerCase())) {
    const isKeyword = ARCHITECTURAL_SUFFIXES.some(s => s.toLowerCase() === name.toLowerCase());
    if (!isKeyword) {
      return cleanName(name);
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

export function classifyNodeLayer(node: ExplorerNode): ArchitectureLayer {
  const type = node.type;
  const name = node.displayName || node.id || '';
  const file = node.file || '';

  // Schema Layer (Layer 4)
  if (
    type === 'Object' ||
    type === 'CustomObject' ||
    type === 'Field' ||
    type === 'CustomField' ||
    type === 'External'
  ) {
    return 'schema';
  }

  // Presentation Layer (Layer 1)
  if (type === 'LWC' || type === 'Visualforce') {
    return 'presentation';
  }
  if (/(?:view|page|component|ui)$/i.test(name) || /(?:^|\/)(?:lwc|aura|pages)\//i.test(file)) {
    return 'presentation';
  }

  // Application Layer (Layer 2)
  if (type === 'ApexTrigger' || type === 'Flow') {
    return 'application';
  }
  if (
    /(?:controller|controllerextension|handler|manager|processor|engine|workflow|orchestrator|batch|queueable|schedulable)$/i.test(
      name
    )
  ) {
    return 'application';
  }

  // Domain / Data Layer (Layer 3)
  if (
    /(?:selector|repository|repo|dao|domain|dto|vo|model|wrapper|queries|finder)$/i.test(
      name
    )
  ) {
    return 'domain';
  }

  // Check behavior signals
  if (node.behavior) {
    if (node.behavior.asyncPatterns && node.behavior.asyncPatterns.length > 0) {
      return 'application';
    }
    if (node.behavior.queryCount > 0 || node.behavior.dmlCount > 0) {
      if (!/(?:Controller|Service)$/i.test(name)) {
        return 'domain';
      }
    }
  }

  // Fallback for general ApexClass
  if (/(?:service|services)$/i.test(name)) {
    return 'application';
  }

  return 'application';
}

function findProductionTarget(
  testNode: ExplorerNode,
  allNodes: ExplorerNode[],
  edges: ExplorerEdge[]
): ExplorerNode | null {
  const testName = testNode.displayName || testNode.id;

  // 1. Direct edge check (test-reference or any outgoing/incoming edge)
  const connectedEdges = edges.filter(
    e => e.source === testNode.id || e.target === testNode.id
  );
  for (const edge of connectedEdges) {
    const otherId = edge.source === testNode.id ? edge.target : edge.source;
    const targetNode = allNodes.find(n => n.id === otherId && !isTestNode(n));
    if (targetNode) return targetNode;
  }

  // 2. Name convention match (OrderServiceTest -> OrderService)
  const strippedName = testName.replace(/(?:test|tests|testdatafactory)$/i, '');
  if (strippedName && strippedName !== testName) {
    const match = allNodes.find(
      n => !isTestNode(n) && (n.displayName === strippedName || n.id.endsWith(`:${strippedName}`))
    );
    if (match) return match;
  }

  return null;
}

function findParentObject(
  fieldNode: ExplorerNode,
  allNodes: ExplorerNode[],
  edges: ExplorerEdge[]
): ExplorerNode | null {
  // 1. Check ID structure e.g. Object:Account.Field:Phone or Account.Phone
  const idParts = fieldNode.id.split('.');
  if (idParts.length >= 2) {
    const parentObjName = idParts[0].replace(/^Object:/, '');
    const parentObj = allNodes.find(
      n => (n.type === 'Object' || n.type === 'CustomObject') &&
           (n.displayName === parentObjName || n.id.endsWith(`:${parentObjName}`))
    );
    if (parentObj) return parentObj;
  }

  // 2. Check field-reference or parent-child edges
  const fieldEdges = edges.filter(
    e => e.source === fieldNode.id || e.target === fieldNode.id
  );
  for (const edge of fieldEdges) {
    const otherId = edge.source === fieldNode.id ? edge.target : edge.source;
    const parentObj = allNodes.find(
      n => (n.type === 'Object' || n.type === 'CustomObject') && n.id === otherId
    );
    if (parentObj) return parentObj;
  }

  return null;
}

function classifyNodeDomain(
  node: ExplorerNode,
  allNodes: ExplorerNode[],
  edges: ExplorerEdge[]
): string {
  // If field, inherit parent object's domain
  if (node.type === 'Field' || node.type === 'CustomField') {
    const parentObj = findParentObject(node, allNodes, edges);
    if (parentObj) {
      return classifyNodeDomain(parentObj, allNodes, edges);
    }
  }

  // Extract from name
  const name = node.displayName || node.id || '';
  const stem = extractDomainStem(name);
  if (stem) return stem;

  // Extract from file path folder
  if (node.file) {
    const normalized = node.file.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i].toLowerCase();
      if (['classes', 'lwc', 'triggers', 'pages', 'domains', 'modules'].includes(part)) {
        const folder = parts[i + 1];
        if (folder && folder.length >= 2 && !GENERIC_STEMS.has(folder.toLowerCase())) {
          return cleanName(folder);
        }
      }
    }
  }

  return 'Shared';
}

interface ConnectedComponent {
  id: number;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
}

function decomposeConnectedComponents(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[]
): ConnectedComponent[] {
  const nodeMap = new Map<string, ExplorerNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const adj = new Map<string, Set<string>>();
  nodes.forEach(n => adj.set(n.id, new Set()));

  edges.forEach(e => {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }
  });

  const visited = new Set<string>();
  const components: ConnectedComponent[] = [];

  // Deterministic processing order by node ID
  const sortedNodeIds = nodes.map(n => n.id).sort((a, b) => a.localeCompare(b));

  let compCounter = 0;
  for (const nodeId of sortedNodeIds) {
    if (visited.has(nodeId)) continue;

    const compNodes: ExplorerNode[] = [];
    const queue = [nodeId];
    visited.add(nodeId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const nodeObj = nodeMap.get(curr);
      if (nodeObj) compNodes.push(nodeObj);

      const neighbors = Array.from(adj.get(curr) || []).sort((a, b) => a.localeCompare(b));
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    compNodes.sort((a, b) => a.id.localeCompare(b.id));

    const compNodeIdSet = new Set(compNodes.map(n => n.id));
    const compEdges = edges
      .filter(e => compNodeIdSet.has(e.source) && compNodeIdSet.has(e.target))
      .sort((a, b) => a.id.localeCompare(b.id));

    components.push({
      id: compCounter++,
      nodes: compNodes,
      edges: compEdges,
    });
  }

  // Sort components deterministically: largest node count first, then min node ID
  components.sort((a, b) => {
    if (b.nodes.length !== a.nodes.length) {
      return b.nodes.length - a.nodes.length;
    }
    const minA = a.nodes[0]?.id || '';
    const minB = b.nodes[0]?.id || '';
    return minA.localeCompare(minB);
  });

  return components;
}

/**
 * Intelligent Architecture-Aware Layout Engine
 *
 * Computes deterministic (x, y) coordinates for graph nodes based on:
 * - Architectural Layers (Presentation → Application → Domain → Schema)
 * - Domain / Subsystem clustering
 * - Special handling for Tests, Fields, Triggers/Handlers, Bridge nodes, Hubs
 * - Disconnected component separation
 * - Preservation of existing authoritative node positions
 */
export function computeArchitectureLayout(
  nodes: ExplorerNode[],
  edges: ExplorerEdge[],
  options: ArchitectureLayoutOptions = {}
): Record<string, { x: number; y: number }> {
  const {
    nodeWidth = 120,
    nodeHeight = 60,
    layerSpacing = 250,
    domainSpacing = 380,
    componentGap = 450,
    existingPositions = {},
  } = options;

  const layerYOffsets: Record<ArchitectureLayer, number> = {
    presentation: 100,
    application: 100 + layerSpacing,
    domain: 100 + 2 * layerSpacing,
    schema: 100 + 3 * layerSpacing,
  };

  // Defensive deep clone of inputs to guarantee immutability
  const safeNodes = Array.isArray(nodes) ? [...nodes] : [];
  const safeEdges = Array.isArray(edges) ? [...edges] : [];

  // Ensure all edge endpoints are present in safeNodes
  const knownNodeIds = new Set(safeNodes.map(n => n.id));
  safeEdges.forEach(e => {
    if (!knownNodeIds.has(e.source)) {
      knownNodeIds.add(e.source);
      safeNodes.push({
        id: e.source,
        displayName: e.source.split(':').pop() || e.source,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      });
    }
    if (!knownNodeIds.has(e.target)) {
      knownNodeIds.add(e.target);
      safeNodes.push({
        id: e.target,
        displayName: e.target.split(':').pop() || e.target,
        type: 'External',
        file: '',
        metrics: { fanIn: 0, fanOut: 0, coupling: 0, unresolved: 0, score: 0 },
        risk: 'LOW',
        riskReasons: [],
        behavior: { isTest: false, publicContractsCount: 0, asyncPatterns: [], securitySignalsCount: 0, queryCount: 0, dmlCount: 0, calloutCount: 0 },
        refactoringReadiness: { isHighRisk: false, hasCycles: false, hasUnresolved: false, testCoverageStatus: 'UNTESTED' },
      });
    }
  });

  // Sort nodes deterministically by ID
  safeNodes.sort((a, b) => a.id.localeCompare(b.id));

  // 1. Classification Phase
  const nodeLayerMap = new Map<string, ArchitectureLayer>();
  const nodeDomainMap = new Map<string, string>();

  safeNodes.forEach(node => {
    let layer = classifyNodeLayer(node);
    if (isTestNode(node)) {
      const targetProd = findProductionTarget(node, safeNodes, safeEdges);
      if (targetProd) {
        layer = classifyNodeLayer(targetProd);
      }
    }
    nodeLayerMap.set(node.id, layer);

    let domain = classifyNodeDomain(node, safeNodes, safeEdges);
    if (isTestNode(node)) {
      const targetProd = findProductionTarget(node, safeNodes, safeEdges);
      if (targetProd) {
        domain = classifyNodeDomain(targetProd, safeNodes, safeEdges);
      }
    }
    nodeDomainMap.set(node.id, domain);
  });

  // 2. Identify Bridge Nodes
  const bridgeNodes = new Set<string>();
  const nodeConnectedDomains = new Map<string, Set<string>>();

  safeNodes.forEach(node => {
    const connectedDomains = new Set<string>();
    const nodeEdges = safeEdges.filter(e => e.source === node.id || e.target === node.id);
    nodeEdges.forEach(e => {
      const otherId = e.source === node.id ? e.target : e.source;
      const otherDomain = nodeDomainMap.get(otherId);
      if (otherDomain && otherDomain !== 'Shared') {
        connectedDomains.add(otherDomain);
      }
    });
    nodeConnectedDomains.set(node.id, connectedDomains);
    if (connectedDomains.size >= 2) {
      bridgeNodes.add(node.id);
    }
  });

  // 3. Decompose Connected Components
  const components = decomposeConnectedComponents(safeNodes, safeEdges);

  const resultPositions: Record<string, { x: number; y: number }> = {};
  let currentComponentXOffset = 0;

  // Track existing locked positions
  const lockedPositions = new Set<string>(Object.keys(existingPositions));

  // Copy authoritative existing positions
  for (const [id, pos] of Object.entries(existingPositions)) {
    resultPositions[id] = { x: pos.x, y: pos.y };
  }

  // 4. Layout Each Connected Component
  for (const component of components) {
    // Determine unique domains in component
    const componentDomains = Array.from(
      new Set(component.nodes.map(n => nodeDomainMap.get(n.id) || 'Shared'))
    ).sort((a, b) => {
      if (a === 'Shared') return -1;
      if (b === 'Shared') return 1;
      return a.localeCompare(b);
    });

    // Assign X centers to domains in component
    const domainXCenters = new Map<string, number>();
    componentDomains.forEach((domain, idx) => {
      domainXCenters.set(domain, currentComponentXOffset + idx * domainSpacing);
    });

    // Group non-test, non-field, non-bridge nodes into (Layer, Domain) buckets
    const bucketMap = new Map<string, ExplorerNode[]>();

    const testNodesInComp: ExplorerNode[] = [];
    const fieldNodesInComp: ExplorerNode[] = [];
    const bridgeNodesInComp: ExplorerNode[] = [];

    component.nodes.forEach(node => {
      if (lockedPositions.has(node.id)) return; // Already positioned

      if (isTestNode(node)) {
        testNodesInComp.push(node);
      } else if (node.type === 'Field' || node.type === 'CustomField') {
        fieldNodesInComp.push(node);
      } else if (bridgeNodes.has(node.id)) {
        bridgeNodesInComp.push(node);
      } else {
        const layer = nodeLayerMap.get(node.id) || 'application';
        const domain = nodeDomainMap.get(node.id) || 'Shared';
        const key = `${layer}:${domain}`;
        if (!bucketMap.has(key)) bucketMap.set(key, []);
        bucketMap.get(key)!.push(node);
      }
    });

    // Layout Regular Nodes in Buckets
    bucketMap.forEach((bucketNodes, key) => {
      const [layer, domain] = key.split(':') as [ArchitectureLayer, string];
      const baseY = layerYOffsets[layer];
      const domainX = domainXCenters.get(domain) ?? currentComponentXOffset;

      // Sort bucket nodes deterministically: high degree first, then ID
      bucketNodes.sort((a, b) => {
        const degreeA = a.metrics.fanIn + a.metrics.fanOut;
        const degreeB = b.metrics.fanIn + b.metrics.fanOut;
        if (degreeB !== degreeA) return degreeB - degreeA;
        return a.id.localeCompare(b.id);
      });

      const maxCols = bucketNodes.length > 4 ? 3 : 2;
      bucketNodes.forEach((node, idx) => {
        const col = idx % maxCols;
        const row = Math.floor(idx / maxCols);

        const x = domainX + (col - (maxCols - 1) / 2) * (nodeWidth * 1.3);
        const y = baseY + row * (nodeHeight * 1.4);

        resultPositions[node.id] = { x, y };
      });
    });

    // Layout Bridge Nodes Spatially Between Domains
    bridgeNodesInComp.forEach(node => {
      const connected = Array.from(nodeConnectedDomains.get(node.id) || []);
      const layer = nodeLayerMap.get(node.id) || 'application';
      const baseY = layerYOffsets[layer];

      let targetX = currentComponentXOffset;
      if (connected.length >= 2) {
        let sumX = 0;
        let count = 0;
        connected.forEach(d => {
          if (domainXCenters.has(d)) {
            sumX += domainXCenters.get(d)!;
            count++;
          }
        });
        if (count > 0) targetX = sumX / count;
      } else {
        const domain = nodeDomainMap.get(node.id) || 'Shared';
        targetX = domainXCenters.get(domain) ?? currentComponentXOffset;
      }

      resultPositions[node.id] = { x: targetX, y: baseY };
    });

    // Layout Fields Near Parent Object
    fieldNodesInComp.forEach((fieldNode, idx) => {
      const parentObj = findParentObject(fieldNode, safeNodes, safeEdges);
      let posX = currentComponentXOffset;
      let posY = layerYOffsets.schema;

      if (parentObj && resultPositions[parentObj.id]) {
        const parentPos = resultPositions[parentObj.id];
        const col = idx % 3;
        const row = Math.floor(idx / 3) + 1;
        posX = parentPos.x + (col - 1) * (nodeWidth * 0.9);
        posY = parentPos.y + row * (nodeHeight * 0.9);
      } else {
        const domain = nodeDomainMap.get(fieldNode.id) || 'Shared';
        const domainX = domainXCenters.get(domain) ?? currentComponentXOffset;
        posX = domainX + (idx % 2) * nodeWidth;
        posY = layerYOffsets.schema + Math.floor(idx / 2) * nodeHeight;
      }

      resultPositions[fieldNode.id] = { x: posX, y: posY };
    });

    // Layout Tests Near Production Nodes
    testNodesInComp.forEach((testNode, idx) => {
      const targetProd = findProductionTarget(testNode, safeNodes, safeEdges);
      let posX = currentComponentXOffset;
      let posY = layerYOffsets.application;

      if (targetProd && resultPositions[targetProd.id]) {
        const prodPos = resultPositions[targetProd.id];
        posX = prodPos.x + nodeWidth * 0.75;
        posY = prodPos.y + nodeHeight * 0.4;
      } else {
        const domain = nodeDomainMap.get(testNode.id) || 'Shared';
        const layer = nodeLayerMap.get(testNode.id) || 'application';
        const domainX = domainXCenters.get(domain) ?? currentComponentXOffset;
        posX = domainX + nodeWidth * 0.8;
        posY = layerYOffsets[layer] + (idx + 1) * 35;
      }

      resultPositions[testNode.id] = { x: posX, y: posY };
    });

    // Collision Avoidance & Minimum Clearance Pass for Component Nodes
    const compNodeIds = component.nodes.map(n => n.id);
    for (let i = 0; i < compNodeIds.length; i++) {
      const idA = compNodeIds[i];
      const posA = resultPositions[idA];
      if (!posA) continue;

      for (let j = i + 1; j < compNodeIds.length; j++) {
        const idB = compNodeIds[j];
        const posB = resultPositions[idB];
        if (!posB) continue;

        const dx = Math.abs(posA.x - posB.x);
        const dy = Math.abs(posA.y - posB.y);

        const minDistX = nodeWidth * 0.8;
        const minDistY = nodeHeight * 0.7;

        if (dx < minDistX && dy < minDistY) {
          // Resolve overlap by shifting unlocked node B
          if (!lockedPositions.has(idB)) {
            posB.x += minDistX - dx + 15;
            posB.y += 10;
          } else if (!lockedPositions.has(idA)) {
            posA.x += minDistX - dx + 15;
            posA.y += 10;
          }
        }
      }
    }

    // Advance currentComponentXOffset for next disconnected component
    let maxCompX = currentComponentXOffset;
    compNodeIds.forEach(id => {
      const pos = resultPositions[id];
      if (pos && pos.x > maxCompX) {
        maxCompX = pos.x;
      }
    });

    currentComponentXOffset = maxCompX + componentGap;
  }

  return resultPositions;
}
