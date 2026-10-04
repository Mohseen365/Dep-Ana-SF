const { chromium } = require('playwright');

async function testQuick() {
  console.log('Testing quick browser navigation on PBIM (60s timeout)...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const t0 = Date.now();
  console.log('Navigating to PBIM...');
  await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('Navigated in', Date.now() - t0, 'ms');

  console.log('Waiting for window.__CY__...');
  await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 60000 });
  console.log('window.__CY__ ready in', Date.now() - t0, 'ms');

  await browser.close();
  console.log('PBIM Quick test SUCCESS');
}

testQuick().catch(err => {
  console.error('Quick test ERROR:', err);
  process.exit(1);
});
