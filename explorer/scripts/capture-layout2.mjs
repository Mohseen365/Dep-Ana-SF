// explorer/scripts/capture-layout2.mjs
// Playwright script that patches runLayoutWithMetadataAsync as early as possible
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

  // This runs before any page script, on every navigation
  await page.addInitScript(() => {
    // Poll for webpack's module cache, then patch the layout function
    const poll = () => {
      if (window.__webpack_require__ && window.__webpack_require__.c) {
        const cache = window.__webpack_require__.c;
        let modId = null;
        for (const id in cache) {
          const exp = cache[id] && cache[id].exports;
          if (exp && typeof exp.runLayoutWithMetadataAsync === 'function') {
            modId = id;
            break;
          }
        }
        if (!modId) {
          console.error('❌ layout module not found in webpack cache');
          return; // stop polling – nothing to patch
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
        clearInterval(intervalId);
      }
    };
    const intervalId = setInterval(poll, 50);
  });

  // Navigate to the dev server (adjust port if needed)
  await page.goto('http://localhost:3001', { waitUntil: 'load' });
  // Wait enough for the two layout runs to complete
  await page.waitForTimeout(5000);

  console.log('CAPTURED_LOGS', JSON.stringify(logs, null, 2));

  await browser.close();
})();
