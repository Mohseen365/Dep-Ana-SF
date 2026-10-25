const { chromium } = require('playwright');

async function runPerformanceMatrix() {
  console.log('=== PHASE 6: PERFORMANCE & STABILITY MEASUREMENTS MATRIX ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('pageerror', (err) => pageErrors.push(err.message || String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const projectsToTest = [
    { id: 'default', name: 'Default (Small)', url: 'http://localhost:3000/?project=default' },
    { id: 'cloud-spend-tracker', name: 'Cloud Spend Tracker (Medium)', url: 'http://localhost:3000/?project=cloud-spend-tracker' },
    { id: 'pbim', name: 'PBIM (Large)', url: 'http://localhost:3000/?project=pbim' },
  ];

  const resultsMatrix = {};

  for (const proj of projectsToTest) {
    console.log(`================================================================`);
    console.log(`TESTING DATASET TIER: ${proj.name} (${proj.id})`);
    console.log(`================================================================`);

    await page.goto(proj.url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.app-layout', { timeout: 180000 });

    const initialMetrics = await page.evaluate(() => {
      const cy = window.__CY__;
      return {
        nodes: cy ? cy.nodes().length : 0,
        edges: cy ? cy.edges().length : 0,
        lwcCount: cy ? cy.nodes().filter(n => n.data('type') === 'LWC').length : 0,
      };
    });

    console.log(`  Confirmed Loaded Graph: ${initialMetrics.nodes} nodes / ${initialMetrics.edges} edges (LWCs: ${initialMetrics.lwcCount})`);

    const modeTimings = {};
    const cycleCount = proj.id === 'default' ? 2 : 4; // default dataset has 0 LWCs so 2 modes (Hierarchical, Hybrid)

    for (let modeIdx = 0; modeIdx < cycleCount; modeIdx++) {
      // 1. Ensure we are on the 'graph' view mode so the graph canvas and controls are rendered
      await page.evaluate(() => {
        const graphTab = document.querySelector('[data-testid="nav-graph"]');
        if (graphTab) graphTab.click();
      });
      await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 10000 }).catch(() => {});

      // 2. Install observer before triggering mode toggle click
      const completionPromise = page.evaluate(() => {
        return new Promise((resolve) => {
          const handler = (evt) => {
            window.removeEventListener('app:layoutcomplete', handler);
            resolve(evt.detail);
          };
          window.addEventListener('app:layoutcomplete', handler);

          const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
          if (btn) {
            btn.click();
          } else {
            window.removeEventListener('app:layoutcomplete', handler);
            resolve({ error: 'toggle-button-not-found' });
          }
        });
      });

      // Await the matching completion event or timeout (60s limit for large layouts)
      const completionResult = await Promise.race([
        completionPromise,
        new Promise((resolve) => setTimeout(() => resolve({ error: 'timeout-exceeded-60s' }), 60000)),
      ]);

      // Small delay between mode steps to allow DOM/state settlement
      await page.waitForTimeout(100);

      const currentModeText = await page.evaluate(() => {
        return document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim();
      });

      if (completionResult.error) {
        console.error(`  Cycle Step ${modeIdx + 1} FAILED: ${completionResult.error}`);
        modeTimings[`step_${modeIdx + 1}`] = {
          modeText: currentModeText,
          error: completionResult.error,
        };
      } else {
        console.log(`  Cycle Step ${modeIdx + 1}: ${completionResult.architectureMode} (duration ${completionResult.durationMs}ms, outcome: ${completionResult.outcome}, nodes: ${completionResult.nodeCount}, edges: ${completionResult.edgeCount})`);

        modeTimings[`step_${modeIdx + 1}`] = {
          modeText: currentModeText,
          architectureMode: completionResult.architectureMode,
          durationMs: completionResult.durationMs,
          outcome: completionResult.outcome,
          nodeCount: completionResult.nodeCount,
          edgeCount: completionResult.edgeCount,
          requestId: completionResult.requestId,
        };
      }
    }

    resultsMatrix[proj.id] = {
      project: proj.name,
      nodes: initialMetrics.nodes,
      edges: initialMetrics.edges,
      lwcCount: initialMetrics.lwcCount,
      timings: modeTimings,
    };
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

  console.log('\n[MEMORY & STABILITY AUDIT]');
  if (memoryInfo) {
    console.log(`  Used JS Heap: ${memoryInfo.usedJSHeapSizeMb} MB / Total: ${memoryInfo.totalJSHeapSizeMb} MB`);
  } else {
    console.log('  V8 Performance Memory API not exposed in container browser profile.');
  }
  console.log(`  Page Errors Count: ${pageErrors.length}`);
  console.log(`  Console Errors Count: ${consoleErrors.length}`);

  await browser.close();

  console.log('\n=== PERFORMANCE MATRIX COMPLETE ===');
}

runPerformanceMatrix().catch((err) => {
  console.error('Fatal Performance Matrix Error:', err);
  process.exit(1);
});
