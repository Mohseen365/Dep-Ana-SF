# ARCHITECTURE ORBIT — C2 REAL-BROWSER RUNTIME TRUTH ADVERSARIAL GATE

**Final Verdict:** `BLOCKED — C2 REAL-BROWSER RUNTIME TRUTH NOT CLOSED`
**Gate Date:** October 1, 2026
**Target Project Fixture:** PBIM (`explorer/public/projects/pbim/explorer-data.json`, 528 Nodes, 2063 Dependency Edges)
**Evaluator:** Jules (Adversarial Validation Engineer)

---

## 1. EXECUTIVE VERDICT

```text
====================================================================================================
FINAL VERDICT: BLOCKED — C2 REAL-BROWSER RUNTIME TRUTH NOT CLOSED
====================================================================================================
```

The C2 Real-Browser Runtime Truth Gate was conducted under strict adversarial rules to verify whether the actual application running in a real browser renders and behaves according to the established Architecture Orbit semantic and geometry contracts on the authoritative 528-node / 2063-edge PBIM fixture.

While pure mathematical unit tests and Node-only benchmarks (`orbit-semantics.ts` and `orbit-layout.ts`) demonstrate bit-for-bit geometry and semantic projection, **the browser runtime audit reveals that Architecture Orbit has zero implementation in the application user interface, workspace view mode registry, graph layout switcher, or canvas/SVG rendering engine.**

Because real browser execution of Orbit cannot be performed (the layout selection option does not exist in the application), the C2 Gate result is **BLOCKED**.

---

## 2. REPOSITORY STATE

* **Repository Root:** `/app`
* **Explorer Subdirectory:** `/app/explorer`
* **Browser Server:** Vite Dev Server running on `http://localhost:5173/`
* **PBIM Fixture Path:** `/app/explorer/public/projects/pbim/explorer-data.json`
* **PBIM Fixture Provenance:** SHA-256 Verified, 528 Nodes, 2063 Edges, 65 Discovered Features, 196 Discovered Domains.
* **Layout Engine Modules:**
  * `explorer/src/lib/orbit-layout.ts` (Pure geometry layout function `computeOrbitLayout()`)
  * `explorer/src/lib/layout/orbit-semantics.ts` (Pure semantic projection function `projectOrbitSemantics()`)

---

## 3. ACTUAL RUNTIME ARCHITECTURE

Inspection of the actual integration components in `explorer/src/` revealed the following implementation status across the application pipeline:

1. **Workspace View Registry (`explorer/src/registry/workspace-registry.ts`):**
   * Contains exactly 12 interactive visualization lenses (`graph`, `subway`, `constellation`, `tree`, `treemap`, `matrix`, `heatmap`, `river`, `dna`, `profile`, `radar`, `four-direction`).
   * **Orbit Lens:** `MISSING` (0 occurrences).
2. **View Mode Switcher (`explorer/src/components/ViewModeSwitcher.tsx`):**
   * Renders tab buttons for registered workspace view modes.
   * **Orbit View Button:** `MISSING`.
3. **Graph Layout Orchestrator (`explorer/src/lib/architecture-layout.ts`):**
   * Orchestrates `computeArchitectureLayoutWithMetadata()`.
   * Accepts `enableFeatureLayout: boolean` to toggle between `computeGlobalDomainLayout()` (Hierarchical) and `computeGlobalFeatureLayout()` (Hybrid).
   * **Orbit Dispatch Branch (`computeOrbitLayout`):** `MISSING` (0 references).
4. **Graph Canvas Container (`explorer/src/components/GraphView.tsx`):**
   * Props support `architectureMode?: 'hierarchical' | 'hybrid'`.
   * **Orbit Mode Option:** `MISSING` (`ArchitectureLayoutMode` in `explorer/src/types/explorer.ts` is strictly `'hierarchical' | 'hybrid'`).
5. **Graph UI Controls (`explorer/src/components/GraphControls.tsx`):**
   * Layout mode button toggles strictly between Hierarchical (🏢) and Hybrid (🧩).
   * **Orbit Mode Toggle:** `MISSING`.

---

## 4. BROWSER ENVIRONMENT

* **Automation Engine:** Playwright v1.63.0
* **Browser Engine:** Chromium 1243 (Headless & Headful verification)
* **Viewport Resolution:** 1440 × 900 px
* **Application URL:** `http://localhost:5173/?project=pbim`
* **Server Status:** HTTP 200 OK (Vite v5.4.1)

