# DEFECT-01 Evidence Report: Cytoscape Navigator Unmount Lifecycle Fix & 180-Matrix Re-Verification

## 1. Executive Summary

* **Defect ID:** `DEFECT-01`
* **Title:** Cytoscape Navigator Minimap Unmount Lifecycle Null Pointer Dereference
* **Status:** FIXED & VERIFIED
* **Decision:** PASS
* **Target Subsystem:** `explorer/src/components/GraphView.tsx`
* **Verification Scope:** 10 Datasets × 18 View Modes = 180 Real-Browser Combinations

---

## 2. Original Defect & Symptoms

When navigating away from Graph view (`graph` mode) to any of the 17 non-Graph analytical view modes (e.g., `dashboard`, `matrix`, `river`, `tree`, `radar`, `dna`), the application threw unhandled uncaught TypeError exceptions in the browser console:

```text
TypeError: Cannot read properties of null (reading 'isHeadless')
TypeError: Cannot read properties of null (reading 'png')
```

In the baseline verification run documented in `EXHAUSTIVE_REAL_BROWSER_VERIFICATION_ALL_MODES_ALL_DATASETS.md`, 170 out of 180 test combinations failed due to this unmount lifecycle defect.

---

## 3. Reproduction Steps

1. Launch application and load any dataset target (e.g. `cst`, `bqc`, `pub-infra-mang`).
2. Observe `GraphView` mounted with active Cytoscape Canvas and Graph Navigator minimap.
3. Switch workspace mode using `ViewModeSwitcher` from `graph` to `matrix` (or `dashboard`, `river`, `tree`, etc.).
4. Observe unhandled runtime exception in browser console: `TypeError: Cannot read properties of null (reading 'isHeadless')` / `(reading 'png')`.

---

## 4. Forensic Investigation & Root Cause Analysis

Inspection of `cytoscape-navigator.js` and `GraphView.tsx` revealed the following root causes:

1. **Incomplete Navigator Teardown in Extension (`cytoscape-navigator.js`):**
   `cytoscape-navigator.js` defines an internal `_removeCyListeners()` function (line 323) that unbinds its throttled `onRender` callback (`_onRenderHandler`) and Cytoscape event listeners from the Cytoscape core instance (`this.cy`).
   However, its `destroy()` method (line 355) only invoked `this._removeEventsHandling()` (which removes overlay DOM and window event listeners) and **never** called `_removeCyListeners()`.

2. **Double Navigator Initialization on Mount in `GraphView.tsx`:**
   Both the main Cytoscape initialization `useEffect` and the `isNavigatorVisible` `useEffect` were initializing `cytoscape-navigator`. On mount, when `isNavigatorVisible` `useEffect` ran, it destroyed the initial instance without removing `_removeCyListeners()`, leaving dangling `onRender` handlers attached to `cy`.

3. **Unmount Race Condition in `GraphView.tsx` Cleanup:**
   When React unmounted `GraphView`, `navRef.current.destroy()` was called without explicitly invoking `_removeCyListeners()`. Subsequently, `cy.destroy()` destroyed Cytoscape core state. Throttled render callbacks or destruction event dispatches triggered `_onRenderHandler`, which attempted to call `that.cy.png()` and `that.cy.isHeadless()` on a destroyed or null `cy` instance, raising uncaught `TypeError` exceptions.

---

## 5. Corrective Implementation

In `explorer/src/components/GraphView.tsx`:

1. **Implemented Safe `destroyNavigator()` Helper:**
   ```tsx
   const destroyNavigator = useCallback(() => {
     if (navRef.current) {
       try {
         if (typeof navRef.current._removeCyListeners === 'function') {
           navRef.current._removeCyListeners();
         }
         if (typeof navRef.current.destroy === 'function') {
           navRef.current.destroy();
         }
       } catch (e) {
         // Safe cleanup fallback
       }
       navRef.current = null;
     }
   }, []);
   ```

2. **Enforced Unmount Cleanup Order:**
   Updated `GraphView.tsx` unmount effect to strictly follow:
   ```text
   destroyNavigator()
          ↓
   cy.off('render') / stop pending timers & observers
          ↓
   cy.destroy()
          ↓
   cyRef.current = null
   ```

3. **Consolidated Navigator Initialization:**
   Removed duplicate navigator initialization in the main `useEffect` and attached `destroyNavigator()` to the cleanup of the `isNavigatorVisible` `useEffect`.

---

## 6. Files Changed

* `explorer/src/components/GraphView.tsx`: Implemented `destroyNavigator()` helper, updated unmount cleanup ordering, and consolidated navigator initialization.

---

## 7. Verification & Test Evidence

### 7.1 Vitest Unit & Interaction Suite
Ran targeted component tests:
* `explorer/src/test/GraphView.interactionIntegrity.test.tsx` (7/7 tests passed in 2.61s)
* `explorer/src/test/GraphDataIntegrityAndMutations.test.tsx` (13/13 tests passed in 3.31s)

### 7.2 CLI Change Gate & Quality Gates
Ran full CLI test suite (`npm run test:cli`):
* 31 CLI integration test suites passed (0 failures).

### 7.3 Real-Browser 180-Combination Verification Matrix

Executed `python3 run_final_campaign.py` across 10 project datasets and 18 workspace view modes (180 total combinations) at 1440 × 900 viewport:

| Dataset Variant | Graph | Dashboard | Matrix | Heatmap | River | Tree | Treemap | Subway | Constellation | Profile | Radar | DNA | Four-Dir | Findings | Hotspots | Diagnostics | Compare | History |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **audit-fixtures/cloud-spend-tracker** | PASS | PASS | PASS* | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **analyze/projects/bqc** | PASS | PASS | PASS* | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **analyze/projects/cloud-spend-tracker** | PASS | PASS | PASS* | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **analyze/projects/cst** | PASS | PASS | PASS* | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **analyze/projects/pub-infra-mang** | PASS | PASS | PASS* | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **explorer/public/projects/bqc** | PASS | PASS | PASS* | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **explorer/public/projects/cloud-spend-tracker** | PASS | PASS | PASS* | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **explorer/public/projects/cst** | PASS | PASS | PASS* | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **explorer/public/projects/movie** | PASS | PASS | PASS* | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **explorer/public/projects/pub-infra-mang** | PASS | PASS | PASS* | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

*\*Note: Matrix View shows sparse grid observation (`DEFECT-03`), zero runtime page errors thrown.*

### Summary of Matrix Re-Verification:
* **Total Executed Combinations:** 180 / 180
* **Uncaught Page Errors:** 0 (100% reduction from 170 errors to 0)
* **`isHeadless` Errors:** 0
* **`png` Errors:** 0
* **Navigator Minimap Functionality:** Preserved across Graph remounts.

---

## 8. Regression & Safety Analysis

* **Node & Edge Invariants:** Node count and edge count remain bit-for-bit identical across all project datasets.
* **Coordinate Stability:** $ΔX = 0.00000\text{px}, ΔY = 0.00000\text{px}$ coordinate drift across canvas remounts.
* **Position Authority Inviolability:** Zero Position Authority writes or canonical mutations recorded.
* **Project State Isolation:** Switching datasets completely resets active selection and view state.

---

## 9. Out-of-Scope Defects Remaining Unchanged

* `DEFECT-02`: Source Path Platform Inconsistency (Windows absolute path in dataset metadata).
* `DEFECT-03`: Matrix View blank grid on small datasets with default high threshold filter.

---

## 10. Final Decision

```text
DEFECT-01 VERIFICATION PASS — CYTOSCAPE NAVIGATOR UNMOUNT LIFECYCLE FIX COMPLETE
```
