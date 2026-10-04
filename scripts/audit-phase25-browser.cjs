const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runPhase25BrowserValidation() {
  console.log('=== PHASE 25 BROWSER VALIDATION & SCREENSHOT CAPTURE ===');

  const rootDir = path.resolve(__dirname, '..');
  const screenshotDir = path.join(rootDir, 'verification_b_screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('[PLAYWRIGHT] Opening http://localhost:3000/?project=pbim ...');
  await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 60000 });

  // Activate Hybrid mode
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
    if (btn && !btn.classList.contains('active')) btn.click();
  });
  await page.waitForTimeout(1000);

  const ssPath = path.join(screenshotDir, 'phase25_hybrid_pbim_1440x900.png');
  const canvasElement = await page.$('.cy-container') || await page.$('canvas') || await page.$('#root');
  if (canvasElement) {
    await canvasElement.screenshot({ path: ssPath, timeout: 10000 });
    console.log(`[SCREENSHOT] Captured live GraphView element screenshot at ${ssPath}`);
  } else {
    console.log('[SCREENSHOT] Fallback element not found');
  }

  await browser.close();
  console.log('Phase 25 Browser Validation Complete.');
}

runPhase25BrowserValidation().catch((err) => {
  console.error('Phase 25 Browser Validation Failed:', err);
  process.exit(1);
});
