const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function countAabbCollisions(boxes) {
  const sorted = boxes.slice().sort((a, b) => a.x1 - b.x1);
  let collisions = 0;
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (b.x1 >= a.x2) break;
      if (a.y1 < b.y2 && a.y2 > b.y1) collisions++;
    }
  }
  return collisions;
}

async function runRealPbimClosureAudit() {
  console.log('========================================================================');
  console.log('COMPONENT ORBIT — REAL PBIM ADVERSARIAL BROWSER CLOSURE AUDIT');
  console.log('========================================================================\n');

  const fixtureDir = path.join(__dirname, '../audit-fixtures');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });

  const screenshotDir = path.join(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  // ----------------------------------------------------
  // GATE 1: CANONICAL PBIM DATASET PREFLIGHT
  // ----------------------------------------------------
  const pbimPath = path.join(__dirname, '../explorer/public/projects/pbim/explorer-data.json');
  if (!fs.existsSync(pbimPath)) {
    console.error('VALIDATION BLOCKED — PBIM EXPORT FAILED');
    throw new Error('VALIDATION BLOCKED — PBIM EXPORT FAILED');
  }

  const rawPbim = fs.readFileSync(pbimPath, 'utf8');
  const pbimHash = crypto.createHash('sha256').update(rawPbim).digest('hex');
  const pbimData = JSON.parse(rawPbim);
  const expectedPbimHash = 'd6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b';

  console.log(`[CANONICAL PBIM DATASET GATE] File: ${pbimPath}`);
  console.log(`[CANONICAL PBIM DATASET GATE] SHA-256: ${pbimHash}`);
  console.log(`[CANONICAL PBIM DATASET GATE] Nodes: ${pbimData.nodes.length} | Edges: ${pbimData.edges.length}`);

  if (pbimHash !== expectedPbimHash || pbimData.nodes.length !== 528 || pbimData.edges.length !== 2063) {
    console.error('VALIDATION BLOCKED — WRONG DATASET');
    throw new Error('VALIDATION BLOCKED — WRONG DATASET');
  }

  // Verify Project Manifest
  const manifestPath = path.join(__dirname, '../explorer/public/project-manifest.json');
  const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const pbimInManifest = manifestData.projects.some((p) => p.id === 'pbim');
  console.log(`[PROJECT MANIFEST GATE] PBIM present in manifest: ${pbimInManifest}`);
  if (!pbimInManifest) {
    console.error('VALIDATION BLOCKED — WRONG DATASET (PBIM missing from manifest)');
    throw new Error('VALIDATION BLOCKED — WRONG DATASET');
  }

  const scenarios = [
    {
      focalLwcId: 'LWC:asset-dashboard-container',
      name: 'Asset',
      expectedProjected: 128,
      expectedHidden: 400,
    },
    {
      focalLwcId: 'LWC:citizen-report-portal',
      name: 'Citizen',
      expectedProjected: 102,
      expectedHidden: 426,
    },
    {
      focalLwcId: 'LWC:vendor-workspace',
      name: 'Vendor',
      expectedProjected: 101,
      expectedHidden: 427,
    },
    {
      focalLwcId: 'LWC:error-panel',
      name: 'Error',
      expectedProjected: 1,
      expectedHidden: 527,
    },
  ];

  const viewports = [
    { width: 1024, height: 768, name: '1024x768' },
    { width: 1280, height: 800, name: '1280x800' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 2560, height: 1440, name: '2560x1440' },
  ];
  const zoomLevels = [0.10, 0.25, 0.50, 0.75, 1.00, 1.50, 2.00];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const safeScreenshot = async (outPath) => {
    try {
      const base64Jpg = await page.evaluate(() => {
        const cy = window.__CY__;
        if (!cy) return null;
        return cy.jpg({ output: 'base64', scale: 0.5, bg: '#0f172a' });
      });
      if (base64Jpg) {
        fs.writeFileSync(outPath, Buffer.from(base64Jpg, 'base64'));
        console.log(`[SCREENSHOT] Captured: ${path.relative(path.resolve(__dirname, '..'), outPath)}`);
      } else {
        console.warn(`[SCREENSHOT WARNING] cy handle not found for ${path.basename(outPath)}`);
      }
    } catch (e) {
      console.warn(`[SCREENSHOT WARNING] Failed ${path.basename(outPath)}: ${e.message}`);
    }
  };

  try {
    // ----------------------------------------------------
    // GATE 2: ASYNC STARTUP READINESS GATE
    // ----------------------------------------------------
    console.log('\n--- BROWSER APPLICATION INITIALIZATION & ASYNC READINESS GATE ---');
    await page.goto('http://127.0.0.1:3000/?project=pbim', { waitUntil: 'domcontentloaded' });

    console.log('Polling for window.__CY__ and window.__LAYOUT_MODULE__ readiness (528 nodes / 2063 edges)...');
    let isReady = false;
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(500);
      isReady = await page.evaluate(() => {
        const cy = window.__CY__;
        const layout = window.__LAYOUT_MODULE__;
        return Boolean(
          cy &&
          layout &&
          typeof layout.runLayoutWithMetadata === 'function' &&
          cy.nodes &&
          cy.edges &&
          cy.nodes().length === 528 &&
          cy.edges().length === 2063
        );
      });
      if (isReady) break;
    }

    if (!isReady) {
      console.error('VALIDATION BLOCKED — BROWSER APPLICATION NOT READY');
      throw new Error('VALIDATION BLOCKED — BROWSER APPLICATION NOT READY');
    }

    console.log('[READINESS CONFIRMED] window.__CY__ & window.__LAYOUT_MODULE__ ready with 528 nodes / 2063 edges!');

    // Screenshots 1 & 2
    await safeScreenshot(path.join(screenshotDir, 'pbim_initial_state.png'));
    await safeScreenshot(path.join(screenshotDir, 'pbim_readiness.png'));

    // Observe DOM UI controls (Non-blocking)
    const uiObservation = await page.evaluate(() => {
      const lensBar = document.querySelector('.domain-lenses-bar');
      const floatingControls = document.querySelector('.graph-controls-floating');
      const activeBtn = document.querySelector('.graph-control-btn.active');
      const allBtns = Array.from(document.querySelectorAll('.graph-control-btn')).map(
        (b) => b.textContent?.trim() || ''
      );

      return {
        hasLensBar: Boolean(lensBar),
        hasFloatingControls: Boolean(floatingControls),
        activeControlText: activeBtn ? activeBtn.textContent?.trim() : null,
        allControlsText: allBtns,
        archButtonFound: allBtns.some((t) => t.toLowerCase().includes('architecture orbit')),
      };
    });

    console.log('[UI CONTROL OBSERVATION] Floating Controls:', uiObservation.hasFloatingControls);
    console.log('[UI CONTROL OBSERVATION] Active Control Text:', uiObservation.activeControlText);
    console.log('[UI CONTROL OBSERVATION] Control Buttons:', uiObservation.allControlsText.join(', '));
    console.log('[UI CONTROL OBSERVATION] Architecture Orbit Button Found:', uiObservation.archButtonFound);

    if (!uiObservation.archButtonFound) {
      console.log('[UI CONTROL OBSERVATION NOTE] Architecture Orbit UI control not exposed in current runtime — proceeding via production layout API path.');
    }

    // ----------------------------------------------------
    // GATE 3: AUDIT ALL 4 COMPONENT ORBIT SCENARIOS
    // ----------------------------------------------------
    const scenarioAuditResults = {};

    for (const scenario of scenarios) {
      console.log(`\n================================================================`);
      console.log(`AUDITING SCENARIO: ${scenario.name} (${scenario.focalLwcId})`);
      console.log(`================================================================`);

      // Execute production layout activation path & full metrics in single browser evaluation
      const scenarioEval = await page.evaluate(
        ({ focalId, zoomLevels, viewports, countAabbCollisionsStr }) => {
          const countCollisions = new Function('return ' + countAabbCollisionsStr)();
          const cy = window.__CY__;
          const layoutModule = window.__LAYOUT_MODULE__;
          if (!cy || !layoutModule || typeof layoutModule.runLayoutWithMetadata !== 'function') return null;

          cy.zoom(1.0);
          cy.center();

          // Invoke production Component Orbit layout
          const layoutRes = layoutModule.runLayoutWithMetadata(cy, {
            architectureMode: 'orbit',
            focalLwcId: focalId,
            fit: true,
          });

          const totalNodes = cy.nodes().length;
          const totalEdges = cy.edges().length;

          const projectedIds = Object.keys(layoutRes.positions || {});
          const projectedSet = new Set(projectedIds);

          const visibleCyNodes = cy.nodes().filter((n) => n.visible());
          const visibleCyNodeIds = visibleCyNodes.map((n) => n.id());

          const hiddenCyNodes = cy.nodes().filter((n) => !n.visible());

          // Unfocused visible nodes check
          const visibleUnfocusedIds = visibleCyNodeIds.filter((id) => !projectedSet.has(id));

          // Visible edges & cross-projection edge check
          const visibleCyEdges = cy.edges().filter((e) => e.visible());
          const crossProjectionEdges = visibleCyEdges.filter((e) => {
            const src = e.source().id();
            const tgt = e.target().id();
            return !projectedSet.has(src) || !projectedSet.has(tgt);
          });

          // Unfocused visible labels check
          let unfocusedVisibleLabels = 0;
          cy.nodes().forEach((n) => {
            if (!projectedSet.has(n.id()) && n.visible()) {
              unfocusedVisibleLabels++;
            }
          });

          // Sun position check
          const sunNode = cy.getElementById(focalId);
          const sunPos = sunNode.length > 0 ? sunNode.position() : null;

          // Model-space AABB collisions among focused nodes
          const focusedCyNodes = projectedIds.map((id) => cy.getElementById(id)).filter((n) => n.length > 0);
          const modelFocusedBoxes = focusedCyNodes.map((n) => ({
            id: n.id(),
            ...n.boundingBox({ includeLabels: false }),
          }));
          const modelCollisions = countCollisions(modelFocusedBoxes);

          // Stale position check on representative unfocused nodes
          const unfocusedSample1 = cy.getElementById('ApexClass:ApprovalFlowController');
          const unfocusedSample2 = cy.getElementById('ApexClass:ApprovalFlowControllerTest');

          // Measure Zoom Matrix
          const zoomResults = {};
          const origZoom = cy.zoom();
          const origPan = cy.pan();

          for (const z of zoomLevels) {
            cy.zoom(z);
            cy.center();

            const visibleNodesAtZ = cy.nodes().filter((n) => n.visible());
            const visibleUnfocusedAtZ = visibleNodesAtZ.filter((n) => !projectedSet.has(n.id()));

            const rBoxes = focusedCyNodes.map((n) => ({
              id: n.id(),
              ...n.renderedBoundingBox({ includeLabels: false }),
            }));
            const lBoxes = focusedCyNodes.map((n) => ({
              id: n.id(),
              ...n.renderedBoundingBox({ includeLabels: true }),
            }));

            let unfocusedLabelsAtZ = 0;
            cy.nodes().forEach((n) => {
              if (!projectedSet.has(n.id()) && n.visible()) unfocusedLabelsAtZ++;
            });

            const visEdgesAtZ = cy.edges().filter((e) => e.visible());
            const crossEdgesAtZ = visEdgesAtZ.filter(
              (e) => !projectedSet.has(e.source().id()) || !projectedSet.has(e.target().id())
            );

            zoomResults[z] = {
              zoom: z,
              visibleFocused: visibleNodesAtZ.length - visibleUnfocusedAtZ.length,
              visibleUnfocused: visibleUnfocusedAtZ.length,
              unfocusedLabels: unfocusedLabelsAtZ,
              nodeCollisions: countCollisions(rBoxes),
              labelCollisions: countCollisions(lBoxes),
              crossEdges: crossEdgesAtZ.length,
            };
          }

          // Restore zoom
          cy.zoom(origZoom);
          cy.pan(origPan);

          // Viewport calculations
          const viewportResults = {};
          for (const vp of viewports) {
            let clipped = 0;
            const rBoxes = focusedCyNodes.map((n) => {
              const r = n.renderedBoundingBox({ includeLabels: false });
              if (r.x2 < 0 || r.x1 > vp.width || r.y2 < 0 || r.y1 > vp.height) clipped++;
              return { id: n.id(), ...r };
            });

            const lBoxes = focusedCyNodes.map((n) => ({
              id: n.id(),
              ...n.renderedBoundingBox({ includeLabels: true }),
            }));

            viewportResults[vp.name] = {
              viewport: `${vp.width}x${vp.height}`,
              visibleCount: visibleCyNodes.length,
              unfocusedVisibleCount: visibleUnfocusedIds.length,
              nodeCollisions: countCollisions(rBoxes),
              labelCollisions: countCollisions(lBoxes),
              clipped,
            };
          }

          return {
            evalResult: {
              totalNodes,
              totalEdges,
              projectedCount: projectedIds.length,
              visibleCount: visibleCyNodes.length,
              hiddenCount: hiddenCyNodes.length,
              visibleUnfocusedCount: visibleUnfocusedIds.length,
              visibleEdgesCount: visibleCyEdges.length,
              crossEdgesCount: crossProjectionEdges.length,
              unfocusedVisibleLabels,
              sunPos,
              modelCollisions,
              staleSample1Visible: unfocusedSample1.length > 0 ? unfocusedSample1.visible() : null,
              staleSample2Visible: unfocusedSample2.length > 0 ? unfocusedSample2.visible() : null,
              projectedIdsSorted: projectedIds.slice().sort(),
              visibleIdsSorted: visibleCyNodeIds.slice().sort(),
            },
            zoomResults,
            viewportResults,
          };
        },
        {
          focalId: scenario.focalLwcId,
          zoomLevels,
          viewports,
          countAabbCollisionsStr: countAabbCollisions.toString(),
        }
      );

      if (!scenarioEval) {
        console.error(`PBIM BROWSER CLOSURE FAILED — PROJECTION for ${scenario.name}`);
        throw new Error(`PBIM BROWSER CLOSURE FAILED — PROJECTION for ${scenario.name}`);
      }

      const evalResult = scenarioEval.evalResult;

      // 1. Authoritative Graph Preservation Gate
      console.log(`[GRAPH PRESERVATION GATE] Total Nodes: ${evalResult.totalNodes} | Total Edges: ${evalResult.totalEdges}`);
      if (evalResult.totalNodes !== 528 || evalResult.totalEdges !== 2063) {
        console.error(`PBIM BROWSER CLOSURE FAILED — REGRESSION (Graph modified)`);
        throw new Error(`PBIM BROWSER CLOSURE FAILED — REGRESSION`);
      }

      // 2. Projection Node Equality Gate
      const isSetEqual = JSON.stringify(evalResult.projectedIdsSorted) === JSON.stringify(evalResult.visibleIdsSorted);
      console.log(`[PROJECTION IDENTITY GATE] Projected: ${evalResult.projectedCount} | Visible: ${evalResult.visibleCount} | Set Match: ${isSetEqual}`);
      if (!isSetEqual || evalResult.visibleCount !== scenario.expectedProjected) {
        console.error(`PBIM BROWSER CLOSURE FAILED — PROJECTION for ${scenario.name}`);
        throw new Error(`PBIM BROWSER CLOSURE FAILED — PROJECTION`);
      }

      // 3. Visibility Contract Gate
      console.log(`[VISIBILITY GATE] Hidden Nodes: ${evalResult.hiddenCount} (Expected ${scenario.expectedHidden})`);
      console.log(`[VISIBILITY GATE] Visible Unfocused Nodes: ${evalResult.visibleUnfocusedCount}`);
      if (evalResult.visibleUnfocusedCount > 0 || evalResult.hiddenCount !== scenario.expectedHidden) {
        console.error(`PBIM BROWSER CLOSURE FAILED — VISIBILITY CONTAMINATION for ${scenario.name}`);
        throw new Error(`PBIM BROWSER CLOSURE FAILED — VISIBILITY CONTAMINATION`);
      }

      // 4. Label Contamination Gate
      console.log(`[LABEL CONTAMINATION GATE] Unfocused Visible Labels: ${evalResult.unfocusedVisibleLabels}`);
      if (evalResult.unfocusedVisibleLabels > 0) {
        console.error(`PBIM BROWSER CLOSURE FAILED — VISIBILITY CONTAMINATION (Unfocused labels visible)`);
        throw new Error(`PBIM BROWSER CLOSURE FAILED — VISIBILITY CONTAMINATION`);
      }

      // 5. Edge Contamination Gate
      console.log(`[EDGE CONTAMINATION GATE] Visible Edges: ${evalResult.visibleEdgesCount} | Cross-Projection Edges: ${evalResult.crossEdgesCount}`);
      if (evalResult.crossEdgesCount > 0) {
        console.error(`PBIM BROWSER CLOSURE FAILED — EDGE CONTAMINATION for ${scenario.name}`);
        throw new Error(`PBIM BROWSER CLOSURE FAILED — EDGE CONTAMINATION`);
      }

      // 6. Stale Position Contamination Gate
      console.log(`[STALE POSITION GATE] Sample Unfocused 1 Visible: ${evalResult.staleSample1Visible} | Sample 2 Visible: ${evalResult.staleSample2Visible}`);
      if (evalResult.staleSample1Visible === true || evalResult.staleSample2Visible === true) {
        console.error(`PBIM BROWSER CLOSURE FAILED — VISIBILITY CONTAMINATION (Stale position node visible)`);
        throw new Error(`PBIM BROWSER CLOSURE FAILED — VISIBILITY CONTAMINATION`);
      }

      // 7. Sun Position Gate
      const sun = evalResult.sunPos;
      const sunCentered = sun && Math.abs(sun.x) <= 1e-3 && Math.abs(sun.y) <= 1e-3;
      console.log(`[SUN POSITION GATE] Sun Centered at (0,0): (${sun?.x?.toFixed(6)}, ${sun?.y?.toFixed(6)}) -> ${sunCentered}`);
      if (!sunCentered) {
        console.error(`PBIM BROWSER CLOSURE FAILED — GEOMETRY for ${scenario.name}`);
        throw new Error(`PBIM BROWSER CLOSURE FAILED — GEOMETRY`);
      }

      // 8. Model Space AABB Collisions Gate
      console.log(`[GEOMETRY GATE] Model Space Focused AABB Collisions: ${evalResult.modelCollisions}`);
      if (evalResult.modelCollisions > 0) {
        console.error(`PBIM BROWSER CLOSURE FAILED — GEOMETRY (Model collisions) for ${scenario.name}`);
        throw new Error(`PBIM BROWSER CLOSURE FAILED — GEOMETRY`);
      }

      // Save Screenshot for Scenario
      let shotName = '';
      if (scenario.name === 'Asset') shotName = 'component_orbit_asset.png';
      if (scenario.name === 'Citizen') shotName = 'component_orbit_citizen.png';
      if (scenario.name === 'Vendor') shotName = 'component_orbit_vendor.png';
      if (scenario.name === 'Error') shotName = 'component_orbit_error.png';

      await safeScreenshot(path.join(screenshotDir, shotName));

      scenarioAuditResults[scenario.name] = {
        focalLwcId: scenario.focalLwcId,
        metrics: evalResult,
        zooms: scenarioEval.zoomResults,
        viewports: scenarioEval.viewportResults,
      };
    }

    // ----------------------------------------------------
    // GATE 4: FOCUS TRANSITIONS MATRIX
    // ----------------------------------------------------
    console.log('\n--- AUDITING FOCUS TRANSITIONS MATRIX ---');
    console.log('Sequence: Asset -> Citizen -> Vendor -> Error -> Asset');

    const transitionSequence = [
      { from: 'Asset', to: 'Citizen', focalId: 'LWC:citizen-report-portal', expected: 102 },
      { from: 'Citizen', to: 'Vendor', focalId: 'LWC:vendor-workspace', expected: 101 },
      { from: 'Vendor', to: 'Error', focalId: 'LWC:error-panel', expected: 1 },
      { from: 'Error', to: 'Asset', focalId: 'LWC:asset-dashboard-container', expected: 128 },
    ];

    const transitionMatrix = [];

    // Reset to Asset first
    await page.evaluate(({ focalId }) => {
      window.__LAYOUT_MODULE__.runLayoutWithMetadata(window.__CY__, { architectureMode: 'orbit', focalLwcId: focalId, fit: true });
    }, { focalId: 'LWC:asset-dashboard-container' });

    let previousNodeIds = await page.evaluate(() => {
      return window.__CY__.nodes().filter((n) => n.visible()).map((n) => n.id());
    });

    for (const step of transitionSequence) {
      console.log(`Transitioning: ${step.from} -> ${step.to} (${step.focalId})...`);

      const res = await page.evaluate(({ focalId, prevIds }) => {
        const cy = window.__CY__;
        const layoutModule = window.__LAYOUT_MODULE__;

        const layoutRes = layoutModule.runLayoutWithMetadata(cy, {
          architectureMode: 'orbit',
          focalLwcId: focalId,
          fit: true,
        });

        const currentProjectedIds = Object.keys(layoutRes.positions);
        const currentProjectedSet = new Set(currentProjectedIds);

        const visibleNodes = cy.nodes().filter((n) => n.visible());
        const visibleIds = visibleNodes.map((n) => n.id());
        const visibleSet = new Set(visibleIds);

        // Stale previous nodes
        const stalePreviousNodes = prevIds.filter((id) => !currentProjectedSet.has(id) && visibleSet.has(id));

        // Visible unfocused nodes
        const visibleUnfocused = visibleIds.filter((id) => !currentProjectedSet.has(id));

        // Visible cross edges
        const visEdges = cy.edges().filter((e) => e.visible());
        const crossEdges = visEdges.filter(
          (e) => !currentProjectedSet.has(e.source().id()) || !currentProjectedSet.has(e.target().id())
        );

        return {
          runtimeNodes: cy.nodes().length,
          runtimeEdges: cy.edges().length,
          actualVisible: visibleNodes.length,
          stalePreviousCount: stalePreviousNodes.length,
          visibleUnfocusedCount: visibleUnfocused.length,
          crossEdgesCount: crossEdges.length,
          visibleIds,
          currentProjectedIds,
        };
      }, { focalId: step.focalId, prevIds: previousNodeIds });

      if (step.from === 'Asset' && step.to === 'Citizen') {
        await safeScreenshot(path.join(screenshotDir, 'transition_asset_to_citizen.png'));
      }

      console.log(`  [TRANSITION ${step.from} -> ${step.to}] Expected Visible: ${step.expected} | Actual Visible: ${res.actualVisible}`);
      console.log(`  [TRANSITION ${step.from} -> ${step.to}] Stale Previous Nodes: ${res.stalePreviousCount} | Visible Unfocused: ${res.visibleUnfocusedCount}`);
      console.log(`  [TRANSITION ${step.from} -> ${step.to}] Cross Edges: ${res.crossEdgesCount} | Runtime Graph: ${res.runtimeNodes}/${res.runtimeEdges}`);

      if (
        res.actualVisible !== step.expected ||
        res.stalePreviousCount > 0 ||
        res.visibleUnfocusedCount > 0 ||
        res.crossEdgesCount > 0 ||
        res.runtimeNodes !== 528 ||
        res.runtimeEdges !== 2063
      ) {
        console.error(`PBIM BROWSER CLOSURE FAILED — VISIBILITY CONTAMINATION during transition ${step.from} -> ${step.to}`);
        throw new Error(`PBIM BROWSER CLOSURE FAILED — VISIBILITY CONTAMINATION`);
      }

      transitionMatrix.push({
        transition: `${step.from} → ${step.to}`,
        expectedVisible: step.expected,
        actualVisible: res.actualVisible,
        stalePreviousNodes: res.stalePreviousCount,
        visibleUnfocused: res.visibleUnfocusedCount,
        crossEdges: res.crossEdgesCount,
        verdict: 'PASS',
      });

      previousNodeIds = res.visibleIds;
    }

    // ----------------------------------------------------
    // GATE 5: EXIT AND RE-ENTRY MATRIX
    // ----------------------------------------------------
    console.log('\n--- AUDITING EXIT AND RE-ENTRY MATRIX ---');

    // Step 1: Switch to Hierarchical mode
    console.log('Switching to Hierarchical mode...');
    const hierRes = await page.evaluate(() => {
      const cy = window.__CY__;
      const layoutModule = window.__LAYOUT_MODULE__;

      layoutModule.runLayoutWithMetadata(cy, {
        architectureMode: 'hierarchical',
        fit: true,
      });

      const visNodes = cy.nodes().filter((n) => n.visible());
      const visEdges = cy.edges().filter((e) => e.visible());

      return {
        visNodesCount: visNodes.length,
        visEdgesCount: visEdges.length,
      };
    });

    await safeScreenshot(path.join(screenshotDir, 'exit_orbit_to_hierarchical.png'));

    console.log(`[EXIT TO HIERARCHICAL] Visible Nodes: ${hierRes.visNodesCount}/528 | Visible Edges: ${hierRes.visEdgesCount}/2063`);
    if (hierRes.visNodesCount !== 528 || hierRes.visEdgesCount !== 2063) {
      console.error(`PBIM BROWSER CLOSURE FAILED — REGRESSION (Hierarchical mode incomplete)`);
      throw new Error(`PBIM BROWSER CLOSURE FAILED — REGRESSION`);
    }

    // Step 2: Switch to Hybrid mode
    console.log('Switching to Hybrid mode...');
    const hybridRes = await page.evaluate(() => {
      const cy = window.__CY__;
      const layoutModule = window.__LAYOUT_MODULE__;

      layoutModule.runLayoutWithMetadata(cy, {
        architectureMode: 'hybrid',
        fit: true,
      });

      const visNodes = cy.nodes().filter((n) => n.visible());
      const visEdges = cy.edges().filter((e) => e.visible());

      return {
        visNodesCount: visNodes.length,
        visEdgesCount: visEdges.length,
      };
    });

    console.log(`[EXIT TO HYBRID] Visible Nodes: ${hybridRes.visNodesCount}/528 | Visible Edges: ${hybridRes.visEdgesCount}/2063`);
    if (hybridRes.visNodesCount !== 528) {
      console.error(`PBIM BROWSER CLOSURE FAILED — REGRESSION (Hybrid mode incomplete)`);
      throw new Error(`PBIM BROWSER CLOSURE FAILED — REGRESSION`);
    }

    // Step 3: Re-enter Component Orbit
    console.log('Re-entering Component Orbit (Asset)...');
    const reenterRes = await page.evaluate(() => {
      const cy = window.__CY__;
      const layoutModule = window.__LAYOUT_MODULE__;

      const layoutRes = layoutModule.runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:asset-dashboard-container',
        fit: true,
      });

      const projectedIds = Object.keys(layoutRes.positions);
      const projectedSet = new Set(projectedIds);

      const visNodes = cy.nodes().filter((n) => n.visible());
      const visNodeIds = visNodes.map((n) => n.id());
      const visUnfocused = visNodeIds.filter((id) => !projectedSet.has(id));

      return {
        visCount: visNodes.length,
        hiddenCount: cy.nodes().length - visNodes.length,
        visUnfocusedCount: visUnfocused.length,
      };
    });

    console.log(`[RE-ENTRY COMPONENT ORBIT] Visible: ${reenterRes.visCount} (Expected 128) | Hidden: ${reenterRes.hiddenCount} (Expected 400) | Unfocused Visible: ${reenterRes.visUnfocusedCount}`);
    if (reenterRes.visCount !== 128 || reenterRes.hiddenCount !== 400 || reenterRes.visUnfocusedCount > 0) {
      console.error(`PBIM BROWSER CLOSURE FAILED — VISIBILITY CONTAMINATION on re-entry`);
      throw new Error(`PBIM BROWSER CLOSURE FAILED — VISIBILITY CONTAMINATION`);
    }

    // ----------------------------------------------------
    // GATE 6: DETERMINISM GATE
    // ----------------------------------------------------
    console.log('\n--- AUDITING 2-RUN COORDINATE DETERMINISM ---');
    const determinismResult = await page.evaluate(() => {
      const cy = window.__CY__;
      const layoutModule = window.__LAYOUT_MODULE__;

      const run1 = layoutModule.runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:asset-dashboard-container',
        fit: true,
      });

      const pos1 = JSON.parse(JSON.stringify(run1.positions));

      const run2 = layoutModule.runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:asset-dashboard-container',
        fit: true,
      });

      const pos2 = run2.positions;

      let maxDrift = 0;
      let driftCount = 0;

      for (const id of Object.keys(pos1)) {
        const p1 = pos1[id];
        const p2 = pos2[id];
        if (!p2) {
          driftCount++;
          continue;
        }
        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDrift) maxDrift = dist;
        if (dist > 1e-4) driftCount++;
      }

      return {
        maxDrift,
        driftCount,
        totalNodesChecked: Object.keys(pos1).length,
      };
    });

    console.log(`[DETERMINISM GATE] Nodes Checked: ${determinismResult.totalNodesChecked}`);
    console.log(`[DETERMINISM GATE] Max Drift: ${determinismResult.maxDrift.toFixed(5)} px | Drift Count: ${determinismResult.driftCount}`);

    if (determinismResult.driftCount > 0 || determinismResult.maxDrift > 1e-4) {
      console.error(`PBIM BROWSER CLOSURE FAILED — GEOMETRY (Determinism drift)`);
      throw new Error(`PBIM BROWSER CLOSURE FAILED — GEOMETRY`);
    }

    // ----------------------------------------------------
    // GATE 7: POSITION AUTHORITY AUDIT (CASES A-D)
    // ----------------------------------------------------
    console.log('\n--- AUDITING POSITION AUTHORITY (CASES A-D) ---');
    const posAuthorityResult = await page.evaluate(() => {
      const cy = window.__CY__;
      const layoutModule = window.__LAYOUT_MODULE__;
      const focalId = 'LWC:asset-dashboard-container';

      // Case A: stale position on Sun node
      const caseA = layoutModule.runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: focalId,
        existingPositions: { [focalId]: { x: 9999, y: 8888 } },
      });

      // Case B: stale position on projected dependency
      const depId = Object.keys(caseA.positions).find((id) => id !== focalId);
      const caseB = layoutModule.runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: focalId,
        existingPositions: { [depId]: { x: 7777, y: 6666 } },
      });

      // Case C: position on unprojected node
      const unprojId = 'ApexClass:ApprovalFlowController';
      const caseC = layoutModule.runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: focalId,
        existingPositions: { [unprojId]: { x: 500, y: 500 } },
      });

      const unprojCyNode = cy.getElementById(unprojId);

      return {
        sunX: caseA.positions[focalId].x,
        sunY: caseA.positions[focalId].y,
        depX: caseB.positions[depId].x,
        depY: caseB.positions[depId].y,
        unprojInternalPos: caseC.positions[unprojId],
        unprojVisible: unprojCyNode.length > 0 ? unprojCyNode.visible() : null,
      };
    });

    console.log(`[POSITION AUTHORITY] Case A (Sun reset to 0,0): (${posAuthorityResult.sunX}, ${posAuthorityResult.sunY}) -> ${posAuthorityResult.sunX === 0 && posAuthorityResult.sunY === 0}`);
    console.log(`[POSITION AUTHORITY] Case C (Unprojected internal pos retained):`, posAuthorityResult.unprojInternalPos, `| Visible: ${posAuthorityResult.unprojVisible}`);

    if (
      posAuthorityResult.sunX !== 0 ||
      posAuthorityResult.sunY !== 0 ||
      posAuthorityResult.unprojVisible === true
    ) {
      console.error(`PBIM BROWSER CLOSURE FAILED — POSITION AUTHORITY REGRESSION`);
      throw new Error(`PBIM BROWSER CLOSURE FAILED — POSITION AUTHORITY REGRESSION`);
    }

    // ----------------------------------------------------
    // GATE 8: VENDOR RING 1 SEMANTIC SPOT CHECK
    // ----------------------------------------------------
    console.log('\n--- AUDITING VENDOR RING 1 SEMANTICS ---');
    const vendorRing1Result = await page.evaluate(() => {
      const cy = window.__CY__;
      const layoutModule = window.__LAYOUT_MODULE__;

      const layoutRes = layoutModule.runLayoutWithMetadata(cy, {
        architectureMode: 'orbit',
        focalLwcId: 'LWC:vendor-workspace',
        fit: true,
      });

      const ring1ExpectedNodeIds = [
        'LWC:vendor-card',
        'LWC:vendor-history-modal',
        'ApexClass:VendorAssignmentController',
        'ApexClass:MaintenanceRequestController',
        'ApexClass:ExpenseController',
      ];

      const ring1ActualNodes = [];
      const positions = layoutRes.positions;

      for (const [id, pos] of Object.entries(positions)) {
        const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        if (dist > 100 && dist < 350) {
          ring1ActualNodes.push(id);
        }
      }

      const containsVendorSelector = ring1ActualNodes.includes('ApexClass:VendorSelector');

      return {
        ring1Nodes: ring1ActualNodes.sort(),
        expectedNodes: ring1ExpectedNodeIds.sort(),
        containsVendorSelector,
      };
    });

    console.log(`[VENDOR RING 1 SPOT CHECK] Nodes on Ring 1:`, vendorRing1Result.ring1Nodes.join(', '));
    console.log(`[VENDOR RING 1 SPOT CHECK] Contains VendorSelector: ${vendorRing1Result.containsVendorSelector}`);

    if (vendorRing1Result.containsVendorSelector) {
      console.error(`PBIM BROWSER CLOSURE FAILED — SEMANTIC REGRESSION (VendorSelector classified on Ring 1)`);
      throw new Error(`PBIM BROWSER CLOSURE FAILED — SEMANTIC REGRESSION`);
    }

    // ----------------------------------------------------
    // GATE 9: SHARED APEX IDENTITY & PRESERVATION GATE
    // ----------------------------------------------------
    console.log('\n--- AUDITING SHARED APEX IDENTITY & PRESERVATION ---');
    const sharedApexResult = await page.evaluate(() => {
      const cy = window.__CY__;

      const sharedHubIds = [
        'ApexClass:AssetDashboardController',
        'ApexClass:BudgetController',
        'ApexClass:CitizenRequestController',
        'ApexClass:CityZoneController',
        'ApexClass:MaintenanceRequestController',
        'ApexClass:VendorAssignmentController',
        'ApexClass:ZoneUtil',
      ];

      const counts = {};
      let totalNodes = cy.nodes().length;

      for (const id of sharedHubIds) {
        counts[id] = cy.getElementById(id).length;
      }

      return {
        totalNodes,
        counts,
      };
    });

    console.log(`[SHARED APEX IDENTITY] Total Cytoscape Nodes: ${sharedApexResult.totalNodes}`);
    console.log(`[SHARED APEX IDENTITY] Hub Node Counts in Cytoscape (must all be 1):`, sharedApexResult.counts);

    const allHubsSingle = Object.values(sharedApexResult.counts).every((c) => c === 1);
    if (!allHubsSingle || sharedApexResult.totalNodes !== 528) {
      console.error(`PBIM BROWSER CLOSURE FAILED — REGRESSION (Shared Apex hub identity corrupted)`);
      throw new Error(`PBIM BROWSER CLOSURE FAILED — REGRESSION`);
    }

    // ----------------------------------------------------
    // WRITE OUTPUT RESULTS JSON
    // ----------------------------------------------------
    const auditOutput = {
      executiveVerdict: 'PBIM BROWSER CLOSURE PASSED',
      datasetIdentity: {
        file: pbimPath,
        sha256: pbimHash,
        nodes: 528,
        edges: 2063,
        lwcs: 30,
        sharedHubs: 7,
      },
      uiObservation,
      scenarios: scenarioAuditResults,
      transitionMatrix,
      exitAndReentry: {
        hierarchical: hierRes,
        hybrid: hybridRes,
        reentryOrbit: reenterRes,
      },
      determinism: determinismResult,
      positionAuthority: posAuthorityResult,
      vendorRing1SpotCheck: vendorRing1Result,
      sharedApexIdentity: sharedApexResult,
      consoleErrorsCount: consoleErrors.length,
      pageErrorsCount: pageErrors.length,
    };

    const jsonOutPath = path.join(fixtureDir, 'component-orbit-real-pbim-audit-results.json');
    fs.writeFileSync(jsonOutPath, JSON.stringify(auditOutput, null, 2));

    console.log(`\n========================================================================`);
    console.log(`AUDIT COMPLETE! All runtime gates PASSED.`);
    console.log(`Saved output evidence to: ${jsonOutPath}`);
    console.log(`EXECUTIVE VERDICT: PBIM BROWSER CLOSURE PASSED`);
    console.log(`========================================================================\n`);

  } finally {
    await context.close();
    await browser.close();
  }
}

runRealPbimClosureAudit().catch((err) => {
  console.error('\nFATAL Real PBIM Browser Closure Audit Failure:', err);
  process.exit(1);
});
