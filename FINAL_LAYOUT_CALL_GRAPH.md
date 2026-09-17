# Final Layout Call Graph & Forensic Audit Report

## Overview

This forensic audit analyzes all position-changing, layout, viewport animation, and element lifecycle call paths within the Salesforce Architecture Dependency Explorer (`explorer/src`).

The audit evaluates every path against the **5-Level Position Authority Hierarchy** and the **Position Policy Decision Matrix** (`shouldAutoLayout`), verifying node coordinate immutability and behavior under **Static Mode** versus **Interactive Mode**.

---

## 5-Level Position Authority Hierarchy

When resolving node positions, the system evaluates authority in strict priority order (Level 1 highest, Level 5 lowest):

1. **Level 1: In-Session User Drag (`sessionPositionsRef`)**
   Highest authority. Explicit drag coordinates created when a user moves a node during the current session.
2. **Level 2: Persisted Project Position (`nodePositionsRef` / `localStorage`)**
   Persisted coordinates loaded from project state (`explorer.projectState.<projectId>`).
3. **Level 3: Canvas Position Before Lifecycle Event (`cyPositionsBefore`)**
   Current coordinates captured immediately prior to element DOM re-building or synchronization.
4. **Level 4: Intelligent Architecture Layout (`computeArchitectureLayout`)**
   Deterministic layered layout algorithm computed when no authoritative positions exist for the graph.
5. **Level 5: Deterministic Fallback Placement (`calculateDeterministicNewNodePosition`)**
   Calculated placement for genuinely new nodes based on connected neighbor centroid + hash offset or grid fallback, without altering existing node coordinates.

---

## Position-Changing & Viewport Call Path Audit Matrix

| ID | Trigger Event | Caller | Function | Static Mode Behavior | Interactive Mode Behavior |
|:---|:---|:---|:---|:---|:---|
| **P-01** | GraphView Mount (No Saved Positions) | `GraphView` mount `useEffect` | `shouldAutoLayout`, `getLayoutOptions`, `cytoscape()` | Runs initial `fcose` / architecture layout algorithm; persists resulting positions. | Runs initial `fcose` / architecture layout algorithm; persists resulting positions. |
| **P-02** | GraphView Mount (Saved Positions Exist) | `GraphView` mount `useEffect` | `resolveAuthoritativePosition`, `cyNode.position()` | Skips auto-layout (`preset`); applies exact saved coordinates from Level 1–2 authority. | Skips auto-layout (`preset`); applies exact saved coordinates from Level 1–2 authority. |
| **P-03** | Element Sync / Props Update (`nodes`, `edges` change) | `GraphView` element sync `useEffect` | `cy.elements().remove()`, `cy.add()`, `resolveAuthoritativePosition`, `node.position()` | Preserves exact (x, y) coordinates for all existing nodes using Level 1–3 authority. `runLayout` is **never** invoked. | Preserves exact (x, y) coordinates for all existing nodes using Level 1–3 authority. `runLayout` is **never** invoked if saved positions exist. |
| **P-04** | Genuinely New Node Inserted | `GraphView` element sync `useEffect` | `calculateDeterministicNewNodePosition`, `node.position()` | Calculates placement for *only* the new node via neighbor centroid + hash offset. Existing nodes remain 100% unmoved. | Calculates placement for *only* the new node via neighbor centroid + hash offset. Existing nodes remain 100% unmoved. |
| **P-05** | User Node Drag (`dragfree`) | Cytoscape `dragfree` event listener | `sessionPositionsRef.set()`, `captureAndPersistPositions()` | Updates Level 1 session positions and Level 2 persistence for the dragged node only. | Updates Level 1 session positions and Level 2 persistence for the dragged node only. |
| **P-06** | Mode Switch (Interactive ↔ Static) | Mode switch `useEffect` / `handleToggleLayoutModeInternal` | `captureAndPersistPositions()` | Captures all current canvas node coordinates and saves to Level 1 & 2. **No visual rearrangement occurs.** | Switches mode state. **No visual rearrangement occurs.** |
| **P-07** | Toolbar "Reset Layout" Click | `GraphControls` button → `GraphViewRef.resetLayout` | `runLayout()`, `computeArchitectureLayout`, `captureAndPersistPositions()` | **Explicit user action**: Re-calculates architecture layout and saves new coordinates. | Re-calculates architecture layout and saves new coordinates. |
| **P-08** | Node Selection / Click | `GraphView` selection `useEffect` | `selectNode()`, `cy.animate({ center: ... })` | **Viewport movement only**: Centers target node in viewport. Node coordinates remain strictly unchanged. | **Viewport movement only**: Centers target node in viewport. Node coordinates remain strictly unchanged. |
| **P-09** | Center Selected Button Click | `GraphControls` button → `GraphViewRef.centerSelected` | `cy.animate({ center: ... })` | **Viewport movement only**: Centers selected node. Node coordinates remain strictly unchanged. | **Viewport movement only**: Centers selected node. Node coordinates remain strictly unchanged. |
| **P-10** | Zoom In / Zoom Out / Fit Buttons & Hotkeys | `GraphControls` / `handleKeyDown` / `GraphViewRef` | `cy.zoom()`, `fitToScreen()` (`cy.fit()`) | **Viewport movement only**: Adjusts zoom and pan. Node coordinates remain strictly unchanged. | **Viewport movement only**: Adjusts zoom and pan. Node coordinates remain strictly unchanged. |
| **P-11** | Drilling / Focus Node Centering | `GraphView` focusedNodeId `useEffect` | `focusOnNode()` → `cy.animate({ center: ... })` | **Viewport movement only**: Centers focused node and dims non-neighbors. Node coordinates remain strictly unchanged. | **Viewport movement only**: Centers focused node and dims non-neighbors. Node coordinates remain strictly unchanged. |
| **P-12** | Cycle Selection Highlighting | `GraphView` selectedCycleNodeIds `useEffect` | `highlightCycle()` → `cy.animate({ fit: ... })` | **Viewport movement only**: Fits viewport to cycle group and dims unrelated elements. Node coordinates remain strictly unchanged. | **Viewport movement only**: Fits viewport to cycle group and dims unrelated elements. Node coordinates remain strictly unchanged. |
| **P-13** | Impact Mode Toggle | `GraphView` impactResult `useEffect` | `cy.batch()`, `node.addClass()`, `node.removeClass()` | Applies visual CSS class styles only (`impact-origin`, `impact-affected`, `impact-muted`). Node coordinates remain strictly unchanged. | Applies visual CSS class styles only (`impact-origin`, `impact-affected`, `impact-muted`). Node coordinates remain strictly unchanged. |

