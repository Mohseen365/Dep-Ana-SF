const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runContradictionCAudit() {
  console.log('=== CONTRADICTION C & CONTAMINATION TEST — BROWSER AUDIT ===\n');

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

    for (const sc of scenarios) {
      console.log(`================================================================`);
      console.log(`AUDITING SCENARIO: ${sc.name} (${sc.focalLwcId})`);
      console.log(`================================================================`);

      const auditResult = await page.evaluate(({ focalId }) => {
        const cy = window.__CY__;
        const layoutModule = window.__LAYOUT_MODULE__;
        if (!cy || !layoutModule) return null;

        const layoutRes = layoutModule.runLayoutWithMetadata(cy, {
          architectureMode: 'orbit',
          focalLwcId: focalId,
          fit: true,
        });

        const positionedMap = layoutRes.positions || {};
        const positionedSet = new Set(Object.keys(positionedMap));

        const allNodes = cy.nodes();
        const focusedCyNodes = [];
        const unfocusedCyNodes = [];

        for (let i = 0; i < allNodes.length; i++) {
          const n = allNodes[i];
          if (positionedSet.has(n.id())) {
            focusedCyNodes.push(n);
          } else {
            unfocusedCyNodes.push(n);
          }
        }

        // Pick 5 representative focused nodes & 5 representative unfocused nodes
        const sampleFocused = focusedCyNodes.slice(0, 5).map((n) => {
          const style = n.style();
          const rbox = n.renderedBoundingBox({ includeLabels: false });
          const lbox = n.renderedBoundingBox({ includeLabels: true });
          const connectedEdges = n.connectedEdges();
          const activeEdges = connectedEdges.filter((e) => positionedSet.has(e.source().id()) && positionedSet.has(e.target().id()));

          return {
            id: n.id(),
            type: n.data('type'),
            position: n.position(),
            visible: n.visible(),
            display: style['display'],
            opacity: style['opacity'],
            classes: n.classes(),
            rbox,
            lbox,
            totalConnectedEdges: connectedEdges.length,
            activeProjectedEdges: activeEdges.length,
          };
        });

        const sampleUnfocused = unfocusedCyNodes.slice(0, 5).map((n) => {
          const style = n.style();
          const rbox = n.renderedBoundingBox({ includeLabels: false });
          const lbox = n.renderedBoundingBox({ includeLabels: true });
          const connectedEdges = n.connectedEdges();
          const activeEdges = connectedEdges.filter((e) => positionedSet.has(e.source().id()) && positionedSet.has(e.target().id()));

          return {
            id: n.id(),
            type: n.data('type'),
            positionInLayoutRes: n.id() in positionedMap,
            cytoscapePosition: n.position(),
            visible: n.visible(),
            display: style['display'],
            opacity: style['opacity'],
            classes: n.classes(),
            rbox,
            lbox,
            totalConnectedEdges: connectedEdges.length,
            activeProjectedEdges: activeEdges.length,
          };
        });

        // Contamination Tests:
        // 1. Check if any unfocused node has position assigned in layoutRes
        const unfocusedAssignedPositions = unfocusedCyNodes.filter((n) => n.id() in positionedMap).length;

        // 2. Check if any unfocused node overlaps a focused node in rendered bounding box
        let unfocusedOverlapsFocused = 0;
        const focusedRboxes = focusedCyNodes.map((n) => n.renderedBoundingBox({ includeLabels: false }));
        for (const un of unfocusedCyNodes) {
          const ur = un.renderedBoundingBox({ includeLabels: false });
          // Check if bounding box is valid non-zero
          if (ur.w > 0 && ur.h > 0) {
            for (const fr of focusedRboxes) {
              if (ur.x1 < fr.x2 && ur.x2 > fr.x1 && ur.y1 < fr.y2 && ur.y2 > fr.y1) {
                unfocusedOverlapsFocused++;
              }
            }
          }
        }

        // 3. Check if any unfocused node renders a visible label
        let unfocusedVisibleLabels = 0;
        for (const un of unfocusedCyNodes) {
          const lbox = un.renderedBoundingBox({ includeLabels: true });
          const rbox = un.renderedBoundingBox({ includeLabels: false });
          if (lbox.w > rbox.w + 5 && un.visible() && un.style('display') !== 'none') {
            unfocusedVisibleLabels++;
          }
        }

        // 4. Check if any edge between unfocused and focused node is active in layout
        let crossEdgesActive = 0;
        const allEdges = cy.edges();
        for (let i = 0; i < allEdges.length; i++) {
          const e = allEdges[i];
          const srcIn = positionedSet.has(e.source().id());
          const tgtIn = positionedSet.has(e.target().id());
          if (srcIn !== tgtIn) {
            // One endpoint is in projection, one is outside
            // Check if position was assigned or if edge is rendered
            if (e.source().id() in positionedMap && e.target().id() in positionedMap) {
              crossEdgesActive++;
            }
          }
        }

        return {
          totalCyNodes: allNodes.length,
          focusedCount: focusedCyNodes.length,
          unfocusedCount: unfocusedCyNodes.length,
          sampleFocused,
          sampleUnfocused,
          contaminationCheck: {
            unfocusedAssignedPositions,
            unfocusedOverlapsFocused,
            unfocusedVisibleLabels,
            crossEdgesActive,
          },
        };
      }, { focalId: sc.focalLwcId });

      console.log(`Full Cytoscape Nodes in Memory: ${auditResult.totalCyNodes}`);
      console.log(`Focused Nodes in Projection: ${auditResult.focusedCount}`);
      console.log(`Unfocused Nodes (Excluded): ${auditResult.unfocusedCount}`);

      console.log('\n--- SAMPLE FOCUSED NODES ---');
      auditResult.sampleFocused.forEach((fn) => {
        console.log(`  Focused [${fn.id}]: pos=(${fn.position.x.toFixed(1)}, ${fn.position.y.toFixed(1)}), visible=${fn.visible}, display=${fn.display}, opacity=${fn.opacity}, activeEdges=${fn.activeProjectedEdges}/${fn.totalConnectedEdges}`);
      });

      console.log('\n--- SAMPLE UNFOCUSED NODES ---');
      auditResult.sampleUnfocused.forEach((ufn) => {
        console.log(`  Unfocused [${ufn.id}]: inLayoutRes=${ufn.positionInLayoutRes}, pos=(${ufn.cytoscapePosition.x.toFixed(1)}, ${ufn.cytoscapePosition.y.toFixed(1)}), visible=${ufn.visible}, display=${ufn.display}, opacity=${ufn.opacity}, rboxW=${ufn.rbox.w.toFixed(1)}, activeEdges=${ufn.activeProjectedEdges}/${ufn.totalConnectedEdges}`);
      });

      console.log('\n--- CONTAMINATION TEST RESULTS ---');
      console.log(`  Unfocused assigned positions in Component Orbit: ${auditResult.contaminationCheck.unfocusedAssignedPositions}`);
      console.log(`  Unfocused overlaps focused node: ${auditResult.contaminationCheck.unfocusedOverlapsFocused}`);
      console.log(`  Unfocused visible labels: ${auditResult.contaminationCheck.unfocusedVisibleLabels}`);
      console.log(`  Cross-edges active in Component Orbit: ${auditResult.contaminationCheck.crossEdgesActive}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

runContradictionCAudit().catch((err) => {
  console.error('Fatal Contradiction C Audit Failure:', err);
  process.exit(1);
});
