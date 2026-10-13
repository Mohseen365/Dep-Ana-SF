const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("pageerror", error =>
    console.log("PAGE_ERROR:", error.message)
  );

  await page.goto("http://127.0.0.1:3000/", {
    waitUntil: "networkidle"
  });

  for (const selector of [
    '[data-testid="architecture-mode-toggle"]',
    '[data-testid="layout-mode-toggle"]'
  ]) {
    const element = page.locator(selector).first();
    console.log("\nCONTROL:", selector);
    console.log("TEXT:", await element.innerText());
    console.log("TAG:", await element.evaluate(el => el.tagName));
    console.log("ARIA:", await element.getAttribute("aria-label"));
    console.log("TITLE:", await element.getAttribute("title"));
  }

  console.log("\nCANVAS DETAILS:");
  console.log(await page.locator("canvas").evaluateAll(elements =>
    elements.map((el, i) => ({
      index: i,
      width: el.width,
      height: el.height,
      className: el.className,
      parent: el.parentElement?.className
    }))
  ));

  console.log("\nGRAPH NODES:");
  for (const selector of [
    '[data-id]',
    '[data-node-id]',
    '.react-flow__node',
    '.cy',
    'canvas'
  ]) {
    console.log(selector, await page.locator(selector).count());
  }

  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
