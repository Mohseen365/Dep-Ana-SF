// explorer/scripts/run-inspect-with-playwright.mjs
import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://localhost:3001");

  // Wait for the Cytoscape container to appear
  await page.waitForSelector("#cy, .cytoscape-container, .cytoscape-view", { timeout: 60000 });

  // Inject the diagnostic code (the same as in inspect‑final‑positions‑detail.mjs)
  const result = await page.evaluate(async () => {
    // ---- BEGIN DIAGNOSTIC CODE ----
    const tick = () => new Promise(r => setTimeout(r, 0));
    const container = document.querySelector('#cy, .cytoscape-container, .cytoscape-view');
    if (!container) throw new Error('Cytoscape container not found');
    const cy = container.__cy;
    if (!cy) throw new Error('Cytoscape instance not exposed as container.__cy');

    const capture = (phase) => ({
      phase,
      container: {
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight,
        rectWidth: container.getBoundingClientRect().width,
        rectHeight: container.getBoundingClientRect().height,
      },
      viewport: {
        zoom: cy.zoom(),
        pan: cy.pan(),
        extent: cy.extent(),
        minZoom: cy.minZoom ? cy.minZoom() : undefined,
        maxZoom: cy.maxZoom ? cy.maxZoom() : undefined,
      },
      nodes: cy.nodes().map(n => ({
        id: n.id(),
        x: n.position('x'),
        y: n.position('y')
      }))
    });

    const before = capture('beforeFit');
    await tick();
    const afterFit = capture('afterFit');
    await new Promise(r => setTimeout(r, 2000));
    const settled = capture('settled');

    const authority = {
      architectureMode: window.__APP?.architectureMode ?? null,
      layoutProvenance: window.__APP?.layoutProvenance ?? null,
      resolvePositionResult: window.__APP?.resolvePosition?.lastResult ?? null,
      deterministicNewNodeCalled: window.__APP?.calculateDeterministicNewNodePosition?.called ?? null
    };
    // ---- END DIAGNOSTIC CODE ----

    return { before, afterFit, settled, authority };
  });

  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();