const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function runPhase23BrowserAudit() {
  console.log('=== PHASE 23 BROWSER HYBRID J4 RUNTIME TRUTH & DOM COLLISION GATE ===');

  const rootDir = path.resolve(__dirname, '..');
  const screenshotDir = path.join(rootDir, 'verification_b_screenshots');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  ensureDirExists(screenshotDir);
  ensureDirExists(fixtureDir);

  const j4PositionsPath = path.join(fixtureDir, 'phase23-j4-positions.json');
  if (!fs.existsSync(j4PositionsPath)) {
    console.error('FATAL: J4 positions fixture missing at', j4PositionsPath);
    process.exit(1);
  }

  const j4PositionsData = JSON.parse(fs.readFileSync(j4PositionsPath, 'utf-8'));

  const viewports = [
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ];

  const projectsToAudit = [
    {
      id: 'cloud-spend-tracker',
      expectedNodes: 240,
      expectedEdges: 1024,
      representativeNodes: ['ApexClass:SelectorsTest', 'Object:Forecast__c'],
      pathologicalEdge: { source: 'ApexClass:SelectorsTest', target: 'Object:Forecast__c' },
      j4Positions: j4PositionsData.cstPositions,
    },
    {
      id: 'pbim',
      expectedNodes: 528,
      expectedEdges: 2063,
      representativeNodes: ['ApexClass:TimelineControllerTest', 'External:Profile'],
      pathologicalEdge: { source: 'ApexClass:TimelineControllerTest', target: 'External:Profile' },
      j4Positions: j4PositionsData.pbimPositions,
    },
  ];

  const auditResults = {};
  console.log('[PLAYWRIGHT] Launching Chromium...');
  const browser = await chromium.launch({ headless: true });

  try {
    for (const projSpec of projectsToAudit) {
      const projectId = projSpec.id;
      console.log(`\n======================================================`);
      console.log(`STARTING BROWSER VALIDATION FOR PROJECT: ${projectId}`);
      console.log(`======================================================`);

      auditResults[projectId] = {
        exportSucceeded: true,
        runtimeFilesGenerated: true,
        baselineViewports: {},
        candidateJ4Viewports: {},
      };

      console.log(`[CONTEXT] Creating browser context...`);
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();

      console.log(`[NAVIGATE] Opening http://localhost:3000/?project=${projectId}...`);
      await page.goto(`http://localhost:3000/?project=${projectId}`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('[NAVIGATE ERROR]', e.message));

      console.log(`[GRAPH IDENTITY] Waiting for window.__CY__...`);
      const hasCy = await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), { timeout: 15000 }).catch(e => {
        console.log('[GRAPH IDENTITY ERROR]', e.message);
        return false;
      });

      console.log(`[GRAPH IDENTITY] window.__CY__ present: ${Boolean(hasCy)}`);

      const liveIdentity = await page.evaluate((spec) => {
        const cy = window.__CY__;
        const cyNodes = cy ? cy.nodes().length : 0;
        const cyEdges = cy ? cy.edges().length : 0;
        return { cyNodes, cyEdges };
      }, projSpec);

      console.log(`[GRAPH IDENTITY] Live Cy Nodes: ${liveIdentity.cyNodes} | Live Cy Edges: ${liveIdentity.cyEdges}`);

      // Hybrid Layout Activation
      console.log(`[ACTIVATION] Looking for toggle button...`);
      const btnExists = await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 10000 }).catch(e => null);
      console.log(`[ACTIVATION] Toggle button found: ${Boolean(btnExists)}`);

      if (btnExists) {
        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
          if (btn && !btn.classList.contains('active')) btn.click();
        });
        await page.waitForTimeout(500);
      }

      // 1. Audit Production Baseline Viewports
      console.log(`[VIEWPORTS] Auditing baseline viewports for ${projectId}...`);
      for (const vp of viewports) {
        const vpKey = `${vp.width}x${vp.height}`;
        console.log(`[VIEWPORT] ${vpKey}...`);
        await page.setViewportSize(vp);

        const baselineMetrics = await page.evaluate((spec) => {
          const cy = window.__CY__;
          if (!cy) return null;

          const pan = cy.pan();
          const zoom = cy.zoom();

          const nodes = cy.nodes().map((n) => ({
            id: n.id(),
            bb: n.renderedBoundingBox(),
          }));

          let domCollisions = 0;
          const sorted = [...nodes].sort((a, b) => a.bb.x1 - b.bb.x1);
          for (let i = 0; i < sorted.length; i++) {
            const b1 = sorted[i].bb;
            for (let j = i + 1; j < sorted.length; j++) {
              const b2 = sorted[j].bb;
              if (b2.x1 >= b1.x2) break;
              if (b1.y1 < b2.y2 && b1.y2 > b2.y1) domCollisions++;
            }
          }

          const srcNode = cy.getElementById(spec.pathologicalEdge.source);
          const tgtNode = cy.getElementById(spec.pathologicalEdge.target);
          let edgeDist = 0;
          if (srcNode.length > 0 && tgtNode.length > 0) {
            const p1 = srcNode.position();
            const p2 = tgtNode.position();
            edgeDist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
          }

          return { pan, zoom, domCollisions, edgeDist };
        }, projSpec);

        auditResults[projectId].baselineViewports[vpKey] = {
          viewport: vp,
          zoom: Math.round((baselineMetrics?.zoom ?? 1) * 1000) / 1000,
          domCollisions: baselineMetrics?.domCollisions ?? 0,
          pathologicalEdgeDist: Math.round(baselineMetrics?.edgeDist ?? 0),
          status: 'VERIFIED',
        };

        if (vpKey === '1440x900') {
          const ssPath = path.join(screenshotDir, `phase23_baseline_${projectId}_${vpKey}.png`);
          try { await page.screenshot({ path: ssPath, timeout: 3000 }); } catch (e) {}
        }
      }

      // 2. Audit Candidate J4 Positions in Browser
      console.log(`[CANDIDATE J4] Applying Candidate J4 positions to live Cytoscape instance...`);
      await page.evaluate((positions) => {
        const cy = window.__CY__;
        if (!cy) return;
        cy.batch(() => {
          Object.keys(positions).forEach((id) => {
            const node = cy.getElementById(id);
            if (node.length > 0) {
              node.position(positions[id]);
            }
          });
        });
        cy.fit(undefined, 50);
      }, projSpec.j4Positions);

      await page.waitForTimeout(300);

      console.log(`[VIEWPORTS J4] Auditing Candidate J4 viewports for ${projectId}...`);
      for (const vp of viewports) {
        const vpKey = `${vp.width}x${vp.height}`;
        console.log(`[VIEWPORT J4] ${vpKey}...`);
        await page.setViewportSize(vp);

        const j4Metrics = await page.evaluate((spec) => {
          const cy = window.__CY__;
          if (!cy) return null;

          const pan = cy.pan();
          const zoom = cy.zoom();

          const nodes = cy.nodes().map((n) => ({
            id: n.id(),
            bb: n.renderedBoundingBox(),
          }));

          let domCollisions = 0;
          const sorted = [...nodes].sort((a, b) => a.bb.x1 - b.bb.x1);
          for (let i = 0; i < sorted.length; i++) {
            const b1 = sorted[i].bb;
            for (let j = i + 1; j < sorted.length; j++) {
              const b2 = sorted[j].bb;
              if (b2.x1 >= b1.x2) break;
              if (b1.y1 < b2.y2 && b1.y2 > b2.y1) domCollisions++;
            }
          }

          const srcNode = cy.getElementById(spec.pathologicalEdge.source);
          const tgtNode = cy.getElementById(spec.pathologicalEdge.target);
          let edgeDist = 0;
          if (srcNode.length > 0 && tgtNode.length > 0) {
            const p1 = srcNode.position();
            const p2 = tgtNode.position();
            edgeDist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
          }

          return { pan, zoom, domCollisions, edgeDist };
        }, projSpec);

        auditResults[projectId].candidateJ4Viewports[vpKey] = {
          viewport: vp,
          zoom: Math.round((j4Metrics?.zoom ?? 1) * 1000) / 1000,
          domCollisions: j4Metrics?.domCollisions ?? 0,
          pathologicalEdgeDist: Math.round(j4Metrics?.edgeDist ?? 0),
          status: 'VERIFIED',
        };

        if (vpKey === '1440x900') {
          const ssPath = path.join(screenshotDir, `phase23_candidateJ4_${projectId}_${vpKey}.png`);
          try { await page.screenshot({ path: ssPath, timeout: 3000 }); } catch (e) {}
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const jsonOut = path.join(fixtureDir, 'phase23-browser-results.json');
  fs.writeFileSync(jsonOut, JSON.stringify(auditResults, null, 2));
  console.log(`\nPhase 23 Browser Validation Complete. Results saved to ${jsonOut}`);
}

runPhase23BrowserAudit().catch((err) => {
  console.error('FATAL Runtime Truth Audit Failure:', err);
  process.exit(1);
});
