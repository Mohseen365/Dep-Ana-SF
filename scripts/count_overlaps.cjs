const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const screenshotsDir = path.resolve(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.app-layout', { timeout: 60000 });
  await page.waitForSelector('[data-testid="architecture-mode-toggle"]');

  const countOverlaps = async () => {
    return await page.evaluate(() => {
      const cy = window.__CY__;
      if (!cy) return null;
      let count = 0;
      const nodes = cy.nodes();
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i].renderedBoundingBox();
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j].renderedBoundingBox();
          if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) count++;
        }
      }
      return count;
    });
  };

  const modes = [
    { name: 'hierarchical', keyword: 'Hierarchical' },
    { name: 'hybrid', keyword: 'Hybrid' },
    { name: 'orbit', keyword: 'Orbit' },
    { name: 'constellation', keyword: 'Constellation' },
  ];

  const results = [];
  for (const mode of modes) {
    // click toggle until the indicator contains the keyword
    let attempts = 0;
    while (attempts < 10) {
      const indicator = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="graph-mode-indicator"]');
        return el ? el.textContent : '';
      });
      if (indicator.includes(mode.keyword)) break;
      await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
        if (btn) btn.click();
      });
      await page.waitForTimeout(500);
      attempts++;
    }
    const overlapCount = await countOverlaps();
    results.push({ mode: mode.name, overlapCount });
    console.log(`Mode ${mode.name}: overlaps = ${overlapCount}`);
  }

  await browser.close();
  console.log('=== OVERLAP COUNTS ===');
  console.log(JSON.stringify(results, null, 2));
})();
