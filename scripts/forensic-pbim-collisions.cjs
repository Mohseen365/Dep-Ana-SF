const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function log(msg) {
  process.stdout.write(`[FORENSICS] ${msg}\n`);
}

async function runPhase26Forensics() {
  log('Starting Phase 26 PBIM Forensic Collision Audit...');
  const tStart = Date.now();

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });

  const j4PositionsPath = path.join(fixtureDir, 'phase23-j4-positions.json');
  const candidatePositionsPath = path.join(fixtureDir, 'phase24-candidate-positions.json');

  const j4Data = JSON.parse(fs.readFileSync(j4PositionsPath, 'utf-8'));
  const candData = JSON.parse(fs.readFileSync(candidatePositionsPath, 'utf-8'));

  const pbimJ4Positions = j4Data.pbimPositions;
  const pbimP24BPositions = candData.pbim['P24-B_DOMAwareClearance'] || pbimJ4Positions;

  log('Launching headless Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();

  log('Navigating to http://localhost:3000/?project=pbim ...');
  await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2500);

  log('Activating Hybrid Mode...');
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
    if (btn && !btn.classList.contains('active')) btn.click();
  });
  await page.waitForTimeout(500);

  const viewports = [
    { name: '1024x768', width: 1024, height: 768 },
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '2560x1440', width: 2560, height: 1440 },
  ];

  const candidates = [
    { id: 'J4_Baseline', positions: pbimJ4Positions, truncateLabels: false },
    { id: 'P25-A', positions: pbimJ4Positions, truncateLabels: true },
    { id: 'P25-C', positions: pbimP24BPositions, truncateLabels: false }
  ];

  const forensicSummary = {};
  const fullCorpusMap = {};

  for (const cand of candidates) {
    log(`\nEvaluating Candidate: ${cand.id}`);
    forensicSummary[cand.id] = {};

    for (const vp of viewports) {
      const vpStart = Date.now();
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Apply positions & label mode
      await page.evaluate(({ positions, truncateLabels }) => {
        const cy = window.__CY__;
        cy.batch(() => {
          cy.nodes().forEach((node) => {
            const id = node.id();
            if (positions[id]) {
              node.position(positions[id]);
            }
            const rawLabel = node.data('displayName') || id;
            if (truncateLabels) {
              let displayLabel = rawLabel;
              if (rawLabel.includes('.')) {
                displayLabel = rawLabel.split('.').pop();
              } else if (rawLabel.length > 16) {
                displayLabel = rawLabel.substring(0, 16) + '…';
              }
              node.data('label', displayLabel);
              node.data('displayLabel', displayLabel);
            } else {
              node.data('label', rawLabel);
              node.data('displayLabel', rawLabel);
            }
          });
        });
        cy.fit(undefined, 50);
      }, { positions: cand.positions, truncateLabels: cand.truncateLabels });

      await page.waitForTimeout(50);

      const vpForensics = await page.evaluate(({ vpWidth, vpHeight }) => {
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
          const rawLabel = n.data('displayName') || id;
          const displayLabel = n.data('label') || rawLabel;

          nodesData.push({
            id,
            rawLabel,
            displayLabel,
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
              else if (dyCenterModel <= 150) rowRelation = 'adjacentRow';

              let axisClass = 'TWO_DIMENSIONAL';
              if (overlapX > 0 && overlapY <= 15) axisClass = 'HORIZONTAL_ONLY';
              else if (overlapX <= 15 && overlapY > 0) axisClass = 'VERTICAL_ONLY';

              const shapeAx1 = nA.posX - 60, shapeAx2 = nA.posX + 60, shapeAy1 = nA.posY - 30, shapeAy2 = nA.posY + 30;
              const shapeBx1 = nB.posX - 60, shapeBx2 = nB.posX + 60, shapeBy1 = nB.posY - 30, shapeBy2 = nB.posY + 30;
              const isShapeOverlap = (shapeAx1 < shapeBx2 && shapeAx2 > shapeBx1 && shapeAy1 < shapeBy2 && shapeAy2 > shapeBy1);

              collisions.push({
                nodeA: nA.id,
                nodeB: nB.id,
                rawLabelA: nA.rawLabel,
                rawLabelB: nB.rawLabel,
                displayLabelA: nA.displayLabel,
                displayLabelB: nB.displayLabel,
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
                nodeShapeA: { w: nA.width, h: nA.height },
                nodeShapeB: { w: nB.width, h: nB.height },
                modelBBA: { x1: nA.mx1, y1: nA.my1, x2: nA.mx2, y2: nA.my2, w: nA.mw, h: nA.mh },
                modelBBB: { x1: nB.mx1, y1: nB.my1, x2: nB.mx2, y2: nB.my2, w: nB.mw, h: nB.mh },
                renderedBBA: { x1: nA.rx1, y1: nA.ry1, x2: nA.rx2, y2: nA.ry2, w: nA.rw, h: nA.rh },
                renderedBBB: { x1: nB.rx1, y1: nB.ry1, x2: nB.rx2, y2: nB.ry2, w: nB.rw, h: nB.rh },
                domRectA: { left: nA.domLeft, top: nA.domTop, right: nA.domRight, bottom: nA.domBottom, width: nA.rw, height: nA.rh },
                domRectB: { left: nB.domLeft, top: nB.domTop, right: nB.domRight, bottom: nB.domBottom, width: nB.rw, height: nB.rh },
                overlapX,
                overlapY,
                overlapArea: overlapX * overlapY,
                rowRelation,
                axisClass,
                isShapeOverlap
              });
            }
          }
        }

        const isZoomFar = zoom <= 0.1;
        return {
          viewport: `${vpWidth}x${vpHeight}`,
          zoom: Math.round(zoom * 1000) / 1000,
          pan,
          isZoomFar,
          labelsVisible: !isZoomFar,
          collisionCount: collisions.length,
          collisions
        };
      }, { vpWidth: vp.width, vpHeight: vp.height });

      forensicSummary[cand.id][vp.name] = {
        viewport: vpForensics.viewport,
        zoom: vpForensics.zoom,
        isZoomFar: vpForensics.isZoomFar,
        labelsVisible: vpForensics.labelsVisible,
        collisionCount: vpForensics.collisionCount
      };

      const corpusKey = `${cand.id}_${vp.name}`;
      fullCorpusMap[corpusKey] = vpForensics;

      log(`  - Viewport ${vp.name.padEnd(10)} | Zoom: ${vpForensics.zoom} | ZoomFar: ${vpForensics.isZoomFar} | Collisions: ${vpForensics.collisionCount} (${Date.now() - vpStart} ms)`);
    }
  }

  await browser.close();

  fs.writeFileSync(path.join(fixtureDir, 'phase26-summary.json'), JSON.stringify(forensicSummary, null, 2));
  fs.writeFileSync(path.join(fixtureDir, 'phase26-full-corpus.json'), JSON.stringify(fullCorpusMap, null, 2));

  log(`\n=== PHASE 26 FORENSICS COMPLETE in ${Date.now() - tStart} ms ===`);
  log('Saved summary to phase26-summary.json and full corpus to phase26-full-corpus.json');
}

runPhase26Forensics().catch((err) => {
  console.error('Phase 26 Forensics Failed:', err);
  process.exit(1);
});
