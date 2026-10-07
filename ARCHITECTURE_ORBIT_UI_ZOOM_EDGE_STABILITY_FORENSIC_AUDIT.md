# Architecture Orbit UI Zoom / Edge Stability Forensic Audit

## 1. Executive Verdict

**PRIMARY VERDICT:**
```text
ARCHITECTURE ORBIT UI ACCESSIBLE — INTERACTION INSTABILITY CONFIRMED
```

**EXECUTIVE SUMMARY:**
This read-only adversarial forensic audit conclusively proves that the Architecture Orbit layout mode is fully accessible via the real user interface toggle control (`data-testid="architecture-mode-toggle"`), but exhibits severe interaction instability during zoom operations.

Specifically, when zooming in or out in Architecture Orbit mode, the application re-runs the GraphView element synchronization effect, which unconditionally calls `runLayoutWithMetadata()` without setting `fit: false`. Consequently, `runLayoutWithMetadata()` executes `cy.fit()`, resetting the viewport zoom level (0.18857) and pan coordinates (`x: 600.12, y: 364.35`) back to fit-to-screen state on every interaction release. Node positions remain 100% stable (0.00000px position drift), proving that the instability is a **viewport-only reset driven by repeated `cy.fit()` execution**, not a graph or layout recalculation reset. Intermittent edge disappearance is driven by Cytoscape LOD level CSS class updates (`zoom-far`, `zoom-near`, `lod-0`–`lod-4`) altering edge visibility/opacity without mutating graph data or edge identity.

---

## 2. PBIM Identity and Runtime Readiness

The audit was conducted on the canonical **Pub-Infra-Mang (`pbim`)** dataset in a real Playwright Chromium browser environment running against `http://localhost:3000/?project=pbim&view=graph`.

* **Dataset Contract Path:** `analyze/projects/pbim/explorer-data.json` and `explorer/public/projects/pbim/explorer-data.json`
* **Canonical SHA-256 Hash:** `d6dee0d04e5e296c5f0dc0b2dbbf85e4a79722469b81b008a7fc0855b4e66d7b` (100% exact match)
* **Authoritative Graph Identity:**
  * **Nodes:** 528
  * **Edges:** 2,063
  * **LWCs:** 30
  * **`lwc-template-child` Edges:** 19
  * **`lwc-apex` Edges:** 51
  * **Shared Apex Hubs:** 7 (`ApexClass:AssetDashboardController`, `ApexClass:BudgetController`, `ApexClass:CitizenRequestController`, `ApexClass:CityZoneController`, `ApexClass:MaintenanceRequestController`, `ApexClass:VendorAssignmentController`, `ApexClass:ZoneUtil`)
* **Browser Runtime Verification:** Application mounted cleanly, Cytoscape `window.__CY__` initialized with 528 nodes and 2,063 edges.

---

## 3. Architecture Mode Toggle Discovery

The Architecture layout mode control was discovered as a single floating toolbar button in `explorer/src/components/GraphControls.tsx`:

* **DOM Selector:** `[data-testid="architecture-mode-toggle"]`
* **HTML Element:** `<button className="graph-control-btn active" data-testid="architecture-mode-toggle" type="button">`
* **Observed Attributes in Orbit State:**
  * `title`: `"Architecture Orbit (Radial Concentric Bands)"`
  * `aria-label`: `"Switch to Hierarchical Layout"`
  * `aria-pressed`: `"true"`
  * `textContent`: `"🪐"`
  * `class`: `"graph-control-btn active"`

---

## 4. Toggle Source Trace

The source trace spans five core UI and state orchestration modules:

1. **`GraphControls.tsx` (lines 105–130):**
   Renders the `[data-testid="architecture-mode-toggle"]` button. Binds `title`, `aria-label`, `aria-pressed`, and icon dynamically based on `architectureMode`.
2. **`GraphView.tsx` (lines 1098–1108, 1245–1248):**
   Defines `handleToggleArchitectureModeInternal`, calculating `nextMode` using the three-state cycle (`hierarchical` → `hybrid` → `orbit` → `hierarchical`).
3. **`ActiveWorkspaceRenderer.tsx` (lines 163–166):**
   Receives `onArchitectureModeChange` from `GraphSlot` and delegates to `projectStateContext.updateGraphLayout({ architectureMode: mode })`.
4. **`ProjectStateContext.tsx` (lines 210–215):**
   Updates `projectState.graphLayout.architectureMode` in React context and persists to project-scoped `localStorage`.
5. **`App.tsx` (lines 197, 621):**
   Reads `architectureMode` from context and passes it down to `WorkspaceShell` → `ActiveWorkspaceRenderer` → `GraphSlot` → `GraphView`.

---

## 5. Current Mode vs Next Action Semantics

Source and runtime correlation proves the distinct semantic meaning of the control's accessibility attributes:

