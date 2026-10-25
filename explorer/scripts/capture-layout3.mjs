// explorer/scripts/capture-layout3.mjs
// Playwright script that patches runLayoutWithMetadataAsync via dynamic import (Vite dev server)
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
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

  // Inject wrapper BEFORE any script runs via addInitScript
  await page.addInitScript(() => {
    // Dynamically import the source module – works with Vite dev server
    import('/src/lib/graph-layout.ts')
      .then(mod => {
        const orig = mod.runLayoutWithMetadataAsync;
        if (!orig) {
          console.error('❌ runLayoutWithMetadataAsync not found in imported module');
          return;
        }
        mod.runLayoutWithMetadataAsync = async function (cy, options = {}) {
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
        console.log('✅ wrapper installed (via dynamic import)');
      })
      .catch(err => console.error('Import error', err));
  });

  // Navigate to the dev server (port may be 3001 – adjust if needed)
  await page.goto('http://localhost:3001', { waitUntil: 'load' });

  // Wait for the two automatic layout runs to complete after our wrapper is active
  await page.waitForTimeout(5000);

  console.log('CAPTURED_LOGS', JSON.stringify(logs, null, 2));
  await browser.close();
})();
