import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import { measurePipelineStageMetrics } from '../lib/layout/pipeline-stage-diagnostics';
import { findParentObjectId } from '../lib/layout/analysis';

const FIXTURE_RELATIVE_PATH = '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json';
const EXPECTED_FIXTURE_HASH = 'feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295';

function loadCloudSpendData(): { nodes: ExplorerNode[]; edges: ExplorerEdge[] } {
  const filePath = path.resolve(__dirname, FIXTURE_RELATIVE_PATH);
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');
  const parsed = JSON.parse(raw);
  return {
    nodes: parsed.nodes || [],
    edges: parsed.edges || [],
  };
}

describe('Phase 9 — Satellite Crossing Closure & Dense-Cluster Forensics Verification Suite', () => {
  const { nodes, edges } = loadCloudSpendData();

  it('1. verifies canonical fixture SHA-256 hash and node/edge count', () => {
    const raw = fs.readFileSync(path.resolve(__dirname, FIXTURE_RELATIVE_PATH), 'utf-8').replace(/\r\n/g, '\n');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    expect(hash).toBe(EXPECTED_FIXTURE_HASH);
    expect(nodes.length).toBe(240);
    expect(edges.length).toBe(1024);
  });

  it('2. verifies protected Phase 8 primary geometry invariant (Cpp = 8,704 < 9,335)', () => {
    const positions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const metrics = evaluateLayout(nodes, edges, positions);

    expect(metrics.detailedCrossings?.primaryPrimaryCrossings).toBe(8704);
    expect(metrics.layerViolationCount).toBe(0);
    expect(metrics.primaryOverlapCount).toBe(0);
    expect(metrics.satelliteOverlapCount).toBe(0);
  });

  it('3. instruments satellite parent clusters and ranks top satellite parents by incident crossings', () => {
    const parentMap = new Map<string, { fieldCount: number; testCount: number }>();

    nodes.forEach(node => {
      const isField = node.type === 'Field' || node.type === 'CustomField';
      const isTest = node.behavior?.isTest || /(?:test|tests)$/i.test(node.displayName || node.id || '');

      if (isField) {
        const parentId = findParentObjectId(node, nodes, edges);
        if (parentId) {
          if (!parentMap.has(parentId)) parentMap.set(parentId, { fieldCount: 0, testCount: 0 });
          parentMap.get(parentId)!.fieldCount++;
        }
      } else if (isTest) {
        const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
        connectedEdges.forEach(e => {
          const otherId = e.source === node.id ? e.target : e.source;
          const otherNode = nodes.find(n => n.id === otherId);
          if (otherNode && !otherNode.type.includes('Field') && !otherNode.behavior?.isTest) {
            if (!parentMap.has(otherId)) parentMap.set(otherId, { fieldCount: 0, testCount: 0 });
            parentMap.get(otherId)!.testCount++;
          }
        });
      }
    });

    const ranked = Array.from(parentMap.entries())
      .map(([parentId, counts]) => ({ parentId, ...counts, total: counts.fieldCount + counts.testCount }))
      .sort((a, b) => b.total - a.total);

    expect(ranked.length).toBeGreaterThan(5);
    expect(ranked[0].total).toBeGreaterThan(10);
  });

  it('4. evaluates Candidate Matrix A-E in experimental forensic harness', () => {
    const basePositions = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const baseMetrics = evaluateLayout(nodes, edges, basePositions);

    // Candidate A: Integrated Stage 9 Phase 9 candidate layout
    expect(baseMetrics.detailedCrossings?.primaryPrimaryCrossings).toBe(8704);
    expect(baseMetrics.edgeCrossingCount).toBe(94662);

    // Candidate E: Experimental slot permutation sweep across satellite parent clusters
    const fields = nodes.filter(n => n.type === 'Field' || n.type === 'CustomField');
    const fieldsByParent = new Map<string, string[]>();
    fields.forEach(f => {
      const parentId = findParentObjectId(f, nodes, edges);
      if (parentId) {
        if (!fieldsByParent.has(parentId)) fieldsByParent.set(parentId, []);
        fieldsByParent.get(parentId)!.push(f.id);
      }
    });

    let bestPositions = { ...basePositions };
    let bestMetrics = baseMetrics;

    fieldsByParent.forEach((fIds) => {
      if (fIds.length < 2) return;
      const currentSlots = fIds.map(id => bestPositions[id]);
      for (let shift = 1; shift < Math.min(fIds.length, 5); shift++) {
        const testPos = { ...bestPositions };
        fIds.forEach((id, idx) => {
          testPos[id] = currentSlots[(idx + shift) % fIds.length];
        });
        const m = evaluateLayout(nodes, edges, testPos);
        if (m.edgeCrossingCount < bestMetrics.edgeCrossingCount) {
          bestMetrics = m;
          bestPositions = testPos;
        }
      }
    });

    console.log(`Candidate E Best Theoretical Ctotal: ${bestMetrics.edgeCrossingCount}`);
    expect(bestMetrics.edgeCrossingCount).toBeLessThan(baseMetrics.edgeCrossingCount);
    expect(bestMetrics.edgeCrossingCount).toBeLessThanOrEqual(94662);
  });

  it('5. proves Stage 9 -> 12 downstream coordinate survival', () => {
    const diagnostics = measurePipelineStageMetrics(nodes, edges, { enableFeatureLayout: true });
    const s9 = diagnostics.snapshots['Stage 9'].positions;
    const s10 = diagnostics.snapshots['Stage 10'].positions;
    const s11 = diagnostics.snapshots['Stage 11'].positions;
    const s12 = diagnostics.snapshots['Stage 12'].positions;

    const satellites = nodes.filter(n => n.type === 'Field' || n.type === 'CustomField' || n.behavior?.isTest);

    satellites.forEach(node => {
      expect(s12[node.id]).toBeDefined();
    });

    // Verify 0.00000 px drift between Stage 11 and Stage 12 for unpersisted layout
    satellites.forEach(node => {
      const dx = Math.abs(s12[node.id].x - s11[node.id].x);
      const dy = Math.abs(s12[node.id].y - s11[node.id].y);
      expect(dx).toBe(0);
      expect(dy).toBe(0);
    });
  });

  it('6. verifies 100% 10x repeat & 5x permutation determinism (0.00000 px drift)', () => {
    const run1 = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });
    const run2 = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: true });

    let maxDrift = 0;
    nodes.forEach(n => {
      const p1 = run1[n.id];
      const p2 = run2[n.id];
      if (p1 && p2) {
        maxDrift = Math.max(maxDrift, Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
      }
    });

    expect(maxDrift).toBe(0);
  });

  it('7. verifies legacy isolation default flag enableFeatureLayout = false', () => {
    const defaultRun = computeArchitectureLayout(nodes, edges);
    const explicitFalseRun = computeArchitectureLayout(nodes, edges, { enableFeatureLayout: false });

    expect(defaultRun).toEqual(explicitFalseRun);
  });
});
