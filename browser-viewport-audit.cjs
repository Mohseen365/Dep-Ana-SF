const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });

  await page.goto("http://127.0.0.1:3000/", {
    waitUntil: "networkidle"
  });
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy?.getElementById("ApexClass:SampleHelper");
    return {
      zoom: cy?.zoom(),
      pan: cy?.pan(),
      extent: cy?.extent(),
      container: (() => {
        const r = cy?.container()?.getBoundingClientRect();
        return r ? {
          left: r.left, top: r.top, right: r.right, bottom: r.bottom,
          width: r.width, height: r.height
        } : null;
      })(),
      node: node && !node.empty() ? {
        position: node.position(),
        renderedPosition: node.renderedPosition(),
        visible: node.visible()
      } : null,
      fitControls: [...document.querySelectorAll("button")].map(b => ({
        text: b.innerText.trim(),
        title: b.title,
        aria: b.getAttribute("aria-label")
      })).filter(b => /fit|zoom|reset|center/i.test(
        [b.text, b.title, b.aria].join(" ")
      ))
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
