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

  const reportDir = path.join(__dirname, '../audit-reports');
  const screenshotsDir = path.join(reportDir, 'workstream_j_screenshots');
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
    for (let i = 0; i < 20; i++) {
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

  const lensModes = ['hierarchical', 'hybrid', 'orbit', 'constellation'];

  const results = {
    metadata: {
      timestamp: new Date().toISOString(),
      browserVersion: browser.version(),
    },
    viewportMatrix: {},
    consoleErrors: [],
    pageErrors: [],
    accessibility: {},
    overflows: [],
  };

  try {
    for (const vp of viewports) {
      console.log(`\n----------------------------------------------------------------`);
      console.log(`EVALUATING VIEWPORT: ${vp.label} (${vp.width}x${vp.height})`);
      console.log(`----------------------------------------------------------------`);

      results.viewportMatrix[vp.label] = {};

      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();

      page.on('pageerror', (err) => {
        const msg = `[${vp.label}] ${err.message || String(err)}`;
        results.pageErrors.push(msg);
        console.error(`  [PAGE ERROR] ${msg}`);
      });
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('favicon.ico')) {
            const errStr = `[${vp.label}] ${text}`;
            results.consoleErrors.push(errStr);
            console.warn(`  [CONSOLE ERROR] ${errStr}`);
          }
        }
      });

      for (const proj of projects) {
        console.log(`\n  Project: ${proj.name} (${proj.id})`);
        const navStart = Date.now();
        await page.goto(`http://localhost:3000/?project=${proj.id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.app-layout', { timeout: 60000 });
        const loadMs = Date.now() - navStart;

        // Verify Graph Canvas elements
        const graphStats = await page.evaluate(() => {
          const cy = window.__CY__;
          return {
            nodes: cy ? cy.nodes().length : 0,
            edges: cy ? cy.edges().length : 0,
            visibleNodes: cy ? cy.nodes(':visible').length : 0,
            visibleEdges: cy ? cy.edges(':visible').length : 0,
          };
        });

        // Check horizontal & vertical document overflow
        const overflowInfo = await page.evaluate(() => {
          const doc = document.documentElement;
          return {
            hasHorizontalOverflow: doc.scrollWidth > window.innerWidth,
            scrollWidth: doc.scrollWidth,
            innerWidth: window.innerWidth,
          };
        });

        if (overflowInfo.hasHorizontalOverflow) {
          results.overflows.push({ viewport: vp.label, project: proj.id, scrollWidth: overflowInfo.scrollWidth, innerWidth: overflowInfo.innerWidth });
        }

        // Measure Header, Controls, and Minimap Bounds
        const bounds = await page.evaluate(() => {
          const getRect = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
          };
          return {
            header: getRect('.workspace-header, [data-testid="workspace-header"]'),
            controls: getRect('.graph-controls-floating, [role="toolbar"][aria-label="Graph controls"]'),
            minimap: getRect('.minimap-container, .cytoscape-navigator'),
            sidebar: getRect('.sidebar-slot, .sidebar'),
          };
        });

        // Test Lens Switching (Workspace Header / Lens Switch Buttons)
        const modeResults = {};
        for (const mode of lensModes) {
          const btnSelector = `[data-testid="view-btn-${mode}"], button.lens-switch-btn[data-mode="${mode}"]`;
          const btnInfo = await page.evaluate((sel) => {
            const btn = document.querySelector(sel);
            if (!btn) return null;
            const rect = btn.getBoundingClientRect();
            return {
              exists: true,
              visible: rect.width > 0 && rect.height > 0,
              isActive: btn.classList.contains('active') || btn.getAttribute('aria-current') === 'true',
            };
          }, btnSelector);

          if (btnInfo && btnInfo.exists) {
            await page.click(btnSelector);
            await page.waitForTimeout(1000); // Allow layout transition
            const isActiveAfterClick = await page.evaluate((sel) => {
              const btn = document.querySelector(sel);
              return btn ? (btn.classList.contains('active') || btn.getAttribute('aria-current') === 'true') : false;
            }, btnSelector);

            modeResults[mode] = { accessible: true, activeMode: isActiveAfterClick ? mode : null };
          } else {
            // Also test graph floating toolbar toggle if available
            const toggleSelector = '[data-testid="architecture-mode-toggle"]';
            const toggleExists = await page.evaluate((sel) => !!document.querySelector(sel), toggleSelector);
            if (toggleExists) {
              await page.click(toggleSelector);
              await page.waitForTimeout(1000);
              modeResults[mode] = { accessible: true, via: 'architecture-mode-toggle' };
            } else {
              modeResults[mode] = { accessible: false };
            }
          }
        }

        // Take screenshot for evidence
        const screenshotName = `${proj.id}_${vp.label}.png`;
        const screenshotPath = path.join(screenshotsDir, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        results.viewportMatrix[vp.label][proj.id] = {
          loadMs,
          graphStats,
          overflowInfo,
          bounds,
          modeResults,
          screenshotPath: `audit-reports/workstream_j_screenshots/${screenshotName}`,
        };

        console.log(`    Load Time: ${loadMs}ms | Nodes: ${graphStats.nodes} | Edges: ${graphStats.edges}`);
        console.log(`    Horizontal Overflow: ${overflowInfo.hasHorizontalOverflow ? 'YES (FAIL)' : 'NO (PASS)'}`);
        console.log(`    Header Height: ${bounds.header ? bounds.header.height + 'px' : 'N/A'}`);
        console.log(`    Floating Controls: ${bounds.controls ? `${bounds.controls.width}x${bounds.controls.height} @ top:${bounds.controls.top}` : 'NONE/HIDDEN'}`);
        console.log(`    Minimap: ${bounds.minimap ? `${bounds.minimap.width}x${bounds.minimap.height} @ bottom:${bounds.minimap.bottom}` : 'NONE/HIDDEN'}`);
      }

      await context.close();
    }

    // Write full validation JSON
    const jsonPath = path.join(reportDir, 'workstream_j_validation_results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n[SUCCESS] Results exported to ${jsonPath}`);

  } finally {
    await browser.close();
    if (serverProcess) {
      console.log('[Cleanup] Stopping Vite dev server...');
      serverProcess.kill();
    }
  }

  console.log('\n================================================================');
  console.log('WORKSTREAM J RESPONSIVE VALIDATION COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

runWorkstreamJResponsiveValidation().catch((err) => {
  console.error('Fatal error running Workstream J responsive validation:', err);
  process.exit(1);
});