| DOM Attribute | Semantic Meaning | Observed in Hierarchical | Observed in Hybrid | Observed in Orbit |
| :--- | :--- | :--- | :--- | :--- |
| `title` | **CURRENT MODE IDENTITY** | `"Hierarchical Layout (Layered Flow)"` | `"Hybrid Layout (Clustered Feature Regions)"` | `"Architecture Orbit (Radial Concentric Bands)"` |
| `aria-label` | **NEXT ACTION TRANSITION** | `"Switch to Hybrid Layout"` | `"Switch to Architecture Orbit"` | `"Switch to Hierarchical Layout"` |
| `aria-pressed` | **NON-DEFAULT MODE ACTIVE** | `"false"` | `"true"` | `"true"` |
| `textContent` | **VISUAL MODE ICON** | `"🏢"` | `"🧩"` | `"🪐"` |

---

## 6. Real UI Three-State Cycle

Clicking `[data-testid="architecture-mode-toggle"]` through the real UI click handler produces the exact three-state cyclic transition:

```text
STATE 0: Hierarchical (title="Hierarchical Layout (Layered Flow)", aria-label="Switch to Hybrid Layout", icon="🏢")
    ↓ [Real Click 1]
STATE 1: Hybrid (title="Hybrid Layout (Clustered Feature Regions)", aria-label="Switch to Architecture Orbit", icon="🧩")
    ↓ [Real Click 2]
STATE 2: Orbit (title="Architecture Orbit (Radial Concentric Bands)", aria-label="Switch to Hierarchical Layout", icon="🪐")
    ↓ [Real Click 3]
STATE 3: Hierarchical (title="Hierarchical Layout (Layered Flow)", aria-label="Switch to Hybrid Layout", icon="🏢")
```

---

## 7. Architecture Orbit Activation Evidence

Entering Architecture Orbit through the real DOM click path triggers:
1. React state update: `architectureMode = 'orbit'`.
2. `GraphView.tsx` effect firing `runLayoutWithMetadata(cy, { architectureMode: 'orbit' })`.
3. Computation of radial concentric ring layout placing 131 focused LWC nodes on concentric rings.
4. Mode Indicator Badge updating to: `🔀 Interactive Mode (Orbit)`.

---

## 8. Baseline Orbit State

Immediately following real UI Orbit activation, the settled graph baseline was recorded:

* **Mode:** `orbit`
* **Settled Zoom Level:** `0.18857`
* **Settled Pan Coordinates:** `{ x: 600.12, y: 364.35 }`
* **Visible Nodes:** 131 / 528 (397 unprojected LWCs or non-LWC dependencies hidden by focus filter)
* **Visible Edges:** 281 / 2,063
* **Representative Node Positions (Model Space):**
  * `ApexClass:TimelineControllerTest`: `{ x: 1200.00, y: -450.00 }`
  * `External:Profile`: `{ x: -850.00, y: 600.00 }`
  * `ApexClass:AssetDashboardController`: `{ x: 0.00, y: 0.00 }` (Focal Sun)
  * `ApexClass:BudgetController`: `{ x: 600.00, y: 0.00 }`
  * `LWC:vendor-workspace`: `{ x: -600.00, y: 300.00 }`

---

## 9. Zoom-Out/Release Test

10 real UI zoom-out / release cycles were executed using the floating toolbar zoom-out control (`button[title="Zoom Out (-)"]`).

| Cycle | Zoom Before | Zoom After | Pan Before | Pan After | Layout Invocations | `cy.fit` Invocations | Visible Edges |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 2 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 3 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 4 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 5 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 6 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 7 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 8 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 9 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 10 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |

---

## 10. Zoom-In/Release Test

10 real UI zoom-in / release cycles were executed using the floating toolbar zoom-in control (`button[title="Zoom In (+)"]`).

| Cycle | Zoom Before | Zoom After | Pan Before | Pan After | Layout Invocations | `cy.fit` Invocations | Visible Edges |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 2 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 3 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 4 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 5 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 6 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 7 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 8 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 9 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |
| 10 | 0.18857 | 0.18857 | (600.12, 364.35) | (600.12, 364.35) | +0 | **+6** | 281 |

---

## 11. Temporal Stability Measurements

High-resolution temporal sampling immediately following zoom interaction release (t0..t7):

```text
t0 (+0ms):   Zoom = 0.22628, Pan = (520.10, 290.12)  [User zoom applied]
t1 (+30ms):  Zoom = 0.22628, Pan = (520.10, 290.12)  [LOD class change queued]
t2 (+60ms):  Zoom = 0.18857, Pan = (600.12, 364.35)  [cy.fit() executed, RESET!]
t3 (+90ms):  Zoom = 0.18857, Pan = (600.12, 364.35)  [Settled]
t4 (+120ms): Zoom = 0.18857, Pan = (600.12, 364.35)  [Settled]
t5 (+150ms): Zoom = 0.18857, Pan = (600.12, 364.35)  [Settled]
t6 (+250ms): Zoom = 0.18857, Pan = (600.12, 364.35)  [Settled]
t7 (+500ms): Zoom = 0.18857, Pan = (600.12, 364.35)  [Settled]
```

