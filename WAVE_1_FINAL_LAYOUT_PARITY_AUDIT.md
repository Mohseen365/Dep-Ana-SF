# Wave 1 Final Layout Parity Audit Report

## 1. Executive Summary

This report assesses the parity between TypeScript reference layout engines in `explorer/src/lib/layout/` and the reusable LWC layout engine implementation in `scratch/salesforce-poc/force-app/main/default/lwc/daLayoutEngine/daLayoutEngine.js`.

* **Audit Status:** `PASS / VERIFIED`
* **Core UI Invariant:** **SELECTION ≠ NAVIGATION** is strictly preserved across all LWC and Explorer layout views. Selecting or clicking a graph node updates visual highlighting and detail state without triggering route changes or page navigation.

---

## 2. Layout Parity Matrix

| Layout Mode | Claimed Parity Status | Verified Audit Status | Reference TS Implementation | LWC Target Implementation (`daLayoutEngine.js`) | Algorithmic Equivalence & Omissions |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **Architecture / Hierarchical** | Full Parity | **Full Parity** | `explorer/src/lib/layout/architecture.ts` | `computeArchitectureLayout(nodes, edges, options)` | **100% Deterministic Parity.** Produces exact finite coordinates (`x, y`) for all nodes, enforcing architectural layer Y-ordering (presentation < domain < schema). Verified against CST benchmark fixture (240 nodes). |
| **Orbit Radial** | Partial Parity | **Partial Parity** | `explorer/src/lib/layout/orbit.ts` | `computeOrbitLayout(orbitData, options)` | **Deterministic Radial Positioning.** Computes finite `x,y`, `radius`, `angle` per ring/sector. Omits dynamic force-directed physics. Omission is accurately documented in `WAVE_1R2_LAYOUT_PARITY_STATUS.md`. |
| **Constellation Polar** | Partial Parity | **Partial Parity** | `explorer/src/lib/layout/constellation.ts` | `computeConstellationLayout(constellationData, options)` | **Deterministic Focal & Ring Geometry.** Computes focal origin (center), ring radial positions, and curved SVG edge paths. Omits dynamic multi-hop expansion. Omission is accurately documented. |
| **Sankey River Flow** | Partial Parity | **Partial Parity** | `explorer/src/lib/layout/sankey.ts` | `computeSankeyLayout(sankeyData, options)` | **Deterministic Stage & Flow Placement.** Positions stage columns and generates cubic Bezier flow paths. Omits iterative multi-pass crossing minimization. Omission is accurately documented. |

---

## 3. Preservation of SELECTION ≠ NAVIGATION Invariant

The core architectural invariant requires that clicking or selecting a graph node must **never** trigger a page reload, route transition, or external URL navigation. Node selection must only alter selection state and detail inspection panels.

### Code Tracing Verification
1. **LWC Layout Engine (`daLayoutEngine.js`):** Functions return pure positioning DTOs (`positions`, `nodePositions`, `edgePaths`, `flows`). No DOM navigation or window location mutations exist.
2. **LWC Graph Viewer Component:** Node selection handlers dispatch custom LWC events (`nodeselect`, `nodedetach`) with `{ detail: { nodeId } }`. Neither `NavigationMixin.Navigate` nor `window.location.href` is invoked upon node selection.
3. **Explorer Frontend (`ProjectContext.tsx` / `useViewState.ts`):** Active node selection updates URL search parameters (`?node=...`) using `window.history.replaceState` or React state without triggering React Router route changes or component remounting.
4. **Offline Test Verification (`run-poc-tests.cjs`):** Category 6 explicitly executes `Graph Viewer SELECTION != NAVIGATION Invariant Check`, confirming node click listeners fire selection callbacks while keeping navigation state isolated and untouched.
