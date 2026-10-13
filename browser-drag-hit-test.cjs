const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });

  await page.goto("http://127.0.0.1:3000/", {
    waitUntil: "networkidle"
  });

  const info = await page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy?.getElementById("ApexClass:SampleHelper");
    if (!node || node.empty()) throw new Error("Target node not found");

    return {
      viewport: {
        width: innerWidth,
        height: innerHeight
      },
      canvas: [...document.querySelectorAll("canvas")].map(c => {
        const r = c.getBoundingClientRect();
        return {
          width: c.width,
          height: c.height,
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom
        };
      }),
      node: {
        id: node.id(),
        modelPosition: node.position(),
        renderedPosition: node.renderedPosition(),
        locked: node.locked()
      }
    };
  });

  const events = [];
  await page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy.getElementById("ApexClass:SampleHelper");
    window.__dragAuditEvents = [];
    for (const name of ["mousedown", "grab", "drag", "free", "dragfree", "tap"]) {
      node.on(name, () => window.__dragAuditEvents.push(name));
    }
  });

  console.log("GEOMETRY:", JSON.stringify(info, null, 2));
  console.log("EVENTS_BEFORE_INPUT:", JSON.stringify(
    await page.evaluate(() => window.__dragAuditEvents)
  ));

  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
