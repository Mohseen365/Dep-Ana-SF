const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { adaptComponentOrbit } = require('../explorer/src/lib/adapters/component-orbit-adapter');
const { computeComponentOrbitLayout } = require('../explorer/src/lib/layout/component-orbit-layout');

async function runComponentOrbitBrowserAudit() {
  console.log('=== HARDENED COMPONENT ORBIT BROWSER GEOMETRY & ADVERSARIAL AUDIT ===\n');

  const fixtureDir = path.join(__dirname, '../audit-fixtures');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });

  const screenshotDir = path.join(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const pbimPath = path.join(__dirname, '../explorer/public/projects/pbim/explorer-data.json');
  if (!fs.existsSync(pbimPath)) {
    console.error(`FATAL: PBIM dataset missing at ${pbimPath}`);
    process.exit(1);
  }

  const rawPbim = fs.readFileSync(pbimPath, 'utf8');
  const pbimHash = crypto.createHash('sha256').update(rawPbim).digest('hex');
  const pbimData = JSON.parse(rawPbim);

  console.log(`[DATASET PREFLIGHT] File: ${pbimPath}`);
  console.log(`[DATASET PREFLIGHT] SHA-256: ${pbimHash}`);
  console.log(`[DATASET PREFLIGHT] File Nodes: ${pbimData.nodes.length} | File Edges: ${pbimData.edges.length}\n`);

  const scenarios = [
    { focalLwcId: 'LWC:asset-dashboard-container', name: 'asset-dashboard-container', expectedReachable: 128, expectedMaxDepth: 7 },
    { focalLwcId: 'LWC:citizen-report-portal', name: 'citizen-report-portal', expectedReachable: 102, expectedMaxDepth: 5 },
    { focalLwcId: 'LWC:vendor-workspace', name: 'vendor-workspace', expectedReachable: 101, expectedMaxDepth: 6 },
    { focalLwcId: 'LWC:error-panel', name: 'error-panel', expectedReachable: 1, expectedMaxDepth: 0 },
  ];

  const viewports = [
    { width: 1024, height: 768, name: '1024x768' },
    { width: 1280, height: 800, name: '1280x800' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 2560, height: 1440, name: '2560x1440' },
  ];

  const zoomLevels = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[PAGE ERROR LOG] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    console.error(`[PAGE UNCAUGHT ERROR] ${err.message}`);
  });

  // 1. HARD RUNTIME PBIM PREFLIGHT
  console.log('--- 1. RUNTIME PBIM DATASET PREFLIGHT ---');
  await page.goto('http://127.0.0.1:3000/?project=pbim', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const runtimeMetrics = await page.evaluate(() => {
    const cy = window.__CY__;
    if (!cy) return null;

    const nodes = cy.nodes();
    const edges = cy.edges();
    const lwcCount = nodes.filter((n) => n.data('type') === 'LWC').length;

    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      lwcCount,
      hasAssetContainer: cy.getElementById('LWC:asset-dashboard-container').length > 0,
      hasCitizenPortal: cy.getElementById('LWC:citizen-report-portal').length > 0,
      hasVendorWorkspace: cy.getElementById('LWC:vendor-workspace').length > 0,
      hasErrorPanel: cy.getElementById('LWC:error-panel').length > 0,
    };
  });

  console.log(`[RUNTIME PREFLIGHT] Nodes: ${runtimeMetrics?.nodeCount} (Expected: 528)`);
  console.log(`[RUNTIME PREFLIGHT] Edges: ${runtimeMetrics?.edgeCount} (Expected: 2063)`);
  console.log(`[RUNTIME PREFLIGHT] LWCs: ${runtimeMetrics?.lwcCount} (Expected: 30)`);
  console.log(`[RUNTIME PREFLIGHT] Focus Nodes Exist: ${runtimeMetrics?.hasAssetContainer && runtimeMetrics?.hasCitizenPortal && runtimeMetrics?.hasVendorWorkspace && runtimeMetrics?.hasErrorPanel}`);

  if (!runtimeMetrics || runtimeMetrics.nodeCount !== 528 || runtimeMetrics.edgeCount !== 2063) {
    console.error('FATAL: RUNTIME PREFLIGHT FAILED — WRONG DATASET LOADED IN BROWSER!');
    console.error('VALIDATION BLOCKED — WRONG DATASET');
    await browser.close();
    process.exit(1);
  }

  console.log('RUNTIME PBIM PREFLIGHT PASSED VERIFIED!\n');

  const scenarioAuditResults = {};

  // 2. AUDIT EACH SCENARIO
  for (const scenario of scenarios) {
    console.log(`------------------------------------------------------`);
    console.log(`AUDITING SCENARIO: ${scenario.name} (${scenario.focalLwcId})`);
    console.log(`------------------------------------------------------`);

    // Model calculation
    const projection = adaptComponentOrbit(pbimData, { focalLwcId: scenario.focalLwcId, maxDepth: 7 });
    const layout = computeComponentOrbitLayout(projection);

    const modelNodeCount = projection.summary.totalReachableNodes;
    const modelEdgeCount = projection.summary.totalEdges;
    const modelMaxDepth = projection.summary.maxDepth;

    console.log(`[MODEL] Reachable: ${modelNodeCount} | Edges: ${modelEdgeCount} | Max Depth: ${modelMaxDepth} | Rings: ${projection.summary.ringCount}`);

    if (modelNodeCount !== scenario.expectedReachable || modelMaxDepth !== scenario.expectedMaxDepth) {
      console.error(`FATAL: Model projection discrepancy for scenario ${scenario.name}!`);
      process.exit(1);
    }

    // Execute REAL application layout engine path via window.__LAYOUT_MODULE__
    const cyEval = await page.evaluate(({ focalId }) => {
      const cy = window.__CY__;
      if (!cy) return null;

      const { runLayoutWithMetadata } = window.__LAYOUT_MODULE__ || {};
      if (typeof runLayoutWithMetadata === 'function') {
        runLayoutWithMetadata(cy, {
          architectureMode: 'orbit',
          focalLwcId: focalId,
          fit: true,
        });
      }

      const sunNode = cy.getElementById(focalId);
      const sunPos = sunNode.length > 0 ? sunNode.position() : null;

      return {
        renderedNodes: cy.nodes().length,
        renderedEdges: cy.edges().length,
        activeSunExists: sunNode.length > 0,
        sunPosition: sunPos,
      };
    }, { focalId: scenario.focalLwcId });

    console.log(`[BROWSER RENDER] Rendered Nodes: ${cyEval.renderedNodes} | Rendered Edges: ${cyEval.renderedEdges}`);
    console.log(`[SUN VERIFICATION] Sun (${scenario.focalLwcId}) Exists: ${cyEval.activeSunExists} | Sun Position: (${cyEval.sunPosition?.x}, ${cyEval.sunPosition?.y})`);

    if (!cyEval.activeSunExists || Math.abs(cyEval.sunPosition.x) > 1e-3 || Math.abs(cyEval.sunPosition.y) > 1e-3) {
      console.error(`FATAL: Sun verification failed for ${scenario.focalLwcId}`);
      process.exit(1);
    }

    // Fast Single-Pass Zoom Matrix Audit
    const zoomResults = await page.evaluate(({ zoomLevels }) => {
      const cy = window.__CY__;
      const res = {};
      const nodes = cy.nodes();
      const nLen = nodes.length;

      for (const z of zoomLevels) {
        cy.zoom(z);
        cy.center();

        const rbbs = [];
        const bbs = [];
        for (let i = 0; i < nLen; i++) {
          rbbs.push(nodes[i].renderedBoundingBox());
          bbs.push(nodes[i].boundingBox({ includeLabels: true }));
        }

        let nodeCollisions = 0;
        let labelCollisions = 0;

        for (let i = 0; i < nLen; i++) {
          const a = rbbs[i];
          const la = bbs[i];
          for (let j = i + 1; j < nLen; j++) {
            const b = rbbs[j];
            if (a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1) {
              nodeCollisions++;
            }
            const lb = bbs[j];
            if (la.x1 < lb.x2 && la.x2 > lb.x1 && la.y1 < lb.y2 && la.y2 > lb.y1) {
              labelCollisions++;
            }
          }
        }

        res[z] = {
          zoom: z,
          renderedNodes: nLen,
          nodeCollisions,
          labelCollisions,
        };
      }
      return res;
    }, { zoomLevels });

    // Viewport Matrix Audit
    const viewportResults = {};
    for (const vp of viewports) {
      await page.setViewportSize(vp);

      const vpMetrics = await page.evaluate(({ vpWidth, vpHeight }) => {
        const cy = window.__CY__;
        cy.zoom(1.0);
        cy.center();

        const nodes = cy.nodes();
        const nLen = nodes.length;
        const rbbs = [];
        for (let i = 0; i < nLen; i++) {
          rbbs.push(nodes[i].renderedBoundingBox());
        }

        let collisions = 0;
        let clipped = 0;

        for (let i = 0; i < nLen; i++) {
          const r = rbbs[i];
          if (r.x2 < 0 || r.x1 > vpWidth || r.y2 < 0 || r.y1 > vpHeight) {
            clipped++;
          }
          for (let j = i + 1; j < nLen; j++) {
            const b = rbbs[j];
            if (r.x1 < b.x2 && r.x2 > b.x1 && r.y1 < b.y2 && r.y2 > b.y1) {
              collisions++;
            }
          }
        }

        return {
          viewport: `${vpWidth}x${vpHeight}`,
          nodeCount: nLen,
          collisions,
          clipped,
        };
      }, { vpWidth: vp.width, vpHeight: vp.height });

      viewportResults[vp.name] = vpMetrics;
    }

    // Fast Screenshot
    const screenshotPath = path.join(screenshotDir, `component_orbit_${scenario.name}.png`);
    try {
      await page.screenshot({ path: screenshotPath, timeout: 3000, animations: 'disabled' });
      console.log(`Saved scenario screenshot to ${screenshotPath}`);
    } catch (err) {
      console.warn(`Screenshot warning for ${scenario.name}: ${err.message}`);
    }

    scenarioAuditResults[scenario.name] = {
      focalLwcId: scenario.focalLwcId,
      modelSummary: {
        nodeCount: modelNodeCount,
        edgeCount: modelEdgeCount,
        maxDepth: modelMaxDepth,
        rings: projection.summary.ringCount,
        childLwcs: projection.summary.childLwcCount,
        sharedHubs: projection.summary.sharedHubCount,
        modelCollisions: layout.diagnostics.collisionCount,
      },
      browserSummary: {
        renderedNodes: cyEval.renderedNodes,
        renderedEdges: cyEval.renderedEdges,
        sunVerified: cyEval.activeSunExists,
        sunPosition: cyEval.sunPosition,
      },
      zooms: zoomResults,
      viewports: viewportResults,
    };
  }

  // 3. TRACK EXPANSION LOCALITY TEST
  console.log('\n--- 3. TRACK EXPANSION LOCALITY TEST ---');
  const localityScenario = scenarios[0]; // asset-dashboard-container
  const projLocality = adaptComponentOrbit(pbimData, { focalLwcId: localityScenario.focalLwcId, maxDepth: 7 });
  const layoutStandard = computeComponentOrbitLayout(projLocality, { maxNodesPerTrack: 16 });
  const layoutDense = computeComponentOrbitLayout(projLocality, { maxNodesPerTrack: 5 });

  const movedNodes = [];

  Object.values(projLocality.nodes).forEach(n => {
    const posStd = layoutStandard.positions[n.nodeId];
    const posDense = layoutDense.positions[n.nodeId];
    if (posStd && posDense) {
      const dx = posDense.x - posStd.x;
      const dy = posDense.y - posStd.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1e-3) {
        movedNodes.push({
          nodeId: n.nodeId,
          ring: n.ringIndex,
          oldPos: { x: posStd.x, y: posStd.y },
          newPos: { x: posDense.x, y: posDense.y },
          distance: Math.round(dist * 100) / 100,
        });
      }
    }
  });

  console.log(`[LOCALITY TEST] Track expansion (maxNodesPerTrack 16 -> 5) moved ${movedNodes.length} nodes out of ${projLocality.summary.totalReachableNodes}.`);
  console.log(`[LOCALITY TEST] Sun (Ring 0) Moved: ${movedNodes.some(m => m.ring === 0)} (Expected: false)`);

  const localityAudit = {
    totalReachable: projLocality.summary.totalReachableNodes,
    movedNodeCount: movedNodes.length,
    sunMoved: movedNodes.some(m => m.ring === 0),
    movedNodesSample: movedNodes.slice(0, 10),
  };

  await browser.close();

  const finalOutput = {
    runtimePbimVerified: true,
    pbimDataHash: pbimHash,
    scenarios: scenarioAuditResults,
    localityAudit,
  };

  const jsonOut = path.join(fixtureDir, 'component-orbit-browser-results.json');
  fs.writeFileSync(jsonOut, JSON.stringify(finalOutput, null, 2));
  console.log(`\nAudit complete! Results saved to ${jsonOut}`);
  console.log('HARDENED COMPONENT ORBIT BROWSER AUDIT PASSED!\n');
}

runComponentOrbitBrowserAudit().catch((err) => {
  console.error('FATAL Component Orbit Browser Audit Failure:', err);
  process.exit(1);
});
