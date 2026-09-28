import type { ExplorerDataSchema, ExplorerNode } from '../../types/explorer';
import type { ArchitectureLayer } from '../layout/types';
import { discoverFeatures, type FeatureDiscoveryOptions } from '../layout/features';
import { buildDomainGraph } from '../layout/global-layout';
import { buildFeatureDependencyMatrix } from '../layout/feature-ordering';

export interface SankeyAdapterOptions extends FeatureDiscoveryOptions {}

export interface SankeyEdgeProvenance {
  edgeId: string;
  sourceComponentId: string;
  sourceComponentName: string;
  targetComponentId: string;
  targetComponentName: string;
}

export interface SankeyNode {
  id: string;
  name: string;
  anchorNodeId: string;
  primaryLayer: ArchitectureLayer;
  primaryDomain: string;
  componentCount: number;
  componentIds: string[];
  totalInflow: number;
  totalOutflow: number;
}

export interface SankeyFlow {
  id: string;
  sourceFeatureId: string;
  targetFeatureId: string;
  weight: number;
  provenance: SankeyEdgeProvenance[];
  isSelfFlow: boolean;
  isInterLayer: boolean;
}

export interface SankeyStage {
  layer: ArchitectureLayer;
  label: string;
  orderIndex: number;
  featureIds: string[];
}

export interface SankeySummary {
  totalFeatures: number;
  totalFlows: number;
  totalEdgeWeight: number;
  maxFlowWeight: number;
  selfFlowCount: number;
  interLayerFlowCount: number;
  intraLayerFlowCount: number;
}

export interface SankeyAdapterData {
  stages: SankeyStage[];
  nodes: SankeyNode[];
  flows: SankeyFlow[];
  summary: SankeySummary;
  nodeMap: Map<string, SankeyNode>;
  flowMap: Map<string, SankeyFlow>;
}

const LAYER_STAGES: { layer: ArchitectureLayer; label: string; orderIndex: number }[] = [
  { layer: 'presentation', label: 'Presentation Layer', orderIndex: 0 },
  { layer: 'application', label: 'Application Layer', orderIndex: 1 },
  { layer: 'domain', label: 'Domain Layer', orderIndex: 2 },
  { layer: 'schema', label: 'Schema Layer', orderIndex: 3 },
];

/**
 * Pure, deterministic visualization data adapter for the Dependency River / Sankey lens.
 * Transforms canonical ExplorerDataSchema and feature analytics into a stage-based
 * directed flow matrix with full edge-level provenance.
 */