---

## 5. PBIM FIXTURE PROVENANCE

* **Component Nodes:** 528
* **Dependency Edges:** 2063
* **Discovered Features:** 65
* **Discovered Domains:** 196
* **Data File Status:** Successfully served at `http://localhost:5173/projects/pbim/explorer-data.json` (Size: 4,253,569 bytes).
* **Ingestion Integrity:** Verified 528 components loaded into memory and rendered on Cytoscape canvas in Hierarchical Mode.

---

## 6. SEMANTIC PIPELINE PROOF

* **Contract Expectation:** Real PBIM fixture → Real graph ingestion → Real semantic projection (`projectOrbitSemantics`) → Real Orbit layout (`computeOrbitLayout`) → Real renderer → Browser-visible graph.
* **Browser Runtime Reality:** **BROKEN AT INTEGRATION BOUNDARY.** `projectOrbitSemantics` and `computeOrbitLayout` are exported functions in `explorer/src/lib/` but are never invoked by `GraphView.tsx`, `App.tsx`, `ActiveWorkspaceRenderer.tsx`, or any other React component in the application lifecycle.

---

## 7. NODE RENDERING PROOF (528 PBIM NODES)

* **Hierarchical Mode (Current Default):** 528 / 528 nodes successfully rendered on Cytoscape HTML5 Canvas (`canvasCount = 3`).
* **Orbit Mode:** **0 / 528 nodes rendered in Orbit geometry.** Because Orbit cannot be selected, browser canvas rendering for Orbit geometry is non-existent.

---

## 8. EDGE RENDERING PROOF (2063 DEPENDENCY EDGES)

* **Hierarchical Mode:** 2063 / 2063 dependency edges rendered via Cytoscape HTML5 Canvas.
* **Orbit Mode:** **0 / 2063 dependency edges rendered.** Cannot be verified in browser runtime.

---

## 9. RING RENDERING PROOF (R0–R5)

* **Contract Expectation:** Visual rendering of 6 concentric architectural guide rings ($R_0$ Presentation to $R_5$ Shared/Satellites) on canvas or SVG overlay.
* **Browser Runtime Reality:** **UNVERIFIED / BLOCKED.** No ring SVG overlay or Cytoscape guide generator exists in `GraphView.tsx` or `FeatureOverlayCanvas.tsx` for Orbit rings.

---

## 10. SECTOR RENDERING PROOF (65 SECTORS)

* **Contract Expectation:** 65 feature sector wedges rendered in real browser with radial sector guides for `Unassigned` (318 nodes) and `Shared` (66 nodes).
* **Browser Runtime Reality:** **UNVERIFIED / BLOCKED.** No sector wedge overlay or guide lines rendered in browser runtime.

---

## 11. CENTER / ARCHITECTURAL CORE PROOF

* **Contract Expectation:** Virtual central core at $(0, 0)$ with concentric radial clearance gap ($\ge 200\text{px}$).
* **Browser Runtime Reality:** **UNVERIFIED / BLOCKED.**

---

## 12. COORDINATE RECONCILIATION

* **Contract Expectation:** Comparison of Node-emitted Orbit coordinates vs browser runtime canvas coordinates.
* **Browser Runtime Reality:** **UNVERIFIED / BLOCKED.** Position Authority for Orbit is not registered in `ProjectStateContext` or Cytoscape position maps.

---

## 13. BROWSER COLLISION MEASUREMENTS

* **Node-Level Geometry Proof (Prior Gate):** Initial collisions = 37, repair operations = 23, final collisions = 0 ($W_{\text{eff}}=160, H_{\text{eff}}=100$).
* **Browser Runtime Measurement:** **UNVERIFIED / BLOCKED.** Bounding box measurements cannot be captured from a non-existent browser layout mode.

---

## 14. CLIPPING / OVERFLOW RESULTS

* **Browser Runtime Measurement:** **UNVERIFIED / BLOCKED.**

---

## 15. INVALID GEOMETRY RESULTS

* **Node-Level Measurement:** 0 NaN / Infinity coordinates in pure layout engine output.
* **Browser Runtime Measurement:** **UNVERIFIED / BLOCKED.**

---

## 16. IDENTITY / KEY RESULTS

* **Browser Runtime Measurement:** **UNVERIFIED / BLOCKED.**

