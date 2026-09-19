# WAVE 5 — STATIC MODE TRIGGER & POSITION AUTHORITY MATRIX

**Author:** Jules (Software Engineer Agent)
**Date:** September 19, 2026
**Status:** Verified Post-Wave 4 Baseline Audit

---

## OVERVIEW

This document presents the forensic audit matrix governing node movement and relayout triggers in **Static Mode** and **Interactive Mode** across the Architecture Explorer frontend.

Static Mode strictly enforces the **Position Authority Hierarchy** and prevents unexpected canvas rearrangement during user navigation, filtering, investigation, or viewport interactions.

---

## 1. STATIC MODE TRIGGER MATRIX

| Action / Trigger | Should Relayout? | Actually Relayouts? | Existing Nodes Move? | Policy Decision | Governed By / Primary File | Status |
| :--- | :---: | :---: | :---: | :--- | :--- | :---: |
| **Initial load (no saved positions)** | **Yes** | **Yes** | **Yes** (Initial layout computation) | `shouldAutoLayout('static', 'initial')` returns `true` when `hasAuthoritativePositions` is `false`. | `position-policy.ts` / `GraphView.tsx` | **STABLE** |
| **Initial load (with saved positions)** | **No** | **No** | **No** | `shouldAutoLayout('static', 'initial')` returns `false` when `hasAuthoritativePositions` is `true`. Restores Level 2 persisted positions. | `position-policy.ts` / `GraphView.tsx` | **STABLE** |
| **New node insertion** | **Selective** | **No** (Full relayout) | **No** | `shouldAutoLayout('static', 'new-nodes')` returns `'place-new-only'`. New node placed via Level 5 neighbor average / hash fallback. Existing nodes remain stationary. | `position-policy.ts` (`calculateDeterministicNewNodePosition`) | **STABLE** |
| **Filter change (Type / Risk / Search)** | **No** | **No** | **No** | `shouldAutoLayout('static', 'filter-change')` returns `false`. Hidden nodes removed from DOM; visible nodes retain exact coordinates. | `position-policy.ts` / `GraphView.tsx` | **STABLE** |
| **Focus change (Focus Node)** | **No** | **No** | **No** | `shouldAutoLayout('static', 'focus-change')` returns `false`. Focused subgraph rendered using existing coordinates in `sessionPositionsRef`. | `position-policy.ts` / `focus-graph.ts` | **STABLE** |
| **Focus Depth change (1..5)** | **No** | **No** | **No** | `shouldAutoLayout('static', 'focus-change')` returns `false`. Depth expansion renders newly exposed nodes using Level 2/3/5 positions without moving existing nodes. | `position-policy.ts` / `GraphView.tsx` | **STABLE** |
| **Focus Direction change (in/out/both)** | **No** | **No** | **No** | `shouldAutoLayout('static', 'focus-change')` returns `false`. Existing nodes maintain exact X/Y coordinates. | `position-policy.ts` / `focus-graph.ts` | **STABLE** |
| **Node / Edge Selection** | **No** | **No** | **No** | Selection updates selection state without camera zoom/pan/center or coordinate mutations. Viewport position preserved strictly unchanged. | `GraphView.tsx` / `App.tsx` | **STABLE** |
| **Investigation Mode / Drilling** | **No** | **No** | **No** | `shouldAutoLayout('static', 'investigation')` returns `false`. Drilling path updates drawer and highlight styling without moving canvas nodes. | `position-policy.ts` / `InvestigationDrawer.tsx` | **STABLE** |
| **Reset Layout (Explicit Button)** | **Yes** | **Yes** | **Yes** | `shouldAutoLayout('static', 'reset-layout')` returns `true`. Clears `sessionPositionsRef` and executes full 11-stage `computeArchitectureLayout`. | `position-policy.ts` / `GraphControls.tsx` | **STABLE** |
| **User Drag Session** | **No** | **No** (Automatic relayout) | **No** (Only dragged node moves) | On Cytoscape `dragfree` event, dragged coordinate is saved to `sessionPositionsRef` (Level 1) and persisted to `localStorage` (Level 2). | `GraphView.tsx` (`onDragFree`) / `projectState.ts` | **STABLE** |
| **Mode Switch (Static ↔ Interactive)** | **No** | **No** | **No** | `shouldAutoLayout(mode, 'mode-switch')` returns `false`. Coordinates are captured and restored seamlessly without visual jump. | `position-policy.ts` / `GraphControls.tsx` | **STABLE** |

