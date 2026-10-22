// explorer/scripts/run-inspect-ui.mjs
import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3001');
  // wait for UI to load
  await page.waitForTimeout(3000);
  const result = await page.evaluate(() => {
    const selectors = {
      domainLensesBar: '.domain-lenses-bar[aria-label="Graph view: Interactive Dependency Graph Canvas"]',
      graphControlsFloating: '.graph-controls-floating',
      graphControlBtn: '.graph-control-btn',
      graphControlBtnActive: '.graph-control-btn.active'
    };
    const exists = {};
    for (const [key, sel] of Object.entries(selectors)) {
      exists[key] = !!document.querySelector(sel);
    }
    // Count total control buttons and active ones
    const allButtons = document.querySelectorAll(selectors.graphControlBtn);
    const activeButtons = document.querySelectorAll(selectors.graphControlBtnActive);
    return {
      exists,
      totalControlButtons: allButtons ? allButtons.length : 0,
      activeControlButtons: activeButtons ? activeButtons.length : 0,
    };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
