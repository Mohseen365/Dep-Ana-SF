const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const { adaptComponentOrbit } = require('../explorer/src/lib/adapters/component-orbit-adapter');
const { computeComponentOrbitLayout } = require('../explorer/src/lib/layout/component-orbit-layout');

async function runComponentOrbitBrowserAudit() {
  console.log('=== COMPONENT ORBIT BROWSER GEOMETRY & ADVERSARIAL AUDIT ===');

  const fixtureDir = path.join(__dirname, '../audit-fixtures');
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }

  const screenshotDir = path.join(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const pbimDataPath = path.join(__dirname, '../explorer/public/projects/pbim/explorer-data.json');
  if (!fs.existsSync(pbimDataPath)) {
    console.error(`FATAL: PBIM dataset missing at ${pbimDataPath}`);
    process.exit(1);
  }

  const pbimData = JSON.parse(fs.readFileSync(pbimDataPath, 'utf8'));

  const scenarios = [
    { focalLwcId: 'LWC:asset-dashboard-container', name: 'asset-dashboard-container' },
    { focalLwcId: 'LWC:citizen-report-portal', name: 'citizen-report-portal' },
    { focalLwcId: 'LWC:vendor-workspace', name: 'vendor-workspace' },
    { focalLwcId: 'LWC:error-panel', name: 'error-panel' },
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
  const results = {
    scenarios: {},
    determinism: {},
    contaminationAudit: {},
  };

  for (const scenario of scenarios) {
    console.log(`\n------------------------------------------------------`);
    console.log(`AUDITING SCENARIO: ${scenario.name} (${scenario.focalLwcId})`);
    console.log(`------------------------------------------------------`);

    // 1. Model Space Computation using pure adapter + geometry engine
    const projection = adaptComponentOrbit(pbimData, { focalLwcId: scenario.focalLwcId, maxDepth: 7 });
    const layout = computeComponentOrbitLayout(projection);

    const modelNodeCount = projection.summary.totalReachableNodes;
    const modelEdgeCount = projection.summary.totalEdges;
    const modelMaxDepth = projection.summary.maxDepth;
    const modelRings = projection.summary.ringCount;
    const modelChildLwcs = projection.summary.childLwcCount;
    const modelSharedHubs = projection.summary.sharedHubCount;

    console.log(`[MODEL] Reachable Nodes: ${modelNodeCount} | Edges: ${modelEdgeCount} | Max Depth: ${modelMaxDepth} | Rings: ${modelRings}`);

    // 2. Browser Space Verification
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', (msg) => {
      console.log(`[PAGE LOG ${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      console.error(`[PAGE UNCAUGHT ERROR] ${err.message}`);
    });

    await page.goto(`http://localhost:3000/?project=pbim`);
    await page.waitForLoadState('networkidle');

    // Wait for Cytoscape instance
    await page.waitForFunction(() => window.__CY__ !== null && window.__CY__ !== undefined, { timeout: 10000 }).catch(e => {
      console.warn('window.__CY__ check timed out, inspecting DOM state...');
    });

    const pageState = await page.evaluate(() => {
      return {
        hasCy: !!window.__CY__,
        bodyText: document.body.innerText,
        title: document.title,
      };
    });

    console.log(`[PAGE STATE] hasCy: ${pageState.hasCy} | Title: "${pageState.title}"`);
    if (!pageState.hasCy) {
      console.log(`[PAGE BODY SNIPPET] ${pageState.bodyText.substring(0, 300)}`);
    }

    const scenarioResult = {
      focalLwcId: scenario.focalLwcId,
      name: scenario.name,
      modelSummary: {
        modelNodeCount,
        modelEdgeCount,
        modelMaxDepth,
        modelRings,
        modelChildLwcs,
        modelSharedHubs,
        modelCollisionCount: layout.diagnostics.collisionCount,
      },
    };

    if (pageState.hasCy) {
      const cyMetrics = await page.evaluate(({ proj, lay, zoomLevels }) => {
        const cy = window.__CY__;
        const projectedNodeIds = Object.keys(proj.nodes);
        const projectedEdges = proj.edges;

        cy.batch(() => {
          cy.elements().remove();
          projectedNodeIds.forEach(id => {
            const nodeData = proj.nodes[id];
            const pos = lay.positions[id] || { x: 0, y: 0 };
            cy.add({
              group: 'nodes',
              data: {
                id: nodeData.nodeId,
                label: nodeData.displayName,
                type: nodeData.type,
                risk: nodeData.risk,
              },
              position: { x: pos.x, y: pos.y },
            });
          });

          projectedEdges.forEach(e => {
            cy.add({
              group: 'edges',
              data: {
                id: e.edgeId,
                source: e.source,
                target: e.target,
                relationshipType: e.relationshipType,
              },
            });
          });
        });

        const totalRenderedNodes = cy.nodes().length;
        const totalRenderedEdges = cy.edges().length;

        const zooms = {};
        for (const zoomVal of zoomLevels) {
          cy.zoom(zoomVal);
          cy.center();

          const nodesList = cy.nodes().map((node) => ({
            id: node.id(),
            rbb: node.renderedBoundingBox(),
          }));

          let collisions = 0;
          for (let i = 0; i < nodesList.length; i++) {
            for (let j = i + 1; j < nodesList.length; j++) {
              const a = nodesList[i].rbb;
              const b = nodesList[j].rbb;
              if (a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1) {
                collisions++;
              }
            }
          }

          zooms[zoomVal] = {
            zoom: zoomVal,
            renderedNodes: nodesList.length,
            collisions,
          };
        }

        return {
          totalRenderedNodes,
          totalRenderedEdges,
          zooms,
        };
      }, { proj: projection, lay: layout, zoomLevels });

      scenarioResult.browserMetrics = cyMetrics;

      // Viewport matrix
      const viewportResults = {};
      for (const vp of viewports) {
        await page.setViewportSize(vp);
        await page.waitForTimeout(100);

        const vpMetrics = await page.evaluate(() => {
          const cy = window.__CY__;
          if (!cy) return null;

          const nodesList = cy.nodes().map((node) => ({
            id: node.id(),
            rbb: node.renderedBoundingBox(),
          }));

          let collisions = 0;
          let clipped = 0;
          const vpWidth = window.innerWidth;
          const vpHeight = window.innerHeight;

          nodesList.forEach((n) => {
            if (n.rbb.x2 < 0 || n.rbb.x1 > vpWidth || n.rbb.y2 < 0 || n.rbb.y1 > vpHeight) {
              clipped++;
            }
          });

          for (let i = 0; i < nodesList.length; i++) {
            for (let j = i + 1; j < nodesList.length; j++) {
              const a = nodesList[i].rbb;
              const b = nodesList[j].rbb;
              if (a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1) {
                collisions++;
              }
            }
          }

          return {
            viewport: `${vpWidth}x${vpHeight}`,
            nodeCount: nodesList.length,
            collisions,
            clipped,
          };
        });

        viewportResults[vp.name] = vpMetrics;
      }
      scenarioResult.viewports = viewportResults;
    }

    scenarioResult.consoleErrorsCount = consoleErrors.length;

    // Capture screenshot
    const screenshotPath = path.join(screenshotDir, `component_orbit_${scenario.name}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);

    results.scenarios[scenario.name] = scenarioResult;
    await context.close();
  }

  await browser.close();

  const jsonOut = path.join(fixtureDir, 'component-orbit-browser-results.json');
  fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));
  console.log(`\nComponent Orbit Browser Audit complete. Results saved to ${jsonOut}`);
}

runComponentOrbitBrowserAudit().catch((err) => {
  console.error('FATAL Component Orbit Browser Audit Failure:', err);
  process.exit(1);
});
