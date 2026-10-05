const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function extractBrowserDimensionsAtFit() {
  console.log('Extracting live browser Cytoscape rendered node bounding boxes at exact fit zoom...');

  const fixtureDir = path.resolve(__dirname, '../audit-fixtures');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });

  const posFile = path.join(fixtureDir, 'phase28r-positions-and-labels.json');
  if (!fs.existsSync(posFile)) {
    throw new Error('phase28r-positions-and-labels.json not found! Run Vitest first.');
  }
  const posData = JSON.parse(fs.readFileSync(posFile, 'utf-8'));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  const results = {};

  for (const projId of ['pbim', 'cloud-spend-tracker']) {
    console.log(`\n--- Loading ${projId} ---`);
    await page.goto(`http://localhost:3000/?project=${projId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 60000 });

    const r4Data = posData[projId]['R4_AdaptiveCapacity'];
    if (!r4Data) throw new Error(`R4 data missing for ${projId}`);

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
      cy.fit();
      cy.elements().removeClass('zoom-far');
    }, { positions: r4Data.positions, displayLabels: r4Data.displayLabels });

    await page.waitForTimeout(500);

    const nodeDetails = await page.evaluate(() => {
      const cy = window.__CY__;
      cy.elements().removeClass('zoom-far');
      const zoom = cy.zoom();

      return cy.nodes().map((n) => {
        const id = n.id();
        const label = n.data('label') || n.id();
        const pos = n.position();
        const r = n.renderedBoundingBox();
        const renderedWidth = r.x2 - r.x1;
        const renderedHeight = r.y2 - r.y1;
        const modelWidth = renderedWidth / zoom;
        const modelHeight = renderedHeight / zoom;

        return {
          id,
          label,
          posX: pos.x,
          posY: pos.y,
          rx1: r.x1,
          ry1: r.y1,
          rx2: r.x2,
          ry2: r.y2,
          renderedWidth,
          renderedHeight,
          modelWidth,
          modelHeight,
          zoom
        };
      });
    });

    // Compute browser collisions
    const collisions = [];
    const sorted = [...nodeDetails].sort((a, b) => a.rx1 - b.rx1);
    const N = sorted.length;
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
            centerA: { x: nA.posX, y: nA.posY },
            centerB: { x: nB.posX, y: nB.posY },
            modelWidthA: nA.modelWidth,
            modelHeightA: nA.modelHeight,
            modelWidthB: nB.modelWidth,
            modelHeightB: nB.modelHeight,
            overlapXRendered: overlapX,
            overlapYRendered: overlapY,
            overlapXModel: overlapX / nA.zoom,
            overlapYModel: overlapY / nA.zoom,
            axisClass
          });
        }
      }
    }

    console.log(`Zoom at fit: ${nodeDetails[0]?.zoom.toFixed(4)}`);
    console.log(`Total visible browser collisions for ${projId}: ${collisions.length} (SameRow=${sameRow}, AdjacentRow=${adjacentRow}, True2D=${true2D})`);

    results[projId] = {
      nodes: nodeDetails,
      collisions,
      counts: { total: collisions.length, sameRow, adjacentRow, true2D }
    };
  }

  await browser.close();

  fs.writeFileSync(path.join(fixtureDir, 'phase29rd-rendered-dimensions.json'), JSON.stringify(results, null, 2));
  console.log('\nSaved rendered dimensions and collision corpus to audit-fixtures/phase29rd-rendered-dimensions.json');
}

extractBrowserDimensionsAtFit().catch((err) => {
  console.error(err);
  process.exit(1);
});
