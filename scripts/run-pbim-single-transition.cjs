const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function stats(samples) {
  if (!samples || samples.length === 0) {
    return { min: 0, max: 0, median: 0, mean: 0, range: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = Math.round((sum / sorted.length) * 100) / 100;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
  const range = Math.round((max - min) * 100) / 100;
  return { min, max, median, mean, range };
}

async function runPBIMTransition() {
  const targetMode = process.argv[2] || 'hybrid';

  console.log('================================================================');
  console.log(`BENCHMARKING PBIM TRANSITION TO: ${targetMode.toUpperCase()}`);
  console.log('================================================================\n');

  const reportsDir = path.join(__dirname, '..', 'audit-reports');
  const outputPath = path.join(reportsDir, 'formal_multi_run_benchmark_results.json');

  let fullResults = {
    metadata: {
      timestamp: new Date().toISOString(),
      viewport: '1440x900',
      headless: true,
      modeOrder: 'Fixed Sequence via Clean Page Reset',
      warmupRunsPerTransition: 1,
      measuredRunsPerTransition: 5,
    },
    projects: {},
    pageErrors: [],
    consoleErrors: [],
  };

  if (fs.existsSync(outputPath)) {
    try {
      fullResults = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    } catch (_) {}
  }

  const browser = await chromium.launch({ headless: true });
  fullResults.metadata.browserVersion = browser.version();

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('pageerror', (err) => fullResults.pageErrors.push(err.message || String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') fullResults.consoleErrors.push(msg.text());
  });

  const proj = { id: 'pbim', name: 'PBIM (Large)', url: 'http://localhost:3000/?project=pbim' };

  if (!fullResults.projects.pbim) {
    fullResults.projects.pbim = {
      id: proj.id,
      name: proj.name,
      initialLoadMs: 0,
      sourceMetrics: {},
      transitions: {},
    };
  }

  const prepClicks = targetMode === 'hybrid' ? 0
                   : targetMode === 'orbit' ? 1
                   : targetMode === 'constellation' ? 2
                   : 3;

  const warmupSamples = [];
  const measuredSamples = [];
  const totalRuns = 1 + 5; // 1 warm-up + 5 measured

  for (let runIdx = 0; runIdx < totalRuns; runIdx++) {
    const isWarmup = runIdx === 0;
    const runLabel = isWarmup ? 'Warm-up' : `Run ${runIdx}`;

    // Load page fresh
    const navStart = Date.now();
    await page.goto(proj.url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.app-layout', { timeout: 180000 });
    await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 180000 });
    const navEnd = Date.now();
    const loadMs = navEnd - navStart;

    if (runIdx === 0 && !fullResults.projects.pbim.initialLoadMs) {
      fullResults.projects.pbim.initialLoadMs = loadMs;
      const sourceMetrics = await page.evaluate(() => {
        const cy = window.__CY__;
        return {
          sourceNodes: cy ? cy.nodes().length : 0,
          sourceEdges: cy ? cy.edges().length : 0,
          lwcCount: cy ? cy.nodes().filter(n => n.data('type') === 'LWC').length : 0,
          visibleNodes: cy ? cy.nodes(':visible').length : 0,
          visibleEdges: cy ? cy.edges(':visible').length : 0,
        };
      });
      fullResults.projects.pbim.sourceMetrics = sourceMetrics;
    }

    // Prep clicks to reach starting state
    for (let c = 0; c < prepClicks; c++) {
      await page.evaluate(() => {
        return new Promise((resolve) => {
          const handler = (evt) => {
            window.removeEventListener('app:layoutcomplete', handler);
            resolve(evt.detail);
          };
          window.addEventListener('app:layoutcomplete', handler);
          const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
          if (btn) btn.click();
          else resolve(null);
        });
      });
      await page.waitForTimeout(100);
    }

    // Measured Click to targetMode
    const runResult = await page.evaluate((targetMode) => {
      return new Promise((resolve) => {
        const tStart = performance.now();
        let ackTime = null;

        const handler = (evt) => {
          window.removeEventListener('app:layoutcomplete', handler);
          const tEnd = performance.now();
          const cy = window.__CY__;
          const modeIndicatorText = document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim();

          resolve({
            e2eMs: Math.round(tEnd - tStart),
            ackMs: ackTime ? Math.round(ackTime - tStart) : null,
            detail: evt.detail,
            modeIndicatorText,
            visibleNodes: cy ? cy.nodes(':visible').length : 0,
            visibleEdges: cy ? cy.edges(':visible').length : 0,
          });
        };

        window.addEventListener('app:layoutcomplete', handler);

        const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
        if (btn) {
          btn.click();
          ackTime = performance.now();
        } else {
          window.removeEventListener('app:layoutcomplete', handler);
          resolve({ error: 'toggle-button-not-found' });
        }
      });
    }, targetMode);

    if (runResult.error) {
      console.error(`    ${runLabel} FAILED: ${runResult.error}`);
      continue;
    }

    const sample = {
      runLabel,
      isWarmup,
      durationMs: runResult.detail.durationMs,
      e2eMs: runResult.e2eMs,
      ackMs: runResult.ackMs,
      outcome: runResult.detail.outcome,
      architectureMode: runResult.detail.architectureMode,
      requestId: runResult.detail.requestId,
      nodeCount: runResult.detail.nodeCount,
      edgeCount: runResult.detail.edgeCount,
      visibleNodes: runResult.visibleNodes,
      visibleEdges: runResult.visibleEdges,
      modeIndicatorText: runResult.modeIndicatorText,
    };

    if (isWarmup) {
      warmupSamples.push(sample);
      console.log(`    [Warm-up] ${sample.architectureMode}: layout-latency ${sample.durationMs}ms | e2e ${sample.e2eMs}ms | outcome: ${sample.outcome} | visible: ${sample.visibleNodes}/${sample.visibleEdges}`);
    } else {
      measuredSamples.push(sample);
      console.log(`    [Run ${runIdx}] ${sample.architectureMode}: layout-latency ${sample.durationMs}ms | e2e ${sample.e2eMs}ms | outcome: ${sample.outcome} | visible: ${sample.visibleNodes}/${sample.visibleEdges}`);
    }
  }

  const layoutDurations = measuredSamples.map(s => s.durationMs);
  const e2eDurations = measuredSamples.map(s => s.e2eMs);

  const layoutStats = stats(layoutDurations);
  const e2eStats = stats(e2eDurations);

  console.log(`\n    SUMMARY PBIM -> ${targetMode}:`);
  console.log(`      layout-computation-and-position-application latency: min=${layoutStats.min}ms, max=${layoutStats.max}ms, median=${layoutStats.median}ms, mean=${layoutStats.mean}ms, range=${layoutStats.range}ms`);
  console.log(`      e2e click-to-completion latency: min=${e2eStats.min}ms, max=${e2eStats.max}ms, median=${e2eStats.median}ms, mean=${e2eStats.mean}ms, range=${e2eStats.range}ms`);

  fullResults.projects.pbim.transitions[targetMode] = {
    transitionName: `Target -> ${targetMode}`,
    targetMode,
    warmupSamples,
    measuredSamples,
    layoutStats,
    e2eStats,
  };

  await browser.close();

  fs.writeFileSync(outputPath, JSON.stringify(fullResults, null, 2));
  console.log(`Saved updated results to ${outputPath}`);
}

runPBIMTransition().catch((err) => {
  console.error('Fatal Transition Error:', err);
  process.exit(1);
});
