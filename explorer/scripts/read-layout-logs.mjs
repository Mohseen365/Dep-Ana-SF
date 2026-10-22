// explorer/scripts/read-layout-logs.mjs
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Forward page console messages to Node (useful for debugging)
  page.on('console', msg => console.log('[page]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[pageerror]', err.message));

  // Load the app (adjust port if needed)
  await page.goto('http://localhost:3001', { waitUntil: 'load' });

  // Wait until we have *two* layout‑end entries (the two runs we care about)
  await page.waitForFunction(() => {
    const logs = (typeof window !== 'undefined' && window.__layoutLog) ? window.__layoutLog : [];
    const ends = logs.filter(l => l && l.type === 'end');
    return ends.length >= 2;
  }, null, { timeout: 20000 }).catch(() => {
    console.warn('⚠️ Timed out waiting for layout logs – got whatever is available');
  });

  // Pull the log array out of the page
  const logs = await page.evaluate(() => {
    return (typeof window !== 'undefined' && window.__layoutLog) ? window.__layoutLog : [];
  });

  console.log('CAPTURED_LOGS', JSON.stringify(logs, null, 2));

  await browser.close();
})();
