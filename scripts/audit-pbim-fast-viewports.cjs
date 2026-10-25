const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runFastPBIM() {
  const targetCandidate = process.argv[2] || 'J4_Baseline';
  console.log(`=== PHASE 24 PBIM FAST VIEWPORT AUDIT: '${targetCandidate}' ===`);

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  const candidatePositionsPath = path.join(fixtureDir, 'phase24-candidate-positions.json');
  const positionsData = JSON.parse(fs.readFileSync(candidatePositionsPath, 'utf-8'))['pbim'];

  if (!positionsData[targetCandidate]) {
    console.error(`FATAL: Candidate '${targetCandidate}' not found in candidate positions`);
    process.exit(1);
  }

  const pos = positionsData[targetCandidate];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const t0 = Date.now();
  console.log('Opening http://localhost:3000/?project=pbim ...');
  await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 60000 });
  console.log('window.__CY__ ready in', Date.now() - t0, 'ms');

  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
    if (btn && !btn.classList.contains('active')) btn.click();
  });
  await page.waitForTimeout(500);

  // Apply candidate positions
  await page.evaluate((positions) => {
    const cy = window.__CY__;
    cy.batch(() => {
      Object.keys(positions).forEach((id) => {
        const node = cy.getElementById(id);
        if (node.length > 0) node.position(positions[id]);
      });
    });
    cy.fit(undefined, 50);
  }, pos);

  await page.waitForTimeout(500);

  const viewports = [
    { name: '1024x768', width: 1024, height: 768 },
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '2560x1440', width: 2560, height: 1440 },
  ];

  const results = {};

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.evaluate(() => { if (window.__CY__) window.__CY__.fit(undefined, 50); });
    await page.waitForTimeout(100);

    const metrics = await page.evaluate(() => {
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

    results[vp.name] = metrics;
    console.log(`  - Viewport ${vp.name.padEnd(10)} | Zoom: ${metrics.zoom} | DOM Collisions: ${metrics.domCollisions}`);
  }

  await browser.close();

  const jsonOutPath = path.join(fixtureDir, `phase24-pbim-${targetCandidate}.json`);
  fs.writeFileSync(jsonOutPath, JSON.stringify(results, null, 2));
  console.log(`Saved results to ${jsonOutPath}`);
}

runFastPBIM().catch((err) => {
  console.error('PBIM Fast Audit failed:', err);
  process.exit(1);
});
