const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { evaluateOverlapValidation } = require('./overlap_checker_core.cjs');

(async () => {
  const screenshotsDir = path.resolve(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error('PLAYWRIGHT / BROWSER LAUNCH BLOCKER:', err.message);
    console.log('Result is INCONCLUSIVE due to unavailable browser environment.');
    process.exit(1);
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.app-layout', { timeout: 60000 });
    await page.waitForSelector('[data-testid="architecture-mode-toggle"]');
  } catch (err) {
    console.error('PAGE LOAD / VITE DEV SERVER BLOCKER:', err.message);
    console.log('Result is INCONCLUSIVE due to unreachable Vite dev server at http://localhost:3000.');
    await browser.close();
    process.exit(1);
  }

  const collectGraphData = async () => {
    return await page.evaluate(() => {
      const cy = window.__CY__;
      if (!cy) return null;
      const lastLayout = window.__LAST_LAYOUT_COMPLETED__ || null;
      const nodes = cy.nodes().map(n => ({
        id: n.id(),
        visible: n.visible(),
        renderedBoundingBox: n.renderedBoundingBox ? n.renderedBoundingBox() : null,
      }));
      return {
        nodes,
        lastLayout,
      };
    });
  };

  const modes = [
    { name: 'hierarchical', keyword: 'Hierarchical' },
    { name: 'hybrid', keyword: 'Hybrid' },
    { name: 'orbit', keyword: 'Orbit' },
    { name: 'constellation', keyword: 'Constellation' },
  ];

  const results = [];
  for (const mode of modes) {
    let attempts = 0;
    while (attempts < 10) {
      const indicator = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="graph-mode-indicator"]');
        return el ? el.textContent : '';
      });
      if (indicator.includes(mode.keyword)) break;
      await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
        if (btn) btn.click();
      });
      await page.waitForTimeout(500);
      attempts++;
    }

    // Wait for layout completion signal if possible
    await page.waitForTimeout(1000);

    const graphData = await collectGraphData();
    if (!graphData) {
      results.push({
        mode: mode.name,
        overlapCount: -1,
        expectedCandidateCount: 0,
        measuredCandidateCount: 0,
        invalidGeometryCount: 0,
        conclusive: false,
        status: 'INCONCLUSIVE',
        error: 'Cytoscape instance window.__CY__ unavailable',
      });
      continue;
    }

    let expectedNodeIds = null;
    if (graphData.lastLayout && graphData.lastLayout.projectedNodeIds) {
      expectedNodeIds = new Set(graphData.lastLayout.projectedNodeIds);
    } else if (mode.name === 'hierarchical' || mode.name === 'hybrid') {
      expectedNodeIds = new Set(graphData.nodes.map(n => n.id));
    }

    const evalResult = evaluateOverlapValidation(graphData.nodes, {
      mode: mode.name,
      expectedNodeIds,
    });

    results.push(evalResult);
    console.log(
      `Mode ${mode.name}: expected = ${evalResult.expectedCandidateCount}, measured = ${evalResult.measuredCandidateCount}, invalid = ${evalResult.invalidGeometryCount}, overlaps = ${evalResult.overlapCount}, conclusive = ${evalResult.conclusive}, status = ${evalResult.status}`
    );
  }

  await browser.close();
  console.log('=== OVERLAP VALIDATION RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
})();
