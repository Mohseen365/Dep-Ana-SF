const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("pageerror", e => console.log("PAGE_ERROR:", e.message));

  await page.goto("http://127.0.0.1:3000/", {
    waitUntil: "networkidle"
  });

  const before = await page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy?.getElementById("ApexClass:SampleHelper");
    if (!node || node.empty()) throw new Error("Target node not found");

    return {
      position: node.position(),
      storage: Object.fromEntries(
        Object.keys(localStorage)
          .filter(k => k.startsWith("explorer.projectState."))
          .map(k => [k, localStorage.getItem(k)])
      )
    };
  });

  console.log("BEFORE:", JSON.stringify(before, null, 2));

  await page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy.getElementById("ApexClass:SampleHelper");
    const pos = node.position();

    node.emit("grab");
    node.position({ x: pos.x + 80, y: pos.y + 60 });
    node.emit("free");
  });

  await page.waitForTimeout(500);

  const after = await page.evaluate(() => {
    const node = window.__CY__.getElementById("ApexClass:SampleHelper");

    return {
      position: node.position(),
      storage: Object.fromEntries(
        Object.keys(localStorage)
          .filter(k => k.startsWith("explorer.projectState."))
          .map(k => [k, localStorage.getItem(k)])
      )
    };
  });

  console.log("AFTER:", JSON.stringify(after, null, 2));
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