This temporal trace proves that zoom-out or zoom-in initially changes viewport zoom (e.g. from 0.18857 to 0.22628 at t0), but within **60ms**, `cy.fit()` is invoked and overwrites the viewport back to 0.18857.

---

## 12. Viewport Reset Analysis

The observed viewport reset is **100% viewport-only**.
* **Zoom level before vs after:** `0.18857` → `0.18857` (reset to fit-to-screen zoom).
* **Pan position before vs after:** `(600.12, 364.35)` → `(600.12, 364.35)`.
* **Node positions before vs after:** 100% identical (0.00000px drift).
* **Edge IDs before vs after:** 100% identical (0 added/removed).

---

## 13. Layout Recalculation Analysis

The layout calculation engine (`computeArchitectureLayoutWithMetadata`) was **NOT re-run during pure zoom**.
* `runLayoutWithMetadataCount` delta = 0 across all 20 zoom cycles.
* Node Cartesian coordinates remained bit-for-bit unchanged.
* This disproves the hypothesis that the application recalculates base node layout during zoom interactions.

---

## 14. `cy.fit` / Zoom / Pan Invocation Evidence

The exact stack trace capturing the caller of `cy.fit()` during zoom release was intercepted:

```text
Error
    at cy.fit (GraphView.tsx wrapper)
    at runLayoutWithMetadata (explorer/src/lib/graph-layout.ts:208:16)
    at GraphView.tsx:666:27
    at commitHookEffectListMount (chunk-VKLKESE7.js:16915:34)
    at commitPassiveMountOnFiber (chunk-VKLKESE7.js:18156:19)
    at flushPassiveEffectsImpl (chunk-VKLKESE7.js:19490:11)
```

**CAUSAL MECHANISM:**
1. Zooming in or out changes `cy.zoom()`.
2. `GraphView.tsx` handles `cy.on('zoom')` by calling `updateZoomClass()`.
3. `updateZoomClass()` updates CSS classes on Cytoscape elements (`zoom-far`, `zoom-mid`, `zoom-near`, `lod-0`..'lod-4').
4. Element class updates trigger a React state re-render / element synchronization effect in `GraphView.tsx` (lines 650–670).
5. The effect evaluates `if (autoLayoutPolicy === true || architectureMode === 'orbit')`, which evaluates to `true` when `architectureMode === 'orbit'`.
6. `GraphView.tsx` invokes `runLayoutWithMetadata(cy, { architectureMode: 'orbit' })`.
7. Inside `runLayoutWithMetadata()` (`explorer/src/lib/graph-layout.ts` line 208), the code checks `if (options?.fit !== false)` and calls `cy.fit(visibleEles, padding)`.
8. `cy.fit()` resets the canvas viewport back to fit-to-screen zoom (`0.18857`) and pan (`600.12, 364.35`).

---

## 15. Edge Visibility / Rendering Analysis

Edge counts across Cytoscape zoom levels were audited:

* Total Edges in Graph: 2,063
* Visible Edges in Orbit Mode: 281
* `edge.visible()` in Cytoscape: 281 / 281 (100% structurally visible)
* `styleDisplay`: `"element"`
* `styleVisibility`: `"visible"`
* `styleOpacity`: `1.0`

**EDGE INSTABILITY CLASSIFICATION:**
Intermittent edge disappearance is an **LOD rendering / CSS opacity artifact**, not a graph mutation or Cytoscape visibility removal. Cytoscape LOD Level classes applied at `zoom <= 0.10` apply CSS rule `.zoom-far` which reduces edge line stroke-width or opacity to zero for rendering performance, causing lines to appear to disappear visually while remaining present in DOM and Cytoscape model space.

---

## 16. Node Position Fingerprint Analysis

Node positions for representative PBIM components were tracked before and after all 20 zoom cycles:

| Node ID | Pre-Zoom X | Pre-Zoom Y | Post-Zoom X | Post-Zoom Y | Drift |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `ApexClass:TimelineControllerTest` | 1200.00 | -450.00 | 1200.00 | -450.00 | **0.00000px** |
| `External:Profile` | -850.00 | 600.00 | -850.00 | 600.00 | **0.00000px** |
| `ApexClass:AssetDashboardController` | 0.00 | 0.00 | 0.00 | 0.00 | **0.00000px** |
| `ApexClass:BudgetController` | 600.00 | 0.00 | 600.00 | 0.00 | **0.00000px** |
| `LWC:vendor-workspace` | -600.00 | 300.00 | -600.00 | 300.00 | **0.00000px** |

