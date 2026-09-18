import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import type { ArchitectureLayer, ArchitectureGraphAnalysis } from './types';
import { classifyNodeLayer } from './layers';
import { classifyNodeDomain } from './domains';
import { computeArchitectureAnalysis } from './analysis';
import type { DomainRegion } from './global-layout';
import { calculateLayoutMetrics, type ComprehensiveLayoutMetrics, type PositionMap } from './metrics';

export interface LocalLayoutOptions {
  /** Node width for bounding box calculations (default: 120) */
  nodeWidth?: number;
  /** Node height for bounding box calculations (default: 60) */
  nodeHeight?: number;
  /** Minimum horizontal clearance gap between adjacent nodes in bucket (default: 40) */
  horizontalGap?: number;
  /** Minimum vertical clearance gap between adjacent rows in bucket (default: 40) */
  verticalGap?: number;
  /** Base X origin coordinate if no domain region is provided (default: 100) */
  baseX?: number;
  /** Base Y origin coordinate (default: 100) */
  baseY?: number;
  /** Domain region horizontal center-to-center spacing offset fallback (default: 380) */
  domainSpacing?: number;
}

export interface LocalBucketLayout {
  /** Bucket identifier in `${layer}:${domain}` format */
  bucketKey: string;
  /** Architecture layer */
  layer: ArchitectureLayer;
  /** Subsystem or business domain */
  domain: string;
  /** Primary node IDs contained in this bucket, sorted deterministically */
  nodeIds: string[];
  /** Bounding box and centroid of this local bucket layout */
  bounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    width: number;
    height: number;
    xCenter: number;
    yCenter: number;
  };
  /** Number of local rows used */
  rows: number;
  /** Maximum number of columns used */
  cols: number;
}

export interface LocalLayoutInput {
  /** All Explorer graph nodes */
  nodes: ExplorerNode[];
  /** All Explorer graph edges */
  edges: ExplorerEdge[];
  /** Precomputed architecture graph analysis from Wave 1A */
  analysis?: ArchitectureGraphAnalysis;
  /** Domain regions from Wave 2A computeGlobalDomainLayout */
  domainRegions?: Map<string, DomainRegion> | Record<string, DomainRegion>;
  /** Custom layer mapping (nodeId -> ArchitectureLayer) */
  layerMap?: Map<string, ArchitectureLayer> | Record<string, ArchitectureLayer>;
  /** Custom domain mapping (nodeId -> domain string) */
  domainMap?: Map<string, string> | Record<string, string>;
  /** Wave 2B bucket ordering map (`${layer}:${domain}` -> ordered node IDs) */
  bucketOrder?: Map<string, string[]> | Record<string, string[]>;
  /** Configuration geometry and spacing options */
  options?: LocalLayoutOptions;
}

export interface LocalLayoutResult {
  /** Coordinates for all primary production nodes */
  primaryNodePositions: PositionMap;
  /** Map of bucket key `${layer}:${domain}` to bucket layout details */
  bucketLayouts: Map<string, LocalBucketLayout>;
  /** Total number of primary production nodes arranged */
  primaryNodeCount: number;
  /** Layout quality metrics for primary node placement */
  metrics: ComprehensiveLayoutMetrics | null;
}

const LAYER_Y_BASE: Record<ArchitectureLayer, number> = {
  presentation: 100,
  application: 350,
  domain: 600,
  schema: 850,
};

const LAYERS_IN_ORDER: ArchitectureLayer[] = [
  'presentation',
  'application',
  'domain',
  'schema',
];

/**
 * WAVE 3A — PRIMARY PRODUCTION NODE LOCAL LAYOUT
 *
 * Arranges primary production nodes inside architectural layer and domain regions
 * established by Wave 2.
 *
 * PRIMARY NODE SCOPE:
 * Focuses strictly on ordinary production/architecture nodes (Apex classes, services,
 * controllers, selectors, repositories, handlers, domain classes). Excludes unit tests
 * (`isTest`) and object fields (`isField`), which are handled by Agent 3C.
 *
 * INPUT CONTRACT:
 * Accepts nodes, edges, precomputed analysis, domain regions (Wave 2A), bucket ordering (Wave 2B),
 * layer/domain maps, and geometry options.
 *
 * OUTPUT CONTRACT:
 * Returns deterministic candidate positions for primary production nodes (`primaryNodePositions`),
 * detailed bucket bounds (`bucketLayouts`), node count, and layout metrics.
 *
 * COORDINATE ORIGIN & SPACING ASSUMPTIONS:
 * - 2D Cartesian coordinate space (+X rightward, +Y downward).
 * - Domain regions establish horizontal center X coordinates (`xCenter`).
 * - Layers establish vertical Y base offsets (`presentation: 100`, `application: 350`,
 *   `domain: 600`, `schema: 850`).
 * - Default node dimensions: 120 x 60 px.
 * - Default clearance gaps: 40px horizontal, 40px vertical.
 *
 * DETERMINISM GUARANTEE:
 * Inputs, iteration keys, and node lists are sorted deterministically. No randomness or
 * non-deterministic viewport state is used.
 */