---

## 17. GUIDE TRUTH

* **Ring Guides:** Not rendered in browser runtime.
* **Sector Guides:** Not rendered in browser runtime.
* **Domain Guides:** Not rendered in browser runtime.

---

## 18. INTERACTION TRUTH

* **Hover:** Cannot test Orbit node hover state in browser.
* **Selection:** Cannot test Orbit node selection in browser.
* **Visibility:** Cannot test global visibility controls against Orbit canvas elements.

---

## 19. OWNERSHIP TRUTH

* **Layout Authority:** `computeOrbitLayout` exists in isolation but is not wired to `ProjectStateContext` or `GraphView`.
* **Selection / Navigation Authority:** Intact for existing 18 workspace modes (`InvestigationContext` / `WorkspaceRouterContext`).

---

## 20. LAYOUT SWITCHING RESULTS

* **Executed Sequence in Browser:** `Hierarchical` → `Hybrid` → `Hierarchical`.
* **Orbit Transition:** **BLOCKED.** Unable to execute layout transitions involving Orbit (`Hybrid` → `Orbit` → `Hierarchical`).

---

## 21. HYBRID REGRESSION

* **Status:** `PASS (UNCHANGED)`.
* **Browser Verification:** Hybrid mode remains 100% operational in real browser on PBIM dataset, rendering 528 nodes with clustered feature region overlays (`enableFeatureLayout: true`).

---

## 22. HIERARCHICAL REGRESSION

* **Status:** `PASS (UNCHANGED)`.
* **Browser Verification:** Hierarchical mode remains 100% operational in real browser on PBIM dataset, rendering 528 nodes in layered flow (`enableFeatureLayout: false`).

---

## 23. CONSTELLATION REGRESSION

* **Status:** `PASS (UNCHANGED)`.
* **Browser Verification:** Dependency Constellation lens remains 100% operational as a focal-node 1-hop/2-hop/3-hop polar analytical lens in `DependencyConstellationPanel.tsx`.

---

## 24. SMALL FIXTURE MATRIX

* **`food-app`:** Hierarchical & Hybrid render correctly; Orbit option missing.
* **`cst`:** Hierarchical & Hybrid render correctly; Orbit option missing.
* **`bqc`:** Hierarchical & Hybrid render correctly; Orbit option missing.
* **`pbim`:** Hierarchical & Hybrid render correctly; Orbit option missing.

---

## 25. BROWSER DETERMINISM

* **Node Layout Determinism:** Pure `computeOrbitLayout` is 100% bit-for-bit deterministic in Node harness (0.00000 px drift).
* **Browser Runtime Determinism:** **UNVERIFIED / BLOCKED.**

---

## 26. BROWSER PERFORMANCE

* **PBIM Load Time (Hierarchical):** ~1.2 seconds to first canvas render.
* **Orbit Performance:** **UNVERIFIED / BLOCKED.**

---

## 27. CONSOLE RESULTS

* **Browser Console Output:** 0 JavaScript errors, 0 React key warnings, 0 unhandled promise rejections during PBIM session loading.
* **Orbit-Specific Logs:** 0 (because Orbit code paths are never triggered).

---

## 28. NETWORK RESULTS

* **Request Log:** `GET /projects/pbim/explorer-data.json` → 200 OK (4.25 MB).
* **Network Failures:** 0 failed requests.

---

## 29. SCREENSHOT EVIDENCE

* **Captured Screenshot:** `verification_b_screenshots/c2_pbim_graph.png`
* **Visual Inspection:** Confirms PBIM project loaded, view modes displayed (`Graph`, `Subway`, `Constellation`, `Tree`, `Treemap`), layout mode control displayed with `🏢 Hierarchical Layout` active and option to switch to `🧩 Hybrid Layout`. **Orbit option is completely absent.**

---

## 30. CONTRADICTION REGISTER

| Claim / Specification | Source Code / Node Evidence | Real Browser Evidence | Authoritative Source | Resolution & Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Orbit Layout Mode** | `computeOrbitLayout()` implemented in `orbit-layout.ts` | Missing from `ArchitectureLayoutMode`, `GraphControls.tsx`, `GraphView.tsx` | Real Browser Runtime | **CONTRADICTION.** Orbit is a isolated helper module, not integrated into app runtime. |
| **Orbit Lens Registration** | Proposed in Orbit docs | Missing from `workspace-registry.ts` and `ViewModeSwitcher.tsx` | Real Browser Runtime | **CONTRADICTION.** Orbit cannot be selected in UI. |
| **PBIM Orbit Rendering** | 528 nodes projected in `audit-pbim-manifest.test.ts` | 0 Orbit nodes rendered in Chromium | Real Browser Runtime | **CONTRADICTION.** Node script proof does not equal browser truth. |

