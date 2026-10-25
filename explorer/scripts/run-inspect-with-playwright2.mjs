// explorer/scripts/run-inspect-with-playwright2.mjs
import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://localhost:3001");

  // Wait for Cytoscape container to appear
  await page.waitForSelector("#cy, .cytoscape-container, .cytoscape-view", { timeout: 60000 });

  const result = await page.evaluate(() => {
    const container = document.querySelector('#cy, .cytoscape-container, .cytoscape-view');
    if (!container) return { error: 'no container' };
    const candidates = [];
    if (container.__cy) candidates.push('__cy');
    if (container._cy) candidates.push('_cy');
    if (window.cy) candidates.push('window.cy');
    if (window.__APP && window.__APP.cy) candidates.push('__APP.cy');
    const found = candidates.filter(name => {
      try {
        // Access the variable via eval on the page context
        // eslint-disable-next-line no-eval
        return eval(name) !== undefined;
      } catch { return false; }
    });
    // If a cy instance is found, capture minimal snapshot
    let snapshot = null;
    if (found.length > 0) {
      const cy = eval(found[0]);
      snapshot = {
        zoom: cy.zoom(),
        pan: cy.pan(),
        nodeCount: cy.nodes().length,
      };
    }
    return { found, snapshot };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
