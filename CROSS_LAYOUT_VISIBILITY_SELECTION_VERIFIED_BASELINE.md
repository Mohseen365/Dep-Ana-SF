# CROSS-LAYOUT VISIBILITY & SELECTION VERIFIED BASELINE CONTRACT

## A. Baseline Identity

- **Previous Baseline:** `e6cb181`
- **Current HEAD Commit:** `4e782d088378423ca1d57ad9024d32880a91e664`
- **Working Tree Scope:** Cross-layout visibility pipeline (`visibleActiveData`), selection propagation (`selectedNodeId`), visual dimming (`opacity: 0.25–0.35` / `.dimmed` visual class), and 15-test integration suite (`CrossLayoutVisibilityAndSelection.test.tsx`).

---

## B. Feature Acceptance

The **Cross-Layout Graph Visibility Control & Synchronized Selection** feature has passed independent adversarial verification and is formally **accepted** as a protected component of the project's behavioral baseline.

---

## C. Protected Invariants

### 1. Existing Graph Visibility Control
- The "Graph Canvas Visibility" panel in `SearchFilterPanel.tsx` remains the canonical visibility control UI.
- Supports the 10 canonical Salesforce node types: `ApexClass`, `ApexTrigger`, `LWC`, `Visualforce`, `Flow`, `Object`, `CustomObject`, `Field`, `CustomField`, `External`.
- LocalStorage persistence via `saveProjectState` / `loadProjectState` remains intact.

### 2. Centralized Visibility Pipeline (`visibleActiveData`)
- Invariant: `visibleNodeTypes` ➔ `filterGraphByNodeTypes()` ➔ `visibleActiveData` ➔ all 12 layout view lenses.
- If a node type is hidden in Graph Canvas Visibility, components of that node type must not appear in ANY of the 12 supported layout lenses.
- No analytical view may bypass this pipeline using raw `activeData`.

### 3. Canonical Node Selection (`selectedNodeId`)
- Selection identity must resolve strictly to `ExplorerNode.id` (e.g. `ApexClass:AccountController`).
- Selection must not depend on display names, labels, array indices, or layout-local identifiers.
- Selecting a logical node in ANY supported layout must identify that same canonical node across all other views.

### 4. Cross-Layout Visual Dimming
- When `selectedNodeId !== null`:
  - Selected node ➔ highlighted / full visual emphasis.
  - Non-selected visible nodes ➔ dimmed (`opacity: 0.25–0.35` or `.dimmed` visual class).
  - Hidden nodes ➔ absent according to visibility semantics.
- Dimming is a visual state and must NEVER remove nodes from layout geometry or DOM structures merely because they are unselected.

### 5. Filter + Selection Interaction & Clearing
- Selected node ➔ its node type becomes hidden ➔ selection is cleared (`selection.clear()`).
- Prevents stale highlights, stale dimming, stale selected node references, or stale inspector cards.
- Global Escape key listener in `App.tsx` clears node selection across all views.

### 6. Edge / Relationship Semantics
- Graph edges: Retained iff BOTH source and target node types are visible (`visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)`).
- If source or target node type is hidden, the relationship is excluded from all 12 view lenses (including Sankey flow streams, matrix cells, heatmap cells, constellation edges, subway tracks, and tree relationships).

### 7. Layout Stability & Non-Recomputation
- Selection-only interactions, selection clearing, and visual dimming must update rendering styles/classes WITHOUT recomputing expensive layout geometry (`computeArchitectureLayout`, `computeTreemapLayout`, `computeSankeyLayout`, Cytoscape layout runs).

### 8. Position Authority
- Preserves the protected 5-level position authority hierarchy:
  1. Explicit user drag (`sessionPositions`)
  2. Persisted project position
  3. Existing Cytoscape position
  4. Intelligent initial layout (`computeArchitectureLayout`)
  5. Deterministic fallback
- Visibility and selection changes must never reset or alter user-authored node positions.

