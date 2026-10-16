import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { projectOrbitSemantics, computeOrbitRingIndex } from './orbit-semantics';
import { computeOrbitLayout, checkAABBOverlap, normalizeAngle, calculateRequiredSectorRadius } from './orbit-layout';
import { classifyNodeLayerWithReason, isTestNode } from './layers';
import { classifyFeatureRole } from './feature-roles';

describe('Deep Technical Forensic Script for Orbit Convergence Audit', () => {
  it('generates PBIM node-level golden manifest and detailed metrics', () => {
    const pbimPath = path.resolve(__dirname, '../../../public/projects/pbim/explorer-data.json');
    const raw = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));
    const rawNodes = raw.nodes || [];
    const rawEdges = raw.edges || [];

    // 1. Semantic Projection
    const semResult = projectOrbitSemantics(rawNodes, rawEdges);

    // 2. Geometry Engine with Workstream A input
    const geoResult = computeOrbitLayout({
      nodes: semResult.nodeList,
    });

    // Generate Golden Manifest for PBIM
    const goldenManifest = semResult.nodeList.map((semNode) => {
      const pos = geoResult.positions[semNode.nodeId];
      return {
        nodeId: semNode.nodeId,
        canonicalNodeType: semNode.canonicalNodeType,
        canonicalLayer: semNode.canonicalLayer,
        orbitRingIndex: semNode.orbitRingIndex,
        primaryFeatureId: semNode.primaryFeatureId,
        primaryDomainId: semNode.primaryDomainId,
        orbitSectorId: semNode.orbitSectorId,
        semanticOrderKey: semNode.semanticOrderKey,
        track: pos ? pos.track : -1,
        radius: pos ? pos.radius : -1,
        angle: pos ? pos.angle : -1,
        x: pos ? pos.x : 0,
        y: pos ? pos.y : 0,
      };
    });

    // Write golden manifest JSON
    const manifestPath = path.resolve(__dirname, '../../../../ARCHITECTURE_ORBIT_PBIM_PROJECTION_MANIFEST.json');
    fs.writeFileSync(manifestPath, JSON.stringify(goldenManifest, null, 2), 'utf8');
    console.log(`Wrote PBIM Golden Manifest to ${manifestPath} (${goldenManifest.length} nodes)`);

    // Verify 528 conserved
    expect(goldenManifest.length).toBe(528);

    // 3. PBIM 65 Sectors Detail
    const sectorSet = new Set<string>();
    semResult.nodeList.forEach((n) => sectorSet.add(n.orbitSectorId));
    const sortedSectorIds = Array.from(sectorSet).sort();

    console.log(`\n=== PBIM 65 SECTORS AUDIT (${sortedSectorIds.length} sectors) ===`);

    // Re-run sector angle calculation to inspect angular spans
    const totalNodesCount = semResult.nodeList.length;
    const totalCircleRad = 2 * Math.PI;
    const sectorMargin = 0.05;
    const numSectors = sortedSectorIds.length;
    const minSectorSpan = Math.max(2 * sectorMargin + 0.05, totalCircleRad / (numSectors * 4));

    const sectorSpans = new Map<string, number>();
    sortedSectorIds.forEach((secId) => {
      const pop = semResult.sectorCounts[secId] || 1;
      const proportion = pop / totalNodesCount;
      const span = Math.max(minSectorSpan, proportion * totalCircleRad);
      sectorSpans.set(secId, span);
    });

    let sumSpans = 0;
    sectorSpans.forEach((s) => (sumSpans += s));
    let currentAngle = 0;

    const sectorDetails: Array<any> = [];

    sortedSectorIds.forEach((secId) => {
      const rawSpan = sectorSpans.get(secId)!;
      const normalizedSpan = (rawSpan / sumSpans) * totalCircleRad;
      const startAngle = currentAngle;
      const endAngle = currentAngle + normalizedSpan;
      const usableAngle = Math.max(0.001, normalizedSpan - 2 * sectorMargin);

      // Collect nodes in this sector
      const secNodes = semResult.nodeList.filter((n) => n.orbitSectorId === secId);
      const secPositions = secNodes.map((n) => geoResult.positions[n.nodeId]);

      let maxTrackInSec = 0;
      let minRadInSec = Infinity;
      let maxRadInSec = 0;

      secPositions.forEach((p) => {
        if (p) {
          if (p.track > maxTrackInSec) maxTrackInSec = p.track;
          if (p.radius < minRadInSec) minRadInSec = p.radius;
          if (p.radius > maxRadInSec) maxRadInSec = p.radius;
        }
      });

      if (minRadInSec === Infinity) minRadInSec = 0;

      sectorDetails.push({
        sectorId: secId,
        nodeCount: secNodes.length,
        angularSpanRad: Math.round(normalizedSpan * 10000) / 10000,
        usableAngularSpanRad: Math.round(usableAngle * 10000) / 10000,
        trackCount: maxTrackInSec + 1,
        minimumRadiusPx: minRadInSec,
        maximumRadiusPx: maxRadInSec,
      });

      currentAngle = endAngle;
    });

    console.log(`Analyzed ${sectorDetails.length} sectors for PBIM.`);

    // Dump first 5 and last 5 sectors
    console.log('Sample sectors:', sectorDetails.slice(0, 3));
  });
});
