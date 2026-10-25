const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Controlled comparison runner for Scenarios A, B, and C
// Scenario A: Fresh PBIM page
// Scenario B: Cumulative workload (default -> transitions -> cloud-spend-tracker -> transitions -> pbim) in single page
// Scenario C: Cumulative workload with Page Isolation (default -> transitions -> cloud-spend-tracker -> transitions -> close page -> fresh page -> pbim)

const RUNS_PER_SCENARIO = 3;
const MODE_TRANSITIONS = [
  { name: 'Hierarchical -> Hybrid', targetMode: 'hybrid' },
  { name: 'Hybrid -> Orbit', targetMode: 'orbit' },
  { name: 'Orbit -> Constellation', targetMode: 'constellation' },
  { name: 'Constellation -> Hierarchical', targetMode: 'hierarchical' },
];

async function executeModeTransitions(page, countPerTransition = 1) {
  for (const trans of MODE_TRANSITIONS) {
    const actionToken = `token_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    await page.evaluate(({ targetMode, actionToken }) => {
      return new Promise((resolve) => {
        let timer = null;
        const cleanup = () => {
          window.removeEventListener('app:layoutcomplete', handler);
          if (timer) clearTimeout(timer);
        };
        const handler = (evt) => {
          const detail = evt.detail || {};
          if (detail.architectureMode === targetMode) {
            cleanup();
            resolve({ outcome: 'complete', detail });
          }
        };
        window.addEventListener('app:layoutcomplete', handler);
        timer = setTimeout(() => {
          cleanup();
          resolve({ error: 'timeout-waiting-for-' + targetMode });
        }, 15000);

        window.__CURRENT_CORRELATION_TOKEN__ = actionToken;
        const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
        if (btn) btn.click();
        else {
          cleanup();
          resolve({ error: 'no-toggle-button' });
        }
      });
    }, { targetMode: trans.targetMode, actionToken });
  }
}

async function measurePbimReadiness(page, logFn) {
  const tStart = performance.now();
  let domContentLoadedMs = null;
  let dataFetchedMs = null;
  let layoutReadyMs = null;
  let togglePresentMs = null;
  let toggleVisibleMs = null;
  let toggleEnabledMs = null;
  let cytoscapeNodes = null;
  let totalElapsedMs = null;
  let failedRequests = 0;
  let consoleErrors = 0;
  let uncaughtErrors = 0;

  const onConsole = msg => { if (msg.type() === 'error') consoleErrors++; };
  const onPageError = () => { uncaughtErrors++; };
  const onRequestFailed = () => { failedRequests++; };
  const onResponse = resp => {
    if (resp.url().includes('explorer-data.json') && resp.status() === 200) {
      if (dataFetchedMs === null) dataFetchedMs = Math.round(performance.now() - tStart);
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  logFn('Navigating to http://localhost:3000/?project=pbim');
  await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded', timeout: 120000 });
  domContentLoadedMs = Math.round(performance.now() - tStart);

  const maxWaitMs = 120000;
  const pollInterval = 250;
  const pollLimit = Math.floor(maxWaitMs / pollInterval);

  for (let i = 0; i < pollLimit; i++) {
    const elapsed = Math.round(performance.now() - tStart);

    if (layoutReadyMs === null) {
      const hasLayout = await page.evaluate(() => !!document.querySelector('.app-layout'));
      if (hasLayout) layoutReadyMs = elapsed;
    }

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
      if (togglePresentMs === null) togglePresentMs = elapsed;
      if (toggleState.isVisible && toggleVisibleMs === null) toggleVisibleMs = elapsed;
      if (toggleState.isEnabled && toggleEnabledMs === null) toggleEnabledMs = elapsed;
    }

    if (cytoscapeNodes === null) {
      const count = await page.evaluate(() => {
        if (window.__CY__ && typeof window.__CY__.nodes === 'function') {
          return window.__CY__.nodes().length;
        }
        return null;
      });
      if (count !== null && count > 0) cytoscapeNodes = count;
    }

    if (layoutReadyMs !== null && toggleVisibleMs !== null && toggleEnabledMs !== null && cytoscapeNodes !== null) {
      totalElapsedMs = elapsed;
      break;
    }

    await page.waitForTimeout(pollInterval);
  }

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('requestfailed', onRequestFailed);
  page.off('response', onResponse);

  const jsHeapUsedMb = await page.evaluate(() => {
    return window.performance && window.performance.memory ? Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024)) : null;
  });

  return {
    domContentLoadedMs,
    dataFetchedMs,
    layoutReadyMs,
    togglePresentMs,
    toggleVisibleMs,
    toggleEnabledMs,
    cytoscapeNodes,
    totalElapsedMs,
    failedRequests,
    consoleErrors,
    uncaughtErrors,
    jsHeapUsedMb,
  };
}

(async () => {
  const runId = 'pbim-workload-isolation-benchmark-20261014T224500';
  const outDir = path.join(__dirname, '..', 'audit-evidence', runId);
  fs.mkdirSync(outDir, { recursive: true });
  const logFile = path.join(outDir, 'benchmark.log');
  const resultsJsonFile = path.join(outDir, 'benchmark-results.json');

  const logLines = [];
  const log = (msg) => {
    const entry = `[${new Date().toISOString()}] ${msg}`;
    console.log(entry);
    logLines.push(entry);
  };

  log('Starting Controlled Cumulative-Workload & Page-Isolation Benchmark');
  const browser = await chromium.launch({ headless: true });
  const results = {
    metadata: {
      timestamp: new Date().toISOString(),
      browser: browser.version(),
      node: process.version,
      runsPerScenario: RUNS_PER_SCENARIO,
    },
    scenarios: {
      scenarioA: [],
      scenarioB: [],
      scenarioC: [],
    }
  };

  // --- SCENARIO A: PBIM ALONE ---
  log('====================================================');
  log('STARTING SCENARIO A: PBIM ALONE (Fresh Page)');
  log('====================================================');
  for (let r = 1; r <= RUNS_PER_SCENARIO; r++) {
    log(`--- Scenario A, Run ${r} ---`);
    const context = await browser.newContext();
    const page = await context.newPage();
    const m = await measurePbimReadiness(page, log);
    log(`Scenario A Run ${r} Result: Total=${m.totalElapsedMs}ms, DOMContentLoaded=${m.domContentLoadedMs}ms, Layout=${m.layoutReadyMs}ms, Toggle=${m.toggleVisibleMs}ms, Nodes=${m.cytoscapeNodes}, Heap=${m.jsHeapUsedMb}MB`);
    results.scenarios.scenarioA.push({ run: r, ...m });
    await context.close();
  }

  // --- SCENARIO B: PBIM AFTER CUMULATIVE TRANSITIONS (SAME PAGE) ---
  log('====================================================');
  log('STARTING SCENARIO B: PBIM AFTER CUMULATIVE TRANSITIONS (Same Page)');
  log('====================================================');
  for (let r = 1; r <= RUNS_PER_SCENARIO; r++) {
    log(`--- Scenario B, Run ${r} ---`);
    const context = await browser.newContext();
    const page = await context.newPage();

    log(`[Run ${r}] Step 1: Default project + 4 transitions`);
    await page.goto('http://localhost:3000/?project=default', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 30000 });
    await executeModeTransitions(page);

    log(`[Run ${r}] Step 2: Cloud Spend Tracker + 4 transitions`);
    await page.goto('http://localhost:3000/?project=cloud-spend-tracker', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 30000 });
    await executeModeTransitions(page);

    log(`[Run ${r}] Step 3: Navigating to PBIM on SAME page`);
    const m = await measurePbimReadiness(page, log);
    log(`Scenario B Run ${r} Result: Total=${m.totalElapsedMs}ms, DOMContentLoaded=${m.domContentLoadedMs}ms, Layout=${m.layoutReadyMs}ms, Toggle=${m.toggleVisibleMs}ms, Nodes=${m.cytoscapeNodes}, Heap=${m.jsHeapUsedMb}MB`);
    results.scenarios.scenarioB.push({ run: r, ...m });
    await context.close();
  }

  // --- SCENARIO C: PBIM AFTER CUMULATIVE TRANSITIONS WITH PAGE ISOLATION ---
  log('====================================================');
  log('STARTING SCENARIO C: PBIM AFTER CUMULATIVE WORKLOAD WITH PAGE ISOLATION');
  log('====================================================');
  for (let r = 1; r <= RUNS_PER_SCENARIO; r++) {
    log(`--- Scenario C, Run ${r} ---`);
    const context = await browser.newContext();
    let page = await context.newPage();

    log(`[Run ${r}] Step 1: Default project + 4 transitions`);
    await page.goto('http://localhost:3000/?project=default', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 30000 });
    await executeModeTransitions(page);

    log(`[Run ${r}] Step 2: Cloud Spend Tracker + 4 transitions`);
    await page.goto('http://localhost:3000/?project=cloud-spend-tracker', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 30000 });
    await executeModeTransitions(page);

    log(`[Run ${r}] Step 3: Closing old page, opening NEW page in same context`);
    await page.close();
    page = await context.newPage();

    log(`[Run ${r}] Step 4: Navigating to PBIM on ISOLATED page`);
    const m = await measurePbimReadiness(page, log);
    log(`Scenario C Run ${r} Result: Total=${m.totalElapsedMs}ms, DOMContentLoaded=${m.domContentLoadedMs}ms, Layout=${m.layoutReadyMs}ms, Toggle=${m.toggleVisibleMs}ms, Nodes=${m.cytoscapeNodes}, Heap=${m.jsHeapUsedMb}MB`);
    results.scenarios.scenarioC.push({ run: r, ...m });
    await context.close();
  }

  await browser.close();
  fs.writeFileSync(logFile, logLines.join('\n'), 'utf8');
  fs.writeFileSync(resultsJsonFile, JSON.stringify(results, null, 2), 'utf8');
  log(`All runs complete. Output written to ${outDir}`);
})();
