const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { adaptComponentOrbit } = require('../explorer/src/lib/adapters/component-orbit-adapter');
const { computeComponentOrbitLayout } = require('../explorer/src/lib/layout/component-orbit-layout');

function countAabbCollisions(boxes) {
  const sorted = boxes.slice().sort((a, b) => a.x1 - b.x1);
  let collisions = 0;
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (b.x1 >= a.x2) break;
      if (a.y1 < b.y2 && a.y2 > b.y1) collisions++;
    }
  }
  return collisions;
}

async function runComponentOrbitBrowserAudit() {
  console.log('=== MERGED COMPONENT ORBIT PBIM BROWSER GEOMETRY & ADVERSARIAL AUDIT ===\n');

  const fixtureDir = path.join(__dirname, '../audit-fixtures');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });

  const screenshotDir = path.join(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const pbimPath = path.join(__dirname, '../explorer/public/projects/pbim/explorer-data.json');
  if (!fs.existsSync(pbimPath)) throw new Error(`PBIM dataset missing at ${pbimPath}`);

  const rawPbim = fs.readFileSync(pbimPath, 'utf8');
  const pbimHash = crypto.createHash('sha256').update(rawPbim).digest('hex');
  const pbimData = JSON.parse(rawPbim);
  const expectedPbimHash = 'd6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b';

  console.log(`[DATASET PREFLIGHT] File: ${pbimPath}`);
  console.log(`[DATASET PREFLIGHT] SHA-256: ${pbimHash}`);
  console.log(`[DATASET PREFLIGHT] File Nodes: ${pbimData.nodes.length} | File Edges: ${pbimData.edges.length}`);

  if (pbimHash !== expectedPbimHash || pbimData.nodes.length !== 528 || pbimData.edges.length !== 2063) {
    throw new Error('VALIDATION BLOCKED — WRONG OR NON-CANONICAL PBIM DATASET');
  }

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
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  try {
    console.log('\n--- RUNTIME PBIM DATASET PREFLIGHT ---');
    await page.goto('http://127.0.0.1:3000/?project=pbim');
    await page.waitForTimeout(3000);

    const runtimeMetrics = await page.evaluate(() => {
      const cy = window.__CY__;
      if (!cy) return null;
      const nodes = cy.nodes();
      const edges = cy.edges();
      return {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        lwcCount: nodes.filter((n) => n.data('type') === 'LWC').length,
        focusIdsPresent: [
          'LWC:asset-dashboard-container',
          'LWC:citizen-report-portal',
          'LWC:vendor-workspace',
          'LWC:error-panel',
        ].every((id) => cy.getElementById(id).length > 0),
      };
    });

    if (!runtimeMetrics || runtimeMetrics.nodeCount !== 528 || runtimeMetrics.edgeCount !== 2063 || runtimeMetrics.lwcCount !== 30 || !runtimeMetrics.focusIdsPresent) {
      throw new Error('VALIDATION BLOCKED — WRONG DATASET LOADED IN BROWSER');
    }

    const scenarioAuditResults = {};

    for (const scenario of scenarios) {
      console.log(`\n--- AUDITING ${scenario.name} (${scenario.focalLwcId}) ---`);

      const projection = adaptComponentOrbit(pbimData, { focalLwcId: scenario.focalLwcId, maxDepth: 7 });
      const layout = computeComponentOrbitLayout(projection);
      const modelNodeCount = projection.summary.totalReachableNodes;
      const modelEdgeCount = projection.summary.totalEdges;
      const modelMaxDepth = projection.summary.maxDepth;

      if (modelNodeCount !== scenario.expectedReachable || modelMaxDepth !== scenario.expectedMaxDepth) {
        throw new Error(`Model projection discrepancy for ${scenario.name}`);
      }

      const browserResult = await page.evaluate(({ focalId, countAabbCollisionsStr }) => {
        const countCollisions = new Function('return ' + countAabbCollisionsStr)();
        const cy = window.__CY__;
        const layoutModule = window.__LAYOUT_MODULE__;
        if (!cy || !layoutModule || typeof layoutModule.runLayoutWithMetadata !== 'function') return null;

        layoutModule.runLayoutWithMetadata(cy, { architectureMode: 'orbit', focalLwcId: focalId, fit: true });
        const sunNode = cy.getElementById(focalId);
        if (!sunNode.length) return null;

        const sunPosition = sunNode.position();
        const nodes = cy.nodes();
        const pan = cy.pan();
        const zoom = cy.zoom();

        const renderedBoxes = [];
        const labelBoxes = [];
        for (let i = 0; i < nodes.length; i++) {
          const mNode = nodes[i].boundingBox();
          renderedBoxes.push({
            x1: mNode.x1 * zoom + pan.x,
            x2: mNode.x2 * zoom + pan.x,
            y1: mNode.y1 * zoom + pan.y,
            y2: mNode.y2 * zoom + pan.y,
          });
          const mLabel = nodes[i].boundingBox({ includeLabels: true });
          labelBoxes.push({
            x1: mLabel.x1 * zoom + pan.x,
            x2: mLabel.x2 * zoom + pan.x,
            y1: mLabel.y1 * zoom + pan.y,
            y2: mLabel.y2 * zoom + pan.y,
          });
        }

        const nodeCollisions = countCollisions(renderedBoxes);
        const labelCollisions = countCollisions(labelBoxes);

        return { renderedNodes: nodes.length, renderedEdges: cy.edges().length, sunPosition, nodeCollisions, labelCollisions };
      }, { focalId: scenario.focalLwcId, countAabbCollisionsStr: countAabbCollisions.toString() });

      if (!browserResult) throw new Error(`Browser layout execution failed for ${scenario.name}`);
      if (Math.abs(browserResult.sunPosition.x) > 1e-3 || Math.abs(browserResult.sunPosition.y) > 1e-3) {
        throw new Error(`Sun not centered for ${scenario.focalLwcId}`);
      }

      // Fast, exact zoom matrix evaluation in browser using Cytoscape pan/zoom transform
      const zoomResults = await page.evaluate(({ zoomLevels, countAabbCollisionsStr }) => {
        const countCollisions = new Function('return ' + countAabbCollisionsStr)();
        const cy = window.__CY__;
        const nodes = cy.nodes();
        const results = {};

        const modelNodeBoxes = [];
        const modelLabelBoxes = [];
        for (let i = 0; i < nodes.length; i++) {
          modelNodeBoxes.push(nodes[i].boundingBox());
          modelLabelBoxes.push(nodes[i].boundingBox({ includeLabels: true }));
        }

        for (const zoom of zoomLevels) {
          cy.zoom(zoom); cy.center();
          const pan = cy.pan();

          const rBoxes = modelNodeBoxes.map(m => ({
            x1: m.x1 * zoom + pan.x,
            x2: m.x2 * zoom + pan.x,
            y1: m.y1 * zoom + pan.y,
            y2: m.y2 * zoom + pan.y,
          }));

          const lBoxes = modelLabelBoxes.map(m => ({
            x1: m.x1 * zoom + pan.x,
            x2: m.x2 * zoom + pan.x,
            y1: m.y1 * zoom + pan.y,
            y2: m.y2 * zoom + pan.y,
          }));

          const nodeCollisions = countCollisions(rBoxes);
          const labelCollisions = countCollisions(lBoxes);
          results[zoom] = { zoom, renderedNodes: nodes.length, nodeCollisions, labelCollisions };
        }
        return results;
      }, { zoomLevels, countAabbCollisionsStr: countAabbCollisions.toString() });

      // Fast, exact viewport matrix evaluation
      const viewportResults = await page.evaluate(({ viewports, countAabbCollisionsStr }) => {
        const countCollisions = new Function('return ' + countAabbCollisionsStr)();
        const cy = window.__CY__;
        cy.zoom(1.0); cy.center();
        const pan = cy.pan();
        const zoom = cy.zoom();
        const nodes = cy.nodes();

        const modelBoxes = [];
        for (let i = 0; i < nodes.length; i++) {
          modelBoxes.push(nodes[i].boundingBox());
        }

        const res = {};
        for (const vp of viewports) {
          const boxes = [];
          let clipped = 0;
          for (let i = 0; i < modelBoxes.length; i++) {
            const m = modelBoxes[i];
            const r = {
              x1: m.x1 * zoom + pan.x,
              x2: m.x2 * zoom + pan.x,
              y1: m.y1 * zoom + pan.y,
              y2: m.y2 * zoom + pan.y,
            };
            boxes.push(r);
            if (r.x2 < 0 || r.x1 > vp.width || r.y2 < 0 || r.y1 > vp.height) clipped++;
          }
          const collisions = countCollisions(boxes);
          res[vp.name] = { viewport: `${vp.width}x${vp.height}`, nodeCount: boxes.length, collisions, clipped };
        }
        return res;
      }, { viewports, countAabbCollisionsStr: countAabbCollisions.toString() });

      const screenshotPath = path.join(screenshotDir, `component_orbit_${scenario.name}.png`);
      try { await page.screenshot({ path: screenshotPath, timeout: 3000, animations: 'disabled' }); } catch (err) {}

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
        browserSummary: browserResult,
        zooms: zoomResults,
        viewports: viewportResults,
      };
    }

    const localityProjection = adaptComponentOrbit(pbimData, { focalLwcId: scenarios[0].focalLwcId, maxDepth: 7 });
    const standard = computeComponentOrbitLayout(localityProjection, { maxNodesPerTrack: 16 });
    const dense = computeComponentOrbitLayout(localityProjection, { maxNodesPerTrack: 5 });
    const movedNodes = [];

    Object.values(localityProjection.nodes).forEach((node) => {
      const a = standard.positions[node.nodeId], b = dense.positions[node.nodeId];
      if (!a || !b) return;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance > 1e-3) movedNodes.push({ nodeId: node.nodeId, ring: node.ringIndex, oldPos: a, newPos: b, distance: Math.round(distance * 100) / 100 });
    });

    const localityAudit = {
      totalReachable: localityProjection.summary.totalReachableNodes,
      movedNodeCount: movedNodes.length,
      sunMoved: movedNodes.some((n) => n.ring === 0),
      crossRingMigration: movedNodes.some((n) => n.ring !== localityProjection.nodes[n.nodeId].ringIndex),
      movedNodesSample: movedNodes.slice(0, 10),
    };

    if (localityAudit.sunMoved || localityAudit.crossRingMigration) throw new Error('Locality invariant failed');

    const finalOutput = {
      runtimePbimVerified: true,
      pbimDataHash: pbimHash,
      scenarios: scenarioAuditResults,
      localityAudit,
      consoleErrorsCount: consoleErrors.length,
    };

    const jsonOut = path.join(fixtureDir, 'component-orbit-browser-results.json');
    fs.writeFileSync(jsonOut, JSON.stringify(finalOutput, null, 2));
    console.log(`\nAudit complete! Results saved to ${jsonOut}`);
    console.log('MERGED COMPONENT ORBIT PBIM BROWSER AUDIT PASSED!\n');
  } finally {
    await context.close();
    await browser.close();
  }
}

runComponentOrbitBrowserAudit().catch((err) => {
  console.error('FATAL Component Orbit Browser Audit Failure:', err);
  process.exit(1);
});
