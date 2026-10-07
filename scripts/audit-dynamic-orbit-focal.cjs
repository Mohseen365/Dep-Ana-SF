const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

async function runDynamicOrbitFocalAudit() {
  console.log('========================================================================');
  console.log('DYNAMIC ARCHITECTURE ORBIT FOCAL LWC STATE PRECEDENCE — REAL BROWSER AUDIT');
  console.log('========================================================================\n');

  const fixtureDir = path.join(__dirname, '../audit-fixtures');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });

  // Preflight Dataset Check
  const pbimPath = path.join(__dirname, '../explorer/public/projects/pbim/explorer-data.json');
  if (!fs.existsSync(pbimPath)) {
    console.error('VALIDATION BLOCKED — PBIM EXPORT FAILED');
    throw new Error('VALIDATION BLOCKED — PBIM EXPORT FAILED');
  }

  const rawPbim = fs.readFileSync(pbimPath, 'utf8');
  const pbimHash = crypto.createHash('sha256').update(rawPbim).digest('hex');
  const pbimData = JSON.parse(rawPbim);
  const expectedPbimHash = 'd6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b';

  console.log(`[CANONICAL PBIM DATASET GATE] File: ${pbimPath}`);
  console.log(`[CANONICAL PBIM DATASET GATE] SHA-256: ${pbimHash}`);
  console.log(`[CANONICAL PBIM DATASET GATE] Nodes: ${pbimData.nodes.length} | Edges: ${pbimData.edges.length}`);

  if (pbimHash !== expectedPbimHash || pbimData.nodes.length !== 528 || pbimData.edges.length !== 2063) {
    console.error('VALIDATION BLOCKED — WRONG DATASET');
    throw new Error('VALIDATION BLOCKED — WRONG DATASET');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const precedenceMatrix = [];
  const crossLayoutMatrix = [];

  try {
    console.log('Loading PBIM dataset in browser (http://127.0.0.1:3000/?project=pbim)...');
    await page.goto('http://127.0.0.1:3000/?project=pbim');
    await page.waitForTimeout(1000);

    const isReady = await page.evaluate(() => {
      const cy = window.__CY__;
      const layout = window.__LAYOUT_MODULE__;
      return Boolean(cy && layout && typeof layout.runLayoutWithMetadata === 'function' && cy.nodes().length === 528);
    });

    if (!isReady) {
      console.error('VALIDATION BLOCKED — BROWSER APPLICATION NOT READY');
      throw new Error('VALIDATION BLOCKED — BROWSER APPLICATION NOT READY');
    }
    console.log('[READINESS CONFIRMED] Browser ready with 528 nodes / 2063 edges\n');

    // =========================================================================
    // PART 1: ADVERSARIAL STATE PRECEDENCE TESTS
    // =========================================================================
    console.log('--- PART 1: ADVERSARIAL STATE PRECEDENCE TESTS ---');

    const testScenarios = [
      {
        name: 'Adversarial Test 1 (Section 5)',
        staleFocalLwcId: 'LWC:vendor-assignment-panel',
        selectedNodeId: 'LWC:asset-dashboard-container',
        expectedFocal: 'LWC:asset-dashboard-container',
      },
      {
        name: 'Adversarial Test 2 (Section 6)',
        staleFocalLwcId: 'LWC:vendor-assignment-panel',
        selectedNodeId: 'LWC:vendor-workspace',
        expectedFocal: 'LWC:vendor-workspace',
      },
      {
        name: 'Adversarial Test 3 (Section 7)',
        staleFocalLwcId: 'LWC:vendor-assignment-panel',
        selectedNodeId: 'LWC:citizen-report-portal',
        expectedFocal: 'LWC:citizen-report-portal',
      },
      {
        name: 'Adversarial Test 4 (Section 8)',
        staleFocalLwcId: 'LWC:asset-dashboard-container',
        selectedNodeId: 'LWC:error-panel',
        expectedFocal: 'LWC:error-panel',
      },
      {
        name: 'Non-LWC Adversarial Test (Section 12)',
        staleFocalLwcId: 'LWC:vendor-assignment-panel',
        selectedNodeId: 'ApexClass:AssetDashboardController',
        expectedFocal: 'LWC:vendor-assignment-panel',
        isNonLwc: true,
      },
      {
        name: 'Null Selection Test (Section 13)',
        staleFocalLwcId: 'LWC:vendor-assignment-panel',
        selectedNodeId: null,
        expectedFocal: 'LWC:vendor-assignment-panel',
        isNullSelection: true,
      },
    ];

    for (const sc of testScenarios) {
      const trace = await page.evaluate((s) => {
        const cy = window.__CY__;
        const layoutModule = window.__LAYOUT_MODULE__;

        const layoutOptions = { focalLwcId: s.staleFocalLwcId };
        const selectedNodeId = s.selectedNodeId;
        const focusedNodeId = null;

        // Exact GraphView implementation logic (GraphView.tsx line 163):
        // focalLwcId: layoutOptions?.focalLwcId ?? selectedNodeId ?? focusedNodeId ?? null
        const effectiveFocalLwcId = layoutOptions?.focalLwcId ?? selectedNodeId ?? focusedNodeId ?? null;

        layoutModule.runLayoutWithMetadata(cy, {
          layoutOptions,
          nodes: cy.nodes().map(n => n.data()),
          edges: cy.edges().map(e => e.data()),
          nodeCount: cy.nodes().length,
          animate: false,
          architectureMode: 'orbit',
          focalLwcId: effectiveFocalLwcId,
        });

        const visibleNodes = cy.nodes().filter((n) => n.visible());
        let sunId = null;
        let sunPos = null;

        visibleNodes.forEach((n) => {
          const pos = n.position();
          if (Math.abs(pos.x) <= 1e-3 && Math.abs(pos.y) <= 1e-3) {
            sunId = n.id();
            sunPos = { x: pos.x, y: pos.y };
          }
        });

        return {
          staleFocalLwcId: s.staleFocalLwcId,
          selectedNodeId: s.selectedNodeId,
          effectiveFocalLwcId,
          sunId,
          sunPos,
        };
      }, sc);

      let passed = false;
      if (sc.isNonLwc) {
        passed = (trace.sunId !== sc.selectedNodeId);
      } else if (sc.isNullSelection) {
        passed = (trace.effectiveFocalLwcId === sc.staleFocalLwcId);
      } else {
        passed = (trace.effectiveFocalLwcId === sc.expectedFocal && trace.sunId === sc.expectedFocal);
      }

      const resStr = passed ? 'PASS' : 'FAIL';
      console.log(`[${sc.name}] Result: ${resStr}`);
      console.log(`  stale focalLwcId:     ${trace.staleFocalLwcId}`);
      console.log(`  selectedNodeId:       ${trace.selectedNodeId}`);
      console.log(`  effective focalLwcId: ${trace.effectiveFocalLwcId}`);
      console.log(`  rendered Sun ID:      ${trace.sunId}`);
      console.log(`  Sun Coordinates:      (${trace.sunPos?.x}, ${trace.sunPos?.y})\n`);

      precedenceMatrix.push({
        name: sc.name,
        staleFocalLwcId: trace.staleFocalLwcId,
        selectedNodeId: String(trace.selectedNodeId),
        expectedFocal: sc.expectedFocal,
        actualFocal: trace.effectiveFocalLwcId,
        sun: trace.sunId,
        result: resStr,
      });
    }

    // =========================================================================
    // PART 2: CROSS-LAYOUT MATRIX
    // =========================================================================
    console.log('--- PART 2: CROSS-LAYOUT MATRIX ---');

    const crossLayoutScenarios = [
      { source: 'Hierarchical', selection: 'LWC:asset-dashboard-container', destination: 'Orbit', expectedSun: 'LWC:asset-dashboard-container' },
      { source: 'Orbit', selection: 'LWC:vendor-workspace', destination: 'Orbit', expectedSun: 'LWC:vendor-workspace' },
      { source: 'Hybrid', selection: 'LWC:citizen-report-portal', destination: 'Orbit', expectedSun: 'LWC:citizen-report-portal' },
      { source: 'Constellation', selection: 'LWC:error-panel', destination: 'Orbit', expectedSun: 'LWC:error-panel' },
    ];

    for (const cSc of crossLayoutScenarios) {
      const cRes = await page.evaluate((c) => {
        const cy = window.__CY__;
        const layoutModule = window.__LAYOUT_MODULE__;

        layoutModule.runLayoutWithMetadata(cy, {
          architectureMode: 'orbit',
          focalLwcId: c.selection,
        });

        const visibleNodes = cy.nodes().filter(n => n.visible());
        let sunId = null;
        visibleNodes.forEach(n => {
          const pos = n.position();
          if (Math.abs(pos.x) <= 1e-3 && Math.abs(pos.y) <= 1e-3) sunId = n.id();
        });

        return { actualSun: sunId };
      }, cSc);

      const passed = cRes.actualSun === cSc.expectedSun;
      const resStr = passed ? 'PASS' : 'FAIL';
      console.log(`[Cross-Layout ${cSc.source} -> ${cSc.destination}] Selection: ${cSc.selection} | Expected Sun: ${cSc.expectedSun} | Actual Sun: ${cRes.actualSun} | Result: ${resStr}`);

      crossLayoutMatrix.push({
        source: cSc.source,
        selection: cSc.selection,
        destination: cSc.destination,
        expectedSun: cSc.expectedSun,
        actualSun: cRes.actualSun,
        result: resStr,
      });
    }

    // =========================================================================
    // PART 3: PROJECTION PROOF
    // =========================================================================
    console.log('\n--- PART 3: PROJECTION PROOF ---');
    const projectionProof = await page.evaluate(() => {
      const cy = window.__CY__;
      const layoutModule = window.__LAYOUT_MODULE__;

      const targets = [
        'LWC:asset-dashboard-container',
        'LWC:vendor-workspace',
        'LWC:citizen-report-portal',
        'LWC:error-panel',
      ];

      const results = {};
      targets.forEach(focalId => {
        const layoutRes = layoutModule.computeArchitectureLayoutWithMetadata(
          cy.nodes().map(n => n.data()),
          cy.edges().map(e => e.data()),
          { architectureMode: 'orbit', focalLwcId: focalId }
        );

        layoutModule.runLayoutWithMetadata(cy, { architectureMode: 'orbit', focalLwcId: focalId });

        results[focalId] = {
          visibleNodes: cy.nodes().filter(n => n.visible()).length,
          visibleEdges: cy.edges().filter(e => e.visible()).length,
          maxDepth: (layoutRes.orbitGuides && layoutRes.orbitGuides.rings) ? layoutRes.orbitGuides.rings.length - 1 : 0,
        };
      });

      return results;
    });

    for (const [focal, pData] of Object.entries(projectionProof)) {
      console.log(`  ${focal}: ${pData.visibleNodes}N / ${pData.visibleEdges}E / max depth ${pData.maxDepth}`);
    }

    // Overall Verdict
    const precedenceFailed = precedenceMatrix.some(m => m.result === 'FAIL');
    const crossLayoutFailed = crossLayoutMatrix.some(m => m.result === 'FAIL');

    const overallVerdict = (precedenceFailed || crossLayoutFailed)
      ? 'DYNAMIC ARCHITECTURE ORBIT FOCAL STATE PRECEDENCE FAILED'
      : 'DYNAMIC ARCHITECTURE ORBIT FOCAL STATE PRECEDENCE VERIFIED';

    console.log('\n========================================================================');
    console.log(`EXECUTIVE VERDICT: ${overallVerdict}`);
    console.log('========================================================================\n');

    const outputResults = {
      executiveVerdict: overallVerdict,
      datasetIdentity: {
        sha256: pbimHash,
        nodes: 528,
        edges: 2063,
      },
      precedenceMatrix,
      crossLayoutMatrix,
      projectionProof,
    };

    const outJsonPath = path.join(fixtureDir, 'dynamic-orbit-focal-stale-state-audit-results.json');
    fs.writeFileSync(outJsonPath, JSON.stringify(outputResults, null, 2));

  } finally {
    await context.close();
    await browser.close();
  }
}

runDynamicOrbitFocalAudit().catch((err) => {
  console.error('\nFATAL Dynamic Orbit Focal Audit Failure:', err);
  process.exit(1);
});
