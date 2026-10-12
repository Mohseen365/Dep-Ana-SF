// Node script using Playwright core to verify static explorer UI
// Run from the repository root so that Node can resolve the 'playwright' package.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });
  page.on('requestfailed', request => {
    const failure = request.failure();
    failedRequests.push({ url: request.url(), error: failure?.errorText || 'unknown' });
  });

  const response = await page.goto('http://127.0.0.1:8877/', { waitUntil: 'load' });
  console.log('PAGE_RESPONSE_STATUS', response?.status());
  console.log('PAGE_TITLE', await page.title());

  // Verify root element exists
  try {
    await page.waitForSelector('#root', { timeout: 5000 });
    console.log('ROOT_ELEMENT_FOUND', true);
  } catch (e) {
    console.log('ROOT_ELEMENT_FOUND', false);
  }

  console.log('RESULT', JSON.stringify({
    status: response?.status(),
    title: await page.title(),
    consoleErrors,
    failedRequests
  }));

  await browser.close();
})();
