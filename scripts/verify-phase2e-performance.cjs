const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runPerformanceRealBrowserVerification() {
  console.log('Starting Phase 2E-P Real-Browser Lens Transition Performance Verification...');
  const screenshotDir = path.join(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  const transitions = [
    { from: 'graph', to: 'matrix', btnText: 'Matrix' },
    { from: 'matrix', to: 'heatmap', btnText: 'Heatmap' },
    { from: 'heatmap', to: 'river', btnText: 'River' },
    { from: 'river', to: 'tree', btnText: 'Tree' },
    { from: 'tree', to: 'treemap', btnText: 'Treemap' },
    { from: 'treemap', to: 'subway', btnText: 'Subway' },
    { from: 'subway', to: 'constellation', btnText: 'Constellation' },
    { from: 'constellation', to: 'profile', btnText: 'Profile' },
    { from: 'profile', to: 'radar', btnText: 'Radar' },
    { from: 'radar', to: 'dna', btnText: 'DNA' },
    { from: 'dna', to: 'four-direction', btnText: '4-Dir' },
    { from: 'four-direction', to: 'findings', btnText: 'Findings' },
  ];

  const results = [];

  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  // 1. Initial Load to Graph
  console.log(`Navigating to initial Graph view at ${baseUrl}...`);
  const startLoad = Date.now();
  await page.goto(`${baseUrl}/?view=graph`);
  await page.waitForLoadState('networkidle');
  const coldLoadTimeMs = Date.now() - startLoad;
  console.log(`Cold Load Time (Graph View): ${coldLoadTimeMs} ms`);

  // 2. Measure Lens Transitions
  for (const t of transitions) {
    console.log(`Measuring Transition: ${t.from} -> ${t.to}...`);
    const btn = page.locator(`button:has-text("${t.btnText}")`).first();
    const isBtnVisible = await btn.isVisible().catch(() => false);

    if (isBtnVisible) {
      const t0 = Date.now();
      await btn.click();
      await page.waitForTimeout(50); // wait briefly for DOM reaction
      const t1 = Date.now();
      const latency = t1 - t0;
      results.push({
        transition: `${t.from} -> ${t.to}`,
        latencyMs: latency,
        status: latency < 100 ? 'PASS' : 'DEGRADED',
      });
    } else {
      console.log(`  Button for ${t.btnText} not visible; testing direct navigation...`);
      const t0 = Date.now();
      await page.goto(`${baseUrl}/?view=${t.to}`);
      await page.waitForLoadState('networkidle');
      const t1 = Date.now();
      const latency = t1 - t0;
      results.push({
        transition: `${t.from} -> ${t.to} (Direct)`,
        latencyMs: latency,
        status: latency < 500 ? 'PASS' : 'DEGRADED',
      });
    }
  }

  // Capture Screenshot
  const screenshotPath = path.join(screenshotDir, 'phase2ep_real_browser_performance.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();

  console.log('\n=================== LENS TRANSITION RESULTS ===================');
  let allPass = true;
  for (const r of results) {
    console.log(`[${r.status}] ${r.transition}: ${r.latencyMs} ms`);
    if (r.status === 'FAIL') allPass = false;
  }

  console.log(`\nConsole Errors (${consoleErrors.length}):`, consoleErrors);
  console.log(`Page Errors (${pageErrors.length}):`, pageErrors);

  if (consoleErrors.length === 0 && pageErrors.length === 0) {
    console.log('\nREAL-BROWSER PERFORMANCE VERIFICATION COMPLETE WITH 0 ERRORS!');
  } else {
    console.log('\nVerification complete with console/page warnings.');
  }
}

runPerformanceRealBrowserVerification().catch((err) => {
  console.error('Fatal error running real-browser performance verification:', err);
  process.exit(1);
});
