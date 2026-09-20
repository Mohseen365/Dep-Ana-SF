import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorerNode, ExplorerEdge } from '../../types/explorer';
import {
  findParentObjectId,
  findParentProductionNodeId,
  isTestNode,
  isFieldNode,
} from './analysis';
import { classifyNodeLayerWithReason } from './layers';
import { discoverDomains } from './domains';
import { computeArchitectureLayout } from '../architecture-layout';
import {
  calculateDetailedEdgeCrossings,
} from './metrics';

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);

function loadCloudSpendFixture(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const data = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  return { nodes: data.nodes || [], edges: data.edges || [] };
}

describe('Wave 10E Forensic Acceptance Metrics Capture', () => {
  it('Captures complete Phase 20 Acceptance Metrics for Cloud Spend Tracker', () => {
    const { nodes, edges } = loadCloudSpendFixture();

    const t0 = performance.now();
    const positions = computeArchitectureLayout(nodes, edges);
    const t1 = performance.now();

    const safeNodes = [...nodes];
    const safeEdges = [...edges];
    safeNodes.sort((a, b) => a.id.localeCompare(b.id));
    safeEdges.sort((a, b) => a.id.localeCompare(b.id));

    const layerMap = new Map<string, any>();
    safeNodes.forEach(node => layerMap.set(node.id, classifyNodeLayerWithReason(node).layer));
    const domainDiscovery = discoverDomains(safeNodes, safeEdges);
    const domainMap = new Map<string, string>();
    domainDiscovery.assignments.forEach((assignment, nodeId) =>
      domainMap.set(nodeId, assignment.primaryDomain)
    );

    const nodeWidth = 120;
    const nodeHeight = 60;

    function getBbox(filterFn?: (n: ExplorerNode) => boolean) {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      let count = 0;
      safeNodes.forEach(node => {
        const p = positions[node.id];
        if (p && (!filterFn || filterFn(node))) {
          count++;
          minX = Math.min(minX, p.x - nodeWidth / 2);
          maxX = Math.max(maxX, p.x + nodeWidth / 2);
          minY = Math.min(minY, p.y - nodeHeight / 2);
          maxY = Math.max(maxY, p.y + nodeHeight / 2);
        }
      });
      return { count, width: maxX - minX, height: maxY - minY, minX, maxX, minY, maxY };
    }

    const isPrimary = (n: ExplorerNode) => !isTestNode(n) && !isFieldNode(n);
    const isSecondary = (n: ExplorerNode) => !isPrimary(n);

    const fullBbox = getBbox();
    const primaryBbox = getBbox(isPrimary);
    const secondaryBbox = getBbox(isSecondary);

    const edgeLengths: number[] = [];
    safeEdges.forEach(e => {
      const p1 = positions[e.source];
      const p2 = positions[e.target];
      if (p1 && p2) {
        edgeLengths.push(Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2));
      }
    });
    edgeLengths.sort((a, b) => a - b);
    const getP = (p: number) => edgeLengths[Math.floor(edgeLengths.length * p)] || 0;

    const crossings = calculateDetailedEdgeCrossings(safeNodes, safeEdges, positions);

    // Satellites anchor distances & unanchored check
    const satDistances: number[] = [];
    let unanchoredCount = 0;

    safeNodes.forEach(node => {
      if (!isPrimary(node)) {
        let anchorId: string | null = null;
        if (isFieldNode(node)) {
          anchorId = (node as any).parentObjectId || findParentObjectId(node, safeNodes, safeEdges);
        } else {
          anchorId =
            (node as any).parentProductionNodeId ||
            findParentProductionNodeId(node, safeNodes, safeEdges);
        }
        const satPos = positions[node.id];
        const anchorPos = anchorId ? positions[anchorId] : null;

        if (satPos && anchorPos) {
          satDistances.push(
            Math.sqrt((satPos.x - anchorPos.x) ** 2 + (satPos.y - anchorPos.y) ** 2)
          );
        } else {
          unanchoredCount++;
        }
      }
    });
    satDistances.sort((a, b) => a - b);
    const getSatP = (p: number) => satDistances[Math.floor(satDistances.length * p)] || 0;

    // Determinism test
    const posRun1 = computeArchitectureLayout(nodes, edges);
    const posRun2 = computeArchitectureLayout(nodes, edges);
    let repeatDelta = 0;
    safeNodes.forEach(n => {
      if (posRun1[n.id] && posRun2[n.id]) {
        repeatDelta = Math.max(
          repeatDelta,
          Math.sqrt((posRun1[n.id].x - posRun2[n.id].x) ** 2 + (posRun1[n.id].y - posRun2[n.id].y) ** 2)
        );
      }
    });

    const reportData = {
      geometry: {
        finalWidth: fullBbox.width,
        finalHeight: fullBbox.height,
        aspectRatio: (fullBbox.width / fullBbox.height).toFixed(2),
        primaryOnlyWidth: primaryBbox.width,
        primaryOnlyHeight: primaryBbox.height,
        secondaryExpandedWidth: secondaryBbox.width,
        secondaryExpandedHeight: secondaryBbox.height,
        bounds: `[${fullBbox.minX}, ${fullBbox.maxX}]`,
      },
      edges: {
        median: getP(0.5).toFixed(1),
        P75: getP(0.75).toFixed(1),
        P90: getP(0.90).toFixed(1),
        P95: getP(0.95).toFixed(1),
        P99: getP(0.99).toFixed(1),
        max: edgeLengths[edgeLengths.length - 1].toFixed(1),
      },
      crossings,
      satellites: {
        unanchoredCount,
        medianAnchorDist: getSatP(0.5).toFixed(1),
        P90: getSatP(0.90).toFixed(1),
        P95: getSatP(0.95).toFixed(1),
        P99: getSatP(0.99).toFixed(1),
        max: satDistances[satDistances.length - 1].toFixed(1),
      },
      determinism: {
        repeatDelta: repeatDelta.toFixed(5),
      },
      performanceMs: {
        totalCold: (t1 - t0).toFixed(2),
      },
    };

    console.log('\n--- WAVE 10E ACCEPTANCE METRICS ---');
    console.log(JSON.stringify(reportData, null, 2));

    expect(unanchoredCount).toBe(0);
    expect(fullBbox.width).toBeLessThan(9000);
    expect(repeatDelta).toBe(0);
  });
});
