const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function generatePhase26Corpus() {
  console.log('=== GENERATING PHASE 26 FORENSIC CORPUS ===');
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

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log('[PLAYWRIGHT] Opening http://localhost:3000/?project=pbim ...');
  await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Activate Hybrid mode
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
    if (btn && !btn.classList.contains('active')) btn.click();
  });
  await page.waitForTimeout(500);

  const viewports = [
    { name: '1024x768', width: 1024, height: 768, zoom: 0.10 },
    { name: '1280x720', width: 1280, height: 720, zoom: 0.15 },
    { name: '1440x900', width: 1440, height: 900, zoom: 0.15 },
    { name: '1920x1080', width: 1920, height: 1080, zoom: 0.15 },
    { name: '2560x1440', width: 2560, height: 1440, zoom: 0.22 },
  ];

  const candidates = [
    { id: 'J4_Baseline', positions: pbimJ4Positions, truncateLabels: false },
    { id: 'P25-A', positions: pbimJ4Positions, truncateLabels: true },
    { id: 'P25-C', positions: pbimP24BPositions, truncateLabels: false }
  ];

  const summary = {};
  const fullCorpus = {};

  for (const cand of candidates) {
    console.log(`\nEvaluating Candidate: ${cand.id}...`);
    summary[cand.id] = {};

    // Apply positions & label mode once
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
    }, { positions: cand.positions, truncateLabels: cand.truncateLabels });

    for (const vp of viewports) {
      const res = await page.evaluate(({ vpWidth, vpHeight, zoomTarget }) => {
        const cy = window.__CY__;
        cy.zoom(zoomTarget);

        const isFar = zoomTarget <= 0.1;
        cy.batch(() => {
          cy.elements().removeClass('zoom-far zoom-mid zoom-near lod-0 lod-1 lod-2 lod-3 lod-4');
          if (isFar) {
            cy.elements().addClass('zoom-far lod-2');
          } else {
            cy.elements().addClass('zoom-mid lod-1');
          }
        });

        const container = cy.container();
        const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0, width: vpWidth, height: vpHeight };

        const nodesList = cy.nodes();
        const N = nodesList.length;

        const nodeData = new Array(N);
        for (let i = 0; i < N; i++) {
          const n = nodesList[i];
          const id = n.id();
          const pos = n.position();
          const r = n.renderedBoundingBox();
          const m = n.boundingBox();
          const rawLabel = n.data('displayName') || id;
          const displayLabel = n.data('label') || rawLabel;

          nodeData[i] = {
            id,
            rawLabel,
            displayLabel,
            type: n.data('type') || 'Unknown',
            feature: n.data('feature') || n.data('primaryFeatureId') || 'Unassigned',
            layer: n.data('layer') || n.data('processingLayer') || 'Unknown',
            posX: pos.x,
            posY: pos.y,
            w: n.width(),
            h: n.height(),
            rx1: r.x1, ry1: r.y1, rx2: r.x2, ry2: r.y2, rw: r.w, rh: r.h,
            mx1: m.x1, my1: m.y1, mx2: m.x2, my2: m.y2, mw: m.w, mh: m.h
          };
        }

        const indices = new Array(N);
        for (let i = 0; i < N; i++) indices[i] = i;
        indices.sort((a, b) => nodeData[a].rx1 - nodeData[b].rx1);

        const collisions = [];
        let sameRowCount = 0;
        let adjacentRowCount = 0;
        let crossRowCount = 0;
        let horizontalOnlyCount = 0;
        let verticalOnlyCount = 0;
        let twoDCount = 0;

        for (let i = 0; i < N; i++) {
          const idxA = indices[i];
          const nA = nodeData[idxA];

          for (let j = i + 1; j < N; j++) {
            const idxB = indices[j];
            const nB = nodeData[idxB];
            if (nB.rx1 >= nA.rx2) break; // Sweep pruning

            const overlapX = Math.min(nA.rx2, nB.rx2) - Math.max(nA.rx1, nB.rx1);
            const overlapY = Math.min(nA.ry2, nB.ry2) - Math.max(nA.ry1, nB.ry1);

            if (overlapX > 0 && overlapY > 0) {
              const dxCenterModel = Math.abs(nA.posX - nB.posX);
              const dyCenterModel = Math.abs(nA.posY - nB.posY);

              let rowRelation = 'crossRow';
              if (dyCenterModel < 10) { rowRelation = 'sameRow'; sameRowCount++; }
              else if (dyCenterModel <= 150) { rowRelation = 'adjacentRow'; adjacentRowCount++; }
              else { crossRowCount++; }

              let axisClass = 'TWO_DIMENSIONAL';
              if (overlapX > 0 && overlapY <= 15) { axisClass = 'HORIZONTAL_ONLY'; horizontalOnlyCount++; }
              else if (overlapX <= 15 && overlapY > 0) { axisClass = 'VERTICAL_ONLY'; verticalOnlyCount++; }
              else { twoDCount++; }

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
                overlapX,
                overlapY,
                overlapArea: overlapX * overlapY,
                rowRelation,
                axisClass
              });
            }
          }
        }

        return {
          viewport: `${vpWidth}x${vpHeight}`,
          zoom: Math.round(zoomTarget * 1000) / 1000,
          isZoomFar: isFar,
          labelsVisible: !isFar,
          collisionCount: collisions.length,
          sameRowCounts: sameRowCount,
          adjacentRowCounts: adjacentRowCount,
          crossRowCounts: crossRowCount,
          horizontalOnlyCounts: horizontalOnlyCount,
          verticalOnlyCounts: verticalOnlyCount,
          twoDCounts: twoDCount,
          collisions
        };
      }, { vpWidth: vp.width, vpHeight: vp.height, zoomTarget: vp.zoom });

      summary[cand.id][vp.name] = {
        viewport: res.viewport,
        zoom: res.zoom,
        isZoomFar: res.isZoomFar,
        labelsVisible: res.labelsVisible,
        collisionCount: res.collisionCount,
        sameRow: res.sameRowCounts,
        adjacentRow: res.adjacentRowCounts,
        crossRow: res.crossRowCounts,
        horizontalOnly: res.horizontalOnlyCounts,
        verticalOnly: res.verticalOnlyCounts,
        twoD: res.twoDCounts
      };

      fullCorpus[`${cand.id}_${vp.name}`] = res;
      console.log(`  - Viewport ${vp.name.padEnd(10)} | Zoom: ${res.zoom} | Collisions: ${res.collisionCount} (SameRow: ${res.sameRowCounts}, AdjRow: ${res.adjacentRowCounts}, CrossRow: ${res.crossRowCounts})`);
    }
  }

  await browser.close();

  fs.writeFileSync(path.join(fixtureDir, 'phase26-summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(fixtureDir, 'phase26-full-corpus.json'), JSON.stringify(fullCorpus, null, 2));

  console.log(`\n=== PHASE 26 FORENSIC CORPUS GENERATED in ${Date.now() - tStart} ms ===`);
}

generatePhase26Corpus().catch((err) => {
  console.error('Phase 26 Corpus Generation Failed:', err);
  process.exit(1);
});
