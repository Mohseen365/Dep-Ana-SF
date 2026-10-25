const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));

  const inspect = () => page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy?.getElementById("ApexClass:SampleHelper");
    const states = Object.fromEntries(
      Object.keys(localStorage)
        .filter(k => k.startsWith("explorer.projectState."))
        .map(k => {
          const s = JSON.parse(localStorage.getItem(k));
          const g = s.graphLayout || {};
          return [k, {
            architectureMode: g.architectureMode,
            layoutProvenance: g.layoutProvenance,
            nodePositions: g.nodePositions,
            layoutPositions: g.layoutPositions,
            layoutProvenances: g.layoutProvenances
          }];
        })
    );
    return {
      node: node && !node.empty() ? {
        position: node.position(),
        renderedPosition: node.renderedPosition(),
        visible: node.visible(),
        locked: node.locked()
      } : null,
      events: window.__realDragEvents || [],
      states
    };
  });

  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy?.getElementById("ApexClass:SampleHelper");
    if (!node || node.empty()) throw new Error("Target node not found");
    window.__realDragEvents = [];
    for (const eventName of ["grab", "drag", "free", "dragfree"]) {
      node.on(eventName, () => window.__realDragEvents.push(eventName));
    }
  });

  console.log("BEFORE:", JSON.stringify(await inspect(), null, 2));

  const point = await page.evaluate(() => {
    const p = window.__CY__.getElementById("ApexClass:SampleHelper").renderedPosition();
    return { x: Math.round(p.x), y: Math.round(p.y) };
  });

  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.move(point.x + 80, point.y + 60, { steps: 16 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(1200);

  console.log("AFTER_DRAG:", JSON.stringify(await inspect(), null, 2));

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  console.log("AFTER_RELOAD:", JSON.stringify(await inspect(), null, 2));
  console.log("PAGE_ERRORS:", JSON.stringify(errors));

  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
