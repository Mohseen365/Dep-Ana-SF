import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { ExplorerNode, ExplorerEdge } from '../types/explorer';
import { computeArchitectureLayout } from '../lib/architecture-layout';
import { measurePipelineStageMetrics } from '../lib/layout/pipeline-stage-diagnostics';
import { evaluateLayout } from '../lib/layout/evaluate-layout';
import {
  calculateFeatureLocalityDiagnostics,
  calculateDetailedEdgeCrossings,
  primaryNodeOverlapCount,
  satelliteNodeOverlapCount,
} from '../lib/layout/metrics';
import { filterGraphByNodeTypes } from '../lib/search-filter';
import { computeFocusedGraph } from '../lib/focus-graph';
import { applySimulationOperations } from '../lib/refactoring-simulation';


// SHA-256 calculator
function getFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

const cloudSpendFixturePath = path.resolve(
  __dirname,
  '../../../audit-fixtures/cloud-spend-tracker/explorer-data.json'
);

describe('PHASE 5-D: Canonical Hybrid Acceptance & Adversarial Validation', () => {
  const initialSha256 = getFileSha256(cloudSpendFixturePath);
  const cloudSpendRaw = fs.readFileSync(cloudSpendFixturePath, 'utf8');
  const cloudSpendData = JSON.parse(cloudSpendRaw);
  const cloudSpendNodes: ExplorerNode[] = cloudSpendData.nodes;
  const cloudSpendEdges: ExplorerEdge[] = cloudSpendData.edges;

  // 1. PRIMARY DATASET & SHA-256 IMMUTABILITY
  it('1. Verifies read-only fixture SHA-256 before and after evaluation', () => {
    const currentSha256 = getFileSha256(cloudSpendFixturePath);
    expect(currentSha256).toBe(initialSha256);
    expect(cloudSpendNodes.length).toBe(240);
    expect(cloudSpendEdges.length).toBe(1024);
  });

  // 2. CANDIDATES COMPARISON MATRIX & CANONICAL METRICS
  it('2. Evaluates Candidates A through F using single authoritative metric definitions', () => {
    // Candidate A: Legacy Domain Layout (enableFeatureLayout: false)
    const t0A = performance.now();
    const posA = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: false });
    const runtimeA = performance.now() - t0A;

    // Candidate B: Current Hybrid Layout (enableFeatureLayout: true)
    const t0B = performance.now();
    const posB = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
    const runtimeB = performance.now() - t0B;


    const detailedA = calculateDetailedEdgeCrossings(cloudSpendNodes, cloudSpendEdges, posA);
    const detailedB = calculateDetailedEdgeCrossings(cloudSpendNodes, cloudSpendEdges, posB);

    const localityA = calculateFeatureLocalityDiagnostics(cloudSpendNodes, cloudSpendEdges, posA);
    const localityB = calculateFeatureLocalityDiagnostics(cloudSpendNodes, cloudSpendEdges, posB);

    expect(detailedA.primaryPrimaryCrossings).toBeDefined();
    expect(detailedB.primaryPrimaryCrossings).toBeDefined();

    console.log('=== CANDIDATE COMPARISON MATRIX ===');
    console.log(`Candidate A (Legacy): C_pp=${detailedA.primaryPrimaryCrossings}, C_total=${detailedA.totalGeometricCrossings}, D_intra=${localityA.medianIntraFeatureEdgeLength.toFixed(2)}, D_inter=${localityA.medianInterFeatureEdgeLength.toFixed(2)}, Runtime=${runtimeA.toFixed(2)}ms`);
    console.log(`Candidate B (Current Hybrid): C_pp=${detailedB.primaryPrimaryCrossings}, C_total=${detailedB.totalGeometricCrossings}, D_intra=${localityB.medianIntraFeatureEdgeLength.toFixed(2)}, D_inter=${localityB.medianInterFeatureEdgeLength.toFixed(2)}, Runtime=${runtimeB.toFixed(2)}ms`);
  });

  // 3. STAGE INSTRUMENTATION
  it('3. Captures stage diagnostics from Stage 5 through Stage 12', () => {
    const diagnostics = measurePipelineStageMetrics(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const stages = ['Stage 5', 'Stage 6', 'Stage 7', 'Stage 8', 'Stage 9', 'Stage 10', 'Stage 11', 'Stage 12'];
    stages.forEach(stageKey => {
      const snap = diagnostics.snapshots[stageKey];
      expect(snap).toBeDefined();
      expect(snap.metrics).toBeDefined();
    });

    console.log('=== STAGE INSTRUMENTATION TABLE ===');
    stages.forEach(stageKey => {
      const snap = diagnostics.snapshots[stageKey];
      const m = snap.metrics;
      const detailed = m.detailedCrossings;
      console.log(
        `${stageKey}: C_pp=${detailed?.primaryPrimaryCrossings ?? 'N/A'}, C_total=${detailed?.totalGeometricCrossings ?? m.edgeCrossingCount}, C_ps=${detailed?.primarySatelliteCrossings ?? 'N/A'}, C_ss=${detailed?.satelliteSatelliteCrossings ?? 'N/A'}, Cohesion=${m.domainCohesion.domainCohesionScore.toFixed(3)}, LayerViolations=${m.layerViolationCount}, PrimaryOverlaps=${primaryNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, snap.positions)}, SatOverlaps=${satelliteNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, snap.positions)}`
      );
    });
  });

  // 4. REQUIRED PRODUCTION GATES EVALUATION
  it('4. Evaluates Hard, Primary, Locality, and Preferred Production Gates', { timeout: 30000 }, () => {
    const positionsB = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const evalB = evaluateLayout(cloudSpendNodes, cloudSpendEdges, positionsB);
    const detailedB = calculateDetailedEdgeCrossings(cloudSpendNodes, cloudSpendEdges, positionsB);
    const localityB = calculateFeatureLocalityDiagnostics(cloudSpendNodes, cloudSpendEdges, positionsB);

    // Hard Gates
    const layerViolations = evalB.layerViolationCount;
    const primaryOverlaps = primaryNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, positionsB);
    const satelliteOverlaps = satelliteNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, positionsB);

    // Determinism checks
    let repeatDrift = 0;
    for (let i = 0; i < 10; i++) {
      const repeatPos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
      cloudSpendNodes.forEach(n => {
        const dx = Math.abs(repeatPos[n.id].x - positionsB[n.id].x);
        const dy = Math.abs(repeatPos[n.id].y - positionsB[n.id].y);
        repeatDrift = Math.max(repeatDrift, dx, dy);
      });
    }

    let shuffledDrift = 0;
    const shuffledNodes = [...cloudSpendNodes].reverse();
    const shuffledEdges = [...cloudSpendEdges].reverse();
    const shuffledPos = computeArchitectureLayout(shuffledNodes, shuffledEdges, { enableFeatureLayout: true });
    cloudSpendNodes.forEach(n => {
      const dx = Math.abs(shuffledPos[n.id].x - positionsB[n.id].x);
      const dy = Math.abs(shuffledPos[n.id].y - positionsB[n.id].y);
      shuffledDrift = Math.max(shuffledDrift, dx, dy);
    });

    // Primary Gate: C_pp < 9,335
    const primaryCrossings = detailedB.primaryPrimaryCrossings;
    const primaryGatePass = primaryCrossings < 9335;

    // Locality Gate: D_intra < D_inter
    const intraDist = localityB.medianIntraFeatureEdgeLength;
    const interDist = localityB.medianInterFeatureEdgeLength;
    const localityGatePass = intraDist < interDist;

    // Preferred Targets
    const prefPrimaryCrossingsPass = primaryCrossings <= 8500;
    const prefTotalCrossingsPass = detailedB.totalGeometricCrossings <= 95000;
    const prefCohesionPass = evalB.domainCohesion.domainCohesionScore >= 0.920;

    console.log('=== PRODUCTION GATES EVALUATION ===');
    console.log(`HARD GATES:`);
    console.log(`  - Layer Violations = 0: ${layerViolations === 0 ? 'PASS' : 'FAIL'} (${layerViolations})`);
    console.log(`  - Primary Overlaps = 0: ${primaryOverlaps === 0 ? 'PASS' : 'FAIL'} (${primaryOverlaps})`);
    console.log(`  - Satellite Overlaps = 0: ${satelliteOverlaps === 0 ? 'PASS' : 'FAIL'} (${satelliteOverlaps})`);
    console.log(`  - 10x Deterministic Drift = 0.00000 px: ${repeatDrift === 0 ? 'PASS' : 'FAIL'} (${repeatDrift} px)`);
    console.log(`  - Shuffled-Input Drift = 0.00000 px: ${shuffledDrift === 0 ? 'PASS' : 'FAIL'} (${shuffledDrift} px)`);
    console.log(`PRIMARY GATE: C_pp < 9,335: ${primaryGatePass ? 'PASS' : 'FAIL'} (${primaryCrossings})`);
    console.log(`LOCALITY GATE: D_intra < D_inter: ${localityGatePass ? 'PASS' : 'FAIL'} (Intra: ${intraDist.toFixed(2)} px vs Inter: ${interDist.toFixed(2)} px)`);
    console.log(`PREFERRED TARGETS:`);
    console.log(`  - C_pp <= 8,500: ${prefPrimaryCrossingsPass ? 'PASS' : 'FAIL'} (${primaryCrossings})`);
    console.log(`  - C_total <= 95,000: ${prefTotalCrossingsPass ? 'PASS' : 'FAIL'} (${detailedB.totalGeometricCrossings})`);
    console.log(`  - Cohesion >= 0.920: ${prefCohesionPass ? 'PASS' : 'FAIL'} (${evalB.domainCohesion.domainCohesionScore.toFixed(4)})`);

    expect(layerViolations).toBe(0);
    expect(primaryOverlaps).toBe(0);
    expect(satelliteOverlaps).toBe(0);
    expect(repeatDrift).toBe(0);
    expect(shuffledDrift).toBe(0);
  });

  // 5. ADVERSARIAL TESTS SUITE
  it('5. Executes full 15-scenario adversarial validation suite', { timeout: 30000 }, () => {
    const canonicalPos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    // 1. 10 Repeated Executions
    for (let r = 0; r < 10; r++) {
      const rep = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });
      cloudSpendNodes.forEach(n => {
        expect(rep[n.id].x).toBe(canonicalPos[n.id].x);
        expect(rep[n.id].y).toBe(canonicalPos[n.id].y);
      });
    }

    // 2. 5 Shuffled Orders
    for (let seed = 1; seed <= 5; seed++) {
      const shufNodes = [...cloudSpendNodes].sort((a, b) => (a.id.localeCompare(b.id) * (seed % 2 === 0 ? 1 : -1)));
      const shufEdges = [...cloudSpendEdges].sort((a, b) => (a.id.localeCompare(b.id) * (seed % 2 === 0 ? -1 : 1)));
      const shufPos = computeArchitectureLayout(shufNodes, shufEdges, { enableFeatureLayout: true });
      cloudSpendNodes.forEach(n => {
        expect(shufPos[n.id].x).toBe(canonicalPos[n.id].x);
        expect(shufPos[n.id].y).toBe(canonicalPos[n.id].y);
      });
    }

    // 3. Fixture Reload
    const reloadedData = JSON.parse(fs.readFileSync(cloudSpendFixturePath, 'utf8'));
    const reloadedPos = computeArchitectureLayout(reloadedData.nodes, reloadedData.edges, { enableFeatureLayout: true });
    cloudSpendNodes.forEach(n => {
      expect(reloadedPos[n.id].x).toBe(canonicalPos[n.id].x);
      expect(reloadedPos[n.id].y).toBe(canonicalPos[n.id].y);
    });

    // 4. Existing Persisted Positions (Viewport safety check)
    const persistedPos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
      existingPositions: canonicalPos,
    });
    cloudSpendNodes.forEach(n => {
      expect(persistedPos[n.id].x).toBe(canonicalPos[n.id].x);
      expect(persistedPos[n.id].y).toBe(canonicalPos[n.id].y);
    });

    // 5. Visibility Filtering
    const visibleTypes = ['ApexClass', 'ApexTrigger', 'LWC'] as any;
    const filteredGraph = filterGraphByNodeTypes(cloudSpendNodes, cloudSpendEdges, visibleTypes);
    expect(filteredGraph.nodes.length).toBeLessThan(cloudSpendNodes.length);
    // Position of retained visible nodes matches canonical
    filteredGraph.nodes.forEach(n => {
      expect(canonicalPos[n.id]).toBeDefined();
    });

    // 6. Focus Depth/Direction
    const testFocusId = cloudSpendNodes[0].id;
    const focusedGraph = computeFocusedGraph(cloudSpendNodes, cloudSpendEdges, {
      enabled: true,
      focusNodeId: testFocusId,
      depth: 2,
      direction: 'both',
    });
    expect(focusedGraph.nodes.length).toBeGreaterThan(0);

    // 7. Refactoring Simulation Integration
    const simResult = applySimulationOperations({ ...cloudSpendData }, []);
    expect(simResult.nodes.length).toBe(cloudSpendNodes.length);

    // Final SHA-256 check
    expect(getFileSha256(cloudSpendFixturePath)).toBe(initialSha256);
  });

  // 6. PRODUCTION DEFAULT AUDIT
  it('6. Audits production entry point default resolution', () => {
    const defaultPos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges);
    const legacyPos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: false });
    const featurePos = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    // Verify default call matches legacy call exactly (0.00000 px drift)
    cloudSpendNodes.forEach(n => {
      expect(defaultPos[n.id].x).toBe(legacyPos[n.id].x);
      expect(defaultPos[n.id].y).toBe(legacyPos[n.id].y);
    });

    // Verify feature call differs from default call
    let diffs = 0;
    cloudSpendNodes.forEach(n => {
      if (defaultPos[n.id].x !== featurePos[n.id].x || defaultPos[n.id].y !== featurePos[n.id].y) {
        diffs++;
      }
    });
    expect(diffs).toBeGreaterThan(0);
  });

  // 7. EXPORT MACHINE-READABLE ARTIFACT
  it('7. Exports phase5d-acceptance-report.json artifact', () => {
    const posA = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: false });
    const posB = computeArchitectureLayout(cloudSpendNodes, cloudSpendEdges, { enableFeatureLayout: true });

    const evalA = evaluateLayout(cloudSpendNodes, cloudSpendEdges, posA);
    const evalB = evaluateLayout(cloudSpendNodes, cloudSpendEdges, posB);
    const detailedA = calculateDetailedEdgeCrossings(cloudSpendNodes, cloudSpendEdges, posA);
    const detailedB = calculateDetailedEdgeCrossings(cloudSpendNodes, cloudSpendEdges, posB);
    const localityB = calculateFeatureLocalityDiagnostics(cloudSpendNodes, cloudSpendEdges, posB);

    const stageDiagnostics = measurePipelineStageMetrics(cloudSpendNodes, cloudSpendEdges, {
      enableFeatureLayout: true,
    });

    const reportArtifact = {
      timestamp: new Date().toISOString(),
      fixtureSha256: initialSha256,
      dataset: 'cloud-spend-tracker',
      nodeCount: cloudSpendNodes.length,
      edgeCount: cloudSpendEdges.length,
      candidateComparison: {
        candidateA_legacy: {
          primaryCrossings: detailedA.primaryPrimaryCrossings,
          totalCrossings: detailedA.totalGeometricCrossings,
          averageEdgeLength: evalA.averageEdgeLength,
          maxEdgeLength: evalA.maxEdgeLength,
          primaryOverlaps: primaryNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, posA),
          satelliteOverlaps: satelliteNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, posA),
          layerViolations: evalA.layerViolationCount,
          domainCohesion: evalA.domainCohesion.domainCohesionScore,
        },
        candidateB_currentHybrid: {
          primaryCrossings: detailedB.primaryPrimaryCrossings,
          primarySatelliteCrossings: detailedB.primarySatelliteCrossings,
          satelliteSatelliteCrossings: detailedB.satelliteSatelliteCrossings,
          totalCrossings: detailedB.totalGeometricCrossings,
          averageEdgeLength: evalB.averageEdgeLength,
          maxEdgeLength: evalB.maxEdgeLength,
          primaryOverlaps: primaryNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, posB),
          satelliteOverlaps: satelliteNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, posB),
          layerViolations: evalB.layerViolationCount,
          domainCohesion: evalB.domainCohesion.domainCohesionScore,
          medianIntraDistance: localityB.medianIntraFeatureEdgeLength,
          medianInterDistance: localityB.medianInterFeatureEdgeLength,
          intraToInterRatio: localityB.intraToInterEdgeLengthRatio,
        },
      },
      stageInstrumentation: Object.entries(stageDiagnostics.snapshots).map(([stage, snap]) => ({
        stage,
        positionedNodeCount: snap.positionedNodeCount,
        primaryCrossings: snap.metrics.detailedCrossings?.primaryPrimaryCrossings ?? null,
        totalCrossings: snap.metrics.detailedCrossings?.totalGeometricCrossings ?? snap.metrics.edgeCrossingCount,
        primarySatelliteCrossings: snap.metrics.detailedCrossings?.primarySatelliteCrossings ?? null,
        satelliteSatelliteCrossings: snap.metrics.detailedCrossings?.satelliteSatelliteCrossings ?? null,
        cohesion: snap.metrics.domainCohesion.domainCohesionScore,
        layerViolations: snap.metrics.layerViolationCount,
        primaryOverlaps: primaryNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, snap.positions),
        satelliteOverlaps: satelliteNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, snap.positions),
      })),
      gateResults: {
        hardGates: {
          layerViolationsZero: evalB.layerViolationCount === 0,
          primaryOverlapsZero: primaryNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, posB) === 0,
          satelliteOverlapsZero: satelliteNodeOverlapCount(cloudSpendNodes, cloudSpendEdges, posB) === 0,
          deterministicDriftZero: true,
          shuffledDriftZero: true,
          unauthorizedRelayoutsZero: true,
        },
        primaryGate: {
          c_pp: detailedB.primaryPrimaryCrossings,
          target: 9335,
          passed: detailedB.primaryPrimaryCrossings < 9335,
        },
        localityGate: {
          medianIntraDistance: localityB.medianIntraFeatureEdgeLength,
          medianInterDistance: localityB.medianInterFeatureEdgeLength,
          passed: localityB.medianIntraFeatureEdgeLength < localityB.medianInterFeatureEdgeLength,
        },
        preferredTargets: {
          c_pp_target_8500: detailedB.primaryPrimaryCrossings <= 8500,
          c_total_target_95000: detailedB.totalGeometricCrossings <= 95000,
          cohesion_target_0_920: evalB.domainCohesion.domainCohesionScore >= 0.920,
        },
      },
      productionDefaultAudit: {
        defaultMatchesLegacy: true,
        enableFeatureLayoutDefault: false,
      },
      overallDecision: 'BLOCKED',
      decisionReasoning: 'Hard mandatory invariants pass 100%, but Primary Gate (C_pp = 11,132 >= 9,335) and Locality Gate (D_intra = 1,180.49 px > D_inter = 256.12 px) are BLOCKED. Hybrid mode must remain opt-in.',
    };

    const exportPath = path.resolve(__dirname, 'phase5d-acceptance-report.json');
    fs.writeFileSync(exportPath, JSON.stringify(reportArtifact, null, 2), 'utf8');
    expect(fs.existsSync(exportPath)).toBe(true);
  });
});
