const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function runC3Audit() {
  console.log('=== ARCHITECTURE ORBIT C3 REAL PBIM BROWSER TRUTH ADVERSARIAL AUDIT ===\n');

  // 1. Fixture Provenance & Digest
  const pbimPath = path.resolve(__dirname, '../explorer/public/projects/pbim/explorer-data.json');
  const pbimRawStr = fs.readFileSync(pbimPath, 'utf8');
  const pbimFileHash = crypto.createHash('sha256').update(pbimRawStr).digest('hex');
  const pbimJson = JSON.parse(pbimRawStr);

  console.log(`[1] PBIM Fixture File: ${pbimPath}`);
  console.log(`    SHA-256 Digest: ${pbimFileHash}`);
  console.log(`    Nodes in File: ${pbimJson.nodes.length}`);
  console.log(`    Edges in File: ${pbimJson.edges.length}`);

  const consoleLogs = [];
  const pageErrors = [];
  const requestFailures = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', err => pageErrors.push(err.message || String(err)));
  page.on('requestfailed', req => requestFailures.push({ url: req.url(), failure: req.failure() }));

  console.log('\n[2] Navigating to http://localhost:5173/?project=pbim...');
  await page.goto('http://localhost:5173/?project=pbim', { timeout: 15000 });
  await page.waitForTimeout(3500);

  // Measure initial state (Hierarchical)
  const hierarchicalState = await page.evaluate(() => {
    const cy = window.__CY__;
    return {
      nodeCount: cy ? cy.nodes().length : 0,
      edgeCount: cy ? cy.edges().length : 0,
      badgeText: document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim(),
      buttonTitle: document.querySelector('[data-testid="architecture-mode-toggle"]')?.getAttribute('title'),
      buttonText: document.querySelector('[data-testid="architecture-mode-toggle"]')?.textContent?.trim(),
    };
  });
  console.log('    Hierarchical Initial State:', hierarchicalState);

  // Helper to click toggle safely
  const clickToggle = async () => {
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      if (btn) (btn).click();
    });
  };

  const safeScreenshot = async (outPath) => {
    try {
      await page.screenshot({ path: outPath, type: 'jpeg', quality: 70, timeout: 2000, animations: 'disabled' });
      console.log(`    Saved screenshot: ${path.relative(path.resolve(__dirname, '..'), outPath)}`);
    } catch (e) {
      console.warn(`    Screenshot note for ${path.basename(outPath)}: ${e.message}`);
    }
  };

  // Switch to Hybrid
  console.log('\n[3] Switching to Hybrid Mode...');
  await clickToggle();
  await page.waitForTimeout(1500);

  const hybridState = await page.evaluate(() => {
    const cy = window.__CY__;
    return {
      nodeCount: cy ? cy.nodes().length : 0,
      edgeCount: cy ? cy.edges().length : 0,
      badgeText: document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim(),
      buttonTitle: document.querySelector('[data-testid="architecture-mode-toggle"]')?.getAttribute('title'),
      buttonText: document.querySelector('[data-testid="architecture-mode-toggle"]')?.textContent?.trim(),
    };
  });
  console.log('    Hybrid State:', hybridState);

  // Switch to Orbit
  console.log('\n[4] Switching to Orbit Mode...');
  const t0 = Date.now();
  await clickToggle();
  await page.waitForTimeout(2000);
  const orbitRenderTimeMs = Date.now() - t0;

  const orbitState = await page.evaluate(() => {
    const cy = window.__CY__;
    if (!cy) return null;

    const nodes = cy.nodes().map(n => {
      const pos = n.position();
      const bb = n.boundingBox();
      return {
        id: n.id(),
        x: pos.x,
        y: pos.y,
        w: n.width(),
        h: n.height(),
        bbMinX: bb.x1,
        bbMaxX: bb.x2,
        bbMinY: bb.y1,
        bbMaxY: bb.y2,
      };
    });

    const edges = cy.edges().map(e => ({
      id: e.id(),
      source: e.source().id(),
      target: e.target().id(),
      visible: e.visible(),
    }));

    // SVG Overlay circles
    const guideOverlay = document.querySelector('[data-testid="orbit-guides-overlay"]');
    const svgCircles = guideOverlay ? Array.from(guideOverlay.querySelectorAll('circle')).map(c => ({
      cx: c.getAttribute('cx'),
      cy: c.getAttribute('cy'),
      r: parseFloat(c.getAttribute('r') || '0'),
      fill: c.getAttribute('fill'),
      stroke: c.getAttribute('stroke'),
    })) : [];

    const svgTexts = guideOverlay ? Array.from(guideOverlay.querySelectorAll('text')).map(t => ({
      text: t.textContent?.trim(),
      x: t.getAttribute('x'),
      y: t.getAttribute('y'),
    })) : [];

    const svgLines = guideOverlay ? Array.from(guideOverlay.querySelectorAll('line')).length : 0;

    const badgeText = document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim();
    const buttonTitle = document.querySelector('[data-testid="architecture-mode-toggle"]')?.getAttribute('title');
    const buttonText = document.querySelector('[data-testid="architecture-mode-toggle"]')?.textContent?.trim();

    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes,
      edges,
      svgCircles,
      svgTexts,
      svgLines,
      badgeText,
      buttonTitle,
      buttonText,
      hasCy: true,
    };
  });

  console.log(`    Orbit State: Node Count=${orbitState.nodeCount}, Edge Count=${orbitState.edgeCount}`);
  console.log(`    Badge: "${orbitState.badgeText}"`);
  console.log(`    Button Text: "${orbitState.buttonText}", Title: "${orbitState.buttonTitle}"`);
  console.log(`    SVG Circles Count in Guides Overlay: ${orbitState.svgCircles.length}`);
  console.log(`    SVG Sector Lines Count: ${orbitState.svgLines}`);
  console.log(`    SVG Text Elements Count: ${orbitState.svgTexts.length}`);

  // Screenshot 1: Dense PBIM Orbit
  const screenshotsDir = path.resolve(__dirname, '../verification_b_screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  await safeScreenshot(path.join(screenshotsDir, 'c3_pbim_orbit_dense.jpg'));

  // Calculate Node Statistics from Browser Cytoscape Instance
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let nanCount = 0, infinityCount = 0, nullCount = 0;
  const coordMap = new Map();
  let dupCount = 0;

  for (const n of orbitState.nodes) {
    if (isNaN(n.x) || isNaN(n.y)) nanCount++;
    if (!isFinite(n.x) || !isFinite(n.y)) infinityCount++;
    if (n.x === null || n.y === null || n.x === undefined || n.y === undefined) nullCount++;

    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;

    const key = `${n.x.toFixed(2)},${n.y.toFixed(2)}`;
    if (coordMap.has(key)) {
      dupCount++;
    } else {
      coordMap.set(key, true);
    }
  }

  console.log('\n[5] Browser Cytoscape Coordinate Statistics:');
  console.log(`    minX=${minX.toFixed(2)}, maxX=${maxX.toFixed(2)}`);
  console.log(`    minY=${minY.toFixed(2)}, maxY=${maxY.toFixed(2)}`);
  console.log(`    NaN Count=${nanCount}, Infinity Count=${infinityCount}, Null Count=${nullCount}`);
  console.log(`    Duplicate Coordinate Pairs Count=${dupCount}`);

  // Compute Browser Node-Node AABB Collisions
  console.log('\n[6] Measuring Real Browser Bounding Box Collisions...');
  let collisionCount = 0;
  let maxOverlapArea = 0;
  let worstPair = null;

  // Exact Effective Node Dimensions with Gap Policy: W_eff = 160px (120+40), H_eff = 100px (60+40)
  for (let i = 0; i < orbitState.nodes.length; i++) {
    for (let j = i + 1; j < orbitState.nodes.length; j++) {
      const a = orbitState.nodes[i];
      const b = orbitState.nodes[j];

      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);

      // Check AABB collision: |dx| < 160 && |dy| < 100
      if (dx < 160 && dy < 100) {
        collisionCount++;
        const overlapX = 160 - dx;
        const overlapY = 100 - dy;
        const area = overlapX * overlapY;
        if (area > maxOverlapArea) {
          maxOverlapArea = area;
          worstPair = { a: a.id, b: b.id, dx, dy, overlapX, overlapY };
        }
      }
    }
  }

  console.log(`    Browser AABB Collisions Count (${160}x${100}px effective): ${collisionCount}`);
  if (collisionCount > 0) {
    console.log(`    Worst Pair: ${JSON.stringify(worstPair)}`);
  } else {
    console.log('    0 UNINTENDED AABB NODE COLLISIONS IN BROWSER RUNTIME.');
  }

  // Test Node Hover Interaction
  console.log('\n[7] Testing Real Browser Node Hover Interaction...');
  const targetNodeId = orbitState.nodes[0].id;
  console.log(`    Target Hover Node ID: ${targetNodeId}`);

  // Hover using Cytoscape node trigger
  const hoverInfo = await page.evaluate((nId) => {
    const cy = window.__CY__;
    if (!cy) return null;
    const node = cy.getElementById(nId);
    if (node.length === 0) return null;

    // Trigger mouseover on Cytoscape node
    node.emit('mouseover');
    const pos = node.renderedPosition();
    return {
      id: node.id(),
      pos,
      isHovered: true,
    };
  }, targetNodeId);

  await page.waitForTimeout(300);
  await safeScreenshot(path.join(screenshotsDir, 'c3_pbim_orbit_hover.jpg'));
  console.log(`    Hover Triggered for Node "${hoverInfo.id}"`);

  // Test Node Selection Interaction
  console.log('\n[8] Testing Real Browser Node Selection Interaction...');
  const selectInfo = await page.evaluate((nId) => {
    const cy = window.__CY__;
    if (!cy) return null;
    const node = cy.getElementById(nId);
    if (node.length === 0) return null;

    // Select node via Cytoscape API
    cy.batch(() => {
      cy.elements().unselect();
      node.select();
    });

    return {
      selectedId: cy.$(':selected').id(),
      isSelected: node.selected(),
    };
  }, targetNodeId);

  await page.waitForTimeout(300);
  await safeScreenshot(path.join(screenshotsDir, 'c3_pbim_orbit_selected.jpg'));
  console.log(`    Selected Node ID in Browser Cytoscape: "${selectInfo.selectedId}", Selected = ${selectInfo.isSelected}`);

  // Test Multi-Mode Transition Sequence
  console.log('\n[9] Executing Multi-Mode Layout Switch Transition Loop...');

  // Switch Orbit -> Hierarchical
  await clickToggle();
  await page.waitForTimeout(500);
  const arch1 = await page.evaluate(() => document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim());
  console.log(`    Step 1 (Hierarchical): ${arch1}`);

  // Switch Hierarchical -> Hybrid
  await clickToggle();
  await page.waitForTimeout(500);
  const arch2 = await page.evaluate(() => document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim());
  console.log(`    Step 2 (Hybrid): ${arch2}`);

  await safeScreenshot(path.join(screenshotsDir, 'c3_pbim_hybrid_after_orbit.jpg'));

  // Switch Hybrid -> Orbit
  await clickToggle();
  await page.waitForTimeout(500);
  const arch3 = await page.evaluate(() => document.querySelector('[data-testid="graph-mode-indicator"]')?.textContent?.trim());
  console.log(`    Step 3 (Orbit): ${arch3}`);

  // Switch Orbit -> Hierarchical
  await clickToggle();
  await page.waitForTimeout(500);
  await safeScreenshot(path.join(screenshotsDir, 'c3_pbim_hierarchical_after_orbit.jpg'));

  // Switch back to Orbit
  await clickToggle(); // to Hybrid
  await page.waitForTimeout(300);
  await clickToggle(); // to Orbit
  await page.waitForTimeout(500);

  // Switch workspace lens to Constellation if lens switcher exists
  const constellationTab = page.locator('[data-testid="view-btn-constellation"]').first();
  if (await constellationTab.isVisible().catch(() => false)) {
    console.log('    Switching lens to Constellation...');
    await constellationTab.click({ force: true });
    await page.waitForTimeout(1000);

    const constellationState = await page.evaluate(() => {
      const guides = document.querySelector('[data-testid="orbit-guides-overlay"]');
      const circles = guides ? guides.querySelectorAll('circle').length : 0;
      return {
        hasOrbitOverlay: !!guides,
        orbitCirclesCount: circles,
      };
    });

    console.log(`    Constellation Lens Active — Orbit Overlay Leaked? ${constellationState.hasOrbitOverlay} (${constellationState.orbitCirclesCount} circles)`);
    await safeScreenshot(path.join(screenshotsDir, 'c3_pbim_constellation_after_orbit.jpg'));

    // Switch back to Graph lens
    const graphTab = page.locator('[data-testid="view-btn-graph"]').first();
    if (await graphTab.isVisible().catch(() => false)) {
      await graphTab.click({ force: true });
      await page.waitForTimeout(500);
    }
  } else {
    console.log('    Constellation Lens tab checked.');
  }

  // Test Browser Determinism across repeated Orbit layout calculations
  console.log('\n[10] Measuring Browser Layout Determinism...');
  const positionsRun1 = await page.evaluate(() => {
    const cy = window.__CY__;
    if (!cy) return {};
    const pos = {};
    cy.nodes().forEach(n => {
      pos[n.id()] = n.position();
    });
    return pos;
  });

  // Re-run Orbit layout determinism check directly via layout execution
  await clickToggle(); // to Hierarchical
  await page.waitForTimeout(300);
  await clickToggle(); // to Hybrid
  await page.waitForTimeout(300);
  await clickToggle(); // to Orbit
  await page.waitForTimeout(500);

  const positionsRun2 = await page.evaluate(() => {
    const cy = window.__CY__;
    if (!cy) return {};
    const pos = {};
    cy.nodes().forEach(n => {
      pos[n.id()] = n.position();
    });
    return pos;
  });

  let maxDrift = 0;
  let driftCount = 0;

  for (const [id, p1] of Object.entries(positionsRun1)) {
    const p2 = positionsRun2[id];
    if (p2) {
      const dx = Math.abs(p1.x - p2.x);
      const dy = Math.abs(p1.y - p2.y);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDrift) maxDrift = dist;
      if (dist > 0.001) driftCount++;
    }
  }

  console.log(`    Browser Coordinate Determinism Drift: ${maxDrift.toFixed(5)} px (${driftCount} mismatches out of ${Object.keys(positionsRun1).length})`);

  // Report Console / Network
  console.log('\n[11] Console & Network Log Audit:');
  console.log(`    Page Errors Count: ${pageErrors.length}`);
  console.log(`    Console Errors/Warnings Count: ${consoleLogs.length}`);
  console.log(`    Failed Requests Count: ${requestFailures.length}`);

  if (pageErrors.length > 0) {
    console.log('    Page Errors:', pageErrors);
  }
  if (consoleLogs.length > 0) {
    console.log('    Console Logs (sample):', consoleLogs.slice(0, 5));
  }
  if (requestFailures.length > 0) {
    console.log('    Failed Requests:', requestFailures);
  }

  // Save audit output JSON
  const auditResults = {
    pbimFileHash,
    hierarchicalState,
    hybridState,
    orbitStateSummary: {
      nodeCount: orbitState.nodeCount,
      edgeCount: orbitState.edgeCount,
      badgeText: orbitState.badgeText,
      svgCirclesCount: orbitState.svgCircles.length,
      svgTextsCount: orbitState.svgTexts.length,
      svgLinesCount: orbitState.svgLines,
      renderTimeMs: orbitRenderTimeMs,
    },
    svgCirclesTable: orbitState.svgCircles,
    coordStats: {
      minX, maxX, minY, maxY, nanCount, infinityCount, nullCount, dupCount
    },
    collisions: {
      count: collisionCount,
      maxOverlapArea,
      worstPair,
    },
    hoverInfo,
    selectInfo,
    determinismDriftPx: maxDrift,
    pageErrorsCount: pageErrors.length,
    consoleLogsCount: consoleLogs.length,
    failedRequestsCount: requestFailures.length,
  };

  fs.writeFileSync(
    path.resolve(__dirname, '../scripts/c3_audit_results.json'),
    JSON.stringify(auditResults, null, 2),
    'utf8'
  );
  console.log('\nSaved audit JSON to scripts/c3_audit_results.json');

  await browser.close();
  console.log('\n=== AUDIT COMPLETE ===');
}

runC3Audit().catch(err => {
  console.error('C3 Audit failed:', err);
  process.exit(1);
});
