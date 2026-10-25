const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

async function runArchitectureOrbitForensicAudit() {
  console.log('[0s] Starting audit...');

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  const screenshotDir = path.join(rootDir, 'verification_b_screenshots');

  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const pbimPath = path.join(rootDir, 'analyze/projects/pbim/explorer-data.json');
  const pbimRaw = fs.readFileSync(pbimPath);
  const pbimHash = crypto.createHash('sha256').update(pbimRaw).digest('hex');
  const pbimData = JSON.parse(pbimRaw.toString('utf-8'));

  console.log(`[1s] PBIM Hash: ${pbimHash}`);

  console.log('[2s] Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(120000);

  const consoleLogs = [];
  const consoleErrors = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    console.log(`PAGE ERROR: ${err.message}`);
    consoleErrors.push(err.message);
  });

  const tStart = Date.now();
  console.log('[3s] Navigating to http://localhost:3000/?project=pbim&view=graph...');
  await page.goto('http://localhost:3000/?project=pbim&view=graph');
  await page.waitForLoadState('networkidle');

  console.log('[5s] Waiting for initial Hierarchical layout computation on 528 nodes (up to 120s)...');
  await page.waitForFunction(() => {
    try {
      const cy = window.__CY__;
      return !!(cy && typeof cy.nodes === 'function' && cy.nodes().length === 528);
    } catch (e) {
      return false;
    }
  }, { timeout: 120000, polling: 1000 });

  const tLoaded = Math.round((Date.now() - tStart) / 1000);
  console.log(`[${tLoaded}s] Initial layout complete! Cytoscape active with 528 nodes.`);

  // Instrument Cytoscape and Layout calls
  await page.evaluate(() => {
    window.__FORENSIC_COUNTERS__ = {
      runLayoutWithMetadataCount: 0,
      computeArchitectureLayoutWithMetadataCount: 0,
      cyFitCount: 0,
      cyZoomCount: 0,
      cyPanCount: 0,
      layoutInvocations: [],
      fitInvocations: [],
    };

    const cy = window.__CY__;

    const origFit = cy.fit.bind(cy);
    cy.fit = function (...args) {
      window.__FORENSIC_COUNTERS__.cyFitCount++;
      window.__FORENSIC_COUNTERS__.fitInvocations.push({
        timestamp: Date.now(),
        stack: new Error().stack
      });
      return origFit(...args);
    };

    const origZoom = cy.zoom.bind(cy);
    cy.zoom = function (...args) {
      if (args.length > 0) {
        window.__FORENSIC_COUNTERS__.cyZoomCount++;
      }
      return origZoom(...args);
    };

    const origPan = cy.pan.bind(cy);
    cy.pan = function (...args) {
      if (args.length > 0) {
        window.__FORENSIC_COUNTERS__.cyPanCount++;
      }
      return origPan(...args);
    };

    if (window.__LAYOUT_MODULE__) {
      const origRunLayout = window.__LAYOUT_MODULE__.runLayoutWithMetadata;
      window.__LAYOUT_MODULE__.runLayoutWithMetadata = function (...args) {
        window.__FORENSIC_COUNTERS__.runLayoutWithMetadataCount++;
        window.__FORENSIC_COUNTERS__.layoutInvocations.push({
          timestamp: Date.now(),
          options: args[1],
          stack: new Error().stack
        });
        return origRunLayout(...args);
      };
    }
  });

  const repIds = [
    'ApexClass:TimelineControllerTest',
    'External:Profile',
    'ApexClass:AssetDashboardController',
    'ApexClass:BudgetController',
    'LWC:vendor-workspace'
  ];

  const clickModeToggle = async () => {
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      if (btn) btn.click();
    });
  };

  const clickZoomOutBtn = async () => {
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Zoom Out (-)"]');
      if (btn) btn.click();
    });
  };

  const clickZoomInBtn = async () => {
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Zoom In (+)"]');
      if (btn) btn.click();
    });
  };

  const captureStateFingerprint = async (label) => {
    return await page.evaluate(({ repIds, label }) => {
      const cy = window.__CY__;
      const toggleBtn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      const indicator = document.querySelector('[data-testid="graph-mode-indicator"]');

      const repNodes = {};
      repIds.forEach(id => {
        const n = cy.getElementById(id);
        if (n.length > 0) {
          const pos = n.position();
          repNodes[id] = {
            id,
            x: Math.round(pos.x * 100) / 100,
            y: Math.round(pos.y * 100) / 100,
            visible: n.visible(),
            styleDisplay: n.style('display'),
            styleVisibility: n.style('visibility'),
            styleOpacity: parseFloat(n.style('opacity') || '1')
          };
        }
      });

      const totalNodes = cy.nodes().length;
      const visibleNodes = cy.nodes().filter(n => n.visible()).length;
      const totalEdges = cy.edges().length;
      const visibleEdges = cy.edges().filter(e => e.visible()).length;

      const sampleEdges = [];
      cy.edges().slice(0, 10).forEach(e => {
        sampleEdges.push({
          id: e.id(),
          source: e.source().id(),
          target: e.target().id(),
          visible: e.visible(),
          styleDisplay: e.style('display'),
          styleVisibility: e.style('visibility'),
          styleOpacity: parseFloat(e.style('opacity') || '1')
        });
      });

      const buttonState = toggleBtn ? {
        outerHTML: toggleBtn.outerHTML,
        textContent: toggleBtn.textContent?.trim(),
        title: toggleBtn.getAttribute('title'),
        ariaLabel: toggleBtn.getAttribute('aria-label'),
        ariaPressed: toggleBtn.getAttribute('aria-pressed'),
        className: toggleBtn.className,
        type: toggleBtn.getAttribute('type'),
      } : null;

      const pan = cy.pan();

      return {
        label,
        timestamp: Date.now(),
        buttonState,
        modeIndicatorText: indicator ? indicator.textContent?.trim() : null,
        zoom: Math.round(cy.zoom() * 100000) / 100000,
        pan: { x: Math.round(pan.x * 100) / 100, y: Math.round(pan.y * 100) / 100 },
        totalNodes,
        visibleNodes,
        totalEdges,
        visibleEdges,
        repNodes,
        sampleEdges,
        counters: { ...window.__FORENSIC_COUNTERS__ }
      };
    }, { repIds, label });
  };

  // =========================================================================
  // OBJECTIVE 1: Three-State Cycle Test
  // =========================================================================
  console.log('EXECUTING THREE-STATE CYCLE TEST...');

  const state0 = await captureStateFingerprint('STATE 0 (Initial Load)');
  console.log(`STATE 0: title="${state0.buttonState?.title}", aria-label="${state0.buttonState?.ariaLabel}", text="${state0.buttonState?.textContent}", indicator="${state0.modeIndicatorText}"`);

  // Click 1 -> Hybrid
  await clickModeToggle();
  await page.waitForTimeout(300);
  const state1 = await captureStateFingerprint('STATE 1 (First Click -> Hybrid)');
  console.log(`STATE 1: title="${state1.buttonState?.title}", aria-label="${state1.buttonState?.ariaLabel}", text="${state1.buttonState?.textContent}", indicator="${state1.modeIndicatorText}"`);

  // Click 2 -> Orbit
  await clickModeToggle();
  await page.waitForTimeout(500);
  const state2 = await captureStateFingerprint('STATE 2 (Second Click -> Orbit)');
  console.log(`STATE 2: title="${state2.buttonState?.title}", aria-label="${state2.buttonState?.ariaLabel}", text="${state2.buttonState?.textContent}", indicator="${state2.modeIndicatorText}"`);

  // Click 3 -> Hierarchical
  await clickModeToggle();
  await page.waitForTimeout(300);
  const state3 = await captureStateFingerprint('STATE 3 (Third Click -> Hierarchical)');
  console.log(`STATE 3: title="${state3.buttonState?.title}", aria-label="${state3.buttonState?.ariaLabel}", text="${state3.buttonState?.textContent}", indicator="${state3.modeIndicatorText}"`);

  // =========================================================================
  // OBJECTIVE 2: Enter Orbit through Real UI & Establish Baseline
  // =========================================================================
  console.log('RE-ENTERING ARCHITECTURE ORBIT VIA REAL UI TOGGLE...');

  await clickModeToggle(); // -> Hybrid
  await page.waitForTimeout(300);
  await clickModeToggle(); // -> Orbit
  await page.waitForTimeout(500);

  const orbitT0 = await captureStateFingerprint('Orbit Baseline t0 (Activation)');
  await page.waitForTimeout(100);
  const orbitT1 = await captureStateFingerprint('Orbit Baseline t1 (+100ms)');
  await page.waitForTimeout(400);
  const orbitT2 = await captureStateFingerprint('Orbit Baseline t2 (Settled +500ms)');

  console.log(`Orbit Baseline Settled: Zoom=${orbitT2.zoom}, Pan=(${orbitT2.pan.x}, ${orbitT2.pan.y}), Nodes=${orbitT2.visibleNodes}/${orbitT2.totalNodes}, Edges=${orbitT2.visibleEdges}/${orbitT2.totalEdges}`);

  await page.screenshot({ path: path.join(screenshotDir, 'architecture-orbit-baseline.png') });

  // Reset counters before zoom tests
  await page.evaluate(() => {
    window.__FORENSIC_COUNTERS__.runLayoutWithMetadataCount = 0;
    window.__FORENSIC_COUNTERS__.computeArchitectureLayoutWithMetadataCount = 0;
    window.__FORENSIC_COUNTERS__.cyFitCount = 0;
    window.__FORENSIC_COUNTERS__.cyZoomCount = 0;
    window.__FORENSIC_COUNTERS__.cyPanCount = 0;
    window.__FORENSIC_COUNTERS__.layoutInvocations = [];
    window.__FORENSIC_COUNTERS__.fitInvocations = [];
  });

  // =========================================================================
  // OBJECTIVE 3: 10 Zoom-Out / Release Cycles with Temporal Sweeps
  // =========================================================================
  console.log('EXECUTING 10 REAL UI ZOOM-OUT / RELEASE CYCLES...');

  const zoomOutResults = [];

  for (let cycle = 1; cycle <= 10; cycle++) {
    const before = await captureStateFingerprint(`Zoom-Out Cycle ${cycle} BEFORE`);

    const initialLayoutCount = before.counters.runLayoutWithMetadataCount;
    const initialFitCount = before.counters.cyFitCount;

    await clickZoomOutBtn();

    const t0 = await captureStateFingerprint(`Zoom-Out Cycle ${cycle} t0 (Release)`);
    await page.waitForTimeout(30);
    const t1 = await captureStateFingerprint(`Zoom-Out Cycle ${cycle} t1 (+30ms)`);
    await page.waitForTimeout(30);
    const t2 = await captureStateFingerprint(`Zoom-Out Cycle ${cycle} t2 (+60ms)`);
    await page.waitForTimeout(30);
    const t3 = await captureStateFingerprint(`Zoom-Out Cycle ${cycle} t3 (+90ms)`);
    await page.waitForTimeout(30);
    const t4 = await captureStateFingerprint(`Zoom-Out Cycle ${cycle} t4 (+120ms)`);
    await page.waitForTimeout(30);
    const t5 = await captureStateFingerprint(`Zoom-Out Cycle ${cycle} t5 (+150ms)`);
    await page.waitForTimeout(100);
    const t6 = await captureStateFingerprint(`Zoom-Out Cycle ${cycle} t6 (+250ms)`);
    await page.waitForTimeout(250);
    const t7 = await captureStateFingerprint(`Zoom-Out Cycle ${cycle} t7 (+500ms)`);

    const after = t7;

    const layoutDelta = after.counters.runLayoutWithMetadataCount - initialLayoutCount;
    const fitDelta = after.counters.cyFitCount - initialFitCount;

    console.log(`Zoom-Out Cycle ${cycle}: Zoom Before=${before.zoom} -> After=${after.zoom} | Pan=(${after.pan.x}, ${after.pan.y}) | LayoutInvocations=+${layoutDelta} | FitInvocations=+${fitDelta} | VisibleEdges=${after.visibleEdges}`);

    zoomOutResults.push({
      cycle,
      before,
      t0, t1, t2, t3, t4, t5, t6, t7,
      after,
      layoutDelta,
      fitDelta
    });
  }

  // =========================================================================
  // OBJECTIVE 4: 10 Zoom-In / Release Cycles with Temporal Sweeps
  // =========================================================================
  console.log('EXECUTING 10 REAL UI ZOOM-IN / RELEASE CYCLES...');

  const zoomInResults = [];

  for (let cycle = 1; cycle <= 10; cycle++) {
    const before = await captureStateFingerprint(`Zoom-In Cycle ${cycle} BEFORE`);

    const initialLayoutCount = before.counters.runLayoutWithMetadataCount;
    const initialFitCount = before.counters.cyFitCount;

    await clickZoomInBtn();

    const t0 = await captureStateFingerprint(`Zoom-In Cycle ${cycle} t0 (Release)`);
    await page.waitForTimeout(30);
    const t1 = await captureStateFingerprint(`Zoom-In Cycle ${cycle} t1 (+30ms)`);
    await page.waitForTimeout(30);
    const t2 = await captureStateFingerprint(`Zoom-In Cycle ${cycle} t2 (+60ms)`);
    await page.waitForTimeout(30);
    const t3 = await captureStateFingerprint(`Zoom-In Cycle ${cycle} t3 (+90ms)`);
    await page.waitForTimeout(30);
    const t4 = await captureStateFingerprint(`Zoom-In Cycle ${cycle} t4 (+120ms)`);
    await page.waitForTimeout(30);
    const t5 = await captureStateFingerprint(`Zoom-In Cycle ${cycle} t5 (+150ms)`);
    await page.waitForTimeout(100);
    const t6 = await captureStateFingerprint(`Zoom-In Cycle ${cycle} t6 (+250ms)`);
    await page.waitForTimeout(250);
    const t7 = await captureStateFingerprint(`Zoom-In Cycle ${cycle} t7 (+500ms)`);

    const after = t7;

    const layoutDelta = after.counters.runLayoutWithMetadataCount - initialLayoutCount;
    const fitDelta = after.counters.cyFitCount - initialFitCount;

    console.log(`Zoom-In Cycle ${cycle}: Zoom Before=${before.zoom} -> After=${after.zoom} | Pan=(${after.pan.x}, ${after.pan.y}) | LayoutInvocations=+${layoutDelta} | FitInvocations=+${fitDelta} | VisibleEdges=${after.visibleEdges}`);

    zoomInResults.push({
      cycle,
      before,
      t0, t1, t2, t3, t4, t5, t6, t7,
      after,
      layoutDelta,
      fitDelta
    });
  }

  // =========================================================================
  // OBJECTIVE 5: Edge Disappearance & LOD Class Analysis across Zoom Range
  // =========================================================================
  console.log('ANALYZING EDGE VISIBILITY AND LOD ACROSS ZOOM LEVELS...');

  const lodSweepResults = await page.evaluate(async () => {
    const cy = window.__CY__;
    const results = [];

    const zoomLevels = [0.05, 0.08, 0.10, 0.12, 0.15, 0.20, 0.30, 0.50, 1.00, 2.00];

    for (const z of zoomLevels) {
      cy.zoom(z);
      cy.emit('zoom');
      await new Promise(r => setTimeout(r, 50));

      const classes = Array.from(cy.container()?.classList || []);
      const elementClassSet = new Set();
      cy.elements().forEach(e => {
        const clsList = e.classes();
        if (Array.isArray(clsList)) {
          clsList.forEach(c => elementClassSet.add(c));
        } else if (typeof clsList === 'string') {
          clsList.split(' ').forEach(c => c && elementClassSet.add(c));
        }
      });

      const sampleEdges = [];
      cy.edges().slice(0, 10).forEach(e => {
        sampleEdges.push({
          id: e.id(),
          visible: e.visible(),
          styleDisplay: e.style('display'),
          styleVisibility: e.style('visibility'),
          styleOpacity: parseFloat(e.style('opacity') || '1'),
          styleWidth: e.style('width'),
          classes: e.classes()
        });
      });

      results.push({
        zoom: z,
        actualCyZoom: cy.zoom(),
        totalEdges: cy.edges().length,
        visibleEdges: cy.edges().filter(e => e.visible()).length,
        hiddenEdges: cy.edges().filter(e => !e.visible()).length,
        containerClasses: classes,
        elementClasses: Array.from(elementClassSet),
        sampleEdges
      });
    }

    return results;
  });

  lodSweepResults.forEach(r => {
    console.log(`Zoom Sweep ${r.zoom}: actualZoom=${r.actualCyZoom} | visibleEdges=${r.visibleEdges}/${r.totalEdges} | classes=[${r.elementClasses.join(', ')}]`);
  });

  // =========================================================================
  // OBJECTIVE 6: Differential Test — Real UI vs Production API Invocation
  // =========================================================================
  console.log('EXECUTING UI VS PRODUCTION API DIFFERENTIAL TEST...');

  const differentialResults = await page.evaluate(() => {
    const cy = window.__CY__;

    const pathAPositions = {};
    cy.nodes().slice(0, 10).forEach(n => {
      const pos = n.position();
      pathAPositions[n.id()] = { x: Math.round(pos.x * 100) / 100, y: Math.round(pos.y * 100) / 100 };
    });
    const pathAZoom = cy.zoom();
    const pathAPan = cy.pan();

    const layoutRes = window.__LAYOUT_MODULE__.runLayoutWithMetadata(cy, {
      nodes: cy.nodes().map(n => n.data('rawNode') || { id: n.id(), type: n.data('type') }),
      edges: cy.edges().map(e => ({ id: e.id(), source: e.source().id(), target: e.target().id() })),
      nodeCount: cy.nodes().length,
      animate: false,
      architectureMode: 'orbit',
      enableFeatureLayout: false
    });

    const pathBPositions = {};
    cy.nodes().slice(0, 10).forEach(n => {
      const pos = n.position();
      pathBPositions[n.id()] = { x: Math.round(pos.x * 100) / 100, y: Math.round(pos.y * 100) / 100 };
    });

    let maxDrift = 0;
    Object.keys(pathAPositions).forEach(id => {
      if (pathBPositions[id]) {
        const dx = Math.abs(pathAPositions[id].x - pathBPositions[id].x);
        const dy = Math.abs(pathAPositions[id].y - pathBPositions[id].y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDrift) maxDrift = dist;
      }
    });

    return {
      pathAZoom,
      pathAPan,
      maxPositionDriftPathAvsB: Math.round(maxDrift * 100000) / 100000,
      orbitGuidesPresent: !!layoutRes.orbitGuides,
      featureRegionsPresent: !!layoutRes.featureRegions
    };
  });

  console.log(`Differential Path A (UI) vs Path B (API): Max position drift = ${differentialResults.maxPositionDriftPathAvsB}px`);

  // =========================================================================
  // OBJECTIVE 7: Hierarchical / Hybrid Regression Boundary Checks
  // =========================================================================
  console.log('CHECKING HIERARCHICAL AND HYBRID REGRESSION BOUNDARIES...');

  await clickModeToggle(); // Orbit -> Hierarchical
  await page.waitForTimeout(500);
  const hierBoundary = await captureStateFingerprint('Regression Check: Hierarchical');

  await clickModeToggle(); // Hierarchical -> Hybrid
  await page.waitForTimeout(500);
  const hybridBoundary = await captureStateFingerprint('Regression Check: Hybrid');

  console.log(`Hierarchical Boundary: Nodes=${hierBoundary.visibleNodes}/${hierBoundary.totalNodes}, Edges=${hierBoundary.visibleEdges}/${hierBoundary.totalEdges}, indicator="${hierBoundary.modeIndicatorText}"`);
  console.log(`Hybrid Boundary: Nodes=${hybridBoundary.visibleNodes}/${hybridBoundary.totalNodes}, Edges=${hybridBoundary.visibleEdges}/${hybridBoundary.totalEdges}, indicator="${hybridBoundary.modeIndicatorText}"`);

  const fullAuditPayload = {
    metadata: {
      timestamp: new Date().toISOString(),
      dataset: 'pbim',
      datasetHash: pbimHash,
      nodeCount: pbimData.nodes.length,
      edgeCount: pbimData.edges.length,
      consoleErrors
    },
    controlDiscovery: {
      state0,
      state1,
      state2,
      state3
    },
    orbitBaseline: {
      t0: orbitT0,
      t1: orbitT1,
      t2: orbitT2
    },
    zoomOutSweep: zoomOutResults,
    zoomInSweep: zoomInResults,
    lodSweep: lodSweepResults,
    differentialTest: differentialResults,
    regressionBoundaries: {
      hierarchical: hierBoundary,
      hybrid: hybridBoundary
    }
  };

  const resultsPath = path.join(fixtureDir, 'architecture-orbit-forensic-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(fullAuditPayload, null, 2));
  console.log(`Forensic results saved to ${resultsPath}`);

  await browser.close();
  console.log('Audit finished cleanly.');
}

runArchitectureOrbitForensicAudit().catch(err => {
  console.error('FATAL AUDIT ERROR:', err);
  process.exit(1);
});
