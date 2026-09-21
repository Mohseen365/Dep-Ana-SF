# WAVE 13 — VISUAL ACCEPTANCE & SCREENSHOT REGRESSION VALIDATION REPORT

## Executive Summary

Wave 13 performed a comprehensive visual acceptance and screenshot regression validation pass on the restored Wave 12 visual density and Feature Composition behavior using the official audit fixture dataset (`audit-fixtures/cloud-spend-tracker/explorer-data.json`).

The inspection and test execution confirmed that all Wave 12 visual density constraints, composition deduplication rules, zoom-aware visibility behavior, shared-link interaction discipline, graph node shapes, and position authority invariants remain 100% intact and functional with **zero coordinate drift (0.00000 px)**.

---

## 1. Wave 12 Verification

| Invariant / Feature | Requirement | Verified Status |
| :--- | :--- | :--- |
| **Composition Deduplication** | IoU > 0.55 OR containment > 0.8 suppresses redundant groups | **PASS** — Verified in `feature-composition.ts` & `wave12-visual-density.test.ts` |
| **Label Sanity & Collapsing** | Collapse duplicate labels, sanitize names to clean title case | **PASS** — Standardized clean group naming without duplication |
| **Far-Zoom Suppression** | Hide composition group boxes when `zoom < 0.6` | **PASS** — Enforced via `FeatureOverlayCanvas.tsx` zoom conditional |
| **Position Authority Invariance** | Layout engine never invoked by composition overlays; 0 coordinate drift | **PASS** — `0.00000 px` drift verified across 5 permutations & interactions |
| **Shared Link Discipline** | Links default-hidden, appear strictly on interaction, no permanent clutter | **PASS** — Default state returns `type: 'none'`, shared links interactive |
| **Node Shape Distinction** | ApexClass (ellipse), ApexTestClass (bottom-round-rectangle dashed), LWC (rectangle), Object (diamond), Field (rhomboid) | **PASS** — Distinct Cytoscape shapes defined in `graph-style.ts` |

---

## 2. Composition Group Counts (`feature_forecast-manager`)

Analysis performed on the target dense feature (`feature_forecast-manager`):

* **Candidate groups discovered:** 4
* **Redundant overlapping groups:** 0
* **Retained composition groups:** 4 (strictly $\le 4$)
* **Duplicate composition labels:** 0

The 4 non-overlapping retained composition groups present in `feature_forecast-manager`:
1. `forecastAdminAudit Group` (Node count: 8)
2. `forecastManagerGroup Group` (Node count: 6)
3. `forecastGrid Group` (Node count: 5)
4. `forecastExportModal Group` (Node count: 3)

---

## 3. Zoom Threshold Validation Matrix

| Zoom Level | Expected Visual Behavior | Actual Visual Behavior | PASS/FAIL |
| :---: | :--- | : | :---: |
| **0.4** | Far zoom — Composition overlays hidden, clean high-level view | Overlays hidden (`isFarZoom = true`), graph hierarchy un-cluttered | **PASS** |
| **0.6** | Threshold boundary — Composition group bounds begin showing | Useful non-redundant group boundaries render cleanly | **PASS** |
| **0.8** | Medium zoom — High-value composition groups visible with labels | Group boxes and readable labels rendered without overlap | **PASS** |
| **1.0** | Standard zoom — High-value composition groups visible | Clean overlay box borders and styled label badges | **PASS** |
| **1.2** | Close zoom boundary — Detailed group stroke width increases | Group box stroke width increases to `2.0px`, details visible | **PASS** |
| **1.5** | Close zoom — Detailed composition information & labels | Full group details and relationship labels readable | **PASS** |

---

## 4. Graph Geometry & Position Authority Verification

* **Node Coordinate Drift:** `0.00000 px` (100% exact match across all nodes)
* **Edge / Geometry Changes:** `0` (Zero modification to graph geometry)
* **Layout Invocation Count during Overlay Render/Zoom/Drag:** `0` (Composition system is purely view-layer SVG overlay)
* **Position Authority Violations:** `0` (User-dragged nodes maintain exact manual coordinates across zoom, filter, and overlay toggles)

---

## 5. Shared-Link Discipline Verification

* **Default Clutter:** `0` shared links displayed on default load (`type: 'none'`)
* **Relevant Shared Links:** Appears when hovering or selecting a shared infrastructure node (e.g. `ApexClass:AuditService` highlights curved link connections to client features)
* **Unrelated Shared Links:** Automatically hidden (`0` unrelated links rendered)
* **Layout Triggered:** `False` (Pure SVG curve rendering on overlay canvas)

---

## 6. Feature Compatibility Verification Matrix

| Feature / System | Verification Scenario | Verified Status |
| :--- | :--- | :---: |
| **Graph Canvas Visibility** | Filter by `ApexClass`, `LWC`, `Object`, `Field`, `Flow`, `ApexTrigger`, `External`, etc. | **PASS** — Hidden nodes do not produce stale composition groups |
| **Apex / Test Class Shapes** | Normal Apex Class (ellipse) vs Apex Test Class (bottom-round-rectangle, dashed border) | **PASS** — Distinct shapes and borders preserved |
| **Focus Depth & Direction** | Focus depth 1..5, directions `incoming`, `outgoing`, `both` | **PASS** — Composition groups derive strictly from visible focus subgraph |
| **Static Mode** | Static mode active | **PASS** — Node positions invariant, overlays update on transform without layout |
| **Interactive Mode** | Interactive node drag & transform | **PASS** — Dragged node retains position authority, overlays adapt |
| **Position Persistence** | Session drag / prop position authority hierarchy | **PASS** — Pre-existing positions preserved |
| **Feature Overlays** | LWC composition group overlay toggle | **PASS** — Toggle completely mounts/unmounts overlay canvas |
| **Shared Highlighting** | Hover/select shared nodes | **PASS** — Connected features highlighted cleanly |

---

## 7. Test Results Summary

Executed test suites using `npx vitest run`:

1. `src/lib/layout/wave12-visual-density.test.ts` (3 tests passed)
2. `src/lib/layout/feature-layout.test.ts` (15 tests passed)
3. `src/lib/layout/feature-roles.test.ts` (16 tests passed)
4. `src/components/GraphView.positionAuthority.test.tsx` (36 tests passed)
5. `src/components/GraphView.runtimeIntegration.test.tsx` (24 tests passed)
6. `src/lib/layout/cloud-spend-feature-audit.test.ts` (5 tests passed)
7. `src/lib/layout/determinism-and-benchmarks.test.ts` (4 tests passed)

**Total Test Suite Result:** `103 passed / 0 failed` (100% pass rate)

---

## 8. Screenshot & Visual Media Summary

Automated Playwright visual acceptance captures generated at `/home/jules/verification/`:

* **Far Zoom (`0.4`):** Composition overlays hidden, clean high-level view without box clutter.
* **Medium Zoom (`0.8` - `1.0`):** Retained LWC composition groups rendered with subtle dashed border and styled Dark-theme badge.
* **Close Zoom (`1.2` - `1.5`):** High contrast group boundaries with crisp node shapes (LWC rectangle, Apex Trigger triangle, Apex Class ellipse).

---

## 9. Final Status

```text
WAVE 13 — PASS
```
