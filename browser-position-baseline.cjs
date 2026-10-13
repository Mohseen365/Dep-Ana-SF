const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("http://127.0.0.1:3000/", {
    waitUntil: "networkidle"
  });

  const baseline = await page.evaluate(() => {
    const cy = window.__CY__;
    if (!cy) throw new Error("window.__CY__ is unavailable");

    return {
      projectId: localStorage.getItem("explorer.activeProjectId"),
      architectureControl: {
        label: document.querySelector(
          '[data-testid="architecture-mode-toggle"]'
        )?.getAttribute("aria-label"),
        title: document.querySelector(
          '[data-testid="architecture-mode-toggle"]'
        )?.getAttribute("title")
      },
      layoutControl: {
        label: document.querySelector(
          '[data-testid="layout-mode-toggle"]'
        )?.getAttribute("aria-label"),
        title: document.querySelector(
          '[data-testid="layout-mode-toggle"]'
        )?.getAttribute("title")
      },
      nodes: cy.nodes().map(node => ({
        id: node.id(),
        position: node.position(),
        locked: node.locked(),
        selected: node.selected()
      }))
    };
  });

  console.log(JSON.stringify(baseline, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
