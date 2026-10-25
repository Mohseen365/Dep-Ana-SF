// Fresh‑page PBIM diagnostic (retest)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const log = [];
  const ts = () => new Date().toISOString();
  const add = (msg) => { log.push(`${ts()} ${msg}`); console.log(msg); };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  // Capture console errors
  page.on('console', (msg) => { if (msg.type() === 'error') add(`Console error: ${msg.text()}`); });
  // Capture failed responses
  page.on('response', async (resp) => { if (!resp.ok()) add(`Network failure: ${resp.url()} status ${resp.status()}`); });
  const url = 'http://localhost:3000/?project=pbim';
  add(`Navigating to ${url}`);
  const navStart = Date.now();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    add(`Page loaded after ${Date.now() - navStart}ms`);
  } catch (e) {
    add(`Page load error: ${e.message}`);
  }
  // Check toggle at checkpoints (5s, 30s, 180s)
  const checkpoints = [5000, 30000, 180000];
  for (const ms of checkpoints) {
    try {
      await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: ms });
      add(`Toggle visible after ${ms}ms`);
      break;
    } catch (e) { }
  }
  await browser.close();
  const outPath = 'audit-evidence/pbim-lifecycle-retest-2026-10-14T20-45-00Z/fresh-pbim.log';
  fs.writeFileSync(outPath, log.join('\n'));
})();
