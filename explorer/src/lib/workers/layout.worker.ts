import { computeArchitectureLayoutWithMetadata } from '../architecture-layout';
import type {
  LayoutWorkerRequest,
  LayoutWorkerResponse,
  FeatureRegionSummary,
} from './layout-worker-types';

const ctx: Worker = self as any;

ctx.addEventListener('message', (event: MessageEvent<LayoutWorkerRequest>) => {
  const message = event.data;
  if (!message || message.type !== 'CALCULATE_LAYOUT') {
    return;
  }

  const { projectId, requestGeneration, nodes, edges, options } = message;
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  try {
    const result = computeArchitectureLayoutWithMetadata(nodes || [], edges || [], options || {});
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const computeDurationMs = endTime - startTime;

    let featureRegionsSummary: FeatureRegionSummary[] | undefined;
    if (result.featureRegions && result.featureRegions.size > 0) {
      featureRegionsSummary = [];
      result.featureRegions.forEach((region, featureId) => {
        featureRegionsSummary!.push({
          id: region.id || featureId,
          domainId: region.domainId,
          xMin: region.xMin,
          xMax: region.xMax,
          yMin: region.yMin,
          yMax: region.yMax,
          xCenter: region.xCenter,
          yCenter: region.yCenter,
          primaryLayer: region.primaryLayer,
          orderIndex: region.orderIndex,
          nodeCount: region.nodeCount,
          primaryNodeCount: region.primaryNodeCount,
        });
      });
    }

    const response: LayoutWorkerResponse = {
      type: 'LAYOUT_SUCCESS',
      projectId,
      requestGeneration,
      positions: result.positions,
      featureRegionsSummary,
      orbitGuides: result.orbitGuides,
      projectedNodeIds: result.projectedNodeIds ? Array.from(result.projectedNodeIds) : undefined,
      computeDurationMs,
    };

    ctx.postMessage(response);
  } catch (error: any) {
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const computeDurationMs = endTime - startTime;

    const response: LayoutWorkerResponse = {
      type: 'LAYOUT_ERROR',
      projectId,
      requestGeneration,
      error: error?.message || String(error),
      computeDurationMs,
    };

    ctx.postMessage(response);
  }
});
