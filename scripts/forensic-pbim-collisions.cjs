const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runForensicPBIMCollisions() {
  console.log('=== PHASE 24 FORENSIC DOM COLLISION ANALYSIS ===');

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  const j4PositionsPath = path.join(fixtureDir, 'phase23-j4-positions.json');
  
  if (!fs.existsSync(j4PositionsPath)) {
    console.error('FATAL: J4 positions fixture missing');
    process.exit(1);
  }

  const j4PositionsData = JSON.parse(fs.readFileSync(j4PositionsPath, 'utf-8'));
  const pbimJ4Positions = j4PositionsData.pbimPositions;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 2560, height: 1440 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/?project=pbim&view=graph ...');
  await page.goto('http://localhost:3000/?project=pbim&view=graph', { waitUntil: 'domcontentloaded', timeout: 180000 });

  console.log('Waiting for window.__CY__...');
  await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 180000 });

  console.log('window.__CY__ ready!');

  // Activate Hybrid mode if not active
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
    if (btn && !btn.classList.contains('active')) btn.click();
  });
  await page.waitForTimeout(2000);

  // Apply Candidate J4 positions
  console.log('Applying Candidate J4 positions to window.__CY__...');
  await page.evaluate((positions) => {
    const cy = window.__CY__;
    cy.batch(() => {
      Object.keys(positions).forEach((id) => {
        const node = cy.getElementById(id);
        if (node.length > 0) {
          node.position(positions[id]);
        }
      });
    });
    cy.fit(undefined, 50);
  }, pbimJ4Positions);

  await page.waitForTimeout(1000);

  // Resize viewport to 1024x768 as Phase 23 script did
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(500);

  // Measure all node rendered bounding boxes and extract collisions
  const forensicData = await page.evaluate(() => {
    const cy = window.__CY__;
    const zoom = cy.zoom();
    const pan = cy.pan();

    const nodes = cy.nodes().map((n) => {
      const data = n.data();
      const pos = n.position();
      const rbb = n.renderedBoundingBox(); // { x1, y1, x2, y2, w, h }
      const bb = n.boundingBox(); // model space bounding box
      return {
        id: n.id(),
        label: data.label || n.id(),
        type: data.type || 'Unknown',
        feature: data.primaryFeatureId || data.featureId || 'Unassigned',
        layer: data.layer || 'application',
        modelPos: { x: pos.x, y: pos.y },
        modelBB: { x1: bb.x1, y1: bb.y1, x2: bb.x2, y2: bb.y2, w: bb.w, h: bb.h },
        renderedBB: { x1: rbb.x1, y1: rbb.y1, x2: rbb.x2, y2: rbb.y2, w: rbb.w, h: rbb.h },
      };
    });

    // Detect all DOM overlaps
    const collisions = [];
    const sorted = [...nodes].sort((a, b) => a.renderedBB.x1 - b.renderedBB.x1);
    for (let i = 0; i < sorted.length; i++) {
      const n1 = sorted[i];
      for (let j = i + 1; j < sorted.length; j++) {
        const n2 = sorted[j];
        if (n2.renderedBB.x1 >= n1.renderedBB.x2) break;
        if (n1.renderedBB.y1 < n2.renderedBB.y2 && n1.renderedBB.y2 > n2.renderedBB.y1) {
          // Calculate overlap rectangle
          const ox = Math.min(n1.renderedBB.x2, n2.renderedBB.x2) - Math.max(n1.renderedBB.x1, n2.renderedBB.x1);
          const oy = Math.min(n1.renderedBB.y2, n2.renderedBB.y2) - Math.max(n1.renderedBB.y1, n2.renderedBB.y1);
          
          // Model space distance
          const dxModel = Math.abs(n1.modelPos.x - n2.modelPos.x);
          const dyModel = Math.abs(n1.modelPos.y - n2.modelPos.y);

          // Classification logic
          let classification = 'HORIZONTAL_ROW_OVERDENSITY';
          if (dxModel === 0 && dyModel < 60) {
            classification = 'MODEL_NODE_OVERLAP';
          } else if (dyModel < 60 && dxModel < 160) {
            classification = 'HORIZONTAL_ROW_OVERDENSITY';
          } else if (dxModel < 60 && dyModel >= 60) {
            classification = 'VERTICAL_ROW_OVERDENSITY';
          } else if (n1.feature !== n2.feature) {
            classification = 'CROSS_FEATURE_RENDER_OVERLAP';
          } else if (ox > 0 && oy > 0) {
            classification = 'LABEL_OVERLAP';
          }

          collisions.push({
            nodeA: n1.id,
            nodeB: n2.id,
            labelA: n1.label,
            labelB: n2.label,
            featureA: n1.feature,
            featureB: n2.feature,
            layerA: n1.layer,
            layerB: n2.layer,
            typeA: n1.type,
            typeB: n2.type,
            modelPosA: n1.modelPos,
            modelPosB: n2.modelPos,
            modelBBA: n1.modelBB,
            modelBBB: n2.modelBB,
            renderedBBA: n1.renderedBB,
            renderedBBB: n2.renderedBB,
            dxModel,
            dyModel,
            overlapWidthPx: Math.round(ox * 100) / 100,
            overlapHeightPx: Math.round(oy * 100) / 100,
            classification,
          });
        }
      }
    }

    return {
      zoom,
      pan,
      totalNodes: nodes.length,
      collisionCount: collisions.length,
      collisions,
    };
  });

  await browser.close();

  console.log(`Zoom: ${forensicData.zoom.toFixed(4)} | Total Collisions: ${forensicData.collisionCount}`);

  // Compute distribution breakdowns
  const byFeature = {};
  const byLayer = {};
  const byClassification = {};
  const byNodeType = {};

  forensicData.collisions.forEach((c) => {
    const featKey = c.featureA === c.featureB ? c.featureA : `${c.featureA} ↔ ${c.featureB}`;
    byFeature[featKey] = (byFeature[featKey] || 0) + 1;

    const layerKey = c.layerA === c.layerB ? c.layerA : `${c.layerA} ↔ ${c.layerB}`;
    byLayer[layerKey] = (byLayer[layerKey] || 0) + 1;

    byClassification[c.classification] = (byClassification[c.classification] || 0) + 1;

    const typeKey = `${c.typeA} - ${c.typeB}`;
    byNodeType[typeKey] = (byNodeType[typeKey] || 0) + 1;
  });

  console.log('\n--- COLLISION DISTRIBUTION BY CLASSIFICATION ---');
  console.log(JSON.stringify(byClassification, null, 2));

  console.log('\n--- TOP COLLIDING FEATURES ---');
  const sortedFeats = Object.entries(byFeature).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(JSON.stringify(sortedFeats, null, 2));

  console.log('\n--- COLLISION DISTRIBUTION BY LAYER ---');
  console.log(JSON.stringify(byLayer, null, 2));

  console.log('\n--- SAMPLE REPRESENTATIVE COLLISION RECORD ---');
  console.log(JSON.stringify(forensicData.collisions.slice(0, 3), null, 2));

  fs.writeFileSync(
    path.join(fixtureDir, 'phase24-pbim-forensic-collisions.json'),
    JSON.stringify({ ...forensicData, byFeature, byLayer, byClassification, byNodeType }, null, 2)
  );

  console.log(`Saved forensic collisions to ${path.join(fixtureDir, 'phase24-pbim-forensic-collisions.json')}`);
}

runForensicPBIMCollisions().catch((err) => {
  console.error('Forensic execution failed:', err);
  process.exit(1);
});
