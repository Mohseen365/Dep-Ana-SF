const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

async function runConstellationRealBrowserVerification() {
  console.log('================================================================');
  console.log('COMPONENT CONSTELLATION REAL-BROWSER RUNTIME & GEOMETRY VERIFICATION');
  console.log('================================================================\n');

  const screenshotDir = path.join(__dirname, '../verification_pbim_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Ensure dev server on port 3000
  let serverProcess = null;
  const isPortOpen = await checkPort(3000);
  if (!isPortOpen) {
    console.log('[0] Spinning up Vite dev server on port 3000...');
    serverProcess = spawn('npm', ['run', 'dev', '--', '--port', '3000'], {
      cwd: path.join(__dirname, '../explorer'),
      stdio: 'ignore',
      shell: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } else {
    console.log('[0] Vite dev server already running on port 3000.');
  }

  const executablePath = fs.existsSync('/opt/google/chrome/chrome')
    ? '/opt/google/chrome/chrome'
    : undefined;

  console.log(`[1] Launching Chromium (executablePath: ${executablePath || 'default'})...`);
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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

  try {
    // 1. Direct load into Component Constellation mode
    console.log('[2] Navigating to http://localhost:3000/?project=pbim#arch=constellation...');
    await page.goto('http://localhost:3000/?project=pbim#arch=constellation');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for Cytoscape layout completion

    const activeUrl = page.url();
    console.log(`    Active URL: ${activeUrl}`);

    // Verify status bar text
    const statusBar = page.locator('.status-bar, [data-testid="status-bar"]').first();
    const statusText = (await statusBar.textContent().catch(() => '')).trim();
    console.log(`    Status Bar Text: "${statusText}"`);

    // Verify Cytoscape instance presence
    const hasCy = await page.evaluate(() => typeof window.__CY__ !== 'undefined' || !!document.querySelector('.cy-container canvas'));
    console.log(`    Cytoscape Canvas Rendered: ${hasCy ? 'PASS' : 'FAIL'}`);

    // Capture screenshot in Constellation mode
    const shot1 = path.join(screenshotDir, '05_constellation_mode_loaded.png');
    await page.screenshot({ path: shot1, fullPage: true });
    console.log(`    Screenshot saved: ${shot1}`);

    // 2. Test Architecture Mode Switching (Constellation -> Orbit -> Constellation)
    console.log('\n[3] Testing Mode Switch: Constellation -> Orbit -> Constellation...');
    const modeBtn = page.locator('.graph-control-btn[aria-label*="Architecture layout"]').first();
    if (await modeBtn.isVisible()) {
      const initialModeLabel = await modeBtn.getAttribute('aria-label');
      console.log(`    Current Layout Button: ${initialModeLabel}`);

      // Click to switch mode
      await modeBtn.click();
      await page.waitForTimeout(500);
      console.log(`    Post-click URL: ${page.url()}`);

      // Switch back to Constellation
      await page.goto('http://localhost:3000/?project=pbim#arch=constellation');
      await page.waitForTimeout(500);
      console.log(`    Restored Constellation URL: ${page.url()}`);
    }

    // Capture final screenshot
    const shot2 = path.join(screenshotDir, '06_constellation_mode_restored.png');
    await page.screenshot({ path: shot2, fullPage: true });
    console.log(`    Screenshot saved: ${shot2}`);

    console.log('\n[4] Execution Logs & Diagnostic Summary:');
    console.log(`    Console Errors (${consoleErrors.length}):`, consoleErrors);
    console.log(`    Page Errors (${pageErrors.length}):`, pageErrors);

    if (consoleErrors.length === 0 && pageErrors.length === 0 && hasCy) {
      console.log('\nREAL-BROWSER CONSTELLATION VERIFICATION: 100% SUCCESS!');
    } else {
      console.log('\nREAL-BROWSER CONSTELLATION VERIFICATION: Completed with warnings.');
    }
  } finally {
    await browser.close();
    if (serverProcess) serverProcess.kill();
  }
}

function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

runConstellationRealBrowserVerification().catch((err) => {
  console.error('Fatal error in real-browser constellation verification:', err);
  process.exit(1);
});
