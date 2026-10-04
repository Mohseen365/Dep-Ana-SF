const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runAllViewportAudit() {
  console.log('=== PHASE 24 ALL-CANDIDATE ALL-VIEWPORT BROWSER VALIDATION ===');

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  const candidatePositionsPath = path.join(fixtureDir, 'phase24-candidate-positions.json');
  const positionsData = JSON.parse(fs.readFileSync(candidatePositionsPath, 'utf-8'));

  const viewports = [
    { name: '1024x768', width: 1024, height: 768 },
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '2560x1440', width: 2560, height: 1440 },
  ];

  const browser = await chromium.launch({ headless: true });
  const allResults = {};

  for (const projectId of ['cloud-spend-tracker', 'pbim']) {
    console.log(`\n======================================================`);
    console.log(`AUDITING ALL CANDIDATES ACROSS 5 VIEWPORTS: ${projectId}`);
    console.log(`======================================================`);

    allResults[projectId] = {};
    const projCandidates = positionsData[projectId];

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`http://localhost:3000/?project=${projectId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 60000 });

    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      if (btn && !btn.classList.contains('active')) btn.click();
    });
    await page.waitForTimeout(500);

    for (const cId of Object.keys(projCandidates)) {
      const positions = projCandidates[cId];
      allResults[projectId][cId] = {};

      // Apply positions
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

      await page.waitForTimeout(200);

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.evaluate(() => {
          if (window.__CY__) window.__CY__.fit(undefined, 50);
        });
        await page.waitForTimeout(200);

        const res = await page.evaluate(() => {
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

        allResults[projectId][cId][vp.name] = res;
      }

      const res2560 = allResults[projectId][cId]['2560x1440'];
      const res1440 = allResults[projectId][cId]['1440x900'];
      console.log(`  - ${cId.padEnd(28)} | 1440x900: ${res1440.domCollisions} DOM | 2560x1440: ${res2560.domCollisions} DOM`);
    }

    await context.close();
  }

  await browser.close();

  fs.writeFileSync(
    path.join(fixtureDir, 'phase24-all-candidates-viewports.json'),
    JSON.stringify(allResults, null, 2)
  );

  console.log('\nAll Candidates Viewport Audit Complete.');
}

runAllViewportAudit().catch((err) => {
  console.error('All Viewport Audit failed:', err);
  process.exit(1);
});
