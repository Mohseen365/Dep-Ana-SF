const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runPhase34Validation() {
  console.log('=== PHASE 3 & 4: POSITION AUTHORITY, SELECTION COHERENCE & PROJECT ISOLATION ===\n');

  const screenshotsDir = path.resolve(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => pageErrors.push(err.message || String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const safeScreenshot = async (outPath) => {
    try {
      const base64Jpg = await page.evaluate(() => {
        const cy = window.__CY__;
        if (!cy) return null;
        return cy.jpg({ output: 'base64', scale: 0.5, bg: '#0f172a' });
      });
      if (base64Jpg) {
        fs.writeFileSync(outPath, Buffer.from(base64Jpg, 'base64'));
        console.log(`    [SCREENSHOT SAVED] ${path.basename(outPath)}`);
      }
    } catch (e) {
      console.warn(`    [SCREENSHOT WARNING] ${e.message}`);
    }
  };

  // 1. Load PBIM Dataset
  console.log('[1] Loading http://localhost:3000/?project=pbim...');
  await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.app-layout', { timeout: 180000 });
  await page.waitForSelector('[data-testid="architecture-mode-toggle"]', { timeout: 180000 });

  const initialPbimState = await page.evaluate(() => {
    const cy = window.__CY__;
    const targetNode = cy ? cy.getElementById('LWC:asset-dashboard-container') : null;
    const pos = targetNode && targetNode.length > 0 ? targetNode.position() : null;
    return {
      totalNodes: cy ? cy.nodes().length : 0,
      totalEdges: cy ? cy.edges().length : 0,
      targetNodeExists: Boolean(targetNode && targetNode.length > 0),
      initialPos: pos ? { x: Math.round(pos.x), y: Math.round(pos.y) } : null,
    };
  });

  console.log('    Initial PBIM Nodes:', initialPbimState.totalNodes, '| Edges:', initialPbimState.totalEdges);
  console.log('    Target Node LWC:asset-dashboard-container Pos:', initialPbimState.initialPos);

  // 2. Test Drag & Position Authority in Hierarchical Mode
  console.log('\n[2] Testing Node Drag & Position Authority in Hierarchical Mode...');
  const draggedPos = await page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy.getElementById('LWC:asset-dashboard-container');
    const curr = node.position();
    const newPos = { x: curr.x + 250, y: curr.y + 250 };
    node.position(newPos);
    node.emit('dragfree');
    return { x: Math.round(newPos.x), y: Math.round(newPos.y) };
  });

  console.log('    Node dragged to:', draggedPos);

  // Switch to Hybrid
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(3000);

  // Switch back to Hierarchical
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
    if (btn) btn.click(); // to Orbit
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
    if (btn) btn.click(); // to Constellation
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
    if (btn) btn.click(); // back to Hierarchical
  });
  await page.waitForTimeout(3000);

  const posAfterCycle = await page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy.getElementById('LWC:asset-dashboard-container');
    const pos = node.position();
    return { x: Math.round(pos.x), y: Math.round(pos.y) };
  });

  console.log('    Position after full mode cycle:', posAfterCycle);
  const isUserDragPreserved = Math.abs(posAfterCycle.x - draggedPos.x) < 5 && Math.abs(posAfterCycle.y - draggedPos.y) < 5;
  console.log('    User Drag Preserved in Hierarchical Mode:', isUserDragPreserved);

  // 3. Test Static vs Interactive Layout Mode
  console.log('\n[3] Testing Static vs Interactive Layout Mode Toggle...');
  const staticToggleResult = await page.evaluate(() => {
    const layoutToggleBtn = document.querySelector('[data-testid="layout-mode-toggle"]');
    if (layoutToggleBtn) layoutToggleBtn.click();
    const indicator1 = document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim();

    if (layoutToggleBtn) layoutToggleBtn.click();
    const indicator2 = document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim();

    return {
      indicator1,
      indicator2,
    };
  });

  console.log('    Static Indicator Text:', staticToggleResult.indicator1);
  console.log('    Interactive Indicator Text:', staticToggleResult.indicator2);

  // 4. Test Selection Synchronization & Drawer
  console.log('\n[4] Testing Selection Synchronization...');
  const selectionResult = await page.evaluate(() => {
    const cy = window.__CY__;
    const node = cy.getElementById('LWC:asset-dashboard-container');
    cy.batch(() => {
      cy.elements().unselect();
      node.select();
    });

    const isSelected = node.selected();
    const selectedId = cy.$(':selected').id();

    // Clear selection
    cy.batch(() => {
      cy.elements().unselect();
    });
    const clearedSelectedCount = cy.$(':selected').length;

    return {
      isSelected,
      selectedId,
      clearedSelectedCount,
    };
  });

  console.log('    Selected Node ID:', selectionResult.selectedId);
  console.log('    Selection Cleared Count:', selectionResult.clearedSelectedCount);

  // 5. Test Project Switching Isolation (PBIM -> CST -> PBIM)
  console.log('\n[5] Testing Project Switching Isolation (PBIM -> CST -> PBIM)...');
  await page.goto('http://localhost:3000/?project=cloud-spend-tracker', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.app-layout', { timeout: 180000 });

  const cstState = await page.evaluate(() => {
    const cy = window.__CY__;
    const pbimNodeInCst = cy ? cy.getElementById('LWC:asset-dashboard-container') : null;
    return {
      totalNodes: cy ? cy.nodes().length : 0,
      totalEdges: cy ? cy.edges().length : 0,
      pbimNodeLeaked: Boolean(pbimNodeInCst && pbimNodeInCst.length > 0),
    };
  });

  console.log('    CST Project Nodes:', cstState.totalNodes, '| Edges:', cstState.totalEdges);
  console.log('    PBIM Node Leaked into CST:', cstState.pbimNodeLeaked);

  // Switch back to PBIM
  await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.app-layout', { timeout: 180000 });

  const restoredPbimState = await page.evaluate(() => {
    const cy = window.__CY__;
    return {
      totalNodes: cy ? cy.nodes().length : 0,
      totalEdges: cy ? cy.edges().length : 0,
    };
  });

  console.log('    Restored PBIM Nodes:', restoredPbimState.totalNodes, '| Edges:', restoredPbimState.totalEdges);

  await safeScreenshot(path.join(screenshotsDir, '06_project_isolation_restored_pbim.jpg'));

  await browser.close();

  const passed = pageErrors.length === 0 &&
    isUserDragPreserved &&
    !cstState.pbimNodeLeaked &&
    cstState.totalNodes === 240 &&
    restoredPbimState.totalNodes === 528;

  console.log('\n=== PHASE 3 & 4 VALIDATION RESULT:', passed ? 'PASSED' : 'FAILED', '===');
}

runPhase34Validation().catch((err) => {
  console.error('Fatal Validation Error:', err);
  process.exit(1);
});