### 9. Architecture Modes
- Full compatibility with `hierarchical` and `hybrid` architecture modes. Visibility and selection operate above mode-specific layout engines.

---

## D. Twelve-Lens Regression Contract

The following 12 layout lenses are frozen as part of the protected behavioral baseline:

1. **Main Graph** (`GraphView.tsx`)
2. **Feature Matrix** (`FeatureMatrixPanel.tsx`)
3. **Coupling Heatmap** (`CouplingHeatmapPanel.tsx`)
4. **Dependency River / Sankey** (`DependencyRiverPanel.tsx`)
5. **Feature Tree** (`FeatureTreePanel.tsx`)
6. **Architecture Treemap** (`ArchitectureTreemapPanel.tsx`)
7. **Subway Map** (`SubwayPanel.tsx`)
8. **Dependency Constellation** (`DependencyConstellationPanel.tsx`)
9. **Component Profile** (`FeatureProfilePanel.tsx`)
10. **Architecture Radar** (`RadarPanel.tsx`)
11. **DNA Barcode** (`ArchitectureDNABarcode.tsx`)
12. **Four-Direction** (`FourDirectionPanel.tsx`)

Every lens preserves:
- Visibility filtering via `visibleActiveData`
- Canonical node identity (`ExplorerNode.id`)
- Selection synchronization (`selectedNodeId`)
- Visual dimming for unselected nodes (`opacity: 0.25–0.35` / `.dimmed` class)
- Filter + selection clearing safety

---

## E. Regression Test Contract & Execution Baseline

- **CURRENTLY EXECUTED & PASSED:**
  - `CrossLayoutVisibilityAndSelection.test.tsx` (15/15 PASS)
  - `matrix-adapter.test.ts` (10/10 PASS)
  - `tree-adapter.test.ts` (9/9 PASS)
  - `radar-adapter.test.ts` (9/9 PASS)
  - `profile-adapter.test.ts` (8/8 PASS)
  - `RegressionAcceptance.test.tsx` (9/9 PASS)
  - **Total Execution Suite:** 60/60 PASS
- **TypeScript:** `tsc` clean (0 errors)
- **Production Build:** Vite build clean (0 errors)

---

## F. Browser Verification Boundary

- **Recorded Verification:** Playwright script `/home/jules/verification/verify_cross_layout.py` generated video `/home/jules/verification/videos/b963304a6faa9b01a5a47c8442372cff.webm` and screenshot `/home/jules/verification/screenshots/verification.png`.
- **CI Boundary:** Local Playwright script verification is a developer/agent visual validation tool, NOT an automated CI release gate. Automated CI quality gates rely on Vitest unit/integration test suites and `npm run build`.

---

## G. Future Change Rules

1. **Rule 1 (Visibility Changes):** Any change to `SearchFilterPanel`, `search-filter.ts`, or visibility state MUST re-run `CrossLayoutVisibilityAndSelection.test.tsx`.
2. **Rule 2 (Selection Changes):** Any change to `SelectionContext`, `useGraphSelection`, or selection propagation MUST re-run `CrossLayoutVisibilityAndSelection.test.tsx`.
3. **Rule 3 (Analytical Views):** Any future change or addition to an analytical view MUST consume `visibleActiveData` and `selectedNodeId`.
4. **Rule 4 (Layout Engines):** Any change to layout engines or positioning MUST preserve 5-level Position Authority.
5. **Rule 5 (Node Identity):** Any change affecting node identity MUST preserve `ExplorerNode.id` across all 12 adapters.
6. **Rule 6 (No Local State Competition):** No future refactor may introduce layout-local visibility or competing canonical selection state without an explicit architectural decision.

---

## H. Remaining Limitations

- Real project datasets (`explorer/public/projects/`) are intentionally gitignored in fresh clones and require script generation (`scripts/export-explorer.cjs`).
- Playwright script execution requires local dev server on port 5173.

---

## I. Final Status

```text
BASELINE FROZEN — CROSS-LAYOUT VISIBILITY & SELECTION VERIFIED
```
