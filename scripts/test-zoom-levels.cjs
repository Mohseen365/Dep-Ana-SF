const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testZoomLevels() {
  const fixtureDir = path.resolve(__dirname, '../audit-fixtures');
  const posFile = path.join(fixtureDir, 'phase28r-positions-and-labels.json');
  const posData = JSON.parse(fs.readFileSync(posFile, 'utf-8'));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  for (const projId of ['pbim', 'cloud-spend-tracker']) {
    console.log(`\n================ ${projId} ================`);
    await page.goto(`http://localhost:3000/?project=${projId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 60000 });

    const r4Data = posData[projId]['R4_AdaptiveCapacity'];

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
    }, { positions: r4Data.positions, displayLabels: r4Data.displayLabels });

    for (const z of [0.05, 0.08, 0.10, 0.11, 0.12, 0.15, 0.20, 0.30, 0.40, 0.50, 1.0]) {
      const count = await page.evaluate((zoomVal) => {
        const cy = window.__CY__;
        cy.zoom(zoomVal);
        cy.pan({ x: 0, y: 0 });
        cy.elements().removeClass('zoom-far');

        const nodes = cy.nodes();
        const N = nodes.length;
        const nodesData = [];
        for (let i = 0; i < N; i++) {
          const n = nodes[i];
          const pos = n.position();
          const r = n.renderedBoundingBox();
          nodesData.push({
            id: n.id(),
            posX: pos.x, posY: pos.y,
            rx1: r.x1, ry1: r.y1, rx2: r.x2, ry2: r.y2
          });
        }

        const sorted = [...nodesData].sort((a, b) => a.rx1 - b.rx1);
        let total = 0, sameRow = 0, adjRow = 0;
        for (let i = 0; i < N; i++) {
          const nA = sorted[i];
          for (let j = i + 1; j < N; j++) {
            const nB = sorted[j];
            if (nB.rx1 >= nA.rx2) break;
            const overlapX = Math.min(nA.rx2, nB.rx2) - Math.max(nA.rx1, nB.rx1);
            const overlapY = Math.min(nA.ry2, nB.ry2) - Math.max(nA.ry1, nB.ry1);
            if (overlapX > 0 && overlapY > 0) {
              total++;
              const dy = Math.abs(nA.posY - nB.posY);
              if (dy < 10) sameRow++;
              else if (dy <= 160) adjRow++;
            }
          }
        }
        return { total, sameRow, adjRow };
      }, z);

      console.log(`Zoom ${z.toFixed(2)} | Total=${count.total} | SameRow=${count.sameRow} | AdjRow=${count.adjRow}`);
    }
  }

  await browser.close();
}

testZoomLevels().catch(console.error);
