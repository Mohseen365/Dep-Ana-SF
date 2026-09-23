# 06 — Validation, Performance, Release & Acceptance Gates

## Current verification posture

The audit set contains several generations of acceptance reports. The consolidated state below removes superseded conclusions and retains the latest executable evidence.

### Core validation
Latest broad integration audits verify:
- authoritative fixture integrity,
- deterministic graph/layout behavior,
- project isolation and persistence,
- filter/focus/static-mode invariants,
- refactoring simulation safety,
- UI/layout integration,
- build/typecheck/test health.

One broad Prompt 12 audit recorded 115 test files / 1,162 tests passing and a clean production build; Prompt 11 recorded 113 files / 1,126 tests plus CLI suites. These are dated audit snapshots, not a claim that the numbers are immutable forever.

### Layout acceptance
Canonical Cloud Spend Tracker:
- 240 nodes / 1,024 edges
- Candidate E repaired runtime: `Ctotal = 94,662`
- `Cpp = 8,704`, below the mandatory 9,335 primary-crossing gate
- zero layer violations
- zero primary/satellite overlap violations in accepted runs
- 0.00000 px deterministic coordinate drift
- latest real-runtime verification reaches Cytoscape rather than stopping in an isolated unit test

### Performance
The latest initial-layout forensic audit reports approximately:
- analysis: ~12 ms
- filtering: ~0.8 ms
- architecture layout: ~155 ms
- Cytoscape synchronization: ~18 ms
- total cold-load pipeline: ~185.8 ms
- full Cloud Spend layout footprint: ~7,900 × 1,580 px
- no redundant cold-mount double layout

Earlier synthetic benchmarks tested element creation/filtering at 100–5,000 node scales. The 5,000-node result should be understood as a headless/synthetic operational boundary rather than representative of every production org.

### Release interpretation
The documentation contains an important evolution:
- Earlier audits treated Hybrid layout as production-blocked because the measured total crossing count was `95,487` and/or feature coverage was incomplete.
- Later Candidate E integration and real-execution audits repaired runtime wiring and report `94,662`.
- The current UI model remains conservative: **Hierarchical is the safe/default legacy path (`enableFeatureLayout=false`), while Hybrid is an explicit architecture mode that can be selected and is persisted as `automatic-hybrid`.**
- Therefore “default false” is not equivalent to “Hybrid cannot run.” The latest runtime audit explicitly verifies Hybrid execution through the real renderer.

### Hard acceptance principles
- No silent coordinate drift.
- No accidental relayout on static view operations.
- No mutation of the authoritative graph during visualization.
- No cross-project state leakage.
- Deterministic replay and input-order invariance.
- Production changes only when the corresponding audit wave authorizes them.

## Key authoritative sources
- `HYBRID_LAYOUT_PHASE13_REAL_EXECUTION_FORENSIC_AUDIT.md` (2026-09-22 23:58:30)
- `HYBRID_LAYOUT_PHASE12_PRODUCTION_ACTIVATION_REPORT.md` (2026-09-22 23:07:38)
- `FINAL_INTEGRATION_FREEZE_AUDIT.md` (2026-09-20 10:31:46)
- `WAVE13_VISUAL_ACCEPTANCE_REPORT.md` (2026-09-21 22:28:18)
- `Architecture Health, Performance, and Workflow.md` (2026-09-14 19:01:38)
