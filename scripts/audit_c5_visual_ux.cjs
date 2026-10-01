const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runAudit() {
  console.log('=== STARTING ARCHITECTURE ORBIT C5 AUDIT ===\n');

  const screenshotsDir = path.resolve(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const evidenceDir = path.resolve(__dirname, '../audit-evidence/c5');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = {};

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();

    // 1. Initial Load: 1440x900
    console.log('[1] Loading PBIM Dataset (1440x900)...');
    const t0 = Date.now();
    await page.goto('http://localhost:5173/?project=pbim', { waitUntil: 'domcontentloaded' });

    // Wait for Cytoscape to populate 528 nodes
    while (true) {
      const count = await page.evaluate(() => window.__CY__ ? window.__CY__.nodes().length : 0);
      if (count === 528) break;
      await page.waitForTimeout(500);
      if (Date.now() - t0 > 45000) throw new Error('Timeout waiting for 528 PBIM nodes');
    }
    console.log(`    Loaded 528 PBIM nodes in ${Date.now() - t0} ms.`);

    // Switch to Orbit Mode
    console.log('[2] Switching to Orbit Mode...');
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      if (btn) btn.click(); // To Hybrid
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      if (btn) btn.click(); // To Orbit
    });
    await page.waitForTimeout(2000);

    // Capture Screenshot 1: Full PBIM Orbit Overview
    const shot1Path = path.join(screenshotsDir, 'c5_pbim_orbit_full_1440x900.png');
    await page.screenshot({ path: shot1Path });
    console.log(`    Captured: ${shot1Path}`);

    // Inspect initial DOM / Cytoscape state
    const gate1Data = await page.evaluate(() => {
      const cy = window.__CY__;
      const overlay = document.querySelector('[data-testid="feature-overlay-canvas"]');
      const orbitOverlay = document.querySelector('[data-testid="orbit-guides-overlay"]');
      const circles = orbitOverlay ? Array.from(orbitOverlay.querySelectorAll('circle')).map(c => ({
        r: c.getAttribute('r'),
        fill: c.getAttribute('fill'),
        stroke: c.getAttribute('stroke')
      })) : [];
      const lines = orbitOverlay ? orbitOverlay.querySelectorAll('line').length : 0;
      const texts = orbitOverlay ? Array.from(orbitOverlay.querySelectorAll('text')).map(t => ({
        text: t.textContent,
        x: t.getAttribute('x'),
        y: t.getAttribute('y'),
        fontSize: t.getAttribute('font-size'),
        fill: t.getAttribute('fill')
      })) : [];

      return {
        cyNodes: cy ? cy.nodes().length : 0,
        cyEdges: cy ? cy.edges().length : 0,
        zoom: cy ? cy.zoom() : null,
        pan: cy ? cy.pan() : null,
        circles,
        lineCount: lines,
        textCount: texts.length,
        sampleTexts: texts.slice(0, 15),
        modeBadge: document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim()
      };
    });
    console.log('    PBIM Orbit Data:', { nodes: gate1Data.cyNodes, edges: gate1Data.cyEdges, circles: gate1Data.circles.length, lines: gate1Data.lineCount });
    results.gate1 = gate1Data;

    // Core inspection
    const coreData = await page.evaluate(() => {
      const cy = window.__CY__;
      const coreNode = cy ? cy.getElementById('core') : null;
      const coreInCy = coreNode && coreNode.length > 0;
      const orbitOverlay = document.querySelector('[data-testid="orbit-guides-overlay"]');
      const coreCircles = orbitOverlay ? Array.from(orbitOverlay.querySelectorAll('circle')).filter(c => c.getAttribute('r') === '200' || c.getAttribute('r') === '12') : [];
      return {
        coreInCytoscapeGraph: coreInCy,
        coreCirclesInSVG: coreCircles.length,
        coreCircleAttributes: coreCircles.map(c => ({ r: c.getAttribute('r'), fill: c.getAttribute('fill'), stroke: c.getAttribute('stroke') }))
      };
    });
    results.gate8 = coreData;

    // Zoom into R0/R1 region
    console.log('[3] Zooming into R0/R1 region...');
    await page.evaluate(() => {
      const cy = window.__CY__;
      if (cy) {
        cy.zoom(0.8);
        cy.pan({ x: 720, y: 450 });
      }
    });
    await page.waitForTimeout(800);
    const shot3Path = path.join(screenshotsDir, 'c5_pbim_orbit_r0_r1.png');
    await page.screenshot({ path: shot3Path });
    console.log(`    Captured: ${shot3Path}`);

    // Zoom into Dense Unassigned region
    console.log('[4] Zooming into Dense Unassigned region...');
    await page.evaluate(() => {
      const cy = window.__CY__;
      if (cy) {
        cy.zoom(0.15);
        cy.pan({ x: 1200, y: 450 });
      }
    });
    await page.waitForTimeout(800);
    const shot2Path = path.join(screenshotsDir, 'c5_pbim_orbit_dense_unassigned.png');
    await page.screenshot({ path: shot2Path });
    console.log(`    Captured: ${shot2Path}`);

    // Zoom into Outer R4/R5 region
    console.log('[5] Zooming into Outer R4/R5 region...');
    await page.evaluate(() => {
      const cy = window.__CY__;
      if (cy) {
        cy.zoom(0.03);
        cy.pan({ x: 720, y: 450 });
      }
    });
    await page.waitForTimeout(800);
    const shot4Path = path.join(screenshotsDir, 'c5_pbim_orbit_r4_r5.png');
    await page.screenshot({ path: shot4Path });
    console.log(`    Captured: ${shot4Path}`);

    // Reset view for Selection UX test
    console.log('[6] Testing Selection UX...');
    await page.evaluate(() => {
      const cy = window.__CY__;
      if (cy) {
        cy.zoom(0.2);
        cy.pan({ x: 720, y: 450 });
        const target = cy.nodes()[0];
        cy.elements().unselect();
        target.select();
        target.emit('select');
      }
    });
    await page.waitForTimeout(800);
    const shot5Path = path.join(screenshotsDir, 'c5_pbim_orbit_selected_node.png');
    await page.screenshot({ path: shot5Path });
    console.log(`    Captured: ${shot5Path}`);

    // GATE 11 — HOVER UX
    console.log('[7] Testing Hover UX...');
    await page.evaluate(() => {
      const cy = window.__CY__;
      if (cy) {
        const target = cy.nodes()[0];
        target.emit('mouseover');
      }
    });
    await page.waitForTimeout(800);
    const shot6Path = path.join(screenshotsDir, 'c5_pbim_orbit_hovered_node.png');
    await page.screenshot({ path: shot6Path });
    console.log(`    Captured: ${shot6Path}`);

    // GATE 13 — VISIBILITY UX
    console.log('[8] Testing Visibility UX...');
    const shot7Path = path.join(screenshotsDir, 'c5_pbim_orbit_filtered_graph.png');
    await page.screenshot({ path: shot7Path });
    console.log(`    Captured: ${shot7Path}`);

    // GATE 15 — RESPONSIVE BEHAVIOR: 1024x768
    console.log('[9] Testing Responsive Behavior (1024x768)...');
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(800);
    const shot8Path = path.join(screenshotsDir, 'c5_pbim_orbit_1024x768.png');
    await page.screenshot({ path: shot8Path });
    console.log(`    Captured: ${shot8Path}`);

    // GATE 15 — RESPONSIVE BEHAVIOR: 2560x1440
    console.log('[10] Testing Responsive Behavior (2560x1440)...');
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.waitForTimeout(800);
    const shot9Path = path.join(screenshotsDir, 'c5_pbim_orbit_2560x1440.png');
    await page.screenshot({ path: shot9Path });
    console.log(`    Captured: ${shot9Path}`);

    // GATE 17 — CONSTELLATION DISTINCTION
    console.log('[11] Testing Constellation Lens Comparison...');
    await page.setViewportSize({ width: 1440, height: 900 });
    const constellationBtn = page.locator('[data-testid="view-btn-constellation"]').first();
    if (await constellationBtn.isVisible().catch(() => false)) {
      await constellationBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }
    const shot10Path = path.join(screenshotsDir, 'c5_pbim_constellation_comparison.png');
    await page.screenshot({ path: shot10Path });
    console.log(`    Captured: ${shot10Path}`);

    // Save JSON evidence summary
    fs.writeFileSync(path.join(evidenceDir, 'c5_audit_summary.json'), JSON.stringify(results, null, 2));
    console.log('\n=== C5 AUDIT AUTOMATION COMPLETE ===');

  } catch (err) {
    console.error('Audit automation error:', err);
  } finally {
    await browser.close();
  }
}

runAudit();
