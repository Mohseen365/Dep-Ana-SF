const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function log(msg) {
  process.stdout.write(`[PHASE-29R-E BROWSER] ${msg}\n`);
}

async function runPhase29reBrowserValidation() {
  log('Starting Optimized Phase 29R-E Real Browser Validation...');
  const tStart = Date.now();

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  const expPosFile = path.join(fixtureDir, 'phase29re-experimental-positions.json');

  if (!fs.existsSync(expPosFile)) {
    throw new Error('Missing phase29re-experimental-positions.json!');
  }

  const expData = JSON.parse(fs.readFileSync(expPosFile, 'utf-8'));

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

  const fullBrowserResults = {};

  for (const projId of ['cloud-spend-tracker', 'pbim']) {
    fullBrowserResults[projId] = {};
    log(`\n======================================================`);
    log(`RUNNING REAL BROWSER AUDIT FOR ${projId.toUpperCase()}`);
    log(`======================================================`);

    await page.goto(`http://localhost:3000/?project=${projId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 60000 });

    const candMap = expData[projId];

    for (const candId of ['Candidate_E_A', 'Candidate_E_B', 'Candidate_E_C']) {
      if (!candMap[candId]) continue;
      const tCandStart = Date.now();
      fullBrowserResults[projId][candId] = {
        naturalLod: { viewports: {}, zooms: {} },
        forcedVisible: { viewports: {}, zooms: {} },
      };

      const candData = candMap[candId];

      // Inject positions
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
      }, { positions: candData.positions, displayLabels: candData.displayLabels });

      // Fast Evaluation inside Browser Context (single pass over viewports and zooms)
      const auditRes = await page.evaluate(({ vps, zooms }) => {
        const cy = window.__CY__;
        const nodes = cy.nodes();
        const N = nodes.length;

        function getCollisionsForBoxes(boxes) {
          const sorted = [...boxes].sort((a, b) => a.rx1 - b.rx1);
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
        }

        function extractBoxes() {
          const boxes = [];
          for (let i = 0; i < N; i++) {
            const r = nodes[i].renderedBoundingBox();
            boxes.push({ rx1: r.x1, ry1: r.y1, rx2: r.x2, ry2: r.y2 });
          }
          return boxes;
        }

        const vRes = { natural: {}, forced: {} };
        // Evaluate Viewports
        vps.forEach(vp => {
          cy.fit();
          cy.elements().addClass('zoom-far'); // enforce natural zoom-far if needed
          const natBoxes = extractBoxes();
          cy.elements().removeClass('zoom-far');
          const forcedBoxes = extractBoxes();

          vRes.natural[vp.name] = getCollisionsForBoxes(natBoxes);
          vRes.forced[vp.name] = getCollisionsForBoxes(forcedBoxes);
        });

        const zRes = { natural: {}, forced: {} };
        // Evaluate Zooms
        zooms.forEach(z => {
          cy.zoom(z);
          cy.pan({ x: 0, y: 0 });

          // check natural LOD threshold
          const isFar = z <= 0.10;
          if (isFar) cy.elements().addClass('zoom-far');
          else cy.elements().removeClass('zoom-far');

          const natBoxes = extractBoxes();

          cy.elements().removeClass('zoom-far');
          const forcedBoxes = extractBoxes();

          zRes.natural[z.toString()] = getCollisionsForBoxes(natBoxes);
          zRes.forced[z.toString()] = getCollisionsForBoxes(forcedBoxes);
        });

        return { vRes, zRes };
      }, { vps: viewports, zooms: zoomLevelsToSweep });

      fullBrowserResults[projId][candId].naturalLod.viewports = auditRes.vRes.natural;
      fullBrowserResults[projId][candId].forcedVisible.viewports = auditRes.vRes.forced;
      fullBrowserResults[projId][candId].naturalLod.zooms = auditRes.zRes.natural;
      fullBrowserResults[projId][candId].forcedVisible.zooms = auditRes.zRes.forced;

      log(`[${projId.toUpperCase()}] ${candId} (${((Date.now() - tCandStart)/1000).toFixed(1)}s): ForcedVisible Viewports max=${Math.max(...Object.values(auditRes.vRes.forced))}, ForcedVisible Zooms max=${Math.max(...Object.values(auditRes.zRes.forced))}`);
    }
  }

  await browser.close();

  fs.writeFileSync(
    path.join(fixtureDir, 'phase29re-browser-audit-results.json'),
    JSON.stringify({ fullBrowserResults, runtimeMs: Date.now() - tStart }, null, 2)
  );

  log(`\nSaved Phase 29R-E browser audit results in ${((Date.now() - tStart)/1000).toFixed(1)}s to audit-fixtures/phase29re-browser-audit-results.json`);
}

runPhase29reBrowserValidation().catch(err => {
  console.error(err);
  process.exit(1);
});