---

## Detailed Call Path Breakdown

### Path P-01 & P-02: Initial Graph View Mount
- **TRIGGER**: React component mount (`useEffect([], ...)`).
- **CALLER**: `GraphView` (`explorer/src/components/GraphView.tsx`).
- **FUNCTION**: `shouldAutoLayout`, `getLayoutOptions`, `cytoscape()`, `resolveAuthoritativePosition`.
- **STATIC BEHAVIOR**:
  1. Checks `shouldAutoLayout('static', 'initial', { hasAuthoritativePositions })`.
  2. If positions exist in `localStorage` or session, returns `false`. Cytoscape initializes with `{ name: 'preset' }`.
  3. Iterates over all nodes and applies exact coordinates via `resolveAuthoritativePosition` and `cyNode.position()`.
  4. Zooms and centers viewport without altering node coordinates.
- **INTERACTIVE BEHAVIOR**:
  1. If no saved positions exist, `shouldAutoLayout` returns `true`.
  2. Runs `fcose` / architecture layout.
  3. On `layoutstop`, captures and persists resulting positions via `captureAndPersistPositions()`.

---

### Path P-03: Graph Element Synchronization (Filters, Depth, Project Change, Focus Change)
- **TRIGGER**: `nodes` or `edges` props update (e.g. user changes focus depth 1/2/3/ALL, applies search filters, changes project, or opens investigation drawer).
- **CALLER**: `GraphView` element synchronization `useEffect([nodes, edges, ...])`.
- **FUNCTION**: `cy.elements().remove()`, `cy.add()`, `resolveAuthoritativePosition()`, `node.position()`.
- **STATIC BEHAVIOR**:
  1. Captures existing canvas positions into `cyPositionsBefore` before DOM element replacement.
  2. Evaluates `shouldAutoLayout('static', 'graph-update', ...)`. Policy evaluates to `false`.
  3. Wipes elements (`cy.elements().remove()`) and mounts new graph elements (`cy.add(newElements)`).
  4. Restores exact (x, y) coordinates for all nodes using the 5-level position authority hierarchy: `sessionPositions` → `persistedPositions` → `cyNodePosition`.
  5. Node coordinates (x, y) remain strictly immutable.
- **INTERACTIVE BEHAVIOR**:
  1. Same position authority lookup. Node coordinates are restored and preserved. `runLayout` is skipped when saved positions exist.

---

### Path P-04: Addition of Genuinely New Nodes
- **TRIGGER**: Incremental graph update containing nodes that have no Level 1, 2, or 3 authoritative positions.
- **CALLER**: `GraphView` element synchronization `useEffect`.
- **FUNCTION**: `calculateDeterministicNewNodePosition()`, `node.position()`.
- **STATIC BEHAVIOR**:
  1. Detects nodes missing from `sessionPositions`, `persistedPositions`, and `cyPositionsBefore`.
  2. Calculates candidate position using `calculateDeterministicNewNodePosition()`:
     - Computes average centroid of connected neighbors with known positions + deterministic offset.
     - Fallback: deterministic grid placement around origin (0, 0).
  3. Applies coordinates to *only* the new node and stores in `sessionPositionsRef`.
  4. **Existing nodes remain 100% unmoved**.
- **INTERACTIVE BEHAVIOR**:
  1. Identical behavior (`'place-new-only'` policy).

---

