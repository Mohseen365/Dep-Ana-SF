# 02 — Layout Engine & Spatial Intelligence

## Current authoritative layout model

The latest layout evidence describes a deterministic **13-stage executable pipeline (Stage 0–12)**. Older summaries that count 14 stages by separately listing “position authority restoration” have been normalized: position authority is the final stage of the Stage 0–12 pipeline, not an additional Stage 13.

```text
0  Indexing / validation
1  Architecture + feature analysis
2  Layer classification
3  Domain discovery
4  Feature discovery
5  Global feature/domain region geometry
6  Layer ordering + feature crossing reduction
7  Primary local node layout
8  Hub / bridge spatial refinement
9  Bounded satellite placement
10 Disconnected-component packing
11 Collision / spacing resolution
12 Position-authority resolution / coordinate output
```

### Deterministic invariants
- Architecture layer ordering is preserved: Presentation → Application → Domain → Schema.
- Primary and satellite overlaps are constrained to zero in accepted benchmark runs.
- Layer violations are zero in accepted benchmark runs.
- Repeated execution and shuffled input order produce **0.00000 px** coordinate drift.
- Primary coordinates are protected from satellite placement; satellites do not displace primary anchors.
- Layout is deterministic by stable sorting/ID/hash rather than force-directed randomness.
- Viewport pan/zoom and visual overlays must not trigger layout recomputation.

### Position authority
Current hierarchy:
1. **User-authored** coordinates
2. **Persisted** project coordinates
3. **Current Cytoscape** coordinates
4. **Intelligent layout** output
5. **Deterministic fallback/new-node placement**

Automatic layout provenance distinguishes `automatic-hierarchical` from `automatic-hybrid`. Stale automatic coordinates from the wrong architecture mode may be recomputed; explicit user-authored positions remain authoritative.

### Hybrid / feature layout
The latest implementation supports an opt-in Hybrid mode:
- `architectureMode = hierarchical` maps to `enableFeatureLayout = false`.
- `architectureMode = hybrid` maps to `enableFeatureLayout = true`.
- The hybrid path executes feature-region geometry, ordering, local placement, bridge refinement, satellite placement, packing, collision resolution and position-authority restoration.
- Switching modes persists architecture mode and layout provenance.
- Existing automatic coordinates from another mode are recognized as stale; user-authored coordinates are preserved.

### Canonical benchmark
Cloud Spend Tracker:
- 240 nodes
- 1,024 edges
- SHA-256 `feeb68f363d91fa0a234cb20b5975d6d6d69695fc9cdead4363806a7ca828295`

Latest Candidate E runtime figures repeatedly verified in the later 2026-09-22 audits:
- `Cpp = 8,704`
- `Cps = 41,590`
- `Css = 41,544`
- `Cpb = 2,594`
- `Cbb = 230`
- `Ctotal = 94,662`
- primary/secondary overlap and layer-violation gates: 0
- coordinate drift: 0.00000 px

### Feature/satellite geometry
The accepted strategy keeps primary anchors stable and places satellites around them using bounded deterministic candidate slots. Feature regions are spatial communities rather than permission to arbitrarily move architectural layers. Shared infrastructure is handled separately from feature-local membership.

### Important conflict resolved
Older layout audits reported `Ctotal = 95,487` and described the Hybrid path as production-blocked. Later same-day implementation and real-runtime audits record the repaired Candidate E path at `Ctotal = 94,662` and show Hybrid mode actually reaching the renderer. Therefore **95,487 is historical/superseded for the repaired Candidate E runtime**, while 94,662 is the current measured value.

## Key authoritative sources
- `HYBRID_LAYOUT_PHASE13_REAL_EXECUTION_FORENSIC_AUDIT.md` (2026-09-22 23:58:30)
- `HYBRID_LAYOUT_PHASE12_PRODUCTION_ACTIVATION_REPORT.md` (2026-09-22 23:07:38)
- `HYBRID_LAYOUT_PHASE11_RELEASE_HARDENING_AND_VISUAL_VALIDATION_REPORT.md` (2026-09-22 22:10:28)
- `HYBRID_LAYOUT_PHASE10_SATELLITE_STRATEGY_CONSOLIDATION_REPORT.md` (2026-09-22 21:24:12)
- `WAVE13_VISUAL_ACCEPTANCE_REPORT.md` (2026-09-21 22:28:18)
- `HYBRID_LAYOUT_DEEP_ARCHITECTURAL_AUDIT.md` (2026-09-22 19:31:40)
