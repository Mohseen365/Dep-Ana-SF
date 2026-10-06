const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

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

function countLabelNodeCollisions(labelBoxes, nodeBoxes) {
  let collisions = 0;
  for (const lb of labelBoxes) {
    for (const nb of nodeBoxes) {
      if (lb.id !== nb.id) {
        if (lb.x1 < nb.x2 && lb.x2 > nb.x1 && lb.y1 < nb.y2 && lb.y2 > nb.y1) {
          collisions++;
        }
      }
    }
  }
  return collisions;
}

async function runContradictionsEFGAudit() {
  console.log('=== CONTRADICTIONS E, F, G — LABEL & ZOOM & VIEWPORT AUDIT ===\n');

  const zoomLevels = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0];
  const viewports = [
    { width: 1024, height: 768, name: '1024x768' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 2560, height: 1440, name: '2560x1440' },
  ];

  const scenarios = [
    { focalLwcId: 'LWC:asset-dashboard-container', name: 'asset-dashboard-container' },
    { focalLwcId: 'LWC:citizen-report-portal', name: 'citizen-report-portal' },
    { focalLwcId: 'LWC:vendor-workspace', name: 'vendor-workspace' },
    { focalLwcId: 'LWC:error-panel', name: 'error-panel' },
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000/?project=pbim');
    await page.waitForTimeout(3000);

    // ----------------------------------------------------
    // SECTION 10 & 11: PRODUCTION LABEL MATRIX FOR SCENARIO A
    // ----------------------------------------------------
    console.log('================================================================');
    console.log('SECTION 10 & 11: PRODUCTION VS FORCED-VISIBLE LABEL MATRIX (asset-dashboard-container)');
    console.log('================================================================');

    const labelMatrixResult = await page.evaluate(
      ({ focalId, zoomLevels, countCollisionsStr, countLabelNodeCollisionsStr }) => {
        const countCollisions = new Function('return ' + countCollisionsStr)();
        const countLabelNodeCollisions = new Function('return ' + countLabelNodeCollisionsStr)();

        const cy = window.__CY__;
        const layoutModule = window.__LAYOUT_MODULE__;
        if (!cy || !layoutModule) return null;

        const layoutRes = layoutModule.runLayoutWithMetadata(cy, {
          architectureMode: 'orbit',
          focalLwcId: focalId,
          fit: false,
        });

        const focusedIds = Object.keys(layoutRes.positions || {});
        const focusedNodes = focusedIds.map((id) => cy.getElementById(id)).filter((n) => n.length > 0);

        const containerEl = cy.container();
        const vpW = containerEl.clientWidth;
        const vpH = containerEl.clientHeight;

        const prodResults = [];
        const forcedResults = [];

        for (const z of zoomLevels) {
          cy.zoom(z);
          cy.center();

          // 1. PRODUCTION STATE
          const prodNodeBoxes = focusedNodes.map((n) => ({ id: n.id(), ...n.renderedBoundingBox({ includeLabels: false }) }));
          const prodLabelBoxes = [];
          let prodVisibleLabelCount = 0;
          let prodClippedLabelCount = 0;

          focusedNodes.forEach((n) => {
            const rbox = n.renderedBoundingBox({ includeLabels: false });
            const lbox = n.renderedBoundingBox({ includeLabels: true });
            // If label is actually rendered by Cytoscape, lbox dimensions exceed rbox
            const hasLabel = lbox.w > rbox.w + 2 || lbox.h > rbox.h + 2;
            if (hasLabel) {
              prodVisibleLabelCount++;
              prodLabelBoxes.push({ id: n.id(), ...lbox });
              if (lbox.x1 < 0 || lbox.x2 > vpW || lbox.y1 < 0 || lbox.y2 > vpH) {
                prodClippedLabelCount++;
              }
            }
          });

          const prodLabelLabelCol = countCollisions(prodLabelBoxes);
          const prodLabelNodeCol = countLabelNodeCollisions(prodLabelBoxes, prodNodeBoxes);

          prodResults.push({
            zoom: z,
            visibleLabels: prodVisibleLabelCount,
            labelLabelCollisions: prodLabelLabelCol,
            labelNodeCollisions: prodLabelNodeCol,
            clippedLabels: prodClippedLabelCount,
          });

          // 2. FORCED-VISIBLE DEBUG STATE
          const forcedNodeBoxes = prodNodeBoxes;
          const forcedLabelBoxes = focusedNodes.map((n) => ({ id: n.id(), ...n.renderedBoundingBox({ includeLabels: true }) }));
          const forcedLabelLabelCol = countCollisions(forcedLabelBoxes);
          const forcedLabelNodeCol = countLabelNodeCollisions(forcedLabelBoxes, forcedNodeBoxes);

          forcedResults.push({
            zoom: z,
            visibleLabels: focusedNodes.length,
            labelLabelCollisions: forcedLabelLabelCol,
            labelNodeCollisions: forcedLabelNodeCol,
          });
        }

        return { prodResults, forcedResults };
      },
      {
        focalId: 'LWC:asset-dashboard-container',
        zoomLevels,
        countCollisionsStr: countAabbCollisions.toString(),
        countLabelNodeCollisionsStr: countLabelNodeCollisions.toString(),
      }
    );

    console.log('\n--- PRODUCTION LABEL MATRIX ---');
    console.table(labelMatrixResult.prodResults);

    console.log('\n--- FORCED-VISIBLE DEBUG LABEL MATRIX ---');
    console.table(labelMatrixResult.forcedResults);

    // ----------------------------------------------------
    // SECTION 12: CONTRADICTION F — ZOOM COVERAGE FOR CITIZEN, VENDOR, ERROR
    // ----------------------------------------------------
    console.log('\n================================================================');
    console.log('SECTION 12: CONTRADICTION F — ZOOM COVERAGE FOR CITIZEN, VENDOR, ERROR');
    console.log('================================================================');

    const sampleZooms = [0.25, 1.0, 2.0];
    const zoomCoverageTable = [];

    for (const sc of scenarios.slice(1)) { // citizen, vendor, error
      for (const z of sampleZooms) {
        const res = await page.evaluate(
          ({ focalId, z, countCollisionsStr }) => {
            const countCollisions = new Function('return ' + countCollisionsStr)();
            const cy = window.__CY__;
            const layoutModule = window.__LAYOUT_MODULE__;

            const layoutRes = layoutModule.runLayoutWithMetadata(cy, {
              architectureMode: 'orbit',
              focalLwcId: focalId,
              fit: false,
            });

            const focusedIds = Object.keys(layoutRes.positions);
            const focusedNodes = focusedIds.map((id) => cy.getElementById(id));

            cy.zoom(z);
            cy.center();

            const sunNode = cy.getElementById(focalId);
            const sunPos = sunNode.position();

            const nodeBoxes = focusedNodes.map((n) => ({ id: n.id(), ...n.renderedBoundingBox({ includeLabels: false }) }));
            const nodeCol = countCollisions(nodeBoxes);

            let visibleLabels = 0;
            focusedNodes.forEach((n) => {
              const rbox = n.renderedBoundingBox({ includeLabels: false });
              const lbox = n.renderedBoundingBox({ includeLabels: true });
              if (lbox.w > rbox.w + 2) visibleLabels++;
            });

            return {
              scenario: focalId.replace('LWC:', ''),
              zoom: z,
              focusedNodesCount: focusedNodes.length,
              nodeCollisions: nodeCol,
              sunPos: `(${sunPos.x.toFixed(1)}, ${sunPos.y.toFixed(1)})`,
              visibleLabels,
            };
          },
          { focalId: sc.focalLwcId, z, countCollisionsStr: countAabbCollisions.toString() }
        );

        zoomCoverageTable.push(res);
      }
    }

    console.table(zoomCoverageTable);

    // ----------------------------------------------------
    // SECTION 13: CONTRADICTION G — VIEWPORT COVERAGE
    // ----------------------------------------------------
    console.log('\n================================================================');
    console.log('SECTION 13: CONTRADICTION G — VIEWPORT COVERAGE FOR CITIZEN, VENDOR, ERROR');
    console.log('================================================================');

    const vpCoverageTable = [];

    for (const sc of scenarios.slice(1)) {
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(500);

        const res = await page.evaluate(
          ({ focalId, vpWidth, vpHeight, countCollisionsStr }) => {
            const countCollisions = new Function('return ' + countCollisionsStr)();
            const cy = window.__CY__;
            const layoutModule = window.__LAYOUT_MODULE__;

            const layoutRes = layoutModule.runLayoutWithMetadata(cy, {
              architectureMode: 'orbit',
              focalLwcId: focalId,
              fit: true,
            });

            const focusedIds = Object.keys(layoutRes.positions);
            const focusedNodes = focusedIds.map((id) => cy.getElementById(id));

            const sunNode = cy.getElementById(focalId);
            const sunPos = sunNode.position();

            let clipped = 0;
            const nodeBoxes = focusedNodes.map((n) => {
              const r = n.renderedBoundingBox({ includeLabels: false });
              if (r.x2 < 0 || r.x1 > vpWidth || r.y2 < 0 || r.y1 > vpHeight) clipped++;
              return { id: n.id(), ...r };
            });

            return {
              scenario: focalId.replace('LWC:', ''),
              viewport: `${vpWidth}x${vpHeight}`,
              focusedNodesCount: focusedNodes.length,
              renderedNodeCollisions: countCollisions(nodeBoxes),
              clippedNodes: clipped,
              sunPos: `(${sunPos.x.toFixed(1)}, ${sunPos.y.toFixed(1)})`,
            };
          },
          { focalId: sc.focalLwcId, vpWidth: vp.width, vpHeight: vp.height, countCollisionsStr: countAabbCollisions.toString() }
        );

        vpCoverageTable.push(res);
      }
    }

    console.table(vpCoverageTable);

  } finally {
    await context.close();
    await browser.close();
  }
}

runContradictionsEFGAudit().catch((err) => {
  console.error('Fatal Contradictions E, F, G Audit Failure:', err);
  process.exit(1);
});
