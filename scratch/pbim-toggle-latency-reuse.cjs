const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const runId = 'pbim-toggle-latency-reuse-20261014T223000';
  const outDir = path.join(__dirname, '..', 'audit-evidence', runId);
  fs.mkdirSync(outDir, { recursive: true });
  const logFile = path.join(outDir, 'reuse.log');

  const logLines = [];
  const log = (msg) => {
    const entry = `[${new Date().toISOString()}] ${msg}`;
    console.log(entry);
    logLines.push(entry);
  };

  log('Starting same-page reuse PBIM toggle-latency run (default -> cloud-spend-tracker -> pbim)');
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

  const runStep = async (projectName, isPbim = false) => {
    const stepStart = Date.now();
    const targetUrl = `http://localhost:3000/?project=${projectName}`;
    log(`--- Navigating to ${projectName} (${targetUrl}) ---`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const domLoadedElapsed = Date.now() - stepStart;
    log(`[${projectName}] DOMContentLoaded reached at +${domLoadedElapsed}ms`);

    let layoutReadyElapsed = null;
    let toggleFirstPresentElapsed = null;
    let toggleFirstVisibleElapsed = null;
    let toggleFirstEnabledElapsed = null;
    let finalNodeCount = null;

    const maxWaitMs = isPbim ? 180000 : 30000;
    const pollIntervalMs = 1000;
    const pollLimit = Math.floor(maxWaitMs / pollIntervalMs);

    for (let i = 0; i < pollLimit; i++) {
      const elapsed = Date.now() - stepStart;

      if (layoutReadyElapsed === null) {
        const hasLayout = await page.evaluate(() => !!document.querySelector('.app-layout'));
        if (hasLayout) {
          layoutReadyElapsed = elapsed;
          log(`[${projectName}] Layout (.app-layout) detected at +${layoutReadyElapsed}ms`);
        }
      }

      if (isPbim) {
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
            log(`[${projectName}] Toggle element present in DOM at +${toggleFirstPresentElapsed}ms`);
          }
          if (toggleState.isVisible && toggleFirstVisibleElapsed === null) {
            toggleFirstVisibleElapsed = elapsed;
            log(`[${projectName}] Toggle element visible at +${toggleFirstVisibleElapsed}ms`);
          }
          if (toggleState.isEnabled && toggleFirstEnabledElapsed === null) {
            toggleFirstEnabledElapsed = elapsed;
            log(`[${projectName}] Toggle element enabled at +${toggleFirstEnabledElapsed}ms`);
          }
        }
      }

      const nodeCount = await page.evaluate(() => {
        if (window.__CY__ && typeof window.__CY__.nodes === 'function') {
          return window.__CY__.nodes().length;
        }
        return null;
      });
      if (nodeCount !== null && nodeCount > 0 && finalNodeCount === null) {
        finalNodeCount = nodeCount;
        log(`[${projectName}] Cytoscape initialized with ${finalNodeCount} nodes at +${elapsed}ms`);
      }

      if (isPbim) {
        if (toggleFirstVisibleElapsed !== null && toggleFirstEnabledElapsed !== null && finalNodeCount !== null) {
          log(`[${projectName}] All criteria satisfied at +${elapsed}ms`);
          break;
        }
      } else {
        if (layoutReadyElapsed !== null && finalNodeCount !== null) {
          log(`[${projectName}] Baseline ready at +${elapsed}ms`);
          break;
        }
      }

      await page.waitForTimeout(pollIntervalMs);
    }

    log(`[${projectName}] Summary: DOMContentLoaded=+${domLoadedElapsed}ms, LayoutReady=${layoutReadyElapsed !== null ? '+' + layoutReadyElapsed + 'ms' : 'NEVER'}, TogglePresent=${toggleFirstPresentElapsed !== null ? '+' + toggleFirstPresentElapsed + 'ms' : 'N/A'}, ToggleVisible=${toggleFirstVisibleElapsed !== null ? '+' + toggleFirstVisibleElapsed + 'ms' : 'N/A'}, ToggleEnabled=${toggleFirstEnabledElapsed !== null ? '+' + toggleFirstEnabledElapsed + 'ms' : 'N/A'}, CytoscapeNodeCount=${finalNodeCount !== null ? finalNodeCount : 'NULL'}`);
  };

  try {
    await runStep('default', false);
    await runStep('cloud-spend-tracker', false);
    await runStep('pbim', true);
  } catch (err) {
    log(`Script error: ${err.message}`);
  } finally {
    await browser.close();
    fs.writeFileSync(logFile, logLines.join('\n'), 'utf8');
    log(`Log saved to ${logFile}`);
  }
})();
