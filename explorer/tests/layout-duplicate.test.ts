// playwright test to capture layout runs
import { test, expect } from '@playwright/test';

test('detect duplicate layout runs and position counts', async ({ page }) => {
  const logs: any[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[Layout')) {
      try {
        // Message format: "%c[Layout Start]" etc. msg.args may contain object
        const args = msg.args();
        if (args.length > 1) {
          // second argument is the object we logged
          args[1].jsonValue().then(obj => logs.push({ type: text.includes('Start') ? 'start' : 'end', data: obj }));
        }
      } catch (e) {
        // fallback: push raw text
        logs.push({ raw: text });
      }
    }
  });

  // inject wrapper before any script runs
  await page.addInitScript(() => {
    // Dynamically import the graph-layout module (Vite serves source files under /src/...)
    import('/src/lib/graph-layout.ts')
      .then(m => {
        const orig = m.runLayoutWithMetadataAsync;
        m.runLayoutWithMetadataAsync = async function (cy, options = {}) {
          const reason = options?.layoutReason ?? 'unknown';
          const requestId = options?.requestId ?? 'none';
          console.log('%c[Layout Start]', 'color: teal', { reason, requestId, nodeCount: cy?.nodes().length ?? 0, edgeCount: cy?.edges().length ?? 0 });
          const result = await orig.call(this, cy, options);
          const posCount = Object.keys(result?.positions ?? {}).length;
          const sample = Object.entries(result?.positions ?? {})[0] ?? null;
          console.log('%c[Layout End]', 'color: teal', { reason, requestId, posCount, sample });
          return result;
        };
      })
      .catch(err => console.error('Import error', err));
  });

  // navigate to dev server
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // wait a bit for layout to complete
  await page.waitForTimeout(3000);

  // output collected logs
  console.log('CAPTURED_LOGS', JSON.stringify(logs));
  // Simple assertion: we expect at least two end logs
  const endLogs = logs.filter(l => l.type === 'end');
  expect(endLogs.length).toBeGreaterThanOrEqual(2);
});
