const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runRealBrowserVerification() {
  console.log('=== REAL-BROWSER RUNTIME VALIDATION & LAYOUT SMOKE TEST ===\n');

  const screenshotsDir = path.resolve(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('pageerror', (err) => {
    const msg = err.message || String(err);
    console.error('  PAGE ERROR:', msg);
    pageErrors.push(msg);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('  CONSOLE ERROR:', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', (req) => {
    console.error('  FAILED REQUEST:', req.url(), req.failure()?.errorText);
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  const safeScreenshot = async (outPath) => {
    try {
      const base64Jpg = await page.evaluate(() => {
        const cy = window.__CY__;
        if (!cy) return null;
        return cy.jpg({ output: 'base64', scale: 0.5, bg: '#0f172a' });
      });
      if (base64Jpg) {
        fs.writeFileSync(outPath, Buffer.from(base64Jpg, 'base64'));
        console.log(`    [SCREENSHOT SAVED] ${path.basename(outPath)}`);
      } else {
        await page.screenshot({ path: outPath, timeout: 5000, animations: 'disabled' });
        console.log(`    [PAGE SCREENSHOT SAVED] ${path.basename(outPath)}`);
      }
    } catch (e) {
      console.warn(`    [SCREENSHOT NOTE] ${path.basename(outPath)}: ${e.message}`);
    }
  };

  console.log('[1] Navigating to http://localhost:3000/?project=pbim...');
  const navStart = Date.now();
  const response = await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`    Navigation completed in ${Date.now() - navStart} ms with HTTP ${response.status()}`);

  console.log('[2] Waiting for .app-layout to mount and render...');
  const appStart = Date.now();
  await page.waitForSelector('.app-layout', { timeout: 180000 });
  await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 180000 });
  console.log(`    App DOM ready in ${Date.now() - appStart} ms`);

  // Check DOM Elements (Phase 4 requirements)
  const domAudit = await page.evaluate(() => {
    const appLayout = document.querySelector('.app-layout');
    const domainLensesBar = document.querySelector('.domain-lenses-bar');
    const graphControlsFloating = document.querySelector('.graph-controls-floating');
    const modeToggle = document.querySelector('[data-testid="architecture-mode-toggle"]');
    const modeIndicator = document.querySelector('[data-testid="graph-mode-indicator"]');
    const activeControlBtn = document.querySelector('.graph-control-btn.active');

    const cy = window.__CY__;
    const nodeCount = cy ? cy.nodes().length : 0;
    const edgeCount = cy ? cy.edges().length : 0;

    return {
      appLayoutExists: Boolean(appLayout),
      domainLensesBarExists: Boolean(domainLensesBar),
      graphControlsFloatingExists: Boolean(graphControlsFloating),
      modeToggleExists: Boolean(modeToggle),
      modeIndicatorText: modeIndicator ? modeIndicator.textContent.trim() : null,
      activeControlTitle: activeControlBtn ? activeControlBtn.getAttribute('title') : null,
      nodeCount,
      edgeCount,
    };
  });

  console.log('\n[3] Phase 4 — Initial DOM & Canvas State Audit:');
  console.log('    .app-layout exists:', domAudit.appLayoutExists);
  console.log('    .domain-lenses-bar exists:', domAudit.domainLensesBarExists);
  console.log('    .graph-controls-floating exists:', domAudit.graphControlsFloatingExists);
  console.log('    data-testid="architecture-mode-toggle" exists:', domAudit.modeToggleExists);
  console.log('    [data-testid="graph-mode-indicator"] text:', domAudit.modeIndicatorText);
  console.log('    Active Control Title:', domAudit.activeControlTitle);
  console.log('    Cytoscape Nodes:', domAudit.nodeCount, '| Edges:', domAudit.edgeCount);

  await safeScreenshot(path.join(screenshotsDir, '01_initial_pbim_hierarchical.jpg'));

  // Phase 5 — Layout Transition Cycle
  console.log('\n[4] Phase 5 — Minimal Layout Transition Cycle:');

  const modesToCycle = [
    { target: 'hybrid', expectedKeyword: 'Hybrid', screenshotName: '02_pbim_hybrid.jpg' },
    { target: 'orbit', expectedKeyword: 'Orbit', screenshotName: '03_pbim_orbit.jpg' },
    { target: 'constellation', expectedKeyword: 'Constellation', screenshotName: '04_pbim_constellation.jpg' },
    { target: 'hierarchical', expectedKeyword: 'Hierarchical', screenshotName: '05_pbim_hierarchical_returned.jpg' },
  ];

  const cycleResults = [];

  for (const step of modesToCycle) {
    console.log(`\n  ---> Clicking architecture mode toggle to switch to ${step.target.toUpperCase()}...`);
    const t0 = Date.now();

    // Perform safe click via page.evaluate
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      if (btn) btn.click();
    });

    // Wait for the indicator text to update to include expectedKeyword
    await page.waitForFunction(
      (kw) => {
        const ind = document.querySelector('[data-testid="graph-mode-indicator"]');
        return ind && ind.textContent.includes(kw);
      },
      step.expectedKeyword,
      { timeout: 30000 }
    );

    const elapsed = Date.now() - t0;

    const stepAudit = await page.evaluate(() => {
      const modeIndicator = document.querySelector('[data-testid="graph-mode-indicator"]');
      const toggleBtn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      const cy = window.__CY__;

      return {
        indicatorText: modeIndicator ? modeIndicator.textContent.trim() : null,
        toggleTitle: toggleBtn ? toggleBtn.getAttribute('title') : null,
        toggleAriaLabel: toggleBtn ? toggleBtn.getAttribute('aria-label') : null,
        isActiveClassPresent: toggleBtn ? toggleBtn.classList.contains('active') : false,
        visibleNodeCount: cy ? cy.nodes().filter(n => n.visible()).length : 0,
        visibleEdgeCount: cy ? cy.edges().filter(e => e.visible()).length : 0,
        totalNodeCount: cy ? cy.nodes().length : 0,
        totalEdgeCount: cy ? cy.edges().length : 0,
      };
    });

    console.log(`      Transition completed in: ${elapsed} ms`);
    console.log(`      Indicator Text: "${stepAudit.indicatorText}"`);
    console.log(`      Toggle Title: "${stepAudit.toggleTitle}"`);
    console.log(`      Toggle Aria-Label: "${stepAudit.toggleAriaLabel}"`);
    console.log(`      Toggle Active Class: ${stepAudit.isActiveClassPresent}`);
    console.log(`      Visible Nodes: ${stepAudit.visibleNodeCount} / Total: ${stepAudit.totalNodeCount}`);
    console.log(`      Visible Edges: ${stepAudit.visibleEdgeCount} / Total: ${stepAudit.totalEdgeCount}`);

    const ssPath = path.join(screenshotsDir, step.screenshotName);
    await safeScreenshot(ssPath);

    cycleResults.push({
      targetMode: step.target,
      elapsedMs: elapsed,
      stepAudit,
    });
  }

  console.log('\n[5] Real-Browser Audit Summary:');
  console.log('    Page Errors Count:', pageErrors.length);
  console.log('    Console Errors Count:', consoleErrors.length);
  console.log('    Failed Requests Count:', failedRequests.length);

  await browser.close();

  const success = pageErrors.length === 0 && domAudit.appLayoutExists && domAudit.modeToggleExists;
  if (!success) {
    console.error('\nREAL BROWSER VERIFICATION FAILED');
    process.exit(1);
  }

  console.log('\n=== REAL-BROWSER VERIFICATION PASSED SUCCESSFULLY ===');
}

runRealBrowserVerification().catch((err) => {
  console.error('Fatal Browser Error:', err);
  process.exit(1);
});
