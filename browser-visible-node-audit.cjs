const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__CY__ && window.__CY__.nodes().length > 0);

  const result = await page.evaluate(() => {
    const cy = window.__CY__;
    const container = cy.container();
    const rect = container.getBoundingClientRect();

    return {
      zoom: cy.zoom(),
      pan: cy.pan(),
      container: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      },
      nodes: cy.nodes().map(node => {
        const p = node.renderedPosition();
        const sx = rect.left + p.x;
        const sy = rect.top + p.y;
        const visibleOnScreen =
          sx >= rect.left && sx <= rect.right &&
          sy >= rect.top && sy <= rect.bottom;

        return {
          id: node.id(),
          model: node.position(),
          rendered: p,
          screen: { x: sx, y: sy },
          visibleOnScreen,
          grabbable: node.grabbable(),
          locked: node.locked()
        };
      })
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
