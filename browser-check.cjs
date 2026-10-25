const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("http://127.0.0.1:3000/", {
    waitUntil: "networkidle"
  });

  console.log(
    "Architecture toggle:",
    await page.locator('[data-testid="architecture-mode-toggle"]').count()
  );

  console.log(
    "Layout toggle:",
    await page.locator('[data-testid="layout-mode-toggle"]').count()
  );

  console.log("Canvas:", await page.locator("canvas").count());
  console.log("SVG:", await page.locator("svg").count());

  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