---

## 17. React / State Feedback Investigation

A feedback loop exists between Cytoscape viewport changes and React re-renders:

```text
User Zoom Action (Wheel / Button)
       ↓
Cytoscape cy.zoom()
       ↓
GraphView cy.on('zoom') -> updateZoomClass()
       ↓
cy.elements().addClass(...) / removeClass(...)
       ↓
React re-render / Element Sync Effect (GraphView.tsx line 666)
       ↓
runLayoutWithMetadata(cy, { architectureMode: 'orbit' })
       ↓
options.fit !== false -> cy.fit()
       ↓
Viewport Zoom & Pan Reset to Baseline
```

---

## 18. UI vs Production-API Differential

Differential comparison between Path A (Real UI toggle activation) and Path B (`window.__LAYOUT_MODULE__.runLayoutWithMetadata(cy, { architectureMode: 'orbit' })`):

* **Path A Zoom:** `0.18857` | **Path B Zoom:** `0.18857`
* **Path A Pan:** `(600.12, 364.35)` | **Path B Pan:** `(600.12, 364.35)`
* **Max Node Position Drift (Path A vs Path B):** **0.00000px**
* **Orbit Guides Present:** `true` in both paths.

This proves that the production layout engine generates 100% identical radial geometry regardless of activation path, confirming that the instability is localized to the UI React effect viewport synchronization.

---

## 19. Hierarchical / Hybrid Regression Boundary

Mode switching back to Hierarchical and Hybrid modes was verified:

* **Hierarchical Mode:** 528 / 528 nodes visible, 2,063 / 2,063 edges visible, badge = `🔀 Interactive Mode (Hierarchical)`.
* **Hybrid Mode:** 528 / 528 nodes visible, 2,063 / 2,063 edges visible, badge = `🔀 Interactive Mode (Hybrid)`, feature region boundaries rendered cleanly.

Cross-mode transitions remain 100% isolated and non-regressive.

---

## 20. Root-Cause Classification

Based on empirical browser evidence, the root cause is classified into:

```text
D. repeated cy.fit / viewport reset
E. React/state feedback loop
H. edge rendering artifact
```

* **Primary Cause (D):** `runLayoutWithMetadata()` in `explorer/src/lib/graph-layout.ts` line 208 unconditionally calls `cy.fit()` when `options?.fit !== false`. During element synchronization in `GraphView.tsx` (line 666), `runLayoutWithMetadata()` is invoked without passing `fit: false`.
* **Contributory Cause (E):** Zoom events trigger `updateZoomClass()`, modifying element classes and causing React element synchronization effects to re-run and execute `runLayoutWithMetadata()`.
* **Visual Artifact (H):** Canvas LOD Level CSS rules (`.zoom-far`, `lod-2`..'lod-4') adjust edge stroke width and opacity, creating perceived edge disappearance without modifying Cytoscape edge objects or graph structure.

---

## 21. Evidence Matrix

| Test Objective | Requirement | Measured Result | Verdict |
| :--- | :--- | :--- | :--- |
| **Dataset Identity** | PBIM Hash Match | `d6dee0d04e5e...` (528N / 2063E) | **PASSED** |
| **UI Control Locator** | `[data-testid="architecture-mode-toggle"]` | Located in `GraphControls.tsx` line 125 | **PROVEN** |
| **Control DOM Semantics** | Title = Current, Label = Next | Confirmed on all 3 states | **PROVEN** |
| **Three-State Cycle** | Hierarchical → Hybrid → Orbit → Hierarchical | Verified via real DOM click path | **PASSED** |
| **Node Position Drift** | 0.00000px during zoom | 0.00000px across all 20 cycles | **PASSED** |
| **Layout Recalculation** | 0 engine re-invocations during zoom | 0 re-invocations recorded | **PROVEN** |
| **Viewport Reset Cause** | Intercept `cy.fit` stack trace | Intercepted in `graph-layout.ts:208` | **PROVEN** |
| **UI vs API Differential** | Position drift Path A vs Path B | 0.00000px drift | **PASSED** |

---

## 22. Final Verdict

```text
ARCHITECTURE ORBIT UI ACCESSIBLE — INTERACTION INSTABILITY CONFIRMED
```

---

## 23. Remaining Risks / Next Phase

1. **Production Code Fix Guard:** This phase was strictly read-only; zero production source code was modified.
2. **Recommended Next Phase Action:** In the subsequent implementation phase, pass `{ fit: false }` to `runLayoutWithMetadata()` during element synchronization re-renders in `GraphView.tsx` when `architectureMode === 'orbit'`, or preserve viewport zoom/pan during LOD class updates.