---

## 2. POSITION AUTHORITY hierarchy LIFECYCLE

Coordinates for any node are resolved through a non-bypasable 5-level priority chain inside `resolveAuthoritativePosition`:

```text
       ┌─────────────────────────────────────────────────────────┐
       │ Level 1: In-Session User Drag (sessionPositionsRef)      │  (Highest Priority)
       └───────────────────────────┬─────────────────────────────┘
                                   │ (fallback if missing)
                                   ▼
       ┌─────────────────────────────────────────────────────────┐
       │ Level 2: Persisted Project State (localStorage)         │
       └───────────────────────────┬─────────────────────────────┘
                                   │ (fallback if missing)
                                   ▼
       ┌─────────────────────────────────────────────────────────┐
       │ Level 3: Existing Cytoscape Canvas Position (cyNode)    │
       └───────────────────────────┬─────────────────────────────┘
                                   │ (fallback if missing)
                                   ▼
       ┌─────────────────────────────────────────────────────────┐
       │ Level 4: Intelligent Architecture Layout Engine         │
       └───────────────────────────┬─────────────────────────────┘
                                   │ (fallback if missing)
                                   ▼
       ┌─────────────────────────────────────────────────────────┐
       │ Level 5: Deterministic Neighbor Average / Hash Fallback │  (Lowest Priority)
       └─────────────────────────────────────────────────────────┘
```

---

## 3. POSITION WRITERS AUDIT

| Writer / Function | File | Trigger / Event | Priority Level Written | Can Override User Position? | Safety / Invariant |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `onDragFree` listener | `GraphView.tsx` | Cytoscape `dragfree` event | **Level 1** (Session) & **Level 2** (Persisted) | **N/A** (User explicitly created position) | Captures exact rendered node position and updates `sessionPositionsRef` and `saveProjectState`. |
| `saveProjectState` | `projectState.ts` | State persistence trigger | **Level 2** (Persisted) | **No** | Writes current `nodePositions` map into `localStorage.explorer.projectState.<projectId>`. |
| `cy.batch()` element update | `GraphView.tsx` | `useEffect([nodes, edges])` | Applies resolved Level 1–5 position | **No** | Consumes `resolveAuthoritativePosition`. Respects Level 1 session drag before all lower levels. |
| `computeArchitectureLayout` | `architecture-layout.ts` | Initial load or explicit Reset Layout | **Level 4** (Intelligent Layout) | **No** | Only writes new coordinates when `shouldAutoLayout` returns `true` (e.g. Reset Layout or initial load without saved state). |
| `calculateDeterministicNewNodePosition` | `position-policy.ts` | Insertion of unpositioned node into existing graph | **Level 5** (Deterministic Fallback) | **No** | Calculates centroid of known neighbor positions plus deterministic hash offset; never alters existing nodes. |

---

## 4. INVARIANT VERIFICATION SUMMARY

1. **Undocumented Position Writers:** 0 undocumented position writers found.
2. **Authority Bypasses:** All element positioning passes through `resolveAuthoritativePosition` in `GraphView.tsx`.
3. **Static Mode Stability:** 100% verified across filters, focus, depth, direction, selection, investigation, and mode toggles across 36 tests in `GraphView.positionAuthority.test.tsx` and `position-policy.test.ts`.
