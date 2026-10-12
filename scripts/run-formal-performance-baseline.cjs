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

async function runFormalBenchmark() {
  const targetProjectId = process.argv[2] || 'all';

  console.log('================================================================');
  console.log(`STARTING FORMAL MULTI-RUN BENCHMARK SUITE (Target: ${targetProjectId})`);
  console.log('================================================================\n');

  const reportsDir = path.join(__dirname, '..', 'audit-reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(reportsDir, `formal_multi_run_benchmark_results_reverification_${timestampStr}.json`);
  let fullResults = {
    metadata: {
      timestamp: new Date().toISOString(),
      viewport: '1440x900',
      headless: true,
      modeOrder: 'Fixed Sequence (Hierarchical -> Hybrid -> Orbit -> Constellation -> Hierarchical)',
      warmupRunsPerTransition: 1,
      measuredRunsPerTransition: 5,
    },
    projects: {},
    pageErrors: [],
    consoleErrors: [],
  };


  const browser = await chromium.launch({ headless: true });
  fullResults.metadata.browserVersion = browser.version();

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('pageerror', (err) => fullResults.pageErrors.push(err.message || String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') fullResults.consoleErrors.push(msg.text());
  });

  const allProjects = [
    { id: 'default', name: 'Default (Small)', url: 'http://localhost:3000/?project=default' },
    { id: 'cloud-spend-tracker', name: 'Cloud Spend Tracker (Medium)', url: 'http://localhost:3000/?project=cloud-spend-tracker' },
    { id: 'pbim', name: 'PBIM (Large)', url: 'http://localhost:3000/?project=pbim' },
  ];

  const projectsToTest = targetProjectId === 'all'
    ? allProjects
    : allProjects.filter(p => p.id === targetProjectId);

  const modeTransitions = [
    { name: 'Hierarchical -> Hybrid', targetMode: 'hybrid' },
    { name: 'Hybrid -> Orbit', targetMode: 'orbit' },
    { name: 'Orbit -> Constellation', targetMode: 'constellation' },
    { name: 'Constellation -> Hierarchical', targetMode: 'hierarchical' },
  ];

  for (const proj of projectsToTest) {
    console.log(`================================================================`);
    console.log(`BENCHMARKING DATASET: ${proj.name} (${proj.id})`);
    console.log(`================================================================`);

    // Measure Initial Load Latency
    const navStart = Date.now();
    await page.goto(proj.url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.app-layout', { timeout: 180000 });
    await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 180000 });
    const navEnd = Date.now();
    const initialLoadMs = navEnd - navStart;

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

    console.log(`  Initial Load Latency: ${initialLoadMs} ms`);
    console.log(`  Source Graph: ${sourceMetrics.sourceNodes} nodes / ${sourceMetrics.sourceEdges} edges (LWCs: ${sourceMetrics.lwcCount})`);
    console.log(`  Initial Visible Graph: ${sourceMetrics.visibleNodes} nodes / ${sourceMetrics.visibleEdges} edges`);

    const projectResults = {
      id: proj.id,
      name: proj.name,
      initialLoadMs,
      sourceMetrics,
      transitions: {},
    };

    const totalRuns = 1 + 5; // 1 warm-up + 5 measured

    const sessionId = `session_${proj.id}_${Date.now()}`;
    let navigationCount = 1;

    for (let transIdx = 0; transIdx < modeTransitions.length; transIdx++) {
      const trans = modeTransitions[transIdx];
      console.log(`\n  --- Transition ${transIdx + 1}: ${trans.name} (Target: ${trans.targetMode}) ---`);

      const warmupSamples = [];
      const measuredSamples = [];

      for (let runIdx = 0; runIdx < totalRuns; runIdx++) {
        const isWarmup = runIdx === 0;
        const runLabel = isWarmup ? 'Warm-up' : `Run ${runIdx}`;

        await page.evaluate(() => {
          const graphTab = document.querySelector('[data-testid="nav-graph"]');
          if (graphTab) (graphTab).click();
        });

        const actionToken = `token_${Math.random().toString(36).substring(2)}_${Date.now()}`;

        const runResult = await page.evaluate(({ targetMode, actionToken }) => {
          return new Promise((resolve) => {
            const tStart = performance.now();
            let ackTime = null;
            const initialReqId = (window.__LAST_LAYOUT_COMPLETED__ && window.__LAST_LAYOUT_COMPLETED__.requestId) || 0;
            let timer = null;

            const cleanup = () => {
              window.removeEventListener('app:layoutcomplete', handler);
              if (timer) clearTimeout(timer);
            };

            const handler = (evt) => {
              const detail = evt.detail || {};
              if (detail.architectureMode !== targetMode) {
                return;
              }
              if (typeof detail.requestId === 'number' && detail.requestId <= initialReqId) {
                return;
              }
              if (detail.correlationToken !== actionToken) {
                return;
              }

              cleanup();
              const tEnd = performance.now();
              const cy = window.__CY__;
              const modeIndicatorText = document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim();

              resolve({
                e2eMs: Math.round(tEnd - tStart),
                ackMs: ackTime ? Math.round(ackTime - tStart) : null,
                detail,
                modeIndicatorText,
                visibleNodes: cy ? cy.nodes(':visible').length : 0,
                visibleEdges: cy ? cy.edges(':visible').length : 0,
              });
            };

            window.addEventListener('app:layoutcomplete', handler);

            timer = setTimeout(() => {
              cleanup();
              resolve({ error: `timeout-waiting-for-${targetMode}` });
            }, 180000);

            window.__CURRENT_CORRELATION_TOKEN__ = actionToken;

            const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
            if (btn) {
              btn.click();
              ackTime = performance.now();
            } else {
              cleanup();
              resolve({ error: 'toggle-button-not-found' });
            }
          });
        }, { targetMode: trans.targetMode, actionToken });

        if (runResult.error) {
          console.error(`    ${runLabel} FAILED: ${runResult.error}`);
          continue;
        }

        const sample = {
          runLabel,
          isWarmup,
          datasetId: proj.id,
          targetMode: trans.targetMode,
          durationMs: runResult.detail.durationMs,
          actionToCorrelatedLayoutCompleteMs: runResult.e2eMs,
          ackMs: runResult.ackMs,
          outcome: runResult.detail.outcome,
          architectureMode: runResult.detail.architectureMode,
          requestId: runResult.detail.requestId,
          correlationToken: runResult.detail.correlationToken,
          nodeCount: runResult.detail.nodeCount,
          edgeCount: runResult.detail.edgeCount,
          visibleNodes: runResult.visibleNodes,
          visibleEdges: runResult.visibleEdges,
          modeIndicatorText: runResult.modeIndicatorText,
          sessionId,
          navigationCount,
          timestamp: new Date().toISOString(),
          classification: isWarmup ? 'warmup' : 'steady_state_measured',
        };

        if (isWarmup) {
          warmupSamples.push(sample);
          console.log(`    [Warm-up] ${sample.architectureMode}: layout-latency ${sample.durationMs}ms | e2e ${sample.e2eMs}ms | outcome: ${sample.outcome} | visible: ${sample.visibleNodes}/${sample.visibleEdges}`);
        } else {
          measuredSamples.push(sample);
          console.log(`    [Run ${runIdx}] ${sample.architectureMode}: layout-latency ${sample.durationMs}ms | e2e ${sample.e2eMs}ms | outcome: ${sample.outcome} | visible: ${sample.visibleNodes}/${sample.visibleEdges}`);
        }

        await page.waitForTimeout(100);

        if (runIdx < totalRuns - 1) {
          for (let step = 0; step < 3; step++) {
            await page.evaluate(() => {
              return new Promise((resolve) => {
                const initialReqId = (window.__LAST_LAYOUT_COMPLETED__ && window.__LAST_LAYOUT_COMPLETED__.requestId) || 0;
                let timer = null;
                const cleanup = () => {
                  window.removeEventListener('app:layoutcomplete', handler);
                  if (timer) clearTimeout(timer);
                };
                const handler = (evt) => {
                  const detail = evt.detail || {};
                  if (typeof detail.requestId === 'number' && detail.requestId <= initialReqId) return;
                  cleanup();
                  resolve(detail);
                };
                window.addEventListener('app:layoutcomplete', handler);
                timer = setTimeout(() => {
                  cleanup();
                  resolve(null);
                }, 30000);
                const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
                if (btn) btn.click();
                else {
                  cleanup();
                  resolve(null);
                }
              });
            });
            await page.waitForTimeout(50);
          }
        }
      }

      const layoutDurations = measuredSamples.map(s => s.durationMs);
      const e2eDurations = measuredSamples.map(s => s.e2eMs);

      const layoutStats = stats(layoutDurations);
      const e2eStats = stats(e2eDurations);

      console.log(`    SUMMARY (${trans.name}):`);
      console.log(`      layout-computation-and-position-application latency: min=${layoutStats.min}ms, max=${layoutStats.max}ms, median=${layoutStats.median}ms, mean=${layoutStats.mean}ms, range=${layoutStats.range}ms`);
      console.log(`      e2e click-to-completion latency: min=${e2eStats.min}ms, max=${e2eStats.max}ms, median=${e2eStats.median}ms, mean=${e2eStats.mean}ms, range=${e2eStats.range}ms`);

      projectResults.transitions[trans.targetMode] = {
        transitionName: trans.name,
        targetMode: trans.targetMode,
        warmupSamples,
        measuredSamples,
        layoutStats,
        e2eStats,
      };
    }

    fullResults.projects[proj.id] = projectResults;
  }

  // Memory Check
  const memoryInfo = await page.evaluate(() => {
    const perf = window.performance;
    if (perf && perf.memory) {
      return {
        usedJSHeapSizeMb: (perf.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
        totalJSHeapSizeMb: (perf.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2),
      };
    }
    return null;
  });

  fullResults.memoryInfo = memoryInfo;

  await browser.close();

  fs.writeFileSync(outputPath, JSON.stringify(fullResults, null, 2));

  console.log(`\nSaved raw results to ${outputPath}`);
  console.log(`=== BENCHMARK FOR ${targetProjectId.toUpperCase()} COMPLETE ===\n`);
}

runFormalBenchmark().catch((err) => {
  console.error('Fatal Benchmark Error:', err);
  process.exit(1);
});
