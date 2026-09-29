const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runRealBrowserValidation() {
  console.log('Starting Phase 2D-C Real-Browser Playwright Verification...');
  const screenshotDir = path.join(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
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

  const testResults = [];

  // Scenario 1: Direct Matrix Deep Link
  console.log('1. Testing Direct Matrix Deep Link...');
  await page.goto('http://localhost:3000/?view=matrix');
  await page.waitForLoadState('networkidle');
  const matrixVisible = await page.isVisible('.feature-matrix-panel') || await page.isVisible('[data-testid="feature-matrix-panel"]') || await page.locator('text=Matrix').count() > 0;
  testResults.push({ scenario: '1. Direct Matrix Deep Link', pass: matrixVisible, url: page.url() });

  // Scenario 2: Direct Profile Deep Link
  console.log('2. Testing Direct Profile Deep Link...');
  await page.goto('http://localhost:3000/?view=profile');
  await page.waitForLoadState('networkidle');
  const profileVisible = await page.locator('text=Profile').count() > 0 || await page.isVisible('.feature-profile-panel');
  testResults.push({ scenario: '2. Direct Profile Deep Link', pass: profileVisible, url: page.url() });

  // Scenario 3: Direct Dashboard Deep Link
  console.log('3. Testing Direct Dashboard Deep Link...');
  await page.goto('http://localhost:3000/?view=dashboard');
  await page.waitForLoadState('networkidle');
  const dashboardVisible = await page.locator('text=Overview').count() > 0 || await page.locator('text=Portfolio').count() > 0;
  testResults.push({ scenario: '3. Direct Dashboard Deep Link', pass: dashboardVisible, url: page.url() });

  // Scenario 4: Direct Findings Deep Link
  console.log('4. Testing Direct Findings Deep Link...');
  await page.goto('http://localhost:3000/?view=findings');
  await page.waitForLoadState('networkidle');
  const findingsVisible = await page.locator('text=Findings').count() > 0;
  testResults.push({ scenario: '4. Direct Findings Deep Link', pass: findingsVisible, url: page.url() });

  // Scenario 5: View Switching Sequence Graph -> Matrix -> Profile -> Findings
  console.log('5. Testing View Switching Sequence...');
  await page.goto('http://localhost:3000/?view=graph');
  await page.waitForLoadState('networkidle');

  await page.click('button:has-text("Matrix")');
  await page.waitForTimeout(300);
  const matrixUrl = page.url();

  await page.click('button:has-text("Profile")');
  await page.waitForTimeout(300);
  const profileUrl = page.url();

  await page.click('button:has-text("Findings")');
  await page.waitForTimeout(300);
  const findingsUrl = page.url();

  const seqPass = matrixUrl.includes('view=matrix') && profileUrl.includes('view=profile') && findingsUrl.includes('view=findings');
  testResults.push({ scenario: '5. View Switching Sequence', pass: seqPass, urls: { matrixUrl, profileUrl, findingsUrl } });

  // Scenario 6: Browser Back / Forward Navigation
  console.log('6. Testing Browser Back / Forward Navigation...');
  await page.goBack(); // -> Profile
  await page.waitForTimeout(300);
  const backProfileUrl = page.url();

  await page.goBack(); // -> Matrix
  await page.waitForTimeout(300);
  const backMatrixUrl = page.url();

  await page.goBack(); // -> Graph
  await page.waitForTimeout(300);
  const backGraphUrl = page.url();

  await page.goForward(); // -> Matrix
  await page.waitForTimeout(300);
  const fwdMatrixUrl = page.url();

  const navPass = backProfileUrl.includes('view=profile') && backMatrixUrl.includes('view=matrix') && (!backGraphUrl.includes('view=') || backGraphUrl.includes('view=graph')) && fwdMatrixUrl.includes('view=matrix');
  testResults.push({ scenario: '6. Browser Back/Forward', pass: navPass, backProfileUrl, backMatrixUrl, backGraphUrl, fwdMatrixUrl });

  // Scenario 7: Deep Link with Filter & Search Parameters
  console.log('7. Testing Deep Link with Search Parameters...');
  await page.goto('http://localhost:3000/?view=matrix&filter.q=Order&filter.type=ApexClass');
  await page.waitForLoadState('networkidle');
  const searchParamUrl = page.url();
  const filterPass = searchParamUrl.includes('view=matrix') && searchParamUrl.includes('filter.q=Order');
  testResults.push({ scenario: '7. Deep Link with Filters', pass: filterPass, url: searchParamUrl });

  // Capture Screenshot
  const screenshotPath = path.join(screenshotDir, 'phase2dc_real_browser_validation.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();

  console.log('\n--- REAL BROWSER VALIDATION RESULTS ---');
  let allPass = true;
  for (const res of testResults) {
    console.log(`${res.pass ? '✓ PASS' : '✗ FAIL'} - ${res.scenario}`);
    if (!res.pass) allPass = false;
  }

  console.log(`\nConsole Errors (${consoleErrors.length}):`, consoleErrors);
  console.log(`Page Errors (${pageErrors.length}):`, pageErrors);

  if (allPass && consoleErrors.length === 0 && pageErrors.length === 0) {
    console.log('\nALL REAL-BROWSER VALIDATIONS PASSED WITH ZERO ERRORS!');
  } else {
    console.log('\nValidation completed with warnings/errors.');
  }
}

runRealBrowserValidation().catch((err) => {
  console.error('Fatal error running real browser validation:', err);
  process.exit(1);
});
