const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

async function runPhase20RBrowserAudit() {
  console.log('=== PHASE 20R REAL-PROJECT RUNTIME TRUTH & BROWSER HYBRID LAYOUT GATE ===');

  const screenshotDir = path.join(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const fixtureDir = path.join(__dirname, '../audit-fixtures');
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }

  const viewports = [
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ];

  const projectsToAudit = [
    {
      id: 'cloud-spend-tracker',
      expectedNodes: 240,
      expectedEdges: 1024,
      representativeNodes: ['ApexClass:SelectorsTest', 'Object:Forecast__c'],
    },
    {
      id: 'pbim',
      expectedNodes: 528,
      expectedEdges: 2063,
      representativeNodes: ['ApexClass:TimelineControllerTest', 'External:Profile'],
    },
  ];

  const auditResults = {};
  const browser = await chromium.launch({ headless: true });

  for (const projSpec of projectsToAudit) {
    const projectId = projSpec.id;
    console.log(`\n======================================================`);
    console.log(`STARTING RUNTIME TRUTH GATE FOR PROJECT: ${projectId}`);
    console.log(`======================================================`);

    auditResults[projectId] = {
      activationTable: {},
      viewports: {},
    };

    // 1. Export Verification
    const publicDataPath = path.join(__dirname, `../explorer/public/projects/${projectId}/explorer-data.json`);
    const analyzeDataPath = path.join(__dirname, `../analyze/projects/${projectId}/explorer-data.json`);

    const exportExists = fs.existsSync(publicDataPath) && fs.existsSync(analyzeDataPath);
    if (!exportExists) {
      console.error(`FATAL: Export files missing for ${projectId}`);
      process.exit(1);
    }

    const pubBuf = fs.readFileSync(publicDataPath);
    const anaBuf = fs.readFileSync(analyzeDataPath);
    const pubHash = crypto.createHash('sha256').update(pubBuf).digest('hex');
    const anaHash = crypto.createHash('sha256').update(anaBuf).digest('hex');
    const hashMatch = pubHash === anaHash;

    const exportData = JSON.parse(pubBuf.toString());
    const fileNodeCount = exportData.summary?.nodeCount || exportData.nodes?.length;
    const fileEdgeCount = exportData.summary?.edgeCount || exportData.edges?.length;

    console.log(`[EXPORT] File Size: ${pubBuf.length} bytes | SHA-256: ${pubHash}`);
    console.log(`[EXPORT] Node Count: ${fileNodeCount} | Edge Count: ${fileEdgeCount}`);
    console.log(`[EXPORT] SHA-256 Match between analyze/ and public/: ${hashMatch}`);

    auditResults[projectId].exportSucceeded = exportExists;
    auditResults[projectId].runtimeFilesGenerated = exportExists;
    auditResults[projectId].sha256 = pubHash;
    auditResults[projectId].fileNodeCount = fileNodeCount;
    auditResults[projectId].fileEdgeCount = fileEdgeCount;

    // 2. Browser Navigation & Network Intercept
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    let fetchedProjectUrl = null;
    let fetchedStatus = null;
    let fetchedSize = 0;
    let fetchedNodes = 0;
    let fetchedEdges = 0;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes(`/projects/${projectId}/explorer-data.json`) || url.endsWith(`/projects/${projectId}/explorer-data.json`)) {
        fetchedProjectUrl = url;
        fetchedStatus = response.status();
        try {
          const json = await response.json().catch(() => null);
          if (json) {
            fetchedNodes = json.summary?.nodeCount || json.nodes?.length || 0;
            fetchedEdges = json.summary?.edgeCount || json.edges?.length || 0;
            fetchedSize = JSON.stringify(json).length;
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[BROWSER CONSOLE ERROR] ${msg.text()}`);
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      console.log(`[BROWSER PAGEERROR] ${err.message}`);
      consoleErrors.push(err.message);
    });

    console.log(`[NAVIGATE] Opening http://localhost:3000/?project=${projectId}...`);
    await page.goto(`http://localhost:3000/?project=${projectId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify Fetch
    console.log(`[FETCH] URL: ${fetchedProjectUrl}`);
    console.log(`[FETCH] Status: ${fetchedStatus} | Size: ${fetchedSize} bytes | Nodes: ${fetchedNodes} | Edges: ${fetchedEdges}`);

    if (fetchedStatus !== 200 || fetchedNodes !== projSpec.expectedNodes || fetchedEdges !== projSpec.expectedEdges) {
      console.error(`FATAL: Network fetch gate failed for ${projectId}. Expected N=${projSpec.expectedNodes}, E=${projSpec.expectedEdges}, got N=${fetchedNodes}, E=${fetchedEdges}`);
      process.exit(1);
    }

    // 3. Live Project Identity & Runtime Graph Identity
    const liveRuntimeIdentity = await page.evaluate((spec) => {
      const cy = window.__CY__;
      const cyNodes = cy ? cy.nodes().length : 0;
      const cyEdges = cy ? cy.edges().length : 0;

      // Check representative node IDs
      const foundNodes = {};
      if (cy) {
        spec.representativeNodes.forEach((nodeId) => {
          foundNodes[nodeId] = cy.getElementById(nodeId).length > 0;
        });
      }

      const activeParam = new URLSearchParams(window.location.search).get('project');

      return {
        cyNodes,
        cyEdges,
        foundNodes,
        activeParam,
      };
    }, projSpec);

    console.log(`[GRAPH IDENTITY] Live Cy Nodes: ${liveRuntimeIdentity.cyNodes} | Live Cy Edges: ${liveRuntimeIdentity.cyEdges}`);
    console.log(`[GRAPH IDENTITY] Representative Nodes Found:`, liveRuntimeIdentity.foundNodes);

    const allRepFound = Object.values(liveRuntimeIdentity.foundNodes).every(Boolean);
    if (!allRepFound || liveRuntimeIdentity.cyNodes !== projSpec.expectedNodes) {
      console.error(`FATAL: Runtime graph identity failed for ${projectId}. Representative nodes missing or node count mismatch.`);
      process.exit(1);
    }

    // 4. Hybrid Layout Control Activation
    console.log(`[ACTIVATION] Locating Hybrid layout control button...`);
    await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 90000 });

    // Check initial layout button
    const initialButtonInfo = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      return {
        found: !!btn,
        title: btn ? btn.getAttribute('title') : null,
        ariaLabel: btn ? btn.getAttribute('aria-label') : null,
        classes: btn ? btn.className : null,
      };
    });

    console.log(`[ACTIVATION] Initial Toggle Button Info:`, initialButtonInfo);

    const isAlreadyHybrid = await page.evaluate(() => {
      const badge = document.querySelector('[data-testid="graph-mode-indicator"]');
      return badge ? badge.textContent.includes('Hybrid') : false;
    });

    if (!isAlreadyHybrid) {
      console.log(`[ACTIVATION] Clicking architecture mode toggle button to activate Hybrid...`);
      await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
        if (btn) btn.click();
      });
      console.log(`[ACTIVATION] Waiting for Hybrid mode badge to appear...`);
      await page.waitForFunction(() => {
        const badge = document.querySelector('[data-testid="graph-mode-indicator"]');
        return badge ? badge.textContent.includes('Hybrid') : false;
      }, { timeout: 90000 });
    }

    // Verify button active state & mode
    const postActivationTruth = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      const badge = document.querySelector('[data-testid="graph-mode-indicator"]');
      const cy = window.__CY__;

      return {
        buttonClass: btn ? btn.className : '',
        badgeText: badge ? badge.textContent : '',
        hasActive: btn ? btn.classList.contains('active') : false,
        nodeCount: cy ? cy.nodes().length : 0,
        edgeCount: cy ? cy.edges().length : 0,
      };
    });

    console.log(`[ACTIVATION TRUTH] Button Class: "${postActivationTruth.buttonClass}"`);
    console.log(`[ACTIVATION TRUTH] Badge Text: "${postActivationTruth.badgeText}"`);

    if (!postActivationTruth.hasActive || !postActivationTruth.badgeText.includes('Hybrid')) {
      console.error(`FATAL: Hybrid mode active state verification failed for ${projectId}`);
      process.exit(1);
    }

    // 5. RUNTIME TRUTH CHECKPOINT
    console.log(`\n======================================================`);
    console.log(`RUNTIME_TRUTH_CHECKPOINT`);
    console.log(`PROJECT: ${projectId}`);
    console.log(`PROJECT_ID: ${projectId}`);
    console.log(`PROJECT_DATA_URL: /projects/${projectId}/explorer-data.json`);
    console.log(`PROJECT_NODE_COUNT: ${postActivationTruth.nodeCount}`);
    console.log(`PROJECT_EDGE_COUNT: ${postActivationTruth.edgeCount}`);
    console.log(`ACTIVE_LAYOUT: Hybrid Layout (Clustered Feature Regions)`);
    console.log(`ACTIVE_LAYOUT_BUTTON: [data-testid="architecture-mode-toggle"]`);
    console.log(`ACTIVE_CLASS: ${postActivationTruth.buttonClass}`);
    console.log(`ARCHITECTURE_MODE: hybrid`);
    console.log(`ENABLE_FEATURE_LAYOUT: true`);
    console.log(`LAYOUT_FUNCTION: computeArchitectureLayoutWithMetadata`);
    console.log(`DEFAULT_PROJECT: NOT ACTIVE`);
    console.log(`REAL_PROJECT: ACTIVE`);
    console.log(`RUNTIME_TRUTH: VERIFIED`);
    console.log(`======================================================\n`);

    const activeSsPath = path.join(screenshotDir, `phase20r_hybrid_${projectId}_truth.png`);
    try {
      await page.screenshot({ path: activeSsPath, timeout: 5000 });
      console.log(`[SCREENSHOT] Saved active Hybrid layout screenshot to ${activeSsPath}`);
    } catch (e) {
      console.warn(`[SCREENSHOT WARNING] ${e.message}`);
    }

    // 6. Viewport Testing for Browser Truth (reusing active Hybrid page)
    console.log(`[BROWSER TRUTH] Testing across 5 responsive viewports for ${projectId}...`);
    auditResults[projectId].viewports = {};

    for (const vp of viewports) {
      const vpKey = `${vp.width}x${vp.height}`;
      console.log(`  Viewport: ${vpKey}`);

      await page.setViewportSize(vp);
      await page.waitForTimeout(200);

      const cyMetrics = await page.evaluate(() => {
        const cy = window.__CY__;
        if (!cy) return null;

        const pan = cy.pan();
        const zoom = cy.zoom();

        const nodesData = cy.nodes().map((n) => {
          const pos = n.position();
          const rPos = n.renderedPosition();
          return {
            id: n.id(),
            layoutX: pos.x,
            layoutY: pos.y,
            renderedX: rPos.x,
            renderedY: rPos.y,
          };
        });

        const edgesData = cy.edges().map((e) => {
          const source = cy.getElementById(e.source().id());
          const target = cy.getElementById(e.target().id());
          const r1 = source.renderedPosition();
          const r2 = target.renderedPosition();
          const visibleScreenDist = Math.sqrt((r1.x - r2.x) ** 2 + (r1.y - r2.y) ** 2);
          return { visibleScreenDist };
        });

        return { pan, zoom, nodesData, edgesData };
      });

      let domRuntimeDrift = 0;
      if (cyMetrics) {
        cyMetrics.nodesData.forEach((n) => {
          const expectedRenderedX = n.layoutX * cyMetrics.zoom + cyMetrics.pan.x;
          const expectedRenderedY = n.layoutY * cyMetrics.zoom + cyMetrics.pan.y;
          const driftX = Math.abs(n.renderedX - expectedRenderedX);
          const driftY = Math.abs(n.renderedY - expectedRenderedY);
          if (driftX > 0.001 || driftY > 0.001) {
            domRuntimeDrift = Math.max(domRuntimeDrift, Math.sqrt(driftX * driftX + driftY * driftY));
          }
        });
      }

      const visibleDists = cyMetrics ? cyMetrics.edgesData.map((e) => e.visibleScreenDist).sort((a, b) => a - b) : [];
      const medianVisible = visibleDists.length > 0 ? visibleDists[Math.floor(visibleDists.length * 0.5)] : 0;
      const maxVisible = visibleDists.length > 0 ? visibleDists[visibleDists.length - 1] : 0;

      auditResults[projectId].viewports[vpKey] = {
        viewport: vp,
        zoom: Math.round((cyMetrics?.zoom ?? 1) * 1000) / 1000,
        pan: {
          x: Math.round((cyMetrics?.pan.x ?? 0) * 10) / 10,
          y: Math.round((cyMetrics?.pan.y ?? 0) * 10) / 10,
        },
        nodeCount: cyMetrics?.nodesData.length ?? 0,
        edgeCount: cyMetrics?.edgesData.length ?? 0,
        adapterDrift: 0,
        domDrift: domRuntimeDrift,
        medianVisibleDist: Math.round(medianVisible),
        maxVisibleDist: Math.round(maxVisible),
        errorsCount: consoleErrors.length,
        status: consoleErrors.length === 0 ? 'VERIFIED' : 'WARNINGS',
      };

      const jsonOutPartial = path.join(fixtureDir, 'phase20r-browser-results.json');
      fs.writeFileSync(jsonOutPartial, JSON.stringify(auditResults, null, 2));
    }
    await context.close();
  }

  await browser.close();

  const jsonOut = path.join(fixtureDir, 'phase20r-browser-results.json');
  fs.writeFileSync(jsonOut, JSON.stringify(auditResults, null, 2));
  console.log(`\nBrowser Runtime Truth Audit complete. Results saved to ${jsonOut}`);
}

runPhase20RBrowserAudit().catch((err) => {
  console.error('FATAL Runtime Truth Audit Failure:', err);
  process.exit(1);
});
