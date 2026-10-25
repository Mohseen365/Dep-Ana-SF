import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayoutOptions } from '../architecture-layout';
import type { OrbitGuideMetadata } from '../orbit-layout';

export interface LayoutWorkerRequest {
  type: 'CALCULATE_LAYOUT';
  projectId: string;
  requestGeneration: number;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  options?: ArchitectureLayoutOptions;
}

export interface FeatureRegionSummary {
  id: string;
  domainId: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xCenter: number;
  yCenter: number;
}

export interface LayoutWorkerResponseSuccess {
  type: 'LAYOUT_SUCCESS';
  projectId: string;
  requestGeneration: number;
  positions: Record<string, { x: number; y: number }>;
  featureRegionsSummary?: FeatureRegionSummary[];
  orbitGuides?: OrbitGuideMetadata;
  projectedNodeIds?: string[];
  computeDurationMs: number;
}

export interface LayoutWorkerResponseError {
  type: 'LAYOUT_ERROR';
  projectId: string;
  requestGeneration: number;
  error: string;
  computeDurationMs: number;
}

export type LayoutWorkerResponse = LayoutWorkerResponseSuccess | LayoutWorkerResponseError;
