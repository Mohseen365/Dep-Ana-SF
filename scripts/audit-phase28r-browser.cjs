const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function log(msg) {
  process.stdout.write(`[PHASE-28R BROWSER] ${msg}\n`);
}

async function runPhase28rBrowserAudit() {
  log('Starting Phase 28R Real Project Real Browser Audit & Controlled Zoom Sweep...');
  const tStart = Date.now();

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  const ssDir = path.join(rootDir, 'verification_b_screenshots');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

  const positionsPath = path.join(fixtureDir, 'phase28r-positions-and-labels.json');
  if (!fs.existsSync(positionsPath)) {
    throw new Error(`Positions file not found: ${positionsPath}. Run Vitest harness first.`);
  }

  const positionsAndLabels = JSON.parse(fs.readFileSync(positionsPath, 'utf-8'));

  log('Launching headless Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();

  const viewports = [
    { name: '1024x768', width: 1024, height: 768 },
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '2560x1440', width: 2560, height: 1440 },
  ];

  const zoomLevelsToSweep = [0.05, 0.08, 0.10, 0.11, 0.12, 0.15, 0.20, 0.30, 0.40, 0.50];

  const summary = {};
  const zoomSweepSummary = {};
  const fullCorpus = {};

  const projectsToAudit = ['pbim', 'cloud-spend-tracker'];

  for (const projId of projectsToAudit) {
    log(`\n======================================================`);
    log(`AUDITING PROJECT: ${projId.toUpperCase()}`);
    log(`======================================================`);

    summary[projId] = {};
    zoomSweepSummary[projId] = {};

    log(`Navigating to http://localhost:3000/?project=${projId} ...`);
    await page.goto(`http://localhost:3000/?project=${projId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 60000 });

    log('Activating Hybrid Mode...');
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      if (btn && !btn.classList.contains('active')) btn.click();
    });
    await page.waitForTimeout(500);

    const candMap = positionsAndLabels[projId] || {};
    const candidateIds = Object.keys(candMap);

    // TASK 1: CONTROLLED ZOOM SWEEP (specifically on R0_P27E_Reproduction and R4_AdaptiveCapacity)
    log(`\n------------------------------------------------------`);
    log(`TASK 1: CONTROLLED ZOOM SWEEP ON ${projId.toUpperCase()}`);
    log(`------------------------------------------------------`);

    for (const candId of ['R0_P27E_Reproduction', 'R4_AdaptiveCapacity']) {
      if (!candMap[candId]) continue;
      zoomSweepSummary[projId][candId] = [];

      const candData = candMap[candId];

      await page.evaluate(({ positions, displayLabels }) => {
        const cy = window.__CY__;
        cy.batch(() => {
          cy.nodes().forEach((node) => {
            const id = node.id();
            if (positions[id]) {
              node.position(positions[id]);
            }
            const label = displayLabels[id] || node.data('displayName') || id;
            node.data('label', label);
            node.data('displayLabel', label);
          });
        });
      }, { positions: candData.positions, displayLabels: candData.displayLabels });

      await page.setViewportSize({ width: 1920, height: 1080 });

      for (const targetZoom of zoomLevelsToSweep) {
        // Explicitly set zoom level on Cytoscape instance
        const sweepRes = await page.evaluate(({ targetZoom, candidateId }) => {
          const cy = window.__CY__;
          cy.zoom(targetZoom);
          cy.center();

          // Trigger LOD class computation as in GraphView.tsx
          const nodeCount = cy.nodes().length;
          const edgeCount = cy.edges().length;
          let lodLevel = 0;
          if (nodeCount >= 10000 || targetZoom < 0.1) lodLevel = 4;
          else if (nodeCount >= 5000 || targetZoom < 0.3) lodLevel = 3;
          else if (nodeCount >= 2500 || targetZoom < 0.6) lodLevel = 2;
          else if (nodeCount >= 1000 || targetZoom < 1.2) lodLevel = 1;
          else lodLevel = 0;

          cy.batch(() => {
            cy.elements().removeClass('zoom-far zoom-mid zoom-near lod-0 lod-1 lod-2 lod-3 lod-4');
            if (lodLevel >= 2) {
              cy.elements().addClass(`zoom-far lod-${lodLevel}`);
            } else if (lodLevel === 1) {
              cy.elements().addClass(`zoom-mid lod-${lodLevel}`);
            } else {
              cy.elements().addClass(`zoom-near lod-${lodLevel}`);
            }
          });

          const currentZoom = cy.zoom();
          const nodesList = cy.nodes();
          const N = nodesList.length;

          // Check if labels are visible in DOM / rendering
          const isZoomFar = cy.elements().hasClass('zoom-far');
          const labelsVisible = !isZoomFar;

          // Compute collisions
          const nodesData = [];
          for (let i = 0; i < N; i++) {
            const n = nodesList[i];
            const pos = n.position();
            const r = n.renderedBoundingBox();
            nodesData.push({
              id: n.id(),
              label: n.data('label'),
              posX: pos.x, posY: pos.y,
              rx1: r.x1, ry1: r.y1, rx2: r.x2, ry2: r.y2
            });
          }

          const collisions = [];
          let sameRowHorizontalCount = 0;
          let adjacentRow2DCount = 0;
          let true2DCount = 0;

          if (labelsVisible) {
            const sorted = [...nodesData].sort((a, b) => a.rx1 - b.rx1);
            for (let i = 0; i < N; i++) {
              const nA = sorted[i];
              for (let j = i + 1; j < N; j++) {
                const nB = sorted[j];
                if (nB.rx1 >= nA.rx2) break;

                const overlapX = Math.min(nA.rx2, nB.rx2) - Math.max(nA.rx1, nB.rx1);
                const overlapY = Math.min(nA.ry2, nB.ry2) - Math.max(nA.ry1, nB.ry1);

                if (overlapX > 0 && overlapY > 0) {
                  const dyCenterModel = Math.abs(nA.posY - nB.posY);
                  let axisClass = 'TRUE_2D';
                  if (dyCenterModel < 10) {
                    axisClass = 'SAME_ROW_HORIZONTAL_PRIMARY';
                    sameRowHorizontalCount++;
                  } else if (dyCenterModel <= 160) {
                    axisClass = 'ADJACENT_ROW_2D';
                    adjacentRow2DCount++;
                  } else {
                    true2DCount++;
                  }

                  collisions.push({
                    nodeA: nA.id,
                    nodeB: nB.id,
                    labelA: nA.label,
                    labelB: nB.label,
                    dxCenterModel: Math.abs(nA.posX - nB.posX),
                    dyCenterModel,
                    overlapX,
                    overlapY,
                    axisClass
                  });
                }
              }
            }
          }

          return {
            targetZoom,
            actualZoom: Math.round(currentZoom * 1000) / 1000,
            lodLevel,
            isZoomFar,
            labelsVisible,
            visibleNodeCount: N,
            renderedCollisionCount: collisions.length,
            sameRowHorizontalCount,
            adjacentRow2DCount,
            true2DCount,
            collisions
          };
        }, { targetZoom, candidateId: candId });

        zoomSweepSummary[projId][candId].push(sweepRes);
        log(`  [Zoom Sweep] ${candId.padEnd(24)} | z=${sweepRes.actualZoom.toFixed(2)} | LOD=${sweepRes.lodLevel} | LabelsVisible=${sweepRes.labelsVisible} | Collisions=${sweepRes.renderedCollisionCount}`);
      }
    }

    // TASK 2: FULL CANDIDATE MATRIX AUDIT ACROSS 5 VIEWPORTS (FIT-TO-SCREEN & FORCED LABEL-VISIBLE)
    log(`\n------------------------------------------------------`);
    log(`TASK 2: VIEWPORT AUDIT (FIT-TO-SCREEN & FORCED VISIBLE)`);
    log(`------------------------------------------------------`);

    for (const candId of candidateIds) {
      log(`\nEvaluating Candidate: ${candId}`);
      summary[projId][candId] = {};

      const candData = candMap[candId];

      await page.evaluate(({ positions, displayLabels }) => {
        const cy = window.__CY__;
        cy.batch(() => {
          cy.nodes().forEach((node) => {
            const id = node.id();
            if (positions[id]) {
              node.position(positions[id]);
            }
            const label = displayLabels[id] || node.data('displayName') || id;
            node.data('label', label);
            node.data('displayLabel', label);
          });
        });
      }, { positions: candData.positions, displayLabels: candData.displayLabels });

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        await page.evaluate(() => {
          window.__CY__.fit(undefined, 50);
        });

        // Query both fit-to-screen LOD and forced label-visible LOD
        const vpForensics = await page.evaluate(({ vpWidth, vpHeight, candidateId }) => {
          const cy = window.__CY__;
          const zoomFit = cy.zoom();

          // 1. Natural Fit Evaluation
          const nodesList = cy.nodes();
          const N = nodesList.length;

          // Check if zoomFit has zoom-far
          const isFitZoomFar = zoomFit < 0.1 || cy.elements().hasClass('zoom-far');

          // Helper to get collisions
          function getCollisionsForState(forceVisible) {
            if (!forceVisible && isFitZoomFar) {
              return { total: 0, sameRow: 0, adjacentRow: 0, true2D: 0, list: [] };
            }

            const nodesData = [];
            for (let i = 0; i < N; i++) {
              const n = nodesList[i];
              const pos = n.position();
              const r = n.renderedBoundingBox();
              nodesData.push({
                id: n.id(),
                label: n.data('label') || n.id(),
                posX: pos.x,
                posY: pos.y,
                rx1: r.x1, ry1: r.y1, rx2: r.x2, ry2: r.y2
              });
            }

            const sorted = [...nodesData].sort((a, b) => a.rx1 - b.rx1);
            const collisions = [];
            let sameRow = 0, adjacentRow = 0, true2D = 0;

            for (let i = 0; i < N; i++) {
              const nA = sorted[i];
              for (let j = i + 1; j < N; j++) {
                const nB = sorted[j];
                if (nB.rx1 >= nA.rx2) break;

                const overlapX = Math.min(nA.rx2, nB.rx2) - Math.max(nA.rx1, nB.rx1);
                const overlapY = Math.min(nA.ry2, nB.ry2) - Math.max(nA.ry1, nB.ry1);

                if (overlapX > 0 && overlapY > 0) {
                  const dyCenterModel = Math.abs(nA.posY - nB.posY);
                  let axisClass = 'TRUE_2D';
                  if (dyCenterModel < 10) {
                    axisClass = 'SAME_ROW_HORIZONTAL_PRIMARY';
                    sameRow++;
                  } else if (dyCenterModel <= 160) {
                    axisClass = 'ADJACENT_ROW_2D';
                    adjacentRow++;
                  } else {
                    true2D++;
                  }

                  collisions.push({
                    nodeA: nA.id,
                    nodeB: nB.id,
                    labelA: nA.label,
                    labelB: nB.label,
                    dxCenterModel: Math.abs(nA.posX - nB.posX),
                    dyCenterModel,
                    overlapX,
                    overlapY,
                    axisClass
                  });
                }
              }
            }

            return { total: collisions.length, sameRow, adjacentRow, true2D, list: collisions };
          }

          const fitResult = getCollisionsForState(false);

          // 2. Forced Label-Visible Evaluation
          cy.elements().removeClass('zoom-far lod-2 lod-3 lod-4');
          cy.elements().addClass('zoom-near lod-0');
          const visibleResult = getCollisionsForState(true);

          return {
            candidateId,
            viewport: `${vpWidth}x${vpHeight}`,
            zoomFit: Math.round(zoomFit * 1000) / 1000,
            isFitZoomFar,
            fitRenderedCollisions: fitResult.total,
            visibleRenderedCollisions: visibleResult.total,
            visibleSameRow: visibleResult.sameRow,
            visibleAdjacentRow: visibleResult.adjacentRow,
            visibleTrue2D: visibleResult.true2D,
            visibleCollisions: visibleResult.list
          };
        }, { vpWidth: vp.width, vpHeight: vp.height, candidateId: candId });

        summary[projId][candId][vp.name] = vpForensics;
        const corpusKey = `${projId}_${candId}_${vp.name}`;
        fullCorpus[corpusKey] = vpForensics;

        log(`  - Viewport ${vp.name.padEnd(10)} | ZoomFit: ${vpForensics.zoomFit} | FitCollisions: ${vpForensics.fitRenderedCollisions} | VisibleCollisions: ${vpForensics.visibleRenderedCollisions} (SameRow=${vpForensics.visibleSameRow}, AdjRow=${vpForensics.visibleAdjacentRow}, True2D=${vpForensics.visibleTrue2D})`);
      }
    }
  }

  // DEFAULT PROJECT ISOLATION GATE
  log('\n======================================================');
  log('VERIFYING DEFAULT PROJECT ISOLATION GATE');
  log('======================================================');
  await page.goto('http://localhost:3000/?project=default', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(500);
  const defaultNodeCount = await page.evaluate(() => window.__CY__ ? window.__CY__.nodes().length : 0);
  log(`Default Project Node Count: ${defaultNodeCount}`);

  await browser.close();

  fs.writeFileSync(path.join(fixtureDir, 'phase28r-browser-summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(fixtureDir, 'phase28r-zoom-sweep-summary.json'), JSON.stringify(zoomSweepSummary, null, 2));
  fs.writeFileSync(path.join(fixtureDir, 'phase28r-browser-corpus.json'), JSON.stringify(fullCorpus, null, 2));

  log(`\n=== PHASE 28R BROWSER AUDIT COMPLETE in ${Date.now() - tStart} ms ===`);
  log('Saved summaries to phase28r-browser-summary.json, phase28r-zoom-sweep-summary.json, and phase28r-browser-corpus.json');
}

runPhase28rBrowserAudit().catch((err) => {
  console.error('Phase 28R Browser Audit Failed:', err);
  process.exit(1);
});
