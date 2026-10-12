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

async function runPBIMPartialCycles() {
  const startCycle = parseInt(process.argv[2] || '0', 10);
  const endCycle = parseInt(process.argv[3] || '2', 10);

  console.log('================================================================');
  console.log(`BENCHMARKING PBIM CYCLES ${startCycle} TO ${endCycle}`);
  console.log('================================================================\n');

  const reportsDir = path.join(__dirname, '..', 'audit-reports');
  const outputPath = path.join(reportsDir, 'formal_multi_run_benchmark_results.json');

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

  console.log(`Loading ${proj.name}...`);
  const navStart = Date.now();
  await page.goto(proj.url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.app-layout', { timeout: 180000 });
  await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 180000 });
  const initialLoadMs = Date.now() - navStart;

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

  if (!fullResults.projects.pbim) {
    fullResults.projects.pbim = {
      id: proj.id,
      name: proj.name,
      initialLoadMs,
      sourceMetrics,
      transitions: {
        hybrid: { transitionName: 'Hierarchical -> Hybrid', targetMode: 'hybrid', warmupSamples: [], measuredSamples: [] },
        orbit: { transitionName: 'Hybrid -> Orbit', targetMode: 'orbit', warmupSamples: [], measuredSamples: [] },
        constellation: { transitionName: 'Orbit -> Constellation', targetMode: 'constellation', warmupSamples: [], measuredSamples: [] },
        hierarchical: { transitionName: 'Constellation -> Hierarchical', targetMode: 'hierarchical', warmupSamples: [], measuredSamples: [] },
      },
    };
  }

  const modeTransitions = [
    { targetMode: 'hybrid', name: 'Hierarchical -> Hybrid' },
    { targetMode: 'orbit', name: 'Hybrid -> Orbit' },
    { targetMode: 'constellation', name: 'Orbit -> Constellation' },
    { targetMode: 'hierarchical', name: 'Constellation -> Hierarchical' },
  ];

  for (let cycleIdx = startCycle; cycleIdx <= endCycle; cycleIdx++) {
    const isWarmup = cycleIdx === 0;
    const cycleLabel = isWarmup ? 'Warmup Cycle' : `Cycle ${cycleIdx}`;
    console.log(`\n=== STARTING ${cycleLabel.toUpperCase()} ===`);

    for (const trans of modeTransitions) {
      const runResult = await page.evaluate((targetMode) => {
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

          const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
          if (btn) {
            btn.click();
            ackTime = performance.now();
          } else {
            cleanup();
            resolve({ error: 'toggle-button-not-found' });
          }
        });
      }, trans.targetMode);

      if (runResult.error) {
        console.error(`  [${cycleLabel}] ${trans.name} FAILED: ${runResult.error}`);
        continue;
      }

      const sample = {
        runLabel: isWarmup ? 'Warm-up' : `Run ${cycleIdx}`,
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
        fullResults.projects.pbim.transitions[trans.targetMode].warmupSamples.push(sample);
      } else {
        fullResults.projects.pbim.transitions[trans.targetMode].measuredSamples.push(sample);
      }

      console.log(`  [${cycleLabel}] ${trans.name} -> layout: ${sample.durationMs}ms | e2e: ${sample.e2eMs}ms | visible: ${sample.visibleNodes}/${sample.visibleEdges}`);
      await page.waitForTimeout(100);
    }
  }

  // Recalculate statistics for each transition
  for (const targetMode of Object.keys(fullResults.projects.pbim.transitions)) {
    const data = fullResults.projects.pbim.transitions[targetMode];
    const layoutDurations = data.measuredSamples.map(s => s.durationMs);
    const e2eDurations = data.measuredSamples.map(s => s.e2eMs);

    data.layoutStats = stats(layoutDurations);
    data.e2eStats = stats(e2eDurations);

    console.log(`\nPBIM SUMMARY (${data.transitionName}) [Measured samples: ${data.measuredSamples.length}]:`);
    console.log(`  layout-computation-and-position-application latency: min=${data.layoutStats.min}ms, max=${data.layoutStats.max}ms, median=${data.layoutStats.median}ms, mean=${data.layoutStats.mean}ms, range=${data.layoutStats.range}ms`);
    console.log(`  e2e click-to-completion latency: min=${data.e2eStats.min}ms, max=${data.e2eStats.max}ms, median=${data.e2eStats.median}ms, mean=${data.e2eStats.mean}ms, range=${data.e2eStats.range}ms`);
  }

  await browser.close();

  fs.writeFileSync(outputPath, JSON.stringify(fullResults, null, 2));
  console.log(`\nSaved updated results to ${outputPath}`);
  console.log(`=== PBIM CYCLES ${startCycle}-${endCycle} COMPLETE ===\n`);
}

runPBIMPartialCycles().catch((err) => {
  console.error('Fatal PBIM Benchmark Error:', err);
  process.exit(1);
});
