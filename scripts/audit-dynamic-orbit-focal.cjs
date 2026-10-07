const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

async function runDynamicOrbitFocalAudit() {
  console.log('========================================================================');
  console.log('DYNAMIC ARCHITECTURE ORBIT FOCAL LWC SELECTION — REAL BROWSER AUDIT');
  console.log('========================================================================\n');

  const fixtureDir = path.join(__dirname, '../audit-fixtures');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });

  const screenshotDir = path.join(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  // Preflight Dataset Check
  const pbimPath = path.join(__dirname, '../explorer/public/projects/pbim/explorer-data.json');
  if (!fs.existsSync(pbimPath)) {
    console.error('VALIDATION BLOCKED — PBIM EXPORT FAILED');
    throw new Error('VALIDATION BLOCKED — PBIM EXPORT FAILED');
  }

  const rawPbim = fs.readFileSync(pbimPath, 'utf8');
  const pbimHash = crypto.createHash('sha256').update(rawPbim).digest('hex');
  const pbimData = JSON.parse(rawPbim);
  const expectedPbimHash = 'd6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b';

  console.log(`[CANONICAL PBIM DATASET GATE] File: ${pbimPath}`);
  console.log(`[CANONICAL PBIM DATASET GATE] SHA-256: ${pbimHash}`);
  console.log(`[CANONICAL PBIM DATASET GATE] Nodes: ${pbimData.nodes.length} | Edges: ${pbimData.edges.length}`);

  if (pbimHash !== expectedPbimHash || pbimData.nodes.length !== 528 || pbimData.edges.length !== 2063) {
    console.error('VALIDATION BLOCKED — WRONG DATASET');
    throw new Error('VALIDATION BLOCKED — WRONG DATASET');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const safeScreenshot = async (outPath) => {
    try {
      const base64Jpg = await page.evaluate(() => {
        const cy = window.__CY__;
        if (!cy) return null;
        return cy.jpg({ output: 'base64', scale: 0.5, bg: '#0f172a' });
      });
      if (base64Jpg) {
        fs.writeFileSync(outPath, Buffer.from(base64Jpg, 'base64'));
        console.log(`[SCREENSHOT] Captured: ${path.relative(path.resolve(__dirname, '..'), outPath)}`);
      }
    } catch (e) {
      console.warn(`[SCREENSHOT WARNING] Failed ${path.basename(outPath)}: ${e.message}`);
    }
  };

  const stepsLog = [];

  try {
    // 1. Load PBIM
    console.log('Step 1: Loading PBIM dataset in browser...');
    await page.goto('http://localhost:3000/?project=pbim', { waitUntil: 'domcontentloaded' });

    let isReady = false;
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(500);
      isReady = await page.evaluate(() => {
        const cy = window.__CY__;
        const layout = window.__LAYOUT_MODULE__;
        return Boolean(
          cy &&
          layout &&
          typeof layout.runLayoutWithMetadata === 'function' &&
          cy.nodes().length === 528
        );
      });
      if (isReady) break;
    }

    if (!isReady) {
      console.error('VALIDATION BLOCKED — BROWSER APPLICATION NOT READY');
      throw new Error('VALIDATION BLOCKED — BROWSER APPLICATION NOT READY');
    }
    console.log('[READINESS CONFIRMED] Browser ready with 528 nodes / 2063 edges');

    const setArchitectureMode = async (targetMode) => {
      for (let i = 0; i < 5; i++) {
        const currentMode = await page.evaluate(() => {
          const badge = document.querySelector('[data-testid="graph-mode-indicator"]');
          const text = badge ? badge.textContent || '' : '';
          if (text.includes('Constellation')) return 'constellation';
          if (text.includes('Orbit')) return 'orbit';
          if (text.includes('Hybrid')) return 'hybrid';
          if (text.includes('Hierarchical')) return 'hierarchical';
          return 'hierarchical';
        });

        if (currentMode === targetMode) break;

        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
          if (btn) btn.click();
        });
        await page.waitForTimeout(400);
      }
    };

    const selectNodeInApp = async (nodeId) => {
      await page.evaluate((id) => {
        const listItems = Array.from(document.querySelectorAll('li[role="treeitem"]'));
        const cy = window.__CY__;
        const cyNode = cy ? cy.getElementById(id) : null;
        const targetLabel = cyNode && cyNode.length > 0 ? (cyNode.data('label') || cyNode.data('displayName') || id) : id;

        const targetLi = listItems.find((li) => {
          const label = li.getAttribute('aria-label') || '';
          return label.includes(targetLabel) || li.textContent?.trim() === targetLabel;
        });

        if (targetLi) {
          targetLi.click();
        }
      }, nodeId);
      await page.waitForTimeout(300);
    };

    // Helper function to inspect current state
    const inspectState = async (stepName) => {
      return await page.evaluate((name) => {
        const cy = window.__CY__;
        const selectedEle = cy.nodes(':selected');
        const selectedNodeId = selectedEle.length > 0 ? selectedEle.id() : null;

        const visibleNodes = cy.nodes().filter((n) => n.visible());
        const visibleEdges = cy.edges().filter((e) => e.visible());

        let sunId = null;
        let sunPos = null;

        visibleNodes.forEach((n) => {
          const pos = n.position();
          if (Math.abs(pos.x) <= 1e-3 && Math.abs(pos.y) <= 1e-3) {
            sunId = n.id();
            sunPos = { x: pos.x, y: pos.y };
          }
        });

        return {
          stepName: name,
          selectedNodeId,
          sunId,
          sunPos,
          visibleNodesCount: visibleNodes.length,
          visibleEdgesCount: visibleEdges.length,
          totalNodesCount: cy.nodes().length,
          totalEdgesCount: cy.edges().length,
        };
      }, stepName);
    };

    // 2. Enter Hierarchical
    console.log('\nStep 2: Enter Hierarchical mode');
    await setArchitectureMode('hierarchical');
    const state2 = await inspectState('Step 2: Hierarchical');
    stepsLog.push(state2);
    console.log(`  Visible: ${state2.visibleNodesCount}N / ${state2.visibleEdgesCount}E`);

    // 3. Select LWC:asset-dashboard-container
    console.log('\nStep 3: Select LWC:asset-dashboard-container');
    await selectNodeInApp('LWC:asset-dashboard-container');
    const state3 = await inspectState('Step 3: Selected asset-dashboard-container');
    stepsLog.push(state3);
    console.log(`  selectedNodeId = ${state3.selectedNodeId}`);

    // 4. Enter Architecture Orbit
    console.log('\nStep 4: Enter Architecture Orbit');
    await setArchitectureMode('orbit');
    await page.waitForTimeout(300);

    const state5 = await inspectState('Step 5: Orbit (asset-dashboard-container)');
    stepsLog.push(state5);
    console.log(`  Sun = ${state5.sunId} at (${state5.sunPos?.x}, ${state5.sunPos?.y})`);
    console.log(`  Projected Visible = ${state5.visibleNodesCount}N / ${state5.visibleEdgesCount}E`);
    await safeScreenshot(path.join(screenshotDir, 'dynamic_orbit_step5_asset.png'));

    if (state5.sunId !== 'LWC:asset-dashboard-container' || Math.abs(state5.sunPos.x) > 1e-3) {
      throw new Error(`Step 5 FAIL: Sun !== LWC:asset-dashboard-container or position !== (0,0) (Actual Sun: ${state5.sunId})`);
    }

    // 6. Select LWC:vendor-workspace while inside Architecture Orbit
    console.log('\nStep 6: Select LWC:vendor-workspace while in Architecture Orbit');
    await selectNodeInApp('LWC:vendor-workspace');
    await page.waitForTimeout(400);

    const state7 = await inspectState('Step 7: Orbit (vendor-workspace)');
    stepsLog.push(state7);
    console.log(`  Sun = ${state7.sunId} at (${state7.sunPos?.x}, ${state7.sunPos?.y})`);
    console.log(`  Projected Visible = ${state7.visibleNodesCount}N / ${state7.visibleEdgesCount}E`);
    await safeScreenshot(path.join(screenshotDir, 'dynamic_orbit_step7_vendor.png'));

    if (state7.sunId !== 'LWC:vendor-workspace' || Math.abs(state7.sunPos.x) > 1e-3) {
      throw new Error(`Step 7 FAIL: Sun !== LWC:vendor-workspace or position !== (0,0) (Actual Sun: ${state7.sunId})`);
    }

    // 8. Switch to Hybrid
    console.log('\nStep 8: Switch to Hybrid mode');
    await setArchitectureMode('hybrid');
    const state8 = await inspectState('Step 8: Hybrid');
    stepsLog.push(state8);
    console.log(`  selectedNodeId remained = ${state8.selectedNodeId}`);

    // 9. Select LWC:citizen-report-portal
    console.log('\nStep 9: Select LWC:citizen-report-portal');
    await selectNodeInApp('LWC:citizen-report-portal');
    await page.waitForTimeout(300);

    // 10. Enter Architecture Orbit
    console.log('\nStep 10: Enter Architecture Orbit');
    await setArchitectureMode('orbit');
    await page.waitForTimeout(400);

    const state11 = await inspectState('Step 11: Orbit (citizen-report-portal)');
    stepsLog.push(state11);
    console.log(`  Sun = ${state11.sunId} at (${state11.sunPos?.x}, ${state11.sunPos?.y})`);
    console.log(`  Projected Visible = ${state11.visibleNodesCount}N / ${state11.visibleEdgesCount}E`);
    await safeScreenshot(path.join(screenshotDir, 'dynamic_orbit_step11_citizen.png'));

    if (state11.sunId !== 'LWC:citizen-report-portal' || Math.abs(state11.sunPos.x) > 1e-3) {
      throw new Error(`Step 11 FAIL: Sun !== LWC:citizen-report-portal or position !== (0,0) (Actual Sun: ${state11.sunId})`);
    }

    // 12. Enter Component Constellation
    console.log('\nStep 12: Enter Component Constellation');
    await setArchitectureMode('constellation');
    const state12 = await inspectState('Step 12: Constellation');
    stepsLog.push(state12);
    console.log(`  Constellation Visible: ${state12.visibleNodesCount}N / ${state12.visibleEdgesCount}E`);

    // 13. Select LWC:error-panel
    console.log('\nStep 13: Select LWC:error-panel');
    await selectNodeInApp('LWC:error-panel');
    await page.waitForTimeout(300);

    // 14. Enter Architecture Orbit
    console.log('\nStep 14: Enter Architecture Orbit');
    await setArchitectureMode('orbit');
    await page.waitForTimeout(400);

    const state15 = await inspectState('Step 15: Orbit (error-panel)');
    stepsLog.push(state15);
    console.log(`  Sun = ${state15.sunId} at (${state15.sunPos?.x}, ${state15.sunPos?.y})`);
    console.log(`  Projected Visible = ${state15.visibleNodesCount}N / ${state15.visibleEdgesCount}E`);
    await safeScreenshot(path.join(screenshotDir, 'dynamic_orbit_step15_error.png'));

    if (state15.sunId !== 'LWC:error-panel' || Math.abs(state15.sunPos.x) > 1e-3) {
      throw new Error(`Step 15 FAIL: Sun !== LWC:error-panel or position !== (0,0) (Actual Sun: ${state15.sunId})`);
    }

    // 16. Select an ApexClass (ApexClass:AssetDashboardController)
    console.log('\nStep 16: Select ApexClass:AssetDashboardController');
    await selectNodeInApp('ApexClass:AssetDashboardController');
    await page.waitForTimeout(400);

    const state17 = await inspectState('Step 17: Selected ApexClass in Orbit');
    stepsLog.push(state17);
    console.log(`  Selected Node = ${state17.selectedNodeId}`);
    console.log(`  Sun Node = ${state17.sunId}`);

    if (state17.sunId === 'ApexClass:AssetDashboardController') {
      throw new Error(`Step 17 FAIL: ApexClass became the Sun!`);
    }

    // 18. Return to Constellation
    console.log('\nStep 18: Return to Constellation');
    await setArchitectureMode('constellation');
    const state19 = await inspectState('Step 19: Constellation Baseline');
    stepsLog.push(state19);
    console.log(`  Constellation Nodes = ${state19.visibleNodesCount} (Expected 42) | Edges = ${state19.visibleEdgesCount} (Expected 71)`);

    if (state19.visibleNodesCount !== 42 || state19.visibleEdgesCount !== 71) {
      throw new Error(`Step 19 FAIL: Constellation baseline mutated! (${state19.visibleNodesCount}N / ${state19.visibleEdgesCount}E)`);
    }

    // Save final evidence
    const outputResults = {
      executiveVerdict: 'DYNAMIC ARCHITECTURE ORBIT FOCAL SELECTION VERIFIED',
      datasetIdentity: {
        sha256: pbimHash,
        nodes: 528,
        edges: 2063,
      },
      stepsLog,
    };

    const outJsonPath = path.join(fixtureDir, 'dynamic-orbit-focal-audit-results.json');
    fs.writeFileSync(outJsonPath, JSON.stringify(outputResults, null, 2));

    console.log('\n========================================================================');
    console.log('DYNAMIC ORBIT FOCAL AUDIT COMPLETE! All 19 steps PASSED.');
    console.log(`Saved output evidence to: ${outJsonPath}`);
    console.log('EXECUTIVE VERDICT: DYNAMIC ARCHITECTURE ORBIT FOCAL SELECTION VERIFIED');
    console.log('========================================================================\n');

  } finally {
    await context.close();
    await browser.close();
  }
}

runDynamicOrbitFocalAudit().catch((err) => {
  console.error('\nFATAL Dynamic Orbit Focal Audit Failure:', err);
  process.exit(1);
});
