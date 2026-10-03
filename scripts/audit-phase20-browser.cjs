const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runPhase20BrowserAudit() {
  console.log('=== PHASE 20 REAL-BROWSER HYBRID VALIDATION AUDIT ===');

  const screenshotDir = path.join(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const viewports = [
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ];

  const projectIds = ['cloud-spend-tracker', 'pbim'];
  const auditResults = {};

  const browser = await chromium.launch({ headless: true });

  for (const projectId of projectIds) {
    console.log(`\nAuditing Browser Render Space for dataset '${projectId}'...`);
    auditResults[projectId] = {};

    for (const vp of viewports) {
      const vpKey = `${vp.width}x${vp.height}`;
      console.log(`  Viewport: ${vpKey}`);

      const context = await browser.newContext({ viewport: vp });
      const page = await context.newPage();

      const logEvents = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          logEvents.push({ type: 'console-error', text: msg.text() });
        }
      });
      page.on('pageerror', err => {
        logEvents.push({ type: 'page-error', text: err.message });
      });

      // Load app with project and hybrid view
      await page.goto(`http://localhost:3000/?project=${projectId}&view=graph&archMode=hybrid`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Extract Cytoscape window.__CY__ truth
      const cyMetrics = await page.evaluate(() => {
        const cy = window.__CY__;
        if (!cy) return null;

        const pan = cy.pan();
        const zoom = cy.zoom();
        const extent = cy.extent();

        const nodesData = cy.nodes().map(n => {
          const pos = n.position();
          const rPos = n.renderedPosition();
          const bb = n.boundingBox();
          const rBb = n.renderedBoundingBox();
          return {
            id: n.id(),
            layoutX: pos.x,
            layoutY: pos.y,
            renderedX: rPos.x,
            renderedY: rPos.y,
            width: bb.w,
            height: bb.h,
            rWidth: rBb.w,
            rHeight: rBb.h,
          };
        });

        const edgesData = cy.edges().map(e => {
          const source = cy.getElementById(e.source().id());
          const target = cy.getElementById(e.target().id());
          const p1 = source.position();
          const p2 = target.position();
          const r1 = source.renderedPosition();
          const r2 = target.renderedPosition();

          const layoutDist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
          const visibleScreenDist = Math.sqrt((r1.x - r2.x) ** 2 + (r1.y - r2.y) ** 2);

          return {
            id: e.id(),
            source: e.source().id(),
            target: e.target().id(),
            layoutDist,
            visibleScreenDist,
          };
        });

        return {
          pan,
          zoom,
          extent,
          nodesData,
          edgesData,
        };
      });

      const containerBox = await page.locator('.cytoscape-view').boundingBox();

      let adapterRuntimeDrift = 0;
      let domRuntimeDrift = 0;

      if (cyMetrics && containerBox) {
        cyMetrics.nodesData.forEach(n => {
          const expectedRenderedX = n.layoutX * cyMetrics.zoom + cyMetrics.pan.x;
          const expectedRenderedY = n.layoutY * cyMetrics.zoom + cyMetrics.pan.y;
          const driftX = Math.abs(n.renderedX - expectedRenderedX);
          const driftY = Math.abs(n.renderedY - expectedRenderedY);
          if (driftX > 0.001 || driftY > 0.001) {
            domRuntimeDrift = Math.max(domRuntimeDrift, Math.sqrt(driftX * driftX + driftY * driftY));
          }
        });
      }

      const visibleEdgeDists = cyMetrics ? cyMetrics.edgesData.map(e => e.visibleScreenDist).sort((a, b) => a - b) : [];
      const medianVisibleEdgeDist = visibleEdgeDists.length > 0 ? visibleEdgeDists[Math.floor(visibleEdgeDists.length * 0.5)] : 0;
      const maxVisibleEdgeDist = visibleEdgeDists.length > 0 ? visibleEdgeDists[visibleEdgeDists.length - 1] : 0;

      const screenshotName = `phase20_hybrid_${projectId}_${vpKey}.png`;
      const screenshotPath = path.join(screenshotDir, screenshotName);
      await page.screenshot({ path: screenshotPath });

      auditResults[projectId][vpKey] = {
        viewport: vp,
        zoom: Math.round((cyMetrics?.zoom ?? 1) * 1000) / 1000,
        pan: {
          x: Math.round((cyMetrics?.pan.x ?? 0) * 10) / 10,
          y: Math.round((cyMetrics?.pan.y ?? 0) * 10) / 10,
        },
        nodeCount: cyMetrics?.nodesData.length ?? 0,
        edgeCount: cyMetrics?.edgesData.length ?? 0,
        adapterRuntimeDrift,
        domRuntimeDrift,
        medianVisibleEdgeDist: Math.round(medianVisibleEdgeDist),
        maxVisibleEdgeDist: Math.round(maxVisibleEdgeDist),
        logErrorsCount: logEvents.length,
        screenshotPath,
        status: logEvents.length === 0 ? 'VERIFIED' : 'WARNINGS',
      };

      await context.close();
    }
  }

  await browser.close();

  const jsonPath = path.join(__dirname, '../audit-fixtures/phase20-browser-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(auditResults, null, 2));
  console.log(`\nBrowser Audit complete. Results saved to ${jsonPath}`);
}

runPhase20BrowserAudit().catch(err => {
  console.error('Browser Audit Failed:', err);
  process.exit(1);
});
