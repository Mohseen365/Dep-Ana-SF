const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Tokenization functions matching test suite
function tokenizeR4(label) {
  return label;
}

function tokenizeUnderscore(label) {
  if (!label.includes('_')) return label;
  return label.replace(/_/g, '_\n').replace(/\n+/g, '\n').trim();
}

function tokenizeDot(label) {
  if (!label.includes('.')) return label;
  return label.replace(/\./g, '.\n').replace(/\n+/g, '\n').trim();
}

function tokenizeBoth(label) {
  let res = label;
  res = res.replace(/_/g, '_\n');
  res = res.replace(/\./g, '.\n');
  return res.replace(/\n+/g, '\n').trim();
}

function tokenizeChunk(label, maxChunkLen = 12) {
  const initial = tokenizeBoth(label);
  const lines = initial.split('\n');
  const chunkedLines = [];

  for (const line of lines) {
    if (line.length <= maxChunkLen) {
      chunkedLines.push(line);
      continue;
    }

    const camelTokens = line.split(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Za-z])(?=[0-9])/);
    if (camelTokens.length > 1) {
      let current = '';
      for (const token of camelTokens) {
        if (!current) {
          current = token;
        } else if (current.length + token.length <= maxChunkLen) {
          current += token;
        } else {
          chunkedLines.push(current);
          current = token;
        }
      }
      if (current) chunkedLines.push(current);
    } else {
      for (let i = 0; i < line.length; i += maxChunkLen) {
        chunkedLines.push(line.substring(i, i + maxChunkLen));
      }
    }
  }

  return chunkedLines.join('\n');
}

const TOKENIZERS = {
  'R4_Baseline': tokenizeR4,
  '30A-Underscore': tokenizeUnderscore,
  '30A-Dot': tokenizeDot,
  '30A-Both': tokenizeBoth,
  '30A-Chunk': tokenizeChunk,
};

