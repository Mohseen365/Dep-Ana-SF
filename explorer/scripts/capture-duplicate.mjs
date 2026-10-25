// explorer/scripts/capture-duplicate.mjs
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];

  // Capture logs for any layout calls that happen after we patch
  page.on('console', msg => {
    const txt = msg.text();
    if (txt.includes('[Layout')) {
      const args = msg.args();
      if (args.length > 1) {
        args[1].jsonValue().then(obj => {
          const type = txt.includes('Start') ? 'start' : 'end';
          logs.push({ type, data: obj });
        }).catch(() => {});
      }
    }
  });

  // 1️⃣ Load the app normally – no patch yet
  await page.goto('http://localhost:3001', { waitUntil: 'load' });
  // Give the first (automatic) layout a moment to finish
  await page.waitForTimeout(2000);

  // 2️⃣ Now patch the layout function (the bundle is fully loaded)
  await page.evaluate(() => {
    // Find the module that exports runLayoutWithMetadataAsync
    const cache = window.__webpack_require__ && window.__webpack_require__.c;
    if (!cache) { console.error('❌ webpack cache missing'); return; }

    let targetId = null;
    for (const id in cache) {
      const exp = cache[id] && cache[id].exports;
      if (exp && typeof exp.runLayoutWithMetadataAsync === 'function') {
        targetId = id; break;
      }
    }
    if (!targetId) { console.error('❌ layout module not found'); return; }

    const mod = window.__webpack_require__.c[targetId];
    const orig = mod.exports.runLayoutWithMetadataAsync;

    mod.exports.runLayoutWithMetadataAsync = async function (cy, options = {}) {
      const reason    = options?.layoutReason ?? 'unknown';
      const requestId = options?.requestId   ?? 'none';
      console.log('%c[Layout Start]', 'color: teal', {
        reason,
        requestId,
        nodeCount: cy?.nodes?.().length ?? 0,
        edgeCount: cy?.edges?.().length ?? 0,
      });
      const result = await orig.call(this, cy, options);
      const posCount = result && result.positions ? Object.keys(result.positions).length : 0;
      const sample   = result && result.positions ? Object.entries(result.positions)[0] : null;
      console.log('%c[Layout End]', 'color: teal', {
        reason,
        requestId,
        posCount,
        sample,
      });
      window.__lastLayoutResult = result;
      return result;
    };
    console.log('✅ wrapper installed (module ID', targetId, ')');
  });

  // 3️⃣ Trigger a *second* layout manually.
  // GraphView exposes a global helper `window.runLayoutWithMetadataAsync`
  // (after our patch it is the wrapped version). If not, we can call it
  // via the cached module again.
  await page.evaluate(() => {
    // Grab the same module again to call the patched function
    const cache = window.__webpack_require__.c;
    let id = null;
    for (const k in cache) {
      const exp = cache[k] && cache[k].exports;
      if (exp && typeof exp.runLayoutWithMetadataAsync === 'function') {
        id = k; break;
      }
    }
    if (!id) { console.error('❌ cannot invoke layout'); return; }
    const cy = (typeof window !== 'undefined' && window.cy) ? window.cy : null; // the Cytoscape instance is attached by the app
    if (!cy) { console.error('❌ Cytoscape instance missing'); return; }
    // Force a layout with a distinct reason so we can differentiate logs
    cache[id].exports.runLayoutWithMetadataAsync(cy, { layoutReason: 'manual‑duplicate' });
  });

  // Wait for the manual layout to finish
  await page.waitForTimeout(3000);

  console.log('CAPTURED_LOGS', JSON.stringify(logs, null, 2));
  await browser.close();
})();