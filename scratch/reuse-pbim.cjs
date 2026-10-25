// Reuse page diagnostic: navigate default -> cloud-spend-tracker -> pbim on same Playwright page
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const log = [];
  const logLine = (msg) => { log.push(`${new Date().toISOString()} ${msg}`); };
  const navigate = async (project) => {
    const url = `http://localhost:3000/?project=${project}`;
    logLine(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    // wait for layout root
    await page.waitForSelector('.app-layout', { timeout: 60000 }).catch(e => logLine('app-layout missing: ' + e.message));
    // wait for toggle selector specific to pbim only when project == 'pbim'
    if (project === 'pbim') {
      try {
        await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 180000 });
        logLine('Toggle found');
      } catch (e) {
        logLine('Toggle timeout: ' + e.message);
      }
    }
  };
  try {
    await navigate('default');
    await navigate('cloud-spend-tracker');
    await navigate('pbim');
  } catch (e) {
    logLine('Unexpected error: ' + e);
  }
  await browser.close();
  const fs = require('fs');
  fs.writeFileSync('audit-evidence/pbim-lifecycle-validation-2026-10-14T18-30-00Z/reuse-pbim.log', log.join('\n'));
})();
