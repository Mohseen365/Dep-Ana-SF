// -------------------------------------------------------------
// inspect-final-positions.mjs
// Reads the live Cytoscape instance after layout runs.
// No modifications to the application source.
// -------------------------------------------------------------
import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // dev server must be running
  await page.goto('http://localhost:3001', { waitUntil: 'load' });

  // Wait for three layout‑end entries
  await page.waitForFunction(() => {
    const logs = (typeof window !== 'undefined' && window.__layoutLog) ? window.__layoutLog : [];
    const ends = logs.filter(e => e && e.type === 'end');
    return ends.length >= 3;
  }, { timeout: 15000 }).catch(() => {
    console.warn('⚠️ Timed out waiting for layout logs – got whatever is available');
  });

  // -------------------------------------------------------------
  // Helper: recursively walk a React fiber looking for a stateNode
  // that contains a `cyRef` property.
  // -------------------------------------------------------------
  const cy = await page.evaluate(() => {
    const root = document.getElementById('root');
    if (!root || !root._reactRootContainer) return null;

    const startFiber = root._reactRootContainer._internalRoot?.current;
    if (!startFiber) return null;

    const stack = [startFiber];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;

      const state = node.stateNode;
      if (state && state.cyRef && state.cyRef.current) {
        return state.cyRef.current; // found the Cytoscape core
      }

      if (node.child) stack.push(node.child);
      if (node.sibling) stack.push(node.sibling);
    }
    return null; // not found
  });

  if (!cy) {
    console.log('⚠️ Could not locate Cytoscape instance – the component hierarchy may have changed.');
    await browser.close();
    return;
  }

  // -------------------------------------------------------------
  // Pull node positions from the live Cytoscape instance
  // -------------------------------------------------------------
  const positions = await page.evaluate(cyObj => {
    if (!cyObj) return null;
    const map = {};
    cyObj.nodes().forEach(n => {
      const p = n.position();
      map[n.id()] = { x: Math.round(p.x), y: Math.round(p.y) };
    });
    return map;
  }, cy);

  console.log('🟢 Final Cytoscape positions →', positions);

  await browser.close();
})();
