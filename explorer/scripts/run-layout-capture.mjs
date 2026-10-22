// explorer/scripts/run-layout-capture.mjs
// Pure JavaScript version – no TypeScript casts.
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Layout')) {
      const args = msg.args();
      if (args.length > 1) {
        args[1].jsonValue().then(obj => {
          const type = text.includes('Start') ? 'start' : 'end';
          logs.push({ type, data: obj });
        }).catch(() => {});
      }
    }
  });

  // Inject wrapper after the page has loaded and webpack is ready
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  // Wait for webpack's module cache to be available
  await page.waitForFunction(() => !!window.__webpack_require__ && !!window.__webpack_require__.c);
  // Now patch the layout function
  await page.evaluate(() => {
    function findLayoutModuleId() {
      const cache = window.__webpack_require__.c;
      for (const id in cache) {
        const exp = cache[id] && cache[id].exports;
        if (exp && typeof exp.runLayoutWithMetadataAsync === 'function') {
          return id;
        }
      }
      return null;
    }
    const modId = findLayoutModuleId();
    if (!modId) {
      console.error('❌ layout module not found in webpack cache');
      return;
    }
    const mod = window.__webpack_require__.c[modId];
    const orig = mod.exports.runLayoutWithMetadataAsync;
    mod.exports.runLayoutWithMetadataAsync = async function (cy, options = {}) {
      const reason = options?.layoutReason ?? 'unknown';
      const requestId = options?.requestId ?? 'none';
      console.log('%c[Layout Start]', 'color: teal', {
        reason,
        requestId,
        nodeCount: cy && cy.nodes ? cy.nodes().length : 0,
        edgeCount: cy && cy.edges ? cy.edges().length : 0,
      });
      const result = await orig.call(this, cy, options);
      const posCount = result && result.positions ? Object.keys(result.positions).length : 0;
      const sample = result && result.positions ? Object.entries(result.positions)[0] : null;
      console.log('%c[Layout End]', 'color: teal', {
        reason,
        requestId,
        posCount,
        sample,
      });
      window.__lastLayoutResult = result;
      return result;
    };
    console.log('✅ wrapper installed (module ID', modId, ')');
  });
  // Wait a bit more for layout runs after patch
  await page.waitForTimeout(3000);
  // Navigate to the dev server (should be running on port 3000)
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  // Give the app time for layouts to finish
  await page.waitForTimeout(4000);

  console.log('CAPTURED_LOGS', JSON.stringify(logs, null, 2));

  await browser.close();
})();
