const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  page.on("pageerror", error => console.log("PAGE_ERROR:", error.message));

  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__CY__ && window.__CY__.nodes().length > 0);

  const result = await page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy.nodes().first();
    const container = cy.container();
    const p = node.renderedPosition();
    const hit = document.elementFromPoint(
      container.getBoundingClientRect().left + p.x,
      container.getBoundingClientRect().top + p.y
    );

    return {
      nodeId: node.id(),
      modelPosition: node.position(),
      renderedPosition: p,
      visible: node.visible(),
      locked: node.locked(),
      grabbable: node.grabbable(),
      grabbed: node.grabbed(),
      selected: node.selected(),
      zoom: cy.zoom(),
      pan: cy.pan(),
      containerRect: (() => {
        const r = container.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      })(),
      hitElement: hit ? {
        tag: hit.tagName,
        className: typeof hit.className === "string" ? hit.className : hit.className?.baseVal,
        pointerEvents: getComputedStyle(hit).pointerEvents
      } : null,
      panningEnabled: cy.panningEnabled(),
      userPanningEnabled: cy.userPanningEnabled(),
      boxSelectionEnabled: cy.boxSelectionEnabled()
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
