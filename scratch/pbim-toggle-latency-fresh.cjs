const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const runId = 'pbim-toggle-latency-fresh-20261014T223000';
  const outDir = path.join(__dirname, '..', 'audit-evidence', runId);
  fs.mkdirSync(outDir, { recursive: true });
  const logFile = path.join(outDir, 'fresh.log');

  const logLines = [];
  const log = (msg) => {
    const entry = `[${new Date().toISOString()}] ${msg}`;
    console.log(entry);
    logLines.push(entry);
  };

  log('Starting fresh PBIM toggle-latency run');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => log(`[PAGE ERROR] ${err.message}`));
  page.on('requestfailed', req => log(`[NET FAIL] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`));
  page.on('response', resp => {
    if (resp.url().includes('explorer-data.json') || resp.url().includes('data/')) {
      log(`[DATA RESP] ${resp.status()} ${resp.url()}`);
    }
  });

  const startTime = Date.now();
  const targetUrl = 'http://localhost:3000/?project=pbim';

  try {
    log(`Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const domLoadedElapsed = Date.now() - startTime;
    log(`DOMContentLoaded reached at +${domLoadedElapsed}ms`);

    // Poll for layout and toggle with 1-second cadence
    let layoutReadyElapsed = null;
    let toggleFirstPresentElapsed = null;
    let toggleFirstVisibleElapsed = null;
    let toggleFirstEnabledElapsed = null;
    let finalNodeCount = null;

    const maxWaitMs = 180000;
    const pollIntervalMs = 1000;
    const pollLimit = Math.floor(maxWaitMs / pollIntervalMs);

    for (let i = 0; i < pollLimit; i++) {
      const elapsed = Date.now() - startTime;

      // Check layout presence
      if (layoutReadyElapsed === null) {
        const hasLayout = await page.evaluate(() => !!document.querySelector('.app-layout'));
        if (hasLayout) {
          layoutReadyElapsed = elapsed;
          log(`Layout (.app-layout) detected at +${layoutReadyElapsed}ms`);
        }
      }

      // Check toggle state
      const toggleState = await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
        if (!btn) return null;
        const rect = btn.getBoundingClientRect();
        const style = window.getComputedStyle(btn);
        const isVisible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        const isEnabled = !btn.disabled && !btn.hasAttribute('disabled');
        return { isVisible, isEnabled };
      });

      if (toggleState) {
        if (toggleFirstPresentElapsed === null) {
          toggleFirstPresentElapsed = elapsed;
          log(`Toggle element present in DOM at +${toggleFirstPresentElapsed}ms`);
        }
        if (toggleState.isVisible && toggleFirstVisibleElapsed === null) {
          toggleFirstVisibleElapsed = elapsed;
          log(`Toggle element visible at +${toggleFirstVisibleElapsed}ms`);
        }
        if (toggleState.isEnabled && toggleFirstEnabledElapsed === null) {
          toggleFirstEnabledElapsed = elapsed;
          log(`Toggle element enabled at +${toggleFirstEnabledElapsed}ms`);
        }
      }

      // Check cytoscape node count
      if (finalNodeCount === null) {
        const nodeCount = await page.evaluate(() => {
          if (window.__CY__ && typeof window.__CY__.nodes === 'function') {
            return window.__CY__.nodes().length;
          }
          return null;
        });
        if (nodeCount !== null && nodeCount > 0) {
          finalNodeCount = nodeCount;
          log(`Cytoscape initialized with ${finalNodeCount} nodes at +${elapsed}ms`);
        }
      }

      if (toggleFirstVisibleElapsed !== null && toggleFirstEnabledElapsed !== null && finalNodeCount !== null) {
        log(`All criteria satisfied at +${elapsed}ms`);
        break;
      }

      await page.waitForTimeout(pollIntervalMs);
    }

    log(`Summary: DOMContentLoaded=+${domLoadedElapsed}ms, LayoutReady=${layoutReadyElapsed !== null ? '+' + layoutReadyElapsed + 'ms' : 'NEVER'}, TogglePresent=${toggleFirstPresentElapsed !== null ? '+' + toggleFirstPresentElapsed + 'ms' : 'NEVER'}, ToggleVisible=${toggleFirstVisibleElapsed !== null ? '+' + toggleFirstVisibleElapsed + 'ms' : 'NEVER'}, ToggleEnabled=${toggleFirstEnabledElapsed !== null ? '+' + toggleFirstEnabledElapsed + 'ms' : 'NEVER'}, CytoscapeNodeCount=${finalNodeCount !== null ? finalNodeCount : 'NULL'}`);
  } catch (err) {
    log(`Script error: ${err.message}`);
  } finally {
    await browser.close();
    fs.writeFileSync(logFile, logLines.join('\n'), 'utf8');
    log(`Log saved to ${logFile}`);
  }
})();
