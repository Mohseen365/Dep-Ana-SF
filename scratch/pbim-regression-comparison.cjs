const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.join(__dirname, '..', 'audit-evidence', 'pbim-regression-comparison-20261014T223600');
  fs.mkdirSync(outDir, { recursive: true });
  const logFile = path.join(outDir, 'regression-comparison.log');
  const log = [];
  const logLine = (msg) => { const l = `[${new Date().toISOString()}] ${msg}`; console.log(l); log.push(l); };

  logLine('=== RUNNING HISTORICAL SIMULATION (sequential navigation on single page) ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => logLine(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => logLine(`[PAGE ERROR] ${err.message}`));

  const runSequential = async (projectName, isPbim) => {
    const url = `http://localhost:3000/?project=${projectName}`;
    logLine(`Navigating to ${url}`);
    const navStart = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    logLine(`[${projectName}] DOMContentLoaded at +${Date.now() - navStart}ms`);

    // Historical test style: wait for .app-layout then toggle
    try {
      const layoutStart = Date.now();
      await page.waitForSelector('.app-layout', { timeout: 60000 });
      logLine(`[${projectName}] .app-layout found at +${Date.now() - layoutStart}ms`);
    } catch (e) {
      logLine(`[${projectName}] .app-layout timeout: ${e.message}`);
    }

    if (isPbim) {
      try {
        const toggleStart = Date.now();
        await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 180000 });
        logLine(`[${projectName}] architecture-mode-toggle found at +${Date.now() - toggleStart}ms`);
      } catch (e) {
        logLine(`[${projectName}] architecture-mode-toggle timeout: ${e.message}`);
      }

      // Check node count via both window.cy (old probe) and window.__CY__ (correct runtime property)
      const oldProbe = await page.evaluate(() => (window.cy ? window.cy.nodes().length : null));
      const newProbe = await page.evaluate(() => (window.__CY__ ? window.__CY__.nodes().length : null));
      logLine(`[${projectName}] Graph probe comparison: window.cy=${oldProbe}, window.__CY__=${newProbe}`);
    }
  };

  try {
    await runSequential('default', false);
    await runSequential('cloud-spend-tracker', false);
    await runSequential('pbim', true);
  } catch (err) {
    logLine(`Fatal error during sequential run: ${err.message}`);
  } finally {
    await browser.close();
    fs.writeFileSync(logFile, log.join('\n'), 'utf8');
    logLine(`Log saved to ${logFile}`);
  }
})();