export function adaptSankeyRiver(
  input: ExplorerDataSchema,
  options: SankeyAdapterOptions = {}
): SankeyAdapterData {
  const nodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const edges = Array.isArray(input?.edges) ? input.edges : [];

  // 1. Discover Feature Clusters using existing primitive
  const discovery = discoverFeatures(nodes, edges, options);

  // 2. Build feature mapping for nodes
  const featureMap = new Map<string, string>();
  discovery.assignments.forEach((assignment, nodeId) => {
    featureMap.set(nodeId, assignment.primaryFeatureId);
  });
  nodes.forEach(node => {
    if (!featureMap.has(node.id)) {
      featureMap.set(node.id, 'Unassigned');
    }
  });

  // 3. Build domain graph representation using existing primitive
  const featureGraph = buildDomainGraph(nodes, edges, undefined, options.index, featureMap);

  // 4. Build feature dependency matrix using existing primitive
  const matrix = buildFeatureDependencyMatrix(nodes, edges, featureGraph, featureMap);

  // Quick lookup for node details
  const nodeLookup = new Map<string, ExplorerNode>();
  nodes.forEach(n => nodeLookup.set(n.id, n));

  // 5. Aggregate component edges into feature flows with edge provenance
  const flowMap = new Map<string, SankeyFlow>();

  edges.forEach(edge => {
    const srcFeature = featureMap.get(edge.source) || 'Unassigned';
    const tgtFeature = featureMap.get(edge.target) || 'Unassigned';

    const flowId = `flow_${srcFeature}->${tgtFeature}`;
    const srcNode = nodeLookup.get(edge.source);
    const tgtNode = nodeLookup.get(edge.target);

    const provenanceItem: SankeyEdgeProvenance = {
      edgeId: edge.id,
      sourceComponentId: edge.source,
      sourceComponentName: srcNode?.displayName || edge.source,
      targetComponentId: edge.target,
      targetComponentName: tgtNode?.displayName || edge.target,
    };

    if (!flowMap.has(flowId)) {
      const srcLayer = matrix.featurePrimaryLayers.get(srcFeature) || 'application';
      const tgtLayer = matrix.featurePrimaryLayers.get(tgtFeature) || 'application';

      flowMap.set(flowId, {
        id: flowId,
        sourceFeatureId: srcFeature,
        targetFeatureId: tgtFeature,
        weight: 0,
        provenance: [],
        isSelfFlow: srcFeature === tgtFeature,
        isInterLayer: srcLayer !== tgtLayer,
      });
    }

    const flow = flowMap.get(flowId)!;
    flow.weight += 1;
    flow.provenance.push(provenanceItem);
  });

  // Sort provenance items deterministically inside each flow
  flowMap.forEach(flow => {
    flow.provenance.sort((a, b) =>
      a.sourceComponentId.localeCompare(b.sourceComponentId) ||
      a.targetComponentId.localeCompare(b.targetComponentId) ||
      a.edgeId.localeCompare(b.edgeId)
    );
  });

  // 6. Build Sankey Nodes
  const featureIds = Array.from(matrix.featureIds).sort((a, b) => a.localeCompare(b));
  const nodeMap = new Map<string, SankeyNode>();

  const inflowMap = new Map<string, number>();
  const outflowMap = new Map<string, number>();

  featureIds.forEach(id => {
    inflowMap.set(id, 0);
    outflowMap.set(id, 0);
  });

  flowMap.forEach(flow => {
    if (!flow.isSelfFlow) {
      outflowMap.set(flow.sourceFeatureId, (outflowMap.get(flow.sourceFeatureId) || 0) + flow.weight);
      inflowMap.set(flow.targetFeatureId, (inflowMap.get(flow.targetFeatureId) || 0) + flow.weight);
    }
  });

  featureIds.forEach(id => {
    const cluster = discovery.features.get(id);
    const primaryLayer = matrix.featurePrimaryLayers.get(id) || 'application';
    const primaryDomain = matrix.featurePrimaryDomains.get(id) || 'Shared';

    const componentIds: string[] = [];
    if (cluster?.primaryNodeIds) componentIds.push(...cluster.primaryNodeIds);
    if (cluster?.secondaryNodeIds) componentIds.push(...cluster.secondaryNodeIds);
    if (componentIds.length === 0) {
      nodes.forEach(n => {
        if (featureMap.get(n.id) === id) componentIds.push(n.id);
      });
    }
    componentIds.sort((a, b) => a.localeCompare(b));

    const node: SankeyNode = {
      id,
      name: cluster?.name ?? id.replace(/^feature_/, ''),
      anchorNodeId: cluster?.anchorNodeId ?? '',
      primaryLayer,
      primaryDomain,
      componentCount: componentIds.length,
      componentIds,
      totalInflow: inflowMap.get(id) || 0,
      totalOutflow: outflowMap.get(id) || 0,
    };

    nodeMap.set(id, node);
  });

  // 7. Group Nodes into Layer Stages
  const stages: SankeyStage[] = LAYER_STAGES.map(stageInfo => {
    const stageFeatureIds = featureIds.filter(
      id => (matrix.featurePrimaryLayers.get(id) || 'application') === stageInfo.layer
    );
    stageFeatureIds.sort((a, b) => a.localeCompare(b));

    return {
      layer: stageInfo.layer,
      label: stageInfo.label,
      orderIndex: stageInfo.orderIndex,
      featureIds: stageFeatureIds,
    };
  });

  const flowsList = Array.from(flowMap.values()).sort(
    (a, b) => a.sourceFeatureId.localeCompare(b.sourceFeatureId) || a.targetFeatureId.localeCompare(b.targetFeatureId)
  );

  const sankeyNodesList = Array.from(nodeMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  // 8. Summary statistics
  let maxFlowWeight = 0;
  let totalEdgeWeight = 0;
  let selfFlowCount = 0;
  let interLayerFlowCount = 0;
  let intraLayerFlowCount = 0;

  flowsList.forEach(flow => {
    totalEdgeWeight += flow.weight;
    if (flow.weight > maxFlowWeight) maxFlowWeight = flow.weight;
    if (flow.isSelfFlow) selfFlowCount++;
    if (flow.isInterLayer) interLayerFlowCount++;
    else if (!flow.isSelfFlow) intraLayerFlowCount++;
  });

  const summary: SankeySummary = {
    totalFeatures: sankeyNodesList.length,
    totalFlows: flowsList.length,
    totalEdgeWeight,
    maxFlowWeight,
    selfFlowCount,
    interLayerFlowCount,
    intraLayerFlowCount,
  };

  return {
    stages,
    nodes: sankeyNodesList,
    flows: flowsList,
    summary,
    nodeMap,
    flowMap,
  };
}