async function runPhase30aBrowserAudit() {
  const tStart = Date.now();
  console.log('[0.0s] Starting Phase 30A Real Project Real Browser Soft-Wrap Audit...');

  const rootDir = path.resolve(__dirname, '..');
  const fixtureDir = path.join(rootDir, 'audit-fixtures');
  const ssDir = path.join(rootDir, 'verification_b_screenshots');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

  const positionsPath = path.join(fixtureDir, 'phase28r-positions-and-labels.json');
  if (!fs.existsSync(positionsPath)) {
    throw new Error(`Positions file not found: ${positionsPath}.`);
  }

  const positionsAndLabels = JSON.parse(fs.readFileSync(positionsPath, 'utf-8'));

  console.log('Launching headless Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();

  const viewports = [
    { name: '1024x768', width: 1024, height: 768 },
    { name: '1280x720', width: 1280, height: 720 },
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '2560x1440', width: 2560, height: 1440 },
  ];

  const zoomLevelsToSweep = [0.05, 0.08, 0.10, 0.11, 0.12, 0.15, 0.20, 0.30, 0.40, 0.50];

  const summary = {};
  const zoomSweepSummary = {};
  const fullCorpus = {};
  const labelMetricsSummary = {};

  const projectsToAudit = ['pbim', 'cloud-spend-tracker'];

  for (const projId of projectsToAudit) {
    console.log(`\n======================================================`);
    console.log(`AUDITING PROJECT: ${projId.toUpperCase()}`);
    console.log(`======================================================`);

    summary[projId] = {};
    zoomSweepSummary[projId] = {};
    labelMetricsSummary[projId] = {};

    console.log(`Navigating to http://localhost:3000/?project=${projId} ...`);
    await page.goto(`http://localhost:3000/?project=${projId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__CY__ && window.__CY__.nodes && window.__CY__.nodes().length > 0), null, { timeout: 60000 });

    console.log('Activating Hybrid Mode...');
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="architecture-mode-toggle"]');
      if (btn && !btn.classList.contains('active')) btn.click();
    });
    await page.waitForTimeout(1000);

    const r4Data = positionsAndLabels[projId]['R4_AdaptiveCapacity'];
    if (!r4Data || !r4Data.positions) {
      throw new Error(`R4_AdaptiveCapacity positions missing for ${projId}`);
    }

    const r4Positions = r4Data.positions;
    const originalLabels = r4Data.displayLabels;

    const expectedNodes = projId === 'pbim' ? 528 : 240;
    const expectedEdges = projId === 'pbim' ? 2063 : 1024;

    const actualGraphCounts = await page.evaluate(() => {
      return {
        nodeCount: window.__CY__.nodes().length,
        edgeCount: window.__CY__.edges().length
      };
    });

    console.log(`Graph Identity Check: ${actualGraphCounts.nodeCount} nodes / ${actualGraphCounts.edgeCount} edges (Expected: ${expectedNodes}/${expectedEdges})`);
    if (actualGraphCounts.nodeCount !== expectedNodes) {
      throw new Error(`Node count mismatch for ${projId}: ${actualGraphCounts.nodeCount} vs ${expectedNodes}`);
    }

    for (const [candId, tokenizerFn] of Object.entries(TOKENIZERS)) {
      console.log(`\nEvaluating Candidate: ${candId} on ${projId.toUpperCase()}...`);

      summary[projId][candId] = {};
      zoomSweepSummary[projId][candId] = [];

      const displayLabels = {};
      Object.keys(originalLabels).forEach((nodeId) => {
        const origLabel = originalLabels[nodeId];
        displayLabels[nodeId] = tokenizerFn(origLabel);
      });

      await page.setViewportSize({ width: 1920, height: 1080 });

      // Run entire candidate audit in a single page evaluate call
      const evalRes = await page.evaluate(({ positions, labels, candidateId, zoomLevels, vps }) => {
        const cy = window.__CY__;
        cy.stop();
        cy.batch(() => {
          cy.nodes().forEach((node) => {
            const id = node.id();
            if (positions[id]) node.position(positions[id]);
            const l = labels[id] || node.data('displayName') || id;
            node.data('label', l);
          });
        });

        // 1. Position Verification
        let mismatchCount = 0;
        const sampleMismatches = [];
        cy.nodes().forEach((node) => {
          const id = node.id();
          const p = node.position();
          const exp = positions[id];
          if (!exp || Math.abs(p.x - exp.x) > 1e-3 || Math.abs(p.y - exp.y) > 1e-3) {
            mismatchCount++;
            if (sampleMismatches.length < 3) {
              sampleMismatches.push({ id, actual: p, expected: exp });
            }
          }
        });

        // 2. Measure Rendered Geometry at Zoom 1.0
        cy.zoom(1.0);
        cy.center();
        cy.elements().removeClass('zoom-far lod-2 lod-3 lod-4');
        cy.elements().addClass('zoom-near lod-0');

        const zoom = cy.zoom();
        const nodesList = cy.nodes();
        const N = nodesList.length;
        const metrics = [];

        nodesList.forEach(n => {
          const r = n.renderedBoundingBox();
          const label = n.data('label') || '';
          const lines = label.split('\n').length;
          const rW = (typeof r.w === 'number') ? r.w : (r.x2 - r.x1);
          const rH = (typeof r.h === 'number') ? r.h : (r.y2 - r.y1);
          const modelW = rW / (zoom || 1);
          const modelH = rH / (zoom || 1);
          metrics.push({
            id: n.id(),
            label,
            renderedWidth: rW,
            renderedHeight: rH,
            modelWidth: modelW,
            modelHeight: modelH,
            lineCount: lines,
            area: modelW * modelH
          });
        });

        metrics.sort((a, b) => b.modelWidth - a.modelWidth);
        const widths = metrics.map(m => m.modelWidth);
        const heights = metrics.map(m => m.modelHeight);

        const sumW = widths.reduce((a, b) => a + b, 0);
        const sumH = heights.reduce((a, b) => a + b, 0);

        const meanW = sumW / N;
        const meanH = sumH / N;

        const sortedW = [...widths].sort((a, b) => a - b);
        const sortedH = [...heights].sort((a, b) => a - b);

        const p95W = sortedW[Math.floor(sortedW.length * 0.95)];
        const p95H = sortedH[Math.floor(sortedH.length * 0.95)];
        const maxW = sortedW[sortedW.length - 1];
        const maxH = sortedH[sortedH.length - 1];

        const labelDims = {
          count: N,
          meanWidth: Math.round(meanW * 100) / 100,
          p95Width: Math.round(p95W * 100) / 100,
          maxWidth: Math.round(maxW * 100) / 100,
          meanHeight: Math.round(meanH * 100) / 100,
          p95Height: Math.round(p95H * 100) / 100,
          maxHeight: Math.round(maxH * 100) / 100,
          rawMetrics: metrics
        };

        // Helper to detect collisions
        function getCollisions() {
          const nodesData = [];
          for (let i = 0; i < N; i++) {
            const n = nodesList[i];
            const pos = n.position();
            const r = n.renderedBoundingBox();
            nodesData.push({
              id: n.id(),
              label: n.data('label') || n.id(),
              posX: pos.x,
              posY: pos.y,
              rx1: r.x1, ry1: r.y1, rx2: r.x2, ry2: r.y2
            });
          }

          const sorted = [...nodesData].sort((a, b) => a.rx1 - b.rx1);
          const collisions = [];
          let sameRow = 0, adjacentRow = 0, true2D = 0;

          for (let i = 0; i < N; i++) {
            const nA = sorted[i];
            for (let j = i + 1; j < N; j++) {
              const nB = sorted[j];
              if (nB.rx1 >= nA.rx2) break;

              const overlapX = Math.min(nA.rx2, nB.rx2) - Math.max(nA.rx1, nB.rx1);
              const overlapY = Math.min(nA.ry2, nB.ry2) - Math.max(nA.ry1, nB.ry1);

              if (overlapX > 0 && overlapY > 0) {
                const dyCenterModel = Math.abs(nA.posY - nB.posY);
                let axisClass = 'TRUE_2D';
                if (dyCenterModel < 10) {
                  axisClass = 'SAME_ROW_HORIZONTAL_PRIMARY';
                  sameRow++;
                } else if (dyCenterModel <= 160) {
                  axisClass = 'ADJACENT_ROW_2D';
                  adjacentRow++;
                } else {
                  true2D++;
                }

                collisions.push({
                  nodeA: nA.id,
                  nodeB: nB.id,
                  labelA: nA.label,
                  labelB: nB.label,
                  dxCenterModel: Math.abs(nA.posX - nB.posX),
                  dyCenterModel,
                  overlapX,
                  overlapY,
                  axisClass
                });
              }
            }
          }

          return { total: collisions.length, sameRow, adjacentRow, true2D, list: collisions };
        }

        // 3. Zoom Sweep
        const zoomSweepResults = [];
        for (const targetZoom of zoomLevels) {
          cy.zoom(targetZoom);
          cy.center();
          cy.elements().removeClass('zoom-far lod-2 lod-3 lod-4');
          cy.elements().addClass('zoom-near lod-0');

          const colRes = getCollisions();
          zoomSweepResults.push({
            targetZoom,
            actualZoom: Math.round(cy.zoom() * 1000) / 1000,
            renderedCollisionCount: colRes.total,
            sameRowHorizontalCount: colRes.sameRow,
            adjacentRow2DCount: colRes.adjacentRow,
            true2DCount: colRes.true2D,
            collisions: colRes.list
          });
        }

        // 4. Viewport Sweep
        const vpResults = {};
        for (const vp of vps) {
          cy.fit(undefined, 50);
          cy.elements().removeClass('zoom-far lod-2 lod-3 lod-4');
          cy.elements().addClass('zoom-near lod-0');

          const colRes = getCollisions();
          vpResults[vp.name] = {
            candidateId,
            viewport: vp.name,
            zoomFit: Math.round(cy.zoom() * 1000) / 1000,
            visibleRenderedCollisions: colRes.total,
            visibleSameRow: colRes.sameRow,
            visibleAdjacentRow: colRes.adjacentRow,
            visibleTrue2D: colRes.true2D,
            visibleCollisions: colRes.list
          };
        }

        return {
          mismatchCount,
          sampleMismatches,
          labelDims,
          zoomSweepResults,
          vpResults
        };
      }, { positions: r4Positions, labels: displayLabels, candidateId: candId, zoomLevels: zoomLevelsToSweep, vps: viewports });

      if (evalRes.mismatchCount > 0) {
        console.log(`  Position mismatch error: ${JSON.stringify(evalRes.sampleMismatches)}`);
        throw new Error(`FAIL - VARIABLE CONTAMINATION: Node positions changed for candidate ${candId}`);
      }

      labelMetricsSummary[projId][candId] = evalRes.labelDims;
      zoomSweepSummary[projId][candId] = evalRes.zoomSweepResults;
      summary[projId][candId] = evalRes.vpResults;

      Object.keys(evalRes.vpResults).forEach((vpName) => {
        const corpusKey = `${projId}_${candId}_${vpName}`;
        fullCorpus[corpusKey] = evalRes.vpResults[vpName];
      });

      const d = evalRes.labelDims;
      console.log(`  - MeanW: ${d.meanWidth}px (P95: ${d.p95Width}px, Max: ${d.maxWidth}px) | MeanH: ${d.meanHeight}px (P95: ${d.p95Height}px, Max: ${d.maxHeight}px)`);

      const z015 = evalRes.zoomSweepResults.find(z => z.targetZoom === 0.15);
      if (z015) {
        console.log(`  - Collisions @ z=0.15: ${z015.renderedCollisionCount} (SameRow=${z015.sameRowHorizontalCount}, AdjRow=${z015.adjacentRow2DCount}, True2D=${z015.true2DCount})`);
      }
    }
  }

  console.log('\n======================================================');
  console.log('VERIFYING DEFAULT PROJECT ISOLATION GATE');
  console.log('======================================================');
  await page.goto('http://localhost:3000/?project=default', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(500);
  const defaultNodeCount = await page.evaluate(() => window.__CY__ ? window.__CY__.nodes().length : 0);
  console.log(`Default Project Node Count: ${defaultNodeCount}`);

  await browser.close();

  fs.writeFileSync(path.join(fixtureDir, 'phase30a-browser-summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(fixtureDir, 'phase30a-zoom-sweep-summary.json'), JSON.stringify(zoomSweepSummary, null, 2));
  fs.writeFileSync(path.join(fixtureDir, 'phase30a-browser-corpus.json'), JSON.stringify(fullCorpus, null, 2));
  fs.writeFileSync(path.join(fixtureDir, 'phase30a-label-metrics-summary.json'), JSON.stringify(labelMetricsSummary, null, 2));

  console.log(`\n=== PHASE 30A BROWSER AUDIT COMPLETE in ${((Date.now() - tStart) / 1000).toFixed(2)}s ===`);
}

runPhase30aBrowserAudit().catch((err) => {
  console.error('Phase 30A Browser Audit Failed:', err);
  process.exit(1);
});
