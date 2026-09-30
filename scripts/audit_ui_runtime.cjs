const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function auditRuntime() {
  console.log('=== ARCHITECTURE EXPLORER UI DETAILED RUNTIME AUDIT ===');

  const screenshotDir = path.join(__dirname, '../audit-evidence/ui_audit_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const logEvents = [];

  // Desktop context
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      logEvents.push({ type: 'console-error', text: msg.text() });
    }
  });

  page.on('pageerror', err => {
    logEvents.push({ type: 'page-error', text: err.message });
  });

  console.log('1. Loading Initial Desktop Application (Graph Mode)...');
  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(screenshotDir, 'desktop_01_initial.png') });

  // Measure Header structure
  const headerBox = await page.locator('[data-testid="app-header"]').boundingBox();
  console.log('Header bounding box:', headerBox);

  // Check Sidebar
  const sidebarBox = await page.locator('[data-testid="component-sidebar"]').boundingBox();
  console.log('Sidebar bounding box:', sidebarBox);

  // Check ViewModeSwitcher
  const switcherBox = await page.locator('[data-testid="view-mode-switcher"]').boundingBox();
  console.log('ViewModeSwitcher bounding box:', switcherBox);

  // 2. Click a node in sidebar to open InvestigationDrawer
  console.log('2. Selecting component in sidebar...');
  const firstNode = page.locator('.component-list-item').first();
  if (await firstNode.count() > 0) {
    await firstNode.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotDir, 'desktop_02_drawer_open.png') });
  }

  const drawerBox = await page.locator('[data-testid="investigation-drawer"]').boundingBox();
  console.log('InvestigationDrawer bounding box:', drawerBox);

  // Check if clicking node caused navigation (URL change or mode change)
  console.log('Current URL after selection:', page.url());

  // Close drawer
  const closeBtn = page.locator('.drawer-close-btn');
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // 3. Test all 12 Lenses + 6 Surfaces in ViewModeSwitcher
  const allModes = [
    'graph', 'subway', 'constellation', 'tree', 'treemap',
    'matrix', 'heatmap', 'river', 'dna',
    'profile', 'radar', 'four-direction',
    'dashboard', 'compare', 'history', 'findings', 'hotspots', 'diagnostics'
  ];

  console.log('\n3. Testing view mode transitions across all 18 registered modes...');
  const modeResults = {};
  for (const mode of allModes) {
    const btn = page.locator(`[data-testid="view-btn-${mode}"]`);
    if (await btn.count() > 0) {
      await btn.click({ force: true });
      await page.waitForTimeout(300);
      const url = page.url();
      const screenshotName = `desktop_mode_${mode}.png`;
      await page.screenshot({ path: path.join(screenshotDir, screenshotName) });
      modeResults[mode] = { visible: true, url };
      console.log(` Mode '${mode}': PASS (URL: ${url})`);
    } else {
      modeResults[mode] = { visible: false };
      console.log(` Mode '${mode}': BUTTON NOT FOUND`);
    }
  }

  // 4. Test Compact / Responsive Viewports
  console.log('\n4. Testing Compact Viewport (768x1024)...');
  const compactContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const compactPage = await compactContext.newPage();
  await compactPage.goto('http://localhost:3000/?view=graph');
  await compactPage.waitForLoadState('networkidle');
  await compactPage.screenshot({ path: path.join(screenshotDir, 'compact_01_graph.png') });

  // Open drawer on compact
  const compactFirstNode = compactPage.locator('.component-list-item').first();
  if (await compactFirstNode.count() > 0) {
    await compactFirstNode.click();
    await compactPage.waitForTimeout(300);
    await compactPage.screenshot({ path: path.join(screenshotDir, 'compact_02_drawer_open.png') });
  }

  await compactContext.close();
  await context.close();
  await browser.close();

  console.log('\n--- CONSOLE / PAGE ERRORS ---');
  console.log(`Total errors captured: ${logEvents.length}`);
  for (const err of logEvents) {
    console.log(`[${err.type}]: ${err.text}`);
  }

  fs.writeFileSync(
    path.join(__dirname, '../audit-evidence/ui_audit_runtime_results.json'),
    JSON.stringify({ modeResults, logEvents, timestamp: new Date().toISOString() }, null, 2)
  );
  console.log('\nDetailed runtime evidence saved.');
}

auditRuntime().catch(err => {
  console.error('Error during detailed audit:', err);
  process.exit(1);
});
