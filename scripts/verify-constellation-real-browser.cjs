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

  // Pre-seed localStorage so application initializes directly into constellation mode
  await page.addInitScript(() => {
    const key = 'explorer.projectState.pbim';
    const existing = localStorage.getItem(key);
    let state = {};
    if (existing) {
      try { state = JSON.parse(existing); } catch (e) {}
    }
    state.graphLayout = state.graphLayout || {};
    state.graphLayout.architectureMode = 'constellation';
    localStorage.setItem(key, JSON.stringify(state));
  });

  try {
    // 1. Direct load into Component Constellation mode
    console.log('[2] Navigating to http://localhost:3000/?project=pbim#arch=constellation...');
    await page.goto('http://localhost:3000/?project=pbim#arch=constellation');
    await page.waitForLoadState('networkidle');

    // Wait for Cytoscape layout completion
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(500);
      const isReady = await page.evaluate(() => {
        return Boolean(window.__CY__ && window.__LAYOUT_MODULE__);
      });
      if (isReady) break;
    }

    const activeUrl = page.url();
    console.log(`    Active URL: ${activeUrl}`);

    const hasCy = await page.evaluate(() => typeof window.__CY__ !== 'undefined' || !!document.querySelector('.cy-container canvas'));
    const initialConstNodes = await page.evaluate(() => window.__CY__ ? window.__CY__.nodes().filter(n => n.visible()).length : 0);
    const initialConstEdges = await page.evaluate(() => window.__CY__ ? window.__CY__.edges().filter(e => e.visible()).length : 0);
    console.log(`    Cytoscape Canvas Rendered: ${hasCy ? 'PASS' : 'FAIL'} | Visible Nodes: ${initialConstNodes} | Visible Edges: ${initialConstEdges}`);

    // Capture screenshot in Constellation mode
    const shot1 = path.join(screenshotDir, '05_constellation_mode_loaded.png');
    await page.screenshot({ path: shot1, fullPage: true });
    console.log(`    Screenshot saved: ${shot1}`);

    if (initialConstNodes !== 42 || initialConstEdges !== 71) {
      throw new Error(`Initial Constellation mode expected 42 nodes / 71 edges, got ${initialConstNodes} nodes / ${initialConstEdges} edges`);
    }

    // 2. Test Architecture Mode Switching (Constellation -> Orbit -> Constellation -> Hierarchical -> Constellation)
    console.log('\n[3] Testing Mode Switch: Constellation -> Orbit -> Constellation -> Hierarchical -> Constellation...');

    const switchAndVerifyMode = async (targetMode) => {
      const result = await page.evaluate((mode) => {
        const key = 'explorer.projectState.pbim';
        const existing = localStorage.getItem(key);
        let state = {};
        if (existing) {
          try { state = JSON.parse(existing); } catch (e) {}
        }
        state.graphLayout = state.graphLayout || {};
        state.graphLayout.architectureMode = mode;
        localStorage.setItem(key, JSON.stringify(state));
        window.location.hash = `arch=${mode}`;
        const cy = window.__CY__;
        const layoutModule = window.__LAYOUT_MODULE__;
        if (cy && layoutModule) {
          layoutModule.runLayoutWithMetadata(cy, {
            architectureMode: mode,
            focalLwcId: mode === 'orbit' ? 'LWC:asset-dashboard-container' : null,
            fit: true,
          });
          const visNodes = cy.nodes().filter((n) => n.visible()).length;
          const visEdges = cy.edges().filter((e) => e.visible()).length;
          return { visibleNodes: visNodes, visibleEdges: visEdges };
        }
        return { visibleNodes: 0, visibleEdges: 0 };
      }, targetMode);
      await page.waitForTimeout(500);
      return result;
    };

    // Switch to Orbit
    const orbitRes = await switchAndVerifyMode('orbit');
    console.log(`    Orbit Mode Active URL: ${page.url()} | Visible Nodes: ${orbitRes.visibleNodes} | Visible Edges: ${orbitRes.visibleEdges}`);
    if (orbitRes.visibleNodes !== 128) {
      throw new Error(`Orbit mode expected 128 visible nodes, got ${orbitRes.visibleNodes}`);
    }

    // Switch back to Constellation
    const constRes1 = await switchAndVerifyMode('constellation');
    console.log(`    Restored Constellation URL: ${page.url()} | Visible Nodes: ${constRes1.visibleNodes} | Visible Edges: ${constRes1.visibleEdges}`);
    if (constRes1.visibleNodes !== 42 || constRes1.visibleEdges !== 71) {
      throw new Error(`Restored Constellation mode expected 42 nodes / 71 edges, got ${constRes1.visibleNodes} nodes / ${constRes1.visibleEdges} edges`);
    }

    // Switch to Hierarchical
    const hierRes = await switchAndVerifyMode('hierarchical');
    console.log(`    Hierarchical Mode URL: ${page.url()} | Visible Nodes: ${hierRes.visibleNodes} | Visible Edges: ${hierRes.visibleEdges}`);
    if (hierRes.visibleNodes !== 528 || hierRes.visibleEdges !== 2063) {
      throw new Error(`Hierarchical mode expected 528 nodes / 2063 edges, got ${hierRes.visibleNodes} nodes / ${hierRes.visibleEdges} edges`);
    }

    // Return to Constellation
    const constRes2 = await switchAndVerifyMode('constellation');
    console.log(`    Final Restored Constellation URL: ${page.url()} | Visible Nodes: ${constRes2.visibleNodes} | Visible Edges: ${constRes2.visibleEdges}`);
    if (constRes2.visibleNodes !== 42 || constRes2.visibleEdges !== 71) {
      throw new Error(`Final Restored Constellation mode expected 42 nodes / 71 edges, got ${constRes2.visibleNodes} nodes / ${constRes2.visibleEdges} edges`);
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
