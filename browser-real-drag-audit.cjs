const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];

  page.on("pageerror", e => errors.push(e.message));

  const readState = () => page.evaluate(() => {
    const cy = window.__CY__;
    const id = "ApexClass:SampleHelper";
    const node = cy?.getElementById(id);

    const states = Object.fromEntries(
      Object.keys(localStorage)
        .filter(k => k.startsWith("explorer.projectState."))
        .map(k => {
          const s = JSON.parse(localStorage.getItem(k));
          const g = s.graphLayout || {};
          return [k, {
            architectureMode: g.architectureMode,
            mode: g.mode,
            layoutProvenance: g.layoutProvenance,
            nodePositions: g.nodePositions,
            layoutPositions: g.layoutPositions,
            layoutProvenances: g.layoutProvenances
          }];
        })
    );

    return {
      node: node && !node.empty()
        ? { position: node.position(), renderedPosition: node.renderedPosition() }
        : null,
      states
    };
  });

  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const before = await readState();
  console.log("BEFORE:", JSON.stringify(before, null, 2));

  const rendered = await page.evaluate(() => {
    const node = window.__CY__?.getElementById("ApexClass:SampleHelper");
    if (!node || node.empty()) throw new Error("Target node not found");
    return node.renderedPosition();
  });

  const start = {
    x: Math.round(rendered.x),
    y: Math.round(rendered.y)
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 100, start.y + 80, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1000);

  const after = await readState();
  console.log("AFTER_REAL_MOUSE_DRAG:", JSON.stringify(after, null, 2));

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const afterReload = await readState();
  console.log("AFTER_RELOAD:", JSON.stringify(afterReload, null, 2));
  console.log("PAGE_ERRORS:", JSON.stringify(errors));

  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
