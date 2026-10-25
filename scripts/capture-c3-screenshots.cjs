const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureScreenshots() {
  console.log('=== CAPTURING C3 ADVERSARIAL SCREENSHOTS ===\n');

  const screenshotsDir = path.resolve(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('[1] Loading App on http://localhost:5173/?project=pbim...');
  await page.goto('http://localhost:5173/?project=pbim');
  await page.waitForTimeout(3000);

  // Switch to Orbit mode
  console.log('[2] Switching to Orbit Mode...');
  await page.evaluate(() => document.querySelector('[data-testid="architecture-mode-toggle"]')?.click());
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelector('[data-testid="architecture-mode-toggle"]')?.click());
  await page.waitForTimeout(1500);

  // 1. Dense Orbit Screenshot
  await page.screenshot({ path: path.join(screenshotsDir, 'c3_pbim_orbit_dense.png') });
  console.log('    Captured verification_b_screenshots/c3_pbim_orbit_dense.png');

  // 2. Selected Node Screenshot
  await page.evaluate(() => {
    const cy = window.__CY__;
    if (cy) {
      const n = cy.nodes()[0];
      cy.batch(() => {
        cy.elements().unselect();
        n.select();
      });
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, 'c3_pbim_orbit_selected.png') });
  console.log('    Captured verification_b_screenshots/c3_pbim_orbit_selected.png');

  // 3. Hover Node Screenshot
  await page.evaluate(() => {
    const cy = window.__CY__;
    if (cy) {
      const n = cy.nodes()[0];
      n.emit('mouseover');
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, 'c3_pbim_orbit_hover.png') });
  console.log('    Captured verification_b_screenshots/c3_pbim_orbit_hover.png');

  // 4. Hybrid After Orbit Screenshot
  await page.evaluate(() => document.querySelector('[data-testid="architecture-mode-toggle"]')?.click()); // to Hierarchical
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-testid="architecture-mode-toggle"]')?.click()); // to Hybrid
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, 'c3_pbim_hybrid_after_orbit.png') });
  console.log('    Captured verification_b_screenshots/c3_pbim_hybrid_after_orbit.png');

  // 5. Hierarchical After Orbit Screenshot
  await page.evaluate(() => document.querySelector('[data-testid="architecture-mode-toggle"]')?.click()); // to Orbit
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-testid="architecture-mode-toggle"]')?.click()); // to Hierarchical
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, 'c3_pbim_hierarchical_after_orbit.png') });
  console.log('    Captured verification_b_screenshots/c3_pbim_hierarchical_after_orbit.png');

  // 6. Constellation After Orbit Screenshot
  const constellationTab = page.locator('[data-testid="view-btn-constellation"]').first();
  if (await constellationTab.isVisible().catch(() => false)) {
    await constellationTab.click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screenshotsDir, 'c3_pbim_constellation_after_orbit.png') });
    console.log('    Captured verification_b_screenshots/c3_pbim_constellation_after_orbit.png');
  }

  await browser.close();
  console.log('\n=== SCREENSHOT CAPTURE COMPLETE ===');
}

captureScreenshots().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
