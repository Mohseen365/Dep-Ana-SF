const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function runCST() {
  console.log('=== PHASE 24 BROWSER AUDIT — CLOUD SPEND TRACKER ===');

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  const screenshotDir = path.join(rootDir, 'verification_b_screenshots');
  ensureDirExists(fixtureDir);
  ensureDirExists(screenshotDir);

  const candidatePositionsPath = path.join(fixtureDir, 'phase24-candidate-positions.json');
  const positionsData = JSON.parse(fs.readFileSync(candidatePositionsPath, 'utf-8'))['cloud-spend-tracker'];

  const viewports = [
    { name: '1024x768', width: 1024, height: 768 },
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '2560x1440', width: 2560, height: 1440 },
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  console.log('Opening http://localhost:3000/?project=cloud-spend-tracker ...');
  await page.goto('http://localhost:3000/?project=cloud-spend-tracker', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 30000 });

  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
    if (btn && !btn.classList.contains('active')) btn.click();
  });
  await page.waitForTimeout(300);

  const cstResults = {};

  for (const candidateId of Object.keys(positionsData)) {
    const positions = positionsData[candidateId];
    cstResults[candidateId] = {};

    await page.evaluate((pos) => {
      const cy = window.__CY__;
      cy.batch(() => {
        Object.keys(pos).forEach((id) => {
          const node = cy.getElementById(id);
          if (node.length > 0) node.position(pos[id]);
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
        const nodes = cy.nodes().map((n) => ({ id: n.id(), bb: n.renderedBoundingBox() }));

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
        return { zoom: Math.round(zoom * 1000) / 1000, domCollisions };
      });

      cstResults[candidateId][vp.name] = vpMetrics;
    }

    console.log(`[CST] ${candidateId.padEnd(28)} -> 1440x900 Zoom: ${cstResults[candidateId]['1440x900'].zoom} | DOM Collisions: ${cstResults[candidateId]['1440x900'].domCollisions}`);
  }

  await browser.close();

  const jsonOut = path.join(fixtureDir, 'phase24-browser-cst-results.json');
  fs.writeFileSync(jsonOut, JSON.stringify(cstResults, null, 2));
  console.log('CST Audit Complete.');
}

runCST().catch((err) => {
  console.error('CST Audit failed:', err);
  process.exit(1);
});