### Path P-05: User Node Dragging
- **TRIGGER**: User grabs a node and releases mouse button (`dragfree` event).
- **CALLER**: Cytoscape event listener `cy.on('dragfree', 'node', ...)`.
- **FUNCTION**: `node.position()`, `sessionPositionsRef.current.set()`, `captureAndPersistPositions()`, `onNodeDragEndRef.current()`.
- **STATIC BEHAVIOR**:
  1. Reads new position from `evt.target.position()`.
  2. Updates Level 1 `sessionPositionsRef` map and Level 2 `localStorage` project state.
  3. Moves *only* the user-dragged node. All other nodes remain untouched.
- **INTERACTIVE BEHAVIOR**:
  1. Identical behavior.

---

### Path P-06: Mode Switch (Interactive ↔ Static)
- **TRIGGER**: User clicks layout mode toggle button in toolbar (`onToggleLayoutMode`).
- **CALLER**: `GraphView` `handleToggleLayoutModeInternal` and mode change `useEffect([layoutMode])`.
- **FUNCTION**: `captureAndPersistPositions()`.
- **STATIC BEHAVIOR**:
  1. Captures all node coordinates currently on canvas.
  2. Writes coordinates into Level 1 (`sessionPositionsRef`) and Level 2 (`localStorage`).
  3. **No visual movement or layout recalculation occurs**.
- **INTERACTIVE BEHAVIOR**:
  1. Updates layout mode state. **No visual movement or layout recalculation occurs**.

---

### Path P-07: Explicit Toolbar "Reset Layout" Command
- **TRIGGER**: User clicks "Reset Layout / Rearrange" button (🔄) in toolbar or calls `ref.current.resetLayout()`.
- **CALLER**: `GraphControls` button → `GraphViewRef.resetLayout`.
- **FUNCTION**: `runLayout()`, `computeArchitectureLayout()`, `captureAndPersistPositions()`.
- **STATIC BEHAVIOR**:
  1. **Explicit user command override** (`reset-layout` trigger).
  2. Re-runs `computeArchitectureLayout` or `fcose` algorithm to recalculate entire graph layout.
  3. Updates canvas coordinates and persists new positions to Level 1 & 2 authority.
- **INTERACTIVE BEHAVIOR**:
  1. Identical behavior.

---

### Paths P-08 to P-12: Viewport Pan / Zoom / Center / Fit / Drilling / Cycle Focus
- **TRIGGER**: Node selection, center button, zoom/fit controls, hotkeys, drilling focus change, cycle selection.
- **CALLER**: `GraphView`, `GraphControls`, `focusOnNode()`, `highlightCycle()`, `fitToScreen()`.
- **FUNCTION**: `cy.animate({ center: ... })`, `cy.animate({ fit: ... })`, `cy.zoom()`, `cy.fit()`.
- **STATIC BEHAVIOR**:
  1. Adjusts viewport camera parameters (`pan.x`, `pan.y`, `zoom`).
  2. **Node internal model coordinates (x, y) remain strictly immutable (0 delta)**.
- **INTERACTIVE BEHAVIOR**:
  1. Identical behavior.

---

## Static Mode Vulnerability & Unexpected Movement Audit Findings

Every layout call path, event listener, and lifecycle hook in the codebase was audited for unexpected node movements in **Static Mode**:

1. **Automatic Relayout On Filter / Depth / Focus Changes**: **NONE (GUARDS VERIFIED)**.
   - `shouldAutoLayout('static', 'filter-change')` returns `false`.
   - `shouldAutoLayout('static', 'focus-change')` returns `false`.
   - `shouldAutoLayout('static', 'graph-update')` returns `false`.
   - `shouldAutoLayout('static', 'investigation')` returns `false`.
   - Element updates restore node positions from Level 1–3 authority.
2. **Automatic Relayout On Mode Switch**: **NONE (GUARDS VERIFIED)**.
   - Transitioning between Interactive and Static mode executes `captureAndPersistPositions()`, locking coordinates without triggering layout.
3. **Viewport Manipulation vs. Node Position**: **VERIFIED SEPARATION**.
   - Functions like `fitToScreen`, `focusOnNode`, `centerSelected`, and `highlightCycle` alter viewport pan/zoom only; node model coordinates `(x, y)` remain 100% constant.

### Summary of Conditions Where Node Coordinates Change in Static Mode:
1. **User explicit drag** (`dragfree` event) — intentional user movement of a specific node.
2. **User explicit reset layout** (Toolbar 🔄 button click) — intentional user command to re-arrange nodes.
3. **Genuinely new node insertion** (`new-nodes` trigger) — deterministic placement calculation applied exclusively to the newly added node.

---

## Test Verification Summary

The static layout position authority policy and immutability guarantees are verified by the following test suites:
- `explorer/src/components/GraphView.positionAuthority.test.tsx` (11 comprehensive position authority tests)
- `explorer/src/components/GraphView.test.tsx`
- `explorer/src/lib/position-policy.test.ts`
- `explorer/src/test/RegressionAcceptance.test.tsx`
