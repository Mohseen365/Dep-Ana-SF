const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.connect(port, '127.0.0.1');
  });
}

async function runWorkstreamJResponsiveValidation() {
  console.log('================================================================');
  console.log('WORKSTREAM J — RESPONSIVE BROWSER & VIEWPORT VALIDATION');
  console.log('================================================================\n');

  const screenshotsDir = path.join(__dirname, '../audit-reports/workstream_j_screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let serverProcess = null;
  const isPortOpen = await checkPort(3000);
  if (!isPortOpen) {
    console.log('[0] Starting Vite dev server on port 3000...');
    serverProcess = spawn('npm', ['run', 'dev', '--', '--port', '3000'], {
      cwd: path.join(__dirname, '../explorer'),
      stdio: 'ignore',
      shell: true,
    });
    // Wait for server to be responsive
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (await checkPort(3000)) break;
    }
  } else {
    console.log('[0] Vite dev server already running on port 3000.');
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const viewports = [
    { width: 1024, height: 768, label: '1024x768' },
    { width: 1440, height: 900, label: '1440x900' },
    { width: 1920, height: 1080, label: '1920x1080' },
    { width: 2560, height: 1440, label: '2560x1440' },
  ];

  const projects = [
    { id: 'default', name: 'Default (Small)' },
    { id: 'pbim', name: 'PBIM (Large)' },
    { id: 'cloud-spend-tracker', name: 'Cloud Spend Tracker (Medium)' },
    { id: 'bqc', name: 'BQC' },
  ];

  const modes = ['hierarchical', 'hybrid', 'orbit', 'constellation'];

  const results = {
    metadata: {
      timestamp: new Date().toISOString(),
      browserVersion: browser.version(),
    },
    viewports: {},
    consoleErrors: [],
    pageErrors: [],
    findings: [],
  };

  try {
    // 1. Matrix evaluation
    for (const vp of viewports) {
      console.log(`\n----------------------------------------------------------------`);
      console.log(`EVALUATING VIEWPORT: ${vp.label}`);
      console.log(`----------------------------------------------------------------`);

      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();

      page.on('pageerror', (err) => results.pageErrors.push(`[${vp.label}] ${err.message || String(err)}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Filter out minor favicon 404s
          if (!text.includes('favicon.ico')) {
            results.consoleErrors.push(`[${vp.label}] ${text}`);
          }
        }
      });

      // Test representative projects
      for (const proj of projects) {
        console.log(`  Project: ${proj.name} (${proj.id})`);
        await page.goto(`http://localhost:3000/?project=${proj.id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.app-layout', { timeout: 30000 });

        // Check horizontal overflow
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        // Measure header bounds
        const headerBounds = await page.evaluate(() => {
          const header = document.querySelector('.workspace-header, header');
          if (!header) return null;
          const rect = header.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, height: rect.height, width: rect.width };
        });

        // Measure controls bounds
        const controlsBounds = await page.evaluate(() => {
          const ctrl = document.querySelector('.graph-controls');
          if (!ctrl) return null;
          const rect = ctrl.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
        });

        // Measure minimap bounds
        const minimapBounds = await page.evaluate(() => {
          const mm = document.querySelector('.minimap-container, .cytoscape-navigator');
          if (!mm) return null;
          const rect = mm.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
        });

        // Test mode switches at this viewport for default & pbim
        if (proj.id === 'default' || proj.id === 'pbim') {
          for (const mode of modes) {
            const btnSelector = `button[data-mode="${mode}"]`;
            const btnExists = await page.evaluate((sel) => !!document.querySelector(sel), btnSelector);
            if (btnExists) {
              await page.click(btnSelector);
              await page.waitForTimeout(1000); // Allow layout to settle
            }
          }
        }

        // Take representative screenshot for 1024x768 and 1920x1080 on PBIM
        if (proj.id === 'pbim' && (vp.label === '1024x768' || vp.label === '1920x1080')) {
          const screenshotPath = path.join(screenshotsDir, `pbim_${vp.label}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: false });
          console.log(`    Saved screenshot: ${screenshotPath}`);
        }

        console.log(`    Header Height: ${headerBounds ? headerBounds.height + 'px' : 'N/A'}, Overflow: ${hasHorizontalOverflow}`);
        console.log(`    Controls: ${controlsBounds ? `${controlsBounds.width}x${controlsBounds.height} @ bottom:${controlsBounds.bottom}` : 'N/A'}`);
        console.log(`    Minimap: ${minimapBounds ? `${minimapBounds.width}x${minimapBounds.height} @ bottom:${minimapBounds.bottom}` : 'N/A'}`);
      }

      await context.close();
    }

  } finally {
    await browser.close();
    if (serverProcess) {
      console.log('[Cleanup] Stopping Vite dev server...');
      serverProcess.kill();
    }
  }

  console.log('\n================================================================');
  console.log('WORKSTREAM J RESPONSIVE VALIDATION COMPLETED');
  console.log('================================================================');
}

runWorkstreamJResponsiveValidation().catch((err) => {
  console.error('Fatal error running Workstream J responsive validation:', err);
  process.exit(1);
});
