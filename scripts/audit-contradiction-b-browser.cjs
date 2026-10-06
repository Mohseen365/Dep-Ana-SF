const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const { adaptComponentOrbit } = require('../explorer/src/lib/adapters/component-orbit-adapter');

function setsEqual(setA, setB) {
  if (setA.size !== setB.size) return false;
  for (const elem of setA) {
    if (!setB.has(elem)) return false;
  }
  return true;
}

async function runBrowserEdgeAudit() {
  console.log('=== CONTRADICTION B — EXACT EDGE & NODE SET AUDIT ===\n');

  const pbimPath = path.join(__dirname, '../analyze/projects/pbim/explorer-data.json');
  const pbimData = JSON.parse(fs.readFileSync(pbimPath, 'utf8'));

  const scenarios = [
    { focalLwcId: 'LWC:asset-dashboard-container', name: 'asset-dashboard-container' },
    { focalLwcId: 'LWC:citizen-report-portal', name: 'citizen-report-portal' },
    { focalLwcId: 'LWC:vendor-workspace', name: 'vendor-workspace' },
    { focalLwcId: 'LWC:error-panel', name: 'error-panel' },
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000/?project=pbim');
    await page.waitForTimeout(3000);

    const tableRows = [];

    for (const sc of scenarios) {
      // 1. Adapter Oracle
      const oracleProj = adaptComponentOrbit(pbimData, { focalLwcId: sc.focalLwcId, maxDepth: 7 });
      const oracleNodeSet = new Set(Object.keys(oracleProj.nodes));
      const oracleEdgeSet = new Set(oracleProj.edges.map(e => e.edgeId));

      // 2. Real Browser Execution
      const browserResult = await page.evaluate(({ focalId }) => {
        const cy = window.__CY__;
        const layoutModule = window.__LAYOUT_MODULE__;
        if (!cy || !layoutModule) return null;

        const layoutRes = layoutModule.runLayoutWithMetadata(cy, {
          architectureMode: 'orbit',
          focalLwcId: focalId,
          fit: true,
        });

        const positionedNodeIds = Object.keys(layoutRes.positions || {});
        const positionedSet = new Set(positionedNodeIds);

        // Filter Cytoscape edges whose source AND target are in positionedSet
        const cyEdges = cy.edges();
        const activeEdgeIds = [];
        const activeEdgeDetails = [];

        for (let i = 0; i < cyEdges.length; i++) {
          const e = cyEdges[i];
          const src = e.source().id();
          const tgt = e.target().id();
          if (positionedSet.has(src) && positionedSet.has(tgt)) {
            const edgeId = e.id();
            activeEdgeIds.push(edgeId);
            activeEdgeDetails.push({
              id: edgeId,
              source: src,
              target: tgt,
              relationshipType: e.data('relationshipType') || e.data('type'),
            });
          }
        }

        return {
          positionedNodeIds,
          activeEdgeIds,
          activeEdgeDetails,
          totalCyNodes: cy.nodes().length,
          totalCyEdges: cy.edges().length,
        };
      }, { focalId: sc.focalLwcId });

      if (!browserResult) throw new Error(`Browser execution failed for ${sc.name}`);

      const browserNodeSet = new Set(browserResult.positionedNodeIds);
      const browserEdgeSet = new Set(browserResult.activeEdgeIds);

      const nodeSetEqual = setsEqual(oracleNodeSet, browserNodeSet);
      const edgeSetEqual = setsEqual(oracleEdgeSet, browserEdgeSet);

      console.log(`[SCENARIO: ${sc.name}]`);
      console.log(`  Oracle Nodes: ${oracleNodeSet.size} | Browser Nodes: ${browserNodeSet.size} | Equal: ${nodeSetEqual}`);
      console.log(`  Oracle Edges: ${oracleEdgeSet.size} | Browser Edges: ${browserEdgeSet.size} | Equal: ${edgeSetEqual}`);

      if (!nodeSetEqual || !edgeSetEqual) {
        console.error(`  Node Set Diff: oracle-only=${[...oracleNodeSet].filter(x => !browserNodeSet.has(x))}, browser-only=${[...browserNodeSet].filter(x => !oracleNodeSet.has(x))}`);
        console.error(`  Edge Set Diff: oracle-only=${[...oracleEdgeSet].filter(x => !browserEdgeSet.has(x))}, browser-only=${[...browserEdgeSet].filter(x => !oracleEdgeSet.has(x))}`);
      }

      tableRows.push({
        scenario: sc.name,
        oracleNodes: oracleNodeSet.size,
        browserNodes: browserNodeSet.size,
        oracleEdges: oracleEdgeSet.size,
        browserEdges: browserEdgeSet.size,
        nodeSetEqual: nodeSetEqual ? 'YES' : 'NO',
        edgeSetEqual: edgeSetEqual ? 'YES' : 'NO',
      });
    }

    console.log('\n--- REQUIRED TABLE CONTRADICTION B ---');
    console.table(tableRows);

  } finally {
    await context.close();
    await browser.close();
  }
}

runBrowserEdgeAudit().catch(err => {
  console.error('Fatal Browser Edge Audit Failure:', err);
  process.exit(1);
});