export function computeLocalNodeLayout(input: LocalLayoutInput): LocalLayoutResult {
  const safeNodes = Array.isArray(input.nodes) ? [...input.nodes] : [];
  const safeEdges = Array.isArray(input.edges) ? [...input.edges] : [];

  // Sort inputs deterministically
  safeNodes.sort((a, b) => a.id.localeCompare(b.id));
  safeEdges.sort((a, b) => a.id.localeCompare(b.id));

  const options = input.options || {};
  const nodeWidth = options.nodeWidth ?? 120;
  const nodeHeight = options.nodeHeight ?? 60;
  const horizontalGap = options.horizontalGap ?? 40;
  const verticalGap = options.verticalGap ?? 40;
  const baseX = options.baseX ?? 100;
  const domainSpacing = options.domainSpacing ?? 380;

  // Resolve graph analysis using custom layer/domain maps if provided
  const analysis = input.analysis || computeArchitectureAnalysis(safeNodes, safeEdges, {
    layerMap: input.layerMap,
    domainMap: input.domainMap,
  });

  // Normalize layer map
  const layerMap = new Map<string, ArchitectureLayer>();
  if (input.layerMap instanceof Map) {
    input.layerMap.forEach((v, k) => layerMap.set(k, v));
  } else if (input.layerMap) {
    Object.entries(input.layerMap).forEach(([k, v]) => layerMap.set(k, v));
  }
  safeNodes.forEach(node => {
    if (!layerMap.has(node.id)) {
      const nodeAnalysis = analysis.nodes.get(node.id);
      layerMap.set(node.id, nodeAnalysis?.layer || classifyNodeLayer(node));
    }
  });

  // Normalize domain map
  const domainMap = new Map<string, string>();
  if (input.domainMap instanceof Map) {
    input.domainMap.forEach((v, k) => domainMap.set(k, v));
  } else if (input.domainMap) {
    Object.entries(input.domainMap).forEach(([k, v]) => domainMap.set(k, v));
  }
  safeNodes.forEach(node => {
    if (!domainMap.has(node.id)) {
      const nodeAnalysis = analysis.nodes.get(node.id);
      domainMap.set(node.id, nodeAnalysis?.domain || classifyNodeDomain(node, safeNodes, safeEdges));
    }
  });

  // Normalize domain regions map
  const domainRegionsMap = new Map<string, DomainRegion>();
  if (input.domainRegions instanceof Map) {
    input.domainRegions.forEach((v, k) => domainRegionsMap.set(k, v));
  } else if (input.domainRegions) {
    Object.entries(input.domainRegions).forEach(([k, v]) => domainRegionsMap.set(k, v));
  }

  // Normalize bucket order map
  const bucketOrderMap = new Map<string, string[]>();
  if (input.bucketOrder instanceof Map) {
    input.bucketOrder.forEach((v, k) => bucketOrderMap.set(k, v));
  } else if (input.bucketOrder) {
    Object.entries(input.bucketOrder).forEach(([k, v]) => bucketOrderMap.set(k, v));
  }

  // Filter primary production nodes ONLY (exclude tests and fields)
  const primaryNodes = safeNodes.filter(node => {
    const nodeAnalysis = analysis.nodes.get(node.id);
    const isTest = nodeAnalysis ? nodeAnalysis.isTest : false;
    const isField = nodeAnalysis ? nodeAnalysis.isField : (node.type === 'Field' || node.type === 'CustomField');
    return !isTest && !isField;
  });

  // Extract all unique domains represented among primary nodes
  const discoveredDomains = new Set<string>();
  primaryNodes.forEach(node => {
    discoveredDomains.add(domainMap.get(node.id) || 'Shared');
  });

  // Order domains deterministically ('Shared' first, then alphabetical or as ordered in domainRegions)
  const sortedDomains = Array.from(discoveredDomains).sort((a, b) => {
    if (a === 'Shared') return -1;
    if (b === 'Shared') return 1;
    if (domainRegionsMap.has(a) && domainRegionsMap.has(b)) {
      return (domainRegionsMap.get(a)?.orderIndex ?? 0) - (domainRegionsMap.get(b)?.orderIndex ?? 0);
    }
    return a.localeCompare(b);
  });

  // Group primary nodes into buckets `${layer}:${domain}`
  const bucketNodesMap = new Map<string, string[]>();
  LAYERS_IN_ORDER.forEach(layer => {
    sortedDomains.forEach(domain => {
      bucketNodesMap.set(`${layer}:${domain}`, []);
    });
  });

  primaryNodes.forEach(node => {
    const layer = layerMap.get(node.id) || 'application';
    const domain = domainMap.get(node.id) || 'Shared';
    const key = `${layer}:${domain}`;
    if (!bucketNodesMap.has(key)) {
      bucketNodesMap.set(key, []);
    }
    bucketNodesMap.get(key)!.push(node.id);
  });

  // Precompute intra-bucket and graph-wide adjacency for relationship-aware local layout
  const primaryNodeSet = new Set(primaryNodes.map(n => n.id));
  const intraBucketAdj = new Map<string, Set<string>>();
  const intraBucketInDegree = new Map<string, number>();
  const intraBucketOutDegree = new Map<string, number>();

  primaryNodes.forEach(n => {
    intraBucketAdj.set(n.id, new Set());
    intraBucketInDegree.set(n.id, 0);
    intraBucketOutDegree.set(n.id, 0);
  });

  safeEdges.forEach(e => {
    if (primaryNodeSet.has(e.source) && primaryNodeSet.has(e.target) && e.source !== e.target) {
      intraBucketAdj.get(e.source)?.add(e.target);
      intraBucketOutDegree.set(e.source, (intraBucketOutDegree.get(e.source) || 0) + 1);
      intraBucketInDegree.set(e.target, (intraBucketInDegree.get(e.target) || 0) + 1);
    }
  });

  const primaryNodePositions: PositionMap = {};
  const bucketLayouts = new Map<string, LocalBucketLayout>();

  // Determine X center for each domain
  const domainXCenterMap = new Map<string, number>();
  sortedDomains.forEach((domain, dIdx) => {
    if (domainRegionsMap.has(domain)) {
      domainXCenterMap.set(domain, domainRegionsMap.get(domain)!.xCenter);
    } else {
      domainXCenterMap.set(domain, baseX + dIdx * domainSpacing + domainSpacing / 2);
    }
  });

  // Lay out each bucket
  LAYERS_IN_ORDER.forEach(layer => {
    sortedDomains.forEach(domain => {
      const bucketKey = `${layer}:${domain}`;
      const unorderedIds = bucketNodesMap.get(bucketKey) || [];
      if (unorderedIds.length === 0) return;

      // Ordering within bucket:
      // Consume Wave 2B ordering if provided in bucketOrderMap
      let orderedNodeIds: string[] = [];
      const wave2bBucket = bucketOrderMap.get(bucketKey);

      if (wave2bBucket && wave2bBucket.length > 0) {
        // Extract primary nodes present in Wave 2B bucket
        const wave2bPrimarySet = new Set<string>();
        wave2bBucket.forEach(id => {
          if (unorderedIds.includes(id)) {
            orderedNodeIds.push(id);
            wave2bPrimarySet.add(id);
          }
        });
        // Append any primary nodes missing from Wave 2B bucket deterministically
        const missing = unorderedIds.filter(id => !wave2bPrimarySet.has(id));
        missing.sort((a, b) => {
          const degA = (analysis.nodes.get(a)?.hubScore || 0);
          const degB = (analysis.nodes.get(b)?.hubScore || 0);
          if (degB !== degA) return degB - degA;
          return a.localeCompare(b);
        });
        orderedNodeIds.push(...missing);
      } else {
        // Fallback: sort by hub score / centrality descending, then nodeId ascending
        orderedNodeIds = [...unorderedIds].sort((a, b) => {
          const nodeA = analysis.nodes.get(a);
          const nodeB = analysis.nodes.get(b);
          const scoreA = nodeA ? nodeA.hubScore : 0;
          const scoreB = nodeB ? nodeB.hubScore : 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.localeCompare(b);
        });
      }

      const domainXCenter = domainXCenterMap.get(domain) ?? (baseX + domainSpacing / 2);
      const layerBaseY = LAYER_Y_BASE[layer];

      // Relationship-Aware Local Tier Assignment
      // Group nodes into local tiers (rows):
      // Tier 0: Upstream nodes (outDegree > inDegree or caller/controller)
      // Tier 1: Intermediate nodes
      // Tier 2: Downstream nodes (inDegree > outDegree or selector/repository)
      const tier0: string[] = [];
      const tier1: string[] = [];
      const tier2: string[] = [];

      if (orderedNodeIds.length <= 2) {
        // Small bucket: single row or direct chain
        if (orderedNodeIds.length === 2) {
          const [n1, n2] = orderedNodeIds;
          const n1ToN2 = intraBucketAdj.get(n1)?.has(n2);
          const n2ToN1 = intraBucketAdj.get(n2)?.has(n1);
          if (n1ToN2 && !n2ToN1) {
            tier0.push(n1);
            tier2.push(n2);
          } else if (n2ToN1 && !n1ToN2) {
            tier0.push(n2);
            tier2.push(n1);
          } else {
            tier1.push(n1, n2);
          }
        } else {
          tier1.push(...orderedNodeIds);
        }
      } else {
        // Classify nodes into tiers based on local flow relationships
        orderedNodeIds.forEach(id => {
          const inDeg = intraBucketInDegree.get(id) || 0;
          const outDeg = intraBucketOutDegree.get(id) || 0;

          if (outDeg > 0 && inDeg === 0) {
            tier0.push(id);
          } else if (inDeg > 0 && outDeg === 0) {
            tier2.push(id);
          } else if (outDeg > inDeg) {
            tier0.push(id);
          } else if (inDeg > outDeg) {
            tier2.push(id);
          } else {
            tier1.push(id);
          }
        });
      }

      // Collect non-empty tiers as rows
      const tiers: string[][] = [];
      if (tier0.length > 0) tiers.push(tier0);
      if (tier1.length > 0) tiers.push(tier1);
      if (tier2.length > 0) tiers.push(tier2);

      // If no tiers formed (fallback), treat as single row
      if (tiers.length === 0) {
        tiers.push(orderedNodeIds);
      }

      // Sub-divide long tiers into rows if tier size exceeds max columns (max 4 per row)
      const MAX_COLS = 4;
      const localRows: string[][] = [];

      tiers.forEach(tNodes => {
        for (let i = 0; i < tNodes.length; i += MAX_COLS) {
          localRows.push(tNodes.slice(i, i + MAX_COLS));
        }
      });

      const totalRows = localRows.length;
      let maxColsInBucket = 1;

      let currentMinX = Infinity;
      let currentMaxX = -Infinity;
      let currentMinY = Infinity;
      let currentMaxY = -Infinity;

      localRows.forEach((rowNodeIds, rowIdx) => {
        if (rowNodeIds.length > maxColsInBucket) {
          maxColsInBucket = rowNodeIds.length;
        }

        const colCount = rowNodeIds.length;
        const rowWidth = colCount * nodeWidth + (colCount - 1) * horizontalGap;
        const rowStartX = domainXCenter - rowWidth / 2 + nodeWidth / 2;
        const rowY = layerBaseY + rowIdx * (nodeHeight + verticalGap);

        rowNodeIds.forEach((nodeId, colIdx) => {
          const x = rowStartX + colIdx * (nodeWidth + horizontalGap);
          const y = rowY;

          primaryNodePositions[nodeId] = { x, y };

          if (x - nodeWidth / 2 < currentMinX) currentMinX = x - nodeWidth / 2;
          if (x + nodeWidth / 2 > currentMaxX) currentMaxX = x + nodeWidth / 2;
          if (y - nodeHeight / 2 < currentMinY) currentMinY = y - nodeHeight / 2;
          if (y + nodeHeight / 2 > currentMaxY) currentMaxY = y + nodeHeight / 2;
        });
      });

      const width = currentMaxX - currentMinX;
      const height = currentMaxY - currentMinY;
      const xCenter = (currentMinX + currentMaxX) / 2;
      const yCenter = (currentMinY + currentMaxY) / 2;

      bucketLayouts.set(bucketKey, {
        bucketKey,
        layer,
        domain,
        nodeIds: orderedNodeIds,
        bounds: {
          xMin: currentMinX,
          xMax: currentMaxX,
          yMin: currentMinY,
          yMax: currentMaxY,
          width,
          height,
          xCenter,
          yCenter,
        },
        rows: totalRows,
        cols: maxColsInBucket,
      });
    });
  });

  // Calculate quality metrics
  let metrics: ComprehensiveLayoutMetrics | null = null;
  if (primaryNodes.length > 0 && Object.keys(primaryNodePositions).length > 0) {
    metrics = calculateLayoutMetrics(primaryNodes, safeEdges, primaryNodePositions, {
      nodeWidth,
      nodeHeight,
    });
  }

  return {
    primaryNodePositions,
    bucketLayouts,
    primaryNodeCount: primaryNodes.length,
    metrics,
  };
}
