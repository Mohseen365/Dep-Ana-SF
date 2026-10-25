const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("http://127.0.0.1:3000/", {
    waitUntil: "networkidle"
  });

  console.log("CANVASES:");
  console.log(JSON.stringify(await page.locator("canvas").evaluateAll(
    canvases => canvases.map((canvas, index) => {
      const rect = canvas.getBoundingClientRect();
      const style = getComputedStyle(canvas);
      return {
        index,
        width: canvas.width,
        height: canvas.height,
        visible: rect.width > 0 && rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        parentTag: canvas.parentElement?.tagName,
        parentClass: String(canvas.parentElement?.className ?? "")
      };
    })
  ), null, 2));

  console.log("\nGRAPH-RELATED SCRIPTS:");
  console.log(JSON.stringify(
    (await page.locator("script[src]").evaluateAll(
      scripts => scripts.map(script => script.getAttribute("src"))
    )).filter(src => /graph|cytoscape|sigma|canvas|layout/i.test(src || "")),
    null, 2
  ));

  console.log("\nGRAPH DOM MARKERS:");
  for (const selector of [
    "[data-id]",
    "[data-testid]",
    "[aria-label*='graph' i]",
    "[class*='cytoscape' i]",
    "[class*='graph' i]"
  ]) {
    console.log(selector, await page.locator(selector).count());
  }

  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
