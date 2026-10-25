const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });

  await page.goto("http://127.0.0.1:3000/", {
    waitUntil: "networkidle"
  });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy?.getElementById("ApexClass:SampleHelper");
    const p = node?.renderedPosition();

    return {
      point: p ? { x: p.x, y: p.y } : null,
      hitTest: p ? (() => {
        const el = document.elementFromPoint(p.x, p.y);
        return el ? {
          tag: el.tagName,
          id: el.id,
          className: typeof el.className === "string" ? el.className : "",
          parentTag: el.parentElement?.tagName,
          parentClass: typeof el.parentElement?.className === "string"
            ? el.parentElement.className : ""
        } : null;
      })() : null,
      cyContainer: (() => {
        const el = cy?.container();
        return el ? {
          tag: el.tagName,
          id: el.id,
          className: typeof el.className === "string" ? el.className : "",
          pointerEvents: getComputedStyle(el).pointerEvents
        } : null;
      })(),
      canvases: [...document.querySelectorAll("canvas")].map((el, i) => {
        const r = el.getBoundingClientRect();
        return {
          index: i,
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          pointerEvents: getComputedStyle(el).pointerEvents,
          zIndex: getComputedStyle(el).zIndex
        };
      })
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
