import { ExplorerNode, ExplorerEdge, ExplorerRelationshipType } from '../types/explorer';

/**
 * Seeded pseudo-random number generator (LCG) for deterministic test graph generation.
 */
function createPRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface SyntheticGraphOptions {
  nodeCount: number;
  seed?: number;
  componentCount?: number;
}

export function generateSyntheticSalesforceGraph(options: SyntheticGraphOptions): {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
} {
  const { nodeCount, seed = 42, componentCount = 3 } = options;
  const rand = createPRNG(seed);

  const domains = ['Billing', 'Order', 'Customer', 'Product', 'Analytics', 'Shared'];
  const nodes: ExplorerNode[] = [];
  const edges: ExplorerEdge[] = [];

  // Determine node distribution per disconnected component
  const nodesPerComp = Math.max(1, Math.floor(nodeCount / componentCount));

  let globalIdCounter = 0;

  for (let compIdx = 0; compIdx < componentCount; compIdx++) {
    const isLastComp = compIdx === componentCount - 1;
    const targetCompNodeCount = isLastComp
      ? nodeCount - globalIdCounter
      : nodesPerComp;

    if (targetCompNodeCount <= 0) break;

    const compDomain = domains[compIdx % domains.length];
    const compNodes: ExplorerNode[] = [];

    // For this component, create balanced proportion of Salesforce architecture layers
    for (let i = 0; i < targetCompNodeCount; i++) {
      const nodeIdx = globalIdCounter++;
      const randVal = rand();

      let type: ExplorerNode['type'] = 'ApexClass';
      let name = '';
      let file = '';
      let isTest = false;

      if (randVal < 0.15) {
        // LWC Presentation node
        type = 'LWC';
        name = `${compDomain}Card_${nodeIdx}`;
        file = `force-app/main/default/lwc/${name}/${name}.js`;
      } else if (randVal < 0.35) {
        // Application Controller / Service
        type = 'ApexClass';
        const role = rand() > 0.5 ? 'Controller' : 'Service';
        name = `${compDomain}${role}_${nodeIdx}`;
        file = `force-app/main/default/classes/${name}.cls`;
      } else if (randVal < 0.45) {
        // Trigger / Flow
        if (rand() > 0.5) {
          type = 'ApexTrigger';
          name = `${compDomain}Trigger_${nodeIdx}`;
          file = `force-app/main/default/triggers/${name}.trigger`;
        } else {
          type = 'Flow';
          name = `${compDomain}Workflow_${nodeIdx}`;
          file = `force-app/main/default/flows/${name}.flow-meta.xml`;
        }
      } else if (randVal < 0.65) {
        // Domain Selector / Repository
        type = 'ApexClass';
        const role = rand() > 0.5 ? 'Selector' : 'Repository';
        name = `${compDomain}${role}_${nodeIdx}`;
        file = `force-app/main/default/classes/${name}.cls`;
      } else if (randVal < 0.80) {
        // Schema Object / Field
        if (rand() > 0.4) {
          type = 'Object';
          name = `${compDomain}Record_${nodeIdx}__c`;
          file = `force-app/main/default/objects/${name}/${name}.object-meta.xml`;
        } else {
          type = 'Field';
          const parentObj = `${compDomain}Record_${Math.max(0, nodeIdx - 1)}__c`;
          name = `${parentObj}.Status_${nodeIdx}__c`;
          file = `force-app/main/default/objects/${parentObj}/fields/Status_${nodeIdx}__c.field-meta.xml`;
        }
      } else {
        // Test class associated with prod target
        type = 'ApexClass';
        isTest = true;
        name = `${compDomain}Service_${Math.max(0, nodeIdx - 1)}Test`;
        file = `force-app/main/default/classes/${name}.cls`;
      }

      const risk = rand() < 0.05 ? 'HIGH' : rand() < 0.2 ? 'MEDIUM' : 'LOW';

      compNodes.push({
        id: `${type}:${name}`,
        displayName: name,
        type,
        file,
        metrics: {
          fanIn: 0,
          fanOut: 0,
          coupling: 0,
          unresolved: 0,
          score: risk === 'HIGH' ? 10 : 2,
        },
        risk,
        riskReasons: risk === 'HIGH' ? ['complex dependencies'] : [],
        behavior: {
          isTest,
          publicContractsCount: Math.floor(rand() * 5),
          asyncPatterns: [],
          securitySignalsCount: 0,
          queryCount: type === 'ApexClass' ? Math.floor(rand() * 3) : 0,
          dmlCount: type === 'ApexClass' ? Math.floor(rand() * 2) : 0,
          calloutCount: 0,
        },
        refactoringReadiness: {
          isHighRisk: risk === 'HIGH',
          hasCycles: false,
          hasUnresolved: false,
          testCoverageStatus: isTest ? 'NO_TESTS' : 'COVERED',
        },
      });
    }

    nodes.push(...compNodes);

    // Create realistic intra-component edges
    const compNodeCount = compNodes.length;
    if (compNodeCount > 1) {
      // Connect nodes in layered order and hubs
      for (let i = 0; i < compNodeCount; i++) {
        const srcNode = compNodes[i];
        // Connect each node to 1-3 downstream nodes
        const numEdges = 1 + Math.floor(rand() * 3);
        for (let e = 0; e < numEdges; e++) {
          const targetOffset = 1 + Math.floor(rand() * Math.min(15, compNodeCount - 1));
          const targetIdx = (i + targetOffset) % compNodeCount;
          if (targetIdx !== i) {
            const tgtNode = compNodes[targetIdx];
            const edgeId = `${srcNode.id}->${tgtNode.id}:${i}_${e}`;
            const relationshipType: ExplorerRelationshipType = 'method-call';
            edges.push({
              id: edgeId,
              source: srcNode.id,
              target: tgtNode.id,
              relationshipType,
              method: 'execute',
              evidence: 'calls target',
              unresolved: false,
              resolutionClassification: 'RESOLVED_LOCAL',
              resolutionStrategy: 'EXACT',
              confidence: 'high',
              line: 15,
              column: 4,
              methodOwner: 'execute',
              file: srcNode.file,
              canonical: {
                source: { type: srcNode.type, name: srcNode.displayName },
                target: { type: tgtNode.type, name: tgtNode.displayName },
                relationship: { type: relationshipType, resolution: 'EXACT' },
                location: { line: 15, column: 4 },
              },
            });

            srcNode.metrics.fanOut++;
            tgtNode.metrics.fanIn++;
            srcNode.metrics.coupling++;
            tgtNode.metrics.coupling++;
          }
        }
      }
    }
  }

  // Create cross-domain bridge edges between components
  if (nodes.length > 20 && componentCount > 1) {
    const bridgeCount = Math.floor(componentCount * 2);
    for (let b = 0; b < bridgeCount; b++) {
      const srcIdx = Math.floor(rand() * (nodes.length / 2));
      const tgtIdx = Math.floor(nodes.length / 2 + rand() * (nodes.length / 2));
      if (srcIdx < nodes.length && tgtIdx < nodes.length && srcIdx !== tgtIdx) {
        const srcNode = nodes[srcIdx];
        const tgtNode = nodes[tgtIdx];
        const relationshipType: ExplorerRelationshipType = 'type-reference';
        edges.push({
          id: `bridge:${srcNode.id}->${tgtNode.id}:${b}`,
          source: srcNode.id,
          target: tgtNode.id,
          relationshipType,
          method: 'crossDomainCall',
          evidence: 'cross domain bridge',
          unresolved: false,
          resolutionClassification: 'RESOLVED_LOCAL',
          resolutionStrategy: 'EXACT',
          confidence: 'high',
          line: 20,
          column: 2,
          methodOwner: 'crossDomainCall',
          file: srcNode.file,
          canonical: {
            source: { type: srcNode.type, name: srcNode.displayName },
            target: { type: tgtNode.type, name: tgtNode.displayName },
            relationship: { type: relationshipType, resolution: 'EXACT' },
            location: {},
          },
        });
      }
    }
  }

  return { nodes, edges };
}
