const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function log(msg) {
  process.stdout.write(`[PHASE-29R-D BROWSER] ${msg}\n`);
}

async function runPhase29rdFastAudit() {
  log('Starting Fast Phase 29R-D Audit...');
  const tStart = Date.now();

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');

  const dimFile = path.join(fixtureDir, 'phase29rd-rendered-dimensions.json');
  const expPosFile = path.join(fixtureDir, 'phase29rd-experimental-positions.json');

  if (!fs.existsSync(dimFile) || !fs.existsSync(expPosFile)) {
    throw new Error('Missing input fixture files!');
  }

  const dimData = JSON.parse(fs.readFileSync(dimFile, 'utf-8'));
  const expData = JSON.parse(fs.readFileSync(expPosFile, 'utf-8'));

  const candidateSummary = {};

  for (const projId of ['pbim', 'cloud-spend-tracker']) {
    log(`\n======================================================`);
    log(`EVALUATING EXPERIMENTAL CANDIDATE MATRIX FOR ${projId.toUpperCase()}`);
    log(`======================================================`);

    candidateSummary[projId] = {};
    const nodeDimsMap = new Map();
    dimData[projId].nodes.forEach(n => {
      nodeDimsMap.set(n.id, { w: n.modelWidth, h: n.modelHeight });
    });

    const candMap = expData[projId];

    Object.keys(candMap).forEach(candId => {
      const { positions } = candMap[candId];
      const nodeIds = Object.keys(positions);
      const N = nodeIds.length;

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const nodesData = [];

      for (let i = 0; i < N; i++) {
        const id = nodeIds[i];
        const pos = positions[id];
        const dim = nodeDimsMap.get(id) || { w: 120, h: 60 };

        if (pos.x - 60 < minX) minX = pos.x - 60;
        if (pos.x + 60 > maxX) maxX = pos.x + 60;
        if (pos.y - 30 < minY) minY = pos.y - 30;
        if (pos.y + 30 > maxY) maxY = pos.y + 30;

        nodesData.push({
          id,
          posX: pos.x, posY: pos.y,
          x1: pos.x - dim.w / 2,
          x2: pos.x + dim.w / 2,
          y1: pos.y - dim.h / 2,
          y2: pos.y + dim.h / 2,
        });
      }

      const width = Math.round(maxX - minX);
      const height = Math.round(maxY - minY);
      const area = width * height;

      // Model shape collisions
      let shapeCollisions = 0;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = Math.abs(nodesData[i].posX - nodesData[j].posX);
          const dy = Math.abs(nodesData[i].posY - nodesData[j].posY);
          if (dx < 120 - 1e-3 && dy < 60 - 1e-3) shapeCollisions++;
        }
      }

      // Rendered model label collisions
      const sorted = [...nodesData].sort((a, b) => a.x1 - b.x1);
      let browserCollisions = 0, sameRow = 0, adjacentRow = 0, true2D = 0;

      for (let i = 0; i < N; i++) {
        const nA = sorted[i];
        for (let j = i + 1; j < N; j++) {
          const nB = sorted[j];
          if (nB.x1 >= nA.x2) break;

          const overlapX = Math.min(nA.x2, nB.x2) - Math.max(nA.x1, nB.x1);
          const overlapY = Math.min(nA.y2, nB.y2) - Math.max(nA.y1, nB.y1);

          if (overlapX > 1e-3 && overlapY > 1e-3) {
            browserCollisions++;
            const dy = Math.abs(nA.posY - nB.posY);
            if (dy < 10) sameRow++;
            else if (dy <= 160) adjacentRow++;
            else true2D++;
          }
        }
      }

      candidateSummary[projId][candId] = {
        width, height, area,
        shapeCollisions,
        browserCollisions,
        sameRow, adjacentRow, true2D
      };

      log(`[${projId.toUpperCase()}] ${candId.padEnd(26)} | Collisions=${browserCollisions} (SameRow=${sameRow}, AdjRow=${adjacentRow}) | ShapeAABB=${shapeCollisions} | W=${width} H=${height} Area=${(area/1e6).toFixed(1)}M`);
    });
  }

  // Real browser validation for winning candidate D_D_comb_gapX20_gapY20
  log('\n======================================================');
  log('REAL CHROMIUM PLAYWRIGHT VALIDATION FOR WINNING CANDIDATE D_D_comb_gapX20_gapY20');
  log('======================================================');

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

  const fullValidationResults = {};

  for (const projId of ['pbim', 'cloud-spend-tracker']) {
    fullValidationResults[projId] = {};
    await page.goto(`http://localhost:3000/?project=${projId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 60000 });

    const candId = 'D_D_comb_gapX20_gapY20';
    if (!expData[projId][candId]) continue;
    fullValidationResults[projId][candId] = { viewports: {}, zooms: {} };
    const candData = expData[projId][candId];

    await page.evaluate(({ positions, displayLabels }) => {
      const cy = window.__CY__;
      cy.batch(() => {
        cy.nodes().forEach((node) => {
          const id = node.id();
          if (positions[id]) node.position(positions[id]);
          const label = displayLabels[id] || node.data('displayName') || id;
          node.data('label', label);
          node.data('displayLabel', label);
        });
      });
      cy.elements().removeClass('zoom-far');
    }, { positions: candData.positions, displayLabels: candData.displayLabels });

    // Viewports
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const vColl = await page.evaluate(() => {
        const cy = window.__CY__;
        cy.fit();
        cy.elements().removeClass('zoom-far');
        const nodes = cy.nodes();
        const N = nodes.length;
        const nodesData = [];
        for (let i = 0; i < N; i++) {
          const r = nodes[i].renderedBoundingBox();
          nodesData.push({ rx1: r.x1, ry1: r.y1, rx2: r.x2, ry2: r.y2 });
        }
        const sorted = [...nodesData].sort((a, b) => a.rx1 - b.rx1);
        let count = 0;
        for (let i = 0; i < N; i++) {
          const nA = sorted[i];
          for (let j = i + 1; j < N; j++) {
            const nB = sorted[j];
            if (nB.rx1 >= nA.rx2) break;
            if (Math.min(nA.rx2, nB.rx2) > Math.max(nA.rx1, nB.rx1) && Math.min(nA.ry2, nB.ry2) > Math.max(nA.ry1, nB.ry1)) count++;
          }
        }
        return count;
      });
      fullValidationResults[projId][candId].viewports[vp.name] = vColl;
    }

    // Zooms
    await page.setViewportSize({ width: 1920, height: 1080 });
    for (const z of zoomLevelsToSweep) {
      const zColl = await page.evaluate((targetZoom) => {
        const cy = window.__CY__;
        cy.zoom(targetZoom);
        cy.pan({ x: 0, y: 0 });
        cy.elements().removeClass('zoom-far');
        const nodes = cy.nodes();
        const N = nodes.length;
        const nodesData = [];
        for (let i = 0; i < N; i++) {
          const r = nodes[i].renderedBoundingBox();
          nodesData.push({ rx1: r.x1, ry1: r.y1, rx2: r.x2, ry2: r.y2 });
        }
        const sorted = [...nodesData].sort((a, b) => a.rx1 - b.rx1);
        let count = 0;
        for (let i = 0; i < N; i++) {
          const nA = sorted[i];
          for (let j = i + 1; j < N; j++) {
            const nB = sorted[j];
            if (nB.rx1 >= nA.rx2) break;
            if (Math.min(nA.rx2, nB.rx2) > Math.max(nA.rx1, nB.rx1) && Math.min(nA.ry2, nB.ry2) > Math.max(nA.ry1, nB.ry1)) count++;
          }
        }
        return count;
      }, z);
      fullValidationResults[projId][candId].zooms[z.toString()] = zColl;
    }

    log(`[${projId.toUpperCase()}] ${candId}: Viewports clean=${Object.values(fullValidationResults[projId][candId].viewports).every(v => v === 0)}, Zooms clean=${Object.values(fullValidationResults[projId][candId].zooms).every(v => v === 0)}`);
  }

  await browser.close();

  fs.writeFileSync(
    path.join(fixtureDir, 'phase29rd-browser-audit-results.json'),
    JSON.stringify({ candidateSummary, fullValidationResults, runtimeMs: Date.now() - tStart }, null, 2)
  );

  log(`\nSaved browser audit results in ${((Date.now() - tStart)/1000).toFixed(1)}s to audit-fixtures/phase29rd-browser-audit-results.json`);
}

runPhase29rdFastAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
