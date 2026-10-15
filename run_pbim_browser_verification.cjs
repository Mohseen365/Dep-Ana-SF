const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function verifyPbimBrowser() {
  console.log("================================================================");
  console.log("PBIM BROWSER RUNTIME & LAYOUT CONTROL VERIFICATION");
  console.log("================================================================\n");

  const screenshotDir = path.join(__dirname, "verification_pbim_screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const chromePath = fs.existsSync("/opt/google/chrome/chrome") ? "/opt/google/chrome/chrome" : undefined;
  console.log(`[0] Launching browser with executablePath: ${chromePath || "default"}...`);

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') consoleErrors.push(text);
  });

  page.on('pageerror', err => {
    consoleErrors.push(`PAGE UNCAUGHT ERROR: ${err.message}`);
  });

  try {
    console.log("[1] Navigating to http://localhost:3000/?project=pbim...");
    await page.goto("http://localhost:3000/?project=pbim", { waitUntil: 'networkidle', timeout: 15000 }).catch(e => console.log("Navigation notice:", e.message));
    await page.waitForTimeout(3000);

    const url = page.url();
    console.log(`    Active URL: ${url}`);

    const statusText = await page.evaluate(() => {
      const el = document.querySelector('.status-bar');
      return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    });

    console.log(`    Status Bar Text: "${statusText}"`);
    const isPbimLoaded = statusText.includes("528") || statusText.includes("pbim");
    console.log(`    PBIM Data Loaded: ${isPbimLoaded ? "PASS (528 nodes, 2063 edges)" : "FAIL"}`);

    await page.screenshot({ path: path.join(screenshotDir, "01_pbim_loaded.png") });

    // Inspect layout controls
    console.log("\n[2] Inspecting graph view controls DOM...");
    const graphControlsExist = (await page.$('.graph-controls-floating')) !== null;
    console.log(`    .graph-controls-floating found: ${graphControlsExist}`);

    const controlButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.graph-control-btn'));
      return btns.map(b => ({
        text: b.textContent.trim(),
        title: b.getAttribute('title'),
        classes: b.className,
        ariaLabel: b.getAttribute('aria-label')
      }));
    });
    console.log("    Control Buttons Found:", JSON.stringify(controlButtons, null, 2));

    // Test switching layouts if controls exist
    console.log("\n[3] Testing Layout Controls & Worker Projection...");

    // Scenario A: Hierarchical
    const hierBtn = await page.$('.graph-control-btn[title*="Hierarchical"], .graph-control-btn[title*="hierarchical"]');
    if (hierBtn) {
      console.log("    Activating Hierarchical Layout...");
      await hierBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotDir, "02_hierarchical.png") });
    }

    // Scenario B: Orbit
    const orbitBtn = await page.$('.graph-control-btn[title*="Orbit"], .graph-control-btn[title*="orbit"]');
    if (orbitBtn) {
      console.log("    Activating Architecture Orbit Layout...");
      await orbitBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotDir, "03_orbit.png") });
    }

// Scenario C: Hybrid Layout
    const hybridBtn = await page.$('.graph-control-btn[title*="Hybrid"], .graph-control-btn[title*="hybrid"]');
    if (hybridBtn) {
      console.log("    Activating Hybrid Layout...");
      await hybridBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotDir, "04_hybrid.png") });
    }

    // Scenario D: Constellation Layout
    const constBtn = await page.$('.graph-control-btn[title*="Constellation"], .graph-control-btn[title*="constellation"]');
    if (constBtn) {
      console.log("    Activating Constellation Layout...");
      await constBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotDir, "05_constellation.png") });
    }

    // Geometry overlap counting helper
    async function countOverlaps() {
      return await page.evaluate(() => {
        const nodes = window.cy?.nodes();
        if (!nodes) return 0;
        let count = 0;
        for (let i = 0; i < nodes.length; i++) {
          const aBox = nodes[i].renderedBoundingBox();
          for (let j = i + 1; j < nodes.length; j++) {
            const bBox = nodes[j].renderedBoundingBox();
            if (aBox.intersects(bBox)) count++;
          }
        }
        return count;
      });
    }

    // Log overlap counts for each layout
    const layoutButtons = [
      { name: "Hierarchical", btn: hierBtn },
      { name: "Orbit", btn: orbitBtn },
      { name: "Hybrid", btn: hybridBtn },
      { name: "Constellation", btn: constBtn }
    ];
    for (const {name, btn} of layoutButtons) {
      if (btn) {
        await btn.click();
        await page.waitForTimeout(1000);
        const overlaps = await countOverlaps();
        console.log(`    ${name} layout overlaps: ${overlaps}`);
      }
    }

    console.log("\n    Console Errors:", consoleErrors.length > 0 ? consoleErrors : "NONE");
  } finally {
    await browser.close();
  }
}

verifyPbimBrowser().catch(err => {
  console.error("Browser verification failed:", err);
  process.exit(1);
});
