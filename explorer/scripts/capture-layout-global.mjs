// explorer/scripts/capture-layout-global.mjs
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  const logs = [];

  // Listen for console messages that contain our markers
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

  // --------------------------------------------------------------
  // 2️⃣  Inject the wrapper *before* any page script runs
  // --------------------------------------------------------------
  await page.addInitScript(() => {
    // The layout function is exported to the global namespace in dev mode.
    // Guard against it not being present.
    if (typeof window.runLayoutWithMetadataAsync !== 'function') {
      console.error('❌ window.runLayoutWithMetadataAsync not found');
      return;
    }

    const original = window.runLayoutWithMetadataAsync;

    window.runLayoutWithMetadataAsync = async function (cy, options = {}) {
      const reason    = options?.layoutReason ?? 'unknown';
      const requestId = options?.requestId   ?? 'none';
      console.log('%c[Layout Start]', 'color: teal', {
        reason,
        requestId,
        nodeCount: cy?.nodes?.().length ?? 0,
        edgeCount: cy?.edges?.().length ?? 0,
      });

      const result = await original.call(this, cy, options);

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

    console.log('✅ wrapper installed on window.runLayoutWithMetadataAsync');
  });

  // --------------------------------------------------------------
  // 3️⃣  Navigate to the app (adjust port if it changed)
  // --------------------------------------------------------------
  await page.goto('http://localhost:3001', { waitUntil: 'load' });

  // Allow the two automatic layout passes to finish.
  await page.waitForTimeout(5000);

  // --------------------------------------------------------------
  // 4️⃣  Output what we captured
  // --------------------------------------------------------------
  console.log('CAPTURED_LOGS', JSON.stringify(logs, null, 2));

  await browser.close();
})();