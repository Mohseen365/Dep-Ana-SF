import type { ExplorerNode, ExplorerEdge } from '../../../types/explorer';

export type BaselineLayoutFailure =
  | 'edge crossings'
  | 'weak domain cohesion'
  | 'naive bridge placement'
  | 'single-pass collision failures'
  | 'horizontal disconnected-component stretching'
  | 'test/field distortion'
  | 'degree-only ordering';

export interface BenchmarkFixtureMetadata {
  nodeCount: number;
  edgeCount: number;
  domainCount?: number;
  layerCount?: number;
  hasTests?: boolean;
  hasFields?: boolean;
  hasBridges?: boolean;
  hasHubs?: boolean;
  componentCount?: number;
  [key: string]: unknown;
}

export interface BenchmarkFixture {
  id: string;
  name: string;
  description: string;
  purpose: string;
  targetFailures: BaselineLayoutFailure[];
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  metadata: BenchmarkFixtureMetadata;
}