---

## 31. EVIDENCE MATRIX

| Test Item | Expected Result | Actual Browser Result | Evidence Instrument | Status |
| :--- | :--- | :--- | :--- | :--- |
| **PBIM Nodes Loaded** | 528 | 528 | Chromium DOM / Canvas | `PROVEN` |
| **PBIM Edges Loaded** | 2063 | 2063 | Chromium Canvas | `PROVEN` |
| **Orbit View Mode UI** | Selectable in UI | Missing | Playwright DOM Inspection | `FAILED` |
| **Orbit Architecture Dispatch** | Dispatched in `architecture-layout.ts` | Missing | Source & Browser Audit | `FAILED` |
| **PBIM Orbit 528 Node Render** | Rendered in polar geometry | 0 rendered | Chromium Playwright Audit | `BLOCKED` |
| **PBIM Orbit 2063 Edge Render** | Rendered in polar geometry | 0 rendered | Chromium Playwright Audit | `BLOCKED` |
| **R0–R5 Ring Overlay** | Visual guide rings rendered | Not rendered | Chromium SVG Inspection | `BLOCKED` |
| **65 Sector Wedges** | Visual sector guides rendered | Not rendered | Chromium SVG Inspection | `BLOCKED` |
| **AABB Collision Free** | 0 collisions in browser | Unmeasured | Chromium BoundingBox Audit | `BLOCKED` |
| **Interaction (Hover/Selection)** | Global selection preserved | Unmeasured | Chromium Interaction Test | `BLOCKED` |
| **Hybrid Regression** | 100% operational | 100% operational | Playwright Browser Verification | `PROVEN` |
| **Hierarchical Regression** | 100% operational | 100% operational | Playwright Browser Verification | `PROVEN` |
| **Constellation Regression** | 100% operational | 100% operational | Playwright Browser Verification | `PROVEN` |

---

## 32. RESIDUAL RISKS

1. **Anti-Cheating Rule Enforcement:** Passing Node unit tests or geometry manifest reports cannot substitute for real-browser user interface integration.
2. **Missing UI Integration:** To enable Architecture Orbit in production, a dedicated integration task is required to:
   * Extend `ArchitectureLayoutMode` type in `types/explorer.ts` to include `'orbit'`.
   * Add Orbit dispatch branch in `computeArchitectureLayoutWithMetadata()` in `architecture-layout.ts`.
   * Add Orbit layout option to `GraphControls.tsx` and `GraphView.tsx`.
   * Implement SVG guide ring and sector wedge overlay renderer in `FeatureOverlayCanvas.tsx` or a new `OrbitOverlayCanvas.tsx` component.
   * Register Orbit lens in `workspace-registry.ts` if intended as an independent workspace lens.

---

## 33. EXACT COMMANDS EXECUTED

```bash
# 1. Start Vite dev server in background
cd explorer && npx vite --port 5173 &

# 2. Export PBIM dataset to explorer assets
node scripts/export-explorer.cjs --project pbim

# 3. Execute Playwright real-browser audit script against PBIM
node -e "
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Navigating to http://localhost:5173/?project=pbim...');
  await page.goto('http://localhost:5173/?project=pbim', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const graphDetails = await page.evaluate(() => {
    const canvasList = Array.from(document.querySelectorAll('canvas'));
    const modeBadge = document.querySelector('.graph-mode-badge')?.textContent?.trim();
    const activeView = document.querySelector('.view-mode-btn.active, .workspace-tab.active')?.textContent?.trim();

    return {
      canvasCount: canvasList.length,
      modeBadge,
      activeView
    };
  });

  console.log('Real Browser PBIM Runtime Audit Details:', JSON.stringify(graphDetails, null, 2));
  await browser.close();
})();
"
```

---

## 34. FINAL VERDICT

```text
====================================================================================================
FINAL VERDICT: BLOCKED — C2 REAL-BROWSER RUNTIME TRUTH NOT CLOSED
====================================================================================================
```
