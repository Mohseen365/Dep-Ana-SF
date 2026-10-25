# Historical Decisions & Rationale

This document preserves key architectural decisions, design evolutions, and rejected options from past audit phases.

## 1. Single State Authority vs. Fragmented Contexts (Phase 2F-A)
- **Problem:** Prior to Phase 2F-A, workspace selection state and view state were fragmented across local component state (`App.tsx`, `Sidebar.tsx`, `GraphView.tsx`), causing selection loss when switching lenses and infinite re-render loops during URL synchronization.
- **Decision:** Replaced local selection state with canonical `InvestigationContext` and single-owner `WorkspaceRouterContext`.
- **Rejected Alternative:** Passing state via top-level `App.tsx` prop drilling or separate context per lens. Rejected because it violated selection neutrality and caused cross-lens state desynchronization.

## 2. Web Worker Layout Offloading vs. Main-Thread Layout (Phase 3D)
- **Problem:** Heavy layout calculations (e.g. Stage 9 satellite placement) blocked the UI main thread for up to 357 seconds on 3500-node synthetic graphs, dropping frame rates.
- **Decision:** Offloaded layout computation to a background Web Worker (`layout.worker.ts`) using an IPC serialization protocol with monotonic generation counters for stale result rejection.
- **Key Guarantee:** Must guarantee `0.00000px` coordinate drift (`COORDINATE_EXACT`) compared to synchronous execution.

## 3. Orbit Polar Water-Filling Sector Allocation vs. Unbounded Radial Spreading (Orbit C1–C11)
- **Problem:** Initial radial layouts spread nodes along fixed polar arcs without considering node rectangular bounding boxes ($160\text{px} \times 100\text{px}$ effective box), resulting in thousands of pairwise collisions.
- **Decision:** Implemented water-filling polar sector angular allocation conserving $2\pi$ radians, combined with dynamic sector radial track staggering and minimum $200\text{px}$ track spacing.
- **Result:** Reduced initial PBIM collision count from 133,154 to exactly 0.

## 4. Stage 8 Multi-Lane Y Corridor Slot Search vs. Unbounded Horizontal Search (SB-1C)
- **Problem:** Stage 8 bridge candidate placement used an unbounded 1D horizontal search that placed bridge nodes thousands of pixels away from primary clusters.
- **Decision:** Replaced 1D search with deterministic 2D slot search across 3 Y-lanes (`[baseY, baseY - 100, baseY + 100]`) with exact AABB collision checks and dynamic finite symmetric expansion.
- **Rejected Alternative:** Force-directed spring relaxation. Rejected because it violated 100% layout determinism and introduced random coordinate drift.

## 5. Constellation Static Mode Element Projection Fix (Component Constellation Audit)
- **Problem:** Toggling Static Mode in Constellation view caused 486 hidden background nodes to suddenly render on screen because `GraphView.tsx` skipped element projection when `autoLayoutPolicy` was false.
- **Decision:** Explicitly included `architectureMode === 'constellation'` in the element projection synchronization condition.
