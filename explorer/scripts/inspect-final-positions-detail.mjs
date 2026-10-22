// explorer/scripts/inspect-final-positions-detail.mjs
// -------------------------------------------------------------
// Detailed snapshot of Cytoscape container, viewport and node
// positions at three key moments (before fit, after fit, settled).
// No source changes are required – run against a live dev server.
// -------------------------------------------------------------

(async () => {
  // helper to wait for the next micro‑task (allows the UI to settle)
  const tick = () => new Promise(r => setTimeout(r, 0));

  // locate the Cytoscape container (adjust selector if needed)
  const container = document.querySelector('#cy'); // typical id
  if (!container) {
    console.error('Cytoscape container not found');
    return;
  }

  // The app normally attaches the core instance to the container.
  // If your build uses a different property, change `__cy` accordingly.
  const cy = container.__cy;
  if (!cy) {
    console.error('Cytoscape instance not exposed as container.__cy');
    return;
  }

  // -----------------------------------------------------------------
  // Helper that records everything we care about in a plain object.
  // -----------------------------------------------------------------
  const capture = (phase) => ({
    phase,
    container: {
      clientWidth: container.clientWidth,
      clientHeight: container.clientHeight,
      rectWidth: container.getBoundingClientRect().width,
      rectHeight: container.getBoundingClientRect().height,
    },
    viewport: {
      zoom: cy.zoom(),
      pan: cy.pan(),
      extent: cy.extent(),
      minZoom: cy.minZoom ? cy.minZoom() : undefined,
      maxZoom: cy.maxZoom ? cy.maxZoom() : undefined,
    },
    nodes: cy.nodes().map(n => ({
      id: n.id(),
      x: n.position('x'),
      y: n.position('y')
    }))
  });

  // -----------------------------------------------------------------
  // 1️⃣ before the first automatic fit (e.g. after a page reload)
  // -----------------------------------------------------------------
  const before = capture('beforeFit');

  // -----------------------------------------------------------------
  // 2️⃣ after the first automatic fit (cy.fit() is usually called on init)
  // -----------------------------------------------------------------
  await tick();                       // let any async layout finish
  const afterFit = capture('afterFit');

  // -----------------------------------------------------------------
  // 3️⃣ final settled state (wait a short while for any post‑load sync)
  // -----------------------------------------------------------------
  await new Promise(r => setTimeout(r, 2000));
  const settled = capture('settled');

  // -----------------------------------------------------------------
  // Optional: expose any app‑level diagnostics you may have
  // -----------------------------------------------------------------
  const authority = {
    architectureMode: window.__APP?.architectureMode ?? null,
    layoutProvenance: window.__APP?.layoutProvenance ?? null,
    resolvePositionResult: window.__APP?.resolvePosition?.lastResult ?? null,
    deterministicNewNodeCalled: window.__APP?.calculateDeterministicNewNodePosition?.called ?? null
  };

  // Print a nicely‑formatted JSON blob to the console (Playwright will capture it)
  console.log(JSON.stringify({ before, afterFit, settled, authority }, null, 2));
})();
