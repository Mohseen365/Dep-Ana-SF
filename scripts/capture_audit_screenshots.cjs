const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const evidenceDir = path.join(__dirname, '../audit-evidence');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const projects = ['bqc', 'cst', 'pub-infra-mang'];

  for (const project of projects) {
    console.log(`\n========================================`);
    console.log(` CAPTURING SCREENSHOTS FOR: ${project}`);
    console.log(`========================================`);

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // Load project
    await page.goto(`http://localhost:3000/?project=${project}`, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for canvas or mode indicator to appear
    await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 10000 }).catch(() => {
      console.log(`Toggle button not found immediately for ${project}, waiting extra time...`);
    });
    await page.waitForTimeout(2000);

    // Click 1: Hybrid
    const toggleBtn = page.locator('[data-testid="architecture-mode-toggle"]');
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(1500);

      // Click 2: Orbit
      await toggleBtn.click();
      await page.waitForTimeout(2500);

      // Capture Orbit screenshot
      const orbitScreenshotPath = path.join(evidenceDir, `${project}-orbit.png`);
      await page.screenshot({ path: orbitScreenshotPath, fullPage: true });
      console.log(`Saved screenshot: ${orbitScreenshotPath}`);

      // Click 3: Constellation
      await toggleBtn.click();
      await page.waitForTimeout(2500);

      // Capture Constellation screenshot
      const constellationScreenshotPath = path.join(evidenceDir, `${project}-constellation.png`);
      await page.screenshot({ path: constellationScreenshotPath, fullPage: true });
      console.log(`Saved screenshot: ${constellationScreenshotPath}`);
    } else {
      console.error(`Toggle button still not visible for project ${project}!`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll screenshots captured successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
