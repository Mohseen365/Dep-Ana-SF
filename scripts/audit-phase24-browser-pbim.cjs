const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function runPBIM() {
  console.log('=== PHASE 24 BROWSER AUDIT — PBIM ===');

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  const screenshotDir = path.join(rootDir, 'verification_b_screenshots');
  ensureDirExists(fixtureDir);
  ensureDirExists(screenshotDir);

  const candidatePositionsPath = path.join(fixtureDir, 'phase24-candidate-positions.json');
  const positionsData = JSON.parse(fs.readFileSync(candidatePositionsPath, 'utf-8'))['pbim'];

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('Opening http://localhost:3000/?project=pbim ...');
  await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('Waiting for window.__CY__...');
  await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 60000 });
  console.log('window.__CY__ ready!');

  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
    if (btn && !btn.classList.contains('active')) btn.click();
  });
  await page.waitForTimeout(500);

  const pbimResults = {};

  for (const candidateId of Object.keys(positionsData)) {
    console.log(`Auditing candidate: ${candidateId}...`);
    const positions = positionsData[candidateId];
    pbimResults[candidateId] = {};

    const t0 = Date.now();
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

    pbimResults[candidateId]['1440x900'] = vpMetrics;
    console.log(`[PBIM] ${candidateId.padEnd(26)} -> 1440x900 Zoom: ${vpMetrics.zoom} | DOM Collisions: ${vpMetrics.domCollisions} (took ${Date.now() - t0}ms)`);
  }

  await browser.close();

  const jsonOut = path.join(fixtureDir, 'phase24-browser-pbim-results.json');
  fs.writeFileSync(jsonOut, JSON.stringify(pbimResults, null, 2));
  console.log('PBIM Audit Complete.');
}

runPBIM().catch((err) => {
  console.error('PBIM Audit failed:', err);
  process.exit(1);
});
