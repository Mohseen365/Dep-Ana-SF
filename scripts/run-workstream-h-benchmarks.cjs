const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function stats(samples) {
  if (!samples || samples.length === 0) {
    return { min: 0, max: 0, median: 0, mean: 0, range: 0, p90: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = Math.round((sum / sorted.length) * 100) / 100;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
  const range = Math.round((max - min) * 100) / 100;
  const p90Idx = Math.min(Math.floor(sorted.length * 0.9), sorted.length - 1);
  const p90 = sorted[p90Idx];
  return { min, max, median, mean, range, p90 };
}

async function runWorkstreamHBenchmarks() {
  const targetProjectId = process.argv[2] || 'all';

  console.log('================================================================');
  console.log(`WORKSTREAM H — FORMAL BENCHMARK (Target: ${targetProjectId.toUpperCase()})`);
  console.log('================================================================\n');

  const reportsDir = path.join(__dirname, '..', 'audit-reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const outputPath = path.join(reportsDir, 'workstream_h_benchmark_results.json');
  let fullResults = {
    metadata: {
      timestamp: new Date().toISOString(),
      viewport: '1440x900',
      headless: true,
      repetitionsPerTransition: 3,
    },
    projects: {},
    pageErrors: [],
    consoleErrors: [],
  };

  if (fs.existsSync(outputPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      if (existing.projects) fullResults.projects = existing.projects;
    } catch (e) {}
  }

  const browser = await chromium.launch({ headless: true });
  fullResults.metadata.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const allProjects = [
    { id: 'default', name: 'Default (Small)', url: 'http://localhost:3000/?project=default' },
    { id: 'cloud-spend-tracker', name: 'Cloud Spend Tracker (Medium)', url: 'http://localhost:3000/?project=cloud-spend-tracker' },
    { id: 'pbim', name: 'PBIM (Large)', url: 'http://localhost:3000/?project=pbim' },
  ];

  const projectsToTest = targetProjectId === 'all'
    ? allProjects
    : allProjects.filter(p => p.id === targetProjectId);

  const modeOrder = ['hybrid', 'orbit', 'constellation', 'hierarchical'];

  for (const proj of projectsToTest) {
    console.log(`================================================================`);
    console.log(`BENCHMARKING PROJECT: ${proj.name} (${proj.id})`);
    console.log(`================================================================`);

    const page = await context.newPage();
    page.on('pageerror', (err) => fullResults.pageErrors.push(`[${proj.id}] ${err.message || String(err)}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') fullResults.consoleErrors.push(`[${proj.id}] ${msg.text()}`);
    });

    try {
      // 1. Initial Load Latency
      const navStart = Date.now();
      await page.goto(proj.url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.app-layout', { timeout: 60000 });
      await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 60000 });
      const initialLoadMs = Date.now() - navStart;

      const sourceMetrics = await page.evaluate(() => {
        const cy = window.__CY__;
        return {
          nodes: cy ? cy.nodes().length : 0,
          edges: cy ? cy.edges().length : 0,
          lwcCount: cy ? cy.nodes().filter(n => n.data('type') === 'LWC').length : 0,
          visibleNodes: cy ? cy.nodes(':visible').length : 0,
          visibleEdges: cy ? cy.edges(':visible').length : 0,
        };
      });

      console.log(`  Initial Load Latency: ${initialLoadMs} ms`);
      console.log(`  Source Graph: ${sourceMetrics.nodes} nodes / ${sourceMetrics.edges} edges (LWCs: ${sourceMetrics.lwcCount})`);

      const projectData = {
        id: proj.id,
        name: proj.name,
        initialLoadMs,
        sourceMetrics,
        modeTransitions: {},
        searchFiltering: {},
      };

      // 2. Mode Switches (3 cycles)
      console.log(`\n  --- Benchmarking Architecture Mode Transitions (3 Cycles) ---`);

      for (const targetMode of modeOrder) {
        projectData.modeTransitions[targetMode] = { samples: [] };
      }

      for (let cycle = 0; cycle < 3; cycle++) {
        console.log(`  Cycle ${cycle + 1}/3:`);
        for (const targetMode of modeOrder) {
          const runResult = await page.evaluate(({ targetMode }) => {
            return new Promise((resolve) => {
              const tStart = performance.now();
              let ackTime = null;
              const initialReqId = (window.__LAST_LAYOUT_COMPLETED__ && window.__LAST_LAYOUT_COMPLETED__.requestId) || 0;

              const handler = (evt) => {
                const detail = evt.detail || {};
                if (detail.architectureMode !== targetMode) return;
                if (typeof detail.requestId === 'number' && detail.requestId <= initialReqId) return;

                window.removeEventListener('app:layoutcomplete', handler);
                const tEnd = performance.now();
                const cy = window.__CY__;

                resolve({
                  e2eMs: Math.round(tEnd - tStart),
                  ackMs: ackTime ? Math.round(ackTime - tStart) : null,
                  durationMs: detail.durationMs,
                  outcome: detail.outcome,
                  architectureMode: detail.architectureMode,
                  nodeCount: detail.nodeCount,
                  edgeCount: detail.edgeCount,
                  visibleNodes: cy ? cy.nodes(':visible').length : 0,
                  visibleEdges: cy ? cy.edges(':visible').length : 0,
                });
              };

              window.addEventListener('app:layoutcomplete', handler);

              setTimeout(() => {
                window.removeEventListener('app:layoutcomplete', handler);
                resolve({ error: `timeout-waiting-for-${targetMode}` });
              }, 60000);

              const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
              if (btn) {
                btn.click();
                ackTime = performance.now();
              } else {
                window.removeEventListener('app:layoutcomplete', handler);
                resolve({ error: 'toggle-button-not-found' });
              }
            });
          }, { targetMode });

          if (runResult.error) {
            console.error(`    -> Mode ${targetMode} FAILED: ${runResult.error}`);
          } else {
            console.log(`    -> Target ${targetMode}: layout-latency ${runResult.durationMs}ms | e2e ${runResult.e2eMs}ms | visible: ${runResult.visibleNodes}/${runResult.visibleEdges}`);
            projectData.modeTransitions[targetMode].samples.push(runResult);
          }
          await page.waitForTimeout(50);
        }
      }

      // Compute statistics for mode transitions
      for (const mode of modeOrder) {
        const samples = projectData.modeTransitions[mode].samples;
        const layoutDurations = samples.map(s => s.durationMs);
        const e2eDurations = samples.map(s => s.e2eMs);
        projectData.modeTransitions[mode].layoutStats = stats(layoutDurations);
        projectData.modeTransitions[mode].e2eStats = stats(e2eDurations);
      }

      // 3. Search Filtering Latency
      console.log(`\n  --- Benchmarking Search Filtering ---`);
      const searchQueries = ['Service', 'Account', 'Test'];
      for (const query of searchQueries) {
        const queryResult = await page.evaluate(async (q) => {
          const input = document.querySelector('input[placeholder*="Search"], input[type="text"]');
          if (!input) return { error: 'search-input-not-found' };

          const tStart = performance.now();
          input.value = q;
          input.dispatchEvent(new Event('input', { bubbles: true }));

          await new Promise(r => setTimeout(r, 100));
          const tEnd = performance.now();

          const cy = window.__CY__;
          return {
            query: q,
            latencyMs: Math.round(tEnd - tStart),
            visibleNodes: cy ? cy.nodes(':visible').length : 0,
            visibleEdges: cy ? cy.edges(':visible').length : 0,
          };
        }, query);

        await page.evaluate(() => {
          const input = document.querySelector('input[placeholder*="Search"], input[type="text"]');
          if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });

        console.log(`    Query "${query}": ${queryResult.latencyMs} ms (Visible Nodes: ${queryResult.visibleNodes})`);
        projectData.searchFiltering[query] = queryResult;
      }

      // 4. Memory Footprint
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
      projectData.memoryInfo = memoryInfo;
      console.log(`  JS Heap Memory: ${memoryInfo ? `${memoryInfo.usedJSHeapSizeMb} MB / ${memoryInfo.totalJSHeapSizeMb} MB` : 'N/A'}`);

      fullResults.projects[proj.id] = projectData;
    } finally {
      await page.close();
    }
  }

  await browser.close();

  fs.writeFileSync(outputPath, JSON.stringify(fullResults, null, 2));
  console.log(`\n================================================================`);
  console.log(`Saved Workstream H benchmark results for ${targetProjectId} to ${outputPath}`);
  console.log(`================================================================\n`);
}

runWorkstreamHBenchmarks().catch((err) => {
  console.error('Fatal Benchmark Suite Error:', err);
  process.exit(1);
});
