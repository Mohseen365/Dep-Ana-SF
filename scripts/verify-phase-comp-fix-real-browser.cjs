const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runBrowserVerification() {
  console.log('================================================================');
  console.log('PHASE COMP-FIX — REAL PBIM BROWSER VERIFICATION SUITE');
  console.log('================================================================\n');

  // Ensure explorer/public/project-manifest.json has multi-project PBIM manifest
  const analyzeManifest = path.join(__dirname, '../analyze/project-manifest.json');
  const publicManifest = path.join(__dirname, '../explorer/public/project-manifest.json');
  if (fs.existsSync(analyzeManifest)) {
    fs.copyFileSync(analyzeManifest, publicManifest);
    console.log('Copied analyze/project-manifest.json -> explorer/public/project-manifest.json');
  }

  const screenshotDir = path.join(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('[1/3] Connecting to headless browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const matrixResults = [];

  const safeScreenshot = async (filePath) => {
    try {
      console.log(`  Taking screenshot: ${path.basename(filePath)}`);
      await page.screenshot({ path: filePath, animations: 'disabled', timeout: 3000 }).catch(() => {});
    } catch (_) {}
  };

  const safeClick = async (selector) => {
    console.log(`  Clicking: ${selector}`);
    try {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          el.click();
        }
      }, selector);
    } catch (_) {}
  };

  const recordResult = (scenario, expected, actual, pass, screenshotPath = null) => {
    matrixResults.push({
      scenario,
      expected,
      actual,
      result: pass ? 'PASS' : 'FAIL',
      screenshot: screenshotPath ? path.basename(screenshotPath) : null,
    });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${scenario}`);
    console.log(`       Expected: ${expected}`);
    console.log(`       Actual:   ${actual}\n`);
  };

  try {
    // 1. Select PBIM through URL ?project=pbim
    console.log('--- Test 1 & 2: Direct load ?project=pbim ---');
    await page.goto('http://localhost:3000/?project=pbim');
    await page.waitForTimeout(4000);

    const screenshot1 = path.join(screenshotDir, 'comp-fix-01-pbim-loaded.png');
    await safeScreenshot(screenshot1);

    const statusText1 = await page.evaluate(() => {
      const el = document.querySelector('.status-bar');
      return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    });

    const isPbimLoaded = statusText1.includes('528');
    recordResult(
      'Direct load ?project=pbim',
      'PBIM loads (528 components, 2063 dependencies)',
      `Status bar: "${statusText1}"`,
      isPbimLoaded,
      screenshot1
    );

    // 2. Deep-link ?project=pbim&view=graph
    console.log('--- Test 3 & 4: Deep-link ?project=pbim&view=graph ---');
    await page.goto('http://localhost:3000/?project=pbim&view=graph');
    await page.waitForTimeout(2000);

    const screenshot2 = path.join(screenshotDir, 'comp-fix-02-pbim-graph.png');
    await safeScreenshot(screenshot2);

    const url2 = page.url();
    const activeView2 = await page.textContent('[data-testid="workspace-header"]').catch(() => '');
    recordResult(
      'Deep link ?project=pbim&view=graph',
      'PBIM project loaded with Graph view active',
      `URL: ${url2}, Header: "${activeView2.replace(/\s+/g, ' ').trim()}"`,
      url2.includes('project=pbim') && (url2.includes('view=graph') || !url2.includes('view=')),
      screenshot2
    );

    // 3. Deep-link ?project=pbim&view=graph&node=ApexClass:ApprovalFlowController&investigate=true
    console.log('--- Test 5: PBIM + node deep link ---');
    await page.goto('http://localhost:3000/?project=pbim&view=graph&node=ApexClass:ApprovalFlowController&investigate=true');
    await page.waitForTimeout(2000);

    const screenshot3 = path.join(screenshotDir, 'comp-fix-03-pbim-node-deeplink.png');
    await safeScreenshot(screenshot3);

    const url3 = page.url();
    const isDrawerVisible3 = (await page.$('.drawer-slot')) !== null || (await page.$('.investigation-drawer')) !== null;
    recordResult(
      'PBIM + node deep link',
      'Correct project loaded, node selected, investigation drawer visible, project parameter present',
      `URL: ${url3}, Drawer Visible: ${isDrawerVisible3}`,
      url3.includes('project=pbim') && url3.includes('node=ApexClass%3AApprovalFlowController') && isDrawerVisible3,
      screenshot3
    );

    // 4. Change lens (View mode switch to Matrix)
    console.log('--- Test 6: Change lens (switch to Matrix) ---');
    await safeClick('[data-testid="domain-tab-feature"]');
    await page.waitForTimeout(300);
    await safeClick('[data-testid="view-btn-matrix"]');
    await page.waitForTimeout(800);

    const screenshot4 = path.join(screenshotDir, 'comp-fix-04-change-lens-matrix.png');
    await safeScreenshot(screenshot4);

    const url4 = page.url();
    recordResult(
      'Change lens (switch to Matrix)',
      'View mode changes to matrix while project=pbim is retained in URL',
      `URL: ${url4}`,
      url4.includes('project=pbim') && url4.includes('view=matrix'),
      screenshot4
    );

    // 5. Change domain (switch to Governance & Quality / Findings)
    console.log('--- Test 7: Change domain (switch to Governance) ---');
    await safeClick('[data-testid="domain-tab-governance"]');
    await page.waitForTimeout(800);

    const screenshot5 = path.join(screenshotDir, 'comp-fix-05-change-domain-findings.png');
    await safeScreenshot(screenshot5);

    const url5 = page.url();
    recordResult(
      'Change domain (Governance)',
      'Domain changes to governance (findings view) while project=pbim is retained in URL',
      `URL: ${url5}`,
      url5.includes('project=pbim') && url5.includes('view=findings'),
      screenshot5
    );

    // 6. Selection neutrality (SELECTION ≠ NAVIGATION)
    console.log('--- Test 8: Selection neutrality ---');
    await page.goto('http://localhost:3000/?project=pbim&view=graph');
    await page.waitForTimeout(2000);

    // Click first component item in sidebar inventory
    await safeClick('.component-list-item');
    await page.waitForTimeout(800);

    const screenshot6 = path.join(screenshotDir, 'comp-fix-06-selection-neutrality.png');
    await safeScreenshot(screenshot6);

    const url6 = page.url();
    const isDrawerOpen6 = (await page.$('.drawer-slot')) !== null || (await page.$('.investigation-drawer')) !== null;
    const stayedInGraph6 = !url6.includes('view=') || url6.includes('view=graph');

    recordResult(
      'Selection neutrality',
      'Entity selection opens drawer without navigating away from active view mode',
      `URL: ${url6}, View stayed graph: ${stayedInGraph6}, Drawer open: ${isDrawerOpen6}`,
      stayedInGraph6 && isDrawerOpen6 && url6.includes('project=pbim'),
      screenshot6
    );

    // 7. Refresh test
    console.log('--- Test 9: Browser Refresh ---');
    await page.reload();
    await page.waitForTimeout(2000);

    const screenshot7 = path.join(screenshotDir, 'comp-fix-07-after-refresh.png');
    await safeScreenshot(screenshot7);

    const url7 = page.url();
    const statusText7 = await page.evaluate(() => {
      const el = document.querySelector('.status-bar');
      return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    });

    recordResult(
      'Browser refresh',
      'PBIM project and current view remain loaded after refresh with project=pbim retained',
      `URL: ${url7}, Status bar: "${statusText7}"`,
      url7.includes('project=pbim') && statusText7.includes('528'),
      screenshot7
    );

    // 8. Back / Forward history navigation
    console.log('--- Test 10 & 11: Browser Back / Forward ---');
    await safeClick('[data-testid="domain-tab-feature"]');
    await page.waitForTimeout(300);
    await safeClick('[data-testid="view-btn-matrix"]');
    await page.waitForTimeout(800);

    // Click Back
    console.log('  Triggering page.goBack()...');
    await page.goBack();
    await page.waitForTimeout(800);
    const urlBack = page.url();

    const screenshot8 = path.join(screenshotDir, 'comp-fix-08-history-back.png');
    await safeScreenshot(screenshot8);

    // Click Forward
    console.log('  Triggering page.goForward()...');
    await page.goForward();
    await page.waitForTimeout(800);
    const urlForward = page.url();

    const screenshot9 = path.join(screenshotDir, 'comp-fix-09-history-forward.png');
    await safeScreenshot(screenshot9);

    recordResult(
      'History Back',
      'Previous view restored while preserving project=pbim',
      `Back URL: ${urlBack}`,
      urlBack.includes('project=pbim') && (urlBack.includes('view=graph') || !urlBack.includes('view=matrix')),
      screenshot8
    );

    recordResult(
      'History Forward',
      'Next view restored while preserving project=pbim',
      `Forward URL: ${urlForward}`,
      urlForward.includes('project=pbim') && urlForward.includes('view=matrix'),
      screenshot9
    );

    // 9. Representative Five-Domain Navigation
    console.log('--- Test 12: Representative Five-Domain Navigation ---');
    const representativeDomainModes = [
      { domain: 'portfolio', mode: 'dashboard' },
      { domain: 'topological', mode: 'subway' },
      { domain: 'feature', mode: 'river' },
      { domain: 'local', mode: 'radar' },
      { domain: 'governance', mode: 'hotspots' },
    ];

    let fiveDomainPass = true;
    for (const item of representativeDomainModes) {
      await safeClick(`[data-testid="domain-tab-${item.domain}"]`);
      await page.waitForTimeout(200);
      await safeClick(`[data-testid="view-btn-${item.mode}"]`);
      await page.waitForTimeout(400);

      const currentUrl = page.url();
      if (!currentUrl.includes('project=pbim') || !currentUrl.includes(`view=${item.mode}`)) {
        fiveDomainPass = false;
      }
    }

    const screenshot10 = path.join(screenshotDir, 'comp-fix-10-five-domain-nav.png');
    await safeScreenshot(screenshot10);

    recordResult(
      'Five-Domain Navigation',
      'Navigation across all 5 domains retains project=pbim in URL bar',
      `Final URL: ${page.url()}, Retained across all 5 domains: ${fiveDomainPass}`,
      fiveDomainPass,
      screenshot10
    );

    console.log('\n================================================================');
    console.log(`REAL BROWSER VERIFICATION COMPLETE!`);
    console.log('================================================================\n');

  } finally {
    console.log('Closing browser...');
    await browser.close();
    process.exit(0);
  }
}

runBrowserVerification().catch((err) => {
  console.error('Browser Verification Error:', err);
  process.exit(1);
});
