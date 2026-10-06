const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runContradictionDAudit() {
  console.log('=== CONTRADICTION D & FIT-TO-SCREEN INVESTIGATION — BROWSER AUDIT ===\n');

  const viewports = [
    { width: 1024, height: 768, name: '1024x768' },
    { width: 1280, height: 800, name: '1280x800' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 2560, height: 1440, name: '2560x1440' },
  ];

  const browser = await chromium.launch({ headless: true });

  try {
    for (const vp of viewports) {
      console.log(`\n================================================================`);
      console.log(`AUDITING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`================================================================`);

      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();

      await page.goto('http://localhost:3000/?project=pbim');
      await page.waitForTimeout(3000);

      const result = await page.evaluate(({ focalId, vpWidth, vpHeight }) => {
        const cy = window.__CY__;
        const layoutModule = window.__LAYOUT_MODULE__;
        if (!cy || !layoutModule) return null;

        // Execute real application layout activation with fit: true
        const layoutRes = layoutModule.runLayoutWithMetadata(cy, {
          architectureMode: 'orbit',
          focalLwcId: focalId,
          fit: true,
        });

        const positionedMap = layoutRes.positions || {};
        const positionedSet = new Set(Object.keys(positionedMap));

        // Get container DOM element dimensions
        const containerEl = cy.container();
        const containerRect = containerEl ? containerEl.getBoundingClientRect() : null;

        const zoom = cy.zoom();
        const pan = cy.pan();

        // Evaluate clipping for all focused nodes
        const focusedNodes = [];
        const clippedNodes = [];

        const allNodes = cy.nodes();
        for (let i = 0; i < allNodes.length; i++) {
          const n = allNodes[i];
          if (positionedSet.has(n.id())) {
            const mPos = n.position(); // Model coordinates
            const rbox = n.renderedBoundingBox({ includeLabels: false }); // Rendered bounding box in viewport pixels
            const lbox = n.renderedBoundingBox({ includeLabels: true }); // Rendered bounding box with labels

            // Center in viewport pixels: pan + model * zoom
            const renderedCenterX = pan.x + mPos.x * zoom;
            const renderedCenterY = pan.y + mPos.y * zoom;

            const isCenterOutside = renderedCenterX < 0 || renderedCenterX > vpWidth || renderedCenterY < 0 || renderedCenterY > vpHeight;
            const isBoxCrossing = rbox.x1 < 0 || rbox.x2 > vpWidth || rbox.y1 < 0 || rbox.y2 > vpHeight;
            const isFullyOutside = rbox.x2 < 0 || rbox.x1 > vpWidth || rbox.y2 < 0 || rbox.y1 > vpHeight;

            const nodeData = {
              id: n.id(),
              ring: n.data('ringIndex') ?? n.data('depth') ?? -1,
              modelCenter: mPos,
              renderedCenter: { x: renderedCenterX, y: renderedCenterY },
              renderedBox: rbox,
              labelBox: lbox,
              isCenterOutside,
              isBoxCrossing,
              isFullyOutside,
            };

            focusedNodes.push(nodeData);

            // Audit definition of clipping used in previous report:
            // Previous audit script used: `r.x2 < 0 || r.x1 > vp.width || r.y2 < 0 || r.y1 > vp.height` (fully outside!)
            if (isFullyOutside) {
              clippedNodes.push(nodeData);
            }
          }
        }

        return {
          containerRect,
          zoom,
          pan,
          totalFocused: focusedNodes.length,
          clippedCount: clippedNodes.length,
          clippedNodes,
          boxCrossingCount: focusedNodes.filter((f) => f.isBoxCrossing).length,
          centerOutsideCount: focusedNodes.filter((f) => f.isCenterOutside).length,
        };
      }, { focalId: 'LWC:asset-dashboard-container', vpWidth: vp.width, vpHeight: vp.height });

      console.log(`Viewport ${vp.name} Container Dimensions: ${result.containerRect.width}x${result.containerRect.height}`);
      console.log(`Camera Zoom after fit: ${result.zoom.toFixed(6)} | Pan: (${result.pan.x.toFixed(1)}, ${result.pan.y.toFixed(1)})`);
      console.log(`Focused Nodes: ${result.totalFocused}`);
      console.log(`Clipped Nodes (Fully Outside Viewport): ${result.clippedCount}`);
      console.log(`Box Crossing Boundary Count: ${result.boxCrossingCount}`);
      console.log(`Center Outside Viewport Count: ${result.centerOutsideCount}`);

      if (result.clippedNodes.length > 0) {
        console.log(`\nClipped Node IDs and Rings (first 10):`);
        result.clippedNodes.slice(0, 10).forEach((cn) => {
          console.log(`  [${cn.id}] Ring ${cn.ring}: model=(${cn.modelCenter.x.toFixed(1)}, ${cn.modelCenter.y.toFixed(1)}), renderedCenter=(${cn.renderedCenter.x.toFixed(1)}, ${cn.renderedCenter.y.toFixed(1)}), rbox=[x1:${cn.renderedBox.x1.toFixed(1)}, x2:${cn.renderedBox.x2.toFixed(1)}, y1:${cn.renderedBox.y1.toFixed(1)}, y2:${cn.renderedBox.y2.toFixed(1)}]`);
        });
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }
}

runContradictionDAudit().catch((err) => {
  console.error('Fatal Contradiction D Audit Failure:', err);
  process.exit(1);
});
