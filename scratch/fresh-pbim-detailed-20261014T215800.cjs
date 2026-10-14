// Detailed fresh‑page PBIM diagnostic (new)
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const log = [];
  const ts = () => new Date().toISOString();
  const add = (msg) => { log.push(`${ts()} ${msg}`); console.log(msg); };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') add(`Console error: ${msg.text()}`);
  });
  // capture page errors
  page.on('pageerror', (err) => add(`Page error: ${err.message}`));
  // capture failed network responses and data fetches
  page.on('response', async (resp) => {
    if (!resp.ok()) {
      add(`Network failure: ${resp.url()} status ${resp.status()}`);
    } else if (resp.url().includes('explorer-data.json')) {
      try {
        const json = await resp.json();
        const count = json?.components?.length ?? json?.nodes?.length ?? 'unknown';
        add(`Data fetched ${resp.url()} components=${count}`);
      } catch (e) {
        add(`Data fetch parse error ${resp.url()}: ${e.message}`);
      }
    }
  });

  const url = 'http://localhost:3000/?project=pbim';
  add(`Navigating to ${url}`);
  const navStart = Date.now();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    add(`Page DOMContentLoaded after ${Date.now() - navStart}ms`);
  } catch (e) {
    add(`Page load error: ${e.message}`);
    await browser.close();
    fs.writeFileSync('audit-evidence/pbim-lifecycle-retest-2026-10-14T20-55-00Z/fresh-detailed.log', log.join('\n'));
    return;
  }

  // wait for app layout
  const layoutStart = Date.now();
  try {
    await page.waitForSelector('.app-layout', { timeout: 60000 });
    add(`.app-layout present after ${Date.now() - layoutStart}ms`);
  } catch (e) {
    add(`.app-layout timeout after 60000ms`);
  }

  // toggle check with checkpoints
  const checkpoints = [5000, 30000, 180000];
  for (const ms of checkpoints) {
    try {
      const toggle = await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: ms });
      const visible = await toggle.isVisible();
      const enabled = await toggle.isEnabled();
      add(`Toggle state after ${ms}ms: visible=${visible} enabled=${enabled}`);
      break;
    } catch (e) {
      // continue to next checkpoint
    }
  }

  // graph node count via Cytoscape if available
  try {
    const nodeCount = await page.evaluate(() => {
      if (window.cy && typeof window.cy.nodes === 'function') {
        return window.cy.nodes().length;
      }
      return null;
    });
    add(`Graph node count=${nodeCount}`);
  } catch (e) {
    add(`Graph node count error: ${e.message}`);
  }

  await browser.close();
  const outPath = 'audit-evidence/pbim-lifecycle-retest-2026-10-14T20-55-00Z/fresh-detailed.log';
  fs.writeFileSync(outPath, log.join('\n'));
})();
