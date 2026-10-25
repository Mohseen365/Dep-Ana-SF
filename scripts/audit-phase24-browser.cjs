const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function runPhase24BrowserAudit() {
  console.log('=== PHASE 24 BROWSER HYBRID 2D DENSITY & DOM CLEARANCE AUDIT ===');

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  const screenshotDir = path.join(rootDir, 'verification_b_screenshots');
  ensureDirExists(fixtureDir);
  ensureDirExists(screenshotDir);

  const candidatePositionsPath = path.join(fixtureDir, 'phase24-candidate-positions.json');
  if (!fs.existsSync(candidatePositionsPath)) {
    console.error('FATAL: Candidate positions file missing at', candidatePositionsPath);
    process.exit(1);
  }

  const positionsData = JSON.parse(fs.readFileSync(candidatePositionsPath, 'utf-8'));

  const viewports = [
    { name: '1024x768', width: 1024, height: 768 },
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '2560x1440', width: 2560, height: 1440 },
  ];

  const projectsToAudit = [
    {
      id: 'cloud-spend-tracker',
      expectedNodes: 240,
      expectedEdges: 1024,
      candidatePositions: positionsData['cloud-spend-tracker'],
    },
    {
      id: 'pbim',
      expectedNodes: 528,
      expectedEdges: 2063,
      candidatePositions: positionsData['pbim'],
    },
  ];

  console.log('[PLAYWRIGHT] Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  const browserResults = {};

  try {
    for (const projSpec of projectsToAudit) {
      const projectId = projSpec.id;
      console.log(`\n======================================================`);
      console.log(`STARTING BROWSER AUDIT FOR PROJECT: ${projectId}`);
      console.log(`======================================================`);

      browserResults[projectId] = {};

      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();

      const t0 = Date.now();
      console.log(`[NAVIGATE] Opening http://localhost:3000/?project=${projectId}...`);
      await page.goto(`http://localhost:3000/?project=${projectId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

      console.log(`[WAIT] Waiting for window.__CY__...`);
      await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 90000 });
      console.log(`[WAIT] window.__CY__ attached in ${Date.now() - t0} ms!`);

      // Activate Hybrid mode
      await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
        if (btn && !btn.classList.contains('active')) btn.click();
      });
      await page.waitForTimeout(500);

      const candidateIds = Object.keys(projSpec.candidatePositions);

      for (const candidateId of candidateIds) {
        const positions = projSpec.candidatePositions[candidateId];
        browserResults[projectId][candidateId] = {};

        // Apply candidate positions in live Cytoscape instance
        await page.evaluate((pos) => {
          const cy = window.__CY__;
          cy.batch(() => {
            Object.keys(pos).forEach((id) => {
              const node = cy.getElementById(id);
              if (node.length > 0) {
                node.position(pos[id]);
              }
            });
          });
          cy.fit(undefined, 50);
        }, positions);

        await page.waitForTimeout(100);

        for (const vp of viewports) {
          await page.setViewportSize({ width: vp.width, height: vp.height });

          const vpMetrics = await page.evaluate(() => {
            const cy = window.__CY__;
            const zoom = cy.zoom();
            const pan = cy.pan();

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

            return {
              zoom: Math.round(zoom * 1000) / 1000,
              pan,
              domCollisions,
              nodeCount: nodes.length,
            };
          });

          browserResults[projectId][candidateId][vp.name] = vpMetrics;

          if (vp.name === '1440x900' && (candidateId === 'J4_Baseline' || candidateId === 'P24-A_DemandDrivenWidth' || candidateId === 'P24-B_DOMAwareClearance' || candidateId === 'P24-E_JointDemandExpanded')) {
            const ssPath = path.join(screenshotDir, `phase24_${projectId}_${candidateId}_1440x900.png`);
            try { await page.screenshot({ path: ssPath, timeout: 2000 }); } catch (e) {}
          }
        }
        
        const vp1440 = browserResults[projectId][candidateId]['1440x900'];
        console.log(`[CANDIDATE] '${candidateId.padEnd(26)}' -> 1440x900 Zoom: ${vp1440.zoom} | DOM Collisions: ${vp1440.domCollisions}`);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const jsonOut = path.join(fixtureDir, 'phase24-browser-results.json');
  fs.writeFileSync(jsonOut, JSON.stringify(browserResults, null, 2));
  console.log(`\nPhase 24 Browser Audit Complete. Results saved to ${jsonOut}`);
}

runPhase24BrowserAudit().catch((err) => {
  console.error('FATAL Phase 24 Browser Audit Failure:', err);
  process.exit(1);
});
