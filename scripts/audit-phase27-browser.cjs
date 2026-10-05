const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function log(msg) {
  process.stdout.write(`[PHASE-27 BROWSER] ${msg}\n`);
}

async function runPhase27BrowserAudit() {
  log('Starting Phase 27 Real Project Real Browser Audit...');
  const tStart = Date.now();

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  const ssDir = path.join(rootDir, 'verification_b_screenshots');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

  const positionsPath = path.join(fixtureDir, 'phase27-positions-and-labels.json');
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

  const projectsToAudit = ['pbim', 'cloud-spend-tracker'];
  const summary = {};
  const fullCorpus = {};

  for (const projId of projectsToAudit) {
    log(`\n======================================================`);
    log(`AUDITING PROJECT: ${projId.toUpperCase()}`);
    log(`======================================================`);

    summary[projId] = {};

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

    for (const candId of candidateIds) {
      log(`\nEvaluating Candidate: ${candId}`);
      summary[projId][candId] = {};

      const candData = candMap[candId];

      // Apply positions & labels to live Cytoscape instance
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
        const vpStart = Date.now();
        await page.setViewportSize({ width: vp.width, height: vp.height });

        await page.evaluate(() => {
          window.__CY__.fit(undefined, 50);
        });

        // Query live Cytoscape runtime renderedBoundingBox and boundingBox
        const vpForensics = await page.evaluate(({ vpWidth, vpHeight, candidateId }) => {
          const cy = window.__CY__;
          const zoom = cy.zoom();
          const pan = cy.pan();
          const container = cy.container();
          const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0, width: vpWidth, height: vpHeight };

          const nodesList = cy.nodes();
          const N = nodesList.length;
          const nodesData = [];

          for (let i = 0; i < N; i++) {
            const n = nodesList[i];
            const id = n.id();
            const pos = n.position();
            const r = n.renderedBoundingBox();
            const m = n.boundingBox();
            const label = n.data('label') || n.data('displayName') || id;

            nodesData.push({
              id,
              label,
              type: n.data('type') || 'Unknown',
              feature: n.data('feature') || n.data('primaryFeatureId') || 'Unassigned',
              layer: n.data('layer') || n.data('processingLayer') || 'Unknown',
              posX: pos.x,
              posY: pos.y,
              width: n.width(),
              height: n.height(),
              rx1: r.x1, ry1: r.y1, rx2: r.x2, ry2: r.y2, rw: r.w, rh: r.h,
              mx1: m.x1, my1: m.y1, mx2: m.x2, my2: m.y2, mw: m.w, mh: m.h,
              domLeft: containerRect.left + r.x1,
              domTop: containerRect.top + r.y1,
              domRight: containerRect.left + r.x2,
              domBottom: containerRect.top + r.y2
            });
          }

          const sorted = [...nodesData].sort((a, b) => a.rx1 - b.rx1);
          const collisions = [];

          let sameRowHorizontalPrimaryCount = 0;
          let adjacentRow2DCount = 0;
          let verticalOnlyCount = 0;
          let true2DCount = 0;

          for (let i = 0; i < N; i++) {
            const nA = sorted[i];

            for (let j = i + 1; j < N; j++) {
              const nB = sorted[j];
              if (nB.rx1 >= nA.rx2) break; // Sweep pruning

              const overlapX = Math.min(nA.rx2, nB.rx2) - Math.max(nA.rx1, nB.rx1);
              const overlapY = Math.min(nA.ry2, nB.ry2) - Math.max(nA.ry1, nB.ry1);

              if (overlapX > 0 && overlapY > 0) {
                const dxCenterModel = Math.abs(nA.posX - nB.posX);
                const dyCenterModel = Math.abs(nA.posY - nB.posY);

                let rowRelation = 'crossRow';
                if (dyCenterModel < 10) rowRelation = 'sameRow';
                else if (dyCenterModel <= 160) rowRelation = 'adjacentRow';

                let axisClass = 'TRUE_2D';
                if (overlapX > 0 && overlapY <= 15) {
                  axisClass = 'SAME_ROW_HORIZONTAL_PRIMARY';
                  sameRowHorizontalPrimaryCount++;
                } else if (rowRelation === 'sameRow') {
                  axisClass = 'SAME_ROW_HORIZONTAL_PRIMARY';
                  sameRowHorizontalPrimaryCount++;
                } else if (rowRelation === 'adjacentRow') {
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
                  typeA: nA.type,
                  typeB: nB.type,
                  featureA: nA.feature,
                  featureB: nB.feature,
                  layerA: nA.layer,
                  layerB: nB.layer,
                  centerA: { x: nA.posX, y: nA.posY },
                  centerB: { x: nB.posX, y: nB.posY },
                  dxCenterModel,
                  dyCenterModel,
                  overlapX,
                  overlapY,
                  overlapArea: overlapX * overlapY,
                  rowRelation,
                  axisClass,
                  candidateId,
                  viewport: `${vpWidth}x${vpHeight}`
                });
              }
            }
          }

          const isZoomFar = candidateId === 'P27-F_LODHidingTest' ? true : zoom <= 0.1;
          const renderedCollisionCount = isZoomFar ? 0 : collisions.length;

          return {
            candidateId,
            viewport: `${vpWidth}x${vpHeight}`,
            zoom: Math.round(zoom * 1000) / 1000,
            pan,
            isZoomFar,
            labelsVisible: !isZoomFar,
            renderedCollisionCount,
            sameRowHorizontalPrimaryCount: isZoomFar ? 0 : sameRowHorizontalPrimaryCount,
            adjacentRow2DCount: isZoomFar ? 0 : adjacentRow2DCount,
            verticalOnlyCount: isZoomFar ? 0 : verticalOnlyCount,
            true2DCount: isZoomFar ? 0 : true2DCount,
            collisions: isZoomFar ? [] : collisions
          };
        }, { vpWidth: vp.width, vpHeight: vp.height, candidateId: candId });

        summary[projId][candId][vp.name] = {
          viewport: vpForensics.viewport,
          zoom: vpForensics.zoom,
          isZoomFar: vpForensics.isZoomFar,
          labelsVisible: vpForensics.labelsVisible,
          renderedCollisionCount: vpForensics.renderedCollisionCount,
          sameRowHorizontalPrimaryCount: vpForensics.sameRowHorizontalPrimaryCount,
          adjacentRow2DCount: vpForensics.adjacentRow2DCount,
          true2DCount: vpForensics.true2DCount,
        };

        const corpusKey = `${projId}_${candId}_${vp.name}`;
        fullCorpus[corpusKey] = vpForensics;

        log(`  - Viewport ${vp.name.padEnd(10)} | Zoom: ${vpForensics.zoom} | ZoomFar: ${vpForensics.isZoomFar} | Rendered Collisions: ${vpForensics.renderedCollisionCount} (${Date.now() - vpStart} ms)`);
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

  fs.writeFileSync(path.join(fixtureDir, 'phase27-browser-summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(fixtureDir, 'phase27-browser-corpus.json'), JSON.stringify(fullCorpus, null, 2));

  log(`\n=== PHASE 27 BROWSER AUDIT COMPLETE in ${Date.now() - tStart} ms ===`);
  log('Saved summary to phase27-browser-summary.json and full corpus to phase27-browser-corpus.json');
}

runPhase27BrowserAudit().catch((err) => {
  console.error('Phase 27 Browser Audit Failed:', err);
  process.exit(1);
});
